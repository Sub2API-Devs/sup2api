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
import { Foe } from "../../services/mcp/firstPartyDesignConsent.js";
import { ag, lg, MCPRemoteServerMenu } from "./MCPRemoteServerMenu.js";
import { y, fo, j } from "../../../vendor/react/cjs/react.production.js";
import { hasValidMcpOAuthToken } from "./CapabilitiesSection.js";
import { capitalize, Dr, plural } from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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

/**
 * 远程（SSE/HTTP）MCP 服务器菜单的外壳：异步检查 design MCP 凭证与已存 OAuth token，检查期间显示 “Checking credentials…”，完成后渲染 MCPRemoteServerMenu。
 */
//@ chunk-vrb44rx7.js:8350-9935 fingerprint = _temp2 (0.345)
function RemoteServerMenuLoader(exitState) {
  let $ = w(28),
    config = exitState.server.config,
    hasClaudeAiToken =
      (config.type === "sse" || config.type === "http") && !!getClaudeAIOAuthTokens()?.accessToken,
    x;
  if ($[0] !== config || $[1] !== hasClaudeAiToken)
    ((x =
      (config.type === "sse" || config.type === "http") &&
      isDesignMcpUrl(config.url) &&
      hasExternalAuthForConfig(config, hasClaudeAiToken) !== hasExternalAuthForConfig(config, !0)),
      ($[0] = config),
      ($[1] = hasClaudeAiToken),
      ($[2] = x));
  else x = $[2];
  let needsDesignCredential = x,
    D;
  if ($[3] !== needsDesignCredential)
    ((D = () => (needsDesignCredential ? Foe().catch(ag) : null)),
      ($[3] = needsDesignCredential),
      ($[4] = D));
  else D = $[4];
  let [designCredential] = y(D),
    L;
  if ($[5] !== config || $[6] !== exitState.server.isAuthenticated || $[7] !== exitState.server.name)
    ((L = () =>
      exitState.server.isAuthenticated === void 0 && (config.type === "sse" || config.type === "http")
        ? hasValidMcpOAuthToken(exitState.server.name, config).catch(lg)
        : null),
      ($[5] = config),
      ($[6] = exitState.server.isAuthenticated),
      ($[7] = exitState.server.name),
      ($[8] = L));
  else L = $[8];
  let [storedOAuthTokens] = y(L);
  const K = exitState.borderless ? 1 : 0,
    V = String(exitState.server.name);
  let B;
  if ($[9] !== V) ((B = capitalize(V)), ($[9] = V), ($[10] = B));
  else B = $[10];
  const _ = `${B} MCP Server`;
  let J, pe;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((J = e(Byline, {
      children: e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "back",
      }),
    })),
      (pe = e(Text, { dimColor: !0, children: "Checking credentials\u2026" })),
      ($[11] = J),
      ($[12] = pe));
  else ((J = $[11]), (pe = $[12]));
  let fe;
  if ($[13] !== exitState.borderless || $[14] !== exitState.onCancel || $[15] !== _)
    ((fe = e(Dialog, {
      title: _,
      onCancel: exitState.onCancel,
      hideBorder: exitState.borderless,
      inputGuide: J,
      children: pe,
    })),
      ($[13] = exitState.borderless),
      ($[14] = exitState.onCancel),
      ($[15] = _),
      ($[16] = fe));
  else fe = $[16];
  let me;
  if ($[17] !== K || $[18] !== fe)
    ((me = e(Box, { flexDirection: "column", paddingX: K, children: fe })),
      ($[17] = K),
      ($[18] = fe),
      ($[19] = me));
  else me = $[19];
  let ne;
  if (
    $[20] !== designCredential ||
    $[21] !== hasClaudeAiToken ||
    $[22] !== exitState ||
    $[23] !== storedOAuthTokens
  )
    ((ne = e(MCPRemoteServerMenu, {
      ...exitState,
      hasClaudeAiToken: hasClaudeAiToken,
      designCredential: designCredential,
      storedOAuthTokens: storedOAuthTokens,
    })),
      ($[20] = designCredential),
      ($[21] = hasClaudeAiToken),
      ($[22] = exitState),
      ($[23] = storedOAuthTokens),
      ($[24] = ne));
  else ne = $[24];
  let he;
  if ($[25] !== me || $[26] !== ne)
    ((he = e(fo, { fallback: me, children: ne })), ($[25] = me), ($[26] = ne), ($[27] = he));
  else he = $[27];
  return he;
}
//@ chunk-vrb44rx7.js:33767-33771 placement
j();
//@ chunk-vrb44rx7.js:33771-33807 callgraph-fingerprint = _temp (1)
function selectMcpTools(s) {
  return s.mcp.tools;
}
/**
 * 排序比较：effectiveMaxPermission 为 blocked 的工具排在后面。
 */
//@ chunk-vrb44rx7.js:33807-33955 layout
function compareBlockedLast(Yt, _e) {
  let qe = Yt.mcpInfo?.effectiveMaxPermission === "blocked" ? 1 : 0;
  let vt = _e.mcpInfo?.effectiveMaxPermission === "blocked" ? 1 : 0;
  return qe - vt;
}
//@ chunk-vrb44rx7.js:33955-34025 layout
function Gg(Lt) {
  return Lt.mcpInfo?.effectiveMaxPermission === "blocked";
}
//@ chunk-vrb44rx7.js:34025-34074 layout
function Kg(nn) {
  return nn.mcpInfo?.cliOwned === !0;
}
/**
 * 工具列表项（被阻止时带警告图标）。
 */
