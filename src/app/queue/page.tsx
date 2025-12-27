"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Signal {
    id: string;
    title: string;
    content: string;
    source?: string;
    sourceUrl?: string;
    tags: string[];
    createdAt: string;
}

export default function QueuePage() {
    const router = useRouter();
    const { data, mutate } = useSWR("/api/signals?status=unread&limit=100", fetcher);
    // Track localized queue state
    const [queue, setQueue] = useState<Signal[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [thought, setThought] = useState("");
    const [processing, setProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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

    async function handleReview(action: "comment" | "skip") {
        if (!currentSignal) return;

        setProcessing(true);
        const signalId = currentSignal.id;

        // Optimistic update: Move to next immediately
        setCurrentIndex((prev) => prev + 1);
        setThought("");
        setProcessing(false);

        try {
            // Persist to DB in background
            await fetch("/api/signals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: signalId,
                    status: action === "comment" ? "reviewed" : "archived",
                    thought: action === "comment" ? thought : undefined,
                }),
            });
            // Revalidate SWR silently to keep cache relatively fresh
            mutate();
        } catch (error) {
            console.error("Failed to review signal:", error);
            // In a real app, we might revert the index or show a toaster
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (isFinished) return;

            // CMD+Enter or Enter (if input focused) -> Submit
            if (e.key === "Enter" && !e.shiftKey) {
                if (thought.trim()) {
                    handleReview("comment");
                } else {
                    // Empty enter -> treat as keep/reviewed without comment? or block?
                    // User requirement: "Once commented or skipped". 
                    // Let's assume Enter with empty text = Reviewed (no comment)
                    handleReview("comment");
                }
            }

            // Escape -> Skip
            if (e.key === "Escape") {
                handleReview("skip");
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [thought, isFinished, currentIndex]); // potential perf issue if logic complex, but okay here

    async function handleFinishSession() {
        setProcessing(true);
        try {
            // Trigger auto-clustering
            await fetch("/api/cluster", { method: "POST" });
            router.push("/insights");
        } catch (error) {
            console.error("Failed to cluster:", error);
            setProcessing(false);
        }
    }

    if (!data) return <div className="p-8 text-center text-[var(--text-secondary)]">Loading queue...</div>;

    if (queue.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="text-6xl">🎉</div>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">You're all caught up!</h1>
                <p className="text-[var(--text-secondary)]">No unread signals in your queue.</p>
                <Link href="/" className="btn btn-secondary">Back to Inbox</Link>
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
                    disabled={processing}
                    className="btn btn-primary btn-lg w-64"
                >
                    {processing ? "Clustering..." : "Finish & Process Insights"}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            {/* Header / Progress */}
            <header className="fixed top-0 left-0 right-0 h-1 bg-[var(--background-elevated)] z-20">
                <div
                    className="h-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">

                {/* Meta Header */}
                <div className="w-full flex justify-between items-center mb-6 text-sm text-[var(--text-secondary)] uppercase tracking-wider">
                    <span>Signal {currentIndex + 1} / {queue.length}</span>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><kbd className="kbd kbd-sm">ESC</kbd> Skip</span>
                        <span className="flex items-center gap-1"><kbd className="kbd kbd-sm">↵</kbd> Comment/Next</span>
                    </div>
                </div>

                {/* Card */}
                <article
                    className="w-full bg-[var(--background-elevated)] border border-[var(--border)] rounded-2xl p-8 shadow-xl mb-8 animate-slideUp"
                    key={currentSignal.id} // separate key to trigger animation
                >
                    {currentSignal.source && (
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-2 py-1 rounded bg-[var(--background)] text-xs text-[var(--text-secondary)] border border-[var(--border)]">
                                {currentSignal.source}
                            </span>
                            {currentSignal.sourceUrl && (
                                <a
                                    href={currentSignal.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[var(--accent)] hover:underline truncate max-w-xs"
                                >
                                    {currentSignal.sourceUrl}
                                </a>
                            )}
                        </div>
                    )}

                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
                        {currentSignal.title}
                    </h2>

                    <div className="prose prose-invert max-w-none text-[var(--text-secondary)] text-lg leading-relaxed max-h-[40vh] overflow-y-auto custom-scrollbar">
                        {currentSignal.content.split('\n').map((line, i) => (
                            <p key={i} className="mb-4">{line}</p>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-2">
                        {currentSignal.tags.map(tag => (
                            <span key={tag} className="text-sm px-3 py-1 rounded-full bg-[var(--background)] text-[var(--text-secondary)]">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </article>

                {/* Input Area */}
                <div className="w-full relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={thought}
                        onChange={(e) => setThought(e.target.value)}
                        placeholder="Add a thought (optional)..."
                        className="w-full bg-transparent text-xl p-4 border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors"
                        autoFocus
                    />
                    <div className="absolute right-0 bottom-4 text-xs text-[var(--text-muted)]">
                        Press Enter via keyboard
                    </div>
                </div>

            </div>
        </div>
    );
}
