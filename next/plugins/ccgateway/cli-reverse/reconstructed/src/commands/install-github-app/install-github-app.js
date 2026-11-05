/**
 * commands/install-github-app/install-github-app.tsx
 *
 * 并入已有模块：/install-github-app 入口（后台会话中拒绝运行）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/install-github-app.tsx
 * pieces: chunk-2xbvbqx2.js (3)
 * attribution: fingerprint 2, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { useCallback, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { safeExecShell } from "../../utils/safeSpawn.js";
import { plural } from "../../utils/stringUtils.js";
import { getGithubRepo } from "../../utils/git.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { setupGitHubActions, SetupCancelledError } from "./setupGitHubActions.js";
import { GITHUB_ACTION_SETUP_DOCS_URL, GITLAB_CI_DOCS_URL } from "../../constants/github-app.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { isGithubDotCom, GITHUB_HOST } from "../../utils/git/githubUrl.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CheckingGhCliStep } from "./CheckingGhCliStep.js";
import { WarningsStep } from "./WarningsStep.js";
import { ChooseRepoStep } from "./ChooseRepoStep.js";
import { InstallAppStep } from "./InstallAppStep.js";
import { OptionalActionsSetupStep } from "./OptionalActionsSetupStep.js";
import { ExistingWorkflowStep } from "./ExistingWorkflowStep.js";
import { CheckExistingSecretStep } from "./CheckExistingSecretStep.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ApiKeyStep } from "./ApiKeyStep.js";
import { isAnthropicAuthEnabled, getAnthropicApiKeySafe } from "../../utils/auth.js";
import { CreatingStep } from "./CreatingStep.js";
import { SuccessStep } from "./SuccessStep.js";
import { ErrorStep } from "./ErrorStep.js";
import { WorkflowMultiselectDialog } from "../../components/WorkflowMultiselectDialog.js";
import { OAuthFlowStep } from "./OAuthFlowStep.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { parkCommandForAttacher } from "../../services/mcp/mcpReconnectPark.js";
import { resolveRemoteUrl } from "../../utils/detectRepository.js";
import { getCwd } from "../../utils/cwd.js";
import { ghIsDangerousCallback, getGitHostKind } from "../../utils/gitHosts.js";
import { createStore } from "../../state/store.js";

//@ chunk-2xbvbqx2.js:50041-50593 fingerprint (2.1.88 match: INITIAL_STATE, 0.881)
/**
 * INITIAL_STATE：同旧版。
 */
