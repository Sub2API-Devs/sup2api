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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { merged } from "../CustomSelect/select.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { describeMcpConfigFilePath } from "../../services/mcp/utils.js";
import { getMainThreadAgentType } from "../../bootstrap/state.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { claudeCommand } from "../../utils/worktreeResumeHint.js";
import { vc } from "../../utils/taskDescription.js";
import { ParenHint } from "../diff/DiffDetailView.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useScrollViewportSize, Tl } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { getEverConnectedClaudeAiMcpSet } from "../../services/mcp/claudeai.js";
import { isDebugMode } from "../../utils/debug.js";
import { YM } from "../../services/mcp/redactMcpErrors.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
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
j();
//@ chunk-cpqpnzp4.js:21065-21107 sole-consumer
function Ir(ei) {
  return ei.scope === "agent";
}
//@ chunk-cpqpnzp4.js:21107-21138 affinity
function $r(ni) {
  return ni.name;
}
//@ chunk-cpqpnzp4.js:21138-21182 callgraph-fingerprint = _temp (0.493)
function xr(s) {
  return !isClaudeAiProxyServer(s.client.config);
}
//@ chunk-cpqpnzp4.js:21182-21239 callgraph-fingerprint = _temp3 (1)
function Er(a, b) {
  return a.name.localeCompare(b.name);
}
//@ chunk-cpqpnzp4.js:21239-21296 callgraph-fingerprint = _temp4 (1)
function Or(a_0, b_0) {
  return a_0.name.localeCompare(b_0.name);
}
//@ chunk-cpqpnzp4.js:21296-21353 layout
function Dr(ai, ci) {
  return ai.name.localeCompare(ci.name);
}
//@ chunk-cpqpnzp4.js:21353-21384 layout
function Ur(li) {
  return li.name;
}
//@ chunk-cpqpnzp4.js:21384-21423 fingerprint = _temp6 (1)
function Br(s_2) {
  return s_2.sourceAgents;
}
//@ chunk-cpqpnzp4.js:21423-21474 affinity
function Lr(Xo) {
  return "target" in Xo ? [Xo.target] : [];
}
/**
 * 列表项或分组标题。
 */
//@ chunk-cpqpnzp4.js:21510-21615 sole-consumer
function renderListEntry(gn) {
  return "item" in gn
    ? e(OrderedListWithItem.Item, { ...gn.item }, gn.key)
    : e(merged.Heading, { children: gn.node }, gn.key);
}
//@ chunk-cpqpnzp4.js:21615-21681 sole-consumer
function Vr(Rt) {
  return "node" in Rt && e(Box, { children: Rt.node }, Rt.key);
}
//@ chunk-cpqpnzp4.js:21681-21762 affinity
var Mt = 12,
  Tt = 5,
  At = 3,
  _t = ["project", "local", "user", "enterprise", "managed", "agent"];
//@ chunk-cpqpnzp4.js:21762-22266 fingerprint = getScopeHeading (0.736)
function getScopeHeading(scope) {
  switch (scope) {
    case "project":
      return { label: "Project MCPs", path: describeMcpConfigFilePath(scope) };
    case "user":
      return { label: "User MCPs", path: describeMcpConfigFilePath(scope) };
    case "local":
      return { label: "Local MCPs", path: describeMcpConfigFilePath(scope) };
    case "enterprise":
      return { label: "Enterprise MCPs" };
    case "managed":
      return { label: "Managed MCPs", path: "provided by your organization" };
    case "agent": {
      let i = getMainThreadAgentType();
      return { label: "Active agent MCPs", path: i ? `@${i} frontmatter` : "agent frontmatter" };
    }
    case "dynamic":
      return { label: "Built-in MCPs", path: "always available" };
    default:
      return { label: scope };
  }
}
/**
 * 连接器与已有服务器重复时，按重复来源（插件/本地/动态/托管）说明如何改用连接器。
 */
