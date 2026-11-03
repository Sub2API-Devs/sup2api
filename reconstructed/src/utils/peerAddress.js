/**
 * utils/peerAddress.ts
 *
 * 解析对等地址前缀（uds:、bridge:、did:）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/peerAddress.ts
 * pieces: chunk-qg0af0yq.js (19)
 * attribution: fingerprint 1, placement 18
 */
import { resolve, dirname, basename } from "path";
import { q, jn, Vn } from "./peerMessageHeaders.js";
import { Qn, Eh } from "./pathClassification.js";
import { getPlatform } from "./platform.js";
import { isSystemVolumePath } from "./permissions/protectedDirs.js";

/**
 * 解析对等地址：uds:<socket>、bridge:<id>、did: 等前缀。
 */
//@ chunk-qg0af0yq.js:22383-22678 fingerprint = parseAddress (0.812)
function parseAddress(to) {
  if (to.startsWith("uds:")) return { scheme: "uds", target: q(to.slice(4)) };
  if (to.startsWith("bridge:")) return { scheme: "bridge", target: q(to.slice(7)) };
  if (to.startsWith("did:")) return { scheme: "did", target: to };
  if (jn.test(to) || Vn.test(to)) return { scheme: "uds", target: to };
  return { scheme: "other", target: to };
}
//@ chunk-qg0af0yq.js:22678-22976 placement
function parsePeerAddress(e, n) {
  if (e.trim().length === 0) return "to must not be empty";
  let t = parseAddress(e);
  if ((t.scheme === "bridge" || t.scheme === "uds") && t.target.trim().length === 0)
    return "address target must not be empty";
  if (!isValidPipeOrPath(t.target) || !isValidPipeOrPath(e))
    return `'${e}' is not a local socket address. Use an address from ${n}.`;
  return;
}
//@ chunk-qg0af0yq.js:22976-23033 placement
function isValidPipeOrPath(e) {
  if (!Qn(e)) return !0;
  return parseNamedPipeName(e) !== void 0;
}
//@ chunk-qg0af0yq.js:23033-23075 placement
function isSamePath(e, n) {
  return comparePeerDirs(e, n) === "same";
}
//@ chunk-qg0af0yq.js:23075-23122 placement
function mayBeSamePath(e, n) {
  return comparePeerDirs(e, n) !== "different";
}
//@ chunk-qg0af0yq.js:23122-23547 placement
function comparePeerDirs(e, n) {
  let t = parseNamedPipeName(e),
    r = parseNamedPipeName(n);
  if (t !== void 0 || r !== void 0) {
    if (t === void 0 || r === void 0) return "different";
    if (asciiLowerCase(t) === asciiLowerCase(r)) return "same";
    return simpleCaseFold(t) === simpleCaseFold(r) || fullCaseFold(t) === fullCaseFold(r)
      ? "maybe"
      : "different";
  }
  if (e === n) return "same";
  if (Eh(e) || Eh(n))
    return foldPathCase(stripMacPrivatePrefix(resolve(e))) === foldPathCase(stripMacPrivatePrefix(resolve(n)))
      ? "maybe"
      : "different";
  let i = stripMacPrivatePrefix(resolve(e)),
    s = stripMacPrivatePrefix(resolve(n));
  if (i === s) return "same";
  let o = getPlatform(),
    a = o === "macos" || o === "windows";
  return foldPathCase(i) === foldPathCase(s) || (a && fullCaseFold(i) === fullCaseFold(s))
    ? "maybe"
    : "different";
}
//@ chunk-qg0af0yq.js:23547-23620 placement = getReservedShortcuts (1)
function foldPathCase(e) {
  let platform = getPlatform();
  return platform === "macos" || platform === "windows"
    ? stripMacPrivatePrefix(simpleCaseFold(nfcOnMacos(e)))
    : e;
}
//@ chunk-qg0af0yq.js:23620-23684 placement
function asciiLowerCase(e) {
  return e.replace(/[A-Z]/g, (n) => n.toLowerCase());
}
//@ chunk-qg0af0yq.js:23684-23798 placement
function simpleCaseFold(e) {
  let n = "";
  for (let t of e) {
    let upper = t.toUpperCase(),
      i = isSingleCodePoint(upper) ? upper : t,
      lower = i.toLowerCase();
    n += isSingleCodePoint(lower) ? lower : i;
  }
  return n;
}
//@ chunk-qg0af0yq.js:23798-23880 placement
function isSingleCodePoint(e) {
  let codePoint = e.codePointAt(0);
  return codePoint !== void 0 && e.length === (codePoint > 65535 ? 2 : 1);
}
//@ chunk-qg0af0yq.js:23880-23931 placement
function fullCaseFold(e) {
  return e.toUpperCase().toLowerCase();
}
//@ chunk-qg0af0yq.js:23931-23988 placement = setCwdState (0.757)
function nfcOnMacos(cwd) {
  return getPlatform() === "macos" ? cwd.normalize("NFC") : cwd;
}
//@ chunk-qg0af0yq.js:23988-24108 placement = getReservedShortcuts (1)
function stripMacPrivatePrefix(e) {
  if (getPlatform() !== "macos") return e;
  let n = isSystemVolumePath(e),
    match = /^\/private(\/(?:var|tmp|etc)(?:\/.*)?)$/.exec(n);
  return match ? match[1] : n;
}
//@ chunk-qg0af0yq.js:24108-24363 placement
function parseNamedPipeName(e) {
  let match = /^[\\/]{2}[.?][\\/]pipe[\\/](?:(LOCAL)[\\/])?([^\\/]+)$/i.exec(e);
  if (match === null || match[2] === "." || match[2] === "..") return;
  if (/[. ]$/.test(match[2])) return;
  if (e.startsWith("\\\\?\\") && e.includes("/")) return;
  return match[1] === void 0 ? match[2] : `${LOCAL}\\${match[2]}`;
}
//@ chunk-qg0af0yq.js:24363-24590 placement
function isTrustedSocketPath(e, n, t) {
  if (parseNamedPipeName(n) !== void 0) {
    let r = parseNamedPipeName(e);
    return r !== void 0 && regExp_4.test(r);
  }
  if (Eh(e)) return !1;
  if (dirname(resolve(e)) === dirname(resolve(n))) return e.endsWith(".sock");
  return t?.verifiedPeerPid !== void 0 && t.ownerUids !== void 0 && isSiblingSessionSocket(e, t.ownerUids);
}
//@ chunk-qg0af0yq.js:24590-24831 placement
var REPLY_ACROSS_DEFAULT_DIRS = "reply_across_default_dirs",
  Jn = [
    /^\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
    /^\/private\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
    /^\/run\/user\/(0|[1-9]\d*)\/cc-socks$/,
    /^\/data\/data\/com\.termux\/files\/usr\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
  ];
