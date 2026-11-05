/**
 * utils/ide.ts
 *
 * IDE 检测与连接：~/.claude/ide/<port>.lock 读取与清理、运行中 IDE 进程检测、VS Code/JetBrains 判断、扩展自动安装、WSL 宿主 IP
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ide.ts
 * pieces: chunk-5xgkngpb.js (53), chunk-7jxyna5q.js (2), chunk-qg41pqt6.js (1)
 * attribution: placement 8, affinity 2, callgraph-witnessed 3, fingerprint 30, layout 12, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, basename, sep, resolve as resolve_2, isAbsolute } from "path";
import "os";
import * as osModule_2 from "os";
import { createConnection } from "net";
import { realpath } from "fs/promises";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { env } from "./env.js";
import { getPlatform } from "./platform.js";
import { windowsToWslPath, checkWSLDistroMatch, WindowsToWSLConverter } from "./idePathConversion.js";
import { getFsImplementation } from "./fsOperations.js";
import { isFsInaccessible, errorMessage, sanitizedErrCodeForTelemetry } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { firstLineOf, clippedMessage } from "./stringUtils.js";
import { capitalizeAlias } from "../../vendor/lodash-es/upperFirst.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsScrollDraining, getOriginalCwd } from "../bootstrap/state.js";
import { isJetBrainsPluginInstalled } from "./jetbrains.js";
import { getAncestorPidsAsync } from "./processIdentity.js";
import { envDynamicProbe } from "./envDynamic.js";
import { logError } from "./log.js";
import { jsonParse } from "./slowOperations.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { sanitizeVersion } from "../services/analytics/metadata.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { createAbortController } from "./abortController.js";
import { sleep } from "./sleep.js";
import { isPathWithinCaseAware } from "./pathPrefix.js";
import { lt as lt_2 } from "./semver.js";
import { VSCODE_FAMILY } from "./editor.js";
import { safeExecShell } from "./safeSpawn.js";
import { hasIdeOnboardingDialogBeenShown } from "../components/IdeOnboardingDialog.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-qg41pqt6.js:854252-854922 fingerprint (2.1.88 match: getIdeLockfilesPaths, 0.756)
/**
 * IDE lockfile 目录列表：<配置目录>/ide（设置了 CLAUDE_CONFIG_DIR 时再加 ~/.claude/ide）；WSL 下还加 %USERPROFILE%/.claude/ide 与 /mnt/c/Users/*\/.claude/ide。
 */
function getIdeLockfilesPaths() {
  let claudeConfigDir = getClaudeConfigDir();
  let paths = [join(claudeConfigDir, "ide")];
  if (env.CLAUDE_CONFIG_DIR || claudeConfigDir.trim() === "")
    paths.push(join(osModule_2.homedir(), ".claude", "ide").normalize("NFC"));
  if (getPlatform() === "wsl") {
    let wslProfile = env.USERPROFILE ? windowsToWslPath(env.USERPROFILE) : null;
    if (wslProfile) paths.push(join(wslProfile, ".claude", "ide"));
    try {
      let entries = getFsImplementation().readdirSync("/mnt/c/Users");
      for (let user of entries) {
        if (!user.isDirectory() && !user.isSymbolicLink()) continue;
        if (
          user.name === "Public" ||
          user.name === "Default" ||
          user.name === "Default User" ||
          user.name === "All Users"
        )
          continue;
        paths.push(join("/mnt/c/Users", user.name, ".claude", "ide"));
      }
    } catch (error) {
      if (isFsInaccessible(error))
        logForDebugging(`WSL IDE lockfile path detection failed (${error.code}): ${errorMessage(error)}`);
      else
        logForDebugging(`WSL IDE lockfile path detection failed unexpectedly: ${errorMessage(error)}`, {
          level: "error",
        });
    }
  }
  return paths;
}
//@ chunk-7jxyna5q.js:502751-505882 fingerprint (2.1.88 match: supportedIdeConfigs, 0.878)
/**
 * 支持的 IDE 配置表：每种 IDE 的类型（vscode/jetbrains）、显示名及 macOS/Windows/Linux 进程关键字，用于进程检测。
 */
