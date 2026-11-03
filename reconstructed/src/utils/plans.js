/**
 * utils/plans.ts
 *
 * 计划文件（<计划目录>/<slug>.md）的读取、缓存、resume/fork 复制与从消息中恢复。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plans.ts
 * pieces: chunk-82kqcve8.js (50), chunk-e6aww6q8.js (5), chunk-q8cqcff6.js (1)
 * attribution: placement 4, layout 21, facade-exports 21, sole-consumer 2, fingerprint 6, affinity 2
 */
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
} from "path";
import { readdir, readdir as readdir_2, lstat, lstat as lstat_2, lstat as lstat_3 } from "fs/promises";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { isStorageV5Enabled } from "./hoverRest.js";
import {
  onSessionSwitch,
  getPlanSlugCache,
  getIsNonInteractiveSession,
  getSessionTrustAccepted,
  getRootSession,
  isDiskless,
  getSessionId,
} from "../bootstrap/state.js";
import { validateStorageKey } from "./storage/storageKeys.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { isCleanupStarted } from "./cleanupRegistry.js";
import { raceWithTimeout } from "./sleep.js";
import { slugifyPromptWords, randomWordSlug, generateWordSlug } from "./words.js";
import { HostScoped } from "./hostScoped.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import {
  isENOENT,
  isFsInaccessible,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { logError } from "./log.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { WINDOWS_RESERVED_NAME_RE, truncateWithCount, CONTROL_CHARS_EXCEPT_WS_RE } from "./stringUtils.js";
import { jsonStringify } from "./slowOperations.js";
import { getInitialSettings_2 } from "./settings/settings.js";
import { getCwd } from "./cwd.js";
import { rc } from "./pathClassification.js";
import { findIntermediateUncJunction, getFsImplementation } from "./fsOperations.js";
import { Tm } from "./windowsUncPaths.js";
import { getFileReader } from "./fileStore.js";
import { warnDisklessSettingsWrite } from "./settings/settingsStorage.js";
import { getEnvironmentKind } from "./filePersistence/outputsScanner.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { API_STRIPPED_INPUT_FIELDS } from "./api.js";
import { recordTranscript } from "./sessionStorage.js";
import { getInstalledPluginsFilePath, parseInstalledPluginsJson } from "./plugins/installedPluginsManager.js";
import { getPlatform } from "./platform.js";
import { Gi } from "./shell/powershellDetection.js";
import { e9 } from "./permissions/protectedDirs.js";

//@ chunk-82kqcve8.js:178775-178835 placement
var Bg = 10,
  ui = 2000,
  jg = 8,
  Ug = /^[a-z0-9]+(-[a-z0-9]+)*$/,
  Gg = 100;
/**
 * 计划文件（plans/*.md）的存储与监听
 */
