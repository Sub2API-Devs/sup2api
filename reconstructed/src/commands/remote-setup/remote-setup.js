/**
 * commands/remote-setup/remote-setup.tsx
 *
 * 并入旧版已有路径：/remote-setup 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/remote-setup/remote-setup.tsx
 * pieces: chunk-ajkmgejw.js (8)
 * attribution: sole-consumer 3, fingerprint 3, layout 1, placement 1
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { safeExecFile } from "../../utils/safeSpawn.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import {
  hasValidOAuthToken,
  GithubWebConnectionStatus,
  getCodeWebUrl,
  getGithubAuthSource,
  importGithubToken,
  GITHUB_CONNECTION_STATUS_CACHE,
} from "./api.js";
import { getGhAuthStatus } from "../../utils/github/ghAuthStatus.js";
import { getProxyUrlWithSource } from "../../utils/proxy.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { logForDebugging } from "../../utils/debug.js";
import { oneLineClipped } from "../../utils/stringUtils.js";
import { fetchEnvironments, createDefaultCloudEnvironment } from "../../utils/teleport/environments.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { getConnectorsSettingsUrl } from "../../services/mcp/claudeai.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";

//@ chunk-ajkmgejw.js:14670-14674 sole-consumer
init_react_production();
//@ chunk-ajkmgejw.js:14674-15219 sole-consumer
/**
 * 调 gh api --include user 读 x-oauth-scopes 头，判断 GitHub CLI 令牌是否带 workflow 权限（present/missing/unknown）。
 */
async function checkGhTokenWorkflowScope() {
  let result;
  try {
    result = await safeExecFile("gh", ["api", "--include", "user"], {
      stdout: "pipe",
      stderr: "ignore",
      timeout: 5000,
      reject: false,
    });
  } catch {
    logFeatureSad("remote_setup_gh_token_scopes", "spawn_failed");
    return "unknown";
  }
  if (result.timedOut) {
    logFeatureSad("remote_setup_gh_token_scopes", "timeout");
    return "unknown";
  }
  if (result.exitCode !== 0) {
    logFeatureSad("remote_setup_gh_token_scopes", "gh_api_failed");
    return "unknown";
  }
  let scopes = parseOAuthScopesHeader(result.stdout);
  if (scopes === null) {
    logFeatureSad("remote_setup_gh_token_scopes", "no_scopes_header");
    return "unknown";
  }
  logFeatureOk("remote_setup_gh_token_scopes");
  return scopes.includes("workflow") ? "present" : "missing";
}
//@ chunk-ajkmgejw.js:15219-15423 sole-consumer
function parseOAuthScopesHeader(stdout) {
  let headerBlock = stripAnsi(stdout).split(/\r?\n\r?\n/, 1)[0] ?? "";
  let match = /^x-oauth-scopes:[ \t]*(.*)$/im.exec(headerBlock);
  if (!match) return null;
  let filtered = match[1]
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope) => scope !== "");
  return filtered.length === 0 ? null : filtered;
}
//@ chunk-ajkmgejw.js:15423-16011 fingerprint = checkLoginState (0.853)
async function checkLoginState(credentials) {
  if (!(await hasValidOAuthToken(credentials)))
    return {
      status: "not_signed_in",
    };
  let ghStatus = await getGhAuthStatus({
    allowNetworkFallbackForOldGh: true,
  });
  if (ghStatus.status === "not_installed")
    return {
      status: "gh_not_installed",
    };
  if (ghStatus.status === "not_authenticated")
    return {
      status: "gh_not_authenticated",
    };
  if (ghStatus.status === "unknown")
    return {
      status: "gh_check_failed",
      error: ghStatus.error,
    };
  if (!ghStatus.supportsAuthTokenCommand)
    return {
      status: "gh_too_old",
    };
  let { stdout } = await safeExecFile("gh", ["auth", "token"], {
    stdout: "pipe",
    stderr: "ignore",
    timeout: 5000,
    reject: false,
  });
  let trimmed = stdout.trim();
  if (!trimmed)
    return {
      status: "gh_not_authenticated",
    };
  return {
    status: "has_gh_token",
    token: new GithubWebConnectionStatus(trimmed),
  };
}
//@ chunk-ajkmgejw.js:16011-16577 fingerprint = errorMessage (0.776)
function errorMessage(err, codeUrl) {
  switch (err.kind) {
    case "not_signed_in":
      return `Login failed. Please visit ${codeUrl} and login using the GitHub App`;
    case "invalid_token":
      return err.message
        ? `${err.message} Add the repo scope to your GitHub CLI login, then run /web-setup again.`
        : "GitHub rejected that token. Run `gh auth login` and try again.";
    case "server":
      return `Server error (${err.status}). Try again in a moment.`;
    case "network": {
      let source = getProxyUrlWithSource()?.source;
      return err.sslHint
        ? `Couldn't reach the server. ${err.sslHint}`
        : `Couldn't reach the server. Check your connection${source ? ` and the proxy set in ${source}` : ""}.`;
    }
  }
}
//@ chunk-ajkmgejw.js:16577-17082 layout
/**
 * 提示 GitHub CLI 令牌缺少 workflow 权限的警告组件。
 */
