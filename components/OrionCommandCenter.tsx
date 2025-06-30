import React, { useState, useEffect, useRef } from 'react';
import type { OrionMessage } from '../types';
import { Button } from './Button';
import { motion, AnimatePresence } from 'framer-motion';

interface OrionCommandCenterProps {
  orionAnalyzeService: (command: string) => Promise<string>;
}

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

export const OrionCommandCenter: React.FC<OrionCommandCenterProps> = ({ orionAnalyzeService }) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const command = inputCommand.trim();
    if (!command || isLoading) return;

    const userMessage: OrionMessage = {
      id: `user-${Date.now()}`,
      text: command,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInputCommand('');
    setIsLoading(true);

    try {
      const responseText = await orionAnalyzeService(command);
      const orionMessage: OrionMessage = {
        id: `orion-${Date.now()}`,
        text: responseText,
        sender: 'orion',
      };
      setMessages(prev => [...prev, orionMessage]);
    } catch (error) {
      const errorMessage: OrionMessage = {
        id: `error-${Date.now()}`,
        text: 'เกิดข้อผิดพลาดในการสื่อสารกับ Orion AI',
        sender: 'orion',
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT flex flex-col h-[75vh]">
      <h3 className="text-xl font-semibold text-accent mb-4 text-center">Orion Command Center</h3>
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg text-sm font-serif ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.isError
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-neutral-light text-neutral-dark'
                }`}
              >
                {message.sender === 'orion' && <strong className="font-sans font-semibold block mb-1">🤖 Orion:</strong>}
                <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br />') }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-neutral-light text-neutral-dark p-3 rounded-lg">
              <TypingIndicator />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-neutral-DEFAULT pt-4">
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          placeholder={isLoading ? "Orion is thinking..." : "Enter your command..."}
          className="flex-1 p-2 border border-neutral-DEFAULT rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          disabled={isLoading}
          aria-label="Orion command input"
        />
        <Button type="submit" variant="primary" size="md" disabled={isLoading || !inputCommand.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
};