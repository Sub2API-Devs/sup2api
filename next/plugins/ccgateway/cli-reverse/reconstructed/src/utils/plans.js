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
import { resolve, dirname, basename, join, sep, normalize } from "path";
import { readdir, lstat } from "fs/promises";
import { randomUUID } from "crypto";
import { getPlatform } from "./platform.js";
import { POWERSHELL_EXE_CANDIDATES } from "./shell/powershellDetection.js";
import { realpathCacheEntry } from "./permissions/protectedDirs.js";
import { getFsImplementation, findIntermediateUncJunction } from "./fsOperations.js";
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
import { hasBackslash } from "./pathClassification.js";
import { nativeRealpathLong } from "./windowsUncPaths.js";
import { getFileReader } from "./fileStore.js";
import { warnDisklessSettingsWrite } from "./settings/settingsStorage.js";
import { getEnvironmentKind } from "./filePersistence/outputsScanner.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { API_STRIPPED_INPUT_FIELDS } from "./api.js";
import { recordTranscript } from "./sessionStorage.js";
import { getInstalledPluginsFilePath, parseInstalledPluginsJson } from "./plugins/installedPluginsManager.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-q8cqcff6.js:21468-21656 fingerprint (2.1.88 match: getPlanSlug, 0.574)
function getPlanSlug_2() {
  if (getPlatform() !== "windows") return null;
  for (let candidate of POWERSHELL_EXE_CANDIDATES) {
    let resolvedPath = realpathCacheEntry(candidate);
    if (resolvedPath === null) {
      if (getFsImplementation().existsSync(candidate)) return null;
      continue;
    }
    if (resolvedPath.toLowerCase() === candidate.toLowerCase()) return candidate;
  }
  return null;
}
//@ chunk-82kqcve8.js:178775-178835 placement
var MAX_PLAN_SLUG_ATTEMPTS = 10;
var PLAN_LISTING_WAIT_CAP_MS = 2000;
var MAX_PLAN_WATCHES_PER_SLUG = 8;
var PLAN_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
var MAX_PLAN_SLUG_LENGTH = 100;
//@ chunk-82kqcve8.js:178835-186934 placement
/**
 * 计划文件（plans/*.md）的存储与监听
 */
