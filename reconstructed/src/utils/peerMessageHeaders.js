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
import { firstMeaningfulLine, Hb } from "./swarm/teammateIds.js";
import { stripInvisibleChars as stripInvisibleChars_2 } from "./sanitization.js";
import { truncateToWidth } from "./format.js";
import { CROSS_SESSION_MESSAGE } from "../constants/xml.js";
import { jdt } from "./confusables.js";

//@ chunk-qg0af0yq.js:19143-19155 placement
var Sds = 120;
//@ chunk-qg0af0yq.js:19155-19248 placement
function sPn(e) {
  let n = firstMeaningfulLine(e, (t) => stripInvisibleChars_2(t, " ", { keepEmojiJoiners: !0 }));
  return n === "" ? "" : truncateToWidth(n, Sds);
}
//@ chunk-qg0af0yq.js:19248-19293 placement
var Oe = ["bypass", "prompting"],
  Hn = new Set(Oe);
//@ chunk-qg0af0yq.js:19293-19326 placement
function FAi(e) {
  return Hn.has(e);
}
//@ chunk-qg0af0yq.js:19326-19499 placement
function percentEncodeHeaderValue(e) {
  let textEncoder = new TextEncoder();
  return e.replace(/[^A-Za-z0-9:_/.\\-]/gu, (t) =>
    Array.from(textEncoder.encode(t), (r) => `%${r.toString(16).toUpperCase().padStart(2, "0")}`).join(""),
  );
}
//@ chunk-qg0af0yq.js:19499-19539 placement
function DBe(e) {
  return `bridge:${percentEncodeHeaderValue(e)}`;
}
//@ chunk-qg0af0yq.js:19539-19575 placement
function u8(e) {
  return `uds:${percentEncodeHeaderValue(e)}`;
}
//@ chunk-qg0af0yq.js:19575-19638 placement
function q(e) {
  try {
    return decodeURIComponent(e);
  } catch {
    return e;
  }
}
//@ chunk-qg0af0yq.js:19638-19682 placement
var Me = /^[A-Za-z0-9_-]{1,80}$/,
  iPn = 32,
  De = 24;
//@ chunk-qg0af0yq.js:19682-19758 placement
function UAi(e, n) {
  return createHmac("sha256", n).update(e).digest("hex").slice(0, De);
}
/**
 * 对端消息头的字符集、跳链 id 与跳链格式、值长度上限及对应正则。
 */
//@ chunk-qg0af0yq.js:19758-19909 placement
var HEADER_VALUE_CHARS = "A-Za-z0-9%:_/.\\\\-",
  HOP_ID_PATTERN = `[0-9a-f]{${De}}`,
  HOP_CHAIN_PATTERN = `${HOP_ID_PATTERN}(?:,${HOP_ID_PATTERN}){0,${iPn - 1}}`,
  HOP_CHAIN_REGEX = new RegExp(`^${HOP_CHAIN_PATTERN}$`),
  MAX_HEADER_VALUE_LENGTH = 300,
  HEADER_VALUE_REGEX = new RegExp(`^[${HEADER_VALUE_CHARS}]{1,${MAX_HEADER_VALUE_LENGTH}}$`);
//@ chunk-qg0af0yq.js:19909-19943 placement
function BAi(e) {
  return HEADER_VALUE_REGEX.test(e);
}
/**
 * 在跳链后追加本节点并保留最近若干跳。
 */
