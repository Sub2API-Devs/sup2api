/**
 * commands/review/cleanupAngles.ts
 *
 * 2.1.316 新增：code-review 技能的清理类审查角度（复用、简化、效率）提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (2)
 * attribution: placement 2
 */
import { STAGES } from "../../components/tasks/RemoteSessionDetailDialog.js";
import { findingCapPhrase } from "./reviewPhases.js";
import { REPORTFINDINGS } from "../../tools/ReportFindingsTool/constants.js";
import { plural } from "../../utils/stringUtils.js";
import {
  REVIEW_PHASE0_GATHER_DIFF,
  REVIEW_ANGLE_SIMPLIFY,
  REVIEW_ANGLE_CONVENTIONS,
  REVIEW_ANGLE_TESTS,
  REVIEW_ANGLE_EFFICIENCY,
  REVIEW_CLEANUP_OUTPUT_FIELDS,
} from "./reviewAngles.js";

//@ chunk-hantmvxa.js:68578-76198 placement
/**
 * 代码评审的清理类角度（Reuse、removed-behavior、cross-file 等）与最小化评审提示词。
 */
var REVIEW_REUSE_ANGLE = `### Reuse

The angles above hunt for bugs; this one and the next two hunt for cleanup in
the changed code. Flag new code that re-implements something the codebase
already has \u2014 Grep shared/utility modules and files adjacent to the change,
and name the existing helper to call instead.
`;
var REVIEW_REUSE_ANGLE_LOW_EFFORT = (e, n = 8) => {
  let s = n === "all" ? 4 : Math.min(4, n);
  return `\`low effort \u2192 1 diff pass \u2192 no verify \u2192 ${STAGES(n)}\`

## Turn 1 \u2014 read

One tool call: read the unified diff (\`git diff @{upstream}...HEAD; git diff HEAD\`
to cover both committed and uncommitted changes, or \`git diff main...HEAD\` /
the target passed as an argument). No subagents, no full-file reads.

## Turn 2 \u2014 findings

Flag runtime-correctness bugs visible from the hunk alone: inverted/wrong
condition, off-by-one, null/undefined deref where adjacent lines show the value
can be absent, removed guard, falsy-zero check, missing \`await\`,
wrong-variable copy-paste, error swallowed in a catch that should propagate.
Also flag \u2014 still from the hunk alone \u2014 new code that duplicates an existing
helper visible in the diff context, and dead code the diff leaves behind.

Do **not** flag style, naming, perf, missing tests, or anything outside the
hunk.

${
  e
    ? `Report ${findingCapPhrase(n)}, most-severe first, in one
${REPORTFINDINGS} call with \`{level, findings}\` \u2014 each entry has
\`file\`, \`line\`, \`summary\`, \`short_summary\` (\u226460 characters), and
\`failure_scenario\`.
Target at least min(files_changed, ${s}) findings \u2014 if you see fewer, widen to other hunks in the same diff before stopping. If fewer than ${s} genuine findings exist, report what you have. Do not also print the findings as text.
`
    : `Output ${findingCapPhrase(n)}, most-severe first, one line each:
\`path/to/file.ext:123 \u2014 what's wrong and the concrete failure\`.
Target at least min(files_changed, ${s}) findings \u2014 if you see fewer, widen to other hunks in the same diff before stopping. If fewer than ${s} genuine findings exist, emit what you have.
`
}`;
};
var REVIEW_REMOVED_BEHAVIOR_ANGLE = (e, n) => (s) => {
  let max = Math.max(1, Math.floor((s === "all" ? n : Math.min(s, n)) / 2));
  return e(s)
    .replace(
      `## Output
`,
      `## Output

Target **at least ${max} ${plural(max, "finding")}**. If fewer genuine findings exist, emit what you have \u2014 do not invent to hit the floor.
`,
    )
    .replace(/nothing survives verification/g, "nothing survives");
};
var REVIEW_CROSS_FILE_ANGLE = `### Angle A \u2014 line-by-line diff scan

