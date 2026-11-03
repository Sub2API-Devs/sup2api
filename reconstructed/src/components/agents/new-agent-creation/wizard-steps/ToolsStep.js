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
import { w } from "../../../../../vendor/react/compiler-runtime.js";
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
  let $ = w(10);
  let { goBack, goToStep, updateWizardData, wizardData } = useWizard();
  let h;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    h = [
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
    $[0] = h;
  } else h = $[0];
  let options = h;
  let f;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    f = {
      adc: VERTEX_WIZARD_STEPS_2.PROJECT,
      serviceAccount: VERTEX_WIZARD_STEPS_2.SERVICE_ACCOUNT,
      environment: VERTEX_WIZARD_STEPS_2.PROJECT,
    };
    $[1] = f;
  } else f = $[1];
  let u = f;
  let k;
  if ($[2] !== goToStep || $[3] !== updateWizardData) {
    k = (selectedTools) => {
      let _ = selectedTools;
      updateWizardData({
        authMethod: _,
      });
      goToStep(u[_]);
    };
    $[2] = goToStep;
    $[3] = updateWizardData;
    $[4] = k;
  } else k = $[4];
  let onChange = k;
  let d;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    d = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Claude Code uses the standard GCP credential chain. Pick the method you already use with gcloud or in your deployment.",
    });
    $[5] = d;
  } else d = $[5];
  let D;
  if ($[6] !== goBack || $[7] !== onChange || $[8] !== wizardData.authMethod) {
    D = jsxProd_default(WizardDialogLayout, {
      subtitle: "How do you authenticate to Google Cloud?",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          d,
          jsxProd_default(ModelSelector, {
            options,
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
    $[9] = D;
  } else D = $[9];
  return D;
}
export { ToolsStep };
