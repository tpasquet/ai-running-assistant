# Quick Start Guide

**Goal**: Start developing RunCoach AI iteration 1 in 5 minutes.

---

## ⚡ TL;DR

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (no DB needed for iteration 1!)
cp .env.example .env
# Add only: OPENAI_API_KEY=sk-...

# 3. Start development
npm run dev

# 4. Ask Claude Code to start
```

Then ask Claude:
```
Let's start iteration 1.

Read .claude/roadmap/iteration-1-scope.md and give me a summary.
Then let's begin with task T0 (Mock Data Layer).
```

---

## 📋 Iteration 1 Checklist

```markdown
### Setup (5 min)
- [ ] Read [WORKFLOW.md](.claude/WORKFLOW.md)
- [ ] Read [iteration-1-scope.md](.claude/roadmap/iteration-1-scope.md)
- [ ] Create first journal entry in [iteration-1-journal.md](.claude/roadmap/iteration-1-journal.md)

### Development (Main Work)
- [ ] T0: Mock data layer
- [ ] T1: LangGraph setup
- [ ] T2: Context assembly
- [ ] T3: Router node
- [ ] T4: Coach agent
- [ ] T5: Physio agent
- [ ] T6: Mental agent
- [ ] T7: Synthesizer
- [ ] T8: Graph assembly
- [ ] T9: Tools (mock adapters)
- [ ] T10: API endpoints
- [ ] T11: Tests

### Validation (Before closing iteration)
- [ ] Run full validation ([validate-iteration.md](.claude/workflows/validate-iteration.md))
- [ ] All tests passing
- [ ] Write retrospective in journal
- [ ] Create handoff notes for iteration 2
- [ ] Git commit & tag
```

---

## 🎯 Your First Task (T0)

**Goal**: Create 5 realistic mock scenarios for testing.

**Ask Claude**:
```
I'm starting task T0 from .claude/roadmap/iteration-1-tasks.md.

Please create the mock data layer with 5 scenarios:
1. Overreached athlete (TSB -25)
2. Fresh athlete (TSB +8)
3. Athlete with knee pain
4. Pre-competition taper
5. Motivation/burnout case

Follow the structure in iteration-1-tasks.md.
Create files in src/ai/mocks/.
```

**Expected output**:
```
src/ai/mocks/
├── scenarios.fixture.ts      # 5 complete scenarios
├── activities.fixture.ts     # 50+ activities
├── aggregates.fixture.ts     # Weekly aggregates
├── feedback.fixture.ts       # Daily feedback data
└── goals.fixture.ts          # Goal examples
```

**Validation**:
```
After T0 is complete, ask Claude:

"Validate task T0:
1. Are all 5 scenarios realistic?
2. Do they cover edge cases?
3. Is the data structure correct?"
```

**Then**: Log completion in [iteration-1-journal.md](.claude/roadmap/iteration-1-journal.md)

---

## 🔄 Development Loop

```
┌─────────────────────────────────────┐
│ 1. Pick next task (T1, T2, etc.)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Ask Claude to summarize task    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Implement (ask Claude for help)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Run tests (npm test)             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. Validate with Claude             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 6. Log in journal                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 7. Commit to git                    │
└──────────────┬──────────────────────┘
               │
               ▼
         Next task ─────┘
```

---

## 💡 Useful Claude Prompts

### Starting a task
```
I'm starting task TX from iteration-1-tasks.md.
Please summarize what needs to be done and list files to create.
```

### During implementation
```
Implement task TX step by step.
Pause after each step for my review.
```

### Code review
```
Review this implementation against CODING_STANDARDS.md.
Any issues?
```

### Stuck?
```
I'm stuck on task TX. Here's what I tried: [...]
Here's the error: [...]
Help me debug this.
```

### Validation
```
Quick validation of task TX:
1. Code quality check
2. Test coverage
3. Any issues?
```

### End of day
```
Help me write a journal entry for today's session in iteration-1-journal.md:
- Completed: T0, T1, T2
- Blockers: [...]
- Learnings: [...]
```

---

## 🚨 Red Flags

Stop and ask for help if:

- ❌ A task takes > 2 hours (might be misunderstood)
- ❌ Tests aren't passing after implementation
- ❌ You're violating CODING_STANDARDS.md
- ❌ You're adding dependencies not in iteration scope
- ❌ You're implementing features not in iteration-1-scope.md

**Ask Claude**:
```
I think I'm going off track. Here's what I'm doing: [...]
Is this aligned with iteration-1-scope.md?
```

---

## ✅ Definition of Done (Quick Check)

Before marking iteration 1 as complete:

```markdown
- [ ] All tasks T0-T11 implemented
- [ ] All tests passing (npm test)
- [ ] No TypeScript errors (npm run typecheck)
- [ ] No lint errors (npm run lint)
- [ ] All code follows CODING_STANDARDS.md
- [ ] Journal has all decisions documented
- [ ] Validation report generated
- [ ] Retrospective written
- [ ] Git tagged as v1.0-iteration-1
```

**Ask Claude to help**:
```
Run the final validation from .claude/workflows/validate-iteration.md.
Generate a completion report.
```

---

## 📚 Next Steps

After iteration 1:
1. Review retrospective
2. Plan iteration 2 (backend integration)
3. Start with [iteration-2-scope.md](.claude/roadmap/iteration-2-scope.md)

---

## 🆘 Need Help?

| Issue | Solution |
|-------|----------|
| Don't know where to start | Read [WORKFLOW.md](.claude/WORKFLOW.md) |
| Stuck on a task | Ask Claude for help with specific error |
| Code quality concerns | Review [CODING_STANDARDS.md](.claude/CODING_STANDARDS.md) |
| Need to validate | Use [validate-iteration.md](.claude/workflows/validate-iteration.md) |
| Architectural questions | Check [specs/ARCHITECTURE.md](.claude/specs/ARCHITECTURE.md) |

**Remember**: Claude Code is your pair programmer. Ask questions, request reviews, and use validation workflows!
