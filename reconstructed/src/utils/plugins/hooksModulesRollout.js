/**
 * utils/plugins/hooksModulesRollout.ts
 *
 * 2.1.316 新增。组织 hooks 模块 rollout。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7kt7c7a3.js (48)
 * attribution: placement 48
 */
import {
  hasGrowthBookInitializeStarted,
  defaultFeatureFlagClientSlots,
  hasFreshGrowthBookFeatures,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  PLUGIN_HOOKS_MODULES_GATE,
  isGrowthBookEnabled,
  isGrowthBookInitializeInFlight,
  isServedFeatureSource,
  initializeGrowthBook,
  hasWorkspaceTrust,
  refreshGrowthBookFeatures,
  onGrowthBookRefresh,
} from "../../services/analytics/growthbook.js";
import { isPendingNotOver } from "../toolErrors.js";
import { getRootSession, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import {
  HOOKS_MODULES_DEFAULT,
  hasFeatureFlagCredential,
  areHooksModulesAllowed,
  P_n,
  checkHooksModulesFlag,
} from "../../services/analytics/growthbookCredentials.js";
import { uie, fYo, qM, waitForInitialize } from "../startupFlagWait.js";
import { mn } from "../remoteEnvironment.js";
import { AUTO_MODE_ENABLED_DEFAULT } from "../permissions/permissionSetup.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { withTimeout, withDeadline } from "../sleep.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { errorMessage } from "../errors.js";
import { env } from "../env.js";
import { tyi } from "../startupTiming.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";

//@ chunk-7kt7c7a3.js:827-852 placement
var L = (o) => hasGrowthBookInitializeStarted() || isPendingNotOver(o);
//@ chunk-7kt7c7a3.js:852-880 placement
var crt = (o) => isPendingNotOver(o) && !hasGrowthBookInitializeStarted();
//@ chunk-7kt7c7a3.js:880-909 placement
var H = (o) => o.hasHeld || crt(o);
//@ chunk-7kt7c7a3.js:909-942 placement
var Xvt = (o) => defaultFeatureFlagClientSlots.of(o).fetchHold;
//@ chunk-7kt7c7a3.js:942-978 placement
function Eee() {
  return Xvt(getRootSession().host);
}
//@ chunk-7kt7c7a3.js:978-1053 placement
var z = () =>
  (getIsNonInteractiveSession() || H(Eee())) &&
  L(Eee()) &&
  !hasFreshGrowthBookFeatures() &&
  getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source ===
    "fallback";
//@ chunk-7kt7c7a3.js:1053-1104 placement
var YNe = () =>
  isGrowthBookEnabled() &&
  getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source ===
    "disk" &&
  hasFeatureFlagCredential();
//@ chunk-7kt7c7a3.js:1104-1136 placement
var V = () => H(Eee()) && YNe() && areHooksModulesAllowed();
//@ chunk-7kt7c7a3.js:1136-1169 placement
var A = () => L(Eee()) && YNe() && !areHooksModulesAllowed();
//@ chunk-7kt7c7a3.js:1169-1190 placement
var Y = () => A() && isGrowthBookInitializeInFlight();
//@ chunk-7kt7c7a3.js:1190-1223 placement
var R_n = () =>
  isServedFeatureSource(
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source,
  );
//@ chunk-7kt7c7a3.js:1304-1344 placement
var BF = () => uie() && mn() && (!R_n() || AUTO_MODE_ENABLED_DEFAULT());
//@ chunk-7kt7c7a3.js:1344-1377 placement
function cFi() {
  P_n.isFollowed = !0;
}
/**
 * rollout 开关在本次唤醒等待内未答复时把 wakeBound 从 ahead 改为 passed。
 */
//@ chunk-7kt7c7a3.js:1377-1645 placement
function markWakeBoundPassed() {
  let o = getPluginRegistry();
  if (BF() && o.hooksModulesWakeBound === "ahead")
    ((o.hooksModulesWakeBound = "passed"),
      logForDebugging(
        `the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is not answered within this wake's wait: the organization's hooks modules load at what the switch reads, a person's wait for the answer`,
      ));
}
//@ chunk-7kt7c7a3.js:1645-1657 placement
var R = 60000;
//@ chunk-7kt7c7a3.js:1657-1805 placement
var MODS_ORG_SETTINGS_UNREADABLE_MESSAGE =
  "Mods you installed aren't running in this session. Your organization's settings couldn't be read, so it isn't known whether it allows them.";
//@ chunk-7kt7c7a3.js:1805-1874 placement
var D = "the follow of the rollout switch did not end and is given up";
//@ chunk-7kt7c7a3.js:1874-1953 placement
function j(o) {
  return o instanceof Error && o.message === D ? "timeout" : "load_failed";
}
//@ chunk-7kt7c7a3.js:1953-2097 placement
var MODS_ROLLOUT_OFF_MESSAGE =
  "installed mods are off for now: the rollout switch for them reads off; they load again when it reads on, and built-in mods keep running";
//@ chunk-7kt7c7a3.js:2097-2208 placement
function isHooksModulesSwitchStale() {
  let hooksModulesSwitchRead = getPluginRegistry().hooksModulesSwitchRead;
  return (
    hooksModulesSwitchRead !== void 0 &&
    !YNe() &&
    !BF() &&
    (hooksModulesSwitchRead.isLoadOwed || hooksModulesSwitchRead.isOn !== areHooksModulesAllowed())
  );
}
//@ chunk-7kt7c7a3.js:2208-2293 placement
function y() {
  let hooksModulesSwitchRead = getPluginRegistry().hooksModulesSwitchRead;
  return (
    hooksModulesSwitchRead !== void 0 &&
    hooksModulesSwitchRead.isOn &&
    isHooksModulesSwitchStale() &&
    !areHooksModulesAllowed()
  );
}
//@ chunk-7kt7c7a3.js:2293-3313 placement
function followHooksModulesRollout(o, e, s) {
  let r = getPluginRegistry(),
    {
      hooksModulesSwitchRead: hooksModulesSwitchRead,
      hooksModulesSwitchFollowing: hooksModulesSwitchFollowing,
    } = r;
  if (hooksModulesSwitchFollowing !== void 0)
    return hooksModulesSwitchFollowing
      .then(() => (y() ? (followHooksModulesRollout(o, e, s) ?? void 0) : void 0))
      .catch(logError);
  if (hooksModulesSwitchRead === void 0 || !isHooksModulesSwitchStale()) return null;
  let f = areHooksModulesAllowed(),
    c = r.loadedModules.length;
  logForDebugging(
    `installed plugins' hooks modules ${f ? "load" : "unload"}: the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) reads ${f ? "on" : "off"} in a running session`,
  );
  let p = () => {
      r.hooksModulesSwitchRead = { ...(r.hooksModulesSwitchRead ?? hooksModulesSwitchRead), isOn: !1 };
    },
    h = (f ? Promise.resolve() : Promise.resolve().then(s).then(p, logError)).then(o),
    E = () => {
      r.hooksModulesSwitchRead = { ...(r.hooksModulesSwitchRead ?? hooksModulesSwitchRead), isLoadOwed: !0 };
    };
  h.catch(E);
  let M = withTimeout(h, R, D)
    .then(
      () => {
        logFeatureOk("plugin_function_hooks_switch_followed", { is_turned_on: f });
      },
      (k) => {
        (E(),
          logFeatureBad("plugin_function_hooks_switch_followed", j(k), { is_turned_on: f }),
          logForDebugging(
            `installed plugins' hooks modules: the load that follows the rollout flag failed: ${errorMessage(k)}`,
            { level: "error" },
          ));
      },
    )
    .then(() => {
      if (!f && r.loadedModules.length < c) e(MODS_ROLLOUT_OFF_MESSAGE);
    })
    .catch(logError)
    .finally(() => {
      r.hooksModulesSwitchFollowing = void 0;
    });
  return ((r.hooksModulesSwitchFollowing = M), M);
}
/**
 * 组织 hooks 模块仍待加载（且开关并非由 payload 明确关闭）。
 */
//@ chunk-7kt7c7a3.js:3313-3481 placement
function isOrganizationModsLoadPending() {
  let o = getPluginRegistry().hooksModulesSwitchRead?.isManagedPending === !0;
  try {
    let e =
      !areHooksModulesAllowed() &&
      getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT)
        .source === "payload";
    return o && uie() && mn() && !e;
  } catch (error) {
    return (logError(error), o);
  }
}
//@ chunk-7kt7c7a3.js:3481-4355 placement
function settleHooksModulesWake(o, e, s) {
  let r = getPluginRegistry();
  if (AUTO_MODE_ENABLED_DEFAULT()) markWakeBoundPassed();
  let n = r.hooksModulesWakeBound === "taken",
    a = r.hooksModulesWakeBound === "passed" && BF(),
    u = !(r.hooksModulesWakeBound === "ahead" && BF()) && isOrganizationModsLoadPending();
  if (!(r.hooksModulesSwitchRead !== void 0 && r.hooksModulesSwitchFollowing === void 0 && (a || u || n)))
    return null;
  if (n && !u) {
    if (((r.hooksModulesWakeBound = "loaded"), r.hooksModulesSwitchRead?.isPersonsOut === !0))
      e(MODS_ORG_SETTINGS_UNREADABLE_MESSAGE);
    return null;
  }
  let c = withTimeout(o(), R, "the load at the end of the wake's wait did not end and is given up")
    .then(
      () => {
        let hooksModulesSwitchRead = r.hooksModulesSwitchRead,
          w = hooksModulesSwitchRead?.isManagedPending !== !0;
        if (w) r.hooksModulesWakeBound = "loaded";
        if (w && hooksModulesSwitchRead?.isPersonsOut === !0) e(MODS_ORG_SETTINGS_UNREADABLE_MESSAGE);
      },
      (p) => {
        logForDebugging(
          `the load of an organization's hooks modules at the end of the wake's wait failed: ${errorMessage(p)}`,
          { level: "error" },
        );
      },
    )
    .finally(() => {
      r.hooksModulesSwitchFollowing = void 0;
    });
  return (
    (r.hooksModulesSwitchFollowing = c),
    c.then(() => (y() ? (followHooksModulesRollout(o, e, s) ?? void 0) : void 0)).catch(logError)
  );
}
/**
 * 按本次加载结果在 taken/passed 之间切换 wakeBound。
 */
