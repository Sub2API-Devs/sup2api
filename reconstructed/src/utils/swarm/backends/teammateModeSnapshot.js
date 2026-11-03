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

/**
 * teammateMode 缺省值 "in-process"。
 */
//@ chunk-z58m7qdh.js:367-388 facade-exports = getResolvedTeammateMode (0.685)
var DEFAULT_TEAMMATE_MODE = "in-process";
//@ chunk-z58m7qdh.js:388-547 facade-exports
class TeammateModeSnapshot {
  captured = null;
  cliOverride = null;
  setCliOverride(e) {
    this.cliOverride = e;
  }
  capture(e) {
    this.captured = e;
  }
  replaceWith(e) {
    ((this.captured = e), (this.cliOverride = null));
  }
}
//@ chunk-z58m7qdh.js:547-574 facade-exports
var teammateModeSnapshots = new HostScoped(() => new TeammateModeSnapshot());
//@ chunk-z58m7qdh.js:574-611 layout
function o() {
  return teammateModeSnapshots.of(getRootSession().host);
}
//@ chunk-z58m7qdh.js:611-649 facade-exports
function setCliTeammateModeOverride(e) {
  o().setCliOverride(e);
}
//@ chunk-z58m7qdh.js:649-687 facade-exports
function getCliTeammateModeOverride() {
  return o().cliOverride;
}
/**
 * 清除 CLI 的 teammateMode 覆盖并替换为新模式。
 */
//@ chunk-z58m7qdh.js:687-787 facade-exports = clearCliTeammateModeOverride (0.806)
function clearCliTeammateModeOverride(newMode) {
  (o().replaceWith(newMode),
    logForDebugging(`[TeammateModeSnapshot] CLI override cleared, new mode: ${newMode}`));
}
/**
 * 是否已捕获 teammateMode 快照。
 */
//@ chunk-z58m7qdh.js:787-829 facade-exports
function hasTeammateModeSnapshot() {
  return o().captured !== null;
}
/**
 * 捕获 teammateMode 快照：CLI 覆盖优先，否则读配置 teammateMode（缺省 in-process）。
 */
//@ chunk-z58m7qdh.js:829-1075 facade-exports = captureTeammateModeSnapshot (0.562)
function captureTeammateModeSnapshot() {
  let config = o();
  if (config.cliOverride)
    (config.capture(config.cliOverride),
      logForDebugging(`[TeammateModeSnapshot] Captured from CLI override: ${config.captured}`));
  else
    (config.capture(resolveSetting("teammateMode", DEFAULT_TEAMMATE_MODE).value),
      logForDebugging(`[TeammateModeSnapshot] Captured from config: ${config.captured}`));
}
/**
 * 读取 teammateMode 快照；未捕获时记错误并立即捕获。
 */
//@ chunk-z58m7qdh.js:1075-1251 facade-exports = getTeammateModeFromSnapshot (0.689)
function getTeammateModeFromSnapshot() {
  let e = o();
  if (e.captured === null)
    (logError(
      Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug"),
    ),
      captureTeammateModeSnapshot());
  return e.captured ?? DEFAULT_TEAMMATE_MODE;
}

export {
  getTeammateModeFromSnapshot,
  hasTeammateModeSnapshot,
  captureTeammateModeSnapshot,
  getCliTeammateModeOverride,
  DEFAULT_TEAMMATE_MODE,
  clearCliTeammateModeOverride,
};
