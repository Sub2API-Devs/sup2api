/**
 * commands/install-github-app/install-github-app.tsx
 *
 * 并入已有模块：/install-github-app 入口（后台会话中拒绝运行）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/install-github-app.tsx
 * pieces: chunk-4v9zy7gn.js (3)
 * attribution: fingerprint 2, placement 1
 */
import { Me } from "../../components/design-system/ThemeProvider.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { ce, P } from "../../../vendor/react/cjs/react.production.js";
import { safeExecShell } from "../../utils/safeSpawn.js";
import { plural } from "../../utils/stringUtils.js";
import { getGithubRepo } from "../../utils/git.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { setupGitHubActions, SetupCancelledError } from "./setupGitHubActions.js";
import { GITHUB_ACTION_SETUP_DOCS_URL, GITLAB_CI_DOCS_URL } from "../../constants/github-app.js";
import { fi } from "../../utils/browser.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { isGithubDotCom, GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CheckingGhCliStep } from "./_new/CheckingGhCliStep.js";
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

/**
 * INITIAL_STATE：同旧版。
 */
//@ chunk-4v9zy7gn.js:48997-49567 fingerprint = INITIAL_STATE (0.885)
var INITIAL_STATE = {
    step: "check-gh",
    selectedRepoName: "",
    currentRepo: "",
    useCurrentRepo: !1,
    apiKeyOrOAuthToken: "",
    useExistingKey: !0,
    currentWorkflowInstallStep: 0,
    errorInstructions: [],
    warnings: [],
    secretExists: !1,
    secretName: "ANTHROPIC_API_KEY",
    useExistingSecret: !0,
    workflowExists: !1,
    selectedWorkflows: ["claude", "claude-review"],
    selectedApiKeyOption: "new",
    authType: "api_key",
  },
  NO_TERMINAL_ERROR_STATE = {
    step: "error",
    error:
      "Can't finish /install-github-app while no terminal is attached to this background session. Attach to it and run the command again.",
    errorReason: "No terminal attached",
    errorInstructions: [],
  };
