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
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import { pathToFileURL, pathToFileURL as pathToFileURL_2, pathToFileURL as pathToFileURL_3 } from "url";
import { getSettingsForSourceWriteSeed } from "../settings/settings.js";
import { getInstalledPlugins, isInstallationRelevantToCurrentProject } from "./installedPluginsManager.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isNpmPluginSource,
} from "./officialMarketplaceNames.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { Vy } from "../../../vendor/semver/index.js";
import { printableName } from "../printableName.js";
import { pinnedSha, withShaSuffix } from "./pluginSourceUrl.js";
import { logForDebugging } from "../debug.js";
import { probeHeadForDirBounded } from "../git/gitFilesystem.js";
import { findGitRoot } from "../git.js";
import { projectPluginsDir } from "./pluginCachePaths.js";
import { getMcpAuthCache as getMcpAuthCache_2 } from "./safeFileRead.js";
import { ICt } from "./cacheUtils.js";
import { githubRepoToCloneUrl } from "./pluginLoader.js";
import { krt } from "./pluginDirectoryTelemetry.js";
import { lsRemoteMarketplace } from "./marketplaceGitCheckout.js";
import { redactUrlQuery } from "../redaction/urlRedaction.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { splitPluginCachePath } from "./pluginDirectories.js";
import { uA } from "../storage/storageSpaces.js";

//@ chunk-e6aww6q8.js:4320786-4320831 placement
function K1n(e) {
  return getSettingsForSourceWriteSeed(e)?.enabledPlugins;
}
//@ chunk-e6aww6q8.js:4320831-4320895 placement
function FGn(e) {
  return (
    getInstalledPlugins().plugins[`${e}@${OFFICIAL_MARKETPLACE_NAME}`]?.some(
      isInstallationRelevantToCurrentProject,
    ) ?? !1
  );
}
//@ chunk-e6aww6q8.js:4320895-4320914 placement
var XIe = Re(Vy(), 1);
//@ chunk-e6aww6q8.js:4321080-4321135 placement
function VGr(e) {
  return e.toLowerCase().substring(0, 12);
}
/**
 * 官方插件目录插件（或已绑定仓库的）必须有列出的提交且拉取到的 commit 一致，否则返回拒绝消息； npm 或已绑定但本版本无法校验时也拒绝。通过时返回 reviewedCommit。
 */
