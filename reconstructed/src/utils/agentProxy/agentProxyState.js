/**
 * utils/agentProxy/agentProxyState.ts
 *
 * 代理（proxy）状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-551t875q.js (5)
 * attribution: placement 5
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-551t875q.js:261-309 placement
/**
 * 保存 agent 代理端点的小状态类。
 */
class AgentProxyEndpointState {
  endpoint = undefined;
  set(endpoint) {
    this.endpoint = endpoint;
  }
}
//@ chunk-551t875q.js:309-332 placement
/**
 * 按宿主隔离的 agent 代理端点状态。
 */
var agentProxyStateByHost; // deferred: uses AgentProxyEndpointState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-551t875q.js:309", () => {
  agentProxyStateByHost = new HostScoped(() => new AgentProxyEndpointState());
});
//@ chunk-551t875q.js:332-367 placement
/**
 * 取出当前宿主的 agent 代理端点状态。
 */
function getAgentProxyEndpointState() {
  return agentProxyStateByHost.of(getRootSession().host);
}
//@ chunk-551t875q.js:367-394 placement
/**
 * 设置当前 agent 代理端点。
 */
function setAgentProxyEndpoint(endpoint) {
  getAgentProxyEndpointState().set(endpoint);
}
//@ chunk-551t875q.js:394-429 placement
/**
 * 读取当前 agent 代理端点。
 */
function getAgentProxyEndpoint() {
  return getAgentProxyEndpointState().endpoint;
}
export { setAgentProxyEndpoint, getAgentProxyEndpoint };
