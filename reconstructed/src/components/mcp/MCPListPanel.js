/**
 * components/mcp/MCPListPanel.tsx
 *
 * /mcp 列表面板：按作用域列出服务器及状态（connected/needs-auth/failed/disabled）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPListPanel.tsx
 * pieces: chunk-9qfjhaj4.js (1), chunk-cpqpnzp4.js (20), chunk-dcmhvw5a.js (1)
 * attribution: fingerprint 4, sole-consumer 5, affinity 3, callgraph-fingerprint 5, layout 5
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { merged } from "../CustomSelect/select.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { describeMcpConfigFilePath } from "../../services/mcp/utils.js";
import { getMainThreadAgentType } from "../../bootstrap/state.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { claudeCommand } from "../../utils/worktreeResumeHint.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { ParenHint } from "../diff/DiffDetailView.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { getEverConnectedClaudeAiMcpSet } from "../../services/mcp/claudeai.js";
import { isDebugMode } from "../../utils/debug.js";
import { isUnconfiguredFailure } from "../../services/mcp/redactMcpErrors.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { uniq } from "../../utils/collections.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { renderToolResultMessage } from "../../tools/SendMessageTool/UI.js";
import { McpParsingWarnings } from "./McpParsingWarnings.js";
import { plural } from "../../utils/stringUtils.js";
import { Dialog } from "../design-system/Dialog.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { formatToolConnectionState } from "./CapabilitiesSection.js";
import { withConfigScope, decorateMcpTools, stampToolScope } from "../../services/mcp/mcpToolDecoration.js";
import { isPluginServerConfig } from "../../services/mcp/types.js";

//@ chunk-cpqpnzp4.js:21061-21065 sole-consumer
init_react_production();
//@ chunk-cpqpnzp4.js:21065-21107 sole-consumer
function isAgentScopeServer(ei) {
  return ei.scope === "agent";
}
//@ chunk-cpqpnzp4.js:21107-21138 affinity
function serverName(ni) {
  return ni.name;
}
//@ chunk-cpqpnzp4.js:21138-21182 callgraph-fingerprint = _temp (0.493)
function isConfiguredServer(s) {
  return !isClaudeAiProxyServer(s.client.config);
}
//@ chunk-cpqpnzp4.js:21182-21239 callgraph-fingerprint = _temp3 (1)
function compareByName(a, b) {
  return a.name.localeCompare(b.name);
}
//@ chunk-cpqpnzp4.js:21239-21296 callgraph-fingerprint = _temp4 (1)
function compareByName_2(a_0, b_0) {
  return a_0.name.localeCompare(b_0.name);
}
//@ chunk-cpqpnzp4.js:21296-21353 layout
function compareByName_3(ai, ci) {
  return ai.name.localeCompare(ci.name);
}
//@ chunk-cpqpnzp4.js:21353-21384 layout
function entryServerName(li) {
  return li.name;
}
//@ chunk-cpqpnzp4.js:21384-21423 fingerprint = _temp6 (1)
function sourceAgentsOf(s_2) {
  return s_2.sourceAgents;
}
//@ chunk-cpqpnzp4.js:21423-21474 affinity
function targetList(Xo) {
  return "target" in Xo ? [Xo.target] : [];
}
//@ chunk-cpqpnzp4.js:21510-21615 sole-consumer
/**
 * 列表项或分组标题。
 */
