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

/**
 * /status 中关于用量报告归属的 claude.ai Project 的说明（来源、忽略的无效值或缺失警告）。
 */
//@ chunk-x08x6vab.js:3380-4330 placement
var ATTRIBUTION_PROJECT_NOTICE = {
  id: "attribution-project",
  compute: () => {
    let t = getSubscriberAttributionProject();
    if (t === void 0) return null;
    let { project: project, written: written, ignored: ignored } = t,
      [e] = ignored;
    if (project !== void 0) {
      let i;
      switch (project.source) {
        case "harness":
          i = "CLAUDE_CODE_ATTRIBUTION_PROJECT";
          break;
        case "admin_default":
          i = "your organization's default";
          break;
        default:
          i = settingsSourceLabel(project.source);
      }
      let u = e === void 0 ? "" : `; ignored the invalid ${attributionSourceLabel(e)}`;
      return {
        key: "attribution-project",
        kind: "contextual",
        text: `This session names claude.ai Project ${written ?? project.taggedId} for usage reports (${i}${u})`,
        priority: "low",
      };
    }
    switch (e) {
      case void 0:
        return null;
      case "managed":
      case "admin_default":
        return {
          key: "attribution-project",
          kind: "warning",
          text: `No claude.ai Project for usage reports: ${attributionSourceLabel(e)} is not a valid Project ID; ask your administrator`,
          color: "warning",
          priority: "low",
        };
      default:
        return {
          key: "attribution-project",
          kind: "warning",
          text: `No claude.ai Project for usage reports: ${attributionSourceLabel(e)} is not a Project UUID or claude_proj_ ID`,
          color: "warning",
          priority: "high",
        };
    }
  },
};
//@ chunk-x08x6vab.js:4330-4519 placement
function attributionSourceLabel(t) {
  switch (t) {
    case "harness":
      return "CLAUDE_CODE_ATTRIBUTION_PROJECT";
    case "admin_default":
      return "your organization's default Project";
    default:
      return `attributionProject in ${settingsSourceLabel(t)}`;
  }
}
//@ chunk-x08x6vab.js:4519-4773 placement
function settingsSourceLabel(t) {
  switch (t) {
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
