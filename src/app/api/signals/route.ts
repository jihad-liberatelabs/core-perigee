import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/signals
 * 
 * Fetch all signals with optional filtering
 * Query params:
 * - status: filter by status (unread, reviewed, archived)
 * - limit: max signals to return (default 50)
 * - offset: pagination offset
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") ?? "50");
        const offset = parseInt(searchParams.get("offset") ?? "0");

        const where = status ? { status } : {};

        const [signals, total] = await Promise.all([
            prisma.signal.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
                include: {
                    highlights: true,
                    thoughts: true,
                },
            }),
            prisma.signal.count({ where }),
        ]);

        return NextResponse.json({
            signals: signals.map(signal => ({
                ...signal,
                tags: JSON.parse(signal.tags),
            })),
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error("Error fetching signals:", error);
        return NextResponse.json(
            { error: "Failed to fetch signals" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/signals
 * 
 * Update a signal's status
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();

        if (!body.id || !body.status) {
            return NextResponse.json(
                { error: "id and status are required" },
                { status: 400 }
            );
        }

        // If a thought is provided, create it
        if (body.thought) {
            await prisma.thought.create({
                data: {
                    content: body.thought,
                    signalId: body.id,
                },
            });
        }

        const signal = await prisma.signal.update({
            where: { id: body.id },
            data: { status: body.status },
        });

        return NextResponse.json({
            success: true,
            signal: {
                ...signal,
                tags: JSON.parse(signal.tags),
            },
        });
    } catch (error) {
        console.error("Error updating signal:", error);
        return NextResponse.json(
            { error: "Failed to update signal" },
            { status: 500 }
        );
    }
}
