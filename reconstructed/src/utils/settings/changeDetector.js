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
import { watch, watch as watch_2, readdirSync } from "fs";
import { stat, realpath, realpath as realpath_2 } from "fs/promises";
import { zs, Hs, Tu, Iu, Fu, $u, Nu, probeFsWatch, Lu, Ns } from "../fsWatchProbe.js";
import { createSignal } from "../signal.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { getErrnoCode, errorMessage, withTelemetryMessage, toError } from "../errors.js";
import { Ok } from "../../../vendor/chokidar/index.js";
import { getPlatform } from "../platform.js";
import { IRi, consumeInternalWrite, lIn } from "../../cli/headlessCloud/attachServe.js";
import { wt } from "../../remote/remoteMode.js";
import { sleep } from "../sleep.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { nio } from "./settingsSeed.js";
import { is, or } from "./commandSyncNames.js";
import { logError } from "../log.js";
import { jsonStringify } from "../slowOperations.js";
import { One, Uyr, cIn, se } from "./managedPluginTiers.js";
import { Mne, hasManagedSettingsFile, n1e, GOe, freeze } from "./mdm/settings.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { getSettingsFilePathForSource, getLegacyLocalSettingsFilePath } from "./settings.js";
import { USER_SETTINGS_FILE_NAMES, isInClaudeConfigHome } from "./settingsFileParsing.js";
import { SETTING_SOURCES } from "./constants.js";
import { isPathConfigDir } from "../envUtils.js";
import { getDropInDir } from "../fileStateCache.js";
import { vetRepoSettingsPath, getFsImplementation } from "../fsOperations.js";
import { cl } from "../pathClassification.js";

/**
 * 设置文件变更检测器：监视各来源设置文件与 managed-settings.d（文件事件或轮询），MDM 定时重读，变化时按来源发出 ConfigChange 事件并触发重新加载。
 */
