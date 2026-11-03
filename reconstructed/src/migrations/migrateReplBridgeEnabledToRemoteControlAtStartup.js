/**
 * migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts
 *
 * 迁移：replBridgeEnabled 改为 remoteControlAtStartup
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { saveGlobalConfig } from "../utils/config.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-cjydagjy.js:10767-11037 fingerprint = migrateReplBridgeEnabledToRemoteControlAtStartup (0.628)
/**
 * 迁移：全局配置 replBridgeEnabled → remoteControlAtStartup。
 */
function migrateReplBridgeEnabledToRemoteControlAtStartup(e) {
  let r = false;
  saveGlobalConfig((prev) => {
    let oldValue = prev.replBridgeEnabled;
    if (oldValue === undefined) return prev;
    if (prev.remoteControlAtStartup !== undefined) return prev;
    let next = {
      ...prev,
      remoteControlAtStartup: Boolean(oldValue),
    };
    delete next.replBridgeEnabled;
    r = true;
    return next;
  }, e);
  if (r) logFeatureOk("migration_repl_bridge_to_remote_control");
}
export { migrateReplBridgeEnabledToRemoteControlAtStartup };
