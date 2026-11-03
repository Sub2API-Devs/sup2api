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

/**
 * 插件来源 URL 的主机/路径正则片段。
 */
//@ chunk-dcmhvw5a.js:20639-21039 placement
var HOST_PATTERNS = String.raw`[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.?`,
  Wn = "[A-Za-z0-9._-]+",
  Zo = "[A-Za-z0-9._~-]",
  Oh = `${Zo}+(?::${Zo}*)?@`,
  Rh = ":[1-9][0-9]{0,4}",
  Th = `(?:/(?:${Zo}|%[0-9A-Fa-f]{2})*)*`,
  regExp_2 = new RegExp(`^${Wn}/${Wn}$`),
  regExp_3 = new RegExp(`^git@(${HOST_PATTERNS}):(${Wn}(?:/${Wn})*)/?$`),
  fa = `(?:${Oh})?(${HOST_PATTERNS})(?:${Rh})?(${Th})$`,
  regExp_4 = new RegExp(`^https://${fa}`),
  regExp_5 = new RegExp(`^https?://${fa}`),
  ga = `ssh.${GITHUB_HOST}`,
  WIDE = "wide:";
/**
 * 解析 git 托管 URL。
 */
//@ chunk-dcmhvw5a.js:21039-21429 placement
function parseGitHostUrl(e, n) {
  let matches = regExp_2.test(e),
    match = regExp_3.exec(e),
    match_2 = (n ? regExp_5 : regExp_4).exec(e),
    c = matches ? GITHUB_HOST : (match?.[1] ?? match_2?.[1]);
  if (c === void 0) return;
  let replaced = c.toLowerCase().replace(/\.$/, "");
  if (c.endsWith(".") && replaced !== GITHUB_HOST && replaced !== `www.${GITHUB_HOST}`) return;
  let m = matches ? `/${e}` : match ? `/${match[2]}` : match_2?.[2] || "/";
  if (m.split("/").some((h) => /^(?:\.|%2e){1,2}$/i.test(h) || (matches && /^\.git$/i.test(h)))) return;
  return { url: match_2 ? e : `https://${c}${m}`, host: c, path: m, scp: match !== null };
}
/**
 * 规范化插件仓库 URL。
 */
//@ chunk-dcmhvw5a.js:21429-22470 placement
function normalizePluginRepoUrl(e, n, r) {
  let s = r?.blocklistDirection === !0,
    a,
    c,
    g,
    m = parseGitHostUrl(e, s);
  if (m === void 0) return;
  try {
    let S = new URL(m.url);
    if (S.hostname !== m.host.toLowerCase() || S.pathname !== m.path) return;
    let replaced = S.hostname.replace(/\.$/, "");
    if (replaced === ga && !m.scp && !s) return;
    let w = replaced === `www.${GITHUB_HOST}` || replaced === ga ? GITHUB_HOST : replaced;
    g = s || (w === GITHUB_HOST && S.port === "");
    let L = s && (S.port === "80" || S.port === "443") ? "" : S.port;
    ((a = `${w}${L === "" ? "" : `:${L}`}`), (c = S.pathname));
  } catch {
    return;
  }
  let replaced = c.replace(/%([0-9a-f]{2})/gi, (S, C) => {
    let fromCharCode = String.fromCharCode(parseInt(C, 16));
    return /^[A-Za-z0-9._~-]$/.test(fromCharCode) ? fromCharCode : S;
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
  if (n?.includes("\\")) return;
  let y = [];
  for (let S of (n ?? "").split("/")) {
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
    let C = toWindowsShortNameKey(S);
    if (C === void 0) return;
    b.push(C);
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
/**
 * 解析 repo#ref 写法。
 */
//@ chunk-dcmhvw5a.js:22731-22841 placement = getCurrentRepoHttpsUrl (0.803)
function parseRepoWithRef(e) {
  let index = e.indexOf("#");
  if (index === -1) return e;
  return normalizePluginRepoUrl(`https://${e.slice(0, index)}`, e.slice(index + 1)) ?? e;
}
/**
 * 两个插件来源是否相同。
 */
//@ chunk-dcmhvw5a.js:22841-23385 placement
function samePluginSource(e, n, r) {
  let s = r?.blocklistDirection !== !0;
  if (typeof e === "string") {
    let m = typeof n === "string" ? { url: n, ref: void 0 } : n;
    if (!m?.url || (s && m.ref !== void 0)) return;
    return normalizePluginRepoUrl(m.url, e, r);
  }
  if (typeof e !== "object" || e === null) return;
  let a = e,
    c = typeof a.sha === "string" && /^[a-f0-9]{40}$/.test(a.sha);
  if (s && a.ref !== void 0 && !c) return;
  let g = typeof a.path === "string" ? a.path : void 0;
  switch (a.source) {
    case "github":
      return typeof a.repo === "string" ? normalizePluginRepoUrl(a.repo, g, r) : void 0;
    case "url":
    case "git-subdir":
      return typeof a.url === "string" ? normalizePluginRepoUrl(a.url, g, r) : void 0;
    default:
      return;
  }
}
/**
 * 取来源的 URL 与 ref。
 */
//@ chunk-dcmhvw5a.js:23385-23515 placement
function sourceUrlAndRef(e) {
  switch (e?.source) {
    case "github":
      return { url: e.repo, ref: e.ref };
    case "git":
      return { url: e.url, ref: e.ref };
    default:
      return;
  }
}
/**
 * 官方插件固定的 sha。
 */
//@ chunk-dcmhvw5a.js:23515-23669 placement
function pinnedSha(e, n) {
  {
    if (!e.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) return;
    if (typeof n !== "object" || n === null) return;
    let sha = n.sha;
    return typeof sha === "string" && sha !== "" ? sha : void 0;
  }
  return;
}
/**
 * 名字附加 sha 前缀。
 */
//@ chunk-dcmhvw5a.js:23669-23751 placement
function withShaSuffix(e, n) {
  let r = `-${n.substring(0, 12)}`;
  return e.endsWith(r) ? e : `${e}${r}`;
}
/**
 * 插件目录不可用的错误。
 */
//@ chunk-dcmhvw5a.js:23751-23844 placement
class PluginDirectoryUnavailableError extends Error {
  constructor(e) {
    super(e);
    this.name = "PluginDirectoryUnavailableError";
  }
}
/**
 * 脚本扩展名到加载器（ts/tsx/jsx/js）的映射。
 */
//@ chunk-dcmhvw5a.js:23886-23992 placement
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
/**
 * 脚本扩展名列表。
 */
//@ chunk-dcmhvw5a.js:23992-24017 placement
var SCRIPT_EXTENSIONS = Object.keys(SCRIPT_EXTENSION_LOADERS);
//@ chunk-dcmhvw5a.js:24017-24080 placement
var gps = `${SCRIPT_EXTENSIONS.slice(0, -1).join(", ")} or ` + String(SCRIPT_EXTENSIONS.at(-1));

export {
  PluginDirectoryUnavailableError,
  samePluginSource,
  pinnedSha,
  withShaSuffix,
  sourceUrlAndRef,
  parseRepoWithRef,
  gps,
  SCRIPT_EXTENSION_LOADERS,
  SCRIPT_EXTENSIONS,
  normalizePluginRepoUrl,
};
