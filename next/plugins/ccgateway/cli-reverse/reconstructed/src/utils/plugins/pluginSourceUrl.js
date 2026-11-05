/**
 * utils/plugins/pluginSourceUrl.ts
 *
 * 2.1.316 新增：规范化插件仓库 URL；两个插件来源是否相同等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (13)
 * attribution: placement 13
 */
import { GITHUB_HOST } from "../git/githubUrl.js";
import { foldName, INVISIBLE_FORMAT_CHAR_RE } from "../permissions/protectedDirNames.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:20648-21048 placement
/**
 * 插件来源 URL 的主机/路径正则片段。
 */
var HOST_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PLUGIN_NAME_CHARS;
var PATH_SAFE_CHARS;
var USER_SEGMENT_CHARS;
var HOST_SEGMENT_CHARS;
var PORT_SEGMENT_PATTERN;
var regExp_2;
var regExp_3;
var HOST_CHARS;
var regExp_4;
var regExp_5;
var REPO_PATH_CHARS;
var WIDE;
deferInit("chunk-z20c443b.js:20648", () => {
  HOST_PATTERNS = String.raw`[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.?`;
  PLUGIN_NAME_CHARS = "[A-Za-z0-9._-]+";
  PATH_SAFE_CHARS = "[A-Za-z0-9._~-]";
  USER_SEGMENT_CHARS = `${PATH_SAFE_CHARS}+(?::${PATH_SAFE_CHARS}*)?@`;
  HOST_SEGMENT_CHARS = ":[1-9][0-9]{0,4}";
  PORT_SEGMENT_PATTERN = `(?:/(?:${PATH_SAFE_CHARS}|%[0-9A-Fa-f]{2})*)*`;
  regExp_2 = new RegExp(`^${PLUGIN_NAME_CHARS}/${PLUGIN_NAME_CHARS}$`);
  regExp_3 = new RegExp(`^git@(${HOST_PATTERNS}):(${PLUGIN_NAME_CHARS}(?:/${PLUGIN_NAME_CHARS})*)/?$`);
  HOST_CHARS = `(?:${USER_SEGMENT_CHARS})?(${HOST_PATTERNS})(?:${HOST_SEGMENT_CHARS})?(${PORT_SEGMENT_PATTERN})$`;
  regExp_4 = new RegExp(`^https://${HOST_CHARS}`);
  regExp_5 = new RegExp(`^https?://${HOST_CHARS}`);
  REPO_PATH_CHARS = `ssh.${GITHUB_HOST}`;
  WIDE = "wide:";
});
//@ chunk-z20c443b.js:21048-21438 placement
/**
 * 解析 git 托管 URL。
 */
function parseGitHostUrl(url, blocklist) {
  let matches = regExp_2.test(url);
  let match = regExp_3.exec(url);
  let match_2 = (blocklist ? regExp_5 : regExp_4).exec(url);
  let host = matches ? GITHUB_HOST : (match?.[1] ?? match_2?.[1]);
  if (host === undefined) return;
  let replaced = host.toLowerCase().replace(/\.$/, "");
  if (host.endsWith(".") && replaced !== GITHUB_HOST && replaced !== `www.${GITHUB_HOST}`) return;
  let repoPath = matches ? `/${url}` : match ? `/${match[2]}` : match_2?.[2] || "/";
  if (
    repoPath
      .split("/")
      .some((segment) => /^(?:\.|%2e){1,2}$/i.test(segment) || (matches && /^\.git$/i.test(segment)))
  )
    return;
  return {
    url: match_2 ? url : `https://${host}${repoPath}`,
    host,
    path: repoPath,
    scp: match !== null,
  };
}
//@ chunk-z20c443b.js:21438-22479 placement
/**
 * 规范化插件仓库 URL。
 */
function normalizePluginRepoUrl(url, path, options) {
  let blocklist = options?.blocklistDirection === true;
  let hostPort;
  let pathname;
  let isGithub;
  let gitHostUrl = parseGitHostUrl(url, blocklist);
  if (gitHostUrl === undefined) return;
  try {
    let parsed = new URL(gitHostUrl.url);
    if (parsed.hostname !== gitHostUrl.host.toLowerCase() || parsed.pathname !== gitHostUrl.path) return;
    let replaced = parsed.hostname.replace(/\.$/, "");
    if (replaced === REPO_PATH_CHARS && !gitHostUrl.scp && !blocklist) return;
    let host = replaced === `www.${GITHUB_HOST}` || replaced === REPO_PATH_CHARS ? GITHUB_HOST : replaced;
    isGithub = blocklist || (host === GITHUB_HOST && parsed.port === "");
    let port = blocklist && (parsed.port === "80" || parsed.port === "443") ? "" : parsed.port;
    hostPort = `${host}${port === "" ? "" : `:${port}`}`;
    pathname = parsed.pathname;
  } catch {
    return;
  }
  let replaced = pathname.replace(/%([0-9a-f]{2})/gi, (wholeMatch, hex) => {
    let char = String.fromCharCode(parseInt(hex, 16));
    return /^[A-Za-z0-9._~-]$/.test(char) ? char : wholeMatch;
  });
  if (replaced.includes("%")) return;
  let replaced_2 = (isGithub ? replaced.toLowerCase() : replaced)
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "")
    .replace(/\/?\.git$/, "");
  if (blocklist) {
    let end = replaced_2.length;
    while (replaced_2.endsWith(".git", end)) end -= replaced_2[end - 5] === "/" ? 5 : 4;
    replaced_2 = replaced_2.slice(0, end);
  }
  if (path?.includes("\\")) return;
  let segments = [];
  for (let segment of (path ?? "").split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment !== "..") {
      segments.push(segment);
      continue;
    }
    if (segments.length === 0) return;
    segments.pop();
  }
  if (!blocklist) return `${hostPort}${replaced_2}#${segments.join("/")}`;
  let keys = [];
  for (let segment of segments) {
    let windowsShortNameKey = toWindowsShortNameKey(segment);
    if (windowsShortNameKey === undefined) return;
    keys.push(windowsShortNameKey);
  }
  return `${WIDE}${hostPort}${replaced_2}#${keys.join("/")}`;
}
//@ chunk-z20c443b.js:22479-22740 placement (2.1.88 match: setCwdState, 0.867)
function toWindowsShortNameKey(cwd) {
  let end = cwd.length;
  while (end > 0 && (cwd[end - 1] === "." || cwd[end - 1] === " ")) end--;
  let sliced = cwd.slice(0, end);
  if (sliced === "" || sliced.length > 255) return;
  let folded = foldName(sliced.normalize("NFC"));
  if (/~\d/.test(folded) || folded.includes(":") || INVISIBLE_FORMAT_CHAR_RE.test(folded)) return;
  return folded.toUpperCase().toLowerCase().normalize("NFC");
}
//@ chunk-z20c443b.js:22740-22850 placement (2.1.88 match: getCurrentRepoHttpsUrl, 0.805)
/**
 * 解析 repo#ref 写法。
 */
