/**
 * components/CustomSelect/selectA11y.tsx
 *
 * 选择框无障碍与键盘导航（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nz9pbsr3.js (22)
 * attribution: placement 22
 */
import { j, qt, R, y, Fy, Se, dh } from "../../../vendor/react/cjs/react.production.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useMeasured, Input } from "../../ink/components/Input.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useStrayClickGuard } from "./strayClickGuard.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { cellText } from "./selectTable.js";
import { YHt } from "../design-system/Table.js";
import { c9, merged as merged_2, pM, knn } from "./select.js";
import { useLatestState } from "./option-map.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { wrapText } from "../../ink/wrap-text.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ListItem } from "../design-system/ListItem.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useHoverHighlight, USER_MESSAGE_BACKGROUND } from "./selectTypeahead.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { Cursor } from "../../utils/Cursor.js";
import { isNativeCursorEnabled } from "../../ink/nativeCursor.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { inverseText } from "../../ink/screen.js";

//@ chunk-nz9pbsr3.js:904-908 placement
j();
//@ chunk-nz9pbsr3.js:908-988 placement
var Ze = 32,
  oe = 2,
  ee = 2,
  Re = 2,
  WRAP_TRIM = "wrap-trim",
  Te = !0,
  Pe = qt(void 0),
  we = qt(!1),
  pe = qt(!1);
