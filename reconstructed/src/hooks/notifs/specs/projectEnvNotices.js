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
import { wt } from "../../../remote/remoteMode.js";
import { g5e } from "../../../utils/managedEnvSafety.js";
import {
  isClaudeInChromeWiredThisSession,
  shouldEnableClaudeInChrome,
} from "../../../utils/claudeInChrome/setup.js";
import { getChromeFlagOverride } from "../../../bootstrap/state.js";
import { isClaudeAISubscriber, getSubscriptionType } from "../../../utils/auth.js";
import { getEnabledSettingSources } from "../../../utils/settings/constants.js";
import {
  getSettingsForSource,
  projectSettingsAliasesUserSettings,
} from "../../../utils/settings/settings.js";
import { isDangerousEnvVar, Q_r } from "../../../utils/managedEnvConstants.js";
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
  lD,
  D2,
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
  deps: (h) => [h.queuedCommandCount, h.storageV5],
  setup() {
    let h = !1;
    return ({ queuedCommandCount: queuedCommandCount, storageV5: storageV5 }) => {
      if (queuedCommandCount < 1) {
        h = !1;
        return;
      }
      if (h) return;
      ((h = !0),
        saveGlobalConfig(
          (L) => ({ ...L, promptQueueUseCount: (L.promptQueueUseCount ?? 0) + 1 }),
          storageV5,
        ));
    };
  },
};
//@ chunk-18hwfzwa.js:1776271-1776424 placement
var proTrialExpiredAutoOpenNoticeSpec = {
  id: "pro-trial-expired-auto-open",
  setup() {
    return ({ submitPrompt: submitPrompt }) => {
      if (!isProTrialExpiredWithDisabledCredits()) return;
      submitPrompt("/pro-trial-expired", NOOP_HELPERS, { inputModeOverride: "prompt" });
    };
  },
};
//@ chunk-18hwfzwa.js:1776424-1776472 placement
var projectChromeEnvNoticeSpec = { id: "project-chrome-env", setup: () => projectChromeEnvNotice };
/**
 * 项目设置里设置了 CLAUDE_CODE_ENABLE_CFC 时提示：项目不能开启 Claude in Chrome，需用 /chrome 或 --chrome 自行开启。
 */
