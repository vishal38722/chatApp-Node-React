import React, {useEffect, useState} from 'react';
import Sidebar from './Sidebar';
import ChatBox from './ChatBox';
import EmptyState from './EmptyState';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';

const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Track online users
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      try {
        // Get current user info
        const decoded = jwtDecode(token);
        setCurrentUser({
          id: decoded.userId,
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName
        });

        const fetchData = async () => {
          const { data } = await axios.get("http://localhost:8000/api/user/exclude_user/", {
            headers: {
              'Authorization': `Token ${token}`,
            },
          });
          setUsers(data);
          console.log("data from exclude_user api : ", data);
        };
        fetchData();
      } catch (error) {
        console.log(error);
        toast.error(`Error fetching users`);
      } finally {
        setLoading(false);
      }
    }
  }, [navigate]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const newSocket = io('http://localhost:8000', {
        auth: {
          token: token
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
        toast.success('Connected to chat server');
        
        // Get current online users when connected
        newSocket.emit('get_online_users');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        toast.error('Failed to connect to chat server');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        toast.error('Disconnected from chat server');
      });
      

      // Handle online status events
      newSocket.on('user_online', (data) => {
        console.log("data in user_online : ", data);
        console.log(`User ${data.userId} came online`);
        setOnlineUsers(prev => new Set([...prev, data.userId]));
        
        // Show toast for users in your chat list
        const onlineUser = users.find(user => user.id === data.userId);
        if (onlineUser) {
          toast.success(`${onlineUser.firstName} ${onlineUser.lastName} is now online`, {
            duration: 2000
          });
        }
      });

      newSocket.on('user_offline', (data) => {
        console.log(`User ${data.userId} went offline`);
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
        
        // Show toast for users in your chat list
        const offlineUser = users.find(user => user.id === data.userId);
        if (offlineUser) {
          toast(`${offlineUser.firstName} ${offlineUser.lastName} went offline`, {
            duration: 2000,
            icon: '🔴'
          });
        }
      });
      // added this code for realTime new message population when receiver has already opened sender's chat - start
      newSocket.on('receive_message', (data) => {
        console.log("New message received via socket:", data);
        // seems here we should emit message_delivered event
        window.dispatchEvent(new CustomEvent('new_message', { detail: data }));
      });
      // added this code for realTime new message population when receiver has already opened sender's chat - end

      newSocket.on('online_users', (data) => {
        console.log('Online users:', data.users);
        setOnlineUsers(new Set(data.users));
      });

      // Message-related events for status updates
      newSocket.on('message_status_update', (data) => {
        console.log("data in message_status_update : ", data);
        // Broadcast to ChatBox component via custom events
        window.dispatchEvent(new CustomEvent('message_status_update', { detail: data }));
      });

      newSocket.on('messages_marked_read', (data) => {
        console.log("data in messages_marked_read : ", data);
        // Broadcast to ChatBox component via custom events
        window.dispatchEvent(new CustomEvent('messages_marked_read', { detail: data }));
      });

      // Handle new message notifications
      newSocket.on('new_message_notification', (data) => {
        console.log("data in new_message_notification : ", data);
        // Only show notification if not currently chatting with this user
        if (!selectedUser || selectedUser.id !== data.chatId.split('_').find(id => id !== newSocket.userId)) {
          toast(`New message from ${data.from}: ${data.message}`, {
            duration: 4000,
            icon: '💬'
          });
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [users]);

  // Handle user selection and join chat
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (selectedUser && socket) {
      const decoded = jwtDecode(token);
      const userId = decoded.userId;
      if (!userId || !selectedUser?.id) {
        console.log('Invalid user IDs:', userId, selectedUser?.id);
        return;
      }
      // Create consistent chat ID
      const chatId = `${[userId, selectedUser.id].sort().join('_')}`;
      console.log("chatId in Home: ", chatId);
      
      socket.emit('join_chat', chatId);
      
      console.log(`Joining chat: ${chatId}`);
    }
  }, [selectedUser, socket]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  // Send message function to be passed to ChatBox
  const sendMessage = async (messageData) => {
    console.log("messageData in sendMessage method : ", messageData);
    console.log("currentUser in sendMessage method : ", currentUser);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:8000/api/chat/send',
        messageData,
        {
          headers: { Authorization: `Token ${token}` }
        }
      );

      console.log("response in sendMessage method : ", response);

      // Check if receiver is online and emit delivered status
      if (onlineUsers.has(messageData.receiverId)) {
        socket.emit('message_delivered', {
          messageId: response.data.data._id,
          senderId: messageData.senderId || currentUser.id
        });
      }

      return response.data.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Mark messages as read function
  const markMessagesAsRead = (chatId, senderId) => {
    if (socket && currentUser) {
      socket.emit('messages_read', {
        chatId: chatId,
        userId: currentUser.id,
        senderId: senderId
      });
    }
  };

  return (
    <div className="container-fluid overflow-hidden" style={{height: "100vh"}}>
      <div className="row">
        <div className="col-md-6 col-lg-3 rounded-3 bg-secondary-subtle">
          <Sidebar 
            users={users} 
            onUserClick={handleUserClick} 
            selectedUser={selectedUser} 
            loading={loading}
            onlineUsers={onlineUsers} // Pass online users to Sidebar
          />
        </div>
        <div className="col-md-6 col-lg-9 min-vh-100 border-5 bg-light">
          <div className="text-center text-black">
            {selectedUser ? (
              <ChatBox 
                selectedUser={selectedUser} 
                onUserClick={handleUserClick} 
                currentUser={currentUser}
                sendMessage={sendMessage}
                markMessagesAsRead={markMessagesAsRead}
                isUserOnline={onlineUsers.has(selectedUser.id)}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;