//@ chunk-7kt7c7a3.js:4355-4611 placement
function updateWakeBound(o) {
  let { registry: registry } = o,
    s = o.isSetKnown && o.isLoadFaultless && o.unmet.length === 0,
    r = !s && registry.hooksModulesWakeBound === "taken",
    n = s && registry.hooksModulesWakeBound === "passed" && BF() && AUTO_MODE_ENABLED_DEFAULT();
  if (r) registry.hooksModulesWakeBound = "passed";
  if (n) registry.hooksModulesWakeBound = "taken";
}
//@ chunk-7kt7c7a3.js:4611-4704 placement
async function Z() {
  return (
    await initializeGrowthBook().catch(() => {
      return;
    }),
    Y()
      ? initializeGrowthBook().catch(() => {
          return;
        })
      : void 0
  );
}
//@ chunk-7kt7c7a3.js:4704-4770 placement
function P() {
  return BF() ? (env.CLAUDE_CODE_FLAG_FETCH_WAIT_MS ?? fYo) : qM;
}
//@ chunk-7kt7c7a3.js:4770-4802 placement
var q = () => Math.max(0, P() - tyi());
//@ chunk-7kt7c7a3.js:4802-4945 placement
function describeFlagWaitOutcome(o) {
  let timedOut = o.timedOut,
    s = !timedOut && hasFreshGrowthBookFeatures();
  return timedOut
    ? `no answer within ${P()}ms`
    : s
      ? "the flag payload landed"
      : "the fetch settled with no payload";
}
//@ chunk-7kt7c7a3.js:4945-5118 placement
async function waitForRolloutFlag(o = initializeGrowthBook) {
  let e = await waitForInitialize({ initialize: o, budgetMs: q() });
  logForDebugging(
    `installed plugins' hooks modules held ${Math.round(e.waitMs)}ms for the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}): ` +
      describeFlagWaitOutcome(e),
  );
}
//@ chunk-7kt7c7a3.js:5118-5163 placement
async function fFi() {
  return R_n() ? void 0 : waitForRolloutFlag();
}
//@ chunk-7kt7c7a3.js:5163-5175 placement
var X = 30000;
//@ chunk-7kt7c7a3.js:5175-5244 placement
function oo(o) {
  return crt(o) && hasWorkspaceTrust() ? o.over.promise : Promise.resolve();
}
//@ chunk-7kt7c7a3.js:5244-5267 placement
var U = (o) => withDeadline(oo(o), X);
/**
 * 启动时按需等待 rollout 标志。
 */
