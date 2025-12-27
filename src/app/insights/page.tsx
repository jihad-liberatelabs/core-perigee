"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

    async function deleteInsight(e: React.MouseEvent, id: string) {
        e.stopPropagation();
        e.preventDefault();

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
            case "published": return "var(--success)";
            default: return "var(--text-muted)";
        }
    }

    async function publishInsight(id: string) {
        if (!confirm("Publish this post to LinkedIn?")) return;

        try {
            const res = await fetch("/api/insights", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action: "publish" }),
            });

            if (!res.ok) throw new Error("Failed to publish");

            alert("Post sent for publication!");
            mutateInsights();
        } catch (error) {
            console.error("Publish error:", error);
            alert("Failed to publish: " + (error instanceof Error ? error.message : "Unknown error"));
        }
    }

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            <AppHeader />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
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
                    {["all", "draft", "published"].map((tab) => (
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

                {/* Grid Content */}
                {!insightsData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="skeleton h-64 rounded-xl"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {insights.map((insight) => (
                            <Link
                                href={`/insights/${insight.id}`}
                                key={insight.id}
                                className="card group hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex flex-col h-full cursor-pointer relative"
                                style={{
                                    background: "var(--background-elevated)",
                                    borderColor: "var(--border)",
                                }}
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <span
                                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider"
                                        style={{
                                            background: `${getStatusColor(insight.status)}15`,
                                            color: getStatusColor(insight.status),
                                            border: `1px solid ${getStatusColor(insight.status)}30`
                                        }}
                                    >
                                        {insight.status}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {new Date(insight.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Content Preview */}
                                <div className="flex-1 mb-4 overflow-hidden relative">
                                    <div className="text-[15px] font-medium leading-relaxed prose prose-sm" style={{ color: "var(--text-primary)" }}>
                                        {insight.preview ? (
                                            <>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {insight.preview.length > 160
                                                        ? insight.preview.substring(0, 160)
                                                        : insight.preview}
                                                </ReactMarkdown>
                                                {insight.preview.length > 160 && (
                                                    <span className="text-[var(--text-muted)] font-semibold">
                                                        ...see more
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <p className="line-clamp-4">{insight.coreInsight}</p>
                                        )}
                                    </div>
                                    {!insight.preview && insight.status === "draft" && (
                                        <div className="mt-2 text-xs italic text-[var(--text-muted)]">
                                            Generating draft...
                                        </div>
                                    )}
                                </div>

                                {/* Footer Info */}
                                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] mt-auto">
                                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                                        {(insight.signals?.length > 0 || insight.thoughts?.length > 0) && (
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                </svg>
                                                {insight.signals?.length || insight.thoughts?.length} sources
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => deleteInsight(e, insight.id)}
                                        className="text-xs text-[var(--text-muted)] hover:text-[var(--error)] p-1 rounded hover:bg-[var(--background-hover)] transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </Link>
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
