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
import { Ao } from "../../../bootstrap/sessionFeatureValues.js";
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
function jGe() {
  let e = Ao();
  return ((e.autoModeContextEnabled ??= Lqt()), e.autoModeContextEnabled);
}
//@ chunk-e6aww6q8.js:1023139-1023196 placement
function Aqt() {
  return Ao().autoModeContextEnabled ?? Lqt();
}
//@ chunk-e6aww6q8.js:1023196-1023218 placement
function lMo() {
  return;
}
//@ chunk-e6aww6q8.js:1023218-1023253 placement
var TENGU_IRIDESCENT_CRYSTAL = "tengu_iridescent_crystal";
//@ chunk-e6aww6q8.js:1023253-1023284 placement
function K7() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_IRIDESCENT_CRYSTAL, !1);
}
//@ chunk-e6aww6q8.js:1023284-1023334 placement
function WGe() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_lantern", !0);
}
//@ chunk-e6aww6q8.js:1023334-1023365 placement
var TENGU_COPPER_TRELLIS = "tengu_copper_trellis";
//@ chunk-e6aww6q8.js:1023365-1023397 placement
function Zhe() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COPPER_TRELLIS, !1);
}
//@ chunk-e6aww6q8.js:1023397-1023538 placement
function getServerClassifierFallbackMode() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FOAMY_PELICAN, "off");
  if (e === "off" || e === !1 || e === null) return isLocalClassifierSwitchedOff() ? "deny_all" : "off";
  return e === "keep_local" ? "keep_local" : "deny_all";
}
//@ chunk-e6aww6q8.js:1023538-1023567 placement
var TENGU_VIVID_CRAYON = "tengu_vivid_crayon";
//@ chunk-e6aww6q8.js:1023567-1023599 placement
function xqt() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIVID_CRAYON, !0);
}
//@ chunk-e6aww6q8.js:1023599-1023628 placement
var TENGU_HAZEL_PLOVER = "tengu_hazel_plover";
//@ chunk-e6aww6q8.js:1023628-1023665 placement
function m4s() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HAZEL_PLOVER, !1) === !0;
}
//@ chunk-e6aww6q8.js:1023665-1023695 placement
var TENGU_MERRY_POPCORN = "tengu_merry_popcorn";
//@ chunk-e6aww6q8.js:1023695-1023727 placement
function Pqt() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MERRY_POPCORN, !0);
}
//@ chunk-e6aww6q8.js:1023727-1023756 placement
var TENGU_WISE_ORIGAMI = "tengu_wise_origami";
//@ chunk-e6aww6q8.js:1023756-1023788 placement
function Mqt() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_ORIGAMI, !1);
}
//@ chunk-e6aww6q8.js:1023788-1023821 placement
var TENGU_BRIGHT_DRAGONFLY = "tengu_bright_dragonfly";
//@ chunk-e6aww6q8.js:1023821-1023931 placement
function isFirstPartyEndpoint() {
  if (env.ANTHROPIC_UNIX_SOCKET !== void 0) return env.CLAUDE_CODE_ENTRYPOINT === "ssh-remote";
  return isFirstPartyAnthropicBaseUrl();
}
//@ chunk-e6aww6q8.js:1023931-1023974 placement
function hMo() {
  return isFirstPartyEndpoint() && (assumesFirstPartyBaseUrl() || isFirstPartyBaseUrl());
}
/**
 * 第一方提供方下按 tengu_bright_dragonfly 判断本地分类器是否关闭（交接审阅时只看含 handoffs 的取值）；策略缓存缺失或实验 beta 被禁用时为 false。
 */
