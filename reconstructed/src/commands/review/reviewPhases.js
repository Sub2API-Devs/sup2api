/**
 * commands/review/reviewPhases.ts
 *
 * 2.1.316 新增：审查各阶段（收集 diff、发现、验证、汇报）提示词与等级表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (4)
 * attribution: placement 4
 */
import { plural } from "../../utils/stringUtils.js";
import { REPORTFINDINGS } from "../../tools/ReportFindingsTool/constants.js";
import { STAGES } from "../../components/tasks/RemoteSessionDetailDialog.js";
import {
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
} from "./reviewAngles.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hantmvxa.js:58017-58106 placement
function findingCapPhrase(cap) {
  return cap === "all" ? "**every finding**" : `at most **${cap} ${plural(cap, "finding")}**`;
}
//@ chunk-hantmvxa.js:58106-63982 placement
/**
 * 低 effort 评审提示词：输出段落、低 effort 单次 diff、报告工具不可用时的说明与单次扫描提示。
 */
var buildReviewOutputSection; // deferred: uses REVIEW_ANGLE_LINE_SCAN (./reviewAngles.js) of its import cycle while loading; runs once the cycle is complete
var buildReportFindingsOutputSection;
var buildLowEffortPrompt;
var buildLowEffortInlinePrompt;
var REVIEW_ANGLES_BLOCK;
var REPORT_FINDINGS_UNAVAILABLE_NOTE;
var SINGLE_PASS_NOTICE;
deferInit("chunk-hantmvxa.js:58106", () => {
  buildReviewOutputSection = (cap) => `## Output

Return findings as a JSON array ${cap === "all" ? "with one object for every finding that survives, no maximum" : `of at most ${cap} ${plural(cap, "object")}`}:

\`\`\`json
[
  {
    "file": "path/to/file.ext",
    "line": 123,
    "summary": "one-sentence statement of the bug",
    "failure_scenario": "concrete inputs/state \u2192 wrong output/crash"
  }
]
\`\`\`

Ranked most-severe first. ${
    cap === "all"
      ? "Keep every finding that survives. There is no maximum."
      : `If more than ${cap} survive, keep the ${cap} most
severe.`
  } If nothing survives verification, return \`[]\`. Do not call the
${REPORTFINDINGS} tool even if it is available - this review's
output contract is the JSON block above.
`;
  buildReportFindingsOutputSection = (cap) => `## Output

Call the ${REPORTFINDINGS} tool once to report this review's results
with \`{level, findings}\`. \`findings\` is ${cap === "all" ? "every finding that survives, no maximum," : `at most ${cap} ${plural(cap, "entry", "entries")}`} ranked
most-severe first; each entry has \`file\`, \`line\`, \`summary\`,
\`short_summary\` \u2014 the claim compressed to \u226460 characters, no rationale
or consequence clause \u2014 \`failure_scenario\`, and \`category\` \u2014 a short kebab-case slug for the angle
that produced it (\`correctness\`, \`simplification\`, \`efficiency\`,
\`reuse\`, \`altitude\`, \`conventions\`, or a more specific slug like
\`test-coverage\` when one fits better) \u2014 plus \`verdict\` when a verify pass
produced one. ${cap === "all" ? "Keep every finding that survives. There is no maximum." : `If more than ${cap} survive, keep the ${cap} most severe.`} If
nothing survives verification, call it with an empty array. Do not also print
the findings as text, and do not create or publish an artifact of the review -
the tool call is the report.
`;
  buildLowEffortPrompt = (
    hasReportTool,
    cap = 4,
  ) => `\`low effort \u2192 1 diff pass \u2192 no verify \u2192 ${STAGES(cap)}\`

## Turn 1 \u2014 read

One tool call: read the unified diff (\`git diff @{upstream}...HEAD; git diff HEAD\`
to cover both committed and uncommitted changes, or \`git diff main...HEAD\` /
the target passed as an argument). Skip test/fixture
hunks (\`test/\`, \`spec/\`, \`__tests__/\`, \`*_test.*\`, \`*.test.*\`,
\`fixtures/\`, \`testdata/\`) \u2014 test-file changes are not reviewed at this level.
No subagents, no full-file reads.

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
  hasReportTool
    ? `Report ${findingCapPhrase(cap)}, most-severe first, in one
${REPORTFINDINGS} call with \`{level, findings}\` \u2014 each entry has
\`file\`, \`line\`, \`summary\`, \`short_summary\` (\u226460 characters), and
\`failure_scenario\`. If nothing qualifies, call it with an empty findings
array. Do not also print the findings as text.
`
    : `Output ${findingCapPhrase(cap)}, most-severe first, one line each:
\`path/to/file.ext:123 \u2014 what's wrong and the concrete failure\`. If nothing
qualifies, output exactly \`(none)\`. Do not call the
${REPORTFINDINGS} tool even if it is available.
`
}`;
  buildLowEffortInlinePrompt = (
    hasReportTool,
  ) => `\`low effort \u2192 1 diff pass \u2192 no verify \u2192 \u2265min(files,4) findings\`

## Turn 1 \u2014 read

One tool call: read the unified diff (\`git diff @{upstream}...HEAD; git diff HEAD\`
to cover both committed and uncommitted changes, or \`git diff main...HEAD\` /
the target passed as an argument). Skip test/fixture
hunks (\`test/\`, \`spec/\`, \`__tests__/\`, \`*_test.*\`, \`*.test.*\`,
\`fixtures/\`, \`testdata/\`) \u2014 test-file changes are not reviewed at this level.
No subagents, no full-file reads.

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
  hasReportTool
    ? `Target **min(files_changed, 4) findings**, most-severe first, reported
in one ${REPORTFINDINGS} call with \`{level, findings}\` \u2014 each
entry has \`file\`, \`line\`, \`summary\`, \`short_summary\` (\u226460 characters),
and \`failure_scenario\`. If you have fewer, do one more pass focused on the
largest changed file and on any **removed** code blocks. Call it with an
empty findings array only if the diff is trivially correct after that pass.
Do not also print the findings as text.
`
    : `Target **min(files_changed, 4) findings**, most-severe first, one
line each: \`path/to/file.ext:123 \u2014 what's wrong and the concrete failure\`.
If you have fewer, do one more pass focused on the largest changed file
and on any **removed** code blocks. Output \`(none)\` only if the diff is
trivially correct after that pass.
`
}`;
  REVIEW_ANGLES_BLOCK = `${REVIEW_BUG_ANGLES_A_TO_C}
