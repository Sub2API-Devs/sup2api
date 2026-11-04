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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useWizard } from "./useWizard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../design-system/Dialog.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-095ptjmr.js:3004-3989 fingerprint (2.1.88 match: WizardDialogLayout, 0.585)
function WizardDialogLayout(props) {
  let $ = useMemoCache(15);
  let { title: titleOverride, color, children, subtitle, footerText } = props;
  let color_2 = color === undefined ? "suggestion" : color;
  let {
    currentStepIndex,
    totalSteps,
    title: providerTitle,
    showStepCounter,
    goBack,
    pendingExitHint,
  } = useWizard();
  let title = titleOverride || providerTitle || "Wizard";
  let stepSuffix = showStepCounter !== false ? ` (${currentStepIndex + 1}/${totalSteps})` : "";
  const title_2 = `${title}${stepSuffix}`;
  let t3;
  if ($[0] !== children || $[1] !== color_2 || $[2] !== goBack || $[3] !== subtitle || $[4] !== title_2) {
    t3 = jsxProd_default(Dialog, {
      title: title_2,
      subtitle,
      onCancel: goBack,
      color: color_2,
      hideInputGuide: true,
      isCancelActive: false,
      children,
    });
    $[0] = children;
    $[1] = color_2;
    $[2] = goBack;
    $[3] = subtitle;
    $[4] = title_2;
    $[5] = t3;
  } else t3 = $[5];
  let children_2;
  if ($[6] !== currentStepIndex || $[7] !== footerText || $[8] !== pendingExitHint) {
    children_2 =
      pendingExitHint ??
      footerText ??
      jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["up", "down"],
            action: "navigate",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "select",
          }),
          jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: currentStepIndex > 0 ? "go back" : "cancel",
          }),
        ],
      });
    $[6] = currentStepIndex;
    $[7] = footerText;
    $[8] = pendingExitHint;
    $[9] = children_2;
  } else children_2 = $[9];
  let footerElement;
  if ($[10] !== children_2) {
    footerElement = jsxProd_default(Box, {
      marginLeft: 2,
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: children_2,
      }),
    });
    $[10] = children_2;
    $[11] = footerElement;
  } else footerElement = $[11];
  let t5;
  if ($[12] !== t3 || $[13] !== footerElement) {
    t5 = jsxProd_default_2(Fragment, {
      children: [t3, footerElement],
    });
    $[12] = t3;
    $[13] = footerElement;
    $[14] = t5;
  } else t5 = $[14];
  return t5;
}
export { WizardDialogLayout };
