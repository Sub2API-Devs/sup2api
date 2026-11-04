/**
 * commands/review/reviewAngles.ts
 *
 * 2.1.316 新增：code-review 技能的正确性审查角度（逐行扫描等）提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (7)
 * attribution: placement 7
 */
import { urlPatternToRegex, escapeControlChars, plural } from "../../utils/stringUtils.js";
import { getAgentDepth } from "../../utils/agentContext.js";
import { getMaxSubagentSpawnDepth } from "../../tools/AgentTool/spawnDepth.js";
import { toolMatchesName } from "../../Tool.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  array,
  objectSchema,
  stringSchema,
  union,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getPrintOutputFormat } from "../../bootstrap/state.js";
import { safeParseJSON } from "../../utils/json.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hantmvxa.js:49051-49274 placement
function extractFlags(input, flagNames) {
  let trimmed = input.trim();
  let rawFirstToken = trimmed.split(/\s+/, 1)[0] ?? "";
  let flags = new Set();
  let rest = trimmed;
  for (let flagName of flagNames) {
    let replaced = rest.replace(new RegExp(`(?:^|\\s)--${urlPatternToRegex(flagName)}(?=\\s|$)`, "g"), "");
    if (replaced !== rest) {
      flags.add(flagName);
      rest = replaced.trim();
    }
  }
  return {
    rawFirstToken,
    flags,
    rest,
  };
}
//@ chunk-hantmvxa.js:49274-49409 placement
function canSpawnReviewAgents(context) {
  if (context.agentContext && getAgentDepth(context.agentContext) >= getMaxSubagentSpawnDepth()) return false;
  let tools = context.options?.tools;
  if (!tools) return true;
  return tools.some((tool) => toolMatchesName(tool, AGENT));
}
//@ chunk-hantmvxa.js:49409-51848 placement
/**
 * 代码评审的五个清理类角度文本（别重复实现、简化、约定、效率、测试），提示词里逐个引用。
 */
var REVIEW_PHASE0_GATHER_DIFF =
  "## Phase 0 \u2014 Gather the diff\n\nRun `git diff @{upstream}...HEAD` (or `git diff main...HEAD` / `git diff HEAD~1`\nif there's no upstream) to get the unified diff under review. If there are\nuncommitted changes, or the range diff is empty, also run `git diff HEAD` and\ninclude the working-tree changes in scope \u2014 the review often runs before the\ncommit. If a PR number, branch name, or file path was passed as an argument,\nreview that target instead. Treat this diff as the review scope.\n";
