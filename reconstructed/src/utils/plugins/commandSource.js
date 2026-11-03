/**
 * utils/plugins/commandSource.ts
 *
 * 插件命令源（command source）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-21ppfwx8.js (56)
 * attribution: placement 56
 */
import { spawn } from "child_process";
import { join, isAbsolute, relative, sep, dirname, resolve } from "path";
import {
  readdir,
  stat,
  realpath,
  lstat,
  open,
  readlink,
  mkdir,
  symlink,
  writeFile,
  rename,
  readFile,
} from "fs/promises";
import { homedir } from "os";
import { createHash } from "crypto";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getPluginsDirectory } from "./pluginDirectories.js";
import { stripWin32DevicePrefix, isPathWithin } from "../fsJunctions.js";
import { projectPluginsDir, isFreshTimestamp, recordProducerDir } from "./pluginCachePaths.js";
import { getPlatform } from "../platform.js";
import {
  isTrustedLocalWindowsPath,
  realpathAllowMissing,
  isUntrustedLinkPath,
  traversesOrResolvesUntrustedLink,
  resolvePathChain,
  traversesUntrustedLink,
} from "../pathResolution.js";
import { isNetworkMountRoot, isNetworkRelatedPath, foldCase_2 } from "../networkPaths.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { getClaudeConfigDir, isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { uniq } from "../collections.js";
import {
  getOriginalCwd,
  getAdditionalDirectoriesForClaudeMd,
  isHomeDirectorySession,
  getHomeTrustDialogAccepted,
} from "../../bootstrap/state.js";
import { findGitRoot } from "../git.js";
import { noUncachedRoot } from "../settings/settingsStorage.js";
import { isDisklessSession, DISKLESS_PROGRAM_REFUSAL } from "../disklessSession.js";
import { cgroupSpawnOptions } from "../toolCgroup.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { killProcessGroup } from "../auth/lockHolderLiveness.js";
import { printableName } from "../printableName.js";
import { logForDebugging } from "../debug.js";
import { subprocessEnv } from "../subprocessEnv.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isENOENT,
  errorMessage,
} from "../errors.js";
import { classifyDirEntry, classifyDirEntrySafe, removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { pluginLinkSchema, PLUGIN_LINK_FILE_2, PLUGIN_LINK_FILE } from "./pluginLinks.js";
import { MAX_CONSENT_COMMAND_LENGTH } from "./schemas.js";
import { runCommandHint } from "../worktreeResumeHint.js";
import { hasDotSegmentAlias } from "../pathClassification.js";
import { matchesSegmentOrTempName } from "../pathSegments.js";
import { CACHE_META_FILES } from "./cacheUtils.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import {
  areCommandPluginSourcesDisabledByPolicy,
  noteHeldForTheAnswer,
  commandPluginSourcesDisabledMessage,
} from "./marketplacePolicy.js";
import { marketplaceNameAnswerState } from "./marketplaceNames.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { isWorkspacePersistedTrusted } from "../config.js";
import { checkPluginBunOptions } from "../permissions/protectedSettingsPaths.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { jsonParse } from "../slowOperations.js";
import { isPlainObject } from "../isPlainObject.js";
import { listSecretEnvNames } from "../settings/policyHelper/helperEnv.js";
import { sanitizeEnvCredentials } from "../settings/policyHelper/helperExec.js";
import { logError } from "../log.js";
import { withDeadline } from "../sleep.js";

//@ chunk-21ppfwx8.js:1536-1597 placement
/**
 * shouldRefreshCommandPlugins：命令源插件是否需要刷新。
 */
function shouldRefreshCommandPlugins() {
  if (isEssentialTrafficOnly()) return false;
  if (isPluginsDirOnLocalDisk()) return false;
  return commandSourceRefreshEnabled();
}
//@ chunk-21ppfwx8.js:1597-1661 placement
/**
 * commandSourceRefreshEnabled：命令源刷新开关。
 */
function commandSourceRefreshEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_command_source_refresh", true);
}
//@ chunk-21ppfwx8.js:1661-1674 placement
var COMMAND_SOURCE_FETCH_TIMEOUT_MS = 30000;
//@ chunk-21ppfwx8.js:1674-1979 placement
/**
 * 判断插件目录是否在可信本地文件系统上（Windows 用 SLi，其他平台 yl）；否则对项目插件目录做 realpath 检查并缓存， 配置目录在其下返回 false，最后检查与已知可疑根（be()）是否互相包含。命令源安装、更新前调用。
 */
function isPluginsDirOnLocalDisk() {
  let pluginsDirectory = getPluginsDirectory();
  let n = stripWin32DevicePrefix(projectPluginsDir());
  if (
    getPlatform() === "windows"
      ? isTrustedLocalWindowsPath(pluginsDirectory)
      : isNetworkMountRoot(pluginsDirectory)
  )
    return true;
  let provenLocalRoots = getPluginRegistry().provenLocalRoots;
  let i = provenLocalRoots.get(n);
  if (i === undefined || !isFreshTimestamp(i, COMMAND_SOURCE_FETCH_TIMEOUT_MS)) {
    if (
      realpathAllowMissing(n, {
        allowLocalWsl: true,
      })
    ) {
      provenLocalRoots.delete(n);
      return true;
    }
    provenLocalRoots.set(n, Date.now());
  }
  if (isPathWithin(getClaudeConfigDir(), n)) return false;
  return trustedLocalRoots().some(
    (o) =>
      isPathWithin(n, o, {
        foldCase: true,
      }) ||
      isPathWithin(o, n, {
        foldCase: true,
      }),
  );
}
//@ chunk-21ppfwx8.js:1979-2070 placement
function trustedLocalRoots() {
  return uniq(
    [getOriginalCwd(), ...getAdditionalDirectoriesForClaudeMd()].flatMap((e) =>
      [e, findGitRoot(e), noUncachedRoot(e)].filter((n) => n !== null),
    ),
  );
}
//@ chunk-21ppfwx8.js:2401-2478 placement
var COMMAND_SOURCE_KINDS = ["local", "npm", "github", "git", "subdir", "archive", "command", "unknown"];
//@ chunk-21ppfwx8.js:2478-2590 placement
/**
 * temp_<名>_<时间戳>_<随机串> 临时缓存目录名。
 */
