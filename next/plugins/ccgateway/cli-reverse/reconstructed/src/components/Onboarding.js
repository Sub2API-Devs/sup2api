/**
 * components/Onboarding.tsx
 *
 * 首次启动引导：主题、登录/OAuth、安全说明、终端设置等可跳过步骤。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Onboarding.tsx
 * pieces: chunk-f284hj51.js (1), chunk-s0v4e2v6.js (10)
 * attribution: fingerprint 2, placement 6, sole-consumer 2, affinity 1
 */
import { resetStateForTests, resetStateLogPrefix } from "../cli/handlers/pluginTest/engineShim.js";
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { OrderedListComponent } from "./ui/OrderedList.js";
import { OrderedListItem } from "./ui/OrderedListItem.js";
import {
  isGatewayLoginForced,
  isAnthropicAuthEnabled,
  adminPolicyUnreadable,
  hasExistingSignIn,
  getUnapprovedCustomApiKey,
} from "../utils/auth.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getGatewayAuth } from "../bootstrap/state.js";
import { getUserSettingsGateway } from "../services/gateway/gatewayCredentialStore.js";
import { useTheme, useThemeSetting, useTheme_2 } from "./design-system/ThemeProvider.js";
import { logEvent } from "../services/analytics/index.js";
import { computeRemoteSettingsEligibility } from "../services/cloudSessions/eligibility.js";
import { isRemoteManagedSettingsVerified } from "../services/remoteManagedSettings/remoteSettingsState.js";
import { fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { isConfigSetHooked } from "../plugins/functionHooks/configApi.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { ThemePicker } from "./ThemePicker.js";
import { Newline } from "../ink/components/Input.js";
import { LearnMoreLink } from "./LearnMoreLink.js";
import { PreflightStep } from "../utils/preflightChecks.js";
import { ApproveApiKey } from "./ApproveApiKey.js";
import { NoticeUnderScene } from "./design-system/NoticeUnderScene.js";
import { ConsoleOAuthFlow } from "./ConsoleOAuthFlow.js";
import { shouldOfferTerminalSetup, setupTerminal } from "../commands/terminalSetup/terminalSetup.js";
import { env } from "../utils/env.js";
import { isScreenReaderMode } from "../utils/accessibility/screenReader.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { WelcomeV2 } from "./LogoV2/WelcomeV2.js";
import { StatusRow } from "./Settings/Status.js";
import { deferInit, beginDeferredInits, runDeferredInits } from "../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 5 modules closed by ../cli/handlers/pluginTest/runner.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/cli/handlers/pluginTest/runner.js");
//@ chunk-f284hj51.js:23921-24076 fingerprint (2.1.88 match: SkippableStep, 0.479)
function SkippableStep(t0) {
  let { plugin, event, reason, skip } = t0;
  let isResetState = plugin === resetStateForTests && skip?.kind === "shape";
  let text = reason.startsWith(resetStateLogPrefix) ? reason.slice(resetStateLogPrefix.length) : reason;
  return isResetState
    ? {
        text,
        event,
      }
    : undefined;
}
//@ chunk-s0v4e2v6.js:17390-17394 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s0v4e2v6.js:17390", () => {
  init_react_production();
});
//@ chunk-s0v4e2v6.js:17394-17398 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s0v4e2v6.js:17394", () => {
  init_react_production();
});
//@ chunk-s0v4e2v6.js:20187-20354 placement
function PressEnterToContinue() {
  let $ = useMemoCache(1);
  let hintElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    hintElement = jsxProd_default_2(Text, {
      color: "permission",
      children: [
        "Press ",
        jsxProd_default(Text, {
          bold: true,
          children: "Enter",
        }),
        " to continue\u2026",
      ],
    });
    $[0] = hintElement;
  } else hintElement = $[0];
  return hintElement;
}
//@ chunk-s0v4e2v6.js:20354-20358 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s0v4e2v6.js:20354", () => {
  init_react_production();
});
//@ chunk-s0v4e2v6.js:20358-20362 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s0v4e2v6.js:20358", () => {
  init_react_production();
});
//@ chunk-s0v4e2v6.js:20362-20366 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s0v4e2v6.js:20362", () => {
  init_react_production();
});
//@ chunk-s0v4e2v6.js:21311-21320 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s0v4e2v6.js:21311", () => {
  OrderedListComponent.Item = OrderedListItem;
});
//@ chunk-s0v4e2v6.js:21320-21328 sole-consumer
var OnboardingInner = OrderedListComponent;
//@ chunk-s0v4e2v6.js:21328-21343 affinity
function noop() {}
//@ chunk-s0v4e2v6.js:21343-24938 fingerprint (2.1.88 match: Onboarding, 0.626)
/**
 * 首次引导：依次展示主题选择、登录（OAuth/网关）、安全须知、终端设置（shift+enter 等）等步骤，记录 tengu_began_setup/tengu_onboarding_step。
 */