//@ chunk-nz9pbsr3.js:988-3816 placement
function useSelectNavigation({ children: children, ...t }) {
  let d = useScrollViewportSize(useTerminalSize()),
    a = R(null),
    [u] = y(() => new Set()),
    l = useMeasured(() => {
      let [i] = u;
      return (i && measureElement(i).width) || (a.current && measureElement(a.current).width) || d.columns;
    }),
    x = useStrayClickGuard(),
    [k] = y(() => new WeakMap()),
    toArray = Fy.toArray(children),
    filtered = toArray.filter(Ge),
    min = Math.min(
      Math.max(0, ...filtered.map((i) => bunStringWidth(cellText(i.props.label)))),
      Math.max(
        Ze,
        l - ee - oe - Math.max(YHt, ...filtered.map((i) => measureA11yValueWidth(i.props.children))),
      ),
    ),
    m = l - ee - min - oe < YHt,
    filtered_2 = filtered.filter((i) => !P(i.props.children, A11yTextValue)),
    v = c9(t.isDisabled),
    S = m ? l - ee - Re : l - ee - min - oe,
    [L, h, T] = useLatestState(void 0),
    [F, A] = y(void 0),
    I = R(null),
    { focusManager: focusManager } = Se(kp),
    W = useSearchInput({
      isActive: !0,
      columns: S,
      backspaceExitsOnEmpty: !1,
      onExit: () => N(!0, !0),
      onCancel: () => N(!1),
      onExitUp: () => N(!0, !0),
      onExitDown: () => N(!0, !0),
    });
  function N(i, M = !1) {
    let c = T();
    if (c === void 0) return !0;
    let D = filtered.find((O) => O.key === c.key)?.props.children,
      g = W.queryRef.current,
      C = i && g !== c.from && P(D, useSelectA11yInput) ? (D.props.validate?.(g) ?? null) : null;
    if (C !== null && M) return (A({ draft: g, reason: C }), !1);
    if ((h(void 0), A(void 0), I.current && focusManager?.activeElement === I.current)) focusManager.blur();
    if (!i || C !== null || !P(D, useSelectA11yInput) || D.props.disabled) return !0;
    if (g !== c.from) (Ee(k, D.props, g), D.props.onChange(g));
    return !0;
  }
  function q(i) {
    let M = i?.props.children;
    if (!P(M, useSelectA11yInput) || M.props.disabled || typeof i?.key !== "string")
      return getA11yValueActions(M, k);
    let c = { key: i.key, from: Mn(M.props, k) };
    return {
      accept: () => {
        (N(!0), W.setQuery(c.from), h(c));
      },
    };
  }
  let mapped = toArray.map((i, M) => {
    if (!Ge(i))
      return dh(i) && i.type === merged_2.Heading
        ? i
        : e(merged_2.Heading, { children: i }, dh(i) ? i.key : M);
    let { children: children } = i.props,
      D = cellText(i.props.label),
      g = L?.key === i.key && F?.draft === W.query ? F.reason : void 0,
      C = g ?? cellText(i.props.description),
      O = C
        ? countCharInString(
            wrapText(C, Math.max(1, l - ee), WRAP_TRIM),
            `
`,
          ) + 1
        : 0,
      V = !(!v || t.onDisabledRowClick !== void 0) || L?.key === i.key ? void 0 : q(i).accept,
      Q =
        P(children, A11yBooleanValue) || P(children, A11yCycleValue) || P(children, A11yButtonValue)
          ? measureA11yValueWidth(children)
          : 0,
      U = e(A11ySelectRow, {
        label: D,
        description: C,
        ink: i.props.ink,
        refused: g !== void 0,
        onClick:
          V &&
          ((Y) => {
            if (x(Y) || (c9(t.isDisabled) && t.onDisabledRowClick === void 0)) return;
            V();
          }),
        labelColumn: min,
        stacked: m,
        targetWidth: Math.max(0, Math.min(Q, S)),
        rowLines: P(children, A11yTextValue) ? void 0 : u,
        children: e(Pe, {
          value:
            L?.key === i.key && !v && P(children, useSelectA11yInput) && !children.props.disabled
              ? { editor: W, room: S, input: I, end: N }
              : void 0,
          children: children,
        }),
      });
    return P(children, A11yTextValue)
      ? e(merged_2.Heading, { children: U }, i.key)
      : e(merged_2.Item, { declareCursor: L?.key !== i.key, lines: (m ? 2 : 1) + O, children: U }, i.key);
  });
  if (filtered_2.length === 0)
    return r(Box, {
      ref: a,
      flexDirection: "column",
      children: [
        mapped.length === 0 && t.emptyMessage && e(Text, { dimColor: !0, children: t.emptyMessage }),
        mapped.map((i, M) => e(ListItem, { isFocused: !1, styled: !1, children: i }, dh(i) ? i.key : M)),
      ],
    });
  let _ = e(merged_2, {
    ...t,
    rowClick: "move",
    onFocus: (i) => {
      if (filtered_2[i]?.key !== T()?.key) N(!0);
      t.onFocus?.(i);
    },
    onSelect: (i) => {
      if (T() !== void 0) {
        N(!0, !0);
        return;
      }
      q(filtered_2[i]).accept?.();
    },
    onRowKeyDown: (i, M) => {
      if (T() !== void 0) {
        W.handleKeyDown(i);
        return;
      }
      if (i.ctrl || i.meta) return;
      let c = q(filtered_2[M]),
        D = i.key === " " ? c.accept : i.key === "left" ? c.previous : i.key === "right" ? c.next : void 0;
      if (D === void 0) return;
      (i.preventDefault(), D());
    },
    children: mapped,
  });
  return e(Box, { ref: a, flexDirection: "column", children: e(we, { value: v, children: _ }) });
}
/**
 * 无障碍选择列表的一行：屏幕阅读器模式下输出"标签, 值 + 描述"纯文本；否则两栏或堆叠布局，支持悬停高亮、点击、锁定/被拒样式与描述换行。
 */
