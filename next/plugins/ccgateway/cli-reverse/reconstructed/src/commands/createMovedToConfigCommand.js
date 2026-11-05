/**
 * commands/createMovedToConfigCommand.ts
 *
 * 2.1.316 新增：为已并入 /config 的旧命令生成"已移到 /config"的占位命令
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1769681-1769731 placement
/**
 * isSettingsMovedToConfig：tengu_maple_sundial：vim/output-style 改到 /config。
 */
function isSettingsMovedToConfig() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_maple_sundial", false);
}
//@ chunk-5xgkngpb.js:1769731-1769908 placement
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
//@ chunk-5xgkngpb.js:1769908-1769995 placement
/**
 * vimMovedToConfigCommand：createMovedToConfigCommand("vim","Editor mode")。
 */
var vimMovedToConfigCommand; // deferred: uses createMovedToConfigCommand of its import cycle while loading; runs once the cycle is complete
var outputStyleMovedToConfigCommand;
deferInit("chunk-5xgkngpb.js:1769908", () => {
  vimMovedToConfigCommand = createMovedToConfigCommand("vim", "Editor mode");
  outputStyleMovedToConfigCommand = createMovedToConfigCommand("output-style", "Output style", {
    workspace: true,
  });
});
//@ chunk-5xgkngpb.js:1769995-1770019 placement
/**
 * isOutputStyleCommandForced：构建期常量 false。
 */
function isMovedToConfigCommandHidden() {
  return false;
}
export {
  vimMovedToConfigCommand,
  outputStyleMovedToConfigCommand,
  isSettingsMovedToConfig,
  isMovedToConfigCommandHidden,
};
