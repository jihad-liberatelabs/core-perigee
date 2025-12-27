import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/thoughts
 * 
 * Create a new thought
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.content) {
            return NextResponse.json(
                { error: "content is required" },
                { status: 400 }
            );
        }

        const thought = await prisma.thought.create({
            data: {
                content: body.content,
                signalId: body.signalId,
                insightId: body.insightId,
            },
        });

        return NextResponse.json({
            success: true,
            thought,
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating thought:", error);
        return NextResponse.json(
            { error: "Failed to create thought" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/thoughts
 * 
 * Fetch thoughts, optionally filtered by signalId or insightId
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const signalId = searchParams.get("signalId");
        const insightId = searchParams.get("insightId");
        const unlinked = searchParams.get("unlinked");

        const where: Record<string, unknown> = {};
        if (signalId) where.signalId = signalId;
        if (insightId) where.insightId = insightId;
        if (unlinked === "true") where.insightId = null;

        const thoughts = await prisma.thought.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                signal: {
                    select: { id: true, title: true },
                },
            },
        });

        return NextResponse.json({ thoughts });
    } catch (error) {
        console.error("Error fetching thoughts:", error);
        return NextResponse.json(
            { error: "Failed to fetch thoughts" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/thoughts
 * 
 * Delete a thought by ID
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "id is required" },
                { status: 400 }
            );
        }

        await prisma.thought.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting thought:", error);
        return NextResponse.json(
            { error: "Failed to delete thought" },
            { status: 500 }
        );
    }
}
