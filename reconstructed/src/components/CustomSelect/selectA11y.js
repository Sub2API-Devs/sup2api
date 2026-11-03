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
import {
  init_react_production,
  qt,
  R,
  y,
  Fy,
  Se,
  isValidElement_default,
} from "../../../vendor/react/cjs/react.production.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useMeasured, Input } from "../../ink/components/Input.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useStrayClickGuard } from "./strayClickGuard.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { cellText } from "./selectTable.js";
import { TABLE_FILL_MIN_WIDTH } from "../design-system/Table.js";
import { isDisabledValue, merged as merged_2, isMenuOpen, NO_FOCUS_CONTEXT } from "./select.js";
import { useLatestState } from "./option-map.js";
import { kp } from "../../../vendor/convert-to-spaces/dist/index.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
init_react_production();
//@ chunk-nz9pbsr3.js:908-988 placement
var A11Y_SPACE_WIDTH = 32;
var A11Y_LABEL_GAP = 2;
var A11Y_ROW_PADDING = 2;
var A11Y_STACKED_PADDING = 2;
var WRAP_TRIM = "wrap-trim";
var A11Y_AUTO_FOCUS_INPUT = true;
var A11Y_INPUT_CONTEXT = qt(undefined);
var A11Y_CYCLE_CONTEXT = qt(false);
var A11Y_BOOLEAN_CONTEXT = qt(false);
//@ chunk-nz9pbsr3.js:988-3816 placement
function useSelectNavigation({ children, ...t }) {
  let scrollViewportSize = useScrollViewportSize(useTerminalSize());
  let a = R(null);
  let [u] = y(() => new Set());
  let l = useMeasured(() => {
    let [i] = u;
    return (
      (i && measureElement(i).width) ||
      (a.current && measureElement(a.current).width) ||
      scrollViewportSize.columns
    );
  });
  let strayClickGuard = useStrayClickGuard();
  let [k] = y(() => new WeakMap());
  let p = Fy.toArray(children);
  let filtered = p.filter(isA11ySection);
  let min = Math.min(
    Math.max(0, ...filtered.map((i) => bunStringWidth(cellText(i.props.label)))),
    Math.max(
      A11Y_SPACE_WIDTH,
      l -
        A11Y_ROW_PADDING -
        A11Y_LABEL_GAP -
        Math.max(TABLE_FILL_MIN_WIDTH, ...filtered.map((i) => measureA11yValueWidth(i.props.children))),
    ),
  );
  let m = l - A11Y_ROW_PADDING - min - A11Y_LABEL_GAP < TABLE_FILL_MIN_WIDTH;
  let filtered_2 = filtered.filter((i) => !isChildOfType(i.props.children, A11yTextValue));
  let v = isDisabledValue(t.isDisabled);
  let S = m ? l - A11Y_ROW_PADDING - A11Y_STACKED_PADDING : l - A11Y_ROW_PADDING - min - A11Y_LABEL_GAP;
  let [L, h, T] = useLatestState(undefined);
  let [F, A] = y(undefined);
  let I = R(null);
  let { focusManager } = Se(kp);
  let searchInput = useSearchInput({
    isActive: true,
    columns: S,
    backspaceExitsOnEmpty: false,
    onExit: () => N(true, true),
    onCancel: () => N(false),
    onExitUp: () => N(true, true),
    onExitDown: () => N(true, true),
  });
  function N(i, M = false) {
    let c = T();
    if (c === undefined) return true;
    let children = filtered.find((O) => O.key === c.key)?.props.children;
    let g = searchInput.queryRef.current;
    let C =
      i && g !== c.from && isChildOfType(children, useSelectA11yInput)
        ? (children.props.validate?.(g) ?? null)
        : null;
    if (C !== null && M) {
      A({
        draft: g,
        reason: C,
      });
      return false;
    }
    h(undefined);
    A(undefined);
    if (I.current && focusManager?.activeElement === I.current) focusManager.blur();
    if (!i || C !== null || !isChildOfType(children, useSelectA11yInput) || children.props.disabled)
      return true;
    if (g !== c.from) {
      setPendingValue(k, children.props, g);
      children.props.onChange(g);
    }
    return true;
  }
  function q(i) {
    let children = i?.props.children;
    if (!isChildOfType(children, useSelectA11yInput) || children.props.disabled || typeof i?.key !== "string")
      return getA11yValueActions(children, k);
    let c = {
      key: i.key,
      from: pendingValueOrValue(children.props, k),
    };
    return {
      accept: () => {
        N(true);
        searchInput.setQuery(c.from);
        h(c);
      },
    };
  }
  let mapped = p.map((i, M) => {
    if (!isA11ySection(i))
      return isValidElement_default(i) && i.type === merged_2.Heading
        ? i
        : jsxProd_default(
            merged_2.Heading,
            {
              children: i,
            },
            isValidElement_default(i) ? i.key : M,
          );
    let { children } = i.props;
    let label = cellText(i.props.label);
    let reason = L?.key === i.key && F?.draft === searchInput.query ? F.reason : undefined;
    let C = reason ?? cellText(i.props.description);
    let O = C
      ? countCharInString(
          wrapText(C, Math.max(1, l - A11Y_ROW_PADDING), WRAP_TRIM),
          `
`,
        ) + 1
      : 0;
    let accept = !(!v || t.onDisabledRowClick !== undefined) || L?.key === i.key ? undefined : q(i).accept;
    let Q =
      isChildOfType(children, A11yBooleanValue) ||
      isChildOfType(children, A11yCycleValue) ||
      isChildOfType(children, A11yButtonValue)
        ? measureA11yValueWidth(children)
        : 0;
    let children_2 = jsxProd_default(A11ySelectRow, {
      label,
      description: C,
      ink: i.props.ink,
      refused: reason !== undefined,
      onClick:
        accept &&
        ((Y) => {
          if (strayClickGuard(Y) || (isDisabledValue(t.isDisabled) && t.onDisabledRowClick === undefined))
            return;
          accept();
        }),
      labelColumn: min,
      stacked: m,
      targetWidth: Math.max(0, Math.min(Q, S)),
      rowLines: isChildOfType(children, A11yTextValue) ? undefined : u,
      children: jsxProd_default(A11Y_INPUT_CONTEXT, {
        value:
          L?.key === i.key && !v && isChildOfType(children, useSelectA11yInput) && !children.props.disabled
            ? {
                editor: searchInput,
                room: S,
                input: I,
                end: N,
              }
            : undefined,
        children,
      }),
    });
    return isChildOfType(children, A11yTextValue)
      ? jsxProd_default(
          merged_2.Heading,
          {
            children: children_2,
          },
          i.key,
        )
      : jsxProd_default(
          merged_2.Item,
          {
            declareCursor: L?.key !== i.key,
            lines: (m ? 2 : 1) + O,
            children: children_2,
          },
          i.key,
        );
  });
  if (filtered_2.length === 0)
    return jsxProd_default_2(Box, {
      ref: a,
      flexDirection: "column",
      children: [
        mapped.length === 0 &&
          t.emptyMessage &&
          jsxProd_default(Text, {
            dimColor: true,
            children: t.emptyMessage,
          }),
        mapped.map((i, M) =>
          jsxProd_default(
            ListItem,
            {
              isFocused: false,
              styled: false,
              children: i,
            },
            isValidElement_default(i) ? i.key : M,
          ),
        ),
      ],
    });
  let children_2 = jsxProd_default(merged_2, {
    ...t,
    rowClick: "move",
    onFocus: (i) => {
      if (filtered_2[i]?.key !== T()?.key) N(true);
      t.onFocus?.(i);
    },
    onSelect: (i) => {
      if (T() !== undefined) {
        N(true, true);
        return;
      }
      q(filtered_2[i]).accept?.();
    },
    onRowKeyDown: (event, M) => {
      if (T() !== undefined) {
        searchInput.handleKeyDown(event);
        return;
      }
      if (event.ctrl || event.meta) return;
      let c = q(filtered_2[M]);
      let D =
        event.key === " "
          ? c.accept
          : event.key === "left"
            ? c.previous
            : event.key === "right"
              ? c.next
              : undefined;
      if (D === undefined) return;
      event.preventDefault();
      D();
    },
    children: mapped,
  });
  return jsxProd_default(Box, {
    ref: a,
    flexDirection: "column",
    children: jsxProd_default(A11Y_CYCLE_CONTEXT, {
      value: v,
      children: children_2,
    }),
  });
}
//@ chunk-nz9pbsr3.js:3816-6058 placement
/**
 * 无障碍选择列表的一行：屏幕阅读器模式下输出"标签, 值 + 描述"纯文本；否则两栏或堆叠布局，支持悬停高亮、点击、锁定/被拒样式与描述换行。
 */
