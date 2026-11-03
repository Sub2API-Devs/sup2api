/**
 * components/ContextVisualization.tsx
 *
 * /context 可视化：按类别（系统提示、工具、MCP、记忆、技能、消息、空闲）显示估算 token 占用的格子图与明细树。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ContextVisualization.tsx
 * pieces: chunk-10q8r8ck.js (27), chunk-ag5x7vhf.js (5), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 11, file-local 2, layout 7, callgraph-fingerprint 8, placement 3, sole-consumer 2
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { TreeConnectors } from "./design-system/TreeConnectors.js";
import { formatTokens, formatTokenEstimate } from "../utils/format.js";
import { getDisplayPath } from "../utils/file.js";
import { CLAUDE_AI_SYNC_LABEL } from "../utils/settings/commandSyncNames.js";
import { getSourceDisplayName } from "../utils/settings/constants.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { plural } from "../utils/stringUtils.js";
import { contextOverflowNotice } from "../commands/context/context-noninteractive.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getPublicModelDisplayName } from "../utils/model/modelDisplay.js";
import { generateContextSuggestions } from "../utils/contextSuggestions.js";
import { ContextSuggestions } from "./ContextSuggestions.js";
import { HostScoped } from "../utils/hostScoped.js";

//@ chunk-10q8r8ck.js:17306-17394 fingerprint = _temp (1)
function vt(cat) {
  return cat.tokens > 0 && cat.name !== "Free space" && cat.name !== v && !cat.isDeferred;
}
//@ chunk-10q8r8ck.js:17394-17456 fingerprint = _temp2 (1)
function Lt(cat_0) {
  return cat_0.isDeferred && cat_0.name.includes("MCP");
}
//@ chunk-10q8r8ck.js:17456-17491 file-local
function Nt(cat_1) {
  return cat_1.name === v;
}
//@ chunk-10q8r8ck.js:17491-17752 fingerprint = _temp4 (1)
function renderGridSquare(square, colIndex) {
  if (square.categoryName === "Free space") {
    return e(Text, { dimColor: !0, children: "\u26F6 " }, colIndex);
  }
  if (square.categoryName === v) {
    return e(Text, { color: square.color, children: "\u26DD " }, colIndex);
  }
  return e(
    Text,
    { color: square.color, children: square.squareFullness >= 0.7 ? "\u26C1 " : "\u26C0 " },
    colIndex,
  );
}
//@ chunk-10q8r8ck.js:17752-17842 fingerprint = _temp5 (1)
function Mt(row, rowIndex) {
  return e(Box, { flexDirection: "row", marginLeft: -1, children: row.map(renderGridSquare) }, rowIndex);
}
//@ chunk-10q8r8ck.js:17842-17888 fingerprint = _temp8 (1)
function bt(c_0) {
  return c_0.name === "Free space";
}
//@ chunk-10q8r8ck.js:17888-17934 layout = _temp8 (1)
function At(c_0) {
  return c_0.name === "Free space";
}
//@ chunk-10q8r8ck.js:17934-17980 layout = _temp8 (1)
function Rt(c_0) {
  return c_0.name === "Free space";
}
//@ chunk-10q8r8ck.js:17980-18019 callgraph-fingerprint = _temp1 (1)
function Et(tool, i) {
  return tool + i.tokens;
}
//@ chunk-10q8r8ck.js:18019-18054 fingerprint = _temp18 (1)
function Pt(t_4) {
  return t_4.isLoaded;
}
//@ chunk-10q8r8ck.js:18054-18089 layout = _temp18 (1)
function Ft(t_4) {
  return t_4.isLoaded;
}
//@ chunk-10q8r8ck.js:18089-18228 callgraph-fingerprint = _temp20 (0.333)
function renderMcpToolRow(section, i_5) {
  return e(
    TreeConnectors.Node,
    {
      children: r(Text, {
        children: [
          section.name,
          ":",
          " ",
          r(Text, { dimColor: !0, children: [formatTokens(section.tokens), " tokens"] }),
        ],
      }),
    },
    i_5,
  );
}
//@ chunk-10q8r8ck.js:18228-18263 layout = _temp18 (1)
function Ot(t_4) {
  return !t_4.isLoaded;
}
//@ chunk-10q8r8ck.js:18263-18298 layout = _temp18 (1)
function $t(t_4) {
  return !t_4.isLoaded;
}
//@ chunk-10q8r8ck.js:18298-18369 placement = createYogaLayoutNode (1)
function renderNamedNode(fs, xs) {
  return e(TreeConnectors.Node, { dimColor: !0, children: fs.name }, xs);
}
//@ chunk-10q8r8ck.js:18369-18508 callgraph-fingerprint = _temp27 (0.279)
function renderMcpToolDetailRow(attachment, i_10) {
  return e(
    TreeConnectors.Node,
    {
      children: r(Text, {
        children: [
          attachment.name,
          ":",
          " ",
          r(Text, { dimColor: !0, children: [formatTokens(attachment.tokens), " tokens"] }),
        ],
      }),
    },
    i_10,
  );
}
//@ chunk-10q8r8ck.js:18508-18547 callgraph-fingerprint = _temp13 (1)
function Yt(tool_1, i_1) {
  return tool_1 + i_1.tokens;
}
//@ chunk-10q8r8ck.js:18547-18691 fingerprint = _temp21 (0.492)
function renderAgentRow(agent, i_6) {
  return e(
    TreeConnectors.Node,
    {
      children: r(Text, {
        children: [
          agent.agentType,
          ":",
          " ",
          r(Text, { dimColor: !0, children: [formatTokens(agent.tokens), " tokens"] }),
        ],
      }),
    },
    i_6,
  );
}
//@ chunk-10q8r8ck.js:18691-18856 callgraph-fingerprint = _temp22 (0.346)
function renderAgentSourceGroup(t0) {
  let [ho, Ss] = t0;
  return r(
    Box,
    {
      flexDirection: "column",
      marginTop: 1,
      children: [
        e(Text, { dimColor: !0, children: ho }),
        e(TreeConnectors, { variant: "tree", children: Ss.map(renderAgentRow) }),
      ],
    },
    ho,
  );
}
//@ chunk-10q8r8ck.js:18856-18895 callgraph-fingerprint = _temp14 (1)
function Gt(tool_2, i_2) {
  return tool_2 + i_2.tokens;
}
//@ chunk-10q8r8ck.js:18895-19038 callgraph-fingerprint = _temp23 (0.333)
function renderMemoryFileRow(file, i_7) {
  return e(
    TreeConnectors.Node,
    {
      children: r(Text, {
        children: [
          getDisplayPath(file.path),
          ":",
          " ",
          r(Text, { dimColor: !0, children: [formatTokens(file.tokens), " tokens"] }),
        ],
      }),
    },
    i_7,
  );
}
//@ chunk-10q8r8ck.js:19038-19177 file-local
function renderSkillRow(skill, i_8) {
  return e(
    TreeConnectors.Node,
    {
      children: r(Text, {
        children: [
          skill.name,
          ":",
          " ",
          r(Text, { dimColor: !0, children: [formatTokenEstimate(skill.tokens), " tokens"] }),
        ],
      }),
    },
    i_8,
  );
}
//@ chunk-10q8r8ck.js:19177-19342 layout
function renderSkillSourceGroup(a) {
  let [Do, Ns] = a;
  return r(
    Box,
    {
      flexDirection: "column",
      marginTop: 1,
      children: [
        e(Text, { dimColor: !0, children: Do }),
        e(TreeConnectors, { variant: "tree", children: Ns.map(renderSkillRow) }),
      ],
    },
    Do,
  );
}
//@ chunk-10q8r8ck.js:19342-19430 fingerprint = SOURCE_DISPLAY_ORDER (0.815)
var v = "Autocompact buffer",
  Fo = ["Project", "User", CLAUDE_AI_SYNC_LABEL, "Managed", "Plugin", "MCP", "Built-in"];
/**
 * 按来源显示名（插件来源附插件名）分组并按 token 降序排序，组顺序按预设来源顺序，插件子组按名称排序，其余追加在后。
 */
