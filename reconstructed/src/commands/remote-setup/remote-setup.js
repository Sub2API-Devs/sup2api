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
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { safeExecFile } from "../../utils/safeSpawn.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { Yn } from "../../utils/stripAnsi.js";
import {
  hasValidOAuthToken,
  GithubWebConnectionStatus,
  getCodeWebUrl,
  getGithubAuthSource,
  importGithubToken,
  ZV,
} from "./api.js";
import { getGhAuthStatus } from "../../utils/github/ghAuthStatus.js";
import { getProxyUrlWithSource } from "../../utils/proxy.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { fi } from "../../utils/browser.js";
import { logForDebugging } from "../../utils/debug.js";
import { U$ } from "../../utils/stringUtils.js";
import { fetchEnvironments, createDefaultCloudEnvironment } from "../../utils/teleport/environments.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { getConnectorsSettingsUrl } from "../../services/mcp/claudeai.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";

//@ chunk-ajkmgejw.js:14670-14674 sole-consumer
j();
/**
 * 调 gh api --include user 读 x-oauth-scopes 头，判断 GitHub CLI 令牌是否带 workflow 权限（present/missing/unknown）。
 */
//@ chunk-ajkmgejw.js:14674-15219 sole-consumer
async function checkGhTokenWorkflowScope() {
  let result;
  try {
    result = await safeExecFile("gh", ["api", "--include", "user"], {
      stdout: "pipe",
      stderr: "ignore",
      timeout: 5000,
      reject: !1,
    });
  } catch {
    return (logFeatureSad("remote_setup_gh_token_scopes", "spawn_failed"), "unknown");
  }
  if (result.timedOut) return (logFeatureSad("remote_setup_gh_token_scopes", "timeout"), "unknown");
  if (result.exitCode !== 0)
    return (logFeatureSad("remote_setup_gh_token_scopes", "gh_api_failed"), "unknown");
  let scopes = parseOAuthScopesHeader(result.stdout);
  if (scopes === null) return (logFeatureSad("remote_setup_gh_token_scopes", "no_scopes_header"), "unknown");
  return (logFeatureOk("remote_setup_gh_token_scopes"), scopes.includes("workflow") ? "present" : "missing");
}
//@ chunk-ajkmgejw.js:15219-15423 sole-consumer
function parseOAuthScopesHeader(i) {
  let o = Yn(i).split(/\r?\n\r?\n/, 1)[0] ?? "",
    match = /^x-oauth-scopes:[ \t]*(.*)$/im.exec(o);
  if (!match) return null;
  let filtered = match[1]
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h !== "");
  return filtered.length === 0 ? null : filtered;
}
//@ chunk-ajkmgejw.js:15423-16011 fingerprint = checkLoginState (0.853)
async function checkLoginState(i) {
  if (!(await hasValidOAuthToken(i))) return { status: "not_signed_in" };
  let o = await getGhAuthStatus({ allowNetworkFallbackForOldGh: !0 });
  if (o.status === "not_installed") return { status: "gh_not_installed" };
  if (o.status === "not_authenticated") return { status: "gh_not_authenticated" };
  if (o.status === "unknown") return { status: "gh_check_failed", error: o.error };
  if (!o.supportsAuthTokenCommand) return { status: "gh_too_old" };
  let { stdout: stdout } = await safeExecFile("gh", ["auth", "token"], {
      stdout: "pipe",
      stderr: "ignore",
      timeout: 5000,
      reject: !1,
    }),
    trimmed = stdout.trim();
  if (!trimmed) return { status: "gh_not_authenticated" };
  return { status: "has_gh_token", token: new GithubWebConnectionStatus(trimmed) };
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
      let d = getProxyUrlWithSource()?.source;
      return err.sslHint
        ? `Couldn't reach the server. ${err.sslHint}`
        : `Couldn't reach the server. Check your connection${d ? ` and the proxy set in ${d}` : ""}.`;
    }
  }
}
/**
 * 提示 GitHub CLI 令牌缺少 workflow 权限的警告组件。
 */
