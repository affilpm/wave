import React, { useState, useEffect, useRef } from 'react';

const LivestreamChat = ({ socket, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle incoming chat messages
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data) => {
      if (data.type === 'chat') {
        setMessages(prev => [...prev, {
          username: data.username,
          message: data.message,
          timestamp: new Date()
        }]);
      }
    };

    socket.onMessage(handleChatMessage);

    return () => {
      // Cleanup listener if needed
    };
  }, [socket]);

  // Send message
  const sendMessage = () => {
    if (messageInput.trim() && socket && roomId) {
      socket.send({
        type: 'send_livestream_message',
        roomId: roomId,
        message: messageInput
      });

      // Clear input after sending
      setMessageInput('');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-[500px]">
      <h3 className="text-xl font-semibold mb-4">Livestream Chat</h3>
      
      {/* Chat Messages */}
      <div className="flex-grow overflow-y-auto mb-4">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className="mb-2 p-2 bg-gray-700 rounded"
          >
            <strong className="text-blue-400">{msg.username}: </strong>
            {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="flex">
        <input 
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-grow mr-2 px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded"
        />
        <button 
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default LivestreamChat;