//@ chunk-10q8r8ck.js:19430-19872 callgraph-fingerprint = _temp16 (0.386)
function groupBySourceDisplayName(a) {
  let o = new Map();
  for (let i of a) {
    let l =
        getSourceDisplayName(i.source) +
        (i.pluginName && i.source !== "syncedSkills" ? ` (${i.pluginName})` : ""),
      u = o.get(l) || [];
    (u.push(i), o.set(l, u));
  }
  for (let [i, l] of o.entries())
    o.set(
      i,
      l.sort((u, c) => c.tokens - u.tokens),
    );
  let m = new Map();
  for (let i of Fo) {
    let l = o.get(i);
    if (l) m.set(i, l);
    let sorted = [...o.keys()].filter((c) => c.startsWith(i + " (")).sort();
    for (let c of sorted) m.set(c, o.get(c));
  }
  for (let [i, l] of o) if (!m.has(i)) m.set(i, l);
  return m;
}
/**
 * 渲染折叠项摘要：数量加名词复数与 token 数。
 */
//@ chunk-10q8r8ck.js:19872-20229 layout
function CollapsedCountSummary(a) {
  let $ = w(9),
    { count: count, noun: noun, tokens: tokens } = a,
    u;
  if ($[0] !== count || $[1] !== noun) ((u = plural(count, noun)), ($[0] = count), ($[1] = noun), ($[2] = u));
  else u = $[2];
  let c;
  if ($[3] !== tokens) ((c = formatTokens(tokens)), ($[3] = tokens), ($[4] = c));
  else c = $[4];
  let x;
  if ($[5] !== count || $[6] !== u || $[7] !== c)
    ((x = e(TreeConnectors, {
      variant: "tree",
      children: r(TreeConnectors.Node, { dimColor: !0, children: [count, " ", u, " \xB7 ", c, " tokens"] }),
    })),
      ($[5] = count),
      ($[6] = u),
      ($[7] = c),
      ($[8] = x));
  else x = $[8];
  return x;
}
/**
 * /context：按类别统计估算 token（系统提示、系统工具、MCP 工具、自定义 agent、记忆文件、技能、消息、自动压缩缓冲、空闲），用彩色格子图与明细树显示。
 */
