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
import { fi } from "../../utils/browser.js";
import { revokeOAuthToken } from "../oauth/client.js";
import {
  z,
  readFreshCloudSessionsOAuth,
  saveCloudSessionsOAuth,
  hasCloudSessionsTokenForOrg,
  D,
  refreshCloudSessionsOAuth,
} from "./cloudSessionsOAuth.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isSessionVerdictFromServerFetch, isSessionVerdictDisowned } from "../policyLimits/policyEvidence.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { $ki } from "../../utils/telemetry/memorySummary.js";

/**
 * 在终端读取用户粘贴的授权码。
 */
//@ chunk-4r7nqnx2.js:5096-5767 placement
function promptForPastedCode(e, { expectedState: expectedState, onCode: onCode, onCancel: onCancel }) {
  if (!e.input.isTTY || !e.output.isTTY) return;
  stopCapturingEarlyInput();
  let r = !1,
    o = !1,
    a = createInterface({ input: e.input, output: e.output, prompt: PASTE_HERE_MSG });
  return (
    a.on("SIGINT", () => onCancel()),
    a.on("close", () => {
      if (!r) onCancel();
    }),
    a.on("line", (n) => {
      let trimmed = n.trim();
      if (!trimmed) {
        a.prompt();
        return;
      }
      let [h, p] = trimmed.split("#");
      if (!h || !p) {
        (e.output.write(`Invalid code. Please make sure the full code was copied.
`),
          a.prompt());
        return;
      }
      if (expectedState !== void 0 && p !== expectedState) {
        (e.output
          .write(`That code is not from this sign-in. Paste the code shown after opening the address above.
`),
          a.prompt());
        return;
      }
      ((o = !0), onCode({ authorizationCode: h, state: p }));
    }),
    a.prompt(),
    {
      close: () => {
        if (r) return;
        if (((r = !0), !o))
          e.output.write(`
`);
        a.close();
      },
    }
  );
}
/**
 * 为云会话进行 Console 浏览器登录（PKCE、超时、取消）。
 */
//@ chunk-4r7nqnx2.js:5767-7748 placement
async function consoleSignInForCloudSessions({
  organizationUuid: organizationUuid,
  onBrowserOpening: onBrowserOpening,
  terminal: terminal = { input: process.stdin, output: process.stdout },
}) {
  let CLIENT_ID = getOauthConfig().CLIENT_ID,
    r = getWIFAccountInfo()?.accountEmail,
    o = new OAuthService(),
    a = !1,
    n = !1,
    c = !1,
    h,
    p,
    S,
    y = !1,
    I = () => {},
    promise = new Promise((C, A) => {
      I = A;
    });
  promise.catch(() => {});
  try {
    let startOAuthFlow = o.startOAuthFlow(
      async (T, E) => {
        (onBrowserOpening?.(T),
          (p = promptForPastedCode(terminal, {
            expectedState: Y(T),
            onCode: (P) => o.handleManualAuthCodeInput(P),
            onCancel: () => {
              if (y) return;
              ((n = !0), (c = !0), I(Error("cloud-sessions sign-in cancelled")));
            },
          })),
          await fi(E ?? T));
      },
      {
        loginWithClaudeAi: !1,
        oauthClient: { clientId: CLIENT_ID, scopes: CLOUD_SESSIONS_OAUTH_SCOPES },
        orgUUID: organizationUuid,
        loginHint: r,
        skipBrowserOpen: !0,
        successRedirectUrl: getOauthConfig().CLAUDEAI_SUCCESS_URL,
      },
    );
    (startOAuthFlow
      .then((T) => {
        if (c && T.refreshToken) revokeOAuthToken(T.refreshToken, CLIENT_ID);
      })
      .catch(() => {}),
      (h = setTimeout(() => {
        ((a = !0), (c = !0), I(Error("cloud-sessions sign-in timed out")));
      }, z)));
    let winner = await Promise.race([startOAuthFlow, promise]);
    ((y = !0), p?.close());
    let _ = await finishConsoleSignIn(winner, CLIENT_ID, organizationUuid, r);
    if (!_.ok) return (logFeatureBad("cloud_sessions_console_sign_in", _.reason), _);
    S = _.slot;
    let w = await readFreshCloudSessionsOAuth();
    if (w?.refreshToken && w.refreshToken !== _.slot.refreshToken)
      await revokeOAuthToken(w.refreshToken, w.clientId);
    if (!(await saveCloudSessionsOAuth(_.slot)).success)
      return (
        await revokeOAuthToken(_.slot.refreshToken, CLIENT_ID),
        logFeatureBad("cloud_sessions_console_sign_in", "save_failed"),
        {
          ok: !1,
          reason: "save_failed",
          message: "Could not save the cloud-sessions credential to secure storage. Try again.",
        }
      );
    return (
      (S = void 0),
      logFeatureOk("cloud_sessions_console_sign_in"),
      { ok: !0, accessToken: _.slot.accessToken }
    );
  } catch (error) {
    if (((y = !0), (c = !0), S !== void 0)) await revokeOAuthToken(S.refreshToken, S.clientId);
    if (a)
      return (
        logFeatureBad("cloud_sessions_console_sign_in", "timed_out"),
        {
          ok: !1,
          reason: "timed_out",
          message: "The browser sign-in for cloud sessions timed out after 5 minutes. Try again.",
        }
      );
    if (n)
      return (
        logFeatureSad("cloud_sessions_console_sign_in", "cancelled"),
        { ok: !1, reason: "cancelled", message: "The sign-in for cloud sessions was cancelled." }
      );
    return (
      logForDebugging(`Cloud-sessions sign-in failed: ${errorMessage(error)}`, { level: "error" }),
      logFeatureBad("cloud_sessions_console_sign_in", "failed"),
      { ok: !1, reason: "failed", message: "The browser sign-in for cloud sessions failed. Try again." }
    );
  } finally {
    if (h !== void 0) clearTimeout(h);
    (p?.close(), o.cleanup());
  }
}
//@ chunk-4r7nqnx2.js:7748-7832 placement
function Y(e) {
  try {
    return new URL(e).searchParams.get("state") ?? void 0;
  } catch {
    return;
  }
}
/**
 * 校验作用域并保存云会话凭据。
 */
