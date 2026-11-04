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
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
  let $ = useMemoCache(19);
  let { onDone, exitOnCtrlCD, onSaveFailed } = props;
  let [hasAnswered, setHasAnswered] = useState(false);
  let hasAnsweredRef = useRef(false);
  let timeout = useTimeout(RECENT_INPUT_GUARD_MS);
  let logShownDeps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    logShownDeps = [];
    $[0] = logShownDeps;
  } else logShownDeps = $[0];
  useEffect(logConsentShown, logShownDeps);
  let handleAnswer;
  if ($[1] !== timeout || $[2] !== onDone || $[3] !== onSaveFailed) {
    handleAnswer = function onAnswer(answer) {
      if (hasAnsweredRef.current || !timeout) {
        return;
      }
      hasAnsweredRef.current = true;
      setHasAnswered(true);
      logEvent("tengu_served_unattended_consent", {
        action: fromEnum(answer),
        surface: lit("cli"),
      });
      if (answer === "not_now") {
        onDone(answer);
        return;
      }
      writeUnattendedServingConsent(answer).then(
        (saved) => {
          if (!saved) onSaveFailed?.();
          onDone(saved ? answer : "not_now");
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
    $[4] = handleAnswer;
  } else handleAnswer = $[4];
  let answer_ = handleAnswer;
  if (hasAnswered) {
    return null;
  }
  let onCancel;
  if ($[5] !== answer_) {
    onCancel = () => answer_("not_now");
    $[5] = answer_;
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
  let bodyElement;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    bodyElement = jsxProd_default(Text, {
      children: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.body"],
    });
    $[8] = bodyElement;
  } else bodyElement = $[8];
  let contentElement;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    contentElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        bodyElement,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            `${REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.detail"]} `,
            REMOTE_TOOLS_CONSENT_TEXT.consent_unattended_saved(unattendedServingConsentRevokeHint()),
          ],
        }),
      ],
    });
    $[9] = contentElement;
  } else contentElement = $[9];
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
  let selectorElement;
  if ($[11] !== answer_ || $[12] !== isDisabled) {
    selectorElement = jsxProd_default(ModelSelector, {
      options,
      defaultFocusValue: "not_now",
      hideIndexes: true,
      disablePrintableKeybindings: true,
      isDisabled,
      onChange: answer_,
    });
    $[11] = answer_;
    $[12] = isDisabled;
    $[13] = selectorElement;
  } else selectorElement = $[13];
  let dialogElement;
  if ($[14] !== exitOnCtrlCD || $[15] !== onCancel || $[16] !== contentElement || $[17] !== selectorElement) {
    dialogElement = jsxProd_default_2(Dialog, {
      title: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.title"],
      onCancel,
      exitOnCtrlCD,
      inputGuide,
      children: [contentElement, selectorElement],
    });
    $[14] = exitOnCtrlCD;
    $[15] = onCancel;
    $[16] = contentElement;
    $[17] = selectorElement;
    $[18] = dialogElement;
  } else dialogElement = $[18];
  return dialogElement;
}
export { UnattendedConsentDialog };
