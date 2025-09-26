import { ProgressData } from '../types';

const PROGRESS_KEY = 'banglaEnglishTutorProgress';

const getDefaultProgress = (): ProgressData => ({
    points: 0,
    streak: 0,
    lastPracticeDate: null,
    speakingSessions: 0,
    writingSessions: 0,
});

export const getProgress = (): ProgressData => {
    try {
        const data = localStorage.getItem(PROGRESS_KEY);
        return data ? JSON.parse(data) : getDefaultProgress();
    } catch (error) {
        console.error("Failed to read progress from localStorage", error);
        return getDefaultProgress();
    }
};

const saveProgress = (progress: ProgressData): void => {
    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (error) {
        console.error("Failed to save progress to localStorage", error);
    }
};

export const addPoints = (amount: number): void => {
    const progress = getProgress();
    progress.points += amount;
    saveProgress(progress);
};

export const updateStreak = (): void => {
    const progress = getProgress();
    const today = new Date().toISOString().split('T')[0];

    if (progress.lastPracticeDate === today) {
        return; // Already practiced today
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (progress.lastPracticeDate === yesterdayStr) {
        progress.streak += 1; // Continue the streak
    } else {
        progress.streak = 1; // Reset or start a new streak
    }

    progress.lastPracticeDate = today;
    saveProgress(progress);
};

export const incrementSpeakingSessions = (): void => {
    const progress = getProgress();
    progress.speakingSessions += 1;
    saveProgress(progress);
};

export const incrementWritingSessions = (): void => {
    const progress = getProgress();
    progress.writingSessions += 1;
    saveProgress(progress);
}
