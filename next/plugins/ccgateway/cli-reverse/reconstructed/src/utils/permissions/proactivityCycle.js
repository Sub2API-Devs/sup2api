/**
 * utils/permissions/proactivityCycle.ts
 *
 * 权限模式切换循环（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9wvx26mj.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  transitionPermissionMode,
  getHipaaPolicyVerdict,
  getProactivityPolicyVerdict,
  permissionModeSignal,
} from "./permissionSetup.js";
import {
  permissionModeForProactivityLevel,
  canCycleToAuto,
  canCycleToBypassPermissions,
} from "./getNextPermissionMode.js";
import { hasLeftProactivityBaseline, isProactivityModeChange } from "./permissions.js";
import { noopWithArgs } from "../../keybindings/cycleModeBinding.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-9wvx26mj.js:497-649 placement
/**
 * 按主动性等级计算下一权限模式，并给出切换后的权限上下文。
 */
function computeProactivityModeTransition(
  level,
  toolPermissionContext,
  { trigger, offerBypass = true } = {},
) {
  let nextMode = nextPermissionMode(level, toolPermissionContext, {
    offerBypass,
  });
  return {
    level,
    currentMode: toolPermissionContext.mode,
    nextMode,
    context: transitionPermissionMode(toolPermissionContext.mode, nextMode, toolPermissionContext, trigger),
  };
}
//@ chunk-9wvx26mj.js:649-1021 placement
function nextPermissionMode(level, context, { offerBypass = true } = {}) {
  let hipaaPending = getHipaaPolicyVerdict() !== undefined;
  let baseMode = context.mode === "plan" ? (context.prePlanMode ?? "plan") : context.mode;
  let levelMode = permissionModeForProactivityLevel(
    level,
    {
      isAutoModeAvailable: canCycleToAuto(context),
      isBypassPermissionsModeAvailable:
        offerBypass &&
        canCycleToBypassPermissions(context) &&
        (!hipaaPending || baseMode === "bypassPermissions"),
    },
    context.proactivityBaseline?.mode,
  );
  let mode = context.proactivityBaseline?.mode;
  let baselineMode =
    levelMode === "acceptEdits" && mode === "acceptEdits"
      ? mode
      : hasLeftProactivityBaseline(context)
        ? undefined
        : baseMode;
  return getProactivityPolicyVerdict(level, levelMode, baselineMode) === undefined ? levelMode : "default";
}
//@ chunk-9wvx26mj.js:1021-1520 placement
/**
 * 设置主动性等级：更新 AppState 中的等级与权限模式，记遥测；模式变化或等级跨档时触发事件通知。
 */
function setProactivityLevel(level, setAppState, context, { offerBypass = true } = {}) {
  let change;
  setAppState((state) => {
    if (state.proactivityLevel === level) return state;
    let proactivityModeTransition = computeProactivityModeTransition(level, state.toolPermissionContext, {
      offerBypass,
    });
    change = {
      from: state.proactivityLevel,
      toMode: proactivityModeTransition.nextMode,
      modeChanged: proactivityModeTransition.nextMode !== proactivityModeTransition.currentMode,
    };
    return {
      ...state,
      proactivityLevel: level,
      toolPermissionContext: {
        ...proactivityModeTransition.context,
        mode: proactivityModeTransition.nextMode,
        startupModeDecidedByProactivityLevel: undefined,
      },
    };
  });
  if (change === undefined) return;
  logProactivityCycle(level, context, {
    source: "sdk_host",
    from: change.from,
    toMode: change.toMode,
  });
  if (change.modeChanged || isProactivityModeChange(change.from, level))
    setImmediate(() => {
      permissionModeSignal.emit();
    });
}
//@ chunk-9wvx26mj.js:1520-1672 placement
function logProactivityCycle(level, context, { source, from, toMode }) {
  noopWithArgs(level, context);
  logEvent("tengu_proactivity_cycle", {
    level: fromEnum(level),
    from: fromEnum(from),
    to_mode: fromEnum(toMode),
    source: fromEnum(source),
  });
  logFeatureOk("proactivity_cycle");
}
export { computeProactivityModeTransition, setProactivityLevel, nextPermissionMode };
