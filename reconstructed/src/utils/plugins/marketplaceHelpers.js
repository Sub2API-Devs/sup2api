/**
 * utils/plugins/marketplaceHelpers.ts
 *
 * 市场相关的托管策略判断（strictKnownMarketplaces、blockedMarketplaces、hostPattern/pathPattern、disableSideloadFlags、command 来源禁用）与展示/错误文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/marketplaceHelpers.ts
 * pieces: chunk-e6aww6q8.js (14), chunk-f3qhjfah.js (13)
 * attribution: fingerprint 12, layout 11, file-local 3, sole-consumer 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { stripIgnorables } from "../sanitization.js";
import { stripInvisibleKeepEmoji } from "../settings/marketplaceSettingsAliases.js";
import { SUBMODULE_FETCH_MIN_MS, normalizeRepoPath, SEE_DETAILS_HINT } from "./marketplaceSubmodules.js";
import { truncateToLength, U$, plural } from "../stringUtils.js";
import { redactUrlQuery, REDACTED_URL } from "../redaction/urlRedaction.js";
import { listReservedNameRefusals, reservedMarketplaceNameMessage } from "./marketplaceSources.js";
import {
  isSourceAllowedByPolicy,
  pluginDirectoryPolicyBlock,
  getStrictKnownMarketplaces,
  canonicalFetchSourceUrl,
  v,
  extractHostFromSource,
  doesRepoMatchBlocklistEntry,
} from "./marketplacePolicy.js";
import {
  isPluginDirectorySource,
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
} from "./officialMarketplaceNames.js";
import { getMarketplace } from "./marketplaceManager.js";
import { logForDebugging } from "../debug.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { getSettingsFilePathForSource, getSettingsForSource } from "../settings/settings.js";
import { settingsSourceName } from "../settings/settingsSourceTrust.js";
import { getDisplayPath } from "../file.js";
import { isGitUsable } from "./pluginManifestRead.js";
import {
  normalizeGitUrlHost,
  isUnsafeGitUrl,
  SSH_GITHUB_COM,
  parseGithubOwnerRepo,
  normalizeGitUrlForComparison,
} from "./schemas.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { GITHUB_HOST } from "../git/githubUrl.js";
import { parseUrlScheme } from "../redaction/urlParsing.js";
import { parseScpLikeUrl } from "../gitHosts.js";
import { normalizeGitHost } from "../fsBoundRead.js";

//@ chunk-e6aww6q8.js:675486-675527 fingerprint = loadMarketplacesWithGracefulDegradation (0.679)
var MarketplacesListSchema = DoctorLazy(() => u({ marketplaces: A(oe()) }));
/**
 * 把插件安装失败列表格式化为“名字 (原因)…等 N 个”一行，最多列 2 个。
 */
//@ chunk-e6aww6q8.js:4197793-4198256 fingerprint = formatFailureDetails (0.806)
function formatFailureDetails(failures, includeReasons) {
  let mapped = failures.slice(0, 2).map((L) => {
      let G = L.reason || L.error || "unknown error",
        q,
        Z = !1;
      if (L.reasonIsOurs === !0) {
        let we = stripIgnorables(stripInvisibleKeepEmoji(G));
        q = we.length > SUBMODULE_FETCH_MIN_MS ? `${truncateToLength(we, SUBMODULE_FETCH_MIN_MS)}\u2026` : we;
      } else {
        let we = U$(G);
        ((q = stripIgnorables(stripInvisibleKeepEmoji(we))), (Z = we.length > 200 || /\n\s*\S/.test(G)));
      }
      let Se = q || "unknown error",
        ke = normalizeRepoPath(L.name);
      return { text: includeReasons ? `${ke} (${Se})` : ke, cut: Z };
    }),
    details = mapped.map((L) => L.text).join(includeReasons ? "; " : ", "),
    remaining = failures.length - 2,
    S = remaining > 0 ? ` and ${remaining} more` : "",
    w = includeReasons && mapped.some((L) => L.cut) ? `. ${SEE_DETAILS_HINT}` : "";
  return `${details}${S}${w}`;
}
//@ chunk-e6aww6q8.js:4198256-4198341 layout
var SAFE_QUERY_PARAMS = new Set(["ref", "branch", "tag", "path", "file", "file_path", "version", "format"]);
/**
 * 展示用 URL 脱敏：去掉凭据、只保留少量安全查询参数。
 */
