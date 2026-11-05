/**
 * services/plugins/devMods/devModsWatcher.ts
 *
 * 2.1.316 新增：dev mods 目录监视与热重载
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c3nwd9gm.js (36)
 * attribution: placement 36
 */
import { utimes, mkdir } from "fs/promises";
import { basename, join } from "path";
import { statSync, readdirSync, mkdirSync } from "fs";
import { isDiskless, mainAgentId, getSessionId } from "../../../bootstrap/state.js";
import { areHooksModulesAllowed } from "../../analytics/growthbookCredentials.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnlyByPolicy,
} from "../../../utils/hooks/hooksConfigSnapshot.js";
import {
  areSideloadFlagsDisabledByPolicy,
  areLocalPluginDirsAllowedByPolicy,
} from "../../../utils/plugins/marketplacePolicy.js";
import { getSettingsForSource } from "../../../utils/settings/settings.js";
import { isSafeMode } from "../../../utils/envUtils.js";
import { isCustomizationDisabled } from "../../../utils/settings/customizationDisabled.js";
import { isProjectScopeTrustAccepted } from "../../../utils/config.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { logForDebugging, getDebugLogPath } from "../../../utils/debug.js";
import { errorMessage, isFsInaccessible } from "../../../utils/errors.js";
import {
  skillWatchStateByHost,
  skillWatchStateResetSlot,
  skillWatchStateClearSlot,
  skillWatchStateSlot,
} from "../../../skills/skillChangeWatch.js";
import {
  TURN_STATE_PROBE,
  listDirChildren,
  collectPluginDirRoots,
  reloadBoundPlugins,
  createWatchIgnorer,
  WATCH_ACTIVE_POLL_MS,
  WATCH_CLOCK,
} from "../../../plugins/functionHooks/devModsWatch.js";
import {
  pluginDirSlot,
  pluginDirWatchSlot,
  uiLog,
  reportPluginProblem,
  pluginDirsOverride,
} from "../../../plugins/functionHooks/hooksWorkerClient.js";
import { MODS, loadFailedLine, describeModPresence } from "../../../plugins/functionHooks/devModsNotices.js";
import { describeReloadFailure, describeDirChanges } from "../../../plugins/functionHooks/devModsStatus.js";
import { loadAllPluginsCacheOnly } from "../../../utils/plugins/pluginLoader.js";
import { reloadControllerSlot, pendingReloadSlot } from "../../../plugins/functionHooks/pluginLifecycle.js";
import { currentSurfaceBinding } from "../../../plugins/functionHooks/surfaceBinding.js";
import { mergePluginDirs } from "../../../utils/plugins/pluginDirsEnv.js";
import { sleep } from "../../../utils/sleep.js";
import {
  saveDevModsFolder,
  getCurrentSessionDevModsFolder,
  isSessionFileAt,
} from "../../../utils/sessionStorage.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import {
  areBuiltinOnlyHooksModules,
  shouldHoldPersonalModuleHooks,
} from "../../../utils/hooks/hookPolicyHold.js";
import { describeHooksModulesOffReason } from "../../../utils/plugins/hooksModulesRollout.js";
import { hookNoticeTask, TASK_NOTICE_IS_META } from "../../../plugins/functionHooks/hooksWorkerHost.js";
import { removeByFilter, enqueuePendingNotification } from "../../../utils/messageQueueManager.js";
import { chokidar_default } from "../../../../vendor/chokidar/index.js";
import { canAskForConsent, requestDevModsConsent, devModsFolderFor } from "./devModsConsent.js";
import { CONSENT_DIALOG_DELAY_MS, devModsDialogNamespace } from "./DevModsConsentDialog.js";
import { registerCleanup } from "../../../utils/cleanupRegistry.js";
import { isNotDotPrefixed } from "../../../utils/plugins/pluginManifestRead.js";
import { PLUGIN_MANIFEST_PATH } from "../../../utils/plugins/commandSource.js";

