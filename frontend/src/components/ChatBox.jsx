import React, { useEffect, useState, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { HiPaperAirplane } from "react-icons/hi2";
import MessageBox from "./MessageBox";
import Header from "./Header";
import Loader from "./Loader";
import axios from "axios";
import toast from "react-hot-toast";

const ChatBox = ({ selectedUser, onUserClick, socket }) => {
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

  useEffect(() => {
    if (socket) {
      socket.on("receive_message", (message) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      socket.on("message_error", (error) => {
        toast.error(error.error);
      });

      return () => {
        socket.off("receive_message");
        socket.off("message_error");
      };
    }
  }, [socket]);

  useEffect(() => {
    console.log("message in useEffect : ", messages);
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
  e.preventDefault();
  const trimmed = newMessage.trim();
  if (!trimmed || !selectedUser) return;

  try {
    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    const userId = decoded.userId;

    const chatId = [userId, selectedUser.id].sort().join("_");
    console.log("chatId in handleSendMessage:", chatId);

    const payload = {
      receiverId: selectedUser.id,
      content: trimmed,
      chatId,
    };
    console.log("selectedUser.id in handleSendMessage:", selectedUser.id);
    console.log("trimmed in handleSendMessage:", trimmed);

    const { data } = await axios.post("http://localhost:8000/api/chat/send", payload, {
      headers: { Authorization: `Token ${token}` },
    });
    console.log("data in handleSendMessage:", data);

    const savedMessage = data.data;

    // Add to chat immediately with full timestamp
    setMessages((prev) => [...prev, savedMessage]);

    // Broadcast to other user via socket
    socket.emit("send_message", savedMessage);

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
      <Header selectedUser={selectedUser} onUserClick={onUserClick} />
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
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button className="btn btn-primary btn-lg pb-3 mb-3" type="submit">
              <HiPaperAirplane />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