//@ chunk-4v9zy7gn.js:49567-63101 fingerprint = InstallGitHubApp (0.848)
function InstallGitHubApp({ onDone: onDone, wizard: wizard }) {
  let { storageV5: storageV5 } = Me(),
    { cancellation: cancellation, existingApiKey: existingApiKey } = wizard,
    u = useStoreSelector(wizard.state),
    { setState: setState, getState: getState } = wizard.state,
    A = useClock(),
    g = () => {
      if (cancellation.signal.aborted) return;
      if ((cancellation.abort(), getState().step === "creating")) {
        setState((m) => ({ ...m, stopRequested: !0 }));
        return;
      }
      onDone("Installation cancelled by user");
    };
  useGlobalExitKeybindings(g, void 0, u.step === "oauth-flow");
  let checkGitHubCLI = ce(async () => {
    let m = [];
    if ((await safeExecShell("gh --version", { reject: !1 })).exitCode !== 0)
      m.push({
        title: "GitHub CLI not found",
        message: "GitHub CLI (gh) does not appear to be installed or accessible.",
        instructions: [
          "Install GitHub CLI from https://cli.github.com/",
          "macOS: brew install gh",
          "Windows: winget install --id GitHub.cli",
          "Linux: See installation instructions at https://github.com/cli/cli#installation",
        ],
      });
    let authResult = await safeExecShell("gh auth status -a", { reject: !1 });
    if (authResult.exitCode !== 0)
      m.push({
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
        let scopes = tokenScopesMatch[0],
          Q = [];
        if (!scopes.includes("repo")) Q.push("repo");
        if (!scopes.includes("workflow")) Q.push("workflow");
        if (Q.length > 0) {
          setState((prev) => ({
            ...prev,
            step: "error",
            error: `GitHub CLI is missing required permissions: ${Q.join(", ")}.`,
            errorReason: "Missing required scopes",
            errorInstructions: [
              `Your GitHub CLI authentication is missing the "${Q.join('" and "')}" ${plural(Q.length, "scope")} needed to manage GitHub Actions and secrets.`,
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
    let K = (await getGithubRepo()) ?? "";
    (logEvent("tengu_install_github_app_step_completed", { step: lit("check-gh") }),
      setState((prev_0) => ({
        ...prev_0,
        warnings: m,
        currentRepo: K,
        selectedRepoName: K,
        useCurrentRepo: !!K,
        step: m.length > 0 ? "warnings" : "choose-repo",
      })));
  }, [setState]);
  P(() => {
    if (wizard.started.current) return;
    ((wizard.started.current = !0), logEvent("tengu_install_github_app_started", {}), checkGitHubCLI());
  }, [wizard, checkGitHubCLI]);
  let setupRunning = wizard.setupRunning,
    runSetupGitHubActions = ce(
      async (apiKeyOrOAuthToken, secretName) => {
        if (setupRunning.current || cancellation.signal.aborted) return;
        if (isUnattendedBgSession()) {
          (logEvent("tengu_install_github_app_error", { reason: lit("unattended_bg_session") }),
            setState((prev_1) => ({ ...prev_1, ...NO_TERMINAL_ERROR_STATE })));
          return;
        }
        ((setupRunning.current = !0),
          setState((prev_4) => ({ ...prev_4, step: "creating", currentWorkflowInstallStep: 0 })));
        let H = getState();
        try {
          (await setupGitHubActions(
            H.selectedRepoName,
            apiKeyOrOAuthToken,
            secretName,
            () => {
              setState((prev_5) => ({
                ...prev_5,
                currentWorkflowInstallStep: prev_5.currentWorkflowInstallStep + 1,
              }));
            },
            H.workflowAction === "skip",
            H.selectedWorkflows,
            H.authType,
            cancellation.signal,
            {
              useCurrentRepo: H.useCurrentRepo,
              workflowExists: H.workflowExists,
              secretExists: H.secretExists,
            },
            storageV5,
          ),
            logEvent("tengu_install_github_app_step_completed", { step: lit("creating") }),
            setState((K) => ({ ...K, step: "success" })));
        } catch (error) {
          if (error instanceof SetupCancelledError) {
            onDone(
              error.alreadyDone.length === 0
                ? "Installation cancelled by user"
                : `Installation cancelled by user. Already done in ${H.selectedRepoName}: ${error.alreadyDone.join(", ")}.`,
            );
            return;
          }
          let z = error instanceof Error ? error.message : "Failed to set up GitHub Actions";
          if (z.includes("workflow file already exists"))
            (logEvent("tengu_install_github_app_error", { reason: lit("workflow_file_exists") }),
              setState((prev_2) => ({
                ...prev_2,
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
              })));
          else
            (logEvent("tengu_install_github_app_error", { reason: lit("setup_github_actions_failed") }),
              setState((prev_3) => ({
                ...prev_3,
                step: "error",
                error: z,
                errorReason: "GitHub Actions setup failed",
                errorInstructions: [],
              })));
        } finally {
          setupRunning.current = !1;
        }
      },
      [cancellation, getState, onDone, setState, setupRunning, storageV5],
    );
  async function openGitHubAppInstallation() {
    if (cancellation.signal.aborted) return;
    await fi("https://github.com/apps/claude");
  }
  async function checkRepositoryPermissions(repoName) {
    try {
      let result = await execFileNoThrow("gh", ["api", `repos/${repoName}`, "--jq", ".permissions.admin"]);
      if (result.code === 0) return { hasAccess: result.stdout.trim() === "true" };
      if (result.stderr.includes("404") || result.stderr.includes("Not Found"))
        return { hasAccess: !1, error: "repository_not_found" };
      if (/SAML enforcement/i.test(result.stderr)) return { hasAccess: !1, error: "saml_enforcement" };
      return { hasAccess: !1 };
    } catch {
      return { hasAccess: !1 };
    }
  }
  async function checkExistingWorkflowFile(repoName_0) {
    return (
      (
        await execFileNoThrow("gh", [
          "api",
          `repos/${repoName_0}/contents/.github/workflows/claude.yml`,
          "--jq",
          ".sha",
        ])
      ).code === 0
    );
  }
  async function checkExistingSecret() {
    let m = getState(),
      checkSecretsResult = await execFileNoThrow("gh", [
        "secret",
        "list",
        "--app",
        "actions",
        "--repo",
        m.selectedRepoName,
      ]);
    if (checkSecretsResult.code === 0)
      if (
        checkSecretsResult.stdout
          .split(
            `
`,
          )
          .some((line) => /^ANTHROPIC_API_KEY\s+/.test(line))
      )
        setState((prev_6) => ({ ...prev_6, secretExists: !0, step: "check-existing-secret" }));
      else if (existingApiKey)
        (setState((prev_7) => ({ ...prev_7, apiKeyOrOAuthToken: existingApiKey, useExistingKey: !0 })),
          await runSetupGitHubActions(existingApiKey, m.secretName));
      else setState((prev_8) => ({ ...prev_8, step: "api-key" }));
    else if (existingApiKey)
      (setState((prev_9) => ({ ...prev_9, apiKeyOrOAuthToken: existingApiKey, useExistingKey: !0 })),
        await runSetupGitHubActions(existingApiKey, m.secretName));
    else setState((prev_10) => ({ ...prev_10, step: "api-key" }));
  }
  let step = u.step,
    handleSubmit = async () => {
      let m = getState();
      if (m.step !== step) return;
      if (m.step === "warnings")
        (logEvent("tengu_install_github_app_step_completed", { step: lit("warnings") }),
          setState((prev_11) => ({ ...prev_11, step: "install-app" })),
          A.setTimeout(openGitHubAppInstallation, 0));
      else if (m.step === "choose-repo") {
        let h = m.useCurrentRepo ? m.currentRepo : m.selectedRepoName;
        if (!h.trim()) return;
        let H = [];
        {
          let L, Q;
          if (h.includes("://"))
            try {
              let ne = new URL(h);
              ((L = ne.hostname), (Q = ne.pathname.replace(/^\/+/, "")));
            } catch {}
          else {
            let match = h.match(/^[^@]+@([^:]+):(.+)$/);
            if (match) ((L = match[1]), (Q = match[2]));
            else {
              let search = h.search(/[:/]/);
              if (search > 0) ((L = h.slice(0, search)), (Q = h.slice(search + 1)));
            }
          }
          if (L && isGithubDotCom(L)) {
            let ne = Q?.match(/^([^/]+\/[^/]+?)(?:\.git)?\/?$/);
            if (ne?.[1]) h = ne[1];
            else
              H.push({
                title: "Invalid GitHub URL format",
                message: "The repository URL format appears to be invalid.",
                instructions: [
                  `Use format: owner/repo or https://${GITHUB_HOST}/owner/repo`,
                  "Example: anthropics/claude-cli",
                ],
              });
          }
        }
        if (!h.includes("/"))
          H.push({
            title: "Repository format warning",
            message: 'Repository should be in format "owner/repo"',
            instructions: ["Use format: owner/repo", "Example: anthropics/claude-cli"],
          });
        let permissionCheck = await checkRepositoryPermissions(h);
        if (permissionCheck.error === "repository_not_found")
          H.push({
            title: "Repository not found",
            message: `Repository ${h} was not found or you don't have access.`,
            instructions: [
              `Check that the repository name is correct: ${h}`,
              "Ensure you have access to this repository",
              'For private repositories, make sure your GitHub token has the "repo" scope',
              "You can add the repo scope with: gh auth refresh -h github.com -s repo,workflow",
            ],
          });
        else if (permissionCheck.error === "saml_enforcement")
          H.push({
            title: "Single sign-on authorization needed",
            message: `${h} belongs to an organization that enforces SAML single sign-on, and your GitHub CLI token isn't authorized for it yet.`,
            instructions: [
              "Re-authorize your GitHub CLI login with the repo and workflow scopes",
              "Authorize the organization when GitHub prompts for single sign-on, then run /install-github-app again",
              "If you use a personal access token (GH_TOKEN): open https://github.com/settings/tokens, choose Configure SSO, and authorize the organization",
            ],
          });
        else if (!permissionCheck.hasAccess)
          H.push({
            title: "Admin permissions required",
            message: `You might need admin permissions on ${h} to set up GitHub Actions.`,
            instructions: [
              "Repository admins can install GitHub Apps and set secrets",
              "Ask a repository admin to run this command if setup fails",
              "Alternatively, you can use the manual setup instructions",
            ],
          });
        let workflowExists = await checkExistingWorkflowFile(h);
        if (H.length > 0) {
          let allWarnings = [...m.warnings, ...H];
          setState((prev_12) => ({
            ...prev_12,
            selectedRepoName: h,
            workflowExists: workflowExists,
            warnings: allWarnings,
            step: "warnings",
          }));
        } else
          (logEvent("tengu_install_github_app_step_completed", { step: lit("choose-repo") }),
            setState((prev_13) => ({
              ...prev_13,
              selectedRepoName: h,
              workflowExists: workflowExists,
              step: "install-app",
            })),
            A.setTimeout(openGitHubAppInstallation, 0));
      } else if (m.step === "install-app")
        (logEvent("tengu_install_github_app_step_completed", { step: lit("install-app") }),
          setState((prev_14) => ({ ...prev_14, step: "setup-actions-prompt" })));
      else if (m.step === "check-existing-workflow") return;
      else if (m.step === "select-workflows") return;
      else if (m.step === "check-existing-secret") {
        if (!m.useExistingSecret && !m.secretName) return;
        if (
          (logEvent("tengu_install_github_app_step_completed", { step: lit("check-existing-secret") }),
          m.useExistingSecret)
        )
          await runSetupGitHubActions(null, m.secretName);
        else await runSetupGitHubActions(m.apiKeyOrOAuthToken || existingApiKey, m.secretName);
      } else if (m.step === "api-key") {
        if (m.selectedApiKeyOption === "oauth") return;
        let h = m.selectedApiKeyOption === "existing" ? existingApiKey : m.apiKeyOrOAuthToken;
        if (!h) {
          (logEvent("tengu_install_github_app_error", { reason: lit("api_key_missing") }),
            setState((prev_16) => ({ ...prev_16, step: "error", error: "API key is required" })));
          return;
        }
        setState((prev_17) => ({
          ...prev_17,
          apiKeyOrOAuthToken: h,
          useExistingKey: m.selectedApiKeyOption === "existing",
          isCheckingSecret: !0,
        }));
        let checkSecretsResult_0 = await execFileNoThrow("gh", [
          "secret",
          "list",
          "--app",
          "actions",
          "--repo",
          m.selectedRepoName,
        ]);
        if (
          (setState((K) => ({ ...K, isCheckingSecret: !1 })),
          cancellation.signal.aborted || getState().step !== "api-key")
        )
          return;
        if (checkSecretsResult_0.code === 0)
          if (
            checkSecretsResult_0.stdout
              .split(
                `
`,
              )
              .some((line_0) => /^ANTHROPIC_API_KEY\s+/.test(line_0))
          )
            (logEvent("tengu_install_github_app_step_completed", { step: lit("api-key") }),
              setState((prev_18) => ({ ...prev_18, secretExists: !0, step: "check-existing-secret" })));
          else
            (logEvent("tengu_install_github_app_step_completed", { step: lit("api-key") }),
              await runSetupGitHubActions(h, m.secretName));
        else
          (logEvent("tengu_install_github_app_step_completed", { step: lit("api-key") }),
            await runSetupGitHubActions(h, m.secretName));
      }
    },
    handleRepoUrlChange = (value) => {
      setState((prev_19) => ({ ...prev_19, selectedRepoName: value }));
    },
    handleApiKeyChange = (value_0) => {
      setState((prev_20) => ({ ...prev_20, apiKeyOrOAuthToken: value_0 }));
    },
    handleApiKeyOptionChange = (option) => {
      setState((prev_21) => ({ ...prev_21, selectedApiKeyOption: option }));
    },
    handleCreateOAuthToken = ce(() => {
      if (isUnattendedBgSession()) {
        (logEvent("tengu_install_github_app_error", { reason: lit("unattended_bg_session") }),
          setState((prev_22) => ({ ...prev_22, ...NO_TERMINAL_ERROR_STATE })));
        return;
      }
      (logEvent("tengu_install_github_app_step_completed", { step: lit("api-key") }),
        setState((m) => ({ ...m, step: "oauth-flow" })));
    }, [setState]),
    handleOAuthSuccess = ce(
      (token) => {
        (logEvent("tengu_install_github_app_step_completed", { step: lit("oauth-flow") }),
          setState((prev_23) => ({
            ...prev_23,
            apiKeyOrOAuthToken: token,
            useExistingKey: !1,
            secretName: "CLAUDE_CODE_OAUTH_TOKEN",
            authType: "oauth_token",
          })),
          runSetupGitHubActions(token, "CLAUDE_CODE_OAUTH_TOKEN"));
      },
      [runSetupGitHubActions, setState],
    ),
    handleOAuthCancel = ce(() => {
      setState((prev_24) => ({ ...prev_24, step: "api-key" }));
    }, [setState]),
    handleSecretNameChange = (value_1) => {
      if (value_1 && !/^[a-zA-Z0-9_]+$/.test(value_1)) return;
      setState((prev_25) => ({ ...prev_25, secretName: value_1 }));
    },
    handleToggleUseCurrentRepo = (useCurrentRepo) => {
      setState((prev_26) =>
        prev_26.useCurrentRepo === useCurrentRepo
          ? prev_26
          : {
              ...prev_26,
              useCurrentRepo: useCurrentRepo,
              selectedRepoName: useCurrentRepo ? prev_26.currentRepo : "",
            },
      );
    },
    handleToggleUseExistingKey = (useExistingKey) => {
      setState((prev_27) => ({ ...prev_27, useExistingKey: useExistingKey }));
    },
    handleToggleUseExistingSecret = (useExistingSecret) => {
      setState((prev_28) =>
        prev_28.useExistingSecret === useExistingSecret
          ? prev_28
          : {
              ...prev_28,
              useExistingSecret: useExistingSecret,
              secretName: useExistingSecret ? "ANTHROPIC_API_KEY" : "",
            },
      );
    },
    handleWorkflowAction = (action) => {
      if (
        (logEvent("tengu_install_github_app_step_completed", {
          step: lit("setup-actions-prompt"),
          action: fromEnum(action),
        }),
        action === "skip")
      )
        setState((prev_29) => ({ ...prev_29, step: "success", appOnlyInstall: !0 }));
      else if (u.workflowExists) setState((prev_30) => ({ ...prev_30, step: "check-existing-workflow" }));
      else setState((h) => ({ ...h, step: "select-workflows" }));
    },
    _e = async (m) => {
      if (m === "exit") {
        g();
        return;
      }
      if (
        (logEvent("tengu_install_github_app_step_completed", { step: lit("check-existing-workflow") }),
        setState((h) => ({ ...h, workflowAction: m })),
        m === "skip" || m === "update")
      )
        if (existingApiKey) await checkExistingSecret();
        else setState((h) => ({ ...h, step: "api-key" }));
    };
  function handleDismissKeyDown(m) {
    (m.preventDefault(), me());
  }
  function me() {
    if (u.step === "success") logEvent("tengu_install_github_app_completed", {});
    onDone(
      u.step === "success"
        ? u.appOnlyInstall
          ? "GitHub App installed!"
          : "GitHub Actions setup complete!"
        : u.error
          ? `Couldn't install GitHub App: ${u.error}
For manual setup instructions, see: ${GITHUB_ACTION_SETUP_DOCS_URL}`
          : `GitHub App installation failed
For manual setup instructions, see: ${GITHUB_ACTION_SETUP_DOCS_URL}`,
    );
  }
  let oe,
    se = !1,
    ge = !0,
    J;
  switch (u.step) {
    case "check-gh":
      ((ge = !1), (J = e(CheckingGhCliStep, {})));
      break;
    case "warnings":
      J = e(WarningsStep, { warnings: u.warnings, onContinue: handleSubmit });
      break;
    case "choose-repo":
      ((oe = "Select GitHub repository"),
        (se = !!u.currentRepo),
        (J = e(ChooseRepoStep, {
          currentRepo: u.currentRepo,
          useCurrentRepo: u.useCurrentRepo,
          repoUrl: u.selectedRepoName,
          onRepoUrlChange: handleRepoUrlChange,
          onToggleUseCurrentRepo: handleToggleUseCurrentRepo,
          onSubmit: handleSubmit,
        })));
      break;
    case "install-app":
      J = e(InstallAppStep, { repoUrl: u.selectedRepoName, onSubmit: handleSubmit });
      break;
    case "setup-actions-prompt":
      ((oe = "Set up GitHub Actions"),
        (se = !0),
        (J = e(OptionalActionsSetupStep, { onSelect: handleWorkflowAction, onCancel: g })));
      break;
    case "check-existing-workflow":
      ((oe = `Repository: ${u.selectedRepoName}`),
        (se = !0),
        (J = e(ExistingWorkflowStep, { onSelectAction: _e })));
      break;
    case "check-existing-secret":
      ((oe = "Setup API key secret"),
        (se = !0),
        (J = e(CheckExistingSecretStep, {
          useExistingSecret: u.useExistingSecret,
          secretName: u.secretName,
          onToggleUseExistingSecret: handleToggleUseExistingSecret,
          onSecretNameChange: handleSecretNameChange,
          onSubmit: handleSubmit,
        })));
      break;
    case "api-key":
      ((oe = "Choose API key"),
        (se = !0),
        (J = r(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            e(ApiKeyStep, {
              existingApiKey: existingApiKey,
              useExistingKey: u.useExistingKey,
              apiKeyOrOAuthToken: u.apiKeyOrOAuthToken,
              onApiKeyChange: handleApiKeyChange,
              onToggleUseExistingKey: handleToggleUseExistingKey,
              onSubmit: handleSubmit,
              onCreateOAuthToken: isAnthropicAuthEnabled() ? handleCreateOAuthToken : void 0,
              selectedOption: u.selectedApiKeyOption,
              onSelectOption: handleApiKeyOptionChange,
            }),
            u.isCheckingSecret &&
              e(Text, { dimColor: !0, children: "Checking for an existing ANTHROPIC_API_KEY secret\u2026" }),
          ],
        })));
      break;
    case "creating":
      ((oe = "Create GitHub Actions workflow"),
        (ge = !1),
        (J = e(CreatingStep, {
          currentWorkflowInstallStep: u.currentWorkflowInstallStep,
          secretExists: u.secretExists,
          useExistingSecret: u.useExistingSecret,
          secretName: u.secretName,
          skipWorkflow: u.workflowAction === "skip",
          selectedWorkflows: u.selectedWorkflows,
        })));
      break;
    case "success":
      ((oe = "Success"),
        (J = e(Box, {
          tabIndex: 0,
          autoFocus: !0,
          onKeyDown: handleDismissKeyDown,
          children: e(SuccessStep, {
            secretExists: u.secretExists,
            useExistingSecret: u.useExistingSecret,
            secretName: u.secretName,
            skipWorkflow: u.workflowAction === "skip",
            appOnlyInstall: u.appOnlyInstall,
          }),
        })));
      break;
    case "error":
      J = e(Box, {
        tabIndex: 0,
        autoFocus: !0,
        onKeyDown: handleDismissKeyDown,
        children: e(ErrorStep, {
          error: u.error,
          errorReason: u.errorReason,
          errorInstructions: u.errorInstructions,
        }),
      });
      break;
    case "select-workflows":
      return e(WorkflowMultiselectDialog, {
        defaultSelections: u.selectedWorkflows,
        onSubmit: (selectedWorkflows) => {
          if (
            (logEvent("tengu_install_github_app_step_completed", { step: lit("select-workflows") }),
            setState((prev_31) => ({ ...prev_31, selectedWorkflows: selectedWorkflows })),
            existingApiKey)
          )
            checkExistingSecret();
          else setState((prev_32) => ({ ...prev_32, step: "api-key" }));
        },
      });
    case "oauth-flow":
      return e(OAuthFlowStep, { onSuccess: handleOAuthSuccess, onCancel: handleOAuthCancel });
  }
  let ye = u.step === "success" || u.step === "error",
    be = u.step === "creating" && !!u.stopRequested;
  return e(
    Dialog,
    {
      title: "Install GitHub App",
      subtitle: oe,
      onCancel: ye ? me : g,
      exitOnCtrlCD: be,
      inputGuide: ye
        ? "Press any key to exit"
        : be
          ? "Stopping after the step in progress\u2026"
          : r(Byline, {
              children: [
                se && e(KeyboardShortcutHint, { chord: ["up", "down"], action: "select" }),
                ge && e(KeyboardShortcutHint, { chord: "enter", action: "continue" }),
                e(ConfigurableShortcutHint, {
                  action: "confirm:no",
                  context: "Confirmation",
                  fallback: "Esc",
                  description: "cancel",
                }),
              ],
            }),
      children: J,
    },
    be ? "stopping" : "open",
  );
}
/**
 * /install-github-app 入口：无终端的后台会话中拒绝运行，校验是 GitHub 仓库后打开安装向导。
 */
//@ chunk-4v9zy7gn.js:63101-64479 placement
async function runInstallGitHubApp(onDone, context) {
  if (isUnattendedBgSession()) {
    let o = await parkCommandForAttacher(
      context.session.host,
      "open this session to finish /install-github-app",
      "/install-github-app requested",
      context.storageV5,
    );
    return (
      onDone(
        o
          ? `Can't run /install-github-app while no terminal is attached to this background session. This session now shows "needs input" in agent view \u2014 open it and run the command again.`
          : "Can't run /install-github-app while no terminal is attached to this background session. Attach to it and run the command again.",
        { display: "system" },
      ),
      null
    );
  }
  let p = await resolveRemoteUrl(getCwd()),
    f = p ? ghIsDangerousCallback(p) : null,
    C = f ? getGitHostKind(f) : null;
  if (C === "gitlab")
    return (
      onDone(
        `The Claude GitHub App only works with GitHub repositories, and this repository's git remote is on GitLab. To run Claude Code from GitLab CI/CD instead, see ${GITLAB_CI_DOCS_URL}. To install the app for a GitHub repository, run /install-github-app from a checkout of that repository.`,
        { display: "system" },
      ),
      null
    );
  if (C === "bitbucket")
    return (
      onDone(
        "The Claude GitHub App only works with GitHub repositories, and this repository's git remote is on Bitbucket. To install the app for a GitHub repository, run /install-github-app from a checkout of that repository.",
        { display: "system" },
      ),
      null
    );
  let u = getAnthropicApiKeySafe();
  return e(InstallGitHubApp, {
    onDone: onDone,
    wizard: {
      state: createStore({
        ...INITIAL_STATE,
        useExistingKey: !!u,
        selectedApiKeyOption: u ? "existing" : isAnthropicAuthEnabled() ? "oauth" : "new",
      }),
      cancellation: new AbortController(),
      started: { current: !1 },
      setupRunning: { current: !1 },
      existingApiKey: u,
    },
  });
}
