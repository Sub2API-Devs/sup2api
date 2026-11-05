/**
 * utils/plugins/commandSource.ts
 *
 * 插件命令源（command source）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5hddsdew.js (56)
 * attribution: placement 56
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
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
import { PLUGIN_LINK_HEADER, PLUGIN_LINK_FILE, pluginLinkSchema } from "./pluginLinks.js";
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
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { sanitizeEnvCredentials } from "../settings/policyHelper/helperExec.js";
import { logError } from "../log.js";
import { withDeadline } from "../sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5hddsdew.js:1570-1631 placement
/**
 * shouldRefreshCommandPlugins：命令源插件是否需要刷新。
 */
function shouldRefreshCommandPlugins() {
  if (isEssentialTrafficOnly()) return false;
  if (isPluginsDirOnLocalDisk()) return false;
  return commandSourceRefreshEnabled();
}
//@ chunk-5hddsdew.js:1631-1695 placement
/**
 * commandSourceRefreshEnabled：命令源刷新开关。
 */
function commandSourceRefreshEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_command_source_refresh", true);
}
//@ chunk-5hddsdew.js:1695-1708 placement
var COMMAND_SOURCE_FETCH_TIMEOUT_MS = 30000;
//@ chunk-5hddsdew.js:1708-2013 placement
/**
 * 判断插件目录是否在可信本地文件系统上（Windows 用 SLi，其他平台 yl）；否则对项目插件目录做 realpath 检查并缓存， 配置目录在其下返回 false，最后检查与已知可疑根（be()）是否互相包含。命令源安装、更新前调用。
 */
function isPluginsDirOnLocalDisk() {
  let pluginsDirectory = getPluginsDirectory();
  let pluginRootPath = stripWin32DevicePrefix(projectPluginsDir());
  if (
    getPlatform() === "windows"
      ? isTrustedLocalWindowsPath(pluginsDirectory)
      : isNetworkMountRoot(pluginsDirectory)
  )
    return true;
  let provenLocalRoots = getPluginRegistry().provenLocalRoots;
  let provenAt = provenLocalRoots.get(pluginRootPath);
  if (provenAt === undefined || !isFreshTimestamp(provenAt, COMMAND_SOURCE_FETCH_TIMEOUT_MS)) {
    if (
      realpathAllowMissing(pluginRootPath, {
        allowLocalWsl: true,
      })
    ) {
      provenLocalRoots.delete(pluginRootPath);
      return true;
    }
    provenLocalRoots.set(pluginRootPath, Date.now());
  }
  if (isPathWithin(getClaudeConfigDir(), pluginRootPath)) return false;
  return trustedLocalRoots().some(
    (root) =>
      isPathWithin(pluginRootPath, root, {
        foldCase: true,
      }) ||
      isPathWithin(root, pluginRootPath, {
        foldCase: true,
      }),
  );
}
//@ chunk-5hddsdew.js:2013-2104 placement
function trustedLocalRoots() {
  return normalizeCaseForComparison_2(
    [getOriginalCwd(), ...getAdditionalDirectoriesForClaudeMd()].flatMap((dir) =>
      [dir, findGitRoot(dir), noUncachedRoot(dir)].filter((rootCandidate) => rootCandidate !== null),
    ),
  );
}
//@ chunk-5hddsdew.js:2435-2512 placement
var COMMAND_SOURCE_KINDS = ["local", "npm", "github", "git", "subdir", "archive", "command", "unknown"];
//@ chunk-5hddsdew.js:2512-2624 placement
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
//@ chunk-5hddsdew.js:2624-2756 placement
/**
 * TEMP_CACHE_DIR_MAX_RANDOM：临时缓存目录名随机段长度；TEMP_CACHE_LINK_SUFFIX：临时缓存目录的 link 后缀；TEMP_CACHE_CLONE_SUFFIX：临时缓存目录的 clone 后缀（同一声明共 3 个绑定）。
 */
