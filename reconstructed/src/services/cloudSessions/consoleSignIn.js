/**
 * services/cloudSessions/consoleSignIn.ts
 *
 * 2.1.316 新增：为云会话进行 Console 浏览器登录（PKCE、超时、取消）；校验作用域并保存云会话凭据等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4r7nqnx2.js (6)
 * attribution: placement 6
 */
import { createInterface } from "readline";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";
import { PASTE_HERE_MSG } from "../../commands/install-github-app/OAuthFlowStep.js";
import {
  getOauthConfig,
  CLOUD_SESSIONS_OAUTH_SCOPES,
  CLAUDE_AI_SESSIONS_SCOPE,
} from "../../constants/oauth.js";
import { getWIFAccountInfo } from "../../utils/wifProfile.js";
import { OAuthService } from "../oauth/index.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { revokeOAuthToken } from "../oauth/client.js";
import {
  OAUTH_FLOW_TIMEOUT_MS,
  readFreshCloudSessionsOAuth,
  saveCloudSessionsOAuth,
  hasCloudSessionsTokenForOrg,
  isInteractiveLocalSession,
  refreshCloudSessionsOAuth,
} from "./cloudSessionsOAuth.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isSessionVerdictFromServerFetch, isSessionVerdictDisowned } from "../policyLimits/policyEvidence.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { setConsoleProfileBearerProvider } from "../../utils/telemetry/memorySummary.js";

//@ chunk-4r7nqnx2.js:5096-5767 placement
/**
 * 在终端读取用户粘贴的授权码。
 */
function promptForPastedCode(terminal, { expectedState, onCode, onCancel }) {
  if (!terminal.input.isTTY || !terminal.output.isTTY) return;
  stopCapturingEarlyInput();
  let r = false;
  let o = false;
  let a = createInterface({
    input: terminal.input,
    output: terminal.output,
    prompt: PASTE_HERE_MSG,
  });
  a.on("SIGINT", () => onCancel());
  a.on("close", () => {
    if (!r) onCancel();
  });
  a.on("line", (n) => {
    let trimmed = n.trim();
    if (!trimmed) {
      a.prompt();
      return;
    }
    let [h, p] = trimmed.split("#");
    if (!h || !p) {
      terminal.output.write(`Invalid code. Please make sure the full code was copied.
`);
      a.prompt();
      return;
    }
    if (expectedState !== undefined && p !== expectedState) {
      terminal.output
        .write(`That code is not from this sign-in. Paste the code shown after opening the address above.
`);
      a.prompt();
      return;
    }
    o = true;
    onCode({
      authorizationCode: h,
      state: p,
    });
  });
  a.prompt();
  return {
    close: () => {
      if (r) return;
      r = true;
      if (!o)
        terminal.output.write(`
`);
      a.close();
    },
  };
}
//@ chunk-4r7nqnx2.js:5767-7748 placement
/**
 * 为云会话进行 Console 浏览器登录（PKCE、超时、取消）。
 */
async function consoleSignInForCloudSessions({
  organizationUuid,
  onBrowserOpening,
  terminal = {
    input: process.stdin,
    output: process.stdout,
  },
}) {
  let CLIENT_ID = getOauthConfig().CLIENT_ID;
  let accountEmail = getWIFAccountInfo()?.accountEmail;
  let o = new OAuthService();
  let a = false;
  let n = false;
  let c = false;
  let h;
  let p;
  let S;
  let y = false;
  let I = () => {};
  let promise = new Promise((resolve, reject) => {
    I = reject;
  });
  promise.catch(() => {});
  try {
    let C = o.startOAuthFlow(
      async (T, E) => {
        onBrowserOpening?.(T);
        p = promptForPastedCode(terminal, {
          expectedState: getOAuthStateFromUrl(T),
          onCode: (P) => o.handleManualAuthCodeInput(P),
          onCancel: () => {
            if (y) return;
            n = true;
            c = true;
            I(Error("cloud-sessions sign-in cancelled"));
          },
        });
        await openValidatedUrlSucceeded(E ?? T);
      },
      {
        loginWithClaudeAi: false,
        oauthClient: {
          clientId: CLIENT_ID,
          scopes: CLOUD_SESSIONS_OAUTH_SCOPES,
        },
        orgUUID: organizationUuid,
        loginHint: accountEmail,
        skipBrowserOpen: true,
        successRedirectUrl: getOauthConfig().CLAUDEAI_SUCCESS_URL,
      },
    );
    C.then((T) => {
      if (c && T.refreshToken) revokeOAuthToken(T.refreshToken, CLIENT_ID);
    }).catch(() => {});
    h = setTimeout(() => {
      a = true;
      c = true;
      I(Error("cloud-sessions sign-in timed out"));
    }, OAUTH_FLOW_TIMEOUT_MS);
    let winner = await Promise.race([C, promise]);
    y = true;
    p?.close();
    let _ = await finishConsoleSignIn(winner, CLIENT_ID, organizationUuid, accountEmail);
    if (!_.ok) {
      logFeatureBad("cloud_sessions_console_sign_in", _.reason);
      return _;
    }
    S = _.slot;
    let freshCloudSessionsOAuth = await readFreshCloudSessionsOAuth();
    if (freshCloudSessionsOAuth?.refreshToken && freshCloudSessionsOAuth.refreshToken !== _.slot.refreshToken)
      await revokeOAuthToken(freshCloudSessionsOAuth.refreshToken, freshCloudSessionsOAuth.clientId);
    if (!(await saveCloudSessionsOAuth(_.slot)).success) {
      await revokeOAuthToken(_.slot.refreshToken, CLIENT_ID);
      logFeatureBad("cloud_sessions_console_sign_in", "save_failed");
      return {
        ok: false,
        reason: "save_failed",
        message: "Could not save the cloud-sessions credential to secure storage. Try again.",
      };
    }
    S = undefined;
    logFeatureOk("cloud_sessions_console_sign_in");
    return {
      ok: true,
      accessToken: _.slot.accessToken,
    };
  } catch (error) {
    y = true;
    c = true;
    if (S !== undefined) await revokeOAuthToken(S.refreshToken, S.clientId);
    if (a) {
      logFeatureBad("cloud_sessions_console_sign_in", "timed_out");
      return {
        ok: false,
        reason: "timed_out",
        message: "The browser sign-in for cloud sessions timed out after 5 minutes. Try again.",
      };
    }
    if (n) {
      logFeatureSad("cloud_sessions_console_sign_in", "cancelled");
      return {
        ok: false,
        reason: "cancelled",
        message: "The sign-in for cloud sessions was cancelled.",
      };
    }
    logForDebugging(`Cloud-sessions sign-in failed: ${errorMessage(error)}`, {
      level: "error",
    });
    logFeatureBad("cloud_sessions_console_sign_in", "failed");
    return {
      ok: false,
      reason: "failed",
      message: "The browser sign-in for cloud sessions failed. Try again.",
    };
  } finally {
    if (h !== undefined) clearTimeout(h);
    p?.close();
    o.cleanup();
  }
}
//@ chunk-4r7nqnx2.js:7748-7832 placement
/**
 * 从回调 URL 里取 state 参数，取不到返回 undefined。
 */