function parseRepoWithRef(key) {
  let index = key.indexOf("#");
  if (index === -1) return key;
  return normalizePluginRepoUrl(`https://${key.slice(0, index)}`, key.slice(index + 1)) ?? key;
}
//@ chunk-z20c443b.js:22850-23394 placement
/**
 * 两个插件来源是否相同。
 */
function samePluginSource(source, ref, options) {
  let requireNoRef = options?.blocklistDirection !== true;
  if (typeof source === "string") {
    let info =
      typeof ref === "string"
        ? {
            url: ref,
            ref: undefined,
          }
        : ref;
    if (!info?.url || (requireNoRef && info.ref !== undefined)) return;
    return normalizePluginRepoUrl(info.url, source, options);
  }
  if (typeof source !== "object" || source === null) return;
  let source_2 = source;
  let hasSha = typeof source_2.sha === "string" && /^[a-f0-9]{40}$/.test(source_2.sha);
  if (requireNoRef && source_2.ref !== undefined && !hasSha) return;
  let path = typeof source_2.path === "string" ? source_2.path : undefined;
  switch (source_2.source) {
    case "github":
      return typeof source_2.repo === "string"
        ? normalizePluginRepoUrl(source_2.repo, path, options)
        : undefined;
    case "url":
    case "git-subdir":
      return typeof source_2.url === "string"
        ? normalizePluginRepoUrl(source_2.url, path, options)
        : undefined;
    default:
      return;
  }
}
//@ chunk-z20c443b.js:23394-23524 placement
/**
 * 取来源的 URL 与 ref。
 */
function sourceUrlAndRef(source) {
  switch (source?.source) {
    case "github":
      return {
        url: source.repo,
        ref: source.ref,
      };
    case "git":
      return {
        url: source.url,
        ref: source.ref,
      };
    default:
      return;
  }
}
//@ chunk-z20c443b.js:23524-23678 placement
/**
 * 官方插件固定的 sha。
 */
function pinnedSha(pluginId, source) {
  {
    if (!pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) return;
    if (typeof source !== "object" || source === null) return;
    let sha = source.sha;
    return typeof sha === "string" && sha !== "" ? sha : undefined;
  }
  return;
}
//@ chunk-z20c443b.js:23678-23760 placement
/**
 * 名字附加 sha 前缀。
 */
function withShaSuffix(version, sha) {
  let suffix = `-${sha.substring(0, 12)}`;
  return version.endsWith(suffix) ? version : `${version}${suffix}`;
}
//@ chunk-z20c443b.js:23760-23853 placement
/**
 * 插件目录不可用的错误。
 */
class PluginDirectoryUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "PluginDirectoryUnavailableError";
  }
}
//@ chunk-z20c443b.js:23895-24001 placement
/**
 * 脚本扩展名到加载器（ts/tsx/jsx/js）的映射。
 */
var SCRIPT_EXTENSION_LOADERS = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".jsx": "jsx",
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".mts": "ts",
  ".cts": "ts",
};
//@ chunk-z20c443b.js:24001-24026 placement
/**
 * 脚本扩展名列表。
 */
var SCRIPT_EXTENSIONS; // deferred: uses SCRIPT_EXTENSION_LOADERS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:24001", () => {
  SCRIPT_EXTENSIONS = Object.keys(SCRIPT_EXTENSION_LOADERS);
});
//@ chunk-z20c443b.js:24026-24089 placement
/**
 * SCRIPT_EXTENSIONS_TEXT：脚本后缀的列举文字。
 */
var SCRIPT_EXTENSIONS_TEXT; // deferred: uses SCRIPT_EXTENSIONS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:24026", () => {
  SCRIPT_EXTENSIONS_TEXT =
    `${SCRIPT_EXTENSIONS.slice(0, -1).join(", ")} or ` + String(SCRIPT_EXTENSIONS.at(-1));
});
export {
  normalizePluginRepoUrl,
  parseRepoWithRef,
  samePluginSource,
  pinnedSha,
  withShaSuffix,
  sourceUrlAndRef,
  PluginDirectoryUnavailableError,
  SCRIPT_EXTENSIONS_TEXT,
  SCRIPT_EXTENSION_LOADERS,
  SCRIPT_EXTENSIONS,
};
