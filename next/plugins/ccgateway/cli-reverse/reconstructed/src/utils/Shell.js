/**
 * utils/Shell.ts
 *
 * Shell 命令执行入口 exec：选择 bash/PowerShell 提供者、校验并恢复工作目录、按需套沙箱、spawn 子进程并跟踪 cwd 变化；另含可用 shell 探测。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/Shell.ts
 * pieces: chunk-5d1nwe9e.js (6), chunk-5xgkngpb.js (40)
 * attribution: fingerprint 4, placement 42
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { accessSync, constants, closeSync } from "fs";
import { isAbsolute, join, resolve as resolve_2, dirname, delimiter } from "path";
import { homedir } from "os";
import { realpath, lstat } from "fs/promises";
import { spawn } from "child_process";
import { getPlatform } from "./platform.js";
import { isPathAbsent, errorMessage, isE2BIG, isDiskFullErrno, getErrnoCode, isENOENT } from "./errors.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { env, normalizeShellNameForAnalytics } from "./env.js";
import { whichAsync, bunWhichSync, bunWhichOnPath } from "./which.js";
import { logForDebugging } from "./debug.js";
import { isDisklessSession, assertProgramLaunchAllowed } from "./disklessSession.js";
import { shellPaths } from "./shell/shellPaths.js";
import { alwaysFalseHintGate, MESSAGE_ID_RE, TOOL_USE_ID_RE, SAFE_ID_TOKEN_RE } from "./claudeCodeHints.js";
import { HostScoped } from "./hostScoped.js";
import { FigSpecRegistry } from "./bash/registry.js";
import {
  getFsImplementation,
  findIntermediateUncJunction,
  realpathExaminedSync,
  processChdir,
} from "./fsOperations.js";
import { hasDotSegment, isDevicePrefixPath, isForeignNetworkPath, identity } from "./pathClassification.js";
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
import { logError } from "./log.js";
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
import { generateTaskId } from "../Task.js";
import {
  proxyCredentialHelpers,
  applyFsPolicyOverrides,
  warnPerCommandDenyUnenforced,
  materializeDenyDirectories,
  needsNetworkScreen,
} from "./sandbox/perCommandDeny.js";
import {
  unboundTaskOutputPath,
  openTaskOutputForAppend,
  releaseConvergentTaskOutputBinding,
} from "./task/diskOutput.js";
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
import { withSturdyLanternOff } from "./bash/bashReadingFlags.js";
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
import { TaskOutput } from "./task/TaskOutput.js";
import {
  resolveUsableWindowsLauncher,
  DETACHED_LAUNCHER_SPAWN_OPTIONS,
  resolveShellPidFromLauncher,
} from "./shell/windowsShellLauncher.js";
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
import { regExp_15, shellTooOldReason } from "./shell/bashVersionRefusal.js";
import { checkArgvLimits } from "./shell/argvLimits.js";
import { claudeSubprocessEnv } from "./claudeSubprocessEnv.js";
import { DISK_FULL_ADVICE } from "./shell/diskSpaceWarning.js";
import { PathSpace } from "./resultError.js";
import { shellEnvSnapshot } from "./shell/shellEnvSnapshot.js";
import { getPluginPathEnv } from "./bash/ShellSnapshot.js";
import { setBunOptions } from "./permissions/protectedSettingsPaths.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5d1nwe9e.js:754-927 fingerprint (2.1.88 match: isExecutable, 0.639)
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
//@ chunk-5d1nwe9e.js:927-1267 fingerprint (2.1.88 match: findSuitableShell, 0.774)
/**
 * 生成候选 shell 列表：CLAUDE_CODE_SHELL、SHELL（含 bash/zsh 的）、which 结果，以及 /bin、/usr/bin、/usr/local/bin、/opt/homebrew/bin 下的 bash/zsh；SHELL 含 bash 时 bash 优先。
 */
function getShellCandidates(zshPath, bashPath) {
  let filtered = [env.CLAUDE_CODE_SHELL, env.SHELL].filter(
    (shellEnv) => shellEnv !== undefined && (shellEnv.includes("bash") || shellEnv.includes("zsh")),
  );
  let preferBash = env.SHELL?.includes("bash");
  let shellPaths = ["/bin", "/usr/bin", "/usr/local/bin", "/opt/homebrew/bin"];
  let shellOrder = preferBash ? ["bash", "zsh"] : ["zsh", "bash"];
  let [firstPath, secondPath] = preferBash ? [bashPath, zshPath] : [zshPath, bashPath];
  return [
    ...filtered,
    firstPath,
    ...shellOrder.flatMap((shell) => shellPaths.map((path) => `${path}/${shell}`)),
    secondPath,
  ].filter((shell) => shell !== null);
}
//@ chunk-5d1nwe9e.js:1267-1755 placement
/**
 * 依次探测候选 shell 取第一个可执行的；CLAUDE_CODE_SHELL 无效时记日志回退；都没有则抛 "No suitable shell found"。
 */
async function findSuitableShell() {
  let [zshPath, bashPath] = await Promise.all([whichAsync("zsh"), whichAsync("bash")]);
  let foundShell;
  for (let candidate of getShellCandidates(zshPath, bashPath))
    if (await isExecutable(candidate)) {
      foundShell = candidate;
      break;
    }
  let CLAUDE_CODE_SHELL = env.CLAUDE_CODE_SHELL;
  if (CLAUDE_CODE_SHELL)
    logForDebugging(
      foundShell === CLAUDE_CODE_SHELL
        ? `Using shell override: ${CLAUDE_CODE_SHELL}`
        : `CLAUDE_CODE_SHELL="${CLAUDE_CODE_SHELL}" is not a valid bash/zsh path, falling back to detection`,
    );
  if (!foundShell) {
    let message =
      "No suitable shell found. Claude CLI requires a Posix shell environment. Please ensure you have a valid shell installed and the SHELL environment variable set.";
    logForDebugging(message, {
      level: "error",
    });
    throw Error(message);
  }
  return foundShell;
}
//@ chunk-5d1nwe9e.js:1755-1881 placement
/**
 * PATH 上可用的 zsh/bash。
 */
