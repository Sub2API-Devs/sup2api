/**
 * services/mcp/channelPermissions.ts
 *
 * 通过 channel 中继权限请求：短请求 ID 生成、工具输入的脱敏/去混淆/截断预览、可中继客户端筛选。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/channelPermissions.ts
 * pieces: chunk-e9h2v1vq.js (21)
 * attribution: fingerprint 5, layout 15, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomInt } from "crypto";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../analytics/growthbook.js";
import { plural, normalizeFullWidthSpace, truncateCodePoints } from "../../utils/stringUtils.js";
import {
  isDecisionSurfaceControl,
  QUOTE_HOMOGLYPHS,
  INVISIBLE_BLANKS,
} from "../../tools/ArtifactTool/artifactUrls.js";
import { BRACKET_CONFUSABLES } from "../../utils/sanitization.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { redactSecretsForDisplay, redactSecretsDeep } from "../teamMemorySync/secretScanner.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e9h2v1vq.js:500-555 fingerprint (2.1.88 match: isChannelPermissionRelayEnabled, 1)
/**
 * isChannelPermissionRelayEnabled：GrowthBook tengu_harbor_permissions，控制是否把权限请求转发给 channel 服务器。
 */
function isChannelPermissionRelayEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_permissions", false);
}
//@ chunk-e9h2v1vq.js:555-605 layout
/**
 * shouldUseRandomPermissionIds：GrowthBook tengu_quiet_elephant（默认 true）；关闭时权限请求 ID 由 toolUseID 哈希得到。
 */
function shouldUseRandomPermissionIds() {
  return getFeatureValue_SESSION_PINNED("tengu_quiet_elephant", true);
}
//@ chunk-e9h2v1vq.js:605-806 fingerprint (2.1.88 match: ID_AVOID_SUBSTRINGS, 0.98)
var ID_ALPHABET = "abcdefghijkmnopqrstuvwxyz";
var ID_AVOID_SUBSTRINGS = [
  "fuck",
  "shit",
  "cunt",
  "cock",
  "dick",
  "twat",
  "piss",
  "crap",
  "bitch",
  "whore",
  "ass",
  "tit",
  "cum",
  "fag",
  "dyke",
  "nig",
  "kike",
  "rape",
  "nazi",
  "damn",
  "poo",
  "pee",
  "wank",
  "anus",
];
//@ chunk-e9h2v1vq.js:806-983 fingerprint (2.1.88 match: hashToId, 1)
/**
 * hashToId：FNV-1a 32 位哈希后取 5 个字母（25 字母表，无 l）作为短 ID。
 */
function hashToId(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash = hash >>> 0;
  let id = "";
  for (let i = 0; i < 5; i++) {
    id += ID_ALPHABET[hash % 25];
    hash = Math.floor(hash / 25);
  }
  return id;
}
//@ chunk-e9h2v1vq.js:983-1143 layout
/**
 * generatePermissionRequestId：生成 channel 权限请求的 5 字母 ID；随机生成或按 toolUseID 哈希加盐重试，避开不雅子串。
 */
function generatePermissionRequestId(toolUseID) {
  if (!shouldUseRandomPermissionIds()) return shortRequestId(toolUseID);
  let candidate = "";
  for (let i = 0; i <= 10; i++) {
    candidate = "";
    for (let j = 0; j < 5; j++) candidate += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
    if (!ID_AVOID_SUBSTRINGS.some((avoid) => candidate.includes(avoid))) return candidate;
  }
  return candidate;
}
//@ chunk-e9h2v1vq.js:1143-1256 file-local
function shortRequestId(toolUseID) {
  let candidate = hashToId(toolUseID);
  for (let salt = 0; salt < 10; salt++) {
    if (!ID_AVOID_SUBSTRINGS.some((bad) => candidate.includes(bad))) return candidate;
    candidate = hashToId(`${toolUseID}:${salt}`);
  }
  return candidate;
}
//@ chunk-e9h2v1vq.js:1256-1297 layout
var PREVIEW_MAX_CODE_POINTS = 3500;
var PREVIEW_HEAD_CODE_POINTS = 2000;
var PREVIEW_TAIL_CODE_POINTS = 1500;
var PREVIEW_FIELDS_BUDGET = 15000;
var PREVIEW_ELIDED_NAMES_BUDGET = 30000;
//@ chunk-e9h2v1vq.js:1297-1355 layout
/**
 * sanitizePreviewLine：neutralize 后折叠空白并做中间省略。
 */
