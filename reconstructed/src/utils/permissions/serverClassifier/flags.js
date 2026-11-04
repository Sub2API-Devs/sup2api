/**
 * utils/permissions/serverClassifier/flags.ts
 *
 * 2.1.316 新增：服务端分类器开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (38)
 * attribution: placement 38
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

//@ chunk-e6aww6q8.js:1023016-1023048 placement
var TENGU_SMOOTH_CHIPMUNK = "tengu_smooth_chipmunk";
//@ chunk-e6aww6q8.js:1023048-1023139 placement
/**
 * autoModeContextEnabled：取并缓存 auto 模式上下文开关。
 */
function autoModeContextEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.autoModeContextEnabled ??= smoothChipmunkDefault();
  return sessionFeatureValues.autoModeContextEnabled;
}
//@ chunk-e6aww6q8.js:1023139-1023196 placement
/**
 * cachedAutoModeContextEnabled：auto 模式上下文开关（缓存）。
 */
function cachedAutoModeContextEnabled() {
  return getSessionFeatureValues().autoModeContextEnabled ?? smoothChipmunkDefault();
}
//@ chunk-e6aww6q8.js:1023196-1023218 placement
function noOverride() {
  return;
}
//@ chunk-e6aww6q8.js:1023218-1023253 placement
var TENGU_IRIDESCENT_CRYSTAL = "tengu_iridescent_crystal";
//@ chunk-e6aww6q8.js:1023253-1023284 placement
/**
 * isIridescentCrystalOn：开关 tengu_iridescent_crystal。
 */
function isIridescentCrystalOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_IRIDESCENT_CRYSTAL, false);
}
//@ chunk-e6aww6q8.js:1023284-1023334 placement
/**
 * isQuietLanternOn：开关 tengu_quiet_lantern。
 */
function isQuietLanternOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_lantern", true);
}
//@ chunk-e6aww6q8.js:1023334-1023365 placement
var TENGU_COPPER_TRELLIS = "tengu_copper_trellis";
//@ chunk-e6aww6q8.js:1023365-1023397 placement
/**
 * isCopperTrellisOn：开关 tengu_copper_trellis。
 */
function isCopperTrellisOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COPPER_TRELLIS, false);
}
//@ chunk-e6aww6q8.js:1023397-1023538 placement
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
//@ chunk-e6aww6q8.js:1023538-1023567 placement
var TENGU_VIVID_CRAYON = "tengu_vivid_crayon";
//@ chunk-e6aww6q8.js:1023567-1023599 placement
/**
 * isVividCrayonOn：开关 tengu_vivid_crayon。
 */
function isVividCrayonOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIVID_CRAYON, true);
}
//@ chunk-e6aww6q8.js:1023599-1023628 placement
var TENGU_HAZEL_PLOVER = "tengu_hazel_plover";
//@ chunk-e6aww6q8.js:1023628-1023665 placement
/**
 * isHazelPloverOn：开关 tengu_hazel_plover。
 */
function isHazelPloverOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HAZEL_PLOVER, false) === true;
}
//@ chunk-e6aww6q8.js:1023665-1023695 placement
var TENGU_MERRY_POPCORN = "tengu_merry_popcorn";
//@ chunk-e6aww6q8.js:1023695-1023727 placement
/**
 * isMerryPopcornOn：开关 tengu_merry_popcorn。
 */
function isMerryPopcornOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MERRY_POPCORN, true);
}
//@ chunk-e6aww6q8.js:1023727-1023756 placement
var TENGU_WISE_ORIGAMI = "tengu_wise_origami";
//@ chunk-e6aww6q8.js:1023756-1023788 placement
/**
 * isWiseOrigamiOn：开关 tengu_wise_origami。
 */
function isWiseOrigamiOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_ORIGAMI, false);
}
//@ chunk-e6aww6q8.js:1023788-1023821 placement
var TENGU_BRIGHT_DRAGONFLY = "tengu_bright_dragonfly";
//@ chunk-e6aww6q8.js:1023821-1023931 placement
function isFirstPartyEndpoint() {
  if (env.ANTHROPIC_UNIX_SOCKET !== undefined) return env.CLAUDE_CODE_ENTRYPOINT === "ssh-remote";
  return isFirstPartyAnthropicBaseUrl();
}
//@ chunk-e6aww6q8.js:1023931-1023974 placement
function isFirstPartyEndpointHost() {
  return isFirstPartyEndpoint() && (assumesFirstPartyBaseUrl() || isFirstPartyBaseUrl());
}
//@ chunk-e6aww6q8.js:1023974-1024293 placement
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
//@ chunk-e6aww6q8.js:1024293-1024491 placement
function isThirdPartyServerClassifierEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.thirdPartyServerClassifierEnabled ??=
    getUserServerClassifierSwitch() ??
    !(env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS && !env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST);
  return sessionFeatureValues.thirdPartyServerClassifierEnabled;
}
//@ chunk-e6aww6q8.js:1024491-1024628 placement
function getUserServerClassifierSwitch() {
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.userServerClassifierSwitch === undefined)
    sessionFeatureValues.userServerClassifierSwitch = envServerClassifierSwitch();
  return sessionFeatureValues.userServerClassifierSwitch;
}
//@ chunk-e6aww6q8.js:1024628-1024707 placement
/**
 * userServerClassifierSwitch：用户的服务端分类器开关。
 */
