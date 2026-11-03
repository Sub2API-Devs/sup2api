/**
 * components/design-system/ListItem.tsx
 *
 * 列表项：聚焦指针、选中/禁用/成功等状态色、描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/ListItem.tsx
 * pieces: chunk-ey2qag4x.js (3)
 * attribution: fingerprint 1, sole-consumer 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  useHoverHighlight,
  userMessageBackgroundMode,
  USER_MESSAGE_BACKGROUND,
} from "../CustomSelect/selectTypeahead.js";
import { useDeclaredCursor } from "../../ink/hooks/use-declared-cursor.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ey2qag4x.js:19808-22111 fingerprint = ListItem (0.589)
function ListItem(props) {
  let $ = w(47);
  let {
    isFocused,
    isSelected,
    children,
    description,
    showScrollDown,
    showScrollUp,
    styled,
    disabled,
    idle,
    declareCursor,
    onClick,
    hoverStyle,
    onHoverChange,
  } = props;
  let B = isSelected === undefined ? false : isSelected;
  let N = styled === undefined ? true : styled;
  let h = disabled === undefined ? false : disabled;
  let K = idle === undefined ? false : idle;
  let m = hoverStyle === undefined ? "tint" : hoverStyle;
  let W = !h && onClick !== undefined;
  let T = !h && (onClick !== undefined || onHoverChange !== undefined);
  let [D, L] = useHoverHighlight(T);
  let M = D && W;
  let E = userMessageBackgroundMode(m);
  let v;
  if ($[0] !== onHoverChange || $[1] !== L) {
    v = (ue) => {
      L(ue);
      onHoverChange?.(ue);
    };
    $[0] = onHoverChange;
    $[1] = L;
    $[2] = v;
  } else v = $[2];
  let ve = v;
  let Y;
  if ($[3] !== h || $[4] !== K || $[5] !== isFocused || $[6] !== B || $[7] !== N) {
    Y = function getTextColor() {
      if (h) {
        return "inactive";
      }
      if (!N) {
        return;
      }
      if (B) {
        return "success";
      }
      if (isFocused && !K) {
        return "suggestion";
      }
    };
    $[3] = h;
    $[4] = K;
    $[5] = isFocused;
    $[6] = B;
    $[7] = N;
    $[8] = Y;
  } else Y = $[8];
  let J = Y;
  let color = J();
  const active = isFocused && !h && declareCursor !== false;
  let t7;
  if ($[9] !== active) {
    t7 = {
      line: 0,
      column: 0,
      active,
    };
    $[9] = active;
    $[10] = t7;
  } else t7 = $[10];
  let cursorRef = useDeclaredCursor(t7);
  const backgroundColor = M && E === "tint" ? USER_MESSAGE_BACKGROUND : undefined;
  const onClick_2 = W ? onClick : undefined;
  let onMouseEnter;
  if ($[11] !== T || $[12] !== ve) {
    onMouseEnter = T ? () => ve(true) : undefined;
    $[11] = T;
    $[12] = ve;
    $[13] = onMouseEnter;
  } else onMouseEnter = $[13];
  let onMouseLeave;
  if ($[14] !== T || $[15] !== ve) {
    onMouseLeave = T ? () => ve(false) : undefined;
    $[14] = T;
    $[15] = ve;
    $[16] = onMouseLeave;
  } else onMouseLeave = $[16];
  const hovered = M && E === "pointer";
  const inverse = M && E === "inverse";
  let Ve;
  if (
    $[17] !== h ||
    $[18] !== K ||
    $[19] !== isFocused ||
    $[20] !== showScrollDown ||
    $[21] !== showScrollUp ||
    $[22] !== hovered ||
    $[23] !== inverse
  ) {
    Ve = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(ListItemIndicator, {
        disabled: h,
        isFocused,
        idle: K,
        showScrollUp,
        showScrollDown,
        hovered,
        inverse,
      }),
    });
    $[17] = h;
    $[18] = K;
    $[19] = isFocused;
    $[20] = showScrollDown;
    $[21] = showScrollUp;
    $[22] = hovered;
    $[23] = inverse;
    $[24] = Ve;
  } else Ve = $[24];
  let ne;
  if ($[25] !== children || $[26] !== h || $[27] !== N || $[28] !== color) {
    ne = N
      ? jsxProd_default(Text, {
          color,
          dimColor: h,
          wrap: "truncate-end",
          children,
        })
      : children;
    $[25] = children;
    $[26] = h;
    $[27] = N;
    $[28] = color;
    $[29] = ne;
  } else ne = $[29];
  let A;
  if ($[30] !== h || $[31] !== B) {
    A =
      B &&
      !h &&
      jsxProd_default(Box, {
        flexShrink: 0,
        children: jsxProd_default(Text, {
          "aria-label": "(selected)",
          color: "success",
          children: figures_default.tick,
        }),
      });
    $[30] = h;
    $[31] = B;
    $[32] = A;
  } else A = $[32];
  let t11;
  if ($[33] !== Ve || $[34] !== ne || $[35] !== A) {
    t11 = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [Ve, ne, A],
    });
    $[33] = Ve;
    $[34] = ne;
    $[35] = A;
    $[36] = t11;
  } else t11 = $[36];
  let t12;
  if ($[37] !== description) {
    t12 =
      description &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "truncate-end",
          children: description,
        }),
      });
    $[37] = description;
    $[38] = t12;
  } else t12 = $[38];
  let ze;
  if (
    $[39] !== cursorRef ||
    $[40] !== backgroundColor ||
    $[41] !== onClick_2 ||
    $[42] !== onMouseEnter ||
    $[43] !== onMouseLeave ||
    $[44] !== t11 ||
    $[45] !== t12
  ) {
    ze = jsxProd_default_2(Box, {
      ref: cursorRef,
      flexDirection: "column",
      backgroundColor,
      onClick: onClick_2,
      onMouseEnter,
      onMouseLeave,
      children: [t11, t12],
    });
    $[39] = cursorRef;
    $[40] = backgroundColor;
    $[41] = onClick_2;
    $[42] = onMouseEnter;
    $[43] = onMouseLeave;
    $[44] = t11;
    $[45] = t12;
    $[46] = ze;
  } else ze = $[46];
  return ze;
}
//@ chunk-ey2qag4x.js:22111-23007 sole-consumer
/**
 * 列表项左侧指示符：禁用、焦点、悬停、可向上/向下滚动时显示不同符号。
 */