function sanitizePreviewLine(text) {
  return elideMiddleCodePoints(neutralizeConfusableChars(text).replace(/\s+/g, " ").trim());
}
//@ chunk-e9h2v1vq.js:1355-1541 layout
/**
 * elideMiddleCodePoints：按 Unicode 码点计数，超过 3500 时保留头 2000、尾 1500，中间换成 "⋯ N code points elided ⋯"。
 */
function elideMiddleCodePoints(text) {
  let list = Array.from(text);
  if (list.length <= PREVIEW_MAX_CODE_POINTS) return text;
  let elided = list.length - PREVIEW_HEAD_CODE_POINTS - PREVIEW_TAIL_CODE_POINTS;
  return (
    list.slice(0, PREVIEW_HEAD_CODE_POINTS).join("") +
    `
\u22EF ${elided} ${plural(elided, "code point")} elided \u22EF
` +
    list.slice(list.length - PREVIEW_TAIL_CODE_POINTS).join("")
  );
}
//@ chunk-e9h2v1vq.js:1541-1695 layout
/**
 * neutralizeConfusableChars：把不可见/格式字符换成空格，把引号类与易混淆字符换成 ·，防止权限预览被伪造。
 */
function neutralizeConfusableChars(text) {
  return Array.from(normalizeFullWidthSpace(text), (char) =>
    isDecisionSurfaceControl(char.codePointAt(0) ?? 0) ? " " : char,
  )
    .join("")
    .replace(QUOTE_HOMOGLYPHS, "\xB7")
    .replace(APOSTROPHE_LIKE_PATTERN, "\xB7")
    .replace(CONFUSABLE_CHARS_PATTERN, "\xB7")
    .replace(INVISIBLE_BLANKS, " ");
}
//@ chunk-e9h2v1vq.js:1695-2076 layout
var APOSTROPHE_LIKE_PATTERN; // deferred: uses BRACKET_CONFUSABLES_2 (../../utils/sanitization.js) of its import cycle while loading; runs once the cycle is complete
var CONFUSABLE_EXCEPTIONS;
var CONFUSABLE_CHARS_PATTERN;
deferInit("chunk-e9h2v1vq.js:1695", () => {
  APOSTROPHE_LIKE_PATTERN =
    /[\u2018\u2019\u201A\u201B\u00B4\u02B9\u02BB\u02BC\u02BD\u02BE\u02BF\u02C0\u02C8\u02CA\u02CB\u02F4\u0374\u0384\u055A\u055D\u05F3\u07F4\u07F5\u1FBD\u1FBF\u1FEF\u1FFD\u1FFE\u2032\u2035\u275B\u275C\u275F\uA78B\uA78C\uFF07\uFF40]/g;
  CONFUSABLE_EXCEPTIONS = new Set(["\u1433", "\u1438", "\u16B2", "\uD81B\uDF3F", "\u2039", "\u203A"]);
  CONFUSABLE_CHARS_PATTERN = new RegExp(
    `[${[...BRACKET_CONFUSABLES.keys()].filter((key) => !CONFUSABLE_EXCEPTIONS.has(key)).join("")}]`,
    "gu",
  );
});
//@ chunk-e9h2v1vq.js:2076-2124 layout
function previewKeyFingerprint(text) {
  return sanitizePreviewString(jsonStringify(text)).replace(/\s/g, " ");
}
//@ chunk-e9h2v1vq.js:2124-2284 layout
/**
 * dedupePreviewKey：预览中重复的键名追加 #2、#3… 保证唯一。
 */
