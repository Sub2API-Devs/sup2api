/**
 * commands/upgrade/upgrade.tsx
 *
 * 2.1.316 新增。从不同入口触发 /upgrade（打开升级页并重新登录）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/upgrade/upgrade.tsx
 * pieces: chunk-rw1dvz2v.js (3)
 * attribution: placement 3
 */
import { due } from "../../services/quotaAutoResume/quotaAutoResume.js";
import {
  isClaudeAISubscriber,
  getClaudeAIOAuthTokens,
  getUsageCreditsCommand,
  getOauthAccountInfo,
  credentialIsOwnStoredLogin,
} from "../../utils/auth.js";
import { getOauthProfileFromOauthToken } from "../../services/oauth/getOauthProfile.js";
import { fi } from "../../utils/browser.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Login, runPostLoginHooks, loginCompletion } from "../../services/oauth/postLoginHooks.js";
import { logError } from "../../utils/log.js";

//@ chunk-rw1dvz2v.js:468-576 placement
function getUpgradeUrl(a) {
  return `https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${a}`;
}
//@ chunk-rw1dvz2v.js:576-634 placement
async function call(onDone, context) {
  return callUpgradeFromSurface(onDone, context, "upgrade_command");
}
/**
 * 从不同入口触发 /upgrade（打开升级页并重新登录）。
 */
//@ chunk-rw1dvz2v.js:634-2248 placement = call (0.541)
async function callUpgradeFromSurface(a, r, d) {
  let u = due(a),
    c = getUpgradeUrl(d);
  try {
    if (isClaudeAISubscriber()) {
      let tokens = getClaudeAIOAuthTokens(),
        s = !1;
      if (tokens?.subscriptionType && tokens?.rateLimitTier)
        s = tokens.subscriptionType === "max" && tokens.rateLimitTier === "default_claude_max_20x";
      else if (tokens?.accessToken) {
        let profile = await getOauthProfileFromOauthToken(tokens.accessToken);
        s =
          profile?.organization?.organization_type === "claude_max" &&
          profile?.organization?.rate_limit_tier === "default_claude_max_20x";
      }
      if (s) {
        let o = getUsageCreditsCommand();
        return (
          setTimeout(
            u,
            0,
            o
              ? `You\u2019re already on the highest Max subscription plan. For additional usage, run ${o}.`
              : "You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account.",
          ),
          null
        );
      }
      let i = getOauthAccountInfo()?.billingType;
      if (credentialIsOwnStoredLogin() && (i === "apple_subscription" || i === "google_play_subscription")) {
        let o = getUsageCreditsCommand(),
          p =
            i === "apple_subscription"
              ? "Your plan is billed through the App Store. To change it, open Claude for iOS and go to Settings \u2192 Billing. After you change it, run /login here so the new plan takes effect."
              : "Your plan is billed through Google Play. To change it, open Claude for Android and go to Settings. After you change it, run /login here so the new plan takes effect.";
        return (setTimeout(u, 0, o ? `${p} For additional usage now, run ${o}.` : p), null);
      }
    }
    await fi(c);
    let n = getOauthAccountInfo(),
      m = n && { accountUuid: n.accountUuid, organizationUuid: n.organizationUuid },
      f = getGatewayAuth();
    return e(Login, {
      startingMessage: "Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",
      onDone: async (t, s, i) => {
        let o = await runPostLoginHooks(r, t, { setAppState: i, previousAccount: m, previousGatewayAuth: f });
        u(...loginCompletion(r, t, o));
      },
    });
  } catch (error) {
    (logError(error), setTimeout(u, 0, `Failed to open browser. Please visit ${c} to upgrade.`));
  }
  return null;
}

export { callUpgradeFromSurface };
