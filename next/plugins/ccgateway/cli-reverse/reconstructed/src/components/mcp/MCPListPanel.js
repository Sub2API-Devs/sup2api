/**
 * components/mcp/MCPListPanel.tsx
 *
 * /mcp 列表面板：按作用域列出服务器及状态（connected/needs-auth/failed/disabled）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPListPanel.tsx
 * pieces: chunk-5fazksz3.js (1), chunk-h6004nzv.js (21), chunk-xqynshdn.js (1), chunk-z20c443b.js (1)
 * attribution: fingerprint 4, sole-consumer 3, affinity 1, callgraph-fingerprint 5, layout 10, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPluginServerConfig } from "../../services/mcp/types.js";
import { withConfigScope, decorateMcpTools, stampToolScope } from "../../services/mcp/mcpToolDecoration.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { McpParsingWarnings } from "./McpParsingWarnings.js";
import { plural } from "../../utils/stringUtils.js";
import { Dialog } from "../design-system/Dialog.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { formatToolConnectionState } from "./CapabilitiesSection.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:71847-71958 callgraph-fingerprint (2.1.88 match: _temp2, 0.449)
/**
 * isClaudeAiConnectorConfig：claudeai 作用域的 claudeai-proxy，或非插件 dynamic 作用域的 claudeai-proxy。
 */
function isClaudeAiProxyServer(s_0) {
  if (s_0.type !== "claudeai-proxy") return false;
  return s_0.scope === "claudeai" || (s_0.scope === "dynamic" && !isPluginServerConfig(s_0));
}
//@ chunk-xqynshdn.js:236-422 placement
function applyMcpServerConfig(config, server) {
  let toolServer = {
    name: server.client.name,
    config,
  };
  return {
    ...server,
    client: withConfigScope(server.client, config),
    ...(server.tools !== undefined && {
      tools: decorateMcpTools(toolServer, server.tools),
    }),
    ...(server.commands !== undefined && {
      commands: stampToolScope(toolServer, server.commands),
    }),
  };
}
//@ chunk-5fazksz3.js:13990-14055 fingerprint (2.1.88 match: SCOPE_ORDER, 0.845)
var SCOPE_ORDER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5fazksz3.js:13990", () => {
  SCOPE_ORDER = new Set(["local", "user", "project", "enterprise", "managed"]);
});
//@ chunk-h6004nzv.js:22250-22254 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h6004nzv.js:22250", () => {
  init_react_production();
});
//@ chunk-h6004nzv.js:22254-22296 sole-consumer
function isAgentScopeServer(server) {
  return server.scope === "agent";
}
//@ chunk-h6004nzv.js:22296-22327 affinity
function serverName(server) {
  return server.name;
}
//@ chunk-h6004nzv.js:22327-22372 callgraph-fingerprint (2.1.88 match: _temp, 0.493)
function isConfiguredServer(s) {
  return !isClaudeAiProxyServer(s.client.config);
}
//@ chunk-h6004nzv.js:22372-22429 callgraph-fingerprint (2.1.88 match: _temp3, 1)
function compareByName(a, b) {
  return a.name.localeCompare(b.name);
}
//@ chunk-h6004nzv.js:22429-22486 callgraph-fingerprint (2.1.88 match: _temp4, 1)
function compareByName_2(a_0, b_0) {
  return a_0.name.localeCompare(b_0.name);
}
//@ chunk-h6004nzv.js:22486-22543 layout
function compareByName_3(serverA, serverB) {
  return serverA.name.localeCompare(serverB.name);
}
//@ chunk-h6004nzv.js:22543-22574 layout
function entryServerName(server) {
  return server.name;
}
//@ chunk-h6004nzv.js:22574-22613 fingerprint (2.1.88 match: _temp6, 1)
function sourceAgentsOf(s_2) {
  return s_2.sourceAgents;
}
//@ chunk-h6004nzv.js:22613-22664 layout
function targetList(entry) {
  return "target" in entry ? [entry.target] : [];
}
//@ chunk-h6004nzv.js:22664-22700 layout
/**
 * 结果对象是否带 target 字段（MCP 面板用，切分误归 SendMessage UI）。
 */
