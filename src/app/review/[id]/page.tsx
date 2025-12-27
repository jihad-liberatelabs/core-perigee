"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppHeader from "@/components/AppHeader";

interface Signal {
    id: string;
    title: string;
    content: string;
    summary: string | null;
    source: string | null;
    sourceUrl: string | null;
    tags: string[];
    status: string;
    rawContent?: string;
    createdAt: string;
    highlights: Highlight[];
    thoughts: Thought[];
}

interface Highlight {
    id: string;
    text: string;
    note: string | null;
    startPos: number | null;
    endPos: number | null;
    createdAt: string;
}

interface Thought {
    id: string;
    content: string;
    createdAt: string;
}

// Reflection prompts from the PRD
const REFLECTION_PROMPTS = [
    "What stands out here?",
    "Why does this matter to you?",
    "What would you disagree with?",
    "What surprised you here?",
    "What does this change about how you think?",
    "What do most people miss in this conversation?",
    "What is the uncomfortable truth here?",
];

export default function ReviewPage() {
    const params = useParams();
    const router = useRouter();
    const signalId = params.id as string;

    const [signal, setSignal] = useState<Signal | null>(null);
    const [loading, setLoading] = useState(true);
    const [thoughtContent, setThoughtContent] = useState("");
    const [savingThought, setSavingThought] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const [showPrompts, setShowPrompts] = useState(true);
    const [currentPrompt, setCurrentPrompt] = useState(0);

    const fetchSignal = useCallback(async () => {
        try {
            const res = await fetch(`/api/signals/${signalId}`);
            if (!res.ok) {
                router.push("/");
                return;
            }
            const data = await res.json();
            setSignal(data);
        } catch (error) {
            console.error("Failed to fetch signal:", error);
            router.push("/");
        } finally {
            setLoading(false);
        }
    }, [signalId, router]);

    useEffect(() => {
        fetchSignal();
    }, [fetchSignal]);

    useEffect(() => {
        // Rotate prompts
        const interval = setInterval(() => {
            setCurrentPrompt((prev) => (prev + 1) % REFLECTION_PROMPTS.length);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // Handle text selection for highlighting
    function handleMouseUp() {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            setSelectedText(selection.toString().trim());
        }
    }

    async function createHighlight() {
        if (!selectedText || !signal) return;

        try {
            await fetch("/api/highlights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signalId: signal.id,
                    text: selectedText,
                }),
            });
            setSelectedText("");
            window.getSelection()?.removeAllRanges();
            fetchSignal();
        } catch (error) {
            console.error("Failed to create highlight:", error);
        }
    }

    async function deleteHighlight(id: string) {
        try {
            await fetch(`/api/highlights?id=${id}`, { method: "DELETE" });
            fetchSignal();
        } catch (error) {
            console.error("Failed to delete highlight:", error);
        }
    }

    async function saveThought() {
        if (!thoughtContent.trim() || !signal) return;

        setSavingThought(true);
        try {
            await fetch("/api/thoughts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signalId: signal.id,
                    content: thoughtContent.trim(),
                }),
            });
            setThoughtContent("");
            fetchSignal();
        } catch (error) {
            console.error("Failed to save thought:", error);
        } finally {
            setSavingThought(false);
        }
    }

    async function deleteThought(id: string) {
        try {
            await fetch(`/api/thoughts?id=${id}`, { method: "DELETE" });
            fetchSignal();
        } catch (error) {
            console.error("Failed to delete thought:", error);
        }
    }

    async function markReviewed() {
        if (!signal || signal.status === "reviewed") return;

        try {
            await fetch(`/api/signals/${signal.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "reviewed" }),
            });
            fetchSignal();
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    }

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: "var(--background)" }}
            >
                <div className="skeleton w-16 h-16 rounded-full" />
            </div>
        );
    }

    if (!signal) {
        return null;
    }

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ background: "var(--background)" }}
        >
            <AppHeader />

            {/* Main Content Container */}
            <div className="flex-1 flex">
                {/* Main Reading Area */}
                <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <header
                        className="sticky top-0 z-10 border-b px-8 py-4"
                        style={{
                            background: "var(--background)",
                            borderColor: "var(--border)",
                        }}
                    >
                        <div className="max-w-3xl mx-auto flex items-center justify-between">
                            <button
                                onClick={() => router.push("/")}
                                className="btn btn-ghost"
                            >
                                ← Back
                            </button>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`badge badge-${signal.status === "unread" ? "unread" : "draft"}`}
                                >
                                    {signal.status}
                                </span>
                                {signal.status === "unread" && (
                                    <button onClick={markReviewed} className="btn btn-secondary text-sm">
                                        Mark Reviewed
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Content */}
                    <main className="reading-mode" onMouseUp={handleMouseUp}>
                        <article>
                            <header className="mb-8">
                                <h1
                                    className="text-2xl font-semibold mb-2"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    {signal.title}
                                </h1>
                                <div
                                    className="flex items-center gap-4 text-sm"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    {signal.source && <span>{signal.source}</span>}
                                    <span>{new Date(signal.createdAt).toLocaleDateString()}</span>
                                    {signal.sourceUrl && (
                                        <a
                                            href={signal.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline"
                                            style={{ color: "var(--accent)" }}
                                        >
                                            View Source ↗
                                        </a>
                                    )}
                                </div>
                            </header>

                            {/* Summary (Collapsible) */}
                            {signal.summary && (
                                <div className="mb-8 pb-8 border-b" style={{ borderColor: "var(--border)" }}>
                                    <details className="group">
                                        <summary className="list-none cursor-pointer flex items-center gap-2 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity mb-4" style={{ color: "var(--text-secondary)" }}>
                                            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            View AI Summary
                                        </summary>
                                        <div className="prose prose-base dark:prose-invert max-w-none text-[var(--text-secondary)] leading-relaxed pl-6 italic">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {signal.summary}
                                            </ReactMarkdown>
                                        </div>
                                    </details>
                                </div>
                            )}

                            <div
                                className="prose prose-lg dark:prose-invert max-w-none"
                                style={{
                                    color: "var(--text-primary)",
                                    lineHeight: 1.8,
                                }}
                            >
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {signal.content}
                                </ReactMarkdown>
                            </div>

                            {/* Raw Content Toggle */}
                            {signal.rawContent && (
                                <div className="mt-12 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
                                    <details className="group">
                                        <summary className="list-none cursor-pointer flex items-center gap-2 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--text-secondary)" }}>
                                            <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            View Original Source
                                        </summary>
                                        <div
                                            className="mt-4 p-6 rounded-xl bg-[var(--background-hover)] text-sm font-mono overflow-x-auto"
                                            style={{ border: "1px solid var(--border)" }}
                                        >
                                            {signal.rawContent}
                                        </div>
                                    </details>
                                </div>
                            )}

                            {/* Tags */}
                            {signal.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
                                    {signal.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1 rounded-full text-sm"
                                            style={{
                                                background: "var(--background-hover)",
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    </main>

                    {/* Selection Highlight Tooltip */}
                    {selectedText && (
                        <div
                            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 animate-fadeIn"
                            style={{
                                background: "var(--background-elevated)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-lg)",
                                padding: "0.75rem 1rem",
                                boxShadow: "var(--shadow-lg)",
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className="text-sm truncate max-w-40"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    &quot;{selectedText.substring(0, 50)}...&quot;
                                </span>
                                <button onClick={createHighlight} className="btn btn-primary text-sm">
                                    Save Highlight
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedText("");
                                        window.getSelection()?.removeAllRanges();
                                    }}
                                    className="btn btn-ghost text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reflection Prompt */}
                    {showPrompts && (
                        <div
                            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 animate-fadeIn"
                            style={{
                                background: "var(--accent-soft)",
                                border: "1px solid var(--accent-border)",
                                borderRadius: "var(--radius-lg)",
                                padding: "1rem 1.5rem",
                                maxWidth: "400px",
                            }}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <p
                                    className="text-sm italic"
                                    style={{ color: "var(--accent)" }}
                                >
                                    {REFLECTION_PROMPTS[currentPrompt]}
                                </p>
                                <button
                                    onClick={() => setShowPrompts(false)}
                                    className="text-xs opacity-50 hover:opacity-100"
                                    style={{ color: "var(--accent)" }}
                                >
                                    Hide
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Thoughts & Highlights */}
                <aside
                    className="w-96 border-l overflow-y-auto flex flex-col"
                    style={{
                        background: "var(--background-elevated)",
                        borderColor: "var(--border)",
                    }}
                >
                    {/* Thought Input */}
                    <div
                        className="p-6 border-b"
                        style={{ borderColor: "var(--border)" }}
                    >
                        <h2
                            className="text-sm font-medium mb-3"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            Capture Your Thoughts
                        </h2>
                        <textarea
                            value={thoughtContent}
                            onChange={(e) => setThoughtContent(e.target.value)}
                            placeholder="What are you thinking about this?"
                            className="textarea text-sm"
                            rows={4}
                        />
                        <button
                            onClick={saveThought}
                            disabled={!thoughtContent.trim() || savingThought}
                            className="btn btn-primary w-full mt-3"
                            style={{ opacity: !thoughtContent.trim() || savingThought ? 0.6 : 1 }}
                        >
                            {savingThought ? "Saving..." : "Save Thought"}
                        </button>
                    </div>

                    {/* Thoughts List */}
                    <div className="flex-1 p-6">
                        <h3
                            className="text-sm font-medium mb-4"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            Your Thoughts ({signal.thoughts.length})
                        </h3>

                        {signal.thoughts.length === 0 ? (
                            <p
                                className="text-sm italic"
                                style={{ color: "var(--text-muted)" }}
                            >
                                No thoughts captured yet
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {signal.thoughts.map((thought) => (
                                    <div
                                        key={thought.id}
                                        className="p-4 rounded-lg"
                                        style={{
                                            background: "var(--background)",
                                            border: "1px solid var(--border)",
                                        }}
                                    >
                                        <p
                                            className="text-sm whitespace-pre-wrap"
                                            style={{ color: "var(--text-primary)" }}
                                        >
                                            {thought.content}
                                        </p>
                                        <div className="flex items-center justify-between mt-3">
                                            <span
                                                className="text-xs"
                                                style={{ color: "var(--text-muted)" }}
                                            >
                                                {new Date(thought.createdAt).toLocaleString()}
                                            </span>
                                            <button
                                                onClick={() => deleteThought(thought.id)}
                                                className="text-xs hover:underline"
                                                style={{ color: "var(--error)" }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Highlights List */}
                    <div
                        className="p-6 border-t"
                        style={{ borderColor: "var(--border)" }}
                    >
                        <h3
                            className="text-sm font-medium mb-4"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            Highlights ({signal.highlights.length})
                        </h3>

                        {signal.highlights.length === 0 ? (
                            <p
                                className="text-sm italic"
                                style={{ color: "var(--text-muted)" }}
                            >
                                Select text to create highlights
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {signal.highlights.map((highlight) => (
                                    <div
                                        key={highlight.id}
                                        className="p-3 rounded-lg highlight"
                                        style={{
                                            background: "var(--accent-soft)",
                                        }}
                                    >
                                        <p
                                            className="text-sm"
                                            style={{ color: "var(--text-primary)" }}
                                        >
                                            &quot;{highlight.text}&quot;
                                        </p>
                                        <button
                                            onClick={() => deleteHighlight(highlight.id)}
                                            className="text-xs mt-2 hover:underline"
                                            style={{ color: "var(--text-muted)" }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