var TEMP; // deferred: uses COMMAND_SOURCE_KINDS of its import cycle while loading; runs once the cycle is complete
var TEMP_CACHE_DIR_MAX_RANDOM;
var TEMP_CACHE_LINK_SUFFIX;
var TEMP_CACHE_CLONE_SUFFIX;
var regExp;
deferInit("chunk-5hddsdew.js:2624", () => {
  TEMP = "temp_";
  TEMP_CACHE_DIR_MAX_RANDOM = 6;
  TEMP_CACHE_LINK_SUFFIX = "_x";
  TEMP_CACHE_CLONE_SUFFIX = ".clone";
  regExp = new RegExp(
    `^${TEMP}(?:${COMMAND_SOURCE_KINDS.join("|")})_(\\d{10,})_[a-z0-9]{1,${TEMP_CACHE_DIR_MAX_RANDOM}}(?:${TEMP_CACHE_LINK_SUFFIX}|\\${TEMP_CACHE_CLONE_SUFFIX})?$`,
  );
});
//@ chunk-5hddsdew.js:2756-2795 placement
function linkingTempName(sourcePath, pid) {
  return `${sourcePath}${LINKING_DIR_PREFIX}${pid}`;
}
//@ chunk-5hddsdew.js:2795-2847 placement
var LINKING_DIR_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_2;
deferInit("chunk-5hddsdew.js:2795", () => {
  LINKING_DIR_PREFIX = ".linking-";
  regExp_2 = new RegExp(`\\${LINKING_DIR_PREFIX}(\\d+)$`);
});
//@ chunk-5hddsdew.js:2886-2898 placement
var COMMAND_SOURCE_MAX_OUTPUT = 2000;
//@ chunk-5hddsdew.js:2898-4542 placement
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
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let exited = false;
    let failureKind;
    let exitFallbackTimer;
    let child = spawn(command, [], {
      shell: true,
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: getPlatform() !== "windows",
      windowsHide: true,
      ...cgroupSpawnOptions("plugin"),
    });
    let unregisterCleanup = registerCleanup(async () => {
      if (!settled && child.pid !== undefined) await killProcessGroup(child.pid, "SIGKILL");
    });
    function finish(result) {
      if (settled) return;
      settled = true;
      unregisterCleanup();
      clearTimeout(timer);
      if (exitFallbackTimer) clearTimeout(exitFallbackTimer);
      child.stdout?.removeAllListeners("data");
      child.stderr?.removeAllListeners("data");
      child.stdout?.destroy();
      child.stderr?.destroy();
      resolve(result);
    }
    function failOrKill(kind) {
      if (failureKind) return;
      failureKind = kind;
      child.stdout?.removeAllListeners("data");
      child.stderr?.removeAllListeners("data");
      child.stdout?.pause();
      child.stderr?.pause();
      let result = {
        kind,
        stdout,
        stderr,
      };
      let finishAfterKill = () => {
        if (settled) return;
        if (exited) {
          finish(result);
          return;
        }
        let onExit = () => finish(result);
        child.once("exit", onExit);
        exitFallbackTimer = setTimeout((token) => token(), COMMAND_SOURCE_MAX_OUTPUT, onExit);
        if (typeof exitFallbackTimer === "object") exitFallbackTimer.unref();
      };
      if (child.pid === undefined) {
        finish(result);
        return;
      }
      killProcessGroup(child.pid, "SIGKILL").then(finishAfterKill, finishAfterKill);
    }
    let timer = setTimeout((onTimeout) => onTimeout("timed-out"), timeoutMs, failOrKill);
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdoutBytes += Buffer.byteLength(chunk);
      if (stdoutBytes > maxStdoutBytes) {
        failOrKill("stdout-overflow");
        return;
      }
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      if (stderrBytes >= maxStderrBytes) return;
      stderrBytes += Buffer.byteLength(chunk);
      stderr += chunk;
    });
    child.once("error", (spawnError) => {
      finish({
        kind: "spawn-error",
        message: spawnError.message,
        stdout,
        stderr,
      });
    });
    function onExited(exitCode, signal) {
      if (failureKind) return;
      if (typeof exitCode === "number")
        finish({
          kind: "exited",
          exitCode,
          stdout,
          stderr,
        });
      else
        finish({
          kind: "signaled",
          signal: signal ?? "unknown",
          stdout,
          stderr,
        });
    }
    child.once("exit", (exitCode, signal) => {
      exited = true;
      if (settled || failureKind) return;
      clearTimeout(timer);
      exitFallbackTimer = setTimeout(
        (fn, code, signalName) => fn(code, signalName),
        COMMAND_SOURCE_MAX_OUTPUT,
        onExited,
        exitCode,
        signal,
      );
      if (typeof exitFallbackTimer === "object") exitFallbackTimer.unref();
    });
    child.once("close", (exitCode, signal) => {
      onExited(exitCode, signal);
    });
  });
}
//@ chunk-5hddsdew.js:4620-4871 placement
/**
 * 插件布局常量：.claude-plugin 目录、其中的 plugin.json 与 marketplace.json 相对路径、组件目录（commands/skills/agents/…）、 根目录识别文件（SKILL.md、.mcp.json、.lsp.json）与它们的合集。
 */
var PLUGIN_MANIFEST_DIR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PLUGIN_MANIFEST_PATH;
var PLUGIN_JSON;
var MARKETPLACE_MANIFEST_PATH;
var PLUGIN_COMPONENT_DIRS;
var PLUGIN_ROOT_MARKER_FILES;
var PLUGIN_ROOT_MARKERS;
deferInit("chunk-5hddsdew.js:4620", () => {
  PLUGIN_MANIFEST_DIR = ".claude-plugin";
  PLUGIN_MANIFEST_PATH = join(PLUGIN_MANIFEST_DIR, "plugin.json");
  PLUGIN_JSON = "plugin.json";
  MARKETPLACE_MANIFEST_PATH = join(PLUGIN_MANIFEST_DIR, "marketplace.json");
  PLUGIN_COMPONENT_DIRS = [
    "commands",
    "skills",
    "agents",
    "hooks",
    "themes",
    "output-styles",
    "monitors",
    "workflows",
  ];
  PLUGIN_ROOT_MARKER_FILES = ["SKILL.md", ".mcp.json", ".lsp.json"];
  PLUGIN_ROOT_MARKERS = [PLUGIN_MANIFEST_DIR, ...PLUGIN_COMPONENT_DIRS, ...PLUGIN_ROOT_MARKER_FILES];
});
//@ chunk-5hddsdew.js:4871-4943 placement
/**
 * pluginRootHasMarker：目录下是否有插件根标记。
 */
async function pluginRootHasMarker(pluginRoot) {
  return (await readdir(pluginRoot))
    .filter((entryName) => !isJunkEntryName(entryName))
    .some(isPluginRootMarker);
}
//@ chunk-5hddsdew.js:4943-5233 placement
/**
 * 定位解压后的插件根：本层有 .claude-plugin 就返回本层；只有一个子目录且其中有 .claude-plugin（或像插件根）则返回子目录。
 */
