"use client";

import { useState } from "react";
import { URL_PATTERN, YOUTUBE_PATTERN } from "@/lib/constants";

/**
 * CaptureBar Component Props
 */
interface CaptureBarProps {
    /** Callback fired when a signal is successfully added */
    onSignalAdded?: () => void;
}

/**
 * CaptureBar Component
 * 
 * Primary input component for capturing signals (thoughts, URLs, YouTube links).
 * Automatically detects input type and sends to the ingestion API.
 * 
 * Features:
 * - Auto-detection of URLs and YouTube links
 * - Visual feedback for loading and success states
 * - Error handling with visual indicators
 * - Async processing with n8n workflow
 */
export default function CaptureBar({ onSignalAdded }: CaptureBarProps) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    /**
     * Handles form submission and content ingestion
     * 
     * Workflow:
     * 1. Detects content type (URL, YouTube, or text)
     * 2. Sends to /api/ingest for processing
     * 3. Updates UI with success/error state
     * 4. Triggers parent refresh callback
     */
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || loading) return;

        setLoading(true);
        setStatus("idle");

        try {
            // Detect input type
            const isUrl = URL_PATTERN.test(input.trim());
            const inputType = isUrl
                ? (YOUTUBE_PATTERN.test(input) ? "youtube" : "url")
                : "text";

            // Build payload based on type
            const payload: Record<string, string> = { inputType };

            if (inputType === "text") {
                payload.content = input.trim();
                // Generate a simple title from first line
                payload.title = input.split('\n')[0].substring(0, 50);
            } else {
                payload.url = input.trim();
            }

            console.log("Capturing:", payload);

            // Send to ingestion API
            const res = await fetch("/api/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to capture");

            // Reset UI and show success
            setInput("");
            setStatus("success");

            // Trigger parent refresh after delay
            setTimeout(() => {
                setStatus("idle");
                onSignalAdded?.();
            }, 2000);

        } catch (error) {
            console.error(error);
            setStatus("error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mb-8 relative z-20">
            <form onSubmit={handleSubmit} className="relative">
                <div
                    className={`
                        relative flex items-center w-full rounded-xl overflow-hidden transition-all duration-200
                        ${status === 'error' ? 'ring-2 ring-[var(--error)]' : 'focus-within:ring-2 focus-within:ring-[var(--accent)]'}
                    `}
                    style={{
                        background: "var(--background-elevated)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-md)"
                    }}
                >
                    {/* Status Icon */}
                    <div className="pl-4 text-[var(--text-muted)]">
                        {loading ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : status === "success" ? (
                            <svg className="h-5 w-5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        )}
                    </div>

                    {/* Input Field */}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Capture a thought, article URL, or YouTube link..."
                        className="w-full bg-transparent border-none py-4 px-4 text-base focus:ring-0 placeholder-[var(--text-muted)]"
                        style={{ color: "var(--text-primary)" }}
                        autoFocus
                    />

                    {/* Submit Button */}
                    <div className="pr-2">
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className={`
                                p-2 rounded-lg transition-all
                                ${input.trim() ? 'opacity-100' : 'opacity-0 scale-95'}
                            `}
                            style={{
                                background: "var(--accent)",
                                color: "white"
                            }}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Success Message */}
                <div
                    className="absolute top-full left-0 mt-2 px-1 text-xs font-medium transition-opacity duration-300"
                    style={{ opacity: status === 'success' ? 1 : 0, color: "var(--success)" }}
                >
                    Captured! Processing in background...
                </div>
            </form>
        </div>
    );
}
