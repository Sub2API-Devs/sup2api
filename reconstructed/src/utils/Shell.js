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
import { sep, isAbsolute, join, resolve as resolve_2, dirname, delimiter } from "path";
import { homedir } from "os";
import { realpath, lstat } from "fs/promises";
import { spawn } from "child_process";
import { closeSync, accessSync, constants } from "fs";
import { alwaysFalseHintGate, MESSAGE_ID_RE, TOOL_USE_ID_RE, SAFE_ID_TOKEN_RE } from "./claudeCodeHints.js";
import { HostScoped } from "./hostScoped.js";
import { FigSpecRegistry } from "./bash/registry.js";
import {
  getFsImplementation,
  findIntermediateUncJunction,
  realpathExaminedSync,
  processChdir,
} from "./fsOperations.js";
import { getPlatform } from "./platform.js";
import { hasDotSegment, isDevicePrefixPath, isForeignNetworkPath, identity } from "./pathClassification.js";
import { logForDebugging } from "./debug.js";
import { isNonWslUncPath, isNetDir, isForeignMountPath } from "./networkPaths.js";
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
import { assertProgramLaunchAllowed, isDisklessSession } from "./disklessSession.js";
import { shellPaths } from "./shell/shellPaths.js";
import { normalizeShellNameForAnalytics, env } from "./env.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { getCachedPowerShellPath } from "./shell/powershellDetection.js";
import { createPowerShellProvider, buildEncodedPowerShellInvocation } from "./shell/powershellProvider.js";
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
  proxyCredentialHelpers,
  applyFsPolicyOverrides,
  warnPerCommandDenyUnenforced,
  materializeDenyDirectories,
  needsNetworkScreen,
} from "./sandbox/perCommandDeny.js";
import {
  callFrameCwd,
  currentOrGlobalCwd,
  hasOutermostCallFrame,
  realPathOutcomeAsync,
  callFramePhysicalMatches,
  setCwdForCallChain,
  callFrameRecoversIfGone,
  getCwd,
} from "./cwd.js";
import { getSessionProject, SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { logEvent } from "../services/analytics/index.js";
import {
  hasHostWorktreeDeclaration,
  stripControlCharsForMessage,
  BLOCKED_CWD_MESSAGES,
  isolationSubjectWords,
} from "./worktreeIsolation.js";
import { createFailedCommand, createAbortedCommand, wrapSpawn } from "./ShellCommand.js";
import { getOriginalCwd, getSessionId } from "../bootstrap/state.js";
import { isTurnLevelAbort } from "./abortReasons.js";
import { isAgentStopPending, registerAgentProcess } from "./agentProcessRegistry.js";
import { parseForSecurity } from "./bash/ast.js";
import { ensureDeviceSandboxPosture } from "../remote/tools/deviceSandboxPosture.js";
import { stripTrailingSlashIfLong, prepareSandboxGitGlobalConfig } from "./sandbox/windowsGitIdentity.js";
import { getGitBashPathCached, checkPathExists } from "./windowsPaths.js";
import { wrapWithSeccompExec, openSelfExeForSeccomp } from "./sandbox/linuxSandboxExec.js";
import { parseSessionEnvironment, invalidateSessionEnvCache } from "./sessionEnvironment.js";
import { sanitizeEnvCredentials } from "./settings/policyHelper/helperExec.js";
import { buildEnvArgv } from "./shell/shellEnvironment.js";
import { isSettingsSourcedEnvValue, isProjectScopeBlockedEnvVar } from "./managedEnvApply.js";
import { findReadableNugetPackagesDir } from "./sandbox/windowsNugetPackages.js";
import { generateTaskId } from "../Task.js";
import { TaskOutput } from "./task/TaskOutput.js";
import {
  resolveUsableWindowsLauncher,
  DETACHED_LAUNCHER_SPAWN_OPTIONS,
  resolveShellPidFromLauncher,
} from "./shell/windowsShellLauncher.js";
import { openTaskOutputForAppend, releaseConvergentTaskOutputBinding } from "./task/diskOutput.js";
import { isTerminalShutdown, heldUntilExit } from "./terminalShutdown.js";
import { cgroupSpawnOptions, isToolCgroupPending, parkPendingPid } from "./toolCgroup.js";
import { openCpuWindow, isBackgroundJobCommand, closeCpuWindow } from "./shell/processCpuTime.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import {
  endToolExecutionSpan_2,
  truncateContentForTelemetry,
  isTracingRedacted,
  noopEndToolExecutionSpan,
  setSpanError,
} from "./telemetry/sessionTracing.js";
import { getCompoundCommandPrefixesStatic_2 } from "./bash/prefix.js";
import { posixPathToWindowsPath } from "./path.js";
import { onCwdChanged } from "./hooks/fileChangedWatcher.js";
import { checkArgvLimits } from "./shell/argvLimits.js";
import { claudeSubprocessEnv } from "./claudeSubprocessEnv.js";
import { DISK_FULL_ADVICE } from "./shell/diskSpaceWarning.js";
import { PathSpace } from "./resultError.js";
import { shellEnvSnapshot } from "./shell/shellEnvSnapshot.js";
import { getPluginPathEnv } from "./bash/ShellSnapshot.js";
import { setBunOptions } from "./permissions/protectedSettingsPaths.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { whichAsync, bunWhichSync, bunWhichOnPath } from "./which.js";

//@ chunk-e6aww6q8.js:3034093-3034288 placement
function buildShellSessionLabel(attributionMessageId, sandboxAttributionId) {
  if (!alwaysFalseHintGate()) return;
  let replaced = sandboxAttributionId?.replaceAll(":", "-");
  let filtered = [
    attributionMessageId !== undefined && MESSAGE_ID_RE.test(attributionMessageId)
      ? attributionMessageId
      : undefined,
    replaced !== undefined && TOOL_USE_ID_RE.test(replaced) ? replaced : undefined,
  ].filter((h) => h !== undefined);
  return filtered.length > 0 ? filtered.join("-") : undefined;
}
//@ chunk-e6aww6q8.js:3034288-3034349 placement
function safeSessionIdForSnapshot(sessionId) {
  if (!alwaysFalseHintGate()) return;
  return SAFE_ID_TOKEN_RE.test(sessionId) ? sessionId : undefined;
}
//@ chunk-e6aww6q8.js:3040979-3041006 placement
/**
 * 按宿主缓存的 Fig 命令 spec 注册表，供命令前缀推断使用。
 */
var figSpecRegistryByHost = new HostScoped(() => new FigSpecRegistry());
//@ chunk-e6aww6q8.js:3041035-3041144 placement
var WORKTREES_SEGMENT = `${sep}worktrees${sep}`;
var WORKTREE_CONFIG_SUFFIXES = [`${sep}config.worktree`, `${sep}config.worktree.lock`, `${sep}commondir`];
//@ chunk-e6aww6q8.js:3041144-3041213 placement
function isWorktreeConfigPath(e) {
  return e.includes(WORKTREES_SEGMENT) && WORKTREE_CONFIG_SUFFIXES.some((n) => e.endsWith(n));
}
//@ chunk-e6aww6q8.js:3072690-3073816 placement
/**
 * 校验 shell 读回的当前目录：拒绝含 ./..、NT 设备路径、网络路径的结果。
 */