function isTargetedResult(result) {
  return "target" in result;
}
//@ chunk-h6004nzv.js:22700-22805 layout
/**
 * 列表项或分组标题。
 */
function renderListEntry(entry) {
  return "item" in entry
    ? jsxProd_default(
        OrderedListWithItem.Item,
        {
          ...entry.item,
        },
        entry.key,
      )
    : jsxProd_default(
        merged.Heading,
        {
          children: entry.node,
        },
        entry.key,
      );
}
//@ chunk-h6004nzv.js:22805-22871 layout
function renderNodeEntry(entry) {
  return (
    "node" in entry &&
    jsxProd_default(
      Box,
      {
        children: entry.node,
      },
      entry.key,
    )
  );
}
//@ chunk-h6004nzv.js:22871-22952 layout
var MCP_LIST_ROW_HEIGHT = 12;
var MCP_LIST_VISIBLE_ROWS = 5;
var MCP_LIST_INDENT = 3;
var MCP_SCOPE_ORDER = ["project", "local", "user", "enterprise", "managed", "agent"];
//@ chunk-h6004nzv.js:22952-23456 fingerprint (2.1.88 match: getScopeHeading, 0.736)
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
//@ chunk-h6004nzv.js:23456-24737 layout
/**
 * 连接器与已有服务器重复时，按重复来源（插件/本地/动态/托管）说明如何改用连接器。
 */
function DuplicateServerHint(props) {
  let $ = useMemoCache(12);
  let { s: server } = props;
  if (server.duplicateOf.startsWith("plugin:")) {
    let pluginHint;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      pluginHint = jsxProd_default(Text, {
        dimColor: true,
        children: "To use this connector instead, disable the plugin server in /plugins",
      });
      $[0] = pluginHint;
    } else pluginHint = $[0];
    return pluginHint;
  }
  switch (server.duplicateOfScope) {
    case "local":
    case "user":
    case "project": {
      let removeCommand;
      if ($[1] !== server.duplicateOf) {
        removeCommand = claudeCommand("mcp remove", server.duplicateOf);
        $[1] = server.duplicateOf;
        $[2] = removeCommand;
      } else removeCommand = $[2];
      let removeCommand_2 = removeCommand;
      let howTo;
      if ($[3] !== removeCommand_2 || $[4] !== server.duplicateOf || $[5] !== server.duplicateOfScope) {
        howTo = removeCommand_2
          ? jsxProd_default_2(Fragment, {
              children: [
                "run ",
                jsxProd_default(Text, {
                  bold: true,
                  children: removeCommand_2,
                }),
              ],
            })
          : `remove the ${server.duplicateOfScope}-scope server "${cleanTaskDescription(server.duplicateOf) ?? ""}"`;
        $[3] = removeCommand_2;
        $[4] = server.duplicateOf;
        $[5] = server.duplicateOfScope;
        $[6] = howTo;
      } else howTo = $[6];
      let hintText;
      if ($[7] !== howTo) {
        hintText = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["To use this connector instead,", " ", howTo],
        });
        $[7] = howTo;
        $[8] = hintText;
      } else hintText = $[8];
      return hintText;
    }
    case "dynamic": {
      let dynamicHint;
      if ($[9] === MEMO_CACHE_SENTINEL) {
        dynamicHint = jsxProd_default(Text, {
          dimColor: true,
          children: "To use this connector instead, drop it from your --mcp-config flag",
        });
        $[9] = dynamicHint;
      } else dynamicHint = $[9];
      return dynamicHint;
    }
    case "enterprise":
    case "managed": {
      let managedHint;
      if ($[10] === MEMO_CACHE_SENTINEL) {
        managedHint = jsxProd_default(Text, {
          dimColor: true,
          children: "An admin-managed server takes precedence here",
        });
        $[10] = managedHint;
      } else managedHint = $[10];
      return managedHint;
    }
    default: {
      let defaultHint;
      if ($[11] === MEMO_CACHE_SENTINEL) {
        defaultHint = jsxProd_default(Text, {
          dimColor: true,
          children: "To use this connector instead, remove the duplicate server from your configuration",
        });
        $[11] = defaultHint;
      } else defaultHint = $[11];
      return defaultHint;
    }
  }
}
//@ chunk-h6004nzv.js:24737-24907 callgraph-fingerprint (2.1.88 match: groupServersByScope, 1)
function groupServersByScope(serverList) {
  let groups = new Map();
  for (let server of serverList) {
    let scope = server.scope;
    if (!groups.has(scope)) groups.set(scope, []);
    groups.get(scope).push(server);
  }
  for (let [, groupServers] of groups)
    groupServers.sort((serverA, serverB) => serverA.name.localeCompare(serverB.name));
  return groups;
}
//@ chunk-h6004nzv.js:24907-25294 layout
/**
 * 粗体标签加括号路径。
 */
