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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-qg0af0yq.js:22383-22678 fingerprint (2.1.88 match: parseAddress, 0.812)
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
function parsePeerAddress(input, listTool) {
  if (input.trim().length === 0) return "to must not be empty";
  let address = parseAddress(input);
  if ((address.scheme === "bridge" || address.scheme === "uds") && address.target.trim().length === 0)
    return "address target must not be empty";
  if (!isValidPipeOrPath(address.target) || !isValidPipeOrPath(input))
    return `'${input}' is not a local socket address. Use an address from ${listTool}.`;
  return;
}
//@ chunk-qg0af0yq.js:22976-23033 placement
function isValidPipeOrPath(address) {
  if (!isUncOrDevicePath(address)) return true;
  return parseNamedPipeName(address) !== undefined;
}
//@ chunk-qg0af0yq.js:23033-23075 placement
function isSamePath(sock, secondPath) {
  return comparePeerDirs(sock, secondPath) === "same";
}
//@ chunk-qg0af0yq.js:23075-23122 placement
function mayBeSamePath(firstPath, otherPath) {
  return comparePeerDirs(firstPath, otherPath) !== "different";
}
//@ chunk-qg0af0yq.js:23122-23547 placement
function comparePeerDirs(firstPath, secondPath) {
  let namedPipeName = parseNamedPipeName(firstPath);
  let namedPipeName_2 = parseNamedPipeName(secondPath);
  if (namedPipeName !== undefined || namedPipeName_2 !== undefined) {
    if (namedPipeName === undefined || namedPipeName_2 === undefined) return "different";
    if (asciiLowerCase(namedPipeName) === asciiLowerCase(namedPipeName_2)) return "same";
    return simpleCaseFold(namedPipeName) === simpleCaseFold(namedPipeName_2) ||
      fullCaseFold(namedPipeName) === fullCaseFold(namedPipeName_2)
      ? "maybe"
      : "different";
  }
  if (firstPath === secondPath) return "same";
  if (hasDotDotSegment(firstPath) || hasDotDotSegment(secondPath))
    return foldPathCase(stripMacPrivatePrefix(resolve(firstPath))) ===
      foldPathCase(stripMacPrivatePrefix(resolve(secondPath)))
      ? "maybe"
      : "different";
  let normalizedFirst = stripMacPrivatePrefix(resolve(firstPath));
  let normalizedSecond = stripMacPrivatePrefix(resolve(secondPath));
  if (normalizedFirst === normalizedSecond) return "same";
  let platform = getPlatform();
  let caseInsensitive = platform === "macos" || platform === "windows";
  return foldPathCase(normalizedFirst) === foldPathCase(normalizedSecond) ||
    (caseInsensitive && fullCaseFold(normalizedFirst) === fullCaseFold(normalizedSecond))
    ? "maybe"
    : "different";
}
//@ chunk-qg0af0yq.js:23547-23620 placement (2.1.88 match: getReservedShortcuts, 1)
function foldPathCase(cwd) {
  let platform = getPlatform();
  return platform === "macos" || platform === "windows"
    ? stripMacPrivatePrefix(simpleCaseFold(nfcOnMacos(cwd)))
    : cwd;
}
//@ chunk-qg0af0yq.js:23620-23684 placement
function asciiLowerCase(namedPipeName) {
  return namedPipeName.replace(/[A-Z]/g, (upper) => upper.toLowerCase());
}
//@ chunk-qg0af0yq.js:23684-23798 placement
function simpleCaseFold(namedPipeName) {
  let folded = "";
  for (let character of namedPipeName) {
    let text = character.toUpperCase();
    let upperChar = isSingleCodePoint(text) ? text : character;
    let text_2 = upperChar.toLowerCase();
    folded += isSingleCodePoint(text_2) ? text_2 : upperChar;
  }
  return folded;
}
//@ chunk-qg0af0yq.js:23798-23880 placement
function isSingleCodePoint(text) {
  let codePoint = text.codePointAt(0);
  return codePoint !== undefined && text.length === (codePoint > 65535 ? 2 : 1);
}
//@ chunk-qg0af0yq.js:23880-23931 placement
function fullCaseFold(text) {
  return text.toUpperCase().toLowerCase();
}
//@ chunk-qg0af0yq.js:23931-23988 placement (2.1.88 match: setCwdState, 0.757)
function nfcOnMacos(cwd) {
  return getPlatform() === "macos" ? cwd.normalize("NFC") : cwd;
}
//@ chunk-qg0af0yq.js:23988-24108 placement (2.1.88 match: getReservedShortcuts, 1)
function stripMacPrivatePrefix(inputPath) {
  if (getPlatform() !== "macos") return inputPath;
  let systemPath = isSystemVolumePath(inputPath);
  let match = /^\/private(\/(?:var|tmp|etc)(?:\/.*)?)$/.exec(systemPath);
  return match ? match[1] : systemPath;
}
//@ chunk-qg0af0yq.js:24108-24363 placement
function parseNamedPipeName(inputPath) {
  let match = /^[\\/]{2}[.?][\\/]pipe[\\/](?:(LOCAL)[\\/])?([^\\/]+)$/i.exec(inputPath);
  if (match === null || match[2] === "." || match[2] === "..") return;
  if (/[. ]$/.test(match[2])) return;
  if (inputPath.startsWith("\\\\?\\") && inputPath.includes("/")) return;
  return match[1] === undefined ? match[2] : `${LOCAL}\\${match[2]}`;
}
//@ chunk-qg0af0yq.js:24363-24590 placement
function isTrustedSocketPath(socketPath, namespace, peerInfo) {
  if (parseNamedPipeName(namespace) !== undefined) {
    let namedPipeName = parseNamedPipeName(socketPath);
    return namedPipeName !== undefined && regExp_4.test(namedPipeName);
  }
  if (hasDotDotSegment(socketPath)) return false;
  if (dirname(resolve(socketPath)) === dirname(resolve(namespace))) return socketPath.endsWith(".sock");
  return (
    peerInfo?.verifiedPeerPid !== undefined &&
    peerInfo.ownerUids !== undefined &&
    isSiblingSessionSocket(socketPath, peerInfo.ownerUids)
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
function isSiblingSessionSocket(socketPath, ownerUids) {
  let resolved = resolve(socketPath);
  if (!/^(\d+(-[0-9a-f]{8})?|[0-9a-f]{1,16})\.sock$/.test(basename(resolved))) return false;
  let parentDir = dirname(resolved);
  for (let pattern of DEFAULT_PEER_SOCKET_PATTERNS) {
    let match = pattern.exec(parentDir);
    if (match) return match[1] === undefined || ownerUids.some((uid) => String(uid) === match[1]);
  }
  return false;
}
//@ chunk-qg0af0yq.js:25041-25207 placement
/**
 * 判断能否回复对等会话的 socket：命名管道作用域不匹配时拒绝，可信路径允许，开启跨默认目录回复时检查同级会话 socket。
 */
function canReplyToPeerSocket(socketPath, namespace, features, ownerUids = []) {
  let namedPipeName = parseNamedPipeName(socketPath);
  let namedPipeName_2 = parseNamedPipeName(namespace);
  if (
    namedPipeName !== undefined &&
    namedPipeName_2 !== undefined &&
    regExp_5.test(namedPipeName_2) &&
    !regExp_5.test(namedPipeName)
  )
    return false;
  if (isTrustedSocketPath(socketPath, namespace)) return true;
  return (
    (features?.includes(REPLY_ACROSS_DEFAULT_DIRS) ?? false) && isSiblingSessionSocket(socketPath, ownerUids)
  );
}
//@ chunk-qg0af0yq.js:25207-25331 placement
var CC_MSG; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOCAL;
var regExp_4;
var regExp_5;
deferInit("chunk-qg0af0yq.js:25207", () => {
  CC_MSG = "cc-msg-";
  LOCAL = "LOCAL";
  regExp_4 = new RegExp(`^(?:${LOCAL}\\\\)?${CC_MSG}[0-9a-f]{32}$`, "i");
  regExp_5 = new RegExp(`^${CC_MSG}[0-9a-f]{32}$`, "i");
});
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