//@ chunk-nz9pbsr3.js:3816-6058 placement
function A11ySelectRow(o) {
  let h = w(54),
    {
      label: label,
      description: description,
      ink: ink,
      refused: refused,
      onClick: onClick,
      labelColumn: labelColumn,
      stacked: stacked,
      targetWidth: targetWidth,
      rowLines: rowLines,
      children: children,
    } = o,
    m = pM(),
    E = useIsScreenReaderEnabled(),
    [v, S] = useHoverHighlight(onClick !== void 0),
    L = Se(knn);
  if (E) {
    let T;
    if (h[0] !== label) ((T = r(Text, { children: [label, ","] })), (h[0] = label), (h[1] = T));
    else T = h[1];
    let F;
    if (h[2] !== children || h[3] !== T)
      ((F = r(Box, { children: [T, children] })), (h[2] = children), (h[3] = T), (h[4] = F));
    else F = h[4];
    let A;
    if (h[5] !== description)
      ((A = description && e(Text, { children: description })), (h[5] = description), (h[6] = A));
    else A = h[6];
    let I;
    if (h[7] !== F || h[8] !== A)
      ((I = r(Box, { flexDirection: "column", children: [F, A] })), (h[7] = F), (h[8] = A), (h[9] = I));
    else I = h[9];
    return I;
  }
  let T;
  if (h[10] !== rowLines)
    ((T = (X) => {
      let W = X?.parentNode;
      if (!rowLines || !W) {
        return;
      }
      return (
        rowLines.add(W),
        () => {
          rowLines.delete(W);
        }
      );
    }),
      (h[10] = rowLines),
      (h[11] = T));
  else T = h[11];
  const F = stacked ? "column" : "row",
    A = stacked ? void 0 : labelColumn,
    I = stacked ? 0 : oe,
    N = ink === "locked",
    q = m && ink !== "locked" ? "suggestion" : void 0;
  let B;
  if (h[12] !== label || h[13] !== N || h[14] !== q)
    ((B = e(Text, { dimColor: N, color: q, wrap: "truncate-end", children: label })),
      (h[12] = label),
      (h[13] = N),
      (h[14] = q),
      (h[15] = B));
  else B = h[15];
  let _;
  if (h[16] !== A || h[17] !== I || h[18] !== B)
    ((_ = e(Box, { width: A, marginRight: I, flexShrink: 0, children: B })),
      (h[16] = A),
      (h[17] = I),
      (h[18] = B),
      (h[19] = _));
  else _ = h[19];
  const i = stacked ? Re : 0,
    M = v ? USER_MESSAGE_BACKGROUND : void 0;
  let c;
  if (h[20] !== L || h[21] !== onClick)
    ((c =
      onClick &&
      ((D) => {
        if (!L(D)) onClick(D);
      })),
      (h[20] = L),
      (h[21] = onClick),
      (h[22] = c));
  else c = h[22];
  let g;
  if (h[23] !== onClick || h[24] !== S)
    ((g = onClick && (() => S(!0))), (h[23] = onClick), (h[24] = S), (h[25] = g));
  else g = h[25];
  let C;
  if (h[26] !== onClick || h[27] !== S)
    ((C = onClick && (() => S(!1))), (h[26] = onClick), (h[27] = S), (h[28] = C));
  else C = h[28];
  const O = ink !== void 0;
  let K;
  if (h[29] !== children || h[30] !== O)
    ((K = e(pe, { value: O, children: children })), (h[29] = children), (h[30] = O), (h[31] = K));
  else K = h[31];
  let V;
  if (h[32] !== M || h[33] !== c || h[34] !== g || h[35] !== C || h[36] !== K || h[37] !== targetWidth)
    ((V = e(Box, {
      minWidth: targetWidth,
      backgroundColor: M,
      onClick: c,
      onMouseEnter: g,
      onMouseLeave: C,
      children: K,
    })),
      (h[32] = M),
      (h[33] = c),
      (h[34] = g),
      (h[35] = C),
      (h[36] = K),
      (h[37] = targetWidth),
      (h[38] = V));
  else V = h[38];
  let Q;
  if (h[39] !== V || h[40] !== i)
    ((Q = e(Box, { paddingLeft: i, children: V })), (h[39] = V), (h[40] = i), (h[41] = Q));
  else Q = h[41];
  let U;
  if (h[42] !== Q || h[43] !== F || h[44] !== _)
    ((U = r(Box, { flexDirection: F, children: [_, Q] })),
      (h[42] = Q),
      (h[43] = F),
      (h[44] = _),
      (h[45] = U));
  else U = h[45];
  let Y;
  if (h[46] !== description || h[47] !== refused || h[48] !== rowLines)
    ((Y =
      description &&
      e(Text, {
        dimColor: !refused,
        color: refused ? "error" : void 0,
        wrap: rowLines === void 0 ? "truncate-end" : WRAP_TRIM,
        children: description,
      })),
      (h[46] = description),
      (h[47] = refused),
      (h[48] = rowLines),
      (h[49] = Y));
  else Y = h[49];
  let Je;
  if (h[50] !== T || h[51] !== U || h[52] !== Y)
    ((Je = r(Box, { ref: T, flexDirection: "column", children: [U, Y] })),
      (h[50] = T),
      (h[51] = U),
      (h[52] = Y),
      (h[53] = Je));
  else Je = h[53];
  return Je;
}
/**
 * 选择行的值文本：屏幕阅读器下读 spoken（禁用加 ", unavailable"），否则显示 before/children/after，禁用或锁定时变暗。
 */
