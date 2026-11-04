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
import {
  init_react_production,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1652841-1652853 placement
var useCanUseToolReexport = useCanUseTool;
//@ chunk-18hwfzwa.js:1652853-1652857 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1652853", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1652857-1652861 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1652857", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1652861-1653322 placement
var TENGU_LANTERN_SCONCE_COPY; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_GRACE_NOTICE_COPY;
var MAX_NOTICE_TEXT_WIDTH;
var GraceNoticeCopySchema;
deferInit("chunk-18hwfzwa.js:1652861", () => {
  TENGU_LANTERN_SCONCE_COPY = "tengu_lantern_sconce_copy";
  DEFAULT_GRACE_NOTICE_COPY = {
    running: "Usage limit reached \xB7 wrapping up",
    stopped: "Usage limit reached",
    credits_on: "Usage limit reached \xB7 brief included wrap-up, then usage credits",
  };
  MAX_NOTICE_TEXT_WIDTH = 100;
  GraceNoticeCopySchema = DoctorLazy(() =>
    objectSchema({
      running: stringSchema().optional().catch(undefined),
      stopped: stringSchema().optional().catch(undefined),
      credits_on: stringSchema().optional().catch(undefined),
      upsell: stringSchema().optional().catch(undefined),
      help_url: stringSchema().optional().catch(undefined),
      help_url_credits_on: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-18hwfzwa.js:1653322-1653387 placement
function graceNoticeText(statusKey, featureCopy) {
  let cleanedCopy = cleanTaskDescription(featureCopy);
  return cleanedCopy === undefined
    ? DEFAULT_GRACE_NOTICE_COPY[statusKey]
    : truncateToWidth(cleanedCopy, MAX_NOTICE_TEXT_WIDTH);
}
//@ chunk-18hwfzwa.js:1653387-1653707 placement
/**
 * 解析服务端下发的用量宽限提示文案，缺失字段用默认文案补齐，并规范帮助链接。
 */
function parseGraceNoticeCopy(featureValue_CACHED_MAY_BE_STALE) {
  let parsed = GraceNoticeCopySchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  let data = parsed.success ? parsed.data : {};
  let helpUrl = getCurrentRepoHttpsUrl(data.help_url) ?? HTTPS_CLAU_DE_WRAP_UP;
  return {
    running: graceNoticeText("running", data.running),
    stopped: graceNoticeText("stopped", data.stopped),
    credits_on: graceNoticeText("credits_on", data.credits_on),
    upsell:
      data.upsell === undefined
        ? undefined
        : truncateToWidth(cleanTaskDescription(data.upsell) ?? "", MAX_NOTICE_TEXT_WIDTH),
    help_url: helpUrl,
    help_url_credits_on: getCurrentRepoHttpsUrl(data.help_url_credits_on) ?? helpUrl,
  };
}
//@ chunk-18hwfzwa.js:1653707-1653810 placement = getCurrentRepoHttpsUrl (0.803)
function getCurrentRepoHttpsUrl(rawUrl) {
  let parsed = cleanTaskDescription(rawUrl);
  if (parsed === undefined) return;
  return /^[a-z][a-z0-9+.-]*:/i.test(parsed) ? parsed : `https://${parsed}`;
}
//@ chunk-18hwfzwa.js:1653810-1654100 placement
/**
 * 确定当前用量上限宽限期窗口：有模拟状态时按传入限额类型构造模拟窗口，否则在 tengu_lantern_sconce 开启时取 getWrapUpZone()。
 */
function resolveGraceWindow(rateLimitState) {
  let mockState = nullVerificationState();
  if (mockState !== null)
    return {
      mock: mockState,
      graceWindow: {
        rateLimitType: rateLimitState.rateLimitType === "seven_day" ? "seven_day" : "five_hour",
        resetsAt: rateLimitState.resetsAt,
        extraUsageStatus: mockState === "covered" ? "allowed" : undefined,
      },
    };
  let wrapUpZone = getWrapUpZone();
  return {
    mock: mockState,
    graceWindow:
      wrapUpZone !== null && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_sconce", false)
        ? wrapUpZone
        : null,
  };
}
//@ chunk-18hwfzwa.js:1654100-1654164 placement
function linkLabelFromUrl(url) {
  return {
    url,
    text: url.replace(/^https?:\/\//, ""),
  };
}
//@ chunk-18hwfzwa.js:1654164-1655060 placement
function UsageLimitGraceNotice(isLoading) {
  let rateLimitState = useRateLimitState();
  useForceRender();
  let { mock, graceWindow } = resolveGraceWindow(rateLimitState);
  let hasGraceWindow = graceWindow !== null;
  let hasExtraUsageStatus = graceWindow?.extraUsageStatus !== undefined;
  let resetsAtMs = graceWindow?.resetsAt !== undefined ? graceWindow.resetsAt * 1000 : null;
  let setTimeoutFn = useContext(clockContext)?.setTimeout ?? defaultSetTimeout;
  let [, forceRender] = useReducer((counter) => counter + 1, 0);
  useEffect(
    () => (resetsAtMs === null ? undefined : scheduleAtTimestamp(resetsAtMs, setTimeoutFn, forceRender)),
    [resetsAtMs, setTimeoutFn],
  );
  useEffect(() => {
    if (hasGraceWindow && mock === null) logFeatureOk("usage_limit_grace_notice");
  }, [hasGraceWindow, mock]);
  let statusRef = useRef("none");
  if (!hasGraceWindow) statusRef.current = "none";
  else if (hasExtraUsageStatus) statusRef.current = "covered";
  else if ((statusRef.current === "none" || statusRef.current === "covered") && isLoading)
    statusRef.current = "finishing";
  else if (!isLoading) statusRef.current = "waiting";
  let status = mock ?? (hasGraceWindow ? statusRef.current : "none");
  if (status === "none" || graceWindow === null) return null;
  let graceNoticeCopy = parseGraceNoticeCopy(
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_SCONCE_COPY, null),
  );
  let resetText = formatResetTimeWithLocale(graceWindow.resetsAt);
  let upsellText = status === "covered" ? null : getWarningUpsellText(graceWindow.rateLimitType);
  return {
    running: status === "finishing",
    lead:
      status === "finishing"
        ? graceNoticeCopy.running
        : status === "covered"
          ? graceNoticeCopy.credits_on
          : graceNoticeCopy.stopped,
    resets: resetText ? ` \xB7 limit resets ${resetText}` : "",
    link: linkLabelFromUrl(
      status === "covered" ? graceNoticeCopy.help_url_credits_on : graceNoticeCopy.help_url,
    ),
    upsell: upsellText ? (graceNoticeCopy.upsell ?? upsellText) || null : null,
  };
}
export { useCanUseToolReexport, UsageLimitGraceNotice };