async function findPluginRootInExtracted(extractedDir) {
  let filtered = (
    await readdir(extractedDir, {
      withFileTypes: true,
    })
  ).filter((entry) => !isJunkEntryName(entry.name));
  if (filtered.some((entry) => entry.name === ".claude-plugin")) return extractedDir;
  if (filtered.length === 1 && filtered[0].isDirectory()) {
    let nestedDir = join(extractedDir, filtered[0].name);
    if (await pathExists(join(nestedDir, ".claude-plugin"))) return nestedDir;
    if (!isPluginRootMarker(filtered[0].name) && (await pluginRootHasMarker(nestedDir))) return nestedDir;
  }
  return extractedDir;
}
//@ chunk-5hddsdew.js:5233-5272 placement
/**
 * isPluginRootMarker：是否为插件根标记文件名。
 */
function isPluginRootMarker(name) {
  return PLUGIN_ROOT_MARKERS.includes(name);
}
//@ chunk-5hddsdew.js:5272-5311 placement
/**
 * isPluginComponentDir：是否为插件组件目录名。
 */
function isPluginComponentDir(dirName) {
  return PLUGIN_COMPONENT_DIRS.includes(dirName);
}
//@ chunk-5hddsdew.js:5311-5374 placement
async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-5hddsdew.js:5374-5428 placement
function isJunkEntryName(entryName) {
  return entryName === "__MACOSX" || entryName === ".DS_Store";
}
//@ chunk-5hddsdew.js:5428-5501 placement
var COMMAND_SOURCE_KILL_GRACE_MS; // deferred: uses PLUGIN_MANIFEST_DIR of its import cycle while loading; runs once the cycle is complete
var COMMAND_SOURCE_MAX_FILE_BYTES;
var COMMAND_SOURCE_MAX_TOTAL_BYTES;
var COMMAND_SOURCE_MAX_ENTRIES;
var COMMAND_SOURCE_MAX_SCAN_BYTES;
var MAX_COMMAND_SOURCE_NAME_LENGTH;
var PLUGIN_ROOT_MARKER_SET;
deferInit("chunk-5hddsdew.js:5428", () => {
  COMMAND_SOURCE_KILL_GRACE_MS = 60;
  COMMAND_SOURCE_MAX_FILE_BYTES = 65536;
  COMMAND_SOURCE_MAX_TOTAL_BYTES = 65536;
  COMMAND_SOURCE_MAX_ENTRIES = 500;
  COMMAND_SOURCE_MAX_SCAN_BYTES = 268435456;
  MAX_COMMAND_SOURCE_NAME_LENGTH = 20000;
  PLUGIN_ROOT_MARKER_SET = new Set(PLUGIN_ROOT_MARKERS);
});
//@ chunk-5hddsdew.js:5501-8927 placement
/**
 * 运行插件的命令源（command source）生成插件目录，带超时
 */
