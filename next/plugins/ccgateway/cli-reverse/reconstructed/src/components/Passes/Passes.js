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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TEARDROP_ASTERISK } from "../../constants/figures.js";

//@ chunk-aa3cndeh.js:9694-10490 fingerprint (2.1.88 match: Passes, 0.499)
function Passes(props) {
  let $ = useMemoCache(3);
  let { pass } = props;
  if (!pass.isAvailable) {
    let boxElement;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      boxElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginRight: 1,
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2571",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: ` ) CC ${TEARDROP_ASTERISK} \u250A\u2571`,
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2571",
          }),
        ],
      });
      $[0] = boxElement;
    } else boxElement = $[0];
    return boxElement;
  }
  let textElement;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      children: "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
    });
    $[1] = textElement;
  } else textElement = $[1];
  let contentElement;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    contentElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginRight: 1,
      children: [
        textElement,
        jsxProd_default_2(Text, {
          children: [
            " ) CC ",
            jsxProd_default(Text, {
              color: "claude",
              children: TEARDROP_ASTERISK,
            }),
            " \u250A ( ",
          ],
        }),
        jsxProd_default(Text, {
          children: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
        }),
      ],
    });
    $[2] = contentElement;
  } else contentElement = $[2];
  return contentElement;
}
export { Passes };