//@ chunk-vrb44rx7.js:34074-34200 layout
function renderToolListItem($t) {
  return e(
    OrderedListWithItem.Item,
    { label: $t.label, icon: $t.blocked ? e(StatusIcon, { status: "warning" }) : void 0, meta: $t.facts },
    $t.tool.name,
  );
}
//@ chunk-vrb44rx7.js:34200-36255 fingerprint = MCPToolListView (0.487)
function MCPToolListView(t0) {
  let $ = w(23),
    { server: server, onSelectTool: onSelectTool, onBack: onBack } = t0,
    mcpTools = useAppState(selectMcpTools),
    [T, D] = y(0),
    [U, L] = y(!1),
    A = useIsScreenReaderEnabled(),
    K;
  _: {
    if (!isConnectedOrCached(server.client)) {
      let B;
      if ($[0] === MEMO_CACHE_SENTINEL) ((B = []), ($[0] = B));
      else B = $[0];
      K = B;
      break _;
    }
    let B;
    if ($[1] !== mcpTools || $[2] !== server.name)
      ((B = filterToolsByServer(mcpTools, server.name).sort(compareBlockedLast)),
        ($[1] = mcpTools),
        ($[2] = server.name),
        ($[3] = B));
    else B = $[3];
    K = B;
  }
  let J = K,
    pe = count(J, Gg),
    fe = J.some(Kg) ? "Claude Code" : "your organization",
    B;
  if (
    $[4] !== fe ||
    $[5] !== pe ||
    $[6] !== T ||
    $[7] !== A ||
    $[8] !== onBack ||
    $[9] !== onSelectTool ||
    $[10] !== U ||
    $[11] !== server.name ||
    $[12] !== J
  ) {
    let me;
    if ($[14] !== fe || $[15] !== server.name)
      ((me = (ne) => {
        let toolName = getMcpDisplayName(ne.name, server.name);
        let W = ne.userFacingName ? ne.userFacingName({}) : toolName;
        let displayName = Dr(extractMcpToolDisplayName(W));
        let rt = ne.isReadOnly?.({}) ?? !1;
        let et = ne.isDestructive?.({}) ?? !1;
        let je = ne.isOpenWorld?.({}) ?? !1;
        let ae = ne.mcpInfo?.effectiveMaxPermission;
        if (ae === "blocked") {
          return { tool: ne, label: displayName, blocked: !0, facts: [`disabled by ${fe}`] };
        }
        let Se = ae === "ask" ? ["ask-only"] : [];
        if (rt) Se.push("read-only");
        if (et) Se.push("destructive");
        if (je) Se.push("open-world");
        return { tool: ne, label: displayName, blocked: !1, facts: Se };
      }),
        ($[14] = fe),
        ($[15] = server.name),
        ($[16] = me));
    else me = $[16];
    let mapped = J.map(me);
    let Tt = J.length - pe;
    let Ke = U ? mapped[T] : void 0;
    let Et = Ke?.blocked
      ? r(Text, { color: "warning", children: [Ke.label, " is disabled by ", fe] })
      : pe > 0
        ? `${Tt} ${plural(Tt, "tool")} \xB7 ${pe} disabled by ${fe}`
        : `${J.length} ${plural(J.length, "tool")}`;
    let He;
    if ($[17] !== A)
      ((He = !A && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" })),
        ($[17] = A),
        ($[18] = He));
    else He = $[18];
    const ct = A || mapped[T]?.blocked ? null : e(KeyboardShortcutHint, { chord: "enter", action: "select" });
    let Ct;
    if ($[19] === MEMO_CACHE_SENTINEL)
      ((Ct = e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "back",
      })),
        ($[19] = Ct));
    else Ct = $[19];
    let oe;
    if ($[20] !== He || $[21] !== ct)
      ((oe = r(Byline, { children: [He, ct, Ct] })), ($[20] = He), ($[21] = ct), ($[22] = oe));
    else oe = $[22];
    B = e(Dialog, {
      title: `Tools for ${server.name}`,
      subtitle: Et,
      onCancel: onBack,
      inputGuide: oe,
      children:
        J.length === 0
          ? e(HintText, { children: "No tools available" })
          : e(OrderedListWithItem, {
              wrap: !0,
              onFocus: (value) => {
                (D(value), L(!1));
              },
              onSelect: (at) => {
                let tool_0 = mapped[at];
                if (!tool_0) {
                  return;
                }
                if (tool_0.blocked) {
                  L(!0);
                  return;
                }
                onSelectTool(tool_0.tool);
              },
              children: mapped.map(renderToolListItem),
            }),
    });
    (($[4] = fe),
      ($[5] = pe),
      ($[6] = T),
      ($[7] = A),
      ($[8] = onBack),
      ($[9] = onSelectTool),
      ($[10] = U),
      ($[11] = server.name),
      ($[12] = J),
      ($[13] = B));
  } else B = $[13];
  return B;
}

export { RemoteServerMenuLoader, MCPToolListView };
