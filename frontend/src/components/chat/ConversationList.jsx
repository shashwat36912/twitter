import React from 'react';
import { useQuery } from '@tanstack/react-query';

const ConversationList = ({ onSelect }) => {
  const { data } = useQuery({ queryKey: ['conversations'], queryFn: async () => { const res = await fetch('/api/messages/conversations'); return res.json(); } });
  const conversations = data?.conversations || [];

  return (
    <div className='bg-[#0f0f0f] p-2 rounded'>
      <h3 className='font-bold mb-2'>Conversations</h3>
      <ul className='flex flex-col gap-2'>
        {conversations.map((c) => (
          <li key={c.conversationWith} className='p-2 rounded hover:bg-gray-800 cursor-pointer' onClick={() => onSelect({ _id: c.conversationWith })}>
            <div className='flex justify-between'>
              <div>
                <div className='font-semibold'>{c.lastMessage?.text || 'No messages'}</div>
                <div className='text-sm text-slate-400'>{c.unreadCount} unread</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ConversationList;
