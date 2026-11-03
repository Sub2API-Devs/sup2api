/**
 * commands/usage-credits/usageCredits.tsx
 *
 * 用量额度命令的特性开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hf9dmwqr.js (4)
 * attribution: placement 4
 */
import { string, discriminatedUnion, u, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
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

//@ chunk-hf9dmwqr.js:551-595 placement
function printableTextSchema() {
  return string().regex(/^\P{Cc}*$/u);
}
//@ chunk-hf9dmwqr.js:595-771 placement
var usageCreditsFlowSchema = DoctorLazy(() =>
  discriminatedUnion("mode", [
    u({
      mode: literal("one_step"),
    }),
    u({
      mode: literal("confirm"),
      title: printableTextSchema().optional(),
      body: printableTextSchema().optional(),
      note: printableTextSchema().optional(),
      send: printableTextSchema().optional(),
      cancel: printableTextSchema().optional(),
    }),
  ]),
);
//@ chunk-hf9dmwqr.js:771-907 placement
/**
 * 读取 tengu_tidy_lemon 开关中的购买用量额度流程配置，校验失败或未设置时返回 null。
 */
function getUsageCreditsFlowConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_lemon", null);
  if (featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined)
    return null;
  let r = usageCreditsFlowSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  return r.success ? r.data : null;
}
//@ chunk-hf9dmwqr.js:907-1827 placement
async function call(onDone, context) {
  let n = withQuotaResumeFire(onDone);
  if (canPurchaseExtraUsage())
    return jsxProd_default(ExtraUsageDialogEntry, {
      onDone: n,
    });
  let t = await runExtraUsage(
    {
      openInBrowser: true,
    },
    context.credentials,
  );
  if (t.type === "message") {
    n(t.value);
    return null;
  }
  if (t.type === "confirm-admin-request") {
    if (isBgSession()) {
      n(USAGE_CREDITS_NONINTERACTIVE_HINT);
      return null;
    }
    return jsxProd_default(AdminRequestConfirmDialog, {
      extraUsage: t.extraUsage,
      flag: getUsageCreditsFlowConfig(),
      wouldTakeAnswer: () => true,
      onDone: n,
    });
  }
  let subscriptionType = getSubscriptionType();
  if (subscriptionType === "team" || subscriptionType === "enterprise") {
    n(
      t.opened
        ? `Opened ${t.url} in your browser to manage usage credits for your organization.`
        : `Visit ${t.url} to manage usage credits for your organization.`,
    );
    return null;
  }
  if (!t.opened) {
    n(`Visit ${t.url} to manage usage credits.`);
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
    onDone: async (m, A, setAppState) => {
      let f = await runPostLoginHooks(context, m, {
        setAppState,
        previousAccount,
        previousGatewayAuth,
      });
      n(...loginCompletion(context, m, f));
    },
  });
}
export { call, getUsageCreditsFlowConfig };
