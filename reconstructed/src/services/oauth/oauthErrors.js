/**
 * services/oauth/oauthErrors.ts
 *
 * 2.1.316 新增：OAuth 错误类（账号被暂停、回调失败）与 claude.ai 来源校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-640x3zn9.js (23)
 * attribution: placement 23
 */
import { getOauthConfig } from "../../constants/oauth.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, U, T, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../utils/slowOperations.js";

//@ chunk-640x3zn9.js:575-625 placement
var UJt = /https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+/g;
//@ chunk-640x3zn9.js:625-696 placement
function x(e) {
  return /^https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+$/.test(e);
}
//@ chunk-640x3zn9.js:696-728 placement
var q = { ")": "(", "]": "[", "}": "{" };
//@ chunk-640x3zn9.js:728-951 placement
function trimTrailingPunctuation(e) {
  while (e.length > 0) {
    let at = e.at(-1);
    if (".,;:!?".includes(at)) {
      e = e.slice(0, -1);
      continue;
    }
    let r = q[at];
    if (!r) break;
    let s = 0,
      c = 0;
    for (let a of e)
      if (a === r) s++;
      else if (a === at) c++;
    if (c > s) e = e.slice(0, -1);
    else break;
  }
  return e;
}
//@ chunk-640x3zn9.js:951-1020 placement
function Bgs(e) {
  for (let n of e.matchAll(UJt)) return trimTrailingPunctuation(n[0]);
  return;
}
//@ chunk-640x3zn9.js:1020-1048 placement
var TENGU_LIVELY_BEAVER = "tengu_lively_beaver";
//@ chunk-640x3zn9.js:1048-1122 placement
class v {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-640x3zn9.js:1122-1134 placement
var N = new v();
//@ chunk-640x3zn9.js:1134-1171 placement
function iIi(e) {
  return N.register(e);
}
//@ chunk-640x3zn9.js:1171-1256 placement
function BJt() {
  let reader = N.reader;
  if (!reader) return !1;
  try {
    return reader(TENGU_LIVELY_BEAVER, !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-640x3zn9.js:1256-1397 placement
var ACCOUNT_ON_HOLD = "account_on_hold",
  HTTPS_CLAUDE_AI_RESTRICTED = "https://claude.ai/restricted",
  y = "Your account is on hold and can't use Claude Code. View details or appeal: ";
//@ chunk-640x3zn9.js:1397-1430 placement
function jgs(e) {
  return `${y}${e}`;
}
//@ chunk-640x3zn9.js:1430-1541 placement
function formatAccountOnHoldSignInError(e) {
  return `Your account is on hold and can't sign in to Claude Code. View details or appeal: ${e}`;
}
//@ chunk-640x3zn9.js:1541-1557 placement
var Te = jgs(HTTPS_CLAUDE_AI_RESTRICTED);
/**
 * 判断链接是否为指向 claude.ai 的站内链接。
 */
//@ chunk-640x3zn9.js:1557-1658 placement
function isClaudeAiOriginLink(e) {
  if (!BJt() || !e.startsWith(y)) return !1;
  let sliced = e.slice(y.length);
  return x(sliced) && isClaudeAiOrigin(sliced) === sliced;
}
//@ chunk-640x3zn9.js:1658-1752 placement
var S = 2048,
  Z = /^https:\/\/[a-z0-9.-]+\/[A-Za-z0-9/._~%-]*(?:\?[A-Za-z0-9._~%=&-]*)?(?<![.?])$/;
//@ chunk-640x3zn9.js:1752-1835 placement
function Q(e) {
  try {
    return e === new URL(getOauthConfig().CLAUDE_AI_ORIGIN).origin;
  } catch {
    return !1;
  }
}
/**
 * 判断 URL 是否为 https 的 claude.ai / anthropic.com 来源。
 */
//@ chunk-640x3zn9.js:1835-2189 placement
function isClaudeAiOrigin(e) {
  if (typeof e !== "string" || e.length > S) return HTTPS_CLAUDE_AI_RESTRICTED;
  let n;
  try {
    n = new URL(e);
  } catch {
    return HTTPS_CLAUDE_AI_RESTRICTED;
  }
  if (n.protocol !== "https:" || n.username || n.password || n.port || n.hash)
    return HTTPS_CLAUDE_AI_RESTRICTED;
  let hostname = n.hostname;
  return (hostname === "claude.ai" ||
    hostname.endsWith(".claude.ai") ||
    hostname === "anthropic.com" ||
    hostname.endsWith(".anthropic.com") ||
    Q(n.origin)) &&
    n.href.length <= S &&
    Z.test(n.href)
    ? n.href
    : HTTPS_CLAUDE_AI_RESTRICTED;
}
//@ chunk-640x3zn9.js:2189-2302 placement
var OAUTH_DENIAL_ERRORS = DoctorLazy(() =>
  u({
    error: U(["invalid_grant", "access_denied"]),
    error_description: T(ACCOUNT_ON_HOLD),
    error_uri: oe().optional(),
  }),
);
//@ chunk-640x3zn9.js:2302-2509 placement
function classifyOAuthErrorResponse(e) {
  if (!BJt()) return null;
  let n = e;
  if (typeof n === "string") {
    if (!n.includes(ACCOUNT_ON_HOLD)) return null;
    try {
      n = jsonParse(n);
    } catch {
      return null;
    }
  }
  let safeParse = OAUTH_DENIAL_ERRORS().safeParse(n);
  return safeParse.success ? { url: isClaudeAiOrigin(safeParse.data.error_uri) } : null;
}
//@ chunk-640x3zn9.js:2509-2634 placement
class OAuthAccountOnHoldError extends Error {
  url;
  constructor(e) {
    super("OAuth account is on hold");
    this.url = e;
    this.name = "OAuthAccountOnHoldError";
  }
}
//@ chunk-640x3zn9.js:2634-2896 placement
class OAuthCallbackError extends Error {
  error;
  errorDescription;
  errorUri;
  displayMessage;
  constructor(e, n, r) {
    super("OAuth authorization was denied or failed");
    this.error = e;
    this.errorDescription = n;
    this.errorUri = r;
    ((this.name = "OAuthCallbackError"), (this.displayMessage = n ? `${e}: ${n}` : e));
  }
}
//@ chunk-640x3zn9.js:2896-2962 placement
function isOAuthCallbackError(e) {
  return e instanceof OAuthCallbackError && e.errorDescription === ACCOUNT_ON_HOLD;
}

export {
  UJt,
  trimTrailingPunctuation,
  Bgs,
  OAuthCallbackError,
  BJt,
  classifyOAuthErrorResponse,
  isOAuthCallbackError,
  formatAccountOnHoldSignInError,
  isClaudeAiOrigin,
  OAuthAccountOnHoldError,
  jgs,
  HTTPS_CLAUDE_AI_RESTRICTED,
  ACCOUNT_ON_HOLD,
  iIi,
  isClaudeAiOriginLink,
};
