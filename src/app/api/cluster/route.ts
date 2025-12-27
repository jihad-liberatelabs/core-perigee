import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerCluster } from "@/lib/webhooks";
import { parseSignalTags } from "@/lib/formatters";
import { SIGNAL_STATUS } from "@/lib/constants";

/**
 * POST /api/cluster
 * 
 * Triggers the clustering workflow to group related reviewed signals into insights.
 * 
 * Workflow:
 * 1. Fetches all signals with "reviewed" status
 * 2. Sends signals to n8n clustering workflow
 * 3. Updates signal status to "clustered" to prevent reprocessing
 * 
 * The n8n workflow analyzes signal content, tags, and thoughts to identify
 * thematic patterns and automatically create insight drafts.
 * 
 * @returns JSON response with count of clustered signals
 */
export async function POST() {
    try {
        // Fetch all reviewed signals with their associated thoughts
        const signals = await prisma.signal.findMany({
            where: { status: SIGNAL_STATUS.REVIEWED },
            include: { thoughts: true }
        });

        if (signals.length === 0) {
            return NextResponse.json({
                message: "No reviewed signals to cluster"
            });
        }

        // Parse JSON tags into arrays for n8n processing
        const structuredSignals = signals.map(signal => ({
            ...signal,
            tags: parseSignalTags(signal.tags),
        }));

        // Trigger n8n clustering workflow
        const result = await triggerCluster(structuredSignals);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 502 }
            );
        }

        // Mark signals as clustered to prevent duplicate processing
        await prisma.signal.updateMany({
            where: { id: { in: signals.map(s => s.id) } },
            data: { status: SIGNAL_STATUS.CLUSTERED }
        });

        return NextResponse.json({
            success: true,
            count: signals.length,
            message: `Clustering triggered for ${signals.length} signals`
        });

    } catch (error) {
        console.error("Error clustering signals:", error);
        return NextResponse.json(
            { error: "Failed to cluster signals" },
            { status: 500 }
        );
    }
}
