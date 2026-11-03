/**
 * hooks/notifs/useModelMigrationNotifications.tsx
 *
 * 模型迁移通知列表（MIGRATIONS）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useModelMigrationNotifications.tsx
 * pieces: chunk-ag5x7vhf.js (1)
 * attribution: fingerprint 1
 */
import { getMainLoopModelOverride } from "../../bootstrap/state.js";
import { getGlobalConfig } from "../../utils/config.js";

//@ chunk-ag5x7vhf.js:70176-70439 fingerprint = MIGRATIONS (0.54)
function MIGRATIONS() {
  if (getMainLoopModelOverride() !== undefined) return false;
  let globalConfig = getGlobalConfig();
  let h = [
    globalConfig.sonnet45To46MigrationTimestamp,
    globalConfig.fable5ToFableAliasMigrationTimestamp,
    globalConfig.legacyOpusMigrationTimestamp,
    globalConfig.opusProMigrationTimestamp,
  ];
  let x = Date.now() - process.uptime() * 1000;
  return h.some((T) => T !== undefined && T >= x - 3000);
}
export { MIGRATIONS };
