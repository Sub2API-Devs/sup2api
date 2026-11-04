/**
 * utils/peerMessageHeaders.ts
 *
 * 对端消息头（from/hop-chain）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qg0af0yq.js (26)
 * attribution: placement 26
 */
import { createHmac } from "crypto";
import { firstMeaningfulLine, clipTeammateText } from "./swarm/teammateIds.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "./sanitization.js";
import { truncateToWidth } from "./format.js";
import { CROSS_SESSION_MESSAGE } from "../constants/xml.js";
import { scrubCloseTag } from "./confusables.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-qg0af0yq.js:19143-19155 placement
/**
 * MAX_PEER_LABEL_WIDTH：对端会话标签/首行的显示宽度上限。
 */
var MAX_PEER_LABEL_WIDTH = 120;
//@ chunk-qg0af0yq.js:19155-19248 placement
/**
 * firstLineOfPeerBody：取正文首个有意义的行并截断到显示宽度。
 */
function firstLineOfPeerBody(body) {
  let line = firstMeaningfulLine(body, (rawLine) =>
    stripInvisibleChars_3(rawLine, " ", {
      keepEmojiJoiners: true,
    }),
  );
  return line === "" ? "" : truncateToWidth(line, MAX_PEER_LABEL_WIDTH);
}
//@ chunk-qg0af0yq.js:19248-19293 placement
var PEER_FROM_MODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PEER_FROM_MODE_SET;
deferInit("chunk-qg0af0yq.js:19248", () => {
  PEER_FROM_MODES = ["bypass", "prompting"];
  PEER_FROM_MODE_SET = new Set(PEER_FROM_MODES);
});
//@ chunk-qg0af0yq.js:19293-19326 placement
/**
 * isPeerFromMode：判断字符串是否是合法的 from-mode。
 */
function isPeerFromMode(mode) {
  return PEER_FROM_MODE_SET.has(mode);
}
//@ chunk-qg0af0yq.js:19326-19499 placement
function percentEncodeHeaderValue(value) {
  let textEncoder = new TextEncoder();
  return value.replace(/[^A-Za-z0-9:_/.\\-]/gu, (character) =>
    Array.from(
      textEncoder.encode(character),
      (byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`,
    ).join(""),
  );
}
//@ chunk-qg0af0yq.js:19499-19539 placement
/**
 * bridgeAddressFromToken：把 bridge 访问令牌拼成 bridge: 前缀的地址。
 */
function bridgeAddressFromToken(token) {
  return `bridge:${percentEncodeHeaderValue(token)}`;
}
//@ chunk-qg0af0yq.js:19539-19575 placement
/**
 * udsAddressFromPath：把套接字路径拼成 uds: 前缀的地址。
 */
function udsAddressFromPath(socketPath) {
  return `uds:${percentEncodeHeaderValue(socketPath)}`;
}
//@ chunk-qg0af0yq.js:19575-19638 placement
/**
 * decodeHeaderValue：容错解码 URL 编码的消息头值。
 */
function decodeHeaderValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
//@ chunk-qg0af0yq.js:19638-19682 placement
/**
 * PEER_SESSION_ID_PATTERN：from-session 的合法字符与长度；MAX_HOP_CHAIN_LENGTH：跳链最多保留的跳数；HOP_ID_HEX_LENGTH：单跳 id 的十六进制长度（HMAC 截断长度）（同一声明共 3 个绑定）。
 */
var PEER_SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
var MAX_HOP_CHAIN_LENGTH = 32;
var HOP_ID_HEX_LENGTH = 24;
//@ chunk-qg0af0yq.js:19682-19758 placement
/**
 * hopIdHmac：用会话密钥对跳 id 做 HMAC 并截断。
 */
function hopIdHmac(hopId, randomIdSecret) {
  return createHmac("sha256", randomIdSecret).update(hopId).digest("hex").slice(0, HOP_ID_HEX_LENGTH);
}
//@ chunk-qg0af0yq.js:19758-19909 placement
/**
 * 对端消息头的字符集、跳链 id 与跳链格式、值长度上限及对应正则。
 */
var HEADER_VALUE_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOP_ID_PATTERN;
var HOP_CHAIN_PATTERN;
var HOP_CHAIN_REGEX;
var MAX_HEADER_VALUE_LENGTH;
var HEADER_VALUE_REGEX;
deferInit("chunk-qg0af0yq.js:19758", () => {
  HEADER_VALUE_CHARS = "A-Za-z0-9%:_/.\\\\-";
  HOP_ID_PATTERN = `[0-9a-f]{${HOP_ID_HEX_LENGTH}}`;
  HOP_CHAIN_PATTERN = `${HOP_ID_PATTERN}(?:,${HOP_ID_PATTERN}){0,${MAX_HOP_CHAIN_LENGTH - 1}}`;
  HOP_CHAIN_REGEX = new RegExp(`^${HOP_CHAIN_PATTERN}$`);
  MAX_HEADER_VALUE_LENGTH = 300;
  HEADER_VALUE_REGEX = new RegExp(`^[${HEADER_VALUE_CHARS}]{1,${MAX_HEADER_VALUE_LENGTH}}$`);
});
//@ chunk-qg0af0yq.js:19909-19943 placement
/**
 * isValidHeaderValue：判断消息头值是否符合字符集与长度上限。
 */
function isValidHeaderValue(from) {
  return HEADER_VALUE_REGEX.test(from);
}
//@ chunk-qg0af0yq.js:19943-20077 placement
/**
 * 在跳链后追加本节点并保留最近若干跳。
 */
function extendHopChain(hopChain, hopId) {
  if (hopChain === undefined) return;
  let chain = [...hopChain];
  if (hopId) chain.push(hopId);
  if (chain.length === 0) return;
  return chain.length > MAX_HOP_CHAIN_LENGTH ? chain.slice(chain.length - MAX_HOP_CHAIN_LENGTH) : chain;
}
//@ chunk-qg0af0yq.js:20077-20510 placement
function formatPeerMessageHeader(from, fromName, fromSession, hopChain, fromMode, fromPlugin) {
  let attributes = [];
  if (from) attributes.push(`from="${from}"`);
  if (fromSession && PEER_SESSION_ID_PATTERN.test(fromSession))
    attributes.push(`from-session="${fromSession}"`);
  if (hopChain !== undefined && hopChain.length > 0) {
    let joined = hopChain.join(",");
    if (HOP_CHAIN_REGEX.test(joined)) attributes.push(`hop-chain="${joined}"`);
  }
  let safeName = fromName === undefined ? undefined : clipTeammateText(fromName.replace(/["<>]/g, ""));
  if (safeName) attributes.push(`from-name="${safeName}"`);
  if (fromMode) attributes.push(`from-mode="${fromMode}"`);
  let safePlugin = fromPlugin === undefined ? undefined : clipTeammateText(fromPlugin.replace(/["<>]/g, ""));
  if (safePlugin) attributes.push(`from-plugin="${safePlugin}"`);
  return attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
}
//@ chunk-qg0af0yq.js:20510-20555 placement
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg0af0yq.js:20510", () => {
  regExp_2 = new RegExp(`^<${CROSS_SESSION_MESSAGE} from="([^"]+)"`);
});
//@ chunk-qg0af0yq.js:20555-20647 placement
/**
 * wrapPeerMessage：把正文包成 cross-session-message 标签并带上消息头。
 */
