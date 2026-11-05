/**
 * components/mcp/MCPToolListView.tsx
 *
 * MCP 工具列表：权限状态（blocked/ask-only/read-only）与凭证检查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPToolListView.tsx
 * pieces: chunk-wb51jffc.js (8)
 * attribution: fingerprint 2, placement 1, callgraph-fingerprint 1, layout 4
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { getClaudeAIOAuthTokens } from "../../utils/auth.js";
import { isDesignMcpUrl, hasExternalAuthForConfig } from "../../services/mcp/auth.js";
import { checkConsent } from "../../services/mcp/firstPartyDesignConsent.js";
import {
  returnFalseRemoteMenu,
  returnFalseRemoteMenu_2,
  MCPRemoteServerMenu,
} from "./MCPRemoteServerMenu.js";
import {
  useState,
  suspenseTypeExport,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { hasValidMcpOAuthToken } from "./CapabilitiesSection.js";
import { capitalize, collapseWhitespace, plural } from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../design-system/Byline.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Dialog } from "../design-system/Dialog.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { useAppState } from "../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { filterToolsByServer } from "../../services/mcp/utils.js";
import { countWhere } from "../../utils/collections.js";
import { getMcpDisplayName, extractMcpToolDisplayName } from "../../services/mcp/mcpStringUtils.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { HintText } from "../design-system/HintText.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wb51jffc.js:8462-10047 fingerprint (2.1.88 match: _temp2, 0.345)
/**
 * 远程（SSE/HTTP）MCP 服务器菜单的外壳：异步检查 design MCP 凭证与已存 OAuth token，检查期间显示 “Checking credentials…”，完成后渲染 MCPRemoteServerMenu。
 */
function RemoteServerMenuLoader(exitState) {
  let $ = useMemoCache(28);
  let config = exitState.server.config;
  let hasClaudeAiToken =
    (config.type === "sse" || config.type === "http") && !!getClaudeAIOAuthTokens()?.accessToken;
  let needsDesignCredential;
  if ($[0] !== config || $[1] !== hasClaudeAiToken) {
    needsDesignCredential =
      (config.type === "sse" || config.type === "http") &&
      isDesignMcpUrl(config.url) &&
      hasExternalAuthForConfig(config, hasClaudeAiToken) !== hasExternalAuthForConfig(config, true);
    $[0] = config;
    $[1] = hasClaudeAiToken;
    $[2] = needsDesignCredential;
  } else needsDesignCredential = $[2];
  let needsDesignCredential_2 = needsDesignCredential;
  let loadDesignCredential;
  if ($[3] !== needsDesignCredential_2) {
    loadDesignCredential = () =>
      needsDesignCredential_2 ? checkConsent().catch(returnFalseRemoteMenu) : null;
    $[3] = needsDesignCredential_2;
    $[4] = loadDesignCredential;
  } else loadDesignCredential = $[4];
  let [designConsentResult] = useState(loadDesignCredential);
  let loadOAuthTokens;
  if ($[5] !== config || $[6] !== exitState.server.isAuthenticated || $[7] !== exitState.server.name) {
    loadOAuthTokens = () =>
      exitState.server.isAuthenticated === undefined && (config.type === "sse" || config.type === "http")
        ? hasValidMcpOAuthToken(exitState.server.name, config).catch(returnFalseRemoteMenu_2)
        : null;
    $[5] = config;
    $[6] = exitState.server.isAuthenticated;
    $[7] = exitState.server.name;
    $[8] = loadOAuthTokens;
  } else loadOAuthTokens = $[8];
  let [storedOAuthTokens] = useState(loadOAuthTokens);
  const paddingX = exitState.borderless ? 1 : 0;
  const rawName = String(exitState.server.name);
  let capitalizedName;
  if ($[9] !== rawName) {
    capitalizedName = capitalize(rawName);
    $[9] = rawName;
    $[10] = capitalizedName;
  } else capitalizedName = $[10];
  const title = `${capitalizedName} MCP Server`;
  let inputGuide;
  let children;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(Byline, {
      children: jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "back",
      }),
    });
    children = jsxProd_default(Text, {
      dimColor: true,
      children: "Checking credentials\u2026",
    });
    $[11] = inputGuide;
    $[12] = children;
  } else {
    inputGuide = $[11];
    children = $[12];
  }
  let children_2;
  if ($[13] !== exitState.borderless || $[14] !== exitState.onCancel || $[15] !== title) {
    children_2 = jsxProd_default(Dialog, {
      title,
      onCancel: exitState.onCancel,
      hideBorder: exitState.borderless,
      inputGuide,
      children,
    });
    $[13] = exitState.borderless;
    $[14] = exitState.onCancel;
    $[15] = title;
    $[16] = children_2;
  } else children_2 = $[16];
  let fallback;
  if ($[17] !== paddingX || $[18] !== children_2) {
    fallback = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX,
      children: children_2,
    });
    $[17] = paddingX;
    $[18] = children_2;
    $[19] = fallback;
  } else fallback = $[19];
  let children_3;
  if (
    $[20] !== designConsentResult ||
    $[21] !== hasClaudeAiToken ||
    $[22] !== exitState ||
    $[23] !== storedOAuthTokens
  ) {
    children_3 = jsxProd_default(MCPRemoteServerMenu, {
      ...exitState,
      hasClaudeAiToken,
      designCredential: designConsentResult,
      storedOAuthTokens,
    });
    $[20] = designConsentResult;
    $[21] = hasClaudeAiToken;
    $[22] = exitState;
    $[23] = storedOAuthTokens;
    $[24] = children_3;
  } else children_3 = $[24];
  let menu;
  if ($[25] !== fallback || $[26] !== children_3) {
    menu = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: children_3,
    });
    $[25] = fallback;
    $[26] = children_3;
    $[27] = menu;
  } else menu = $[27];
  return menu;
}
//@ chunk-wb51jffc.js:33891-33895 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:33891", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:33895-33931 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectMcpTools(s) {
  return s.mcp.tools;
}
//@ chunk-wb51jffc.js:33931-34079 layout
/**
 * 排序比较：effectiveMaxPermission 为 blocked 的工具排在后面。
 */
