# Iteration 1 — Development Journal

> **Purpose**: Track decisions, blockers, learnings, and deviations from the plan during iteration 1.

---

## Session Log

### 2025-03-28 — Session 1: Kickoff & Mock Data Setup

**Goal**: Launch iteration 1, understand scope, and complete task T0 (Mock Data Layer)

**Plan for today:**
- [x] Read iteration-1-scope.md to understand objectives
- [x] Set up development environment (no DB needed!)
- [x] Task T0: Create mock data layer with 5 realistic scenarios
  - [x] Create `activities.fixture.ts` with 16 activities (5 scenarios)
  - [x] Create `goals.fixture.ts` with 5 goal examples
  - [x] Create `feedback.fixture.ts` with 35 daily feedback entries
  - [x] Create `aggregates.fixture.ts` with 40 weekly aggregates (8 weeks × 5 scenarios)
  - [x] Create `scenarios.fixture.ts` - Complete assembled contexts

**Completed:**
- [x] Created iteration-1-journal.md for tracking
- [x] Set up todo list for iteration 1 (T0-T11)
- [x] **Task T0 Complete** - Mock data layer ready with 5 complete scenarios
- [x] **Task T1 Complete** - LangGraph setup & base graph structure
- [x] **Task T2 Complete** - ContextAssembler transforms data to LLM-ready text
- [x] **Task T3 Complete** - Router node classifies intent and selects agents
- [x] **Task T4 Complete** - Coach agent node with training load expertise
- [x] **Task T5 Complete** - Physio agent node with injury prevention
- [x] **Task T6 Complete** - Mental agent node with sports psychology
- [x] **Task T7 Complete** - Synthesizer node merges multi-agent outputs
- [x] **Task T8 Complete** - Graph fully assembled with conditional routing
- [x] **Task T9 Complete** - LangChain tools with mock data adapters
- [x] **Task T10 Complete** - Fastify API endpoints (chat, scenarios, health)
- [x] **Task T11 Complete** - Unit and integration tests with vitest

**Decisions Made:**
- **Decision 1**: Updated Activity type to match real Strava API schema
  - **Why**: Discovered actual Strava export data has different field names than initially planned
  - **Impact**:
    - Changed `durationSec` → `movingTimeSec` + `elapsedTimeSec`
    - Changed `elevationM` → `totalElevationGainM`
    - Added `averageSpeedMS`, `avgCadence`, `calories`, `avgTemp`
    - Removed `sufferScore` (not in Strava API)
  - **Alternative considered**: Keep simplified schema - rejected because we want iteration 2 migration to be seamless

- **Decision 2**: Use `@langchain/langgraph` instead of `langgraph` package
  - **Why**: Package name in npm is scoped under @langchain org
  - **Impact**: Installed `@langchain/langgraph` + `@langchain/core` + `@langchain/openai`
  - **Note**: Required `--legacy-peer-deps` due to version conflicts (non-blocking)

- **Decision 3**: Initialize Node.js project before installing dependencies
  - **Why**: Project had no package.json, needed full Node.js setup
  - **Impact**:
    - Created package.json with TypeScript, tsx, vitest
    - Created tsconfig.json with strict mode enabled
    - Set type: "module" for ESM support

**Blockers/Issues:**
_(None yet)_

**Learnings:**
- **Learning 1**: Strava API uses `moving_time` (active time) vs `elapsed_time` (total time including stops)
- **Learning 2**: Strava provides speed in m/s, we need to convert to pace (sec/km) for running
- **Learning 3**: RPE (perceived effort) and TSS are NOT in Strava API - we must calculate/collect separately
- **Learning 4**: CTL/ATL/TSB patterns clearly show training state:
  - Overreached: TSB declining from +4 to -25 over 8 weeks (red flag)
  - Fresh: TSB stable around +8 to +14 (ideal recovery state)
  - Knee injury: TSB spike to +23 during rest, then gradual return
  - Pre-competition: TSB rising from 0 to +37 during taper (perfect)
  - Burnout: Erratic pattern, CTL declining from 48 to 29 (inconsistent training)

**Deviations from Plan:**
- Router executes agents sequentially (not parallel) - simpler for iteration 1
- Skipped loadContext node - context passed directly in mock mode
- Created 3 essential LangChain tools instead of full 7 (sufficient for MVP)

---

## Architecture Decisions Records (ADR)

### ADR-001: Activity Schema Must Match Strava API Exactly

**Status**: Accepted
**Date**: 2025-03-28
**Context**:
- We are building mock data for iteration 1
- Discovered actual Strava API response structure from real export data
- Need to decide: simplified schema for mocks OR exact Strava schema?

**Decision**: Use exact Strava API field names and structure in our Activity type

**Rationale**:
- Iteration 2 will replace mocks with real Strava sync
- Using exact schema now means zero migration effort later
- Type safety catches any mismatches early
- Helpers like `convertStravaActivity()` already in place

**Consequences**:
- ✅ Seamless migration to real Strava data in iteration 2
- ✅ No refactoring of AI agents when switching data sources
- ✅ Type-safe conversion from Strava API
- ❌ Slightly more complex mock data (more fields to populate)
- ❌ Need conversion functions (e.g., m/s → sec/km for pace)

**Files affected**:
- `src/shared/types/domain.types.ts` - Updated Activity interface
- `src/shared/types/strava.types.ts` - Created Strava API types + converter
- `src/ai/mocks/activities.fixture.ts` - Need to update mock data

---

### ADR-002: Mock Data Structure Choice

**Status**: Accepted
**Date**: 2025-03-28
**Context**: Need to choose between in-memory arrays vs JSON files for mock data
**Decision**: Use TypeScript exported constants (in-memory arrays)
**Consequences**:
- ✅ Type-safe
- ✅ No file I/O overhead
- ❌ Harder to modify without recompilation

---

### ADR-003: [Title]

**Status**: [Proposed/Accepted/Rejected/Deprecated]
**Date**:
**Context**:
**Decision**:
**Consequences**:

---

## Retrospective (End of Iteration)

**What went well:**
- Mock-first approach validated AI architecture without DB complexity
- Strava schema research prevented major refactoring later
- Structured outputs with Zod ensure type safety
- All 5 scenarios provide realistic test cases
- Clean separation between graph structure and node implementations

**What didn't go well:**
- npm dependency conflicts required `--legacy-peer-deps` workaround
- LangGraph conditional routing more complex than expected
- Context assembly token estimation needs real validation

**What to improve in iteration 2:**
- Add parallel agent execution for faster responses
- Implement proper loadContext node with database
- Expand LangChain tools to full set of 7
- Add streaming SSE support for chat endpoint
- Token usage monitoring and optimization

**Estimated vs Actual:**
- Estimated effort: 2-3 days
- Actual effort: 1 session (~4 hours)
- Variance: Faster than expected (benefit of clear spec)

---

## Notes for Iteration 2

**What iteration 2 needs to know:**
- Activity schema matches Strava exactly (ADR-001) - just swap mock data for DB queries
- Graph structure is complete - add loadContext node to fetch from DB
- All agents work with AggregatedContext interface - keep this stable
- Router logic should be enhanced to support parallel agent execution

**Technical debt created:**
- Sequential agent execution (should be parallel)
- No streaming support yet (polling only)
- Limited LangChain tools (only 3 of 7 implemented)
- No token usage tracking/monitoring

**Refactoring opportunities:**
- Extract routing logic into separate service
- Create agent factory pattern for dynamic agent loading
- Add middleware for authentication (prepare for iteration 2)
- Implement better error handling and logging
