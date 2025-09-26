import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import ChatPractice from './components/ChatPractice';
import LivePractice from './components/LivePractice';
import Vocabulary from './components/Vocabulary';
import Progress from './components/Progress';
import SavedConversations from './components/SavedConversations';
import FeatureModal from './components/FeatureModal';

type ModalType = 'speak' | 'write' | 'vocabulary' | 'progress' | 'history';

// FIX: Removed component from config to be handled by a type-safe switch statement.
const MODAL_CONFIG: Record<ModalType, { title: string }> = {
    speak: { title: "স্পিকিং অনুশীলন" },
    write: { title: "রাইটিং অনুশীলন" },
    vocabulary: { title: "আজকের শব্দ" },
    progress: { title: "আপনার অগ্রগতি" },
    history: { title: "সংরক্ষিত কথোপকথন" },
};

const App: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        
        const handler = (event: MediaQueryListEvent) => setIsDarkMode(event.matches);
        mediaQuery.addEventListener('change', handler);
        
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);
    
    const handleOpenModal = (modal: ModalType) => setActiveModal(modal);
    const handleCloseModal = () => setActiveModal(null);

    const renderModalContent = () => {
        if (!activeModal) return null;

        // FIX: Replaced dynamic component rendering with a switch statement to ensure type safety.
        // This resolves the error where components with required props (like onClose) could
        // potentially not receive them.
        switch (activeModal) {
            case 'speak':
                return <LivePractice onClose={handleCloseModal} />;
            case 'write':
                return <ChatPractice onClose={handleCloseModal} />;
            case 'vocabulary':
                return <Vocabulary />;
            case 'progress':
                return <Progress />;
            case 'history':
                return <SavedConversations />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                <i className="fa-solid fa-language mr-2"></i>
                                Bangla-English Tutor
                            </h1>
                        </div>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white">
                            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                        </button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Home openModal={handleOpenModal} />
            </main>
            {activeModal && (
                <FeatureModal 
                    isOpen={!!activeModal} 
                    onClose={handleCloseModal} 
                    title={MODAL_CONFIG[activeModal].title}
                >
                    {renderModalContent()}
                </FeatureModal>
            )}
        </div>
    );
};

export default App;