function A11ySelectRow(props) {
  let h = w(54);
  let { label, description, ink, refused, onClick, labelColumn, stacked, targetWidth, rowLines, children } =
    props;
  let m = isMenuOpen();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [v, S] = useHoverHighlight(onClick !== undefined);
  let L = Se(NO_FOCUS_CONTEXT);
  if (isScreenReaderEnabled) {
    let T;
    if (h[0] !== label) {
      T = jsxProd_default_2(Text, {
        children: [label, ","],
      });
      h[0] = label;
      h[1] = T;
    } else T = h[1];
    let F;
    if (h[2] !== children || h[3] !== T) {
      F = jsxProd_default_2(Box, {
        children: [T, children],
      });
      h[2] = children;
      h[3] = T;
      h[4] = F;
    } else F = h[4];
    let A;
    if (h[5] !== description) {
      A =
        description &&
        jsxProd_default(Text, {
          children: description,
        });
      h[5] = description;
      h[6] = A;
    } else A = h[6];
    let I;
    if (h[7] !== F || h[8] !== A) {
      I = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [F, A],
      });
      h[7] = F;
      h[8] = A;
      h[9] = I;
    } else I = h[9];
    return I;
  }
  let ref;
  if (h[10] !== rowLines) {
    ref = (X) => {
      let parentNode = X?.parentNode;
      if (!rowLines || !parentNode) {
        return;
      }
      rowLines.add(parentNode);
      return () => {
        rowLines.delete(parentNode);
      };
    };
    h[10] = rowLines;
    h[11] = ref;
  } else ref = h[11];
  const flexDirection = stacked ? "column" : "row";
  const width = stacked ? undefined : labelColumn;
  const marginRight = stacked ? 0 : A11Y_LABEL_GAP;
  const dimColor = ink === "locked";
  const color = m && ink !== "locked" ? "suggestion" : undefined;
  let children_2;
  if (h[12] !== label || h[13] !== dimColor || h[14] !== color) {
    children_2 = jsxProd_default(Text, {
      dimColor,
      color,
      wrap: "truncate-end",
      children: label,
    });
    h[12] = label;
    h[13] = dimColor;
    h[14] = color;
    h[15] = children_2;
  } else children_2 = h[15];
  let _;
  if (h[16] !== width || h[17] !== marginRight || h[18] !== children_2) {
    _ = jsxProd_default(Box, {
      width,
      marginRight,
      flexShrink: 0,
      children: children_2,
    });
    h[16] = width;
    h[17] = marginRight;
    h[18] = children_2;
    h[19] = _;
  } else _ = h[19];
  const paddingLeft = stacked ? A11Y_STACKED_PADDING : 0;
  const backgroundColor = v ? USER_MESSAGE_BACKGROUND : undefined;
  let onClick_2;
  if (h[20] !== L || h[21] !== onClick) {
    onClick_2 =
      onClick &&
      ((D) => {
        if (!L(D)) onClick(D);
      });
    h[20] = L;
    h[21] = onClick;
    h[22] = onClick_2;
  } else onClick_2 = h[22];
  let onMouseEnter;
  if (h[23] !== onClick || h[24] !== S) {
    onMouseEnter = onClick && (() => S(true));
    h[23] = onClick;
    h[24] = S;
    h[25] = onMouseEnter;
  } else onMouseEnter = h[25];
  let onMouseLeave;
  if (h[26] !== onClick || h[27] !== S) {
    onMouseLeave = onClick && (() => S(false));
    h[26] = onClick;
    h[27] = S;
    h[28] = onMouseLeave;
  } else onMouseLeave = h[28];
  const value = ink !== undefined;
  let children_3;
  if (h[29] !== children || h[30] !== value) {
    children_3 = jsxProd_default(A11Y_BOOLEAN_CONTEXT, {
      value,
      children,
    });
    h[29] = children;
    h[30] = value;
    h[31] = children_3;
  } else children_3 = h[31];
  let children_4;
  if (
    h[32] !== backgroundColor ||
    h[33] !== onClick_2 ||
    h[34] !== onMouseEnter ||
    h[35] !== onMouseLeave ||
    h[36] !== children_3 ||
    h[37] !== targetWidth
  ) {
    children_4 = jsxProd_default(Box, {
      minWidth: targetWidth,
      backgroundColor,
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: children_3,
    });
    h[32] = backgroundColor;
    h[33] = onClick_2;
    h[34] = onMouseEnter;
    h[35] = onMouseLeave;
    h[36] = children_3;
    h[37] = targetWidth;
    h[38] = children_4;
  } else children_4 = h[38];
  let Q;
  if (h[39] !== children_4 || h[40] !== paddingLeft) {
    Q = jsxProd_default(Box, {
      paddingLeft,
      children: children_4,
    });
    h[39] = children_4;
    h[40] = paddingLeft;
    h[41] = Q;
  } else Q = h[41];
  let U;
  if (h[42] !== Q || h[43] !== flexDirection || h[44] !== _) {
    U = jsxProd_default_2(Box, {
      flexDirection,
      children: [_, Q],
    });
    h[42] = Q;
    h[43] = flexDirection;
    h[44] = _;
    h[45] = U;
  } else U = h[45];
  let Y;
  if (h[46] !== description || h[47] !== refused || h[48] !== rowLines) {
    Y =
      description &&
      jsxProd_default(Text, {
        dimColor: !refused,
        color: refused ? "error" : undefined,
        wrap: rowLines === undefined ? "truncate-end" : WRAP_TRIM,
        children: description,
      });
    h[46] = description;
    h[47] = refused;
    h[48] = rowLines;
    h[49] = Y;
  } else Y = h[49];
  let Je;
  if (h[50] !== ref || h[51] !== U || h[52] !== Y) {
    Je = jsxProd_default_2(Box, {
      ref,
      flexDirection: "column",
      children: [U, Y],
    });
    h[50] = ref;
    h[51] = U;
    h[52] = Y;
    h[53] = Je;
  } else Je = h[53];
  return Je;
}
//@ chunk-nz9pbsr3.js:6058-6769 placement
/**
 * 选择行的值文本：屏幕阅读器下读 spoken（禁用加 ", unavailable"），否则显示 before/children/after，禁用或锁定时变暗。
 */
