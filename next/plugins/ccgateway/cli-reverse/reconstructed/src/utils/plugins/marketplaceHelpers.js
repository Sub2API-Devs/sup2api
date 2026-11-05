/**
 * utils/plugins/marketplaceHelpers.ts
 *
 * 市场相关的托管策略判断（strictKnownMarketplaces、blockedMarketplaces、hostPattern/pathPattern、disableSideloadFlags、command 来源禁用）与展示/错误文案。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/marketplaceHelpers.ts
 * pieces: chunk-5s0qaz1x.js (12), chunk-5xgkngpb.js (14)
 * attribution: fingerprint 12, layout 10, sole-consumer 1, affinity 1, file-local 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSettingsForSource, getSettingsFilePathForSource } from "../settings/settings.js";
import {
  canonicalFetchSourceUrl,
  isSuspiciousMarketplaceUrl,
  extractHostFromSource,
  doesRepoMatchBlocklistEntry,
  isSourceAllowedByPolicy,
  pluginDirectoryPolicyBlock,
  getStrictKnownMarketplaces,
} from "./marketplacePolicy.js";
import {
  normalizeGitUrlHost,
  isUnsafeGitUrl,
  SSH_GITHUB_COM,
  parseGithubOwnerRepo,
  normalizeGitUrlForComparison,
  isLocalMarketplaceSource,
} from "./schemas.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { GITHUB_HOST } from "../git/githubUrl.js";
import { parseUrlScheme } from "../redaction/urlParsing.js";
import { parseScpLikeUrl } from "../gitHosts.js";
import { normalizeGitHost } from "../fsBoundRead.js";
import { logForDebugging } from "../debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { stripIgnorables } from "../sanitization.js";
import { stripInvisibleKeepEmoji } from "../settings/marketplaceSettingsAliases.js";
import { SUBMODULE_FETCH_MIN_MS, normalizeRepoPath, SEE_DETAILS_HINT } from "./marketplaceSubmodules.js";
import { truncateToLength, oneLineClipped, plural } from "../stringUtils.js";
import { redactUrlQuery, REDACTED_URL } from "../redaction/urlRedaction.js";
import { listReservedNameRefusals, reservedMarketplaceNameMessage } from "./marketplaceSources.js";
import {
  isPluginDirectorySource,
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
} from "./officialMarketplaceNames.js";
import { getMarketplace } from "./marketplaceManager.js";
import { settingsSourceName } from "../settings/settingsSourceTrust.js";
import { getDisplayPath } from "../file.js";
import { isGitUsable } from "./pluginManifestRead.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5s0qaz1x.js:49315-49423 fingerprint (2.1.88 match: getBlockedMarketplaces, 1)
/**
 * 读托管策略 policySettings.blockedMarketplaces（阻止名单），未设返回 null。
 */
function getBlockedMarketplaces() {
  let policySettings = getSettingsForSource("policySettings");
  if (!policySettings?.blockedMarketplaces) return null;
  return policySettings.blockedMarketplaces;
}
//@ chunk-5s0qaz1x.js:52021-52635 fingerprint (2.1.88 match: areSourcesEqual, 0.935)
/**
 * 比较两个市场来源是否相同（github 按 repo/ref/path，git 按 url/ref/path，url 按 url，npm/file/directory 各自字段）。
 */
