/**
 * commands/install-github-app/setupGitHubActions.ts
 *
 * 并入已有模块：GitHub Actions 工作流写入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/setupGitHubActions.ts
 * pieces: chunk-4v9zy7gn.js (3)
 * attribution: placement 1, fingerprint 2
 */
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  WORKFLOW_CONTENT,
  CODE_REVIEW_PLUGIN_WORKFLOW_CONTENT,
  PR_TITLE,
  PR_BODY,
} from "../../constants/github-app.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { fi } from "../../utils/browser.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";

//@ chunk-4v9zy7gn.js:42521-42667 placement
class SetupCancelledError extends Error {
  alreadyDone;
  constructor(I) {
    super("GitHub Actions setup was cancelled");
    this.alreadyDone = I;
    this.name = "SetupCancelledError";
  }
}
//@ chunk-4v9zy7gn.js:42667-44266 fingerprint = createWorkflowFile (0.884)
async function createWorkflowFile({
  repoName: repoName,
  branchName: branchName,
  workflowPath: workflowPath,
  workflowContent: workflowContent,
  secretName: secretName,
  message: message,
  context: context,
  signal: signal,
}) {
  let checkFileResult = await execFileNoThrow("gh", [
      "api",
      `repos/${repoName}/contents/${workflowPath}`,
      "--jq",
      ".sha",
    ]),
    fileSha = null;
  if (checkFileResult.code === 0) fileSha = checkFileResult.stdout.trim();
  let content = workflowContent;
  if (secretName === "CLAUDE_CODE_OAUTH_TOKEN")
    content = workflowContent.replace(
      /anthropic_api_key: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/g,
      "claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}",
    );
  else if (secretName !== "ANTHROPIC_API_KEY")
    content = workflowContent.replace(
      /anthropic_api_key: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/g,
      `anthropic_api_key: \${{ secrets.${secretName} }}`,
    );
  let base64Content = Buffer.from(content).toString("base64"),
    apiParams = [
      "api",
      "--method",
      "PUT",
      `repos/${repoName}/contents/${workflowPath}`,
      "-f",
      `message=${fileSha ? `"Update ${message}"` : `"${message}"`}`,
      "-f",
      `content=${base64Content}`,
      "-f",
      `branch=${branchName}`,
    ];
  if (fileSha) apiParams.push("-f", `sha=${fileSha}`);
  signal.throwIfAborted();
  let createFileResult = await execFileNoThrow("gh", apiParams);
  if (createFileResult.code !== 0) {
    if (createFileResult.stderr.includes("422") && createFileResult.stderr.includes("sha"))
      throw (
        logEvent("tengu_setup_github_actions_failed", {
          reason: lit("failed_to_create_workflow_file"),
          exit_code: createFileResult.code,
          ...context,
        }),
        Error(
          `Failed to create workflow file ${workflowPath}: A Claude workflow file already exists in this repository. Please remove it first or update it manually.`,
        )
      );
    logEvent("tengu_setup_github_actions_failed", {
      reason: lit("failed_to_create_workflow_file"),
      exit_code: createFileResult.code,
      ...context,
    });
    let helpText =
      `

Need help? Common issues:
` +
      `\xB7 Permission denied \u2192 Run: gh auth refresh -h github.com -s repo,workflow
` +
      `\xB7 Not authorized \u2192 Ensure you have admin access to the repository
` +
      "\xB7 For manual setup \u2192 Visit: https://github.com/anthropics/claude-code-action";
    throw Error(`Failed to create workflow file ${workflowPath}: ${createFileResult.stderr}${helpText}`);
  }
}
//@ chunk-4v9zy7gn.js:44266-47620 fingerprint = setupGitHubActions (0.889)
async function setupGitHubActions(I, i, p, f, C = !1, u, o, v, A, g) {
  let _ = [];
  try {
    logEvent("tengu_setup_github_actions_started", {
      skip_workflow: C,
      has_api_key: !!i,
      using_default_secret_name: p === "ANTHROPIC_API_KEY",
      selected_claude_workflow: u.includes("claude"),
      selected_claude_review_workflow: u.includes("claude-review"),
      ...A,
    });
    let repoCheckResult = await execFileNoThrow("gh", ["api", `repos/${I}`, "--jq", ".id"]);
    if (repoCheckResult.code !== 0)
      throw (
        logEvent("tengu_setup_github_actions_failed", {
          reason: lit("repo_not_found"),
          exit_code: repoCheckResult.code,
          ...A,
        }),
        Error(`Failed to access repository ${I}: ${repoCheckResult.stderr}`)
      );
    let defaultBranchResult = await execFileNoThrow("gh", ["api", `repos/${I}`, "--jq", ".default_branch"]);
    if (defaultBranchResult.code !== 0)
      throw (
        logEvent("tengu_setup_github_actions_failed", {
          reason: lit("failed_to_get_default_branch"),
          exit_code: defaultBranchResult.code,
          ...A,
        }),
        Error(`Failed to get default branch: ${defaultBranchResult.stderr}`)
      );
    let defaultBranch = defaultBranchResult.stdout.trim(),
      shaResult = await execFileNoThrow("gh", [
        "api",
        `repos/${I}/git/ref/heads/${defaultBranch}`,
        "--jq",
        ".object.sha",
      ]);
    if (shaResult.code !== 0)
      throw (
        logEvent("tengu_setup_github_actions_failed", {
          reason: lit("failed_to_get_branch_sha"),
          exit_code: shaResult.code,
          ...A,
        }),
        Error(`Failed to get branch SHA: ${shaResult.stderr}`)
      );
    let sha = shaResult.stdout.trim(),
      branchName = null;
    if (!C) {
      (f(), (branchName = `add-claude-github-actions-${Date.now()}`), v.throwIfAborted());
      let createBranchResult = await execFileNoThrow("gh", [
        "api",
        "--method",
        "POST",
        `repos/${I}/git/refs`,
        "-f",
        `ref=refs/heads/${branchName}`,
        "-f",
        `sha=${sha}`,
      ]);
      if (createBranchResult.code !== 0)
        throw (
          logEvent("tengu_setup_github_actions_failed", {
            reason: lit("failed_to_create_branch"),
            exit_code: createBranchResult.code,
            ...A,
          }),
          Error(`Failed to create branch: ${createBranchResult.stderr}`)
        );
      (_.push(`created branch ${branchName}`), f());
      let B = [];
      if (u.includes("claude"))
        B.push({
          path: ".github/workflows/claude.yml",
          content: WORKFLOW_CONTENT,
          message: "Claude PR Assistant workflow",
        });
      if (u.includes("claude-review"))
        B.push({
          path: ".github/workflows/claude-code-review.yml",
          content: CODE_REVIEW_PLUGIN_WORKFLOW_CONTENT,
          message: "Claude Code Review workflow",
        });
      for (let workflow of B)
        (await createWorkflowFile({
          repoName: I,
          branchName: branchName,
          workflowPath: workflow.path,
          workflowContent: workflow.content,
          secretName: p,
          message: workflow.message,
          context: A,
          signal: v,
        }),
          _.push(`wrote ${workflow.path} to it`));
    }
    if ((f(), i)) {
      v.throwIfAborted();
      let setSecretResult = await execFileNoThrow("gh", ["secret", "set", p, "--body", i, "--repo", I]);
      if (setSecretResult.code !== 0) {
        logEvent("tengu_setup_github_actions_failed", {
          reason: lit("failed_to_set_api_key_secret"),
          exit_code: setSecretResult.code,
          ...A,
        });
        let helpText =
          `

Need help? Common issues:
` +
          `\xB7 Permission denied \u2192 Run: gh auth refresh -h github.com -s repo
` +
          `\xB7 Not authorized \u2192 Ensure you have admin access to the repository
` +
          "\xB7 For manual setup \u2192 Visit: https://github.com/anthropics/claude-code-action";
        throw Error(`Failed to set API key secret: ${setSecretResult.stderr || "Unknown error"}${helpText}`);
      }
      _.push(`saved the ${p} secret`);
    }
    if (!C && branchName) {
      f();
      let compareUrl = `https://github.com/${I}/compare/${defaultBranch}...${branchName}?quick_pull=1&title=${encodeURIComponent(PR_TITLE)}&body=${encodeURIComponent(PR_BODY)}`;
      (v.throwIfAborted(),
        await raceWithAbortSignal(
          fi(compareUrl),
          v,
          () => new SetupCancelledError([..._, "started opening the pull request page"]),
        ));
    }
    (logEvent("tengu_setup_github_actions_completed", {
      skip_workflow: C,
      has_api_key: !!i,
      auth_type: fromEnum(o),
      using_default_secret_name: p === "ANTHROPIC_API_KEY",
      selected_claude_workflow: u.includes("claude"),
      selected_claude_review_workflow: u.includes("claude-review"),
      ...A,
    }),
      saveGlobalConfig(
        (current) => ({ ...current, githubActionSetupCount: (current.githubActionSetupCount ?? 0) + 1 }),
        g,
      ));
  } catch (error) {
    if (error instanceof SetupCancelledError) throw error;
    if (v.aborted && error === v.reason) throw new SetupCancelledError(_);
    if (error instanceof Error && error.message.includes("Failed to"))
      logForDebugging(`GitHub Actions setup failed: ${error.message}`, { level: "error" });
    else if (
      (logEvent("tengu_setup_github_actions_failed", { reason: lit("unexpected_error"), ...A }),
      error instanceof Error)
    )
      logError(error);
    throw error;
  }
}

export { setupGitHubActions, SetupCancelledError };
