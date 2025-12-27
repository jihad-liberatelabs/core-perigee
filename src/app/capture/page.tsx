"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

export default function CapturePage() {
    const router = useRouter();
    const [input, setInput] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        setError("");
        setSubmitting(true);

        try {
            // Detect if it's a URL or text
            const isUrl = /^https?:\/\//i.test(trimmedInput);

            const payload: Record<string, string> = {
                inputType: isUrl ? "url" : "text",
            };

            if (isUrl) {
                payload.url = trimmedInput;
            } else {
                payload.content = trimmedInput;
            }

            const res = await fetch("/api/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to capture signal");
            }

            // Clear form
            setInput("");

            // Show success and redirect to queue
            router.push("/queue");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    // Handle keyboard shortcuts
    function handleKeyDown(e: React.KeyboardEvent) {
        // CMD/Ctrl + Enter to submit
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSubmit(e);
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <AppHeader />

            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4">
                            Capture
                        </h1>
                        <p className="text-xl text-[var(--text-secondary)]">
                            Drop a link, paste text, or share a thought
                        </p>
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Paste a URL or write your thoughts..."
                                rows={8}
                                className="w-full px-6 py-5 bg-[var(--background-elevated)] border-2 border-[var(--border)] rounded-2xl text-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 outline-none transition-all resize-none leading-relaxed"
                                disabled={submitting}
                            />

                            {/* Character count hint */}
                            {input.length > 0 && (
                                <div className="absolute bottom-4 right-4 text-xs text-[var(--text-muted)]">
                                    {input.length} characters
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm animate-fadeIn">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-[var(--text-muted)]">
                                <kbd className="kbd kbd-sm">⌘</kbd> + <kbd className="kbd kbd-sm">↵</kbd> to submit
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !input.trim()}
                                className="px-8 py-4 bg-[var(--accent)] text-white rounded-xl font-medium text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                            >
                                {submitting ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    "Capture Signal"
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Examples */}
                    <div className="mt-12 p-6 bg-[var(--background-elevated)] border border-[var(--border)] rounded-2xl">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 uppercase tracking-wide">
                            Examples
                        </h3>
                        <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                            <div className="flex items-start gap-3">
                                <span className="text-[var(--accent)] font-mono">→</span>
                                <div>
                                    <strong className="text-[var(--text-primary)]">Article:</strong> https://example.com/interesting-article
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-[var(--accent)] font-mono">→</span>
                                <div>
                                    <strong className="text-[var(--text-primary)]">YouTube:</strong> https://youtube.com/watch?v=...
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-[var(--accent)] font-mono">→</span>
                                <div>
                                    <strong className="text-[var(--text-primary)]">Note:</strong> Just had an interesting thought about...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
