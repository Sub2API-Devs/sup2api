/**
 * utils/ide.ts
 *
 * IDE 检测与连接：~/.claude/ide/<port>.lock 读取与清理、运行中 IDE 进程检测、VS Code/JetBrains 判断、扩展自动安装、WSL 宿主 IP
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ide.ts
 * pieces: chunk-e6aww6q8.js (52), chunk-fq0cr76a.js (1), chunk-s61vbvea.js (2)
 * attribution: placement 8, affinity 2, callgraph-witnessed 3, fingerprint 31, file-local 1, layout 10
 */
import {
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
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import { createConnection } from "net";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
} from "fs/promises";
import * as osModule from "os";
import * as osModule_2 from "os";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsScrollDraining, getOriginalCwd } from "../bootstrap/state.js";
import { isJetBrainsPluginInstalled } from "./jetbrains.js";
import { getAncestorPidsAsync } from "./processIdentity.js";
import { envDynamicProbe } from "./envDynamic.js";
import { getNativeCSIuTerminalDisplayName_2 } from "../commands/terminalSetup/terminalSetup.js";
import { env } from "./env.js";
import { getFsImplementation } from "./fsOperations.js";
import { isFsInaccessible, errorMessage, sanitizedErrCodeForTelemetry } from "./errors.js";
import { logError } from "./log.js";
import { jsonParse } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { getPlatform } from "./platform.js";
import { windowsToWslPath, WindowsToWSLConverter } from "./idePathConversion.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { sanitizeVersion } from "../services/analytics/metadata.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { createAbortController } from "./abortController.js";
import { sleep } from "./sleep.js";
import { isPathWithinCaseAware } from "./pathPrefix.js";
import { isSameWslDistro } from "./_new/isSameWslDistro.js";
import { lt_2 } from "./semver.js";
import { bV, firstLineOf } from "./stringUtils.js";
import { VSCODE_FAMILY } from "./editor.js";
import { safeExecShell } from "./safeSpawn.js";
import { hasIdeOnboardingDialogBeenShown } from "../components/IdeOnboardingDialog.js";
import { qyn } from "../../vendor/lodash-es/upperFirst.js";
import { getClaudeConfigDir } from "./envUtils.js";

//@ chunk-e6aww6q8.js:3233198-3233236 placement
var tx = Symbol("ide-not-yet-computed");
/**
 * IDE 检测的进程状态（终端判断缓存、宿主 IP、运行中 IDE、JetBrains 插件安装状态）。
 */
//@ chunk-e6aww6q8.js:3233236-3233792 placement
class IdeDetectionState {
  supportedVSCodeTerminal = tx;
  supportedJetBrainsTerminal = tx;
  supportedTerminal = tx;
  windowsUserProfile = void 0;
  vscodeCommandByParentProcess = void 0;
  hostIPByTarget = new Map();
  runningIDEs = null;
  currentSearch = null;
  jetbrainsPluginInstalled = new Map();
  clear() {
    ((this.supportedVSCodeTerminal = tx),
      (this.supportedJetBrainsTerminal = tx),
      (this.supportedTerminal = tx),
      (this.windowsUserProfile = void 0),
      (this.vscodeCommandByParentProcess = void 0),
      this.hostIPByTarget.clear(),
      this.jetbrainsPluginInstalled.clear(),
      (this.runningIDEs = null),
      this.currentSearch?.abort(),
      (this.currentSearch = null));
  }
}
//@ chunk-e6aww6q8.js:3233792-3233819 placement
var nAr = new HostScoped(() => new IdeDetectionState());
//@ chunk-e6aww6q8.js:3233819-3233857 placement
function hT() {
  return nAr.of(getRootSession().host);
}
/**
 * 缓存 JetBrains 插件是否已安装（可强制刷新）。
 */
