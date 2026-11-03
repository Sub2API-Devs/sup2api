/**
 * utils/swarm/backends/detection.ts
 *
 * 终端环境探测：是否在 tmux / iTerm2 中、it2 命令是否可用、tmux 是否安装；注册表全局状态对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/backends/detection.ts
 * pieces: chunk-kqv6vz5m.js (13)
 * attribution: fingerprint 2, layout 3, facade-exports 8
 */
import { env } from "../../env.js";
import { firstLineOf } from "../../stringUtils.js";
import { execFileNoThrow } from "../../execFileNoThrow.js";
import { TMUX as TMUX_2 } from "../constants.js";
import { logForDebugging } from "../../debug.js";

//@ chunk-kqv6vz5m.js:370-382 fingerprint = IT2_COMMAND (1)
var IT2_COMMAND = "it2";
/**
 * 终端探测缓存：是否在 iTerm2、it2 命令路径。
 */
//@ chunk-kqv6vz5m.js:382-494 layout
class TerminalProbes {
  inITerm2 = null;
  it2Command = "it2";
  recordInITerm2(e) {
    this.inITerm2 = e;
  }
  recordIt2Command(e) {
    this.it2Command = e;
  }
}
/**
 * 新建后端注册表状态：缓存的检测结果、是否已注册后端、是否启用同进程回退、tmux/iTerm 后端类与实例、终端探测。
 */
//@ chunk-kqv6vz5m.js:494-692 layout
function createBackendRegistryState() {
  return {
    cachedDetectionResult: null,
    backendsRegistered: !1,
    inProcessFallbackActive: !1,
    TmuxBackendClass: null,
    ITermBackendClass: null,
    tmuxBackend: null,
    itermBackend: null,
    terminalProbes: new TerminalProbes(),
  };
}
/**
 * 后端注册表的全局默认状态对象。
 */
//@ chunk-kqv6vz5m.js:692-704 layout
var backendRegistryState = createBackendRegistryState();
//@ chunk-kqv6vz5m.js:704-731 fingerprint = ORIGINAL_TMUX_PANE (0.713)
var TMUX = env.TMUX,
  TMUX_PANE = env.TMUX_PANE;
/**
 * 当前进程是否在 tmux 里（启动时的 TMUX env）。
 */
//@ chunk-kqv6vz5m.js:731-756 facade-exports
function isInsideTmuxSync() {
  return !!TMUX;
}
/**
 * 当前是否在 tmux 中（异步版）。
 */
//@ chunk-kqv6vz5m.js:756-790 facade-exports
async function isInsideTmux() {
  return isInsideTmuxSync();
}
/**
 * 启动时的 TMUX_PANE。
 */
//@ chunk-kqv6vz5m.js:790-820 facade-exports
function getLeaderPaneId() {
  return TMUX_PANE || null;
}
/**
 * 启动时 TMUX env 里的 socket 路径（逗号前部分）。
 */
//@ chunk-kqv6vz5m.js:820-876 facade-exports
function getUserTmuxSocket() {
  if (!TMUX) return null;
  return firstLineOf(TMUX, ",") || null;
}
/**
 * tmux 是否已安装（tmux -V）。
 */
//@ chunk-kqv6vz5m.js:876-935 facade-exports
async function isTmuxAvailable() {
  return (await execFileNoThrow(TMUX_2, ["-V"])).code === 0;
}
/**
 * 是否在 iTerm2：TERM_PROGRAM=iTerm.app、ITERM_SESSION_ID 或 terminal=iTerm.app，结果缓存。
 */
//@ chunk-kqv6vz5m.js:935-1142 facade-exports = isInITerm2 (0.718)
function isInITerm2(e = backendRegistryState) {
  let { terminalProbes: terminalProbes } = e;
  if (terminalProbes.inITerm2 !== null) return terminalProbes.inITerm2;
  let termProgram = env.TERM_PROGRAM,
    hasItermSessionId = !!env.ITERM_SESSION_ID,
    terminalIsITerm = env.terminal === "iTerm.app",
    n = termProgram === "iTerm.app" || hasItermSessionId || terminalIsITerm;
  return (terminalProbes.recordInITerm2(n), n);
}
/**
 * it2 命令名/路径。
 */
//@ chunk-kqv6vz5m.js:1142-1197 facade-exports
function getIt2Command(e = backendRegistryState) {
  return e.terminalProbes.it2Command;
}
//@ chunk-kqv6vz5m.js:1197-1902 facade-exports
async function isIt2CliAvailable(e = backendRegistryState) {
  let o = env.SHELL || "/bin/zsh",
    a = await execFileNoThrow(o, ["-lc", `command -v ${IT2_COMMAND}`], { useCwd: !1, timeout: 2000 }),
    s =
      a.code === 0
        ? (a.stdout
            .split(
              `
`,
            )
            .map((m) => m.trim())
            .filter(Boolean)
            .at(-1) ?? "")
        : "",
    l = async (m) => execFileNoThrow(m, ["session", "list"]),
    n = s || IT2_COMMAND,
    r = await l(n);
  if (s && r.code !== 0 && (r.code === 127 || /ENOENT/i.test(r.error ?? "")))
    ((n = IT2_COMMAND), (r = await l(n)));
  if (r.code !== 0)
    return (
      logForDebugging(
        `[isIt2CliAvailable] '${n} session list' failed (code=${r.code}): ${r.stderr || r.error || "no stderr"}. ` +
          (s
            ? "it2 was found on PATH \u2014 check that the iTerm2 Python API is enabled " +
              "(Preferences > General > Magic > Enable Python API)."
            : "it2 was not found on PATH (including login-shell PATH)."),
      ),
      !1
    );
  return (e.terminalProbes.recordIt2Command(n), !0);
}

export {
  isInsideTmux,
  getUserTmuxSocket,
  isTmuxAvailable,
  getLeaderPaneId,
  backendRegistryState,
  isInITerm2,
  isIt2CliAvailable,
  isInsideTmuxSync,
  getIt2Command,
};
