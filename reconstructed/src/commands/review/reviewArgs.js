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
import { smn } from "../../services/mcp/mcpAccountKey.js";
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
  let n = e.options?.tools;
  if (n && !n.some((r) => toolMatchesName(r, SKILL))) return "";
  return (await smn(getProjectRoot(), e.storageV5)).some((r) => r.name === VERIFY)
    ? AFTER_REVIEW_SECTION
    : "";
}
//@ chunk-hantmvxa.js:83410-83564 placement
var REVIEW_LEVELS = EFFORT_LEVELS,
  LEVEL_PREFIX_RE = new RegExp(`^(${REVIEW_LEVELS.map((e) => e.slice(0, 3)).join("|")})[a-z]*$`, "i"),
  MAX_FINDINGS_RE = /(^|\s)--max-findings(?:(?:\s*=\s*|\s+)(?!--)(\S+)|\s*=\S*)?(?=\s|$)/g;
//@ chunk-hantmvxa.js:83564-83673 placement
function normalizeTargetTokens(e) {
  let [n = "", ...s] = e;
  return [n.replaceAll("`", "").replace(/^#/, ""), ...s].filter(Boolean).join(" ");
}
/**
 * 解析 /code-review 参数：等级、--fix/--comment/--post、目标（PR 号/分支/路径）、--max-findings。
 */
//@ chunk-hantmvxa.js:83673-84619 placement
function parseReviewArgs(e) {
  let { rawFirstToken: rawFirstToken } = extractFlags(e, []),
    { flags: flags, rest: rest } = extractFlags(e.replace(MAX_FINDINGS_RE, "$1"), [
      "comment",
      "fix",
      "post",
      "no-post",
    ]),
    h = flags.has("comment"),
    y = flags.has("fix"),
    w = flags.has("post"),
    at = [...e.matchAll(MAX_FINDINGS_RE)].at(-1),
    k = at ? (at[2] ?? "").toLowerCase() : void 0,
    C = k !== void 0 && /^\d+$/.test(k) ? Number(k) : 0,
    S = k === "all" || k === "default" ? k : Number.isSafeInteger(C) && C > 0 ? C : void 0,
    T = k !== void 0 && S === void 0,
    filtered = rest.split(/\s+/).filter(Boolean),
    L = filtered[0] ?? "";
  if (rawFirstToken.toLowerCase() === "ultra")
    return {
      explicit: void 0,
      target: normalizeTargetTokens(filtered.slice(1)),
      comment: h,
      fix: y,
      post: w,
      unrecognizedLevel: void 0,
      ultraFallback: !0,
      maxFindings: S,
      maxFindingsIgnored: T,
    };
  let x = L.toLowerCase() === "ultra" ? void 0 : parseEffortLevel(L);
  if (x !== void 0)
    return {
      explicit: x,
      target: normalizeTargetTokens(filtered.slice(1)),
      comment: h,
      fix: y,
      post: w,
      unrecognizedLevel: void 0,
      ultraFallback: !1,
      maxFindings: S,
      maxFindingsIgnored: T,
    };
  let matches = LEVEL_PREFIX_RE.test(L);
  return {
    explicit: void 0,
    target: normalizeTargetTokens(filtered),
    comment: h,
    fix: y,
    post: w,
    unrecognizedLevel: matches ? L : void 0,
    ultraFallback: !1,
    maxFindings: S,
    maxFindingsIgnored: T,
  };
}
//@ chunk-hantmvxa.js:84619-84699 placement
function qs() {
  let codeReviewLastEffort = getGlobalConfig().codeReviewLastEffort;
  return codeReviewLastEffort !== void 0 && isEffortLevel(codeReviewLastEffort)
    ? codeReviewLastEffort
    : void 0;
}
//@ chunk-hantmvxa.js:84699-84786 placement
function Ys(e, n) {
  saveGlobalConfig((s) => (s.codeReviewLastEffort === e ? s : { ...s, codeReviewLastEffort: e }), n);
}
//@ chunk-hantmvxa.js:84786-84901 placement
function defaultReviewLevel({ explicit: explicit, ultraFallback: ultraFallback }, s) {
  if (s?.options?.isSkillPreload) return;
  return explicit === void 0 && !ultraFallback ? qs() : void 0;
}
//@ chunk-hantmvxa.js:84901-84911 placement
var xe = 32;
//@ chunk-hantmvxa.js:84911-85253 placement
function resolveMaxFindings({ maxFindings: maxFindings }, n, s, r) {
  let codeReviewLastMaxFindings = getGlobalConfig().codeReviewLastMaxFindings,
    y =
      maxFindings === void 0 &&
      n !== "low-sonnet5" &&
      !r?.options?.isSkillPreload &&
      (codeReviewLastMaxFindings === "all" ||
        (typeof codeReviewLastMaxFindings === "number" &&
          Number.isSafeInteger(codeReviewLastMaxFindings) &&
          codeReviewLastMaxFindings > 0)),
    w = y ? codeReviewLastMaxFindings : maxFindings === "default" ? void 0 : maxFindings,
    k =
      n === "low-sonnet5"
        ? void 0
        : (s || n === "o5-bmin") && (w === "all" || (w !== void 0 && w > xe))
          ? xe
          : w;
  return { asked: w, stated: k, reused: y };
}
//@ chunk-hantmvxa.js:85253-85992 placement
function describeMaxFindings({ asked: asked, stated: stated, reused: reused, ignored: ignored }, h) {
  let y = [];
  if (ignored)
    y.push(
      `\`--max-findings\` was ignored: type a whole number above zero, \`all\`, or \`default\` after it.${reused ? "" : " Using the usual limit."}`,
    );
  let w = `This review reports at most ${xe} findings, so the limit is ${xe} here.`;
  if (asked !== void 0 && stated === void 0)
    y.push("`--max-findings` does not change this review: low effort here has no maximum.");
  else if (stated !== asked)
    y.push(
      reused ? `${h === "you" ? "You" : "The user"} set \`--max-findings ${asked}\` last time. ${w}` : w,
    );
  else if (reused && asked !== void 0)
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
  Ys,
};