function A11yValueText(props) {
  let m = w(15);
  let { spoken, disabled, before, after, children } = props;
  let x = disabled === undefined ? false : disabled;
  let k = isMenuOpen();
  let p = Se(A11Y_BOOLEAN_CONTEXT);
  if (useIsScreenReaderEnabled()) {
    const b = x && ", unavailable";
    let E;
    if (m[0] !== spoken || m[1] !== b) {
      E = jsxProd_default_2(Text, {
        children: [spoken, b],
      });
      m[0] = spoken;
      m[1] = b;
      m[2] = E;
    } else E = m[2];
    return E;
  }
  const dimColor = x || p;
  let E;
  if (m[3] !== before) {
    E =
      before &&
      jsxProd_default(Text, {
        dimColor: true,
        children: before,
      });
    m[3] = before;
    m[4] = E;
  } else E = m[4];
  const color = k && !x && !p ? "suggestion" : undefined;
  let S;
  if (m[5] !== children || m[6] !== color) {
    S = jsxProd_default(Text, {
      color,
      children,
    });
    m[5] = children;
    m[6] = color;
    m[7] = S;
  } else S = m[7];
  let L;
  if (m[8] !== after) {
    L =
      after &&
      jsxProd_default(Text, {
        dimColor: true,
        children: after,
      });
    m[8] = after;
    m[9] = L;
  } else L = m[9];
  let h;
  if (m[10] !== dimColor || m[11] !== E || m[12] !== S || m[13] !== L) {
    h = jsxProd_default_2(Text, {
      dimColor,
      wrap: "truncate-end",
      children: [E, S, L],
    });
    m[10] = dimColor;
    m[11] = E;
    m[12] = S;
    m[13] = L;
    m[14] = h;
  } else h = m[14];
  return h;
}
//@ chunk-nz9pbsr3.js:6769-6879 placement
function A11ySection(props) {
  let d = w(2);
  let { children } = props;
  let a;
  if (d[0] !== children) {
    a = jsxProd_default(Fragment, {
      children,
    });
    d[0] = children;
    d[1] = a;
  } else a = d[1];
  return a;
}
//@ chunk-nz9pbsr3.js:6879-7085 placement
function A11yBooleanValue(props) {
  let l = w(4);
  let { value: t, disabled } = props;
  const spoken = String(t);
  const children = String(t);
  let x;
  if (l[0] !== disabled || l[1] !== spoken || l[2] !== children) {
    x = jsxProd_default(A11yValueText, {
      spoken,
      disabled,
      children,
    });
    l[0] = disabled;
    l[1] = spoken;
    l[2] = children;
    l[3] = x;
  } else x = l[3];
  return x;
}
//@ chunk-nz9pbsr3.js:7085-7490 placement
/**
 * 循环选择型值：显示当前选项标签，可用时两侧加 ‹ ›。
 */
