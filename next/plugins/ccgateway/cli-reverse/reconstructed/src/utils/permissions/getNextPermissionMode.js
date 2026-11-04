/**
 * utils/permissions/getNextPermissionMode.ts
 *
 * Shift+Tab 能否进入 auto、循环并准备上下文，以及主动性档位到启动模式的映射。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/getNextPermissionMode.ts
 * pieces: chunk-18hwfzwa.js (2), chunk-kswt4qha.js (1), chunk-n4pvm0gt.js (3)
 * attribution: placement 3, fingerprint 3
 */
import {
  isAutoModeGateEnabled,
  getAutoModeUnavailableReason,
  isBypassPermissionsModeDisabled,
  transitionPermissionMode,
} from "./permissionSetup.js";
import { logForDebugging } from "../debug.js";
import { getNextPermissionMode_2 } from "../../types/permissions.js";

//@ chunk-kswt4qha.js:2557-2947 fingerprint (2.1.88 match: getNextPermissionMode, 0.536)
/**
 * 主动性档位 → 启动权限模式：ask→auto（可用时）否则 default；default→auto（可用时）否则沿用基线模式（基线为 auto 或不可用的 bypass 时回 default）；proactive→bypassPermissions（可用时）→auto→acceptEdits。
 */
function permissionModeForProactivityLevel(level, availability, baselineMode) {
  switch (level) {
    case "ask":
      return availability.isAutoModeAvailable ? "auto" : "default";
    case "default": {
      if (availability.isAutoModeAvailable) return "auto";
      let effectiveBaselineMode = baselineMode ?? "default";
      if (
        effectiveBaselineMode === "auto" ||
        (effectiveBaselineMode === "bypassPermissions" && !availability.isBypassPermissionsModeAvailable)
      )
        return "default";
      return effectiveBaselineMode;
    }
    case "proactive":
      if (availability.isBypassPermissionsModeAvailable) return "bypassPermissions";
      return availability.isAutoModeAvailable ? "auto" : "acceptEdits";
  }
}
//@ chunk-n4pvm0gt.js:337-537 fingerprint (2.1.88 match: canCycleToAuto, 1)
/**
 * Shift+Tab 能否循环到 auto：context.isAutoModeAvailable 与实时闸门 isAutoModeGateEnabled（d_）都为真；否则打调试日志说明原因。
 */
function canCycleToAuto(ctx) {
  let gateEnabled = isAutoModeGateEnabled();
  let can = !!ctx.isAutoModeAvailable && gateEnabled;
  if (!can)
    logForDebugging(
      `[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${ctx.isAutoModeAvailable} isAutoModeGateEnabled=${gateEnabled} reason=${getAutoModeUnavailableReason()}`,
    );
  return can;
}
//@ chunk-n4pvm0gt.js:537-603 placement
/**
 * Shift+Tab 能否循环到 bypassPermissions：isBypassPermissionsModeAvailable 且未被 settings.permissions.disableBypassPermissionsMode="disable" 关闭（zA）。
 */
function canCycleToBypassPermissions(context) {
  return !!context.isBypassPermissionsModeAvailable && !isBypassPermissionsModeDisabled();
}
//@ chunk-n4pvm0gt.js:903-982 fingerprint (2.1.88 match: cyclePermissionMode, 1)
/**
 * 计算下一个模式并调用 transitionPermissionMode 准备上下文（进入 auto 时剥离危险 allow 规则等），返回 {nextMode, context}。
 */
function cyclePermissionMode(context, teamContext, trigger) {
  let nextMode = getNextPermissionMode_2(context, teamContext);
  return {
    nextMode,
    context: transitionPermissionMode(context.mode, nextMode, context, trigger),
  };
}
//@ chunk-18hwfzwa.js:643256-643382 placement
/**
 * 可循环切换的权限模式列表：plan、default、acceptEdits，按条件加入 auto 与 bypassPermissions。
 */
function cyclePermissionModes(context) {
  let modes = ["plan", "default", "acceptEdits"];
  if (canCycleToAuto(context)) modes.push("auto");
  if (canCycleToBypassPermissions(context)) modes.push("bypassPermissions");
  return modes;
}
//@ chunk-18hwfzwa.js:643382-643509 placement (2.1.88 match: peek, 0.809)
/**
 * 按可用权限模式列表（plan/default/acceptEdits，可加 auto、bypassPermissions）循环取下一个或上一个。旧版名 peek 为错配。
 */
function getNextPermissionMode(context, direction) {
  let modes = cyclePermissionModes(context);
  let index = modes.indexOf(context.mode);
  if (index === -1) return "default";
  return modes[(index + (direction === "next" ? 1 : -1) + modes.length) % modes.length];
}
export {
  canCycleToAuto,
  permissionModeForProactivityLevel,
  cyclePermissionMode,
  getNextPermissionMode,
  canCycleToBypassPermissions,
};
