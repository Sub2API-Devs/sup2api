/**
 * components/UsageLimitGraceNotice.tsx
 *
 * 2.1.316 新增。用量上限宽限期提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
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

//@ chunk-czq1j3j2.js:1689527-1689531 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1689527", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1689988-1689992 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1689988", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1698585-1699046 placement
var TENGU_LANTERN_SCONCE_COPY; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_GRACE_NOTICE_COPY;
var MAX_NOTICE_TEXT_WIDTH;
var GraceNoticeCopySchema;
deferInit("chunk-czq1j3j2.js:1698585", () => {
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
//@ chunk-czq1j3j2.js:1699046-1699111 placement
function graceNoticeText(statusKey, featureCopy) {
  let cleanedCopy = cleanTaskDescription(featureCopy);
  return cleanedCopy === undefined
    ? DEFAULT_GRACE_NOTICE_COPY[statusKey]
    : truncateToWidth(cleanedCopy, MAX_NOTICE_TEXT_WIDTH);
}
//@ chunk-czq1j3j2.js:1699111-1699431 placement
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
//@ chunk-czq1j3j2.js:1699431-1699534 placement (2.1.88 match: getCurrentRepoHttpsUrl, 0.805)
function getCurrentRepoHttpsUrl(rawUrl) {
  let parsed = cleanTaskDescription(rawUrl);
  if (parsed === undefined) return;
  return /^[a-z][a-z0-9+.-]*:/i.test(parsed) ? parsed : `https://${parsed}`;
}
//@ chunk-czq1j3j2.js:1699534-1699824 placement
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
//@ chunk-czq1j3j2.js:1699824-1699888 placement
function linkLabelFromUrl(url) {
  return {
    url,
    text: url.replace(/^https?:\/\//, ""),
  };
}
//@ chunk-czq1j3j2.js:1699888-1700784 placement
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
export { UsageLimitGraceNotice };