//@ chunk-10q8r8ck.js:20229-27146 fingerprint = ContextVisualization (0.419)
function ContextVisualization(t0) {
  let $ = w(129),
    { data: data, collapseDetailSections: collapseDetailSections } = t0,
    i = collapseDetailSections === void 0 ? !1 : collapseDetailSections,
    {
      categories: categories,
      totalTokens: totalTokens,
      rawMaxTokens: rawMaxTokens,
      autocompactSource: autocompactSource,
      percentage: percentage,
      gridRows: gridRows,
      model: model,
      memoryFiles: memoryFiles,
      mcpTools: mcpTools,
      deferredBuiltinTools: t1,
      systemTools: systemTools,
      systemPromptSections: systemPromptSections,
      agents: agents,
      skills: skills,
      messageBreakdown: messageBreakdown,
    } = data,
    po;
  if ($[0] !== t1) ((po = t1 === void 0 ? [] : t1), ($[0] = t1), ($[1] = po));
  else po = $[1];
  let ze = po,
    fe,
    xe,
    ke,
    ye,
    To,
    P,
    ee,
    oe,
    Ce,
    te,
    he,
    Be,
    Se,
    se,
    De,
    we,
    ne,
    ie,
    ve,
    Le,
    Ne,
    ae,
    le,
    ce;
  if (
    $[2] !== agents.length ||
    $[3] !== categories ||
    $[4] !== data ||
    $[5] !== ze.length ||
    $[6] !== gridRows ||
    $[7] !== mcpTools.length ||
    $[8] !== memoryFiles.length ||
    $[9] !== model ||
    $[10] !== percentage ||
    $[11] !== rawMaxTokens ||
    $[12] !== skills?.tokens ||
    $[13] !== totalTokens
  ) {
    let filtered = categories.filter(vt);
    let F;
    if ($[38] !== categories) ((F = categories.some(Lt)), ($[38] = categories), ($[39] = F));
    else F = $[39];
    P = F;
    To = ze.length > 0;
    let found = categories.find(Nt);
    let _;
    if ($[40] !== data) ((_ = contextOverflowNotice(data)), ($[40] = data), ($[41] = _));
    else _ = $[41];
    let Me = _;
    ye =
      mcpTools.length > 0 || agents.length > 0 || memoryFiles.length > 0 || (skills?.tokens ?? 0) > 0 || !1;
    ke = Box;
    De = "column";
    we = 1;
    if ($[42] === MEMO_CACHE_SENTINEL)
      ((ne = e(Text, { bold: !0, children: "Context Usage" })), ($[42] = ne));
    else ne = $[42];
    if ($[43] !== Me)
      ((ie = Me && e(Text, { color: "error", wrap: "wrap", children: Me })), ($[43] = Me), ($[44] = ie));
    else ie = $[44];
    xe = Box;
    Be = "row";
    Se = 2;
    let B;
    if ($[45] !== gridRows) ((B = gridRows.map(Mt)), ($[45] = gridRows), ($[46] = B));
    else B = $[46];
    if ($[47] !== B)
      ((se = e(Box, { flexDirection: "column", flexShrink: 0, children: B })), ($[47] = B), ($[48] = se));
    else se = $[48];
    fe = Box;
    ve = "column";
    Le = 0;
    Ne = 0;
    if ($[49] !== model)
      ((ae = getPublicModelDisplayName(model) && e(Text, { children: getPublicModelDisplayName(model) })),
        ($[49] = model),
        ($[50] = ae));
    else ae = $[50];
    if ($[51] !== model) ((le = e(Text, { dimColor: !0, children: model })), ($[51] = model), ($[52] = le));
    else le = $[52];
    let D;
    if ($[53] !== totalTokens) ((D = formatTokens(totalTokens)), ($[53] = totalTokens), ($[54] = D));
    else D = $[54];
    let N;
    if ($[55] !== rawMaxTokens) ((N = formatTokens(rawMaxTokens)), ($[55] = rawMaxTokens), ($[56] = N));
    else N = $[56];
    if ($[57] !== percentage || $[58] !== D || $[59] !== N)
      ((ce = r(Text, { dimColor: !0, children: [D, "/", N, " tokens (", percentage, "%)"] })),
        ($[57] = percentage),
        ($[58] = D),
        ($[59] = N),
        ($[60] = ce));
    else ce = $[60];
    if ($[61] === MEMO_CACHE_SENTINEL)
      ((ee = e(Text, { children: " " })),
        (oe = e(Text, { dimColor: !0, italic: !0, children: "Estimated usage by category" })),
        ($[61] = ee),
        ($[62] = oe));
    else ((ee = $[61]), (oe = $[62]));
    let z;
    if ($[63] !== rawMaxTokens)
      ((z = (cat_2, index) => {
        let tokenDisplay = formatTokens(cat_2.tokens);
        let Qt = cat_2.isDeferred ? "N/A" : `${((cat_2.tokens / rawMaxTokens) * 100).toFixed(1)}%`;
        let Zt = cat_2.name === v;
        let displayName = cat_2.name;
        let os = cat_2.isDeferred ? " " : Zt ? "\u26DD" : "\u26C1";
        return r(
          Box,
          {
            children: [
              e(Text, { color: cat_2.color, children: os }),
              r(Text, { children: [" ", displayName, ": "] }),
              r(Text, { dimColor: !0, children: [tokenDisplay, " tokens (", Qt, ")"] }),
            ],
          },
          index,
        );
      }),
        ($[63] = rawMaxTokens),
        ($[64] = z));
    else z = $[64];
    Ce = filtered.map(z);
    if ($[65] !== categories || $[66] !== rawMaxTokens)
      ((te =
        (categories.find(bt)?.tokens ?? 0) > 0 &&
        r(Box, {
          children: [
            e(Text, { dimColor: !0, children: "\u26F6" }),
            e(Text, { children: " Free space: " }),
            r(Text, {
              dimColor: !0,
              children: [
                formatTokens(categories.find(At)?.tokens || 0),
                " ",
                "(",
                (((categories.find(Rt)?.tokens || 0) / rawMaxTokens) * 100).toFixed(1),
                "%)",
              ],
            }),
          ],
        })),
        ($[65] = categories),
        ($[66] = rawMaxTokens),
        ($[67] = te));
    else te = $[67];
    he =
      found &&
      found.tokens > 0 &&
      r(Box, {
        children: [
          e(Text, { color: found.color, children: "\u26DD" }),
          r(Text, { dimColor: !0, children: [" ", found.name, ": "] }),
          r(Text, {
            dimColor: !0,
            children: [
              formatTokens(found.tokens),
              " tokens (",
              ((found.tokens / rawMaxTokens) * 100).toFixed(1),
              "%)",
            ],
          }),
        ],
      });
    (($[2] = agents.length),
      ($[3] = categories),
      ($[4] = data),
      ($[5] = ze.length),
      ($[6] = gridRows),
      ($[7] = mcpTools.length),
      ($[8] = memoryFiles.length),
      ($[9] = model),
      ($[10] = percentage),
      ($[11] = rawMaxTokens),
      ($[12] = skills?.tokens),
      ($[13] = totalTokens),
      ($[14] = fe),
      ($[15] = xe),
      ($[16] = ke),
      ($[17] = ye),
      ($[18] = To),
      ($[19] = P),
      ($[20] = ee),
      ($[21] = oe),
      ($[22] = Ce),
      ($[23] = te),
      ($[24] = he),
      ($[25] = Be),
      ($[26] = Se),
      ($[27] = se),
      ($[28] = De),
      ($[29] = we),
      ($[30] = ne),
      ($[31] = ie),
      ($[32] = ve),
      ($[33] = Le),
      ($[34] = Ne),
      ($[35] = ae),
      ($[36] = le),
      ($[37] = ce));
  } else
    ((fe = $[14]),
      (xe = $[15]),
      (ke = $[16]),
      (ye = $[17]),
      (To = $[18]),
      (P = $[19]),
      (ee = $[20]),
      (oe = $[21]),
      (Ce = $[22]),
      (te = $[23]),
      (he = $[24]),
      (Be = $[25]),
      (Se = $[26]),
      (se = $[27]),
      (De = $[28]),
      (we = $[29]),
      (ne = $[30]),
      (ie = $[31]),
      (ve = $[32]),
      (Le = $[33]),
      (Ne = $[34]),
      (ae = $[35]),
      (le = $[36]),
      (ce = $[37]));
  let F;
  if (
    $[68] !== fe ||
    $[69] !== ee ||
    $[70] !== oe ||
    $[71] !== Ce ||
    $[72] !== te ||
    $[73] !== he ||
    $[74] !== ve ||
    $[75] !== Le ||
    $[76] !== Ne ||
    $[77] !== ae ||
    $[78] !== le ||
    $[79] !== ce
  )
    ((F = r(fe, { flexDirection: ve, gap: Le, flexShrink: Ne, children: [ae, le, ce, ee, oe, Ce, te, he] })),
      ($[68] = fe),
      ($[69] = ee),
      ($[70] = oe),
      ($[71] = Ce),
      ($[72] = te),
      ($[73] = he),
      ($[74] = ve),
      ($[75] = Le),
      ($[76] = Ne),
      ($[77] = ae),
      ($[78] = le),
      ($[79] = ce),
      ($[80] = F));
  else F = $[80];
  let _;
  if ($[81] !== xe || $[82] !== Be || $[83] !== Se || $[84] !== se || $[85] !== F)
    ((_ = r(xe, { flexDirection: Be, gap: Se, children: [se, F] })),
      ($[81] = xe),
      ($[82] = Be),
      ($[83] = Se),
      ($[84] = se),
      ($[85] = F),
      ($[86] = _));
  else _ = $[86];
  let B;
  if ($[87] !== autocompactSource || $[88] !== rawMaxTokens)
    ((B =
      autocompactSource !== "auto" &&
      r(Box, {
        marginTop: 1,
        children: [
          e(Text, { bold: !0, children: "Auto-compact window: " }),
          e(Text, {
            dimColor: !0,
            children:
              autocompactSource === "experiment" || autocompactSource === "clientdata"
                ? `auto (${formatTokens(rawMaxTokens)} tokens)`
                : autocompactSource === "unknown-model"
                  ? `${formatTokens(rawMaxTokens)} tokens (default for an unrecognized model)`
                  : `${formatTokens(rawMaxTokens)} tokens`,
          }),
        ],
      })),
      ($[87] = autocompactSource),
      ($[88] = rawMaxTokens),
      ($[89] = B));
  else B = $[89];
  let D;
  if ($[90] !== i || $[91] !== P || $[92] !== mcpTools)
    ((D =
      mcpTools.length > 0 &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          r(Box, {
            children: [
              e(Text, { bold: !0, children: "MCP tools" }),
              r(Text, { dimColor: !0, children: [" ", "\xB7 /mcp", P ? " (loaded on-demand)" : ""] }),
            ],
          }),
          i
            ? e(CollapsedCountSummary, {
                count: mcpTools.length,
                noun: "tool",
                tokens: mcpTools.filter((ts) => !P || ts.isLoaded).reduce(Et, 0),
              })
            : r(Fragment, {
                children: [
                  mcpTools.some(Pt) &&
                    r(Box, {
                      flexDirection: "column",
                      marginTop: 1,
                      children: [
                        e(Text, { dimColor: !0, children: "Loaded" }),
                        e(TreeConnectors, {
                          variant: "tree",
                          children: mcpTools.filter(Ft).map(renderMcpToolRow),
                        }),
                      ],
                    }),
                  P &&
                    mcpTools.some(Ot) &&
                    r(Box, {
                      flexDirection: "column",
                      marginTop: 1,
                      children: [
                        e(Text, { dimColor: !0, children: "Available" }),
                        e(TreeConnectors, {
                          variant: "tree",
                          children: mcpTools.filter($t).map(renderNamedNode),
                        }),
                      ],
                    }),
                  !P &&
                    e(TreeConnectors, { variant: "tree", children: mcpTools.map(renderMcpToolDetailRow) }),
                ],
              }),
        ],
      })),
      ($[90] = i),
      ($[91] = P),
      ($[92] = mcpTools),
      ($[93] = D));
  else D = $[93];
  const N = ((systemTools && systemTools.length > 0) || To) && !1,
    z = systemPromptSections && systemPromptSections.length > 0 && !1;
  let be;
  if ($[94] !== agents || $[95] !== i)
    ((be =
      agents.length > 0 &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          r(Box, {
            children: [
              e(Text, { bold: !0, children: "Custom agents" }),
              e(Text, { dimColor: !0, children: " \xB7 .claude/agents/" }),
            ],
          }),
          i
            ? e(CollapsedCountSummary, { count: agents.length, noun: "agent", tokens: agents.reduce(Yt, 0) })
            : Array.from(groupBySourceDisplayName(agents).entries()).map(renderAgentSourceGroup),
        ],
      })),
      ($[94] = agents),
      ($[95] = i),
      ($[96] = be));
  else be = $[96];
  let Ae;
  if ($[97] !== i || $[98] !== memoryFiles)
    ((Ae =
      memoryFiles.length > 0 &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          r(Box, {
            children: [
              e(Text, { bold: !0, children: "Memory files" }),
              e(Text, { dimColor: !0, children: " \xB7 /memory" }),
            ],
          }),
          i
            ? e(CollapsedCountSummary, {
                count: memoryFiles.length,
                noun: "file",
                tokens: memoryFiles.reduce(Gt, 0),
              })
            : e(TreeConnectors, { variant: "tree", children: memoryFiles.map(renderMemoryFileRow) }),
        ],
      })),
      ($[97] = i),
      ($[98] = memoryFiles),
      ($[99] = Ae));
  else Ae = $[99];
  let Re;
  if ($[100] !== i || $[101] !== skills)
    ((Re =
      skills &&
      skills.tokens > 0 &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          r(Box, {
            children: [
              e(Text, { bold: !0, children: "Skills" }),
              e(Text, { dimColor: !0, children: " \xB7 /skills" }),
            ],
          }),
          i
            ? e(CollapsedCountSummary, {
                count: skills.skillFrontmatter.length,
                noun: "skill",
                tokens: skills.tokens,
              })
            : Array.from(groupBySourceDisplayName(skills.skillFrontmatter).entries()).map(
                renderSkillSourceGroup,
              ),
        ],
      })),
      ($[100] = i),
      ($[101] = skills),
      ($[102] = Re));
  else Re = $[102];
  const je = messageBreakdown && !1;
  let Ee;
  if ($[103] !== i || $[104] !== ye)
    ((Ee =
      i &&
      ye &&
      e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: "/context all to expand" }) })),
      ($[103] = i),
      ($[104] = ye),
      ($[105] = Ee));
  else Ee = $[105];
  let Pe;
  if (
    $[106] !== B ||
    $[107] !== D ||
    $[108] !== N ||
    $[109] !== z ||
    $[110] !== be ||
    $[111] !== Ae ||
    $[112] !== Re ||
    $[113] !== je ||
    $[114] !== Ee
  )
    ((Pe = r(Box, { flexDirection: "column", marginLeft: -1, children: [B, D, N, z, be, Ae, Re, je, Ee] })),
      ($[106] = B),
      ($[107] = D),
      ($[108] = N),
      ($[109] = z),
      ($[110] = be),
      ($[111] = Ae),
      ($[112] = Re),
      ($[113] = je),
      ($[114] = Ee),
      ($[115] = Pe));
  else Pe = $[115];
  let _e;
  if ($[116] !== data) ((_e = generateContextSuggestions(data)), ($[116] = data), ($[117] = _e));
  else _e = $[117];
  let $e;
  if ($[118] !== _e) (($e = e(ContextSuggestions, { suggestions: _e })), ($[118] = _e), ($[119] = $e));
  else $e = $[119];
  let fo;
  if (
    $[120] !== ke ||
    $[121] !== De ||
    $[122] !== we ||
    $[123] !== ne ||
    $[124] !== ie ||
    $[125] !== _ ||
    $[126] !== Pe ||
    $[127] !== $e
  )
    ((fo = r(ke, { flexDirection: De, paddingLeft: we, children: [ne, ie, _, Pe, $e] })),
      ($[120] = ke),
      ($[121] = De),
      ($[122] = we),
      ($[123] = ne),
      ($[124] = ie),
      ($[125] = _),
      ($[126] = Pe),
      ($[127] = $e),
      ($[128] = fo));
  else fo = $[128];
  return fo;
}
//@ chunk-ag5x7vhf.js:25016-25130 placement
function renderScrollTestLine(k, _) {
  return r(
    Text,
    { dimColor: !0, children: ["  ", k.num, k.text && r(Fragment, { children: ["  ", k.indent, k.text] })] },
    _,
  );
}
//@ chunk-ag5x7vhf.js:25130-25141 placement
var ch = 200;
/**
 * 全屏布局里的"scroll test"占位区块：生成固定行数的拉丁文编号行，用于测试滚动，关闭对话框后消失。
 */
