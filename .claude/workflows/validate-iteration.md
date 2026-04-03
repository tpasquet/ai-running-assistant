# Iteration Validation Workflow

Use Claude Code sub-agents to validate completion and quality of an iteration.

---

## Validation Phases

### Phase 1: Completeness Check
**Agent**: `general-purpose`
**Task**: Verify all tasks are completed

**Prompt**:
```
Review the iteration-1-tasks.md file and check the actual codebase to verify:
1. Are all tasks (T0-T11) implemented?
2. For each task, list:
   - Status: ✅ Complete / ⚠️ Partial / ❌ Missing
   - Files created/modified
   - Any deviations from the plan

Generate a completion report in iteration-1-journal.md under a new "Validation Report" section.
```

---

### Phase 2: Code Quality Review
**Agent**: `general-purpose`
**Task**: Check adherence to coding standards

**Prompt**:
```
Review all code files in src/ai/ against .claude/CODING_STANDARDS.md:

1. Check for violations:
   - Functions > 20 lines
   - Use of 'any' type
   - Missing dependency injection
   - Non-descriptive names
   - Missing error handling

2. For each violation:
   - File: [path]
   - Line: [number]
   - Issue: [description]
   - Severity: Critical/Major/Minor
   - Suggested fix: [code]

Generate a quality report.
```

---

### Phase 3: Test Coverage
**Agent**: `general-purpose`
**Task**: Verify testing requirements

**Prompt**:
```
Check test coverage against iteration-1-scope.md Definition of Done:

1. Unit tests exist for:
   - [ ] Router node
   - [ ] Coach agent node
   - [ ] Physio agent node
   - [ ] Mental agent node
   - [ ] Synthesizer node
   - [ ] All 7 LangChain tools
   - [ ] Context assembler

2. Integration tests exist for:
   - [ ] End-to-end graph execution
   - [ ] Each mock scenario

3. Test quality:
   - Do tests follow AAA pattern?
   - Are tests independent?
   - Do they use proper mocks?

Report missing tests and quality issues.
```

---

### Phase 4: Architecture Compliance
**Agent**: `general-purpose`
**Task**: Verify architecture principles

**Prompt**:
```
Verify the implementation follows specs/ARCHITECTURE.md and specs/AGENTS.md:

1. Layer separation:
   - Does src/ai/ depend on src/infra/? (should NOT)
   - Are all dependencies injected via constructor?
   - Are nodes pure functions?

2. Structured outputs:
   - Do all agents return Zod-validated outputs?
   - Are schemas exported and reusable?

3. Prompt versioning:
   - Are prompts in src/ai/prompts/?
   - Do they export PROMPT_VERSION?

4. Mock data isolation:
   - Are all tools using mocks (not real DB)?
   - Is mock data in src/ai/mocks/?

Report compliance issues with file locations.
```

---

### Phase 5: Documentation Check
**Agent**: `general-purpose`
**Task**: Ensure documentation is up-to-date

**Prompt**:
```
Check if documentation reflects actual implementation:

1. Does README.md need updates?
2. Are new decisions documented in iteration-1-journal.md?
3. Do code comments match implementation?
4. Are all exported functions documented with JSDoc?

Generate list of documentation gaps.
```

---

## Running All Validations

### Sequential Validation (Recommended)

Ask Claude Code to run each phase one by one, waiting for results before proceeding.

**Why**: Each phase can inform the next, and you can fix critical issues before moving on.

### Parallel Validation (Advanced)

Ask Claude Code to run all 5 phases **in parallel** using multiple agent invocations.

**Example prompt**:
```
Run the following 5 validation agents IN PARALLEL:
1. Completeness check (see .claude/workflows/validate-iteration.md Phase 1)
2. Code quality review (Phase 2)
3. Test coverage (Phase 3)
4. Architecture compliance (Phase 4)
5. Documentation check (Phase 5)

Aggregate all reports and create a summary with:
- Overall status: Pass/Fail
- Critical issues: [count]
- Action items: [list]
```

---

## Validation Report Template

After running validations, create a consolidated report:

```markdown
# Iteration 1 — Validation Report

**Date**: 2024-01-XX
**Status**: ✅ Pass / ⚠️ Conditional Pass / ❌ Fail

## Summary

- **Completeness**: 11/11 tasks (100%)
- **Code Quality**: 3 violations (2 major, 1 minor)
- **Test Coverage**: 85% (target: 80%)
- **Architecture**: ✅ Compliant
- **Documentation**: ⚠️ 2 gaps

## Critical Issues (Must Fix Before Iteration 2)

1. [Issue description]
   - **File**: [path]
   - **Fix**: [action required]

## Major Issues (Should Fix)

1. [Issue description]

## Minor Issues (Nice to Have)

1. [Issue description]

## Approval

- [ ] All critical issues resolved
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for iteration 2

**Signed off by**: [Your name]
**Date**: [Date]
```

---

## Custom Validation Agents

You can create specialized agents for this project:

### Option 1: Ad-hoc (Use as needed)

Just invoke agents with specific prompts when you need validation.

### Option 2: Documented Workflows (This file)

Keep validation prompts in this file for consistency across iterations.

### Option 3: Automated (Future)

Create a script that runs all validations:

```bash
npm run validate:iteration
```

This would:
1. Run all tests
2. Run linter
3. Run type checker
4. Generate coverage report
5. Invoke Claude Code agents for semantic checks
6. Aggregate results

**Recommendation for now**: Use Option 2 (this file). Copy prompts as needed during validation.

---

## Best Practices

### 1. Validate Early and Often

Don't wait until the end of the iteration. Run quick validations after each task:

```
After completing T3 (Router node):
- Run Phase 2 (Code Quality) on router.ts only
- Run Phase 3 (Tests) on router.test.ts only
```

### 2. Fix Critical Issues Immediately

If a validation reveals a critical issue (e.g., architecture violation), fix it before continuing.

### 3. Log All Deviations

If you deviate from the plan, document it in iteration-1-journal.md with rationale.

### 4. Keep Validation Reports

Store validation reports in iteration-1-journal.md for future reference.

---

## Iteration Sign-Off Checklist

Before closing iteration 1:

- [ ] All tasks in Definition of Done completed
- [ ] All 5 validation phases passed
- [ ] Critical issues resolved
- [ ] Validation report created
- [ ] Retrospective completed
- [ ] Notes for iteration 2 documented
- [ ] All code committed to git
- [ ] Tagged as `v1.0-iteration-1`
