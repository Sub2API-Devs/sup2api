/**
 * components/mcp/MCPToolDetailView.tsx
 *
 * MCP 工具详情：描述、参数 schema、只读/破坏性标注。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPToolDetailView.tsx
 * pieces: chunk-vrb44rx7.js (4)
 * attribution: callgraph-fingerprint 1, placement 1, layout 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Text, Box } from "../../ink/components/Text.js";
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { getMcpDisplayName, extractMcpToolDisplayName } from "../../services/mcp/mcpStringUtils.js";
import { TB } from "../../services/mcp/mcpTimeouts.js";
import { isDeferredTool } from "../../tools/ToolSearchTool/prompt.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { truncateWithCount } from "../../utils/stringUtils.js";
import { BulletRow } from "../design-system/BulletRow.js";
import { ParenHint } from "../diff/DiffDetailView.js";
import { Dialog } from "../design-system/Dialog.js";

/**
 * 返回提示：等待二次按键时“再按一次返回”，否则显示 Esc 返回快捷键。
 */
//@ chunk-vrb44rx7.js:26449-26810 callgraph-fingerprint = _temp (0.594)
function BackHint(exitState) {
  let $ = w(5),
    { exitState: exitState_2 } = exitState,
    C;
  if ($[0] !== exitState_2.keyName || $[1] !== exitState_2.pending)
    ((C = exitState_2.pending
      ? `Press ${exitState_2.keyName} again to go back`
      : e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "back",
        })),
      ($[0] = exitState_2.keyName),
      ($[1] = exitState_2.pending),
      ($[2] = C));
  else C = $[2];
  let x;
  if ($[3] !== C) ((x = e(Text, { dimColor: !0, italic: !0, children: C })), ($[3] = C), ($[4] = x));
  else x = $[4];
  return x;
}
//@ chunk-vrb44rx7.js:30172-30176 placement
j();
//@ chunk-vrb44rx7.js:30176-30195 layout
var jc = 1000,
  Vc = 200;