function findShellOnPath() {
  if (isDisklessSession()) return;
  return getShellCandidates(bunWhichSync("zsh"), bunWhichSync("bash")).find((candidate) => {
    try {
      return bunWhichOnPath(candidate, env.PATH ?? "") !== null;
    } catch {
      return false;
    }
  });
}
//@ chunk-5d1nwe9e.js:1881-1925 placement
/**
 * 确保磁盘会话可用后返回本机缓存解析出的 Bash 工具 shell 路径。
 */
async function resolveBashToolShellWithHost() {
  assertProgramLaunchAllowed();
  return resolveBashToolShell(shellPaths());
}
//@ chunk-5d1nwe9e.js:1925-2079 placement
/**
 * 解析并缓存 Bash 工具使用的 shell。
 */
function resolveBashToolShell(hostState) {
  hostState.bashToolShellPath ??= findSuitableShell().then(
    (suitableShell) => {
      hostState.resolvedBashToolShellPath = suitableShell;
      return suitableShell;
    },
    (error) => {
      hostState.bashToolShellPath = null;
      throw error;
    },
  );
  return hostState.bashToolShellPath;
}
//@ chunk-5xgkngpb.js:3110380-3110575 placement
function buildShellSessionLabel(attributionMessageId, sandboxAttributionId) {
  if (!alwaysFalseHintGate()) return;
  let replaced = sandboxAttributionId?.replaceAll(":", "-");
  let filtered = [
    attributionMessageId !== undefined && MESSAGE_ID_RE.test(attributionMessageId)
      ? attributionMessageId
      : undefined,
    replaced !== undefined && TOOL_USE_ID_RE.test(replaced) ? replaced : undefined,
  ].filter((part) => part !== undefined);
  return filtered.length > 0 ? filtered.join("-") : undefined;
}
//@ chunk-5xgkngpb.js:3110575-3110636 placement
function safeSessionIdForSnapshot(sessionId) {
  if (!alwaysFalseHintGate()) return;
  return SAFE_ID_TOKEN_RE.test(sessionId) ? sessionId : undefined;
}
//@ chunk-5xgkngpb.js:3125070-3125097 placement
/**
 * 按宿主缓存的 Fig 命令 spec 注册表，供命令前缀推断使用。
 */
var figSpecRegistryByHost; // deferred: uses FigSpecRegistry (./bash/registry.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3125070", () => {
  figSpecRegistryByHost = new HostScoped(() => new FigSpecRegistry());
});
//@ chunk-5xgkngpb.js:3158627-3159753 placement
/**
 * 校验 shell 读回的当前目录：拒绝含 ./..、NT 设备路径、网络路径的结果。
 */
