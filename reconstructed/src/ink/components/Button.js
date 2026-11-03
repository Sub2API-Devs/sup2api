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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { DOUBLE_CLICK_MS } from "./ErrorBoundary.js";
import { y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "./ClockContext.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";

/**
 * <Button>：可聚焦的 Box；回车或空格触发 onAction 并短暂（100ms）进入 active 态；点击触发 onAction，但窗口激活点击与挂载后 mountSettleMs（默认 300ms）内的点击当误触丢弃；children 可为 (state)=>节点 拿到 focused/hovered/active。
 */
//@ chunk-x6v6jz2y.js:17573-19217 fingerprint = Button (0.772)
function Button_2(t0) {
  let r = w(37),
    l,
    u,
    d,
    p,
    m,
    b,
    C;
  if (r[0] !== t0)
    (({ onAction: d, tabIndex: b, autoFocus: l, mountSettleMs: C, children: u, ref: p, ...m } = t0),
      (r[0] = t0),
      (r[1] = l),
      (r[2] = u),
      (r[3] = d),
      (r[4] = p),
      (r[5] = m),
      (r[6] = b),
      (r[7] = C));
  else ((l = r[1]), (u = r[2]), (d = r[3]), (p = r[4]), (m = r[5]), (b = r[6]), (C = r[7]));
  let tabIndex = b === void 0 ? 0 : b,
    mountSettleMs = C === void 0 ? DOUBLE_CLICK_MS : C,
    [focused, E] = y(!1),
    [hovered, T] = y(!1),
    [active, I] = y(!1),
    clock = useClock(),
    activeTimer = R(null),
    B;
  if (r[8] !== clock) ((B = () => clock.now()), (r[8] = clock), (r[9] = B));
  else B = r[9];
  let [mountedAt] = y(B),
    H,
    L;
  if (r[10] === MEMO_CACHE_SENTINEL)
    ((H = () => () => {
      activeTimer.current?.();
    }),
      (L = []),
      (r[10] = H),
      (r[11] = L));
  else ((H = r[10]), (L = r[11]));
  P(H, L);
  let D;
  if (r[12] !== clock || r[13] !== d)
    ((D = (U) => {
      if (U.key === "return" || U.key === " ")
        (U.preventDefault(),
          I(!0),
          d(),
          activeTimer.current?.(),
          (activeTimer.current = clock.setTimeout(() => I(!1), 100)));
    }),
      (r[12] = clock),
      (r[13] = d),
      (r[14] = D));
  else D = r[14];
  let handleKeyDown = D,
    G;
  if (r[15] !== clock || r[16] !== mountSettleMs || r[17] !== mountedAt || r[18] !== d)
    ((G = (oe) => {
      if (oe.isWindowActivation || clock.now() - mountedAt < mountSettleMs) {
        oe.dropAsStray();
        return;
      }
      d();
    }),
      (r[15] = clock),
      (r[16] = mountSettleMs),
      (r[17] = mountedAt),
      (r[18] = d),
      (r[19] = G));
  else G = r[19];
  let handleClick = G,
    it;
  if (r[20] === MEMO_CACHE_SENTINEL) ((it = (Ml) => E(!0)), (r[20] = it));
  else it = r[20];
  let Go = it,
    st;
  if (r[21] === MEMO_CACHE_SENTINEL) ((st = (_l) => E(!1)), (r[21] = st));
  else st = r[21];
  let Yo = st,
    lt;
  if (r[22] === MEMO_CACHE_SENTINEL) ((lt = () => T(!0)), (r[22] = lt));
  else lt = r[22];
  let Jo = lt,
    at;
  if (r[23] === MEMO_CACHE_SENTINEL) ((at = () => T(!1)), (r[23] = at));
  else at = r[23];
  let $o = at,
    ut;
  if (r[24] !== u || r[25] !== active || r[26] !== focused || r[27] !== hovered) {
    let state = { focused: focused, hovered: hovered, active: active };
    ut = typeof u === "function" ? u(state) : u;
    ((r[24] = u), (r[25] = active), (r[26] = focused), (r[27] = hovered), (r[28] = ut));
  } else ut = r[28];
  let xe = ut,
    ct;
  if (
    r[29] !== l ||
    r[30] !== xe ||
    r[31] !== handleClick ||
    r[32] !== handleKeyDown ||
    r[33] !== p ||
    r[34] !== m ||
    r[35] !== tabIndex
  )
    ((ct = e(BaseBox, {
      ref: p,
      tabIndex: tabIndex,
      autoFocus: l,
      onKeyDown: handleKeyDown,
      onClick: handleClick,
      onFocus: Go,
      onBlur: Yo,
      onMouseEnter: Jo,
      onMouseLeave: $o,
      hoverFollowsPaint: !0,
      ...m,
      children: xe,
    })),
      (r[29] = l),
      (r[30] = xe),
      (r[31] = handleClick),
      (r[32] = handleKeyDown),
      (r[33] = p),
      (r[34] = m),
      (r[35] = tabIndex),
      (r[36] = ct));
  else ct = r[36];
  return ct;
}

export { Button_2 };
