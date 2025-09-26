import { SavedConversation } from '../types';

const HISTORY_KEY = 'banglaEnglishTutorHistory';

export const getSavedConversations = (): SavedConversation[] => {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        const conversations = data ? JSON.parse(data) : [];
        // Sort by date descending (newest first)
        return conversations.sort((a: SavedConversation, b: SavedConversation) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error("Failed to read history from localStorage", error);
        return [];
    }
};

export const saveConversation = (conversation: Omit<SavedConversation, 'id' | 'date'>): void => {
    try {
        const history = getSavedConversations();
        const newConversation: SavedConversation = {
            ...conversation,
            id: Date.now(),
            date: new Date().toISOString(),
        };
        history.unshift(newConversation); // Add to the beginning
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Failed to save conversation to localStorage", error);
    }
};

export const clearHistory = (): void => {
    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error("Failed to clear history from localStorage", error);
    }
};