//@ chunk-nz9pbsr3.js:6058-6769 placement
function A11yValueText(o) {
  let m = w(15),
    { spoken: spoken, disabled: disabled, before: before, after: after, children: children } = o,
    x = disabled === void 0 ? !1 : disabled,
    k = pM(),
    p = Se(pe);
  if (useIsScreenReaderEnabled()) {
    const b = x && ", unavailable";
    let E;
    if (m[0] !== spoken || m[1] !== b)
      ((E = r(Text, { children: [spoken, b] })), (m[0] = spoken), (m[1] = b), (m[2] = E));
    else E = m[2];
    return E;
  }
  const b = x || p;
  let E;
  if (m[3] !== before)
    ((E = before && e(Text, { dimColor: !0, children: before })), (m[3] = before), (m[4] = E));
  else E = m[4];
  const v = k && !x && !p ? "suggestion" : void 0;
  let S;
  if (m[5] !== children || m[6] !== v)
    ((S = e(Text, { color: v, children: children })), (m[5] = children), (m[6] = v), (m[7] = S));
  else S = m[7];
  let L;
  if (m[8] !== after) ((L = after && e(Text, { dimColor: !0, children: after })), (m[8] = after), (m[9] = L));
  else L = m[9];
  let h;
  if (m[10] !== b || m[11] !== E || m[12] !== S || m[13] !== L)
    ((h = r(Text, { dimColor: b, wrap: "truncate-end", children: [E, S, L] })),
      (m[10] = b),
      (m[11] = E),
      (m[12] = S),
      (m[13] = L),
      (m[14] = h));
  else h = m[14];
  return h;
}
//@ chunk-nz9pbsr3.js:6769-6879 placement
function A11ySection(o) {
  let d = w(2),
    { children: children } = o,
    a;
  if (d[0] !== children) ((a = e(Fragment, { children: children })), (d[0] = children), (d[1] = a));
  else a = d[1];
  return a;
}
//@ chunk-nz9pbsr3.js:6879-7085 placement
function A11yBooleanValue(o) {
  let l = w(4),
    { value: t, disabled: disabled } = o;
  const a = String(t),
    u = String(t);
  let x;
  if (l[0] !== disabled || l[1] !== a || l[2] !== u)
    ((x = e(A11yValueText, { spoken: a, disabled: disabled, children: u })),
      (l[0] = disabled),
      (l[1] = a),
      (l[2] = u),
      (l[3] = x));
  else x = l[3];
  return x;
}
/**
 * 循环选择型值：显示当前选项标签，可用时两侧加 ‹ ›。
 */
