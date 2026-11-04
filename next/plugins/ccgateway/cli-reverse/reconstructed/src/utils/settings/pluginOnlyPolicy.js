/**
 * utils/settings/pluginOnlyPolicy.ts
 *
 * strictPluginOnlyCustomization：某定制面是否只允许来自插件/托管来源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/pluginOnlyPolicy.ts
 * pieces: chunk-2jdf5m4m.js (3)
 * attribution: facade-exports 2, fingerprint 1
 */
import { getSettingsForSource } from "./settings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2jdf5m4m.js:510-652 facade-exports (2.1.88 match: isRestrictedToPluginOnly, 1)
/**
 * 托管设置 strictPluginOnlyCustomization 是否限制某定制面（skills/agents/hooks 等）只能来自插件或托管。
 */
function isRestrictedToPluginOnly(surface) {
  let policy = getSettingsForSource("policySettings")?.strictPluginOnlyCustomization;
  if (policy === true) return true;
  if (Array.isArray(policy)) return policy.includes(surface);
  return false;
}
//@ chunk-2jdf5m4m.js:652-726 fingerprint (2.1.88 match: ADMIN_TRUSTED_SOURCES, 1)
var ADMIN_TRUSTED_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2jdf5m4m.js:652", () => {
  ADMIN_TRUSTED_SOURCES = new Set(["plugin", "policySettings", "built-in", "builtin", "bundled"]);
});
//@ chunk-2jdf5m4m.js:726-769 facade-exports
function isSourceAdminTrusted(source) {
  return source !== undefined && ADMIN_TRUSTED_SOURCES.has(source);
}
export { isRestrictedToPluginOnly, isSourceAdminTrusted };