//@ chunk-c3nwd9gm.js:4831-5334 placement
var DEV_MODS_REFUSAL_CHECKS = [
  {
    refusal: "diskless",
    isRefused: isDiskless,
  },
  {
    refusal: "hooks_modules_off",
    isRefused: () => !areHooksModulesAllowed(),
  },
  {
    refusal: "all_hooks_disabled",
    isRefused: shouldDisableAllHooksIncludingManaged,
  },
  {
    refusal: "sideload_disabled",
    isRefused: areSideloadFlagsDisabledByPolicy,
  },
  {
    refusal: "local_dirs_blocked",
    isRefused: () => !areLocalPluginDirsAllowedByPolicy(),
  },
  {
    refusal: "managed_hooks_only",
    isRefused: () => getSettingsForSource("policySettings")?.allowManagedHooksOnly === true,
  },
  {
    refusal: "hooks_disabled_in_settings",
    isRefused: shouldAllowManagedHooksOnlyByPolicy,
  },
  {
    refusal: "safe_mode",
    isRefused: isSafeMode,
  },
  {
    refusal: "bare_mode",
    isRefused: () => isCustomizationDisabled("hooks"),
  },
  {
    refusal: "untrusted",
    isRefused: () => !isProjectScopeTrustAccepted(),
  },
];
//@ chunk-c3nwd9gm.js:5334-5391 placement
/**
 * 取当前生效的拒绝原因（没有返回 undefined）。
 */
function currentRefusal() {
  return DEV_MODS_REFUSAL_CHECKS.find((refusalCheck) => refusalCheck.isRefused())?.refusal;
}
//@ chunk-c3nwd9gm.js:5391-5512 placement
function devModsOffReason() {
  let refusal = currentRefusal();
  if (refusal !== undefined) {
    logFeatureSad("plugin_dev_mods", refusal);
    logForDebugging(`dev mods: mod hot-reloading is off here (${refusal})`);
  }
  return refusal;
}
//@ chunk-c3nwd9gm.js:5549-5558 placement
/**
 * 同一轮最多重载次数（3）。
 */
var MAX_RELOADS = 3;
//@ chunk-c3nwd9gm.js:5558-7709 placement
/**
 * 跟踪 dev mods 目录变化并决定何时热重载、何时报告加载/拒绝结果。
 */
