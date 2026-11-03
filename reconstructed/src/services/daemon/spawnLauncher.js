/**
 * services/daemon/spawnLauncher.ts
 *
 * 后台进程启动器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ksvdmrg0.js (47)
 * attribution: placement 47
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
  PROCESS_WRAPPER_ENV_2,
  processWrapperArgv,
  processWrapperState,
} from "../../utils/processWrapper.js";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { withHostOwnedEnv } from "../../utils/settings/managedSettingsFiles.js";
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
var spawnLauncherState = new HostScoped(() => new SpawnLauncherState());
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
async function classifyBinaryStub(r) {
  try {
    let e = await stat(r);
    if (!e.isFile() || e.size >= MAX_BINARY_PROBE_BYTES) return "present";
    return Date.now() - Math.max(e.mtimeMs, e.ctimeMs) < FRESH_STUB_MS ? "fresh_stub" : "stale_stub";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "missing" : "present";
  }
}
//@ chunk-ksvdmrg0.js:7613-7705 placement
/**
 * 启动失败时值得重试的错误码集合。
 */
var SPAWN_FAILURE_CODES = new Set([
  "ENOENT",
  "EACCES",
  "ENOEXEC",
  "EFTYPE",
  "ETXTBSY",
  "EBUSY",
  "EUNKNOWN",
  "EPERM",
]);
//@ chunk-ksvdmrg0.js:7705-11317 placement
/**
 * 解析 CLAUDE_CODE_PROCESS_WRAPPER 等后台启动器配置
 */