//@ chunk-qg0af0yq.js:19943-20077 placement
function extendHopChain(e, n) {
  if (e === void 0) return;
  let t = [...e];
  if (n) t.push(n);
  if (t.length === 0) return;
  return t.length > iPn ? t.slice(t.length - iPn) : t;
}
//@ chunk-qg0af0yq.js:20077-20510 placement
function formatPeerMessageHeader(e, n, t, r, i, s) {
  let o = [];
  if (e) o.push(`from="${e}"`);
  if (t && Me.test(t)) o.push(`from-session="${t}"`);
  if (r !== void 0 && r.length > 0) {
    let joined = r.join(",");
    if (HOP_CHAIN_REGEX.test(joined)) o.push(`hop-chain="${joined}"`);
  }
  let a = n === void 0 ? void 0 : Hb(n.replace(/["<>]/g, ""));
  if (a) o.push(`from-name="${a}"`);
  if (i) o.push(`from-mode="${i}"`);
  let l = s === void 0 ? void 0 : Hb(s.replace(/["<>]/g, ""));
  if (l) o.push(`from-plugin="${l}"`);
  return o.length > 0 ? ` ${o.join(" ")}` : "";
}
//@ chunk-qg0af0yq.js:20510-20555 placement
var regExp_2 = new RegExp(`^<${CROSS_SESSION_MESSAGE} from="([^"]+)"`);
//@ chunk-qg0af0yq.js:20555-20647 placement
function hIt(e, n, t, r, i, s, o) {
  let a = formatPeerMessageHeader(e, n, r, i, s, o);
  return `<${CROSS_SESSION_MESSAGE}${a}>
${jdt(CROSS_SESSION_MESSAGE, t)}
</${CROSS_SESSION_MESSAGE}>`;
}
//@ chunk-qg0af0yq.js:20647-21343 placement
function parsePeerMessageHeader(e) {
  {
    if (typeof e !== "string") return;
    let replaced = Me.source.replace(/^\^|\$$/g, ""),
      replaced_2 = HOP_CHAIN_REGEX.source.replace(/^\^|\$$/g, ""),
      r = e,
      match = r.match(
        new RegExp(
          `^<${CROSS_SESSION_MESSAGE}(?: from="([${HEADER_VALUE_CHARS}]+)")?(?: from-session="(${replaced})")?(?: hop-chain="(${replaced_2})")?(?: from-name="([^"<>\\n\\r]+)")?(?: from-mode="(${Oe.join("|")})")?(?: from-plugin="([^"<>\\n\\r]+)")?>\\n([\\s\\S]*)\\n</${CROSS_SESSION_MESSAGE}>$`,
        ),
      );
    if (!match) return;
    let s = match[3] !== void 0 ? match[3].split(",") : void 0,
      o = match[5];
    if (hIt(match[1], match[4], match[7] ?? "", match[2], s, o, match[6]) !== r) return;
    return {
      ...(match[1] !== void 0 && { from: match[1] }),
      ...(match[2] !== void 0 && { fromSession: match[2] }),
      ...(s !== void 0 && { hopChain: s }),
      ...(match[4] !== void 0 && { fromName: match[4] }),
      ...(o !== void 0 && { fromMode: o }),
      ...(match[6] !== void 0 && { fromPlugin: match[6] }),
      body: match[7] ?? "",
    };
  }
  return;
}
/**
 * 去掉对端消息头中的跳链。
 */
//@ chunk-qg0af0yq.js:21343-21488 placement
function dropHopChain(e) {
  let n = parsePeerMessageHeader(e);
  if (!n || n.hopChain === void 0) return e;
  return hIt(n.from, n.fromName, n.body, n.fromSession, void 0, n.fromMode, n.fromPlugin);
}
/**
 * 给对端消息头标注来源插件（未标注时）。
 */
//@ chunk-qg0af0yq.js:21488-21653 placement
function tagPeerMessagePlugin(e, n) {
  if (n === void 0) return e;
  let t = parsePeerMessageHeader(e);
  if (!t || t.fromPlugin !== void 0) return e;
  return hIt(t.from, t.fromName, t.body, t.fromSession, t.hopChain, t.fromMode, n);
}
//@ chunk-qg0af0yq.js:21653-21735 placement
function SQ(e, n, t) {
  if (e.body === void 0 || n === t) return e;
  let { body: body, ...i } = e;
  return i;
}
/**
 * 从对端消息头提取发送者名、来源会话、跳链、模式与正文。
 */
//@ chunk-qg0af0yq.js:21735-21994 placement
function peerMessageInfo(e) {
  let n = parsePeerMessageHeader(e);
  if (!n) return {};
  let t = n.fromName ? Hb(n.fromName) : "";
  return {
    ...(t && { name: t }),
    ...(n.fromSession !== void 0 && { fromSession: n.fromSession }),
    ...(n.hopChain !== void 0 && { hopChain: n.hopChain }),
    ...(n.fromMode !== void 0 && { fromMode: n.fromMode }),
    body: n.body,
  };
}
/**
 * 找到最近一条真实用户消息，若来自对端则返回其跳链。
 */
//@ chunk-qg0af0yq.js:21994-22184 placement
function lastPeerHopChain(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let t = e[n];
    if (t.type !== "user" || t.toolUseResult || t.isCompactSummary) continue;
    return t.origin?.kind === "peer" ? (t.origin.hopChain ?? []) : void 0;
  }
  return;
}
//@ chunk-qg0af0yq.js:22184-22240 placement
var regExp_3 = new RegExp(`^(?:uds|bridge|did):[${HEADER_VALUE_CHARS}]{1,200}$`);
//@ chunk-qg0af0yq.js:22240-22274 placement
function $ge(e) {
  return regExp_3.test(e);
}
//@ chunk-qg0af0yq.js:22274-22349 placement
var jn = /^\/\S*\.sock$/,
  Vn = /^[\\/]{2}[.?][\\/]pipe[\\/]/i,
  Zn = /^\/\S*\.sock/;
//@ chunk-qg0af0yq.js:22349-22383 placement
function vds(e) {
  return Zn.test(e);
}

export {
  BAi,
  SQ,
  peerMessageInfo,
  $ge,
  u8,
  FAi,
  dropHopChain,
  Sds,
  MAX_HEADER_VALUE_LENGTH,
  lastPeerHopChain,
  sPn,
  UAi,
  DBe,
  iPn,
  hIt,
  extendHopChain,
  regExp_2,
  tagPeerMessagePlugin,
  vds,
  q,
  jn,
  Vn,
};
