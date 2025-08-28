const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

const handleSocketConnection = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room
    socket.on('join', (userId) => {
      socket.join(userId);
      socket.userId = userId;
      console.log(`User ${userId} joined their room`);
    });

    // Join chat room
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { senderId, receiverId, content, chatId } = data;

        // Create message with 'sent' status
        const message = new Message({
          sender: senderId,
          receiver: receiverId,
          content: content.trim(),
          chatId: chatId,
          status: 'sent'
        });

        await message.save();
        await message.populate('sender', 'username firstName lastName avatar');
        await message.populate('receiver', 'username firstName lastName avatar');

        // Update or create chat
        let chat = await Chat.findOne({
          participants: { $all: [senderId, receiverId] }
        });

        if (!chat) {
          chat = new Chat({
            participants: [senderId, receiverId],
            lastMessage: message._id,
            lastActivity: new Date()
          });
          await chat.save();
        } else {
          chat.lastMessage = message._id;
          chat.lastActivity = new Date();
          await chat.save();
        }

        // Emit to chat room
        io.to(chatId).emit('receive_message', message);

        // Check if receiver is online and mark as delivered - this is being done in /send route
        const receiverSockets = await io.in(receiverId).fetchSockets();
        if (receiverSockets.length > 0) {
          message.status = 'delivered';
          await message.save();
          
          // Notify sender about delivery
          io.to(senderId).emit('message_status_update', {
            messageId: message._id,
            status: 'delivered'
          });
        }

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
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
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = { handleSocketConnection };