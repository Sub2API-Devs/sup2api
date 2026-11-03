/**
 * components/mcp/MCPToolListView.tsx
 *
 * MCP 工具列表：权限状态（blocked/ask-only/read-only）与凭证检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPToolListView.tsx
 * pieces: chunk-vrb44rx7.js (8)
 * attribution: fingerprint 2, placement 1, callgraph-fingerprint 1, layout 4
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { getClaudeAIOAuthTokens } from "../../utils/auth.js";
import { isDesignMcpUrl, hasExternalAuthForConfig } from "../../services/mcp/auth.js";
import { checkConsent } from "../../services/mcp/firstPartyDesignConsent.js";
import {
  returnFalseRemoteMenu,
  returnFalseRemoteMenu_2,
  MCPRemoteServerMenu,
} from "./MCPRemoteServerMenu.js";
import { y, fo, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { count } from "../../utils/collections.js";
import { getMcpDisplayName, extractMcpToolDisplayName } from "../../services/mcp/mcpStringUtils.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { HintText } from "../design-system/HintText.js";

//@ chunk-vrb44rx7.js:8350-9935 fingerprint = _temp2 (0.345)
/**
 * 远程（SSE/HTTP）MCP 服务器菜单的外壳：异步检查 design MCP 凭证与已存 OAuth token，检查期间显示 “Checking credentials…”，完成后渲染 MCPRemoteServerMenu。
 */
function RemoteServerMenuLoader(exitState) {
  let $ = w(28);
  let config = exitState.server.config;
  let hasClaudeAiToken =
    (config.type === "sse" || config.type === "http") && !!getClaudeAIOAuthTokens()?.accessToken;
  let x;
  if ($[0] !== config || $[1] !== hasClaudeAiToken) {
    x =
      (config.type === "sse" || config.type === "http") &&
      isDesignMcpUrl(config.url) &&
      hasExternalAuthForConfig(config, hasClaudeAiToken) !== hasExternalAuthForConfig(config, true);
    $[0] = config;
    $[1] = hasClaudeAiToken;
    $[2] = x;
  } else x = $[2];
  let needsDesignCredential = x;
  let D;
  if ($[3] !== needsDesignCredential) {
    D = () => (needsDesignCredential ? checkConsent().catch(returnFalseRemoteMenu) : null);
    $[3] = needsDesignCredential;
    $[4] = D;
  } else D = $[4];
  let [designCredential] = y(D);
  let L;
  if ($[5] !== config || $[6] !== exitState.server.isAuthenticated || $[7] !== exitState.server.name) {
    L = () =>
      exitState.server.isAuthenticated === undefined && (config.type === "sse" || config.type === "http")
        ? hasValidMcpOAuthToken(exitState.server.name, config).catch(returnFalseRemoteMenu_2)
        : null;
    $[5] = config;
    $[6] = exitState.server.isAuthenticated;
    $[7] = exitState.server.name;
    $[8] = L;
  } else L = $[8];
  let [storedOAuthTokens] = y(L);
  const paddingX = exitState.borderless ? 1 : 0;
  const V = String(exitState.server.name);
  let B;
  if ($[9] !== V) {
    B = capitalize(V);
    $[9] = V;
    $[10] = B;
  } else B = $[10];
  const title = `${B} MCP Server`;
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
    $[20] !== designCredential ||
    $[21] !== hasClaudeAiToken ||
    $[22] !== exitState ||
    $[23] !== storedOAuthTokens
  ) {
    children_3 = jsxProd_default(MCPRemoteServerMenu, {
      ...exitState,
      hasClaudeAiToken,
      designCredential,
      storedOAuthTokens,
    });
    $[20] = designCredential;
    $[21] = hasClaudeAiToken;
    $[22] = exitState;
    $[23] = storedOAuthTokens;
    $[24] = children_3;
  } else children_3 = $[24];
  let he;
  if ($[25] !== fallback || $[26] !== children_3) {
    he = jsxProd_default(fo, {
      fallback,
      children: children_3,
    });
    $[25] = fallback;
    $[26] = children_3;
    $[27] = he;
  } else he = $[27];
  return he;
}
//@ chunk-vrb44rx7.js:33767-33771 placement
init_react_production();
//@ chunk-vrb44rx7.js:33771-33807 callgraph-fingerprint = _temp (1)
function selectMcpTools(s) {
  return s.mcp.tools;
}
//@ chunk-vrb44rx7.js:33807-33955 layout
/**
 * 排序比较：effectiveMaxPermission 为 blocked 的工具排在后面。
 */
function compareBlockedLast(Yt, _e) {
  let qe = Yt.mcpInfo?.effectiveMaxPermission === "blocked" ? 1 : 0;
  let vt = _e.mcpInfo?.effectiveMaxPermission === "blocked" ? 1 : 0;
  return qe - vt;
}
//@ chunk-vrb44rx7.js:33955-34025 layout
function isBlockedTool(Lt) {
  return Lt.mcpInfo?.effectiveMaxPermission === "blocked";
}
//@ chunk-vrb44rx7.js:34025-34074 layout
function isCliOwnedTool(nn) {
  return nn.mcpInfo?.cliOwned === true;
}
//@ chunk-vrb44rx7.js:34074-34200 layout
/**
 * 工具列表项（被阻止时带警告图标）。
 */
