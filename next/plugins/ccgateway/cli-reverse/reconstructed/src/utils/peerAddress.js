/**
 * utils/peerAddress.ts
 *
 * 解析对等地址前缀（uds:、bridge:、did:）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/peerAddress.ts
 * pieces: chunk-gb7aq6sf.js (19)
 * attribution: fingerprint 1, placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-gb7aq6sf.js:22781-23076 fingerprint (2.1.88 match: parseAddress, 0.812)
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
//@ chunk-gb7aq6sf.js:23076-23374 placement
function parsePeerAddress(input, listTool) {
  if (input.trim().length === 0) return "to must not be empty";
  let address = parseAddress(input);
  if ((address.scheme === "bridge" || address.scheme === "uds") && address.target.trim().length === 0)
    return "address target must not be empty";
  if (!isValidPipeOrPath(address.target) || !isValidPipeOrPath(input))
    return `'${input}' is not a local socket address. Use an address from ${listTool}.`;
  return;
}
//@ chunk-gb7aq6sf.js:23374-23431 placement
function isValidPipeOrPath(address) {
  if (!isUncOrDevicePath(address)) return true;
  return parseNamedPipeName(address) !== undefined;
}
//@ chunk-gb7aq6sf.js:23431-23473 placement
function isSamePath(sock, secondPath) {
  return comparePeerDirs(sock, secondPath) === "same";
}
//@ chunk-gb7aq6sf.js:23473-23520 placement
function mayBeSamePath(firstPath, otherPath) {
  return comparePeerDirs(firstPath, otherPath) !== "different";
}
//@ chunk-gb7aq6sf.js:23520-23945 placement
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
//@ chunk-gb7aq6sf.js:23945-24018 placement (2.1.88 match: getReservedShortcuts, 1)
function foldPathCase(cwd) {
  let platform = getPlatform();
  return platform === "macos" || platform === "windows"
    ? stripMacPrivatePrefix(simpleCaseFold(nfcOnMacos(cwd)))
    : cwd;
}
//@ chunk-gb7aq6sf.js:24018-24082 placement
function asciiLowerCase(namedPipeName) {
  return namedPipeName.replace(/[A-Z]/g, (upper) => upper.toLowerCase());
}
//@ chunk-gb7aq6sf.js:24082-24196 placement
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
//@ chunk-gb7aq6sf.js:24196-24278 placement
function isSingleCodePoint(text) {
  let codePoint = text.codePointAt(0);
  return codePoint !== undefined && text.length === (codePoint > 65535 ? 2 : 1);
}
//@ chunk-gb7aq6sf.js:24278-24329 placement
function fullCaseFold(text) {
  return text.toUpperCase().toLowerCase();
}
//@ chunk-gb7aq6sf.js:24329-24386 placement (2.1.88 match: setCwdState, 0.757)
function nfcOnMacos(cwd) {
  return getPlatform() === "macos" ? cwd.normalize("NFC") : cwd;
}
//@ chunk-gb7aq6sf.js:24386-24506 placement (2.1.88 match: getReservedShortcuts, 1)
function stripMacPrivatePrefix(inputPath) {
  if (getPlatform() !== "macos") return inputPath;
  let systemPath = isSystemVolumePath(inputPath);
  let match = /^\/private(\/(?:var|tmp|etc)(?:\/.*)?)$/.exec(systemPath);
  return match ? match[1] : systemPath;
}
//@ chunk-gb7aq6sf.js:24506-24761 placement
function parseNamedPipeName(inputPath) {
  let match = /^[\\/]{2}[.?][\\/]pipe[\\/](?:(LOCAL)[\\/])?([^\\/]+)$/i.exec(inputPath);
  if (match === null || match[2] === "." || match[2] === "..") return;
  if (/[. ]$/.test(match[2])) return;
  if (inputPath.startsWith("\\\\?\\") && inputPath.includes("/")) return;
  return match[1] === undefined ? match[2] : `${LOCAL}\\${match[2]}`;
}
//@ chunk-gb7aq6sf.js:24761-24988 placement
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
//@ chunk-gb7aq6sf.js:24988-25229 placement
var REPLY_ACROSS_DEFAULT_DIRS = "reply_across_default_dirs";
var DEFAULT_PEER_SOCKET_PATTERNS = [
  /^\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
  /^\/private\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
  /^\/run\/user\/(0|[1-9]\d*)\/cc-socks$/,
  /^\/data\/data\/com\.termux\/files\/usr\/tmp\/cc-socks(?:-(0|[1-9]\d*))?$/,
];
//@ chunk-gb7aq6sf.js:25229-25439 placement
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
//@ chunk-gb7aq6sf.js:25439-25605 placement
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
//@ chunk-gb7aq6sf.js:25605-25729 placement
var CC_MSG; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOCAL;
var regExp_4;
var regExp_5;
deferInit("chunk-gb7aq6sf.js:25605", () => {
  CC_MSG = "cc-msg-";
  LOCAL = "LOCAL";
  regExp_4 = new RegExp(`^(?:${LOCAL}\\\\)?${CC_MSG}[0-9a-f]{32}$`, "i");
  regExp_5 = new RegExp(`^${CC_MSG}[0-9a-f]{32}$`, "i");
});
export {
  parseAddress,
  REPLY_ACROSS_DEFAULT_DIRS,
  isValidPipeOrPath,
  parsePeerAddress,
  canReplyToPeerSocket,
  parseNamedPipeName,
  mayBeSamePath,
  isSamePath,
  isTrustedSocketPath,
  asciiLowerCase,
};
