import React, { useEffect, useState, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { HiPaperAirplane } from "react-icons/hi2";
import MessageBox from "./MessageBox";
import Header from "./Header";
import Loader from "./Loader";
import axios from "axios";
import toast from "react-hot-toast";

const ChatBox = ({ selectedUser,  onUserClick,  currentUser,  sendMessage,  markMessagesAsRead,  isUserOnline }) => {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const decoded = jwtDecode(token);
      const userId = decoded.userId;

      if (!userId || !selectedUser?.id) return;

      const chatId = [userId, selectedUser.id].sort().join("_");

      const { data } = await axios.get(
        `http://localhost:8000/api/chat/messages/${chatId}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      setMessages(data.messages || []);
      console.log("data in ChatBox : ", data);
      console.log("messages in ChatBox : ", messages);
      console.log("selectedUser in ChatBox : ", selectedUser);
      setLoading(false);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser]);

  // Listen for socket events via custom events
  useEffect(() => {
    // const handleNewMessage = (event) => {
    //   const message = event.detail;
    //   setMessages(prev => [...prev, message]);
    //   scrollToBottom();
    // };
    // updated handleNewMessage method for realTime new message population when receiver has already opened sender's chat - start
    const handleNewMessage = (event) => {
      const message = event.detail;
      console.log("Inside handleNewMessage (event) : ", event);
      const currentChatId = [currentUser.id, selectedUser.id].sort().join('_');
      // console.log("message inside ChatBox.js (handleNewMessage) : ", message);
      // console.log("message.receiver._id : ", message.receiver._id);
      // console.log("message.sender._id : ", message.sender._id);
      // console.log("currentUser.id : ", currentUser.id);
      // console.log("selectedUser.id : ", selectedUser.id);
    
      // Show only if current user is the receiver of the message
      // to remove this ew need to use socket.broadcast.to() instead of io.to() so that the message will be broadcasted to everyone except
      // the sender and we do not need to put this check here, but for now we are doing io.to() in /send route so to access socket, we need
      // to transfer socket related implementation inside io.on('connection', (socket) => {}) - which will require emitting send_message
      // socket event from frontend
      if (message.receiver._id === currentUser.id) {
        // seems here we should emit message_read event
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    };
    // updated handleNewMessage method for realTime new message population when receiver has already opened sender's chat - start
    

    const handleStatusUpdate = (event) => {
      const { messageId, status } = event.detail;
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, status } : msg
      ));
    };

    const handleMessagesRead = (event) => {
      const { chatId } = event.detail;
      const currentChatId = selectedUser && currentUser ? 
        [currentUser.id, selectedUser.id].sort().join('_') : null;
      
      if (chatId === currentChatId) {
        setMessages(prev => prev.map(msg => 
          msg.sender._id === currentUser.id && msg.status !== 'read'
            ? { ...msg, status: 'read' }
            : msg
        ));
      }
    };

    window.addEventListener('new_message', handleNewMessage);
    window.addEventListener('message_status_update', handleStatusUpdate);
    window.addEventListener('messages_marked_read', handleMessagesRead);

    return () => {
      window.removeEventListener('new_message', handleNewMessage);
      window.removeEventListener('message_status_update', handleStatusUpdate);
      window.removeEventListener('messages_marked_read', handleMessagesRead);
    };
  }, [selectedUser, currentUser]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (selectedUser && currentUser && messages.length > 0) {
      const unreadMessages = messages.filter(msg => 
        msg.receiver._id === currentUser.id && msg.status !== 'read'
      );

      if (unreadMessages.length > 0) {
        const chatId = [currentUser.id, selectedUser.id].sort().join('_');
        markMessagesAsRead(chatId, selectedUser.id);
      }
    }
  }, [selectedUser, currentUser, messages, markMessagesAsRead]);

  useEffect(() => {
    console.log("message in useEffect : ", messages);
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !selectedUser) return;

    try {
      const chatId = [currentUser.id, selectedUser.id].sort().join("_");
      
      const messageData = {
        receiverId: selectedUser.id,
        content: trimmed,
        chatId,
      };

      const savedMessage = await sendMessage(messageData);
      setMessages(prev => [...prev, savedMessage]);
      setNewMessage("");
      scrollToBottom();

    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ width: "inherit" }}>
      <Header 
        selectedUser={selectedUser} 
        onUserClick={onUserClick} 
        isUserOnline={isUserOnline}
      />
      <div
        style={{
          paddingBottom: "7rem",
          height: "calc(100vh - 7rem)",
          overflow: "auto",
        }}
      >
        {messages.map((message, index) => (
          <MessageBox
            key={message._id || index}
            data={message}
            selectedUser={selectedUser}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed-bottom d-flex align-items-center flex-row justify-content-end rounded-3">
        <div className="col-12 col-md-6 col-lg-9 offset-md-3 bg-light p-1">
          <form
            onSubmit={handleSendMessage}
            className="d-flex align-items-center flex-row justify-content-end gap-3"
          >
            <input
              type="text"
              className="form-control p-3"
              placeholder={
                isUserOnline 
                  ? "Type your message..." 
                  : `${selectedUser.firstName} is offline. Type your message...`
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button 
              className="btn btn-primary btn-lg pb-3 mb-3" 
              type="submit"
              title={isUserOnline ? "Send message" : "User is offline - message will be delivered when they come online"}
            >
              <HiPaperAirplane />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;