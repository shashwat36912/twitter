import React, { useState, useRef, useEffect } from 'react';

const ChatWindow = ({ me, other, messages, onSend, onTyping }) => {
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // scroll to bottom when messages change
    const el = document.getElementById('chat-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    onTyping(false);
  };

  const handleTyping = (val) => {
    setText(val);
    if (!typing) {
      setTyping(true);
      onTyping(true);
    }
    // debounce off
    clearTimeout(inputRef.current);
    inputRef.current = setTimeout(() => {
      setTyping(false);
      onTyping(false);
    }, 800);
  };

  return (
    <div className='flex flex-col h-full'>
      <div className='border-b p-3 font-bold'>{other ? `Chat with ${other._id}` : 'Select a conversation'}</div>
      <div id='chat-scroll' className='flex-1 overflow-auto p-3'>
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.senderId === me?._id ? 'text-right' : 'text-left'}`}>
            <div className='inline-block bg-[#191919] p-2 rounded'>{m.text}</div>
            <div className='text-xs text-slate-400'>{new Date(m.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <div className='border-t p-3 flex items-center gap-2'>
        <form onSubmit={handleSend} className='flex flex-1 gap-2'>
          <input
            className='flex-1 bg-transparent border rounded p-2'
            placeholder='Write a message...'
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
          />
          <button className='btn btn-primary' type='submit'>Send</button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
