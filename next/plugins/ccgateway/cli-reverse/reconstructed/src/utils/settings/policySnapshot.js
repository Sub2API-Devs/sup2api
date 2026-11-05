/**
 * utils/settings/policySnapshot.ts
 *
 * 2.1.316 新增。策略设置快照是否已变化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7zp4c4xh.js (2)
 * attribution: placement 2
 */
import { setStartupPolicySnapshot, getStartupPolicySnapshot } from "../../bootstrap/state.js";
import { getSettingsForSource } from "./settings.js";

//@ chunk-7zp4c4xh.js:268-326 placement (2.1.88 match: _temp7, 1)
function capturePolicySnapshot() {
  setStartupPolicySnapshot(structuredClone(getSettingsForSource("policySettings")));
}
//@ chunk-7zp4c4xh.js:326-422 placement
/**
 * 策略设置快照是否已变化。
 */
function hasPolicyDiverged() {
  let startupPolicySnapshot = getStartupPolicySnapshot();
  if (startupPolicySnapshot === undefined) return true;
  return !Bun.deepEquals(startupPolicySnapshot, getSettingsForSource("policySettings"));
}
export { capturePolicySnapshot, hasPolicyDiverged };
