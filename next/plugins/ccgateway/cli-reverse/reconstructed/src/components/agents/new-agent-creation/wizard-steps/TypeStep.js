/**
 * components/agents/new-agent-creation/wizard-steps/TypeStep.tsx
 *
 * 向导类型步骤；实际内容为区域输入（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/TypeStep.tsx
 * pieces: chunk-3qyfks39.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { init_react_production, useState } from "../../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-3qyfks39.js:14249-14253 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3qyfks39.js:14249", () => {
  init_react_production();
});
//@ chunk-3qyfks39.js:14253-15626 fingerprint (2.1.88 match: TypeStep, 0.651)
function TypeStep() {
  let $ = useMemoCache(17);
  let { goBack, goNext, updateWizardData, wizardData } = useWizard();
  let [region, setAgentType] = useState(wizardData.region ?? "global");
  let [cursorOffset, setCursorOffset] = useState(region.length);
  let [error, setError] = useState(null);
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
        setError("Region is required");
        return;
      }
      setError(null);
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
  let submitType;
  let setTypeError;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    submitType = jsxProd_default(Text, {
      children: "Where Claude models are served from.",
    });
    setTypeError = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Use 'global', 'us', or 'eu' for a multi-region endpoint (recommended), or a specific location like us-east5 if you have regional quota.",
    });
    $[6] = submitType;
    $[7] = setTypeError;
  } else {
    submitType = $[6];
    setTypeError = $[7];
  }
  let t4;
  if ($[8] !== cursorOffset || $[9] !== handleSubmit || $[10] !== region) {
    t4 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: region,
        onChange: setAgentType,
        onSubmit: handleSubmit,
        placeholder: "global",
        columns: 40,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
        focus: true,
        showCursor: true,
      }),
    });
    $[8] = cursorOffset;
    $[9] = handleSubmit;
    $[10] = region;
    $[11] = t4;
  } else t4 = $[11];
  let t5;
  if ($[12] !== error) {
    t5 =
      error &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error,
        }),
      });
    $[12] = error;
    $[13] = t5;
  } else t5 = $[13];
  let t6;
  if ($[14] !== t4 || $[15] !== t5) {
    t6 = jsxProd_default(WizardDialogLayout, {
      subtitle: "Vertex AI region",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [submitType, setTypeError, t4, t5],
      }),
    });
    $[14] = t4;
    $[15] = t5;
    $[16] = t6;
  } else t6 = $[16];
  return t6;
}
export { TypeStep };