var REVIEW_ANGLE_DONT_REIMPLEMENT = `Flag new code that re-implements something the codebase
already has \u2014 Grep shared/utility modules and files adjacent to the change,
and name the existing helper to call instead.
`;
var REVIEW_ANGLE_SIMPLIFY = `### Simplification

Flag unnecessary complexity the diff adds: redundant or derivable state,
copy-paste with slight variation, deep nesting, dead code left behind. Name
the simpler form that does the same job.
`;
var REVIEW_ANGLE_CONVENTIONS = `### Efficiency

Flag wasted work the diff introduces: redundant computation or repeated I/O,
independent operations run sequentially, blocking work added to startup or
hot paths. Also flag long-lived objects built from closures or captured
environments \u2014 they keep the entire enclosing scope alive for the object's
lifetime (a memory leak when that scope holds large values); prefer a
class/struct that copies only the fields it needs. Name the cheaper
alternative.
`;
var REVIEW_ANGLE_EFFICIENCY = `### Conventions (CLAUDE.md)

Find the CLAUDE.md files that govern the changed code: the user-level
~/.claude/CLAUDE.md, the repo-root CLAUDE.md, plus any CLAUDE.md or
CLAUDE.local.md in a directory that is an ancestor of a changed file (a
directory's CLAUDE.md only applies to files at or below it). Read each one
that exists, then check the diff for clear violations of the rules they state.

Only flag a violation when you can quote the exact rule and the exact line
that breaks it \u2014 no style preferences, no vague "spirit of the doc"
inferences. In the finding, name the CLAUDE.md path and quote the rule so the
report can cite it. If no CLAUDE.md applies, return nothing for this angle.
`;
var REVIEW_ANGLE_TESTS = `### Altitude

Check that each change fixes the root cause at the right depth rather than
patching a symptom with a fragile bandaid. Special cases layered on shared
infrastructure are a sign the fix isn't deep enough \u2014 prefer the simpler, more
general change to the underlying mechanism over adding special cases, and name
that change.
`;
//@ chunk-hantmvxa.js:51848-52000 placement
var ReviewFindingsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var JSON_FENCE_RE;
deferInit("chunk-hantmvxa.js:51848", () => {
  ReviewFindingsSchema = DoctorLazy(() =>
    array(
      objectSchema({
        file: stringSchema(),
        line: union([numberSchema(), stringSchema()]).nullish(),
        summary: stringSchema(),
        failure_scenario: stringSchema().nullish(),
      }),
    ),
  );
  JSON_FENCE_RE = /^```json[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gim;
});
//@ chunk-hantmvxa.js:52000-52144 placement
function formatReviewOutput(text) {
  let printOutputFormat = getPrintOutputFormat();
  if (printOutputFormat === "text" || printOutputFormat === "json") return text;
  return (
    (text.trimStart().startsWith("[") ? formatReviewFindings(text) : undefined) ??
    text.replace(JSON_FENCE_RE, (wholeMatch, fenceBody) => formatReviewFindings(fenceBody) ?? wholeMatch)
  );
}
//@ chunk-hantmvxa.js:52144-52613 placement
function formatReviewFindings(text) {
  let parsed = ReviewFindingsSchema().safeParse(safeParseJSON(text.trim(), false));
  if (!parsed.success) return;
  let findings = parsed.data;
  if (findings.length === 0) return "No findings.";
  let mapped = findings.map((finding, index) => {
    let location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    let scenarioSuffix = finding.failure_scenario
      ? `

Failure scenario: ${finding.failure_scenario}`
      : "";
    let prefix = `${index + 1}. `;
    return escapeControlChars(`${prefix}\`${location}\`: ${finding.summary}${scenarioSuffix}`).replace(
      /\n(?=[^\n])/g,
      `
${" ".repeat(prefix.length)}`,
    );
  });
  let severityNote = findings.length > 1 ? ", most severe first" : "";
  return `${findings.length} ${plural(findings.length, "finding")}${severityNote}:

${mapped.join(`

`)}`;
}
//@ chunk-hantmvxa.js:52613-57940 placement
/**
 * 代码评审的 bug 类角度文本：逐行扫描、删除行为审计、跨文件追踪、语言陷阱、包装/代理正确性，以及 verify 阶段与 gap sweep 的提示词。
 */