//@ chunk-e6aww6q8.js:3235515-3235657 affinity
async function isJetBrainsPluginInstalledCached(e, n = !1) {
  let jetbrainsPluginInstalled = hT().jetbrainsPluginInstalled;
  if (n) jetbrainsPluginInstalled.delete(e);
  let s = jetbrainsPluginInstalled.get(e);
  if (s) return s;
  let h = isJetBrainsPluginInstalled(e);
  return (jetbrainsPluginInstalled.set(e, h), h);
}
//@ chunk-e6aww6q8.js:3235657-3235721 callgraph-witnessed = isProcessRunning (1)
function isProcessRunning(pid) {
  try {
    return (process.kill(pid, 0), !0);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:3235721-3235819 fingerprint = makeAncestorPidLookup (1)
function makeAncestorPidLookup() {
  let promise = null;
  return () => {
    if (!promise) promise = getAncestorPidsAsync(process.ppid, 10).then((pids) => new Set(pids));
    return promise;
  };
}
//@ chunk-e6aww6q8.js:3235819-3235894 fingerprint = isVSCodeIde (1)
function isVSCodeIde(ide) {
  if (!ide) return !1;
  let config = SUPPORTED_IDE_CONFIGS[ide];
  return config && config.ideKind === "vscode";
}
//@ chunk-e6aww6q8.js:3235894-3235972 fingerprint = isJetBrainsIde (1)
function isJetBrainsIde(ide) {
  if (!ide) return !1;
  let config = SUPPORTED_IDE_CONFIGS[ide];
  return config && config.ideKind === "jetbrains";
}
/**
 * 当前终端是否为 JetBrains IDE 终端（缓存）。
 */
//@ chunk-e6aww6q8.js:3236107-3236252 placement
function isJetBrainsTerminal() {
  let e = hT();
  if (e.supportedJetBrainsTerminal === tx)
    e.supportedJetBrainsTerminal = isJetBrainsIde(envDynamicProbe.terminal);
  return e.supportedJetBrainsTerminal;
}
/**
 * 当前终端是否为受支持的 IDE 集成终端（VS Code 系或 JetBrains）。
 */
//@ chunk-e6aww6q8.js:3236252-3236407 fingerprint = isSupportedTerminal (0.667)
function isSupportedTerminal() {
  let e = hT();
  if (e.supportedTerminal === tx)
    e.supportedTerminal =
      getNativeCSIuTerminalDisplayName_2() ||
      isJetBrainsTerminal() ||
      Boolean(process.env.FORCE_CODE_TERMINAL);
  return e.supportedTerminal;
}
//@ chunk-e6aww6q8.js:3236407-3236461 callgraph-witnessed = getTerminalIdeType (1)
function getTerminalIdeType() {
  if (!isSupportedTerminal()) return null;
  return env.terminal;
}
/**
 * 收集所有 IDE lockfile 目录下的 <port>.lock 文件并按 mtime 从新到旧排序。
 */
//@ chunk-e6aww6q8.js:3236660-3237118 fingerprint = getSortedIdeLockfiles (1)
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
                  let fullPath = join_86(ideLockFilePath, file.name);
                  try {
                    let fileStat = await getFsImplementation().stat(fullPath);
                    return { path: fullPath, mtime: fileStat.mtime };
                  } catch {
                    return null;
                  }
                }),
              )
            ).filter((S) => S !== null);
          } catch (error) {
            if (!isFsInaccessible(error)) logError(error);
            return [];
          }
        }),
      )
    )
      .flat()
      .sort((r, s) => s.mtime.getTime() - r.mtime.getTime())
      .map((file) => file.path);
  } catch (error) {
    return (logError(error), []);
  }
}
/**
 * 解析 IDE lockfile：JSON（workspaceFolders、pid、ideName、transport=ws、runningInWindows、authToken）或旧格式逐行工作区；端口取自文件名。
 */
//@ chunk-e6aww6q8.js:3237118-3237658 fingerprint = readIdeLockfile (0.912)
async function readIdeLockfile(path) {
  try {
    let content = await getFsImplementation().readFile(path, { encoding: "utf-8" }),
      workspaceFolders = [],
      s,
      h,
      y = !1,
      S = !1,
      w;
    try {
      let parsedContent = jsonParse(content);
      if (parsedContent.workspaceFolders) workspaceFolders = parsedContent.workspaceFolders;
      ((s = parsedContent.pid),
        (h = parsedContent.ideName),
        (y = parsedContent.transport === "ws"),
        (S = parsedContent.runningInWindows === !0),
        (w = parsedContent.authToken));
    } catch (error) {
      workspaceFolders = content
        .split(
          `
`,
        )
        .map((line) => line.trim());
    }
    let filename = path.split(sep_50).pop();
    if (!filename) return null;
    let port = filename.replace(".lock", "");
    return {
      workspaceFolders: workspaceFolders,
      port: parseInt(port),
      pid: s,
      ideName: h,
      useWebSocket: y,
      runningInWindows: S,
      authToken: w,
    };
  } catch (error) {
    return (
      logForDebugging(`Failed to read IDE lockfile ${path}: ${errorMessage(error)}`, { level: "error" }),
      null
    );
  }
}
/**
 * 尝试连接 IDE 的 MCP 端点确认可用。
 */
