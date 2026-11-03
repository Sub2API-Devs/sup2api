/**
 * ink/components/ScrollBox.tsx
 *
 * <ScrollBox>：带滚动偏移的可滚动容器（滚轮、粘底、命令式 scrollTo/scrollBy）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/ScrollBox.tsx
 * pieces: chunk-01xdq6fy.js (4)
 * attribution: placement 2, layout 1, fingerprint 1
 */
import { j, R, y, vxe } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { markScrollActivity } from "../../bootstrap/state.js";
import { markDirty, markScrollCommitStart, scheduleRenderFrom } from "../dom.js";
import { clampScrollTop } from "../events/event-handlers.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";

//@ chunk-01xdq6fy.js:460-464 placement
j();
//@ chunk-01xdq6fy.js:464-492 layout
function increment(De) {
  return De + 1;
}
/**
 * <ScrollBox>：overflow 为 scroll 的 ink-box（默认作为选区范围 selectionScope），内容放在一列子 Box 中。通过 ref 暴露命令式 API：scrollTo / scrollToElement（锚定到元素，start/center/end/nearest）/ scrollBy（累积到 pendingScrollDelta，由渲染时逐帧排水）/ scrollToBottom（重新开启粘底）、读 scrollTop/高度/视口、isSticky、subscribe、setClampBounds；滚动只标脏并在微任务里触发重绘，不走 React 状态。stickyScroll 让内容增长时自动跟到底，followGrowth=false 关闭位置跟随。
 */
