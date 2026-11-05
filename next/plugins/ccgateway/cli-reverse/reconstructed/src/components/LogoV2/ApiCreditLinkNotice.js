/**
 * components/LogoV2/ApiCreditLinkNotice.tsx
 *
 * 2.1.316 新增：API 额度链接提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MarkdownText_2, MARKDOWN_LINK_SCHEMES } from "../pluginUi/render/MarkdownBlock.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:92357-92361 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:92357", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:96198-96468 placement
var API_CREDIT_LINK_FLAG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TENGU_RADIANT_FOX;
var API_CREDIT_LINK;
var API_CREDIT_MAX_ASKS;
var ONE_DAY_MS_CREDIT;
var API_CREDIT_REASK_WINDOW_MS;
var API_CREDIT_MAX_IMPRESSIONS;
var ApiCreditLinkTextSchema;
var ApiCreditLinkStatusSchema;
var ApiCreditLinkCacheSchema;
deferInit("chunk-hnxhr3bs.js:96198", () => {
  API_CREDIT_LINK_FLAG = "tengu_snug_storm";
  TENGU_RADIANT_FOX = "tengu_radiant_fox";
  API_CREDIT_LINK = "api-credit-link";
  API_CREDIT_MAX_ASKS = 3;
  ONE_DAY_MS_CREDIT = 86400000;
  API_CREDIT_REASK_WINDOW_MS = 7 * ONE_DAY_MS_CREDIT;
  API_CREDIT_MAX_IMPRESSIONS = 10;
  ApiCreditLinkTextSchema = DoctorLazy(() =>
    objectSchema({
      text: stringSchema()
        .trim()
        .min(1)
        .max(240)
        .regex(/^[^\p{Cc}\p{Cf}]*$/u),
    }),
  );
  ApiCreditLinkStatusSchema = DoctorLazy(() =>
    objectSchema({
      status: stringSchema(),
    }),
  );
  ApiCreditLinkCacheSchema = DoctorLazy(() =>
    objectSchema({
      eligibleSince: numberSchema().nullable(),
      nextAskAt: numberSchema(),
      asks: numberSchema(),
    }),
  );
});
//@ chunk-hnxhr3bs.js:96468-96593 placement
/**
 * 读 API 额度链接提示的 GrowthBook 配置并校验，返回提示文字；未配置或校验失败返回 null。
 */
function getApiCreditLinkText() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(API_CREDIT_LINK_FLAG, null);
  if (featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined)
    return null;
  let parsed = ApiCreditLinkTextSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  return parsed.success ? parsed.data.text : null;
}
//@ chunk-hnxhr3bs.js:96593-96717 placement
/**
 * 判断当前账号的 passes 资格是否在本进程启动之前就已具备。
 */
function isPassesEligibleBeforeLaunch() {
  let version = shouldCheckForPasses();
  let eligibleSince =
    version === undefined ? undefined : readApiCreditLinkCache(getGlobalConfig(), version)?.eligibleSince;
  return typeof eligibleSince === "number" && eligibleSince < performance.timeOrigin;
}
//@ chunk-hnxhr3bs.js:96717-96828 placement
/**
 * 首次展示前打点 tengu_api_credit_link_notice_arm；会话固定开关 TENGU_RADIANT_FOX 打开时返回 false（不压制），否则 true。
 */
function shouldSuppressApiCreditLinkNotice() {
  let enabled = getFeatureValue_SESSION_PINNED(TENGU_RADIANT_FOX, false) === true;
  if (claimNoticeImpression(`${API_CREDIT_LINK}-arm`))
    logEvent("tengu_api_credit_link_notice_arm", {
      shown: enabled,
    });
  return !enabled;
}
//@ chunk-hnxhr3bs.js:96828-96983 placement
function recordApiCreditLinkShown(storageV5) {
  logEvent("tengu_api_credit_link_notice_shown", {
    impression: apiCreditLinkImpressionCount(getGlobalConfig()) + 1,
  });
  saveGlobalConfig(
    (config) => ({
      ...config,
      seenNotifications: {
        ...config.seenNotifications,
        [API_CREDIT_LINK]: apiCreditLinkImpressionCount(config) + 1,
      },
    }),
    storageV5,
  );
}
//@ chunk-hnxhr3bs.js:96983-98029 placement
/**
 * 后台查询组织的 API 额度链接状态（/api/oauth/organizations/:orgUUID/…），缓存到全局配置并控制重问间隔。
 */
