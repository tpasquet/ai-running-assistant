# Development Workflow with Claude Code

This guide explains how to effectively use Claude Code to develop RunCoach AI.

---

## 🎯 Starting an Iteration

### Step 1: Read the Scope

Open and read the iteration scope file:
- [iteration-1-scope.md](roadmap/iteration-1-scope.md) for current iteration

**Ask Claude**:
```
Read .claude/roadmap/iteration-1-scope.md and summarize:
1. Main objective
2. What's in scope
3. What's out of scope
4. Success criteria (Definition of Done)
```

### Step 2: Review the Tasks

Open the tasks file:
- [iteration-1-tasks.md](roadmap/iteration-1-tasks.md)

**Ask Claude**:
```
Read .claude/roadmap/iteration-1-tasks.md and create a checklist of all tasks (T0-T11).
For each task, give me a 1-sentence summary.
```

### Step 3: Set Up the Journal

Open [iteration-1-journal.md](roadmap/iteration-1-journal.md) and start logging.

**First entry**:
```markdown
### YYYY-MM-DD — Session 1: Kickoff

**Goal**: Complete T0 (Mock Data Layer)

**Plan**:
- Create fixtures for 5 scenarios
- Implement activities.fixture.ts
- Implement scenarios.fixture.ts
```

---

## 🔨 During Development

### For Each Task (T0, T1, T2, etc.)

#### 1. Start the Task

**Ask Claude**:
```
I'm starting task T3 (Router Node) from iteration-1-tasks.md.

Please:
1. Summarize what needs to be done
2. List the files I need to create/modify
3. Identify any dependencies on previous tasks
```

#### 2. Implement the Task

**Iterative approach** (recommended):
```
Let's implement T3 step by step:
1. First, create the Zod schema for router output
2. Then implement the router node
3. Finally write unit tests

Pause after each step for my review.
```

**All-at-once approach**:
```
Implement task T3 completely according to iteration-1-tasks.md.
Follow CODING_STANDARDS.md.
```

#### 3. Validate the Implementation

**Ask Claude**:
```
I've completed T3. Please validate:
1. Does it match the task requirements?
2. Does it follow CODING_STANDARDS.md?
3. Are there any issues?
```

#### 4. Document Decisions

**If you made a decision** (e.g., changed the approach), log it:

**Ask Claude**:
```
Add an entry to iteration-1-journal.md documenting this decision:

Decision: Used GPT-4o instead of GPT-4o-mini for router
Reason: Better accuracy for complex intent classification
Impact: ~2x cost increase per request
Alternative considered: GPT-4o-mini (rejected due to accuracy in tests)
```

#### 5. Run Tests

```bash
npm test
```

**If tests fail**:
```
Tests are failing for router.test.ts:
[paste error]

Please help me fix this.
```

---

## 🔍 Using Sub-Agents

### When to Use Sub-Agents

**Use sub-agents for**:
- ✅ Large refactorings across multiple files
- ✅ Validations (see [validate-iteration.md](workflows/validate-iteration.md))
- ✅ Complex searches across the codebase
- ✅ Parallel work on independent modules

**Don't use sub-agents for**:
- ❌ Simple questions
- ❌ Single file edits
- ❌ Quick fixes
- ❌ Conversational work (Claude Code works better)

### Example: Parallel Development

**Scenario**: T4, T5, T6 (the 3 agent nodes) are independent.

**Ask Claude**:
```
Launch 3 agents in parallel to implement:
1. Agent 1: Task T4 (Coach Agent Node)
2. Agent 2: Task T5 (Physio Agent Node)
3. Agent 3: Task T6 (Mental Agent Node)

Each agent should:
- Follow iteration-1-tasks.md
- Follow CODING_STANDARDS.md
- Create the node implementation + tests
- Report back with files created
```

**Result**: All 3 nodes implemented simultaneously.

---

## 📊 Validating Progress

### Quick Validation (After Each Task)

**Ask Claude**:
```
Quick validation of task T3:
1. Code quality check (CODING_STANDARDS.md)
2. Test coverage check
3. Any issues?
```

### Full Validation (End of Day/Week)

Use the workflow in [validate-iteration.md](workflows/validate-iteration.md):

**Ask Claude**:
```
Run a full validation of iteration 1 so far using .claude/workflows/validate-iteration.md.

Run phases 1-5 and generate a report in iteration-1-journal.md.
```