${REVIEW_ANGLE_REUSE}
${REVIEW_ANGLE_SIMPLIFY}
${REVIEW_ANGLE_CONVENTIONS}
${REVIEW_ANGLE_TESTS}
${REVIEW_ANGLE_EFFICIENCY}`;
  REPORT_FINDINGS_UNAVAILABLE_NOTE = `The ${AGENT} tool isn't available in this context, so the usual
multi-agent fan-out and subagent verify pass can't run. Work through every
angle below yourself, in this same context, in one pass \u2014 do not skip angles
for lack of fan-out. Re-check each candidate against the diff before keeping
it; drop anything you can't back up with a concrete failure scenario.
`;
  SINGLE_PASS_NOTICE = `
State clearly in your summary that this was a single-pass review done without
the ${AGENT} tool, not the full multi-agent fan-out, so whoever reads
it isn't misled about what actually ran.
`;
});
//@ chunk-hantmvxa.js:63982-64879 placement
function composeReviewPhases({ tag, leadIn, angleCount, angles, cap, output, sweepFocus }) {
  let sweepSection = sweepFocus
    ? `
## Phase 3 \u2014 Sweep for gaps

Take one more pass yourself (same context, no subagent) as a fresh reviewer
who has the deduplicated list. Re-read the diff and enclosing functions
looking ONLY for defects not already listed: ${sweepFocus}
`
    : "";
  return `\`${tag}\`

${leadIn}

${REPORT_FINDINGS_UNAVAILABLE_NOTE}
${REVIEW_PHASE0_GATHER_DIFF}## Phase 1 \u2014 Find candidates (${angleCount} angles, single pass)

Work through **${angleCount} angles** yourself, in sequence, in this same
context \u2014 do not spawn subagents. Each surfaces candidate findings with
\`file\`, \`line\`, a one-line \`summary\`, and a concrete \`failure_scenario\`.

${angles}
${REVIEW_CLEANUP_OUTPUT_FIELDS}
## Phase 2 \u2014 Dedup and self-check (no subagent verify)

Dedup near-duplicates (same defect, same location, same reason \u2192 keep one).
Re-check each remaining candidate yourself against the diff before keeping it.
${sweepSection}
${output(cap)}${SINGLE_PASS_NOTICE}`;
}
//@ chunk-hantmvxa.js:64879-68578 placement
/**
 * 高/xhigh/max effort 评审提示词构造器与报告工具不可用时的说明。
 */
