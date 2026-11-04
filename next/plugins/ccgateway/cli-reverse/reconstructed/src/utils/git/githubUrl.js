/**
 * utils/git/githubUrl.ts
 *
 * 2.1.316 新增：判断字符串是否为 ssh/git 形式的 URL（含反斜杠伪装）；远程 URL 是否不安全（ssh、非 http 协议、可疑主机）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fb1cwb1a.js (13)
 * attribution: placement 13
 */
import { memoizeWithLRU } from "../memoize.js";
import { describeUrlScheme } from "../resultError.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fb1cwb1a.js:263-314 placement
/**
 * 被视为普通 Web URL 的协议集合。
 */
var WEB_URL_SCHEMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fb1cwb1a.js:263", () => {
  WEB_URL_SCHEMES = new Set(["http", "https", "ws", "wss", "ftp"]);
});
//@ chunk-fb1cwb1a.js:314-642 placement = ghIsDangerousCallback (0.806)
/**
 * 判断字符串是否为 ssh/git 形式的 URL（含反斜杠伪装）。
 */
function hasBackslashInUrlAuthority(url) {
  url = url.replace(/^[\x00-\x20]+/, "").replace(/[\t\n\r]/g, "");
  let index = url.indexOf("://");
  if (index === -1) return false;
  let sliced = url.slice(index + 3);
  let lower = url.slice(0, index).toLowerCase();
  if (WEB_URL_SCHEMES.has(lower)) {
    let leadingSlashes = sliced.match(/^[/\\]+/)?.[0] ?? "";
    if (leadingSlashes.includes("\\")) return true;
    sliced = sliced.slice(leadingSlashes.length);
  }
  let authorityEnd = sliced.search(/[/?#]/);
  return (authorityEnd === -1 ? sliced : sliced.slice(0, authorityEnd)).includes("\\");
}
//@ chunk-fb1cwb1a.js:642-875 placement
/**
 * github.com 主机名、SSH/HTTPS 前缀、API 地址与名字格式。
 */
var GITHUB_HOST = "github.com";
var GITHUB_SSH_PREFIXES = [`git@${GITHUB_HOST}:`, `ssh://git@${GITHUB_HOST}/`];
var GITHUB_HTTPS_PREFIXES = [`https://${GITHUB_HOST}`, `https://${GITHUB_HOST}/`, GITHUB_HOST];
var GITHUB_NOREPLY_HOST = `users.noreply.${GITHUB_HOST}`;
var HTTPS_API_GITHUB_COM = "https://api.github.com";
var HOST_BREAK_CHARS_RE = /[:/\\?#@\s]/;
var HOST_LABEL_RE = /^(?!\.{1,2}$)[a-z0-9.-]+$/;
var REPO_NAME_RE = /^(?!\.{1,2}$)[a-zA-Z0-9._-]+$/;
//@ chunk-fb1cwb1a.js:875-1144 placement
/**
 * 规范化主机名（小写、拒绝带凭据/路径）。
 */
function normalizeHost(value) {
  let host = stripTrailingDots(value.replace(/[\t\n\r]/g, "").toLowerCase());
  if (host === "" || HOST_BREAK_CHARS_RE.test(host)) return host;
  try {
    let parsed = new URL(`https://${host}`);
    if (
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.port !== "" ||
      parsed.pathname !== "/" ||
      parsed.search !== "" ||
      parsed.hash !== ""
    )
      return host;
    return stripTrailingDots(parsed.hostname);
  } catch {
    return host;
  }
}
//@ chunk-fb1cwb1a.js:1144-1240 placement
/**
 * 去掉 www. 的规范化主机名（缓存）。
 */
var normalizeHostCached; // deferred: uses memoizeWithLRU (../memoize.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fb1cwb1a.js:1144", () => {
  normalizeHostCached = memoizeWithLRU(
    function (host) {
      let normalized = normalizeHost(host);
      while (normalized.startsWith("www.")) normalized = normalized.slice(4);
      return normalized;
    },
    (host) => host,
    50,
  );
});
//@ chunk-fb1cwb1a.js:1240-1276 placement
/**
 * 主机名是否等于指定值。
 */
function isHost(host, host_2) {
  return normalizeHostCached(host) === host_2;
}
//@ chunk-fb1cwb1a.js:1276-1308 placement
/**
 * 是否为 github.com。
 */
function isGithubDotCom(host) {
  return isHost(host, GITHUB_HOST);
}
//@ chunk-fb1cwb1a.js:1308-1382 placement
/**
 * 两个主机名规范化后是否相同。
 */
function sameHost(host, host_2) {
  if (!host || !host_2) return false;
  let normalized = normalizeHost(host);
  return normalized !== "" && normalized === normalizeHost(host_2);
}
//@ chunk-fb1cwb1a.js:1382-1435 placement
/**
 * GitHub（或 GHE）的 REST API 基础地址。
 */
function githubApiBase(host) {
  return isGithubDotCom(host) ? HTTPS_API_GITHUB_COM : `https://${host}/api/v3`;
}
//@ chunk-fb1cwb1a.js:1435-1506 placement
/**
 * 生成某主机的 GraphQL 端点（github.com 用 api.github.com，否则 /api/graphql）。
 */
function githubGraphqlUrl(host) {
  return isGithubDotCom(host) ? `${HTTPS_API_GITHUB_COM}/graphql` : `https://${host}/api/graphql`;
}
//@ chunk-fb1cwb1a.js:1506-1565 placement
function hasControlOrPercentChars(value) {
  return /[%\x00-\x1f\x7f-\u{10FFFF}]/u.test(value);
}
//@ chunk-fb1cwb1a.js:1565-1872 placement
/**
 * 远程 URL 是否不安全（ssh、非 http 协议、可疑主机）。
 */
function isUnsafeRemoteUrl(url) {
  if (describeUrlScheme(url)) return true;
  if (url.includes("://")) {
    if (hasBackslashInUrlAuthority(url)) return true;
    try {
      let parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return false;
      return hasControlOrPercentChars(parsed.hostname);
    } catch {
      return true;
    }
  }
  let index = url.indexOf(":");
  let index_2 = url.indexOf("@");
  if (index >= 0 && index_2 > index) return true;
  let host = url.match(/^(?:[^@]+@)?([^:]+):/)?.[1];
  return host ? hasControlOrPercentChars(host) : false;
}
//@ chunk-fb1cwb1a.js:1872-1949 placement
function stripTrailingDots(value) {
  let length = value.length;
  while (length > 0 && value[length - 1] === ".") length--;
  return value.slice(0, length);
}
export {
  isGithubDotCom,
  GITHUB_HOST,
  GITHUB_SSH_PREFIXES,
  normalizeHost,
  HOST_LABEL_RE,
  githubApiBase,
  sameHost,
  hasBackslashInUrlAuthority,
  isHost,
  isUnsafeRemoteUrl,
  WEB_URL_SCHEMES,
  normalizeHostCached,
  REPO_NAME_RE,
  githubGraphqlUrl,
};
