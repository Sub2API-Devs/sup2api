/**
 * components/LogoV2/ApiCreditLinkNotice.tsx
 *
 * 2.1.316 新增：API 额度链接提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (11)
 * attribution: placement 11
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { shouldCheckForPasses } from "../../services/api/referral.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { claimNoticeImpression, at } from "./CondensedLogo.js";
import { logEvent } from "../../services/analytics/index.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MarkdownText_2, MARKDOWN_LINK_SCHEMES } from "../pluginUi/render/MarkdownBlock.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ag5x7vhf.js:92617-92887 placement
var API_CREDIT_LINK_FLAG = "tengu_snug_storm",
  TENGU_RADIANT_FOX = "tengu_radiant_fox",
  API_CREDIT_LINK = "api-credit-link",
  Fm = 3,
  Vm = 86400000,
  vS = 7 * Vm,
  TS = 10,
  O0 = DoctorLazy(() =>
    u({
      text: o()
        .trim()
        .min(1)
        .max(240)
        .regex(/^[^\p{Cc}\p{Cf}]*$/u),
    }),
  ),
  B0 = DoctorLazy(() => u({ status: o() })),
  F0 = DoctorLazy(() => u({ eligibleSince: E().nullable(), nextAskAt: E(), asks: E() }));
/**
 * 读 API 额度链接提示的 GrowthBook 配置并校验，返回提示文字；未配置或校验失败返回 null。
 */
//@ chunk-ag5x7vhf.js:92887-93012 placement
function getApiCreditLinkText() {
  let m = getFeatureValue_CACHED_MAY_BE_STALE(API_CREDIT_LINK_FLAG, null);
  if (m === null || m === void 0) return null;
  let safeParse = O0().safeParse(m);
  return safeParse.success ? safeParse.data.text : null;
}
/**
 * 判断当前账号的 passes 资格是否在本进程启动之前就已具备。
 */
//@ chunk-ag5x7vhf.js:93012-93136 placement
function isPassesEligibleBeforeLaunch() {
  let m = shouldCheckForPasses(),
    h = m === void 0 ? void 0 : Bm(getGlobalConfig(), m)?.eligibleSince;
  return typeof h === "number" && h < performance.timeOrigin;
}
/**
 * 首次展示前打点 tengu_api_credit_link_notice_arm；会话固定开关 TENGU_RADIANT_FOX 打开时返回 false（不压制），否则 true。
 */
//@ chunk-ag5x7vhf.js:93136-93247 placement
function shouldSuppressApiCreditLinkNotice() {
  let m = getFeatureValue_SESSION_PINNED(TENGU_RADIANT_FOX, !1) === !0;
  if (claimNoticeImpression(`${API_CREDIT_LINK}-arm`))
    logEvent("tengu_api_credit_link_notice_arm", { shown: m });
  return !m;
}
//@ chunk-ag5x7vhf.js:93247-93402 placement
function recordApiCreditLinkShown(m) {
  (logEvent("tengu_api_credit_link_notice_shown", { impression: Hm(getGlobalConfig()) + 1 }),
    saveGlobalConfig(
      (h) => ({ ...h, seenNotifications: { ...h.seenNotifications, [API_CREDIT_LINK]: Hm(h) + 1 } }),
      m,
    ));
}
/**
 * 后台查询组织的 API 额度链接状态（/api/oauth/organizations/:orgUUID/…），缓存到全局配置并控制重问间隔。
 */
//@ chunk-ag5x7vhf.js:93402-94448 placement
async function refreshApiCreditLinkStatus(m, h) {
  let x = shouldCheckForPasses();
  if (x === void 0) return;
  let T = Bm(getGlobalConfig(), x);
  if (T !== void 0 && !V0(T, Date.now())) return;
  let k;
  try {
    k = await apiClient.get("/api/oauth/organizations/:orgUUID/quirky-lollipop/link-offer", {
      auth: "teleport-org",
      timeout: 1e4,
      isBackground: !0,
      maxRedirects: 0,
      validateStatus: () => !0,
      credentials: m,
      storageV5: h,
    });
  } catch (error) {
    logForDebugging(`API credit link check failed: ${errorMessage(error)}`, { level: "error" });
  }
  if (k?.ok === !1) {
    logFeatureSad("api_credit_link_status_fetch", "not_sent");
    return;
  }
  let _ = k?.status,
    safeParse = B0().safeParse(_ === 200 ? k?.data : void 0);
  if (safeParse.success) logFeatureOk("api_credit_link_status_fetch");
  else if (_ === void 0) logFeatureSad("api_credit_link_status_fetch", "request_failed");
  else logFeatureSad("api_credit_link_status_fetch", _ === 200 ? "malformed" : `http_${_}`);
  if (shouldCheckForPasses() !== x) return;
  let now = Date.now();
  await saveGlobalConfig((A) => {
    let L = Bm(A, x),
      V = L?.asks ?? 0;
    if (V >= TS) return A;
    let W = L?.eligibleSince ?? null;
    if (safeParse.success) {
      let K = W !== null && W <= now ? W : now;
      W = safeParse.data.status === "eligible" ? K : null;
    }
    let z = safeParse.success && W === null ? vS : Vm;
    return {
      ...A,
      apiCreditLinkStatusCache: {
        ...A.apiCreditLinkStatusCache,
        [x]: { eligibleSince: W, nextAskAt: now + z, asks: V + 1 },
      },
    };
  }, h);
}
//@ chunk-ag5x7vhf.js:94448-94515 placement
function V0({ nextAskAt: nextAskAt, asks: asks }, x) {
  return asks < TS && (x >= nextAskAt || nextAskAt - x > vS + Vm);
}
//@ chunk-ag5x7vhf.js:94708-94785 placement
function Bm(m, h) {
  return F0().safeParse(m.apiCreditLinkStatusCache?.[h]).data;
}
//@ chunk-ag5x7vhf.js:94785-94836 placement
function Hm(m) {
  return m.seenNotifications?.[API_CREDIT_LINK] ?? 0;
}
//@ chunk-ag5x7vhf.js:94836-95165 placement
function ApiCreditLinkNotice() {
  let h = w(5),
    { storageV5: storageV5 } = Me(),
    x;
  if (h[0] === MEMO_CACHE_SENTINEL) ((x = getApiCreditLinkText()), (h[0] = x));
  else x = h[0];
  let T = x,
    k;
  if (h[1] !== storageV5) ((k = () => recordApiCreditLinkShown(storageV5)), (h[1] = storageV5), (h[2] = k));
  else k = h[2];
  let _;
  if (h[3] === MEMO_CACHE_SENTINEL) ((_ = { enabled: T !== null }), (h[3] = _));
  else _ = h[3];
  at(API_CREDIT_LINK, k, _);
  let I;
  if (h[4] === MEMO_CACHE_SENTINEL)
    ((I =
      T === null
        ? null
        : e(MarkdownText_2, { stripPromptTags: !1, linkSchemes: MARKDOWN_LINK_SCHEMES, children: T })),
      (h[4] = I));
  else I = h[4];
  return I;
}
//@ chunk-ag5x7vhf.js:95165-95169 placement
j();

export {
  refreshApiCreditLinkStatus,
  API_CREDIT_LINK,
  Fm,
  getApiCreditLinkText,
  shouldSuppressApiCreditLinkNotice,
  isPassesEligibleBeforeLaunch,
  ApiCreditLinkNotice,
  Hm,
};
