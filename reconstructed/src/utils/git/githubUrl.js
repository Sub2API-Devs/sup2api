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
var $ys = new Set(["http", "https", "ws", "wss", "ftp"]);
/**
 * 判断字符串是否为 ssh/git 形式的 URL（含反斜杠伪装）。
 */
//@ chunk-fb1cwb1a.js:314-642 placement = ghIsDangerousCallback (0.806)
function hasBackslashInUrlAuthority(t) {
  t = t.replace(/^[\x00-\x20]+/, "").replace(/[\t\n\r]/g, "");
  let index = t.indexOf("://");
  if (index === -1) return !1;
  let sliced = t.slice(index + 3),
    lower = t.slice(0, index).toLowerCase();
  if ($ys.has(lower)) {
    let o = sliced.match(/^[/\\]+/)?.[0] ?? "";
    if (o.includes("\\")) return !0;
    sliced = sliced.slice(o.length);
  }
  let search = sliced.search(/[/?#]/);
  return (search === -1 ? sliced : sliced.slice(0, search)).includes("\\");
}
/**
 * github.com 主机名、SSH/HTTPS 前缀、API 地址与名字格式。
 */
//@ chunk-fb1cwb1a.js:642-875 placement
var GITHUB_HOST = "github.com",
  Fys = [`git@${GITHUB_HOST}:`, `ssh://git@${GITHUB_HOST}/`],
  m = [`https://${GITHUB_HOST}`, `https://${GITHUB_HOST}/`, GITHUB_HOST],
  x = `users.noreply.${GITHUB_HOST}`,
  HTTPS_API_GITHUB_COM = "https://api.github.com",
  u = /[:/\\?#@\s]/,
  Nut = /^(?!\.{1,2}$)[a-z0-9.-]+$/,
  jMt = /^(?!\.{1,2}$)[a-zA-Z0-9._-]+$/;
/**
 * 规范化主机名（小写、拒绝带凭据/路径）。
 */
//@ chunk-fb1cwb1a.js:875-1144 placement
function normalizeHost(t) {
  let n = c(t.replace(/[\t\n\r]/g, "").toLowerCase());
  if (n === "" || u.test(n)) return n;
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
    return c(r.hostname);
  } catch {
    return n;
  }
}
/**
 * 去掉 www. 的规范化主机名（缓存）。
 */
//@ chunk-fb1cwb1a.js:1144-1240 placement
var normalizeHostCached = memoizeWithLRU(
  function (n) {
    let r = normalizeHost(n);
    while (r.startsWith("www.")) r = r.slice(4);
    return r;
  },
  (t) => t,
  50,
);
/**
 * 主机名是否等于指定值。
 */
//@ chunk-fb1cwb1a.js:1240-1276 placement
function isHost(t, n) {
  return normalizeHostCached(t) === n;
}
/**
 * 是否为 github.com。
 */
//@ chunk-fb1cwb1a.js:1276-1308 placement
function isGithubDotCom(t) {
  return isHost(t, GITHUB_HOST);
}
/**
 * 两个主机名规范化后是否相同。
 */
//@ chunk-fb1cwb1a.js:1308-1382 placement
function sameHost(t, n) {
  if (!t || !n) return !1;
  let r = normalizeHost(t);
  return r !== "" && r === normalizeHost(n);
}
/**
 * GitHub（或 GHE）的 REST API 基础地址。
 */
//@ chunk-fb1cwb1a.js:1382-1435 placement
function githubApiBase(t) {
  return isGithubDotCom(t) ? HTTPS_API_GITHUB_COM : `https://${t}/api/v3`;
}
//@ chunk-fb1cwb1a.js:1435-1506 placement
function eMi(t) {
  return isGithubDotCom(t) ? `${HTTPS_API_GITHUB_COM}/graphql` : `https://${t}/api/graphql`;
}
//@ chunk-fb1cwb1a.js:1506-1565 placement
function i(t) {
  return /[%\x00-\x1f\x7f-\u{10FFFF}]/u.test(t);
}
/**
 * 远程 URL 是否不安全（ssh、非 http 协议、可疑主机）。
 */
//@ chunk-fb1cwb1a.js:1565-1872 placement
function isUnsafeRemoteUrl(t) {
  if (describeUrlScheme(t)) return !0;
  if (t.includes("://")) {
    if (hasBackslashInUrlAuthority(t)) return !0;
    try {
      let e = new URL(t);
      if (e.protocol === "http:" || e.protocol === "https:") return !1;
      return i(e.hostname);
    } catch {
      return !0;
    }
  }
  let index = t.indexOf(":"),
    index_2 = t.indexOf("@");
  if (index >= 0 && index_2 > index) return !0;
  let s = t.match(/^(?:[^@]+@)?([^:]+):/)?.[1];
  return s ? i(s) : !1;
}
//@ chunk-fb1cwb1a.js:1872-1949 placement
function c(t) {
  let n = t.length;
  while (n > 0 && t[n - 1] === ".") n--;
  return t.slice(0, n);
}

export {
  isGithubDotCom,
  GITHUB_HOST,
  sameHost,
  normalizeHost,
  hasBackslashInUrlAuthority,
  Fys,
  Nut,
  githubApiBase,
  isHost,
  isUnsafeRemoteUrl,
  $ys,
  normalizeHostCached,
  jMt,
  eMi,
};
