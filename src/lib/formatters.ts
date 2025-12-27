import type { N8nResponse } from "./types";

/**
 * Formatting utilities for Core Perigee
 */

// ============================================================================
// N8n Data Formatting
// ============================================================================

/**
 * Formats n8n extraction data into readable Markdown content
 * 
 * @param data - N8n response data containing summary, insights, takeaways, etc.
 * @returns Formatted markdown string
 * 
 * @example
 * ```ts
 * const markdown = formatN8nDataToMarkdown({
 *   summary: "Article about AI",
 *   key_insights: ["AI is evolving", "Ethics matter"],
 *   sentiment: "positive"
 * });
 * ```
 */
export function formatN8nDataToMarkdown(data: N8nResponse): string {
    const parts: string[] = [];

    if (data.summary) {
        parts.push(`## Summary\n${data.summary}`);
    }

    if (data.key_insights?.length) {
        parts.push(`## Key Insights\n${data.key_insights.map(i => `• ${i}`).join("\n")}`);
    }

    if (data.actionable_takeaways?.length) {
        parts.push(`## Actionable Takeaways\n${data.actionable_takeaways.map(t => `• ${t}`).join("\n")}`);
    }

    if (data.sentiment) {
        parts.push(`## Sentiment\n${data.sentiment}`);
    }

    return parts.join("\n\n");
}

// ============================================================================
// Tag Parsing
// ============================================================================

/**
 * Safely parses signal tags from JSON string
 * 
 * @param tagsJson - JSON string containing tags array
 * @returns Parsed array of strings, empty array if parsing fails
 * 
 * @example
 * ```ts
 * const tags = parseSignalTags('["AI", "Technology"]');
 * // Returns: ["AI", "Technology"]
 * ```
 */
export function parseSignalTags(tagsJson: string): string[] {
    try {
        const parsed = JSON.parse(tagsJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Serializes tags array to JSON string for database storage
 * 
 * @param tags - Array of tag strings
 * @returns JSON string representation
 */
export function serializeSignalTags(tags: string[]): string {
    return JSON.stringify(tags);
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Formats a date string into a human-readable relative time
 * 
 * @param dateStr - ISO date string or Date object
 * @returns Formatted string like "2 hours ago", "Yesterday", etc.
 * 
 * @example
 * ```ts
 * formatRelativeDate("2024-01-01T10:00:00Z");
 * // Returns: "2 hours ago" (if current time is 2024-01-01T12:00:00Z)
 * ```
 */
export function formatRelativeDate(dateStr: string | Date): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
}

// ============================================================================
// Content Truncation
// ============================================================================

/**
 * Truncates content to a specified maximum length
 * 
 * @param content - Content to truncate
 * @param maxLength - Maximum length (default: 200)
 * @returns Truncated content with ellipsis if needed
 * 
 * @example
 * ```ts
 * truncateContent("Very long text here...", 10);
 * // Returns: "Very long..."
 * ```
 */
export function truncateContent(content: string, maxLength = 200): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
}
