import prisma from "./prisma";

/**
 * Webhook trigger utilities for outbound calls to n8n
 */

interface FormatPayload {
    insightId: string;
    coreInsight: string;
    context: string[];
    platform: string;
    tone?: "analytical" | "reflective" | "decisive";
}

interface PublishPayload {
    insightId: string;
    formattedContent: string;
    platform: string;
}

interface N8nResponse {
    summary?: string;
    key_insights?: string[];
    actionable_takeaways?: string[];
    topics?: string[];
    sentiment?: string;
}

/**
 * Get webhook URL from database configuration
 */
async function getWebhookUrl(name: string): Promise<string | null> {
    const config = await prisma.webhookConfig.findUnique({
        where: { name },
    });
    return config?.url ?? null;
}

/**
 * Trigger ingestion webhook to process raw input
 * n8n workflow expects: { inputType, content/url }
 * Returns: { summary, key_insights, actionable_takeaways, topics, sentiment }
 */
export async function triggerIngest(payload: Record<string, string>): Promise<{
    success: boolean;
    error?: string;
    data?: N8nResponse;
}> {
    console.log("Triggering ingest webhook");
    const webhookUrl = await getWebhookUrl("ingest");

    if (!webhookUrl) {
        return {
            success: false,
            error: "Ingest webhook URL not configured. Please set up in Settings."
        };
    }

    try {
        console.log("Sending to n8n:", webhookUrl, payload);

        // Use AbortController for timeout (90 seconds for n8n processing)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

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

        // Try to parse JSON - handle empty or non-JSON responses gracefully
        const responseText = await response.text();
        console.log("n8n raw response:", responseText);

        if (!responseText || responseText.trim() === "") {
            console.log("Empty response from n8n - workflow may be async");
            return { success: true };
        }

        let responseData: unknown;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error("Failed to parse n8n response as JSON:", parseError);
            return { success: true }; // Treat as async
        }

        // n8n returns: [{ "output": { summary, key_insights, ... } }]
        // Unwrap the nested structure
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

/**
 * Trigger format webhook to generate social content
 */
export async function triggerFormat(payload: FormatPayload): Promise<{
    success: boolean;
    error?: string;
}> {
    const webhookUrl = await getWebhookUrl("format");

    if (!webhookUrl) {
        return {
            success: false,
            error: "Format webhook URL not configured. Please set up in Settings."
        };
    }

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

/**
 * Trigger publish webhook to post to social platforms
 */
export async function triggerPublish(payload: PublishPayload): Promise<{
    success: boolean;
    error?: string;
}> {
    const webhookUrl = await getWebhookUrl("publish");

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

/**
 * Trigger AI generation webhook with selected signals
 */
/**
 * Trigger AI generation webhook with selected signals
 */
export async function triggerGenerate(signals: any[]): Promise<{
    success: boolean;
    error?: string;
}> {
    const webhookUrl = await getWebhookUrl("generate");

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

/**
 * Trigger cluster webhook to group signals into insights
 */
export async function triggerCluster(signals: any[]): Promise<{
    success: boolean;
    error?: string;
}> {
    const webhookUrl = await getWebhookUrl("cluster");

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

export type { FormatPayload, PublishPayload };
