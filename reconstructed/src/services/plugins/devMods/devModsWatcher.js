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
import { basename, join, join as join_2 } from "path";
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
import { skillWatchStateByHost, VVs, D$o, KVs } from "../../../skills/skillChangeWatch.js";
import {
  TURN_STATE_PROBE,
  listDirChildren,
  collectPluginDirRoots,
  sgn,
  createWatchIgnorer,
  rmn,
  WATCH_CLOCK,
} from "../../../plugins/functionHooks/devModsWatch.js";
import {
  ipe,
  QKt,
  reportPluginProblem,
  uiLog,
  pluginDirsOverride,
} from "../../../plugins/functionHooks/hooksWorkerClient.js";
import { MODS, describeModPresence } from "../../../plugins/functionHooks/devModsNotices.js";
import { describeReloadFailure, describeDirChanges } from "../../../plugins/functionHooks/devModsStatus.js";
import { loadAllPluginsCacheOnly } from "../../../utils/plugins/pluginLoader.js";
import { R8n, Yue } from "../../../plugins/functionHooks/pluginLifecycle.js";
import { lp } from "../../../plugins/functionHooks/surfaceBinding.js";
import { mergePluginDirs } from "../../../utils/plugins/pluginDirsEnv.js";
import { sleep } from "../../../utils/sleep.js";
import { saveDevModsFolder, getCurrentSessionDevModsFolder, sjt } from "../../../utils/sessionStorage.js";
import { p2r, f2r } from "../../../plugins/functionHooks/hooksWorkerHost.js";
import { kb, enqueuePendingNotification } from "../../../utils/messageQueueManager.js";
import { Ok } from "../../../../vendor/chokidar/index.js";
import { canAskForConsent, requestDevModsConsent, devModsFolderFor } from "./devModsConsent.js";
import { CONSENT_DIALOG_DELAY_MS, N } from "./DevModsConsentDialog.js";
import { registerCleanup } from "../../../utils/cleanupRegistry.js";
import { x3n } from "../../../utils/plugins/pluginManifestRead.js";
import { PLUGIN_MANIFEST_PATH } from "../../../utils/plugins/commandSource.js";

//@ chunk-zhrgwca4.js:3625-4128 placement
var DEV_MODS_REFUSAL_CHECKS = [
  { refusal: "diskless", isRefused: isDiskless },
  { refusal: "hooks_modules_off", isRefused: () => !areHooksModulesAllowed() },
  { refusal: "all_hooks_disabled", isRefused: shouldDisableAllHooksIncludingManaged },
  { refusal: "sideload_disabled", isRefused: areSideloadFlagsDisabledByPolicy },
  { refusal: "local_dirs_blocked", isRefused: () => !areLocalPluginDirsAllowedByPolicy() },
  {
    refusal: "managed_hooks_only",
    isRefused: () => getSettingsForSource("policySettings")?.allowManagedHooksOnly === !0,
  },
  { refusal: "hooks_disabled_in_settings", isRefused: shouldAllowManagedHooksOnlyByPolicy },
  { refusal: "safe_mode", isRefused: isSafeMode },
  { refusal: "bare_mode", isRefused: () => isCustomizationDisabled("hooks") },
  { refusal: "untrusted", isRefused: () => !isProjectScopeTrustAccepted() },
];
//@ chunk-zhrgwca4.js:4128-4185 placement
function y() {
  return DEV_MODS_REFUSAL_CHECKS.find((o) => o.isRefused())?.refusal;
}
//@ chunk-zhrgwca4.js:4185-4306 placement
function devModsOffReason() {
  let o = y();
  if (o !== void 0)
    (logFeatureSad("plugin_dev_mods", o), logForDebugging(`dev mods: mod hot-reloading is off here (${o})`));
  return o;
}
//@ chunk-zhrgwca4.js:4343-4352 placement
var _o = 3;
/**
 * 跟踪 dev mods 目录变化并决定何时热重载、何时报告加载/拒绝结果。
 */
