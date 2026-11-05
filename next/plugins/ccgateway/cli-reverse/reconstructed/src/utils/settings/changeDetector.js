/**
 * utils/settings/changeDetector.ts
 *
 * 设置文件变更检测：监视各来源文件与 managed-settings.d（文件事件或轮询）、定时重读 MDM，变化时发出 ConfigChange 并重新加载。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/changeDetector.ts
 * pieces: chunk-5fn9rb8r.js (1), chunk-a2q0x549.js (9)
 * attribution: callgraph-fingerprint 2, layout 3, fingerprint 3, affinity 2
 */
import * as pathModule from "path";
import { watch, readdirSync } from "fs";
import { stat, realpath } from "fs/promises";
import { withAskedWhere, mdmLoader, mdmResult, setMdmReadOutcomes } from "./mdm/mdmLoader.js";
import {
  EMPTY_MDM_SETTINGS,
  wslInheritsSettings,
  hasManagedSettingsFile,
  readMdmSnapshot,
  replaceMdmSetting,
} from "./mdm/settings.js";
import {
  SETTINGS_STABILITY_THRESHOLD_MS,
  SETTINGS_POLL_INTERVAL_MS,
  SETTINGS_MDM_POLL_INTERVAL_MS,
  SETTINGS_DELETION_GRACE_MS,
  SETTINGS_OBSERVATION_LAG_MS,
  SETTINGS_WATCH_POLL_INTERVAL_MS,
  shouldUseNativeWatch,
  probeFsWatch,
  SETTINGS_WATCH_LAG_MS,
  setDifference,
} from "../fsWatchProbe.js";
import { createSignal } from "../signal.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { getErrnoCode, errorMessage, withTelemetryMessage, toError } from "../errors.js";
import { chokidar_default } from "../../../vendor/chokidar/index.js";
import { getPlatform } from "../platform.js";
import { commandSyncNameState, invalidateCommandNames } from "./commandSyncNames.js";
import {
  clearInternalWrites,
  consumeInternalWrite,
  INTERNAL_WRITE_WINDOW_MS,
} from "../../cli/headlessCloud/attachServe.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { sleep } from "../sleep.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { seedProjectSettings } from "./settingsSeed.js";
import { logError } from "../log.js";
import { jsonStringify } from "../slowOperations.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { getSettingsFilePathForSource, getLegacyLocalSettingsFilePath } from "./settings.js";
import { USER_SETTINGS_FILE_NAMES, isInClaudeConfigHome } from "./settingsFileParsing.js";
import { SETTING_SOURCES } from "./constants.js";
import { isPathConfigDir } from "../envUtils.js";
import { getDropInDir } from "../fileStateCache.js";
import { vetRepoSettingsPath, getFsImplementation } from "../fsOperations.js";
import { hasDotSegment } from "../pathClassification.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5fn9rb8r.js:10878-10919 callgraph-fingerprint (2.1.88 match: startMdmPoll, 0.169)
function startMdmPoll() {
  return withAskedWhere(mdmLoader()).hkcu ?? EMPTY_MDM_SETTINGS;
}
//@ chunk-a2q0x549.js:24882-35080 callgraph-fingerprint (2.1.88 match: initialize, 0.217)
/**
 * 设置文件变更检测器：监视各来源设置文件与 managed-settings.d（文件事件或轮询），MDM 定时重读，变化时按来源发出 ConfigChange 事件并触发重新加载。
 */
