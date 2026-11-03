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

//@ chunk-fb1cwb1a.js:263-314 placement
/**
 * 被视为普通 Web URL 的协议集合。
 */
var WEB_URL_SCHEMES = new Set(["http", "https", "ws", "wss", "ftp"]);
//@ chunk-fb1cwb1a.js:314-642 placement = ghIsDangerousCallback (0.806)
/**
 * 判断字符串是否为 ssh/git 形式的 URL（含反斜杠伪装）。
 */
function hasBackslashInUrlAuthority(t) {
  t = t.replace(/^[\x00-\x20]+/, "").replace(/[\t\n\r]/g, "");
  let index = t.indexOf("://");
  if (index === -1) return false;
  let sliced = t.slice(index + 3);
  let lower = t.slice(0, index).toLowerCase();
  if (WEB_URL_SCHEMES.has(lower)) {
    let o = sliced.match(/^[/\\]+/)?.[0] ?? "";
    if (o.includes("\\")) return true;
    sliced = sliced.slice(o.length);
  }
  let e = sliced.search(/[/?#]/);
  return (e === -1 ? sliced : sliced.slice(0, e)).includes("\\");
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
function normalizeHost(t) {
  let n = stripTrailingDots(t.replace(/[\t\n\r]/g, "").toLowerCase());
  if (n === "" || HOST_BREAK_CHARS_RE.test(n)) return n;
  try {
    let r = new URL(`https://${n}`);
    if (
      r.username !== "" ||
      r.password !== "" ||
      r.port !== "" ||
      r.pathname !== "/" ||
      r.search !== "" ||
      r.hash !== ""
    )
      return n;
    return stripTrailingDots(r.hostname);
  } catch {
    return n;
  }
}
//@ chunk-fb1cwb1a.js:1144-1240 placement
/**
 * 去掉 www. 的规范化主机名（缓存）。
 */
var normalizeHostCached = memoizeWithLRU(
  function (n) {
    let r = normalizeHost(n);
    while (r.startsWith("www.")) r = r.slice(4);
    return r;
  },
  (t) => t,
  50,
);
//@ chunk-fb1cwb1a.js:1240-1276 placement
/**
 * 主机名是否等于指定值。
 */
function isHost(t, n) {
  return normalizeHostCached(t) === n;
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
function sameHost(t, host) {
  if (!t || !host) return false;
  let r = normalizeHost(t);
  return r !== "" && r === normalizeHost(host);
}
//@ chunk-fb1cwb1a.js:1382-1435 placement
/**
 * GitHub（或 GHE）的 REST API 基础地址。
 */
function githubApiBase(t) {
  return isGithubDotCom(t) ? HTTPS_API_GITHUB_COM : `https://${t}/api/v3`;
}
//@ chunk-fb1cwb1a.js:1435-1506 placement
/**
 * 生成某主机的 GraphQL 端点（github.com 用 api.github.com，否则 /api/graphql）。
 */
function githubGraphqlUrl(host) {
  return isGithubDotCom(host) ? `${HTTPS_API_GITHUB_COM}/graphql` : `https://${host}/api/graphql`;
}
//@ chunk-fb1cwb1a.js:1506-1565 placement
function hasControlOrPercentChars(t) {
  return /[%\x00-\x1f\x7f-\u{10FFFF}]/u.test(t);
}
//@ chunk-fb1cwb1a.js:1565-1872 placement
/**
 * 远程 URL 是否不安全（ssh、非 http 协议、可疑主机）。
 */
function isUnsafeRemoteUrl(t) {
  if (describeUrlScheme(t)) return true;
  if (t.includes("://")) {
    if (hasBackslashInUrlAuthority(t)) return true;
    try {
      let e = new URL(t);
      if (e.protocol === "http:" || e.protocol === "https:") return false;
      return hasControlOrPercentChars(e.hostname);
    } catch {
      return true;
    }
  }
  let index = t.indexOf(":");
  let index_2 = t.indexOf("@");
  if (index >= 0 && index_2 > index) return true;
  let s = t.match(/^(?:[^@]+@)?([^:]+):/)?.[1];
  return s ? hasControlOrPercentChars(s) : false;
}
//@ chunk-fb1cwb1a.js:1872-1949 placement
function stripTrailingDots(t) {
  let n = t.length;
  while (n > 0 && t[n - 1] === ".") n--;
  return t.slice(0, n);
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
