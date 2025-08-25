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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Track online users
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

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  // Join user to their personal room
  socket.join(socket.userId);
  
  // Track online status
  onlineUsers.add(socket.userId);
  socket.broadcast.emit('user_online', { userId: socket.userId });
  
  // Handle joining chat rooms
  socket.on('join_chat', (data) => {
    const { chatId, receiverId } = data;
    socket.join(chatId);
    console.log(`User ${socket.userId} joined chat ${chatId}`);
  });
  
  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { chatId, message, receiverId } = data;
      
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
      const Message = require('./models/Message');
      const newMessage = new Message({
        sender: socket.userId,
        receiver: receiverId,
        content: message.trim(),
        chatId: chatId,
        timestamp: new Date()
      });
      
      await newMessage.save();
      await newMessage.populate('sender', 'firstName lastName email');
      
      // Emit to chat room
      io.to(chatId).emit('receive_message', {
        _id: newMessage._id,
        sender: newMessage.sender,
        content: newMessage.content,
        timestamp: newMessage.timestamp,
        chatId: chatId
      });
      
      // Emit notification to receiver if they're online
      io.to(receiverId).emit('new_message_notification', {
        from: `${newMessage.sender.firstName} ${newMessage.sender.lastName}`,
        message: newMessage.content,
        chatId: chatId
      });
      
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