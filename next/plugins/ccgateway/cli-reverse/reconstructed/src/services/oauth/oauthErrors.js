/**
 * services/oauth/oauthErrors.ts
 *
 * 2.1.316 新增：OAuth 错误类（账号被暂停、回调失败）与 claude.ai 来源校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bxxnnnh4.js (23)
 * attribution: placement 23
 */
import { getOauthConfig } from "../../constants/oauth.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, _enum, literal, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bxxnnnh4.js:575-625 placement
/**
 * 匹配文本里 URL 的正则。
 */
var URL_IN_TEXT_RE = /https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+/g;
//@ chunk-bxxnnnh4.js:625-696 placement
/**
 * 判断字符串整体是否为 http(s) URL。
 */
function isUrlString(text) {
  return /^https?:\/\/[^\s"'<>\\\u2026\x00-\x1f]+$/.test(text);
}
//@ chunk-bxxnnnh4.js:696-728 placement
/**
 * 括号闭合符到开括号的映射。
 */
var CLOSING_TO_OPENING = {
  ")": "(",
  "]": "[",
  "}": "{",
};
//@ chunk-bxxnnnh4.js:728-951 placement
function trimTrailingPunctuation(text) {
  while (text.length > 0) {
    let last = text.at(-1);
    if (".,;:!?".includes(last)) {
      text = text.slice(0, -1);
      continue;
    }
    let opening = CLOSING_TO_OPENING[last];
    if (!opening) break;
    let openingCount = 0;
    let closingCount = 0;
    for (let char of text)
      if (char === opening) openingCount++;
      else if (char === last) closingCount++;
    if (closingCount > openingCount) text = text.slice(0, -1);
    else break;
  }
  return text;
}
//@ chunk-bxxnnnh4.js:951-1020 placement
/**
 * 取文本里第一个 URL 并去掉尾部标点。
 */
function firstUrlInText(text) {
  for (let match of text.matchAll(URL_IN_TEXT_RE)) return trimTrailingPunctuation(match[0]);
  return;
}
//@ chunk-bxxnnnh4.js:1020-1048 placement
var TENGU_LIVELY_BEAVER = "tengu_lively_beaver";
//@ chunk-bxxnnnh4.js:1048-1122 placement
/**
 * 持有“错误读取器”实现的容器。
 */
class ReaderHolder {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-bxxnnnh4.js:1122-1134 placement
/**
 * 全局的错误读取器持有者。
 */
var readerHolder; // deferred: uses ReaderHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bxxnnnh4.js:1122", () => {
  readerHolder = new ReaderHolder();
});
//@ chunk-bxxnnnh4.js:1134-1171 placement
/**
 * 注册错误读取器。
 */
function registerErrorReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return readerHolder.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-bxxnnnh4.js:1171-1256 placement
/**
 * 受限链接功能是否开启（读 tengu_lively_beaver）。
 */
function isRestrictedLinksEnabled() {
  let reader = readerHolder.reader;
  if (!reader) return false;
  try {
    return reader(TENGU_LIVELY_BEAVER, false) === true;
  } catch {
    return false;
  }
}
//@ chunk-bxxnnnh4.js:1256-1397 placement
/**
 * 账号冻结提示的前缀。
 */
var ACCOUNT_ON_HOLD = "account_on_hold";
var HTTPS_CLAUDE_AI_RESTRICTED = "https://claude.ai/restricted";
var ON_HOLD_PREFIX = "Your account is on hold and can't use Claude Code. View details or appeal: ";
//@ chunk-bxxnnnh4.js:1397-1430 placement
/**
 * 拼出带详情地址的冻结提示。
 */
function withOnHoldDetails(url) {
  return `${ON_HOLD_PREFIX}${url}`;
}
//@ chunk-bxxnnnh4.js:1430-1541 placement
function formatAccountOnHoldSignInError(url) {
  return `Your account is on hold and can't sign in to Claude Code. View details or appeal: ${url}`;
}
//@ chunk-bxxnnnh4.js:1541-1557 placement
/**
 * 默认的受限说明地址。
 */
var DEFAULT_RESTRICTED_URL; // deferred: uses withOnHoldDetails of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bxxnnnh4.js:1541", () => {
  DEFAULT_RESTRICTED_URL = withOnHoldDetails(HTTPS_CLAUDE_AI_RESTRICTED);
});
//@ chunk-bxxnnnh4.js:1557-1658 placement
/**
 * 判断链接是否为指向 claude.ai 的站内链接。
 */