async function resolveAgentLauncher(r, e, { withoutOAuthTokenEnv: n = false } = {}) {
  let s = processWrapperError();
  if (s) {
    logFeatureBad("agent_launcher", "invalid_config");
    return {
      err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        s,
        "CLAUDE_CODE_PROCESS_WRAPPER is misconfigured",
      ),
    };
  }
  if (!(await isProcessWrapperUsable())) {
    logFeatureBad("agent_launcher", "launcher_not_runnable");
    return {
      err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${PROCESS_WRAPPER_ENV_2}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting); background sessions are not started unwrapped`,
        "CLAUDE_CODE_PROCESS_WRAPPER launcher is not runnable",
      ),
    };
  }
  let { wrapper, invocation } = withHostOwnedEnv(() => ({
    wrapper: processWrapperArgv(),
    invocation: getLaunchCommand(),
  }));
  let { cmd, prefixArgs, target } = invocation;
  let R = [cmd, ...prefixArgs, ...r];
  let env = forwardedEnv({
    dropShellOAuthToken: n || (await hasStoredRefreshToken(e)),
  });
  if (getPlatform() === "windows") {
    if (processWrapperState().platformIgnored) logFeatureSad("agent_launcher", "platform_unsupported");
    let O = await spawnViaWin32ProcessCreate(R, env);
    if (O.ok)
      return {
        err: null,
      };
    logForDebugging(
      `daemon: WMI spawn failed (${O.reason}); falling back to direct spawn \u2014 daemon will not survive SSH/terminal close`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_bg_daemon_wmi_fallback", {
      timeout: O.reason === "timeout",
      enoent: O.reason === "enoent",
      no_powershell: O.reason === "no-powershell",
      rc: O.rc,
    });
  }
  let x = getPlatform() === "macos" ? await getMacosAquaSessionWrapper() : [];
  let L = await mkdtemp(join(tmpdir(), "cc-daemon-")).catch(() => null);
  let M = L ? join(L, "stderr.log") : undefined;
  let U = M ? await open(M, "w").catch(() => null) : null;
  try {
    if (wrapper.length > 0)
      return {
        ...(await spawnDaemonProcess(r, env, x, U)),
        stderrPath: M,
      };
    let detachedWithHomeCwd = await spawnDetachedWithHomeCwd(await prependLauncherPrefix(x, R), env, U?.fd);
    let { err } = detachedWithHomeCwd;
    let errnoCode = getErrnoCode(err);
    let gaveUpOnNpmInstallInProgress = false;
    let V;
    if (errnoCode !== undefined && SPAWN_FAILURE_CODES.has(errnoCode) && isNpmScopePath(target)) {
      let y = await waitForBinaryRecovery(target);
      gaveUpOnNpmInstallInProgress = !y.recovered && y.installInProgressAtEnd;
      V = y.waitedMs;
      if (y.recovered) {
        if (getPlatform() === "windows")
          detachedWithHomeCwd = (await spawnViaWin32ProcessCreate(R, env)).ok
            ? {
                err: null,
              }
            : await spawnDetachedWithHomeCwd(R, env, U?.fd);
        else
          detachedWithHomeCwd = await spawnDetachedWithHomeCwd(await prependLauncherPrefix(x, R), env, U?.fd);
        errnoCode = getErrnoCode(detachedWithHomeCwd.err);
      }
      logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
        waited_ms: y.waitedMs,
        recovered: y.recovered,
        respawn_ok: y.recovered && detachedWithHomeCwd.err === null,
        extended: y.extended,
        install_in_progress: y.installInProgressAtEnd,
        errno: sanitizeErrnoForTelemetry(err) ?? lit("unknown"),
        ...(y.recovered &&
          detachedWithHomeCwd.err !== null && {
            respawn_errno: sanitizeErrnoForTelemetry(detachedWithHomeCwd.err) ?? lit("unknown"),
          }),
      });
      if (y.recovered && detachedWithHomeCwd.err === null) {
        logForDebugging(
          `daemon: ${target} was being reinstalled (exec ${getErrnoCode(err)}); started it after ${y.waitedMs}ms`,
        );
        return {
          ...detachedWithHomeCwd,
          stderrPath: M,
          recoveredAfterReinstallWait: true,
          reinstallWaitedMs: V,
        };
      }
      logForDebugging(
        y.recovered
          ? `daemon: ${target} came back after ${y.waitedMs}ms of an npm reinstall but starting it failed again (exec ${getErrnoCode(detachedWithHomeCwd.err)})`
          : `daemon: ${target} not runnable after waiting ${y.waitedMs}ms for an npm reinstall (exec ${getErrnoCode(err)}; install ${y.installInProgressAtEnd ? "still in progress" : y.extended ? "ended" : "not seen"})`,
      );
    }
    let Z = {
      gaveUpOnNpmInstallInProgress,
      reinstallWaitedMs: V,
    };
    if (errnoCode !== "ENOENT" && errnoCode !== "EACCES")
      return {
        ...detachedWithHomeCwd,
        stderrPath: M,
        ...Z,
      };
    let ae = new Set([target]);
    let u = withHostOwnedEnv(() =>
      getLaunchCommand({
        pinToCurrentBinary: true,
      }),
    );
    if (!ae.has(u.target)) {
      ae.add(u.target);
      logEvent("tengu_bg_daemon_spawn_execpath_fallback", {
        errno_enoent: errnoCode === "ENOENT",
        errno_eacces: errnoCode === "EACCES",
      });
      let detachedWithHomeCwd = await spawnDetachedWithHomeCwd(
        await prependLauncherPrefix(x, [u.cmd, ...u.prefixArgs, ...r]),
        env,
        U?.fd,
      );
      if (getErrnoCode(detachedWithHomeCwd.err) !== "ENOENT")
        return {
          ...detachedWithHomeCwd,
          stderrPath: M,
          ...Z,
        };
    }
    let { link, waitedMs } = await waitForHomebrewLink(u.target);
    if (waitedMs > 0) Z.reinstallWaitedMs = (V ?? 0) + waitedMs;
    if (link !== null && !ae.has(link)) {
      ae.add(link);
      logEvent("tengu_bg_daemon_spawn_homebrew_fallback", {
        errno_enoent: errnoCode === "ENOENT",
        errno_eacces: errnoCode === "EACCES",
        waited_ms: waitedMs,
      });
      let detachedWithHomeCwd = await spawnDetachedWithHomeCwd(
        await prependLauncherPrefix(x, [link, ...r]),
        env,
        U?.fd,
      );
      if (detachedWithHomeCwd.err === null)
        return {
          ...detachedWithHomeCwd,
          stderrPath: M,
          ...Z,
          recoveredAfterReinstallWait: waitedMs > 0,
        };
    }
    let claudePath = resolveClaudePath();
    if (!ae.has(claudePath)) {
      ae.add(claudePath);
      logEvent("tengu_bg_daemon_spawn_launcher_fallback", {
        errno_enoent: errnoCode === "ENOENT",
        errno_eacces: errnoCode === "EACCES",
      });
      let detachedWithHomeCwd = await spawnDetachedWithHomeCwd(
        await prependLauncherPrefix(x, [claudePath, ...r]),
        env,
        U?.fd,
      );
      if (getErrnoCode(detachedWithHomeCwd.err) !== "ENOENT")
        return {
          ...detachedWithHomeCwd,
          stderrPath: M,
          ...Z,
        };
    }
    let latestInstalledVersion = await findLatestInstalledVersion();
    logEvent("tengu_bg_daemon_spawn_versions_fallback", {
      found: latestInstalledVersion !== null,
    });
    if (latestInstalledVersion !== null && !ae.has(latestInstalledVersion))
      return {
        ...(await spawnDetachedWithHomeCwd(
          await prependLauncherPrefix(x, [latestInstalledVersion, ...r]),
          env,
          U?.fd,
        )),
        stderrPath: M,
        ...Z,
      };
    return {
      err,
      stderrPath: M,
      ...Z,
    };
  } finally {
    await U?.close().catch(() => {});
  }
}
//@ chunk-ksvdmrg0.js:11317-12822 placement
async function spawnDaemonProcess(r, e, n, s) {
  let h = async (launchTarget) => {
    let M = withHostOwnedEnv(() => withProcessWrapper(launchTarget));
    return spawnDetachedWithHomeCwd(await prependLauncherPrefix(n, [M.cmd, ...M.prefixArgs, ...r]), e, s?.fd);
  };
  let launchTarget = resolveLaunchTarget();
  if (
    await isExecutableBinary(launchTarget.cmd, {
      rejectNpmStub: true,
    })
  )
    return h(launchTarget);
  let gaveUpOnNpmInstallInProgress = false;
  let E;
  if (isNpmScopePath(launchTarget.cmd)) {
    let L = await waitForBinaryRecovery(launchTarget.cmd);
    E = L.waitedMs;
    logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
      waited_ms: L.waitedMs,
      recovered: L.recovered,
      respawn_ok: L.recovered,
      extended: L.extended,
      install_in_progress: L.installInProgressAtEnd,
      probe: true,
    });
    if (L.recovered)
      return {
        ...(await h(launchTarget)),
        recoveredAfterReinstallWait: true,
        reinstallWaitedMs: E,
      };
    gaveUpOnNpmInstallInProgress = L.installInProgressAtEnd;
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
      ...(await h(launchTarget_2)),
      reinstallWaitedMs: E,
    };
  }
  let { link, waitedMs } = await waitForHomebrewLink(launchTarget_2.cmd);
  if (waitedMs > 0) E = (E ?? 0) + waitedMs;
  if (link !== null && (await isExecutableBinary(link))) {
    logEvent("tengu_bg_daemon_spawn_homebrew_fallback", {
      errno_enoent: false,
      errno_eacces: false,
      probe: true,
      waited_ms: waitedMs,
    });
    return {
      ...(await h({
        cmd: link,
        prefixArgs: [],
        target: link,
      })),
      recoveredAfterReinstallWait: waitedMs > 0,
      reinstallWaitedMs: E,
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
      ...(await h({
        cmd: latestInstalledVersion,
        prefixArgs: [],
        target: latestInstalledVersion,
      })),
      reinstallWaitedMs: E,
    };
  logFeatureBad("agent_launcher", "no_runnable_target");
  return {
    err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `no runnable Claude Code binary was found to run through the configured launcher \u2014 last tried: ${latestInstalledVersion ?? launchTarget_2.cmd}`,
      "no runnable claude binary for the configured launcher",
    ),
    gaveUpOnNpmInstallInProgress,
    reinstallWaitedMs: E,
  };
}
//@ chunk-ksvdmrg0.js:12822-12980 placement
async function isExecutableBinary(r, e = {}) {
  try {
    let n = await stat(r);
    if (!n.isFile()) return false;
    if (e.rejectNpmStub && n.size < MAX_BINARY_PROBE_BYTES) return false;
    await access(r, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-ksvdmrg0.js:12980-13036 placement
/**
 * 路径是否位于 npm 全局包的 scope 目录（npm stub 判断）。
 */
function isNpmScopePath(r) {
  return r.replace(/\\/g, "/").includes(NPM_SCOPE_SEGMENT);
}
//@ chunk-ksvdmrg0.js:13036-13224 placement
async function getHomebrewLink(r) {
  let e = HOMEBREW_CASK_RE.exec(r)?.[1];
  if (e === undefined) return null;
  let n = join(e, "bin", "claude");
  let s = await realpath(n).catch(() => null);
  return s !== null && s !== r && s.startsWith(`${e}/Caskroom/`) ? n : null;
}
//@ chunk-ksvdmrg0.js:13224-13534 placement
/**
 * 等待 Homebrew cask 升级完成后出现可执行的 bin/claude 链接（有上限），放弃时记 tengu_bg_daemon_spawn_homebrew_wait_gave_up。
 */
async function waitForHomebrewLink(r) {
  for (let e = 0; ; e += POLL_MS) {
    let n =
      HOMEBREW_CASK_RE.test(r) &&
      (await stat(`${dirname(r)}.upgrading`).then(
        () => true,
        () => false,
      ));
    let homebrewLink = await getHomebrewLink(r);
    if ((n || e > 0) && homebrewLink !== null && !(await isExecutableBinary(homebrewLink)))
      homebrewLink = null;
    if (homebrewLink !== null || !n || e >= HOMEBREW_WAIT_MS) {
      if (homebrewLink === null && e > 0)
        logEvent("tengu_bg_daemon_spawn_homebrew_wait_gave_up", {
          waited_ms: e,
        });
      return {
        link: homebrewLink,
        waitedMs: e,
      };
    }
    await sleep(POLL_MS);
  }
}
//@ chunk-ksvdmrg0.js:13534-13943 placement
/**
 * 判断 npm 是否正在安装 @anthropic-ai 包（包目录旁有近期创建的 .包名- 临时目录）。
 */
async function isNpmInstallInProgress(r) {
  let index = r.replace(/\\/g, "/").indexOf(NPM_SCOPE_SEGMENT);
  if (index === -1) return false;
  let sliced = r.slice(0, index + NPM_SCOPE_SEGMENT.length - 1);
  let s = r.slice(index + NPM_SCOPE_SEGMENT.length).split(/[\\/]/)[0];
  if (!s) return false;
  let h = `.${s}-`;
  let w;
  try {
    w = await readdir(sliced, {
      withFileTypes: true,
    });
  } catch {
    return false;
  }
  for (let p of w) {
    if (!p.isDirectory() || !p.name.startsWith(h)) continue;
    try {
      let E = await stat(join(sliced, p.name));
      if (Date.now() - Math.max(E.ctimeMs, E.mtimeMs) < INSTALL_IN_PROGRESS_MS) return true;
    } catch {}
  }
  return false;
}
//@ chunk-ksvdmrg0.js:13943-14502 placement
/**
 * 二进制暂时不可执行（npm 占位）时轮询等待恢复：先短等，若检测到安装进行中再延长等待。
 */
async function waitForBinaryRecovery(r) {
  let deadline = Date.now();
  let n = deadline + STUB_WAIT_MS;
  while (Date.now() < n) {
    await sleep(POLL_MS);
    if (
      await isExecutableBinary(r, {
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
  let installInProgress = await isNpmInstallInProgress(r);
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
      await isExecutableBinary(r, {
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
    installInProgress = await isNpmInstallInProgress(r);
  }
  return {
    recovered: false,
    waitedMs: Date.now() - deadline,
    extended: true,
    installInProgressAtEnd: installInProgress,
  };
}
//@ chunk-ksvdmrg0.js:14502-14637 placement
async function spawnDetachedWithHomeCwd(r, env, n) {
  let s;
  try {
    s = homedir();
  } catch {
    s = undefined;
  }
  let detached = await spawnDetached(r, env, n, s);
  if (s !== undefined && detached.err) return spawnDetached(r, env, n, undefined);
  return detached;
}
//@ chunk-ksvdmrg0.js:14637-15023 placement
/**
 * 以分离模式启动进程（可指定 cwd），等一个事件循环检查启动错误，返回子进程 pid 与退出 Promise 或错误。
 */
async function spawnDetached(r, env, n, s) {
  let h = null;
  let child;
  try {
    let p = spawn(r[0], r.slice(1), {
      detached: true,
      stdio: ["ignore", "ignore", n ?? "ignore"],
      windowsHide: true,
      env,
      ...(s !== undefined && {
        cwd: s,
      }),
    });
    moveKeeperPid(p.pid);
    p.once("error", (E) => {
      h = E;
    });
    child = {
      pid: p.pid,
      exited: new Promise((resolve) => {
        p.once("exit", (code, signal) =>
          resolve({
            code,
            signal,
          }),
        );
      }),
    };
    p.unref();
  } catch (error) {
    h = error;
  }
  await new Promise((resolve) => setImmediate(resolve));
  return h
    ? {
        err: h,
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
  let r = process.getuid?.();
  if (r === undefined) return [];
  let promise = await new Promise((resolve) => {
    let s = false;
    let h;
    let w = (E) => {
      if (s) return;
      s = true;
      clearTimeout(timer);
      resolve(E);
    };
    let timer = setTimeout(() => {
      h.kill();
      w(false);
    }, 5000);
    timer.unref();
    try {
      h = spawn("/bin/launchctl", ["asuser", String(r), "/usr/bin/true"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      w(false);
      return;
    }
    h.once("error", () => w(false));
    h.once("exit", (err) => w(err === 0));
  });
  logEvent("tengu_bg_daemon_macos_aqua_wrap", {
    has_gui: promise,
  });
  return promise ? ["/bin/launchctl", "asuser", String(r)] : [];
}
//@ chunk-ksvdmrg0.js:15500-15624 placement
async function prependLauncherPrefix(r, e) {
  if (r.length === 0) return e;
  let n = e[0];
  if (
    !(await isExecutableBinary(n, {
      rejectNpmStub: isNpmScopePath(n),
    }))
  )
    return e;
  return [...r, ...e];
}
//@ chunk-ksvdmrg0.js:15624-16277 placement
/**
 * Windows 上通过 PowerShell（EncodedCommand）调用 Win32_Process.Create 启动分离进程，5 秒超时；返回 ok 或失败原因。
 */
async function spawnViaWin32ProcessCreate(r, env) {
  let script;
  try {
    script = WINDOWS_DETACHED_SPAWN_SCRIPT(quoteWindowsArgs(r));
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
    let p = false;
    let E;
    let S = (x) => {
      if (p) return;
      p = true;
      clearTimeout(timer);
      resolve(x);
    };
    let R = (error) =>
      S({
        ok: false,
        reason: getErrnoCode(error) === "ENOENT" ? "enoent" : errorMessage(error),
      });
    let timer = setTimeout(() => {
      E.kill();
      S({
        ok: false,
        reason: "timeout",
      });
    }, 5000);
    timer.unref();
    try {
      E = spawn(powershellPath, ["-NoProfile", "-NonInteractive", "-EncodedCommand", str], {
        stdio: "ignore",
        windowsHide: true,
        env,
      });
    } catch (error) {
      R(error);
      return;
    }
    E.once("error", R);
    E.once("exit", (x) => {
      if (x === 0)
        S({
          ok: true,
        });
      else
        S({
          ok: false,
          reason: `Win32_Process.Create rc=${x}`,
          rc: x ?? undefined,
        });
    });
  });
}
//@ chunk-ksvdmrg0.js:16277-16783 placement
function WINDOWS_DETACHED_SPAWN_SCRIPT(r) {
  return [
    '$ErrorActionPreference = "Stop"',
    '$e = [string[]](Get-ChildItem Env: | ForEach-Object { "$($_.Name)=$($_.Value)" })',
    "$s = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ EnvironmentVariables = $e; ShowWindow = [uint16]0; CreateFlags = [uint32]8 }",
    `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = ${quotePowerShellString(r)}; CurrentDirectory = $env:USERPROFILE; ProcessStartupInformation = $s }`,
    "exit $r.ReturnValue",
  ].join(`