//@ chunk-82kqcve8.js:24807-34017 callgraph-fingerprint = initialize (0.232)
function createSettingsChangeDetector(e) {
  let n = e?.stabilityThreshold ?? zs,
    r = e?.pollInterval ?? Hs,
    s = e?.mdmPollInterval ?? Tu,
    h = e?.deletionGrace ?? Iu,
    y = e?.subscribedObservationLag ?? Fu,
    w = e?.bridgeStore ?? !0,
    S = e?.watchPollInterval ?? $u,
    R = (q) => Math.max(h, q + n + 200),
    O = R(y),
    P = createSignal(),
    L = null,
    j = !1,
    G = !1,
    Z = !1,
    ae = null,
    ee = null,
    re = 0,
    ce = null,
    we = null,
    me = !1,
    se = !1,
    ye = null,
    Ee = null,
    ie = new Map(),
    he = null,
    He,
    We,
    st,
    yt = null,
    It = !1,
    fr = !1,
    Gi = !1,
    qt,
    gr = new Map(),
    Ft = new Set(),
    St = new Map(),
    Xt = new Set(),
    Pn = null;
  async function pd(q, Q, { machineServesSession: de = !1 } = {}) {
    if (!Nu({ machineServesSession: de })) return;
    if (me || se) return;
    if (((me = !0), (He = q), (We = Q), await Ed(), se)) return;
    he = registerCleanup(ao);
    let Se = ++re,
      Ce = await getWatchTargets(Q);
    if (se) return;
    if (((st = Ce.servedByV5), isStorageV5Enabled() && Q !== void 0 && st !== void 0)) {
      if ((await Vi(Q, st), se)) return;
    }
    Hi(Ce, Se);
  }
  function hd() {
    return j ? "polling" : "native";
  }
  function yd() {
    if (Z || j || se) return;
    ((Z = !0),
      (e?.fsWatchProbe ?? probeFsWatch)().then((q) => {
        if (((Z = !1), se || j)) return;
        if (q === "silent" || q === "refused") {
          zi(G ? `fs_watch_${q}_late` : `fs_watch_${q}`);
          return;
        }
        if (!G) ((G = !0), logFeatureOk("settings_watcher_start"));
      }));
  }
  function zi(q) {
    if (j || se) return;
    ((j = !0),
      (ee = (ae ?? Date.now()) - Lu),
      logForDebugging(
        `[settings] native file watching is not delivering events on this host (${q}); polling settings files every ${S}ms instead`,
        { level: "warn" },
      ),
      logFeatureSad("settings_watcher_start", q),
      co());
  }
  function io(q) {
    let Q = getErrnoCode(q),
      de = q instanceof Error && "syscall" in q ? q.syscall : void 0;
    if ((Q === "EMFILE" || Q === "ENFILE" || Q === "ENOSPC") && (de === void 0 || de === "watch"))
      zi(`fs_watch_refused_late_${Q.toLowerCase()}`);
  }
  function Hi(q, Q) {
    if (Q !== re) return;
    let de = hd(),
      { dirs: dirs, settingsFiles: settingsFiles, dropInDir: dropInDir } = q;
    gr = q.realpathToCanonical;
    let Ke = new Set();
    for (let De of Ns(Ft, q.pendingDirs)) Xt.add(De);
    ((Ft = new Set(q.pendingDirs)), (ae ??= Date.now()));
    let hr = L;
    if (((L = null), hr)) hr.close().catch(() => {});
    (Pn?.(), (Pn = null));
    for (let De of St.values()) De.close();
    St.clear();
    for (let De of Ft) wd(De, de);
    if (dirs.length === 0) {
      Yi(settingsFiles, Promise.resolve(), Ke);
      return;
    }
    logForDebugging(
      `Watching for changes in setting files ${[...settingsFiles].join(", ")}...${dropInDir ? ` and drop-in directory ${dropInDir}` : ""}${de === "polling" ? ` (polling every ${S}ms)` : ""}`,
    );
    for (let [De, Mt] of gr)
      logForDebugging(
        `Settings file ${Mt} is a symlink to ${De}; also watching ${pathModule.dirname(De)} so atomic-save edits to the target are detected`,
      );
    let watch = Ok.watch(dirs, {
      persistent: !0,
      ignoreInitial: !0,
      depth: 0,
      awaitWriteFinish: { stabilityThreshold: n, pollInterval: r },
      ignored: (path, stats) => {
        if (stats && !stats.isFile() && !stats.isDirectory()) return !0;
        if (path.split(/[/\\]/).some((dir) => dir === ".git")) return !0;
        if (!stats || stats.isDirectory()) return !1;
        let normalized = pathModule.normalize(path);
        if (settingsFiles.has(normalized)) return Ke.has(normalized) && Gs(stats);
        if (dropInDir && normalized.startsWith(dropInDir + pathModule.sep) && normalized.endsWith(".json"))
          return !1;
        return !0;
      },
      ignorePermissionErrors: !0,
      ...(de === "polling" ? { usePolling: !0, interval: S, binaryInterval: S } : { usePolling: !1 }),
      atomic: !0,
    });
    if (
      ((L = watch),
      watch.options?.usePolling === !1 && (getPlatform() === "linux" || getPlatform() === "wsl"))
    )
      Ke = q.projectScoped;
    let promise = new Promise((De) => {
      ((Pn = De), watch.once("ready", De));
    });
    if (
      (watch.on("change", pr),
      watch.on("unlink", Ji),
      watch.on("add", Xi),
      watch.on("unlinkDir", (De) => {
        if (settingsFiles.has(pathModule.normalize(De))) Ji(De);
      }),
      watch.on("error", (De) => {
        if (
          (logForDebugging(`[settings] watcher error: ${errorMessage(De)}`, { level: "warn" }),
          de === "native")
        )
          io(De);
      }),
      Yi(settingsFiles, promise, Ke),
      de === "native")
    )
      yd();
  }
  async function Yi(q, Q, de) {
    if (Xt.size === 0 && ee === null) return;
    let Se = new Set(Xt);
    Xt.clear();
    let Ce = ee;
    ((ee = null),
      await Q,
      await Promise.all(
        [...q]
          .filter((xe) => Ce !== null || Se.has(pathModule.dirname(xe)))
          .map(async (xe) => {
            let Ke = await _d(xe);
            if (se || Ke === null) return;
            let hr = de.has(xe) && Gs(Ke);
            if ((Se.has(pathModule.dirname(xe)) && !hr) || (Ce !== null && Ke.mtimeMs >= Ce)) pr(xe);
          }),
      ));
  }
  function wd(q, Q) {
    let dir = pathModule.dirname(q);
    if (Q === "polling") {
      if (!St.has(q)) {
        let Se = setInterval((Ce, xe) => void Ce(xe), S, so, q);
        (Se.unref(),
          St.set(q, { close: () => clearInterval(Se) }),
          logForDebugging(`Polling for ${q} to appear every ${S}ms`));
      }
    } else if (!St.has(dir))
      try {
        let Se = watch(dir, (Ce, xe) => {
          for (let Ke of Ft)
            if (pathModule.dirname(Ke) === dir && (xe === null || xe === pathModule.basename(Ke))) so(Ke);
        });
        (Se.on("error", (Ce) => {
          (logForDebugging(`[settings] creation watcher error on ${dir}: ${errorMessage(Ce)}`, {
            level: "warn",
          }),
            io(Ce));
        }),
          St.set(dir, Se),
          logForDebugging(`Watching ${dir} for ${q} to appear`));
      } catch (error) {
        (logForDebugging(`[settings] cannot watch ${dir} for ${q} to appear: ${errorMessage(error)}`, {
          level: "warn",
        }),
          io(error));
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
    if (((se = !0), he)) (he(), (he = null));
    if (ce) (clearInterval(ce), (ce = null));
    for (let Q of ie.values()) clearTimeout(Q);
    (ie.clear(),
      qi(),
      (st = void 0),
      (qt = void 0),
      (gr = new Map()),
      (we = null),
      IRi(),
      Ee?.(),
      (Ee = null),
      (ye = null),
      P.clear());
    for (let Q of St.values()) Q.close();
    (St.clear(), Ft.clear(), Xt.clear(), Pn?.(), (Pn = null));
    let q = L;
    return ((L = null), q ? q.close() : Promise.resolve());
  }
  async function bd() {
    if (!me || se || wt()) return;
    for (let [q, Q] of ie) if (getSourceForPath(q) === void 0) (clearTimeout(Q), ie.delete(q));
    await co();
  }
  async function co() {
    let q = ++re,
      Q = await getWatchTargets(We);
    if (se) return;
    Hi(Q, q);
  }
  function Sd(q) {
    if (!Ft.delete(q)) return;
    (logForDebugging(`Settings directory ${q} appeared; watching it`), Xt.add(q), co());
  }
  async function _d(q) {
    try {
      let Q = await stat(q);
      while (!0) {
        if ((await sleep(n), se)) return null;
        let de = await stat(q);
        if (de.size === Q.size && de.mtimeMs === Q.mtimeMs) return de.isFile() ? de : null;
        Q = de;
      }
    } catch {}
    return null;
  }
  async function Vi(q, Q) {
    let subscribe = await q.subscribe({ target: "key", key: STORAGE_SPACES.userSettings() }, vd, {
      maxObservationLagMs: y,
    });
    if (!subscribe.ok)
      return (
        logForDebugging(
          `[settings] watching ${Q} through the storage interface failed: ${formatStorageError(subscribe.error)}`,
          { level: "warn" },
        ),
        !1
      );
    if (e?.subscribedObservationLag === void 0) O = Math.max(O, R(subscribe.value.observationLagMs));
    return (logForDebugging(`Watching for changes in ${Q} through the storage interface`), !0);
  }
  function vd(q) {
    let Q = st;
    if (se || Q === void 0) return;
    if (!q.ok) {
      if (
        (logForDebugging(
          `[settings] watching ${Q} through the storage interface ended: ${formatStorageError(q.error)}`,
          { level: "warn" },
        ),
        !Gi && isStorageV5Enabled() && We !== void 0)
      )
        ((Gi = !0), Vi(We, Q));
      return;
    }
    switch (q.value.kind) {
      case "snapshot": {
        let de = qt,
          Se = "absent" in q.value ? { present: !1 } : { present: !0, version: q.value.version };
        if (((qt = Se), de === void 0)) return;
        if (Se.present) {
          let Ce = !de.present || ie.has(Q);
          if (Ce || de.version !== Se.version) {
            if (Ce) It = !0;
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
        ((qt = { present: !0, version: q.value.version }), (It = !0), uo(Q));
        return;
      case "updated":
        ((qt = { present: !0, version: q.value.version }), uo(Q));
        return;
      case "deleted":
        ((qt = { present: !1 }), Ki(Q, ""));
        return;
    }
  }
  function Ki(q, Q) {
    let de = yt !== null && It && !fr;
    if ((qi(), de)) return;
    (logForDebugging(`Detected deletion of ${q}${Q}`), Qi(q, "userSettings", O));
  }
  function uo(q) {
    let Q = ie.get(q);
    if (Q)
      (clearTimeout(Q),
        ie.delete(q),
        (fr = !0),
        (It = !0),
        logForDebugging(`Cancelled pending deletion of ${q} \u2014 file was recreated`));
    if (yt) clearTimeout(yt);
    yt = setTimeout(kd, n);
  }
  function qi() {
    if (yt) (clearTimeout(yt), (yt = null));
    ((It = !1), (fr = !1));
  }
  function kd() {
    yt = null;
    let q = It;
    ((It = !1), (fr = !1));
    let Q = st;
    if (se || Q === void 0) return;
    if (q) Xi(Q);
    else pr(Q);
  }
  function mo(q) {
    return gr.get(pathModule.normalize(q)) ?? q;
  }
  function pr(q) {
    if (se) return;
    let Q = mo(q),
      de = getSourceForPath(Q);
    if (!de) return;
    let Se = ie.get(Q);
    if (Se)
      (clearTimeout(Se),
        ie.delete(Q),
        logForDebugging(`Cancelled pending deletion of ${Q} \u2014 file was recreated`));
    if (consumeInternalWrite(Q, lIn)) {
      logForDebugging(`Suppressed change to ${Q} \u2014 echo of our own write within the last ${lIn}ms`);
      return;
    }
    (logForDebugging(`Detected change to ${Q}${q !== Q ? ` (via symlink target ${q})` : ""}`),
      es(de, Q).then((Ce) => {
        if (Ce) {
          logForDebugging(`ConfigChange hook blocked change to ${Q}`);
          return;
        }
        if (isStorageV5Enabled() && We !== void 0 && Q === st) {
          nio(We, is(), Q).then((xe) => {
            try {
              Cn(de, xe !== void 0 && !se ? { userLayer: "retain" } : void 0);
            } finally {
              xe?.();
            }
          });
          return;
        }
        Cn(de);
      }));
  }
  function Xi(q) {
    let Q = mo(q);
    if (!getSourceForPath(Q)) return;
    let Se = ie.get(Q);
    if (Se)
      (clearTimeout(Se),
        ie.delete(Q),
        logForDebugging(`Cancelled pending deletion of ${Q} \u2014 file was re-added`));
    pr(q);
  }
  function Ji(q) {
    let Q = mo(q),
      de = getSourceForPath(Q);
    if (!de) return;
    if ((logForDebugging(`Detected deletion of ${Q}`), getPlatform() === "macos"))
      L?.add(pathModule.dirname(q));
    Qi(Q, de);
  }
  function Qi(q, Q, de = j ? R(S) : h) {
    if (ie.has(q)) return;
    let Se = setTimeout(Rd, de, q, Q);
    ie.set(q, Se);
  }
  function Rd(q, Q) {
    (ie.delete(q),
      es(Q, q).then((de) => {
        if (de) {
          logForDebugging(`ConfigChange hook blocked deletion of ${q}`);
          return;
        }
        Cn(Q);
      }));
  }
  function es(q, Q) {
    if (!He)
      return (
        logError(Error("settingsChangeDetector: ConfigChange hook gate not wired")),
        Promise.resolve(!0)
      );
    return He(settingSourceToConfigChangeSource(q), Q);
  }
  function ts(q, Q, de, Se) {
    return jsonStringify({
      mdm: q.settings,
      mdmErrors: q.errors,
      mdmUserWritable: q.userWritable === !0,
      mdmDocumentHasPolicyContent: q.documentHasPolicyContent === !0,
      mdmLoadState: q.loadState,
      mdmHeldDocuments: q.heldDocuments ?? [],
      hkcu: Q.settings,
      hkcuErrors: Q.errors,
      wslInherits: de,
      wslWindowsFile: Se,
    });
  }
  async function Ed() {
    if (((we = ts(One(), startMdmPoll(), Mne(), await hasManagedSettingsFile(We))), se)) return;
    ((ce = setInterval(() => {
      if (se) return;
      (async () => {
        try {
          let q = await n1e(We);
          if (se) return;
          let { mdm: mdm, hkcu: hkcu, wslInherits: wslInherits } = Uyr(q);
          (cIn(void 0), GOe(q.mdm, q.hkcu, q.wslInherits, q.whereAsked));
          let Ce = await hasManagedSettingsFile(We);
          if (se) return;
          let xe = ts(mdm, hkcu, wslInherits, Ce);
          if (xe !== we)
            ((we = xe), logForDebugging("Detected MDM settings change via poll"), Cn("policySettings"));
          cIn(q.readOutcomes);
        } catch (error) {
          logForDebugging(`MDM poll error: ${errorMessage(error)}`);
        }
      })();
    }, s)),
      ce.unref());
  }
  function Pd() {
    if (se || !w) return;
    let q = is();
    if (q === ye) return;
    (Ee?.(), (ye = q), (Ee = q.changed.subscribe((Q) => rs(Q))));
  }
  function Cn(q, Q, de) {
    or(Q);
    try {
      rs(q, de);
    } catch (error) {
      for (let Ce of error instanceof AggregateError ? error.errors : [error])
        logError(withTelemetryMessage(toError(Ce), "settingsChangeDetector: subscriber threw during fanOut"));
    }
  }
  function rs(q, Q) {
    let de = Ao();
    ((de.settingsChangesUnfinished = (de.settingsChangesUnfinished ?? 0) + 1),
      P.emit(q, Q),
      de.settingsChangesUnfinished--);
  }
  function Md(q, Q) {
    (logForDebugging(`Programmatic settings change notification for ${q}`), Cn(q, void 0, Q));
  }
  return {
    initialize: pd,
    dispose: ao,
    rehome: bd,
    [Symbol.asyncDispose]: ao,
    subscribe: (q) => (Pd(), P.subscribe(q)),
    notifyChange: Md,
    isWatching: () => me && !se,
  };
}
/**
 * 设置变更检测器单例（initialize() 的返回值）。
 */
//@ chunk-82kqcve8.js:34017-34030 layout
var settingsChangeDetector = createSettingsChangeDetector();
//@ chunk-82kqcve8.js:34030-34153 layout
function isUserSettingsSource(e) {
  if (!isStorageV5Enabled() || e === void 0) return;
  let n = getSettingsFilePathForSource("userSettings");
  return n !== void 0 && pathModule.basename(n) === USER_SETTINGS_FILE_NAMES.default ? n : void 0;
}
//@ chunk-82kqcve8.js:34153-36037 fingerprint = getWatchTargets (0.327)
async function getWatchTargets(e) {
  let dirToSettingsFiles = new Map(),
    dirsWithExistingFiles = new Set(),
    s = new Map(),
    h = new Set(),
    y = [],
    w = new Set(),
    S = isUserSettingsSource(e);
  for (let source of SETTING_SOURCES) {
    if (source === "flagSettings") continue;
    let path = getSettingsFilePathForSource(source);
    if (S !== void 0 && path === S) continue;
    if (path) {
      if ((y.push(path), source === "projectSettings" || source === "localSettings")) w.add(path);
    }
  }
  let R = getLegacyLocalSettingsFilePath();
  if (R) (y.push(R), w.add(R));
  let O = new Set();
  for (let ee of new Set(
    y.filter((re) => w.has(re) && !isInClaudeConfigHome(re)).map((re) => pathModule.dirname(re)),
  ))
    if (!isMissingPathError(ee))
      (O.add(ee),
        logForDebugging(
          `Not watching settings directory ${ee}: it or an entry in it leads onto a network path or could not be vetted (its settings files are unwatched this session)`,
        ));
  let P = new Set();
  for (let ee of y) {
    let dir = pathModule.dirname(ee);
    if (O.has(dir)) continue;
    if (!dirToSettingsFiles.has(dir)) dirToSettingsFiles.set(dir, new Set());
    if ((dirToSettingsFiles.get(dir).add(ee), !dirsWithExistingFiles.has(dir) && !P.has(dir)))
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
      let we = await realpath(dir),
        dir_2 = pathModule.dirname(stats);
      if (pathModule.join(we, pathModule.basename(ee)) === stats) continue;
      let se = dir_2 === we,
        ye = se ? pathModule.join(dir, pathModule.basename(stats)) : stats;
      if (getSourceForPath(ye) !== void 0) continue;
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
      if ((s.set(ye, ee), h.add(dir), se)) dirToSettingsFiles.get(dir).add(ye);
      else {
        if (!dirToSettingsFiles.has(dir_2)) dirToSettingsFiles.set(dir_2, new Set());
        (dirToSettingsFiles.get(dir_2).add(ye), dirsWithExistingFiles.add(dir_2), h.add(dir_2));
      }
    } catch {}
  }
  let settingsFiles = new Set();
  for (let dir of dirsWithExistingFiles) {
    let filesInDir = dirToSettingsFiles.get(dir);
    if (filesInDir) for (let file of filesInDir) settingsFiles.add(file);
  }
  let dropInDir = null,
    managedDropIn = getDropInDir();
  try {
    if ((await stat(managedDropIn)).isDirectory())
      (dirsWithExistingFiles.add(managedDropIn), (dropInDir = managedDropIn), h.add(managedDropIn));
  } catch {}
  let Z = getPlatform() === "macos",
    ae = new Set();
  for (let ee of dirsWithExistingFiles) {
    let re = dirToSettingsFiles.get(ee);
    if (!re || !Z || h.has(ee)) {
      ae.add(ee);
      continue;
    }
    let ce = !1;
    for (let we of re)
      try {
        if ((await stat(we)).isFile()) ae.add(we);
        else ce = !0;
      } catch {
        ce = !0;
      }
    if (ce) ae.add(ee);
  }
  return {
    dirs: [...ae],
    settingsFiles: settingsFiles,
    projectScoped: w,
    dropInDir: dropInDir,
    realpathToCanonical: s,
    servedByV5: S,
    pendingDirs: P,
  };
}
//@ chunk-82kqcve8.js:36037-36340 layout
function isMissingPathError(e) {
  try {
    vetRepoSettingsPath(getFsImplementation(), e, { failClosed: !0 });
  } catch {
    return !1;
  }
  let n;
  try {
    n = readdirSync(e);
  } catch (error) {
    let s = getErrnoCode(error);
    return s === "ENOENT" || s === "ENOTDIR";
  }
  for (let r of n) {
    let joined = pathModule.join(e, r),
      h = !0;
    if (!cl(r))
      try {
        h = getFsImplementation().lstatSync(joined).isSymbolicLink();
      } catch {}
    if (!h) continue;
    try {
      vetRepoSettingsPath(getFsImplementation(), joined, { failClosed: !0 });
    } catch {
      return !1;
    }
  }
  return !0;
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
  let normalizedPath = pathModule.normalize(path),
    dropInDir = getDropInDir();
  if (normalizedPath.startsWith(dropInDir + pathModule.sep)) return "policySettings";
  let found = SETTING_SOURCES.find((source) => getSettingsFilePathForSource(source) === normalizedPath);
  if (found) return found;
  let h = getLegacyLocalSettingsFilePath();
  if (h && pathModule.normalize(h) === normalizedPath) return "localSettings";
  return;
}
//@ chunk-82kqcve8.js:36765-36843 affinity
function Gs(e) {
  return e.isFile() && e.size === 0 && e.nlink === 1 && (e.mode & 511) === 292;
}
//@ chunk-q8cqcff6.js:10635-10676 callgraph-fingerprint = startMdmPoll (0.169)
function startMdmPoll() {
  return Uyr(se()).hkcu ?? freeze;
}

export { settingsChangeDetector, createSettingsChangeDetector, startMdmPoll };
