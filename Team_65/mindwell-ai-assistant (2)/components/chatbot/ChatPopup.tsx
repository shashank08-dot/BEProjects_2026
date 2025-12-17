
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowRight, X } from 'lucide-react';

interface ChatPopupProps {
  onClose: () => void;
}

const ChatPopup: React.FC<ChatPopupProps> = ({ onClose }) => {
  const navigate = useNavigate();

  const handleStartChat = () => {
    navigate('/chat');
  };

  return (
    <div className="fixed bottom-5 right-5 w-80 bg-white dark:bg-slate-800 shadow-2xl rounded-lg p-4 animate-fade-in-up transition-transform">
      <button onClick={onClose} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        <X size={20} />
      </button>
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-full">
          <Bot size={24} className="text-teal-500" />
        </div>
        <p className="font-semibold text-slate-700 dark:text-slate-200">Hi, want to talk?</p>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
        I'm RIPEX, your AI companion. I'm here to listen whenever you need.
      </p>
      <button 
        onClick={handleStartChat} 
        className="mt-4 w-full flex items-center justify-center bg-teal-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-teal-600 transition-colors"
      >
        Start Chatting <ArrowRight size={16} className="ml-2" />
      </button>
    </div>
  );
};

export default ChatPopup;
