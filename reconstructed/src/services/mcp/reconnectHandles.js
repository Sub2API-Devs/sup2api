/**
 * services/mcp/reconnectHandles.ts
 *
 * MCP 重连句柄（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x87ys2v1.js (6)
 * attribution: placement 6
 */
import { getCliOwnedState } from "./cliOwnedClients.js";

//@ chunk-x87ys2v1.js:227-264 placement
/**
 * 取当前的重连函数句柄。
 */
function getReconnectHandle() {
  return getCliOwnedState().reconnect;
}
//@ chunk-x87ys2v1.js:264-298 placement
/**
 * 取当前的启用/禁用切换句柄。
 */
function getToggleHandle() {
  return getCliOwnedState().toggle;
}
//@ chunk-x87ys2v1.js:298-336 placement
/**
 * 取当前的 isDisabled 判断句柄。
 */
function getIsDisabledHandle() {
  return getCliOwnedState().isDisabled;
}
//@ chunk-x87ys2v1.js:336-378 placement
/**
 * 取当前的拨号阻止原因判断句柄。
 */
function getDialBlockCauseHandle() {
  return getCliOwnedState().dialBlockCause;
}
//@ chunk-x87ys2v1.js:378-470 placement
/**
 * 一次性设置四个重连相关句柄。
 */
function setReconnectHandles(reconnect, toggle, isDisabled, dialBlockCause) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.reconnect = reconnect;
  cliOwnedState.toggle = toggle;
  cliOwnedState.isDisabled = isDisabled;
  cliOwnedState.dialBlockCause = dialBlockCause;
}
//@ chunk-x87ys2v1.js:470-567 placement
/**
 * 清空四个重连相关句柄。
 */
function clearReconnectHandles() {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.reconnect = null;
  cliOwnedState.toggle = null;
  cliOwnedState.isDisabled = null;
  cliOwnedState.dialBlockCause = null;
}
export {
  getReconnectHandle,
  getIsDisabledHandle,
  getDialBlockCauseHandle,
  clearReconnectHandles,
  setReconnectHandles,
  getToggleHandle,
};