function dedupePreviewKey(key, used, counters) {
  let candidate = key;
  let fingerprint = previewKeyFingerprint(key);
  if (used.has(fingerprint)) {
    let baseFingerprint = fingerprint;
    let suffix = counters.get(baseFingerprint) ?? 2;
    candidate = `${key}#${suffix}`;
    fingerprint = previewKeyFingerprint(candidate);
    while (used.has(fingerprint)) {
      suffix++;
      candidate = `${key}#${suffix}`;
      fingerprint = previewKeyFingerprint(candidate);
    }
    counters.set(baseFingerprint, suffix + 1);
  }
  used.add(fingerprint);
  return candidate;
}
//@ chunk-e9h2v1vq.js:2284-2487 layout
/**
 * sanitizeKeysDeep：递归重写对象键名（脱敏 + 去重），数组逐项处理。
 */
function sanitizeKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sanitizeKeysDeep);
  if (value !== null && typeof value === "object") {
    let copy = Object.create(null);
    let used = new Set();
    let counters = new Map();
    for (let [key, value_2] of Object.entries(value))
      copy[dedupePreviewKey(redactSecretsForDisplay(key), used, counters)] = sanitizeKeysDeep(value_2);
    return copy;
  }
  return value;
}
//@ chunk-e9h2v1vq.js:2487-2509 layout
var MAX_PROBE_DEPTH = 32000;
var MAX_PROBE_NODES = 2000000;
//@ chunk-e9h2v1vq.js:2509-2980 layout
/**
 * exceedsSerializationBudget：深度 ≥32000 或累计节点 >200 万（含 toJSON）就判为不可序列化，避免 JSON.stringify 爆栈。
 */
function exceedsSerializationBudget(value) {
  if (value === null || typeof value !== "object") return false;
  let budget = MAX_PROBE_NODES;
  let stack = [
    {
      node: value,
      depth: 1,
    },
  ];
  while (stack.length > 0) {
    let item = stack.pop();
    let { depth, node } = item;
    if (depth >= MAX_PROBE_DEPTH) return true;
    if (typeof node.toJSON === "function") {
      budget -= 1;
      if (budget < 0) return true;
      let jsonValue;
      try {
        jsonValue = node.toJSON();
      } catch {
        return true;
      }
      if (jsonValue === null || typeof jsonValue !== "object") continue;
      node = jsonValue;
    }
    if (Array.isArray(node)) {
      budget -= node.length;
      if (budget < 0) return true;
    }
    for (let key of Object.keys(node)) {
      budget -= 1;
      if (budget < 0) return true;
      let child = node[key];
      if (child !== null && typeof child === "object")
        stack.push({
          node: child,
          depth: depth + 1,
        });
    }
  }
  return false;
}
//@ chunk-e9h2v1vq.js:2980-5431 layout
/**
 * truncateForPreview：把工具输入渲染成脱敏、去混淆、截断的单行预览，用于 channel 权限中继；对象按字段累计预算 15000 码点，超出的字段名列在尾部；任何异常都返回 "(unserializable)" 一类标记。
 */
