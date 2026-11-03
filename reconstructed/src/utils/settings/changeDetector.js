/**
 * utils/settings/changeDetector.ts
 *
 * 设置文件变更检测：监视各来源文件与 managed-settings.d（文件事件或轮询）、定时重读 MDM，变化时发出 ConfigChange 并重新加载。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/changeDetector.ts
 * pieces: chunk-82kqcve8.js (8), chunk-q8cqcff6.js (1)
 * attribution: callgraph-fingerprint 2, layout 3, fingerprint 3, affinity 1
 */
import * as pathModule from "path";
import { watch, readdirSync } from "fs";
import { stat, realpath } from "fs/promises";
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
import { commandSyncNameState, invalidateCommandNames } from "./commandSyncNames.js";
import { logError } from "../log.js";
import { jsonStringify } from "../slowOperations.js";
import { mdmResult, withAskedWhere, setMdmReadOutcomes, mdmLoader } from "./managedPluginTiers.js";
import {
  wslInheritsSettings,
  hasManagedSettingsFile,
  readMdmSnapshot,
  replaceMdmSetting,
  me,
} from "./mdm/settings.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { getSettingsFilePathForSource, getLegacyLocalSettingsFilePath } from "./settings.js";
import { USER_SETTINGS_FILE_NAMES, isInClaudeConfigHome } from "./settingsFileParsing.js";
import { SETTING_SOURCES } from "./constants.js";
import { isPathConfigDir } from "../envUtils.js";
import { getDropInDir } from "../fileStateCache.js";
import { vetRepoSettingsPath, getFsImplementation } from "../fsOperations.js";
import { hasDotSegment } from "../pathClassification.js";

//@ chunk-82kqcve8.js:24807-34017 callgraph-fingerprint = initialize (0.232)
/**
 * 设置文件变更检测器：监视各来源设置文件与 managed-settings.d（文件事件或轮询），MDM 定时重读，变化时按来源发出 ConfigChange 事件并触发重新加载。
 */
