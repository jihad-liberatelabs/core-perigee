import { NextRequest, NextResponse } from "next/server";
import { triggerGenerate } from "@/lib/webhooks";

import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { signalIds } = body;

        if (!signalIds || !Array.isArray(signalIds) || signalIds.length === 0) {
            return NextResponse.json(
                { error: "signalIds array is required" },
                { status: 400 }
            );
        }

        // Fetch full signal objects
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
