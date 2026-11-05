/**
 * services/mcp/hearthDegraded.ts
 *
 * 2.1.316 新增：记录 MCP 下游不可达时的降级状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hhfp4d87.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { HEARTHBOT } from "./ccrMetaMcp.js";
import { classifyMcpErrorSourceCategory } from "./mcpResultErrors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hhfp4d87.js:333-366 placement
/**
 * 按宿主保存的 hearthbot 降级状态。
 */
var hearthDegradedState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hhfp4d87.js:333", () => {
  hearthDegradedState = new HostScoped(() => ({
    degraded: false,
  }));
});
//@ chunk-hhfp4d87.js:366-401 placement
/**
 * 取当前宿主的降级状态。
 */
function getHearthDegradedState() {
  return hearthDegradedState.of(getRootSession().host);
}
//@ chunk-hhfp4d87.js:401-585 placement
/**
 * 根据 hearthbot 工具调用的错误更新其降级状态（下游不可达时降级，下游错误或成功时恢复）。
 */
function noteHearthDegraded(serverName, error) {
  if (serverName !== HEARTHBOT) return;
  let hearthDegradedState = getHearthDegradedState();
  if (error === undefined) {
    hearthDegradedState.degraded = false;
    return;
  }
  let sourceCategory = classifyMcpErrorSourceCategory(error);
  if (sourceCategory === "downstream_unreachable") hearthDegradedState.degraded = true;
  else if (sourceCategory === "downstream_error") hearthDegradedState.degraded = false;
}
//@ chunk-hhfp4d87.js:585-620 placement
/**
 * hearthbot 当前是否处于降级。
 */
function isHearthDegraded() {
  return getHearthDegradedState().degraded;
}
export { noteHearthDegraded, isHearthDegraded };
