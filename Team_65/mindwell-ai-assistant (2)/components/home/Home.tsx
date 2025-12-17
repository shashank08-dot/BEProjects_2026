
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateMentalHealthFacts } from '../../services/geminiService';
import { Fact } from '../../types';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { Bot, Sparkles, TrendingUp, CheckCircle } from 'lucide-react';

const FactCard: React.FC<{ fact: Fact }> = ({ fact }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
        <h3 className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2"><Sparkles size={18} /> {fact.title}</h3>
        <p className="text-slate-600 dark:text-slate-400 mt-2">{fact.snippet}</p>
    </div>
);

const Home: React.FC = () => {
    const [visitorCount, setVisitorCount] = useState(0);
    const [facts, setFacts] = useState<Fact[]>([]);
    const [isLoadingFacts, setIsLoadingFacts] = useState(true);

    useEffect(() => {
        // Simulate a visitor counter
        let count = parseInt(localStorage.getItem('visitorCount') || '1427', 10);
        const hasVisited = localStorage.getItem('hasVisited');
        if (!hasVisited) {
            count += 1;
            localStorage.setItem('visitorCount', count.toString());
            localStorage.setItem('hasVisited', 'true');
        }
        setVisitorCount(count);

        // Fetch facts
        const fetchFacts = async () => {
            setIsLoadingFacts(true);
            const fetchedFacts = await generateMentalHealthFacts();
            setFacts(fetchedFacts);
            setIsLoadingFacts(false);
        };
        fetchFacts();
    }, []);

    return (
        <div className="animate-fade-in space-y-16">
            {/* Hero Section */}
            <section className="text-center py-16">
                <div className="inline-block p-4 bg-teal-100 dark:bg-teal-900 rounded-full mb-4">
                    <Bot size={48} className="text-teal-500" />
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white">
                    A new path to <span className="text-teal-500">mental wellness</span> starts here.
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-300">
                    MindWell AI offers a private, supportive space to understand your mental health through personalized assessments and AI-powered conversations.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Link to="/register">
                        <Button variant="primary" className="text-lg">Get Started</Button>
                    </Link>
                    <Link to="/login">
                        <Button variant="secondary" className="text-lg">Sign In</Button>
                    </Link>
                </div>
            </section>
            
            {/* Features Section */}
            <section className="text-center">
                 <h2 className="text-3xl font-bold mb-8 text-slate-800 dark:text-white">Your Personal Wellness Toolkit</h2>
                 <div className="grid md:grid-cols-3 gap-8">
                    <div className="p-6">
                        <CheckCircle className="mx-auto text-teal-500 mb-2" size={32}/>
                        <h3 className="font-semibold text-xl">AI-Powered Assessments</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Receive a confidential, personalized report to understand your mental state.</p>
                    </div>
                     <div className="p-6">
                        <Bot className="mx-auto text-teal-500 mb-2" size={32}/>
                        <h3 className="font-semibold text-xl">Empathetic Chatbot</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Talk to RIPEX, our supportive AI, anytime you need someone to listen.</p>
                    </div>
                     <div className="p-6">
                        <TrendingUp className="mx-auto text-teal-500 mb-2" size={32}/>
                        <h3 className="font-semibold text-xl">Track Your Journey</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Revisit past reports to see your progress and stay motivated.</p>
                    </div>
                 </div>
            </section>

            {/* Facts Section */}
            <section>
                <h2 className="text-3xl font-bold text-center mb-8 text-slate-800 dark:text-white">Wellness Insights</h2>
                {isLoadingFacts ? (
                    <div className="flex justify-center"><Spinner /></div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {facts.map((fact, index) => <FactCard key={index} fact={fact} />)}
                    </div>
                )}
            </section>

            {/* Visitor Counter */}
            <div className="text-center text-slate-500 dark:text-slate-400">
                <p>Join over <span className="font-bold text-teal-500">{visitorCount.toLocaleString()}</span> others on their wellness journey.</p>
            </div>
        </div>
    );
};

export default Home;