//@ chunk-82kqcve8.js:178835-186934 placement
class PlansStore {
  primedListing = null;
  slugMeta = new Map();
  planFileCache = null;
  planFileBackend = null;
  planFileWatches = new Map();
  primeInFlight = null;
  waitCapMs = ui;
  stopReleasingOnSwitch = null;
  lastUnwatched = new Map();
  earlyObserved = new Map();
  earlyGeneration = 0;
  snapshotChain = Promise.resolve();
  planFileCacheKeyFor(e) {
    if (this.planFileCache === null) return null;
    let n = resolve_6(e);
    if (dirname_6(n) !== gt()) return null;
    return basename_4(n);
  }
  notePlanFileWritten(e, n) {
    if (this.planFileCache === null) {
      this.noteEarly(e, n);
      return;
    }
    let planFileCacheKeyFor = this.planFileCacheKeyFor(e);
    if (planFileCacheKeyFor !== null) {
      let s = this.planFileWatches.get(planFileCacheKeyFor);
      if (s !== void 0) s.generation++;
      if (
        (this.planFileCache.set(planFileCacheKeyFor, n),
        this.primedListing !== null && this.primedListing.dir === gt())
      )
        this.primedListing.listing.add(planFileCacheKeyFor);
    }
  }
  notePlanFileForgotten(e) {
    if (this.planFileCache === null) {
      this.noteEarly(e, void 0);
      return;
    }
    let planFileCacheKeyFor = this.planFileCacheKeyFor(e);
    if (planFileCacheKeyFor !== null) {
      let r = this.planFileWatches.get(planFileCacheKeyFor);
      if (r !== void 0) {
        (this.dropToUnknown(planFileCacheKeyFor, r), this.refreshPlanFile(planFileCacheKeyFor, r));
        return;
      }
      this.planFileCache.delete(planFileCacheKeyFor);
    }
  }
  resetPlanFileCacheToUnknown() {
    if (this.planFileCache === null) return;
    for (let e of [...this.planFileCache.keys()]) {
      let n = this.planFileWatches.get(e);
      if (n !== void 0) (this.dropToUnknown(e, n), this.refreshPlanFile(e, n));
      else this.planFileCache.delete(e);
    }
  }
  activatePlanFileCache(e) {
    if (
      ((this.planFileCache ??= new Map()),
      isStorageV5Enabled() && e !== void 0 && this.planFileBackend === null)
    ) {
      ((this.planFileBackend = e),
        (this.stopReleasingOnSwitch = onSessionSwitch(() => this.releaseStaleWatches())));
      for (let n of new Set(getPlanSlugCache().values())) this.watchSlug(n, !1);
      this.earlyObserved.clear();
    }
  }
  noteEarly(e, n) {
    if (!isStorageV5Enabled()) return;
    let r = resolve_6(e);
    if (dirname_6(r) !== gt()) return;
    if ((this.earlyGeneration++, n === void 0)) this.earlyObserved.delete(basename_4(r));
    else this.earlyObserved.set(basename_4(r), n);
  }
  watchSlug(e, n) {
    (this.releaseStaleWatches(), this.watchPlanFile(e, `${e}.md`, n), this.lastUnwatched.clear());
  }
  releaseStaleWatches() {
    if (this.planFileWatches.size === 0) return;
    let e = new Set(getPlanSlugCache().values());
    for (let [n, r] of this.planFileWatches) if (!e.has(r.slug)) this.stopWatch(n, r);
  }
  watchPlanFile(e, n, r) {
    let planFileBackend = this.planFileBackend;
    if (
      planFileBackend === null ||
      this.planFileCache === null ||
      this.planFileWatches.has(n) ||
      !pt() ||
      validateStorageKey(Je(stripMdExtension(n))) !== void 0
    )
      return;
    let h = {
      slug: e,
      generation: 0,
      seededAbsent: !1,
      subscription: void 0,
      refreshing: void 0,
      refreshAgain: !1,
      resubscribed: !1,
      stopped: !1,
    };
    this.planFileWatches.set(n, h);
    let y = this.earlyObserved.has(n) ? this.earlyObserved.get(n) : this.lastUnwatched.get(n);
    if ((this.earlyObserved.delete(n), this.lastUnwatched.delete(n), y !== void 0))
      this.planFileCache.set(n, y);
    else if (r && !this.planFileCache.has(n)) (this.planFileCache.set(n, null), (h.seededAbsent = !0));
    this.subscribePlanFile(planFileBackend, n, h);
  }
  observePlanFile(e) {
    let n = this.planFileWatches.get(e);
    return { watch: n, generation: n?.generation ?? this.earlyGeneration };
  }
  notePlanFileObserved(e, n, r) {
    let s = this.planFileWatches.get(e);
    if (s !== void 0)
      if (r.watch === s && s.generation === r.generation) this.installPlanFile(e, s, n);
      else this.refreshPlanFile(e, s);
    else if (
      this.planFileBackend === null &&
      isStorageV5Enabled() &&
      r.watch === void 0 &&
      this.earlyGeneration === r.generation
    )
      this.earlyObserved.set(e, n);
  }
  watchAgentPlanFile(e, n) {
    if (this.planFileBackend === null) return;
    let r = this.planFileWatches.get(n);
    if (r !== void 0) {
      (this.planFileWatches.delete(n), this.planFileWatches.set(n, r));
      return;
    }
    let filtered = [...this.planFileWatches].filter(([h, y]) => y.slug === e && h !== `${e}.md`);
    for (let [h, y] of filtered.slice(0, Math.max(0, filtered.length - jg + 1))) {
      let w = this.planFileCache?.get(h);
      if ((this.stopWatch(h, y), typeof w === "string")) this.planFileCache?.set(h, w);
    }
    this.watchPlanFile(e, n, !1);
  }
  async subscribePlanFile(e, n, r) {
    let generation = r.generation,
      h;
    try {
      let subscribe = await e.subscribe(
        { target: "key", key: Je(stripMdExtension(n)) },
        (w) => this.onPlanFileEvent(n, r, generation, w),
        { maxObservationLagMs: ui },
      );
      if (subscribe.ok) {
        if (r.stopped) subscribe.value.unsubscribe();
        else
          ((r.subscription = subscribe.value),
            logForDebugging(
              `plans: watching ${n} through the storage interface (changes trail by at most ${subscribe.value.observationLagMs} ms)`,
            ));
        return;
      }
      h = formatStorageError(subscribe.error);
    } catch (error) {
      h = String(error);
    }
    if (r.stopped) return;
    if (
      (logForDebugging(
        `plans: watching ${n} through the storage interface failed (${h}); serving its last read and in-process writes`,
      ),
      this.planFileCache?.has(n) !== !0)
    )
      this.refreshPlanFile(n, r);
  }
  onPlanFileEvent(e, n, r, s) {
    if (n.stopped) return;
    if (!s.ok) {
      if (s.error.code === "Unavailable") {
        queueMicrotask(() => void this.refreshPlanFile(e, n));
        return;
      }
      if (((n.subscription = void 0), isCleanupStarted())) return;
      logForDebugging(`plans: the watch on ${e} ended: ${formatStorageError(s.error)}`);
      let planFileBackend = this.planFileBackend;
      if (planFileBackend !== null && !n.resubscribed)
        ((n.resubscribed = !0), this.subscribePlanFile(planFileBackend, e, n));
      else this.stopWatch(e, n);
      return;
    }
    let h = s.value;
    if (h.kind === "snapshot" && n.generation === r) {
      if (!("absent" in h)) {
        this.installPlanFile(e, n, Buffer.from(h.value).toString("utf-8"));
        return;
      }
      if (n.seededAbsent && n.generation === 0) {
        this.installPlanFile(e, n, null);
        return;
      }
    }
    queueMicrotask(() => void this.refreshPlanFile(e, n));
  }
  installPlanFile(e, n, r) {
    (n.generation++, this.planFileCache?.set(e, r));
  }
  refreshPlanFile(e, n) {
    if (n.refreshing !== void 0) return ((n.refreshAgain = !0), n.refreshing);
    let planFileBackend = this.planFileBackend;
    if (planFileBackend === null) return Promise.resolve();
    let s = async () => {
      await Promise.resolve();
      try {
        do {
          n.refreshAgain = !1;
          let generation = n.generation,
            planFileForWatch = await this.readPlanFileForWatch(planFileBackend, e);
          if (n.stopped) return;
          if (planFileForWatch === void 0) {
            if (n.generation === generation) (n.generation++, this.planFileCache?.delete(e));
            continue;
          }
          if (n.generation === generation) this.installPlanFile(e, n, planFileForWatch);
          else n.refreshAgain = !0;
        } while (n.refreshAgain && !n.stopped);
      } finally {
        n.refreshing = void 0;
      }
    };
    return ((n.refreshing = s()), n.refreshing);
  }
  async readPlanFileForWatch(e, n) {
    try {
      let read = await e.read([Je(stripMdExtension(n))]);
      if (read.ok) {
        let s = read.value.items[0];
        return s?.found ? Buffer.from(s.value).toString("utf-8") : null;
      }
      logForDebugging(`plans: v5 read of ${n} failed: ${read.error.code}`);
    } catch (error) {
      logForDebugging(`plans: v5 read of ${n} threw: ${error}`);
    }
    return;
  }
  async settlePlanFile(e) {
    let n = this.planFileWatches.get(e);
    if (n === void 0) return;
    let r = n.refreshing ?? (this.planFileCache?.has(e) !== !0 ? this.refreshPlanFile(e, n) : void 0);
    if (r !== void 0 && !(await raceWithTimeout(r, this.waitCapMs))) this.giveUpWaiting(e, n);
  }
  dropToUnknown(e, n) {
    if (n.stopped) return;
    (n.generation++, this.planFileCache?.delete(e));
  }
  giveUpWaiting(e, n) {
    if (this.planFileCache?.has(e)) this.dropToUnknown(e, n);
  }
  unwatchSlug(e) {
    for (let [n, r] of this.planFileWatches) if (r.slug === e) this.stopWatch(n, r);
  }
  unwatchAllPlanFiles() {
    this.lastUnwatched.clear();
    for (let [e, n] of this.planFileWatches) {
      let r = this.planFileCache?.get(e);
      if (r !== void 0) this.lastUnwatched.set(e, r);
      this.stopWatch(e, n);
    }
  }
  stopWatch(e, n) {
    ((n.stopped = !0),
      n.subscription?.unsubscribe(),
      (n.subscription = void 0),
      this.planFileWatches.delete(e),
      this.planFileCache?.delete(e));
  }
  commitPlanListing(e, n) {
    let r = new Set(n);
    this.primedListing = { dir: e, listing: r };
    let s = getPlanSlugCache(),
      filtered = [...this.slugMeta].filter(([, w]) => w.validatedDir !== e),
      y = new Set(filtered.map(([w]) => w));
    for (let [w, S] of s) if (!y.has(w)) r.add(`${S}.md`);
    for (let [w, S] of filtered) {
      let R = s.get(w);
      if (R === void 0) {
        this.slugMeta.delete(w);
        continue;
      }
      if (r.has(`${R}.md`)) {
        if (S.consumed) {
          (logForDebugging(
            `Plan slug collision for '${R}' in ${e} detected after the plan path was already in use \u2014 keeping the slug (the pre-existing plan file may be overwritten).`,
            { level: "warn" },
          ),
            (S.validatedDir = e));
          continue;
        }
        if ((s.delete(w), this.slugMeta.delete(w), ![...s.values()].includes(R))) this.unwatchSlug(R);
        this.getPlanSlug(w, S.seed);
      } else (r.add(`${R}.md`), (S.validatedDir = e));
    }
  }
  getPlanSlug(e, n) {
    let r = getPlanSlugCache(),
      s = r.get(e);
    if (!s) {
      let h = n ? slugifyPromptWords(n) : "",
        y = !0;
      for (let R = 0; R < Bg; R++)
        if (
          ((s = h ? `${h}-${randomWordSlug()}` : generateWordSlug()),
          (y = this.primedListing?.listing.has(`${s}.md`) === !0),
          !y)
        )
          break;
      let w = !getIsNonInteractiveSession() && !getSessionTrustAccepted();
      this.slugMeta.set(e, {
        validatedDir: w || this.primedListing === null ? null : this.primedListing.dir,
        consumed: !1,
        seed: n,
      });
      let S = !y && this.primedListing !== null && this.primedListing.dir === gt();
      (this.primedListing?.listing.add(`${s}.md`),
        r.set(e, s),
        this.lastUnwatched.clear(),
        this.watchSlug(s, S));
    }
    return s;
  }
  markPlanPathServed(e) {
    let n = this.slugMeta.get(e);
    if (n) n.consumed = !0;
  }
  exemptSlugFromRevalidation(e, n) {
    (this.slugMeta.delete(e), this.primedListing?.listing.add(`${n}.md`), this.watchSlug(n, !1));
  }
  clearAllPlanSlugs() {
    (getPlanSlugCache().clear(), this.slugMeta.clear(), this.unwatchAllPlanFiles());
  }
  reset() {
    ((this.primedListing = null),
      this.slugMeta.clear(),
      this.unwatchAllPlanFiles(),
      this.lastUnwatched.clear(),
      this.earlyObserved.clear(),
      (this.primeInFlight = null),
      (this.waitCapMs = ui),
      this.stopReleasingOnSwitch?.(),
      (this.stopReleasingOnSwitch = null),
      (this.planFileBackend = null),
      (this.planFileCache = null),
      (this.snapshotChain = Promise.resolve()));
  }
}
//@ chunk-82kqcve8.js:186934-186959 layout
var zg = new HostScoped(() => new PlansStore());
//@ chunk-82kqcve8.js:186959-186989 layout
function fi() {
  return getRootSession().host;
}
//@ chunk-82kqcve8.js:186989-187022 facade-exports
function planFiles() {
  return zg.of(fi());
}
//@ chunk-82kqcve8.js:187022-187070 facade-exports
function notePlanFileWritten(e, n) {
  planFiles().notePlanFileWritten(e, n);
}
//@ chunk-82kqcve8.js:187070-187115 facade-exports
function notePlanFileForgotten(e) {
  planFiles().notePlanFileForgotten(e);
}
//@ chunk-82kqcve8.js:187115-187165 facade-exports
function resetPlanFileCacheToUnknown() {
  planFiles().resetPlanFileCacheToUnknown();
}
/**
 * 分页列出 v5 存储中 plan 命名空间下的所有键，转成 "<名称>.md" 列表；列表出错、超过页数上限或抛异常时记日志并返回 null。
 */