//@ chunk-7kt7c7a3.js:5267-5387 placement
async function holdForRolloutFlagAtStartup() {
  await checkHooksModulesFlag();
  let o = A(),
    e = z() || V(),
    s = (o || e) && !BF(),
    r = o ? Z : initializeGrowthBook;
  if (s) await U(Eee());
  return s ? waitForRolloutFlag(r) : void 0;
}
/**
 * GrowthBook 取值来源（override/payload/disk/disabled/fallback）的说明文字。
 */
//@ chunk-7kt7c7a3.js:5387-5725 placement
var FLAG_VALUE_SOURCE_LABELS = {
  override: "from a local override",
  payload: "from GrowthBook (this session's payload)",
  disk: "from GrowthBook (the disk cache of an earlier session)",
  disabled:
    "from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",
  fallback: "from the default (a cold GrowthBook cache, no payload yet)",
};
//@ chunk-7kt7c7a3.js:5725-5737 placement
var b = 60000;
/**
 * 若已有重读进行中则复用；否则在已读开关且距 askedAt 超过间隔时更新 askedAt，首次走 waitForRolloutFlag，之后刷新 GrowthBook 并等待，结束清空。
 */
//@ chunk-7kt7c7a3.js:5737-6139 placement
function rereadHooksModulesSwitch(o = Date.now()) {
  let e = getPluginRegistry(),
    hooksModulesSwitchRereading = e.hooksModulesSwitchRereading;
  if (hooksModulesSwitchRereading !== void 0) return hooksModulesSwitchRereading;
  let hooksModulesSwitchRead = e.hooksModulesSwitchRead;
  if (!(hooksModulesSwitchRead !== void 0 && mn() && o - hooksModulesSwitchRead.askedAt >= b)) return null;
  e.hooksModulesSwitchRead = { ...hooksModulesSwitchRead, askedAt: o };
  let f = (
    hooksModulesSwitchRead.askedAt === 0
      ? waitForRolloutFlag()
      : waitForInitialize({
          initialize: () => refreshGrowthBookFeatures().then(initializeGrowthBook),
          budgetMs: qM,
        }).then(() => {
          return;
        })
  ).finally(() => {
    e.hooksModulesSwitchRereading = void 0;
  });
  return ((e.hooksModulesSwitchRereading = f), f);
}
//@ chunk-7kt7c7a3.js:6139-6256 placement
function followRolloutAfterReread(o, e, s) {
  let r = () => followHooksModulesRollout(o, e, s) ?? settleHooksModulesWake(o, e, s),
    n = rereadHooksModulesSwitch();
  return n !== null ? n.catch(logError).then(() => (markWakeBoundPassed(), r() ?? void 0)) : r();
}
//@ chunk-7kt7c7a3.js:6256-6268 placement
var x_n = 1e4;
/**
 * 开关曾保存为关时，GrowthBook 刷新为开后补加载。
 */
