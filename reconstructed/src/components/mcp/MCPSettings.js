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
import { r1 } from "../../services/mcp/redactMcpErrors.js";
import { describeMcpServerOrigin } from "../../services/mcp/mcpServerOrigin.js";
import { hasValidMcpOAuthToken } from "./CapabilitiesSection.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { extractAgentMcpServers, filterToolsByServer } from "../../services/mcp/utils.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function ls(c) {
  return c.name !== "ide";
}
//@ chunk-cpqpnzp4.js:32697-32727 layout
function ds(Lo) {
  return !r1(Lo);
}
//@ chunk-cpqpnzp4.js:32727-32784 callgraph-fingerprint = _temp4 (1)
function us(a, b) {
  return a.name.localeCompare(b.name);
}
/**
 * MCP 客户端转为设置界面的服务器信息（按传输类型，SSE/HTTP 查询认证状态）。
 */
//@ chunk-cpqpnzp4.js:32784-33273 layout
async function toServerInfo(I) {
  let Oe = {
    name: I.name,
    client: I,
    scope: I.config.scope,
    displayEndpoint: describeMcpServerOrigin(I.name, I.config),
  };
  switch (I.config.type) {
    case "claudeai-proxy": {
      return { ...Oe, transport: "claudeai-proxy", isAuthenticated: !1, config: I.config };
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
      return { ...Oe, transport: "stdio", config: I.config };
    }
  }
}
//@ chunk-cpqpnzp4.js:33273-33299 layout
function negate(zo) {
  return !zo;
}
/**
 * /mcp：服务器列表 → 服务器菜单（stdio/remote/agent）→ 工具列表 → 工具详情；无服务器时提示运行 claude doctor。
 */
