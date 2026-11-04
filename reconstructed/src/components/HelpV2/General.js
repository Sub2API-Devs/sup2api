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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { PromptInputHelpMenu } from "../PromptInput/PromptInputHelpMenu.js";

//@ chunk-yxcx2jtr.js:15530-15540 affinity
var GENERAL_COLUMN_WIDTH = 44;
//@ chunk-yxcx2jtr.js:15540-16345 callgraph-witnessed = General (0.291)
function General() {
  let $ = useMemoCache(8);
  let { rows } = useTerminalSize();
  let isNarrow = rows < GENERAL_COLUMN_WIDTH;
  const paddingY = isNarrow ? 0 : 1;
  const gap = isNarrow ? 0 : 1;
  let introText;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(Text, {
        children:
          "Claude understands your codebase, makes edits with your permission, and executes commands \u2014 right from your terminal.",
      }),
    });
    $[0] = introText;
  } else introText = $[0];
  let powerupHint;
  if ($[1] !== isNarrow) {
    powerupHint =
      !isNarrow &&
      jsxProd_default(Box, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "New here? Run ",
            jsxProd_default(Text, {
              color: "suggestion",
              children: "/powerup",
            }),
            " to learn the features most people miss.",
          ],
        }),
      });
    $[1] = isNarrow;
    $[2] = powerupHint;
  } else powerupHint = $[2];
  let shortcutsBox;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    shortcutsBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default(Text, {
            bold: true,
            children: "Shortcuts",
          }),
        }),
        jsxProd_default(PromptInputHelpMenu, {
          gap: 2,
          fixedWidth: true,
        }),
      ],
    });
    $[3] = shortcutsBox;
  } else shortcutsBox = $[3];
  let page;
  if ($[4] !== paddingY || $[5] !== gap || $[6] !== powerupHint) {
    page = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingY,
      gap,
      children: [introText, powerupHint, shortcutsBox],
    });
    $[4] = paddingY;
    $[5] = gap;
    $[6] = powerupHint;
    $[7] = page;
  } else page = $[7];
  return page;
}
export { General };
