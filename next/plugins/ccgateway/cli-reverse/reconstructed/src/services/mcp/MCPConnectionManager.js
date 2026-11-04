/**
 * services/mcp/MCPConnectionManager.tsx
 *
 * 并入旧版已有路径：MCP 连接管理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/MCPConnectionManager.tsx
 * pieces: chunk-18hwfzwa.js (9), chunk-26sy0x4v.js (2)
 * attribution: placement 7, layout 1, fingerprint 3
 */
import { isUnhiddenFailedServer } from "../../hooks/notifs/useMcpConnectivityStatus.js";
import { describeDisabledServers } from "./mcpToggleMessages.js";
import {
  useState,
  useEffect,
  createContext,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import {
  onPolicyVerdictChanged,
  getPolicyLimitsIneligibleReason,
  PRINCIPALS_NEVER_SERVED,
} from "../policyLimits/policyState.js";
import { isPolicyAllowed } from "../policyLimits/policyVerdicts.js";
import {
  ALLOW_CLAUDE_BROWSER_EXTENSION,
  useManageMCPConnections,
  redialFailedMcpServers,
} from "./useManageMCPConnections.js";
import {
  policyDenyKind,
  isSessionVerdictFromServerFetch,
  getResponseFromCache,
} from "../policyLimits/policyEvidence.js";
import { clearReconnectHandles, setReconnectHandles } from "./reconnectHandles.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { isMcpServerDisabled, mcpDialBlockCause } from "./config.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-26sy0x4v.js:232-316 placement
/**
 * 选出需要重连的失败服务器并附上禁用服务器说明。
 */
function reconnectTargets(clients, context) {
  return {
    targets: clients.filter((client) => isUnhiddenFailedServer(client, context)),
    outOfBandNote: describeDisabledServers(clients, true, context),
  };
}
//@ chunk-26sy0x4v.js:316-508 placement
/**
 * 并行重连给定的 MCP 服务器，返回各自结果与成功连接的数量。
 */
async function reconnectAllServers(targets, reconnect) {
  let settled = await Promise.allSettled(targets.map((target) => reconnect(target.name)));
  let connectedCount = 0;
  for (let outcome of settled)
    if (outcome.status === "fulfilled" && outcome.value.client.type === "connected") connectedCount++;
  return {
    results: settled,
    connected: connectedCount,
  };
}
//@ chunk-18hwfzwa.js:1738247-1738407 placement
/**
 * React hook：订阅组织限制 allow_claude_browser_extension 的变化（微任务里重读），返回当前是否允许 Claude in Chrome 浏览器扩展。
 */
function useBrowserExtensionAllowed() {
  let [allowed, setAllowed] = useState(getInitialBrowserExtensionAllowed);
  useEffect(() => {
    let mounted = true;
    let update = () => {
      let browserExtensionRestriction = readBrowserExtensionRestriction();
      if (mounted && browserExtensionRestriction !== null) setAllowed(browserExtensionRestriction);
    };
    let unsubscribe = onPolicyVerdictChanged(() => queueMicrotask(update));
    update();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  return allowed;
}
//@ chunk-18hwfzwa.js:1738407-1738464 placement
/**
 * hook 初始值：先读组织限制，读不到时用缓存判定，异常时默认允许。
 */
function getInitialBrowserExtensionAllowed() {
  try {
    return readBrowserExtensionRestriction() ?? isPolicyAllowed(ALLOW_CLAUDE_BROWSER_EXTENSION);
  } catch {
    return true;
  }
}
//@ chunk-18hwfzwa.js:1738464-1738727 placement
/**
 * 读组织限制 allow_claude_browser_extension：未设置→允许或待定；cache_miss/route_missing→null；latched/org_denied→按 restrictions.allowed 决定；返回 true/false/null。
 */
function readBrowserExtensionRestriction() {
  try {
    let denyKind = policyDenyKind(ALLOW_CLAUDE_BROWSER_EXTENSION);
    switch (denyKind) {
      case null:
        return isSessionVerdictFromServerFetch() || isEntrypointExemptFromBrowserRestriction() ? true : null;
      case "cache_miss":
      case "route_missing":
        return null;
      case "latched":
      case "org_denied":
        return getResponseFromCache()?.restrictions[ALLOW_CLAUDE_BROWSER_EXTENSION]?.allowed === false ||
          isSessionVerdictFromServerFetch() ||
          isEntrypointExemptFromBrowserRestriction()
          ? false
          : null;
      default:
        return false;
    }
  } catch {
    return null;
  }
}
//@ chunk-18hwfzwa.js:1738727-1738783 placement
/**
 * 当前入口（entrypoint）属于一组豁免入口时为真，此时浏览器扩展限制按允许处理。
 */
function isEntrypointExemptFromBrowserRestriction() {
  let policyLimitsIneligibleReason = getPolicyLimitsIneligibleReason();
  return (
    policyLimitsIneligibleReason !== undefined && PRINCIPALS_NEVER_SERVED.has(policyLimitsIneligibleReason)
  );
}
//@ chunk-18hwfzwa.js:1738783-1738827 placement
function teardownMcpGlobalHandles() {
  clearReconnectHandles();
  getCliOwnedState().searchRedial = null;
}
//@ chunk-18hwfzwa.js:1738827-1738843 layout
var MCPConnectionContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1738827", () => {
  MCPConnectionContext = createContext(null);
});
//@ chunk-18hwfzwa.js:1738843-1738978 fingerprint (2.1.88 match: useMcpReconnect, 1)
/**
 * useMcpReconnect：从 MCPConnectionContext 取 reconnectMcpServer，不在 Provider 内抛错。
 */
function useMcpReconnect() {
  let context = useContext(MCPConnectionContext);
  if (!context) {
    throw Error("useMcpReconnect must be used within MCPConnectionManager");
  }
  return context.reconnectMcpServer;
}
//@ chunk-18hwfzwa.js:1738978-1739114 fingerprint (2.1.88 match: useMcpToggleEnabled, 1)
/**
 * useMcpToggleEnabled：从 MCPConnectionContext 取 toggleMcpServer，不在 Provider 内抛错。
 */
function useMcpToggleEnabled() {
  let context = useContext(MCPConnectionContext);
  if (!context) {
    throw Error("useMcpToggleEnabled must be used within MCPConnectionManager");
  }
  return context.toggleMcpServer;
}
//@ chunk-18hwfzwa.js:1739114-1739793 fingerprint (2.1.88 match: MCPConnectionManager, 0.7)
/**
 * MCPConnectionManager React 组件：调用 useManageMCPConnections 管理全部连接，通过 MCPConnectionContext 向子树提供 reconnectMcpServer/toggleMcpServer，并注册全局 searchRedial。
 */
function MCPConnectionManager(props) {
  let $ = useMemoCache(12);
  let { children, dynamicMcpConfig, isStrictMcpConfig, permissionRelays, requestDialog } = props;
  let { reconnectMcpServer, toggleMcpServer } = useManageMCPConnections(
    dynamicMcpConfig,
    isStrictMcpConfig,
    permissionRelays,
    requestDialog,
  );
  let toggleMcpServer_2;
  if ($[0] !== toggleMcpServer) {
    toggleMcpServer_2 = async (serverName) => {
      await toggleMcpServer(serverName);
    };
    $[0] = toggleMcpServer;
    $[1] = toggleMcpServer_2;
  } else toggleMcpServer_2 = $[1];
  let contextValue;
  if ($[2] !== reconnectMcpServer || $[3] !== toggleMcpServer_2) {
    contextValue = {
      reconnectMcpServer,
      toggleMcpServer: toggleMcpServer_2,
    };
    $[2] = reconnectMcpServer;
    $[3] = toggleMcpServer_2;
    $[4] = contextValue;
  } else contextValue = $[4];
  let value = contextValue;
  let setupHandles;
  let dependencies;
  if ($[5] !== reconnectMcpServer || $[6] !== toggleMcpServer) {
    setupHandles = () => {
      setReconnectHandles(reconnectMcpServer, toggleMcpServer, isMcpServerDisabled, mcpDialBlockCause);
      getCliOwnedState().searchRedial = redialFailedMcpServers(reconnectMcpServer);
      return teardownMcpGlobalHandles;
    };
    dependencies = [reconnectMcpServer, toggleMcpServer];
    $[5] = reconnectMcpServer;
    $[6] = toggleMcpServer;
    $[7] = setupHandles;
    $[8] = dependencies;
  } else {
    setupHandles = $[7];
    dependencies = $[8];
  }
  useEffect(setupHandles, dependencies);
  let t2;
  if ($[9] !== children || $[10] !== value) {
    t2 = jsxProd_default(MCPConnectionContext.Provider, {
      value,
      children,
    });
    $[9] = children;
    $[10] = value;
    $[11] = t2;
  } else t2 = $[11];
  return t2;
}
export {
  MCPConnectionManager,
  useBrowserExtensionAllowed,
  reconnectTargets,
  reconnectAllServers,
  useMcpReconnect,
  useMcpToggleEnabled,
};
