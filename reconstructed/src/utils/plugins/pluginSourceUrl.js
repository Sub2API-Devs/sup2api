/**
 * utils/plugins/pluginSourceUrl.ts
 *
 * 2.1.316 新增：规范化插件仓库 URL；两个插件来源是否相同等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (13)
 * attribution: placement 13
 */
import { GITHUB_HOST } from "../git/githubUrl.js";
import { foldName, INVISIBLE_FORMAT_CHAR_RE } from "../permissions/protectedDirNames.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";

//@ chunk-dcmhvw5a.js:20639-21039 placement
/**
 * 插件来源 URL 的主机/路径正则片段。
 */
var HOST_PATTERNS = String.raw`[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.?`;
var PLUGIN_NAME_CHARS = "[A-Za-z0-9._-]+";
var PATH_SAFE_CHARS = "[A-Za-z0-9._~-]";
var USER_SEGMENT_CHARS = `${PATH_SAFE_CHARS}+(?::${PATH_SAFE_CHARS}*)?@`;
var HOST_SEGMENT_CHARS = ":[1-9][0-9]{0,4}";
var PORT_SEGMENT_PATTERN = `(?:/(?:${PATH_SAFE_CHARS}|%[0-9A-Fa-f]{2})*)*`;
var regExp_2 = new RegExp(`^${PLUGIN_NAME_CHARS}/${PLUGIN_NAME_CHARS}$`);
var regExp_3 = new RegExp(`^git@(${HOST_PATTERNS}):(${PLUGIN_NAME_CHARS}(?:/${PLUGIN_NAME_CHARS})*)/?$`);
var HOST_CHARS = `(?:${USER_SEGMENT_CHARS})?(${HOST_PATTERNS})(?:${HOST_SEGMENT_CHARS})?(${PORT_SEGMENT_PATTERN})$`;
var regExp_4 = new RegExp(`^https://${HOST_CHARS}`);
var regExp_5 = new RegExp(`^https?://${HOST_CHARS}`);
var REPO_PATH_CHARS = `ssh.${GITHUB_HOST}`;
var WIDE = "wide:";
//@ chunk-dcmhvw5a.js:21039-21429 placement
/**
 * 解析 git 托管 URL。
 */
function parseGitHostUrl(e, n) {
  let matches = regExp_2.test(e);
  let match = regExp_3.exec(e);
  let match_2 = (n ? regExp_5 : regExp_4).exec(e);
  let c = matches ? GITHUB_HOST : (match?.[1] ?? match_2?.[1]);
  if (c === undefined) return;
  let replaced = c.toLowerCase().replace(/\.$/, "");
  if (c.endsWith(".") && replaced !== GITHUB_HOST && replaced !== `www.${GITHUB_HOST}`) return;
  let m = matches ? `/${e}` : match ? `/${match[2]}` : match_2?.[2] || "/";
  if (m.split("/").some((h) => /^(?:\.|%2e){1,2}$/i.test(h) || (matches && /^\.git$/i.test(h)))) return;
  return {
    url: match_2 ? e : `https://${c}${m}`,
    host: c,
    path: m,
    scp: match !== null,
  };
}
//@ chunk-dcmhvw5a.js:21429-22470 placement
/**
 * 规范化插件仓库 URL。
 */
function normalizePluginRepoUrl(url, path, r) {
  let s = r?.blocklistDirection === true;
  let a;
  let c;
  let g;
  let gitHostUrl = parseGitHostUrl(url, s);
  if (gitHostUrl === undefined) return;
  try {
    let S = new URL(gitHostUrl.url);
    if (S.hostname !== gitHostUrl.host.toLowerCase() || S.pathname !== gitHostUrl.path) return;
    let replaced = S.hostname.replace(/\.$/, "");
    if (replaced === REPO_PATH_CHARS && !gitHostUrl.scp && !s) return;
    let w = replaced === `www.${GITHUB_HOST}` || replaced === REPO_PATH_CHARS ? GITHUB_HOST : replaced;
    g = s || (w === GITHUB_HOST && S.port === "");
    let port = s && (S.port === "80" || S.port === "443") ? "" : S.port;
    a = `${w}${port === "" ? "" : `:${port}`}`;
    c = S.pathname;
  } catch {
    return;
  }
  let replaced = c.replace(/%([0-9a-f]{2})/gi, (S, C) => {
    let w = String.fromCharCode(parseInt(C, 16));
    return /^[A-Za-z0-9._~-]$/.test(w) ? w : S;
  });
  if (replaced.includes("%")) return;
  let replaced_2 = (g ? replaced.toLowerCase() : replaced)
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "")
    .replace(/\/?\.git$/, "");
  if (s) {
    let S = replaced_2.length;
    while (replaced_2.endsWith(".git", S)) S -= replaced_2[S - 5] === "/" ? 5 : 4;
    replaced_2 = replaced_2.slice(0, S);
  }
  if (path?.includes("\\")) return;
  let y = [];
  for (let S of (path ?? "").split("/")) {
    if (S === "" || S === ".") continue;
    if (S !== "..") {
      y.push(S);
      continue;
    }
    if (y.length === 0) return;
    y.pop();
  }
  if (!s) return `${a}${replaced_2}#${y.join("/")}`;
  let b = [];
  for (let S of y) {
    let windowsShortNameKey = toWindowsShortNameKey(S);
    if (windowsShortNameKey === undefined) return;
    b.push(windowsShortNameKey);
  }
  return `${WIDE}${a}${replaced_2}#${b.join("/")}`;
}
//@ chunk-dcmhvw5a.js:22470-22731 placement = setCwdState (0.867)
function toWindowsShortNameKey(cwd) {
  let n = cwd.length;
  while (n > 0 && (cwd[n - 1] === "." || cwd[n - 1] === " ")) n--;
  let sliced = cwd.slice(0, n);
  if (sliced === "" || sliced.length > 255) return;
  let s = foldName(sliced.normalize("NFC"));
  if (/~\d/.test(s) || s.includes(":") || INVISIBLE_FORMAT_CHAR_RE.test(s)) return;
  return s.toUpperCase().toLowerCase().normalize("NFC");
}
//@ chunk-dcmhvw5a.js:22731-22841 placement = getCurrentRepoHttpsUrl (0.803)
/**
 * 解析 repo#ref 写法。
 */
