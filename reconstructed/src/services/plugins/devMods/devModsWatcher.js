/**
 * services/plugins/devMods/devModsWatcher.ts
 *
 * 2.1.316 新增：dev mods 目录监视与热重载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zhrgwca4.js (36)
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
  reportPluginProblem,
  uiLog,
  pluginDirsOverride,
} from "../../../plugins/functionHooks/hooksWorkerClient.js";
import { MODS, describeModPresence } from "../../../plugins/functionHooks/devModsNotices.js";
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
import { hookNoticeTask, TASK_NOTICE_IS_META } from "../../../plugins/functionHooks/hooksWorkerHost.js";
import { removeQueuedByFilter, enqueuePendingNotification } from "../../../utils/messageQueueManager.js";
import { chokidar_default } from "../../../../vendor/chokidar/index.js";
import { canAskForConsent, requestDevModsConsent, devModsFolderFor } from "./devModsConsent.js";
import { CONSENT_DIALOG_DELAY_MS, devModsDialogNamespace } from "./DevModsConsentDialog.js";
import { registerCleanup } from "../../../utils/cleanupRegistry.js";
import { isNotDotPrefixed } from "../../../utils/plugins/pluginManifestRead.js";
import { PLUGIN_MANIFEST_PATH } from "../../../utils/plugins/commandSource.js";

//@ chunk-zhrgwca4.js:3625-4128 placement
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
//@ chunk-zhrgwca4.js:4128-4185 placement
/**
 * 取当前生效的拒绝原因（没有返回 undefined）。
 */
function currentRefusal() {
  return DEV_MODS_REFUSAL_CHECKS.find((o) => o.isRefused())?.refusal;
}
//@ chunk-zhrgwca4.js:4185-4306 placement
function devModsOffReason() {
  let o = currentRefusal();
  if (o !== undefined) {
    logFeatureSad("plugin_dev_mods", o);
    logForDebugging(`dev mods: mod hot-reloading is off here (${o})`);
  }
  return o;
}
//@ chunk-zhrgwca4.js:4343-4352 placement
/**
 * 同一轮最多重载次数（3）。
 */
var MAX_RELOADS = 3;
//@ chunk-zhrgwca4.js:4352-6491 placement
/**
 * 跟踪 dev mods 目录变化并决定何时热重载、何时报告加载/拒绝结果。
 */