async function runPluginCommandSource(commandSourceConfig) {
  let timeoutMs = (commandSourceConfig.timeout ?? COMMAND_SOURCE_KILL_GRACE_MS) * 1000;
  let printableCommand = printableName(commandSourceConfig.command, 200);
  logForDebugging(`Plugin command source: running \`${printableCommand}\` (timeout ${timeoutMs}ms)`);
  let commandSource = await spawnCommandSource(commandSourceConfig.command, {
    cwd: homedir(),
    env: subprocessEnv(),
    timeoutMs,
    maxStdoutBytes: COMMAND_SOURCE_MAX_FILE_BYTES,
    maxStderrBytes: COMMAND_SOURCE_MAX_TOTAL_BYTES,
  });
  let stderrText = printableName(commandSource.stderr.trim(), COMMAND_SOURCE_MAX_ENTRIES);
  let stderrSuffix = stderrText ? ` (stderr: ${stderrText})` : "";
  switch (commandSource.kind) {
    case "exited":
      if (commandSource.exitCode !== 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin source command \`${printableCommand}\` exited with code ${commandSource.exitCode}` +
            (stderrText ? `: ${stderrText}` : " and no error output."),
          "plugin command source exited non-zero",
        );
      break;
    case "timed-out":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${printableCommand}\` did not finish within ${timeoutMs / 1000}s and was stopped.${stderrSuffix}`,
        "plugin command source timed out",
      );
    case "stdout-overflow":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${printableCommand}\` printed more than ${COMMAND_SOURCE_MAX_FILE_BYTES / 1024} KB and was stopped; it must print a single absolute path.`,
        "plugin command source exceeded the stdout cap",
      );
    case "signaled":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${printableCommand}\` was killed by ${commandSource.signal} before it finished.${stderrSuffix}`,
        "plugin command source killed by a signal",
      );
    case "spawn-error":
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin source command \`${printableCommand}\` could not be started: ` +
          printableName(commandSource.message, COMMAND_SOURCE_MAX_ENTRIES),
        "plugin command source failed to spawn",
      );
  }
  let filtered = commandSource.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (filtered.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${printableCommand}\` printed nothing; it must print the absolute path of the plugin directory.`,
      "plugin command source printed nothing",
    );
  if (filtered.length > 1)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${printableCommand}\` printed ${filtered.length} lines; it must print exactly one absolute path.`,
      "plugin command source printed multiple lines",
    );
  let printedPath = filtered[0];
  if (!isAbsolute(printedPath))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${printableCommand}\` printed \`${printableName(printedPath, 200)}\`, which is not an absolute path.`,
      "plugin command source printed a relative path",
    );
  if ((getPlatform() === "windows" && isUntrustedLinkPath(printedPath)) || isNetworkRelatedPath(printedPath))
    throw new CommandSourceError(
      `Plugin source command \`${printableCommand}\` printed \`${printableName(printedPath, 200)}\`, a network path (UNC or automount), which is not supported as a plugin directory.`,
      "plugin command source printed a network path",
    );
  if (traversesOrResolvesUntrustedLink(printedPath))
    throw new CommandSourceError(
      `Plugin source command \`${printableCommand}\` printed \`${printableName(printedPath, 200)}\`, which is reached through a link onto a network location (or one that cannot be trusted); that is not supported as a plugin directory.`,
      "plugin command source printed a path through a suspect link",
    );
  let resolvedPath;
  try {
    resolvedPath = await realpath(printedPath);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${printableCommand}\` printed \`${printableName(printedPath, 200)}\`, but that path could not be resolved (${getErrnoCode(error) ?? "unknown error"}).`,
      "plugin command source path does not resolve",
    );
  }
  if (
    isNetworkRelatedPath(resolvedPath) ||
    (getPlatform() === "windows" && isUntrustedLinkPath(resolvedPath))
  )
    throw new CommandSourceError(
      `Plugin source command \`${printableCommand}\` printed a path that resolves to a network location, which is not supported as a plugin directory.`,
      "plugin command source path resolves to a network path",
    );
  let entries;
  try {
    entries = await readdir(resolvedPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${printableCommand}\` printed \`${printableName(printedPath, 200)}\`, ` +
        (errnoCode === "ENOTDIR"
          ? "which is not a directory."
          : `which could not be read as a directory (${errnoCode ?? "unknown error"}).`),
      "plugin command source path is not a readable directory",
    );
  }
  if (!entries.some((entryName) => PLUGIN_ROOT_MARKER_SET.has(entryName)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin source command \`${printableCommand}\` printed \`${printableName(printedPath, 200)}\`, but that directory has no plugin content (expected .claude-plugin/ or a commands/, skills/, agents/, hooks/, themes/, output-styles/, monitors/, workflows/, SKILL.md, .mcp.json, or .lsp.json at the top level). Nothing was installed.`,
      "plugin command source directory has no plugin content",
    );
  logForDebugging(`Plugin command source: resolved plugin directory ${resolvedPath}`);
  return resolvedPath;
}
//@ chunk-5hddsdew.js:8927-9607 placement
async function checkPluginDirSize(root, symlinks, fileSizes) {
  let files = [];
  let totalBytes = 0;
  let entryCount = 0;
  async function walk(dir) {
    let entries = await readdir(dir, {
      withFileTypes: true,
    });
    for (let entry of entries) {
      entryCount++;
      if (entryCount > MAX_COMMAND_SOURCE_NAME_LENGTH)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin directory has more than ${MAX_COMMAND_SOURCE_NAME_LENGTH} entries; refusing to install it as a plugin.`,
          "plugin command source directory has too many files",
        );
      let entryPath = join(dir, entry.name);
      let entryInfo = await classifyDirEntry(dir, entry);
      if (entryInfo.isDirectory) {
        if (dir === root && entry.name === ".git") continue;
        await walk(entryPath);
      } else if (entryInfo.isFile) {
        let size = entryInfo.size ?? (await lstat(entryPath)).size;
        fileSizes?.set(entryPath, size);
        totalBytes += size;
        if (totalBytes > COMMAND_SOURCE_MAX_SCAN_BYTES)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Plugin directory is larger than ${COMMAND_SOURCE_MAX_SCAN_BYTES / 1048576} MB; refusing to install it as a plugin.`,
            "plugin command source directory too large",
          );
        files.push(entryPath);
      } else if (entryInfo.isSymbolicLink) symlinks?.push(entryPath);
    }
  }
  await walk(root);
  symlinks?.sort();
  return files.sort();
}
//@ chunk-5hddsdew.js:9607-10097 placement
/**
 * 计算插件目录内容摘要：按相对路径与大小逐个文件流式哈希（不足部分补零），再加入符号链接及其目标，返回 hex。
 */
async function hashPluginDirectoryContents(root) {
  let symlinks = [];
  let fileSizes = new Map();
  let files = await checkPluginDirSize(root, symlinks, fileSizes);
  let hash = createHash("sha256");
  for (let file of files) {
    let fileSize = fileSizes.get(file) ?? 0;
    hash.update(`f ${relative(root, file).split(sep).join("/")}\x00${fileSize}\x00`);
    let remaining = fileSize;
    if (fileSize > 0) {
      let handle = await open(file, "r");
      try {
        for await (let chunk of handle.createReadStream({
          start: 0,
          end: fileSize - 1,
        })) {
          hash.update(chunk);
          remaining -= chunk.length;
        }
      } finally {
        await handle.close();
      }
    }
    if (remaining > 0) hash.update(Buffer.alloc(remaining));
  }
  for (let symlink of symlinks) {
    let target = await readlink(symlink);
    hash.update(`l ${relative(root, symlink).split(sep).join("/")}\x00`);
    hash.update(`${Buffer.byteLength(target)}\x00${target}`);
  }
  return hash.digest("hex");
}
//@ chunk-5hddsdew.js:10097-10228 placement
/**
 * Windows 不支持 mode link 的提示。
 */
var LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE =
  'This plugin source uses mode "link", which is not supported on Windows yet; the marketplace can use mode "copy" instead.';
//@ chunk-5hddsdew.js:10228-10297 placement
/**
 * describeCommandOutputMode：说明 link/copy 模式对输出目录的处理。
 */
