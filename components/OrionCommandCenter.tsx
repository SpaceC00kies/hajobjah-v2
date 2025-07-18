
import React, { useState, useEffect, useRef } from 'react';
import { orionAnalyzeService } from '../services/adminService.ts';
import type { OrionMessage, OrionInsightData } from '../types/types.ts';
import { Button } from './Button.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { OrionInsightCard } from './orion/OrionInsightCard.tsx';

const TypingIndicator = () => (
    <motion.div className="flex items-center space-x-1.5">
        <motion.span className="w-2 h-2 bg-neutral-medium rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.span className="w-2 h-2 bg-neutral-medium rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, ease: "easeInOut" }} />
        <motion.span className="w-2 h-2 bg-neutral-medium rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, delay: 0.4, repeat: Infinity, ease: "easeInOut" }} />
    </motion.div>
);

export const OrionCommandCenter: React.FC = () => {
    const [messages, setMessages] = useState<OrionMessage[]>([
        {
            id: 'initial',
            text: 'สวัสดีครับท่านผู้ดูแลระบบ ผมคือ Orion ผู้ช่วยวิเคราะห์ AI ของคุณ สามารถสั่งการได้ที่นี่ครับ เช่น `วิเคราะห์ผู้ใช้งาน @username`',
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

    const handleSend = async () => {
        const command = inputCommand.trim();
        if (!command || isLoading) return;

        const userMessage: OrionMessage = { id: `user-${Date.now()}`, text: command, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInputCommand('');
        setIsLoading(true);

        try {
            const historyForAPI = [...messages, userMessage].map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text || 'Analysis Request' }]
            }));

            const result = await orionAnalyzeService({ command: command, history: historyForAPI });
            const replyData = result.data.reply as any;
            
            let orionMessage: OrionMessage;

            if (typeof replyData === 'object' && replyData !== null && 'threat_level' in replyData) {
                orionMessage = {
                    id: `orion-${Date.now()}`,
                    sender: 'orion',
                    insightPayload: replyData as OrionInsightData,
                };
            } else if (typeof replyData === 'string') {
                orionMessage = {
                    id: `orion-${Date.now()}`,
                    sender: 'orion',
                    text: replyData,
                };
            } else {
                 orionMessage = {
                    id: `error-${Date.now()}`,
                    sender: 'orion',
                    text: "Received an unexpected response format from Orion.",
                    isError: true,
                };
                console.warn("Unexpected Orion response:", replyData);
            }

            setMessages(prev => [...prev, orionMessage]);

        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred.';
            const errorMsg: OrionMessage = { id: `error-${Date.now()}`, text: "Error: " + errorMessage, sender: 'orion', isError: true };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend();
    };

    return (
        <div className="orion-command-center-container bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-neutral-DEFAULT h-[70vh] flex flex-col">
            <h3 className="orion-title text-xl font-semibold text-accent mb-4 text-center">
                🤖 Orion Command Center
            </h3>
            <div className="orion-message-history flex-grow overflow-y-auto mb-4 p-4 bg-neutral-light/50 rounded-md space-y-4">
                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            layout
                        >
                            {message.sender === 'orion' && <span className="text-xl">🤖</span>}
                            <div
                                className={`max-w-xl rounded-lg ${
                                    message.insightPayload ? '' : 'p-3'
                                } ${
                                    message.sender === 'user'
                                        ? 'bg-blue-100 text-neutral-dark'
                                        : message.isError
                                        ? 'bg-red-100 text-red-800'
                                        : message.insightPayload 
                                        ? 'bg-transparent w-full'
                                        : 'bg-neutral-light text-neutral-dark'
                                }`}
                            >
                               {message.text && (
                                   <div className="text-sm whitespace-pre-wrap">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                                   </div>
                                )}
                                {message.insightPayload && (
                                    <OrionInsightCard payload={message.insightPayload} />
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div key="typing" className="flex items-start gap-3">
                            <span className="text-xl">🤖</span>
                            <div className="p-3 rounded-lg bg-neutral-light"><TypingIndicator /></div>
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
                    className="orion-input flex-grow w-full p-3 bg-white border border-neutral-DEFAULT rounded-lg text-neutral-dark focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={isLoading}
                />
                <Button type="submit" variant="primary" size="md" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send'}
                </Button>
            </form>
        </div>
    );
};