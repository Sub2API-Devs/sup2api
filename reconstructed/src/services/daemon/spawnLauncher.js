/**
 * services/daemon/spawnLauncher.ts
 *
 * 后台进程启动器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ksvdmrg0.js (46)
 * attribution: placement 46
 */
import { stat, mkdtemp, open, access, realpath, readdir } from "fs/promises";
import { join, dirname } from "path";
import { tmpdir, homedir } from "os";
import { constants } from "fs";
import { spawn } from "child_process";
import { setTimeout as Ve } from "timers/promises";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getHostAuthTokenRefreshCallback } from "../../bootstrap/state.js";
import {
  MAX_BINARY_PROBE_BYTES,
  NATIVE_BINARY_MISSING_TEXT,
} from "../../utils/nativeInstaller/nativeBinaryMissing.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrnoForTelemetry,
  errorMessage,
} from "../../utils/errors.js";
import {
  processWrapperError,
  isProcessWrapperUsable,
  PROCESS_WRAPPER_ENV,
  processWrapperArgv,
  processWrapperState,
} from "../../utils/processWrapper.js";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { withHostOwnedEnv } from "../../utils/settings/hostEnvWrites.js";
import {
  getLaunchCommand,
  resolveClaudePath,
  findLatestInstalledVersion,
  withProcessWrapper,
  resolveLaunchTarget,
} from "../../utils/deepLink/registerProtocol.js";
import { getPlatform } from "../../utils/platform.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { sleep } from "../../utils/sleep.js";
import { moveKeeperPid } from "../../utils/toolCgroup.js";
import { getCachedPowerShellPath } from "../../utils/shell/powershellDetection.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import {
  getPreSettingsEnvHonoringLiveDeletions,
  isSettingsSourcedEnvValue,
} from "../../utils/managedEnvApply.js";
import {
  getHostAuthEnvVar,
  TOKEN_FD_ENV_VARS,
  PROVIDER_CREDENTIAL_ENV_VARS,
  BASE_URL_ENV_VARS,
  PROVIDER_SELECTION_ENV_VARS,
  stripHostManagedEnv,
} from "../../utils/managedEnvConstants.js";
import { hostAuthEnvVarName } from "../../utils/hostCredsFile.js";
import {
  stripSafeModeEnvKeys,
  stripCoworkHostEnvKeys,
  stripBgScrubbedEnvKeys,
  stripInternalEntrypoint,
} from "../../utils/background/envCarry.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isLoginStashedInTokenSlot } from "../../utils/auth.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import {
  LOCK_PROBE_LIMITS,
  readLiveServerLock,
  readDaemonLock,
  verifyLockHolder,
  waitForProcessExit,
} from "../../utils/daemon/daemonLock.js";
import { controlRequest } from "./controlClient.js";
import { BG_PROTO } from "./leaseProtocol.js";
import { procIdentityOf } from "../../utils/processIdentity.js";
import { getModeFromInput } from "../../components/PromptInput/inputModes.js";
import { writeStateAtomic, logJobWriteError } from "./jobState.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ksvdmrg0.js:6521-6888 placement
/**
 * 后台会话启动器的进程级状态：daemon 是否确认在线、进行中的确保操作、上次临时拉起时间、前缀状态与持有的信标等，可重置。
 */
class SpawnLauncherState {
  daemonConfirmedUp = false;
  ensureInFlight = null;
  lastTransientSpawnAt = null;
  prefixAxis = "idle";
  prefixContractViolationLogged = false;
  tmuxRgbApplied = false;
  ownedBeacons = new Map();
  reset() {
    this.daemonConfirmedUp = false;
    this.ensureInFlight = null;
    this.lastTransientSpawnAt = null;
    this.prefixAxis = "idle";
    this.prefixContractViolationLogged = false;
    this.tmuxRgbApplied = false;
    this.ownedBeacons.clear();
  }
}
//@ chunk-ksvdmrg0.js:6888-6913 placement
/**
 * 按宿主保存的启动器状态。
 */
var spawnLauncherState; // deferred: uses SpawnLauncherState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ksvdmrg0.js:6888", () => {
  spawnLauncherState = new HostScoped(() => new SpawnLauncherState());
});
//@ chunk-ksvdmrg0.js:6913-6950 placement
/**
 * 取当前宿主的启动器状态。
 */
function getSpawnLauncherState() {
  return spawnLauncherState.of(getRootSession().host);
}
//@ chunk-ksvdmrg0.js:7256-7396 placement
var STUB_WAIT_MS = 1e4;
var POLL_MS = 250;
var EXTENDED_WAIT_MS = 120000;
var EXTENDED_POLL_MS = 1000;
var INSTALL_IN_PROGRESS_MS = 600000;
var HOMEBREW_WAIT_MS = 1e4;
var HOMEBREW_CASK_RE = /^(.+)\/Caskroom\/[^/]+\/[^/]+\/claude$/;
var NPM_SCOPE_SEGMENT = "/node_modules/@anthropic-ai/";
var FRESH_STUB_MS = 60000;
//@ chunk-ksvdmrg0.js:7396-7613 placement
async function classifyBinaryStub(path) {
  try {
    let stats = await stat(path);
    if (!stats.isFile() || stats.size >= MAX_BINARY_PROBE_BYTES) return "present";
    return Date.now() - Math.max(stats.mtimeMs, stats.ctimeMs) < FRESH_STUB_MS ? "fresh_stub" : "stale_stub";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "missing" : "present";
  }
}
//@ chunk-ksvdmrg0.js:7613-7705 placement
/**
 * 启动失败时值得重试的错误码集合。
 */
var SPAWN_FAILURE_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ksvdmrg0.js:7613", () => {
  SPAWN_FAILURE_CODES = new Set([
    "ENOENT",
    "EACCES",
    "ENOEXEC",
    "EFTYPE",
    "ETXTBSY",
    "EBUSY",
    "EUNKNOWN",
    "EPERM",
  ]);
});
//@ chunk-ksvdmrg0.js:7705-11317 placement
/**
 * 解析 CLAUDE_CODE_PROCESS_WRAPPER 等后台启动器配置
 */