function createDevModsReloadTracker(folder, host) {
  let declined = new Set();
  let knownLoaded = new Set(host.loaded);
  let wroteSinceTurn = false;
  let deferredEnable = false;
  let rescanAfterEnable = false;
  let consentAbort;
  let turnCount = 0;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let pendingReload = false;
  let unpickedCount = 0;
  let personTurn = false;
  let askedUnanswered = false;
  let reloading = false;
  let closed = false;
  let quietTimer;
  let watcher = host.watchRoot(folder, () => {
    wroteSinceTurn = true;
    onWatchEvent();
  });
  let offTurnBegin = host.turn.onBegin(() => {
    turnCount += 1;
    personTurn = host.turn.isPersonTurn();
  });
  let offTurnEnd = host.turn.onEnd(
    (isPersonTurn) => void guard(() => resumeAfterTurn(isPersonTurn ? "wait" : "wake")),
  );
  function clearQuietTimer() {
    quietTimer?.();
    quietTimer = undefined;
  }
  function onWatchEvent() {
    if (closed || deferredEnable) return;
    clearQuietTimer();
    if (host.turn.isRunning()) {
      guard(evaluateChanges);
      return;
    }
    quietTimer = host.clock.setTimeout(() => void guard(evaluateChanges), host.quietMs);
  }
  async function guard(task) {
    try {
      await task();
    } catch (error) {
      logForDebugging(`dev mods: the watch on ${folder} failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  async function resumeAfterTurn(nextTiming) {
    if (rescanAfterEnable) {
      rescanAfterEnable = false;
      for (let childName of (await host.listChildren(folder)) ?? []) declined.add(childName);
    }
    if (deferredEnable) {
      await enableNow(nextTiming);
      return;
    }
    if (pendingReload) {
      pendingReload = false;
      await evaluateChanges();
    }
  }
  async function enableNow(timing) {
    if (closed) return;
    if (host.refusal()) {
      await dispose();
      host.stopped("refused");
      return;
    }
    let startTiming = timing;
    let offBegin = host.turn.onBegin(() => {
      startTiming = "wait";
    });
    let offEnd = host.turn.onEnd((isPersonTurn) => {
      startTiming = isPersonTurn ? "wait" : "wake";
    });
    try {
      await Promise.all([dispose(), host.enable(folder, () => startTiming)]);
    } finally {
      offBegin();
      offEnd();
    }
    host.stopped("enabled");
  }
  async function evaluateChanges() {
    quietTimer = undefined;
    let isFirstWrite =
      host.turn.isRunning() && wroteSinceTurn && NEGATIVE_INFINITY === Number.NEGATIVE_INFINITY;
    let isBusy = closed || deferredEnable;
    let turnRunning = host.turn.isRunning() && !isFirstWrite;
    if (isBusy || reloading || turnRunning || NEGATIVE_INFINITY === turnCount) {
      pendingReload = !isBusy;
      return;
    }
    reloading = true;
    let needsRerun = false;
    try {
      let newChildren = isFirstWrite
        ? []
        : ((await host.listChildren(folder)) ?? []).filter((childName) => !declined.has(childName));
      let shouldReload =
        isFirstWrite ||
        (newChildren.length > 0 &&
          (wroteSinceTurn || newChildren.some((childName) => !knownLoaded.has(childName))));
      if (closed || !shouldReload) return;
      if (host.turn.isRunning() && !isFirstWrite) {
        pendingReload = true;
        return;
      }
      if (host.refusal()) {
        await dispose();
        host.stopped("refused");
        return;
      }
      NEGATIVE_INFINITY = turnCount;
      personTurn = false;
      let abortController = new AbortController();
      consentAbort = abortController;
      let answer = await host.ask(folder, abortController.signal).finally(() => {
        consentAbort = undefined;
      });
      if (closed) return;
      switch (answer) {
        case "enable":
          if (host.turn.isRunning() && !host.refusal()) {
            deferredEnable = true;
            host.deferred();
            return;
          }
          await enableNow("wake");
          return;
        case "decline": {
          askedUnanswered = false;
          unpickedCount = 0;
          rescanAfterEnable = host.turn.isRunning();
          let latestChildren = await host.listChildren(folder);
          for (let childName of [...newChildren, ...(latestChildren ?? [])]) declined.add(childName);
          return;
        }
        case "withdrawn":
          if (!askedUnanswered) {
            askedUnanswered = true;
            host.unanswered();
          }
          pendingReload = true;
          return;
        case "retry":
          pendingReload = true;
          return;
        case "closed":
        case "unpicked":
          if (!askedUnanswered) {
            askedUnanswered = true;
            host.unanswered();
          }
          if (!personTurn) unpickedCount += 1;
          if (unpickedCount >= MAX_RELOADS) {
            await dispose();
            host.stopped("no_pick");
            return;
          }
          if (answer === "unpicked") {
            NEGATIVE_INFINITY = host.turn.isRunning() ? turnCount - 1 : turnCount;
            pendingReload = true;
            return;
          }
          NEGATIVE_INFINITY = turnCount - 1;
          needsRerun = true;
          break;
        case "no_one_to_ask":
          await dispose();
          host.stopped("no_one_to_ask");
          return;
      }
    } finally {
      reloading = false;
    }
    if (needsRerun) await evaluateChanges();
  }
  async function dispose() {
    if (closed) return;
    closed = true;
    pendingReload = false;
    clearQuietTimer();
    consentAbort?.abort();
    offTurnBegin();
    offTurnEnd();
    await watcher.close();
  }
  onWatchEvent();
  return {
    declined: () => [...declined],
    isClosed: () => closed,
    dispose,
  };
}
//@ chunk-c3nwd9gm.js:7709-7752 placement
/**
 * 本轮结束后才加载的提示。
 */
var DEFERRED_NOTICE = "They'll load when this turn ends.";
//@ chunk-c3nwd9gm.js:7752-8029 placement
function markDevModsWatchState(folder, outcome) {
  let state = skillWatchStateByHost.get();
  if (state?.stage !== "watching" || state.folder !== folder) return;
  switch (outcome) {
    case "refused":
      skillWatchStateByHost.set({
        stage: "wanted",
        folder,
        ...(state.loaded !== undefined && {
          loaded: state.loaded,
        }),
      });
      return;
    case "no_one_to_ask":
    case "no_pick":
      skillWatchStateByHost.set({
        stage: "off",
        folder,
      });
      return;
    case "enabled":
      return;
  }
}
//@ chunk-c3nwd9gm.js:8067-8178 placement
async function touchPath(filePath) {
  let date = new Date();
  await utimes(filePath, date, date).catch((error) =>
    logForDebugging(`dev mods: ${filePath} keeps its old time: ${errorMessage(error)}`),
  );
}
//@ chunk-c3nwd9gm.js:8178-8381 placement
function installTurnEndTouch() {
  if (skillWatchStateResetSlot.get() !== undefined) return;
  skillWatchStateResetSlot.set(
    TURN_STATE_PROBE.onEnd(() => {
      try {
        for (let dirPath of [...(pluginDirSlot.get() ?? []), ...(pluginDirWatchSlot.get() ?? [])])
          touchPath(dirPath);
      } catch (error) {
        logForDebugging(`dev mods: the turn-end refresh failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    }),
  );
}
//@ chunk-c3nwd9gm.js:8414-8642 placement
function reportDevModsFailure(folder, error, reasonCode) {
  let phase = reasonCode === "enable_failed" ? "enabling" : "loading";
  if (reasonCode === "enable_failed") uiLog(MODS, loadFailedLine(errorMessage(error)));
  else reportPluginProblem(MODS, describeReloadFailure(basename(folder), error));
  logFeatureBad("plugin_dev_mods", reasonCode);
  logForDebugging(`dev mods: ${phase} ${folder} failed: ${errorMessage(error)}`, {
    level: "error",
  });
  return "failed";
}
//@ chunk-c3nwd9gm.js:8642-8753 placement
function emptyReloadResult(root, outcome, changes) {
  return {
    root,
    before: new Map(),
    after: changes.after,
    present: changes.present,
    unserved: changes.unserved,
    outcome,
  };
}
//@ chunk-c3nwd9gm.js:8753-9072 placement
async function reloadDevModsPlugins(root, outcome, options) {
  let present = (await listDirChildren(root)) ?? [];
  let pluginRegistry =
    outcome === "reloaded"
      ? await loadAllPluginsCacheOnly(options.storageV5, options.credentials)
      : {
          enabled: [],
          disabled: [],
        };
  let [rootInfo] = collectPluginDirRoots([...pluginRegistry.enabled, ...pluginRegistry.disabled], [root]);
  for (let change of describeDirChanges(
    emptyReloadResult(root, outcome, {
      present,
      after: rootInfo?.loaded ?? new Map(),
      unserved: rootInfo?.unserved ?? new Set(),
    }),
    describeModPresence,
    (dirPath) => reloadControllerSlot.get()?.isUnloaded(dirPath) ?? false,
  ))
    uiLog(change.plugin, change.text);
}
//@ chunk-c3nwd9gm.js:9072-9290 placement
async function notifyDevModsReload(folder, load) {
  let toolContext = currentSurfaceBinding()?.toolContext(new AbortController());
  await reloadDevModsPlugins(folder, load, {
    storageV5: toolContext?.storageV5,
    credentials: toolContext?.credentials,
  }).catch((error) =>
    logForDebugging(`dev mods: the lines for ${folder} were not told: ${errorMessage(error)}`, {
      level: "error",
    }),
  );
}
//@ chunk-c3nwd9gm.js:9290-9995 placement
async function joinDevModsPluginDir(folder) {
  try {
    await pendingReloadSlot.get()?.joinPluginDir(folder);
  } catch (error) {
    let state = skillWatchStateByHost.get();
    if ((state?.stage === "watching" || state?.stage === "consented") && state.folder === folder)
      skillWatchStateByHost.set({
        stage: "wanted",
        folder,
        ...(state.stage === "watching" &&
          state.loaded !== undefined && {
            loaded: state.loaded,
          }),
      });
    reportDevModsFailure(folder, error, "enable_failed");
    return {
      kind: "off",
      reason: errorMessage(error),
    };
  }
  try {
    skillWatchStateByHost.set({
      stage: "enabled",
      folder,
    });
    pluginDirSlot.set(mergePluginDirs(pluginDirSlot.get() ?? [], [folder]));
    installTurnEndTouch();
    await touchPath(folder);
    await sleep(0);
    let toolContext = currentSurfaceBinding()?.toolContext(new AbortController());
    saveDevModsFolder(folder, toolContext?.storageV5);
    let load = await reloadBoundPlugins();
    let registry = getPluginRegistry();
    let enableResult =
      load === "reloaded" && (areBuiltinOnlyHooksModules(registry) || shouldHoldPersonalModuleHooks(registry))
        ? {
            kind: "enabled",
            load: "kept-out",
            cause: describeHooksModulesOffReason(),
          }
        : {
            kind: "enabled",
            load,
          };
    await notifyDevModsReload(folder, load);
    logFeatureOk("plugin_dev_mods", {
      enabled: true,
    });
    return enableResult;
  } catch (error) {
    return {
      kind: "enabled",
      load: reportDevModsFailure(folder, error, "enable_failed"),
    };
  }
}
//@ chunk-c3nwd9gm.js:9995-11210 placement
function devModsLoadedNotice(folder, outcome) {
  switch (outcome.load) {
    case "reloaded":
      return `The person enabled mod hot-reloading for this session and the mods under ${folder} loaded: they load and reload by themselves as their files change; the transcript names any mod that failed.`;
    case "held":
      return `The person enabled mod hot-reloading for this session, but the mods under ${folder} wait for /reload-plugins (the load would rewrite the prompt cache): they are NOT loaded yet.`;
    case "kept-out":
      return `The person enabled mod hot-reloading for this session, but the hooks modules of the mods under ${folder} had NOT loaded when this notice was written. They count as a person's hooks modules, not an organization's. The reason: ${outcome.cause}. You get no further notice about them, so do not say they are running, and /reload-plugins does not load them sooner. A mod with no hooks module did load.`;
    case "unbound":
      return `The person enabled mod hot-reloading for this session, but the mods under ${folder} did not load (this session cannot reload its plugins; only a restart loads them).`;
    case "failed":
      return `The person enabled mod hot-reloading for this session, but the mods under ${folder} did not load (the load failed; the transcript says why, and /reload-plugins tries again).`;
  }
}
//@ chunk-c3nwd9gm.js:11210-11997 placement
function devModsOutcomeNotice(folder, outcome) {
  switch (outcome.kind) {
    case "enabled":
      return devModsLoadedNotice(folder, outcome);
    case "declined":
      return `The person declined mod hot-reloading: what this run wrote under ${folder} is written but NOT loaded (a mod that loaded when the session started keeps running as it loaded). Do not say the change is running. It loads the next time this session starts (/reload-plugins reloads only a mod that loaded at the start); the person can ask again.`;
    case "unanswered":
      return `The person has not answered the mod hot-reloading question yet; it is asked again once a turn ends. What this run wrote under ${folder} is written but NOT loaded yet. Do not say it was declined, and do not suggest --plugin-dir or a restart.`;
    case "off":
      return `Mod hot-reloading is off in this session (${outcome.reason}): mods under ${folder} are not loaded.`;
  }
}
//@ chunk-c3nwd9gm.js:11997-12024 placement
/**
 * 生成结果提示。
 */