var SUPPORTED_IDE_CONFIGS_2 = {
  cursor: {
    ideKind: "vscode",
    displayName: "Cursor",
    processKeywordsMac: ["Cursor Helper", "Cursor.app"],
    processKeywordsWindows: ["cursor.exe"],
    processKeywordsLinux: ["cursor"],
  },
  windsurf: {
    ideKind: "vscode",
    displayName: "Devin Desktop",
    processKeywordsMac: ["Windsurf Helper", "Windsurf.app", "Devin Helper", "Devin.app"],
    processKeywordsWindows: ["windsurf.exe", "Devin.exe"],
    processKeywordsLinux: ["windsurf", "devin-desktop"],
  },
  vscode: {
    ideKind: "vscode",
    displayName: "VS Code",
    processKeywordsMac: ["Visual Studio Code", "Code Helper"],
    processKeywordsWindows: ["code.exe"],
    processKeywordsLinux: ["code"],
  },
  intellij: {
    ideKind: "jetbrains",
    displayName: "IntelliJ IDEA",
    processKeywordsMac: ["IntelliJ IDEA"],
    processKeywordsWindows: ["idea64.exe"],
    processKeywordsLinux: ["idea", "intellij"],
  },
  pycharm: {
    ideKind: "jetbrains",
    displayName: "PyCharm",
    processKeywordsMac: ["PyCharm"],
    processKeywordsWindows: ["pycharm64.exe"],
    processKeywordsLinux: ["pycharm"],
  },
  webstorm: {
    ideKind: "jetbrains",
    displayName: "WebStorm",
    processKeywordsMac: ["WebStorm"],
    processKeywordsWindows: ["webstorm64.exe"],
    processKeywordsLinux: ["webstorm"],
  },
  phpstorm: {
    ideKind: "jetbrains",
    displayName: "PhpStorm",
    processKeywordsMac: ["PhpStorm"],
    processKeywordsWindows: ["phpstorm64.exe"],
    processKeywordsLinux: ["phpstorm"],
  },
  rubymine: {
    ideKind: "jetbrains",
    displayName: "RubyMine",
    processKeywordsMac: ["RubyMine"],
    processKeywordsWindows: ["rubymine64.exe"],
    processKeywordsLinux: ["rubymine"],
  },
  clion: {
    ideKind: "jetbrains",
    displayName: "CLion",
    processKeywordsMac: ["CLion"],
    processKeywordsWindows: ["clion64.exe"],
    processKeywordsLinux: ["clion"],
  },
  goland: {
    ideKind: "jetbrains",
    displayName: "GoLand",
    processKeywordsMac: ["GoLand"],
    processKeywordsWindows: ["goland64.exe"],
    processKeywordsLinux: ["goland"],
  },
  rider: {
    ideKind: "jetbrains",
    displayName: "Rider",
    processKeywordsMac: ["Rider"],
    processKeywordsWindows: ["rider64.exe"],
    processKeywordsLinux: ["rider"],
  },
  datagrip: {
    ideKind: "jetbrains",
    displayName: "DataGrip",
    processKeywordsMac: ["DataGrip"],
    processKeywordsWindows: ["datagrip64.exe"],
    processKeywordsLinux: ["datagrip"],
  },
  appcode: {
    ideKind: "jetbrains",
    displayName: "AppCode",
    processKeywordsMac: ["AppCode"],
    processKeywordsWindows: ["appcode.exe"],
    processKeywordsLinux: ["appcode"],
  },
  dataspell: {
    ideKind: "jetbrains",
    displayName: "DataSpell",
    processKeywordsMac: ["DataSpell"],
    processKeywordsWindows: ["dataspell64.exe"],
    processKeywordsLinux: ["dataspell"],
  },
  aqua: {
    ideKind: "jetbrains",
    displayName: "Aqua",
    processKeywordsMac: [],
    processKeywordsWindows: ["aqua64.exe"],
    processKeywordsLinux: [],
  },
  gateway: {
    ideKind: "jetbrains",
    displayName: "Gateway",
    processKeywordsMac: [],
    processKeywordsWindows: ["gateway64.exe"],
    processKeywordsLinux: [],
  },
  fleet: {
    ideKind: "jetbrains",
    displayName: "Fleet",
    processKeywordsMac: [],
    processKeywordsWindows: ["fleet.exe"],
    processKeywordsLinux: [],
  },
  androidstudio: {
    ideKind: "jetbrains",
    displayName: "Android Studio",
    processKeywordsMac: ["Android Studio"],
    processKeywordsWindows: ["studio64.exe"],
    processKeywordsLinux: ["android-studio"],
  },
};
var SUPPORTED_IDE_CONFIGS = {
  code: "VS Code",
  cursor: "Cursor",
  windsurf: "Devin Desktop",
  antigravity: "Antigravity",
  vi: "Vim",
  vim: "Vim",
  nano: "nano",
  notepad: "Notepad",
  "start /wait notepad": "Notepad",
  emacs: "Emacs",
  subl: "Sublime Text",
  atom: "Atom",
};
//@ chunk-7jxyna5q.js:505882-506106 fingerprint (2.1.88 match: toIDEDisplayName, 1)
/**
 * IDE 标识 → 显示名。
 */
function toIDEDisplayName(terminal) {
  if (!terminal) return "IDE";
  let config = SUPPORTED_IDE_CONFIGS_2[terminal];
  if (config) return config.displayName;
  let editorName = SUPPORTED_IDE_CONFIGS[terminal.toLowerCase().trim()];
  if (editorName) return editorName;
  let command = firstLineOf(terminal, " ");
  let commandName = command ? basename(command).toLowerCase() : null;
  if (commandName) {
    let mappedName = SUPPORTED_IDE_CONFIGS[commandName];
    if (mappedName) return mappedName;
    return capitalizeAlias(commandName);
  }
  return capitalizeAlias(terminal);
}
//@ chunk-5xgkngpb.js:3317837-3317875 placement
/**
 * 表示"IDE 检测结果尚未计算"的哨兵符号。
 */
var IDE_NOT_YET_COMPUTED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3317837", () => {
  IDE_NOT_YET_COMPUTED = Symbol("ide-not-yet-computed");
});
//@ chunk-5xgkngpb.js:3317875-3318431 placement
/**
 * IDE 检测的进程状态（终端判断缓存、宿主 IP、运行中 IDE、JetBrains 插件安装状态）。
 */
class IdeDetectionState {
  supportedVSCodeTerminal = IDE_NOT_YET_COMPUTED;
  supportedJetBrainsTerminal = IDE_NOT_YET_COMPUTED;
  supportedTerminal = IDE_NOT_YET_COMPUTED;
  windowsUserProfile = undefined;
  vscodeCommandByParentProcess = undefined;
  hostIPByTarget = new Map();
  runningIDEs = null;
  currentSearch = null;
  jetbrainsPluginInstalled = new Map();
  clear() {
    this.supportedVSCodeTerminal = IDE_NOT_YET_COMPUTED;
    this.supportedJetBrainsTerminal = IDE_NOT_YET_COMPUTED;
    this.supportedTerminal = IDE_NOT_YET_COMPUTED;
    this.windowsUserProfile = undefined;
    this.vscodeCommandByParentProcess = undefined;
    this.hostIPByTarget.clear();
    this.jetbrainsPluginInstalled.clear();
    this.runningIDEs = null;
    this.currentSearch?.abort();
    this.currentSearch = null;
  }
}
//@ chunk-5xgkngpb.js:3318431-3318458 placement
var ideDetectionStateRegistry; // deferred: uses IdeDetectionState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3318431", () => {
  ideDetectionStateRegistry = new HostScoped(() => new IdeDetectionState());
});
//@ chunk-5xgkngpb.js:3318458-3318496 placement
/**
 * 取当前宿主的 IDE 检测状态。
 */
