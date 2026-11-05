/**
 * services/policyLimits/coldStartWaiter.ts
 *
 * 2.1.316 新增：策略限制冷启动等待。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rmxjvkzd.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getCliOwnedState } from "../mcp/cliOwnedClients.js";

//@ chunk-rmxjvkzd.js:227-272 placement
/**
 * 记录策略冷启动的等待函数。
 */
function setPolicyColdStartWaiter(policyColdStartWaiter) {
  getCliOwnedState().policyColdStartWaiter = policyColdStartWaiter;
}
//@ chunk-rmxjvkzd.js:272-340 placement
/**
 * 若有冷启动等待函数则等待其完成。
 */
async function awaitPolicyColdStartWaiter() {
  let policyColdStartWaiter = getCliOwnedState().policyColdStartWaiter;
  if (policyColdStartWaiter) await policyColdStartWaiter();
}
export { setPolicyColdStartWaiter, awaitPolicyColdStartWaiter };