var INITIAL_STATE = {
  step: "check-gh",
  selectedRepoName: "",
  currentRepo: "",
  useCurrentRepo: false,
  apiKeyOrOAuthToken: "",
  currentWorkflowInstallStep: 0,
  errorInstructions: [],
  warnings: [],
  secretExists: false,
  secretName: "ANTHROPIC_API_KEY",
  useExistingSecret: true,
  workflowExists: false,
  selectedWorkflows: ["claude", "claude-review"],
  selectedApiKeyOption: "new",
  authType: "api_key",
};
var NO_TERMINAL_ERROR_STATE = {
  step: "error",
  error:
    "Can't finish /install-github-app while no terminal is attached to this background session. Attach to it and run the command again.",
  errorReason: "No terminal attached",
  errorInstructions: [],
};
//@ chunk-2xbvbqx2.js:50593-63910 fingerprint (2.1.88 match: InstallGitHubApp, 0.847)
function InstallGitHubApp({ onDone, wizard }) {
  let { storageV5 } = useTheme_2();
  let { cancellation, existingApiKey } = wizard;
  let storeSelector = useStoreSelector(wizard.state);
  let { setState, getState } = wizard.state;
  let clock = useClock();
  let handleCancel = () => {
    if (cancellation.signal.aborted) return;
    cancellation.abort();
    if (getState().step === "creating") {
      setState((state) => ({
        ...state,
        stopRequested: true,
      }));
      return;
    }
    onDone("Installation cancelled by user");
  };
  useGlobalExitKeybindings(handleCancel, undefined, storeSelector.step === "oauth-flow");
  let checkGitHubCLI = useCallback(async () => {
    let warnings = [];
    if (
      (
        await safeExecShell("gh --version", {
          reject: false,
        })
      ).exitCode !== 0
    )
      warnings.push({
        title: "GitHub CLI not found",
        message: "GitHub CLI (gh) does not appear to be installed or accessible.",
        instructions: [
          "Install GitHub CLI from https://cli.github.com/",
          "macOS: brew install gh",
          "Windows: winget install --id GitHub.cli",
          "Linux: See installation instructions at https://github.com/cli/cli#installation",
        ],
      });
    let authResult = await safeExecShell("gh auth status -a", {
      reject: false,
    });
    if (authResult.exitCode !== 0)
      warnings.push({
        title: "GitHub CLI not authenticated",
        message: "GitHub CLI does not appear to be authenticated.",
        instructions: [
          "Run: gh auth login",
          "Follow the prompts to authenticate with GitHub",
          "Or set up authentication using environment variables or other methods",
        ],
      });
    else {
      let tokenScopesMatch = authResult.stdout.match(/Token scopes:.*$/m);
      if (tokenScopesMatch) {
        let scopes = tokenScopesMatch[0];
        let missingScopes = [];
        if (!scopes.includes("repo")) missingScopes.push("repo");
        if (!scopes.includes("workflow")) missingScopes.push("workflow");
        if (missingScopes.length > 0) {
          setState((prev) => ({
            ...prev,
            step: "error",
            error: `GitHub CLI is missing required permissions: ${missingScopes.join(", ")}.`,
            errorReason: "Missing required scopes",
            errorInstructions: [
              `Your GitHub CLI authentication is missing the "${missingScopes.join('" and "')}" ${plural(missingScopes.length, "scope")} needed to manage GitHub Actions and secrets.`,
              "",
              "To fix this, run:",
              "  gh auth refresh -h github.com -s repo,workflow",
              "",
              "This will add the necessary permissions to manage workflows and secrets.",
            ],
          }));
          return;
        }
      }
    }
    let currentRepo = (await getGithubRepo()) ?? "";
    logEvent("tengu_install_github_app_step_completed", {
      step: lit("check-gh"),
    });
    setState((prev) => ({
      ...prev,
      warnings,
      currentRepo,
      selectedRepoName: currentRepo,
      useCurrentRepo: !!currentRepo,
      step: warnings.length > 0 ? "warnings" : "choose-repo",
    }));
  }, [setState]);
  useEffect(() => {
    if (wizard.started.current) return;
    wizard.started.current = true;
    logEvent("tengu_install_github_app_started", {});
    checkGitHubCLI();
  }, [wizard, checkGitHubCLI]);
  let setupRunning = wizard.setupRunning;
  let runSetupGitHubActions = useCallback(
    async (apiKeyOrOAuthToken, secretName) => {
      if (setupRunning.current || cancellation.signal.aborted) return;
      if (isUnattendedBgSession()) {
        logEvent("tengu_install_github_app_error", {
          reason: lit("unattended_bg_session"),
        });
        setState((prev) => ({
          ...prev,
          ...NO_TERMINAL_ERROR_STATE,
        }));
        return;
      }
      setupRunning.current = true;
      setState((prev_4) => ({
        ...prev_4,
        step: "creating",
        currentWorkflowInstallStep: 0,
      }));
      let state = getState();
      try {
        await setupGitHubActions(
          state.selectedRepoName,
          apiKeyOrOAuthToken,
          secretName,
          () => {
            setState((prev) => ({
              ...prev,
              currentWorkflowInstallStep: prev.currentWorkflowInstallStep + 1,
            }));
          },
          state.workflowAction === "skip",
          state.selectedWorkflows,
          state.authType,
          cancellation.signal,
          {
            useCurrentRepo: state.useCurrentRepo,
            workflowExists: state.workflowExists,
            secretExists: state.secretExists,
          },
          storageV5,
        );
        logEvent("tengu_install_github_app_step_completed", {
          step: lit("creating"),
        });
        setState((prev) => ({
          ...prev,
          step: "success",
        }));
      } catch (error) {
        if (error instanceof SetupCancelledError) {
          onDone(
            error.alreadyDone.length === 0
              ? "Installation cancelled by user"
              : `Installation cancelled by user. Already done in ${state.selectedRepoName}: ${error.alreadyDone.join(", ")}.`,
          );
          return;
        }
        let errorMessage = error instanceof Error ? error.message : "Failed to set up GitHub Actions";
        if (errorMessage.includes("workflow file already exists")) {
          logEvent("tengu_install_github_app_error", {
            reason: lit("workflow_file_exists"),
          });
          setState((prev) => ({
            ...prev,
            step: "error",
            error: "A Claude workflow file already exists in this repository.",
            errorReason: "Workflow file conflict",
            errorInstructions: [
              "The file .github/workflows/claude.yml already exists",
              "You can either:",
              "  1. Delete the existing file and run this command again",
              "  2. Update the existing file manually using the template from:",
              `     ${GITHUB_ACTION_SETUP_DOCS_URL}`,
            ],
          }));
        } else {
          logEvent("tengu_install_github_app_error", {
            reason: lit("setup_github_actions_failed"),
          });
          setState((prev) => ({
            ...prev,
            step: "error",
            error: errorMessage,
            errorReason: "GitHub Actions setup failed",
            errorInstructions: [],
          }));
        }
      } finally {
        setupRunning.current = false;
      }
    },
    [cancellation, getState, onDone, setState, setupRunning, storageV5],
  );
  async function openGitHubAppInstallation() {
    if (cancellation.signal.aborted) return;
    await openValidatedUrlSucceeded("https://github.com/apps/claude");
  }
  async function checkRepositoryPermissions(repoName) {
    try {
      let result = await execFileNoThrow("gh", ["api", `repos/${repoName}`, "--jq", ".permissions.admin"]);
      if (result.code === 0)
        return {
          hasAccess: result.stdout.trim() === "true",
        };
      if (result.stderr.includes("404") || result.stderr.includes("Not Found"))
        return {
          hasAccess: false,
          error: "repository_not_found",
        };
      if (/SAML enforcement/i.test(result.stderr))
        return {
          hasAccess: false,
          error: "saml_enforcement",
        };
      return {
        hasAccess: false,
      };
    } catch {
      return {
        hasAccess: false,
      };
    }
  }
  async function checkExistingWorkflowFile(repoName) {
    return (
      (
        await execFileNoThrow("gh", [
          "api",
          `repos/${repoName}/contents/.github/workflows/claude.yml`,
          "--jq",
          ".sha",
        ])
      ).code === 0
    );
  }
  async function checkExistingSecret() {
    let state = getState();
    let checkSecretsResult = await execFileNoThrow("gh", [
      "secret",
      "list",
      "--app",
      "actions",
      "--repo",
      state.selectedRepoName,
    ]);
    if (checkSecretsResult.code === 0) {
      if (
        checkSecretsResult.stdout
          .split(
            `
`,
          )
          .some((line) => /^ANTHROPIC_API_KEY\s+/.test(line))
      )
        setState((prev) => ({
          ...prev,
          secretExists: true,
          step: "check-existing-secret",
        }));
      else if (existingApiKey) {
        setState((prev) => ({
          ...prev,
          apiKeyOrOAuthToken: existingApiKey,
        }));
        await runSetupGitHubActions(existingApiKey, state.secretName);
      } else
        setState((prev) => ({
          ...prev,
          step: "api-key",
        }));
    } else if (existingApiKey) {
      setState((prev) => ({
        ...prev,
        apiKeyOrOAuthToken: existingApiKey,
      }));
      await runSetupGitHubActions(existingApiKey, state.secretName);
    } else
      setState((prev) => ({
        ...prev,
        step: "api-key",
      }));
  }
  let step = storeSelector.step;
  let handleSubmit = async () => {
    let state = getState();
    if (state.step !== step) return;
    if (state.step === "warnings") {
      logEvent("tengu_install_github_app_step_completed", {
        step: lit("warnings"),
      });
      setState((prev) => ({
        ...prev,
        step: "install-app",
      }));
      clock.setTimeout(openGitHubAppInstallation, 0);
    } else if (state.step === "choose-repo") {
      let repoName = state.useCurrentRepo ? state.currentRepo : state.selectedRepoName;
      if (!repoName.trim()) return;
      let repoWarnings = [];
      {
        let host;
        let repoPath;
        if (repoName.includes("://"))
          try {
            let parsedUrl = new URL(repoName);
            host = parsedUrl.hostname;
            repoPath = parsedUrl.pathname.replace(/^\/+/, "");
          } catch {}
        else {
          let match = repoName.match(/^[^@]+@([^:]+):(.+)$/);
          if (match) {
            host = match[1];
            repoPath = match[2];
          } else {
            let separatorIndex = repoName.search(/[:/]/);
            if (separatorIndex > 0) {
              host = repoName.slice(0, separatorIndex);
              repoPath = repoName.slice(separatorIndex + 1);
            }
          }
        }
        if (host && isGithubDotCom(host)) {
          let match = repoPath?.match(/^([^/]+\/[^/]+?)(?:\.git)?\/?$/);
          if (match?.[1]) repoName = match[1];
          else
            repoWarnings.push({
              title: "Invalid GitHub URL format",
              message: "The repository URL format appears to be invalid.",
              instructions: [
                `Use format: owner/repo or https://${GITHUB_HOST}/owner/repo`,
                "Example: anthropics/claude-cli",
              ],
            });
        }
      }
      if (!repoName.includes("/"))
        repoWarnings.push({
          title: "Repository format warning",
          message: 'Repository should be in format "owner/repo"',
          instructions: ["Use format: owner/repo", "Example: anthropics/claude-cli"],
        });
      let permissionCheck = await checkRepositoryPermissions(repoName);
      if (permissionCheck.error === "repository_not_found")
        repoWarnings.push({
          title: "Repository not found",
          message: `Repository ${repoName} was not found or you don't have access.`,
          instructions: [
            `Check that the repository name is correct: ${repoName}`,
            "Ensure you have access to this repository",
            'For private repositories, make sure your GitHub token has the "repo" scope',
            "You can add the repo scope with: gh auth refresh -h github.com -s repo,workflow",
          ],
        });
      else if (permissionCheck.error === "saml_enforcement")
        repoWarnings.push({
          title: "Single sign-on authorization needed",
          message: `${repoName} belongs to an organization that enforces SAML single sign-on, and your GitHub CLI token isn't authorized for it yet.`,
          instructions: [
            "Re-authorize your GitHub CLI login with the repo and workflow scopes",
            "Authorize the organization when GitHub prompts for single sign-on, then run /install-github-app again",
            "If you use a personal access token (GH_TOKEN): open https://github.com/settings/tokens, choose Configure SSO, and authorize the organization",
          ],
        });
      else if (!permissionCheck.hasAccess)
        repoWarnings.push({
          title: "Admin permissions required",
          message: `You might need admin permissions on ${repoName} to set up GitHub Actions.`,
          instructions: [
            "Repository admins can install GitHub Apps and set secrets",
            "Ask a repository admin to run this command if setup fails",
            "Alternatively, you can use the manual setup instructions",
          ],
        });
      let workflowExists = await checkExistingWorkflowFile(repoName);
      if (repoWarnings.length > 0) {
        let allWarnings = [...state.warnings, ...repoWarnings];
        setState((prev) => ({
          ...prev,
          selectedRepoName: repoName,
          workflowExists,
          warnings: allWarnings,
          step: "warnings",
        }));
      } else {
        logEvent("tengu_install_github_app_step_completed", {
          step: lit("choose-repo"),
        });
        setState((prev) => ({
          ...prev,
          selectedRepoName: repoName,
          workflowExists,
          step: "install-app",
        }));
        clock.setTimeout(openGitHubAppInstallation, 0);
      }
    } else if (state.step === "install-app") {
      logEvent("tengu_install_github_app_step_completed", {
        step: lit("install-app"),
      });
      setState((prev) => ({
        ...prev,
        step: "setup-actions-prompt",
      }));
    } else if (state.step === "check-existing-workflow") return;
    else if (state.step === "select-workflows") return;
    else if (state.step === "check-existing-secret") {
      if (!state.useExistingSecret && !state.secretName) return;
      logEvent("tengu_install_github_app_step_completed", {
        step: lit("check-existing-secret"),
      });
      if (state.useExistingSecret) await runSetupGitHubActions(null, state.secretName);
      else await runSetupGitHubActions(state.apiKeyOrOAuthToken || existingApiKey, state.secretName);
    } else if (state.step === "api-key") {
      if (state.selectedApiKeyOption === "oauth") return;
      let apiKeyToUse = state.selectedApiKeyOption === "existing" ? existingApiKey : state.apiKeyOrOAuthToken;
      if (!apiKeyToUse) {
        logEvent("tengu_install_github_app_error", {
          reason: lit("api_key_missing"),
        });
        setState((prev) => ({
          ...prev,
          step: "error",
          error: "API key is required",
        }));
        return;
      }
      setState((prev) => ({
        ...prev,
        apiKeyOrOAuthToken: apiKeyToUse,
        isCheckingSecret: true,
      }));
      let checkSecretsResult_0 = await execFileNoThrow("gh", [
        "secret",
        "list",
        "--app",
        "actions",
        "--repo",
        state.selectedRepoName,
      ]);
      setState((state) => ({
        ...state,
        isCheckingSecret: false,
      }));
      if (cancellation.signal.aborted || getState().step !== "api-key") return;
      if (checkSecretsResult_0.code === 0) {
        if (
          checkSecretsResult_0.stdout
            .split(
              `
`,
            )
            .some((line) => /^ANTHROPIC_API_KEY\s+/.test(line))
        ) {
          logEvent("tengu_install_github_app_step_completed", {
            step: lit("api-key"),
          });
          setState((prev) => ({
            ...prev,
            secretExists: true,
            step: "check-existing-secret",
          }));
        } else {
          logEvent("tengu_install_github_app_step_completed", {
            step: lit("api-key"),
          });
          await runSetupGitHubActions(apiKeyToUse, state.secretName);
        }
      } else {
        logEvent("tengu_install_github_app_step_completed", {
          step: lit("api-key"),
        });
        await runSetupGitHubActions(apiKeyToUse, state.secretName);
      }
    }
  };
  let handleRepoUrlChange = (value) => {
    setState((prev) => ({
      ...prev,
      selectedRepoName: value,
    }));
  };
  let handleApiKeyChange = (value) => {
    setState((prev) => ({
      ...prev,
      apiKeyOrOAuthToken: value,
    }));
  };
  let handleApiKeyOptionChange = (option) => {
    setState((prev) => ({
      ...prev,
      selectedApiKeyOption: option,
    }));
  };
  let handleCreateOAuthToken = useCallback(() => {
    if (isUnattendedBgSession()) {
      logEvent("tengu_install_github_app_error", {
        reason: lit("unattended_bg_session"),
      });
      setState((prev_22) => ({
        ...prev_22,
        ...NO_TERMINAL_ERROR_STATE,
      }));
      return;
    }
    logEvent("tengu_install_github_app_step_completed", {
      step: lit("api-key"),
    });
    setState((prev) => ({
      ...prev,
      step: "oauth-flow",
    }));
  }, [setState]);
  let handleOAuthSuccess = useCallback(
    (token) => {
      logEvent("tengu_install_github_app_step_completed", {
        step: lit("oauth-flow"),
      });
      setState((prev) => ({
        ...prev,
        apiKeyOrOAuthToken: token,
        secretName: "CLAUDE_CODE_OAUTH_TOKEN",
        authType: "oauth_token",
      }));
      runSetupGitHubActions(token, "CLAUDE_CODE_OAUTH_TOKEN");
    },
    [runSetupGitHubActions, setState],
  );
  let handleOAuthCancel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: "api-key",
    }));
  }, [setState]);
  let handleSecretNameChange = (value) => {
    if (value && !/^[a-zA-Z0-9_]+$/.test(value)) return;
    setState((prev) => ({
      ...prev,
      secretName: value,
    }));
  };
  let handleToggleUseCurrentRepo = (useCurrentRepo) => {
    setState((prev) =>
      prev.useCurrentRepo === useCurrentRepo
        ? prev
        : {
            ...prev,
            useCurrentRepo,
            selectedRepoName: useCurrentRepo ? prev.currentRepo : "",
          },
    );
  };
  let handleToggleUseExistingKey = (useExistingSecret) => {
    setState((prev_27) =>
      prev_27.useExistingSecret === useExistingSecret
        ? prev_27
        : {
            ...prev_27,
            useExistingSecret,
            secretName: useExistingSecret ? "ANTHROPIC_API_KEY" : "",
          },
    );
  };
  let handleToggleUseExistingSecret = (useExistingSecret) => {
    logEvent("tengu_install_github_app_step_completed", {
      step: lit("setup-actions-prompt"),
      action: fromEnum(useExistingSecret),
    });
    if (useExistingSecret === "skip")
      setState((prev_28) => ({
        ...prev_28,
        step: "success",
        appOnlyInstall: true,
      }));
    else if (storeSelector.workflowExists)
      setState((state) => ({
        ...state,
        step: "check-existing-workflow",
      }));
    else
      setState((state) => ({
        ...state,
        step: "select-workflows",
      }));
  };
  let handleWorkflowAction = async (action) => {
    if (action === "exit") {
      handleCancel();
      return;
    }
    logEvent("tengu_install_github_app_step_completed", {
      step: lit("check-existing-workflow"),
    });
    setState((prev) => ({
      ...prev,
      workflowAction: action,
    }));
    if (action === "skip" || action === "update")
      if (existingApiKey) await checkExistingSecret();
      else
        setState((prev) => ({
          ...prev,
          step: "api-key",
        }));
  };
  function handleDismissKeyDown(e) {
    e.preventDefault();
    handleDismissKeyDown_2();
  }
  function handleDismissKeyDown_2() {
    if (storeSelector.step === "success") logEvent("tengu_install_github_app_completed", {});
    onDone(
      storeSelector.step === "success"
        ? storeSelector.appOnlyInstall
          ? "GitHub App installed!"
          : "GitHub Actions setup complete!"
        : storeSelector.error
          ? `Couldn't install GitHub App: ${storeSelector.error}
For manual setup instructions, see: ${GITHUB_ACTION_SETUP_DOCS_URL}`
          : `GitHub App installation failed
For manual setup instructions, see: ${GITHUB_ACTION_SETUP_DOCS_URL}`,
    );
  }
  let title;
  let canContinue = false;
  let showContinueHint = true;
  let stepContent;
  switch (storeSelector.step) {
    case "check-gh":
      showContinueHint = false;
      stepContent = jsxProd_default(CheckingGhCliStep, {});
      break;
    case "warnings":
      stepContent = jsxProd_default(WarningsStep, {
        warnings: storeSelector.warnings,
        onContinue: handleSubmit,
      });
      break;
    case "choose-repo":
      title = "Select GitHub repository";
      canContinue = !!storeSelector.currentRepo;
      stepContent = jsxProd_default(ChooseRepoStep, {
        currentRepo: storeSelector.currentRepo,
        useCurrentRepo: storeSelector.useCurrentRepo,
        repoUrl: storeSelector.selectedRepoName,
        onRepoUrlChange: handleRepoUrlChange,
        onToggleUseCurrentRepo: handleToggleUseCurrentRepo,
        onSubmit: handleSubmit,
      });
      break;
    case "install-app":
      stepContent = jsxProd_default(InstallAppStep, {
        repoUrl: storeSelector.selectedRepoName,
        onSubmit: handleSubmit,
      });
      break;
    case "setup-actions-prompt":
      title = "Set up GitHub Actions";
      canContinue = true;
      stepContent = jsxProd_default(OptionalActionsSetupStep, {
        onSelect: handleToggleUseExistingSecret,
        onCancel: handleCancel,
      });
      break;
    case "check-existing-workflow":
      title = `Repository: ${storeSelector.selectedRepoName}`;
      canContinue = true;
      stepContent = jsxProd_default(ExistingWorkflowStep, {
        onSelectAction: handleWorkflowAction,
      });
      break;
    case "check-existing-secret":
      title = "Setup API key secret";
      canContinue = true;
      stepContent = jsxProd_default(CheckExistingSecretStep, {
        useExistingSecret: storeSelector.useExistingSecret,
        secretName: storeSelector.secretName,
        onToggleUseExistingSecret: handleToggleUseExistingKey,
        onSecretNameChange: handleSecretNameChange,
        onSubmit: handleSubmit,
      });
      break;
    case "api-key":
      title = "Choose API key";
      canContinue = true;
      stepContent = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default(ApiKeyStep, {
            existingApiKey,
            apiKeyOrOAuthToken: storeSelector.apiKeyOrOAuthToken,
            onApiKeyChange: handleApiKeyChange,
            onSubmit: handleSubmit,
            onCreateOAuthToken: isAnthropicAuthEnabled() ? handleCreateOAuthToken : undefined,
            selectedOption: storeSelector.selectedApiKeyOption,
            onSelectOption: handleApiKeyOptionChange,
          }),
          storeSelector.isCheckingSecret &&
            jsxProd_default(Text, {
              dimColor: true,
              children: "Checking for an existing ANTHROPIC_API_KEY secret\u2026",
            }),
        ],
      });
      break;
    case "creating":
      title = "Create GitHub Actions workflow";
      showContinueHint = false;
      stepContent = jsxProd_default(CreatingStep, {
        currentWorkflowInstallStep: storeSelector.currentWorkflowInstallStep,
        secretExists: storeSelector.secretExists,
        useExistingSecret: storeSelector.useExistingSecret,
        secretName: storeSelector.secretName,
        skipWorkflow: storeSelector.workflowAction === "skip",
        selectedWorkflows: storeSelector.selectedWorkflows,
      });
      break;
    case "success":
      title = "Success";
      stepContent = jsxProd_default(Box, {
        tabIndex: 0,
        autoFocus: true,
        onKeyDown: handleDismissKeyDown,
        children: jsxProd_default(SuccessStep, {
          secretExists: storeSelector.secretExists,
          useExistingSecret: storeSelector.useExistingSecret,
          secretName: storeSelector.secretName,
          skipWorkflow: storeSelector.workflowAction === "skip",
          appOnlyInstall: storeSelector.appOnlyInstall,
        }),
      });
      break;
    case "error":
      stepContent = jsxProd_default(Box, {
        tabIndex: 0,
        autoFocus: true,
        onKeyDown: handleDismissKeyDown,
        children: jsxProd_default(ErrorStep, {
          error: storeSelector.error,
          errorReason: storeSelector.errorReason,
          errorInstructions: storeSelector.errorInstructions,
        }),
      });
      break;
    case "select-workflows":
      return jsxProd_default(WorkflowMultiselectDialog, {
        defaultSelections: storeSelector.selectedWorkflows,
        onSubmit: (selectedWorkflows) => {
          logEvent("tengu_install_github_app_step_completed", {
            step: lit("select-workflows"),
          });
          setState((prev) => ({
            ...prev,
            selectedWorkflows,
          }));
          if (existingApiKey) checkExistingSecret();
          else
            setState((prev) => ({
              ...prev,
              step: "api-key",
            }));
        },
      });
    case "oauth-flow":
      return jsxProd_default(OAuthFlowStep, {
        onSuccess: handleOAuthSuccess,
        onCancel: handleOAuthCancel,
      });
  }
  let isFinished = storeSelector.step === "success" || storeSelector.step === "error";
  let isStopping = storeSelector.step === "creating" && !!storeSelector.stopRequested;
  return jsxProd_default(
    Dialog,
    {
      title: "Install GitHub App",
      subtitle: title,
      onCancel: isFinished ? handleDismissKeyDown_2 : handleCancel,
      exitOnCtrlCD: isStopping,
      inputGuide: isFinished
        ? "Press any key to exit"
        : isStopping
          ? "Stopping after the step in progress\u2026"
          : jsxProd_default_2(Byline, {
              children: [
                canContinue &&
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: ["up", "down"],
                    action: "select",
                  }),
                showContinueHint &&
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "continue",
                  }),
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "confirm:no",
                  context: "Confirmation",
                  fallback: "Esc",
                  description: "cancel",
                }),
              ],
            }),
      children: stepContent,
    },
    isStopping ? "stopping" : "open",
  );
}
//@ chunk-2xbvbqx2.js:63910-65269 placement
/**
 * /install-github-app 入口：无终端的后台会话中拒绝运行，校验是 GitHub 仓库后打开安装向导。
 */