function Onboarding({ host, onDone, orgConfigGateFollows = false }) {
  let [currentStepIndex, setCurrentStepIndex] = useState(0);
  let [gatewayForced] = useState(() => isGatewayLoginForced());
  let [authEnabled] = useState(
    () => isAnthropicAuthEnabled() || (gatewayForced && getAPIProvider() === "gateway" && !getGatewayAuth()),
  );
  let [hasAdminPolicy] = useState(
    () => gatewayForced || adminPolicyUnreadable() || getUserSettingsGateway() !== undefined,
  );
  let [showApiKeyNotice] = useState(() => false);
  let skippedSignInRef = useRef(false);
  let didCompleteRef = useRef(false);
  let [themeName, setThemeName] = useTheme();
  let themeSetting = useThemeSetting();
  let [errorMessage, setErrorMessage] = useState();
  let { storageV5 } = useTheme_2();
  useEffect(() => {
    logEvent("tengu_began_setup", {
      oauthEnabled: authEnabled,
    });
  }, [authEnabled]);
  function goToNextStep(count = 1) {
    let nextIndex = currentStepIndex + count;
    let skipOauth = false;
    if (steps[nextIndex]?.id === "oauth")
      try {
        skipOauth =
          (!computeRemoteSettingsEligibility() || isRemoteManagedSettingsVerified()) && hasExistingSignIn();
      } catch {
        skipOauth = false;
      }
    if (skipOauth) {
      skippedSignInRef.current = true;
      nextIndex++;
    }
    if (nextIndex < steps.length) {
      setCurrentStepIndex(nextIndex);
      for (let nextIndex_2 = currentStepIndex + 1; nextIndex_2 <= nextIndex; nextIndex_2++) {
        if (skipOauth && steps[nextIndex_2]?.id === "oauth") continue;
        logEvent("tengu_onboarding_step", {
          oauthEnabled: authEnabled,
          stepId: fromEnumOpt(steps[nextIndex_2]?.id),
        });
        logFeatureOk("onboarding_step_complete");
      }
    } else {
      if (didCompleteRef.current) return;
      didCompleteRef.current = true;
      logFeatureOk("onboarding_complete");
      onDone({
        skippedSignIn: skippedSignInRef.current,
      });
    }
  }
  function handleThemeSelection(newTheme) {
    if (!isConfigSetHooked()) {
      setThemeName(newTheme);
      goToNextStep();
      return;
    }
    goToNextStep();
    return import("../commands/theme/themeWriter.js")
      .then(({ commitTheme }) =>
        commitTheme(newTheme, {
          themeSetting,
          setTheme: setThemeName,
        }),
      )
      .then((commitResult) => {
        if (commitResult?.error !== undefined) setErrorMessage(commitResult.error.message);
      });
  }
  let exitState = useGlobalExitKeybindings();
  let themeStep = jsxProd_default(Box, {
    marginX: 1,
    children: jsxProd_default(ThemePicker, {
      onThemeSelect: handleThemeSelection,
      showIntroText: true,
      helpText: "To change this later, run /theme",
      hideEscToCancel: true,
    }),
  });
  let securityStep = jsxProd_default_2(Box, {
    flexDirection: "column",
    gap: 1,
    paddingLeft: 1,
    children: [
      jsxProd_default(Text, {
        bold: true,
        children: "Security notes:",
      }),
      jsxProd_default(Box, {
        flexDirection: "column",
        maxWidth: 70,
        children: jsxProd_default_2(OnboardingInner, {
          children: [
            jsxProd_default_2(OnboardingInner.Item, {
              children: [
                jsxProd_default(Text, {
                  children: "Claude can make mistakes.",
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  wrap: "wrap",
                  children: [
                    "You're responsible for Claude's actions and should always",
                    jsxProd_default(Newline, {}),
                    "review them, especially when running code.",
                    jsxProd_default(Newline, {}),
                  ],
                }),
              ],
            }),
            jsxProd_default_2(OnboardingInner.Item, {
              children: [
                jsxProd_default(Text, {
                  children: "Due to prompt injection risks, only use it with code you trust",
                }),
                jsxProd_default(LearnMoreLink, {
                  url: "https://code.claude.com/docs/en/security",
                }),
              ],
            }),
          ],
        }),
      }),
      jsxProd_default(PressEnterToContinue, {}),
    ],
  });
  let preflightStep = jsxProd_default(PreflightStep, {
    onSuccess: goToNextStep,
  });
  let apiKeyNeedingApproval = useMemo(getUnapprovedCustomApiKey, []);
  function handleApiKeyDone(approved) {
    let skipsOauth = approved && steps[currentStepIndex + 1]?.id === "oauth";
    goToNextStep(skipsOauth ? 2 : 1);
  }
  let steps = [];
  if (authEnabled && !hasAdminPolicy)
    steps.push({
      id: "preflight",
      component: preflightStep,
    });
  steps.push({
    id: "theme",
    component: themeStep,
  });
  if (apiKeyNeedingApproval) {
    let approveApiKeyElement = jsxProd_default(ApproveApiKey, {
      customApiKeyTruncated: apiKeyNeedingApproval,
      onDone: handleApiKeyDone,
    });
    steps.push({
      id: "api-key",
      component: showApiKeyNotice
        ? jsxProd_default(NoticeUnderScene, {
            children: approveApiKeyElement,
          })
        : approveApiKeyElement,
    });
  }
  if (authEnabled)
    steps.push({
      id: "oauth",
      component: jsxProd_default(Box, {
        flexDirection: "column",
        gap: 1,
        paddingLeft: 1,
        children: jsxProd_default(ConsoleOAuthFlow, {
          onDone: goToNextStep,
          onOrgDocumentsReload: orgConfigGateFollows ? noop : undefined,
          urlOutdent: 1,
          allowContinueWithoutLogin: true,
          orgConfigGateFollows,
        }),
      }),
    });
  steps.push({
    id: "security",
    component: securityStep,
  });
  if (shouldOfferTerminalSetup() && !showApiKeyNotice)
    steps.push({
      id: "terminal-setup",
      component: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        paddingLeft: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            children: "Use Claude Code's terminal setup?",
          }),
          jsxProd_default_2(Box, {
            flexDirection: "column",
            maxWidth: 70,
            gap: 1,
            children: [
              jsxProd_default_2(Text, {
                children: [
                  "For the optimal coding experience, enable the recommended settings",
                  jsxProd_default(Newline, {}),
                  "for your terminal:",
                  " ",
                  env.terminal === "Apple_Terminal"
                    ? isScreenReaderMode()
                      ? "Option+Enter for newlines"
                      : "Option+Enter for newlines and no audible bell"
                    : "Shift+Enter for newlines",
                ],
              }),
              jsxProd_default(ConfirmSelect, {
                confirmLabel: "Yes, use recommended settings",
                cancelLabel: "No, maybe later with /terminal-setup",
                onConfirm: () =>
                  void setupTerminal(host, themeName, storageV5)
                    .then(() => logFeatureOk("onboarding_terminal_setup"))
                    .catch(() =>
                      logFeatureBad("onboarding_terminal_setup", "onboarding_terminal_setup_failed"),
                    )
                    .finally(goToNextStep),
                onCancel: goToNextStep,
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: exitState.pending
                  ? jsxProd_default_2(Fragment, {
                      children: ["Press ", exitState.keyName, " again to exit"],
                    })
                  : jsxProd_default_2(Byline, {
                      children: [
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "enter",
                          action: "confirm",
                        }),
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "escape",
                          action: "skip",
                        }),
                      ],
                    }),
              }),
            ],
          }),
        ],
      }),
    });
  let currentStep = steps[currentStepIndex];
  function advance() {
    goToNextStep();
  }
  MessageActionsKeybindings(
    {
      "confirm:yes": advance,
    },
    {
      context: "Confirmation",
      isActive: currentStep?.id === "security",
    },
  );
  MessageActionsKeybindings(
    {
      "confirm:no": advance,
    },
    {
      context: "Confirmation",
      isActive: currentStep?.id === "terminal-setup",
    },
  );
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      jsxProd_default(WelcomeV2, {}),
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          currentStep?.component,
          errorMessage !== undefined &&
            jsxProd_default(Box, {
              paddingX: 1,
              children: jsxProd_default_2(StatusRow, {
                status: "warning",
                children: ["Couldn't save Theme: ", errorMessage],
              }),
            }),
          exitState.pending &&
            jsxProd_default(Box, {
              padding: 1,
              children: jsxProd_default_2(Text, {
                dimColor: true,
                children: ["Press ", exitState.keyName, " again to exit"],
              }),
            }),
        ],
      }),
    ],
  });
}

// The import cycle this module closes (5 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/components/Onboarding.js");
export { SkippableStep, Onboarding };
