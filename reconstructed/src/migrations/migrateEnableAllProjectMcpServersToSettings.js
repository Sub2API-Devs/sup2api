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
import { blockingLocalSettingsErrors } from "../utils/settings/settingsNotices.js";
import { logForDebugging } from "../utils/debug.js";
import { updateSettingsForSourceWithTransform } from "../utils/settings/settings.js";
import { uniq } from "../utils/collections.js";
import { logEvent } from "../services/analytics/index.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "../utils/log.js";

//@ chunk-cjydagjy.js:5288-7110 fingerprint = migrateEnableAllProjectMcpServersToSettings (0.662)
/**
 * 迁移：项目配置里的 enableAllProjectMcpServers/enabledMcpjsonServers/disabledMcpjsonServers → .claude/settings.local.json；local 设置无效时推迟。
 */
async function migrateEnableAllProjectMcpServersToSettings() {
  let projectConfig = getRawCurrentProjectConfigEntry();
  if (!projectConfig) return;
  let hasLegacyField = (value) => value !== undefined && (!Array.isArray(value) || value.length > 0);
  let hasEnableAll = projectConfig.enableAllProjectMcpServers !== undefined;
  let hasEnabledServers = hasLegacyField(projectConfig.enabledMcpjsonServers);
  let hasDisabledServers = hasLegacyField(projectConfig.disabledMcpjsonServers);
  if (!hasEnableAll && !hasEnabledServers && !hasDisabledServers) return;
  try {
    if (blockingLocalSettingsErrors().length > 0) {
      logForDebugging(
        "migrateEnableAllProjectMcpServersToSettings: deferring \u2014 settings.local.json carries validation errors a write could compound; will retry next startup",
        {
          level: "error",
        },
      );
      return;
    }
    let fieldsToDelete = [];
    if (hasEnableAll) fieldsToDelete.push("enableAllProjectMcpServers");
    if (hasEnabledServers) fieldsToDelete.push("enabledMcpjsonServers");
    if (hasDisabledServers) fieldsToDelete.push("disabledMcpjsonServers");
    let { error } = await updateSettingsForSourceWithTransform(
      "localSettings",
      (current) => {
        let currentSettings = current ?? {};
        let updates = {};
        if (
          hasEnableAll &&
          projectConfig.enableAllProjectMcpServers === true &&
          currentSettings.enableAllProjectMcpServers === undefined
        )
          updates.enableAllProjectMcpServers = true;
        if (hasEnabledServers && Array.isArray(projectConfig.enabledMcpjsonServers)) {
          let enabledMcpjsonServers = currentSettings.enabledMcpjsonServers || [];
          let existingEnabled = new Set(enabledMcpjsonServers);
          if (
            projectConfig.enabledMcpjsonServers.some(
              (enabledMcpjsonServer) => !existingEnabled.has(enabledMcpjsonServer),
            )
          )
            updates.enabledMcpjsonServers = uniq([
              ...enabledMcpjsonServers,
              ...projectConfig.enabledMcpjsonServers,
            ]);
        }
        if (hasDisabledServers && Array.isArray(projectConfig.disabledMcpjsonServers)) {
          let disabledMcpjsonServers = currentSettings.disabledMcpjsonServers || [];
          let existingDisabled = new Set(disabledMcpjsonServers);
          if (projectConfig.disabledMcpjsonServers.some((current) => !existingDisabled.has(current)))
            updates.disabledMcpjsonServers = uniq([
              ...disabledMcpjsonServers,
              ...projectConfig.disabledMcpjsonServers,
            ]);
        }
        return Object.keys(updates).length > 0 ? updates : null;
      },
      {
        legacyRevocation: "skip",
      },
    );
    if (error) {
      logForDebugging(
        `migrateEnableAllProjectMcpServersToSettings: settings write failed (${error.message}); will retry next startup`,
        {
          level: "error",
        },
      );
      return;
    }
    if (fieldsToDelete.length > 0) {
      if (!(await deleteCurrentProjectConfigFields(fieldsToDelete))) {
        logForDebugging(
          "migrateEnableAllProjectMcpServersToSettings: settings copy landed but legacy projectConfig fields could not be removed (unwritable config?); will retry next startup",
          {
            level: "error",
          },
        );
        return;
      }
    }
    logEvent("tengu_migrate_mcp_approval_fields_success", {
      migratedCount: fieldsToDelete.length,
    });
    logFeatureOk("migration_mcp_servers_to_settings");
  } catch (e) {
    logError(e);
    logEvent("tengu_migrate_mcp_approval_fields_error", {});
    logFeatureBad("migration_mcp_servers_to_settings", "migration_mcp_servers_unexpected_error");
  }
}
export { migrateEnableAllProjectMcpServersToSettings };
