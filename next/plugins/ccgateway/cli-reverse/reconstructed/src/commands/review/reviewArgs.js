/**
 * commands/review/reviewArgs.ts
 *
 * 2.1.316 新增：/code-review 参数解析（等级、--fix/--comment、目标、--max-findings）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (10)
 * attribution: placement 10
 */
import { isVerifySkillRolloutOn } from "../../services/projectsRelay/relayGates.js";
import { isProactiveLevel, matchesToolName } from "../../Tool.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { getSessionSkillCommands } from "../../services/mcp/mcpAccountKey.js";
import { getProjectRoot } from "../../bootstrap/state.js";
import { VERIFY } from "../../skills/bundled/bundledSkillNames.js";
import { AFTER_REVIEW_SECTION } from "./reviewPosting.js";
import { EFFORT_LEVELS, parseEffortLevel, isEffortLevel } from "../../utils/effort.js";
import { extractFlags } from "./reviewAngles.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { plural } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ne2890fx.js:83336-83583 placement
async function afterReviewSection(context) {
  if (context.options?.isSkillPreload) return "";
  if (!isVerifySkillRolloutOn()) return "";
  if (!isProactiveLevel(context.getProactivityLevel())) return "";
  let tools = context.options?.tools;
  if (tools && !tools.some((tool) => matchesToolName(tool, SKILL))) return "";
  return (await getSessionSkillCommands(getProjectRoot(), context.storageV5)).some(
    (command) => command.name === VERIFY,
  )
    ? AFTER_REVIEW_SECTION
    : "";
}
//@ chunk-ne2890fx.js:83583-83737 placement
var REVIEW_LEVELS; // deferred: uses EFFORT_LEVELS (../../utils/effort.js) of its import cycle while loading; runs once the cycle is complete
var LEVEL_PREFIX_RE;
var MAX_FINDINGS_RE;
deferInit("chunk-ne2890fx.js:83583", () => {
  REVIEW_LEVELS = EFFORT_LEVELS;
  LEVEL_PREFIX_RE = new RegExp(`^(${REVIEW_LEVELS.map((level) => level.slice(0, 3)).join("|")})[a-z]*$`, "i");
  MAX_FINDINGS_RE = /(^|\s)--max-findings(?:(?:\s*=\s*|\s+)(?!--)(\S+)|\s*=\S*)?(?=\s|$)/g;
});
//@ chunk-ne2890fx.js:83737-83846 placement
function normalizeTargetTokens(tokens) {
  let [firstToken = "", ...restTokens] = tokens;
  return [firstToken.replaceAll("`", "").replace(/^#/, ""), ...restTokens].filter(Boolean).join(" ");
}
//@ chunk-ne2890fx.js:83846-84792 placement
/**
 * 解析 /code-review 参数：等级、--fix/--comment/--post、目标（PR 号/分支/路径）、--max-findings。
 */
function parseReviewArgs(input) {
  let { rawFirstToken } = extractFlags(input, []);
  let { flags, rest } = extractFlags(input.replace(MAX_FINDINGS_RE, "$1"), [
    "comment",
    "fix",
    "post",
    "no-post",
  ]);
  let comment = flags.has("comment");
  let fix = flags.has("fix");
  let post = flags.has("post");
  let last = [...input.matchAll(MAX_FINDINGS_RE)].at(-1);
  let maxFindingsArg = last ? (last[2] ?? "").toLowerCase() : undefined;
  let maxFindingsNumber =
    maxFindingsArg !== undefined && /^\d+$/.test(maxFindingsArg) ? Number(maxFindingsArg) : 0;
  let maxFindings =
    maxFindingsArg === "all" || maxFindingsArg === "default"
      ? maxFindingsArg
      : Number.isSafeInteger(maxFindingsNumber) && maxFindingsNumber > 0
        ? maxFindingsNumber
        : undefined;
  let maxFindingsIgnored = maxFindingsArg !== undefined && maxFindings === undefined;
  let tokens = rest.split(/\s+/).filter(Boolean);
  let firstWord = tokens[0] ?? "";
  if (rawFirstToken.toLowerCase() === "ultra")
    return {
      explicit: undefined,
      target: normalizeTargetTokens(tokens.slice(1)),
      comment,
      fix,
      post,
      unrecognizedLevel: undefined,
      ultraFallback: true,
      maxFindings,
      maxFindingsIgnored,
    };
  let explicitLevel = firstWord.toLowerCase() === "ultra" ? undefined : parseEffortLevel(firstWord);
  if (explicitLevel !== undefined)
    return {
      explicit: explicitLevel,
      target: normalizeTargetTokens(tokens.slice(1)),
      comment,
      fix,
      post,
      unrecognizedLevel: undefined,
      ultraFallback: false,
      maxFindings,
      maxFindingsIgnored,
    };
  let matches = LEVEL_PREFIX_RE.test(firstWord);
  return {
    explicit: undefined,
    target: normalizeTargetTokens(tokens),
    comment,
    fix,
    post,
    unrecognizedLevel: matches ? firstWord : undefined,
    ultraFallback: false,
    maxFindings,
    maxFindingsIgnored,
  };
}
//@ chunk-ne2890fx.js:84792-84872 placement
function lastReviewEffort() {
  let codeReviewLastEffort = getGlobalConfig().codeReviewLastEffort;
  return codeReviewLastEffort !== undefined && isEffortLevel(codeReviewLastEffort)
    ? codeReviewLastEffort
    : undefined;
}
//@ chunk-ne2890fx.js:84872-84959 placement
function saveReviewEffort(explicit, storageV5) {
  saveGlobalConfig(
    (config) =>
      config.codeReviewLastEffort === explicit
        ? config
        : {
            ...config,
            codeReviewLastEffort: explicit,
          },
    storageV5,
  );
}
//@ chunk-ne2890fx.js:84959-85074 placement
function defaultReviewLevel({ explicit, ultraFallback }, context) {
  if (context?.options?.isSkillPreload) return;
  return explicit === undefined && !ultraFallback ? lastReviewEffort() : undefined;
}
//@ chunk-ne2890fx.js:85074-85084 placement
var MAX_REVIEW_FINDINGS = 32;
//@ chunk-ne2890fx.js:85084-85426 placement
function resolveMaxFindings({ maxFindings }, cell, hasReportFindingsTool, context) {
  let codeReviewLastMaxFindings = getGlobalConfig().codeReviewLastMaxFindings;
  let reusesLastLimit =
    maxFindings === undefined &&
    cell !== "low-sonnet5" &&
    !context?.options?.isSkillPreload &&
    (codeReviewLastMaxFindings === "all" ||
      (typeof codeReviewLastMaxFindings === "number" &&
        Number.isSafeInteger(codeReviewLastMaxFindings) &&
        codeReviewLastMaxFindings > 0));
  let askedLimit = reusesLastLimit
    ? codeReviewLastMaxFindings
    : maxFindings === "default"
      ? undefined
      : maxFindings;
  let stated =
    cell === "low-sonnet5"
      ? undefined
      : (hasReportFindingsTool || cell === "o5-bmin") &&
          (askedLimit === "all" || (askedLimit !== undefined && askedLimit > MAX_REVIEW_FINDINGS))
        ? MAX_REVIEW_FINDINGS
        : askedLimit;
  return {
    asked: askedLimit,
    stated,
    reused: reusesLastLimit,
  };
}
//@ chunk-ne2890fx.js:85426-86165 placement
function describeMaxFindings({ asked, stated, reused, ignored }, who) {
  let notes = [];
  if (ignored)
    notes.push(
      `\`--max-findings\` was ignored: type a whole number above zero, \`all\`, or \`default\` after it.${reused ? "" : " Using the usual limit."}`,
    );
  let clampNote = `This review reports at most ${MAX_REVIEW_FINDINGS} findings, so the limit is ${MAX_REVIEW_FINDINGS} here.`;
  if (asked !== undefined && stated === undefined)
    notes.push("`--max-findings` does not change this review: low effort here has no maximum.");
  else if (stated !== asked)
    notes.push(
      reused
        ? `${who === "you" ? "You" : "The user"} set \`--max-findings ${asked}\` last time. ${clampNote}`
        : clampNote,
    );
  else if (reused && asked !== undefined)
    notes.push(
      asked === "all"
        ? `Reporting every finding, as ${who} chose last time with \`--max-findings all\`.`
        : `Reporting up to ${asked} ${plural(asked, "finding")}, the limit ${who} set last time with \`--max-findings\`.`,
    );
  return notes.join(" ");
}
export {
  REVIEW_LEVELS,
  parseReviewArgs,
  defaultReviewLevel,
  resolveMaxFindings,
  afterReviewSection,
  describeMaxFindings,
  saveReviewEffort,
};