function renderListEntry(gn) {
  return "item" in gn
    ? jsxProd_default(
        OrderedListWithItem.Item,
        {
          ...gn.item,
        },
        gn.key,
      )
    : jsxProd_default(
        merged.Heading,
        {
          children: gn.node,
        },
        gn.key,
      );
}
//@ chunk-cpqpnzp4.js:21615-21681 sole-consumer
function renderNodeEntry(Rt) {
  return (
    "node" in Rt &&
    jsxProd_default(
      Box,
      {
        children: Rt.node,
      },
      Rt.key,
    )
  );
}
//@ chunk-cpqpnzp4.js:21681-21762 affinity
var MCP_LIST_ROW_HEIGHT = 12;
var MCP_LIST_VISIBLE_ROWS = 5;
var MCP_LIST_INDENT = 3;
var MCP_SCOPE_ORDER = ["project", "local", "user", "enterprise", "managed", "agent"];
//@ chunk-cpqpnzp4.js:21762-22266 fingerprint = getScopeHeading (0.736)
function getScopeHeading(scope) {
  switch (scope) {
    case "project":
      return {
        label: "Project MCPs",
        path: describeMcpConfigFilePath(scope),
      };
    case "user":
      return {
        label: "User MCPs",
        path: describeMcpConfigFilePath(scope),
      };
    case "local":
      return {
        label: "Local MCPs",
        path: describeMcpConfigFilePath(scope),
      };
    case "enterprise":
      return {
        label: "Enterprise MCPs",
      };
    case "managed":
      return {
        label: "Managed MCPs",
        path: "provided by your organization",
      };
    case "agent": {
      let mainThreadAgentType = getMainThreadAgentType();
      return {
        label: "Active agent MCPs",
        path: mainThreadAgentType ? `@${mainThreadAgentType} frontmatter` : "agent frontmatter",
      };
    }
    case "dynamic":
      return {
        label: "Built-in MCPs",
        path: "always available",
      };
    default:
      return {
        label: scope,
      };
  }
}
//@ chunk-cpqpnzp4.js:22266-23546 layout
/**
 * 连接器与已有服务器重复时，按重复来源（插件/本地/动态/托管）说明如何改用连接器。
 */
function DuplicateServerHint(props) {
  let $ = w(12);
  let { s: i } = props;
  if (i.duplicateOf.startsWith("plugin:")) {
    let c;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      c = jsxProd_default(Text, {
        dimColor: true,
        children: "To use this connector instead, disable the plugin server in /plugins",
      });
      $[0] = c;
    } else c = $[0];
    return c;
  }
  switch (i.duplicateOfScope) {
    case "local":
    case "user":
    case "project": {
      let c;
      if ($[1] !== i.duplicateOf) {
        c = claudeCommand("mcp remove", i.duplicateOf);
        $[1] = i.duplicateOf;
        $[2] = c;
      } else c = $[2];
      let v = c;
      let m;
      if ($[3] !== v || $[4] !== i.duplicateOf || $[5] !== i.duplicateOfScope) {
        m = v
          ? jsxProd_default_2(Fragment, {
              children: [
                "run ",
                jsxProd_default(Text, {
                  bold: true,
                  children: v,
                }),
              ],
            })
          : `remove the ${i.duplicateOfScope}-scope server "${cleanTaskDescription(i.duplicateOf) ?? ""}"`;
        $[3] = v;
        $[4] = i.duplicateOf;
        $[5] = i.duplicateOfScope;
        $[6] = m;
      } else m = $[6];
      let k;
      if ($[7] !== m) {
        k = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["To use this connector instead,", " ", m],
        });
        $[7] = m;
        $[8] = k;
      } else k = $[8];
      return k;
    }
    case "dynamic": {
      let c;
      if ($[9] === MEMO_CACHE_SENTINEL) {
        c = jsxProd_default(Text, {
          dimColor: true,
          children: "To use this connector instead, drop it from your --mcp-config flag",
        });
        $[9] = c;
      } else c = $[9];
      return c;
    }
    case "enterprise":
    case "managed": {
      let c;
      if ($[10] === MEMO_CACHE_SENTINEL) {
        c = jsxProd_default(Text, {
          dimColor: true,
          children: "An admin-managed server takes precedence here",
        });
        $[10] = c;
      } else c = $[10];
      return c;
    }
    default: {
      let c;
      if ($[11] === MEMO_CACHE_SENTINEL) {
        c = jsxProd_default(Text, {
          dimColor: true,
          children: "To use this connector instead, remove the duplicate server from your configuration",
        });
        $[11] = c;
      } else c = $[11];
      return c;
    }
  }
}
//@ chunk-cpqpnzp4.js:23546-23716 callgraph-fingerprint = groupServersByScope (1)
function groupServersByScope(serverList) {
  let groups = new Map();
  for (let server of serverList) {
    let scope = server.scope;
    if (!groups.has(scope)) groups.set(scope, []);
    groups.get(scope).push(server);
  }
  for (let [, groupServers] of groups) groupServers.sort((c, v) => c.name.localeCompare(v.name));
  return groups;
}
//@ chunk-cpqpnzp4.js:23716-24103 layout
/**
 * 粗体标签加括号路径。
 */
