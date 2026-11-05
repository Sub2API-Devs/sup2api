/**
 * components/mcp/MCPSettings.tsx
 *
 * /mcp 主组件：列表 → 服务器菜单 → 工具列表/详情的多级导航。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPSettings.tsx
 * pieces: chunk-h6004nzv.js (8)
 * attribution: callgraph-fingerprint 3, layout 4, fingerprint 1
 */
import { isArtifacts404Failure } from "../../services/mcp/redactMcpErrors.js";
import { describeMcpServerOrigin } from "../../services/mcp/mcpServerOrigin.js";
import { hasValidMcpOAuthToken } from "./CapabilitiesSection.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { extractAgentMcpServers, filterToolsByServer } from "../../services/mcp/utils.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MCPListPanel } from "./MCPListPanel.js";
import { MCPStdioServerMenu } from "./MCPStdioServerMenu.js";
import { RemoteServerMenuLoader, MCPToolListView } from "./MCPToolListView.js";
import { MCPToolDetailView } from "./MCPToolDetailView.js";
import { MCPAgentServerMenu } from "./MCPAgentServerMenu.js";

//@ chunk-h6004nzv.js:33777-33807 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectMcp(s) {
  return s.mcp;
}
//@ chunk-h6004nzv.js:33807-33850 callgraph-fingerprint (2.1.88 match: _temp2, 1)
function selectAgentDefinitions(s_0) {
  return s_0.agentDefinitions;
}
//@ chunk-h6004nzv.js:33850-33889 layout (2.1.88 match: _temp2, 1)
function isNotIdeServer(c) {
  return c.name !== "ide";
}
//@ chunk-h6004nzv.js:33889-33919 layout
function isNotSelectedServer(client) {
  return !isArtifacts404Failure(client);
}
//@ chunk-h6004nzv.js:33919-33976 callgraph-fingerprint (2.1.88 match: _temp4, 1)
function compareServerNames(a, b) {
  return a.name.localeCompare(b.name);
}
//@ chunk-h6004nzv.js:33976-34475 layout
/**
 * MCP 客户端转为设置界面的服务器信息（按传输类型，SSE/HTTP 查询认证状态）。
 */
async function toServerInfo(client) {
  let serverInfo = {
    name: client.name,
    client,
    scope: client.config.scope,
    displayEndpoint: describeMcpServerOrigin(client.name, client.config),
  };
  switch (client.config.type) {
    case "claudeai-proxy": {
      return {
        ...serverInfo,
        transport: "claudeai-proxy",
        isAuthenticated: false,
        config: client.config,
      };
    }
    case "sse": {
      return {
        ...serverInfo,
        transport: "sse",
        isAuthenticated: await hasValidMcpOAuthToken(client.name, client.config),
        config: client.config,
      };
    }
    case "http": {
      return {
        ...serverInfo,
        transport: "http",
        isAuthenticated: await hasValidMcpOAuthToken(client.name, client.config),
        config: client.config,
      };
    }
    default: {
      return {
        ...serverInfo,
        transport: "stdio",
        config: client.config,
      };
    }
  }
}
//@ chunk-h6004nzv.js:34475-34501 layout
function negate(value) {
  return !value;
}
//@ chunk-h6004nzv.js:34501-38953 fingerprint (2.1.88 match: MCPSettings, 0.658)
/**
 * /mcp：服务器列表 → 服务器菜单（stdio/remote/agent）→ 工具列表 → 工具详情；无服务器时提示运行 claude doctor。
 */
