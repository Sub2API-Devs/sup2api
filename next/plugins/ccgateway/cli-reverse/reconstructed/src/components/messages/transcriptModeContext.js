/**
 * components/messages/transcriptModeContext.tsx
 *
 * 2.1.316 新增：转录/导出渲染模式上下文
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mkft7ej1.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  createContext,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-mkft7ej1.js:302-306 placement
init_react_production();
//@ chunk-mkft7ej1.js:306-310 placement
init_react_production();
//@ chunk-mkft7ej1.js:310-323 placement
var transcriptModeSignal = createContext(false);
//@ chunk-mkft7ej1.js:323-452 placement
/**
 * 提供"转录/导出渲染模式"上下文（值为 true）。
 */
function TranscriptModeProvider(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let providerElement;
  if ($[0] !== children) {
    providerElement = jsxProd_default(transcriptModeSignal.Provider, {
      value: true,
      children,
    });
    $[0] = children;
    $[1] = providerElement;
  } else providerElement = $[1];
  return providerElement;
}
//@ chunk-mkft7ej1.js:452-480 placement
/**
 * 函数 useTranscriptMode（取 transcript 模式）。
 */
function useTranscriptMode() {
  return useContext(transcriptModeSignal);
}
//@ chunk-mkft7ej1.js:480-533 placement
/**
 * 函数 resolveTranscriptMode（任一来源为真则为真）。
 */
function resolveTranscriptMode(verbose, isTranscriptMode) {
  let override = useContext(transcriptModeSignal);
  return Boolean(verbose || isTranscriptMode || override);
}
export { TranscriptModeProvider, resolveTranscriptMode, useTranscriptMode };