async function runInstallGitHubApp(onDone, context) {
  if (isUnattendedBgSession()) {
    let parked = await parkCommandForAttacher(
      context.session.host,
      "open this session to finish /install-github-app",
      "/install-github-app requested",
      context.storageV5,
    );
    onDone(
      parked
        ? `Can't run /install-github-app while no terminal is attached to this background session. This session now shows "needs input" in agent view \u2014 open it and run the command again.`
        : "Can't run /install-github-app while no terminal is attached to this background session. Attach to it and run the command again.",
      {
        display: "system",
      },
    );
    return null;
  }
  let remoteUrl = await resolveRemoteUrl(getCwd());
  let dangerousCallback = remoteUrl ? ghIsDangerousCallback(remoteUrl) : null;
  let hostKind = dangerousCallback ? getGitHostKind(dangerousCallback) : null;
  if (hostKind === "gitlab") {
    onDone(
      `The Claude GitHub App only works with GitHub repositories, and this repository's git remote is on GitLab. To run Claude Code from GitLab CI/CD instead, see ${GITLAB_CI_DOCS_URL}. To install the app for a GitHub repository, run /install-github-app from a checkout of that repository.`,
      {
        display: "system",
      },
    );
    return null;
  }
  if (hostKind === "bitbucket") {
    onDone(
      "The Claude GitHub App only works with GitHub repositories, and this repository's git remote is on Bitbucket. To install the app for a GitHub repository, run /install-github-app from a checkout of that repository.",
      {
        display: "system",
      },
    );
    return null;
  }
  let anthropicApiKey = getAnthropicApiKeySafe();
  return jsxProd_default(InstallGitHubApp, {
    onDone,
    wizard: {
      state: createStore({
        ...INITIAL_STATE,
        selectedApiKeyOption: anthropicApiKey ? "existing" : isAnthropicAuthEnabled() ? "oauth" : "new",
      }),
      cancellation: new AbortController(),
      started: {
        current: false,
      },
      setupRunning: {
        current: false,
      },
      existingApiKey: anthropicApiKey,
    },
  });
}
export { NO_TERMINAL_ERROR_STATE, runInstallGitHubApp };
