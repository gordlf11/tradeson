---
status: draft
created: YYYY-MM-DD
feedback_source: <user / beta tester / partner / self>
slug: <kebab-case-summary>
---

# <One-line title summarizing the feedback>

## 1. Original feedback (verbatim)

> Paste the raw feedback here. Do not paraphrase.

## 2. Derived test stories

Each story is Given / When / Then, runnable independently.

### Story 1 — <name>
- **Given:** <preconditions, which test user>
- **When:** <action sequence>
- **Then:** <observable outcome>

### Story 2 — <name>
- ...

## 3. Test run results

Filled in by the skill after Playwright run.

| # | Story | Result | Screenshot | Notes |
|---|---|---|---|---|
| 1 | ... | PASS / FAIL | `./screens/story-1.png` | console errors, timing, etc |

## 4. Expected behavior

What *should* happen for each failing story, written as the source of truth for the fix.

## 5. Proposed code changes

Concrete file edits. Reviewer scans this section to approve.

- `src/path/to/File.tsx:LINE` — <what to change and why>
- ...

### Risk / blast radius
- Touched routes: ...
- Could affect: ...

## 6. Approval

To approve this plan, change `status:` in the frontmatter to `approved` and re-invoke the skill.

After implementation completes and tests re-pass, the skill flips `status:` to `implemented`.
