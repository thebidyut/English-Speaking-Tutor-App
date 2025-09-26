import React, { useState, useEffect } from 'react';
import { getProgress } from '../lib/gamification';
import type { ProgressData } from '../types';

const Progress: React.FC = () => {
    const [progress, setProgress] = useState<ProgressData | null>(null);

    useEffect(() => {
        setProgress(getProgress());
    }, []);

    if (!progress) {
        return (
            <div className="flex justify-center items-center h-full">
                <p>Loading progress...</p>
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">আপনার অগ্রগতি</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                <StatCard
                    icon="fa-solid fa-star"
                    label="মোট পয়েন্ট"
                    value={progress.points}
                    color="text-yellow-500"
                />
                <StatCard
                    icon="fa-solid fa-fire"
                    label="টানা অনুশীলন"
                    value={`${progress.streak} দিন`}
                    color="text-orange-500"
                />
                 <StatCard
                    icon="fa-solid fa-microphone-lines"
                    label="স্পিকিং সেশন"
                    value={progress.speakingSessions}
                    color="text-cyan-500"
                />
                 <StatCard
                    icon="fa-solid fa-pen-to-square"
                    label="রাইটিং সেশন"
                    value={progress.writingSessions}
                    color="text-purple-500"
                />
            </div>
             <p className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
                অনুশীলন চালিয়ে যান! আপনার প্রতিদিনের ছোট ছোট চেষ্টাই আপনাকে লক্ষ্যে পৌঁছে দেবে।
            </p>
        </div>
    );
};

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg flex items-center space-x-4">
            <div className={`text-4xl ${color}`}>
                <i className={icon}></i>
            </div>
            <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

export default Progress;
