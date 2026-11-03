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
import { j, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { So } from "../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  writeUnattendedServingConsent,
  unattendedServingConsentRevokeHint,
  unattendedServingMachineName,
} from "../services/remoteTools/unattendedConsentStore.js";
import { logError } from "../utils/log.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Text, Box } from "../ink/components/Text.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../remote/tools/consentText.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-d8vjfv68.js:13774-13778 placement
j();
//@ chunk-d8vjfv68.js:13778-13865 placement
function J() {
  logEvent("tengu_served_unattended_consent", { action: lit("shown"), surface: lit("cli") });
}
//@ chunk-d8vjfv68.js:13865-15507 placement
function UnattendedConsentDialog(L) {
  let $ = w(19),
    { onDone: onDone, exitOnCtrlCD: exitOnCtrlCD, onSaveFailed: onSaveFailed } = L,
    [Q, W] = y(!1),
    N = R(!1),
    u = useTimeout(So),
    B;
  if ($[0] === MEMO_CACHE_SENTINEL) ((B = []), ($[0] = B));
  else B = $[0];
  P(J, B);
  let G;
  if ($[1] !== u || $[2] !== onDone || $[3] !== onSaveFailed)
    ((G = function t(m) {
      if (N.current || !u) {
        return;
      }
      if (
        ((N.current = !0),
        W(!0),
        logEvent("tengu_served_unattended_consent", { action: fromEnum(m), surface: lit("cli") }),
        m === "not_now")
      ) {
        onDone(m);
        return;
      }
      writeUnattendedServingConsent(m).then(
        (I) => {
          if (!I) onSaveFailed?.();
          onDone(I ? m : "not_now");
        },
        (X) => {
          (logError(X), onSaveFailed?.(), onDone("not_now"));
        },
      );
    }),
      ($[1] = u),
      ($[2] = onDone),
      ($[3] = onSaveFailed),
      ($[4] = G));
  else G = $[4];
  let t = G;
  if (Q) {
    return null;
  }
  let p;
  if ($[5] !== t) ((p = () => t("not_now")), ($[5] = t), ($[6] = p));
  else p = $[6];
  let K;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((K = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "skip for now",
        }),
      ],
    })),
      ($[7] = K));
  else K = $[7];
  let M;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((M = e(Text, { children: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.body"] })), ($[8] = M));
  else M = $[8];
  let h;
  if ($[9] === MEMO_CACHE_SENTINEL)
    ((h = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        M,
        r(Text, {
          dimColor: !0,
          children: [
            `${REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.detail"]} `,
            REMOTE_TOOLS_CONSENT_TEXT.consent_unattended_saved(unattendedServingConsentRevokeHint()),
          ],
        }),
      ],
    })),
      ($[9] = h));
  else h = $[9];
  let O;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((O = [
      { label: `Yes, allow unattended commands on ${unattendedServingMachineName()}`, value: "accepted" },
      { label: "No \u2014 ask me first, as in Manual mode", value: "declined" },
      { label: "Not now", value: "not_now" },
    ]),
      ($[10] = O));
  else O = $[10];
  const D = !u;
  let C;
  if ($[11] !== t || $[12] !== D)
    ((C = e(ModelSelector, {
      options: O,
      defaultFocusValue: "not_now",
      hideIndexes: !0,
      disablePrintableKeybindings: !0,
      isDisabled: D,
      onChange: t,
    })),
      ($[11] = t),
      ($[12] = D),
      ($[13] = C));
  else C = $[13];
  let T;
  if ($[14] !== exitOnCtrlCD || $[15] !== p || $[16] !== h || $[17] !== C)
    ((T = r(Dialog, {
      title: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.title"],
      onCancel: p,
      exitOnCtrlCD: exitOnCtrlCD,
      inputGuide: K,
      children: [h, C],
    })),
      ($[14] = exitOnCtrlCD),
      ($[15] = p),
      ($[16] = h),
      ($[17] = C),
      ($[18] = T));
  else T = $[18];
  return T;
}
