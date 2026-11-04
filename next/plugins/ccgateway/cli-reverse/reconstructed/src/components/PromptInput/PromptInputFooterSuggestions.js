/**
 * components/PromptInput/PromptInputFooterSuggestions.tsx
 *
 * 输入建议列表（命令/文件/MCP 资源/agent/emoji 等）：按类型取图标、高亮匹配字符、滚动窗口与对齐。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputFooterSuggestions.tsx
 * pieces: chunk-8jypjjdf.js (19)
 * attribution: placement 11, layout 5, fingerprint 3
 */
import { DIAMOND_GLYPH } from "../../constants/figures.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  Fragment,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { memo, useMemo, useState } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import {
  truncateStartToWidth,
  truncatePathMiddle,
  truncateToWidth,
  truncateToWidthNoEllipsis,
} from "../../utils/format.js";
import { useStrayClickGuard } from "../CustomSelect/strayClickGuard.js";
import { stripLineBreaks, repeatString, collapseWhitespace } from "../../utils/stringUtils.js";
import { HintText } from "../design-system/HintText.js";
import { TwoColumnRow } from "../CustomSelect/select.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8jypjjdf.js:1642-1656 placement
var WHITESPACE_RE = /\s+/g;
//@ chunk-8jypjjdf.js:1656-1767 placement
/**
 * 当前方向键选中的建议 id（与选中项一致时）。
 */
function getArrowedSuggestionId(state) {
  let arrowedSuggestionId = state.arrowedSuggestionId;
  return arrowedSuggestionId != null &&
    state.suggestions[state.selectedSuggestion]?.id === arrowedSuggestionId
    ? arrowedSuggestionId
    : null;
}
//@ chunk-8jypjjdf.js:1767-2112 layout
/**
 * 计算建议列表的可见窗口：各项高度不一，在最大行数内从上次起点出发保证选中项可见，并尽量向上填满。
 */
