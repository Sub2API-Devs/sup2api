/**
 * commands/install-github-app/CreatingStep.tsx
 *
 * GitHub App 安装向导：创建工作流与密钥的进度步骤
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/CreatingStep.tsx
 * pieces: chunk-2xbvbqx2.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-2xbvbqx2.js:30752-31695 fingerprint (2.1.88 match: CreatingStep, 0.89)
function CreatingStep(props) {
  let $ = useMemoCache(9);
  let {
    currentWorkflowInstallStep,
    secretExists,
    useExistingSecret,
    secretName,
    skipWorkflow,
    selectedWorkflows,
  } = props;
  let skipWorkflow_2 = skipWorkflow === undefined ? false : skipWorkflow;
  let t2;
  if (
    $[0] !== secretExists ||
    $[1] !== secretName ||
    $[2] !== selectedWorkflows ||
    $[3] !== skipWorkflow_2 ||
    $[4] !== useExistingSecret
  ) {
    t2 = skipWorkflow_2
      ? [
          "Getting repository information",
          secretExists && useExistingSecret
            ? "Using existing API key secret"
            : `Setting up ${secretName} secret`,
        ]
      : [
          "Getting repository information",
          "Creating branch",
          selectedWorkflows.length > 1 ? "Creating workflow files" : "Creating workflow file",
          secretExists && useExistingSecret
            ? "Using existing API key secret"
            : `Setting up ${secretName} secret`,
          "Opening pull request page",
        ];
    $[0] = secretExists;
    $[1] = secretName;
    $[2] = selectedWorkflows;
    $[3] = skipWorkflow_2;
    $[4] = useExistingSecret;
    $[5] = t2;
  } else t2 = $[5];
  let progressSteps = t2;
  let stepLine;
  if ($[6] !== currentWorkflowInstallStep || $[7] !== progressSteps) {
    stepLine = jsxProd_default(Box, {
      flexDirection: "column",
      children: progressSteps.map((stepText, index) => {
        let status = "pending";
        if (index < currentWorkflowInstallStep) status = "completed";
        else if (index === currentWorkflowInstallStep) status = "in-progress";
        return jsxProd_default(
          Box,
          {
            children: jsxProd_default_2(Text, {
              color: status === "completed" ? "success" : status === "in-progress" ? "warning" : undefined,
              children: [
                status === "completed" ? "\u2713 " : "",
                stepText,
                status === "in-progress" ? "\u2026" : "",
              ],
            }),
          },
          index,
        );
      }),
    });
    $[6] = currentWorkflowInstallStep;
    $[7] = progressSteps;
    $[8] = stepLine;
  } else stepLine = $[8];
  return stepLine;
}
export { CreatingStep };