function areSourcesEqual(a, b) {
  if (a.source !== b.source) return false;
  switch (a.source) {
    case "url":
      return canonicalFetchSourceUrl(a.url) === canonicalFetchSourceUrl(b.url);
    case "github":
      return (
        a.repo.toLowerCase() === b.repo.toLowerCase() &&
        (a.ref || undefined) === (b.ref || undefined) &&
        (a.path || undefined) === (b.path || undefined)
      );
    case "git": {
      let url = b.url;
      return (
        (isSuspiciousMarketplaceUrl(a.url) || isSuspiciousMarketplaceUrl(url)
          ? a.url === url
          : normalizeGitUrlHost(a.url) === normalizeGitUrlHost(url)) &&
        (a.ref || undefined) === (b.ref || undefined) &&
        (a.path || undefined) === (b.path || undefined)
      );
    }
    case "npm":
      return a.package === b.package;
    case "file":
      return a.path === b.path;
    case "directory":
      return a.path === b.path;
    case "settings":
      return a.name === b.name && import_sortedIndex_2(a.plugins, b.plugins);
    case "pluginDirectory":
      return true;
    default:
      return false;
  }
}
//@ chunk-5s0qaz1x.js:52853-53092 fingerprint (2.1.88 match: extractHostFromSource, 0.644)
/**
 * 从市场来源取主机：github → github.com，git → URL/scp 形式里的主机，url → URL 主机，其他 null。
 */
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
//@ chunk-5s0qaz1x.js:53092-53209 layout
function getPolicyHostOfSource(source) {
  if (source.source === "git" && !source.url.includes("://")) {
    let scpLikeUrl = parseScpLikeUrl(source.url);
    return scpLikeUrl ? normalizeGitHost(scpLikeUrl.host) : null;
  }
  return extractHostFromSource(source);
}
//@ chunk-5s0qaz1x.js:53209-53499 layout
/**
 * 来源主机是否匹配策略条目的 hostPattern 正则；阻止方向时 ssh.github.com 同时按 github.com 匹配；正则非法记错误日志。
 */
