/**
 * utils/deepLink/parseDeepLink.ts
 *
 * 并入已有模块：解析深链接中的市场参数；校验深链接中的 cwd（拒绝 UNC、..、相对路径、控制字符、网络链接）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/deepLink/parseDeepLink.ts
 * pieces: chunk-8gzm4s8j.js (7)
 * attribution: placement 6, fingerprint 1
 */
import { OFFICIAL_MARKETPLACE_SOURCE } from "../plugins/officialMarketplace.js";
import { NodeFsOperations, findIntermediateUncJunction } from "../fsOperations.js";
import { isUncOrDevicePath, hasDotDotSegment } from "../pathClassification.js";
import { isNetworkRelatedPath } from "../networkPaths.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { partiallySanitizeUnicode } from "../sanitization.js";
import { GITHUB_REPO_SLUG_RE } from "../plugins/parseMarketplaceInput.js";
import { isAnthropicsGithubRepo } from "../plugins/schemas.js";
import { paths } from "../cachePaths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8gzm4s8j.js:410-579 placement
function hasControlChars(text, { allowNewlineAndTab = false } = {}) {
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code <= 31 || (code >= 127 && code <= 159)) {
      if (allowNewlineAndTab && (code === 10 || code === 9)) continue;
      return true;
    }
  }
  return false;
}
//@ chunk-8gzm4s8j.js:579-795 placement
var REPO_SLUG_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_QUERY_LENGTH;
var MAX_CWD_LENGTH;
var PLUGIN_NAME_PATTERN;
var MARKETPLACE_URL_PATTERN;
var GIT_REF_PATTERN;
var MAX_MARKETPLACE_LENGTH;
var DEFAULT_MARKETPLACE_REPO;
deferInit("chunk-8gzm4s8j.js:579", () => {
  REPO_SLUG_PATTERN = /^[\w.-]+\/[\w.-]+$/;
  MAX_QUERY_LENGTH = 5000;
  MAX_CWD_LENGTH = 4096;
  PLUGIN_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
  MARKETPLACE_URL_PATTERN =
    /^(?:https:\/\/\w[\w.-]*(?::\d{1,5})?(?:\/[\w.~:/+-]*)?|\w[\w-]{0,63}@\w[\w.-]*:[\w.~:/+-]+)$/;
  GIT_REF_PATTERN = /^\w[\w./-]{0,127}$/;
  MAX_MARKETPLACE_LENGTH = 256;
  DEFAULT_MARKETPLACE_REPO = OFFICIAL_MARKETPLACE_SOURCE.repo;
});
//@ chunk-8gzm4s8j.js:795-1861 placement
/**
 * 校验深链接中的 cwd（拒绝 UNC、..、相对路径、控制字符、网络链接）。
 */
function validateDeepLinkCwd(cwd, fsApi = NodeFsOperations) {
  if (isUncOrDevicePath(cwd) || isNetworkRelatedPath(cwd))
    throw Error(`Invalid cwd in deep link: UNC / network paths are not supported, got "${cwd}"`);
  if (hasDotDotSegment(cwd))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid cwd in deep link: parent-directory segments are not supported, got "${cwd}"`,
      "Invalid cwd in deep link: parent-directory segments are not supported",
    );
  if (!cwd.startsWith("/") && !/^[a-zA-Z]:[/\\]/.test(cwd))
    throw Error(`Invalid cwd in deep link: must be an absolute path, got "${cwd}"`);
  if (hasControlChars(cwd)) throw Error("Deep link cwd contains disallowed control characters");
  if (
    /(?![\u200C\u200D\uFE00-\uFE0F\u{E0100}-\u{E01EF}])[\p{Default_Ignorable_Code_Point}\u2028\u2029\u2800\uFFF9-\uFFFB\u{1D173}-\u{1D17A}]/u.test(
      cwd,
    )
  )
    throw Error("Deep link cwd contains invisible or bidirectional control characters");
  if (cwd.length > MAX_CWD_LENGTH)
    throw Error(`Deep link cwd exceeds ${MAX_CWD_LENGTH} characters (got ${cwd.length})`);
  if (
    findIntermediateUncJunction(fsApi, cwd, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    }) !== undefined
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid cwd in deep link: the path resolves through a network link, got "${cwd}"`,
      "Invalid cwd in deep link: the path resolves through a network link",
    );
}
//@ chunk-8gzm4s8j.js:1861-2110 placement
/**
 * 规范化深链接 query：Unicode 规范化、CRLF→LF、拒绝控制字符、≤5000 字符。
 */
function sanitizeDeepLinkQuery(query) {
  let text = partiallySanitizeUnicode(query).replace(
    /\r\n?/g,
    `
`,
  );
  if (
    hasControlChars(text, {
      allowNewlineAndTab: true,
    })
  )
    throw Error("Deep link query contains disallowed control characters");
  if (text.length > MAX_QUERY_LENGTH)
    throw Error(`Deep link query exceeds ${MAX_QUERY_LENGTH} characters (got ${text.length})`);
  return text;
}
//@ chunk-8gzm4s8j.js:2110-2275 placement
/**
 * 校验深链接插件名（ASCII 字母数字 . _ -，≤100）。
 */