class PlansStore {
  primedListing = null;
  slugMeta = new Map();
  planFileCache = null;
  planFileBackend = null;
  planFileWatches = new Map();
  primeInFlight = null;
  waitCapMs = PLAN_LISTING_WAIT_CAP_MS;
  stopReleasingOnSwitch = null;
  lastUnwatched = new Map();
  earlyObserved = new Map();
  earlyGeneration = 0;
  snapshotChain = Promise.resolve();
  planFileCacheKeyFor(filePath) {
    if (this.planFileCache === null) return null;
    let resolvedPath = resolve(filePath);
    if (dirname(resolvedPath) !== globalPlansDirectory()) return null;
    return basename(resolvedPath);
  }
  notePlanFileWritten(filePath, entry) {
    if (this.planFileCache === null) {
      this.noteEarly(filePath, entry);
      return;
    }
    let cacheKey = this.planFileCacheKeyFor(filePath);
    if (cacheKey !== null) {
      let watch = this.planFileWatches.get(cacheKey);
      if (watch !== undefined) watch.generation++;
      this.planFileCache.set(cacheKey, entry);
      if (this.primedListing !== null && this.primedListing.dir === globalPlansDirectory())
        this.primedListing.listing.add(cacheKey);
    }
  }
  notePlanFileForgotten(filePath) {
    if (this.planFileCache === null) {
      this.noteEarly(filePath, undefined);
      return;
    }
    let cacheKey = this.planFileCacheKeyFor(filePath);
    if (cacheKey !== null) {
      let watch = this.planFileWatches.get(cacheKey);
      if (watch !== undefined) {
        this.dropToUnknown(cacheKey, watch);
        this.refreshPlanFile(cacheKey, watch);
        return;
      }
      this.planFileCache.delete(cacheKey);
    }
  }
  resetPlanFileCacheToUnknown() {
    if (this.planFileCache === null) return;
    for (let key of [...this.planFileCache.keys()]) {
      let watch = this.planFileWatches.get(key);
      if (watch !== undefined) {
        this.dropToUnknown(key, watch);
        this.refreshPlanFile(key, watch);
      } else this.planFileCache.delete(key);
    }
  }
  activatePlanFileCache(storageBackend) {
    this.planFileCache ??= new Map();
    if (isStorageV5Enabled() && storageBackend !== undefined && this.planFileBackend === null) {
      this.planFileBackend = storageBackend;
      this.stopReleasingOnSwitch = onSessionSwitch(() => this.releaseStaleWatches());
      for (let slug of new Set(getPlanSlugCache().values())) this.watchSlug(slug, false);
      this.earlyObserved.clear();
    }
  }
  noteEarly(filePath, entry) {
    if (!isStorageV5Enabled()) return;
    let resolvedPath = resolve(filePath);
    if (dirname(resolvedPath) !== globalPlansDirectory()) return;
    this.earlyGeneration++;
    if (entry === undefined) this.earlyObserved.delete(basename(resolvedPath));
    else this.earlyObserved.set(basename(resolvedPath), entry);
  }
  watchSlug(slug, seedEntry) {
    this.releaseStaleWatches();
    this.watchPlanFile(slug, `${slug}.md`, seedEntry);
    this.lastUnwatched.clear();
  }
  releaseStaleWatches() {
    if (this.planFileWatches.size === 0) return;
    let liveSlugs = new Set(getPlanSlugCache().values());
    for (let [cacheKey, watchedEntry] of this.planFileWatches)
      if (!liveSlugs.has(watchedEntry.slug)) this.stopWatch(cacheKey, watchedEntry);
  }
  watchPlanFile(slug, fileName, seedAbsent) {
    let planFileBackend = this.planFileBackend;
    if (
      planFileBackend === null ||
      this.planFileCache === null ||
      this.planFileWatches.has(fileName) ||
      !isUsingGlobalPlansDir() ||
      validateStorageKey(planStorageSpace(stripMdExtension(fileName))) !== undefined
    )
      return;
    let watch = {
      slug,
      generation: 0,
      seededAbsent: false,
      subscription: undefined,
      refreshing: undefined,
      refreshAgain: false,
      resubscribed: false,
      stopped: false,
    };
    this.planFileWatches.set(fileName, watch);
    let pendingEntry = this.earlyObserved.has(fileName)
      ? this.earlyObserved.get(fileName)
      : this.lastUnwatched.get(fileName);
    this.earlyObserved.delete(fileName);
    this.lastUnwatched.delete(fileName);
    if (pendingEntry !== undefined) this.planFileCache.set(fileName, pendingEntry);
    else if (seedAbsent && !this.planFileCache.has(fileName)) {
      this.planFileCache.set(fileName, null);
      watch.seededAbsent = true;
    }
    this.subscribePlanFile(planFileBackend, fileName, watch);
  }
  observePlanFile(fileName) {
    let watch = this.planFileWatches.get(fileName);
    return {
      watch,
      generation: watch?.generation ?? this.earlyGeneration,
    };
  }
  notePlanFileObserved(fileName, entry, observation) {
    let watch = this.planFileWatches.get(fileName);
    if (watch !== undefined) {
      if (observation.watch === watch && watch.generation === observation.generation)
        this.installPlanFile(fileName, watch, entry);
      else this.refreshPlanFile(fileName, watch);
    } else if (
      this.planFileBackend === null &&
      isStorageV5Enabled() &&
      observation.watch === undefined &&
      this.earlyGeneration === observation.generation
    )
      this.earlyObserved.set(fileName, entry);
  }
  watchAgentPlanFile(slug, fileName) {
    if (this.planFileBackend === null) return;
    let watch = this.planFileWatches.get(fileName);
    if (watch !== undefined) {
      this.planFileWatches.delete(fileName);
      this.planFileWatches.set(fileName, watch);
      return;
    }
    let filtered = [...this.planFileWatches].filter(
      ([cacheKey, watch]) => watch.slug === slug && cacheKey !== `${slug}.md`,
    );
    for (let [cacheKey, watch] of filtered.slice(
      0,
      Math.max(0, filtered.length - MAX_PLAN_WATCHES_PER_SLUG + 1),
    )) {
      let cachedEntry = this.planFileCache?.get(cacheKey);
      this.stopWatch(cacheKey, watch);
      if (typeof cachedEntry === "string") this.planFileCache?.set(cacheKey, cachedEntry);
    }
    this.watchPlanFile(slug, fileName, false);
  }
  async subscribePlanFile(storageBackend, fileName, watch) {
    let generation = watch.generation;
    let subscribeError;
    try {
      let subscribeResult = await storageBackend.subscribe(
        {
          target: "key",
          key: planStorageSpace(stripMdExtension(fileName)),
        },
        (event) => this.onPlanFileEvent(fileName, watch, generation, event),
        {
          maxObservationLagMs: PLAN_LISTING_WAIT_CAP_MS,
        },
      );
      if (subscribeResult.ok) {
        if (watch.stopped) subscribeResult.value.unsubscribe();
        else {
          watch.subscription = subscribeResult.value;
          logForDebugging(
            `plans: watching ${fileName} through the storage interface (changes trail by at most ${subscribeResult.value.observationLagMs} ms)`,
          );
        }
        return;
      }
      subscribeError = formatStorageError(subscribeResult.error);
    } catch (error) {
      subscribeError = String(error);
    }
    if (watch.stopped) return;
    logForDebugging(
      `plans: watching ${fileName} through the storage interface failed (${subscribeError}); serving its last read and in-process writes`,
    );
    if (this.planFileCache?.has(fileName) !== true) this.refreshPlanFile(fileName, watch);
  }
  onPlanFileEvent(fileName, watch, generation, eventResult) {
    if (watch.stopped) return;
    if (!eventResult.ok) {
      if (eventResult.error.code === "Unavailable") {
        queueMicrotask(() => void this.refreshPlanFile(fileName, watch));
        return;
      }
      watch.subscription = undefined;
      if (isCleanupStarted()) return;
      logForDebugging(`plans: the watch on ${fileName} ended: ${formatStorageError(eventResult.error)}`);
      let planFileBackend = this.planFileBackend;
      if (planFileBackend !== null && !watch.resubscribed) {
        watch.resubscribed = true;
        this.subscribePlanFile(planFileBackend, fileName, watch);
      } else this.stopWatch(fileName, watch);
      return;
    }
    let event = eventResult.value;
    if (event.kind === "snapshot" && watch.generation === generation) {
      if (!("absent" in event)) {
        this.installPlanFile(fileName, watch, Buffer.from(event.value).toString("utf-8"));
        return;
      }
      if (watch.seededAbsent && watch.generation === 0) {
        this.installPlanFile(fileName, watch, null);
        return;
      }
    }
    queueMicrotask(() => void this.refreshPlanFile(fileName, watch));
  }
  installPlanFile(fileName, watch, entry) {
    watch.generation++;
    this.planFileCache?.set(fileName, entry);
  }
  refreshPlanFile(fileName, watch) {
    if (watch.refreshing !== undefined) {
      watch.refreshAgain = true;
      return watch.refreshing;
    }
    let planFileBackend = this.planFileBackend;
    if (planFileBackend === null) return Promise.resolve();
    let runRefresh = async () => {
      await Promise.resolve();
      try {
        do {
          watch.refreshAgain = false;
          let generation = watch.generation;
          let planFileForWatch = await this.readPlanFileForWatch(planFileBackend, fileName);
          if (watch.stopped) return;
          if (planFileForWatch === undefined) {
            if (watch.generation === generation) {
              watch.generation++;
              this.planFileCache?.delete(fileName);
            }
            continue;
          }
          if (watch.generation === generation) this.installPlanFile(fileName, watch, planFileForWatch);
          else watch.refreshAgain = true;
        } while (watch.refreshAgain && !watch.stopped);
      } finally {
        watch.refreshing = undefined;
      }
    };
    watch.refreshing = runRefresh();
    return watch.refreshing;
  }
  async readPlanFileForWatch(storageBackend, fileName) {
    try {
      let readResult = await storageBackend.read([planStorageSpace(stripMdExtension(fileName))]);
      if (readResult.ok) {
        let item = readResult.value.items[0];
        return item?.found ? Buffer.from(item.value).toString("utf-8") : null;
      }
      logForDebugging(`plans: v5 read of ${fileName} failed: ${readResult.error.code}`);
    } catch (error) {
      logForDebugging(`plans: v5 read of ${fileName} threw: ${error}`);
    }
    return;
  }
  async settlePlanFile(fileName) {
    let watch = this.planFileWatches.get(fileName);
    if (watch === undefined) return;
    let pendingRefresh =
      watch.refreshing ??
      (this.planFileCache?.has(fileName) !== true ? this.refreshPlanFile(fileName, watch) : undefined);
    if (pendingRefresh !== undefined && !(await raceWithTimeout(pendingRefresh, this.waitCapMs)))
      this.giveUpWaiting(fileName, watch);
  }
  dropToUnknown(fileName, watch) {
    if (watch.stopped) return;
    watch.generation++;
    this.planFileCache?.delete(fileName);
  }
  giveUpWaiting(fileName, watch) {
    if (this.planFileCache?.has(fileName)) this.dropToUnknown(fileName, watch);
  }
  unwatchSlug(slug) {
    for (let [cacheKey, watch] of this.planFileWatches)
      if (watch.slug === slug) this.stopWatch(cacheKey, watch);
  }
  unwatchAllPlanFiles() {
    this.lastUnwatched.clear();
    for (let [cacheKey, watch] of this.planFileWatches) {
      let cachedEntry = this.planFileCache?.get(cacheKey);
      if (cachedEntry !== undefined) this.lastUnwatched.set(cacheKey, cachedEntry);
      this.stopWatch(cacheKey, watch);
    }
  }
  stopWatch(cacheKey, watch) {
    watch.stopped = true;
    watch.subscription?.unsubscribe();
    watch.subscription = undefined;
    this.planFileWatches.delete(cacheKey);
    this.planFileCache?.delete(cacheKey);
  }
  commitPlanListing(dir, fileNames) {
    let listing = new Set(fileNames);
    this.primedListing = {
      dir,
      listing,
    };
    let planSlugCache = getPlanSlugCache();
    let filtered = [...this.slugMeta].filter(([, meta]) => meta.validatedDir !== dir);
    let staleSessionIds = new Set(filtered.map(([sessionId]) => sessionId));
    for (let [sessionId, slug] of planSlugCache)
      if (!staleSessionIds.has(sessionId)) listing.add(`${slug}.md`);
    for (let [sessionId, meta] of filtered) {
      let slug = planSlugCache.get(sessionId);
      if (slug === undefined) {
        this.slugMeta.delete(sessionId);
        continue;
      }
      if (listing.has(`${slug}.md`)) {
        if (meta.consumed) {
          logForDebugging(
            `Plan slug collision for '${slug}' in ${dir} detected after the plan path was already in use \u2014 keeping the slug (the pre-existing plan file may be overwritten).`,
            {
              level: "warn",
            },
          );
          meta.validatedDir = dir;
          continue;
        }
        planSlugCache.delete(sessionId);
        this.slugMeta.delete(sessionId);
        if (![...planSlugCache.values()].includes(slug)) this.unwatchSlug(slug);
        this.getPlanSlug(sessionId, meta.seed);
      } else {
        listing.add(`${slug}.md`);
        meta.validatedDir = dir;
      }
    }
  }
  getPlanSlug(sessionId, seed) {
    let planSlugCache = getPlanSlugCache();
    let cachedSlug = planSlugCache.get(sessionId);
    if (!cachedSlug) {
      let stem = seed ? slugifyPromptWords(seed) : "";
      let collided = true;
      for (let j = 0; j < MAX_PLAN_SLUG_ATTEMPTS; j++) {
        cachedSlug = stem ? `${stem}-${randomWordSlug()}` : generateWordSlug();
        collided = this.primedListing?.listing.has(`${cachedSlug}.md`) === true;
        if (!collided) break;
      }
      let ineligibleDir = !getIsNonInteractiveSession() && !getSessionTrustAccepted();
      this.slugMeta.set(sessionId, {
        validatedDir: ineligibleDir || this.primedListing === null ? null : this.primedListing.dir,
        consumed: false,
        seed,
      });
      let canSeed =
        !collided && this.primedListing !== null && this.primedListing.dir === globalPlansDirectory();
      this.primedListing?.listing.add(`${cachedSlug}.md`);
      planSlugCache.set(sessionId, cachedSlug);
      this.lastUnwatched.clear();
      this.watchSlug(cachedSlug, canSeed);
    }
    return cachedSlug;
  }
  markPlanPathServed(sessionId) {
    let meta = this.slugMeta.get(sessionId);
    if (meta) meta.consumed = true;
  }
  exemptSlugFromRevalidation(sessionId, slug) {
    this.slugMeta.delete(sessionId);
    this.primedListing?.listing.add(`${slug}.md`);
    this.watchSlug(slug, false);
  }
  clearAllPlanSlugs() {
    getPlanSlugCache().clear();
    this.slugMeta.clear();
    this.unwatchAllPlanFiles();
  }
  reset() {
    this.primedListing = null;
    this.slugMeta.clear();
    this.unwatchAllPlanFiles();
    this.lastUnwatched.clear();
    this.earlyObserved.clear();
    this.primeInFlight = null;
    this.waitCapMs = PLAN_LISTING_WAIT_CAP_MS;
    this.stopReleasingOnSwitch?.();
    this.stopReleasingOnSwitch = null;
    this.planFileBackend = null;
    this.planFileCache = null;
    this.snapshotChain = Promise.resolve();
  }
}
//@ chunk-82kqcve8.js:186934-186959 layout
var plansStoreSlot; // deferred: uses PlansStore of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-82kqcve8.js:186934", () => {
  plansStoreSlot = new HostScoped(() => new PlansStore());
});
//@ chunk-82kqcve8.js:186959-186989 layout
function rootSessionHost() {
  return getRootSession().host;
}
//@ chunk-82kqcve8.js:186989-187022 facade-exports
function planFiles() {
  return plansStoreSlot.of(rootSessionHost());
}
//@ chunk-82kqcve8.js:187022-187070 facade-exports
function notePlanFileWritten(filePath, entry) {
  planFiles().notePlanFileWritten(filePath, entry);
}
//@ chunk-82kqcve8.js:187070-187115 facade-exports
function notePlanFileForgotten(filePath) {
  planFiles().notePlanFileForgotten(filePath);
}
//@ chunk-82kqcve8.js:187115-187165 facade-exports
function resetPlanFileCacheToUnknown() {
  planFiles().resetPlanFileCacheToUnknown();
}
//@ chunk-82kqcve8.js:187165-187684 sole-consumer
/**
 * 分页列出 v5 存储中 plan 命名空间下的所有键，转成 "<名称>.md" 列表；列表出错、超过页数上限或抛异常时记日志并返回 null。
 */