//@ chunk-cpqpnzp4.js:22266-23546 layout
function DuplicateServerHint(g) {
  let $ = w(12),
    { s: i } = g;
  if (i.duplicateOf.startsWith("plugin:")) {
    let c;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((c = e(Text, {
        dimColor: !0,
        children: "To use this connector instead, disable the plugin server in /plugins",
      })),
        ($[0] = c));
    else c = $[0];
    return c;
  }
  switch (i.duplicateOfScope) {
    case "local":
    case "user":
    case "project": {
      let c;
      if ($[1] !== i.duplicateOf)
        ((c = claudeCommand("mcp remove", i.duplicateOf)), ($[1] = i.duplicateOf), ($[2] = c));
      else c = $[2];
      let v = c;
      let m;
      if ($[3] !== v || $[4] !== i.duplicateOf || $[5] !== i.duplicateOfScope)
        ((m = v
          ? r(Fragment, { children: ["run ", e(Text, { bold: !0, children: v })] })
          : `remove the ${i.duplicateOfScope}-scope server "${vc(i.duplicateOf) ?? ""}"`),
          ($[3] = v),
          ($[4] = i.duplicateOf),
          ($[5] = i.duplicateOfScope),
          ($[6] = m));
      else m = $[6];
      let k;
      if ($[7] !== m)
        ((k = r(Text, { dimColor: !0, children: ["To use this connector instead,", " ", m] })),
          ($[7] = m),
          ($[8] = k));
      else k = $[8];
      return k;
    }
    case "dynamic": {
      let c;
      if ($[9] === MEMO_CACHE_SENTINEL)
        ((c = e(Text, {
          dimColor: !0,
          children: "To use this connector instead, drop it from your --mcp-config flag",
        })),
          ($[9] = c));
      else c = $[9];
      return c;
    }
    case "enterprise":
    case "managed": {
      let c;
      if ($[10] === MEMO_CACHE_SENTINEL)
        ((c = e(Text, { dimColor: !0, children: "An admin-managed server takes precedence here" })),
          ($[10] = c));
      else c = $[10];
      return c;
    }
    default: {
      let c;
      if ($[11] === MEMO_CACHE_SENTINEL)
        ((c = e(Text, {
          dimColor: !0,
          children: "To use this connector instead, remove the duplicate server from your configuration",
        })),
          ($[11] = c));
      else c = $[11];
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
  for (let [, a] of groups) a.sort((c, v) => c.name.localeCompare(v.name));
  return groups;
}
/**
 * 粗体标签加括号路径。
 */
//@ chunk-cpqpnzp4.js:23716-24103 layout
function ServerPathLabel(g) {
  let $ = w(10),
    { label: label, path: path } = g,
    v;
  if ($[0] !== path) ((v = vc(path)), ($[0] = path), ($[1] = v));
  else v = $[1];
  let m = v,
    k;
  if ($[2] !== label) ((k = e(Text, { bold: !0, children: label })), ($[2] = label), ($[3] = k));
  else k = $[3];
  const f = m ?? !1;
  let b;
  if ($[4] !== m || $[5] !== f)
    ((b = e(ParenHint, { when: f, children: m })), ($[4] = m), ($[5] = f), ($[6] = b));
  else b = $[6];
  let N;
  if ($[7] !== k || $[8] !== b)
    ((N = r(Text, { wrap: "truncate-end", children: [k, b] })), ($[7] = k), ($[8] = b), ($[9] = N));
  else N = $[9];
  return N;
}
/**
 * 服务器名（按宽度截断）与右侧内容的一行。
 */
//@ chunk-cpqpnzp4.js:24103-24834 layout
function ServerNameRow(g) {
  let $ = w(23),
    { name: i, children: children } = g,
    v,
    m,
    k,
    f,
    b,
    N,
    _;
  if ($[0] !== i)
    ((k = vc(i) ?? ""),
      (m = Box),
      (_ = 1),
      (v = Box),
      (f = 0),
      (b = 1),
      (N = bunStringWidth(k)),
      ($[0] = i),
      ($[1] = v),
      ($[2] = m),
      ($[3] = k),
      ($[4] = f),
      ($[5] = b),
      ($[6] = N),
      ($[7] = _));
  else ((v = $[1]), (m = $[2]), (k = $[3]), (f = $[4]), (b = $[5]), (N = $[6]), (_ = $[7]));
  let h;
  if ($[8] !== k) ((h = e(Text, { wrap: "truncate-end", children: k })), ($[8] = k), ($[9] = h));
  else h = $[9];
  let U;
  if ($[10] !== v || $[11] !== f || $[12] !== b || $[13] !== N || $[14] !== h)
    ((U = e(v, { flexBasis: f, flexGrow: b, maxWidth: N, children: h })),
      ($[10] = v),
      ($[11] = f),
      ($[12] = b),
      ($[13] = N),
      ($[14] = h),
      ($[15] = U));
  else U = $[15];
  let ne;
  if ($[16] !== children)
    ((ne = e(Text, { wrap: "truncate-end", children: children })), ($[16] = children), ($[17] = ne));
  else ne = $[17];
  let Y;
  if ($[18] !== m || $[19] !== _ || $[20] !== U || $[21] !== ne)
    ((Y = r(m, { flexGrow: _, children: [U, ne] })),
      ($[18] = m),
      ($[19] = _),
      ($[20] = U),
      ($[21] = ne),
      ($[22] = Y));
  else Y = $[22];
  return Y;
}
/**
 * MCP 列表面板：按作用域（项目/本地/用户/企业/claude.ai/动态）分组列出服务器及状态图标。
 */
//@ chunk-cpqpnzp4.js:24834-31433 fingerprint = MCPListPanel (0.47)
function MCPListPanel(t0) {
  let $ = w(78),
    {
      servers: servers,
      suppressedClaudeAiConnectors: suppressedClaudeAiConnectors,
      reservedNameRefusals: reservedNameRefusals,
      toolCountsByServer: toolCountsByServer,
      agentServers: t1,
      onSelectServer: onSelectServer,
      onSelectAgentServer: onSelectAgentServer,
      onComplete: onComplete,
      showUnusedConnectors: showUnusedConnectors,
      onToggleUnusedConnectors: onToggleUnusedConnectors,
    } = t0,
    U;
  if ($[0] !== suppressedClaudeAiConnectors)
    ((U = suppressedClaudeAiConnectors === void 0 ? [] : suppressedClaudeAiConnectors),
      ($[0] = suppressedClaudeAiConnectors),
      ($[1] = U));
  else U = $[1];
  let ne = U,
    Y = reservedNameRefusals === void 0 ? [] : reservedNameRefusals,
    K;
  if ($[2] !== toolCountsByServer)
    ((K = toolCountsByServer === void 0 ? {} : toolCountsByServer), ($[2] = toolCountsByServer), ($[3] = K));
  else K = $[3];
  let L = K,
    { rows: rows } = useScrollViewportSize(useTerminalSize()),
    X = Tl(),
    z = useIsScreenReaderEnabled(),
    J;
  ke: {
    let me;
    if ($[4] !== servers) ((me = new Set(servers.filter(Ir).map($r))), ($[4] = servers), ($[5] = me));
    else me = $[5];
    let le = me;
    if (le.size === 0) {
      J = t1;
      break ke;
    }
    let pe;
    if ($[6] !== t1 || $[7] !== le) {
      let Pe;
      if ($[9] !== le) ((Pe = (xe) => !le.has(xe.name)), ($[9] = le), ($[10] = Pe));
      else Pe = $[10];
      pe = t1.filter(Pe);
      (($[6] = t1), ($[7] = le), ($[8] = pe));
    } else pe = $[8];
    J = pe;
  }
  let te = J,
    me;
  if ($[11] !== servers) {
    let filtered = servers.filter(xr);
    me = groupServersByScope(filtered);
    (($[11] = servers), ($[12] = me));
  } else me = $[12];
  let ye = me,
    pe;
  if ($[13] !== servers) {
    let B = getEverConnectedClaudeAiMcpSet();
    let x = [];
    let Ne = [];
    for (const scope of servers) {
      if (!isClaudeAiProxyServer(scope.client.config)) {
        continue;
      }
      if ((scope.client.type === "needs-auth" || scope.client.type === "failed") && !B.has(scope.name))
        Ne.push(scope);
      else x.push(scope);
    }
    pe = (x.sort(Er), Ne.sort(Or), { claudeAiServers: x, unusedClaudeAiServers: Ne });
    (($[13] = servers), ($[14] = pe));
  } else pe = $[14];
  let { claudeAiServers: claudeAiServers, unusedClaudeAiServers: unusedClaudeAiServers } = pe,
    Pe;
  if ($[15] !== ye) ((Pe = (ye.get("dynamic") ?? []).sort(Dr)), ($[15] = ye), ($[16] = Pe));
  else Pe = $[16];
  let ue = Pe,
    be;
  if ($[17] !== onComplete)
    ((be = () => {
      onComplete("MCP dialog dismissed", { display: "system" });
    }),
      ($[17] = onComplete),
      ($[18] = be));
  else be = $[18];
  let Pn = be,
    vt;
  if ($[19] === MEMO_CACHE_SENTINEL) ((vt = isDebugMode()), ($[19] = vt));
  else vt = $[19];
  let Bo = vt,
    Ct;
  if ($[20] !== servers || $[21] !== showUnusedConnectors || $[22] !== unusedClaudeAiServers) {
    let Lo = showUnusedConnectors ? void 0 : new Set(unusedClaudeAiServers.map(Ur));
    Ct = servers.some((prev) => prev.client.type === "failed" && !YM(prev.client) && !Lo?.has(prev.name));
    (($[20] = servers), ($[21] = showUnusedConnectors), ($[22] = unusedClaudeAiServers), ($[23] = Ct));
  } else Ct = $[23];
  let an = Ct,
    I;
  if (
    $[24] !== te ||
    $[25] !== claudeAiServers ||
    $[26] !== ue ||
    $[27] !== z ||
    $[28] !== ye ||
    $[29] !== showUnusedConnectors ||
    $[30] !== ne ||
    $[31] !== L ||
    $[32] !== unusedClaudeAiServers
  ) {
    I = [];
    let cn = function cn(Oe, zo) {
      I.push({
        key: zo,
        target: { type: "server", server: Oe },
        item: describeServerStatus(Oe, L[Oe.name], z),
      });
    };
    for (const ln of _t) {
      let wt = ye.get(ln);
      if (!wt || wt.length === 0) {
        continue;
      }
      let Ho = getScopeHeading(ln);
      I.push({ key: `heading-${ln}`, node: e(ServerPathLabel, { label: Ho.label, path: Ho.path }) });
      for (const Vo of wt) cn(Vo, `${ln}-${Vo.name}`);
      I.push({ key: `spacer-${ln}`, node: e(Text, { children: " " }) });
    }
    if (claudeAiServers.length > 0 || unusedClaudeAiServers.length > 0 || ne.length > 0) {
      let fe;
      if ($[34] === MEMO_CACHE_SENTINEL) ((fe = e(ServerPathLabel, { label: "claude.ai" })), ($[34] = fe));
      else fe = $[34];
      I.push({ key: "heading-claudeai", node: fe });
      for (const jo of claudeAiServers) cn(jo, `claudeai-${jo.name}`);
      if (unusedClaudeAiServers.length > 0) {
        if (
          (I.push({
            key: "claudeai-unused-fold",
            target: { type: "unused-connectors-fold" },
            item: {
              label: "Show unused connectors",
              icon: e(Text, { children: showUnusedConnectors ? re.arrowDown : re.arrowRight }),
              meta: [`${unusedClaudeAiServers.length} ${showUnusedConnectors ? "shown" : "hidden"}`],
            },
          }),
          showUnusedConnectors)
        ) {
          for (const Fo of unusedClaudeAiServers) cn(Fo, `claudeai-${Fo.name}`);
        }
      }
      for (const dn of ne)
        (I.push({
          key: `suppressed-${dn.name}`,
          node: e(ServerNameRow, {
            name: dn.name,
            children: r(Text, {
              dimColor: !0,
              children: [
                " ",
                "\xB7 ",
                re.radioOff,
                " hidden \u2014 same URL as your server '",
                vc(dn.duplicateOf),
                "'",
              ],
            }),
          }),
        }),
          I.push({
            key: `suppressed-hint-${dn.name}`,
            node: e(Box, {
              paddingLeft: 2,
              children: e(Text, { wrap: "truncate-end", children: e(DuplicateServerHint, { s: dn }) }),
            }),
          }));
      let ge;
      if ($[35] === MEMO_CACHE_SENTINEL) ((ge = e(Text, { children: " " })), ($[35] = ge));
      else ge = $[35];
      I.push({ key: "spacer-claudeai", node: ge });
    }
    if (te.length > 0) {
      let fe;
      if ($[36] === MEMO_CACHE_SENTINEL) ((fe = e(ServerPathLabel, { label: "Agent MCPs" })), ($[36] = fe));
      else fe = $[36];
      I.push({ key: "heading-agent-mcps", node: fe });
      for (const un of uniq(te.flatMap(Br))) {
        (I.push({ key: `spacer-agent-${un}`, node: e(Text, { children: " " }) }),
          I.push({
            key: `subheading-agent-${un}`,
            node: r(Text, { dimColor: !0, wrap: "truncate-end", children: ["@", vc(un)] }),
          }));
        for (const mn of te.filter((agentServer_0) => agentServer_0.sourceAgents.includes(un)))
          I.push({
            key: `agent-${un}-${mn.name}`,
            target: { type: "agent-server", agentServer: mn },
            item: {
              label: vc(mn.name) ?? "",
              icon: e(StatusIcon, { status: mn.needsAuth ? "warning" : "off" }),
              meta: [mn.needsAuth ? "may need auth" : "agent-only"],
            },
          });
      }
      let ge;
      if ($[37] === MEMO_CACHE_SENTINEL) ((ge = e(Text, { children: " " })), ($[37] = ge));
      else ge = $[37];
      I.push({ key: "spacer-agent-mcps", node: ge });
    }
    if (ue.length > 0) {
      let fe;
      if ($[38] === MEMO_CACHE_SENTINEL) ((fe = getScopeHeading("dynamic")), ($[38] = fe));
      else fe = $[38];
      let qo = fe;
      let ge;
      if ($[39] === MEMO_CACHE_SENTINEL)
        ((ge = e(ServerPathLabel, { label: qo.label, path: qo.path })), ($[39] = ge));
      else ge = $[39];
      I.push({ key: "heading-dynamic", node: ge });
      for (const Go of ue) cn(Go, `dynamic-${Go.name}`);
      let fn;
      if ($[40] === MEMO_CACHE_SENTINEL) ((fn = e(Text, { children: " " })), ($[40] = fn));
      else fn = $[40];
      I.push({ key: "spacer-dynamic", node: fn });
    }
    if (I.at(-1)?.key.startsWith("spacer-")) I.pop();
    (($[24] = te),
      ($[25] = claudeAiServers),
      ($[26] = ue),
      ($[27] = z),
      ($[28] = ye),
      ($[29] = showUnusedConnectors),
      ($[30] = ne),
      ($[31] = L),
      ($[32] = unusedClaudeAiServers),
      ($[33] = I));
  } else I = $[33];
  let Te = I,
    fe;
  if (
    $[41] !== Te ||
    $[42] !== onSelectAgentServer ||
    $[43] !== onSelectServer ||
    $[44] !== onToggleUnusedConnectors
  )
    ((fe = (agentServer_1) => {
      let Ge = Te.flatMap(Lr)[agentServer_1];
      if (!Ge) {
        return;
      }
      if (Ge.type === "server") onSelectServer(Ge.server);
      else if (Ge.type === "agent-server") onSelectAgentServer(Ge.agentServer);
      else if (Ge.type === "unused-connectors-fold") onToggleUnusedConnectors();
    }),
      ($[41] = Te),
      ($[42] = onSelectAgentServer),
      ($[43] = onSelectServer),
      ($[44] = onToggleUnusedConnectors),
      ($[45] = fe));
  else fe = $[45];
  let St = fe;
  if (servers.length === 0 && te.length === 0 && ne.length === 0 && Y.length === 0) {
    return null;
  }
  let $n = servers.length + te.length,
    Zs = X ? Tt : Mt,
    max = Math.max(At, rows - Zs - (an ? 1 : 0)),
    any = Te.some(renderToolResultMessage),
    Qs = any && Te.length > max,
    ge;
  if ($[46] === MEMO_CACHE_SENTINEL) ((ge = e(McpParsingWarnings, {})), ($[46] = ge));
  else ge = $[46];
  let fn;
  if ($[47] !== $n) ((fn = plural($n, "server")), ($[47] = $n), ($[48] = fn));
  else fn = $[48];
  const t21 = `${$n} ${fn}`;
  let Nn;
  if ($[49] !== Te || $[50] !== St || $[51] !== any || $[52] !== max)
    ((Nn = any
      ? e(OrderedListWithItem, {
          visibleCount: max,
          wrap: !0,
          onSelect: St,
          children: Te.map(renderListEntry),
        })
      : e(Box, { flexDirection: "column", paddingLeft: 2, children: Te.map(Vr) })),
      ($[49] = Te),
      ($[50] = St),
      ($[51] = any),
      ($[52] = max),
      ($[53] = Nn));
  else Nn = $[53];
  const bt = Qs ? 0 : 1;
  let On;
  if ($[54] !== an)
    ((On =
      an &&
      e(Text, {
        dimColor: !0,
        children: Bo
          ? "\u203B Error logs shown inline with --debug"
          : "\u203B Run claude --debug to see error logs",
      })),
      ($[54] = an),
      ($[55] = On));
  else On = $[55];
  let Wo;
  if ($[56] === MEMO_CACHE_SENTINEL)
    ((Wo = r(Text, {
      dimColor: !0,
      children: [
        e(Link, {
          url: "https://code.claude.com/docs/en/mcp",
          children: "https://code.claude.com/docs/en/mcp",
        }),
        " ",
        "for help",
      ],
    })),
      ($[56] = Wo));
  else Wo = $[56];
  let Dn;
  if ($[57] !== bt || $[58] !== On)
    ((Dn = r(Box, { flexDirection: "column", marginTop: bt, children: [On, Wo] })),
      ($[57] = bt),
      ($[58] = On),
      ($[59] = Dn));
  else Dn = $[59];
  let Un;
  if ($[60] !== Nn || $[61] !== Dn)
    ((Un = r(Box, { flexDirection: "column", children: [Nn, Dn] })),
      ($[60] = Nn),
      ($[61] = Dn),
      ($[62] = Un));
  else Un = $[62];
  let Bn;
  if ($[63] !== Pn || $[64] !== t21 || $[65] !== Un)
    ((Bn = e(Dialog, {
      title: "Manage MCP servers",
      subtitle: t21,
      onCancel: Pn,
      hideInputGuide: !0,
      children: Un,
    })),
      ($[63] = Pn),
      ($[64] = t21),
      ($[65] = Un),
      ($[66] = Bn));
  else Bn = $[66];
  let Ln;
  if ($[67] !== z)
    ((Ln = !z && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" })),
      ($[67] = z),
      ($[68] = Ln));
  else Ln = $[68];
  let zn;
  if ($[69] !== z)
    ((zn = !z && e(KeyboardShortcutHint, { chord: "enter", action: "confirm" })), ($[69] = z), ($[70] = zn));
  else zn = $[70];
  let Yo;
  if ($[71] === MEMO_CACHE_SENTINEL)
    ((Yo = e(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    })),
      ($[71] = Yo));
  else Yo = $[71];
  let Hn;
  if ($[72] !== Ln || $[73] !== zn)
    ((Hn = e(Box, {
      paddingX: 1,
      children: e(Text, { dimColor: !0, italic: !0, children: r(Byline, { children: [Ln, zn, Yo] }) }),
    })),
      ($[72] = Ln),
      ($[73] = zn),
      ($[74] = Hn));
  else Hn = $[74];
  let Ko;
  if ($[75] !== Bn || $[76] !== Hn)
    ((Ko = r(Box, { flexDirection: "column", children: [ge, Bn, Hn] })),
      ($[75] = Bn),
      ($[76] = Hn),
      ($[77] = Ko));
  else Ko = $[77];
  return Ko;
}
/**
 * 服务器列表项：状态图标与说明（禁用、已连接/无工具、缓存、连接中、需认证、未配置、失败），托管时加 managed。
 */
//@ chunk-cpqpnzp4.js:31433-32585 sole-consumer
function describeServerStatus(g, i, a) {
  let { client: client } = g,
    v,
    m = [];
  if (client.type === "disabled") v = e(StatusIcon, { status: "off" });
  else if (client.type === "connected") {
    let f = !!client.capabilities?.tools,
      b;
    if (client.discoveryBearerRejected) b = "session token rejected";
    else if (client.toolsListError) b = "tools fetch failed";
    else if (f && i === 0) b = "no tools";
    if (b) ((v = e(StatusIcon, { status: "warning" })), (m = [b, "connected"]));
    else if (((v = e(StatusIcon, { status: "success", "aria-label": "connected:" })), f && i !== void 0))
      m = [`${i} ${plural(i, "tool")}`];
  } else if (client.type === "cached") {
    let f = formatToolConnectionState(client.cacheSavedAt, i);
    ((v = e(Text, { color: f.tone, children: f.glyph })), (m = f.facts));
  } else if (client.type === "pending") {
    v = e(StatusIcon, { status: "loading", "aria-label": "connecting:" });
    let { reconnectAttempt: reconnectAttempt, maxReconnectAttempts: maxReconnectAttempts } = client;
    if (reconnectAttempt && maxReconnectAttempts)
      m = [`reconnecting (${reconnectAttempt}/${maxReconnectAttempts})\u2026`];
  } else if (client.type === "needs-auth")
    ((v = e(StatusIcon, { status: "warning" })), (m = ["needs authentication"]));
  else if (client.errorCode === "UNCONFIGURED")
    ((v = e(StatusIcon, { status: "pending", "aria-label": "not configured:" })),
      (m = [a ? "" : "not configured"]));
  else if (((v = e(StatusIcon, { status: "error" })), client.errorCode === "INVALID_CONFIG"))
    m = ["config issue"];
  let k = g.transport === "claudeai-proxy" && g.scope === "claudeai" && g.config.enterpriseManaged;
  return { label: vc(g.name) ?? "", icon: v, meta: k ? [...m, "managed"] : m };
}
//@ chunk-9qfjhaj4.js:235-420 fingerprint = _temp5 (0.677)
function applyMcpServerConfig(o, e) {
  let n = { name: e.client.name, config: o };
  return {
    ...e,
    client: withConfigScope(e.client, o),
    ...(e.tools !== void 0 && { tools: decorateMcpTools(n, e.tools) }),
    ...(e.commands !== void 0 && { commands: stampToolScope(n, e.commands) }),
  };
}
/**
 * isClaudeAiConnectorConfig：claudeai 作用域的 claudeai-proxy，或非插件 dynamic 作用域的 claudeai-proxy。
 */
//@ chunk-dcmhvw5a.js:71740-71850 callgraph-fingerprint = _temp2 (0.448)
function isClaudeAiProxyServer(s_0) {
  if (s_0.type !== "claudeai-proxy") return !1;
  return s_0.scope === "claudeai" || (s_0.scope === "dynamic" && !isPluginServerConfig(s_0));
}

export { applyMcpServerConfig, MCPListPanel, isClaudeAiProxyServer };
