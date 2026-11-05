/**
 * utils/sessionPeers.ts
 *
 * 会话对端认证（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p21mddyh.js (25)
 * attribution: placement 24, layout 1
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
import { objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "./platform.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-p21mddyh.js:1190-1241 placement
var PEER_MESSAGE_TAGS; // deferred: uses AGENT_NOTIFICATION_PREFIX (../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
var INBOUND_MESSAGE_TAG_LIST;
var peerTagNeutralizerCache;
deferInit("chunk-p21mddyh.js:1190", () => {
  PEER_MESSAGE_TAGS = [CROSS_SESSION_MESSAGE, TEAMMATE_MESSAGE, AGENT_MESSAGE];
  INBOUND_MESSAGE_TAG_LIST = [...INBOUND_MESSAGE_TAGS, "system-reminder"];
});
//@ chunk-p21mddyh.js:1241-1284 placement
function getPeerTagNeutralizer() {
  peerTagNeutralizerCache ??= createTagNeutralizer([
    {
      tags: PEER_MESSAGE_TAGS,
    },
  ]);
  return peerTagNeutralizerCache;
}
//@ chunk-p21mddyh.js:1284-1325 placement
/**
 * neutralizePeerTags：中和文本里的对端标签。
 */
function neutralizePeerTags(text) {
  return getPeerTagNeutralizer().neutralize(text);
}
//@ chunk-p21mddyh.js:1325-1369 placement
/**
 * peerTagOpenerOffsets：对端标签的起始偏移。
 */
