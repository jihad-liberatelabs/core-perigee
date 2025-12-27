import prisma from "./prisma";
import { WEBHOOK_NAMES, WEBHOOK_TIMEOUT_MS } from "./constants";
import type { FormatPayload, PublishPayload, WebhookResult, N8nResponse } from "./types";

/**
 * Webhook trigger utilities for outbound calls to n8n workflows
 * 
 * This module provides functions to trigger various n8n workflows:
 * - Ingest: Process raw input (URLs, text, YouTube)
 * - Cluster: Group related signals
 * - Generate: AI-powered insight generation
 * - Format: Social media content formatting
 * - Publish: Post content to platforms
 */

// ============================================================================
// Webhook URL Management
// ============================================================================

/**
 * Retrieves webhook URL from database configuration
 * 
 * @param name - Webhook configuration name
 * @returns Webhook URL or null if not configured
 */
async function getWebhookUrl(name: string): Promise<string | null> {
    const config = await prisma.webhookConfig.findUnique({
        where: { name },
    });
    return config?.url ?? null;
}

// ============================================================================
// Ingest Workflow
// ============================================================================

/**
 * Triggers the ingestion webhook to process raw input
 * 
 * Sends content to n8n for extraction and analysis. The workflow processes
 * various input types (text, URLs, YouTube videos) and returns structured data.
 * 
 * Expected payload format:
 * - { inputType: "text", content: "..." }
 * - { inputType: "url", url: "https://..." }
 * - { inputType: "youtube", url: "https://youtube.com/..." }
 * 
 * Expected response from n8n:
 * - { summary, key_insights, actionable_takeaways, topics, sentiment }
 * 
 * @param payload - Input data with type and content/URL
 * @returns Result object with success status and optional data
 */
export async function triggerIngest(payload: Record<string, string>): Promise<WebhookResult> {
    console.log("Triggering ingest webhook");
    const webhookUrl = await getWebhookUrl(WEBHOOK_NAMES.INGEST);

    if (!webhookUrl) {
        return {
            success: false,
            error: "Ingest webhook URL not configured. Please set up in Settings."
        };
    }

    try {
        console.log("Sending to n8n:", webhookUrl, payload);

        // Use AbortController for timeout management
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log("n8n response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("n8n error response:", errorText);
            throw new Error(`Webhook returned ${response.status}: ${errorText}`);
        }

        // Parse response - handle empty or async responses gracefully
        const responseText = await response.text();
        console.log("n8n raw response:", responseText);

        if (!responseText || responseText.trim() === "") {
            console.log("Empty response from n8n - workflow may be async");
            return { success: true };
        }

        // Attempt JSON parsing
        let responseData: unknown;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error("Failed to parse n8n response as JSON:", parseError);
            return { success: true }; // Treat as async
        }

        // Unwrap nested n8n response structure: [{ "output": { ... } }]
        if (Array.isArray(responseData) && responseData.length > 0) {
            responseData = responseData[0];
        }
        if (responseData && typeof responseData === "object" && "output" in responseData) {
            responseData = (responseData as { output: N8nResponse }).output;
        }

        console.log("Parsed n8n data:", responseData);

        return { success: true, data: responseData as N8nResponse };
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("n8n request timed out after 90 seconds");
            return {
                success: false,
                error: "Request timed out. n8n workflow may still be processing."
            };
        }
        console.error("Ingest webhook error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to trigger ingest"
        };
    }
}

// ============================================================================
// Format Workflow
// ============================================================================

/**
 * Triggers the format webhook to generate social media content
 * 
 * Sends insight data to n8n for AI-powered content formatting.
 * The workflow adapts the insight for specific platforms and tones.
 * 
 * @param payload - Insight data with platform and tone preferences
 * @returns Result object with success status
 */
export async function triggerFormat(payload: FormatPayload): Promise<WebhookResult> {
    const webhookUrl = await getWebhookUrl(WEBHOOK_NAMES.FORMAT);

    if (!webhookUrl) {
        return {
            success: false,
            error: "Format webhook URL not configured. Please set up in Settings."
        };
    }

    // Update insight status to indicate formatting in progress
    await prisma.insight.update({
        where: { id: payload.insightId },
        data: { status: "formatting" },
    });

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Format webhook error:", error);

        // Revert status on failure
        await prisma.insight.update({
            where: { id: payload.insightId },
            data: { status: "draft" },
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to trigger format"
        };
    }
}

// ============================================================================
// Publish Workflow
// ============================================================================

/**
 * Triggers the publish webhook to post content to social platforms
 * 
 * @param payload - Formatted content and platform information
 * @returns Result object with success status
 */
export async function triggerPublish(payload: PublishPayload): Promise<WebhookResult> {
    const webhookUrl = await getWebhookUrl(WEBHOOK_NAMES.PUBLISH);

    if (!webhookUrl) {
        return {
            success: false,
            error: "Publish webhook URL not configured. Please set up in Settings."
        };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Publish webhook error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to trigger publish"
        };
    }
}

// ============================================================================
// Generate Workflow
// ============================================================================

/**
 * Triggers AI generation webhook with selected signals
 * 
 * Sends signals to n8n for AI-powered insight synthesis.
 * 
 * @param signals - Array of signal objects to analyze
 * @returns Result object with success status
 */
export async function triggerGenerate(signals: unknown[]): Promise<WebhookResult> {
    const webhookUrl = await getWebhookUrl(WEBHOOK_NAMES.GENERATE);

    if (!webhookUrl) {
        return {
            success: false,
            error: "Generate webhook URL not configured. Please set up in Settings."
        };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ signals }),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Generate webhook error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to trigger generation"
        };
    }
}

// ============================================================================
// Cluster Workflow
// ============================================================================

/**
 * Triggers cluster webhook to group signals into insights
 * 
 * Sends reviewed signals to n8n for AI-powered thematic clustering.
 * The workflow identifies patterns and creates insight drafts.
 * 
 * @param signals - Array of signal objects to cluster
 * @returns Result object with success status
 */
export async function triggerCluster(signals: unknown[]): Promise<WebhookResult> {
    const webhookUrl = await getWebhookUrl(WEBHOOK_NAMES.CLUSTER);

    if (!webhookUrl) {
        return {
            success: false,
            error: "Cluster webhook URL not configured. Please set up in Settings."
        };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ signals }),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("Cluster webhook error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to trigger clustering"
        };
    }
}

// Re-export types for convenience
export type { FormatPayload, PublishPayload };
