/**
 * utils/sessionPeers.ts
 *
 * 会话对端认证（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e7z1g8a9.js (25)
 * attribution: placement 25
 */
import { randomBytes } from "crypto";
import {
  CROSS_SESSION_MESSAGE,
  TEAMMATE_MESSAGE,
  AGENT_MESSAGE,
  INBOUND_MESSAGE_TAGS,
  RESERVED_XML_TAGS,
  CHANNEL,
} from "../constants/xml.js";
import {
  createTagNeutralizer,
  channelSourceAttrPattern,
  TAG_BRACKET_CLASSES,
  codePointLength,
} from "./confusables.js";
import { escapeXmlAttr } from "./xml.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { errorMessage } from "./errors.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string } from "../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "./platform.js";

//@ chunk-e7z1g8a9.js:1189-1240 placement
var PEER_MESSAGE_TAGS = [CROSS_SESSION_MESSAGE, TEAMMATE_MESSAGE, AGENT_MESSAGE];
var INBOUND_MESSAGE_TAG_LIST = [...INBOUND_MESSAGE_TAGS, "system-reminder"];
var peerTagNeutralizerCache;
//@ chunk-e7z1g8a9.js:1240-1283 placement
function getPeerTagNeutralizer() {
  peerTagNeutralizerCache ??= createTagNeutralizer([
    {
      tags: PEER_MESSAGE_TAGS,
    },
  ]);
  return peerTagNeutralizerCache;
}
//@ chunk-e7z1g8a9.js:1283-1324 placement
/**
 * neutralizePeerTags：中和文本里的对端标签。
 */
function neutralizePeerTags(e) {
  return getPeerTagNeutralizer().neutralize(e);
}
//@ chunk-e7z1g8a9.js:1324-1368 placement
/**
 * peerTagOpenerOffsets：对端标签的起始偏移。
 */
function peerTagOpenerOffsets(e) {
  return getPeerTagNeutralizer().openerOffsets(e);
}
//@ chunk-e7z1g8a9.js:1368-1374 placement
var inboundTagNeutralizerCache;
//@ chunk-e7z1g8a9.js:1374-1502 placement
function getPeerTagNeutralizer_2() {
  inboundTagNeutralizerCache ??= createTagNeutralizer([
    {
      tags: RESERVED_XML_TAGS.filter((e) => e !== CHANNEL),
    },
    {
      tags: [CHANNEL],
      tail: channelSourceAttrPattern,
    },
    {
      tags: ["antml"],
      tail: ({ colon }) => `[${colon}]`,
    },
  ]);
  return inboundTagNeutralizerCache;
}
//@ chunk-e7z1g8a9.js:1502-1542 placement
/**
 * neutralizeInboundTags：中和入站消息标签。
 */
function neutralizeInboundTags(e) {
  return getPeerTagNeutralizer_2().neutralize(e);
}
//@ chunk-e7z1g8a9.js:1542-1586 placement
/**
 * inboundTagOpenerOffsets：入站标签的起始偏移。
 */
