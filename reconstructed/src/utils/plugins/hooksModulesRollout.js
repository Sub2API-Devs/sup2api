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
  hooksModulesFollowState,
  checkHooksModulesFlag,
} from "../../services/analytics/growthbookCredentials.js";
import {
  isRemoteNonInteractiveSession,
  GROWTHBOOK_FLAG_WAIT_MS,
  EVENT_LOGGING_FLAG_WAIT_MS,
  waitForInitialize,
} from "../startupFlagWait.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { AUTO_MODE_ENABLED_DEFAULT } from "../permissions/permissionSetup.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { withTimeout, withDeadline } from "../sleep.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { errorMessage } from "../errors.js";
import { env } from "../env.js";
import { getFlagFetchWaitedMs } from "../startupTiming.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";

//@ chunk-7kt7c7a3.js:827-852 placement
var growthBookNotStartedOrPending = (o) => hasGrowthBookInitializeStarted() || isPendingNotOver(o);
//@ chunk-7kt7c7a3.js:852-880 placement
/**
 * pendingWithoutStart：仍待定且 GrowthBook 尚未开始。
 */
var pendingWithoutStart = (o) => isPendingNotOver(o) && !hasGrowthBookInitializeStarted();
//@ chunk-7kt7c7a3.js:880-909 placement
var isHeldOrPending = (o) => o.hasHeld || pendingWithoutStart(o);
//@ chunk-7kt7c7a3.js:909-942 placement
/**
 * fetchHoldForHost：某宿主的取回保持承诺。
 */
var fetchHoldForHost = (host) => defaultFeatureFlagClientSlots.of(host).fetchHold;
//@ chunk-7kt7c7a3.js:942-978 placement
/**
 * currentFetchHold：当前宿主的取回保持。
 */
function currentFetchHold() {
  return fetchHoldForHost(getRootSession().host);
}
//@ chunk-7kt7c7a3.js:978-1053 placement
var shouldWaitOnFallbackSource = () =>
  (getIsNonInteractiveSession() || isHeldOrPending(currentFetchHold())) &&
  growthBookNotStartedOrPending(currentFetchHold()) &&
  !hasFreshGrowthBookFeatures() &&
  getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source ===
    "fallback";
//@ chunk-7kt7c7a3.js:1053-1104 placement
/**
 * isDiskSourceWithCredential：开关来源为 disk 且有凭据。
 */
var isDiskSourceWithCredential = () =>
  isGrowthBookEnabled() &&
  getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source ===
    "disk" &&
  hasFeatureFlagCredential();
//@ chunk-7kt7c7a3.js:1104-1136 placement
var needsReloadWhenAllowed = () =>
  isHeldOrPending(currentFetchHold()) && isDiskSourceWithCredential() && areHooksModulesAllowed();
//@ chunk-7kt7c7a3.js:1136-1169 placement
var needsReloadWhileDisallowed = () =>
  growthBookNotStartedOrPending(currentFetchHold()) &&
  isDiskSourceWithCredential() &&
  !areHooksModulesAllowed();
//@ chunk-7kt7c7a3.js:1169-1190 placement
var needsGrowthBookRefresh = () => needsReloadWhileDisallowed() && isGrowthBookInitializeInFlight();
//@ chunk-7kt7c7a3.js:1190-1223 placement
/**
 * isServedGateSource：开关来源为服务端下发。
 */
var isServedGateSource = () =>
  isServedFeatureSource(
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source,
  );
//@ chunk-7kt7c7a3.js:1304-1344 placement
/**
 * isAutoModeGateOpen：auto 模式闸门可等。
 */
var isAutoModeGateOpen = () =>
  isRemoteNonInteractiveSession() &&
  isRemoteManagedEnvironment() &&
  (!isServedGateSource() || AUTO_MODE_ENABLED_DEFAULT());
//@ chunk-7kt7c7a3.js:1344-1377 placement
/**
 * markFollowConsumed：标记已跟随。
 */
function markFollowConsumed() {
  hooksModulesFollowState.isFollowed = true;
}
//@ chunk-7kt7c7a3.js:1377-1645 placement
/**
 * rollout 开关在本次唤醒等待内未答复时把 wakeBound 从 ahead 改为 passed。
 */
