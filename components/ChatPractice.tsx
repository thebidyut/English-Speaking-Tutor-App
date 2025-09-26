import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Message } from '../types';
import { saveConversation } from '../lib/history';
import { addPoints, updateStreak, incrementWritingSessions } from '../lib/gamification';
import Modal from './Modal';

const SYSTEM_INSTRUCTION = `You are 'Alex', an expert, friendly, and patient English teacher from an English-speaking country. Your student is a native Bengali speaker trying to improve their conversational English.

**Your Core Identity:**
- Your name is Alex.
- You are a human English teacher.
- **Crucially, you MUST NEVER mention that you are an AI, a language model, or a computer program. You must completely hide your AI nature and maintain the persona of Alex, the English teacher.**

**Your Most Important Task: Error Correction**
- This is your top priority. You MUST correct every grammatical error, awkward phrasing, or unnatural sentence you detect from the user.
- Correct mistakes IMMEDIATELY in your response. Do not wait.
- First, respond naturally to what the user said to keep the conversation flowing.
- THEN, on a new line, add the correction using this exact format:
"💡 **Correction:**
You said: [The user's exact incorrect sentence]
A better way: [The corrected, natural-sounding sentence]
(কারণ: [A simple, clear explanation of the mistake in BENGALI])"

**Example Correction:**
If the user says "I like read book", your response should be:
"That's great! What kind of books do you enjoy?

💡 **Correction:**
You said: I like read book.
A better way: I like to read books. or I like reading books.
(কারণ: 'like' verb-এর পরে আরেকটি verb আসলে সাধারণত 'to' + verb অথবা verb + 'ing' বসে এবং 'book' শব্দটি countable noun হওয়ায় 'books' হবে।)"

**Conversation Style:**
- Be encouraging, patient, and friendly.
- Ask open-ended questions to keep the conversation going.
- Start the very first conversation by introducing yourself as Alex and asking the user what they'd like to talk about. For example: "Hello! My name is Alex, and I'll be your English tutor today. What would you like to talk about?"`;


interface ChatPracticeProps {
    onClose: () => void;
}

const ChatPractice: React.FC<ChatPracticeProps> = ({ onClose }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const newChat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction: SYSTEM_INSTRUCTION },
                });
                setChat(newChat);

                // Send an empty message to get the initial greeting
                setIsLoading(true);
                const response = await newChat.sendMessageStream({ message: "" });
                let text = '';
                for await (const chunk of response) {
                    text += chunk.text;
                }
                setMessages([{ id: Date.now(), sender: 'ai', text }]);
                setIsLoading(false);

            } catch (error) {
                console.error("Failed to initialize chat:", error);
                setMessages([{ id: Date.now(), sender: 'ai', text: "Sorry, I'm having trouble connecting. Please check your API key and refresh the page." }]);
                setIsLoading(false);
            }
        };
        initChat();
    }, []);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentInput.trim() || !chat || isLoading) return;

        const userMessage: Message = { id: Date.now(), sender: 'user', text: currentInput };
        setMessages(prev => [...prev, userMessage]);
        setCurrentInput('');
        setIsLoading(true);

        try {
            const responseStream = await chat.sendMessageStream({ message: userMessage.text });
            let aiResponseText = '';
            const aiMessageId = Date.now() + 1;

            for await (const chunk of responseStream) {
                aiResponseText += chunk.text;
                setMessages(prev => {
                    const existingAiMessage = prev.find(m => m.id === aiMessageId);
                    if (existingAiMessage) {
                        return prev.map(m => m.id === aiMessageId ? { ...m, text: aiResponseText } : m);
                    } else {
                        return [...prev, { id: aiMessageId, sender: 'ai', text: aiResponseText }];
                    }
                });
            }
            addPoints(10); // Add points for each interaction
            updateStreak();
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: "I'm sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndSession = () => {
        // If there's more than just the AI's opening message, ask to save. Otherwise, just close.
        if (messages.length > 1) { 
            setShowSaveModal(true);
        } else {
            onClose();
        }
    };
    
    const handleSave = () => {
        setIsSaving(true);
        saveConversation({ type: 'write', transcript: messages });
        incrementWritingSessions();
        setTimeout(() => {
            setIsSaving(false);
            setShowSaveModal(false);
            onClose(); // Close the main modal after saving
        }, 1000);
    };

    return (
        <div className="flex flex-col h-[70vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-end items-center">
                <button
                    onClick={handleEndSession}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                >
                    End Session
                </button>
            </div>
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><i className="fa-solid fa-robot"></i></div>}
                        <div className={`max-w-md rounded-lg p-3 text-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                            {msg.text}
                        </div>
                         {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white flex-shrink-0"><i className="fa-solid fa-user"></i></div>}
                    </div>
                ))}
                 {isLoading && messages[messages.length-1]?.sender === 'user' && (
                     <div className="flex items-start gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><i className="fa-solid fa-robot"></i></div>
                        <div className="max-w-md rounded-lg p-3 text-sm bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none">
                           <span className="animate-pulse">...</span>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading || !chat}
                    />
                    <button type="submit" disabled={isLoading || !chat || !currentInput.trim()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                        <i className="fa-solid fa-paper-plane"></i>
                    </button>
                </form>
            </div>
            <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="Save Conversation?">
                <p className="text-slate-600 dark:text-slate-400 mb-6">Would you like to save this conversation to your history?</p>
                <div className="flex justify-end gap-4">
                    <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500">
                        Discard
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ChatPractice;