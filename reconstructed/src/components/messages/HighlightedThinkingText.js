/**
 * components/messages/HighlightedThinkingText.tsx
 *
 * 思考文本渲染（关键词高亮、读屏 aria-label）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/HighlightedThinkingText.tsx
 * pieces: chunk-j64mp9kq.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useQueuedMessageContext } from "../../context/QueuedMessageContext.js";
import { isShortSiteText } from "./UserMessageSite.js";
import { formatBriefTimestamp } from "../../utils/formatBriefTimestamp.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { CollapsedLinesDivider, UltrathinkHighlightedText } from "./CollapsedLines.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-j64mp9kq.js:2673-4795 fingerprint = HighlightedThinkingText (0.414)
function HighlightedThinkingText(props) {
  let $ = w(34);
  let { text, useBriefLayout, timestamp, bodyOnly, awaitingModel, markLinks } = props;
  let l = bodyOnly === undefined ? false : bodyOnly;
  let u = awaitingModel === undefined ? false : awaitingModel;
  let queuedMessageContext = useQueuedMessageContext();
  let isQueued = queuedMessageContext?.isQueued ?? false;
  let m = typeof text === "object";
  let x;
  if ($[0] !== text || $[1] !== m) {
    x = !m && isShortSiteText(text);
    $[0] = text;
    $[1] = m;
    $[2] = x;
  } else x = $[2];
  let h = x;
  let b = queuedMessageContext?.selectionHighlight === "on";
  let R = isQueued || u;
  if (useBriefLayout || l) {
    let D;
    if ($[3] !== timestamp) {
      D = timestamp ? formatBriefTimestamp(timestamp) : "";
      $[3] = timestamp;
      $[4] = D;
    } else D = $[4];
    let q = D;
    let color = b ? "suggestion" : R ? (l ? "inactive" : "subtle") : "text";
    const paddingLeft = l ? 0 : 2;
    let A;
    if ($[5] !== l || $[6] !== b || $[7] !== q || $[8] !== R) {
      A = l
        ? null
        : jsxProd_default_2(Box, {
            flexDirection: "row",
            children: [
              b
                ? jsxProd_default_2(Text, {
                    "aria-label": "selected:",
                    color: "suggestion",
                    children: [figures_default.pointer, " "],
                  })
                : null,
              jsxProd_default(Text, {
                color: b ? "suggestion" : R ? "subtle" : "briefLabelYou",
                children: "You",
              }),
              q
                ? jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" ", q],
                  })
                : null,
            ],
          });
      $[5] = l;
      $[6] = b;
      $[7] = q;
      $[8] = R;
      $[9] = A;
    } else A = $[9];
    let K;
    if (
      $[10] !== l ||
      $[11] !== markLinks ||
      $[12] !== h ||
      $[13] !== text ||
      $[14] !== color ||
      $[15] !== m ||
      $[16] !== R
    ) {
      K = m
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                color,
                children: text.head,
              }),
              jsxProd_default(CollapsedLinesDivider, {
                hiddenLines: text.hiddenLines,
                indent: l ? 0 : 2,
              }),
              jsxProd_default(Text, {
                color,
                children: text.tail,
              }),
            ],
          })
        : h
          ? jsxProd_default(MarkdownText_2, {
              promptMode: true,
              color,
              monochrome: R,
              markLinks,
              children: text,
            })
          : jsxProd_default(Text, {
              color,
              children: text,
            });
      $[10] = l;
      $[11] = markLinks;
      $[12] = h;
      $[13] = text;
      $[14] = color;
      $[15] = m;
      $[16] = R;
      $[17] = K;
    } else K = $[17];
    let ie;
    if ($[18] !== paddingLeft || $[19] !== A || $[20] !== K) {
      ie = jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingLeft,
        children: [A, K],
      });
      $[18] = paddingLeft;
      $[19] = A;
      $[20] = K;
      $[21] = ie;
    } else ie = $[21];
    return ie;
  }
  let color = b ? "suggestion" : R ? "inactive" : "text";
  let D;
  if ($[22] !== queuedMessageContext?.selectionHighlight || $[23] !== b) {
    D = jsxProd_default(Box, {
      flexShrink: 0,
      children:
        queuedMessageContext?.selectionHighlight === "off"
          ? jsxProd_default(Text, {
              children: "  ",
            })
          : jsxProd_default_2(Text, {
              "aria-label": b ? "selected:" : "you:",
              color: b ? "suggestion" : "inactive",
              children: [figures_default.pointer, " "],
            }),
    });
    $[22] = queuedMessageContext?.selectionHighlight;
    $[23] = b;
    $[24] = D;
  } else D = $[24];
  let T;
  if ($[25] !== h || $[26] !== text || $[27] !== color || $[28] !== m || $[29] !== R) {
    T = m
      ? jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(UltrathinkHighlightedText, {
              text: text.head,
              color,
            }),
            jsxProd_default(CollapsedLinesDivider, {
              hiddenLines: text.hiddenLines,
              indent: 3,
            }),
            jsxProd_default(UltrathinkHighlightedText, {
              text: text.tail,
              color,
            }),
          ],
        })
      : h
        ? jsxProd_default(MarkdownText_2, {
            promptMode: true,
            color,
            monochrome: R,
            children: text,
          })
        : jsxProd_default(UltrathinkHighlightedText, {
            text,
            color,
          });
    $[25] = h;
    $[26] = text;
    $[27] = color;
    $[28] = m;
    $[29] = R;
    $[30] = T;
  } else T = $[30];
  let A;
  if ($[31] !== D || $[32] !== T) {
    A = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [D, T],
    });
    $[31] = D;
    $[32] = T;
    $[33] = A;
  } else A = $[33];
  return A;
}
export { HighlightedThinkingText };