function markWakeBoundPassed() {
  let pluginRegistry = getPluginRegistry();
  if (isAutoModeGateOpen() && pluginRegistry.hooksModulesWakeBound === "ahead") {
    pluginRegistry.hooksModulesWakeBound = "passed";
    logForDebugging(
      `the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is not answered within this wake's wait: the organization's hooks modules load at what the switch reads, a person's wait for the answer`,
    );
  }
}
//@ chunk-7kt7c7a3.js:1645-1657 placement
var ROLLOUT_FOLLOW_TIMEOUT_MS = 60000;
//@ chunk-7kt7c7a3.js:1657-1805 placement
var MODS_ORG_SETTINGS_UNREADABLE_MESSAGE =
  "Mods you installed aren't running in this session. Your organization's settings couldn't be read, so it isn't known whether it allows them.";
//@ chunk-7kt7c7a3.js:1805-1874 placement
var ROLLOUT_FOLLOW_TIMEOUT_MESSAGE = "the follow of the rollout switch did not end and is given up";
//@ chunk-7kt7c7a3.js:1874-1953 placement
function classifyFollowFailure(error) {
  return error instanceof Error && error.message === ROLLOUT_FOLLOW_TIMEOUT_MESSAGE
    ? "timeout"
    : "load_failed";
}
//@ chunk-7kt7c7a3.js:1953-2097 placement
var MODS_ROLLOUT_OFF_MESSAGE =
  "installed mods are off for now: the rollout switch for them reads off; they load again when it reads on, and built-in mods keep running";
