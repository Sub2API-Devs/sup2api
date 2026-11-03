/**
 * components/UnattendedConsentDialog.tsx
 *
 * 2.1.316 新增。无人值守（served）模式同意对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-d8vjfv68.js (3)
 * attribution: placement 3
 */
import { init_react_production, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  writeUnattendedServingConsent,
  unattendedServingConsentRevokeHint,
  unattendedServingMachineName,
} from "../services/remoteTools/unattendedConsentStore.js";
import { logError } from "../utils/log.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Text, Box } from "../ink/components/Text.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../remote/tools/consentText.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-d8vjfv68.js:13774-13778 placement
init_react_production();
//@ chunk-d8vjfv68.js:13778-13865 placement
function logConsentShown() {
  logEvent("tengu_served_unattended_consent", {
    action: lit("shown"),
    surface: lit("cli"),
  });
}
//@ chunk-d8vjfv68.js:13865-15507 placement
function UnattendedConsentDialog(props) {
  let $ = w(19);
  let { onDone, exitOnCtrlCD, onSaveFailed } = props;
  let [Q, W] = y(false);
  let N = R(false);
  let timeout = useTimeout(RECENT_INPUT_GUARD_MS);
  let B;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    B = [];
    $[0] = B;
  } else B = $[0];
  P(logConsentShown, B);
  let G;
  if ($[1] !== timeout || $[2] !== onDone || $[3] !== onSaveFailed) {
    G = function t(m) {
      if (N.current || !timeout) {
        return;
      }
      N.current = true;
      W(true);
      logEvent("tengu_served_unattended_consent", {
        action: fromEnum(m),
        surface: lit("cli"),
      });
      if (m === "not_now") {
        onDone(m);
        return;
      }
      writeUnattendedServingConsent(m).then(
        (I) => {
          if (!I) onSaveFailed?.();
          onDone(I ? m : "not_now");
        },
        (error) => {
          logError(error);
          onSaveFailed?.();
          onDone("not_now");
        },
      );
    };
    $[1] = timeout;
    $[2] = onDone;
    $[3] = onSaveFailed;
    $[4] = G;
  } else G = $[4];
  let t = G;
  if (Q) {
    return null;
  }
  let onCancel;
  if ($[5] !== t) {
    onCancel = () => t("not_now");
    $[5] = t;
    $[6] = onCancel;
  } else onCancel = $[6];
  let inputGuide;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "skip for now",
        }),
      ],
    });
    $[7] = inputGuide;
  } else inputGuide = $[7];
  let M;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    M = jsxProd_default(Text, {
      children: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.body"],
    });
    $[8] = M;
  } else M = $[8];
  let h;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        M,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            `${REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.detail"]} `,
            REMOTE_TOOLS_CONSENT_TEXT.consent_unattended_saved(unattendedServingConsentRevokeHint()),
          ],
        }),
      ],
    });
    $[9] = h;
  } else h = $[9];
  let options;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: `Yes, allow unattended commands on ${unattendedServingMachineName()}`,
        value: "accepted",
      },
      {
        label: "No \u2014 ask me first, as in Manual mode",
        value: "declined",
      },
      {
        label: "Not now",
        value: "not_now",
      },
    ];
    $[10] = options;
  } else options = $[10];
  const isDisabled = !timeout;
  let C;
  if ($[11] !== t || $[12] !== isDisabled) {
    C = jsxProd_default(ModelSelector, {
      options,
      defaultFocusValue: "not_now",
      hideIndexes: true,
      disablePrintableKeybindings: true,
      isDisabled,
      onChange: t,
    });
    $[11] = t;
    $[12] = isDisabled;
    $[13] = C;
  } else C = $[13];
  let T;
  if ($[14] !== exitOnCtrlCD || $[15] !== onCancel || $[16] !== h || $[17] !== C) {
    T = jsxProd_default_2(Dialog, {
      title: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.title"],
      onCancel,
      exitOnCtrlCD,
      inputGuide,
      children: [h, C],
    });
    $[14] = exitOnCtrlCD;
    $[15] = onCancel;
    $[16] = h;
    $[17] = C;
    $[18] = T;
  } else T = $[18];
  return T;
}
