/**
 * commands/skill-doctor/skillDoctor.ts
 *
 * 2.1.316 新增：/skill-doctor：统计技能上下文占用与使用量并生成整理建议
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bsb3cv9t.js (6)
 * attribution: placement 6
 */
import { bunStringWidth } from "../../ink/stringWidth.js";
import { formatTokenEstimate, formatTokens } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { computeDisusedPlugins } from "../../services/tips/pluginDisuseTip.js";
import {
  isSkillDoctorScanAllowed,
  aggregateRecentUsage,
} from "../../services/usageInsights/transcriptScan.js";
import { mergedSkillListing, skillListingTokenCounts } from "../../tools/SkillTool/prompt.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { dropShadowedFallbackSkills, getBareCommandName } from "../../commands.js";
import { isFallbackSkill, bareSkillName } from "../../utils/commandPredicates.js";
import { recordSkillUsage } from "../../utils/suggestions/skillUsageTracking.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { isSyncedMarketplacePlugin } from "../../utils/permissions/permissionRulePayload.js";
import { CLAUDE_AI_SYNC_LABEL } from "../../utils/settings/commandSyncNames.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";

//@ chunk-bsb3cv9t.js:690-749 placement
function padEndToWidth(text, width) {
  return text + " ".repeat(Math.max(0, width - bunStringWidth(text)));
}
//@ chunk-bsb3cv9t.js:749-806 placement
function padStartToWidth(text, width) {
  return " ".repeat(Math.max(0, width - bunStringWidth(text))) + text;
}
//@ chunk-bsb3cv9t.js:806-1322 placement
function formatSkillUsageTable(rows) {
  let mapped = rows.map((row) => ({
    context: row.listingTokens === null ? "-" : formatTokenEstimate(row.listingTokens),
    week: row.weekTokens === null ? "-" : formatTokens(row.weekTokens),
    lastUsed:
      row.daysSinceUse === null
        ? "never"
        : row.daysSinceUse === 0
          ? "today"
          : `${row.daysSinceUse} ${plural(row.daysSinceUse, "day")}`,
  }));
  return {
    cells: mapped,
    widths: {
      name: Math.max(5, ...rows.map((row) => bunStringWidth(row.name))),
      source: Math.max(6, ...rows.map((row) => bunStringWidth(row.source))),
      context: Math.max(7, ...mapped.map((cell) => bunStringWidth(cell.context))),
      week: Math.max(9, ...mapped.map((cell) => bunStringWidth(cell.week))),
      uses: Math.max(4, ...rows.map((row) => bunStringWidth(String(row.usageCount)))),
    },
  };
}
//@ chunk-bsb3cv9t.js:1322-1450 placement
class SkillDoctorStageError extends Error {
  featureErrorCode;
  constructor(featureErrorCode, cause) {
    super("skill-doctor stage failed", {
      cause,
    });
    this.featureErrorCode = featureErrorCode;
  }
}
//@ chunk-bsb3cv9t.js:1450-1668 placement
function buildSkillDoctorContext(context) {
  return {
    commands: context.options.commands,
    mcpCommands: context.getMcp().commands,
    mcpClients: context.getMcp().clients,
    agentId: context.agentId,
    mainLoopModel: context.options.mainLoopModel,
    permissionMode: getToolPermissionContext(context).mode,
    storageV5: context.storageV5,
  };
}
//@ chunk-bsb3cv9t.js:1668-4052 placement
/**
 * /skill-doctor：扫描已装技能的上下文占用、近一周使用量与最后使用时间，生成整理建议。
 */
