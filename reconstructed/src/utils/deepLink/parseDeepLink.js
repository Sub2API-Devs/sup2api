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
import { Epe } from "../plugins/officialMarketplace.js";
import { NodeFsOperations, findIntermediateUncJunction } from "../fsOperations.js";
import { Qn, Eh } from "../pathClassification.js";
import { Qg } from "../networkPaths.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { partiallySanitizeUnicode } from "../sanitization.js";
import { GITHUB_REPO_SLUG_RE } from "../plugins/parseMarketplaceInput.js";
import { isAnthropicsGithubRepo } from "../plugins/schemas.js";
import { paths } from "../cachePaths.js";

//@ chunk-8gzm4s8j.js:410-579 placement
function hasControlChars(e, { allowNewlineAndTab: t = !1 } = {}) {
  for (let n = 0; n < e.length; n++) {
    let code = e.charCodeAt(n);
    if (code <= 31 || (code >= 127 && code <= 159)) {
      if (t && (code === 10 || code === 9)) continue;
      return !0;
    }
  }
  return !1;
}
//@ chunk-8gzm4s8j.js:579-795 placement
var REPO_SLUG_PATTERN = /^[\w.-]+\/[\w.-]+$/,
  MAX_QUERY_LENGTH = 5000,
  MAX_CWD_LENGTH = 4096,
  PLUGIN_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/,
  MARKETPLACE_URL_PATTERN =
    /^(?:https:\/\/\w[\w.-]*(?::\d{1,5})?(?:\/[\w.~:/+-]*)?|\w[\w-]{0,63}@\w[\w.-]*:[\w.~:/+-]+)$/,
  GIT_REF_PATTERN = /^\w[\w./-]{0,127}$/,
  MAX_MARKETPLACE_LENGTH = 256,
  DEFAULT_MARKETPLACE_REPO = Epe.repo;
/**
 * 校验深链接中的 cwd（拒绝 UNC、..、相对路径、控制字符、网络链接）。
 */
