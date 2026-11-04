/**
 * hooks/notifs/specs/projectEnvNotices.ts
 *
 * 2.1.316 新增。启动通知：项目环境类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (14)
 * attribution: placement 14
 */
import { saveGlobalConfig, getGlobalConfig } from "../../../utils/config.js";
import { isProTrialExpiredWithDisabledCredits } from "../../../services/api/proTrial.js";
import { NOOP_HELPERS } from "../../useCommandKeybindings.js";
import { isRemoteSessionAvailable } from "../../../remote/remoteMode.js";
import { isRemoteLikeEnv } from "../../../utils/managedEnvSafety.js";
import {
  isClaudeInChromeWiredThisSession,
  shouldEnableClaudeInChrome as shouldEnableClaudeInChrome_2,
} from "../../../utils/claudeInChrome/setup.js";
import { getChromeFlagOverride } from "../../../bootstrap/state.js";
import { isClaudeAISubscriber, getSubscriptionType } from "../../../utils/auth.js";
import { getEnabledSettingSources } from "../../../utils/settings/constants.js";
import {
  getSettingsForSource,
  projectSettingsAliasesUserSettings,
} from "../../../utils/settings/settings.js";
import { isDangerousEnvVar, OAUTH_ENV_VARS } from "../../../utils/managedEnvConstants.js";
import { isEnvTruthy } from "../../../utils/envUtils.js";
import { plural } from "../../../utils/stringUtils.js";
import { env } from "../../../utils/env.js";
import { formatIgnoredTelemetryEnvNotice } from "../../../utils/settings/settingsNotices.js";
import {
  isPromoCreditNoticeEligible,
  getPromoLoginKey,
  hasRemainingPromoCredit,
} from "../../../components/LogoV2/PromoNotices.js";
import { isEssentialTrafficOnly } from "../../../utils/privacyLevel.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../../services/policyLimits/policyEvidence.js";
import {
  ALLOW_PROMO_OFFERS,
  isUsageBasedBilling,
  usesPayAsYouGo,
  hasUsageCreditsConsent,
  isConsumerPlan,
} from "../../../utils/planTiers.js";
import { fetchUsageWithModelScopes } from "../../../services/api/usage.js";
import { logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { logError } from "../../../utils/log.js";
import { onOverageInUse } from "../../../services/claudeAiLimits.js";
import {
  usageCreditsOnlyFamily,
  renderUsageCreditsOnlyModelName,
} from "../../../utils/model/modelDisplay.js";

//@ chunk-18hwfzwa.js:1776018-1776271 placement
var promptQueueUseCountNoticeSpec = {
  id: "prompt-queue-use-count",
  deps: (ctx) => [ctx.queuedCommandCount, ctx.storageV5],
  setup() {
    let cancelled = false;
    return ({ queuedCommandCount, storageV5 }) => {
      if (queuedCommandCount < 1) {
        cancelled = false;
        return;
      }
      if (cancelled) return;
      cancelled = true;
      saveGlobalConfig(
        (prev) => ({
          ...prev,
          promptQueueUseCount: (prev.promptQueueUseCount ?? 0) + 1,
        }),
        storageV5,
      );
    };
  },
};
//@ chunk-18hwfzwa.js:1776271-1776424 placement
var proTrialExpiredAutoOpenNoticeSpec = {
  id: "pro-trial-expired-auto-open",
  setup() {
    return ({ submitPrompt }) => {
      if (!isProTrialExpiredWithDisabledCredits()) return;
      submitPrompt("/pro-trial-expired", NOOP_HELPERS, {
        inputModeOverride: "prompt",
      });
    };
  },
};
//@ chunk-18hwfzwa.js:1776424-1776472 placement
var projectChromeEnvNoticeSpec = {
  id: "project-chrome-env",
  setup: () => projectChromeEnvNotice,
};
//@ chunk-18hwfzwa.js:1776472-1776826 placement
/**
 * 项目设置里设置了 CLAUDE_CODE_ENABLE_CFC 时提示：项目不能开启 Claude in Chrome，需用 /chrome 或 --chrome 自行开启。
 */
function projectChromeEnvNotice({ addNotification }) {
  if (
    isRemoteSessionAvailable() ||
    isRemoteLikeEnv() ||
    isClaudeInChromeWiredThisSession() ||
    !shouldEnableClaudeInChrome() ||
    !projectEnablesChrome()
  )
    return;
  addNotification({
    key: "project-chrome-env",
    kind: "warning",
    text: "Claude Code ignored CLAUDE_CODE_ENABLE_CFC in this project's settings: a project can't turn on Claude in Chrome. To turn it on yourself, run /chrome or start with --chrome.",
    color: "warning",
    priority: "medium",
    timeoutMs: 15000,
  });
}
//@ chunk-18hwfzwa.js:1776826-1776874 placement
function shouldEnableClaudeInChrome() {
  return getChromeFlagOverride() !== false && shouldEnableClaudeInChrome_2(true) && isClaudeAISubscriber();
}
//@ chunk-18hwfzwa.js:1776874-1777161 placement
function projectEnablesChrome() {
  let enabledSettingSources = getEnabledSettingSources();
  let last = enabledSettingSources
    .flatMap((enabledSettingSource) =>
      Object.entries(getSettingsForSource(enabledSettingSource)?.env ?? {})
        .filter(([key]) => key.toUpperCase() === "CLAUDE_CODE_ENABLE_CFC")
        .map(([, value]) => ({
          source: enabledSettingSource,
          value,
        })),
    )
    .at(-1);
  return (
    last !== undefined &&
    isDangerousEnvVar(last.source) &&
    isEnvTruthy(last.value) &&
    !(
      last.source === "projectSettings" &&
      enabledSettingSources.includes("userSettings") &&
      projectSettingsAliasesUserSettings()
    )
  );
}
//@ chunk-18hwfzwa.js:1777161-1777210 placement
var projectSignInEnvNoticeSpec = {
  id: "project-sign-in-env",
  setup: () => projectSignInEnvNotice,
};
//@ chunk-18hwfzwa.js:1777210-1777754 placement
/**
 * 项目设置里设置了登录相关环境变量时提示它们被忽略（项目不能设定你的 claude.ai 登录）。
 */
function projectSignInEnvNotice({ addNotification }) {
  if (isRemoteSessionAvailable()) return;
  let sources = getHooksSources();
  let first = sources[0];
  if (first === undefined) return;
  let files = new Set(sources.flatMap(({ files }) => files));
  let where = files.size === 1 ? [...files][0] : "this project's settings files";
  let moreCount = sources.length - 1;
  let summary =
    moreCount === 0
      ? `${first.name} in ${where} is ignored`
      : `${first.name} and ${moreCount} more ${plural(moreCount, "sign-in variable")} in ${where} are ignored`;
  addNotification({
    key: "project-sign-in-env",
    kind: "warning",
    text: `${summary} \xB7 set your own sign-in in your shell or ~/.claude/settings.json \xB7 a project can't set your claude.ai sign-in`,
    color: "warning",
    priority: "medium",
    timeoutMs: 15000,
  });
}
//@ chunk-18hwfzwa.js:1777754-1778113 placement (2.1.88 match: getHooksSources, 0.871)
function getHooksSources() {
  let filtered = getEnabledSettingSources().filter(
    (pair) =>
      isDangerousEnvVar(pair) &&
      !(
        pair === "projectSettings" &&
        getEnabledSettingSources().includes("userSettings") &&
        projectSettingsAliasesUserSettings()
      ),
  );
  return OAUTH_ENV_VARS.flatMap((name) => {
    if (env[name]) return [];
    let mapped = filtered
      .filter((settings) =>
        Object.keys(getSettingsForSource(settings)?.env ?? {}).some((key) => key.toUpperCase() === name),
      )
      .map((entry) => (entry === "localSettings" ? ".claude/settings.local.json" : ".claude/settings.json"));
    return mapped.length > 0
      ? [
          {
            name,
            files: mapped,
          },
        ]
      : [];
  });
}
//@ chunk-18hwfzwa.js:1778113-1778164 placement
var projectTelemetryEnvNoticeSpec = {
  id: "project-telemetry-env",
  setup: () => projectTelemetryEnvNotice,
};
//@ chunk-18hwfzwa.js:1778164-1778531 placement
/**
 * 项目设置里设置了遥测相关环境变量时提示，可用 /status 查看哪些被忽略、哪些关闭了遥测。
 */
function projectTelemetryEnvNotice({ addNotification }) {
  if (isRemoteSessionAvailable()) return;
  let { ignored, turnedOff } = formatIgnoredTelemetryEnvNotice();
  if (ignored.length === 0 && turnedOff.length === 0) return;
  addNotification({
    key: "project-telemetry-env",
    kind: "warning",
    text: "This project's settings set telemetry environment variables. Run /status to see which ones Claude Code ignored and which turned telemetry off.",
    color: "warning",
    priority: "medium",
    timeoutMs: 15000,
  });
}
//@ chunk-18hwfzwa.js:1778531-1779429 placement
/**
 * 启动通知"promo-credit-check"：随机延迟后、每个登录每天最多一次，查询用量接口中的促销额度窗口并把结果写入全局配置 promoCreditCheck。
 */
var PROMO_CHECK_INTERVAL_MS = 86400000;
var PROMO_CHECK_MIN_DELAY_MS = 5000;
var PROMO_CHECK_JITTER_MS = 25000;
var promoCreditCheckSpec = {
  id: "promo-credit-check",
  setup() {
    let cancelled = false;
    return ({ session, storageV5, credentials, clock }) => {
      if (cancelled) return;
      cancelled = true;
      let delayMs = PROMO_CHECK_MIN_DELAY_MS + Math.floor(Math.random() * PROMO_CHECK_JITTER_MS);
      return clock.setTimeout(() => {
        if (
          !isPromoCreditNoticeEligible(session) ||
          isEssentialTrafficOnly() ||
          !isPolicyAllowed_2(ALLOW_PROMO_OFFERS)
        )
          return;
        let promoLoginKey = getPromoLoginKey();
        let promoCreditCheck = getGlobalConfig().promoCreditCheck;
        let now = Date.now();
        let sinceMs = promoCreditCheck?.login === promoLoginKey ? now - promoCreditCheck.askedAtMs : -1;
        if (promoLoginKey === null || (sinceMs >= 0 && sinceMs < PROMO_CHECK_INTERVAL_MS)) return;
        saveGlobalConfig(
          (prev) => ({
            ...prev,
            promoCreditCheck: {
              login: promoLoginKey,
              askedAtMs: now,
              answer:
                prev.promoCreditCheck?.login === promoLoginKey ? prev.promoCreditCheck.answer : undefined,
            },
          }),
          storageV5,
        );
        fetchUsageWithModelScopes(storageV5, credentials)
          .then((usageWithModelScopes) => {
            if (usageWithModelScopes.status !== "ok") {
              logFeatureSad("promo_credit_check", "usage_unavailable");
              return;
            }
            logFeatureOk("promo_credit_check");
            if (getPromoLoginKey() !== promoLoginKey || !isPolicyAllowed_2(ALLOW_PROMO_OFFERS)) return;
            let wattleEmber = usageWithModelScopes.utilization.wattle_ember;
            let answer = {
              atMs: Date.now(),
              open: hasRemainingPromoCredit(wattleEmber, Date.now()),
              endsAt: wattleEmber?.resets_at ?? null,
            };
            saveGlobalConfig(
              (prev) =>
                prev.promoCreditCheck?.login === promoLoginKey
                  ? {
                      ...prev,
                      promoCreditCheck: {
                        ...prev.promoCreditCheck,
                        answer,
                      },
                    }
                  : prev,
              storageV5,
            );
          })
          .catch(logError);
      }, delayMs);
    };
  },
};
//@ chunk-18hwfzwa.js:1779429-1779933 placement
var fableUsageCreditsNoticeSpec = {
  id: "fable-usage-credits",
  deps: (ctx) => [ctx.addNotification],
  setup() {
    let shown = false;
    return ({ addNotification }) =>
      onOverageInUse((family, inUse, details) => {
        let creditsFamily = usageCreditsOnlyFamily(family);
        if (creditsFamily === undefined) return;
        if (inUse || details) return;
        if (isUsageBasedBilling()) return;
        if (usesPayAsYouGo()) return;
        if (hasUsageCreditsConsent(creditsFamily)) {
          if (!shown) {
            shown = true;
            addNotification({
              kind: "contextual",
              key: "fable-credits-info",
              text: `${renderUsageCreditsOnlyModelName(family)} is drawing from usage credits`,
              priority: "medium",
            });
          }
          return;
        }
        addNotification({
          kind: "warning",
          key: "fable-usage-credits",
          text: `${renderUsageCreditsOnlyModelName(family)} is now using usage credits instead of your plan limits`,
          color: "error",
          priority: "immediate",
        });
      });
  },
};
//@ chunk-18hwfzwa.js:1779933-1780037 placement
function billingContextForRateLimit() {
  let subscriptionType = getSubscriptionType();
  return {
    hasBillingAccess: isConsumerPlan(),
    isTeamOrEnterprise: subscriptionType === "team" || subscriptionType === "enterprise",
  };
}
export {
  promoCreditCheckSpec,
  projectTelemetryEnvNoticeSpec,
  projectChromeEnvNoticeSpec,
  projectSignInEnvNoticeSpec,
  fableUsageCreditsNoticeSpec,
  proTrialExpiredAutoOpenNoticeSpec,
  promptQueueUseCountNoticeSpec,
  billingContextForRateLimit,
};
