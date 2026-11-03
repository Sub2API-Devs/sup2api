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
import { u, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { shouldCheckForPasses } from "../../services/api/referral.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { claimNoticeImpression, useNoticeImpression } from "./CondensedLogo.js";
import { logEvent } from "../../services/analytics/index.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MarkdownText_2, MARKDOWN_LINK_SCHEMES } from "../pluginUi/render/MarkdownBlock.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ag5x7vhf.js:92617-92887 placement
var API_CREDIT_LINK_FLAG = "tengu_snug_storm";
var TENGU_RADIANT_FOX = "tengu_radiant_fox";
var API_CREDIT_LINK = "api-credit-link";
var API_CREDIT_MAX_ASKS = 3;
var ONE_DAY_MS_CREDIT = 86400000;
var API_CREDIT_REASK_WINDOW_MS = 7 * ONE_DAY_MS_CREDIT;
var API_CREDIT_MAX_IMPRESSIONS = 10;
var ApiCreditLinkTextSchema = DoctorLazy(() =>
  u({
    text: string()
      .trim()
      .min(1)
      .max(240)
      .regex(/^[^\p{Cc}\p{Cf}]*$/u),
  }),
);
var ApiCreditLinkStatusSchema = DoctorLazy(() =>
  u({
    status: string(),
  }),
);
var ApiCreditLinkCacheSchema = DoctorLazy(() =>
  u({
    eligibleSince: E().nullable(),
    nextAskAt: E(),
    asks: E(),
  }),
);
//@ chunk-ag5x7vhf.js:92887-93012 placement
/**
 * 读 API 额度链接提示的 GrowthBook 配置并校验，返回提示文字；未配置或校验失败返回 null。
 */
function getApiCreditLinkText() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(API_CREDIT_LINK_FLAG, null);
  if (featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined)
    return null;
  let h = ApiCreditLinkTextSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  return h.success ? h.data.text : null;
}
//@ chunk-ag5x7vhf.js:93012-93136 placement
/**
 * 判断当前账号的 passes 资格是否在本进程启动之前就已具备。
 */
function isPassesEligibleBeforeLaunch() {
  let m = shouldCheckForPasses();
  let eligibleSince =
    m === undefined ? undefined : readApiCreditLinkCache(getGlobalConfig(), m)?.eligibleSince;
  return typeof eligibleSince === "number" && eligibleSince < performance.timeOrigin;
}
//@ chunk-ag5x7vhf.js:93136-93247 placement
/**
 * 首次展示前打点 tengu_api_credit_link_notice_arm；会话固定开关 TENGU_RADIANT_FOX 打开时返回 false（不压制），否则 true。
 */
function shouldSuppressApiCreditLinkNotice() {
  let m = getFeatureValue_SESSION_PINNED(TENGU_RADIANT_FOX, false) === true;
  if (claimNoticeImpression(`${API_CREDIT_LINK}-arm`))
    logEvent("tengu_api_credit_link_notice_arm", {
      shown: m,
    });
  return !m;
}
//@ chunk-ag5x7vhf.js:93247-93402 placement
function recordApiCreditLinkShown(storageV5) {
  logEvent("tengu_api_credit_link_notice_shown", {
    impression: apiCreditLinkImpressionCount(getGlobalConfig()) + 1,
  });
  saveGlobalConfig(
    (h) => ({
      ...h,
      seenNotifications: {
        ...h.seenNotifications,
        [API_CREDIT_LINK]: apiCreditLinkImpressionCount(h) + 1,
      },
    }),
    storageV5,
  );
}
//@ chunk-ag5x7vhf.js:93402-94448 placement
/**
 * 后台查询组织的 API 额度链接状态（/api/oauth/organizations/:orgUUID/…），缓存到全局配置并控制重问间隔。
 */