function ServerPathLabel(props) {
  let $ = w(10);
  let { label, path } = props;
  let v;
  if ($[0] !== path) {
    v = cleanTaskDescription(path);
    $[0] = path;
    $[1] = v;
  } else v = $[1];
  let m = v;
  let k;
  if ($[2] !== label) {
    k = jsxProd_default(Text, {
      bold: true,
      children: label,
    });
    $[2] = label;
    $[3] = k;
  } else k = $[3];
  const when = m ?? false;
  let b;
  if ($[4] !== m || $[5] !== when) {
    b = jsxProd_default(ParenHint, {
      when,
      children: m,
    });
    $[4] = m;
    $[5] = when;
    $[6] = b;
  } else b = $[6];
  let N;
  if ($[7] !== k || $[8] !== b) {
    N = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [k, b],
    });
    $[7] = k;
    $[8] = b;
    $[9] = N;
  } else N = $[9];
  return N;
}
//@ chunk-cpqpnzp4.js:24103-24834 layout
/**
 * 服务器名（按宽度截断）与右侧内容的一行。
 */
function ServerNameRow(props) {
  let $ = w(23);
  let { name: i, children } = props;
  let v;
  let m;
  let k;
  let flexBasis;
  let flexGrow;
  let maxWidth;
  let flexGrow_2;
  if ($[0] !== i) {
    k = cleanTaskDescription(i) ?? "";
    m = Box;
    flexGrow_2 = 1;
    v = Box;
    flexBasis = 0;
    flexGrow = 1;
    maxWidth = bunStringWidth(k);
    $[0] = i;
    $[1] = v;
    $[2] = m;
    $[3] = k;
    $[4] = flexBasis;
    $[5] = flexGrow;
    $[6] = maxWidth;
    $[7] = flexGrow_2;
  } else {
    v = $[1];
    m = $[2];
    k = $[3];
    flexBasis = $[4];
    flexGrow = $[5];
    maxWidth = $[6];
    flexGrow_2 = $[7];
  }
  let children_2;
  if ($[8] !== k) {
    children_2 = jsxProd_default(Text, {
      wrap: "truncate-end",
      children: k,
    });
    $[8] = k;
    $[9] = children_2;
  } else children_2 = $[9];
  let U;
  if (
    $[10] !== v ||
    $[11] !== flexBasis ||
    $[12] !== flexGrow ||
    $[13] !== maxWidth ||
    $[14] !== children_2
  ) {
    U = jsxProd_default(v, {
      flexBasis,
      flexGrow,
      maxWidth,
      children: children_2,
    });
    $[10] = v;
    $[11] = flexBasis;
    $[12] = flexGrow;
    $[13] = maxWidth;
    $[14] = children_2;
    $[15] = U;
  } else U = $[15];
  let ne;
  if ($[16] !== children) {
    ne = jsxProd_default(Text, {
      wrap: "truncate-end",
      children,
    });
    $[16] = children;
    $[17] = ne;
  } else ne = $[17];
  let Y;
  if ($[18] !== m || $[19] !== flexGrow_2 || $[20] !== U || $[21] !== ne) {
    Y = jsxProd_default_2(m, {
      flexGrow: flexGrow_2,
      children: [U, ne],
    });
    $[18] = m;
    $[19] = flexGrow_2;
    $[20] = U;
    $[21] = ne;
    $[22] = Y;
  } else Y = $[22];
  return Y;
}
//@ chunk-cpqpnzp4.js:24834-31433 fingerprint = MCPListPanel (0.47)
/**
 * MCP 列表面板：按作用域（项目/本地/用户/企业/claude.ai/动态）分组列出服务器及状态图标。
 */
