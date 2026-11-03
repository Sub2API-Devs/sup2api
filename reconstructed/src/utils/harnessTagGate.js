/**
 * utils/harnessTagGate.ts
 *
 * 2.1.316 新增：harness 标签门控
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  ABCDEFGHIJKLMNOPQRSTUVWXYZ,
  latinLetterConfusableClass,
  ANTML,
  UK,
  OPEN_BRACKET_CHARS,
} from "./confusables.js";
import { uniq } from "./collections.js";
import { RESERVED_XML_TAGS, INBOUND_MESSAGE_TAGS, CHANNEL } from "../constants/xml.js";
import { artifactLeadTokens } from "../tools/ArtifactTool/artifactUrls.js";
import { HARNESS, yai } from "./subagentOutputScan.js";
import { zFe } from "../tools/AgentTool/constants.js";
import { logError } from "./log.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnumArr } from "../services/analytics/safeMetadata.js";
import { isSubagentContext } from "./agentContext.js";

/**
 * 助手输出中可能伪造 harness 内容的模式（total_tokens、session-context、wake 标签与角色轮次形状）及非 ASCII 字符正则。
 */
//@ chunk-e6aww6q8.js:2495583-2495935 placement
var HARNESS_TAG_PATTERNS = io(function () {
    return [
      { pattern: "total-tokens-tag", re: /<(?=\/?total_tokens(?:[>\s/]|$))/gi },
      { pattern: "session-context-tag", re: /<(?=\/?session-context(?:[>\s/]|$))/gi },
      { pattern: "wake-tag", re: /<(?=\/?wake(?:[>\s/]|$))/gi },
      { pattern: "role-turn-shape", re: /(?:^|[\r\n\u2028\u2029])(?:user|system|assistant|human)[<[]/g },
    ];
  }),
  bdn = "?",
  pmr = /[^\x00-\x7f]/gu;
//@ chunk-e6aww6q8.js:2495935-2496016 placement
function G7e(e) {
  return [...e].map((n) => (/[a-z]/.test(n) ? `[${n}${bdn}]` : n)).join("");
}
//@ chunk-e6aww6q8.js:2496016-2496080 placement
function kdn(e) {
  return e.toLowerCase().replace(/[^a-z0-9]/g, "");
}
//@ chunk-e6aww6q8.js:2496080-2496287 placement
function foldLookalikeChar(e, n) {
  if (e.openLookalike.test(n)) return "<";
  if (e.squareLookalike.test(n)) return "[";
  if (!e.anyLetter.test(n)) return "";
  let filtered = e.letterClasses.filter(([, s]) => s.test(n));
  return filtered.length === 1 ? filtered[0][0] : bdn;
}
//@ chunk-e6aww6q8.js:2496287-2496443 placement
function foldLookalikes(e, n) {
  let r = new Map();
  return n
    .replace(e.unread, "")
    .replace(pmr, (s) => {
      let h = r.get(s);
      if (h === void 0) ((h = foldLookalikeChar(e, s)), r.set(s, h));
      return h;
    })
    .toLowerCase();
}
//@ chunk-e6aww6q8.js:2496443-2497128 placement
var checkHarnessTagLead = io(function () {
  let mapped = [...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map((h) => [
      h,
      new RegExp(`^[${latinLetterConfusableClass(h)}]$`, "iu"),
    ]),
    joined = [...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map(latinLetterConfusableClass).join(""),
    r = uniq([...RESERVED_XML_TAGS, ...INBOUND_MESSAGE_TAGS, "system-reminder", CHANNEL, ANTML].map(kdn)),
    s = uniq([
      ...artifactLeadTokens().map((h) => {
        let y = [];
        for (let S of h) {
          if (typeof S !== "string") break;
          y.push(S);
        }
        if (y.length === 0) throw Error("harness gate: a bracketed lead must start with a word");
        return y.join("");
      }),
      HARNESS,
    ]);
  return {
    letterClasses: mapped,
    anyLetter: new RegExp(`^[${joined}]$`, "iu"),
    openLookalike: new RegExp(`^[${UK.open}]$`, "u"),
    squareLookalike: new RegExp(`^[${OPEN_BRACKET_CHARS}]$`, "u"),
    unread: new RegExp(`[^0-9<A-Z[a-z${UK.open}${OPEN_BRACKET_CHARS}${joined}]+`, "giu"),
    needle: new RegExp(`<\\[*(?:${r.map(G7e).join("|")})|\\[(?:${s.map(G7e).join("|")})|${G7e(kdn(zFe))}`),
  };
});
//@ chunk-e6aww6q8.js:2497128-2497187 placement
function _mr(e) {
  let n = checkHarnessTagLead();
  return n.needle.test(foldLookalikes(n, e));
}
//@ chunk-e6aww6q8.js:2497187-2497237 placement
function wdn() {
  try {
    countHarnessPatterns(["\u2014"]);
  } catch (error) {
    logError(error);
  }
}
/**
 * 统计文本中各 harness 模式的出现次数（含形似字符折叠后的模式）。
 */
//@ chunk-e6aww6q8.js:2497237-2497427 placement
function countHarnessPatterns(e) {
  let n = [],
    r = e.some(_mr) ? [...yai(), ...HARNESS_TAG_PATTERNS()] : HARNESS_TAG_PATTERNS();
  for (let s of r) {
    let h = 0;
    for (let y of e) for (let S of y.matchAll(s.re)) h++;
    if (h > 0) n.push({ pattern: s.pattern, count: h });
  }
  return n;
}
/**
 * 上报助手输出中出现 harness 内容的遥测（模式与匹配总数）。
 */
//@ chunk-e6aww6q8.js:2497427-2497591 placement
function logHarnessContent(e) {
  if (e.length === 0) return;
  logEvent("tengu_assistant_output_harness_content", {
    patterns: fromEnumArr(uniq(e.map((n) => n.pattern))),
    match_count: e.reduce((n, r) => n + r.count, 0),
  });
}
//@ chunk-e6aww6q8.js:2497591-2497659 placement
function y8s(e, n) {
  if (!e) return !0;
  return isSubagentContext(n) && n.isMainSession === !0;
}
/**
 * 收集内容块中的文本并上报（出错只记录）。
 */
//@ chunk-e6aww6q8.js:2497659-2497868 placement = extractErrorTypeFromData (1)
function recordTextBlocks(content) {
  try {
    let n = [];
    for (let r of content)
      if (
        typeof r === "object" &&
        r !== null &&
        "type" in r &&
        r.type === "text" &&
        "text" in r &&
        typeof r.text === "string"
      )
        n.push(r.text);
    if (n.length === 0) return;
    logHarnessContent(countHarnessPatterns(n));
  } catch (error) {
    logError(error);
  }
}

export { wdn, y8s, recordTextBlocks };
