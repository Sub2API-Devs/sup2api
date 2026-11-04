/**
 * services/policyLimits/coldStartWaiter.ts
 *
 * 2.1.316 新增：策略限制冷启动等待。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3z3sb58b.js (2)
 * attribution: placement 2
 */
import { getCliOwnedState } from "../mcp/cliOwnedClients.js";

//@ chunk-3z3sb58b.js:227-272 placement
/**
 * 记录策略冷启动的等待函数。
 */
function setPolicyColdStartWaiter(policyColdStartWaiter) {
  getCliOwnedState().policyColdStartWaiter = policyColdStartWaiter;
}
//@ chunk-3z3sb58b.js:272-340 placement
/**
 * 若有冷启动等待函数则等待其完成。
 */
async function awaitPolicyColdStartWaiter() {
  let policyColdStartWaiter = getCliOwnedState().policyColdStartWaiter;
  if (policyColdStartWaiter) await policyColdStartWaiter();
}
export { awaitPolicyColdStartWaiter, setPolicyColdStartWaiter };
