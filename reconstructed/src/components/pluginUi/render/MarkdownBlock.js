/**
 * components/pluginUi/render/MarkdownBlock.tsx
 *
 * 2.1.316 新增。插件 ui.render 的 Markdown 渲染（表格、列表、流式）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bc20zedk.js (54)
 * attribution: placement 54
 */
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { repeatString, stripSuffix, countCharInString } from "../../../utils/stringUtils.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { wrapText, MarkdownTableView } from "../../MarkdownTable.js";
import {
  trimEntryText,
  moreRowsText,
  CODE_LIST_TAB_WIDTH,
  prehighlightCodeSegments,
  useSiteFocus,
  useHoverLit,
  groupOf,
} from "./elements.js";
import { BOLD_OPEN, BOLD_CLOSE } from "../../../ink/screen.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Ansi } from "../../../ink/components/AnsiText.js";
import {
  flattenNumberOnlyLists,
  orderedListRange,
  listMarkerText,
  endsWithHardBreak,
  leadingBlockToken,
  formatTokenWindowed,
  MAX_INDENT_SPACES,
  pluginMarkdownLexer,
  configureMarked,
  defangTokens,
} from "../../../utils/markdown.js";
import { useScrollViewportSize } from "../../ScrollViewportContext.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { Box, Text } from "../../../ink/components/Text.js";
import {
  createContext,
  useMemo,
  useContext,
  useSyncExternalStore,
  useRef,
  useState,
  createElement,
  useEffect,
  init_react_production,
  useLayoutEffect,
  useCallback,
} from "../../../../vendor/react/cjs/react.production.js";
import { isSmallMarkdown, lexMarkdownWindowed, lexInlineHtml } from "../../../utils/doctorContextWarnings.js";
import { controlCharTokens, stripControlCharsForInline } from "../../../utils/markdownInlineRendering.js";
import { logForDebugging } from "../../../utils/debug.js";
import { logError } from "../../../utils/log.js";
import { marked } from "../../../../vendor/marked/lib/marked.esm.js";
import { bunHashOf } from "../../../utils/pastedContent.js";
import { useSettingsState } from "../../../hooks/useSettings.js";
import { useFrameRegistry } from "../../../ink/renderModeContext.js";
import { getCliHighlightModule } from "../../../utils/cliHighlight.js";
import { getCachedHighlight } from "../../HighlightedCode/Fallback.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { useFallbackPermission } from "../../permissions/FallbackPermissionRequest.js";
import { stripPromptXMLTags } from "../../../utils/messages.js";
import {
  useIsScreenReaderEnabled,
  DOUBLE_CLICK_MS,
  MULTI_CLICK_MAX_MS,
  Button,
} from "../../../ink/components/ErrorBoundary.js";
import { subscribeFullscreenObserved, hasFullscreenBeenObserved } from "../../../utils/fullscreen.js";
import { OSC8_START, BEL } from "../../../utils/hyperlink.js";
import { EARLY_RETURN_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { sliceAnsi } from "../../../utils/sliceAnsi.js";
import { sequential } from "../../../utils/sequential.js";
import { endsWith, hasMarkdownSyntax, firstLine } from "../../Markdown.js";
import { useClock } from "../../../ink/components/ClockContext.js";
import { useSelection, useMeasured, useFinePointer } from "../../../ink/components/Input.js";
import { hrefInList } from "../../../plugins/functionHooks/ui/interactions.js";
import { pressFromTerminal, ActionKeysSeat } from "./actionKeys.js";
import { getFocusManager } from "../../../ink/focus.js";
import { APP_CONTEXT } from "../../../../vendor/convert-to-spaces/dist/index.js";
import {
  clearFocusedClient,
  focusStore,
  setFocusedClient,
} from "../../../plugins/functionHooks/surfaceClients.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { paneRegistry, focusPane } from "../../../plugins/functionHooks/panes.js";
import { usePreDispatchKeyHandler } from "../../../keybindings/useActionHandlers.js";
import { measureElement } from "../../../ink/hooks/useTerminalHooks.js";
import { SCROLL_JUMP_LINES } from "../../../ink/scrollConstants.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-bc20zedk.js:15392-16300 placement
function layoutMarkdownTable(props) {
  let $ = useMemoCache(9);
  let { headers, rows, terminalWidth, truncatedCount } = props;
  let lines;
  if ($[0] !== headers || $[1] !== rows || $[2] !== terminalWidth || $[3] !== truncatedCount) {
    lines = [];
    let min = Math.min(terminalWidth - 1, 40);
    let divider = repeatString("\u2500", min);
    rows.forEach((row) => {
      let rowLines = [];
      row.forEach((cell, index) => {
        let header = headers[index] || "";
        let trimmed = cell.trimEnd().replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
        if (!header && !trimmed) {
          return;
        }
        let cellWidth = header ? terminalWidth - bunStringWidth(header) - 3 : terminalWidth - 1;
        let continuationWidth = terminalWidth - 2 - 1;
        let wrapped = wrapText(trimmed, Math.max(cellWidth, 10));
        let firstLine = wrapped[0] || "";
        let cellLines;
        if (wrapped.length <= 1) cellLines = wrapped;
        else {
          let joined = wrapped.slice(1).map(trimEntryText).join(" ");
          let restLines = wrapText(joined, continuationWidth);
          cellLines = [firstLine, ...restLines];
        }
        rowLines.push(
          header ? `${BOLD_OPEN}${header}:${BOLD_CLOSE} ${cellLines[0] || ""}` : cellLines[0] || "",
        );
        for (let idx = 1; idx < cellLines.length; idx++) {
          let line = cellLines[idx];
          if (!line.trim()) {
            continue;
          }
          rowLines.push(`${line}`);
        }
      });
      if (rowLines.length === 0) {
        return;
      }
      if (lines.length > 0) lines.push(divider);
      lines.push(...rowLines);
    });
    if (truncatedCount > 0) {
      if (lines.length > 0) lines.push(divider);
      let moreText;
      if ($[5] !== truncatedCount) {
        moreText = moreRowsText(truncatedCount);
        $[5] = truncatedCount;
        $[6] = moreText;
      } else moreText = $[6];
      lines.push(moreText);
    }
    $[0] = headers;
    $[1] = rows;
    $[2] = terminalWidth;
    $[3] = truncatedCount;
    $[4] = lines;
  } else lines = $[4];
  const children = lines.join(`
`);
  let ansiElement;
  if ($[7] !== children) {
    ansiElement = jsxProd_default(Ansi, {
      children,
    });
    $[7] = children;
    $[8] = ansiElement;
  } else ansiElement = $[8];
  return ansiElement;
}
//@ chunk-bc20zedk.js:16300-16315 placement
var MARKDOWN_MAX_HEADING_LEVEL = 10;
var MARKDOWN_TABLE_PAD = 2;
//@ chunk-bc20zedk.js:16315-16433 placement
function listItemIndent(indent, markerWidth, room) {
  let max = Math.max(0, Math.min(indent, room - MARKDOWN_TABLE_PAD));
  let markerCell = Math.max(MARKDOWN_TABLE_PAD, Math.min(markerWidth, room - max));
  return {
    rowIndent: max,
    markerCell,
  };
}
//@ chunk-bc20zedk.js:16433-16450 placement
var MARKDOWN_MAX_TABLE_CELL = 300;
var MARKDOWN_CODE_INDENT = 64;
//@ chunk-bc20zedk.js:16450-16544 placement
function isBlockToken(token) {
  return (
    token.type === "code" || token.type === "blockquote" || token.type === "hr" || token.type === "table"
  );
}
//@ chunk-bc20zedk.js:16544-16928 placement
/**
 * 列表嵌套深度与条目数是否都在上限内（超限则不按列表渲染）。
 */
function isListWithinLimits(tokens) {
  let itemCount = 0;
  let stack = [];
  for (let token of tokens)
    if (token.type === "list")
      stack.push({
        list: token,
        depth: 1,
      });
  for (let entry = stack.pop(); entry; entry = stack.pop()) {
    if (entry.depth > MARKDOWN_CODE_INDENT) return false;
    for (let item of entry.list.items) {
      if (++itemCount > MARKDOWN_MAX_TABLE_CELL) return false;
      let isOpen = true;
      for (let token of flattenNumberOnlyLists(item).tokens)
        if (token.type === "list") {
          stack.push({
            list: token,
            depth: entry.depth + 1,
          });
          isOpen = false;
        } else if (isBlockToken(token)) {
          if (++itemCount > MARKDOWN_MAX_TABLE_CELL) return false;
          isOpen = false;
        } else if (token.type !== "space" && !isOpen) {
          if (++itemCount > MARKDOWN_MAX_TABLE_CELL) return false;
          isOpen = true;
        }
    }
  }
  return true;
}
//@ chunk-bc20zedk.js:16928-17130 placement
function MarkdownList(props) {
  let $ = useMemoCache(3);
  let { columns } = useScrollViewportSize(useTerminalSize());
  let room =
    Math.min(columns - CODE_LIST_TAB_WIDTH, props.maxProseWidth ?? Infinity) - MARKDOWN_MAX_HEADING_LEVEL;
  let listElement;
  if ($[0] !== props || $[1] !== room) {
    listElement = jsxProd_default(MarkdownListItems, {
      indent: 0,
      listDepth: 0,
      room,
      ...props,
    });
    $[0] = props;
    $[1] = room;
    $[2] = listElement;
  } else listElement = $[2];
  return listElement;
}
//@ chunk-bc20zedk.js:17130-17390 placement
function MarkdownListItems({ token, blankLineBefore, ...restProps }) {
  let range = orderedListRange(token);
  return token.items.map((item, index) =>
    jsxProd_default(
      renderMarkdownListItem,
      {
        item,
        marker: listMarkerText(
          restProps.listDepth,
          token.ordered
            ? {
                number: range.first + index,
                ...range,
              }
            : null,
        ),
        blankLineBefore: index === 0 ? blankLineBefore : endsWithBlockGap(token.items[index - 1]),
        ...restProps,
        tailWrap: index === token.items.length - 1 ? restProps.tailWrap : undefined,
      },
      index,
    ),
  );
}
//@ chunk-bc20zedk.js:17390-17593 placement
function endsWithBlockGap(tokens) {
  let last = tokens.tokens.at(-1);
  if (last?.type === "space" || last?.type === "heading" || last?.type === "table") return true;
  if (last?.type === "list") {
    let tokens = last.items.at(-1);
    return tokens ? endsWithBlockGap(tokens) : false;
  }
  return last?.type === "html" && endsWithHardBreak(last.raw);
}
//@ chunk-bc20zedk.js:17593-19099 placement
function renderMarkdownListItem({
  item,
  marker,
  indent,
  listDepth,
  blankLineBefore,
  theme,
  highlight,
  dimColor,
  italic,
  linkCap,
  isWindowed,
  tailWrap,
  room,
  maxProseWidth,
}) {
  let flattenedItem = flattenNumberOnlyLists(item);
  let rows = [];
  for (let token of flattenedItem.tokens) {
    if (token.type === "list") {
      rows.push({
        kind: "list",
        token,
      });
      continue;
    }
    let leadingToken = token.type === "blockquote" ? leadingBlockToken(token, highlight) : undefined;
    let formatted = formatTokenWindowed(leadingToken ?? token, theme, {
      listDepth: listDepth + 1,
      orderedListNumber: null,
      parent: flattenedItem,
      highlight,
      glueProse: false,
      linkCap,
      windowed: isWindowed,
    });
    if (isBlockToken(token)) {
      rows.push({
        kind: "block",
        text:
          token.type === "code"
            ? stripSuffix(
                formatted,
                `
`,
              )
            : (leadingToken ? formatted : formatted.replace(/^\n+/, "")).trimEnd(),
      });
      continue;
    }
    let last = rows.at(-1);
    if (last?.kind === "inline") last.text += formatted;
    else
      rows.push({
        kind: "inline",
        text: formatted,
      });
  }
  if (rows[0]?.kind !== "inline")
    rows.unshift({
      kind: "inline",
      text: "",
    });
  let markerWidth = bunStringWidth(marker) + 1;
  let indent_2 = Math.min(indent + markerWidth, MAX_INDENT_SPACES);
  let { rowIndent, markerCell } = listItemIndent(indent, markerWidth, room);
  let elements = [];
  let needsGap = blankLineBefore;
  let lastIndex = rows.length - 1;
  rows.forEach((row, index) => {
    let wrapMode = index === lastIndex ? tailWrap : undefined;
    if (row.kind === "inline") {
      let startsWithNewline = row.text.startsWith(`
`);
      let hasHardBreak = endsWithHardBreak(row.text);
      let text = row.text.replace(/^\n+/, "").trimEnd();
      if (!text && index > 0) {
        needsGap ||= row.text.includes(`
`);
        return;
      }
      let isFirst = index === 0;
      elements.push(
        jsxProd_default_2(
          Box,
          {
            flexDirection: "row",
            marginTop: needsGap || (!isFirst && startsWithNewline) ? 1 : 0,
            paddingLeft: isFirst ? rowIndent : rowIndent + markerCell,
            maxWidth: maxProseWidth,
            children: [
              isFirst &&
                jsxProd_default(Box, {
                  width: markerCell,
                  flexShrink: 0,
                  children: jsxProd_default(Text, {
                    dimColor,
                    italic,
                    children: marker,
                  }),
                }),
              jsxProd_default(Ansi, {
                dimColor,
                italic,
                wrap: wrapMode,
                children: text,
              }),
            ],
          },
          index,
        ),
      );
      needsGap = hasHardBreak;
    } else if (row.kind === "block") {
      elements.push(
        jsxProd_default(
          Box,
          {
            marginTop: needsGap ? 1 : 0,
            children: jsxProd_default(Ansi, {
              dimColor,
              italic,
              wrap: wrapMode,
              children: row.text,
            }),
          },
          index,
        ),
      );
      needsGap = false;
    } else {
      elements.push(
        jsxProd_default(
          MarkdownListItems,
          {
            token: row.token,
            blankLineBefore: needsGap,
            indent: indent_2,
            listDepth: listDepth + 1,
            room,
            theme,
            highlight,
            dimColor,
            italic,
            linkCap,
            isWindowed,
            tailWrap: wrapMode,
            maxProseWidth,
          },
          index,
        ),
      );
      needsGap = false;
    }
  });
  return elements;
}
//@ chunk-bc20zedk.js:19133-19164 placement
function selectText(state) {
  return state.text;
}
//@ chunk-bc20zedk.js:19164-19327 placement
var InsideMarkdownContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TOKEN_CACHE_MAX;
var MARKDOWN_SYNTAX_RE;
var NBSP_ENTITY;
deferInit("chunk-bc20zedk.js:19164", () => {
  InsideMarkdownContext = createContext(false);
  TOKEN_CACHE_MAX = 500;
  MARKDOWN_SYNTAX_RE =
    /[#*`|[>\-_~]|\n[\r\n]|\r\r|\r\n[\r\n]|(?:^|[\r\n]) {0,3}(?:\d+[.)]|\+) |(?:^|[\r\n]) {0,3}=+ *(?:[\r\n]|$)|https?:\/\/|www\./;
  NBSP_ENTITY = "&nbsp;";
});
//@ chunk-bc20zedk.js:19327-19446 placement
function plainParagraphTokens(text) {
  return {
    tokens: [
      {
        type: "paragraph",
        raw: text,
        text,
        tokens: [
          {
            type: "text",
            raw: text,
            text,
          },
        ],
      },
    ],
    isWindowed: !isSmallMarkdown(text),
  };
}
//@ chunk-bc20zedk.js:19446-19514 placement
function renderMarkdownSafe(source, text) {
  try {
    return lexMarkdownWindowed(source, text);
  } catch (error) {
    reportLexerError(error, text);
    return plainParagraphTokens(text);
  }
}
//@ chunk-bc20zedk.js:19514-19563 placement
function withWrappedTokens(lexed) {
  return {
    ...lexed,
    tokens: controlCharTokens(lexed.tokens),
  };
}
//@ chunk-bc20zedk.js:19563-19681 placement
function reportLexerError(error, text) {
  if (error instanceof RangeError)
    logForDebugging(`marked.lexer overflow on ${text.length} chars`, {
      level: "error",
    });
  else logError(error);
}
//@ chunk-bc20zedk.js:19681-19745 placement
function isMarkdownSafe(text) {
  try {
    return lexInlineHtml(marked, text);
  } catch (error) {
    reportLexerError(error, text);
    return true;
  }
}
//@ chunk-bc20zedk.js:19745-20064 placement
/**
 * 词法分析并按长度+哈希 LRU 缓存，无 Markdown 语法时直接作段落。
 */
function lexMarkdownCached(cache, source, promptMode) {
  let cacheKey = cache === null ? "" : `${promptMode ? "_" : ""}${source.length}:${bunHashOf(source)}`;
  let cached = cache?.get(cacheKey);
  if (cache !== null && cached) {
    cache.delete(cacheKey);
    cache.set(cacheKey, cached);
    return cached;
  }
  if (!MARKDOWN_SYNTAX_RE.test(source) && (promptMode || !source.includes(NBSP_ENTITY)))
    return withWrappedTokens(plainParagraphTokens(source));
  let lexed = withWrappedTokens(renderMarkdownSafe(promptMode ? pluginMarkdownLexer : marked, source));
  if (cache === null) return lexed;
  if (cache.size >= TOKEN_CACHE_MAX) {
    let oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(cacheKey, lexed);
  return lexed;
}
//@ chunk-bc20zedk.js:20064-20681 placement
/**
 * Markdown 渲染组件（语法高亮、宽度上限、词法缓存）。
 */
function MarkdownText_2(props) {
  let $ = useMemoCache(9);
  let settings = useSettingsState();
  let { highlightedCode } = useFrameRegistry();
  let highlight;
  if ($[0] !== settings.syntaxHighlightingDisabled) {
    highlight = settings.syntaxHighlightingDisabled ? null : getCliHighlightModule();
    $[0] = settings.syntaxHighlightingDisabled;
    $[1] = highlight;
  } else highlight = $[1];
  let highlighter = highlight;
  let skipHighlightCache = props.skipHighlightCache ?? false;
  let highlighterValue;
  x: {
    if (highlighter === null || skipHighlightCache) {
      highlighterValue = highlighter;
      break x;
    }
    let fallbackHighlighter;
    if ($[2] !== highlighter || $[3] !== highlightedCode) {
      fallbackHighlighter = {
        supportsLanguage: highlighter.supportsLanguage,
        highlight(contentElement, options) {
          let language = options?.language;
          return language
            ? getCachedHighlight(highlightedCode, highlighter, contentElement, language, options?.work)
            : contentElement;
        },
      };
      $[2] = highlighter;
      $[3] = highlightedCode;
      $[4] = fallbackHighlighter;
    } else fallbackHighlighter = $[4];
    highlighterValue = fallbackHighlighter;
  }
  let highlight_2 = highlighterValue;
  const maxProseWidth = props.capProseWidth ? settings.maxProseWidth : undefined;
  let markdownTextElement;
  if ($[5] !== highlight_2 || $[6] !== props || $[7] !== maxProseWidth) {
    markdownTextElement = jsxProd_default(MarkdownText, {
      ...props,
      highlight: highlight_2,
      maxProseWidth,
    });
    $[5] = highlight_2;
    $[6] = props;
    $[7] = maxProseWidth;
    $[8] = markdownTextElement;
  } else markdownTextElement = $[8];
  return markdownTextElement;
}
//@ chunk-bc20zedk.js:20681-23084 placement
function MarkdownText({
  children,
  color,
  dimColor,
  italic,
  monochrome,
  hint,
  promptMode = false,
  markLinks,
  linkSchemes,
  stripPromptTags = true,
  tailWrap,
  skipTokenCache = false,
  highlight,
  maxProseWidth,
}) {
  let [theme] = useTheme();
  configureMarked();
  let fallbackPermission = useFallbackPermission();
  let strippedChildren = useMemo(
    () => (stripPromptTags && !promptMode ? stripPromptXMLTags(children) : children),
    [children, stripPromptTags, promptMode],
  );
  let insideMarkdown = useContext(InsideMarkdownContext);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let fullscreenObserved = useSyncExternalStore(subscribeFullscreenObserved, hasFullscreenBeenObserved);
  let { markdownTokens } = useFrameRegistry();
  let children_2 = useMemo(() => {
    let lexed = lexMarkdownCached(skipTokenCache ? null : markdownTokens, strippedChildren, promptMode);
    let isWindowed = insideMarkdown || lexed.isWindowed;
    let linkCap = fallbackPermission && !isWindowed;
    let tokens = linkSchemes === undefined ? lexed.tokens : structuredClone(lexed.tokens);
    if (linkSchemes !== undefined) defangTokens(tokens, linkSchemes);
    let highlight_2 = prehighlightCodeSegments(highlight, tokens, theme);
    let blocks = [];
    let pendingText = "";
    let lastKind = "none";
    let endsHardBreak = false;
    let hintShown = false;
    let hintText = hint ? `\xB7\xA0${hint}` : undefined;
    function pushBlock(node, kind) {
      blocks.push(node);
      lastKind = kind;
      endsHardBreak = false;
    }
    function wrapBlock(children, marginTop, kind) {
      return jsxProd_default(
        Box,
        {
          marginTop,
          maxWidth: kind === "prose" ? maxProseWidth : undefined,
          children,
        },
        blocks.length,
      );
    }
    function hintSuffix() {
      if (!hintText || hintShown) return null;
      hintShown = true;
      return jsxProd_default_2(Text, {
        color: "subtle",
        children: [" ", hintText],
      });
    }
    function flushText(wrap, final = false) {
      if (!pendingText) return;
      let startsBlank = pendingText.startsWith(`
`);
      let hardBreak = endsWithHardBreak(pendingText);
      let text = pendingText.replace(/^\n+/, "").trimEnd();
      pendingText = "";
      if (linkCap && markLinks !== undefined)
        for (let [linkText, linkUrl] of markLinks)
          text = text.replaceAll(linkText, `${OSC8_START}${linkUrl}${BEL}${linkText}${OSC8_START}${BEL}`);
      if (!text) {
        endsHardBreak = true;
        return;
      }
      let marginTop =
        lastKind === "none" ? 0 : (lastKind === "list" || lastKind === "code") && !startsBlank ? 0 : 1;
      let ansiText = jsxProd_default(Ansi, {
        dimColor,
        italic,
        monochrome,
        wrap,
        children: text,
      });
      let suffix = final ? hintSuffix() : null;
      pushBlock(
        wrapBlock(
          color || suffix
            ? jsxProd_default_2(Text, {
                color,
                wrap,
                children: [ansiText, suffix],
              })
            : ansiText,
          marginTop,
          "prose",
        ),
        "prose",
      );
      endsHardBreak = hardBreak;
    }
    function gapBefore(kind) {
      return lastKind === "none" ? 0 : kind === "block" || lastKind === "block" || endsHardBreak ? 1 : 0;
    }
    function pushBlockWithGap(children, kind) {
      flushText();
      pushBlock(wrapBlock(children, gapBefore(kind), kind), kind);
    }
    function pushList(token, tailWrap) {
      flushText();
      pushBlock(
        jsxProd_default(
          MarkdownList,
          {
            token,
            blankLineBefore: gapBefore("list") > 0,
            theme,
            highlight: highlight_2,
            dimColor,
            italic,
            linkCap,
            isWindowed,
            tailWrap,
            maxProseWidth,
          },
          blocks.length,
        ),
        "list",
      );
    }
    let lastIndex = tokens.findLastIndex((token) => token.type !== "space");
    let listsOk = !isScreenReaderEnabled && !promptMode && isListWithinLimits(tokens);
    tokens.forEach((token, index) => {
      if (token.type === "table")
        pushBlockWithGap(
          jsxProd_default(MarkdownTableView, {
            token,
            highlight,
            linkCap,
            isWindowed,
          }),
          "block",
        );
      else if (token.type === "list" && listsOk) pushList(token, index === lastIndex ? tailWrap : undefined);
      else if (token.type === "blockquote")
        pushBlockWithGap(
          jsxProd_default(MarkdownToken, {
            token,
            theme,
            highlight: highlight_2,
            dimColor,
            linkCap,
            isWindowed,
            isScreenReader: isScreenReaderEnabled,
            maxWidth: maxProseWidth,
          }),
          "block",
        );
      else {
        let text = formatTokenWindowed(token, theme, {
          listDepth: 0,
          orderedListNumber: null,
          parent: null,
          highlight: highlight_2,
          glueProse: false,
          linkCap,
          screenReader: isScreenReaderEnabled,
          promptMode,
          windowed: isWindowed,
        });
        if (maxProseWidth !== undefined && token.type === "code") {
          let isLast = index === lastIndex;
          let wrap = isLast ? tailWrap : undefined;
          let suffix = isLast ? hintSuffix() : null;
          let ansiText = jsxProd_default(Ansi, {
            dimColor,
            italic,
            monochrome,
            wrap,
            children: stripSuffix(
              text,
              `
`,
            ),
          });
          pushBlockWithGap(
            color || suffix
              ? jsxProd_default_2(Text, {
                  color,
                  wrap,
                  children: [ansiText, suffix],
                })
              : ansiText,
            "code",
          );
        } else pendingText += text;
      }
    });
    flushText(tailWrap, true);
    if (promptMode && blocks.length === 0 && strippedChildren.trim()) {
      pendingText = stripControlCharsForInline(strippedChildren);
      flushText(tailWrap, true);
    }
    if (hintText && !hintShown)
      pushBlock(
        wrapBlock(
          jsxProd_default(Text, {
            color: "subtle",
            children: hintText,
          }),
          0,
          "prose",
        ),
        "prose",
      );
    return blocks;
  }, [
    strippedChildren,
    color,
    dimColor,
    italic,
    monochrome,
    hint,
    linkSchemes,
    highlight,
    theme,
    fallbackPermission,
    insideMarkdown,
    isScreenReaderEnabled,
    tailWrap,
    skipTokenCache,
    markdownTokens,
    promptMode,
    markLinks,
    fullscreenObserved,
    maxProseWidth,
  ]);
  return jsxProd_default(Box, {
    flexDirection: "column",
    children: children_2,
  });
}
//@ chunk-bc20zedk.js:23084-23093 placement
var MARKDOWN_LIST_INDENT = 2;
//@ chunk-bc20zedk.js:23093-24825 placement
function MarkdownToken(props) {
  let $ = useMemoCache(21);
  let { token, theme, highlight, dimColor, linkCap, isWindowed, isScreenReader, maxWidth } = props;
  let leadingToken;
  if ($[0] !== highlight || $[1] !== token) {
    leadingToken = leadingBlockToken(token, highlight);
    $[0] = highlight;
    $[1] = token;
    $[2] = leadingToken;
  } else leadingToken = $[2];
  let leadingBlock = leadingToken;
  const blockToken = leadingBlock ?? token;
  let earlyResult;
  let result;
  if (
    $[3] !== dimColor ||
    $[4] !== leadingBlock ||
    $[5] !== highlight ||
    $[6] !== isScreenReader ||
    $[7] !== isWindowed ||
    $[8] !== linkCap ||
    $[9] !== maxWidth ||
    $[10] !== blockToken.tokens ||
    $[11] !== theme
  ) {
    result = EARLY_RETURN_SENTINEL;
    Y: {
      let formatPart;
      if (
        $[14] !== highlight ||
        $[15] !== isScreenReader ||
        $[16] !== isWindowed ||
        $[17] !== linkCap ||
        $[18] !== maxWidth ||
        $[19] !== theme
      ) {
        formatPart = (part) => ({
          code: part.type === "code",
          fullWidth: maxWidth !== undefined && hasCodeOrTable(part),
          text: formatTokenWindowed(part, theme, {
            listDepth: 0,
            orderedListNumber: null,
            parent: null,
            highlight,
            glueProse: false,
            linkCap,
            screenReader: isScreenReader,
            windowed: isWindowed,
            quotesAround: 1,
          }),
        });
        $[14] = highlight;
        $[15] = isScreenReader;
        $[16] = isWindowed;
        $[17] = linkCap;
        $[18] = maxWidth;
        $[19] = theme;
        $[20] = formatPart;
      } else formatPart = $[20];
      let mapped = blockToken.tokens.map(formatPart);
      if (maxWidth === undefined || isScreenReader || !mapped.some(sliceAnsi)) {
        let joined = mapped.map(selectText).join("");
        let children = sequential.italic((leadingBlock ? joined : joined.replace(/^\n+/, "")).trimEnd());
        result = jsxProd_default(Box, {
          borderStyle: "quote",
          borderTop: false,
          borderBottom: false,
          borderRight: false,
          borderDimColor: true,
          paddingLeft: 1,
          maxWidth,
          children: jsxProd_default(Ansi, {
            dimColor,
            children,
          }),
        });
        break Y;
      }
      let segments = [];
      for (const part of mapped) {
        let last = segments.at(-1);
        if (last && !last.fullWidth && !part.fullWidth) last.text = last.text + part.text;
        else
          segments.push({
            ...part,
          });
      }
      let lines = [];
      let lineCount = 0;
      for (const segment of segments) {
        let text =
          segment.code || (leadingBlock !== undefined && segment === segments[0])
            ? segment.text
            : segment.text.replace(/^\n+/, "");
        let trimmedText = segment.code
          ? stripSuffix(
              text,
              `
`,
            )
          : text.trimEnd();
        if (!trimmedText) {
          lineCount =
            lineCount +
            countCharInString(
              segment.text,
              `
`,
            );
          continue;
        }
        lineCount = lineCount + (segment.text.length - text.length);
        lines.push(
          jsxProd_default(
            Box,
            {
              marginTop: lines.length > 0 ? Math.max(0, lineCount - 1) : 0,
              maxWidth: segment.fullWidth ? undefined : maxWidth - MARKDOWN_LIST_INDENT,
              children: jsxProd_default(Ansi, {
                dimColor,
                children: sequential.italic(trimmedText),
              }),
            },
            lines.length,
          ),
        );
        lineCount = countCharInString(
          text.slice(trimmedText.length),
          `
`,
        );
      }
      earlyResult = jsxProd_default(Box, {
        flexDirection: "column",
        borderStyle: "quote",
        borderTop: false,
        borderBottom: false,
        borderRight: false,
        borderDimColor: true,
        paddingLeft: 1,
        children: lines,
      });
    }
    $[3] = dimColor;
    $[4] = leadingBlock;
    $[5] = highlight;
    $[6] = isScreenReader;
    $[7] = isWindowed;
    $[8] = linkCap;
    $[9] = maxWidth;
    $[10] = blockToken.tokens;
    $[11] = theme;
    $[12] = earlyResult;
    $[13] = result;
  } else {
    earlyResult = $[12];
    result = $[13];
  }
  if (result !== EARLY_RETURN_SENTINEL) return result;
  return earlyResult;
}
//@ chunk-bc20zedk.js:24825-25060 placement
function hasCodeOrTable(token) {
  let stack = [token];
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    if (current.type === "code" || current.type === "table") return true;
    let children =
      current.type === "list"
        ? current.items
        : current.type === "blockquote" || current.type === "list_item"
          ? (current.tokens ?? [])
          : [];
    for (let child of children) stack.push(child);
  }
  return false;
}
//@ chunk-bc20zedk.js:25060-25072 placement
var MARKDOWN_MAX_CHARS = 4096;
//@ chunk-bc20zedk.js:25072-25198 placement
function createStreamState() {
  return {
    chunks: [],
    frozenSource: "",
    gapAfterChunks: false,
    stablePrefix: "",
    openFence: null,
    openTable: null,
    isLinkless: false,
  };
}
//@ chunk-bc20zedk.js:25198-25239 placement
var FENCED_CODE_RE = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/gm;
//@ chunk-bc20zedk.js:25239-25346 placement
function closesFence(line, closingFence, trailingText) {
  let fence = line.match(/^`+|^~+/)?.[0] ?? "";
  return closingFence[0] === fence[0] && closingFence.length >= fence.length && trailingText.trim() === "";
}
//@ chunk-bc20zedk.js:25346-25470 placement
function updateOpenFence(openFence, fence) {
  let updated = openFence;
  for (let match of fence.matchAll(FENCED_CODE_RE))
    if (updated === null) updated = match[1] + match[2].trim();
    else if (closesFence(updated, match[1], match[2])) updated = null;
  return updated;
}
//@ chunk-bc20zedk.js:25470-25604 placement
function closingFenceEnd(text, line) {
  for (let match of text.matchAll(FENCED_CODE_RE)) {
    let matchEnd = match.index + match[0].length;
    if (
      text[matchEnd] !==
      `
`
    )
      continue;
    if (closesFence(line, match[1], match[2])) return matchEnd + 1;
  }
  return -1;
}
//@ chunk-bc20zedk.js:25604-26077 placement
/**
 * 把流式文本前缀冻结为一个渲染块，返回剩余部分。
 */
function freezeStreamChunk(chunk, text, length, prefixOnly) {
  let head = text.substring(0, length);
  let children =
    (chunk.openFence !== null
      ? chunk.openFence +
        `
`
      : (chunk.openTable ?? "")) + head;
  let skipHighlightCache = chunk.openFence !== null || !prefixOnly;
  chunk.chunks = [
    ...chunk.chunks,
    jsxProd_default(
      Box,
      {
        marginTop: chunk.chunks.length > 0 && chunk.gapAfterChunks ? 1 : 0,
        children: jsxProd_default(MarkdownText_2, {
          skipTokenCache: true,
          skipHighlightCache,
          capProseWidth: true,
          children,
        }),
      },
      chunk.chunks.length,
    ),
  ];
  chunk.openFence = updateOpenFence(chunk.openFence, head);
  chunk.frozenSource += head;
  chunk.gapAfterChunks = prefixOnly;
  chunk.isLinkless ||= !prefixOnly || chunk.openFence !== null;
  chunk.stablePrefix = "";
  if (prefixOnly) chunk.openTable = null;
  return text.substring(length);
}
//@ chunk-bc20zedk.js:26077-26089 placement
var MAX_BASH_COMMAND_SCAN_CHARS = 1536;
//@ chunk-bc20zedk.js:26089-26258 placement = getFileExtensionsFromBashCommand (1)
function getFileExtensionsFromBashCommand(command) {
  let index = command.lastIndexOf(`
`);
  if (index < MARKDOWN_MAX_CHARS / 2)
    index = command.lastIndexOf(" ", command.length - MAX_BASH_COMMAND_SCAN_CHARS);
  if (index < MARKDOWN_MAX_CHARS / 2) {
    index = command.length - MAX_BASH_COMMAND_SCAN_CHARS;
    let code = command.charCodeAt(index + 1);
    if (code >= 56320 && code <= 57343) index--;
  }
  return index + 1;
}
//@ chunk-bc20zedk.js:26258-26324 placement
var TABLE_HEADER_RE = /^ {0,3}\|[^\n]*\n[ |:\r-]*$/;
var TABLE_ROW_RE = /^ {0,3}\|/;
var MARKDOWN_TOKEN_LIMIT = 1024;
var MARKDOWN_NEST_DEPTH = 64;
//@ chunk-bc20zedk.js:26324-28498 placement
function StreamingMarkdown({ children, hideTrailingLine = false }) {
  configureMarked();
  let source = stripPromptXMLTags(children);
  let streamState = useRef(createStreamState()).current;
  let openTablePending = false;
  let atTop = false;
  if (!source.startsWith(streamState.frozenSource)) Object.assign(streamState, createStreamState());
  streamState.isLinkless ||= !isSmallMarkdown(source);
  let tail = source.substring(streamState.frozenSource.length);
  if (!tail.startsWith(streamState.stablePrefix)) streamState.stablePrefix = "";
  if (streamState.openFence !== null) {
    let fenceEnd = closingFenceEnd(tail, streamState.openFence);
    if (fenceEnd >= 0) tail = freezeStreamChunk(streamState, tail, fenceEnd, true);
    else if (tail.length > MARKDOWN_MAX_CHARS)
      tail = freezeStreamChunk(streamState, tail, getFileExtensionsFromBashCommand(tail), false);
  }
  if (streamState.openFence === null) {
    let prefixLength = streamState.stablePrefix.length;
    let openTable = streamState.openTable ?? "";
    let combined = openTable + tail.substring(prefixLength);
    let lineStart =
      combined.lastIndexOf(`
`) + 1;
    let candidate =
      openTable !== "" || TABLE_ROW_RE.test(combined.substring(lineStart))
        ? combined.substring(0, lineStart)
        : combined;
    let { tokens, isWindowed } = renderMarkdownSafe(marked, candidate);
    streamState.isLinkless ||= isWindowed;
    let lastTokenIndex = tokens.length - 1;
    while (lastTokenIndex >= 0 && tokens[lastTokenIndex].type === "space") lastTokenIndex--;
    streamState.isLinkless ||= !endsWith(tokens, candidate);
    let last = tokens.at(-1);
    let tableHardBreak = last?.type === "table" && endsWithHardBreak(candidate);
    let stableEnd = tableHardBreak
      ? candidate.length
      : lastTokenIndex > 0
        ? hasMarkdownSyntax(tokens, lastTokenIndex, candidate)
        : 0;
    let tableToken = last?.type === "table" && !tableHardBreak ? last : null;
    openTablePending =
      tableToken !== null ||
      (last?.type === "paragraph" && TABLE_HEADER_RE.test(last.raw + combined.substring(candidate.length)));
    atTop = stableEnd > 0 || lastTokenIndex === 0;
    let firstToken = tokens[0];
    if (firstToken?.type !== "table") streamState.openTable = null;
    if (openTable !== "" && stableEnd >= openTable.length) {
      if (firstToken?.type === "table" && firstToken.rows.length === 0) {
        streamState.openTable = null;
        streamState.gapAfterChunks = true;
      } else tail = freezeStreamChunk(streamState, tail, stableEnd - openTable.length, true);
    } else if (openTable === "" && stableEnd > 0) {
      streamState.stablePrefix = tail.substring(0, prefixLength + stableEnd);
      streamState.isLinkless ||= isMarkdownSafe(tail.substring(prefixLength, prefixLength + stableEnd));
    }
    if (streamState.stablePrefix.length > MARKDOWN_MAX_CHARS)
      tail = freezeStreamChunk(streamState, tail, streamState.stablePrefix.length, true);
    if (tail.length - streamState.stablePrefix.length > MARKDOWN_MAX_CHARS) {
      let prefixLength = streamState.stablePrefix.length;
      let fileExtensionsFromBashCommand = getFileExtensionsFromBashCommand(tail.substring(prefixLength));
      let openTableHeader =
        tail[prefixLength + fileExtensionsFromBashCommand - 1] ===
          `
` &&
        tableToken !== null &&
        tableToken.header.length <= MARKDOWN_NEST_DEPTH
          ? firstLine(tableToken.raw)
          : "";
      tail = freezeStreamChunk(streamState, tail, prefixLength + fileExtensionsFromBashCommand, false);
      streamState.openTable =
        openTableHeader !== "" && openTableHeader.length <= MARKDOWN_TOKEN_LIMIT ? openTableHeader : null;
    }
  }
  let stablePrefix = streamState.stablePrefix;
  let rest = tail.substring(stablePrefix.length);
  let hasStableText = stablePrefix.trim() !== "";
  let openPrefix =
    streamState.openFence !== null
      ? streamState.openFence +
        `
`
      : (streamState.openTable ?? "");
  let pendingText = rest && openPrefix + rest;
  if (hideTrailingLine && openTablePending) {
    pendingText = pendingText.substring(
      0,
      pendingText.lastIndexOf(`
`) + 1,
    );
    if (
      atTop &&
      countCharInString(
        pendingText.trim(),
        `
`,
      ) < 2
    )
      pendingText = "";
  }
  let missingNewline = !pendingText.endsWith(`
`);
  let pendingNode = pendingText
    ? jsxProd_default(MarkdownText_2, {
        tailWrap: hideTrailingLine && missingNewline ? "wrap-stream" : undefined,
        skipTokenCache: true,
        skipHighlightCache: true,
        capProseWidth: true,
        children: pendingText,
      })
    : null;
  if (streamState.chunks.length === 0)
    return jsxProd_default(InsideMarkdownContext.Provider, {
      value: streamState.isLinkless,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          hasStableText &&
            jsxProd_default(MarkdownText_2, {
              skipTokenCache: true,
              capProseWidth: true,
              children: stablePrefix,
            }),
          pendingNode,
        ],
      }),
    });
  let gapRows = streamState.gapAfterChunks ? 1 : 0;
  return jsxProd_default(InsideMarkdownContext.Provider, {
    value: streamState.isLinkless,
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        streamState.chunks,
        hasStableText &&
          jsxProd_default(Box, {
            marginTop: gapRows,
            children: jsxProd_default(MarkdownText_2, {
              skipTokenCache: true,
              capProseWidth: true,
              children: stablePrefix,
            }),
          }),
        pendingNode &&
          jsxProd_default(Box, {
            marginTop: hasStableText ? 1 : gapRows,
            children: pendingNode,
          }),
      ],
    }),
  });
}
//@ chunk-bc20zedk.js:28498-28539 placement
var MARKDOWN_LINK_SCHEMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:28498", () => {
  MARKDOWN_LINK_SCHEMES = new Set(["https", "http", "file"]);
});
//@ chunk-bc20zedk.js:28539-29466 placement
function MarkdownBlock({ text, dimColor, press, part, elementKey, pressableLinks }) {
  let clock = useClock();
  let selection = useSelection();
  let [mountTime] = useState(() => clock.now());
  let releaseRef = useRef(null);
  let handlersRef = useRef({
    press,
    pressableLinks,
  });
  let markdownElement = createElement(MarkdownText_2, {
    dimColor,
    linkSchemes: MARKDOWN_LINK_SCHEMES,
    stripPromptTags: false,
    children: text,
  });
  handlersRef.current = {
    press,
    pressableLinks,
  };
  useEffect(() => () => releaseRef.current?.(), []);
  if (press === undefined)
    return elementKey === undefined
      ? markdownElement
      : createElement(
          Box,
          {
            flexDirection: "column",
            elementKey,
            elementPlugin: part?.plugin,
          },
          markdownElement,
        );
  return createElement(
    Box,
    {
      flexDirection: "column",
      elementKey,
      elementPlugin: press.plugin,
      onClick: (event) => {
        let hyperlinkUrl = event.hyperlinkUrl;
        if (!(
          hyperlinkUrl !== undefined &&
          !(event.mods.ctrl || event.mods.alt) &&
          hrefInList(hyperlinkUrl, pressableLinks)
        )) {
          event.allowDefault();
          return;
        }
        if (event.isWindowActivation || clock.now() - mountTime < DOUBLE_CLICK_MS) {
          event.dropAsStray();
          return;
        }
        event.stopImmediatePropagation();
        releaseRef.current?.();
        let unsubscribeSelection = selection.subscribe(() => {
          if (selection.hasSelection()) releaseRef.current?.();
        });
        let timeout = clock.setTimeout(() => {
          releaseRef.current = null;
          unsubscribeSelection();
          let handlers = handlersRef.current;
          if (
            handlers.press !== undefined &&
            hrefInList(hyperlinkUrl, handlers.pressableLinks) &&
            handlers.press
          )
            pressFromTerminal(handlers.press, {
              href: hyperlinkUrl,
            });
        }, MULTI_CLICK_MAX_MS);
        releaseRef.current = () => {
          releaseRef.current = null;
          unsubscribeSelection();
          timeout();
        };
      },
    },
    markdownElement,
  );
}
//@ chunk-bc20zedk.js:29466-29470 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:29466", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:29470-29474 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:29470", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:29474-29491 placement
var HotkeySeat; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:29474", () => {
  HotkeySeat = createContext(null);
});
//@ chunk-bc20zedk.js:29491-29606 placement
function releaseInkFocus(node) {
  if (!node) return;
  let focusManager = getFocusManager(node);
  let activeElement = focusManager.activeElement ?? undefined;
  while (activeElement && activeElement !== node) activeElement = activeElement.parentNode;
  if (activeElement === node) focusManager.blur();
}
//@ chunk-bc20zedk.js:29606-30537 placement
function PressButton({
  plugin,
  handle,
  element,
  label,
  hotkey,
  action,
  plain,
  dimColor,
  variant,
  hover,
  held,
}) {
  let { hasKeyboardFocus, ref } = useSiteFocus({
    plugin,
    handle,
  });
  let buttonRef = useRef(null);
  let hotkeySeat = useContext(HotkeySeat);
  useLayoutEffect(() => {
    let node = buttonRef.current;
    return hotkey !== undefined && hotkeySeat !== null && node !== null
      ? hotkeySeat(hotkey, node)
      : undefined;
  }, [hotkeySeat, hotkey]);
  let { overrides, handlers } = useHoverLit(groupOf(plugin, hover), hover, "Box");
  return createElement(
    Box,
    {
      ref: buttonRef,
      flexShrink: 0,
      alignSelf: "flex-start",
      elementKey: element,
      elementPlugin: plugin,
      onClick: (event) => {
        releaseInkFocus(buttonRef.current);
        event.stopImmediatePropagation();
      },
      ...handlers,
    },
    action !== undefined &&
      createElement(ActionKeysSeat, {
        plugin,
        handle,
        action,
      }),
    createElement(Button, {
      ref,
      tabIndex: -1,
      flexShrink: 0,
      alignSelf: "flex-start",
      onAction: () =>
        pressFromTerminal({
          plugin,
          handle,
        }),
      children: (state) => {
        let isActive = state.focused || state.hovered || hasKeyboardFocus;
        let dimColor_2 = dimColor === true && !isActive;
        let isPlain = plain === true;
        let hasNoHotkey = hotkey === undefined;
        let hasHeld = held.length > 0;
        let labelParts = hasHeld ? held : [label];
        return isPlain
          ? createElement(
              Text,
              {
                inverse: isActive,
                dimColor: dimColor_2,
                ...overrides,
              },
              hasNoHotkey
                ? ""
                : createElement(
                    Text,
                    {
                      color: "suggestion",
                    },
                    hotkey,
                  ),
              hasNoHotkey ? "" : ": ",
              ...labelParts,
            )
          : createElement(
              Text,
              {
                inverse: isActive,
                bold: true,
                dimColor: dimColor_2,
                color: variant === "primary" ? "suggestion" : undefined,
                ...overrides,
              },
              ...(hasHeld ? ["[ ", ...held, " ]"] : [`[ ${label} ]`]),
            );
      },
    }),
  );
}
//@ chunk-bc20zedk.js:30537-30541 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:30537", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:30541-30545 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:30541", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:30545-30549 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:30545", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:30549-30657 placement
function mouseButtonName(button) {
  switch (button) {
    case 0:
      return "left";
    case 1:
      return "middle";
    case 2:
      return "right";
    case undefined:
      return;
  }
}
//@ chunk-bc20zedk.js:30657-30661 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:30657", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:30661-30665 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:30661", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:30665-30848 placement
/**
 * 点击发生在元素外（非窗口激活）时回调。
 */
function useClickOutside(config) {
  let ref = useRef(null);
  let { subscribeClicks } = useContext(APP_CONTEXT);
  useEffect(
    () =>
      subscribeClicks((event, node) => {
        let unsubscribe = event ?? undefined;
        while (unsubscribe && unsubscribe !== ref.current) unsubscribe = unsubscribe.parentNode;
        if (!unsubscribe && node?.isWindowActivation !== true) config();
      }),
    [config, subscribeClicks],
  );
  return ref;
}
//@ chunk-bc20zedk.js:30848-31093 placement
var KEY_NAME_PAIRS = [
  ["upArrow", "up"],
  ["downArrow", "down"],
  ["leftArrow", "left"],
  ["rightArrow", "right"],
  ["pageUp", "pageup"],
  ["pageDown", "pagedown"],
  ["home", "home"],
  ["end", "end"],
  ["return", "return"],
  ["tab", "tab"],
  ["backspace", "backspace"],
  ["delete", "delete"],
];
//@ chunk-bc20zedk.js:31093-31290 placement
function toPluginKeyEvent(input, key) {
  if (key.wheelUp || key.wheelDown) return;
  let keyName = KEY_NAME_PAIRS.find(([pairKey]) => key[pairKey])?.[1] ?? (input === " " ? "space" : input);
  return keyName === ""
    ? undefined
    : {
        key: keyName,
        ...(key.ctrl && {
          ctrl: true,
        }),
        ...(key.shift && {
          shift: true,
        }),
        ...(key.meta && {
          meta: true,
        }),
      };
}
//@ chunk-bc20zedk.js:31290-31703 placement
/**
 * 插件面板获得焦点时转发按键，Esc/Ctrl+C 释放焦点。
 */
function usePluginKeyFocus(instance) {
  let clearFocus = useCallback(() => clearFocusedClient(instance.id), [instance]);
  let clickOutside = useClickOutside(clearFocus);
  let isFocused = useStoreSelector(focusStore, (state) => state.focusedId) === instance.id;
  let focusedPaneId = useStoreSelector(paneRegistry(), (state) => state.focusedId);
  useEffect(() => {
    if (focusedPaneId !== null && isFocused) setFocusedClient(null);
  }, [focusedPaneId, isFocused]);
  useEffect(() => clearFocus, [clearFocus]);
  usePreDispatchKeyHandler((input, key, keyEvent) => {
    let isFocusedClient = focusStore.getState().focusedId === instance.id;
    let isExitKey = key.escape || (key.ctrl && (input === "c" || input === "d"));
    if (!isFocusedClient) return false;
    if (!instance.acceptsKeys()) {
      clearFocus();
      return false;
    }
    if (isExitKey) {
      setFocusedClient(null);
      return key.escape;
    }
    let pluginKeyEvent = toPluginKeyEvent(input === "" ? keyEvent : input, key);
    if (pluginKeyEvent === undefined) return false;
    instance.key(pluginKeyEvent);
    return true;
  });
  return clickOutside;
}
//@ chunk-bc20zedk.js:31703-32807 placement
function RenderHostElement({ host, instance, snapshot }) {
  let { rebuild, props, width, height, flexGrow, plugin, elementKey } = host;
  let pluginKeyFocus = usePluginKeyFocus(instance);
  useEffect(() => {
    instance.setProps(props);
  }, [instance, props]);
  useEffect(() => {
    instance.drawnAgain();
  }, [instance, host.drawn]);
  let measuredWidth = useMeasured(() =>
    pluginKeyFocus.current === null ? 0 : measureElement(pluginKeyFocus.current).width,
  );
  let measuredHeight = useMeasured(() =>
    pluginKeyFocus.current === null ? 0 : measureElement(pluginKeyFocus.current).height,
  );
  useLayoutEffect(() => {
    instance.laidOut();
  });
  useEffect(() => {
    instance.resize(measuredWidth, measuredHeight);
  }, [instance, measuredWidth, measuredHeight]);
  let pointerPosRef = useRef({
    x: 0,
    y: 0,
  });
  let isDrawn = snapshot.status === "drawn";
  let acceptsPointer = isDrawn && instance.acceptsPointer();
  let isInteractive = acceptsPointer || (isDrawn && instance.acceptsKeys());
  useFinePointer(acceptsPointer);
  function handlePointer(event) {
    if (event.type === "down" && instance.acceptsKeys()) {
      focusPane(null);
      setFocusedClient(instance.id);
    }
    pointerPosRef.current = {
      x: event.localCol,
      y: event.localRow,
    };
    instance.pointer({
      type: event.type,
      x: event.localCol,
      y: event.localRow,
      ...(event.fine && {
        fine: {
          x: event.fine.col,
          y: event.fine.row,
        },
      }),
      ...(event.button !== undefined && {
        button: mouseButtonName(event.button),
      }),
      ...(event.shift && {
        shift: true,
      }),
      ...(event.alt && {
        alt: true,
      }),
      ...(event.ctrl && {
        ctrl: true,
      }),
    });
  }
  return createElement(
    Box,
    {
      ref: pluginKeyFocus,
      flexDirection: "column",
      flexShrink: 0,
      width,
      height,
      flexGrow,
      overflow: "hidden",
      elementKey,
      elementPlugin: plugin,
      ...(isInteractive && {
        onPointer: handlePointer,
        onMouseEnter: () => {
          instance.pointer({
            type: "enter",
            ...pointerPosRef.current,
          });
        },
        onMouseLeave: () => {
          instance.pointer({
            type: "leave",
            ...pointerPosRef.current,
          });
        },
      }),
    },
    isDrawn && rebuild(snapshot.tree),
    snapshot.status === "failed" &&
      createElement(
        Text,
        {
          dimColor: true,
          wrap: "truncate-end",
        },
        snapshot.text,
      ),
  );
}
//@ chunk-bc20zedk.js:32807-32811 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:32807", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:32811-33028 placement
function createTicker(clock) {
  if (clock === null)
    return {
      every: (ms, callback) => {
        let interval = setInterval(callback, Math.max(ms, SCROLL_JUMP_LINES));
        return () => clearInterval(interval);
      },
    };
  return {
    every: (ms, callback) => {
      let lastTick = clock.now();
      return clock.subscribeKeepAlive(() => {
        let now = clock.now();
        if (now - lastTick >= ms) {
          lastTick = now;
          callback();
        }
      });
    },
  };
}
export {
  StreamingMarkdown,
  MarkdownText_2,
  useClickOutside,
  HotkeySeat,
  MARKDOWN_LINK_SCHEMES,
  MarkdownBlock,
  PressButton,
  releaseInkFocus,
  layoutMarkdownTable,
  createTicker,
  RenderHostElement,
};