//@ chunk-nz9pbsr3.js:7085-7490 placement
function A11yCycleValue(o) {
  let x = w(8),
    { value: t, options: options, disabled: disabled } = o,
    u = Se(we),
    l = pM(),
    k;
  if (x[0] !== options || x[1] !== t)
    ((k = options.find((p) => p.value === t)?.label ?? t), (x[0] = options), (x[1] = t), (x[2] = k));
  else k = x[2];
  let f = k,
    b = !disabled && !u && (l || !Te);
  const m = b ? "\u2039 " : void 0,
    E = b ? " \u203A" : void 0;
  let v;
  if (x[3] !== disabled || x[4] !== f || x[5] !== m || x[6] !== E)
    ((v = e(A11yValueText, { spoken: f, disabled: disabled, before: m, after: E, children: f })),
      (x[3] = disabled),
      (x[4] = f),
      (x[5] = m),
      (x[6] = E),
      (x[7] = v));
  else v = x[7];
  return v;
}
//@ chunk-nz9pbsr3.js:7490-7749 placement
function A11yOpenerValue(o) {
  let l = w(5),
    { children: children, disabled: disabled } = o;
  const a = children ? `${children}, opens` : "opens",
    u = children ? " \u203A" : "\u203A";
  let x;
  if (l[0] !== children || l[1] !== disabled || l[2] !== a || l[3] !== u)
    ((x = e(A11yValueText, { spoken: a, disabled: disabled, after: u, children: children })),
      (l[0] = children),
      (l[1] = disabled),
      (l[2] = a),
      (l[3] = u),
      (l[4] = x));
  else x = l[4];
  return x;
}
//@ chunk-nz9pbsr3.js:7749-7962 placement
function A11yButtonValue(o) {
  let u = w(4),
    { children: children, disabled: disabled } = o;
  const a = children ? `${children}, button` : "button";
  let l;
  if (u[0] !== children || u[1] !== disabled || u[2] !== a)
    ((l = e(A11yValueText, { spoken: a, disabled: disabled, children: children })),
      (u[0] = children),
      (u[1] = disabled),
      (u[2] = a),
      (u[3] = l));
  else l = u[3];
  return l;
}
//@ chunk-nz9pbsr3.js:7962-8245 placement
function A11yTextValue(o) {
  let u = w(6),
    { children: children, disabled: disabled } = o;
  const a = children || "empty";
  let l;
  if (u[0] !== children)
    ((l = children || e(Text, { dimColor: !0, children: "\u2014" })), (u[0] = children), (u[1] = l));
  else l = u[1];
  let x;
  if (u[2] !== disabled || u[3] !== a || u[4] !== l)
    ((x = e(A11yValueText, { spoken: a, disabled: disabled, children: l })),
      (u[2] = disabled),
      (u[3] = a),
      (u[4] = l),
      (u[5] = x));
  else x = u[5];
  return x;
}
/**
 * 可编辑选择框的无障碍输入行为（编辑文本、取消）
 */
