import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseSignalTags } from "@/lib/formatters";
import { DEFAULT_PAGE_LIMIT, SIGNAL_STATUS } from "@/lib/constants";
import { triggerGenerate } from "@/lib/webhooks";
import type { SignalsResponse, SignalWithParsedTags } from "@/lib/types";

export const dynamic = 'force-dynamic';

/**
 * GET /api/signals
 * 
 * Fetches signals with optional filtering and pagination.
 * 
 * Query parameters:
 * - status: Filter by signal status (unread, reviewed, archived, processed)
 * - limit: Maximum signals to return (default: 50)
 * - offset: Pagination offset (default: 0)
 * 
 * @param request - Next.js request object
 * @returns JSON response with signals array and pagination metadata
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") ?? String(DEFAULT_PAGE_LIMIT));
        const offset = parseInt(searchParams.get("offset") ?? "0");

        const where = status ? { status } : {};

        // Fetch signals and total count in parallel
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

        // Parse JSON tags for client consumption
        const response: SignalsResponse = {
            signals: (signals as any[]).map(signal => ({
                ...signal,
                tags: parseSignalTags(signal.tags),
            })) as SignalWithParsedTags[],
            total,
            limit,
            offset,
        };

        return NextResponse.json(response);
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
 * Updates a signal's status and optionally creates an associated thought.
 * 
 * Request body:
 * - id: Signal ID (required)
 * - status: New status value (required)
 * - thought: Optional thought content to attach to signal
 * 
 * @param request - Next.js request object
 * @returns JSON response with updated signal
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.id || !body.status) {
            return NextResponse.json(
                { error: "id and status are required" },
                { status: 400 }
            );
        }

        // Create associated thought if provided
        if (body.thought) {
            await prisma.thought.create({
                data: {
                    content: body.thought,
                    signalId: body.id,
                },
            });
        }

        // Update signal status
        const signal = await prisma.signal.update({
            where: { id: body.id },
            data: { status: body.status },
            include: {
                thoughts: true,
                highlights: true,
            },
        });

        // If marked as reviewed, automatically trigger insight generation for this individual signal
        if (body.status === SIGNAL_STATUS.REVIEWED) {
            try {
                const structuredSignal = {
                    ...signal,
                    tags: parseSignalTags(signal.tags),
                };

                // Trigger generation with just this signal
                await triggerGenerate([structuredSignal]);

                // Update to processed to indicate it's been sent to n8n
                await prisma.signal.update({
                    where: { id: signal.id },
                    data: { status: SIGNAL_STATUS.PROCESSED },
                });
            } catch (error) {
                console.error("Failed to trigger automatic generation:", error);
            }
        }

        return NextResponse.json({
            success: true,
            signal: {
                ...signal,
                tags: parseSignalTags(signal.tags),
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