async function listPlanSlugsFromStore(storageBackend) {
  let planFiles = [];
  try {
    let pageResult = await readAllPages(
      (cursor) =>
        storageBackend.listEntries(
          {
            namespace: "plan",
          },
          {
            cursor,
            skipKeyStats: true,
          },
        ),
      (entries) => {
        for (let entry of entries)
          if (entry.kind === "key" && entry.key.namespace === "plan") planFiles.push(`${entry.key.name}.md`);
      },
    );
    switch (pageResult.status) {
      case "done":
        return planFiles;
      case "error":
        logForDebugging(`primePlanSlugCollisions: v5 list failed: ${pageResult.error.code}`);
        return null;
      case "capped":
        logForDebugging(
          `primePlanSlugCollisions: v5 list exceeded ${DEFAULT_MAX_PAGES} pages; leaving the listing unprimed`,
        );
        return null;
    }
  } catch (error) {
    logForDebugging(`primePlanSlugCollisions: v5 list threw: ${error}`);
    return null;
  }
}
//@ chunk-82kqcve8.js:187684-187814 sole-consumer
async function primePlanSlugCollisions_2(storageBackend, dir) {
  let fileNames = await listPlanSlugsFromStore(storageBackend);
  if (dir !== plansDirectoryForSession()) return;
  if (fileNames !== null) {
    planFiles().activatePlanFileCache(storageBackend);
    planFiles().commitPlanListing(dir, fileNames);
  }
}
//@ chunk-82kqcve8.js:187944-188040 facade-exports
async function settlePlanFileCachePrime() {
  let store = planFiles();
  if (store.primeInFlight !== null) await raceWithTimeout(store.primeInFlight, store.waitCapMs);
}
//@ chunk-82kqcve8.js:188040-188399 facade-exports
async function primePlanSlugCollisions(storageBackend) {
  let dir = plansDirectoryForSession();
  if (storageBackend && dir === globalPlansDirectory()) {
    let store = planFiles();
    let primePromise = primePlanSlugCollisions_2(storageBackend, dir);
    store.primeInFlight = primePromise;
    try {
      await primePromise;
    } finally {
      if (store.primeInFlight === primePromise) store.primeInFlight = null;
    }
    return;
  }
  if (isDiskless()) {
    planFiles().commitPlanListing(dir, []);
    return;
  }
  try {
    let fileNames = await readdir(dir);
    if (dir !== plansDirectoryForSession()) return;
    planFiles().commitPlanListing(dir, fileNames);
  } catch (error) {
    if (!isENOENT(error) && !isFsInaccessible(error)) logError(error);
    if (dir !== plansDirectoryForSession()) return;
    if (isENOENT(error)) planFiles().commitPlanListing(dir, []);
  }
}
//@ chunk-82kqcve8.js:188399-188454 layout
function plansDirectoryForSession() {
  if (!getIsNonInteractiveSession() && !getSessionTrustAccepted()) return globalPlansDirectory();
  return getPlansDirectory();
}
//@ chunk-82kqcve8.js:188454-188492 layout
function globalPlansDirectory() {
  return join(getClaudeConfigDir(), "plans");
}
//@ chunk-82kqcve8.js:188492-188525 layout
function planStorageSpace(planName) {
  return STORAGE_SPACES.plan(planName);
}
//@ chunk-82kqcve8.js:188525-188581 layout (2.1.88 match: isSessionPlanFile, 1)
/**
 * 去掉文件名末尾的 .md（plans 用）。
 */