//@ chunk-nz9pbsr3.js:8245-10910 placement
function useSelectA11yInput(o) {
  let p = w(75),
    { value: t, placeholder: placeholder, disabled: disabled } = o,
    u = Se(Pe),
    l = useIsScreenReaderEnabled(),
    x = useTerminalFocus();
  if (u === void 0) {
    const k = `${t || "empty"}, edit text`;
    let f;
    if (p[0] !== placeholder || p[1] !== t)
      ((f = t || e(Text, { dimColor: !0, children: placeholder })),
        (p[0] = placeholder),
        (p[1] = t),
        (p[2] = f));
    else f = p[2];
    let b;
    if (p[3] !== disabled || p[4] !== k || p[5] !== f)
      ((b = e(A11yValueText, { spoken: k, disabled: disabled, children: f })),
        (p[3] = disabled),
        (p[4] = k),
        (p[5] = f),
        (p[6] = b));
    else b = p[6];
    return b;
  }
  let { editor: editor, input: input, end: end } = u,
    S,
    L,
    h,
    T,
    F,
    k,
    A,
    I,
    f,
    b,
    X,
    W,
    N,
    q,
    B,
    _;
  if (p[7] !== u.room || p[8] !== editor || p[9] !== end || p[10] !== input || p[11] !== l || p[12] !== x) {
    let fromText = Cursor.fromText(editor.query, u.room, editor.cursorOffset);
    let M = x && !l && !isNativeCursorEnabled() ? " " : "";
    let c;
    if (p[29] !== end) ((c = () => (end(!0, !0) ? !1 : void 0)), (p[29] = end), (p[30] = c));
    else c = p[30];
    let D = c;
    F = useDialogKeybindings;
    A = "Select";
    let g;
    if (p[31] !== end)
      ((g = {
        action: "select:cancel",
        run: () => {
          end(!1);
        },
      }),
        (p[31] = end),
        (p[32] = g));
    else g = p[32];
    let C;
    if (p[33] !== editor)
      ((C = { action: "select:first", run: () => editor.setCursorOffset(0) }), (p[33] = editor), (p[34] = C));
    else C = p[34];
    let O;
    if (p[35] !== editor)
      ((O = { action: "select:last", run: () => editor.setCursorOffset(editor.queryRef.current.length) }),
        (p[35] = editor),
        (p[36] = O));
    else O = p[36];
    let K, V;
    if (p[37] !== D)
      ((K = { action: "select:previous", run: D }),
        (V = { action: "select:next", run: D }),
        (p[37] = D),
        (p[38] = K),
        (p[39] = V));
    else ((K = p[38]), (V = p[39]));
    if (p[40] !== g || p[41] !== C || p[42] !== O || p[43] !== K || p[44] !== V)
      ((I = [g, C, O, K, V]), (p[40] = g), (p[41] = C), (p[42] = O), (p[43] = K), (p[44] = V), (p[45] = I));
    else I = p[45];
    T = Box;
    if (p[46] !== end) ((_ = (Q) => end(Q.relatedTarget !== null)), (p[46] = end), (p[47] = _));
    else _ = p[47];
    h = Input;
    X = input;
    W = !0;
    N = { line: 0, column: fromText.getPosition().column, visible: !0 };
    if (p[48] !== editor)
      ((q = (U) => {
        if ((editor.handleKeyDown(U), U.defaultPrevented)) U.stopImmediatePropagation();
      }),
        (p[48] = editor),
        (p[49] = q));
    else q = p[49];
    B = editor.handlePaste;
    L = Text;
    f = "truncate-end";
    b = !0;
    S = Ansi;
    k = fromText.render(M, "", inverseText, void 0, 1, void 0, void 0, l);
    ((p[7] = u.room),
      (p[8] = editor),
      (p[9] = end),
      (p[10] = input),
      (p[11] = l),
      (p[12] = x),
      (p[13] = S),
      (p[14] = L),
      (p[15] = h),
      (p[16] = T),
      (p[17] = F),
      (p[18] = k),
      (p[19] = A),
      (p[20] = I),
      (p[21] = f),
      (p[22] = b),
      (p[23] = X),
      (p[24] = W),
      (p[25] = N),
      (p[26] = q),
      (p[27] = B),
      (p[28] = _));
  } else
    ((S = p[13]),
      (L = p[14]),
      (h = p[15]),
      (T = p[16]),
      (F = p[17]),
      (k = p[18]),
      (A = p[19]),
      (I = p[20]),
      (f = p[21]),
      (b = p[22]),
      (X = p[23]),
      (W = p[24]),
      (N = p[25]),
      (q = p[26]),
      (B = p[27]),
      (_ = p[28]));
  let c;
  if (p[50] !== S || p[51] !== k) ((c = e(S, { children: k })), (p[50] = S), (p[51] = k), (p[52] = c));
  else c = p[52];
  let g;
  if (p[53] !== L || p[54] !== c || p[55] !== f || p[56] !== b)
    ((g = e(L, { wrap: f, "aria-preserve-whitespace": b, children: c })),
      (p[53] = L),
      (p[54] = c),
      (p[55] = f),
      (p[56] = b),
      (p[57] = g));
  else g = p[57];
  let C;
  if (p[58] !== h || p[59] !== g || p[60] !== X || p[61] !== W || p[62] !== N || p[63] !== q || p[64] !== B)
    ((C = e(h, { ref: X, autoFocus: W, caret: N, onKeyDown: q, onPaste: B, children: g })),
      (p[58] = h),
      (p[59] = g),
      (p[60] = X),
      (p[61] = W),
      (p[62] = N),
      (p[63] = q),
      (p[64] = B),
      (p[65] = C));
  else C = p[65];
  let O;
  if (p[66] !== T || p[67] !== C || p[68] !== _)
    ((O = e(T, { onBlur: _, children: C })), (p[66] = T), (p[67] = C), (p[68] = _), (p[69] = O));
  else O = p[69];
  let K;
  if (p[70] !== F || p[71] !== A || p[72] !== I || p[73] !== O)
    ((K = e(F, { scope: A, bindings: I, children: O })),
      (p[70] = F),
      (p[71] = A),
      (p[72] = I),
      (p[73] = O),
      (p[74] = K));
  else K = p[74];
  return K;
}
/**
 * 计算各种值组件的显示宽度（布尔、循环选项取最长标签加箭头、打开、按钮、文本、输入框），用于对齐值列。
 */