//@ chunk-18hwfzwa.js:1776472-1776826 placement
function projectChromeEnvNotice({ addNotification: addNotification }) {
  if (wt() || g5e() || isClaudeInChromeWiredThisSession() || !zKo() || !projectEnablesChrome()) return;
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
function zKo() {
  return getChromeFlagOverride() !== !1 && shouldEnableClaudeInChrome(!0) && isClaudeAISubscriber();
}
//@ chunk-18hwfzwa.js:1776874-1777161 placement
function projectEnablesChrome() {
  let h = getEnabledSettingSources(),
    at = h
      .flatMap((D) =>
        Object.entries(getSettingsForSource(D)?.env ?? {})
          .filter(([L]) => L.toUpperCase() === "CLAUDE_CODE_ENABLE_CFC")
          .map(([, L]) => ({ source: D, value: L })),
      )
      .at(-1);
  return (
    at !== void 0 &&
    isDangerousEnvVar(at.source) &&
    isEnvTruthy(at.value) &&
    !(at.source === "projectSettings" && h.includes("userSettings") && projectSettingsAliasesUserSettings())
  );
}
//@ chunk-18hwfzwa.js:1777161-1777210 placement
var projectSignInEnvNoticeSpec = { id: "project-sign-in-env", setup: () => projectSignInEnvNotice };
/**
 * 项目设置里设置了登录相关环境变量时提示它们被忽略（项目不能设定你的 claude.ai 登录）。
 */
//@ chunk-18hwfzwa.js:1777210-1777754 placement
function projectSignInEnvNotice({ addNotification: addNotification }) {
  if (wt()) return;
  let sources = getHooksSources(),
    first = sources[0];
  if (first === void 0) return;
  let files = new Set(sources.flatMap(({ files: files }) => files)),
    where = files.size === 1 ? [...files][0] : "this project's settings files",
    moreCount = sources.length - 1,
    summary =
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
//@ chunk-18hwfzwa.js:1777754-1778113 placement = getHooksSources (0.871)
function getHooksSources() {
  let filtered = getEnabledSettingSources().filter(
    (x) =>
      isDangerousEnvVar(x) &&
      !(
        x === "projectSettings" &&
        getEnabledSettingSources().includes("userSettings") &&
        projectSettingsAliasesUserSettings()
      ),
  );
  return Q_r.flatMap((x) => {
    if (env[x]) return [];
    let mapped = filtered
      .filter((L) => Object.keys(getSettingsForSource(L)?.env ?? {}).some((ee) => ee.toUpperCase() === x))
      .map((L) => (L === "localSettings" ? ".claude/settings.local.json" : ".claude/settings.json"));
    return mapped.length > 0 ? [{ name: x, files: mapped }] : [];
  });
}
//@ chunk-18hwfzwa.js:1778113-1778164 placement
var projectTelemetryEnvNoticeSpec = { id: "project-telemetry-env", setup: () => projectTelemetryEnvNotice };
/**
 * 项目设置里设置了遥测相关环境变量时提示，可用 /status 查看哪些被忽略、哪些关闭了遥测。
 */
//@ chunk-18hwfzwa.js:1778164-1778531 placement
function projectTelemetryEnvNotice({ addNotification: addNotification }) {
  if (wt()) return;
  let { ignored: ignored, turnedOff: turnedOff } = formatIgnoredTelemetryEnvNotice();
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
/**
 * 启动通知"promo-credit-check"：随机延迟后、每个登录每天最多一次，查询用量接口中的促销额度窗口并把结果写入全局配置 promoCreditCheck。
 */
//@ chunk-18hwfzwa.js:1778531-1779429 placement
var PROMO_CHECK_INTERVAL_MS = 86400000,
  PROMO_CHECK_MIN_DELAY_MS = 5000,
  PROMO_CHECK_JITTER_MS = 25000,
  promoCreditCheckSpec = {
    id: "promo-credit-check",
    setup() {
      let h = !1;
      return ({ session: session, storageV5: storageV5, credentials: credentials, clock: clock }) => {
        if (h) return;
        h = !0;
        let ke = PROMO_CHECK_MIN_DELAY_MS + Math.floor(Math.random() * PROMO_CHECK_JITTER_MS);
        return clock.setTimeout(() => {
          if (
            !isPromoCreditNoticeEligible(session) ||
            isEssentialTrafficOnly() ||
            !isPolicyAllowed_2(ALLOW_PROMO_OFFERS)
          )
            return;
          let Re = getPromoLoginKey(),
            promoCreditCheck = getGlobalConfig().promoCreditCheck,
            now = Date.now(),
            We = promoCreditCheck?.login === Re ? now - promoCreditCheck.askedAtMs : -1;
          if (Re === null || (We >= 0 && We < PROMO_CHECK_INTERVAL_MS)) return;
          (saveGlobalConfig(
            (ze) => ({
              ...ze,
              promoCreditCheck: {
                login: Re,
                askedAtMs: now,
                answer: ze.promoCreditCheck?.login === Re ? ze.promoCreditCheck.answer : void 0,
              },
            }),
            storageV5,
          ),
            fetchUsageWithModelScopes(storageV5, credentials)
              .then((ze) => {
                if (ze.status !== "ok") {
                  logFeatureSad("promo_credit_check", "usage_unavailable");
                  return;
                }
                if (
                  (logFeatureOk("promo_credit_check"),
                  getPromoLoginKey() !== Re || !isPolicyAllowed_2(ALLOW_PROMO_OFFERS))
                )
                  return;
                let wattle_ember = ze.utilization.wattle_ember,
                  rt = {
                    atMs: Date.now(),
                    open: hasRemainingPromoCredit(wattle_ember, Date.now()),
                    endsAt: wattle_ember?.resets_at ?? null,
                  };
                saveGlobalConfig(
                  (kt) =>
                    kt.promoCreditCheck?.login === Re
                      ? { ...kt, promoCreditCheck: { ...kt.promoCreditCheck, answer: rt } }
                      : kt,
                  storageV5,
                );
              })
              .catch(logError));
        }, ke);
      };
    },
  };
//@ chunk-18hwfzwa.js:1779429-1779933 placement
var fableUsageCreditsNoticeSpec = {
  id: "fable-usage-credits",
  deps: (h) => [h.addNotification],
  setup() {
    let h = !1;
    return ({ addNotification: addNotification }) =>
      onOverageInUse((D, L, ee) => {
        let ke = usageCreditsOnlyFamily(D);
        if (ke === void 0) return;
        if (L || ee) return;
        if (lD()) return;
        if (D2()) return;
        if (hasUsageCreditsConsent(ke)) {
          if (!h)
            ((h = !0),
              addNotification({
                kind: "contextual",
                key: "fable-credits-info",
                text: `${renderUsageCreditsOnlyModelName(D)} is drawing from usage credits`,
                priority: "medium",
              }));
          return;
        }
        addNotification({
          kind: "warning",
          key: "fable-usage-credits",
          text: `${renderUsageCreditsOnlyModelName(D)} is now using usage credits instead of your plan limits`,
          color: "error",
          priority: "immediate",
        });
      });
  },
};
//@ chunk-18hwfzwa.js:1779933-1780037 placement
function billingContextForRateLimit() {
  let h = getSubscriptionType();
  return { hasBillingAccess: isConsumerPlan(), isTeamOrEnterprise: h === "team" || h === "enterprise" };
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
