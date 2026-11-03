/**
 * utils/telemetry/accountMemoryRedaction.ts
 *
 * 2.1.316 新增：遥测中的账户记忆脱敏
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p52gp8zk.js (17)
 * attribution: placement 17
 */
import { createHash } from "crypto";
import { uniq } from "../collections.js";
import { jsonStringify } from "../slowOperations.js";
import { escapeXml_2 as escapeXml } from "../confusables.js";
import { MAX_EVENT_RECORD_POOL, recordStateOf } from "./thirdPartyEventRecords.js";
import { urlPatternToRegex } from "../stringUtils.js";

//@ chunk-p52gp8zk.js:9407-9461 placement
function touchSetEntry(e, n) {
  let o = e.delete(n);
  e.add(n);
  return !o;
}
//@ chunk-p52gp8zk.js:9461-9607 placement
var EMPTY_REDACTION_INDEX = Object.freeze({
  blocks: Object.freeze([]),
  lines: Object.freeze([]),
  unsearchable: false,
  toolNames: new Set(),
});
var NOT_RECORDED_PLACEHOLDER = "[account memory text not recorded]";
//@ chunk-p52gp8zk.js:9607-9664 placement
function notRecordedLength(e) {
  return `<${e.length} chars; not recorded>`;
}
//@ chunk-p52gp8zk.js:9664-9709 placement
function notRecordedReason(withheld) {
  return `<not recorded: ${withheld}>`;
}
//@ chunk-p52gp8zk.js:9709-9799 placement
function isMemoryOperationQuerySource(e) {
  return e === "extract_memories" || e === "local_memory_import" || e === "auto_dream";
}
//@ chunk-p52gp8zk.js:9799-10027 placement
function redactWithIndex(e, querySource, o) {
  if (isMemoryOperationQuerySource(querySource))
    return {
      withheld: "memory_operation",
    };
  try {
    let r = e();
    if (r.unsearchable)
      return {
        withheld: "account_memory_text_not_identified",
      };
    return {
      value: o(r),
    };
  } catch {
    return {
      withheld: "account_memory_redaction_failed",
    };
  }
}
//@ chunk-p52gp8zk.js:10027-10180 placement
/**
 * 在遥测记录中隐去账户记忆内容（未识别时整段不记录）。
 */
