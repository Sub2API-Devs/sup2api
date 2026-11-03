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
import { createHash } from "crypto";
import { resolve as resolve_2, relative, isAbsolute, sep, join } from "path";
import { pathToFileURL } from "url";
import { getSettingsForSourceWriteSeed } from "../settings/settings.js";
import { getInstalledPlugins, isInstallationRelevantToCurrentProject } from "./installedPluginsManager.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isNpmPluginSource,
} from "./officialMarketplaceNames.js";
import { Re } from "../../../runtime/bun-runtime.js";
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
import { getClaudeConfigDir } from "../envUtils.js";
import { splitPluginCachePath } from "./pluginDirectories.js";
import { areValidKeySegments } from "../storage/storageSpaces.js";

//@ chunk-e6aww6q8.js:4320786-4320831 placement
/**
 * enabledPluginSettings：设置里的启用插件表。
 */
function enabledPluginSettings(e) {
  return getSettingsForSourceWriteSeed(e)?.enabledPlugins;
}
//@ chunk-e6aww6q8.js:4320831-4320895 placement
/**
 * hasInstalledOfficialEntry：官方市场里有安装记录。
 */
function hasInstalledOfficialEntry(e) {
  return (
    getInstalledPlugins().plugins[`${e}@${OFFICIAL_MARKETPLACE_NAME}`]?.some(
      isInstallationRelevantToCurrentProject,
    ) ?? false
  );
}
//@ chunk-e6aww6q8.js:4320895-4320914 placement
var semverCompatPlugin = Re(require_semver_3(), 1);
//@ chunk-e6aww6q8.js:4321080-4321135 placement
/**
 * shortLowerPrefix：小写后的前 12 个字符。
 */
