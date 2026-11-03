/**
 * tasks/RemoteAgentTask/remoteAgentKinds.ts
 *
 * 2.1.316 新增：启动时捕获的 CCR 环境（会话 ingress URL、桥接 MCP 载体、本会话 id、是否自托管 runner 子进程）；启动 CCR 环境单例。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2vae0cjf.js (6)
 * attribution: placement 6
 */
import { isInCloudSession } from "./RemoteAgentTask.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isSelfAddressableSessionId } from "../../bridge/sessionIdCompat.js";

/**
 * 启动时捕获的 CCR 环境（会话 ingress URL、桥接 MCP 载体、本会话 id、是否自托管 runner 子进程）。
 */
//@ chunk-2vae0cjf.js:263-775 placement
class StartupCcrEnvironment {
  captured = r();
  capturedOwn = isInCloudSession();
  carrier = bridgeMcpCarrierRole();
  ownSessionIds = selfSessionIds();
  selfHostedRunnerChild = isSelfHostedRunnerChild();
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
  get bridgeCarrier() {
    return this.carrier;
  }
  get isBridgeCarrierChild() {
    return this.carrier === "child";
  }
  reset() {
    ((this.captured = r()),
      (this.capturedOwn = isInCloudSession()),
      (this.carrier = bridgeMcpCarrierRole()),
      (this.ownSessionIds = selfSessionIds()),
      (this.selfHostedRunnerChild = isSelfHostedRunnerChild()));
  }
}
/**
 * 启动 CCR 环境单例。
 */
//@ chunk-2vae0cjf.js:775-788 placement
var startupCcrEnv = new StartupCcrEnvironment();
//@ chunk-2vae0cjf.js:788-872 placement
function r() {
  return process.env.SESSION_INGRESS_URL ?? process.env.ANTHROPIC_BASE_URL;
}
//@ chunk-2vae0cjf.js:933-1200 placement
function bridgeMcpCarrierRole() {
  let envClaudeCodeBridgeMcpCarrier = process.env.CLAUDE_CODE_BRIDGE_MCP_CARRIER;
  if (envClaudeCodeBridgeMcpCarrier === "1" || !envClaudeCodeBridgeMcpCarrier)
    return envClaudeCodeBridgeMcpCarrier ? "child" : void 0;
  if (process.env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc" && isEnvTruthy(process.env.CLAUDE_CODE_REMOTE)) {
    delete process.env.CLAUDE_CODE_BRIDGE_MCP_CARRIER;
    return;
  }
  return "descendant";
}
//@ chunk-2vae0cjf.js:1200-1329 placement
function selfSessionIds() {
  return [process.env.CLAUDE_CODE_REMOTE_SESSION_ID, process.env.CLAUDE_CODE_SESSION_ID].filter(
    (e) => e !== void 0 && isSelfAddressableSessionId(e),
  );
}
//@ chunk-2vae0cjf.js:1329-1500 placement
function isSelfHostedRunnerChild() {
  return (
    isEnvTruthy(process.env.CLAUDE_CODE_REMOTE) &&
    process.env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc" &&
    process.env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted"
  );
}

export { startupCcrEnv };
