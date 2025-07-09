import React, { useState, useEffect, useRef } from 'react';
import { orionAnalyzeService } from '../services/adminService.ts';
import type { OrionMessage } from '../types/types';
import { Button } from './Button.tsx';
import { motion, AnimatePresence } from 'framer-motion';

const TypingIndicator = () => (
  <motion.div
    className="flex items-center space-x-1.5"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <motion.span
      className="w-2 h-2 bg-neutral-medium rounded-full"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.span
      className="w-2 h-2 bg-neutral-medium rounded-full"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.span
      className="w-2 h-2 bg-neutral-medium rounded-full"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.8, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

export const OrionCommandCenter: React.FC = () => {
  const [messages, setMessages] = useState<OrionMessage[]>([
    {
      id: 'initial',
      text: 'สวัสดีครับท่านผู้ดูแลระบบ ผมคือ Orion ผู้ช่วยวิเคราะห์ AI ของคุณ สามารถสั่งการได้ที่นี่ครับ เช่น `วิเคราะห์ผู้ใช้งาน @username` หรือ `ค้นหา รูปแบบการ Vouch ที่น่าสงสัย`',
      sender: 'orion',
    }
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  const appendMessage = (message: { text: string; from: 'user' | 'orion'; isError?: boolean }) => {
    const newMessage: OrionMessage = {
      id: `${message.from}-${Date.now()}`,
      text: message.text,
      sender: message.from,
      isError: message.isError || false,
    };
    setMessages(prev => [...prev, newMessage]);
  };


  const handleSend = async () => {
    const command = inputCommand.trim();
    if (!command || isLoading) return;

    appendMessage({ text: command, from: 'user' });
    setInputCommand('');
    setIsLoading(true);

    try {
      const result = await orionAnalyzeService({ command });
      const reply = result.data.reply;
      appendMessage({ text: reply, from: 'orion' });
    } catch (e: any) {
      const errorMessage = e.message || 'An unknown error occurred.';
      appendMessage({ text: "Error: " + errorMessage, from: 'orion', isError: true });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT h-[70vh] flex flex-col">
      <h3 className="text-xl font-semibold text-accent mb-4 text-center">
        🤖 Orion Command Center
      </h3>
      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-neutral-light/50 rounded-md space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {message.sender === 'orion' && <span className="text-xl">🤖</span>}
              <div
                className={`max-w-xl p-3 rounded-lg prose prose-sm whitespace-pre-wrap ${
                  message.sender === 'user'
                    ? 'bg-blue-100 text-neutral-dark'
                    : message.isError
                    ? 'bg-red-100 text-red-800'
                    : 'bg-neutral-light text-neutral-dark'
                }`}
              >
                {message.text}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              key="typing"
              className="flex items-start gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-xl">🤖</span>
              <div className="max-w-xl p-3 rounded-lg bg-neutral-light">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          placeholder="Enter command..."
          className="flex-grow w-full p-3 bg-white border border-neutral-DEFAULT rounded-lg text-neutral-dark focus:outline-none focus:ring-2 focus:ring-accent"
          disabled={isLoading}
        />
        <Button type="submit" variant="primary" size="md" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  );
};