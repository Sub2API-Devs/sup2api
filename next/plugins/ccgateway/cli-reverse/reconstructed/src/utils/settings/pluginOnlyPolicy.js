/**
 * utils/settings/pluginOnlyPolicy.ts
 *
 * strictPluginOnlyCustomization：某定制面是否只允许来自插件/托管来源。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/pluginOnlyPolicy.ts
 * pieces: chunk-ybq8sbnv.js (3)
 * attribution: facade-exports 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSettingsForSource } from "./settings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ybq8sbnv.js:509-651 facade-exports (2.1.88 match: isRestrictedToPluginOnly, 1)
/**
 * 托管设置 strictPluginOnlyCustomization 是否限制某定制面（skills/agents/hooks 等）只能来自插件或托管。
 */
function isRestrictedToPluginOnly(surface) {
  let policy = getSettingsForSource("policySettings")?.strictPluginOnlyCustomization;
  if (policy === true) return true;
  if (Array.isArray(policy)) return policy.includes(surface);
  return false;
}
//@ chunk-ybq8sbnv.js:651-725 fingerprint (2.1.88 match: ADMIN_TRUSTED_SOURCES, 1)
var ADMIN_TRUSTED_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ybq8sbnv.js:651", () => {
  ADMIN_TRUSTED_SOURCES = new Set(["plugin", "policySettings", "built-in", "builtin", "bundled"]);
});
//@ chunk-ybq8sbnv.js:725-768 facade-exports
function isSourceAdminTrusted(source) {
  return source !== undefined && ADMIN_TRUSTED_SOURCES.has(source);
}
export { isRestrictedToPluginOnly, isSourceAdminTrusted };