//@ chunk-ag5x7vhf.js:25247-25541 fingerprint = _temp25 (0.357)
function ScrollTestFiller() {
  let $ = w(2),
    h;
  if ($[0] === MEMO_CACHE_SENTINEL) ((h = buildScrollTestLines(ch)), ($[0] = h));
  else h = $[0];
  let x = h,
    T;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((T = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        e(Text, {
          dimColor: !0,
          children: "\u2500\u2500 scroll test \u2014 disappears when you close the dialog \u2500\u2500",
        }),
        x.map(renderScrollTestLine),
      ],
    })),
      ($[1] = T));
  else T = $[1];
  return T;
}
/**
 * 滚动测试用的拉丁文填充文本。
 */
//@ chunk-ag5x7vhf.js:25541-27152 sole-consumer
var SCROLL_TEST_LOREM =
    "Vivere omnes beate volunt sed ad pervidendum quid sit quod beatam vitam efficiat caligant et adeo non est facile consequi beatam vitam ut eo quisque ab ea longius recedat quo ad illam concitatius fertur si via lapsus est quae ubi in contrarium ducit ipsa velocitas maioris intervalli causa fit proponendum est itaque primum quid sit quod adpetamus tunc circumspiciendum qua contendere illo celerrime possimus intellecturi in ipso itinere si modo rectum erit quantum cotidie profligetur quantoque propius ab eo simus ad quod nos cupiditas naturalis inpellit quam diu quidem passim vagamur non ducem secuti sed fremitum et clamorem dissonum in diversa vocantium conteretur vita inter errores brevis etiam si dies noctesque bonae menti laboremus decernatur itaque et quo tendamus et qua non sine perito aliquo cui explorata sint ea in quae procedimus quoniam quidem non eadem hic quae in ceteris peregrinationibus condicio est in illis comprensus aliquis limes et interrogati incolae non patiuntur errare at hic tritissima quaeque via et celeberrima maxime decipit nihil ergo magis praestandum est quam ne pecorum ritu sequamur antecedentium gregem pergentes non quo eundum est sed quo itur atqui nulla res nos maioribus malis implicat quam quod ad rumorem componimur optima rati ea quae magno adsensu recepta sunt quodque exempla nobis pro bonis multa sunt nec ad rationem sed ad similitudinem vivimus ",
  SCROLL_TEST_LINE_WIDTH = 56,
  SCROLL_TEST_PARAGRAPH_SHAPES = [
    { lines: 1, indent: 0 },
    { lines: 5, indent: 0 },
    { lines: 3, indent: 2 },
    { lines: 2, indent: 0 },
    { lines: 7, indent: 0 },
    { lines: 4, indent: 2 },
    { lines: 1, indent: 0 },
    { lines: 6, indent: 0 },
    { lines: 2, indent: 2 },
    { lines: 3, indent: 0 },
  ];
