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
import { init_react_production, R, y, vxe } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { markScrollActivity } from "../../bootstrap/state.js";
import { markDirty, markScrollCommitStart, scheduleRenderFrom } from "../dom.js";
import { clampScrollTop } from "../events/event-handlers.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";

//@ chunk-01xdq6fy.js:460-464 placement
init_react_production();
//@ chunk-01xdq6fy.js:464-492 layout
function increment(De) {
  return De + 1;
}
//@ chunk-01xdq6fy.js:492-3446 fingerprint = ScrollBox (0.89)
/**
 * <ScrollBox>：overflow 为 scroll 的 ink-box（默认作为选区范围 selectionScope），内容放在一列子 Box 中。通过 ref 暴露命令式 API：scrollTo / scrollToElement（锚定到元素，start/center/end/nearest）/ scrollBy（累积到 pendingScrollDelta，由渲染时逐帧排水）/ scrollToBottom（重新开启粘底）、读 scrollTop/高度/视口、isSticky、subscribe、setClampBounds；滚动只标脏并在微任务里触发重绘，不走 React 状态。stickyScroll 让内容增长时自动跟到底，followGrowth=false 关闭位置跟随。
 */
function ScrollBox(props) {
  let $ = w(28);
  let children;
  let followGrowth;
  let ref;
  let stickyScroll;
  let style;
  if ($[0] !== props) {
    ({ children, ref, stickyScroll, followGrowth, ...style } = props);
    $[0] = props;
    $[1] = children;
    $[2] = followGrowth;
    $[3] = ref;
    $[4] = stickyScroll;
    $[5] = style;
  } else {
    children = $[1];
    followGrowth = $[2];
    ref = $[3];
    stickyScroll = $[4];
    style = $[5];
  }
  let domRef = R(null);
  let [, forceUpdate] = y(0);
  let U;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    U = new Set();
    $[6] = U;
  } else U = $[6];
  let subscribersRef = R(U);
  let renderQueuedRef = R(false);
  let Z;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    Z = () => {
      for (const be of subscribersRef.current) be();
    };
    $[7] = Z;
  } else Z = $[7];
  let notifySubscribers = Z;
  let ee;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    ee = function scheduleScrollRender(el) {
      markScrollActivity();
      markDirty(el);
      markScrollCommitStart(el);
      notifySubscribers();
      if (renderQueuedRef.current) {
        return;
      }
      renderQueuedRef.current = true;
      queueMicrotask(() => {
        renderQueuedRef.current = false;
        scheduleRenderFrom(el);
      });
    };
    $[8] = ee;
  } else ee = $[8];
  let b = ee;
  let le;
  let re;
  if ($[9] !== stickyScroll) {
    le = () => ({
      scrollTo(y, Re) {
        let el = domRef.current;
        if (!el) {
          return;
        }
        el.stickyScroll = false;
        if (!Re?.preserveHwm) el.scrollHeightHwm = undefined;
        el.pendingScrollDelta = undefined;
        el.scrollAnchor = undefined;
        el.scrollTop = Math.max(0, Math.floor(y));
        b(el);
      },
      scrollToElement(el, p, He) {
        let offset = p === undefined ? 0 : p;
        let box = domRef.current;
        if (!box) {
          return;
        }
        box.stickyScroll = false;
        box.scrollHeightHwm = undefined;
        box.pendingScrollDelta = undefined;
        box.scrollAnchor = {
          el,
          offset,
          block: He?.block ?? "start",
        };
        b(box);
      },
      scrollBy(Me) {
        let el = domRef.current;
        if (!el) {
          return;
        }
        el.stickyScroll = false;
        el.scrollHeightHwm = undefined;
        el.scrollTop = clampScrollTop(el);
        el.scrollAnchor = undefined;
        el.pendingScrollDelta = (el.pendingScrollDelta ?? 0) + Math.floor(Me);
        b(el);
      },
      scrollToBottom() {
        let el = domRef.current;
        if (!el) {
          return;
        }
        el.pendingScrollDelta = undefined;
        if (stickyScroll === false) {
          el.scrollAnchor = undefined;
          el.scrollTop = Math.max(0, (el.scrollHeight ?? 0) - (el.scrollViewportHeight ?? 0));
          b(el);
          return;
        }
        el.stickyScroll = true;
        markDirty(el);
        notifySubscribers();
        forceUpdate(increment);
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
          return false;
        }
        return el.stickyScroll ?? Boolean(el.attributes.stickyScroll);
      },
      subscribe(listener) {
        subscribersRef.current.add(listener);
        return () => subscribersRef.current.delete(listener);
      },
      setClampBounds(min, max) {
        let el = domRef.current;
        if (!el) {
          return;
        }
        if (el.scrollClampMin === min && el.scrollClampMax === max) {
          return;
        }
        el.scrollClampMin = min;
        el.scrollClampMax = max;
        markDirty(el);
      },
      getDomElement() {
        return domRef.current;
      },
    });
    re = [stickyScroll];
    $[9] = stickyScroll;
    $[10] = le;
    $[11] = re;
  } else {
    le = $[10];
    re = $[11];
  }
  vxe(ref, le, re);
  const flexDirection = style.flexDirection ?? "row";
  const flexGrow = style.flexGrow ?? 0;
  const flexShrink = style.flexShrink ?? 1;
  let style_2;
  if ($[12] !== style || $[13] !== flexDirection || $[14] !== flexGrow || $[15] !== flexShrink) {
    style_2 = {
      flexWrap: "nowrap",
      flexDirection,
      flexGrow,
      flexShrink,
      selectionScope: true,
      ...style,
      overflowX: "scroll",
      overflowY: "scroll",
    };
    $[12] = style;
    $[13] = flexDirection;
    $[14] = flexGrow;
    $[15] = flexShrink;
    $[16] = style_2;
  } else style_2 = $[16];
  let T;
  if ($[17] !== stickyScroll) {
    T = stickyScroll !== undefined && {
      stickyScroll,
    };
    $[17] = stickyScroll;
    $[18] = T;
  } else T = $[18];
  let B;
  if ($[19] !== followGrowth) {
    B = followGrowth !== undefined && {
      followGrowth,
    };
    $[19] = followGrowth;
    $[20] = B;
  } else B = $[20];
  let children_2;
  if ($[21] !== children) {
    children_2 = jsxProd_default(BaseBox, {
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 0,
      width: "100%",
      children,
    });
    $[21] = children;
    $[22] = children_2;
  } else children_2 = $[22];
  let ce;
  if ($[23] !== T || $[24] !== B || $[25] !== children_2 || $[26] !== style_2) {
    ce = jsxProd_default("ink-box", {
      ref: domRef,
      style: style_2,
      ...T,
      ...B,
      children: children_2,
    });
    $[23] = T;
    $[24] = B;
    $[25] = children_2;
    $[26] = style_2;
    $[27] = ce;
  } else ce = $[27];
  return ce;
}
//@ chunk-01xdq6fy.js:3446-3455 placement
/**
 * 导出值：ScrollBoxDefault（默认 ScrollBox 组件别名）；位于「<ScrollBox>：带滚动偏移的可滚动容器（滚轮、粘底、命令式 scrollTo/scrollBy）」模块。
 */
var ScrollBoxDefault = ScrollBox;
export { ScrollBoxDefault };