var buildMediumReviewPrompt; // deferred: uses REVIEW_ANGLE_LINE_SCAN (./reviewAngles.js) of its import cycle while loading; runs once the cycle is complete
var buildHighEffortPrompt;
var REVIEW_ANGLES_BLOCK_HIGH;
var makeEffortPromptBuilder;
var buildXhighEffortPrompt;
var buildMaxEffortPrompt;
deferInit("chunk-hantmvxa.js:64879", () => {
  buildMediumReviewPrompt = (outputBuilder, canSpawn = true, cap = 8) => {
    if (!canSpawn)
      return composeReviewPhases({
        tag: `medium effort \u2192 ${AGENT} tool unavailable \u2192 single-pass inline \u2192 ${STAGES(cap)}`,
        leadIn: `You are reviewing for **precision** at medium effort: every finding you surface
should be one a maintainer would act on.`,
        angleCount: 8,
        angles: REVIEW_ANGLES_BLOCK,
        cap,
        output: outputBuilder,
      });
    return `\`medium effort \u2192 3+5 angles \xD7 6 candidates \u2192 1-vote verify \u2192 ${STAGES(cap)}\`

You are reviewing for **precision** at medium effort: every finding you surface
should be one a maintainer would act on.

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Find candidates (3 correctness angles + 3 cleanup angles + 1 altitude angle + 1 conventions angle, up to 6 each)

Run **8 independent finder angles** via the ${AGENT} tool. Each
surfaces **up to 6 candidate findings** with \`file\`, \`line\`, a one-line
\`summary\`, and a concrete \`failure_scenario\`. ${REPORT_FINDINGS_FALLBACK_NOTE}

${REVIEW_ANGLES_BLOCK}
${REVIEW_CLEANUP_OUTPUT_FIELDS}
Pass every candidate with a nameable failure scenario through \u2014 finders that
silently drop half-believed candidates bypass the verify step and are the
dominant cause of misses.

${REVIEW_PHASE2_VERIFY_THREE_STATE}
${outputBuilder(cap)}`;
  };
  buildHighEffortPrompt = (outputBuilder, canSpawn = true, cap = 10) => {
    if (!canSpawn)
      return composeReviewPhases({
        tag: `high effort \u2192 ${AGENT} tool unavailable \u2192 single-pass inline \u2192 ${STAGES(cap)}`,
        leadIn: `You are reviewing for **recall** at high effort: catch every real bug a careful
reviewer would catch in one sitting. At this level, catching real bugs matters
more than avoiding false positives. Err on the side of surfacing.`,
        angleCount: 8,
        angles: REVIEW_ANGLES_BLOCK,
        cap,
        output: outputBuilder,
      });
    return `\`high effort \u2192 3+5 angles \xD7 6 candidates \u2192 1-vote verify (recall-biased) \u2192 ${STAGES(cap)}\`

You are reviewing for **recall** at high effort: catch every real bug a careful
reviewer would catch in one sitting. At this level, catching real bugs matters
more than avoiding false positives. Err on the side of surfacing.

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Find candidates (3 correctness angles + 3 cleanup angles + 1 altitude angle + 1 conventions angle, up to 6 each)

Run **8 independent finder angles** via the ${AGENT} tool. Each
surfaces **up to 6 candidate findings** with \`file\`, \`line\`, a one-line
\`summary\`, and a concrete \`failure_scenario\`. ${REPORT_FINDINGS_FALLBACK_NOTE}

${REVIEW_ANGLES_BLOCK}
${REVIEW_CLEANUP_OUTPUT_FIELDS}
Pass every candidate with a nameable failure scenario through \u2014 finders that
silently drop half-believed candidates bypass the verify step and are the
dominant cause of misses.

${REVIEW_PHASE2_VERIFY_RECALL_BIASED}
${outputBuilder(cap)}`;
  };
  REVIEW_ANGLES_BLOCK_HIGH = `${REVIEW_BUG_ANGLES_A_TO_E}
${REVIEW_ANGLE_REUSE}
${REVIEW_ANGLE_SIMPLIFY}
${REVIEW_ANGLE_CONVENTIONS}
${REVIEW_ANGLE_TESTS}
${REVIEW_ANGLE_EFFICIENCY}`;
  makeEffortPromptBuilder =
    (effortName) =>
    (outputBuilder, canSpawn = true, cap = 15) => {
      if (!canSpawn)
        return composeReviewPhases({
          tag: `${effortName} effort \u2192 ${AGENT} tool unavailable \u2192 single-pass inline \u2192 ${STAGES(cap)}`,
          leadIn: `You are reviewing for **recall** at ${effortName === "max" ? "maximum" : "extra-high"} effort: catch every real bug. At
this level, catching real bugs matters more than avoiding false positives \u2014 a
missed bug ships. Err on the side of surfacing.`,
          angleCount: 10,
          angles: REVIEW_ANGLES_BLOCK_HIGH,
          cap,
          output: outputBuilder,
          sweepFocus: REVIEW_ANGLE_DROPPED_GUARD_HINT,
        });
      return `\`${effortName} effort \u2192 5+5 angles \xD7 8 candidates \u2192 1-vote verify \u2192 sweep \u2192 ${STAGES(cap)}\`

You are reviewing for **recall** at ${effortName === "max" ? "maximum" : "extra-high"} effort: catch every real bug. At
this level, catching real bugs matters more than avoiding false positives \u2014 a
missed bug ships. Err on the side of surfacing.

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Find candidates (5 correctness angles + 3 cleanup angles + 1 altitude angle + 1 conventions angle, up to 8 each)

Run **10 independent finder angles** via the ${AGENT} tool. Each
surfaces **up to 8 candidate findings**. Do NOT let one angle's conclusions
suppress another's \u2014 if two angles flag the same line for different reasons,
record both. ${REPORT_FINDINGS_FALLBACK_NOTE}

${REVIEW_ANGLES_BLOCK_HIGH}
${REVIEW_CLEANUP_OUTPUT_FIELDS}
${REVIEW_PHASE2_VERIFY_THREE_STATE}
This is recall mode \u2014 a single non-REFUTED vote carries the finding. Do NOT
drop on uncertainty.

${REVIEW_PHASE3_GAP_SWEEP}
${outputBuilder(cap)}`;
    };
  buildXhighEffortPrompt = makeEffortPromptBuilder("xhigh");
  buildMaxEffortPrompt = makeEffortPromptBuilder("max");
});
export {
  findingCapPhrase,
  buildLowEffortPrompt,
  buildLowEffortInlinePrompt,
  buildMediumReviewPrompt,
  buildHighEffortPrompt,
  buildXhighEffortPrompt,
  buildMaxEffortPrompt,
  buildReportFindingsOutputSection,
  buildReviewOutputSection,
};