---

## 🏁 Completing an Iteration

### Step 1: Final Validation

**Ask Claude**:
```
Run the complete iteration validation from .claude/workflows/validate-iteration.md.

Include:
- Completeness check
- Code quality review
- Test coverage
- Architecture compliance
- Documentation check

Generate a final validation report.
```

### Step 2: Retrospective

**Ask Claude**:
```
Help me write a retrospective for iteration 1 in iteration-1-journal.md.

Review all journal entries and:
1. List what went well
2. List what didn't go well
3. Suggest improvements for iteration 2
4. Calculate estimated vs actual effort
```

### Step 3: Create Handoff Notes

**Ask Claude**:
```
Based on iteration-1-journal.md, create "Notes for Iteration 2" section:
1. What iteration 2 needs to know
2. Technical debt created
3. Refactoring opportunities
4. Migration guide (mock → real DB)
```

### Step 4: Git Commit & Tag

```bash
git add .
git commit -m "Complete iteration 1 - AI core with LangGraph

- Implemented router, coach, physio, mental agents
- 7 LangChain tools with mock adapters
- Structured outputs with Zod validation
- 5 test scenarios covering edge cases
- All tests passing, 85% coverage

Closes #1"

git tag v1.0-iteration-1
git push origin main --tags
```

---

## 💡 Tips & Tricks

### 1. Use the Journal Actively

Don't just log at the end. Log as you go:
- Start of each session: What's the goal?
- During work: Decisions, blockers, learnings
- End of session: What was completed

### 2. Ask for Summaries

**Before starting a task**:
```
Summarize task T5 in 3 bullet points.
```

**Before using a spec**:
```
Summarize specs/AGENTS.md - just the Physio Agent section.
```

### 3. Validate Incrementally

Don't wait until the end of the iteration. Validate after each task or group of tasks.

### 4. Use Checklists

Create checklists from tasks and check them off as you go:

```markdown
## Iteration 1 Progress

- [x] T0: Mock data layer
- [x] T1: LangGraph setup
- [x] T2: Context assembly
- [x] T3: Router node
- [ ] T4: Coach agent
- [ ] T5: Physio agent
...
```

### 5. Keep Context Focused

Don't load all documentation at once. Load what you need for the current task:
- Working on router? Load `specs/AGENTS.md` (router section only)
- Working on tools? Load `iteration-1-tasks.md` (T9 only)

### 6. Parallel Work When Possible

If tasks are independent, use parallel agents to speed up development.

**Example**:
```
Launch agents in parallel for T4, T5, T6 (all agent nodes).
```

### 7. Document Everything

Future you (or teammates) will thank you:
- Why did you choose approach X over Y?
- What was the blocker and how did you solve it?
- What would you do differently?

All goes in the journal.

---

## 🚨 Common Pitfalls

### ❌ Not Reading the Docs

**Problem**: Implementing something that contradicts the specs.

**Solution**: Always read the relevant scope/spec file before starting a task.

### ❌ Skipping Tests

**Problem**: Code works now but breaks later.

**Solution**: Write tests as you go. Don't wait until the end.

### ❌ Not Documenting Decisions

**Problem**: Forgetting why you did something 2 weeks later.

**Solution**: Use the journal. Every decision gets logged.

### ❌ Overusing Sub-Agents

**Problem**: Sub-agents for simple tasks create overhead.

**Solution**: Use sub-agents only for truly parallel/large tasks.

### ❌ Not Validating Early

**Problem**: Discovering major issues at the end of the iteration.

**Solution**: Validate after each task or group of tasks.

---

## 📚 Quick Reference

| Need | Command |
|------|---------|
| Start iteration | Read scope → Read tasks → Create journal entry |
| Start task | Ask for summary → Implement → Test → Document |
| Make decision | Log in journal with rationale |
| Stuck on task | Ask Claude for help, document blocker |
| Validate task | Quick validation (3 checks) |
| Validate iteration | Full validation (5 phases) |
| Complete iteration | Validate → Retro → Handoff → Tag |

---

## 📖 Related Files

- [CLAUDE.md](CLAUDE.md) - Main project instructions
- [CODING_STANDARDS.md](CODING_STANDARDS.md) - Code quality rules
- [validate-iteration.md](workflows/validate-iteration.md) - Validation workflow
- [iteration-1-journal.md](roadmap/iteration-1-journal.md) - Development journal
