/**
 * context/QueuedMessageContext.tsx
 *
 * 排队消息渲染上下文（isQueued、isFirst、高亮）的 Provider。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/QueuedMessageContext.tsx
 * pieces: chunk-04ybzhw5.js (6), chunk-s3t86t3k.js (4)
 * attribution: placement 9, fingerprint 1
 */
import { useAppState } from "../state/AppState.js";
import { resolveEffortLevel } from "../utils/effort.js";
import { init_react_production, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { commandQueueManager } from "../utils/messageQueueManager.js";

//@ chunk-04ybzhw5.js:373-408 placement
/**
 * 函数 useQueuedMessageText（取排队消息文本）；位于「排队消息渲染上下文（isQueued、isFirst、高亮）的 Provider」模块。
 */
function useQueuedMessageText() {
  return useAppState((o) => resolveEffortLevel(o));
}
//@ chunk-04ybzhw5.js:408-412 placement
init_react_production();
//@ chunk-04ybzhw5.js:412-416 placement
init_react_production();
//@ chunk-04ybzhw5.js:416-433 placement
var queuedMessageContext = qt(undefined);
//@ chunk-04ybzhw5.js:433-461 placement
/**
 * 函数 useQueuedMessageContext（取排队消息上下文）；位于「排队消息渲染上下文（isQueued、isFirst、高亮）的 Provider」模块。
 */
function useQueuedMessageContext() {
  return Se(queuedMessageContext);
}
//@ chunk-04ybzhw5.js:461-806 fingerprint = QueuedMessageProvider (0.464)
/**
 * 为排队消息子树提供 {isQueued:true,isFirst,selectionHighlight,noticeSystemLines}。
 */
function QueuedMessageProvider(props) {
  let f = w(7);
  let { isFirst, selectionHighlight, noticeSystemLines, children } = props;
  let a;
  if (f[0] !== isFirst || f[1] !== noticeSystemLines || f[2] !== selectionHighlight) {
    a = {
      isQueued: true,
      isFirst,
      selectionHighlight,
      noticeSystemLines,
    };
    f[0] = isFirst;
    f[1] = noticeSystemLines;
    f[2] = selectionHighlight;
    f[3] = a;
  } else a = f[3];
  let value = a;
  let l;
  if (f[4] !== children || f[5] !== value) {
    l = jsxProd_default(queuedMessageContext.Provider, {
      value,
      children,
    });
    f[4] = children;
    f[5] = value;
    f[6] = l;
  } else l = f[6];
  return l;
}
//@ chunk-s3t86t3k.js:338-342 placement
init_react_production();
//@ chunk-s3t86t3k.js:342-359 placement
var queueContext = qt(undefined);
//@ chunk-s3t86t3k.js:359-512 placement
/**
 * 提供排队消息队列的 Context Provider。
 */
function QueueProvider(props) {
  let c = w(3);
  let { queue, children } = props;
  let o;
  if (c[0] !== children || c[1] !== queue) {
    o = jsxProd_default(queueContext.Provider, {
      value: queue,
      children,
    });
    c[0] = children;
    c[1] = queue;
    c[2] = o;
  } else o = c[2];
  return o;
}
//@ chunk-s3t86t3k.js:512-545 placement
/**
 * 函数 useCommandQueueOrDefault（无上下文时用默认实现）；位于「排队消息渲染上下文（isQueued、isFirst、高亮）的 Provider」模块。
 */
function useCommandQueueOrDefault() {
  return Se(queueContext) ?? commandQueueManager();
}
export {
  useQueuedMessageContext,
  useCommandQueueOrDefault,
  useQueuedMessageText,
  QueuedMessageProvider,
  QueueProvider,
};
