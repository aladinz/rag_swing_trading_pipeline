# RAG Swing-Trading Pipeline - Project TODO

## Database & Schema
- [x] Design and implement database schema for pipeline runs, stages, and results
- [x] Create tables for: pipeline_runs, pipeline_stages, stage_results, auditor_reports, trading_decisions
- [x] Add indexes for efficient querying of historical data
- [x] Set up database migrations with Drizzle

## Backend Infrastructure
- [x] Create tRPC procedures for each pipeline stage (9 stages)
- [x] Implement LLM integration helper for AI-powered analysis
- [x] Build pipeline orchestration logic (sequential execution, state management)
- [x] Create Collapse Auditor analysis procedures
- [x] Implement owner notification system integration
- [x] Add database query helpers for storing/retrieving pipeline results
- [ ] Write vitest tests for all backend procedures

## Frontend - Core Components
- [x] Create DashboardLayout with sidebar navigation for pipeline stages
- [x] Build PipelineStepPanel component (explanation, inputs, button, results)
- [x] Implement ProgressIndicator component showing pipeline completion status
- [x] Create CollapsibleStagePanel component for each pipeline stage
- [x] Build NavigationSidebar with links to all 9 stages
- [x] Create RunFullPipelineButton component with execution flow

## Frontend - Pipeline Stages UI
- [x] Stage 1: Reset - Input fields and analysis button
- [x] Stage 2: Coarse Retrieval - Input fields and analysis button
- [x] Stage 3: Re-Ranking - Input fields and analysis button
- [x] Stage 4: Narrative Compression - Input fields and analysis button
- [x] Stage 5: Risk Framing - Input fields and analysis button
- [x] Stage 6: Execution Guidance - Input fields and analysis button
- [x] Stage 7: Portfolio Scoring - Input fields and analysis button
- [x] Stage 8: Decision Ritual - Input fields and analysis button
- [x] Stage 9: Debrief Loop - Input fields and analysis button

## Frontend - Collapse Auditor Mode
- [x] Create CollapseAuditorPage component
- [x] Build portfolio structure analyzer UI
- [x] Build correlation risk analyzer UI
- [x] Build volatility exposure analyzer UI
- [x] Build signal quality analyzer UI
- [x] Build narrative drift analyzer UI
- [x] Implement full auditor report generation

## Frontend - Summary & Reports
- [x] Create SummaryPage component displaying all pipeline results
- [x] Build result visualization components for each stage
- [ ] Implement export/download functionality for reports
- [x] Create historical runs view for trend analysis

## Frontend - Styling & UX
- [ ] Define color palette and design tokens in index.css
- [ ] Implement responsive layout for mobile/tablet/desktop
- [ ] Add loading states and skeleton screens
- [ ] Add empty states and error handling
- [ ] Implement smooth transitions and animations

## Static Presentation Webpage
- [x] Design presentation layout for results visualization
- [x] Create interactive charts and data visualizations
- [x] Build export/share functionality
- [x] Implement responsive design for presentation

## Testing & Validation
- [ ] Write vitest tests for all backend procedures
- [ ] Write integration tests for pipeline execution flow
- [ ] Test full pipeline end-to-end
- [ ] Validate AI response handling and error cases
- [ ] Test notification system

## Deployment & Finalization
- [ ] Create checkpoint before final delivery
- [ ] Verify all features working end-to-end
- [ ] Test responsive design across devices
- [ ] Document API endpoints and usage


## Bug Fixes - Critical
- [x] Fix createRun returning 0 instead of actual runId
- [x] Fix database connection and insertion issues
- [x] Fix pipeline stage execution not working
- [x] Fix LLM integration for all 9 stages
- [x] Verify full pipeline execution flow


## Audit Results Formatting Improvements
- [x] Update backend to parse and structure audit results with JSON formatting
- [x] Add heading and bullet point structure to audit categories
- [x] Improve CollapseAuditor frontend display with better visual hierarchy
- [x] Add risk score visualization for each audit category
- [x] Test audit formatting with various portfolio inputs


## Daily Ritual Feature - STANDALONE REBUILD
- [x] Delete current Daily Ritual implementation
- [x] Rebuild as completely separate, standalone feature
- [x] Create one-click "Generate Daily Ritual" button
- [x] Build single text editor with auto-generated template
- [x] Remove all pipeline references from Daily Ritual
- [x] Add "Run Full Pipeline" button for submission
- [x] Implement Advanced Mode toggle for optional 9-stage form
- [x] Ensure calm, minimal, one-click experience
- [x] Test standalone Daily Ritual workflow


## Decision Tab Fixes
- [x] Fix Symbol card display and data population
- [x] Fix Target Price card display and data population
- [x] Fix Stop Loss card display and data population
- [x] Format Rationale report with bullets and headings
- [x] Structure Rationale report for better readability
- [x] Populate Quantity card with proper data
- [x] Test all Decision tab improvements


## Pipeline Execution Fixes - CRITICAL
- [x] Verify createRun() returns valid runId (not 0)
- [x] Debug stage execution order (stages 1-9)
- [x] Verify each stage receives correct runId
- [x] Fix stage result persistence to database
- [x] Ensure JSON fields are serialized correctly
- [x] Fix stages 6-8 to produce trading decision data
- [x] Verify summary and decision table population
- [x] Add comprehensive logging for pipeline flow
- [x] Fix Decision tab to show "No data" when stages incomplete
- [x] Test end-to-end pipeline execution


## Dark Theme Implementation
- [ ] Update CSS variables for dark mode colors
- [ ] Configure theme provider for dark/light switching
- [ ] Update all pages for dark theme compatibility
- [ ] Add theme toggle button to navigation
- [ ] Test dark theme across all pages
- [ ] Ensure proper contrast and readability in dark mode