function shortLowerPrefix(e) {
  return e.toLowerCase().substring(0, 12);
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
    let S = printableName(pluginName, 120);
    let w = pinnedSha(pluginId, source);
    if (w === undefined)
      return {
        ok: false,
        message: `"${S}" was not ${action}: its ${OFFICIAL_MARKETPLACE_DISPLAY} listing has no listed commit.`,
      };
    if (fetched !== undefined && fetched.gitCommitSha !== w)
      return {
        ok: false,
        message: `"${S}" could not be verified at the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists, so it was not ${action}.`,
      };
    return {
      ok: true,
      reviewedCommit: w,
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
//@ chunk-e6aww6q8.js:4321780-4323479 fingerprint = calculatePluginVersion (0.569)
/**
 * 计算插件版本（缓存目录名）：manifest.version > 条目 version > git commit sha（短）> archive sha256 > 内容哈希；command 来源按其输出目录内容哈希。
 */
async function calculatePluginVersion(pluginId, source, r, installPath, h, y, S, w) {
  if (typeof source === "object" && source.source === "command") {
    if (!S) {
      if (h?.version) {
        logForDebugging(
          `Using recorded version for command-sourced ${pluginId} (pre-fetch probe): ${h.version}`,
        );
        return h.version;
      }
      logForDebugging(
        `No content hash yet for command-sourced ${pluginId}; version unknown until the command runs`,
      );
      return "unknown";
    }
    let Z = shortLowerPrefix(S);
    let Se = r?.version ? `${r.version}-${Z}` : Z;
    logForDebugging(`Using content-hash version for command-sourced ${pluginId}: ${Se}`);
    return Se;
  }
  if (typeof source === "object" && source.source === "claudeai") {
    let Z = h?.version || source.version || "unknown";
    logForDebugging(`Using claude.ai catalog version for ${pluginId}: ${Z}`);
    return Z;
  }
  let L = pinnedSha(pluginId, source);
  let G = (version) => (L === undefined ? version : withShaSuffix(version, L));
  if (r?.version) {
    logForDebugging(`Using manifest version for ${pluginId}: ${r.version}`);
    return G(r.version);
  }
  if (h?.version) {
    logForDebugging(`Using ${h.kind} version for ${pluginId}: ${h.version}`);
    return h.kind === "installed" ? h.version : G(h.version);
  }
  if (y) {
    let shortSha = y.substring(0, 12);
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
    let sha256 = source.sha256 ?? S;
    if (sha256) {
      let Se = shortLowerPrefix(sha256);
      logForDebugging(
        `Using archive sha256 version for ${pluginId}: ${Se}${source.sha256 ? " (pinned)" : " (downloaded)"}`,
      );
      return Se;
    }
  }
  let q = typeof source === "string" || getPluginCloneUrl(source) !== null;
  if (installPath && q) {
    let sha = await pluginGitHead(installPath, w);
    if (sha) {
      let ke = sha.substring(0, 12);
      logForDebugging(`Using git SHA for ${pluginId}: ${ke}`);
      return ke;
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
async function pluginGitHead(e, n = e) {
  let r = await probePluginGitHead(e, n);
  return r.repo ? r.sha : null;
}
//@ chunk-e6aww6q8.js:4323551-4323770 placement
/**
 * 探测插件目录的 git HEAD（位于插件目录仓库内时视为非仓库）。
 */
async function probePluginGitHead(e, n = e) {
  let r = resolve_2(e);
  let s = await probeHeadForDirBounded(r, n);
  if (!s.repo || s.sha === null) return s;
  let gitRoot = findGitRoot(r);
  if (gitRoot !== null) {
    let y = relative(resolve_2(gitRoot), projectPluginsDir());
    if (y === "" || (!isAbsolute(y) && y !== ".." && !y.startsWith(`..${sep}`)))
      return {
        repo: false,
      };
  }
  return s;
}
//@ chunk-e6aww6q8.js:4323770-4323817 placement
/**
 * pluginVersionOrNull：取插件版本或 null。
 */
async function pluginVersionOrNull(e) {
  return (await marketplaceCommitSha(e)) ?? null;
}
//@ chunk-e6aww6q8.js:4323817-4323864 placement
/**
 * marketplaceCommitSha：市场仓库的提交 sha。
 */
async function marketplaceCommitSha(e) {
  return commitShaOf(await readMarketplaceCommit(e));
}
//@ chunk-e6aww6q8.js:4323864-4323978 placement
/**
 * 提交读取结果转 sha（absent/malformed 为 null）。
 */
function commitShaOf(e) {
  switch (e.kind) {
    case "commit":
      return e.sha;
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
async function readMarketplaceCommit(e) {
  let n = resolve_2(projectPluginsDir(), "marketplaces");
  let r = relative(n, resolve_2(e));
  if (r === "" || r === ".." || r.startsWith(`..${sep}`) || isAbsolute(r))
    return {
      kind: "absent",
    };
  let s = join(n, r.split(sep)[0]);
  try {
    let mcpAuthCache = await getMcpAuthCache_2(join(s, GCS_SHA_MARKER_FILE));
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
function versionFlagSpec(e, n) {
  return `${e}${VERSION_FLAG_PREFIX}${n}`;
}
//@ chunk-e6aww6q8.js:4325135-4326097 placement
/**
 * 用 git ls-remote 解析插件版本范围对应的标签。
 */
async function resolveVersionRange(e, name, range, s) {
  let h = pluginGitUrlError(e);
  if (h !== null) {
    logForDebugging(`resolveVersionRange: ${h.message}`);
    return null;
  }
  let y = s?.get(e);
  if (y === undefined) {
    y = lsRemoteMarketplace(e, {
      flags: ["--tags"],
    }).then((Z) => (Z.code !== 0 ? Promise.reject(Error(`ls-remote exit ${Z.code}`)) : Z.stdout));
    s?.set(e, y);
  }
  let S;
  try {
    S = await y;
  } catch (error) {
    s?.delete(e);
    logForDebugging(
      `resolveVersionRange: ls-remote failed for ${redactUrlQuery(e)}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
  let w = `${name}${VERSION_FLAG_PREFIX}`;
  let L = new Map();
  for (let line of S.split(`
`)) {
    let index = line.indexOf("\t");
    if (index === -1) continue;
    let sha = line.slice(0, index);
    let sliced = line.slice(index + 1);
    if (!sliced.startsWith("refs/tags/")) continue;
    let sliced_2 = sliced.slice(10);
    let Ae = sliced_2.endsWith("^{}");
    if (Ae) sliced_2 = sliced_2.slice(0, -3);
    if (!sliced_2.startsWith(w)) continue;
    let Ie = semverCompatPlugin.clean(sliced_2.slice(w.length));
    if (Ie === null) continue;
    if (!Ae && L.has(sliced_2)) continue;
    L.set(sliced_2, {
      version: Ie,
      ref: sliced_2,
      sha,
    });
  }
  if (L.size === 0) return null;
  let G = [...L.values()];
  let q = semverCompatPlugin.maxSatisfying(
    G.map((Z) => Z.version),
    range,
  );
  if (q === null) return null;
  return G.find((Z) => Z.version === q) ?? null;
}
//@ chunk-f3qhjfah.js:2695-2741 fingerprint = getVersionFromPath (0.904)
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
function pluginCacheStorageScope(e, n) {
  if (e === n)
    return n === getVersionFromPath()
      ? {
          namespace: "pluginCache",
        }
      : null;
  let r = splitPluginCachePath(e, n);
  if (r === null || r.length > 2 || !areValidKeySegments(r)) return null;
  let [s, a] = r;
  return a === undefined
    ? {
        namespace: "pluginCache",
        marketplace: s,
      }
    : {
        namespace: "pluginCache",
        marketplace: s,
        plugin: a,
      };
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
