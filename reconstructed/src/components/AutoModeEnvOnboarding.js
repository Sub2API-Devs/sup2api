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
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:149072-149150 placement
function logAutoModeEnvOnboardingShown() {
  if (!getAutoModeEnvOnboardingShownLogged()) {
    setAutoModeEnvOnboardingShownLogged(true);
    logEvent("tengu_auto_mode_env_onboarding_shown", {});
  }
}
//@ chunk-18hwfzwa.js:149150-149205 placement
function clearAutoModeEnvPrompt(io) {
  return {
    ...io,
    autoModeEnvSetup: undefined,
  };
}
//@ chunk-18hwfzwa.js:149205-149301 placement
function dismissAutoModeEnvPrompt(so) {
  return {
    ...so,
    autoModeEnvSetup: {
      ...so.autoModeEnvSetup,
      dismissedAt: Date.now(),
    },
  };
}
//@ chunk-18hwfzwa.js:149301-149387 placement
function markAutoModeEnvPromptDismissed(po) {
  return {
    ...po,
    autoModeEnvSetup: {
      ...po.autoModeEnvSetup,
      dismissed: true,
    },
  };
}
//@ chunk-18hwfzwa.js:149387-149417 placement
var AUTO_MODE_ENV_DISMISS_TTL_MS = 604800000;
var MIN_STARTUPS_TO_PROMPT = 5;
var MIN_DENIALS_TO_PROMPT = 5;
//@ chunk-18hwfzwa.js:149417-149719 placement
function shouldOfferAutoModeEnvOnboarding() {
  if (!isAutoModeSetupNotOverridden()) return false;
  if ((getAutoModeConfig()?.environment?.length ?? 0) > 0) return false;
  let globalConfig = getGlobalConfig();
  if (globalConfig.numStartups < MIN_STARTUPS_TO_PROMPT) return false;
  if ((globalConfig.autoModeEnvSetup?.denials ?? 0) < MIN_DENIALS_TO_PROMPT) return false;
  if (getStartupAutoModeOffer()) return false;
  let autoModeEnvSetup = globalConfig.autoModeEnvSetup;
  if (autoModeEnvSetup?.dismissed) return false;
  if (
    autoModeEnvSetup?.dismissedAt &&
    Date.now() - autoModeEnvSetup.dismissedAt < AUTO_MODE_ENV_DISMISS_TTL_MS
  )
    return false;
  return true;
}
//@ chunk-18hwfzwa.js:149719-149784 placement = INTERNAL_PERMISSION_MODES (1)
/**
 * 启动时是否提供 auto 模式选项：来自回退时看 atn("auto") 或 nAr，否则看 qgo（UI 层逻辑，误归入 types/permissions）。
 */
function getStartupAutoModeOffer() {
  if (isAutoModeFromFallback())
    return shouldShowAutoDefaultNotice("auto") || hasNoticeImpression(AUTO_MODE_DEFAULT);
  return shouldShowAutoModeEntryWarning();
}
//@ chunk-18hwfzwa.js:149784-149935 placement
/**
 * 判断是否该显示 auto 模式环境引导：符合资格、当前权限模式是 auto、不在查看子代理、不是后台任务/远程模式/桥接重连会话，且服务端建议显示。
 */
function shouldShowAutoModeEnvOnboarding(state) {
  return (
    getAutoModeEnvOnboardingEligible() === true &&
    state.toolPermissionContext.mode === "auto" &&
    !state.viewingAgentTaskId &&
    !isActingAsBgJob() &&
    !getIsRemoteMode() &&
    !env.CLAUDE_BRIDGE_REATTACH_SESSION &&
    shouldOfferAutoModeEnvOnboarding()
  );
}
//@ chunk-18hwfzwa.js:149935-149947 placement
var AUTO_MODE_ENV_NOTICE_DEBOUNCE_MS = 500;
//@ chunk-18hwfzwa.js:149947-151490 placement
function AutoModeEnvOnboardingDialog(props) {
  let $ = w(21);
  let { onAccept, onLater, onDismiss } = props;
  let clock = useClock();
  let Re;
  if ($[0] !== clock) {
    Re = clock.now();
    $[0] = clock;
    $[1] = Re;
  } else Re = $[1];
  let Be = R(Re);
  let { storageV5 } = useTheme_2();
  let We;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    We = [];
    $[2] = We;
  } else We = $[2];
  P(logAutoModeEnvOnboardingShown, We);
  let ze;
  if ($[3] !== clock || $[4] !== onAccept || $[5] !== onDismiss || $[6] !== onLater || $[7] !== storageV5) {
    ze = function It(Xe) {
      let rt = clock.now();
      let kt = Be.current;
      Be.current = Math.max(rt, kt);
      if (rt - kt < AUTO_MODE_ENV_NOTICE_DEBOUNCE_MS) {
        return;
      }
      At: switch (Xe) {
        case "accept": {
          logEvent("tengu_auto_mode_env_onboarding_accept", {});
          if (getGlobalConfig().autoModeEnvSetup) saveGlobalConfig(clearAutoModeEnvPrompt, storageV5);
          onAccept();
          break At;
        }
        case "later": {
          logEvent("tengu_auto_mode_env_onboarding_later", {});
          saveGlobalConfig(dismissAutoModeEnvPrompt, storageV5);
          onLater();
          break At;
        }
        case "dismiss": {
          logEvent("tengu_auto_mode_env_onboarding_dismiss", {});
          saveGlobalConfig(markAutoModeEnvPromptDismissed, storageV5);
          onDismiss();
        }
      }
    };
    $[3] = clock;
    $[4] = onAccept;
    $[5] = onDismiss;
    $[6] = onLater;
    $[7] = storageV5;
    $[8] = ze;
  } else ze = $[8];
  let It = ze;
  let onCancel;
  if ($[9] !== It) {
    onCancel = () => It("later");
    $[9] = It;
    $[10] = onCancel;
  } else onCancel = $[10];
  let Et;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    Et = jsxProd_default(Box, {
      flexDirection: "column",
      gap: 1,
      children: jsxProd_default(Text, {
        children: "Auto mode works better when it knows your environment. Takes about a minute.",
      }),
    });
    $[11] = Et;
  } else Et = $[11];
  let options;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Yes",
        value: "accept",
      },
      {
        label: "Not now",
        value: "later",
      },
      {
        label: "Don't show again",
        value: "dismiss",
      },
    ];
    $[12] = options;
  } else options = $[12];
  let onCancel_2;
  if ($[13] !== It) {
    onCancel_2 = () => It("later");
    $[13] = It;
    $[14] = onCancel_2;
  } else onCancel_2 = $[14];
  let oo;
  if ($[15] !== It || $[16] !== onCancel_2) {
    oo = jsxProd_default(ModelSelector, {
      options,
      onChange: It,
      onCancel: onCancel_2,
    });
    $[15] = It;
    $[16] = onCancel_2;
    $[17] = oo;
  } else oo = $[17];
  let Xt;
  if ($[18] !== onCancel || $[19] !== oo) {
    Xt = jsxProd_default_2(Dialog, {
      title: "Teach auto mode about your environment?",
      onCancel,
      children: [Et, oo],
    });
    $[18] = onCancel;
    $[19] = oo;
    $[20] = Xt;
  } else Xt = $[20];
  return Xt;
}
export {
  shouldOfferAutoModeEnvOnboarding,
  AutoModeEnvOnboardingDialog,
  shouldShowAutoModeEnvOnboarding,
  MIN_DENIALS_TO_PROMPT,
};
