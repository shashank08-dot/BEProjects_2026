
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FileText, Stethoscope, Bot, ArrowRight, BookOpen } from 'lucide-react';
import ChatPopup from '../chatbot/ChatPopup';

const FeatureCard: React.FC<{ to?: string; onClick?: () => void; icon: React.ReactNode; title: string; description: string }> = ({ to, onClick, icon, title, description }) => {
    const content = (
        <div className="group block p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
            <div className="flex items-center space-x-4">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/50 rounded-lg text-teal-600 dark:text-teal-300">
                {icon}
            </div>
            <div>
                <p className="text-lg font-semibold text-slate-800 dark:text-white">{title}</p>
                <p className="text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            <div className="ml-auto text-slate-400 group-hover:text-teal-500 transition-colors">
                <ArrowRight size={24} />
            </div>
            </div>
        </div>
    );

    if (to) {
        return <Link to={to}>{content}</Link>;
    }
    return <button onClick={onClick} className="w-full text-left">{content}</button>
};


const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showChatPopup, setShowChatPopup] = useState(true);
  const [hasPreviousReport, setHasPreviousReport] = useState(false);

  useEffect(() => {
    if (user) {
      const savedReport = localStorage.getItem(`mindwell-report-${user.id}`);
      if (savedReport) {
        setHasPreviousReport(true);
      }
    }
  }, [user]);

  const handleViewReport = () => {
    navigate('/report');
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="p-8 bg-teal-600 dark:bg-teal-500 text-white rounded-xl shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold">Welcome back, {user?.email.split('@')[0]}!</h1>
        <p className="mt-2 text-lg text-teal-100">Your journey to wellness continues here. What would you like to do today?</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <FeatureCard 
          to="/questionnaire" 
          icon={<FileText size={32} />} 
          title="New Wellness Assessment" 
          description="Answer AI-generated questions to get a new personalized wellness report." 
        />
        {hasPreviousReport && (
            <FeatureCard 
                onClick={handleViewReport}
                icon={<BookOpen size={32} />} 
                title="View Last Report" 
                description="Revisit the insights and suggestions from your most recent assessment." 
            />
        )}
        <FeatureCard 
          to="/doctors" 
          icon={<Stethoscope size={32} />} 
          title="Find a Professional" 
          description="Locate and connect with mental health doctors in your area." 
        />
         <FeatureCard 
          to="/chat" 
          icon={<Bot size={32} />} 
          title="Chat with RIPEX" 
          description="Talk to our supportive AI chatbot anytime you need a listening ear." 
        />
      </div>

      {showChatPopup && <ChatPopup onClose={() => setShowChatPopup(false)} />}
    </div>
  );
};

export default Dashboard;
