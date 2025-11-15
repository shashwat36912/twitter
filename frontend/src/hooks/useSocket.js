import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export default function useSocket(userId, handlers = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('register', userId);
    });

    // register handlers
    if (handlers.receive_message) socket.on('receive_message', handlers.receive_message);
    if (handlers.message_sent) socket.on('message_sent', handlers.message_sent);
    if (handlers.typing) socket.on('typing', handlers.typing);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  const sendMessage = (payload) => {
    if (socketRef.current) socketRef.current.emit('send_message', payload);
  };

  const sendTyping = ({ senderId, receiverId, typing }) => {
    if (socketRef.current) socketRef.current.emit('typing', { senderId, receiverId, typing });
  };

  return { socketRef, sendMessage, sendTyping };
}