function createSettingsChangeDetector(options) {
  let stabilityThreshold = options?.stabilityThreshold ?? SETTINGS_STABILITY_THRESHOLD_MS;
  let pollInterval = options?.pollInterval ?? SETTINGS_POLL_INTERVAL_MS;
  let mdmPollInterval = options?.mdmPollInterval ?? SETTINGS_MDM_POLL_INTERVAL_MS;
  let deletionGrace = options?.deletionGrace ?? SETTINGS_DELETION_GRACE_MS;
  let subscribedObservationLag = options?.subscribedObservationLag ?? SETTINGS_OBSERVATION_LAG_MS;
  let bridgeStore = options?.bridgeStore ?? true;
  let watchPollInterval = options?.watchPollInterval ?? SETTINGS_WATCH_POLL_INTERVAL_MS;
  let graceFor = (lag) => Math.max(deletionGrace, lag + stabilityThreshold + 200);
  let observedGrace = graceFor(subscribedObservationLag);
  let signal = createSignal();
  let watcher = null;
  let polling = false;
  let nativeOk = false;
  let probing = false;
  let watchingSince = null;
  let pollFloor = null;
  let watchCount = 0;
  let lastSeenStats = new Map();
  let statsBeforeLive = new Map();
  let watchGeneration = 0;
  let mdmTimer = null;
  let mdmSnapshot = null;
  let started = false;
  let disposed = false;
  let commandState = null;
  let commandUnsub = null;
  let pendingDeletions = new Map();
  let cleanupUnsub = null;
  let configGate;
  let sessionArg;
  let servedByV5;
  let pendingDeleteTimer = null;
  let sawChange = false;
  let recreated = false;
  let resubscribeRetried = false;
  let presence;
  let realpathMap = new Map();
  let pendingDirs = new Set();
  let creationWatchers = new Map();
  let appearedDirs = new Set();
  let readyResolve = null;
  async function initialize(bridge, session, { machineServesSession = false } = {}) {
    if (
      !shouldUseNativeWatch({
        machineServesSession,
      })
    )
      return;
    if (started || disposed) return;
    started = true;
    configGate = bridge;
    sessionArg = session;
    await startMdmPolling();
    if (disposed) return;
    cleanupUnsub = registerCleanup(dispose);
    let generation = ++watchGeneration;
    let watchTargets = await getWatchTargets(session);
    if (disposed) return;
    servedByV5 = watchTargets.servedByV5;
    if (isStorageV5Enabled() && session !== undefined && servedByV5 !== undefined) {
      await subscribeV5(session, servedByV5);
      if (disposed) return;
    }
    startWatching(watchTargets, generation);
  }
  function mode() {
    return polling ? "polling" : "native";
  }
  function probeNative() {
    if (probing || polling || disposed) return;
    probing = true;
    (options?.fsWatchProbe ?? probeFsWatch)().then((outcome) => {
      probing = false;
      if (disposed || polling) return;
      if (outcome === "silent" || outcome === "refused") {
        fallBackPolling(nativeOk ? `fs_watch_${outcome}_late` : `fs_watch_${outcome}`);
        return;
      }
      if (!nativeOk) {
        nativeOk = true;
        logFeatureOk("settings_watcher_start");
      }
    });
  }
  function fallBackPolling(reason) {
    if (polling || disposed) return;
    polling = true;
    pollFloor = (watchingSince ?? Date.now()) - SETTINGS_WATCH_LAG_MS;
    logForDebugging(
      `[settings] native file watching is not delivering events on this host (${reason}); polling settings files every ${watchPollInterval}ms instead`,
      {
        level: "warn",
      },
    );
    logFeatureSad("settings_watcher_start", reason);
    restart();
  }
  function onHandleError(error) {
    let errnoCode = getErrnoCode(error);
    let syscall = error instanceof Error && "syscall" in error ? error.syscall : undefined;
    if (
      (errnoCode === "EMFILE" || errnoCode === "ENFILE" || errnoCode === "ENOSPC") &&
      (syscall === undefined || syscall === "watch")
    )
      fallBackPolling(`fs_watch_refused_late_${errnoCode.toLowerCase()}`);
  }
  function startWatching(watchTargets, generation) {
    if (generation !== watchGeneration) return;
    let watchMode = mode();
    let { dirs, settingsFiles, dropInDir } = watchTargets;
    realpathMap = watchTargets.realpathToCanonical;
    let projectScoped = new Set();
    for (let dir of setDifference(pendingDirs, watchTargets.pendingDirs)) appearedDirs.add(dir);
    pendingDirs = new Set(watchTargets.pendingDirs);
    watchingSince ??= Date.now();
    let thisGeneration = ++watchCount;
    lastSeenStats.clear();
    let previousWatcher = watcher;
    watcher = null;
    if (previousWatcher) previousWatcher.close().catch(() => {});
    readyResolve?.();
    readyResolve = null;
    for (let watcher of creationWatchers.values()) watcher.close();
    creationWatchers.clear();
    for (let dir of pendingDirs) watchForAppear(dir, watchMode);
    if (dirs.length === 0) {
      settleChanges(settingsFiles, Promise.resolve(), projectScoped, thisGeneration);
      return;
    }
    logForDebugging(
      `Watching for changes in setting files ${[...settingsFiles].join(", ")}...${dropInDir ? ` and drop-in directory ${dropInDir}` : ""}${watchMode === "polling" ? ` (polling every ${watchPollInterval}ms)` : ""}`,
    );
    for (let [target, file] of realpathMap)
      logForDebugging(
        `Settings file ${file} is a symlink to ${target}; also watching ${pathModule.dirname(target)} so atomic-save edits to the target are detected`,
      );
    let chokidarWatcher = chokidar_default.watch(dirs, {
      persistent: true,
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: {
        stabilityThreshold,
        pollInterval,
      },
      ignored: (path, stats) => {
        if (stats && !stats.isFile() && !stats.isDirectory()) return true;
        if (path.split(/[/\\]/).some((dir) => dir === ".git")) return true;
        if (!stats || stats.isDirectory()) return false;
        let normalized = pathModule.normalize(path);
        if (settingsFiles.has(normalized)) return projectScoped.has(normalized) && isEmptyPrivateFile(stats);
        if (dropInDir && normalized.startsWith(dropInDir + pathModule.sep) && normalized.endsWith(".json"))
          return false;
        return true;
      },
      ignorePermissionErrors: true,
      ...(watchMode === "polling"
        ? {
            usePolling: true,
            interval: watchPollInterval,
            binaryInterval: watchPollInterval,
          }
        : {
            usePolling: false,
          }),
      atomic: true,
    });
    watcher = chokidarWatcher;
    if (
      chokidarWatcher.options?.usePolling === false &&
      (getPlatform() === "linux" || getPlatform() === "wsl")
    )
      projectScoped = watchTargets.projectScoped;
    let promise = new Promise((resolve) => {
      readyResolve = resolve;
      chokidarWatcher.once("ready", resolve);
    });
    chokidarWatcher.on("change", withWatchState(onChange));
    chokidarWatcher.on("unlink", onUnlink);
    chokidarWatcher.on("add", withWatchState(onAdd));
    chokidarWatcher.on("unlinkDir", (dir) => {
      if (settingsFiles.has(pathModule.normalize(dir))) onUnlink(dir);
    });
    chokidarWatcher.on("error", (error) => {
      logForDebugging(`[settings] watcher error: ${errorMessage(error)}`, {
        level: "warn",
      });
      if (watchMode === "native") onHandleError(error);
    });
    settleChanges(settingsFiles, promise, projectScoped, thisGeneration);
    if (watchMode === "native") probeNative();
  }
  async function settleChanges(settingsFiles, ready, projectScoped, generation) {
    let nameState = commandSyncNameState();
    if (appearedDirs.size === 0 && pollFloor === null && nameState.firstReadsChecked) return;
    let appeared = new Set(appearedDirs);
    appearedDirs.clear();
    let floor = pollFloor;
    pollFloor = null;
    await ready;
    if (disposed) return;
    let firstCheck = !nameState.firstReadsChecked && generation === watchCount;
    if (firstCheck) nameState.firstReadsChecked = true;
    await Promise.all(
      [...settingsFiles].map(async (file) => {
        let dirAppeared = appeared.has(pathModule.dirname(file));
        let firstReadStats = firstCheck ? await firstReadOrOwnWrite(file, nameState) : null;
        if (!dirAppeared && floor === null && !firstReadStats) return;
        let stats = await stableStats(file, firstReadStats);
        if (disposed || stats === null) return;
        let previousStats = lastSeenStats.get(file);
        if (
          firstReadStats !== null &&
          !dirAppeared &&
          floor === null &&
          previousStats !== undefined &&
          sameStat(previousStats, stats)
        )
          return;
        let empty = projectScoped.has(file) && isEmptyPrivateFile(stats);
        if (firstReadStats && !empty) {
          logForDebugging(`Settings file ${file} changed before its watch was live`);
          statsBeforeLive.set(file, stats);
        }
        if (((dirAppeared || firstReadStats) && !empty) || (floor !== null && stats.mtimeMs >= floor))
          onChange(file);
      }),
    );
    if (firstCheck) nameState.forgetFirstReads();
  }
  function watchForAppear(path, mode) {
    let dir = pathModule.dirname(path);
    if (mode === "polling") {
      if (!creationWatchers.has(path)) {
        let interval = setInterval((tick, path) => void tick(path), watchPollInterval, checkAppeared, path);
        interval.unref();
        creationWatchers.set(path, {
          close: () => clearInterval(interval),
        });
        logForDebugging(`Polling for ${path} to appear every ${watchPollInterval}ms`);
      }
    } else if (!creationWatchers.has(dir))
      try {
        let watcher = watch(dir, (event, filename) => {
          for (let target of pendingDirs)
            if (
              pathModule.dirname(target) === dir &&
              (filename === null || filename === pathModule.basename(target))
            )
              checkAppeared(target);
        });
        watcher.on("error", (error) => {
          logForDebugging(`[settings] creation watcher error on ${dir}: ${errorMessage(error)}`, {
            level: "warn",
          });
          onHandleError(error);
        });
        creationWatchers.set(dir, watcher);
        logForDebugging(`Watching ${dir} for ${path} to appear`);
      } catch (error) {
        logForDebugging(`[settings] cannot watch ${dir} for ${path} to appear: ${errorMessage(error)}`, {
          level: "warn",
        });
        onHandleError(error);
      }
    checkAppeared(path);
  }
  async function checkAppeared(path) {
    if (!pendingDirs.has(path)) return;
    try {
      if (!(await stat(path)).isDirectory()) return;
    } catch {
      return;
    }
    onDirAppeared(path);
  }
  function dispose() {
    disposed = true;
    if (cleanupUnsub) {
      cleanupUnsub();
      cleanupUnsub = null;
    }
    if (mdmTimer) {
      clearInterval(mdmTimer);
      mdmTimer = null;
    }
    for (let timer of pendingDeletions.values()) clearTimeout(timer);
    pendingDeletions.clear();
    clearFlushTimer();
    servedByV5 = undefined;
    presence = undefined;
    realpathMap = new Map();
    mdmSnapshot = null;
    clearInternalWrites();
    commandUnsub?.();
    commandUnsub = null;
    commandState = null;
    signal.clear();
    for (let watcher of creationWatchers.values()) watcher.close();
    creationWatchers.clear();
    pendingDirs.clear();
    appearedDirs.clear();
    readyResolve?.();
    readyResolve = null;
    let closeWatcher = watcher;
    watcher = null;
    return closeWatcher ? closeWatcher.close() : Promise.resolve();
  }
  async function rehome() {
    if (!started || disposed || isRemoteSessionAvailable()) return;
    for (let [path, timer] of pendingDeletions)
      if (getSourceForPath(path) === undefined) {
        clearTimeout(timer);
        pendingDeletions.delete(path);
      }
    await restart();
  }
  async function restart() {
    let generation = ++watchGeneration;
    let watchTargets = await getWatchTargets(sessionArg);
    if (disposed) return;
    startWatching(watchTargets, generation);
  }
  function onDirAppeared(dir) {
    if (!pendingDirs.delete(dir)) return;
    logForDebugging(`Settings directory ${dir} appeared; watching it`);
    appearedDirs.add(dir);
    restart();
  }
  function withWatchState(handler) {
    return (path, stats) => {
      let canonicalPath = canonical(path);
      lastSeenStats.set(canonicalPath, stats);
      let firstReadStats = statsBeforeLive.get(canonicalPath);
      statsBeforeLive.delete(canonicalPath);
      if (firstReadStats && stats && sameStat(stats, firstReadStats)) {
        logForDebugging(
          `Ignored a watch report of ${canonicalPath}: the first-read check already dealt with this version`,
        );
        return;
      }
      handler(path);
    };
  }
  async function firstReadOrOwnWrite(file, nameState) {
    if (!nameState.firstReads.has(file) || nameState.ownWritesBeforeFirstCheck.has(file)) return null;
    try {
      let stats = await stat(file);
      let firstReadStats = nameState.firstReads.get(file);
      return firstReadStats === undefined || (firstReadStats !== null && sameStat(stats, firstReadStats))
        ? null
        : stats;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
        logForDebugging(
          `Could not check whether settings file ${file} changed before its watch was live: ${errnoCode ?? errorMessage(error)}`,
        );
      return null;
    }
  }
  async function stableStats(file, sinceStats = null) {
    try {
      let previous = sinceStats ?? (await stat(file));
      while (true) {
        await sleep(stabilityThreshold);
        if (disposed) return null;
        let current = await stat(file);
        if (current.size === previous.size && current.mtimeMs === previous.mtimeMs)
          return current.isFile() ? current : null;
        previous = current;
      }
    } catch {}
    return null;
  }
  async function subscribeV5(bridge, target) {
    let sub = await bridge.subscribe(
      {
        target: "key",
        key: STORAGE_SPACES.userSettings(),
      },
      onObservation,
      {
        maxObservationLagMs: subscribedObservationLag,
      },
    );
    if (!sub.ok) {
      logForDebugging(
        `[settings] watching ${target} through the storage interface failed: ${formatStorageError(sub.error)}`,
        {
          level: "warn",
        },
      );
      return false;
    }
    if (options?.subscribedObservationLag === undefined)
      observedGrace = Math.max(observedGrace, graceFor(sub.value.observationLagMs));
    logForDebugging(`Watching for changes in ${target} through the storage interface`);
    return true;
  }
  function onObservation(observation) {
    let target = servedByV5;
    if (disposed || target === undefined) return;
    if (!observation.ok) {
      logForDebugging(
        `[settings] watching ${target} through the storage interface ended: ${formatStorageError(observation.error)}`,
        {
          level: "warn",
        },
      );
      if (!resubscribeRetried && isStorageV5Enabled() && sessionArg !== undefined) {
        resubscribeRetried = true;
        subscribeV5(sessionArg, target);
      }
      return;
    }
    switch (observation.value.kind) {
      case "snapshot": {
        let previous = presence;
        let next =
          "absent" in observation.value
            ? {
                present: false,
              }
            : {
                present: true,
                version: observation.value.version,
              };
        presence = next;
        if (previous === undefined) return;
        if (next.present) {
          let shouldFire = !previous.present || pendingDeletions.has(target);
          if (shouldFire || previous.version !== next.version) {
            if (shouldFire) sawChange = true;
            onRecreated(target);
          }
          return;
        }
        if (previous.present && !pendingDeletions.has(target)) onDeleted(target, " (while unwatched)");
        return;
      }
      case "appended":
      case "tombstoned":
        return;
      case "created":
        presence = {
          present: true,
          version: observation.value.version,
        };
        sawChange = true;
        onRecreated(target);
        return;
      case "updated":
        presence = {
          present: true,
          version: observation.value.version,
        };
        onRecreated(target);
        return;
      case "deleted":
        presence = {
          present: false,
        };
        onDeleted(target, "");
        return;
    }
  }
  function onDeleted(target, suffix) {
    let deferred = pendingDeleteTimer !== null && sawChange && !recreated;
    clearFlushTimer();
    if (deferred) return;
    logForDebugging(`Detected deletion of ${target}${suffix}`);
    scheduleDelete(target, "userSettings", observedGrace);
  }
  function onRecreated(target) {
    let timer = pendingDeletions.get(target);
    if (timer) {
      clearTimeout(timer);
      pendingDeletions.delete(target);
      recreated = true;
      sawChange = true;
      logForDebugging(`Cancelled pending deletion of ${target} \u2014 file was recreated`);
    }
    if (pendingDeleteTimer) clearTimeout(pendingDeleteTimer);
    pendingDeleteTimer = setTimeout(flushTimer, stabilityThreshold);
  }
  function clearFlushTimer() {
    if (pendingDeleteTimer) {
      clearTimeout(pendingDeleteTimer);
      pendingDeleteTimer = null;
    }
    sawChange = false;
    recreated = false;
  }
  function flushTimer() {
    pendingDeleteTimer = null;
    let changed = sawChange;
    sawChange = false;
    recreated = false;
    let target = servedByV5;
    if (disposed || target === undefined) return;
    if (changed) onAdd(target);
    else onChange(target);
  }
  function canonical(path) {
    return realpathMap.get(pathModule.normalize(path)) ?? path;
  }
  function onChange(path) {
    if (disposed) return;
    let canonicalPath = canonical(path);
    let sourceForPath = getSourceForPath(canonicalPath);
    if (!sourceForPath) return;
    let pending = pendingDeletions.get(canonicalPath);
    if (pending) {
      clearTimeout(pending);
      pendingDeletions.delete(canonicalPath);
      logForDebugging(`Cancelled pending deletion of ${canonicalPath} \u2014 file was recreated`);
    }
    if (consumeInternalWrite(canonicalPath, INTERNAL_WRITE_WINDOW_MS)) {
      logForDebugging(
        `Suppressed change to ${canonicalPath} \u2014 echo of our own write within the last ${INTERNAL_WRITE_WINDOW_MS}ms`,
      );
      return;
    }
    logForDebugging(
      `Detected change to ${canonicalPath}${path !== canonicalPath ? ` (via symlink target ${path})` : ""}`,
    );
    gate(sourceForPath, canonicalPath).then((blocked) => {
      if (blocked) {
        logForDebugging(`ConfigChange hook blocked change to ${canonicalPath}`);
        return;
      }
      if (isStorageV5Enabled() && sessionArg !== undefined && canonicalPath === servedByV5) {
        seedProjectSettings(sessionArg, commandSyncNameState(), canonicalPath).then((released) => {
          try {
            fanOut(
              sourceForPath,
              released !== undefined && !disposed
                ? {
                    userLayer: "retain",
                  }
                : undefined,
            );
          } finally {
            released?.();
          }
        });
        return;
      }
      fanOut(sourceForPath);
    });
  }
  function onAdd(path) {
    let canonicalPath = canonical(path);
    if (!getSourceForPath(canonicalPath)) return;
    let pendingTimer = pendingDeletions.get(canonicalPath);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingDeletions.delete(canonicalPath);
      logForDebugging(`Cancelled pending deletion of ${canonicalPath} \u2014 file was re-added`);
    }
    onChange(path);
  }
  function onUnlink(path) {
    let canonicalPath = canonical(path);
    let source = getSourceForPath(canonicalPath);
    if (!source) return;
    logForDebugging(`Detected deletion of ${canonicalPath}`);
    if (getPlatform() === "macos") watcher?.add(pathModule.dirname(path));
    scheduleDelete(canonicalPath, source);
  }
  function scheduleDelete(path, source, delay = polling ? graceFor(watchPollInterval) : deletionGrace) {
    if (pendingDeletions.has(path)) return;
    let timer = setTimeout(onDeleteTimer, delay, path, source);
    pendingDeletions.set(path, timer);
  }
  function onDeleteTimer(path, src) {
    pendingDeletions.delete(path);
    gate(src, path).then((results) => {
      if (results) {
        logForDebugging(`ConfigChange hook blocked deletion of ${path}`);
        return;
      }
      fanOut(src);
    });
  }
  function gate(source, path) {
    if (!configGate) {
      logError(Error("settingsChangeDetector: ConfigChange hook gate not wired"));
      return Promise.resolve(true);
    }
    return configGate(settingSourceToConfigChangeSource(source), path);
  }
  function mdmDigest(mdm, hkcu, wslInherits, wslWindowsFile) {
    return jsonStringify({
      mdm: mdm.settings,
      mdmErrors: mdm.errors,
      mdmUserWritable: mdm.userWritable === true,
      mdmDocumentHasPolicyContent: mdm.documentHasPolicyContent === true,
      mdmLoadState: mdm.loadState,
      mdmHeldDocuments: mdm.heldDocuments ?? [],
      hkcu: hkcu.settings,
      hkcuErrors: hkcu.errors,
      wslInherits,
      wslWindowsFile,
    });
  }
  async function startMdmPolling() {
    mdmSnapshot = mdmDigest(
      mdmResult(),
      startMdmPoll(),
      wslInheritsSettings(),
      await hasManagedSettingsFile(sessionArg),
    );
    if (disposed) return;
    mdmTimer = setInterval(() => {
      if (disposed) return;
      (async () => {
        try {
          let mdmSnapshot_2 = await readMdmSnapshot(sessionArg);
          if (disposed) return;
          let { mdm, hkcu, wslInherits } = withAskedWhere(mdmSnapshot_2);
          setMdmReadOutcomes(undefined);
          replaceMdmSetting(
            mdmSnapshot_2.mdm,
            mdmSnapshot_2.hkcu,
            mdmSnapshot_2.wslInherits,
            mdmSnapshot_2.whereAsked,
          );
          let wslWindowsFile = await hasManagedSettingsFile(sessionArg);
          if (disposed) return;
          let digest = mdmDigest(mdm, hkcu, wslInherits, wslWindowsFile);
          if (digest !== mdmSnapshot) {
            mdmSnapshot = digest;
            logForDebugging("Detected MDM settings change via poll");
            fanOut("policySettings");
          }
          setMdmReadOutcomes(mdmSnapshot_2.readOutcomes);
        } catch (error) {
          logForDebugging(`MDM poll error: ${errorMessage(error)}`);
        }
      })();
    }, mdmPollInterval);
    mdmTimer.unref();
  }
  function ensureCommandSub() {
    if (disposed || !bridgeStore) return;
    let state = commandSyncNameState();
    if (state === commandState) return;
    commandUnsub?.();
    commandState = state;
    commandUnsub = state.changed.subscribe((change) => emit(change));
  }
  function fanOut(source, options, notifyOptions) {
    invalidateCommandNames(options);
    try {
      emit(source, notifyOptions);
    } catch (error) {
      for (let subscriberError of error instanceof AggregateError ? error.errors : [error])
        logError(
          withTelemetryMessage(
            toError(subscriberError),
            "settingsChangeDetector: subscriber threw during fanOut",
          ),
        );
    }
  }
  function emit(source, payload) {
    let sessionFeatureValues = getSessionFeatureValues();
    sessionFeatureValues.settingsChangesUnfinished =
      (sessionFeatureValues.settingsChangesUnfinished ?? 0) + 1;
    signal.emit(source, payload);
    sessionFeatureValues.settingsChangesUnfinished--;
  }
  function notifyChange(source, options) {
    logForDebugging(`Programmatic settings change notification for ${source}`);
    fanOut(source, undefined, options);
  }
  return {
    initialize,
    dispose,
    rehome,
    [Symbol.asyncDispose]: dispose,
    subscribe: (listener) => {
      ensureCommandSub();
      return signal.subscribe(listener);
    },
    notifyChange,
    isWatching: () => started && !disposed,
  };
}
//@ chunk-a2q0x549.js:35080-35093 layout
/**
 * 设置变更检测器单例（initialize() 的返回值）。
 */