function stripMdExtension(fileName) {
  return fileName.endsWith(".md") ? fileName.slice(0, -3) : fileName;
}
//@ chunk-82kqcve8.js:188581-188618 layout
var DEFAULT_PLAN_FILE_STATE = {
  publishDiscipline: "inPlace",
};
//@ chunk-82kqcve8.js:188618-188742 layout (2.1.88 match: isSessionPlanFile, 1)
/**
 * lstat 计划目录下 <name>.md，返回 {publishDiscipline:"inPlace", mode}（低 9 位权限）；文件不存在或远程模式返回默认状态。
 */
async function getPlanFileState(planName) {
  if (isDiskless()) return DEFAULT_PLAN_FILE_STATE;
  try {
    let stat = await lstat(join(getPlansDirectory(), `${planName}.md`));
    return {
      ...DEFAULT_PLAN_FILE_STATE,
      mode: stat.mode & 511,
    };
  } catch {
    return DEFAULT_PLAN_FILE_STATE;
  }
}
//@ chunk-82kqcve8.js:188742-188775 layout
function isUsingGlobalPlansDir() {
  return getPlansDirectory() === globalPlansDirectory();
}
//@ chunk-82kqcve8.js:188775-188827 facade-exports
function getPlanSlug(sessionId, seed) {
  return planFiles().getPlanSlug(sessionId ?? getSessionId(), seed);
}
//@ chunk-82kqcve8.js:188827-188868 facade-exports
function peekPlanSlug(sessionId) {
  return getPlanSlugCache().get(sessionId ?? getSessionId());
}
//@ chunk-82kqcve8.js:188868-188950 layout
function isValidPlanFileName(slug) {
  return (
    typeof slug === "string" &&
    slug.length <= MAX_PLAN_SLUG_LENGTH &&
    PLAN_SLUG_PATTERN.test(slug) &&
    !WINDOWS_RESERVED_NAME_RE.test(slug)
  );
}
//@ chunk-82kqcve8.js:188950-189119 layout
function logInvalidPlanSlug(context, slug) {
  let slugText =
    typeof slug === "string"
      ? jsonStringify(truncateWithCount(slug.replace(CONTROL_CHARS_EXCEPT_WS_RE, ""), 80))
      : `<non-string slug of type ${typeof slug}>`;
  logForDebugging(`${context}: refusing invalid plan slug ${slugText}`, {
    level: "error",
  });
}
//@ chunk-82kqcve8.js:189119-189227 facade-exports
function setPlanSlug(sessionId, slug) {
  if (!isValidPlanFileName(slug)) {
    logInvalidPlanSlug("setPlanSlug", slug);
    return;
  }
  getPlanSlugCache().set(sessionId, slug);
  planFiles().exemptSlugFromRevalidation(sessionId, slug);
}
//@ chunk-82kqcve8.js:189227-189267 facade-exports
function clearAllPlanSlugs() {
  planFiles().clearAllPlanSlugs();
}
//@ chunk-82kqcve8.js:189267-189579 layout
/**
 * 计划目录解析器：缓存结果；无盘模式或未配置时用默认目录；配置的 plansDirectory 必须位于项目根内，否则记错误并回退默认目录。
 */
