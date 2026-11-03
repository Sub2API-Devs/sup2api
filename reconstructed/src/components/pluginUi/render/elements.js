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
import { j, R, Se, P, qt, y, Vc } from "../../../../vendor/react/cjs/react.production.js";
import { truncateToWidth } from "../../../utils/format.js";
import { drawnText, codeHunks } from "../../../plugins/functionHooks/ui/validateTree.js";
import { convertHunkLeadingTabs } from "../../../utils/diff.js";
import { computeGutterWidth } from "../../StructuredDiff.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { measureElement } from "../../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../../ink/components/Input.js";
import { BodyColumns, ClickedPress } from "./actionKeys.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { StructuredDiffList } from "../../StructuredDiffList.js";
import { HighlightedCode } from "../../HighlightedCode.js";
import { heldRenderInput } from "../../../plugins/functionHooks/ui/renderDispatch.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { Ifr } from "../../../plugins/functionHooks/ui/elements.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { Ftr } from "../../../plugins/functionHooks/panes.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { supportsShiftEnter } from "../../../commands/terminalSetup/terminalSetup.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { usePreDispatchKeyHandler } from "../../../keybindings/useActionHandlers.js";
import { Vnn } from "../../../hooks/useTextInput.js";
import { TextInput } from "../../TextInput.js";
import { checkAgentDescriptions } from "../../../utils/markdownHeadings.js";
import { tFi } from "../../../utils/highlight/boundedHighlight.js";
import { canonicalLanguageName } from "../../../utils/highlight/pluginLanguages.js";
import { sequential } from "../../../utils/sequential.js";
import { formatTokenWindowed } from "../../../utils/markdown.js";
import { plural } from "../../../utils/stringUtils.js";

//@ chunk-bc20zedk.js:6145-6149 placement
j();
//@ chunk-bc20zedk.js:6149-6176 placement
var rulerCut = (o, p) => truncateToWidth(drawnText(o), p);
//@ chunk-bc20zedk.js:6176-6303 placement
var clippedHunks = (o, p) =>
  convertHunkLeadingTabs(o).map((a) => {
    let max = Math.max(1, p - computeGutterWidth(a));
    return { ...a, lines: a.lines.map((line) => line.slice(0, 1) + rulerCut(line.slice(1), max)) };
  });
//@ chunk-bc20zedk.js:6303-6457 placement
function clippedLines(o, p, a) {
  let parts = o.replace(/\n$/, "").split(`
`),
    max = Math.max(1, p - (a !== void 0 ? String(a + parts.length - 1).length + 2 : 0));
  return parts.map((c) => rulerCut(c, max)).join(`
`);
}
//@ chunk-bc20zedk.js:6457-6461 placement
j();
//@ chunk-bc20zedk.js:6461-6471 placement
var DEFAULT_COLUMNS = 80;
//@ chunk-bc20zedk.js:6471-6532 placement
var highlightPath = ({ language: language, path: path }) =>
  language === void 0 ? (path ?? "") : `source.${language}`;
