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
import {
  openSync,
  openSync as openSync_2,
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
} from "fs";
import { isStandaloneExecutable } from "../slowOperations.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { SandboxFilesystemConfigSchema } from "../../entrypoints/sandboxTypes.js";
import { logForDebugging } from "../debug.js";
import { stripControlChars } from "../settings/writeQueues.js";
import { safeExecFileSync } from "../safeSpawn.js";

//@ chunk-fq0cr76a.js:901112-901134 placement
var Tie = 3,
  Qle = 2097152;
//@ chunk-fq0cr76a.js:901134-901160 placement
function E4() {
  return isStandaloneExecutable();
}
/**
 * 打开 /proc/self/exe 以运行内嵌的 apply-seccomp。
 */
//@ chunk-fq0cr76a.js:901160-901399 placement
async function openSelfExeForSeccomp() {
  if (!E4()) return;
  try {
    return openSync_2("/proc/self/exe", Qle);
  } catch (error) {
    let n = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `sandbox: failed to open /proc/self/exe for the embedded apply-seccomp helper: ${errorMessage(error)}`,
      "sandbox: failed to open /proc/self/exe",
    );
    throw (logError(n), n);
  }
}
//@ chunk-fq0cr76a.js:901399-901493 placement
function xor() {
  if (!E4()) return;
  return { applyPath: `/proc/self/fd/${Tie}`, argv0: "apply-seccomp" };
}
//@ chunk-fq0cr76a.js:901493-901568 placement
function Por(e) {
  return xor() === void 0 ? e : `exec ${Tie}<&- || exit 126; ${e}`;
}
//@ chunk-fq0cr76a.js:901568-901627 placement
function assertMarkedPathsResolved(e) {
  if (e === void 0 || SandboxFilesystemConfigSchema(e)) return e;
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
var APPARMOR_USERNS_PROBE = "/proc/sys/kernel/apparmor_restrict_unprivileged_userns",
  v4 = /setting up uid map: Permission denied|Failed RTM_NEWADDR/,
  w4 = ["--unshare-user", "--unshare-net", "--dev-bind", "/", "/", "/bin/true"],
  sce = 2000;
/**
 * 检测 Ubuntu AppArmor 对非特权用户命名空间的限制（会阻止 bubblewrap），给出加 profile 的建议。
 */
//@ chunk-fq0cr76a.js:902266-903132 placement
function checkAppArmorUserNamespaces(e) {
  try {
    if (e.readRestrictionSwitch()?.trim() !== "1") return;
    let bubblewrap = e.resolveBubblewrap();
    if (bubblewrap === null) return;
    let tryBubblewrap = e.tryBubblewrap(bubblewrap);
    if (!tryBubblewrap.ran || tryBubblewrap.exitCode === 0) return;
    logForDebugging(
      `[sandbox] kernel.apparmor_restrict_unprivileged_userns=1 and the bubblewrap trial (${bubblewrap} ${w4.join(" ")}) exited ${tryBubblewrap.exitCode}: ${tryBubblewrap.stderr.trim()}`,
      { level: "warn" },
    );
    let s = stripControlChars(tryBubblewrap.stderr);
    if (!v4.test(s)) return;
    return `Ubuntu's AppArmor restriction on user namespaces stops bubblewrap here ("${s
      .split(
        `
`,
      )
      .map((y) => y.trim().replace(/^bwrap: /, ""))
      .find((y) => v4.test(y))
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
function A4(e) {
  return { readRestrictionSwitch: ice, resolveBubblewrap: e, tryBubblewrap: probeBubblewrapSpawn };
}
//@ chunk-fq0cr76a.js:903219-903275 placement
function ice() {
  try {
    return readFileSync_3(APPARMOR_USERNS_PROBE, "utf8");
  } catch {
    return;
  }
}
/**
 * 试跑一次 bubblewrap（干净 PATH、cwd=/、带超时），返回 {ran, exitCode, stderr}，用于沙箱依赖检查判断 bwrap 能否启动。旧版名 isMacOsKeychainLocked 错配，应归沙箱依赖探测。
 */
//@ chunk-fq0cr76a.js:903275-903620 placement = isMacOsKeychainLocked (0.393)
function probeBubblewrapSpawn(e) {
  try {
    let n = safeExecFileSync(e, w4, {
      cwd: "/",
      env: { PATH: "/usr/bin:/bin", USER_TYPE: "external", NODE_ENV: "production" },
      extendEnv: !1,
      stdio: ["ignore", "ignore", "pipe"],
      reject: !1,
      timeout: sce,
    });
    return {
      ran: !n.timedOut && n.signal === void 0 && typeof n.exitCode === "number",
      exitCode: n.exitCode ?? null,
      stderr: n.stderr,
    };
  } catch {
    return { ran: !1, exitCode: null, stderr: "" };
  }
}

export { Tie, Por, openSelfExeForSeccomp, xor, assertMarkedPathsResolved, checkAppArmorUserNamespaces, A4 };
