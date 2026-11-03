/**
 * utils/Shell.ts
 *
 * Shell 命令执行入口 exec：选择 bash/PowerShell 提供者、校验并恢复工作目录、按需套沙箱、spawn 子进程并跟踪 cwd 变化；另含可用 shell 探测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/Shell.ts
 * pieces: chunk-e6aww6q8.js (43), chunk-s61vbvea.js (6)
 * attribution: placement 45, fingerprint 4
 */
import {
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
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  delimiter,
  delimiter as delimiter_2,
  delimiter as delimiter_3,
  delimiter as delimiter_4,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
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
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
} from "fs/promises";
import { spawn, spawn as spawn_2, spawn as spawn_3 } from "child_process";
import {
  closeSync,
  closeSync as closeSync_2,
  closeSync as closeSync_3,
  accessSync,
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
} from "fs";
import { xbn, vTr, ETr, RTr } from "./claudeCodeHints.js";
import { HostScoped } from "./hostScoped.js";
import { FigSpecRegistry } from "./bash/registry.js";
import {
  getFsImplementation,
  findIntermediateUncJunction,
  realpathExaminedSync,
  processChdir,
} from "./fsOperations.js";
import { getPlatform, getPlatform as getPlatform_2 } from "./platform.js";
import { cl, gb, isForeignNetworkPath, Mn } from "./pathClassification.js";
import { logForDebugging } from "./debug.js";
import { ai, isNetDir, isForeignMountPath } from "./networkPaths.js";
import {
  createBashShellProvider,
  resolveWindowsSandboxInnerShell,
  getExportedShellFunctionEnvVars,
  COMMAND_TEXT_REF_RE,
  COMMAND_TEXT_MISSING_MESSAGE,
  BUN_OPTIONS_CARRIER_VAR,
  COMMAND_TEXT_VAR,
} from "./shell/bashProvider.js";
import { getEnabledPluginBinPaths } from "./plugins/pluginLoader.js";
import { errorMessage, isE2BIG, isDiskFullErrno, getErrnoCode, isENOENT, isPathAbsent } from "./errors.js";
import { logError } from "./log.js";
import { CR, Tv } from "./disklessSession.js";
import { pre } from "./shell/shellPaths.js";
import { normalizeShellNameForAnalytics, env } from "./env.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { getCachedPowerShellPath } from "./shell/powershellDetection.js";
import { createPowerShellProvider, THt } from "./shell/powershellProvider.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  SandboxPolicyRefusalError,
  sandboxExportsChildTmpDir,
  SandboxManager,
  getEffectiveFilesystemPolicy,
  isScrubOnlySandboxMode,
  perCommandNetworkListsForRuntime,
  posixCovers,
  SandboxUnavailableForShellError,
  windowsArgvTooLongError,
  classifyWindowsSandboxLaunchExit,
  addSandboxAllowWriteDirectory,
  removeSandboxAllowWriteDirectory,
} from "./sandbox/sandbox-adapter.js";
import { childProcessTmpDir, socketSafeTmpdir, claudeTempDir, tmpdir, claudeTempDirName } from "./tempDir.js";
import {
  subprocessEnv,
  inheritedByChildren,
  isScrubEnabled,
  enforceScriptCaps,
  isScrubSandboxAvailable,
  scrubSandboxConfig,
} from "./subprocessEnv.js";
import { listSecretEnvNames, prefixedSanitizableEnv } from "./settings/policyHelper/helperEnv.js";
import {
  Twn,
  applyFsPolicyOverrides,
  warnPerCommandDenyUnenforced,
  materializeDenyDirectories,
  needsNetworkScreen,
} from "./sandbox/perCommandDeny.js";
import { fwr, PDn, M$, o_s, pwr, setCwdForCallChain, CMi, getCwd } from "./cwd.js";
import { xo, SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { logEvent } from "../services/analytics/index.js";
import { BNe, g_, BLOCKED_CWD_MESSAGES, isolationSubjectWords } from "./worktreeIsolation.js";
import { createFailedCommand, createAbortedCommand, wrapSpawn } from "./ShellCommand.js";
import { getOriginalCwd, getSessionId } from "../bootstrap/state.js";
import { z6n } from "./abortReasons.js";
import { hW, registerAgentProcess } from "./agentProcessRegistry.js";
import { parseForSecurity } from "./bash/ast.js";
import { ensureDeviceSandboxPosture } from "../remote/tools/deviceSandboxPosture.js";
import { iCe, prepareSandboxGitGlobalConfig } from "./sandbox/windowsGitIdentity.js";
import { getGitBashPathCached, checkPathExists } from "./windowsPaths.js";
import { Por, openSelfExeForSeccomp } from "./sandbox/linuxSandboxExec.js";
import { parseSessionEnvironment, invalidateSessionEnvCache } from "./sessionEnvironment.js";
import { sanitizeEnvCredentials } from "./settings/policyHelper/helperExec.js";
import { buildEnvArgv } from "./shell/shellEnvironment.js";
import { isSettingsSourcedEnvValue, isProjectScopeBlockedEnvVar } from "./managedEnvApply.js";
import { findReadableNugetPackagesDir } from "./sandbox/windowsNugetPackages.js";
import { generateTaskId } from "../Task.js";
import { TaskOutput } from "./task/TaskOutput.js";
import {
  resolveUsableWindowsLauncher,
  hZe,
  resolveShellPidFromLauncher,
} from "./shell/windowsShellLauncher.js";
import { openTaskOutputForAppend, releaseConvergentTaskOutputBinding } from "./task/diskOutput.js";
import { isTerminalShutdown, heldUntilExit } from "./terminalShutdown.js";
import { Nd, GMt, parkPendingPid } from "./toolCgroup.js";
import { openCpuWindow, KCt, closeCpuWindow } from "./shell/processCpuTime.js";
import { mn } from "./remoteEnvironment.js";
import {
  endToolExecutionSpan_2,
  truncateContentForTelemetry,
  isTracingRedacted,
  Cnr,
  setSpanError,
} from "./telemetry/sessionTracing.js";
import { getCompoundCommandPrefixesStatic_2 } from "./bash/prefix.js";
import { B8 } from "./path.js";
import { onCwdChanged } from "./hooks/fileChangedWatcher.js";
import { checkArgvLimits } from "./shell/argvLimits.js";
import { claudeSubprocessEnv } from "./claudeSubprocessEnv.js";
import { DISK_FULL_ADVICE } from "./shell/diskSpaceWarning.js";
import { PathSpace } from "./resultError.js";
import { bR } from "./shell/shellEnvSnapshot.js";
import { getPluginPathEnv } from "./bash/ShellSnapshot.js";
import { setBunOptions } from "./permissions/protectedSettingsPaths.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { whichAsync, w0, bunWhichOnPath } from "./which.js";

//@ chunk-e6aww6q8.js:3034093-3034288 placement
function buildShellSessionLabel(e, n) {
  if (!xbn()) return;
  let r = n?.replaceAll(":", "-"),
    filtered = [e !== void 0 && vTr.test(e) ? e : void 0, r !== void 0 && ETr.test(r) ? r : void 0].filter(
      (h) => h !== void 0,
    );
  return filtered.length > 0 ? filtered.join("-") : void 0;
}
//@ chunk-e6aww6q8.js:3034288-3034349 placement
function Obn(e) {
  if (!xbn()) return;
  return RTr.test(e) ? e : void 0;
}
//@ chunk-e6aww6q8.js:3040979-3041006 placement
var Opn = new HostScoped(() => new FigSpecRegistry());
//@ chunk-e6aww6q8.js:3041035-3041144 placement
var WORKTREES_SEGMENT = `${sep_46}worktrees${sep_46}`,
  WORKTREE_CONFIG_SUFFIXES = [
    `${sep_46}config.worktree`,
    `${sep_46}config.worktree.lock`,
    `${sep_46}commondir`,
  ];
//@ chunk-e6aww6q8.js:3041144-3041213 placement
function jTr(e) {
  return e.includes(WORKTREES_SEGMENT) && WORKTREE_CONFIG_SUFFIXES.some((n) => e.endsWith(n));
}
/**
 * 校验 shell 读回的当前目录：拒绝含 ./..、NT 设备路径、网络路径的结果。
 */
//@ chunk-e6aww6q8.js:3072690-3073816 placement
async function validateShellCwdReadback(e, n, r) {
  let s = getFsImplementation();
  if (e.length === 0) return;
  let h = getPlatform() === "windows";
  if (!h) ((e = e.replace(/^\/+/, "/")), (n = n.replace(/^\/+/, "/")));
  for (let y of [e, n]) {
    if (cl(y)) {
      logForDebugging("shell cwd read-back contains a dot-segment; ignoring", { level: "warn" });
      return;
    }
    if (gb(y)) {
      logForDebugging("shell cwd read-back is an NT-namespace device path; ignoring", { level: "warn" });
      return;
    }
    if (h && ai(y) && isForeignNetworkPath(y, r)) {
      logForDebugging("shell cwd read-back is a network path; ignoring", { level: "warn" });
      return;
    }
    if (isNetDir(y)) {
      logForDebugging("shell cwd read-back is the bare automount map root; ignoring", { level: "warn" });
      return;
    }
    if (isForeignMountPath(y, r)) {
      logForDebugging("shell cwd read-back crosses a foreign automount host; ignoring", { level: "warn" });
      return;
    }
  }
  if (!isAbsolute_42(n)) {
    logForDebugging("shell cwd read-back is not an absolute path; ignoring", { level: "warn" });
    return;
  }
  if (
    findIntermediateUncJunction(s, n, {
      anchor: r,
      surfaceNetworkRaw: !0,
      unreadableAncestry: "unverified",
    }) !== void 0
  ) {
    logForDebugging("shell cwd read-back resolves through a network symlink/junction; ignoring", {
      level: "warn",
    });
    return;
  }
  try {
    if (!(await s.stat(n)).isDirectory()) {
      logForDebugging("shell cwd read-back is not a directory; ignoring", { level: "warn" });
      return;
    }
  } catch {
    logForDebugging("shell cwd read-back is not readable; ignoring", { level: "warn" });
    return;
  }
  return n;
}
//@ chunk-e6aww6q8.js:3075996-3076036 placement
var $Er = 1800000,
  mTn = "/bin/sh",
  UEr = 65536;
//@ chunk-e6aww6q8.js:3076036-3076160 placement
async function createBashProvider(e, n) {
  let r = await resolveBashToolShell(e),
    s = await pluginBinPathsSafe(n);
  return { provider: await createBashShellProvider(r, { pluginBinPaths: s }), pluginBinPaths: s };
}
//@ chunk-e6aww6q8.js:3076160-3076301 placement
async function pluginBinPathsSafe(e) {
  try {
    return await getEnabledPluginBinPaths(e);
  } catch (error) {
    return (
      logForDebugging(`Shell: leaving plugin bin/ dirs off PATH: ${errorMessage(error)}`, { level: "warn" }),
      logError(error),
      []
    );
  }
}
//@ chunk-e6aww6q8.js:3076301-3076348 placement
async function getShellConfig(e) {
  return (CR(), getOrCreateShellConfig(pre(), e));
}
/**
 * 惰性创建并缓存 shell 配置（选择 shell 提供者与快照的 Promise）。
 */
//@ chunk-e6aww6q8.js:3076348-3076412 placement
function getOrCreateShellConfig(e, n) {
  return ((e.shellConfig ??= createBashProvider(e, n)), e.shellConfig);
}
/**
 * 取当前执行用 shell 的分析标签（按 shellPath 归类），失败返回 none。
 */
//@ chunk-e6aww6q8.js:3076412-3076513 placement
async function getExecutorShellForAnalytics() {
  try {
    let { provider: provider } = await getShellConfig();
    return normalizeShellNameForAnalytics(provider.shellPath);
  } catch {
    return lit_2("none");
  }
}
//@ chunk-e6aww6q8.js:3076513-3076552 placement
var gTn = Symbol("shell config pending");
/**
 * 插件刷新后决定是否丢弃 shell 快照：配置仍在构建、快照不可用或插件 bin/ PATH 变了就清掉缓存的 shellConfig（下次 Bash 重建），否则保留；返回是否丢弃。
 */
//@ chunk-e6aww6q8.js:3076552-3077252 placement
async function invalidateShellSnapshotIfPluginBinsChanged(e) {
  let n = pre();
  n.powerShellPluginBinPaths = null;
  let shellConfig = n.shellConfig;
  if (shellConfig === null) return !1;
  let s = null,
    h = "plugin bin/ PATH entries changed";
  try {
    let winner = await Promise.race([shellConfig, Promise.resolve(gTn)]);
    if (winner === gTn) h = "its config was still being built";
    else if ((await winner.provider.isSnapshotUsable?.()) === !1) h = "its snapshot failed or is missing";
    else if (qEr(winner.pluginBinPaths, await getEnabledPluginBinPaths(e)))
      s = "plugin bin/ PATH entries unchanged";
  } catch {
    h = "its config or the plugin bin/ read failed";
  }
  if (s !== null) return (logForDebugging(`Shell snapshot kept across plugin refresh: ${s}`), !1);
  if (n.shellConfig !== shellConfig) return !1;
  return (
    (n.shellConfig = null),
    logForDebugging(`Shell snapshot dropped on plugin refresh (${h}); the next Bash exec rebuilds it`),
    !0
  );
}
//@ chunk-e6aww6q8.js:3077252-3077323 placement
function qEr(e, n) {
  return e.length === n.length && e.every((r, s) => r === n[s]);
}
/**
 * 取当前宿主状态上的 PowerShell 提供者（getPsProvider(pre())）。
 */
//@ chunk-e6aww6q8.js:3077323-3077356 placement
function getPsProvider() {
  return getPsProviderForHostState(pre());
}
/**
 * 惰性创建并缓存（存于宿主状态 powerShellProvider）PowerShell 提供者：先 getCachedPowerShellPath 找 pwsh/powershell，找不到抛 "PowerShell is not available"。
 */
//@ chunk-e6aww6q8.js:3077356-3077504 fingerprint = getPsProvider (0.784)
function getPsProviderForHostState(e) {
  return (
    (e.powerShellProvider ??= getCachedPowerShellPath().then((n) => {
      if (!n) throw Error("PowerShell is not available");
      return createPowerShellProvider(n);
    })),
    e.powerShellProvider
  );
}
/**
 * shellType → 提供者获取函数表：bash 走 getBashProviderForHost(RTn) 取 .provider，powershell 走 getPsProvider。
 */
//@ chunk-e6aww6q8.js:3077504-3077572 fingerprint = resolveProvider (1)
var resolveProvider = {
  bash: async (e, n) => (await getOrCreateShellConfig(e, n)).provider,
  powershell: getPsProviderForHostState,
};
/**
 * Shell 工具的统一执行入口 exec(command, abortSignal, shellType, options)。顺序：diskless 会话直接拒绝 → 取 bash/powershell 提供者 → 生成执行 id 与 TMPDIR → provider.buildExecCommand 拼出命令串（快照 source、cwd 落盘文件等）→ 校验 cwd（被删/被换链接/与权限检查时不一致都拒绝，必要时回退到项目根/家目录/临时目录）、worktree 隔离防逃逸 → 若 shouldUseSandbox：合并逐命令 denyRead/denyWrite、scrub 沙箱配置，调用 SandboxManager.wrapWithSandbox（POSIX，得到包装后的命令串）或 wrapWithSandboxArgv（Windows，得到 argv/env），strict 模式下无隔离则拒绝 → spawn（cgroup、env 覆盖、Windows PowerShell 启动器）→ 包成 ShellCommandImpl；结束后读 cwd 文件更新会话 cwd、清理沙箱、改写 Windows 沙箱错误码说明。失败一律返回 createFailedCommand（E2BIG、磁盘满单独提示）。
 */
//@ chunk-e6aww6q8.js:3077572-3093643 placement = exec (0.197)
async function exec(command, abortSignal, shellType, options) {
  if (Tv())
    throw (
      logFeatureSad("sandbox_exec", "diskless_no_shell"),
      new SandboxPolicyRefusalError(
        "Shell commands are unavailable in this session; the command was not run.",
        "diskless_no_shell",
      )
    );
  let session = options.session,
    host = options.session ? options.session.host : options.host,
    {
      timeout: timeout,
      onProgress: onProgress,
      preventCwdChanges: preventCwdChanges,
      shouldUseSandbox: shouldUseSandbox,
      sandboxAttributionId: sandboxAttributionId,
      sandboxNetworkLists: sandboxNetworkLists,
      attributionMessageId: attributionMessageId,
      callTiming: callTiming,
      shouldAutoBackground: shouldAutoBackground,
      onStdout: onStdout,
      sessionEnvVars: sessionEnvVars,
      effortLevel: effortLevel,
      agentWorktree: agentWorktree,
      isolationRoot: isolationRoot,
      useToolMemoryCgroup: useToolMemoryCgroup = !0,
      toolCgroupClass: toolCgroupClass = "shell",
      scrubCredentialEnv: scrubCredentialEnv,
      requireConfiningSandbox: requireConfiningSandbox,
      sandboxDenyRead: sandboxDenyRead = [],
      sandboxDenyWrite: sandboxDenyWrite = [],
      storageV5: storageV5,
      owningAgentId: owningAgentId,
      caller: caller = "inner",
      turnAbortBackgrounds: turnAbortBackgrounds = !1,
      bunOptionsFor: bunOptionsFor,
    } = options,
    effectiveTimeout = timeout || $Er,
    hostState = pre(),
    provider = await resolveProvider[shellType](hostState, storageV5),
    id = Math.floor(Math.random() * 65536)
      .toString(16)
      .padStart(4, "0"),
    attributionSuffix =
      shellType === "bash" ? buildShellSessionLabel(attributionMessageId, sandboxAttributionId) : void 0,
    execId = attributionSuffix !== void 0 ? `${id}-${attributionSuffix}` : id,
    isWindowsSandbox = (shouldUseSandbox ?? !1) && getPlatform() === "windows",
    sandboxTmpDir = shouldUseSandbox && sandboxExportsChildTmpDir() ? childProcessTmpDir() : void 0,
    tmpDirBackstop =
      sandboxTmpDir === void 0 &&
      /\bTMPDIR\b/.test(command) &&
      (SandboxManager.isSandboxingEnabled() || getPlatform() === "windows")
        ? socketSafeTmpdir()
        : void 0;
  if (sandboxTmpDir !== void 0 && !hostState.warnedShortTmpDir) {
    let Ri = claudeTempDir();
    if (sandboxTmpDir !== Ri)
      ((hostState.warnedShortTmpDir = !0),
        logForDebugging(
          `CLAUDE_CODE_TMPDIR makes the per-uid temp dir ${Buffer.byteLength(Ri)} bytes, too long for AF_UNIX sockets; child-process $TMPDIR falls back to ${sandboxTmpDir}. ` +
            "Shorten CLAUDE_CODE_TMPDIR to \u2264~30 bytes if child processes should use your override.",
          { level: "warn" },
        ));
  }
  let bunOptions;
  if (bunOptionsFor !== void 0 && !isWindowsSandbox) {
    await provider.snapshotSettled;
    let Ri = { ...subprocessEnv(bTn(shellType, shouldUseSandbox, scrubCredentialEnv)) };
    if (scrubCredentialEnv || shouldUseSandbox) {
      let { denied: denied, masked: masked } = shouldUseSandbox
          ? sandboxCredentialEnvVars()
          : { denied: [], masked: [] },
        yr = new Set(
          [...(scrubCredentialEnv ? listSecretEnvNames(Ri) : []), ...denied, ...masked].map((Kr) =>
            Kr.toUpperCase(),
          ),
        );
      for (let Kr of Object.keys(Ri)) if (yr.has(Kr.toUpperCase())) delete Ri[Kr];
    }
    bunOptions = bunOptionsFor(Ri);
  }
  let {
      commandString: builtCommand,
      cwdFilePath: cwdFilePath,
      cpuAccountJoin: cpuAccountJoin,
      carriedCommandText: carriedCommandText,
    } = await provider.buildExecCommand(command, {
      id: execId,
      sandboxTmpDir: sandboxTmpDir,
      tmpDirBackstop: tmpDirBackstop,
      useSandbox: shouldUseSandbox ?? !1,
      extraGitConfig: shouldUseSandbox ? Twn() : [],
      scrubCredentialEnv: scrubCredentialEnv,
      noBashEnv: !inheritedByChildren("BASH_ENV") && !sessionEnvVars?.get("BASH_ENV"),
      sandboxMaskedEnv: scrubCredentialEnv && shouldUseSandbox ? sandboxCredentialEnvVars().masked : void 0,
      storageV5: storageV5,
      bunOptions: bunOptions,
      shellToolCommand: toolCgroupClass === "shell" && useToolMemoryCgroup,
    }),
    commandString = builtCommand,
    heldCwd = options.cwd === void 0 ? fwr() : void 0,
    cwd = options.cwd ?? heldCwd ?? (session ? xo(session).cwd : void 0) ?? PDn(),
    isolationRoot_2 = isolationRoot ?? agentWorktree;
  if (agentWorktree && !M$()) {
    (logForDebugging(
      `[worktree] blocked shell exec after cwd-override loss: agentWorktree=${agentWorktree}`,
      { level: "warn" },
    ),
      logEvent("tengu_agent_worktree_cwd_escape_blocked", { reason: lit_2("context_lost") }));
    let Ri = BNe() ? agentWorktree : g_(isolationRoot_2 ?? agentWorktree);
    return createFailedCommand(
      `The working-directory isolation context for this agent was lost, so this command would run in the parent session's directory instead of this agent's worktree (${Ri}). Refusing to run it. Retry the command; if this keeps failing, report that worktree isolation was lost.`,
    );
  }
  let cwdIdentity = await o_s(cwd),
    cwdGone = cwdIdentity === null;
  if (!cwdGone && permissionCheckedCwdOf(session) !== void 0)
    cwdGone = (await checkCwdStillValid(cwd)) === "lost";
  if (heldCwd !== void 0 && !cwdGone && !pwr(cwdIdentity))
    return (
      logForDebugging(
        `Shell exec refused: working directory "${cwd}" leads elsewhere than at the command's permission check`,
        { level: "warn" },
      ),
      logFeatureSad("call_directory_hold", "changed_before_shell"),
      createFailedCommand(
        `Working directory "${cwd}" no longer leads where it did when this command was permission-checked (a part of the path was replaced, or can't be examined), so this command was not run. Re-issue the command to have it checked afresh.`,
      )
    );
  if (cwdGone && heldCwd !== void 0 && session?.project?.cwd !== heldCwd) {
    if (session?.project?.cwd !== void 0) setCwdForCallChain(session.project.cwd);
    return (
      logFeatureSad("call_directory_hold", "gone"),
      createFailedCommand(
        `Working directory "${cwd}" is gone (deleted, moved, replaced by a link, or unreadable), so this command was not run. Re-issue the command if it still makes sense where the session is now.`,
      )
    );
  }
  if (cwdGone && options.cwd !== void 0)
    return createFailedCommand(`Working directory "${cwd}" no longer exists.`);
  if (cwdGone) {
    let Ri = [getOriginalCwd(), homedir_8(), tmpdir()],
      Ja = null,
      Di = -1;
    for (let [Li, Qs] of Ri.entries())
      try {
        ((Ja = await realpath_24(Qs)), (Di = Li));
        break;
      } catch {}
    if (Ja === null)
      return createFailedCommand(
        `Working directory "${cwd}" no longer exists. Please restart Claude from an existing directory.`,
      );
    let yr = agentWorktree || isolationRoot_2 ? BNe() : !1;
    if (yr && agentWorktree && Di === 0)
      return (
        logForDebugging(
          `[worktree] blocked shell exec: cwd "${cwd}" is gone and recovery targets the shared checkout; agentWorktree=${agentWorktree}`,
          { level: "warn" },
        ),
        logEvent("tengu_agent_worktree_cwd_escape_blocked", { reason: lit_2("worktree_gone") }),
        createFailedCommand(
          `This agent is isolated in the worktree ${agentWorktree}, but its working directory "${cwd}" no longer exists and the only recovery target is the parent session's shared checkout. Refusing to run there \u2014 the isolation worktree appears to have been removed. Report this instead of retrying.`,
        )
      );
    if (
      !yr &&
      isolationRoot_2 &&
      Di === 0 &&
      (agentWorktree || BLOCKED_CWD_MESSAGES(Ja, isolationRoot_2) !== null)
    )
      return (
        logForDebugging(
          `[worktree] blocked shell exec: cwd "${cwd}" is gone and recovery targets "${Ja}" outside the isolation worktree ${isolationRoot_2}`,
          { level: "warn" },
        ),
        logEvent("tengu_agent_worktree_cwd_escape_blocked", { reason: lit_2("worktree_gone") }),
        createFailedCommand(
          `${isolationSubjectWords(isolationRoot_2).noun} is isolated in the worktree ${g_(isolationRoot_2)}, but its working directory "${g_(cwd)}" no longer exists and the recovery target (${g_(Ja)}) is outside that worktree. Refusing to run there. Report this instead of retrying.`,
        )
      );
    if (session?.root !== void 0 && missingWorkingDirectoryPins.peek(session.root)?.pinned === !0)
      return (
        logForDebugging(
          `Shell CWD "${cwd}" no longer exists and the session is pinned to it; not recovering to "${Ja}"`,
          { level: "warn" },
        ),
        logEvent("tengu_shell_set_cwd", { success: !1, pinned_refusal: !0 }),
        createFailedCommand(
          `Working directory "${cwd}" no longer exists, so shell commands cannot run until it is restored. File tools with absolute paths still work; recreate the directory (writing a file inside it recreates it), or start a new session from an existing directory.`,
        )
      );
    logForDebugging(`Shell CWD "${cwd}" no longer exists, recovering to "${Ja}"`);
    let cwd_2 = CMi();
    if ((session?.setCwd(Ja), setCwdForCallChain(Ja), permissionCheckedCwdOf(session) !== void 0))
      return (
        logFeatureSad("mcp_serve_call_directory", "start_directory_gone"),
        createFailedCommand(
          `Working directory "${cwd}" is gone (deleted, moved, replaced by a link, or unreadable), so this command was not run. Shell cwd recovered to "${Ja}": re-issue the command if it still makes sense there.`,
        )
      );
    if (heldCwd !== void 0 && !cwd_2)
      return (
        logFeatureSad("call_directory_hold", "gone"),
        createFailedCommand(
          `Working directory "${cwd}" no longer exists, so this command was not run. Shell cwd recovered to "${Ja}": re-issue the command if it still makes sense there.`,
        )
      );
    if (Di > 0)
      return createFailedCommand(
        `Working directory "${cwd}" was deleted; shell cwd recovered to "${Ja}". Re-issue your command (it will run from the recovered directory).`,
      );
    cwd = Ja;
  }
  let isAbortedNow = () => abortSignal.aborted && !(turnAbortBackgrounds && z6n(abortSignal.reason, caller));
  if (isAbortedNow()) return createAbortedCommand();
  if (owningAgentId !== void 0 && hW(owningAgentId))
    return (
      logForDebugging(`Shell exec refused: agent ${owningAgentId} has a kill pending loop settlement`),
      createAbortedCommand()
    );
  let parsedCommand;
  if (isolationRoot_2) {
    let Ri = BLOCKED_CWD_MESSAGES(cwd, isolationRoot_2);
    if (Ri)
      return (
        logForDebugging(
          `[worktree] blocked shell exec outside isolation worktree: cwd=${cwd} isolationRoot=${isolationRoot_2}`,
          { level: "warn" },
        ),
        logEvent("tengu_agent_worktree_cwd_escape_blocked", { reason: lit_2("shared_checkout") }),
        createFailedCommand(Ri)
      );
    let Ja =
      shellType === "bash"
        ? (await import("./chunk-63f0f3kd.js")).checkBgWorktreeCommandGuard(
            (parsedCommand = await parseForSecurity(command)),
            command,
            cwd,
            isolationRoot_2,
          )
        : null;
    if (Ja)
      return (
        logForDebugging(
          `[worktree] blocked shell exec: command guard refused (${Ja}): cwd=${cwd} isolationRoot=${isolationRoot_2}`,
          { level: "warn" },
        ),
        logEvent("tengu_agent_worktree_cwd_escape_blocked", { reason: lit_2("command_redirect") }),
        createFailedCommand(Ja)
      );
  }
  let binShell = provider.shellPath,
    useUnixSandbox = (shouldUseSandbox ?? !1) && !isWindowsSandbox,
    sandboxInnerShell = useUnixSandbox && shellType === "powershell" ? mTn : binShell;
  if (isScrubEnabled()) {
    let Ri = parsedCommand ?? (await parseForSecurity(command));
    enforceScriptCaps(
      Ri.kind === "simple"
        ? Ri.commands.map((command) => command.text).join(`
`)
        : command,
    );
  }
  let sandboxConfigOverride,
    sandboxArgv,
    sandboxEnv,
    sandboxUnsetEnv,
    unwrappedCommand,
    requireConfinement = async (Ri) => {
      let Ja =
        !shouldUseSandbox || getEffectiveFilesystemPolicy() !== "strict" || isScrubEnabled()
          ? { confined: !1, reason: "sandbox_unconfined" }
          : await ensureDeviceSandboxPosture();
      if (Ja.confined) return;
      throw (
        logFeatureSad("sandbox_exec", Ri),
        new SandboxPolicyRefusalError(
          "This call must run inside a fully confining sandbox and none is available here; the command was not run.",
          Ja.reason,
        )
      );
    };
  if (requireConfiningSandbox) await requireConfinement("remote_floor_refusal_at_spawn");
  let hasPerCommandDenies = sandboxDenyRead.length > 0 || sandboxDenyWrite.length > 0,
    isScrubSandbox = isScrubEnabled() && isScrubSandboxAvailable();
  if (!shouldUseSandbox && hasPerCommandDenies) logFeatureSad("sandbox_exec", "per_command_deny_unsandboxed");
  if (sandboxNetworkLists !== void 0 && (!shouldUseSandbox || isScrubOnlySandboxMode()))
    throw (
      logFeatureSad("sandbox_exec", "network_lists_unsandboxed"),
      new SandboxPolicyRefusalError(
        "This command was approved with allowed_domains but would now run outside the sandbox, which cannot enforce them; it was not run. Re-run it.",
        "network_lists_unsandboxed",
      )
    );
  let commandNetworkLists =
      shouldUseSandbox && sandboxAttributionId !== void 0 && sandboxNetworkLists !== void 0
        ? perCommandNetworkListsForRuntime(sandboxNetworkLists)
        : void 0,
    registeredNetworkListsId;
  if (shouldUseSandbox) {
    if (isScrubSandbox || hasPerCommandDenies) await SandboxManager.ensureInitializedForWrap();
    let Ri = { commandId: sandboxAttributionId ?? command, commandText: command };
    if (isScrubSandbox) {
      let fs = scrubSandboxConfig(),
        denyWrite = fs.filesystem.denyWrite,
        Qs = SandboxManager.getConfig()?.filesystem;
      sandboxConfigOverride = {
        ...fs,
        filesystem: applyFsPolicyOverrides(
          {
            allowWrite: Qs?.allowWrite ?? [],
            denyWrite: SandboxManager.getFsWriteConfig().denyWithinAllow,
            denyRead: Qs?.denyRead ?? [],
            ...(Qs?.allowRead && { allowRead: Qs.allowRead }),
          },
          {
            addAllowWrite: fs.filesystem.allowWrite,
            addDenyWrite: denyWrite,
            addDenyRead: fs.filesystem.denyRead,
            keepBaseDenyWrite: (Hi, Xa) =>
              Xa.some((ta) => posixCovers(ta, Hi)) && !denyWrite.some((ta) => posixCovers(ta, Hi)),
          },
        ),
      };
    }
    let Ja = hasPerCommandDenies
        ? (sandboxConfigOverride?.filesystem ?? SandboxManager.getConfig()?.filesystem)
        : void 0,
      Di = Ja !== void 0 && Ja.disabled !== !0 && getEffectiveFilesystemPolicy() === "strict";
    if (hasPerCommandDenies && !Di)
      warnPerCommandDenyUnenforced(host, Ja === void 0 ? "no_config" : "relaxed_filesystem");
    if (hasPerCommandDenies && Di) {
      await materializeDenyDirectories([...sandboxDenyRead, ...sandboxDenyWrite]);
      let mapped = sandboxDenyRead.map(iCe),
        mapped_2 = sandboxDenyWrite.map(iCe),
        Qs = [...mapped, ...mapped_2],
        Hi = new Map(),
        Xa = applyFsPolicyOverrides(
          { ...Ja, allowRead: Ja.allowRead ?? SandboxManager.getConfig()?.filesystem?.allowRead ?? [] },
          {
            addDenyRead: mapped,
            addDenyWrite: mapped_2,
            dropAllowRead: (ta) => needsNetworkScreen(ta, Qs, Hi),
          },
        );
      sandboxConfigOverride = {
        ...sandboxConfigOverride,
        filesystem: isWindowsSandbox
          ? { denyRead: Xa.denyRead, denyWrite: Xa.denyWrite, allowWrite: [] }
          : Xa,
        allowNestedUserNamespaces: !1,
      };
    }
    if (sandboxTmpDir && !env.CLAUDE_TMPDIR) process.env.CLAUDE_TMPDIR = sandboxTmpDir;
    let yr;
    if (isWindowsSandbox) {
      let Kr,
        Li = commandString;
      if (shellType === "powershell") ({ binShell: Kr, command: Li } = THt(binShell, commandString));
      else {
        let Hi = resolveWindowsSandboxInnerShell(binShell);
        if (Hi) Kr = Hi;
        else {
          let Xa = getGitBashPathCached();
          if (Xa === null)
            throw new SandboxUnavailableForShellError(
              "Sandboxed bash on Windows requires Git Bash, which is not installed. Install Git Bash, or run this command unsandboxed (dangerouslyDisableSandbox).",
            );
          Kr = Xa;
        }
      }
      let Qs = await retryWithoutSignalOnAbort(
        (Hi) => SandboxManager.wrapWithSandboxArgv(Li, Kr, sandboxConfigOverride, Hi, Ri),
        abortSignal,
        isAbortedNow,
      );
      ((sandboxArgv = Qs?.argv),
        (sandboxEnv = Qs?.env),
        (sandboxUnsetEnv = Qs?.unsetEnv),
        (yr = Qs === void 0));
    } else {
      let Kr = Por(commandString);
      unwrappedCommand = Kr;
      let Li = await retryWithoutSignalOnAbort(
        (Qs) => SandboxManager.wrapWithSandbox(Kr, sandboxInnerShell, sandboxConfigOverride, Qs, Ri),
        abortSignal,
        isAbortedNow,
      );
      ((commandString = Li ?? commandString), (yr = Li === void 0));
    }
    if (yr)
      return (
        logEvent("tengu_shell_abort_before_spawn", {
          shell_type: fromEnum(shellType),
          sandboxed: !0,
          caller: fromEnum(caller),
        }),
        createAbortedCommand()
      );
  }
  let needsSandboxCleanup = shouldUseSandbox === !0;
  using Nr = {
    [Symbol.dispose]() {
      if (needsSandboxCleanup) sandboxCleanupSafe();
    },
  };
  if (requireConfiningSandbox) await requireConfinement("remote_floor_refusal_at_wrap");
  let sandboxArgv0 = sandboxArgv?.[0];
  if (sandboxArgv !== void 0 && sandboxArgv0 === void 0)
    throw Error("sandbox wrapWithSandboxArgv returned empty argv");
  if (useUnixSandbox && commandString === unwrappedCommand)
    throw (
      logFeatureBad("sandbox_exec", "sandbox_wrap_unconfined"),
      new SandboxPolicyRefusalError(
        "The sandbox produced no confinement for this command, so it was not run.",
        "sandbox_wrap_unconfined",
      )
    );
  let [spawnFile, spawnArgs] =
      sandboxArgv && sandboxArgv0 !== void 0
        ? [sandboxArgv0, sandboxArgv.slice(1)]
        : useUnixSandbox
          ? [mTn, ["-c", commandString]]
          : [binShell, provider.getSpawnArgs(commandString)],
    environmentOverrides = await provider.getEnvironmentOverrides(
      host,
      command,
      shellType === "powershell" && !scrubCredentialEnv && !shouldUseSandbox
        ? new Map([...(sessionEnvVars ?? []), ...(await parseSessionEnvironment(storageV5))])
        : sessionEnvVars,
    ),
    pluginBinPaths =
      shellType === "powershell" && !shouldUseSandbox
        ? await (hostState.powerShellPluginBinPaths ??= pluginBinPathsSafe(storageV5))
        : [],
    exportedFunctionVars = shellType === "bash" ? getExportedShellFunctionEnvVars(subprocessEnv()) : [],
    unsetEnvNames =
      scrubCredentialEnv || exportedFunctionVars.length > 0
        ? [
            ...(sandboxUnsetEnv ?? []),
            ...(scrubCredentialEnv ? listSecretEnvNames(environmentOverrides) : []),
            ...exportedFunctionVars,
          ]
        : sandboxUnsetEnv,
    respelledEnv = scrubCredentialEnv
      ? sanitizeEnvCredentials({ ...subprocessEnv(), ...environmentOverrides }).respelled
      : {},
    windowsEnvPlan =
      sandboxArgv &&
      buildEnvArgv(sandboxArgv, {
        scrubbed: scrubCredentialEnv === !0,
        subprocessEnv: subprocessEnv(),
        isFromSettings: isSettingsSourcedEnvValue,
        sessionEnvVars: sessionEnvVars,
        gitConfigGlobal: await prepareSandboxGitGlobalConfig(cwd),
        nuGetFallbackFolder: await findReadableNugetPackagesDir({
          ...subprocessEnv(),
          ...environmentOverrides,
        }),
        denied: unsetEnvNames ?? [],
        masked: sandboxCredentialEnvVars().masked,
        isKeptFromRepositories: isProjectScopeBlockedEnvVar,
      });
  if (windowsEnvPlan && "tooLong" in windowsEnvPlan) throw windowsArgvTooLongError(windowsEnvPlan.tooLong);
  if (windowsEnvPlan && windowsEnvPlan.leftOut.length > 0)
    logForDebugging(
      `[sandbox] Windows: these variables from settings or /env are not passed to the sandboxed command: the sandbox or Claude Code sets them itself, sandbox.credentials lists them, they are names that never reach a Windows sandbox, or their name or value cannot stand on a command line: ${windowsEnvPlan.leftOut.join(", ")}`,
    );
  let usePipeMode = !!onStdout,
    taskId = generateTaskId("local_bash"),
    taskOutput = new TaskOutput(taskId, onProgress ?? null, !usePipeMode),
    windowsLauncher =
      shellType === "powershell" && !shouldUseSandbox && !usePipeMode && getPlatform() === "windows"
        ? await resolveUsableWindowsLauncher(
            { powershellPath: binShell, script: commandString, outputPath: taskOutput.path, cwd: cwd },
            hostState,
          )
        : void 0,
    finalSpawnFile = windowsLauncher?.file ?? spawnFile,
    finalSpawnArgs = windowsLauncher?.args ?? windowsEnvPlan?.argv.slice(1) ?? spawnArgs,
    outputFileHandle,
    stdinFd,
    spawnedChild,
    cpuAccountWindow;
  try {
    if (!usePipeMode) {
      if (
        ((outputFileHandle = await openTaskOutputForAppend(taskOutput.path, "w")), windowsLauncher !== void 0)
      )
        (await outputFileHandle.close(), (outputFileHandle = void 0));
    }
    if (isTerminalShutdown()) {
      try {
        await outputFileHandle?.close();
      } catch {}
      if (abortSignal.aborted) return createAbortedCommand();
      if (needsSandboxCleanup) ((needsSandboxCleanup = !1), sandboxCleanupSafe());
      await heldUntilExit();
    }
    stdinFd = shouldUseSandbox ? await openSelfExeForSeccomp() : void 0;
    let Ri = permissionCheckedCwdOf(session) !== void 0;
    if (Ri || heldCwd !== void 0) {
      let [ta, Bs] = await Promise.all([
          Ri ? checkCwdStillValid(cwd) : "same",
          heldCwd !== void 0 ? o_s(cwd) : void 0,
        ]),
        Ca = Ri && (ta !== "same" || permissionCheckedCwdOf(session) !== cwd),
        tu = Ca || (heldCwd !== void 0 && !pwr(Bs));
      if (tu || isTerminalShutdown()) {
        if (Ca) logFeatureSad("mcp_serve_call_directory", "start_directory_changed");
        if (tu && !Ca) logFeatureSad("call_directory_hold", "changed_before_spawn");
        if (
          (await yZe(outputFileHandle, stdinFd),
          taskOutput.clear(),
          await taskOutput.deleteOutputFile(),
          isTerminalShutdown() && !abortSignal.aborted)
        ) {
          if (needsSandboxCleanup) ((needsSandboxCleanup = !1), sandboxCleanupSafe());
          await heldUntilExit();
        }
        return tu
          ? createFailedCommand(
              `Could not confirm that working directory "${cwd}" is the directory that this command was permission-checked in (it was deleted, moved, replaced by a link or made unreadable since, it could not be examined, or another command of the same call changed directory), so the command was not run. Re-issue the command to have it checked afresh.`,
            )
          : createAbortedCommand();
      }
    }
    if (isAbortedNow())
      return (
        logEvent("tengu_shell_abort_before_spawn", {
          shell_type: fromEnum(shellType),
          sandboxed: shouldUseSandbox === !0,
          caller: fromEnum(caller),
        }),
        await yZe(outputFileHandle, stdinFd),
        taskOutput.clear(),
        await taskOutput.deleteOutputFile(),
        createAbortedCommand()
      );
    let Ja = useToolMemoryCgroup ? Nd(toolCgroupClass) : {};
    if (commandNetworkLists !== void 0 && sandboxAttributionId !== void 0)
      (SandboxManager.registerCommandNetworkLists(sandboxAttributionId, commandNetworkLists),
        (registeredNetworkListsId = sandboxAttributionId));
    let Di = callTiming?.mark("external"),
      startTime = performance.now();
    cpuAccountWindow = cpuAccountJoin && openCpuWindow(cpuAccountJoin);
    let childProcess = spawn_2(finalSpawnFile, finalSpawnArgs, {
      ...Ja,
      env: buildShellSpawnEnv({
        shellType: shellType,
        binShell: binShell,
        envOverrides: {
          ...environmentOverrides,
          ...respelledEnv,
          ...windowsLauncher?.env,
          ...(scrubCredentialEnv && shellType === "bash"
            ? prefixedSanitizableEnv(
                { ...subprocessEnv(), ...environmentOverrides, ...respelledEnv },
                shouldUseSandbox ? sandboxCredentialEnvVars() : {},
              )
            : {}),
          ...{},
        },
        spawnEnvPluginBinPaths: pluginBinPaths,
        sandboxEnv: sandboxEnv,
        sandboxUnsetEnv: unsetEnvNames,
        effortLevel: effortLevel,
        envDefaults: bTn(shellType, shouldUseSandbox, scrubCredentialEnv),
        bunOptions: bunOptions,
        carriedCommandText: carriedCommandText,
      }),
      cwd: cwd,
      stdio: windowsLauncher
        ? hZe.stdio
        : checkPathExists(provider.stdin, usePipeMode, outputFileHandle?.fd, stdinFd),
      windowsVerbatimArguments: windowsLauncher && hZe.windowsVerbatimArguments,
      detached: provider.detached,
      windowsHide: !0,
    });
    if (((spawnedChild = childProcess), windowsLauncher !== void 0 && childProcess.pid !== void 0))
      logFeatureOk("shell_windows_launcher");
    if (registeredNetworkListsId !== void 0) {
      let ta = registeredNetworkListsId,
        Bs = () => SandboxManager.unregisterCommandNetworkLists(ta);
      (childProcess.once("exit", Bs), childProcess.once("error", Bs), (registeredNetworkListsId = void 0));
    }
    if (useToolMemoryCgroup && Ja.cgroup === void 0 && GMt())
      parkPendingPid(toolCgroupClass, childProcess.pid);
    let Li = registerAgentProcess(owningAgentId, childProcess);
    (childProcess.once("exit", Li), childProcess.once("error", Li));
    let Qs = wrapSpawn(
      childProcess,
      abortSignal,
      effectiveTimeout,
      taskOutput,
      shouldAutoBackground,
      void 0,
      caller,
      windowsLauncher && (() => resolveShellPidFromLauncher(childProcess.pid, binShell)),
      {
        startedAt: startTime,
        cpuTime: !useUnixSandbox || getPlatform() === "macos",
        procCpuTime: mn() && !useUnixSandbox && (KCt(command) ? "background marker" : !0),
        cpuAccountWindow: cpuAccountWindow,
      },
    );
    if (((cpuAccountWindow = void 0), Di)) Qs.result.then(Di, Di);
    let Hi = endToolExecutionSpan_2("claude_code.bash.subprocess", {
      spanType: "bash.subprocess",
      attrs: { "shell.type": shellType, command_length: command.length, timeout_ms: effectiveTimeout },
      contentAttrs: { command: truncateContentForTelemetry(command).content },
    });
    if (Hi) {
      let ta = getCompoundCommandPrefixesStatic_2(Opn.of(host), command).catch(() => []);
      Qs.result
        .then(async (Bs) => {
          let Ca = await ta;
          if (Ca.length > 0 && !isTracingRedacted())
            Cnr(Hi, { command_prefix: Ca.map((tu) => truncateContentForTelemetry(tu).content) });
          if (
            (Cnr(Hi, {
              exit_code: Bs.code,
              stdout_bytes: Bs.outputFileSize ?? Buffer.byteLength(Bs.stdout),
              stderr_bytes: Buffer.byteLength(Bs.stderr),
              interrupted: Bs.interrupted,
              ...(Bs.backgroundTaskId && { backgrounded: !0 }),
            }),
            Bs.interrupted)
          )
            setSpanError(Hi, `interrupted (exit ${Bs.code})`);
        })
        .catch((Bs) => {
          setSpanError(Hi, errorMessage(Bs));
        })
        .finally(() => Hi.end())
        .catch(() => {});
    }
    if (outputFileHandle !== void 0)
      try {
        await outputFileHandle.close();
      } catch {}
    if (stdinFd !== void 0)
      try {
        closeSync_3(stdinFd);
      } catch {}
    if (childProcess.stdout && onStdout)
      childProcess.stdout.on("data", (chunk) => {
        onStdout(typeof chunk === "string" ? chunk : chunk.toString());
      });
    let Xa = cwdFilePath;
    return (
      (Qs.result = Qs.result.then(async (result) => {
        if (shouldUseSandbox) scheduleSandboxCleanup(childProcess);
        let Bs = !1;
        if (result && !preventCwdChanges && !result.backgroundTaskId)
          try {
            let newCwd = (await getFsImplementation().readFileBytes(Xa, UEr)).toString("utf8").trim(),
              tu = getPlatform() === "windows" ? B8(newCwd) : newCwd;
            if (Mn(tu) !== cwd) {
              let pd = await validateShellCwdReadback(newCwd, tu, cwd);
              if (pd === void 0) ((Bs = !0), logEvent("tengu_shell_set_cwd", { success: !1 }));
              else if (Mn(pd) !== cwd) {
                if ((setCwd(pd, session, cwd), !M$())) (invalidateSessionEnvCache(), onCwdChanged(cwd, pd));
              }
            }
          } catch {
            logEvent("tengu_shell_set_cwd", { success: !1 });
          }
        if (childProcess.pid !== void 0 && childProcess.exitCode === null && childProcess.signalCode === null)
          childProcess.once("exit", () => {
            removeCwdTrackingFile(Xa);
          });
        else await removeCwdTrackingFile(Xa);
        if (
          (releaseConvergentTaskOutputBinding(taskOutput.taskId),
          shouldUseSandbox && getPlatform() === "windows")
        ) {
          let Ca = classifyWindowsSandboxLaunchExit(
            result.code,
            `${result.stderr}
${result.stdout}`,
          );
          if (Ca !== void 0) return { ...result, stderr: Ca };
        }
        if (
          carriedCommandText !== void 0 &&
          result.code === 126 &&
          (COMMAND_TEXT_REF_RE.test(result.stderr) || COMMAND_TEXT_REF_RE.test(result.stdout))
        )
          return (
            provider.stopCarryingCommandText?.(),
            logFeatureBad("shell_command_text_carrier", "carrier_lost"),
            {
              ...result,
              stdout: result.stdout.replace(COMMAND_TEXT_REF_RE, COMMAND_TEXT_MISSING_MESSAGE),
              stderr: result.stderr.replace(COMMAND_TEXT_REF_RE, COMMAND_TEXT_MISSING_MESSAGE),
            }
          );
        if (carriedCommandText !== void 0) logFeatureOk("shell_command_text_carrier");
        return Bs ? { ...result, cwdChangeRefused: Bs } : result;
      })),
      (needsSandboxCleanup = !1),
      Qs
    );
  } catch (error) {
    if (cpuAccountWindow !== void 0) closeCpuWindow(cpuAccountWindow);
    if (spawnedChild !== void 0 && needsSandboxCleanup)
      ((needsSandboxCleanup = !1), scheduleSandboxCleanup(spawnedChild));
    if (registeredNetworkListsId !== void 0)
      SandboxManager.unregisterCommandNetworkLists(registeredNetworkListsId);
    if (
      (await yZe(outputFileHandle, stdinFd),
      taskOutput.clear(),
      logForDebugging(`Shell exec error: ${errorMessage(error)}`),
      isE2BIG(error))
    ) {
      let Ja =
          shouldUseSandbox && getEffectiveFilesystemPolicy() !== "relaxed"
            ? (sandboxConfigOverride?.filesystem?.denyWrite ??
              SandboxManager.getFsWriteConfig().denyWithinAllow)
            : [],
        Di = checkArgvLimits({
          binary: finalSpawnFile,
          argv: carriedCommandText === void 0 ? finalSpawnArgs : [...finalSpawnArgs, carriedCommandText],
          env: {
            ...subprocessEnv(),
            SHELL: shellType === "bash" ? binShell : void 0,
            GIT_EDITOR: "true",
            ...environmentOverrides,
            ...claudeSubprocessEnv({ sessionId: getSessionId(), effortLevel: effortLevel, source: "agent" }),
          },
          sandboxDenyPaths: Ja,
        });
      return (logForDebugging(Di, { level: "error" }), createFailedCommand(Di, "e2big"));
    }
    if (spawnedChild === void 0 && isDiskFullErrno(error)) {
      let Ja = getErrnoCode(error),
        Di =
          Ja === "EDQUOT"
            ? `the user's disk quota is used up (${Ja})`
            : `this computer's disk is full (${Ja})`;
      return createFailedCommand(
        `The command was not started: ${Di} on the volume holding ${join_80(tmpdir(), claudeTempDirName())} (Claude Code's temporary directory), so the file that captures command output could not be created there and nothing ran. ${DISK_FULL_ADVICE}`,
      );
    }
    return createFailedCommand(errorMessage(error));
  }
}
/**
 * 把 cwd 参数解析成绝对真实路径（只取 path 字段）。
 */
//@ chunk-e6aww6q8.js:3093643-3093682 placement
function resolvePhysicalCwd(e, n) {
  return resolveCwd(e, n).path;
}
/**
 * 相对路径基于给定目录或当前 cwd 解析，再 realpath；目录不存在抛 MissingWorkingDirectoryError，其他错误返回 {path, verified:false}。
 */
//@ chunk-e6aww6q8.js:3093682-3093839 placement
function resolveCwd(e, n) {
  let r = isAbsolute_40(e) ? e : resolve_33(n || getFsImplementation().cwd(), e);
  try {
    return { path: realpathExaminedSync(getFsImplementation(), r), verified: !0 };
  } catch (error) {
    if (isENOENT(error)) throw new MissingWorkingDirectoryError(r);
    return { path: r, verified: !1 };
  }
}
/**
 * 工作目录不存在时抛出的错误类，带 path 字段。
 */
//@ chunk-e6aww6q8.js:3093839-3093968 placement = setCwd (0.53)
class MissingWorkingDirectoryError extends Error {
  path;
  name = "MissingWorkingDirectoryError";
  constructor(e) {
    super(`Path "${e}" does not exist`);
    this.path = e;
  }
}
/**
 * 按会话根保存 {pinned} 状态（工作目录缺失时的钉住标记）；被钉住的会话 cwd 消失时 exec 不回退到别的目录。
 */
//@ chunk-e6aww6q8.js:3093968-3094030 placement
var missingWorkingDirectoryPins = new SessionRootSlot(() => ({ pinned: !1 })),
  permissionCheckedCwds = new SessionRootSlot(() => new WeakMap());
/**
 * 取该会话在权限检查时记录的 cwd（按会话根的 WeakMap）；exec 在 spawn 前后比对，目录被替换/删除则拒绝执行。
 */
//@ chunk-e6aww6q8.js:3094030-3094087 placement
function permissionCheckedCwdOf(e) {
  return e?.root && permissionCheckedCwds.peek(e.root)?.get(e);
}
//@ chunk-e6aww6q8.js:3094087-3094147 placement
function xTn(e) {
  let n = dirname_45(e);
  return n === e ? [e] : [...xTn(n), e];
}
/**
 * 工作目录是否仍存在（same/lost/unknown）。
 */
//@ chunk-e6aww6q8.js:3094147-3094521 placement
async function checkCwdStillValid(e) {
  if (resolve_33(e) !== e) return "lost";
  let results = await Promise.all(
    xTn(e).map((r) =>
      lstat_27(r).then(
        (s) => (s.isDirectory() ? "same" : "lost"),
        (s) => {
          let h = getErrnoCode(s) ?? "";
          if (["EPERM", "EACCES"].includes(h))
            return ["macos", "windows"].includes(getPlatform()) ? "unknown" : "lost";
          return ["ENOENT", "ENOTDIR", "ELOOP"].includes(h) ? "lost" : "unknown";
        },
      ),
    ),
  );
  return ["lost", "unknown"].find((r) => results.includes(r)) ?? "same";
}
//@ chunk-e6aww6q8.js:3094521-3094742 placement
async function resolvePhysicalCwdV5(e, n, r) {
  let s = isAbsolute_40(e) ? e : resolve_33(r || getFsImplementation().cwd(), e),
    realPath = await n.hostFiles.realPath(PathSpace.workspace(s));
  if (!realPath.ok) return { path: s, verified: !1 };
  if (!realPath.value.found) throw new MissingWorkingDirectoryError(s);
  return { path: Mn(realPath.value.path), verified: !0 };
}
//@ chunk-e6aww6q8.js:3094742-3094777 placement
function setCwd(e, n, r) {
  applyNewCwd(resolveCwd(e, r), n);
}
/**
 * chdir 后调用 setCwd；setCwd 拒绝时尝试切回原目录再抛出错误。
 */
//@ chunk-e6aww6q8.js:3094777-3094982 placement
function chdirAndSetCwd(e) {
  let n = processChdir(e);
  try {
    setCwd(e);
  } catch (error) {
    try {
      processChdir(n ?? getCwd());
    } catch (error) {
      logForDebugging(
        `chdirAndSetCwd: the chdir back failed, so the process stays in the directory that setCwd refused: ${error}`,
        { level: "error" },
      );
    }
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3094982-3095034 placement
async function setCwdV5(e, n, r, s) {
  applyNewCwd(await resolvePhysicalCwdV5(e, r, s), n);
}
//@ chunk-e6aww6q8.js:3095034-3095227 placement
function applyNewCwd(e, n) {
  (n?.setCwd(e.path), setCwdForCallChain(e.path));
  let r = n?.root;
  if (e.verified && r !== void 0 && r === n) {
    let peek = missingWorkingDirectoryPins.peek(r);
    if (peek !== void 0) peek.pinned = !1;
  }
  try {
    logEvent("tengu_shell_set_cwd", { success: !0 });
  } catch (error) {}
}
//@ chunk-e6aww6q8.js:3095227-3095254 placement
function registerSandboxWriteDirectory(e, n) {
  addSandboxAllowWriteDirectory(e, n);
}
//@ chunk-e6aww6q8.js:3095254-3095277 placement
function unregisterSandboxWriteDirectory(e) {
  removeSandboxAllowWriteDirectory(e);
}
//@ chunk-e6aww6q8.js:3095277-3095399 placement
async function retryWithoutSignalOnAbort(e, n, r) {
  try {
    return await e(n);
  } catch (error) {
    if (!n.aborted || error !== n.reason) throw error;
    return r() ? void 0 : e(void 0);
  }
}
//@ chunk-e6aww6q8.js:3095399-3095484 placement
async function yZe(e, n) {
  try {
    await e?.close();
  } catch {}
  if (n !== void 0)
    try {
      closeSync_3(n);
    } catch {}
}
//@ chunk-e6aww6q8.js:3095484-3095605 placement
function sandboxCleanupSafe(e, n) {
  try {
    SandboxManager.cleanupAfterCommand(e, n);
  } catch (error) {
    logForDebugging(`sandbox cleanupAfterCommand failed: ${error}`, { level: "warn" });
  }
}
//@ chunk-e6aww6q8.js:3095605-3095716 placement
function sandboxScrubSafe() {
  try {
    SandboxManager.scrubAfterCommand();
  } catch (error) {
    logForDebugging(`sandbox scrubAfterCommand failed: ${error}`, { level: "warn" });
  }
}
/**
 * 子进程退出后再做沙箱清理（先擦除，快照扫描路径）。
 */
//@ chunk-e6aww6q8.js:3095716-3096062 placement
function scheduleSandboxCleanup(e) {
  if (e.pid === void 0 || e.exitCode !== null || e.signalCode !== null) {
    sandboxCleanupSafe();
    return;
  }
  if (isTerminalShutdown()) {
    sandboxScrubSafe();
    return;
  }
  try {
    let snapshotBareGitRepoScrubPaths = SandboxManager.snapshotBareGitRepoScrubPaths(),
      snapshotSymlinkedDenyScrubPaths = SandboxManager.snapshotSymlinkedDenyScrubPaths();
    sandboxScrubSafe();
    let s = !1,
      h = () => {
        if (!s)
          ((s = !0), sandboxCleanupSafe(snapshotBareGitRepoScrubPaths, snapshotSymlinkedDenyScrubPaths));
      };
    (e.once("exit", h), e.once("error", h));
  } catch (error) {
    logForDebugging(`sandbox deferred-cleanup setup failed: ${error}`, { level: "warn" });
  }
}
//@ chunk-e6aww6q8.js:3096062-3096198 placement
async function removeCwdTrackingFile(e) {
  try {
    await getFsImplementation().unlink(e);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to remove shell cwd-tracking file: ${errorMessage(error)}`, { level: "warn" });
  }
}
//@ chunk-e6aww6q8.js:3096198-3096269 placement
function bTn(e, n, r) {
  return e === "bash" && !n && !r ? bR().shellExports : void 0;
}
/**
 * 构造 shell 子进程环境：默认值、SHELL（bash 时）、GIT_EDITOR=true、覆盖项、沙箱 env、会话/effort 标识；删除沙箱要求移除的变量，把插件 bin 目录拼进 PATH，带上 BUN_OPTIONS 与命令文本承载变量。
 */
//@ chunk-e6aww6q8.js:3096269-3096725 placement
function buildShellSpawnEnv({
  shellType: shellType,
  binShell: binShell,
  envOverrides: envOverrides,
  spawnEnvPluginBinPaths: spawnEnvPluginBinPaths = [],
  sandboxEnv: sandboxEnv,
  sandboxUnsetEnv: sandboxUnsetEnv,
  effortLevel: effortLevel,
  envDefaults: envDefaults,
  bunOptions: bunOptions,
  carriedCommandText: carriedCommandText,
}) {
  let q = {
    ...subprocessEnv(envDefaults),
    SHELL: shellType === "bash" ? binShell : void 0,
    GIT_EDITOR: "true",
    ...envOverrides,
    ...sandboxEnv,
    ...claudeSubprocessEnv({ sessionId: getSessionId(), effortLevel: effortLevel, source: "agent" }),
    ...(sandboxUnsetEnv && Object.fromEntries(sandboxUnsetEnv.map((Z) => [Z, void 0]))),
  };
  if ((Object.assign(q, getPluginPathEnv(q, spawnEnvPluginBinPaths, delimiter_4)), bunOptions !== void 0)) {
    if ((setBunOptions(q, bunOptions), shellType === "bash")) q[BUN_OPTIONS_CARRIER_VAR] = bunOptions;
  }
  if (carriedCommandText !== void 0) q[COMMAND_TEXT_VAR] = carriedCommandText;
  return q;
}
//@ chunk-e6aww6q8.js:3096813-3096993 placement
function sandboxCredentialEnvVars() {
  let e = SandboxManager.getConfig()?.credentials?.envVars ?? [];
  return {
    denied: e.filter((n) => n.mode === "deny").map((n) => n.name),
    masked: e.filter((n) => n.mode !== "deny").map((n) => n.name),
  };
}
//@ chunk-e6aww6q8.js:3096993-3097020 placement
var perCommandDenyUnenforcedSaid = new HostScoped(() => new Set());
/**
 * 判断 shell 路径可执行：先 access X_OK，失败时（非 Windows 绝对路径的特定错误直接 false）再跑 `--version` 看退出码。
 */
//@ chunk-s61vbvea.js:52893-53070 fingerprint = isExecutable (0.639)
async function isExecutable(shellPath) {
  try {
    return (accessSync(shellPath, constants_2.X_OK), !0);
  } catch (error) {
    if (getPlatform_2() !== "windows" && isAbsolute(shellPath) && isPathAbsent(error)) return !1;
    let { code: code } = await execFileNoThrow(shellPath, ["--version"], { timeout: 1000, useCwd: !1 });
    return code === 0;
  }
}
/**
 * 生成候选 shell 列表：CLAUDE_CODE_SHELL、SHELL（含 bash/zsh 的）、which 结果，以及 /bin、/usr/bin、/usr/local/bin、/opt/homebrew/bin 下的 bash/zsh；SHELL 含 bash 时 bash 优先。
 */
//@ chunk-s61vbvea.js:53070-53411 fingerprint = findSuitableShell (0.774)
function getShellCandidates(zshPath, bashPath) {
  let filtered = [env.CLAUDE_CODE_SHELL, env.SHELL].filter(
      (R) => R !== void 0 && (R.includes("bash") || R.includes("zsh")),
    ),
    preferBash = env.SHELL?.includes("bash"),
    shellPaths = ["/bin", "/usr/bin", "/usr/local/bin", "/opt/homebrew/bin"],
    shellOrder = preferBash ? ["bash", "zsh"] : ["zsh", "bash"],
    [S, w] = preferBash ? [bashPath, zshPath] : [zshPath, bashPath];
  return [
    ...filtered,
    S,
    ...shellOrder.flatMap((shell) => shellPaths.map((path) => `${path}/${shell}`)),
    w,
  ].filter((shell) => shell !== null);
}
/**
 * 依次探测候选 shell 取第一个可执行的；CLAUDE_CODE_SHELL 无效时记日志回退；都没有则抛 "No suitable shell found"。
 */
//@ chunk-s61vbvea.js:53411-53902 placement
async function findSuitableShell() {
  let [e, n] = await Promise.all([whichAsync("zsh"), whichAsync("bash")]),
    r;
  for (let h of getShellCandidates(e, n))
    if (await isExecutable(h)) {
      r = h;
      break;
    }
  let CLAUDE_CODE_SHELL = env.CLAUDE_CODE_SHELL;
  if (CLAUDE_CODE_SHELL)
    logForDebugging(
      r === CLAUDE_CODE_SHELL
        ? `Using shell override: ${CLAUDE_CODE_SHELL}`
        : `CLAUDE_CODE_SHELL="${CLAUDE_CODE_SHELL}" is not a valid bash/zsh path, falling back to detection`,
    );
  if (!r) {
    let h =
      "No suitable shell found. Claude CLI requires a Posix shell environment. Please ensure you have a valid shell installed and the SHELL environment variable set.";
    throw (logForDebugging(h, { level: "error" }), Error(h));
  }
  return r;
}
/**
 * PATH 上可用的 zsh/bash。
 */
//@ chunk-s61vbvea.js:53902-54029 placement
function findShellOnPath() {
  if (Tv()) return;
  return getShellCandidates(w0("zsh"), w0("bash")).find((e) => {
    try {
      return bunWhichOnPath(e, env.PATH ?? "") !== null;
    } catch {
      return !1;
    }
  });
}
//@ chunk-s61vbvea.js:54029-54073 placement
async function j7s() {
  return (CR(), resolveBashToolShell(pre()));
}
/**
 * 解析并缓存 Bash 工具使用的 shell。
 */
//@ chunk-s61vbvea.js:54073-54228 placement
function resolveBashToolShell(e) {
  return (
    (e.bashToolShellPath ??= findSuitableShell().then(
      (n) => ((e.resolvedBashToolShellPath = n), n),
      (n) => {
        throw ((e.bashToolShellPath = null), n);
      },
    )),
    e.bashToolShellPath
  );
}

export {
  findShellOnPath,
  setCwd,
  registerSandboxWriteDirectory,
  unregisterSandboxWriteDirectory,
  exec,
  resolvePhysicalCwd,
  Opn,
  setCwdV5,
  MissingWorkingDirectoryError,
  missingWorkingDirectoryPins,
  permissionCheckedCwds,
  chdirAndSetCwd,
  invalidateShellSnapshotIfPluginBinsChanged,
  j7s,
  getExecutorShellForAnalytics,
  jTr,
  perCommandDenyUnenforcedSaid,
  Obn,
  buildShellSpawnEnv,
};
