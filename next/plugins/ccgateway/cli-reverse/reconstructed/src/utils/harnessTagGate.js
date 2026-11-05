/**
 * utils/harnessTagGate.ts
 *
 * 2.1.316 新增：harness 标签门控
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6), chunk-hmzegypv.js (7)
 * attribution: placement 11, sole-consumer 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  ABCDEFGHIJKLMNOPQRSTUVWXYZ,
  latinLetterConfusableClass,
  ANTML,
  TAG_BRACKET_CLASSES,
  OPEN_BRACKET_CHARS,
} from "./confusables.js";
import { SYSTEM_REMINDER, HARNESS, SUBAGENT, AGENT_STOPPED_PREFIX } from "../tools/AgentTool/constants.js";
import { INBOUND_MESSAGE_TAGS, RESERVED_XML_TAGS, CHANNEL } from "../constants/xml.js";
import { artifactLeadTokens } from "../tools/ArtifactTool/artifactUrls.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { logError } from "./log.js";
import { alwaysOnControlTagPatterns } from "./subagentOutputScan.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnumArr } from "../services/analytics/safeMetadata.js";
import { isSubagentContext } from "./agentContext.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hmzegypv.js:701-730 sole-consumer
var LOOKALIKE_WILDCARD = "?";
var NON_ASCII_CHAR_RE = /[^\x00-\x7f]/gu;
//@ chunk-hmzegypv.js:730-807 affinity
function letterLookalikePattern(letters) {
  return [...letters]
    .map((letter) => (/[a-z]/.test(letter) ? `[${letter}${LOOKALIKE_WILDCARD}]` : letter))
    .join("");
}
//@ chunk-hmzegypv.js:807-869 placement
function normalizeTagName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
//@ chunk-hmzegypv.js:869-1072 placement
function foldLookalikeChar(lead, char) {
  if (lead.openLookalike.test(char)) return "<";
  if (lead.squareLookalike.test(char)) return "[";
  if (!lead.anyLetter.test(char)) return "";
  let filtered = lead.letterClasses.filter(([, test]) => test.test(char));
  return filtered.length === 1 ? filtered[0][0] : LOOKALIKE_WILDCARD;
}
//@ chunk-hmzegypv.js:1072-1222 placement
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
//@ chunk-hmzegypv.js:1222-2382 placement
var checkHarnessTagLead; // deferred: uses ABCDEFGHIJKLMNOPQRSTUVWXYZ (./confusables.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hmzegypv.js:1222", () => {
  checkHarnessTagLead = memoizeAlias(function () {
    let letterClasses = [...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map((letter) => [
      letter,
      new RegExp(`^[${latinLetterConfusableClass(letter)}]$`, "iu"),
    ]);
    let joined = [...ABCDEFGHIJKLMNOPQRSTUVWXYZ].map(latinLetterConfusableClass).join("");
    let tagNames = [];
    let artifactLeads = [];
    let proseLeads = [];
    let classes = {
      "system-reminder-tag": {
        tagNames: [SYSTEM_REMINDER],
      },
      "harness-envelope-tag": {
        tagNames: INBOUND_MESSAGE_TAGS,
      },
      "harness-signal-tag": {
        tagNames: RESERVED_XML_TAGS,
      },
      "channel-source-tag": {
        tagNames: [CHANNEL],
      },
      "model-layer-tag": {
        tagNames: [ANTML],
      },
      "marker-prefix-forgery": {
        leadHeads: [HARNESS],
      },
      "frame-prefix-forgery": {
        leadHeads: [SUBAGENT],
      },
      "artifact-lead-forgery": {
        leadHeads: artifactLeadTokens().map((lead) => {
          let words = [];
          for (let part of lead) {
            if (typeof part !== "string") break;
            words.push(part);
          }
          if (words.length === 0) throw Error("harness gate: a bracketed lead must start with a word");
          return words.join("");
        }),
      },
      "max-turns-note-forgery": {
        prose: AGENT_STOPPED_PREFIX,
      },
    };
    for (let config of Object.values(classes))
      if ("tagNames" in config) tagNames.push(...config.tagNames);
      else if ("leadHeads" in config) artifactLeads.push(...config.leadHeads.map(normalizeTagName));
      else proseLeads.push(normalizeTagName(config.prose));
    return {
      letterClasses,
      anyLetter: new RegExp(`^[${joined}]$`, "iu"),
      openLookalike: new RegExp(`^[${TAG_BRACKET_CLASSES.open}]$`, "u"),
      squareLookalike: new RegExp(`^[${OPEN_BRACKET_CHARS}]$`, "u"),
      unread: new RegExp(`[^0-9<A-Z[a-z${TAG_BRACKET_CLASSES.open}${OPEN_BRACKET_CHARS}${joined}]+`, "giu"),
      tagNames: new Set(tagNames),
      needle: new RegExp(
        `<\\[*(?:${normalizeCaseForComparison_2(tagNames.map(normalizeTagName)).map(letterLookalikePattern).join("|")})|\\[(?:${normalizeCaseForComparison_2(artifactLeads).map(letterLookalikePattern).join("|")})|${normalizeCaseForComparison_2(proseLeads).map(letterLookalikePattern).join("|")}`,
      ),
    };
  });
});
//@ chunk-hmzegypv.js:2382-2475 placement
function textHasHarnessTag(text, knownTagNames = []) {
  let lead = checkHarnessTagLead();
  return (
    knownTagNames.some((tagName) => !lead.tagNames.has(tagName)) ||
    lead.needle.test(foldLookalikes(lead, text))
  );
}
//@ chunk-5xgkngpb.js:2538156-2538479 placement
/**
 * 助手输出中可能伪造 harness 内容的模式（total_tokens、session-context、wake 标签与角色轮次形状）及非 ASCII 字符正则。
 */
var HARNESS_TAG_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2538156", () => {
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
});
//@ chunk-5xgkngpb.js:2538479-2538529 placement
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
//@ chunk-5xgkngpb.js:2538529-2538727 placement
/**
 * 统计文本中各 harness 模式的出现次数（含形似字符折叠后的模式）。
 */
function countHarnessPatterns(contents) {
  let hits = [];
  let patterns = contents.some((content) => textHasHarnessTag(content))
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
//@ chunk-5xgkngpb.js:2538727-2538891 placement
/**
 * 上报助手输出中出现 harness 内容的遥测（模式与匹配总数）。
 */
function logHarnessContent(hits) {
  if (hits.length === 0) return;
  logEvent("tengu_assistant_output_harness_content", {
    patterns: fromEnumArr(normalizeCaseForComparison_2(hits.map((hit) => hit.pattern))),
    match_count: hits.reduce((acc, hit) => acc + hit.count, 0),
  });
}
//@ chunk-5xgkngpb.js:2538891-2538959 placement
/**
 * 判断是否应记录 harness 文本：无上下文或为主会话时记录。
 */
function shouldRecordHarnessText(agentId, agentContext) {
  if (!agentId) return true;
  return isSubagentContext(agentContext) && agentContext.isMainSession === true;
}
//@ chunk-5xgkngpb.js:2538959-2539168 placement (2.1.88 match: extractErrorTypeFromData, 1)
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
export { warmHarnessPatterns, textHasHarnessTag, shouldRecordHarnessText, recordTextBlocks };
