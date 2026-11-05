/**
 * hooks/useForceRender.ts
 *
 * 2.1.316 新增：返回一个强制重渲染计数器的 hook；订阅强制更新后执行渲染函数。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-40tjhgg3.js (3)
 * attribution: placement 3
 */
import { init_react_production, useReducer, useEffect } from "../../vendor/react/cjs/react.production.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-40tjhgg3.js:267-271 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-40tjhgg3.js:267", () => {
  init_react_production();
});
//@ chunk-40tjhgg3.js:271-334 placement
/**
 * 返回一个强制重渲染计数器的 hook。
 */
function useForceRender() {
  let [renderCount, bumpRenderCount] = useReducer((count) => count + 1, 0);
  useEffect(() => onGrowthBookRefresh(bumpRenderCount), []);
  return renderCount;
}
//@ chunk-40tjhgg3.js:334-365 placement
/**
 * 订阅强制更新后执行渲染函数。
 */
function renderWithForceUpdate(render) {
  useForceRender();
  return render();
}
export { useForceRender, renderWithForceUpdate };
