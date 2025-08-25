const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  chatType: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate chat ID for private chats
chatSchema.methods.generateChatId = function() {
  if (this.chatType === 'private' && this.participants.length === 2) {
    const sortedIds = this.participants.map(id => id.toString()).sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }
  return this._id.toString();
};

module.exports = mongoose.model('Chat', chatSchema);