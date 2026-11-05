/**
 * migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts
 *
 * 迁移：replBridgeEnabled 改为 remoteControlAtStartup
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts
 * pieces: chunk-h61dq9nz.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { saveGlobalConfig } from "../utils/config.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-h61dq9nz.js:10944-11214 fingerprint (2.1.88 match: migrateReplBridgeEnabledToRemoteControlAtStartup, 0.626)
/**
 * 迁移：全局配置 replBridgeEnabled → remoteControlAtStartup。
 */
function migrateReplBridgeEnabledToRemoteControlAtStartup(context) {
  let migrated = false;
  saveGlobalConfig((prev) => {
    let oldValue = prev.replBridgeEnabled;
    if (oldValue === undefined) return prev;
    if (prev.remoteControlAtStartup !== undefined) return prev;
    let next = {
      ...prev,
      remoteControlAtStartup: Boolean(oldValue),
    };
    delete next.replBridgeEnabled;
    migrated = true;
    return next;
  }, context);
  if (migrated) logFeatureOk("migration_repl_bridge_to_remote_control");
}
export { migrateReplBridgeEnabledToRemoteControlAtStartup };
