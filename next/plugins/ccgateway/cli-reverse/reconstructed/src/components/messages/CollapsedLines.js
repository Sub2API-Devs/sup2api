/**
 * components/messages/CollapsedLines.tsx
 *
 * 2.1.316 新增：折叠行显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pnx1prpt.js (3)
 * attribution: placement 3
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { formatKb } from "../../utils/format.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ULTRATHINK_KEYWORD } from "../../utils/ultraplan/keyword.js";
import { ultrathinkRaisesEffort } from "../../utils/effort.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getRainbowColor } from "../../utils/thinking.js";
import { splitLongTextForCollapse } from "./UserMessageSite.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";

//@ chunk-pnx1prpt.js:4795-5195 placement
/**
 * 折叠提示分隔线："(N lines hidden)"、"(~X KB hidden)" 或两者。
 */
function CollapsedLinesDivider(props) {
  let $ = useMemoCache(7);
  let { hiddenLines, hiddenChars, indent } = props;
  let linesLabel = `${hiddenLines} ${hiddenLines === 1 ? "line" : "lines"}`;
  let element;
  if ($[0] !== hiddenChars || $[1] !== hiddenLines || $[2] !== linesLabel) {
    element =
      hiddenChars === undefined
        ? `(${linesLabel} hidden)`
        : hiddenLines === 0
          ? `(~${formatKb(hiddenChars)} KB hidden)`
          : `(${linesLabel}, ~${formatKb(hiddenChars)} KB hidden)`;
    $[0] = hiddenChars;
    $[1] = hiddenLines;
    $[2] = linesLabel;
    $[3] = element;
  } else element = $[3];
  let title = element;
  let dividerElement;
  if ($[4] !== indent || $[5] !== title) {
    dividerElement = jsxProd_default(Divider, {
      title,
      titleAlign: "start",
      color: "subtle",
      padding: indent,
    });
    $[4] = indent;
    $[5] = title;
    $[6] = dividerElement;
  } else dividerElement = $[6];
  return dividerElement;
}
//@ chunk-pnx1prpt.js:5195-5838 placement
/**
 * 渲染思考文本，ultrathink 关键字生效时把关键字逐字符彩虹着色。
 */
function UltrathinkHighlightedText(props) {
  let $ = useMemoCache(9);
  let { text, color } = props;
  let mainLoopModel = useMainLoopModel();
  let queuedMessageText = useQueuedMessageText();
  let headerElement;
  let contentElement;
  if ($[0] !== color || $[1] !== queuedMessageText || $[2] !== mainLoopModel || $[3] !== text) {
    contentElement = EARLY_RETURN_SENTINEL;
    b: {
      let ultrathinkKeyword = ULTRATHINK_KEYWORD(text);
      if (ultrathinkKeyword.length === 0 || !ultrathinkRaisesEffort(mainLoopModel, queuedMessageText)) {
        let textElement;
        if ($[6] !== color || $[7] !== text) {
          textElement = jsxProd_default(Text, {
            color,
            children: text,
          });
          $[6] = color;
          $[7] = text;
          $[8] = textElement;
        } else textElement = $[8];
        contentElement = textElement;
        break b;
      }
      let segments = [];
      let cursor = 0;
      for (const keywordMatch of ultrathinkKeyword) {
        if (keywordMatch.start > cursor)
          segments.push(
            jsxProd_default(
              Text,
              {
                color,
                children: text.slice(cursor, keywordMatch.start),
              },
              `plain-${cursor}`,
            ),
          );
        for (let start = keywordMatch.start; start < keywordMatch.end; start++)
          segments.push(
            jsxProd_default(
              Text,
              {
                color: getRainbowColor(start - keywordMatch.start),
                children: text[start],
              },
              `rb-${start}`,
            ),
          );
        cursor = keywordMatch.end;
      }
      if (cursor < text.length)
        segments.push(
          jsxProd_default(
            Text,
            {
              color,
              children: text.slice(cursor),
            },
            `plain-${cursor}`,
          ),
        );
      headerElement = jsxProd_default(Text, {
        children: segments,
      });
    }
    $[0] = color;
    $[1] = queuedMessageText;
    $[2] = mainLoopModel;
    $[3] = text;
    $[4] = headerElement;
    $[5] = contentElement;
  } else {
    headerElement = $[4];
    contentElement = $[5];
  }
  if (contentElement !== EARLY_RETURN_SENTINEL) return contentElement;
  return headerElement;
}
//@ chunk-pnx1prpt.js:5838-6575 placement
/**
 * 长文本折叠显示：能折叠时显示头部、折叠分隔线和尾部，否则整段显示（均经 sanitizeDisplayText）。
 */
function CollapsibleText(props) {
  let $ = useMemoCache(19);
  let { text } = props;
  let headerElement;
  let footerElement;
  let wrap;
  let children;
  let flexDirection;
  let rowsChildren;
  let collapsedLinesDividerElement;
  let contentElement;
  if ($[0] !== text) {
    contentElement = EARLY_RETURN_SENTINEL;
    g: {
      let collapsibleElement = splitLongTextForCollapse(text);
      if (typeof collapsibleElement === "string") {
        contentElement = jsxProd_default(Text, {
          wrap: "wrap",
          children: sanitizeDisplayText(collapsibleElement),
        });
        break g;
      }
      footerElement = Box;
      flexDirection = "column";
      rowsChildren = jsxProd_default(Text, {
        wrap: "wrap",
        children: sanitizeDisplayText(collapsibleElement.head),
      });
      collapsedLinesDividerElement = jsxProd_default(CollapsedLinesDivider, {
        hiddenLines: collapsibleElement.hiddenLines,
        hiddenChars: collapsibleElement.hiddenChars,
        indent: 0,
      });
      headerElement = Text;
      wrap = "wrap";
      children = sanitizeDisplayText(collapsibleElement.tail);
    }
    $[0] = text;
    $[1] = headerElement;
    $[2] = footerElement;
    $[3] = wrap;
    $[4] = children;
    $[5] = flexDirection;
    $[6] = rowsChildren;
    $[7] = collapsedLinesDividerElement;
    $[8] = contentElement;
  } else {
    headerElement = $[1];
    footerElement = $[2];
    wrap = $[3];
    children = $[4];
    flexDirection = $[5];
    rowsChildren = $[6];
    collapsedLinesDividerElement = $[7];
    contentElement = $[8];
  }
  if (contentElement !== EARLY_RETURN_SENTINEL) return contentElement;
  let headerElementElement;
  if ($[9] !== headerElement || $[10] !== wrap || $[11] !== children) {
    headerElementElement = jsxProd_default(headerElement, {
      wrap,
      children,
    });
    $[9] = headerElement;
    $[10] = wrap;
    $[11] = children;
    $[12] = headerElementElement;
  } else headerElementElement = $[12];
  let footerElementElement;
  if (
    $[13] !== footerElement ||
    $[14] !== flexDirection ||
    $[15] !== rowsChildren ||
    $[16] !== collapsedLinesDividerElement ||
    $[17] !== headerElementElement
  ) {
    footerElementElement = jsxProd_default_2(footerElement, {
      flexDirection,
      children: [rowsChildren, collapsedLinesDividerElement, headerElementElement],
    });
    $[13] = footerElement;
    $[14] = flexDirection;
    $[15] = rowsChildren;
    $[16] = collapsedLinesDividerElement;
    $[17] = headerElementElement;
    $[18] = footerElementElement;
  } else footerElementElement = $[18];
  return footerElementElement;
}
export { CollapsedLinesDivider, UltrathinkHighlightedText, CollapsibleText };
