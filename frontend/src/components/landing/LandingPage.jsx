// frontend/src/components/landing/LandingPage.jsx
// Modern luxury AI showcase & chat landing page for unauthenticated users.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Mic, Sparkles, Loader2, BookOpen, Brain, Zap, CheckCircle2 } from 'lucide-react';
import { renderMarkdown } from '../../utils/markdownUtils';
import toast from 'react-hot-toast';

// ─── Modern Top Nav ──────────────────────────────────────
function LandingNav({ onLoginClick }) {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-8 bg-[#090d16]/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/40">
            {/* Brand */}
            <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => window.location.reload()}>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/30 group-hover:shadow-indigo-500/60 transition-all duration-300">
                    <div className="w-full h-full bg-[#0d1322] rounded-[10px] flex items-center justify-center">
                        <Sparkles size={15} className="text-cyan-400" />
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                        iMentor
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        AI
                    </span>
                </div>
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onLoginClick(true)}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white border border-slate-700/80 rounded-xl hover:bg-white/5 transition-all shadow-sm"
                >
                    Sign In
                </button>
                <button
                    onClick={() => onLoginClick(false)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-xl shadow-md shadow-indigo-500/25 hover:opacity-95 hover:scale-102 active:scale-98 transition-all"
                >
                    Sign Up
                </button>
            </div>
        </nav>
    );
}