//@ chunk-7kt7c7a3.js:6268-6484 placement
function loadLateWhenFlagTurnsOn(o) {
  if (!(YNe() && !areHooksModulesAllowed())) return;
  let s = onGrowthBookRefresh(() => {
    if (!hasFreshGrowthBookFeatures()) return;
    if ((s(), areHooksModulesAllowed()))
      (logForDebugging(
        `installed plugins' hooks modules load late: the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) answered on after the load went on over a saved off`,
      ),
        o());
  });
}
/**
 * hooks 模块未加载原因的说明文字。
 */
//@ chunk-7kt7c7a3.js:6484-7045 placement
var HOOKS_MODULES_OFF_REASONS = {
  served: "the rollout switch served off",
  saved: "the rollout switch was saved off by an earlier session and is not refreshed yet",
  unanswered:
    "this wake's flag fetch has not answered the rollout switch; they load at a turn start once it reads on",
  unfetched:
    "this wake fetches no rollout switch; an organization's load at once, a person's once the organization's settings have been read",
  unfetchedOut:
    "this wake fetches no rollout switch and the organization's settings could not be read; an organization's load at once, a person's stay out for this wake",
};
/**
 * 选出 hooks 模块关闭的原因文字。
 */
//@ chunk-7kt7c7a3.js:7045-7236 placement
function describeHooksModulesOffReason() {
  let o = BF() && areHooksModulesAllowed(),
    e = YNe(),
    s = o && AUTO_MODE_ENABLED_DEFAULT();
  if (s && getPluginRegistry().hooksModulesSwitchRead?.isPersonsOut === !0)
    return HOOKS_MODULES_OFF_REASONS.unfetchedOut;
  return s
    ? HOOKS_MODULES_OFF_REASONS.unfetched
    : o
      ? HOOKS_MODULES_OFF_REASONS.unanswered
      : e
        ? HOOKS_MODULES_OFF_REASONS.saved
        : HOOKS_MODULES_OFF_REASONS.served;
}
//@ chunk-7kt7c7a3.js:7236-7373 placement
function reloadAndReportDroppedModules(o, e, s) {
  let r = getPluginRegistry(),
    n = r.loadedModules.length;
  return Promise.resolve()
    .then(o)
    .then(() => {
      if (r.loadedModules.length < n) e(MODS_ROLLOUT_OFF_MESSAGE);
      s();
    });
}
//@ chunk-7kt7c7a3.js:7373-7416 placement
function gFi() {
  return FLAG_VALUE_SOURCE_LABELS[
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source
  ];
}
/**
 * 插件测试透传的 GrowthBook/遥测/提供方相关环境变量。
 */
