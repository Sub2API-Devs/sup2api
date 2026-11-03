/**
 * components/messages/AssistantThinkingMessage.tsx
 *
 * 思考块：默认折叠为 "✻ Thinking…"，transcript/verbose 下显示全文（HighlightedThinkingText）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantThinkingMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { stripMemoryTags } from "../../services/orgMemory/promptIndex.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { THEREFORE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-ah34pb7m.js:63074-64176 fingerprint = AssistantThinkingMessage (0.517)
/**
 * 思考块：非 verbose/transcript 时显示 "✻ Thinking…"（可 ctrl+o 展开），否则显示全文。
 */
function AssistantThinkingMessage(props) {
  let $ = w(27);
  let { param, addMargin, isTranscriptMode, verbose } = props;
  let { thinking } = param;
  let M = addMargin === undefined ? false : addMargin;
  let x;
  let k;
  let b;
  let flexDirection;
  let flexGrow;
  let children;
  let flexDirection_2;
  let marginTop;
  let width;
  let K;
  if ($[0] !== M || $[1] !== isTranscriptMode || $[2] !== thinking || $[3] !== verbose) {
    b = EARLY_RETURN_SENTINEL;
    Y: {
      let V = stripMemoryTags(thinking);
      if (!V) {
        b = null;
        break Y;
      }
      let X = isTranscriptMode || verbose;
      k = Box;
      flexDirection_2 = "row";
      marginTop = M ? 1 : 0;
      width = "100%";
      if ($[14] === MEMO_CACHE_SENTINEL) {
        K = jsxProd_default(Box, {
          minWidth: 2,
          children: jsxProd_default(Text, {
            "aria-label": "thinking:",
            dimColor: true,
            italic: true,
            children: THEREFORE,
          }),
        });
        $[14] = K;
      } else K = $[14];
      x = Box;
      flexDirection = "column";
      flexGrow = 1;
      children = X
        ? jsxProd_default(MarkdownText_2, {
            dimColor: true,
            capProseWidth: true,
            children: V.trim(),
          })
        : jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: V.trim().replace(/\s+/g, " "),
          });
    }
    $[0] = M;
    $[1] = isTranscriptMode;
    $[2] = thinking;
    $[3] = verbose;
    $[4] = x;
    $[5] = k;
    $[6] = b;
    $[7] = flexDirection;
    $[8] = flexGrow;
    $[9] = children;
    $[10] = flexDirection_2;
    $[11] = marginTop;
    $[12] = width;
    $[13] = K;
  } else {
    x = $[4];
    k = $[5];
    b = $[6];
    flexDirection = $[7];
    flexGrow = $[8];
    children = $[9];
    flexDirection_2 = $[10];
    marginTop = $[11];
    width = $[12];
    K = $[13];
  }
  if (b !== EARLY_RETURN_SENTINEL) return b;
  let z;
  if ($[15] !== x || $[16] !== flexDirection || $[17] !== flexGrow || $[18] !== children) {
    z = jsxProd_default(x, {
      flexDirection,
      flexGrow,
      children,
    });
    $[15] = x;
    $[16] = flexDirection;
    $[17] = flexGrow;
    $[18] = children;
    $[19] = z;
  } else z = $[19];
  let ee;
  if (
    $[20] !== k ||
    $[21] !== z ||
    $[22] !== flexDirection_2 ||
    $[23] !== marginTop ||
    $[24] !== width ||
    $[25] !== K
  ) {
    ee = jsxProd_default_2(k, {
      flexDirection: flexDirection_2,
      marginTop,
      width,
      children: [K, z],
    });
    $[20] = k;
    $[21] = z;
    $[22] = flexDirection_2;
    $[23] = marginTop;
    $[24] = width;
    $[25] = K;
    $[26] = ee;
  } else ee = $[26];
  return ee;
}
export { AssistantThinkingMessage };
