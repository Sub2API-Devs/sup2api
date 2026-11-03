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
import { j, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { mg } from "../utils/messageQueueManager.js";

//@ chunk-04ybzhw5.js:373-408 placement
function dg() {
  return useAppState((o) => resolveEffortLevel(o));
}
//@ chunk-04ybzhw5.js:408-412 placement
j();
//@ chunk-04ybzhw5.js:412-416 placement
j();
//@ chunk-04ybzhw5.js:416-433 placement
var t = qt(void 0);
//@ chunk-04ybzhw5.js:433-461 placement
function Imt() {
  return Se(t);
}
/**
 * 为排队消息子树提供 {isQueued:true,isFirst,selectionHighlight,noticeSystemLines}。
 */
//@ chunk-04ybzhw5.js:461-806 fingerprint = QueuedMessageProvider (0.464)
function QueuedMessageProvider(t0) {
  let f = w(7),
    {
      isFirst: isFirst,
      selectionHighlight: selectionHighlight,
      noticeSystemLines: noticeSystemLines,
      children: children,
    } = t0,
    a;
  if (f[0] !== isFirst || f[1] !== noticeSystemLines || f[2] !== selectionHighlight)
    ((a = {
      isQueued: !0,
      isFirst: isFirst,
      selectionHighlight: selectionHighlight,
      noticeSystemLines: noticeSystemLines,
    }),
      (f[0] = isFirst),
      (f[1] = noticeSystemLines),
      (f[2] = selectionHighlight),
      (f[3] = a));
  else a = f[3];
  let value = a,
    l;
  if (f[4] !== children || f[5] !== value)
    ((l = e(t.Provider, { value: value, children: children })),
      (f[4] = children),
      (f[5] = value),
      (f[6] = l));
  else l = f[6];
  return l;
}
//@ chunk-s3t86t3k.js:338-342 placement
j();
//@ chunk-s3t86t3k.js:342-359 placement
var u = qt(void 0);
/**
 * 提供排队消息队列的 Context Provider。
 */
//@ chunk-s3t86t3k.js:359-512 placement
function QueueProvider(d) {
  let c = w(3),
    { queue: queue, children: children } = d,
    o;
  if (c[0] !== children || c[1] !== queue)
    ((o = e(u.Provider, { value: queue, children: children })),
      (c[0] = children),
      (c[1] = queue),
      (c[2] = o));
  else o = c[2];
  return o;
}
//@ chunk-s3t86t3k.js:512-545 placement
function Nu() {
  return Se(u) ?? mg();
}

export { Imt, Nu, QueuedMessageProvider, QueueProvider, dg };
