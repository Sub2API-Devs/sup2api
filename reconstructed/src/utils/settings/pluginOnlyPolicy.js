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

/**
 * 托管设置 strictPluginOnlyCustomization 是否限制某定制面（skills/agents/hooks 等）只能来自插件或托管。
 */
//@ chunk-2jdf5m4m.js:510-652 facade-exports = isRestrictedToPluginOnly (1)
function isRestrictedToPluginOnly(surface) {
  let policy = getSettingsForSource("policySettings")?.strictPluginOnlyCustomization;
  if (policy === !0) return !0;
  if (Array.isArray(policy)) return policy.includes(surface);
  return !1;
}
//@ chunk-2jdf5m4m.js:652-726 fingerprint = ADMIN_TRUSTED_SOURCES (1)
var ADMIN_TRUSTED_SOURCES = new Set(["plugin", "policySettings", "built-in", "builtin", "bundled"]);
//@ chunk-2jdf5m4m.js:726-769 facade-exports
function isSourceAdminTrusted(source) {
  return source !== void 0 && ADMIN_TRUSTED_SOURCES.has(source);
}

export { isRestrictedToPluginOnly, isSourceAdminTrusted };
