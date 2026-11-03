/**
 * components/AutoModeEnvOnboarding.tsx
 *
 * 2.1.316 新增。auto 模式环境引导对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: placement 10
 */
import {
  getAutoModeEnvOnboardingShownLogged,
  setAutoModeEnvOnboardingShownLogged,
  isAutoModeFromFallback,
  getAutoModeEnvOnboardingEligible,
} from "../utils/permissions/autoModeState.js";
import { logEvent } from "../services/analytics/index.js";
import { isAutoModeSetupNotOverridden } from "../commands/auto-mode-setup/index.js";
import { getAutoModeConfig } from "../utils/settings/settings.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import {
  shouldShowAutoDefaultNotice,
  AUTO_MODE_DEFAULT,
  shouldShowAutoModeEntryWarning,
} from "./LogoV2/AutoModeDefaultNotice.js";
import { hasNoticeImpression } from "./LogoV2/CondensedLogo.js";
import { isActingAsBgJob } from "../utils/concurrentSessions.js";
import { getIsRemoteMode } from "../bootstrap/state.js";
import { env } from "../utils/env.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useClock } from "../ink/components/ClockContext.js";
import { R, P } from "../../vendor/react/cjs/react.production.js";
import { Me } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:149072-149150 placement
function logAutoModeEnvOnboardingShown() {
  if (!getAutoModeEnvOnboardingShownLogged())
    (setAutoModeEnvOnboardingShownLogged(!0), logEvent("tengu_auto_mode_env_onboarding_shown", {}));
}
//@ chunk-18hwfzwa.js:149150-149205 placement
function QOt(io) {
  return { ...io, autoModeEnvSetup: void 0 };
}
//@ chunk-18hwfzwa.js:149205-149301 placement
function zOt(so) {
  return { ...so, autoModeEnvSetup: { ...so.autoModeEnvSetup, dismissedAt: Date.now() } };
}
//@ chunk-18hwfzwa.js:149301-149387 placement
function YOt(po) {
  return { ...po, autoModeEnvSetup: { ...po.autoModeEnvSetup, dismissed: !0 } };
}
//@ chunk-18hwfzwa.js:149387-149417 placement
var HOt = 604800000,
  UOt = 5,
  Kse = 5;
//@ chunk-18hwfzwa.js:149417-149719 placement
function shouldOfferAutoModeEnvOnboarding() {
  if (!isAutoModeSetupNotOverridden()) return !1;
  if ((getAutoModeConfig()?.environment?.length ?? 0) > 0) return !1;
  let h = getGlobalConfig();
  if (h.numStartups < UOt) return !1;
  if ((h.autoModeEnvSetup?.denials ?? 0) < Kse) return !1;
  if (getStartupAutoModeOffer()) return !1;
  let autoModeEnvSetup = h.autoModeEnvSetup;
  if (autoModeEnvSetup?.dismissed) return !1;
  if (autoModeEnvSetup?.dismissedAt && Date.now() - autoModeEnvSetup.dismissedAt < HOt) return !1;
  return !0;
}
/**
 * 启动时是否提供 auto 模式选项：来自回退时看 atn("auto") 或 nAr，否则看 qgo（UI 层逻辑，误归入 types/permissions）。
 */
//@ chunk-18hwfzwa.js:149719-149784 placement = INTERNAL_PERMISSION_MODES (1)
function getStartupAutoModeOffer() {
  if (isAutoModeFromFallback())
    return shouldShowAutoDefaultNotice("auto") || hasNoticeImpression(AUTO_MODE_DEFAULT);
  return shouldShowAutoModeEntryWarning();
}
/**
 * 判断是否该显示 auto 模式环境引导：符合资格、当前权限模式是 auto、不在查看子代理、不是后台任务/远程模式/桥接重连会话，且服务端建议显示。
 */