class PlansDirectoryResolver {
  #e = undefined;
  directory() {
    this.#e ??= this.#t();
    return this.#e;
  }
  #t() {
    if (isDiskless()) return globalPlansDirectory();
    let plansDirectory = getInitialSettings_2().plansDirectory;
    if (plansDirectory) {
      let cwd = getCwd();
      let resolvedDir = resolve(cwd, plansDirectory);
      if (isPathWithinProjectRoot(resolvedDir, cwd)) return resolvedDir;
      logForDebugging(
        `plansDirectory must be within project root, with no backslash in its path off Windows: ${plansDirectory}`,
        {
          level: "error",
        },
      );
    }
    return globalPlansDirectory();
  }
  reset() {
    this.#e = undefined;
  }
}
//@ chunk-82kqcve8.js:189579-189704 facade-exports (2.1.88 match: reset, 0.777)
var PLANS_DIRECTORY_PER_HOST; // deferred: uses PlansDirectoryResolver of its import cycle while loading; runs once the cycle is complete
var getPlansDirectory;
deferInit("chunk-82kqcve8.js:189579", () => {
  PLANS_DIRECTORY_PER_HOST = new HostScoped(() => new PlansDirectoryResolver());
  getPlansDirectory = Object.assign(
    function () {
      return PLANS_DIRECTORY_PER_HOST.of(rootSessionHost()).directory();
    },
    {
      cache: {
        clear() {
          PLANS_DIRECTORY_PER_HOST.of(rootSessionHost()).reset();
        },
      },
    },
  );
});
//@ chunk-82kqcve8.js:189704-189951 layout
/**
 * 判断路径位于项目根之内：前缀匹配、不含危险形式、不经过 UNC 连接点，并逐级向上找到真实路径确认仍在根的真实路径之下。
 */