var REVIEW_ANGLE_LINE_SCAN; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var REVIEW_ANGLE_B_REMOVED_BEHAVIOR;
var REVIEW_ANGLE_C_CROSS_FILE;
var REVIEW_ANGLE_D_LANGUAGE_PITFALLS;
var REVIEW_ANGLE_E_WRAPPER_PROXY;
var REPORT_FINDINGS_FALLBACK_NOTE;
var REVIEW_BUG_ANGLES_A_TO_C;
var REVIEW_BUG_ANGLES_A_TO_E;
var REVIEW_ANGLE_REUSE;
var REVIEW_CLEANUP_OUTPUT_FIELDS;
var CONFIRMED_CRITERIA_TEXT;
var PLAUSIBLE_DEFAULT_TEXT;
var REVIEW_PHASE2_VERIFY_THREE_STATE;
var REVIEW_PHASE2_VERIFY_RECALL_BIASED;
var REVIEW_ANGLE_DROPPED_GUARD_HINT;
var REVIEW_PHASE3_GAP_SWEEP;
deferInit("chunk-hantmvxa.js:52613", () => {
  REVIEW_ANGLE_LINE_SCAN = `### Angle A \u2014 line-by-line diff scan

Read every hunk in the diff, line by line. Then Read the enclosing function for
each hunk \u2014 bugs in unchanged lines of a touched function are in scope (the PR
re-exposes or fails to fix them). For every line ask: what input, state, timing,
or platform makes this line wrong? Look for inverted/wrong conditions,
off-by-one, null/undefined deref, missing \`await\`, falsy-zero checks,
wrong-variable copy-paste, error swallowed in catch, unescaped regex metachars.
`;
  REVIEW_ANGLE_B_REMOVED_BEHAVIOR = `### Angle B \u2014 removed-behavior auditor

For every line the diff DELETES or replaces, name the invariant or behavior it
enforced, then search the new code for where that invariant is re-established.
If you can't find it, that's a candidate: a removed guard, a dropped error
path, a narrowed validation, a deleted test that was covering a real case.
`;
  REVIEW_ANGLE_C_CROSS_FILE = `### Angle C \u2014 cross-file tracer

For each function the diff changes, find its callers (Grep for the symbol) and
check whether the change breaks any call site: a new precondition, a changed
return shape, a new exception, a timing/ordering dependency. Also check callees:
does a parallel change in the same PR make a call unsafe?
`;
  REVIEW_ANGLE_D_LANGUAGE_PITFALLS = `### Angle D \u2014 language-pitfall specialist

Scan for the classic pitfalls of the diff's language/framework \u2014 for example:
JS falsy-zero, \`==\` coercion, closure-captured loop var; Python mutable default
args, late-binding closures; Go nil-map write, range-var capture; SQL injection;
timezone/DST drift; float equality. Flag any instance the diff introduces.
`;
  REVIEW_ANGLE_E_WRAPPER_PROXY = `### Angle E \u2014 wrapper/proxy correctness

When the PR adds or modifies a type that wraps another (cache, proxy, decorator,
adapter): check that every method routes to the wrapped instance and not back
through a registry/session/global \u2014 e.g. a caching provider holding a
\`delegate\` field that resolves IDs via \`session.get(...)\` instead of
\`delegate.get(...)\` will re-enter the cache or recurse. Also check that the
wrapper forwards all the methods the callers actually use.
`;
  REPORT_FINDINGS_FALLBACK_NOTE = `If the ${AGENT} tool is not available in your current tool set, do not error \u2014 perform each angle (and each verification) yourself, sequentially, in this context.`;
  REVIEW_BUG_ANGLES_A_TO_C = `${REVIEW_ANGLE_LINE_SCAN}
${REVIEW_ANGLE_B_REMOVED_BEHAVIOR}
${REVIEW_ANGLE_C_CROSS_FILE}`;
  REVIEW_BUG_ANGLES_A_TO_E = `${REVIEW_BUG_ANGLES_A_TO_C}
${REVIEW_ANGLE_D_LANGUAGE_PITFALLS}
${REVIEW_ANGLE_E_WRAPPER_PROXY}`;
  REVIEW_ANGLE_REUSE = `### Reuse

The angles above hunt for bugs; this one and the next two hunt for cleanup in
the changed code. ${REVIEW_ANGLE_DONT_REIMPLEMENT}`;
  REVIEW_CLEANUP_OUTPUT_FIELDS =
    "Cleanup, altitude, and conventions candidates use the same\n`file`/`line`/`summary` shape; in `failure_scenario`, state the concrete\ncost (what is duplicated, wasted, harder to maintain, or which CLAUDE.md rule\nis broken) instead of a crash. Correctness bugs always outrank cleanup,\naltitude, and conventions findings when the output cap forces a cut.\n";
  CONFIRMED_CRITERIA_TEXT = `- **CONFIRMED** \u2014 can name the inputs/state that trigger it and the wrong
  output or crash. Quote the line.
- **PLAUSIBLE** \u2014 mechanism is real, trigger is uncertain (timing, env,
  config). State what would confirm it.
- **REFUTED** \u2014 factually wrong (code doesn't say that) or guarded elsewhere.
  Quote the line that proves it.`;
  PLAUSIBLE_DEFAULT_TEXT = `**PLAUSIBLE by default** \u2014 do not refute a candidate for being "speculative" or
"depends on runtime state" when the state is realistic: concurrency races,
nil/undefined on a rare-but-reachable path (error handler, cold cache, missing
optional field), falsy-zero treated as missing, off-by-one on a boundary the
code does not exclude, retry storms / partial failures, regex/allowlist that
lost an anchor. These are PLAUSIBLE.

**REFUTED** only when constructible from the code: factually wrong (quote the
actual line); provably impossible (type/constant/invariant \u2014 show it); already
handled in this diff (cite the guard); or pure style with no observable effect.`;
  REVIEW_PHASE2_VERIFY_THREE_STATE = `## Phase 2 \u2014 Verify (1-vote, 3-state)

Dedup candidates that point at the same line/mechanism, keeping the one with
the most concrete failure scenario. For each remaining candidate, run **one
verifier** via the ${AGENT} tool: give it the diff, the relevant
file(s), and the candidate, and have it return exactly one of:

${CONFIRMED_CRITERIA_TEXT}

Keep candidates where the vote is CONFIRMED or PLAUSIBLE.
`;
  REVIEW_PHASE2_VERIFY_RECALL_BIASED = `## Phase 2 \u2014 Verify (1-vote, recall-biased)

Dedup near-duplicates (same defect, same location, same reason \u2192 keep one). For
each remaining candidate, run **one verifier** via the ${AGENT} tool:
give it the diff, the relevant file(s), and the candidate; it returns exactly
one of **CONFIRMED / PLAUSIBLE / REFUTED**.

${PLAUSIBLE_DEFAULT_TEXT}

Keep **CONFIRMED and PLAUSIBLE**. Drop REFUTED.
`;
  REVIEW_ANGLE_DROPPED_GUARD_HINT = `moved/extracted code that dropped a guard
or anchor; second-tier footguns (dataclass default evaluated once, \`hash()\`
non-determinism, lock-scope shrink, predicate methods with side effects);
setup/teardown asymmetry in tests; config defaults flipped.`;
  REVIEW_PHASE3_GAP_SWEEP = `## Phase 3 \u2014 Sweep for gaps

Run **one more finder** as a fresh reviewer who has the verified list. Re-read
the diff and enclosing functions looking ONLY for defects not already listed.
Do not re-derive or re-confirm anything already there \u2014 the job is gaps. Focus
on what the first pass tends to miss: ${REVIEW_ANGLE_DROPPED_GUARD_HINT}

Surface **up to 8 additional candidates**, each naming a defect not already on
the list. If nothing new, return an empty sweep \u2014 do not pad.
`;
});
export {
  REVIEW_BUG_ANGLES_A_TO_C,
  REVIEW_ANGLE_REUSE,
  REVIEW_ANGLE_SIMPLIFY,
  REVIEW_ANGLE_CONVENTIONS,
  REVIEW_ANGLE_TESTS,
  REVIEW_ANGLE_EFFICIENCY,
  REVIEW_PHASE0_GATHER_DIFF,
  REVIEW_CLEANUP_OUTPUT_FIELDS,
  REPORT_FINDINGS_FALLBACK_NOTE,
  REVIEW_PHASE2_VERIFY_THREE_STATE,
  REVIEW_PHASE2_VERIFY_RECALL_BIASED,
  REVIEW_BUG_ANGLES_A_TO_E,
  REVIEW_ANGLE_DROPPED_GUARD_HINT,
  REVIEW_PHASE3_GAP_SWEEP,
  extractFlags,
  canSpawnReviewAgents,
  formatReviewOutput,
  REVIEW_ANGLE_DONT_REIMPLEMENT,
};
