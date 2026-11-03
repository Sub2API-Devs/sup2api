/**
 * cli/handlers/applyProjectSettings.ts
 *
 * 2.1.316 新增。CLI 子命令：把项目设置文件应用到当前会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4yx88wyy.js (2)
 * attribution: placement 2
 */
//@ chunk-4yx88wyy.js:191-307 placement
/**
 * claude apply-project-settings 子命令名与说明："Review and accept settings changes for cloud sessions that use this computer"。
 */
var APPLY_PROJECT_SETTINGS = "apply-project-settings";
var APPLY_PROJECT_SETTINGS_DESCRIPTION =
  "Review and accept settings changes for cloud sessions that use this computer";
//@ chunk-4yx88wyy.js:307-375 placement
/**
 * 判断 argv[2] 是否为 apply-project-settings 子命令。
 */
function isApplyProjectSettingsCommand(t = process.argv) {
  return t[2] === "apply-project-settings";
}
export { APPLY_PROJECT_SETTINGS, APPLY_PROJECT_SETTINGS_DESCRIPTION, isApplyProjectSettingsCommand };
