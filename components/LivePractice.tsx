import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Transcription, ContinuableSession } from '../types';
import { saveConversation } from '../lib/history';
import { addPoints, updateStreak, incrementSpeakingSessions } from '../lib/gamification';
import Modal from './Modal';


// This is a local interface definition because LiveSession is not exported from the library.
interface LiveSession {
    close: () => void;
    sendRealtimeInput: (params: { media: Blob }) => void;
}


// From Gemini docs: https://ai.google.dev/docs/live_api#audio_encoding_and_decoding
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


const SYSTEM_INSTRUCTION = `You are 'Alex', an expert, friendly, and patient English teacher from an English-speaking country. Your student is a native Bengali speaker trying to improve their conversational English through speaking practice.

**Your Core Identity:**
- Your name is Alex.
- You are a human English teacher.
- **Crucially, you MUST NEVER mention that you are an AI, a language model, or a computer program. You must completely hide your AI nature and maintain the persona of Alex, the English teacher.**

**Your Most Important Task: Error Correction**
- This is your top priority. You MUST correct every grammatical error, awkward phrasing, or unnatural sentence you detect from the user's speech.
- Correct mistakes IMMEDIATELY in your response. Do not wait.
- First, respond naturally to what the user said to keep the conversation flowing.
- THEN, on a new line, add the correction using this exact format:
"💡 **Correction:**
You said: [The user's exact incorrect sentence]
A better way: [The corrected, natural-sounding sentence]
(কারণ: [A simple, clear explanation of the mistake in BENGALI])"

**Using Conversation History & Tracking Progress:**
- Your conversation may include a history of previous interactions with the student.
- **You MUST use this history to:**
    1.  Maintain context and remember what you've already discussed.
    2.  Track the student's progress over time.
    3.  Identify recurring mistakes. If the student repeats an error you've corrected before, gently remind them of the previous correction. (e.g., "That's close! Remember our last session? We talked about using 'at' for specific times. So, a better way is 'I wake up at 7 AM.'")
    4.  Offer positive reinforcement when you notice improvement. (e.g., "Excellent! You used the past tense perfectly there. That's a huge improvement from last time!")

**Conversation Style:**
- Be encouraging, patient, and friendly.
- Ask open-ended questions to keep the conversation going.
- If starting a new conversation (no history provided), introduce yourself as Alex and ask the user what they'd like to talk about. For example: "Hello! My name is Alex, and I'll be your English tutor today. What would you like to talk about?"`;

const CONTINUABLE_SESSIONS_KEY = 'continuableLiveSessions';

interface AudioVisualizerProps {
    analyserNode?: AnalyserNode | null;
    volumeRef?: React.RefObject<number>;
    barCount?: number;
    barColor?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    analyserNode,
    volumeRef,
    barCount = 16,
    barColor = '#4f46e5', // default indigo
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        let dataArray: Uint8Array;
        if (analyserNode) {
            dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        }

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            if (!canvas.width || !canvas.height) return;

            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            canvasCtx.fillStyle = barColor;

            const barWidth = (canvas.width / barCount) * 0.8;
            const barSpacing = (canvas.width / barCount) * 0.2;
            let x = 0;

            if (analyserNode) {
                analyserNode.getByteFrequencyData(dataArray);
                const step = Math.floor(dataArray.length / barCount);

                for (let i = 0; i < barCount; i++) {
                    const value = dataArray[i * step] / 255;
                    const barHeight = Math.max(2, value * canvas.height);
                    canvasCtx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);
                    x += barWidth + barSpacing;
                }
            } else if (volumeRef?.current !== undefined) {
                const volume = Math.min(volumeRef.current * 10, 1.0); // Amplify and clamp
                
                for (let i = 0; i < barCount; i++) {
                    // Create a symmetric, "bouncing from center" effect
                    const barIndexFactor = Math.abs(i - (barCount / 2) + 0.5) / (barCount / 2);
                    const heightMultiplier = 1.0 - barIndexFactor;
                    const barHeight = Math.max(2, volume * heightMultiplier * canvas.height * (0.8 + Math.random() * 0.4));
                    canvasCtx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);
                    x += barWidth + barSpacing;
                }
            }
        };

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                canvas.width = width;
                canvas.height = height;
            }
            if (!animationFrameId.current) {
                draw();
            }
        });
        resizeObserver.observe(canvas);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = undefined;
            }
            resizeObserver.disconnect();
        };
    }, [analyserNode, volumeRef, barCount, barColor]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

