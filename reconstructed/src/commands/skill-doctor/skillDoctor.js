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
import { han, k1s } from "../../services/usageInsights/transcriptScan.js";
import { mergedSkillListing, skillListingTokenCounts } from "../../tools/SkillTool/prompt.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { dropShadowedFallbackSkills, getBareCommandName } from "../../commands.js";
import { isFallbackSkill, bareSkillName } from "../../utils/commandPredicates.js";
import { recordSkillUsage } from "../../utils/suggestions/skillUsageTracking.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { i3 } from "../../utils/permissions/permissionRulePayload.js";
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
  constructor(n, s) {
    super("skill-doctor stage failed", { cause: s });
    this.featureErrorCode = n;
  }
}
//@ chunk-7s2ajdvd.js:1450-1668 placement
function buildSkillDoctorContext(n) {
  return {
    commands: n.options.commands,
    mcpCommands: n.getMcp().commands,
    mcpClients: n.getMcp().clients,
    agentId: n.agentId,
    mainLoopModel: n.options.mainLoopModel,
    permissionMode: getToolPermissionContext(n).mode,
    storageV5: n.storageV5,
  };
}
/**
 * /skill-doctor：扫描已装技能的上下文占用、近一周使用量与最后使用时间，生成整理建议。
 */
//@ chunk-7s2ajdvd.js:1668-4052 placement
async function runSkillDoctor(n) {
  let s = computeDisusedPlugins();
  s.catch(() => {});
  let o = han(),
    c = o.allowed
      ? k1s(n.storageV5).catch((e) => {
          throw new SkillDoctorStageError("scan_failed", e);
        })
      : Promise.resolve(new Map());
  c.catch(() => {});
  let { included: included } = await mergedSkillListing(n.mcpCommands, n.agentId, n.storageV5).catch((e) => {
      throw new SkillDoctorStageError("skill_set_failed", e);
    }),
    S = getRuntimeMainLoopModel({ permissionMode: n.permissionMode, mainLoopModel: n.mainLoopModel }),
    y = skillListingTokenCounts(included, S, n.mainLoopModel),
    p = await c,
    r = [],
    l = dropShadowedFallbackSkills([...n.commands]),
    w = new Set(l.map((e) => e.name)),
    M = new Set(
      n.commands.filter((command) => isFallbackSkill(command) && !w.has(command.name)).map((e) => e.name),
    ),
    m = new Map();
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
    let index = e.name.lastIndexOf(":"),
      i = index > 0 ? e.name.slice(index + 1) : void 0,
      u = i !== void 0 && e.loadedFrom !== "syncedSkills" && M.has(i) && m.get(i) === 1 ? i : void 0,
      f = recordSkillUsage(e.name, u ?? bareSkillName(e));
    r.push({
      name: e.pluginInfo ? printablePluginName(e.name) : e.name,
      source: e.pluginInfo
        ? i3(e.pluginInfo.repository)
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
      weekTokens: p.get(getBareCommandName(e)) ?? (u ? p.get(u) : void 0) ?? null,
    });
  }
  r.sort((e, t) => (t.daysSinceUse ?? 1 / 0) - (e.daysSinceUse ?? 1 / 0));
  let filtered = r.filter((e) => e.usageCount === 0 && e.listingTokens !== null),
    filtered_2 = filtered.filter((e) => e.owner === "settings"),
    filtered_3 = filtered.filter((e) => e.owner === "synced"),
    x = new Set(r.filter((e) => e.usageCount > 0 && e.pluginKey !== void 0).map((e) => e.pluginKey)),
    filtered_4 = filtered.filter(
      (e) => e.owner === "plugin" && (e.pluginKey === void 0 || !x.has(e.pluginKey)),
    ),
    d = (e) => {
      let index = e.name.indexOf(":");
      return index > 0 ? e.name.slice(0, index) : void 0;
    },
    I = new Set(
      r
        .filter((e) => e.owner === "mcp" && e.usageCount > 0)
        .map(d)
        .filter((e) => e !== void 0),
    ),
    filtered_5 = filtered.filter((e) => {
      if (e.owner !== "mcp") return !1;
      let t = d(e);
      return t === void 0 || !I.has(t);
    }),
    mapped = uniq(filtered_5.map(d).filter((e) => e !== void 0)).map((e) =>
      printablePluginName(
        n.mcpClients.find((mcpClient) => normalizeNameForMCP(mcpClient.name) === e)?.name ?? e,
      ),
    );
  return {
    rows: r,
    unusedOwned: filtered_2,
    unusedFromPlugins: filtered_4,
    unusedFromMcp: filtered_5,
    unusedSynced: filtered_3,
    unusedMcpServers: mapped,
    disusedPlugins: await s,
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