function renderToolListItem($t) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: $t.label,
      icon: $t.blocked
        ? jsxProd_default(StatusIcon, {
            status: "warning",
          })
        : undefined,
      meta: $t.facts,
    },
    $t.tool.name,
  );
}
//@ chunk-vrb44rx7.js:34200-36255 fingerprint = MCPToolListView (0.487)
function MCPToolListView(props) {
  let $ = w(23);
  let { server, onSelectTool, onBack } = props;
  let mcpTools = useAppState(selectMcpTools);
  let [T, D] = y(0);
  let [U, L] = y(false);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let K;
  _: {
    if (!isConnectedOrCached(server.client)) {
      let B;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        B = [];
        $[0] = B;
      } else B = $[0];
      K = B;
      break _;
    }
    let B;
    if ($[1] !== mcpTools || $[2] !== server.name) {
      B = filterToolsByServer(mcpTools, server.name).sort(compareBlockedLast);
      $[1] = mcpTools;
      $[2] = server.name;
      $[3] = B;
    } else B = $[3];
    K = B;
  }
  let J = K;
  let pe = count(J, isBlockedTool);
  let fe = J.some(isCliOwnedTool) ? "Claude Code" : "your organization";
  let B;
  if (
    $[4] !== fe ||
    $[5] !== pe ||
    $[6] !== T ||
    $[7] !== isScreenReaderEnabled ||
    $[8] !== onBack ||
    $[9] !== onSelectTool ||
    $[10] !== U ||
    $[11] !== server.name ||
    $[12] !== J
  ) {
    let me;
    if ($[14] !== fe || $[15] !== server.name) {
      me = (tool) => {
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
            facts: [`disabled by ${fe}`],
          };
        }
        let Se = effectiveMaxPermission === "ask" ? ["ask-only"] : [];
        if (isReadOnly) Se.push("read-only");
        if (isDestructive) Se.push("destructive");
        if (isOpenWorld) Se.push("open-world");
        return {
          tool,
          label: displayName,
          blocked: false,
          facts: Se,
        };
      };
      $[14] = fe;
      $[15] = server.name;
      $[16] = me;
    } else me = $[16];
    let mapped = J.map(me);
    let Tt = J.length - pe;
    let Ke = U ? mapped[T] : undefined;
    let subtitle = Ke?.blocked
      ? jsxProd_default_2(Text, {
          color: "warning",
          children: [Ke.label, " is disabled by ", fe],
        })
      : pe > 0
        ? `${Tt} ${plural(Tt, "tool")} \xB7 ${pe} disabled by ${fe}`
        : `${J.length} ${plural(J.length, "tool")}`;
    let He;
    if ($[17] !== isScreenReaderEnabled) {
      He =
        !isScreenReaderEnabled &&
        jsxProd_default(KeyboardShortcutHint, {
          chord: ["up", "down"],
          action: "navigate",
        });
      $[17] = isScreenReaderEnabled;
      $[18] = He;
    } else He = $[18];
    const ct =
      isScreenReaderEnabled || mapped[T]?.blocked
        ? null
        : jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "select",
          });
    let Ct;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      Ct = jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "back",
      });
      $[19] = Ct;
    } else Ct = $[19];
    let inputGuide;
    if ($[20] !== He || $[21] !== ct) {
      inputGuide = jsxProd_default_2(Byline, {
        children: [He, ct, Ct],
      });
      $[20] = He;
      $[21] = ct;
      $[22] = inputGuide;
    } else inputGuide = $[22];
    B = jsxProd_default(Dialog, {
      title: `Tools for ${server.name}`,
      subtitle,
      onCancel: onBack,
      inputGuide,
      children:
        J.length === 0
          ? jsxProd_default(HintText, {
              children: "No tools available",
            })
          : jsxProd_default(OrderedListWithItem, {
              wrap: true,
              onFocus: (value) => {
                D(value);
                L(false);
              },
              onSelect: (at) => {
                let tool_0 = mapped[at];
                if (!tool_0) {
                  return;
                }
                if (tool_0.blocked) {
                  L(true);
                  return;
                }
                onSelectTool(tool_0.tool);
              },
              children: mapped.map(renderToolListItem),
            }),
    });
    $[4] = fe;
    $[5] = pe;
    $[6] = T;
    $[7] = isScreenReaderEnabled;
    $[8] = onBack;
    $[9] = onSelectTool;
    $[10] = U;
    $[11] = server.name;
    $[12] = J;
    $[13] = B;
  } else B = $[13];
  return B;
}
export { RemoteServerMenuLoader, MCPToolListView };