function doesSourceMatchHostPattern(source, pattern, options) {
  let host = options?.blocklistDirection ? extractHostFromSource(source) : getPolicyHostOfSource(source);
  if (!host) return false;
  let hosts = options?.blocklistDirection && host === SSH_GITHUB_COM ? [host, GITHUB_HOST] : [host];
  try {
    let regExp = new RegExp(pattern.hostPattern);
    return hosts.some((host) => regExp.test(host));
  } catch {
    logForDebugging(`Invalid hostPattern regex in policy settings: ${pattern.hostPattern}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-5s0qaz1x.js:53499-53631 layout
function isValidPolicyRegex(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    logForDebugging(`Invalid hostPattern regex in policy settings: ${pattern}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-5s0qaz1x.js:53631-53727 layout
/**
 * 字符串是否整串匹配正则（正则非法返回 false）。
 */
function fullMatchesRegex(host, pattern) {
  if (!isValidPolicyRegex(pattern)) return false;
  try {
    return new RegExp(`^(?:${pattern})$`).test(host);
  } catch {
    return false;
  }
}
//@ chunk-5s0qaz1x.js:53727-53973 fingerprint (2.1.88 match: doesSourceMatchPathPattern, 0.751)
/**
 * file/directory 来源的 path 是否匹配策略条目的 pathPattern 正则。
 */
function doesSourceMatchPathPattern(source, pattern) {
  if (source.source !== "file" && source.source !== "directory") return false;
  try {
    return new RegExp(pattern.pathPattern).test(source.path);
  } catch {
    logForDebugging(
      `Invalid pathPattern regex in policy settings strictKnownMarketplaces: ${pattern.pathPattern}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-5s0qaz1x.js:54058-54105 fingerprint (2.1.88 match: getHostPatternsFromAllowlist, 0.801)
function isHostPatternEntry(entry) {
  return entry.source === "hostPattern";
}
//@ chunk-5s0qaz1x.js:54105-54387 sole-consumer
function parseBlocklistGithubUrl(url) {
  let githubOwnerRepo = parseGithubOwnerRepo(url);
  if (githubOwnerRepo !== null && githubOwnerRepo.includes("*")) {
    logForDebugging(
      `Invalid owner-wildcard url in policy settings blockedMarketplaces: ${url} (wildcards are only supported in github-form entries, as "<owner>/*"); entry does not match github.com sources`,
      {
        level: "error",
      },
    );
    return null;
  }
  return githubOwnerRepo;
}
//@ chunk-5s0qaz1x.js:55180-55234 affinity
function optionalFieldMatches(required, actual) {
  if (!required) return true;
  return required === (actual || undefined);
}
//@ chunk-5s0qaz1x.js:55234-56173 fingerprint (2.1.88 match: areSourcesEquivalentForBlocklist, 0.843)
function areSourcesEquivalentForBlocklist(source, blocked) {
  if (source.source === blocked.source)
    switch (source.source) {
      case "github": {
        let github = blocked;
        if (!doesRepoMatchBlocklistEntry(github.repo, source.repo)) return false;
        return optionalFieldMatches(github.ref, source.ref) && optionalFieldMatches(github.path, source.path);
      }
      case "git": {
        let git = blocked;
        let extractedRepo = parseBlocklistGithubUrl(git.url);
        let ownerRepo = extractedRepo === null ? null : parseGithubOwnerRepo(source.url);
        if (
          !(extractedRepo !== null && ownerRepo !== null
            ? doesRepoMatchBlocklistEntry(extractedRepo, ownerRepo)
            : normalizeGitUrlForComparison(source.url) === normalizeGitUrlForComparison(git.url))
        )
          return false;
        return optionalFieldMatches(git.ref, source.ref) && optionalFieldMatches(git.path, source.path);
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
        return true;
      default:
        return false;
    }
  if (source.source === "git" && blocked.source === "github") {
    let extractedRepo = parseGithubOwnerRepo(source.url);
    if (extractedRepo !== null && doesRepoMatchBlocklistEntry(blocked.repo, extractedRepo))
      return optionalFieldMatches(blocked.ref, source.ref) && optionalFieldMatches(blocked.path, source.path);
  }
  if (source.source === "github" && blocked.source === "git") {
    let extractedRepo = parseBlocklistGithubUrl(blocked.url);
    if (extractedRepo !== null && doesRepoMatchBlocklistEntry(extractedRepo, source.repo))
      return optionalFieldMatches(blocked.ref, source.ref) && optionalFieldMatches(blocked.path, source.path);
  }
  if (source.source === "git" && blocked.source === "url") {
    if (!source.url.includes("://")) return false;
    let options = {
      stripDotGit: true,
    };
    return (
      normalizeGitUrlForComparison(source.url, options) === normalizeGitUrlForComparison(blocked.url, options)
    );
  }
  return false;
}
//@ chunk-5xgkngpb.js:685941-685982 fingerprint (2.1.88 match: loadMarketplacesWithGracefulDegradation, 0.68)
var MarketplacesListSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:685941", () => {
  MarketplacesListSchema = DoctorLazy(() =>
    objectSchema({
      marketplaces: array(unknown()),
    }),
  );
});
//@ chunk-5xgkngpb.js:4304191-4304656 fingerprint (2.1.88 match: formatFailureDetails, 0.805)
/**
 * 把插件安装失败列表格式化为“名字 (原因)…等 N 个”一行，最多列 2 个。
 */
function formatFailureDetails(failures, includeReasons) {
  let mapped = failures.slice(0, 2).map((failure) => {
    let reason = failure.reason || failure.error || "unknown error";
    let text;
    let cut = false;
    if (failure.reasonIsOurs === true) {
      let kept = stripIgnorables(stripInvisibleKeepEmoji(reason));
      text =
        kept.length > SUBMODULE_FETCH_MIN_MS
          ? `${truncateToLength(kept, SUBMODULE_FETCH_MIN_MS)}\u2026`
          : kept;
    } else {
      let oneLine = oneLineClipped(reason);
      text = stripIgnorables(stripInvisibleKeepEmoji(oneLine));
      cut = oneLine.length > 200 || /\n\s*\S/.test(reason);
    }
    let reasonText = text || "unknown error";
    let name = normalizeRepoPath(failure.name);
    return {
      text: includeReasons ? `${name} (${reasonText})` : name,
      cut,
    };
  });
  let details = mapped.map((entry) => entry.text).join(includeReasons ? "; " : ", ");
  let remaining = failures.length - 2;
  let moreText = remaining > 0 ? ` and ${remaining} more` : "";
  let detailsSuffix = includeReasons && mapped.some((entry) => entry.cut) ? `. ${SEE_DETAILS_HINT}` : "";
  return `${details}${moreText}${detailsSuffix}`;
}
//@ chunk-5xgkngpb.js:4304656-4304741 layout
var SAFE_QUERY_PARAMS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4304656", () => {
  SAFE_QUERY_PARAMS = new Set(["ref", "branch", "tag", "path", "file", "file_path", "version", "format"]);
});
//@ chunk-5xgkngpb.js:4304741-4305354 layout
/**
 * 展示用 URL 脱敏：去掉凭据、只保留少量安全查询参数。
 */
function redactUrlForDisplay(url) {
  let redacted = redactUrlQuery(url);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    parsed = undefined;
  }
  if (!parsed?.host) {
    if (redacted === url) return url;
    let index = url.indexOf("@");
    return index === -1 || (url.indexOf("@", index + 1) === -1 && !url.slice(0, index).includes(":"))
      ? redacted
      : REDACTED_URL;
  }
  let search = parsed.search;
  if (redacted === REDACTED_URL || redacted.includes("?")) return redacted;
  let base = /\/$/.test(url.split(/[?#]/)[0] ?? "") && !redacted.endsWith("/") ? `${redacted}/` : redacted;
  if (search === "") return base;
  let joined = search
    .slice(1)
    .split("&")
    .map((pair) => {
      let index = pair.indexOf("=");
      if (index === -1) return pair === "" ? pair : "***";
      let sliced = pair.slice(0, index);
      let sliced_2 = pair.slice(index + 1);
      let key;
      try {
        key = decodeURIComponent(sliced.replace(/\+/g, " "));
      } catch {
        key = "";
      }
      return SAFE_QUERY_PARAMS.has(key.toLowerCase()) && /^(?:[\w.~/-]|%2f)*$/i.test(sliced_2) ? pair : "***";
    })
    .join("&");
  return `${base}?${joined}`;
}
//@ chunk-5xgkngpb.js:4305354-4305671 fingerprint (2.1.88 match: getMarketplaceSourceDisplay, 0.784)
/**
 * 市场来源的简短展示：github → owner/repo，git/url → URL，npm → 包名，file/directory → 路径。
 */
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
//@ chunk-5xgkngpb.js:4305671-4305706 layout
/**
 * 拼插件 ID：`${name}@${marketplace}`。
 */
function formatPluginId(pluginName, marketplaceName) {
  return `${pluginName}@${marketplaceName}`;
}
//@ chunk-5xgkngpb.js:4305706-4306161 layout
/**
 * 逐个加载已知市场（跳过策略不允许的、插件目录不可用的），失败的收集为 {name, error}，返回 {marketplaces, failures}；/plugin 浏览界面使用。
 */
async function loadMarketplacesWithErrors(config, storageV5, mode = "other") {
  let marketplaces = [];
  let failures = [];
  for (let { name, message } of listReservedNameRefusals(config))
    failures.push({
      name,
      error: message,
    });
  for (let [name, marketplaceConfig] of Object.entries(config)) {
    if (!isSourceAllowedByPolicy(marketplaceConfig.source)) continue;
    if (isPluginDirectorySource(marketplaceConfig.source) && pluginDirectoryPolicyBlock() !== null) continue;
    let data = null;
    try {
      data = await getMarketplace(name, storageV5, mode);
    } catch (err) {
      let message = err instanceof Error ? err.message : String(err);
      failures.push({
        name,
        error: oneLineClipped(message),
      });
      logForDebugging(`Failed to load plugin marketplace ${name}: ${message}`, {
        level: "error",
      });
    }
    marketplaces.push({
      name,
      config: marketplaceConfig,
      data,
    });
  }
  return {
    marketplaces,
    failures,
  };
}
//@ chunk-5xgkngpb.js:4306161-4306207 layout
/**
 * 过滤掉“插件目录不可用”类的市场失败项。
 */
function filterSuccessfulMarketplaces(failures) {
  return failures.filter((failure) => !isPluginDirectoryUnavailableFailure(failure));
}
//@ chunk-5xgkngpb.js:4306207-4306252 file-local
/**
 * 判断市场失败项是否是"插件目录（Directory）市场不可用"这一特定错误。
 */
function isPluginDirectoryUnavailableFailure(failures) {
  return failures.error === reservedMarketplaceNameMessage(failures.name);
}
//@ chunk-5xgkngpb.js:4306252-4306336 file-local
/**
 * 失败项是否只有插件目录市场。
 */
function onlyPluginDirectoryFailed(failures) {
  {
    let real = filterSuccessfulMarketplaces(failures);
    return real.length > 0 && real.every((failure) => failure.name === OFFICIAL_MARKETPLACE_NAME);
  }
  return false;
}
//@ chunk-5xgkngpb.js:4306336-4306821 fingerprint (2.1.88 match: formatMarketplaceLoadingErrors, 0.912)
/**
 * 把市场加载失败列表格式化为界面提示（全部失败/部分失败，插件目录不可用单独处理）。
 */
function formatMarketplaceLoadingErrors(failures, successCount) {
  let real = filterSuccessfulMarketplaces(failures);
  if (real.length === 0)
    return failures.length > 0
      ? {
          type: "warning",
          message: failures.map((failure) => `Warning: ${failure.error}`).join(`
`),
        }
      : null;
  if (successCount > 0 || onlyPluginDirectoryFailed(failures))
    return {
      type: "warning",
      message:
        real.length === 1
          ? `Warning: Failed to load marketplace '${oneLineClipped(real[0].name)}': ${real[0].error}`
          : `Warning: Failed to load ${real.length} marketplaces: ${real.map((failure) => oneLineClipped(failure.name)).join(", ")}`,
    };
  return {
    type: "error",
    message: `Failed to load all marketplaces. Errors: ${real.map((failure) => `${oneLineClipped(failure.name)}: ${failure.error}`).join("; ")}`,
  };
}
//@ chunk-5xgkngpb.js:4306821-4307447 fingerprint (2.1.88 match: formatSourceForDisplay, 0.922)
/**
 * 把市场来源格式化成一行展示文本（github: owner/repo、git/url: 脱敏 URL、npm: 包名、file/directory: 路径、settings: 内联）。
 */
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
//@ chunk-5xgkngpb.js:4307447-4308193 layout
/**
 * 市场来源被替换（同名换来源）后给用户的说明行（已安装插件会从新来源更新、如何撤销）。
 */
function describeMarketplaceSourceReplaced({ name, replacedSource, resolvedSource, settingSource }) {
  if (replacedSource === undefined) return [];
  let replacedText = stripInvisibleKeepEmoji(formatSourceForDisplay(replacedSource));
  let resolvedText = stripInvisibleKeepEmoji(formatSourceForDisplay(resolvedSource));
  let installedNote = "Plugins already installed from it now update from the new source.";
  let undoHint = "";
  if (isLocalMarketplaceSource(replacedSource)) undoHint = " To undo, add the previous source again.";
  else if (
    replacedSource.source === "github" ||
    replacedSource.source === "git" ||
    replacedSource.source === "url"
  ) {
    let settingsLabel;
    switch (settingSource) {
      case "userSettings":
      case "projectSettings":
      case "localSettings": {
        let settingsFilePathForSource = getSettingsFilePathForSource(settingSource);
        settingsLabel =
          settingsFilePathForSource === undefined
            ? `${settingsSourceName(settingSource)} settings`
            : stripInvisibleKeepEmoji(getDisplayPath(settingsFilePathForSource));
      }
    }
    undoHint = ` To undo, remove '${name}' from extraKnownMarketplaces in ${settingsLabel}, then add the previous source again.`;
  }
  return [
    replacedText === resolvedText
      ? `Marketplace '${name}' was already added from a different source and now points at the new one.`
      : `Marketplace '${name}' was already added from ${replacedText} and now points at ${resolvedText}.`,
    `${installedNote}${undoHint}`,
  ];
}
//@ chunk-5xgkngpb.js:4308193-4308543 fingerprint (2.1.88 match: detectEmptyMarketplaceReason, 1)
/**
 * 判断 /plugin 浏览界面为空的原因：未安装 git、全部被策略阻止、策略限制、未配置市场、全部加载失败等。
 */
async function detectEmptyMarketplaceReason({ configuredMarketplaceCount, failedMarketplaceCount }) {
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
export {
  formatSourceForDisplay,
  isPluginDirectoryUnavailableFailure,
  loadMarketplacesWithErrors,
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
  MarketplacesListSchema,
  formatPluginId,
  describeMarketplaceSourceReplaced,
  redactUrlForDisplay,
  getMarketplaceSourceDisplay,
  formatFailureDetails,
  formatMarketplaceLoadingErrors,
  filterSuccessfulMarketplaces,
  detectEmptyMarketplaceReason,
  onlyPluginDirectoryFailed,
};