function A11yCycleValue(props) {
  let x = w(8);
  let { value: t, options, disabled } = props;
  let u = Se(A11Y_CYCLE_CONTEXT);
  let l = isMenuOpen();
  let k;
  if (x[0] !== options || x[1] !== t) {
    k = options.find((option) => option.value === t)?.label ?? t;
    x[0] = options;
    x[1] = t;
    x[2] = k;
  } else k = x[2];
  let f = k;
  let b = !disabled && !u && (l || !A11Y_AUTO_FOCUS_INPUT);
  const before = b ? "\u2039 " : undefined;
  const after = b ? " \u203A" : undefined;
  let v;
  if (x[3] !== disabled || x[4] !== f || x[5] !== before || x[6] !== after) {
    v = jsxProd_default(A11yValueText, {
      spoken: f,
      disabled,
      before,
      after,
      children: f,
    });
    x[3] = disabled;
    x[4] = f;
    x[5] = before;
    x[6] = after;
    x[7] = v;
  } else v = x[7];
  return v;
}
//@ chunk-nz9pbsr3.js:7490-7749 placement
function A11yOpenerValue(props) {
  let l = w(5);
  let { children, disabled } = props;
  const spoken = children ? `${children}, opens` : "opens";
  const after = children ? " \u203A" : "\u203A";
  let x;
  if (l[0] !== children || l[1] !== disabled || l[2] !== spoken || l[3] !== after) {
    x = jsxProd_default(A11yValueText, {
      spoken,
      disabled,
      after,
      children,
    });
    l[0] = children;
    l[1] = disabled;
    l[2] = spoken;
    l[3] = after;
    l[4] = x;
  } else x = l[4];
  return x;
}
//@ chunk-nz9pbsr3.js:7749-7962 placement
function A11yButtonValue(props) {
  let u = w(4);
  let { children, disabled } = props;
  const spoken = children ? `${children}, button` : "button";
  let l;
  if (u[0] !== children || u[1] !== disabled || u[2] !== spoken) {
    l = jsxProd_default(A11yValueText, {
      spoken,
      disabled,
      children,
    });
    u[0] = children;
    u[1] = disabled;
    u[2] = spoken;
    u[3] = l;
  } else l = u[3];
  return l;
}
//@ chunk-nz9pbsr3.js:7962-8245 placement
function A11yTextValue(props) {
  let u = w(6);
  let { children, disabled } = props;
  const spoken = children || "empty";
  let children_2;
  if (u[0] !== children) {
    children_2 =
      children ||
      jsxProd_default(Text, {
        dimColor: true,
        children: "\u2014",
      });
    u[0] = children;
    u[1] = children_2;
  } else children_2 = u[1];
  let x;
  if (u[2] !== disabled || u[3] !== spoken || u[4] !== children_2) {
    x = jsxProd_default(A11yValueText, {
      spoken,
      disabled,
      children: children_2,
    });
    u[2] = disabled;
    u[3] = spoken;
    u[4] = children_2;
    u[5] = x;
  } else x = u[5];
  return x;
}
//@ chunk-nz9pbsr3.js:8245-10910 placement
/**
 * 可编辑选择框的无障碍输入行为（编辑文本、取消）
 */
