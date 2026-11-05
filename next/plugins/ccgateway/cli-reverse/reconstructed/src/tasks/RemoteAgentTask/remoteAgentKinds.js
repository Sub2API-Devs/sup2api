/**
 * tasks/RemoteAgentTask/remoteAgentKinds.ts
 *
 * 2.1.316 新增：启动时捕获的 CCR 环境（会话 ingress URL、桥接 MCP 载体、本会话 id、是否自托管 runner 子进程）；启动 CCR 环境单例。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ex2q6ads.js (7)
 * attribution: placement 6, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isInCloudSession } from "./RemoteAgentTask.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isSelfAddressableSessionId } from "../../bridge/sessionIdCompat.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ex2q6ads.js:263-904 placement
/**
 * 启动时捕获的 CCR 环境（会话 ingress URL、桥接 MCP 载体、本会话 id、是否自托管 runner 子进程）。
 */
class StartupCcrEnvironment {
  captured = sessionIngressUrl();
  capturedOwn = isInCloudSession();
  carrier = bridgeMcpCarrierRole();
  ownSessionIds = selfSessionIds();
  selfHostedRunnerChild = isSelfHostedRunnerChild();
  toolsGrantedRunnerChild = kind();
  get atStartup() {
    return this.captured;
  }
  get isSessionIngressUrlSet() {
    return this.capturedOwn;
  }
  get ownCcrSessionIds() {
    return this.ownSessionIds;
  }
  get isSelfHostedRunnerChild() {
    return this.selfHostedRunnerChild;
  }
  get isToolsGrantedRunnerChild() {
    return this.toolsGrantedRunnerChild;
  }
  get bridgeCarrier() {
    return this.carrier;
  }
  get isBridgeCarrierChild() {
    return this.carrier === "child";
  }
  reset() {
    this.captured = sessionIngressUrl();
    this.capturedOwn = isInCloudSession();
    this.carrier = bridgeMcpCarrierRole();
    this.ownSessionIds = selfSessionIds();
    this.selfHostedRunnerChild = isSelfHostedRunnerChild();
    this.toolsGrantedRunnerChild = kind();
  }
}
//@ chunk-ex2q6ads.js:904-917 placement
/**
 * 启动 CCR 环境单例。
 */
var startupCcrEnv; // deferred: uses StartupCcrEnvironment of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ex2q6ads.js:904", () => {
  startupCcrEnv = new StartupCcrEnvironment();
});
//@ chunk-ex2q6ads.js:917-1001 placement
/**
 * 取会话入口地址，未设置时回退到 ANTHROPIC_BASE_URL。
 */
function sessionIngressUrl() {
  return process.env.SESSION_INGRESS_URL ?? process.env.ANTHROPIC_BASE_URL;
}
//@ chunk-ex2q6ads.js:1062-1329 placement
function bridgeMcpCarrierRole() {
  let envClaudeCodeBridgeMcpCarrier = process.env.CLAUDE_CODE_BRIDGE_MCP_CARRIER;
  if (envClaudeCodeBridgeMcpCarrier === "1" || !envClaudeCodeBridgeMcpCarrier)
    return envClaudeCodeBridgeMcpCarrier ? "child" : undefined;
  if (process.env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc" && isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
    delete process.env.CLAUDE_CODE_BRIDGE_MCP_CARRIER;
    return;
  }
  return "descendant";
}
//@ chunk-ex2q6ads.js:1329-1458 placement
function selfSessionIds() {
  return [process.env.CLAUDE_CODE_REMOTE_SESSION_ID, process.env.CLAUDE_CODE_SESSION_ID].filter(
    (sessionId) => sessionId !== undefined && isSelfAddressableSessionId(sessionId),
  );
}
//@ chunk-ex2q6ads.js:1458-1629 placement
function isSelfHostedRunnerChild() {
  return (
    isEnvTruthy(process.env.CLAUDE_CODE_REMOTE) &&
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc" &&
    process.env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted"
  );
}
//@ chunk-ex2q6ads.js:1629-1651 affinity
function kind() {
  return false;
}
export { startupCcrEnv };
