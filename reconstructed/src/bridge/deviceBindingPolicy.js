/**
 * bridge/deviceBindingPolicy.ts
 *
 * 2.1.316 新增：设备绑定策略判定（第一方、allow_remote_sessions）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-es7kd72c.js (2)
 * attribution: placement 2
 */
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";

//@ chunk-es7kd72c.js:299-336 placement
function hCe() {
  return getDeviceBindingRefusal() === void 0;
}
/**
 * 设备绑定被拒原因：仅必要流量模式或非第一方 API 时返回 "egress"；组织策略不允许 allow_remote_sessions 时返回 "policy_org"；否则 undefined（允许）。
 */
//@ chunk-es7kd72c.js:336-450 placement
function getDeviceBindingRefusal() {
  if (isEssentialTrafficOnly() || getAPIProvider() !== "firstParty") return "egress";
  return isPolicyAllowed("allow_remote_sessions") ? void 0 : "policy_org";
}

export { getDeviceBindingRefusal, hCe };
