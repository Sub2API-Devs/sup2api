/**
 * utils/swarm/backends/teammateModeSnapshot.ts
 *
 * 启动时固定 teammateMode（CLI --teammate-mode 优先，否则配置），会话内保持不变
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/backends/teammateModeSnapshot.ts
 * pieces: chunk-z58m7qdh.js (10)
 * attribution: facade-exports 9, layout 1
 */
import { HostScoped } from "../../hostScoped.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { logForDebugging } from "../../debug.js";
import { resolveSetting } from "../../settings/userIntentSettings.js";
import { logError } from "../../log.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-z58m7qdh.js:367-388 facade-exports = getResolvedTeammateMode (0.685)
/**
 * teammateMode 缺省值 "in-process"。
 */
var DEFAULT_TEAMMATE_MODE = "in-process";
//@ chunk-z58m7qdh.js:388-547 facade-exports
class TeammateModeSnapshot {
  captured = null;
  cliOverride = null;
  setCliOverride(cliOverride) {
    this.cliOverride = cliOverride;
  }
  capture(captured) {
    this.captured = captured;
  }
  replaceWith(captured) {
    this.captured = captured;
    this.cliOverride = null;
  }
}
//@ chunk-z58m7qdh.js:547-574 facade-exports
var teammateModeSnapshots; // deferred: uses TeammateModeSnapshot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z58m7qdh.js:547", () => {
  teammateModeSnapshots = new HostScoped(() => new TeammateModeSnapshot());
});
//@ chunk-z58m7qdh.js:574-611 layout
function teammateModeSnapshot() {
  return teammateModeSnapshots.of(getRootSession().host);
}
//@ chunk-z58m7qdh.js:611-649 facade-exports
function setCliTeammateModeOverride(mode) {
  teammateModeSnapshot().setCliOverride(mode);
}
//@ chunk-z58m7qdh.js:649-687 facade-exports
function getCliTeammateModeOverride() {
  return teammateModeSnapshot().cliOverride;
}
//@ chunk-z58m7qdh.js:687-787 facade-exports = clearCliTeammateModeOverride (0.806)
/**
 * 清除 CLI 的 teammateMode 覆盖并替换为新模式。
 */
function clearCliTeammateModeOverride(newMode) {
  teammateModeSnapshot().replaceWith(newMode);
  logForDebugging(`[TeammateModeSnapshot] CLI override cleared, new mode: ${newMode}`);
}
//@ chunk-z58m7qdh.js:787-829 facade-exports
/**
 * 是否已捕获 teammateMode 快照。
 */
function hasTeammateModeSnapshot() {
  return teammateModeSnapshot().captured !== null;
}
//@ chunk-z58m7qdh.js:829-1075 facade-exports = captureTeammateModeSnapshot (0.562)
/**
 * 捕获 teammateMode 快照：CLI 覆盖优先，否则读配置 teammateMode（缺省 in-process）。
 */
function captureTeammateModeSnapshot() {
  let config = teammateModeSnapshot();
  if (config.cliOverride) {
    config.capture(config.cliOverride);
    logForDebugging(`[TeammateModeSnapshot] Captured from CLI override: ${config.captured}`);
  } else {
    config.capture(resolveSetting("teammateMode", DEFAULT_TEAMMATE_MODE).value);
    logForDebugging(`[TeammateModeSnapshot] Captured from config: ${config.captured}`);
  }
}
//@ chunk-z58m7qdh.js:1075-1251 facade-exports = getTeammateModeFromSnapshot (0.689)
/**
 * 读取 teammateMode 快照；未捕获时记错误并立即捕获。
 */
function getTeammateModeFromSnapshot() {
  let snapshot = teammateModeSnapshot();
  if (snapshot.captured === null) {
    logError(
      Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug"),
    );
    captureTeammateModeSnapshot();
  }
  return snapshot.captured ?? DEFAULT_TEAMMATE_MODE;
}
export {
  getTeammateModeFromSnapshot,
  hasTeammateModeSnapshot,
  captureTeammateModeSnapshot,
  getCliTeammateModeOverride,
  DEFAULT_TEAMMATE_MODE,
  clearCliTeammateModeOverride,
  TeammateModeSnapshot,
  setCliTeammateModeOverride,
  teammateModeSnapshots,
};
