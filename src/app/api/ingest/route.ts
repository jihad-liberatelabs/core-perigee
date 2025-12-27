import { NextRequest, NextResponse } from "next/server";
import { triggerIngest } from "@/lib/webhooks";
import prisma from "@/lib/prisma";

/**
 * POST /api/ingest
 * 
 * Frontend endpoint to trigger n8n ingest workflow.
 * Supports: text, url, youtube, file
 * 
 * n8n workflow expects:
 * - text: { inputType: "text", content: "..." }
 * - url: { inputType: "url", url: "..." }
 * - youtube: { inputType: "youtube", url: "..." }
 * - file: { inputType: "file", content: "base64..." }
 * 
 * n8n returns:
 * - summary, key_insights[], actionable_takeaways[], topics[], sentiment
 */

interface IngestRequest {
    inputType: "text" | "url" | "youtube" | "file";
    content?: string;  // For text and file (base64)
    url?: string;      // For url and youtube
    title?: string;    // Optional title for manual notes
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as IngestRequest;

        if (!body.inputType) {
            return NextResponse.json(
                { error: "inputType is required (text, url, youtube, file)" },
                { status: 400 }
            );
        }

        // Validate based on type
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

        // Build payload matching n8n workflow format
        const payload: Record<string, string> = {
            inputType: body.inputType,
        };

        if (body.content) {
            payload.content = body.content;
        }
        if (body.url) {
            payload.url = body.url;
        }

        const result = await triggerIngest(payload);

        console.log("triggerIngest result:", JSON.stringify(result, null, 2));

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 502 }
            );
        }

        // If n8n returns data directly (synchronous), create signal immediately
        if (result.data) {
            const data = result.data;
            console.log("Creating signal from n8n data:", JSON.stringify(data, null, 2));

            // Create signal from n8n response
            const signal = await prisma.signal.create({
                data: {
                    title: body.title || data.summary?.substring(0, 100) || "Extracted Insight",
                    content: formatN8nResponse(data),
                    source: body.inputType,
                    sourceUrl: body.url,
                    tags: JSON.stringify(data.topics || []),
                    status: "unread",
                },
            });

            return NextResponse.json({
                success: true,
                message: "Signal processed and stored",
                signalId: signal.id,
                insights: data.key_insights,
            }, { status: 201 });
        }

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
 * Format n8n response into readable signal content
 */
function formatN8nResponse(data: {
    summary?: string;
    key_insights?: string[];
    actionable_takeaways?: string[];
    topics?: string[];
    sentiment?: string;
}): string {
    const parts: string[] = [];

    if (data.summary) {
        parts.push(`## Summary\n${data.summary}`);
    }

    if (data.key_insights?.length) {
        parts.push(`## Key Insights\n${data.key_insights.map(i => `• ${i}`).join("\n")}`);
    }

    if (data.actionable_takeaways?.length) {
        parts.push(`## Actionable Takeaways\n${data.actionable_takeaways.map(t => `• ${t}`).join("\n")}`);
    }

    if (data.sentiment) {
        parts.push(`## Sentiment\n${data.sentiment}`);
    }

    return parts.join("\n\n");
}

// GET endpoint to verify
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
