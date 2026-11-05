/**
 * utils/model/modelIds.ts
 *
 * 模型 id 与提供方开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pp3ge1ns.js (21)
 * attribution: placement 20, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { BEDROCK_REGION_PREFIXES } from "./bedrock.js";

//@ chunk-pp3ge1ns.js:227-411 placement
var PROVIDER_ENV_FLAGS = [
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_FOUNDRY",
  "CLAUDE_CODE_USE_ANTHROPIC_AWS",
  "CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD",
  "CLAUDE_CODE_USE_MANTLE",
  "CLAUDE_CODE_USE_VERTEX",
];
//@ chunk-pp3ge1ns.js:411-960 placement
/**
 * 已退役/旧版模型 id 列表。
 */
var LEGACY_MODEL_IDS_2 = [
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
];
var LEGACY_MODEL_IDS = [
  "sonnet",
  "opus",
  "haiku",
  "fable",
  "best",
  "sonnet[1m]",
  "opus[1m]",
  "fable[1m]",
  "opusplan",
];
var MODEL_KEY_NAMES = ["sonnet", "opus", "haiku", "fable"];
//@ chunk-pp3ge1ns.js:960-992 placement
var CLAUDE_MYTHOS_PREVIEW = "claude-mythos-preview";
//@ chunk-pp3ge1ns.js:992-1029 placement
/**
 * 判断字符串是否为模型键别名（sonnet/opus/haiku/fable/best/opusplan 等）。
 */
function isModelKeyAlias(model) {
  return LEGACY_MODEL_IDS.includes(model);
}
//@ chunk-pp3ge1ns.js:1029-1106 placement
/**
 * 去掉 [1m] 后再判断是否为模型键别名。
 */
function isModelKeyAliasOrResolved(model) {
  if (isModelKeyAlias(model)) return true;
  let stripped = strip1mSuffix(model);
  return stripped !== model && strip1mSuffix(stripped) === stripped && isModelKeyAlias(stripped);
}
//@ chunk-pp3ge1ns.js:1106-1153 layout
function strip1mSuffix(modelId) {
  return modelId.replace(/\[1m\]$/i, "");
}
//@ chunk-pp3ge1ns.js:1153-1219 placement
/**
 * 忽略大小写与 [1m] 比较两个模型拼写是否相同。
 */
function sameModelSpelling(modelA, modelB) {
  return strip1mSuffix(modelA).toLowerCase() === strip1mSuffix(modelB).toLowerCase();
}
//@ chunk-pp3ge1ns.js:1219-1270 placement
/**
 * 去掉 [1m]/[2m] 后缀。
 */
function stripAnyVersatileSuffix(model) {
  return model.replace(/\[(1|2)m\]/gi, "");
}
//@ chunk-pp3ge1ns.js:1270-1307 placement
/**
 * 判断是否为基本模型键（不含 [1m]/opusplan）。
 */
function isBaseModelKey(key) {
  return MODEL_KEY_NAMES.includes(key);
}
//@ chunk-pp3ge1ns.js:1307-1919 placement
/**
 * 解析 Claude 模型 id（去掉 [1m]、路径前缀与 Bedrock 区域.anthropic. 前缀）为 {family, major, minor, legacyVersionFirst, base, date/trailer}；不合法返回 null。
 */
function parseModelId(raw) {
  let text = raw.trim().toLowerCase();
  if (text === "" || /\s/.test(text)) return null;
  text = text.replace(/\[[12]m\]$/, "");
  let index = text.lastIndexOf("/");
  if (index !== -1) text = text.slice(index + 1);
  let match = /^(?:([a-z-]+)\.)?anthropic\.(claude-.*)$/.exec(text);
  if (match) {
    let [, regionPrefix, rest = ""] = match;
    if (regionPrefix !== undefined && !BEDROCK_REGION_PREFIXES.includes(regionPrefix)) return null;
    text = rest;
  }
  let baseMatch = parseModelBase(text);
  if (!baseMatch) return null;
  let trailer = text.slice(baseMatch.base.length);
  if (trailer !== "" && !/^[-@]/.test(trailer)) return null;
  let parsed = {
    family: baseMatch.family,
    major: baseMatch.major,
    legacyVersionFirst: baseMatch.legacyVersionFirst,
    base: baseMatch.base,
  };
  if (baseMatch.minor !== undefined) parsed.minor = baseMatch.minor;
  if (!isStandardTrailer(trailer)) parsed.trailer = trailer;
  else {
    let date = /(?:-v\d+@|[-@])(\d{8})/.exec(trailer)?.[1];
    if (date !== undefined) parsed.date = date;
  }
  return parsed;
}
//@ chunk-pp3ge1ns.js:1919-1999 placement
/**
 * 把 "claude-opus-4.5" 形式的点号版本归一为连字符。
 */
