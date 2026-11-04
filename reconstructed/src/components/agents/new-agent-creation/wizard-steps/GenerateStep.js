/**
 * components/agents/new-agent-creation/wizard-steps/GenerateStep.tsx
 *
 * 向导生成步骤；实际内容为 API key 输入（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/GenerateStep.tsx
 * pieces: chunk-sx9xc5ee.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { useState } from "../../../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import { BEDROCK_STEPS } from "../../../providerSetup/bedrock/BedrockCredentialsStep.js";
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

//@ chunk-sx9xc5ee.js:3821-5151 callgraph-fingerprint = GenerateStep (0.446)
function GenerateStep() {
  let $ = useMemoCache(17);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let [bearerToken, setBearerToken] = useState(wizardData.bearerToken ?? "");
  let [cursorOffset, setCursorOffset] = useState(bearerToken.length);
  let [error, setError] = useState(null);
  let keybindingsContext;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keybindingsContext = {
      context: "Settings",
    };
    $[0] = keybindingsContext;
  } else keybindingsContext = $[0];
  useKeybinding("confirm:no", goBack, keybindingsContext);
  let handleSubmit;
  if ($[1] !== goToStep || $[2] !== updateWizardData || $[3] !== bearerToken) {
    handleSubmit = () => {
      let trimmedPrompt = bearerToken.trim();
      if (!trimmedPrompt) {
        setError("API key is required");
        return;
      }
      setError(null);
      updateWizardData({
        bearerToken: trimmedPrompt,
      });
      goToStep(BEDROCK_STEPS.REGION);
    };
    $[1] = goToStep;
    $[2] = updateWizardData;
    $[3] = bearerToken;
    $[4] = handleSubmit;
  } else handleSubmit = $[4];
  let onSubmit = handleSubmit;
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
  let introText;
  let keyNote;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      children: "Paste your Bedrock API key.",
    });
    keyNote = jsxProd_default(Text, {
      dimColor: true,
      children: "Generate one in the AWS console under Bedrock \u2192 API keys.",
    });
    $[6] = introText;
    $[7] = keyNote;
  } else {
    introText = $[6];
    keyNote = $[7];
  }
  let _;
  if ($[8] !== cursorOffset || $[9] !== onSubmit || $[10] !== bearerToken) {
    _ = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: bearerToken,
        onChange: setBearerToken,
        onSubmit,
        placeholder: "bedrock-api-key-\u2026",
        mask: "*",
        columns: 60,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
        focus: true,
        showCursor: true,
      }),
    });
    $[8] = cursorOffset;
    $[9] = onSubmit;
    $[10] = bearerToken;
    $[11] = _;
  } else _ = $[11];
  let errorBox;
  if ($[12] !== error) {
    errorBox =
      error &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error,
        }),
      });
    $[12] = error;
    $[13] = errorBox;
  } else errorBox = $[13];
  let layout;
  if ($[14] !== _ || $[15] !== errorBox) {
    layout = jsxProd_default(WizardDialogLayout, {
      subtitle: "Bedrock API key",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [introText, keyNote, _, errorBox],
      }),
    });
    $[14] = _;
    $[15] = errorBox;
    $[16] = layout;
  } else layout = $[16];
  return layout;
}
export { GenerateStep };