function wrapPeerMessage(from, fromName, body, fromSession, hopChain, fromMode, fromPlugin) {
  let headerAttributes = formatPeerMessageHeader(from, fromName, fromSession, hopChain, fromMode, fromPlugin);
  return `<${CROSS_SESSION_MESSAGE}${headerAttributes}>
${scrubCloseTag(CROSS_SESSION_MESSAGE, body)}
</${CROSS_SESSION_MESSAGE}>`;
}
//@ chunk-qg0af0yq.js:20647-21343 placement
function parsePeerMessageHeader(text) {
  {
    if (typeof text !== "string") return;
    let replaced = PEER_SESSION_ID_PATTERN.source.replace(/^\^|\$$/g, "");
    let replaced_2 = HOP_CHAIN_REGEX.source.replace(/^\^|\$$/g, "");
    let input = text;
    let match = input.match(
      new RegExp(
        `^<${CROSS_SESSION_MESSAGE}(?: from="([${HEADER_VALUE_CHARS}]+)")?(?: from-session="(${replaced})")?(?: hop-chain="(${replaced_2})")?(?: from-name="([^"<>\\n\\r]+)")?(?: from-mode="(${PEER_FROM_MODES.join("|")})")?(?: from-plugin="([^"<>\\n\\r]+)")?>\\n([\\s\\S]*)\\n</${CROSS_SESSION_MESSAGE}>$`,
      ),
    );
    if (!match) return;
    let hopChain = match[3] !== undefined ? match[3].split(",") : undefined;
    let fromMode = match[5];
    if (wrapPeerMessage(match[1], match[4], match[7] ?? "", match[2], hopChain, fromMode, match[6]) !== input)
      return;
    return {
      ...(match[1] !== undefined && {
        from: match[1],
      }),
      ...(match[2] !== undefined && {
        fromSession: match[2],
      }),
      ...(hopChain !== undefined && {
        hopChain,
      }),
      ...(match[4] !== undefined && {
        fromName: match[4],
      }),
      ...(fromMode !== undefined && {
        fromMode,
      }),
      ...(match[6] !== undefined && {
        fromPlugin: match[6],
      }),
      body: match[7] ?? "",
    };
  }
  return;
}
//@ chunk-qg0af0yq.js:21343-21488 placement
/**
 * 去掉对端消息头中的跳链。
 */
