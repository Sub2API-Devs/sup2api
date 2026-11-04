/**
 * utils/status/attributionProjectNotice.ts
 *
 * 2.1.316 新增：/status 中"用量报告归属的 claude.ai Project"说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x08x6vab.js (3)
 * attribution: placement 3
 */
import { getSubscriberAttributionProject } from "../attributionProject.js";
import { tildify } from "../path.js";
import { getSettingsFilePathForSource } from "../settings/settings.js";

//@ chunk-x08x6vab.js:3380-4330 placement
/**
 * /status 中关于用量报告归属的 claude.ai Project 的说明（来源、忽略的无效值或缺失警告）。
 */
var ATTRIBUTION_PROJECT_NOTICE = {
  id: "attribution-project",
  compute: () => {
    let subscriberAttributionProject = getSubscriberAttributionProject();
    if (subscriberAttributionProject === undefined) return null;
    let { project, written, ignored } = subscriberAttributionProject;
    let [ignoredSource] = ignored;
    if (project !== undefined) {
      let sourceLabel;
      switch (project.source) {
        case "harness":
          sourceLabel = "CLAUDE_CODE_ATTRIBUTION_PROJECT";
          break;
        case "admin_default":
          sourceLabel = "your organization's default";
          break;
        default:
          sourceLabel = settingsSourceLabel(project.source);
      }
      let ignoredSuffix =
        ignoredSource === undefined ? "" : `; ignored the invalid ${attributionSourceLabel(ignoredSource)}`;
      return {
        key: "attribution-project",
        kind: "contextual",
        text: `This session names claude.ai Project ${written ?? project.taggedId} for usage reports (${sourceLabel}${ignoredSuffix})`,
        priority: "low",
      };
    }
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
//@ chunk-x08x6vab.js:4330-4519 placement
function attributionSourceLabel(source) {
  switch (source) {
    case "harness":
      return "CLAUDE_CODE_ATTRIBUTION_PROJECT";
    case "admin_default":
      return "your organization's default Project";
    default:
      return `attributionProject in ${settingsSourceLabel(source)}`;
  }
}
//@ chunk-x08x6vab.js:4519-4773 placement
function settingsSourceLabel(source) {
  switch (source) {
    case "user":
      return tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json");
    case "project":
      return ".claude/settings.json";
    case "local":
      return ".claude/settings.local.json";
    case "flag":
      return "--settings";
    case "managed":
      return "managed settings";
  }
}
export { ATTRIBUTION_PROJECT_NOTICE };