//@ chunk-nz9pbsr3.js:10910-11310 placement
function measureA11yValueWidth(o) {
  if (P(o, A11yBooleanValue)) return bunStringWidth("false");
  if (P(o, A11yCycleValue))
    return (
      Math.max(0, ...o.props.options.map((option) => te(option.label))) +
      (o.props.disabled ? 0 : bunStringWidth("\u2039  \u203A"))
    );
  if (P(o, A11yOpenerValue)) {
    let { children: children } = o.props;
    return children ? te(children) + bunStringWidth(" \u203A") : bunStringWidth("\u203A");
  }
  if (P(o, A11yButtonValue)) return te(o.props.children ?? "");
  if (P(o, A11yTextValue)) return te(o.props.children || "\u2014");
  if (P(o, useSelectA11yInput)) return te(o.props.value || (o.props.placeholder ?? "")) + 1;
  return 0;
}
//@ chunk-nz9pbsr3.js:11310-11365 placement
function OPs(o) {
  let t = cellText(o);
  return 2 + (t ? countCharInString(t, " ") + 1 : 0);
}
//@ chunk-nz9pbsr3.js:11365-11431 placement
function te(o) {
  return Math.max(
    0,
    ...o
      .split(
        `
`,
      )
      .map((t) => bunStringWidth(t)),
  );
}
/**
 * 为值组件给出键盘动作：布尔切换、循环选项前后切换并 onChange、打开器 onOpen、按钮 onPress。
 */
//@ chunk-nz9pbsr3.js:11431-11986 placement
function getA11yValueActions(o, t) {
  if (P(o, A11yBooleanValue) && !o.props.disabled) {
    let d = Dn.bind(void 0, o.props, t);
    return { accept: d, previous: d, next: d };
  }
  if (P(o, A11yCycleValue) && !o.props.disabled) {
    let { props: props } = o,
      a = (u) => () => {
        let l = props.options.length,
          index = props.options.findIndex((option) => option.value === (t.get(props) ?? props.value)),
          max = Math.max(index, u === 1 ? -1 : 0),
          p = props.options[(max + u + l) % l];
        if (p === void 0) return;
        (Ee(t, props, p.value), props.onChange(p.value));
      };
    return { accept: a(1), next: a(1), previous: a(-1) };
  }
  if (P(o, A11yOpenerValue) && !o.props.disabled) return { accept: o.props.onOpen, next: o.props.onOpen };
  if (P(o, A11yButtonValue) && !o.props.disabled) return { accept: o.props.onPress };
  return {};
}
//@ chunk-nz9pbsr3.js:11986-12054 placement
function Dn(o, t) {
  let d = !(t.get(o) ?? o.value);
  (Ee(t, o, d), o.onChange(d));
}
//@ chunk-nz9pbsr3.js:12054-12116 placement
function Ee(o, t, d) {
  (o.set(t, d), queueMicrotask(() => o.delete(t)));
}
//@ chunk-nz9pbsr3.js:12116-12185 placement
function Mn(o, t) {
  let d = t.get(o);
  return typeof d === "string" ? d : o.value;
}
//@ chunk-nz9pbsr3.js:12185-12226 placement
function Ge(o) {
  return dh(o) && o.type === A11ySection;
}
//@ chunk-nz9pbsr3.js:12226-12267 placement
function P(o, t) {
  return dh(o) && o.type === t;
}
//@ chunk-nz9pbsr3.js:12267-12356 placement
var merged = Object.assign(useSelectNavigation, {
  Field: A11ySection,
  Toggle: A11yBooleanValue,
  Select: A11yCycleValue,
  Text: useSelectA11yInput,
  Link: A11yOpenerValue,
  Button: A11yButtonValue,
  Value: A11yTextValue,
});

export { OPs, merged };
