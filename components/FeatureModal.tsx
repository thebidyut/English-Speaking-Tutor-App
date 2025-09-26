import React, { ReactNode } from 'react';

interface FeatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title: string;
}

const FeatureModal: React.FC<FeatureModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" 
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors" aria-label="Close modal">
                        <i className="fa-solid fa-xmark text-2xl"></i>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default FeatureModal;
