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
import { join } from "path";
import { homedir } from "os";
import { init_react_production, useState } from "../../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../../keybindings/useKeybinding.js";
import { VERTEX_WIZARD_STEPS_2 } from "../../../vertexSetup/VertexSetupWizard.js";
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

//@ chunk-y6fv30yg.js:15626-15630 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y6fv30yg.js:15626", () => {
  init_react_production();
});
//@ chunk-y6fv30yg.js:15689-17115 callgraph-fingerprint = PromptStep (0.516)
function PromptStep() {
  let $ = useMemoCache(17);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let [systemPrompt, setSystemPrompt] = useState(wizardData.keyFile ?? "");
  let [cursorOffset, setCursorOffset] = useState(systemPrompt.length);
  let [error, setError] = useState(null);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = {
      context: "Settings",
    };
    $[0] = t0;
  } else t0 = $[0];
  useKeybinding("confirm:no", goBack, t0);
  let entry;
  if ($[1] !== goToStep || $[2] !== updateWizardData || $[3] !== systemPrompt) {
    entry = () => {
      let trimmedPrompt = systemPrompt.trim();
      if (!trimmedPrompt) {
        setError("Path is required");
        return;
      }
      setError(null);
      let keyFile =
        trimmedPrompt === "~" || trimmedPrompt.startsWith("~/")
          ? join(homedir(), trimmedPrompt.slice(1))
          : trimmedPrompt;
      updateWizardData({
        keyFile,
      });
      goToStep(VERTEX_WIZARD_STEPS_2.PROJECT);
    };
    $[1] = goToStep;
    $[2] = updateWizardData;
    $[3] = systemPrompt;
    $[4] = entry;
  } else entry = $[4];
  let handleSubmit = entry;
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
  let t5;
  let t6;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Text, {
      children: "Path to the service account JSON key file.",
    });
    t6 = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Download one from the GCP console under IAM \u2192 Service Accounts \u2192 Keys \u2192 Add key.",
    });
    $[6] = t5;
    $[7] = t6;
  } else {
    t5 = $[6];
    t6 = $[7];
  }
  let t7;
  if ($[8] !== cursorOffset || $[9] !== handleSubmit || $[10] !== systemPrompt) {
    t7 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(TextInput, {
        value: systemPrompt,
        onChange: setSystemPrompt,
        onSubmit: handleSubmit,
        placeholder: "~/keys/my-project-vertex.json",
        columns: 60,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
        focus: true,
        showCursor: true,
      }),
    });
    $[8] = cursorOffset;
    $[9] = handleSubmit;
    $[10] = systemPrompt;
    $[11] = t7;
  } else t7 = $[11];
  let t8;
  if ($[12] !== error) {
    t8 =
      error &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(ErrorText, {
          error,
        }),
      });
    $[12] = error;
    $[13] = t8;
  } else t8 = $[13];
  let t9;
  if ($[14] !== t7 || $[15] !== t8) {
    t9 = jsxProd_default(WizardDialogLayout, {
      subtitle: "Service account key",
      footerText,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t5, t6, t7, t8],
      }),
    });
    $[14] = t7;
    $[15] = t8;
    $[16] = t9;
  } else t9 = $[16];
  return t9;
}
export { PromptStep };
