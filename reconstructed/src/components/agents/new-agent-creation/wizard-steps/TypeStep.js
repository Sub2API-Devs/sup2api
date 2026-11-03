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
import { j, y } from "../../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
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

//@ chunk-y6fv30yg.js:14249-14253 placement
j();
//@ chunk-y6fv30yg.js:14253-15626 fingerprint = TypeStep (0.652)
function TypeStep() {
  let $ = w(17),
    {
      goBack: goBack,
      goNext: goNext,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
    } = useWizard(),
    [t, h] = y(wizardData.region ?? "global"),
    [p, f] = y(t.length),
    [u, k] = y(null),
    _;
  if ($[0] === MEMO_CACHE_SENTINEL) ((_ = { context: "Settings" }), ($[0] = _));
  else _ = $[0];
  useKeybinding("confirm:no", goBack, _);
  let A;
  if ($[1] !== goNext || $[2] !== updateWizardData || $[3] !== t)
    ((A = () => {
      let trimmedValue = t.trim();
      if (!trimmedValue) {
        k("Region is required");
        return;
      }
      (k(null), updateWizardData({ region: trimmedValue }), goNext());
    }),
      ($[1] = goNext),
      ($[2] = updateWizardData),
      ($[3] = t),
      ($[4] = A));
  else A = $[4];
  let handleSubmit = A,
    x;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((x = r(Byline, {
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
      ($[5] = x));
  else x = $[5];
  let T, C;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((T = e(Text, { children: "Where Claude models are served from." })),
      (C = e(Text, {
        dimColor: !0,
        children:
          "Use 'global', 'us', or 'eu' for a multi-region endpoint (recommended), or a specific location like us-east5 if you have regional quota.",
      })),
      ($[6] = T),
      ($[7] = C));
  else ((T = $[6]), (C = $[7]));
  let E;
  if ($[8] !== p || $[9] !== handleSubmit || $[10] !== t)
    ((E = e(Box, {
      marginTop: 1,
      children: e(TextInput, {
        value: t,
        onChange: h,
        onSubmit: handleSubmit,
        placeholder: "global",
        columns: 40,
        cursorOffset: p,
        onChangeCursorOffset: f,
        focus: !0,
        showCursor: !0,
      }),
    })),
      ($[8] = p),
      ($[9] = handleSubmit),
      ($[10] = t),
      ($[11] = E));
  else E = $[11];
  let v;
  if ($[12] !== u)
    ((v = u && e(Box, { marginTop: 1, children: e(ErrorText, { error: u }) })), ($[12] = u), ($[13] = v));
  else v = $[13];
  let b;
  if ($[14] !== E || $[15] !== v)
    ((b = e(WizardDialogLayout, {
      subtitle: "Vertex AI region",
      footerText: x,
      children: r(Box, { flexDirection: "column", children: [T, C, E, v] }),
    })),
      ($[14] = E),
      ($[15] = v),
      ($[16] = b));
  else b = $[16];
  return b;
}

export { TypeStep };