//@ chunk-82kqcve8.js:187165-187684 sole-consumer
async function listPlanSlugsFromStore(e) {
  let planFiles = [];
  try {
    let pageResult = await readAllPages(
      (s) => e.listEntries({ namespace: "plan" }, { cursor: s, skipKeyStats: !0 }),
      (s) => {
        for (let h of s)
          if (h.kind === "key" && h.key.namespace === "plan") planFiles.push(`${h.key.name}.md`);
      },
    );
    switch (pageResult.status) {
      case "done":
        return planFiles;
      case "error":
        return (logForDebugging(`primePlanSlugCollisions: v5 list failed: ${pageResult.error.code}`), null);
      case "capped":
        return (
          logForDebugging(
            `primePlanSlugCollisions: v5 list exceeded ${DEFAULT_MAX_PAGES} pages; leaving the listing unprimed`,
          ),
          null
        );
    }
  } catch (error) {
    return (logForDebugging(`primePlanSlugCollisions: v5 list threw: ${error}`), null);
  }
}
//@ chunk-82kqcve8.js:187684-187814 sole-consumer
async function primePlanSlugCollisions_2(e, n) {
  let r = await listPlanSlugsFromStore(e);
  if (n !== Hr()) return;
  if (r !== null) (planFiles().activatePlanFileCache(e), planFiles().commitPlanListing(n, r));
}
//@ chunk-82kqcve8.js:187944-188040 facade-exports
async function settlePlanFileCachePrime() {
  let e = planFiles();
  if (e.primeInFlight !== null) await raceWithTimeout(e.primeInFlight, e.waitCapMs);
}
//@ chunk-82kqcve8.js:188040-188399 facade-exports
async function primePlanSlugCollisions(e) {
  let n = Hr();
  if (e && n === gt()) {
    let r = planFiles(),
      s = primePlanSlugCollisions_2(e, n);
    r.primeInFlight = s;
    try {
      await s;
    } finally {
      if (r.primeInFlight === s) r.primeInFlight = null;
    }
    return;
  }
  if (isDiskless()) {
    planFiles().commitPlanListing(n, []);
    return;
  }
  try {
    let r = await readdir_2(n);
    if (n !== Hr()) return;
    planFiles().commitPlanListing(n, r);
  } catch (error) {
    if (!isENOENT(error) && !isFsInaccessible(error)) logError(error);
    if (n !== Hr()) return;
    if (isENOENT(error)) planFiles().commitPlanListing(n, []);
  }
}
//@ chunk-82kqcve8.js:188399-188454 layout
function Hr() {
  if (!getIsNonInteractiveSession() && !getSessionTrustAccepted()) return gt();
  return getPlansDirectory();
}
//@ chunk-82kqcve8.js:188454-188492 layout
function gt() {
  return join_12(getClaudeConfigDir(), "plans");
}
//@ chunk-82kqcve8.js:188492-188525 layout
function Je(e) {
  return STORAGE_SPACES.plan(e);
}
/**
 * 去掉文件名末尾的 .md（plans 用）。
 */