var noticeFor = (folder, outcome) => hookNoticeTask(devModsOutcomeNotice(folder, outcome));
//@ chunk-c3nwd9gm.js:12024-12050 placement
/**
 * 表示“未回答”的结果对象。
 */
var UNANSWERED_OUTCOME = {
  kind: "unanswered",
};
//@ chunk-c3nwd9gm.js:12050-12272 placement
function enqueueDevModsNotice(folder, outcome, timing = "wake") {
  let isEnabled = outcome.kind === "enabled";
  let isActive = isEnabled && timing === "wake";
  if (isEnabled) removeByFilter((notice) => notice.value === noticeFor(folder, UNANSWERED_OUTCOME));
  enqueuePendingNotification({
    agentId: mainAgentId(),
    value: noticeFor(folder, outcome),
    mode: "task-notification",
    skipAttachments: true,
    isMeta: TASK_NOTICE_IS_META,
    ...(!isActive && {
      passive: true,
    }),
    priority: "next",
  });
}
//@ chunk-c3nwd9gm.js:12272-12304 placement
var NO_ONE_TO_ASK_TEXT = "nobody could be asked";
//@ chunk-c3nwd9gm.js:12304-12382 placement
/**
 * 记录并提示“无人可问”。
 */
function markNoOneToAsk(folder) {
  if (skillWatchStateClearSlot.get() === folder) return;
  skillWatchStateClearSlot.set(folder);
  enqueueDevModsNotice(folder, {
    kind: "off",
    reason: NO_ONE_TO_ASK_TEXT,
  });
}
//@ chunk-c3nwd9gm.js:12382-12428 placement
/**
 * 连续三次未选择时的说明。
 */