//@ chunk-e6aww6q8.js:3237658-3237881 fingerprint = checkIdeConnection (1)
async function checkIdeConnection(host, port, timeout = 500) {
  try {
    return new Promise((resolve) => {
      let socket = createConnection({ host: host, port: port, timeout: timeout });
      (socket.on("connect", () => {
        (socket.destroy(), resolve(!0));
      }),
        socket.on("error", () => {
          resolve(!1);
        }),
        socket.on("timeout", () => {
          (socket.destroy(), resolve(!1));
        }));
    });
  } catch (error) {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:3237881-3238143 fingerprint = getWindowsUserProfile (0.959)
async function getWindowsUserProfile() {
  let { stdout: stdout, code: code } = await execFileNoThrow("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "$env:USERPROFILE",
  ]);
  if (code === 0 && stdout.trim()) return stdout.trim();
  logForDebugging("Unable to get Windows USERPROFILE via PowerShell - IDE detection may be incomplete");
  return;
}
//@ chunk-e6aww6q8.js:3238143-3238454 file-local
async function getConnectedIdeName() {
  let e = getIdeLockfilesPaths();
  if (getPlatform() === "wsl" && !env.USERPROFILE) {
    let s = hT();
    s.windowsUserProfile ??= getWindowsUserProfile();
    let windowsUserProfile = await s.windowsUserProfile,
      y = windowsUserProfile ? windowsToWslPath(windowsUserProfile) : null;
    if (y) e.push(resolve_34(y, ".claude", "ide"));
  }
  let n = new Set(),
    r = [];
  for (let s of e) {
    let h = await realpath_27(s).catch(() => resolve_34(s));
    if (n.has(h)) continue;
    (n.add(h), r.push(s));
  }
  return r;
}
/**
 * 删除持有进程已退出或端口不可连的 IDE lockfile。
 */
//@ chunk-e6aww6q8.js:3238454-3238945 fingerprint = cleanupStaleIdeLockfiles (0.664)
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
      let host = await getHostIPForIdeCached(lockfileInfo.runningInWindows, lockfileInfo.port),
        h = !1;
      if (lockfileInfo.pid) {
        if (!isProcessRunning(lockfileInfo.pid)) {
          if (getPlatform() !== "wsl") h = !0;
          else if (!(await checkIdeConnection(host, lockfileInfo.port))) h = !0;
        }
      } else if (!(await checkIdeConnection(host, lockfileInfo.port))) h = !0;
      if (h)
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
/**
 * 在 VS Code 系终端中自动安装 Claude Code 扩展（受 CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL 与 autoInstallIdeExtension 控制）。
 */
//@ chunk-e6aww6q8.js:3238945-3239575 fingerprint = maybeInstallIDEExtension (0.632)
async function maybeInstallIDEExtension(e, n) {
  try {
    let { installedVersion: installedVersion, previouslyInstalled: previouslyInstalled } =
      await installIDEExtension(e);
    if (
      (logEvent("tengu_ext_installed", {
        ide_type: fromEnum(e),
        installed_version: installedVersion == null ? void 0 : sanitizeVersion(installedVersion),
      }),
      logFeatureOk("ide_extension_install"),
      !getGlobalConfig().diffTool)
    )
      await saveGlobalConfig((current) => ({ ...current, diffTool: "auto" }), n);
    return {
      installed: !0,
      error: null,
      installedVersion: installedVersion,
      ideType: e,
      previouslyInstalled: previouslyInstalled,
    };
  } catch (error) {
    (logEvent("tengu_ext_install_error", {
      ide_type: fromEnum(e),
      error_code: sanitizedErrCodeForTelemetry(error),
    }),
      logFeatureBad("ide_extension_install", "ide_extension_install_failed"));
    let errorMessage = error instanceof Error ? error.message : String(error);
    return (
      logForDebugging(`IDE extension install failed: ${errorMessage}`, { level: "error" }),
      { installed: !1, error: errorMessage, installedVersion: null, ideType: e }
    );
  }
}
/**
 * 轮询（最多 30 秒、每秒一次）查找工作区包含 cwd 的唯一 IDE，先清理陈旧 lockfile；打 ide_detect。
 */
//@ chunk-e6aww6q8.js:3239575-3240015 callgraph-witnessed = findAvailableIDE (0)
async function findAvailableIDE() {
  let e = hT();
  if (e.currentSearch) e.currentSearch.abort();
  e.currentSearch = createAbortController();
  let signal = e.currentSearch.signal;
  await cleanupStaleIdeLockfiles();
  let startTime = Date.now();
  while (Date.now() - startTime < 30000 && !signal.aborted) {
    if (getIsScrollDraining()) {
      await sleep(1000, signal);
      continue;
    }
    let ides = await detectIDEs(!1);
    if (signal.aborted) return null;
    let filtered = ides.filter((y) => y.workspaceContainsCwd);
    if (filtered.length === 1) return (logFeatureOk("ide_detect", { found: !0 }), filtered[0]);
    await sleep(1000, signal);
  }
  if (!signal.aborted) logFeatureOk("ide_detect", { found: !1 });
  return null;
}
//@ chunk-e6aww6q8.js:3240015-3240105 layout
function abortIdeSearch() {
  let e = hT();
  if (e.currentSearch) (e.currentSearch.abort(), (e.currentSearch = null));
}
//@ chunk-e6aww6q8.js:3240105-3240209 layout
function classifyWorkspaceRelation(e, n) {
  if (isPathWithinCaseAware(e, n, !1)) return "contains-cwd";
  if (isPathWithinCaseAware(n, e, !1)) return "inside-cwd";
  return "unrelated";
}
//@ chunk-e6aww6q8.js:3240209-3240277 layout
function uppercaseDriveLetter(e) {
  return e.replace(/^[a-zA-Z]:/, (n) => n.toUpperCase());
}
/**
 * 读取全部 lockfile，过滤进程仍存活、工作区与 cwd 相关的 IDE，返回连接信息（url、名称、authToken、是否包含 cwd）。
 */
//@ chunk-e6aww6q8.js:3240277-3241680 fingerprint = detectIDEs (0.801)
async function detectIDEs(includeInvalid) {
  let detectedIDEs = [];
  try {
    let r = env.CLAUDE_CODE_SSE_PORT ?? null,
      s = uppercaseDriveLetter(getOriginalCwd().normalize("NFC")),
      lockfiles = await getSortedIdeLockfiles(),
      lockfileInfos = await Promise.all(lockfiles.map(readIdeLockfile)),
      getAncestors = makeAncestorPidLookup(),
      w = getPlatform() !== "wsl" && isSupportedTerminal();
    for (let lockfileInfo of lockfileInfos) {
      if (!lockfileInfo) continue;
      let G = "unrelated";
      if (env.CLAUDE_CODE_IDE_SKIP_VALID_CHECK) G = "contains-cwd";
      else if (lockfileInfo.port === r) G = "contains-cwd";
      else
        for (let workspaceFolder of lockfileInfo.workspaceFolders) {
          if (!workspaceFolder) continue;
          let localPath = workspaceFolder;
          if (getPlatform() === "wsl" && lockfileInfo.runningInWindows && env.WSL_DISTRO_NAME) {
            if (!isSameWslDistro(workspaceFolder, env.WSL_DISTRO_NAME)) continue;
            let resolvedOriginal = resolve_34(localPath).normalize("NFC");
            if (classifyWorkspaceRelation(s, resolvedOriginal) === "contains-cwd") {
              G = "contains-cwd";
              break;
            }
            localPath = await new WindowsToWSLConverter(env.WSL_DISTRO_NAME).toLocalPath(workspaceFolder);
          }
          let Ae = uppercaseDriveLetter(resolve_34(localPath).normalize("NFC")),
            Ie = classifyWorkspaceRelation(s, Ae);
          if (Ie === "contains-cwd") {
            G = Ie;
            break;
          }
          if (Ie === "inside-cwd" && isAbsolute_43(localPath)) G = Ie;
        }
      let q = G !== "unrelated";
      if (!q && !includeInvalid) continue;
      if (w) {
        if (!(r !== null && lockfileInfo.port === r)) {
          if (!lockfileInfo.pid || !isProcessRunning(lockfileInfo.pid)) continue;
          if (process.ppid !== lockfileInfo.pid) {
            if (!(await getAncestors()).has(lockfileInfo.pid)) continue;
          }
        }
      }
      let Z = lockfileInfo.ideName
          ? renameWindsurfToDevin(lockfileInfo.ideName)
          : isSupportedTerminal()
            ? toIDEDisplayName(envDynamicProbe.terminal)
            : "IDE",
        host = await getHostIPForIdeCached(lockfileInfo.runningInWindows, lockfileInfo.port),
        url;
      if (lockfileInfo.useWebSocket) url = `ws://${host}:${lockfileInfo.port}`;
      else url = `http://${host}:${lockfileInfo.port}/sse`;
      detectedIDEs.push({
        url: url,
        name: Z,
        workspaceFolders: lockfileInfo.workspaceFolders,
        port: lockfileInfo.port,
        isValid: q,
        workspaceContainsCwd: G === "contains-cwd",
        authToken: lockfileInfo.authToken,
        ideRunningInWindows: lockfileInfo.runningInWindows,
      });
    }
    if (!includeInvalid && r) {
      let envPortMatch = detectedIDEs.filter((ide) => ide.isValid && ide.port === r);
      if (envPortMatch.length === 1) return envPortMatch;
    }
  } catch (error) {
    (logError(error), logFeatureSad("ide_detect", "ide_detect_failed"));
  }
  return detectedIDEs;
}
//@ chunk-e6aww6q8.js:3241680-3241774 fingerprint = maybeNotifyIDEConnected (1)
async function maybeNotifyIDEConnected(client) {
  await client.notification({ method: "ide_connected", params: { pid: process.pid } });
}
//@ chunk-e6aww6q8.js:3241774-3241847 fingerprint = hasAccessToIDEExtensionDiffFeature (1)
function hasAccessToIDEExtensionDiffFeature(mcpClients) {
  return mcpClients.some((client) => client.type === "connected" && client.name === "ide");
}
//@ chunk-e6aww6q8.js:3241847-3241879 fingerprint = EXTENSION_ID (0.602)
var EXTENSION_ID = "anthropic.claude-code";
//@ chunk-e6aww6q8.js:3241879-3242074 fingerprint = isIDEExtensionInstalled (1)
async function isIDEExtensionInstalled(ideType) {
  if (isVSCodeIde(ideType)) {
    let command = await getVSCodeIDECommand(ideType);
    if (command)
      try {
        if (
          (
            await execFileNoThrowWithCwd(command, ["--list-extensions"], { env: getInstallationEnv() })
          ).stdout?.includes(EXTENSION_ID)
        )
          return !0;
      } catch {}
  } else if (isJetBrainsIde(ideType)) return await isJetBrainsPluginInstalledCached(ideType);
  return !1;
}
/**
 * 调用 IDE 命令行（code/cursor/windsurf --install-extension）安装扩展。
 */
//@ chunk-e6aww6q8.js:3242074-3242469 fingerprint = installIDEExtension (0.63)
async function installIDEExtension(ideType) {
  if (isVSCodeIde(ideType)) {
    let command = await getVSCodeIDECommand(ideType);
    if (command) {
      let version = await getInstalledVSCodeExtensionVersion(command),
        s = version !== null;
      if (!version || lt_2(version, getBuildInfo())) {
        await sleep(500);
        let result = await execFileNoThrowWithCwd(
          command,
          ["--force", "--install-extension", "anthropic.claude-code"],
          { env: getInstallationEnv() },
        );
        if (result.code !== 0)
          throw Object.assign(Error(formatIdeCommandError(command, result)), { code: `EXIT_${result.code}` });
        version = getBuildInfo();
      }
      return { installedVersion: version, previouslyInstalled: s };
    }
  }
  return { installedVersion: null, previouslyInstalled: !1 };
}
//@ chunk-e6aww6q8.js:3242469-3242735 layout
function formatIdeCommandError(e, n) {
  let r = basename_48(e),
    s =
      n.error && n.error !== String(n.code)
        ? n.error
        : n.exitCode === void 0
          ? `The ${r} command could not be run or did not finish`
          : `The ${r} command exited with status ${n.exitCode}`,
    trimmed = bV(n.stderr, bAr).trim();
  return trimmed && !s.includes(trimmed)
    ? `${s}
${trimmed}`
    : s;
}
//@ chunk-e6aww6q8.js:3242735-3242747 layout
var bAr = 500;
//@ chunk-e6aww6q8.js:3242747-3242839 fingerprint = getInstallationEnv (0.809)
function getInstallationEnv() {
  if (getPlatform() === "linux") return { ...process.env, DISPLAY: "", WAYLAND_DISPLAY: "" };
  return;
}
//@ chunk-e6aww6q8.js:3242839-3243347 layout
function getBuildInfo() {
  return {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION;
}
//@ chunk-e6aww6q8.js:3243347-3243540 fingerprint = getInstalledVSCodeExtensionVersion (0.805)
async function getInstalledVSCodeExtensionVersion(command) {
  let { stdout: stdout } = await execFileNoThrow(command, ["--list-extensions", "--show-versions"], {
      env: getInstallationEnv(),
    }),
    lines =
      stdout?.split(`
`) || [];
  for (let line of lines) {
    let [h, y] = line.split("@");
    if (h === EXTENSION_ID && y) return y;
  }
  return null;
}
//@ chunk-e6aww6q8.js:3243540-3244216 fingerprint = getVSCodeIDECommandByParentProcess (0.802)
async function getVSCodeIDECommandByParentProcess() {
  try {
    if (getPlatform() !== "macos") return null;
    let pid = process.ppid;
    for (let r = 0; r < 10; r++) {
      if (!pid || pid === 0 || pid === 1) break;
      let trimmed = (await execFileNoThrow("ps", ["-o", "command=", "-p", String(pid)])).stdout.trim();
      if (trimmed) {
        let y = {
            "Visual Studio Code.app": "code",
            "Cursor.app": "cursor",
            "Windsurf.app": "windsurf",
            "Devin.app": "devin",
            "Visual Studio Code - Insiders.app": "code",
            "VSCodium.app": "codium",
          },
          S = "/Contents/MacOS/";
        for (let [w, L] of Object.entries(y)) {
          let appIndex = trimmed.indexOf(w + "/Contents/MacOS/");
          if (appIndex !== -1) {
            let folderPathEnd = appIndex + w.length;
            return trimmed.substring(0, folderPathEnd) + "/Contents/Resources/app/bin/" + L;
          }
        }
      }
      let trimmed_2 = (await execFileNoThrow("ps", ["-o", "ppid=", "-p", String(pid)])).stdout.trim();
      if (!trimmed_2) break;
      pid = parseInt(trimmed_2);
    }
    return null;
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:3244625-3244688 affinity
function renameWindsurfToDevin(e) {
  return e.replace(/windsurf/gi, "Devin Desktop");
}
//@ chunk-e6aww6q8.js:3244688-3245024 fingerprint = getVSCodeIDECommand (0.564)
async function getVSCodeIDECommand(e, n) {
  let r = VSCODE_FAMILY[e];
  if (!r) return null;
  if (e === "vscode" && n) r = n.toLowerCase().includes("vscodium") ? ["codium"] : ["code"];
  let parentExecutable = hT();
  parentExecutable.vscodeCommandByParentProcess ??= getVSCodeIDECommandByParentProcess();
  let vscodeCommandByParentProcess = await parentExecutable.vscodeCommandByParentProcess;
  if (vscodeCommandByParentProcess && r.includes(basename_48(vscodeCommandByParentProcess)))
    try {
      return (await getFsImplementation().stat(vscodeCommandByParentProcess), vscodeCommandByParentProcess);
    } catch {}
  let ext = getPlatform() === "windows" ? ".cmd" : "";
  return r[0] + ext;
}
//@ chunk-e6aww6q8.js:3245024-3245095 fingerprint = isCursorInstalled (1)
async function isCursorInstalled() {
  return (await execFileNoThrow("cursor", ["--version"])).code === 0;
}
//@ chunk-e6aww6q8.js:3245095-3245231 fingerprint = isWindsurfInstalled (0.764)
async function isWindsurfInstalled() {
  if ((await execFileNoThrow("windsurf", ["--version"])).code === 0) return !0;
  return (await execFileNoThrow("devin-desktop", ["--version"])).code === 0;
}
//@ chunk-e6aww6q8.js:3245231-3245355 fingerprint = isVSCodeInstalled (1)
async function isVSCodeInstalled() {
  let result = await execFileNoThrow("code", ["--help"]);
  return result.code === 0 && Boolean(result.stdout?.includes("Visual Studio Code"));
}
//@ chunk-e6aww6q8.js:3245355-3246809 fingerprint = detectRunningIDEsImpl (0.702)
async function detectRunningIDEsImpl() {
  let runningIDEs = [];
  try {
    let platform = getPlatform();
    if (platform === "macos") {
      let s =
        (
          await safeExecShell(
            'ps aux | grep -E "Visual Studio Code|Code Helper|Cursor Helper|Windsurf Helper|Devin Helper|Devin.app|IntelliJ IDEA|PyCharm|WebStorm|PhpStorm|RubyMine|CLion|GoLand|Rider|DataGrip|AppCode|DataSpell|Aqua|Gateway|Fleet|Android Studio" | grep -v grep',
            { reject: !1 },
          )
        ).stdout ?? "";
      for (let [h, y] of Object.entries(SUPPORTED_IDE_CONFIGS))
        for (let keyword of y.processKeywordsMac)
          if (s.includes(keyword)) {
            runningIDEs.push(h);
            break;
          }
    } else if (platform === "windows") {
      let normalizedStdout = (
        (
          await safeExecShell(
            'tasklist | findstr /I "Code.exe Cursor.exe Windsurf.exe Devin.exe idea64.exe pycharm64.exe webstorm64.exe phpstorm64.exe rubymine64.exe clion64.exe goland64.exe rider64.exe datagrip64.exe appcode.exe dataspell64.exe aqua64.exe gateway64.exe fleet.exe studio64.exe"',
            { reject: !1 },
          )
        ).stdout ?? ""
      ).toLowerCase();
      for (let [y, S] of Object.entries(SUPPORTED_IDE_CONFIGS))
        for (let keyword of S.processKeywordsWindows)
          if (normalizedStdout.includes(keyword.toLowerCase())) {
            runningIDEs.push(y);
            break;
          }
    } else if (platform === "linux") {
      let normalizedStdout = (
        (
          await safeExecShell(
            'ps aux | grep -E "code|cursor|windsurf|devin-desktop|idea|pycharm|webstorm|phpstorm|rubymine|clion|goland|rider|datagrip|dataspell|aqua|gateway|fleet|android-studio" | grep -v grep',
            { reject: !1 },
          )
        ).stdout ?? ""
      ).toLowerCase();
      for (let [y, S] of Object.entries(SUPPORTED_IDE_CONFIGS))
        for (let keyword of S.processKeywordsLinux)
          if (normalizedStdout.includes(keyword)) {
            if (y !== "vscode") {
              runningIDEs.push(y);
              break;
            } else if (!normalizedStdout.includes("cursor") && !normalizedStdout.includes("appcode")) {
              runningIDEs.push(y);
              break;
            }
          }
    }
  } catch (error) {
    logForDebugging(`IDE process detection failed: ${error}`, { level: "error" });
  }
  return runningIDEs;
}
//@ chunk-e6aww6q8.js:3246809-3246876 placement
async function refreshRunningIDEs() {
  let e = await detectRunningIDEsImpl();
  return ((hT().runningIDEs = e), e);
}
//@ chunk-e6aww6q8.js:3246876-3246954 placement
async function getRunningIDEsCached() {
  let runningIDEs = hT().runningIDEs;
  if (runningIDEs === null) return refreshRunningIDEs();
  return runningIDEs;
}
//@ chunk-e6aww6q8.js:3246954-3247040 placement = hasAccessToIDEExtensionDiffFeature (1)
function hasAccessToIDEExtensionDiffFeature_2(mcpClients) {
  let found = mcpClients.find((client) => client.type === "connected" && client.name === "ide");
  return getIdeClientName(found);
}
//@ chunk-e6aww6q8.js:3247357-3247477 fingerprint = getIdeClientName (1)
function getIdeClientName(ideClient) {
  let config = ideClient?.config;
  return config?.type === "sse-ide" || config?.type === "ws-ide"
    ? renameWindsurfToDevin(config.ideName)
    : isSupportedTerminal()
      ? toIDEDisplayName(envDynamicProbe.terminal)
      : null;
}
//@ chunk-e6aww6q8.js:3247477-3247577 layout
async function callIdeRpc(e, n, r) {
  return require("./chunk-asne9cp8.js").mcpClientModule().callIdeRpc(e, n, r);
}
/**
 * 通知 IDE 关闭由 Claude 打开的 diff 视图。
 */
//@ chunk-e6aww6q8.js:3247577-3247649 fingerprint = closeOpenDiffs (1)
async function closeOpenDiffs(ideClient) {
  try {
    await callIdeRpc("closeAllDiffTabs", {}, ideClient);
  } catch (error) {}
}
//@ chunk-e6aww6q8.js:3247649-3247721 layout
var VSCODE_EXTENSION_DOCS_URL = "https://code.claude.com/docs/en/vs-code#install-the-extension";
/**
 * 自动安装 IDE 扩展被跳过的原因：CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL 或全局配置 autoInstallIdeExtension=false。
 */
//@ chunk-e6aww6q8.js:3247721-3247926 layout
function getIdeAutoInstallSkipReason() {
  if (env.CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL) return "CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL is set";
  if (!(getGlobalConfig().autoInstallIdeExtension ?? !0)) return "the autoInstallIdeExtension setting is off";
  return null;
}
/**
 * 启动时初始化 IDE 集成：检测运行中的 IDE、按 autoConnectIde 自动连接、必要时安装扩展。
 */
//@ chunk-e6aww6q8.js:3247926-3248338 fingerprint = initializeIdeIntegration (0.743)
async function initializeIdeIntegration(e, n, r, s, h, y) {
  if ((findAvailableIDE().then(e), getIdeAutoInstallSkipReason() === null)) {
    let S = n ?? getTerminalIdeType();
    if (S) {
      if (isVSCodeIde(S))
        return maybeInstallIDEExtension(S, y)
          .catch((isAlreadyInstalled) => ({
            installed: !1,
            error: isAlreadyInstalled.message || "Installation failed",
            installedVersion: null,
            ideType: S,
          }))
          .then((error) => {
            if ((s(error), error?.installed && !h?.aborted)) findAvailableIDE().then(e);
            if (error?.installed === !0 && !error.previouslyInstalled && !hasIdeOnboardingDialogBeenShown())
              r(error);
            return error;
          });
      else if (isJetBrainsIde(S))
        isIDEExtensionInstalled(S).then(async (status) => {
          if (status && !hasIdeOnboardingDialogBeenShown()) r(null);
        });
    }
  }
  return null;
}
//@ chunk-e6aww6q8.js:3248338-3248444 layout
function getHostIPForIdeCached(e, n) {
  let hostIPByTarget = hT().hostIPByTarget,
    s = `${e}:${n}`,
    h = hostIPByTarget.get(s);
  if (!h) ((h = detectHostIP(e, n)), hostIPByTarget.set(s, h));
  return h;
}
/**
 * WSL 中连接 Windows 侧 IDE 时探测宿主 IP（默认网关等）。
 */
//@ chunk-e6aww6q8.js:3248444-3248805 fingerprint = detectHostIP (0.952)
async function detectHostIP(isIdeRunningInWindows, port) {
  if (env.CLAUDE_CODE_IDE_HOST_OVERRIDE) return env.CLAUDE_CODE_IDE_HOST_OVERRIDE;
  if (getPlatform() !== "wsl" || !isIdeRunningInWindows) return "127.0.0.1";
  try {
    let routeResult = await safeExecShell("ip route show | grep -i default", { reject: !1 });
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
/**
 * 支持的 IDE 配置表：每种 IDE 的类型（vscode/jetbrains）、显示名及 macOS/Windows/Linux 进程关键字，用于进程检测。
 */
//@ chunk-s61vbvea.js:585389-588520 fingerprint = supportedIdeConfigs (0.878)
var SUPPORTED_IDE_CONFIGS = {
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
  },
  dE = {
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
/**
 * IDE 标识 → 显示名。
 */
//@ chunk-s61vbvea.js:588520-588744 fingerprint = toIDEDisplayName (1)
function toIDEDisplayName(terminal) {
  if (!terminal) return "IDE";
  let n = SUPPORTED_IDE_CONFIGS[terminal];
  if (n) return n.displayName;
  let r = dE[terminal.toLowerCase().trim()];
  if (r) return r;
  let s = firstLineOf(terminal, " "),
    commandName = s ? basename_6(s).toLowerCase() : null;
  if (commandName) {
    let y = dE[commandName];
    if (y) return y;
    return qyn(commandName);
  }
  return qyn(terminal);
}
/**
 * IDE lockfile 目录列表：<配置目录>/ide（设置了 CLAUDE_CONFIG_DIR 时再加 ~/.claude/ide）；WSL 下还加 %USERPROFILE%/.claude/ide 与 /mnt/c/Users/*\/.claude/ide。
 */
//@ chunk-fq0cr76a.js:852557-853227 fingerprint = getIdeLockfilesPaths (0.756)
function getIdeLockfilesPaths() {
  let e = getClaudeConfigDir(),
    paths = [join_11(e, "ide")];
  if (env.CLAUDE_CONFIG_DIR || e.trim() === "")
    paths.push(join_11(osModule_2.homedir(), ".claude", "ide").normalize("NFC"));
  if (getPlatform() === "wsl") {
    let r = env.USERPROFILE ? windowsToWslPath(env.USERPROFILE) : null;
    if (r) paths.push(join_11(r, ".claude", "ide"));
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
        paths.push(join_11("/mnt/c/Users", user.name, ".claude", "ide"));
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

export {
  toIDEDisplayName,
  isJetBrainsIde,
  VSCODE_EXTENSION_DOCS_URL,
  getIdeClientName,
  maybeNotifyIDEConnected,
  getTerminalIdeType,
  uppercaseDriveLetter,
  closeOpenDiffs,
  initializeIdeIntegration,
  abortIdeSearch,
  isVSCodeInstalled,
  isCursorInstalled,
  isWindsurfInstalled,
  isSupportedTerminal,
  getSortedIdeLockfiles,
  getRunningIDEsCached,
  isJetBrainsTerminal,
  getIdeAutoInstallSkipReason,
  getVSCodeIDECommand,
  detectIDEs,
  refreshRunningIDEs,
  hasAccessToIDEExtensionDiffFeature,
  hT,
  tx,
  isVSCodeIde,
  findAvailableIDE,
  hasAccessToIDEExtensionDiffFeature_2,
  getIdeLockfilesPaths,
  callIdeRpc,
};