function createDevModsReloadTracker(folder, e) {
  let r = new Set();
  let s = new Set(e.loaded);
  let n = false;
  let i = false;
  let a = false;
  let u;
  let l = 0;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let w = false;
  let q = 0;
  let z = false;
  let P = false;
  let G = false;
  let D = false;
  let W;
  let Uo = e.watchRoot(folder, () => {
    n = true;
    no();
  });
  let $o = e.turn.onBegin(() => {
    l += 1;
    z = e.turn.isPersonTurn();
  });
  let jo = e.turn.onEnd((p) => void Z(() => Ko(p ? "wait" : "wake")));
  function so() {
    W?.();
    W = undefined;
  }
  function no() {
    if (D || i) return;
    so();
    if (e.turn.isRunning()) {
      Z(H);
      return;
    }
    W = e.clock.setTimeout(() => void Z(H), e.quietMs);
  }
  async function Z(p) {
    try {
      await p();
    } catch (error) {
      logForDebugging(`dev mods: the watch on ${folder} failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  async function Ko(p) {
    if (a) {
      a = false;
      for (let h of (await e.listChildren(folder)) ?? []) r.add(h);
    }
    if (i) {
      await io(p);
      return;
    }
    if (w) {
      w = false;
      await H();
    }
  }
  async function io(p) {
    if (D) return;
    if (e.refusal()) {
      await E();
      e.stopped("refused");
      return;
    }
    let h = p;
    let oo = e.turn.onBegin(() => {
      h = "wait";
    });
    let I = e.turn.onEnd((A) => {
      h = A ? "wait" : "wake";
    });
    try {
      await Promise.all([E(), e.enable(folder, () => h)]);
    } finally {
      oo();
      I();
    }
    e.stopped("enabled");
  }
  async function H() {
    W = undefined;
    let p = e.turn.isRunning() && n && NEGATIVE_INFINITY === Number.NEGATIVE_INFINITY;
    let h = D || i;
    let oo = e.turn.isRunning() && !p;
    if (h || G || oo || NEGATIVE_INFINITY === l) {
      w = !h;
      return;
    }
    G = true;
    let I = false;
    try {
      let A = p ? [] : ((await e.listChildren(folder)) ?? []).filter((C) => !r.has(C));
      let Bo = p || (A.length > 0 && (n || A.some((C) => !s.has(C))));
      if (D || !Bo) return;
      if (e.turn.isRunning() && !p) {
        w = true;
        return;
      }
      if (e.refusal()) {
        await E();
        e.stopped("refused");
        return;
      }
      NEGATIVE_INFINITY = l;
      z = false;
      let abortController = new AbortController();
      u = abortController;
      let mo = await e.ask(folder, abortController.signal).finally(() => {
        u = undefined;
      });
      if (D) return;
      switch (mo) {
        case "enable":
          if (e.turn.isRunning() && !e.refusal()) {
            i = true;
            e.deferred();
            return;
          }
          await io("wake");
          return;
        case "decline": {
          P = false;
          q = 0;
          a = e.turn.isRunning();
          let C = await e.listChildren(folder);
          for (let Vo of [...A, ...(C ?? [])]) r.add(Vo);
          return;
        }
        case "withdrawn":
          if (!P) {
            P = true;
            e.unanswered();
          }
          w = true;
          return;
        case "retry":
          w = true;
          return;
        case "closed":
        case "unpicked":
          if (!P) {
            P = true;
            e.unanswered();
          }
          if (!z) q += 1;
          if (q >= MAX_RELOADS) {
            await E();
            e.stopped("no_pick");
            return;
          }
          if (mo === "unpicked") {
            NEGATIVE_INFINITY = e.turn.isRunning() ? l - 1 : l;
            w = true;
            return;
          }
          NEGATIVE_INFINITY = l - 1;
          I = true;
          break;
        case "no_one_to_ask":
          await E();
          e.stopped("no_one_to_ask");
          return;
      }
    } finally {
      G = false;
    }
    if (I) await H();
  }
  async function E() {
    if (D) return;
    D = true;
    w = false;
    so();
    u?.abort();
    $o();
    jo();
    await Uo.close();
  }
  no();
  return {
    declined: () => [...r],
    isClosed: () => D,
    dispose: E,
  };
}
//@ chunk-zhrgwca4.js:6491-6551 placement
/**
 * 本轮结束后才加载的提示。
 */
var DEFERRED_NOTICE = "This session's mods will load once this turn ends.";
//@ chunk-zhrgwca4.js:6551-6828 placement
function markDevModsWatchState(folder, e) {
  let r = skillWatchStateByHost.get();
  if (r?.stage !== "watching" || r.folder !== folder) return;
  switch (e) {
    case "refused":
      skillWatchStateByHost.set({
        stage: "wanted",
        folder,
        ...(r.loaded !== undefined && {
          loaded: r.loaded,
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
//@ chunk-zhrgwca4.js:6866-6977 placement
async function touchPath(o) {
  let date = new Date();
  await utimes(o, date, date).catch((error) =>
    logForDebugging(`dev mods: ${o} keeps its old time: ${errorMessage(error)}`),
  );
}
//@ chunk-zhrgwca4.js:6977-7180 placement
function installTurnEndTouch() {
  if (skillWatchStateResetSlot.get() !== undefined) return;
  skillWatchStateResetSlot.set(
    TURN_STATE_PROBE.onEnd(() => {
      try {
        for (let o of [...(pluginDirSlot.get() ?? []), ...(pluginDirWatchSlot.get() ?? [])]) touchPath(o);
      } catch (error) {
        logForDebugging(`dev mods: the turn-end refresh failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    }),
  );
}
//@ chunk-zhrgwca4.js:7213-7395 placement
function reportDevModsFailure(o, error, r) {
  let s = r === "enable_failed" ? "enabling" : "loading";
  reportPluginProblem(MODS, describeReloadFailure(basename(o), error));
  logFeatureBad("plugin_dev_mods", r);
  logForDebugging(`dev mods: ${s} ${o} failed: ${errorMessage(error)}`, {
    level: "error",
  });
  return "failed";
}
//@ chunk-zhrgwca4.js:7395-7506 placement
function emptyReloadResult(root, outcome, r) {
  return {
    root,
    before: new Map(),
    after: r.after,
    present: r.present,
    unserved: r.unserved,
    outcome,
  };
}
//@ chunk-zhrgwca4.js:7506-7825 placement
async function reloadDevModsPlugins(root, outcome, r) {
  let present = (await listDirChildren(root)) ?? [];
  let i =
    outcome === "reloaded"
      ? await loadAllPluginsCacheOnly(r.storageV5, r.credentials)
      : {
          enabled: [],
          disabled: [],
        };
  let [a] = collectPluginDirRoots([...i.enabled, ...i.disabled], [root]);
  for (let u of describeDirChanges(
    emptyReloadResult(root, outcome, {
      present,
      after: a?.loaded ?? new Map(),
      unserved: a?.unserved ?? new Set(),
    }),
    describeModPresence,
    (l) => reloadControllerSlot.get()?.isUnloaded(l) ?? false,
  ))
    uiLog(u.plugin, u.text);
}
//@ chunk-zhrgwca4.js:7825-8043 placement
async function notifyDevModsReload(o, e) {
  let r = currentSurfaceBinding()?.toolContext(new AbortController());
  await reloadDevModsPlugins(o, e, {
    storageV5: r?.storageV5,
    credentials: r?.credentials,
  }).catch((error) =>
    logForDebugging(`dev mods: the lines for ${o} were not told: ${errorMessage(error)}`, {
      level: "error",
    }),
  );
}
//@ chunk-zhrgwca4.js:8043-8659 placement
async function joinDevModsPluginDir(o) {
  try {
    await pendingReloadSlot.get()?.joinPluginDir(o);
  } catch (error) {
    let r = skillWatchStateByHost.get();
    if ((r?.stage === "watching" || r?.stage === "consented") && r.folder === o)
      skillWatchStateByHost.set({
        stage: "wanted",
        folder: o,
        ...(r.stage === "watching" &&
          r.loaded !== undefined && {
            loaded: r.loaded,
          }),
      });
    reportDevModsFailure(o, error, "enable_failed");
    return {
      kind: "off",
      reason: errorMessage(error),
    };
  }
  try {
    skillWatchStateByHost.set({
      stage: "enabled",
      folder: o,
    });
    pluginDirSlot.set(mergePluginDirs(pluginDirSlot.get() ?? [], [o]));
    installTurnEndTouch();
    await touchPath(o);
    await sleep(0);
    let e = currentSurfaceBinding()?.toolContext(new AbortController());
    saveDevModsFolder(o, e?.storageV5);
    let r = await reloadBoundPlugins();
    await notifyDevModsReload(o, r);
    logFeatureOk("plugin_dev_mods", {
      enabled: true,
    });
    return {
      kind: "enabled",
      load: r,
    };
  } catch (error) {
    return {
      kind: "enabled",
      load: reportDevModsFailure(o, error, "enable_failed"),
    };
  }
}
//@ chunk-zhrgwca4.js:8659-9460 placement
function devModsLoadedNotice(o, load) {
  switch (load) {
    case "reloaded":
      return `The person enabled mod hot-reloading for this session and the mods under ${o} loaded: they load and reload by themselves as their files change; the transcript names any mod that failed.`;
    case "held":
      return `The person enabled mod hot-reloading for this session, but the mods under ${o} wait for /reload-plugins (the load would rewrite the prompt cache): they are NOT loaded yet.`;
    case "unbound":
      return `The person enabled mod hot-reloading for this session, but the mods under ${o} did not load (this session cannot reload its plugins; only a restart loads them).`;
    case "failed":
      return `The person enabled mod hot-reloading for this session, but the mods under ${o} did not load (the load failed; the transcript says why, and /reload-plugins tries again).`;
  }
}
//@ chunk-zhrgwca4.js:9460-10252 placement
function devModsOutcomeNotice(o, e) {
  switch (e.kind) {
    case "enabled":
      return devModsLoadedNotice(o, e.load);
    case "declined":
      return `The person declined mod hot-reloading: what this run wrote under ${o} is written but NOT loaded (a mod that loaded when the session started keeps running as it loaded). Do not say the change is running. It loads the next time this session starts (/reload-plugins reloads only a mod that loaded at the start); the person can ask again.`;
    case "unanswered":
      return `The person has not answered the mod hot-reloading question yet; it is asked again once a turn ends. What this run wrote under ${o} is written but NOT loaded yet. Do not say it was declined, and do not suggest --plugin-dir or a restart.`;
    case "off":
      return `Mod hot-reloading is off in this session (${e.reason}): mods under ${o} are not loaded.`;
  }
}
//@ chunk-zhrgwca4.js:10252-10279 placement
/**
 * 生成结果提示。
 */