function makeTempCachePathName(temporaryCacheNameForPlugin) {
  let padded = Math.random()
    .toString(36)
    .slice(2, 2 + TEMP_CACHE_DIR_MAX_RANDOM)
    .padEnd(1, "0");
  return `${TEMP}${temporaryCacheNameForPlugin}_${Date.now()}_${padded}`;
}
//@ chunk-21ppfwx8.js:2590-2722 placement
/**
 * TEMP_CACHE_DIR_MAX_RANDOM：临时缓存目录名随机段长度；TEMP_CACHE_LINK_SUFFIX：临时缓存目录的 link 后缀；TEMP_CACHE_CLONE_SUFFIX：临时缓存目录的 clone 后缀（同一声明共 3 个绑定）。
 */
var TEMP = "temp_";
var TEMP_CACHE_DIR_MAX_RANDOM = 6;
var TEMP_CACHE_LINK_SUFFIX = "_x";
var TEMP_CACHE_CLONE_SUFFIX = ".clone";
var regExp = new RegExp(
  `^${TEMP}(?:${COMMAND_SOURCE_KINDS.join("|")})_(\\d{10,})_[a-z0-9]{1,${TEMP_CACHE_DIR_MAX_RANDOM}}(?:${TEMP_CACHE_LINK_SUFFIX}|\\${TEMP_CACHE_CLONE_SUFFIX})?$`,
);
//@ chunk-21ppfwx8.js:2722-2761 placement
function linkingTempName(e, pid) {
  return `${e}${LINKING_DIR_PREFIX}${pid}`;
}
//@ chunk-21ppfwx8.js:2761-2813 placement
var LINKING_DIR_PREFIX = ".linking-";
var regExp_2 = new RegExp(`\\${LINKING_DIR_PREFIX}(\\d+)$`);
//@ chunk-21ppfwx8.js:2852-2864 placement
var COMMAND_SOURCE_MAX_OUTPUT = 2000;
//@ chunk-21ppfwx8.js:2864-4508 placement
function spawnCommandSource(command, { cwd, env, timeoutMs, maxStdoutBytes, maxStderrBytes }) {
  if (isDisklessSession())
    return Promise.resolve({
      kind: "spawn-error",
      message: DISKLESS_PROGRAM_REFUSAL,
      stdout: "",
      stderr: "",
    });
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let h = 0;
    let p = 0;
    let w = false;
    let S = false;
    let A;
    let b;
    let _ = spawn(command, [], {
      shell: true,
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: getPlatform() !== "windows",
      windowsHide: true,
      ...cgroupSpawnOptions("plugin"),
    });
    let Ae = registerCleanup(async () => {
      if (!w && _.pid !== undefined) await killProcessGroup(_.pid, "SIGKILL");
    });
    function P(y) {
      if (w) return;
      w = true;
      Ae();
      clearTimeout(timer);
      if (b) clearTimeout(b);
      _.stdout?.removeAllListeners("data");
      _.stderr?.removeAllListeners("data");
      _.stdout?.destroy();
      _.stderr?.destroy();
      resolve(y);
    }
    function q(y) {
      if (A) return;
      A = y;
      _.stdout?.removeAllListeners("data");
      _.stderr?.removeAllListeners("data");
      _.stdout?.pause();
      _.stderr?.pause();
      let T = {
        kind: y,
        stdout,
        stderr,
      };
      let N = () => {
        if (w) return;
        if (S) {
          P(T);
          return;
        }
        let x = () => P(T);
        _.once("exit", x);
        b = setTimeout((G) => G(), COMMAND_SOURCE_MAX_OUTPUT, x);
        if (typeof b === "object") b.unref();
      };
      if (_.pid === undefined) {
        P(T);
        return;
      }
      killProcessGroup(_.pid, "SIGKILL").then(N, N);
    }
    let timer = setTimeout((y) => y("timed-out"), timeoutMs, q);
    _.stdout?.setEncoding("utf8");
    _.stderr?.setEncoding("utf8");
    _.stdout?.on("data", (y) => {
      h += Buffer.byteLength(y);
      if (h > maxStdoutBytes) {
        q("stdout-overflow");
        return;
      }
      stdout += y;
    });
    _.stderr?.on("data", (y) => {
      if (p >= maxStderrBytes) return;
      p += Buffer.byteLength(y);
      stderr += y;
    });
    _.once("error", (y) => {
      P({
        kind: "spawn-error",
        message: y.message,
        stdout,
        stderr,
      });
    });
    function J(y, T) {
      if (A) return;
      if (typeof y === "number")
        P({
          kind: "exited",
          exitCode: y,
          stdout,
          stderr,
        });
      else
        P({
          kind: "signaled",
          signal: T ?? "unknown",
          stdout,
          stderr,
        });
    }
    _.once("exit", (y, T) => {
      S = true;
      if (w || A) return;
      clearTimeout(timer);
      b = setTimeout((N, x, G) => N(x, G), COMMAND_SOURCE_MAX_OUTPUT, J, y, T);
      if (typeof b === "object") b.unref();
    });
    _.once("close", (y, T) => {
      J(y, T);
    });
  });
}
//@ chunk-21ppfwx8.js:4586-4837 placement
/**
 * 插件布局常量：.claude-plugin 目录、其中的 plugin.json 与 marketplace.json 相对路径、组件目录（commands/skills/agents/…）、 根目录识别文件（SKILL.md、.mcp.json、.lsp.json）与它们的合集。
 */
