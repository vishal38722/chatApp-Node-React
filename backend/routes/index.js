const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: '🚀 Chat App API is running!',
    status: 'success',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users', 
      chats: '/api/chats'
    }
  });
});

module.exports = router;