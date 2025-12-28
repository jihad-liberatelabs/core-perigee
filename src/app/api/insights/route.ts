import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerPublish } from "@/lib/webhooks";

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
                preview: body.preview || body.coreInsight, // Default preview to coreInsight if not provided
                previewPlatform: body.previewPlatform || "linkedin",
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


        // Handle publish action
        if (body.action === "publish") {
            const insight = await prisma.insight.findUnique({
                where: { id: body.id },
            });

            if (!insight || (!insight.preview && !insight.coreInsight)) {
                return NextResponse.json(
                    { error: "Insight must have content before publishing" },
                    { status: 400 }
                );
            }

            // Set status to publishing immediately
            await prisma.insight.update({
                where: { id: insight.id },
                data: { status: "publishing" }
            });

            const result = await triggerPublish({
                insightId: insight.id,
                formattedContent: insight.preview || insight.coreInsight,
                platform: insight.previewPlatform || "linkedin",
            });

            if (!result.success) {
                // Revert status on failure
                await prisma.insight.update({
                    where: { id: insight.id },
                    data: { status: "draft" }
                });

                return NextResponse.json(
                    { error: result.error },
                    { status: 502 }
                );
            }

            // Handle synchronous success response from n8n
            if (result.data && result.data.status === "success" && result.data.postUrl) {
                const pubInsight = await prisma.insight.update({
                    where: { id: insight.id },
                    data: {
                        status: "published",
                        publishedUrl: result.data.postUrl,
                        publishedAt: new Date(),
                    },
                });

                return NextResponse.json({
                    success: true,
                    message: "Insight published successfully",
                    insight: pubInsight
                });
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