//@ chunk-bc20zedk.js:6532-7486 placement
function CodeBlock(o) {
  let $ = w(21),
    { source: source, startLine: startLine, format: format, wrap: wrap } = o,
    u = R(null),
    g;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((g = () => (u.current ? Math.floor(measureElement(u.current).width) : 0)), ($[0] = g));
  else g = $[0];
  let x = useMeasured(g),
    h = Se(BodyColumns) ?? 0,
    C = h > 0 ? h : DEFAULT_COLUMNS,
    I = x > 0 ? x : C,
    b;
  if ($[1] !== o) ((b = highlightPath(o)), ($[1] = o), ($[2] = b));
  else b = $[2];
  let T = b,
    L = wrap === "truncate-end",
    A;
  if ($[3] !== format || $[4] !== source)
    ((A = codeHunks(source, format)), ($[3] = format), ($[4] = source), ($[5] = A));
  else A = $[5];
  let _ = A,
    N = _?.kind === "hunks" ? _.hunks : void 0,
    E;
  if ($[6] !== I || $[7] !== L || $[8] !== N)
    ((E = N && (L ? clippedHunks(N, I) : convertHunkLeadingTabs(N))),
      ($[6] = I),
      ($[7] = L),
      ($[8] = N),
      ($[9] = E));
  else E = $[9];
  let U = E,
    Y;
  if ($[10] !== I || $[11] !== L || $[12] !== source || $[13] !== startLine)
    ((Y = L ? clippedLines(source, I, startLine) : source),
      ($[10] = I),
      ($[11] = L),
      ($[12] = source),
      ($[13] = startLine),
      ($[14] = Y));
  else Y = $[14];
  let B = Y,
    W;
  if ($[15] !== B || $[16] !== I || $[17] !== T || $[18] !== U || $[19] !== startLine)
    ((W = e(Box, {
      ref: u,
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 1,
      children: U
        ? e(StructuredDiffList, { hunks: U, dim: !1, width: I, filePath: T, firstLine: null })
        : e(HighlightedCode, {
            code: B,
            filePath: T,
            width: I,
            startLine: startLine,
            lineNumbers: startLine !== void 0,
          }),
    })),
      ($[15] = B),
      ($[16] = I),
      ($[17] = T),
      ($[18] = U),
      ($[19] = startLine),
      ($[20] = W));
  else W = $[20];
  return W;
}
//@ chunk-bc20zedk.js:7486-7569 placement
function heldFor(o, p, a) {
  let m = heldRenderInput(o, p);
  return m !== void 0 && m.component === a.component ? m : a;
}
//@ chunk-bc20zedk.js:7569-7573 placement
j();
//@ chunk-bc20zedk.js:7573-7601 placement
var hoverGroupsStore = () => getPluginRegistry().hoverGroups;
//@ chunk-bc20zedk.js:7601-7708 placement
var adjustHoverGroup = (o, p) =>
  hoverGroupsStore().setState((a) => {
    let m = (a.get(o) ?? 0) + p,
      f = new Map(a);
    return (m > 0 ? f.set(o, m) : f.delete(o), f);
  });