function WorkflowScopeWarning() {
  let $ = useMemoCache(1);
  let warningBox;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    warningBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        color: "warning",
        children: [
          "Your GitHub CLI token doesn't have the workflow scope. Without it, GitHub rejects pushes that change GitHub Actions workflow files, and pushes to very large repositories can be rejected while GitHub checks for them. You can continue now. To add the scope, run `gh auth refresh -s workflow` and then run /web-setup again:",
          " ",
          "https://cli.github.com/manual/gh_auth_refresh",
        ],
      }),
    });
    $[0] = warningBox;
  } else warningBox = $[0];
  return warningBox;
}
//@ chunk-ajkmgejw.js:17082-21764 fingerprint = Web (0.691)
/**
 * remote-setup 的 Web 连接向导组件（Web，4.6KB）：选择/生成 Remote Control 会话名并展示连接信息。
 */
function Web(props) {
  let $ = useMemoCache(38);
  let { onDone, host, storageV5, credentials } = props;
  let initialState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    initialState = {
      name: "checking",
    };
    $[0] = initialState;
  } else initialState = $[0];
  let [state, setState] = useState(initialState);
  let unmountedRef = useRef(false);
  let checkLoginEffect;
  if ($[1] !== credentials || $[2] !== onDone) {
    checkLoginEffect = () => {
      logEvent("tengu_remote_setup_started", {});
      checkLoginState(credentials).then(async (result) => {
        if (unmountedRef.current) {
          return;
        }
        switch (result.status) {
          case "not_signed_in": {
            logEvent("tengu_remote_setup_result", {
              result: lit("not_signed_in"),
            });
            onDone("Not signed in to Claude. Run /login first.");
            return;
          }
          case "gh_not_installed":
          case "gh_not_authenticated": {
            let url = `${getCodeWebUrl()}/onboarding?step=alt-auth`;
            await openValidatedUrlSucceeded(url);
            if (unmountedRef.current) {
              return;
            }
            logEvent("tengu_remote_setup_result", {
              result: fromEnum(result.status),
            });
            onDone(
              result.status === "gh_not_installed"
                ? `GitHub CLI not found. Install it via https://cli.github.com/, then run \`gh auth login\`, or connect GitHub on the web: ${url}`
                : `GitHub CLI not authenticated. Run \`gh auth login\` and try again, or connect GitHub on the web: ${url}`,
            );
            return;
          }
          case "gh_too_old": {
            let altAuthUrl = `${getCodeWebUrl()}/onboarding?step=alt-auth`;
            await openValidatedUrlSucceeded(altAuthUrl);
            if (unmountedRef.current) {
              return;
            }
            logEvent("tengu_remote_setup_result", {
              result: lit("gh_too_old"),
            });
            onDone(
              `GitHub CLI is logged in, but this version is too old to share its login (\`gh auth token\` needs GitHub CLI 2.17.0 or newer). Update it via https://cli.github.com/, or connect GitHub on the web: ${altAuthUrl}`,
            );
            return;
          }
          case "gh_check_failed": {
            logForDebugging(`/web-setup: couldn't check gh auth status: ${result.error}`, {
              level: "error",
            });
            logEvent("tengu_remote_setup_result", {
              result: lit("gh_check_failed"),
            });
            let replaced = oneLineClipped(result.error).replace(/[.\s]+$/, "");
            let errorSuffix = replaced ? ` (${replaced})` : "";
            onDone(
              `Couldn't check GitHub CLI login status${errorSuffix}. Run \`gh auth status\` to check, or connect GitHub on the web: ${getCodeWebUrl()}/onboarding?step=alt-auth`,
            );
            return;
          }
          case "has_gh_token": {
            let [githubAuthSource, workflowScope] = await Promise.all([
              getGithubAuthSource(credentials),
              checkGhTokenWorkflowScope(),
            ]);
            if (unmountedRef.current) {
              return;
            }
            setState({
              name: "confirm",
              token: result.token,
              existingOAuth: githubAuthSource === "oauth",
              ghTokenWorkflowScope: workflowScope,
            });
          }
        }
      });
    };
    $[1] = credentials;
    $[2] = onDone;
    $[3] = checkLoginEffect;
  } else checkLoginEffect = $[3];
  let checkLoginDeps;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    checkLoginDeps = [];
    $[4] = checkLoginDeps;
  } else checkLoginDeps = $[4];
  useEffect(checkLoginEffect, checkLoginDeps);
  let handleCancel;
  if ($[5] !== onDone) {
    handleCancel = () => {
      unmountedRef.current = true;
      logEvent("tengu_remote_setup_result", {
        result: lit("cancelled"),
      });
      onDone();
    };
    $[5] = onDone;
    $[6] = handleCancel;
  } else handleCancel = $[6];
  let onCancel = handleCancel;
  let handleConfirm;
  if ($[7] !== credentials || $[8] !== host || $[9] !== onDone || $[10] !== storageV5) {
    handleConfirm = async (token, workflowScope) => {
      setState({
        name: "uploading",
      });
      let importResult = await importGithubToken(token, credentials);
      if (importResult.ok) GITHUB_CONNECTION_STATUS_CACHE.of(host).markConnected(storageV5);
      if (unmountedRef.current) {
        return;
      }
      if (!importResult.ok) {
        logEvent("tengu_remote_setup_result", {
          result: lit("import_failed"),
          error_kind: fromEnum(importResult.error.kind),
          gh_token_workflow_scope: fromEnum(workflowScope),
        });
        onDone(errorMessage(importResult.error, getCodeWebUrl()));
        return;
      }
      let needsEnvironment;
      try {
        needsEnvironment = (await fetchEnvironments(undefined, storageV5, credentials)).length === 0;
      } catch {
        needsEnvironment = true;
      }
      if (unmountedRef.current) {
        return;
      }
      if (needsEnvironment) {
        try {
          await createDefaultCloudEnvironment();
        } catch (error) {
          let failure = error;
          logForDebugging(`[web-setup] Failed to create default environment: ${failure}`, {
            level: "warn",
          });
        }
        if (unmountedRef.current) {
          return;
        }
      }
      let url = getCodeWebUrl();
      await openValidatedUrlSucceeded(url);
      if (unmountedRef.current) {
        return;
      }
      logEvent("tengu_remote_setup_result", {
        result: lit("success"),
        gh_token_workflow_scope: fromEnum(workflowScope),
      });
      onDone(`Connected as ${importResult.result.github_username}. Opened ${url}`);
    };
    $[7] = credentials;
    $[8] = host;
    $[9] = onDone;
    $[10] = storageV5;
    $[11] = handleConfirm;
  } else handleConfirm = $[11];
  let uploadToken = handleConfirm;
  if (state.name === "checking" || state.name === "uploading") {
    const message =
      state.name === "uploading" ? "Connecting GitHub to Claude\u2026" : "Checking login status\u2026";
    let children;
    if ($[12] !== message) {
      children = jsxProd_default(WorkerBadge, {
        message,
      });
      $[12] = message;
      $[13] = children;
    } else children = $[13];
    let busyDialog;
    if ($[14] !== onCancel || $[15] !== children) {
      busyDialog = jsxProd_default(Dialog, {
        title: "Connect cloud sessions to GitHub?",
        onCancel,
        hideInputGuide: true,
        children,
      });
      $[14] = onCancel;
      $[15] = children;
      $[16] = busyDialog;
    } else busyDialog = $[16];
    return busyDialog;
  }
  let token = state.token;
  let introText;
  let credentialsNote;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default(Text, {
      children:
        "Cloud sessions require connecting to your GitHub account to clone and push code on your behalf.",
    });
    credentialsNote = jsxProd_default(Text, {
      dimColor: true,
      children: "Your local credentials are used to authenticate with GitHub",
    });
    $[17] = introText;
    $[18] = credentialsNote;
  } else {
    introText = $[17];
    credentialsNote = $[18];
  }
  let existingOAuthWarning;
  if ($[19] !== state.existingOAuth) {
    existingOAuthWarning =
      state.existingOAuth &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          color: "warning",
          children: [
            "You're already connected via the GitHub App. Continuing replaces your authentication credential for cloud sessions. Your repository access will change to reflect your local token's scopes. You can reconnect the GitHub App from",
            " ",
            getConnectorsSettingsUrl(),
            " later.",
          ],
        }),
      });
    $[19] = state.existingOAuth;
    $[20] = existingOAuthWarning;
  } else existingOAuthWarning = $[20];
  let workflowScopeWarning;
  if ($[21] !== state.ghTokenWorkflowScope) {
    workflowScopeWarning =
      state.ghTokenWorkflowScope === "missing" && jsxProd_default(WorkflowScopeWarning, {});
    $[21] = state.ghTokenWorkflowScope;
    $[22] = workflowScopeWarning;
  } else workflowScopeWarning = $[22];
  let bodyContent;
  if ($[23] !== existingOAuthWarning || $[24] !== workflowScopeWarning) {
    bodyContent = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [introText, credentialsNote, existingOAuthWarning, workflowScopeWarning],
    });
    $[23] = existingOAuthWarning;
    $[24] = workflowScopeWarning;
    $[25] = bodyContent;
  } else bodyContent = $[25];
  const confirmLabel = state.existingOAuth ? "Replace connection" : "Continue";
  let onConfirm;
  if ($[26] !== uploadToken || $[27] !== state.ghTokenWorkflowScope || $[28] !== token) {
    onConfirm = () => void uploadToken(token, state.ghTokenWorkflowScope);
    $[26] = uploadToken;
    $[27] = state.ghTokenWorkflowScope;
    $[28] = token;
    $[29] = onConfirm;
  } else onConfirm = $[29];
  let confirmSelect;
  if ($[30] !== onCancel || $[31] !== confirmLabel || $[32] !== onConfirm) {
    confirmSelect = jsxProd_default(ConfirmSelect, {
      confirmLabel,
      cancelLabel: "Cancel",
      onConfirm,
      onCancel,
    });
    $[30] = onCancel;
    $[31] = confirmLabel;
    $[32] = onConfirm;
    $[33] = confirmSelect;
  } else confirmSelect = $[33];
  let dialog;
  if ($[34] !== onCancel || $[35] !== bodyContent || $[36] !== confirmSelect) {
    dialog = jsxProd_default_2(Dialog, {
      title: "Connect cloud sessions to GitHub?",
      onCancel,
      hideInputGuide: true,
      children: [bodyContent, confirmSelect],
    });
    $[34] = onCancel;
    $[35] = bodyContent;
    $[36] = confirmSelect;
    $[37] = dialog;
  } else dialog = $[37];
  return dialog;
}
//@ chunk-ajkmgejw.js:21764-21868 placement
/**
 * /web-setup 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context) =>
  jsxProd_default(Web, {
    onDone,
    host: context.session.host,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
export { call };
