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
import { init_react_production, qt, Se } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-mmq58n27.js:302-306 placement
init_react_production();
//@ chunk-mmq58n27.js:306-310 placement
init_react_production();
//@ chunk-mmq58n27.js:310-323 placement
var transcriptModeSignal = qt(false);
//@ chunk-mmq58n27.js:323-452 placement
/**
 * 提供"转录/导出渲染模式"上下文（值为 true）。
 */
function TranscriptModeProvider(props) {
  let t = w(2);
  let { children } = props;
  let a;
  if (t[0] !== children) {
    a = jsxProd_default(transcriptModeSignal.Provider, {
      value: true,
      children,
    });
    t[0] = children;
    t[1] = a;
  } else a = t[1];
  return a;
}
//@ chunk-mmq58n27.js:452-480 placement
/**
 * 函数 useTranscriptMode（取 transcript 模式）。
 */
function useTranscriptMode() {
  return Se(transcriptModeSignal);
}
//@ chunk-mmq58n27.js:480-533 placement
/**
 * 函数 resolveTranscriptMode（任一来源为真则为真）。
 */
function resolveTranscriptMode(verbose, isTranscriptMode) {
  let t = Se(transcriptModeSignal);
  return Boolean(verbose || isTranscriptMode || t);
}
export { useTranscriptMode, resolveTranscriptMode, TranscriptModeProvider };