var noticeFor = (o, e) => hookNoticeTask(devModsOutcomeNotice(o, e));
//@ chunk-zhrgwca4.js:10279-10305 placement
/**
 * 表示“未回答”的结果对象。
 */
var UNANSWERED_OUTCOME = {
  kind: "unanswered",
};
//@ chunk-zhrgwca4.js:10305-10527 placement
function enqueueDevModsNotice(o, e, r = "wake") {
  let s = e.kind === "enabled";
  let n = s && r === "wake";
  if (s) removeQueuedByFilter((i) => i.value === noticeFor(o, UNANSWERED_OUTCOME));
  enqueuePendingNotification({
    agentId: mainAgentId(),
    value: noticeFor(o, e),
    mode: "task-notification",
    skipAttachments: true,
    isMeta: TASK_NOTICE_IS_META,
    ...(!n && {
      passive: true,
    }),
    priority: "next",
  });
}
//@ chunk-zhrgwca4.js:10527-10559 placement
var NO_ONE_TO_ASK_TEXT = "nobody could be asked";
//@ chunk-zhrgwca4.js:10559-10637 placement
/**
 * 记录并提示“无人可问”。
 */
function markNoOneToAsk(o) {
  if (skillWatchStateClearSlot.get() === o) return;
  skillWatchStateClearSlot.set(o);
  enqueueDevModsNotice(o, {
    kind: "off",
    reason: NO_ONE_TO_ASK_TEXT,
  });
}
//@ chunk-zhrgwca4.js:10637-10683 placement
/**
 * 连续三次未选择时的说明。
 */
