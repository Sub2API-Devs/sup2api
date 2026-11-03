/**
 * commands/skill-doctor/skillDoctor.ts
 *
 * 2.1.316 新增：/skill-doctor：统计技能上下文占用与使用量并生成整理建议
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7s2ajdvd.js (6)
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
import { uniq } from "../../utils/collections.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";

//@ chunk-7s2ajdvd.js:690-749 placement
function padEndToWidth(n, s) {
  return n + " ".repeat(Math.max(0, s - bunStringWidth(n)));
}
//@ chunk-7s2ajdvd.js:749-806 placement
function padStartToWidth(n, s) {
  return " ".repeat(Math.max(0, s - bunStringWidth(n))) + n;
}
//@ chunk-7s2ajdvd.js:806-1322 placement
function formatSkillUsageTable(n) {
  let mapped = n.map((o) => ({
    context: o.listingTokens === null ? "-" : formatTokenEstimate(o.listingTokens),
    week: o.weekTokens === null ? "-" : formatTokens(o.weekTokens),
    lastUsed:
      o.daysSinceUse === null
        ? "never"
        : o.daysSinceUse === 0
          ? "today"
          : `${o.daysSinceUse} ${plural(o.daysSinceUse, "day")}`,
  }));
  return {
    cells: mapped,
    widths: {
      name: Math.max(5, ...n.map((o) => bunStringWidth(o.name))),
      source: Math.max(6, ...n.map((o) => bunStringWidth(o.source))),
      context: Math.max(7, ...mapped.map((o) => bunStringWidth(o.context))),
      week: Math.max(9, ...mapped.map((o) => bunStringWidth(o.week))),
      uses: Math.max(4, ...n.map((o) => bunStringWidth(String(o.usageCount)))),
    },
  };
}
//@ chunk-7s2ajdvd.js:1322-1450 placement
class SkillDoctorStageError extends Error {
  featureErrorCode;
  constructor(featureErrorCode, cause) {
    super("skill-doctor stage failed", {
      cause,
    });
    this.featureErrorCode = featureErrorCode;
  }
}
//@ chunk-7s2ajdvd.js:1450-1668 placement
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
//@ chunk-7s2ajdvd.js:1668-4052 placement
/**
 * /skill-doctor：扫描已装技能的上下文占用、近一周使用量与最后使用时间，生成整理建议。
 */
async function runSkillDoctor(n) {
  let disusedPlugins = computeDisusedPlugins();
  disusedPlugins.catch(() => {});
  let o = isSkillDoctorScanAllowed();
  let c = o.allowed
    ? aggregateRecentUsage(n.storageV5).catch((error) => {
        throw new SkillDoctorStageError("scan_failed", error);
      })
    : Promise.resolve(new Map());
  c.catch(() => {});
  let { included } = await mergedSkillListing(n.mcpCommands, n.agentId, n.storageV5).catch((error) => {
    throw new SkillDoctorStageError("skill_set_failed", error);
  });
  let runtimeMainLoopModel = getRuntimeMainLoopModel({
    permissionMode: n.permissionMode,
    mainLoopModel: n.mainLoopModel,
  });
  let y = skillListingTokenCounts(included, runtimeMainLoopModel, n.mainLoopModel);
  let p = await c;
  let r = [];
  let l = dropShadowedFallbackSkills([...n.commands]);
  let w = new Set(l.map((e) => e.name));
  let M = new Set(
    n.commands
      .filter((command) => isFallbackSkill(command) && !w.has(command.name))
      .map((command) => command.name),
  );
  let m = new Map();
  for (let e of l) {
    let t = e.type === "prompt" && e.loadedFrom !== "syncedSkills" ? e.name.lastIndexOf(":") : -1;
    if (t > 0) {
      let sliced = e.name.slice(t + 1);
      m.set(sliced, (m.get(sliced) ?? 0) + 1);
    }
  }
  for (let e of l) {
    if (e.type !== "prompt") continue;
    if (e.source === "bundled" || e.source === "builtin" || e.source === "policySettings") continue;
    if (e.source === "mcp" && e.loadedFrom !== "mcp") continue;
    let index = e.name.lastIndexOf(":");
    let i = index > 0 ? e.name.slice(index + 1) : undefined;
    let u = i !== undefined && e.loadedFrom !== "syncedSkills" && M.has(i) && m.get(i) === 1 ? i : undefined;
    let f = recordSkillUsage(e.name, u ?? bareSkillName(e));
    r.push({
      name: e.pluginInfo ? printablePluginName(e.name) : e.name,
      source: e.pluginInfo
        ? isSyncedMarketplacePlugin(e.pluginInfo.repository)
          ? CLAUDE_AI_SYNC_LABEL
          : printablePluginName(e.pluginInfo.pluginManifest.name)
        : e.loadedFrom === "syncedSkills"
          ? CLAUDE_AI_SYNC_LABEL
          : e.source,
      owner:
        e.source === "plugin"
          ? "plugin"
          : e.source === "mcp"
            ? "mcp"
            : e.loadedFrom === "syncedSkills"
              ? "synced"
              : "settings",
      pluginKey: e.pluginInfo?.pluginManifest.name,
      usageCount: f?.usageCount ?? 0,
      daysSinceUse: f?.daysSinceUse ?? null,
      listingTokens: y.get(e.name) ?? null,
      weekTokens: p.get(getBareCommandName(e)) ?? (u ? p.get(u) : undefined) ?? null,
    });
  }
  r.sort((e, t) => (t.daysSinceUse ?? 1 / 0) - (e.daysSinceUse ?? 1 / 0));
  let filtered = r.filter((e) => e.usageCount === 0 && e.listingTokens !== null);
  let unusedOwned = filtered.filter((e) => e.owner === "settings");
  let unusedSynced = filtered.filter((e) => e.owner === "synced");
  let x = new Set(r.filter((e) => e.usageCount > 0 && e.pluginKey !== undefined).map((e) => e.pluginKey));
  let unusedFromPlugins = filtered.filter(
    (e) => e.owner === "plugin" && (e.pluginKey === undefined || !x.has(e.pluginKey)),
  );
  let d = (e) => {
    let index = e.name.indexOf(":");
    return index > 0 ? e.name.slice(0, index) : undefined;
  };
  let I = new Set(
    r
      .filter((e) => e.owner === "mcp" && e.usageCount > 0)
      .map(d)
      .filter((e) => e !== undefined),
  );
  let filtered_2 = filtered.filter((e) => {
    if (e.owner !== "mcp") return false;
    let t = d(e);
    return t === undefined || !I.has(t);
  });
  let unusedMcpServers = uniq(filtered_2.map(d).filter((e) => e !== undefined)).map((e) =>
    printablePluginName(
      n.mcpClients.find((mcpClient) => normalizeNameForMCP(mcpClient.name) === e)?.name ?? e,
    ),
  );
  return {
    rows: r,
    unusedOwned,
    unusedFromPlugins,
    unusedFromMcp: filtered_2,
    unusedSynced,
    unusedMcpServers,
    disusedPlugins: await disusedPlugins,
    weekTokensNote: o.allowed ? null : o.reason,
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
