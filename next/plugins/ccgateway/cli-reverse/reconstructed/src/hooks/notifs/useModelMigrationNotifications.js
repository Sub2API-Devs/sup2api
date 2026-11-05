/**
 * hooks/notifs/useModelMigrationNotifications.tsx
 *
 * 模型迁移通知列表（MIGRATIONS）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useModelMigrationNotifications.tsx
 * pieces: chunk-hnxhr3bs.js (1)
 * attribution: fingerprint 1
 */
import { getMainLoopModelOverride } from "../../bootstrap/state.js";
import { getGlobalConfig } from "../../utils/config.js";

//@ chunk-hnxhr3bs.js:69733-69996 fingerprint (2.1.88 match: MIGRATIONS, 0.54)
function MIGRATIONS() {
  if (getMainLoopModelOverride() !== undefined) return false;
  let globalConfig = getGlobalConfig();
  let timestamps = [
    globalConfig.sonnet45To46MigrationTimestamp,
    globalConfig.fable5ToFableAliasMigrationTimestamp,
    globalConfig.legacyOpusMigrationTimestamp,
    globalConfig.opusProMigrationTimestamp,
  ];
  let startupAt = Date.now() - process.uptime() * 1000;
  return timestamps.some((timestamp) => timestamp !== undefined && timestamp >= startupAt - 3000);
}
export { MIGRATIONS };