//@ chunk-82kqcve8.js:188525-188581 layout = isSessionPlanFile (1)
function stripMdExtension(fileName) {
  return fileName.endsWith(".md") ? fileName.slice(0, -3) : fileName;
}
//@ chunk-82kqcve8.js:188581-188618 layout
var DEFAULT_PLAN_FILE_STATE = { publishDiscipline: "inPlace" };
/**
 * lstat 计划目录下 <name>.md，返回 {publishDiscipline:"inPlace", mode}（低 9 位权限）；文件不存在或远程模式返回默认状态。
 */
//@ chunk-82kqcve8.js:188618-188742 layout = isSessionPlanFile (1)
async function getPlanFileState(planName) {
  if (isDiskless()) return DEFAULT_PLAN_FILE_STATE;
  try {
    let n = await lstat_3(join_12(getPlansDirectory(), `${planName}.md`));
    return { ...DEFAULT_PLAN_FILE_STATE, mode: n.mode & 511 };
  } catch {
    return DEFAULT_PLAN_FILE_STATE;
  }
}
//@ chunk-82kqcve8.js:188742-188775 layout
function pt() {
  return getPlansDirectory() === gt();
}
//@ chunk-82kqcve8.js:188775-188827 facade-exports
function getPlanSlug(e, n) {
  return planFiles().getPlanSlug(e ?? getSessionId(), n);
}
//@ chunk-82kqcve8.js:188827-188868 facade-exports
function peekPlanSlug(e) {
  return getPlanSlugCache().get(e ?? getSessionId());
}
//@ chunk-82kqcve8.js:188868-188950 layout
function tc(e) {
  return typeof e === "string" && e.length <= Gg && Ug.test(e) && !WINDOWS_RESERVED_NAME_RE.test(e);
}
//@ chunk-82kqcve8.js:188950-189119 layout
function logInvalidPlanSlug(e, n) {
  let r =
    typeof n === "string"
      ? jsonStringify(truncateWithCount(n.replace(CONTROL_CHARS_EXCEPT_WS_RE, ""), 80))
      : `<non-string slug of type ${typeof n}>`;
  logForDebugging(`${e}: refusing invalid plan slug ${r}`, { level: "error" });
}
//@ chunk-82kqcve8.js:189119-189227 facade-exports
function setPlanSlug(e, n) {
  if (!tc(n)) {
    logInvalidPlanSlug("setPlanSlug", n);
    return;
  }
  (getPlanSlugCache().set(e, n), planFiles().exemptSlugFromRevalidation(e, n));
}
//@ chunk-82kqcve8.js:189227-189267 facade-exports
function clearAllPlanSlugs() {
  planFiles().clearAllPlanSlugs();
}
/**
 * 计划目录解析器：缓存结果；无盘模式或未配置时用默认目录；配置的 plansDirectory 必须位于项目根内，否则记错误并回退默认目录。
 */