//@ chunk-vrb44rx7.js:30195-33767 fingerprint = MCPToolDetailView (0.553)
function MCPToolDetailView(t0) {
  let $ = w(50),
    { tool: tool, server: server, onBack: onBack } = t0,
    [x, T] = y(""),
    U,
    L;
  if ($[0] !== server.name || $[1] !== tool) {
    L = getMcpDisplayName(tool.name, server.name);
    let fullDisplayName = tool.userFacingName ? tool.userFacingName({}) : L;
    U = extractMcpToolDisplayName(fullDisplayName);
    (($[0] = server.name), ($[1] = tool), ($[2] = U), ($[3] = L));
  } else ((U = $[2]), (L = $[3]));
  let K = U,
    V;
  if ($[4] !== tool) ((V = tool.isReadOnly?.({}) ?? !1), ($[4] = tool), ($[5] = V));
  else V = $[5];
  let B = V,
    _;
  if ($[6] !== tool) ((_ = tool.isDestructive?.({}) ?? !1), ($[6] = tool), ($[7] = _));
  else _ = $[7];
  let J = _,
    pe;
  if ($[8] !== tool) ((pe = tool.isOpenWorld?.({}) ?? !1), ($[8] = tool), ($[9] = pe));
  else pe = $[9];
  let fe = pe,
    me = TB(server.config),
    ne;
  if ($[10] !== server.config || $[11] !== tool)
    ((ne = TB(server.config, isDeferredTool(tool))), ($[10] = server.config), ($[11] = tool), ($[12] = ne));
  else ne = $[12];
  let he = ne,
    W,
    Oe;
  if ($[13] !== tool)
    ((W = () => {
      let loadDescription = async function et() {
        try {
          let desc = await tool.description(
            {},
            {
              isNonInteractiveSession: !1,
              toolPermissionContext: {
                mode: "default",
                additionalWorkingDirectories: new Map(),
                alwaysAllowRules: {},
                alwaysDenyRules: {},
                alwaysAskRules: {},
                isBypassPermissionsModeAvailable: !1,
                mcpPermissionModeOverrides: {},
              },
              tools: [],
            },
          );
          T(desc);
        } catch {
          T("Failed to load description");
        }
      };
      loadDescription();
    }),
      (Oe = [tool]),
      ($[13] = tool),
      ($[14] = W),
      ($[15] = Oe));
  else ((W = $[14]), (Oe = $[15]));
  P(W, Oe);
  let je;
  if ($[16] !== B)
    ((je = B && e(Text, { color: "success", children: " [read-only]" })), ($[16] = B), ($[17] = je));
  else je = $[17];
  let ae;
  if ($[18] !== J)
    ((ae = J && e(Text, { color: "error", children: " [destructive]" })), ($[18] = J), ($[19] = ae));
  else ae = $[19];
  let Se;
  if ($[20] !== fe)
    ((Se = fe && e(Text, { dimColor: !0, children: " [open-world]" })), ($[20] = fe), ($[21] = Se));
  else Se = $[21];
  let kt;
  if ($[22] !== K || $[23] !== Se || $[24] !== je || $[25] !== ae)
    ((kt = r(Fragment, { children: [K, je, ae, Se] })),
      ($[22] = K),
      ($[23] = Se),
      ($[24] = je),
      ($[25] = ae),
      ($[26] = kt));
  else kt = $[26];
  let Tt = kt;
  const Ke = server.name;
  let Et;
  if ($[27] === MEMO_CACHE_SENTINEL)
    ((Et = e(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "go back",
    })),
      ($[27] = Et));
  else Et = $[27];
  let He;
  if ($[28] === MEMO_CACHE_SENTINEL) ((He = e(Text, { bold: !0, children: "Tool name: " })), ($[28] = He));
  else He = $[28];
  let ct;
  if ($[29] !== L)
    ((ct = r(Box, { children: [He, e(Text, { dimColor: !0, children: L })] })), ($[29] = L), ($[30] = ct));
  else ct = $[30];
  let Ct;
  if ($[31] === MEMO_CACHE_SENTINEL) ((Ct = e(Text, { bold: !0, children: "Full name: " })), ($[31] = Ct));
  else Ct = $[31];
  let oe;
  if ($[32] !== tool.name)
    ((oe = r(Box, { children: [Ct, e(Text, { dimColor: !0, children: tool.name })] })),
      ($[32] = tool.name),
      ($[33] = oe));
  else oe = $[33];
  let ft;
  if ($[34] !== he || $[35] !== me || $[36] !== x)
    ((ft =
      x &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          e(Text, { bold: !0, children: "Description:" }),
          e(Text, { wrap: "wrap", children: truncateWithCount(x, Math.min(jc, me)) }),
          x.length > me &&
            r(Text, {
              dimColor: !0,
              children: [
                "The model receives only about the first ",
                me,
                " ",
                "characters",
                he > me && `, or ${he} once the model loads the tool through tool search`,
                ".",
              ],
            }),
        ],
      })),
      ($[34] = he),
      ($[35] = me),
      ($[36] = x),
      ($[37] = ft));
  else ft = $[37];
  let at;
  if ($[38] !== tool.inputJSONSchema)
    ((at =
      tool.inputJSONSchema &&
      tool.inputJSONSchema.properties &&
      Object.keys(tool.inputJSONSchema.properties).length > 0 &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          e(Text, { bold: !0, children: "Parameters:" }),
          e(Box, {
            marginLeft: 2,
            flexDirection: "column",
            children: Object.entries(tool.inputJSONSchema.properties).map((t17) => {
              let [an, Yt] = t17;
              let isRequired = tool.inputJSONSchema?.required?.includes(an);
              return r(
                BulletRow,
                {
                  children: [
                    an,
                    e(ParenHint, { when: isRequired ?? !1, children: "required" }),
                    ":",
                    " ",
                    e(Text, {
                      dimColor: !0,
                      children: typeof Yt === "object" && Yt && "type" in Yt ? String(Yt.type) : "unknown",
                    }),
                    typeof Yt === "object" &&
                      Yt &&
                      "description" in Yt &&
                      r(Text, {
                        dimColor: !0,
                        children: [" - ", truncateWithCount(String(Yt.description), Vc)],
                      }),
                  ],
                },
                an,
              );
            }),
          }),
        ],
      })),
      ($[38] = tool.inputJSONSchema),
      ($[39] = at));
  else at = $[39];
  let Ot;
  if ($[40] !== ct || $[41] !== oe || $[42] !== ft || $[43] !== at)
    ((Ot = r(Box, { flexDirection: "column", children: [ct, oe, ft, at] })),
      ($[40] = ct),
      ($[41] = oe),
      ($[42] = ft),
      ($[43] = at),
      ($[44] = Ot));
  else Ot = $[44];
  let qe;
  if ($[45] !== onBack || $[46] !== server.name || $[47] !== Ot || $[48] !== Tt)
    ((qe = e(Dialog, { title: Tt, subtitle: Ke, onCancel: onBack, inputGuide: Et, children: Ot })),
      ($[45] = onBack),
      ($[46] = server.name),
      ($[47] = Ot),
      ($[48] = Tt),
      ($[49] = qe));
  else qe = $[49];
  return qe;
}

export { MCPToolDetailView, BackHint };
