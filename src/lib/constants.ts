/**
 * Application-wide constants for Core Perigee
 */

// ============================================================================
// Signal Status Values
// ============================================================================

export const SIGNAL_STATUS = {
    UNREAD: "unread",
    PROCESSING: "processing",
    REVIEWED: "reviewed",
    PROCESSED: "processed",
    ARCHIVED: "archived",
} as const;

export type SignalStatus = typeof SIGNAL_STATUS[keyof typeof SIGNAL_STATUS];

// ============================================================================
// Insight Status Values
// ============================================================================

export const INSIGHT_STATUS = {
    DRAFT: "draft",
    PUBLISHED: "published",
} as const;

export type InsightStatus = typeof INSIGHT_STATUS[keyof typeof INSIGHT_STATUS];

// ============================================================================
// Webhook Configuration
// ============================================================================

/**
 * Names of configured webhooks in the system
 */
export const WEBHOOK_NAMES = {
    INGEST: "ingest",
    GENERATE: "generate",
    PUBLISH: "publish",
} as const;

export type WebhookName = typeof WEBHOOK_NAMES[keyof typeof WEBHOOK_NAMES];

/**
 * Timeout for n8n webhook requests (in milliseconds)
 * Set to 90 seconds to allow for AI processing time
 */
export const WEBHOOK_TIMEOUT_MS = 90000;

// ============================================================================
// Pagination Defaults
// ============================================================================

/**
 * Default number of items per page for list endpoints
 */
export const DEFAULT_PAGE_LIMIT = 50;

/**
 * Maximum number of items per page
 */
export const MAX_PAGE_LIMIT = 100;

// ============================================================================
// Content Processing
// ============================================================================

/**
 * Regex pattern for detecting URLs
 */
export const URL_PATTERN = /^(http|https):\/\/[^ "]+$/;

/**
 * Regex pattern for detecting YouTube URLs
 */
export const YOUTUBE_PATTERN = /(youtube\.com|youtu\.be)/;

/**
 * Maximum length for preview/truncated content
 */
export const PREVIEW_MAX_LENGTH = 200;

/**
 * Maximum length for signal title from summary
 */
export const TITLE_MAX_LENGTH = 100;

// ============================================================================
// Social Media Platforms
// ============================================================================

export const SOCIAL_PLATFORMS = {
    LINKEDIN: "linkedin",
    TWITTER: "twitter",
    MEDIUM: "medium",
} as const;

export type SocialPlatform = typeof SOCIAL_PLATFORMS[keyof typeof SOCIAL_PLATFORMS];