function useSelectA11yInput(props) {
  let p = w(75);
  let { value: t, placeholder, disabled } = props;
  let u = Se(A11Y_INPUT_CONTEXT);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let terminalFocus = useTerminalFocus();
  if (u === undefined) {
    const spoken = `${t || "empty"}, edit text`;
    let children;
    if (p[0] !== placeholder || p[1] !== t) {
      children =
        t ||
        jsxProd_default(Text, {
          dimColor: true,
          children: placeholder,
        });
      p[0] = placeholder;
      p[1] = t;
      p[2] = children;
    } else children = p[2];
    let b;
    if (p[3] !== disabled || p[4] !== spoken || p[5] !== children) {
      b = jsxProd_default(A11yValueText, {
        spoken,
        disabled,
        children,
      });
      p[3] = disabled;
      p[4] = spoken;
      p[5] = children;
      p[6] = b;
    } else b = p[6];
    return b;
  }
  let { editor, input, end } = u;
  let S;
  let L;
  let h;
  let T;
  let F;
  let children;
  let scope;
  let bindings;
  let wrap;
  let b;
  let ref;
  let autoFocus;
  let caret;
  let onKeyDown;
  let onPaste;
  let onBlur;
  if (
    p[7] !== u.room ||
    p[8] !== editor ||
    p[9] !== end ||
    p[10] !== input ||
    p[11] !== isScreenReaderEnabled ||
    p[12] !== terminalFocus
  ) {
    let i = Cursor.fromText(editor.query, u.room, editor.cursorOffset);
    let M = terminalFocus && !isScreenReaderEnabled && !isNativeCursorEnabled() ? " " : "";
    let c;
    if (p[29] !== end) {
      c = () => (end(true, true) ? false : undefined);
      p[29] = end;
      p[30] = c;
    } else c = p[30];
    let run = c;
    F = useDialogKeybindings;
    scope = "Select";
    let g;
    if (p[31] !== end) {
      g = {
        action: "select:cancel",
        run: () => {
          end(false);
        },
      };
      p[31] = end;
      p[32] = g;
    } else g = p[32];
    let C;
    if (p[33] !== editor) {
      C = {
        action: "select:first",
        run: () => editor.setCursorOffset(0),
      };
      p[33] = editor;
      p[34] = C;
    } else C = p[34];
    let O;
    if (p[35] !== editor) {
      O = {
        action: "select:last",
        run: () => editor.setCursorOffset(editor.queryRef.current.length),
      };
      p[35] = editor;
      p[36] = O;
    } else O = p[36];
    let K;
    let V;
    if (p[37] !== run) {
      K = {
        action: "select:previous",
        run,
      };
      V = {
        action: "select:next",
        run,
      };
      p[37] = run;
      p[38] = K;
      p[39] = V;
    } else {
      K = p[38];
      V = p[39];
    }
    if (p[40] !== g || p[41] !== C || p[42] !== O || p[43] !== K || p[44] !== V) {
      bindings = [g, C, O, K, V];
      p[40] = g;
      p[41] = C;
      p[42] = O;
      p[43] = K;
      p[44] = V;
      p[45] = bindings;
    } else bindings = p[45];
    T = Box;
    if (p[46] !== end) {
      onBlur = (Q) => end(Q.relatedTarget !== null);
      p[46] = end;
      p[47] = onBlur;
    } else onBlur = p[47];
    h = Input;
    ref = input;
    autoFocus = true;
    caret = {
      line: 0,
      column: i.getPosition().column,
      visible: true,
    };
    if (p[48] !== editor) {
      onKeyDown = (event) => {
        editor.handleKeyDown(event);
        if (event.defaultPrevented) event.stopImmediatePropagation();
      };
      p[48] = editor;
      p[49] = onKeyDown;
    } else onKeyDown = p[49];
    onPaste = editor.handlePaste;
    L = Text;
    wrap = "truncate-end";
    b = true;
    S = Ansi;
    children = i.render(M, "", inverseText, undefined, 1, undefined, undefined, isScreenReaderEnabled);
    p[7] = u.room;
    p[8] = editor;
    p[9] = end;
    p[10] = input;
    p[11] = isScreenReaderEnabled;
    p[12] = terminalFocus;
    p[13] = S;
    p[14] = L;
    p[15] = h;
    p[16] = T;
    p[17] = F;
    p[18] = children;
    p[19] = scope;
    p[20] = bindings;
    p[21] = wrap;
    p[22] = b;
    p[23] = ref;
    p[24] = autoFocus;
    p[25] = caret;
    p[26] = onKeyDown;
    p[27] = onPaste;
    p[28] = onBlur;
  } else {
    S = p[13];
    L = p[14];
    h = p[15];
    T = p[16];
    F = p[17];
    children = p[18];
    scope = p[19];
    bindings = p[20];
    wrap = p[21];
    b = p[22];
    ref = p[23];
    autoFocus = p[24];
    caret = p[25];
    onKeyDown = p[26];
    onPaste = p[27];
    onBlur = p[28];
  }
  let children_2;
  if (p[50] !== S || p[51] !== children) {
    children_2 = jsxProd_default(S, {
      children,
    });
    p[50] = S;
    p[51] = children;
    p[52] = children_2;
  } else children_2 = p[52];
  let children_3;
  if (p[53] !== L || p[54] !== children_2 || p[55] !== wrap || p[56] !== b) {
    children_3 = jsxProd_default(L, {
      wrap,
      "aria-preserve-whitespace": b,
      children: children_2,
    });
    p[53] = L;
    p[54] = children_2;
    p[55] = wrap;
    p[56] = b;
    p[57] = children_3;
  } else children_3 = p[57];
  let children_4;
  if (
    p[58] !== h ||
    p[59] !== children_3 ||
    p[60] !== ref ||
    p[61] !== autoFocus ||
    p[62] !== caret ||
    p[63] !== onKeyDown ||
    p[64] !== onPaste
  ) {
    children_4 = jsxProd_default(h, {
      ref,
      autoFocus,
      caret,
      onKeyDown,
      onPaste,
      children: children_3,
    });
    p[58] = h;
    p[59] = children_3;
    p[60] = ref;
    p[61] = autoFocus;
    p[62] = caret;
    p[63] = onKeyDown;
    p[64] = onPaste;
    p[65] = children_4;
  } else children_4 = p[65];
  let children_5;
  if (p[66] !== T || p[67] !== children_4 || p[68] !== onBlur) {
    children_5 = jsxProd_default(T, {
      onBlur,
      children: children_4,
    });
    p[66] = T;
    p[67] = children_4;
    p[68] = onBlur;
    p[69] = children_5;
  } else children_5 = p[69];
  let K;
  if (p[70] !== F || p[71] !== scope || p[72] !== bindings || p[73] !== children_5) {
    K = jsxProd_default(F, {
      scope,
      bindings,
      children: children_5,
    });
    p[70] = F;
    p[71] = scope;
    p[72] = bindings;
    p[73] = children_5;
    p[74] = K;
  } else K = p[74];
  return K;
}
//@ chunk-nz9pbsr3.js:10910-11310 placement
/**
 * 计算各种值组件的显示宽度（布尔、循环选项取最长标签加箭头、打开、按钮、文本、输入框），用于对齐值列。
 */