var PLUGIN_MANIFEST_DIR = ".claude-plugin";
var PLUGIN_MANIFEST_PATH = join(PLUGIN_MANIFEST_DIR, "plugin.json");
var PLUGIN_JSON = "plugin.json";
var MARKETPLACE_MANIFEST_PATH = join(PLUGIN_MANIFEST_DIR, "marketplace.json");
var PLUGIN_COMPONENT_DIRS = [
  "commands",
  "skills",
  "agents",
  "hooks",
  "themes",
  "output-styles",
  "monitors",
  "workflows",
];
var PLUGIN_ROOT_MARKER_FILES = ["SKILL.md", ".mcp.json", ".lsp.json"];
var PLUGIN_ROOT_MARKERS = [PLUGIN_MANIFEST_DIR, ...PLUGIN_COMPONENT_DIRS, ...PLUGIN_ROOT_MARKER_FILES];
//@ chunk-21ppfwx8.js:4837-4909 placement
/**
 * pluginRootHasMarker：目录下是否有插件根标记。
 */
async function pluginRootHasMarker(e) {
  return (await readdir(e)).filter((r) => !isJunkEntryName(r)).some(isPluginRootMarker);
}
//@ chunk-21ppfwx8.js:4909-5199 placement
/**
 * 定位解压后的插件根：本层有 .claude-plugin 就返回本层；只有一个子目录且其中有 .claude-plugin（或像插件根）则返回子目录。
 */
async function findPluginRootInExtracted(e) {
  let filtered = (
    await readdir(e, {
      withFileTypes: true,
    })
  ).filter((r) => !isJunkEntryName(r.name));
  if (filtered.some((r) => r.name === ".claude-plugin")) return e;
  if (filtered.length === 1 && filtered[0].isDirectory()) {
    let r = join(e, filtered[0].name);
    if (await pathExists(join(r, ".claude-plugin"))) return r;
    if (!isPluginRootMarker(filtered[0].name) && (await pluginRootHasMarker(r))) return r;
  }
  return e;
}
//@ chunk-21ppfwx8.js:5199-5238 placement
/**
 * isPluginRootMarker：是否为插件根标记文件名。
 */
function isPluginRootMarker(name) {
  return PLUGIN_ROOT_MARKERS.includes(name);
}
//@ chunk-21ppfwx8.js:5238-5277 placement
/**
 * isPluginComponentDir：是否为插件组件目录名。
 */
