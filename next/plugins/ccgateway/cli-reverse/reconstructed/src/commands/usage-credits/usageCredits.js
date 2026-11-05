/**
 * commands/usage-credits/usageCredits.tsx
 *
 * 用量额度命令的特性开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m44frsvn.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { withQuotaResumeFire } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { canPurchaseExtraUsage, runExtraUsage } from "../extra-usage/extra-usage-core.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ExtraUsageDialogEntry } from "../../components/usageCredits/ExtraUsageDialog.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { USAGE_CREDITS_NONINTERACTIVE_HINT } from "../../services/api/adminRequests.js";
import { AdminRequestConfirmDialog } from "../../components/usageCredits/AdminRequestDialog.js";
import { getSubscriptionType, getOauthAccountInfo } from "../../utils/auth.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { Login, runPostLoginHooks, loginCompletion } from "../../services/oauth/postLoginHooks.js";

//@ chunk-m44frsvn.js:472-1381 placement
async function call(onDone, context) {
  let done = withQuotaResumeFire(onDone);
  if (canPurchaseExtraUsage())
    return jsxProd_default(ExtraUsageDialogEntry, {
      onDone: done,
    });
  let result = await runExtraUsage(
    {
      openInBrowser: true,
    },
    context.credentials,
  );
  if (result.type === "message") {
    done(result.value);
    return null;
  }
  if (result.type === "confirm-admin-request") {
    if (isBgSession()) {
      done(USAGE_CREDITS_NONINTERACTIVE_HINT);
      return null;
    }
    return jsxProd_default(AdminRequestConfirmDialog, {
      extraUsage: result.extraUsage,
      wouldTakeAnswer: () => true,
      onDone: done,
    });
  }
  let subscriptionType = getSubscriptionType();
  if (subscriptionType === "team" || subscriptionType === "enterprise") {
    done(
      result.opened
        ? `Opened ${result.url} in your browser to manage usage credits for your organization.`
        : `Visit ${result.url} to manage usage credits for your organization.`,
    );
    return null;
  }
  if (!result.opened) {
    done(`Visit ${result.url} to manage usage credits.`);
    return null;
  }
  let oauthAccountInfo = getOauthAccountInfo();
  let previousAccount = oauthAccountInfo && {
    accountUuid: oauthAccountInfo.accountUuid,
    organizationUuid: oauthAccountInfo.organizationUuid,
  };
  let previousGatewayAuth = getGatewayAuth();
  return jsxProd_default(Login, {
    startingMessage: "Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",
    onDone: async (token, url, setAppState) => {
      let postLogin = await runPostLoginHooks(context, token, {
        setAppState,
        previousAccount,
        previousGatewayAuth,
      });
      done(...loginCompletion(context, token, postLogin));
    },
  });
}
export { call };