function parseRepoWithRef(e) {
  let index = e.indexOf("#");
  if (index === -1) return e;
  return normalizePluginRepoUrl(`https://${e.slice(0, index)}`, e.slice(index + 1)) ?? e;
}
//@ chunk-dcmhvw5a.js:22841-23385 placement
/**
 * 两个插件来源是否相同。
 */
function samePluginSource(source, n, r) {
  let s = r?.blocklistDirection !== true;
  if (typeof source === "string") {
    let m =
      typeof n === "string"
        ? {
            url: n,
            ref: undefined,
          }
        : n;
    if (!m?.url || (s && m.ref !== undefined)) return;
    return normalizePluginRepoUrl(m.url, source, r);
  }
  if (typeof source !== "object" || source === null) return;
  let a = source;
  let c = typeof a.sha === "string" && /^[a-f0-9]{40}$/.test(a.sha);
  if (s && a.ref !== undefined && !c) return;
  let path = typeof a.path === "string" ? a.path : undefined;
  switch (a.source) {
    case "github":
      return typeof a.repo === "string" ? normalizePluginRepoUrl(a.repo, path, r) : undefined;
    case "url":
    case "git-subdir":
      return typeof a.url === "string" ? normalizePluginRepoUrl(a.url, path, r) : undefined;
    default:
      return;
  }
}
//@ chunk-dcmhvw5a.js:23385-23515 placement
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
//@ chunk-dcmhvw5a.js:23515-23669 placement
/**
 * 官方插件固定的 sha。
 */
function pinnedSha(e, source) {
  {
    if (!e.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) return;
    if (typeof source !== "object" || source === null) return;
    let sha = source.sha;
    return typeof sha === "string" && sha !== "" ? sha : undefined;
  }
  return;
}
//@ chunk-dcmhvw5a.js:23669-23751 placement
/**
 * 名字附加 sha 前缀。
 */
function withShaSuffix(e, n) {
  let r = `-${n.substring(0, 12)}`;
  return e.endsWith(r) ? e : `${e}${r}`;
}
//@ chunk-dcmhvw5a.js:23751-23844 placement
/**
 * 插件目录不可用的错误。
 */
class PluginDirectoryUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "PluginDirectoryUnavailableError";
  }
}
//@ chunk-dcmhvw5a.js:23886-23992 placement
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
//@ chunk-dcmhvw5a.js:23992-24017 placement
/**
 * 脚本扩展名列表。
 */
var SCRIPT_EXTENSIONS = Object.keys(SCRIPT_EXTENSION_LOADERS);
//@ chunk-dcmhvw5a.js:24017-24080 placement
/**
 * SCRIPT_EXTENSIONS_TEXT：脚本后缀的列举文字。
 */
var SCRIPT_EXTENSIONS_TEXT =
  `${SCRIPT_EXTENSIONS.slice(0, -1).join(", ")} or ` + String(SCRIPT_EXTENSIONS.at(-1));
export {
  PluginDirectoryUnavailableError,
  samePluginSource,
  pinnedSha,
  withShaSuffix,
  sourceUrlAndRef,
  parseRepoWithRef,
  SCRIPT_EXTENSIONS_TEXT,
  SCRIPT_EXTENSION_LOADERS,
  SCRIPT_EXTENSIONS,
  normalizePluginRepoUrl,
};
