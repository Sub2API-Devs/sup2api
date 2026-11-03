/**
 * cli/print/autoDefaultNudge.ts
 *
 * 2.1.316 新增。处理宿主发来的"默认改为 auto 模式"提示事件，记录展示与用户接受/拒绝（tengu_auto_default_nudge_*）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2b4rzray.js (2)
 * attribution: placement 2
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getSettingsForSource, updateSettingsForSource } from "../../utils/settings/settings.js";
import { canCycleToAuto } from "../../utils/permissions/getNextPermissionMode.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";

//@ chunk-2b4rzray.js:416-782 placement
function shouldShowAutoDefaultNudge(u, { requireOnboarding: n = !0 } = {}) {
  let o = getGlobalConfig();
  if (
    (n && !o.hasCompletedOnboarding) ||
    o.hasSeenAutoDefaultNudge ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_maple_pier", !0)
  )
    return null;
  let e = getSettingsForSource("userSettings")?.permissions?.defaultMode,
    any = ["projectSettings", "localSettings", "flagSettings", "policySettings"].some(
      (r) => getSettingsForSource(r)?.permissions?.defaultMode,
    );
  if (e && e !== "auto" && !any && canCycleToAuto(u)) return e;
  return null;
}
/**
 * auto 模式默认开启提示：accept 写 userSettings 为 auto，decline 保持；记录 tengu_auto_default_nudge_shown。
 */
//@ chunk-2b4rzray.js:782-1298 placement = AutoModeOptInDialog (0.312)
function handleAutoDefaultNudgeEventFromHost(u, n, o) {
  if (getGlobalConfig().hasSeenAutoDefaultNudge) return;
  let e = parsePermissionMode(n.current_mode);
  if (u === "shown") {
    logEvent("tengu_auto_default_nudge_shown", { current_mode: fromEnumOpt(e), surface: lit("ide") });
    return;
  }
  let t6 = n.choice === "accept" ? "accept" : "decline";
  if (t6 === "accept")
    updateSettingsForSource("userSettings", { permissions: { defaultMode: "auto" } }, void 0, o);
  (saveGlobalConfig(
    (value_0) => (value_0.hasSeenAutoDefaultNudge ? value_0 : { ...value_0, hasSeenAutoDefaultNudge: !0 }),
    o,
  ),
    logEvent("tengu_auto_default_nudge_resolved", {
      choice: lit(t6),
      outcome: t6 === "accept" ? lit("switched") : lit("declined"),
      current_mode: fromEnumOpt(e),
      surface: lit("ide"),
    }));
}

export { handleAutoDefaultNudgeEventFromHost, shouldShowAutoDefaultNudge };
