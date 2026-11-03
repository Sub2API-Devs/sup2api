/**
 * commands/review/reviewArgs.ts
 *
 * 2.1.316 新增：/code-review 参数解析（等级、--fix/--comment、目标、--max-findings）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (10)
 * attribution: placement 10
 */
import { isVerifySkillRolloutOn } from "../../services/projectsRelay/relayGates.js";
import { isProactiveLevel, toolMatchesName } from "../../Tool.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { getSessionSkillCommands } from "../../services/mcp/mcpAccountKey.js";
import { getProjectRoot } from "../../bootstrap/state.js";
import { VERIFY } from "../../skills/bundled/bundledSkillNames.js";
import { AFTER_REVIEW_SECTION } from "./reviewPosting.js";
import { EFFORT_LEVELS, parseEffortLevel, isEffortLevel } from "../../utils/effort.js";
import { extractFlags } from "./reviewAngles.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-hantmvxa.js:83163-83410 placement
async function afterReviewSection(e) {
  if (e.options?.isSkillPreload) return "";
  if (!isVerifySkillRolloutOn()) return "";
  if (!isProactiveLevel(e.getProactivityLevel())) return "";
  let tools = e.options?.tools;
  if (tools && !tools.some((tool) => toolMatchesName(tool, SKILL))) return "";
  return (await getSessionSkillCommands(getProjectRoot(), e.storageV5)).some((r) => r.name === VERIFY)
    ? AFTER_REVIEW_SECTION
    : "";
}
//@ chunk-hantmvxa.js:83410-83564 placement
var REVIEW_LEVELS = EFFORT_LEVELS;
var LEVEL_PREFIX_RE = new RegExp(`^(${REVIEW_LEVELS.map((e) => e.slice(0, 3)).join("|")})[a-z]*$`, "i");
var MAX_FINDINGS_RE = /(^|\s)--max-findings(?:(?:\s*=\s*|\s+)(?!--)(\S+)|\s*=\S*)?(?=\s|$)/g;
//@ chunk-hantmvxa.js:83564-83673 placement
function normalizeTargetTokens(e) {
  let [n = "", ...s] = e;
  return [n.replaceAll("`", "").replace(/^#/, ""), ...s].filter(Boolean).join(" ");
}
//@ chunk-hantmvxa.js:83673-84619 placement
/**
 * 解析 /code-review 参数：等级、--fix/--comment/--post、目标（PR 号/分支/路径）、--max-findings。
 */
function parseReviewArgs(e) {
  let { rawFirstToken } = extractFlags(e, []);
  let { flags, rest } = extractFlags(e.replace(MAX_FINDINGS_RE, "$1"), ["comment", "fix", "post", "no-post"]);
  let comment = flags.has("comment");
  let fix = flags.has("fix");
  let post = flags.has("post");
  let last = [...e.matchAll(MAX_FINDINGS_RE)].at(-1);
  let k = last ? (last[2] ?? "").toLowerCase() : undefined;
  let C = k !== undefined && /^\d+$/.test(k) ? Number(k) : 0;
  let S = k === "all" || k === "default" ? k : Number.isSafeInteger(C) && C > 0 ? C : undefined;
  let maxFindingsIgnored = k !== undefined && S === undefined;
  let filtered = rest.split(/\s+/).filter(Boolean);
  let L = filtered[0] ?? "";
  if (rawFirstToken.toLowerCase() === "ultra")
    return {
      explicit: undefined,
      target: normalizeTargetTokens(filtered.slice(1)),
      comment,
      fix,
      post,
      unrecognizedLevel: undefined,
      ultraFallback: true,
      maxFindings: S,
      maxFindingsIgnored,
    };
  let x = L.toLowerCase() === "ultra" ? undefined : parseEffortLevel(L);
  if (x !== undefined)
    return {
      explicit: x,
      target: normalizeTargetTokens(filtered.slice(1)),
      comment,
      fix,
      post,
      unrecognizedLevel: undefined,
      ultraFallback: false,
      maxFindings: S,
      maxFindingsIgnored,
    };
  let matches = LEVEL_PREFIX_RE.test(L);
  return {
    explicit: undefined,
    target: normalizeTargetTokens(filtered),
    comment,
    fix,
    post,
    unrecognizedLevel: matches ? L : undefined,
    ultraFallback: false,
    maxFindings: S,
    maxFindingsIgnored,
  };
}
//@ chunk-hantmvxa.js:84619-84699 placement
function lastReviewEffort() {
  let codeReviewLastEffort = getGlobalConfig().codeReviewLastEffort;
  return codeReviewLastEffort !== undefined && isEffortLevel(codeReviewLastEffort)
    ? codeReviewLastEffort
    : undefined;
}
//@ chunk-hantmvxa.js:84699-84786 placement
function saveReviewEffort(explicit, storageV5) {
  saveGlobalConfig(
    (s) =>
      s.codeReviewLastEffort === explicit
        ? s
        : {
            ...s,
            codeReviewLastEffort: explicit,
          },
    storageV5,
  );
}
//@ chunk-hantmvxa.js:84786-84901 placement
function defaultReviewLevel({ explicit, ultraFallback }, s) {
  if (s?.options?.isSkillPreload) return;
  return explicit === undefined && !ultraFallback ? lastReviewEffort() : undefined;
}
//@ chunk-hantmvxa.js:84901-84911 placement
var MAX_REVIEW_FINDINGS = 32;
//@ chunk-hantmvxa.js:84911-85253 placement
function resolveMaxFindings({ maxFindings }, cell, s, r) {
  let codeReviewLastMaxFindings = getGlobalConfig().codeReviewLastMaxFindings;
  let y =
    maxFindings === undefined &&
    cell !== "low-sonnet5" &&
    !r?.options?.isSkillPreload &&
    (codeReviewLastMaxFindings === "all" ||
      (typeof codeReviewLastMaxFindings === "number" &&
        Number.isSafeInteger(codeReviewLastMaxFindings) &&
        codeReviewLastMaxFindings > 0));
  let w = y ? codeReviewLastMaxFindings : maxFindings === "default" ? undefined : maxFindings;
  let stated =
    cell === "low-sonnet5"
      ? undefined
      : (s || cell === "o5-bmin") && (w === "all" || (w !== undefined && w > MAX_REVIEW_FINDINGS))
        ? MAX_REVIEW_FINDINGS
        : w;
  return {
    asked: w,
    stated,
    reused: y,
  };
}
//@ chunk-hantmvxa.js:85253-85992 placement
function describeMaxFindings({ asked, stated, reused, ignored }, h) {
  let y = [];
  if (ignored)
    y.push(
      `\`--max-findings\` was ignored: type a whole number above zero, \`all\`, or \`default\` after it.${reused ? "" : " Using the usual limit."}`,
    );
  let w = `This review reports at most ${MAX_REVIEW_FINDINGS} findings, so the limit is ${MAX_REVIEW_FINDINGS} here.`;
  if (asked !== undefined && stated === undefined)
    y.push("`--max-findings` does not change this review: low effort here has no maximum.");
  else if (stated !== asked)
    y.push(
      reused ? `${h === "you" ? "You" : "The user"} set \`--max-findings ${asked}\` last time. ${w}` : w,
    );
  else if (reused && asked !== undefined)
    y.push(
      asked === "all"
        ? `Reporting every finding, as ${h} chose last time with \`--max-findings all\`.`
        : `Reporting up to ${asked} ${plural(asked, "finding")}, the limit ${h} set last time with \`--max-findings\`.`,
    );
  return y.join(" ");
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