/**
 * 用填充文本生成指定行数的滚动测试行，每行带行号。
 */
//@ chunk-ag5x7vhf.js:27152-27597 sole-consumer
function buildScrollTestLines(m) {
  let parts = SCROLL_TEST_LOREM.trim().split(/\s+/),
    x = String(m).length,
    T = [],
    k = 0,
    _ = 0;
  while (T.length < m) {
    let I = SCROLL_TEST_PARAGRAPH_SHAPES[_ % SCROLL_TEST_PARAGRAPH_SHAPES.length];
    _++;
    let repeat = " ".repeat(I.indent);
    for (let A = 0; A < I.lines && T.length < m; A++) {
      let V = A === I.lines - 1 ? 12 + ((_ * 11) % 28) : SCROLL_TEST_LINE_WIDTH,
        W = [],
        z = 0;
      while (z < V) {
        let K = parts[k % parts.length];
        (W.push(K), (z += K.length + 1), k++);
      }
      T.push({ num: String(T.length + 1).padStart(x), text: W.join(" "), indent: repeat });
    }
    if (T.length < m) T.push({ num: String(T.length + 1).padStart(x), text: "", indent: "" });
  }
  return T;
}
//@ chunk-e6aww6q8.js:3505549-3505608 fingerprint = groupBySource (0.692)
var groupBySource = new HostScoped(() => ({ tokens: new WeakMap(), next: 0, host: randomUUID_11() }));

export { ContextVisualization, groupBySource, ScrollTestFiller };
