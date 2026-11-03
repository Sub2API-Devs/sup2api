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
  aF,
} from "./permissionSetup.js";
import {
  permissionModeForProactivityLevel,
  canCycleToAuto,
  canCycleToBypassPermissions,
} from "./getNextPermissionMode.js";
import { hasLeftProactivityBaseline, W5s } from "./permissions.js";
import { c$s } from "../../keybindings/cycleModeBinding.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

/**
 * 按主动性等级计算下一权限模式，并给出切换后的权限上下文。
 */
//@ chunk-g2tve833.js:497-649 placement
function computeProactivityModeTransition(o, e, { trigger: n, offerBypass: s = !0 } = {}) {
  let t = nextPermissionMode(o, e, { offerBypass: s });
  return { level: o, currentMode: e.mode, nextMode: t, context: transitionPermissionMode(e.mode, t, e, n) };
}
//@ chunk-g2tve833.js:649-1021 placement
function nextPermissionMode(o, e, { offerBypass: n = !0 } = {}) {
  let s = getHipaaPolicyVerdict() !== void 0,
    t = e.mode === "plan" ? (e.prePlanMode ?? "plan") : e.mode,
    i = permissionModeForProactivityLevel(
      o,
      {
        isAutoModeAvailable: canCycleToAuto(e),
        isBypassPermissionsModeAvailable:
          n && canCycleToBypassPermissions(e) && (!s || t === "bypassPermissions"),
      },
      e.proactivityBaseline?.mode,
    ),
    r = e.proactivityBaseline?.mode,
    d = i === "acceptEdits" && r === "acceptEdits" ? r : hasLeftProactivityBaseline(e) ? void 0 : t;
  return getProactivityPolicyVerdict(o, i, d) === void 0 ? i : "default";
}
/**
 * 设置主动性等级：更新 AppState 中的等级与权限模式，记遥测；模式变化或等级跨档时触发事件通知。
 */
//@ chunk-g2tve833.js:1021-1520 placement
function setProactivityLevel(o, e, n, { offerBypass: s = !0 } = {}) {
  let t;
  if (
    (e((i) => {
      if (i.proactivityLevel === o) return i;
      let r = computeProactivityModeTransition(o, i.toolPermissionContext, { offerBypass: s });
      return (
        (t = { from: i.proactivityLevel, toMode: r.nextMode, modeChanged: r.nextMode !== r.currentMode }),
        {
          ...i,
          proactivityLevel: o,
          toolPermissionContext: {
            ...r.context,
            mode: r.nextMode,
            startupModeDecidedByProactivityLevel: void 0,
          },
        }
      );
    }),
    t === void 0)
  )
    return;
  if (
    (logProactivityCycle(o, n, { source: "sdk_host", from: t.from, toMode: t.toMode }),
    t.modeChanged || W5s(t.from, o))
  )
    setImmediate(() => {
      aF.emit();
    });
}
//@ chunk-g2tve833.js:1520-1672 placement
function logProactivityCycle(o, e, { source: source, from: from, toMode: toMode }) {
  (c$s(o, e),
    logEvent("tengu_proactivity_cycle", {
      level: fromEnum(o),
      from: fromEnum(from),
      to_mode: fromEnum(toMode),
      source: fromEnum(source),
    }),
    logFeatureOk("proactivity_cycle"));
}

export { nextPermissionMode, computeProactivityModeTransition, setProactivityLevel };