async function validateShellCwdReadback(newCwd, n, cwd) {
  let fsImplementation = getFsImplementation();
  if (newCwd.length === 0) return;
  let h = getPlatform() === "windows";
  if (!h) {
    newCwd = newCwd.replace(/^\/+/, "/");
    n = n.replace(/^\/+/, "/");
  }
  for (let y of [newCwd, n]) {
    if (hasDotSegment(y)) {
      logForDebugging("shell cwd read-back contains a dot-segment; ignoring", {
        level: "warn",
      });
      return;
    }
    if (isDevicePrefixPath(y)) {
      logForDebugging("shell cwd read-back is an NT-namespace device path; ignoring", {
        level: "warn",
      });
      return;
    }
    if (h && isNonWslUncPath(y) && isForeignNetworkPath(y, cwd)) {
      logForDebugging("shell cwd read-back is a network path; ignoring", {
        level: "warn",
      });
      return;
    }
    if (isNetDir(y)) {
      logForDebugging("shell cwd read-back is the bare automount map root; ignoring", {
        level: "warn",
      });
      return;
    }
    if (isForeignMountPath(y, cwd)) {
      logForDebugging("shell cwd read-back crosses a foreign automount host; ignoring", {
        level: "warn",
      });
      return;
    }
  }
  if (!isAbsolute(n)) {
    logForDebugging("shell cwd read-back is not an absolute path; ignoring", {
      level: "warn",
    });
    return;
  }
  if (
    findIntermediateUncJunction(fsImplementation, n, {
      anchor: cwd,
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    }) !== undefined
  ) {
    logForDebugging("shell cwd read-back resolves through a network symlink/junction; ignoring", {
      level: "warn",
    });
    return;
  }
  try {
    if (!(await fsImplementation.stat(n)).isDirectory()) {
      logForDebugging("shell cwd read-back is not a directory; ignoring", {
        level: "warn",
      });
      return;
    }
  } catch {
    logForDebugging("shell cwd read-back is not readable; ignoring", {
      level: "warn",
    });
    return;
  }
  return n;
}
//@ chunk-e6aww6q8.js:3075996-3076036 placement
var DEFAULT_SHELL_TIMEOUT_MS = 1800000;
var POSIX_SHELL_PATH = "/bin/sh";
var CWD_FILE_READ_BYTES = 65536;
//@ chunk-e6aww6q8.js:3076036-3076160 placement
async function createBashProvider(e, n) {
  let shellPath = await resolveBashToolShell(e);
  let pluginBinPaths = await pluginBinPathsSafe(n);
  return {
    provider: await createBashShellProvider(shellPath, {
      pluginBinPaths,
    }),
    pluginBinPaths,
  };
}
//@ chunk-e6aww6q8.js:3076160-3076301 placement
async function pluginBinPathsSafe(e) {
  try {
    return await getEnabledPluginBinPaths(e);
  } catch (error) {
    logForDebugging(`Shell: leaving plugin bin/ dirs off PATH: ${errorMessage(error)}`, {
      level: "warn",
    });
    logError(error);
    return [];
  }
}
//@ chunk-e6aww6q8.js:3076301-3076348 placement
async function getShellConfig(e) {
  assertProgramLaunchAllowed();
  return getOrCreateShellConfig(shellPaths(), e);
}
//@ chunk-e6aww6q8.js:3076348-3076412 placement
/**
 * 惰性创建并缓存 shell 配置（选择 shell 提供者与快照的 Promise）。
 */
function getOrCreateShellConfig(e, n) {
  e.shellConfig ??= createBashProvider(e, n);
  return e.shellConfig;
}
//@ chunk-e6aww6q8.js:3076412-3076513 placement
/**
 * 取当前执行用 shell 的分析标签（按 shellPath 归类），失败返回 none。
 */
async function getExecutorShellForAnalytics() {
  try {
    let { provider } = await getShellConfig();
    return normalizeShellNameForAnalytics(provider.shellPath);
  } catch {
    return lit_2("none");
  }
}
//@ chunk-e6aww6q8.js:3076513-3076552 placement
var SHELL_CONFIG_PENDING = Symbol("shell config pending");
//@ chunk-e6aww6q8.js:3076552-3077252 placement
/**
 * 插件刷新后决定是否丢弃 shell 快照：配置仍在构建、快照不可用或插件 bin/ PATH 变了就清掉缓存的 shellConfig（下次 Bash 重建），否则保留；返回是否丢弃。
 */
async function invalidateShellSnapshotIfPluginBinsChanged(e) {
  let n = shellPaths();
  n.powerShellPluginBinPaths = null;
  let shellConfig = n.shellConfig;
  if (shellConfig === null) return false;
  let s = null;
  let h = "plugin bin/ PATH entries changed";
  try {
    let winner = await Promise.race([shellConfig, Promise.resolve(SHELL_CONFIG_PENDING)]);
    if (winner === SHELL_CONFIG_PENDING) h = "its config was still being built";
    else if ((await winner.provider.isSnapshotUsable?.()) === false) h = "its snapshot failed or is missing";
    else if (arraysEqual(winner.pluginBinPaths, await getEnabledPluginBinPaths(e)))
      s = "plugin bin/ PATH entries unchanged";
  } catch {
    h = "its config or the plugin bin/ read failed";
  }
  if (s !== null) {
    logForDebugging(`Shell snapshot kept across plugin refresh: ${s}`);
    return false;
  }
  if (n.shellConfig !== shellConfig) return false;
  n.shellConfig = null;
  logForDebugging(`Shell snapshot dropped on plugin refresh (${h}); the next Bash exec rebuilds it`);
  return true;
}
//@ chunk-e6aww6q8.js:3077252-3077323 placement
function arraysEqual(pluginBinPaths, enabledPluginBinPaths) {
  return (
    pluginBinPaths.length === enabledPluginBinPaths.length &&
    pluginBinPaths.every((r, s) => r === enabledPluginBinPaths[s])
  );
}
//@ chunk-e6aww6q8.js:3077323-3077356 placement
/**
 * 取当前宿主状态上的 PowerShell 提供者（getPsProvider(pre())）。
 */
function getPsProvider() {
  return getPsProviderForHostState(shellPaths());
}
//@ chunk-e6aww6q8.js:3077356-3077504 fingerprint = getPsProvider (0.784)
/**
 * 惰性创建并缓存（存于宿主状态 powerShellProvider）PowerShell 提供者：先 getCachedPowerShellPath 找 pwsh/powershell，找不到抛 "PowerShell is not available"。
 */
function getPsProviderForHostState(e) {
  e.powerShellProvider ??= getCachedPowerShellPath().then((psPath) => {
    if (!psPath) throw Error("PowerShell is not available");
    return createPowerShellProvider(psPath);
  });
  return e.powerShellProvider;
}
//@ chunk-e6aww6q8.js:3077504-3077572 fingerprint = resolveProvider (1)
/**
 * shellType → 提供者获取函数表：bash 走 getBashProviderForHost(RTn) 取 .provider，powershell 走 getPsProvider。
 */
var resolveProvider = {
  bash: async (e, n) => (await getOrCreateShellConfig(e, n)).provider,
  powershell: getPsProviderForHostState,
};
//@ chunk-e6aww6q8.js:3077572-3093643 placement = exec (0.197)
/**
 * Shell 工具的统一执行入口 exec(command, abortSignal, shellType, options)。顺序：diskless 会话直接拒绝 → 取 bash/powershell 提供者 → 生成执行 id 与 TMPDIR → provider.buildExecCommand 拼出命令串（快照 source、cwd 落盘文件等）→ 校验 cwd（被删/被换链接/与权限检查时不一致都拒绝，必要时回退到项目根/家目录/临时目录）、worktree 隔离防逃逸 → 若 shouldUseSandbox：合并逐命令 denyRead/denyWrite、scrub 沙箱配置，调用 SandboxManager.wrapWithSandbox（POSIX，得到包装后的命令串）或 wrapWithSandboxArgv（Windows，得到 argv/env），strict 模式下无隔离则拒绝 → spawn（cgroup、env 覆盖、Windows PowerShell 启动器）→ 包成 ShellCommandImpl；结束后读 cwd 文件更新会话 cwd、清理沙箱、改写 Windows 沙箱错误码说明。失败一律返回 createFailedCommand（E2BIG、磁盘满单独提示）。
 */