//@ chunk-e6aww6q8.js:4321135-4321780 placement
function verifyReviewedCommit({
  pluginId: pluginId,
  pluginName: pluginName,
  source: source,
  boundByRecord: boundByRecord,
  fetched: fetched,
  action: action,
}) {
  {
    if (!boundByRecord && !pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
      return { ok: !0, reviewedCommit: void 0 };
    let S = printableName(pluginName, 120),
      w = pinnedSha(pluginId, source);
    if (w === void 0)
      return {
        ok: !1,
        message: `"${S}" was not ${action}: its ${OFFICIAL_MARKETPLACE_DISPLAY} listing has no listed commit.`,
      };
    if (fetched !== void 0 && fetched.gitCommitSha !== w)
      return {
        ok: !1,
        message: `"${S}" could not be verified at the commit the ${OFFICIAL_MARKETPLACE_DISPLAY} lists, so it was not ${action}.`,
      };
    return { ok: !0, reviewedCommit: w };
  }
  if (boundByRecord || isNpmPluginSource(pluginId))
    return {
      ok: !1,
      message: `"${printableName(pluginName, 120)}" was not ${action}: this build of Claude Code cannot verify ${action === "installed" ? "it" : "the commit it was installed at"}.`,
    };
  return { ok: !0, reviewedCommit: void 0 };
}
/**
 * 计算插件版本（缓存目录名）：manifest.version > 条目 version > git commit sha（短）> archive sha256 > 内容哈希；command 来源按其输出目录内容哈希。
 */
//@ chunk-e6aww6q8.js:4321780-4323479 fingerprint = calculatePluginVersion (0.569)
async function calculatePluginVersion(pluginId, source, r, s, h, y, S, w) {
  if (typeof source === "object" && source.source === "command") {
    if (!S) {
      if (h?.version)
        return (
          logForDebugging(
            `Using recorded version for command-sourced ${pluginId} (pre-fetch probe): ${h.version}`,
          ),
          h.version
        );
      return (
        logForDebugging(
          `No content hash yet for command-sourced ${pluginId}; version unknown until the command runs`,
        ),
        "unknown"
      );
    }
    let Z = VGr(S),
      Se = r?.version ? `${r.version}-${Z}` : Z;
    return (logForDebugging(`Using content-hash version for command-sourced ${pluginId}: ${Se}`), Se);
  }
  if (typeof source === "object" && source.source === "claudeai") {
    let Z = h?.version || source.version || "unknown";
    return (logForDebugging(`Using claude.ai catalog version for ${pluginId}: ${Z}`), Z);
  }
  let L = pinnedSha(pluginId, source),
    G = (Z) => (L === void 0 ? Z : withShaSuffix(Z, L));
  if (r?.version)
    return (logForDebugging(`Using manifest version for ${pluginId}: ${r.version}`), G(r.version));
  if (h?.version)
    return (
      logForDebugging(`Using ${h.kind} version for ${pluginId}: ${h.version}`),
      h.kind === "installed" ? h.version : G(h.version)
    );
  if (y) {
    let shortSha = y.substring(0, 12);
    if (typeof source === "object" && source.source === "git-subdir") {
      let normPath = source.path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, ""),
        pathHash = createHash_21("sha256").update(normPath).digest("hex").substring(0, 8),
        we = `${shortSha}-${pathHash}`;
      return (
        logForDebugging(`Using git-subdir SHA+path version for ${pluginId}: ${we} (path=${normPath})`),
        we
      );
    }
    return (logForDebugging(`Using pre-resolved git SHA for ${pluginId}: ${shortSha}`), shortSha);
  }
  if (typeof source === "object" && source.source === "archive") {
    let Z = source.sha256 ?? S;
    if (Z) {
      let Se = VGr(Z);
      return (
        logForDebugging(
          `Using archive sha256 version for ${pluginId}: ${Se}${source.sha256 ? " (pinned)" : " (downloaded)"}`,
        ),
        Se
      );
    }
  }
  let q = typeof source === "string" || getPluginCloneUrl(source) !== null;
  if (s && q) {
    let Z = await Yse(s, w);
    if (Z) {
      let substring = Z.substring(0, 12);
      return (logForDebugging(`Using git SHA for ${pluginId}: ${substring}`), substring);
    }
    let sha = await Xj(s);
    if (sha) {
      let shortSha = sha.substring(0, 12);
      return (logForDebugging(`Using marketplace snapshot SHA for ${pluginId}: ${shortSha}`), shortSha);
    }
  }
  return (logForDebugging(`No version found for ${pluginId}, using 'unknown'`), "unknown");
}
//@ chunk-e6aww6q8.js:4323479-4323551 placement
async function Yse(e, n = e) {
  let r = await probePluginGitHead(e, n);
  return r.repo ? r.sha : null;
}
/**
 * 探测插件目录的 git HEAD（位于插件目录仓库内时视为非仓库）。
 */
//@ chunk-e6aww6q8.js:4323551-4323770 placement
async function probePluginGitHead(e, n = e) {
  let r = resolve_56(e),
    s = await probeHeadForDirBounded(r, n);
  if (!s.repo || s.sha === null) return s;
  let h = findGitRoot(r);
  if (h !== null) {
    let y = relative_46(resolve_56(h), projectPluginsDir());
    if (y === "" || (!isAbsolute_54(y) && y !== ".." && !y.startsWith(`..${sep_68}`))) return { repo: !1 };
  }
  return s;
}
//@ chunk-e6aww6q8.js:4323770-4323817 placement
async function Xj(e) {
  return (await pct(e)) ?? null;
}
//@ chunk-e6aww6q8.js:4323817-4323864 placement
async function pct(e) {
  return commitShaOf(await readMarketplaceCommit(e));
}
/**
 * 提交读取结果转 sha（absent/malformed 为 null）。
 */
//@ chunk-e6aww6q8.js:4323864-4323978 placement
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
/**
 * 读市场检出中记录的提交 sha。
 */
//@ chunk-e6aww6q8.js:4323978-4324378 placement
async function readMarketplaceCommit(e) {
  let n = resolve_56(projectPluginsDir(), "marketplaces"),
    r = relative_46(n, resolve_56(e));
  if (r === "" || r === ".." || r.startsWith(`..${sep_68}`) || isAbsolute_54(r)) return { kind: "absent" };
  let s = join_119(n, r.split(sep_68)[0]);
  try {
    let h = await getMcpAuthCache_2(join_119(s, ICt));
    if (h.kind !== "ok") return { kind: h.kind };
    let lower = h.content.trim().toLowerCase();
    return /^([0-9a-f]{40}|[0-9a-f]{64})$/.test(lower)
      ? { kind: "commit", sha: lower }
      : { kind: "malformed" };
  } catch {
    return { kind: "read-failed" };
  }
}
/**
 * 插件源的 git 克隆 URL。
 */
//@ chunk-e6aww6q8.js:4324378-4324611 placement
function getPluginCloneUrl(e) {
  if (typeof e === "string") return null;
  switch (e.source) {
    case "github":
      return githubRepoToCloneUrl(e.repo);
    case "url":
      return e.url;
    case "git-subdir":
      return /^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(e.url) ? githubRepoToCloneUrl(e.url) : e.url;
    default:
      return null;
  }
}
/**
 * 市场源的克隆 URL（directory 为 file:）。
 */
