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
import {
  stat,
  stat as stat_2,
  mkdtemp,
  open,
  access,
  access as access_2,
  realpath,
  realpath as realpath_2,
  readdir,
} from "fs/promises";
import { join, join as join_2, dirname, dirname as dirname_2 } from "path";
import { tmpdir, homedir, homedir as homedir_2 } from "os";
import { constants } from "fs";
import { spawn } from "child_process";
import { setTimeout as Ve, setTimeout as Yr } from "timers/promises";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession, getHostAuthTokenRefreshCallback } from "../../bootstrap/state.js";
import { jun, Wun } from "../../utils/nativeInstaller/nativeBinaryMissing.js";
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
import { getHostAuthEnvVar, che, Gx, qG, gj, stripHostManagedEnv } from "../../utils/managedEnvConstants.js";
import { lvt } from "../../utils/hostCredsFile.js";
import { JIs, soe, Z0t, stripInternalEntrypoint } from "../../utils/background/envCarry.js";
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

/**
 * 后台会话启动器的进程级状态：daemon 是否确认在线、进行中的确保操作、上次临时拉起时间、前缀状态与持有的信标等，可重置。
 */
//@ chunk-ksvdmrg0.js:6521-6888 placement
class SpawnLauncherState {
  daemonConfirmedUp = !1;
  ensureInFlight = null;
  lastTransientSpawnAt = null;
  prefixAxis = "idle";
  prefixContractViolationLogged = !1;
  tmuxRgbApplied = !1;
  ownedBeacons = new Map();
  reset() {
    ((this.daemonConfirmedUp = !1),
      (this.ensureInFlight = null),
      (this.lastTransientSpawnAt = null),
      (this.prefixAxis = "idle"),
      (this.prefixContractViolationLogged = !1),
      (this.tmuxRgbApplied = !1),
      this.ownedBeacons.clear());
  }
}
//@ chunk-ksvdmrg0.js:6888-6913 placement
var br = new HostScoped(() => new SpawnLauncherState());
//@ chunk-ksvdmrg0.js:6913-6950 placement
function uB() {
  return br.of(getRootSession().host);
}
//@ chunk-ksvdmrg0.js:7256-7396 placement
var STUB_WAIT_MS = 1e4,
  POLL_MS = 250,
  EXTENDED_WAIT_MS = 120000,
  EXTENDED_POLL_MS = 1000,
  INSTALL_IN_PROGRESS_MS = 600000,
  HOMEBREW_WAIT_MS = 1e4,
  HOMEBREW_CASK_RE = /^(.+)\/Caskroom\/[^/]+\/[^/]+\/claude$/,
  NPM_SCOPE_SEGMENT = "/node_modules/@anthropic-ai/",
  FRESH_STUB_MS = 60000;
//@ chunk-ksvdmrg0.js:7396-7613 placement
async function classifyBinaryStub(r) {
  try {
    let e = await stat_2(r);
    if (!e.isFile() || e.size >= jun) return "present";
    return Date.now() - Math.max(e.mtimeMs, e.ctimeMs) < FRESH_STUB_MS ? "fresh_stub" : "stale_stub";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "missing" : "present";
  }
}
//@ chunk-ksvdmrg0.js:7613-7705 placement
var $r = new Set(["ENOENT", "EACCES", "ENOEXEC", "EFTYPE", "ETXTBSY", "EBUSY", "EUNKNOWN", "EPERM"]);
/**
 * 解析 CLAUDE_CODE_PROCESS_WRAPPER 等后台启动器配置
 */
