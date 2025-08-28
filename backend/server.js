const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/user');
const homePageRoutes = require('./routes/index');
const { authenticateSocket } = require('./middleware/socketAuth');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available to routes (so /api/chat/send can emit after DB save)
app.set('io', io);

// Track online users (Set of userIds)
const onlineUsers = new Set();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/', homePageRoutes);

// Socket.io connection handling
io.use(authenticateSocket);

io.on('connection', async (socket) => {
  console.log('User connected:', socket.userId);
  
  // Join user to their personal room
  socket.join(socket.userId);
  
  // Track online status
  onlineUsers.add(socket.userId);
  socket.broadcast.emit('user_online', { userId: socket.userId });

  // when user comes online the below code checks for messages where receiver is the current user and messages are in sent state and 
  // mark those messages as delivered
  try {
    const undeliveredMessages = await Message.find({
      receiver: socket.userId,
      status: 'sent'
    });

    if (undeliveredMessages.length > 0) {
      console.log(`Marking ${undeliveredMessages.length} messages as delivered for user ${socket.userId}`);

      // Update status in DB
      await Message.updateMany(
        { receiver: socket.userId, status: 'sent' },
        { $set: { status: 'delivered' } }
      );

      // Notify all senders
      undeliveredMessages.forEach((msg) => {
        io.to(msg.sender.toString()).emit('message_status_update', {
          messageId: msg._id,
          status: 'delivered'
        });
      });
    }
  } catch (err) {
    console.error("Error updating undelivered messages:", err);
  }
  
  // Handle joining chat rooms
  socket.on('join_chat', (data) => {
    const chatId = data;
    socket.join(chatId);
    console.log(`User ${socket.userId} joined chat ${chatId}`);
  });
  
  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      console.log("inside send_message event socket listener");
      const { chatId, message, receiverId } = data;
      console.log("message : ", message);
      
      // Validation
      if (!chatId || !message?.trim() || !receiverId) {
        return socket.emit('message_error', { error: 'Missing required fields' });
      }
      
      // Verify receiver exists
      const User = require('./models/User');
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return socket.emit('message_error', { error: 'Receiver not found' });
      }
      
      // Verify user is part of this chat
      const participantIds = chatId.split('_');
      if (!participantIds.includes(socket.userId) || !participantIds.includes(receiverId)) {
        return socket.emit('message_error', { error: 'Access denied to this chat' });
      }
      
      // Save message to database
      // const Message = require('./models/Message');
      const newMessage = new Message({
        sender: socket.userId,
        receiver: receiverId,
        content: message.trim(),
        chatId: chatId,
        timestamp: new Date()
      });

      console.log("newMessage : ", newMessage);
      
      // await newMessage.save(); -- this is being saved in /send route
      await newMessage.populate('sender', 'firstName lastName email');
      
      // Emit to chat room -- this is being saved in /send route
      // io.to(chatId).emit('receive_message', {
      //   _id: newMessage._id,
      //   sender: newMessage.sender,
      //   content: newMessage.content,
      //   timestamp: newMessage.timestamp,
      //   chatId: chatId
      // });
      
      // // Emit notification to receiver if they're online -- this is being saved in /send route
      // io.to(receiverId).emit('new_message_notification', {
      //   from: `${newMessage.sender.firstName} ${newMessage.sender.lastName}`,
      //   message: newMessage.content,
      //   chatId: chatId
      // });
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('user_typing', {
      userId: socket.userId,
      isTyping: data.isTyping
    });
  });

  socket.on('leave_chat', (data) => {
    const { chatId } = data;
    socket.leave(chatId);
    console.log(`User ${socket.userId} left chat ${chatId}`);
  });
  
  // Handle getting online users
  socket.on('get_online_users', () => {
    socket.emit('online_users', { users: Array.from(onlineUsers) });
  });

  // Mark message as delivered manually (in case we need to force update)
  socket.on('message_delivered', async (data) => {
    try {
      const { messageId, senderId } = data;

      await Message.findByIdAndUpdate(messageId, { status: 'delivered' });

      // Notify sender
      io.to(senderId).emit('message_status_update', {
        messageId,
        status: 'delivered'
      });
    } catch (error) {
      console.error('Error marking message delivered:', error);
    }
  });

  // Handle message read status
  socket.on('messages_read', async (data) => {
    try {
      const { chatId, userId, senderId } = data;
      
      // Update messages to read status
      const result = await Message.updateMany(
        {
          chatId: chatId,
          receiver: userId,
          status: { $ne: 'read' }
        },
        {
          status: 'read',
          isRead: true,
          readAt: new Date()
        }
      );

      if (result.modifiedCount > 0) {
        // Notify sender about read status
        io.to(senderId).emit('messages_marked_read', {
          chatId: chatId,
          count: result.modifiedCount
        });
      }

    } catch (error) {
      console.error('Mark messages read error:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
    
    // Remove from online users
    onlineUsers.delete(socket.userId);
    socket.broadcast.emit('user_offline', { userId: socket.userId });
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});