function userServerClassifierSwitch() {
  let userServerClassifierSwitch = getSessionFeatureValues().userServerClassifierSwitch;
  return userServerClassifierSwitch === undefined ? envServerClassifierSwitch() : userServerClassifierSwitch;
}
//@ chunk-e6aww6q8.js:1024707-1024788 placement
function envServerClassifierSwitch() {
  let CLAUDE_CODE_AUTO_MODE_SERVER = env.CLAUDE_CODE_AUTO_MODE_SERVER;
  return CLAUDE_CODE_AUTO_MODE_SERVER === undefined ? null : isEnvTruthy(CLAUDE_CODE_AUTO_MODE_SERVER);
}
//@ chunk-e6aww6q8.js:1024788-1024827 placement
function smoothChipmunkDefault() {
  return noOverride() ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SMOOTH_CHIPMUNK, true);
}
//@ chunk-e6aww6q8.js:1024827-1024858 placement
var TENGU_VALIANT_SPHINX = "tengu_valiant_sphinx";
//@ chunk-e6aww6q8.js:1024858-1024927 placement
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
//@ chunk-e6aww6q8.js:1024927-1024959 placement
var TENGU_DRIFTING_VALLEY = "tengu_drifting_valley";
//@ chunk-e6aww6q8.js:1024959-1024991 placement
function isDriftingValleyOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DRIFTING_VALLEY, false);
}
//@ chunk-e6aww6q8.js:1024991-1025412 placement
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
//@ chunk-e6aww6q8.js:1025412-1025650 placement
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
//@ chunk-e6aww6q8.js:1025650-1026000 placement
/**
 * 本地分类器被关闭或该侧调用在 tengu_radiant_fern 列表中时视为已退役（每种记一次日志）；调用方豁免时返回 false。
 */
function isClassifierSideCallRetired(sideCallName, alwaysFalseLocal) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_fern", []);
  let localSwitchedOff = isLocalClassifierSwitchedOff();
  if (
    !(
      localSwitchedOff ||
      (Array.isArray(featureValue_CACHED_MAY_BE_STALE) &&
        featureValue_CACHED_MAY_BE_STALE.includes(sideCallName))
    ) ||
    alwaysFalseLocal?.() === true
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
//@ chunk-e6aww6q8.js:1026000-1026024 placement
/**
 * neverTrue：恒 false 占位。
 */
function neverTrue() {
  return false;
}
//@ chunk-e6aww6q8.js:1026024-1026095 placement
/**
 * setTimeoutWithCancel：定时器并返回取消函数；TIMER_MARGIN_MS：定时器余量（同一声明共 2 个绑定）。
 */
var setTimeoutWithCancel = (fn, delayMs) => {
  let timer = setTimeout(fn, delayMs);
  return () => clearTimeout(timer);
};
var TIMER_MARGIN_MS = 10;
//@ chunk-e6aww6q8.js:1026095-1026127 placement
/**
 * agentIdOrMain：缺省为 main 的 agent id。
 */
function agentIdOrMain(agentId) {
  return agentId ?? "main";
}
//@ chunk-e6aww6q8.js:1026127-1026138 placement
/**
 * ENABLE_CLASSIFIER_DEFAULT：分类器默认启用标志。
 */
var ENABLE_CLASSIFIER_DEFAULT = true;
export {
  TIMER_MARGIN_MS,
  isLocalClassifierSwitchedOff,
  getServerClassifierFallbackMode,
  getUserServerClassifierSwitch,
  agentIdOrMain,
  getApiRouteKind,
  isBetasSwitchSetAside,
  isMerryPopcornOn,
  isCopperTrellisOn,
  isClassifierSideCallRetired,
  ENABLE_CLASSIFIER_DEFAULT,
  setTimeoutWithCancel,
  userServerClassifierSwitch,
  isFirstPartyEndpoint,
  isThirdPartyServerClassifierEnabled,
  neverTrue,
  isIridescentCrystalOn,
  cachedAutoModeContextEnabled,
  autoModeContextEnabled,
  isWiseOrigamiOn,
  isQuietLanternOn,
  isVividCrayonOn,
  isHazelPloverOn,
  isValiantSphinxOn,
};