//@ chunk-qg0af0yq.js:24831-25041 placement
function isSiblingSessionSocket(e, n) {
  let t = resolve(e);
  if (!/^(\d+(-[0-9a-f]{8})?|[0-9a-f]{1,16})\.sock$/.test(basename(t))) return !1;
  let r = dirname(t);
  for (let i of Jn) {
    let match = i.exec(r);
    if (match) return match[1] === void 0 || n.some((o) => String(o) === match[1]);
  }
  return !1;
}
/**
 * 判断能否回复对等会话的 socket：命名管道作用域不匹配时拒绝，可信路径允许，开启跨默认目录回复时检查同级会话 socket。
 */
//@ chunk-qg0af0yq.js:25041-25207 placement
function canReplyToPeerSocket(e, n, t, r = []) {
  let i = parseNamedPipeName(e),
    s = parseNamedPipeName(n);
  if (i !== void 0 && s !== void 0 && regExp_5.test(s) && !regExp_5.test(i)) return !1;
  if (isTrustedSocketPath(e, n)) return !0;
  return (t?.includes(REPLY_ACROSS_DEFAULT_DIRS) ?? !1) && isSiblingSessionSocket(e, r);
}
//@ chunk-qg0af0yq.js:25207-25331 placement
var CC_MSG = "cc-msg-",
  LOCAL = "LOCAL",
  regExp_4 = new RegExp(`^(?:${LOCAL}\\\\)?${CC_MSG}[0-9a-f]{32}$`, "i"),
  regExp_5 = new RegExp(`^${CC_MSG}[0-9a-f]{32}$`, "i");

export {
  parseAddress,
  isTrustedSocketPath,
  isValidPipeOrPath,
  parsePeerAddress,
  parseNamedPipeName,
  mayBeSamePath,
  isSamePath,
  REPLY_ACROSS_DEFAULT_DIRS,
  canReplyToPeerSocket,
  asciiLowerCase,
};