//@ chunk-zhrgwca4.js:4352-6491 placement
function createDevModsReloadTracker(o, e) {
  let r = new Set(),
    s = new Set(e.loaded),
    n = !1,
    i = !1,
    a = !1,
    u,
    l = 0,
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
    w = !1,
    q = 0,
    z = !1,
    P = !1,
    G = !1,
    D = !1,
    W,
    watchRoot = e.watchRoot(o, () => {
      ((n = !0), no());
    }),
    onBegin = e.turn.onBegin(() => {
      ((l += 1), (z = e.turn.isPersonTurn()));
    }),
    onEnd = e.turn.onEnd((p) => void Z(() => Ko(p ? "wait" : "wake")));
  function so() {
    (W?.(), (W = void 0));
  }
  function no() {
    if (D || i) return;
    if ((so(), e.turn.isRunning())) {
      Z(H);
      return;
    }
    W = e.clock.setTimeout(() => void Z(H), e.quietMs);
  }
  async function Z(p) {
    try {
      await p();
    } catch (error) {
      logForDebugging(`dev mods: the watch on ${o} failed: ${errorMessage(error)}`, { level: "error" });
    }
  }
  async function Ko(p) {
    if (a) {
      a = !1;
      for (let h of (await e.listChildren(o)) ?? []) r.add(h);
    }
    if (i) {
      await io(p);
      return;
    }
    if (w) ((w = !1), await H());
  }
  async function io(p) {
    if (D) return;
    if (e.refusal()) {
      (await E(), e.stopped("refused"));
      return;
    }
    let h = p,
      onBegin = e.turn.onBegin(() => {
        h = "wait";
      }),
      onEnd = e.turn.onEnd((A) => {
        h = A ? "wait" : "wake";
      });
    try {
      await Promise.all([E(), e.enable(o, () => h)]);
    } finally {
      (onBegin(), onEnd());
    }
    e.stopped("enabled");
  }
  async function H() {
    W = void 0;
    let p = e.turn.isRunning() && n && NEGATIVE_INFINITY === Number.NEGATIVE_INFINITY,
      h = D || i,
      oo = e.turn.isRunning() && !p;
    if (h || G || oo || NEGATIVE_INFINITY === l) {
      w = !h;
      return;
    }
    G = !0;
    let I = !1;
    try {
      let A = p ? [] : ((await e.listChildren(o)) ?? []).filter((C) => !r.has(C)),
        Bo = p || (A.length > 0 && (n || A.some((C) => !s.has(C))));
      if (D || !Bo) return;
      if (e.turn.isRunning() && !p) {
        w = !0;
        return;
      }
      if (e.refusal()) {
        (await E(), e.stopped("refused"));
        return;
      }
      ((NEGATIVE_INFINITY = l), (z = !1));
      let abortController = new AbortController();
      u = abortController;
      let mo = await e.ask(o, abortController.signal).finally(() => {
        u = void 0;
      });
      if (D) return;
      switch (mo) {
        case "enable":
          if (e.turn.isRunning() && !e.refusal()) {
            ((i = !0), e.deferred());
            return;
          }
          await io("wake");
          return;
        case "decline": {
          ((P = !1), (q = 0), (a = e.turn.isRunning()));
          let listChildren = await e.listChildren(o);
          for (let Vo of [...A, ...(listChildren ?? [])]) r.add(Vo);
          return;
        }
        case "withdrawn":
          if (!P) ((P = !0), e.unanswered());
          w = !0;
          return;
        case "retry":
          w = !0;
          return;
        case "closed":
        case "unpicked":
          if (!P) ((P = !0), e.unanswered());
          if (!z) q += 1;
          if (q >= _o) {
            (await E(), e.stopped("no_pick"));
            return;
          }
          if (mo === "unpicked") {
            ((NEGATIVE_INFINITY = e.turn.isRunning() ? l - 1 : l), (w = !0));
            return;
          }
          ((NEGATIVE_INFINITY = l - 1), (I = !0));
          break;
        case "no_one_to_ask":
          (await E(), e.stopped("no_one_to_ask"));
          return;
      }
    } finally {
      G = !1;
    }
    if (I) await H();
  }
  async function E() {
    if (D) return;
    ((D = !0), (w = !1), so(), u?.abort(), onBegin(), onEnd(), await watchRoot.close());
  }
  return (no(), { declined: () => [...r], isClosed: () => D, dispose: E });
}
//@ chunk-zhrgwca4.js:6491-6551 placement
var Mo = "This session's mods will load once this turn ends.";
//@ chunk-zhrgwca4.js:6551-6828 placement
function markDevModsWatchState(o, e) {
  let r = skillWatchStateByHost.get();
  if (r?.stage !== "watching" || r.folder !== o) return;
  switch (e) {
    case "refused":
      skillWatchStateByHost.set({
        stage: "wanted",
        folder: o,
        ...(r.loaded !== void 0 && { loaded: r.loaded }),
      });
      return;
    case "no_one_to_ask":
    case "no_pick":
      skillWatchStateByHost.set({ stage: "off", folder: o });
      return;
    case "enabled":
      return;
  }
}
//@ chunk-zhrgwca4.js:6866-6977 placement
async function touchPath(o) {
  let date = new Date();
  await utimes(o, date, date).catch((r) =>
    logForDebugging(`dev mods: ${o} keeps its old time: ${errorMessage(r)}`),
  );
}
//@ chunk-zhrgwca4.js:6977-7180 placement
function installTurnEndTouch() {
  if (VVs.get() !== void 0) return;
  VVs.set(
    TURN_STATE_PROBE.onEnd(() => {
      try {
        for (let o of [...(ipe.get() ?? []), ...(QKt.get() ?? [])]) touchPath(o);
      } catch (error) {
        logForDebugging(`dev mods: the turn-end refresh failed: ${errorMessage(error)}`, { level: "error" });
      }
    }),
  );
}
//@ chunk-zhrgwca4.js:7213-7395 placement
function reportDevModsFailure(o, e, r) {
  let s = r === "enable_failed" ? "enabling" : "loading";
  return (
    reportPluginProblem(MODS, describeReloadFailure(basename(o), e)),
    logFeatureBad("plugin_dev_mods", r),
    logForDebugging(`dev mods: ${s} ${o} failed: ${errorMessage(e)}`, { level: "error" }),
    "failed"
  );
}
//@ chunk-zhrgwca4.js:7395-7506 placement
function emptyReloadResult(o, e, r) {
  return { root: o, before: new Map(), after: r.after, present: r.present, unserved: r.unserved, outcome: e };
}
//@ chunk-zhrgwca4.js:7506-7825 placement
async function reloadDevModsPlugins(o, e, r) {
  let s = (await listDirChildren(o)) ?? [],
    i =
      e === "reloaded"
        ? await loadAllPluginsCacheOnly(r.storageV5, r.credentials)
        : { enabled: [], disabled: [] },
    [a] = collectPluginDirRoots([...i.enabled, ...i.disabled], [o]);
  for (let u of describeDirChanges(
    emptyReloadResult(o, e, {
      present: s,
      after: a?.loaded ?? new Map(),
      unserved: a?.unserved ?? new Set(),
    }),
    describeModPresence,
    (l) => R8n.get()?.isUnloaded(l) ?? !1,
  ))
    uiLog(u.plugin, u.text);
}
//@ chunk-zhrgwca4.js:7825-8043 placement
async function notifyDevModsReload(o, e) {
  let r = lp()?.toolContext(new AbortController());
  await reloadDevModsPlugins(o, e, { storageV5: r?.storageV5, credentials: r?.credentials }).catch((s) =>
    logForDebugging(`dev mods: the lines for ${o} were not told: ${errorMessage(s)}`, { level: "error" }),
  );
}
//@ chunk-zhrgwca4.js:8043-8659 placement
async function joinDevModsPluginDir(o) {
  try {
    await Yue.get()?.joinPluginDir(o);
  } catch (error) {
    let r = skillWatchStateByHost.get();
    if ((r?.stage === "watching" || r?.stage === "consented") && r.folder === o)
      skillWatchStateByHost.set({
        stage: "wanted",
        folder: o,
        ...(r.stage === "watching" && r.loaded !== void 0 && { loaded: r.loaded }),
      });
    return (reportDevModsFailure(o, error, "enable_failed"), { kind: "off", reason: errorMessage(error) });
  }
  try {
    (skillWatchStateByHost.set({ stage: "enabled", folder: o }),
      ipe.set(mergePluginDirs(ipe.get() ?? [], [o])),
      installTurnEndTouch(),
      await touchPath(o),
      await sleep(0));
    let e = lp()?.toolContext(new AbortController());
    saveDevModsFolder(o, e?.storageV5);
    let r = await sgn();
    return (
      await notifyDevModsReload(o, r),
      logFeatureOk("plugin_dev_mods", { enabled: !0 }),
      { kind: "enabled", load: r }
    );
  } catch (error) {
    return { kind: "enabled", load: reportDevModsFailure(o, error, "enable_failed") };
  }
}
//@ chunk-zhrgwca4.js:8659-9460 placement
function devModsLoadedNotice(o, e) {
  switch (e) {
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
var to = (o, e) => p2r(devModsOutcomeNotice(o, e));
//@ chunk-zhrgwca4.js:10279-10305 placement
var Y = { kind: "unanswered" };
//@ chunk-zhrgwca4.js:10305-10527 placement
function enqueueDevModsNotice(o, e, r = "wake") {
  let s = e.kind === "enabled",
    n = s && r === "wake";
  if (s) kb((i) => i.value === to(o, Y));
  enqueuePendingNotification({
    agentId: mainAgentId(),
    value: to(o, e),
    mode: "task-notification",
    skipAttachments: !0,
    isMeta: f2r,
    ...(!n && { passive: !0 }),
    priority: "next",
  });
}
//@ chunk-zhrgwca4.js:10527-10559 placement
var NO_ONE_TO_ASK_TEXT = "nobody could be asked";
//@ chunk-zhrgwca4.js:10559-10637 placement
function Q(o) {
  if (D$o.get() === o) return;
  (D$o.set(o), enqueueDevModsNotice(o, { kind: "off", reason: NO_ONE_TO_ASK_TEXT }));
}
//@ chunk-zhrgwca4.js:10637-10683 placement
var Oo = "the question got no pick three times";
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
      if (e === void 0) return;
      return { kind: "off", reason: DEV_MODS_REFUSAL_TEXT[e] };
    case "no_one_to_ask":
      return { kind: "off", reason: NO_ONE_TO_ASK_TEXT };
    case "no_pick":
      return { kind: "off", reason: Oo };
  }
}
//@ chunk-zhrgwca4.js:11504-11591 placement
function Co(o, e) {
  let r = devModsStateFor(e, y());
  if (e === "no_one_to_ask") Q(o);
  else if (r !== void 0) enqueueDevModsNotice(o, r);
}
//@ chunk-zhrgwca4.js:11591-11976 placement
function watchDevModsFolder(o, e) {
  let watch = Ok.watch(o, {
      persistent: !0,
      ignoreInitial: !0,
      followSymlinks: !1,
      ignorePermissionErrors: !0,
      ignored: createWatchIgnorer(o, getDebugLogPath(), () => !1),
      usePolling: !0,
      interval: rmn,
      binaryInterval: rmn,
    }),
    s = () => e();
  return (
    watch.on("add", s),
    watch.on("addDir", s),
    watch.on("change", s),
    watch.on("unlink", s),
    watch.on("unlinkDir", s),
    watch.on("error", (n) =>
      logForDebugging(`dev mods: the watch on ${o}: ${errorMessage(n)}`, { level: "warn" }),
    ),
    { close: () => watch.close() }
  );
}
/**
 * 在用户希望开启且尚未运行时，检查条件后请求同意并开始监视 dev mods 目录。
 */
