"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Thought {
    id: string;
    content: string;
    signal: { id: string; title: string } | null;
}

interface Insight {
    id: string;
    coreInsight: string;
    status: string;
    preview: string | null;
    previewPlatform: string | null;
    publishedUrl: string | null;
    createdAt: string;
    thoughts: Thought[];
}


export default function InsightEditorPage() {
    const params = useParams();
    const router = useRouter();
    const insightId = params.id as string;

    const [insight, setInsight] = useState<Insight | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draftContent, setDraftContent] = useState("");
    const [mode, setMode] = useState<"edit" | "preview">("preview");
    const [isExpanded, setIsExpanded] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const fetchInsight = useCallback(async () => {
        try {
            const res = await fetch(`/api/insights`);
            const data = await res.json();
            const found = data.insights.find((i: Insight) => i.id === insightId);
            if (!found) {
                router.push("/insights");
                return;
            }
            setInsight(found);
            // Default to preview content if it exists, otherwise core insight
            setDraftContent(found.preview || found.coreInsight || "");
        } catch (error) {
            console.error("Failed to fetch insight:", error);
            router.push("/insights");
        } finally {
            setLoading(false);
        }
    }, [insightId, router]);

    useEffect(() => {
        fetchInsight();
    }, [fetchInsight]);

    async function saveDraft() {
        if (!draftContent.trim()) return;

        setSaving(true);
        try {
            await fetch("/api/insights", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: insightId,
                    preview: draftContent, // Saving to preview field as it is the draft
                }),
            });
            // Update local state to reflect saved status if needed
        } catch (error) {
            console.error("Failed to save draft:", error);
        } finally {
            setSaving(false);
        }
    }

    async function triggerPublish() {
        if (!confirm("Are you ready to publish this post to LinkedIn?")) return;

        setActionLoading(true);
        setActionError(null);

        // Save first to ensure latest content is published
        await saveDraft();

        try {
            const res = await fetch("/api/insights", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: insightId,
                    action: "publish",
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to trigger publish");
            }

            // Poll for status update
            let attempts = 0;
            const poll = async () => {
                attempts++;
                await fetchInsight();

                if (insight?.status === "published" || attempts >= 30) {
                    setActionLoading(false);
                    return;
                }

                setTimeout(poll, 2000);
            };

            setTimeout(poll, 2000);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Failed to publish");
            setActionLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
                <div className="skeleton w-16 h-16 rounded-full" />
            </div>
        );
    }

    if (!insight) return null;

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
            {/* Header */}
            <header
                className="sticky top-0 z-10 border-b px-6 py-4"
                style={{
                    background: "var(--background)",
                    borderColor: "var(--border)",
                }}
            >
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/insights" className="btn btn-ghost px-2">
                            ← Back
                        </Link>
                        <div className="h-6 w-px bg-[var(--border)]" />

                        <div className="flex-1">
                            <span className="text-sm text-[var(--text-secondary)]">Editing Insight</span>
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                        background: insight.status === "published" ? "var(--success)" : "var(--warning)"
                                    }}
                                />
                                <span className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>
                                    {insight.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {insight.publishedUrl ? (
                            <a
                                href={insight.publishedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary text-sm"
                            >
                                View Live Post ↗
                            </a>
                        ) : (
                            <button
                                onClick={triggerPublish}
                                disabled={actionLoading}
                                className="btn btn-primary"
                                style={{ opacity: actionLoading ? 0.6 : 1 }}
                            >
                                {actionLoading ? "Publishing..." : "Publish Now"}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
                {/* Editor / Preview Toggle */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex p-1 rounded-lg bg-[var(--background-elevated)] border border-[var(--border)]">
                        <button
                            onClick={() => setMode("preview")}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === "preview"
                                ? "bg-[var(--background-active)] text-[var(--text-primary)] shadow-sm"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            Preview Card
                        </button>
                        <button
                            onClick={() => setMode("edit")}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === "edit"
                                ? "bg-[var(--background-active)] text-[var(--text-primary)] shadow-sm"
                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            Edit Copy
                        </button>
                    </div>

                    {mode === "edit" && (
                        <span className="text-xs text-[var(--text-muted)] animate-fadeIn">
                            {saving ? "Saving..." : "Changes save automatically"}
                        </span>
                    )}
                </div>

                {/* Editor Area */}
                <div className="relative min-h-[400px]">
                    {mode === "edit" ? (
                        <div className="animate-fadeIn">
                            <textarea
                                value={draftContent}
                                onChange={(e) => {
                                    setDraftContent(e.target.value);
                                    // Debounce save if needed, for now explicit save on blur or interval could work, 
                                    // but let's just use manual save or rely on the publish/save buttons.
                                    // Actually, let's auto-save on blur or use a timer? 
                                    // The user asked to "edit the copy". 
                                    // I'll add a manual save button next to the textbox if preferred, or just rely on the 'Save Draft' logic implicitly.
                                    // Let's rely on blur to save.
                                }}
                                onBlur={saveDraft}
                                className="w-full h-[500px] p-6 text-lg leading-relaxed bg-[var(--background)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:outline-none resize-none font-sans"
                                placeholder="Draft your post here..."
                                style={{ color: "var(--text-primary)" }}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-2 text-right">Markdown supported</p>
                        </div>
                    ) : (
                        <div className="animate-fadeIn flex justify-center">
                            {/* LinkedIn Preview Card */}
                            <div
                                className="w-full max-w-[552px] rounded-xl overflow-hidden border shadow-sm"
                                style={{
                                    background: "white",
                                    borderColor: "#e0e0e0",
                                    color: "#191919",
                                    fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
                                }}
                            >
                                <div className="p-4 flex gap-3 border-b border-gray-100 bg-gray-50/50">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xl ring-2 ring-white">
                                        P
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-4 w-32 bg-gray-300 rounded mb-1.5"></div>
                                        <div className="h-3 w-48 bg-gray-200 rounded"></div>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="prose prose-sm max-w-none text-[15px] leading-relaxed text-[#191919]">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {isExpanded || draftContent.length <= 160
                                                ? draftContent || "(No content yet)"
                                                : draftContent.substring(0, 160)}
                                        </ReactMarkdown>
                                        {!isExpanded && draftContent.length > 160 && (
                                            <span
                                                onClick={() => setIsExpanded(true)}
                                                className="text-[#666666] font-semibold cursor-pointer hover:underline hover:text-[#0a66c2]"
                                            >
                                                ...see more
                                            </span>
                                        )}
                                        {isExpanded && draftContent.length > 160 && (
                                            <button
                                                onClick={() => setIsExpanded(false)}
                                                className="text-xs text-[#666666] font-semibold hover:underline mt-2 block"
                                            >
                                                Show less
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-6 text-gray-500 font-semibold text-sm">
                                    <span className="flex items-center gap-1.5">Like</span>
                                    <span className="flex items-center gap-1.5">Comment</span>
                                    <span className="flex items-center gap-1.5">Share</span>
                                    <span className="flex items-center gap-1.5">Send</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {actionError && (
                    <div className="mt-4 p-4 rounded-lg bg-[var(--error-soft)] text-[var(--error)] text-sm">
                        {actionError}
                    </div>
                )}
            </main>
        </div>
    );
}