function isPathWithinProjectRoot(candidatePath, cwd) {
  if (candidatePath !== cwd && !candidatePath.startsWith(cwd + sep)) return false;
  if (hasBackslash(candidatePath)) return false;
  if (findIntermediateUncJunction(getFsImplementation(), candidatePath) !== undefined) return false;
  let rootReal = nativeRealpathLong(cwd);
  if (rootReal === null) return false;
  let current = candidatePath;
  for (;;) {
    let currentReal = nativeRealpathLong(current);
    if (currentReal !== null) return currentReal === rootReal || currentReal.startsWith(rootReal + sep);
    let parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}
//@ chunk-82kqcve8.js:189951-190106 layout
async function ensurePlansDirectory(storageBackend) {
  let plansDirectory = getPlansDirectory();
  if (isDiskless()) return plansDirectory;
  try {
    await getFileReader().mkdir(plansDirectory);
  } catch (error) {
    logForDebugging(`Failed to create plans directory ${plansDirectory}: ${error}`, {
      level: "error",
    });
  }
  return plansDirectory;
}
//@ chunk-82kqcve8.js:190106-190541 facade-exports
async function saveRejectedUltraplan(planText, storageV5) {
  if (storageV5 && isUsingGlobalPlansDir()) {
    let slug = `${generateWordSlug()}-ultraplan`;
    let filePath = join(await ensurePlansDirectory(storageV5), `${slug}.md`);
    let writeResult = await storageV5.write(planStorageSpace(slug), planText, DEFAULT_PLAN_FILE_STATE);
    if (!writeResult.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `saveRejectedUltraplan: v5 write failed: ${writeResult.error.code}`,
        "saveRejectedUltraplan: v5 write failed",
      );
    return filePath;
  }
  if (isDiskless()) {
    warnDisklessSettingsWrite("rejected_ultraplan", getPlansDirectory());
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Cannot save the plan: this session does not write to disk",
    );
  }
  let filePath = join(await ensurePlansDirectory(), `${generateWordSlug()}-ultraplan.md`);
  await getFileReader().write(filePath, planText);
  return filePath;
}
//@ chunk-82kqcve8.js:190541-190888 facade-exports
async function persistPlanEdit(filePath, inputPlan, storageV5) {
  try {
    await ensurePlansDirectory(storageV5);
    let planName = basename(filePath, ".md");
    let storageKey =
      storageV5 !== undefined &&
      isUsingGlobalPlansDir() &&
      dirname(filePath) === getPlansDirectory() &&
      validateStorageKey(planStorageSpace(planName)) === undefined
        ? planStorageSpace(planName)
        : undefined;
    if (storageV5 !== undefined && storageKey !== undefined) {
      let writeResult = await storageV5.write(storageKey, inputPlan, DEFAULT_PLAN_FILE_STATE);
      if (!writeResult.ok) {
        reportPlanPersistFailure(filePath, writeResult.error.code);
        return;
      }
    } else if (isDiskless()) {
      warnDisklessSettingsWrite("plan_edit", filePath);
      return;
    } else await getFileReader().write(filePath, inputPlan);
    notePlanFileWritten(filePath, inputPlan);
  } catch (error) {
    reportPlanPersistFailure(filePath, error instanceof Error ? error.message : String(error));
  }
}
//@ chunk-82kqcve8.js:190888-190969 layout
function reportPlanPersistFailure(filePath, reason) {
  notePlanFileForgotten(filePath);
  logForDebugging(`Failed to persist plan to ${filePath}: ${reason}`, {
    level: "error",
  });
}
//@ chunk-82kqcve8.js:190969-191099 facade-exports (2.1.88 match: getPlanFilePath, 0.856)
function getPlanFilePath(agentId) {
  let sessionId = getSessionId();
  let planSlug = getPlanSlug(sessionId);
  planFiles().markPlanPathServed(sessionId);
  if (!agentId) return join(getPlansDirectory(), `${planSlug}.md`);
  return join(getPlansDirectory(), `${planSlug}-agent-${agentId}.md`);
}
//@ chunk-82kqcve8.js:191099-191298 layout
async function readPlanViaStorage(storageV5, planName, context) {
  let readResult = await storageV5.read([planStorageSpace(planName)]);
  if (!readResult.ok) {
    logForDebugging(`${context}: v5 read failed: ${readResult.error.code}`);
    return null;
  }
  let item = readResult.value.items[0];
  return item.found ? Buffer.from(item.value).toString("utf-8") : null;
}
//@ chunk-82kqcve8.js:191298-191465 facade-exports
function getPlan(agentId) {
  let planFilePath = getPlanFilePath(agentId);
  let planFileCache = planFiles().planFileCache;
  if (planFileCache !== null && isUsingGlobalPlansDir()) {
    if (agentId) planFiles().watchAgentPlanFile(getPlanSlug(getSessionId()), basename(planFilePath));
    let cachedPlan = planFileCache.get(basename(planFilePath));
    if (cachedPlan !== undefined) return cachedPlan;
  }
  return readPlanFileSync(planFilePath);
}
//@ chunk-82kqcve8.js:191465-191649 facade-exports
async function getPlanAsync(agentId, storageV5) {
  if (storageV5 === undefined || !isUsingGlobalPlansDir()) return getPlan(agentId);
  let planFileName = getPlanFileName(agentId);
  await planFiles().settlePlanFile(planFileName);
  let cachedPlan = planFiles().planFileCache?.get(planFileName);
  if (cachedPlan !== undefined) return cachedPlan;
  return readPlanViaStorage(storageV5, stripMdExtension(planFileName), "getPlan");
}
//@ chunk-82kqcve8.js:191649-191758 layout
function getPlanFileName(agentId) {
  let fileName = basename(getPlanFilePath(agentId));
  let store = planFiles();
  if (agentId && store.planFileCache !== null)
    store.watchAgentPlanFile(getPlanSlug(getSessionId()), fileName);
  return fileName;
}
//@ chunk-82kqcve8.js:191758-191966 facade-exports
async function planExistsAsync(agentId, storageV5) {
  if (storageV5 === undefined || !isUsingGlobalPlansDir()) return getPlan(agentId) !== null;
  let planFileName = getPlanFileName(agentId);
  await planFiles().settlePlanFile(planFileName);
  let cachedPlan = planFiles().planFileCache?.get(planFileName);
  if (cachedPlan !== undefined) return cachedPlan !== null;
  return (await storageV5.statMeta(planStorageSpace(stripMdExtension(planFileName)))).ok;
}
//@ chunk-82kqcve8.js:191966-192261 facade-exports
async function readPlanFileFresh(storageV5) {
  let planFilePath = getPlanFilePath();
  if (isStorageV5Enabled() && storageV5 !== undefined && isUsingGlobalPlansDir()) {
    let fileName = basename(planFilePath);
    let store = planFiles();
    let watch = store.planFileWatches.get(fileName);
    if (watch !== undefined) {
      if (!(await raceWithTimeout(store.refreshPlanFile(fileName, watch), store.waitCapMs)))
        store.giveUpWaiting(fileName, watch);
      let cachedPlan = store.planFileCache?.get(fileName);
      if (cachedPlan !== undefined) return cachedPlan;
    }
    return readPlanViaStorage(storageV5, stripMdExtension(fileName), "readPlanFileFresh");
  }
  return readPlanFileSync(planFilePath);
}
//@ chunk-82kqcve8.js:192261-192455 layout
function readPlanFileSync(planFilePath) {
  if (isDiskless()) return null;
  try {
    return getFsImplementation().readFileSync(planFilePath, {
      encoding: "utf-8",
    });
  } catch (error) {
    if (isENOENT(error)) return null;
    if (isFsInaccessible(error)) {
      logForDebugging(`getPlan: read failed for ${planFilePath}: ${error}`);
      return null;
    }
    logError(error);
    return null;
  }
}
//@ chunk-82kqcve8.js:192455-192620 layout
function getSlugFromLog(log) {
  let validSlug;
  let invalidSlug;
  for (let message of log.messages) {
    let slug = message.slug;
    if (!slug || slug === validSlug) continue;
    if (isValidPlanFileName(slug)) validSlug = slug;
    else invalidSlug ??= slug;
  }
  if (validSlug === undefined && invalidSlug !== undefined) logInvalidPlanSlug("getSlugFromLog", invalidSlug);
  return validSlug;
}
//@ chunk-82kqcve8.js:192620-193494 facade-exports (2.1.88 match: copyPlanForResume, 0.822)
/**
 * resume 时把原会话的计划文件复制到新会话 slug 下，缺失时从消息中恢复。
 */