//@ chunk-ksvdmrg0.js:7705-11317 placement
async function resolveAgentLauncher(r, e, { withoutOAuthTokenEnv: n = !1 } = {}) {
  let s = processWrapperError();
  if (s)
    return (
      logFeatureBad("agent_launcher", "invalid_config"),
      {
        err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          s,
          "CLAUDE_CODE_PROCESS_WRAPPER is misconfigured",
        ),
      }
    );
  if (!(await isProcessWrapperUsable()))
    return (
      logFeatureBad("agent_launcher", "launcher_not_runnable"),
      {
        err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting); background sessions are not started unwrapped`,
          "CLAUDE_CODE_PROCESS_WRAPPER launcher is not runnable",
        ),
      }
    );
  let { wrapper: wrapper, invocation: invocation } = withHostOwnedEnv(() => ({
      wrapper: processWrapperArgv(),
      invocation: getLaunchCommand(),
    })),
    { cmd: cmd, prefixArgs: prefixArgs, target: target } = invocation,
    R = [cmd, ...prefixArgs, ...r],
    A = Kr({ dropShellOAuthToken: n || (await hasStoredRefreshToken(e)) });
  if (getPlatform() === "windows") {
    if (processWrapperState().platformIgnored) logFeatureSad("agent_launcher", "platform_unsupported");
    let O = await spawnViaWin32ProcessCreate(R, A);
    if (O.ok) return { err: null };
    (logForDebugging(
      `daemon: WMI spawn failed (${O.reason}); falling back to direct spawn \u2014 daemon will not survive SSH/terminal close`,
      { level: "warn" },
    ),
      logEvent("tengu_bg_daemon_wmi_fallback", {
        timeout: O.reason === "timeout",
        enoent: O.reason === "enoent",
        no_powershell: O.reason === "no-powershell",
        rc: O.rc,
      }));
  }
  let x = getPlatform() === "macos" ? await getMacosAquaSessionWrapper() : [],
    L = await mkdtemp(join_2(tmpdir(), "cc-daemon-")).catch(() => null),
    M = L ? join_2(L, "stderr.log") : void 0,
    U = M ? await open(M, "w").catch(() => null) : null;
  try {
    if (wrapper.length > 0) return { ...(await spawnDaemonProcess(r, A, x, U)), stderrPath: M };
    let O = await spawnDetachedWithHomeCwd(await prependLauncherPrefix(x, R), A, U?.fd),
      { err: err } = O,
      j = getErrnoCode(err),
      ee = !1,
      V;
    if (j !== void 0 && $r.has(j) && Ue(target)) {
      let y = await waitForBinaryRecovery(target);
      if (((ee = !y.recovered && y.installInProgressAtEnd), (V = y.waitedMs), y.recovered)) {
        if (getPlatform() === "windows")
          O = (await spawnViaWin32ProcessCreate(R, A)).ok
            ? { err: null }
            : await spawnDetachedWithHomeCwd(R, A, U?.fd);
        else O = await spawnDetachedWithHomeCwd(await prependLauncherPrefix(x, R), A, U?.fd);
        j = getErrnoCode(O.err);
      }
      if (
        (logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
          waited_ms: y.waitedMs,
          recovered: y.recovered,
          respawn_ok: y.recovered && O.err === null,
          extended: y.extended,
          install_in_progress: y.installInProgressAtEnd,
          errno: sanitizeErrnoForTelemetry(err) ?? lit("unknown"),
          ...(y.recovered &&
            O.err !== null && { respawn_errno: sanitizeErrnoForTelemetry(O.err) ?? lit("unknown") }),
        }),
        y.recovered && O.err === null)
      )
        return (
          logForDebugging(
            `daemon: ${target} was being reinstalled (exec ${getErrnoCode(err)}); started it after ${y.waitedMs}ms`,
          ),
          { ...O, stderrPath: M, recoveredAfterReinstallWait: !0, reinstallWaitedMs: V }
        );
      logForDebugging(
        y.recovered
          ? `daemon: ${target} came back after ${y.waitedMs}ms of an npm reinstall but starting it failed again (exec ${getErrnoCode(O.err)})`
          : `daemon: ${target} not runnable after waiting ${y.waitedMs}ms for an npm reinstall (exec ${getErrnoCode(err)}; install ${y.installInProgressAtEnd ? "still in progress" : y.extended ? "ended" : "not seen"})`,
      );
    }
    let Z = { gaveUpOnNpmInstallInProgress: ee, reinstallWaitedMs: V };
    if (j !== "ENOENT" && j !== "EACCES") return { ...O, stderrPath: M, ...Z };
    let ae = new Set([target]),
      u = withHostOwnedEnv(() => getLaunchCommand({ pinToCurrentBinary: !0 }));
    if (!ae.has(u.target)) {
      (ae.add(u.target),
        logEvent("tengu_bg_daemon_spawn_execpath_fallback", {
          errno_enoent: j === "ENOENT",
          errno_eacces: j === "EACCES",
        }));
      let y = await spawnDetachedWithHomeCwd(
        await prependLauncherPrefix(x, [u.cmd, ...u.prefixArgs, ...r]),
        A,
        U?.fd,
      );
      if (getErrnoCode(y.err) !== "ENOENT") return { ...y, stderrPath: M, ...Z };
    }
    let { link: link, waitedMs: waitedMs } = await waitForHomebrewLink(u.target);
    if (waitedMs > 0) Z.reinstallWaitedMs = (V ?? 0) + waitedMs;
    if (link !== null && !ae.has(link)) {
      (ae.add(link),
        logEvent("tengu_bg_daemon_spawn_homebrew_fallback", {
          errno_enoent: j === "ENOENT",
          errno_eacces: j === "EACCES",
          waited_ms: waitedMs,
        }));
      let y = await spawnDetachedWithHomeCwd(await prependLauncherPrefix(x, [link, ...r]), A, U?.fd);
      if (y.err === null) return { ...y, stderrPath: M, ...Z, recoveredAfterReinstallWait: waitedMs > 0 };
    }
    let T = resolveClaudePath();
    if (!ae.has(T)) {
      (ae.add(T),
        logEvent("tengu_bg_daemon_spawn_launcher_fallback", {
          errno_enoent: j === "ENOENT",
          errno_eacces: j === "EACCES",
        }));
      let y = await spawnDetachedWithHomeCwd(await prependLauncherPrefix(x, [T, ...r]), A, U?.fd);
      if (getErrnoCode(y.err) !== "ENOENT") return { ...y, stderrPath: M, ...Z };
    }
    let G = await findLatestInstalledVersion();
    if (
      (logEvent("tengu_bg_daemon_spawn_versions_fallback", { found: G !== null }), G !== null && !ae.has(G))
    )
      return {
        ...(await spawnDetachedWithHomeCwd(await prependLauncherPrefix(x, [G, ...r]), A, U?.fd)),
        stderrPath: M,
        ...Z,
      };
    return { err: err, stderrPath: M, ...Z };
  } finally {
    await U?.close().catch(() => {});
  }
}
//@ chunk-ksvdmrg0.js:11317-12822 placement
async function spawnDaemonProcess(r, e, n, s) {
  let h = async (L) => {
      let M = withHostOwnedEnv(() => withProcessWrapper(L));
      return spawnDetachedWithHomeCwd(
        await prependLauncherPrefix(n, [M.cmd, ...M.prefixArgs, ...r]),
        e,
        s?.fd,
      );
    },
    w = resolveLaunchTarget();
  if (await isExecutableBinary(w.cmd, { rejectNpmStub: !0 })) return h(w);
  let p = !1,
    E;
  if (Ue(w.cmd)) {
    let L = await waitForBinaryRecovery(w.cmd);
    if (
      ((E = L.waitedMs),
      logEvent("tengu_bg_daemon_spawn_reinstall_wait", {
        waited_ms: L.waitedMs,
        recovered: L.recovered,
        respawn_ok: L.recovered,
        extended: L.extended,
        install_in_progress: L.installInProgressAtEnd,
        probe: !0,
      }),
      L.recovered)
    )
      return { ...(await h(w)), recoveredAfterReinstallWait: !0, reinstallWaitedMs: E };
    p = L.installInProgressAtEnd;
  }
  let S = resolveLaunchTarget({ pinToCurrentBinary: !0 });
  if (S.cmd !== w.cmd && (await isExecutableBinary(S.cmd)))
    return (
      logEvent("tengu_bg_daemon_spawn_execpath_fallback", { errno_enoent: !1, errno_eacces: !1, probe: !0 }),
      { ...(await h(S)), reinstallWaitedMs: E }
    );
  let { link: link, waitedMs: waitedMs } = await waitForHomebrewLink(S.cmd);
  if (waitedMs > 0) E = (E ?? 0) + waitedMs;
  if (link !== null && (await isExecutableBinary(link)))
    return (
      logEvent("tengu_bg_daemon_spawn_homebrew_fallback", {
        errno_enoent: !1,
        errno_eacces: !1,
        probe: !0,
        waited_ms: waitedMs,
      }),
      {
        ...(await h({ cmd: link, prefixArgs: [], target: link })),
        recoveredAfterReinstallWait: waitedMs > 0,
        reinstallWaitedMs: E,
      }
    );
  let x = await findLatestInstalledVersion();
  if (
    (logEvent("tengu_bg_daemon_spawn_versions_fallback", { found: x !== null, probe: !0 }),
    x !== null && x !== S.cmd && (await isExecutableBinary(x)))
  )
    return { ...(await h({ cmd: x, prefixArgs: [], target: x })), reinstallWaitedMs: E };
  return (
    logFeatureBad("agent_launcher", "no_runnable_target"),
    {
      err: new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `no runnable Claude Code binary was found to run through the configured launcher \u2014 last tried: ${x ?? S.cmd}`,
        "no runnable claude binary for the configured launcher",
      ),
      gaveUpOnNpmInstallInProgress: p,
      reinstallWaitedMs: E,
    }
  );
}
//@ chunk-ksvdmrg0.js:12822-12980 placement
async function isExecutableBinary(r, e = {}) {
  try {
    let n = await stat_2(r);
    if (!n.isFile()) return !1;
    if (e.rejectNpmStub && n.size < jun) return !1;
    return (await access_2(r, constants.X_OK), !0);
  } catch {
    return !1;
  }
}
//@ chunk-ksvdmrg0.js:12980-13036 placement
function Ue(r) {
  return r.replace(/\\/g, "/").includes(NPM_SCOPE_SEGMENT);
}
//@ chunk-ksvdmrg0.js:13036-13224 placement
async function getHomebrewLink(r) {
  let e = HOMEBREW_CASK_RE.exec(r)?.[1];
  if (e === void 0) return null;
  let n = join_2(e, "bin", "claude"),
    s = await realpath_2(n).catch(() => null);
  return s !== null && s !== r && s.startsWith(`${e}/Caskroom/`) ? n : null;
}
/**
 * 等待 Homebrew cask 升级完成后出现可执行的 bin/claude 链接（有上限），放弃时记 tengu_bg_daemon_spawn_homebrew_wait_gave_up。
 */
//@ chunk-ksvdmrg0.js:13224-13534 placement
async function waitForHomebrewLink(r) {
  for (let e = 0; ; e += POLL_MS) {
    let n =
        HOMEBREW_CASK_RE.test(r) &&
        (await stat_2(`${dirname_2(r)}.upgrading`).then(
          () => !0,
          () => !1,
        )),
      s = await getHomebrewLink(r);
    if ((n || e > 0) && s !== null && !(await isExecutableBinary(s))) s = null;
    if (s !== null || !n || e >= HOMEBREW_WAIT_MS) {
      if (s === null && e > 0) logEvent("tengu_bg_daemon_spawn_homebrew_wait_gave_up", { waited_ms: e });
      return { link: s, waitedMs: e };
    }
    await sleep(POLL_MS);
  }
}
/**
 * 判断 npm 是否正在安装 @anthropic-ai 包（包目录旁有近期创建的 .包名- 临时目录）。
 */
//@ chunk-ksvdmrg0.js:13534-13943 placement
async function isNpmInstallInProgress(r) {
  let index = r.replace(/\\/g, "/").indexOf(NPM_SCOPE_SEGMENT);
  if (index === -1) return !1;
  let sliced = r.slice(0, index + NPM_SCOPE_SEGMENT.length - 1),
    s = r.slice(index + NPM_SCOPE_SEGMENT.length).split(/[\\/]/)[0];
  if (!s) return !1;
  let h = `.${s}-`,
    w;
  try {
    w = await readdir(sliced, { withFileTypes: !0 });
  } catch {
    return !1;
  }
  for (let p of w) {
    if (!p.isDirectory() || !p.name.startsWith(h)) continue;
    try {
      let E = await stat_2(join_2(sliced, p.name));
      if (Date.now() - Math.max(E.ctimeMs, E.mtimeMs) < INSTALL_IN_PROGRESS_MS) return !0;
    } catch {}
  }
  return !1;
}
/**
 * 二进制暂时不可执行（npm 占位）时轮询等待恢复：先短等，若检测到安装进行中再延长等待。
 */
//@ chunk-ksvdmrg0.js:13943-14502 placement
async function waitForBinaryRecovery(r) {
  let deadline = Date.now(),
    n = deadline + STUB_WAIT_MS;
  while (Date.now() < n)
    if ((await sleep(POLL_MS), await isExecutableBinary(r, { rejectNpmStub: !0 })))
      return { recovered: !0, waitedMs: Date.now() - deadline, extended: !1, installInProgressAtEnd: !1 };
  let installInProgress = await isNpmInstallInProgress(r);
  if (!installInProgress)
    return { recovered: !1, waitedMs: Date.now() - deadline, extended: !1, installInProgressAtEnd: !1 };
  let extendedDeadline = deadline + EXTENDED_WAIT_MS;
  while (Date.now() < extendedDeadline) {
    if ((await sleep(EXTENDED_POLL_MS), await isExecutableBinary(r, { rejectNpmStub: !0 })))
      return {
        recovered: !0,
        waitedMs: Date.now() - deadline,
        extended: !0,
        installInProgressAtEnd: installInProgress,
      };
    if (!installInProgress) break;
    installInProgress = await isNpmInstallInProgress(r);
  }
  return {
    recovered: !1,
    waitedMs: Date.now() - deadline,
    extended: !0,
    installInProgressAtEnd: installInProgress,
  };
}
//@ chunk-ksvdmrg0.js:14502-14637 placement
async function spawnDetachedWithHomeCwd(r, e, n) {
  let s;
  try {
    s = homedir_2();
  } catch {
    s = void 0;
  }
  let h = await spawnDetached(r, e, n, s);
  if (s !== void 0 && h.err) return spawnDetached(r, e, n, void 0);
  return h;
}
/**
 * 以分离模式启动进程（可指定 cwd），等一个事件循环检查启动错误，返回子进程 pid 与退出 Promise 或错误。
 */
//@ chunk-ksvdmrg0.js:14637-15023 placement
async function spawnDetached(r, e, n, s) {
  let h = null,
    w;
  try {
    let p = spawn(r[0], r.slice(1), {
      detached: !0,
      stdio: ["ignore", "ignore", n ?? "ignore"],
      windowsHide: !0,
      env: e,
      ...(s !== void 0 && { cwd: s }),
    });
    (moveKeeperPid(p.pid),
      p.once("error", (E) => {
        h = E;
      }),
      (w = {
        pid: p.pid,
        exited: new Promise((E) => {
          p.once("exit", (S, R) => E({ code: S, signal: R }));
        }),
      }),
      p.unref());
  } catch (error) {
    h = error;
  }
  return (await new Promise((p) => setImmediate(p)), h ? { err: h } : { err: null, child: w });
}
/**
 * macOS 后台守护进程用：试运行 /bin/launchctl asuser <uid> /usr/bin/true，成功则返回该前缀让子进程进入用户 GUI（Aqua）会话；打 tengu_bg_daemon_macos_aqua_wrap。
 */
//@ chunk-ksvdmrg0.js:15023-15500 placement = spawnCaffeinate (0.305)
async function getMacosAquaSessionWrapper() {
  let r = process.getuid?.();
  if (r === void 0) return [];
  let promise = await new Promise((n) => {
    let s = !1,
      h,
      w = (E) => {
        if (s) return;
        ((s = !0), clearTimeout(p), n(E));
      },
      p = setTimeout(() => {
        (h.kill(), w(!1));
      }, 5000);
    p.unref();
    try {
      h = spawn("/bin/launchctl", ["asuser", String(r), "/usr/bin/true"], {
        stdio: "ignore",
        windowsHide: !0,
      });
    } catch {
      w(!1);
      return;
    }
    (h.once("error", () => w(!1)), h.once("exit", (err) => w(err === 0)));
  });
  return (
    logEvent("tengu_bg_daemon_macos_aqua_wrap", { has_gui: promise }),
    promise ? ["/bin/launchctl", "asuser", String(r)] : []
  );
}
//@ chunk-ksvdmrg0.js:15500-15624 placement
async function prependLauncherPrefix(r, e) {
  if (r.length === 0) return e;
  let n = e[0];
  if (!(await isExecutableBinary(n, { rejectNpmStub: Ue(n) }))) return e;
  return [...r, ...e];
}
/**
 * Windows 上通过 PowerShell（EncodedCommand）调用 Win32_Process.Create 启动分离进程，5 秒超时；返回 ok 或失败原因。
 */
//@ chunk-ksvdmrg0.js:15624-16277 placement
async function spawnViaWin32ProcessCreate(r, e) {
  let script;
  try {
    script = WINDOWS_DETACHED_SPAWN_SCRIPT(Fr(r));
  } catch (error) {
    return { ok: !1, reason: errorMessage(error) };
  }
  let powershellPath = await getCachedPowerShellPath();
  if (!powershellPath) return { ok: !1, reason: "no-powershell" };
  let str = Buffer.from(script, "utf16le").toString("base64");
  return new Promise((w) => {
    let p = !1,
      E,
      S = (x) => {
        if (p) return;
        ((p = !0), clearTimeout(A), w(x));
      },
      R = (x) => S({ ok: !1, reason: getErrnoCode(x) === "ENOENT" ? "enoent" : errorMessage(x) }),
      A = setTimeout(() => {
        (E.kill(), S({ ok: !1, reason: "timeout" }));
      }, 5000);
    A.unref();
    try {
      E = spawn(powershellPath, ["-NoProfile", "-NonInteractive", "-EncodedCommand", str], {
        stdio: "ignore",
        windowsHide: !0,
        env: e,
      });
    } catch (error) {
      R(error);
      return;
    }
    (E.once("error", R),
      E.once("exit", (x) => {
        if (x === 0) S({ ok: !0 });
        else S({ ok: !1, reason: `Win32_Process.Create rc=${x}`, rc: x ?? void 0 });
      }));
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
function Fr(r) {
  return r.map(quoteWindowsArg).join(" ");
}
/**
 * 按 Windows 命令行规则给参数加引号并转义反斜杠与双引号。
 */
//@ chunk-ksvdmrg0.js:16825-17077 placement
function quoteWindowsArg(r) {
  if (r.length > 0 && !/[\s"]/.test(r)) return r;
  let e = '"',
    n = 0;
  while (n < r.length) {
    let s = 0;
    while (r[n] === "\\") (s++, n++);
    if (n === r.length) e += "\\".repeat(s * 2);
    else if (r[n] === '"') ((e += "\\".repeat(s * 2 + 1) + '"'), n++);
    else ((e += "\\".repeat(s) + r[n]), n++);
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
  if (getPlatform() === "macos" || !e) return !1;
  return !!(await getSecureStorage().readAsync(r))?.claudeAiOauth?.refreshToken;
}
//@ chunk-ksvdmrg0.js:17396-17432 placement
function Kr(r) {
  return withHostOwnedEnv(() => DAEMON_FORWARDED_ENV(r));
}
//@ chunk-ksvdmrg0.js:17432-19118 placement
function DAEMON_FORWARDED_ENV(r) {
  let e = getPreSettingsEnvHonoringLiveDeletions();
  e.INVOCATION_ID = "";
  let n = process.env[PROCESS_WRAPPER_ENV];
  if (n) e[PROCESS_WRAPPER_ENV] = n;
  else delete e[PROCESS_WRAPPER_ENV];
  let s = new Set(
    [
      "CLAUDE_CODE_OAUTH_TOKEN",
      getHostAuthEnvVar(e),
      getHostAuthTokenRefreshCallback()
        ? getHostAuthEnvVar({ CLAUDE_CODE_HOST_AUTH_ENV_VAR: lvt() })
        : void 0,
    ].flatMap((p) => (p === void 0 ? [] : [p.toUpperCase()])),
  );
  for (let p of Object.keys(e)) {
    if (!s.has(p.toUpperCase())) continue;
    let E = process.env[p];
    if (E === void 0) delete e[p];
    else if (!isSettingsSourcedEnvValue(p, E)) e[p] = E;
  }
  (delete e.CLAUDECODE,
    delete e.CLAUDE_CODE_SESSION_ID,
    delete e.CLAUDE_CODE_CHILD_SESSION,
    delete e.CLAUDE_CODE_SESSION_ATTENDED,
    delete e.CLAUDE_CODE_CHROME_MCP_ORG_DENIED,
    delete e.CLAUDE_CODE_EVAL_INTERVIEW_SESSION,
    delete e.CLAUDE_CODE_BRIDGE_SESSION_ID,
    delete e.CLAUDE_CODE_HOST_WORKTREE,
    delete e.CLAUDE_CODE_HOST_WORKTREE_FENCE,
    JIs(e));
  for (let p of Object.keys(e)) {
    let upper = p.toUpperCase();
    if (
      upper === "CLAUDE_CODE_PLUGIN_DIRS" ||
      upper === "CLAUDE_CODE_ATTRIBUTION_PROJECT" ||
      upper === "CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS" ||
      upper === "CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES"
    )
      delete e[p];
  }
  (soe(e),
    Z0t(e),
    delete e.CLAUDE_BG_SESSION_PERMISSION_RULES,
    delete e.CLAUDE_BG_MEMORY_TOGGLED_OFF,
    delete e.CLAUDE_BG_AUTO_MEMORY_OFF,
    delete e.CLAUDE_BG_GATEWAY_WITHHELD,
    stripInternalEntrypoint(e));
  let h = new Set(["CLAUDE_BG_AUTH_SNAPSHOT_PATH", ...che].map((p) => p.toUpperCase()));
  for (let p of Object.keys(e)) if (h.has(p.toUpperCase())) delete e[p];
  let w = getHostAuthEnvVar(e);
  if (isEnvTruthy(e.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) {
    for (let p of [...Gx, ...qG, ...gj]) delete e[p];
    if ((stripHostManagedEnv(e), delete e.ANTHROPIC_CUSTOM_HEADERS, w)) delete e[w];
    (delete e.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST,
      delete e.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
      delete e.CLAUDE_CODE_HOST_GATEWAY_LINEAGE);
  }
  if (r.dropShellOAuthToken || isLoginStashedInTokenSlot()) {
    for (let p of Object.keys(e)) if (p.toUpperCase() === "CLAUDE_CODE_OAUTH_TOKEN") delete e[p];
  }
  return e;
}
//@ chunk-ksvdmrg0.js:19118-19148 placement
var gt = 120000,
  Mt = 5000,
  $t = 5000;
//@ chunk-ksvdmrg0.js:19148-19375 placement
function createSpawnAttempt(r) {
  let e = {
    ...r,
    childExit: null,
    childExitAt: null,
    stderr: null,
    budgetExtended: !1,
    nextLivenessProbeAt: r.spawnIssuedAt + Mt,
    siblingHolderSeen: !1,
  };
  return (
    r.child?.exited.then((n) => {
      ((e.childExit = n), (e.childExitAt = Date.now()));
    }),
    e
  );
}
//@ chunk-ksvdmrg0.js:19375-19646 placement
async function isNpmStubSpawnFailure(r, e) {
  let childExit = r.childExit;
  if (!childExit || r.siblingHolderSeen) return !1;
  if (childExit.code === 0 && childExit.signal === null) return !1;
  if (!Ue(e)) return !1;
  switch (await classifyBinaryStub(e)) {
    case "missing":
    case "fresh_stub":
      return !0;
    case "stale_stub":
      return !1;
    case "present":
      return (await readSpawnStderr(r)).includes(Wun);
  }
}
/**
 * 按守护进程 stderr 内容归类失败原因（npm 占位、cwd 被删、launchctl、模块缺失、运行时崩溃、Claude 报错、其他）。
 */
//@ chunk-ksvdmrg0.js:19646-20241 placement
function classifyDaemonStderr(stderr) {
  if (stderr.trim().length === 0) return;
  if (stderr.includes(Wun)) return lit("npm_stub");
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
async function readSpawnStderr(r, e = !1) {
  if (r.stderr === null || e)
    r.stderr = r.stderrPath ? ((await readSmallFileOrNull(r.stderrPath, 1048576)) ?? "").slice(0, 2000) : "";
  return r.stderr;
}
//@ chunk-ksvdmrg0.js:20381-20661 placement
async function shouldStopWaitingForDaemon(r) {
  let childExit = r.childExit;
  if (!childExit || r.siblingHolderSeen) return !1;
  if (!r.budgetExtended) {
    if ((await readSpawnStderr(r)).trim().length === 0) return !1;
    if (r.wrapperConfigured && childExit.code === 0 && childExit.signal === null) return !1;
  }
  let n = await hasFreshDaemonLock(r, LOCK_PROBE_LIMITS);
  if (n !== !1) return ((r.siblingHolderSeen = n === !0), !1);
  return !0;
}
/**
 * 轮询守护进程控制 socket 直到 ping 成功或超时；子进程已失败则提前放弃；期间检测到同级锁持有者时延长期限。
 */
//@ chunk-ksvdmrg0.js:20661-21053 placement
async function waitForDaemonUp(r, e, n) {
  let s = e;
  while (!0) {
    if (await shouldStopWaitingForDaemon(r)) return !1;
    if (Date.now() >= s) return !1;
    if ((await controlRequest({ proto: BG_PROTO, op: "ping" })).ok) return !0;
    if (n && Date.now() >= r.nextLivenessProbeAt) {
      r.nextLivenessProbeAt = Date.now() + Mt;
      let p = await hasFreshDaemonLock(r, 1);
      if (!r.budgetExtended && p === !0) ((r.budgetExtended = !0), (s = Math.max(s, r.spawnIssuedAt + gt)));
      else if (r.budgetExtended && p === !1 && Date.now() >= e) return !1;
    }
    await Yr(100);
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
  return n !== null && !n.bgDisabled && n.startedAt >= r.spawnIssuedAt - $t;
}
/**
 * 超时时描述守护进程锁的状态（不存在、不可读、自己的子进程、其他进程存活/已死/无权限）及持有者年龄与版本差异，用于遥测。
 */
//@ chunk-ksvdmrg0.js:21194-22324 placement
async function describeDaemonLockAtDeadline(r) {
  let lock;
  try {
    lock = await readDaemonLock(r.storageV5);
  } catch {
    return { lock_at_deadline: lit("unreadable") };
  }
  if (!lock) return { lock_at_deadline: lit("absent") };
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
  if ((r.child?.pid !== void 0 && lock.pid === r.child.pid) || lock.startedAt >= r.spawnIssuedAt - $t)
    return { lock_at_deadline: lit("self_child"), ...holderInfo };
  try {
    process.kill(lock.pid, 0);
  } catch (error) {
    if (getErrnoCode(error) !== "EPERM") return { lock_at_deadline: lit("other_dead"), ...holderInfo };
    return {
      lock_at_deadline: (await verifyLockHolder(lock)) ? lit("other_eperm_stale") : lit("other_eperm"),
      ...holderInfo,
    };
  }
  return {
    lock_at_deadline: (await waitForProcessExit(lock.pid, procIdentityOf(lock), 1).catch(() => !1))
      ? lit("other_alive")
      : lit("other_dead"),
    ...holderInfo,
  };
}
/**
 * 输入是否不按普通提示处理：非 prompt 模式、斜杠命令，或当前会话处于有问题待答的阻塞状态。
 */
//@ chunk-ksvdmrg0.js:22484-22621 placement
function isNonPromptInput(r, e) {
  let trimStart = r.trimStart();
  return (
    getModeFromInput(trimStart) !== "prompt" ||
    trimStart.startsWith("/") ||
    (e?.tempo === "blocked" && (e.block?.questions.length ?? 0) > 0)
  );
}
//@ chunk-ksvdmrg0.js:22621-22716 placement
function imt(r) {
  return r.queuedPrompt !== void 0 && isNonPromptInput(r.queuedPrompt, null) ? void 0 : r.queuedPrompt;
}
//@ chunk-ksvdmrg0.js:22716-22769 placement
function vho(r, e) {
  return (
    r === e ||
    r.endsWith(`

${e}`)
  );
}
/**
 * 把输入作为排队提示写入作业状态（非普通提示时不写）；可与已有草稿合并。
 */
//@ chunk-ksvdmrg0.js:22769-22973 placement
async function queuePromptForJob(r, e, n, s, h) {
  if (isNonPromptInput(n, null)) return !1;
  let w = h ? imt(e) : void 0;
  return writeStateAtomic(
    r,
    {
      ...e,
      queuedPrompt: !w
        ? n
        : vho(w, n)
          ? w
          : `${w}

${n}`,
      updatedAt: new Date().toISOString(),
    },
    s,
  ).then(
    () => !0,
    (p) => (logJobWriteError(p), !1),
  );
}
//@ chunk-ksvdmrg0.js:22973-23155 placement
var TERMINAL_REPLY_RE =
  /\x1b\[(?:<\d+;\d+;\d+[Mm]|M[\s\S]{3}|I|O|\??\d+;\d+(?:;\d+)*R|[?>]\d+(?:;\d+)*c|\?\d+(?:;\d+)*\$y|\?997;[12]n|\?\d+u)|\x1bP[^\x1b]*\x1b\\|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
//@ chunk-ksvdmrg0.js:23155-23237 placement
function Vt(r) {
  if (!r.includes("\x1B")) return !1;
  return r.replace(TERMINAL_REPLY_RE, "").length === 0;
}
//@ chunk-ksvdmrg0.js:23237-23283 placement
var Jr = "\x1B[<",
  qr = /^(\d+);\d+;\d+[Mm]/,
  Xr = 96;
//@ chunk-ksvdmrg0.js:23283-23399 placement
function hasNonReportingMouseMode(r) {
  return r
    .split(Jr)
    .slice(1)
    .some((e) => {
      let n = qr.exec(e)?.[1];
      return n !== void 0 && (Number(n) & Xr) === 0;
    });
}
//@ chunk-ksvdmrg0.js:23399-23523 placement
var MAX_PARTIAL_ESCAPE = 64,
  PARTIAL_ESCAPE_RE =
    /^\x1b(?:$|\[(?:[<?>]?\d*(?:;\d*)*\$?|M[\s\S]{0,2})$|P(?:$|[>01][^\x1b]*\x1b?$)|\](?:$|\d[^\x07\x1b]*\x1b?$))/;
/**
 * 返回判断一段输入是否只含终端应答序列（鼠标、光标位置、DA、DECRQM 等）的函数，跨块保留未完成的转义序列。
 */
//@ chunk-ksvdmrg0.js:23523-23706 placement
function createTerminalReplyFilter() {
  let r = "";
  return (e) => {
    let n = r + e;
    if (((r = ""), !n.includes("\x1B"))) return !1;
    let replaced = n.replace(TERMINAL_REPLY_RE, "");
    if (replaced.length === 0) return !0;
    if (replaced.length <= MAX_PARTIAL_ESCAPE && PARTIAL_ESCAPE_RE.test(replaced))
      return ((r = replaced), !0);
    return !1;
  };
}
//@ chunk-ksvdmrg0.js:23784-23828 placement
var Gt = 262144,
  on = 32768,
  an = 200,
  sn = 4096,
  ln = 50;
//@ chunk-ksvdmrg0.js:23828-24104 placement
function isMarkdownTooComplex(r) {
  let e = 0,
    n = 0,
    s = 0;
  for (let h of r.split(`
`)) {
    let w = 0;
    while (w < h.length && (h[w] === ">" || h[w] === " ")) {
      if (h[w] === ">") s++;
      w++;
    }
    if (/^ {0,3}(?:=+|-+)\s*$/.test(h)) n++;
    for (let p = w; p < h.length; p++) {
      let E = h[p];
      if (E === "[") e++;
      else if (E === "]" && e > 0) e--;
    }
  }
  return e > 256 || n > 64 || s > 512;
}

export {
  queuePromptForJob,
  isNonPromptInput,
  uB,
  imt,
  vho,
  an,
  on,
  sn,
  ln,
  isMarkdownTooComplex,
  Gt,
  Vt,
  hasNonReportingMouseMode,
  resolveAgentLauncher,
  EXTENDED_WAIT_MS,
  createSpawnAttempt,
  waitForDaemonUp,
  isNpmStubSpawnFailure,
  waitForBinaryRecovery,
  gt,
  shouldStopWaitingForDaemon,
  readSpawnStderr,
  classifyDaemonStderr,
  describeDaemonLockAtDeadline,
  isExecutableBinary,
  createTerminalReplyFilter,
};