//@ chunk-82kqcve8.js:189267-189579 layout
class PlansDirectoryResolver {
  #e = void 0;
  directory() {
    return ((this.#e ??= this.#t()), this.#e);
  }
  #t() {
    if (isDiskless()) return gt();
    let plansDirectory = getInitialSettings_2().plansDirectory;
    if (plansDirectory) {
      let r = getCwd(),
        s = resolve_6(r, plansDirectory);
      if (isPathWithinProjectRoot(s, r)) return s;
      logForDebugging(
        `plansDirectory must be within project root, with no backslash in its path off Windows: ${plansDirectory}`,
        { level: "error" },
      );
    }
    return gt();
  }
  reset() {
    this.#e = void 0;
  }
}
//@ chunk-82kqcve8.js:189579-189704 facade-exports = reset (0.777)
var PLANS_DIRECTORY_PER_HOST = new HostScoped(() => new PlansDirectoryResolver()),
  getPlansDirectory = Object.assign(
    function () {
      return PLANS_DIRECTORY_PER_HOST.of(fi()).directory();
    },
    {
      cache: {
        clear() {
          PLANS_DIRECTORY_PER_HOST.of(fi()).reset();
        },
      },
    },
  );
/**
 * 判断路径位于项目根之内：前缀匹配、不含危险形式、不经过 UNC 连接点，并逐级向上找到真实路径确认仍在根的真实路径之下。
 */
//@ chunk-82kqcve8.js:189704-189951 layout
function isPathWithinProjectRoot(e, n) {
  if (e !== n && !e.startsWith(n + sep_8)) return !1;
  if (rc(e)) return !1;
  if (findIntermediateUncJunction(getFsImplementation(), e) !== void 0) return !1;
  let rootReal = Tm(n);
  if (rootReal === null) return !1;
  let current = e;
  for (;;) {
    let currentReal = Tm(current);
    if (currentReal !== null) return currentReal === rootReal || currentReal.startsWith(rootReal + sep_8);
    let parent = dirname_6(current);
    if (parent === current) return !1;
    current = parent;
  }
}
//@ chunk-82kqcve8.js:189951-190106 layout
async function ensurePlansDirectory(e) {
  let n = getPlansDirectory();
  if (isDiskless()) return n;
  try {
    await getFileReader().mkdir(n);
  } catch (error) {
    logForDebugging(`Failed to create plans directory ${n}: ${error}`, { level: "error" });
  }
  return n;
}
//@ chunk-82kqcve8.js:190106-190541 facade-exports
async function saveRejectedUltraplan(e, n) {
  if (n && pt()) {
    let s = `${generateWordSlug()}-ultraplan`,
      h = join_12(await ensurePlansDirectory(n), `${s}.md`),
      write = await n.write(Je(s), e, DEFAULT_PLAN_FILE_STATE);
    if (!write.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `saveRejectedUltraplan: v5 write failed: ${write.error.code}`,
        "saveRejectedUltraplan: v5 write failed",
      );
    return h;
  }
  if (isDiskless())
    throw (
      warnDisklessSettingsWrite("rejected_ultraplan", getPlansDirectory()),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "Cannot save the plan: this session does not write to disk",
      )
    );
  let r = join_12(await ensurePlansDirectory(), `${generateWordSlug()}-ultraplan.md`);
  return (await getFileReader().write(r, e), r);
}
//@ chunk-82kqcve8.js:190541-190888 facade-exports
async function persistPlanEdit(e, n, r) {
  try {
    await ensurePlansDirectory(r);
    let s = basename_4(e, ".md"),
      h =
        r !== void 0 && pt() && dirname_6(e) === getPlansDirectory() && validateStorageKey(Je(s)) === void 0
          ? Je(s)
          : void 0;
    if (r !== void 0 && h !== void 0) {
      let write = await r.write(h, n, DEFAULT_PLAN_FILE_STATE);
      if (!write.ok) {
        Ql(e, write.error.code);
        return;
      }
    } else if (isDiskless()) {
      warnDisklessSettingsWrite("plan_edit", e);
      return;
    } else await getFileReader().write(e, n);
    notePlanFileWritten(e, n);
  } catch (error) {
    Ql(e, error instanceof Error ? error.message : String(error));
  }
}
//@ chunk-82kqcve8.js:190888-190969 layout
function Ql(e, n) {
  (notePlanFileForgotten(e), logForDebugging(`Failed to persist plan to ${e}: ${n}`, { level: "error" }));
}
//@ chunk-82kqcve8.js:190969-191099 facade-exports = getPlanFilePath (0.856)
function getPlanFilePath(agentId) {
  let n = getSessionId(),
    planSlug = getPlanSlug(n);
  if ((planFiles().markPlanPathServed(n), !agentId)) return join_12(getPlansDirectory(), `${planSlug}.md`);
  return join_12(getPlansDirectory(), `${planSlug}-agent-${agentId}.md`);
}
//@ chunk-82kqcve8.js:191099-191298 layout
async function readPlanViaStorage(e, n, r) {
  let read = await e.read([Je(n)]);
  if (!read.ok) return (logForDebugging(`${r}: v5 read failed: ${read.error.code}`), null);
  let h = read.value.items[0];
  return h.found ? Buffer.from(h.value).toString("utf-8") : null;
}
//@ chunk-82kqcve8.js:191298-191465 facade-exports
function getPlan(e) {
  let n = getPlanFilePath(e),
    planFileCache = planFiles().planFileCache;
  if (planFileCache !== null && pt()) {
    if (e) planFiles().watchAgentPlanFile(getPlanSlug(getSessionId()), basename_4(n));
    let s = planFileCache.get(basename_4(n));
    if (s !== void 0) return s;
  }
  return readPlanFileSync(n);
}
//@ chunk-82kqcve8.js:191465-191649 facade-exports
async function getPlanAsync(e, n) {
  if (n === void 0 || !pt()) return getPlan(e);
  let r = getPlanFileName(e);
  await planFiles().settlePlanFile(r);
  let s = planFiles().planFileCache?.get(r);
  if (s !== void 0) return s;
  return readPlanViaStorage(n, stripMdExtension(r), "getPlan");
}
//@ chunk-82kqcve8.js:191649-191758 layout
function getPlanFileName(e) {
  let n = basename_4(getPlanFilePath(e)),
    r = planFiles();
  if (e && r.planFileCache !== null) r.watchAgentPlanFile(getPlanSlug(getSessionId()), n);
  return n;
}
//@ chunk-82kqcve8.js:191758-191966 facade-exports
async function planExistsAsync(e, n) {
  if (n === void 0 || !pt()) return getPlan(e) !== null;
  let r = getPlanFileName(e);
  await planFiles().settlePlanFile(r);
  let s = planFiles().planFileCache?.get(r);
  if (s !== void 0) return s !== null;
  return (await n.statMeta(Je(stripMdExtension(r)))).ok;
}
//@ chunk-82kqcve8.js:191966-192261 facade-exports
async function readPlanFileFresh(e) {
  let n = getPlanFilePath();
  if (isStorageV5Enabled() && e !== void 0 && pt()) {
    let r = basename_4(n),
      s = planFiles(),
      h = s.planFileWatches.get(r);
    if (h !== void 0) {
      if (!(await raceWithTimeout(s.refreshPlanFile(r, h), s.waitCapMs))) s.giveUpWaiting(r, h);
      let y = s.planFileCache?.get(r);
      if (y !== void 0) return y;
    }
    return readPlanViaStorage(e, stripMdExtension(r), "readPlanFileFresh");
  }
  return readPlanFileSync(n);
}
//@ chunk-82kqcve8.js:192261-192455 layout
function readPlanFileSync(e) {
  if (isDiskless()) return null;
  try {
    return getFsImplementation().readFileSync(e, { encoding: "utf-8" });
  } catch (error) {
    if (isENOENT(error)) return null;
    if (isFsInaccessible(error)) return (logForDebugging(`getPlan: read failed for ${e}: ${error}`), null);
    return (logError(error), null);
  }
}
//@ chunk-82kqcve8.js:192455-192620 layout
function getSlugFromLog(e) {
  let n, r;
  for (let message of e.messages) {
    let slug = message.slug;
    if (!slug || slug === n) continue;
    if (tc(slug)) n = slug;
    else r ??= slug;
  }
  if (n === void 0 && r !== void 0) logInvalidPlanSlug("getSlugFromLog", r);
  return n;
}
/**
 * resume 时把原会话的计划文件复制到新会话 slug 下，缺失时从消息中恢复。
 */
