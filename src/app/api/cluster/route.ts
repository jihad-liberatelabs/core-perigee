import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerCluster } from "@/lib/webhooks";

export async function POST() {
    try {
        // 1. Fetch all reviewed signals
        const signals = await prisma.signal.findMany({
            where: { status: "reviewed" },
            include: { thoughts: true }
        });

        if (signals.length === 0) {
            return NextResponse.json({ message: "No reviewed signals to cluster" });
        }

        // 2. Parse tags and structure data
        const structuredSignals = signals.map(s => ({
            ...s,
            tags: JSON.parse(s.tags),
        }));

        // 3. Send to n8n
        const result = await triggerCluster(structuredSignals);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 502 }
            );
        }

        // 4. Update status to 'clustered' to prevent re-processing
        await prisma.signal.updateMany({
            where: { id: { in: signals.map(s => s.id) } },
            data: { status: "clustered" }
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
