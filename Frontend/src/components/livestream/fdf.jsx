import React, { useEffect, useState, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm-sdk";
import { apiInstance } from "../../api";
import axios from "axios";

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const CHANNEL_NAME = "testChannel";

const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

const LiveStream = () => {
  const [user, setUser] = useState(null);
  const [rtcToken, setRtcToken] = useState(null);
  const [rtmToken, setRtmToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const localTracks = useRef({ videoTrack: null, audioTrack: null });
  const videoContainerRef = useRef(null);
  let rtmClient, channel;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userProfile = await apiInstance.getUserProfile(); // Fetch authenticated user
        setUser(userProfile);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAgoraTokens();
    }
  }, [user]);

  const fetchAgoraTokens = async () => {
    try {
      const response = await apiInstance.get(`/agora/token/${CHANNEL_NAME}/${user.id}/`);
      setRtcToken(response.data.rtc_token);
      setRtmToken(response.data.rtm_token);
    } catch (error) {
      console.error("Error fetching Agora tokens:", error);
    }
  };

  useEffect(() => {
    if (rtcToken && rtmToken) {
      startAgora();
    }
  }, [rtcToken, rtmToken]);

  const startAgora = async () => {
    try {
      await client.join(APP_ID, CHANNEL_NAME, rtcToken, user.id);

      localTracks.current.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localTracks.current.videoTrack = await AgoraRTC.createCameraVideoTrack();

      await client.publish([localTracks.current.audioTrack, localTracks.current.videoTrack]);

      const videoPlayer = document.createElement("div");
      videoPlayer.id = `user-${user.id}`;
      videoPlayer.style.width = "100%";
      videoPlayer.style.height = "400px";
      videoContainerRef.current.appendChild(videoPlayer);
      localTracks.current.videoTrack.play(`user-${user.id}`);

      client.on("user-published", async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === "video") {
          const remoteVideoPlayer = document.createElement("div");
          remoteVideoPlayer.id = `user-${remoteUser.uid}`;
          remoteVideoPlayer.style.width = "100%";
          remoteVideoPlayer.style.height = "400px";
          videoContainerRef.current.appendChild(remoteVideoPlayer);
          remoteUser.videoTrack.play(`user-${remoteUser.uid}`);
        }
        if (mediaType === "audio") {
          remoteUser.audioTrack.play();
        }
      });

      setupChat();
    } catch (error) {
      console.error("Agora Error:", error);
    }
  };

  const setupChat = async () => {
    rtmClient = AgoraRTM.createInstance(APP_ID);
    await rtmClient.login({ uid: String(user.id), token: rtmToken });

    channel = rtmClient.createChannel(CHANNEL_NAME);
    await channel.join();

    channel.on("ChannelMessage", (messageData, senderId) => {
      setMessages((prevMessages) => [...prevMessages, { sender: senderId, text: messageData.text }]);
    });
  };

  const sendMessage = async () => {
    if (message.trim()) {
      await channel.sendMessage({ text: message });
      setMessages((prevMessages) => [...prevMessages, { sender: user.username, text: message }]);
      setMessage("");
    }
  };

  return (
    <div>
      <h2>Live Stream</h2>
      {user ? (
        <>
          <p>Welcome, {user.username}!</p>
          <div ref={videoContainerRef} style={{ display: "flex", flexDirection: "column" }}></div>

          <div style={{ marginTop: "20px" }}>
            <h3>Chat</h3>
            <div style={{ height: "200px", overflowY: "auto", border: "1px solid #ccc", padding: "10px" }}>
              {messages.map((msg, index) => (
                <p key={index}>
                  <strong>{msg.sender}: </strong>
                  {msg.text}
                </p>
              ))}
            </div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </>
      ) : (
        <p>Loading user...</p>
      )}
    </div>
  );
};

export default LiveStream;