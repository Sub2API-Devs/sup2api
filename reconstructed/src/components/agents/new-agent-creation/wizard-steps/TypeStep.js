/**
 * components/agents/new-agent-creation/wizard-steps/TypeStep.tsx
 *
 * 向导类型步骤；实际内容为区域输入（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/TypeStep.tsx
 * pieces: chunk-y6fv30yg.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { init_react_production, y } from "../../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { TextInput } from "../../../TextInput.js";
import { ErrorText } from "../../../ErrorText.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";

//@ chunk-y6fv30yg.js:14249-14253 placement
init_react_production();
//@ chunk-y6fv30yg.js:14253-15626 fingerprint = TypeStep (0.652)
function TypeStep() {
  let $ = w(17);
  let { goBack, goNext, updateWizardData, wizardData } = useWizard();
  let [region, setAgentType] = y(wizardData.region ?? "global");
  let [p, f] = y(region.length);
  let [u, k] = y(null);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = {
      context: "Settings",
    };
    $[0] = t0;
  } else t0 = $[0];
  useKeybinding("confirm:no", goBack, t0);
  let t1;
  if ($[1] !== goNext || $[2] !== updateWizardData || $[3] !== region) {
    t1 = () => {
      let trimmedValue = region.trim();
      if (!trimmedValue) {
        k("Region is required");
        return;
      }
      k(null);
      updateWizardData({
        region: trimmedValue,
      });
      goNext();
    };
    $[1] = goNext;
    $[2] = updateWizardData;
    $[3] = region;
    $[4] = t1;
  } else t1 = $[4];
  let handleSubmit = t1;
  let footerText;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    footerText = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "continue",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Settings",
          fallback: "Esc",
          description: "go back",
        }),
      ],
    });
    $[5] = footerText;
  } else footerText = $[5];
  let T;
  let C;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default(Text, {
      children: "Where Claude models are served from.",
    });
    C = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Use 'global', 'us', or 'eu' for a multi-region endpoint (recommended), or a specific location like us-east5 if you have regional quota.",
    });
    $[6] = T;
    $[7] = C;
  } else {
    T = $[6];
    C = $[7];
  }
  let t4;
  if ($[8] !== p || $[9] !== handleSubmit || $[10] !== region) {
    t4 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: region,
        onChange: setAgentType,
        onSubmit: handleSubmit,
        placeholder: "global",
        columns: 40,
        cursorOffset: p,
        onChangeCursorOffset: f,
        focus: true,
        showCursor: true,
      }),
    });
    $[8] = p;
    $[9] = handleSubmit;
    $[10] = region;
    $[11] = t4;
  } else t4 = $[11];
  let t5;
  if ($[12] !== u) {
    t5 =
      u &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error: u,
        }),
      });
    $[12] = u;
    $[13] = t5;
  } else t5 = $[13];
  let t6;
  if ($[14] !== t4 || $[15] !== t5) {
    t6 = jsxProd_default(WizardDialogLayout, {
      subtitle: "Vertex AI region",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [T, C, t4, t5],
      }),
    });
    $[14] = t4;
    $[15] = t5;
    $[16] = t6;
  } else t6 = $[16];
  return t6;
}
export { TypeStep };
