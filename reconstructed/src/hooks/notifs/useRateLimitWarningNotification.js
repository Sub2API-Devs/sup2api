/**
 * hooks/notifs/useRateLimitWarningNotification.tsx
 *
 * 用量接近/达到上限、开始使用超额额度的通知（tengu_cosmic_lake）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useRateLimitWarningNotification.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { billingContextForRateLimit } from "./specs/projectEnvNotices.js";
import {
  getUsingOverageText,
  getRateLimitWarning,
  getProRunwayTip,
  getModelSwitchUpsell,
} from "../../services/rateLimitMessages.js";
import { hasSurpassedThreshold } from "../../services/claudeAiLimits.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-18hwfzwa.js:1780037-1781197 fingerprint = useRateLimitWarningNotification (0.415)
/**
 * 启动通知规格：开始使用超额额度时提示一次（limit-reached）；接近或达到限额时显示警告并附 Pro 续航建议或换模型建议（rate-limit-warning，5 小时窗口警告受 tengu_cosmic_lake 抑制）。
 */
var LIMIT_REACHED_NOTICE_SPEC = {
  id: "limit-reached",
  deps: (noticeState) => {
    let { hasBillingAccess, isTeamOrEnterprise } = billingContextForRateLimit();
    return [
      noticeState.claudeAiLimits.isUsingOverage,
      noticeState.claudeAiLimits,
      noticeState.mainLoopModel,
      noticeState.addNotification,
      hasBillingAccess,
      isTeamOrEnterprise,
    ];
  },
  setup() {
    let hasNotified = false;
    return ({ addNotification, claudeAiLimits, mainLoopModel }) => {
      let { hasBillingAccess, isTeamOrEnterprise } = billingContextForRateLimit();
      if (claudeAiLimits.isUsingOverage && !hasNotified && (!isTeamOrEnterprise || hasBillingAccess)) {
        addNotification({
          key: "limit-reached",
          text: getUsingOverageText(claudeAiLimits, mainLoopModel),
          priority: "immediate",
        });
        hasNotified = true;
      } else if (!claudeAiLimits.isUsingOverage && hasNotified) hasNotified = false;
    };
  },
};
var TENGU_COSMIC_LAKE = "tengu_cosmic_lake";
var RATE_LIMIT_WARNING_NOTICE_SPEC = {
  id: "rate-limit-warning",
  deps: (noticeState) => [
    noticeState.claudeAiLimits,
    noticeState.mainLoopModel,
    noticeState.effortValue,
    noticeState.addNotification,
    hasSurpassedThreshold("overage"),
  ],
  setup() {
    let lastWarning = null;
    return ({ addNotification, claudeAiLimits, mainLoopModel, effortValue }) => {
      if (claudeAiLimits.rateLimitGraceActive) return;
      let rateLimitWarning = getRateLimitWarning(
        claudeAiLimits,
        mainLoopModel,
        hasSurpassedThreshold("overage"),
      );
      if (!rateLimitWarning || rateLimitWarning === lastWarning) return;
      if (
        claudeAiLimits.status === "allowed_warning" &&
        claudeAiLimits.rateLimitType === "five_hour" &&
        getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COSMIC_LAKE, false)
      )
        return;
      lastWarning = rateLimitWarning;
      let proRunwayTip = getProRunwayTip(claudeAiLimits, mainLoopModel, effortValue);
      let modelSwitchUpsell =
        claudeAiLimits.rateLimitType === "overage" ? getModelSwitchUpsell(mainLoopModel) : null;
      addNotification({
        key: "rate-limit-warning",
        segments: [
          {
            text: rateLimitWarning,
            color: "warning",
          },
          ...(proRunwayTip
            ? [
                {
                  text: ` \xB7 ${proRunwayTip.text}`,
                  dim: true,
                },
              ]
            : []),
          ...(modelSwitchUpsell
            ? [
                {
                  text: ` \xB7 ${modelSwitchUpsell}`,
                  dim: true,
                },
              ]
            : []),
        ],
        priority: "high",
      });
      if (proRunwayTip)
        logEvent("tengu_rate_limit_lever_hint", {
          lever: fromEnum(proRunwayTip.lever),
        });
    };
  },
};
export { LIMIT_REACHED_NOTICE_SPEC, RATE_LIMIT_WARNING_NOTICE_SPEC };
