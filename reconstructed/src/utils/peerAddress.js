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
import {
  decodeHeaderValue,
  UNIX_SOCKET_PATH_PATTERN,
  NAMED_PIPE_PATH_PATTERN,
} from "./peerMessageHeaders.js";
import { isUncOrDevicePath, hasDotDotSegment } from "./pathClassification.js";
import { getPlatform } from "./platform.js";
import { isSystemVolumePath } from "./permissions/protectedDirs.js";

//@ chunk-qg0af0yq.js:22383-22678 fingerprint = parseAddress (0.812)
/**
 * 解析对等地址：uds:<socket>、bridge:<id>、did: 等前缀。
 */
function parseAddress(to) {
  if (to.startsWith("uds:"))
    return {
      scheme: "uds",
      target: decodeHeaderValue(to.slice(4)),
    };
  if (to.startsWith("bridge:"))
    return {
      scheme: "bridge",
      target: decodeHeaderValue(to.slice(7)),
    };
  if (to.startsWith("did:"))
    return {
      scheme: "did",
      target: to,
    };
  if (UNIX_SOCKET_PATH_PATTERN.test(to) || NAMED_PIPE_PATH_PATTERN.test(to))
    return {
      scheme: "uds",
      target: to,
    };
  return {
    scheme: "other",
    target: to,
  };
}
//@ chunk-qg0af0yq.js:22678-22976 placement
function parsePeerAddress(e, n) {
  if (e.trim().length === 0) return "to must not be empty";
  let address = parseAddress(e);
  if ((address.scheme === "bridge" || address.scheme === "uds") && address.target.trim().length === 0)
    return "address target must not be empty";
  if (!isValidPipeOrPath(address.target) || !isValidPipeOrPath(e))
    return `'${e}' is not a local socket address. Use an address from ${n}.`;
  return;
}
//@ chunk-qg0af0yq.js:22976-23033 placement
function isValidPipeOrPath(e) {
  if (!isUncOrDevicePath(e)) return true;
  return parseNamedPipeName(e) !== undefined;
}
//@ chunk-qg0af0yq.js:23033-23075 placement
function isSamePath(sock, sock_2) {
  return comparePeerDirs(sock, sock_2) === "same";
}
//@ chunk-qg0af0yq.js:23075-23122 placement
function mayBeSamePath(sock, n) {
  return comparePeerDirs(sock, n) !== "different";
}
//@ chunk-qg0af0yq.js:23122-23547 placement
function comparePeerDirs(e, n) {
  let namedPipeName = parseNamedPipeName(e);
  let namedPipeName_2 = parseNamedPipeName(n);
  if (namedPipeName !== undefined || namedPipeName_2 !== undefined) {
    if (namedPipeName === undefined || namedPipeName_2 === undefined) return "different";
    if (asciiLowerCase(namedPipeName) === asciiLowerCase(namedPipeName_2)) return "same";
    return simpleCaseFold(namedPipeName) === simpleCaseFold(namedPipeName_2) ||
      fullCaseFold(namedPipeName) === fullCaseFold(namedPipeName_2)
      ? "maybe"
      : "different";
  }
  if (e === n) return "same";
  if (hasDotDotSegment(e) || hasDotDotSegment(n))
    return foldPathCase(stripMacPrivatePrefix(resolve(e))) === foldPathCase(stripMacPrivatePrefix(resolve(n)))
      ? "maybe"
      : "different";
  let i = stripMacPrivatePrefix(resolve(e));
  let s = stripMacPrivatePrefix(resolve(n));
  if (i === s) return "same";
  let platform = getPlatform();
  let a = platform === "macos" || platform === "windows";
  return foldPathCase(i) === foldPathCase(s) || (a && fullCaseFold(i) === fullCaseFold(s))
    ? "maybe"
    : "different";
}
//@ chunk-qg0af0yq.js:23547-23620 placement = getReservedShortcuts (1)
function foldPathCase(cwd) {
  let platform = getPlatform();
  return platform === "macos" || platform === "windows"
    ? stripMacPrivatePrefix(simpleCaseFold(nfcOnMacos(cwd)))
    : cwd;
}
//@ chunk-qg0af0yq.js:23620-23684 placement
function asciiLowerCase(namedPipeName) {
  return namedPipeName.replace(/[A-Z]/g, (n) => n.toLowerCase());
}
//@ chunk-qg0af0yq.js:23684-23798 placement
function simpleCaseFold(namedPipeName) {
  let n = "";
  for (let t of namedPipeName) {
    let upper = t.toUpperCase();
    let i = isSingleCodePoint(upper) ? upper : t;
    let lower = i.toLowerCase();
    n += isSingleCodePoint(lower) ? lower : i;
  }
  return n;
}
//@ chunk-qg0af0yq.js:23798-23880 placement
function isSingleCodePoint(e) {
  let codePoint = e.codePointAt(0);
  return codePoint !== undefined && e.length === (codePoint > 65535 ? 2 : 1);
}
//@ chunk-qg0af0yq.js:23880-23931 placement
function fullCaseFold(namedPipeName) {
  return namedPipeName.toUpperCase().toLowerCase();
}
//@ chunk-qg0af0yq.js:23931-23988 placement = setCwdState (0.757)
function nfcOnMacos(cwd) {
  return getPlatform() === "macos" ? cwd.normalize("NFC") : cwd;
}
//@ chunk-qg0af0yq.js:23988-24108 placement = getReservedShortcuts (1)
function stripMacPrivatePrefix(e) {
  if (getPlatform() !== "macos") return e;
  let n = isSystemVolumePath(e);
  let match = /^\/private(\/(?:var|tmp|etc)(?:\/.*)?)$/.exec(n);
  return match ? match[1] : n;
}
//@ chunk-qg0af0yq.js:24108-24363 placement
function parseNamedPipeName(e) {
  let match = /^[\\/]{2}[.?][\\/]pipe[\\/](?:(LOCAL)[\\/])?([^\\/]+)$/i.exec(e);
  if (match === null || match[2] === "." || match[2] === "..") return;
  if (/[. ]$/.test(match[2])) return;
  if (e.startsWith("\\\\?\\") && e.includes("/")) return;
  return match[1] === undefined ? match[2] : `${LOCAL}\\${match[2]}`;
}
//@ chunk-qg0af0yq.js:24363-24590 placement
function isTrustedSocketPath(e, n, t) {
  if (parseNamedPipeName(n) !== undefined) {
    let namedPipeName = parseNamedPipeName(e);
    return namedPipeName !== undefined && regExp_4.test(namedPipeName);
  }
  if (hasDotDotSegment(e)) return false;
  if (dirname(resolve(e)) === dirname(resolve(n))) return e.endsWith(".sock");
  return (
    t?.verifiedPeerPid !== undefined && t.ownerUids !== undefined && isSiblingSessionSocket(e, t.ownerUids)
  );
}
//@ chunk-qg0af0yq.js:24590-24831 placement
var REPLY_ACROSS_DEFAULT_DIRS = "reply_across_default_dirs";
var DEFAULT_PEER_SOCKET_PATTERNS = [
  /^\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
  /^\/private\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
  /^\/run\/user\/(0|[1-9]\d*)\/cc-socks$/,
  /^\/data\/data\/com\.termux\/files\/usr\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
];
//@ chunk-qg0af0yq.js:24831-25041 placement
function isSiblingSessionSocket(e, n) {
  let t = resolve(e);
  if (!/^(\d+(-[0-9a-f]{8})?|[0-9a-f]{1,16})\.sock$/.test(basename(t))) return false;
  let r = dirname(t);
  for (let i of DEFAULT_PEER_SOCKET_PATTERNS) {
    let match = i.exec(r);
    if (match) return match[1] === undefined || n.some((o) => String(o) === match[1]);
  }
  return false;
}
//@ chunk-qg0af0yq.js:25041-25207 placement
/**
 * 判断能否回复对等会话的 socket：命名管道作用域不匹配时拒绝，可信路径允许，开启跨默认目录回复时检查同级会话 socket。
 */
function canReplyToPeerSocket(ownSocket, namespace, features, r = []) {
  let namedPipeName = parseNamedPipeName(ownSocket);
  let namedPipeName_2 = parseNamedPipeName(namespace);
  if (
    namedPipeName !== undefined &&
    namedPipeName_2 !== undefined &&
    regExp_5.test(namedPipeName_2) &&
    !regExp_5.test(namedPipeName)
  )
    return false;
  if (isTrustedSocketPath(ownSocket, namespace)) return true;
  return (features?.includes(REPLY_ACROSS_DEFAULT_DIRS) ?? false) && isSiblingSessionSocket(ownSocket, r);
}
//@ chunk-qg0af0yq.js:25207-25331 placement
var CC_MSG = "cc-msg-";
var LOCAL = "LOCAL";
var regExp_4 = new RegExp(`^(?:${LOCAL}\\\\)?${CC_MSG}[0-9a-f]{32}$`, "i");
var regExp_5 = new RegExp(`^${CC_MSG}[0-9a-f]{32}$`, "i");
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