function isPluginComponentDir(e) {
  return PLUGIN_COMPONENT_DIRS.includes(e);
}
//@ chunk-21ppfwx8.js:5277-5340 placement
async function pathExists(e) {
  try {
    await stat(e);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-21ppfwx8.js:5340-5394 placement
function isJunkEntryName(e) {
  return e === "__MACOSX" || e === ".DS_Store";
}
//@ chunk-21ppfwx8.js:5394-5467 placement
var COMMAND_SOURCE_KILL_GRACE_MS = 60;
var COMMAND_SOURCE_MAX_FILE_BYTES = 65536;
var COMMAND_SOURCE_MAX_TOTAL_BYTES = 65536;
var COMMAND_SOURCE_MAX_ENTRIES = 500;
var COMMAND_SOURCE_MAX_SCAN_BYTES = 268435456;
var MAX_COMMAND_SOURCE_NAME_LENGTH = 20000;
var PLUGIN_ROOT_MARKER_SET = new Set(PLUGIN_ROOT_MARKERS);
//@ chunk-21ppfwx8.js:5467-8893 placement
/**
 * 运行插件的命令源（command source）生成插件目录，带超时
 */
async function runPluginCommandSource(e) {
  let n = (e.timeout ?? COMMAND_SOURCE_KILL_GRACE_MS) * 1000;
  let r = printableName(e.command, 200);
  logForDebugging(`Plugin command source: running \`${r}\` (timeout ${n}ms)`);
  let commandSource = await spawnCommandSource(e.command, {
    cwd: homedir(),
    env: subprocessEnv(),
    timeoutMs: n,
    maxStdoutBytes: COMMAND_SOURCE_MAX_FILE_BYTES,
    maxStderrBytes: COMMAND_SOURCE_MAX_TOTAL_BYTES,
  });
  let o = printableName(commandSource.stderr.trim(), COMMAND_SOURCE_MAX_ENTRIES);
  let a = o ? ` (stderr: ${o})` : "";
  switch (commandSource.kind) {
    case "exited":
      if (commandSource.exitCode !== 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin source command \`${r}\` exited with code ${commandSource.exitCode}` +
            (o ? `: ${o}` : " and no error output."),
          "plugin command source exited non-zero",
        );
      break;
    case "timed-out":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${r}\` did not finish within ${n / 1000}s and was stopped.${a}`,
        "plugin command source timed out",
      );
    case "stdout-overflow":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${r}\` printed more than ${COMMAND_SOURCE_MAX_FILE_BYTES / 1024} KB and was stopped; it must print a single absolute path.`,
        "plugin command source exceeded the stdout cap",
      );
    case "signaled":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${r}\` was killed by ${commandSource.signal} before it finished.${a}`,
        "plugin command source killed by a signal",
      );
    case "spawn-error":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${r}\` could not be started: ` +
          printableName(commandSource.message, COMMAND_SOURCE_MAX_ENTRIES),
        "plugin command source failed to spawn",
      );
  }
  let filtered = commandSource.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((p) => p.length > 0);
  if (filtered.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed nothing; it must print the absolute path of the plugin directory.`,
      "plugin command source printed nothing",
    );
  if (filtered.length > 1)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed ${filtered.length} lines; it must print exactly one absolute path.`,
      "plugin command source printed multiple lines",
    );
  let s = filtered[0];
  if (!isAbsolute(s))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, which is not an absolute path.`,
      "plugin command source printed a relative path",
    );
  if ((getPlatform() === "windows" && isUntrustedLinkPath(s)) || isNetworkRelatedPath(s))
    throw new CommandSourceError(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, a network path (UNC or automount), which is not supported as a plugin directory.`,
      "plugin command source printed a network path",
    );
  if (traversesOrResolvesUntrustedLink(s))
    throw new CommandSourceError(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, which is reached through a link onto a network location (or one that cannot be trusted); that is not supported as a plugin directory.`,
      "plugin command source printed a path through a suspect link",
    );
  let u;
  try {
    u = await realpath(s);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, but that path could not be resolved (${getErrnoCode(error) ?? "unknown error"}).`,
      "plugin command source path does not resolve",
    );
  }
  if (isNetworkRelatedPath(u) || (getPlatform() === "windows" && isUntrustedLinkPath(u)))
    throw new CommandSourceError(
      `Plugin source command \`${r}\` printed a path that resolves to a network location, which is not supported as a plugin directory.`,
      "plugin command source path resolves to a network path",
    );
  let h;
  try {
    h = await readdir(u);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, ` +
        (errnoCode === "ENOTDIR"
          ? "which is not a directory."
          : `which could not be read as a directory (${errnoCode ?? "unknown error"}).`),
      "plugin command source path is not a readable directory",
    );
  }
  if (!h.some((p) => PLUGIN_ROOT_MARKER_SET.has(p)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${r}\` printed \`${printableName(s, 200)}\`, but that directory has no plugin content (expected .claude-plugin/ or a commands/, skills/, agents/, hooks/, themes/, output-styles/, monitors/, workflows/, SKILL.md, .mcp.json, or .lsp.json at the top level). Nothing was installed.`,
      "plugin command source directory has no plugin content",
    );
  logForDebugging(`Plugin command source: resolved plugin directory ${u}`);
  return u;
}
//@ chunk-21ppfwx8.js:8893-9573 placement
async function checkPluginDirSize(e, symlinks, fileSizes) {
  let i = [];
  let o = 0;
  let a = 0;
  async function c(s) {
    let u = await readdir(s, {
      withFileTypes: true,
    });
    for (let h of u) {
      a++;
      if (a > MAX_COMMAND_SOURCE_NAME_LENGTH)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin directory has more than ${MAX_COMMAND_SOURCE_NAME_LENGTH} entries; refusing to install it as a plugin.`,
          "plugin command source directory has too many files",
        );
      let p = join(s, h.name);
      let w = await classifyDirEntry(s, h);
      if (w.isDirectory) {
        if (s === e && h.name === ".git") continue;
        await c(p);
      } else if (w.isFile) {
        let size = w.size ?? (await lstat(p)).size;
        fileSizes?.set(p, size);
        o += size;
        if (o > COMMAND_SOURCE_MAX_SCAN_BYTES)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Plugin directory is larger than ${COMMAND_SOURCE_MAX_SCAN_BYTES / 1048576} MB; refusing to install it as a plugin.`,
            "plugin command source directory too large",
          );
        i.push(p);
      } else if (w.isSymbolicLink) symlinks?.push(p);
    }
  }
  await c(e);
  symlinks?.sort();
  return i.sort();
}
//@ chunk-21ppfwx8.js:9573-10063 placement
/**
 * 计算插件目录内容摘要：按相对路径与大小逐个文件流式哈希（不足部分补零），再加入符号链接及其目标，返回 hex。
 */
async function hashPluginDirectoryContents(root) {
  let symlinks = [];
  let fileSizes = new Map();
  let files = await checkPluginDirSize(root, symlinks, fileSizes);
  let hash = createHash("sha256");
  for (let file of files) {
    let c = fileSizes.get(file) ?? 0;
    hash.update(`f ${relative(root, file).split(sep).join("/")}\x00${c}\x00`);
    let s = c;
    if (c > 0) {
      let u = await open(file, "r");
      try {
        for await (let h of u.createReadStream({
          start: 0,
          end: c - 1,
        })) {
          hash.update(h);
          s -= h.length;
        }
      } finally {
        await u.close();
      }
    }
    if (s > 0) hash.update(Buffer.alloc(s));
  }
  for (let symlink of symlinks) {
    let c = await readlink(symlink);
    hash.update(`l ${relative(root, symlink).split(sep).join("/")}\x00`);
    hash.update(`${Buffer.byteLength(c)}\x00${c}`);
  }
  return hash.digest("hex");
}
//@ chunk-21ppfwx8.js:10063-10194 placement
/**
 * Windows 不支持 mode link 的提示。
 */
var LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE =
  'This plugin source uses mode "link", which is not supported on Windows yet; the marketplace can use mode "copy" instead.';
//@ chunk-21ppfwx8.js:10194-10263 placement
/**
 * describeCommandOutputMode：说明 link/copy 模式对输出目录的处理。
 */
function describeCommandOutputMode(source) {
  return source.mode === "link" ? `${source.command}${pluginLinkSchema}` : source.command;
}
//@ chunk-21ppfwx8.js:10263-10444 placement
/**
 * 说明 link/copy 两种模式对输出目录的处理。
 */
function describeCommandSourceMode(source) {
  return source.mode === "link"
    ? 'mode "link": its output directory is used in place (linked, not copied)'
    : 'mode "copy": its output directory is copied into the plugin cache';
}
//@ chunk-21ppfwx8.js:10444-10464 placement
/**
 * CommandSourceError：命令源错误类。
 */
