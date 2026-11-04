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
import { withQuotaResumeFire } from "../../services/quotaAutoResume/quotaAutoResume.js";
import {
  isClaudeAISubscriber,
  getClaudeAIOAuthTokens,
  getUsageCreditsCommand,
  getOauthAccountInfo,
  credentialIsOwnStoredLogin,
} from "../../utils/auth.js";
import { getOauthProfileFromOauthToken } from "../../services/oauth/getOauthProfile.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Login, runPostLoginHooks, loginCompletion } from "../../services/oauth/postLoginHooks.js";
import { logError } from "../../utils/log.js";

//@ chunk-rw1dvz2v.js:468-576 placement
function getUpgradeUrl(surface) {
  return `https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${surface}`;
}
//@ chunk-rw1dvz2v.js:576-634 placement
async function call(onDone, context) {
  return callUpgradeFromSurface(onDone, context, "upgrade_command");
}
//@ chunk-rw1dvz2v.js:634-2248 placement (2.1.88 match: call, 0.541)
/**
 * 从不同入口触发 /upgrade（打开升级页并重新登录）。
 */
async function callUpgradeFromSurface(onDone, context, surface) {
  let done = withQuotaResumeFire(onDone);
  let upgradeUrl = getUpgradeUrl(surface);
  try {
    if (isClaudeAISubscriber()) {
      let tokens = getClaudeAIOAuthTokens();
      let isMax20x = false;
      if (tokens?.subscriptionType && tokens?.rateLimitTier)
        isMax20x = tokens.subscriptionType === "max" && tokens.rateLimitTier === "default_claude_max_20x";
      else if (tokens?.accessToken) {
        let profile = await getOauthProfileFromOauthToken(tokens.accessToken);
        isMax20x =
          profile?.organization?.organization_type === "claude_max" &&
          profile?.organization?.rate_limit_tier === "default_claude_max_20x";
      }
      if (isMax20x) {
        let usageCreditsCommand = getUsageCreditsCommand();
        setTimeout(
          done,
          0,
          usageCreditsCommand
            ? `You\u2019re already on the highest Max subscription plan. For additional usage, run ${usageCreditsCommand}.`
            : "You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account.",
        );
        return null;
      }
      let billingType = getOauthAccountInfo()?.billingType;
      if (
        credentialIsOwnStoredLogin() &&
        (billingType === "apple_subscription" || billingType === "google_play_subscription")
      ) {
        let usageCreditsCommand = getUsageCreditsCommand();
        let billingNote =
          billingType === "apple_subscription"
            ? "Your plan is billed through the App Store. To change it, open Claude for iOS and go to Settings \u2192 Billing. After you change it, run /login here so the new plan takes effect."
            : "Your plan is billed through Google Play. To change it, open Claude for Android and go to Settings. After you change it, run /login here so the new plan takes effect.";
        setTimeout(
          done,
          0,
          usageCreditsCommand
            ? `${billingNote} For additional usage now, run ${usageCreditsCommand}.`
            : billingNote,
        );
        return null;
      }
    }
    await openValidatedUrlSucceeded(upgradeUrl);
    let oauthAccountInfo = getOauthAccountInfo();
    let previousAccount = oauthAccountInfo && {
      accountUuid: oauthAccountInfo.accountUuid,
      organizationUuid: oauthAccountInfo.organizationUuid,
    };
    let previousGatewayAuth = getGatewayAuth();
    return jsxProd_default(Login, {
      startingMessage: "Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",
      onDone: async (token, url, setAppState) => {
        let postLogin = await runPostLoginHooks(context, token, {
          setAppState,
          previousAccount,
          previousGatewayAuth,
        });
        done(...loginCompletion(context, token, postLogin));
      },
    });
  } catch (error) {
    logError(error);
    setTimeout(done, 0, `Failed to open browser. Please visit ${upgradeUrl} to upgrade.`);
  }
  return null;
}
export { callUpgradeFromSurface, call };