function ServerPathLabel(props) {
  let $ = useMemoCache(10);
  let { label, path } = props;
  let pathValue;
  if ($[0] !== path) {
    pathValue = cleanTaskDescription(path);
    $[0] = path;
    $[1] = pathValue;
  } else pathValue = $[1];
  let cleanPath = pathValue;
  let labelText;
  if ($[2] !== label) {
    labelText = jsxProd_default(Text, {
      bold: true,
      children: label,
    });
    $[2] = label;
    $[3] = labelText;
  } else labelText = $[3];
  const when = cleanPath ?? false;
  let pathHint;
  if ($[4] !== cleanPath || $[5] !== when) {
    pathHint = jsxProd_default(ParenHint, {
      when,
      children: cleanPath,
    });
    $[4] = cleanPath;
    $[5] = when;
    $[6] = pathHint;
  } else pathHint = $[6];
  let row;
  if ($[7] !== labelText || $[8] !== pathHint) {
    row = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [labelText, pathHint],
    });
    $[7] = labelText;
    $[8] = pathHint;
    $[9] = row;
  } else row = $[9];
  return row;
}
//@ chunk-h6004nzv.js:25294-26025 layout
/**
 * 服务器名（按宽度截断）与右侧内容的一行。
 */
function ServerNameRow(props) {
  let $ = useMemoCache(23);
  let { name, children } = props;
  let nameBox;
  let rowBox;
  let cleanName;
  let flexBasis;
  let flexGrow;
  let maxWidth;
  let flexGrow_2;
  if ($[0] !== name) {
    cleanName = cleanTaskDescription(name) ?? "";
    rowBox = Box;
    flexGrow_2 = 1;
    nameBox = Box;
    flexBasis = 0;
    flexGrow = 1;
    maxWidth = bunStringWidth(cleanName);
    $[0] = name;
    $[1] = nameBox;
    $[2] = rowBox;
    $[3] = cleanName;
    $[4] = flexBasis;
    $[5] = flexGrow;
    $[6] = maxWidth;
    $[7] = flexGrow_2;
  } else {
    nameBox = $[1];
    rowBox = $[2];
    cleanName = $[3];
    flexBasis = $[4];
    flexGrow = $[5];
    maxWidth = $[6];
    flexGrow_2 = $[7];
  }
  let children_2;
  if ($[8] !== cleanName) {
    children_2 = jsxProd_default(Text, {
      wrap: "truncate-end",
      children: cleanName,
    });
    $[8] = cleanName;
    $[9] = children_2;
  } else children_2 = $[9];
  let nameCell;
  if (
    $[10] !== nameBox ||
    $[11] !== flexBasis ||
    $[12] !== flexGrow ||
    $[13] !== maxWidth ||
    $[14] !== children_2
  ) {
    nameCell = jsxProd_default(nameBox, {
      flexBasis,
      flexGrow,
      maxWidth,
      children: children_2,
    });
    $[10] = nameBox;
    $[11] = flexBasis;
    $[12] = flexGrow;
    $[13] = maxWidth;
    $[14] = children_2;
    $[15] = nameCell;
  } else nameCell = $[15];
  let detailText;
  if ($[16] !== children) {
    detailText = jsxProd_default(Text, {
      wrap: "truncate-end",
      children,
    });
    $[16] = children;
    $[17] = detailText;
  } else detailText = $[17];
  let row;
  if ($[18] !== rowBox || $[19] !== flexGrow_2 || $[20] !== nameCell || $[21] !== detailText) {
    row = jsxProd_default_2(rowBox, {
      flexGrow: flexGrow_2,
      children: [nameCell, detailText],
    });
    $[18] = rowBox;
    $[19] = flexGrow_2;
    $[20] = nameCell;
    $[21] = detailText;
    $[22] = row;
  } else row = $[22];
  return row;
}
//@ chunk-h6004nzv.js:26025-32625 fingerprint (2.1.88 match: MCPListPanel, 0.47)
/**
 * MCP 列表面板：按作用域（项目/本地/用户/企业/claude.ai/动态）分组列出服务器及状态图标。
 */