//@ chunk-18hwfzwa.js:149784-149935 placement
function shouldShowAutoModeEnvOnboarding(h) {
  return (
    getAutoModeEnvOnboardingEligible() === !0 &&
    h.toolPermissionContext.mode === "auto" &&
    !h.viewingAgentTaskId &&
    !isActingAsBgJob() &&
    !getIsRemoteMode() &&
    !env.CLAUDE_BRIDGE_REATTACH_SESSION &&
    shouldOfferAutoModeEnvOnboarding()
  );
}
//@ chunk-18hwfzwa.js:149935-149947 placement
var CBe = 500;
//@ chunk-18hwfzwa.js:149947-151490 placement
function AutoModeEnvOnboardingDialog(h) {
  let $ = w(21),
    { onAccept: onAccept, onLater: onLater, onDismiss: onDismiss } = h,
    ee = useClock(),
    Re;
  if ($[0] !== ee) ((Re = ee.now()), ($[0] = ee), ($[1] = Re));
  else Re = $[1];
  let Be = R(Re),
    { storageV5: storageV5 } = Me(),
    We;
  if ($[2] === MEMO_CACHE_SENTINEL) ((We = []), ($[2] = We));
  else We = $[2];
  P(logAutoModeEnvOnboardingShown, We);
  let ze;
  if ($[3] !== ee || $[4] !== onAccept || $[5] !== onDismiss || $[6] !== onLater || $[7] !== storageV5)
    ((ze = function It(Xe) {
      let now = ee.now();
      let kt = Be.current;
      if (((Be.current = Math.max(now, kt)), now - kt < CBe)) {
        return;
      }
      At: switch (Xe) {
        case "accept": {
          if ((logEvent("tengu_auto_mode_env_onboarding_accept", {}), getGlobalConfig().autoModeEnvSetup))
            saveGlobalConfig(QOt, storageV5);
          onAccept();
          break At;
        }
        case "later": {
          (logEvent("tengu_auto_mode_env_onboarding_later", {}), saveGlobalConfig(zOt, storageV5), onLater());
          break At;
        }
        case "dismiss": {
          (logEvent("tengu_auto_mode_env_onboarding_dismiss", {}),
            saveGlobalConfig(YOt, storageV5),
            onDismiss());
        }
      }
    }),
      ($[3] = ee),
      ($[4] = onAccept),
      ($[5] = onDismiss),
      ($[6] = onLater),
      ($[7] = storageV5),
      ($[8] = ze));
  else ze = $[8];
  let It = ze,
    Ot;
  if ($[9] !== It) ((Ot = () => It("later")), ($[9] = It), ($[10] = Ot));
  else Ot = $[10];
  let Et;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((Et = e(Box, {
      flexDirection: "column",
      gap: 1,
      children: e(Text, {
        children: "Auto mode works better when it knows your environment. Takes about a minute.",
      }),
    })),
      ($[11] = Et));
  else Et = $[11];
  let Dt;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((Dt = [
      { label: "Yes", value: "accept" },
      { label: "Not now", value: "later" },
      { label: "Don't show again", value: "dismiss" },
    ]),
      ($[12] = Dt));
  else Dt = $[12];
  let Lt;
  if ($[13] !== It) ((Lt = () => It("later")), ($[13] = It), ($[14] = Lt));
  else Lt = $[14];
  let oo;
  if ($[15] !== It || $[16] !== Lt)
    ((oo = e(ModelSelector, { options: Dt, onChange: It, onCancel: Lt })),
      ($[15] = It),
      ($[16] = Lt),
      ($[17] = oo));
  else oo = $[17];
  let Xt;
  if ($[18] !== Ot || $[19] !== oo)
    ((Xt = r(Dialog, { title: "Teach auto mode about your environment?", onCancel: Ot, children: [Et, oo] })),
      ($[18] = Ot),
      ($[19] = oo),
      ($[20] = Xt));
  else Xt = $[20];
  return Xt;
}

export {
  shouldOfferAutoModeEnvOnboarding,
  AutoModeEnvOnboardingDialog,
  shouldShowAutoModeEnvOnboarding,
  Kse,
};
