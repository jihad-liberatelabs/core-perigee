import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/settings/webhooks
 * 
 * Get all webhook configurations
 */
export async function GET() {
    try {
        const configs = await prisma.webhookConfig.findMany({
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ configs });
    } catch (error) {
        console.error("Error fetching webhook configs:", error);
        return NextResponse.json(
            { error: "Failed to fetch webhook configs" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/settings/webhooks
 * 
 * Create or update a webhook configuration
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.name || !body.url) {
            return NextResponse.json(
                { error: "name and url are required" },
                { status: 400 }
            );
        }

        // Validate URL format
        try {
            new URL(body.url);
        } catch {
            return NextResponse.json(
                { error: "Invalid URL format" },
                { status: 400 }
            );
        }

        // Upsert the config
        const config = await prisma.webhookConfig.upsert({
            where: { name: body.name },
            update: { url: body.url },
            create: { name: body.name, url: body.url },
        });

        return NextResponse.json({
            success: true,
            config,
        });
    } catch (error) {
        console.error("Error saving webhook config:", error);
        return NextResponse.json(
            { error: "Failed to save webhook config" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/settings/webhooks
 * 
 * Delete a webhook configuration
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get("name");

        if (!name) {
            return NextResponse.json(
                { error: "name is required" },
                { status: 400 }
            );
        }

        await prisma.webhookConfig.delete({
            where: { name },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting webhook config:", error);
        return NextResponse.json(
            { error: "Failed to delete webhook config" },
            { status: 500 }
        );
    }
}