var settingsChangeDetector; // deferred: uses createSettingsChangeDetector of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:35080", () => {
  settingsChangeDetector = createSettingsChangeDetector();
});
//@ chunk-a2q0x549.js:35093-35216 layout
function isUserSettingsSource(session) {
  if (!isStorageV5Enabled() || session === undefined) return;
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  return settingsFilePathForSource !== undefined &&
    pathModule.basename(settingsFilePathForSource) === USER_SETTINGS_FILE_NAMES.default
    ? settingsFilePathForSource
    : undefined;
}
//@ chunk-a2q0x549.js:35216-37102 fingerprint (2.1.88 match: getWatchTargets, 0.327)
async function getWatchTargets(session) {
  let dirToSettingsFiles = new Map();
  let dirsWithExistingFiles = new Set();
  let symlinkMap = new Map();
  let configDirs = new Set();
  let files = [];
  let projectScoped = new Set();
  let servedByV5 = isUserSettingsSource(session);
  for (let source of SETTING_SOURCES) {
    if (source === "flagSettings") continue;
    let path = getSettingsFilePathForSource(source);
    if (servedByV5 !== undefined && path === servedByV5) continue;
    if (path) {
      files.push(path);
      if (source === "projectSettings" || source === "localSettings") projectScoped.add(path);
    }
  }
  let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
  if (legacyLocalSettingsFilePath) {
    files.push(legacyLocalSettingsFilePath);
    projectScoped.add(legacyLocalSettingsFilePath);
  }
  let skippedDirs = new Set();
  for (let dir of new Set(
    files
      .filter((file) => projectScoped.has(file) && !isInClaudeConfigHome(file))
      .map((file) => pathModule.dirname(file)),
  ))
    if (!isMissingPathError(dir)) {
      skippedDirs.add(dir);
      logForDebugging(
        `Not watching settings directory ${dir}: it or an entry in it leads onto a network path or could not be vetted (its settings files are unwatched this session)`,
      );
    }
  let pendingDirs = new Set();
  for (let file of files) {
    let dir = pathModule.dirname(file);
    if (skippedDirs.has(dir)) continue;
    if (!dirToSettingsFiles.has(dir)) dirToSettingsFiles.set(dir, new Set());
    dirToSettingsFiles.get(dir).add(file);
    if (!dirsWithExistingFiles.has(dir) && !pendingDirs.has(dir))
      try {
        if ((await stat(dir)).isDirectory()) dirsWithExistingFiles.add(dir);
      } catch {
        if (projectScoped.has(file))
          try {
            if ((await stat(pathModule.dirname(dir))).isDirectory()) pendingDirs.add(dir);
          } catch {}
      }
    try {
      let stats = await realpath(file);
      if (stats === file) continue;
      let dirReal = await realpath(dir);
      let dir_2 = pathModule.dirname(stats);
      if (pathModule.join(dirReal, pathModule.basename(file)) === stats) continue;
      let sameDir = dir_2 === dirReal;
      let target = sameDir ? pathModule.join(dir, pathModule.basename(stats)) : stats;
      if (getSourceForPath(target) !== undefined) continue;
      if (
        !sameDir &&
        projectScoped.has(file) &&
        !isInClaudeConfigHome(file) &&
        !isPathConfigDir(dir_2) &&
        !isMissingPathError(dir_2)
      ) {
        logForDebugging(
          `Not watching ${dir_2} (the resolved directory of settings file ${file}): an entry in it leads onto a network path or could not be vetted`,
        );
        continue;
      }
      symlinkMap.set(target, file);
      configDirs.add(dir);
      if (sameDir) dirToSettingsFiles.get(dir).add(target);
      else {
        if (!dirToSettingsFiles.has(dir_2)) dirToSettingsFiles.set(dir_2, new Set());
        dirToSettingsFiles.get(dir_2).add(target);
        dirsWithExistingFiles.add(dir_2);
        configDirs.add(dir_2);
      }
    } catch {}
  }
  let settingsFiles = new Set();
  for (let dir of dirsWithExistingFiles) {
    let filesInDir = dirToSettingsFiles.get(dir);
    if (filesInDir) for (let file of filesInDir) settingsFiles.add(file);
  }
  let dropInDir = null;
  let managedDropIn = getDropInDir();
  try {
    if ((await stat(managedDropIn)).isDirectory()) {
      dirsWithExistingFiles.add(managedDropIn);
      dropInDir = managedDropIn;
      configDirs.add(managedDropIn);
    }
  } catch {}
  let isMac = getPlatform() === "macos";
  let dirs = new Set();
  for (let dirsWithExistingFile of dirsWithExistingFiles) {
    let files = dirToSettingsFiles.get(dirsWithExistingFile);
    if (!files || !isMac || configDirs.has(dirsWithExistingFile)) {
      dirs.add(dirsWithExistingFile);
      continue;
    }
    let hasMissing = false;
    for (let file of files)
      try {
        if ((await stat(file)).isFile()) dirs.add(file);
        else hasMissing = true;
      } catch {
        hasMissing = true;
      }
    if (hasMissing) dirs.add(dirsWithExistingFile);
  }
  return {
    dirs: [...dirs],
    settingsFiles,
    projectScoped,
    dropInDir,
    realpathToCanonical: symlinkMap,
    servedByV5,
    pendingDirs,
  };
}
//@ chunk-a2q0x549.js:37102-37405 layout
function isMissingPathError(dir) {
  try {
    vetRepoSettingsPath(getFsImplementation(), dir, {
      failClosed: true,
    });
  } catch {
    return false;
  }
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR";
  }
  for (let entry of entries) {
    let joined = pathModule.join(dir, entry);
    let suspect = true;
    if (!hasDotSegment(entry))
      try {
        suspect = getFsImplementation().lstatSync(joined).isSymbolicLink();
      } catch {}
    if (!suspect) continue;
    try {
      vetRepoSettingsPath(getFsImplementation(), joined, {
        failClosed: true,
      });
    } catch {
      return false;
    }
  }
  return true;
}
//@ chunk-a2q0x549.js:37405-37626 fingerprint (2.1.88 match: settingSourceToConfigChangeSource, 1)
function settingSourceToConfigChangeSource(source) {
  switch (source) {
    case "userSettings":
      return "user_settings";
    case "projectSettings":
      return "project_settings";
    case "localSettings":
      return "local_settings";
    case "flagSettings":
    case "policySettings":
      return "policy_settings";
  }
}
//@ chunk-a2q0x549.js:37626-37830 fingerprint (2.1.88 match: getSourceForPath, 0.807)
function getSourceForPath(path) {
  let normalizedPath = pathModule.normalize(path);
  let dropInDir = getDropInDir();
  if (normalizedPath.startsWith(dropInDir + pathModule.sep)) return "policySettings";
  let found = SETTING_SOURCES.find((source) => getSettingsFilePathForSource(source) === normalizedPath);
  if (found) return found;
  let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
  if (legacyLocalSettingsFilePath && pathModule.normalize(legacyLocalSettingsFilePath) === normalizedPath)
    return "localSettings";
  return;
}
//@ chunk-a2q0x549.js:37830-37931 affinity
function sameStat(left, right) {
  return (
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}
//@ chunk-a2q0x549.js:37931-38009 affinity
function isEmptyPrivateFile(stats) {
  return stats.isFile() && stats.size === 0 && stats.nlink === 1 && (stats.mode & 511) === 292;
}
export { settingsChangeDetector, startMdmPoll, createSettingsChangeDetector };
