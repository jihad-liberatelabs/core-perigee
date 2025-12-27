import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerFormat, triggerPublish } from "@/lib/webhooks";

/**
 * GET /api/insights
 * 
 * Fetch all insights with related data
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const where = status ? { status } : {};

        const insights = await prisma.insight.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                thoughts: {
                    include: {
                        signal: {
                            select: { id: true, title: true },
                        },
                    },
                },
                signals: {
                    select: { id: true, title: true }
                },
            },
        });

        return NextResponse.json({ insights });
    } catch (error) {
        console.error("Error fetching insights:", error);
        return NextResponse.json(
            { error: "Failed to fetch insights" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/insights
 * 
 * Create a new insight
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.coreInsight) {
            return NextResponse.json(
                { error: "coreInsight is required" },
                { status: 400 }
            );
        }

        // Create insight
        const insight = await prisma.insight.create({
            data: {
                coreInsight: body.coreInsight,
                status: "draft",
                // Link thoughts if provided
                thoughts: body.thoughtIds?.length ? {
                    connect: body.thoughtIds.map((id: string) => ({ id }))
                } : undefined,
                // Link signals directly if provided (AI workflow)
                signals: body.signalIds?.length ? {
                    connect: body.signalIds.map((id: string) => ({ id }))
                } : undefined,
            },
            include: {
                thoughts: {
                    include: {
                        signal: {
                            select: { id: true, title: true }
                        }
                    }
                },
                signals: {
                    select: { id: true, title: true }
                }
            }
        });

        return NextResponse.json({
            success: true,
            insight: insight,
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating insight:", error);
        return NextResponse.json(
            { error: "Failed to create insight" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/insights
 * 
 * Update an insight or trigger format/publish
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: "id is required" },
                { status: 400 }
            );
        }

        // Handle format action
        if (body.action === "format") {
            const insight = await prisma.insight.findUnique({
                where: { id: body.id },
                include: {
                    thoughts: true,
                    signals: true, // Fetch full signal content
                },
            });

            if (!insight) {
                return NextResponse.json(
                    { error: "Insight not found" },
                    { status: 404 }
                );
            }

            // Combine context from thoughts and signals
            const context = [
                ...insight.thoughts.map(t => t.content),
                ...insight.signals.map(s => `[Signal: ${s.title}] ${s.content}`)
            ];

            const result = await triggerFormat({
                insightId: insight.id,
                coreInsight: insight.coreInsight,
                context: context,
                platform: body.platform ?? "linkedin",
                tone: body.tone,
            });

            if (!result.success) {
                return NextResponse.json(
                    { error: result.error },
                    { status: 502 }
                );
            }

            return NextResponse.json({
                success: true,
                message: "Format request sent to n8n",
            });
        }

        // Handle publish action
        if (body.action === "publish") {
            const insight = await prisma.insight.findUnique({
                where: { id: body.id },
            });

            if (!insight || !insight.preview) {
                return NextResponse.json(
                    { error: "Insight must have a preview before publishing" },
                    { status: 400 }
                );
            }

            const result = await triggerPublish({
                insightId: insight.id,
                formattedContent: insight.preview,
                platform: insight.previewPlatform ?? "linkedin",
            });

            if (!result.success) {
                return NextResponse.json(
                    { error: result.error },
                    { status: 502 }
                );
            }

            return NextResponse.json({
                success: true,
                message: "Publish request sent to n8n",
            });
        }

        // Regular update
        const insight = await prisma.insight.update({
            where: { id: body.id },
            data: {
                coreInsight: body.coreInsight,
                preview: body.preview, // Allow updating preview directly (edited by user)
            },
        });

        return NextResponse.json({
            success: true,
            insight,
        });
    } catch (error) {
        console.error("Error updating insight:", error);
        return NextResponse.json(
            { error: "Failed to update insight" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/insights
 * 
 * Delete an insight
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

        // Unlink thoughts first
        await prisma.thought.updateMany({
            where: { insightId: id },
            data: { insightId: null },
        });

        await prisma.insight.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting insight:", error);
        return NextResponse.json(
            { error: "Failed to delete insight" },
            { status: 500 }
        );
    }
}
