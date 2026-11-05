/**
 * components/messages/HighlightedThinkingText.tsx
 *
 * 思考文本渲染（关键词高亮、读屏 aria-label）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/HighlightedThinkingText.tsx
 * pieces: chunk-pnx1prpt.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-pnx1prpt.js:2672-4795 fingerprint (2.1.88 match: HighlightedThinkingText, 0.414)
function HighlightedThinkingText(props) {
  let $ = useMemoCache(34);
  let { text, useBriefLayout, timestamp, bodyOnly, awaitingModel, markLinks } = props;
  let bodyOnlyFlag = bodyOnly === undefined ? false : bodyOnly;
  let awaitingModelFlag = awaitingModel === undefined ? false : awaitingModel;
  let queuedMessageContext = useQueuedMessageContext();
  let isQueued = queuedMessageContext?.isQueued ?? false;
  let hasHiddenLines = typeof text === "object";
  let isShortText;
  if ($[0] !== text || $[1] !== hasHiddenLines) {
    isShortText = !hasHiddenLines && isShortSiteText(text);
    $[0] = text;
    $[1] = hasHiddenLines;
    $[2] = isShortText;
  } else isShortText = $[2];
  let shortTextValue = isShortText;
  let isHighlighted = queuedMessageContext?.selectionHighlight === "on";
  let isDim = isQueued || awaitingModelFlag;
  if (useBriefLayout || bodyOnlyFlag) {
    let timestampText;
    if ($[3] !== timestamp) {
      timestampText = timestamp ? formatBriefTimestamp(timestamp) : "";
      $[3] = timestamp;
      $[4] = timestampText;
    } else timestampText = $[4];
    let timestampLabel = timestampText;
    let color = isHighlighted ? "suggestion" : isDim ? (bodyOnlyFlag ? "inactive" : "subtle") : "text";
    const paddingLeft = bodyOnlyFlag ? 0 : 2;
    let youRow;
    if ($[5] !== bodyOnlyFlag || $[6] !== isHighlighted || $[7] !== timestampLabel || $[8] !== isDim) {
      youRow = bodyOnlyFlag
        ? null
        : jsxProd_default_2(Box, {
            flexDirection: "row",
            children: [
              isHighlighted
                ? jsxProd_default_2(Text, {
                    "aria-label": "selected:",
                    color: "suggestion",
                    children: [figures_default.pointer, " "],
                  })
                : null,
              jsxProd_default(Text, {
                color: isHighlighted ? "suggestion" : isDim ? "subtle" : "briefLabelYou",
                children: "You",
              }),
              timestampLabel
                ? jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" ", timestampLabel],
                  })
                : null,
            ],
          });
      $[5] = bodyOnlyFlag;
      $[6] = isHighlighted;
      $[7] = timestampLabel;
      $[8] = isDim;
      $[9] = youRow;
    } else youRow = $[9];
    let bodyElement;
    if (
      $[10] !== bodyOnlyFlag ||
      $[11] !== markLinks ||
      $[12] !== shortTextValue ||
      $[13] !== text ||
      $[14] !== color ||
      $[15] !== hasHiddenLines ||
      $[16] !== isDim
    ) {
      bodyElement = hasHiddenLines
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Text, {
                color,
                children: text.head,
              }),
              jsxProd_default(CollapsedLinesDivider, {
                hiddenLines: text.hiddenLines,
                indent: bodyOnlyFlag ? 0 : 2,
              }),
              jsxProd_default(Text, {
                color,
                children: text.tail,
              }),
            ],
          })
        : shortTextValue
          ? jsxProd_default(MarkdownText_2, {
              promptMode: true,
              color,
              monochrome: isDim,
              markLinks,
              children: text,
            })
          : jsxProd_default(Text, {
              color,
              children: text,
            });
      $[10] = bodyOnlyFlag;
      $[11] = markLinks;
      $[12] = shortTextValue;
      $[13] = text;
      $[14] = color;
      $[15] = hasHiddenLines;
      $[16] = isDim;
      $[17] = bodyElement;
    } else bodyElement = $[17];
    let columnElement;
    if ($[18] !== paddingLeft || $[19] !== youRow || $[20] !== bodyElement) {
      columnElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingLeft,
        children: [youRow, bodyElement],
      });
      $[18] = paddingLeft;
      $[19] = youRow;
      $[20] = bodyElement;
      $[21] = columnElement;
    } else columnElement = $[21];
    return columnElement;
  }
  let color = isHighlighted ? "suggestion" : isDim ? "inactive" : "text";
  let highlightBar;
  if ($[22] !== queuedMessageContext?.selectionHighlight || $[23] !== isHighlighted) {
    highlightBar = jsxProd_default(Box, {
      flexShrink: 0,
      children:
        queuedMessageContext?.selectionHighlight === "off"
          ? jsxProd_default(Text, {
              children: "  ",
            })
          : jsxProd_default_2(Text, {
              "aria-label": isHighlighted ? "selected:" : "you:",
              color: isHighlighted ? "suggestion" : "inactive",
              children: [figures_default.pointer, " "],
            }),
    });
    $[22] = queuedMessageContext?.selectionHighlight;
    $[23] = isHighlighted;
    $[24] = highlightBar;
  } else highlightBar = $[24];
  let bodyColumn;
  if (
    $[25] !== shortTextValue ||
    $[26] !== text ||
    $[27] !== color ||
    $[28] !== hasHiddenLines ||
    $[29] !== isDim
  ) {
    bodyColumn = hasHiddenLines
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
      : shortTextValue
        ? jsxProd_default(MarkdownText_2, {
            promptMode: true,
            color,
            monochrome: isDim,
            children: text,
          })
        : jsxProd_default(UltrathinkHighlightedText, {
            text,
            color,
          });
    $[25] = shortTextValue;
    $[26] = text;
    $[27] = color;
    $[28] = hasHiddenLines;
    $[29] = isDim;
    $[30] = bodyColumn;
  } else bodyColumn = $[30];
  let rowElement;
  if ($[31] !== highlightBar || $[32] !== bodyColumn) {
    rowElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [highlightBar, bodyColumn],
    });
    $[31] = highlightBar;
    $[32] = bodyColumn;
    $[33] = rowElement;
  } else rowElement = $[33];
  return rowElement;
}
export { HighlightedThinkingText };