//@ chunk-82kqcve8.js:192620-193494 facade-exports = copyPlanForResume (0.822)
async function copyPlanForResume(e, n, r) {
  let slug = getSlugFromLog(e);
  if (!slug) return !1;
  let sessionId = n ?? getSessionId();
  if ((setPlanSlug(sessionId, slug), r && pt()))
    return copyPlanForResume_2(r, e, slug).catch((w) => (logError(w), !1));
  let planPath = join_12(getPlansDirectory(), `${slug}.md`);
  if (isDiskless()) return !1;
  try {
    return (await getFileReader().read(planPath), !0);
  } catch (error) {
    if (!isENOENT(error)) {
      if (isFsInaccessible(error))
        return (logForDebugging(`copyPlanForResume: read failed for ${planPath}: ${error}`), !1);
      return (logError(error), !1);
    }
    if (getEnvironmentKind() === null) return !1;
    logForDebugging(`Plan file missing during resume: ${planPath}. Attempting recovery.`);
    let snapshotPlan = findFileSnapshotEntry(e, "plan"),
      recovered = null;
    if (snapshotPlan && isValidPlanContent(snapshotPlan.content))
      ((recovered = snapshotPlan.content),
        logForDebugging(`Plan recovered from file snapshot, ${recovered.length} chars`, { level: "info" }));
    else if (((recovered = recoverPlanFromMessages(e)), recovered))
      logForDebugging(`Plan recovered from message history, ${recovered.length} chars`, { level: "info" });
    if (recovered)
      try {
        return (await ensurePlansDirectory(), await getFileReader().write(planPath, recovered), !0);
      } catch (writeError) {
        if (isFsInaccessible(writeError))
          return (logForDebugging(`Plan recovery write failed for ${planPath}: ${writeError}`), !1);
        return (logError(writeError), !1);
      } finally {
        notePlanFileForgotten(planPath);
      }
    return (
      logForDebugging("Plan file recovery failed: no file snapshot or plan content found in message history"),
      !1
    );
  }
}
//@ chunk-82kqcve8.js:193494-194413 layout = copyPlanForResume (0.785)
async function copyPlanForResume_2(e, n, r) {
  let s = `${r}.md`,
    observePlanFile = planFiles().observePlanFile(s),
    read = await e.read([Je(r)]);
  if (!read.ok)
    return (logForDebugging(`copyPlanForResume: v5 read failed for ${r}: ${read.error.code}`), !1);
  let w = read.value.items[0];
  if (
    (planFiles().notePlanFileObserved(
      s,
      w?.found ? Buffer.from(w.value).toString("utf-8") : null,
      observePlanFile,
    ),
    w?.found)
  )
    return !0;
  if (getEnvironmentKind() === null) return !1;
  logForDebugging(`Plan file missing during resume: ${r}. Attempting recovery.`);
  let snapshotPlan = findFileSnapshotEntry(n, "plan"),
    recovered = null;
  if (snapshotPlan && isValidPlanContent(snapshotPlan.content))
    ((recovered = snapshotPlan.content),
      logForDebugging(`Plan recovered from file snapshot, ${recovered.length} chars`, { level: "info" }));
  else if (((recovered = recoverPlanFromMessages(n)), recovered))
    logForDebugging(`Plan recovered from message history, ${recovered.length} chars`, { level: "info" });
  if (recovered) {
    let O = join_12(getPlansDirectory(), s),
      P = !1;
    try {
      await ensurePlansDirectory(e);
      let write = await e.write(Je(r), recovered, DEFAULT_PLAN_FILE_STATE);
      if (!write.ok) return (logForDebugging(`Plan recovery write failed for ${r}: ${write.error.code}`), !1);
      return ((P = !0), !0);
    } finally {
      if (P) notePlanFileWritten(O, recovered);
      else notePlanFileForgotten(O);
    }
  }
  return (
    logForDebugging("Plan file recovery failed: no file snapshot or plan content found in message history"),
    !1
  );
}
//@ chunk-82kqcve8.js:194413-194795 facade-exports
async function copyPlanForFork(e, n, r) {
  let s = getSlugFromLog(e);
  if (!s) return !1;
  let h = getPlansDirectory(),
    y = join_12(h, `${s}.md`),
    w = getPlanSlug(n),
    S = join_12(h, `${w}.md`);
  if ((planFiles().exemptSlugFromRevalidation(n, w), r && pt()))
    return copyPlanForForkViaStorage(r, s, w).catch((R) => (logError(R), !1));
  await ensurePlansDirectory();
  try {
    if (isDiskless()) return !1;
    return (await getFileReader().copy(y, S), !0);
  } catch (error) {
    if (isENOENT(error)) return !1;
    if (isFsInaccessible(error))
      return (logForDebugging(`copyPlanForFork: copy failed for ${y}: ${error}`), !1);
    return (logError(error), !1);
  } finally {
    notePlanFileForgotten(S);
  }
}
//@ chunk-82kqcve8.js:194795-195246 layout
async function copyPlanForForkViaStorage(e, n, r) {
  let s = join_12(getPlansDirectory(), `${r}.md`),
    h;
  try {
    await ensurePlansDirectory(e);
    let read = await e.read([Je(n)]);
    if (!read.ok)
      return (logForDebugging(`copyPlanForFork: v5 read failed for ${n}: ${read.error.code}`), !1);
    if (!read.value.items[0].found) return !1;
    let w = read.value.items[0].value,
      write = await e.write(Je(r), w, await getPlanFileState(n));
    if (!write.ok)
      return (logForDebugging(`copyPlanForFork: v5 write failed for ${r}: ${write.error.code}`), !1);
    return ((h = Buffer.from(w).toString("utf-8")), !0);
  } finally {
    if (h !== void 0) notePlanFileWritten(s, h);
    else notePlanFileForgotten(s);
  }
}
/**
 * 从 ExitPlanMode 工具调用或计划附件中恢复计划内容。
 */
