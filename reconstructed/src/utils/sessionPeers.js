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
import { createTagNeutralizer, channelSourceAttrPattern, UK, codePointLength } from "./confusables.js";
import { escapeXmlAttr } from "./xml.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { errorMessage } from "./errors.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o } from "../../vendor/zod/v4/classic/schemas.js";
import { getPlatform } from "./platform.js";

//@ chunk-e7z1g8a9.js:1189-1240 placement
var oe = [CROSS_SESSION_MESSAGE, TEAMMATE_MESSAGE, AGENT_MESSAGE],
  Pe = [...INBOUND_MESSAGE_TAGS, "system-reminder"],
  G;
//@ chunk-e7z1g8a9.js:1240-1283 placement
function D() {
  return ((G ??= createTagNeutralizer([{ tags: oe }])), G);
}
//@ chunk-e7z1g8a9.js:1283-1324 placement
function iIt(e) {
  return D().neutralize(e);
}
//@ chunk-e7z1g8a9.js:1324-1368 placement
function $oo(e) {
  return D().openerOffsets(e);
}
//@ chunk-e7z1g8a9.js:1368-1374 placement
var B;
//@ chunk-e7z1g8a9.js:1374-1502 placement
function getPeerTagNeutralizer() {
  return (
    (B ??= createTagNeutralizer([
      { tags: RESERVED_XML_TAGS.filter((e) => e !== CHANNEL) },
      { tags: [CHANNEL], tail: channelSourceAttrPattern },
      { tags: ["antml"], tail: ({ colon: colon }) => `[${colon}]` },
    ])),
    B
  );
}
//@ chunk-e7z1g8a9.js:1502-1542 placement
function l8(e) {
  return getPeerTagNeutralizer().neutralize(e);
}
//@ chunk-e7z1g8a9.js:1542-1586 placement
function TAi(e) {
  return getPeerTagNeutralizer().openerOffsets(e);
}
//@ chunk-e7z1g8a9.js:1586-1624 placement
var regExp = new RegExp(`[${UK.open}]`, "u");
//@ chunk-e7z1g8a9.js:1624-1675 placement
function U(e) {
  return regExp.test(e) || e.includes("\\u");
}
//@ chunk-e7z1g8a9.js:1675-1844 placement
var JSON_LIKE_START_RE = /^\s*(?:\{\s*["}]|\[\s*(?:["{[\]\d-]|true\b|false\b|null\b))/,
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
//@ chunk-e7z1g8a9.js:1844-1975 placement
function findStringEnd(e, n) {
  let r = n,
    i = 1;
  while (i % 2 === 1) {
    if (((r = e.indexOf('"', r + 1)), r === -1)) return -1;
    i = 0;
    while (e.charCodeAt(r - i - 1) === 92) i++;
  }
  return r;
}
//@ chunk-e7z1g8a9.js:1975-2129 placement
function findJsonStringSpans(e) {
  let n = [],
    index = e.indexOf('"');
  while (index !== -1) {
    let i = findStringEnd(e, index);
    if (i === -1) {
      n.push([index + 1, e.length]);
      break;
    }
    (n.push([index + 1, i]), (index = e.indexOf('"', i + 1)));
  }
  return n;
}
//@ chunk-e7z1g8a9.js:2129-2251 placement
function looksLikeJson(e) {
  if (JSON_LIKE_START_RE.test(e)) return !0;
  let search = e.search(/\S/),
    r = e[search] === '"' ? findStringEnd(e, search) : -1;
  return r !== -1 && e.slice(r + 1).trim() === "";
}
/**
 * 解码 JSON 字符串字面量，同时记录每个字符的起止偏移。
 */
//@ chunk-e7z1g8a9.js:2251-2567 placement
function decodeJsonStringWithOffsets(e, n, r) {
  let i = "",
    c = [],
    a = [];
  for (let f = n; f < r;) {
    let g = e[f],
      k = 1;
    if (g === "\\" && f + 1 < r) {
      let S = JSON_ESCAPES.get(e[f + 1]),
        sliced = e.slice(f + 2, f + 6);
      if (S !== void 0) ((g = S), (k = 2));
      else if (e[f + 1] === "u" && f + 6 <= r && /^[0-9a-fA-F]{4}$/.test(sliced))
        ((g = String.fromCharCode(parseInt(sliced, 16))), (k = 6));
    }
    ((i += g), c.push(f), a.push(f + k), (f += k));
  }
  return { value: i, starts: c, ends: a };
}
/**
 * 中和 JSON 文本中字符串里的标签起始符，避免被当作标签解析。
 */
//@ chunk-e7z1g8a9.js:2567-2986 placement
function neutralizeTagsInJson(e) {
  let n = new Map();
  for (let c of $oo(e)) n.set(c, { end: c + codePointLength(e, c), keepsOpener: e[c] === "<" });
  for (let [c, a] of findJsonStringSpans(e)) {
    if (!U(e.slice(c, a))) continue;
    let { value: f, starts: starts, ends: ends } = decodeJsonStringWithOffsets(e, c, a);
    for (let S of $oo(f))
      n.set(starts[S], { end: ends[S + codePointLength(f, S) - 1], keepsOpener: f[S] === "<" });
  }
  let r = "",
    i = 0;
  for (let c of [...n.keys()].sort((a, f) => a - f)) {
    let { end: end, keepsOpener: keepsOpener } = n.get(c);
    ((r += e.slice(i, keepsOpener ? end : c) + (keepsOpener ? "\\\\" : "<\\\\")), (i = end));
  }
  return r + e.slice(i);
}
//@ chunk-e7z1g8a9.js:2986-3046 placement
function aIt(e) {
  if (!U(e)) return e;
  return looksLikeJson(e) ? neutralizeTagsInJson(e) : iIt(e);
}
//@ chunk-e7z1g8a9.js:3046-3060 placement
var MAIN = "main";
//@ chunk-e7z1g8a9.js:3060-3131 placement
function xBe(e, n) {
  return `<${AGENT_MESSAGE} from="${escapeXmlAttr(e)}">
${lIt(n)}
</${AGENT_MESSAGE}>`;
}
//@ chunk-e7z1g8a9.js:3131-3161 placement
function lIt(e) {
  return aIt(e);
}
//@ chunk-e7z1g8a9.js:3334-3799 placement
async function authenticatePeer(e, n) {
  let r = [],
    i;
  try {
    i = await readAllPages(
      (c) => e.listEntries({ namespace: "session" }, { cursor: c, skipKeyStats: !0 }),
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
      return (
        n.onIssue?.(`truncated at ${DEFAULT_MAX_PAGES} pages; ${r.length} names seen`, "warn"),
        n.partialOnCap ? r : void 0
      );
  }
}
//@ chunk-e7z1g8a9.js:3799-4040 placement
var AUTH = "auth",
  Ihr = /^(\d+)\.[0-9a-f]{64}\.key$/,
  he = /^(\d+)\.[0-9a-f]{64}\.key\.tmp\.[0-9a-f]+$/,
  v = 16,
  be = /^[0-9a-f]{32}$/,
  x = 4096,
  Q = DoctorLazy(() =>
    u({
      peerToken: o().regex(be),
      procStart: o().optional(),
      procStartFt: o().optional(),
      pidDomain: o().optional(),
    }),
  );
//@ chunk-e7z1g8a9.js:4040-4078 placement
function Ohr() {
  return getPlatform() === "windows";
}
//@ chunk-e7z1g8a9.js:4078-4164 placement
function AAi() {
  return { peerToken: randomBytes(v).toString("hex"), childToken: randomBytes(v).toString("hex") };
}
//@ chunk-e7z1g8a9.js:4164-4175 placement
var Mhr = 25;

export { l8, MAIN, Ohr, AAi, lIt, xBe, aIt, Mhr, authenticatePeer, Ihr, $oo, iIt, TAi, x, Q, he, AUTH, v };