Read every hunk in the diff, line by line. Then Read the enclosing function for
each hunk \u2014 bugs in unchanged lines of a touched function are in scope (the PR
re-exposes or fails to fix them). For every line ask: what input, state, timing,
or platform makes this line wrong? Look for inverted/wrong conditions,
off-by-one, null/undefined deref, missing \`await\`, falsy-zero checks,
wrong-variable copy-paste, error swallowed in catch, unescaped regex metachars.

### Angle B \u2014 removed-behavior auditor

For every line the diff DELETES or replaces, name the invariant or behavior it
enforced, then search the new code for where that invariant is re-established.
If you can't find it, that's a candidate: a removed guard, a dropped error
path, a narrowed validation, a deleted test that was covering a real case.

### Angle C \u2014 cross-file tracer

For each function the diff changes, find its callers (Grep for the symbol) and
check whether the change breaks any call site: a new precondition, a changed
return shape, a new exception, a timing/ordering dependency. Also check callees:
does a parallel change in the same PR make a call unsafe?
`;
var REVIEW_ANGLE_D =
  (e, n, s) =>
  (r, h = s) => `\`${e} \u2192 ${STAGES(h)}\`

${n}

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Find candidates (3 correctness angles + 3 cleanup angles + 1 altitude angle + 1 conventions angle, up to 6 each)

Run **8 independent finder angles** in sequence yourself, in THIS context \u2014 do NOT spawn subagents for them. Each
surfaces **up to 6 candidate findings** with \`file\`, \`line\`, a one-line
\`summary\`, and a concrete \`failure_scenario\`.

${REVIEW_CROSS_FILE_ANGLE}
${REVIEW_REUSE_ANGLE}
${REVIEW_ANGLE_SIMPLIFY}
${REVIEW_ANGLE_CONVENTIONS}
${REVIEW_ANGLE_TESTS}
${REVIEW_ANGLE_EFFICIENCY}
${REVIEW_CLEANUP_OUTPUT_FIELDS}
Pass every candidate with a nameable failure scenario through \u2014 finders that
silently drop half-believed candidates are the dominant cause of misses.

## Phase 2 \u2014 Dedup only (no verify)

Pool all candidates. Dedup near-duplicates only (same defect, same location, same reason \u2192 keep one). Do NOT run verifiers; do NOT re-judge. Sort by severity.

${REVIEW_REMOVED_BEHAVIOR_ANGLE(r, s)(h)}`;
var REVIEW_ANGLE_E = REVIEW_ANGLE_D(
  "medium effort \u2192 8 inline angles \u2192 dedup (no verify)",
  `You are reviewing for **correctness bugs**: surface every plausible bug. At this
level, catching real bugs matters more than avoiding false positives \u2014 err on
the side of surfacing.`,
  8,
);
var REVIEW_MINIMAL_PROMPT = REVIEW_ANGLE_D(
  "high effort \u2192 8 inline angles \u2192 dedup (no verify)",
  `You are reviewing for **recall** at high effort: catch every real bug a careful
reviewer would catch in one sitting. At this level, catching real bugs matters
more than avoiding false positives. Err on the side of surfacing.`,
  10,
);
var REVIEW_ANGLE_H = (
  e,
  n = 15,
) => `\`xhigh effort \u2192 10 inline angles \u2192 dedup (no verify) \u2192 sweep \u2192 ${STAGES(n)}\`

You are reviewing for **recall** at extra-high effort: catch every real bug. At
this level, catching real bugs matters more than avoiding false positives \u2014 a
missed bug ships. Err on the side of surfacing.

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Find candidates (5 correctness angles + 3 cleanup angles + 1 altitude angle + 1 conventions angle, up to 8 each)

Run **10 independent finder angles** in sequence yourself, in THIS context \u2014 do NOT spawn subagents for them. Each
surfaces **up to 8 candidate findings**. Do NOT let one angle's conclusions
suppress another's \u2014 if two angles flag the same line for different reasons,
record both.

${REVIEW_CROSS_FILE_ANGLE}
### Angle D \u2014 language-pitfall specialist

Scan for the classic pitfalls of the diff's language/framework \u2014 for example:
JS falsy-zero, \`==\` coercion, closure-captured loop var; Python mutable default
args, late-binding closures; Go nil-map write, range-var capture; SQL injection;
timezone/DST drift; float equality. Flag any instance the diff introduces.

### Angle E \u2014 wrapper/proxy correctness

When the PR adds or modifies a type that wraps another (cache, proxy, decorator,
adapter): check that every method routes to the wrapped instance and not back
through a registry/session/global \u2014 e.g. a caching provider holding a
\`delegate\` field that resolves IDs via \`session.get(...)\` instead of
\`delegate.get(...)\` will re-enter the cache or recurse. Also check that the
wrapper forwards all the methods the callers actually use.

${REVIEW_REUSE_ANGLE}
${REVIEW_ANGLE_SIMPLIFY}
${REVIEW_ANGLE_CONVENTIONS}
${REVIEW_ANGLE_TESTS}
${REVIEW_ANGLE_EFFICIENCY}
${REVIEW_CLEANUP_OUTPUT_FIELDS}
## Phase 2 \u2014 Dedup only (no verify)

Pool all candidates. Dedup near-duplicates only (same defect, same location, same reason \u2192 keep one). Do NOT run verifiers; do NOT re-judge. Sort by severity. Do NOT drop on uncertainty.

## Phase 3 \u2014 Sweep for gaps

Take one more pass (same context \u2014 no subagent) as a fresh reviewer who has the deduplicated list. Re-read
the diff and enclosing functions looking ONLY for defects not already listed.
Do not re-derive or re-confirm anything already there \u2014 the job is gaps. Focus
on what the first pass tends to miss: moved/extracted code that dropped a guard
or anchor; second-tier footguns (dataclass default evaluated once, \`hash()\`
non-determinism, lock-scope shrink, predicate methods with side effects);
setup/teardown asymmetry in tests; config defaults flipped.

Surface **up to 8 additional candidates**, each naming a defect not already on
the list. If nothing new, return nothing from this phase \u2014 do not pad.

${REVIEW_REMOVED_BEHAVIOR_ANGLE(e, 15)(n)}`;
var REVIEW_ANGLE_I = REVIEW_ANGLE_H;
//@ chunk-hantmvxa.js:76198-77878 placement
/**
 * 代码评审的最小提示词：单次 diff 审阅 + 指定阶段数，用于小改动快速评审。
 */