async function exec(command, abortSignal, shellType, options) {
  if (isDisklessSession()) {
    logFeatureSad("sandbox_exec", "diskless_no_shell");
    throw new SandboxPolicyRefusalError(
      "Shell commands are unavailable in this session; the command was not run.",
      "diskless_no_shell",
    );
  }
  let session = options.session;
  let host = options.session ? options.session.host : options.host;
  let {
    timeout,
    onProgress,
    preventCwdChanges,
    shouldUseSandbox,
    sandboxAttributionId,
    sandboxNetworkLists,
    attributionMessageId,
    callTiming,
    shouldAutoBackground,
    onStdout,
    sessionEnvVars,
    effortLevel,
    agentWorktree,
    isolationRoot,
    useToolMemoryCgroup = true,
    toolCgroupClass = "shell",
    scrubCredentialEnv,
    requireConfiningSandbox,
    sandboxDenyRead = [],
    sandboxDenyWrite = [],
    storageV5,
    owningAgentId,
    caller = "inner",
    turnAbortBackgrounds = false,
    bunOptionsFor,
  } = options;
  let effectiveTimeout = timeout || DEFAULT_SHELL_TIMEOUT_MS;
  let hostState = shellPaths();
  let provider = await resolveProvider[shellType](hostState, storageV5);
  let id = Math.floor(Math.random() * 65536)
    .toString(16)
    .padStart(4, "0");
  let attributionSuffix =
    shellType === "bash" ? buildShellSessionLabel(attributionMessageId, sandboxAttributionId) : undefined;
  let execId = attributionSuffix !== undefined ? `${id}-${attributionSuffix}` : id;
  let isWindowsSandbox = (shouldUseSandbox ?? false) && getPlatform() === "windows";
  let sandboxTmpDir = shouldUseSandbox && sandboxExportsChildTmpDir() ? childProcessTmpDir() : undefined;
  let tmpDirBackstop =
    sandboxTmpDir === undefined &&
    /\bTMPDIR\b/.test(command) &&
    (SandboxManager.isSandboxingEnabled() || getPlatform() === "windows")
      ? socketSafeTmpdir()
      : undefined;
  if (sandboxTmpDir !== undefined && !hostState.warnedShortTmpDir) {
    let Ri = claudeTempDir();
    if (sandboxTmpDir !== Ri) {
      hostState.warnedShortTmpDir = true;
      logForDebugging(
        `CLAUDE_CODE_TMPDIR makes the per-uid temp dir ${Buffer.byteLength(Ri)} bytes, too long for AF_UNIX sockets; child-process $TMPDIR falls back to ${sandboxTmpDir}. ` +
          "Shorten CLAUDE_CODE_TMPDIR to \u2264~30 bytes if child processes should use your override.",
        {
          level: "warn",
        },
      );
    }
  }
  let bunOptions;
  if (bunOptionsFor !== undefined && !isWindowsSandbox) {
    await provider.snapshotSettled;
    let Ri = {
      ...subprocessEnv(shellExportsForSpawn(shellType, shouldUseSandbox, scrubCredentialEnv)),
    };
    if (scrubCredentialEnv || shouldUseSandbox) {
      let { denied, masked } = shouldUseSandbox
        ? sandboxCredentialEnvVars()
        : {
            denied: [],
            masked: [],
          };
      let yr = new Set(
        [...(scrubCredentialEnv ? listSecretEnvNames(Ri) : []), ...denied, ...masked].map((Kr) =>
          Kr.toUpperCase(),
        ),
      );
      for (let key of Object.keys(Ri)) if (yr.has(key.toUpperCase())) delete Ri[key];
    }
    bunOptions = bunOptionsFor(Ri);
  }
  let {
    commandString: builtCommand,
    cwdFilePath,
    cpuAccountJoin,
    carriedCommandText,
  } = await provider.buildExecCommand(command, {
    id: execId,
    sandboxTmpDir,
    tmpDirBackstop,
    useSandbox: shouldUseSandbox ?? false,
    extraGitConfig: shouldUseSandbox ? proxyCredentialHelpers() : [],
    scrubCredentialEnv,
    noBashEnv: !inheritedByChildren("BASH_ENV") && !sessionEnvVars?.get("BASH_ENV"),
    sandboxMaskedEnv: scrubCredentialEnv && shouldUseSandbox ? sandboxCredentialEnvVars().masked : undefined,
    storageV5,
    bunOptions,
    shellToolCommand: toolCgroupClass === "shell" && useToolMemoryCgroup,
  });
  let commandString = builtCommand;
  let heldCwd = options.cwd === undefined ? callFrameCwd() : undefined;
  let cwd =
    options.cwd ?? heldCwd ?? (session ? getSessionProject(session).cwd : undefined) ?? currentOrGlobalCwd();
  let isolationRoot_2 = isolationRoot ?? agentWorktree;
  if (agentWorktree && !hasOutermostCallFrame()) {
    logForDebugging(`[worktree] blocked shell exec after cwd-override loss: agentWorktree=${agentWorktree}`, {
      level: "warn",
    });
    logEvent("tengu_agent_worktree_cwd_escape_blocked", {
      reason: lit_2("context_lost"),
    });
    let Ri = hasHostWorktreeDeclaration()
      ? agentWorktree
      : stripControlCharsForMessage(isolationRoot_2 ?? agentWorktree);
    return createFailedCommand(
      `The working-directory isolation context for this agent was lost, so this command would run in the parent session's directory instead of this agent's worktree (${Ri}). Refusing to run it. Retry the command; if this keeps failing, report that worktree isolation was lost.`,
    );
  }
  let cwdIdentity = await realPathOutcomeAsync(cwd);
  let cwdGone = cwdIdentity === null;
  if (!cwdGone && permissionCheckedCwdOf(session) !== undefined)
    cwdGone = (await checkCwdStillValid(cwd)) === "lost";
  if (heldCwd !== undefined && !cwdGone && !callFramePhysicalMatches(cwdIdentity)) {
    logForDebugging(
      `Shell exec refused: working directory "${cwd}" leads elsewhere than at the command's permission check`,
      {
        level: "warn",
      },
    );
    logFeatureSad("call_directory_hold", "changed_before_shell");
    return createFailedCommand(
      `Working directory "${cwd}" no longer leads where it did when this command was permission-checked (a part of the path was replaced, or can't be examined), so this command was not run. Re-issue the command to have it checked afresh.`,
    );
  }
  if (cwdGone && heldCwd !== undefined && session?.project?.cwd !== heldCwd) {
    if (session?.project?.cwd !== undefined) setCwdForCallChain(session.project.cwd);
    logFeatureSad("call_directory_hold", "gone");
    return createFailedCommand(
      `Working directory "${cwd}" is gone (deleted, moved, replaced by a link, or unreadable), so this command was not run. Re-issue the command if it still makes sense where the session is now.`,
    );
  }
  if (cwdGone && options.cwd !== undefined)
    return createFailedCommand(`Working directory "${cwd}" no longer exists.`);
  if (cwdGone) {
    let Ri = [getOriginalCwd(), homedir(), tmpdir()];
    let Ja = null;
    let Di = -1;
    for (let [Li, Qs] of Ri.entries())
      try {
        Ja = await realpath(Qs);
        Di = Li;
        break;
      } catch {}
    if (Ja === null)
      return createFailedCommand(
        `Working directory "${cwd}" no longer exists. Please restart Claude from an existing directory.`,
      );
    let yr = agentWorktree || isolationRoot_2 ? hasHostWorktreeDeclaration() : false;
    if (yr && agentWorktree && Di === 0) {
      logForDebugging(
        `[worktree] blocked shell exec: cwd "${cwd}" is gone and recovery targets the shared checkout; agentWorktree=${agentWorktree}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_worktree_cwd_escape_blocked", {
        reason: lit_2("worktree_gone"),
      });
      return createFailedCommand(
        `This agent is isolated in the worktree ${agentWorktree}, but its working directory "${cwd}" no longer exists and the only recovery target is the parent session's shared checkout. Refusing to run there \u2014 the isolation worktree appears to have been removed. Report this instead of retrying.`,
      );
    }
    if (
      !yr &&
      isolationRoot_2 &&
      Di === 0 &&
      (agentWorktree || BLOCKED_CWD_MESSAGES(Ja, isolationRoot_2) !== null)
    ) {
      logForDebugging(
        `[worktree] blocked shell exec: cwd "${cwd}" is gone and recovery targets "${Ja}" outside the isolation worktree ${isolationRoot_2}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_worktree_cwd_escape_blocked", {
        reason: lit_2("worktree_gone"),
      });
      return createFailedCommand(
        `${isolationSubjectWords(isolationRoot_2).noun} is isolated in the worktree ${stripControlCharsForMessage(isolationRoot_2)}, but its working directory "${stripControlCharsForMessage(cwd)}" no longer exists and the recovery target (${stripControlCharsForMessage(Ja)}) is outside that worktree. Refusing to run there. Report this instead of retrying.`,
      );
    }
    if (session?.root !== undefined && missingWorkingDirectoryPins.peek(session.root)?.pinned === true) {
      logForDebugging(
        `Shell CWD "${cwd}" no longer exists and the session is pinned to it; not recovering to "${Ja}"`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_shell_set_cwd", {
        success: false,
        pinned_refusal: true,
      });
      return createFailedCommand(
        `Working directory "${cwd}" no longer exists, so shell commands cannot run until it is restored. File tools with absolute paths still work; recreate the directory (writing a file inside it recreates it), or start a new session from an existing directory.`,
      );
    }
    logForDebugging(`Shell CWD "${cwd}" no longer exists, recovering to "${Ja}"`);
    let cwd_2 = callFrameRecoversIfGone();
    session?.setCwd(Ja);
    setCwdForCallChain(Ja);
    if (permissionCheckedCwdOf(session) !== undefined) {
      logFeatureSad("mcp_serve_call_directory", "start_directory_gone");
      return createFailedCommand(
        `Working directory "${cwd}" is gone (deleted, moved, replaced by a link, or unreadable), so this command was not run. Shell cwd recovered to "${Ja}": re-issue the command if it still makes sense there.`,
      );
    }
    if (heldCwd !== undefined && !cwd_2) {
      logFeatureSad("call_directory_hold", "gone");
      return createFailedCommand(
        `Working directory "${cwd}" no longer exists, so this command was not run. Shell cwd recovered to "${Ja}": re-issue the command if it still makes sense there.`,
      );
    }
    if (Di > 0)
      return createFailedCommand(
        `Working directory "${cwd}" was deleted; shell cwd recovered to "${Ja}". Re-issue your command (it will run from the recovered directory).`,
      );
    cwd = Ja;
  }
  let isAbortedNow = () =>
    abortSignal.aborted && !(turnAbortBackgrounds && isTurnLevelAbort(abortSignal.reason, caller));
  if (isAbortedNow()) return createAbortedCommand();
  if (owningAgentId !== undefined && isAgentStopPending(owningAgentId)) {
    logForDebugging(`Shell exec refused: agent ${owningAgentId} has a kill pending loop settlement`);
    return createAbortedCommand();
  }
  let parsedCommand;
  if (isolationRoot_2) {
    let Ri = BLOCKED_CWD_MESSAGES(cwd, isolationRoot_2);
    if (Ri) {
      logForDebugging(
        `[worktree] blocked shell exec outside isolation worktree: cwd=${cwd} isolationRoot=${isolationRoot_2}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_worktree_cwd_escape_blocked", {
        reason: lit_2("shared_checkout"),
      });
      return createFailedCommand(Ri);
    }
    let Ja =
      shellType === "bash"
        ? (await import("./chunk-63f0f3kd.js")).checkBgWorktreeCommandGuard(
            (parsedCommand = await parseForSecurity(command)),
            command,
            cwd,
            isolationRoot_2,
          )
        : null;
    if (Ja) {
      logForDebugging(
        `[worktree] blocked shell exec: command guard refused (${Ja}): cwd=${cwd} isolationRoot=${isolationRoot_2}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_worktree_cwd_escape_blocked", {
        reason: lit_2("command_redirect"),
      });
      return createFailedCommand(Ja);
    }
  }
  let binShell = provider.shellPath;
  let useUnixSandbox = (shouldUseSandbox ?? false) && !isWindowsSandbox;
  let sandboxInnerShell = useUnixSandbox && shellType === "powershell" ? POSIX_SHELL_PATH : binShell;
  if (isScrubEnabled()) {
    let Ri = parsedCommand ?? (await parseForSecurity(command));
    enforceScriptCaps(
      Ri.kind === "simple"
        ? Ri.commands.map((command) => command.text).join(`
`)
        : command,
    );
  }
  let sandboxConfigOverride;
  let sandboxArgv;
  let sandboxEnv;
  let sandboxUnsetEnv;
  let unwrappedCommand;
  let requireConfinement = async (Ri) => {
    let Ja =
      !shouldUseSandbox || getEffectiveFilesystemPolicy() !== "strict" || isScrubEnabled()
        ? {
            confined: false,
            reason: "sandbox_unconfined",
          }
        : await ensureDeviceSandboxPosture();
    if (Ja.confined) return;
    logFeatureSad("sandbox_exec", Ri);
    throw new SandboxPolicyRefusalError(
      "This call must run inside a fully confining sandbox and none is available here; the command was not run.",
      Ja.reason,
    );
  };
  if (requireConfiningSandbox) await requireConfinement("remote_floor_refusal_at_spawn");
  let hasPerCommandDenies = sandboxDenyRead.length > 0 || sandboxDenyWrite.length > 0;
  let isScrubSandbox = isScrubEnabled() && isScrubSandboxAvailable();
  if (!shouldUseSandbox && hasPerCommandDenies) logFeatureSad("sandbox_exec", "per_command_deny_unsandboxed");
  if (sandboxNetworkLists !== undefined && (!shouldUseSandbox || isScrubOnlySandboxMode())) {
    logFeatureSad("sandbox_exec", "network_lists_unsandboxed");
    throw new SandboxPolicyRefusalError(
      "This command was approved with allowed_domains but would now run outside the sandbox, which cannot enforce them; it was not run. Re-run it.",
      "network_lists_unsandboxed",
    );
  }
  let commandNetworkLists =
    shouldUseSandbox && sandboxAttributionId !== undefined && sandboxNetworkLists !== undefined
      ? perCommandNetworkListsForRuntime(sandboxNetworkLists)
      : undefined;
  let registeredNetworkListsId;
  if (shouldUseSandbox) {
    if (isScrubSandbox || hasPerCommandDenies) await SandboxManager.ensureInitializedForWrap();
    let Ri = {
      commandId: sandboxAttributionId ?? command,
      commandText: command,
    };
    if (isScrubSandbox) {
      let fs = scrubSandboxConfig();
      let denyWrite = fs.filesystem.denyWrite;
      let filesystem = SandboxManager.getConfig()?.filesystem;
      sandboxConfigOverride = {
        ...fs,
        filesystem: applyFsPolicyOverrides(
          {
            allowWrite: filesystem?.allowWrite ?? [],
            denyWrite: SandboxManager.getFsWriteConfig().denyWithinAllow,
            denyRead: filesystem?.denyRead ?? [],
            ...(filesystem?.allowRead && {
              allowRead: filesystem.allowRead,
            }),
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
      : undefined;
    let Di = Ja !== undefined && Ja.disabled !== true && getEffectiveFilesystemPolicy() === "strict";
    if (hasPerCommandDenies && !Di)
      warnPerCommandDenyUnenforced(host, Ja === undefined ? "no_config" : "relaxed_filesystem");
    if (hasPerCommandDenies && Di) {
      await materializeDenyDirectories([...sandboxDenyRead, ...sandboxDenyWrite]);
      let mapped = sandboxDenyRead.map(stripTrailingSlashIfLong);
      let mapped_2 = sandboxDenyWrite.map(stripTrailingSlashIfLong);
      let Qs = [...mapped, ...mapped_2];
      let Hi = new Map();
      let Xa = applyFsPolicyOverrides(
        {
          ...Ja,
          allowRead: Ja.allowRead ?? SandboxManager.getConfig()?.filesystem?.allowRead ?? [],
        },
        {
          addDenyRead: mapped,
          addDenyWrite: mapped_2,
          dropAllowRead: (ta) => needsNetworkScreen(ta, Qs, Hi),
        },
      );
      sandboxConfigOverride = {
        ...sandboxConfigOverride,
        filesystem: isWindowsSandbox
          ? {
              denyRead: Xa.denyRead,
              denyWrite: Xa.denyWrite,
              allowWrite: [],
            }
          : Xa,
        allowNestedUserNamespaces: false,
      };
    }
    if (sandboxTmpDir && !env.CLAUDE_TMPDIR) process.env.CLAUDE_TMPDIR = sandboxTmpDir;
    let yr;
    if (isWindowsSandbox) {
      let Kr;
      let Li = commandString;
      if (shellType === "powershell")
        ({ binShell: Kr, command: Li } = buildEncodedPowerShellInvocation(binShell, commandString));
      else {
        let windowsSandboxInnerShell = resolveWindowsSandboxInnerShell(binShell);
        if (windowsSandboxInnerShell) Kr = windowsSandboxInnerShell;
        else {
          let gitBashPath = getGitBashPathCached();
          if (gitBashPath === null)
            throw new SandboxUnavailableForShellError(
              "Sandboxed bash on Windows requires Git Bash, which is not installed. Install Git Bash, or run this command unsandboxed (dangerouslyDisableSandbox).",
            );
          Kr = gitBashPath;
        }
      }
      let Qs = await retryWithoutSignalOnAbort(
        (Hi) => SandboxManager.wrapWithSandboxArgv(Li, Kr, sandboxConfigOverride, Hi, Ri),
        abortSignal,
        isAbortedNow,
      );
      sandboxArgv = Qs?.argv;
      sandboxEnv = Qs?.env;
      sandboxUnsetEnv = Qs?.unsetEnv;
      yr = Qs === undefined;
    } else {
      let Kr = wrapWithSeccompExec(commandString);
      unwrappedCommand = Kr;
      let Li = await retryWithoutSignalOnAbort(
        (Qs) => SandboxManager.wrapWithSandbox(Kr, sandboxInnerShell, sandboxConfigOverride, Qs, Ri),
        abortSignal,
        isAbortedNow,
      );
      commandString = Li ?? commandString;
      yr = Li === undefined;
    }
    if (yr) {
      logEvent("tengu_shell_abort_before_spawn", {
        shell_type: fromEnum(shellType),
        sandboxed: true,
        caller: fromEnum(caller),
      });
      return createAbortedCommand();
    }
  }
  let needsSandboxCleanup = shouldUseSandbox === true;
  using Nr = {
    [Symbol.dispose]() {
      if (needsSandboxCleanup) sandboxCleanupSafe();
    },
  };
  if (requireConfiningSandbox) await requireConfinement("remote_floor_refusal_at_wrap");
  let sandboxArgv0 = sandboxArgv?.[0];
  if (sandboxArgv !== undefined && sandboxArgv0 === undefined)
    throw Error("sandbox wrapWithSandboxArgv returned empty argv");
  if (useUnixSandbox && commandString === unwrappedCommand) {
    logFeatureBad("sandbox_exec", "sandbox_wrap_unconfined");
    throw new SandboxPolicyRefusalError(
      "The sandbox produced no confinement for this command, so it was not run.",
      "sandbox_wrap_unconfined",
    );
  }
  let [spawnFile, spawnArgs] =
    sandboxArgv && sandboxArgv0 !== undefined
      ? [sandboxArgv0, sandboxArgv.slice(1)]
      : useUnixSandbox
        ? [POSIX_SHELL_PATH, ["-c", commandString]]
        : [binShell, provider.getSpawnArgs(commandString)];
  let environmentOverrides = await provider.getEnvironmentOverrides(
    host,
    command,
    shellType === "powershell" && !scrubCredentialEnv && !shouldUseSandbox
      ? new Map([...(sessionEnvVars ?? []), ...(await parseSessionEnvironment(storageV5))])
      : sessionEnvVars,
  );
  let pluginBinPaths =
    shellType === "powershell" && !shouldUseSandbox
      ? await (hostState.powerShellPluginBinPaths ??= pluginBinPathsSafe(storageV5))
      : [];
  let exportedFunctionVars = shellType === "bash" ? getExportedShellFunctionEnvVars(subprocessEnv()) : [];
  let unsetEnvNames =
    scrubCredentialEnv || exportedFunctionVars.length > 0
      ? [
          ...(sandboxUnsetEnv ?? []),
          ...(scrubCredentialEnv ? listSecretEnvNames(environmentOverrides) : []),
          ...exportedFunctionVars,
        ]
      : sandboxUnsetEnv;
  let respelledEnv = scrubCredentialEnv
    ? sanitizeEnvCredentials({
        ...subprocessEnv(),
        ...environmentOverrides,
      }).respelled
    : {};
  let windowsEnvPlan =
    sandboxArgv &&
    buildEnvArgv(sandboxArgv, {
      scrubbed: scrubCredentialEnv === true,
      subprocessEnv: subprocessEnv(),
      isFromSettings: isSettingsSourcedEnvValue,
      sessionEnvVars,
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
  let usePipeMode = !!onStdout;
  let taskId = generateTaskId("local_bash");
  let taskOutput = new TaskOutput(taskId, onProgress ?? null, !usePipeMode);
  let windowsLauncher =
    shellType === "powershell" && !shouldUseSandbox && !usePipeMode && getPlatform() === "windows"
      ? await resolveUsableWindowsLauncher(
          {
            powershellPath: binShell,
            script: commandString,
            outputPath: taskOutput.path,
            cwd,
          },
          hostState,
        )
      : undefined;
  let finalSpawnFile = windowsLauncher?.file ?? spawnFile;
  let finalSpawnArgs = windowsLauncher?.args ?? windowsEnvPlan?.argv.slice(1) ?? spawnArgs;
  let outputFileHandle;
  let stdinFd;
  let spawnedChild;
  let cpuAccountWindow;
  try {
    if (!usePipeMode) {
      outputFileHandle = await openTaskOutputForAppend(taskOutput.path, "w");
      if (windowsLauncher !== undefined) {
        await outputFileHandle.close();
        outputFileHandle = undefined;
      }
    }
    if (isTerminalShutdown()) {
      try {
        await outputFileHandle?.close();
      } catch {}
      if (abortSignal.aborted) return createAbortedCommand();
      if (needsSandboxCleanup) {
        needsSandboxCleanup = false;
        sandboxCleanupSafe();
      }
      await heldUntilExit();
    }
    stdinFd = shouldUseSandbox ? await openSelfExeForSeccomp() : undefined;
    let Ri = permissionCheckedCwdOf(session) !== undefined;
    if (Ri || heldCwd !== undefined) {
      let [ta, Bs] = await Promise.all([
        Ri ? checkCwdStillValid(cwd) : "same",
        heldCwd !== undefined ? realPathOutcomeAsync(cwd) : undefined,
      ]);
      let Ca = Ri && (ta !== "same" || permissionCheckedCwdOf(session) !== cwd);
      let tu = Ca || (heldCwd !== undefined && !callFramePhysicalMatches(Bs));
      if (tu || isTerminalShutdown()) {
        if (Ca) logFeatureSad("mcp_serve_call_directory", "start_directory_changed");
        if (tu && !Ca) logFeatureSad("call_directory_hold", "changed_before_spawn");
        await closeOutputAndStdinHandles(outputFileHandle, stdinFd);
        taskOutput.clear();
        await taskOutput.deleteOutputFile();
        if (isTerminalShutdown() && !abortSignal.aborted) {
          if (needsSandboxCleanup) {
            needsSandboxCleanup = false;
            sandboxCleanupSafe();
          }
          await heldUntilExit();
        }
        return tu
          ? createFailedCommand(
              `Could not confirm that working directory "${cwd}" is the directory that this command was permission-checked in (it was deleted, moved, replaced by a link or made unreadable since, it could not be examined, or another command of the same call changed directory), so the command was not run. Re-issue the command to have it checked afresh.`,
            )
          : createAbortedCommand();
      }
    }
    if (isAbortedNow()) {
      logEvent("tengu_shell_abort_before_spawn", {
        shell_type: fromEnum(shellType),
        sandboxed: shouldUseSandbox === true,
        caller: fromEnum(caller),
      });
      await closeOutputAndStdinHandles(outputFileHandle, stdinFd);
      taskOutput.clear();
      await taskOutput.deleteOutputFile();
      return createAbortedCommand();
    }
    let Ja = useToolMemoryCgroup ? cgroupSpawnOptions(toolCgroupClass) : {};
    if (commandNetworkLists !== undefined && sandboxAttributionId !== undefined) {
      SandboxManager.registerCommandNetworkLists(sandboxAttributionId, commandNetworkLists);
      registeredNetworkListsId = sandboxAttributionId;
    }
    let Di = callTiming?.mark("external");
    let startedAt = performance.now();
    cpuAccountWindow = cpuAccountJoin && openCpuWindow(cpuAccountJoin);
    let childProcess = spawn(finalSpawnFile, finalSpawnArgs, {
      ...Ja,
      env: buildShellSpawnEnv({
        shellType,
        binShell,
        envOverrides: {
          ...environmentOverrides,
          ...respelledEnv,
          ...windowsLauncher?.env,
          ...(scrubCredentialEnv && shellType === "bash"
            ? prefixedSanitizableEnv(
                {
                  ...subprocessEnv(),
                  ...environmentOverrides,
                  ...respelledEnv,
                },
                shouldUseSandbox ? sandboxCredentialEnvVars() : {},
              )
            : {}),
          ...{},
        },
        spawnEnvPluginBinPaths: pluginBinPaths,
        sandboxEnv,
        sandboxUnsetEnv: unsetEnvNames,
        effortLevel,
        envDefaults: shellExportsForSpawn(shellType, shouldUseSandbox, scrubCredentialEnv),
        bunOptions,
        carriedCommandText,
      }),
      cwd,
      stdio: windowsLauncher
        ? DETACHED_LAUNCHER_SPAWN_OPTIONS.stdio
        : checkPathExists(provider.stdin, usePipeMode, outputFileHandle?.fd, stdinFd),
      windowsVerbatimArguments: windowsLauncher && DETACHED_LAUNCHER_SPAWN_OPTIONS.windowsVerbatimArguments,
      detached: provider.detached,
      windowsHide: true,
    });
    spawnedChild = childProcess;
    if (windowsLauncher !== undefined && childProcess.pid !== undefined)
      logFeatureOk("shell_windows_launcher");
    if (registeredNetworkListsId !== undefined) {
      let ta = registeredNetworkListsId;
      let Bs = () => SandboxManager.unregisterCommandNetworkLists(ta);
      childProcess.once("exit", Bs);
      childProcess.once("error", Bs);
      registeredNetworkListsId = undefined;
    }
    if (useToolMemoryCgroup && Ja.cgroup === undefined && isToolCgroupPending())
      parkPendingPid(toolCgroupClass, childProcess.pid);
    let Li = registerAgentProcess(owningAgentId, childProcess);
    childProcess.once("exit", Li);
    childProcess.once("error", Li);
    let Qs = wrapSpawn(
      childProcess,
      abortSignal,
      effectiveTimeout,
      taskOutput,
      shouldAutoBackground,
      undefined,
      caller,
      windowsLauncher && (() => resolveShellPidFromLauncher(childProcess.pid, binShell)),
      {
        startedAt,
        cpuTime: !useUnixSandbox || getPlatform() === "macos",
        procCpuTime:
          isRemoteManagedEnvironment() &&
          !useUnixSandbox &&
          (isBackgroundJobCommand(command) ? "background marker" : true),
        cpuAccountWindow,
      },
    );
    cpuAccountWindow = undefined;
    if (Di) Qs.result.then(Di, Di);
    let Hi = endToolExecutionSpan_2("claude_code.bash.subprocess", {
      spanType: "bash.subprocess",
      attrs: {
        "shell.type": shellType,
        command_length: command.length,
        timeout_ms: effectiveTimeout,
      },
      contentAttrs: {
        command: truncateContentForTelemetry(command).content,
      },
    });
    if (Hi) {
      let ta = getCompoundCommandPrefixesStatic_2(figSpecRegistryByHost.of(host), command).catch(() => []);
      Qs.result
        .then(async (Bs) => {
          let Ca = await ta;
          if (Ca.length > 0 && !isTracingRedacted())
            noopEndToolExecutionSpan(Hi, {
              command_prefix: Ca.map((tu) => truncateContentForTelemetry(tu).content),
            });
          noopEndToolExecutionSpan(Hi, {
            exit_code: Bs.code,
            stdout_bytes: Bs.outputFileSize ?? Buffer.byteLength(Bs.stdout),
            stderr_bytes: Buffer.byteLength(Bs.stderr),
            interrupted: Bs.interrupted,
            ...(Bs.backgroundTaskId && {
              backgrounded: true,
            }),
          });
          if (Bs.interrupted) setSpanError(Hi, `interrupted (exit ${Bs.code})`);
        })
        .catch((error) => {
          setSpanError(Hi, errorMessage(error));
        })
        .finally(() => Hi.end())
        .catch(() => {});
    }
    if (outputFileHandle !== undefined)
      try {
        await outputFileHandle.close();
      } catch {}
    if (stdinFd !== undefined)
      try {
        closeSync(stdinFd);
      } catch {}
    if (childProcess.stdout && onStdout)
      childProcess.stdout.on("data", (chunk) => {
        onStdout(typeof chunk === "string" ? chunk : chunk.toString());
      });
    let Xa = cwdFilePath;
    Qs.result = Qs.result.then(async (result) => {
      if (shouldUseSandbox) scheduleSandboxCleanup(childProcess);
      let Bs = false;
      if (result && !preventCwdChanges && !result.backgroundTaskId)
        try {
          let newCwd = (await getFsImplementation().readFileBytes(Xa, CWD_FILE_READ_BYTES))
            .toString("utf8")
            .trim();
          let tu = getPlatform() === "windows" ? posixPathToWindowsPath(newCwd) : newCwd;
          if (identity(tu) !== cwd) {
            let pd = await validateShellCwdReadback(newCwd, tu, cwd);
            if (pd === undefined) {
              Bs = true;
              logEvent("tengu_shell_set_cwd", {
                success: false,
              });
            } else if (identity(pd) !== cwd) {
              setCwd(pd, session, cwd);
              if (!hasOutermostCallFrame()) {
                invalidateSessionEnvCache();
                onCwdChanged(cwd, pd);
              }
            }
          }
        } catch {
          logEvent("tengu_shell_set_cwd", {
            success: false,
          });
        }
      if (
        childProcess.pid !== undefined &&
        childProcess.exitCode === null &&
        childProcess.signalCode === null
      )
        childProcess.once("exit", () => {
          removeCwdTrackingFile(Xa);
        });
      else await removeCwdTrackingFile(Xa);
      releaseConvergentTaskOutputBinding(taskOutput.taskId);
      if (shouldUseSandbox && getPlatform() === "windows") {
        let Ca = classifyWindowsSandboxLaunchExit(
          result.code,
          `${result.stderr}
${result.stdout}`,
        );
        if (Ca !== undefined)
          return {
            ...result,
            stderr: Ca,
          };
      }
      if (
        carriedCommandText !== undefined &&
        result.code === 126 &&
        (COMMAND_TEXT_REF_RE.test(result.stderr) || COMMAND_TEXT_REF_RE.test(result.stdout))
      ) {
        provider.stopCarryingCommandText?.();
        logFeatureBad("shell_command_text_carrier", "carrier_lost");
        return {
          ...result,
          stdout: result.stdout.replace(COMMAND_TEXT_REF_RE, COMMAND_TEXT_MISSING_MESSAGE),
          stderr: result.stderr.replace(COMMAND_TEXT_REF_RE, COMMAND_TEXT_MISSING_MESSAGE),
        };
      }
      if (carriedCommandText !== undefined) logFeatureOk("shell_command_text_carrier");
      return Bs
        ? {
            ...result,
            cwdChangeRefused: Bs,
          }
        : result;
    });
    needsSandboxCleanup = false;
    return Qs;
  } catch (error) {
    if (cpuAccountWindow !== undefined) closeCpuWindow(cpuAccountWindow);
    if (spawnedChild !== undefined && needsSandboxCleanup) {
      needsSandboxCleanup = false;
      scheduleSandboxCleanup(spawnedChild);
    }
    if (registeredNetworkListsId !== undefined)
      SandboxManager.unregisterCommandNetworkLists(registeredNetworkListsId);
    await closeOutputAndStdinHandles(outputFileHandle, stdinFd);
    taskOutput.clear();
    logForDebugging(`Shell exec error: ${errorMessage(error)}`);
    if (isE2BIG(error)) {
      let sandboxDenyPaths =
        shouldUseSandbox && getEffectiveFilesystemPolicy() !== "relaxed"
          ? (sandboxConfigOverride?.filesystem?.denyWrite ??
            SandboxManager.getFsWriteConfig().denyWithinAllow)
          : [];
      let Di = checkArgvLimits({
        binary: finalSpawnFile,
        argv: carriedCommandText === undefined ? finalSpawnArgs : [...finalSpawnArgs, carriedCommandText],
        env: {
          ...subprocessEnv(),
          SHELL: shellType === "bash" ? binShell : undefined,
          GIT_EDITOR: "true",
          ...environmentOverrides,
          ...claudeSubprocessEnv({
            sessionId: getSessionId(),
            effortLevel,
            source: "agent",
          }),
        },
        sandboxDenyPaths,
      });
      logForDebugging(Di, {
        level: "error",
      });
      return createFailedCommand(Di, "e2big");
    }
    if (spawnedChild === undefined && isDiskFullErrno(error)) {
      let errnoCode = getErrnoCode(error);
      let Di =
        errnoCode === "EDQUOT"
          ? `the user's disk quota is used up (${errnoCode})`
          : `this computer's disk is full (${errnoCode})`;
      return createFailedCommand(
        `The command was not started: ${Di} on the volume holding ${join(tmpdir(), claudeTempDirName())} (Claude Code's temporary directory), so the file that captures command output could not be created there and nothing ran. ${DISK_FULL_ADVICE}`,
      );
    }
    return createFailedCommand(errorMessage(error));
  }
}
//@ chunk-e6aww6q8.js:3093643-3093682 placement
/**
 * 把 cwd 参数解析成绝对真实路径（只取 path 字段）。
 */
