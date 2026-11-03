/**
 * services/mcp/channelPermissions.ts
 *
 * 通过 channel 中继权限请求：短请求 ID 生成、工具输入的脱敏/去混淆/截断预览、可中继客户端筛选。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/channelPermissions.ts
 * pieces: chunk-d3jaf8bt.js (21)
 * attribution: fingerprint 5, layout 15, file-local 1
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

//@ chunk-d3jaf8bt.js:434-489 fingerprint = isChannelPermissionRelayEnabled (1)
/**
 * isChannelPermissionRelayEnabled：GrowthBook tengu_harbor_permissions，控制是否把权限请求转发给 channel 服务器。
 */
function isChannelPermissionRelayEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_permissions", false);
}
//@ chunk-d3jaf8bt.js:489-539 layout
/**
 * shouldUseRandomPermissionIds：GrowthBook tengu_quiet_elephant（默认 true）；关闭时权限请求 ID 由 toolUseID 哈希得到。
 */
function shouldUseRandomPermissionIds() {
  return getFeatureValue_SESSION_PINNED("tengu_quiet_elephant", true);
}
//@ chunk-d3jaf8bt.js:539-740 fingerprint = ID_AVOID_SUBSTRINGS (0.98)
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
//@ chunk-d3jaf8bt.js:740-917 fingerprint = hashToId (1)
/**
 * hashToId：FNV-1a 32 位哈希后取 5 个字母（25 字母表，无 l）作为短 ID。
 */
function hashToId(input) {
  let e = 2166136261;
  for (let i = 0; i < input.length; i++) {
    e ^= input.charCodeAt(i);
    e = Math.imul(e, 16777619);
  }
  e = e >>> 0;
  let o = "";
  for (let i = 0; i < 5; i++) {
    o += ID_ALPHABET[e % 25];
    e = Math.floor(e / 25);
  }
  return o;
}
//@ chunk-d3jaf8bt.js:917-1077 layout
/**
 * generatePermissionRequestId：生成 channel 权限请求的 5 字母 ID；随机生成或按 toolUseID 哈希加盐重试，避开不雅子串。
 */
function generatePermissionRequestId(toolUseID) {
  if (!shouldUseRandomPermissionIds()) return shortRequestId(toolUseID);
  let e = "";
  for (let i = 0; i <= 10; i++) {
    e = "";
    for (let j = 0; j < 5; j++) e += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
    if (!ID_AVOID_SUBSTRINGS.some((r) => e.includes(r))) return e;
  }
  return e;
}
//@ chunk-d3jaf8bt.js:1077-1190 file-local
function shortRequestId(toolUseID) {
  let candidate = hashToId(toolUseID);
  for (let salt = 0; salt < 10; salt++) {
    if (!ID_AVOID_SUBSTRINGS.some((bad) => candidate.includes(bad))) return candidate;
    candidate = hashToId(`${toolUseID}:${salt}`);
  }
  return candidate;
}
//@ chunk-d3jaf8bt.js:1190-1231 layout
var PREVIEW_MAX_CODE_POINTS = 3500;
var PREVIEW_HEAD_CODE_POINTS = 2000;
var PREVIEW_TAIL_CODE_POINTS = 1500;
var PREVIEW_FIELDS_BUDGET = 15000;
var PREVIEW_ELIDED_NAMES_BUDGET = 30000;
//@ chunk-d3jaf8bt.js:1231-1289 layout
/**
 * sanitizePreviewLine：neutralize 后折叠空白并做中间省略。
 */
function sanitizePreviewLine(n) {
  return elideMiddleCodePoints(neutralizeConfusableChars(n).replace(/\s+/g, " ").trim());
}
//@ chunk-d3jaf8bt.js:1289-1475 layout
/**
 * elideMiddleCodePoints：按 Unicode 码点计数，超过 3500 时保留头 2000、尾 1500，中间换成 "⋯ N code points elided ⋯"。
 */
