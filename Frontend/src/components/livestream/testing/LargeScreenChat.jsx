import React, { useRef, useEffect } from 'react';
import { Users, Send, MessageCircle, X } from 'lucide-react';

const LargeScreenChat = ({ messages, newMessage, setNewMessage, sendMessage, viewerCount, username, closeChat }) => {
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  // Common emojis
  const commonEmojis = ['👍', '❤️', '😂', '🔥', '👏', '😮'];

  return (
    <div className="flex flex-col h-full w-full max-w-xs border-l border-gray-800 bg-gray-900">
      <div className="border-b border-gray-600/70 bg-gray-800/80 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle size={16} className="mr-2" />
            <span className="text-sm font-semibold">Live Chat</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center text-gray-300">
              <Users size={14} className="mr-1" />
              <span className="text-xs">{viewerCount}</span>
            </div>
            <button 
              onClick={closeChat} 
              className="bg-transparent border-none p-1 rounded-full hover:bg-gray-700/50 transition duration-200"
            >
              <X size={18} className="text-gray-300" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 [scrollbar-width:thin] [scrollbar-color:rgba(75,85,99,0.5)_transparent]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
            <MessageCircle size={24} className="mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-xs">Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`p-2 px-3 rounded-2xl max-w-[85%] break-words text-gray-100 shadow-sm ${
                msg.isHost 
                  ? 'bg-blue-600/80 self-end' 
                  : msg.isSystem 
                    ? 'bg-gray-600/60 border-l-[3px] border-gray-400/80 rounded-[4px_16px_16px_4px] w-[90%] self-center italic' 
                    : 'bg-gray-700/80 self-start'
              }`}
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs font-semibold text-gray-200">
                  {msg.isHost ? `${username || 'Host'}` : msg.isSystem ? 'System' : (msg.username || 'User')}
                  {msg.isHost ? ' (Host)' : ''}
                </span>
                {msg.timestamp && (
                  <span className="text-[0.65rem] text-gray-300/80 ml-2">
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>
              <span className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex justify-around p-1.5 px-3 border-t border-gray-600/50 bg-gray-800/50">
        {commonEmojis.map(emoji => (
          <button 
            key={emoji} 
            onClick={() => handleEmojiSelect(emoji)}
            className="bg-transparent border-none text-base py-0.5 px-2 rounded-xl transition duration-200 hover:bg-gray-700/50 hover:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>
      
      <div className="flex p-2.5 border-t border-gray-600/70 bg-gray-800/80">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Say something..."
          className="flex-1 bg-gray-700/80 border border-gray-600/80 rounded-full py-2.5 px-3.5 text-sm text-white outline-none transition duration-200 focus:border-blue-500/70 placeholder:text-gray-400"
          onKeyDown={(e) => e.key === 'Enter' && newMessage.trim() && sendMessage()}
        />
        <button 
          onClick={() => newMessage.trim() && sendMessage()} 
          className={`bg-blue-600 text-white border-none rounded-full w-9 h-9 flex items-center justify-center ml-2 transition duration-200 hover:bg-blue-700 hover:scale-105 ${
            !newMessage.trim() ? 'bg-gray-600 opacity-60 cursor-not-allowed' : ''
          }`}
          disabled={!newMessage.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default LargeScreenChat;