function normalizeDottedVersion(lowerCase) {
  return lowerCase.replace(/(claude-(?:[a-z]+-)?\d{1,2})\.(?=\d)/g, "$1-");
}
//@ chunk-pp3ge1ns.js:1999-2109 placement
/**
 * 判断模型 id 后缀是否为标准形式（fast/latest、日期、版本）。
 */
function isStandardTrailer(trailer) {
  return /^(?:-fast|-latest)?(?:-v\d{1,3}@\d{8}|[-@]\d{8})?(?:-v\d{1,3}(?::\d{1,3})?)?$/.test(trailer);
}
//@ chunk-pp3ge1ns.js:2109-2217 placement
function isReservedTag(tag) {
  return ["experimental", "internal", "prefixlock", "preview", "prod", "snapshot", "test"].includes(tag);
}
//@ chunk-pp3ge1ns.js:2217-2333 placement
/**
 * 判断模型 id 是否含保留标签（experimental、internal、preview 等）。
 */
function hasReservedTag(model) {
  return (
    /^[a-z]{1,24}((?:-[a-z0-9]{1,16}){1,6})(?:\[[12]m\])?$/
      .exec(model)?.[1]
      ?.split("-")
      .some(isReservedTag) === true
  );
}
//@ chunk-pp3ge1ns.js:2333-2381 placement
/**
 * 判断模型 id 是否带 -vN 版本后缀。
 */
function hasVersionTrailer(trailer) {
  return /-v\d+(?::\d+)?$/.test(trailer);
}
//@ chunk-pp3ge1ns.js:2381-2432 placement
/**
 * 判断解析结果是否为标准版本（无额外后缀）。
 */
function isStandardVersion(modelId) {
  return modelId !== null && modelId.trailer === undefined;
}
//@ chunk-pp3ge1ns.js:2432-2500 placement
/**
 * 比较两个模型版本（主版本与次版本）。
 */
function compareVersion(modelId, modelId_2) {
  return modelId.major - modelId_2.major || (modelId.minor ?? 0) - (modelId_2.minor ?? 0);
}
//@ chunk-pp3ge1ns.js:2500-2604 placement
/**
 * 判断两个解析后的模型是否同族同版本。
 */
function isSameModelVersion(a, b) {
  return a.family === b.family && a.legacyVersionFirst === b.legacyVersionFirst && compareVersion(a, b) === 0;
}
//@ chunk-pp3ge1ns.js:2604-2743 placement
function modelFamilyOf(family) {
  switch (family) {
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
//@ chunk-pp3ge1ns.js:2743-2936 placement
/**
 * 判断第二个模型是否与第一个同代或更新（族排序与版本比较）。
 */
function isNewerOrSameModel(model, otherModel) {
  if (typeof model !== "string") return false;
  let modelId = parseModelId(model);
  let modelId_2 = parseModelId(otherModel);
  if (!isStandardVersion(modelId) || !isStandardVersion(modelId_2)) return false;
  let familyA = modelFamilyOf(modelId.family);
  let familyB = modelFamilyOf(modelId_2.family);
  if (familyA === undefined || familyB === undefined) return false;
  return familyB >= familyA && compareVersion(modelId_2, modelId) >= 0;
}
//@ chunk-pp3ge1ns.js:2936-3348 placement
/**
 * 匹配 claude-族-主[-次] 或旧式 claude-主[-次]-族 前缀，返回族名、主次版本、是否旧式与匹配到的基础名。
 */
function parseModelBase(text) {
  let match = /^claude-([a-z]+)-(\d{1,2})(?!\d)(?:-(\d{1,2})(?!\d))?/.exec(text);
  if (match) {
    let [base, family = "", major = "", minor] = match;
    return {
      family,
      major: Number(major),
      minor: minor === undefined ? undefined : Number(minor),
      legacyVersionFirst: false,
      base,
    };
  }
  let match_2 = /^claude-(\d{1,2})(?!\d)(?:-(\d{1,2})(?!\d))?-([a-z]+)/.exec(text);
  if (match_2) {
    let [base, major = "", minor, family = ""] = match_2;
    return {
      family,
      major: Number(major),
      minor: minor === undefined ? undefined : Number(minor),
      legacyVersionFirst: true,
      base,
    };
  }
  return null;
}
export {
  strip1mSuffix,
  stripAnyVersatileSuffix,
  isNewerOrSameModel,
  isStandardTrailer,
  isBaseModelKey,
  parseModelId,
  isModelKeyAlias,
  normalizeDottedVersion,
  isStandardVersion,
  sameModelSpelling,
  hasVersionTrailer,
  PROVIDER_ENV_FLAGS,
  MODEL_KEY_NAMES,
  LEGACY_MODEL_IDS,
  modelFamilyOf,
  isModelKeyAliasOrResolved,
  LEGACY_MODEL_IDS_2,
  CLAUDE_MYTHOS_PREVIEW,
  compareVersion,
  isSameModelVersion,
  hasReservedTag,
};
