/**
 * components/AutoModeEnvOnboarding.tsx
 *
 * 2.1.316 新增。auto 模式环境引导对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (10)
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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-czq1j3j2.js:153167-153245 placement
function logAutoModeEnvOnboardingShown() {
  if (!getAutoModeEnvOnboardingShownLogged()) {
    setAutoModeEnvOnboardingShownLogged(true);
    logEvent("tengu_auto_mode_env_onboarding_shown", {});
  }
}
//@ chunk-czq1j3j2.js:153245-153300 placement
function clearAutoModeEnvPrompt(state) {
  return {
    ...state,
    autoModeEnvSetup: undefined,
  };
}
//@ chunk-czq1j3j2.js:153300-153396 placement
function dismissAutoModeEnvPrompt(state) {
  return {
    ...state,
    autoModeEnvSetup: {
      ...state.autoModeEnvSetup,
      dismissedAt: Date.now(),
    },
  };
}
//@ chunk-czq1j3j2.js:153396-153482 placement
function markAutoModeEnvPromptDismissed(state) {
  return {
    ...state,
    autoModeEnvSetup: {
      ...state.autoModeEnvSetup,
      dismissed: true,
    },
  };
}
//@ chunk-czq1j3j2.js:153482-153512 placement
var AUTO_MODE_ENV_DISMISS_TTL_MS = 604800000;
var MIN_STARTUPS_TO_PROMPT = 5;
var MIN_DENIALS_TO_PROMPT = 5;
//@ chunk-czq1j3j2.js:153512-153814 placement
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
//@ chunk-czq1j3j2.js:153814-153879 placement (2.1.88 match: parseDimension, 1)
/**
 * 启动时是否提供 auto 模式选项：来自回退时看 atn("auto") 或 nAr，否则看 qgo（UI 层逻辑，误归入 types/permissions）。
 */
function getStartupAutoModeOffer() {
  if (isAutoModeFromFallback())
    return shouldShowAutoDefaultNotice("auto") || hasNoticeImpression(AUTO_MODE_DEFAULT);
  return shouldShowAutoModeEntryWarning();
}
//@ chunk-czq1j3j2.js:153879-154030 placement
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
//@ chunk-czq1j3j2.js:154030-154042 placement
var AUTO_MODE_ENV_NOTICE_DEBOUNCE_MS = 500;
//@ chunk-czq1j3j2.js:154042-155585 placement
function AutoModeEnvOnboardingDialog(props) {
  let $ = useMemoCache(21);
  let { onAccept, onLater, onDismiss } = props;
  let clock = useClock();
  let now;
  if ($[0] !== clock) {
    now = clock.now();
    $[0] = clock;
    $[1] = now;
  } else now = $[1];
  let lastShownAtRef = useRef(now);
  let { storageV5 } = useTheme_2();
  let shownDeps;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    shownDeps = [];
    $[2] = shownDeps;
  } else shownDeps = $[2];
  useEffect(logAutoModeEnvOnboardingShown, shownDeps);
  let handleChoose;
  if ($[3] !== clock || $[4] !== onAccept || $[5] !== onDismiss || $[6] !== onLater || $[7] !== storageV5) {
    handleChoose = function choice(now) {
      let previousShownAt = clock.now();
      let lastShownAt = lastShownAtRef.current;
      lastShownAtRef.current = Math.max(previousShownAt, lastShownAt);
      if (previousShownAt - lastShownAt < AUTO_MODE_ENV_NOTICE_DEBOUNCE_MS) {
        return;
      }
      Rt: switch (now) {
        case "accept": {
          logEvent("tengu_auto_mode_env_onboarding_accept", {});
          if (getGlobalConfig().autoModeEnvSetup) saveGlobalConfig(clearAutoModeEnvPrompt, storageV5);
          onAccept();
          break Rt;
        }
        case "later": {
          logEvent("tengu_auto_mode_env_onboarding_later", {});
          saveGlobalConfig(dismissAutoModeEnvPrompt, storageV5);
          onLater();
          break Rt;
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
    $[8] = handleChoose;
  } else handleChoose = $[8];
  let choose = handleChoose;
  let onCancel;
  if ($[9] !== choose) {
    onCancel = () => choose("later");
    $[9] = choose;
    $[10] = onCancel;
  } else onCancel = $[10];
  let introBox;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    introBox = jsxProd_default(Box, {
      flexDirection: "column",
      gap: 1,
      children: jsxProd_default(Text, {
        children: "Auto mode works better when it knows your environment. Takes about a minute.",
      }),
    });
    $[11] = introBox;
  } else introBox = $[11];
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
  if ($[13] !== choose) {
    onCancel_2 = () => choose("later");
    $[13] = choose;
    $[14] = onCancel_2;
  } else onCancel_2 = $[14];
  let selector;
  if ($[15] !== choose || $[16] !== onCancel_2) {
    selector = jsxProd_default(ModelSelector, {
      options,
      onChange: choose,
      onCancel: onCancel_2,
    });
    $[15] = choose;
    $[16] = onCancel_2;
    $[17] = selector;
  } else selector = $[17];
  let dialog;
  if ($[18] !== onCancel || $[19] !== selector) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Teach auto mode about your environment?",
      onCancel,
      children: [introBox, selector],
    });
    $[18] = onCancel;
    $[19] = selector;
    $[20] = dialog;
  } else dialog = $[20];
  return dialog;
}
export {
  shouldOfferAutoModeEnvOnboarding,
  AutoModeEnvOnboardingDialog,
  MIN_DENIALS_TO_PROMPT,
  shouldShowAutoModeEnvOnboarding,
};
