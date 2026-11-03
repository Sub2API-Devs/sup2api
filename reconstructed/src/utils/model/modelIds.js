/**
 * utils/model/modelIds.ts
 *
 * 模型 id 与提供方开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jabbzrn8.js (21)
 * attribution: placement 21
 */
import { BEDROCK_REGION_PREFIXES } from "./bedrock.js";

//@ chunk-jabbzrn8.js:227-411 placement
var PROVIDER_ENV_FLAGS = [
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_FOUNDRY",
  "CLAUDE_CODE_USE_ANTHROPIC_AWS",
  "CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD",
  "CLAUDE_CODE_USE_MANTLE",
  "CLAUDE_CODE_USE_VERTEX",
];
//@ chunk-jabbzrn8.js:411-960 placement
var LEGACY_MODEL_IDS = [
    "claude-3-5-haiku",
    "claude-3-5-sonnet",
    "claude-3-7-sonnet",
    "claude-fable-5",
    "claude-fable-5-1",
    "claude-haiku-4-5",
    "claude-haiku-5-5",
    "claude-mythos-5",
    "claude-mythos-5-1",
    "claude-opus-4-0",
    "claude-opus-4-1",
    "claude-opus-4-5",
    "claude-opus-4-6",
    "claude-opus-4-7",
    "claude-opus-4-8",
    "claude-opus-5",
    "claude-opus-5-5",
    "claude-sonnet-4-0",
    "claude-sonnet-4-5",
    "claude-sonnet-4-6",
    "claude-sonnet-5",
    "claude-sonnet-5-5",
  ],
  E8 = ["sonnet", "opus", "haiku", "fable", "best", "sonnet[1m]", "opus[1m]", "fable[1m]", "opusplan"],
  v8 = ["sonnet", "opus", "haiku", "fable"];
//@ chunk-jabbzrn8.js:960-992 placement
var CLAUDE_MYTHOS_PREVIEW = "claude-mythos-preview";
//@ chunk-jabbzrn8.js:992-1029 placement
function Nb(e) {
  return E8.includes(e);
}
//@ chunk-jabbzrn8.js:1029-1106 placement
function pve(e) {
  if (Nb(e)) return !0;
  let n = Lt(e);
  return n !== e && Lt(n) === n && Nb(n);
}
//@ chunk-jabbzrn8.js:1106-1153 placement
function Lt(e) {
  return e.replace(/\[1m\]$/i, "");
}
//@ chunk-jabbzrn8.js:1153-1219 placement
function Sv(e, n) {
  return Lt(e).toLowerCase() === Lt(n).toLowerCase();
}
//@ chunk-jabbzrn8.js:1219-1270 placement
function Bn(e) {
  return e.replace(/\[(1|2)m\]/gi, "");
}
//@ chunk-jabbzrn8.js:1270-1307 placement
function I_(e) {
  return v8.includes(e);
}
/**
 * 解析 Claude 模型 id（去掉 [1m]、路径前缀与 Bedrock 区域.anthropic. 前缀）为 {family, major, minor, legacyVersionFirst, base, date/trailer}；不合法返回 null。
 */
//@ chunk-jabbzrn8.js:1307-1919 placement
function parseModelId(e) {
  let lower = e.trim().toLowerCase();
  if (lower === "" || /\s/.test(lower)) return null;
  lower = lower.replace(/\[[12]m\]$/, "");
  let index = lower.lastIndexOf("/");
  if (index !== -1) lower = lower.slice(index + 1);
  let match = /^(?:([a-z-]+)\.)?anthropic\.(claude-.*)$/.exec(lower);
  if (match) {
    let [, a, l = ""] = match;
    if (a !== void 0 && !BEDROCK_REGION_PREFIXES.includes(a)) return null;
    lower = l;
  }
  let baseMatch = parseModelBase(lower);
  if (!baseMatch) return null;
  let sliced = lower.slice(baseMatch.base.length);
  if (sliced !== "" && !/^[-@]/.test(sliced)) return null;
  let parsed = {
    family: baseMatch.family,
    major: baseMatch.major,
    legacyVersionFirst: baseMatch.legacyVersionFirst,
    base: baseMatch.base,
  };
  if (baseMatch.minor !== void 0) parsed.minor = baseMatch.minor;
  if (!isStandardTrailer(sliced)) parsed.trailer = sliced;
  else {
    let a = /(?:-v\d+@|[-@])(\d{8})/.exec(sliced)?.[1];
    if (a !== void 0) parsed.date = a;
  }
  return parsed;
}
//@ chunk-jabbzrn8.js:1919-1999 placement
function f_r(e) {
  return e.replace(/(claude-(?:[a-z]+-)?\d{1,2})\.(?=\d)/g, "$1-");
}
/**
 * 判断模型 id 后缀是否为标准形式（fast/latest、日期、版本）。
 */
