/**
 * hooks/notifs/specs/projectEnvNotices.ts
 *
 * 2.1.316 新增。启动通知：项目环境类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  isPromoCreditNoticeDue,
  getPromoLoginKey,
  promoOfferEndsAt,
  hasRemainingPromoCredit,
  normalizeApproachingPercent,
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

//@ chunk-czq1j3j2.js:1823281-1823534 placement
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
//@ chunk-czq1j3j2.js:1823534-1823687 placement
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
//@ chunk-czq1j3j2.js:1823687-1823735 placement
var projectChromeEnvNoticeSpec = {
  id: "project-chrome-env",
  setup: () => projectChromeEnvNotice,
};
//@ chunk-czq1j3j2.js:1823735-1824089 placement
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
//@ chunk-czq1j3j2.js:1824089-1824137 placement
function shouldEnableClaudeInChrome() {
  return getChromeFlagOverride() !== false && shouldEnableClaudeInChrome_2(true) && isClaudeAISubscriber();
}
//@ chunk-czq1j3j2.js:1824137-1824424 placement
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
//@ chunk-czq1j3j2.js:1824424-1824473 placement
var projectSignInEnvNoticeSpec = {
  id: "project-sign-in-env",
  setup: () => projectSignInEnvNotice,
};
//@ chunk-czq1j3j2.js:1824473-1825017 placement
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
//@ chunk-czq1j3j2.js:1825017-1825376 placement (2.1.88 match: getHooksSources, 0.871)
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
//@ chunk-czq1j3j2.js:1825376-1825427 placement
var projectTelemetryEnvNoticeSpec = {
  id: "project-telemetry-env",
  setup: () => projectTelemetryEnvNotice,
};
//@ chunk-czq1j3j2.js:1825427-1825794 placement
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
//@ chunk-czq1j3j2.js:1825794-1827306 placement
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
          !isPromoCreditNoticeDue(session) ||
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
            promoCreditCheck:
              prev.promoCreditCheck?.login === promoLoginKey
                ? {
                    ...prev.promoCreditCheck,
                    askedAtMs: now,
                  }
                : {
                    login: promoLoginKey,
                    askedAtMs: now,
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
            let wattleEmber = usageWithModelScopes.utilization.wattle_ember;
            logFeatureOk("promo_credit_check", {
              credit: wattleEmber != null,
              used_up: wattleEmber?.used_up_notice === true,
              approaching: wattleEmber?.approaching_notice === true,
            });
            if (getPromoLoginKey() !== promoLoginKey || !isPolicyAllowed_2(ALLOW_PROMO_OFFERS)) return;
            let now = Date.now();
            saveGlobalConfig((config) => {
              let promoCreditCheck = config.promoCreditCheck;
              if (promoCreditCheck?.login !== promoLoginKey) return config;
              let offerEndsAt = wattleEmber
                ? ([
                    wattleEmber.offer_ends_at,
                    Array.isArray(wattleEmber.periods) ? wattleEmber.periods.at(-1)?.ends_at : undefined,
                    wattleEmber.resets_at,
                  ].find(
                    (candidate) => typeof candidate === "string" && !Number.isNaN(Date.parse(candidate)),
                  ) ?? null)
                : promoCreditCheck.answer
                  ? promoOfferEndsAt(promoCreditCheck.answer)
                  : null;
              let answer = {
                atMs: now,
                open: hasRemainingPromoCredit(wattleEmber, now),
                endsAt: wattleEmber?.resets_at ?? null,
                usedUpNotice: wattleEmber?.used_up_notice === true,
                approachingNotice: wattleEmber?.approaching_notice === true,
                approachingPercent: normalizeApproachingPercent(wattleEmber?.approaching_percent),
                lastPeriod: wattleEmber?.last_period === true,
                offerEndsAt,
                label: typeof wattleEmber?.label === "string" ? wattleEmber.label : null,
                coveredModels:
                  typeof wattleEmber?.covered_models_label === "string"
                    ? wattleEmber.covered_models_label
                    : null,
              };
              return {
                ...config,
                promoCreditCheck: {
                  ...promoCreditCheck,
                  answer,
                },
              };
            }, storageV5);
          })
          .catch(logError);
      }, delayMs);
    };
  },
};
//@ chunk-czq1j3j2.js:1827306-1827810 placement
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
//@ chunk-czq1j3j2.js:1827810-1827914 placement
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
