/**
 * components/agents/new-agent-creation/wizard-steps/PromptStep.tsx
 *
 * 向导提示步骤；实际内容为路径输入（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/PromptStep.tsx
 * pieces: chunk-y6fv30yg.js (2)
 * attribution: placement 1, callgraph-fingerprint 1
 */
import { join, join as join_2 } from "path";
import { homedir } from "os";
import { j, y } from "../../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import { VERTEX_WIZARD_STEPS } from "../../../vertexSetup/VertexSetupWizard.js";
import { r, e } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { TextInput } from "../../../TextInput.js";
import { ErrorText } from "../../../ErrorText.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";

//@ chunk-y6fv30yg.js:15626-15630 placement
j();
//@ chunk-y6fv30yg.js:15689-17115 callgraph-fingerprint = PromptStep (0.516)
function PromptStep() {
  let $ = w(17),
    {
      goBack: goBack,
      goToStep: goToStep,
      updateWizardData: updateWizardData,
      wizardData: wizardData,
    } = useWizard(),
    [t, h] = y(wizardData.keyFile ?? ""),
    [p, f] = y(t.length),
    [u, k] = y(null),
    _;
  if ($[0] === MEMO_CACHE_SENTINEL) ((_ = { context: "Settings" }), ($[0] = _));
  else _ = $[0];
  useKeybinding("confirm:no", goBack, _);
  let A;
  if ($[1] !== goToStep || $[2] !== updateWizardData || $[3] !== t)
    ((A = () => {
      let trimmedPrompt = t.trim();
      if (!trimmedPrompt) {
        k("Path is required");
        return;
      }
      k(null);
      let D =
        trimmedPrompt === "~" || trimmedPrompt.startsWith("~/")
          ? join_2(homedir(), trimmedPrompt.slice(1))
          : trimmedPrompt;
      (updateWizardData({ keyFile: D }), goToStep(VERTEX_WIZARD_STEPS.PROJECT));
    }),
      ($[1] = goToStep),
      ($[2] = updateWizardData),
      ($[3] = t),
      ($[4] = A));
  else A = $[4];
  let x = A,
    T;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((T = r(Byline, {
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
      ($[5] = T));
  else T = $[5];
  let C, E;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((C = e(Text, { children: "Path to the service account JSON key file." })),
      (E = e(Text, {
        dimColor: !0,
        children:
          "Download one from the GCP console under IAM \u2192 Service Accounts \u2192 Keys \u2192 Add key.",
      })),
      ($[6] = C),
      ($[7] = E));
  else ((C = $[6]), (E = $[7]));
  let v;
  if ($[8] !== p || $[9] !== x || $[10] !== t)
    ((v = e(Box, {
      marginTop: 1,
      children: e(TextInput, {
        value: t,
        onChange: h,
        onSubmit: x,
        placeholder: "~/keys/my-project-vertex.json",
        columns: 60,
        cursorOffset: p,
        onChangeCursorOffset: f,
        focus: !0,
        showCursor: !0,
      }),
    })),
      ($[8] = p),
      ($[9] = x),
      ($[10] = t),
      ($[11] = v));
  else v = $[11];
  let b;
  if ($[12] !== u)
    ((b = u && e(Box, { marginTop: 1, children: e(ErrorText, { error: u }) })), ($[12] = u), ($[13] = b));
  else b = $[13];
  let W;
  if ($[14] !== v || $[15] !== b)
    ((W = e(WizardDialogLayout, {
      subtitle: "Service account key",
      footerText: T,
      children: r(Box, { flexDirection: "column", children: [C, E, v, b] }),
    })),
      ($[14] = v),
      ($[15] = b),
      ($[16] = W));
  else W = $[16];
  return W;
}

export { PromptStep };