//@ chunk-82kqcve8.js:195246-195811 fingerprint = recoverPlanFromMessages (1)
function recoverPlanFromMessages(log) {
  for (let n = log.messages.length - 1; n >= 0; n--) {
    let msg = log.messages[n];
    if (typeof msg !== "object" || msg === null) continue;
    if (msg.type === "assistant") {
      let s = msg.message?.content;
      if (Array.isArray(s)) {
        for (let block of s)
          if (
            typeof block === "object" &&
            block !== null &&
            block.type === "tool_use" &&
            block.name === EXITPLANMODE_2
          ) {
            let input = block.input,
              w = typeof input === "object" && input !== null ? input.plan : void 0;
            if (isValidPlanContent(w)) return w;
          }
      }
    }
    if (msg.type === "user") {
      let s = msg;
      if (isValidPlanContent(s.planContent)) return s.planContent;
    }
    if (msg.type === "attachment") {
      let s = msg;
      if (s.attachment?.type === "plan_file_reference") {
        let plan = s.attachment.planContent;
        if (isValidPlanContent(plan)) return plan;
      }
    }
  }
  return null;
}
//@ chunk-82kqcve8.js:195811-196201 fingerprint = findFileSnapshotEntry (0.924)
function findFileSnapshotEntry(messages, key) {
  let r = [...messages.messages, ...(messages.fileSnapshots ?? [])];
  for (let s = r.length - 1; s >= 0; s--) {
    let msg = r[s];
    if (
      msg?.type === "system" &&
      "subtype" in msg &&
      msg.subtype === "file_snapshot" &&
      "snapshotFiles" in msg
    ) {
      let files = msg.snapshotFiles;
      if (!Array.isArray(files)) continue;
      let found = files.find(
        (S) =>
          typeof S === "object" &&
          S !== null &&
          S.key === key &&
          typeof S.path === "string" &&
          typeof S.content === "string",
      );
      if (found !== void 0) return found;
    }
  }
  return;
}
//@ chunk-82kqcve8.js:196201-196217 facade-exports
var PLAN_SNAPSHOT_MAX_CHARS = 2000000;
//@ chunk-82kqcve8.js:196217-196286 affinity
function isValidPlanContent(e) {
  return typeof e === "string" && e.length > 0 && e.length <= PLAN_SNAPSHOT_MAX_CHARS;
}
/**
 * 计划文件路径：<计划目录>/<slug>.md，子代理为 <slug>-agent-<id>.md。
 */
