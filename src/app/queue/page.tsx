"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppHeader from "@/components/AppHeader";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Signal {
    id: string;
    title: string;
    content: string;
    summary?: string;
    rawContent?: string;
    source?: string;
    sourceUrl?: string;
    tags: string[];
    createdAt: string;
}

export default function QueuePage() {
    const router = useRouter();
    const { data, mutate } = useSWR("/api/signals?status=unread&limit=100", fetcher);

    const [queue, setQueue] = useState<Signal[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [thought, setThought] = useState("");
    const [processing, setProcessing] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Sync SWR data to local queue state on first load
    useEffect(() => {
        if (data?.signals && queue.length === 0) {
            setQueue(data.signals);
        }
    }, [data, queue.length]);

    const currentSignal = queue[currentIndex];
    const isFinished = queue.length > 0 && currentIndex >= queue.length;

    // Progress calculation
    const progress = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0;

    // Focus input on signal change
    useEffect(() => {
        if (currentSignal && inputRef.current) {
            inputRef.current.focus();
        }
    }, [currentIndex, currentSignal]);

    async function handleAction(action: "reviewed" | "archived" | "skip") {
        if (!currentSignal) return;

        setProcessing(true);
        const signalId = currentSignal.id;

        // Optimistic update: Move to next immediately
        setCurrentIndex((prev) => prev + 1);
        const thoughtToSave = thought.trim();
        setThought("");
        setProcessing(false);

        if (action === "skip") {
            // Don't persist anything, just move on
            return;
        }

        try {
            // Persist to DB in background
            await fetch("/api/signals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: signalId,
                    status: action,
                    thought: thoughtToSave || undefined,
                }),
            });
            mutate();
        } catch (error) {
            console.error("Failed to update signal:", error);
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (isFinished) return;

            // CMD/Ctrl + Enter -> Mark as reviewed with thought
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleAction("reviewed");
            }

            // Escape -> Skip (don't save anything)
            if (e.key === "Escape") {
                e.preventDefault();
                handleAction("skip");
            }

            // CMD/Ctrl + Backspace -> Archive/Remove
            if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") {
                e.preventDefault();
                handleAction("archived");
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [thought, isFinished, currentIndex]);

    async function handleFinishSession() {
        setProcessing(true);
        // Generation now happens per-signal during handleAction
        router.push("/insights");
    }

    if (!data) return <div className="p-8 text-center text-[var(--text-secondary)]">Loading queue...</div>;

    if (queue.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="text-6xl">🎉</div>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">You're all caught up!</h1>
                <p className="text-[var(--text-secondary)]">No unread signals in your queue.</p>
                <button onClick={() => router.push("/insights")} className="btn btn-secondary">
                    View Insights
                </button>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 animate-fadeIn">
                <div className="text-6xl">✨</div>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Session Complete</h1>
                <p className="text-[var(--text-secondary)]">You've reviewed {queue.length} signals.</p>
                <button
                    onClick={handleFinishSession}
                    className="btn btn-primary btn-lg w-64"
                >
                    View Insights
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <AppHeader />

            {/* Header / Progress */}
            <header className="sticky top-16 left-0 right-0 h-1 bg-[var(--background-elevated)] z-20">
                <div
                    className="h-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </header>

            <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
                {/* Meta Header */}
                <div className="w-full flex justify-between items-center mb-6 text-sm text-[var(--text-secondary)] uppercase tracking-wider">
                    <span>Signal {currentIndex + 1} / {queue.length}</span>
                    <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1"><kbd className="kbd kbd-sm">ESC</kbd> Skip</span>
                        <span className="flex items-center gap-1"><kbd className="kbd kbd-sm">⌘⏎</kbd> Review</span>
                        <span className="flex items-center gap-1"><kbd className="kbd kbd-sm">⌘⌫</kbd> Archive</span>
                    </div>
                </div>

                {/* Card */}
                <article
                    className="w-full bg-[var(--background-elevated)] border border-[var(--border)] rounded-2xl p-8 shadow-xl mb-6 animate-slideUp overflow-hidden"
                    key={currentSignal.id}
                >
                    {/* Source Info */}
                    {(currentSignal.source || currentSignal.sourceUrl) && (
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border)]">
                            {currentSignal.source && (
                                <span className="px-2 py-1 rounded bg-[var(--background)] text-xs text-[var(--text-secondary)] border border-[var(--border)]">
                                    {currentSignal.source}
                                </span>
                            )}
                            {currentSignal.sourceUrl && (
                                <a
                                    href={currentSignal.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[var(--accent)] hover:underline truncate max-w-md"
                                >
                                    {currentSignal.sourceUrl}
                                </a>
                            )}
                        </div>
                    )}

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
                        {currentSignal.title}
                    </h2>

                    {/* Summary (Collapsible) */}
                    {currentSignal.summary && (
                        <div className="mb-6 pb-6 border-b border-[var(--border)]">
                            <details className="group">
                                <summary className="list-none cursor-pointer flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-3">
                                    <svg
                                        className="w-4 h-4 transition-transform group-open:rotate-90"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    View AI Summary
                                </summary>
                                <div className="prose prose-base dark:prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed pl-6">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {currentSignal.summary}
                                    </ReactMarkdown>
                                </div>
                            </details>
                        </div>
                    )}

                    {/* Main Content Body */}
                    <div className="prose prose-lg dark:prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed mb-6">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {currentSignal.content}
                        </ReactMarkdown>
                    </div>



                    {/* Tags */}
                    {currentSignal.tags.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-wrap gap-2">
                            {currentSignal.tags.map(tag => (
                                <span key={tag} className="text-sm px-3 py-1 rounded-full bg-[var(--background)] text-[var(--text-secondary)]">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </article>

                {/* Thought Input Area */}
                <div className="w-full bg-[var(--background-elevated)] border border-[var(--border)] rounded-2xl p-6 shadow-xl">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                        Add your thoughts (optional)
                    </label>
                    <textarea
                        ref={inputRef}
                        value={thought}
                        onChange={(e) => setThought(e.target.value)}
                        placeholder="What are you thinking about this signal?"
                        className="w-full bg-[var(--background)] text-base p-4 border border-[var(--border)] rounded-lg focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors resize-none"
                        rows={4}
                        autoFocus
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={() => handleAction("archived")}
                            disabled={processing}
                            className="btn btn-ghost text-[var(--error)] hover:bg-red-500/10"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Archive
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleAction("skip")}
                                disabled={processing}
                                className="btn btn-ghost"
                            >
                                Skip for Now
                            </button>
                            <button
                                onClick={() => handleAction("reviewed")}
                                disabled={processing}
                                className="btn btn-primary"
                            >
                                {thought.trim() ? "Save & Continue" : "Mark Reviewed"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