//@ chunk-01xdq6fy.js:492-3446 fingerprint = ScrollBox (0.89)
function ScrollBox(props) {
  let $ = w(28),
    children,
    followGrowth,
    ref,
    stickyScroll,
    style;
  if ($[0] !== props)
    (({
      children: children,
      ref: ref,
      stickyScroll: stickyScroll,
      followGrowth: followGrowth,
      ...style
    } = props),
      ($[0] = props),
      ($[1] = children),
      ($[2] = followGrowth),
      ($[3] = ref),
      ($[4] = stickyScroll),
      ($[5] = style));
  else ((children = $[1]), (followGrowth = $[2]), (ref = $[3]), (stickyScroll = $[4]), (style = $[5]));
  let domRef = R(null),
    [, forceUpdate] = y(0),
    U;
  if ($[6] === MEMO_CACHE_SENTINEL) ((U = new Set()), ($[6] = U));
  else U = $[6];
  let subscribersRef = R(U),
    renderQueuedRef = R(!1),
    Z;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((Z = () => {
      for (const be of subscribersRef.current) be();
    }),
      ($[7] = Z));
  else Z = $[7];
  let notifySubscribers = Z,
    ee;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((ee = function scheduleScrollRender(el) {
      if (
        (markScrollActivity(),
        markDirty(el),
        markScrollCommitStart(el),
        notifySubscribers(),
        renderQueuedRef.current)
      ) {
        return;
      }
      ((renderQueuedRef.current = !0),
        queueMicrotask(() => {
          ((renderQueuedRef.current = !1), scheduleRenderFrom(el));
        }));
    }),
      ($[8] = ee));
  else ee = $[8];
  let b = ee,
    le,
    re;
  if ($[9] !== stickyScroll)
    ((le = () => ({
      scrollTo(we, Re) {
        let el = domRef.current;
        if (!el) {
          return;
        }
        if (((el.stickyScroll = !1), !Re?.preserveHwm)) el.scrollHeightHwm = void 0;
        ((el.pendingScrollDelta = void 0),
          (el.scrollAnchor = void 0),
          (el.scrollTop = Math.max(0, Math.floor(we))),
          b(el));
      },
      scrollToElement(ke, p, He) {
        let ve = p === void 0 ? 0 : p;
        let box = domRef.current;
        if (!box) {
          return;
        }
        ((box.stickyScroll = !1),
          (box.scrollHeightHwm = void 0),
          (box.pendingScrollDelta = void 0),
          (box.scrollAnchor = { el: ke, offset: ve, block: He?.block ?? "start" }),
          b(box));
      },
      scrollBy(Me) {
        let el = domRef.current;
        if (!el) {
          return;
        }
        ((el.stickyScroll = !1),
          (el.scrollHeightHwm = void 0),
          (el.scrollTop = clampScrollTop(el)),
          (el.scrollAnchor = void 0),
          (el.pendingScrollDelta = (el.pendingScrollDelta ?? 0) + Math.floor(Me)),
          b(el));
      },
      scrollToBottom() {
        let el = domRef.current;
        if (!el) {
          return;
        }
        if (((el.pendingScrollDelta = void 0), stickyScroll === !1)) {
          ((el.scrollAnchor = void 0),
            (el.scrollTop = Math.max(0, (el.scrollHeight ?? 0) - (el.scrollViewportHeight ?? 0))),
            b(el));
          return;
        }
        ((el.stickyScroll = !0), markDirty(el), notifySubscribers(), forceUpdate(increment));
      },
      getScrollTop() {
        return domRef.current?.scrollTop ?? 0;
      },
      getPendingDelta() {
        return domRef.current?.pendingScrollDelta ?? 0;
      },
      getScrollHeight() {
        return domRef.current?.scrollHeight ?? 0;
      },
      getFreshScrollHeight() {
        return (
          domRef.current?.childNodes[0]?.yogaNode?.getComputedHeight() ?? domRef.current?.scrollHeight ?? 0
        );
      },
      getViewportHeight() {
        return domRef.current?.scrollViewportHeight ?? 0;
      },
      getViewportTop() {
        return domRef.current?.scrollViewportTop ?? 0;
      },
      isSticky() {
        let el = domRef.current;
        if (!el) {
          return !1;
        }
        return el.stickyScroll ?? Boolean(el.attributes.stickyScroll);
      },
      subscribe(oe) {
        return (subscribersRef.current.add(oe), () => subscribersRef.current.delete(oe));
      },
      setClampBounds(te, ne) {
        let el = domRef.current;
        if (!el) {
          return;
        }
        if (el.scrollClampMin === te && el.scrollClampMax === ne) {
          return;
        }
        ((el.scrollClampMin = te), (el.scrollClampMax = ne), markDirty(el));
      },
      getDomElement() {
        return domRef.current;
      },
    })),
      (re = [stickyScroll]),
      ($[9] = stickyScroll),
      ($[10] = le),
      ($[11] = re));
  else ((le = $[10]), (re = $[11]));
  vxe(ref, le, re);
  const p = style.flexDirection ?? "row",
    N = style.flexGrow ?? 0,
    X = style.flexShrink ?? 1;
  let D;
  if ($[12] !== style || $[13] !== p || $[14] !== N || $[15] !== X)
    ((D = {
      flexWrap: "nowrap",
      flexDirection: p,
      flexGrow: N,
      flexShrink: X,
      selectionScope: !0,
      ...style,
      overflowX: "scroll",
      overflowY: "scroll",
    }),
      ($[12] = style),
      ($[13] = p),
      ($[14] = N),
      ($[15] = X),
      ($[16] = D));
  else D = $[16];
  let T;
  if ($[17] !== stickyScroll)
    ((T = stickyScroll !== void 0 && { stickyScroll: stickyScroll }), ($[17] = stickyScroll), ($[18] = T));
  else T = $[18];
  let B;
  if ($[19] !== followGrowth)
    ((B = followGrowth !== void 0 && { followGrowth: followGrowth }), ($[19] = followGrowth), ($[20] = B));
  else B = $[20];
  let E;
  if ($[21] !== children)
    ((E = e(BaseBox, {
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 0,
      width: "100%",
      children: children,
    })),
      ($[21] = children),
      ($[22] = E));
  else E = $[22];
  let ce;
  if ($[23] !== T || $[24] !== B || $[25] !== E || $[26] !== D)
    ((ce = e("ink-box", { ref: domRef, style: D, ...T, ...B, children: E })),
      ($[23] = T),
      ($[24] = B),
      ($[25] = E),
      ($[26] = D),
      ($[27] = ce));
  else ce = $[27];
  return ce;
}
//@ chunk-01xdq6fy.js:3446-3455 placement
var LI = ScrollBox;

export { LI };
