/**
 * components/pluginUi/render/elements.tsx
 *
 * 2.1.316 新增。插件 ui.render 的基础元素组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bc20zedk.js (52)
 * attribution: placement 52
 */
import { init_react_production, R, Se, P, qt, y, Vc } from "../../../../vendor/react/cjs/react.production.js";
import { truncateToWidth } from "../../../utils/format.js";
import { drawnText, codeHunks } from "../../../plugins/functionHooks/ui/validateTree.js";
import { convertHunkLeadingTabs } from "../../../utils/diff.js";
import { computeGutterWidth } from "../../StructuredDiff.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { measureElement } from "../../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../../ink/components/Input.js";
import { BodyColumns, ClickedPress } from "./actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { StructuredDiffList } from "../../StructuredDiffList.js";
import { HighlightedCode } from "../../HighlightedCode.js";
import { heldRenderInput } from "../../../plugins/functionHooks/ui/renderDispatch.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { hoverScopeKey } from "../../../plugins/functionHooks/ui/elements.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { paneColorOf } from "../../../plugins/functionHooks/panes.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { supportsShiftEnter } from "../../../commands/terminalSetup/terminalSetup.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { usePreDispatchKeyHandler } from "../../../keybindings/useActionHandlers.js";
import { needsShiftWorkaround } from "../../../hooks/useTextInput.js";
import { TextInput } from "../../TextInput.js";
import { checkAgentDescriptions } from "../../../utils/markdownHeadings.js";
import { TOTAL_BUDGET_BYTES } from "../../../utils/highlight/boundedHighlight.js";
import { canonicalLanguageName } from "../../../utils/highlight/pluginLanguages.js";
import { sequential } from "../../../utils/sequential.js";
import { formatTokenWindowed } from "../../../utils/markdown.js";
import { plural } from "../../../utils/stringUtils.js";

//@ chunk-bc20zedk.js:6145-6149 placement
init_react_production();
//@ chunk-bc20zedk.js:6149-6176 placement
var rulerCut = (o, p) => truncateToWidth(drawnText(o), p);
//@ chunk-bc20zedk.js:6176-6303 placement
var clippedHunks = (hunks, p) =>
  convertHunkLeadingTabs(hunks).map((a) => {
    let max = Math.max(1, p - computeGutterWidth(a));
    return {
      ...a,
      lines: a.lines.map((line) => line.slice(0, 1) + rulerCut(line.slice(1), max)),
    };
  });
