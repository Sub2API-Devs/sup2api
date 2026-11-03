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
import { y, P, qt, Se } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { isMcpServerDisabled, mcpDialBlockCause } from "./config.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { isUnhiddenFailedServer } from "../../hooks/notifs/useMcpConnectivityStatus.js";
import { describeDisabledServers } from "./mcpToggleMessages.js";

//@ chunk-18hwfzwa.js:1738247-1738407 placement
/**
 * React hook：订阅组织限制 allow_claude_browser_extension 的变化（微任务里重读），返回当前是否允许 Claude in Chrome 浏览器扩展。
 */
function useBrowserExtensionAllowed() {
  let [h, x] = y(getInitialBrowserExtensionAllowed);
  P(() => {
    let D = true;
    let L = () => {
      let browserExtensionRestriction = readBrowserExtensionRestriction();
      if (D && browserExtensionRestriction !== null) x(browserExtensionRestriction);
    };
    let ee = onPolicyVerdictChanged(() => queueMicrotask(L));
    L();
    return () => {
      D = false;
      ee();
    };
  }, []);
  return h;
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
    let h = policyDenyKind(ALLOW_CLAUDE_BROWSER_EXTENSION);
    switch (h) {
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
var MCPConnectionContext = qt(null);
//@ chunk-18hwfzwa.js:1738843-1738978 fingerprint = useMcpReconnect (1)
/**
 * useMcpReconnect：从 MCPConnectionContext 取 reconnectMcpServer，不在 Provider 内抛错。
 */
function useMcpReconnect() {
  let context = Se(MCPConnectionContext);
  if (!context) {
    throw Error("useMcpReconnect must be used within MCPConnectionManager");
  }
  return context.reconnectMcpServer;
}
//@ chunk-18hwfzwa.js:1738978-1739114 fingerprint = useMcpToggleEnabled (1)
/**
 * useMcpToggleEnabled：从 MCPConnectionContext 取 toggleMcpServer，不在 Provider 内抛错。
 */
function useMcpToggleEnabled() {
  let context = Se(MCPConnectionContext);
  if (!context) {
    throw Error("useMcpToggleEnabled must be used within MCPConnectionManager");
  }
  return context.toggleMcpServer;
}
//@ chunk-18hwfzwa.js:1739114-1739793 fingerprint = MCPConnectionManager (0.7)
/**
 * MCPConnectionManager React 组件：调用 useManageMCPConnections 管理全部连接，通过 MCPConnectionContext 向子树提供 reconnectMcpServer/toggleMcpServer，并注册全局 searchRedial。
 */
function MCPConnectionManager(props) {
  let He = w(12);
  let { children, dynamicMcpConfig, isStrictMcpConfig, permissionRelays, requestDialog } = props;
  let { reconnectMcpServer, toggleMcpServer } = useManageMCPConnections(
    dynamicMcpConfig,
    isStrictMcpConfig,
    permissionRelays,
    requestDialog,
  );
  let toggleMcpServer_2;
  if (He[0] !== toggleMcpServer) {
    toggleMcpServer_2 = async (ze) => {
      await toggleMcpServer(ze);
    };
    He[0] = toggleMcpServer;
    He[1] = toggleMcpServer_2;
  } else toggleMcpServer_2 = He[1];
  let Xe;
  if (He[2] !== reconnectMcpServer || He[3] !== toggleMcpServer_2) {
    Xe = {
      reconnectMcpServer,
      toggleMcpServer: toggleMcpServer_2,
    };
    He[2] = reconnectMcpServer;
    He[3] = toggleMcpServer_2;
    He[4] = Xe;
  } else Xe = He[4];
  let value = Xe;
  let kt;
  let At;
  if (He[5] !== reconnectMcpServer || He[6] !== toggleMcpServer) {
    kt = () => {
      setReconnectHandles(reconnectMcpServer, toggleMcpServer, isMcpServerDisabled, mcpDialBlockCause);
      getCliOwnedState().searchRedial = redialFailedMcpServers(reconnectMcpServer);
      return teardownMcpGlobalHandles;
    };
    At = [reconnectMcpServer, toggleMcpServer];
    He[5] = reconnectMcpServer;
    He[6] = toggleMcpServer;
    He[7] = kt;
    He[8] = At;
  } else {
    kt = He[7];
    At = He[8];
  }
  P(kt, At);
  let t2;
  if (He[9] !== children || He[10] !== value) {
    t2 = jsxProd_default(MCPConnectionContext.Provider, {
      value,
      children,
    });
    He[9] = children;
    He[10] = value;
    He[11] = t2;
  } else t2 = He[11];
  return t2;
}
//@ chunk-26sy0x4v.js:232-316 placement
/**
 * 选出需要重连的失败服务器并附上禁用服务器说明。
 */
function reconnectTargets(e, n) {
  return {
    targets: e.filter((t) => isUnhiddenFailedServer(t, n)),
    outOfBandNote: describeDisabledServers(e, true, n),
  };
}
//@ chunk-26sy0x4v.js:316-508 placement
/**
 * 并行重连给定的 MCP 服务器，返回各自结果与成功连接的数量。
 */
async function reconnectAllServers(e, n) {
  let settled = await Promise.allSettled(e.map((o) => n(o.name)));
  let r = 0;
  for (let o of settled) if (o.status === "fulfilled" && o.value.client.type === "connected") r++;
  return {
    results: settled,
    connected: r,
  };
}
export {
  MCPConnectionManager,
  useBrowserExtensionAllowed,
  reconnectTargets,
  reconnectAllServers,
  useMcpReconnect,
  useMcpToggleEnabled,
};
