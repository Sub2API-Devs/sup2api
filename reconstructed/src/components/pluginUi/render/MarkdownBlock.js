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
import { w } from "../../../../vendor/react/compiler-runtime.js";
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
  qt,
  Q,
  Se,
  yt,
  R,
  y,
  Vc,
  P,
  init_react_production,
  zt,
  ce,
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
import { kp } from "../../../../vendor/convert-to-spaces/dist/index.js";
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

//@ chunk-bc20zedk.js:15392-16300 placement
function layoutMarkdownTable(props) {
  let $ = w(9);
  let { headers, rows, terminalWidth, truncatedCount } = props;
  let c;
  if ($[0] !== headers || $[1] !== rows || $[2] !== terminalWidth || $[3] !== truncatedCount) {
    c = [];
    let min = Math.min(terminalWidth - 1, 40);
    let x = repeatString("\u2500", min);
    rows.forEach((h) => {
      let C = [];
      h.forEach((I, b) => {
        let T = headers[b] || "";
        let trimmed = I.trimEnd().replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
        if (!T && !trimmed) {
          return;
        }
        let A = T ? terminalWidth - bunStringWidth(T) - 3 : terminalWidth - 1;
        let _ = terminalWidth - 2 - 1;
        let N = wrapText(trimmed, Math.max(A, 10));
        let E = N[0] || "";
        let U;
        if (N.length <= 1) U = N;
        else {
          let joined = N.slice(1).map(trimEntryText).join(" ");
          let B = wrapText(joined, _);
          U = [E, ...B];
        }
        C.push(T ? `${BOLD_OPEN}${T}:${BOLD_CLOSE} ${U[0] || ""}` : U[0] || "");
        for (let idx = 1; idx < U.length; idx++) {
          let M = U[idx];
          if (!M.trim()) {
            continue;
          }
          C.push(`${M}`);
        }
      });
      if (C.length === 0) {
        return;
      }
      if (c.length > 0) c.push(x);
      c.push(...C);
    });
    if (truncatedCount > 0) {
      if (c.length > 0) c.push(x);
      let D;
      if ($[5] !== truncatedCount) {
        D = moreRowsText(truncatedCount);
        $[5] = truncatedCount;
        $[6] = D;
      } else D = $[6];
      c.push(D);
    }
    $[0] = headers;
    $[1] = rows;
    $[2] = terminalWidth;
    $[3] = truncatedCount;
    $[4] = c;
  } else c = $[4];
  const children = c.join(`
`);
  let G;
  if ($[7] !== children) {
    G = jsxProd_default(Ansi, {
      children,
    });
    $[7] = children;
    $[8] = G;
  } else G = $[8];
  return G;
}
//@ chunk-bc20zedk.js:16300-16315 placement
var MARKDOWN_MAX_HEADING_LEVEL = 10;
var MARKDOWN_TABLE_PAD = 2;
//@ chunk-bc20zedk.js:16315-16433 placement
function listItemIndent(indent, p, room) {
  let max = Math.max(0, Math.min(indent, room - MARKDOWN_TABLE_PAD));
  let markerCell = Math.max(MARKDOWN_TABLE_PAD, Math.min(p, room - max));
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
function isListWithinLimits(o) {
  let p = 0;
  let a = [];
  for (let m of o)
    if (m.type === "list")
      a.push({
        list: m,
        depth: 1,
      });
  for (let m = a.pop(); m; m = a.pop()) {
    if (m.depth > MARKDOWN_CODE_INDENT) return false;
    for (let item of m.list.items) {
      if (++p > MARKDOWN_MAX_TABLE_CELL) return false;
      let u = true;
      for (let token of flattenNumberOnlyLists(item).tokens)
        if (token.type === "list") {
          a.push({
            list: token,
            depth: m.depth + 1,
          });
          u = false;
        } else if (isBlockToken(token)) {
          if (++p > MARKDOWN_MAX_TABLE_CELL) return false;
          u = false;
        } else if (token.type !== "space" && !u) {
          if (++p > MARKDOWN_MAX_TABLE_CELL) return false;
          u = true;
        }
    }
  }
  return true;
}
//@ chunk-bc20zedk.js:16928-17130 placement
function MarkdownList(o) {
  let $ = w(3);
  let { columns } = useScrollViewportSize(useTerminalSize());
  let room =
    Math.min(columns - CODE_LIST_TAB_WIDTH, o.maxProseWidth ?? Infinity) - MARKDOWN_MAX_HEADING_LEVEL;
  let f;
  if ($[0] !== o || $[1] !== room) {
    f = jsxProd_default(MarkdownListItems, {
      indent: 0,
      listDepth: 0,
      room,
      ...o,
    });
    $[0] = o;
    $[1] = room;
    $[2] = f;
  } else f = $[2];
  return f;
}
//@ chunk-bc20zedk.js:17130-17390 placement
function MarkdownListItems({ token, blankLineBefore, ...a }) {
  let m = orderedListRange(token);
  return token.items.map((item, u) =>
    jsxProd_default(
      renderMarkdownListItem,
      {
        item,
        marker: listMarkerText(
          a.listDepth,
          token.ordered
            ? {
                number: m.first + u,
                ...m,
              }
            : null,
        ),
        blankLineBefore: u === 0 ? blankLineBefore : endsWithBlockGap(token.items[u - 1]),
        ...a,
        tailWrap: u === token.items.length - 1 ? a.tailWrap : undefined,
      },
      u,
    ),
  );
}
//@ chunk-bc20zedk.js:17390-17593 placement
function endsWithBlockGap(o) {
  let last = o.tokens.at(-1);
  if (last?.type === "space" || last?.type === "heading" || last?.type === "table") return true;
  if (last?.type === "list") {
    let last_2 = last.items.at(-1);
    return last_2 ? endsWithBlockGap(last_2) : false;
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
  let L = flattenNumberOnlyLists(item);
  let A = [];
  for (let token of L.tokens) {
    if (token.type === "list") {
      A.push({
        kind: "list",
        token,
      });
      continue;
    }
    let D = token.type === "blockquote" ? leadingBlockToken(token, highlight) : undefined;
    let G = formatTokenWindowed(D ?? token, theme, {
      listDepth: listDepth + 1,
      orderedListNumber: null,
      parent: L,
      highlight,
      glueProse: false,
      linkCap,
      windowed: isWindowed,
    });
    if (isBlockToken(token)) {
      A.push({
        kind: "block",
        text:
          token.type === "code"
            ? stripSuffix(
                G,
                `
`,
              )
            : (D ? G : G.replace(/^\n+/, "")).trimEnd(),
      });
      continue;
    }
    let last = A.at(-1);
    if (last?.kind === "inline") last.text += G;
    else
      A.push({
        kind: "inline",
        text: G,
      });
  }
  if (A[0]?.kind !== "inline")
    A.unshift({
      kind: "inline",
      text: "",
    });
  let _ = bunStringWidth(marker) + 1;
  let indent_2 = Math.min(indent + _, MAX_INDENT_SPACES);
  let { rowIndent, markerCell } = listItemIndent(indent, _, room);
  let Y = [];
  let B = blankLineBefore;
  let W = A.length - 1;
  A.forEach((M, D) => {
    let G = D === W ? tailWrap : undefined;
    if (M.kind === "inline") {
      let q = M.text.startsWith(`
`);
      let X = endsWithHardBreak(M.text);
      let J = M.text.replace(/^\n+/, "").trimEnd();
      if (!J && D > 0) {
        B ||= M.text.includes(`
`);
        return;
      }
      let Z = D === 0;
      Y.push(
        jsxProd_default_2(
          Box,
          {
            flexDirection: "row",
            marginTop: B || (!Z && q) ? 1 : 0,
            paddingLeft: Z ? rowIndent : rowIndent + markerCell,
            maxWidth: maxProseWidth,
            children: [
              Z &&
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
                wrap: G,
                children: J,
              }),
            ],
          },
          D,
        ),
      );
      B = X;
    } else if (M.kind === "block") {
      Y.push(
        jsxProd_default(
          Box,
          {
            marginTop: B ? 1 : 0,
            children: jsxProd_default(Ansi, {
              dimColor,
              italic,
              wrap: G,
              children: M.text,
            }),
          },
          D,
        ),
      );
      B = false;
    } else {
      Y.push(
        jsxProd_default(
          MarkdownListItems,
          {
            token: M.token,
            blankLineBefore: B,
            indent: indent_2,
            listDepth: listDepth + 1,
            room,
            theme,
            highlight,
            dimColor,
            italic,
            linkCap,
            isWindowed,
            tailWrap: G,
            maxProseWidth,
          },
          D,
        ),
      );
      B = false;
    }
  });
  return Y;
}
//@ chunk-bc20zedk.js:19133-19164 placement
function selectText(oe) {
  return oe.text;
}
//@ chunk-bc20zedk.js:19164-19327 placement
var InsideMarkdownContext = qt(false);
var TOKEN_CACHE_MAX = 500;
var MARKDOWN_SYNTAX_RE =
  /[#*`|[>\-_~]|\n[\r\n]|\r\r|\r\n[\r\n]|(?:^|[\r\n]) {0,3}(?:\d+[.)]|\+) |(?:^|[\r\n]) {0,3}=+ *(?:[\r\n]|$)|https?:\/\/|www\./;
var NBSP_ENTITY = "&nbsp;";
//@ chunk-bc20zedk.js:19327-19446 placement
function plainParagraphTokens(o) {
  return {
    tokens: [
      {
        type: "paragraph",
        raw: o,
        text: o,
        tokens: [
          {
            type: "text",
            raw: o,
            text: o,
          },
        ],
      },
    ],
    isWindowed: !isSmallMarkdown(o),
  };
}
//@ chunk-bc20zedk.js:19446-19514 placement
function renderMarkdownSafe(o, p) {
  try {
    return lexMarkdownWindowed(o, p);
  } catch (error) {
    reportLexerError(error, p);
    return plainParagraphTokens(p);
  }
}
//@ chunk-bc20zedk.js:19514-19563 placement
function withWrappedTokens(o) {
  return {
    ...o,
    tokens: controlCharTokens(o.tokens),
  };
}
//@ chunk-bc20zedk.js:19563-19681 placement
function reportLexerError(error, p) {
  if (error instanceof RangeError)
    logForDebugging(`marked.lexer overflow on ${p.length} chars`, {
      level: "error",
    });
  else logError(error);
}
//@ chunk-bc20zedk.js:19681-19745 placement
function isMarkdownSafe(o) {
  try {
    return lexInlineHtml(marked, o);
  } catch (error) {
    reportLexerError(error, o);
    return true;
  }
}
//@ chunk-bc20zedk.js:19745-20064 placement
/**
 * 词法分析并按长度+哈希 LRU 缓存，无 Markdown 语法时直接作段落。
 */
function lexMarkdownCached(o, p, promptMode) {
  let m = o === null ? "" : `${promptMode ? "_" : ""}${p.length}:${bunHashOf(p)}`;
  let f = o?.get(m);
  if (o !== null && f) {
    o.delete(m);
    o.set(m, f);
    return f;
  }
  if (!MARKDOWN_SYNTAX_RE.test(p) && (promptMode || !p.includes(NBSP_ENTITY)))
    return withWrappedTokens(plainParagraphTokens(p));
  let u = withWrappedTokens(renderMarkdownSafe(promptMode ? pluginMarkdownLexer : marked, p));
  if (o === null) return u;
  if (o.size >= TOKEN_CACHE_MAX) {
    let c = o.keys().next().value;
    if (c !== undefined) o.delete(c);
  }
  o.set(m, u);
  return u;
}
//@ chunk-bc20zedk.js:20064-20681 placement
/**
 * Markdown 渲染组件（语法高亮、宽度上限、词法缓存）。
 */
function MarkdownText_2(o) {
  let $ = w(9);
  let settings = useSettingsState();
  let { highlightedCode } = useFrameRegistry();
  let f;
  if ($[0] !== settings.syntaxHighlightingDisabled) {
    f = settings.syntaxHighlightingDisabled ? null : getCliHighlightModule();
    $[0] = settings.syntaxHighlightingDisabled;
    $[1] = f;
  } else f = $[1];
  let highlighter = f;
  let skipHighlightCache = o.skipHighlightCache ?? false;
  let g;
  x: {
    if (highlighter === null || skipHighlightCache) {
      g = highlighter;
      break x;
    }
    let h;
    if ($[2] !== highlighter || $[3] !== highlightedCode) {
      h = {
        supportsLanguage: highlighter.supportsLanguage,
        highlight(C, I) {
          let language = I?.language;
          return language ? getCachedHighlight(highlightedCode, highlighter, C, language, I?.work) : C;
        },
      };
      $[2] = highlighter;
      $[3] = highlightedCode;
      $[4] = h;
    } else h = $[4];
    g = h;
  }
  let highlight = g;
  const maxProseWidth = o.capProseWidth ? settings.maxProseWidth : undefined;
  let L;
  if ($[5] !== highlight || $[6] !== o || $[7] !== maxProseWidth) {
    L = jsxProd_default(MarkdownText, {
      ...o,
      highlight,
      maxProseWidth,
    });
    $[5] = highlight;
    $[6] = o;
    $[7] = maxProseWidth;
    $[8] = L;
  } else L = $[8];
  return L;
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
  let [L] = useTheme();
  configureMarked();
  let fallbackPermission = useFallbackPermission();
  let _ = Q(
    () => (stripPromptTags && !promptMode ? stripPromptXMLTags(children) : children),
    [children, stripPromptTags, promptMode],
  );
  let N = Se(InsideMarkdownContext);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let U = yt(subscribeFullscreenObserved, hasFullscreenBeenObserved);
  let { markdownTokens } = useFrameRegistry();
  let children_2 = Q(() => {
    let W = lexMarkdownCached(skipTokenCache ? null : markdownTokens, _, promptMode);
    let M = N || W.isWindowed;
    let D = fallbackPermission && !M;
    let G = linkSchemes === undefined ? W.tokens : structuredClone(W.tokens);
    if (linkSchemes !== undefined) defangTokens(G, linkSchemes);
    let highlight_2 = prehighlightCodeSegments(highlight, G, L);
    let X = [];
    let J = "";
    let Z = "none";
    let oe = false;
    let v = false;
    let F = hint ? `\xB7\xA0${hint}` : undefined;
    function K(z, ee) {
      X.push(z);
      Z = ee;
      oe = false;
    }
    function V(children, marginTop, ae) {
      return jsxProd_default(
        Box,
        {
          marginTop,
          maxWidth: ae === "prose" ? maxProseWidth : undefined,
          children,
        },
        X.length,
      );
    }
    function te() {
      if (!F || v) return null;
      v = true;
      return jsxProd_default_2(Text, {
        color: "subtle",
        children: [" ", F],
      });
    }
    function ne(wrap, ee = false) {
      if (!J) return;
      let ae = J.startsWith(`
`);
      let ke = endsWithHardBreak(J);
      let ue = J.replace(/^\n+/, "").trimEnd();
      J = "";
      if (D && markLinks !== undefined)
        for (let [Rr, mn] of markLinks)
          ue = ue.replaceAll(Rr, `${OSC8_START}${mn}${BEL}${Rr}${OSC8_START}${BEL}`);
      if (!ue) {
        oe = true;
        return;
      }
      let marginTop = Z === "none" ? 0 : (Z === "list" || Z === "code") && !ae ? 0 : 1;
      let Le = jsxProd_default(Ansi, {
        dimColor,
        italic,
        monochrome,
        wrap,
        children: ue,
      });
      let kr = ee ? te() : null;
      K(
        V(
          color || kr
            ? jsxProd_default_2(Text, {
                color,
                wrap,
                children: [Le, kr],
              })
            : Le,
          marginTop,
          "prose",
        ),
        "prose",
      );
      oe = ke;
    }
    function re(z) {
      return Z === "none" ? 0 : z === "block" || Z === "block" || oe ? 1 : 0;
    }
    function pe(children, ee) {
      ne();
      K(V(children, re(ee), ee), ee);
    }
    function le(token, tailWrap) {
      ne();
      K(
        jsxProd_default(
          MarkdownList,
          {
            token,
            blankLineBefore: re("list") > 0,
            theme: L,
            highlight: highlight_2,
            dimColor,
            italic,
            linkCap: D,
            isWindowed: M,
            tailWrap,
            maxProseWidth,
          },
          X.length,
        ),
        "list",
      );
    }
    let lastIndex = G.findLastIndex((z) => z.type !== "space");
    let Rt = !isScreenReaderEnabled && !promptMode && isListWithinLimits(G);
    G.forEach((z, ee) => {
      if (z.type === "table")
        pe(
          jsxProd_default(MarkdownTableView, {
            token: z,
            highlight,
            linkCap: D,
            isWindowed: M,
          }),
          "block",
        );
      else if (z.type === "list" && Rt) le(z, ee === lastIndex ? tailWrap : undefined);
      else if (z.type === "blockquote")
        pe(
          jsxProd_default(MarkdownToken, {
            token: z,
            theme: L,
            highlight: highlight_2,
            dimColor,
            linkCap: D,
            isWindowed: M,
            isScreenReader: isScreenReaderEnabled,
            maxWidth: maxProseWidth,
          }),
          "block",
        );
      else {
        let ae = formatTokenWindowed(z, L, {
          listDepth: 0,
          orderedListNumber: null,
          parent: null,
          highlight: highlight_2,
          glueProse: false,
          linkCap: D,
          screenReader: isScreenReaderEnabled,
          promptMode,
          windowed: M,
        });
        if (maxProseWidth !== undefined && z.type === "code") {
          let ke = ee === lastIndex;
          let wrap = ke ? tailWrap : undefined;
          let Ve = ke ? te() : null;
          let Le = jsxProd_default(Ansi, {
            dimColor,
            italic,
            monochrome,
            wrap,
            children: stripSuffix(
              ae,
              `
`,
            ),
          });
          pe(
            color || Ve
              ? jsxProd_default_2(Text, {
                  color,
                  wrap,
                  children: [Le, Ve],
                })
              : Le,
            "code",
          );
        } else J += ae;
      }
    });
    ne(tailWrap, true);
    if (promptMode && X.length === 0 && _.trim()) {
      J = stripControlCharsForInline(_);
      ne(tailWrap, true);
    }
    if (F && !v)
      K(
        V(
          jsxProd_default(Text, {
            color: "subtle",
            children: F,
          }),
          0,
          "prose",
        ),
        "prose",
      );
    return X;
  }, [
    _,
    color,
    dimColor,
    italic,
    monochrome,
    hint,
    linkSchemes,
    highlight,
    L,
    fallbackPermission,
    N,
    isScreenReaderEnabled,
    tailWrap,
    skipTokenCache,
    markdownTokens,
    promptMode,
    markLinks,
    U,
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
  let $ = w(21);
  let { token, theme, highlight, dimColor, linkCap, isWindowed, isScreenReader, maxWidth } = props;
  let C;
  if ($[0] !== highlight || $[1] !== token) {
    C = leadingBlockToken(token, highlight);
    $[0] = highlight;
    $[1] = token;
    $[2] = C;
  } else C = $[2];
  let I = C;
  const b = I ?? token;
  let T;
  let L;
  if (
    $[3] !== dimColor ||
    $[4] !== I ||
    $[5] !== highlight ||
    $[6] !== isScreenReader ||
    $[7] !== isWindowed ||
    $[8] !== linkCap ||
    $[9] !== maxWidth ||
    $[10] !== b.tokens ||
    $[11] !== theme
  ) {
    L = EARLY_RETURN_SENTINEL;
    Y: {
      let A;
      if (
        $[14] !== highlight ||
        $[15] !== isScreenReader ||
        $[16] !== isWindowed ||
        $[17] !== linkCap ||
        $[18] !== maxWidth ||
        $[19] !== theme
      ) {
        A = (_) => ({
          code: _.type === "code",
          fullWidth: maxWidth !== undefined && hasCodeOrTable(_),
          text: formatTokenWindowed(_, theme, {
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
        $[20] = A;
      } else A = $[20];
      let mapped = b.tokens.map(A);
      if (maxWidth === undefined || isScreenReader || !mapped.some(sliceAnsi)) {
        let joined = mapped.map(selectText).join("");
        let children = sequential.italic((I ? joined : joined.replace(/^\n+/, "")).trimEnd());
        L = jsxProd_default(Box, {
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
      let B = [];
      for (const W of mapped) {
        let last = B.at(-1);
        if (last && !last.fullWidth && !W.fullWidth) last.text = last.text + W.text;
        else
          B.push({
            ...W,
          });
      }
      let D = [];
      let G = 0;
      for (const q of B) {
        let X = q.code || (I !== undefined && q === B[0]) ? q.text : q.text.replace(/^\n+/, "");
        let J = q.code
          ? stripSuffix(
              X,
              `
`,
            )
          : X.trimEnd();
        if (!J) {
          G =
            G +
            countCharInString(
              q.text,
              `
`,
            );
          continue;
        }
        G = G + (q.text.length - X.length);
        D.push(
          jsxProd_default(
            Box,
            {
              marginTop: D.length > 0 ? Math.max(0, G - 1) : 0,
              maxWidth: q.fullWidth ? undefined : maxWidth - MARKDOWN_LIST_INDENT,
              children: jsxProd_default(Ansi, {
                dimColor,
                children: sequential.italic(J),
              }),
            },
            D.length,
          ),
        );
        G = countCharInString(
          X.slice(J.length),
          `
`,
        );
      }
      T = jsxProd_default(Box, {
        flexDirection: "column",
        borderStyle: "quote",
        borderTop: false,
        borderBottom: false,
        borderRight: false,
        borderDimColor: true,
        paddingLeft: 1,
        children: D,
      });
    }
    $[3] = dimColor;
    $[4] = I;
    $[5] = highlight;
    $[6] = isScreenReader;
    $[7] = isWindowed;
    $[8] = linkCap;
    $[9] = maxWidth;
    $[10] = b.tokens;
    $[11] = theme;
    $[12] = T;
    $[13] = L;
  } else {
    T = $[12];
    L = $[13];
  }
  if (L !== EARLY_RETURN_SENTINEL) return L;
  return T;
}
//@ chunk-bc20zedk.js:24825-25060 placement
function hasCodeOrTable(o) {
  let p = [o];
  for (let a = p.pop(); a !== undefined; a = p.pop()) {
    if (a.type === "code" || a.type === "table") return true;
    let m =
      a.type === "list" ? a.items : a.type === "blockquote" || a.type === "list_item" ? (a.tokens ?? []) : [];
    for (let f of m) p.push(f);
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
function closesFence(o, p, a) {
  let m = o.match(/^`+|^~+/)?.[0] ?? "";
  return p[0] === m[0] && p.length >= m.length && a.trim() === "";
}
//@ chunk-bc20zedk.js:25346-25470 placement
function updateOpenFence(openFence, p) {
  let a = openFence;
  for (let m of p.matchAll(FENCED_CODE_RE))
    if (a === null) a = m[1] + m[2].trim();
    else if (closesFence(a, m[1], m[2])) a = null;
  return a;
}
//@ chunk-bc20zedk.js:25470-25604 placement
function closingFenceEnd(o, openFence) {
  for (let a of o.matchAll(FENCED_CODE_RE)) {
    let m = a.index + a[0].length;
    if (
      o[m] !==
      `
`
    )
      continue;
    if (closesFence(openFence, a[1], a[2])) return m + 1;
  }
  return -1;
}
//@ chunk-bc20zedk.js:25604-26077 placement
/**
 * 把流式文本前缀冻结为一个渲染块，返回剩余部分。
 */
function freezeStreamChunk(o, p, a, m) {
  let f = p.substring(0, a);
  let children =
    (o.openFence !== null
      ? o.openFence +
        `
`
      : (o.openTable ?? "")) + f;
  let skipHighlightCache = o.openFence !== null || !m;
  o.chunks = [
    ...o.chunks,
    jsxProd_default(
      Box,
      {
        marginTop: o.chunks.length > 0 && o.gapAfterChunks ? 1 : 0,
        children: jsxProd_default(MarkdownText_2, {
          skipTokenCache: true,
          skipHighlightCache,
          capProseWidth: true,
          children,
        }),
      },
      o.chunks.length,
    ),
  ];
  o.openFence = updateOpenFence(o.openFence, f);
  o.frozenSource += f;
  o.gapAfterChunks = m;
  o.isLinkless ||= !m || o.openFence !== null;
  o.stablePrefix = "";
  if (m) o.openTable = null;
  return p.substring(a);
}
//@ chunk-bc20zedk.js:26077-26089 placement
var MAX_BASH_COMMAND_SCAN_CHARS = 1536;
//@ chunk-bc20zedk.js:26089-26258 placement = getFileExtensionsFromBashCommand (1)
function getFileExtensionsFromBashCommand(o) {
  let index = o.lastIndexOf(`
`);
  if (index < MARKDOWN_MAX_CHARS / 2) index = o.lastIndexOf(" ", o.length - MAX_BASH_COMMAND_SCAN_CHARS);
  if (index < MARKDOWN_MAX_CHARS / 2) {
    index = o.length - MAX_BASH_COMMAND_SCAN_CHARS;
    let code = o.charCodeAt(index + 1);
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
  let a = stripPromptXMLTags(children);
  let f = R(createStreamState()).current;
  let u = false;
  let c = false;
  if (!a.startsWith(f.frozenSource)) Object.assign(f, createStreamState());
  f.isLinkless ||= !isSmallMarkdown(a);
  let g = a.substring(f.frozenSource.length);
  if (!g.startsWith(f.stablePrefix)) f.stablePrefix = "";
  if (f.openFence !== null) {
    let _ = closingFenceEnd(g, f.openFence);
    if (_ >= 0) g = freezeStreamChunk(f, g, _, true);
    else if (g.length > MARKDOWN_MAX_CHARS)
      g = freezeStreamChunk(f, g, getFileExtensionsFromBashCommand(g), false);
  }
  if (f.openFence === null) {
    let _ = f.stablePrefix.length;
    let openTable = f.openTable ?? "";
    let E = openTable + g.substring(_);
    let U =
      E.lastIndexOf(`
`) + 1;
    let Y = openTable !== "" || TABLE_ROW_RE.test(E.substring(U)) ? E.substring(0, U) : E;
    let { tokens, isWindowed } = renderMarkdownSafe(marked, Y);
    f.isLinkless ||= isWindowed;
    let M = tokens.length - 1;
    while (M >= 0 && tokens[M].type === "space") M--;
    f.isLinkless ||= !endsWith(tokens, Y);
    let last = tokens.at(-1);
    let G = last?.type === "table" && endsWithHardBreak(Y);
    let q = G ? Y.length : M > 0 ? hasMarkdownSyntax(tokens, M, Y) : 0;
    let X = last?.type === "table" && !G ? last : null;
    u = X !== null || (last?.type === "paragraph" && TABLE_HEADER_RE.test(last.raw + E.substring(Y.length)));
    c = q > 0 || M === 0;
    let J = tokens[0];
    if (J?.type !== "table") f.openTable = null;
    if (openTable !== "" && q >= openTable.length) {
      if (J?.type === "table" && J.rows.length === 0) {
        f.openTable = null;
        f.gapAfterChunks = true;
      } else g = freezeStreamChunk(f, g, q - openTable.length, true);
    } else if (openTable === "" && q > 0) {
      f.stablePrefix = g.substring(0, _ + q);
      f.isLinkless ||= isMarkdownSafe(g.substring(_, _ + q));
    }
    if (f.stablePrefix.length > MARKDOWN_MAX_CHARS) g = freezeStreamChunk(f, g, f.stablePrefix.length, true);
    if (g.length - f.stablePrefix.length > MARKDOWN_MAX_CHARS) {
      let oe = f.stablePrefix.length;
      let fileExtensionsFromBashCommand = getFileExtensionsFromBashCommand(g.substring(oe));
      let K =
        g[oe + fileExtensionsFromBashCommand - 1] ===
          `
` &&
        X !== null &&
        X.header.length <= MARKDOWN_NEST_DEPTH
          ? firstLine(X.raw)
          : "";
      g = freezeStreamChunk(f, g, oe + fileExtensionsFromBashCommand, false);
      f.openTable = K !== "" && K.length <= MARKDOWN_TOKEN_LIMIT ? K : null;
    }
  }
  let stablePrefix = f.stablePrefix;
  let h = g.substring(stablePrefix.length);
  let C = stablePrefix.trim() !== "";
  let I =
    f.openFence !== null
      ? f.openFence +
        `
`
      : (f.openTable ?? "");
  let b = h && I + h;
  if (hideTrailingLine && u) {
    b = b.substring(
      0,
      b.lastIndexOf(`
`) + 1,
    );
    if (
      c &&
      countCharInString(
        b.trim(),
        `
`,
      ) < 2
    )
      b = "";
  }
  let T = !b.endsWith(`
`);
  let L = b
    ? jsxProd_default(MarkdownText_2, {
        tailWrap: hideTrailingLine && T ? "wrap-stream" : undefined,
        skipTokenCache: true,
        skipHighlightCache: true,
        capProseWidth: true,
        children: b,
      })
    : null;
  if (f.chunks.length === 0)
    return jsxProd_default(InsideMarkdownContext.Provider, {
      value: f.isLinkless,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          C &&
            jsxProd_default(MarkdownText_2, {
              skipTokenCache: true,
              capProseWidth: true,
              children: stablePrefix,
            }),
          L,
        ],
      }),
    });
  let A = f.gapAfterChunks ? 1 : 0;
  return jsxProd_default(InsideMarkdownContext.Provider, {
    value: f.isLinkless,
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        f.chunks,
        C &&
          jsxProd_default(Box, {
            marginTop: A,
            children: jsxProd_default(MarkdownText_2, {
              skipTokenCache: true,
              capProseWidth: true,
              children: stablePrefix,
            }),
          }),
        L &&
          jsxProd_default(Box, {
            marginTop: C ? 1 : A,
            children: L,
          }),
      ],
    }),
  });
}
//@ chunk-bc20zedk.js:28498-28539 placement
var MARKDOWN_LINK_SCHEMES = new Set(["https", "http", "file"]);
//@ chunk-bc20zedk.js:28539-29466 placement
function MarkdownBlock({ text, dimColor, press, part, elementKey, pressableLinks }) {
  let clock = useClock();
  let selection = useSelection();
  let [x] = y(() => clock.now());
  let h = R(null);
  let C = R({
    press,
    pressableLinks,
  });
  let I = Vc(MarkdownText_2, {
    dimColor,
    linkSchemes: MARKDOWN_LINK_SCHEMES,
    stripPromptTags: false,
    children: text,
  });
  C.current = {
    press,
    pressableLinks,
  };
  P(() => () => h.current?.(), []);
  if (press === undefined)
    return elementKey === undefined
      ? I
      : Vc(
          Box,
          {
            flexDirection: "column",
            elementKey,
            elementPlugin: part?.plugin,
          },
          I,
        );
  return Vc(
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
        if (event.isWindowActivation || clock.now() - x < DOUBLE_CLICK_MS) {
          event.dropAsStray();
          return;
        }
        event.stopImmediatePropagation();
        h.current?.();
        let _ = selection.subscribe(() => {
          if (selection.hasSelection()) h.current?.();
        });
        let N = clock.setTimeout(() => {
          h.current = null;
          _();
          let E = C.current;
          if (E.press !== undefined && hrefInList(hyperlinkUrl, E.pressableLinks) && E.press)
            pressFromTerminal(E.press, {
              href: hyperlinkUrl,
            });
        }, MULTI_CLICK_MAX_MS);
        h.current = () => {
          h.current = null;
          _();
          N();
        };
      },
    },
    I,
  );
}
//@ chunk-bc20zedk.js:29466-29470 placement
init_react_production();
//@ chunk-bc20zedk.js:29470-29474 placement
init_react_production();
//@ chunk-bc20zedk.js:29474-29491 placement
var HotkeySeat = qt(null);
//@ chunk-bc20zedk.js:29491-29606 placement
function releaseInkFocus(o) {
  if (!o) return;
  let focusManager = getFocusManager(o);
  let activeElement = focusManager.activeElement ?? undefined;
  while (activeElement && activeElement !== o) activeElement = activeElement.parentNode;
  if (activeElement === o) focusManager.blur();
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
  let T = R(null);
  let L = Se(HotkeySeat);
  zt(() => {
    let N = T.current;
    return hotkey !== undefined && L !== null && N !== null ? L(hotkey, N) : undefined;
  }, [L, hotkey]);
  let { overrides, handlers } = useHoverLit(groupOf(plugin, hover), hover, "Box");
  return Vc(
    Box,
    {
      ref: T,
      flexShrink: 0,
      alignSelf: "flex-start",
      elementKey: element,
      elementPlugin: plugin,
      onClick: (event) => {
        releaseInkFocus(T.current);
        event.stopImmediatePropagation();
      },
      ...handlers,
    },
    action !== undefined &&
      Vc(ActionKeysSeat, {
        plugin,
        handle,
        action,
      }),
    Vc(Button, {
      ref,
      tabIndex: -1,
      flexShrink: 0,
      alignSelf: "flex-start",
      onAction: () =>
        pressFromTerminal({
          plugin,
          handle,
        }),
      children: (N) => {
        let E = N.focused || N.hovered || hasKeyboardFocus;
        let dimColor_2 = dimColor === true && !E;
        let Y = plain === true;
        let B = hotkey === undefined;
        let W = held.length > 0;
        let M = W ? held : [label];
        return Y
          ? Vc(
              Text,
              {
                inverse: E,
                dimColor: dimColor_2,
                ...overrides,
              },
              B
                ? ""
                : Vc(
                    Text,
                    {
                      color: "suggestion",
                    },
                    hotkey,
                  ),
              B ? "" : ": ",
              ...M,
            )
          : Vc(
              Text,
              {
                inverse: E,
                bold: true,
                dimColor: dimColor_2,
                color: variant === "primary" ? "suggestion" : undefined,
                ...overrides,
              },
              ...(W ? ["[ ", ...held, " ]"] : [`[ ${label} ]`]),
            );
      },
    }),
  );
}
//@ chunk-bc20zedk.js:30537-30541 placement
init_react_production();
//@ chunk-bc20zedk.js:30541-30545 placement
init_react_production();
//@ chunk-bc20zedk.js:30545-30549 placement
init_react_production();
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
init_react_production();
//@ chunk-bc20zedk.js:30661-30665 placement
init_react_production();
//@ chunk-bc20zedk.js:30665-30848 placement
/**
 * 点击发生在元素外（非窗口激活）时回调。
 */
function useClickOutside(o) {
  let p = R(null);
  let { subscribeClicks } = Se(kp);
  P(
    () =>
      subscribeClicks((m, f) => {
        let u = m ?? undefined;
        while (u && u !== p.current) u = u.parentNode;
        if (!u && f?.isWindowActivation !== true) o();
      }),
    [o, subscribeClicks],
  );
  return p;
}
//@ chunk-bc20zedk.js:30848-31093 placement
var KEY_NAME_MAP = [
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
  let a = KEY_NAME_MAP.find(([f]) => key[f])?.[1] ?? (input === " " ? "space" : input);
  return a === ""
    ? undefined
    : {
        key: a,
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
  let p = ce(() => clearFocusedClient(instance.id), [instance]);
  let clickOutside = useClickOutside(p);
  let m = useStoreSelector(focusStore, (u) => u.focusedId) === instance.id;
  let f = useStoreSelector(paneRegistry(), (u) => u.focusedId);
  P(() => {
    if (f !== null && m) setFocusedClient(null);
  }, [f, m]);
  P(() => p, [p]);
  usePreDispatchKeyHandler((input, key, g) => {
    let x = focusStore.getState().focusedId === instance.id;
    let h = key.escape || (key.ctrl && (input === "c" || input === "d"));
    if (!x) return false;
    if (!instance.acceptsKeys()) {
      p();
      return false;
    }
    if (h) {
      setFocusedClient(null);
      return key.escape;
    }
    let pluginKeyEvent = toPluginKeyEvent(input === "" ? g : input, key);
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
  P(() => {
    instance.setProps(props);
  }, [instance, props]);
  P(() => {
    instance.drawnAgain();
  }, [instance, host.drawn]);
  let I = useMeasured(() =>
    pluginKeyFocus.current === null ? 0 : measureElement(pluginKeyFocus.current).width,
  );
  let b = useMeasured(() =>
    pluginKeyFocus.current === null ? 0 : measureElement(pluginKeyFocus.current).height,
  );
  zt(() => {
    instance.laidOut();
  });
  P(() => {
    instance.resize(I, b);
  }, [instance, I, b]);
  let T = R({
    x: 0,
    y: 0,
  });
  let L = snapshot.status === "drawn";
  let A = L && instance.acceptsPointer();
  let _ = A || (L && instance.acceptsKeys());
  useFinePointer(A);
  function N(E) {
    if (E.type === "down" && instance.acceptsKeys()) {
      focusPane(null);
      setFocusedClient(instance.id);
    }
    T.current = {
      x: E.localCol,
      y: E.localRow,
    };
    instance.pointer({
      type: E.type,
      x: E.localCol,
      y: E.localRow,
      ...(E.fine && {
        fine: {
          x: E.fine.col,
          y: E.fine.row,
        },
      }),
      ...(E.button !== undefined && {
        button: mouseButtonName(E.button),
      }),
      ...(E.shift && {
        shift: true,
      }),
      ...(E.alt && {
        alt: true,
      }),
      ...(E.ctrl && {
        ctrl: true,
      }),
    });
  }
  return Vc(
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
      ...(_ && {
        onPointer: N,
        onMouseEnter: () => {
          instance.pointer({
            type: "enter",
            ...T.current,
          });
        },
        onMouseLeave: () => {
          instance.pointer({
            type: "leave",
            ...T.current,
          });
        },
      }),
    },
    L && rebuild(snapshot.tree),
    snapshot.status === "failed" &&
      Vc(
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
init_react_production();
//@ chunk-bc20zedk.js:32811-33028 placement
function createTicker(o) {
  if (o === null)
    return {
      every: (p, a) => {
        let interval = setInterval(a, Math.max(p, SCROLL_JUMP_LINES));
        return () => clearInterval(interval);
      },
    };
  return {
    every: (p, a) => {
      let m = o.now();
      return o.subscribeKeepAlive(() => {
        let f = o.now();
        if (f - m >= p) {
          m = f;
          a();
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
