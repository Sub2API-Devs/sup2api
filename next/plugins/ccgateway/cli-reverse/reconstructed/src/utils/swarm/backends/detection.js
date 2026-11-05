/**
 * utils/swarm/backends/detection.ts
 *
 * 终端环境探测：是否在 tmux / iTerm2 中、it2 命令是否可用、tmux 是否安装；注册表全局状态对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/backends/detection.ts
 * pieces: chunk-bj5py7ze.js (13)
 * attribution: fingerprint 2, layout 3, facade-exports 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../env.js";
import { firstLineOf } from "../../stringUtils.js";
import { execFileNoThrow } from "../../execFileNoThrow.js";
import { TMUX as TMUX_2 } from "../constants.js";
import { logForDebugging } from "../../debug.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-bj5py7ze.js:370-382 fingerprint (2.1.88 match: IT2_COMMAND, 1)
var IT2_COMMAND = "it2";
//@ chunk-bj5py7ze.js:382-494 layout
/**
 * 终端探测缓存：是否在 iTerm2、it2 命令路径。
 */
class TerminalProbes {
  inITerm2 = null;
  it2Command = "it2";
  recordInITerm2(inITerm2) {
    this.inITerm2 = inITerm2;
  }
  recordIt2Command(it2Command) {
    this.it2Command = it2Command;
  }
}
//@ chunk-bj5py7ze.js:494-692 layout
/**
 * 新建后端注册表状态：缓存的检测结果、是否已注册后端、是否启用同进程回退、tmux/iTerm 后端类与实例、终端探测。
 */
function createBackendRegistryState() {
  return {
    cachedDetectionResult: null,
    backendsRegistered: false,
    inProcessFallbackActive: false,
    TmuxBackendClass: null,
    ITermBackendClass: null,
    tmuxBackend: null,
    itermBackend: null,
    terminalProbes: new TerminalProbes(),
  };
}
//@ chunk-bj5py7ze.js:692-704 layout
/**
 * 后端注册表的全局默认状态对象。
 */
var backendRegistryState; // deferred: uses createBackendRegistryState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bj5py7ze.js:692", () => {
  backendRegistryState = createBackendRegistryState();
});
//@ chunk-bj5py7ze.js:704-731 fingerprint (2.1.88 match: ORIGINAL_TMUX_PANE, 0.713)
var TMUX; // deferred: uses env (../../env.js) of its import cycle while loading; runs once the cycle is complete
var TMUX_PANE;
deferInit("chunk-bj5py7ze.js:704", () => {
  TMUX = env.TMUX;
  TMUX_PANE = env.TMUX_PANE;
});
//@ chunk-bj5py7ze.js:731-756 facade-exports
/**
 * 当前进程是否在 tmux 里（启动时的 TMUX env）。
 */
function isInsideTmuxSync() {
  return !!TMUX;
}
//@ chunk-bj5py7ze.js:756-790 facade-exports
/**
 * 当前是否在 tmux 中（异步版）。
 */
async function isInsideTmux() {
  return isInsideTmuxSync();
}
//@ chunk-bj5py7ze.js:790-820 facade-exports
/**
 * 启动时的 TMUX_PANE。
 */
function getLeaderPaneId() {
  return TMUX_PANE || null;
}
//@ chunk-bj5py7ze.js:820-876 facade-exports
/**
 * 启动时 TMUX env 里的 socket 路径（逗号前部分）。
 */
function getUserTmuxSocket() {
  if (!TMUX) return null;
  return firstLineOf(TMUX, ",") || null;
}
//@ chunk-bj5py7ze.js:876-935 facade-exports
/**
 * tmux 是否已安装（tmux -V）。
 */
async function isTmuxAvailable() {
  return (await execFileNoThrow(TMUX_2, ["-V"])).code === 0;
}
//@ chunk-bj5py7ze.js:935-1142 facade-exports (2.1.88 match: isInITerm2, 0.718)
/**
 * 是否在 iTerm2：TERM_PROGRAM=iTerm.app、ITERM_SESSION_ID 或 terminal=iTerm.app，结果缓存。
 */
function isInITerm2(state = backendRegistryState) {
  let { terminalProbes } = state;
  if (terminalProbes.inITerm2 !== null) return terminalProbes.inITerm2;
  let termProgram = env.TERM_PROGRAM;
  let hasItermSessionId = !!env.ITERM_SESSION_ID;
  let terminalIsITerm = env.terminal === "iTerm.app";
  let detected = termProgram === "iTerm.app" || hasItermSessionId || terminalIsITerm;
  terminalProbes.recordInITerm2(detected);
  return detected;
}
//@ chunk-bj5py7ze.js:1142-1197 facade-exports
/**
 * it2 命令名/路径。
 */
function getIt2Command(state = backendRegistryState) {
  return state.terminalProbes.it2Command;
}
//@ chunk-bj5py7ze.js:1197-1902 facade-exports
async function isIt2CliAvailable(state = backendRegistryState) {
  let SHELL = env.SHELL || "/bin/zsh";
  let whichResult = await execFileNoThrow(SHELL, ["-lc", `command -v ${IT2_COMMAND}`], {
    useCwd: false,
    timeout: 2000,
  });
  let foundPath =
    whichResult.code === 0
      ? (whichResult.stdout
          .split(
            `
`,
          )
          .map((line) => line.trim())
          .filter(Boolean)
          .at(-1) ?? "")
      : "";
  let runSessionList = async (command) => execFileNoThrow(command, ["session", "list"]);
  let command = foundPath || IT2_COMMAND;
  let listResult = await runSessionList(command);
  if (
    foundPath &&
    listResult.code !== 0 &&
    (listResult.code === 127 || /ENOENT/i.test(listResult.error ?? ""))
  ) {
    command = IT2_COMMAND;
    listResult = await runSessionList(command);
  }
  if (listResult.code !== 0) {
    logForDebugging(
      `[isIt2CliAvailable] '${command} session list' failed (code=${listResult.code}): ${listResult.stderr || listResult.error || "no stderr"}. ` +
        (foundPath
          ? "it2 was found on PATH \u2014 check that the iTerm2 Python API is enabled " +
            "(Preferences > General > Magic > Enable Python API)."
          : "it2 was not found on PATH (including login-shell PATH)."),
    );
    return false;
  }
  state.terminalProbes.recordIt2Command(command);
  return true;
}
export {
  isTmuxAvailable,
  isInsideTmux,
  isInITerm2,
  getIt2Command,
  isIt2CliAvailable,
  backendRegistryState,
  isInsideTmuxSync,
  getUserTmuxSocket,
  getLeaderPaneId,
};
