/**
 * utils/permissions/serverClassifier/flags.ts
 *
 * 2.1.316 新增：服务端分类器开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1), chunk-nt9amew5.js (37)
 * attribution: placement 38
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSessionFeatureValues } from "../../../bootstrap/sessionFeatureValues.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { TENGU_FOAMY_PELICAN } from "../../../services/api/withRetry.js";
import { env } from "../../env.js";
import {
  isFirstPartyAnthropicBaseUrl,
  assumesFirstPartyBaseUrl,
  isFirstPartyProvider,
  getAPIProvider,
} from "../../model/providers.js";
import { isFirstPartyBaseUrl } from "../../model/firstPartyBaseUrl.js";
import { readEnumFlag } from "../../../services/analytics/flagOverrides.js";
import { isPolicyLimitsCacheMissing } from "../../../services/policyLimits/policyVerdicts.js";
import { areExperimentalBetasDisabled, isHipaaOrg } from "../../betas.js";
import { logError } from "../../log.js";
import { toError } from "../../errors.js";
import { isEnvTruthy } from "../../envUtils.js";
import { isDiskless } from "../../../bootstrap/state.js";
import { getProxyUrl } from "../../proxy.js";
import { logFeatureBad } from "../../../services/analytics/featureTelemetry.js";

//@ chunk-nt9amew5.js:16525-16556 placement
var TENGU_SMOOTH_CHIPMUNK = "tengu_smooth_chipmunk";
//@ chunk-nt9amew5.js:16556-16645 placement
/**
 * autoModeContextEnabled：取并缓存 auto 模式上下文开关。
 */
function autoModeContextEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.autoModeContextEnabled ??= smoothChipmunkDefault();
  return sessionFeatureValues.autoModeContextEnabled;
}
//@ chunk-nt9amew5.js:16645-16700 placement
/**
 * cachedAutoModeContextEnabled：auto 模式上下文开关（缓存）。
 */
function cachedAutoModeContextEnabled() {
  return getSessionFeatureValues().autoModeContextEnabled ?? smoothChipmunkDefault();
}
//@ chunk-nt9amew5.js:16700-16721 placement
function noOverride() {
  return;
}
//@ chunk-nt9amew5.js:16721-16755 placement
var TENGU_IRIDESCENT_CRYSTAL = "tengu_iridescent_crystal";
//@ chunk-nt9amew5.js:16755-16786 placement
/**
 * isIridescentCrystalOn：开关 tengu_iridescent_crystal。
 */
function isIridescentCrystalOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_IRIDESCENT_CRYSTAL, false);
}
//@ chunk-nt9amew5.js:16786-16835 placement
/**
 * isQuietLanternOn：开关 tengu_quiet_lantern。
 */
function isQuietLanternOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_lantern", true);
}
//@ chunk-nt9amew5.js:16835-16865 placement
var TENGU_COPPER_TRELLIS = "tengu_copper_trellis";
//@ chunk-nt9amew5.js:16865-16896 placement
/**
 * isCopperTrellisOn：开关 tengu_copper_trellis。
 */
function isCopperTrellisOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COPPER_TRELLIS, false);
}
//@ chunk-nt9amew5.js:16896-17039 placement
function getServerClassifierFallbackMode() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FOAMY_PELICAN, "off");
  if (
    featureValue_CACHED_MAY_BE_STALE === "off" ||
    featureValue_CACHED_MAY_BE_STALE === false ||
    featureValue_CACHED_MAY_BE_STALE === null
  )
    return isLocalClassifierSwitchedOff() ? "deny_all" : "off";
  return featureValue_CACHED_MAY_BE_STALE === "keep_local" ? "keep_local" : "deny_all";
}
//@ chunk-nt9amew5.js:17039-17067 placement
var TENGU_VIVID_CRAYON = "tengu_vivid_crayon";
//@ chunk-nt9amew5.js:17067-17097 placement
/**
 * isVividCrayonOn：开关 tengu_vivid_crayon。
 */
function isVividCrayonOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIVID_CRAYON, true);
}
//@ chunk-nt9amew5.js:17097-17125 placement
var TENGU_HAZEL_PLOVER = "tengu_hazel_plover";
//@ chunk-nt9amew5.js:17125-17161 placement
/**
 * isHazelPloverOn：开关 tengu_hazel_plover。
 */
function isHazelPloverOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HAZEL_PLOVER, false) === true;
}
//@ chunk-nt9amew5.js:17161-17190 placement
var TENGU_MERRY_POPCORN = "tengu_merry_popcorn";
//@ chunk-nt9amew5.js:17190-17221 placement
/**
 * isMerryPopcornOn：开关 tengu_merry_popcorn。
 */
function isMerryPopcornOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MERRY_POPCORN, true);
}
//@ chunk-nt9amew5.js:17221-17249 placement
var TENGU_WISE_ORIGAMI = "tengu_wise_origami";
//@ chunk-nt9amew5.js:17249-17279 placement
/**
 * isWiseOrigamiOn：开关 tengu_wise_origami。
 */
function isWiseOrigamiOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_ORIGAMI, false);
}
//@ chunk-nt9amew5.js:17279-17311 placement
var TENGU_BRIGHT_DRAGONFLY = "tengu_bright_dragonfly";
//@ chunk-nt9amew5.js:17311-17420 placement
function isFirstPartyEndpoint() {
  if (env.ANTHROPIC_UNIX_SOCKET !== undefined) return env.CLAUDE_CODE_ENTRYPOINT === "ssh-remote";
  return isFirstPartyAnthropicBaseUrl();
}
//@ chunk-nt9amew5.js:17420-17460 placement
function isFirstPartyEndpointHost() {
  return isFirstPartyEndpoint() && (assumesFirstPartyBaseUrl() || isFirstPartyBaseUrl());
}
//@ chunk-nt9amew5.js:17460-17779 placement
/**
 * 第一方提供方下按 tengu_bright_dragonfly 判断本地分类器是否关闭（交接审阅时只看含 handoffs 的取值）；策略缓存缺失或实验 beta 被禁用时为 false。
 */
function isLocalClassifierSwitchedOff({ handoffReview = false } = {}) {
  try {
    if (!isFirstPartyProvider()) return false;
    let enumFlag = readEnumFlag(TENGU_BRIGHT_DRAGONFLY, {
      safe: "off",
      others: ["direct", "all", "direct_and_handoffs", "all_and_handoffs"],
    });
    if (enumFlag === "off" || (handoffReview && (enumFlag === "direct" || enumFlag === "all"))) return false;
    if (
      isPolicyLimitsCacheMissing() ||
      (areExperimentalBetasDisabled() &&
        !isBetasSwitchSetAside({
          peek: true,
        }))
    )
      return false;
    return enumFlag === "all" || enumFlag === "all_and_handoffs" || isFirstPartyEndpointHost();
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-nt9amew5.js:17779-17977 placement
function isThirdPartyServerClassifierEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.thirdPartyServerClassifierEnabled ??=
    getUserServerClassifierSwitch() ??
    !(env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS && !env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST);
  return sessionFeatureValues.thirdPartyServerClassifierEnabled;
}
//@ chunk-nt9amew5.js:17977-18114 placement
function getUserServerClassifierSwitch() {
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.userServerClassifierSwitch === undefined)
    sessionFeatureValues.userServerClassifierSwitch = envServerClassifierSwitch();
  return sessionFeatureValues.userServerClassifierSwitch;
}
//@ chunk-nt9amew5.js:18114-18191 placement
/**
 * userServerClassifierSwitch：用户的服务端分类器开关。
 */
function userServerClassifierSwitch() {
  let userServerClassifierSwitch = getSessionFeatureValues().userServerClassifierSwitch;
  return userServerClassifierSwitch === undefined ? envServerClassifierSwitch() : userServerClassifierSwitch;
}
//@ chunk-nt9amew5.js:18191-18271 placement
function envServerClassifierSwitch() {
  let CLAUDE_CODE_AUTO_MODE_SERVER = env.CLAUDE_CODE_AUTO_MODE_SERVER;
  return CLAUDE_CODE_AUTO_MODE_SERVER === undefined ? null : isEnvTruthy(CLAUDE_CODE_AUTO_MODE_SERVER);
}
//@ chunk-nt9amew5.js:18271-18307 placement
function smoothChipmunkDefault() {
  return noOverride() ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SMOOTH_CHIPMUNK, true);
}
//@ chunk-nt9amew5.js:18307-18337 placement
var TENGU_VALIANT_SPHINX = "tengu_valiant_sphinx";
//@ chunk-nt9amew5.js:18337-18405 placement
/**
 * isValiantSphinxOn：开关 tengu_valiant_sphinx（出错按开）。
 */
function isValiantSphinxOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VALIANT_SPHINX, true) !== false;
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-nt9amew5.js:18405-18436 placement
var TENGU_DRIFTING_VALLEY = "tengu_drifting_valley";
//@ chunk-nt9amew5.js:18436-18466 placement
function isDriftingValleyOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DRIFTING_VALLEY, false);
}
//@ chunk-nt9amew5.js:18466-18886 placement
/**
 * 判断是否把"禁用实验 beta"开关搁置以便使用服务端分类器（直连第一方、用户未关闭、策略缓存存在等）；结果缓存，peek 时不写缓存。
 */
