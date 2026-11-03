/**
 * migrations/migrateEnableAllProjectMcpServersToSettings.ts
 *
 * 迁移：项目配置里的 MCP 服务器批准字段挪到本地设置（每次启动按项目跑）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/migrations/migrateEnableAllProjectMcpServersToSettings.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { getRawCurrentProjectConfigEntry, deleteCurrentProjectConfigFields } from "../utils/config.js";
import { Cln } from "../utils/settings/settingsNotices.js";
import { logForDebugging } from "../utils/debug.js";
import { updateSettingsForSourceWithTransform } from "../utils/settings/settings.js";
import { uniq } from "../utils/collections.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";

/**
 * 迁移：项目配置里的 enableAllProjectMcpServers/enabledMcpjsonServers/disabledMcpjsonServers → .claude/settings.local.json；local 设置无效时推迟。
 */
//@ chunk-cjydagjy.js:5288-7110 fingerprint = migrateEnableAllProjectMcpServersToSettings (0.662)
async function migrateEnableAllProjectMcpServersToSettings() {
  let projectConfig = getRawCurrentProjectConfigEntry();
  if (!projectConfig) return;
  let r = (y) => y !== void 0 && (!Array.isArray(y) || y.length > 0),
    hasEnableAll = projectConfig.enableAllProjectMcpServers !== void 0,
    s = r(projectConfig.enabledMcpjsonServers),
    S = r(projectConfig.disabledMcpjsonServers);
  if (!hasEnableAll && !s && !S) return;
  try {
    if (Cln().length > 0) {
      logForDebugging(
        "migrateEnableAllProjectMcpServersToSettings: deferring \u2014 settings.local.json carries validation errors a write could compound; will retry next startup",
        { level: "error" },
      );
      return;
    }
    let y = [];
    if (hasEnableAll) y.push("enableAllProjectMcpServers");
    if (s) y.push("enabledMcpjsonServers");
    if (S) y.push("disabledMcpjsonServers");
    let { error: error } = await updateSettingsForSourceWithTransform(
      "localSettings",
      (E) => {
        let A = E ?? {},
          updates = {};
        if (
          hasEnableAll &&
          projectConfig.enableAllProjectMcpServers === !0 &&
          A.enableAllProjectMcpServers === void 0
        )
          updates.enableAllProjectMcpServers = !0;
        if (s && Array.isArray(projectConfig.enabledMcpjsonServers)) {
          let h = A.enabledMcpjsonServers || [],
            k = new Set(h);
          if (
            projectConfig.enabledMcpjsonServers.some((enabledMcpjsonServer) => !k.has(enabledMcpjsonServer))
          )
            updates.enabledMcpjsonServers = uniq([...h, ...projectConfig.enabledMcpjsonServers]);
        }
        if (S && Array.isArray(projectConfig.disabledMcpjsonServers)) {
          let h = A.disabledMcpjsonServers || [],
            k = new Set(h);
          if (projectConfig.disabledMcpjsonServers.some((current) => !k.has(current)))
            updates.disabledMcpjsonServers = uniq([...h, ...projectConfig.disabledMcpjsonServers]);
        }
        return Object.keys(updates).length > 0 ? updates : null;
      },
      { legacyRevocation: "skip" },
    );
    if (error) {
      logForDebugging(
        `migrateEnableAllProjectMcpServersToSettings: settings write failed (${error.message}); will retry next startup`,
        { level: "error" },
      );
      return;
    }
    if (y.length > 0) {
      if (!(await deleteCurrentProjectConfigFields(y))) {
        logForDebugging(
          "migrateEnableAllProjectMcpServersToSettings: settings copy landed but legacy projectConfig fields could not be removed (unwritable config?); will retry next startup",
          { level: "error" },
        );
        return;
      }
    }
    (logEvent("tengu_migrate_mcp_approval_fields_success", { migratedCount: y.length }),
      logFeatureOk("migration_mcp_servers_to_settings"));
  } catch (error) {
    (logError(error),
      logEvent("tengu_migrate_mcp_approval_fields_error", {}),
      logFeatureBad("migration_mcp_servers_to_settings", "migration_mcp_servers_unexpected_error"));
  }
}

export { migrateEnableAllProjectMcpServersToSettings };