function inboundTagOpenerOffsets(e) {
  return getPeerTagNeutralizer_2().openerOffsets(e);
}
//@ chunk-e7z1g8a9.js:1586-1624 placement
var regExp = new RegExp(`[${TAG_BRACKET_CLASSES.open}]`, "u");
//@ chunk-e7z1g8a9.js:1624-1675 placement
function hasBackslashOrEscape(e) {
  return regExp.test(e) || e.includes("\\u");
}
//@ chunk-e7z1g8a9.js:1675-1844 placement
var JSON_LIKE_START_RE = /^\s*(?:\{\s*["}]|\[\s*(?:["{[\]\d-]|true\b|false\b|null\b))/;
var JSON_ESCAPES = new Map([
  ['"', '"'],
  ["\\", "\\"],
  ["/", "/"],
  ["b", "\b"],
  ["f", "\f"],
  [
    "n",
    `
`,
  ],
  ["r", "\r"],
  ["t", "\t"],
]);
//@ chunk-e7z1g8a9.js:1844-1975 placement
function findStringEnd(e, n) {
  let r = n;
  let i = 1;
  while (i % 2 === 1) {
    r = e.indexOf('"', r + 1);
    if (r === -1) return -1;
    i = 0;
    while (e.charCodeAt(r - i - 1) === 92) i++;
  }
  return r;
}
//@ chunk-e7z1g8a9.js:1975-2129 placement
function findJsonStringSpans(e) {
  let n = [];
  let index = e.indexOf('"');
  while (index !== -1) {
    let stringEnd = findStringEnd(e, index);
    if (stringEnd === -1) {
      n.push([index + 1, e.length]);
      break;
    }
    n.push([index + 1, stringEnd]);
    index = e.indexOf('"', stringEnd + 1);
  }
  return n;
}
//@ chunk-e7z1g8a9.js:2129-2251 placement
function looksLikeJson(e) {
  if (JSON_LIKE_START_RE.test(e)) return true;
  let n = e.search(/\S/);
  let r = e[n] === '"' ? findStringEnd(e, n) : -1;
  return r !== -1 && e.slice(r + 1).trim() === "";
}
//@ chunk-e7z1g8a9.js:2251-2567 placement
/**
 * 解码 JSON 字符串字面量，同时记录每个字符的起止偏移。
 */
function decodeJsonStringWithOffsets(e, n, r) {
  let value = "";
  let c = [];
  let a = [];
  for (let f = n; f < r;) {
    let g = e[f];
    let k = 1;
    if (g === "\\" && f + 1 < r) {
      let S = JSON_ESCAPES.get(e[f + 1]);
      let sliced = e.slice(f + 2, f + 6);
      if (S !== undefined) {
        g = S;
        k = 2;
      } else if (e[f + 1] === "u" && f + 6 <= r && /^[0-9a-fA-F]{4}$/.test(sliced)) {
        g = String.fromCharCode(parseInt(sliced, 16));
        k = 6;
      }
    }
    value += g;
    c.push(f);
    a.push(f + k);
    f += k;
  }
  return {
    value,
    starts: c,
    ends: a,
  };
}
//@ chunk-e7z1g8a9.js:2567-2986 placement
/**
 * 中和 JSON 文本中字符串里的标签起始符，避免被当作标签解析。
 */
function neutralizeTagsInJson(e) {
  let n = new Map();
  for (let c of peerTagOpenerOffsets(e))
    n.set(c, {
      end: c + codePointLength(e, c),
      keepsOpener: e[c] === "<",
    });
  for (let [c, a] of findJsonStringSpans(e)) {
    if (!hasBackslashOrEscape(e.slice(c, a))) continue;
    let { value: f, starts, ends } = decodeJsonStringWithOffsets(e, c, a);
    for (let S of peerTagOpenerOffsets(f))
      n.set(starts[S], {
        end: ends[S + codePointLength(f, S) - 1],
        keepsOpener: f[S] === "<",
      });
  }
  let r = "";
  let i = 0;
  for (let key of [...n.keys()].sort((a, f) => a - f)) {
    let { end, keepsOpener } = n.get(key);
    r += e.slice(i, keepsOpener ? end : key) + (keepsOpener ? "\\\\" : "<\\\\");
    i = end;
  }
  return r + e.slice(i);
}
//@ chunk-e7z1g8a9.js:2986-3046 placement
/**
 * neutralizeTextForAgent：按需中和文本（JSON 单独处理）。
 */
function neutralizeTextForAgent(e) {
  if (!hasBackslashOrEscape(e)) return e;
  return looksLikeJson(e) ? neutralizeTagsInJson(e) : neutralizePeerTags(e);
}
//@ chunk-e7z1g8a9.js:3046-3060 placement
var MAIN = "main";
//@ chunk-e7z1g8a9.js:3060-3131 placement
/**
 * agentMessageTag：包装成 agent-message 标签。
 */
function agentMessageTag(from, message) {
  return `<${AGENT_MESSAGE} from="${escapeXmlAttr(from)}">
${normalizeAgentMessageBody(message)}
</${AGENT_MESSAGE}>`;
}
//@ chunk-e7z1g8a9.js:3131-3161 placement
/**
 * normalizeAgentMessageBody：规范化 agent 消息正文。
 */
function normalizeAgentMessageBody(e) {
  return neutralizeTextForAgent(e);
}
//@ chunk-e7z1g8a9.js:3334-3799 placement
async function authenticatePeer(e, n) {
  let r = [];
  let i;
  try {
    i = await readAllPages(
      (cursor) =>
        e.listEntries(
          {
            namespace: "session",
          },
          {
            cursor,
            skipKeyStats: true,
          },
        ),
      (c) => {
        for (let a of c) if (a.kind === "key" && a.key.namespace === "session") r.push(a.key.file);
      },
    );
  } catch (error) {
    n.onIssue?.(`failed: ${errorMessage(error)}`);
    return;
  }
  switch (i.status) {
    case "done":
      return r;
    case "error":
      n.onIssue?.(`failed: ${formatStorageError(i.error)}`);
      return;
    case "capped":
      n.onIssue?.(`truncated at ${DEFAULT_MAX_PAGES} pages; ${r.length} names seen`, "warn");
      return n.partialOnCap ? r : undefined;
  }
}
//@ chunk-e7z1g8a9.js:3799-4040 placement
/**
 * AUTH_MESSAGE_TYPE：认证消息类型名；PEER_KEY_FILE_RE：对端密钥文件名格式；PEER_KEY_TMP_FILE_RE：对端密钥临时文件名格式（同一声明共 6 个绑定）。
 */
var AUTH = "auth";
var AUTH_MESSAGE_TYPE = /^(\d+)\.[0-9a-f]{64}\.key$/;
var PEER_KEY_FILE_RE = /^(\d+)\.[0-9a-f]{64}\.key\.tmp\.[0-9a-f]+$/;
var PEER_KEY_TMP_FILE_RE = 16;
var PEER_TOKEN_LENGTH = /^[0-9a-f]{32}$/;
var PEER_TOKEN_HEX_RE = 4096;
var MAX_PEER_KEY_FILE_BYTES = DoctorLazy(() =>
  u({
    peerToken: string().regex(PEER_TOKEN_LENGTH),
    procStart: string().optional(),
    procStartFt: string().optional(),
    pidDomain: string().optional(),
  }),
);
//@ chunk-e7z1g8a9.js:4040-4078 placement
/**
 * isWindowsPlatform：是否 Windows。
 */
function isWindowsPlatform() {
  return getPlatform() === "windows";
}
//@ chunk-e7z1g8a9.js:4078-4164 placement
/**
 * createPeerTokens：生成对端与子令牌。
 */
function createPeerTokens() {
  return {
    peerToken: randomBytes(PEER_KEY_TMP_FILE_RE).toString("hex"),
    childToken: randomBytes(PEER_KEY_TMP_FILE_RE).toString("hex"),
  };
}
//@ chunk-e7z1g8a9.js:4164-4175 placement
/**
 * MAX_PEER_NOTICE_LENGTH：对端提示长度上限。
 */
var MAX_PEER_NOTICE_LENGTH = 25;
export {
  neutralizeInboundTags,
  MAIN,
  isWindowsPlatform,
  createPeerTokens,
  normalizeAgentMessageBody,
  agentMessageTag,
  neutralizeTextForAgent,
  MAX_PEER_NOTICE_LENGTH,
  authenticatePeer,
  AUTH_MESSAGE_TYPE,
  peerTagOpenerOffsets,
  neutralizePeerTags,
  inboundTagOpenerOffsets,
  PEER_TOKEN_HEX_RE,
  MAX_PEER_KEY_FILE_BYTES,
  PEER_KEY_FILE_RE,
  AUTH,
  PEER_KEY_TMP_FILE_RE,
};
