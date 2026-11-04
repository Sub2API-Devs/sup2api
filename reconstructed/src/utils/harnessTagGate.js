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
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2495583-2495935 placement
/**
 * 助手输出中可能伪造 harness 内容的模式（total_tokens、session-context、wake 标签与角色轮次形状）及非 ASCII 字符正则。
 */
var HARNESS_TAG_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOOKALIKE_WILDCARD;
var NON_ASCII_CHAR_RE;
deferInit("chunk-e6aww6q8.js:2495583", () => {
  HARNESS_TAG_PATTERNS = memoizeAlias(function () {
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
  LOOKALIKE_WILDCARD = "?";
  NON_ASCII_CHAR_RE = /[^\x00-\x7f]/gu;
});
//@ chunk-e6aww6q8.js:2495935-2496016 placement
function foldLatinLookalikes(text) {
  return [...text].map((char) => (/[a-z]/.test(char) ? `[${char}${LOOKALIKE_WILDCARD}]` : char)).join("");
}
//@ chunk-e6aww6q8.js:2496016-2496080 placement
function normalizeTagName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
//@ chunk-e6aww6q8.js:2496080-2496287 placement
function foldLookalikeChar(lead, char) {
  if (lead.openLookalike.test(char)) return "<";
  if (lead.squareLookalike.test(char)) return "[";
  if (!lead.anyLetter.test(char)) return "";
  let filtered = lead.letterClasses.filter(([, test]) => test.test(char));
  return filtered.length === 1 ? filtered[0][0] : LOOKALIKE_WILDCARD;
}
//@ chunk-e6aww6q8.js:2496287-2496443 placement
function foldLookalikes(lead, text) {
  let cache = new Map();
  return text
    .replace(lead.unread, "")
    .replace(NON_ASCII_CHAR_RE, (char) => {
      let folded = cache.get(char);
      if (folded === undefined) {
        folded = foldLookalikeChar(lead, char);
        cache.set(char, folded);
      }
      return folded;
    })
    .toLowerCase();
}
//@ chunk-e6aww6q8.js:2496443-2497128 placement
var checkHarnessTagLead; // deferred: uses ABCDEFGHIJKLMNOPQRSTUVWXYZ (./confusables.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:2496443", () => {
  checkHarnessTagLead = memoizeAlias(function () {
    let letterClasses = [...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map((letter) => [
      letter,
      new RegExp(`^[${latinLetterConfusableClass(letter)}]$`, "iu"),
    ]);
    let joined = [...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map(latinLetterConfusableClass).join("");
    let tagNames = uniq(
      [...RESERVED_XML_TAGS, ...INBOUND_MESSAGE_TAGS, "system-reminder", CHANNEL, ANTML].map(
        normalizeTagName,
      ),
    );
    let artifactLeads = uniq([
      ...artifactLeadTokens().map((lead) => {
        let words = [];
        for (let part of lead) {
          if (typeof part !== "string") break;
          words.push(part);
        }
        if (words.length === 0) throw Error("harness gate: a bracketed lead must start with a word");
        return words.join("");
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
        `<\\[*(?:${tagNames.map(foldLatinLookalikes).join("|")})|\\[(?:${artifactLeads.map(foldLatinLookalikes).join("|")})|${foldLatinLookalikes(normalizeTagName(AGENT_STOPPED_NOTE))}`,
      ),
    };
  });
});
//@ chunk-e6aww6q8.js:2497128-2497187 placement
function textHasHarnessTag(text) {
  let lead = checkHarnessTagLead();
  return lead.needle.test(foldLookalikes(lead, text));
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
function countHarnessPatterns(contents) {
  let hits = [];
  let patterns = contents.some(textHasHarnessTag)
    ? [...alwaysOnControlTagPatterns(), ...HARNESS_TAG_PATTERNS()]
    : HARNESS_TAG_PATTERNS();
  for (let pattern of patterns) {
    let matchCount = 0;
    for (let text of contents) for (let match of text.matchAll(pattern.re)) matchCount++;
    if (matchCount > 0)
      hits.push({
        pattern: pattern.pattern,
        count: matchCount,
      });
  }
  return hits;
}
//@ chunk-e6aww6q8.js:2497427-2497591 placement
/**
 * 上报助手输出中出现 harness 内容的遥测（模式与匹配总数）。
 */
function logHarnessContent(hits) {
  if (hits.length === 0) return;
  logEvent("tengu_assistant_output_harness_content", {
    patterns: fromEnumArr(uniq(hits.map((hit) => hit.pattern))),
    match_count: hits.reduce((acc, hit) => acc + hit.count, 0),
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
    let texts = [];
    for (let block of content)
      if (
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      )
        texts.push(block.text);
    if (texts.length === 0) return;
    logHarnessContent(countHarnessPatterns(texts));
  } catch (error) {
    logError(error);
  }
}
export { warmHarnessPatterns, shouldRecordHarnessText, recordTextBlocks };