async function refreshApiCreditLinkStatus(credentials, storageV5) {
  let x = shouldCheckForPasses();
  if (x === undefined) return;
  let apiCreditLinkCache = readApiCreditLinkCache(getGlobalConfig(), x);
  if (apiCreditLinkCache !== undefined && !shouldAskApiCreditLink(apiCreditLinkCache, Date.now())) return;
  let k;
  try {
    k = await apiClient.get("/api/oauth/organizations/:orgUUID/quirky-lollipop/link-offer", {
      auth: "teleport-org",
      timeout: 1e4,
      isBackground: true,
      maxRedirects: 0,
      validateStatus: () => true,
      credentials,
      storageV5,
    });
  } catch (error) {
    logForDebugging(`API credit link check failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  if (k?.ok === false) {
    logFeatureSad("api_credit_link_status_fetch", "not_sent");
    return;
  }
  let status = k?.status;
  let I = ApiCreditLinkStatusSchema().safeParse(status === 200 ? k?.data : undefined);
  if (I.success) logFeatureOk("api_credit_link_status_fetch");
  else if (status === undefined) logFeatureSad("api_credit_link_status_fetch", "request_failed");
  else logFeatureSad("api_credit_link_status_fetch", status === 200 ? "malformed" : `http_${status}`);
  if (shouldCheckForPasses() !== x) return;
  let now = Date.now();
  await saveGlobalConfig((A) => {
    let apiCreditLinkCache = readApiCreditLinkCache(A, x);
    let asks = apiCreditLinkCache?.asks ?? 0;
    if (asks >= API_CREDIT_MAX_IMPRESSIONS) return A;
    let eligibleSince = apiCreditLinkCache?.eligibleSince ?? null;
    if (I.success) {
      let K = eligibleSince !== null && eligibleSince <= now ? eligibleSince : now;
      eligibleSince = I.data.status === "eligible" ? K : null;
    }
    let z = I.success && eligibleSince === null ? API_CREDIT_REASK_WINDOW_MS : ONE_DAY_MS_CREDIT;
    return {
      ...A,
      apiCreditLinkStatusCache: {
        ...A.apiCreditLinkStatusCache,
        [x]: {
          eligibleSince,
          nextAskAt: now + z,
          asks: asks + 1,
        },
      },
    };
  }, storageV5);
}
//@ chunk-ag5x7vhf.js:94448-94515 placement
function shouldAskApiCreditLink({ nextAskAt, asks }, x) {
  return (
    asks < API_CREDIT_MAX_IMPRESSIONS &&
    (x >= nextAskAt || nextAskAt - x > API_CREDIT_REASK_WINDOW_MS + ONE_DAY_MS_CREDIT)
  );
}
//@ chunk-ag5x7vhf.js:94708-94785 placement
function readApiCreditLinkCache(globalConfig, h) {
  return ApiCreditLinkCacheSchema().safeParse(globalConfig.apiCreditLinkStatusCache?.[h]).data;
}
//@ chunk-ag5x7vhf.js:94785-94836 placement
function apiCreditLinkImpressionCount(globalConfig) {
  return globalConfig.seenNotifications?.[API_CREDIT_LINK] ?? 0;
}
//@ chunk-ag5x7vhf.js:94836-95165 placement
function ApiCreditLinkNotice() {
  let h = w(5);
  let { storageV5 } = useTheme_2();
  let x;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    x = getApiCreditLinkText();
    h[0] = x;
  } else x = h[0];
  let T = x;
  let k;
  if (h[1] !== storageV5) {
    k = () => recordApiCreditLinkShown(storageV5);
    h[1] = storageV5;
    h[2] = k;
  } else k = h[2];
  let _;
  if (h[3] === MEMO_CACHE_SENTINEL) {
    _ = {
      enabled: T !== null,
    };
    h[3] = _;
  } else _ = h[3];
  useNoticeImpression(API_CREDIT_LINK, k, _);
  let I;
  if (h[4] === MEMO_CACHE_SENTINEL) {
    I =
      T === null
        ? null
        : jsxProd_default(MarkdownText_2, {
            stripPromptTags: false,
            linkSchemes: MARKDOWN_LINK_SCHEMES,
            children: T,
          });
    h[4] = I;
  } else I = h[4];
  return I;
}
//@ chunk-ag5x7vhf.js:95165-95169 placement
init_react_production();
export {
  refreshApiCreditLinkStatus,
  API_CREDIT_LINK,
  API_CREDIT_MAX_ASKS,
  getApiCreditLinkText,
  shouldSuppressApiCreditLinkNotice,
  isPassesEligibleBeforeLaunch,
  ApiCreditLinkNotice,
  apiCreditLinkImpressionCount,
};
