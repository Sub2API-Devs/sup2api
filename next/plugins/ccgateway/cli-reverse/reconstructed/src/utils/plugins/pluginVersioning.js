/**
 * utils/plugins/pluginVersioning.ts
 *
 * 插件版本（缓存目录名）计算：manifest 版本 > 条目版本 > git sha > archive sha256 > 内容哈希。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginVersioning.ts
 * pieces: chunk-e6aww6q8.js (18), chunk-f3qhjfah.js (2)
 * attribution: placement 18, fingerprint 2
 */
import { join, resolve as resolve_2, relative, isAbsolute, sep } from "path";
import { createHash } from "crypto";
import { pathToFileURL } from "url";
import { getClaudeConfigDir } from "../envUtils.js";
import { splitPluginCachePath } from "./pluginDirectories.js";
import { areValidKeySegments } from "../storage/storageSpaces.js";
import { getSettingsForSourceWriteSeed } from "../settings/settings.js";
import { getInstalledPlugins, isInstallationRelevantToCurrentProject } from "./installedPluginsManager.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isNpmPluginSource,
} from "./officialMarketplaceNames.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { printableName } from "../printableName.js";
import { pinnedSha, withShaSuffix } from "./pluginSourceUrl.js";
import { logForDebugging } from "../debug.js";
import { probeHeadForDirBounded } from "../git/gitFilesystem.js";
import { findGitRoot } from "../git.js";
import { projectPluginsDir } from "./pluginCachePaths.js";
import { getMcpAuthCache as getMcpAuthCache_2 } from "./safeFileRead.js";
import { GCS_SHA_MARKER_FILE } from "./cacheUtils.js";
import { githubRepoToCloneUrl } from "./pluginLoader.js";
import { pluginGitUrlError } from "./pluginDirectoryTelemetry.js";
import { lsRemoteMarketplace } from "./marketplaceGitCheckout.js";
import { redactUrlQuery } from "../redaction/urlRedaction.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f3qhjfah.js:2695-2741 fingerprint (2.1.88 match: getVersionFromPath, 0.904)
/**
 * 旧版插件缓存根目录 <configHome>/plugins/cache。
 */
function getVersionFromPath() {
  return join(getClaudeConfigDir(), "plugins", "cache");
}
//@ chunk-f3qhjfah.js:4167-4415 placement
/**
 * 缓存目录路径转存储作用域（根、市场或插件级）。
 */
function pluginCacheStorageScope(path, versionRoot) {
  if (path === versionRoot)
    return versionRoot === getVersionFromPath()
      ? {
          namespace: "pluginCache",
        }
      : null;
  let parts = splitPluginCachePath(path, versionRoot);
  if (parts === null || parts.length > 2 || !areValidKeySegments(parts)) return null;
  let [marketplace, plugin] = parts;
  return plugin === undefined
    ? {
        namespace: "pluginCache",
        marketplace,
      }
    : {
        namespace: "pluginCache",
        marketplace,
        plugin,
      };
}
//@ chunk-e6aww6q8.js:4320786-4320831 placement
/**
 * enabledPluginSettings：设置里的启用插件表。
 */
function enabledPluginSettings(source) {
  return getSettingsForSourceWriteSeed(source)?.enabledPlugins;
}
//@ chunk-e6aww6q8.js:4320831-4320895 placement
/**
 * hasInstalledOfficialEntry：官方市场里有安装记录。
 */
function hasInstalledOfficialEntry(name) {
  return (
    getInstalledPlugins().plugins[`${name}@${OFFICIAL_MARKETPLACE_NAME}`]?.some(
      isInstallationRelevantToCurrentProject,
    ) ?? false
  );
}
//@ chunk-e6aww6q8.js:4320895-4320914 placement
var semverCompatPlugin; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4320895", () => {
  semverCompatPlugin = __toESM(require_semver_3(), 1);
});
//@ chunk-e6aww6q8.js:4321080-4321135 placement
/**
 * shortLowerPrefix：小写后的前 12 个字符。
 */