function measureA11yValueWidth(children) {
  if (isChildOfType(children, A11yBooleanValue)) return bunStringWidth("false");
  if (isChildOfType(children, A11yCycleValue))
    return (
      Math.max(0, ...children.props.options.map((option) => a11yLabelWidth(option.label))) +
      (children.props.disabled ? 0 : bunStringWidth("\u2039  \u203A"))
    );
  if (isChildOfType(children, A11yOpenerValue)) {
    let { children: children_2 } = children.props;
    return children_2 ? a11yLabelWidth(children_2) + bunStringWidth(" \u203A") : bunStringWidth("\u203A");
  }
  if (isChildOfType(children, A11yButtonValue)) return a11yLabelWidth(children.props.children ?? "");
  if (isChildOfType(children, A11yTextValue)) return a11yLabelWidth(children.props.children || "\u2014");
  if (isChildOfType(children, useSelectA11yInput))
    return a11yLabelWidth(children.props.value || (children.props.placeholder ?? "")) + 1;
  return 0;
}
//@ chunk-nz9pbsr3.js:11310-11365 placement
/**
 * 计算无障碍值区域宽度：文本宽度 + 空格数 + 1（无文本时为 2）。
 */
function a11yValueWidth(description) {
  let t = cellText(description);
  return 2 + (t ? countCharInString(t, " ") + 1 : 0);
}
//@ chunk-nz9pbsr3.js:11365-11431 placement
function a11yLabelWidth(o) {
  return Math.max(
    0,
    ...o
      .split(
        `
`,
      )
      .map((line) => bunStringWidth(line)),
  );
}
//@ chunk-nz9pbsr3.js:11431-11986 placement
/**
 * 为值组件给出键盘动作：布尔切换、循环选项前后切换并 onChange、打开器 onOpen、按钮 onPress。
 */
