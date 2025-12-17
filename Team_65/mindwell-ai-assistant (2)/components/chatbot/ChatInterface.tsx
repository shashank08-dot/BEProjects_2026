
import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { createChat } from '../../services/geminiService';
import { ChatMessage } from '../../types';
import { Send, Bot, User } from 'lucide-react';
import Button from '../ui/Button';

const ChatInterface: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatInstance = createChat();
    setChat(chatInstance);
    setMessages([
      { role: 'model', text: 'Hello! I am RIPEX, your personal mental health companion. How are you feeling today?' }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chat || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const stream = await chat.sendMessageStream({ message: input });
        let modelResponse = '';
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        for await (const chunk of stream) {
            modelResponse += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].text = modelResponse;
                return newMessages;
            });
        }
    } catch (error) {
        console.error("Error sending message:", error);
        setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[75vh] max-w-3xl mx-auto bg-white dark:bg-slate-800 shadow-xl rounded-lg">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-3">
        <Bot className="text-teal-500" size={24} />
        <h1 className="text-xl font-bold">Chat with RIPEX</h1>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <Bot className="text-teal-500 flex-shrink-0" size={24} />}
            <div className={`px-4 py-2 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
            {msg.role === 'user' && <User className="text-slate-500 flex-shrink-0" size={24} />}
          </div>
        ))}
        {isLoading && messages[messages.length-1].role === 'user' && (
             <div className="flex items-start gap-3">
                 <Bot className="text-teal-500 flex-shrink-0" size={24} />
                 <div className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                    <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse delay-75"></span>
                        <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse delay-150"></span>
                        <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse delay-300"></span>
                    </div>
                 </div>
             </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-700"
            disabled={isLoading}
          />
          <Button onClick={handleSend} isLoading={isLoading} className="rounded-full w-12 h-12 p-0">
            {!isLoading && <Send size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