function isBetasSwitchSetAside({ peek = false } = {}) {
  if (isHipaaOrg()) return false;
  let sessionFeatureValues = getSessionFeatureValues();
  if (
    sessionFeatureValues.betasSwitchSetAside === true &&
    (!isDriftingValleyOn() || isPolicyLimitsCacheMissing())
  ) {
    if (!peek) sessionFeatureValues.betasSwitchSetAside = false;
    return false;
  }
  if (sessionFeatureValues.betasSwitchSetAside !== undefined) return sessionFeatureValues.betasSwitchSetAside;
  let setAside = false;
  try {
    setAside =
      env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS &&
      !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      env.ANTHROPIC_UNIX_SOCKET === undefined &&
      getUserServerClassifierSwitch() !== false &&
      !isPolicyLimitsCacheMissing() &&
      isFirstPartyBaseUrl() &&
      isDriftingValleyOn();
  } catch (error) {
    logError(toError(error));
  }
  if (!peek) sessionFeatureValues.betasSwitchSetAside = setAside;
  return setAside;
}
//@ chunk-nt9amew5.js:18886-19123 placement
function getApiRouteKind() {
  if (isDiskless()) return;
  try {
    if (getAPIProvider() !== "firstParty") return "platform";
    if (env.ANTHROPIC_UNIX_SOCKET !== undefined) return "unix_socket";
    if (!isFirstPartyBaseUrl()) return "custom_base_url";
    return getProxyUrl() === undefined ? "direct" : "direct_http_proxy";
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-nt9amew5.js:19123-19146 placement
/**
 * neverTrue：恒 false 占位。
 */
function neverTrue() {
  return false;
}
//@ chunk-nt9amew5.js:19146-19217 placement
/**
 * setTimeoutWithCancel：定时器并返回取消函数；TIMER_MARGIN_MS：定时器余量（同一声明共 2 个绑定）。
 */
var setTimeoutWithCancel = (fn, delayMs) => {
  let timer = setTimeout(fn, delayMs);
  return () => clearTimeout(timer);
};
var TIMER_MARGIN_MS = 10;
//@ chunk-nt9amew5.js:19217-19250 placement
/**
 * agentIdOrMain：缺省为 main 的 agent id。
 */
function agentIdOrMain(agentId) {
  return agentId ?? "main";
}
//@ chunk-nt9amew5.js:19250-19260 placement
/**
 * ENABLE_CLASSIFIER_DEFAULT：分类器默认启用标志。
 */
var ENABLE_CLASSIFIER_DEFAULT = true;
//@ chunk-5xgkngpb.js:1036820-1037171 placement
/**
 * 本地分类器被关闭或该侧调用在 tengu_radiant_fern 列表中时视为已退役（每种记一次日志）；调用方豁免时返回 false。
 */
function isClassifierSideCallRetired(sideCallName, hasCodeModeBeenUsed) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_fern", []);
  let localSwitchedOff = isLocalClassifierSwitchedOff();
  if (
    !(
      localSwitchedOff ||
      (Array.isArray(featureValue_CACHED_MAY_BE_STALE) &&
        featureValue_CACHED_MAY_BE_STALE.includes(sideCallName))
    ) ||
    hasCodeModeBeenUsed?.() === true
  )
    return false;
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.retiredClassifierSideCallsLogged ??= new Set();
  if (!sessionFeatureValues.retiredClassifierSideCallsLogged.has(sideCallName)) {
    sessionFeatureValues.retiredClassifierSideCallsLogged.add(sideCallName);
    logFeatureBad(
      "auto_mode_side_calls_retired",
      sideCallName,
      localSwitchedOff
        ? {
            localClassifierSwitchedOff: true,
          }
        : undefined,
    );
  }
  return true;
}
export {
  isLocalClassifierSwitchedOff,
  getServerClassifierFallbackMode,
  getUserServerClassifierSwitch,
  agentIdOrMain,
  getApiRouteKind,
  isBetasSwitchSetAside,
  isMerryPopcornOn,
  isCopperTrellisOn,
  TIMER_MARGIN_MS,
  isFirstPartyEndpoint,
  isThirdPartyServerClassifierEnabled,
  neverTrue,
  isIridescentCrystalOn,
  cachedAutoModeContextEnabled,
  autoModeContextEnabled,
  isWiseOrigamiOn,
  isQuietLanternOn,
  isVividCrayonOn,
  isClassifierSideCallRetired,
  ENABLE_CLASSIFIER_DEFAULT,
  setTimeoutWithCancel,
  userServerClassifierSwitch,
  isHazelPloverOn,
  isValiantSphinxOn,
};