async function resolveAgentLauncher(args, storageV5, { withoutOAuthTokenEnv = false } = {}) {
  let wrapperError = processWrapperError();
  if (wrapperError) {
    logFeatureBad("agent_launcher", "invalid_config");
    return {
      err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        wrapperError,
        "CLAUDE_CODE_PROCESS_WRAPPER is misconfigured",
      ),
    };
  }
  if (!(await isProcessWrapperUsable())) {
    logFeatureBad("agent_launcher", "launcher_not_runnable");
    return {
      err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting); background sessions are not started unwrapped`,
        "CLAUDE_CODE_PROCESS_WRAPPER launcher is not runnable",
      ),
    };
  }
  let { wrapper, invocation } = withHostOwnedEnv(() => ({
    wrapper: processWrapperArgv(),
    invocation: getLaunchCommand(),
  }));
  let { cmd, prefixArgs, target } = invocation;
  let fullArgv = [cmd, ...prefixArgs, ...args];
  let env = forwardedEnv({
    dropShellOAuthToken: withoutOAuthTokenEnv || (await hasStoredRefreshToken(storageV5)),
  });
  if (getPlatform() === "windows") {
    if (processWrapperState().platformIgnored) logFeatureSad("agent_launcher", "platform_unsupported");
    let wmiResult = await spawnViaWin32ProcessCreate(fullArgv, env);
    if (wmiResult.ok)
      return {
        err: null,
      };
    logForDebugging(
      `daemon: WMI spawn failed (${wmiResult.reason}); falling back to direct spawn \u2014 daemon will not survive SSH/terminal close`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_bg_daemon_wmi_fallback", {
      timeout: wmiResult.reason === "timeout",
      enoent: wmiResult.reason === "enoent",
      no_powershell: wmiResult.reason === "no-powershell",
      rc: wmiResult.rc,
    });
  }
  let aquaWrapper = getPlatform() === "macos" ? await getMacosAquaSessionWrapper() : [];
  let tempDir = await mkdtemp(join(tmpdir(), "cc-daemon-")).catch(() => null);
  let stderrPath = tempDir ? join(tempDir, "stderr.log") : undefined;
  let stderrFile = stderrPath ? await open(stderrPath, "w").catch(() => null) : null;
  try {
    if (wrapper.length > 0)
      return {
        ...(await spawnDaemonProcess(args, env, aquaWrapper, stderrFile)),
        stderrPath,
      };
    let detachedWithHomeCwd = await spawnDetachedWithHomeCwd(
      await prependLauncherPrefix(aquaWrapper, fullArgv),
      env,
      stderrFile?.fd,
    );
    let { err } = detachedWithHomeCwd;
    let errnoCode = getErrnoCode(err);
    let gaveUpOnNpmInstallInProgress = false;
    let reinstallWaitedMs;
    if (errnoCode !== undefined && SPAWN_FAILURE_CODES.has(errnoCode) && isNpmScopePath(target)) {
      let recovery = await waitForBinaryRecovery(target);
      gaveUpOnNpmInstallInProgress = !recovery.recovered && recovery.installInProgressAtEnd;
      reinstallWaitedMs = recovery.waitedMs;
      if (recovery.recovered) {
        if (getPlatform() === "windows")
          detachedWithHomeCwd = (await spawnViaWin32ProcessCreate(fullArgv, env)).ok
            ? {
                err: null,
              }
            : await spawnDetachedWithHomeCwd(fullArgv, env, stderrFile?.fd);
        else
          detachedWithHomeCwd = await spawnDetachedWithHomeCwd(
            await prependLauncherPrefix(aquaWrapper, fullArgv),
            env,
            stderrFile?.fd,
          );
        errnoCode = getErrnoCode(detachedWithHomeCwd.err);
      }
      logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
        waited_ms: recovery.waitedMs,
        recovered: recovery.recovered,
        respawn_ok: recovery.recovered && detachedWithHomeCwd.err === null,
        extended: recovery.extended,
        install_in_progress: recovery.installInProgressAtEnd,
        errno: sanitizeErrnoForTelemetry(err) ?? lit("unknown"),
        ...(recovery.recovered &&
          detachedWithHomeCwd.err !== null && {
            respawn_errno: sanitizeErrnoForTelemetry(detachedWithHomeCwd.err) ?? lit("unknown"),
          }),
      });
      if (recovery.recovered && detachedWithHomeCwd.err === null) {
        logForDebugging(
          `daemon: ${target} was being reinstalled (exec ${getErrnoCode(err)}); started it after ${recovery.waitedMs}ms`,
        );
        return {
          ...detachedWithHomeCwd,
          stderrPath,
          recoveredAfterReinstallWait: true,
          reinstallWaitedMs,
        };
      }
      logForDebugging(
        recovery.recovered
          ? `daemon: ${target} came back after ${recovery.waitedMs}ms of an npm reinstall but starting it failed again (exec ${getErrnoCode(detachedWithHomeCwd.err)})`
          : `daemon: ${target} not runnable after waiting ${recovery.waitedMs}ms for an npm reinstall (exec ${getErrnoCode(err)}; install ${recovery.installInProgressAtEnd ? "still in progress" : recovery.extended ? "ended" : "not seen"})`,
      );
    }
    let recoveryInfo = {
      gaveUpOnNpmInstallInProgress,
      reinstallWaitedMs,
    };
    if (errnoCode !== "ENOENT" && errnoCode !== "EACCES")
      return {
        ...detachedWithHomeCwd,
        stderrPath,
        ...recoveryInfo,
      };
    let triedTargets = new Set([target]);
    let pinned = withHostOwnedEnv(() =>
      getLaunchCommand({
        pinToCurrentBinary: true,
      }),
    );
    if (!triedTargets.has(pinned.target)) {
      triedTargets.add(pinned.target);
      logEvent("tengu_bg_daemon_spawn_execpath_fallback", {
        errno_enoent: errnoCode === "ENOENT",
        errno_eacces: errnoCode === "EACCES",
      });
      let detachedWithHomeCwd = await spawnDetachedWithHomeCwd(
        await prependLauncherPrefix(aquaWrapper, [pinned.cmd, ...pinned.prefixArgs, ...args]),
        env,
        stderrFile?.fd,
      );
      if (getErrnoCode(detachedWithHomeCwd.err) !== "ENOENT")
        return {
          ...detachedWithHomeCwd,
          stderrPath,
          ...recoveryInfo,
        };
    }
    let { link, waitedMs } = await waitForHomebrewLink(pinned.target);
    if (waitedMs > 0) recoveryInfo.reinstallWaitedMs = (reinstallWaitedMs ?? 0) + waitedMs;
    if (link !== null && !triedTargets.has(link)) {
      triedTargets.add(link);
      logEvent("tengu_bg_daemon_spawn_homebrew_fallback", {
        errno_enoent: errnoCode === "ENOENT",
        errno_eacces: errnoCode === "EACCES",
        waited_ms: waitedMs,
      });
      let detachedWithHomeCwd = await spawnDetachedWithHomeCwd(
        await prependLauncherPrefix(aquaWrapper, [link, ...args]),
        env,
        stderrFile?.fd,
      );
      if (detachedWithHomeCwd.err === null)
        return {
          ...detachedWithHomeCwd,
          stderrPath,
          ...recoveryInfo,
          recoveredAfterReinstallWait: waitedMs > 0,
        };
    }
    let claudePath = resolveClaudePath();
    if (!triedTargets.has(claudePath)) {
      triedTargets.add(claudePath);
      logEvent("tengu_bg_daemon_spawn_launcher_fallback", {
        errno_enoent: errnoCode === "ENOENT",
        errno_eacces: errnoCode === "EACCES",
      });
      let detachedWithHomeCwd = await spawnDetachedWithHomeCwd(
        await prependLauncherPrefix(aquaWrapper, [claudePath, ...args]),
        env,
        stderrFile?.fd,
      );
      if (getErrnoCode(detachedWithHomeCwd.err) !== "ENOENT")
        return {
          ...detachedWithHomeCwd,
          stderrPath,
          ...recoveryInfo,
        };
    }
    let latestInstalledVersion = await findLatestInstalledVersion();
    logEvent("tengu_bg_daemon_spawn_versions_fallback", {
      found: latestInstalledVersion !== null,
    });
    if (latestInstalledVersion !== null && !triedTargets.has(latestInstalledVersion))
      return {
        ...(await spawnDetachedWithHomeCwd(
          await prependLauncherPrefix(aquaWrapper, [latestInstalledVersion, ...args]),
          env,
          stderrFile?.fd,
        )),
        stderrPath,
        ...recoveryInfo,
      };
    return {
      err,
      stderrPath,
      ...recoveryInfo,
    };
  } finally {
    await stderrFile?.close().catch(() => {});
  }
}
//@ chunk-ksvdmrg0.js:11317-12822 placement
async function spawnDaemonProcess(args, env, aquaWrapper, stderrFile) {
  let spawnWith = async (target) => {
    let invocation = withHostOwnedEnv(() => withProcessWrapper(target));
    return spawnDetachedWithHomeCwd(
      await prependLauncherPrefix(aquaWrapper, [invocation.cmd, ...invocation.prefixArgs, ...args]),
      env,
      stderrFile?.fd,
    );
  };
  let launchTarget = resolveLaunchTarget();
  if (
    await isExecutableBinary(launchTarget.cmd, {
      rejectNpmStub: true,
    })
  )
    return spawnWith(launchTarget);
  let gaveUpOnNpmInstallInProgress = false;
  let reinstallWaitedMs;
  if (isNpmScopePath(launchTarget.cmd)) {
    let recovery = await waitForBinaryRecovery(launchTarget.cmd);
    reinstallWaitedMs = recovery.waitedMs;
    logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
      waited_ms: recovery.waitedMs,
      recovered: recovery.recovered,
      respawn_ok: recovery.recovered,
      extended: recovery.extended,
      install_in_progress: recovery.installInProgressAtEnd,
      probe: true,
    });
    if (recovery.recovered)
      return {
        ...(await spawnWith(launchTarget)),
        recoveredAfterReinstallWait: true,
        reinstallWaitedMs,
      };
    gaveUpOnNpmInstallInProgress = recovery.installInProgressAtEnd;
  }
  let launchTarget_2 = resolveLaunchTarget({
    pinToCurrentBinary: true,
  });
  if (launchTarget_2.cmd !== launchTarget.cmd && (await isExecutableBinary(launchTarget_2.cmd))) {
    logEvent("tengu_bg_daemon_spawn_execpath_fallback", {
      errno_enoent: false,
      errno_eacces: false,
      probe: true,
    });
    return {
      ...(await spawnWith(launchTarget_2)),
      reinstallWaitedMs,
    };
  }
  let { link, waitedMs } = await waitForHomebrewLink(launchTarget_2.cmd);
  if (waitedMs > 0) reinstallWaitedMs = (reinstallWaitedMs ?? 0) + waitedMs;
  if (link !== null && (await isExecutableBinary(link))) {
    logEvent("tengu_bg_daemon_spawn_homebrew_fallback", {
      errno_enoent: false,
      errno_eacces: false,
      probe: true,
      waited_ms: waitedMs,
    });
    return {
      ...(await spawnWith({
        cmd: link,
        prefixArgs: [],
        target: link,
      })),
      recoveredAfterReinstallWait: waitedMs > 0,
      reinstallWaitedMs,
    };
  }
  let latestInstalledVersion = await findLatestInstalledVersion();
  logEvent("tengu_bg_daemon_spawn_versions_fallback", {
    found: latestInstalledVersion !== null,
    probe: true,
  });
  if (
    latestInstalledVersion !== null &&
    latestInstalledVersion !== launchTarget_2.cmd &&
    (await isExecutableBinary(latestInstalledVersion))
  )
    return {
      ...(await spawnWith({
        cmd: latestInstalledVersion,
        prefixArgs: [],
        target: latestInstalledVersion,
      })),
      reinstallWaitedMs,
    };
  logFeatureBad("agent_launcher", "no_runnable_target");
  return {
    err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `no runnable Claude Code binary was found to run through the configured launcher \u2014 last tried: ${latestInstalledVersion ?? launchTarget_2.cmd}`,
      "no runnable claude binary for the configured launcher",
    ),
    gaveUpOnNpmInstallInProgress,
    reinstallWaitedMs,
  };
}
//@ chunk-ksvdmrg0.js:12822-12980 placement
async function isExecutableBinary(path, options = {}) {
  try {
    let stats = await stat(path);
    if (!stats.isFile()) return false;
    if (options.rejectNpmStub && stats.size < MAX_BINARY_PROBE_BYTES) return false;
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-ksvdmrg0.js:12980-13036 placement
/**
 * 路径是否位于 npm 全局包的 scope 目录（npm stub 判断）。
 */
function isNpmScopePath(path) {
  return path.replace(/\\/g, "/").includes(NPM_SCOPE_SEGMENT);
}
//@ chunk-ksvdmrg0.js:13036-13224 placement
async function getHomebrewLink(path) {
  let caskPath = HOMEBREW_CASK_RE.exec(path)?.[1];
  if (caskPath === undefined) return null;
  let binPath = join(caskPath, "bin", "claude");
  let resolved = await realpath(binPath).catch(() => null);
  return resolved !== null && resolved !== path && resolved.startsWith(`${caskPath}/Caskroom/`)
    ? binPath
    : null;
}
//@ chunk-ksvdmrg0.js:13224-13534 placement
/**
 * 等待 Homebrew cask 升级完成后出现可执行的 bin/claude 链接（有上限），放弃时记 tengu_bg_daemon_spawn_homebrew_wait_gave_up。
 */
async function waitForHomebrewLink(path) {
  for (let waitedMs = 0; ; waitedMs += POLL_MS) {
    let upgrading =
      HOMEBREW_CASK_RE.test(path) &&
      (await stat(`${dirname(path)}.upgrading`).then(
        () => true,
        () => false,
      ));
    let homebrewLink = await getHomebrewLink(path);
    if ((upgrading || waitedMs > 0) && homebrewLink !== null && !(await isExecutableBinary(homebrewLink)))
      homebrewLink = null;
    if (homebrewLink !== null || !upgrading || waitedMs >= HOMEBREW_WAIT_MS) {
      if (homebrewLink === null && waitedMs > 0)
        logEvent("tengu_bg_daemon_spawn_homebrew_wait_gave_up", {
          waited_ms: waitedMs,
        });
      return {
        link: homebrewLink,
        waitedMs,
      };
    }
    await sleep(POLL_MS);
  }
}
//@ chunk-ksvdmrg0.js:13534-13943 placement
/**
 * 判断 npm 是否正在安装 @anthropic-ai 包（包目录旁有近期创建的 .包名- 临时目录）。
 */
async function isNpmInstallInProgress(path) {
  let index = path.replace(/\\/g, "/").indexOf(NPM_SCOPE_SEGMENT);
  if (index === -1) return false;
  let sliced = path.slice(0, index + NPM_SCOPE_SEGMENT.length - 1);
  let scopeDir = path.slice(index + NPM_SCOPE_SEGMENT.length).split(/[\\/]/)[0];
  if (!scopeDir) return false;
  let pendingPrefix = `.${scopeDir}-`;
  let entries;
  try {
    entries = await readdir(sliced, {
      withFileTypes: true,
    });
  } catch {
    return false;
  }
  for (let entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(pendingPrefix)) continue;
    try {
      let stats = await stat(join(sliced, entry.name));
      if (Date.now() - Math.max(stats.ctimeMs, stats.mtimeMs) < INSTALL_IN_PROGRESS_MS) return true;
    } catch {}
  }
  return false;
}
//@ chunk-ksvdmrg0.js:13943-14502 placement
/**
 * 二进制暂时不可执行（npm 占位）时轮询等待恢复：先短等，若检测到安装进行中再延长等待。
 */
async function waitForBinaryRecovery(path) {
  let deadline = Date.now();
  let softDeadline = deadline + STUB_WAIT_MS;
  while (Date.now() < softDeadline) {
    await sleep(POLL_MS);
    if (
      await isExecutableBinary(path, {
        rejectNpmStub: true,
      })
    )
      return {
        recovered: true,
        waitedMs: Date.now() - deadline,
        extended: false,
        installInProgressAtEnd: false,
      };
  }
  let installInProgress = await isNpmInstallInProgress(path);
  if (!installInProgress)
    return {
      recovered: false,
      waitedMs: Date.now() - deadline,
      extended: false,
      installInProgressAtEnd: false,
    };
  let extendedDeadline = deadline + EXTENDED_WAIT_MS;
  while (Date.now() < extendedDeadline) {
    await sleep(EXTENDED_POLL_MS);
    if (
      await isExecutableBinary(path, {
        rejectNpmStub: true,
      })
    )
      return {
        recovered: true,
        waitedMs: Date.now() - deadline,
        extended: true,
        installInProgressAtEnd: installInProgress,
      };
    if (!installInProgress) break;
    installInProgress = await isNpmInstallInProgress(path);
  }
  return {
    recovered: false,
    waitedMs: Date.now() - deadline,
    extended: true,
    installInProgressAtEnd: installInProgress,
  };
}
//@ chunk-ksvdmrg0.js:14502-14637 placement
async function spawnDetachedWithHomeCwd(command, env, args) {
  let homeDir;
  try {
    homeDir = homedir();
  } catch {
    homeDir = undefined;
  }
  let detached = await spawnDetached(command, env, args, homeDir);
  if (homeDir !== undefined && detached.err) return spawnDetached(command, env, args, undefined);
  return detached;
}
//@ chunk-ksvdmrg0.js:14637-15023 placement
/**
 * 以分离模式启动进程（可指定 cwd），等一个事件循环检查启动错误，返回子进程 pid 与退出 Promise 或错误。
 */
async function spawnDetached(argv, env, stderr, cwd) {
  let spawnError = null;
  let child;
  try {
    let child_2 = spawn(argv[0], argv.slice(1), {
      detached: true,
      stdio: ["ignore", "ignore", stderr ?? "ignore"],
      windowsHide: true,
      env,
      ...(cwd !== undefined && {
        cwd,
      }),
    });
    moveKeeperPid(child_2.pid);
    child_2.once("error", (error) => {
      spawnError = error;
    });
    child = {
      pid: child_2.pid,
      exited: new Promise((resolve) => {
        child_2.once("exit", (code, signal) =>
          resolve({
            code,
            signal,
          }),
        );
      }),
    };
    child_2.unref();
  } catch (error) {
    spawnError = error;
  }
  await new Promise((resolve) => setImmediate(resolve));
  return spawnError
    ? {
        err: spawnError,
      }
    : {
        err: null,
        child,
      };
}
//@ chunk-ksvdmrg0.js:15023-15500 placement = spawnCaffeinate (0.305)
/**
 * macOS 后台守护进程用：试运行 /bin/launchctl asuser <uid> /usr/bin/true，成功则返回该前缀让子进程进入用户 GUI（Aqua）会话；打 tengu_bg_daemon_macos_aqua_wrap。
 */
async function getMacosAquaSessionWrapper() {
  let uid = process.getuid?.();
  if (uid === undefined) return [];
  let promise = await new Promise((resolve) => {
    let settled = false;
    let child;
    let finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code);
    };
    let timer = setTimeout(() => {
      child.kill();
      finish(false);
    }, 5000);
    timer.unref();
    try {
      child = spawn("/bin/launchctl", ["asuser", String(uid), "/usr/bin/true"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      finish(false);
      return;
    }
    child.once("error", () => finish(false));
    child.once("exit", (err) => finish(err === 0));
  });
  logEvent("tengu_bg_daemon_macos_aqua_wrap", {
    has_gui: promise,
  });
  return promise ? ["/bin/launchctl", "asuser", String(uid)] : [];
}
//@ chunk-ksvdmrg0.js:15500-15624 placement
async function prependLauncherPrefix(prefix, argv) {
  if (prefix.length === 0) return argv;
  let binary = argv[0];
  if (
    !(await isExecutableBinary(binary, {
      rejectNpmStub: isNpmScopePath(binary),
    }))
  )
    return argv;
  return [...prefix, ...argv];
}
//@ chunk-ksvdmrg0.js:15624-16277 placement
/**
 * Windows 上通过 PowerShell（EncodedCommand）调用 Win32_Process.Create 启动分离进程，5 秒超时；返回 ok 或失败原因。
 */
async function spawnViaWin32ProcessCreate(argv, env) {
  let script;
  try {
    script = WINDOWS_DETACHED_SPAWN_SCRIPT(quoteWindowsArgs(argv));
  } catch (error) {
    return {
      ok: false,
      reason: errorMessage(error),
    };
  }
  let powershellPath = await getCachedPowerShellPath();
  if (!powershellPath)
    return {
      ok: false,
      reason: "no-powershell",
    };
  let str = Buffer.from(script, "utf16le").toString("base64");
  return new Promise((resolve) => {
    let settled = false;
    let child;
    let finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    let onError = (error) =>
      finish({
        ok: false,
        reason: getErrnoCode(error) === "ENOENT" ? "enoent" : errorMessage(error),
      });
    let timer = setTimeout(() => {
      child.kill();
      finish({
        ok: false,
        reason: "timeout",
      });
    }, 5000);
    timer.unref();
    try {
      child = spawn(powershellPath, ["-NoProfile", "-NonInteractive", "-EncodedCommand", str], {
        stdio: "ignore",
        windowsHide: true,
        env,
      });
    } catch (error) {
      onError(error);
      return;
    }
    child.once("error", onError);
    child.once("exit", (exitCode) => {
      if (exitCode === 0)
        finish({
          ok: true,
        });
      else
        finish({
          ok: false,
          reason: `Win32_Process.Create rc=${exitCode}`,
          rc: exitCode ?? undefined,
        });
    });
  });
}
//@ chunk-ksvdmrg0.js:16277-16783 placement
function WINDOWS_DETACHED_SPAWN_SCRIPT(commandLine) {
  return [
    '$ErrorActionPreference = "Stop"',
    '$e = [string[]](Get-ChildItem Env: | ForEach-Object { "$($_.Name)=$($_.Value)" })',
    "$s = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ EnvironmentVariables = $e; ShowWindow = [uint16]0; CreateFlags = [uint32]8 }",
    `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = ${quotePowerShellString(commandLine)}; CurrentDirectory = $env:USERPROFILE; ProcessStartupInformation = $s }`,
    "exit $r.ReturnValue",
  ].join(`