function suggestionWindow(rowHeights, budgetRows, selectedIndex, columnWidth) {
  let heightOf = (index) => rowHeights[index] ?? 1;
  let fillFrom = (start) => {
    let next = start + 1;
    let rows = heightOf(start);
    while (next < rowHeights.length && rows + heightOf(next) <= budgetRows) {
      rows += heightOf(next);
      next++;
    }
    return {
      start,
      end: next,
      usedRows: rows,
    };
  };
  let rowFillWindow = fillFrom(Math.max(0, Math.min(columnWidth, rowHeights.length - 1)));
  if (selectedIndex >= rowFillWindow.end) rowFillWindow = fillFrom(selectedIndex);
  else if (selectedIndex < rowFillWindow.start)
    rowFillWindow = {
      start: selectedIndex,
      end: selectedIndex + 1,
      usedRows: heightOf(selectedIndex),
    };
  while (
    rowFillWindow.start > 0 &&
    rowFillWindow.usedRows + heightOf(rowFillWindow.start - 1) <= budgetRows
  ) {
    rowFillWindow.start--;
    rowFillWindow.usedRows += heightOf(rowFillWindow.start);
  }
  return fillFrom(rowFillWindow.start);
}
//@ chunk-8jypjjdf.js:2112-2121 layout
var MAX_VISIBLE_SUGGESTIONS = 5;
//@ chunk-8jypjjdf.js:2121-2302 fingerprint (2.1.88 match: getIcon, 0.839)
function getIcon(itemId) {
  if (itemId.startsWith("file-")) return "+";
  if (itemId.startsWith("mcp-resource-")) return DIAMOND_GLYPH;
  if (itemId.startsWith("mcp-template")) return DIAMOND_GLYPH;
  if (itemId.startsWith("agent-")) return "*";
  return "+";
}
//@ chunk-8jypjjdf.js:2302-2608 layout
function findContiguousMatch(text, query, contiguousOnly = false) {
  let lower = text.toLowerCase();
  if (lower.length !== text.length) return [];
  let index = lower.indexOf(query);
  if (index !== -1) return snapRangesToGraphemes(text, [[index, index + query.length]]);
  if (contiguousOnly) return [];
  let ranges = [];
  let queryIndex = 0;
  for (let char of query) {
    let index = lower.indexOf(char, queryIndex);
    if (index === -1) return [];
    let nextChar = index + char.length;
    let last = ranges.at(-1);
    if (last && last[1] === index) last[1] = nextChar;
    else ranges.push([index, nextChar]);
    queryIndex = nextChar;
  }
  return snapRangesToGraphemes(text, ranges);
}
//@ chunk-8jypjjdf.js:2608-3288 layout
function HighlightedSuggestionText(props) {
  let $ = useMemoCache(13);
  let { text, query, color, isSelected, bold, contiguousOnly } = props;
  let earlyResult;
  let highlighted;
  if (
    $[0] !== bold ||
    $[1] !== color ||
    $[2] !== contiguousOnly ||
    $[3] !== isSelected ||
    $[4] !== query ||
    $[5] !== text
  ) {
    highlighted = EARLY_RETURN_SENTINEL;
    g: {
      let ranges = query ? findContiguousMatch(text, query, contiguousOnly) : [];
      if (ranges.length === 0) {
        const dimColor = !isSelected;
        let plainText;
        if ($[8] !== bold || $[9] !== color || $[10] !== dimColor || $[11] !== text) {
          plainText = jsxProd_default(Text, {
            color,
            dimColor,
            bold,
            children: text,
          });
          $[8] = bold;
          $[9] = color;
          $[10] = dimColor;
          $[11] = text;
          $[12] = plainText;
        } else plainText = $[12];
        highlighted = plainText;
        break g;
      }
      let parts = [];
      let pushSlice = (start, end, isMatch) => {
        if (start >= end) {
          return;
        }
        parts.push(
          jsxProd_default(
            Text,
            {
              color,
              dimColor: !isMatch && !isSelected,
              bold: bold || isMatch,
              children: text.slice(start, end),
            },
            start,
          ),
        );
      };
      let cursor = 0;
      for (const [rangeStart, rangeEnd] of ranges) {
        pushSlice(cursor, rangeStart, false);
        pushSlice(rangeStart, rangeEnd, true);
        cursor = rangeEnd;
      }
      pushSlice(cursor, text.length, false);
      earlyResult = jsxProd_default(Fragment, {
        children: parts,
      });
    }
    $[0] = bold;
    $[1] = color;
    $[2] = contiguousOnly;
    $[3] = isSelected;
    $[4] = query;
    $[5] = text;
    $[6] = earlyResult;
    $[7] = highlighted;
  } else {
    earlyResult = $[6];
    highlighted = $[7];
  }
  if (highlighted !== EARLY_RETURN_SENTINEL) return highlighted;
  return earlyResult;
}
//@ chunk-8jypjjdf.js:3288-3417 layout (2.1.88 match: getIcon, 0.839)
function getIcon_2(itemId) {
  return (
    itemId.startsWith("file-") ||
    itemId.startsWith("mcp-resource-") ||
    itemId.startsWith("mcp-template") ||
    itemId.startsWith("agent-")
  );
}
//@ chunk-8jypjjdf.js:3417-8103 fingerprint (2.1.88 match: SuggestionItemRow, 0.575)
var SuggestionItemRow; // deferred: uses useTerminalSize (../../hooks/useTerminalSize.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8jypjjdf.js:3417", () => {
  SuggestionItemRow = memo(function (props) {
    let $ = useMemoCache(101);
    let { item, maxColumnWidth, isSelected, allowWrap } = props;
    let wrapAllowed = allowWrap === undefined ? true : allowWrap;
    let columns = useTerminalSize().columns;
    let isScreenReader = useIsScreenReaderEnabled();
    let isUnified = getIcon_2(item.id);
    let isEmojiId;
    if ($[0] !== item.id) {
      isEmojiId = item.id.startsWith("emoji:");
      $[0] = item.id;
      $[1] = isEmojiId;
    } else isEmojiId = $[1];
    let isEmoji = isEmojiId;
    let prefix = isScreenReader && !isEmoji ? "" : isSelected ? `${figures_default.pointer} ` : "  ";
    let prefixWidth = bunStringWidth(prefix);
    if (isUnified) {
      let icon;
      if ($[2] !== item.id) {
        icon = getIcon(item.id);
        $[2] = item.id;
        $[3] = icon;
      } else icon = $[3];
      let iconText = icon;
      let textColor = isSelected ? "suggestion" : undefined;
      let dimColor = !isSelected;
      let isFile = item.id.startsWith("file-");
      let isMcpResource = item.id.startsWith("mcp-resource-");
      let isTemplateValue;
      if ($[4] !== item.id) {
        isTemplateValue = item.id.startsWith("mcp-template-value::");
        $[4] = item.id;
        $[5] = isTemplateValue;
      } else isTemplateValue = $[5];
      let isTemplateValue_2 = isTemplateValue;
      let isTemplate = item.id.startsWith("mcp-template::");
      let descReserveFixed = item.description ? 3 : 0;
      let displayText;
      if (isFile || isTemplate || isTemplateValue_2) {
        let descWidth;
        if ($[6] !== item.description) {
          descWidth = item.description ? Math.min(20, bunStringWidth(item.description)) : 0;
          $[6] = item.description;
          $[7] = descWidth;
        } else descWidth = $[7];
        let descReserve = descWidth;
        let maxPathLength = columns - prefixWidth - 2 - 4 - descReserveFixed - descReserve;
        let truncatedPath;
        if ($[8] !== isTemplateValue_2 || $[9] !== item.displayText || $[10] !== maxPathLength) {
          truncatedPath = isTemplateValue_2
            ? truncateStartToWidth(item.displayText, maxPathLength)
            : truncatePathMiddle(item.displayText, maxPathLength);
          $[8] = isTemplateValue_2;
          $[9] = item.displayText;
          $[10] = maxPathLength;
          $[11] = truncatedPath;
        } else truncatedPath = $[11];
        displayText = truncatedPath;
      } else if (isMcpResource) {
        let memoCache;
        if ($[12] !== item.displayText) {
          memoCache = truncateToWidth(item.displayText, 30);
          $[12] = item.displayText;
          $[13] = memoCache;
        } else memoCache = $[13];
        displayText = memoCache;
      } else displayText = item.displayText;
      let availableWidth = columns - prefixWidth - 2 - bunStringWidth(displayText) - descReserveFixed - 4;
      let lineContent;
      if (item.description) {
        let maxDescLength = Math.max(0, availableWidth);
        let truncatedDesc;
        if ($[14] !== item.description || $[15] !== maxDescLength) {
          truncatedDesc = truncateToWidth(item.description.replace(WHITESPACE_RE, " "), maxDescLength);
          $[14] = item.description;
          $[15] = maxDescLength;
          $[16] = truncatedDesc;
        } else truncatedDesc = $[16];
        let truncatedDesc_2 = truncatedDesc;
        lineContent = `${prefix}${iconText} ${displayText} \u2013 ${truncatedDesc_2}`;
      } else lineContent = `${prefix}${iconText} ${displayText}`;
      let textElement;
      if ($[17] !== dimColor || $[18] !== lineContent || $[19] !== textColor) {
        textElement = jsxProd_default(Text, {
          color: textColor,
          dimColor,
          wrap: "truncate",
          children: lineContent,
        });
        $[17] = dimColor;
        $[18] = lineContent;
        $[19] = textColor;
        $[20] = textElement;
      } else textElement = $[20];
      return textElement;
    }
    let hasExtra = item.description || item.tag || item.kind !== undefined || item.sourceTag;
    let baseWidth = maxColumnWidth ?? bunStringWidth(item.displayText) + 5;
    let rowWidth;
    if (
      $[21] !== baseWidth ||
      $[22] !== columns ||
      $[23] !== hasExtra ||
      $[24] !== isScreenReader ||
      $[25] !== item
    ) {
      rowWidth = hasExtra
        ? fitSuggestionWidth(item, columns, baseWidth, isScreenReader)
        : Math.min(baseWidth, columns - 4);
      $[21] = baseWidth;
      $[22] = columns;
      $[23] = hasExtra;
      $[24] = isScreenReader;
      $[25] = item;
      $[26] = rowWidth;
    } else rowWidth = $[26];
    let rowWidth_2 = rowWidth;
    let color = item.color || (isSelected ? "suggestion" : undefined);
    let shouldDim = !isSelected;
    let bold = isEmoji && isSelected;
    let textWidth = rowWidth_2 - 2 - (hasExtra && !isEmoji ? prefixWidth : 0);
    let displayText_0 = item.displayText;
    if (bunStringWidth(displayText_0) > textWidth) {
      let truncatedText;
      if ($[27] !== displayText_0 || $[28] !== textWidth) {
        truncatedText =
          displayText_0.includes("/") || displayText_0.includes("\\")
            ? truncateStartToWidth(displayText_0, textWidth)
            : truncateToWidth(displayText_0, textWidth);
        $[27] = displayText_0;
        $[28] = textWidth;
        $[29] = truncatedText;
      } else truncatedText = $[29];
      displayText_0 = truncatedText;
    }
    let padding;
    if ($[30] !== rowWidth_2 || $[31] !== displayText_0 || $[32] !== prefixWidth) {
      padding = " ".repeat(Math.max(0, rowWidth_2 - bunStringWidth(displayText_0) - prefixWidth));
      $[30] = rowWidth_2;
      $[31] = displayText_0;
      $[32] = prefixWidth;
      $[33] = padding;
    } else padding = $[33];
    let children = padding;
    let tagPrefix = item.tag ? `[${item.tag}] ` : "";
    let tagWidth = bunStringWidth(tagPrefix);
    let laneColor;
    let laneText;
    let sourceText;
    let laneWidth;
    let sourceWidth;
    if ($[34] !== item) {
      let { kindLaneText, kindLabel, sourceText: sourceText_2 } = suggestionKindLabels(item);
      laneText = kindLaneText;
      sourceText = sourceText_2;
      laneColor = kindLabel === "skill" ? "skill" : kindLabel === "agent" ? "background" : undefined;
      laneWidth = bunStringWidth(laneText);
      sourceWidth = bunStringWidth(sourceText);
      $[34] = item;
      $[35] = laneColor;
      $[36] = laneText;
      $[37] = sourceText;
      $[38] = laneWidth;
      $[39] = sourceWidth;
    } else {
      laneColor = $[35];
      laneText = $[36];
      sourceText = $[37];
      laneWidth = $[38];
      sourceWidth = $[39];
    }
    let extrasWidth = laneWidth + sourceWidth;
    let descriptionWidth = Math.max(0, columns - rowWidth_2 - tagWidth - extrasWidth - 4);
    let color_2;
    let firstLine;
    let offset;
    let restText;
    let earlyReturn;
    if (
      $[40] !== wrapAllowed ||
      $[41] !== bold ||
      $[42] !== columns ||
      $[43] !== descriptionWidth ||
      $[44] !== rowWidth_2 ||
      $[45] !== displayText_0 ||
      $[46] !== isSelected ||
      $[47] !== item.description ||
      $[48] !== item.query ||
      $[49] !== laneColor ||
      $[50] !== laneText ||
      $[51] !== extrasWidth ||
      $[52] !== children ||
      $[53] !== prefix ||
      $[54] !== shouldDim ||
      $[55] !== sourceText ||
      $[56] !== tagPrefix ||
      $[57] !== tagWidth ||
      $[58] !== color
    ) {
      earlyReturn = EARLY_RETURN_SENTINEL;
      Ln: {
        let descriptionText = item.description ? item.description.replace(WHITESPACE_RE, " ").trim() : "";
        let [firstPart, restPart] = wrapAllowed
          ? splitAtWordWidth(descriptionText, descriptionWidth)
          : [truncateToWidth(descriptionText, descriptionWidth), ""];
        color_2 = isSelected ? "suggestion" : undefined;
        let prefixNode;
        if ($[64] !== bold || $[65] !== prefix || $[66] !== shouldDim || $[67] !== color) {
          prefixNode = prefix
            ? jsxProd_default(Text, {
                color,
                dimColor: shouldDim,
                bold,
                children: prefix,
              })
            : null;
          $[64] = bold;
          $[65] = prefix;
          $[66] = shouldDim;
          $[67] = color;
          $[68] = prefixNode;
        } else prefixNode = $[68];
        let displayNode;
        if (
          $[69] !== bold ||
          $[70] !== displayText_0 ||
          $[71] !== isSelected ||
          $[72] !== item.query ||
          $[73] !== color
        ) {
          displayNode = jsxProd_default(HighlightedSuggestionText, {
            text: displayText_0,
            query: item.query,
            color,
            isSelected,
            bold,
          });
          $[69] = bold;
          $[70] = displayText_0;
          $[71] = isSelected;
          $[72] = item.query;
          $[73] = color;
          $[74] = displayNode;
        } else displayNode = $[74];
        let paddingNode;
        if ($[75] !== bold || $[76] !== children || $[77] !== shouldDim || $[78] !== color) {
          paddingNode = jsxProd_default(Text, {
            color,
            dimColor: shouldDim,
            bold,
            children,
          });
          $[75] = bold;
          $[76] = children;
          $[77] = shouldDim;
          $[78] = color;
          $[79] = paddingNode;
        } else paddingNode = $[79];
        let laneNode;
        if ($[80] !== laneColor || $[81] !== laneText) {
          laneNode = laneText
            ? jsxProd_default(Text, {
                color: laneColor,
                dimColor: laneColor === undefined,
                children: laneText,
              })
            : null;
          $[80] = laneColor;
          $[81] = laneText;
          $[82] = laneNode;
        } else laneNode = $[82];
        let tagNode;
        if ($[83] !== tagPrefix) {
          tagNode = tagPrefix
            ? jsxProd_default(Text, {
                dimColor: true,
                children: tagPrefix,
              })
            : null;
          $[83] = tagPrefix;
          $[84] = tagNode;
        } else tagNode = $[84];
        let sourceNode;
        if ($[85] !== sourceText) {
          sourceNode = sourceText
            ? jsxProd_default(Text, {
                dimColor: true,
                children: sourceText,
              })
            : null;
          $[85] = sourceText;
          $[86] = sourceNode;
        } else sourceNode = $[86];
        firstLine = jsxProd_default_2(Text, {
          wrap: "truncate",
          children: [
            prefixNode,
            displayNode,
            paddingNode,
            laneNode,
            tagNode,
            sourceNode,
            jsxProd_default(HighlightedSuggestionText, {
              text: firstPart,
              query: item.query,
              color: color_2,
              isSelected,
              bold,
              contiguousOnly: true,
            }),
          ],
        });
        if (!restPart) {
          earlyReturn = firstLine;
          break Ln;
        }
        offset = rowWidth_2 + tagWidth + extrasWidth;
        restText = truncateToWidth(restPart, Math.max(0, columns - offset - 4));
      }
      $[40] = wrapAllowed;
      $[41] = bold;
      $[42] = columns;
      $[43] = descriptionWidth;
      $[44] = rowWidth_2;
      $[45] = displayText_0;
      $[46] = isSelected;
      $[47] = item.description;
      $[48] = item.query;
      $[49] = laneColor;
      $[50] = laneText;
      $[51] = extrasWidth;
      $[52] = children;
      $[53] = prefix;
      $[54] = shouldDim;
      $[55] = sourceText;
      $[56] = tagPrefix;
      $[57] = tagWidth;
      $[58] = color;
      $[59] = color_2;
      $[60] = firstLine;
      $[61] = offset;
      $[62] = restText;
      $[63] = earlyReturn;
    } else {
      color_2 = $[59];
      firstLine = $[60];
      offset = $[61];
      restText = $[62];
      earlyReturn = $[63];
    }
    if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
    let text = restText;
    let offsetPadding;
    if ($[87] !== offset) {
      offsetPadding = " ".repeat(offset);
      $[87] = offset;
      $[88] = offsetPadding;
    } else offsetPadding = $[88];
    let restNode;
    if (
      $[89] !== bold ||
      $[90] !== color_2 ||
      $[91] !== text ||
      $[92] !== isSelected ||
      $[93] !== item.query
    ) {
      restNode = jsxProd_default(HighlightedSuggestionText, {
        text,
        query: item.query,
        color: color_2,
        isSelected,
        bold,
        contiguousOnly: true,
      });
      $[89] = bold;
      $[90] = color_2;
      $[91] = text;
      $[92] = isSelected;
      $[93] = item.query;
      $[94] = restNode;
    } else restNode = $[94];
    let secondLine;
    if ($[95] !== restNode || $[96] !== offsetPadding) {
      secondLine = jsxProd_default_2(Text, {
        wrap: "truncate",
        children: [offsetPadding, restNode],
      });
      $[95] = restNode;
      $[96] = offsetPadding;
      $[97] = secondLine;
    } else secondLine = $[97];
    let content;
    if ($[98] !== firstLine || $[99] !== secondLine) {
      content = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [firstLine, secondLine],
      });
      $[98] = firstLine;
      $[99] = secondLine;
      $[100] = content;
    } else content = $[100];
    return content;
  });
});
//@ chunk-8jypjjdf.js:8103-9644 fingerprint (2.1.88 match: PromptInputFooterSuggestions, 0.494)
/**
 * 建议列表：根据终端宽高计算可见窗口，按类型（命令/文件/MCP/agent/emoji）渲染 SuggestionItemRow，选中项高亮。
 */