`);
}
//@ chunk-ksvdmrg0.js:16783-16825 placement
/**
 * 按 Windows 规则把参数数组拼成命令行。
 */
function quoteWindowsArgs(r) {
  return r.map(quoteWindowsArg).join(" ");
}
//@ chunk-ksvdmrg0.js:16825-17077 placement
/**
 * 按 Windows 命令行规则给参数加引号并转义反斜杠与双引号。
 */
function quoteWindowsArg(r) {
  if (r.length > 0 && !/[\s"]/.test(r)) return r;
  let e = '"';
  let n = 0;
  while (n < r.length) {
    let s = 0;
    while (r[n] === "\\") {
      s++;
      n++;
    }
    if (n === r.length) e += "\\".repeat(s * 2);
    else if (r[n] === '"') {
      e += "\\".repeat(s * 2 + 1) + '"';
      n++;
    } else {
      e += "\\".repeat(s) + r[n];
      n++;
    }
  }
  return e + '"';
}
//@ chunk-ksvdmrg0.js:17077-17232 placement
function quotePowerShellString(r) {
  if (/[\u2018\u2019\u201A\u201B]/.test(r)) throw Error("unsupported Unicode single-quote in command line");
  return `'${r.replaceAll("'", "''")}'`;
}
//@ chunk-ksvdmrg0.js:17232-17396 placement
async function hasStoredRefreshToken(r) {
  let e = withHostOwnedEnv(() => process.env.CLAUDE_CODE_OAUTH_TOKEN);
  if (getPlatform() === "macos" || !e) return false;
  return !!(await getSecureStorage().readAsync(r))?.claudeAiOauth?.refreshToken;
}
//@ chunk-ksvdmrg0.js:17396-17432 placement
/**
 * 计算后台进程要转发的环境变量并应用宿主自有环境。
 */