function shortLowerPrefix(sha) {
  return sha.toLowerCase().substring(0, 12);
}
//@ chunk-e6aww6q8.js:4321135-4321780 placement
/**
 * 官方插件目录插件（或已绑定仓库的）必须有列出的提交且拉取到的 commit 一致，否则返回拒绝消息； npm 或已绑定但本版本无法校验时也拒绝。通过时返回 reviewedCommit。
 */
function verifyReviewedCommit({ pluginId, pluginName, source, boundByRecord, fetched, action }) {
  {
    if (!boundByRecord && !pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
      return {
        ok: true,
        reviewedCommit: undefined,
      };
    let displayName = printableName(pluginName, 120);
    let expected = pinnedSha(pluginId, source);
    if (expected === undefined)
      return {
        ok: false,
        message: `"${displayName}" was not ${action}: its ${OFFICIAL_MARKETPLACE_DISPLAY} listing has no listed commit.`,
      };
    if (fetched !== undefined && fetched.gitCommitSha !== expected)
      return {
        ok: false,
        message: `"${displayName}" could not be verified at the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists, so it was not ${action}.`,
      };
    return {
      ok: true,
      reviewedCommit: expected,
    };
  }
  if (boundByRecord || isNpmPluginSource(pluginId))
    return {
      ok: false,
      message: `"${printableName(pluginName, 120)}" was not ${action}: this build of Claude Code cannot verify ${action === "installed" ? "it" : "the commit it was installed at"}.`,
    };
  return {
    ok: true,
    reviewedCommit: undefined,
  };
}
//@ chunk-e6aww6q8.js:4321780-4323479 fingerprint (2.1.88 match: calculatePluginVersion, 0.569)
/**
 * 计算插件版本（缓存目录名）：manifest.version > 条目 version > git commit sha（短）> archive sha256 > 内容哈希；command 来源按其输出目录内容哈希。
 */
async function calculatePluginVersion(
  pluginId,
  source,
  manifest,
  installPath,
  recorded,
  sha,
  contentSha,
  containmentRoot,
) {
  if (typeof source === "object" && source.source === "command") {
    if (!contentSha) {
      if (recorded?.version) {
        logForDebugging(
          `Using recorded version for command-sourced ${pluginId} (pre-fetch probe): ${recorded.version}`,
        );
        return recorded.version;
      }
      logForDebugging(
        `No content hash yet for command-sourced ${pluginId}; version unknown until the command runs`,
      );
      return "unknown";
    }
    let prefix = shortLowerPrefix(contentSha);
    let version = manifest?.version ? `${manifest.version}-${prefix}` : prefix;
    logForDebugging(`Using content-hash version for command-sourced ${pluginId}: ${version}`);
    return version;
  }
  if (typeof source === "object" && source.source === "claudeai") {
    let version = recorded?.version || source.version || "unknown";
    logForDebugging(`Using claude.ai catalog version for ${pluginId}: ${version}`);
    return version;
  }
  let pinned = pinnedSha(pluginId, source);
  let withPin = (version) => (pinned === undefined ? version : withShaSuffix(version, pinned));
  if (manifest?.version) {
    logForDebugging(`Using manifest version for ${pluginId}: ${manifest.version}`);
    return withPin(manifest.version);
  }
  if (recorded?.version) {
    logForDebugging(`Using ${recorded.kind} version for ${pluginId}: ${recorded.version}`);
    return recorded.kind === "installed" ? recorded.version : withPin(recorded.version);
  }
  if (sha) {
    let shortSha = sha.substring(0, 12);
    if (typeof source === "object" && source.source === "git-subdir") {
      let normPath = source.path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
      let pathHash = createHash("sha256").update(normPath).digest("hex").substring(0, 8);
      let v = `${shortSha}-${pathHash}`;
      logForDebugging(`Using git-subdir SHA+path version for ${pluginId}: ${v} (path=${normPath})`);
      return v;
    }
    logForDebugging(`Using pre-resolved git SHA for ${pluginId}: ${shortSha}`);
    return shortSha;
  }
  if (typeof source === "object" && source.source === "archive") {
    let sha256 = source.sha256 ?? contentSha;
    if (sha256) {
      let prefix = shortLowerPrefix(sha256);
      logForDebugging(
        `Using archive sha256 version for ${pluginId}: ${prefix}${source.sha256 ? " (pinned)" : " (downloaded)"}`,
      );
      return prefix;
    }
  }
  let isGitBacked = typeof source === "string" || getPluginCloneUrl(source) !== null;
  if (installPath && isGitBacked) {
    let sha = await pluginGitHead(installPath, containmentRoot);
    if (sha) {
      let shortSha = sha.substring(0, 12);
      logForDebugging(`Using git SHA for ${pluginId}: ${shortSha}`);
      return shortSha;
    }
    let sha_2 = await pluginVersionOrNull(installPath);
    if (sha_2) {
      let shortSha = sha_2.substring(0, 12);
      logForDebugging(`Using marketplace snapshot SHA for ${pluginId}: ${shortSha}`);
      return shortSha;
    }
  }
  logForDebugging(`No version found for ${pluginId}, using 'unknown'`);
  return "unknown";
}
//@ chunk-e6aww6q8.js:4323479-4323551 placement
/**
 * pluginGitHead：插件目录对应的 git HEAD。
 */
async function pluginGitHead(installPath, containmentRoot = installPath) {
  let head = await probePluginGitHead(installPath, containmentRoot);
  return head.repo ? head.sha : null;
}
//@ chunk-e6aww6q8.js:4323551-4323770 placement
/**
 * 探测插件目录的 git HEAD（位于插件目录仓库内时视为非仓库）。
 */
async function probePluginGitHead(installPath, containmentRoot = installPath) {
  let resolved = resolve_2(installPath);
  let head = await probeHeadForDirBounded(resolved, containmentRoot);
  if (!head.repo || head.sha === null) return head;
  let gitRoot = findGitRoot(resolved);
  if (gitRoot !== null) {
    let rel = relative(resolve_2(gitRoot), projectPluginsDir());
    if (rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`)))
      return {
        repo: false,
      };
  }
  return head;
}
//@ chunk-e6aww6q8.js:4323770-4323817 placement
/**
 * pluginVersionOrNull：取插件版本或 null。
 */
async function pluginVersionOrNull(path) {
  return (await marketplaceCommitSha(path)) ?? null;
}
//@ chunk-e6aww6q8.js:4323817-4323864 placement
/**
 * marketplaceCommitSha：市场仓库的提交 sha。
 */
async function marketplaceCommitSha(path) {
  return commitShaOf(await readMarketplaceCommit(path));
}
//@ chunk-e6aww6q8.js:4323864-4323978 placement
/**
 * 提交读取结果转 sha（absent/malformed 为 null）。
 */
function commitShaOf(commit) {
  switch (commit.kind) {
    case "commit":
      return commit.sha;
    case "absent":
    case "malformed":
      return null;
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:4323978-4324378 placement
/**
 * 读市场检出中记录的提交 sha。
 */
async function readMarketplaceCommit(installPath) {
  let marketplacesDir = resolve_2(projectPluginsDir(), "marketplaces");
  let rel = relative(marketplacesDir, resolve_2(installPath));
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    return {
      kind: "absent",
    };
  let marketplaceDir = join(marketplacesDir, rel.split(sep)[0]);
  try {
    let mcpAuthCache = await getMcpAuthCache_2(join(marketplaceDir, GCS_SHA_MARKER_FILE));
    if (mcpAuthCache.kind !== "ok")
      return {
        kind: mcpAuthCache.kind,
      };
    let lower = mcpAuthCache.content.trim().toLowerCase();
    return /^([0-9a-f]{40}|[0-9a-f]{64})$/.test(lower)
      ? {
          kind: "commit",
          sha: lower,
        }
      : {
          kind: "malformed",
        };
  } catch {
    return {
      kind: "read-failed",
    };
  }
}
//@ chunk-e6aww6q8.js:4324378-4324611 placement
/**
 * 插件源的 git 克隆 URL。
 */
function getPluginCloneUrl(source) {
  if (typeof source === "string") return null;
  switch (source.source) {
    case "github":
      return githubRepoToCloneUrl(source.repo);
    case "url":
      return source.url;
    case "git-subdir":
      return /^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(source.url)
        ? githubRepoToCloneUrl(source.url)
        : source.url;
    default:
      return null;
  }
}
//@ chunk-e6aww6q8.js:4324691-4324858 placement
/**
 * 市场源的克隆 URL（directory 为 file:）。
 */
function getMarketplaceCloneUrl(source) {
  if (!source) return null;
  switch (source.source) {
    case "github":
      return githubRepoToCloneUrl(source.repo);
    case "git":
      return source.url;
    case "directory":
      return pathToFileURL(source.path).href;
    default:
      return null;
  }
}
//@ chunk-e6aww6q8.js:4324858-4325080 placement
/**
 * 市场内相对路径插件转为 github/url/git-subdir 源。
 */
function toRelativePluginSource(source, source_2) {
  let marketplaceCloneUrl = getMarketplaceCloneUrl(source);
  if (marketplaceCloneUrl === null || !source) return null;
  let replaced = source_2.replace(/^\.(?:\/|$)/, "");
  if (replaced === "")
    return source.source === "github"
      ? {
          source: "github",
          repo: source.repo,
        }
      : {
          source: "url",
          url: marketplaceCloneUrl,
        };
  return {
    source: "git-subdir",
    url: marketplaceCloneUrl,
    path: replaced,
  };
}
//@ chunk-e6aww6q8.js:4325080-4325094 placement
var VERSION_FLAG_PREFIX = "--v";
//@ chunk-e6aww6q8.js:4325094-4325135 placement
/**
 * versionFlagSpec：版本范围标志串。
 */
function versionFlagSpec(name, version) {
  return `${name}${VERSION_FLAG_PREFIX}${version}`;
}
//@ chunk-e6aww6q8.js:4325135-4326097 placement
/**
 * 用 git ls-remote 解析插件版本范围对应的标签。
 */
async function resolveVersionRange(url, name, range, cache) {
  let urlError = pluginGitUrlError(url);
  if (urlError !== null) {
    logForDebugging(`resolveVersionRange: ${urlError.message}`);
    return null;
  }
  let listing = cache?.get(url);
  if (listing === undefined) {
    listing = lsRemoteMarketplace(url, {
      flags: ["--tags"],
    }).then((result) =>
      result.code !== 0 ? Promise.reject(Error(`ls-remote exit ${result.code}`)) : result.stdout,
    );
    cache?.set(url, listing);
  }
  let stdout;
  try {
    stdout = await listing;
  } catch (error) {
    cache?.delete(url);
    logForDebugging(
      `resolveVersionRange: ls-remote failed for ${redactUrlQuery(url)}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
  let tagPrefix = `${name}${VERSION_FLAG_PREFIX}`;
  let tags = new Map();
  for (let line of stdout.split(`
`)) {
    let index = line.indexOf("\t");
    if (index === -1) continue;
    let sha = line.slice(0, index);
    let sliced = line.slice(index + 1);
    if (!sliced.startsWith("refs/tags/")) continue;
    let sliced_2 = sliced.slice(10);
    let isPeeled = sliced_2.endsWith("^{}");
    if (isPeeled) sliced_2 = sliced_2.slice(0, -3);
    if (!sliced_2.startsWith(tagPrefix)) continue;
    let version = semverCompatPlugin.clean(sliced_2.slice(tagPrefix.length));
    if (version === null) continue;
    if (!isPeeled && tags.has(sliced_2)) continue;
    tags.set(sliced_2, {
      version,
      ref: sliced_2,
      sha,
    });
  }
  if (tags.size === 0) return null;
  let candidates = [...tags.values()];
  let best = semverCompatPlugin.maxSatisfying(
    candidates.map((candidate) => candidate.version),
    range,
  );
  if (best === null) return null;
  return candidates.find((candidate) => candidate.version === best) ?? null;
}
export {
  calculatePluginVersion,
  getPluginCloneUrl,
  getMarketplaceCloneUrl,
  resolveVersionRange,
  toRelativePluginSource,
  verifyReviewedCommit,
  shortLowerPrefix,
  probePluginGitHead,
  readMarketplaceCommit,
  commitShaOf,
  pluginCacheStorageScope,
  pluginVersionOrNull,
  pluginGitHead,
  getVersionFromPath,
  versionFlagSpec,
  enabledPluginSettings,
  hasInstalledOfficialEntry,
  marketplaceCommitSha,
};
