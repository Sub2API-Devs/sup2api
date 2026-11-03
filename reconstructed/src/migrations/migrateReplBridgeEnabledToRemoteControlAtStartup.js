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

/**
 * 迁移：全局配置 replBridgeEnabled → remoteControlAtStartup。
 */
//@ chunk-cjydagjy.js:10767-11037 fingerprint = migrateReplBridgeEnabledToRemoteControlAtStartup (0.628)
function migrateReplBridgeEnabledToRemoteControlAtStartup(e) {
  let r = !1;
  if (
    (saveGlobalConfig((prev) => {
      let replBridgeEnabled = prev.replBridgeEnabled;
      if (replBridgeEnabled === void 0) return prev;
      if (prev.remoteControlAtStartup !== void 0) return prev;
      let next = { ...prev, remoteControlAtStartup: Boolean(replBridgeEnabled) };
      return (delete next.replBridgeEnabled, (r = !0), next);
    }, e),
    r)
  )
    logFeatureOk("migration_repl_bridge_to_remote_control");
}

export { migrateReplBridgeEnabledToRemoteControlAtStartup };