async function runSkillDoctor(options) {
  let disusedPlugins = computeDisusedPlugins();
  disusedPlugins.catch(() => {});
  let scanAllowed = isSkillDoctorScanAllowed();
  let recentUsage = scanAllowed.allowed
    ? aggregateRecentUsage(options.storageV5).catch((error) => {
        throw new SkillDoctorStageError("scan_failed", error);
      })
    : Promise.resolve(new Map());
  recentUsage.catch(() => {});
  let { included } = await mergedSkillListing(options.mcpCommands, options.agentId, options.storageV5).catch(
    (error) => {
      throw new SkillDoctorStageError("skill_set_failed", error);
    },
  );
  let countModel = getRuntimeMainLoopModel({
    permissionMode: options.permissionMode,
    mainLoopModel: options.mainLoopModel,
  });
  let listingTokens = skillListingTokenCounts(included, countModel, options.mainLoopModel);
  let usageBySkill = await recentUsage;
  let rows = [];
  let commands = dropShadowedFallbackSkills([...options.commands]);
  let commandNames = new Set(commands.map((command) => command.name));
  let fallbackOnlyNames = new Set(
    options.commands
      .filter((command) => isFallbackSkill(command) && !commandNames.has(command.name))
      .map((command) => command.name),
  );
  let pluginPrefixCounts = new Map();
  for (let command of commands) {
    let colonIndex =
      command.type === "prompt" && command.loadedFrom !== "syncedSkills" ? command.name.lastIndexOf(":") : -1;
    if (colonIndex > 0) {
      let sliced = command.name.slice(colonIndex + 1);
      pluginPrefixCounts.set(sliced, (pluginPrefixCounts.get(sliced) ?? 0) + 1);
    }
  }
  for (let command of commands) {
    if (command.type !== "prompt") continue;
    if (command.source === "bundled" || command.source === "builtin" || command.source === "policySettings")
      continue;
    if (command.source === "mcp" && command.loadedFrom !== "mcp") continue;
    let index = command.name.lastIndexOf(":");
    let bareName = index > 0 ? command.name.slice(index + 1) : undefined;
    let basenameToRecord =
      bareName !== undefined &&
      command.loadedFrom !== "syncedSkills" &&
      fallbackOnlyNames.has(bareName) &&
      pluginPrefixCounts.get(bareName) === 1
        ? bareName
        : undefined;
    let usageRecord = recordSkillUsage(command.name, basenameToRecord ?? bareSkillName(command));
    rows.push({
      name: command.pluginInfo ? printablePluginName(command.name) : command.name,
      source: command.pluginInfo
        ? isSyncedMarketplacePlugin(command.pluginInfo.repository)
          ? CLAUDE_AI_SYNC_LABEL
          : printablePluginName(command.pluginInfo.pluginManifest.name)
        : command.loadedFrom === "syncedSkills"
          ? CLAUDE_AI_SYNC_LABEL
          : command.source,
      owner:
        command.source === "plugin"
          ? "plugin"
          : command.source === "mcp"
            ? "mcp"
            : command.loadedFrom === "syncedSkills"
              ? "synced"
              : "settings",
      pluginKey: command.pluginInfo?.pluginManifest.name,
      usageCount: usageRecord?.usageCount ?? 0,
      daysSinceUse: usageRecord?.daysSinceUse ?? null,
      listingTokens: listingTokens.get(command.name) ?? null,
      weekTokens:
        usageBySkill.get(getBareCommandName(command)) ??
        (basenameToRecord ? usageBySkill.get(basenameToRecord) : undefined) ??
        null,
    });
  }
  rows.sort((leftRow, rightRow) => (rightRow.daysSinceUse ?? 1 / 0) - (leftRow.daysSinceUse ?? 1 / 0));
  let filtered = rows.filter((row) => row.usageCount === 0 && row.listingTokens !== null);
  let unusedOwned = filtered.filter((row) => row.owner === "settings");
  let unusedSynced = filtered.filter((row) => row.owner === "synced");
  let usedPluginKeys = new Set(
    rows.filter((row) => row.usageCount > 0 && row.pluginKey !== undefined).map((row) => row.pluginKey),
  );
  let unusedFromPlugins = filtered.filter(
    (row) => row.owner === "plugin" && (row.pluginKey === undefined || !usedPluginKeys.has(row.pluginKey)),
  );
  let mcpServerNameOf = (row) => {
    let index = row.name.indexOf(":");
    return index > 0 ? row.name.slice(0, index) : undefined;
  };
  let usedMcpServers = new Set(
    rows
      .filter((row) => row.owner === "mcp" && row.usageCount > 0)
      .map(mcpServerNameOf)
      .filter((serverName) => serverName !== undefined),
  );
  let filtered_2 = filtered.filter((row) => {
    if (row.owner !== "mcp") return false;
    let serverName = mcpServerNameOf(row);
    return serverName === undefined || !usedMcpServers.has(serverName);
  });
  let unusedMcpServers = normalizeCaseForComparison_2(
    filtered_2.map(mcpServerNameOf).filter((serverName) => serverName !== undefined),
  ).map((serverName) =>
    printablePluginName(
      options.mcpClients.find((mcpClient) => CLAUDEAI_SERVER_PREFIX(mcpClient.name) === serverName)?.name ??
        serverName,
    ),
  );
  return {
    rows,
    unusedOwned,
    unusedFromPlugins,
    unusedFromMcp: filtered_2,
    unusedSynced,
    unusedMcpServers,
    disusedPlugins: await disusedPlugins,
    weekTokensNote: scanAllowed.allowed ? null : scanAllowed.reason,
  };
}
export {
  buildSkillDoctorContext,
  formatSkillUsageTable,
  padEndToWidth,
  padStartToWidth,
  runSkillDoctor,
  SkillDoctorStageError,
};
