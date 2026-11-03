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
import { j, Se, Uy, P, R } from "../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o } from "../../vendor/zod/v4/classic/schemas.js";
import { vc } from "../utils/taskDescription.js";
import { truncateToWidth, xk } from "../utils/format.js";
import { HTTPS_CLAU_DE_WRAP_UP } from "../services/api/usage.js";
import { kwi } from "../services/api/verificationRequired.js";
import { getWrapUpZone } from "../services/claudeAiLimits.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { useRateLimitState, scheduleAtTimestamp } from "./rateLimit/quotaAutoResume.js";
import { useForceRender } from "../hooks/useForceRender.js";
import { _T, $L } from "../ink/components/ClockContext.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getWarningUpsellText } from "../services/rateLimitMessages.js";

//@ chunk-18hwfzwa.js:1652841-1652853 placement
var HIe = useCanUseTool;
//@ chunk-18hwfzwa.js:1652853-1652857 placement
j();
//@ chunk-18hwfzwa.js:1652857-1652861 placement
j();
//@ chunk-18hwfzwa.js:1652861-1653322 placement
var TENGU_LANTERN_SCONCE_COPY = "tengu_lantern_sconce_copy",
  t1o = {
    running: "Usage limit reached \xB7 wrapping up",
    stopped: "Usage limit reached",
    credits_on: "Usage limit reached \xB7 brief included wrap-up, then usage credits",
  },
  Hvt = 100,
  o1o = DoctorLazy(() =>
    u({
      running: o()
        .optional()
        .catch(void 0),
      stopped: o()
        .optional()
        .catch(void 0),
      credits_on: o()
        .optional()
        .catch(void 0),
      upsell: o()
        .optional()
        .catch(void 0),
      help_url: o()
        .optional()
        .catch(void 0),
      help_url_credits_on: o()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-18hwfzwa.js:1653322-1653387 placement
function UIe(h, x) {
  let D = vc(x);
  return D === void 0 ? t1o[h] : truncateToWidth(D, Hvt);
}
/**
 * 解析服务端下发的用量宽限提示文案，缺失字段用默认文案补齐，并规范帮助链接。
 */
//@ chunk-18hwfzwa.js:1653387-1653707 placement
function parseGraceNoticeCopy(h) {
  let safeParse = o1o().safeParse(h),
    D = safeParse.success ? safeParse.data : {},
    L = getCurrentRepoHttpsUrl(D.help_url) ?? HTTPS_CLAU_DE_WRAP_UP;
  return {
    running: UIe("running", D.running),
    stopped: UIe("stopped", D.stopped),
    credits_on: UIe("credits_on", D.credits_on),
    upsell: D.upsell === void 0 ? void 0 : truncateToWidth(vc(D.upsell) ?? "", Hvt),
    help_url: L,
    help_url_credits_on: getCurrentRepoHttpsUrl(D.help_url_credits_on) ?? L,
  };
}
//@ chunk-18hwfzwa.js:1653707-1653810 placement = getCurrentRepoHttpsUrl (0.803)
function getCurrentRepoHttpsUrl(h) {
  let parsed = vc(h);
  if (parsed === void 0) return;
  return /^[a-z][a-z0-9+.-]*:/i.test(parsed) ? parsed : `https://${parsed}`;
}
/**
 * 确定当前用量上限宽限期窗口：有模拟状态时按传入限额类型构造模拟窗口，否则在 tengu_lantern_sconce 开启时取 getWrapUpZone()。
 */
//@ chunk-18hwfzwa.js:1653810-1654100 placement
function resolveGraceWindow(h) {
  let x = kwi();
  if (x !== null)
    return {
      mock: x,
      graceWindow: {
        rateLimitType: h.rateLimitType === "seven_day" ? "seven_day" : "five_hour",
        resetsAt: h.resetsAt,
        extraUsageStatus: x === "covered" ? "allowed" : void 0,
      },
    };
  let D = getWrapUpZone();
  return {
    mock: x,
    graceWindow: D !== null && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_sconce", !1) ? D : null,
  };
}
//@ chunk-18hwfzwa.js:1654100-1654164 placement
function s1o(h) {
  return { url: h, text: h.replace(/^https?:\/\//, "") };
}
//@ chunk-18hwfzwa.js:1654164-1655060 placement
function UsageLimitGraceNotice(h) {
  let x = useRateLimitState();
  useForceRender();
  let { mock: mock, graceWindow: graceWindow } = resolveGraceWindow(x),
    ee = graceWindow !== null,
    ke = graceWindow?.extraUsageStatus !== void 0,
    Re = graceWindow?.resetsAt !== void 0 ? graceWindow.resetsAt * 1000 : null,
    Be = Se(_T)?.setTimeout ?? $L,
    [, He] = Uy((At) => At + 1, 0);
  (P(() => (Re === null ? void 0 : scheduleAtTimestamp(Re, Be, He)), [Re, Be]),
    P(() => {
      if (ee && mock === null) logFeatureOk("usage_limit_grace_notice");
    }, [ee, mock]));
  let We = R("none");
  if (!ee) We.current = "none";
  else if (ke) We.current = "covered";
  else if ((We.current === "none" || We.current === "covered") && h) We.current = "finishing";
  else if (!h) We.current = "waiting";
  let ze = mock ?? (ee ? We.current : "none");
  if (ze === "none" || graceWindow === null) return null;
  let Xe = parseGraceNoticeCopy(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_SCONCE_COPY, null)),
    rt = xk(graceWindow.resetsAt),
    kt = ze === "covered" ? null : getWarningUpsellText(graceWindow.rateLimitType);
  return {
    running: ze === "finishing",
    lead: ze === "finishing" ? Xe.running : ze === "covered" ? Xe.credits_on : Xe.stopped,
    resets: rt ? ` \xB7 limit resets ${rt}` : "",
    link: s1o(ze === "covered" ? Xe.help_url_credits_on : Xe.help_url),
    upsell: kt ? (Xe.upsell ?? kt) || null : null,
  };
}

export { HIe, UsageLimitGraceNotice };
