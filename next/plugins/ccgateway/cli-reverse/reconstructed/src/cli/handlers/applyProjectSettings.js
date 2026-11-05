/**
 * cli/handlers/applyProjectSettings.ts
 *
 * 2.1.316 新增。CLI 子命令：把项目设置文件应用到当前会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-deq8ysn0.js (2)
 * attribution: placement 2
 */
//@ chunk-deq8ysn0.js:191-307 placement
/**
 * claude apply-project-settings 子命令名与说明："Review and accept settings changes for cloud sessions that use this computer"。
 */
var APPLY_PROJECT_SETTINGS = "apply-project-settings";
var APPLY_PROJECT_SETTINGS_DESCRIPTION =
  "Review and accept settings changes for cloud sessions that use this computer";
//@ chunk-deq8ysn0.js:307-375 placement
/**
 * 判断 argv[2] 是否为 apply-project-settings 子命令。
 */
function isApplyProjectSettingsCommand(argv = process.argv) {
  return argv[2] === "apply-project-settings";
}
export { isApplyProjectSettingsCommand, APPLY_PROJECT_SETTINGS, APPLY_PROJECT_SETTINGS_DESCRIPTION };