function validateDeepLinkPlugin(plugin) {
  if (!PLUGIN_NAME_PATTERN.test(plugin))
    throw Error(
      'Invalid plugin in deep link: expected a plugin name of ASCII letters, digits, ".", "_" and "-" (at most 100 characters)',
    );
}
//@ chunk-8gzm4s8j.js:2275-3358 placement
/**
 * 解析深链接中的市场参数。
 */
function parseDeepLinkMarketplace(spec) {
  if (spec.length > MAX_MARKETPLACE_LENGTH)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Deep link marketplace exceeds ${MAX_MARKETPLACE_LENGTH} characters (got ${spec.length})`,
      "Deep link marketplace exceeds the length limit",
    );
  let index = spec.indexOf("#");
  let repoSlug = index === -1 ? spec : spec.slice(0, index);
  let gitRef = index === -1 ? undefined : spec.slice(index + 1);
  let index_2 = repoSlug.indexOf("@");
  if (gitRef === undefined && index_2 !== -1 && !repoSlug.includes(":")) {
    gitRef = repoSlug.slice(index_2 + 1);
    repoSlug = repoSlug.slice(0, index_2);
  }
  if (repoSlug.includes("%"))
    throw Error("Invalid marketplace in deep link: percent-encoded characters are not allowed in the source");
  if (!GITHUB_REPO_SLUG_RE.test(repoSlug) && !MARKETPLACE_URL_PATTERN.test(repoSlug))
    throw Error(
      'Invalid marketplace in deep link: expected a GitHub "owner/repo", an https:// URL, or a git SSH URL like git@host:owner/repo.git',
    );
  if (/(?:^|[/:])\.\.?(?=[/:]|$)/.test(repoSlug) || repoSlug.replace(/^https:\/\//, "").includes("//"))
    throw Error('Invalid marketplace in deep link: ".", ".." and empty path segments are not allowed');
  if (gitRef !== undefined && !GIT_REF_PATTERN.test(gitRef))
    throw Error(
      'Invalid marketplace in deep link: the git ref after "#" or "@" may only contain letters, digits, ".", "_", "-" and "/"',
    );
  if (gitRef !== undefined && isAnthropicsGithubRepo(repoSlug))
    throw Error("Invalid marketplace in deep link: an Anthropic marketplace can't be pinned to a git ref");
}
//@ chunk-8gzm4s8j.js:3358-4400 fingerprint = parseDeepLink (0.626)
/**
 * 解析 claude-cli:// 深链接（也接受 claude-cli:）：install-plugin?plugin=&marketplace=（marketplace 缺省官方，raw # 报错）或 open?q=&cwd=&repo=；校验 cwd/repo/query/plugin/marketplace，返回 {action,…}。
 */
function parseDeepLink(uri) {
  let normalized = uri.startsWith(`${paths}://`)
    ? uri
    : uri.startsWith(`${paths}:`)
      ? uri.replace(`${paths}:`, `${paths}://`)
      : null;
  if (!normalized) throw Error(`Invalid deep link: expected ${paths}:// scheme, got "${uri}"`);
  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw Error(`Invalid deep link URL: "${uri}"`);
  }
  if (url.hostname === "install-plugin") {
    if (url.hash)
      throw Error(
        'Invalid deep link: install-plugin has a raw "#"; encode a marketplace ref as %23 (marketplace=owner/repo%23v1)',
      );
    let plugin = url.searchParams.get("plugin");
    if (!plugin) throw Error("Invalid deep link: install-plugin requires a plugin parameter");
    validateDeepLinkPlugin(plugin);
    let marketplace = url.searchParams.get("marketplace") ?? DEFAULT_MARKETPLACE_REPO;
    parseDeepLinkMarketplace(marketplace);
    return {
      action: "install-plugin",
      plugin,
      marketplace,
    };
  }
  if (url.hostname !== "open") throw Error(`Unknown deep link action: "${url.hostname}"`);
  let cwd = url.searchParams.get("cwd") ?? undefined;
  let repo = url.searchParams.get("repo") ?? undefined;
  let rawQuery = url.searchParams.get("q");
  if (cwd) validateDeepLinkCwd(cwd);
  if (repo && !REPO_SLUG_PATTERN.test(repo))
    throw Error(`Invalid repo in deep link: expected "owner/repo", got "${repo}"`);
  let query;
  if (rawQuery && rawQuery.trim().length > 0) query = sanitizeDeepLinkQuery(rawQuery.trim());
  return {
    action: "open",
    query,
    cwd,
    repo,
  };
}
export {
  sanitizeDeepLinkQuery,
  validateDeepLinkCwd,
  parseDeepLink,
  parseDeepLinkMarketplace,
  validateDeepLinkPlugin,
};
