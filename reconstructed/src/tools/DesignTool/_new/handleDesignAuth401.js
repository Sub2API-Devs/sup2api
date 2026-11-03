/**
 * tools/DesignTool/_new/handleDesignAuth401.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-171dhyhe.js (1)
 * attribution: sole-consumer-new 1
 */
import { isStorageV5Enabled } from "../../../utils/hoverRest.js";
import {
  getClaudeAIOAuthTokensAsync,
  getClaudeAIOAuthTokens,
  getAuthTokenSourceAsync,
  getAuthTokenSource,
  isHostManagedProviderAuth,
} from "../../../utils/auth.js";
import { J1s } from "../../../services/design/designApi.js";
import { env } from "../../../utils/env.js";
import { isOauthTokenFromBgSnapshot } from "../../../bootstrap/state.js";
import { authExpiredBlock } from "../../../services/policyLimits/capabilityBlocks.js";

//@ chunk-171dhyhe.js:50760-53132 sole-consumer-new
async function handleDesignAuth401(e, t) {
  let c = t?.isNonInteractiveSession === !0,
    n =
      t?.wasRetried === !0
        ? "Claude Design authentication failed (HTTP 401): a freshly refreshed credential was also rejected \u2014 likely a server-side access problem with this account or credential rather than simple expiry."
        : "Claude Design authentication failed (HTTP 401): the credential was rejected and an automatic refresh did not produce a new one.",
    r;
  if (isStorageV5Enabled() && e !== void 0) r = await getClaudeAIOAuthTokensAsync(e);
  else r = getClaudeAIOAuthTokens();
  let l = !!r?.accessToken && !!r.refreshToken && r.scopes?.includes("user:design:read") === !0;
  if (!l && (await J1s(e)))
    return {
      message: `${n} The design credential (from /design login) is expired or revoked${c ? ", and /design login requires an interactive terminal \u2014 re-authenticate outside this session" : " \u2014 run /design login to re-authenticate"}.`,
      remedy: { kind: "auth_expired", provider: "claude_design" },
    };
  if (!l && r?.accessToken && !r.refreshToken) {
    let { source: source } =
      isStorageV5Enabled() && e !== void 0 ? await getAuthTokenSourceAsync(e) : getAuthTokenSource();
    if (env.CLAUDE_CODE_REMOTE_SESSION_ID)
      return {
        message: `${n} This remote session's credential is injected and rotated by the session host \u2014 it usually self-heals within minutes. Retry shortly; if this persists, the host session needs attention.`,
      };
    if (
      (source === "CCR_OAUTH_TOKEN_FILE" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR") &&
      (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth())
    )
      return {
        message: `${n} This session authenticates with an OAuth token injected by the CCR host, which has no refresh token \u2014 it cannot self-heal and has likely expired or been revoked. The credential comes from the host session; check or restart it there.`,
        remedy: { kind: "auth_overridden", provider: "claude_ai", managed: !0 },
      };
    if (
      source === "CLAUDE_CODE_OAUTH_TOKEN" ||
      (source === "ANTHROPIC_AUTH_TOKEN" && Boolean(env.CLAUDE_CODE_OAUTH_TOKEN))
    )
      return {
        message: `${n} This session authenticates with the CLAUDE_CODE_OAUTH_TOKEN environment variable, which has no refresh token \u2014 it cannot self-heal and has likely expired or been revoked. Mint a fresh token with \`claude setup-token\` and restart the session with it${c ? "" : ", or unset it and run /login"}.`,
        remedy: { kind: "auth_overridden", provider: "claude_ai", managed: !1 },
      };
  }
  let a = authExpiredBlock();
  if (c)
    return {
      message: `${n} The claude.ai credential is expired or revoked, and /login requires an interactive terminal \u2014 re-authenticate outside this session.`,
      remedy: a,
    };
  return { message: `${n} Run /login, or /design login for a separate design credential.`, remedy: a };
}

export { handleDesignAuth401 };