async function validateShellCwdReadback(newCwd, reportedCwd, cwd) {
  let fsImplementation = getFsImplementation();
  if (newCwd.length === 0) return;
  let isWindows = getPlatform() === "windows";
  if (!isWindows) {
    newCwd = newCwd.replace(/^\/+/, "/");
    reportedCwd = reportedCwd.replace(/^\/+/, "/");
  }
  for (let candidate of [newCwd, reportedCwd]) {
    if (hasDotSegment(candidate)) {
      logForDebugging("shell cwd read-back contains a dot-segment; ignoring", {
        level: "warn",
      });
      return;
    }
    if (isDevicePrefixPath(candidate)) {
      logForDebugging("shell cwd read-back is an NT-namespace device path; ignoring", {
        level: "warn",
      });
      return;
    }
    if (isWindows && isNonWslUncPath(candidate) && isForeignNetworkPath(candidate, cwd)) {
      logForDebugging("shell cwd read-back is a network path; ignoring", {
        level: "warn",
      });
      return;
    }
    if (isNetDir(candidate)) {
      logForDebugging("shell cwd read-back is the bare automount map root; ignoring", {
        level: "warn",
      });
      return;
    }
    if (isForeignMountPath(candidate, cwd)) {
      logForDebugging("shell cwd read-back crosses a foreign automount host; ignoring", {
        level: "warn",
      });
      return;
    }
  }
  if (!isAbsolute(reportedCwd)) {
    logForDebugging("shell cwd read-back is not an absolute path; ignoring", {
      level: "warn",
    });
    return;
  }
  if (
    findIntermediateUncJunction(fsImplementation, reportedCwd, {
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
    if (!(await fsImplementation.stat(reportedCwd)).isDirectory()) {
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
  return reportedCwd;
}
//@ chunk-5xgkngpb.js:3161933-3161973 placement
var DEFAULT_SHELL_TIMEOUT_MS = 1800000;
var POSIX_SHELL_PATH = "/bin/sh";
var CWD_FILE_READ_BYTES = 65536;
//@ chunk-5xgkngpb.js:3161973-3162097 placement
async function createBashProvider(hostState, options) {
  let shellPath = await resolveBashToolShell(hostState);
  let pluginBinPaths = await pluginBinPathsSafe(options);
  return {
    provider: await createBashShellProvider(shellPath, {
      pluginBinPaths,
    }),
    pluginBinPaths,
  };
}
//@ chunk-5xgkngpb.js:3162097-3162238 placement
async function pluginBinPathsSafe(options) {
  try {
    return await getEnabledPluginBinPaths(options);
  } catch (error) {
    logForDebugging(`Shell: leaving plugin bin/ dirs off PATH: ${errorMessage(error)}`, {
      level: "warn",
    });
    logError(error);
    return [];
  }
}
//@ chunk-5xgkngpb.js:3162238-3162285 placement
async function getShellConfig(options) {
  assertProgramLaunchAllowed();
  return getOrCreateShellConfig(shellPaths(), options);
}
//@ chunk-5xgkngpb.js:3162285-3162349 placement
/**
 * 惰性创建并缓存 shell 配置（选择 shell 提供者与快照的 Promise）。
 */
function getOrCreateShellConfig(hostState, options) {
  hostState.shellConfig ??= createBashProvider(hostState, options);
  return hostState.shellConfig;
}
//@ chunk-5xgkngpb.js:3162349-3162452 placement
/**
 * 取当前执行用 shell 的分析标签（按 shellPath 归类），失败返回 none。
 */
async function getExecutorShellForAnalytics(storageV5) {
  try {
    let { provider } = await getShellConfig(storageV5);
    return normalizeShellNameForAnalytics(provider.shellPath);
  } catch {
    return lit_2("none");
  }
}
//@ chunk-5xgkngpb.js:3162452-3162491 placement
var SHELL_CONFIG_PENDING; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3162452", () => {
  SHELL_CONFIG_PENDING = Symbol("shell config pending");
});
//@ chunk-5xgkngpb.js:3162491-3163191 placement
/**
 * 插件刷新后决定是否丢弃 shell 快照：配置仍在构建、快照不可用或插件 bin/ PATH 变了就清掉缓存的 shellConfig（下次 Bash 重建），否则保留；返回是否丢弃。
 */
async function invalidateShellSnapshotIfPluginBinsChanged(options) {
  let hostState = shellPaths();
  hostState.powerShellPluginBinPaths = null;
  let shellConfig = hostState.shellConfig;
  if (shellConfig === null) return false;
  let keptReason = null;
  let dropReason = "plugin bin/ PATH entries changed";
  try {
    let winner = await Promise.race([shellConfig, Promise.resolve(SHELL_CONFIG_PENDING)]);
    if (winner === SHELL_CONFIG_PENDING) dropReason = "its config was still being built";
    else if ((await winner.provider.isSnapshotUsable?.()) === false)
      dropReason = "its snapshot failed or is missing";
    else if (arraysEqual(winner.pluginBinPaths, await getEnabledPluginBinPaths(options)))
      keptReason = "plugin bin/ PATH entries unchanged";
  } catch {
    dropReason = "its config or the plugin bin/ read failed";
  }
  if (keptReason !== null) {
    logForDebugging(`Shell snapshot kept across plugin refresh: ${keptReason}`);
    return false;
  }
  if (hostState.shellConfig !== shellConfig) return false;
  hostState.shellConfig = null;
  logForDebugging(`Shell snapshot dropped on plugin refresh (${dropReason}); the next Bash exec rebuilds it`);
  return true;
}
//@ chunk-5xgkngpb.js:3163191-3163262 placement
function arraysEqual(pluginBinPaths, enabledPluginBinPaths) {
  return (
    pluginBinPaths.length === enabledPluginBinPaths.length &&
    pluginBinPaths.every((path, index) => path === enabledPluginBinPaths[index])
  );
}
//@ chunk-5xgkngpb.js:3163262-3163410 fingerprint (2.1.88 match: getPsProvider, 0.784)
/**
 * 惰性创建并缓存（存于宿主状态 powerShellProvider）PowerShell 提供者：先 getCachedPowerShellPath 找 pwsh/powershell，找不到抛 "PowerShell is not available"。
 */
function getPsProviderForHostState(hostState) {
  hostState.powerShellProvider ??= getCachedPowerShellPath().then((psPath) => {
    if (!psPath) throw Error("PowerShell is not available");
    return createPowerShellProvider(psPath);
  });
  return hostState.powerShellProvider;
}
//@ chunk-5xgkngpb.js:3163410-3163478 fingerprint (2.1.88 match: resolveProvider, 1)
/**
 * shellType → 提供者获取函数表：bash 走 getBashProviderForHost(RTn) 取 .provider，powershell 走 getPsProvider。
 */
var resolveProvider = {
  bash: async (hostState, options) => (await getOrCreateShellConfig(hostState, options)).provider,
  powershell: getPsProviderForHostState,
};
//@ chunk-5xgkngpb.js:3163478-3180005 placement (2.1.88 match: exec, 0.194)
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
    tailInput,
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
    let tempDir = claudeTempDir();
    if (sandboxTmpDir !== tempDir) {
      hostState.warnedShortTmpDir = true;
      logForDebugging(
        `CLAUDE_CODE_TMPDIR makes the per-uid temp dir ${Buffer.byteLength(tempDir)} bytes, too long for AF_UNIX sockets; child-process $TMPDIR falls back to ${sandboxTmpDir}. ` +
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
    let envForBun = {
      ...subprocessEnv(shellExportsForSpawn(shellType, shouldUseSandbox, scrubCredentialEnv)),
    };
    if (scrubCredentialEnv || shouldUseSandbox) {
      let { denied, masked } = shouldUseSandbox
        ? sandboxCredentialEnvVars()
        : {
            denied: [],
            masked: [],
          };
      let scrubbedNames = new Set(
        [...(scrubCredentialEnv ? listSecretEnvNames(envForBun) : []), ...denied, ...masked].map((varName) =>
          varName.toUpperCase(),
        ),
      );
      for (let key of Object.keys(envForBun)) if (scrubbedNames.has(key.toUpperCase())) delete envForBun[key];
    }
    bunOptions = bunOptionsFor(envForBun);
  }
  let filePath = generateTaskId("local_bash");
  let {
    commandString: builtCommand,
    cwdFilePath,
    cpuAccountJoin,
    carriedCommandText,
    takesTailInput,
    refusedBeforeBash,
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
    tailInput:
      tailInput === undefined || shouldUseSandbox || getPlatform() === "windows"
        ? undefined
        : {
            path: tailInput.path,
            outputPath: unboundTaskOutputPath(filePath),
          },
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
    let isolationTarget = hasHostWorktreeDeclaration()
      ? agentWorktree
      : stripControlCharsForMessage(isolationRoot_2 ?? agentWorktree);
    return createFailedCommand(
      `The working-directory isolation context for this agent was lost, so this command would run in the parent session's directory instead of this agent's worktree (${isolationTarget}). Refusing to run it. Retry the command; if this keeps failing, report that worktree isolation was lost.`,
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
    let recoveryCandidates = [getOriginalCwd(), homedir(), tmpdir()];
    let recoveredCwd = null;
    let recoveredIndex = -1;
    for (let [candidateIndex, candidate] of recoveryCandidates.entries())
      try {
        recoveredCwd = await realpath(candidate);
        recoveredIndex = candidateIndex;
        break;
      } catch {}
    if (recoveredCwd === null)
      return createFailedCommand(
        `Working directory "${cwd}" no longer exists. Please restart Claude from an existing directory.`,
      );
    let worktreeIsolated = agentWorktree || isolationRoot_2 ? hasHostWorktreeDeclaration() : false;
    if (worktreeIsolated && agentWorktree && recoveredIndex === 0) {
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
      !worktreeIsolated &&
      isolationRoot_2 &&
      recoveredIndex === 0 &&
      (agentWorktree || BLOCKED_CWD_MESSAGES(recoveredCwd, isolationRoot_2) !== null)
    ) {
      logForDebugging(
        `[worktree] blocked shell exec: cwd "${cwd}" is gone and recovery targets "${recoveredCwd}" outside the isolation worktree ${isolationRoot_2}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_worktree_cwd_escape_blocked", {
        reason: lit_2("worktree_gone"),
      });
      return createFailedCommand(
        `${isolationSubjectWords(isolationRoot_2).noun} is isolated in the worktree ${stripControlCharsForMessage(isolationRoot_2)}, but its working directory "${stripControlCharsForMessage(cwd)}" no longer exists and the recovery target (${stripControlCharsForMessage(recoveredCwd)}) is outside that worktree. Refusing to run there. Report this instead of retrying.`,
      );
    }
    if (session?.root !== undefined && missingWorkingDirectoryPins.peek(session.root)?.pinned === true) {
      logForDebugging(
        `Shell CWD "${cwd}" no longer exists and the session is pinned to it; not recovering to "${recoveredCwd}"`,
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
    logForDebugging(`Shell CWD "${cwd}" no longer exists, recovering to "${recoveredCwd}"`);
    let cwd_2 = callFrameRecoversIfGone();
    session?.setCwd(recoveredCwd);
    setCwdForCallChain(recoveredCwd);
    if (permissionCheckedCwdOf(session) !== undefined) {
      logFeatureSad("mcp_serve_call_directory", "start_directory_gone");
      return createFailedCommand(
        `Working directory "${cwd}" is gone (deleted, moved, replaced by a link, or unreadable), so this command was not run. Shell cwd recovered to "${recoveredCwd}": re-issue the command if it still makes sense there.`,
      );
    }
    if (heldCwd !== undefined && !cwd_2) {
      logFeatureSad("call_directory_hold", "gone");
      return createFailedCommand(
        `Working directory "${cwd}" no longer exists, so this command was not run. Shell cwd recovered to "${recoveredCwd}": re-issue the command if it still makes sense there.`,
      );
    }
    if (recoveredIndex > 0)
      return createFailedCommand(
        `Working directory "${cwd}" was deleted; shell cwd recovered to "${recoveredCwd}". Re-issue your command (it will run from the recovered directory).`,
      );
    cwd = recoveredCwd;
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
    let blockedMessage = BLOCKED_CWD_MESSAGES(cwd, isolationRoot_2);
    if (blockedMessage) {
      logForDebugging(
        `[worktree] blocked shell exec outside isolation worktree: cwd=${cwd} isolationRoot=${isolationRoot_2}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_worktree_cwd_escape_blocked", {
        reason: lit_2("shared_checkout"),
      });
      return createFailedCommand(blockedMessage);
    }
    let guardRefusal =
      shellType === "bash"
        ? await withSturdyLanternOff(async () =>
            (
              await import("../tools/BashTool/bgWorktreeGuard/bgWorktreeCommandGuard.js")
            ).checkBgWorktreeCommandGuard(
              (parsedCommand = await parseForSecurity(command)),
              command,
              cwd,
              isolationRoot_2,
            ),
          )
        : null;
    if (guardRefusal) {
      logForDebugging(
        `[worktree] blocked shell exec: command guard refused (${guardRefusal}): cwd=${cwd} isolationRoot=${isolationRoot_2}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_worktree_cwd_escape_blocked", {
        reason: lit_2("command_redirect"),
      });
      return createFailedCommand(guardRefusal);
    }
  }
  let binShell = provider.shellPath;
  let useUnixSandbox = (shouldUseSandbox ?? false) && !isWindowsSandbox;
  let sandboxInnerShell = useUnixSandbox && shellType === "powershell" ? POSIX_SHELL_PATH : binShell;
  if (isScrubEnabled()) {
    let parsedForCaps = parsedCommand ?? (await withSturdyLanternOff(() => parseForSecurity(command)));
    enforceScriptCaps(
      parsedForCaps.kind === "simple"
        ? parsedForCaps.commands.map((command) => command.text).join(`
`)
        : command,
    );
  }
  let sandboxConfigOverride;
  let sandboxArgv;
  let sandboxEnv;
  let sandboxUnsetEnv;
  let unwrappedCommand;
  let requireConfinement = async (requireConfinement) => {
    let posture =
      !shouldUseSandbox || getEffectiveFilesystemPolicy() !== "strict" || isScrubEnabled()
        ? {
            confined: false,
            reason: "sandbox_unconfined",
          }
        : await ensureDeviceSandboxPosture();
    if (posture.confined) return;
    logFeatureSad("sandbox_exec", requireConfinement);
    throw new SandboxPolicyRefusalError(
      "This call must run inside a fully confining sandbox and none is available here; the command was not run.",
      posture.reason,
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
    let commandKey = {
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
            keepBaseDenyWrite: (deniedPath, baseDenyWrites) =>
              baseDenyWrites.some((baseDenyPath) => posixCovers(baseDenyPath, deniedPath)) &&
              !denyWrite.some((denyWritePath) => posixCovers(denyWritePath, deniedPath)),
          },
        ),
      };
    }
    let baseFilesystem = hasPerCommandDenies
      ? (sandboxConfigOverride?.filesystem ?? SandboxManager.getConfig()?.filesystem)
      : undefined;
    let perCommandDeniesEnforced =
      baseFilesystem !== undefined &&
      baseFilesystem.disabled !== true &&
      getEffectiveFilesystemPolicy() === "strict";
    if (hasPerCommandDenies && !perCommandDeniesEnforced)
      warnPerCommandDenyUnenforced(host, baseFilesystem === undefined ? "no_config" : "relaxed_filesystem");
    if (hasPerCommandDenies && perCommandDeniesEnforced) {
      await materializeDenyDirectories([...sandboxDenyRead, ...sandboxDenyWrite]);
      let mapped = sandboxDenyRead.map(stripTrailingSlashIfLong);
      let mapped_2 = sandboxDenyWrite.map(stripTrailingSlashIfLong);
      let denyPaths = [...mapped, ...mapped_2];
      let screenMemo = new Map();
      let filesystemPolicy = applyFsPolicyOverrides(
        {
          ...baseFilesystem,
          allowRead: baseFilesystem.allowRead ?? SandboxManager.getConfig()?.filesystem?.allowRead ?? [],
        },
        {
          addDenyRead: mapped,
          addDenyWrite: mapped_2,
          dropAllowRead: (allowReadPath) => needsNetworkScreen(allowReadPath, denyPaths, screenMemo),
        },
      );
      sandboxConfigOverride = {
        ...sandboxConfigOverride,
        filesystem: isWindowsSandbox
          ? {
              denyRead: filesystemPolicy.denyRead,
              denyWrite: filesystemPolicy.denyWrite,
              allowWrite: [],
            }
          : filesystemPolicy,
        allowNestedUserNamespaces: false,
      };
    }
    if (sandboxTmpDir && !env.CLAUDE_TMPDIR) process.env.CLAUDE_TMPDIR = sandboxTmpDir;
    let wrapSkipped;
    if (isWindowsSandbox) {
      let sandboxShell;
      let sandboxCommand = commandString;
      if (shellType === "powershell")
        ({ binShell: sandboxShell, command: sandboxCommand } = buildEncodedPowerShellInvocation(
          binShell,
          commandString,
        ));
      else {
        let windowsSandboxInnerShell = resolveWindowsSandboxInnerShell(binShell);
        if (windowsSandboxInnerShell) sandboxShell = windowsSandboxInnerShell;
        else {
          let gitBashPath = getGitBashPathCached();
          if (gitBashPath === null)
            throw new SandboxUnavailableForShellError(
              "Sandboxed bash on Windows requires Git Bash, which is not installed. Install Git Bash, or run this command unsandboxed (dangerouslyDisableSandbox).",
            );
          sandboxShell = gitBashPath;
        }
      }
      let wrapped = await retryWithoutSignalOnAbort(
        (attemptSignal) =>
          SandboxManager.wrapWithSandboxArgv(
            sandboxCommand,
            sandboxShell,
            sandboxConfigOverride,
            attemptSignal,
            commandKey,
          ),
        abortSignal,
        isAbortedNow,
      );
      sandboxArgv = wrapped?.argv;
      sandboxEnv = wrapped?.env;
      sandboxUnsetEnv = wrapped?.unsetEnv;
      wrapSkipped = wrapped === undefined;
    } else {
      let seccompCommand = wrapWithSeccompExec(commandString);
      unwrappedCommand = seccompCommand;
      let wrappedCommand = await retryWithoutSignalOnAbort(
        (attemptSignal) =>
          SandboxManager.wrapWithSandbox(
            seccompCommand,
            sandboxInnerShell,
            sandboxConfigOverride,
            attemptSignal,
            commandKey,
          ),
        abortSignal,
        isAbortedNow,
      );
      commandString = wrappedCommand ?? commandString;
      wrapSkipped = wrappedCommand === undefined;
    }
    if (wrapSkipped) {
      logEvent("tengu_shell_abort_before_spawn", {
        shell_type: fromEnum(shellType),
        sandboxed: true,
        caller: fromEnum(caller),
      });
      return createAbortedCommand();
    }
  }
  let needsSandboxCleanup = shouldUseSandbox === true;
  using sandboxCleanup = {
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
  let taskOutput = new TaskOutput(filePath, onProgress ?? null, !usePipeMode);
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
    let cwdWasChecked = permissionCheckedCwdOf(session) !== undefined;
    if (cwdWasChecked || heldCwd !== undefined) {
      let [cwdStatus, realPathOutcome] = await Promise.all([
        cwdWasChecked ? checkCwdStillValid(cwd) : "same",
        heldCwd !== undefined ? realPathOutcomeAsync(cwd) : undefined,
      ]);
      let cwdChanged = cwdWasChecked && (cwdStatus !== "same" || permissionCheckedCwdOf(session) !== cwd);
      let cwdUnusable = cwdChanged || (heldCwd !== undefined && !callFramePhysicalMatches(realPathOutcome));
      if (cwdUnusable || isTerminalShutdown()) {
        if (cwdChanged) logFeatureSad("mcp_serve_call_directory", "start_directory_changed");
        if (cwdUnusable && !cwdChanged) logFeatureSad("call_directory_hold", "changed_before_spawn");
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
        return cwdUnusable
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
    let cgroupOptions = useToolMemoryCgroup ? cgroupSpawnOptions(toolCgroupClass) : {};
    if (commandNetworkLists !== undefined && sandboxAttributionId !== undefined) {
      SandboxManager.registerCommandNetworkLists(sandboxAttributionId, commandNetworkLists);
      registeredNetworkListsId = sandboxAttributionId;
    }
    let externalMark = callTiming?.mark("external");
    let startedAt = performance.now();
    cpuAccountWindow = cpuAccountJoin && openCpuWindow(cpuAccountJoin);
    let childProcess = spawn(finalSpawnFile, finalSpawnArgs, {
      ...cgroupOptions,
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
        : checkPathExists(
            provider.stdin,
            usePipeMode,
            outputFileHandle?.fd,
            stdinFd,
            takesTailInput ? tailInput?.fd : undefined,
          ),
      windowsVerbatimArguments: windowsLauncher && DETACHED_LAUNCHER_SPAWN_OPTIONS.windowsVerbatimArguments,
      detached: provider.detached,
      windowsHide: true,
    });
    spawnedChild = childProcess;
    if (windowsLauncher !== undefined && childProcess.pid !== undefined)
      logFeatureOk("shell_windows_launcher");
    if (registeredNetworkListsId !== undefined) {
      let networkListsId = registeredNetworkListsId;
      let unregisterNetworkLists = () => SandboxManager.unregisterCommandNetworkLists(networkListsId);
      childProcess.once("exit", unregisterNetworkLists);
      childProcess.once("error", unregisterNetworkLists);
      registeredNetworkListsId = undefined;
    }
    if (useToolMemoryCgroup && cgroupOptions.cgroup === undefined && isToolCgroupPending())
      parkPendingPid(toolCgroupClass, childProcess.pid);
    let unregisterAgentProcess = registerAgentProcess(owningAgentId, childProcess);
    childProcess.once("exit", unregisterAgentProcess);
    childProcess.once("error", unregisterAgentProcess);
    let wrappedSpawn = wrapSpawn(
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
    if (externalMark) wrappedSpawn.result.then(externalMark, externalMark);
    let execSpan = endToolExecutionSpan_2("claude_code.bash.subprocess", {
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
    if (execSpan) {
      let prefixPromise = getCompoundCommandPrefixesStatic_2(figSpecRegistryByHost.of(host), command).catch(
        () => [],
      );
      wrappedSpawn.result
        .then(async (spawnResult) => {
          let prefixes = await prefixPromise;
          if (prefixes.length > 0 && !isTracingRedacted())
            noopEndToolExecutionSpan(execSpan, {
              command_prefix: prefixes.map((prefix) => truncateContentForTelemetry(prefix).content),
            });
          noopEndToolExecutionSpan(execSpan, {
            exit_code: spawnResult.code,
            stdout_bytes: spawnResult.outputFileSize ?? Buffer.byteLength(spawnResult.stdout),
            stderr_bytes: Buffer.byteLength(spawnResult.stderr),
            interrupted: spawnResult.interrupted,
            ...(spawnResult.backgroundTaskId && {
              backgrounded: true,
            }),
          });
          if (spawnResult.interrupted) setSpanError(execSpan, `interrupted (exit ${spawnResult.code})`);
        })
        .catch((error) => {
          setSpanError(execSpan, errorMessage(error));
        })
        .finally(() => execSpan.end())
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
    let trackingFilePath = cwdFilePath;
    wrappedSpawn.result = wrappedSpawn.result.then(async (result) => {
      if (shouldUseSandbox) scheduleSandboxCleanup(childProcess);
      let cwdChangeRefused = false;
      if (result && !preventCwdChanges && !result.backgroundTaskId)
        try {
          let newCwd = (await getFsImplementation().readFileBytes(trackingFilePath, CWD_FILE_READ_BYTES))
            .toString("utf8")
            .trim();
          let normalizedCwd = getPlatform() === "windows" ? posixPathToWindowsPath(newCwd) : newCwd;
          if (identity(normalizedCwd) !== cwd) {
            let validatedCwd = await validateShellCwdReadback(newCwd, normalizedCwd, cwd);
            if (validatedCwd === undefined) {
              cwdChangeRefused = true;
              logEvent("tengu_shell_set_cwd", {
                success: false,
              });
            } else if (identity(validatedCwd) !== cwd) {
              setCwd(validatedCwd, session, cwd);
              if (!hasOutermostCallFrame()) {
                invalidateSessionEnvCache();
                onCwdChanged(cwd, validatedCwd);
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
          removeCwdTrackingFile(trackingFilePath);
        });
      else await removeCwdTrackingFile(trackingFilePath);
      releaseConvergentTaskOutputBinding(taskOutput.taskId);
      if (shouldUseSandbox && getPlatform() === "windows") {
        let launchFailure = classifyWindowsSandboxLaunchExit(
          result.code,
          `${result.stderr}
${result.stdout}`,
        );
        if (launchFailure !== undefined)
          return {
            ...result,
            stderr: launchFailure,
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
      if (refusedBeforeBash !== undefined && result.code === 126) {
        let [, bashVersion, major, minor] =
          regExp_15.exec(`${result.stderr}
${result.stdout}`) ?? [];
        if (bashVersion !== undefined && Number(major) < refusedBeforeBash) {
          logFeatureBad("shell_old_bash_refusal", `bash_${major}_${minor}`);
          let message = shellTooOldReason(bashVersion);
          return {
            ...result,
            stdout: result.stdout.replace(regExp_15, () => message),
            stderr: result.stderr.replace(regExp_15, () => message),
          };
        }
      }
      if (carriedCommandText !== undefined) logFeatureOk("shell_command_text_carrier");
      return cwdChangeRefused
        ? {
            ...result,
            cwdChangeRefused,
          }
        : result;
    });
    needsSandboxCleanup = false;
    return wrappedSpawn;
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
      let limitMessage = checkArgvLimits({
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
      logForDebugging(limitMessage, {
        level: "error",
      });
      return createFailedCommand(limitMessage, "e2big");
    }
    if (spawnedChild === undefined && isDiskFullErrno(error)) {
      let errnoCode = getErrnoCode(error);
      let diskFullReason =
        errnoCode === "EDQUOT"
          ? `the user's disk quota is used up (${errnoCode})`
          : `this computer's disk is full (${errnoCode})`;
      return createFailedCommand(
        `The command was not started: ${diskFullReason} on the volume holding ${join(tmpdir(), claudeTempDirName())} (Claude Code's temporary directory), so the file that captures command output could not be created there and nothing ran. ${DISK_FULL_ADVICE}`,
      );
    }
    return createFailedCommand(errorMessage(error));
  }
}
//@ chunk-5xgkngpb.js:3180005-3180044 placement
/**
 * 把 cwd 参数解析成绝对真实路径（只取 path 字段）。
 */
function resolvePhysicalCwd(path, baseCwd) {
  return resolveCwd(path, baseCwd).path;
}
//@ chunk-5xgkngpb.js:3180044-3180201 placement
/**
 * 相对路径基于给定目录或当前 cwd 解析，再 realpath；目录不存在抛 MissingWorkingDirectoryError，其他错误返回 {path, verified:false}。
 */
function resolveCwd(path, baseCwd) {
  let absolutePath = isAbsolute(path) ? path : resolve_2(baseCwd || getFsImplementation().cwd(), path);
  try {
    return {
      path: realpathExaminedSync(getFsImplementation(), absolutePath),
      verified: true,
    };
  } catch (error) {
    if (isENOENT(error)) throw new MissingWorkingDirectoryError(absolutePath);
    return {
      path: absolutePath,
      verified: false,
    };
  }
}
//@ chunk-5xgkngpb.js:3180201-3180330 placement (2.1.88 match: setCwd, 0.53)
/**
 * 工作目录不存在时抛出的错误类，带 path 字段。
 */
class MissingWorkingDirectoryError extends Error {
  path;
  name = "MissingWorkingDirectoryError";
  constructor(path) {
    super(`Path "${path}" does not exist`);
    this.path = path;
  }
}
//@ chunk-5xgkngpb.js:3180330-3180392 placement
/**
 * 按会话根保存 {pinned} 状态（工作目录缺失时的钉住标记）；被钉住的会话 cwd 消失时 exec 不回退到别的目录。
 */
var missingWorkingDirectoryPins; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var permissionCheckedCwds;
deferInit("chunk-5xgkngpb.js:3180330", () => {
  missingWorkingDirectoryPins = new SessionRootSlot(() => ({
    pinned: false,
  }));
  permissionCheckedCwds = new SessionRootSlot(() => new WeakMap());
});
//@ chunk-5xgkngpb.js:3180392-3180449 placement
/**
 * 取该会话在权限检查时记录的 cwd（按会话根的 WeakMap）；exec 在 spawn 前后比对，目录被替换/删除则拒绝执行。
 */
function permissionCheckedCwdOf(session) {
  return session?.root && permissionCheckedCwds.peek(session.root)?.get(session);
}
//@ chunk-5xgkngpb.js:3180449-3180509 placement
function pathAncestors(path) {
  let parent = dirname(path);
  return parent === path ? [path] : [...pathAncestors(parent), path];
}
//@ chunk-5xgkngpb.js:3180509-3180883 placement
/**
 * 工作目录是否仍存在（same/lost/unknown）。
 */
async function checkCwdStillValid(path) {
  if (resolve_2(path) !== path) return "lost";
  let results = await Promise.all(
    pathAncestors(path).map((ancestor) =>
      lstat(ancestor).then(
        (stats) => (stats.isDirectory() ? "same" : "lost"),
        (error) => {
          let errnoCode = getErrnoCode(error) ?? "";
          if (["EPERM", "EACCES"].includes(errnoCode))
            return ["macos", "windows"].includes(getPlatform()) ? "unknown" : "lost";
          return ["ENOENT", "ENOTDIR", "ELOOP"].includes(errnoCode) ? "lost" : "unknown";
        },
      ),
    ),
  );
  return ["lost", "unknown"].find((outcome) => results.includes(outcome)) ?? "same";
}
//@ chunk-5xgkngpb.js:3180883-3181104 placement
async function resolvePhysicalCwdV5(path, context, baseCwd) {
  let absolutePath = isAbsolute(path) ? path : resolve_2(baseCwd || getFsImplementation().cwd(), path);
  let realPathResult = await context.hostFiles.realPath(PathSpace.workspace(absolutePath));
  if (!realPathResult.ok)
    return {
      path: absolutePath,
      verified: false,
    };
  if (!realPathResult.value.found) throw new MissingWorkingDirectoryError(absolutePath);
  return {
    path: identity(realPathResult.value.path),
    verified: true,
  };
}
//@ chunk-5xgkngpb.js:3181104-3181139 placement
function setCwd(path, session, baseCwd) {
  applyNewCwd(resolveCwd(path, baseCwd), session);
}
//@ chunk-5xgkngpb.js:3181139-3181344 placement
/**
 * chdir 后调用 setCwd；setCwd 拒绝时尝试切回原目录再抛出错误。
 */
function chdirAndSetCwd(path) {
  let previousCwd = processChdir(path);
  try {
    setCwd(path);
  } catch (error) {
    try {
      processChdir(previousCwd ?? getCwd());
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
//@ chunk-5xgkngpb.js:3181344-3181396 placement
async function setCwdV5(path, session, context, baseCwd) {
  applyNewCwd(await resolvePhysicalCwdV5(path, context, baseCwd), session);
}
//@ chunk-5xgkngpb.js:3181396-3181589 placement
function applyNewCwd(resolved, session) {
  session?.setCwd(resolved.path);
  setCwdForCallChain(resolved.path);
  let root = session?.root;
  if (resolved.verified && root !== undefined && root === session) {
    let pin = missingWorkingDirectoryPins.peek(root);
    if (pin !== undefined) pin.pinned = false;
  }
  try {
    logEvent("tengu_shell_set_cwd", {
      success: true,
    });
  } catch (error) {}
}
//@ chunk-5xgkngpb.js:3181589-3181616 placement
function registerSandboxWriteDirectory(worktreePath, session) {
  addSandboxAllowWriteDirectory(worktreePath, session);
}
//@ chunk-5xgkngpb.js:3181616-3181639 placement
function unregisterSandboxWriteDirectory(worktreePath) {
  removeSandboxAllowWriteDirectory(worktreePath);
}
//@ chunk-5xgkngpb.js:3181639-3181761 placement
async function retryWithoutSignalOnAbort(wrap, abortSignal, isAbortedNow) {
  try {
    return await wrap(abortSignal);
  } catch (error) {
    if (!abortSignal.aborted || error !== abortSignal.reason) throw error;
    return isAbortedNow() ? undefined : wrap(undefined);
  }
}
//@ chunk-5xgkngpb.js:3181761-3181846 placement
async function closeOutputAndStdinHandles(outputFileHandle, stdinFd) {
  try {
    await outputFileHandle?.close();
  } catch {}
  if (stdinFd !== undefined)
    try {
      closeSync(stdinFd);
    } catch {}
}
//@ chunk-5xgkngpb.js:3181846-3181967 placement
function sandboxCleanupSafe(scrubPaths, symlinkDenyPaths) {
  try {
    SandboxManager.cleanupAfterCommand(scrubPaths, symlinkDenyPaths);
  } catch (error) {
    logForDebugging(`sandbox cleanupAfterCommand failed: ${error}`, {
      level: "warn",
    });
  }
}
//@ chunk-5xgkngpb.js:3181967-3182078 placement
function sandboxScrubSafe() {
  try {
    SandboxManager.scrubAfterCommand();
  } catch (error) {
    logForDebugging(`sandbox scrubAfterCommand failed: ${error}`, {
      level: "warn",
    });
  }
}
//@ chunk-5xgkngpb.js:3182078-3182424 placement
/**
 * 子进程退出后再做沙箱清理（先擦除，快照扫描路径）。
 */
function scheduleSandboxCleanup(child) {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) {
    sandboxCleanupSafe();
    return;
  }
  if (isTerminalShutdown()) {
    sandboxScrubSafe();
    return;
  }
  try {
    let scrubPaths = SandboxManager.snapshotBareGitRepoScrubPaths();
    let symlinkDenyPaths = SandboxManager.snapshotSymlinkedDenyScrubPaths();
    sandboxScrubSafe();
    let cleanedUp = false;
    let cleanupOnce = () => {
      if (!cleanedUp) {
        cleanedUp = true;
        sandboxCleanupSafe(scrubPaths, symlinkDenyPaths);
      }
    };
    child.once("exit", cleanupOnce);
    child.once("error", cleanupOnce);
  } catch (error) {
    logForDebugging(`sandbox deferred-cleanup setup failed: ${error}`, {
      level: "warn",
    });
  }
}
//@ chunk-5xgkngpb.js:3182424-3182560 placement
async function removeCwdTrackingFile(path) {
  try {
    await getFsImplementation().unlink(path);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Failed to remove shell cwd-tracking file: ${errorMessage(error)}`, {
        level: "warn",
      });
  }
}
//@ chunk-5xgkngpb.js:3182560-3182631 placement
function shellExportsForSpawn(shellType, shouldUseSandbox, scrubCredentialEnv) {
  return shellType === "bash" && !shouldUseSandbox && !scrubCredentialEnv
    ? shellEnvSnapshot().shellExports
    : undefined;
}
//@ chunk-5xgkngpb.js:3182631-3183089 placement
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
  let env = {
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
    ...(sandboxUnsetEnv && Object.fromEntries(sandboxUnsetEnv.map((varName) => [varName, undefined]))),
  };
  Object.assign(env, getPluginPathEnv(env, spawnEnvPluginBinPaths, delimiter));
  if (bunOptions !== undefined) {
    setBunOptions(env, bunOptions);
    if (shellType === "bash") env[BUN_OPTIONS_CARRIER_VAR] = bunOptions;
  }
  if (carriedCommandText !== undefined) env[COMMAND_TEXT_VAR] = carriedCommandText;
  return env;
}
//@ chunk-5xgkngpb.js:3183202-3183382 placement
function sandboxCredentialEnvVars() {
  let envVars = SandboxManager.getConfig()?.credentials?.envVars ?? [];
  return {
    denied: envVars.filter((envVar) => envVar.mode === "deny").map((envVar) => envVar.name),
    masked: envVars.filter((envVar) => envVar.mode !== "deny").map((envVar) => envVar.name),
  };
}
//@ chunk-5xgkngpb.js:3183382-3183409 placement
var perCommandDenyUnenforcedSaid; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3183382", () => {
  perCommandDenyUnenforcedSaid = new HostScoped(() => new Set());
});
export {
  findShellOnPath,
  resolvePhysicalCwd,
  invalidateShellSnapshotIfPluginBinsChanged,
  resolveBashToolShellWithHost,
  setCwd,
  setCwdV5,
  MissingWorkingDirectoryError,
  missingWorkingDirectoryPins,
  getExecutorShellForAnalytics,
  exec,
  perCommandDenyUnenforcedSaid,
  safeSessionIdForSnapshot,
  buildShellSpawnEnv,
  chdirAndSetCwd,
  figSpecRegistryByHost,
  permissionCheckedCwds,
  registerSandboxWriteDirectory,
  unregisterSandboxWriteDirectory,
  getShellConfig,
  permissionCheckedCwdOf,
  resolvePhysicalCwdV5,
};
