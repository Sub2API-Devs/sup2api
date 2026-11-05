/**
 * utils/status/attributionProjectNotice.ts
 *
 * 2.1.316 新增：/status 中"用量报告归属的 claude.ai Project"说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p56qwmr3.js (1), chunk-x5s1qnh1.js (3)
 * attribution: placement 3, affinity 1
 */
import { tildify } from "../path.js";
import { getSettingsFilePathForSource } from "../settings/settings.js";
import { getFlagSettingsInline } from "../../bootstrap/state.js";
import { currentAttributionProject } from "../attributionProject.js";

//@ chunk-x5s1qnh1.js:2854-3044 affinity
function projectOriginLabel(attribution) {
  let { project, written, ignored } = attribution;
  if (project === undefined) return;
  let [ignoredSource] = ignored;
  let ignoredNote =
    ignoredSource === undefined ? "" : `; ignored the invalid ${attributionSourceLabel(ignoredSource)}`;
  return {
    name: written ?? project.taggedId,
    origin: `${sourceLabel(project.source)}${ignoredNote}`,
  };
}
//@ chunk-x5s1qnh1.js:3044-3289 placement
function attributionSourceLabel(source) {
  switch (source) {
    case "harness":
      return "CLAUDE_CODE_ATTRIBUTION_PROJECT";
    case "admin_default":
      return "your organization's default Project";
    case "flag":
      return "attributionProject in --settings";
    default:
      return `attributionProject in ${sourceLabel(source)}`;
  }
}
//@ chunk-x5s1qnh1.js:3289-3710 placement
/**
 * 归因 Project 来源的人类可读来源名（harness 环境变量、组织默认、各级 settings 文件等）。
 */
function sourceLabel(source) {
  switch (source) {
    case "harness":
      return "CLAUDE_CODE_ATTRIBUTION_PROJECT";
    case "admin_default":
      return "your organization's default";
    case "user":
      return tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json");
    case "project":
      return ".claude/settings.json";
    case "local":
      return ".claude/settings.local.json";
    case "flag":
      return getFlagSettingsInline()?.attributionProject === undefined ? "--settings" : "set with /project";
    case "managed":
      return "managed settings";
  }
}
//@ chunk-p56qwmr3.js:3680-4405 placement
/**
 * /status 中关于用量报告归属的 claude.ai Project 的说明（来源、忽略的无效值或缺失警告）。
 */
var ATTRIBUTION_PROJECT_NOTICE = {
  id: "attribution-project",
  compute: () => {
    let attribution = currentAttributionProject();
    if (attribution === undefined) return null;
    let project = projectOriginLabel(attribution);
    if (project !== undefined)
      return {
        key: "attribution-project",
        kind: "contextual",
        text: `This session names claude.ai Project ${project.name} for usage reports (${project.origin})`,
        priority: "low",
      };
    let [ignoredSource] = attribution.ignored;
    switch (ignoredSource) {
      case undefined:
        return null;
      case "managed":
      case "admin_default":
        return {
          key: "attribution-project",
          kind: "warning",
          text: `No claude.ai Project for usage reports: ${attributionSourceLabel(ignoredSource)} is not a valid Project ID; ask your administrator`,
          color: "warning",
          priority: "low",
        };
      default:
        return {
          key: "attribution-project",
          kind: "warning",
          text: `No claude.ai Project for usage reports: ${attributionSourceLabel(ignoredSource)} is not a Project UUID or claude_proj_ ID`,
          color: "warning",
          priority: "high",
        };
    }
  },
};
export { projectOriginLabel, sourceLabel, attributionSourceLabel, ATTRIBUTION_PROJECT_NOTICE };