function MCPSettings(props) {
  let $ = useMemoCache(73);
  let { onComplete } = props;
  let mcp = useAppState(selectMcp);
  let agentDefinitions = useAppState(selectAgentDefinitions);
  let mcpClients = mcp.clients;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = {
      type: "list",
    };
    $[0] = t1;
  } else t1 = $[0];
  let [viewState, setViewState] = useState(t1);
  let t2;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t2 = [];
    $[1] = t2;
  } else t2 = $[1];
  let [serverInfos, setServerInfos] = useState(t2);
  let [showUnused, setShowUnused] = useState(false);
  let t3;
  if ($[2] !== agentDefinitions.allAgents) {
    t3 = extractAgentMcpServers(agentDefinitions.allAgents);
    $[2] = agentDefinitions.allAgents;
    $[3] = t3;
  } else t3 = $[3];
  let agentServers = t3;
  let t4;
  if ($[4] !== mcpClients) {
    t4 = mcpClients.filter(isNotIdeServer).filter(isNotSelectedServer).sort(compareServerNames);
    $[4] = mcpClients;
    $[5] = t4;
  } else t4 = $[5];
  let configuredClients = t4;
  let toolCountsByServer;
  if ($[6] !== configuredClients || $[7] !== mcp.tools) {
    toolCountsByServer = {};
    for (const client of configuredClients)
      toolCountsByServer[client.name] = filterToolsByServer(mcp.tools, client.name).length;
    $[6] = configuredClients;
    $[7] = mcp.tools;
    $[8] = toolCountsByServer;
  } else toolCountsByServer = $[8];
  let toolCountsByServer_2 = toolCountsByServer;
  let loadServersEffect;
  let loadServersDeps;
  if ($[9] !== configuredClients) {
    loadServersEffect = () => {
      let cancelled = false;
      let prepareServers = async function prepareServers() {
        let serverInfos = await Promise.all(configuredClients.map(toServerInfo));
        if (cancelled) {
          return;
        }
        setServerInfos(serverInfos);
      };
      prepareServers();
      return () => {
        cancelled = true;
      };
    };
    loadServersDeps = [configuredClients];
    $[9] = configuredClients;
    $[10] = loadServersEffect;
    $[11] = loadServersDeps;
  } else {
    loadServersEffect = $[10];
    loadServersDeps = $[11];
  }
  useEffect(loadServersEffect, loadServersDeps);
  let emptyCheckEffect;
  if (
    $[12] !== agentServers.length ||
    $[13] !== configuredClients.length ||
    $[14] !== mcp.reservedNameRefusals?.length ||
    $[15] !== mcp.suppressedClaudeAiConnectors?.length ||
    $[16] !== onComplete ||
    $[17] !== serverInfos.length
  ) {
    emptyCheckEffect = () => {
      if (serverInfos.length === 0 && configuredClients.length > 0) {
        return;
      }
      if (
        serverInfos.length === 0 &&
        agentServers.length === 0 &&
        (mcp.suppressedClaudeAiConnectors?.length ?? 0) === 0 &&
        (mcp.reservedNameRefusals?.length ?? 0) === 0
      )
        onComplete(
          "No MCP servers configured. Run `claude doctor` if this is unexpected \u2014 it lists MCP config files that failed validation. Otherwise, run `claude mcp --help` or visit https://code.claude.com/docs/en/mcp to learn more.",
        );
    };
    $[12] = agentServers.length;
    $[13] = configuredClients.length;
    $[14] = mcp.reservedNameRefusals?.length;
    $[15] = mcp.suppressedClaudeAiConnectors?.length;
    $[16] = onComplete;
    $[17] = serverInfos.length;
    $[18] = emptyCheckEffect;
  } else emptyCheckEffect = $[18];
  const suppressedCount = mcp.suppressedClaudeAiConnectors?.length;
  const refusalCount = mcp.reservedNameRefusals?.length;
  let emptyCheckDeps;
  if (
    $[19] !== agentServers.length ||
    $[20] !== configuredClients.length ||
    $[21] !== onComplete ||
    $[22] !== serverInfos.length ||
    $[23] !== suppressedCount ||
    $[24] !== refusalCount
  ) {
    emptyCheckDeps = [
      serverInfos.length,
      configuredClients.length,
      agentServers.length,
      suppressedCount,
      refusalCount,
      onComplete,
    ];
    $[19] = agentServers.length;
    $[20] = configuredClients.length;
    $[21] = onComplete;
    $[22] = serverInfos.length;
    $[23] = suppressedCount;
    $[24] = refusalCount;
    $[25] = emptyCheckDeps;
  } else emptyCheckDeps = $[25];
  switch ((useEffect(emptyCheckEffect, emptyCheckDeps), viewState.type)) {
    case "list": {
      let onSelectServer;
      let onSelectAgentServer;
      if ($[26] === MEMO_CACHE_SENTINEL) {
        onSelectServer = (server) =>
          setViewState({
            type: "server-menu",
            server,
          });
        onSelectAgentServer = (agentServer) =>
          setViewState({
            type: "agent-server-menu",
            agentServer,
          });
        $[26] = onSelectServer;
        $[27] = onSelectAgentServer;
      } else {
        onSelectServer = $[26];
        onSelectAgentServer = $[27];
      }
      let onToggleUnusedConnectors;
      if ($[28] === MEMO_CACHE_SENTINEL) {
        onToggleUnusedConnectors = () => setShowUnused(negate);
        $[28] = onToggleUnusedConnectors;
      } else onToggleUnusedConnectors = $[28];
      let view;
      if (
        $[29] !== agentServers ||
        $[30] !== mcp.reservedNameRefusals ||
        $[31] !== mcp.suppressedClaudeAiConnectors ||
        $[32] !== onComplete ||
        $[33] !== serverInfos ||
        $[34] !== showUnused ||
        $[35] !== toolCountsByServer_2
      ) {
        view = jsxProd_default(MCPListPanel, {
          servers: serverInfos,
          suppressedClaudeAiConnectors: mcp.suppressedClaudeAiConnectors,
          reservedNameRefusals: mcp.reservedNameRefusals,
          toolCountsByServer: toolCountsByServer_2,
          agentServers,
          onSelectServer,
          onSelectAgentServer,
          onComplete,
          showUnusedConnectors: showUnused,
          onToggleUnusedConnectors,
        });
        $[29] = agentServers;
        $[30] = mcp.reservedNameRefusals;
        $[31] = mcp.suppressedClaudeAiConnectors;
        $[32] = onComplete;
        $[33] = serverInfos;
        $[34] = showUnused;
        $[35] = toolCountsByServer_2;
        $[36] = view;
      } else view = $[36];
      return view;
    }
    case "server-menu": {
      let t9;
      if ($[37] !== mcp.tools || $[38] !== viewState.server.name) {
        t9 = filterToolsByServer(mcp.tools, viewState.server.name);
        $[37] = mcp.tools;
        $[38] = viewState.server.name;
        $[39] = t9;
      } else t9 = $[39];
      let serverTools = t9;
      if (viewState.server.transport === "stdio") {
        let onViewTools;
        if ($[40] !== viewState.server) {
          onViewTools = () =>
            setViewState({
              type: "server-tools",
              server: viewState.server,
            });
          $[40] = viewState.server;
          $[41] = onViewTools;
        } else onViewTools = $[41];
        let onCancel;
        if ($[42] === MEMO_CACHE_SENTINEL) {
          onCancel = () =>
            setViewState({
              type: "list",
            });
          $[42] = onCancel;
        } else onCancel = $[42];
        let t12;
        if (
          $[43] !== onComplete ||
          $[44] !== serverTools.length ||
          $[45] !== onViewTools ||
          $[46] !== viewState.server
        ) {
          t12 = jsxProd_default(MCPStdioServerMenu, {
            server: viewState.server,
            serverToolsCount: serverTools.length,
            onViewTools,
            onCancel,
            onComplete,
          });
          $[43] = onComplete;
          $[44] = serverTools.length;
          $[45] = onViewTools;
          $[46] = viewState.server;
          $[47] = t12;
        } else t12 = $[47];
        return t12;
      } else {
        let onViewTools;
        if ($[48] !== viewState.server) {
          onViewTools = () =>
            setViewState({
              type: "server-tools",
              server: viewState.server,
            });
          $[48] = viewState.server;
          $[49] = onViewTools;
        } else onViewTools = $[49];
        let onCancel;
        if ($[50] === MEMO_CACHE_SENTINEL) {
          onCancel = () =>
            setViewState({
              type: "list",
            });
          $[50] = onCancel;
        } else onCancel = $[50];
        let t12;
        if (
          $[51] !== onComplete ||
          $[52] !== serverTools.length ||
          $[53] !== onViewTools ||
          $[54] !== viewState.server
        ) {
          t12 = jsxProd_default(RemoteServerMenuLoader, {
            server: viewState.server,
            serverToolsCount: serverTools.length,
            onViewTools,
            onCancel,
            onComplete,
          });
          $[51] = onComplete;
          $[52] = serverTools.length;
          $[53] = onViewTools;
          $[54] = viewState.server;
          $[55] = t12;
        } else t12 = $[55];
        return t12;
      }
    }
    case "server-tools": {
      let onSelectTool;
      let onBack;
      if ($[56] !== viewState.server) {
        onSelectTool = (tool) =>
          setViewState({
            type: "server-tool-detail",
            server: viewState.server,
            tool,
          });
        onBack = () =>
          setViewState({
            type: "server-menu",
            server: viewState.server,
          });
        $[56] = viewState.server;
        $[57] = onSelectTool;
        $[58] = onBack;
      } else {
        onSelectTool = $[57];
        onBack = $[58];
      }
      let t11;
      if ($[59] !== onSelectTool || $[60] !== onBack || $[61] !== viewState.server) {
        t11 = jsxProd_default(MCPToolListView, {
          server: viewState.server,
          onSelectTool,
          onBack,
        });
        $[59] = onSelectTool;
        $[60] = onBack;
        $[61] = viewState.server;
        $[62] = t11;
      } else t11 = $[62];
      return t11;
    }
    case "server-tool-detail": {
      let onBack;
      if ($[63] !== viewState.server) {
        onBack = () =>
          setViewState({
            type: "server-tools",
            server: viewState.server,
          });
        $[63] = viewState.server;
        $[64] = onBack;
      } else onBack = $[64];
      let t11;
      if ($[65] !== onBack || $[66] !== viewState.server || $[67] !== viewState.tool) {
        t11 = jsxProd_default(MCPToolDetailView, {
          tool: viewState.tool,
          server: viewState.server,
          onBack,
        });
        $[65] = onBack;
        $[66] = viewState.server;
        $[67] = viewState.tool;
        $[68] = t11;
      } else t11 = $[68];
      return t11;
    }
    case "agent-server-menu": {
      let onCancel;
      if ($[69] === MEMO_CACHE_SENTINEL) {
        onCancel = () =>
          setViewState({
            type: "list",
          });
        $[69] = onCancel;
      } else onCancel = $[69];
      let t10;
      if ($[70] !== onComplete || $[71] !== viewState.agentServer) {
        t10 = jsxProd_default(MCPAgentServerMenu, {
          agentServer: viewState.agentServer,
          onCancel,
          onComplete,
        });
        $[70] = onComplete;
        $[71] = viewState.agentServer;
        $[72] = t10;
      } else t10 = $[72];
      return t10;
    }
  }
}
export { MCPSettings };
