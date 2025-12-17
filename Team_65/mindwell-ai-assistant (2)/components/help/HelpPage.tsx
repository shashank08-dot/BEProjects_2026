
import React, { useState, useEffect } from 'react';
import { getEmergencyContacts } from '../../services/geminiService';
import { Helpline } from '../../types';
import Spinner from '../ui/Spinner';
import { Phone, Globe, Info, LifeBuoy } from 'lucide-react';

const HelplineCard: React.FC<{ helpline: Helpline }> = ({ helpline }) => (
    <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6 flex flex-col sm:flex-row gap-4 items-start border-l-4 border-teal-500">
        <div className="flex-shrink-0 bg-teal-100 dark:bg-teal-900 text-teal-500 p-3 rounded-full">
            <LifeBuoy size={28} />
        </div>
        <div className="flex-grow">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{helpline.name}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{helpline.description}</p>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                <a href={`tel:${helpline.phone}`} className="flex items-center gap-2 font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                    <Phone size={16} />
                    <span>{helpline.phone}</span>
                </a>
                {helpline.website && (
                     <a href={helpline.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        <Globe size={16} />
                        <span>Visit Website</span>
                    </a>
                )}
            </div>
        </div>
    </div>
);

const HelpPage: React.FC = () => {
    const [helplines, setHelplines] = useState<Helpline[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHelplines = async () => {
            try {
                setIsLoading(true);
                const data = await getEmergencyContacts();
                setHelplines(data);
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHelplines();
    }, []);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold">Immediate Help & Resources</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                    If you are in a crisis or any other person may be in danger, please use these resources.
                </p>
            </div>
            
             <div className="mb-8 p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg flex items-start gap-3">
                <Info size={24} className="flex-shrink-0 mt-1" />
                <div>
                    <h2 className="font-bold">You are not alone.</h2>
                    <p>Confidential help is available for free, 24/7. Reaching out is a sign of strength.</p>
                </div>
            </div>

            {isLoading && (
                <div className="flex flex-col items-center justify-center h-48">
                    <Spinner size="lg" />
                    <p className="mt-4 text-slate-500">Loading resources...</p>
                </div>
            )}
            {error && <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>}

            {!isLoading && !error && (
                <div className="space-y-6">
                    {helplines.map((line, index) => (
                        <HelplineCard key={index} helpline={line} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HelpPage;