//@ chunk-bc20zedk.js:6303-6457 placement
function clippedLines(source, p, startLine) {
  let lines = source.replace(/\n$/, "").split(`
`);
  let max = Math.max(1, p - (startLine !== undefined ? String(startLine + lines.length - 1).length + 2 : 0));
  return lines.map((line) => rulerCut(line, max)).join(`
`);
}
//@ chunk-bc20zedk.js:6457-6461 placement
init_react_production();
//@ chunk-bc20zedk.js:6461-6471 placement
var DEFAULT_COLUMNS = 80;
//@ chunk-bc20zedk.js:6471-6532 placement
var highlightPath = ({ language, path }) => (language === undefined ? (path ?? "") : `source.${language}`);
//@ chunk-bc20zedk.js:6532-7486 placement
function CodeBlock(props) {
  let $ = w(21);
  let { source, startLine, format, wrap } = props;
  let u = R(null);
  let g;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    g = () => (u.current ? Math.floor(measureElement(u.current).width) : 0);
    $[0] = g;
  } else g = $[0];
  let measured = useMeasured(g);
  let h = Se(BodyColumns) ?? 0;
  let C = h > 0 ? h : DEFAULT_COLUMNS;
  let I = measured > 0 ? measured : C;
  let b;
  if ($[1] !== props) {
    b = highlightPath(props);
    $[1] = props;
    $[2] = b;
  } else b = $[2];
  let filePath = b;
  let L = wrap === "truncate-end";
  let A;
  if ($[3] !== format || $[4] !== source) {
    A = codeHunks(source, format);
    $[3] = format;
    $[4] = source;
    $[5] = A;
  } else A = $[5];
  let _ = A;
  let hunks = _?.kind === "hunks" ? _.hunks : undefined;
  let E;
  if ($[6] !== I || $[7] !== L || $[8] !== hunks) {
    E = hunks && (L ? clippedHunks(hunks, I) : convertHunkLeadingTabs(hunks));
    $[6] = I;
    $[7] = L;
    $[8] = hunks;
    $[9] = E;
  } else E = $[9];
  let U = E;
  let Y;
  if ($[10] !== I || $[11] !== L || $[12] !== source || $[13] !== startLine) {
    Y = L ? clippedLines(source, I, startLine) : source;
    $[10] = I;
    $[11] = L;
    $[12] = source;
    $[13] = startLine;
    $[14] = Y;
  } else Y = $[14];
  let code = Y;
  let W;
  if ($[15] !== code || $[16] !== I || $[17] !== filePath || $[18] !== U || $[19] !== startLine) {
    W = jsxProd_default(Box, {
      ref: u,
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 1,
      children: U
        ? jsxProd_default(StructuredDiffList, {
            hunks: U,
            dim: false,
            width: I,
            filePath,
            firstLine: null,
          })
        : jsxProd_default(HighlightedCode, {
            code,
            filePath,
            width: I,
            startLine,
            lineNumbers: startLine !== undefined,
          }),
    });
    $[15] = code;
    $[16] = I;
    $[17] = filePath;
    $[18] = U;
    $[19] = startLine;
    $[20] = W;
  } else W = $[20];
  return W;
}
//@ chunk-bc20zedk.js:7486-7569 placement
function heldFor(tree, p, a) {
  let m = heldRenderInput(tree, p);
  return m !== undefined && m.component === a.component ? m : a;
}
//@ chunk-bc20zedk.js:7569-7573 placement
init_react_production();
//@ chunk-bc20zedk.js:7573-7601 placement
var hoverGroupsStore = () => getPluginRegistry().hoverGroups;
//@ chunk-bc20zedk.js:7601-7708 placement
var adjustHoverGroup = (o, p) =>
  hoverGroupsStore().setState((a) => {
    let m = (a.get(o) ?? 0) + p;
    let f = new Map(a);
    if (m > 0) f.set(o, m);
    else f.delete(o);
    return f;
  });
