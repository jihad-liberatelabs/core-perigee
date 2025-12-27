/**
 * Shared TypeScript types and interfaces for Core Perigee
 */

// ============================================================================
// N8n Workflow Types
// ============================================================================

/**
 * Data structure returned from n8n ingestion workflows
 */
export interface N8nResponse {
    summary?: string;
    content?: string;
    key_insights?: string[];
    actionable_takeaways?: string[];
    topics?: string[];
    sentiment?: string;
    source?: string;
    sourceUrl?: string;
    title?: string;
    rawContent?: string;
}

/**
 * Payload structure for n8n format webhook
 */
export interface FormatPayload {
    insightId: string;
    coreInsight: string;
    context: string[];
    platform: string;
    tone?: "analytical" | "reflective" | "decisive";
}

/**
 * Payload structure for n8n publish webhook
 */
export interface PublishPayload {
    insightId: string;
    formattedContent: string;
    platform: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for /api/ingest endpoint
 */
export interface IngestRequest {
    inputType: "text" | "url" | "youtube" | "file";
    content?: string;  // For text and file (base64)
    url?: string;      // For url and youtube
    title?: string;    // Optional title for manual notes
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data?: T;
    message?: string;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
    success: false;
    error: string;
}

/**
 * Result type for webhook triggers
 */
export interface WebhookResult {
    success: boolean;
    error?: string;
    data?: N8nResponse;
}

// ============================================================================
// Database Model Extensions
// ============================================================================

/**
 * Signal with parsed tags (extends Prisma Signal)
 */
export interface SignalWithParsedTags {
    id: string;
    title: string;
    content: string;
    summary: string | null;
    source: string | null;
    sourceUrl: string | null;
    rawContent?: string | null;
    tags: string[];  // Parsed from JSON string
    status: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    highlights?: { id: string }[];
    thoughts?: { id: string }[];
}

/**
 * Signals API response
 */
export interface SignalsResponse {
    signals: SignalWithParsedTags[];
    total: number;
    limit: number;
    offset: number;
}