//@ chunk-e6aww6q8.js:1023974-1024293 placement
function isLocalClassifierSwitchedOff({ handoffReview: e = !1 } = {}) {
  try {
    if (!isFirstPartyProvider()) return !1;
    let n = readEnumFlag(TENGU_BRIGHT_DRAGONFLY, {
      safe: "off",
      others: ["direct", "all", "direct_and_handoffs", "all_and_handoffs"],
    });
    if (n === "off" || (e && (n === "direct" || n === "all"))) return !1;
    if (
      isPolicyLimitsCacheMissing() ||
      (areExperimentalBetasDisabled() && !isBetasSwitchSetAside({ peek: !0 }))
    )
      return !1;
    return n === "all" || n === "all_and_handoffs" || hMo();
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e6aww6q8.js:1024293-1024491 placement
function isThirdPartyServerClassifierEnabled() {
  let e = Ao();
  return (
    (e.thirdPartyServerClassifierEnabled ??=
      getUserServerClassifierSwitch() ??
      !(env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS && !env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)),
    e.thirdPartyServerClassifierEnabled
  );
}
//@ chunk-e6aww6q8.js:1024491-1024628 placement
function getUserServerClassifierSwitch() {
  let e = Ao();
  if (e.userServerClassifierSwitch === void 0) e.userServerClassifierSwitch = Dqt();
  return e.userServerClassifierSwitch;
}
//@ chunk-e6aww6q8.js:1024628-1024707 placement
function Iqt() {
  let userServerClassifierSwitch = Ao().userServerClassifierSwitch;
  return userServerClassifierSwitch === void 0 ? Dqt() : userServerClassifierSwitch;
}
//@ chunk-e6aww6q8.js:1024707-1024788 placement
function Dqt() {
  let CLAUDE_CODE_AUTO_MODE_SERVER = env.CLAUDE_CODE_AUTO_MODE_SERVER;
  return CLAUDE_CODE_AUTO_MODE_SERVER === void 0 ? null : isEnvTruthy(CLAUDE_CODE_AUTO_MODE_SERVER);
}
//@ chunk-e6aww6q8.js:1024788-1024827 placement
function Lqt() {
  return lMo() ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SMOOTH_CHIPMUNK, !0);
}
//@ chunk-e6aww6q8.js:1024827-1024858 placement
var TENGU_VALIANT_SPHINX = "tengu_valiant_sphinx";
//@ chunk-e6aww6q8.js:1024858-1024927 placement
function g4s() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VALIANT_SPHINX, !0) !== !1;
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
//@ chunk-e6aww6q8.js:1024927-1024959 placement
var TENGU_DRIFTING_VALLEY = "tengu_drifting_valley";
//@ chunk-e6aww6q8.js:1024959-1024991 placement
function Cqt() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DRIFTING_VALLEY, !1);
}
/**
 * 判断是否把"禁用实验 beta"开关搁置以便使用服务端分类器（直连第一方、用户未关闭、策略缓存存在等）；结果缓存，peek 时不写缓存。
 */
//@ chunk-e6aww6q8.js:1024991-1025412 placement
function isBetasSwitchSetAside({ peek: e = !1 } = {}) {
  if (isHipaaOrg()) return !1;
  let n = Ao();
  if (n.betasSwitchSetAside === !0 && (!Cqt() || isPolicyLimitsCacheMissing())) {
    if (!e) n.betasSwitchSetAside = !1;
    return !1;
  }
  if (n.betasSwitchSetAside !== void 0) return n.betasSwitchSetAside;
  let r = !1;
  try {
    r =
      env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS &&
      !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      env.ANTHROPIC_UNIX_SOCKET === void 0 &&
      getUserServerClassifierSwitch() !== !1 &&
      !isPolicyLimitsCacheMissing() &&
      isFirstPartyBaseUrl() &&
      Cqt();
  } catch (error) {
    logError(toError(error));
  }
  if (!e) n.betasSwitchSetAside = r;
  return r;
}
//@ chunk-e6aww6q8.js:1025412-1025650 placement
function getApiRouteKind() {
  if (isDiskless()) return;
  try {
    if (getAPIProvider() !== "firstParty") return "platform";
    if (env.ANTHROPIC_UNIX_SOCKET !== void 0) return "unix_socket";
    if (!isFirstPartyBaseUrl()) return "custom_base_url";
    return getProxyUrl() === void 0 ? "direct" : "direct_http_proxy";
  } catch (error) {
    logError(toError(error));
    return;
  }
}
/**
 * 本地分类器被关闭或该侧调用在 tengu_radiant_fern 列表中时视为已退役（每种记一次日志）；调用方豁免时返回 false。
 */
//@ chunk-e6aww6q8.js:1025650-1026000 placement
function isClassifierSideCallRetired(e, n) {
  let r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_fern", []),
    s = isLocalClassifierSwitchedOff();
  if (!(s || (Array.isArray(r) && r.includes(e))) || n?.() === !0) return !1;
  let y = Ao();
  if (((y.retiredClassifierSideCallsLogged ??= new Set()), !y.retiredClassifierSideCallsLogged.has(e)))
    (y.retiredClassifierSideCallsLogged.add(e),
      logFeatureBad("auto_mode_side_calls_retired", e, s ? { localClassifierSwitchedOff: !0 } : void 0));
  return !0;
}
//@ chunk-e6aww6q8.js:1026000-1026024 placement
function zGe() {
  return !1;
}
//@ chunk-e6aww6q8.js:1026024-1026095 placement
var SMo = (e, n) => {
    let r = setTimeout(e, n);
    return () => clearTimeout(r);
  },
  wR = 10;
//@ chunk-e6aww6q8.js:1026095-1026127 placement
function jz(e) {
  return e ?? "main";
}
//@ chunk-e6aww6q8.js:1026127-1026138 placement
var kMo = !0;

export {
  wR,
  isLocalClassifierSwitchedOff,
  getServerClassifierFallbackMode,
  getUserServerClassifierSwitch,
  jz,
  getApiRouteKind,
  isBetasSwitchSetAside,
  Pqt,
  Zhe,
  isClassifierSideCallRetired,
  kMo,
  SMo,
  Iqt,
  isFirstPartyEndpoint,
  isThirdPartyServerClassifierEnabled,
  zGe,
  K7,
  Aqt,
  jGe,
  Mqt,
  WGe,
  xqt,
  m4s,
  g4s,
};