function elideMiddleCodePoints(n) {
  let list = Array.from(n);
  if (list.length <= PREVIEW_MAX_CODE_POINTS) return n;
  let o = list.length - PREVIEW_HEAD_CODE_POINTS - PREVIEW_TAIL_CODE_POINTS;
  return (
    list.slice(0, PREVIEW_HEAD_CODE_POINTS).join("") +
    `
\u22EF ${o} ${plural(o, "code point")} elided \u22EF
` +
    list.slice(list.length - PREVIEW_TAIL_CODE_POINTS).join("")
  );
}
//@ chunk-d3jaf8bt.js:1475-1629 layout
/**
 * neutralizeConfusableChars：把不可见/格式字符换成空格，把引号类与易混淆字符换成 ·，防止权限预览被伪造。
 */
function neutralizeConfusableChars(n) {
  return Array.from(normalizeFullWidthSpace(n), (e) =>
    isDecisionSurfaceControl(e.codePointAt(0) ?? 0) ? " " : e,
  )
    .join("")
    .replace(QUOTE_HOMOGLYPHS, "\xB7")
    .replace(APOSTROPHE_LIKE_PATTERN, "\xB7")
    .replace(CONFUSABLE_CHARS_PATTERN, "\xB7")
    .replace(INVISIBLE_BLANKS, " ");
}
//@ chunk-d3jaf8bt.js:1629-2010 layout
var APOSTROPHE_LIKE_PATTERN =
  /[\u2018\u2019\u201A\u201B\u00B4\u02B9\u02BB\u02BC\u02BD\u02BE\u02BF\u02C0\u02C8\u02CA\u02CB\u02F4\u0374\u0384\u055A\u055D\u05F3\u07F4\u07F5\u1FBD\u1FBF\u1FEF\u1FFD\u1FFE\u2032\u2035\u275B\u275C\u275F\uA78B\uA78C\uFF07\uFF40]/g;
var CONFUSABLE_EXCEPTIONS = new Set(["\u1433", "\u1438", "\u16B2", "\uD81B\uDF3F", "\u2039", "\u203A"]);
var CONFUSABLE_CHARS_PATTERN = new RegExp(
  `[${[...BRACKET_CONFUSABLES.keys()].filter((key) => !CONFUSABLE_EXCEPTIONS.has(key)).join("")}]`,
  "gu",
);
//@ chunk-d3jaf8bt.js:2010-2058 layout
function previewKeyFingerprint(n) {
  return sanitizePreviewString(jsonStringify(n)).replace(/\s/g, " ");
}
//@ chunk-d3jaf8bt.js:2058-2218 layout
/**
 * dedupePreviewKey：预览中重复的键名追加 #2、#3… 保证唯一。
 */
function dedupePreviewKey(n, e, o) {
  let r = n;
  let s = previewKeyFingerprint(n);
  if (e.has(s)) {
    let i = s;
    let a = o.get(i) ?? 2;
    r = `${n}#${a}`;
    s = previewKeyFingerprint(r);
    while (e.has(s)) {
      a++;
      r = `${n}#${a}`;
      s = previewKeyFingerprint(r);
    }
    o.set(i, a + 1);
  }
  e.add(s);
  return r;
}
//@ chunk-d3jaf8bt.js:2218-2421 layout
/**
 * sanitizeKeysDeep：递归重写对象键名（脱敏 + 去重），数组逐项处理。
 */
function sanitizeKeysDeep(n) {
  if (Array.isArray(n)) return n.map(sanitizeKeysDeep);
  if (n !== null && typeof n === "object") {
    let e = Object.create(null);
    let o = new Set();
    let r = new Map();
    for (let [key, value] of Object.entries(n))
      e[dedupePreviewKey(redactSecretsForDisplay(key), o, r)] = sanitizeKeysDeep(value);
    return e;
  }
  return n;
}
//@ chunk-d3jaf8bt.js:2421-2443 layout
var MAX_PROBE_DEPTH = 32000;
var MAX_PROBE_NODES = 2000000;
//@ chunk-d3jaf8bt.js:2443-2914 layout
/**
 * exceedsSerializationBudget：深度 ≥32000 或累计节点 >200 万（含 toJSON）就判为不可序列化，避免 JSON.stringify 爆栈。
 */