var NO_PICK_TIMES_TEXT = "the question got no pick three times";
//@ chunk-zhrgwca4.js:10683-11295 placement
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
//@ chunk-zhrgwca4.js:11295-11504 placement
function devModsStateFor(o, e) {
  switch (o) {
    case "enabled":
      return;
    case "refused":
      if (e === undefined) return;
      return {
        kind: "off",
        reason: DEV_MODS_REFUSAL_TEXT[e],
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
//@ chunk-zhrgwca4.js:11504-11591 placement
/**
 * 根据结果发出相应提示。
 */
function reportOutcome(folder, e) {
  let r = devModsStateFor(e, currentRefusal());
  if (e === "no_one_to_ask") markNoOneToAsk(folder);
  else if (r !== undefined) enqueueDevModsNotice(folder, r);
}
//@ chunk-zhrgwca4.js:11591-11976 placement
function watchDevModsFolder(o, e) {
  let r = chokidar_default.watch(o, {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
    ignorePermissionErrors: true,
    ignored: createWatchIgnorer(o, getDebugLogPath(), () => false),
    usePolling: true,
    interval: WATCH_ACTIVE_POLL_MS,
    binaryInterval: WATCH_ACTIVE_POLL_MS,
  });
  let s = () => e();
  r.on("add", s);
  r.on("addDir", s);
  r.on("change", s);
  r.on("unlink", s);
  r.on("unlinkDir", s);
  r.on("error", (n) =>
    logForDebugging(`dev mods: the watch on ${o}: ${errorMessage(n)}`, {
      level: "warn",
    }),
  );
  return {
    close: () => r.close(),
  };
}
//@ chunk-zhrgwca4.js:11976-12836 placement
/**
 * 在用户希望开启且尚未运行时，检查条件后请求同意并开始监视 dev mods 目录。
 */
async function startDevModsIfWanted() {
  try {
    let o = skillWatchStateByHost.get();
    if (o?.stage !== "wanted") return;
    if (currentRefusal() !== undefined) return;
    if (!canAskForConsent()) {
      logFeatureSad("plugin_dev_mods", "no_one_to_ask");
      skillWatchStateByHost.set({
        stage: "off",
        folder: o.folder,
      });
      if (o.loaded === undefined) markNoOneToAsk(o.folder);
      return;
    }
    await mkdir(o.folder, {
      recursive: true,
    });
    let e = skillWatchStateByHost.get();
    if (e?.stage !== "wanted") return;
    let { folder, loaded } = e;
    let n = {};
    let devModsReloadTracker = createDevModsReloadTracker(folder, {
      watchRoot: watchDevModsFolder,
      loaded: loaded ?? [],
      listChildren: listDirChildren,
      refusal: devModsOffReason,
      ask: async (folder, u) => {
        let l = await requestDevModsConsent(folder, u);
        if (l !== "no_one_to_ask" && l !== "retry") skillWatchStateClearSlot.set(undefined);
        if (l === "decline")
          enqueueDevModsNotice(folder, {
            kind: "declined",
          });
        return l;
      },
      enable: async (a, u) => enqueueDevModsNotice(a, await joinDevModsPluginDir(a), u()),
      deferred: () => uiLog(MODS, DEFERRED_NOTICE),
      unanswered: () => enqueueDevModsNotice(folder, UNANSWERED_OUTCOME),
      stopped: (a) => {
        n.release?.();
        markDevModsWatchState(folder, a);
        reportOutcome(folder, a);
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
    n.release = registerCleanup(() => devModsReloadTracker.dispose());
  } catch (error) {
    logForDebugging(`dev mods: the watch did not start: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-zhrgwca4.js:12930-13033 placement
function isFileSafe(o) {
  try {
    return (
      statSync(o, {
        throwIfNoEntry: false,
      })?.isFile() === true
    );
  } catch (error) {
    if (isFsInaccessible(error)) return false;
    throw error;
  }
}
//@ chunk-zhrgwca4.js:13033-13238 placement
function listDevModDirs(o) {
  try {
    return readdirSync(o, {
      withFileTypes: true,
    })
      .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && isNotDotPrefixed(e.name))
      .map((e) => e.name)
      .filter((e) => isFileSafe(join(o, e, PLUGIN_MANIFEST_PATH)))
      .toSorted();
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-zhrgwca4.js:13238-13749 placement
async function initDevModsState(folder) {
  try {
    let e = listDevModDirs(folder);
    if (e === undefined || e.length === 0) {
      let r = e !== undefined && canAskForConsent();
      skillWatchStateByHost.set(
        r
          ? {
              stage: "wanted",
              folder,
              loaded: e,
            }
          : undefined,
      );
      await startDevModsIfWanted();
      return;
    }
    skillWatchStateByHost.set({
      stage: "wanted",
      folder,
      loaded: e,
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
    let r = skillWatchStateByHost.get();
    if ((r?.stage === "wanted" || r?.stage === "present") && r.folder === folder) {
      skillWatchStateByHost.set({
        stage: "wanted",
        folder,
      });
      startDevModsIfWanted();
    }
    reportDevModsFailure(folder, error, "load_failed");
  }
}
//@ chunk-zhrgwca4.js:13749-14071 placement
function resumeDevModsWatching() {
  try {
    let o = skillWatchStateByHost.get();
    switch (o?.stage) {
      case "consented":
        if (currentRefusal() === undefined) joinDevModsPluginDir(o.folder);
        return;
      case "present":
        if (currentRefusal() === undefined) initDevModsState(o.folder);
        return;
      case "wanted":
        startDevModsIfWanted();
        return;
      case "enabled":
        touchPath(o.folder);
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
//@ chunk-zhrgwca4.js:14071-14466 placement
async function switchDevModsFolder() {
  let o = skillWatchStateByHost.get();
  let e = devModsFolderFor(getSessionId());
  try {
    if (o?.stage === "watching" && o.folder !== e) await o.watch.dispose();
    let r = skillWatchStateByHost.get();
    let s = r !== undefined && r.folder !== e;
    let n = r === undefined || r.stage === "off" || (r.stage === "watching" && r.watch.isClosed());
    if (s || n)
      skillWatchStateByHost.set({
        stage: "wanted",
        folder: e,
      });
    pluginDirsOverride.set(resumeDevModsWatching);
    if (devModsOffReason() === undefined) await startDevModsIfWanted();
  } catch (error) {
    logForDebugging(`dev mods: handing out ${e} started nothing: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return e;
}
//@ chunk-zhrgwca4.js:14466-14498 placement
var DEV_MODS_DIR_PLACEHOLDER = "${CLAUDE_DEV_MODS_DIR}";
//@ chunk-zhrgwca4.js:14498-14640 placement
async function expandDevModsPlaceholder(o, e) {
  let { DEV_MODS_PLACEHOLDER } = devModsDialogNamespace;
  if (!o.includes(DEV_MODS_PLACEHOLDER)) return o;
  let s = e.isPreload ? devModsFolderFor(getSessionId()) : await switchDevModsFolder();
  return o.replaceAll(DEV_MODS_PLACEHOLDER, s);
}
//@ chunk-zhrgwca4.js:14640-14883 placement
function resumeDevModsForSession() {
  let o = devModsFolderFor(getSessionId());
  let e = skillWatchStateByHost.get();
  if (e !== undefined && e.folder === o && e.stage !== "off") return;
  if (e?.stage === "watching")
    e.watch
      .dispose()
      .catch((error) => logForDebugging(`dev mods: the watch did not close: ${errorMessage(error)}`));
  skillWatchStateByHost.set({
    stage: "present",
    folder: o,
  });
  pluginDirsOverride.set(resumeDevModsWatching);
  resumeDevModsWatching();
}
//@ chunk-zhrgwca4.js:14915-15312 placement
/**
 * 注册 ${CLAUDE_DEV_MODS_DIR} 占位展开器，并按当前会话 dev mods 目录同步状态。
 */
function installDevModsPlaceholderExpander() {
  skillWatchStateSlot.set(expandDevModsPlaceholder);
  try {
    let currentSessionDevModsFolder = getCurrentSessionDevModsFolder();
    let e = skillWatchStateByHost.get();
    if (!(
      currentSessionDevModsFolder !== undefined &&
      isSessionFileAt(currentSessionDevModsFolder, getSessionId()) &&
      !(e?.stage === "enabled" && e.folder === currentSessionDevModsFolder)
    )) {
      resumeDevModsForSession();
      return;
    }
    if (e?.stage === "watching")
      e.watch
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
  NO_ONE_TO_ASK_TEXT,
  expandDevModsPlaceholder,
  DEV_MODS_DIR_PLACEHOLDER,
};
