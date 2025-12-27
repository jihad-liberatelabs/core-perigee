"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import CaptureBar from "./CaptureBar";
import AppHeader from "./AppHeader";
import { formatRelativeDate, truncateContent } from "@/lib/formatters";
import type { SignalsResponse, SignalWithParsedTags } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * SWR fetcher function
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * SignalInbox Component
 * 
 * Main inbox view for Signal Desk. Displays all captured signals with filtering,
 * selection, and bulk actions for AI-powered insight generation.
 * 
 * Features:
 * - Real-time polling with SWR (every 5 seconds)
 * - Filter by status (all, unread, reviewed, archived)
 * - Multi-select for bulk actions
 * - AI-powered insight generation
 * - Review flow integration
 */
export default function SignalInbox() {
    const [filter, setFilter] = useState<string>("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [generating, setGenerating] = useState(false);

    // Auto-refresh every 5 seconds, pause when tab hidden
    const { data, error, mutate } = useSWR<SignalsResponse>(
        `/api/signals${filter !== "all" ? `?status=${filter}` : ""}`,
        fetcher,
        {
            refreshInterval: 5000,
            revalidateOnFocus: true
        }
    );

    const signals = data?.signals || [];
    const loading = !data && !error;

    /**
     * Toggles signal selection for bulk actions
     */
    function toggleSelection(id: string) {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    }

    /**
     * Triggers AI-powered insight generation for selected signals
     * Sends signals to n8n workflow for synthesis
     */
    async function handleGenerate() {
        if (selectedIds.size === 0) return;
        setGenerating(true);

        try {
            const res = await fetch("/api/insights/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signalIds: Array.from(selectedIds) }),
            });

            if (!res.ok) throw new Error("Generation failed");

            // Clear selection and notify user
            setSelectedIds(new Set());
            alert("AI Agent is generating your insight! Check the Insights tab in a few moments.");
        } catch (error) {
            console.error(error);
            alert("Failed to trigger generation");
        } finally {
            setGenerating(false);
        }
    }

    /**
     * Updates a signal's status
     * Immediately revalidates the cache for instant UI update
     */
    async function updateStatus(id: string, status: string) {
        try {
            await fetch("/api/signals", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status }),
            });
            mutate(); // Revalidate immediately
        } catch (error) {
            console.error("Failed to update signal:", error);
        }
    }

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            <AppHeader />

            <main className="max-w-5xl mx-auto px-6 py-8 pb-32">
                {/* Header with Filters */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                        Inbox
                    </h1>

                    {/* Filter Tabs */}
                    <div className="flex gap-2">
                        {["all", "unread", "reviewed", "archived"].map((tab) => (
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
                </div>

                {/* Capture Bar */}
                <CaptureBar onSignalAdded={() => mutate()} />

                {/* Signal List */}
                {loading ? (
                    <LoadingSkeleton />
                ) : signals.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-4 pt-2">
                        {signals.map((signal) => (
                            <SignalCard
                                key={signal.id}
                                signal={signal}
                                isSelected={selectedIds.has(signal.id)}
                                onToggleSelection={toggleSelection}
                                showSelection={selectedIds.size > 0}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <FloatingActionBar
                    selectedCount={selectedIds.size}
                    generating={generating}
                    onGenerate={handleGenerate}
                    onClear={() => setSelectedIds(new Set())}
                />
            )}
        </div>
    );
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Loading skeleton while fetching signals
 */
function LoadingSkeleton() {
    return (
        <div className="space-y-4 pt-4">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="skeleton h-32 rounded-lg"
                    style={{ background: "var(--background-elevated)" }}
                />
            ))}
        </div>
    );
}

/**
 * Empty state when no signals exist
 */
function EmptyState() {
    return (
        <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-lg font-medium">No signals yet</p>
            <p className="text-sm mt-1">Capture your first thought or link above</p>
        </div>
    );
}

/**
 * Individual signal card component
 */
function SignalCard({
    signal,
    isSelected,
    onToggleSelection,
    showSelection
}: {
    signal: SignalWithParsedTags;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    showSelection: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <article
            className={`card card-interactive animate-fadeIn relative group transition-all duration-200 ${isSelected ? 'ring-2 ring-[var(--accent)]' : ''}`}
            onClick={() => onToggleSelection(signal.id)}
            style={{
                background: "var(--background-elevated)",
                borderColor: "var(--border)",
                cursor: "pointer"
            }}
        >
            {/* Selection Checkbox */}
            <div className={`absolute left-[-40px] top-1/2 transform -translate-y-1/2 transition-all duration-200 ${showSelection || isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--text-muted)] hover:border-[var(--text-secondary)]'}`}>
                    {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Signal Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {signal.title}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {signal.source && <span>{signal.source}</span>}
                        <span>{formatRelativeDate(signal.createdAt)}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`badge badge-${signal.status === "unread" ? "unread" : signal.status === "reviewed" ? "draft" : "published"}`}>
                        {signal.status}
                    </span>
                    <Link
                        href={`/review/${signal.id}`}
                        className="p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--accent)] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Review Signal"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* Content Preview / Full Content */}
            <div className="mb-4">
                {!isExpanded ? (
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {truncateContent(signal.content)}
                        {signal.content.length > 150 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                className="ml-2 text-[var(--accent)] hover:underline font-medium"
                            >
                                Read more
                            </button>
                        )}
                    </p>
                ) : (
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none" style={{ color: "var(--text-secondary)" }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {signal.content}
                        </ReactMarkdown>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                            className="mt-2 text-[var(--accent)] hover:underline font-medium block"
                        >
                            Show less
                        </button>
                    </div>
                )}
            </div>

            {/* Tags */}
            {signal.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {signal.tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                                background: "rgba(99, 102, 241, 0.05)",
                                color: "var(--accent)",
                                border: "1px solid var(--accent-border)"
                            }}
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}

/**
 * Floating action bar for bulk operations
 */
function FloatingActionBar({
    selectedCount,
    generating,
    onGenerate,
    onClear
}: {
    selectedCount: number;
    generating: boolean;
    onGenerate: () => void;
    onClear: () => void;
}) {
    return (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${selectedCount > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
            <div
                className="flex items-center gap-4 px-6 py-3 rounded-xl shadow-2xl border"
                style={{
                    background: "var(--background-elevated)",
                    borderColor: "var(--accent-border)",
                    boxShadow: "0 0 40px rgba(0,0,0,0.5)"
                }}
            >
                <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                    {selectedCount} selected
                </span>
                <div className="h-6 w-px bg-[var(--border)]"></div>

                <Link href="/queue" className="btn btn-secondary flex items-center gap-2" title="Enter Review Queue">
                    <span className="text-xl">⚡️</span>
                    Start Review Flow
                </Link>

                <button onClick={onGenerate} disabled={generating} className="btn btn-primary flex items-center gap-2">
                    {generating ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate Insight
                        </>
                    )}
                </button>

                <button
                    onClick={onClear}
                    className="p-2 hover:bg-[var(--background-hover)] rounded-lg transition-colors"
                    title="Cancel selection"
                >
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
