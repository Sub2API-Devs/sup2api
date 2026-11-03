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
  TAG_BRACKET_CLASSES,
  OPEN_BRACKET_CHARS,
} from "./confusables.js";
import { uniq } from "./collections.js";
import { RESERVED_XML_TAGS, INBOUND_MESSAGE_TAGS, CHANNEL } from "../constants/xml.js";
import { artifactLeadTokens } from "../tools/ArtifactTool/artifactUrls.js";
import { HARNESS, alwaysOnControlTagPatterns } from "./subagentOutputScan.js";
import { AGENT_STOPPED_NOTE } from "../tools/AgentTool/constants.js";
import { logError } from "./log.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnumArr } from "../services/analytics/safeMetadata.js";
import { isSubagentContext } from "./agentContext.js";

//@ chunk-e6aww6q8.js:2495583-2495935 placement
/**
 * 助手输出中可能伪造 harness 内容的模式（total_tokens、session-context、wake 标签与角色轮次形状）及非 ASCII 字符正则。
 */
var HARNESS_TAG_PATTERNS = io(function () {
  return [
    {
      pattern: "total-tokens-tag",
      re: /<(?=\/?total_tokens(?:[>\s/]|$))/gi,
    },
    {
      pattern: "session-context-tag",
      re: /<(?=\/?session-context(?:[>\s/]|$))/gi,
    },
    {
      pattern: "wake-tag",
      re: /<(?=\/?wake(?:[>\s/]|$))/gi,
    },
    {
      pattern: "role-turn-shape",
      re: /(?:^|[\r\n\u2028\u2029])(?:user|system|assistant|human)[<[]/g,
    },
  ];
});
var LOOKALIKE_WILDCARD = "?";
var NON_ASCII_CHAR_RE = /[^\x00-\x7f]/gu;
//@ chunk-e6aww6q8.js:2495935-2496016 placement
function foldLatinLookalikes(e) {
  return [...e].map((n) => (/[a-z]/.test(n) ? `[${n}${LOOKALIKE_WILDCARD}]` : n)).join("");
}
//@ chunk-e6aww6q8.js:2496016-2496080 placement
function normalizeTagName(e) {
  return e.toLowerCase().replace(/[^a-z0-9]/g, "");
}
//@ chunk-e6aww6q8.js:2496080-2496287 placement
function foldLookalikeChar(e, n) {
  if (e.openLookalike.test(n)) return "<";
  if (e.squareLookalike.test(n)) return "[";
  if (!e.anyLetter.test(n)) return "";
  let filtered = e.letterClasses.filter(([, s]) => s.test(n));
  return filtered.length === 1 ? filtered[0][0] : LOOKALIKE_WILDCARD;
}
//@ chunk-e6aww6q8.js:2496287-2496443 placement
function foldLookalikes(e, n) {
  let r = new Map();
  return n
    .replace(e.unread, "")
    .replace(NON_ASCII_CHAR_RE, (s) => {
      let h = r.get(s);
      if (h === undefined) {
        h = foldLookalikeChar(e, s);
        r.set(s, h);
      }
      return h;
    })
    .toLowerCase();
}
//@ chunk-e6aww6q8.js:2496443-2497128 placement
var checkHarnessTagLead = io(function () {
  let letterClasses = [...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map((h) => [
    h,
    new RegExp(`^[${latinLetterConfusableClass(h)}]$`, "iu"),
  ]);
  let joined = [...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map(latinLetterConfusableClass).join("");
  let r = uniq(
    [...RESERVED_XML_TAGS, ...INBOUND_MESSAGE_TAGS, "system-reminder", CHANNEL, ANTML].map(normalizeTagName),
  );
  let s = uniq([
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
    letterClasses,
    anyLetter: new RegExp(`^[${joined}]$`, "iu"),
    openLookalike: new RegExp(`^[${TAG_BRACKET_CLASSES.open}]$`, "u"),
    squareLookalike: new RegExp(`^[${OPEN_BRACKET_CHARS}]$`, "u"),
    unread: new RegExp(`[^0-9<A-Z[a-z${TAG_BRACKET_CLASSES.open}${OPEN_BRACKET_CHARS}${joined}]+`, "giu"),
    needle: new RegExp(
      `<\\[*(?:${r.map(foldLatinLookalikes).join("|")})|\\[(?:${s.map(foldLatinLookalikes).join("|")})|${foldLatinLookalikes(normalizeTagName(AGENT_STOPPED_NOTE))}`,
    ),
  };
});
//@ chunk-e6aww6q8.js:2497128-2497187 placement
function textHasHarnessTag(e) {
  let n = checkHarnessTagLead();
  return n.needle.test(foldLookalikes(n, e));
}
//@ chunk-e6aww6q8.js:2497187-2497237 placement
/**
 * 预热 harness 标签模式（用破折号触发一次统计，异常只记录）。
 */
function warmHarnessPatterns() {
  try {
    countHarnessPatterns(["\u2014"]);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2497237-2497427 placement
/**
 * 统计文本中各 harness 模式的出现次数（含形似字符折叠后的模式）。
 */
function countHarnessPatterns(e) {
  let n = [];
  let r = e.some(textHasHarnessTag)
    ? [...alwaysOnControlTagPatterns(), ...HARNESS_TAG_PATTERNS()]
    : HARNESS_TAG_PATTERNS();
  for (let s of r) {
    let h = 0;
    for (let y of e) for (let S of y.matchAll(s.re)) h++;
    if (h > 0)
      n.push({
        pattern: s.pattern,
        count: h,
      });
  }
  return n;
}
//@ chunk-e6aww6q8.js:2497427-2497591 placement
/**
 * 上报助手输出中出现 harness 内容的遥测（模式与匹配总数）。
 */
function logHarnessContent(e) {
  if (e.length === 0) return;
  logEvent("tengu_assistant_output_harness_content", {
    patterns: fromEnumArr(uniq(e.map((n) => n.pattern))),
    match_count: e.reduce((acc, r) => acc + r.count, 0),
  });
}
//@ chunk-e6aww6q8.js:2497591-2497659 placement
/**
 * 判断是否应记录 harness 文本：无上下文或为主会话时记录。
 */
function shouldRecordHarnessText(agentId, agentContext) {
  if (!agentId) return true;
  return isSubagentContext(agentContext) && agentContext.isMainSession === true;
}
//@ chunk-e6aww6q8.js:2497659-2497868 placement = extractErrorTypeFromData (1)
/**
 * 收集内容块中的文本并上报（出错只记录）。
 */
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
export { warmHarnessPatterns, shouldRecordHarnessText, recordTextBlocks };