function getOAuthStateFromUrl(e) {
  try {
    return new URL(e).searchParams.get("state") ?? undefined;
  } catch {
    return;
  }
}
//@ chunk-4r7nqnx2.js:7832-9412 placement
/**
 * 校验作用域并保存云会话凭据。
 */
async function finishConsoleSignIn(e, s, organizationUuid, accountEmail) {
  let r = async () => {
    if (e.refreshToken) await revokeOAuthToken(e.refreshToken, s);
  };
  if (!e.scopes.includes(CLAUDE_AI_SESSIONS_SCOPE)) {
    await r();
    return {
      ok: false,
      reason: "scope_not_granted",
      message:
        "Your Console organization doesn't allow cloud sessions from Claude Code, so the sign-in didn't grant that permission. Cloud sessions stay unavailable with this sign-in.",
    };
  }
  let o = e.tokenAccount?.organizationUuid ?? e.profile?.organization.uuid;
  if (o === undefined) {
    await r();
    return {
      ok: false,
      reason: "invalid",
      message: "The sign-in didn't say which organization it was for, so it can't be used. Try again.",
    };
  }
  if (o.toLowerCase() !== organizationUuid.toLowerCase()) {
    await r();
    return {
      ok: false,
      reason: "other_organization",
      message:
        "The sign-in was for a different organization than your Console sign-in. Sign in again and choose the same organization.",
    };
  }
  if (accountEmail !== undefined) {
    let a = (e.tokenAccount?.emailAddress || e.profile?.account.email)?.trim() || undefined;
    if (a === undefined) {
      await r();
      return {
        ok: false,
        reason: "invalid",
        message: "The sign-in didn't say which account it was for, so it can't be used. Try again.",
      };
    }
    if (a.trim().toLowerCase() !== accountEmail.trim().toLowerCase()) {
      await r();
      return {
        ok: false,
        reason: "other_account",
        message: `The sign-in was for ${a}, but your Console sign-in is ${accountEmail}. Sign in again as ${accountEmail}.`,
      };
    }
  }
  if (!e.refreshToken || !e.expiresAt) {
    await r();
    return {
      ok: false,
      reason: "invalid",
      message:
        "The sign-in came back without a refresh token or an expiry, so it could not be stored. Try again.",
    };
  }
  return {
    ok: true,
    slot: {
      accessToken: e.accessToken,
      refreshToken: e.refreshToken,
      expiresAt: e.expiresAt,
      scopes: e.scopes.filter((scope) => CLOUD_SESSIONS_OAUTH_SCOPES.some((n) => n === scope)),
      clientId: s,
      organizationUuid,
    },
  };
}
//@ chunk-4r7nqnx2.js:9412-9490 placement
/**
 * 当前账号的组织标记：服务器已确认才返回 ldr 或 not_ldr，否则 unknown。
 */
function getOrganizationLabel() {
  if (!isSessionVerdictFromServerFetch() || isSessionVerdictDisowned()) return "unknown";
  return hasComplianceTaint("ldr") ? "ldr" : "not_ldr";
}
//@ chunk-4r7nqnx2.js:9490-9565 placement
setConsoleProfileBearerProvider({
  organizationLabel: getOrganizationLabel,
  hasStored: hasCloudSessionsTokenForOrg,
  canSignInHere: isInteractiveLocalSession,
  getValid: refreshCloudSessionsOAuth,
  signIn: consoleSignInForCloudSessions,
});
