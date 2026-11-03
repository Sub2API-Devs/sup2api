/**
 * components/ManagedSettingsNotice.ts
 *
 * 2.1.316 新增：托管设置提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s4skx7fa.js (2)
 * attribution: placement 2
 */
import {
  getRemoteSettingsOrgUuid,
  computeRemoteSettingsEligibility,
} from "../services/cloudSessions/eligibility.js";

/**
 * 组织托管设置的提示文案（由 IT 管理员集中管理）。
 */
//@ chunk-s4skx7fa.js:231-369 placement
var MANAGED_SETTINGS_NOTICE =
  "Your organization may apply global configuration to Claude Code. These settings are centrally managed by your IT administrator.";
//@ chunk-s4skx7fa.js:369-400 placement
function eZ() {
  return getRemoteSettingsOrgUuid(computeRemoteSettingsEligibility());
}

export { eZ, MANAGED_SETTINGS_NOTICE };
