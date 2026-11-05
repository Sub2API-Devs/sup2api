/**
 * skills/bundled/stuck.ts
 *
 * dataviz 内置 skill（图表设计指南），旧版 stuck 位置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/stuck.ts
 * pieces: chunk-ne2890fx.js (3)
 * attribution: sole-consumer 1, affinity 1, callgraph-fingerprint 1
 */
import { registerBundledSkill } from "../bundledSkills.js";
import { DATAVIZ } from "./bundledSkillNames.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-ne2890fx.js:100363-100414 sole-consumer
function loadDatavizSkillFiles() {
  return import("./SKILL_FILES_5.lazy.js");
}
//@ chunk-ne2890fx.js:100414-101926 affinity
/**
 * dataviz skill 的 description（触发条件长文本）。
 */
var DATAVIZ_DESCRIPTION =
  'Use this skill whenever you are about to create ANY chart, graph, plot, dashboard, or data visualization, in ANY output medium \u2014 an HTML or React artifact, inline SVG, plotting code in any library (matplotlib, plotly, d3, Recharts, \u2026), an image/PNG you will render and upload, or a chart shared into Slack. Read it BEFORE writing the first line of chart code, choosing chart colors, building a stat tile / meter / KPI row, or laying out a dashboard. When the destination is a first-party document connector (host-designated, never self-described) that renders live charts, hand it the rows (inline, or as an uploaded data file the chart cites) rather than a rendered PNG/SVG \u2014 a picture of a chart loses hover, data inspection and per-value comments. Produces visualizations that read as one system \u2014 elegant, accessible, consistent in light and dark \u2014 using a brand-neutral placeholder palette you swap for your own. Teaches a design-system-agnostic method: a form heuristic, a color formula with a runnable validator, mark specs, and interaction rules. A validated default palette is documented in `references/palette.md` \u2014 swap that file\'s values for your brand\'s. Triggers on: "chart", "graph", "plot", "data viz", "visualization", "dashboard", "analytics", "visualize data", "categorical colors", "sequential / diverging palette", "stat tile", "sparkline", "heatmap", "legend", "axis", "tooltip", "chart colors", "color by series".';
//@ chunk-ne2890fx.js:101926-102245 callgraph-fingerprint (2.1.88 match: registerStuckSkill, 0.204)
/**
 * 注册 dataviz 内置 skill（图表与看板设计指南，带附带文件）。旧版匹配为 registerStuckSkill，名不符实。
 */
function registerDatavizSkill() {
  registerBundledSkill({
    name: DATAVIZ,
    menuDescription: "Chart and dashboard design guidance",
    description: DATAVIZ_DESCRIPTION,
    userInvocable: true,
    files: () => loadDatavizSkillFiles().then((datavizSkillFiles) => datavizSkillFiles.SKILL_FILES),
    async getPromptForCommand(args) {
      let { SKILL_MD } = await loadDatavizSkillFiles();
      let parts = [parseFrontmatter(SKILL_MD).content.trimStart()];
      if (args)
        parts.push(`## User Request

${args}`);
      return [
        {
          type: "text",
          text: parts.join(`

`),
        },
      ];
    },
  });
}
export { registerDatavizSkill };
