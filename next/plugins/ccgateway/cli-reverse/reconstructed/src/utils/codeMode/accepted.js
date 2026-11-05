/**
 * utils/codeMode/accepted.ts
 *
 * Code 模式的全局接受状态与 isOn 回调：提供 accepted 读写与 isOn 触发判定，是全树判定是否为 Code 模式的入口（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gcy2kcsb.js (8)
 * attribution: placement 8
 */
import { contextKeyAcceptedState } from "../cwd.js";

//@ chunk-gcy2kcsb.js:272-304 placement
/**
 * 读 Code 模式是否被接受；tasks/taskKinds、REPLTool、PollEventsTool 等大量模块用。
 */
function codeModeAccepted() {
  return contextKeyAcceptedState.accepted;
}
//@ chunk-gcy2kcsb.js:304-336 placement
/**
 * 同 ae 的第二个读取门面，utils/hooks、toolExecution、RefreshMcpToolsTool 等使用。
 */
function isAccepted() {
  return contextKeyAcceptedState.accepted;
}
//@ chunk-gcy2kcsb.js:336-362 placement
/**
 * ic() 的包装，供不需要区分的调用方使用。
 */
function contextKeyAccepted() {
  return isAccepted();
}
//@ chunk-gcy2kcsb.js:362-389 placement
/**
 * ae() 的包装。
 */
function isStateOn() {
  return codeModeAccepted();
}
//@ chunk-gcy2kcsb.js:389-409 placement
var isOnHolder = {
  isOn: undefined,
};
//@ chunk-gcy2kcsb.js:409-434 placement
/**
 * 设置 isOn 回调（由启动流程注入）。
 */
function setIsOn(isOn) {
  isOnHolder.isOn = isOn;
}
//@ chunk-gcy2kcsb.js:434-513 placement
/**
 * 在 Code 模式已接受时安全调用 isOn，异常按 false 处理。
 */
function isOn() {
  if (contextKeyAcceptedState.accepted)
    try {
      return isOnHolder.isOn?.() === true;
    } catch {
      return false;
    }
  return false;
}
//@ chunk-gcy2kcsb.js:513-542 placement
/**
 * 写 Code 模式的接受状态。
 */
function setAccepted(accepted) {
  contextKeyAcceptedState.accepted = accepted;
}
export { codeModeAccepted, contextKeyAccepted, isStateOn, isOn, isAccepted, setIsOn, setAccepted };
