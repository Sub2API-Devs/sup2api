/**
 * utils/telemetry/accountMemoryRedaction.ts
 *
 * 2.1.316 新增：遥测中的账户记忆脱敏
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s584m62r.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { jsonStringify } from "../slowOperations.js";
import { escapeXml_2 as escapeXml } from "../confusables.js";
import { MAX_EVENT_RECORD_POOL, recordStateOf } from "./thirdPartyEventRecords.js";
import { urlPatternToRegex } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s584m62r.js:1225-1278 placement
function touchSetEntry(set, item) {
  let existed = set.delete(item);
  set.add(item);
  return !existed;
}
//@ chunk-s584m62r.js:1278-1423 placement
var EMPTY_REDACTION_INDEX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NOT_RECORDED_PLACEHOLDER;
deferInit("chunk-s584m62r.js:1278", () => {
  EMPTY_REDACTION_INDEX = Object.freeze({
    blocks: Object.freeze([]),
    lines: Object.freeze([]),
    unsearchable: false,
    toolNames: new Set(),
  });
  NOT_RECORDED_PLACEHOLDER = "[account memory text not recorded]";
});
//@ chunk-s584m62r.js:1423-1480 placement
function notRecordedLength(value) {
  return `<${value.length} chars; not recorded>`;
}
//@ chunk-s584m62r.js:1480-1525 placement
function notRecordedReason(withheld) {
  return `<not recorded: ${withheld}>`;
}
//@ chunk-s584m62r.js:1525-1616 placement
function isMemoryOperationQuerySource(querySource) {
  return (
    querySource === "extract_memories" ||
    querySource === "local_memory_import" ||
    querySource === "auto_dream"
  );
}
//@ chunk-s584m62r.js:1616-1845 placement
function redactWithIndex(keySource, querySource, transform) {
  if (isMemoryOperationQuerySource(querySource))
    return {
      withheld: "memory_operation",
    };
  try {
    let index = keySource();
    if (index.unsearchable)
      return {
        withheld: "account_memory_text_not_identified",
      };
    return {
      value: transform(index),
    };
  } catch {
    return {
      withheld: "account_memory_redaction_failed",
    };
  }
}
//@ chunk-s584m62r.js:1845-1998 placement
/**
 * 在遥测记录中隐去账户记忆内容（未识别时整段不记录）。
 */