function isClaudeAiOriginLink(text) {
  if (!isRestrictedLinksEnabled() || !text.startsWith(ON_HOLD_PREFIX)) return false;
  let text_2 = text.slice(ON_HOLD_PREFIX.length);
  return isUrlString(text_2) && isClaudeAiOrigin(text_2) === text_2;
}
//@ chunk-bxxnnnh4.js:1658-1752 placement
/**
 * 安全站内链接的正则。
 */
var MAX_LINK_CHARS = 2048;
var SAFE_LINK_RE = /^https:\/\/[a-z0-9.-]+\/[A-Za-z0-9/._~%-]*(?:\?[A-Za-z0-9._~%=&-]*)?(?<![.?])$/;
//@ chunk-bxxnnnh4.js:1752-1835 placement
/**
 * 判断 URL 是否就是 claude.ai 的 origin。
 */
function isClaudeAiOriginUrl(origin) {
  try {
    return origin === new URL(getOauthConfig().CLAUDE_AI_ORIGIN).origin;
  } catch {
    return false;
  }
}
//@ chunk-bxxnnnh4.js:1835-2189 placement
/**
 * 判断 URL 是否为 https 的 claude.ai / anthropic.com 来源。
 */
function isClaudeAiOrigin(errorUri) {
  if (typeof errorUri !== "string" || errorUri.length > MAX_LINK_CHARS) return HTTPS_CLAUDE_AI_RESTRICTED;
  let parsedUrl;
  try {
    parsedUrl = new URL(errorUri);
  } catch {
    return HTTPS_CLAUDE_AI_RESTRICTED;
  }
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.port ||
    parsedUrl.hash
  )
    return HTTPS_CLAUDE_AI_RESTRICTED;
  let hostname = parsedUrl.hostname;
  return (hostname === "claude.ai" ||
    hostname.endsWith(".claude.ai") ||
    hostname === "anthropic.com" ||
    hostname.endsWith(".anthropic.com") ||
    isClaudeAiOriginUrl(parsedUrl.origin)) &&
    parsedUrl.href.length <= MAX_LINK_CHARS &&
    SAFE_LINK_RE.test(parsedUrl.href)
    ? parsedUrl.href
    : HTTPS_CLAUDE_AI_RESTRICTED;
}
//@ chunk-bxxnnnh4.js:2189-2302 placement
var OAUTH_DENIAL_ERRORS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bxxnnnh4.js:2189", () => {
  OAUTH_DENIAL_ERRORS = DoctorLazy(() =>
    objectSchema({
      error: _enum(["invalid_grant", "access_denied"]),
      error_description: literal(ACCOUNT_ON_HOLD),
      error_uri: unknown().optional(),
    }),
  );
});
//@ chunk-bxxnnnh4.js:2302-2509 placement
function classifyOAuthErrorResponse(body) {
  if (!isRestrictedLinksEnabled()) return null;
  let value = body;
  if (typeof value === "string") {
    if (!value.includes(ACCOUNT_ON_HOLD)) return null;
    try {
      value = jsonParse(value);
    } catch {
      return null;
    }
  }
  let parsed = OAUTH_DENIAL_ERRORS().safeParse(value);
  return parsed.success
    ? {
        url: isClaudeAiOrigin(parsed.data.error_uri),
      }
    : null;
}
//@ chunk-bxxnnnh4.js:2509-2634 placement
class OAuthAccountOnHoldError extends Error {
  url;
  constructor(url) {
    super("OAuth account is on hold");
    this.url = url;
    this.name = "OAuthAccountOnHoldError";
  }
}
//@ chunk-bxxnnnh4.js:2634-2896 placement
class OAuthCallbackError extends Error {
  error;
  errorDescription;
  errorUri;
  displayMessage;
  constructor(error, description, errorUri) {
    super("OAuth authorization was denied or failed");
    this.error = error;
    this.errorDescription = description;
    this.errorUri = errorUri;
    this.name = "OAuthCallbackError";
    this.displayMessage = description ? `${error}: ${description}` : error;
  }
}
//@ chunk-bxxnnnh4.js:2896-2962 placement
function isOAuthCallbackError(error) {
  return error instanceof OAuthCallbackError && error.errorDescription === ACCOUNT_ON_HOLD;
}
export {
  OAuthCallbackError,
  OAuthAccountOnHoldError,
  withOnHoldDetails,
  URL_IN_TEXT_RE,
  trimTrailingPunctuation,
  isOAuthCallbackError,
  formatAccountOnHoldSignInError,
  isClaudeAiOrigin,
  classifyOAuthErrorResponse,
  isRestrictedLinksEnabled,
  ACCOUNT_ON_HOLD,
  registerErrorReader,
  HTTPS_CLAUDE_AI_RESTRICTED,
  firstUrlInText,
  isClaudeAiOriginLink,
};
