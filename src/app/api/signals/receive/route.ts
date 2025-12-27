import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/signals/receive
 * 
 * Receives processed signals from n8n after ingestion and extraction.
 * 
 * Expected payload from n8n (flexible):
 * Can be flat: { summary, key_insights, topics }
 * Or nested: { output: { summary, key_insights, topics } }
 */

interface N8nData {
    summary?: string;
    key_insights?: string[];
    actionable_takeaways?: string[];
    topics?: string[];
    sentiment?: string;
    source?: string;
    sourceUrl?: string;
    title?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("Receive webhook payload:", JSON.stringify(body, null, 2));

        // 1. Extract data - handle nested "output" structure if present
        let data: N8nData = body;

        if (body.output && typeof body.output === 'object') {
            data = { ...body.output, ...body }; // Merge top-level props like source/url
        } else if (Array.isArray(body) && body.length > 0) {
            data = body[0].output || body[0];
        }

        // 2. Validate essential data
        if (!data.summary && !data.key_insights && !data.title) {
            return NextResponse.json(
                { error: "Invalid payload: missing summary or insights" },
                { status: 400 }
            );
        }

        // 3. Format content for Markdown display
        const content = formatContent(data);
        const title = data.title || data.summary?.substring(0, 100) || "Extracted Insight";
        const tags = data.topics || [];

        // 4. Create Signal
        const signal = await prisma.signal.create({
            data: {
                title,
                content,
                source: data.source || "n8n",
                sourceUrl: data.sourceUrl,
                tags: JSON.stringify(tags),
                status: "unread",
            },
        });

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

/**
 * Format extracted data into Markdown content
 */
function formatContent(data: N8nData): string {
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
