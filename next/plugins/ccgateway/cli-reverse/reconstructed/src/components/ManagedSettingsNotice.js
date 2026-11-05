/**
 * components/ManagedSettingsNotice.ts
 *
 * 2.1.316 新增：托管设置提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dnyjne07.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  getRemoteSettingsOrgUuid,
  computeRemoteSettingsEligibility,
} from "../services/cloudSessions/eligibility.js";

//@ chunk-dnyjne07.js:231-369 placement
/**
 * 组织托管设置的提示文案（由 IT 管理员集中管理）。
 */
var MANAGED_SETTINGS_NOTICE =
  "Your organization may apply global configuration to Claude Code. These settings are centrally managed by your IT administrator.";
//@ chunk-dnyjne07.js:369-401 placement
/**
 * 函数 managedSettingsUrl（托管设置提示链接）。
 */
function managedSettingsUrl() {
  return getRemoteSettingsOrgUuid(computeRemoteSettingsEligibility());
}
export { managedSettingsUrl, MANAGED_SETTINGS_NOTICE };
