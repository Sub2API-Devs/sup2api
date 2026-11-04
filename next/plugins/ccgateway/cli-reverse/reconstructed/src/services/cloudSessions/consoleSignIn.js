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
  let gotCode = false;
  let cancelled = false;
  let rl = createInterface({
    input: terminal.input,
    output: terminal.output,
    prompt: PASTE_HERE_MSG,
  });
  rl.on("SIGINT", () => onCancel());
  rl.on("close", () => {
    if (!gotCode) onCancel();
  });
  rl.on("line", (line) => {
    let trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }
    let [code, state] = trimmed.split("#");
    if (!code || !state) {
      terminal.output.write(`Invalid code. Please make sure the full code was copied.
`);
      rl.prompt();
      return;
    }
    if (expectedState !== undefined && state !== expectedState) {
      terminal.output
        .write(`That code is not from this sign-in. Paste the code shown after opening the address above.
`);
      rl.prompt();
      return;
    }
    cancelled = true;
    onCode({
      authorizationCode: code,
      state,
    });
  });
  rl.prompt();
  return {
    close: () => {
      if (gotCode) return;
      gotCode = true;
      if (!cancelled)
        terminal.output.write(`
`);
      rl.close();
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
  let oauthService = new OAuthService();
  let timedOut = false;
  let cancelled = false;
  let abandoned = false;
  let timeoutTimer;
  let pastePrompt;
  let unsavedSlot;
  let done = false;
  let failSignIn = () => {};
  let promise = new Promise((resolve, reject) => {
    failSignIn = reject;
  });
  promise.catch(() => {});
  try {
    let flowPromise = oauthService.startOAuthFlow(
      async (authorizeUrl, openUrl) => {
        onBrowserOpening?.(authorizeUrl);
        pastePrompt = promptForPastedCode(terminal, {
          expectedState: getOAuthStateFromUrl(authorizeUrl),
          onCode: (pastedCode) => oauthService.handleManualAuthCodeInput(pastedCode),
          onCancel: () => {
            if (done) return;
            cancelled = true;
            abandoned = true;
            failSignIn(Error("cloud-sessions sign-in cancelled"));
          },
        });
        await openValidatedUrlSucceeded(openUrl ?? authorizeUrl);
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
    flowPromise
      .then((tokens) => {
        if (abandoned && tokens.refreshToken) revokeOAuthToken(tokens.refreshToken, CLIENT_ID);
      })
      .catch(() => {});
    timeoutTimer = setTimeout(() => {
      timedOut = true;
      abandoned = true;
      failSignIn(Error("cloud-sessions sign-in timed out"));
    }, OAUTH_FLOW_TIMEOUT_MS);
    let winner = await Promise.race([flowPromise, promise]);
    done = true;
    pastePrompt?.close();
    let finished = await finishConsoleSignIn(winner, CLIENT_ID, organizationUuid, accountEmail);
    if (!finished.ok) {
      logFeatureBad("cloud_sessions_console_sign_in", finished.reason);
      return finished;
    }
    unsavedSlot = finished.slot;
    let freshCloudSessionsOAuth = await readFreshCloudSessionsOAuth();
    if (
      freshCloudSessionsOAuth?.refreshToken &&
      freshCloudSessionsOAuth.refreshToken !== finished.slot.refreshToken
    )
      await revokeOAuthToken(freshCloudSessionsOAuth.refreshToken, freshCloudSessionsOAuth.clientId);
    if (!(await saveCloudSessionsOAuth(finished.slot)).success) {
      await revokeOAuthToken(finished.slot.refreshToken, CLIENT_ID);
      logFeatureBad("cloud_sessions_console_sign_in", "save_failed");
      return {
        ok: false,
        reason: "save_failed",
        message: "Could not save the cloud-sessions credential to secure storage. Try again.",
      };
    }
    unsavedSlot = undefined;
    logFeatureOk("cloud_sessions_console_sign_in");
    return {
      ok: true,
      accessToken: finished.slot.accessToken,
    };
  } catch (error) {
    done = true;
    abandoned = true;
    if (unsavedSlot !== undefined) await revokeOAuthToken(unsavedSlot.refreshToken, unsavedSlot.clientId);
    if (timedOut) {
      logFeatureBad("cloud_sessions_console_sign_in", "timed_out");
      return {
        ok: false,
        reason: "timed_out",
        message: "The browser sign-in for cloud sessions timed out after 5 minutes. Try again.",
      };
    }
    if (cancelled) {
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
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer);
    pastePrompt?.close();
    oauthService.cleanup();
  }
}
//@ chunk-4r7nqnx2.js:7748-7832 placement
/**
 * 从回调 URL 里取 state 参数，取不到返回 undefined。
 */
function getOAuthStateFromUrl(url) {
  try {
    return new URL(url).searchParams.get("state") ?? undefined;
  } catch {
    return;
  }
}
//@ chunk-4r7nqnx2.js:7832-9412 placement
/**
 * 校验作用域并保存云会话凭据。
 */
async function finishConsoleSignIn(tokens, clientId, organizationUuid, accountEmail) {
  let revoke = async () => {
    if (tokens.refreshToken) await revokeOAuthToken(tokens.refreshToken, clientId);
  };
  if (!tokens.scopes.includes(CLAUDE_AI_SESSIONS_SCOPE)) {
    await revoke();
    return {
      ok: false,
      reason: "scope_not_granted",
      message:
        "Your Console organization doesn't allow cloud sessions from Claude Code, so the sign-in didn't grant that permission. Cloud sessions stay unavailable with this sign-in.",
    };
  }
  let orgUuid = tokens.tokenAccount?.organizationUuid ?? tokens.profile?.organization.uuid;
  if (orgUuid === undefined) {
    await revoke();
    return {
      ok: false,
      reason: "invalid",
      message: "The sign-in didn't say which organization it was for, so it can't be used. Try again.",
    };
  }
  if (orgUuid.toLowerCase() !== organizationUuid.toLowerCase()) {
    await revoke();
    return {
      ok: false,
      reason: "other_organization",
      message:
        "The sign-in was for a different organization than your Console sign-in. Sign in again and choose the same organization.",
    };
  }
  if (accountEmail !== undefined) {
    let email = (tokens.tokenAccount?.emailAddress || tokens.profile?.account.email)?.trim() || undefined;
    if (email === undefined) {
      await revoke();
      return {
        ok: false,
        reason: "invalid",
        message: "The sign-in didn't say which account it was for, so it can't be used. Try again.",
      };
    }
    if (email.trim().toLowerCase() !== accountEmail.trim().toLowerCase()) {
      await revoke();
      return {
        ok: false,
        reason: "other_account",
        message: `The sign-in was for ${email}, but your Console sign-in is ${accountEmail}. Sign in again as ${accountEmail}.`,
      };
    }
  }
  if (!tokens.refreshToken || !tokens.expiresAt) {
    await revoke();
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
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes.filter((scope) =>
        CLOUD_SESSIONS_OAUTH_SCOPES.some((allowedScope) => allowedScope === scope),
      ),
      clientId,
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