function describeCommandOutputMode(source) {
  return source.mode === "link" ? `${source.command}${PLUGIN_LINK_HEADER}` : source.command;
}
//@ chunk-5hddsdew.js:10297-10478 placement
/**
 * 说明 link/copy 两种模式对输出目录的处理。
 */
function describeCommandSourceMode(source) {
  return source.mode === "link"
    ? 'mode "link": its output directory is used in place (linked, not copied)'
    : 'mode "copy": its output directory is copied into the plugin cache';
}
//@ chunk-5hddsdew.js:10478-10498 placement
/**
 * CommandSourceError：命令源错误类。
 */
let CommandSourceError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5hddsdew.js:10478", () => {
  CommandSourceError = class CommandSourceError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-5hddsdew.js:10498-12179 placement
function describePluginSourceMode(source, consent) {
  if (consent && consent.kind !== "none" && consent.command === describeCommandOutputMode(source)) return;
  let commandLabel =
    printableName(source.command, MAX_CONSENT_COMMAND_LENGTH) +
    (source.mode === "link" ? " [mode: link]" : "");
  let pluginIdLabel = consent?.pluginId !== undefined ? printableName(consent.pluginId, 200) : undefined;
  let subject = pluginIdLabel ?? "This plugin";
  let pluginIdArg = pluginIdLabel ?? "";
  if (consent?.kind === "recorded" && consent.command !== undefined)
    throw new CommandSourceError(
      `${subject}'s marketplace changed the command that installs it, or how its output is used (now \`${commandLabel}\`), since it was accepted, so it was not run. Review and accept the new command: ${runCommandHint(
        "plugin update",
        pluginIdArg,
        {
          tail: "in a terminal (add `--scope` for a project/local install)",
          fallback: "an explicit plugin update in a terminal reviews it",
        },
      )}.`,
      "plugin command source command changed since consent",
    );
  if (consent?.kind === "recorded")
    throw new CommandSourceError(
      `${subject}'s marketplace entry now installs it by running a command on this machine (\`${commandLabel}\`) that has not been reviewed yet, so it was not run. Review and accept it: ${runCommandHint(
        "plugin update",
        pluginIdArg,
        {
          tail: "in a terminal (add `--scope` for a project/local install)",
          fallback: "an explicit plugin update in a terminal reviews it",
        },
      )}.`,
      "plugin command source never consented for an installed plugin",
    );
  if (consent?.kind === "shown")
    throw new CommandSourceError(
      `${subject}'s marketplace entry changed while it was being installed (it now declares \`${commandLabel}\`, not the command that was shown), so nothing was run. Re-run the install/update to review the current command.`,
      "plugin command source changed between display and run",
    );
  throw new CommandSourceError(
    `${subject} is installed by running a command on this machine (\`${commandLabel}\`) that has not been reviewed yet, so it was not run. Review and accept it from its /plugin details pane, or in a terminal: ${runCommandHint(
      "plugin install",
      pluginIdArg,
      {
        fallback: "an explicit plugin install reviews it",
      },
    )}.`,
    "plugin command source without consent",
  );
}
//@ chunk-5hddsdew.js:12179-12639 placement
/**
 * 在 n 下为源目录 e 的每一项创建符号链接（目标先经安全检查），写入 PLUGIN_LINK_FILE 标记（wx 独占）， 返回由源路径与各链接名/目标计算的 sha256。
 */
