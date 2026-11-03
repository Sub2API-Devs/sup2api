/**
 * components/wizard/WizardDialogLayout.tsx
 *
 * 向导对话框布局（标题、步骤内容、导航提示），被 16 处使用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/wizard/WizardDialogLayout.tsx
 * pieces: chunk-095ptjmr.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useWizard } from "./useWizard.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../design-system/Dialog.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-095ptjmr.js:3004-3989 fingerprint = WizardDialogLayout (0.585)
function WizardDialogLayout(t0) {
  let $ = w(15),
    { title: titleOverride, color: t1, children: children, subtitle: subtitle, footerText: footerText } = t0,
    c = t1 === void 0 ? "suggestion" : t1,
    {
      currentStepIndex: currentStepIndex,
      totalSteps: totalSteps,
      title: providerTitle,
      showStepCounter: showStepCounter,
      goBack: goBack,
      pendingExitHint: pendingExitHint,
    } = useWizard(),
    title = titleOverride || providerTitle || "Wizard",
    se = showStepCounter !== !1 ? ` (${currentStepIndex + 1}/${totalSteps})` : "";
  const t2 = `${title}${se}`;
  let m;
  if ($[0] !== children || $[1] !== c || $[2] !== goBack || $[3] !== subtitle || $[4] !== t2)
    ((m = e(Dialog, {
      title: t2,
      subtitle: subtitle,
      onCancel: goBack,
      color: c,
      hideInputGuide: !0,
      isCancelActive: !1,
      children: children,
    })),
      ($[0] = children),
      ($[1] = c),
      ($[2] = goBack),
      ($[3] = subtitle),
      ($[4] = t2),
      ($[5] = m));
  else m = $[5];
  let a;
  if ($[6] !== currentStepIndex || $[7] !== footerText || $[8] !== pendingExitHint)
    ((a =
      pendingExitHint ??
      footerText ??
      r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
          e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
          e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: currentStepIndex > 0 ? "go back" : "cancel",
          }),
        ],
      })),
      ($[6] = currentStepIndex),
      ($[7] = footerText),
      ($[8] = pendingExitHint),
      ($[9] = a));
  else a = $[9];
  let k;
  if ($[10] !== a)
    ((k = e(Box, { marginLeft: 2, marginTop: 1, children: e(Text, { dimColor: !0, children: a }) })),
      ($[10] = a),
      ($[11] = k));
  else k = $[11];
  let B;
  if ($[12] !== m || $[13] !== k)
    ((B = r(Fragment, { children: [m, k] })), ($[12] = m), ($[13] = k), ($[14] = B));
  else B = $[14];
  return B;
}

export { WizardDialogLayout };