`);
}
//@ chunk-ksvdmrg0.js:16783-16825 placement
/**
 * 按 Windows 规则把参数数组拼成命令行。
 */
function quoteWindowsArgs(args) {
  return args.map(quoteWindowsArg).join(" ");
}
//@ chunk-ksvdmrg0.js:16825-17077 placement
/**
 * 按 Windows 命令行规则给参数加引号并转义反斜杠与双引号。
 */
function quoteWindowsArg(arg) {
  if (arg.length > 0 && !/[\s"]/.test(arg)) return arg;
  let quoted = '"';
  let index = 0;
  while (index < arg.length) {
    let backslashes = 0;
    while (arg[index] === "\\") {
      backslashes++;
      index++;
    }
    if (index === arg.length) quoted += "\\".repeat(backslashes * 2);
    else if (arg[index] === '"') {
      quoted += "\\".repeat(backslashes * 2 + 1) + '"';
      index++;
    } else {
      quoted += "\\".repeat(backslashes) + arg[index];
      index++;
    }
  }
  return quoted + '"';
}
//@ chunk-ksvdmrg0.js:17077-17232 placement
function quotePowerShellString(text) {
  if (/[\u2018\u2019\u201A\u201B]/.test(text))
    throw Error("unsupported Unicode single-quote in command line");
  return `'${text.replaceAll("'", "''")}'`;
}
//@ chunk-ksvdmrg0.js:17232-17396 placement
async function hasStoredRefreshToken(accountKey) {
  let envToken = withHostOwnedEnv(() => process.env.CLAUDE_CODE_OAUTH_TOKEN);
  if (getPlatform() === "macos" || !envToken) return false;
  return !!(await getSecureStorage().readAsync(accountKey))?.claudeAiOauth?.refreshToken;
}
//@ chunk-ksvdmrg0.js:17396-17432 placement
/**
 * 计算后台进程要转发的环境变量并应用宿主自有环境。
 */
