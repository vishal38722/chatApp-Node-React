const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get or Create Chat between two users
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    if (receiverId === senderId.toString()) {
      return res.status(400).json({ error: 'Cannot create chat with yourself' });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      chatType: 'private',
      participants: { $all: [senderId, receiverId] }
    }).populate('participants', 'username firstName lastName avatar isOnline lastSeen');

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [senderId, receiverId],
        chatType: 'private'
      });
      await chat.save();
      await chat.populate('participants', 'username firstName lastName avatar isOnline lastSeen');
    }

    // Generate chat ID for socket rooms
    const chatId = `${[senderId.toString(), receiverId].sort().join('_')}`;

    res.json({
      chat: {
        _id: chat._id,
        chatId: chatId,
        participants: chat.participants,
        chatType: chat.chatType,
        lastActivity: chat.lastActivity
      }
    });

  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get User's Chats
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'username firstName lastName avatar isOnline lastSeen')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    // Format chats with additional info
    const formattedChats = await Promise.all(chats.map(async (chat) => {
      const otherParticipant = chat.participants.find(p => p._id.toString() !== userId.toString());
      
      // Get unread message count
      const unreadCount = await Message.countDocuments({
        receiver: userId,
        sender: otherParticipant._id,
        isRead: false
      });

      // Generate chat ID
      const chatId = chat.chatType === 'private' 
        ? `${[userId.toString(), otherParticipant._id.toString()].sort().join('_')}`
        : chat._id.toString();

      return {
        _id: chat._id,
        chatId: chatId,
        chatType: chat.chatType,
        participant: otherParticipant,
        lastMessage: chat.lastMessage,
        lastActivity: chat.lastActivity,
        unreadCount: unreadCount
      };
    }));

    res.json({ chats: formattedChats });

  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Messages for a Chat
router.get('/messages/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id.toString();
    console.log("chatId : ", chatId);
    console.log("userId : ", userId);
    
    // Parse chat participants from chatId (for private chats)
    const participantIds = chatId.includes('_') ? chatId.split('_') : [];
    console.log("participantIds : ", participantIds);
    console.log("participantIds.length : ", participantIds.length);
    console.log("!participantIds.includes(userId) : ", !participantIds.includes(userId));
    
    // Verify user is part of this chat
    if (participantIds.length === 2 && !participantIds.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this chat' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      chatId: chatId
    })
    .populate('sender', 'username firstName lastName avatar')
    .populate('receiver', 'username firstName lastName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      {
        chatId: chatId,
        receiver: userId,
        isRead: false, // might be we can remove it as it's by default set to false
        status: { $ne: 'read' }
      },
      {
        status: 'read',
        isRead: true,
        readAt: new Date()
      }
    );

    // Reverse to show oldest first
    const reversedMessages = messages.reverse();

    res.json({
      messages: reversedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Message (REST endpoint) — SAVE + EMIT SOCKET EVENTS
router.post('/send', authenticateToken, async (req, res) => {
  try {
    console.log("Inside /send route");
    const { receiverId, content, chatId } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !content || !chatId) {
      return res.status(400).json({ error: 'Receiver ID, content, and chat ID are required' });
    }
    console.log("receiverId : ", receiverId, " content : ", content, " chatId : ", chatId);

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    console.log("receiver : ", receiver);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Create message with initial status
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
      chatId: chatId,
      status: 'sent' // Initial status
    });
    console.log("message : ", message);

    await message.save();
    await message.populate('sender', 'username firstName lastName avatar');
    await message.populate('receiver', 'username firstName lastName avatar');

    // Try to find the chat first
    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] }
    });
    console.log("chat : ", chat);

    // If chat doesn't exist, create it
    if (!chat) {
      chat = new Chat({
        participants: [senderId, receiverId],
        lastMessage: message._id,
        lastActivity: new Date()
      });
      await chat.save();
    } else {
      // If chat exists, update it
      chat.lastMessage = message._id;
      chat.lastActivity = new Date();
      await chat.save();
    }

    // Emit the new message via socket
    const io = req.app.get('io');
    io.to(chatId).emit('receive_message', message);
    io.to(receiverId.toString()).emit('new_message_notification', {
      from: `${message.sender.firstName} ${message.sender.lastName}`,
      message: message.content,
      chatId: chatId
    });

    // Check if receiver is online and mark as delivered
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
    
    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark Messages as Read
router.put('/mark-read/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      {
        chatId: chatId,
        receiver: userId,
        isRead: false
      },
      {
        status: 'read',
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Message
router.delete('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Soft delete
    message.isDeleted = true;
    message.content = 'This message was deleted';
    await message.save();

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit Message
router.put('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can edit their message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Check if message is not too old (e.g., 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ error: 'Cannot edit messages older than 15 minutes' });
    }

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    await message.populate('sender', 'username firstName lastName avatar');
    await message.populate('receiver', 'username firstName lastName avatar');

    res.json({
      message: 'Message updated successfully',
      data: message
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Chat Statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Promise.all([
      // Total chats
      Chat.countDocuments({ participants: userId }),
      
      // Total messages sent
      Message.countDocuments({ sender: userId }),
      
      // Total messages received
      Message.countDocuments({ receiver: userId }),
      
      // Unread messages count
      Message.countDocuments({ receiver: userId, isRead: false })
    ]);

    res.json({
      totalChats: stats[0],
      messagesSent: stats[1],
      messagesReceived: stats[2],
      unreadMessages: stats[3]
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;