function MCPListPanel(props) {
  let $ = useMemoCache(78);
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
  let suppressedServers;
  if ($[0] !== suppressedClaudeAiConnectors) {
    suppressedServers = suppressedClaudeAiConnectors === undefined ? [] : suppressedClaudeAiConnectors;
    $[0] = suppressedClaudeAiConnectors;
    $[1] = suppressedServers;
  } else suppressedServers = $[1];
  let suppressed = suppressedServers;
  let nameRefusals = reservedNameRefusals === undefined ? [] : reservedNameRefusals;
  let toolCounts;
  if ($[2] !== toolCountsByServer) {
    toolCounts = toolCountsByServer === undefined ? {} : toolCountsByServer;
    $[2] = toolCountsByServer;
    $[3] = toolCounts;
  } else toolCounts = $[3];
  let toolCounts_2 = toolCounts;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let hasScrollViewport = useHasScrollViewport();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let visibleAgentServers;
  Me: {
    let agentScopeNames;
    if ($[4] !== servers) {
      agentScopeNames = new Set(servers.filter(isAgentScopeServer).map(serverName));
      $[4] = servers;
      $[5] = agentScopeNames;
    } else agentScopeNames = $[5];
    let agentScopeNames_2 = agentScopeNames;
    if (agentScopeNames_2.size === 0) {
      visibleAgentServers = agentServers;
      break Me;
    }
    let agentServersOnly;
    if ($[6] !== agentServers || $[7] !== agentScopeNames_2) {
      let notInScope;
      if ($[9] !== agentScopeNames_2) {
        notInScope = (server) => !agentScopeNames_2.has(server.name);
        $[9] = agentScopeNames_2;
        $[10] = notInScope;
      } else notInScope = $[10];
      agentServersOnly = agentServers.filter(notInScope);
      $[6] = agentServers;
      $[7] = agentScopeNames_2;
      $[8] = agentServersOnly;
    } else agentServersOnly = $[8];
    visibleAgentServers = agentServersOnly;
  }
  let agentServersToShow = visibleAgentServers;
  let byScope;
  if ($[11] !== servers) {
    let serverList = servers.filter(isConfiguredServer);
    byScope = groupServersByScope(serverList);
    $[11] = servers;
    $[12] = byScope;
  } else byScope = $[12];
  let byScope_2 = byScope;
  let claudeAiSplit;
  if ($[13] !== servers) {
    let everConnectedClaudeAiMcpSet = getEverConnectedClaudeAiMcpSet();
    let activeClaudeAi = [];
    let unusedClaudeAi = [];
    for (const scope of servers) {
      if (!isClaudeAiProxyServer(scope.client.config)) {
        continue;
      }
      if (
        (scope.client.type === "needs-auth" || scope.client.type === "failed") &&
        !everConnectedClaudeAiMcpSet.has(scope.name)
      )
        unusedClaudeAi.push(scope);
      else activeClaudeAi.push(scope);
    }
    claudeAiSplit =
      (activeClaudeAi.sort(compareByName),
      unusedClaudeAi.sort(compareByName_2),
      {
        claudeAiServers: activeClaudeAi,
        unusedClaudeAiServers: unusedClaudeAi,
      });
    $[13] = servers;
    $[14] = claudeAiSplit;
  } else claudeAiSplit = $[14];
  let { claudeAiServers, unusedClaudeAiServers } = claudeAiSplit;
  let dynamicServers;
  if ($[15] !== byScope_2) {
    dynamicServers = (byScope_2.get("dynamic") ?? []).sort(compareByName_3);
    $[15] = byScope_2;
    $[16] = dynamicServers;
  } else dynamicServers = $[16];
  let dynamicServers_2 = dynamicServers;
  let onCancel;
  if ($[17] !== onComplete) {
    onCancel = () => {
      onComplete("MCP dialog dismissed", {
        display: "system",
      });
    };
    $[17] = onComplete;
    $[18] = onCancel;
  } else onCancel = $[18];
  let onCancel_2 = onCancel;
  let isDebug;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    isDebug = isDebugMode();
    $[19] = isDebug;
  } else isDebug = $[19];
  let isDebug_2 = isDebug;
  let hasUnconfiguredFailure;
  if ($[20] !== servers || $[21] !== showUnusedConnectors || $[22] !== unusedClaudeAiServers) {
    let unusedNames = showUnusedConnectors ? undefined : new Set(unusedClaudeAiServers.map(entryServerName));
    hasUnconfiguredFailure = servers.some(
      (prev) =>
        prev.client.type === "failed" && !isUnconfiguredFailure(prev.client) && !unusedNames?.has(prev.name),
    );
    $[20] = servers;
    $[21] = showUnusedConnectors;
    $[22] = unusedClaudeAiServers;
    $[23] = hasUnconfiguredFailure;
  } else hasUnconfiguredFailure = $[23];
  let hasUnconfiguredFailure_2 = hasUnconfiguredFailure;
  let entries;
  if (
    $[24] !== agentServersToShow ||
    $[25] !== claudeAiServers ||
    $[26] !== dynamicServers_2 ||
    $[27] !== isScreenReaderEnabled ||
    $[28] !== byScope_2 ||
    $[29] !== showUnusedConnectors ||
    $[30] !== suppressed ||
    $[31] !== toolCounts_2 ||
    $[32] !== unusedClaudeAiServers
  ) {
    entries = [];
    let pushServer = function pushServer(server, key) {
      entries.push({
        key,
        target: {
          type: "server",
          server,
        },
        item: describeServerStatus(server, toolCounts_2[server.name], isScreenReaderEnabled),
      });
    };
    for (const scope of MCP_SCOPE_ORDER) {
      let scopeServers = byScope_2.get(scope);
      if (!scopeServers || scopeServers.length === 0) {
        continue;
      }
      let scopeHeading = getScopeHeading(scope);
      entries.push({
        key: `heading-${scope}`,
        node: jsxProd_default(ServerPathLabel, {
          label: scopeHeading.label,
          path: scopeHeading.path,
        }),
      });
      for (const server of scopeServers) pushServer(server, `${scope}-${server.name}`);
      entries.push({
        key: `spacer-${scope}`,
        node: jsxProd_default(Text, {
          children: " ",
        }),
      });
    }
    if (claudeAiServers.length > 0 || unusedClaudeAiServers.length > 0 || suppressed.length > 0) {
      let node;
      if ($[34] === MEMO_CACHE_SENTINEL) {
        node = jsxProd_default(ServerPathLabel, {
          label: "claude.ai",
        });
        $[34] = node;
      } else node = $[34];
      entries.push({
        key: "heading-claudeai",
        node,
      });
      for (const claudeAiServer of claudeAiServers)
        pushServer(claudeAiServer, `claudeai-${claudeAiServer.name}`);
      if (unusedClaudeAiServers.length > 0) {
        entries.push({
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
            pushServer(unusedClaudeAiServer, `claudeai-${unusedClaudeAiServer.name}`);
        }
      }
      for (const suppressedServer of suppressed) {
        entries.push({
          key: `suppressed-${suppressedServer.name}`,
          node: jsxProd_default(ServerNameRow, {
            name: suppressedServer.name,
            children: jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                " ",
                "\xB7 ",
                figures_default.radioOff,
                " hidden \u2014 same URL as your server '",
                cleanTaskDescription(suppressedServer.duplicateOf),
                "'",
              ],
            }),
          }),
        });
        entries.push({
          key: `suppressed-hint-${suppressedServer.name}`,
          node: jsxProd_default(Box, {
            paddingLeft: 2,
            children: jsxProd_default(Text, {
              wrap: "truncate-end",
              children: jsxProd_default(DuplicateServerHint, {
                s: suppressedServer,
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
      entries.push({
        key: "spacer-claudeai",
        node: node_2,
      });
    }
    if (agentServersToShow.length > 0) {
      let node;
      if ($[36] === MEMO_CACHE_SENTINEL) {
        node = jsxProd_default(ServerPathLabel, {
          label: "Agent MCPs",
        });
        $[36] = node;
      } else node = $[36];
      entries.push({
        key: "heading-agent-mcps",
        node,
      });
      for (const agentName of normalizeCaseForComparison_2(agentServersToShow.flatMap(sourceAgentsOf))) {
        entries.push({
          key: `spacer-agent-${agentName}`,
          node: jsxProd_default(Text, {
            children: " ",
          }),
        });
        entries.push({
          key: `subheading-agent-${agentName}`,
          node: jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "truncate-end",
            children: ["@", cleanTaskDescription(agentName)],
          }),
        });
        for (const agentServer of agentServersToShow.filter((agentServer_0) =>
          agentServer_0.sourceAgents.includes(agentName),
        ))
          entries.push({
            key: `agent-${agentName}-${agentServer.name}`,
            target: {
              type: "agent-server",
              agentServer,
            },
            item: {
              label: cleanTaskDescription(agentServer.name) ?? "",
              icon: jsxProd_default(StatusIcon, {
                status: agentServer.needsAuth ? "warning" : "off",
              }),
              meta: [agentServer.needsAuth ? "may need auth" : "agent-only"],
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
      entries.push({
        key: "spacer-agent-mcps",
        node: node_2,
      });
    }
    if (dynamicServers_2.length > 0) {
      let dynamicHeading;
      if ($[38] === MEMO_CACHE_SENTINEL) {
        dynamicHeading = getScopeHeading("dynamic");
        $[38] = dynamicHeading;
      } else dynamicHeading = $[38];
      let dynamicHeading_2 = dynamicHeading;
      let node;
      if ($[39] === MEMO_CACHE_SENTINEL) {
        node = jsxProd_default(ServerPathLabel, {
          label: dynamicHeading_2.label,
          path: dynamicHeading_2.path,
        });
        $[39] = node;
      } else node = $[39];
      entries.push({
        key: "heading-dynamic",
        node,
      });
      for (const server of dynamicServers_2) pushServer(server, `dynamic-${server.name}`);
      let node_2;
      if ($[40] === MEMO_CACHE_SENTINEL) {
        node_2 = jsxProd_default(Text, {
          children: " ",
        });
        $[40] = node_2;
      } else node_2 = $[40];
      entries.push({
        key: "spacer-dynamic",
        node: node_2,
      });
    }
    if (entries.at(-1)?.key.startsWith("spacer-")) entries.pop();
    $[24] = agentServersToShow;
    $[25] = claudeAiServers;
    $[26] = dynamicServers_2;
    $[27] = isScreenReaderEnabled;
    $[28] = byScope_2;
    $[29] = showUnusedConnectors;
    $[30] = suppressed;
    $[31] = toolCounts_2;
    $[32] = unusedClaudeAiServers;
    $[33] = entries;
  } else entries = $[33];
  let entries_2 = entries;
  let onSelect;
  if (
    $[41] !== entries_2 ||
    $[42] !== onSelectAgentServer ||
    $[43] !== onSelectServer ||
    $[44] !== onToggleUnusedConnectors
  ) {
    onSelect = (agentServer_1) => {
      let item = entries_2.flatMap(targetList)[agentServer_1];
      if (!item) {
        return;
      }
      if (item.type === "server") onSelectServer(item.server);
      else if (item.type === "agent-server") onSelectAgentServer(item.agentServer);
      else if (item.type === "unused-connectors-fold") onToggleUnusedConnectors();
    };
    $[41] = entries_2;
    $[42] = onSelectAgentServer;
    $[43] = onSelectServer;
    $[44] = onToggleUnusedConnectors;
    $[45] = onSelect;
  } else onSelect = $[45];
  let onSelect_2 = onSelect;
  if (
    servers.length === 0 &&
    agentServersToShow.length === 0 &&
    suppressed.length === 0 &&
    nameRefusals.length === 0
  ) {
    return null;
  }
  let serverCount = servers.length + agentServersToShow.length;
  let listRows = hasScrollViewport ? MCP_LIST_VISIBLE_ROWS : MCP_LIST_ROW_HEIGHT;
  let max = Math.max(MCP_LIST_INDENT, rows - listRows - (hasUnconfiguredFailure_2 ? 1 : 0));
  let any = entries_2.some(isTargetedResult);
  let isTruncated = any && entries_2.length > max;
  let warnings;
  if ($[46] === MEMO_CACHE_SENTINEL) {
    warnings = jsxProd_default(McpParsingWarnings, {});
    $[46] = warnings;
  } else warnings = $[46];
  let serverNoun;
  if ($[47] !== serverCount) {
    serverNoun = plural(serverCount, "server");
    $[47] = serverCount;
    $[48] = serverNoun;
  } else serverNoun = $[48];
  const subtitle = `${serverCount} ${serverNoun}`;
  let listView;
  if ($[49] !== entries_2 || $[50] !== onSelect_2 || $[51] !== any || $[52] !== max) {
    listView = any
      ? jsxProd_default(OrderedListWithItem, {
          visibleCount: max,
          wrap: true,
          onSelect: onSelect_2,
          children: entries_2.map(renderListEntry),
        })
      : jsxProd_default(Box, {
          flexDirection: "column",
          paddingLeft: 2,
          children: entries_2.map(renderNodeEntry),
        });
    $[49] = entries_2;
    $[50] = onSelect_2;
    $[51] = any;
    $[52] = max;
    $[53] = listView;
  } else listView = $[53];
  const marginTop = isTruncated ? 0 : 1;
  let debugHint;
  if ($[54] !== hasUnconfiguredFailure_2) {
    debugHint =
      hasUnconfiguredFailure_2 &&
      jsxProd_default(Text, {
        dimColor: true,
        children: isDebug_2
          ? "\u203B Error logs shown inline with --debug"
          : "\u203B Run claude --debug to see error logs",
      });
    $[54] = hasUnconfiguredFailure_2;
    $[55] = debugHint;
  } else debugHint = $[55];
  let helpLink;
  if ($[56] === MEMO_CACHE_SENTINEL) {
    helpLink = jsxProd_default_2(Text, {
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
    $[56] = helpLink;
  } else helpLink = $[56];
  let footerBox;
  if ($[57] !== marginTop || $[58] !== debugHint) {
    footerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [debugHint, helpLink],
    });
    $[57] = marginTop;
    $[58] = debugHint;
    $[59] = footerBox;
  } else footerBox = $[59];
  let children;
  if ($[60] !== listView || $[61] !== footerBox) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [listView, footerBox],
    });
    $[60] = listView;
    $[61] = footerBox;
    $[62] = children;
  } else children = $[62];
  let dialog;
  if ($[63] !== onCancel_2 || $[64] !== subtitle || $[65] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Manage MCP servers",
      subtitle,
      onCancel: onCancel_2,
      hideInputGuide: true,
      children,
    });
    $[63] = onCancel_2;
    $[64] = subtitle;
    $[65] = children;
    $[66] = dialog;
  } else dialog = $[66];
  let navigateHint;
  if ($[67] !== isScreenReaderEnabled) {
    navigateHint =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: ["up", "down"],
        action: "navigate",
      });
    $[67] = isScreenReaderEnabled;
    $[68] = navigateHint;
  } else navigateHint = $[68];
  let confirmHint;
  if ($[69] !== isScreenReaderEnabled) {
    confirmHint =
      !isScreenReaderEnabled &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "confirm",
      });
    $[69] = isScreenReaderEnabled;
    $[70] = confirmHint;
  } else confirmHint = $[70];
  let cancelHint;
  if ($[71] === MEMO_CACHE_SENTINEL) {
    cancelHint = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    });
    $[71] = cancelHint;
  } else cancelHint = $[71];
  let inputGuide;
  if ($[72] !== navigateHint || $[73] !== confirmHint) {
    inputGuide = jsxProd_default(Box, {
      paddingX: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: true,
        children: jsxProd_default_2(Byline, {
          children: [navigateHint, confirmHint, cancelHint],
        }),
      }),
    });
    $[72] = navigateHint;
    $[73] = confirmHint;
    $[74] = inputGuide;
  } else inputGuide = $[74];
  let panel;
  if ($[75] !== dialog || $[76] !== inputGuide) {
    panel = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [warnings, dialog, inputGuide],
    });
    $[75] = dialog;
    $[76] = inputGuide;
    $[77] = panel;
  } else panel = $[77];
  return panel;
}
//@ chunk-h6004nzv.js:32625-33777 sole-consumer
/**
 * 服务器列表项：状态图标与说明（禁用、已连接/无工具、缓存、连接中、需认证、未配置、失败），托管时加 managed。
 */