function currentIdeDetectionState() {
  return ideDetectionStateRegistry.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:3320157-3320273 affinity
/**
 * 缓存 JetBrains 插件是否已安装（可强制刷新）。
 */
async function isJetBrainsPluginInstalledCached(ideType) {
  let jetbrainsPluginInstalled = currentIdeDetectionState().jetbrainsPluginInstalled;
  let cached = jetbrainsPluginInstalled.get(ideType);
  if (cached) return cached;
  let installed = isJetBrainsPluginInstalled(ideType);
  jetbrainsPluginInstalled.set(ideType, installed);
  return installed;
}
//@ chunk-5xgkngpb.js:3320273-3320337 callgraph-witnessed (2.1.88 match: isProcessRunning, 1)
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:3320337-3320435 fingerprint (2.1.88 match: makeAncestorPidLookup, 1)
function makeAncestorPidLookup() {
  let promise = null;
  return () => {
    if (!promise) promise = getAncestorPidsAsync(process.ppid, 10).then((pids) => new Set(pids));
    return promise;
  };
}
//@ chunk-5xgkngpb.js:3320435-3320510 fingerprint (2.1.88 match: isVSCodeIde, 1)
function isVSCodeIde(ide) {
  if (!ide) return false;
  let config = SUPPORTED_IDE_CONFIGS_2[ide];
  return config && config.ideKind === "vscode";
}
//@ chunk-5xgkngpb.js:3320510-3320588 fingerprint (2.1.88 match: isJetBrainsIde, 1)
function isJetBrainsIde(ide) {
  if (!ide) return false;
  let config = SUPPORTED_IDE_CONFIGS_2[ide];
  return config && config.ideKind === "jetbrains";
}
//@ chunk-5xgkngpb.js:3320588-3320723 layout
function isVSCodeTerminal() {
  let detectionState = currentIdeDetectionState();
  if (detectionState.supportedVSCodeTerminal === IDE_NOT_YET_COMPUTED)
    detectionState.supportedVSCodeTerminal = isVSCodeIde(env.terminal);
  return detectionState.supportedVSCodeTerminal;
}
//@ chunk-5xgkngpb.js:3320723-3320868 placement
/**
 * 当前终端是否为 JetBrains IDE 终端（缓存）。
 */
function isJetBrainsTerminal() {
  let state = currentIdeDetectionState();
  if (state.supportedJetBrainsTerminal === IDE_NOT_YET_COMPUTED)
    state.supportedJetBrainsTerminal = isJetBrainsIde(envDynamicProbe.terminal);
  return state.supportedJetBrainsTerminal;
}
//@ chunk-5xgkngpb.js:3320868-3321023 fingerprint (2.1.88 match: isSupportedTerminal, 0.667)
/**
 * 当前终端是否为受支持的 IDE 集成终端（VS Code 系或 JetBrains）。
 */
function isSupportedTerminal() {
  let state = currentIdeDetectionState();
  if (state.supportedTerminal === IDE_NOT_YET_COMPUTED)
    state.supportedTerminal =
      isVSCodeTerminal() || isJetBrainsTerminal() || Boolean(process.env.FORCE_CODE_TERMINAL);
  return state.supportedTerminal;
}
//@ chunk-5xgkngpb.js:3321023-3321077 callgraph-witnessed (2.1.88 match: getTerminalIdeType, 1)
function getTerminalIdeType() {
  if (!isSupportedTerminal()) return null;
  return env.terminal;
}
//@ chunk-5xgkngpb.js:3321276-3321734 fingerprint (2.1.88 match: getSortedIdeLockfiles, 1)
/**
 * 收集所有 IDE lockfile 目录下的 <port>.lock 文件并按 mtime 从新到旧排序。
 */
async function getSortedIdeLockfiles() {
  try {
    let ideLockFilePaths = await getConnectedIdeName();
    return (
      await Promise.all(
        ideLockFilePaths.map(async (ideLockFilePath) => {
          try {
            let lockEntries = (await getFsImplementation().readdir(ideLockFilePath)).filter((file) =>
              file.name.endsWith(".lock"),
            );
            return (
              await Promise.all(
                lockEntries.map(async (file) => {
                  let fullPath = join(ideLockFilePath, file.name);
                  try {
                    let fileStat = await getFsImplementation().stat(fullPath);
                    return {
                      path: fullPath,
                      mtime: fileStat.mtime,
                    };
                  } catch {
                    return null;
                  }
                }),
              )
            ).filter((entry) => entry !== null);
          } catch (error) {
            if (!isFsInaccessible(error)) logError(error);
            return [];
          }
        }),
      )
    )
      .flat()
      .sort((left, right) => right.mtime.getTime() - left.mtime.getTime())
      .map((file) => file.path);
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-5xgkngpb.js:3321734-3322276 fingerprint (2.1.88 match: readIdeLockfile, 0.912)
/**
 * 解析 IDE lockfile：JSON（workspaceFolders、pid、ideName、transport=ws、runningInWindows、authToken）或旧格式逐行工作区；端口取自文件名。
 */
async function readIdeLockfile(path) {
  try {
    let content = await getFsImplementation().readFile(path, {
      encoding: "utf-8",
    });
    let workspaceFolders = [];
    let pid;
    let ideName;
    let useWebSocket = false;
    let runningInWindows = false;
    let authToken;
    try {
      let parsedContent = jsonParse(content);
      if (parsedContent.workspaceFolders) workspaceFolders = parsedContent.workspaceFolders;
      pid = parsedContent.pid;
      ideName = parsedContent.ideName;
      useWebSocket = parsedContent.transport === "ws";
      runningInWindows = parsedContent.runningInWindows === true;
      authToken = parsedContent.authToken;
    } catch (error) {
      workspaceFolders = content
        .split(
          `
`,
        )
        .map((line) => line.trim());
    }
    let filename = path.split(sep).pop();
    if (!filename) return null;
    let port = filename.replace(".lock", "");
    return {
      workspaceFolders,
      port: parseInt(port),
      pid,
      ideName,
      useWebSocket,
      runningInWindows,
      authToken,
    };
  } catch (error) {
    logForDebugging(`Failed to read IDE lockfile ${path}: ${errorMessage(error)}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-5xgkngpb.js:3322276-3322499 fingerprint (2.1.88 match: checkIdeConnection, 1)
/**
 * 尝试连接 IDE 的 MCP 端点确认可用。
 */
async function checkIdeConnection(host, port, timeout = 500) {
  try {
    return new Promise((resolve) => {
      let socket = createConnection({
        host,
        port,
        timeout,
      });
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => {
        resolve(false);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });
  } catch (error) {
    return false;
  }
}
//@ chunk-5xgkngpb.js:3322499-3322761 fingerprint (2.1.88 match: getWindowsUserProfile, 0.959)
async function getWindowsUserProfile() {
  let { stdout, code } = await execFileNoThrow("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "$env:USERPROFILE",
  ]);
  if (code === 0 && stdout.trim()) return stdout.trim();
  logForDebugging("Unable to get Windows USERPROFILE via PowerShell - IDE detection may be incomplete");
  return;
}
//@ chunk-5xgkngpb.js:3322761-3323072 file-local
async function getConnectedIdeName() {
  let ideLockfilesPaths = getIdeLockfilesPaths();
  if (getPlatform() === "wsl" && !env.USERPROFILE) {
    let state = currentIdeDetectionState();
    state.windowsUserProfile ??= getWindowsUserProfile();
    let windowsUserProfile = await state.windowsUserProfile;
    let wslProfile = windowsUserProfile ? windowsToWslPath(windowsUserProfile) : null;
    if (wslProfile) ideLockfilesPaths.push(resolve_2(wslProfile, ".claude", "ide"));
  }
  let seenDirs = new Set();
  let uniqueDirs = [];
  for (let ideLockfilesPath of ideLockfilesPaths) {
    let realDir = await realpath(ideLockfilesPath).catch(() => resolve_2(ideLockfilesPath));
    if (seenDirs.has(realDir)) continue;
    seenDirs.add(realDir);
    uniqueDirs.push(ideLockfilesPath);
  }
  return uniqueDirs;
}
//@ chunk-5xgkngpb.js:3323072-3323563 fingerprint (2.1.88 match: cleanupStaleIdeLockfiles, 0.664)
/**
 * 删除持有进程已退出或端口不可连的 IDE lockfile。
 */
async function cleanupStaleIdeLockfiles() {
  try {
    let lockfiles = await getSortedIdeLockfiles();
    for (let lockfilePath of lockfiles) {
      let lockfileInfo = await readIdeLockfile(lockfilePath);
      if (!lockfileInfo) {
        try {
          await getFsImplementation().unlink(lockfilePath);
        } catch (error) {
          logForDebugging(`Failed to delete unreadable IDE lockfile ${lockfilePath}: ${error}`, {
            level: "error",
          });
        }
        continue;
      }
      let host = await getHostIPForIdeCached(lockfileInfo.runningInWindows, lockfileInfo.port);
      let shouldDelete = false;
      if (lockfileInfo.pid) {
        if (!isProcessRunning(lockfileInfo.pid)) {
          if (getPlatform() !== "wsl") shouldDelete = true;
          else if (!(await checkIdeConnection(host, lockfileInfo.port))) shouldDelete = true;
        }
      } else if (!(await checkIdeConnection(host, lockfileInfo.port))) shouldDelete = true;
      if (shouldDelete)
        try {
          await getFsImplementation().unlink(lockfilePath);
        } catch (error) {
          logForDebugging(`Failed to remove stale IDE lockfile ${lockfilePath}: ${errorMessage(error)}`, {
            level: "error",
          });
        }
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:3323563-3324193 fingerprint (2.1.88 match: maybeInstallIDEExtension, 0.632)
/**
 * 在 VS Code 系终端中自动安装 Claude Code 扩展（受 CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL 与 autoInstallIdeExtension 控制）。
 */
async function maybeInstallIDEExtension(ideType, options) {
  try {
    let { installedVersion, previouslyInstalled } = await installIDEExtension(ideType);
    logEvent("tengu_ext_installed", {
      ide_type: fromEnum(ideType),
      installed_version: installedVersion == null ? undefined : sanitizeVersion(installedVersion),
    });
    logFeatureOk("ide_extension_install");
    if (!getGlobalConfig().diffTool)
      await saveGlobalConfig(
        (current) => ({
          ...current,
          diffTool: "auto",
        }),
        options,
      );
    return {
      installed: true,
      error: null,
      installedVersion,
      ideType,
      previouslyInstalled,
    };
  } catch (error) {
    logEvent("tengu_ext_install_error", {
      ide_type: fromEnum(ideType),
      error_code: sanitizedErrCodeForTelemetry(error),
    });
    logFeatureBad("ide_extension_install", "ide_extension_install_failed");
    let errorMessage = error instanceof Error ? error.message : String(error);
    logForDebugging(`IDE extension install failed: ${errorMessage}`, {
      level: "error",
    });
    return {
      installed: false,
      error: errorMessage,
      installedVersion: null,
      ideType,
    };
  }
}
//@ chunk-5xgkngpb.js:3324193-3324633 callgraph-witnessed (2.1.88 match: findAvailableIDE, 0)
/**
 * 轮询（最多 30 秒、每秒一次）查找工作区包含 cwd 的唯一 IDE，先清理陈旧 lockfile；打 ide_detect。
 */
async function findAvailableIDE() {
  let state = currentIdeDetectionState();
  if (state.currentSearch) state.currentSearch.abort();
  state.currentSearch = createAbortController();
  let signal = state.currentSearch.signal;
  await cleanupStaleIdeLockfiles();
  let startTime = Date.now();
  while (Date.now() - startTime < 30000 && !signal.aborted) {
    if (getIsScrollDraining()) {
      await sleep(1000, signal);
      continue;
    }
    let ides = await detectIDEs(false);
    if (signal.aborted) return null;
    let filtered = ides.filter((ide) => ide.workspaceContainsCwd);
    if (filtered.length === 1) {
      logFeatureOk("ide_detect", {
        found: true,
      });
      return filtered[0];
    }
    await sleep(1000, signal);
  }
  if (!signal.aborted)
    logFeatureOk("ide_detect", {
      found: false,
    });
  return null;
}
//@ chunk-5xgkngpb.js:3324633-3324723 layout
function abortIdeSearch() {
  let state = currentIdeDetectionState();
  if (state.currentSearch) {
    state.currentSearch.abort();
    state.currentSearch = null;
  }
}
//@ chunk-5xgkngpb.js:3324723-3324827 layout
function classifyWorkspaceRelation(cwd, workspacePath) {
  if (isPathWithinCaseAware(cwd, workspacePath, false)) return "contains-cwd";
  if (isPathWithinCaseAware(workspacePath, cwd, false)) return "inside-cwd";
  return "unrelated";
}
//@ chunk-5xgkngpb.js:3324827-3324895 layout
function uppercaseDriveLetter(filePath) {
  return filePath.replace(/^[a-zA-Z]:/, (drive) => drive.toUpperCase());
}
//@ chunk-5xgkngpb.js:3324895-3326300 fingerprint (2.1.88 match: detectIDEs, 0.801)
/**
 * 读取全部 lockfile，过滤进程仍存活、工作区与 cwd 相关的 IDE，返回连接信息（url、名称、authToken、是否包含 cwd）。
 */
async function detectIDEs(includeInvalid) {
  let detectedIDEs = [];
  try {
    let CLAUDE_CODE_SSE_PORT = env.CLAUDE_CODE_SSE_PORT ?? null;
    let cwd = uppercaseDriveLetter(getOriginalCwd().normalize("NFC"));
    let lockfiles = await getSortedIdeLockfiles();
    let lockfileInfos = await Promise.all(lockfiles.map(readIdeLockfile));
    let getAncestors = makeAncestorPidLookup();
    let needsAncestryCheck = getPlatform() !== "wsl" && isSupportedTerminal();
    for (let lockfileInfo of lockfileInfos) {
      if (!lockfileInfo) continue;
      let relation = "unrelated";
      if (env.CLAUDE_CODE_IDE_SKIP_VALID_CHECK) relation = "contains-cwd";
      else if (lockfileInfo.port === CLAUDE_CODE_SSE_PORT) relation = "contains-cwd";
      else
        for (let idePath of lockfileInfo.workspaceFolders) {
          if (!idePath) continue;
          let localPath = idePath;
          if (getPlatform() === "wsl" && lockfileInfo.runningInWindows && env.WSL_DISTRO_NAME) {
            if (!checkWSLDistroMatch(idePath, env.WSL_DISTRO_NAME)) continue;
            let resolvedOriginal = resolve_2(localPath).normalize("NFC");
            if (classifyWorkspaceRelation(cwd, resolvedOriginal) === "contains-cwd") {
              relation = "contains-cwd";
              break;
            }
            localPath = await new WindowsToWSLConverter(env.WSL_DISTRO_NAME).toLocalPath(idePath);
          }
          let workspacePath = uppercaseDriveLetter(resolve_2(localPath).normalize("NFC"));
          let workspaceRelation = classifyWorkspaceRelation(cwd, workspacePath);
          if (workspaceRelation === "contains-cwd") {
            relation = workspaceRelation;
            break;
          }
          if (workspaceRelation === "inside-cwd" && isAbsolute(localPath)) relation = workspaceRelation;
        }
      let isValid = relation !== "unrelated";
      if (!isValid && !includeInvalid) continue;
      if (needsAncestryCheck) {
        if (!(CLAUDE_CODE_SSE_PORT !== null && lockfileInfo.port === CLAUDE_CODE_SSE_PORT)) {
          if (!lockfileInfo.pid || !isProcessRunning(lockfileInfo.pid)) continue;
          if (process.ppid !== lockfileInfo.pid) {
            if (!(await getAncestors()).has(lockfileInfo.pid)) continue;
          }
        }
      }
      let ideName = lockfileInfo.ideName
        ? renameWindsurfToDevin(lockfileInfo.ideName)
        : isSupportedTerminal()
          ? toIDEDisplayName(envDynamicProbe.terminal)
          : "IDE";
      let host = await getHostIPForIdeCached(lockfileInfo.runningInWindows, lockfileInfo.port);
      let url;
      if (lockfileInfo.useWebSocket) url = `ws://${host}:${lockfileInfo.port}`;
      else url = `http://${host}:${lockfileInfo.port}/sse`;
      detectedIDEs.push({
        url,
        name: ideName,
        workspaceFolders: lockfileInfo.workspaceFolders,
        port: lockfileInfo.port,
        isValid,
        workspaceContainsCwd: relation === "contains-cwd",
        authToken: lockfileInfo.authToken,
        ideRunningInWindows: lockfileInfo.runningInWindows,
      });
    }
    if (!includeInvalid && CLAUDE_CODE_SSE_PORT) {
      let envPortMatch = detectedIDEs.filter((ide) => ide.isValid && ide.port === CLAUDE_CODE_SSE_PORT);
      if (envPortMatch.length === 1) return envPortMatch;
    }
  } catch (error) {
    logError(error);
    logFeatureSad("ide_detect", "ide_detect_failed");
  }
  return detectedIDEs;
}
//@ chunk-5xgkngpb.js:3326300-3326394 fingerprint (2.1.88 match: maybeNotifyIDEConnected, 1)
async function maybeNotifyIDEConnected(client) {
  await client.notification({
    method: "ide_connected",
    params: {
      pid: process.pid,
    },
  });
}
//@ chunk-5xgkngpb.js:3326394-3326467 layout (2.1.88 match: hasAccessToIDEExtensionDiffFeature, 1)
function hasAccessToIDEExtensionDiffFeature(mcpClients) {
  return mcpClients.some((client) => client.type === "connected" && client.name === "ide");
}
//@ chunk-5xgkngpb.js:3326467-3326499 fingerprint (2.1.88 match: EXTENSION_ID, 0.601)
var EXTENSION_ID = "anthropic.claude-code";
//@ chunk-5xgkngpb.js:3326499-3326694 fingerprint (2.1.88 match: isIDEExtensionInstalled, 1)
async function isIDEExtensionInstalled(ideType) {
  if (isVSCodeIde(ideType)) {
    let command = await getVSCodeIDECommand(ideType);
    if (command)
      try {
        if (
          (
            await execFileNoThrowWithCwd(command, ["--list-extensions"], {
              env: getInstallationEnv(),
            })
          ).stdout?.includes(EXTENSION_ID)
        )
          return true;
      } catch {}
  } else if (isJetBrainsIde(ideType)) return await isJetBrainsPluginInstalledCached(ideType);
  return false;
}
//@ chunk-5xgkngpb.js:3326694-3327089 fingerprint (2.1.88 match: installIDEExtension, 0.63)
/**
 * 调用 IDE 命令行（code/cursor/windsurf --install-extension）安装扩展。
 */
async function installIDEExtension(ideType) {
  if (isVSCodeIde(ideType)) {
    let command = await getVSCodeIDECommand(ideType);
    if (command) {
      let version = await getInstalledVSCodeExtensionVersion(command);
      let previouslyInstalled = version !== null;
      if (!version || lt_2(version, getBuildInfo())) {
        await sleep(500);
        let result = await execFileNoThrowWithCwd(
          command,
          ["--force", "--install-extension", "anthropic.claude-code"],
          {
            env: getInstallationEnv(),
          },
        );
        if (result.code !== 0)
          throw Object.assign(Error(formatIdeCommandError(command, result)), {
            code: `EXIT_${result.code}`,
          });
        version = getBuildInfo();
      }
      return {
        installedVersion: version,
        previouslyInstalled,
      };
    }
  }
  return {
    installedVersion: null,
    previouslyInstalled: false,
  };
}
//@ chunk-5xgkngpb.js:3327089-3327355 layout
function formatIdeCommandError(command, result) {
  let commandName = basename(command);
  let message =
    result.error && result.error !== String(result.code)
      ? result.error
      : result.exitCode === undefined
        ? `The ${commandName} command could not be run or did not finish`
        : `The ${commandName} command exited with status ${result.exitCode}`;
  let trimmed = clippedMessage(result.stderr, MAX_EXTENSION_STDERR_CHARS).trim();
  return trimmed && !message.includes(trimmed)
    ? `${message}
${trimmed}`
    : message;
}
//@ chunk-5xgkngpb.js:3327355-3327367 layout
var MAX_EXTENSION_STDERR_CHARS = 500;
//@ chunk-5xgkngpb.js:3327367-3327459 fingerprint (2.1.88 match: getInstallationEnv, 0.809)
function getInstallationEnv() {
  if (getPlatform() === "linux")
    return {
      ...process.env,
      DISPLAY: "",
      WAYLAND_DISPLAY: "",
    };
  return;
}
//@ chunk-5xgkngpb.js:3327459-3327967 layout
function getBuildInfo() {
  return {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION;
}
//@ chunk-5xgkngpb.js:3327967-3328160 fingerprint (2.1.88 match: getInstalledVSCodeExtensionVersion, 0.805)
async function getInstalledVSCodeExtensionVersion(command) {
  let { stdout } = await execFileNoThrow(command, ["--list-extensions", "--show-versions"], {
    env: getInstallationEnv(),
  });
  let lines =
    stdout?.split(`
`) || [];
  for (let line of lines) {
    let [extensionId, version] = line.split("@");
    if (extensionId === EXTENSION_ID && version) return version;
  }
  return null;
}
//@ chunk-5xgkngpb.js:3328160-3328836 fingerprint (2.1.88 match: getVSCodeIDECommandByParentProcess, 0.802)
async function getVSCodeIDECommandByParentProcess() {
  try {
    if (getPlatform() !== "macos") return null;
    let pid = process.ppid;
    for (let i = 0; i < 10; i++) {
      if (!pid || pid === 0 || pid === 1) break;
      let command = (await execFileNoThrow("ps", ["-o", "command=", "-p", String(pid)])).stdout.trim();
      if (command) {
        let appNames = {
          "Visual Studio Code.app": "code",
          "Cursor.app": "cursor",
          "Windsurf.app": "windsurf",
          "Devin.app": "devin",
          "Visual Studio Code - Insiders.app": "code",
          "VSCodium.app": "codium",
        };
        let pathToExecutable = "/Contents/MacOS/";
        for (let [appName, executableName] of Object.entries(appNames)) {
          let appIndex = command.indexOf(appName + "/Contents/MacOS/");
          if (appIndex !== -1) {
            let folderPathEnd = appIndex + appName.length;
            return command.substring(0, folderPathEnd) + "/Contents/Resources/app/bin/" + executableName;
          }
        }
      }
      let ppidStr = (await execFileNoThrow("ps", ["-o", "ppid=", "-p", String(pid)])).stdout.trim();
      if (!ppidStr) break;
      pid = parseInt(ppidStr);
    }
    return null;
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:3329245-3329308 affinity
function renameWindsurfToDevin(ideName) {
  return ideName.replace(/windsurf/gi, "Devin Desktop");
}
//@ chunk-5xgkngpb.js:3329308-3329644 fingerprint (2.1.88 match: getVSCodeIDECommand, 0.563)
async function getVSCodeIDECommand(ideType, name) {
  let commands = VSCODE_FAMILY[ideType];
  if (!commands) return null;
  if (ideType === "vscode" && name)
    commands = name.toLowerCase().includes("vscodium") ? ["codium"] : ["code"];
  let parentExecutable = currentIdeDetectionState();
  parentExecutable.vscodeCommandByParentProcess ??= getVSCodeIDECommandByParentProcess();
  let vscodeCommandByParentProcess = await parentExecutable.vscodeCommandByParentProcess;
  if (vscodeCommandByParentProcess && commands.includes(basename(vscodeCommandByParentProcess)))
    try {
      await getFsImplementation().stat(vscodeCommandByParentProcess);
      return vscodeCommandByParentProcess;
    } catch {}
  let ext = getPlatform() === "windows" ? ".cmd" : "";
  return commands[0] + ext;
}
//@ chunk-5xgkngpb.js:3329644-3329715 fingerprint (2.1.88 match: isCursorInstalled, 1)
async function isCursorInstalled() {
  return (await execFileNoThrow("cursor", ["--version"])).code === 0;
}
//@ chunk-5xgkngpb.js:3329715-3329851 fingerprint (2.1.88 match: isWindsurfInstalled, 0.764)
async function isWindsurfInstalled() {
  if ((await execFileNoThrow("windsurf", ["--version"])).code === 0) return true;
  return (await execFileNoThrow("devin-desktop", ["--version"])).code === 0;
}
//@ chunk-5xgkngpb.js:3329851-3329975 fingerprint (2.1.88 match: isVSCodeInstalled, 1)
async function isVSCodeInstalled() {
  let result = await execFileNoThrow("code", ["--help"]);
  return result.code === 0 && Boolean(result.stdout?.includes("Visual Studio Code"));
}
//@ chunk-5xgkngpb.js:3329975-3331429 fingerprint (2.1.88 match: detectRunningIDEsImpl, 0.702)
async function detectRunningIDEsImpl() {
  let runningIDEs = [];
  try {
    let platform = getPlatform();
    if (platform === "macos") {
      let stdout =
        (
          await safeExecShell(
            'ps aux | grep -E "Visual Studio Code|Code Helper|Cursor Helper|Windsurf Helper|Devin Helper|Devin.app|IntelliJ IDEA|PyCharm|WebStorm|PhpStorm|RubyMine|CLion|GoLand|Rider|DataGrip|AppCode|DataSpell|Aqua|Gateway|Fleet|Android Studio" | grep -v grep',
            {
              reject: false,
            },
          )
        ).stdout ?? "";
      for (let [ide, config] of Object.entries(SUPPORTED_IDE_CONFIGS_2))
        for (let keyword of config.processKeywordsMac)
          if (stdout.includes(keyword)) {
            runningIDEs.push(ide);
            break;
          }
    } else if (platform === "windows") {
      let normalizedStdout = (
        (
          await safeExecShell(
            'tasklist | findstr /I "Code.exe Cursor.exe Windsurf.exe Devin.exe idea64.exe pycharm64.exe webstorm64.exe phpstorm64.exe rubymine64.exe clion64.exe goland64.exe rider64.exe datagrip64.exe appcode.exe dataspell64.exe aqua64.exe gateway64.exe fleet.exe studio64.exe"',
            {
              reject: false,
            },
          )
        ).stdout ?? ""
      ).toLowerCase();
      for (let [ide, config] of Object.entries(SUPPORTED_IDE_CONFIGS_2))
        for (let keyword of config.processKeywordsWindows)
          if (normalizedStdout.includes(keyword.toLowerCase())) {
            runningIDEs.push(ide);
            break;
          }
    } else if (platform === "linux") {
      let normalizedStdout = (
        (
          await safeExecShell(
            'ps aux | grep -E "code|cursor|windsurf|devin-desktop|idea|pycharm|webstorm|phpstorm|rubymine|clion|goland|rider|datagrip|dataspell|aqua|gateway|fleet|android-studio" | grep -v grep',
            {
              reject: false,
            },
          )
        ).stdout ?? ""
      ).toLowerCase();
      for (let [ide, config] of Object.entries(SUPPORTED_IDE_CONFIGS_2))
        for (let keyword of config.processKeywordsLinux)
          if (normalizedStdout.includes(keyword)) {
            if (ide !== "vscode") {
              runningIDEs.push(ide);
              break;
            } else if (!normalizedStdout.includes("cursor") && !normalizedStdout.includes("appcode")) {
              runningIDEs.push(ide);
              break;
            }
          }
    }
  } catch (error) {
    logForDebugging(`IDE process detection failed: ${error}`, {
      level: "error",
    });
  }
  return runningIDEs;
}
//@ chunk-5xgkngpb.js:3331429-3331496 placement
async function refreshRunningIDEs() {
  let result = await detectRunningIDEsImpl();
  currentIdeDetectionState().runningIDEs = result;
  return result;
}
//@ chunk-5xgkngpb.js:3331496-3331574 placement
async function getRunningIDEsCached() {
  let runningIDEs = currentIdeDetectionState().runningIDEs;
  if (runningIDEs === null) return refreshRunningIDEs();
  return runningIDEs;
}
//@ chunk-5xgkngpb.js:3331574-3331660 placement (2.1.88 match: hasAccessToIDEExtensionDiffFeature, 1)
function hasAccessToIDEExtensionDiffFeature_2(mcpClients) {
  let ideClient = mcpClients.find((client) => client.type === "connected" && client.name === "ide");
  return getIdeClientName(ideClient);
}
//@ chunk-5xgkngpb.js:3331977-3332097 fingerprint (2.1.88 match: getIdeClientName, 1)
function getIdeClientName(ideClient) {
  let config = ideClient?.config;
  return config?.type === "sse-ide" || config?.type === "ws-ide"
    ? renameWindsurfToDevin(config.ideName)
    : isSupportedTerminal()
      ? toIDEDisplayName(envDynamicProbe.terminal)
      : null;
}
//@ chunk-5xgkngpb.js:3332097-3332197 layout
async function callIdeRpc(request, options, ideClient) {
  return require("../services/mcp/emitTripwireEvent.lazy.js")
    .mcpClientModule()
    .callIdeRpc(request, options, ideClient);
}
//@ chunk-5xgkngpb.js:3332197-3332269 fingerprint (2.1.88 match: closeOpenDiffs, 1)
/**
 * 通知 IDE 关闭由 Claude 打开的 diff 视图。
 */
async function closeOpenDiffs(ideClient) {
  try {
    await callIdeRpc("closeAllDiffTabs", {}, ideClient);
  } catch (error) {}
}
//@ chunk-5xgkngpb.js:3332269-3332341 layout
var VSCODE_EXTENSION_DOCS_URL = "https://code.claude.com/docs/en/vs-code#install-the-extension";
//@ chunk-5xgkngpb.js:3332341-3332546 layout
/**
 * 自动安装 IDE 扩展被跳过的原因：CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL 或全局配置 autoInstallIdeExtension=false。
 */
function getIdeAutoInstallSkipReason() {
  if (env.CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL) return "CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL is set";
  if (!(getGlobalConfig().autoInstallIdeExtension ?? true))
    return "the autoInstallIdeExtension setting is off";
  return null;
}
//@ chunk-5xgkngpb.js:3332546-3332961 fingerprint (2.1.88 match: initializeIdeIntegration, 0.744)
/**
 * 启动时初始化 IDE 集成：检测运行中的 IDE、按 autoConnectIde 自动连接、必要时安装扩展。
 */
async function initializeIdeIntegration(
  onIdeDetected,
  ideToInstallExtension,
  onShowIdeOnboarding,
  onInstallationComplete,
  signal,
  options,
) {
  findAvailableIDE().then(onIdeDetected);
  if (getIdeAutoInstallSkipReason() === null) {
    let ideType = ideToInstallExtension ?? getTerminalIdeType();
    if (ideType) {
      if (ideToInstallExtension && isVSCodeIde(ideType))
        return maybeInstallIDEExtension(ideType, options)
          .catch((error) => ({
            installed: false,
            error: error.message || "Installation failed",
            installedVersion: null,
            ideType,
          }))
          .then((status) => {
            onInstallationComplete(status);
            if (status?.installed && !signal?.aborted) findAvailableIDE().then(onIdeDetected);
            if (
              status?.installed === true &&
              !status.previouslyInstalled &&
              !hasIdeOnboardingDialogBeenShown()
            )
              onShowIdeOnboarding(status);
            return status;
          });
      else if (isJetBrainsIde(ideType))
        isIDEExtensionInstalled(ideType).then(async (installed) => {
          if (installed && !hasIdeOnboardingDialogBeenShown()) onShowIdeOnboarding(null);
        });
    }
  }
  return null;
}
//@ chunk-5xgkngpb.js:3332961-3333067 layout
function getHostIPForIdeCached(isIdeRunningInWindows, port) {
  let hostIPByTarget = currentIdeDetectionState().hostIPByTarget;
  let cacheKey = `${isIdeRunningInWindows}:${port}`;
  let hostIP = hostIPByTarget.get(cacheKey);
  if (!hostIP) {
    hostIP = detectHostIP(isIdeRunningInWindows, port);
    hostIPByTarget.set(cacheKey, hostIP);
  }
  return hostIP;
}
//@ chunk-5xgkngpb.js:3333067-3333428 fingerprint (2.1.88 match: detectHostIP, 0.952)
/**
 * WSL 中连接 Windows 侧 IDE 时探测宿主 IP（默认网关等）。
 */
async function detectHostIP(isIdeRunningInWindows, port) {
  if (env.CLAUDE_CODE_IDE_HOST_OVERRIDE) return env.CLAUDE_CODE_IDE_HOST_OVERRIDE;
  if (getPlatform() !== "wsl" || !isIdeRunningInWindows) return "127.0.0.1";
  try {
    let routeResult = await safeExecShell("ip route show | grep -i default", {
      reject: false,
    });
    if (routeResult.exitCode === 0 && routeResult.stdout) {
      let gatewayMatch = routeResult.stdout.match(/default via (\d+\.\d+\.\d+\.\d+)/);
      if (gatewayMatch) {
        let gatewayIP = gatewayMatch[1];
        if (await checkIdeConnection(gatewayIP, port)) return gatewayIP;
      }
    }
  } catch (error) {}
  return "127.0.0.1";
}
export {
  toIDEDisplayName,
  maybeNotifyIDEConnected,
  hasAccessToIDEExtensionDiffFeature_2,
  isJetBrainsIde,
  VSCODE_EXTENSION_DOCS_URL,
  getIdeClientName,
  isVSCodeTerminal,
  isVSCodeInstalled,
  isCursorInstalled,
  isWindsurfInstalled,
  isSupportedTerminal,
  getSortedIdeLockfiles,
  getRunningIDEsCached,
  getIdeLockfilesPaths,
  isJetBrainsTerminal,
  getIdeAutoInstallSkipReason,
  getVSCodeIDECommand,
  detectIDEs,
  refreshRunningIDEs,
  getTerminalIdeType,
  findAvailableIDE,
  abortIdeSearch,
  uppercaseDriveLetter,
  closeOpenDiffs,
  initializeIdeIntegration,
  callIdeRpc,
  hasAccessToIDEExtensionDiffFeature,
};
