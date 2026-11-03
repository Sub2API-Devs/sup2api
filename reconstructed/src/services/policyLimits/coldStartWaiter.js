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
import { ht } from "../mcp/cliOwnedClients.js";

//@ chunk-3z3sb58b.js:227-272 placement
function N1s(t) {
  ht().policyColdStartWaiter = t;
}
//@ chunk-3z3sb58b.js:272-340 placement
async function kA() {
  let policyColdStartWaiter = ht().policyColdStartWaiter;
  if (policyColdStartWaiter) await policyColdStartWaiter();
}

export { kA, N1s };