function resolvePhysicalCwd(path, n) {
  return resolveCwd(path, n).path;
}
//@ chunk-e6aww6q8.js:3093682-3093839 placement
/**
 * 相对路径基于给定目录或当前 cwd 解析，再 realpath；目录不存在抛 MissingWorkingDirectoryError，其他错误返回 {path, verified:false}。
 */
function resolveCwd(path, n) {
  let r = isAbsolute(path) ? path : resolve_2(n || getFsImplementation().cwd(), path);
  try {
    return {
      path: realpathExaminedSync(getFsImplementation(), r),
      verified: true,
    };
  } catch (error) {
    if (isENOENT(error)) throw new MissingWorkingDirectoryError(r);
    return {
      path: r,
      verified: false,
    };
  }
}
//@ chunk-e6aww6q8.js:3093839-3093968 placement = setCwd (0.53)
/**
 * 工作目录不存在时抛出的错误类，带 path 字段。
 */
class MissingWorkingDirectoryError extends Error {
  path;
  name = "MissingWorkingDirectoryError";
  constructor(e) {
    super(`Path "${e}" does not exist`);
    this.path = e;
  }
}
//@ chunk-e6aww6q8.js:3093968-3094030 placement
/**
 * 按会话根保存 {pinned} 状态（工作目录缺失时的钉住标记）；被钉住的会话 cwd 消失时 exec 不回退到别的目录。
 */
