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
import { useHoverHighlight, WDe, USER_MESSAGE_BACKGROUND } from "../CustomSelect/selectTypeahead.js";
import { useDeclaredCursor } from "../../ink/hooks/use-declared-cursor.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ey2qag4x.js:19808-22111 fingerprint = ListItem (0.589)
function ListItem(t0) {
  let $ = w(47),
    {
      isFocused: isFocused,
      isSelected: t1,
      children: children,
      description: description,
      showScrollDown: showScrollDown,
      showScrollUp: showScrollUp,
      styled: t2,
      disabled: t3,
      idle: idle,
      declareCursor: declareCursor,
      onClick: onClick,
      hoverStyle: hoverStyle,
      onHoverChange: onHoverChange,
    } = t0,
    B = t1 === void 0 ? !1 : t1,
    N = t2 === void 0 ? !0 : t2,
    h = t3 === void 0 ? !1 : t3,
    K = idle === void 0 ? !1 : idle,
    m = hoverStyle === void 0 ? "tint" : hoverStyle,
    W = !h && onClick !== void 0,
    T = !h && (onClick !== void 0 || onHoverChange !== void 0),
    [D, L] = useHoverHighlight(T),
    M = D && W,
    E = WDe(m),
    v;
  if ($[0] !== onHoverChange || $[1] !== L)
    ((v = (ue) => {
      (L(ue), onHoverChange?.(ue));
    }),
      ($[0] = onHoverChange),
      ($[1] = L),
      ($[2] = v));
  else v = $[2];
  let ve = v,
    Y;
  if ($[3] !== h || $[4] !== K || $[5] !== isFocused || $[6] !== B || $[7] !== N)
    ((Y = function J() {
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
    }),
      ($[3] = h),
      ($[4] = K),
      ($[5] = isFocused),
      ($[6] = B),
      ($[7] = N),
      ($[8] = Y));
  else Y = $[8];
  let J = Y,
    ye = J();
  const fe = isFocused && !h && declareCursor !== !1;
  let ee;
  if ($[9] !== fe) ((ee = { line: 0, column: 0, active: fe }), ($[9] = fe), ($[10] = ee));
  else ee = $[10];
  let cursorRef = useDeclaredCursor(ee);
  const xe = M && E === "tint" ? USER_MESSAGE_BACKGROUND : void 0,
    U = W ? onClick : void 0;
  let me;
  if ($[11] !== T || $[12] !== ve)
    ((me = T ? () => ve(!0) : void 0), ($[11] = T), ($[12] = ve), ($[13] = me));
  else me = $[13];
  let X;
  if ($[14] !== T || $[15] !== ve) ((X = T ? () => ve(!1) : void 0), ($[14] = T), ($[15] = ve), ($[16] = X));
  else X = $[16];
  const le = M && E === "pointer",
    Te = M && E === "inverse";
  let Ve;
  if (
    $[17] !== h ||
    $[18] !== K ||
    $[19] !== isFocused ||
    $[20] !== showScrollDown ||
    $[21] !== showScrollUp ||
    $[22] !== le ||
    $[23] !== Te
  )
    ((Ve = e(Box, {
      flexShrink: 0,
      children: e(ListItemIndicator, {
        disabled: h,
        isFocused: isFocused,
        idle: K,
        showScrollUp: showScrollUp,
        showScrollDown: showScrollDown,
        hovered: le,
        inverse: Te,
      }),
    })),
      ($[17] = h),
      ($[18] = K),
      ($[19] = isFocused),
      ($[20] = showScrollDown),
      ($[21] = showScrollUp),
      ($[22] = le),
      ($[23] = Te),
      ($[24] = Ve));
  else Ve = $[24];
  let ne;
  if ($[25] !== children || $[26] !== h || $[27] !== N || $[28] !== ye)
    ((ne = N ? e(Text, { color: ye, dimColor: h, wrap: "truncate-end", children: children }) : children),
      ($[25] = children),
      ($[26] = h),
      ($[27] = N),
      ($[28] = ye),
      ($[29] = ne));
  else ne = $[29];
  let A;
  if ($[30] !== h || $[31] !== B)
    ((A =
      B &&
      !h &&
      e(Box, {
        flexShrink: 0,
        children: e(Text, { "aria-label": "(selected)", color: "success", children: re.tick }),
      })),
      ($[30] = h),
      ($[31] = B),
      ($[32] = A));
  else A = $[32];
  let we;
  if ($[33] !== Ve || $[34] !== ne || $[35] !== A)
    ((we = r(Box, { flexDirection: "row", gap: 1, children: [Ve, ne, A] })),
      ($[33] = Ve),
      ($[34] = ne),
      ($[35] = A),
      ($[36] = we));
  else we = $[36];
  let te;
  if ($[37] !== description)
    ((te =
      description &&
      e(Box, {
        paddingLeft: 2,
        children: e(Text, { dimColor: !0, wrap: "truncate-end", children: description }),
      })),
      ($[37] = description),
      ($[38] = te));
  else te = $[38];
  let ze;
  if (
    $[39] !== cursorRef ||
    $[40] !== xe ||
    $[41] !== U ||
    $[42] !== me ||
    $[43] !== X ||
    $[44] !== we ||
    $[45] !== te
  )
    ((ze = r(Box, {
      ref: cursorRef,
      flexDirection: "column",
      backgroundColor: xe,
      onClick: U,
      onMouseEnter: me,
      onMouseLeave: X,
      children: [we, te],
    })),
      ($[39] = cursorRef),
      ($[40] = xe),
      ($[41] = U),
      ($[42] = me),
      ($[43] = X),
      ($[44] = we),
      ($[45] = te),
      ($[46] = ze));
  else ze = $[46];
  return ze;
}
/**
 * 列表项左侧指示符：禁用、焦点、悬停、可向上/向下滚动时显示不同符号。
 */
