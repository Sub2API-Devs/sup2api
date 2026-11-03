/**
 * components/messages/transcriptModeContext.tsx
 *
 * 2.1.316 新增：转录/导出渲染模式上下文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mmq58n27.js (6)
 * attribution: placement 6
 */
import { j, qt, Se } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-mmq58n27.js:302-306 placement
j();
//@ chunk-mmq58n27.js:306-310 placement
j();
//@ chunk-mmq58n27.js:310-323 placement
var o = qt(!1);
/**
 * 提供"转录/导出渲染模式"上下文（值为 true）。
 */
//@ chunk-mmq58n27.js:323-452 placement
function TranscriptModeProvider(n) {
  let t = w(2),
    { children: children } = n,
    a;
  if (t[0] !== children)
    ((a = e(o.Provider, { value: !0, children: children })), (t[0] = children), (t[1] = a));
  else a = t[1];
  return a;
}
//@ chunk-mmq58n27.js:452-480 placement
function i0t() {
  return Se(o);
}
//@ chunk-mmq58n27.js:480-533 placement
function Wj(n, r) {
  let t = Se(o);
  return Boolean(n || r || t);
}

export { i0t, Wj, TranscriptModeProvider };