interface LivePracticeProps {
    onClose: () => void;
}

const LivePractice: React.FC<LivePracticeProps> = ({ onClose }) => {
    const sessionPromise = useRef<Promise<LiveSession> | null>(null);
    const [view, setView] = useState<'lobby' | 'practice'>('lobby');
    const [isConnecting, setIsConnecting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptionHistory, setTranscriptionHistory] = useState<Transcription[]>([]);
    const [liveTranscript, setLiveTranscript] = useState<{sender: 'user' | 'ai', text: string} | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [sessionTime, setSessionTime] = useState(0);
    const [continuableSessions, setContinuableSessions] = useState<ContinuableSession[]>([]);
    const [activeSession, setActiveSession] = useState<ContinuableSession | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    // Refs for state to avoid stale closures in callbacks and cleanup
    const transcriptionHistoryRef = useRef(transcriptionHistory);
    useEffect(() => { transcriptionHistoryRef.current = transcriptionHistory; }, [transcriptionHistory]);
    const liveTranscriptRef = useRef(liveTranscript);
    useEffect(() => { liveTranscriptRef.current = liveTranscript; }, [liveTranscript]);
    const activeSessionRef = useRef(activeSession);
    useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

    const inputAudioContext = useRef<AudioContext>();
    const outputAudioContext = useRef<AudioContext>();
    const scriptProcessor = useRef<ScriptProcessorNode>();
    const mediaStream = useRef<MediaStream>();
    const mediaStreamSource = useRef<MediaStreamAudioSourceNode>();
    const nextStartTime = useRef(0);
    const sources = useRef(new Set<AudioBufferSourceNode>());
    const timerIntervalRef = useRef<number | null>(null);
    const userVolumeRef = useRef(0);
    const aiAnalyserRef = useRef<AnalyserNode | null>(null);
    
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);
    
     useEffect(() => {
        try {
            const savedSessions = localStorage.getItem(CONTINUABLE_SESSIONS_KEY);
            if (savedSessions) {
                let sessions: ContinuableSession[] = JSON.parse(savedSessions);
                 // Data migration for old sessions without a name
                sessions = sessions.map(s => ({
                    ...s,
                    name: s.name || `অনুশীলন সেশন`
                }));
                sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setContinuableSessions(sessions);
            }
        } catch (e) {
            console.error("Failed to parse continuable sessions", e);
        }
    }, []);

    const addTranscription = useCallback((sender: 'user' | 'ai' | 'status', text: string) => {
        if (!text.trim()) return;
        setTranscriptionHistory(prev => [...prev, {id: Date.now() + Math.random(), sender, text}]);
    }, []);

    const endSession = useCallback((options: { isUnmounting?: boolean, skipSave?: boolean } = {}) => {
        const { isUnmounting = false, skipSave = false } = options;
    
        setIsPaused(false);
        isPausedRef.current = false;
        
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    
        userVolumeRef.current = 0;
        aiAnalyserRef.current = null;
    
        if (sessionPromise.current) {
            sessionPromise.current.then(session => session.close()).catch(e => console.error(e));
            sessionPromise.current = null;
        }
    
        mediaStream.current?.getTracks().forEach(track => track.stop());
        // FIX: Removed disconnect calls for the deprecated ScriptProcessorNode.
        // The errors "Expected 1 arguments, but got 0" are likely due to parser confusion with this API.
        // Stopping tracks and closing contexts is sufficient for cleanup.
        if (inputAudioContext.current?.state !== 'closed') inputAudioContext.current?.close().catch(e => console.error(e));
        if (outputAudioContext.current?.state !== 'closed') outputAudioContext.current?.close().catch(e => console.error(e));
        
        const wasActive = !!activeSessionRef.current;
        setIsConnecting(false);
    
        const finalHistory = [...transcriptionHistoryRef.current];
        if (liveTranscriptRef.current && liveTranscriptRef.current.text.trim()) {
            finalHistory.push({
                id: Date.now() + Math.random(),
                sender: liveTranscriptRef.current.sender,
                text: liveTranscriptRef.current.text.trim()
            });
        }
    
        if (isUnmounting && wasActive && !skipSave) {
            if (finalHistory.filter(t => t.sender !== 'status').length > 0) {
                 try {
                    const savedSessions = localStorage.getItem(CONTINUABLE_SESSIONS_KEY);
                    const sessions: ContinuableSession[] = savedSessions ? JSON.parse(savedSessions) : [];
                    
                    const currentSession = activeSessionRef.current;
                    const existingSessionIndex = currentSession ? sessions.findIndex(s => s.id === currentSession.id) : -1;

                    if (existingSessionIndex > -1) {
                        sessions[existingSessionIndex] = { ...sessions[existingSessionIndex], transcript: finalHistory, date: new Date().toISOString() };
                    } else {
                        sessions.push({ id: Date.now(), name: "অনুশীলন সেশন", date: new Date().toISOString(), transcript: finalHistory });
                    }
                    localStorage.setItem(CONTINUABLE_SESSIONS_KEY, JSON.stringify(sessions));
                } catch (e) {
                    console.error("Failed to auto-save session", e);
                }
            }
            return;
        }
        
        setLiveTranscript(null);
        setActiveSession(null);
        setView('lobby'); // Go back to lobby after session ends
    }, []);

    useEffect(() => {
        return () => {
           if (activeSessionRef.current) {
               endSession({ isUnmounting: true });
           } else if (sessionPromise.current) {
               sessionPromise.current.then(s => s.close()).catch(console.error);
           }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeSession && !isPaused) {
            timerIntervalRef.current = window.setInterval(() => {
                setSessionTime(prevTime => prevTime + 1);
            }, 1000);
        }
        
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [activeSession, isPaused]);
    
    const constructSystemInstruction = (history: Transcription[]): string => {
        if (history.length === 0) {
            return SYSTEM_INSTRUCTION;
        }

        const historyPreamble = history
            .filter(item => item.sender === 'user' || item.sender === 'ai')
            .map(item => `${item.sender === 'ai' ? 'Alex' : 'Student'}: ${item.text}`)
            .join('\n');
        
        return `Here is the summary of your previous conversation with the student. Use this context to continue the conversation naturally, remember what you've discussed, and track their progress.
--- PREVIOUS CONVERSATION ---
${historyPreamble}
--- END OF PREVIOUS CONVERSATION ---

Now, continue the conversation based on this history.

${SYSTEM_INSTRUCTION}`;
    };


    const startSession = async (sessionToStart: ContinuableSession) => {
        setSessionTime(0);
        setIsConnecting(true);
        setError(null);
        setActiveSession(sessionToStart);
        setTranscriptionHistory(sessionToStart.transcript);
        setLiveTranscript(null);
        setIsPaused(false);
        setView('practice');

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("আপনার ব্রাউজার মাইক্রোফোন সমর্থন করে না।");
            }

            mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const analyser = outputAudioContext.current.createAnalyser();
            analyser.fftSize = 256;
            aiAnalyserRef.current = analyser;

            const finalSystemInstruction = constructSystemInstruction(sessionToStart.transcript);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const newSessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        const source = inputAudioContext.current!.createMediaStreamSource(mediaStream.current!);
                        mediaStreamSource.current = source;
                        
                        const processor = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.current = processor;

                        processor.onaudioprocess = (audioProcessingEvent) => {
                            if (isPausedRef.current) {
                                userVolumeRef.current = 0;
                                return;
                            }
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

                            let sum = 0.0;
                            for (let i = 0; i < inputData.length; ++i) {
                                sum += inputData[i] * inputData[i];
                            }
                            userVolumeRef.current = Math.sqrt(sum / inputData.length);

                            const pcmBlob = createBlob(inputData);
                            if (sessionPromise.current) {
                                sessionPromise.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        source.connect(processor);
                        processor.connect(inputAudioContext.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        let turnCommittedOnSwitch = false;

                        if (message.serverContent?.outputTranscription) {
                            const textChunk = message.serverContent.outputTranscription.text;
                            setLiveTranscript(prev => {
                                if (prev && prev.sender === 'user') {
                                    addTranscription('user', prev.text);
                                    addPoints(5);
                                    turnCommittedOnSwitch = true;
                                    return { sender: 'ai', text: textChunk };
                                }
                                const newText = (prev?.sender === 'ai' ? prev.text : '') + textChunk;
                                return { sender: 'ai', text: newText };
                            });
                        } else if (message.serverContent?.inputTranscription) {
                             const textChunk = message.serverContent.inputTranscription.text;
                             setLiveTranscript(prev => {
                                 if (prev && prev.sender === 'ai') {
                                     addTranscription('ai', prev.text);
                                     turnCommittedOnSwitch = true;
                                     return { sender: 'user', text: textChunk };
                                 }
                                 const newText = (prev?.sender === 'user' ? prev.text : '') + textChunk;
                                 return { sender: 'user', text: newText };
                             });
                        }

                        if (message.serverContent?.turnComplete) {
                           setLiveTranscript(prev => {
                                if (prev && prev.text && !turnCommittedOnSwitch) {
                                    addTranscription(prev.sender, prev.text);
                                    if(prev.sender === 'user') addPoints(5);
                                }
                                return null;
                           });
                        }
                        
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64EncodedAudioString && outputAudioContext.current && aiAnalyserRef.current) {
                            nextStartTime.current = Math.max(
                                nextStartTime.current,
                                outputAudioContext.current.currentTime,
                            );
                            const audioBuffer = await decodeAudioData(
                                decode(base64EncodedAudioString),
                                outputAudioContext.current,
                                24000,
                                1,
                            );
                            const source = outputAudioContext.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(aiAnalyserRef.current);
                            aiAnalyserRef.current.connect(outputAudioContext.current.destination);

                            source.addEventListener('ended', () => {
                                sources.current.delete(source);
                            });

                            source.start(nextStartTime.current);
                            nextStartTime.current = nextStartTime.current + audioBuffer.duration;
                            sources.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sources.current.values()) {
                                source.stop();
                                sources.current.delete(source);
                            }
                            nextStartTime.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Session error:", e);
                        setError(`সংযোগ ত্রুটি। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।`);
                        endSession({ skipSave: true });
                    },
                    onclose: (e: CloseEvent) => {
                       if (activeSessionRef.current) {
                           endSession();
                       }
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: finalSystemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
            sessionPromise.current = newSessionPromise;

        } catch (err: any) {
            console.error("Failed to start session:", err);
            setError(`সেশন শুরু করতে ব্যর্থ: ${err.message}`);
            setIsConnecting(false);
            mediaStream.current?.getTracks().forEach(track => track.stop());
            setView('lobby');
        }
    };
    
    const handleContinueSession = (id: number) => {
        const session = continuableSessions.find(s => s.id === id);
        if (session) {
            startSession(session);
        }
    };
    
    const handleStartNewSession = () => {
        const newSession: ContinuableSession = {
            id: Date.now(),
            name: 'নতুন অনুশীলন সেশন',
            date: new Date().toISOString(),
            transcript: [],
        };
        startSession(newSession);
    };

    const handleDeleteSession = (id: number) => {
        if (window.confirm("আপনি কি নিশ্চিতভাবে এই সেশনটি মুছে ফেলতে চান?")) {
            const updatedSessions = continuableSessions.filter(s => s.id !== id);
            setContinuableSessions(updatedSessions);
            localStorage.setItem(CONTINUABLE_SESSIONS_KEY, JSON.stringify(updatedSessions));
        }
    };
    
    const handleRenameSession = (session: ContinuableSession) => {
        setEditingSessionId(session.id);
        setEditingName(session.name);
    };

    const handleConfirmRename = () => {
        if (!editingSessionId || !editingName.trim()) {
            setEditingSessionId(null); // Cancel if name is empty
            return;
        }
        const updatedSessions = continuableSessions.map(s =>
            s.id === editingSessionId ? { ...s, name: editingName.trim() } : s
        );
        setContinuableSessions(updatedSessions);
        localStorage.setItem(CONTINUABLE_SESSIONS_KEY, JSON.stringify(updatedSessions));
        setEditingSessionId(null);
        setEditingName('');
    };

    const handleSave = () => {
        setIsSaving(true);
        const finalTranscript = [...transcriptionHistoryRef.current];
        if(liveTranscriptRef.current?.text) {
            finalTranscript.push({ ...liveTranscriptRef.current, id: Date.now() });
        }

        saveConversation({ type: 'speak', transcript: finalTranscript });
        incrementSpeakingSessions();
        updateStreak();
        
        const savedSessions = localStorage.getItem(CONTINUABLE_SESSIONS_KEY);
        const sessions: ContinuableSession[] = savedSessions ? JSON.parse(savedSessions) : [];
        const currentSession = activeSessionRef.current;
        const existingSessionIndex = currentSession ? sessions.findIndex(s => s.id === currentSession.id) : -1;

        const sessionToSave = {
            ...(currentSession as ContinuableSession),
            transcript: finalTranscript,
            date: new Date().toISOString(),
        };

        if (existingSessionIndex > -1) {
            sessions[existingSessionIndex] = sessionToSave;
        } else {
            sessions.push(sessionToSave);
        }
        localStorage.setItem(CONTINUABLE_SESSIONS_KEY, JSON.stringify(sessions));

        setTimeout(() => {
            setIsSaving(false);
            setShowSaveModal(false);
            endSession({ skipSave: true }); 
            onClose();
        }, 1000);
    };

    const handleDiscard = () => {
        setShowSaveModal(false);
        endSession({ skipSave: true });
        onClose();
    };

    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        transcriptContainerRef.current?.scrollTo(0, transcriptContainerRef.current.scrollHeight);
    }, [transcriptionHistory, liveTranscript]);

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const renderLobby = () => (
        <div className="flex-1 flex flex-col p-4">
            <div className="text-center mb-6">
                <i className="fa-solid fa-microphone-lines text-5xl text-cyan-500 mb-4"></i>
                <h2 className="text-2xl font-bold">স্পিকিং অনুশীলন</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">একটি নতুন সেশন শুরু করুন অথবা আগের আলোচনা থেকে চালিয়ে যান।</p>
            </div>
            <button
                onClick={handleStartNewSession}
                className="w-full mb-6 px-8 py-4 bg-cyan-600 text-white text-lg font-bold rounded-lg shadow-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all transform hover:scale-105"
            >
                 <i className="fa-solid fa-plus mr-2"></i>
                 নতুন সেশন শুরু করুন
            </button>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {continuableSessions.length > 0 ? continuableSessions.map(session => (
                    <div key={session.id} className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg flex items-center justify-between">
                        {editingSessionId === session.id ? (
                            <div className="flex-1 mr-2">
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={handleConfirmRename}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirmRename();
                                        if (e.key === 'Escape') setEditingSessionId(null);
                                    }}
                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">
                                    {session.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                   {new Date(session.date).toLocaleString()}
                                </p>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                             <button onClick={() => handleContinueSession(session.id)} className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors" aria-label="Continue Session">
                                <i className="fa-solid fa-play"></i>
                            </button>
                             <button onClick={() => handleRenameSession(session)} className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors" aria-label="Rename Session">
                                <i className="fa-solid fa-pencil"></i>
                            </button>
                             <button onClick={() => handleDeleteSession(session.id)} className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors" aria-label="Delete Session">
                                <i className="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10">
                        <p className="text-slate-500 dark:text-slate-400">আপনার কোনো চলমান সেশন নেই।</p>
                    </div>
                )}
            </div>
        </div>
    );
    
    const renderPractice = () => (
        <>
            <div ref={transcriptContainerRef} className="relative flex-1 p-4 overflow-y-auto space-y-4">
                 {isPaused && (
                    <div className="absolute inset-0 bg-slate-100/80 dark:bg-slate-900/80 z-10 flex flex-col justify-center items-center backdrop-blur-sm">
                        <i className="fa-solid fa-pause text-5xl text-amber-500 mb-4"></i>
                        <p className="text-xl font-bold">Session Paused</p>
                    </div>
                )}
                {transcriptionHistory.map((item) => (
                     item.sender === 'status' ? (
                        <p key={item.id} className="text-center text-xs text-slate-500 dark:text-slate-400 italic">{item.text}</p>
                     ) : (
                        <div key={item.id} className={`flex items-start gap-3 ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {item.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><i className="fa-solid fa-robot"></i></div>}
                            <div className={`max-w-md rounded-lg p-3 text-sm whitespace-pre-wrap ${item.sender === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                {item.text}
                            </div>
                            {item.sender === 'user' && <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white flex-shrink-0"><i className="fa-solid fa-user"></i></div>}
                        </div>
                     )
                ))}
                {liveTranscript && (
                     <div className={`flex items-start gap-3 ${liveTranscript.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {liveTranscript.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><i className="fa-solid fa-robot"></i></div>}
                        <div className={`max-w-md rounded-lg p-3 text-sm whitespace-pre-wrap ${liveTranscript.sender === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'} opacity-80`}>
                           <div className="flex items-center gap-2">
                                <div className="w-10 h-5 flex-shrink-0">
                                    {liveTranscript.sender === 'user' && (
                                        <AudioVisualizer volumeRef={userVolumeRef} barColor="white" barCount={12} />
                                    )}
                                    {liveTranscript.sender === 'ai' && (
                                        <AudioVisualizer analyserNode={aiAnalyserRef.current} barColor="rgb(99 102 241)" barCount={12} />
                                    )}
                                </div>
                                <span>{liveTranscript.text || '...'}</span>
                            </div>
                        </div>
                        {liveTranscript.sender === 'user' && <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white flex-shrink-0"><i className="fa-solid fa-user"></i></div>}
                    </div>
                )}
                {transcriptionHistory.filter(t => t.sender === 'user' || t.sender === 'ai').length === 0 && !liveTranscript && (
                    <div className="flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 pt-16">
                        <div className="w-24 h-8 mb-4">
                             <AudioVisualizer volumeRef={userVolumeRef} barColor="#2dd4bf" />
                        </div>
                        <p>শুনছি... কথা বলা শুরু করুন।</p>
                    </div>
                )}
            </div>
             <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-green-500">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                            <span>লাইভ: {formatTime(sessionTime)}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsPaused(prev => !prev)}
                        className={`w-10 h-10 rounded-full text-white text-lg flex items-center justify-center shadow-md transition-colors transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${isPaused ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400'}`}
                        aria-label={isPaused ? 'Resume Session' : 'Pause Session'}
                    >
                        <i className={`fa-solid ${isPaused ? 'fa-play pl-0.5' : 'fa-pause'}`}></i>
                    </button>
                </div>
                <button
                    onClick={() => setShowSaveModal(true)}
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
                >
                    <i className="fa-solid fa-phone-slash mr-2"></i>
                    সেশন শেষ করুন
                </button>
            </div>
        </>
    );

    const renderConnecting = () => (
         <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-4 text-slate-500 dark:text-slate-400">সংযোগ করা হচ্ছে...</p>
        </div>
    );
    
    const renderError = () => (
         <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <i className="fa-solid fa-circle-exclamation text-3xl text-red-500"></i>
            </div>
             <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">একটি সমস্যা হয়েছে</h3>
             <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">{error}</p>
             <button
                onClick={() => {
                    setError(null);
                    setView('lobby');
                }}
                className="px-6 py-2 bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:bg-amber-700"
             >
                লবিতে ফিরে যান
            </button>
         </div>
    );

    const renderContent = () => {
        if (error) return renderError();
        if (isConnecting) return renderConnecting();
        if (view === 'practice') return renderPractice();
        return renderLobby();
    }

    return (
        <div className="flex flex-col h-[70vh]">
            {renderContent()}
            <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="সেশনটি সংরক্ষণ করবেন?">
                <p className="text-slate-600 dark:text-slate-400 mb-6">আপনি কি এই কথোপকথনটি পর্যালোচনা করার জন্য সংরক্ষণ করতে চান?</p>
                <div className="flex justify-end gap-4">
                     <button onClick={handleDiscard} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500">
                        বাতিল করুন
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isSaving ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default LivePractice;
