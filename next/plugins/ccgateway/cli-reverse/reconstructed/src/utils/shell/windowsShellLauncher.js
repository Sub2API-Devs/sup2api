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
import { win32 } from "path";
import { env } from "../env.js";
import { buildPowerShellArgs } from "./powershellProvider.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { waitForWindowsChild } from "../auth/lockHolderLiveness.js";
import { logForDebugging } from "../debug.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";

//@ chunk-e6aww6q8.js:3073846-3074226 placement
/**
 * Windows shell 启动器常量：GrowthBook 开关名、启动脚本文本变量、路径/长度/代码页上限、PowerShell 调用串与 spawn 选项。
 */
var TENGU_PARALLEL_TRINKET = "tengu_parallel_trinket";
var CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT = "CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT";
var MAX_LAUNCHER_SCRIPT_CHARS = 32000;
var SAFE_WINDOWS_PATH_RE = /^[A-Za-z]:\\[^"%!^&|<>\r\n\0]*$/;
var MAX_WINDOWS_PATH_CHARS = 260;
var WINDOWS_UTF8_CODEPAGE = 65001;
var CMD_PROBE_TIMEOUT_MS = 3000;
var LAUNCHER_SCRIPT_INVOKE_EXPRESSION =
  "$__claudeCodeScript = $env:CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT; $env:CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT = $null; Invoke-Expression -Command $__claudeCodeScript";
var DETACHED_LAUNCHER_SPAWN_OPTIONS = {
  stdio: ["ignore", "ignore", "ignore"],
  windowsVerbatimArguments: true,
};
//@ chunk-e6aww6q8.js:3074226-3074996 placement
/**
 * 解析 Windows shell 启动器路径并做安全检查。
 */
function resolveWindowsShellLauncher({ powershellPath, script, outputPath, cwd }) {
  let normalized = win32.normalize(powershellPath);
  let normalized_2 = win32.normalize(outputPath);
  let joined = win32.join(env.SYSTEMROOT || "C:\\Windows", "System32");
  let joined_2 = win32.join(joined, "chcp.com");
  if (!SAFE_WINDOWS_PATH_RE.test(normalized))
    return {
      ok: false,
      reason: "unsafe_shell_path",
    };
  if (!SAFE_WINDOWS_PATH_RE.test(normalized_2))
    return {
      ok: false,
      reason: "unsafe_output_path",
    };
  if (!SAFE_WINDOWS_PATH_RE.test(joined_2))
    return {
      ok: false,
      reason: "unsafe_system_root",
    };
  if (
    normalized.length >= MAX_WINDOWS_PATH_CHARS ||
    normalized_2.length >= MAX_WINDOWS_PATH_CHARS ||
    joined_2.length >= MAX_WINDOWS_PATH_CHARS ||
    cwd.length >= MAX_WINDOWS_PATH_CHARS - 1
  )
    return {
      ok: false,
      reason: "path_too_long",
    };
  if (cwd.startsWith("\\\\") || cwd.startsWith("//"))
    return {
      ok: false,
      reason: "unc_cwd",
    };
  if (script.length > MAX_LAUNCHER_SCRIPT_CHARS)
    return {
      ok: false,
      reason: "command_too_long",
    };
  let joined_3 = [
    `"${normalized}"`,
    ...buildPowerShellArgs(),
    "-Command",
    `"${LAUNCHER_SCRIPT_INVOKE_EXPRESSION}"`,
  ].join(" ");
  let args = [
    "/d",
    "/s",
    "/c",
    `""${joined_2}" ${WINDOWS_UTF8_CODEPAGE} >nul & ${joined_3} > "${normalized_2}" 2>&1"`,
  ];
  return {
    ok: true,
    launch: {
      file: win32.join(joined, "cmd.exe"),
      args,
      env: {
        [CLAUDE_CODE_SHELL_LAUNCHER_SCRIPT]: script,
      },
    },
  };
}
//@ chunk-e6aww6q8.js:3074996-3075405 placement
/**
 * 解析可用的 Windows shell 启动器：可被环境变量或功能开关关闭；解析失败或 cmd 探测不可用时记录原因并返回 undefined，否则返回启动配置。
 */
async function resolveUsableWindowsLauncher(binShell, hostState) {
  if (env.CLAUDE_CODE_DISABLE_WINDOWS_SHELL_LAUNCHER) {
    logFeatureSad("shell_windows_launcher", "env_opt_out");
    return;
  }
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PARALLEL_TRINKET, true)) {
    logFeatureSad("shell_windows_launcher", "flag_off");
    return;
  }
  let windowsShellLauncher = resolveWindowsShellLauncher(binShell);
  if (!windowsShellLauncher.ok) {
    logFeatureSad("shell_windows_launcher", windowsShellLauncher.reason);
    return;
  }
  hostState.windowsShellLauncherUsable ??= probeCmdLauncher(windowsShellLauncher.launch.file);
  let windowsShellLauncherUsable = await hostState.windowsShellLauncherUsable;
  if (windowsShellLauncherUsable !== undefined) {
    logFeatureSad("shell_windows_launcher", windowsShellLauncherUsable);
    return;
  }
  return windowsShellLauncher.launch;
}
//@ chunk-e6aww6q8.js:3075405-3075687 placement
/**
 * 通过 Windows 启动器 pid 查找实际的 PowerShell 子进程 pid，找不到时保留启动器 pid。
 */
async function resolveShellPidFromLauncher(parentPid, binShell) {
  if (parentPid === undefined) return;
  let processName = win32.basename(binShell);
  let childPid = await waitForWindowsChild(parentPid, processName, {
    powershellPath: binShell,
  });
  if (childPid === undefined) {
    logForDebugging(
      `[windows-shell-launcher] no ${processName} child of launcher pid ${parentPid}; keeping the launcher pid`,
      {
        level: "warn",
      },
    );
    logFeatureSad("shell_windows_launcher", "shell_pid_unresolved");
  }
  return childPid;
}
//@ chunk-e6aww6q8.js:3075687-3075996 placement
/**
 * 用 "/d /c exit 0" 探测启动器 cmd 是否可用（有超时），不可用时记录并返回 cmd_probe_timeout 或 cmd_unavailable。
 */
async function probeCmdLauncher(file) {
  let probeResult = await execFileNoThrowWithCwd(file, ["/d", "/c", "exit", "0"], {
    timeout: CMD_PROBE_TIMEOUT_MS,
  });
  if (probeResult.code === 0) return;
  logForDebugging(
    `[windows-shell-launcher] ${file} unusable (code=${probeResult.code} timedOut=${probeResult.timedOut === true} ${probeResult.error ?? ""}); PowerShell commands spawn directly`,
    {
      level: "warn",
    },
  );
  return probeResult.timedOut ? "cmd_probe_timeout" : "cmd_unavailable";
}
export { resolveUsableWindowsLauncher, DETACHED_LAUNCHER_SPAWN_OPTIONS, resolveShellPidFromLauncher };