function exceedsSerializationBudget(n) {
  if (n === null || typeof n !== "object") return false;
  let e = MAX_PROBE_NODES;
  let o = [
    {
      node: n,
      depth: 1,
    },
  ];
  while (o.length > 0) {
    let r = o.pop();
    let { depth, node } = r;
    if (depth >= MAX_PROBE_DEPTH) return true;
    if (typeof node.toJSON === "function") {
      e -= 1;
      if (e < 0) return true;
      let u;
      try {
        u = node.toJSON();
      } catch {
        return true;
      }
      if (u === null || typeof u !== "object") continue;
      node = u;
    }
    if (Array.isArray(node)) {
      e -= node.length;
      if (e < 0) return true;
    }
    for (let key of Object.keys(node)) {
      e -= 1;
      if (e < 0) return true;
      let p = node[key];
      if (p !== null && typeof p === "object")
        o.push({
          node: p,
          depth: depth + 1,
        });
    }
  }
  return false;
}
//@ chunk-d3jaf8bt.js:2914-5365 layout
/**
 * truncateForPreview：把工具输入渲染成脱敏、去混淆、截断的单行预览，用于 channel 权限中继；对象按字段累计预算 15000 码点，超出的字段名列在尾部；任何异常都返回 "(unserializable)" 一类标记。
 */
function truncateForPreview(value) {
  try {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      let s = [];
      let i = 0;
      let a = [];
      let u = new Set();
      let p = new Map();
      for (let key of Object.keys(value)) {
        let h;
        let m;
        let y = false;
        try {
          h = value[key];
          if (exceedsSerializationBudget(h)) y = true;
          else m = jsonStringify(h);
        } catch {
          y = true;
        }
        if (m === undefined) {
          if (!y) continue;
          let F = dedupePreviewKey(redactSecretsForDisplay(key), u, p);
          logForDebugging(
            "truncateForPreview: field serialization threw (depth) \u2014 rendering a loud unserializable marker",
            {
              level: "error",
            },
          );
          let replaced = neutralizeConfusableChars(jsonStringify(F)).replace(/\s+/g, " ");
          let P = truncateCodePoints(replaced, 50);
          let D = P.length < replaced.length ? P + "\u2026" : P;
          if (i >= PREVIEW_FIELDS_BUDGET) {
            a.push(D);
            continue;
          }
          let j = `${D}: (value unserializable)`;
          i += Array.from(j).length;
          s.push(j);
          continue;
        }
        let d = dedupePreviewKey(redactSecretsForDisplay(key), u, p);
        if (i >= PREVIEW_FIELDS_BUDGET) {
          let replaced = neutralizeConfusableChars(jsonStringify(d)).replace(/\s+/g, " ");
          let b = truncateCodePoints(replaced, 50);
          a.push(b.length < replaced.length ? b + "\u2026" : b);
          continue;
        }
        let c;
        let B = false;
        try {
          c = jsonStringify(
            sanitizeKeysDeep(
              redactSecretsDeep(
                {
                  [key]: jsonParse(m),
                },
                redactSecretsForDisplay,
              )[key],
            ),
          );
        } catch {
          B = true;
        }
        if (c === undefined)
          if (B)
            logForDebugging(
              `truncateForPreview: redaction round-trip threw for field ${jsonStringify(d)} \u2014 rendering unredacted`,
              {
                level: "error",
              },
            );
          else {
            logForDebugging(
              `truncateForPreview: redaction round-trip yielded no text for field ${jsonStringify(d)} \u2014 rendering unredacted`,
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
        let H = c === undefined ? m : c;
        let x = `${sanitizePreviewString(jsonStringify(d))}: ${sanitizePreviewString(H)}`;
        i += Array.from(x).length;
        s.push(x);
      }
      let C = "";
      if (a.length > 0) {
        let floored = Math.floor(PREVIEW_ELIDED_NAMES_BUDGET / 10);
        if (a.length <= floored) {
          let max = Math.max(8, Math.floor(PREVIEW_ELIDED_NAMES_BUDGET / a.length) - 2);
          let mapped = a.map((d) => {
            let c = truncateCodePoints(d, max);
            return c.length < d.length ? c + "\u2026" : c;
          });
          C = `
\u22EF ${a.length} ${plural(a.length, "field")} elided: ${mapped.join(", ")} \u22EF
`;
        } else
          C = `
\u22EF ${a.length} ${plural(a.length, "field")} elided (count exceeds the ${floored}-name bound \u2014 refuse) \u22EF
`;
      }
      return `{ ${s.join(", ")} }${C}`;
    }
    let e;
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
      e = jsonStringify(value);
    } catch {
      logForDebugging(
        "truncateForPreview: non-object input serialization threw \u2014 rendering a loud unserializable marker",
        {
          level: "error",
        },
      );
      return "(value unserializable)";
    }
    if (e === undefined) return "(unserializable)";
    let o;
    let r = false;
    try {
      o = jsonStringify(sanitizeKeysDeep(redactSecretsDeep(jsonParse(e), redactSecretsForDisplay)));
    } catch {
      r = true;
    }
    if (o === undefined) {
      if (r)
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
      o = e;
    }
    return elideMiddleCodePoints(neutralizeConfusableChars(o).replace(/\s{2,}/g, " "));
  } catch {
    return "(unserializable)";
  }
}
//@ chunk-d3jaf8bt.js:5365-5671 layout
/**
 * sanitizePreviewString：超长字符串（>10 万字符）只处理头尾片段并插入省略说明，其余走 neutralize + 折叠空白 + 中间省略。
 */