//@ chunk-bc20zedk.js:7708-7902 placement
function groupMember() {
  let o;
  function p(m) {
    if (m !== void 0 && o === void 0) ((o = m), adjustHoverGroup(m, 1));
  }
  function a() {
    let m = o;
    if (m !== void 0) ((o = void 0), adjustHoverGroup(m, -1));
  }
  return {
    enter: p,
    leave: a,
    regroup: (m) => {
      if (o !== void 0 && o !== m) (a(), p(m));
    },
  };
}
//@ chunk-bc20zedk.js:7902-7990 placement
function groupOf(o, p) {
  let a = p?.scope;
  return o !== void 0 && a !== void 0 ? { plugin: o, scope: a } : void 0;
}
//@ chunk-bc20zedk.js:7990-8034 placement
function hoverOverridesOf(o) {
  let { scope: scope, ...a } = o;
  return a;
}
//@ chunk-bc20zedk.js:8034-8038 placement
j();
//@ chunk-bc20zedk.js:8038-8293 placement
function useHoverGroup(o, p) {
  let a = o && Ifr(o),
    m =
      useStoreSelector(
        a === void 0 ? null : hoverGroupsStore(),
        (c) => a !== void 0 && (c.get(a) ?? 0) > 0,
      ) ?? !1,
    f = R(null);
  f.current ??= groupMember();
  let u = f.current;
  return (
    P(() => {
      u.regroup(a);
    }, [u, a]),
    P(() => u.leave, [u, p]),
    { isHot: m, onMouseEnter: () => u.enter(a), onMouseLeave: u.leave }
  );
}
//@ chunk-bc20zedk.js:8293-8297 placement
j();
//@ chunk-bc20zedk.js:8297-8346 placement
var HEX_COLOR_PROPS = ["color", "backgroundColor", "borderColor"];
//@ chunk-bc20zedk.js:8346-8486 placement
function withHexColors(o) {
  if (!o) return null;
  let p = { ...o };
  for (let a of HEX_COLOR_PROPS) {
    let m = p[a],
      f = typeof m === "string" ? Ftr(m) : void 0;
    if (f !== void 0) p[a] = f;
  }
  return p;
}
//@ chunk-bc20zedk.js:8486-8490 placement
j();
//@ chunk-bc20zedk.js:8490-8504 placement
var ScopeHovered = qt(!1);
//@ chunk-bc20zedk.js:8504-8719 placement
function useHoverLit(o, p, a) {
  let m = Se(ScopeHovered),
    f = useHoverGroup(o, a),
    c = (o ? f.isHot : m) && p ? (withHexColors(hoverOverridesOf(p)) ?? {}) : {};
  return o
    ? {
        overrides: c,
        handlers: { onMouseEnter: f.onMouseEnter, onMouseLeave: f.onMouseLeave, hoverFollowsPaint: !0 },
      }
    : { overrides: c, handlers: {} };
}
//@ chunk-bc20zedk.js:8719-9047 placement
function HoverScope({
  isLive: isLive,
  elementKey: elementKey,
  layout: layout,
  hover: hover,
  group: group,
  children: children,
}) {
  let [c, g] = y(!1),
    x = useHoverGroup(group, "Box"),
    h = isLive && c,
    I = hover !== void 0 && (group ? x.isHot : h) ? { ...layout, ...hoverOverridesOf(hover) } : layout;
  return Vc(
    ScopeHovered.Provider,
    { value: h },
    Vc(
      Box,
      {
        ...withHexColors(I),
        elementKey: elementKey,
        hoverFollowsPaint: !0,
        onMouseEnter: () => {
          (g(!0), x.onMouseEnter());
        },
        onMouseLeave: () => {
          (g(!1), x.onMouseLeave());
        },
      },
      ...children,
    ),
  );
}
//@ chunk-bc20zedk.js:9047-9051 placement
j();
//@ chunk-bc20zedk.js:9051-9211 placement
function HoverStyled({ isInline: isInline, props: props, hover: hover, group: group, children: children }) {
  let u = isInline ? "Text" : "Box",
    { overrides: overrides, handlers: handlers } = useHoverLit(group, hover, u);
  return Vc(isInline ? Text : Box, { ...withHexColors(props), ...overrides, ...handlers }, ...children);
}
//@ chunk-bc20zedk.js:9211-9221 placement
var FIELD_MIN_COLUMNS = 12;
//@ chunk-bc20zedk.js:9221-9225 placement
j();
//@ chunk-bc20zedk.js:9225-9229 placement
j();
//@ chunk-bc20zedk.js:9229-9246 placement
var InputFields = qt(null);
//@ chunk-bc20zedk.js:9246-9250 placement
j();
//@ chunk-bc20zedk.js:9250-9267 placement
var SiteColumns = qt(null);
//@ chunk-bc20zedk.js:9267-9271 placement
j();
//@ chunk-bc20zedk.js:9271-9288 placement
var SiteRows = qt(null);
//@ chunk-bc20zedk.js:9288-9292 placement
j();
//@ chunk-bc20zedk.js:9292-9411 placement
var focusClick = (o) => (p) => {
  let a = p.isWindowActivation || p.droppedAsStray;
  if (p.hyperlinkUrl !== void 0) p.allowDefault();
  if (!a) o();
};
//@ chunk-bc20zedk.js:9411-9415 placement
j();
//@ chunk-bc20zedk.js:9415-9432 placement
var FocusedNode = qt(null);
//@ chunk-bc20zedk.js:9432-9436 placement
j();
//@ chunk-bc20zedk.js:9436-9453 placement
var FocusedPress = qt(null);
//@ chunk-bc20zedk.js:9453-9661 placement
function useSiteFocus(o) {
  let { plugin: plugin, handle: handle } = o,
    m = Se(FocusedPress),
    f = Se(FocusedNode),
    u = Se(ClickedPress),
    c = m !== null && m.plugin === plugin && m.handle === handle;
  return {
    hasKeyboardFocus: c,
    ref: c ? (f ?? void 0) : void 0,
    onClick: u ? focusClick(() => u({ plugin: plugin, handle: handle })) : void 0,
  };
}
//@ chunk-bc20zedk.js:9661-11053 placement
function InputField(o) {
  let { plugin: plugin, handle: handle, element: element, placeholder: placeholder } = o,
    u = useSiteFocus({ plugin: plugin, handle: handle }),
    c = Se(InputFields),
    g = useTerminalSize(),
    x = Se(SiteColumns) ?? g.columns,
    h = c?.textOf(plugin, element) ?? o.value ?? "",
    [C, I] = y(h.length),
    min = Math.min(o.rows ?? 1, Se(SiteRows) ?? g.rows),
    T = min > 1,
    L = o.label === void 0 ? "" : `${o.label}: `,
    A = c !== null && u.hasKeyboardFocus,
    _ = ` \u23CE ${o.submitLabel ?? "submit"}`,
    E = T && A ? `${_} \xB7 ${supportsShiftEnter() ? "shift+\u23CE" : "\\\u23CE"} new line` : _,
    U = x - bunStringWidth(L),
    B = U - bunStringWidth(E) >= x / 2 ? E : _,
    min_2 = Math.min(C, h.length);
  return (
    P(() => {
      if (A) I(Number.MAX_SAFE_INTEGER);
    }, [A]),
    usePreDispatchKeyHandler(
      (M, D) => {
        let G = h[min_2 - 1] === "\\",
          q = D.return && !D.shift && !D.meta && !D.ctrl && (G || Vnn());
        if (q) {
          let sliced = h.slice(0, G ? min_2 - 1 : min_2);
          (c?.edit(
            { plugin: plugin, handle: handle, element: element },
            `${sliced}
${h.slice(min_2)}`,
          ),
            I(sliced.length + 1));
        }
        return q;
      },
      { isActive: A && T },
    ),
    r(Box, {
      ref: u.ref,
      flexDirection: "row",
      flexShrink: 0,
      height: T ? min : void 0,
      overflow: T ? "hidden" : void 0,
      elementKey: element,
      elementPlugin: plugin,
      onClick: u.onClick,
      children: [
        L !== "" && e(Text, { bold: A, children: L }),
        A
          ? e(TextInput, {
              value: h,
              onChange: (M) => c.edit({ plugin: plugin, handle: handle, element: element }, M),
              placeholder: placeholder,
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
                : void 0,
              maxVisibleLines: T ? min : void 0,
              focus: !0,
              showCursor: !0,
              multiline: T,
              disableBackslashReturn: !0,
              disableEscapeDoublePress: !0,
            })
          : e(Text, {
              dimColor: h === "",
              wrap: T ? "wrap" : "truncate-end",
              children: h === "" ? (placeholder ?? "") : h,
            }),
        A && e(Text, { dimColor: !0, children: B }),
      ],
    })
  );
}
//@ chunk-bc20zedk.js:11053-11057 placement
j();
//@ chunk-bc20zedk.js:11057-11116 placement = isConnectionError (1)
var collectCodeSegments = (err) =>
  err.flatMap((p) => (p.type === "code" ? [p] : collectCodeSegments(checkAgentDescriptions(p))));