function peerTagOpenerOffsets(text) {
  return getPeerTagNeutralizer().openerOffsets(text);
}
//@ chunk-p21mddyh.js:1369-1375 placement
var inboundTagNeutralizerCache;
//@ chunk-p21mddyh.js:1375-1504 placement
function getPeerTagNeutralizer_2() {
  inboundTagNeutralizerCache ??= createTagNeutralizer([
    {
      tags: RESERVED_XML_TAGS.filter((tag) => tag !== CHANNEL),
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
//@ chunk-p21mddyh.js:1504-1544 placement
/**
 * neutralizeInboundTags：中和入站消息标签。
 */
function neutralizeInboundTags(text) {
  return getPeerTagNeutralizer_2().neutralize(text);
}
//@ chunk-p21mddyh.js:1544-1588 placement
/**
 * inboundTagOpenerOffsets：入站标签的起始偏移。
 */
function inboundTagOpenerOffsets(text) {
  return getPeerTagNeutralizer_2().openerOffsets(text);
}
//@ chunk-p21mddyh.js:1588-1626 placement
var regExp; // deferred: uses INVISIBLE_CHAR_CLASSES (./confusables.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p21mddyh.js:1588", () => {
  regExp = new RegExp(`[${TAG_BRACKET_CLASSES.open}]`, "u");
});
//@ chunk-p21mddyh.js:1626-1677 placement
function hasBackslashOrEscape(text) {
  return regExp.test(text) || text.includes("\\u");
}
//@ chunk-p21mddyh.js:1677-1846 placement
var JSON_LIKE_START_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var JSON_ESCAPES;
deferInit("chunk-p21mddyh.js:1677", () => {
  JSON_LIKE_START_RE = /^\s*(?:\{\s*["}]|\[\s*(?:["{[\]\d-]|true\b|false\b|null\b))/;
  JSON_ESCAPES = new Map([
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
});
//@ chunk-p21mddyh.js:1846-1977 placement
function findStringEnd(text, index) {
  let pos = index;
  let backslashes = 1;
  while (backslashes % 2 === 1) {
    pos = text.indexOf('"', pos + 1);
    if (pos === -1) return -1;
    backslashes = 0;
    while (text.charCodeAt(pos - backslashes - 1) === 92) backslashes++;
  }
  return pos;
}
//@ chunk-p21mddyh.js:1977-2131 placement
function findJsonStringSpans(text) {
  let spans = [];
  let index = text.indexOf('"');
  while (index !== -1) {
    let stringEnd = findStringEnd(text, index);
    if (stringEnd === -1) {
      spans.push([index + 1, text.length]);
      break;
    }
    spans.push([index + 1, stringEnd]);
    index = text.indexOf('"', stringEnd + 1);
  }
  return spans;
}
//@ chunk-p21mddyh.js:2131-2253 placement
function looksLikeJson(text) {
  if (JSON_LIKE_START_RE.test(text)) return true;
  let index = text.search(/\S/);
  let end = text[index] === '"' ? findStringEnd(text, index) : -1;
  return end !== -1 && text.slice(end + 1).trim() === "";
}
//@ chunk-p21mddyh.js:2253-2569 placement
/**
 * 解码 JSON 字符串字面量，同时记录每个字符的起止偏移。
 */
function decodeJsonStringWithOffsets(text, start, end) {
  let value = "";
  let starts = [];
  let ends = [];
  for (let index = start; index < end;) {
    let char = text[index];
    let width = 1;
    if (char === "\\" && index + 1 < end) {
      let escaped = JSON_ESCAPES.get(text[index + 1]);
      let sliced = text.slice(index + 2, index + 6);
      if (escaped !== undefined) {
        char = escaped;
        width = 2;
      } else if (text[index + 1] === "u" && index + 6 <= end && /^[0-9a-fA-F]{4}$/.test(sliced)) {
        char = String.fromCharCode(parseInt(sliced, 16));
        width = 6;
      }
    }
    value += char;
    starts.push(index);
    ends.push(index + width);
    index += width;
  }
  return {
    value,
    starts,
    ends,
  };
}
//@ chunk-p21mddyh.js:2569-2988 placement
/**
 * 中和 JSON 文本中字符串里的标签起始符，避免被当作标签解析。
 */
function neutralizeTagsInJson(text) {
  let replacements = new Map();
  for (let offset of peerTagOpenerOffsets(text))
    replacements.set(offset, {
      end: offset + codePointLength(text, offset),
      keepsOpener: text[offset] === "<",
    });
  for (let [start, end] of findJsonStringSpans(text)) {
    if (!hasBackslashOrEscape(text.slice(start, end))) continue;
    let { value: decoded, starts, ends } = decodeJsonStringWithOffsets(text, start, end);
    for (let offset of peerTagOpenerOffsets(decoded))
      replacements.set(starts[offset], {
        end: ends[offset + codePointLength(decoded, offset) - 1],
        keepsOpener: decoded[offset] === "<",
      });
  }
  let result = "";
  let cursor = 0;
  for (let key of [...replacements.keys()].sort((startIndex, b) => startIndex - b)) {
    let { end, keepsOpener } = replacements.get(key);
    result += text.slice(cursor, keepsOpener ? end : key) + (keepsOpener ? "\\\\" : "<\\\\");
    cursor = end;
  }
  return result + text.slice(cursor);
}
//@ chunk-p21mddyh.js:2988-3048 placement
/**
 * neutralizeTextForAgent：按需中和文本（JSON 单独处理）。
 */
function neutralizeTextForAgent(text) {
  if (!hasBackslashOrEscape(text)) return text;
  return looksLikeJson(text) ? neutralizeTagsInJson(text) : neutralizePeerTags(text);
}
//@ chunk-p21mddyh.js:3048-3062 placement
var MAIN = "main";
//@ chunk-p21mddyh.js:3062-3133 layout
function agentMessageTag(from, body) {
  return `<${AGENT_MESSAGE} from="${escapeXmlAttr(from)}">
${normalizeAgentMessageBody(body)}
</${AGENT_MESSAGE}>`;
}
//@ chunk-p21mddyh.js:3133-3163 placement
/**
 * normalizeAgentMessageBody：规范化 agent 消息正文。
 */
function normalizeAgentMessageBody(text) {
  return neutralizeTextForAgent(text);
}
//@ chunk-p21mddyh.js:3336-3801 placement
async function authenticatePeer(store, options) {
  let files = [];
  let pageResult;
  try {
    pageResult = await readAllPages(
      (cursor) =>
        store.listEntries(
          {
            namespace: "session",
          },
          {
            cursor,
            skipKeyStats: true,
          },
        ),
      (items) => {
        for (let item of items)
          if (item.kind === "key" && item.key.namespace === "session") files.push(item.key.file);
      },
    );
  } catch (error) {
    options.onIssue?.(`failed: ${errorMessage(error)}`);
    return;
  }
  switch (pageResult.status) {
    case "done":
      return files;
    case "error":
      options.onIssue?.(`failed: ${formatStorageError(pageResult.error)}`);
      return;
    case "capped":
      options.onIssue?.(`truncated at ${DEFAULT_MAX_PAGES} pages; ${files.length} names seen`, "warn");
      return options.partialOnCap ? files : undefined;
  }
}
//@ chunk-p21mddyh.js:3801-4042 placement
/**
 * 对端密钥文件的常量组：J 是认证消息类型名 auth；Ihr 是密钥文件名正则；he 是临时密钥文件名（.tmp.<hex>）正则；v 是令牌字节数 16；be 是令牌十六进制正则；x 是密钥文件读取上限 4096；Q 是密钥文件 schema。
 */
var AUTH; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PEER_KEY_FILE_RE;
var PEER_KEY_TMP_FILE_RE;
var PEER_TOKEN_BYTES;
var PEER_TOKEN_HEX_RE;
var MAX_PEER_KEY_FILE_BYTES;
var peerKeyFileSchema;
deferInit("chunk-p21mddyh.js:3801", () => {
  AUTH = "auth";
  PEER_KEY_FILE_RE = /^(\d+)\.[0-9a-f]{64}\.key$/;
  PEER_KEY_TMP_FILE_RE = /^(\d+)\.[0-9a-f]{64}\.key\.tmp\.[0-9a-f]+$/;
  PEER_TOKEN_BYTES = 16;
  PEER_TOKEN_HEX_RE = /^[0-9a-f]{32}$/;
  MAX_PEER_KEY_FILE_BYTES = 4096;
  peerKeyFileSchema = DoctorLazy(() =>
    objectSchema({
      peerToken: stringSchema().regex(PEER_TOKEN_HEX_RE),
      procStart: stringSchema().optional(),
      procStartFt: stringSchema().optional(),
      pidDomain: stringSchema().optional(),
    }),
  );
});
//@ chunk-p21mddyh.js:4042-4080 placement
/**
 * isWindowsPlatform：是否 Windows。
 */
function isWindowsPlatform() {
  return getPlatform() === "windows";
}
//@ chunk-p21mddyh.js:4080-4166 placement
/**
 * createPeerTokens：生成对端与子令牌。
 */
function createPeerTokens() {
  return {
    peerToken: randomBytes(PEER_TOKEN_BYTES).toString("hex"),
    childToken: randomBytes(PEER_TOKEN_BYTES).toString("hex"),
  };
}
//@ chunk-p21mddyh.js:4166-4177 placement
/**
 * MAX_PEER_NOTICE_LENGTH：对端提示长度上限。
 */
var MAX_PEER_NOTICE_LENGTH = 25;
export {
  MAIN,
  neutralizeInboundTags,
  neutralizeTextForAgent,
  authenticatePeer,
  PEER_KEY_FILE_RE,
  MAX_PEER_NOTICE_LENGTH,
  inboundTagOpenerOffsets,
  agentMessageTag,
  normalizeAgentMessageBody,
  peerTagOpenerOffsets,
  neutralizePeerTags,
  isWindowsPlatform,
  createPeerTokens,
  MAX_PEER_KEY_FILE_BYTES,
  peerKeyFileSchema,
  PEER_KEY_TMP_FILE_RE,
  AUTH,
  PEER_TOKEN_BYTES,
};
