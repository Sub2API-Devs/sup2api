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
import { j, Uy, P } from "../../vendor/react/cjs/react.production.js";
import { onGrowthBookRefresh } from "../services/analytics/growthbook.js";

//@ chunk-byj4f9x7.js:267-271 placement
j();
/**
 * 返回一个强制重渲染计数器的 hook。
 */
//@ chunk-byj4f9x7.js:271-334 placement
function useForceRender() {
  let [o, r] = Uy((e) => e + 1, 0);
  return (P(() => onGrowthBookRefresh(r), []), o);
}
/**
 * 订阅强制更新后执行渲染函数。
 */
//@ chunk-byj4f9x7.js:334-365 placement
function renderWithForceUpdate(o) {
  return (useForceRender(), o());
}

export { renderWithForceUpdate, useForceRender };
