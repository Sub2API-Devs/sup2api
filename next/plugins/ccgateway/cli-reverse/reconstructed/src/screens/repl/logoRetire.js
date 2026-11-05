/**
 * screens/repl/logoRetire.ts
 *
 * 首页 logo 退场的阶段机（home/logo/leaving/gone）与淡出计时，按 reducedMotion 决定是否淡出（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 */
import { usePrefersReducedMotion } from "../../components/Spinner/spinnerFlags.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { announcementState } from "../../services/announcements/announcementState.js";

//@ chunk-czq1j3j2.js:1484017-1484028 placement
var LOGO_LEAVE_STEP_MS = 90;
//@ chunk-czq1j3j2.js:1484028-1484213 placement
/**
 * 由当前阶段与是否主会话推出 logo 的下一阶段（home/logo/gone/leaving）。
 */
function nextLogoPhase(phase, { isHome, wasHome, isMain, hasConversationStarted, reducedMotion }) {
  if (isHome) return "home";
  if (phase === "home" && isMain) {
    if (!hasConversationStarted) return "logo";
    return reducedMotion || !wasHome ? "gone" : "leaving";
  }
  return phase;
}
//@ chunk-czq1j3j2.js:1484213-1484668 placement
/**
 * 首页 logo 的退场阶段机：home → logo → leaving → gone，按 reducedMotion 决定是否淡出。
 */
function useLogoRetirement(retireLogoEffect) {
  let reducedMotion = usePrefersReducedMotion();
  let clock = useClock();
  let [phase, setPhase] = useState(() => (announcementState().isLogoRetired ? "gone" : "logo"));
  let [fadeStep, setFadeStep] = useState(1);
  let [isHome, setIsHome] = useState(retireLogoEffect.isHome);
  if (isHome !== retireLogoEffect.isHome) setIsHome(retireLogoEffect.isHome);
  let nextPhase = nextLogoPhase(phase, {
    ...retireLogoEffect,
    wasHome: isHome,
    reducedMotion,
  });
  if (nextPhase !== phase) {
    setPhase(nextPhase);
    if (nextPhase === "leaving") setFadeStep(1);
  }
  useEffect(() => {
    if (nextPhase !== "leaving") return;
    return clock.setTimeout(() => {
      if (fadeStep === 1) setFadeStep(2);
      else setPhase("gone");
    }, LOGO_LEAVE_STEP_MS);
  }, [nextPhase, fadeStep, clock]);
  useEffect(() => {
    if (nextPhase === "leaving" || nextPhase === "gone") announcementState().isLogoRetired = true;
  }, [nextPhase]);
  return {
    phase: nextPhase,
    fadeStep: nextPhase === "leaving" ? fadeStep : 0,
  };
}
export { useLogoRetirement };