//@ chunk-e6aww6q8.js:4198341-4198954 layout
function redactUrlForDisplay(e) {
  let n = redactUrlQuery(e),
    r;
  try {
    r = new URL(e);
  } catch {
    r = void 0;
  }
  if (!r?.host) {
    if (n === e) return e;
    let index = e.indexOf("@");
    return index === -1 || (e.indexOf("@", index + 1) === -1 && !e.slice(0, index).includes(":"))
      ? n
      : REDACTED_URL;
  }
  let search = r.search;
  if (n === REDACTED_URL || n.includes("?")) return n;
  let h = /\/$/.test(e.split(/[?#]/)[0] ?? "") && !n.endsWith("/") ? `${n}/` : n;
  if (search === "") return h;
  let joined = search
    .slice(1)
    .split("&")
    .map((S) => {
      let index = S.indexOf("=");
      if (index === -1) return S === "" ? S : "***";
      let sliced = S.slice(0, index),
        sliced_2 = S.slice(index + 1),
        q;
      try {
        q = decodeURIComponent(sliced.replace(/\+/g, " "));
      } catch {
        q = "";
      }
      return SAFE_QUERY_PARAMS.has(q.toLowerCase()) && /^(?:[\w.~/-]|%2f)*$/i.test(sliced_2) ? S : "***";
    })
    .join("&");
  return `${h}?${joined}`;
}
/**
 * 市场来源的简短展示：github → owner/repo，git/url → URL，npm → 包名，file/directory → 路径。
 */
//@ chunk-e6aww6q8.js:4198954-4199271 fingerprint = getMarketplaceSourceDisplay (0.784)
function getMarketplaceSourceDisplay(source) {
  switch (source.source) {
    case "github":
      return source.repo;
    case "url":
      return redactUrlForDisplay(source.url);
    case "git":
      return redactUrlForDisplay(source.url);
    case "directory":
      return source.path;
    case "file":
      return source.path;
    case "settings":
      return `settings:${source.name}`;
    case "claudeai":
      return "claude.ai";
    case "pluginDirectory":
      return "Built in";
    default:
      return "Unknown source";
  }
}
/**
 * 拼插件 ID：`${name}@${marketplace}`。
 */
//@ chunk-e6aww6q8.js:4199271-4199306 layout
function formatPluginId(e, n) {
  return `${e}@${n}`;
}
/**
 * 逐个加载已知市场（跳过策略不允许的、插件目录不可用的），失败的收集为 {name, error}，返回 {marketplaces, failures}；/plugin 浏览界面使用。
 */
//@ chunk-e6aww6q8.js:4199306-4199761 layout
async function loadMarketplacesWithErrors(e, n, r = "other") {
  let s = [],
    h = [];
  for (let { name: y, message: message } of listReservedNameRefusals(e)) h.push({ name: y, error: message });
  for (let [y, S] of Object.entries(e)) {
    if (!isSourceAllowedByPolicy(S.source)) continue;
    if (isPluginDirectorySource(S.source) && pluginDirectoryPolicyBlock() !== null) continue;
    let w = null;
    try {
      w = await getMarketplace(y, n, r);
    } catch (error) {
      let G = error instanceof Error ? error.message : String(error);
      (h.push({ name: y, error: U$(G) }),
        logForDebugging(`Failed to load plugin marketplace ${y}: ${G}`, { level: "error" }));
    }
    s.push({ name: y, config: S, data: w });
  }
  return { marketplaces: s, failures: h };
}
/**
 * 过滤掉“插件目录不可用”类的市场失败项。
 */
//@ chunk-e6aww6q8.js:4199761-4199807 layout
function filterSuccessfulMarketplaces(e) {
  return e.filter((n) => !isPluginDirectoryUnavailableFailure(n));
}
/**
 * 判断市场失败项是否是"插件目录（Directory）市场不可用"这一特定错误。
 */
//@ chunk-e6aww6q8.js:4199807-4199852 file-local
function isPluginDirectoryUnavailableFailure(failures) {
  return failures.error === reservedMarketplaceNameMessage(failures.name);
}
/**
 * 失败项是否只有插件目录市场。
 */
//@ chunk-e6aww6q8.js:4199852-4199936 file-local
function onlyPluginDirectoryFailed(failures) {
  {
    let n = filterSuccessfulMarketplaces(failures);
    return n.length > 0 && n.every((r) => r.name === OFFICIAL_MARKETPLACE_NAME);
  }
  return !1;
}
/**
 * 把市场加载失败列表格式化为界面提示（全部失败/部分失败，插件目录不可用单独处理）。
 */
//@ chunk-e6aww6q8.js:4199936-4200421 fingerprint = formatMarketplaceLoadingErrors (0.911)
function formatMarketplaceLoadingErrors(failures, successCount) {
  let r = filterSuccessfulMarketplaces(failures);
  if (r.length === 0)
    return failures.length > 0
      ? {
          type: "warning",
          message: failures.map((s) => `Warning: ${s.error}`).join(`
`),
        }
      : null;
  if (successCount > 0 || onlyPluginDirectoryFailed(failures))
    return {
      type: "warning",
      message:
        r.length === 1
          ? `Warning: Failed to load marketplace '${U$(r[0].name)}': ${r[0].error}`
          : `Warning: Failed to load ${r.length} marketplaces: ${r.map((h) => U$(h.name)).join(", ")}`,
    };
  return {
    type: "error",
    message: `Failed to load all marketplaces. Errors: ${r.map((s) => `${U$(s.name)}: ${s.error}`).join("; ")}`,
  };
}
/**
 * 把市场来源格式化成一行展示文本（github: owner/repo、git/url: 脱敏 URL、npm: 包名、file/directory: 路径、settings: 内联）。
 */
//@ chunk-e6aww6q8.js:4200421-4201047 fingerprint = formatSourceForDisplay (0.922)
function formatSourceForDisplay(source) {
  switch (source.source) {
    case "github":
      return `github:${source.repo}${source.ref ? `@${source.ref}` : ""}`;
    case "url":
      return redactUrlForDisplay(source.url);
    case "git":
      return `git:${redactUrlForDisplay(source.url)}${source.ref ? `@${source.ref}` : ""}`;
    case "npm":
      return `npm:${source.package}`;
    case "file":
      return `file:${source.path}`;
    case "directory":
      return `dir:${source.path}`;
    case "hostPattern":
      return `hostPattern:${source.hostPattern}`;
    case "pathPattern":
      return `pathPattern:${source.pathPattern}`;
    case "skills-dir":
      return "skills-dir";
    case "settings":
      return `settings:${source.name} (${source.plugins.length} ${plural(source.plugins.length, "plugin")})`;
    case "claudeai":
      return "claude.ai";
    case "pluginDirectory":
      return OFFICIAL_MARKETPLACE_DISPLAY;
    default:
      return "unknown source";
  }
}
/**
 * 市场来源被替换（同名换来源）后给用户的说明行（已安装插件会从新来源更新、如何撤销）。
 */
//@ chunk-e6aww6q8.js:4201047-4201793 layout
function describeMarketplaceSourceReplaced({
  name: e,
  replacedSource: replacedSource,
  resolvedSource: resolvedSource,
  settingSource: settingSource,
}) {
  if (replacedSource === void 0) return [];
  let h = stripInvisibleKeepEmoji(formatSourceForDisplay(replacedSource)),
    y = stripInvisibleKeepEmoji(formatSourceForDisplay(resolvedSource)),
    S = "Plugins already installed from it now update from the new source.",
    w = "";
  if (isLocalMarketplaceSource(replacedSource)) w = " To undo, add the previous source again.";
  else if (
    replacedSource.source === "github" ||
    replacedSource.source === "git" ||
    replacedSource.source === "url"
  ) {
    let L;
    switch (settingSource) {
      case "userSettings":
      case "projectSettings":
      case "localSettings": {
        let G = getSettingsFilePathForSource(settingSource);
        L =
          G === void 0
            ? `${settingsSourceName(settingSource)} settings`
            : stripInvisibleKeepEmoji(getDisplayPath(G));
      }
    }
    w = ` To undo, remove '${e}' from extraKnownMarketplaces in ${L}, then add the previous source again.`;
  }
  return [
    h === y
      ? `Marketplace '${e}' was already added from a different source and now points at the new one.`
      : `Marketplace '${e}' was already added from ${h} and now points at ${y}.`,
    `${S}${w}`,
  ];
}
/**
 * 判断 /plugin 浏览界面为空的原因：未安装 git、全部被策略阻止、策略限制、未配置市场、全部加载失败等。
 */
//@ chunk-e6aww6q8.js:4201793-4202143 fingerprint = detectEmptyMarketplaceReason (1)
async function detectEmptyMarketplaceReason({
  configuredMarketplaceCount: configuredMarketplaceCount,
  failedMarketplaceCount: failedMarketplaceCount,
}) {
  if (!(await isGitUsable())) return "git-not-installed";
  let allowlist = getStrictKnownMarketplaces();
  if (allowlist !== null) {
    if (allowlist.length === 0) return "all-blocked-by-policy";
    if (configuredMarketplaceCount === 0) return "policy-restricts-sources";
  }
  if (configuredMarketplaceCount === 0) return "no-marketplaces-configured";
  if (failedMarketplaceCount > 0 && failedMarketplaceCount === configuredMarketplaceCount)
    return "all-marketplaces-failed";
  return "all-plugins-installed";
}
/**
 * 读托管策略 policySettings.blockedMarketplaces（阻止名单），未设返回 null。
 */
//@ chunk-f3qhjfah.js:49053-49161 fingerprint = getBlockedMarketplaces (1)
function getBlockedMarketplaces() {
  let policySettings = getSettingsForSource("policySettings");
  if (!policySettings?.blockedMarketplaces) return null;
  return policySettings.blockedMarketplaces;
}
/**
 * 比较两个市场来源是否相同（github 按 repo/ref/path，git 按 url/ref/path，url 按 url，npm/file/directory 各自字段）。
 */
//@ chunk-f3qhjfah.js:51759-52373 fingerprint = areSourcesEqual (0.935)
function areSourcesEqual(a, b) {
  if (a.source !== b.source) return !1;
  switch (a.source) {
    case "url":
      return canonicalFetchSourceUrl(a.url) === canonicalFetchSourceUrl(b.url);
    case "github":
      return (
        a.repo.toLowerCase() === b.repo.toLowerCase() &&
        (a.ref || void 0) === (b.ref || void 0) &&
        (a.path || void 0) === (b.path || void 0)
      );
    case "git": {
      let url = b.url;
      return (
        (v(a.url) || v(url) ? a.url === url : normalizeGitUrlHost(a.url) === normalizeGitUrlHost(url)) &&
        (a.ref || void 0) === (b.ref || void 0) &&
        (a.path || void 0) === (b.path || void 0)
      );
    }
    case "npm":
      return a.package === b.package;
    case "file":
      return a.path === b.path;
    case "directory":
      return a.path === b.path;
    case "settings":
      return a.name === b.name && En(a.plugins, b.plugins);
    case "pluginDirectory":
      return !0;
    default:
      return !1;
  }
}
/**
 * 从市场来源取主机：github → github.com，git → URL/scp 形式里的主机，url → URL 主机，其他 null。
 */
//@ chunk-f3qhjfah.js:52590-52829 fingerprint = extractHostFromSource (0.644)
function extractHostFromSource_2(source) {
  switch (source.source) {
    case "github":
      return GITHUB_HOST;
    case "git": {
      if (isUnsafeGitUrl(source.url)) return null;
      return parseUrlScheme(source.url)?.host ?? null;
    }
    case "url":
      try {
        return new URL(source.url).hostname;
      } catch {
        return null;
      }
    case "claudeai":
      return "claude.ai";
    default:
      return null;
  }
}
//@ chunk-f3qhjfah.js:52829-52946 layout
function getPolicyHostOfSource(e) {
  if (e.source === "git" && !e.url.includes("://")) {
    let n = parseScpLikeUrl(e.url);
    return n ? normalizeGitHost(n.host) : null;
  }
  return extractHostFromSource(e);
}
/**
 * 来源主机是否匹配策略条目的 hostPattern 正则；阻止方向时 ssh.github.com 同时按 github.com 匹配；正则非法记错误日志。
 */
//@ chunk-f3qhjfah.js:52946-53236 layout
function doesSourceMatchHostPattern(e, n, r) {
  let s = r?.blocklistDirection ? extractHostFromSource(e) : getPolicyHostOfSource(e);
  if (!s) return !1;
  let a = r?.blocklistDirection && s === SSH_GITHUB_COM ? [s, GITHUB_HOST] : [s];
  try {
    let regExp = new RegExp(n.hostPattern);
    return a.some((l) => regExp.test(l));
  } catch {
    return (
      logForDebugging(`Invalid hostPattern regex in policy settings: ${n.hostPattern}`, { level: "error" }),
      !1
    );
  }
}
//@ chunk-f3qhjfah.js:53236-53368 layout
function isValidPolicyRegex(e) {
  try {
    return (new RegExp(e), !0);
  } catch {
    return (logForDebugging(`Invalid hostPattern regex in policy settings: ${e}`, { level: "error" }), !1);
  }
}
/**
 * 字符串是否整串匹配正则（正则非法返回 false）。
 */
//@ chunk-f3qhjfah.js:53368-53464 layout
function fullMatchesRegex(e, n) {
  if (!isValidPolicyRegex(n)) return !1;
  try {
    return new RegExp(`^(?:${n})$`).test(e);
  } catch {
    return !1;
  }
}
/**
 * file/directory 来源的 path 是否匹配策略条目的 pathPattern 正则。
 */
//@ chunk-f3qhjfah.js:53464-53710 fingerprint = doesSourceMatchPathPattern (0.752)
function doesSourceMatchPathPattern(source, pattern) {
  if (source.source !== "file" && source.source !== "directory") return !1;
  try {
    return new RegExp(pattern.pathPattern).test(source.path);
  } catch {
    return (
      logForDebugging(
        `Invalid pathPattern regex in policy settings strictKnownMarketplaces: ${pattern.pathPattern}`,
        { level: "error" },
      ),
      !1
    );
  }
}
//@ chunk-f3qhjfah.js:53795-53842 fingerprint = getHostPatternsFromAllowlist (0.801)
function isHostPatternEntry(e) {
  return e.source === "hostPattern";
}
//@ chunk-f3qhjfah.js:53842-54124 sole-consumer
function parseBlocklistGithubUrl(e) {
  let n = parseGithubOwnerRepo(e);
  if (n !== null && n.includes("*"))
    return (
      logForDebugging(
        `Invalid owner-wildcard url in policy settings blockedMarketplaces: ${e} (wildcards are only supported in github-form entries, as "<owner>/*"); entry does not match github.com sources`,
        { level: "error" },
      ),
      null
    );
  return n;
}
/**
 * 判断路径是相对路径且不含 .. 段。
 */
//@ chunk-f3qhjfah.js:54786-54917 file-local
function isSafeRelativePath(source) {
  if (source.startsWith("/") || source.startsWith("\\") || /^[A-Za-z]:/.test(source)) return !1;
  return !source.split(/[\\/]/).some((blocked) => blocked === "..");
}
//@ chunk-f3qhjfah.js:54917-54971 layout
function optionalFieldMatches(e, n) {
  if (!e) return !0;
  return e === (n || void 0);
}
//@ chunk-f3qhjfah.js:54971-55910 fingerprint = areSourcesEquivalentForBlocklist (0.843)
function areSourcesEquivalentForBlocklist(source, blocked) {
  if (source.source === blocked.source)
    switch (source.source) {
      case "github": {
        let r = blocked;
        if (!doesRepoMatchBlocklistEntry(r.repo, source.repo)) return !1;
        return optionalFieldMatches(r.ref, source.ref) && optionalFieldMatches(r.path, source.path);
      }
      case "git": {
        let r = blocked,
          extractedRepo = parseBlocklistGithubUrl(r.url),
          a = extractedRepo === null ? null : parseGithubOwnerRepo(source.url);
        if (
          !(extractedRepo !== null && a !== null
            ? doesRepoMatchBlocklistEntry(extractedRepo, a)
            : normalizeGitUrlForComparison(source.url) === normalizeGitUrlForComparison(r.url))
        )
          return !1;
        return optionalFieldMatches(r.ref, source.ref) && optionalFieldMatches(r.path, source.path);
      }
      case "url":
        return canonicalFetchSourceUrl(source.url) === canonicalFetchSourceUrl(blocked.url);
      case "npm":
        return source.package === blocked.package;
      case "file":
        return source.path === blocked.path;
      case "directory":
        return source.path === blocked.path;
      case "settings":
        return source.name === blocked.name;
      case "pluginDirectory":
        return !0;
      default:
        return !1;
    }
  if (source.source === "git" && blocked.source === "github") {
    let extractedRepo = parseGithubOwnerRepo(source.url);
    if (extractedRepo !== null && doesRepoMatchBlocklistEntry(blocked.repo, extractedRepo))
      return optionalFieldMatches(blocked.ref, source.ref) && optionalFieldMatches(blocked.path, source.path);
  }
  if (source.source === "github" && blocked.source === "git") {
    let r = parseBlocklistGithubUrl(blocked.url);
    if (r !== null && doesRepoMatchBlocklistEntry(r, source.repo))
      return optionalFieldMatches(blocked.ref, source.ref) && optionalFieldMatches(blocked.path, source.path);
  }
  if (source.source === "git" && blocked.source === "url") {
    if (!source.url.includes("://")) return !1;
    let r = { stripDotGit: !0 };
    return normalizeGitUrlForComparison(source.url, r) === normalizeGitUrlForComparison(blocked.url, r);
  }
  return !1;
}

export {
  formatSourceForDisplay,
  isPluginDirectoryUnavailableFailure,
  loadMarketplacesWithErrors,
  formatPluginId,
  describeMarketplaceSourceReplaced,
  redactUrlForDisplay,
  MarketplacesListSchema,
  getBlockedMarketplaces,
  isHostPatternEntry,
  getPolicyHostOfSource,
  isValidPolicyRegex,
  doesSourceMatchHostPattern,
  fullMatchesRegex,
  areSourcesEqual,
  extractHostFromSource_2,
  doesSourceMatchPathPattern,
  areSourcesEquivalentForBlocklist,
  isSafeRelativePath,
  getMarketplaceSourceDisplay,
  formatFailureDetails,
  formatMarketplaceLoadingErrors,
  filterSuccessfulMarketplaces,
  detectEmptyMarketplaceReason,
  onlyPluginDirectoryFailed,
};
