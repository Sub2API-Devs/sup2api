/**
 * components/mcp/MCPSettings.tsx
 *
 * /mcp 主组件：列表 → 服务器菜单 → 工具列表/详情的多级导航。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPSettings.tsx
 * pieces: chunk-cpqpnzp4.js (8)
 * attribution: callgraph-fingerprint 3, layout 4, fingerprint 1
 */
import { isArtifacts404Failure } from "../../services/mcp/redactMcpErrors.js";
import { describeMcpServerOrigin } from "../../services/mcp/mcpServerOrigin.js";
import { hasValidMcpOAuthToken } from "./CapabilitiesSection.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { extractAgentMcpServers, filterToolsByServer } from "../../services/mcp/utils.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MCPListPanel } from "./MCPListPanel.js";
import { MCPStdioServerMenu } from "./MCPStdioServerMenu.js";
import { RemoteServerMenuLoader, MCPToolListView } from "./MCPToolListView.js";
import { MCPToolDetailView } from "./MCPToolDetailView.js";
import { MCPAgentServerMenu } from "./MCPAgentServerMenu.js";

//@ chunk-cpqpnzp4.js:32585-32615 callgraph-fingerprint = _temp (1)
function selectMcp(s) {
  return s.mcp;
}
//@ chunk-cpqpnzp4.js:32615-32658 callgraph-fingerprint = _temp2 (1)
function selectAgentDefinitions(s_0) {
  return s_0.agentDefinitions;
}
//@ chunk-cpqpnzp4.js:32658-32697 layout = _temp2 (1)
function isNotIdeServer(c) {
  return c.name !== "ide";
}
//@ chunk-cpqpnzp4.js:32697-32727 layout
function isNotSelectedServer(Lo) {
  return !isArtifacts404Failure(Lo);
}
//@ chunk-cpqpnzp4.js:32727-32784 callgraph-fingerprint = _temp4 (1)
function compareServerNames(a, b) {
  return a.name.localeCompare(b.name);
}
//@ chunk-cpqpnzp4.js:32784-33273 layout
/**
 * MCP 客户端转为设置界面的服务器信息（按传输类型，SSE/HTTP 查询认证状态）。
 */
async function toServerInfo(I) {
  let Oe = {
    name: I.name,
    client: I,
    scope: I.config.scope,
    displayEndpoint: describeMcpServerOrigin(I.name, I.config),
  };
  switch (I.config.type) {
    case "claudeai-proxy": {
      return {
        ...Oe,
        transport: "claudeai-proxy",
        isAuthenticated: false,
        config: I.config,
      };
    }
    case "sse": {
      return {
        ...Oe,
        transport: "sse",
        isAuthenticated: await hasValidMcpOAuthToken(I.name, I.config),
        config: I.config,
      };
    }
    case "http": {
      return {
        ...Oe,
        transport: "http",
        isAuthenticated: await hasValidMcpOAuthToken(I.name, I.config),
        config: I.config,
      };
    }
    default: {
      return {
        ...Oe,
        transport: "stdio",
        config: I.config,
      };
    }
  }
}
//@ chunk-cpqpnzp4.js:33273-33299 layout
function negate(zo) {
  return !zo;
}
//@ chunk-cpqpnzp4.js:33299-37993 fingerprint = MCPSettings (0.774)
/**
 * /mcp：服务器列表 → 服务器菜单（stdio/remote/agent）→ 工具列表 → 工具详情；无服务器时提示运行 claude doctor。
 */
