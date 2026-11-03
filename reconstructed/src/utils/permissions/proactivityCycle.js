/**
 * utils/permissions/proactivityCycle.ts
 *
 * 权限模式切换循环（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g2tve833.js (4)
 * attribution: placement 4
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

//@ chunk-g2tve833.js:497-649 placement
/**
 * 按主动性等级计算下一权限模式，并给出切换后的权限上下文。
 */
function computeProactivityModeTransition(
  o,
  toolPermissionContext,
  { trigger: n, offerBypass: s = true } = {},
) {
  let t = nextPermissionMode(o, toolPermissionContext, {
    offerBypass: s,
  });
  return {
    level: o,
    currentMode: toolPermissionContext.mode,
    nextMode: t,
    context: transitionPermissionMode(toolPermissionContext.mode, t, toolPermissionContext, n),
  };
}
//@ chunk-g2tve833.js:649-1021 placement
function nextPermissionMode(level, context, { offerBypass: n = true } = {}) {
  let s = getHipaaPolicyVerdict() !== undefined;
  let t = context.mode === "plan" ? (context.prePlanMode ?? "plan") : context.mode;
  let i = permissionModeForProactivityLevel(
    level,
    {
      isAutoModeAvailable: canCycleToAuto(context),
      isBypassPermissionsModeAvailable:
        n && canCycleToBypassPermissions(context) && (!s || t === "bypassPermissions"),
    },
    context.proactivityBaseline?.mode,
  );
  let mode = context.proactivityBaseline?.mode;
  let d =
    i === "acceptEdits" && mode === "acceptEdits"
      ? mode
      : hasLeftProactivityBaseline(context)
        ? undefined
        : t;
  return getProactivityPolicyVerdict(level, i, d) === undefined ? i : "default";
}
//@ chunk-g2tve833.js:1021-1520 placement
/**
 * 设置主动性等级：更新 AppState 中的等级与权限模式，记遥测；模式变化或等级跨档时触发事件通知。
 */
function setProactivityLevel(o, e, n, { offerBypass: s = true } = {}) {
  let t;
  e((i) => {
    if (i.proactivityLevel === o) return i;
    let proactivityModeTransition = computeProactivityModeTransition(o, i.toolPermissionContext, {
      offerBypass: s,
    });
    t = {
      from: i.proactivityLevel,
      toMode: proactivityModeTransition.nextMode,
      modeChanged: proactivityModeTransition.nextMode !== proactivityModeTransition.currentMode,
    };
    return {
      ...i,
      proactivityLevel: o,
      toolPermissionContext: {
        ...proactivityModeTransition.context,
        mode: proactivityModeTransition.nextMode,
        startupModeDecidedByProactivityLevel: undefined,
      },
    };
  });
  if (t === undefined) return;
  logProactivityCycle(o, n, {
    source: "sdk_host",
    from: t.from,
    toMode: t.toMode,
  });
  if (t.modeChanged || isProactivityModeChange(t.from, o))
    setImmediate(() => {
      permissionModeSignal.emit();
    });
}
//@ chunk-g2tve833.js:1520-1672 placement
function logProactivityCycle(o, e, { source, from, toMode }) {
  noopWithArgs(o, e);
  logEvent("tengu_proactivity_cycle", {
    level: fromEnum(o),
    from: fromEnum(from),
    to_mode: fromEnum(toMode),
    source: fromEnum(source),
  });
  logFeatureOk("proactivity_cycle");
}
export { nextPermissionMode, computeProactivityModeTransition, setProactivityLevel };