var missingWorkingDirectoryPins = new SessionRootSlot(() => ({
  pinned: false,
}));
var permissionCheckedCwds = new SessionRootSlot(() => new WeakMap());
//@ chunk-e6aww6q8.js:3094030-3094087 placement
/**
 * 取该会话在权限检查时记录的 cwd（按会话根的 WeakMap）；exec 在 spawn 前后比对，目录被替换/删除则拒绝执行。
 */
function permissionCheckedCwdOf(session) {
  return session?.root && permissionCheckedCwds.peek(session.root)?.get(session);
}
//@ chunk-e6aww6q8.js:3094087-3094147 placement
function pathAncestors(e) {
  let n = dirname(e);
  return n === e ? [e] : [...pathAncestors(n), e];
}
//@ chunk-e6aww6q8.js:3094147-3094521 placement
/**
 * 工作目录是否仍存在（same/lost/unknown）。
 */
async function checkCwdStillValid(cwd) {
  if (resolve_2(cwd) !== cwd) return "lost";
  let results = await Promise.all(
    pathAncestors(cwd).map((r) =>
      lstat(r).then(
        (s) => (s.isDirectory() ? "same" : "lost"),
        (error) => {
          let h = getErrnoCode(error) ?? "";
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
  let s = isAbsolute(e) ? e : resolve_2(r || getFsImplementation().cwd(), e);
  let h = await n.hostFiles.realPath(PathSpace.workspace(s));
  if (!h.ok)
    return {
      path: s,
      verified: false,
    };
  if (!h.value.found) throw new MissingWorkingDirectoryError(s);
  return {
    path: identity(h.value.path),
    verified: true,
  };
}
//@ chunk-e6aww6q8.js:3094742-3094777 placement
function setCwd(path, session, cwd) {
  applyNewCwd(resolveCwd(path, cwd), session);
}
//@ chunk-e6aww6q8.js:3094777-3094982 placement
/**
 * chdir 后调用 setCwd；setCwd 拒绝时尝试切回原目录再抛出错误。
 */
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
        {
          level: "error",
        },
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
  n?.setCwd(e.path);
  setCwdForCallChain(e.path);
  let root = n?.root;
  if (e.verified && root !== undefined && root === n) {
    let s = missingWorkingDirectoryPins.peek(root);
    if (s !== undefined) s.pinned = false;
  }
  try {
    logEvent("tengu_shell_set_cwd", {
      success: true,
    });
  } catch (error) {}
}
//@ chunk-e6aww6q8.js:3095227-3095254 placement
function registerSandboxWriteDirectory(worktreePath, n) {
  addSandboxAllowWriteDirectory(worktreePath, n);
}
//@ chunk-e6aww6q8.js:3095254-3095277 placement
function unregisterSandboxWriteDirectory(e) {
  removeSandboxAllowWriteDirectory(e);
}
//@ chunk-e6aww6q8.js:3095277-3095399 placement
async function retryWithoutSignalOnAbort(e, abortSignal, isAbortedNow) {
  try {
    return await e(abortSignal);
  } catch (error) {
    if (!abortSignal.aborted || error !== abortSignal.reason) throw error;
    return isAbortedNow() ? undefined : e(undefined);
  }
}
//@ chunk-e6aww6q8.js:3095399-3095484 placement
async function closeOutputAndStdinHandles(outputFileHandle, stdinFd) {
  try {
    await outputFileHandle?.close();
  } catch {}
  if (stdinFd !== undefined)
    try {
      closeSync(stdinFd);
    } catch {}
}
//@ chunk-e6aww6q8.js:3095484-3095605 placement
function sandboxCleanupSafe(e, n) {
  try {
    SandboxManager.cleanupAfterCommand(e, n);
  } catch (error) {
    logForDebugging(`sandbox cleanupAfterCommand failed: ${error}`, {
      level: "warn",
    });
  }
}
//@ chunk-e6aww6q8.js:3095605-3095716 placement
function sandboxScrubSafe() {
  try {
    SandboxManager.scrubAfterCommand();
  } catch (error) {
    logForDebugging(`sandbox scrubAfterCommand failed: ${error}`, {
      level: "warn",
    });
  }
}
//@ chunk-e6aww6q8.js:3095716-3096062 placement
/**
 * 子进程退出后再做沙箱清理（先擦除，快照扫描路径）。
 */
function scheduleSandboxCleanup(e) {
  if (e.pid === undefined || e.exitCode !== null || e.signalCode !== null) {
    sandboxCleanupSafe();
    return;
  }
  if (isTerminalShutdown()) {
    sandboxScrubSafe();
    return;
  }
  try {
    let n = SandboxManager.snapshotBareGitRepoScrubPaths();
    let r = SandboxManager.snapshotSymlinkedDenyScrubPaths();
    sandboxScrubSafe();
    let s = false;
    let h = () => {
      if (!s) {
        s = true;
        sandboxCleanupSafe(n, r);
      }
    };
    e.once("exit", h);
    e.once("error", h);
  } catch (error) {
    logForDebugging(`sandbox deferred-cleanup setup failed: ${error}`, {
      level: "warn",
    });
  }
}
//@ chunk-e6aww6q8.js:3096062-3096198 placement
async function removeCwdTrackingFile(e) {
  try {
    await getFsImplementation().unlink(e);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to remove shell cwd-tracking file: ${errorMessage(error)}`, {
        level: "warn",
      });
  }
}
//@ chunk-e6aww6q8.js:3096198-3096269 placement
function shellExportsForSpawn(shellType, shouldUseSandbox, scrubCredentialEnv) {
  return shellType === "bash" && !shouldUseSandbox && !scrubCredentialEnv
    ? shellEnvSnapshot().shellExports
    : undefined;
}
//@ chunk-e6aww6q8.js:3096269-3096725 placement
/**
 * 构造 shell 子进程环境：默认值、SHELL（bash 时）、GIT_EDITOR=true、覆盖项、沙箱 env、会话/effort 标识；删除沙箱要求移除的变量，把插件 bin 目录拼进 PATH，带上 BUN_OPTIONS 与命令文本承载变量。
 */
function buildShellSpawnEnv({
  shellType,
  binShell,
  envOverrides,
  spawnEnvPluginBinPaths = [],
  sandboxEnv,
  sandboxUnsetEnv,
  effortLevel,
  envDefaults,
  bunOptions,
  carriedCommandText,
}) {
  let q = {
    ...subprocessEnv(envDefaults),
    SHELL: shellType === "bash" ? binShell : undefined,
    GIT_EDITOR: "true",
    ...envOverrides,
    ...sandboxEnv,
    ...claudeSubprocessEnv({
      sessionId: getSessionId(),
      effortLevel,
      source: "agent",
    }),
    ...(sandboxUnsetEnv && Object.fromEntries(sandboxUnsetEnv.map((Z) => [Z, undefined]))),
  };
  Object.assign(q, getPluginPathEnv(q, spawnEnvPluginBinPaths, delimiter));
  if (bunOptions !== undefined) {
    setBunOptions(q, bunOptions);
    if (shellType === "bash") q[BUN_OPTIONS_CARRIER_VAR] = bunOptions;
  }
  if (carriedCommandText !== undefined) q[COMMAND_TEXT_VAR] = carriedCommandText;
  return q;
}
//@ chunk-e6aww6q8.js:3096813-3096993 placement
function sandboxCredentialEnvVars() {
  let envVars = SandboxManager.getConfig()?.credentials?.envVars ?? [];
  return {
    denied: envVars.filter((envVar) => envVar.mode === "deny").map((envVar) => envVar.name),
    masked: envVars.filter((envVar) => envVar.mode !== "deny").map((envVar) => envVar.name),
  };
}
//@ chunk-e6aww6q8.js:3096993-3097020 placement
var perCommandDenyUnenforcedSaid = new HostScoped(() => new Set());
//@ chunk-s61vbvea.js:52893-53070 fingerprint = isExecutable (0.639)
/**
 * 判断 shell 路径可执行：先 access X_OK，失败时（非 Windows 绝对路径的特定错误直接 false）再跑 `--version` 看退出码。
 */
async function isExecutable(shellPath) {
  try {
    accessSync(shellPath, constants.X_OK);
    return true;
  } catch (error) {
    if (getPlatform() !== "windows" && isAbsolute(shellPath) && isPathAbsent(error)) return false;
    let { code } = await execFileNoThrow(shellPath, ["--version"], {
      timeout: 1000,
      useCwd: false,
    });
    return code === 0;
  }
}
//@ chunk-s61vbvea.js:53070-53411 fingerprint = findSuitableShell (0.774)
/**
 * 生成候选 shell 列表：CLAUDE_CODE_SHELL、SHELL（含 bash/zsh 的）、which 结果，以及 /bin、/usr/bin、/usr/local/bin、/opt/homebrew/bin 下的 bash/zsh；SHELL 含 bash 时 bash 优先。
 */
function getShellCandidates(zshPath, bashPath) {
  let filtered = [env.CLAUDE_CODE_SHELL, env.SHELL].filter(
    (R) => R !== undefined && (R.includes("bash") || R.includes("zsh")),
  );
  let preferBash = env.SHELL?.includes("bash");
  let shellPaths = ["/bin", "/usr/bin", "/usr/local/bin", "/opt/homebrew/bin"];
  let shellOrder = preferBash ? ["bash", "zsh"] : ["zsh", "bash"];
  let [S, w] = preferBash ? [bashPath, zshPath] : [zshPath, bashPath];
  return [
    ...filtered,
    S,
    ...shellOrder.flatMap((shell) => shellPaths.map((path) => `${path}/${shell}`)),
    w,
  ].filter((shell) => shell !== null);
}
//@ chunk-s61vbvea.js:53411-53902 placement
/**
 * 依次探测候选 shell 取第一个可执行的；CLAUDE_CODE_SHELL 无效时记日志回退；都没有则抛 "No suitable shell found"。
 */
async function findSuitableShell() {
  let [zshPath, bashPath] = await Promise.all([whichAsync("zsh"), whichAsync("bash")]);
  let r;
  for (let h of getShellCandidates(zshPath, bashPath))
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
    logForDebugging(h, {
      level: "error",
    });
    throw Error(h);
  }
  return r;
}
//@ chunk-s61vbvea.js:53902-54029 placement
/**
 * PATH 上可用的 zsh/bash。
 */
function findShellOnPath() {
  if (isDisklessSession()) return;
  return getShellCandidates(bunWhichSync("zsh"), bunWhichSync("bash")).find((e) => {
    try {
      return bunWhichOnPath(e, env.PATH ?? "") !== null;
    } catch {
      return false;
    }
  });
}
//@ chunk-s61vbvea.js:54029-54073 placement
/**
 * 确保磁盘会话可用后返回本机缓存解析出的 Bash 工具 shell 路径。
 */
async function resolveBashToolShellWithHost() {
  assertProgramLaunchAllowed();
  return resolveBashToolShell(shellPaths());
}
//@ chunk-s61vbvea.js:54073-54228 placement
/**
 * 解析并缓存 Bash 工具使用的 shell。
 */
function resolveBashToolShell(e) {
  e.bashToolShellPath ??= findSuitableShell().then(
    (suitableShell) => {
      e.resolvedBashToolShellPath = suitableShell;
      return suitableShell;
    },
    (error) => {
      e.bashToolShellPath = null;
      throw error;
    },
  );
  return e.bashToolShellPath;
}
export {
  findShellOnPath,
  setCwd,
  registerSandboxWriteDirectory,
  unregisterSandboxWriteDirectory,
  exec,
  resolvePhysicalCwd,
  figSpecRegistryByHost,
  setCwdV5,
  MissingWorkingDirectoryError,
  missingWorkingDirectoryPins,
  permissionCheckedCwds,
  chdirAndSetCwd,
  invalidateShellSnapshotIfPluginBinsChanged,
  resolveBashToolShellWithHost,
  getExecutorShellForAnalytics,
  isWorktreeConfigPath,
  perCommandDenyUnenforcedSaid,
  safeSessionIdForSnapshot,
  buildShellSpawnEnv,
};