async function createLinkFarm(producerDir, farmDir) {
  let sorted = (await readdir(producerDir)).filter((entryName) => !isPristineLinkFarm(entryName)).sort();
  let links = await checkPluginEntryLinks(
    producerDir,
    sorted.map((entryName) => ({
      name: entryName,
      path: join(producerDir, entryName),
    })),
  );
  await mkdir(farmDir, {
    recursive: true,
  });
  for (let { name: entryName, target, isDirectory } of links)
    await symlink(target, join(farmDir, entryName), isDirectory ? "dir" : "file");
  await writeFile(
    join(farmDir, PLUGIN_LINK_FILE),
    JSON.stringify({
      target: producerDir,
    }),
    {
      flag: "wx",
    },
  );
  let hash = createHash("sha256");
  hash.update(`${producerDir}\x00`);
  for (let { name: entryName, target } of links) {
    hash.update(`${Buffer.byteLength(entryName)}\x00${entryName}`);
    hash.update(`${Buffer.byteLength(target)}\x00${target}`);
  }
  return hash.digest("hex");
}
//@ chunk-5hddsdew.js:12639-13493 placement
async function checkPluginEntryLinks(producerDir, entries) {
  let links = [];
  for (let { name: entryName, path } of entries) {
    if (resolvePathChain(path, dirname(path)))
      throw new CommandSourceError(
        `A top-level entry of the plugin directory (${printableName(entryName, 100)}) points at a network location or through a link that cannot be trusted; refusing to link it.`,
        "plugin command source entry traverses a suspect link",
      );
    let targetPath;
    let isDirectory;
    try {
      targetPath = await realpath(path);
      isDirectory = (await stat(targetPath)).isDirectory();
    } catch {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `A top-level entry of the plugin directory its command produced could not be resolved (${printableName(entryName, 80)}); refusing to link it.`,
        "plugin command source link entry unresolvable",
      );
    }
    let relativePath = relative(producerDir, targetPath);
    if (
      relativePath === "" ||
      relativePath === ".." ||
      relativePath.startsWith(`..${sep}`) ||
      isAbsolute(relativePath)
    )
      throw new CommandSourceError(
        `A top-level entry of the plugin directory its command produced (${printableName(entryName, 80)}) points outside that directory; refusing to link it.`,
        "plugin command source link escapes producer directory",
      );
    links.push({
      name: entryName,
      target: targetPath,
      isDirectory,
    });
  }
  return links;
}
//@ chunk-5hddsdew.js:13493-14926 placement
async function checkRelinkTarget(sourcePath, cachePath) {
  let sourceDir = resolve(getOriginalCwd(), sourcePath);
  let cacheDir = resolve(getOriginalCwd(), cachePath);
  let linkFarmMarker = await readLinkFarmMarker(join(sourceDir, PLUGIN_LINK_FILE));
  let target = pluginLinkSchema().parse(JSON.parse(linkFarmMarker)).target;
  if (traversesUntrustedLink(target))
    throw new CommandSourceError(
      "The link farm points at a producer reached through a link that cannot be trusted; refusing to relink it.",
      "plugin command source relink target traverses a suspect link",
    );
  let producerDir = await realpath(target);
  if (isUntrustedLinkPath(producerDir))
    throw new CommandSourceError(
      "The link farm points at a producer that now resolves to a network location; refusing to relink it.",
      "plugin command source relink target resolves to a network path",
    );
  let linkEntries = [];
  for (let dirent of await readdir(sourceDir, {
    withFileTypes: true,
  })) {
    if (isPristineLinkFarm(dirent.name)) continue;
    if ((await classifyDirEntrySafe(sourceDir, dirent))?.isSymbolicLink) linkEntries.push(dirent);
  }
  let relinkedEntries = [];
  for (let entry of linkEntries) {
    let linkTarget;
    try {
      linkTarget = await readlink(join(sourceDir, entry.name));
    } catch (error) {
      if (isENOENT(error)) continue;
      throw new CommandSourceError(
        `A link in the staged farm could not be read (${printableName(errorMessage(error), 120)}); refusing to relink it.`,
        "plugin command source relink entry unreadable",
      );
    }
    if (hasDotSegmentAlias(linkTarget))
      throw new CommandSourceError(
        "A link in the staged farm is not in canonical form; refusing to relink it.",
        "plugin command source relink entry not canonical",
      );
    relinkedEntries.push(entry);
  }
  let links = await checkPluginEntryLinks(
    producerDir,
    relinkedEntries.map((entry) => ({
      name: entry.name,
      path: join(sourceDir, entry.name),
    })),
  );
  await mkdir(dirname(cacheDir), {
    recursive: true,
  });
  let tempDir = linkingTempName(cacheDir, process.pid);
  await removeDirectoryTreeNoFollow(tempDir);
  await mkdir(tempDir);
  try {
    for (let { name: entryName, target, isDirectory } of links)
      await symlink(target, join(tempDir, entryName), isDirectory ? "dir" : "file");
    await writeFile(join(tempDir, PLUGIN_LINK_FILE), linkFarmMarker, {
      flag: "wx",
    });
    await rename(tempDir, cacheDir);
  } catch (error) {
    await removeDirectoryTreeNoFollow(tempDir).catch(() => {});
    let errnoCode = getErrnoCode(error);
    if (
      (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") &&
      (await classifyLinkFarm(cacheDir)) === "live" &&
      !(await hasEntriesOutsideTarget(cacheDir, producerDir))
    )
      return;
    throw error;
  }
}
//@ chunk-5hddsdew.js:14926-15033 placement
/**
 * 删掉缓存目录中应忽略的项（可保留 .git）。
 */
async function removeIgnoredEntries(dir, { keepGit }) {
  for (let entryName of await readdir(dir))
    if (isPristineLinkFarm(entryName) && !(keepGit && foldCase_2(entryName) === ".git"))
      await removeDirectoryTreeNoFollow(join(dir, entryName));
}
//@ chunk-5hddsdew.js:15033-15066 placement
/**
 * isPristineLinkFarm：链接农场是否只含缓存元数据。
 */
function isPristineLinkFarm(entryName) {
  return matchesSegmentOrTempName(entryName, LINK_FARM_META_NAMES);
}
//@ chunk-5hddsdew.js:15066-15098 placement
var LINK_FARM_META_NAMES; // deferred: uses CACHE_META_FILES (./cacheUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5hddsdew.js:15066", () => {
  LINK_FARM_META_NAMES = new Set([...CACHE_META_FILES, ".git"]);
});
//@ chunk-5hddsdew.js:15098-15213 placement
/**
 * 链接农场是否仍是 live（无法判定时按参数决定）。
 */
async function isLiveLinkFarm(farmDir, { unclassifiableIsFarm = false } = {}) {
  let classification = await classifyLinkFarm(farmDir);
  return classification === "live" || (classification === "unclassifiable" && unclassifiableIsFarm);
}
//@ chunk-5hddsdew.js:15213-15666 placement
/**
 * 读取链接标记并校验；目录中存在指向绝对路径的符号链接则为 live，否则 not-live；读取错误按 errno 归为 not-live 或 unclassifiable。
 */