var NO_PICK_TIMES_TEXT = "the question got no pick three times";
//@ chunk-c3nwd9gm.js:12428-13040 placement
var DEV_MODS_REFUSAL_TEXT = {
  hooks_modules_off: "hooks modules are switched off in this process",
  all_hooks_disabled: "the organization disables all hooks",
  sideload_disabled: "the organization forbids side-loaded plugins",
  local_dirs_blocked: "the organization blocks plugins from local folders",
  managed_hooks_only: "the organization allows only managed hooks",
  hooks_disabled_in_settings: "hooks are turned off in your settings (disableAllHooks)",
  safe_mode: "the session runs in safe mode",
  diskless: "this kind of cloud session has no disk to load mods from",
  bare_mode: "the session runs in bare mode",
  untrusted: "the workspace is not trusted",
};
//@ chunk-c3nwd9gm.js:13040-13249 placement
function devModsStateFor(outcome, refusal) {
  switch (outcome) {
    case "enabled":
      return;
    case "refused":
      if (refusal === undefined) return;
      return {
        kind: "off",
        reason: DEV_MODS_REFUSAL_TEXT[refusal],
      };
    case "no_one_to_ask":
      return {
        kind: "off",
        reason: NO_ONE_TO_ASK_TEXT,
      };
    case "no_pick":
      return {
        kind: "off",
        reason: NO_PICK_TIMES_TEXT,
      };
  }
}
//@ chunk-c3nwd9gm.js:13249-13336 placement
/**
 * 根据结果发出相应提示。
 */