//@ chunk-7kt7c7a3.js:2097-2208 placement
function isHooksModulesSwitchStale() {
  let hooksModulesSwitchRead = getPluginRegistry().hooksModulesSwitchRead;
  return (
    hooksModulesSwitchRead !== undefined &&
    !isDiskSourceWithCredential() &&
    !isAutoModeGateOpen() &&
    (hooksModulesSwitchRead.isLoadOwed || hooksModulesSwitchRead.isOn !== areHooksModulesAllowed())
  );
}
//@ chunk-7kt7c7a3.js:2208-2293 placement
function isStaleHooksModulesSwitch() {
  let hooksModulesSwitchRead = getPluginRegistry().hooksModulesSwitchRead;
  return (
    hooksModulesSwitchRead !== undefined &&
    hooksModulesSwitchRead.isOn &&
    isHooksModulesSwitchStale() &&
    !areHooksModulesAllowed()
  );
}
//@ chunk-7kt7c7a3.js:2293-3313 placement
function followHooksModulesRollout(o, e, s) {
  let pluginRegistry = getPluginRegistry();
  let { hooksModulesSwitchRead, hooksModulesSwitchFollowing } = pluginRegistry;
  if (hooksModulesSwitchFollowing !== undefined)
    return hooksModulesSwitchFollowing
      .then(() =>
        isStaleHooksModulesSwitch() ? (followHooksModulesRollout(o, e, s) ?? undefined) : undefined,
      )
      .catch(logError);
  if (hooksModulesSwitchRead === undefined || !isHooksModulesSwitchStale()) return null;
  let f = areHooksModulesAllowed();
  let c = pluginRegistry.loadedModules.length;
  logForDebugging(
    `installed plugins' hooks modules ${f ? "load" : "unload"}: the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) reads ${f ? "on" : "off"} in a running session`,
  );
  let p = () => {
    pluginRegistry.hooksModulesSwitchRead = {
      ...(pluginRegistry.hooksModulesSwitchRead ?? hooksModulesSwitchRead),
      isOn: false,
    };
  };
  let h = (f ? Promise.resolve() : Promise.resolve().then(s).then(p, logError)).then(o);
  let E = () => {
    pluginRegistry.hooksModulesSwitchRead = {
      ...(pluginRegistry.hooksModulesSwitchRead ?? hooksModulesSwitchRead),
      isLoadOwed: true,
    };
  };
  h.catch(E);
  let M = withTimeout(h, ROLLOUT_FOLLOW_TIMEOUT_MS, ROLLOUT_FOLLOW_TIMEOUT_MESSAGE)
    .then(
      () => {
        logFeatureOk("plugin_function_hooks_switch_followed", {
          is_turned_on: f,
        });
      },
      (error) => {
        E();
        logFeatureBad("plugin_function_hooks_switch_followed", classifyFollowFailure(error), {
          is_turned_on: f,
        });
        logForDebugging(
          `installed plugins' hooks modules: the load that follows the rollout flag failed: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      },
    )
    .then(() => {
      if (!f && pluginRegistry.loadedModules.length < c) e(MODS_ROLLOUT_OFF_MESSAGE);
    })
    .catch(logError)
    .finally(() => {
      pluginRegistry.hooksModulesSwitchFollowing = undefined;
    });
  pluginRegistry.hooksModulesSwitchFollowing = M;
  return M;
}
//@ chunk-7kt7c7a3.js:3313-3481 placement
/**
 * 组织 hooks 模块仍待加载（且开关并非由 payload 明确关闭）。
 */
function isOrganizationModsLoadPending() {
  let o = getPluginRegistry().hooksModulesSwitchRead?.isManagedPending === true;
  try {
    let e =
      !areHooksModulesAllowed() &&
      getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT)
        .source === "payload";
    return o && isRemoteNonInteractiveSession() && isRemoteManagedEnvironment() && !e;
  } catch (error) {
    logError(error);
    return o;
  }
}
//@ chunk-7kt7c7a3.js:3481-4355 placement
function settleHooksModulesWake(o, e, s) {
  let pluginRegistry = getPluginRegistry();
  if (AUTO_MODE_ENABLED_DEFAULT()) markWakeBoundPassed();
  let n = pluginRegistry.hooksModulesWakeBound === "taken";
  let a = pluginRegistry.hooksModulesWakeBound === "passed" && isAutoModeGateOpen();
  let u =
    !(pluginRegistry.hooksModulesWakeBound === "ahead" && isAutoModeGateOpen()) &&
    isOrganizationModsLoadPending();
  if (!(
    pluginRegistry.hooksModulesSwitchRead !== undefined &&
    pluginRegistry.hooksModulesSwitchFollowing === undefined &&
    (a || u || n)
  ))
    return null;
  if (n && !u) {
    pluginRegistry.hooksModulesWakeBound = "loaded";
    if (pluginRegistry.hooksModulesSwitchRead?.isPersonsOut === true) e(MODS_ORG_SETTINGS_UNREADABLE_MESSAGE);
    return null;
  }
  let c = withTimeout(
    o(),
    ROLLOUT_FOLLOW_TIMEOUT_MS,
    "the load at the end of the wake's wait did not end and is given up",
  )
    .then(
      () => {
        let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
        let w = hooksModulesSwitchRead?.isManagedPending !== true;
        if (w) pluginRegistry.hooksModulesWakeBound = "loaded";
        if (w && hooksModulesSwitchRead?.isPersonsOut === true) e(MODS_ORG_SETTINGS_UNREADABLE_MESSAGE);
      },
      (error) => {
        logForDebugging(
          `the load of an organization's hooks modules at the end of the wake's wait failed: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      },
    )
    .finally(() => {
      pluginRegistry.hooksModulesSwitchFollowing = undefined;
    });
  pluginRegistry.hooksModulesSwitchFollowing = c;
  return c
    .then(() => (isStaleHooksModulesSwitch() ? (followHooksModulesRollout(o, e, s) ?? undefined) : undefined))
    .catch(logError);
}
//@ chunk-7kt7c7a3.js:4355-4611 placement
/**
 * 按本次加载结果在 taken/passed 之间切换 wakeBound。
 */
function updateWakeBound(o) {
  let { registry } = o;
  let s = o.isSetKnown && o.isLoadFaultless && o.unmet.length === 0;
  let r = !s && registry.hooksModulesWakeBound === "taken";
  let n =
    s && registry.hooksModulesWakeBound === "passed" && isAutoModeGateOpen() && AUTO_MODE_ENABLED_DEFAULT();
  if (r) registry.hooksModulesWakeBound = "passed";
  if (n) registry.hooksModulesWakeBound = "taken";
}
//@ chunk-7kt7c7a3.js:4611-4704 placement
async function reinitializeGrowthBookIfNeeded() {
  await initializeGrowthBook().catch(() => {
    return;
  });
  return needsGrowthBookRefresh()
    ? initializeGrowthBook().catch(() => {
        return;
      })
    : undefined;
}
//@ chunk-7kt7c7a3.js:4704-4770 placement
function flagFetchWaitMs() {
  return isAutoModeGateOpen()
    ? (env.CLAUDE_CODE_FLAG_FETCH_WAIT_MS ?? GROWTHBOOK_FLAG_WAIT_MS)
    : EVENT_LOGGING_FLAG_WAIT_MS;
}
//@ chunk-7kt7c7a3.js:4770-4802 placement
var remainingFetchWaitMs = () => Math.max(0, flagFetchWaitMs() - getFlagFetchWaitedMs());
//@ chunk-7kt7c7a3.js:4802-4945 placement
function describeFlagWaitOutcome(o) {
  let timedOut = o.timedOut;
  let s = !timedOut && hasFreshGrowthBookFeatures();
  return timedOut
    ? `no answer within ${flagFetchWaitMs()}ms`
    : s
      ? "the flag payload landed"
      : "the fetch settled with no payload";
}
//@ chunk-7kt7c7a3.js:4945-5118 placement
async function waitForRolloutFlag(initialize = initializeGrowthBook) {
  let e = await waitForInitialize({
    initialize,
    budgetMs: remainingFetchWaitMs(),
  });
  logForDebugging(
    `installed plugins' hooks modules held ${Math.round(e.waitMs)}ms for the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}): ` +
      describeFlagWaitOutcome(e),
  );
}
//@ chunk-7kt7c7a3.js:5118-5163 placement
/**
 * waitForRolloutUnlessServed：非服务端来源时等待 rollout 开关。
 */
async function waitForRolloutUnlessServed() {
  return isServedGateSource() ? undefined : waitForRolloutFlag();
}
//@ chunk-7kt7c7a3.js:5163-5175 placement
var STARTUP_ROLLOUT_WAIT_MS = 30000;
//@ chunk-7kt7c7a3.js:5175-5244 placement
function settlementPromise(o) {
  return pendingWithoutStart(o) && hasWorkspaceTrust() ? o.over.promise : Promise.resolve();
}
//@ chunk-7kt7c7a3.js:5244-5267 placement
/**
 * waitForSettlement：带截止时间的结算等待。
 */
var waitForSettlement = (o) => withDeadline(settlementPromise(o), STARTUP_ROLLOUT_WAIT_MS);
//@ chunk-7kt7c7a3.js:5267-5387 placement
/**
 * 启动时按需等待 rollout 标志。
 */
async function holdForRolloutFlagAtStartup() {
  await checkHooksModulesFlag();
  let o = needsReloadWhileDisallowed();
  let e = shouldWaitOnFallbackSource() || needsReloadWhenAllowed();
  let s = (o || e) && !isAutoModeGateOpen();
  let initialize = o ? reinitializeGrowthBookIfNeeded : initializeGrowthBook;
  if (s) await waitForSettlement(currentFetchHold());
  return s ? waitForRolloutFlag(initialize) : undefined;
}
//@ chunk-7kt7c7a3.js:5387-5725 placement
/**
 * GrowthBook 取值来源（override/payload/disk/disabled/fallback）的说明文字。
 */
var FLAG_VALUE_SOURCE_LABELS = {
  override: "from a local override",
  payload: "from GrowthBook (this session's payload)",
  disk: "from GrowthBook (the disk cache of an earlier session)",
  disabled:
    "from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",
  fallback: "from the default (a cold GrowthBook cache, no payload yet)",
};
//@ chunk-7kt7c7a3.js:5725-5737 placement
/**
 * REREAD_INTERVAL_MS：重读间隔。
 */
var REREAD_INTERVAL_MS = 60000;
//@ chunk-7kt7c7a3.js:5737-6139 placement
/**
 * 若已有重读进行中则复用；否则在已读开关且距 askedAt 超过间隔时更新 askedAt，首次走 waitForRolloutFlag，之后刷新 GrowthBook 并等待，结束清空。
 */
function rereadHooksModulesSwitch(o = Date.now()) {
  let pluginRegistry = getPluginRegistry();
  let hooksModulesSwitchRereading = pluginRegistry.hooksModulesSwitchRereading;
  if (hooksModulesSwitchRereading !== undefined) return hooksModulesSwitchRereading;
  let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
  if (!(
    hooksModulesSwitchRead !== undefined &&
    isRemoteManagedEnvironment() &&
    o - hooksModulesSwitchRead.askedAt >= REREAD_INTERVAL_MS
  ))
    return null;
  pluginRegistry.hooksModulesSwitchRead = {
    ...hooksModulesSwitchRead,
    askedAt: o,
  };
  let f = (
    hooksModulesSwitchRead.askedAt === 0
      ? waitForRolloutFlag()
      : waitForInitialize({
          initialize: () => refreshGrowthBookFeatures().then(initializeGrowthBook),
          budgetMs: EVENT_LOGGING_FLAG_WAIT_MS,
        }).then(() => {
          return;
        })
  ).finally(() => {
    pluginRegistry.hooksModulesSwitchRereading = undefined;
  });
  pluginRegistry.hooksModulesSwitchRereading = f;
  return f;
}
//@ chunk-7kt7c7a3.js:6139-6256 placement
function followRolloutAfterReread(o, e, s) {
  let r = () => followHooksModulesRollout(o, e, s) ?? settleHooksModulesWake(o, e, s);
  let n = rereadHooksModulesSwitch();
  return n !== null
    ? n.catch(logError).then(() => {
        markWakeBoundPassed();
        return r() ?? undefined;
      })
    : r();
}
//@ chunk-7kt7c7a3.js:6256-6268 placement
/**
 * REREAD_INITIAL_DELAY_MS：首次重读延迟。
 */
var REREAD_INITIAL_DELAY_MS = 1e4;
//@ chunk-7kt7c7a3.js:6268-6484 placement
/**
 * 开关曾保存为关时，GrowthBook 刷新为开后补加载。
 */
function loadLateWhenFlagTurnsOn(o) {
  if (!(isDiskSourceWithCredential() && !areHooksModulesAllowed())) return;
  let s = onGrowthBookRefresh(() => {
    if (!hasFreshGrowthBookFeatures()) return;
    s();
    if (areHooksModulesAllowed()) {
      logForDebugging(
        `installed plugins' hooks modules load late: the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) answered on after the load went on over a saved off`,
      );
      o();
    }
  });
}
//@ chunk-7kt7c7a3.js:6484-7045 placement
/**
 * hooks 模块未加载原因的说明文字。
 */
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
//@ chunk-7kt7c7a3.js:7045-7236 placement
/**
 * 选出 hooks 模块关闭的原因文字。
 */
function describeHooksModulesOffReason() {
  let o = isAutoModeGateOpen() && areHooksModulesAllowed();
  let e = isDiskSourceWithCredential();
  let s = o && AUTO_MODE_ENABLED_DEFAULT();
  if (s && getPluginRegistry().hooksModulesSwitchRead?.isPersonsOut === true)
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
  let pluginRegistry = getPluginRegistry();
  let n = pluginRegistry.loadedModules.length;
  return Promise.resolve()
    .then(o)
    .then(() => {
      if (pluginRegistry.loadedModules.length < n) e(MODS_ROLLOUT_OFF_MESSAGE);
      s();
    });
}
//@ chunk-7kt7c7a3.js:7373-7416 placement
/**
 * flagValueSourceLabel：开关值来源标签。
 */
function flagValueSourceLabel() {
  return FLAG_VALUE_SOURCE_LABELS[
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source
  ];
}
//@ chunk-7kt7c7a3.js:7416-7690 placement
/**
 * 插件测试透传的 GrowthBook/遥测/提供方相关环境变量。
 */
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
/**
 * followRolloutWithDeadline：带截止时间的重读后跟随。
 */
function followRolloutWithDeadline(reload, tell, standDown) {
  let r = followRolloutAfterReread(reload, tell, standDown);
  return r === null
    ? null
    : withDeadline(r, REREAD_INITIAL_DELAY_MS)
        .then(() => {
          return;
        })
        .catch(logError);
}
//@ chunk-7kt7c7a3.js:7784-7799 placement
/**
 * BUSY_EDGE_THRESHOLD_MS：前台忙碌判定阈值。
 */
var BUSY_EDGE_THRESHOLD_MS = 180000;
export {
  isServedGateSource,
  waitForRolloutUnlessServed,
  markFollowConsumed,
  isDiskSourceWithCredential,
  HOOKS_MODULES_OFF_REASONS,
  ROLLOUT_ENV_PASSTHROUGH_VARS,
  REREAD_INITIAL_DELAY_MS,
  fetchHoldForHost,
  pendingWithoutStart,
  currentFetchHold,
  BUSY_EDGE_THRESHOLD_MS,
  isHooksModulesSwitchStale,
  isAutoModeGateOpen,
  waitForSettlement,
  waitForRolloutFlag,
  markWakeBoundPassed,
  followHooksModulesRollout,
  settleHooksModulesWake,
  isOrganizationModsLoadPending,
  REREAD_INTERVAL_MS,
  followRolloutAfterReread,
  reloadAndReportDroppedModules,
  holdForRolloutFlagAtStartup,
  loadLateWhenFlagTurnsOn,
  flagValueSourceLabel,
  updateWakeBound,
  describeHooksModulesOffReason,
  followRolloutWithDeadline,
};