//@ chunk-82kqcve8.js:237342-237506 fingerprint = getPlanFilePath (1)
function getPlanFilePath_2(agentId) {
  let n = peekPlanSlug();
  if (!n) return !1;
  let planSlug = normalize(agentId);
  if (dirname(planSlug) !== normalize(getPlansDirectory())) return !1;
  let s = basename(planSlug);
  return s === `${n}.md` || (s.startsWith(`${n}-agent-`) && s.endsWith(".md"));
}
//@ chunk-e6aww6q8.js:861063-861089 placement
function MCe() {
  return isDiskless();
}
//@ chunk-e6aww6q8.js:861089-861172 placement
function CHt(e, n) {
  return MCe() && !Object.hasOwn(n, "planFilePath") ? void 0 : API_STRIPPED_INPUT_FIELDS.get(e);
}
//@ chunk-e6aww6q8.js:1501827-1502265 fingerprint = persistFileSnapshotIfRemote (0.807)
async function persistFileSnapshotIfRemote(e) {
  if (getEnvironmentKind() === null) return;
  try {
    let snapshotFiles = [],
      r = await readPlanFileFresh(e);
    if (r && r.length > PLAN_SNAPSHOT_MAX_CHARS)
      logForDebugging(`Plan over snapshot cap (${r.length} chars), skipping`);
    else if (r) snapshotFiles.push({ key: "plan", path: isDiskless() ? "" : getPlanFilePath(), content: r });
    if (snapshotFiles.length === 0) return;
    let message = {
      type: "system",
      subtype: "file_snapshot",
      content: "File snapshot",
      level: "info",
      isMeta: !0,
      timestamp: new Date().toISOString(),
      uuid: randomUUID_19(),
      snapshotFiles: snapshotFiles,
    };
    await recordTranscript([message], void 0, void 0, void 0, e);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1502265-1502377 affinity
function getPlanWithPath(e) {
  if (MCe()) return null;
  let n = getPlanFilePath(e);
  notePlanFileForgotten(n);
  let r = getPlan(e);
  return r !== null ? { plan: r, planFilePath: n } : null;
}
//@ chunk-e6aww6q8.js:4329866-4330013 fingerprint = getPlan (1)
function getPlan_2() {
  if (isDiskless()) return null;
  let e = getFsImplementation(),
    n = getInstalledPluginsFilePath(),
    r;
  try {
    r = e.readFileSync(n, { encoding: "utf-8" });
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  return parseInstalledPluginsJson(r);
}
//@ chunk-q8cqcff6.js:21468-21656 fingerprint = getPlanSlug (0.574)
function getPlanSlug_2() {
  if (getPlatform() !== "windows") return null;
  for (let e of Gi) {
    let n = e9(e);
    if (n === null) {
      if (getFsImplementation().existsSync(e)) return null;
      continue;
    }
    if (n.toLowerCase() === e.toLowerCase()) return e;
  }
  return null;
}

export {
  getPlansDirectory,
  primePlanSlugCollisions,
  MCe,
  notePlanFileForgotten,
  getPlanFilePath,
  getPlan,
  copyPlanForResume,
  getPlanFilePath_2,
  copyPlanForFork,
  peekPlanSlug,
  setPlanSlug,
  saveRejectedUltraplan,
  clearAllPlanSlugs,
  resetPlanFileCacheToUnknown,
  getPlanAsync,
  planExistsAsync,
  settlePlanFileCachePrime,
  getPlanSlug,
  planFiles,
  persistFileSnapshotIfRemote,
  getPlanWithPath,
  CHt,
  notePlanFileWritten,
  getPlan_2,
  persistPlanEdit,
  getPlanSlug_2,
};
