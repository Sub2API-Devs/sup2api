/**
 * components/messages/AssistantThinkingMessage.tsx
 *
 * 思考块：默认折叠为 "✻ Thinking…"，transcript/verbose 下显示全文（HighlightedThinkingText）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantThinkingMessage.tsx
 * pieces: chunk-wjygkcr4.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { stripMemoryTags } from "../../services/orgMemory/promptIndex.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { THEREFORE } from "../../constants/figures.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-wjygkcr4.js:63695-64794 fingerprint (2.1.88 match: AssistantThinkingMessage, 0.516)
/**
 * 思考块：非 verbose/transcript 时显示 "✻ Thinking…"（可 ctrl+o 展开），否则显示全文。
 */
function AssistantThinkingMessage(props) {
  let $ = useMemoCache(27);
  let { param, addMargin, isTranscriptMode, verbose } = props;
  let { thinking } = param;
  let withMargin = addMargin === undefined ? false : addMargin;
  let containerComponent;
  let rowComponent;
  let resultElement;
  let flexDirection;
  let flexGrow;
  let children;
  let flexDirection_2;
  let marginTop;
  let width;
  let boxElement;
  if ($[0] !== withMargin || $[1] !== isTranscriptMode || $[2] !== thinking || $[3] !== verbose) {
    resultElement = EARLY_RETURN_SENTINEL;
    K: {
      let stripped = stripMemoryTags(thinking);
      if (!stripped) {
        resultElement = null;
        break K;
      }
      let isExpanded = isTranscriptMode || verbose;
      rowComponent = Box;
      flexDirection_2 = "row";
      marginTop = withMargin ? 1 : 0;
      width = "100%";
      if ($[14] === MEMO_CACHE_SENTINEL) {
        boxElement = jsxProd_default(Box, {
          minWidth: 2,
          children: jsxProd_default(Text, {
            "aria-label": "thinking:",
            dimColor: true,
            italic: true,
            children: THEREFORE,
          }),
        });
        $[14] = boxElement;
      } else boxElement = $[14];
      containerComponent = Box;
      flexDirection = "column";
      flexGrow = 1;
      children = isExpanded
        ? jsxProd_default(MarkdownText_2, {
            dimColor: true,
            capProseWidth: true,
            children: stripped.trim(),
          })
        : jsxProd_default(Text, {
            dimColor: true,
            italic: true,
            children: stripped.trim().replace(/\s+/g, " "),
          });
    }
    $[0] = withMargin;
    $[1] = isTranscriptMode;
    $[2] = thinking;
    $[3] = verbose;
    $[4] = containerComponent;
    $[5] = rowComponent;
    $[6] = resultElement;
    $[7] = flexDirection;
    $[8] = flexGrow;
    $[9] = children;
    $[10] = flexDirection_2;
    $[11] = marginTop;
    $[12] = width;
    $[13] = boxElement;
  } else {
    containerComponent = $[4];
    rowComponent = $[5];
    resultElement = $[6];
    flexDirection = $[7];
    flexGrow = $[8];
    children = $[9];
    flexDirection_2 = $[10];
    marginTop = $[11];
    width = $[12];
    boxElement = $[13];
  }
  if (resultElement !== EARLY_RETURN_SENTINEL) return resultElement;
  let containerComponentElement;
  if ($[15] !== containerComponent || $[16] !== flexDirection || $[17] !== flexGrow || $[18] !== children) {
    containerComponentElement = jsxProd_default(containerComponent, {
      flexDirection,
      flexGrow,
      children,
    });
    $[15] = containerComponent;
    $[16] = flexDirection;
    $[17] = flexGrow;
    $[18] = children;
    $[19] = containerComponentElement;
  } else containerComponentElement = $[19];
  let rowComponentElement;
  if (
    $[20] !== rowComponent ||
    $[21] !== containerComponentElement ||
    $[22] !== flexDirection_2 ||
    $[23] !== marginTop ||
    $[24] !== width ||
    $[25] !== boxElement
  ) {
    rowComponentElement = jsxProd_default_2(rowComponent, {
      flexDirection: flexDirection_2,
      marginTop,
      width,
      children: [boxElement, containerComponentElement],
    });
    $[20] = rowComponent;
    $[21] = containerComponentElement;
    $[22] = flexDirection_2;
    $[23] = marginTop;
    $[24] = width;
    $[25] = boxElement;
    $[26] = rowComponentElement;
  } else rowComponentElement = $[26];
  return rowComponentElement;
}
export { AssistantThinkingMessage };
