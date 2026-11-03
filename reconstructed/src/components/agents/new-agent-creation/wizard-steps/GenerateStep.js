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
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { y } from "../../../../../vendor/react/cjs/react.production.js";
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
  let $ = w(17);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let [bearerToken, setBearerToken] = y(wizardData.bearerToken ?? "");
  let [g, h] = y(bearerToken.length);
  let [u, B] = y(null);
  let A;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    A = {
      context: "Settings",
    };
    $[0] = A;
  } else A = $[0];
  useKeybinding("confirm:no", goBack, A);
  let E;
  if ($[1] !== goToStep || $[2] !== updateWizardData || $[3] !== bearerToken) {
    E = () => {
      let trimmedPrompt = bearerToken.trim();
      if (!trimmedPrompt) {
        B("API key is required");
        return;
      }
      B(null);
      updateWizardData({
        bearerToken: trimmedPrompt,
      });
      goToStep(BEDROCK_STEPS.REGION);
    };
    $[1] = goToStep;
    $[2] = updateWizardData;
    $[3] = bearerToken;
    $[4] = E;
  } else E = $[4];
  let onSubmit = E;
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
      children: "Paste your Bedrock API key.",
    });
    T = jsxProd_default(Text, {
      dimColor: true,
      children: "Generate one in the AWS console under Bedrock \u2192 API keys.",
    });
    $[6] = v;
    $[7] = T;
  } else {
    v = $[6];
    T = $[7];
  }
  let _;
  if ($[8] !== g || $[9] !== onSubmit || $[10] !== bearerToken) {
    _ = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: bearerToken,
        onChange: setBearerToken,
        onSubmit,
        placeholder: "bedrock-api-key-\u2026",
        mask: "*",
        columns: 60,
        cursorOffset: g,
        onChangeCursorOffset: h,
        focus: true,
        showCursor: true,
      }),
    });
    $[8] = g;
    $[9] = onSubmit;
    $[10] = bearerToken;
    $[11] = _;
  } else _ = $[11];
  let D;
  if ($[12] !== u) {
    D =
      u &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error: u,
        }),
      });
    $[12] = u;
    $[13] = D;
  } else D = $[13];
  let W;
  if ($[14] !== _ || $[15] !== D) {
    W = jsxProd_default(WizardDialogLayout, {
      subtitle: "Bedrock API key",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [v, T, _, D],
      }),
    });
    $[14] = _;
    $[15] = D;
    $[16] = W;
  } else W = $[16];
  return W;
}
export { GenerateStep };
