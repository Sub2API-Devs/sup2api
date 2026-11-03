/**
 * components/UsageLimitGraceNotice.tsx
 *
 * 2.1.316 新增。用量上限宽限期提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: placement 10
 */
import { useCanUseTool } from "../hooks/useCanUseTool.js";
import { init_react_production, Se, Uy, P, R } from "../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string } from "../../vendor/zod/v4/classic/schemas.js";
import { cleanTaskDescription } from "../utils/taskDescription.js";
import { truncateToWidth, formatResetTimeWithLocale } from "../utils/format.js";
import { HTTPS_CLAU_DE_WRAP_UP } from "../services/api/usage.js";
import { nullVerificationState } from "../services/api/verificationRequired.js";
import { getWrapUpZone } from "../services/claudeAiLimits.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { useRateLimitState, scheduleAtTimestamp } from "./rateLimit/quotaAutoResume.js";
import { useForceRender } from "../hooks/useForceRender.js";
import { clockContext, defaultSetTimeout } from "../ink/components/ClockContext.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getWarningUpsellText } from "../services/rateLimitMessages.js";

//@ chunk-18hwfzwa.js:1652841-1652853 placement
var useCanUseToolReexport = useCanUseTool;
//@ chunk-18hwfzwa.js:1652853-1652857 placement
init_react_production();
//@ chunk-18hwfzwa.js:1652857-1652861 placement
init_react_production();
//@ chunk-18hwfzwa.js:1652861-1653322 placement
var TENGU_LANTERN_SCONCE_COPY = "tengu_lantern_sconce_copy";
var DEFAULT_GRACE_NOTICE_COPY = {
  running: "Usage limit reached \xB7 wrapping up",
  stopped: "Usage limit reached",
  credits_on: "Usage limit reached \xB7 brief included wrap-up, then usage credits",
};
var MAX_NOTICE_TEXT_WIDTH = 100;
var GraceNoticeCopySchema = DoctorLazy(() =>
  u({
    running: string().optional().catch(undefined),
    stopped: string().optional().catch(undefined),
    credits_on: string().optional().catch(undefined),
    upsell: string().optional().catch(undefined),
    help_url: string().optional().catch(undefined),
    help_url_credits_on: string().optional().catch(undefined),
  }),
);
//@ chunk-18hwfzwa.js:1653322-1653387 placement
function graceNoticeText(h, x) {
  let D = cleanTaskDescription(x);
  return D === undefined ? DEFAULT_GRACE_NOTICE_COPY[h] : truncateToWidth(D, MAX_NOTICE_TEXT_WIDTH);
}
//@ chunk-18hwfzwa.js:1653387-1653707 placement
/**
 * 解析服务端下发的用量宽限提示文案，缺失字段用默认文案补齐，并规范帮助链接。
 */
function parseGraceNoticeCopy(featureValue_CACHED_MAY_BE_STALE) {
  let x = GraceNoticeCopySchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  let D = x.success ? x.data : {};
  let L = getCurrentRepoHttpsUrl(D.help_url) ?? HTTPS_CLAU_DE_WRAP_UP;
  return {
    running: graceNoticeText("running", D.running),
    stopped: graceNoticeText("stopped", D.stopped),
    credits_on: graceNoticeText("credits_on", D.credits_on),
    upsell:
      D.upsell === undefined
        ? undefined
        : truncateToWidth(cleanTaskDescription(D.upsell) ?? "", MAX_NOTICE_TEXT_WIDTH),
    help_url: L,
    help_url_credits_on: getCurrentRepoHttpsUrl(D.help_url_credits_on) ?? L,
  };
}
//@ chunk-18hwfzwa.js:1653707-1653810 placement = getCurrentRepoHttpsUrl (0.803)
function getCurrentRepoHttpsUrl(h) {
  let parsed = cleanTaskDescription(h);
  if (parsed === undefined) return;
  return /^[a-z][a-z0-9+.-]*:/i.test(parsed) ? parsed : `https://${parsed}`;
}
//@ chunk-18hwfzwa.js:1653810-1654100 placement
/**
 * 确定当前用量上限宽限期窗口：有模拟状态时按传入限额类型构造模拟窗口，否则在 tengu_lantern_sconce 开启时取 getWrapUpZone()。
 */
function resolveGraceWindow(rateLimitState) {
  let x = nullVerificationState();
  if (x !== null)
    return {
      mock: x,
      graceWindow: {
        rateLimitType: rateLimitState.rateLimitType === "seven_day" ? "seven_day" : "five_hour",
        resetsAt: rateLimitState.resetsAt,
        extraUsageStatus: x === "covered" ? "allowed" : undefined,
      },
    };
  let wrapUpZone = getWrapUpZone();
  return {
    mock: x,
    graceWindow:
      wrapUpZone !== null && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_sconce", false)
        ? wrapUpZone
        : null,
  };
}
//@ chunk-18hwfzwa.js:1654100-1654164 placement
function linkLabelFromUrl(h) {
  return {
    url: h,
    text: h.replace(/^https?:\/\//, ""),
  };
}
//@ chunk-18hwfzwa.js:1654164-1655060 placement
function UsageLimitGraceNotice(isLoading) {
  let rateLimitState = useRateLimitState();
  useForceRender();
  let { mock, graceWindow } = resolveGraceWindow(rateLimitState);
  let ee = graceWindow !== null;
  let ke = graceWindow?.extraUsageStatus !== undefined;
  let Re = graceWindow?.resetsAt !== undefined ? graceWindow.resetsAt * 1000 : null;
  let Be = Se(clockContext)?.setTimeout ?? defaultSetTimeout;
  let [, He] = Uy((At) => At + 1, 0);
  P(() => (Re === null ? undefined : scheduleAtTimestamp(Re, Be, He)), [Re, Be]);
  P(() => {
    if (ee && mock === null) logFeatureOk("usage_limit_grace_notice");
  }, [ee, mock]);
  let We = R("none");
  if (!ee) We.current = "none";
  else if (ke) We.current = "covered";
  else if ((We.current === "none" || We.current === "covered") && isLoading) We.current = "finishing";
  else if (!isLoading) We.current = "waiting";
  let ze = mock ?? (ee ? We.current : "none");
  if (ze === "none" || graceWindow === null) return null;
  let graceNoticeCopy = parseGraceNoticeCopy(
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_SCONCE_COPY, null),
  );
  let rt = formatResetTimeWithLocale(graceWindow.resetsAt);
  let kt = ze === "covered" ? null : getWarningUpsellText(graceWindow.rateLimitType);
  return {
    running: ze === "finishing",
    lead:
      ze === "finishing"
        ? graceNoticeCopy.running
        : ze === "covered"
          ? graceNoticeCopy.credits_on
          : graceNoticeCopy.stopped,
    resets: rt ? ` \xB7 limit resets ${rt}` : "",
    link: linkLabelFromUrl(ze === "covered" ? graceNoticeCopy.help_url_credits_on : graceNoticeCopy.help_url),
    upsell: kt ? (graceNoticeCopy.upsell ?? kt) || null : null,
  };
}
export { useCanUseToolReexport, UsageLimitGraceNotice };
