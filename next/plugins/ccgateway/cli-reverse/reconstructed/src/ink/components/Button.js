/**
 * ink/components/Button.tsx
 *
 * <Button>：可聚焦、可点击、回车/空格触发的按钮组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/Button.tsx
 * pieces: chunk-x6v6jz2y.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { DOUBLE_CLICK_MS } from "./ErrorBoundary.js";
import { useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "./ClockContext.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";

//@ chunk-x6v6jz2y.js:17573-19217 fingerprint (2.1.88 match: Button, 0.772)
/**
 * <Button>：可聚焦的 Box；回车或空格触发 onAction 并短暂（100ms）进入 active 态；点击触发 onAction，但窗口激活点击与挂载后 mountSettleMs（默认 300ms）内的点击当误触丢弃；children 可为 (state)=>节点 拿到 focused/hovered/active。
 */
function Button_2(t0) {
  let $ = useMemoCache(37);
  let autoFocus;
  let children;
  let onAction;
  let ref;
  let style;
  let tabIndexProp;
  let mountSettleMsProp;
  if ($[0] !== t0) {
    ({
      onAction,
      tabIndex: tabIndexProp,
      autoFocus,
      mountSettleMs: mountSettleMsProp,
      children,
      ref,
      ...style
    } = t0);
    $[0] = t0;
    $[1] = autoFocus;
    $[2] = children;
    $[3] = onAction;
    $[4] = ref;
    $[5] = style;
    $[6] = tabIndexProp;
    $[7] = mountSettleMsProp;
  } else {
    autoFocus = $[1];
    children = $[2];
    onAction = $[3];
    ref = $[4];
    style = $[5];
    tabIndexProp = $[6];
    mountSettleMsProp = $[7];
  }
  let tabIndex = tabIndexProp === undefined ? 0 : tabIndexProp;
  let mountSettleMs = mountSettleMsProp === undefined ? DOUBLE_CLICK_MS : mountSettleMsProp;
  let [focused, setIsFocused] = useState(false);
  let [hovered, setIsHovered] = useState(false);
  let [active, setIsActive] = useState(false);
  let clock = useClock();
  let activeTimer = useRef(null);
  let getNow;
  if ($[8] !== clock) {
    getNow = () => clock.now();
    $[8] = clock;
    $[9] = getNow;
  } else getNow = $[9];
  let [mountedAt] = useState(getNow);
  let cleanupEffect;
  let t3;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    cleanupEffect = () => () => {
      activeTimer.current?.();
    };
    t3 = [];
    $[10] = cleanupEffect;
    $[11] = t3;
  } else {
    cleanupEffect = $[10];
    t3 = $[11];
  }
  useEffect(cleanupEffect, t3);
  let t4;
  if ($[12] !== clock || $[13] !== onAction) {
    t4 = (e) => {
      if (e.key === "return" || e.key === " ") {
        e.preventDefault();
        setIsActive(true);
        onAction();
        activeTimer.current?.();
        activeTimer.current = clock.setTimeout(() => setIsActive(false), 100);
      }
    };
    $[12] = clock;
    $[13] = onAction;
    $[14] = t4;
  } else t4 = $[14];
  let handleKeyDown = t4;
  let handleClick;
  if ($[15] !== clock || $[16] !== mountSettleMs || $[17] !== mountedAt || $[18] !== onAction) {
    handleClick = (click) => {
      if (click.isWindowActivation || clock.now() - mountedAt < mountSettleMs) {
        click.dropAsStray();
        return;
      }
      onAction();
    };
    $[15] = clock;
    $[16] = mountSettleMs;
    $[17] = mountedAt;
    $[18] = onAction;
    $[19] = handleClick;
  } else handleClick = $[19];
  let handleClick_2 = handleClick;
  let t6;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    t6 = (_e_0) => setIsFocused(true);
    $[20] = t6;
  } else t6 = $[20];
  let handleFocus = t6;
  let t7;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    t7 = (_e_1) => setIsFocused(false);
    $[21] = t7;
  } else t7 = $[21];
  let handleBlur = t7;
  let t8;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    t8 = () => setIsHovered(true);
    $[22] = t8;
  } else t8 = $[22];
  let handleMouseEnter = t8;
  let t9;
  if ($[23] === MEMO_CACHE_SENTINEL) {
    t9 = () => setIsHovered(false);
    $[23] = t9;
  } else t9 = $[23];
  let handleMouseLeave = t9;
  let t10;
  if ($[24] !== children || $[25] !== active || $[26] !== focused || $[27] !== hovered) {
    let state = {
      focused,
      hovered,
      active,
    };
    t10 = typeof children === "function" ? children(state) : children;
    $[24] = children;
    $[25] = active;
    $[26] = focused;
    $[27] = hovered;
    $[28] = t10;
  } else t10 = $[28];
  let content = t10;
  let t11;
  if (
    $[29] !== autoFocus ||
    $[30] !== content ||
    $[31] !== handleClick_2 ||
    $[32] !== handleKeyDown ||
    $[33] !== ref ||
    $[34] !== style ||
    $[35] !== tabIndex
  ) {
    t11 = jsxProd_default(BaseBox, {
      ref,
      tabIndex,
      autoFocus,
      onKeyDown: handleKeyDown,
      onClick: handleClick_2,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      hoverFollowsPaint: true,
      ...style,
      children: content,
    });
    $[29] = autoFocus;
    $[30] = content;
    $[31] = handleClick_2;
    $[32] = handleKeyDown;
    $[33] = ref;
    $[34] = style;
    $[35] = tabIndex;
    $[36] = t11;
  } else t11 = $[36];
  return t11;
}
export { Button_2 };
