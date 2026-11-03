/**
 * utils/shell/windowsShellLauncher.ts
 *
 * 2.1.316 新增：Windows shell 启动器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import {
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  win32 as win32_6,
  win32 as win32_7,
  win32 as win32_8,
} from "path";
import { env } from "../env.js";
import { buildPowerShellArgs } from "./powershellProvider.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { waitForWindowsChild } from "../auth/lockHolderLiveness.js";
import { logForDebugging } from "../debug.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";

//@ chunk-e6aww6q8.js:3073846-3074226 placement
var TENGU_PARALLEL_TRINKET = "tengu_parallel_trinket",
  CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT = "CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT",
  kEr = 32000,
  gZe = /^[A-Za-z]:\\[^"%!^&|<>\r\n\0]*$/,
  pCe = 260,
  TEr = 65001,
  vEr = 3000,
  EEr =
    "$__claudeCodeScript = $env:CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT; $env:CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT = $null; Invoke-Expression -Command $__claudeCodeScript",
  hZe = { stdio: ["ignore", "ignore", "ignore"], windowsVerbatimArguments: !0 };
/**
 * 解析 Windows shell 启动器路径并做安全检查。
 */
//@ chunk-e6aww6q8.js:3074226-3074996 placement
function resolveWindowsShellLauncher({
  powershellPath: powershellPath,
  script: script,
  outputPath: outputPath,
  cwd: cwd,
}) {
  let normalized = win32_6.normalize(powershellPath),
    normalized_2 = win32_6.normalize(outputPath),
    joined = win32_6.join(env.SYSTEMROOT || "C:\\Windows", "System32"),
    joined_2 = win32_6.join(joined, "chcp.com");
  if (!gZe.test(normalized)) return { ok: !1, reason: "unsafe_shell_path" };
  if (!gZe.test(normalized_2)) return { ok: !1, reason: "unsafe_output_path" };
  if (!gZe.test(joined_2)) return { ok: !1, reason: "unsafe_system_root" };
  if (
    normalized.length >= pCe ||
    normalized_2.length >= pCe ||
    joined_2.length >= pCe ||
    cwd.length >= pCe - 1
  )
    return { ok: !1, reason: "path_too_long" };
  if (cwd.startsWith("\\\\") || cwd.startsWith("//")) return { ok: !1, reason: "unc_cwd" };
  if (script.length > kEr) return { ok: !1, reason: "command_too_long" };
  let joined_3 = [`"${normalized}"`, ...buildPowerShellArgs(), "-Command", `"${EEr}"`].join(" "),
    G = ["/d", "/s", "/c", `""${joined_2}" ${TEr} >nul & ${joined_3} > "${normalized_2}" 2>&1"`];
  return {
    ok: !0,
    launch: {
      file: win32_6.join(joined, "cmd.exe"),
      args: G,
      env: { [CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT]: script },
    },
  };
}
/**
 * 解析可用的 Windows shell 启动器：可被环境变量或功能开关关闭；解析失败或 cmd 探测不可用时记录原因并返回 undefined，否则返回启动配置。
 */
//@ chunk-e6aww6q8.js:3074996-3075405 placement
async function resolveUsableWindowsLauncher(e, n) {
  if (env.CLAUDE_CODE_DISABLE_WINDOWS_SHELL_LAUNCHER) {
    logFeatureSad("shell_windows_launcher", "env_opt_out");
    return;
  }
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PARALLEL_TRINKET, !0)) {
    logFeatureSad("shell_windows_launcher", "flag_off");
    return;
  }
  let r = resolveWindowsShellLauncher(e);
  if (!r.ok) {
    logFeatureSad("shell_windows_launcher", r.reason);
    return;
  }
  n.windowsShellLauncherUsable ??= probeCmdLauncher(r.launch.file);
  let windowsShellLauncherUsable = await n.windowsShellLauncherUsable;
  if (windowsShellLauncherUsable !== void 0) {
    logFeatureSad("shell_windows_launcher", windowsShellLauncherUsable);
    return;
  }
  return r.launch;
}
/**
 * 通过 Windows 启动器 pid 查找实际的 PowerShell 子进程 pid，找不到时保留启动器 pid。
 */
//@ chunk-e6aww6q8.js:3075405-3075687 placement
async function resolveShellPidFromLauncher(e, n) {
  if (e === void 0) return;
  let base = win32_6.basename(n),
    s = await waitForWindowsChild(e, base, { powershellPath: n });
  if (s === void 0)
    (logForDebugging(
      `[windows-shell-launcher] no ${base} child of launcher pid ${e}; keeping the launcher pid`,
      { level: "warn" },
    ),
      logFeatureSad("shell_windows_launcher", "shell_pid_unresolved"));
  return s;
}
/**
 * 用 "/d /c exit 0" 探测启动器 cmd 是否可用（有超时），不可用时记录并返回 cmd_probe_timeout 或 cmd_unavailable。
 */
//@ chunk-e6aww6q8.js:3075687-3075996 placement
async function probeCmdLauncher(e) {
  let n = await execFileNoThrowWithCwd(e, ["/d", "/c", "exit", "0"], { timeout: vEr });
  if (n.code === 0) return;
  return (
    logForDebugging(
      `[windows-shell-launcher] ${e} unusable (code=${n.code} timedOut=${n.timedOut === !0} ${n.error ?? ""}); PowerShell commands spawn directly`,
      { level: "warn" },
    ),
    n.timedOut ? "cmd_probe_timeout" : "cmd_unavailable"
  );
}

export { resolveUsableWindowsLauncher, hZe, resolveShellPidFromLauncher };
