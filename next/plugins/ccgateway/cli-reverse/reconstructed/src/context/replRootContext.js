/**
 * context/replRootContext.ts
 *
 * REPL 根上下文（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mn2mc025.js (4)
 * attribution: placement 4
 */
import { init_react_production, createContext } from "../../vendor/react/cjs/react.production.js";

//@ chunk-mn2mc025.js:229-233 placement
init_react_production();
//@ chunk-mn2mc025.js:233-244 placement
var rootSessionOverride = null;
//@ chunk-mn2mc025.js:244-268 placement
/**
 * 函数 getRootSessionOverride（取覆盖值）；位于「REPL 根上下文（2.1.316 新增）」模块。
 */
function getRootSessionOverride() {
  return rootSessionOverride;
}
//@ chunk-mn2mc025.js:268-285 placement
/**
 * 导出值：rootSessionSlot（根会话槽）；位于「REPL 根上下文（2.1.316 新增）」模块。
 */
var rootSessionSlot = createContext(null);
export { rootSessionSlot, getRootSessionOverride };