//@ chunk-bc20zedk.js:7708-7902 placement
function groupMember() {
  let o;
  function p(m) {
    if (m !== undefined && o === undefined) {
      o = m;
      adjustHoverGroup(m, 1);
    }
  }
  function a() {
    let m = o;
    if (m !== undefined) {
      o = undefined;
      adjustHoverGroup(m, -1);
    }
  }
  return {
    enter: p,
    leave: a,
    regroup: (m) => {
      if (o !== undefined && o !== m) {
        a();
        p(m);
      }
    },
  };
}
//@ chunk-bc20zedk.js:7902-7990 placement
function groupOf(plugin, hover) {
  let scope = hover?.scope;
  return plugin !== undefined && scope !== undefined
    ? {
        plugin,
        scope,
      }
    : undefined;
}
//@ chunk-bc20zedk.js:7990-8034 placement
function hoverOverridesOf(o) {
  let { scope, ...a } = o;
  return a;
}
//@ chunk-bc20zedk.js:8034-8038 placement
init_react_production();
//@ chunk-bc20zedk.js:8038-8293 placement
function useHoverGroup(o, p) {
  let a = o && hoverScopeKey(o);
  let isHot =
    useStoreSelector(
      a === undefined ? null : hoverGroupsStore(),
      (c) => a !== undefined && (c.get(a) ?? 0) > 0,
    ) ?? false;
  let f = R(null);
  f.current ??= groupMember();
  let u = f.current;
  P(() => {
    u.regroup(a);
  }, [u, a]);
  P(() => u.leave, [u, p]);
  return {
    isHot,
    onMouseEnter: () => u.enter(a),
    onMouseLeave: u.leave,
  };
}
//@ chunk-bc20zedk.js:8293-8297 placement
init_react_production();
//@ chunk-bc20zedk.js:8297-8346 placement
var HEX_COLOR_PROPS = ["color", "backgroundColor", "borderColor"];
//@ chunk-bc20zedk.js:8346-8486 placement
function withHexColors(o) {
  if (!o) return null;
  let p = {
    ...o,
  };
  for (let a of HEX_COLOR_PROPS) {
    let m = p[a];
    let f = typeof m === "string" ? paneColorOf(m) : undefined;
    if (f !== undefined) p[a] = f;
  }
  return p;
}
//@ chunk-bc20zedk.js:8486-8490 placement
init_react_production();
//@ chunk-bc20zedk.js:8490-8504 placement
var ScopeHovered = qt(false);
//@ chunk-bc20zedk.js:8504-8719 placement
function useHoverLit(o, hover, a) {
  let m = Se(ScopeHovered);
  let hoverGroup = useHoverGroup(o, a);
  let overrides = (o ? hoverGroup.isHot : m) && hover ? (withHexColors(hoverOverridesOf(hover)) ?? {}) : {};
  return o
    ? {
        overrides,
        handlers: {
          onMouseEnter: hoverGroup.onMouseEnter,
          onMouseLeave: hoverGroup.onMouseLeave,
          hoverFollowsPaint: true,
        },
      }
    : {
        overrides,
        handlers: {},
      };
}
//@ chunk-bc20zedk.js:8719-9047 placement
function HoverScope({ isLive, elementKey, layout, hover, group, children }) {
  let [c, g] = y(false);
  let hoverGroup = useHoverGroup(group, "Box");
  let h = isLive && c;
  let I =
    hover !== undefined && (group ? hoverGroup.isHot : h)
      ? {
          ...layout,
          ...hoverOverridesOf(hover),
        }
      : layout;
  return Vc(
    ScopeHovered.Provider,
    {
      value: h,
    },
    Vc(
      Box,
      {
        ...withHexColors(I),
        elementKey,
        hoverFollowsPaint: true,
        onMouseEnter: () => {
          g(true);
          hoverGroup.onMouseEnter();
        },
        onMouseLeave: () => {
          g(false);
          hoverGroup.onMouseLeave();
        },
      },
      ...children,
    ),
  );
}
//@ chunk-bc20zedk.js:9047-9051 placement
init_react_production();
//@ chunk-bc20zedk.js:9051-9211 placement
function HoverStyled({ isInline, props, hover, group, children }) {
  let u = isInline ? "Text" : "Box";
  let { overrides, handlers } = useHoverLit(group, hover, u);
  return Vc(
    isInline ? Text : Box,
    {
      ...withHexColors(props),
      ...overrides,
      ...handlers,
    },
    ...children,
  );
}
//@ chunk-bc20zedk.js:9211-9221 placement
var FIELD_MIN_COLUMNS = 12;
//@ chunk-bc20zedk.js:9221-9225 placement
init_react_production();
//@ chunk-bc20zedk.js:9225-9229 placement
init_react_production();
//@ chunk-bc20zedk.js:9229-9246 placement
var InputFields = qt(null);
//@ chunk-bc20zedk.js:9246-9250 placement
init_react_production();
//@ chunk-bc20zedk.js:9250-9267 placement
var SiteColumns = qt(null);
//@ chunk-bc20zedk.js:9267-9271 placement
init_react_production();
//@ chunk-bc20zedk.js:9271-9288 placement
var SiteRows = qt(null);
//@ chunk-bc20zedk.js:9288-9292 placement
init_react_production();
//@ chunk-bc20zedk.js:9292-9411 placement
var focusClick = (o) => (p) => {
  let a = p.isWindowActivation || p.droppedAsStray;
  if (p.hyperlinkUrl !== undefined) p.allowDefault();
  if (!a) o();
};
//@ chunk-bc20zedk.js:9411-9415 placement
init_react_production();
//@ chunk-bc20zedk.js:9415-9432 placement
var FocusedNode = qt(null);
//@ chunk-bc20zedk.js:9432-9436 placement
init_react_production();
//@ chunk-bc20zedk.js:9436-9453 placement
var FocusedPress = qt(null);
//@ chunk-bc20zedk.js:9453-9661 placement
function useSiteFocus(props) {
  let { plugin, handle } = props;
  let m = Se(FocusedPress);
  let f = Se(FocusedNode);
  let u = Se(ClickedPress);
  let c = m !== null && m.plugin === plugin && m.handle === handle;
  return {
    hasKeyboardFocus: c,
    ref: c ? (f ?? undefined) : undefined,
    onClick: u
      ? focusClick(() =>
          u({
            plugin,
            handle,
          }),
        )
      : undefined,
  };
}
//@ chunk-bc20zedk.js:9661-11053 placement
function InputField(props) {
  let { plugin, handle, element, placeholder } = props;
  let siteFocus = useSiteFocus({
    plugin,
    handle,
  });
  let c = Se(InputFields);
  let terminalSize = useTerminalSize();
  let x = Se(SiteColumns) ?? terminalSize.columns;
  let h = c?.textOf(plugin, element) ?? props.value ?? "";
  let [C, I] = y(h.length);
  let min = Math.min(props.rows ?? 1, Se(SiteRows) ?? terminalSize.rows);
  let T = min > 1;
  let L = props.label === undefined ? "" : `${props.label}: `;
  let hasKeyboardFocus = c !== null && siteFocus.hasKeyboardFocus;
  let _ = ` \u23CE ${props.submitLabel ?? "submit"}`;
  let E =
    T && hasKeyboardFocus ? `${_} \xB7 ${supportsShiftEnter() ? "shift+\u23CE" : "\\\u23CE"} new line` : _;
  let U = x - bunStringWidth(L);
  let B = U - bunStringWidth(E) >= x / 2 ? E : _;
  let min_2 = Math.min(C, h.length);
  P(() => {
    if (hasKeyboardFocus) I(Number.MAX_SAFE_INTEGER);
  }, [hasKeyboardFocus]);
  usePreDispatchKeyHandler(
    (M, D) => {
      let G = h[min_2 - 1] === "\\";
      let q = D.return && !D.shift && !D.meta && !D.ctrl && (G || needsShiftWorkaround());
      if (q) {
        let sliced = h.slice(0, G ? min_2 - 1 : min_2);
        c?.edit(
          {
            plugin,
            handle,
            element,
          },
          `${sliced}
${h.slice(min_2)}`,
        );
        I(sliced.length + 1);
      }
      return q;
    },
    {
      isActive: hasKeyboardFocus && T,
    },
  );
  return jsxProd_default_2(Box, {
    ref: siteFocus.ref,
    flexDirection: "row",
    flexShrink: 0,
    height: T ? min : undefined,
    overflow: T ? "hidden" : undefined,
    elementKey: element,
    elementPlugin: plugin,
    onClick: siteFocus.onClick,
    children: [
      L !== "" &&
        jsxProd_default(Text, {
          bold: hasKeyboardFocus,
          children: L,
        }),
      hasKeyboardFocus
        ? jsxProd_default(TextInput, {
            value: h,
            onChange: (M) =>
              c.edit(
                {
                  plugin,
                  handle,
                  element,
                },
                M,
              ),
            placeholder,
            columns: Math.max(FIELD_MIN_COLUMNS, U - bunStringWidth(B)),
            cursorOffset: min_2,
            onChangeCursorOffset: I,
            onHistoryUp: () => c.step("previous"),
            onHistoryDown: () => c.step("next"),
            inputFilter: T
              ? (M) =>
                  M.replace(
                    /\r\n?/g,
                    `
`,
                  )
              : undefined,
            maxVisibleLines: T ? min : undefined,
            focus: true,
            showCursor: true,
            multiline: T,
            disableBackslashReturn: true,
            disableEscapeDoublePress: true,
          })
        : jsxProd_default(Text, {
            dimColor: h === "",
            wrap: T ? "wrap" : "truncate-end",
            children: h === "" ? (placeholder ?? "") : h,
          }),
      hasKeyboardFocus &&
        jsxProd_default(Text, {
          dimColor: true,
          children: B,
        }),
    ],
  });
}
//@ chunk-bc20zedk.js:11053-11057 placement
init_react_production();
//@ chunk-bc20zedk.js:11057-11116 placement = isConnectionError (1)
var collectCodeSegments = (err) =>
  err.flatMap((p) => (p.type === "code" ? [p] : collectCodeSegments(checkAgentDescriptions(p))));
