import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { WordData } from '../types';

const WORD_PROMPT = `Provide a new, common English vocabulary word that is useful for daily conversation for a Bengali speaker.
Your response MUST be a single JSON object with the following keys and string values: 'word', 'englishMeaning', 'bengaliMeaning', 'exampleSentence'.
Do not include any text before or after the JSON object.`;

const wordSchema = {
    type: Type.OBJECT,
    properties: {
        word: { type: Type.STRING },
        englishMeaning: { type: Type.STRING },
        bengaliMeaning: { type: Type.STRING },
        exampleSentence: { type: Type.STRING },
    },
    required: ["word", "englishMeaning", "bengaliMeaning", "exampleSentence"]
};


const Vocabulary: React.FC = () => {
    const [wordData, setWordData] = useState<WordData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWord = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: WORD_PROMPT,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: wordSchema,
                },
            });

            const jsonText = response.text.trim();
            const data = JSON.parse(jsonText);
            setWordData(data);
        } catch (err) {
            console.error("Failed to fetch word of the day:", err);
            setError("Failed to load a new word. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWord();
    }, [fetchWord]);

    const renderContent = () => {
        if (isLoading) {
            return (
                 <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                    <p className="mt-4 text-slate-500">Loading today's word...</p>
                </div>
            )
        }
        if (error) {
            return <p className="text-center text-red-500">{error}</p>
        }
        if (wordData) {
            return (
                <>
                    <h2 className="text-4xl font-bold text-center text-indigo-600 dark:text-indigo-400 capitalize">{wordData.word}</h2>
                    <div className="mt-6 space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">English Meaning:</h3>
                            <p className="text-slate-600 dark:text-slate-400">{wordData.englishMeaning}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">বাংলা অর্থ:</h3>
                            <p className="text-slate-600 dark:text-slate-400">{wordData.bengaliMeaning}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300">Example Sentence:</h3>
                            <p className="text-slate-600 dark:text-slate-400 italic">"{wordData.exampleSentence}"</p>
                        </div>
                    </div>
                </>
            );
        }
        return null;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 text-center">আজকের শব্দ</h2>
                {renderContent()}
            </div>
             <div className="text-center mt-6">
                <button 
                    onClick={fetchWord}
                    disabled={isLoading}
                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                >
                    <i className={`fa-solid fa-rotate-right mr-2 ${isLoading ? 'animate-spin' : ''}`}></i>
                    নতুন শব্দ আনুন
                </button>
            </div>
        </div>
    );
};

export default Vocabulary;
