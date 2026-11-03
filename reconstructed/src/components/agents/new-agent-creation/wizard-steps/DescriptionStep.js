/**
 * components/agents/new-agent-creation/wizard-steps/DescriptionStep.tsx
 *
 * 向导描述步骤；实际内容为 Bedrock 区域输入（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/DescriptionStep.tsx
 * pieces: chunk-sx9xc5ee.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { y } from "../../../../../vendor/react/cjs/react.production.js";
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

//@ chunk-sx9xc5ee.js:19296-20653 callgraph-fingerprint = DescriptionStep (0.579)
function DescriptionStep() {
  let $ = w(17);
  let { goBack, goNext, updateWizardData, wizardData } = useWizard();
  let [region, setWhenToUse] = y(wizardData.region ?? "us-east-1");
  let [cursorOffset, setCursorOffset] = y(region.length);
  let [error, setError] = y(null);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = {
      context: "Settings",
    };
    $[0] = t0;
  } else t0 = $[0];
  useKeybinding("confirm:no", goBack, t0);
  let E;
  if ($[1] !== goNext || $[2] !== updateWizardData || $[3] !== region) {
    E = () => {
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
    $[4] = E;
  } else E = $[4];
  let handleSubmit = E;
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
  let v;
  let T;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    v = jsxProd_default(Text, {
      children: "Where your Bedrock models are enabled.",
    });
    T = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Claude Code reads this from AWS_REGION, not ~/.aws/config \u2014 set it explicitly even if your profile has a region.",
    });
    $[6] = v;
    $[7] = T;
  } else {
    v = $[6];
    T = $[7];
  }
  let t6;
  if ($[8] !== cursorOffset || $[9] !== handleSubmit || $[10] !== region) {
    t6 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: region,
        onChange: setWhenToUse,
        onSubmit: handleSubmit,
        placeholder: "us-east-1",
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
    $[11] = t6;
  } else t6 = $[11];
  let D;
  if ($[12] !== error) {
    D =
      error &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error,
        }),
      });
    $[12] = error;
    $[13] = D;
  } else D = $[13];
  let t8;
  if ($[14] !== t6 || $[15] !== D) {
    t8 = jsxProd_default(WizardDialogLayout, {
      subtitle: "AWS region",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [v, T, t6, D],
      }),
    });
    $[14] = t6;
    $[15] = D;
    $[16] = t8;
  } else t8 = $[16];
  return t8;
}
export { DescriptionStep };
