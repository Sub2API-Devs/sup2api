/**
 * utils/settings/policySnapshot.ts
 *
 * 2.1.316 新增。策略设置快照是否已变化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8nbkhts5.js (2)
 * attribution: placement 2
 */
import { setStartupPolicySnapshot, getStartupPolicySnapshot } from "../../bootstrap/state.js";
import { getSettingsForSource } from "./settings.js";

//@ chunk-8nbkhts5.js:268-326 placement = _temp7 (1)
function capturePolicySnapshot() {
  setStartupPolicySnapshot(structuredClone(getSettingsForSource("policySettings")));
}
/**
 * 策略设置快照是否已变化。
 */
//@ chunk-8nbkhts5.js:326-422 placement
function hasPolicyDiverged() {
  let t = getStartupPolicySnapshot();
  if (t === void 0) return !0;
  return !Bun.deepEquals(t, getSettingsForSource("policySettings"));
}

export { hasPolicyDiverged, capturePolicySnapshot };