class CommandSourceError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-21ppfwx8.js:10464-12145 placement
function describePluginSourceMode(e, n) {
  if (n && n.kind !== "none" && n.command === describeCommandOutputMode(e)) return;
  let r = printableName(e.command, MAX_CONSENT_COMMAND_LENGTH) + (e.mode === "link" ? " [mode: link]" : "");
  let i = n?.pluginId !== undefined ? printableName(n.pluginId, 200) : undefined;
  let o = i ?? "This plugin";
  let a = i ?? "";
  if (n?.kind === "recorded" && n.command !== undefined)
    throw new CommandSourceError(
      `${o}'s marketplace changed the command that installs it, or how its output is used (now \`${r}\`), since it was accepted, so it was not run. Review and accept the new command: ${runCommandHint(
        "plugin update",
        a,
        {
          tail: "in a terminal (add `--scope` for a project/local install)",
          fallback: "an explicit plugin update in a terminal reviews it",
        },
      )}.`,
      "plugin command source command changed since consent",
    );
  if (n?.kind === "recorded")
    throw new CommandSourceError(
      `${o}'s marketplace entry now installs it by running a command on this machine (\`${r}\`) that has not been reviewed yet, so it was not run. Review and accept it: ${runCommandHint(
        "plugin update",
        a,
        {
          tail: "in a terminal (add `--scope` for a project/local install)",
          fallback: "an explicit plugin update in a terminal reviews it",
        },
      )}.`,
      "plugin command source never consented for an installed plugin",
    );
  if (n?.kind === "shown")
    throw new CommandSourceError(
      `${o}'s marketplace entry changed while it was being installed (it now declares \`${r}\`, not the command that was shown), so nothing was run. Re-run the install/update to review the current command.`,
      "plugin command source changed between display and run",
    );
  throw new CommandSourceError(
    `${o} is installed by running a command on this machine (\`${r}\`) that has not been reviewed yet, so it was not run. Review and accept it from its /plugin details pane, or in a terminal: ${runCommandHint(
      "plugin install",
      a,
      {
        fallback: "an explicit plugin install reviews it",
      },
    )}.`,
    "plugin command source without consent",
  );
}
//@ chunk-21ppfwx8.js:12145-12605 placement
/**
 * 在 n 下为源目录 e 的每一项创建符号链接（目标先经安全检查），写入 PLUGIN_LINK_FILE 标记（wx 独占）， 返回由源路径与各链接名/目标计算的 sha256。
 */
