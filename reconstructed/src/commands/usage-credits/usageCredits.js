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
import { o, Ir, u, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { due } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { canPurchaseExtraUsage, runExtraUsage } from "../extra-usage/extra-usage-core.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ExtraUsageDialogEntry } from "../../components/usageCredits/ExtraUsageDialog.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { USAGE_CREDITS_NONINTERACTIVE_HINT } from "../../services/api/adminRequests.js";
import { AdminRequestConfirmDialog } from "../../components/usageCredits/AdminRequestDialog.js";
import { getSubscriptionType, getOauthAccountInfo } from "../../utils/auth.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { Login, runPostLoginHooks, loginCompletion } from "../../services/oauth/postLoginHooks.js";

//@ chunk-hf9dmwqr.js:551-595 placement
function a() {
  return o().regex(/^\P{Cc}*$/u);
}
//@ chunk-hf9dmwqr.js:595-771 placement
var usageCreditsFlowSchema = DoctorLazy(() =>
  Ir("mode", [
    u({ mode: T("one_step") }),
    u({
      mode: T("confirm"),
      title: a().optional(),
      body: a().optional(),
      note: a().optional(),
      send: a().optional(),
      cancel: a().optional(),
    }),
  ]),
);
/**
 * 读取 tengu_tidy_lemon 开关中的购买用量额度流程配置，校验失败或未设置时返回 null。
 */
//@ chunk-hf9dmwqr.js:771-907 placement
function getUsageCreditsFlowConfig() {
  let i = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_lemon", null);
  if (i === null || i === void 0) return null;
  let safeParse = usageCreditsFlowSchema().safeParse(i);
  return safeParse.success ? safeParse.data : null;
}
//@ chunk-hf9dmwqr.js:907-1827 placement
async function call(onDone, context) {
  let n = due(onDone);
  if (canPurchaseExtraUsage()) return e(ExtraUsageDialogEntry, { onDone: n });
  let t = await runExtraUsage({ openInBrowser: !0 }, context.credentials);
  if (t.type === "message") return (n(t.value), null);
  if (t.type === "confirm-admin-request") {
    if (isBgSession()) return (n(USAGE_CREDITS_NONINTERACTIVE_HINT), null);
    return e(AdminRequestConfirmDialog, {
      extraUsage: t.extraUsage,
      flag: getUsageCreditsFlowConfig(),
      wouldTakeAnswer: () => !0,
      onDone: n,
    });
  }
  let l = getSubscriptionType();
  if (l === "team" || l === "enterprise")
    return (
      n(
        t.opened
          ? `Opened ${t.url} in your browser to manage usage credits for your organization.`
          : `Visit ${t.url} to manage usage credits for your organization.`,
      ),
      null
    );
  if (!t.opened) return (n(`Visit ${t.url} to manage usage credits.`), null);
  let s = getOauthAccountInfo(),
    g = s && { accountUuid: s.accountUuid, organizationUuid: s.organizationUuid },
    c = getGatewayAuth();
  return e(Login, {
    startingMessage: "Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",
    onDone: async (m, A, d) => {
      let f = await runPostLoginHooks(context, m, {
        setAppState: d,
        previousAccount: g,
        previousGatewayAuth: c,
      });
      n(...loginCompletion(context, m, f));
    },
  });
}

export { call, getUsageCreditsFlowConfig };
