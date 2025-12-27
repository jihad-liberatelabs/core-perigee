import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Params {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/signals/[id]
 * 
 * Fetch a single signal by ID with all related data
 */
export async function GET(request: Request, { params }: Params) {
    const { id } = await params;

    try {
        const signal = await prisma.signal.findUnique({
            where: { id },
            include: {
                highlights: {
                    orderBy: { createdAt: "asc" },
                },
                thoughts: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!signal) {
            return NextResponse.json(
                { error: "Signal not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            ...signal,
            tags: JSON.parse(signal.tags),
        });
    } catch (error) {
        console.error("Error fetching signal:", error);
        return NextResponse.json(
            { error: "Failed to fetch signal" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/signals/[id]
 * 
 * Update a signal
 */
export async function PATCH(request: Request, { params }: Params) {
    const { id } = await params;

    try {
        const body = await request.json();

        const signal = await prisma.signal.update({
            where: { id },
            data: body,
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