//@ chunk-cpqpnzp4.js:33299-37993 fingerprint = MCPSettings (0.774)
function MCPSettings(t0) {
  let $ = w(78),
    { onComplete: onComplete } = t0,
    mcp = useAppState(selectMcp),
    agentDefinitions = useAppState(selectAgentDefinitions),
    mcpClients = mcp.clients,
    k;
  if ($[0] === MEMO_CACHE_SENTINEL) ((k = { type: "list" }), ($[0] = k));
  else k = $[0];
  let [f, b] = y(k),
    N;
  if ($[1] === MEMO_CACHE_SENTINEL) ((N = []), ($[1] = N));
  else N = $[1];
  let [_, h] = y(N),
    [U, ne] = y(!1),
    Y;
  if ($[2] !== agentDefinitions.allAgents)
    ((Y = extractAgentMcpServers(agentDefinitions.allAgents)),
      ($[2] = agentDefinitions.allAgents),
      ($[3] = Y));
  else Y = $[3];
  let K = Y,
    L;
  if ($[4] !== mcpClients) ((L = mcpClients.filter(ls).filter(ds).sort(us)), ($[4] = mcpClients), ($[5] = L));
  else L = $[5];
  let T = L,
    X;
  if ($[6] !== T || $[7] !== mcp.tools) {
    X = {};
    for (const z of T) X[z.name] = filterToolsByServer(mcp.tools, z.name).length;
    (($[6] = T), ($[7] = mcp.tools), ($[8] = X));
  } else X = $[8];
  let J = X,
    me,
    le;
  if ($[9] !== T)
    ((me = () => {
      let ke = !1;
      let prepareServers = async function Pe() {
        let serverInfos = await Promise.all(T.map(toServerInfo));
        if (ke) {
          return;
        }
        h(serverInfos);
      };
      return (
        prepareServers(),
        () => {
          ke = !0;
        }
      );
    }),
      (le = [T]),
      ($[9] = T),
      ($[10] = me),
      ($[11] = le));
  else ((me = $[10]), (le = $[11]));
  P(me, le);
  let xe;
  if (
    $[12] !== K.length ||
    $[13] !== T.length ||
    $[14] !== mcp.reservedNameRefusals?.length ||
    $[15] !== mcp.suppressedClaudeAiConnectors?.length ||
    $[16] !== onComplete ||
    $[17] !== _.length
  )
    ((xe = () => {
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
    }),
      ($[12] = K.length),
      ($[13] = T.length),
      ($[14] = mcp.reservedNameRefusals?.length),
      ($[15] = mcp.suppressedClaudeAiConnectors?.length),
      ($[16] = onComplete),
      ($[17] = _.length),
      ($[18] = xe));
  else xe = $[18];
  const te = mcp.suppressedClaudeAiConnectors?.length,
    Ie = mcp.reservedNameRefusals?.length;
  let ye;
  if (
    $[19] !== K.length ||
    $[20] !== T.length ||
    $[21] !== onComplete ||
    $[22] !== _.length ||
    $[23] !== te ||
    $[24] !== Ie
  )
    ((ye = [_.length, T.length, K.length, te, Ie, onComplete]),
      ($[19] = K.length),
      ($[20] = T.length),
      ($[21] = onComplete),
      ($[22] = _.length),
      ($[23] = te),
      ($[24] = Ie),
      ($[25] = ye));
  else ye = $[25];
  switch ((P(xe, ye), f.type)) {
    case "list": {
      let B, x;
      if ($[26] === MEMO_CACHE_SENTINEL)
        ((B = (server) => b({ type: "server-menu", server: server })),
          (x = (agentServer) => b({ type: "agent-server-menu", agentServer: agentServer })),
          ($[26] = B),
          ($[27] = x));
      else ((B = $[26]), (x = $[27]));
      let D;
      if ($[28] === MEMO_CACHE_SENTINEL) ((D = () => ne(negate)), ($[28] = D));
      else D = $[28];
      let V;
      if (
        $[29] !== K ||
        $[30] !== mcp.reservedNameRefusals ||
        $[31] !== mcp.suppressedClaudeAiConnectors ||
        $[32] !== onComplete ||
        $[33] !== _ ||
        $[34] !== U ||
        $[35] !== J ||
        $[36] !== f.defaultTab
      )
        ((V = e(MCPListPanel, {
          servers: _,
          suppressedClaudeAiConnectors: mcp.suppressedClaudeAiConnectors,
          reservedNameRefusals: mcp.reservedNameRefusals,
          toolCountsByServer: J,
          agentServers: K,
          onSelectServer: B,
          onSelectAgentServer: x,
          onComplete: onComplete,
          defaultTab: f.defaultTab,
          showUnusedConnectors: U,
          onToggleUnusedConnectors: D,
        })),
          ($[29] = K),
          ($[30] = mcp.reservedNameRefusals),
          ($[31] = mcp.suppressedClaudeAiConnectors),
          ($[32] = onComplete),
          ($[33] = _),
          ($[34] = U),
          ($[35] = J),
          ($[36] = f.defaultTab),
          ($[37] = V));
      else V = $[37];
      return V;
    }
    case "server-menu": {
      let B;
      if ($[38] !== mcp.tools || $[39] !== f.server.name)
        ((B = filterToolsByServer(mcp.tools, f.server.name)),
          ($[38] = mcp.tools),
          ($[39] = f.server.name),
          ($[40] = B));
      else B = $[40];
      let ue = B;
      let defaultTab = f.server.transport === "claudeai-proxy" ? "claude.ai" : "Claude Code";
      if (f.server.transport === "stdio") {
        let x;
        if ($[41] !== f.server)
          ((x = () => b({ type: "server-tools", server: f.server })), ($[41] = f.server), ($[42] = x));
        else x = $[42];
        let D;
        if ($[43] !== defaultTab)
          ((D = () => b({ type: "list", defaultTab: defaultTab })), ($[43] = defaultTab), ($[44] = D));
        else D = $[44];
        let V;
        if ($[45] !== onComplete || $[46] !== ue.length || $[47] !== x || $[48] !== D || $[49] !== f.server)
          ((V = e(MCPStdioServerMenu, {
            server: f.server,
            serverToolsCount: ue.length,
            onViewTools: x,
            onCancel: D,
            onComplete: onComplete,
          })),
            ($[45] = onComplete),
            ($[46] = ue.length),
            ($[47] = x),
            ($[48] = D),
            ($[49] = f.server),
            ($[50] = V));
        else V = $[50];
        return V;
      } else {
        let x;
        if ($[51] !== f.server)
          ((x = () => b({ type: "server-tools", server: f.server })), ($[51] = f.server), ($[52] = x));
        else x = $[52];
        let D;
        if ($[53] !== defaultTab)
          ((D = () => b({ type: "list", defaultTab: defaultTab })), ($[53] = defaultTab), ($[54] = D));
        else D = $[54];
        let V;
        if ($[55] !== onComplete || $[56] !== ue.length || $[57] !== x || $[58] !== D || $[59] !== f.server)
          ((V = e(RemoteServerMenuLoader, {
            server: f.server,
            serverToolsCount: ue.length,
            onViewTools: x,
            onCancel: D,
            onComplete: onComplete,
          })),
            ($[55] = onComplete),
            ($[56] = ue.length),
            ($[57] = x),
            ($[58] = D),
            ($[59] = f.server),
            ($[60] = V));
        else V = $[60];
        return V;
      }
    }
    case "server-tools": {
      let B, x;
      if ($[61] !== f.server)
        ((B = (Pn) => b({ type: "server-tool-detail", server: f.server, tool: Pn })),
          (x = () => b({ type: "server-menu", server: f.server })),
          ($[61] = f.server),
          ($[62] = B),
          ($[63] = x));
      else ((B = $[62]), (x = $[63]));
      let D;
      if ($[64] !== B || $[65] !== x || $[66] !== f.server)
        ((D = e(MCPToolListView, { server: f.server, onSelectTool: B, onBack: x })),
          ($[64] = B),
          ($[65] = x),
          ($[66] = f.server),
          ($[67] = D));
      else D = $[67];
      return D;
    }
    case "server-tool-detail": {
      let B;
      if ($[68] !== f.server)
        ((B = () => b({ type: "server-tools", server: f.server })), ($[68] = f.server), ($[69] = B));
      else B = $[69];
      let x;
      if ($[70] !== B || $[71] !== f.server || $[72] !== f.tool)
        ((x = e(MCPToolDetailView, { tool: f.tool, server: f.server, onBack: B })),
          ($[70] = B),
          ($[71] = f.server),
          ($[72] = f.tool),
          ($[73] = x));
      else x = $[73];
      return x;
    }
    case "agent-server-menu": {
      let B;
      if ($[74] === MEMO_CACHE_SENTINEL) ((B = () => b({ type: "list", defaultTab: "Agents" })), ($[74] = B));
      else B = $[74];
      let x;
      if ($[75] !== onComplete || $[76] !== f.agentServer)
        ((x = e(MCPAgentServerMenu, { agentServer: f.agentServer, onCancel: B, onComplete: onComplete })),
          ($[75] = onComplete),
          ($[76] = f.agentServer),
          ($[77] = x));
      else x = $[77];
      return x;
    }
  }
}

export { MCPSettings };