//@ chunk-zhrgwca4.js:11976-12836 placement
async function startDevModsIfWanted() {
  try {
    let o = skillWatchStateByHost.get();
    if (o?.stage !== "wanted") return;
    if (y() !== void 0) return;
    if (!canAskForConsent()) {
      if (
        (logFeatureSad("plugin_dev_mods", "no_one_to_ask"),
        skillWatchStateByHost.set({ stage: "off", folder: o.folder }),
        o.loaded === void 0)
      )
        Q(o.folder);
      return;
    }
    await mkdir(o.folder, { recursive: !0 });
    let e = skillWatchStateByHost.get();
    if (e?.stage !== "wanted") return;
    let { folder: folder, loaded: loaded } = e,
      n = {},
      i = createDevModsReloadTracker(folder, {
        watchRoot: watchDevModsFolder,
        loaded: loaded ?? [],
        listChildren: listDirChildren,
        refusal: devModsOffReason,
        ask: async (a, u) => {
          let l = await requestDevModsConsent(a, u);
          if (l !== "no_one_to_ask" && l !== "retry") D$o.set(void 0);
          if (l === "decline") enqueueDevModsNotice(a, { kind: "declined" });
          return l;
        },
        enable: async (a, u) => enqueueDevModsNotice(a, await joinDevModsPluginDir(a), u()),
        deferred: () => uiLog(MODS, Mo),
        unanswered: () => enqueueDevModsNotice(folder, Y),
        stopped: (a) => {
          (n.release?.(), markDevModsWatchState(folder, a), Co(folder, a));
        },
        clock: WATCH_CLOCK,
        turn: TURN_STATE_PROBE,
        quietMs: CONSENT_DIALOG_DELAY_MS,
      });
    (skillWatchStateByHost.set({
      stage: "watching",
      folder: folder,
      watch: i,
      ...(loaded !== void 0 && { loaded: loaded }),
    }),
      (n.release = registerCleanup(() => i.dispose())));
  } catch (error) {
    logForDebugging(`dev mods: the watch did not start: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-zhrgwca4.js:12930-13033 placement
function isFileSafe(o) {
  try {
    return statSync(o, { throwIfNoEntry: !1 })?.isFile() === !0;
  } catch (error) {
    if (isFsInaccessible(error)) return !1;
    throw error;
  }
}
//@ chunk-zhrgwca4.js:13033-13238 placement
function listDevModDirs(o) {
  try {
    return readdirSync(o, { withFileTypes: !0 })
      .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && x3n(e.name))
      .map((e) => e.name)
      .filter((e) => isFileSafe(join_2(o, e, PLUGIN_MANIFEST_PATH)))
      .toSorted();
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-zhrgwca4.js:13238-13749 placement
async function initDevModsState(o) {
  try {
    let e = listDevModDirs(o);
    if (e === void 0 || e.length === 0) {
      let r = e !== void 0 && canAskForConsent();
      (skillWatchStateByHost.set(r ? { stage: "wanted", folder: o, loaded: e } : void 0),
        await startDevModsIfWanted());
      return;
    }
    (skillWatchStateByHost.set({ stage: "wanted", folder: o, loaded: e }),
      QKt.set(mergePluginDirs(QKt.get() ?? [], [o])),
      await Yue.get()?.joinPluginDir(o),
      installTurnEndTouch(),
      await touchPath(o),
      await sleep(0),
      await notifyDevModsReload(o, await sgn()),
      logFeatureOk("plugin_dev_mods", { loaded_at_start: !0 }),
      await startDevModsIfWanted());
  } catch (error) {
    let r = skillWatchStateByHost.get();
    if ((r?.stage === "wanted" || r?.stage === "present") && r.folder === o)
      (skillWatchStateByHost.set({ stage: "wanted", folder: o }), startDevModsIfWanted());
    reportDevModsFailure(o, error, "load_failed");
  }
}
//@ chunk-zhrgwca4.js:13749-14071 placement
function resumeDevModsWatching() {
  try {
    let o = skillWatchStateByHost.get();
    switch (o?.stage) {
      case "consented":
        if (y() === void 0) joinDevModsPluginDir(o.folder);
        return;
      case "present":
        if (y() === void 0) initDevModsState(o.folder);
        return;
      case "wanted":
        startDevModsIfWanted();
        return;
      case "enabled":
        touchPath(o.folder);
        return;
      case void 0:
      case "watching":
      case "off":
        return;
    }
  } catch (error) {
    logForDebugging(`dev mods: the catch-up failed: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-zhrgwca4.js:14071-14466 placement
async function switchDevModsFolder() {
  let o = skillWatchStateByHost.get(),
    e = devModsFolderFor(getSessionId());
  try {
    if (o?.stage === "watching" && o.folder !== e) await o.watch.dispose();
    let r = skillWatchStateByHost.get(),
      s = r !== void 0 && r.folder !== e,
      n = r === void 0 || r.stage === "off" || (r.stage === "watching" && r.watch.isClosed());
    if (s || n) skillWatchStateByHost.set({ stage: "wanted", folder: e });
    if ((pluginDirsOverride.set(resumeDevModsWatching), devModsOffReason() === void 0))
      await startDevModsIfWanted();
  } catch (error) {
    logForDebugging(`dev mods: handing out ${e} started nothing: ${errorMessage(error)}`, { level: "error" });
  }
  return e;
}
//@ chunk-zhrgwca4.js:14466-14498 placement
var DEV_MODS_DIR_PLACEHOLDER = "${CLAUDE_DEV_MODS_DIR}";
//@ chunk-zhrgwca4.js:14498-14640 placement
async function expandDevModsPlaceholder(o, e) {
  let { DEV_MODS_PLACEHOLDER: DEV_MODS_PLACEHOLDER } = N;
  if (!o.includes(DEV_MODS_PLACEHOLDER)) return o;
  let s = e.isPreload ? devModsFolderFor(getSessionId()) : await switchDevModsFolder();
  return o.replaceAll(DEV_MODS_PLACEHOLDER, s);
}
//@ chunk-zhrgwca4.js:14640-14883 placement
function resumeDevModsForSession() {
  let o = devModsFolderFor(getSessionId()),
    e = skillWatchStateByHost.get();
  if (e !== void 0 && e.folder === o && e.stage !== "off") return;
  if (e?.stage === "watching")
    e.watch.dispose().catch((s) => logForDebugging(`dev mods: the watch did not close: ${errorMessage(s)}`));
  (skillWatchStateByHost.set({ stage: "present", folder: o }),
    pluginDirsOverride.set(resumeDevModsWatching),
    resumeDevModsWatching());
}
/**
 * 注册 ${CLAUDE_DEV_MODS_DIR} 占位展开器，并按当前会话 dev mods 目录同步状态。
 */
//@ chunk-zhrgwca4.js:14915-15312 placement
function installDevModsPlaceholderExpander() {
  KVs.set(expandDevModsPlaceholder);
  try {
    let o = getCurrentSessionDevModsFolder(),
      e = skillWatchStateByHost.get();
    if (!(o !== void 0 && sjt(o, getSessionId()) && !(e?.stage === "enabled" && e.folder === o))) {
      resumeDevModsForSession();
      return;
    }
    if (e?.stage === "watching")
      e.watch
        .dispose()
        .catch((s) => logForDebugging(`dev mods: the watch did not close: ${errorMessage(s)}`));
    if (
      (skillWatchStateByHost.set({ stage: "consented", folder: o }),
      pluginDirsOverride.set(resumeDevModsWatching),
      devModsOffReason() === void 0)
    )
      (mkdirSync(o, { recursive: !0 }), resumeDevModsWatching());
  } catch (error) {
    logForDebugging(`dev mods: the restore failed: ${errorMessage(error)}`, { level: "error" });
  }
}

export {
  installDevModsPlaceholderExpander,
  NO_ONE_TO_ASK_TEXT,
  expandDevModsPlaceholder,
  DEV_MODS_DIR_PLACEHOLDER,
};
