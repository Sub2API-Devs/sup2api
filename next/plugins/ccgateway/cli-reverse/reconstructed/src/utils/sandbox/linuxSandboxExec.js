/**
 * utils/sandbox/linuxSandboxExec.ts
 *
 * 2.1.316 新增：Linux 沙箱执行辅助：/proc/self/exe 内嵌的 apply-seccomp、AppArmor 用户命名空间限制检测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qg41pqt6.js (12)
 * attribution: placement 12
 */
import { openSync, readFileSync } from "fs";
import { isStandaloneExecutable as isStandaloneExecutable_2 } from "../slowOperations.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { SandboxFilesystemConfigSchema } from "../../entrypoints/sandboxTypes.js";
import { logForDebugging } from "../debug.js";
import { stripControlChars } from "../settings/writeQueues.js";
import { safeExecFileSync } from "../safeSpawn.js";

//@ chunk-qg41pqt6.js:905932-905954 placement
/**
 * APPLY_SECCOMP_FD：apply-seccomp 的 fd 编号；MAX_SECCOMP_POLICY_BYTES：seccomp 策略字节上限（同一声明共 2 个绑定）。
 */
var APPLY_SECCOMP_FD = 3;
var MAX_SECCOMP_POLICY_BYTES = 2097152;
//@ chunk-qg41pqt6.js:905954-905980 placement
function isStandaloneExecutable() {
  return isStandaloneExecutable_2();
}
//@ chunk-qg41pqt6.js:905980-906219 placement
/**
 * 打开 /proc/self/exe 以运行内嵌的 apply-seccomp。
 */
async function openSelfExeForSeccomp() {
  if (!isStandaloneExecutable()) return;
  try {
    return openSync("/proc/self/exe", MAX_SECCOMP_POLICY_BYTES);
  } catch (error) {
    let openError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `sandbox: failed to open /proc/self/exe for the embedded apply-seccomp helper: ${errorMessage(error)}`,
      "sandbox: failed to open /proc/self/exe",
    );
    logError(openError);
    throw openError;
  }
}
//@ chunk-qg41pqt6.js:906219-906313 placement
/**
 * seccompExecPlan：构造 apply-seccomp 执行方案。
 */
function seccompExecPlan() {
  if (!isStandaloneExecutable()) return;
  return {
    applyPath: `/proc/self/fd/${APPLY_SECCOMP_FD}`,
    argv0: "apply-seccomp",
  };
}
//@ chunk-qg41pqt6.js:906313-906388 placement
/**
 * wrapWithSeccompExec：给命令加上 seccomp 执行前缀。
 */
function wrapWithSeccompExec(command) {
  return seccompExecPlan() === undefined ? command : `exec ${APPLY_SECCOMP_FD}<&- || exit 126; ${command}`;
}
//@ chunk-qg41pqt6.js:906388-906447 placement
function assertMarkedPathsResolved(config) {
  if (config === undefined || SandboxFilesystemConfigSchema(config)) return config;
  throw new MarkedPathEntryError();
}
//@ chunk-qg41pqt6.js:906447-906612 placement
class MarkedPathEntryError extends Error {
  constructor() {
    super("sandbox-runtime config holds a literal path entry; Claude Code writes only spellings");
    this.name = "MarkedPathEntryError";
  }
}
//@ chunk-qg41pqt6.js:906879-907086 placement
var APPARMOR_USERNS_PROBE_PATH = "/proc/sys/kernel/apparmor_restrict_unprivileged_userns";
var APPARMOR_USERNS_ERROR_RE = /setting up uid map: Permission denied|Failed RTM_NEWADDR/;
var APPARMOR_USERNS_PROBE_ARGS = ["--unshare-user", "--unshare-net", "--dev-bind", "/", "/", "/bin/true"];
var APPARMOR_PROBE_TIMEOUT_MS = 2000;
//@ chunk-qg41pqt6.js:907086-907952 placement
/**
 * 检测 Ubuntu AppArmor 对非特权用户命名空间的限制（会阻止 bubblewrap），给出加 profile 的建议。
 */
function checkAppArmorUserNamespaces(probe) {
  try {
    if (probe.readRestrictionSwitch()?.trim() !== "1") return;
    let bubblewrap = probe.resolveBubblewrap();
    if (bubblewrap === null) return;
    let trial = probe.tryBubblewrap(bubblewrap);
    if (!trial.ran || trial.exitCode === 0) return;
    logForDebugging(
      `[sandbox] kernel.apparmor_restrict_unprivileged_userns=1 and the bubblewrap trial (${bubblewrap} ${APPARMOR_USERNS_PROBE_ARGS.join(" ")}) exited ${trial.exitCode}: ${trial.stderr.trim()}`,
      {
        level: "warn",
      },
    );
    let probeOutput = stripControlChars(trial.stderr);
    if (!APPARMOR_USERNS_ERROR_RE.test(probeOutput)) return;
    return `Ubuntu's AppArmor restriction on user namespaces stops bubblewrap here ("${probeOutput
      .split(
        `
`,
      )
      .map((line) => line.trim().replace(/^bwrap: /, ""))
      .find((line) => APPARMOR_USERNS_ERROR_RE.test(line))
      ?.slice(
        0,
        80,
      )}"). Add bubblewrap's AppArmor profile from https://code.claude.com/docs/en/sandboxing, or run \`sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0\` (holds until reboot), then restart Claude Code`;
  } catch (error) {
    logForDebugging(`[sandbox] the AppArmor user-namespace check could not be made: ${error}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-qg41pqt6.js:907952-908039 placement
/**
 * linuxSandboxProbes：Linux 沙箱依赖探测集合。
 */
function linuxSandboxProbes(resolveBubblewrap) {
  return {
    readRestrictionSwitch: apparmorUsernsSetting,
    resolveBubblewrap,
    tryBubblewrap: probeBubblewrapSpawn,
  };
}
//@ chunk-qg41pqt6.js:908039-908095 placement
function apparmorUsernsSetting() {
  try {
    return readFileSync(APPARMOR_USERNS_PROBE_PATH, "utf8");
  } catch {
    return;
  }
}
//@ chunk-qg41pqt6.js:908095-908440 placement (2.1.88 match: isMacOsKeychainLocked, 0.393)
/**
 * 试跑一次 bubblewrap（干净 PATH、cwd=/、带超时），返回 {ran, exitCode, stderr}，用于沙箱依赖检查判断 bwrap 能否启动。旧版名 isMacOsKeychainLocked 错配，应归沙箱依赖探测。
 */
function probeBubblewrapSpawn(bubblewrapPath) {
  try {
    let trial = safeExecFileSync(bubblewrapPath, APPARMOR_USERNS_PROBE_ARGS, {
      cwd: "/",
      env: {
        PATH: "/usr/bin:/bin",
        USER_TYPE: "external",
        NODE_ENV: "production",
      },
      extendEnv: false,
      stdio: ["ignore", "ignore", "pipe"],
      reject: false,
      timeout: APPARMOR_PROBE_TIMEOUT_MS,
    });
    return {
      ran: !trial.timedOut && trial.signal === undefined && typeof trial.exitCode === "number",
      exitCode: trial.exitCode ?? null,
      stderr: trial.stderr,
    };
  } catch {
    return {
      ran: false,
      exitCode: null,
      stderr: "",
    };
  }
}
export {
  APPLY_SECCOMP_FD,
  wrapWithSeccompExec,
  openSelfExeForSeccomp,
  seccompExecPlan,
  assertMarkedPathsResolved,
  checkAppArmorUserNamespaces,
  linuxSandboxProbes,
};