function truncateForPreview(value) {
  try {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      let parts = [];
      let usedChars = 0;
      let elidedNames = [];
      let usedKeys = new Set();
      let keyCounters = new Map();
      for (let key of Object.keys(value)) {
        let fieldValue;
        let serialized;
        let threw = false;
        try {
          fieldValue = value[key];
          if (exceedsSerializationBudget(fieldValue)) threw = true;
          else serialized = jsonStringify(fieldValue);
        } catch {
          threw = true;
        }
        if (serialized === undefined) {
          if (!threw) continue;
          let safeKey = dedupePreviewKey(redactSecretsForDisplay(key), usedKeys, keyCounters);
          logForDebugging(
            "truncateForPreview: field serialization threw (depth) \u2014 rendering a loud unserializable marker",
            {
              level: "error",
            },
          );
          let replaced = neutralizeConfusableChars(jsonStringify(safeKey)).replace(/\s+/g, " ");
          let truncatedKey = truncateCodePoints(replaced, 50);
          let keyLabel = truncatedKey.length < replaced.length ? truncatedKey + "\u2026" : truncatedKey;
          if (usedChars >= PREVIEW_FIELDS_BUDGET) {
            elidedNames.push(keyLabel);
            continue;
          }
          let marker = `${keyLabel}: (value unserializable)`;
          usedChars += Array.from(marker).length;
          parts.push(marker);
          continue;
        }
        let safeKey = dedupePreviewKey(redactSecretsForDisplay(key), usedKeys, keyCounters);
        if (usedChars >= PREVIEW_FIELDS_BUDGET) {
          let replaced = neutralizeConfusableChars(jsonStringify(safeKey)).replace(/\s+/g, " ");
          let shortKey = truncateCodePoints(replaced, 50);
          elidedNames.push(shortKey.length < replaced.length ? shortKey + "\u2026" : shortKey);
          continue;
        }
        let redactedText;
        let redactionThrew = false;
        try {
          redactedText = jsonStringify(
            sanitizeKeysDeep(
              redactSecretsDeep(
                {
                  [key]: jsonParse(serialized),
                },
                redactSecretsForDisplay,
              )[key],
            ),
          );
        } catch {
          redactionThrew = true;
        }
        if (redactedText === undefined)
          if (redactionThrew)
            logForDebugging(
              `truncateForPreview: redaction round-trip threw for field ${jsonStringify(safeKey)} \u2014 rendering unredacted`,
              {
                level: "error",
              },
            );
          else {
            logForDebugging(
              `truncateForPreview: redaction round-trip yielded no text for field ${jsonStringify(safeKey)} \u2014 rendering unredacted`,
              {
                level: "error",
              },
            );
            logError(
              Error(
                "truncateForPreview: redaction round-trip yielded no text for a field \u2014 rendering unredacted",
              ),
            );
          }
        let fieldText = redactedText === undefined ? serialized : redactedText;
        let line = `${sanitizePreviewString(jsonStringify(safeKey))}: ${sanitizePreviewString(fieldText)}`;
        usedChars += Array.from(line).length;
        parts.push(line);
      }
      let elidedNote = "";
      if (elidedNames.length > 0) {
        let floored = Math.floor(PREVIEW_ELIDED_NAMES_BUDGET / 10);
        if (elidedNames.length <= floored) {
          let max = Math.max(8, Math.floor(PREVIEW_ELIDED_NAMES_BUDGET / elidedNames.length) - 2);
          let mapped = elidedNames.map((name) => {
            let cut = truncateCodePoints(name, max);
            return cut.length < name.length ? cut + "\u2026" : cut;
          });
          elidedNote = `
\u22EF ${elidedNames.length} ${plural(elidedNames.length, "field")} elided: ${mapped.join(", ")} \u22EF
`;
        } else
          elidedNote = `
\u22EF ${elidedNames.length} ${plural(elidedNames.length, "field")} elided (count exceeds the ${floored}-name bound \u2014 refuse) \u22EF
`;
      }
      return `{ ${parts.join(", ")} }${elidedNote}`;
    }
    let serialized;
    try {
      if (exceedsSerializationBudget(value)) {
        logForDebugging(
          "truncateForPreview: non-object input exceeds the serialization depth probe \u2014 rendering a loud unserializable marker",
          {
            level: "error",
          },
        );
        return "(value unserializable)";
      }
      serialized = jsonStringify(value);
    } catch {
      logForDebugging(
        "truncateForPreview: non-object input serialization threw \u2014 rendering a loud unserializable marker",
        {
          level: "error",
        },
      );
      return "(value unserializable)";
    }
    if (serialized === undefined) return "(unserializable)";
    let redacted;
    let threw = false;
    try {
      redacted = jsonStringify(
        sanitizeKeysDeep(redactSecretsDeep(jsonParse(serialized), redactSecretsForDisplay)),
      );
    } catch {
      threw = true;
    }
    if (redacted === undefined) {
      if (threw)
        logForDebugging(
          "truncateForPreview: non-object redaction round-trip threw \u2014 rendering unredacted",
          {
            level: "error",
          },
        );
      else {
        logForDebugging(
          "truncateForPreview: non-object redaction round-trip failed \u2014 rendering unredacted",
          {
            level: "error",
          },
        );
        logError(
          Error("truncateForPreview: non-object redaction round-trip failed \u2014 rendering unredacted"),
        );
      }
      redacted = serialized;
    }
    return elideMiddleCodePoints(neutralizeConfusableChars(redacted).replace(/\s{2,}/g, " "));
  } catch {
    return "(unserializable)";
  }
}
//@ chunk-e9h2v1vq.js:5431-5737 layout
/**
 * sanitizePreviewString：超长字符串（>10 万字符）只处理头尾片段并插入省略说明，其余走 neutralize + 折叠空白 + 中间省略。
 */
