/**
 * components/Passes/Passes.tsx
 *
 * /passes 访客通行证卡片 ASCII 图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Passes/Passes.tsx
 * pieces: chunk-aa3cndeh.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TEARDROP_ASTERISK } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-aa3cndeh.js:9694-10490 fingerprint = Passes (0.499)
function Passes(g) {
  let $ = w(3),
    { pass: pass } = g;
  if (!pass.isAvailable) {
    let l;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((l = r(Box, {
        flexDirection: "column",
        marginRight: 1,
        children: [
          e(Text, {
            dimColor: !0,
            children: "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2571",
          }),
          e(Text, { dimColor: !0, children: ` ) CC ${TEARDROP_ASTERISK} \u250A\u2571` }),
          e(Text, { dimColor: !0, children: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2571" }),
        ],
      })),
        ($[0] = l));
    else l = $[0];
    return l;
  }
  let l;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((l = e(Text, { children: "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510" })),
      ($[1] = l));
  else l = $[1];
  let m;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((m = r(Box, {
      flexDirection: "column",
      marginRight: 1,
      children: [
        l,
        r(Text, {
          children: [" ) CC ", e(Text, { color: "claude", children: TEARDROP_ASTERISK }), " \u250A ( "],
        }),
        e(Text, { children: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518" }),
      ],
    })),
      ($[2] = m));
  else m = $[2];
  return m;
}

export { Passes };
