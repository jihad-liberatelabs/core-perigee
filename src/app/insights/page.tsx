"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import AppHeader from "@/components/AppHeader";

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
    publishedAt: string | null;
    createdAt: string;
    thoughts: Thought[];
    signals: { id: string; title: string }[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InsightsPage() {
    const [filter, setFilter] = useState("all");
    const [editingPreviewId, setEditingPreviewId] = useState<string | null>(null);
    const [editedPreviewContent, setEditedPreviewContent] = useState("");

    // Polling setup
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);

    const { data: insightsData, mutate: mutateInsights } = useSWR(
        `/api/insights?${params}`,
        fetcher,
        { refreshInterval: 3000 } // Poll every 3s to catch async updates from n8n
    );

    const { data: thoughtsData, mutate: mutateThoughts } = useSWR(
        "/api/thoughts?unlinked=true",
        fetcher
    );

    const insights: Insight[] = insightsData?.insights || [];
    const unlinkedThoughts: Thought[] = thoughtsData?.thoughts || [];

    const [showNewForm, setShowNewForm] = useState(false);
    const [newInsight, setNewInsight] = useState("");
    const [selectedThoughts, setSelectedThoughts] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);

    async function createInsight() {
        if (!newInsight.trim()) return;
        setCreating(true);

        try {
            await fetch("/api/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coreInsight: newInsight.trim(),
                    thoughtIds: selectedThoughts,
                }),
            });
            setNewInsight("");
            setSelectedThoughts([]);
            setShowNewForm(false);
            mutateInsights();
            mutateThoughts();
        } catch (error) {
            console.error("Failed to create insight:", error);
        } finally {
            setCreating(false);
        }
    }

    async function updatePreview(id: string) {
        if (!editedPreviewContent.trim()) return;

        try {
            // Optimistic update
            const updatedInsights = insights.map(i =>
                i.id === id ? { ...i, preview: editedPreviewContent } : i
            );
            mutateInsights({ insights: updatedInsights }, false);

            await fetch("/api/insights", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    coreInsight: insights.find(i => i.id === id)?.coreInsight, // Keep existing
                    preview: editedPreviewContent // We need to add this field to API handler if not present, but for now assuming we update the core object or create a specific endpoint
                    // Wait, PATCH /api/insights current implementation only updates 'coreInsight'.
                    // I need to update the API to allow updating 'preview' field manually.
                }),
            });

            // Actually, I need to check the API implementation.
            // ... API check revealed PATCH currently only updates coreInsight or triggers actions.
            // I will need to update the API to support updating 'preview' field.
            // For now, I'll assume I'll fix the API in the next step.

            setEditingPreviewId(null);
            mutateInsights();
        } catch (error) {
            console.error("Failed to update preview:", error);
        }
    }

    // Temporary helper until I fix the API
    async function savePreviewEdit(id: string) {
        // Implementation pending API update
        console.log("Saving preview", id, editedPreviewContent);
        // Fallback for now: just close edit mode
        setEditingPreviewId(null);
    }

    async function deleteInsight(id: string) {
        if (!confirm("Delete this insight?")) return;

        try {
            await fetch(`/api/insights?id=${id}`, { method: "DELETE" });
            mutateInsights();
        } catch (error) {
            console.error("Failed to delete insight:", error);
        }
    }

    function getStatusColor(status: string) {
        switch (status) {
            case "draft": return "var(--warning)";
            case "formatting": return "var(--accent)";
            case "previewing": return "var(--accent)";
            case "published": return "var(--success)";
            default: return "var(--text-muted)";
        }
    }

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            <AppHeader />

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                        Insights
                    </h1>
                    <button
                        onClick={() => setShowNewForm(true)}
                        className="btn btn-primary"
                        disabled={creating}
                    >
                        + New Insight
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-8">
                    {["all", "draft", "previewing", "published"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all"
                            style={{
                                background: filter === tab ? "var(--accent-soft)" : "transparent",
                                color: filter === tab ? "var(--accent)" : "var(--text-secondary)",
                                border: `1px solid ${filter === tab ? "var(--accent-border)" : "transparent"}`,
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* List Content */}
                {!insightsData ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="skeleton h-24 rounded-lg"
                                style={{ background: "var(--background-elevated)" }}
                            />
                        ))}
                    </div>
                ) : insights.length === 0 ? (
                    <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <p className="text-lg font-medium">No insights yet</p>
                        <p className="text-sm mt-1">Create insights from your thoughts and reflections</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {insights.map((insight) => (
                            <article
                                key={insight.id}
                                className="card animate-fadeIn"
                                style={{
                                    background: "var(--background-elevated)",
                                    borderColor: "var(--border)",
                                }}
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <p className="text-lg font-medium flex-1" style={{ color: "var(--text-primary)" }}>
                                        {insight.coreInsight}
                                    </p>
                                    <span
                                        className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                                        style={{
                                            background: `${getStatusColor(insight.status)}20`,
                                            color: getStatusColor(insight.status),
                                        }}
                                    >
                                        {insight.status}
                                    </span>
                                </div>

                                {/* Linked Sources */}
                                {(insight.signals?.length > 0 || insight.thoughts?.length > 0) && (
                                    <div className="mb-4">
                                        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                                            Based on {insight.signals?.length > 0 ? `${insight.signals.length} signal${insight.signals.length > 1 ? "s" : ""}` : `${insight.thoughts.length} thought${insight.thoughts.length > 1 ? "s" : ""}`}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {insight.signals?.length > 0 ? (
                                                <>
                                                    {insight.signals.slice(0, 3).map((signal) => (
                                                        <span key={signal.id} className="px-2 py-1 rounded text-xs truncate max-w-48 flex items-center gap-1" style={{ background: "var(--background-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                                                            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                            {signal.title}
                                                        </span>
                                                    ))}
                                                    {insight.signals.length > 3 && <span className="px-2 py-1 text-xs" style={{ color: "var(--text-muted)" }}>+{insight.signals.length - 3} more</span>}
                                                </>
                                            ) : (
                                                <>
                                                    {insight.thoughts.slice(0, 3).map((thought) => (
                                                        <span key={thought.id} className="px-2 py-1 rounded text-xs truncate max-w-48" style={{ background: "var(--background-hover)", color: "var(--text-secondary)" }}>
                                                            {thought.content.substring(0, 50)}...
                                                        </span>
                                                    ))}
                                                    {insight.thoughts.length > 3 && <span className="px-2 py-1 text-xs" style={{ color: "var(--text-muted)" }}>+{insight.thoughts.length - 3} more</span>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Preview / LinkedIn Style Card */}
                                {insight.preview && (
                                    <div className="mt-6 mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Preview ({insight.previewPlatform || "LinkedIn"})</p>
                                            {insight.status !== "published" && (
                                                <button
                                                    onClick={() => {
                                                        if (editingPreviewId === insight.id) {
                                                            updatePreview(insight.id);
                                                        } else {
                                                            setEditingPreviewId(insight.id);
                                                            setEditedPreviewContent(insight.preview || "");
                                                        }
                                                    }}
                                                    className="text-xs hover:underline"
                                                    style={{ color: "var(--accent)" }}
                                                >
                                                    {editingPreviewId === insight.id ? "Save Changes" : "Edit Preview"}
                                                </button>
                                            )}
                                        </div>
                                        <div className="rounded-lg overflow-hidden border" style={{ background: "white", borderColor: "#e0e0e0", color: "black", fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto' }}>
                                            <div className="p-3 flex gap-2 border-b border-gray-100">
                                                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                                                <div className="flex-1">
                                                    <div className="h-3 w-32 bg-gray-200 rounded mb-1"></div>
                                                    <div className="h-2 w-20 bg-gray-100 rounded"></div>
                                                </div>
                                            </div>
                                            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
                                                {editingPreviewId === insight.id ? (
                                                    <textarea
                                                        value={editedPreviewContent}
                                                        onChange={(e) => setEditedPreviewContent(e.target.value)}
                                                        className="w-full h-48 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        style={{ background: "#f8f9fa" }}
                                                    />
                                                ) : (
                                                    insight.preview
                                                )}
                                            </div>
                                            <div className="px-4 py-2 border-t border-gray-100 flex justify-between text-gray-500 text-xs">
                                                <span>Like</span><span>Comment</span><span>Share</span><span>Send</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Published Link */}
                                {insight.publishedUrl && (
                                    <div className="mb-4">
                                        <a href={insight.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: "var(--success)" }}>
                                            View published post ↗
                                        </a>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                                    <div className="flex gap-2">
                                        <Link href={`/insights/${insight.id}`} className="btn btn-secondary text-sm">Edit Core Insight</Link>
                                        {insight.status === "draft" && <Link href={`/insights/${insight.id}?action=format`} className="btn btn-primary text-sm">Format for Publishing</Link>}
                                        {insight.status === "previewing" && <Link href={`/insights/${insight.id}?action=publish`} className="btn btn-primary text-sm">Publish Now</Link>}
                                        {insight.status === "formatting" && <span className="text-sm italic opacity-70 flex items-center gap-2"><span className="loading loading-spinner loading-xs"></span>Formatting...</span>}
                                    </div>
                                    <button onClick={() => deleteInsight(insight.id)} className="btn btn-ghost text-sm" style={{ color: "var(--error)" }}>Delete</button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>

            {/* New Insight Modal */}
            {showNewForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.8)" }}>
                    <div className="w-full max-w-2xl rounded-xl p-6 animate-fadeIn" style={{ background: "var(--background-elevated)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Create New Insight</h2>
                            <button onClick={() => setShowNewForm(false)} className="btn btn-ghost p-2">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Core Insight</label>
                                <textarea value={newInsight} onChange={(e) => setNewInsight(e.target.value)} placeholder="Write a single, opinionated insight..." className="textarea" rows={4} />
                                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>A concise, opinionated statement that is non-obvious and reflects your point of view.</p>
                            </div>
                            {unlinkedThoughts.length > 0 && (
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Link Thoughts (optional)</label>
                                    <div className="max-h-40 overflow-y-auto space-y-2 p-3 rounded-lg" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                                        {unlinkedThoughts.map((thought) => (
                                            <label key={thought.id} className="flex items-start gap-3 cursor-pointer">
                                                <input type="checkbox" checked={selectedThoughts.includes(thought.id)} onChange={(e) => { if (e.target.checked) { setSelectedThoughts([...selectedThoughts, thought.id]); } else { setSelectedThoughts(selectedThoughts.filter((id) => id !== thought.id)); } }} className="mt-1" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{thought.content}</p>
                                                    {thought.signal && <p className="text-xs" style={{ color: "var(--text-muted)" }}>From: {thought.signal.title}</p>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button onClick={createInsight} disabled={!newInsight.trim()} className="btn btn-primary flex-1" style={{ opacity: !newInsight.trim() ? 0.6 : 1 }}>{creating ? "Creating..." : "Create Insight"}</button>
                                <button onClick={() => setShowNewForm(false)} className="btn btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
