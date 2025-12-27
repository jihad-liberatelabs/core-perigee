import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/insights/preview
 * 
 * Receives formatted content preview from n8n after the formatting workflow.
 * Updates the insight with the preview content for user review.
 * 
 * Expected payload from n8n:
 * {
 *   insightId: string;       // The insight being formatted
 *   preview: string;         // Formatted content (e.g., LinkedIn post)
 *   platform: string;        // Target platform: linkedin, twitter, etc.
 * }
 */

interface PreviewPayload {
    insightId: string;
    preview: string;
    platform: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as PreviewPayload;

        // Validate required fields
        if (!body.insightId || !body.preview || !body.platform) {
            return NextResponse.json(
                { error: "Missing required fields: insightId, preview, and platform are required" },
                { status: 400 }
            );
        }

        // Find and update the insight
        const insight = await prisma.insight.findUnique({
            where: { id: body.insightId },
        });

        if (!insight) {
            return NextResponse.json(
                { error: "Insight not found" },
                { status: 404 }
            );
        }

        // Update insight with preview
        const updatedInsight = await prisma.insight.update({
            where: { id: body.insightId },
            data: {
                preview: body.preview,
                previewPlatform: body.platform,
                status: "previewing",
            },
        });

        return NextResponse.json({
            success: true,
            insightId: updatedInsight.id,
            status: updatedInsight.status,
            message: "Preview received successfully",
        });

    } catch (error) {
        console.error("Error receiving preview:", error);
        return NextResponse.json(
            { error: "Failed to process preview" },
            { status: 500 }
        );
    }
}

// GET endpoint to verify the webhook is working
export async function GET() {
    return NextResponse.json({
        status: "ok",
        endpoint: "/api/insights/preview",
        description: "POST formatted preview from n8n to this endpoint",
        expectedPayload: {
            insightId: "string (required)",
            preview: "string (required)",
            platform: "string (required): linkedin, twitter, etc.",
        },
    });
}
