/**
 * hooks/useForceRender.ts
 *
 * 2.1.316 新增：返回一个强制重渲染计数器的 hook；订阅强制更新后执行渲染函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-byj4f9x7.js (3)
 * attribution: placement 3
 */
import { init_react_production, Uy, P } from "../../vendor/react/cjs/react.production.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";

//@ chunk-byj4f9x7.js:267-271 placement
init_react_production();
//@ chunk-byj4f9x7.js:271-334 placement
/**
 * 返回一个强制重渲染计数器的 hook。
 */
function useForceRender() {
  let [o, r] = Uy((e) => e + 1, 0);
  P(() => onGrowthBookRefresh(r), []);
  return o;
}
//@ chunk-byj4f9x7.js:334-365 placement
/**
 * 订阅强制更新后执行渲染函数。
 */
function renderWithForceUpdate(o) {
  useForceRender();
  return o();
}
export { renderWithForceUpdate, useForceRender };