function PromptInputFooterSuggestions({
  suggestions,
  selectedSuggestion,
  maxColumnWidth,
  emptyMessage,
  overlay,
  noPad,
  onSelect,
  hoveredId,
  onHoverChange,
  cursorRowId,
  keepWindow = false,
}) {
  let { rows, columns } = useTerminalSize();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let strayClickGuard = useStrayClickGuard();
  let columnWidth = useMemo(
    () =>
      maxColumnWidth ??
      suggestions.reduce(
        (acc, suggestion) => Math.max(acc, bunStringWidth(stripLineBreaks(suggestion.displayText))),
        0,
      ) + 5,
    [suggestions, maxColumnWidth],
  );
  let [anchorIndex, setAnchorIndex] = useState(null);
  let maxVisible = overlay
    ? MAX_VISIBLE_SUGGESTIONS
    : Math.max(1, Math.min(Math.max(6, Math.floor(rows / 2)), rows - 3));
  if (suggestions.length === 0) {
    if (!emptyMessage) return null;
    let padCount = noPad ? 0 : Math.max(0, maxVisible - 1);
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      justifyContent: overlay ? undefined : "flex-end",
      children: [
        jsxProd_default(HintText, {
          children: emptyMessage,
        }),
        Array.from(
          {
            length: padCount,
          },
          (unused, index) =>
            jsxProd_default(
              Text,
              {
                children: " ",
              },
              `pad-${index}`,
            ),
        ),
      ],
    });
  }
  let max = Math.max(0, Math.min(selectedSuggestion, suggestions.length - 1));
  let max_2 = Math.max(0, max - maxVisible);
  let mapped = suggestions.slice(max_2, max + maxVisible + 1).map(sanitizeSuggestion);
  let wrapAllowed = maxVisible >= 2;
  let rowHeights = mapped.map((item) =>
    wrapAllowed ? suggestionRowHeight(item, columns, columnWidth, isScreenReaderEnabled) : 1,
  );
  let focusIndex = max - max_2;
  let maxColumnWidth_2 = focusIndex;
  let end = focusIndex + 1;
  let usedRows = rowHeights[focusIndex] ?? 1;
  let grownRows = 0;
  let floored = Math.floor(maxVisible / 2);
  while (
    maxColumnWidth_2 > 0 &&
    usedRows < maxVisible &&
    grownRows + (rowHeights[maxColumnWidth_2 - 1] ?? 1) <= floored
  ) {
    maxColumnWidth_2--;
    grownRows += rowHeights[maxColumnWidth_2] ?? 1;
  }
  usedRows += grownRows;
  while (end < mapped.length && usedRows + (rowHeights[end] ?? 1) <= maxVisible) {
    usedRows += rowHeights[end] ?? 1;
    end++;
  }
  while (maxColumnWidth_2 > 0 && usedRows + (rowHeights[maxColumnWidth_2 - 1] ?? 1) <= maxVisible) {
    maxColumnWidth_2--;
    usedRows += rowHeights[maxColumnWidth_2] ?? 1;
  }
  if (keepWindow) {
    let suggestWindow = suggestionWindow(
      rowHeights,
      maxVisible,
      focusIndex,
      (anchorIndex ?? max_2 + maxColumnWidth_2) - max_2,
    );
    maxColumnWidth_2 = suggestWindow.start;
    end = suggestWindow.end;
    usedRows = suggestWindow.usedRows;
    if (max_2 + maxColumnWidth_2 !== anchorIndex) setAnchorIndex(max_2 + maxColumnWidth_2);
  }
  let visibleItems = mapped.slice(maxColumnWidth_2, end);
  let padRows = noPad ? 0 : Math.max(0, maxVisible - usedRows);
  let id = suggestions[selectedSuggestion]?.id;
  let hoveredItemId =
    hoveredId != null && suggestions.some((suggestion) => suggestion.id === hoveredId)
      ? hoveredId
      : undefined;
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    justifyContent: overlay ? undefined : "flex-end",
    onMouseLeave: onSelect ? () => onHoverChange?.(null) : undefined,
    children: [
      visibleItems.map((visible, offset) => {
        let index = max_2 + maxColumnWidth_2 + offset;
        let rowNode = jsxProd_default(
          SuggestionItemRow,
          {
            item: visible,
            maxColumnWidth: columnWidth,
            isSelected: visible.id === (hoveredItemId ?? id),
            allowWrap: wrapAllowed,
          },
          visible.id,
        );
        if (cursorRowId != null && visible.id === cursorRowId)
          return jsxProd_default(
            TwoColumnRow,
            {
              active: true,
              children: rowNode,
            },
            visible.id,
          );
        if (!onSelect) return rowNode;
        return jsxProd_default(
          Box,
          {
            onMouseEnter: () => onHoverChange?.(visible.id),
            onClick: (item_0) => {
              if (strayClickGuard(item_0)) return;
              onSelect(index, visible.id);
            },
            children: rowNode,
          },
          visible.id,
        );
      }),
      Array.from(
        {
          length: padRows,
        },
        (unused, index) =>
          jsxProd_default(
            Text,
            {
              children: " ",
            },
            `pad-${index}`,
          ),
      ),
    ],
  });
}
//@ chunk-8jypjjdf.js:9644-9660 placement
/**
 * 导出值：FooterSuggestionsMemo（memo 包装的建议列表）；位于「输入建议列表（命令/文件/MCP 资源/agent/emoji 等）：按类型取图标、高亮匹配字符、滚动窗口与对齐」模块。
 */