async function classifyLinkFarm(farmDir) {
  try {
    pluginLinkSchema().parse(JSON.parse(await readLinkFarmMarker(join(farmDir, PLUGIN_LINK_FILE))));
  } catch (error) {
    if (getErrnoCode(error) !== undefined) return classifyError(error);
  }
  try {
    for (let entry of await readdir(farmDir, {
      withFileTypes: true,
    })) {
      if (isPristineLinkFarm(entry.name)) continue;
      try {
        let entryInfo = await classifyDirEntry(farmDir, entry);
        if (
          entryInfo.isSymbolicLink &&
          isAbsolute(entryInfo.linkTarget ?? (await readlink(join(farmDir, entry.name))))
        )
          return "live";
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT") continue;
        return classifyError(error);
      }
    }
    return "not-live";
  } catch (error) {
    return classifyError(error);
  }
  function classifyError(error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "not-live" : "unclassifiable";
  }
}
//@ chunk-5hddsdew.js:15666-15731 placement
var IGNORED_CACHE_ENTRIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5hddsdew.js:15666", () => {
  IGNORED_CACHE_ENTRIES = new Set([".ds_store", "thumbs.db", "desktop.ini", "icon\r"]);
});
//@ chunk-5hddsdew.js:15731-15795 placement
function isIgnoredCacheEntry(name) {
  let foldedName = foldCase_2(name);
  return IGNORED_CACHE_ENTRIES.has(foldedName) || foldedName.startsWith("._");
}
//@ chunk-5hddsdew.js:15795-15828 placement
function isCacheMetaFile(name) {
  return CACHE_META_FILES.has(name);
}
//@ chunk-5hddsdew.js:15828-16266 placement
/**
 * 检查缓存目录 e：跳过忽略项与缓存元数据文件，若有普通文件/目录或指向 n 之外（或可疑）路径的符号链接则返回 true。
 */
async function hasEntriesOutsideTarget(farmDir, targetDir) {
  let targetPrefix = targetDir.replace(/[\\/]+$/, "") + sep;
  try {
    for (let entry of await readdir(farmDir, {
      withFileTypes: true,
    })) {
      if (isCacheMetaFile(entry.name)) continue;
      let linkTarget;
      try {
        let entryInfo = await classifyDirEntry(farmDir, entry);
        if (
          entryInfo.isFile &&
          (isIgnoredCacheEntry(entry.name) || matchesSegmentOrTempName(entry.name, CACHE_META_FILES))
        )
          continue;
        if (!entryInfo.isSymbolicLink) return true;
        linkTarget = entryInfo.linkTarget ?? (await readlink(join(farmDir, entry.name)));
      } catch (error) {
        if (getErrnoCode(error) === "ENOENT") continue;
        return true;
      }
      if (
        !isAbsolute(linkTarget) ||
        hasDotSegmentAlias(linkTarget) ||
        isUntrustedLinkPath(linkTarget) ||
        !linkTarget.startsWith(targetPrefix)
      )
        return true;
    }
    return false;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
  }
}
//@ chunk-5hddsdew.js:16266-16363 placement
/**
 * readLinkFarmTarget：读取链接农场标记的目标。
 */
async function readLinkFarmTarget(farmDir) {
  try {
    return pluginLinkSchema().parse(JSON.parse(await readLinkFarmMarker(join(farmDir, PLUGIN_LINK_FILE))))
      .target;
  } catch {
    return;
  }
}
//@ chunk-5hddsdew.js:16363-16376 placement
var MAX_LINK_FARM_MARKER_BYTES = 16384;
//@ chunk-5hddsdew.js:16376-16608 placement
async function readLinkFarmMarker(markerPath) {
  let markerStat = await lstat(markerPath);
  if (!markerStat.isFile() || markerStat.size > MAX_LINK_FARM_MARKER_BYTES)
    throw new CommandSourceError(
      "The link-farm marker is not a small regular file; refusing to read it.",
      "plugin command source link marker not a small regular file",
    );
  return readFile(markerPath, "utf8");
}
//@ chunk-5hddsdew.js:16608-16682 placement (2.1.88 match: extractBashToolsFromMessages, 1)
/**
 * commandSourceSpecOf：取出 command 来源配置。
 */
function commandSourceSpecOf(messages) {
  return typeof messages === "object" && messages.source === "command" ? messages : undefined;
}
//@ chunk-5hddsdew.js:16682-16727 placement
/**
 * isLinkModeCommandSource：命令源是否为 link 模式。
 */
