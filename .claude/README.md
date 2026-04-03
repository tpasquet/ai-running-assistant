# .claude Directory

This directory contains all documentation and development roadmap for RunCoach AI.

## Structure

```
.claude/
├── README.md                    # This file
├── CLAUDE.md                    # Main project instructions for Claude Code
├── CODING_STANDARDS.md          # Clean Code principles and best practices
├── WORKFLOW.md                  # 📘 How to use Claude Code effectively
├── specs/                       # Product specifications
│   ├── ARCHITECTURE.md          # System architecture
│   ├── AGENTS.md                # AI agents design (coach, physio, mental)
│   └── DATA_MODEL.md            # Database schema
├── roadmap/                     # Development iterations
│   ├── iteration-1-scope.md     # AI core (LangGraph/LangChain)
│   ├── iteration-1-tasks.md     # AI implementation tasks (T0-T11)
│   ├── iteration-1-journal.md   # 📝 Development log & decisions
│   ├── iteration-2-scope.md     # Backend (Strava, DB, API)
│   └── iteration-2-tasks.md     # Backend implementation tasks
└── workflows/                   # Validation & automation
    └── validate-iteration.md    # 🔍 Quality validation workflow
```

## Development Philosophy

### Start with the AI Core

**Iteration 1** focuses on building the intelligence layer:
- LangGraph multi-agent orchestration
- Three specialized agents (Coach, Physio, Mental)
- Structured outputs with Zod validation
- LangChain tools
- **Uses mock data** - no database required

**Why?** The AI layer is the differentiator. Build and validate the core logic first with realistic fixtures, then connect real data sources.

### Then Connect Real Data

**Iteration 2** adds the infrastructure:
- Strava OAuth and activity sync
- PostgreSQL database
- Redis caching
- BullMQ workers
- RESTful API

**Migration path**: Replace mock data adapters with repository pattern. The AI layer remains unchanged.

---

## Quick Navigation

### 🚀 Getting Started

1. **First time here?** Start with [WORKFLOW.md](WORKFLOW.md) - Complete guide to using Claude Code
2. **Starting iteration 1?** Read [iteration-1-scope.md](roadmap/iteration-1-scope.md)
3. **Ready to code?** Follow [iteration-1-tasks.md](roadmap/iteration-1-tasks.md) (T0-T11)
4. **Need to validate?** Use [validate-iteration.md](workflows/validate-iteration.md)

### 📖 For Development

| Need | File |
|------|------|
| How to work with Claude Code | [WORKFLOW.md](WORKFLOW.md) |
| Code quality rules | [CODING_STANDARDS.md](CODING_STANDARDS.md) |
| Task breakdown | [iteration-1-tasks.md](roadmap/iteration-1-tasks.md) |
| Log decisions | [iteration-1-journal.md](roadmap/iteration-1-journal.md) |
| Validate quality | [validate-iteration.md](workflows/validate-iteration.md) |

### 🧠 For Understanding

| Topic | File |
|-------|------|
| System architecture | [ARCHITECTURE.md](specs/ARCHITECTURE.md) |
| AI agents design | [AGENTS.md](specs/AGENTS.md) |
| Database schema | [DATA_MODEL.md](specs/DATA_MODEL.md) |

---

## Key Principles

From [CODING_STANDARDS.md](CODING_STANDARDS.md):

1. **Meaningful names** - Code should read like prose
2. **Small functions** - One thing, max 20 lines
3. **No comments for bad code** - Refactor instead
4. **Use exceptions** - Not error codes
5. **Single Responsibility** - Each class has one reason to change
6. **Dependency Injection** - Constructor injection always
7. **TypeScript strict mode** - No `any`, use `unknown`
8. **Test-driven** - F.I.R.S.T principles

---

## Questions?

Everything is documented in this folder. If you need clarification:
1. Check [CLAUDE.md](CLAUDE.md) for high-level context
2. Check relevant spec file for product details
3. Check roadmap file for implementation details