async function refreshApiCreditLinkStatus(credentials, storageV5) {
  let version = shouldCheckForPasses();
  if (version === undefined) return;
  let apiCreditLinkCache = readApiCreditLinkCache(getGlobalConfig(), version);
  if (apiCreditLinkCache !== undefined && !shouldAskApiCreditLink(apiCreditLinkCache, Date.now())) return;
  let response;
  try {
    response = await apiClient.get("/api/oauth/organizations/:orgUUID/quirky-lollipop/link-offer", {
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
  if (response?.ok === false) {
    logFeatureSad("api_credit_link_status_fetch", "not_sent");
    return;
  }
  let status = response?.status;
  let parsed = ApiCreditLinkStatusSchema().safeParse(status === 200 ? response?.data : undefined);
  if (parsed.success) logFeatureOk("api_credit_link_status_fetch");
  else if (status === undefined) logFeatureSad("api_credit_link_status_fetch", "request_failed");
  else logFeatureSad("api_credit_link_status_fetch", status === 200 ? "malformed" : `http_${status}`);
  if (shouldCheckForPasses() !== version) return;
  let now = Date.now();
  await saveGlobalConfig((config) => {
    let apiCreditLinkCache = readApiCreditLinkCache(config, version);
    let asks = apiCreditLinkCache?.asks ?? 0;
    if (asks >= API_CREDIT_MAX_IMPRESSIONS) return config;
    let eligibleSince = apiCreditLinkCache?.eligibleSince ?? null;
    if (parsed.success) {
      let nextEligibleSince = eligibleSince !== null && eligibleSince <= now ? eligibleSince : now;
      eligibleSince = parsed.data.status === "eligible" ? nextEligibleSince : null;
    }
    let reaskDelay =
      parsed.success && eligibleSince === null ? API_CREDIT_REASK_WINDOW_MS : ONE_DAY_MS_CREDIT;
    return {
      ...config,
      apiCreditLinkStatusCache: {
        ...config.apiCreditLinkStatusCache,
        [version]: {
          eligibleSince,
          nextAskAt: now + reaskDelay,
          asks: asks + 1,
        },
      },
    };
  }, storageV5);
}
//@ chunk-hnxhr3bs.js:98029-98096 placement
function shouldAskApiCreditLink({ nextAskAt, asks }, nowMs) {
  return (
    asks < API_CREDIT_MAX_IMPRESSIONS &&
    (nowMs >= nextAskAt || nextAskAt - nowMs > API_CREDIT_REASK_WINDOW_MS + ONE_DAY_MS_CREDIT)
  );
}
//@ chunk-hnxhr3bs.js:98289-98366 placement
function readApiCreditLinkCache(globalConfig, version) {
  return ApiCreditLinkCacheSchema().safeParse(globalConfig.apiCreditLinkStatusCache?.[version]).data;
}
//@ chunk-hnxhr3bs.js:98366-98417 placement
function apiCreditLinkImpressionCount(globalConfig) {
  return globalConfig.seenNotifications?.[API_CREDIT_LINK] ?? 0;
}
//@ chunk-hnxhr3bs.js:98417-98746 placement
function ApiCreditLinkNotice() {
  let $ = useMemoCache(5);
  let { storageV5 } = useTheme_2();
  let text;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    text = getApiCreditLinkText();
    $[0] = text;
  } else text = $[0];
  let text_2 = text;
  let onShown;
  if ($[1] !== storageV5) {
    onShown = () => recordApiCreditLinkShown(storageV5);
    $[1] = storageV5;
    $[2] = onShown;
  } else onShown = $[2];
  let options;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    options = {
      enabled: text_2 !== null,
    };
    $[3] = options;
  } else options = $[3];
  useNoticeImpression(API_CREDIT_LINK, onShown, options);
  let content;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    content =
      text_2 === null
        ? null
        : jsxProd_default(MarkdownText_2, {
            stripPromptTags: false,
            linkSchemes: MARKDOWN_LINK_SCHEMES,
            children: text_2,
          });
    $[4] = content;
  } else content = $[4];
  return content;
}
export {
  getApiCreditLinkText,
  apiCreditLinkImpressionCount,
  API_CREDIT_MAX_ASKS,
  refreshApiCreditLinkStatus,
  API_CREDIT_LINK,
  shouldSuppressApiCreditLinkNotice,
  isPassesEligibleBeforeLaunch,
  ApiCreditLinkNotice,
};
