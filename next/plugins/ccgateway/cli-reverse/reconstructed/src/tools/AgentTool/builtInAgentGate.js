/**
 * tools/AgentTool/builtInAgentGate.ts
 *
 * 2.1.316 新增：内置代理的开关判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:134601-134717 placement
class ExplorePlanAgentsGate {
  latched = undefined;
  isEnabled() {
    this.latched ??= !env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS;
    return this.latched;
  }
}
//@ chunk-5xgkngpb.js:134717-134744 placement
var explorePlanAgentsGateSlots; // deferred: uses ExplorePlanAgentsGate of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:134717", () => {
  explorePlanAgentsGateSlots = new HostScoped(() => new ExplorePlanAgentsGate());
});
//@ chunk-5xgkngpb.js:134744-134794 placement
/**
 * 判断 Explore/Plan 内置代理是否启用。
 */
function isExplorePlanAgentsEnabled() {
  return explorePlanAgentsGateSlots.of(getRootSession().host).isEnabled();
}
export { isExplorePlanAgentsEnabled };