function ListItemIndicator(props) {
  let $ = w(12);
  let { disabled, isFocused, idle, showScrollUp, showScrollDown, hovered, inverse } = props;
  if (disabled) {
    let c;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      c = jsxProd_default(Text, {
        "aria-hidden": true,
        children: " ",
      });
      $[0] = c;
    } else c = $[0];
    return c;
  }
  if (isFocused) {
    const color = idle ? undefined : "suggestion";
    let b;
    if ($[1] !== idle || $[2] !== inverse || $[3] !== color) {
      b = jsxProd_default(Text, {
        "aria-hidden": true,
        color,
        dimColor: idle,
        inverse,
        children: figures_default.pointer,
      });
      $[1] = idle;
      $[2] = inverse;
      $[3] = color;
      $[4] = b;
    } else b = $[4];
    return b;
  }
  if (showScrollDown) {
    let c;
    if ($[5] !== inverse) {
      c = jsxProd_default(Text, {
        "aria-label": "(more below)",
        dimColor: true,
        inverse,
        children: figures_default.arrowDown,
      });
      $[5] = inverse;
      $[6] = c;
    } else c = $[6];
    return c;
  }
  if (showScrollUp) {
    let c;
    if ($[7] !== inverse) {
      c = jsxProd_default(Text, {
        "aria-label": "(more above)",
        dimColor: true,
        inverse,
        children: figures_default.arrowUp,
      });
      $[7] = inverse;
      $[8] = c;
    } else c = $[8];
    return c;
  }
  if (hovered) {
    let c;
    if ($[9] === MEMO_CACHE_SENTINEL) {
      c = jsxProd_default(Text, {
        "aria-hidden": true,
        dimColor: true,
        children: figures_default.pointer,
      });
      $[9] = c;
    } else c = $[9];
    return c;
  }
  let c;
  if ($[10] !== inverse) {
    c = jsxProd_default(Text, {
      "aria-hidden": true,
      inverse,
      children: " ",
    });
    $[10] = inverse;
    $[11] = c;
  } else c = $[11];
  return c;
}
//@ chunk-ey2qag4x.js:23007-23011 sole-consumer
init_react_production();
export { ListItem };
