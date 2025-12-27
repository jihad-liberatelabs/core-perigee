import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/highlights
 * 
 * Create a new highlight for a signal
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.signalId || !body.text) {
            return NextResponse.json(
                { error: "signalId and text are required" },
                { status: 400 }
            );
        }

        const highlight = await prisma.highlight.create({
            data: {
                signalId: body.signalId,
                text: body.text,
                note: body.note,
                startPos: body.startPos,
                endPos: body.endPos,
            },
        });

        return NextResponse.json({
            success: true,
            highlight,
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating highlight:", error);
        return NextResponse.json(
            { error: "Failed to create highlight" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/highlights
 * 
 * Delete a highlight by ID
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

        await prisma.highlight.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting highlight:", error);
        return NextResponse.json(
            { error: "Failed to delete highlight" },
            { status: 500 }
        );
    }
}
