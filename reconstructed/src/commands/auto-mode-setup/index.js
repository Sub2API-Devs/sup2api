/**
 * commands/auto-mode-setup/index.ts
 *
 * 2.1.316 新增：/auto-mode-setup 命令对象：为自动模式讲解环境并生成可选规则（含 --wizard 参数）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import {
  resolveClassifierModel,
  getClassifierFallbackModel,
} from "../../utils/permissions/classifierModel.js";
import { env } from "../../utils/env.js";
import { alwaysTrueFlag } from "../../utils/permissions/serverClassifier/arbiter.js";
import { getAutoModeConfigOrDefault } from "../../utils/permissions/permissionSetup.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:1684623-1684651 placement
/**
 * getAutoModeModelSetting：dpn()：auto 模式分类器模型。
 */
function getAutoModeModelSetting() {
  return resolveClassifierModel();
}
//@ chunk-e6aww6q8.js:1684651-1684681 placement
/**
 * 取给定模型的分类器回退模型名。
 */
function classifierFallbackModelOf(resolved) {
  return getClassifierFallbackModel(resolved);
}
//@ chunk-e6aww6q8.js:1684681-1684731 placement
/**
 * isAutoModeSetupSurface：非 CLAUDE_CODE_REMOTE 且 yse()。
 */
function isAutoModeSetupSurface() {
  return !env.CLAUDE_CODE_REMOTE && alwaysTrueFlag();
}
//@ chunk-e6aww6q8.js:1684731-1684777 placement
/**
 * isAutoModeSetupAvailable：/auto-mode-setup（非交互）启用条件。
 */
function isAutoModeSetupAvailable() {
  return isAutoModeSetupSurface() && getAutoModeModelSetting().value !== "";
}
//@ chunk-e6aww6q8.js:1684777-1684831 placement
/**
 * isAutoModeOnboardingEnabled：/auto-mode-setup（交互）启用条件：tengu_auto_mode_config.envOnboarding。
 */
function isAutoModeOnboardingEnabled() {
  return isAutoModeSetupAvailable() && getAutoModeConfigOrDefault()?.envOnboarding === true;
}
//@ chunk-e6aww6q8.js:1684831-1684909 placement
/**
 * isAutoModeSetupNotOverridden：且 skillOverrides["auto-mode-setup"] 不为 off。
 */
function isAutoModeSetupNotOverridden() {
  return (
    isAutoModeOnboardingEnabled() && getInitialSettings_2().skillOverrides?.["auto-mode-setup"] !== "off"
  );
}
//@ chunk-e6aww6q8.js:1684909-1685492 placement
/**
 * /auto-mode-setup 命令对象（local）；描述：Teach auto mode about your environment, plus optional rule tweaks；isEnabled: ()=>p5e()&&_e()；isHidden: {return!_e()}；实现 chunk-4cndz99e.js 的 Y。
 */
var autoModeSetupNonInteractiveCommand = {
  type: "local",
  name: "auto-mode-setup",
  supportsNonInteractive: true,
  description: "Teach auto mode about your environment, plus optional rule tweaks",
  argumentHint:
    "[--request-id <uuid>] (--wizard posture=\u2026 scope=\u2026 depth=\u2026 --propose | --expect-sha256 <64-hex> --apply-file <path>)",
  isEnabled: () => isAutoModeSetupAvailable() && getIsNonInteractiveSession(),
  get isHidden() {
    return !getIsNonInteractiveSession();
  },
  load: () => import("./chunk-4cndz99e.js"),
};
var autoModeSetupCommandDefinition = {
  type: "local-jsx",
  name: "auto-mode-setup",
  description: "Teach auto mode about your environment, plus optional rule tweaks",
  isEnabled: () => isAutoModeOnboardingEnabled() && !getIsNonInteractiveSession(),
  requires: {
    workspace: true,
    ink: true,
  },
};
var autoModeSetupCommand = autoModeSetupCommandDefinition;
export {
  isAutoModeSetupNotOverridden,
  autoModeSetupCommand,
  autoModeSetupNonInteractiveCommand,
  getAutoModeModelSetting,
  classifierFallbackModelOf,
};
