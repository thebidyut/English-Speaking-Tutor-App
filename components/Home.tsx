import React from 'react';

interface HomeProps {
    openModal: (modal: 'speak' | 'write' | 'vocabulary' | 'progress' | 'history') => void;
}

const Home: React.FC<HomeProps> = ({ openModal }) => {
    return (
        <div>
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white sm:text-5xl md:text-6xl">
                    আপনার ইংরেজি শেখার <span className="text-indigo-600 dark:text-indigo-400">সহযোগী</span>
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
                    আমাদের AI-চালিত প্ল্যাটফর্মের সাথে ইংরেজি বলা এবং লেখা অনুশীলন করুন। আপনার দক্ষতা বাড়ান, আত্মবিশ্বাস অর্জন করুন।
                </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
                <FeatureCard
                    icon="fa-solid fa-microphone-lines"
                    title="স্পিকিং অনুশীলন"
                    description="AI এর সাথে কথা বলুন এবং তাৎক্ষণিক ফিডব্যাক পান।"
                    onClick={() => openModal('speak')}
                    color="cyan"
                />
                <FeatureCard
                    icon="fa-solid fa-pen-to-square"
                    title="রাইটিং অনুশীলন"
                    description="AI এর সাথে চ্যাট করুন এবং আপনার লেখার দক্ষতা উন্নত করুন।"
                    onClick={() => openModal('write')}
                    color="purple"
                />
                <FeatureCard
                    icon="fa-solid fa-book-open"
                    title="শব্দভান্ডার"
                    description="প্রতিদিন নতুন নতুন ইংরেজি শব্দ শিখুন।"
                    onClick={() => openModal('vocabulary')}
                    color="emerald"
                />
                <FeatureCard
                    icon="fa-solid fa-chart-line"
                    title="আপনার অগ্রগতি"
                    description="আপনার শেখার পরিসংখ্যান এবং পয়েন্ট দেখুন।"
                    onClick={() => openModal('progress')}
                    color="amber"
                />
                <FeatureCard
                    icon="fa-solid fa-bookmark"
                    title="সংরক্ষিত কথোপকথন"
                    description="আপনার আগের অনুশীলনগুলো পর্যালোচনা করুন।"
                    onClick={() => openModal('history')}
                    color="rose"
                />
            </div>
        </div>
    );
};

interface FeatureCardProps {
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
    color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, onClick, color }) => {
    const colors = {
        cyan: "hover:border-cyan-500/50 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10",
        purple: "hover:border-purple-500/50 hover:bg-purple-500/10 dark:hover:bg-purple-500/10",
        emerald: "hover:border-emerald-500/50 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10",
        amber: "hover:border-amber-500/50 hover:bg-amber-500/10 dark:hover:bg-amber-500/10",
        rose: "hover:border-rose-500/50 hover:bg-rose-500/10 dark:hover:bg-rose-500/10",
    }
    const iconColors = {
        cyan: "text-cyan-500",
        purple: "text-purple-500",
        emerald: "text-emerald-500",
        amber: "text-amber-500",
        rose: "text-rose-500",
    }
    return (
        <div onClick={onClick} className={`block p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-transparent transition-all duration-300 cursor-pointer ${colors[color as keyof typeof colors]}`}>
            <div className={`text-4xl ${iconColors[color as keyof typeof iconColors]}`}>
                <i className={icon}></i>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-white">{title}</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
    );
};

export default Home;