function getA11yValueActions(children, t) {
  if (isChildOfType(children, A11yBooleanValue) && !children.props.disabled) {
    let d = toggleBooleanValue.bind(undefined, children.props, t);
    return {
      accept: d,
      previous: d,
      next: d,
    };
  }
  if (isChildOfType(children, A11yCycleValue) && !children.props.disabled) {
    let { props } = children;
    let a = (u) => () => {
      let l = props.options.length;
      let index = props.options.findIndex((option) => option.value === (t.get(props) ?? props.value));
      let max = Math.max(index, u === 1 ? -1 : 0);
      let p = props.options[(max + u + l) % l];
      if (p === undefined) return;
      setPendingValue(t, props, p.value);
      props.onChange(p.value);
    };
    return {
      accept: a(1),
      next: a(1),
      previous: a(-1),
    };
  }
  if (isChildOfType(children, A11yOpenerValue) && !children.props.disabled)
    return {
      accept: children.props.onOpen,
      next: children.props.onOpen,
    };
  if (isChildOfType(children, A11yButtonValue) && !children.props.disabled)
    return {
      accept: children.props.onPress,
    };
  return {};
}
//@ chunk-nz9pbsr3.js:11986-12054 placement
function toggleBooleanValue(o, t) {
  let d = !(t.get(o) ?? o.value);
  setPendingValue(t, o, d);
  o.onChange(d);
}
//@ chunk-nz9pbsr3.js:12054-12116 placement
function setPendingValue(o, props, d) {
  o.set(props, d);
  queueMicrotask(() => o.delete(props));
}
//@ chunk-nz9pbsr3.js:12116-12185 placement
function pendingValueOrValue(props, t) {
  let d = t.get(props);
  return typeof d === "string" ? d : props.value;
}
//@ chunk-nz9pbsr3.js:12185-12226 placement
function isA11ySection(o) {
  return isValidElement_default(o) && o.type === A11ySection;
}
//@ chunk-nz9pbsr3.js:12226-12267 placement
function isChildOfType(children, t) {
  return isValidElement_default(children) && children.type === t;
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
export { a11yValueWidth, merged };
