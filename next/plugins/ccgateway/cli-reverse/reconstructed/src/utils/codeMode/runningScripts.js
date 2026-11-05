/**
 * utils/codeMode/runningScripts.ts
 *
 * 运行中脚本的文案：按段位排序、取活动描述、判断有无在跑（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mv01p7pm.js (5)
 * attribution: placement 5
 */
import { isReplSpliceWaitEnabled } from "./waitForNews.js";
import { ReplSessions } from "../../state/replSessions.js";
import { REPL_MAIN_THREAD_KEY } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { codeModeAccepted } from "./accepted.js";
import { displayableScriptDescription } from "./displayableScriptDescription.js";
import { truncateToWidth } from "../format.js";

//@ chunk-mv01p7pm.js:410-421 placement
/**
 * 运行中脚本描述的最大字符数（48）。
 */
var MAX_DESCRIPTION_WIDTH = 48;
//@ chunk-mv01p7pm.js:421-564 placement
/**
 * 运行中脚本的可订阅快照源（供 useSyncExternalStore）。
 */
function runningScriptsSource(deps) {
  if (!isReplSpliceWaitEnabled()) return null;
  let sessions = deps.get(ReplSessions);
  return {
    subscribe: (listener) => sessions.onRunningScriptsChange(listener),
    getSnapshot: () => sessions.runningScripts(REPL_MAIN_THREAD_KEY),
  };
}
//@ chunk-mv01p7pm.js:564-891 placement
/**
 * 取活动描述文案：按段位排序，最多取首条并附 “+N more”。
 */
function describeRunningScripts(scripts, width) {
  if (!codeModeAccepted()) return null;
  let sorted = [...scripts.values()].sort(
    (left, right) => scriptPhase(left) - scriptPhase(right) || left.evalId - right.evalId,
  );
  let firstPhase = sorted[0] === undefined ? 0 : scriptPhase(sorted[0]);
  let entries = sorted
    .map((script) => ({
      phase: scriptPhase(script),
      text: displayableScriptDescription(script.description, width),
    }))
    .filter(({ text: entry }) => entry !== "");
  let first = entries[0];
  if (first === undefined || first.phase !== firstPhase) return null;
  let headline = truncateToWidth(first.text, MAX_DESCRIPTION_WIDTH);
  return entries.length === 1 ? headline : `${headline} +${entries.length - 1} more`;
}
//@ chunk-mv01p7pm.js:891-967 placement
/**
 * 是否有处于运行段位（phase 0）的脚本。
 */
function isScriptRunning(scripts) {
  if (!codeModeAccepted()) return false;
  return [...scripts.values()].some((script) => scriptPhase(script) === 0);
}
//@ chunk-mv01p7pm.js:967-1022 placement
function scriptPhase(script) {
  return script.late ? 2 : script.startedAt === undefined ? 1 : 0;
}
export { isScriptRunning, MAX_DESCRIPTION_WIDTH, describeRunningScripts, runningScriptsSource };
