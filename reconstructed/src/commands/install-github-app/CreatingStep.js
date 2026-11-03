/**
 * commands/install-github-app/CreatingStep.tsx
 *
 * GitHub App 安装向导：创建工作流与密钥的进度步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/CreatingStep.tsx
 * pieces: chunk-4v9zy7gn.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-4v9zy7gn.js:29707-30650 fingerprint = CreatingStep (0.89)
function CreatingStep(t0) {
  let A = w(9),
    {
      currentWorkflowInstallStep: currentWorkflowInstallStep,
      secretExists: secretExists,
      useExistingSecret: useExistingSecret,
      secretName: secretName,
      skipWorkflow: t1,
      selectedWorkflows: selectedWorkflows,
    } = t0,
    skipWorkflow = t1 === void 0 ? !1 : t1,
    g;
  if (
    A[0] !== secretExists ||
    A[1] !== secretName ||
    A[2] !== selectedWorkflows ||
    A[3] !== skipWorkflow ||
    A[4] !== useExistingSecret
  )
    ((g = skipWorkflow
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
        ]),
      (A[0] = secretExists),
      (A[1] = secretName),
      (A[2] = selectedWorkflows),
      (A[3] = skipWorkflow),
      (A[4] = useExistingSecret),
      (A[5] = g));
  else g = A[5];
  let progressSteps = g,
    k;
  if (A[6] !== currentWorkflowInstallStep || A[7] !== progressSteps)
    ((k = e(Box, {
      flexDirection: "column",
      children: progressSteps.map((stepText, index) => {
        let status = "pending";
        if (index < currentWorkflowInstallStep) status = "completed";
        else if (index === currentWorkflowInstallStep) status = "in-progress";
        return e(
          Box,
          {
            children: r(Text, {
              color: status === "completed" ? "success" : status === "in-progress" ? "warning" : void 0,
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
    })),
      (A[6] = currentWorkflowInstallStep),
      (A[7] = progressSteps),
      (A[8] = k));
  else k = A[8];
  return k;
}

export { CreatingStep };
