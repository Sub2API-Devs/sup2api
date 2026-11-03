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
import { _s, at, Ke, prehighlightCodeSegments, useSiteFocus, useHoverLit, groupOf } from "./elements.js";
import { BOLD_OPEN, BOLD_CLOSE } from "../../../ink/screen.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Ansi } from "../../../ink/components/AnsiText.js";
import {
  flattenNumberOnlyLists,
  Vyo,
  qyo,
  endsWithHardBreak,
  leadingBlockToken,
  formatTokenWindowed,
  Kyo,
  pluginMarkdownLexer,
  configureMarked,
  defangTokens,
} from "../../../utils/markdown.js";
import { useScrollViewportSize } from "../../ScrollViewportContext.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { qt, Q, Se, yt, R, y, Vc, P, j, zt, ce } from "../../../../vendor/react/cjs/react.production.js";
import { isSmallMarkdown, lexMarkdownWindowed, lexInlineHtml } from "../../../utils/doctorContextWarnings.js";
import { controlCharTokens, WCr } from "../../../utils/markdownInlineRendering.js";
import { logForDebugging } from "../../../utils/debug.js";
import { logError } from "../../../utils/log.js";
import { Ah } from "../../../../vendor/marked/lib/marked.esm.js";
import { sT } from "../../../utils/pastedContent.js";
import { qd } from "../../../hooks/useSettings.js";
import { useFrameRegistry } from "../../../ink/renderModeContext.js";
import { Sz } from "../../../utils/cliHighlight.js";
import { getCachedHighlight } from "../../HighlightedCode/Fallback.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { wJe } from "../../permissions/FallbackPermissionRequest.js";
import { stripPromptXMLTags } from "../../../utils/messages.js";
import {
  useIsScreenReaderEnabled,
  DOUBLE_CLICK_MS,
  MULTI_CLICK_MAX_MS,
  Button,
} from "../../../ink/components/ErrorBoundary.js";
import { UVe, FVe } from "../../../utils/fullscreen.js";
import { ZWn, eGn } from "../../../utils/hyperlink.js";
import { EARLY_RETURN_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { sliceAnsi } from "../../../utils/sliceAnsi.js";
import { sequential } from "../../../utils/sequential.js";
import { UPs, hasMarkdownSyntax, jCr } from "../../Markdown.js";
import { useClock } from "../../../ink/components/ClockContext.js";
import { useSelection, useMeasured, useFinePointer } from "../../../ink/components/Input.js";
import { h4r } from "../../../plugins/functionHooks/ui/interactions.js";
import { pressFromTerminal, ActionKeysSeat } from "./actionKeys.js";
import { getFocusManager } from "../../../ink/focus.js";
import { kp } from "../../../../vendor/convert-to-spaces/dist/index.js";
import { Ewo, HTe, Qrn } from "../../../plugins/functionHooks/surfaceClients.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { ul, focusPane } from "../../../plugins/functionHooks/panes.js";
import { usePreDispatchKeyHandler } from "../../../keybindings/useActionHandlers.js";
import { measureElement } from "../../../ink/hooks/useTerminalHooks.js";
import { Xh } from "../../../ink/scrollConstants.js";

//@ chunk-bc20zedk.js:15392-16300 placement
function layoutMarkdownTable(o) {
  let $ = w(9),
    { headers: headers, rows: rows, terminalWidth: terminalWidth, truncatedCount: truncatedCount } = o,
    c;
  if ($[0] !== headers || $[1] !== rows || $[2] !== terminalWidth || $[3] !== truncatedCount) {
    c = [];
    let min = Math.min(terminalWidth - 1, 40);
    let x = repeatString("\u2500", min);
    rows.forEach((h) => {
      let C = [];
      if (
        (h.forEach((I, b) => {
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
            let joined = N.slice(1).map(_s).join(" ");
            let B = wrapText(joined, _);
            U = [E, ...B];
          }
          C.push(T ? `${BOLD_OPEN}${T}:${BOLD_CLOSE} ${U[0] || ""}` : U[0] || "");
          for (let W = 1; W < U.length; W++) {
            let M = U[W];
            if (!M.trim()) {
              continue;
            }
            C.push(`${M}`);
          }
        }),
        C.length === 0)
      ) {
        return;
      }
      if (c.length > 0) c.push(x);
      c.push(...C);
    });
    if (truncatedCount > 0) {
      if (c.length > 0) c.push(x);
      let D;
      if ($[5] !== truncatedCount) ((D = at(truncatedCount)), ($[5] = truncatedCount), ($[6] = D));
      else D = $[6];
      c.push(D);
    }
    (($[0] = headers), ($[1] = rows), ($[2] = terminalWidth), ($[3] = truncatedCount), ($[4] = c));
  } else c = $[4];
  const joined = c.join(`
`);
  let G;
  if ($[7] !== joined) ((G = e(Ansi, { children: joined })), ($[7] = joined), ($[8] = G));
  else G = $[8];
  return G;
}
//@ chunk-bc20zedk.js:16300-16315 placement
var Zr = 10,
  eo = 2;
//@ chunk-bc20zedk.js:16315-16433 placement
function listItemIndent(o, p, a) {
  let max = Math.max(0, Math.min(o, a - eo)),
    max_2 = Math.max(eo, Math.min(p, a - max));
  return { rowIndent: max, markerCell: max_2 };
}
//@ chunk-bc20zedk.js:16433-16450 placement
var Ut = 300,
  Ws = 64;
