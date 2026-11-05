/**
 * context/QueuedMessageContext.tsx
 *
 * 排队消息渲染上下文（isQueued、isFirst、高亮）的 Provider。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/QueuedMessageContext.tsx
 * pieces: chunk-9j5p8sjh.js (6), chunk-cj5by3ed.js (4)
 * attribution: placement 9, fingerprint 1
 */
import { init_react_production, createContext, useContext } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getProcessQueue } from "../utils/messageQueueManager.js";
import { useAppState } from "../state/AppState.js";
import { resolveEffortLevel } from "../utils/effort.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-cj5by3ed.js:338-342 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cj5by3ed.js:338", () => {
  init_react_production();
});
//@ chunk-cj5by3ed.js:342-359 placement
var queueContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cj5by3ed.js:342", () => {
  queueContext = createContext(undefined);
});
//@ chunk-cj5by3ed.js:359-512 placement
/**
 * 提供排队消息队列的 Context Provider。
 */
function QueueProvider(props) {
  let $ = useMemoCache(3);
  let { queue, children } = props;
  let providerElement;
  if ($[0] !== children || $[1] !== queue) {
    providerElement = jsxProd_default(queueContext.Provider, {
      value: queue,
      children,
    });
    $[0] = children;
    $[1] = queue;
    $[2] = providerElement;
  } else providerElement = $[2];
  return providerElement;
}
//@ chunk-cj5by3ed.js:512-545 placement
/**
 * 函数 useCommandQueueOrDefault（无上下文时用默认实现）；位于「排队消息渲染上下文（isQueued、isFirst、高亮）的 Provider」模块。
 */
function useCommandQueueOrDefault() {
  return useContext(queueContext) ?? getProcessQueue();
}
//@ chunk-9j5p8sjh.js:373-408 placement
/**
 * 函数 useQueuedMessageText（取排队消息文本）；位于「排队消息渲染上下文（isQueued、isFirst、高亮）的 Provider」模块。
 */
function useQueuedMessageText() {
  return useAppState((appState) => resolveEffortLevel(appState));
}
//@ chunk-9j5p8sjh.js:408-412 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9j5p8sjh.js:408", () => {
  init_react_production();
});
//@ chunk-9j5p8sjh.js:412-416 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9j5p8sjh.js:412", () => {
  init_react_production();
});
//@ chunk-9j5p8sjh.js:416-433 placement
var queuedMessageContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9j5p8sjh.js:416", () => {
  queuedMessageContext = createContext(undefined);
});
//@ chunk-9j5p8sjh.js:433-461 placement
/**
 * 函数 useQueuedMessageContext（取排队消息上下文）；位于「排队消息渲染上下文（isQueued、isFirst、高亮）的 Provider」模块。
 */
function useQueuedMessageContext() {
  return useContext(queuedMessageContext);
}
//@ chunk-9j5p8sjh.js:461-806 fingerprint (2.1.88 match: QueuedMessageProvider, 0.463)
/**
 * 为排队消息子树提供 {isQueued:true,isFirst,selectionHighlight,noticeSystemLines}。
 */
function QueuedMessageProvider(props) {
  let $ = useMemoCache(7);
  let { isFirst, selectionHighlight, noticeSystemLines, children } = props;
  let contextValue;
  if ($[0] !== isFirst || $[1] !== noticeSystemLines || $[2] !== selectionHighlight) {
    contextValue = {
      isQueued: true,
      isFirst,
      selectionHighlight,
      noticeSystemLines,
    };
    $[0] = isFirst;
    $[1] = noticeSystemLines;
    $[2] = selectionHighlight;
    $[3] = contextValue;
  } else contextValue = $[3];
  let value = contextValue;
  let providerElement;
  if ($[4] !== children || $[5] !== value) {
    providerElement = jsxProd_default(queuedMessageContext.Provider, {
      value,
      children,
    });
    $[4] = children;
    $[5] = value;
    $[6] = providerElement;
  } else providerElement = $[6];
  return providerElement;
}
export {
  useQueuedMessageText,
  useCommandQueueOrDefault,
  QueuedMessageProvider,
  useQueuedMessageContext,
  QueueProvider,
};