function MCPListPanel(props) {
  let $ = w(78);
  let {
    servers,
    suppressedClaudeAiConnectors,
    reservedNameRefusals,
    toolCountsByServer,
    agentServers,
    onSelectServer,
    onSelectAgentServer,
    onComplete,
    showUnusedConnectors,
    onToggleUnusedConnectors,
  } = props;
  let U;
  if ($[0] !== suppressedClaudeAiConnectors) {
    U = suppressedClaudeAiConnectors === undefined ? [] : suppressedClaudeAiConnectors;
    $[0] = suppressedClaudeAiConnectors;
    $[1] = U;
  } else U = $[1];
  let ne = U;
  let Y = reservedNameRefusals === undefined ? [] : reservedNameRefusals;
  let K;
  if ($[2] !== toolCountsByServer) {
    K = toolCountsByServer === undefined ? {} : toolCountsByServer;
    $[2] = toolCountsByServer;
    $[3] = K;
  } else K = $[3];
  let L = K;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let hasScrollViewport = useHasScrollViewport();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let J;
  ke: {
    let me;
    if ($[4] !== servers) {
      me = new Set(servers.filter(isAgentScopeServer).map(serverName));
      $[4] = servers;
      $[5] = me;
    } else me = $[5];
    let le = me;
    if (le.size === 0) {
      J = agentServers;
      break ke;
    }
    let pe;
    if ($[6] !== agentServers || $[7] !== le) {
      let Pe;
      if ($[9] !== le) {
        Pe = (xe) => !le.has(xe.name);
        $[9] = le;
        $[10] = Pe;
      } else Pe = $[10];
      pe = agentServers.filter(Pe);
      $[6] = agentServers;
      $[7] = le;
      $[8] = pe;
    } else pe = $[8];
    J = pe;
  }
  let te = J;
  let me;
  if ($[11] !== servers) {
    let serverList = servers.filter(isConfiguredServer);
    me = groupServersByScope(serverList);
    $[11] = servers;
    $[12] = me;
  } else me = $[12];
  let ye = me;
  let pe;
  if ($[13] !== servers) {
    let everConnectedClaudeAiMcpSet = getEverConnectedClaudeAiMcpSet();
    let x = [];
    let Ne = [];
    for (const scope of servers) {
      if (!isClaudeAiProxyServer(scope.client.config)) {
        continue;
      }
      if (
        (scope.client.type === "needs-auth" || scope.client.type === "failed") &&
        !everConnectedClaudeAiMcpSet.has(scope.name)
      )
        Ne.push(scope);
      else x.push(scope);
    }
    pe =
      (x.sort(compareByName),
      Ne.sort(compareByName_2),
      {
        claudeAiServers: x,
        unusedClaudeAiServers: Ne,
      });
    $[13] = servers;
    $[14] = pe;
  } else pe = $[14];
  let { claudeAiServers, unusedClaudeAiServers } = pe;
  let Pe;
  if ($[15] !== ye) {
    Pe = (ye.get("dynamic") ?? []).sort(compareByName_3);
    $[15] = ye;
    $[16] = Pe;
  } else Pe = $[16];
  let ue = Pe;
  let be;
  if ($[17] !== onComplete) {
    be = () => {
      onComplete("MCP dialog dismissed", {
        display: "system",
      });
    };
    $[17] = onComplete;
    $[18] = be;
  } else be = $[18];
  let onCancel = be;
  let vt;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    vt = isDebugMode();
    $[19] = vt;
  } else vt = $[19];
  let Bo = vt;
  let Ct;
  if ($[20] !== servers || $[21] !== showUnusedConnectors || $[22] !== unusedClaudeAiServers) {
    let Lo = showUnusedConnectors ? undefined : new Set(unusedClaudeAiServers.map(entryServerName));
    Ct = servers.some(
      (prev) => prev.client.type === "failed" && !isUnconfiguredFailure(prev.client) && !Lo?.has(prev.name),
    );
    $[20] = servers;
    $[21] = showUnusedConnectors;
    $[22] = unusedClaudeAiServers;
    $[23] = Ct;
  } else Ct = $[23];
  let an = Ct;
  let I;
  if (
    $[24] !== te ||
    $[25] !== claudeAiServers ||
    $[26] !== ue ||
    $[27] !== isScreenReaderEnabled ||
    $[28] !== ye ||
    $[29] !== showUnusedConnectors ||
    $[30] !== ne ||
    $[31] !== L ||
    $[32] !== unusedClaudeAiServers
  ) {
    I = [];
    let cn = function cn(Oe, key) {
      I.push({
        key,
        target: {
          type: "server",
          server: Oe,
        },
        item: describeServerStatus(Oe, L[Oe.name], isScreenReaderEnabled),
      });
    };
    for (const ln of MCP_SCOPE_ORDER) {
      let wt = ye.get(ln);
      if (!wt || wt.length === 0) {
        continue;
      }
      let scopeHeading = getScopeHeading(ln);
      I.push({
        key: `heading-${ln}`,
        node: jsxProd_default(ServerPathLabel, {
          label: scopeHeading.label,
          path: scopeHeading.path,
        }),
      });
      for (const Vo of wt) cn(Vo, `${ln}-${Vo.name}`);
      I.push({
        key: `spacer-${ln}`,
        node: jsxProd_default(Text, {
          children: " ",
        }),
      });
    }
    if (claudeAiServers.length > 0 || unusedClaudeAiServers.length > 0 || ne.length > 0) {
      let node;
      if ($[34] === MEMO_CACHE_SENTINEL) {
        node = jsxProd_default(ServerPathLabel, {
          label: "claude.ai",
        });
        $[34] = node;
      } else node = $[34];
      I.push({
        key: "heading-claudeai",
        node,
      });
      for (const claudeAiServer of claudeAiServers) cn(claudeAiServer, `claudeai-${claudeAiServer.name}`);
      if (unusedClaudeAiServers.length > 0) {
        I.push({
          key: "claudeai-unused-fold",
          target: {
            type: "unused-connectors-fold",
          },
          item: {
            label: "Show unused connectors",
            icon: jsxProd_default(Text, {
              children: showUnusedConnectors ? figures_default.arrowDown : figures_default.arrowRight,
            }),
            meta: [`${unusedClaudeAiServers.length} ${showUnusedConnectors ? "shown" : "hidden"}`],
          },
        });
        if (showUnusedConnectors) {
          for (const unusedClaudeAiServer of unusedClaudeAiServers)
            cn(unusedClaudeAiServer, `claudeai-${unusedClaudeAiServer.name}`);
        }
      }
      for (const dn of ne) {
        I.push({
          key: `suppressed-${dn.name}`,
          node: jsxProd_default(ServerNameRow, {
            name: dn.name,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                " ",
                "\xB7 ",
                figures_default.radioOff,
                " hidden \u2014 same URL as your server '",
                cleanTaskDescription(dn.duplicateOf),
                "'",
              ],
            }),
          }),
        });
        I.push({
          key: `suppressed-hint-${dn.name}`,
          node: jsxProd_default(Box, {
            paddingLeft: 2,
            children: jsxProd_default(Text, {
              wrap: "truncate-end",
              children: jsxProd_default(DuplicateServerHint, {
                s: dn,
              }),
            }),
          }),
        });
      }
      let node_2;
      if ($[35] === MEMO_CACHE_SENTINEL) {
        node_2 = jsxProd_default(Text, {
          children: " ",
        });
        $[35] = node_2;
      } else node_2 = $[35];
      I.push({
        key: "spacer-claudeai",
        node: node_2,
      });
    }
    if (te.length > 0) {
      let node;
      if ($[36] === MEMO_CACHE_SENTINEL) {
        node = jsxProd_default(ServerPathLabel, {
          label: "Agent MCPs",
        });
        $[36] = node;
      } else node = $[36];
      I.push({
        key: "heading-agent-mcps",
        node,
      });
      for (const un of uniq(te.flatMap(sourceAgentsOf))) {
        I.push({
          key: `spacer-agent-${un}`,
          node: jsxProd_default(Text, {
            children: " ",
          }),
        });
        I.push({
          key: `subheading-agent-${un}`,
          node: jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "truncate-end",
            children: ["@", cleanTaskDescription(un)],
          }),
        });
        for (const mn of te.filter((agentServer_0) => agentServer_0.sourceAgents.includes(un)))
          I.push({
            key: `agent-${un}-${mn.name}`,
            target: {
              type: "agent-server",
              agentServer: mn,
            },
            item: {
              label: cleanTaskDescription(mn.name) ?? "",
              icon: jsxProd_default(StatusIcon, {
                status: mn.needsAuth ? "warning" : "off",
              }),
              meta: [mn.needsAuth ? "may need auth" : "agent-only"],
            },
          });
      }
      let node_2;
      if ($[37] === MEMO_CACHE_SENTINEL) {
        node_2 = jsxProd_default(Text, {
          children: " ",
        });
        $[37] = node_2;
      } else node_2 = $[37];
      I.push({
        key: "spacer-agent-mcps",
        node: node_2,
      });
    }
    if (ue.length > 0) {
      let fe;
      if ($[38] === MEMO_CACHE_SENTINEL) {
        fe = getScopeHeading("dynamic");
        $[38] = fe;
      } else fe = $[38];
      let qo = fe;
      let node;
      if ($[39] === MEMO_CACHE_SENTINEL) {
        node = jsxProd_default(ServerPathLabel, {
          label: qo.label,
          path: qo.path,
        });
        $[39] = node;
      } else node = $[39];
      I.push({
        key: "heading-dynamic",
        node,
      });
      for (const Go of ue) cn(Go, `dynamic-${Go.name}`);
      let node_2;
      if ($[40] === MEMO_CACHE_SENTINEL) {
        node_2 = jsxProd_default(Text, {
          children: " ",
        });
        $[40] = node_2;
      } else node_2 = $[40];
      I.push({
        key: "spacer-dynamic",
        node: node_2,
      });
    }
    if (I.at(-1)?.key.startsWith("spacer-")) I.pop();
    $[24] = te;
    $[25] = claudeAiServers;
    $[26] = ue;
    $[27] = isScreenReaderEnabled;
    $[28] = ye;
    $[29] = showUnusedConnectors;
    $[30] = ne;
    $[31] = L;
    $[32] = unusedClaudeAiServers;
    $[33] = I;
  } else I = $[33];
  let Te = I;
  let fe;
  if (
    $[41] !== Te ||
    $[42] !== onSelectAgentServer ||
    $[43] !== onSelectServer ||
    $[44] !== onToggleUnusedConnectors
  ) {
    fe = (agentServer_1) => {
      let item = Te.flatMap(targetList)[agentServer_1];
      if (!item) {
        return;
      }
      if (item.type === "server") onSelectServer(item.server);
      else if (item.type === "agent-server") onSelectAgentServer(item.agentServer);
      else if (item.type === "unused-connectors-fold") onToggleUnusedConnectors();
    };
    $[41] = Te;
    $[42] = onSelectAgentServer;
    $[43] = onSelectServer;
    $[44] = onToggleUnusedConnectors;
    $[45] = fe;
  } else fe = $[45];
  let onSelect = fe;
  if (servers.length === 0 && te.length === 0 && ne.length === 0 && Y.length === 0) {
    return null;
  }
  let $n = servers.length + te.length;
  let Zs = hasScrollViewport ? MCP_LIST_VISIBLE_ROWS : MCP_LIST_ROW_HEIGHT;
  let max = Math.max(MCP_LIST_INDENT, rows - Zs - (an ? 1 : 0));
  let any = Te.some(renderToolResultMessage);
  let Qs = any && Te.length > max;
  let ge;
  if ($[46] === MEMO_CACHE_SENTINEL) {
    ge = jsxProd_default(McpParsingWarnings, {});
    $[46] = ge;
  } else ge = $[46];
  let fn;
  if ($[47] !== $n) {
    fn = plural($n, "server");
    $[47] = $n;
    $[48] = fn;
  } else fn = $[48];
  const subtitle = `${$n} ${fn}`;
  let Nn;
  if ($[49] !== Te || $[50] !== onSelect || $[51] !== any || $[52] !== max) {
    Nn = any
      ? jsxProd_default(OrderedListWithItem, {
          visibleCount: max,
          wrap: true,
          onSelect,
          children: Te.map(renderListEntry),
        })
      : jsxProd_default(Box, {
          flexDirection: "column",
          paddingLeft: 2,
          children: Te.map(renderNodeEntry),
        });
    $[49] = Te;
    $[50] = onSelect;
    $[51] = any;
    $[52] = max;
    $[53] = Nn;
  } else Nn = $[53];
  const marginTop = Qs ? 0 : 1;
  let On;
  if ($[54] !== an) {
    On =
      an &&
      jsxProd_default(Text, {
        dimColor: true,
        children: Bo
          ? "\u203B Error logs shown inline with --debug"
          : "\u203B Run claude --debug to see error logs",
      });
    $[54] = an;
    $[55] = On;
  } else On = $[55];
  let Wo;
  if ($[56] === MEMO_CACHE_SENTINEL) {
    Wo = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        jsxProd_default(Link, {
          url: "https://code.claude.com/docs/en/mcp",
          children: "https://code.claude.com/docs/en/mcp",
        }),
        " ",
        "for help",
      ],
    });
    $[56] = Wo;
  } else Wo = $[56];
  let Dn;
  if ($[57] !== marginTop || $[58] !== On) {
    Dn = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [On, Wo],
    });
    $[57] = marginTop;
    $[58] = On;
    $[59] = Dn;
  } else Dn = $[59];
  let children;
  if ($[60] !== Nn || $[61] !== Dn) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Nn, Dn],
    });
    $[60] = Nn;
    $[61] = Dn;
    $[62] = children;
  } else children = $[62];
  let Bn;
  if ($[63] !== onCancel || $[64] !== subtitle || $[65] !== children) {
    Bn = jsxProd_default(Dialog, {
      title: "Manage MCP servers",
      subtitle,
      onCancel,
      hideInputGuide: true,
      children,
    });
    $[63] = onCancel;
    $[64] = subtitle;
    $[65] = children;
    $[66] = Bn;
  } else Bn = $[66];
  let Ln;
  if ($[67] !== isScreenReaderEnabled) {
    Ln =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "navigate",
      });
    $[67] = isScreenReaderEnabled;
    $[68] = Ln;
  } else Ln = $[68];
  let zn;
  if ($[69] !== isScreenReaderEnabled) {
    zn =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "confirm",
      });
    $[69] = isScreenReaderEnabled;
    $[70] = zn;
  } else zn = $[70];
  let Yo;
  if ($[71] === MEMO_CACHE_SENTINEL) {
    Yo = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    });
    $[71] = Yo;
  } else Yo = $[71];
  let Hn;
  if ($[72] !== Ln || $[73] !== zn) {
    Hn = jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [Ln, zn, Yo],
        }),
      }),
    });
    $[72] = Ln;
    $[73] = zn;
    $[74] = Hn;
  } else Hn = $[74];
  let Ko;
  if ($[75] !== Bn || $[76] !== Hn) {
    Ko = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [ge, Bn, Hn],
    });
    $[75] = Bn;
    $[76] = Hn;
    $[77] = Ko;
  } else Ko = $[77];
  return Ko;
}
//@ chunk-cpqpnzp4.js:31433-32585 sole-consumer
/**
 * 服务器列表项：状态图标与说明（禁用、已连接/无工具、缓存、连接中、需认证、未配置、失败），托管时加 managed。
 */