function isLinkModeCommandSource(source) {
  return commandSourceSpecOf(source)?.mode === "link";
}
//@ chunk-5hddsdew.js:16727-17716 placement
async function holdCommandSourceForOrg(source, targetPath, materialize, consent) {
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
  describePluginSourceMode(source, consent);
  return withFeatureTelemetry("plugin_command_install", async () => {
    let producerDir = await runPluginCommandSource(source);
    if (
      isPathWithin(producerDir, getOriginalCwd(), {
        foldCase: true,
      })
    )
      throw new CommandSourceError(
        `Plugin source command printed the working directory or one of its parents (${printableName(producerDir, 300)}); refusing to use it as a plugin.`,
        "plugin command source printed cwd or an ancestor",
      );
    recordProducerDir(producerDir);
    if (source.mode === "link")
      return {
        contentSha256: await createLinkFarm(producerDir, targetPath),
        producerDirectory: producerDir,
      };
    await checkPluginDirSize(producerDir);
    await materialize(producerDir, targetPath);
    await removeIgnoredEntries(targetPath, {
      keepGit: false,
    });
    return {
      contentSha256: await hashPluginDirectoryContents(targetPath),
      producerDirectory: producerDir,
    };
  });
}
//@ chunk-5hddsdew.js:17746-17764 placement
var TRUST_DIALOG_TIMEOUT_MS = 1e4;
var TRUST_DIALOG_LONG_TIMEOUT_MS = 1e6;
//@ chunk-5hddsdew.js:17764-17839 placement
function isWorkspaceTrustedForCommandSource(repoResidentOrigin) {
  if (isWorkspacePersistedTrusted(repoResidentOrigin)) return true;
  return (
    (repoResidentOrigin === undefined || repoResidentOrigin === homedir()) &&
    isHomeDirectorySession() &&
    getHomeTrustDialogAccepted()
  );
}
//@ chunk-5hddsdew.js:17839-18593 placement
async function classifyCommandSourceFailure(options) {
  if (options.isRepoResidentConfig && !isWorkspaceTrustedForCommandSource(options.repoResidentOrigin))
    return {
      ok: false,
      reason: "missing_trust",
    };
  let builtEnv =
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
  let env = builtEnv.env;
  if (options.pluginId !== undefined)
    checkPluginBunOptions(
      options.pluginId,
      env,
      builtEnv.withoutContextEnv ??
        buildCommandSourceEnv({
          ...options,
          env: undefined,
        }),
    );
  let result = await execFileNoThrowWithCwd(options.command, [], {
    shell: true,
    timeout: TRUST_DIALOG_TIMEOUT_MS,
    maxBuffer: TRUST_DIALOG_LONG_TIMEOUT_MS,
    cwd: options.cwd,
    env,
    extendEnv: false,
  });
  if (result.code !== 0 || !result.stdout)
    return {
      ok: false,
      reason: "exec_failed",
    };
  let parsed;
  try {
    parsed = jsonParse(result.stdout.trim());
  } catch {
    return {
      ok: false,
      reason: "parse_failed",
    };
  }
  if (!isPlainObject(parsed))
    return {
      ok: false,
      reason: "non_object",
    };
  let headers = {};
  for (let [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string")
      return {
        ok: false,
        reason: "non_string_value",
      };
    headers[key] = value;
  }
  return {
    ok: true,
    headers,
  };
}
//@ chunk-5hddsdew.js:18593-19163 placement
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
  for (let name of listSecretEnvNames()) {
    let value = process.env[name] ?? env[name];
    if (value !== undefined && value !== "" && !isEnvTruthy(value) && !isEnvDefinedFalsy(value))
      secrets.push(value);
    delete env[name];
  }
  let env_2 = process.env;
  let mergedEnv = {};
  for (let name of new Set([...Object.keys(env), ...Object.keys(env_2)]))
    mergedEnv[name] = env_2[name] ?? env[name];
  for (let name of sanitizeEnvCredentials(mergedEnv).lostCredential) {
    let value = mergedEnv[name];
    if (value !== undefined && value !== "") secrets.push(value);
  }
  Object.assign(env, sanitizeEnvCredentials(env).respelled);
  secrets.sort((entryA, entryB) => entryB.length - entryA.length);
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
//@ chunk-5hddsdew.js:19163-19210 placement
/**
 * organizationAnswerState：等待组织答复的共享状态。
 */
var organizationAnswerState = {
  wait: undefined,
  ask: undefined,
  fetches: undefined,
};
//@ chunk-5hddsdew.js:19210-19405 placement
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
//@ chunk-5hddsdew.js:19405-19419 placement
/**
 * ORGANIZATION_ANSWER_TIMEOUT_MS：等待组织答复超时。
 */
var ORGANIZATION_ANSWER_TIMEOUT_MS = 30000;
//@ chunk-5hddsdew.js:19419-19432 placement
/**
 * ORGANIZATION_ANSWER_POLL_MS：组织答复轮询间隔。
 */
var ORGANIZATION_ANSWER_POLL_MS = 3000;
//@ chunk-5hddsdew.js:19432-19539 placement
/**
 * 带截止时间等待组织答复（共享）。
 */
function waitForOrganizationAnswer(timeoutMs) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  organizationAsk.answerWait ??= withDeadline(
    askOrganizationOnce(),
    ORGANIZATION_ANSWER_POLL_MS,
    timeoutMs,
  ).then(() => {});
  return organizationAsk.answerWait;
}
//@ chunk-5hddsdew.js:19539-19612 placement
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
  CommandSourceError,
  classifyLinkFarm,
  readLinkFarmTarget,
  hasEntriesOutsideTarget,
  isPristineLinkFarm,
  isLinkModeCommandSource,
  checkRelinkTarget,
  TEMP_CACHE_CLONE_SUFFIX,
  makeTempCachePathName,
  TEMP_CACHE_LINK_SUFFIX,
  holdCommandSourceForOrg,
  PLUGIN_JSON,
  removeIgnoredEntries,
  findPluginRootInExtracted,
  pluginRootHasMarker,
  PLUGIN_MANIFEST_PATH,
  commandSourceSpecOf,
  isLiveLinkFarm,
  shouldRefreshCommandPlugins,
  MARKETPLACE_MANIFEST_PATH,
  PLUGIN_ROOT_MARKERS,
  MAX_SPILL_BYTES,
  describeCommandOutputMode,
  waitForOrganizationAnswer,
  CLAUDE_CODE_PLUGIN_MANAGER,
  COMMAND_SOURCE_DEFAULT_TIMEOUT_MS,
  commandSourceRefreshEnabled,
  classifyCommandSourceFailure,
  regExp,
  regExp_2,
  MAX_PLUGIN_ARCHIVE_BYTES,
  PLUGIN_MANIFEST_DIR,
  isPluginRootMarker,
  isPluginComponentDir,
  ORGANIZATION_ANSWER_POLL_MS,
  PLUGIN_COMPONENT_DIRS,
  isPluginsDirOnLocalDisk,
  LINK_MODE_UNSUPPORTED_ON_WINDOWS_MESSAGE,
  describeCommandSourceMode,
};