function MCPSettings(props) {
  let $ = w(78);
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
  let [viewState, setViewState] = y(t1);
  let t2;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t2 = [];
    $[1] = t2;
  } else t2 = $[1];
  let [_, h] = y(t2);
  let [U, ne] = y(false);
  let t3;
  if ($[2] !== agentDefinitions.allAgents) {
    t3 = extractAgentMcpServers(agentDefinitions.allAgents);
    $[2] = agentDefinitions.allAgents;
    $[3] = t3;
  } else t3 = $[3];
  let K = t3;
  let t4;
  if ($[4] !== mcpClients) {
    t4 = mcpClients.filter(isNotIdeServer).filter(isNotSelectedServer).sort(compareServerNames);
    $[4] = mcpClients;
    $[5] = t4;
  } else t4 = $[5];
  let T = t4;
  let X;
  if ($[6] !== T || $[7] !== mcp.tools) {
    X = {};
    for (const z of T) X[z.name] = filterToolsByServer(mcp.tools, z.name).length;
    $[6] = T;
    $[7] = mcp.tools;
    $[8] = X;
  } else X = $[8];
  let toolCountsByServer = X;
  let me;
  let le;
  if ($[9] !== T) {
    me = () => {
      let ke = false;
      let prepareServers = async function prepareServers() {
        let serverInfos = await Promise.all(T.map(toServerInfo));
        if (ke) {
          return;
        }
        h(serverInfos);
      };
      prepareServers();
      return () => {
        ke = true;
      };
    };
    le = [T];
    $[9] = T;
    $[10] = me;
    $[11] = le;
  } else {
    me = $[10];
    le = $[11];
  }
  P(me, le);
  let xe;
  if (
    $[12] !== K.length ||
    $[13] !== T.length ||
    $[14] !== mcp.reservedNameRefusals?.length ||
    $[15] !== mcp.suppressedClaudeAiConnectors?.length ||
    $[16] !== onComplete ||
    $[17] !== _.length
  ) {
    xe = () => {
      if (_.length === 0 && T.length > 0) {
        return;
      }
      if (
        _.length === 0 &&
        K.length === 0 &&
        (mcp.suppressedClaudeAiConnectors?.length ?? 0) === 0 &&
        (mcp.reservedNameRefusals?.length ?? 0) === 0
      )
        onComplete(
          "No MCP servers configured. Run `claude doctor` if this is unexpected \u2014 it lists MCP config files that failed validation. Otherwise, run `claude mcp --help` or visit https://code.claude.com/docs/en/mcp to learn more.",
        );
    };
    $[12] = K.length;
    $[13] = T.length;
    $[14] = mcp.reservedNameRefusals?.length;
    $[15] = mcp.suppressedClaudeAiConnectors?.length;
    $[16] = onComplete;
    $[17] = _.length;
    $[18] = xe;
  } else xe = $[18];
  const te = mcp.suppressedClaudeAiConnectors?.length;
  const Ie = mcp.reservedNameRefusals?.length;
  let ye;
  if (
    $[19] !== K.length ||
    $[20] !== T.length ||
    $[21] !== onComplete ||
    $[22] !== _.length ||
    $[23] !== te ||
    $[24] !== Ie
  ) {
    ye = [_.length, T.length, K.length, te, Ie, onComplete];
    $[19] = K.length;
    $[20] = T.length;
    $[21] = onComplete;
    $[22] = _.length;
    $[23] = te;
    $[24] = Ie;
    $[25] = ye;
  } else ye = $[25];
  switch ((P(xe, ye), viewState.type)) {
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
        onToggleUnusedConnectors = () => ne(negate);
        $[28] = onToggleUnusedConnectors;
      } else onToggleUnusedConnectors = $[28];
      let t11;
      if (
        $[29] !== K ||
        $[30] !== mcp.reservedNameRefusals ||
        $[31] !== mcp.suppressedClaudeAiConnectors ||
        $[32] !== onComplete ||
        $[33] !== _ ||
        $[34] !== U ||
        $[35] !== toolCountsByServer ||
        $[36] !== viewState.defaultTab
      ) {
        t11 = jsxProd_default(MCPListPanel, {
          servers: _,
          suppressedClaudeAiConnectors: mcp.suppressedClaudeAiConnectors,
          reservedNameRefusals: mcp.reservedNameRefusals,
          toolCountsByServer,
          agentServers: K,
          onSelectServer,
          onSelectAgentServer,
          onComplete,
          defaultTab: viewState.defaultTab,
          showUnusedConnectors: U,
          onToggleUnusedConnectors,
        });
        $[29] = K;
        $[30] = mcp.reservedNameRefusals;
        $[31] = mcp.suppressedClaudeAiConnectors;
        $[32] = onComplete;
        $[33] = _;
        $[34] = U;
        $[35] = toolCountsByServer;
        $[36] = viewState.defaultTab;
        $[37] = t11;
      } else t11 = $[37];
      return t11;
    }
    case "server-menu": {
      let t9;
      if ($[38] !== mcp.tools || $[39] !== viewState.server.name) {
        t9 = filterToolsByServer(mcp.tools, viewState.server.name);
        $[38] = mcp.tools;
        $[39] = viewState.server.name;
        $[40] = t9;
      } else t9 = $[40];
      let serverTools = t9;
      let defaultTab = viewState.server.transport === "claudeai-proxy" ? "claude.ai" : "Claude Code";
      if (viewState.server.transport === "stdio") {
        let onViewTools;
        if ($[41] !== viewState.server) {
          onViewTools = () =>
            setViewState({
              type: "server-tools",
              server: viewState.server,
            });
          $[41] = viewState.server;
          $[42] = onViewTools;
        } else onViewTools = $[42];
        let onCancel;
        if ($[43] !== defaultTab) {
          onCancel = () =>
            setViewState({
              type: "list",
              defaultTab,
            });
          $[43] = defaultTab;
          $[44] = onCancel;
        } else onCancel = $[44];
        let t12;
        if (
          $[45] !== onComplete ||
          $[46] !== serverTools.length ||
          $[47] !== onViewTools ||
          $[48] !== onCancel ||
          $[49] !== viewState.server
        ) {
          t12 = jsxProd_default(MCPStdioServerMenu, {
            server: viewState.server,
            serverToolsCount: serverTools.length,
            onViewTools,
            onCancel,
            onComplete,
          });
          $[45] = onComplete;
          $[46] = serverTools.length;
          $[47] = onViewTools;
          $[48] = onCancel;
          $[49] = viewState.server;
          $[50] = t12;
        } else t12 = $[50];
        return t12;
      } else {
        let onViewTools;
        if ($[51] !== viewState.server) {
          onViewTools = () =>
            setViewState({
              type: "server-tools",
              server: viewState.server,
            });
          $[51] = viewState.server;
          $[52] = onViewTools;
        } else onViewTools = $[52];
        let onCancel;
        if ($[53] !== defaultTab) {
          onCancel = () =>
            setViewState({
              type: "list",
              defaultTab,
            });
          $[53] = defaultTab;
          $[54] = onCancel;
        } else onCancel = $[54];
        let t12;
        if (
          $[55] !== onComplete ||
          $[56] !== serverTools.length ||
          $[57] !== onViewTools ||
          $[58] !== onCancel ||
          $[59] !== viewState.server
        ) {
          t12 = jsxProd_default(RemoteServerMenuLoader, {
            server: viewState.server,
            serverToolsCount: serverTools.length,
            onViewTools,
            onCancel,
            onComplete,
          });
          $[55] = onComplete;
          $[56] = serverTools.length;
          $[57] = onViewTools;
          $[58] = onCancel;
          $[59] = viewState.server;
          $[60] = t12;
        } else t12 = $[60];
        return t12;
      }
    }
    case "server-tools": {
      let onSelectTool;
      let onBack;
      if ($[61] !== viewState.server) {
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
        $[61] = viewState.server;
        $[62] = onSelectTool;
        $[63] = onBack;
      } else {
        onSelectTool = $[62];
        onBack = $[63];
      }
      let t11;
      if ($[64] !== onSelectTool || $[65] !== onBack || $[66] !== viewState.server) {
        t11 = jsxProd_default(MCPToolListView, {
          server: viewState.server,
          onSelectTool,
          onBack,
        });
        $[64] = onSelectTool;
        $[65] = onBack;
        $[66] = viewState.server;
        $[67] = t11;
      } else t11 = $[67];
      return t11;
    }
    case "server-tool-detail": {
      let onBack;
      if ($[68] !== viewState.server) {
        onBack = () =>
          setViewState({
            type: "server-tools",
            server: viewState.server,
          });
        $[68] = viewState.server;
        $[69] = onBack;
      } else onBack = $[69];
      let t11;
      if ($[70] !== onBack || $[71] !== viewState.server || $[72] !== viewState.tool) {
        t11 = jsxProd_default(MCPToolDetailView, {
          tool: viewState.tool,
          server: viewState.server,
          onBack,
        });
        $[70] = onBack;
        $[71] = viewState.server;
        $[72] = viewState.tool;
        $[73] = t11;
      } else t11 = $[73];
      return t11;
    }
    case "agent-server-menu": {
      let onCancel;
      if ($[74] === MEMO_CACHE_SENTINEL) {
        onCancel = () =>
          setViewState({
            type: "list",
            defaultTab: "Agents",
          });
        $[74] = onCancel;
      } else onCancel = $[74];
      let t10;
      if ($[75] !== onComplete || $[76] !== viewState.agentServer) {
        t10 = jsxProd_default(MCPAgentServerMenu, {
          agentServer: viewState.agentServer,
          onCancel,
          onComplete,
        });
        $[75] = onComplete;
        $[76] = viewState.agentServer;
        $[77] = t10;
      } else t10 = $[77];
      return t10;
    }
  }
}
export { MCPSettings };