//@ chunk-8gzm4s8j.js:795-1861 placement
function validateDeepLinkCwd(e, t = NodeFsOperations) {
  if (Qn(e) || Qg(e))
    throw Error(`Invalid cwd in deep link: UNC / network paths are not supported, got "${e}"`);
  if (Eh(e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid cwd in deep link: parent-directory segments are not supported, got "${e}"`,
      "Invalid cwd in deep link: parent-directory segments are not supported",
    );
  if (!e.startsWith("/") && !/^[a-zA-Z]:[/\\]/.test(e))
    throw Error(`Invalid cwd in deep link: must be an absolute path, got "${e}"`);
  if (hasControlChars(e)) throw Error("Deep link cwd contains disallowed control characters");
  if (
    /(?![\u200C\u200D\uFE00-\uFE0F\u{E0100}-\u{E01EF}])[\p{Default_Ignorable_Code_Point}\u2028\u2029\u2800\uFFF9-\uFFFB\u{1D173}-\u{1D17A}]/u.test(
      e,
    )
  )
    throw Error("Deep link cwd contains invisible or bidirectional control characters");
  if (e.length > MAX_CWD_LENGTH)
    throw Error(`Deep link cwd exceeds ${MAX_CWD_LENGTH} characters (got ${e.length})`);
  if (
    findIntermediateUncJunction(t, e, { surfaceNetworkRaw: !0, unreadableAncestry: "unverified" }) !== void 0
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid cwd in deep link: the path resolves through a network link, got "${e}"`,
      "Invalid cwd in deep link: the path resolves through a network link",
    );
}
/**
 * 规范化深链接 query：Unicode 规范化、CRLF→LF、拒绝控制字符、≤5000 字符。
 */
//@ chunk-8gzm4s8j.js:1861-2110 placement
function sanitizeDeepLinkQuery(e) {
  let replaced = partiallySanitizeUnicode(e).replace(
    /\r\n?/g,
    `
`,
  );
  if (hasControlChars(replaced, { allowNewlineAndTab: !0 }))
    throw Error("Deep link query contains disallowed control characters");
  if (replaced.length > MAX_QUERY_LENGTH)
    throw Error(`Deep link query exceeds ${MAX_QUERY_LENGTH} characters (got ${replaced.length})`);
  return replaced;
}
/**
 * 校验深链接插件名（ASCII 字母数字 . _ -，≤100）。
 */
//@ chunk-8gzm4s8j.js:2110-2275 placement
function validateDeepLinkPlugin(e) {
  if (!PLUGIN_NAME_PATTERN.test(e))
    throw Error(
      'Invalid plugin in deep link: expected a plugin name of ASCII letters, digits, ".", "_" and "-" (at most 100 characters)',
    );
}
/**
 * 解析深链接中的市场参数。
 */
//@ chunk-8gzm4s8j.js:2275-3358 placement
function parseDeepLinkMarketplace(e) {
  if (e.length > MAX_MARKETPLACE_LENGTH)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Deep link marketplace exceeds ${MAX_MARKETPLACE_LENGTH} characters (got ${e.length})`,
      "Deep link marketplace exceeds the length limit",
    );
  let index = e.indexOf("#"),
    n = index === -1 ? e : e.slice(0, index),
    r = index === -1 ? void 0 : e.slice(index + 1),
    index_2 = n.indexOf("@");
  if (r === void 0 && index_2 !== -1 && !n.includes(":"))
    ((r = n.slice(index_2 + 1)), (n = n.slice(0, index_2)));
  if (n.includes("%"))
    throw Error("Invalid marketplace in deep link: percent-encoded characters are not allowed in the source");
  if (!GITHUB_REPO_SLUG_RE.test(n) && !MARKETPLACE_URL_PATTERN.test(n))
    throw Error(
      'Invalid marketplace in deep link: expected a GitHub "owner/repo", an https:// URL, or a git SSH URL like git@host:owner/repo.git',
    );
  if (/(?:^|[/:])\.\.?(?=[/:]|$)/.test(n) || n.replace(/^https:\/\//, "").includes("//"))
    throw Error('Invalid marketplace in deep link: ".", ".." and empty path segments are not allowed');
  if (r !== void 0 && !GIT_REF_PATTERN.test(r))
    throw Error(
      'Invalid marketplace in deep link: the git ref after "#" or "@" may only contain letters, digits, ".", "_", "-" and "/"',
    );
  if (r !== void 0 && isAnthropicsGithubRepo(n))
    throw Error("Invalid marketplace in deep link: an Anthropic marketplace can't be pinned to a git ref");
}
/**
 * 解析 claude-cli:// 深链接（也接受 claude-cli:）：install-plugin?plugin=&marketplace=（marketplace 缺省官方，raw # 报错）或 open?q=&cwd=&repo=；校验 cwd/repo/query/plugin/marketplace，返回 {action,…}。
 */
//@ chunk-8gzm4s8j.js:3358-4400 fingerprint = parseDeepLink (0.626)
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
    return (
      parseDeepLinkMarketplace(marketplace),
      { action: "install-plugin", plugin: plugin, marketplace: marketplace }
    );
  }
  if (url.hostname !== "open") throw Error(`Unknown deep link action: "${url.hostname}"`);
  let cwd = url.searchParams.get("cwd") ?? void 0,
    repo = url.searchParams.get("repo") ?? void 0,
    rawQuery = url.searchParams.get("q");
  if (cwd) validateDeepLinkCwd(cwd);
  if (repo && !REPO_SLUG_PATTERN.test(repo))
    throw Error(`Invalid repo in deep link: expected "owner/repo", got "${repo}"`);
  let query;
  if (rawQuery && rawQuery.trim().length > 0) query = sanitizeDeepLinkQuery(rawQuery.trim());
  return { action: "open", query: query, cwd: cwd, repo: repo };
}

export {
  sanitizeDeepLinkQuery,
  validateDeepLinkCwd,
  parseDeepLink,
  parseDeepLinkMarketplace,
  validateDeepLinkPlugin,
};
