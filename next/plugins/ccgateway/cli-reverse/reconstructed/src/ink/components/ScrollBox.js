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
import {
  init_react_production,
  useRef,
  useState,
  useImperativeHandle,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { markScrollActivity } from "../../bootstrap/state.js";
import { markDirty, markScrollCommitStart, scheduleRenderFrom } from "../dom.js";
import { clampScrollTop } from "../events/event-handlers.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseBox } from "./Box.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-01xdq6fy.js:460-464 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-01xdq6fy.js:460", () => {
  init_react_production();
});
//@ chunk-01xdq6fy.js:464-492 layout
function increment(count) {
  return count + 1;
}
//@ chunk-01xdq6fy.js:492-3446 fingerprint (2.1.88 match: ScrollBox, 0.89)
/**
 * <ScrollBox>：overflow 为 scroll 的 ink-box（默认作为选区范围 selectionScope），内容放在一列子 Box 中。通过 ref 暴露命令式 API：scrollTo / scrollToElement（锚定到元素，start/center/end/nearest）/ scrollBy（累积到 pendingScrollDelta，由渲染时逐帧排水）/ scrollToBottom（重新开启粘底）、读 scrollTop/高度/视口、isSticky、subscribe、setClampBounds；滚动只标脏并在微任务里触发重绘，不走 React 状态。stickyScroll 让内容增长时自动跟到底，followGrowth=false 关闭位置跟随。
 */
function ScrollBox(props) {
  let $ = useMemoCache(28);
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
  let domRef = useRef(null);
  let [, forceUpdate] = useState(0);
  let subscribers;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    subscribers = new Set();
    $[6] = subscribers;
  } else subscribers = $[6];
  let subscribersRef = useRef(subscribers);
  let renderQueuedRef = useRef(false);
  let notifySubscribers;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    notifySubscribers = () => {
      for (const listener of subscribersRef.current) listener();
    };
    $[7] = notifySubscribers;
  } else notifySubscribers = $[7];
  let notifySubscribers_2 = notifySubscribers;
  let scheduleScrollRender;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    scheduleScrollRender = function scheduleScrollRender(el) {
      markScrollActivity();
      markDirty(el);
      markScrollCommitStart(el);
      notifySubscribers_2();
      if (renderQueuedRef.current) {
        return;
      }
      renderQueuedRef.current = true;
      queueMicrotask(() => {
        renderQueuedRef.current = false;
        scheduleRenderFrom(el);
      });
    };
    $[8] = scheduleScrollRender;
  } else scheduleScrollRender = $[8];
  let requestRender = scheduleScrollRender;
  let handle;
  let handleDeps;
  if ($[9] !== stickyScroll) {
    handle = () => ({
      scrollTo(y, options) {
        let el = domRef.current;
        if (!el) {
          return;
        }
        el.stickyScroll = false;
        if (!options?.preserveHwm) el.scrollHeightHwm = undefined;
        el.pendingScrollDelta = undefined;
        el.scrollAnchor = undefined;
        el.scrollTop = Math.max(0, Math.floor(y));
        requestRender(el);
      },
      scrollToElement(el, offset, options) {
        let offset_2 = offset === undefined ? 0 : offset;
        let box = domRef.current;
        if (!box) {
          return;
        }
        box.stickyScroll = false;
        box.scrollHeightHwm = undefined;
        box.pendingScrollDelta = undefined;
        box.scrollAnchor = {
          el,
          offset: offset_2,
          block: options?.block ?? "start",
        };
        requestRender(box);
      },
      scrollBy(delta) {
        let el = domRef.current;
        if (!el) {
          return;
        }
        el.stickyScroll = false;
        el.scrollHeightHwm = undefined;
        el.scrollTop = clampScrollTop(el);
        el.scrollAnchor = undefined;
        el.pendingScrollDelta = (el.pendingScrollDelta ?? 0) + Math.floor(delta);
        requestRender(el);
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
          requestRender(el);
          return;
        }
        el.stickyScroll = true;
        markDirty(el);
        notifySubscribers_2();
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
    handleDeps = [stickyScroll];
    $[9] = stickyScroll;
    $[10] = handle;
    $[11] = handleDeps;
  } else {
    handle = $[10];
    handleDeps = $[11];
  }
  useImperativeHandle(ref, handle, handleDeps);
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
  let stickyProps;
  if ($[17] !== stickyScroll) {
    stickyProps = stickyScroll !== undefined && {
      stickyScroll,
    };
    $[17] = stickyScroll;
    $[18] = stickyProps;
  } else stickyProps = $[18];
  let followProps;
  if ($[19] !== followGrowth) {
    followProps = followGrowth !== undefined && {
      followGrowth,
    };
    $[19] = followGrowth;
    $[20] = followProps;
  } else followProps = $[20];
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
  let element;
  if ($[23] !== stickyProps || $[24] !== followProps || $[25] !== children_2 || $[26] !== style_2) {
    element = jsxProd_default("ink-box", {
      ref: domRef,
      style: style_2,
      ...stickyProps,
      ...followProps,
      children: children_2,
    });
    $[23] = stickyProps;
    $[24] = followProps;
    $[25] = children_2;
    $[26] = style_2;
    $[27] = element;
  } else element = $[27];
  return element;
}
//@ chunk-01xdq6fy.js:3446-3455 placement
/**
 * 导出值：ScrollBoxDefault（默认 ScrollBox 组件别名）；位于「<ScrollBox>：带滚动偏移的可滚动容器（滚轮、粘底、命令式 scrollTo/scrollBy）」模块。
 */
var ScrollBoxDefault = ScrollBox;
export { ScrollBoxDefault };