function createSettingsChangeDetector(e) {
  let stabilityThreshold = e?.stabilityThreshold ?? SETTINGS_STABILITY_THRESHOLD_MS;
  let pollInterval = e?.pollInterval ?? SETTINGS_POLL_INTERVAL_MS;
  let mdmPollInterval = e?.mdmPollInterval ?? SETTINGS_MDM_POLL_INTERVAL_MS;
  let deletionGrace = e?.deletionGrace ?? SETTINGS_DELETION_GRACE_MS;
  let subscribedObservationLag = e?.subscribedObservationLag ?? SETTINGS_OBSERVATION_LAG_MS;
  let bridgeStore = e?.bridgeStore ?? true;
  let watchPollInterval = e?.watchPollInterval ?? SETTINGS_WATCH_POLL_INTERVAL_MS;
  let R = (q) => Math.max(deletionGrace, q + stabilityThreshold + 200);
  let O = R(subscribedObservationLag);
  let signal = createSignal();
  let L = null;
  let j = false;
  let G = false;
  let Z = false;
  let ae = null;
  let ee = null;
  let re = 0;
  let ce = null;
  let we = null;
  let me = false;
  let se = false;
  let ye = null;
  let Ee = null;
  let ie = new Map();
  let he = null;
  let He;
  let We;
  let st;
  let yt = null;
  let It = false;
  let fr = false;
  let Gi = false;
  let qt;
  let gr = new Map();
  let Ft = new Set();
  let St = new Map();
  let Xt = new Set();
  let Pn = null;
  async function pd(q, Q, { machineServesSession: de = false } = {}) {
    if (
      !shouldUseNativeWatch({
        machineServesSession: de,
      })
    )
      return;
    if (me || se) return;
    me = true;
    He = q;
    We = Q;
    await Ed();
    if (se) return;
    he = registerCleanup(ao);
    let Se = ++re;
    let watchTargets = await getWatchTargets(Q);
    if (se) return;
    st = watchTargets.servedByV5;
    if (isStorageV5Enabled() && Q !== undefined && st !== undefined) {
      await Vi(Q, st);
      if (se) return;
    }
    Hi(watchTargets, Se);
  }
  function hd() {
    return j ? "polling" : "native";
  }
  function yd() {
    if (Z || j || se) return;
    Z = true;
    (e?.fsWatchProbe ?? probeFsWatch)().then((q) => {
      Z = false;
      if (se || j) return;
      if (q === "silent" || q === "refused") {
        zi(G ? `fs_watch_${q}_late` : `fs_watch_${q}`);
        return;
      }
      if (!G) {
        G = true;
        logFeatureOk("settings_watcher_start");
      }
    });
  }
  function zi(q) {
    if (j || se) return;
    j = true;
    ee = (ae ?? Date.now()) - SETTINGS_WATCH_LAG_MS;
    logForDebugging(
      `[settings] native file watching is not delivering events on this host (${q}); polling settings files every ${watchPollInterval}ms instead`,
      {
        level: "warn",
      },
    );
    logFeatureSad("settings_watcher_start", q);
    co();
  }
  function io(q) {
    let errnoCode = getErrnoCode(q);
    let syscall = q instanceof Error && "syscall" in q ? q.syscall : undefined;
    if (
      (errnoCode === "EMFILE" || errnoCode === "ENFILE" || errnoCode === "ENOSPC") &&
      (syscall === undefined || syscall === "watch")
    )
      zi(`fs_watch_refused_late_${errnoCode.toLowerCase()}`);
  }
  function Hi(watchTargets, Q) {
    if (Q !== re) return;
    let de = hd();
    let { dirs, settingsFiles, dropInDir } = watchTargets;
    gr = watchTargets.realpathToCanonical;
    let Ke = new Set();
    for (let De of setDifference(Ft, watchTargets.pendingDirs)) Xt.add(De);
    Ft = new Set(watchTargets.pendingDirs);
    ae ??= Date.now();
    let hr = L;
    L = null;
    if (hr) hr.close().catch(() => {});
    Pn?.();
    Pn = null;
    for (let De of St.values()) De.close();
    St.clear();
    for (let De of Ft) wd(De, de);
    if (dirs.length === 0) {
      Yi(settingsFiles, Promise.resolve(), Ke);
      return;
    }
    logForDebugging(
      `Watching for changes in setting files ${[...settingsFiles].join(", ")}...${dropInDir ? ` and drop-in directory ${dropInDir}` : ""}${de === "polling" ? ` (polling every ${watchPollInterval}ms)` : ""}`,
    );
    for (let [De, Mt] of gr)
      logForDebugging(
        `Settings file ${Mt} is a symlink to ${De}; also watching ${pathModule.dirname(De)} so atomic-save edits to the target are detected`,
      );
    let Et = chokidar_default.watch(dirs, {
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
        if (settingsFiles.has(normalized)) return Ke.has(normalized) && isEmptyPrivateFile(stats);
        if (dropInDir && normalized.startsWith(dropInDir + pathModule.sep) && normalized.endsWith(".json"))
          return false;
        return true;
      },
      ignorePermissionErrors: true,
      ...(de === "polling"
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
    L = Et;
    if (Et.options?.usePolling === false && (getPlatform() === "linux" || getPlatform() === "wsl"))
      Ke = watchTargets.projectScoped;
    let promise = new Promise((resolve) => {
      Pn = resolve;
      Et.once("ready", resolve);
    });
    Et.on("change", pr);
    Et.on("unlink", Ji);
    Et.on("add", Xi);
    Et.on("unlinkDir", (De) => {
      if (settingsFiles.has(pathModule.normalize(De))) Ji(De);
    });
    Et.on("error", (De) => {
      logForDebugging(`[settings] watcher error: ${errorMessage(De)}`, {
        level: "warn",
      });
      if (de === "native") io(De);
    });
    Yi(settingsFiles, promise, Ke);
    if (de === "native") yd();
  }
  async function Yi(settingsFiles, Q, de) {
    if (Xt.size === 0 && ee === null) return;
    let Se = new Set(Xt);
    Xt.clear();
    let Ce = ee;
    ee = null;
    await Q;
    await Promise.all(
      [...settingsFiles]
        .filter((xe) => Ce !== null || Se.has(pathModule.dirname(xe)))
        .map(async (xe) => {
          let Ke = await _d(xe);
          if (se || Ke === null) return;
          let hr = de.has(xe) && isEmptyPrivateFile(Ke);
          if ((Se.has(pathModule.dirname(xe)) && !hr) || (Ce !== null && Ke.mtimeMs >= Ce)) pr(xe);
        }),
    );
  }
  function wd(q, Q) {
    let dir = pathModule.dirname(q);
    if (Q === "polling") {
      if (!St.has(q)) {
        let interval = setInterval((Ce, xe) => void Ce(xe), watchPollInterval, so, q);
        interval.unref();
        St.set(q, {
          close: () => clearInterval(interval),
        });
        logForDebugging(`Polling for ${q} to appear every ${watchPollInterval}ms`);
      }
    } else if (!St.has(dir))
      try {
        let Se = watch(dir, (Ce, xe) => {
          for (let Ke of Ft)
            if (pathModule.dirname(Ke) === dir && (xe === null || xe === pathModule.basename(Ke))) so(Ke);
        });
        Se.on("error", (Ce) => {
          logForDebugging(`[settings] creation watcher error on ${dir}: ${errorMessage(Ce)}`, {
            level: "warn",
          });
          io(Ce);
        });
        St.set(dir, Se);
        logForDebugging(`Watching ${dir} for ${q} to appear`);
      } catch (error) {
        logForDebugging(`[settings] cannot watch ${dir} for ${q} to appear: ${errorMessage(error)}`, {
          level: "warn",
        });
        io(error);
      }
    so(q);
  }
  async function so(q) {
    if (!Ft.has(q)) return;
    try {
      if (!(await stat(q)).isDirectory()) return;
    } catch {
      return;
    }
    Sd(q);
  }
  function ao() {
    se = true;
    if (he) {
      he();
      he = null;
    }
    if (ce) {
      clearInterval(ce);
      ce = null;
    }
    for (let Q of ie.values()) clearTimeout(Q);
    ie.clear();
    qi();
    st = undefined;
    qt = undefined;
    gr = new Map();
    we = null;
    clearInternalWrites();
    Ee?.();
    Ee = null;
    ye = null;
    signal.clear();
    for (let Q of St.values()) Q.close();
    St.clear();
    Ft.clear();
    Xt.clear();
    Pn?.();
    Pn = null;
    let q = L;
    L = null;
    return q ? q.close() : Promise.resolve();
  }
  async function bd() {
    if (!me || se || isRemoteSessionAvailable()) return;
    for (let [q, Q] of ie)
      if (getSourceForPath(q) === undefined) {
        clearTimeout(Q);
        ie.delete(q);
      }
    await co();
  }
  async function co() {
    let q = ++re;
    let watchTargets = await getWatchTargets(We);
    if (se) return;
    Hi(watchTargets, q);
  }
  function Sd(q) {
    if (!Ft.delete(q)) return;
    logForDebugging(`Settings directory ${q} appeared; watching it`);
    Xt.add(q);
    co();
  }
  async function _d(q) {
    try {
      let Q = await stat(q);
      while (true) {
        await sleep(stabilityThreshold);
        if (se) return null;
        let de = await stat(q);
        if (de.size === Q.size && de.mtimeMs === Q.mtimeMs) return de.isFile() ? de : null;
        Q = de;
      }
    } catch {}
    return null;
  }
  async function Vi(q, Q) {
    let de = await q.subscribe(
      {
        target: "key",
        key: STORAGE_SPACES.userSettings(),
      },
      vd,
      {
        maxObservationLagMs: subscribedObservationLag,
      },
    );
    if (!de.ok) {
      logForDebugging(
        `[settings] watching ${Q} through the storage interface failed: ${formatStorageError(de.error)}`,
        {
          level: "warn",
        },
      );
      return false;
    }
    if (e?.subscribedObservationLag === undefined) O = Math.max(O, R(de.value.observationLagMs));
    logForDebugging(`Watching for changes in ${Q} through the storage interface`);
    return true;
  }
  function vd(q) {
    let Q = st;
    if (se || Q === undefined) return;
    if (!q.ok) {
      logForDebugging(
        `[settings] watching ${Q} through the storage interface ended: ${formatStorageError(q.error)}`,
        {
          level: "warn",
        },
      );
      if (!Gi && isStorageV5Enabled() && We !== undefined) {
        Gi = true;
        Vi(We, Q);
      }
      return;
    }
    switch (q.value.kind) {
      case "snapshot": {
        let de = qt;
        let Se =
          "absent" in q.value
            ? {
                present: false,
              }
            : {
                present: true,
                version: q.value.version,
              };
        qt = Se;
        if (de === undefined) return;
        if (Se.present) {
          let Ce = !de.present || ie.has(Q);
          if (Ce || de.version !== Se.version) {
            if (Ce) It = true;
            uo(Q);
          }
          return;
        }
        if (de.present && !ie.has(Q)) Ki(Q, " (while unwatched)");
        return;
      }
      case "appended":
      case "tombstoned":
        return;
      case "created":
        qt = {
          present: true,
          version: q.value.version,
        };
        It = true;
        uo(Q);
        return;
      case "updated":
        qt = {
          present: true,
          version: q.value.version,
        };
        uo(Q);
        return;
      case "deleted":
        qt = {
          present: false,
        };
        Ki(Q, "");
        return;
    }
  }
  function Ki(q, Q) {
    let de = yt !== null && It && !fr;
    qi();
    if (de) return;
    logForDebugging(`Detected deletion of ${q}${Q}`);
    Qi(q, "userSettings", O);
  }
  function uo(q) {
    let Q = ie.get(q);
    if (Q) {
      clearTimeout(Q);
      ie.delete(q);
      fr = true;
      It = true;
      logForDebugging(`Cancelled pending deletion of ${q} \u2014 file was recreated`);
    }
    if (yt) clearTimeout(yt);
    yt = setTimeout(kd, stabilityThreshold);
  }
  function qi() {
    if (yt) {
      clearTimeout(yt);
      yt = null;
    }
    It = false;
    fr = false;
  }
  function kd() {
    yt = null;
    let q = It;
    It = false;
    fr = false;
    let Q = st;
    if (se || Q === undefined) return;
    if (q) Xi(Q);
    else pr(Q);
  }
  function mo(q) {
    return gr.get(pathModule.normalize(q)) ?? q;
  }
  function pr(q) {
    if (se) return;
    let Q = mo(q);
    let sourceForPath = getSourceForPath(Q);
    if (!sourceForPath) return;
    let Se = ie.get(Q);
    if (Se) {
      clearTimeout(Se);
      ie.delete(Q);
      logForDebugging(`Cancelled pending deletion of ${Q} \u2014 file was recreated`);
    }
    if (consumeInternalWrite(Q, INTERNAL_WRITE_WINDOW_MS)) {
      logForDebugging(
        `Suppressed change to ${Q} \u2014 echo of our own write within the last ${INTERNAL_WRITE_WINDOW_MS}ms`,
      );
      return;
    }
    logForDebugging(`Detected change to ${Q}${q !== Q ? ` (via symlink target ${q})` : ""}`);
    es(sourceForPath, Q).then((Ce) => {
      if (Ce) {
        logForDebugging(`ConfigChange hook blocked change to ${Q}`);
        return;
      }
      if (isStorageV5Enabled() && We !== undefined && Q === st) {
        seedProjectSettings(We, commandSyncNameState(), Q).then((xe) => {
          try {
            Cn(
              sourceForPath,
              xe !== undefined && !se
                ? {
                    userLayer: "retain",
                  }
                : undefined,
            );
          } finally {
            xe?.();
          }
        });
        return;
      }
      Cn(sourceForPath);
    });
  }
  function Xi(q) {
    let Q = mo(q);
    if (!getSourceForPath(Q)) return;
    let pendingTimer = ie.get(Q);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      ie.delete(Q);
      logForDebugging(`Cancelled pending deletion of ${Q} \u2014 file was re-added`);
    }
    pr(q);
  }
  function Ji(q) {
    let Q = mo(q);
    let sourceForPath = getSourceForPath(Q);
    if (!sourceForPath) return;
    logForDebugging(`Detected deletion of ${Q}`);
    if (getPlatform() === "macos") L?.add(pathModule.dirname(q));
    Qi(Q, sourceForPath);
  }
  function Qi(q, Q, de = j ? R(watchPollInterval) : deletionGrace) {
    if (ie.has(q)) return;
    let timer = setTimeout(Rd, de, q, Q);
    ie.set(q, timer);
  }
  function Rd(q, src) {
    ie.delete(q);
    es(src, q).then((results) => {
      if (results) {
        logForDebugging(`ConfigChange hook blocked deletion of ${q}`);
        return;
      }
      Cn(src);
    });
  }
  function es(source, Q) {
    if (!He) {
      logError(Error("settingsChangeDetector: ConfigChange hook gate not wired"));
      return Promise.resolve(true);
    }
    return He(settingSourceToConfigChangeSource(source), Q);
  }
  function ts(q, Q, wslInherits, wslWindowsFile) {
    return jsonStringify({
      mdm: q.settings,
      mdmErrors: q.errors,
      mdmUserWritable: q.userWritable === true,
      mdmDocumentHasPolicyContent: q.documentHasPolicyContent === true,
      mdmLoadState: q.loadState,
      mdmHeldDocuments: q.heldDocuments ?? [],
      hkcu: Q.settings,
      hkcuErrors: Q.errors,
      wslInherits,
      wslWindowsFile,
    });
  }
  async function Ed() {
    we = ts(mdmResult(), startMdmPoll(), wslInheritsSettings(), await hasManagedSettingsFile(We));
    if (se) return;
    ce = setInterval(() => {
      if (se) return;
      (async () => {
        try {
          let mdmSnapshot = await readMdmSnapshot(We);
          if (se) return;
          let { mdm, hkcu, wslInherits } = withAskedWhere(mdmSnapshot);
          setMdmReadOutcomes(undefined);
          replaceMdmSetting(
            mdmSnapshot.mdm,
            mdmSnapshot.hkcu,
            mdmSnapshot.wslInherits,
            mdmSnapshot.whereAsked,
          );
          let wslWindowsFile = await hasManagedSettingsFile(We);
          if (se) return;
          let xe = ts(mdm, hkcu, wslInherits, wslWindowsFile);
          if (xe !== we) {
            we = xe;
            logForDebugging("Detected MDM settings change via poll");
            Cn("policySettings");
          }
          setMdmReadOutcomes(mdmSnapshot.readOutcomes);
        } catch (error) {
          logForDebugging(`MDM poll error: ${errorMessage(error)}`);
        }
      })();
    }, mdmPollInterval);
    ce.unref();
  }
  function Pd() {
    if (se || !bridgeStore) return;
    let q = commandSyncNameState();
    if (q === ye) return;
    Ee?.();
    ye = q;
    Ee = q.changed.subscribe((Q) => rs(Q));
  }
  function Cn(q, Q, de) {
    invalidateCommandNames(Q);
    try {
      rs(q, de);
    } catch (error) {
      for (let Ce of error instanceof AggregateError ? error.errors : [error])
        logError(withTelemetryMessage(toError(Ce), "settingsChangeDetector: subscriber threw during fanOut"));
    }
  }
  function rs(q, Q) {
    let sessionFeatureValues = getSessionFeatureValues();
    sessionFeatureValues.settingsChangesUnfinished =
      (sessionFeatureValues.settingsChangesUnfinished ?? 0) + 1;
    signal.emit(q, Q);
    sessionFeatureValues.settingsChangesUnfinished--;
  }
  function Md(q, Q) {
    logForDebugging(`Programmatic settings change notification for ${q}`);
    Cn(q, undefined, Q);
  }
  return {
    initialize: pd,
    dispose: ao,
    rehome: bd,
    [Symbol.asyncDispose]: ao,
    subscribe: (q) => {
      Pd();
      return signal.subscribe(q);
    },
    notifyChange: Md,
    isWatching: () => me && !se,
  };
}
//@ chunk-82kqcve8.js:34017-34030 layout
/**
 * 设置变更检测器单例（initialize() 的返回值）。
 */
var settingsChangeDetector = createSettingsChangeDetector();
//@ chunk-82kqcve8.js:34030-34153 layout
function isUserSettingsSource(e) {
  if (!isStorageV5Enabled() || e === undefined) return;
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  return settingsFilePathForSource !== undefined &&
    pathModule.basename(settingsFilePathForSource) === USER_SETTINGS_FILE_NAMES.default
    ? settingsFilePathForSource
    : undefined;
}
//@ chunk-82kqcve8.js:34153-36037 fingerprint = getWatchTargets (0.327)
async function getWatchTargets(e) {
  let dirToSettingsFiles = new Map();
  let dirsWithExistingFiles = new Set();
  let s = new Map();
  let h = new Set();
  let y = [];
  let w = new Set();
  let S = isUserSettingsSource(e);
  for (let source of SETTING_SOURCES) {
    if (source === "flagSettings") continue;
    let path = getSettingsFilePathForSource(source);
    if (S !== undefined && path === S) continue;
    if (path) {
      y.push(path);
      if (source === "projectSettings" || source === "localSettings") w.add(path);
    }
  }
  let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
  if (legacyLocalSettingsFilePath) {
    y.push(legacyLocalSettingsFilePath);
    w.add(legacyLocalSettingsFilePath);
  }
  let O = new Set();
  for (let ee of new Set(
    y.filter((re) => w.has(re) && !isInClaudeConfigHome(re)).map((re) => pathModule.dirname(re)),
  ))
    if (!isMissingPathError(ee)) {
      O.add(ee);
      logForDebugging(
        `Not watching settings directory ${ee}: it or an entry in it leads onto a network path or could not be vetted (its settings files are unwatched this session)`,
      );
    }
  let P = new Set();
  for (let ee of y) {
    let dir = pathModule.dirname(ee);
    if (O.has(dir)) continue;
    if (!dirToSettingsFiles.has(dir)) dirToSettingsFiles.set(dir, new Set());
    dirToSettingsFiles.get(dir).add(ee);
    if (!dirsWithExistingFiles.has(dir) && !P.has(dir))
      try {
        if ((await stat(dir)).isDirectory()) dirsWithExistingFiles.add(dir);
      } catch {
        if (w.has(ee))
          try {
            if ((await stat(pathModule.dirname(dir))).isDirectory()) P.add(dir);
          } catch {}
      }
    try {
      let stats = await realpath(ee);
      if (stats === ee) continue;
      let we = await realpath(dir);
      let dir_2 = pathModule.dirname(stats);
      if (pathModule.join(we, pathModule.basename(ee)) === stats) continue;
      let se = dir_2 === we;
      let ye = se ? pathModule.join(dir, pathModule.basename(stats)) : stats;
      if (getSourceForPath(ye) !== undefined) continue;
      if (
        !se &&
        w.has(ee) &&
        !isInClaudeConfigHome(ee) &&
        !isPathConfigDir(dir_2) &&
        !isMissingPathError(dir_2)
      ) {
        logForDebugging(
          `Not watching ${dir_2} (the resolved directory of settings file ${ee}): an entry in it leads onto a network path or could not be vetted`,
        );
        continue;
      }
      s.set(ye, ee);
      h.add(dir);
      if (se) dirToSettingsFiles.get(dir).add(ye);
      else {
        if (!dirToSettingsFiles.has(dir_2)) dirToSettingsFiles.set(dir_2, new Set());
        dirToSettingsFiles.get(dir_2).add(ye);
        dirsWithExistingFiles.add(dir_2);
        h.add(dir_2);
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
      h.add(managedDropIn);
    }
  } catch {}
  let Z = getPlatform() === "macos";
  let ae = new Set();
  for (let dirsWithExistingFile of dirsWithExistingFiles) {
    let re = dirToSettingsFiles.get(dirsWithExistingFile);
    if (!re || !Z || h.has(dirsWithExistingFile)) {
      ae.add(dirsWithExistingFile);
      continue;
    }
    let ce = false;
    for (let we of re)
      try {
        if ((await stat(we)).isFile()) ae.add(we);
        else ce = true;
      } catch {
        ce = true;
      }
    if (ce) ae.add(dirsWithExistingFile);
  }
  return {
    dirs: [...ae],
    settingsFiles,
    projectScoped: w,
    dropInDir,
    realpathToCanonical: s,
    servedByV5: S,
    pendingDirs: P,
  };
}
//@ chunk-82kqcve8.js:36037-36340 layout
function isMissingPathError(e) {
  try {
    vetRepoSettingsPath(getFsImplementation(), e, {
      failClosed: true,
    });
  } catch {
    return false;
  }
  let n;
  try {
    n = readdirSync(e);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR";
  }
  for (let r of n) {
    let joined = pathModule.join(e, r);
    let h = true;
    if (!hasDotSegment(r))
      try {
        h = getFsImplementation().lstatSync(joined).isSymbolicLink();
      } catch {}
    if (!h) continue;
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
//@ chunk-82kqcve8.js:36340-36561 fingerprint = settingSourceToConfigChangeSource (1)
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
//@ chunk-82kqcve8.js:36561-36765 fingerprint = getSourceForPath (0.807)
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
//@ chunk-82kqcve8.js:36765-36843 affinity
function isEmptyPrivateFile(e) {
  return e.isFile() && e.size === 0 && e.nlink === 1 && (e.mode & 511) === 292;
}
//@ chunk-q8cqcff6.js:10635-10676 callgraph-fingerprint = startMdmPoll (0.169)
function startMdmPoll() {
  return withAskedWhere(mdmLoader()).hkcu ?? me;
}
export { settingsChangeDetector, createSettingsChangeDetector, startMdmPoll };