function reportOutcome(folder, outcome) {
  let state = devModsStateFor(outcome, currentRefusal());
  if (outcome === "no_one_to_ask") markNoOneToAsk(folder);
  else if (state !== undefined) enqueueDevModsNotice(folder, state);
}
//@ chunk-c3nwd9gm.js:13336-13721 placement
function watchDevModsFolder(folder, onChange) {
  let watcher = chokidar_default.watch(folder, {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    ignorePermissionErrors: true,
    ignored: createWatchIgnorer(folder, getDebugLogPath(), () => false),
    usePolling: true,
    interval: WATCH_ACTIVE_POLL_MS,
    binaryInterval: WATCH_ACTIVE_POLL_MS,
  });
  let notify = () => onChange();
  watcher.on("add", notify);
  watcher.on("addDir", notify);
  watcher.on("change", notify);
  watcher.on("unlink", notify);
  watcher.on("unlinkDir", notify);
  watcher.on("error", (error) =>
    logForDebugging(`dev mods: the watch on ${folder}: ${errorMessage(error)}`, {
      level: "warn",
    }),
  );
  return {
    close: () => watcher.close(),
  };
}
//@ chunk-c3nwd9gm.js:13721-14581 placement
/**
 * 在用户希望开启且尚未运行时，检查条件后请求同意并开始监视 dev mods 目录。
 */
