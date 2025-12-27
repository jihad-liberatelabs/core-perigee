import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerGenerate } from "@/lib/webhooks";

/**
 * POST /api/insights/generate
 * 
 * Triggers AI-powered insight generation from selected signals.
 * 
 * The n8n workflow analyzes the provided signals and generates
 * synthetic insights by identifying patterns, themes, and connections.
 * 
 * Request body:
 * - signalIds: Array of signal IDs to analyze (required)
 * 
 * @param request - Next.js request object
 * @returns JSON response confirming generation was triggered
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { signalIds } = body;

        // Validate signal IDs
        if (!signalIds || !Array.isArray(signalIds) || signalIds.length === 0) {
            return NextResponse.json(
                { error: "signalIds array is required" },
                { status: 400 }
            );
        }

        // Fetch full signal objects for n8n processing
        const signals = await prisma.signal.findMany({
            where: {
                id: { in: signalIds }
            }
        });

        if (signals.length === 0) {
            return NextResponse.json(
                { error: "No signals found for the provided IDs" },
                { status: 404 }
            );
        }

        // Trigger n8n generation workflow
        const result = await triggerGenerate(signals);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Generation triggered successfully",
        });

    } catch (error) {
        console.error("Error triggering generation:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}