function forwardedEnv(transition) {
  return withHostOwnedEnv(() => DAEMON_FORWARDED_ENV(transition));
}
//@ chunk-ksvdmrg0.js:17432-19118 placement
function DAEMON_FORWARDED_ENV(options) {
  let envSlice = getPreSettingsEnvHonoringLiveDeletions();
  envSlice.INVOCATION_ID = "";
  let wrapperValue = process.env[PROCESS_WRAPPER_ENV];
  if (wrapperValue) envSlice[PROCESS_WRAPPER_ENV] = wrapperValue;
  else delete envSlice[PROCESS_WRAPPER_ENV];
  let hostAuthKeys = new Set(
    [
      "CLAUDE_CODE_OAUTH_TOKEN",
      getHostAuthEnvVar(envSlice),
      getHostAuthTokenRefreshCallback()
        ? getHostAuthEnvVar({
            CLAUDE_CODE_HOST_AUTH_ENV_VAR: hostAuthEnvVarName(),
          })
        : undefined,
    ].flatMap((varName) => (varName === undefined ? [] : [varName.toUpperCase()])),
  );
  for (let key of Object.keys(envSlice)) {
    if (!hostAuthKeys.has(key.toUpperCase())) continue;
    let value = process.env[key];
    if (value === undefined) delete envSlice[key];
    else if (!isSettingsSourcedEnvValue(key, value)) envSlice[key] = value;
  }
  delete envSlice.CLAUDECODE;
  delete envSlice.CLAUDE_CODE_SESSION_ID;
  delete envSlice.CLAUDE_CODE_CHILD_SESSION;
  delete envSlice.CLAUDE_CODE_SESSION_ATTENDED;
  delete envSlice.CLAUDE_CODE_CHROME_MCP_ORG_DENIED;
  delete envSlice.CLAUDE_CODE_EVAL_INTERVIEW_SESSION;
  delete envSlice.CLAUDE_CODE_BRIDGE_SESSION_ID;
  delete envSlice.CLAUDE_CODE_HOST_WORKTREE;
  delete envSlice.CLAUDE_CODE_HOST_WORKTREE_FENCE;
  stripSafeModeEnvKeys(envSlice);
  for (let key of Object.keys(envSlice)) {
    let upper = key.toUpperCase();
    if (
      upper === "CLAUDE_CODE_PLUGIN_DIRS" ||
      upper === "CLAUDE_CODE_ATTRIBUTION_PROJECT" ||
      upper === "CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS" ||
      upper === "CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES"
    )
      delete envSlice[key];
  }
  stripCoworkHostEnvKeys(envSlice);
  stripBgScrubbedEnvKeys(envSlice);
  delete envSlice.CLAUDE_BG_SESSION_PERMISSION_RULES;
  delete envSlice.CLAUDE_BG_MEMORY_TOGGLED_OFF;
  delete envSlice.CLAUDE_BG_AUTO_MEMORY_OFF;
  delete envSlice.CLAUDE_BG_GATEWAY_WITHHELD;
  stripInternalEntrypoint(envSlice);
  let strippedKeys = new Set(
    ["CLAUDE_BG_AUTH_SNAPSHOT_PATH", ...TOKEN_FD_ENV_VARS].map((varName) => varName.toUpperCase()),
  );
  for (let key of Object.keys(envSlice)) if (strippedKeys.has(key.toUpperCase())) delete envSlice[key];
  let hostAuthEnvVar = getHostAuthEnvVar(envSlice);
  if (isEnvTruthy(envSlice.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) {
    for (let varName of [
      ...PROVIDER_CREDENTIAL_ENV_VARS,
      ...BASE_URL_ENV_VARS,
      ...PROVIDER_SELECTION_ENV_VARS,
    ])
      delete envSlice[varName];
    stripHostManagedEnv(envSlice);
    delete envSlice.ANTHROPIC_CUSTOM_HEADERS;
    if (hostAuthEnvVar) delete envSlice[hostAuthEnvVar];
    delete envSlice.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST;
    delete envSlice.CLAUDE_CODE_HOST_AUTH_ENV_VAR;
    delete envSlice.CLAUDE_CODE_HOST_GATEWAY_LINEAGE;
  }
  if (options.dropShellOAuthToken || isLoginStashedInTokenSlot()) {
    for (let key of Object.keys(envSlice))
      if (key.toUpperCase() === "CLAUDE_CODE_OAUTH_TOKEN") delete envSlice[key];
  }
  return envSlice;
}
//@ chunk-ksvdmrg0.js:19118-19148 placement
/**
 * 判断锁文件启动时间时允许的偏差（5000 毫秒）。
 */
var EXTENDED_SPAWN_WAIT_MS = 120000;
var LIVENESS_PROBE_INTERVAL_MS = 5000;
var LOCK_STARTED_AT_SKEW_MS = 5000;
//@ chunk-ksvdmrg0.js:19148-19375 placement
function createSpawnAttempt(attempt) {
  let state = {
    ...attempt,
    childExit: null,
    childExitAt: null,
    stderr: null,
    budgetExtended: false,
    nextLivenessProbeAt: attempt.spawnIssuedAt + LIVENESS_PROBE_INTERVAL_MS,
    siblingHolderSeen: false,
  };
  attempt.child?.exited.then((childExit) => {
    state.childExit = childExit;
    state.childExitAt = Date.now();
  });
  return state;
}
//@ chunk-ksvdmrg0.js:19375-19646 placement
async function isNpmStubSpawnFailure(attempt, path) {
  let childExit = attempt.childExit;
  if (!childExit || attempt.siblingHolderSeen) return false;
  if (childExit.code === 0 && childExit.signal === null) return false;
  if (!isNpmScopePath(path)) return false;
  switch (await classifyBinaryStub(path)) {
    case "missing":
    case "fresh_stub":
      return true;
    case "stale_stub":
      return false;
    case "present":
      return (await readSpawnStderr(attempt)).includes(NATIVE_BINARY_MISSING_TEXT);
  }
}
//@ chunk-ksvdmrg0.js:19646-20241 placement
/**
 * 按守护进程 stderr 内容归类失败原因（npm 占位、cwd 被删、launchctl、模块缺失、运行时崩溃、Claude 报错、其他）。
 */
function classifyDaemonStderr(stderr) {
  if (stderr.trim().length === 0) return;
  if (stderr.includes(NATIVE_BINARY_MISSING_TEXT)) return lit("npm_stub");
  if (/current working directory was deleted|uv_cwd|getcwd/i.test(stderr)) return lit("cwd_deleted");
  if (/launchctl|Could not switch to audit session|posix_spawn/.test(stderr)) return lit("launchctl");
  if (/Cannot find module|MODULE_NOT_FOUND|Module not found/.test(stderr)) return lit("module_not_found");
  if (
    /dyld|Segmentation fault|Illegal instruction|Abort trap|Killed: 9|panic|bun has crashed|^error: /im.test(
      stderr,
    )
  )
    return lit("runtime");
  if (/^\s*(claude|Claude Code|daemon|bg manager)\b/im.test(stderr)) return lit("claude_error");
  return lit("other");
}
//@ chunk-ksvdmrg0.js:20241-20381 placement
async function readSpawnStderr(attempt, force = false) {
  if (attempt.stderr === null || force)
    attempt.stderr = attempt.stderrPath
      ? ((await readSmallFileOrNull(attempt.stderrPath, 1048576)) ?? "").slice(0, 2000)
      : "";
  return attempt.stderr;
}
//@ chunk-ksvdmrg0.js:20381-20661 placement
async function shouldStopWaitingForDaemon(attempt) {
  let childExit = attempt.childExit;
  if (!childExit || attempt.siblingHolderSeen) return false;
  if (!attempt.budgetExtended) {
    if ((await readSpawnStderr(attempt)).trim().length === 0) return false;
    if (attempt.wrapperConfigured && childExit.code === 0 && childExit.signal === null) return false;
  }
  let lock = await hasFreshDaemonLock(attempt, LOCK_PROBE_LIMITS);
  if (lock !== false) {
    attempt.siblingHolderSeen = lock === true;
    return false;
  }
  return true;
}
//@ chunk-ksvdmrg0.js:20661-21053 placement
/**
 * 轮询守护进程控制 socket 直到 ping 成功或超时；子进程已失败则提前放弃；期间检测到同级锁持有者时延长期限。
 */
async function waitForDaemonUp(attempt, deadline, probeLiveness) {
  let endTime = deadline;
  while (true) {
    if (await shouldStopWaitingForDaemon(attempt)) return false;
    if (Date.now() >= endTime) return false;
    if (
      (
        await controlRequest({
          proto: BG_PROTO,
          op: "ping",
        })
      ).ok
    )
      return true;
    if (probeLiveness && Date.now() >= attempt.nextLivenessProbeAt) {
      attempt.nextLivenessProbeAt = Date.now() + LIVENESS_PROBE_INTERVAL_MS;
      let hasLock = await hasFreshDaemonLock(attempt, 1);
      if (!attempt.budgetExtended && hasLock === true) {
        attempt.budgetExtended = true;
        endTime = Math.max(endTime, attempt.spawnIssuedAt + EXTENDED_SPAWN_WAIT_MS);
      } else if (attempt.budgetExtended && hasLock === false && Date.now() >= deadline) return false;
    }
    await Ve(100);
  }
}
//@ chunk-ksvdmrg0.js:21053-21194 placement
async function hasFreshDaemonLock(attempt, limits) {
  let lock;
  try {
    lock = await readLiveServerLock(limits, attempt.storageV5);
  } catch {
    return null;
  }
  return (
    lock !== null && !lock.bgDisabled && lock.startedAt >= attempt.spawnIssuedAt - LOCK_STARTED_AT_SKEW_MS
  );
}
//@ chunk-ksvdmrg0.js:21194-22324 placement
/**
 * 超时时描述守护进程锁的状态（不存在、不可读、自己的子进程、其他进程存活/已死/无权限）及持有者年龄与版本差异，用于遥测。
 */
async function describeDaemonLockAtDeadline(spawnContext) {
  let lock;
  try {
    lock = await readDaemonLock(spawnContext.storageV5);
  } catch {
    return {
      lock_at_deadline: lit("unreadable"),
    };
  }
  if (!lock)
    return {
      lock_at_deadline: lit("absent"),
    };
  let holderInfo = {
    holder_age_ms: Math.max(0, Date.now() - lock.startedAt),
    holder_version_skew:
      lock.version !==
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
  };
  if (
    (spawnContext.child?.pid !== undefined && lock.pid === spawnContext.child.pid) ||
    lock.startedAt >= spawnContext.spawnIssuedAt - LOCK_STARTED_AT_SKEW_MS
  )
    return {
      lock_at_deadline: lit("self_child"),
      ...holderInfo,
    };
  try {
    process.kill(lock.pid, 0);
  } catch (error) {
    if (getErrnoCode(error) !== "EPERM")
      return {
        lock_at_deadline: lit("other_dead"),
        ...holderInfo,
      };
    return {
      lock_at_deadline: (await verifyLockHolder(lock)) ? lit("other_eperm_stale") : lit("other_eperm"),
      ...holderInfo,
    };
  }
  return {
    lock_at_deadline: (await waitForProcessExit(lock.pid, procIdentityOf(lock), 1).catch(() => false))
      ? lit("other_alive")
      : lit("other_dead"),
    ...holderInfo,
  };
}
//@ chunk-ksvdmrg0.js:22484-22621 placement
/**
 * 输入是否不按普通提示处理：非 prompt 模式、斜杠命令，或当前会话处于有问题待答的阻塞状态。
 */
function isNonPromptInput(text, state) {
  let trimmed = text.trimStart();
  return (
    getModeFromInput(trimmed) !== "prompt" ||
    trimmed.startsWith("/") ||
    (state?.tempo === "blocked" && (state.block?.questions.length ?? 0) > 0)
  );
}
//@ chunk-ksvdmrg0.js:22621-22716 placement
/**
 * 取要写进作业状态的排队提示（非普通输入时丢弃）。
 */
function queuedPromptOrUndefined(state) {
  return state.queuedPrompt !== undefined && isNonPromptInput(state.queuedPrompt, null)
    ? undefined
    : state.queuedPrompt;
}
//@ chunk-ksvdmrg0.js:22716-22769 placement
/**
 * 判断新提示是否就是已排队的提示（允许前面有内容）。
 */
function promptMatchesQueued(queued, prompt) {
  return (
    queued === prompt ||
    queued.endsWith(`

${prompt}`)
  );
}
//@ chunk-ksvdmrg0.js:22769-22973 placement
/**
 * 把输入作为排队提示写入作业状态（非普通提示时不写）；可与已有草稿合并。
 */
async function queuePromptForJob(jobDir, state, prompt, storageV5, keepQueuedPrompt) {
  if (isNonPromptInput(prompt, null)) return false;
  let queued = keepQueuedPrompt ? queuedPromptOrUndefined(state) : undefined;
  return writeStateAtomic(
    jobDir,
    {
      ...state,
      queuedPrompt: !queued
        ? prompt
        : promptMatchesQueued(queued, prompt)
          ? queued
          : `${queued}

${prompt}`,
      updatedAt: new Date().toISOString(),
    },
    storageV5,
  ).then(
    () => true,
    (error) => {
      logJobWriteError(error);
      return false;
    },
  );
}
//@ chunk-ksvdmrg0.js:22973-23155 placement
var TERMINAL_REPLY_RE =
  /\x1b\[(?:<\d+;\d+;\d+[Mm]|M[\s\S]{3}|I|O|\??\d+;\d+(?:;\d+)*R|[?>]\d+(?:;\d+)*c|\?\d+(?:;\d+)*\$y|\?997;[12]n|\?\d+u)|\x1bP[^\x1b]*\x1b\\|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
//@ chunk-ksvdmrg0.js:23155-23237 placement
/**
 * 判断输出是否只包含终端按键回复（没有实际内容）。
 */
function isTerminalReplyOnly(reply) {
  if (!reply.includes("\x1B")) return false;
  return reply.replace(TERMINAL_REPLY_RE, "").length === 0;
}
//@ chunk-ksvdmrg0.js:23237-23283 placement
/**
 * 滚轮鼠标事件的位值（96）。
 */
var MOUSE_PREFIX = "\x1B[<";
var MOUSE_EVENT_RE = /^(\d+);\d+;\d+[Mm]/;
var SCROLL_EVENT_BIT = 96;
//@ chunk-ksvdmrg0.js:23283-23399 placement
function hasNonReportingMouseMode(text) {
  return text
    .split(MOUSE_PREFIX)
    .slice(1)
    .some((segment) => {
      let mode = MOUSE_EVENT_RE.exec(segment)?.[1];
      return mode !== undefined && (Number(mode) & SCROLL_EVENT_BIT) === 0;
    });
}
//@ chunk-ksvdmrg0.js:23399-23523 placement
var MAX_PARTIAL_ESCAPE = 64;
var PARTIAL_ESCAPE_RE =
  /^\x1b(?:$|\[(?:[<?>]?\d*(?:;\d*)*\$?|M[\s\S]{0,2})$|P(?:$|[>01][^\x1b]*\x1b?$)|\](?:$|\d[^\x07\x1b]*\x1b?$))/;
//@ chunk-ksvdmrg0.js:23523-23706 placement
/**
 * 返回判断一段输入是否只含终端应答序列（鼠标、光标位置、DA、DECRQM 等）的函数，跨块保留未完成的转义序列。
 */
function createTerminalReplyFilter() {
  let carry = "";
  return (chunk) => {
    let text = carry + chunk;
    carry = "";
    if (!text.includes("\x1B")) return false;
    let replaced = text.replace(TERMINAL_REPLY_RE, "");
    if (replaced.length === 0) return true;
    if (replaced.length <= MAX_PARTIAL_ESCAPE && PARTIAL_ESCAPE_RE.test(replaced)) {
      carry = replaced;
      return true;
    }
    return false;
  };
}
//@ chunk-ksvdmrg0.js:23784-23828 placement
/**
 * 等待详情最多保留的字符数（50）。
 */
var MAX_DAEMON_STDERR_CHARS = 262144;
var MAX_DAEMON_STDERR_LINE_CHARS = 32768;
var MAX_DAEMON_STDERR_LINES = 200;
var MAX_WAIT_FOR_DAEMON_MS = 4096;
var MAX_DAEMON_WAIT_DETAIL_CHARS = 50;
export {
  queuePromptForJob,
  isNonPromptInput,
  getSpawnLauncherState,
  queuedPromptOrUndefined,
  promptMatchesQueued,
  MAX_DAEMON_STDERR_LINES,
  MAX_DAEMON_STDERR_LINE_CHARS,
  MAX_WAIT_FOR_DAEMON_MS,
  MAX_DAEMON_WAIT_DETAIL_CHARS,
  MAX_DAEMON_STDERR_CHARS,
  isTerminalReplyOnly,
  hasNonReportingMouseMode,
  resolveAgentLauncher,
  EXTENDED_WAIT_MS,
  createSpawnAttempt,
  waitForDaemonUp,
  isNpmStubSpawnFailure,
  waitForBinaryRecovery,
  EXTENDED_SPAWN_WAIT_MS,
  shouldStopWaitingForDaemon,
  readSpawnStderr,
  classifyDaemonStderr,
  describeDaemonLockAtDeadline,
  isExecutableBinary,
  createTerminalReplyFilter,
};