function redactAccountMemoryText(e, querySource, o) {
  let r =
    e === undefined
      ? {
          withheld: "account_memory_text_not_identified",
        }
      : redactWithIndex(e, querySource, (s) => applyRedactions(o, s));
  return "withheld" in r ? notRecordedReason(r.withheld) : r.value;
}
//@ chunk-p52gp8zk.js:10180-10219 placement
var MARKDOWN_PREFIX_RE = /^(?:[-*+>]|\d+[.)]|#{1,6})\s+/;
//@ chunk-p52gp8zk.js:10219-10838 placement
function buildRedactionIndex({
  rendered,
  verbatim,
  toolNames = EMPTY_REDACTION_INDEX.toolNames,
  unsearchable = false,
}) {
  let s = (g) => g.trim() !== "";
  let c = uniq(rendered.map((g) => g.trim()).filter(s));
  let u = uniq(verbatim.map((g) => g.trim()).filter(s));
  if (c.length === 0 && u.length === 0 && toolNames.size === 0 && !unsearchable) return EMPTY_REDACTION_INDEX;
  let f = (g, T) => T.length - g.length;
  let a = (g) => (jsonStringify(g) ?? `"${g}"`).slice(1, -1);
  let y = (g) =>
    uniq(
      g.flatMap((T) => {
        let h = escapeXml(T);
        return [T, h, a(T), a(h), escapeXml(a(T)), escapeXml(h), a(a(T))];
      }),
    ).sort(f);
  let blocks = y([...c, ...u.filter((g) => g.length >= MAX_EVENT_RECORD_POOL)]);
  let lines = y(
    [...c, ...u]
      .flatMap((g) =>
        g.split(`
`),
      )
      .flatMap((g) => {
        let trimmed = g.trim();
        let replaced = trimmed.replace(MARKDOWN_PREFIX_RE, "");
        return [trimmed, replaced].filter((x) => x.length >= MAX_EVENT_RECORD_POOL);
      }),
  );
  return {
    blocks,
    lines,
    unsearchable,
    toolNames,
  };
}
//@ chunk-p52gp8zk.js:10838-11061 placement
function accountMemoryRedactionKeys(host) {
  let n = recordStateOf(host);
  let o = weakMap.get(host);
  if (o !== undefined && o.version === n.version) return o.keys;
  let redactionIndex = buildRedactionIndex({
    rendered: [],
    verbatim: [...n.shown, ...n.toolTexts],
    unsearchable: n.dropped,
  });
  weakMap.set(host, {
    version: n.version,
    keys: redactionIndex,
  });
  return redactionIndex;
}
//@ chunk-p52gp8zk.js:11061-11080 placement
var weakMap = new WeakMap();
//@ chunk-p52gp8zk.js:11080-11199 placement
function applyRedactions(e, n) {
  if (n.blocks.length === 0 && n.lines.length === 0) return e;
  let { blocks, lines } = compiledRedactions(n);
  return replaceAllPatterns(replaceAllPatterns(e, blocks), lines);
}
//@ chunk-p52gp8zk.js:11199-11243 placement
var MAX_PATTERN_CHARS = 131072;
var MAX_COMPILED_REDACTIONS = 8;
var compiledRedactionCache = new Map();
var weakMap_2 = new WeakMap();
//@ chunk-p52gp8zk.js:11243-11506 placement
function compiledRedactions(e) {
  let n = weakMap_2.get(e);
  if (n !== undefined) return n;
  let o = createHash("sha256")
    .update(jsonStringify([e.blocks, e.lines]))
    .digest("hex");
  let r = compiledRedactionCache.get(o);
  if (r === undefined) {
    r = {
      blocks: buildRedactionPatterns(e.blocks),
      lines: buildRedactionPatterns(e.lines),
    };
    if (compiledRedactionCache.size >= MAX_COMPILED_REDACTIONS)
      compiledRedactionCache.delete(compiledRedactionCache.keys().next().value);
    compiledRedactionCache.set(o, r);
  }
  weakMap_2.set(e, r);
  return r;
}
//@ chunk-p52gp8zk.js:11506-11795 placement
function buildRedactionPatterns(e) {
  let mapped = e
    .filter((c) => c !== "" && !NOT_RECORDED_PLACEHOLDER.includes(c))
    .toSorted((c, u) => u.length - c.length)
    .map(urlPatternToRegex);
  let o = [];
  let r = [];
  let s = 0;
  for (let c of mapped) {
    if (r.length > 0 && s + c.length > MAX_PATTERN_CHARS) {
      o.push(new RegExp(r.join("|"), "g"));
      r = [];
      s = 0;
    }
    r.push(c);
    s += c.length + 1;
  }
  if (r.length > 0) o.push(new RegExp(r.join("|"), "g"));
  return o;
}
//@ chunk-p52gp8zk.js:11795-12057 placement
function replaceAllPatterns(e, n) {
  let o = e;
  for (let r of n) o = o.replace(r, NOT_RECORDED_PLACEHOLDER);
  if (o === e) return e;
  for (let idx = 0; n.some((s) => o.search(s) !== -1); idx++) {
    if (idx >= 16) throw Error("account-memory text still matched a search key after 16 replacement rounds");
    for (let s of n) o = o.replace(s, NOT_RECORDED_PLACEHOLDER);
  }
  return o;
}
//@ chunk-p52gp8zk.js:12057-12080 placement
function identityRedaction(e) {
  return e;
}
export {
  buildRedactionIndex,
  notRecordedLength,
  redactAccountMemoryText,
  accountMemoryRedactionKeys,
  redactWithIndex,
  applyRedactions,
  notRecordedReason,
  touchSetEntry,
  identityRedaction,
  NOT_RECORDED_PLACEHOLDER,
};