async function startDevModsIfWanted() {
  try {
    let state = skillWatchStateByHost.get();
    if (state?.stage !== "wanted") return;
    if (currentRefusal() !== undefined) return;
    if (!canAskForConsent()) {
      logFeatureSad("plugin_dev_mods", "no_one_to_ask");
      skillWatchStateByHost.set({
        stage: "off",
        folder: state.folder,
      });
      if (state.loaded === undefined) markNoOneToAsk(state.folder);
      return;
    }
    await mkdir(state.folder, {
      recursive: true,
    });
    let freshState = skillWatchStateByHost.get();
    if (freshState?.stage !== "wanted") return;
    let { folder, loaded } = freshState;
    let cleanupSlot = {};
    let devModsReloadTracker = createDevModsReloadTracker(folder, {
      watchRoot: watchDevModsFolder,
      loaded: loaded ?? [],
      listChildren: listDirChildren,
      refusal: devModsOffReason,
      ask: async (folder, signal) => {
        let answer = await requestDevModsConsent(folder, signal);
        if (answer !== "no_one_to_ask" && answer !== "retry") skillWatchStateClearSlot.set(undefined);
        if (answer === "decline")
          enqueueDevModsNotice(folder, {
            kind: "declined",
          });
        return answer;
      },
      enable: async (folder, timing) =>
        enqueueDevModsNotice(folder, await joinDevModsPluginDir(folder), timing()),
      deferred: () => uiLog(MODS, DEFERRED_NOTICE),
      unanswered: () => enqueueDevModsNotice(folder, UNANSWERED_OUTCOME),
      stopped: (outcome) => {
        cleanupSlot.release?.();
        markDevModsWatchState(folder, outcome);
        reportOutcome(folder, outcome);
      },
      clock: WATCH_CLOCK,
      turn: TURN_STATE_PROBE,
      quietMs: CONSENT_DIALOG_DELAY_MS,
    });
    skillWatchStateByHost.set({
      stage: "watching",
      folder,
      watch: devModsReloadTracker,
      ...(loaded !== undefined && {
        loaded,
      }),
    });
    cleanupSlot.release = registerCleanup(() => devModsReloadTracker.dispose());
  } catch (error) {
    logForDebugging(`dev mods: the watch did not start: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-c3nwd9gm.js:14675-14778 placement
function isFileSafe(filePath) {
  try {
    return (
      statSync(filePath, {
        throwIfNoEntry: false,
      })?.isFile() === true
    );
  } catch (error) {
    if (isFsInaccessible(error)) return false;
    throw error;
  }
}
//@ chunk-c3nwd9gm.js:14778-14983 placement
function listDevModDirs(folder) {
  try {
    return readdirSync(folder, {
      withFileTypes: true,
    })
      .filter((entry) => (entry.isDirectory() || entry.isSymbolicLink()) && isNotDotPrefixed(entry.name))
      .map((entry) => entry.name)
      .filter((childName) => isFileSafe(join(folder, childName, PLUGIN_MANIFEST_PATH)))
      .toSorted();
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-c3nwd9gm.js:14983-15494 placement
async function initDevModsState(folder) {
  try {
    let children = listDevModDirs(folder);
    if (children === undefined || children.length === 0) {
      let canAsk = children !== undefined && canAskForConsent();
      skillWatchStateByHost.set(
        canAsk
          ? {
              stage: "wanted",
              folder,
              loaded: children,
            }
          : undefined,
      );
      await startDevModsIfWanted();
      return;
    }
    skillWatchStateByHost.set({
      stage: "wanted",
      folder,
      loaded: children,
    });
    pluginDirWatchSlot.set(mergePluginDirs(pluginDirWatchSlot.get() ?? [], [folder]));
    await pendingReloadSlot.get()?.joinPluginDir(folder);
    installTurnEndTouch();
    await touchPath(folder);
    await sleep(0);
    await notifyDevModsReload(folder, await reloadBoundPlugins());
    logFeatureOk("plugin_dev_mods", {
      loaded_at_start: true,
    });
    await startDevModsIfWanted();
  } catch (error) {
    let state = skillWatchStateByHost.get();
    if ((state?.stage === "wanted" || state?.stage === "present") && state.folder === folder) {
      skillWatchStateByHost.set({
        stage: "wanted",
        folder,
      });
      startDevModsIfWanted();
    }
    reportDevModsFailure(folder, error, "load_failed");
  }
}
//@ chunk-c3nwd9gm.js:15494-15816 placement
function resumeDevModsWatching() {
  try {
    let state = skillWatchStateByHost.get();
    switch (state?.stage) {
      case "consented":
        if (currentRefusal() === undefined) joinDevModsPluginDir(state.folder);
        return;
      case "present":
        if (currentRefusal() === undefined) initDevModsState(state.folder);
        return;
      case "wanted":
        startDevModsIfWanted();
        return;
      case "enabled":
        touchPath(state.folder);
        return;
      case undefined:
      case "watching":
      case "off":
        return;
    }
  } catch (error) {
    logForDebugging(`dev mods: the catch-up failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-c3nwd9gm.js:15816-16211 placement
async function switchDevModsFolder() {
  let previousState = skillWatchStateByHost.get();
  let folder = devModsFolderFor(getSessionId());
  try {
    if (previousState?.stage === "watching" && previousState.folder !== folder)
      await previousState.watch.dispose();
    let state = skillWatchStateByHost.get();
    let wrongFolder = state !== undefined && state.folder !== folder;
    let needsRestart =
      state === undefined || state.stage === "off" || (state.stage === "watching" && state.watch.isClosed());
    if (wrongFolder || needsRestart)
      skillWatchStateByHost.set({
        stage: "wanted",
        folder,
      });
    pluginDirsOverride.set(resumeDevModsWatching);
    if (devModsOffReason() === undefined) await startDevModsIfWanted();
  } catch (error) {
    logForDebugging(`dev mods: handing out ${folder} started nothing: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return folder;
}
//@ chunk-c3nwd9gm.js:16211-16243 placement
var DEV_MODS_DIR_PLACEHOLDER = "${CLAUDE_DEV_MODS_DIR}";
//@ chunk-c3nwd9gm.js:16243-16385 placement
async function expandDevModsPlaceholder(text, options) {
  let { DEV_MODS_PLACEHOLDER } = devModsDialogNamespace;
  if (!text.includes(DEV_MODS_PLACEHOLDER)) return text;
  let folder = options.isPreload ? devModsFolderFor(getSessionId()) : await switchDevModsFolder();
  return text.replaceAll(DEV_MODS_PLACEHOLDER, folder);
}
//@ chunk-c3nwd9gm.js:16385-16628 placement
function resumeDevModsForSession() {
  let folder = devModsFolderFor(getSessionId());
  let state = skillWatchStateByHost.get();
  if (state !== undefined && state.folder === folder && state.stage !== "off") return;
  if (state?.stage === "watching")
    state.watch
      .dispose()
      .catch((error) => logForDebugging(`dev mods: the watch did not close: ${errorMessage(error)}`));
  skillWatchStateByHost.set({
    stage: "present",
    folder,
  });
  pluginDirsOverride.set(resumeDevModsWatching);
  resumeDevModsWatching();
}
//@ chunk-c3nwd9gm.js:16660-17057 placement
/**
 * 注册 ${CLAUDE_DEV_MODS_DIR} 占位展开器，并按当前会话 dev mods 目录同步状态。
 */
function installDevModsPlaceholderExpander() {
  skillWatchStateSlot.set(expandDevModsPlaceholder);
  try {
    let currentSessionDevModsFolder = getCurrentSessionDevModsFolder();
    let state = skillWatchStateByHost.get();
    if (!(
      currentSessionDevModsFolder !== undefined &&
      isSessionFileAt(currentSessionDevModsFolder, getSessionId()) &&
      !(state?.stage === "enabled" && state.folder === currentSessionDevModsFolder)
    )) {
      resumeDevModsForSession();
      return;
    }
    if (state?.stage === "watching")
      state.watch
        .dispose()
        .catch((error) => logForDebugging(`dev mods: the watch did not close: ${errorMessage(error)}`));
    skillWatchStateByHost.set({
      stage: "consented",
      folder: currentSessionDevModsFolder,
    });
    pluginDirsOverride.set(resumeDevModsWatching);
    if (devModsOffReason() === undefined) {
      mkdirSync(currentSessionDevModsFolder, {
        recursive: true,
      });
      resumeDevModsWatching();
    }
  } catch (error) {
    logForDebugging(`dev mods: the restore failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
export {
  installDevModsPlaceholderExpander,
  DEV_MODS_DIR_PLACEHOLDER,
  NO_ONE_TO_ASK_TEXT,
  expandDevModsPlaceholder,
};