function describeServerStatus(g, i, isScreenReaderEnabled) {
  let { client } = g;
  let v;
  let m = [];
  if (client.type === "disabled")
    v = jsxProd_default(StatusIcon, {
      status: "off",
    });
  else if (client.type === "connected") {
    let f = !!client.capabilities?.tools;
    let b;
    if (client.discoveryBearerRejected) b = "session token rejected";
    else if (client.toolsListError) b = "tools fetch failed";
    else if (f && i === 0) b = "no tools";
    if (b) {
      v = jsxProd_default(StatusIcon, {
        status: "warning",
      });
      m = [b, "connected"];
    } else {
      v = jsxProd_default(StatusIcon, {
        status: "success",
        "aria-label": "connected:",
      });
      if (f && i !== undefined) m = [`${i} ${plural(i, "tool")}`];
    }
  } else if (client.type === "cached") {
    let f = formatToolConnectionState(client.cacheSavedAt, i);
    v = jsxProd_default(Text, {
      color: f.tone,
      children: f.glyph,
    });
    m = f.facts;
  } else if (client.type === "pending") {
    v = jsxProd_default(StatusIcon, {
      status: "loading",
      "aria-label": "connecting:",
    });
    let { reconnectAttempt, maxReconnectAttempts } = client;
    if (reconnectAttempt && maxReconnectAttempts)
      m = [`reconnecting (${reconnectAttempt}/${maxReconnectAttempts})\u2026`];
  } else if (client.type === "needs-auth") {
    v = jsxProd_default(StatusIcon, {
      status: "warning",
    });
    m = ["needs authentication"];
  } else if (client.errorCode === "UNCONFIGURED") {
    v = jsxProd_default(StatusIcon, {
      status: "pending",
      "aria-label": "not configured:",
    });
    m = [isScreenReaderEnabled ? "" : "not configured"];
  } else {
    v = jsxProd_default(StatusIcon, {
      status: "error",
    });
    if (client.errorCode === "INVALID_CONFIG") m = ["config issue"];
  }
  let enterpriseManaged =
    g.transport === "claudeai-proxy" && g.scope === "claudeai" && g.config.enterpriseManaged;
  return {
    label: cleanTaskDescription(g.name) ?? "",
    icon: v,
    meta: enterpriseManaged ? [...m, "managed"] : m,
  };
}
//@ chunk-9qfjhaj4.js:235-420 fingerprint = _temp5 (0.677)
function applyMcpServerConfig(config, e) {
  let n = {
    name: e.client.name,
    config,
  };
  return {
    ...e,
    client: withConfigScope(e.client, config),
    ...(e.tools !== undefined && {
      tools: decorateMcpTools(n, e.tools),
    }),
    ...(e.commands !== undefined && {
      commands: stampToolScope(n, e.commands),
    }),
  };
}
//@ chunk-dcmhvw5a.js:71740-71850 callgraph-fingerprint = _temp2 (0.448)
/**
 * isClaudeAiConnectorConfig：claudeai 作用域的 claudeai-proxy，或非插件 dynamic 作用域的 claudeai-proxy。
 */
function isClaudeAiProxyServer(s_0) {
  if (s_0.type !== "claudeai-proxy") return false;
  return s_0.scope === "claudeai" || (s_0.scope === "dynamic" && !isPluginServerConfig(s_0));
}
export { applyMcpServerConfig, MCPListPanel, isClaudeAiProxyServer };