//@ chunk-bc20zedk.js:11116-11213 placement
var SYNTAX_HIGHLIGHT_CUT_TEXT =
  "Syntax highlighting stops here. This message has more code than is highlighted at once.";
//@ chunk-bc20zedk.js:11213-11583 placement
/**
 * 带高亮预算的代码高亮器（超预算原样输出）。
 */
function createBudgetedHighlighter(o) {
  if (o === null) return null;
  let p = {
    left: TOTAL_BUDGET_BYTES,
  };
  let weakMap = new WeakMap();
  let m = false;
  return {
    supportsLanguage: o.supportsLanguage,
    highlight(f, u) {
      let c = u?.fence && weakMap.get(u.fence);
      let g = canonicalLanguageName(u?.language ?? "") === "plaintext";
      if (c !== undefined || g) return c ?? f;
      let x = p.left <= 0;
      let h = x
        ? f
        : o.highlight(f, {
            ...u,
            work: p,
          });
      let I =
        x && !m && sequential.level > 0
          ? `${sequential.dim(SYNTAX_HIGHLIGHT_CUT_TEXT)}
${f}`
          : h;
      m ||= x;
      if (u?.fence) weakMap.set(u.fence, I);
      return I;
    },
  };
}
//@ chunk-bc20zedk.js:11583-11689 placement
function prehighlightCodeSegments(highlight, err, a) {
  let budgetedHighlighter = createBudgetedHighlighter(highlight);
  if (budgetedHighlighter !== null)
    collectCodeSegments(err).forEach((f) =>
      formatTokenWindowed(f, a, {
        highlight: budgetedHighlighter,
        windowed: false,
      }),
    );
  return budgetedHighlighter;
}
//@ chunk-bc20zedk.js:11689-11693 placement
init_react_production();
//@ chunk-bc20zedk.js:11693-11697 placement
init_react_production();
//@ chunk-bc20zedk.js:11697-11728 placement
function trimEntryText(q) {
  return q.trim();
}
//@ chunk-bc20zedk.js:11728-11754 placement
var CODE_LIST_TAB_WIDTH = 4;
var LIST_LEVEL_INDENT = 3;
var BLOCK_QUOTE_INDENT = 4;
var MAX_RENDER_ROWS = 200;
//@ chunk-bc20zedk.js:11754-11835 placement
function moreRowsText(o) {
  return `\u2026 ${o.toLocaleString()} more ${plural(o, "row")} not shown`;
}
export {
  FocusedPress,
  FocusedNode,
  InputFields,
  focusClick,
  SiteColumns,
  SiteRows,
  CodeBlock,
  DEFAULT_COLUMNS,
  FIELD_MIN_COLUMNS,
  HEX_COLOR_PROPS,
  HoverScope,
  HoverStyled,
  InputField,
  ScopeHovered,
  adjustHoverGroup,
  clippedHunks,
  clippedLines,
  groupMember,
  groupOf,
  heldFor,
  highlightPath,
  hoverGroupsStore,
  hoverOverridesOf,
  rulerCut,
  useHoverGroup,
  useHoverLit,
  useSiteFocus,
  withHexColors,
  MAX_RENDER_ROWS,
  moreRowsText,
  LIST_LEVEL_INDENT,
  CODE_LIST_TAB_WIDTH,
  BLOCK_QUOTE_INDENT,
  trimEntryText,
  prehighlightCodeSegments,
};
