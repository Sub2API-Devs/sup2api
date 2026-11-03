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
import { r, e } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { TextInput } from "../../../TextInput.js";
import { ErrorText } from "../../../ErrorText.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";

//@ chunk-sx9xc5ee.js:19296-20653 callgraph-fingerprint = DescriptionStep (0.579)
function DescriptionStep() {
  let $ = w(17),
    {
      goBack: goBack,
      goNext: goNext,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
    } = useWizard(),
    [t, m] = y(wizardData.region ?? "us-east-1"),
    [g, h] = y(t.length),
    [u, B] = y(null),
    A;
  if ($[0] === MEMO_CACHE_SENTINEL) ((A = { context: "Settings" }), ($[0] = A));
  else A = $[0];
  useKeybinding("confirm:no", goBack, A);
  let E;
  if ($[1] !== goNext || $[2] !== updateWizardData || $[3] !== t)
    ((E = () => {
      let trimmed = t.trim();
      if (!trimmed) {
        B("Region is required");
        return;
      }
      (B(null), updateWizardData({ region: trimmed }), goNext());
    }),
      ($[1] = goNext),
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
    ((v = e(Text, { children: "Where your Bedrock models are enabled." })),
      (T = e(Text, {
        dimColor: !0,
        children:
          "Claude Code reads this from AWS_REGION, not ~/.aws/config \u2014 set it explicitly even if your profile has a region.",
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
        placeholder: "us-east-1",
        columns: 40,
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
      subtitle: "AWS region",
      footerText: C,
      children: r(Box, { flexDirection: "column", children: [v, T, _, D] }),
    })),
      ($[14] = _),
      ($[15] = D),
      ($[16] = W));
  else W = $[16];
  return W;
}

export { DescriptionStep };
