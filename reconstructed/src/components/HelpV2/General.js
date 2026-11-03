/**
 * components/HelpV2/General.tsx
 *
 * /help 的概览标签页（产品简介、/powerup 入门提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HelpV2/General.tsx
 * pieces: chunk-yxcx2jtr.js (2)
 * attribution: affinity 1, callgraph-witnessed 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { PromptInputHelpMenu } from "../PromptInput/PromptInputHelpMenu.js";

//@ chunk-yxcx2jtr.js:15530-15540 affinity
var ne = 44;
//@ chunk-yxcx2jtr.js:15540-16345 callgraph-witnessed = General (0.291)
function General() {
  let $ = w(8),
    { rows: rows } = useTerminalSize(),
    a = rows < ne;
  const t = a ? 0 : 1,
    i = a ? 0 : 1;
  let m;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((m = e(Box, {
      flexShrink: 0,
      children: e(Text, {
        children:
          "Claude understands your codebase, makes edits with your permission, and executes commands \u2014 right from your terminal.",
      }),
    })),
      ($[0] = m));
  else m = $[0];
  let o;
  if ($[1] !== a)
    ((o =
      !a &&
      e(Box, {
        children: r(Text, {
          dimColor: !0,
          children: [
            "New here? Run ",
            e(Text, { color: "suggestion", children: "/powerup" }),
            " to learn the features most people miss.",
          ],
        }),
      })),
      ($[1] = a),
      ($[2] = o));
  else o = $[2];
  let l;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((l = r(Box, {
      flexDirection: "column",
      children: [
        e(Box, { flexShrink: 0, children: e(Text, { bold: !0, children: "Shortcuts" }) }),
        e(PromptInputHelpMenu, { gap: 2, fixedWidth: !0 }),
      ],
    })),
      ($[3] = l));
  else l = $[3];
  let u;
  if ($[4] !== t || $[5] !== i || $[6] !== o)
    ((u = r(Box, { flexDirection: "column", paddingY: t, gap: i, children: [m, o, l] })),
      ($[4] = t),
      ($[5] = i),
      ($[6] = o),
      ($[7] = u));
  else u = $[7];
  return u;
}

export { General };
