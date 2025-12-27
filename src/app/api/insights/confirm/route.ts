import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/insights/confirm
 * 
 * Receives publish confirmation from n8n after content is posted.
 * Updates the insight status and stores the published URL.
 * 
 * Expected payload from n8n:
 * {
 *   insightId: string;       // The insight that was published
 *   postUrl: string;         // URL of the published post
 *   status: string;          // success, failed
 *   error?: string;          // Error message if failed
 * }
 */

interface ConfirmPayload {
    insightId: string;
    postUrl?: string;
    status: "success" | "failed";
    error?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as ConfirmPayload;

        // Validate required fields
        if (!body.insightId || !body.status) {
            return NextResponse.json(
                { error: "Missing required fields: insightId and status are required" },
                { status: 400 }
            );
        }

        // Find the insight
        const insight = await prisma.insight.findUnique({
            where: { id: body.insightId },
        });

        if (!insight) {
            return NextResponse.json(
                { error: "Insight not found" },
                { status: 404 }
            );
        }

        // Update insight based on status
        if (body.status === "success") {
            const updatedInsight = await prisma.insight.update({
                where: { id: body.insightId },
                data: {
                    status: "published",
                    publishedUrl: body.postUrl,
                    publishedAt: new Date(),
                },
            });

            return NextResponse.json({
                success: true,
                insightId: updatedInsight.id,
                status: "published",
                publishedUrl: updatedInsight.publishedUrl,
                message: "Insight published successfully",
            });
        } else {
            // Mark as failed - revert to draft
            const updatedInsight = await prisma.insight.update({
                where: { id: body.insightId },
                data: {
                    status: "draft",
                    preview: null,
                },
            });

            return NextResponse.json({
                success: false,
                insightId: updatedInsight.id,
                status: "draft",
                error: body.error ?? "Publish failed",
                message: "Insight publish failed, reverted to draft",
            });
        }

    } catch (error) {
        console.error("Error confirming publish:", error);
        return NextResponse.json(
            { error: "Failed to process confirmation" },
            { status: 500 }
        );
    }
}

// GET endpoint to verify the webhook is working
export async function GET() {
    return NextResponse.json({
        status: "ok",
        endpoint: "/api/insights/confirm",
        description: "POST publish confirmation from n8n to this endpoint",
        expectedPayload: {
            insightId: "string (required)",
            status: "string (required): success or failed",
            postUrl: "string (optional): URL of published post",
            error: "string (optional): error message if failed",
        },
    });
}
