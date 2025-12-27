"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
    const searchParams = useSearchParams();
    const insightId = params.id as string;
    const action = searchParams.get("action");

    const [insight, setInsight] = useState<Insight | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [coreInsight, setCoreInsight] = useState("");
    const [platform, setPlatform] = useState("linkedin");
    const [tone, setTone] = useState<"analytical" | "reflective" | "decisive">("reflective");
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
            setCoreInsight(found.coreInsight);
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

    async function saveInsight() {
        if (!coreInsight.trim()) return;

        setSaving(true);
        try {
            await fetch("/api/insights", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: insightId,
                    coreInsight: coreInsight.trim(),
                }),
            });
            fetchInsight();
        } catch (error) {
            console.error("Failed to save insight:", error);
        } finally {
            setSaving(false);
        }
    }

    async function triggerFormat() {
        setActionLoading(true);
        setActionError(null);

        try {
            const res = await fetch("/api/insights", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: insightId,
                    action: "format",
                    platform,
                    tone,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to trigger format");
            }

            // Start polling for preview update
            pollForPreview();
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "Failed to format");
            setActionLoading(false);
        }
    }

    async function pollForPreview() {
        // Poll every 2 seconds for up to 60 seconds
        let attempts = 0;
        const maxAttempts = 30;

        const poll = async () => {
            attempts++;
            await fetchInsight();

            if (insight?.status === "previewing" || attempts >= maxAttempts) {
                setActionLoading(false);
                return;
            }

            setTimeout(poll, 2000);
        };

        setTimeout(poll, 2000);
    }

    async function triggerPublish() {
        setActionLoading(true);
        setActionError(null);

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
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: "var(--background)" }}
            >
                <div className="skeleton w-16 h-16 rounded-full" />
            </div>
        );
    }

    if (!insight) return null;

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            {/* Header */}
            <header
                className="sticky top-0 z-10 border-b px-8 py-4"
                style={{
                    background: "var(--background)",
                    borderColor: "var(--border)",
                }}
            >
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link href="/insights" className="btn btn-ghost">
                        ← Back to Insights
                    </Link>
                    <div className="flex items-center gap-3">
                        <span
                            className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                            style={{
                                background: insight.status === "published"
                                    ? "var(--success-soft)"
                                    : "var(--warning-soft)",
                                color: insight.status === "published"
                                    ? "var(--success)"
                                    : "var(--warning)",
                            }}
                        >
                            {insight.status}
                        </span>
                        {insight.publishedUrl && (
                            <a
                                href={insight.publishedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary text-sm"
                            >
                                View Post ↗
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Editor */}
                    <div>
                        <h2
                            className="text-lg font-medium mb-4"
                            style={{ color: "var(--text-primary)" }}
                        >
                            Core Insight
                        </h2>

                        <textarea
                            value={coreInsight}
                            onChange={(e) => setCoreInsight(e.target.value)}
                            className="textarea text-lg"
                            rows={6}
                            placeholder="Your singular, opinionated insight..."
                        />

                        <button
                            onClick={saveInsight}
                            disabled={saving || coreInsight === insight.coreInsight}
                            className="btn btn-secondary mt-4"
                            style={{ opacity: saving || coreInsight === insight.coreInsight ? 0.6 : 1 }}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>

                        {/* Linked Thoughts */}
                        <div className="mt-8">
                            <h3
                                className="text-sm font-medium mb-3"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                Linked Thoughts ({insight.thoughts.length})
                            </h3>

                            {insight.thoughts.length === 0 ? (
                                <p
                                    className="text-sm italic"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    No thoughts linked to this insight
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {insight.thoughts.map((thought) => (
                                        <div
                                            key={thought.id}
                                            className="p-3 rounded-lg"
                                            style={{
                                                background: "var(--background-elevated)",
                                                border: "1px solid var(--border)",
                                            }}
                                        >
                                            <p
                                                className="text-sm"
                                                style={{ color: "var(--text-primary)" }}
                                            >
                                                {thought.content}
                                            </p>
                                            {thought.signal && (
                                                <p
                                                    className="text-xs mt-2"
                                                    style={{ color: "var(--text-muted)" }}
                                                >
                                                    From: {thought.signal.title}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Actions & Preview */}
                    <div>
                        {/* Format Section */}
                        {(insight.status === "draft" || action === "format") && (
                            <div
                                className="p-6 rounded-xl mb-6"
                                style={{
                                    background: "var(--background-elevated)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <h3
                                    className="text-lg font-medium mb-4"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    Format for Publishing
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label
                                            className="block text-sm mb-2"
                                            style={{ color: "var(--text-secondary)" }}
                                        >
                                            Platform
                                        </label>
                                        <select
                                            value={platform}
                                            onChange={(e) => setPlatform(e.target.value)}
                                            className="input"
                                        >
                                            <option value="linkedin">LinkedIn</option>
                                            <option value="twitter">X (Twitter)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            className="block text-sm mb-2"
                                            style={{ color: "var(--text-secondary)" }}
                                        >
                                            Tone
                                        </label>
                                        <select
                                            value={tone}
                                            onChange={(e) => setTone(e.target.value as typeof tone)}
                                            className="input"
                                        >
                                            <option value="analytical">Analytical</option>
                                            <option value="reflective">Reflective</option>
                                            <option value="decisive">Decisive</option>
                                        </select>
                                    </div>

                                    {actionError && (
                                        <p
                                            className="text-sm p-3 rounded-lg"
                                            style={{
                                                background: "var(--error-soft)",
                                                color: "var(--error)",
                                            }}
                                        >
                                            {actionError}
                                        </p>
                                    )}

                                    <button
                                        onClick={triggerFormat}
                                        disabled={actionLoading}
                                        className="btn btn-primary w-full"
                                        style={{ opacity: actionLoading ? 0.6 : 1 }}
                                    >
                                        {actionLoading ? "Formatting..." : "Send to n8n for Formatting"}
                                    </button>

                                    <p
                                        className="text-xs text-center"
                                        style={{ color: "var(--text-muted)" }}
                                    >
                                        n8n will generate a formatted post and send it back
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Preview Section */}
                        {(insight.preview || insight.status === "previewing" || action === "publish") && (
                            <div
                                className="p-6 rounded-xl"
                                style={{
                                    background: "var(--background-elevated)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <h3
                                    className="text-lg font-medium mb-4"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    Preview ({insight.previewPlatform || platform})
                                </h3>

                                {insight.preview ? (
                                    <>
                                        <div
                                            className="p-4 rounded-lg mb-4"
                                            style={{
                                                background: "var(--background)",
                                                border: "1px solid var(--border)",
                                            }}
                                        >
                                            <p
                                                className="text-sm whitespace-pre-wrap"
                                                style={{ color: "var(--text-primary)" }}
                                            >
                                                {insight.preview}
                                            </p>
                                        </div>

                                        {insight.status !== "published" && (
                                            <>
                                                {actionError && (
                                                    <p
                                                        className="text-sm p-3 rounded-lg mb-4"
                                                        style={{
                                                            background: "var(--error-soft)",
                                                            color: "var(--error)",
                                                        }}
                                                    >
                                                        {actionError}
                                                    </p>
                                                )}

                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={triggerPublish}
                                                        disabled={actionLoading}
                                                        className="btn btn-primary flex-1"
                                                        style={{ opacity: actionLoading ? 0.6 : 1 }}
                                                    >
                                                        {actionLoading ? "Publishing..." : "Publish"}
                                                    </button>
                                                    <button
                                                        onClick={triggerFormat}
                                                        disabled={actionLoading}
                                                        className="btn btn-secondary"
                                                    >
                                                        Regenerate
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <p
                                        className="text-sm italic"
                                        style={{ color: "var(--text-muted)" }}
                                    >
                                        Waiting for preview from n8n...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
