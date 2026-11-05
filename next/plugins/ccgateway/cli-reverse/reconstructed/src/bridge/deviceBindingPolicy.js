/**
 * bridge/deviceBindingPolicy.ts
 *
 * 2.1.316 新增：设备绑定策略判定（第一方、allow_remote_sessions）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fn43g7wg.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";

//@ chunk-fn43g7wg.js:299-336 placement
/**
 * 设备绑定是否允许：getDeviceBindingRefusal() 为 undefined 即为允许（仅必要流量/非第一方为 egress，组织策略为 policy_org）。
 */
function isDeviceBindingAllowed() {
  return getDeviceBindingRefusal() === undefined;
}
//@ chunk-fn43g7wg.js:336-450 placement
/**
 * 设备绑定被拒原因：仅必要流量模式或非第一方 API 时返回 "egress"；组织策略不允许 allow_remote_sessions 时返回 "policy_org"；否则 undefined（允许）。
 */
function getDeviceBindingRefusal() {
  if (isEssentialTrafficOnly() || getAPIProvider() !== "firstParty") return "egress";
  return isPolicyAllowed("allow_remote_sessions") ? undefined : "policy_org";
}
export { getDeviceBindingRefusal, isDeviceBindingAllowed };