// ─── Single chat bubble ───────────────────────────────────
function ChatBubble({ role, text }) {
    const isUser = role === 'user';
    const isEmpty = !text || text.trim() === '';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full animate-fadeIn`}>
            <div
                className={`max-w-[80%] md:max-w-[65%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white rounded-tr-sm shadow-lg shadow-indigo-950/40 border border-indigo-400/30'
                        : 'bg-[#0f172a]/95 text-slate-100 border border-slate-700/60 rounded-tl-sm shadow-xl shadow-black/40 backdrop-blur-md'
                }`}
            >
                {isEmpty ? (
                    <span className="flex items-center gap-2 text-slate-400">
                        <Loader2 size={15} className="animate-spin text-indigo-400" />
                        iMentor is thinking...
                    </span>
                ) : isUser ? (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
                ) : (
                    <div
                        className="prose prose-invert prose-sm max-w-none text-slate-100 leading-relaxed"
                        dangerouslySetInnerHTML={renderMarkdown(text)}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Landing page component ───────────────────────────────
function LandingPage({ onLoginClick }) {
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [showAuthHint, setShowAuthHint] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [guestMessageCount, setGuestMessageCount] = useState(0);
    const textareaRef = useRef(null);
    const chatEndRef  = useRef(null);
    const abortRef    = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
        }
    }, [inputValue]);

    // Scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = useCallback(async (customQuery) => {
        const queryToSend = typeof customQuery === 'string' ? customQuery : inputValue.trim();
        if (!queryToSend || isStreaming) return;

        const userMsg = { role: 'user', text: queryToSend };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsStreaming(true);

        // Add a placeholder bot message for streaming
        const botIdx = Date.now();
        setMessages(prev => [...prev, { role: 'assistant', text: '', _streamId: botIdx }]);

        // Abort any previous request
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
            const res = await fetch(`${apiBase}/guest/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryToSend }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server error: ${res.status}`);
            }

            // Parse SSE stream
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finalText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let idx;
                while ((idx = buffer.indexOf('\n\n')) !== -1) {
                    const chunk = buffer.slice(0, idx).trim();
                    buffer = buffer.slice(idx + 2);
                    if (!chunk.startsWith('data: ')) continue;

                    try {
                        const event = JSON.parse(chunk.slice(6));
                        if (event.type === 'token' && event.content) {
                            // Streaming token — append to the bot message
                            finalText += event.content;
                            const currentText = finalText;
                            setMessages(prev =>
                                prev.map(m => m._streamId === botIdx ? { ...m, text: currentText } : m)
                            );
                        } else if (event.type === 'final_answer' && event.content) {
                            // Final answer — replace bot message with full text
                            const fullText = event.content.text || finalText;
                            setMessages(prev =>
                                prev.map(m => m._streamId === botIdx ? { ...m, text: fullText, _streamId: undefined } : m)
                            );
                            finalText = fullText;
                        }
                    } catch (_) { /* skip malformed */ }
                }
            }

            // If we somehow got no text, use what we accumulated
            if (!finalText) {
                setMessages(prev =>
                    prev.map(m => m._streamId === botIdx
                        ? { ...m, text: "I couldn't generate a response. Please try again!", _streamId: undefined }
                        : m
                    )
                );
            }

            // Show sign-in hint after a few messages
            const newCount = guestMessageCount + 1;
            setGuestMessageCount(newCount);
            if (newCount >= 3) {
                setShowAuthHint(true);
            }

        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Guest chat error:', err);
            setMessages(prev =>
                prev.map(m => m._streamId === botIdx
                    ? { ...m, text: err.message || 'Something went wrong. Please try again!', _streamId: undefined }
                    : m
                )
            );
        } finally {
            setIsStreaming(false);
        }
    }, [inputValue, isStreaming, guestMessageCount]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="relative flex flex-col h-screen bg-[#090d16] text-white overflow-hidden">
            <LandingNav onLoginClick={onLoginClick} />

            {/* Ambient Background Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-cyan-500/15 blur-[140px] rounded-full" />
            </div>

            {/* Chat area */}
            <div className="relative z-10 flex-1 overflow-y-auto pt-20 pb-4 px-4 sm:px-8 md:px-16 lg:px-32 custom-scrollbar">
                {messages.length === 0 ? (
                    /* Hero / Empty state */
                    <div className="flex flex-col items-center justify-center min-h-[75vh] gap-6 text-center select-none py-6">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium shadow-sm backdrop-blur-md">
                            <Sparkles size={13} className="text-indigo-400 animate-pulse" />
                            <span>Next-Gen Autonomous AI Learning Platform</span>
                        </div>

                        <div className="space-y-3 max-w-xl mx-auto">
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent leading-tight">
                                Master Any Subject with iMentor AI
                            </h1>
                            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                                Personalized Socratic tutoring, deep academic research, and syllabus-linked concept mapping designed for higher education.
                            </p>
                        </div>

                        {/* Starter Prompt Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mt-4">
                            {[
                                { title: 'Explain neural networks', desc: 'Break down layers, activations, and backprop', icon: Brain },
                                { title: 'Help me study calculus', desc: 'Step-by-step limits, derivatives & integrals', icon: BookOpen },
                                { title: 'What is Big-O notation?', desc: 'Time & space complexity with code examples', icon: Zap },
                                { title: 'How does Transformer self-attention work?', desc: 'Query, Key, Value vectors explained intuitively', icon: Sparkles },
                            ].map(({ title, desc, icon: Icon }) => (
                                <button
                                    key={title}
                                    onClick={() => handleSend(title)}
                                    className="group text-left p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-indigo-500/50 shadow-md hover:shadow-indigo-500/10 transition-all duration-200 hover:-translate-y-0.5 backdrop-blur-md"
                                >
                                    <div className="flex items-center gap-2.5 mb-1 text-indigo-400 group-hover:text-indigo-300">
                                        <Icon size={14} />
                                        <span className="text-xs font-semibold text-white group-hover:text-indigo-200">{title}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal line-clamp-1">{desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Message list */
                    <div className="flex flex-col gap-4 max-w-3xl mx-auto py-6">
                        {messages.map((msg, i) => (
                            <ChatBubble key={i} role={msg.role} text={msg.text} />
                        ))}

                        {/* Gentle sign-in suggestion after a few messages */}
                        {showAuthHint && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 shadow-lg backdrop-blur-md">
                                <div className="text-center sm:text-left">
                                    <h4 className="text-sm font-semibold text-white flex items-center justify-center sm:justify-start gap-1.5">
                                        <Sparkles size={15} className="text-indigo-400" /> Unlock the Full Power of iMentor
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5">Access Socratic Tutor Mode, courses, saved sessions, and interactive skill trees.</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => onLoginClick(true)}
                                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 rounded-lg hover:bg-white/5 transition-all"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={() => onLoginClick(false)}
                                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-sm hover:opacity-95 transition-all"
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </div>

            {/* Input bar */}
            <div className="relative z-10 flex-shrink-0 px-4 sm:px-8 md:px-16 lg:px-32 pb-4 pt-2">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-end gap-2 bg-[#12192d]/90 backdrop-blur-xl border border-white/12 focus-within:border-indigo-500/60 focus-within:shadow-[0_8px_30px_-4px_rgba(99,102,241,0.25)] rounded-2xl px-4 py-2.5 transition-all shadow-xl shadow-black/40">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask iMentor anything about your studies..."
                            rows={1}
                            className="flex-1 bg-transparent text-white text-sm sm:text-base leading-relaxed resize-none min-h-[28px] max-h-36 py-1 border-none outline-none placeholder:text-slate-500"
                        />

                        {/* Mic — available after sign-in */}
                        <button
                            onClick={() => toast('Sign in to use voice input', { icon: '🎙️' })}
                            className="flex-shrink-0 p-2 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
                            title="Voice input — sign in to use"
                            aria-label="Voice input requires sign-in"
                        >
                            <Mic size={18} />
                        </button>

                        {/* Send button */}
                        <button
                            onClick={() => handleSend()}
                            disabled={!inputValue.trim() || isStreaming}
                            className={`flex-shrink-0 p-2.5 rounded-xl transition-all ${
                                inputValue.trim() && !isStreaming
                                    ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 hover:scale-105 active:scale-95'
                                    : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                            }`}
                            title="Send message"
                            aria-label="Send message"
                        >
                            {isStreaming ? <Loader2 size={16} className="animate-spin text-white" /> : <ArrowUp size={16} />}
                        </button>
                    </div>

                    <p className="text-center text-[11px] text-slate-500 mt-2">
                        Ask anything — sign in to unlock Tutor Mode, Deep Research, Knowledge Base, and more.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LandingPage;