//@ chunk-e6aww6q8.js:4324691-4324858 placement
function getMarketplaceCloneUrl(e) {
  if (!e) return null;
  switch (e.source) {
    case "github":
      return githubRepoToCloneUrl(e.repo);
    case "git":
      return e.url;
    case "directory":
      return pathToFileURL_2(e.path).href;
    default:
      return null;
  }
}
/**
 * 市场内相对路径插件转为 github/url/git-subdir 源。
 */
//@ chunk-e6aww6q8.js:4324858-4325080 placement
function toRelativePluginSource(e, n) {
  let r = getMarketplaceCloneUrl(e);
  if (r === null || !e) return null;
  let replaced = n.replace(/^\.(?:\/|$)/, "");
  if (replaced === "")
    return e.source === "github" ? { source: "github", repo: e.repo } : { source: "url", url: r };
  return { source: "git-subdir", url: r, path: replaced };
}
//@ chunk-e6aww6q8.js:4325080-4325094 placement
var jGn = "--v";
//@ chunk-e6aww6q8.js:4325094-4325135 placement
function j3s(e, n) {
  return `${e}${jGn}${n}`;
}
/**
 * 用 git ls-remote 解析插件版本范围对应的标签。
 */
//@ chunk-e6aww6q8.js:4325135-4326097 placement
async function resolveVersionRange(e, n, r, s) {
  let h = krt(e);
  if (h !== null) return (logForDebugging(`resolveVersionRange: ${h.message}`), null);
  let y = s?.get(e);
  if (y === void 0)
    ((y = lsRemoteMarketplace(e, { flags: ["--tags"] }).then((Z) =>
      Z.code !== 0 ? Promise.reject(Error(`ls-remote exit ${Z.code}`)) : Z.stdout,
    )),
      s?.set(e, y));
  let S;
  try {
    S = await y;
  } catch (error) {
    return (
      s?.delete(e),
      logForDebugging(
        `resolveVersionRange: ls-remote failed for ${redactUrlQuery(e)}: ${error instanceof Error ? error.message : String(error)}`,
      ),
      null
    );
  }
  let w = `${n}${jGn}`,
    L = new Map();
  for (let Z of S.split(`
`)) {
    let index = Z.indexOf("\t");
    if (index === -1) continue;
    let sliced = Z.slice(0, index),
      sliced_2 = Z.slice(index + 1);
    if (!sliced_2.startsWith("refs/tags/")) continue;
    let sliced_3 = sliced_2.slice(10),
      endsWith = sliced_3.endsWith("^{}");
    if (endsWith) sliced_3 = sliced_3.slice(0, -3);
    if (!sliced_3.startsWith(w)) continue;
    let clean = XIe.clean(sliced_3.slice(w.length));
    if (clean === null) continue;
    if (!endsWith && L.has(sliced_3)) continue;
    L.set(sliced_3, { version: clean, ref: sliced_3, sha: sliced });
  }
  if (L.size === 0) return null;
  let G = [...L.values()],
    maxSatisfying = XIe.maxSatisfying(
      G.map((Z) => Z.version),
      r,
    );
  if (maxSatisfying === null) return null;
  return G.find((Z) => Z.version === maxSatisfying) ?? null;
}
/**
 * 旧版插件缓存根目录 <configHome>/plugins/cache。
 */
//@ chunk-f3qhjfah.js:2695-2741 fingerprint = getVersionFromPath (0.904)
function getVersionFromPath() {
  return join_2(getClaudeConfigDir(), "plugins", "cache");
}
/**
 * 缓存目录路径转存储作用域（根、市场或插件级）。
 */
//@ chunk-f3qhjfah.js:4167-4415 placement
function pluginCacheStorageScope(e, n) {
  if (e === n) return n === getVersionFromPath() ? { namespace: "pluginCache" } : null;
  let r = splitPluginCachePath(e, n);
  if (r === null || r.length > 2 || !uA(r)) return null;
  let [s, a] = r;
  return a === void 0
    ? { namespace: "pluginCache", marketplace: s }
    : { namespace: "pluginCache", marketplace: s, plugin: a };
}

export {
  calculatePluginVersion,
  getPluginCloneUrl,
  getMarketplaceCloneUrl,
  resolveVersionRange,
  toRelativePluginSource,
  verifyReviewedCommit,
  VGr,
  probePluginGitHead,
  readMarketplaceCommit,
  commitShaOf,
  pluginCacheStorageScope,
  Xj,
  Yse,
  getVersionFromPath,
  j3s,
  K1n,
  FGn,
  pct,
};