var buildMinimalReviewPrompt = (
  e = 15,
) => `\`minimal prompt \u2192 single careful diff pass \u2192 ${STAGES(e)}\`

You are reviewing a pull request for real bugs. Run \`git diff @{upstream}...HEAD\` (or \`git diff main...HEAD\` / \`git diff HEAD~1\`
if there's no upstream) to get the unified diff under review. If there are
uncommitted changes, or the range diff is empty, also run \`git diff HEAD\` and
include the working-tree changes in scope \u2014 the review often runs before the
commit. If a PR number, branch name, or file path was passed as an argument,
review that target instead. Treat this diff as the review scope.

Review the diff as a careful senior engineer would: read every hunk, open the surrounding files for context as needed (Read, Grep, git log/blame/show), and hunt for correctness issues \u2014 wrong or inverted conditions, off-by-one, null/undefined dereference, missing \`await\`, dropped error handling, removed guards or validations, broken callers of changed functions, races. Prefer real failure modes over style; every finding needs a concrete scenario in which the code misbehaves.

When you are done, submit ${e === "all" ? "every finding" : `at most ${e} ${plural(e, "finding")}`} via the ${REPORTFINDINGS} tool, filling its fields as defined \u2014 for each: the file path and start line, a severity, and a comment that states the issue and the concrete scenario in which the code misbehaves. Quality over quantity: include everything you genuinely believe is a real issue, and nothing you don't.

After the tool call, also restate the findings in your final reply \u2014 one line each, \`file:line \u2014 summary\` \u2014 so they stay visible in sessions that do not render tool output.
`;
var MINIMAL_REVIEW_PROMPT = buildMinimalReviewPrompt();
export {
  REVIEW_REUSE_ANGLE_LOW_EFFORT,
  REVIEW_ANGLE_E,
  REVIEW_MINIMAL_PROMPT,
  REVIEW_ANGLE_I,
  buildMinimalReviewPrompt,
};