//@ chunk-7kt7c7a3.js:7416-7690 placement
var ROLLOUT_ENV_PASSTHROUGH_VARS = [
  "NODE_ENV",
  "DISABLE_GROWTHBOOK",
  "DISABLE_TELEMETRY",
  "DO_NOT_TRACK",
  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
  "CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF",
  "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",
  "CLAUDE_CODE_CUSTOM_OAUTH_URL",
  "CLAUDE_INTERNAL_FC_OVERRIDES",
  ...PROVIDER_ENV_FLAGS,
];
//@ chunk-7kt7c7a3.js:7690-7784 placement
function hFi(o, e, s) {
  let r = followRolloutAfterReread(o, e, s);
  return r === null
    ? null
    : withDeadline(r, x_n)
        .then(() => {
          return;
        })
        .catch(logError);
}
//@ chunk-7kt7c7a3.js:7784-7799 placement
var A_n = 180000;

export {
  R_n,
  fFi,
  cFi,
  YNe,
  HOOKS_MODULES_OFF_REASONS,
  ROLLOUT_ENV_PASSTHROUGH_VARS,
  x_n,
  Xvt,
  crt,
  Eee,
  A_n,
  isHooksModulesSwitchStale,
  BF,
  U,
  waitForRolloutFlag,
  markWakeBoundPassed,
  followHooksModulesRollout,
  settleHooksModulesWake,
  isOrganizationModsLoadPending,
  b,
  followRolloutAfterReread,
  reloadAndReportDroppedModules,
  holdForRolloutFlagAtStartup,
  loadLateWhenFlagTurnsOn,
  gFi,
  updateWakeBound,
  describeHooksModulesOffReason,
  hFi,
};