//@ chunk-ey2qag4x.js:22111-23007 sole-consumer
function ListItemIndicator(props) {
  let $ = w(12),
    {
      disabled: disabled,
      isFocused: isFocused,
      idle: idle,
      showScrollUp: showScrollUp,
      showScrollDown: showScrollDown,
      hovered: hovered,
      inverse: inverse,
    } = props;
  if (disabled) {
    let c;
    if ($[0] === MEMO_CACHE_SENTINEL) ((c = e(Text, { "aria-hidden": !0, children: " " })), ($[0] = c));
    else c = $[0];
    return c;
  }
  if (isFocused) {
    const c = idle ? void 0 : "suggestion";
    let b;
    if ($[1] !== idle || $[2] !== inverse || $[3] !== c)
      ((b = e(Text, { "aria-hidden": !0, color: c, dimColor: idle, inverse: inverse, children: re.pointer })),
        ($[1] = idle),
        ($[2] = inverse),
        ($[3] = c),
        ($[4] = b));
    else b = $[4];
    return b;
  }
  if (showScrollDown) {
    let c;
    if ($[5] !== inverse)
      ((c = e(Text, {
        "aria-label": "(more below)",
        dimColor: !0,
        inverse: inverse,
        children: re.arrowDown,
      })),
        ($[5] = inverse),
        ($[6] = c));
    else c = $[6];
    return c;
  }
  if (showScrollUp) {
    let c;
    if ($[7] !== inverse)
      ((c = e(Text, { "aria-label": "(more above)", dimColor: !0, inverse: inverse, children: re.arrowUp })),
        ($[7] = inverse),
        ($[8] = c));
    else c = $[8];
    return c;
  }
  if (hovered) {
    let c;
    if ($[9] === MEMO_CACHE_SENTINEL)
      ((c = e(Text, { "aria-hidden": !0, dimColor: !0, children: re.pointer })), ($[9] = c));
    else c = $[9];
    return c;
  }
  let c;
  if ($[10] !== inverse)
    ((c = e(Text, { "aria-hidden": !0, inverse: inverse, children: " " })), ($[10] = inverse), ($[11] = c));
  else c = $[11];
  return c;
}
//@ chunk-ey2qag4x.js:23007-23011 sole-consumer
j();

export { ListItem };
