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

/**
 * 启动通知规格：开始使用超额额度时提示一次（limit-reached）；接近或达到限额时显示警告并附 Pro 续航建议或换模型建议（rate-limit-warning，5 小时窗口警告受 tengu_cosmic_lake 抑制）。
 */
//@ chunk-18hwfzwa.js:1780037-1781197 fingerprint = useRateLimitWarningNotification (0.415)
var LIMIT_REACHED_NOTICE_SPEC = {
    id: "limit-reached",
    deps: (h) => {
      let { hasBillingAccess: hasBillingAccess, isTeamOrEnterprise: isTeamOrEnterprise } =
        billingContextForRateLimit();
      return [
        h.claudeAiLimits.isUsingOverage,
        h.claudeAiLimits,
        h.mainLoopModel,
        h.addNotification,
        hasBillingAccess,
        isTeamOrEnterprise,
      ];
    },
    setup() {
      let h = !1;
      return ({
        addNotification: addNotification,
        claudeAiLimits: claudeAiLimits,
        mainLoopModel: mainLoopModel,
      }) => {
        let { hasBillingAccess: hasBillingAccess, isTeamOrEnterprise: isTeamOrEnterprise } =
          billingContextForRateLimit();
        if (claudeAiLimits.isUsingOverage && !h && (!isTeamOrEnterprise || hasBillingAccess))
          (addNotification({
            key: "limit-reached",
            text: getUsingOverageText(claudeAiLimits, mainLoopModel),
            priority: "immediate",
          }),
            (h = !0));
        else if (!claudeAiLimits.isUsingOverage && h) h = !1;
      };
    },
  },
  TENGU_COSMIC_LAKE = "tengu_cosmic_lake",
  RATE_LIMIT_WARNING_NOTICE_SPEC = {
    id: "rate-limit-warning",
    deps: (h) => [
      h.claudeAiLimits,
      h.mainLoopModel,
      h.effortValue,
      h.addNotification,
      hasSurpassedThreshold("overage"),
    ],
    setup() {
      let h = null;
      return ({
        addNotification: addNotification,
        claudeAiLimits: claudeAiLimits,
        mainLoopModel: mainLoopModel,
        effortValue: effortValue,
      }) => {
        if (claudeAiLimits.rateLimitGraceActive) return;
        let ke = getRateLimitWarning(claudeAiLimits, mainLoopModel, hasSurpassedThreshold("overage"));
        if (!ke || ke === h) return;
        if (
          claudeAiLimits.status === "allowed_warning" &&
          claudeAiLimits.rateLimitType === "five_hour" &&
          getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COSMIC_LAKE, !1)
        )
          return;
        h = ke;
        let Re = getProRunwayTip(claudeAiLimits, mainLoopModel, effortValue),
          Be = claudeAiLimits.rateLimitType === "overage" ? getModelSwitchUpsell(mainLoopModel) : null;
        if (
          (addNotification({
            key: "rate-limit-warning",
            segments: [
              { text: ke, color: "warning" },
              ...(Re ? [{ text: ` \xB7 ${Re.text}`, dim: !0 }] : []),
              ...(Be ? [{ text: ` \xB7 ${Be}`, dim: !0 }] : []),
            ],
            priority: "high",
          }),
          Re)
        )
          logEvent("tengu_rate_limit_lever_hint", { lever: fromEnum(Re.lever) });
      };
    },
  };

export { LIMIT_REACHED_NOTICE_SPEC, RATE_LIMIT_WARNING_NOTICE_SPEC };
