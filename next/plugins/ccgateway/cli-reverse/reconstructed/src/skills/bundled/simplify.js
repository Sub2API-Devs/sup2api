/**
 * skills/bundled/simplify.ts
 *
 * 2.1.316 新增：simplify 内置技能：清理改动代码（复用、简化、效率），按能否派子代理选 4 代理并行版或单代理版。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/simplify.ts
 * pieces: chunk-ne2890fx.js (2)
 * attribution: placement 2
 */
import {
  REVIEW_PHASE0_GATHER_DIFF,
  REVIEW_ANGLE_DONT_REIMPLEMENT,
  REVIEW_ANGLE_SIMPLIFY,
  REVIEW_ANGLE_CONVENTIONS,
  REVIEW_ANGLE_TESTS,
  canSpawnReviewAgents,
} from "../../commands/review/reviewAngles.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { SIMPLIFY } from "./bundledSkillNames.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ne2890fx.js:187258-189960 placement
/**
 * 无法并行派子代理时使用的单遍 /simplify 提示词。
 */
var SIMPLIFY_AGENTS_PROMPT; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var SIMPLIFY_SINGLE_PASS_PROMPT;
deferInit("chunk-ne2890fx.js:187258", () => {
  SIMPLIFY_AGENTS_PROMPT = `\`/simplify \u2192 4 cleanup agents in parallel \u2192 apply the fixes\`

You are improving the quality of the changed code, not hunting for bugs. Review
it for reuse, simplification, efficiency, and altitude issues, then fix what you
find. Do not look for correctness bugs \u2014 that is what \`/code-review\` is for.

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Review (4 cleanup agents in parallel)

Launch **4 independent review agents** via the ${AGENT} tool, all in a
single message so they run concurrently. Pass each agent the diff and one of
the four angles below. Each returns its findings with \`file\`, \`line\`, a
one-line \`summary\`, and the concrete cost (what is duplicated, wasted, or
harder to maintain).

### Reuse

${REVIEW_ANGLE_DONT_REIMPLEMENT}
${REVIEW_ANGLE_SIMPLIFY}
${REVIEW_ANGLE_CONVENTIONS}
${REVIEW_ANGLE_TESTS}
## Phase 2 \u2014 Apply the fixes

Wait for all four agents to complete, dedup findings that point at the same
line or mechanism, and fix each remaining one directly. Skip any finding whose
fix would change intended behavior, require changes well outside the reviewed
diff, or that you judge to be a false positive \u2014 note the skip rather than
arguing with it. Finish with a brief summary of what was fixed and what was
skipped (or confirm the code was already clean).
`;
  SIMPLIFY_SINGLE_PASS_PROMPT = `\`/simplify \u2192 ${AGENT} tool unavailable \u2192 single-pass inline cleanup \u2192 apply the fixes\`

You are improving the quality of the changed code, not hunting for bugs. Review
it for reuse, simplification, efficiency, and altitude issues, then fix what you
find. Do not look for correctness bugs \u2014 that is what \`/code-review\` is for.

The ${AGENT} tool isn't available in this context, so the usual
4-agent fan-out can't run. Work through all four angles below yourself, in
this same context, in one pass \u2014 do not skip an angle for lack of fan-out.

${REVIEW_PHASE0_GATHER_DIFF}
## Phase 1 \u2014 Review (4 cleanup angles, single pass)

Review the diff against each angle below in turn. For each, note findings with
\`file\`, \`line\`, a one-line \`summary\`, and the concrete cost (what is
duplicated, wasted, or harder to maintain).

### Reuse

${REVIEW_ANGLE_DONT_REIMPLEMENT}
${REVIEW_ANGLE_SIMPLIFY}
${REVIEW_ANGLE_CONVENTIONS}
${REVIEW_ANGLE_TESTS}
## Phase 2 \u2014 Apply the fixes

Dedup findings that point at the same line or mechanism, and fix each
remaining one directly. Skip any finding whose fix would change intended
behavior, require changes well outside the reviewed diff, or that you judge to
be a false positive \u2014 note the skip rather than arguing with it. Finish with a
brief summary of what was fixed and what was skipped (or confirm the code was
already clean). State clearly in your summary that this was a single-pass
review done without the ${AGENT} tool, not the full 4-agent
fan-out, so whoever reads it isn't misled about what actually ran.
`;
});
//@ chunk-ne2890fx.js:189960-190441 placement
/**
 * 注册 simplify skill（"Clean up the changed code without changing behavior"）：按会话能否派子代理选 4 代理并行版或单代理版提示词，参数是审查目标。
 */
function registerSimplifySkill() {
  registerBundledSkill({
    name: SIMPLIFY,
    menuDescription: "Clean up the changed code without changing behavior",
    description:
      "Review the changed code for reuse, simplification, efficiency, and altitude cleanups, then apply the fixes. Quality only \u2014 it does not hunt for bugs; use /code-review for that.",
    argumentHint: "[<target>]",
    userInvocable: true,
    async getPromptForCommand(args, context) {
      let trimmed = args.trim();
      let targetNote = trimmed
        ? `Review target: \`${trimmed}\`

`
        : "";
      let notes = "";
      let reviewPrompt = canSpawnReviewAgents(context) ? SIMPLIFY_AGENTS_PROMPT : SIMPLIFY_SINGLE_PASS_PROMPT;
      return [
        {
          type: "text",
          text: `${targetNote}${notes}${reviewPrompt}`,
        },
      ];
    },
  });
}
export { registerSimplifySkill };
