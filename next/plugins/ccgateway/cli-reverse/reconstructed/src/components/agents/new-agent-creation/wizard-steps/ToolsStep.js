/**
 * components/agents/new-agent-creation/wizard-steps/ToolsStep.tsx
 *
 * 向导工具步骤；实际内容为 Google Cloud 认证方式选择（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/ToolsStep.tsx
 * pieces: chunk-y6fv30yg.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { VERTEX_WIZARD_STEPS_2 } from "../../../vertexSetup/VertexSetupWizard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { WizardDialogLayout } from "../../../wizard/WizardDialogLayout.js";
import { ModelSelector } from "../../ModelSelector.js";

//@ chunk-y6fv30yg.js:1525-2554 callgraph-fingerprint = ToolsStep (0.161)
function ToolsStep() {
  let $ = useMemoCache(10);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let options;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Application Default Credentials (gcloud auth)",
        value: "adc",
      },
      {
        label: "Service account key file",
        value: "serviceAccount",
      },
      {
        label: "Use credentials already in my environment",
        value: "environment",
      },
    ];
    $[0] = options;
  } else options = $[0];
  let options_2 = options;
  let nextStepByMethod;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    nextStepByMethod = {
      adc: VERTEX_WIZARD_STEPS_2.PROJECT,
      serviceAccount: VERTEX_WIZARD_STEPS_2.SERVICE_ACCOUNT,
      environment: VERTEX_WIZARD_STEPS_2.PROJECT,
    };
    $[1] = nextStepByMethod;
  } else nextStepByMethod = $[1];
  let nextStep = nextStepByMethod;
  let handleChange;
  if ($[2] !== goToStep || $[3] !== updateWizardData) {
    handleChange = (selectedTools) => {
      let method = selectedTools;
      updateWizardData({
        authMethod: method,
      });
      goToStep(nextStep[method]);
    };
    $[2] = goToStep;
    $[3] = updateWizardData;
    $[4] = handleChange;
  } else handleChange = $[4];
  let onChange = handleChange;
  let introText;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Claude Code uses the standard GCP credential chain. Pick the method you already use with gcloud or in your deployment.",
    });
    $[5] = introText;
  } else introText = $[5];
  let layout;
  if ($[6] !== goBack || $[7] !== onChange || $[8] !== wizardData.authMethod) {
    layout = jsxProd_default(WizardDialogLayout, {
      subtitle: "How do you authenticate to Google Cloud?",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          introText,
          jsxProd_default(ModelSelector, {
            options: options_2,
            defaultValue: wizardData.authMethod,
            onChange,
            onCancel: goBack,
          }),
        ],
      }),
    });
    $[6] = goBack;
    $[7] = onChange;
    $[8] = wizardData.authMethod;
    $[9] = layout;
  } else layout = $[9];
  return layout;
}
export { ToolsStep };
