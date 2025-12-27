import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerIngest } from "@/lib/webhooks";
import { formatN8nDataToMarkdown } from "@/lib/formatters";
import { SIGNAL_STATUS, TITLE_MAX_LENGTH } from "@/lib/constants";
import type { IngestRequest, N8nResponse } from "@/lib/types";

/**
 * POST /api/ingest
 * 
 * Frontend endpoint to trigger n8n ingest workflow for content processing.
 * 
 * Supports multiple input types:
 * - text: Direct text content
 * - url: Web article URLs
 * - youtube: YouTube video URLs
 * - file: Base64-encoded file content
 * 
 * The n8n workflow processes the content and returns structured data
 * (summary, key insights, topics, sentiment) which is stored as a Signal.
 * 
 * @param request - Next.js request object
 * @returns JSON response with success status and signal ID
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as IngestRequest;

        // Validate required fields
        if (!body.inputType) {
            return NextResponse.json(
                { error: "inputType is required (text, url, youtube, file)" },
                { status: 400 }
            );
        }

        // Validate based on input type
        if ((body.inputType === "text" || body.inputType === "file") && !body.content) {
            return NextResponse.json(
                { error: "content is required for text and file types" },
                { status: 400 }
            );
        }

        if ((body.inputType === "url" || body.inputType === "youtube") && !body.url) {
            return NextResponse.json(
                { error: "url is required for url and youtube types" },
                { status: 400 }
            );
        }

        // Build payload for n8n workflow
        const payload: Record<string, string> = {
            inputType: body.inputType,
        };

        if (body.content) {
            payload.content = body.content;
        }
        if (body.url) {
            payload.url = body.url;
        }

        // Trigger n8n ingestion workflow
        const result = await triggerIngest(payload);

        console.log("triggerIngest result:", JSON.stringify(result, null, 2));

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 502 }
            );
        }

        // If n8n returns data synchronously, create signal immediately
        if (result.data) {
            const data = result.data;
            console.log("Creating signal from n8n data:", JSON.stringify(data, null, 2));

            const signal = await createSignalFromN8nData(data, body);

            return NextResponse.json({
                success: true,
                message: "Signal processed and stored",
                signalId: signal.id,
                insights: data.key_insights,
            }, { status: 201 });
        }

        // n8n processing asynchronously - signal will be created via webhook
        return NextResponse.json({
            success: true,
            message: "Content sent to n8n for processing",
        });

    } catch (error) {
        console.error("Error triggering ingest:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/ingest
 * 
 * Returns API documentation and supported input types
 */
export async function GET() {
    return NextResponse.json({
        status: "ok",
        endpoint: "/api/ingest",
        description: "POST content to trigger n8n ingest workflow",
        supportedTypes: {
            text: { inputType: "text", content: "Your text..." },
            url: { inputType: "url", url: "https://..." },
            youtube: { inputType: "youtube", url: "https://youtube.com/watch?v=..." },
            file: { inputType: "file", content: "base64-encoded-data" },
        },
    });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a Signal database record from n8n response data
 * 
 * @param data - Structured data from n8n workflow
 * @param request - Original ingest request
 * @returns Created Signal record
 */
async function createSignalFromN8nData(data: N8nResponse, request: IngestRequest) {
    const title = request.title
        || data.summary?.substring(0, TITLE_MAX_LENGTH)
        || "Extracted Insight";

    // 'content' should be the cleaned up body of the signal.
    // Fall back to formatted markdown if data.content is missing.
    const content = data.content || formatN8nDataToMarkdown(data);
    const tags = data.topics || [];

    return await prisma.signal.create({
        data: {
            title,
            content,
            summary: data.summary,
            source: request.inputType,
            sourceUrl: request.url,
            rawContent: request.content || data.rawContent,
            tags: JSON.stringify(tags),
            status: SIGNAL_STATUS.UNREAD,
        },
    });
}