async function createLinkFarm(e, n) {
  let sorted = (await readdir(e)).filter((a) => !isPristineLinkFarm(a)).sort();
  let i = await checkPluginEntryLinks(
    e,
    sorted.map((a) => ({
      name: a,
      path: join(e, a),
    })),
  );
  await mkdir(n, {
    recursive: true,
  });
  for (let { name: a, target, isDirectory } of i)
    await symlink(target, join(n, a), isDirectory ? "dir" : "file");
  await writeFile(
    join(n, PLUGIN_LINK_FILE_2),
    JSON.stringify({
      target: e,
    }),
    {
      flag: "wx",
    },
  );
  let hash = createHash("sha256");
  hash.update(`${e}\x00`);
  for (let { name: a, target } of i) {
    hash.update(`${Buffer.byteLength(a)}\x00${a}`);
    hash.update(`${Buffer.byteLength(target)}\x00${target}`);
  }
  return hash.digest("hex");
}
//@ chunk-21ppfwx8.js:12605-13459 placement
async function checkPluginEntryLinks(e, n) {
  let r = [];
  for (let { name: i, path } of n) {
    if (resolvePathChain(path, dirname(path)))
      throw new CommandSourceError(
        `A top-level entry of the plugin directory (${printableName(i, 100)}) points at a network location or through a link that cannot be trusted; refusing to link it.`,
        "plugin command source entry traverses a suspect link",
      );
    let a;
    let isDirectory;
    try {
      a = await realpath(path);
      isDirectory = (await stat(a)).isDirectory();
    } catch {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `A top-level entry of the plugin directory its command produced could not be resolved (${printableName(i, 80)}); refusing to link it.`,
        "plugin command source link entry unresolvable",
      );
    }
    let s = relative(e, a);
    if (s === "" || s === ".." || s.startsWith(`..${sep}`) || isAbsolute(s))
      throw new CommandSourceError(
        `A top-level entry of the plugin directory its command produced (${printableName(i, 80)}) points outside that directory; refusing to link it.`,
        "plugin command source link escapes producer directory",
      );
    r.push({
      name: i,
      target: a,
      isDirectory,
    });
  }
  return r;
}
//@ chunk-21ppfwx8.js:13459-14892 placement
async function checkRelinkTarget(sourcePath, cachePath) {
  let r = resolve(getOriginalCwd(), sourcePath);
  let i = resolve(getOriginalCwd(), cachePath);
  let linkFarmMarker = await readLinkFarmMarker(join(r, PLUGIN_LINK_FILE_2));
  let target = PLUGIN_LINK_FILE().parse(JSON.parse(linkFarmMarker)).target;
  if (traversesUntrustedLink(target))
    throw new CommandSourceError(
      "The link farm points at a producer reached through a link that cannot be trusted; refusing to relink it.",
      "plugin command source relink target traverses a suspect link",
    );
  let c = await realpath(target);
  if (isUntrustedLinkPath(c))
    throw new CommandSourceError(
      "The link farm points at a producer that now resolves to a network location; refusing to relink it.",
      "plugin command source relink target resolves to a network path",
    );
  let s = [];
  for (let w of await readdir(r, {
    withFileTypes: true,
  })) {
    if (isPristineLinkFarm(w.name)) continue;
    if ((await classifyDirEntrySafe(r, w))?.isSymbolicLink) s.push(w);
  }
  let u = [];
  for (let w of s) {
    let S;
    try {
      S = await readlink(join(r, w.name));
    } catch (error) {
      if (isENOENT(error)) continue;
      throw new CommandSourceError(
        `A link in the staged farm could not be read (${printableName(errorMessage(error), 120)}); refusing to relink it.`,
        "plugin command source relink entry unreadable",
      );
    }
    if (hasDotSegmentAlias(S))
      throw new CommandSourceError(
        "A link in the staged farm is not in canonical form; refusing to relink it.",
        "plugin command source relink entry not canonical",
      );
    u.push(w);
  }
  let h = await checkPluginEntryLinks(
    c,
    u.map((w) => ({
      name: w.name,
      path: join(r, w.name),
    })),
  );
  await mkdir(dirname(i), {
    recursive: true,
  });
  let p = linkingTempName(i, process.pid);
  await removeDirectoryTreeNoFollow(p);
  await mkdir(p);
  try {
    for (let { name: w, target, isDirectory } of h)
      await symlink(target, join(p, w), isDirectory ? "dir" : "file");
    await writeFile(join(p, PLUGIN_LINK_FILE_2), linkFarmMarker, {
      flag: "wx",
    });
    await rename(p, i);
  } catch (error) {
    await removeDirectoryTreeNoFollow(p).catch(() => {});
    let errnoCode = getErrnoCode(error);
    if (
      (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") &&
      (await classifyLinkFarm(i)) === "live" &&
      !(await hasEntriesOutsideTarget(i, c))
    )
      return;
    throw error;
  }
}
//@ chunk-21ppfwx8.js:14892-14999 placement
/**
 * 删掉缓存目录中应忽略的项（可保留 .git）。
 */
async function removeIgnoredEntries(e, { keepGit }) {
  for (let r of await readdir(e))
    if (isPristineLinkFarm(r) && !(keepGit && foldCase_2(r) === ".git"))
      await removeDirectoryTreeNoFollow(join(e, r));
}
//@ chunk-21ppfwx8.js:14999-15032 placement
/**
 * isPristineLinkFarm：链接农场是否只含缓存元数据。
 */
function isPristineLinkFarm(name) {
  return matchesSegmentOrTempName(name, LINK_FARM_META_NAMES);
}
//@ chunk-21ppfwx8.js:15032-15064 placement
var LINK_FARM_META_NAMES = new Set([...CACHE_META_FILES, ".git"]);
//@ chunk-21ppfwx8.js:15064-15179 placement
/**
 * 链接农场是否仍是 live（无法判定时按参数决定）。
 */
async function isLiveLinkFarm(e, { unclassifiableIsFarm: n = false } = {}) {
  let r = await classifyLinkFarm(e);
  return r === "live" || (r === "unclassifiable" && n);
}
//@ chunk-21ppfwx8.js:15179-15632 placement
/**
 * 读取链接标记并校验；目录中存在指向绝对路径的符号链接则为 live，否则 not-live；读取错误按 errno 归为 not-live 或 unclassifiable。
 */
async function classifyLinkFarm(e) {
  try {
    PLUGIN_LINK_FILE().parse(JSON.parse(await readLinkFarmMarker(join(e, PLUGIN_LINK_FILE_2))));
  } catch (error) {
    if (getErrnoCode(error) !== undefined) return n(error);
  }
  try {
    for (let r of await readdir(e, {
      withFileTypes: true,
    })) {
      if (isPristineLinkFarm(r.name)) continue;
      try {
        let i = await classifyDirEntry(e, r);
        if (i.isSymbolicLink && isAbsolute(i.linkTarget ?? (await readlink(join(e, r.name))))) return "live";
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT") continue;
        return n(error);
      }
    }
    return "not-live";
  } catch (error) {
    return n(error);
  }
  function n(error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "not-live" : "unclassifiable";
  }
}
//@ chunk-21ppfwx8.js:15632-15697 placement
var IGNORED_CACHE_ENTRIES = new Set([".ds_store", "thumbs.db", "desktop.ini", "icon\r"]);
//@ chunk-21ppfwx8.js:15697-15761 placement
function isIgnoredCacheEntry(name) {
  let n = foldCase_2(name);
  return IGNORED_CACHE_ENTRIES.has(n) || n.startsWith("._");
}
//@ chunk-21ppfwx8.js:15761-15794 placement
function isCacheMetaFile(name) {
  return CACHE_META_FILES.has(name);
}
//@ chunk-21ppfwx8.js:15794-16232 placement
/**
 * 检查缓存目录 e：跳过忽略项与缓存元数据文件，若有普通文件/目录或指向 n 之外（或可疑）路径的符号链接则返回 true。
 */
async function hasEntriesOutsideTarget(e, n) {
  let r = n.replace(/[\\/]+$/, "") + sep;
  try {
    for (let i of await readdir(e, {
      withFileTypes: true,
    })) {
      if (isCacheMetaFile(i.name)) continue;
      let o;
      try {
        let a = await classifyDirEntry(e, i);
        if (a.isFile && (isIgnoredCacheEntry(i.name) || matchesSegmentOrTempName(i.name, CACHE_META_FILES)))
          continue;
        if (!a.isSymbolicLink) return true;
        o = a.linkTarget ?? (await readlink(join(e, i.name)));
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT") continue;
        return true;
      }
      if (!isAbsolute(o) || hasDotSegmentAlias(o) || isUntrustedLinkPath(o) || !o.startsWith(r)) return true;
    }
    return false;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
  }
}
//@ chunk-21ppfwx8.js:16232-16329 placement
/**
 * readLinkFarmTarget：读取链接农场标记的目标。
 */
async function readLinkFarmTarget(e) {
  try {
    return PLUGIN_LINK_FILE().parse(JSON.parse(await readLinkFarmMarker(join(e, PLUGIN_LINK_FILE_2)))).target;
  } catch {
    return;
  }
}
//@ chunk-21ppfwx8.js:16329-16342 placement
var MAX_LINK_FARM_MARKER_BYTES = 16384;
//@ chunk-21ppfwx8.js:16342-16574 placement
async function readLinkFarmMarker(e) {
  let n = await lstat(e);
  if (!n.isFile() || n.size > MAX_LINK_FARM_MARKER_BYTES)
    throw new CommandSourceError(
      "The link-farm marker is not a small regular file; refusing to read it.",
      "plugin command source link marker not a small regular file",
    );
  return readFile(e, "utf8");
}
//@ chunk-21ppfwx8.js:16574-16648 placement
/**
 * commandSourceSpecOf：取出 command 来源配置。
 */
function commandSourceSpecOf(source) {
  return typeof source === "object" && source.source === "command" ? source : undefined;
}
//@ chunk-21ppfwx8.js:16648-16693 placement
/**
 * isLinkModeCommandSource：命令源是否为 link 模式。
 */
function isLinkModeCommandSource(source) {
  return commandSourceSpecOf(source)?.mode === "link";
}
//@ chunk-21ppfwx8.js:16693-17682 placement
async function holdCommandSourceForOrg(source, root, r, commandSourceConsent) {
  if (isHttpMcpServeInvocation())
    throw new CommandSourceError(
      "A tool server doesn't run a plugin's command on its own. The plugin was not installed or updated and its command was not run.",
      "plugin command source not started by a tool server daemon",
    );
  if (areCommandPluginSourcesDisabledByPolicy()) {
    noteHeldForTheAnswer();
    throw new CommandSourceError(
      commandPluginSourcesDisabledMessage(),
      marketplaceNameAnswerState() === "unanswered"
        ? "plugin command source held for the organization answer"
        : "plugin command source disabled by managed policy",
    );
  }
  if (source.mode === "link" && getPlatform() === "windows")
    throw new CommandSourceError(
      LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
      "plugin command source link mode unsupported on windows",
    );
  describePluginSourceMode(source, commandSourceConsent);
  return withFeatureTelemetry("plugin_command_install", async () => {
    let o = await runPluginCommandSource(source);
    if (
      isPathWithin(o, getOriginalCwd(), {
        foldCase: true,
      })
    )
      throw new CommandSourceError(
        `Plugin source command printed the working directory or one of its parents (${printableName(o, 300)}); refusing to use it as a plugin.`,
        "plugin command source printed cwd or an ancestor",
      );
    recordProducerDir(o);
    if (source.mode === "link")
      return {
        contentSha256: await createLinkFarm(o, root),
        producerDirectory: o,
      };
    await checkPluginDirSize(o);
    await r(o, root);
    await removeIgnoredEntries(root, {
      keepGit: false,
    });
    return {
      contentSha256: await hashPluginDirectoryContents(root),
      producerDirectory: o,
    };
  });
}
//@ chunk-21ppfwx8.js:17712-17730 placement
var TRUST_DIALOG_TIMEOUT_MS = 1e4;
var TRUST_DIALOG_LONG_TIMEOUT_MS = 1e6;
//@ chunk-21ppfwx8.js:17730-17805 placement
function isWorkspaceTrustedForCommandSource(repoResidentOrigin) {
  if (isWorkspacePersistedTrusted(repoResidentOrigin)) return true;
  return (
    (repoResidentOrigin === undefined || repoResidentOrigin === homedir()) &&
    isHomeDirectorySession() &&
    getHomeTrustDialogAccepted()
  );
}
//@ chunk-21ppfwx8.js:17805-18559 placement
async function classifyCommandSourceFailure(options) {
  if (options.isRepoResidentConfig && !isWorkspaceTrustedForCommandSource(options.repoResidentOrigin))
    return {
      ok: false,
      reason: "missing_trust",
    };
  let n =
    options.readEnvAsStarts !== undefined
      ? options.readEnvAsStarts(() => ({
          env: buildCommandSourceEnv(options),
          withoutContextEnv: buildCommandSourceEnv({
            ...options,
            env: undefined,
          }),
        }))
      : {
          env: buildCommandSourceEnv(options),
          withoutContextEnv: undefined,
        };
  let env = n.env;
  if (options.pluginId !== undefined)
    checkPluginBunOptions(
      options.pluginId,
      env,
      n.withoutContextEnv ??
        buildCommandSourceEnv({
          ...options,
          env: undefined,
        }),
    );
  let i = await execFileNoThrowWithCwd(options.command, [], {
    shell: true,
    timeout: TRUST_DIALOG_TIMEOUT_MS,
    maxBuffer: TRUST_DIALOG_LONG_TIMEOUT_MS,
    cwd: options.cwd,
    env,
    extendEnv: false,
  });
  if (i.code !== 0 || !i.stdout)
    return {
      ok: false,
      reason: "exec_failed",
    };
  let o;
  try {
    o = jsonParse(i.stdout.trim());
  } catch {
    return {
      ok: false,
      reason: "parse_failed",
    };
  }
  if (!isPlainObject(o))
    return {
      ok: false,
      reason: "non_object",
    };
  let a = {};
  for (let [key, value] of Object.entries(o)) {
    if (typeof value !== "string")
      return {
        ok: false,
        reason: "non_string_value",
      };
    a[key] = value;
  }
  return {
    ok: true,
    headers: a,
  };
}
//@ chunk-21ppfwx8.js:18559-19129 placement
/**
 * 构造命令源构建命令的环境：不擦除时直接合并 e.env；擦除时删掉凭证类变量，收集其值， 并把 e.env 中出现的凭证值替换为 REDACTED（等于 cwd 的值除外）。
 */
function buildCommandSourceEnv(options) {
  let env = {
    ...subprocessEnv(),
  };
  if (!options.scrubCredentialEnv)
    return {
      ...env,
      ...options.env,
    };
  let secrets = [];
  for (let c of listSecretEnvNames()) {
    let s = process.env[c] ?? env[c];
    if (s !== undefined && s !== "" && !isEnvTruthy(s) && !isEnvDefinedFalsy(s)) secrets.push(s);
    delete env[c];
  }
  let env_2 = process.env;
  let o = {};
  for (let c of new Set([...Object.keys(env), ...Object.keys(env_2)])) o[c] = env_2[c] ?? env[c];
  for (let c of sanitizeEnvCredentials(o).lostCredential) {
    let s = o[c];
    if (s !== undefined && s !== "") secrets.push(s);
  }
  Object.assign(env, sanitizeEnvCredentials(env).respelled);
  secrets.sort((c, s) => s.length - c.length);
  let extraEnv = {};
  for (let [key, value] of Object.entries(options.env ?? {}))
    extraEnv[key] =
      value === options.cwd
        ? value
        : secrets.reduce((acc, secret) => acc.split(secret).join("REDACTED"), value);
  return {
    ...env,
    ...extraEnv,
  };
}
//@ chunk-21ppfwx8.js:19129-19176 placement
/**
 * organizationAnswerState：等待组织答复的共享状态。
 */
var organizationAnswerState = {
  wait: undefined,
  ask: undefined,
  fetches: undefined,
};
//@ chunk-21ppfwx8.js:19176-19371 placement
/**
 * 等待托管设置的组织答复：先等 zW.wait，状态仍为 unanswered 时调用 zW.ask；进行中的 Promise 共享，结束后清空。
 */
function askOrganizationOnce() {
  let organizationAsk = getPluginRegistry().organizationAsk;
  organizationAsk.asking ??= Promise.resolve()
    .then(() => organizationAnswerState.wait?.())
    .then(() => (marketplaceNameAnswerState() === "unanswered" ? organizationAnswerState.ask?.() : undefined))
    .catch(logError)
    .finally(() => {
      organizationAsk.asking = null;
    });
  return organizationAsk.asking;
}
//@ chunk-21ppfwx8.js:19371-19385 placement
/**
 * ORGANIZATION_ANSWER_TIMEOUT_MS：等待组织答复超时。
 */
var ORGANIZATION_ANSWER_TIMEOUT_MS = 30000;
//@ chunk-21ppfwx8.js:19385-19398 placement
/**
 * ORGANIZATION_ANSWER_POLL_MS：组织答复轮询间隔。
 */
var ORGANIZATION_ANSWER_POLL_MS = 3000;
//@ chunk-21ppfwx8.js:19398-19505 placement
/**
 * 带截止时间等待组织答复（共享）。
 */
function waitForOrganizationAnswer(e) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  organizationAsk.answerWait ??= withDeadline(askOrganizationOnce(), ORGANIZATION_ANSWER_POLL_MS, e).then(
    () => {},
  );
  return organizationAsk.answerWait;
}
//@ chunk-21ppfwx8.js:19505-19578 placement
/**
 * MAX_SPILL_BYTES：溢出文件体积上限；MAX_PLUGIN_ARCHIVE_BYTES：插件归档体积上限；COMMAND_SOURCE_DEFAULT_TIMEOUT_MS：命令源默认超时（同一声明共 3 个绑定）。
 */