//@ chunk-ajkmgejw.js:16577-17082 layout
function WorkflowScopeWarning() {
  let i = w(1),
    o;
  if (i[0] === MEMO_CACHE_SENTINEL)
    ((o = e(Box, {
      marginTop: 1,
      children: r(Text, {
        color: "warning",
        children: [
          "Your GitHub CLI token doesn't have the workflow scope. Without it, GitHub rejects pushes that change GitHub Actions workflow files, and pushes to very large repositories can be rejected while GitHub checks for them. You can continue now. To add the scope, run `gh auth refresh -s workflow` and then run /web-setup again:",
          " ",
          "https://cli.github.com/manual/gh_auth_refresh",
        ],
      }),
    })),
      (i[0] = o));
  else o = i[0];
  return o;
}
//@ chunk-ajkmgejw.js:17082-21764 fingerprint = Web (0.691)
function Web(i) {
  let u = w(38),
    { onDone: onDone, host: host, storageV5: storageV5, credentials: credentials } = i,
    ae;
  if (u[0] === MEMO_CACHE_SENTINEL) ((ae = { name: "checking" }), (u[0] = ae));
  else ae = u[0];
  let [l, ie] = y(ae),
    _ = R(!1),
    ue;
  if (u[1] !== credentials || u[2] !== onDone)
    ((ue = () => {
      (logEvent("tengu_remote_setup_started", {}),
        checkLoginState(credentials).then(async (result) => {
          if (_.current) {
            return;
          }
          switch (result.status) {
            case "not_signed_in": {
              (logEvent("tengu_remote_setup_result", { result: lit("not_signed_in") }),
                onDone("Not signed in to Claude. Run /login first."));
              return;
            }
            case "gh_not_installed":
            case "gh_not_authenticated": {
              let url = `${getCodeWebUrl()}/onboarding?step=alt-auth`;
              if ((await fi(url), _.current)) {
                return;
              }
              (logEvent("tengu_remote_setup_result", { result: fromEnum(result.status) }),
                onDone(
                  result.status === "gh_not_installed"
                    ? `GitHub CLI not found. Install it via https://cli.github.com/, then run \`gh auth login\`, or connect GitHub on the web: ${url}`
                    : `GitHub CLI not authenticated. Run \`gh auth login\` and try again, or connect GitHub on the web: ${url}`,
                ));
              return;
            }
            case "gh_too_old": {
              let ce = `${getCodeWebUrl()}/onboarding?step=alt-auth`;
              if ((await fi(ce), _.current)) {
                return;
              }
              (logEvent("tengu_remote_setup_result", { result: lit("gh_too_old") }),
                onDone(
                  `GitHub CLI is logged in, but this version is too old to share its login (\`gh auth token\` needs GitHub CLI 2.17.0 or newer). Update it via https://cli.github.com/, or connect GitHub on the web: ${ce}`,
                ));
              return;
            }
            case "gh_check_failed": {
              (logForDebugging(`/web-setup: couldn't check gh auth status: ${result.error}`, {
                level: "error",
              }),
                logEvent("tengu_remote_setup_result", { result: lit("gh_check_failed") }));
              let replaced = U$(result.error).replace(/[.\s]+$/, "");
              let Re = replaced ? ` (${replaced})` : "";
              onDone(
                `Couldn't check GitHub CLI login status${Re}. Run \`gh auth status\` to check, or connect GitHub on the web: ${getCodeWebUrl()}/onboarding?step=alt-auth`,
              );
              return;
            }
            case "has_gh_token": {
              let [$e, xe] = await Promise.all([
                getGithubAuthSource(credentials),
                checkGhTokenWorkflowScope(),
              ]);
              if (_.current) {
                return;
              }
              ie({
                name: "confirm",
                token: result.token,
                existingOAuth: $e === "oauth",
                ghTokenWorkflowScope: xe,
              });
            }
          }
        }));
    }),
      (u[1] = credentials),
      (u[2] = onDone),
      (u[3] = ue));
  else ue = u[3];
  let he;
  if (u[4] === MEMO_CACHE_SENTINEL) ((he = []), (u[4] = he));
  else he = u[4];
  P(ue, he);
  let de;
  if (u[5] !== onDone)
    ((de = () => {
      ((_.current = !0), logEvent("tengu_remote_setup_result", { result: lit("cancelled") }), onDone());
    }),
      (u[5] = onDone),
      (u[6] = de));
  else de = u[6];
  let k = de,
    pe;
  if (u[7] !== credentials || u[8] !== host || u[9] !== onDone || u[10] !== storageV5)
    ((pe = async (Le, ge) => {
      ie({ name: "uploading" });
      let I = await importGithubToken(Le, credentials);
      if (I.ok) ZV.of(host).markConnected(storageV5);
      if (_.current) {
        return;
      }
      if (!I.ok) {
        (logEvent("tengu_remote_setup_result", {
          result: lit("import_failed"),
          error_kind: fromEnum(I.error.kind),
          gh_token_workflow_scope: fromEnum(ge),
        }),
          onDone(errorMessage(I.error, getCodeWebUrl())));
        return;
      }
      let z;
      try {
        z = (await fetchEnvironments(void 0, storageV5, credentials)).length === 0;
      } catch {
        z = !0;
      }
      if (_.current) {
        return;
      }
      if (z) {
        try {
          await createDefaultCloudEnvironment();
        } catch (error) {
          let Ae = error;
          logForDebugging(`[web-setup] Failed to create default environment: ${Ae}`, { level: "warn" });
        }
        if (_.current) {
          return;
        }
      }
      let url = getCodeWebUrl();
      if ((await fi(url), _.current)) {
        return;
      }
      (logEvent("tengu_remote_setup_result", {
        result: lit("success"),
        gh_token_workflow_scope: fromEnum(ge),
      }),
        onDone(`Connected as ${I.result.github_username}. Opened ${url}`));
    }),
      (u[7] = credentials),
      (u[8] = host),
      (u[9] = onDone),
      (u[10] = storageV5),
      (u[11] = pe));
  else pe = u[11];
  let K = pe;
  if (l.name === "checking" || l.name === "uploading") {
    const G = l.name === "uploading" ? "Connecting GitHub to Claude\u2026" : "Checking login status\u2026";
    let T;
    if (u[12] !== G) ((T = e(WorkerBadge, { message: G })), (u[12] = G), (u[13] = T));
    else T = u[13];
    let x;
    if (u[14] !== k || u[15] !== T)
      ((x = e(Dialog, {
        title: "Connect cloud sessions to GitHub?",
        onCancel: k,
        hideInputGuide: !0,
        children: T,
      })),
        (u[14] = k),
        (u[15] = T),
        (u[16] = x));
    else x = u[16];
    return x;
  }
  let token = l.token,
    G,
    T;
  if (u[17] === MEMO_CACHE_SENTINEL)
    ((G = e(Text, {
      children:
        "Cloud sessions require connecting to your GitHub account to clone and push code on your behalf.",
    })),
      (T = e(Text, {
        dimColor: !0,
        children: "Your local credentials are used to authenticate with GitHub",
      })),
      (u[17] = G),
      (u[18] = T));
  else ((G = u[17]), (T = u[18]));
  let x;
  if (u[19] !== l.existingOAuth)
    ((x =
      l.existingOAuth &&
      e(Box, {
        marginTop: 1,
        children: r(Text, {
          color: "warning",
          children: [
            "You're already connected via the GitHub App. Continuing replaces your authentication credential for cloud sessions. Your repository access will change to reflect your local token's scopes. You can reconnect the GitHub App from",
            " ",
            getConnectorsSettingsUrl(),
            " later.",
          ],
        }),
      })),
      (u[19] = l.existingOAuth),
      (u[20] = x));
  else x = u[20];
  let O;
  if (u[21] !== l.ghTokenWorkflowScope)
    ((O = l.ghTokenWorkflowScope === "missing" && e(WorkflowScopeWarning, {})),
      (u[21] = l.ghTokenWorkflowScope),
      (u[22] = O));
  else O = u[22];
  let W;
  if (u[23] !== x || u[24] !== O)
    ((W = r(Box, { flexDirection: "column", children: [G, T, x, O] })),
      (u[23] = x),
      (u[24] = O),
      (u[25] = W));
  else W = u[25];
  const Q = l.existingOAuth ? "Replace connection" : "Continue";
  let V;
  if (u[26] !== K || u[27] !== l.ghTokenWorkflowScope || u[28] !== token)
    ((V = () => void K(token, l.ghTokenWorkflowScope)),
      (u[26] = K),
      (u[27] = l.ghTokenWorkflowScope),
      (u[28] = token),
      (u[29] = V));
  else V = u[29];
  let Y;
  if (u[30] !== k || u[31] !== Q || u[32] !== V)
    ((Y = e(ConfirmSelect, { confirmLabel: Q, cancelLabel: "Cancel", onConfirm: V, onCancel: k })),
      (u[30] = k),
      (u[31] = Q),
      (u[32] = V),
      (u[33] = Y));
  else Y = u[33];
  let fe;
  if (u[34] !== k || u[35] !== W || u[36] !== Y)
    ((fe = r(Dialog, {
      title: "Connect cloud sessions to GitHub?",
      onCancel: k,
      hideInputGuide: !0,
      children: [W, Y],
    })),
      (u[34] = k),
      (u[35] = W),
      (u[36] = Y),
      (u[37] = fe));
  else fe = u[37];
  return fe;
}
/**
 * /web-setup 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-ajkmgejw.js:21764-21868 placement
var call = async (onDone, context) =>
  e(Web, {
    onDone: onDone,
    host: context.session.host,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
