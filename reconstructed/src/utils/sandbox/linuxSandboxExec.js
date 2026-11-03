/**
 * utils/sandbox/linuxSandboxExec.ts
 *
 * 2.1.316 新增：Linux 沙箱执行辅助：/proc/self/exe 内嵌的 apply-seccomp、AppArmor 用户命名空间限制检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fq0cr76a.js (12)
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

//@ chunk-fq0cr76a.js:901112-901134 placement
/**
 * APPLY_SECCOMP_FD：apply-seccomp 的 fd 编号；MAX_SECCOMP_POLICY_BYTES：seccomp 策略字节上限（同一声明共 2 个绑定）。
 */
var APPLY_SECCOMP_FD = 3;
var MAX_SECCOMP_POLICY_BYTES = 2097152;
//@ chunk-fq0cr76a.js:901134-901160 placement
function isStandaloneExecutable() {
  return isStandaloneExecutable_2();
}
//@ chunk-fq0cr76a.js:901160-901399 placement
/**
 * 打开 /proc/self/exe 以运行内嵌的 apply-seccomp。
 */
async function openSelfExeForSeccomp() {
  if (!isStandaloneExecutable()) return;
  try {
    return openSync("/proc/self/exe", MAX_SECCOMP_POLICY_BYTES);
  } catch (error) {
    let n = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `sandbox: failed to open /proc/self/exe for the embedded apply-seccomp helper: ${errorMessage(error)}`,
      "sandbox: failed to open /proc/self/exe",
    );
    logError(n);
    throw n;
  }
}
//@ chunk-fq0cr76a.js:901399-901493 placement
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
//@ chunk-fq0cr76a.js:901493-901568 placement
/**
 * wrapWithSeccompExec：给命令加上 seccomp 执行前缀。
 */
function wrapWithSeccompExec(e) {
  return seccompExecPlan() === undefined ? e : `exec ${APPLY_SECCOMP_FD}<&- || exit 126; ${e}`;
}
//@ chunk-fq0cr76a.js:901568-901627 placement
function assertMarkedPathsResolved(config) {
  if (config === undefined || SandboxFilesystemConfigSchema(config)) return config;
  throw new MarkedPathEntryError();
}
//@ chunk-fq0cr76a.js:901627-901792 placement
class MarkedPathEntryError extends Error {
  constructor() {
    super("sandbox-runtime config holds a literal path entry; Claude Code writes only spellings");
    this.name = "MarkedPathEntryError";
  }
}
//@ chunk-fq0cr76a.js:902059-902266 placement
var APPARMOR_USERNS_PROBE = "/proc/sys/kernel/apparmor_restrict_unprivileged_userns";
var APPARMOR_USERNS_PROBE_PATH = /setting up uid map: Permission denied|Failed RTM_NEWADDR/;
var APPARMOR_USERNS_ERROR_RE = ["--unshare-user", "--unshare-net", "--dev-bind", "/", "/", "/bin/true"];
var uidMapDeniedReason = 2000;
//@ chunk-fq0cr76a.js:902266-903132 placement
/**
 * 检测 Ubuntu AppArmor 对非特权用户命名空间的限制（会阻止 bubblewrap），给出加 profile 的建议。
 */
function checkAppArmorUserNamespaces(e) {
  try {
    if (e.readRestrictionSwitch()?.trim() !== "1") return;
    let bubblewrap = e.resolveBubblewrap();
    if (bubblewrap === null) return;
    let r = e.tryBubblewrap(bubblewrap);
    if (!r.ran || r.exitCode === 0) return;
    logForDebugging(
      `[sandbox] kernel.apparmor_restrict_unprivileged_userns=1 and the bubblewrap trial (${bubblewrap} ${APPARMOR_USERNS_ERROR_RE.join(" ")}) exited ${r.exitCode}: ${r.stderr.trim()}`,
      {
        level: "warn",
      },
    );
    let s = stripControlChars(r.stderr);
    if (!APPARMOR_USERNS_PROBE_PATH.test(s)) return;
    return `Ubuntu's AppArmor restriction on user namespaces stops bubblewrap here ("${s
      .split(
        `
`,
      )
      .map((line) => line.trim().replace(/^bwrap: /, ""))
      .find((y) => APPARMOR_USERNS_PROBE_PATH.test(y))
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
//@ chunk-fq0cr76a.js:903132-903219 placement
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
//@ chunk-fq0cr76a.js:903219-903275 placement
function apparmorUsernsSetting() {
  try {
    return readFileSync(APPARMOR_USERNS_PROBE, "utf8");
  } catch {
    return;
  }
}
//@ chunk-fq0cr76a.js:903275-903620 placement = isMacOsKeychainLocked (0.393)
/**
 * 试跑一次 bubblewrap（干净 PATH、cwd=/、带超时），返回 {ran, exitCode, stderr}，用于沙箱依赖检查判断 bwrap 能否启动。旧版名 isMacOsKeychainLocked 错配，应归沙箱依赖探测。
 */
function probeBubblewrapSpawn(e) {
  try {
    let n = safeExecFileSync(e, APPARMOR_USERNS_ERROR_RE, {
      cwd: "/",
      env: {
        PATH: "/usr/bin:/bin",
        USER_TYPE: "external",
        NODE_ENV: "production",
      },
      extendEnv: false,
      stdio: ["ignore", "ignore", "pipe"],
      reject: false,
      timeout: uidMapDeniedReason,
    });
    return {
      ran: !n.timedOut && n.signal === undefined && typeof n.exitCode === "number",
      exitCode: n.exitCode ?? null,
      stderr: n.stderr,
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
