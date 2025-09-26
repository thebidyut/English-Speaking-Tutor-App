import React, { useState, useEffect } from 'react';
import { getSavedConversations, clearHistory } from '../lib/history';
import { SavedConversation, Message, Transcription } from '../types';

const SavedConversations: React.FC = () => {
    const [conversations, setConversations] = useState<SavedConversation[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        setConversations(getSavedConversations());
    }, []);

    const handleClearHistory = () => {
        if (window.confirm("Are you sure you want to delete all saved conversations? This action cannot be undone.")) {
            clearHistory();
            setConversations([]);
        }
    };
    
    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (conversations.length === 0) {
        return (
            <div className="text-center max-w-lg mx-auto">
                <i className="fa-solid fa-bookmark text-5xl text-slate-400 dark:text-slate-500"></i>
                <h2 className="mt-4 text-2xl font-bold">No Saved Conversations</h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                    Your saved speaking and writing practices will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">সংরক্ষিত কথোপকথন</h2>
                <button
                    onClick={handleClearHistory}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                    <i className="fa-solid fa-trash-can mr-2"></i>
                    Clear History
                </button>
            </div>
            <div className="space-y-4">
                {conversations.map(convo => (
                    <div key={convo.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                        <button
                            onClick={() => toggleExpand(convo.id)}
                            className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                            <div className="flex items-center">
                                <i className={`mr-4 text-xl ${convo.type === 'speak' ? 'fa-solid fa-microphone text-cyan-500' : 'fa-solid fa-keyboard text-purple-500'}`}></i>
                                <div>
                                    <p className="font-semibold">{convo.type === 'speak' ? 'Speaking Practice' : 'Writing Practice'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(convo.date).toLocaleString()}</p>
                                </div>
                            </div>
                            <i className={`fa-solid fa-chevron-down transition-transform ${expandedId === convo.id ? 'rotate-180' : ''}`}></i>
                        </button>
                        {expandedId === convo.id && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 max-h-96 overflow-y-auto">
                                <div className="space-y-3">
                                    {convo.transcript.map(item => {
                                        const msg = item as Message; // For chat
                                        const trans = item as Transcription; // For live
                                        const sender = msg.sender || trans.sender;
                                        const text = msg.text || trans.text;
                                        const isStatus = trans.sender === 'status';

                                        if (isStatus) {
                                             return <p key={item.id} className="text-center text-xs text-slate-500 dark:text-slate-400 italic">{text}</p>
                                        }

                                        return (
                                            <div key={item.id} className={`flex items-start gap-2 ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                {sender === 'ai' && <i className="fa-solid fa-robot text-indigo-500 mt-1"></i>}
                                                <div className={`max-w-md rounded-lg p-2 text-sm whitespace-pre-wrap ${sender === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                                    {text}
                                                </div>
                                                {sender === 'user' && <i className="fa-solid fa-user text-slate-500 mt-1"></i>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SavedConversations;