async function copyPlanForResume(log, targetSessionId, storageV5) {
  let slug = getSlugFromLog(log);
  if (!slug) return false;
  let sessionId = targetSessionId ?? getSessionId();
  setPlanSlug(sessionId, slug);
  if (storageV5 && isUsingGlobalPlansDir())
    return copyPlanForResume_2(storageV5, log, slug).catch((error) => {
      logError(error);
      return false;
    });
  let planPath = join(getPlansDirectory(), `${slug}.md`);
  if (isDiskless()) return false;
  try {
    await getFileReader().read(planPath);
    return true;
  } catch (e) {
    if (!isENOENT(e)) {
      if (isFsInaccessible(e)) {
        logForDebugging(`copyPlanForResume: read failed for ${planPath}: ${e}`);
        return false;
      }
      logError(e);
      return false;
    }
    if (getEnvironmentKind() === null) return false;
    logForDebugging(`Plan file missing during resume: ${planPath}. Attempting recovery.`);
    let snapshotPlan = findFileSnapshotEntry(log, "plan");
    let recovered = null;
    if (snapshotPlan && isValidPlanContent(snapshotPlan.content)) {
      recovered = snapshotPlan.content;
      logForDebugging(`Plan recovered from file snapshot, ${recovered.length} chars`, {
        level: "info",
      });
    } else {
      recovered = recoverPlanFromMessages(log);
      if (recovered)
        logForDebugging(`Plan recovered from message history, ${recovered.length} chars`, {
          level: "info",
        });
    }
    if (recovered)
      try {
        await ensurePlansDirectory();
        await getFileReader().write(planPath, recovered);
        return true;
      } catch (writeError) {
        if (isFsInaccessible(writeError)) {
          logForDebugging(`Plan recovery write failed for ${planPath}: ${writeError}`);
          return false;
        }
        logError(writeError);
        return false;
      } finally {
        notePlanFileForgotten(planPath);
      }
    logForDebugging("Plan file recovery failed: no file snapshot or plan content found in message history");
    return false;
  }
}
//@ chunk-82kqcve8.js:193494-194413 layout (2.1.88 match: copyPlanForResume, 0.785)
async function copyPlanForResume_2(storageV5, log, slug) {
  let fileName = `${slug}.md`;
  let observation = planFiles().observePlanFile(fileName);
  let readResult = await storageV5.read([planStorageSpace(slug)]);
  if (!readResult.ok) {
    logForDebugging(`copyPlanForResume: v5 read failed for ${slug}: ${readResult.error.code}`);
    return false;
  }
  let item = readResult.value.items[0];
  planFiles().notePlanFileObserved(
    fileName,
    item?.found ? Buffer.from(item.value).toString("utf-8") : null,
    observation,
  );
  if (item?.found) return true;
  if (getEnvironmentKind() === null) return false;
  logForDebugging(`Plan file missing during resume: ${slug}. Attempting recovery.`);
  let snapshotPlan = findFileSnapshotEntry(log, "plan");
  let recovered = null;
  if (snapshotPlan && isValidPlanContent(snapshotPlan.content)) {
    recovered = snapshotPlan.content;
    logForDebugging(`Plan recovered from file snapshot, ${recovered.length} chars`, {
      level: "info",
    });
  } else {
    recovered = recoverPlanFromMessages(log);
    if (recovered)
      logForDebugging(`Plan recovered from message history, ${recovered.length} chars`, {
        level: "info",
      });
  }
  if (recovered) {
    let filePath = join(getPlansDirectory(), fileName);
    let wrotePlan = false;
    try {
      await ensurePlansDirectory(storageV5);
      let writeResult = await storageV5.write(planStorageSpace(slug), recovered, DEFAULT_PLAN_FILE_STATE);
      if (!writeResult.ok) {
        logForDebugging(`Plan recovery write failed for ${slug}: ${writeResult.error.code}`);
        return false;
      }
      wrotePlan = true;
      return true;
    } finally {
      if (wrotePlan) notePlanFileWritten(filePath, recovered);
      else notePlanFileForgotten(filePath);
    }
  }
  logForDebugging("Plan file recovery failed: no file snapshot or plan content found in message history");
  return false;
}
//@ chunk-82kqcve8.js:194413-194795 facade-exports
async function copyPlanForFork(log, targetSessionId, storageV5) {
  let originalSlug = getSlugFromLog(log);
  if (!originalSlug) return false;
  let plansDir = getPlansDirectory();
  let sourcePath = join(plansDir, `${originalSlug}.md`);
  let planSlug = getPlanSlug(targetSessionId);
  let targetPath = join(plansDir, `${planSlug}.md`);
  planFiles().exemptSlugFromRevalidation(targetSessionId, planSlug);
  if (storageV5 && isUsingGlobalPlansDir())
    return copyPlanForForkViaStorage(storageV5, originalSlug, planSlug).catch((error) => {
      logError(error);
      return false;
    });
  await ensurePlansDirectory();
  try {
    if (isDiskless()) return false;
    await getFileReader().copy(sourcePath, targetPath);
    return true;
  } catch (error) {
    if (isENOENT(error)) return false;
    if (isFsInaccessible(error)) {
      logForDebugging(`copyPlanForFork: copy failed for ${sourcePath}: ${error}`);
      return false;
    }
    logError(error);
    return false;
  } finally {
    notePlanFileForgotten(targetPath);
  }
}
//@ chunk-82kqcve8.js:194795-195246 layout
async function copyPlanForForkViaStorage(storageV5, planName, planSlug) {
  let targetPath = join(getPlansDirectory(), `${planSlug}.md`);
  let writtenContent;
  try {
    await ensurePlansDirectory(storageV5);
    let readResult = await storageV5.read([planStorageSpace(planName)]);
    if (!readResult.ok) {
      logForDebugging(`copyPlanForFork: v5 read failed for ${planName}: ${readResult.error.code}`);
      return false;
    }
    if (!readResult.value.items[0].found) return false;
    let content = readResult.value.items[0].value;
    let writeResult = await storageV5.write(
      planStorageSpace(planSlug),
      content,
      await getPlanFileState(planName),
    );
    if (!writeResult.ok) {
      logForDebugging(`copyPlanForFork: v5 write failed for ${planSlug}: ${writeResult.error.code}`);
      return false;
    }
    writtenContent = Buffer.from(content).toString("utf-8");
    return true;
  } finally {
    if (writtenContent !== undefined) notePlanFileWritten(targetPath, writtenContent);
    else notePlanFileForgotten(targetPath);
  }
}
//@ chunk-82kqcve8.js:195246-195811 fingerprint (2.1.88 match: recoverPlanFromMessages, 1)
/**
 * 从 ExitPlanMode 工具调用或计划附件中恢复计划内容。
 */
