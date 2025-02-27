import React, { useEffect, useState } from 'react';

const Livestream = () => {
  const [socket, setSocket] = useState(null);
  const [receivedMessage, setReceivedMessage] = useState('');

  useEffect(() => {
    const socketConnection = new WebSocket("ws://localhost:8001/ws/livestream/");
    socketConnection.onopen = () => {
      console.log("WebSocket connected");
      socketConnection.send(JSON.stringify({ message: "Hello Server!" })); // Send a test message
    };

    socketConnection.onmessage = (e) => {
      console.log("Received message from backend:", e.data);
      const message = JSON.parse(e.data);
      if (message.message) {
        setReceivedMessage(message.message);  // Set the received message to the state
      }
    };

    socketConnection.onerror = (e) => {
      console.log("WebSocket Error:", e);
    };

    setSocket(socketConnection);

    return () => {
      socketConnection.close();
    };
  }, []);

  return (
    <div>
      <h2 className='text-white'>Livestream</h2>
      <h3 className='text-white'>{receivedMessage}</h3>  {/* Display the received message */}
    </div>
  );
};

export default Livestream;