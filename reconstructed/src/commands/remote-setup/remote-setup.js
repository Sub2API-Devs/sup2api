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
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  let o = stripAnsi(stdout).split(/\r?\n\r?\n/, 1)[0] ?? "";
  let match = /^x-oauth-scopes:[ \t]*(.*)$/im.exec(o);
  if (!match) return null;
  let filtered = match[1]
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h !== "");
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
  let i = w(1);
  let o;
  if (i[0] === MEMO_CACHE_SENTINEL) {
    o = jsxProd_default(Box, {
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
    i[0] = o;
  } else o = i[0];
  return o;
}
//@ chunk-ajkmgejw.js:17082-21764 fingerprint = Web (0.691)
/**
 * remote-setup 的 Web 连接向导组件（Web，4.6KB）：选择/生成 Remote Control 会话名并展示连接信息。
 */
function Web(props) {
  let u = w(38);
  let { onDone, host, storageV5, credentials } = props;
  let ae;
  if (u[0] === MEMO_CACHE_SENTINEL) {
    ae = {
      name: "checking",
    };
    u[0] = ae;
  } else ae = u[0];
  let [l, ie] = y(ae);
  let _ = R(false);
  let ue;
  if (u[1] !== credentials || u[2] !== onDone) {
    ue = () => {
      logEvent("tengu_remote_setup_started", {});
      checkLoginState(credentials).then(async (result) => {
        if (_.current) {
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
            if (_.current) {
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
            let ce = `${getCodeWebUrl()}/onboarding?step=alt-auth`;
            await openValidatedUrlSucceeded(ce);
            if (_.current) {
              return;
            }
            logEvent("tengu_remote_setup_result", {
              result: lit("gh_too_old"),
            });
            onDone(
              `GitHub CLI is logged in, but this version is too old to share its login (\`gh auth token\` needs GitHub CLI 2.17.0 or newer). Update it via https://cli.github.com/, or connect GitHub on the web: ${ce}`,
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
            let Re = replaced ? ` (${replaced})` : "";
            onDone(
              `Couldn't check GitHub CLI login status${Re}. Run \`gh auth status\` to check, or connect GitHub on the web: ${getCodeWebUrl()}/onboarding?step=alt-auth`,
            );
            return;
          }
          case "has_gh_token": {
            let [githubAuthSource, xe] = await Promise.all([
              getGithubAuthSource(credentials),
              checkGhTokenWorkflowScope(),
            ]);
            if (_.current) {
              return;
            }
            ie({
              name: "confirm",
              token: result.token,
              existingOAuth: githubAuthSource === "oauth",
              ghTokenWorkflowScope: xe,
            });
          }
        }
      });
    };
    u[1] = credentials;
    u[2] = onDone;
    u[3] = ue;
  } else ue = u[3];
  let he;
  if (u[4] === MEMO_CACHE_SENTINEL) {
    he = [];
    u[4] = he;
  } else he = u[4];
  P(ue, he);
  let de;
  if (u[5] !== onDone) {
    de = () => {
      _.current = true;
      logEvent("tengu_remote_setup_result", {
        result: lit("cancelled"),
      });
      onDone();
    };
    u[5] = onDone;
    u[6] = de;
  } else de = u[6];
  let onCancel = de;
  let pe;
  if (u[7] !== credentials || u[8] !== host || u[9] !== onDone || u[10] !== storageV5) {
    pe = async (token, ge) => {
      ie({
        name: "uploading",
      });
      let I = await importGithubToken(token, credentials);
      if (I.ok) GITHUB_CONNECTION_STATUS_CACHE.of(host).markConnected(storageV5);
      if (_.current) {
        return;
      }
      if (!I.ok) {
        logEvent("tengu_remote_setup_result", {
          result: lit("import_failed"),
          error_kind: fromEnum(I.error.kind),
          gh_token_workflow_scope: fromEnum(ge),
        });
        onDone(errorMessage(I.error, getCodeWebUrl()));
        return;
      }
      let z;
      try {
        z = (await fetchEnvironments(undefined, storageV5, credentials)).length === 0;
      } catch {
        z = true;
      }
      if (_.current) {
        return;
      }
      if (z) {
        try {
          await createDefaultCloudEnvironment();
        } catch (error) {
          let Ae = error;
          logForDebugging(`[web-setup] Failed to create default environment: ${Ae}`, {
            level: "warn",
          });
        }
        if (_.current) {
          return;
        }
      }
      let url = getCodeWebUrl();
      await openValidatedUrlSucceeded(url);
      if (_.current) {
        return;
      }
      logEvent("tengu_remote_setup_result", {
        result: lit("success"),
        gh_token_workflow_scope: fromEnum(ge),
      });
      onDone(`Connected as ${I.result.github_username}. Opened ${url}`);
    };
    u[7] = credentials;
    u[8] = host;
    u[9] = onDone;
    u[10] = storageV5;
    u[11] = pe;
  } else pe = u[11];
  let K = pe;
  if (l.name === "checking" || l.name === "uploading") {
    const message =
      l.name === "uploading" ? "Connecting GitHub to Claude\u2026" : "Checking login status\u2026";
    let children;
    if (u[12] !== message) {
      children = jsxProd_default(WorkerBadge, {
        message,
      });
      u[12] = message;
      u[13] = children;
    } else children = u[13];
    let x;
    if (u[14] !== onCancel || u[15] !== children) {
      x = jsxProd_default(Dialog, {
        title: "Connect cloud sessions to GitHub?",
        onCancel,
        hideInputGuide: true,
        children,
      });
      u[14] = onCancel;
      u[15] = children;
      u[16] = x;
    } else x = u[16];
    return x;
  }
  let token = l.token;
  let G;
  let T;
  if (u[17] === MEMO_CACHE_SENTINEL) {
    G = jsxProd_default(Text, {
      children:
        "Cloud sessions require connecting to your GitHub account to clone and push code on your behalf.",
    });
    T = jsxProd_default(Text, {
      dimColor: true,
      children: "Your local credentials are used to authenticate with GitHub",
    });
    u[17] = G;
    u[18] = T;
  } else {
    G = u[17];
    T = u[18];
  }
  let x;
  if (u[19] !== l.existingOAuth) {
    x =
      l.existingOAuth &&
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
    u[19] = l.existingOAuth;
    u[20] = x;
  } else x = u[20];
  let O;
  if (u[21] !== l.ghTokenWorkflowScope) {
    O = l.ghTokenWorkflowScope === "missing" && jsxProd_default(WorkflowScopeWarning, {});
    u[21] = l.ghTokenWorkflowScope;
    u[22] = O;
  } else O = u[22];
  let W;
  if (u[23] !== x || u[24] !== O) {
    W = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [G, T, x, O],
    });
    u[23] = x;
    u[24] = O;
    u[25] = W;
  } else W = u[25];
  const confirmLabel = l.existingOAuth ? "Replace connection" : "Continue";
  let onConfirm;
  if (u[26] !== K || u[27] !== l.ghTokenWorkflowScope || u[28] !== token) {
    onConfirm = () => void K(token, l.ghTokenWorkflowScope);
    u[26] = K;
    u[27] = l.ghTokenWorkflowScope;
    u[28] = token;
    u[29] = onConfirm;
  } else onConfirm = u[29];
  let Y;
  if (u[30] !== onCancel || u[31] !== confirmLabel || u[32] !== onConfirm) {
    Y = jsxProd_default(ConfirmSelect, {
      confirmLabel,
      cancelLabel: "Cancel",
      onConfirm,
      onCancel,
    });
    u[30] = onCancel;
    u[31] = confirmLabel;
    u[32] = onConfirm;
    u[33] = Y;
  } else Y = u[33];
  let fe;
  if (u[34] !== onCancel || u[35] !== W || u[36] !== Y) {
    fe = jsxProd_default_2(Dialog, {
      title: "Connect cloud sessions to GitHub?",
      onCancel,
      hideInputGuide: true,
      children: [W, Y],
    });
    u[34] = onCancel;
    u[35] = W;
    u[36] = Y;
    u[37] = fe;
  } else fe = u[37];
  return fe;
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