var MAX_SPILL_BYTES = 268435456;
var MAX_PLUGIN_ARCHIVE_BYTES = 5242880;
var COMMAND_SOURCE_DEFAULT_TIMEOUT_MS = 120000;
var CLAUDE_CODE_PLUGIN_MANAGER = "Claude-Code-Plugin-Manager";
export {
  ORGANIZATION_ANSWER_TIMEOUT_MS,
  askOrganizationOnce,
  organizationAnswerState,
  shouldRefreshCommandPlugins,
  describeCommandOutputMode,
  CommandSourceError,
  LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
  isPluginsDirOnLocalDisk,
  describeCommandSourceMode,
  commandSourceSpecOf,
  classifyCommandSourceFailure,
  PLUGIN_JSON,
  isLinkModeCommandSource,
  isLiveLinkFarm,
  makeTempCachePathName,
  TEMP_CACHE_LINK_SUFFIX,
  hasEntriesOutsideTarget,
  CLAUDE_CODE_PLUGIN_MANAGER,
  COMMAND_SOURCE_DEFAULT_TIMEOUT_MS,
  MAX_SPILL_BYTES,
  waitForOrganizationAnswer,
  commandSourceRefreshEnabled,
  classifyLinkFarm,
  readLinkFarmTarget,
  isPristineLinkFarm,
  checkRelinkTarget,
  TEMP_CACHE_CLONE_SUFFIX,
  holdCommandSourceForOrg,
  removeIgnoredEntries,
  findPluginRootInExtracted,
  pluginRootHasMarker,
  PLUGIN_MANIFEST_PATH,
  MARKETPLACE_MANIFEST_PATH,
  PLUGIN_ROOT_MARKERS,
  ORGANIZATION_ANSWER_POLL_MS,
  MAX_PLUGIN_ARCHIVE_BYTES,
  PLUGIN_MANIFEST_DIR,
  isPluginRootMarker,
  isPluginComponentDir,
  regExp,
  regExp_2,
  PLUGIN_COMPONENT_DIRS,
};