function compareBlockedLast(toolA, toolB) {
  let rankA = toolA.mcpInfo?.effectiveMaxPermission === "blocked" ? 1 : 0;
  let rankB = toolB.mcpInfo?.effectiveMaxPermission === "blocked" ? 1 : 0;
  return rankA - rankB;
}
//@ chunk-wb51jffc.js:34079-34149 layout
function isBlockedTool(tool) {
  return tool.mcpInfo?.effectiveMaxPermission === "blocked";
}
//@ chunk-wb51jffc.js:34149-34198 layout
function isCliOwnedTool(tool) {
  return tool.mcpInfo?.cliOwned === true;
}
//@ chunk-wb51jffc.js:34198-34324 layout
/**
 * 工具列表项（被阻止时带警告图标）。
 */
function renderToolListItem(item) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: item.label,
      icon: item.blocked
        ? jsxProd_default(StatusIcon, {
            status: "warning",
          })
        : undefined,
      meta: item.facts,
    },
    item.tool.name,
  );
}
//@ chunk-wb51jffc.js:34324-36379 fingerprint (2.1.88 match: MCPToolListView, 0.487)
function MCPToolListView(props) {
  let $ = useMemoCache(23);
  let { server, onSelectTool, onBack } = props;
  let mcpTools = useAppState(selectMcpTools);
  let [focusedIndex, setFocusedIndex] = useState(0);
  let [showBlockedNotice, setShowBlockedNotice] = useState(false);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let tools;
  _: {
    if (!isConnectedOrCached(server.client)) {
      let emptyTools;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        emptyTools = [];
        $[0] = emptyTools;
      } else emptyTools = $[0];
      tools = emptyTools;
      break _;
    }
    let sortedTools;
    if ($[1] !== mcpTools || $[2] !== server.name) {
      sortedTools = filterToolsByServer(mcpTools, server.name).sort(compareBlockedLast);
      $[1] = mcpTools;
      $[2] = server.name;
      $[3] = sortedTools;
    } else sortedTools = $[3];
    tools = sortedTools;
  }
  let tools_2 = tools;
  let blockedCount = countWhere(tools_2, isBlockedTool);
  let blockedBy = tools_2.some(isCliOwnedTool) ? "Claude Code" : "your organization";
  let dialog;
  if (
    $[4] !== blockedBy ||
    $[5] !== blockedCount ||
    $[6] !== focusedIndex ||
    $[7] !== isScreenReaderEnabled ||
    $[8] !== onBack ||
    $[9] !== onSelectTool ||
    $[10] !== showBlockedNotice ||
    $[11] !== server.name ||
    $[12] !== tools_2
  ) {
    let toItem;
    if ($[14] !== blockedBy || $[15] !== server.name) {
      toItem = (tool) => {
        let toolName = getMcpDisplayName(tool.name, server.name);
        let fullDisplayName = tool.userFacingName ? tool.userFacingName({}) : toolName;
        let displayName = collapseWhitespace(extractMcpToolDisplayName(fullDisplayName));
        let isReadOnly = tool.isReadOnly?.({}) ?? false;
        let isDestructive = tool.isDestructive?.({}) ?? false;
        let isOpenWorld = tool.isOpenWorld?.({}) ?? false;
        let effectiveMaxPermission = tool.mcpInfo?.effectiveMaxPermission;
        if (effectiveMaxPermission === "blocked") {
          return {
            tool,
            label: displayName,
            blocked: true,
            facts: [`disabled by ${blockedBy}`],
          };
        }
        let facts = effectiveMaxPermission === "ask" ? ["ask-only"] : [];
        if (isReadOnly) facts.push("read-only");
        if (isDestructive) facts.push("destructive");
        if (isOpenWorld) facts.push("open-world");
        return {
          tool,
          label: displayName,
          blocked: false,
          facts,
        };
      };
      $[14] = blockedBy;
      $[15] = server.name;
      $[16] = toItem;
    } else toItem = $[16];
    let mapped = tools_2.map(toItem);
    let enabledCount = tools_2.length - blockedCount;
    let focusedItem = showBlockedNotice ? mapped[focusedIndex] : undefined;
    let subtitle = focusedItem?.blocked
      ? jsxProd_default_2(Text, {
          color: "warning",
          children: [focusedItem.label, " is disabled by ", blockedBy],
        })
      : blockedCount > 0
        ? `${enabledCount} ${plural(enabledCount, "tool")} \xB7 ${blockedCount} disabled by ${blockedBy}`
        : `${tools_2.length} ${plural(tools_2.length, "tool")}`;
    let navigateHint;
    if ($[17] !== isScreenReaderEnabled) {
      navigateHint =
        !isScreenReaderEnabled &&
        jsxProd_default(KeyboardShortcutHint, {
          chord: ["up", "down"],
          action: "navigate",
        });
      $[17] = isScreenReaderEnabled;
      $[18] = navigateHint;
    } else navigateHint = $[18];
    const selectHint =
      isScreenReaderEnabled || mapped[focusedIndex]?.blocked
        ? null
        : jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "select",
          });
    let backHint;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      backHint = jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "back",
      });
      $[19] = backHint;
    } else backHint = $[19];
    let inputGuide;
    if ($[20] !== navigateHint || $[21] !== selectHint) {
      inputGuide = jsxProd_default_2(Byline, {
        children: [navigateHint, selectHint, backHint],
      });
      $[20] = navigateHint;
      $[21] = selectHint;
      $[22] = inputGuide;
    } else inputGuide = $[22];
    dialog = jsxProd_default(Dialog, {
      title: `Tools for ${server.name}`,
      subtitle,
      onCancel: onBack,
      inputGuide,
      children:
        tools_2.length === 0
          ? jsxProd_default(HintText, {
              children: "No tools available",
            })
          : jsxProd_default(OrderedListWithItem, {
              wrap: true,
              onFocus: (value) => {
                setFocusedIndex(value);
                setShowBlockedNotice(false);
              },
              onSelect: (index) => {
                let tool_0 = mapped[index];
                if (!tool_0) {
                  return;
                }
                if (tool_0.blocked) {
                  setShowBlockedNotice(true);
                  return;
                }
                onSelectTool(tool_0.tool);
              },
              children: mapped.map(renderToolListItem),
            }),
    });
    $[4] = blockedBy;
    $[5] = blockedCount;
    $[6] = focusedIndex;
    $[7] = isScreenReaderEnabled;
    $[8] = onBack;
    $[9] = onSelectTool;
    $[10] = showBlockedNotice;
    $[11] = server.name;
    $[12] = tools_2;
    $[13] = dialog;
  } else dialog = $[13];
  return dialog;
}
export { RemoteServerMenuLoader, MCPToolListView };