//@ chunk-jabbzrn8.js:1999-2109 placement
function isStandardTrailer(e) {
  return /^(?:-fast|-latest)?(?:-v\d{1,3}@\d{8}|[-@]\d{8})?(?:-v\d{1,3}(?::\d{1,3})?)?$/.test(e);
}
//@ chunk-jabbzrn8.js:2109-2217 placement
function isReservedTag(e) {
  return ["experimental", "internal", "prefixlock", "preview", "prod", "snapshot", "test"].includes(e);
}
/**
 * 判断模型 id 是否含保留标签（experimental、internal、preview 等）。
 */
//@ chunk-jabbzrn8.js:2217-2333 placement
function hasReservedTag(e) {
  return (
    /^[a-z]{1,24}((?:-[a-z0-9]{1,16}){1,6})(?:\[[12]m\])?$/.exec(e)?.[1]?.split("-").some(isReservedTag) ===
    !0
  );
}
//@ chunk-jabbzrn8.js:2333-2381 placement
function hxi(e) {
  return /-v\d+(?::\d+)?$/.test(e);
}
//@ chunk-jabbzrn8.js:2381-2432 placement
function wR(e) {
  return e !== null && e.trailer === void 0;
}
//@ chunk-jabbzrn8.js:2432-2500 placement
function K3e(e, n) {
  return e.major - n.major || (e.minor ?? 0) - (n.minor ?? 0);
}
/**
 * 判断两个解析后的模型是否同族同版本。
 */
//@ chunk-jabbzrn8.js:2500-2604 placement
function isSameModelVersion(e, n) {
  return e.family === n.family && e.legacyVersionFirst === n.legacyVersionFirst && K3e(e, n) === 0;
}
//@ chunk-jabbzrn8.js:2604-2743 placement
function modelFamilyOf(e) {
  switch (e) {
    case "haiku":
      return 0;
    case "sonnet":
      return 1;
    case "opus":
      return 2;
    case "fable":
    case "mythos":
      return 3;
    default:
      return;
  }
}
/**
 * 判断第二个模型是否与第一个同代或更新（族排序与版本比较）。
 */
//@ chunk-jabbzrn8.js:2743-2936 placement
function isNewerOrSameModel(e, n) {
  if (typeof e !== "string") return !1;
  let s = parseModelId(e),
    o = parseModelId(n);
  if (!wR(s) || !wR(o)) return !1;
  let r = modelFamilyOf(s.family),
    t = modelFamilyOf(o.family);
  if (r === void 0 || t === void 0) return !1;
  return t >= r && K3e(o, s) >= 0;
}
/**
 * 匹配 claude-族-主[-次] 或旧式 claude-主[-次]-族 前缀，返回族名、主次版本、是否旧式与匹配到的基础名。
 */
//@ chunk-jabbzrn8.js:2936-3348 placement
function parseModelBase(e) {
  let match = /^claude-([a-z]+)-(\d{1,2})(?!\d)(?:-(\d{1,2})(?!\d))?/.exec(e);
  if (match) {
    let [o, r = "", t = "", i] = match;
    return {
      family: r,
      major: Number(t),
      minor: i === void 0 ? void 0 : Number(i),
      legacyVersionFirst: !1,
      base: o,
    };
  }
  let match_2 = /^claude-(\d{1,2})(?!\d)(?:-(\d{1,2})(?!\d))?-([a-z]+)/.exec(e);
  if (match_2) {
    let [o, r = "", t, i = ""] = match_2;
    return {
      family: i,
      major: Number(r),
      minor: t === void 0 ? void 0 : Number(t),
      legacyVersionFirst: !0,
      base: o,
    };
  }
  return null;
}

export {
  Lt,
  isNewerOrSameModel,
  Bn,
  Sv,
  Nb,
  pve,
  parseModelId,
  v8,
  E8,
  K3e,
  wR,
  LEGACY_MODEL_IDS,
  I_,
  hxi,
  PROVIDER_ENV_FLAGS,
  modelFamilyOf,
  CLAUDE_MYTHOS_PREVIEW,
  isSameModelVersion,
  f_r,
  hasReservedTag,
  isStandardTrailer,
};