function sanitizePreviewString(n) {
  if (n.length <= 1e5) return elideMiddleCodePoints(neutralizeConfusableChars(n).replace(/\s{2,}/g, " "));
  let e = 0;
  for (let a of n) e++;
  let replaced = neutralizeConfusableChars(
    truncateCodePoints(n.slice(0, PREVIEW_HEAD_CODE_POINTS * 2 + 1), PREVIEW_HEAD_CODE_POINTS),
  ).replace(/\s{2,}/g, " ");
  let list = Array.from(normalizeFullWidthSpace(n.slice(-(PREVIEW_TAIL_CODE_POINTS * 2 + 1))));
  let replaced_2 = neutralizeConfusableChars(list.slice(-PREVIEW_TAIL_CODE_POINTS).join("")).replace(
    /\s{2,}/g,
    " ",
  );
  let i = e - PREVIEW_HEAD_CODE_POINTS - PREVIEW_TAIL_CODE_POINTS;
  return (
    replaced +
    `
\u22EF ${i} ${plural(i, "code point")} elided \u22EF
` +
    replaced_2
  );
}
//@ chunk-d3jaf8bt.js:5671-5718 layout
/**
 * 判断服务器 capabilities.experimental 是否声明了某个实验能力（如 channel 权限中继）。
 */
function hasExperimentalCapability(capabilities, e) {
  return !!capabilities?.experimental?.[e];
}
//@ chunk-d3jaf8bt.js:5718-5916 fingerprint = filterPermissionRelayClients (0.723)
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
//@ chunk-d3jaf8bt.js:5916-6392 fingerprint = createChannelPermissionCallbacks (0.548)
function createChannelPermissionCallbacks(isServerRegistered) {
  let pending = new Map();
  let o = new Set();
  return {
    isServerRegistered,
    onResponse(requestId, handler) {
      let key = requestId.toLowerCase();
      if (shouldUseRandomPermissionIds()) {
        if (o.has(key)) {
          pending.delete(key);
          logForDebugging(
            "Channel permission relay: a request ID was drawn twice in one session; channel replies with that ID are ignored \u2014 answer in the terminal",
            {
              level: "warn",
            },
          );
          return () => {};
        }
        o.add(key);
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