function dropHopChain(text) {
  let peerMessageHeader = parsePeerMessageHeader(text);
  if (!peerMessageHeader || peerMessageHeader.hopChain === undefined) return text;
  return wrapPeerMessage(
    peerMessageHeader.from,
    peerMessageHeader.fromName,
    peerMessageHeader.body,
    peerMessageHeader.fromSession,
    undefined,
    peerMessageHeader.fromMode,
    peerMessageHeader.fromPlugin,
  );
}
//@ chunk-qg0af0yq.js:21488-21653 placement
/**
 * 给对端消息头标注来源插件（未标注时）。
 */
function tagPeerMessagePlugin(text, plugin) {
  if (plugin === undefined) return text;
  let peerMessageHeader = parsePeerMessageHeader(text);
  if (!peerMessageHeader || peerMessageHeader.fromPlugin !== undefined) return text;
  return wrapPeerMessage(
    peerMessageHeader.from,
    peerMessageHeader.fromName,
    peerMessageHeader.body,
    peerMessageHeader.fromSession,
    peerMessageHeader.hopChain,
    peerMessageHeader.fromMode,
    plugin,
  );
}
//@ chunk-qg0af0yq.js:21653-21735 placement
/**
 * stripPeerMessageBody：发送者与接收者相同时去掉正文，避免回显。
 */
function stripPeerMessageBody(entry, keepBody, dropBody) {
  if (entry.body === undefined || keepBody === dropBody) return entry;
  let { body, ...rest } = entry;
  return rest;
}
//@ chunk-qg0af0yq.js:21735-21994 placement
/**
 * 从对端消息头提取发送者名、来源会话、跳链、模式与正文。
 */
function peerMessageInfo(text) {
  let peerMessageHeader = parsePeerMessageHeader(text);
  if (!peerMessageHeader) return {};
  let name = peerMessageHeader.fromName ? clipTeammateText(peerMessageHeader.fromName) : "";
  return {
    ...(name && {
      name,
    }),
    ...(peerMessageHeader.fromSession !== undefined && {
      fromSession: peerMessageHeader.fromSession,
    }),
    ...(peerMessageHeader.hopChain !== undefined && {
      hopChain: peerMessageHeader.hopChain,
    }),
    ...(peerMessageHeader.fromMode !== undefined && {
      fromMode: peerMessageHeader.fromMode,
    }),
    body: peerMessageHeader.body,
  };
}
//@ chunk-qg0af0yq.js:21994-22184 placement
/**
 * 找到最近一条真实用户消息，若来自对端则返回其跳链。
 */
function lastPeerHopChain(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message.type !== "user" || message.toolUseResult || message.isCompactSummary) continue;
    return message.origin?.kind === "peer" ? (message.origin.hopChain ?? []) : undefined;
  }
  return;
}
//@ chunk-qg0af0yq.js:22184-22240 placement
var regExp_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg0af0yq.js:22184", () => {
  regExp_3 = new RegExp(`^(?:uds|bridge|did):[${HEADER_VALUE_CHARS}]{1,200}$`);
});
//@ chunk-qg0af0yq.js:22240-22274 placement
/**
 * isPeerAddress：判断字符串是否是 uds:/bridge:/did: 形式的对等地址。
 */
function isPeerAddress(address) {
  return regExp_3.test(address);
}
//@ chunk-qg0af0yq.js:22274-22349 placement
/**
 * UNIX_SOCKET_PATH_PATTERN：匹配以 / 结尾的 .sock 绝对路径；NAMED_PIPE_PATH_PATTERN：匹配 \\?\pipe\ 形式的 Windows 命名管道；UNIX_SOCKET_PREFIX_PATTERN：匹配 .sock 路径前缀（不要求结尾）（同一声明共 3 个绑定）。
 */
var UNIX_SOCKET_PATH_PATTERN = /^\/\S*\.sock$/;
var NAMED_PIPE_PATH_PATTERN = /^[\\/]{2}[.?][\\/]pipe[\\/]/i;
var UNIX_SOCKET_PREFIX_PATTERN = /^\/\S*\.sock/;
//@ chunk-qg0af0yq.js:22349-22383 placement
/**
 * isUnixSocketPath：判断是否是 unix 套接字路径。
 */
function isUnixSocketPath(path) {
  return UNIX_SOCKET_PREFIX_PATTERN.test(path);
}
export {
  isValidHeaderValue,
  stripPeerMessageBody,
  peerMessageInfo,
  isPeerAddress,
  udsAddressFromPath,
  isPeerFromMode,
  dropHopChain,
  MAX_PEER_LABEL_WIDTH,
  MAX_HEADER_VALUE_LENGTH,
  lastPeerHopChain,
  firstLineOfPeerBody,
  hopIdHmac,
  bridgeAddressFromToken,
  MAX_HOP_CHAIN_LENGTH,
  wrapPeerMessage,
  extendHopChain,
  regExp_2,
  tagPeerMessagePlugin,
  isUnixSocketPath,
  decodeHeaderValue,
  UNIX_SOCKET_PATH_PATTERN,
  NAMED_PIPE_PATH_PATTERN,
};
