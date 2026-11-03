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
import { j, recordStateOf } from "./thirdPartyEventRecords.js";
import { urlPatternToRegex } from "../stringUtils.js";

//@ chunk-p52gp8zk.js:9407-9461 placement
function touchSetEntry(e, n) {
  let o = e.delete(n);
  return (e.add(n), !o);
}
//@ chunk-p52gp8zk.js:9461-9607 placement
var EMPTY_REDACTION_INDEX = Object.freeze({
    blocks: Object.freeze([]),
    lines: Object.freeze([]),
    unsearchable: !1,
    toolNames: new Set(),
  }),
  O = "[account memory text not recorded]";
//@ chunk-p52gp8zk.js:9607-9664 placement
function notRecordedLength(e) {
  return `<${e.length} chars; not recorded>`;
}
//@ chunk-p52gp8zk.js:9664-9709 placement
function notRecordedReason(e) {
  return `<not recorded: ${e}>`;
}
//@ chunk-p52gp8zk.js:9709-9799 placement
function Ve(e) {
  return e === "extract_memories" || e === "local_memory_import" || e === "auto_dream";
}
//@ chunk-p52gp8zk.js:9799-10027 placement
function redactWithIndex(e, n, o) {
  if (Ve(n)) return { withheld: "memory_operation" };
  try {
    let r = e();
    if (r.unsearchable) return { withheld: "account_memory_text_not_identified" };
    return { value: o(r) };
  } catch {
    return { withheld: "account_memory_redaction_failed" };
  }
}
/**
 * 在遥测记录中隐去账户记忆内容（未识别时整段不记录）。
 */
//@ chunk-p52gp8zk.js:10027-10180 placement
function redactAccountMemoryText(e, n, o) {
  let r =
    e === void 0
      ? { withheld: "account_memory_text_not_identified" }
      : redactWithIndex(e, n, (s) => applyRedactions(o, s));
  return "withheld" in r ? notRecordedReason(r.withheld) : r.value;
}
//@ chunk-p52gp8zk.js:10180-10219 placement
var We = /^(?:[-*+>]|\d+[.)]|#{1,6})\s+/;
//@ chunk-p52gp8zk.js:10219-10838 placement
function buildRedactionIndex({
  rendered: rendered,
  verbatim: verbatim,
  toolNames: toolNames = EMPTY_REDACTION_INDEX.toolNames,
  unsearchable: unsearchable = !1,
}) {
  let s = (g) => g.trim() !== "",
    c = uniq(rendered.map((g) => g.trim()).filter(s)),
    u = uniq(verbatim.map((g) => g.trim()).filter(s));
  if (c.length === 0 && u.length === 0 && toolNames.size === 0 && !unsearchable) return EMPTY_REDACTION_INDEX;
  let f = (g, T) => T.length - g.length,
    a = (g) => (jsonStringify(g) ?? `"${g}"`).slice(1, -1),
    y = (g) =>
      uniq(
        g.flatMap((T) => {
          let h = escapeXml(T);
          return [T, h, a(T), a(h), escapeXml(a(T)), escapeXml(h), a(a(T))];
        }),
      ).sort(f),
    m = y([...c, ...u.filter((g) => g.length >= j)]),
    E = y(
      [...c, ...u]
        .flatMap((g) =>
          g.split(`
`),
        )
        .flatMap((g) => {
          let trimmed = g.trim(),
            replaced = trimmed.replace(We, "");
          return [trimmed, replaced].filter((x) => x.length >= j);
        }),
    );
  return { blocks: m, lines: E, unsearchable: unsearchable, toolNames: toolNames };
}
//@ chunk-p52gp8zk.js:10838-11061 placement
function accountMemoryRedactionKeys(e) {
  let n = recordStateOf(e),
    o = weakMap.get(e);
  if (o !== void 0 && o.version === n.version) return o.keys;
  let r = buildRedactionIndex({
    rendered: [],
    verbatim: [...n.shown, ...n.toolTexts],
    unsearchable: n.dropped,
  });
  return (weakMap.set(e, { version: n.version, keys: r }), r);
}
//@ chunk-p52gp8zk.js:11061-11080 placement
var weakMap = new WeakMap();
//@ chunk-p52gp8zk.js:11080-11199 placement
function applyRedactions(e, n) {
  if (n.blocks.length === 0 && n.lines.length === 0) return e;
  let { blocks: blocks, lines: lines } = compiledRedactions(n);
  return replaceAllPatterns(replaceAllPatterns(e, blocks), lines);
}
//@ chunk-p52gp8zk.js:11199-11243 placement
var Ye = 131072,
  Xe = 8,
  b = new Map(),
  weakMap_2 = new WeakMap();
//@ chunk-p52gp8zk.js:11243-11506 placement
function compiledRedactions(e) {
  let n = weakMap_2.get(e);
  if (n !== void 0) return n;
  let digest = createHash("sha256")
      .update(jsonStringify([e.blocks, e.lines]))
      .digest("hex"),
    r = b.get(digest);
  if (r === void 0) {
    if (
      ((r = { blocks: buildRedactionPatterns(e.blocks), lines: buildRedactionPatterns(e.lines) }),
      b.size >= Xe)
    )
      b.delete(b.keys().next().value);
    b.set(digest, r);
  }
  return (weakMap_2.set(e, r), r);
}
//@ chunk-p52gp8zk.js:11506-11795 placement
function buildRedactionPatterns(e) {
  let mapped = e
      .filter((c) => c !== "" && !O.includes(c))
      .toSorted((c, u) => u.length - c.length)
      .map(urlPatternToRegex),
    o = [],
    r = [],
    s = 0;
  for (let c of mapped) {
    if (r.length > 0 && s + c.length > Ye) (o.push(new RegExp(r.join("|"), "g")), (r = []), (s = 0));
    (r.push(c), (s += c.length + 1));
  }
  if (r.length > 0) o.push(new RegExp(r.join("|"), "g"));
  return o;
}
//@ chunk-p52gp8zk.js:11795-12057 placement
function replaceAllPatterns(e, n) {
  let o = e;
  for (let r of n) o = o.replace(r, O);
  if (o === e) return e;
  for (let r = 0; n.some((s) => o.search(s) !== -1); r++) {
    if (r >= 16) throw Error("account-memory text still matched a search key after 16 replacement rounds");
    for (let s of n) o = o.replace(s, O);
  }
  return o;
}
//@ chunk-p52gp8zk.js:12057-12080 placement
function v(e) {
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
  v,
  O,
};