var FooterSuggestionsMemo; // deferred: uses PromptInputFooterSuggestions of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8jypjjdf.js:9644", () => {
  FooterSuggestionsMemo = memo(PromptInputFooterSuggestions);
});
//@ chunk-8jypjjdf.js:9660-9875 placement
function suggestionKindLabels(suggestion) {
  let kindLabel =
    suggestion.kind === undefined || suggestion.kind === "action"
      ? ""
      : suggestion.kind === "info"
        ? "config"
        : suggestion.kind;
  let kindLaneText =
    suggestion.kind === undefined ? "" : kindLabel + repeatString(" ", 7 - bunStringWidth(kindLabel));
  let sourceText = suggestion.sourceTag ? `[${suggestion.sourceTag}] ` : "";
  return {
    kindLaneText,
    kindLabel,
    sourceText,
  };
}
//@ chunk-8jypjjdf.js:9875-9945 placement
function fitSuggestionWidth(suggestion, columns, descriptionWidth, isScreenReader) {
  let floored = Math.floor(columns * 0.4);
  return descriptionWidth > floored
    ? floored + suggestionIndentWidth(suggestion, columns, isScreenReader)
    : descriptionWidth;
}
//@ chunk-8jypjjdf.js:9945-10181 placement
function suggestionIndentWidth(suggestion, columns, isScreenReader) {
  if (isScreenReader || suggestion.id.startsWith("emoji:")) return 0;
  let tagWidth = suggestion.tag ? bunStringWidth(`[${suggestion.tag}] `) : 0;
  let { kindLaneText, sourceText } = suggestionKindLabels(suggestion);
  let availableWidth =
    columns -
    Math.floor(columns * 0.4) -
    tagWidth -
    bunStringWidth(kindLaneText) -
    bunStringWidth(sourceText) -
    4 -
    (suggestion.description ? 1 : 0);
  let pointerWidth = bunStringWidth(`${figures_default.pointer} `);
  return availableWidth < 0 ? pointerWidth : Math.min(pointerWidth, availableWidth);
}
//@ chunk-8jypjjdf.js:10181-10434 placement
function suggestionRowHeight(suggestion, columns, descriptionWidth, isScreenReader) {
  if (getIcon_2(suggestion.id) || !suggestion.description) return 1;
  let descriptionColumns = fitSuggestionWidth(suggestion, columns, descriptionWidth, isScreenReader);
  let tagWidth = suggestion.tag ? bunStringWidth(`[${suggestion.tag}] `) : 0;
  let { kindLaneText, sourceText } = suggestionKindLabels(suggestion);
  let max = Math.max(
    0,
    columns - descriptionColumns - tagWidth - bunStringWidth(kindLaneText) - bunStringWidth(sourceText) - 4,
  );
  if (max <= 0) return 1;
  let trimmed = suggestion.description.replace(WHITESPACE_RE, " ").trim();
  return bunStringWidth(trimmed) > max ? 2 : 1;
}
//@ chunk-8jypjjdf.js:10434-10695 placement
function sanitizeSuggestion(suggestion) {
  let displayText = stripLineBreaks(suggestion.displayText);
  let description = suggestion.description && collapseWhitespace(suggestion.description);
  let tag = suggestion.tag && collapseWhitespace(suggestion.tag);
  let sourceTag = suggestion.sourceTag && collapseWhitespace(suggestion.sourceTag);
  if (
    displayText === suggestion.displayText &&
    description === suggestion.description &&
    tag === suggestion.tag &&
    sourceTag === suggestion.sourceTag
  )
    return suggestion;
  return {
    ...suggestion,
    displayText,
    description,
    tag,
    sourceTag,
  };
}
//@ chunk-8jypjjdf.js:10695-10900 placement
function splitAtWordWidth(text, descriptionWidth) {
  if (descriptionWidth <= 0 || bunStringWidth(text) <= descriptionWidth) return [text, ""];
  let head = truncateToWidthNoEllipsis(text, descriptionWidth);
  let sliced = text.slice(head.length);
  if (sliced.startsWith(" ")) return [head, sliced.trimStart()];
  let index = head.lastIndexOf(" ");
  if (index > 0) return [head.slice(0, index), text.slice(index + 1)];
  return [head, sliced];
}
//@ chunk-8jypjjdf.js:10900-10926 placement
var NON_LATIN_PATTERN = /[^\u0020-\u02ff]/;
//@ chunk-8jypjjdf.js:10926-11218 placement (2.1.88 match: findWordObject, 1)
function snapRangesToGraphemes(text, ranges) {
  if (ranges.length === 0 || !NON_LATIN_PATTERN.test(text)) return ranges;
  let boundaries = new Set();
  for (let { index } of getGraphemeSegmenter().segment(text)) boundaries.add(index);
  let graphemes = [];
  for (let [start, end] of ranges) {
    let nextStart = start;
    while (nextStart > 0 && !boundaries.has(nextStart)) nextStart--;
    let rangeEnd = end;
    while (rangeEnd < text.length && !boundaries.has(rangeEnd)) rangeEnd++;
    let last = graphemes.at(-1);
    if (last && nextStart <= last[1]) last[1] = Math.max(last[1], rangeEnd);
    else graphemes.push([nextStart, rangeEnd]);
  }
  return graphemes;
}
export { getArrowedSuggestionId, PromptInputFooterSuggestions, FooterSuggestionsMemo };