//@ chunk-4r7nqnx2.js:7832-9412 placement
async function finishConsoleSignIn(e, s, k, u) {
  let r = async () => {
    if (e.refreshToken) await revokeOAuthToken(e.refreshToken, s);
  };
  if (!e.scopes.includes(CLAUDE_AI_SESSIONS_SCOPE))
    return (
      await r(),
      {
        ok: !1,
        reason: "scope_not_granted",
        message:
          "Your Console organization doesn't allow cloud sessions from Claude Code, so the sign-in didn't grant that permission. Cloud sessions stay unavailable with this sign-in.",
      }
    );
  let o = e.tokenAccount?.organizationUuid ?? e.profile?.organization.uuid;
  if (o === void 0)
    return (
      await r(),
      {
        ok: !1,
        reason: "invalid",
        message: "The sign-in didn't say which organization it was for, so it can't be used. Try again.",
      }
    );
  if (o.toLowerCase() !== k.toLowerCase())
    return (
      await r(),
      {
        ok: !1,
        reason: "other_organization",
        message:
          "The sign-in was for a different organization than your Console sign-in. Sign in again and choose the same organization.",
      }
    );
  if (u !== void 0) {
    let a = (e.tokenAccount?.emailAddress || e.profile?.account.email)?.trim() || void 0;
    if (a === void 0)
      return (
        await r(),
        {
          ok: !1,
          reason: "invalid",
          message: "The sign-in didn't say which account it was for, so it can't be used. Try again.",
        }
      );
    if (a.trim().toLowerCase() !== u.trim().toLowerCase())
      return (
        await r(),
        {
          ok: !1,
          reason: "other_account",
          message: `The sign-in was for ${a}, but your Console sign-in is ${u}. Sign in again as ${u}.`,
        }
      );
  }
  if (!e.refreshToken || !e.expiresAt)
    return (
      await r(),
      {
        ok: !1,
        reason: "invalid",
        message:
          "The sign-in came back without a refresh token or an expiry, so it could not be stored. Try again.",
      }
    );
  return {
    ok: !0,
    slot: {
      accessToken: e.accessToken,
      refreshToken: e.refreshToken,
      expiresAt: e.expiresAt,
      scopes: e.scopes.filter((scope) => CLOUD_SESSIONS_OAUTH_SCOPES.some((n) => n === scope)),
      clientId: s,
      organizationUuid: k,
    },
  };
}
//@ chunk-4r7nqnx2.js:9412-9490 placement
function V() {
  if (!isSessionVerdictFromServerFetch() || isSessionVerdictDisowned()) return "unknown";
  return hasComplianceTaint("ldr") ? "ldr" : "not_ldr";
}
//@ chunk-4r7nqnx2.js:9490-9565 placement
$ki({
  organizationLabel: V,
  hasStored: hasCloudSessionsTokenForOrg,
  canSignInHere: D,
  getValid: refreshCloudSessionsOAuth,
  signIn: consoleSignInForCloudSessions,
});