function describeServerStatus(server, toolCount, isScreenReaderEnabled) {
  let { client } = server;
  let icon;
  let meta = [];
  if (client.type === "disabled")
    icon = jsxProd_default(StatusIcon, {
      status: "off",
    });
  else if (client.type === "connected") {
    let hasTools = !!client.capabilities?.tools;
    let problem;
    if (client.discoveryBearerRejected) problem = "session token rejected";
    else if (client.toolsListError) problem = "tools fetch failed";
    else if (hasTools && toolCount === 0) problem = "no tools";
    if (problem) {
      icon = jsxProd_default(StatusIcon, {
        status: "warning",
      });
      meta = [problem, "connected"];
    } else {
      icon = jsxProd_default(StatusIcon, {
        status: "success",
        "aria-label": "connected:",
      });
      if (hasTools && toolCount !== undefined) meta = [`${toolCount} ${plural(toolCount, "tool")}`];
    }
  } else if (client.type === "cached") {
    let cachedState = formatToolConnectionState(client.cacheSavedAt, toolCount);
    icon = jsxProd_default(Text, {
      color: cachedState.tone,
      children: cachedState.glyph,
    });
    meta = cachedState.facts;
  } else if (client.type === "pending") {
    icon = jsxProd_default(StatusIcon, {
      status: "loading",
      "aria-label": "connecting:",
    });
    let { reconnectAttempt, maxReconnectAttempts } = client;
    if (reconnectAttempt && maxReconnectAttempts)
      meta = [`reconnecting (${reconnectAttempt}/${maxReconnectAttempts})\u2026`];
  } else if (client.type === "needs-auth") {
    icon = jsxProd_default(StatusIcon, {
      status: "warning",
    });
    meta = ["needs authentication"];
  } else if (client.errorCode === "UNCONFIGURED") {
    icon = jsxProd_default(StatusIcon, {
      status: "pending",
      "aria-label": "not configured:",
    });
    meta = [isScreenReaderEnabled ? "" : "not configured"];
  } else {
    icon = jsxProd_default(StatusIcon, {
      status: "error",
    });
    if (client.errorCode === "INVALID_CONFIG") meta = ["config issue"];
  }
  let enterpriseManaged =
    server.transport === "claudeai-proxy" && server.scope === "claudeai" && server.config.enterpriseManaged;
  return {
    label: cleanTaskDescription(server.name) ?? "",
    icon,
    meta: enterpriseManaged ? [...meta, "managed"] : meta,
  };
}
export { applyMcpServerConfig, isClaudeAiProxyServer, SCOPE_ORDER, MCPListPanel };