//@ chunk-bc20zedk.js:11116-11213 placement
var Dr = "Syntax highlighting stops here. This message has more code than is highlighted at once.";
/**
 * 带高亮预算的代码高亮器（超预算原样输出）。
 */
//@ chunk-bc20zedk.js:11213-11583 placement
function createBudgetedHighlighter(o) {
  if (o === null) return null;
  let p = { left: tFi },
    weakMap = new WeakMap(),
    m = !1;
  return {
    supportsLanguage: o.supportsLanguage,
    highlight(f, u) {
      let c = u?.fence && weakMap.get(u.fence),
        g = canonicalLanguageName(u?.language ?? "") === "plaintext";
      if (c !== void 0 || g) return c ?? f;
      let x = p.left <= 0,
        h = x ? f : o.highlight(f, { ...u, work: p }),
        I =
          x && !m && sequential.level > 0
            ? `${sequential.dim(Dr)}
${f}`
            : h;
      if (((m ||= x), u?.fence)) weakMap.set(u.fence, I);
      return I;
    },
  };
}
//@ chunk-bc20zedk.js:11583-11689 placement
function prehighlightCodeSegments(o, p, a) {
  let m = createBudgetedHighlighter(o);
  if (m !== null)
    collectCodeSegments(p).forEach((f) => formatTokenWindowed(f, a, { highlight: m, windowed: !1 }));
  return m;
}
//@ chunk-bc20zedk.js:11689-11693 placement
j();
//@ chunk-bc20zedk.js:11693-11697 placement
j();
//@ chunk-bc20zedk.js:11697-11728 placement
function _s(q) {
  return q.trim();
}
//@ chunk-bc20zedk.js:11728-11754 placement
var Ke = 4,
  Fe = 3,
  Ts = 4,
  Wr = 200;
//@ chunk-bc20zedk.js:11754-11835 placement
function at(o) {
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
  Wr,
  at,
  Fe,
  Ke,
  Ts,
  _s,
  prehighlightCodeSegments,
};
