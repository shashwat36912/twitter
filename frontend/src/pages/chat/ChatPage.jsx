import React, { useEffect, useState } from 'react';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import useSocket from '../../hooks/useSocket';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ChatPage = () => {
  const { data: authUser } = useQuery({ queryKey: ['authUser'] });
  const userId = authUser?._id;

  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const queryClient = useQueryClient();

  const handlers = {
    receive_message: (payload) => {
      // if message belongs to current conversation, append
      if (selectedUser && (payload.senderId === selectedUser._id || payload.receiverId === selectedUser._id)) {
        setMessages((m) => [...m, payload]);
      }
      // invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    message_sent: (payload) => {
      // optimistic update already done on send, ensure it's present
      setMessages((m) => [...m, payload]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    typing: ({ senderId, typing }) => {
      // pass to ChatWindow via state if needed
      // for simplicity just console
      console.log('typing from', senderId, typing);
    }
  };

  const { socketRef, sendMessage, sendTyping } = useSocket(userId, handlers);

  useEffect(() => {
    if (!selectedUser) return;
    // load chat history
    (async () => {
      const res = await fetch(`/api/messages/between/${selectedUser._id}`);
      const data = await res.json();
      setMessages(data.messages || []);
    })();
  }, [selectedUser]);

  return (
    <div className='flex gap-4 min-h-screen'>
      <div className='w-80 hidden md:block'>
        <ConversationList onSelect={setSelectedUser} />
      </div>
      <div className='flex-1'>
        <ChatWindow
          me={authUser}
          other={selectedUser}
          messages={messages}
          onSend={(text) => {
            if (!authUser || !selectedUser) return;
            const payload = { senderId: authUser._id, receiverId: selectedUser._id, text, timestamp: new Date().toISOString() };
            // POST to server to persist
            fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: selectedUser._id, text }) });
            // emit via socket
            sendMessage(payload);
            setMessages((m) => [...m, payload]);
          }}
          onTyping={(typing) => sendTyping({ senderId: authUser._id, receiverId: selectedUser._id, typing })}
        />
      </div>
    </div>
  );
};

export default ChatPage;
