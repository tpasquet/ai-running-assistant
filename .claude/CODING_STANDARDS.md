# Coding Standards

This project follows **Clean Code** principles as outlined by Robert C. Martin. All code must be readable, maintainable, and testable.

---

## Core Principles

### 1. **Meaningful Names**

**DO:**
```typescript
// Clear, intention-revealing names
function calculateTrainingStressScore(durationSec: number, avgHrBpm: number): number {
  const intensityFactor = computeIntensityFactor(avgHrBpm);
  const normalizedPower = durationSec * intensityFactor;
  return normalizedPower * intensityFactor * 100;
}

interface WeeklyAggregate {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  trainingStressScore: number;
}
```

**DON'T:**
```typescript
// Cryptic abbreviations
function calcTSS(d: number, h: number): number {
  const if = calc(h); // 'if' is a keyword!
  const np = d * if;
  return np * if * 100;
}

interface WkAgg {
  dist: number;
  dur: number;
  tss: number;
}
```

**Rules:**
- Use pronounceable names (`trainingStressScore` not `tss`)
- Use searchable names (avoid single-letter variables except in loops)
- Avoid mental mapping (don't make readers decode abbreviations)
- Class names: nouns (`ActivityRepository`, `CoachAgent`)
- Function names: verbs (`calculateTSS`, `fetchActivities`, `isOverreached`)
- Boolean variables: `is`, `has`, `should` prefixes (`isActive`, `hasGoal`)

---

### 2. **Functions**

**Small and Focused**
```typescript
// GOOD: Single responsibility
async function syncActivity(userId: string, stravaActivityId: number): Promise<void> {
  const activityData = await fetchFromStrava(stravaActivityId);
  const activity = await saveActivity(userId, activityData);
  await invalidateCache(userId);
}

// BAD: Too many responsibilities
async function syncActivityAndUpdateEverything(userId: string, stravaActivityId: number): Promise<void> {
  const activityData = await fetchFromStrava(stravaActivityId);
  const tss = computeTSS(activityData);
  const activity = await db.activity.create({ ... });
  const aggs = await db.weeklyAggregate.findMany({ ... });
  const newCTL = calculateCTL(aggs);
  await db.weeklyAggregate.update({ ... });
  await redis.del(`ctx:${userId}`);
  await sendNotification(userId, "Activity synced");
  // ... 50 more lines
}
```

**Function Rules:**
- **One thing only**: A function should do one thing, do it well, and do it only
- **Max 20 lines**: If longer, extract helper functions
- **One level of abstraction**: Don't mix high-level logic with low-level details
- **Max 3 parameters**: Use objects for more (`{ userId, options }`)
- **No side effects**: Pure functions when possible
- **Command-Query Separation**: Functions either DO something or ANSWER something, not both

**Abstraction Levels:**
```typescript
// HIGH LEVEL (orchestration)
async function generateDailyRecommendation(userId: string): Promise<Recommendation> {
  const context = await loadTrainingContext(userId);
  const recommendation = await invokeCoachAgent(context);
  await saveRecommendation(userId, recommendation);
  return recommendation;
}

// MID LEVEL (coordination)
async function loadTrainingContext(userId: string): Promise<TrainingContext> {
  const activities = await fetchRecentActivities(userId);
  const aggregates = await fetchWeeklyAggregates(userId);
  const feedbacks = await fetchDailyFeedbacks(userId);
  return assembleContext({ activities, aggregates, feedbacks });
}

// LOW LEVEL (implementation details)
async function fetchRecentActivities(userId: string): Promise<Activity[]> {
  return db.activity.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
    take: 10,
  });
}
```

---

### 3. **Comments**

**Good Code > Comments**

```typescript
// BAD: Explaining what code does
// Calculate the training stress score using heart rate
const tss = (duration / 3600) * ((avgHr - restHr) / (maxHr - restHr)) * 100;

// GOOD: Self-explanatory code
const intensityFactor = calculateIntensityFactor(avgHr, restHr, maxHr);
const trainingStressScore = computeTSS(durationSec, intensityFactor);
```

**When to Comment:**
- **Legal comments**: License, copyright
- **Informative comments**: Explaining intent or context
  ```typescript
  // TSS formula from "Training and Racing with a Power Meter" (Coggan)
  // Uses TRIMP method when power data unavailable
  ```
- **Warning comments**: Consequences of actions
  ```typescript
  // WARNING: This query scans all activities. Cache the result.
  ```
- **TODO comments**: Planned improvements
  ```typescript
  // TODO: Replace with exponential weighted moving average for smoother CTL
  ```

**Don't Comment:**
- Bad code (refactor instead)
- Closing braces (`} // end if`)
- Version history (use git)
- Commented-out code (delete it)

---

### 4. **Error Handling**

**Use Exceptions, Not Error Codes**

```typescript
// GOOD
async function fetchActivity(id: string): Promise<Activity> {
  const activity = await db.activity.findUnique({ where: { id } });

  if (!activity) {
    throw new NotFoundError(`Activity ${id} not found`);
  }

  return activity;
}

// BAD
async function fetchActivity(id: string): Promise<Activity | null | -1> {
  const activity = await db.activity.findUnique({ where: { id } });
  if (!activity) return null; // or -1? or undefined?
  return activity;
}
```

**Custom Error Classes**

```typescript
// src/shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly errors: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
```

**Error Handling Rules:**
- **Don't return null**: Throw exceptions or use `Option` types
- **Provide context**: Include relevant data in error messages
- **Define exceptions at boundaries**: API layer catches and formats errors
- **Don't ignore errors**: Always handle or propagate

---

### 5. **Classes and Objects**

**Single Responsibility Principle (SRP)**

```typescript
// GOOD: Each class has one reason to change
class ActivityRepository {
  async findById(id: string): Promise<Activity | null> { ... }
  async save(activity: Activity): Promise<Activity> { ... }
  async delete(id: string): Promise<void> { ... }
}

class TSSCalculator {
  calculateWithHeartRate(duration: number, avgHr: number, maxHr: number): number { ... }
  calculateWithPace(duration: number, pace: number, threshold: number): number { ... }
}

class ActivityService {
  constructor(
    private repo: ActivityRepository,
    private calculator: TSSCalculator
  ) {}

  async processActivity(data: StravaActivity): Promise<Activity> {
    const tss = this.calculator.calculateWithHeartRate(...);
    return this.repo.save({ ...data, tss });
  }
}

// BAD: God class doing everything
class ActivityManager {
  async findById(id: string) { ... }
  async save(activity: Activity) { ... }
  async delete(id: string) { ... }
  calculateTSS(duration: number, avgHr: number) { ... }
  syncFromStrava(userId: string) { ... }
  generateReport(userId: string) { ... }
  sendEmail(userId: string) { ... }
  // ... 500 more lines
}
```

**Open/Closed Principle (OCP)**

```typescript
// GOOD: Open for extension, closed for modification
interface TSSCalculationStrategy {
  calculate(activity: Activity): number;
}

class HeartRateTSSStrategy implements TSSCalculationStrategy {
  calculate(activity: Activity): number {
    // HR-based calculation
  }
}

class PaceTSSStrategy implements TSSCalculationStrategy {
  calculate(activity: Activity): number {
    // Pace-based calculation
  }
}

class TSSCalculator {
  constructor(private strategy: TSSCalculationStrategy) {}

  calculate(activity: Activity): number {
    return this.strategy.calculate(activity);
  }
}

// BAD: Modifying existing code for new calculation methods
class TSSCalculator {
  calculate(activity: Activity, method: "hr" | "pace" | "power"): number {
    if (method === "hr") {
      // ...
    } else if (method === "pace") {
      // ...
    } else if (method === "power") { // added later
      // ... now we modified the class
    }
  }
}
```

---

### 6. **Testing**

**F.I.R.S.T. Principles**

- **Fast**: Tests should run quickly
- **Independent**: No interdependencies between tests
- **Repeatable**: Same result every time
- **Self-validating**: Boolean output (pass/fail)
- **Timely**: Written before or with production code (TDD)

**Test Structure: AAA Pattern**

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("TSSCalculator", () => {
  let calculator: TSSCalculator;

  beforeEach(() => {
    calculator = new TSSCalculator();
  });

  it("calculates TSS from heart rate correctly", () => {
    // ARRANGE
    const durationSec = 3600; // 1 hour
    const avgHrBpm = 160;
    const maxHrBpm = 190;
    const restHrBpm = 50;

    // ACT
    const result = calculator.calculateWithHeartRate(
      durationSec,
      avgHrBpm,
      maxHrBpm,
      restHrBpm
    );

    // ASSERT
    expect(result).toBeCloseTo(100, 1); // ~100 TSS for 1h at threshold
  });

  it("returns zero TSS for zero duration", () => {
    const result = calculator.calculateWithHeartRate(0, 160, 190, 50);
    expect(result).toBe(0);
  });
});
```

**Test Rules:**
- **One assertion per concept** (not necessarily one `expect()`)
- **Descriptive test names**: `it("throws error when activity not found")`
- **Test the behavior, not the implementation**
- **Use factories/builders** for complex test data
- **Mock external dependencies** (database, APIs)

---

### 7. **Formatting & Style**

**Vertical Formatting**

```typescript
// GOOD: Related code close together, blank lines separate concepts
async function processActivity(userId: string, stravaId: number): Promise<void> {
  // Fetch data
  const stravaData = await stravaClient.getActivity(stravaId);
  const existingActivity = await activityRepo.findByStravaId(stravaId);

  // Calculate metrics
  const tss = tssCalculator.calculate(stravaData);
  const pace = calculatePace(stravaData.distance, stravaData.duration);

  // Save or update
  if (existingActivity) {
    await activityRepo.update(existingActivity.id, { tss, pace });
  } else {
    await activityRepo.create({ userId, stravaId, tss, pace });
  }

  // Invalidate cache
  await cacheService.invalidate(`activities:${userId}`);
}
```

**Horizontal Formatting**

- **Max 100-120 characters per line**
- **Indentation**: 2 spaces (TypeScript convention)
- **Alignment**: Use Prettier (no manual alignment)

---

### 8. **Dependency Injection**

**Prefer Constructor Injection**

```typescript
// GOOD: Dependencies explicit and testable
export class AggregationService {
  constructor(
    private readonly activityRepo: ActivityRepository,
    private readonly aggregateRepo: AggregateRepository,
    private readonly cache: CacheService
  ) {}

  async getContextWindow(userId: string): Promise<TrainingContext> {
    const cacheKey = `ctx:${userId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const activities = await this.activityRepo.findRecent(userId, 10);
    const aggregates = await this.aggregateRepo.findWeekly(userId, 8);

    const context = this.assembleContext(activities, aggregates);
    await this.cache.set(cacheKey, JSON.stringify(context), 3600);

    return context;
  }
}

// BAD: Hidden dependencies, hard to test
export class AggregationService {
  async getContextWindow(userId: string): Promise<TrainingContext> {
    const activityRepo = new ActivityRepository(); // hidden dependency!
    const aggregateRepo = new AggregateRepository(); // hidden dependency!
    // ... impossible to mock in tests
  }
}
```

---

### 9. **TypeScript Specific**

**Strict Mode Always**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Avoid `any`, Use `unknown`**

```typescript
// BAD
function parseJSON(json: string): any {
  return JSON.parse(json);
}

// GOOD
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

// Even better: use Zod for validation
function parseActivity(json: string): Activity {
  const data = JSON.parse(json);
  return ActivitySchema.parse(data); // throws if invalid
}
```

**Prefer `type` over `interface` for unions/intersections**

```typescript
// Use type for unions
type AgentOutput = CoachOutput | PhysioOutput | MentalOutput;

// Use interface for object shapes (extensible)
interface Activity {
  id: string;
  userId: string;
  distanceMeters: number;
}
```

---

### 10. **Clean Architecture Layers**

**Dependency Rule: Inner layers don't know about outer layers**

```
src/
├── domain/           # Pure business logic (no dependencies)
│   ├── activity/
│   └── aggregation/
├── ai/               # AI orchestration (depends on domain)
│   ├── graph/
│   └── agents/
├── infra/            # External interfaces (depends on domain)
│   ├── db/
│   └── strava/
└── api/              # HTTP layer (depends on all)
    └── routes/
```

**Example:**

```typescript
// domain/aggregation/load.ts (pure function, no dependencies)
export function calculateCTL(dailyTSS: number[], days: number = 42): number {
  return dailyTSS.reduce((ctl, tss) => ctl + (tss - ctl) / days, 0);
}

// infra/db/repositories/AggregateRepository.ts (depends on domain types)
import { WeeklyAggregate } from "../../../domain/aggregation/types";

export class AggregateRepository {
  async findWeekly(userId: string, weeks: number): Promise<WeeklyAggregate[]> {
    return db.weeklyAggregate.findMany({ ... });
  }
}

// domain/aggregation/AggregationService.ts (orchestrates, injected deps)
export class AggregationService {
  constructor(private repo: AggregateRepository) {}

  async getCurrentCTL(userId: string): Promise<number> {
    const aggregates = await this.repo.findWeekly(userId, 6);
    const dailyTSS = aggregates.map(a => a.totalTss);
    return calculateCTL(dailyTSS); // pure function
  }
}
```

---

## Code Review Checklist

Before submitting code, verify:

- [ ] **Names**: All variables/functions have clear, intention-revealing names
- [ ] **Functions**: Each function does one thing, max 20 lines
- [ ] **Comments**: Code is self-explanatory, comments add context only
- [ ] **Errors**: Exceptions used, not error codes
- [ ] **Tests**: All new code has tests (unit + integration)
- [ ] **Types**: No `any`, strict TypeScript enabled
- [ ] **Dependencies**: Injected via constructor, not hardcoded
- [ ] **Formatting**: Prettier applied, max 100 chars/line
- [ ] **Single Responsibility**: Each class/module has one reason to change
- [ ] **No duplication**: DRY principle applied

---

## Recommended Reading

- **Clean Code** by Robert C. Martin
- **Refactoring** by Martin Fowler
- **Working Effectively with Legacy Code** by Michael Feathers
- **The Pragmatic Programmer** by Hunt & Thomas
