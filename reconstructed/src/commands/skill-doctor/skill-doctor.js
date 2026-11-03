/**
 * commands/skill-doctor/skill-doctor.ts
 *
 * 2.1.316 新增。/skill-doctor 命令：列出本会话加载的技能、上下文占用、近 7 天用量与未用技能。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxw5j15d.js (3)
 * attribution: placement 3
 */
import { sequential } from "../../utils/sequential.js";
import {
  formatSkillUsageTable as formatSkillUsageTable_2,
  padEndToWidth,
  padStartToWidth,
  runSkillDoctor,
  buildSkillDoctorContext,
  SkillDoctorStageError,
} from "./skillDoctor.js";
import { plural } from "../../utils/stringUtils.js";
import { uniq } from "../../utils/collections.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * 技能用量表格
 */
//@ chunk-kxw5j15d.js:534-1049 placement
function formatSkillUsageTable(r) {
  if (r.length === 0) return sequential.dim("  (no skills loaded)");
  let { cells: cells, widths: widths } = formatSkillUsageTable_2(r),
    dim = sequential.dim(
      `  ${padEndToWidth("skill", widths.name)}  ${padEndToWidth("source", widths.source)}  ${padStartToWidth("context", widths.context)}  ${padStartToWidth("7d tokens", widths.week)}  ${padStartToWidth("uses", widths.uses + 1)}  last used`,
    ),
    joined = r.map((i, h) => {
      let u = cells[h],
        c = `  ${padEndToWidth(i.name, widths.name)}  ${sequential.dim(padEndToWidth(i.source, widths.source))}  ${padStartToWidth(u.context, widths.context)}  ${padStartToWidth(u.week, widths.week)}  ${padStartToWidth(String(i.usageCount), widths.uses)}\xD7  ${u.lastUsed}`;
      return i.usageCount === 0 ? sequential.yellow(c) : c;
    }).join(`
`);
  return `${dim}
${joined}`;
}
/**
 * 生成 /skill-doctor 报告
 */
//@ chunk-kxw5j15d.js:1049-3408 placement
async function buildSkillDoctorReport(r) {
  let {
      rows: rows,
      unusedOwned: unusedOwned,
      unusedSynced: unusedSynced,
      unusedFromPlugins: unusedFromPlugins,
      unusedFromMcp: unusedFromMcp,
      unusedMcpServers: unusedMcpServers,
      disusedPlugins: disusedPlugins,
      weekTokensNote: weekTokensNote,
    } = await runSkillDoctor(buildSkillDoctorContext(r)),
    s = [];
  if (
    (s.push(sequential.bold("Skills loaded this session")),
    s.push(""),
    s.push(formatSkillUsageTable(rows)),
    rows.length > 0)
  )
    (s.push(""),
      s.push(
        sequential.dim("  context = this skill's one-line listing in the system prompt, included every turn"),
      ),
      s.push(
        sequential.dim(
          "  (dash = not in the current listing, costs nothing; full SKILL.md loads only when it runs)",
        ),
      ),
      s.push(
        sequential.dim(
          weekTokensNote === null
            ? "  7d tokens = tokens attributed to the skill over the last 7 days of sessions on this machine"
            : `  7d tokens: ${weekTokensNote}`,
        ),
      ));
  if ((s.push(""), unusedOwned.length > 0))
    s.push(
      sequential.yellow(
        `${unusedOwned.length} ${plural(unusedOwned.length, "skill")} loaded but never invoked. Each one adds to the system prompt every turn. Disable in /skills, or remove from .claude/skills.`,
      ),
    );
  if (unusedSynced.length > 0)
    s.push(
      sequential.yellow(
        `${unusedSynced.length} ${plural(unusedSynced.length, "skill")} synced from claude.ai loaded but never invoked. Each one adds to the system prompt every turn. Disable in /skills, or turn ${unusedSynced.length === 1 ? "it" : "them"} off on claude.ai \u2014 a deleted synced copy is re-downloaded on the next sync.`,
      ),
    );
  if (unusedFromPlugins.length > 0) {
    let n = uniq(
      unusedFromPlugins.map((p) => (p.pluginKey === void 0 ? p.source : printablePluginName(p.pluginKey))),
    );
    s.push(
      sequential.yellow(
        `${unusedFromPlugins.length} plugin ${plural(unusedFromPlugins.length, "skill")} loaded but never invoked, from ${n.join(", ")}. Each one adds to the system prompt every turn. Plugin skills can't be turned off individually \u2014 disable ${n.length === 1 ? "the plugin" : "those plugins"} in /plugin.`,
      ),
    );
  }
  if (unusedFromMcp.length > 0) {
    let n = unusedMcpServers.length > 0 ? `, from ${unusedMcpServers.join(", ")}` : "",
      p = unusedMcpServers.length <= 1;
    s.push(
      sequential.yellow(
        `${unusedFromMcp.length} MCP ${plural(unusedFromMcp.length, "skill")} loaded but never invoked${n}. Each one adds to the system prompt every turn. MCP skills live on the server, not on disk \u2014 turning ${p ? "that server" : "those servers"} off in /mcp also removes ${p ? "its" : "their"} tools.`,
      ),
    );
  }
  if (rows.length > 0 && rows.every((n) => n.usageCount > 0))
    s.push(sequential.green("All loaded skills have been used at least once."));
  if (disusedPlugins.length > 0) {
    (s.push(""), s.push(sequential.bold("Plugins not used recently")), s.push(""));
    for (let n of disusedPlugins)
      s.push(
        `  ${sequential.yellow(printablePluginName(n.name))}  ${sequential.dim(`last used ${n.daysSinceLastUse} days ago`)}`,
      );
    (s.push(""), s.push(sequential.dim("  Manage these in /plugin")));
  }
  if (rows.length === 0) logFeatureSad("cli_skill_doctor", "no_user_skills");
  else if (weekTokensNote !== null) logFeatureSad("cli_skill_doctor", "scan_policy_denied");
  else logFeatureOk("cli_skill_doctor");
  return s.join(`
`);
}
//@ chunk-kxw5j15d.js:3408-4028 placement
var call = async (args, context) => {
  if (isBridgeOrTransport(context.session))
    return { type: "text", value: "Skill usage reports are not available on this connection." };
  try {
    let e = await buildSkillDoctorReport(context);
    if (isBridgeOrTransport(context.session))
      return { type: "text", value: "Skill usage reports are not available on this connection." };
    return { type: "text", value: e };
  } catch (error) {
    let o = error instanceof SkillDoctorStageError ? error.cause : error;
    if (
      (logError(o),
      logFeatureBad(
        "cli_skill_doctor",
        error instanceof SkillDoctorStageError ? error.featureErrorCode : "render_failed",
      ),
      isBridgeOrTransport(context.session))
    )
      return { type: "text", value: "Couldn't compute skill usage.", outcome: { kind: "failed" } };
    return {
      type: "text",
      value: `Couldn't compute skill usage. Run with --debug for details. (${errorMessage(o)})`,
      outcome: { kind: "failed" },
    };
  }
};

export { call };
