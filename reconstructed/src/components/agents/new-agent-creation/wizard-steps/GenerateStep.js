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
import { b } from "../../../providerSetup/bedrock/BedrockCredentialsStep.js";
import { r, e } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { TextInput } from "../../../TextInput.js";
import { ErrorText } from "../../../ErrorText.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";

//@ chunk-sx9xc5ee.js:3821-5151 callgraph-fingerprint = GenerateStep (0.446)
function GenerateStep() {
  let $ = w(17),
    {
      goBack: goBack,
      goToStep: goToStep,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
    } = useWizard(),
    [t, m] = y(wizardData.bearerToken ?? ""),
    [g, h] = y(t.length),
    [u, B] = y(null),
    A;
  if ($[0] === MEMO_CACHE_SENTINEL) ((A = { context: "Settings" }), ($[0] = A));
  else A = $[0];
  useKeybinding("confirm:no", goBack, A);
  let E;
  if ($[1] !== goToStep || $[2] !== updateWizardData || $[3] !== t)
    ((E = () => {
      let trimmedPrompt = t.trim();
      if (!trimmedPrompt) {
        B("API key is required");
        return;
      }
      (B(null), updateWizardData({ bearerToken: trimmedPrompt }), goToStep(b.REGION));
    }),
      ($[1] = goToStep),
      ($[2] = updateWizardData),
      ($[3] = t),
      ($[4] = E));
  else E = $[4];
  let f = E,
    C;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((C = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "continue" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Settings",
          fallback: "Esc",
          description: "go back",
        }),
      ],
    })),
      ($[5] = C));
  else C = $[5];
  let v, T;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((v = e(Text, { children: "Paste your Bedrock API key." })),
      (T = e(Text, {
        dimColor: !0,
        children: "Generate one in the AWS console under Bedrock \u2192 API keys.",
      })),
      ($[6] = v),
      ($[7] = T));
  else ((v = $[6]), (T = $[7]));
  let _;
  if ($[8] !== g || $[9] !== f || $[10] !== t)
    ((_ = e(Box, {
      marginTop: 1,
      children: e(TextInput, {
        value: t,
        onChange: m,
        onSubmit: f,
        placeholder: "bedrock-api-key-\u2026",
        mask: "*",
        columns: 60,
        cursorOffset: g,
        onChangeCursorOffset: h,
        focus: !0,
        showCursor: !0,
      }),
    })),
      ($[8] = g),
      ($[9] = f),
      ($[10] = t),
      ($[11] = _));
  else _ = $[11];
  let D;
  if ($[12] !== u)
    ((D = u && e(Box, { marginTop: 1, children: e(ErrorText, { error: u }) })), ($[12] = u), ($[13] = D));
  else D = $[13];
  let W;
  if ($[14] !== _ || $[15] !== D)
    ((W = e(WizardDialogLayout, {
      subtitle: "Bedrock API key",
      footerText: C,
      children: r(Box, { flexDirection: "column", children: [v, T, _, D] }),
    })),
      ($[14] = _),
      ($[15] = D),
      ($[16] = W));
  else W = $[16];
  return W;
}

export { GenerateStep };