//@ chunk-bc20zedk.js:16450-16544 placement
function ro(o) {
  return o.type === "code" || o.type === "blockquote" || o.type === "hr" || o.type === "table";
}
/**
 * 列表嵌套深度与条目数是否都在上限内（超限则不按列表渲染）。
 */
//@ chunk-bc20zedk.js:16544-16928 placement
function isListWithinLimits(o) {
  let p = 0,
    a = [];
  for (let m of o) if (m.type === "list") a.push({ list: m, depth: 1 });
  for (let m = a.pop(); m; m = a.pop()) {
    if (m.depth > Ws) return !1;
    for (let item of m.list.items) {
      if (++p > Ut) return !1;
      let u = !0;
      for (let token of flattenNumberOnlyLists(item).tokens)
        if (token.type === "list") (a.push({ list: token, depth: m.depth + 1 }), (u = !1));
        else if (ro(token)) {
          if (++p > Ut) return !1;
          u = !1;
        } else if (token.type !== "space" && !u) {
          if (++p > Ut) return !1;
          u = !0;
        }
    }
  }
  return !0;
}
//@ chunk-bc20zedk.js:16928-17130 placement
function MarkdownList(o) {
  let $ = w(3),
    { columns: columns } = useScrollViewportSize(useTerminalSize()),
    a = Math.min(columns - Ke, o.maxProseWidth ?? Infinity) - Zr,
    f;
  if ($[0] !== o || $[1] !== a)
    ((f = e(MarkdownListItems, { indent: 0, listDepth: 0, room: a, ...o })),
      ($[0] = o),
      ($[1] = a),
      ($[2] = f));
  else f = $[2];
  return f;
}
//@ chunk-bc20zedk.js:17130-17390 placement
function MarkdownListItems({ token: token, blankLineBefore: blankLineBefore, ...a }) {
  let m = Vyo(token);
  return token.items.map((item, u) =>
    e(
      renderMarkdownListItem,
      {
        item: item,
        marker: qyo(a.listDepth, token.ordered ? { number: m.first + u, ...m } : null),
        blankLineBefore: u === 0 ? blankLineBefore : endsWithBlockGap(token.items[u - 1]),
        ...a,
        tailWrap: u === token.items.length - 1 ? a.tailWrap : void 0,
      },
      u,
    ),
  );
}
//@ chunk-bc20zedk.js:17390-17593 placement
function endsWithBlockGap(o) {
  let at = o.tokens.at(-1);
  if (at?.type === "space" || at?.type === "heading" || at?.type === "table") return !0;
  if (at?.type === "list") {
    let at_2 = at.items.at(-1);
    return at_2 ? endsWithBlockGap(at_2) : !1;
  }
  return at?.type === "html" && endsWithHardBreak(at.raw);
}
//@ chunk-bc20zedk.js:17593-19099 placement
function renderMarkdownListItem({
  item: item,
  marker: marker,
  indent: indent,
  listDepth: listDepth,
  blankLineBefore: blankLineBefore,
  theme: theme,
  highlight: highlight,
  dimColor: dimColor,
  italic: italic,
  linkCap: linkCap,
  isWindowed: isWindowed,
  tailWrap: tailWrap,
  room: room,
  maxProseWidth: maxProseWidth,
}) {
  let L = flattenNumberOnlyLists(item),
    A = [];
  for (let token of L.tokens) {
    if (token.type === "list") {
      A.push({ kind: "list", token: token });
      continue;
    }
    let D = token.type === "blockquote" ? leadingBlockToken(token, highlight) : void 0,
      G = formatTokenWindowed(D ?? token, theme, {
        listDepth: listDepth + 1,
        orderedListNumber: null,
        parent: L,
        highlight: highlight,
        glueProse: !1,
        linkCap: linkCap,
        windowed: isWindowed,
      });
    if (ro(token)) {
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
    let at = A.at(-1);
    if (at?.kind === "inline") at.text += G;
    else A.push({ kind: "inline", text: G });
  }
  if (A[0]?.kind !== "inline") A.unshift({ kind: "inline", text: "" });
  let _ = bunStringWidth(marker) + 1,
    min = Math.min(indent + _, Kyo),
    { rowIndent: rowIndent, markerCell: markerCell } = listItemIndent(indent, _, room),
    Y = [],
    B = blankLineBefore,
    W = A.length - 1;
  return (
    A.forEach((M, D) => {
      let G = D === W ? tailWrap : void 0;
      if (M.kind === "inline") {
        let startsWith = M.text.startsWith(`
`),
          X = endsWithHardBreak(M.text),
          trimEnd = M.text.replace(/^\n+/, "").trimEnd();
        if (!trimEnd && D > 0) {
          B ||= M.text.includes(`
`);
          return;
        }
        let Z = D === 0;
        (Y.push(
          r(
            Box,
            {
              flexDirection: "row",
              marginTop: B || (!Z && startsWith) ? 1 : 0,
              paddingLeft: Z ? rowIndent : rowIndent + markerCell,
              maxWidth: maxProseWidth,
              children: [
                Z &&
                  e(Box, {
                    width: markerCell,
                    flexShrink: 0,
                    children: e(Text, { dimColor: dimColor, italic: italic, children: marker }),
                  }),
                e(Ansi, { dimColor: dimColor, italic: italic, wrap: G, children: trimEnd }),
              ],
            },
            D,
          ),
        ),
          (B = X));
      } else if (M.kind === "block")
        (Y.push(
          e(
            Box,
            {
              marginTop: B ? 1 : 0,
              children: e(Ansi, { dimColor: dimColor, italic: italic, wrap: G, children: M.text }),
            },
            D,
          ),
        ),
          (B = !1));
      else
        (Y.push(
          e(
            MarkdownListItems,
            {
              token: M.token,
              blankLineBefore: B,
              indent: min,
              listDepth: listDepth + 1,
              room: room,
              theme: theme,
              highlight: highlight,
              dimColor: dimColor,
              italic: italic,
              linkCap: linkCap,
              isWindowed: isWindowed,
              tailWrap: G,
              maxProseWidth: maxProseWidth,
            },
            D,
          ),
        ),
          (B = !1));
    }),
    Y
  );
}
//@ chunk-bc20zedk.js:19133-19164 placement
function selectText(oe) {
  return oe.text;
}
//@ chunk-bc20zedk.js:19164-19327 placement
var InsideMarkdownContext = qt(!1),
  TOKEN_CACHE_MAX = 500,
  MARKDOWN_SYNTAX_RE =
    /[#*`|[>\-_~]|\n[\r\n]|\r\r|\r\n[\r\n]|(?:^|[\r\n]) {0,3}(?:\d+[.)]|\+) |(?:^|[\r\n]) {0,3}=+ *(?:[\r\n]|$)|https?:\/\/|www\./,
  NBSP_ENTITY = "&nbsp;";
//@ chunk-bc20zedk.js:19327-19446 placement
function plainParagraphTokens(o) {
  return {
    tokens: [{ type: "paragraph", raw: o, text: o, tokens: [{ type: "text", raw: o, text: o }] }],
    isWindowed: !isSmallMarkdown(o),
  };
}
//@ chunk-bc20zedk.js:19446-19514 placement
function So(o, p) {
  try {
    return lexMarkdownWindowed(o, p);
  } catch (error) {
    return (reportLexerError(error, p), plainParagraphTokens(p));
  }
}
//@ chunk-bc20zedk.js:19514-19563 placement
function so(o) {
  return { ...o, tokens: controlCharTokens(o.tokens) };
}
//@ chunk-bc20zedk.js:19563-19681 placement
function reportLexerError(o, p) {
  if (o instanceof RangeError)
    logForDebugging(`marked.lexer overflow on ${p.length} chars`, { level: "error" });
  else logError(o);
}
//@ chunk-bc20zedk.js:19681-19745 placement
function qs(o) {
  try {
    return lexInlineHtml(Ah, o);
  } catch (error) {
    return (reportLexerError(error, o), !0);
  }
}
/**
 * 词法分析并按长度+哈希 LRU 缓存，无 Markdown 语法时直接作段落。
 */
//@ chunk-bc20zedk.js:19745-20064 placement
function lexMarkdownCached(o, p, a) {
  let m = o === null ? "" : `${a ? "_" : ""}${p.length}:${sT(p)}`,
    f = o?.get(m);
  if (o !== null && f) return (o.delete(m), o.set(m, f), f);
  if (!MARKDOWN_SYNTAX_RE.test(p) && (a || !p.includes(NBSP_ENTITY))) return so(plainParagraphTokens(p));
  let u = so(So(a ? pluginMarkdownLexer : Ah, p));
  if (o === null) return u;
  if (o.size >= TOKEN_CACHE_MAX) {
    let c = o.keys().next().value;
    if (c !== void 0) o.delete(c);
  }
  return (o.set(m, u), u);
}
/**
 * Markdown 渲染组件（语法高亮、宽度上限、词法缓存）。
 */
//@ chunk-bc20zedk.js:20064-20681 placement
function MarkdownText_2(o) {
  let $ = w(9),
    settings = qd(),
    { highlightedCode: highlightedCode } = useFrameRegistry(),
    f;
  if ($[0] !== settings.syntaxHighlightingDisabled)
    ((f = settings.syntaxHighlightingDisabled ? null : Sz()),
      ($[0] = settings.syntaxHighlightingDisabled),
      ($[1] = f));
  else f = $[1];
  let highlighter = f,
    skipHighlightCache = o.skipHighlightCache ?? !1,
    g;
  x: {
    if (highlighter === null || skipHighlightCache) {
      g = highlighter;
      break x;
    }
    let h;
    if ($[2] !== highlighter || $[3] !== highlightedCode)
      ((h = {
        supportsLanguage: highlighter.supportsLanguage,
        highlight(C, I) {
          let b = I?.language;
          return b ? getCachedHighlight(highlightedCode, highlighter, C, b, I?.work) : C;
        },
      }),
        ($[2] = highlighter),
        ($[3] = highlightedCode),
        ($[4] = h));
    else h = $[4];
    g = h;
  }
  let T = g;
  const h = o.capProseWidth ? settings.maxProseWidth : void 0;
  let L;
  if ($[5] !== T || $[6] !== o || $[7] !== h)
    ((L = e(MarkdownText, { ...o, highlight: T, maxProseWidth: h })),
      ($[5] = T),
      ($[6] = o),
      ($[7] = h),
      ($[8] = L));
  else L = $[8];
  return L;
}
//@ chunk-bc20zedk.js:20681-23084 placement
function MarkdownText({
  children: children,
  color: color,
  dimColor: dimColor,
  italic: italic,
  monochrome: monochrome,
  hint: hint,
  promptMode: promptMode = !1,
  markLinks: markLinks,
  linkSchemes: linkSchemes,
  stripPromptTags: stripPromptTags = !0,
  tailWrap: tailWrap,
  skipTokenCache: skipTokenCache = !1,
  highlight: highlight,
  maxProseWidth: maxProseWidth,
}) {
  let [L] = useTheme();
  configureMarked();
  let A = wJe(),
    _ = Q(
      () => (stripPromptTags && !promptMode ? stripPromptXMLTags(children) : children),
      [children, stripPromptTags, promptMode],
    ),
    N = Se(InsideMarkdownContext),
    E = useIsScreenReaderEnabled(),
    U = yt(UVe, FVe),
    { markdownTokens: markdownTokens } = useFrameRegistry(),
    B = Q(() => {
      let W = lexMarkdownCached(skipTokenCache ? null : markdownTokens, _, promptMode),
        M = N || W.isWindowed,
        D = A && !M,
        G = linkSchemes === void 0 ? W.tokens : structuredClone(W.tokens);
      if (linkSchemes !== void 0) defangTokens(G, linkSchemes);
      let q = prehighlightCodeSegments(highlight, G, L),
        X = [],
        J = "",
        Z = "none",
        oe = !1,
        v = !1,
        F = hint ? `\xB7\xA0${hint}` : void 0;
      function K(z, ee) {
        (X.push(z), (Z = ee), (oe = !1));
      }
      function V(z, ee, ae) {
        return e(
          Box,
          { marginTop: ee, maxWidth: ae === "prose" ? maxProseWidth : void 0, children: z },
          X.length,
        );
      }
      function te() {
        if (!F || v) return null;
        return ((v = !0), r(Text, { color: "subtle", children: [" ", F] }));
      }
      function ne(z, ee = !1) {
        if (!J) return;
        let startsWith = J.startsWith(`
`),
          ke = endsWithHardBreak(J),
          trimEnd = J.replace(/^\n+/, "").trimEnd();
        if (((J = ""), D && markLinks !== void 0))
          for (let [Rr, mn] of markLinks)
            trimEnd = trimEnd.replaceAll(Rr, `${ZWn}${mn}${eGn}${Rr}${ZWn}${eGn}`);
        if (!trimEnd) {
          oe = !0;
          return;
        }
        let Ve = Z === "none" ? 0 : (Z === "list" || Z === "code") && !startsWith ? 0 : 1,
          Le = e(Ansi, {
            dimColor: dimColor,
            italic: italic,
            monochrome: monochrome,
            wrap: z,
            children: trimEnd,
          }),
          kr = ee ? te() : null;
        (K(
          V(color || kr ? r(Text, { color: color, wrap: z, children: [Le, kr] }) : Le, Ve, "prose"),
          "prose",
        ),
          (oe = ke));
      }
      function re(z) {
        return Z === "none" ? 0 : z === "block" || Z === "block" || oe ? 1 : 0;
      }
      function pe(z, ee) {
        (ne(), K(V(z, re(ee), ee), ee));
      }
      function le(z, ee) {
        (ne(),
          K(
            e(
              MarkdownList,
              {
                token: z,
                blankLineBefore: re("list") > 0,
                theme: L,
                highlight: q,
                dimColor: dimColor,
                italic: italic,
                linkCap: D,
                isWindowed: M,
                tailWrap: ee,
                maxProseWidth: maxProseWidth,
              },
              X.length,
            ),
            "list",
          ));
      }
      let lastIndex = G.findLastIndex((z) => z.type !== "space"),
        Rt = !E && !promptMode && isListWithinLimits(G);
      if (
        (G.forEach((z, ee) => {
          if (z.type === "table")
            pe(e(MarkdownTableView, { token: z, highlight: highlight, linkCap: D, isWindowed: M }), "block");
          else if (z.type === "list" && Rt) le(z, ee === lastIndex ? tailWrap : void 0);
          else if (z.type === "blockquote")
            pe(
              e(MarkdownToken, {
                token: z,
                theme: L,
                highlight: q,
                dimColor: dimColor,
                linkCap: D,
                isWindowed: M,
                isScreenReader: E,
                maxWidth: maxProseWidth,
              }),
              "block",
            );
          else {
            let ae = formatTokenWindowed(z, L, {
              listDepth: 0,
              orderedListNumber: null,
              parent: null,
              highlight: q,
              glueProse: !1,
              linkCap: D,
              screenReader: E,
              promptMode: promptMode,
              windowed: M,
            });
            if (maxProseWidth !== void 0 && z.type === "code") {
              let ke = ee === lastIndex,
                ue = ke ? tailWrap : void 0,
                Ve = ke ? te() : null,
                Le = e(Ansi, {
                  dimColor: dimColor,
                  italic: italic,
                  monochrome: monochrome,
                  wrap: ue,
                  children: stripSuffix(
                    ae,
                    `
`,
                  ),
                });
              pe(color || Ve ? r(Text, { color: color, wrap: ue, children: [Le, Ve] }) : Le, "code");
            } else J += ae;
          }
        }),
        ne(tailWrap, !0),
        promptMode && X.length === 0 && _.trim())
      )
        ((J = WCr(_)), ne(tailWrap, !0));
      if (F && !v) K(V(e(Text, { color: "subtle", children: F }), 0, "prose"), "prose");
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
      A,
      N,
      E,
      tailWrap,
      skipTokenCache,
      markdownTokens,
      promptMode,
      markLinks,
      U,
      maxProseWidth,
    ]);
  return e(Box, { flexDirection: "column", children: B });
}
//@ chunk-bc20zedk.js:23084-23093 placement
var co = 2;
//@ chunk-bc20zedk.js:23093-24825 placement
function MarkdownToken(o) {
  let $ = w(21),
    {
      token: token,
      theme: theme,
      highlight: highlight,
      dimColor: dimColor,
      linkCap: linkCap,
      isWindowed: isWindowed,
      isScreenReader: isScreenReader,
      maxWidth: maxWidth,
    } = o,
    C;
  if ($[0] !== highlight || $[1] !== token)
    ((C = leadingBlockToken(token, highlight)), ($[0] = highlight), ($[1] = token), ($[2] = C));
  else C = $[2];
  let I = C;
  const b = I ?? token;
  let T, L;
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
      )
        ((A = (_) => ({
          code: _.type === "code",
          fullWidth: maxWidth !== void 0 && hasCodeOrTable(_),
          text: formatTokenWindowed(_, theme, {
            listDepth: 0,
            orderedListNumber: null,
            parent: null,
            highlight: highlight,
            glueProse: !1,
            linkCap: linkCap,
            screenReader: isScreenReader,
            windowed: isWindowed,
            quotesAround: 1,
          }),
        })),
          ($[14] = highlight),
          ($[15] = isScreenReader),
          ($[16] = isWindowed),
          ($[17] = linkCap),
          ($[18] = maxWidth),
          ($[19] = theme),
          ($[20] = A));
      else A = $[20];
      let mapped = b.tokens.map(A);
      if (maxWidth === void 0 || isScreenReader || !mapped.some(sliceAnsi)) {
        let joined = mapped.map(selectText).join("");
        let italic = sequential.italic((I ? joined : joined.replace(/^\n+/, "")).trimEnd());
        L = e(Box, {
          borderStyle: "quote",
          borderTop: !1,
          borderBottom: !1,
          borderRight: !1,
          borderDimColor: !0,
          paddingLeft: 1,
          maxWidth: maxWidth,
          children: e(Ansi, { dimColor: dimColor, children: italic }),
        });
        break Y;
      }
      let B = [];
      for (const W of mapped) {
        let at = B.at(-1);
        if (at && !at.fullWidth && !W.fullWidth) at.text = at.text + W.text;
        else B.push({ ...W });
      }
      let D = [];
      let G = 0;
      for (const q of B) {
        let X = q.code || (I !== void 0 && q === B[0]) ? q.text : q.text.replace(/^\n+/, "");
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
        ((G = G + (q.text.length - X.length)),
          D.push(
            e(
              Box,
              {
                marginTop: D.length > 0 ? Math.max(0, G - 1) : 0,
                maxWidth: q.fullWidth ? void 0 : maxWidth - co,
                children: e(Ansi, { dimColor: dimColor, children: sequential.italic(J) }),
              },
              D.length,
            ),
          ),
          (G = countCharInString(
            X.slice(J.length),
            `
`,
          )));
      }
      T = e(Box, {
        flexDirection: "column",
        borderStyle: "quote",
        borderTop: !1,
        borderBottom: !1,
        borderRight: !1,
        borderDimColor: !0,
        paddingLeft: 1,
        children: D,
      });
    }
    (($[3] = dimColor),
      ($[4] = I),
      ($[5] = highlight),
      ($[6] = isScreenReader),
      ($[7] = isWindowed),
      ($[8] = linkCap),
      ($[9] = maxWidth),
      ($[10] = b.tokens),
      ($[11] = theme),
      ($[12] = T),
      ($[13] = L));
  } else ((T = $[12]), (L = $[13]));
  if (L !== EARLY_RETURN_SENTINEL) return L;
  return T;
}
//@ chunk-bc20zedk.js:24825-25060 placement
function hasCodeOrTable(o) {
  let p = [o];
  for (let a = p.pop(); a !== void 0; a = p.pop()) {
    if (a.type === "code" || a.type === "table") return !0;
    let m =
      a.type === "list" ? a.items : a.type === "blockquote" || a.type === "list_item" ? (a.tokens ?? []) : [];
    for (let f of m) p.push(f);
  }
  return !1;
}
//@ chunk-bc20zedk.js:25060-25072 placement
var Ue = 4096;
//@ chunk-bc20zedk.js:25072-25198 placement
function createStreamState() {
  return {
    chunks: [],
    frozenSource: "",
    gapAfterChunks: !1,
    stablePrefix: "",
    openFence: null,
    openTable: null,
    isLinkless: !1,
  };
}
//@ chunk-bc20zedk.js:25198-25239 placement
var Lo = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/gm;
//@ chunk-bc20zedk.js:25239-25346 placement
function closesFence(o, p, a) {
  let m = o.match(/^`+|^~+/)?.[0] ?? "";
  return p[0] === m[0] && p.length >= m.length && a.trim() === "";
}
//@ chunk-bc20zedk.js:25346-25470 placement
function updateOpenFence(o, p) {
  let a = o;
  for (let m of p.matchAll(Lo))
    if (a === null) a = m[1] + m[2].trim();
    else if (closesFence(a, m[1], m[2])) a = null;
  return a;
}
//@ chunk-bc20zedk.js:25470-25604 placement
function closingFenceEnd(o, p) {
  for (let a of o.matchAll(Lo)) {
    let m = a.index + a[0].length;
    if (
      o[m] !==
      `
`
    )
      continue;
    if (closesFence(p, a[1], a[2])) return m + 1;
  }
  return -1;
}
/**
 * 把流式文本前缀冻结为一个渲染块，返回剩余部分。
 */
//@ chunk-bc20zedk.js:25604-26077 placement
function freezeStreamChunk(o, p, a, m) {
  let substring = p.substring(0, a),
    u =
      (o.openFence !== null
        ? o.openFence +
          `
`
        : (o.openTable ?? "")) + substring,
    c = o.openFence !== null || !m;
  if (
    ((o.chunks = [
      ...o.chunks,
      e(
        Box,
        {
          marginTop: o.chunks.length > 0 && o.gapAfterChunks ? 1 : 0,
          children: e(MarkdownText_2, {
            skipTokenCache: !0,
            skipHighlightCache: c,
            capProseWidth: !0,
            children: u,
          }),
        },
        o.chunks.length,
      ),
    ]),
    (o.openFence = updateOpenFence(o.openFence, substring)),
    (o.frozenSource += substring),
    (o.gapAfterChunks = m),
    (o.isLinkless ||= !m || o.openFence !== null),
    (o.stablePrefix = ""),
    m)
  )
    o.openTable = null;
  return p.substring(a);
}
//@ chunk-bc20zedk.js:26077-26089 placement
var MAX_BASH_COMMAND_SCAN_CHARS = 1536;
//@ chunk-bc20zedk.js:26089-26258 placement = getFileExtensionsFromBashCommand (1)
function getFileExtensionsFromBashCommand(o) {
  let index = o.lastIndexOf(`
`);
  if (index < Ue / 2) index = o.lastIndexOf(" ", o.length - MAX_BASH_COMMAND_SCAN_CHARS);
  if (index < Ue / 2) {
    index = o.length - MAX_BASH_COMMAND_SCAN_CHARS;
    let code = o.charCodeAt(index + 1);
    if (code >= 56320 && code <= 57343) index--;
  }
  return index + 1;
}
//@ chunk-bc20zedk.js:26258-26324 placement
var ni = /^ {0,3}\|[^\n]*\n[ |:\r-]*$/,
  si = /^ {0,3}\|/,
  ii = 1024,
  pi = 64;
//@ chunk-bc20zedk.js:26324-28498 placement
function StreamingMarkdown({ children: children, hideTrailingLine: hideTrailingLine = !1 }) {
  configureMarked();
  let a = stripPromptXMLTags(children),
    f = R(createStreamState()).current,
    u = !1,
    c = !1;
  if (!a.startsWith(f.frozenSource)) Object.assign(f, createStreamState());
  f.isLinkless ||= !isSmallMarkdown(a);
  let substring = a.substring(f.frozenSource.length);
  if (!substring.startsWith(f.stablePrefix)) f.stablePrefix = "";
  if (f.openFence !== null) {
    let _ = closingFenceEnd(substring, f.openFence);
    if (_ >= 0) substring = freezeStreamChunk(f, substring, _, !0);
    else if (substring.length > Ue)
      substring = freezeStreamChunk(f, substring, getFileExtensionsFromBashCommand(substring), !1);
  }
  if (f.openFence === null) {
    let _ = f.stablePrefix.length,
      N = f.openTable ?? "",
      E = N + substring.substring(_),
      U =
        E.lastIndexOf(`
`) + 1,
      Y = N !== "" || si.test(E.substring(U)) ? E.substring(0, U) : E,
      { tokens: tokens, isWindowed: isWindowed } = So(Ah, Y);
    f.isLinkless ||= isWindowed;
    let M = tokens.length - 1;
    while (M >= 0 && tokens[M].type === "space") M--;
    f.isLinkless ||= !UPs(tokens, Y);
    let at = tokens.at(-1),
      G = at?.type === "table" && endsWithHardBreak(Y),
      q = G ? Y.length : M > 0 ? hasMarkdownSyntax(tokens, M, Y) : 0,
      X = at?.type === "table" && !G ? at : null;
    ((u = X !== null || (at?.type === "paragraph" && ni.test(at.raw + E.substring(Y.length)))),
      (c = q > 0 || M === 0));
    let J = tokens[0];
    if (J?.type !== "table") f.openTable = null;
    if (N !== "" && q >= N.length)
      if (J?.type === "table" && J.rows.length === 0) ((f.openTable = null), (f.gapAfterChunks = !0));
      else substring = freezeStreamChunk(f, substring, q - N.length, !0);
    else if (N === "" && q > 0)
      ((f.stablePrefix = substring.substring(0, _ + q)),
        (f.isLinkless ||= qs(substring.substring(_, _ + q))));
    if (f.stablePrefix.length > Ue) substring = freezeStreamChunk(f, substring, f.stablePrefix.length, !0);
    if (substring.length - f.stablePrefix.length > Ue) {
      let oe = f.stablePrefix.length,
        v = getFileExtensionsFromBashCommand(substring.substring(oe)),
        K =
          substring[oe + v - 1] ===
            `
` &&
          X !== null &&
          X.header.length <= pi
            ? jCr(X.raw)
            : "";
      ((substring = freezeStreamChunk(f, substring, oe + v, !1)),
        (f.openTable = K !== "" && K.length <= ii ? K : null));
    }
  }
  let stablePrefix = f.stablePrefix,
    substring_2 = substring.substring(stablePrefix.length),
    C = stablePrefix.trim() !== "",
    I =
      f.openFence !== null
        ? f.openFence +
          `
`
        : (f.openTable ?? ""),
    b = substring_2 && I + substring_2;
  if (hideTrailingLine && u) {
    if (
      ((b = b.substring(
        0,
        b.lastIndexOf(`
`) + 1,
      )),
      c &&
        countCharInString(
          b.trim(),
          `
`,
        ) < 2)
    )
      b = "";
  }
  let T = !b.endsWith(`
`),
    L = b
      ? e(MarkdownText_2, {
          tailWrap: hideTrailingLine && T ? "wrap-stream" : void 0,
          skipTokenCache: !0,
          skipHighlightCache: !0,
          capProseWidth: !0,
          children: b,
        })
      : null;
  if (f.chunks.length === 0)
    return e(InsideMarkdownContext.Provider, {
      value: f.isLinkless,
      children: r(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          C && e(MarkdownText_2, { skipTokenCache: !0, capProseWidth: !0, children: stablePrefix }),
          L,
        ],
      }),
    });
  let A = f.gapAfterChunks ? 1 : 0;
  return e(InsideMarkdownContext.Provider, {
    value: f.isLinkless,
    children: r(Box, {
      flexDirection: "column",
      children: [
        f.chunks,
        C &&
          e(Box, {
            marginTop: A,
            children: e(MarkdownText_2, { skipTokenCache: !0, capProseWidth: !0, children: stablePrefix }),
          }),
        L && e(Box, { marginTop: C ? 1 : A, children: L }),
      ],
    }),
  });
}
//@ chunk-bc20zedk.js:28498-28539 placement
var MARKDOWN_LINK_SCHEMES = new Set(["https", "http", "file"]);
//@ chunk-bc20zedk.js:28539-29466 placement
function MarkdownBlock({
  text: text,
  dimColor: dimColor,
  press: press,
  part: part,
  elementKey: elementKey,
  pressableLinks: pressableLinks,
}) {
  let c = useClock(),
    g = useSelection(),
    [x] = y(() => c.now()),
    h = R(null),
    C = R({ press: press, pressableLinks: pressableLinks }),
    I = Vc(MarkdownText_2, {
      dimColor: dimColor,
      linkSchemes: MARKDOWN_LINK_SCHEMES,
      stripPromptTags: !1,
      children: text,
    });
  if (
    ((C.current = { press: press, pressableLinks: pressableLinks }),
    P(() => () => h.current?.(), []),
    press === void 0)
  )
    return elementKey === void 0
      ? I
      : Vc(Box, { flexDirection: "column", elementKey: elementKey, elementPlugin: part?.plugin }, I);
  return Vc(
    Box,
    {
      flexDirection: "column",
      elementKey: elementKey,
      elementPlugin: press.plugin,
      onClick: (b) => {
        let hyperlinkUrl = b.hyperlinkUrl;
        if (!(hyperlinkUrl !== void 0 && !(b.mods.ctrl || b.mods.alt) && h4r(hyperlinkUrl, pressableLinks))) {
          b.allowDefault();
          return;
        }
        if (b.isWindowActivation || c.now() - x < DOUBLE_CLICK_MS) {
          b.dropAsStray();
          return;
        }
        (b.stopImmediatePropagation(), h.current?.());
        let subscribe = g.subscribe(() => {
            if (g.hasSelection()) h.current?.();
          }),
          N = c.setTimeout(() => {
            ((h.current = null), subscribe());
            let E = C.current;
            if (E.press !== void 0 && h4r(hyperlinkUrl, E.pressableLinks) && E.press)
              pressFromTerminal(E.press, { href: hyperlinkUrl });
          }, MULTI_CLICK_MAX_MS);
        h.current = () => {
          ((h.current = null), subscribe(), N());
        };
      },
    },
    I,
  );
}
//@ chunk-bc20zedk.js:29466-29470 placement
j();
//@ chunk-bc20zedk.js:29470-29474 placement
j();
//@ chunk-bc20zedk.js:29474-29491 placement
var HotkeySeat = qt(null);
//@ chunk-bc20zedk.js:29491-29606 placement
function releaseInkFocus(o) {
  if (!o) return;
  let p = getFocusManager(o),
    a = p.activeElement ?? void 0;
  while (a && a !== o) a = a.parentNode;
  if (a === o) p.blur();
}
//@ chunk-bc20zedk.js:29606-30537 placement
function PressButton({
  plugin: plugin,
  handle: handle,
  element: element,
  label: label,
  hotkey: hotkey,
  action: action,
  plain: plain,
  dimColor: dimColor,
  variant: variant,
  hover: hover,
  held: held,
}) {
  let { hasKeyboardFocus: hasKeyboardFocus, ref: ref } = useSiteFocus({ plugin: plugin, handle: handle }),
    T = R(null),
    L = Se(HotkeySeat);
  zt(() => {
    let N = T.current;
    return hotkey !== void 0 && L !== null && N !== null ? L(hotkey, N) : void 0;
  }, [L, hotkey]);
  let { overrides: overrides, handlers: handlers } = useHoverLit(groupOf(plugin, hover), hover, "Box");
  return Vc(
    Box,
    {
      ref: T,
      flexShrink: 0,
      alignSelf: "flex-start",
      elementKey: element,
      elementPlugin: plugin,
      onClick: (N) => {
        (releaseInkFocus(T.current), N.stopImmediatePropagation());
      },
      ...handlers,
    },
    action !== void 0 && Vc(ActionKeysSeat, { plugin: plugin, handle: handle, action: action }),
    Vc(Button, {
      ref: ref,
      tabIndex: -1,
      flexShrink: 0,
      alignSelf: "flex-start",
      onAction: () => pressFromTerminal({ plugin: plugin, handle: handle }),
      children: (N) => {
        let E = N.focused || N.hovered || hasKeyboardFocus,
          U = dimColor === !0 && !E,
          Y = plain === !0,
          B = hotkey === void 0,
          W = held.length > 0,
          M = W ? held : [label];
        return Y
          ? Vc(
              Text,
              { inverse: E, dimColor: U, ...overrides },
              B ? "" : Vc(Text, { color: "suggestion" }, hotkey),
              B ? "" : ": ",
              ...M,
            )
          : Vc(
              Text,
              {
                inverse: E,
                bold: !0,
                dimColor: U,
                color: variant === "primary" ? "suggestion" : void 0,
                ...overrides,
              },
              ...(W ? ["[ ", ...held, " ]"] : [`[ ${label} ]`]),
            );
      },
    }),
  );
}
//@ chunk-bc20zedk.js:30537-30541 placement
j();
//@ chunk-bc20zedk.js:30541-30545 placement
j();
//@ chunk-bc20zedk.js:30545-30549 placement
j();
//@ chunk-bc20zedk.js:30549-30657 placement
function mouseButtonName(o) {
  switch (o) {
    case 0:
      return "left";
    case 1:
      return "middle";
    case 2:
      return "right";
    case void 0:
      return;
  }
}
//@ chunk-bc20zedk.js:30657-30661 placement
j();
//@ chunk-bc20zedk.js:30661-30665 placement
j();
/**
 * 点击发生在元素外（非窗口激活）时回调。
 */
//@ chunk-bc20zedk.js:30665-30848 placement
function useClickOutside(o) {
  let p = R(null),
    { subscribeClicks: subscribeClicks } = Se(kp);
  return (
    P(
      () =>
        subscribeClicks((m, f) => {
          let u = m ?? void 0;
          while (u && u !== p.current) u = u.parentNode;
          if (!u && f?.isWindowActivation !== !0) o();
        }),
      [o, subscribeClicks],
    ),
    p
  );
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
function toPluginKeyEvent(o, p) {
  if (p.wheelUp || p.wheelDown) return;
  let a = KEY_NAME_MAP.find(([f]) => p[f])?.[1] ?? (o === " " ? "space" : o);
  return a === ""
    ? void 0
    : { key: a, ...(p.ctrl && { ctrl: !0 }), ...(p.shift && { shift: !0 }), ...(p.meta && { meta: !0 }) };
}
/**
 * 插件面板获得焦点时转发按键，Esc/Ctrl+C 释放焦点。
 */
//@ chunk-bc20zedk.js:31290-31703 placement
function usePluginKeyFocus(o) {
  let p = ce(() => Ewo(o.id), [o]),
    a = useClickOutside(p),
    m = useStoreSelector(HTe, (u) => u.focusedId) === o.id,
    f = useStoreSelector(ul(), (u) => u.focusedId);
  return (
    P(() => {
      if (f !== null && m) Qrn(null);
    }, [f, m]),
    P(() => p, [p]),
    usePreDispatchKeyHandler((u, c, g) => {
      let x = HTe.getState().focusedId === o.id,
        h = c.escape || (c.ctrl && (u === "c" || u === "d"));
      if (!x) return !1;
      if (!o.acceptsKeys()) return (p(), !1);
      if (h) return (Qrn(null), c.escape);
      let C = toPluginKeyEvent(u === "" ? g : u, c);
      if (C === void 0) return !1;
      return (o.key(C), !0);
    }),
    a
  );
}
//@ chunk-bc20zedk.js:31703-32807 placement
function RenderHostElement({ host: host, instance: instance, snapshot: snapshot }) {
  let {
      rebuild: rebuild,
      props: props,
      width: width,
      height: height,
      flexGrow: flexGrow,
      plugin: plugin,
      elementKey: elementKey,
    } = host,
    C = usePluginKeyFocus(instance);
  (P(() => {
    instance.setProps(props);
  }, [instance, props]),
    P(() => {
      instance.drawnAgain();
    }, [instance, host.drawn]));
  let I = useMeasured(() => (C.current === null ? 0 : measureElement(C.current).width)),
    b = useMeasured(() => (C.current === null ? 0 : measureElement(C.current).height));
  (zt(() => {
    instance.laidOut();
  }),
    P(() => {
      instance.resize(I, b);
    }, [instance, I, b]));
  let T = R({ x: 0, y: 0 }),
    L = snapshot.status === "drawn",
    A = L && instance.acceptsPointer(),
    _ = A || (L && instance.acceptsKeys());
  useFinePointer(A);
  function N(E) {
    if (E.type === "down" && instance.acceptsKeys()) (focusPane(null), Qrn(instance.id));
    ((T.current = { x: E.localCol, y: E.localRow }),
      instance.pointer({
        type: E.type,
        x: E.localCol,
        y: E.localRow,
        ...(E.fine && { fine: { x: E.fine.col, y: E.fine.row } }),
        ...(E.button !== void 0 && { button: mouseButtonName(E.button) }),
        ...(E.shift && { shift: !0 }),
        ...(E.alt && { alt: !0 }),
        ...(E.ctrl && { ctrl: !0 }),
      }));
  }
  return Vc(
    Box,
    {
      ref: C,
      flexDirection: "column",
      flexShrink: 0,
      width: width,
      height: height,
      flexGrow: flexGrow,
      overflow: "hidden",
      elementKey: elementKey,
      elementPlugin: plugin,
      ...(_ && {
        onPointer: N,
        onMouseEnter: () => {
          instance.pointer({ type: "enter", ...T.current });
        },
        onMouseLeave: () => {
          instance.pointer({ type: "leave", ...T.current });
        },
      }),
    },
    L && rebuild(snapshot.tree),
    snapshot.status === "failed" && Vc(Text, { dimColor: !0, wrap: "truncate-end" }, snapshot.text),
  );
}
//@ chunk-bc20zedk.js:32807-32811 placement
j();
//@ chunk-bc20zedk.js:32811-33028 placement
function createTicker(o) {
  if (o === null)
    return {
      every: (p, a) => {
        let m = setInterval(a, Math.max(p, Xh));
        return () => clearInterval(m);
      },
    };
  return {
    every: (p, a) => {
      let now = o.now();
      return o.subscribeKeepAlive(() => {
        let now_2 = o.now();
        if (now_2 - now >= p) ((now = now_2), a());
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