function forwardedEnv(r) {
  return withHostOwnedEnv(() => DAEMON_FORWARDED_ENV(r));
}
//@ chunk-ksvdmrg0.js:17432-19118 placement
function DAEMON_FORWARDED_ENV(r) {
  let preSettingsEnvHonoringLiveDeletions = getPreSettingsEnvHonoringLiveDeletions();
  preSettingsEnvHonoringLiveDeletions.INVOCATION_ID = "";
  let n = process.env[PROCESS_WRAPPER_ENV_2];
  if (n) preSettingsEnvHonoringLiveDeletions[PROCESS_WRAPPER_ENV_2] = n;
  else delete preSettingsEnvHonoringLiveDeletions[PROCESS_WRAPPER_ENV_2];
  let s = new Set(
    [
      "CLAUDE_CODE_OAUTH_TOKEN",
      getHostAuthEnvVar(preSettingsEnvHonoringLiveDeletions),
      getHostAuthTokenRefreshCallback()
        ? getHostAuthEnvVar({
            CLAUDE_CODE_HOST_AUTH_ENV_VAR: hostAuthEnvVarName(),
          })
        : undefined,
    ].flatMap((p) => (p === undefined ? [] : [p.toUpperCase()])),
  );
  for (let key of Object.keys(preSettingsEnvHonoringLiveDeletions)) {
    if (!s.has(key.toUpperCase())) continue;
    let E = process.env[key];
    if (E === undefined) delete preSettingsEnvHonoringLiveDeletions[key];
    else if (!isSettingsSourcedEnvValue(key, E)) preSettingsEnvHonoringLiveDeletions[key] = E;
  }
  delete preSettingsEnvHonoringLiveDeletions.CLAUDECODE;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_SESSION_ID;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_CHILD_SESSION;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_SESSION_ATTENDED;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_CHROME_MCP_ORG_DENIED;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_EVAL_INTERVIEW_SESSION;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_BRIDGE_SESSION_ID;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_HOST_WORKTREE;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_HOST_WORKTREE_FENCE;
  stripSafeModeEnvKeys(preSettingsEnvHonoringLiveDeletions);
  for (let key of Object.keys(preSettingsEnvHonoringLiveDeletions)) {
    let upper = key.toUpperCase();
    if (
      upper === "CLAUDE_CODE_PLUGIN_DIRS" ||
      upper === "CLAUDE_CODE_ATTRIBUTION_PROJECT" ||
      upper === "CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS" ||
      upper === "CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES"
    )
      delete preSettingsEnvHonoringLiveDeletions[key];
  }
  stripCoworkHostEnvKeys(preSettingsEnvHonoringLiveDeletions);
  stripBgScrubbedEnvKeys(preSettingsEnvHonoringLiveDeletions);
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_BG_SESSION_PERMISSION_RULES;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_BG_MEMORY_TOGGLED_OFF;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_BG_AUTO_MEMORY_OFF;
  delete preSettingsEnvHonoringLiveDeletions.CLAUDE_BG_GATEWAY_WITHHELD;
  stripInternalEntrypoint(preSettingsEnvHonoringLiveDeletions);
  let h = new Set(["CLAUDE_BG_AUTH_SNAPSHOT_PATH", ...TOKEN_FD_ENV_VARS].map((p) => p.toUpperCase()));
  for (let key of Object.keys(preSettingsEnvHonoringLiveDeletions))
    if (h.has(key.toUpperCase())) delete preSettingsEnvHonoringLiveDeletions[key];
  let hostAuthEnvVar = getHostAuthEnvVar(preSettingsEnvHonoringLiveDeletions);
  if (isEnvTruthy(preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) {
    for (let p of [...PROVIDER_CREDENTIAL_ENV_VARS, ...BASE_URL_ENV_VARS, ...PROVIDER_SELECTION_ENV_VARS])
      delete preSettingsEnvHonoringLiveDeletions[p];
    stripHostManagedEnv(preSettingsEnvHonoringLiveDeletions);
    delete preSettingsEnvHonoringLiveDeletions.ANTHROPIC_CUSTOM_HEADERS;
    if (hostAuthEnvVar) delete preSettingsEnvHonoringLiveDeletions[hostAuthEnvVar];
    delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST;
    delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_HOST_AUTH_ENV_VAR;
    delete preSettingsEnvHonoringLiveDeletions.CLAUDE_CODE_HOST_GATEWAY_LINEAGE;
  }
  if (r.dropShellOAuthToken || isLoginStashedInTokenSlot()) {
    for (let key of Object.keys(preSettingsEnvHonoringLiveDeletions))
      if (key.toUpperCase() === "CLAUDE_CODE_OAUTH_TOKEN") delete preSettingsEnvHonoringLiveDeletions[key];
  }
  return preSettingsEnvHonoringLiveDeletions;
}
//@ chunk-ksvdmrg0.js:19118-19148 placement
/**
 * 判断锁文件启动时间时允许的偏差（5000 毫秒）。
 */
var EXTENDED_SPAWN_WAIT_MS = 120000;
var LIVENESS_PROBE_INTERVAL_MS = 5000;
var LOCK_STARTED_AT_SKEW_MS = 5000;
//@ chunk-ksvdmrg0.js:19148-19375 placement
function createSpawnAttempt(r) {
  let e = {
    ...r,
    childExit: null,
    childExitAt: null,
    stderr: null,
    budgetExtended: false,
    nextLivenessProbeAt: r.spawnIssuedAt + LIVENESS_PROBE_INTERVAL_MS,
    siblingHolderSeen: false,
  };
  r.child?.exited.then((childExit) => {
    e.childExit = childExit;
    e.childExitAt = Date.now();
  });
  return e;
}
//@ chunk-ksvdmrg0.js:19375-19646 placement
async function isNpmStubSpawnFailure(spawnAttempt, launchTarget) {
  let childExit = spawnAttempt.childExit;
  if (!childExit || spawnAttempt.siblingHolderSeen) return false;
  if (childExit.code === 0 && childExit.signal === null) return false;
  if (!isNpmScopePath(launchTarget)) return false;
  switch (await classifyBinaryStub(launchTarget)) {
    case "missing":
    case "fresh_stub":
      return true;
    case "stale_stub":
      return false;
    case "present":
      return (await readSpawnStderr(spawnAttempt)).includes(NATIVE_BINARY_MISSING_TEXT);
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
async function readSpawnStderr(r, e = false) {
  if (r.stderr === null || e)
    r.stderr = r.stderrPath ? ((await readSmallFileOrNull(r.stderrPath, 1048576)) ?? "").slice(0, 2000) : "";
  return r.stderr;
}
//@ chunk-ksvdmrg0.js:20381-20661 placement
async function shouldStopWaitingForDaemon(r) {
  let childExit = r.childExit;
  if (!childExit || r.siblingHolderSeen) return false;
  if (!r.budgetExtended) {
    if ((await readSpawnStderr(r)).trim().length === 0) return false;
    if (r.wrapperConfigured && childExit.code === 0 && childExit.signal === null) return false;
  }
  let n = await hasFreshDaemonLock(r, LOCK_PROBE_LIMITS);
  if (n !== false) {
    r.siblingHolderSeen = n === true;
    return false;
  }
  return true;
}
//@ chunk-ksvdmrg0.js:20661-21053 placement
/**
 * 轮询守护进程控制 socket 直到 ping 成功或超时；子进程已失败则提前放弃；期间检测到同级锁持有者时延长期限。
 */
async function waitForDaemonUp(spawnAttempt, e, n) {
  let s = e;
  while (true) {
    if (await shouldStopWaitingForDaemon(spawnAttempt)) return false;
    if (Date.now() >= s) return false;
    if (
      (
        await controlRequest({
          proto: BG_PROTO,
          op: "ping",
        })
      ).ok
    )
      return true;
    if (n && Date.now() >= spawnAttempt.nextLivenessProbeAt) {
      spawnAttempt.nextLivenessProbeAt = Date.now() + LIVENESS_PROBE_INTERVAL_MS;
      let p = await hasFreshDaemonLock(spawnAttempt, 1);
      if (!spawnAttempt.budgetExtended && p === true) {
        spawnAttempt.budgetExtended = true;
        s = Math.max(s, spawnAttempt.spawnIssuedAt + EXTENDED_SPAWN_WAIT_MS);
      } else if (spawnAttempt.budgetExtended && p === false && Date.now() >= e) return false;
    }
    await Ve(100);
  }
}
//@ chunk-ksvdmrg0.js:21053-21194 placement
async function hasFreshDaemonLock(r, e) {
  let n;
  try {
    n = await readLiveServerLock(e, r.storageV5);
  } catch {
    return null;
  }
  return n !== null && !n.bgDisabled && n.startedAt >= r.spawnIssuedAt - LOCK_STARTED_AT_SKEW_MS;
}
//@ chunk-ksvdmrg0.js:21194-22324 placement
/**
 * 超时时描述守护进程锁的状态（不存在、不可读、自己的子进程、其他进程存活/已死/无权限）及持有者年龄与版本差异，用于遥测。
 */
async function describeDaemonLockAtDeadline(spawnAttempt) {
  let lock;
  try {
    lock = await readDaemonLock(spawnAttempt.storageV5);
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
    (spawnAttempt.child?.pid !== undefined && lock.pid === spawnAttempt.child.pid) ||
    lock.startedAt >= spawnAttempt.spawnIssuedAt - LOCK_STARTED_AT_SKEW_MS
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
function isNonPromptInput(r, e) {
  let n = r.trimStart();
  return (
    getModeFromInput(n) !== "prompt" ||
    n.startsWith("/") ||
    (e?.tempo === "blocked" && (e.block?.questions.length ?? 0) > 0)
  );
}
//@ chunk-ksvdmrg0.js:22621-22716 placement
/**
 * 取要写进作业状态的排队提示（非普通输入时丢弃）。
 */
function queuedPromptOrUndefined(r) {
  return r.queuedPrompt !== undefined && isNonPromptInput(r.queuedPrompt, null) ? undefined : r.queuedPrompt;
}
//@ chunk-ksvdmrg0.js:22716-22769 placement
/**
 * 判断新提示是否就是已排队的提示（允许前面有内容）。
 */
function promptMatchesQueued(r, e) {
  return (
    r === e ||
    r.endsWith(`

${e}`)
  );
}
//@ chunk-ksvdmrg0.js:22769-22973 placement
/**
 * 把输入作为排队提示写入作业状态（非普通提示时不写）；可与已有草稿合并。
 */
async function queuePromptForJob(jobDir, e, initialPrompt, s, keepQueuedPrompt) {
  if (isNonPromptInput(initialPrompt, null)) return false;
  let w = keepQueuedPrompt ? queuedPromptOrUndefined(e) : undefined;
  return writeStateAtomic(
    jobDir,
    {
      ...e,
      queuedPrompt: !w
        ? initialPrompt
        : promptMatchesQueued(w, initialPrompt)
          ? w
          : `${w}

${initialPrompt}`,
      updatedAt: new Date().toISOString(),
    },
    s,
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
function isTerminalReplyOnly(r) {
  if (!r.includes("\x1B")) return false;
  return r.replace(TERMINAL_REPLY_RE, "").length === 0;
}
//@ chunk-ksvdmrg0.js:23237-23283 placement
/**
 * 滚轮鼠标事件的位值（96）。
 */
var MOUSE_PREFIX = "\x1B[<";
var MOUSE_EVENT_RE = /^(\d+);\d+;\d+[Mm]/;
var SCROLL_EVENT_BIT = 96;
//@ chunk-ksvdmrg0.js:23283-23399 placement
function hasNonReportingMouseMode(r) {
  return r
    .split(MOUSE_PREFIX)
    .slice(1)
    .some((e) => {
      let n = MOUSE_EVENT_RE.exec(e)?.[1];
      return n !== undefined && (Number(n) & SCROLL_EVENT_BIT) === 0;
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
  let r = "";
  return (e) => {
    let n = r + e;
    r = "";
    if (!n.includes("\x1B")) return false;
    let replaced = n.replace(TERMINAL_REPLY_RE, "");
    if (replaced.length === 0) return true;
    if (replaced.length <= MAX_PARTIAL_ESCAPE && PARTIAL_ESCAPE_RE.test(replaced)) {
      r = replaced;
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
//@ chunk-ksvdmrg0.js:23828-24104 placement
function isMarkdownTooComplex(r) {
  let e = 0;
  let n = 0;
  let s = 0;
  for (let line of r.split(`
`)) {
    let w = 0;
    while (w < line.length && (line[w] === ">" || line[w] === " ")) {
      if (line[w] === ">") s++;
      w++;
    }
    if (/^ {0,3}(?:=+|-+)\s*$/.test(line)) n++;
    for (let p = w; p < line.length; p++) {
      let E = line[p];
      if (E === "[") e++;
      else if (E === "]" && e > 0) e--;
    }
  }
  return e > 256 || n > 64 || s > 512;
}
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
  isMarkdownTooComplex,
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
