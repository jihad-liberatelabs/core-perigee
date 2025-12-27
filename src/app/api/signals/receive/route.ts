import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatN8nDataToMarkdown } from "@/lib/formatters";
import { SIGNAL_STATUS, TITLE_MAX_LENGTH } from "@/lib/constants";
import type { N8nResponse } from "@/lib/types";

/**
 * POST /api/signals/receive
 * 
 * Webhook endpoint that receives processed signals from n8n after ingestion.
 * This endpoint is called by n8n workflows when they complete content extraction.
 * 
 * The payload structure is flexible to handle different n8n workflow formats:
 * - Flat structure: { summary, key_insights, topics, ... }
 * - Nested structure: { output: { summary, key_insights, ... } }
 * - Array structure: [{ output: { ... } }]
 * 
 * @param request - Next.js request object containing n8n payload
 * @returns JSON response with created signal ID
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("Receive webhook payload:", JSON.stringify(body, null, 2));

        // Extract data from potentially nested structure
        const data = extractN8nData(body);

        // Validate essential data is present
        if (!data.summary && !data.key_insights && !data.title) {
            return NextResponse.json(
                { error: "Invalid payload: missing summary or insights" },
                { status: 400 }
            );
        }

        // Create Signal from extracted data
        const signal = await createSignalFromWebhook(data);

        console.log("Created signal:", signal.id);

        return NextResponse.json({
            success: true,
            signalId: signal.id,
            message: "Signal processed and stored",
        }, { status: 201 });

    } catch (error) {
        console.error("Error receiving signal:", error);
        return NextResponse.json(
            { error: "Failed to process signal" },
            { status: 500 }
        );
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts n8n data from various payload structures
 * 
 * Handles multiple formats:
 * 1. Direct object: { summary, key_insights, ... }
 * 2. Nested in output: { output: { summary, ... } }
 * 3. Array format: [{ output: { ... } }]
 * 
 * @param body - Raw webhook payload
 * @returns Normalized N8nResponse data
 */
function extractN8nData(body: unknown): N8nResponse {
    // Handle array format
    if (Array.isArray(body) && body.length > 0) {
        const firstItem = body[0];
        return (firstItem.output as N8nResponse) || (firstItem as N8nResponse);
    }

    // Handle object format
    if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;

        // Check if data is nested in 'output' field
        if (obj.output && typeof obj.output === 'object') {
            // Merge top-level props (like source, sourceUrl) with nested output
            return { ...obj, ...(obj.output as object) } as N8nResponse;
        }

        return body as N8nResponse;
    }

    return {};
}

/**
 * Creates a Signal database record from webhook data
 * 
 * @param data - Extracted n8n response data
 * @returns Created Signal record
 */
async function createSignalFromWebhook(data: N8nResponse) {
    const title = data.title
        || data.summary?.substring(0, TITLE_MAX_LENGTH)
        || "Extracted Insight";

    // 'content' is the actual cleaned up content for display.
    // Fall back to formatted markdown if data.content is missing.
    const content = data.content || formatN8nDataToMarkdown(data);
    const tags = data.topics || [];

    return await prisma.signal.create({
        data: {
            title,
            content,
            summary: data.summary,
            source: data.source || "n8n",
            sourceUrl: data.sourceUrl,
            rawContent: data.rawContent,
            tags: JSON.stringify(tags),
            status: SIGNAL_STATUS.UNREAD,
        },
    });
}
