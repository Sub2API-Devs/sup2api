/**
 * commands/createMovedToConfigCommand.ts
 *
 * 2.1.316 新增：为已并入 /config 的旧命令生成"已移到 /config"的占位命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:1694311-1694361 placement
/**
 * isSettingsMovedToConfig：tengu_maple_sundial：vim/output-style 改到 /config。
 */
function isSettingsMovedToConfig() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_maple_sundial", false);
}
//@ chunk-e6aww6q8.js:1694361-1694538 placement
/**
 * createMovedToConfigCommand：生成 "X moved to /config" 的隐藏 local-jsx 命令。
 */
function createMovedToConfigCommand(name, label, extraRequires) {
  return {
    type: "local-jsx",
    name,
    description: `${label} moved to /config`,
    isHidden: true,
    isEnabled: () => isSettingsMovedToConfig(),
    immediate: (args, presentation) => presentation === "fullscreen",
    requires: {
      ink: true,
      ...extraRequires,
    },
  };
}
//@ chunk-e6aww6q8.js:1694538-1694625 placement
/**
 * vimMovedToConfigCommand：createMovedToConfigCommand("vim","Editor mode")。
 */
var vimMovedToConfigCommand = createMovedToConfigCommand("vim", "Editor mode");
var outputStyleMovedToConfigCommand = createMovedToConfigCommand("output-style", "Output style", {
  workspace: true,
});
//@ chunk-e6aww6q8.js:1694625-1694649 placement
/**
 * isOutputStyleCommandForced：构建期常量 false。
 */
function isMovedToConfigCommandHidden() {
  return false;
}
export {
  isSettingsMovedToConfig,
  vimMovedToConfigCommand,
  outputStyleMovedToConfigCommand,
  isMovedToConfigCommandHidden,
};
