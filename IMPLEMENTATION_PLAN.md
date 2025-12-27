# Implementation Plan: Phase 11 & Beyond

This plan outlines the steps to finalize the **Signal-to-Insight** pipeline and polish the UX for a seamless personal "Second Brain" experience.

## Phase 1: Robust Infrastructure (Webhooks & API)
- [ ] **Fix Ingest 500 Errors**: 
    - Investigate `src/app/api/ingest/route.ts` for potential timeout or parsing issues.
    - Add robust error handling for external `fetch` calls to n8n.
- [ ] **Complete Webhook Configuration**: 
    - Verify that all 5 webhooks (Ingest, Cluster, Generate, Format, Publish) can be saved and edited in the Settings UI.
    - Ensure the `Cluster` webhook URL is correctly configured and utilized in the clustering workflow.
- [ ] **Callback Reliability**: 
    - Ensure inbound endpoints (`/api/insights`, `/api/signals/receive`, etc.) validate payloads and handle duplicates.

## Phase 2: Actionable Insights (Logic & Editing)
- [ ] **Insight Preview Editing**:
    - Update `PATCH /api/insights` to support updating the `preview` field.
    - Implement the "Save Changes" functionality in `InsightsPage` to allow manual refinement of AI-generated content.
- [ ] **Clustering Logic**: 
    - Refine the `Cluster` trigger to include relevant signal tags and source metadata for better AI grouping.
- [ ] **Status Transitions**:
    - Define clear state transitions (e.g., `draft` -> `formatting` -> `previewing` -> `published`) and ensure the UI reflects these in real-time.

## Phase 3: UX & Visual Consistency
- [ ] **Layout Standardization**:
    - Ensure all pages (`/insights`, `/settings`, `/review`, etc.) use the standard `AppHeader` and `max-w-5xl` content wrapper.
- [ ] **Interactive Feedback**:
    - Add success/error toasts for long-running actions (e.g., "Clustering triggered...", "Insight published!").
    - Implement skeleton screens for all data-fetching states to reduce layout shift.
- [ ] **Refinement of Signal Inbox**:
    - Add multi-select actions for bulk processing of signals.
    - Improve the "Thought Capture" modal with better text formatting.

## Phase 4: Final Polish & Verification
- [ ] **End-to-End Walkthrough**: 
    - Test the full loop: Capture URL -> Signal Review -> Clustering -> Insight Synthesis -> Format -> LinkedIn Preview -> Publish.
- [ ] **Documentation Update**:
    - Keep `README.md` updated with any new configuration requirements or platform integrations.
- [ ] **Cleanup**:
    - Remove unused scripts and consolidate shared types/constants.
