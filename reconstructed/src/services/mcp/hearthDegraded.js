/**
 * services/mcp/hearthDegraded.ts
 *
 * 2.1.316 新增：记录 MCP 下游不可达时的降级状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-st7cjqc5.js (4)
 * attribution: placement 4
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { HEARTHBOT } from "./ccrMetaMcp.js";
import { classifyMcpErrorSourceCategory } from "./mcpResultErrors.js";

//@ chunk-st7cjqc5.js:333-366 placement
/**
 * 按宿主保存的 hearthbot 降级状态。
 */
var hearthDegradedState = new HostScoped(() => ({
  degraded: false,
}));
//@ chunk-st7cjqc5.js:366-401 placement
/**
 * 取当前宿主的降级状态。
 */
function getHearthDegradedState() {
  return hearthDegradedState.of(getRootSession().host);
}
//@ chunk-st7cjqc5.js:401-585 placement
/**
 * 根据 hearthbot 工具调用的错误更新其降级状态（下游不可达时降级，下游错误或成功时恢复）。
 */
function noteHearthDegraded(n, r) {
  if (n !== HEARTHBOT) return;
  let hearthDegradedState = getHearthDegradedState();
  if (r === undefined) {
    hearthDegradedState.degraded = false;
    return;
  }
  let o = classifyMcpErrorSourceCategory(r);
  if (o === "downstream_unreachable") hearthDegradedState.degraded = true;
  else if (o === "downstream_error") hearthDegradedState.degraded = false;
}
//@ chunk-st7cjqc5.js:585-620 placement
/**
 * hearthbot 当前是否处于降级。
 */
function isHearthDegraded() {
  return getHearthDegradedState().degraded;
}
export { noteHearthDegraded, isHearthDegraded };
