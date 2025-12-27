"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";

interface WebhookConfig {
    id: string;
    name: string;
    url: string;
}

const WEBHOOK_DESCRIPTIONS: Record<string, string> = {
    ingest: "n8n webhook to process raw inputs (URLs, text) and extract signals",
    generate: "n8n webhook to generate LinkedIn posts from reviewed signals",
    publish: "n8n webhook to publish posts to LinkedIn",
};

export default function SettingsPage() {
    const [configs, setConfigs] = useState<WebhookConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [urls, setUrls] = useState<Record<string, string>>({
        ingest: "",
        generate: "",
        publish: "",
    });

    useEffect(() => {
        fetchConfigs();
    }, []);

    async function fetchConfigs() {
        try {
            const res = await fetch("/api/settings/webhooks");

            if (!res.ok) {
                console.warn("API returned error status:", res.status);
                setConfigs([]);
                return;
            }

            const data = await res.json();
            const loadedConfigs = data.configs || [];
            setConfigs(loadedConfigs);

            // Populate URLs from existing configs
            const urlMap: Record<string, string> = { ingest: "", generate: "", publish: "" };
            loadedConfigs.forEach((c: WebhookConfig) => {
                if (c.name in urlMap) {
                    urlMap[c.name] = c.url;
                }
            });
            setUrls(urlMap);
        } catch (error) {
            console.error("Failed to fetch configs:", error);
        } finally {
            setLoading(false);
        }
    }

    async function saveWebhook(name: string) {
        setSaving(name);
        try {
            await fetch("/api/settings/webhooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, url: urls[name] }),
            });
            fetchConfigs();
        } catch (error) {
            console.error("Failed to save webhook:", error);
        } finally {
            setSaving(null);
        }
    }

    function getConfigForName(name: string): WebhookConfig | undefined {
        return configs.find((c) => c.name === name);
    }

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            <AppHeader />

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                        Settings
                    </h1>
                </div>

                <section className="mb-12">
                    <h2
                        className="text-lg font-medium mb-2"
                        style={{ color: "var(--text-primary)" }}
                    >
                        n8n Webhook Configuration
                    </h2>
                    <p
                        className="text-sm mb-6 max-w-2xl"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        Configure the webhook URLs for your n8n workflows. These endpoints will receive data from Signal Desk.
                    </p>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="skeleton h-24 rounded-lg"
                                    style={{ background: "var(--background-elevated)" }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {["ingest", "generate", "publish"].map((name) => {
                                const existingConfig = getConfigForName(name);
                                const hasChanged = existingConfig?.url !== urls[name];

                                return (
                                    <div
                                        key={name}
                                        className="p-6 rounded-xl transition-all"
                                        style={{
                                            background: "var(--background-elevated)",
                                            border: `1px solid ${existingConfig ? "var(--success)" : "var(--border)"}`,
                                            boxShadow: existingConfig ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div>
                                                <h3
                                                    className="font-medium capitalize flex items-center gap-2"
                                                    style={{ color: "var(--text-primary)" }}
                                                >
                                                    {name} Webhook
                                                    {existingConfig && (
                                                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </h3>
                                                <p
                                                    className="text-sm mt-1"
                                                    style={{ color: "var(--text-secondary)" }}
                                                >
                                                    {WEBHOOK_DESCRIPTIONS[name]}
                                                </p>
                                            </div>
                                            {existingConfig && (
                                                <span
                                                    className="px-2 py-1 rounded text-xs font-medium"
                                                    style={{
                                                        background: "var(--success-soft)",
                                                        color: "var(--success)",
                                                    }}
                                                >
                                                    Configured
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            <input
                                                type="url"
                                                value={urls[name] || ""}
                                                onChange={(e) => setUrls({ ...urls, [name]: e.target.value })}
                                                placeholder="https://your-n8n-instance.com/webhook/..."
                                                className="input flex-1 font-mono text-sm"
                                            />
                                            <button
                                                onClick={() => saveWebhook(name)}
                                                disabled={!urls[name] || saving === name || !hasChanged}
                                                className="btn btn-primary"
                                                style={{ opacity: !urls[name] || saving === name || !hasChanged ? 0.6 : 1 }}
                                            >
                                                {saving === name ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* API Info */}
                <section className="pt-8 border-t" style={{ borderColor: "var(--border)" }}>
                    <h2
                        className="text-lg font-medium mb-4"
                        style={{ color: "var(--text-primary)" }}
                    >
                        Inbound Webhook Endpoints
                    </h2>
                    <p
                        className="text-sm mb-4"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        These are the endpoints your n8n workflows should call back to:
                    </p>

                    <div
                        className="p-6 rounded-lg font-mono text-sm space-y-3"
                        style={{
                            background: "var(--background-elevated)",
                            border: "1px solid var(--border)",
                        }}
                    >
                        <p style={{ color: "var(--text-primary)" }}>
                            <span style={{ color: "var(--accent)" }}>POST</span> /api/insights
                            <span style={{ color: "var(--text-muted)" }}> ← Save generated insight (fields: coreInsight, signalIds)</span>
                        </p>
                        <p style={{ color: "var(--text-primary)" }}>
                            <span style={{ color: "var(--accent)" }}>POST</span> /api/signals/receive
                            <span style={{ color: "var(--text-muted)" }}> ← Processed signals from Ingest</span>
                        </p>
                        <p style={{ color: "var(--text-primary)" }}>
                            <span style={{ color: "var(--accent)" }}>POST</span> /api/insights/preview
                            <span style={{ color: "var(--text-muted)" }}> ← Formatted previews</span>
                        </p>
                        <p style={{ color: "var(--text-primary)" }}>
                            <span style={{ color: "var(--accent)" }}>POST</span> /api/insights/confirm
                            <span style={{ color: "var(--text-muted)" }}> ← Publish confirmations</span>
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