function sanitizePreviewString(text) {
  if (text.length <= 1e5)
    return elideMiddleCodePoints(neutralizeConfusableChars(text).replace(/\s{2,}/g, " "));
  let codePoints = 0;
  for (let char of text) codePoints++;
  let replaced = neutralizeConfusableChars(
    truncateCodePoints(text.slice(0, PREVIEW_HEAD_CODE_POINTS * 2 + 1), PREVIEW_HEAD_CODE_POINTS),
  ).replace(/\s{2,}/g, " ");
  let list = Array.from(normalizeFullWidthSpace(text.slice(-(PREVIEW_TAIL_CODE_POINTS * 2 + 1))));
  let replaced_2 = neutralizeConfusableChars(list.slice(-PREVIEW_TAIL_CODE_POINTS).join("")).replace(
    /\s{2,}/g,
    " ",
  );
  let elided = codePoints - PREVIEW_HEAD_CODE_POINTS - PREVIEW_TAIL_CODE_POINTS;
  return (
    replaced +
    `
\u22EF ${elided} ${plural(elided, "code point")} elided \u22EF
` +
    replaced_2
  );
}
//@ chunk-e9h2v1vq.js:5737-5784 layout
/**
 * 判断服务器 capabilities.experimental 是否声明了某个实验能力（如 channel 权限中继）。
 */
function hasExperimentalCapability(capabilities, capability) {
  return !!capabilities?.experimental?.[capability];
}
//@ chunk-e9h2v1vq.js:5784-5982 fingerprint (2.1.88 match: filterPermissionRelayClients, 0.723)
/**
 * filterPermissionRelayClients：选出可接收权限中继的客户端：已连接、在 channel 列表、声明 experimental claude/channel 与 claude/channel/permission、允许中继且不是 modern 协议。
 */
function filterPermissionRelayClients(clients, isChannelServer, isPermissionRelayAllowed) {
  return clients.filter(
    (client) =>
      client.type === "connected" &&
      isChannelServer(client.name) &&
      hasExperimentalCapability(client.capabilities, "claude/channel") &&
      hasExperimentalCapability(client.capabilities, "claude/channel/permission") &&
      isPermissionRelayAllowed(client.name) &&
      client.protocolEra !== "modern",
  );
}
//@ chunk-e9h2v1vq.js:5982-6458 fingerprint (2.1.88 match: createChannelPermissionCallbacks, 0.549)
function createChannelPermissionCallbacks(isServerRegistered) {
  let pending = new Map();
  let seenIds = new Set();
  return {
    isServerRegistered,
    onResponse(requestId, handler) {
      let key = requestId.toLowerCase();
      if (shouldUseRandomPermissionIds()) {
        if (seenIds.has(key)) {
          pending.delete(key);
          logForDebugging(
            "Channel permission relay: a request ID was drawn twice in one session; channel replies with that ID are ignored \u2014 answer in the terminal",
            {
              level: "warn",
            },
          );
          return () => {};
        }
        seenIds.add(key);
      }
      pending.set(key, handler);
      return () => {
        pending.delete(key);
      };
    },
    resolve(requestId, behavior, fromServer) {
      let key = requestId.toLowerCase();
      let resolver = pending.get(key);
      if (!resolver) return false;
      pending.delete(key);
      resolver({
        behavior,
        fromServer,
      });
      return true;
    },
  };
}
export {
  createChannelPermissionCallbacks,
  isChannelPermissionRelayEnabled,
  hasExperimentalCapability,
  sanitizePreviewLine,
  generatePermissionRequestId,
  filterPermissionRelayClients,
  truncateForPreview,
};