function redactAccountMemoryText(keySource, querySource, apply) {
  let redacted =
    keySource === undefined
      ? {
          withheld: "account_memory_text_not_identified",
        }
      : redactWithIndex(keySource, querySource, (index) => applyRedactions(apply, index));
  return "withheld" in redacted ? notRecordedReason(redacted.withheld) : redacted.value;
}
//@ chunk-s584m62r.js:1998-2036 placement
var MARKDOWN_PREFIX_RE = /^(?:[-*+>]|\d+[.)]|#{1,6})\s+/;
//@ chunk-s584m62r.js:2036-2652 placement
function buildRedactionIndex({
  rendered,
  verbatim,
  toolNames = EMPTY_REDACTION_INDEX.toolNames,
  unsearchable = false,
}) {
  let rendered_2 = (text) => text.trim() !== "";
  let renderedLines = normalizeCaseForComparison_2(rendered.map((line) => line.trim()).filter(rendered_2));
  let verbatimLines = normalizeCaseForComparison_2(verbatim.map((line) => line.trim()).filter(rendered_2));
  if (renderedLines.length === 0 && verbatimLines.length === 0 && toolNames.size === 0 && !unsearchable)
    return EMPTY_REDACTION_INDEX;
  let byLengthDesc = (left, right) => right.length - left.length;
  let stripJsonQuotes = (text) => (jsonStringify(text) ?? `"${text}"`).slice(1, -1);
  let expandVariants = (text) =>
    normalizeCaseForComparison_2(
      text.flatMap((text) => {
        let escaped = escapeXml(text);
        return [
          text,
          escaped,
          stripJsonQuotes(text),
          stripJsonQuotes(escaped),
          escapeXml(stripJsonQuotes(text)),
          escapeXml(escaped),
          stripJsonQuotes(stripJsonQuotes(text)),
        ];
      }),
    ).sort(byLengthDesc);
  let blocks = expandVariants([
    ...renderedLines,
    ...verbatimLines.filter((line) => line.length >= MAX_EVENT_RECORD_POOL),
  ]);
  let lines = expandVariants(
    [...renderedLines, ...verbatimLines]
      .flatMap((line) =>
        line.split(`
`),
      )
      .flatMap((part) => {
        let trimmed = part.trim();
        let replaced = trimmed.replace(MARKDOWN_PREFIX_RE, "");
        return [trimmed, replaced].filter((candidate) => candidate.length >= MAX_EVENT_RECORD_POOL);
      }),
  );
  return {
    blocks,
    lines,
    unsearchable,
    toolNames,
  };
}
//@ chunk-s584m62r.js:2652-2873 placement
function accountMemoryRedactionKeys(host) {
  let state = recordStateOf(host);
  let cached = weakMap.get(host);
  if (cached !== undefined && cached.version === state.version) return cached.keys;
  let redactionIndex = buildRedactionIndex({
    rendered: [],
    verbatim: [...state.shown, ...state.toolTexts],
    unsearchable: state.dropped,
  });
  weakMap.set(host, {
    version: state.version,
    keys: redactionIndex,
  });
  return redactionIndex;
}
//@ chunk-s584m62r.js:2873-2891 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s584m62r.js:2873", () => {
  weakMap = new WeakMap();
});
//@ chunk-s584m62r.js:2891-3007 placement
function applyRedactions(text, index) {
  if (index.blocks.length === 0 && index.lines.length === 0) return text;
  let { blocks, lines } = compiledRedactions(index);
  return replaceAllPatterns(replaceAllPatterns(text, blocks), lines);
}
//@ chunk-s584m62r.js:3007-3048 placement
var MAX_PATTERN_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_COMPILED_REDACTIONS;
var compiledRedactionCache;
var weakMap_2;
deferInit("chunk-s584m62r.js:3007", () => {
  MAX_PATTERN_CHARS = 131072;
  MAX_COMPILED_REDACTIONS = 8;
  compiledRedactionCache = new Map();
  weakMap_2 = new WeakMap();
});
//@ chunk-s584m62r.js:3048-3304 placement
function compiledRedactions(index) {
  let cached = weakMap_2.get(index);
  if (cached !== undefined) return cached;
  let key = createHash("sha256")
    .update(jsonStringify([index.blocks, index.lines]))
    .digest("hex");
  let compiled = compiledRedactionCache.get(key);
  if (compiled === undefined) {
    compiled = {
      blocks: buildRedactionPatterns(index.blocks),
      lines: buildRedactionPatterns(index.lines),
    };
    if (compiledRedactionCache.size >= MAX_COMPILED_REDACTIONS)
      compiledRedactionCache.delete(compiledRedactionCache.keys().next().value);
    compiledRedactionCache.set(key, compiled);
  }
  weakMap_2.set(index, compiled);
  return compiled;
}
//@ chunk-s584m62r.js:3304-3591 placement
function buildRedactionPatterns(source) {
  let mapped = source
    .filter((item) => item !== "" && !NOT_RECORDED_PLACEHOLDER.includes(item))
    .toSorted((item_2, item_3) => item_3.length - item_2.length)
    .map(urlPatternToRegex);
  let blocks = [];
  let lines = [];
  let batchChars = 0;
  for (let pattern of mapped) {
    if (lines.length > 0 && batchChars + pattern.length > MAX_PATTERN_CHARS) {
      blocks.push(new RegExp(lines.join("|"), "g"));
      lines = [];
      batchChars = 0;
    }
    lines.push(pattern);
    batchChars += pattern.length + 1;
  }
  if (lines.length > 0) blocks.push(new RegExp(lines.join("|"), "g"));
  return blocks;
}
//@ chunk-s584m62r.js:3591-3852 placement
function replaceAllPatterns(text, patterns) {
  let result = text;
  for (let pattern of patterns) result = result.replace(pattern, NOT_RECORDED_PLACEHOLDER);
  if (result === text) return text;
  for (let i = 0; patterns.some((pattern) => result.search(pattern) !== -1); i++) {
    if (i >= 16) throw Error("account-memory text still matched a search key after 16 replacement rounds");
    for (let pattern of patterns) result = result.replace(pattern, NOT_RECORDED_PLACEHOLDER);
  }
  return result;
}
//@ chunk-s584m62r.js:3852-3875 placement
function identityRedaction(value) {
  return value;
}
export {
  notRecordedLength,
  buildRedactionIndex,
  accountMemoryRedactionKeys,
  redactAccountMemoryText,
  redactWithIndex,
  applyRedactions,
  notRecordedReason,
  touchSetEntry,
  identityRedaction,
  NOT_RECORDED_PLACEHOLDER,
  isMemoryOperationQuerySource,
};
