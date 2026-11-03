/**
 * components/Onboarding.tsx
 *
 * 首次启动引导：主题、登录/OAuth、安全说明、终端设置等可跳过步骤。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Onboarding.tsx
 * pieces: chunk-1tz177x8.js (1), chunk-p8fze0jh.js (6)
 * attribution: fingerprint 2, placement 2, sole-consumer 2, affinity 1
 */
import { j, y, R, P, Q } from "../../vendor/react/cjs/react.production.js";
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
import { useTheme, useThemeSetting, Me } from "./design-system/ThemeProvider.js";
import { logEvent } from "../services/analytics/index.js";
import { computeRemoteSettingsEligibility } from "../services/cloudSessions/eligibility.js";
import { isRemoteManagedSettingsVerified } from "../services/remoteManagedSettings/remoteSettingsState.js";
import { fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { Qfn } from "../plugins/functionHooks/configApi.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { ThemePicker } from "./ThemePicker.js";
import { Newline } from "../ink/components/Input.js";
import { LearnMoreLink } from "./LearnMoreLink.js";
import { PressEnterToContinue } from "./_new/PressEnterToContinue.js";
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
import { resetStateForTests, zo } from "../cli/handlers/pluginTest/engineShim.js";

//@ chunk-p8fze0jh.js:16213-16217 placement
j();
//@ chunk-p8fze0jh.js:16217-16221 placement
j();
//@ chunk-p8fze0jh.js:20134-20143 sole-consumer
OrderedListComponent.Item = OrderedListItem;
//@ chunk-p8fze0jh.js:20143-20151 sole-consumer
var K = OrderedListComponent;
//@ chunk-p8fze0jh.js:20151-20166 affinity
function noop() {}
/**
 * 首次引导：依次展示主题选择、登录（OAuth/网关）、安全须知、终端设置（shift+enter 等）等步骤，记录 tengu_began_setup/tengu_onboarding_step。
 */
//@ chunk-p8fze0jh.js:20166-23783 fingerprint = Onboarding (0.631)
function Onboarding({ host: host, onDone: onDone, orgConfigGateFollows: orgConfigGateFollows = !1 }) {
  let [x, h] = y(0),
    [p] = y(() => isGatewayLoginForced()),
    [c] = y(() => isAnthropicAuthEnabled() || (p && getAPIProvider() === "gateway" && !getGatewayAuth())),
    [k] = y(() => p || adminPolicyUnreadable() || getUserSettingsGateway() !== void 0),
    [u] = y(() => !1),
    C = R(!1),
    d = R(!1),
    [L, I] = useTheme(),
    W = useThemeSetting(),
    [N, A] = y(),
    { storageV5: storageV5 } = Me();
  P(() => {
    logEvent("tengu_began_setup", { oauthEnabled: c });
  }, [c]);
  function O(E = 1) {
    let v = x + E,
      U = !1;
    if (steps[v]?.id === "oauth")
      try {
        U = (!computeRemoteSettingsEligibility() || isRemoteManagedSettingsVerified()) && hasExistingSignIn();
      } catch {
        U = !1;
      }
    if (U) ((C.current = !0), v++);
    if (v < steps.length) {
      h(v);
      for (let H = x + 1; H <= v; H++) {
        if (U && steps[H]?.id === "oauth") continue;
        (logEvent("tengu_onboarding_step", { oauthEnabled: c, stepId: fromEnumOpt(steps[H]?.id) }),
          logFeatureOk("onboarding_step_complete"));
      }
    } else {
      if (d.current) return;
      ((d.current = !0), logFeatureOk("onboarding_complete"), onDone({ skippedSignIn: C.current }));
    }
  }
  function handleThemeSelection(newTheme) {
    if (!Qfn()) {
      (I(newTheme), O());
      return;
    }
    return (
      O(),
      import("./chunk-fqjhw3zb.js")
        .then(({ commitTheme: commitTheme }) => commitTheme(newTheme, { themeSetting: W, setTheme: I }))
        .then((v) => {
          if (v?.error !== void 0) A(v.error.message);
        })
    );
  }
  let exitState = useGlobalExitKeybindings(),
    pe = e(Box, {
      marginX: 1,
      children: e(ThemePicker, {
        onThemeSelect: handleThemeSelection,
        showIntroText: !0,
        helpText: "To change this later, run /theme",
        hideEscToCancel: !0,
        skipExitHandling: !0,
      }),
    }),
    ue = r(Box, {
      flexDirection: "column",
      gap: 1,
      paddingLeft: 1,
      children: [
        e(Text, { bold: !0, children: "Security notes:" }),
        e(Box, {
          flexDirection: "column",
          maxWidth: 70,
          children: r(K, {
            children: [
              r(K.Item, {
                children: [
                  e(Text, { children: "Claude can make mistakes." }),
                  r(Text, {
                    dimColor: !0,
                    wrap: "wrap",
                    children: [
                      "You're responsible for Claude's actions and should always",
                      e(Newline, {}),
                      "review them, especially when running code.",
                      e(Newline, {}),
                    ],
                  }),
                ],
              }),
              r(K.Item, {
                children: [
                  e(Text, { children: "Due to prompt injection risks, only use it with code you trust" }),
                  e(LearnMoreLink, { url: "https://code.claude.com/docs/en/security" }),
                ],
              }),
            ],
          }),
        }),
        e(PressEnterToContinue, {}),
      ],
    }),
    fe = e(PreflightStep, { onSuccess: O }),
    apiKeyNeedingApproval = Q(getUnapprovedCustomApiKey, []);
  function handleApiKeyDone(approved) {
    let v = approved && steps[x + 1]?.id === "oauth";
    O(v ? 2 : 1);
  }
  let steps = [];
  if (c && !k) steps.push({ id: "preflight", component: fe });
  if ((steps.push({ id: "theme", component: pe }), apiKeyNeedingApproval)) {
    let E = e(ApproveApiKey, { customApiKeyTruncated: apiKeyNeedingApproval, onDone: handleApiKeyDone });
    steps.push({ id: "api-key", component: u ? e(NoticeUnderScene, { children: E }) : E });
  }
  if (c)
    steps.push({
      id: "oauth",
      component: e(Box, {
        flexDirection: "column",
        gap: 1,
        paddingLeft: 1,
        children: e(ConsoleOAuthFlow, {
          onDone: O,
          onOrgDocumentsReload: orgConfigGateFollows ? noop : void 0,
          urlOutdent: 1,
          allowContinueWithoutLogin: !0,
          orgConfigGateFollows: orgConfigGateFollows,
        }),
      }),
    });
  if ((steps.push({ id: "security", component: ue }), shouldOfferTerminalSetup() && !u))
    steps.push({
      id: "terminal-setup",
      component: r(Box, {
        flexDirection: "column",
        gap: 1,
        paddingLeft: 1,
        children: [
          e(Text, { bold: !0, children: "Use Claude Code's terminal setup?" }),
          r(Box, {
            flexDirection: "column",
            maxWidth: 70,
            gap: 1,
            children: [
              r(Text, {
                children: [
                  "For the optimal coding experience, enable the recommended settings",
                  e(Newline, {}),
                  "for your terminal:",
                  " ",
                  env.terminal === "Apple_Terminal"
                    ? isScreenReaderMode()
                      ? "Option+Enter for newlines"
                      : "Option+Enter for newlines and no audible bell"
                    : "Shift+Enter for newlines",
                ],
              }),
              e(ConfirmSelect, {
                confirmLabel: "Yes, use recommended settings",
                cancelLabel: "No, maybe later with /terminal-setup",
                onConfirm: () =>
                  void setupTerminal(host, L, storageV5)
                    .then(() => logFeatureOk("onboarding_terminal_setup"))
                    .catch(() =>
                      logFeatureBad("onboarding_terminal_setup", "onboarding_terminal_setup_failed"),
                    )
                    .finally(O),
                onCancel: O,
              }),
              e(Text, {
                dimColor: !0,
                children: exitState.pending
                  ? r(Fragment, { children: ["Press ", exitState.keyName, " again to exit"] })
                  : r(Byline, {
                      children: [
                        e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
                        e(KeyboardShortcutHint, { chord: "escape", action: "skip" }),
                      ],
                    }),
              }),
            ],
          }),
        ],
      }),
    });
  let currentStep = steps[x];
  function te() {
    O();
  }
  return (
    MessageActionsKeybindings(
      { "confirm:yes": te },
      { context: "Confirmation", isActive: currentStep?.id === "security" },
    ),
    MessageActionsKeybindings(
      { "confirm:no": te },
      { context: "Confirmation", isActive: currentStep?.id === "terminal-setup" },
    ),
    r(Box, {
      flexDirection: "column",
      children: [
        e(WelcomeV2, {}),
        r(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [
            currentStep?.component,
            N !== void 0 &&
              e(Box, {
                paddingX: 1,
                children: r(StatusRow, { status: "warning", children: ["Couldn't save Theme: ", N] }),
              }),
            exitState.pending &&
              e(Box, {
                padding: 1,
                children: r(Text, {
                  dimColor: !0,
                  children: ["Press ", exitState.keyName, " again to exit"],
                }),
              }),
          ],
        }),
      ],
    })
  );
}
//@ chunk-1tz177x8.js:22768-22923 fingerprint = SkippableStep (0.48)
function SkippableStep(t0) {
  let { plugin: plugin, event: event, reason: reason, skip: skip } = t0,
    f = plugin === resetStateForTests && skip?.kind === "shape",
    a = reason.startsWith(zo) ? reason.slice(zo.length) : reason;
  return f ? { text: a, event: event } : void 0;
}

export { SkippableStep };
