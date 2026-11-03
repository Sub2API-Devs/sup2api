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
import { yse } from "../../utils/permissions/serverClassifier/arbiter.js";
import { getAutoModeConfigOrDefault } from "../../utils/permissions/permissionSetup.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

/**
 * getAutoModeModelSetting：dpn()：auto 模式分类器模型。
 */
//@ chunk-e6aww6q8.js:1684623-1684651 placement
function getAutoModeModelSetting() {
  return resolveClassifierModel();
}
//@ chunk-e6aww6q8.js:1684651-1684681 placement
function l5s(e) {
  return getClassifierFallbackModel(e);
}
/**
 * isAutoModeSetupSurface：非 CLAUDE_CODE_REMOTE 且 yse()。
 */
//@ chunk-e6aww6q8.js:1684681-1684731 placement
function isAutoModeSetupSurface() {
  return !env.CLAUDE_CODE_REMOTE && yse();
}
/**
 * isAutoModeSetupAvailable：/auto-mode-setup（非交互）启用条件。
 */
//@ chunk-e6aww6q8.js:1684731-1684777 placement
function isAutoModeSetupAvailable() {
  return isAutoModeSetupSurface() && getAutoModeModelSetting().value !== "";
}
/**
 * isAutoModeOnboardingEnabled：/auto-mode-setup（交互）启用条件：tengu_auto_mode_config.envOnboarding。
 */
//@ chunk-e6aww6q8.js:1684777-1684831 placement
function isAutoModeOnboardingEnabled() {
  return isAutoModeSetupAvailable() && getAutoModeConfigOrDefault()?.envOnboarding === !0;
}
/**
 * isAutoModeSetupNotOverridden：且 skillOverrides["auto-mode-setup"] 不为 off。
 */
//@ chunk-e6aww6q8.js:1684831-1684909 placement
function isAutoModeSetupNotOverridden() {
  return (
    isAutoModeOnboardingEnabled() && getInitialSettings_2().skillOverrides?.["auto-mode-setup"] !== "off"
  );
}
/**
 * /auto-mode-setup 命令对象（local）；描述：Teach auto mode about your environment, plus optional rule tweaks；isEnabled: ()=>p5e()&&_e()；isHidden: {return!_e()}；实现 chunk-4cndz99e.js 的 Y。
 */
//@ chunk-e6aww6q8.js:1684909-1685492 placement
var autoModeSetupNonInteractiveCommand = {
    type: "local",
    name: "auto-mode-setup",
    supportsNonInteractive: !0,
    description: "Teach auto mode about your environment, plus optional rule tweaks",
    argumentHint:
      "[--request-id <uuid>] (--wizard posture=\u2026 scope=\u2026 depth=\u2026 --propose | --expect-sha256 <64-hex> --apply-file <path>)",
    isEnabled: () => isAutoModeSetupAvailable() && getIsNonInteractiveSession(),
    get isHidden() {
      return !getIsNonInteractiveSession();
    },
    load: () => import("./chunk-4cndz99e.js"),
  },
  autoModeSetupCommandDefinition = {
    type: "local-jsx",
    name: "auto-mode-setup",
    description: "Teach auto mode about your environment, plus optional rule tweaks",
    isEnabled: () => isAutoModeOnboardingEnabled() && !getIsNonInteractiveSession(),
    requires: { workspace: !0, ink: !0 },
  },
  autoModeSetupCommand = autoModeSetupCommandDefinition;

export {
  isAutoModeSetupNotOverridden,
  autoModeSetupCommand,
  autoModeSetupNonInteractiveCommand,
  getAutoModeModelSetting,
  l5s,
};
