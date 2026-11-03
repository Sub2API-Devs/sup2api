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
var APPLY_PROJECT_SETTINGS = "apply-project-settings",
  Uhi = "Review and accept settings changes for cloud sessions that use this computer";
//@ chunk-4yx88wyy.js:307-375 placement
function kcr(t = process.argv) {
  return t[2] === "apply-project-settings";
}

export { APPLY_PROJECT_SETTINGS, Uhi, kcr };
