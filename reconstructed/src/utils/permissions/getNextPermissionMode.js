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

/**
 * Shift+Tab 能否循环到 auto：context.isAutoModeAvailable 与实时闸门 isAutoModeGateEnabled（d_）都为真；否则打调试日志说明原因。
 */
//@ chunk-n4pvm0gt.js:337-537 fingerprint = canCycleToAuto (1)
function canCycleToAuto(ctx) {
  let gateEnabled = isAutoModeGateEnabled(),
    can = !!ctx.isAutoModeAvailable && gateEnabled;
  if (!can)
    logForDebugging(
      `[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${ctx.isAutoModeAvailable} isAutoModeGateEnabled=${gateEnabled} reason=${getAutoModeUnavailableReason()}`,
    );
  return can;
}
/**
 * Shift+Tab 能否循环到 bypassPermissions：isBypassPermissionsModeAvailable 且未被 settings.permissions.disableBypassPermissionsMode="disable" 关闭（zA）。
 */
//@ chunk-n4pvm0gt.js:537-603 placement
function canCycleToBypassPermissions(context) {
  return !!context.isBypassPermissionsModeAvailable && !isBypassPermissionsModeDisabled();
}
/**
 * 计算下一个模式并调用 transitionPermissionMode 准备上下文（进入 auto 时剥离危险 allow 规则等），返回 {nextMode, context}。
 */
//@ chunk-n4pvm0gt.js:903-982 fingerprint = cyclePermissionMode (1)
function cyclePermissionMode(context, teamContext, trigger) {
  let nextMode = getNextPermissionMode_2(context, teamContext);
  return { nextMode: nextMode, context: transitionPermissionMode(context.mode, nextMode, context, trigger) };
}
/**
 * 可循环切换的权限模式列表：plan、default、acceptEdits，按条件加入 auto 与 bypassPermissions。
 */
//@ chunk-18hwfzwa.js:643256-643382 placement
function cyclePermissionModes(h) {
  let x = ["plan", "default", "acceptEdits"];
  if (canCycleToAuto(h)) x.push("auto");
  if (canCycleToBypassPermissions(h)) x.push("bypassPermissions");
  return x;
}
/**
 * 按可用权限模式列表（plan/default/acceptEdits，可加 auto、bypassPermissions）循环取下一个或上一个。旧版名 peek 为错配。
 */
//@ chunk-18hwfzwa.js:643382-643509 placement = peek (0.809)
function getNextPermissionMode(h, x) {
  let D = cyclePermissionModes(h),
    index = D.indexOf(h.mode);
  if (index === -1) return "default";
  return D[(index + (x === "next" ? 1 : -1) + D.length) % D.length];
}
/**
 * 主动性档位 → 启动权限模式：ask→auto（可用时）否则 default；default→auto（可用时）否则沿用基线模式（基线为 auto 或不可用的 bypass 时回 default）；proactive→bypassPermissions（可用时）→auto→acceptEdits。
 */
//@ chunk-kswt4qha.js:2557-2947 fingerprint = getNextPermissionMode (0.536)
function permissionModeForProactivityLevel(level, availability, baselineMode) {
  switch (level) {
    case "ask":
      return availability.isAutoModeAvailable ? "auto" : "default";
    case "default": {
      if (availability.isAutoModeAvailable) return "auto";
      let s = baselineMode ?? "default";
      if (s === "auto" || (s === "bypassPermissions" && !availability.isBypassPermissionsModeAvailable))
        return "default";
      return s;
    }
    case "proactive":
      if (availability.isBypassPermissionsModeAvailable) return "bypassPermissions";
      return availability.isAutoModeAvailable ? "auto" : "acceptEdits";
  }
}

export {
  canCycleToAuto,
  permissionModeForProactivityLevel,
  getNextPermissionMode,
  cyclePermissionMode,
  canCycleToBypassPermissions,
};