function recoverPlanFromMessages(log) {
  for (let i = log.messages.length - 1; i >= 0; i--) {
    let msg = log.messages[i];
    if (typeof msg !== "object" || msg === null) continue;
    if (msg.type === "assistant") {
      let content = msg.message?.content;
      if (Array.isArray(content)) {
        for (let block of content)
          if (
            typeof block === "object" &&
            block !== null &&
            block.type === "tool_use" &&
            block.name === EXITPLANMODE_2
          ) {
            let input = block.input;
            let plan = typeof input === "object" && input !== null ? input.plan : undefined;
            if (isValidPlanContent(plan)) return plan;
          }
      }
    }
    if (msg.type === "user") {
      let userMsg = msg;
      if (isValidPlanContent(userMsg.planContent)) return userMsg.planContent;
    }
    if (msg.type === "attachment") {
      let attachmentMsg = msg;
      if (attachmentMsg.attachment?.type === "plan_file_reference") {
        let plan = attachmentMsg.attachment.planContent;
        if (isValidPlanContent(plan)) return plan;
      }
    }
  }
  return null;
}
//@ chunk-82kqcve8.js:195811-196201 fingerprint (2.1.88 match: findFileSnapshotEntry, 0.924)
function findFileSnapshotEntry(messages, key) {
  let entries = [...messages.messages, ...(messages.fileSnapshots ?? [])];
  for (let i = entries.length - 1; i >= 0; i--) {
    let msg = entries[i];
    if (
      msg?.type === "system" &&
      "subtype" in msg &&
      msg.subtype === "file_snapshot" &&
      "snapshotFiles" in msg
    ) {
      let files = msg.snapshotFiles;
      if (!Array.isArray(files)) continue;
      let found = files.find(
        (file) =>
          typeof file === "object" &&
          file !== null &&
          file.key === key &&
          typeof file.path === "string" &&
          typeof file.content === "string",
      );
      if (found !== undefined) return found;
    }
  }
  return;
}
//@ chunk-82kqcve8.js:196201-196217 facade-exports
var PLAN_SNAPSHOT_MAX_CHARS = 2000000;
//@ chunk-82kqcve8.js:196217-196286 affinity
function isValidPlanContent(content) {
  return typeof content === "string" && content.length > 0 && content.length <= PLAN_SNAPSHOT_MAX_CHARS;
}
//@ chunk-82kqcve8.js:237342-237506 fingerprint (2.1.88 match: getPlanFilePath, 1)
/**
 * 计划文件路径：<计划目录>/<slug>.md，子代理为 <slug>-agent-<id>.md。
 */
function getPlanFilePath_2(agentId) {
  let slug = peekPlanSlug();
  if (!slug) return false;
  let planSlug = normalize(agentId);
  if (dirname(planSlug) !== normalize(getPlansDirectory())) return false;
  let fileName = basename(planSlug);
  return fileName === `${slug}.md` || (fileName.startsWith(`${slug}-agent-`) && fileName.endsWith(".md"));
}
//@ chunk-e6aww6q8.js:861063-861089 placement
/**
 * isDisklessSession：是否无盘会话。
 */
function isDisklessSession() {
  return isDiskless();
}
//@ chunk-e6aww6q8.js:861089-861172 placement
/**
 * hostOwnedInputFieldSet：取某工具需要剔除的宿主专属输入字段。
 */
function hostOwnedInputFieldSet(toolName, input) {
  return isDisklessSession() && !Object.hasOwn(input, "planFilePath")
    ? undefined
    : API_STRIPPED_INPUT_FIELDS.get(toolName);
}
//@ chunk-e6aww6q8.js:1501827-1502265 fingerprint (2.1.88 match: persistFileSnapshotIfRemote, 0.807)
async function persistFileSnapshotIfRemote(storageV5) {
  if (getEnvironmentKind() === null) return;
  try {
    let snapshotFiles = [];
    let plan = await readPlanFileFresh(storageV5);
    if (plan && plan.length > PLAN_SNAPSHOT_MAX_CHARS)
      logForDebugging(`Plan over snapshot cap (${plan.length} chars), skipping`);
    else if (plan)
      snapshotFiles.push({
        key: "plan",
        path: isDiskless() ? "" : getPlanFilePath(),
        content: plan,
      });
    if (snapshotFiles.length === 0) return;
    let message = {
      type: "system",
      subtype: "file_snapshot",
      content: "File snapshot",
      level: "info",
      isMeta: true,
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
      snapshotFiles,
    };
    await recordTranscript([message], undefined, undefined, undefined, storageV5);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1502265-1502377 affinity
function getPlanWithPath(agentId) {
  if (isDisklessSession()) return null;
  let planFilePath = getPlanFilePath(agentId);
  notePlanFileForgotten(planFilePath);
  let plan = getPlan(agentId);
  return plan !== null
    ? {
        plan,
        planFilePath,
      }
    : null;
}
//@ chunk-e6aww6q8.js:4329866-4330013 fingerprint (2.1.88 match: getPlan, 1)
function getPlan_2() {
  if (isDiskless()) return null;
  let fsImplementation = getFsImplementation();
  let installedPluginsFilePath = getInstalledPluginsFilePath();
  let rawPluginsJson;
  try {
    rawPluginsJson = fsImplementation.readFileSync(installedPluginsFilePath, {
      encoding: "utf-8",
    });
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  return parseInstalledPluginsJson(rawPluginsJson);
}
export {
  getPlansDirectory,
  primePlanSlugCollisions,
  isDisklessSession,
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
  hostOwnedInputFieldSet,
  notePlanFileWritten,
  getPlan_2,
  persistPlanEdit,
  getPlanSlug_2,
  PLAN_SNAPSHOT_MAX_CHARS,
  readPlanFileFresh,
};
