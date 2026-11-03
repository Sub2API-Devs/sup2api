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
import { findIntermediateUncJunction, getFsImplementation } from "./fsOperations.js";
import { nativeRealpathLong } from "./windowsUncPaths.js";
import { getFileReader } from "./fileStore.js";
import { warnDisklessSettingsWrite } from "./settings/settingsStorage.js";
import { getEnvironmentKind } from "./filePersistence/outputsScanner.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { API_STRIPPED_INPUT_FIELDS } from "./api.js";
import { recordTranscript } from "./sessionStorage.js";
import { getInstalledPluginsFilePath, parseInstalledPluginsJson } from "./plugins/installedPluginsManager.js";
import { getPlatform } from "./platform.js";
import { POWERSHELL_EXE_CANDIDATES } from "./shell/powershellDetection.js";
import { realpathCacheEntry } from "./permissions/protectedDirs.js";

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
  planFileCacheKeyFor(e) {
    if (this.planFileCache === null) return null;
    let n = resolve(e);
    if (dirname(n) !== globalPlansDirectory()) return null;
    return basename(n);
  }
  notePlanFileWritten(e, n) {
    if (this.planFileCache === null) {
      this.noteEarly(e, n);
      return;
    }
    let r = this.planFileCacheKeyFor(e);
    if (r !== null) {
      let s = this.planFileWatches.get(r);
      if (s !== undefined) s.generation++;
      this.planFileCache.set(r, n);
      if (this.primedListing !== null && this.primedListing.dir === globalPlansDirectory())
        this.primedListing.listing.add(r);
    }
  }
  notePlanFileForgotten(e) {
    if (this.planFileCache === null) {
      this.noteEarly(e, undefined);
      return;
    }
    let n = this.planFileCacheKeyFor(e);
    if (n !== null) {
      let r = this.planFileWatches.get(n);
      if (r !== undefined) {
        this.dropToUnknown(n, r);
        this.refreshPlanFile(n, r);
        return;
      }
      this.planFileCache.delete(n);
    }
  }
  resetPlanFileCacheToUnknown() {
    if (this.planFileCache === null) return;
    for (let key of [...this.planFileCache.keys()]) {
      let n = this.planFileWatches.get(key);
      if (n !== undefined) {
        this.dropToUnknown(key, n);
        this.refreshPlanFile(key, n);
      } else this.planFileCache.delete(key);
    }
  }
  activatePlanFileCache(e) {
    this.planFileCache ??= new Map();
    if (isStorageV5Enabled() && e !== undefined && this.planFileBackend === null) {
      this.planFileBackend = e;
      this.stopReleasingOnSwitch = onSessionSwitch(() => this.releaseStaleWatches());
      for (let n of new Set(getPlanSlugCache().values())) this.watchSlug(n, false);
      this.earlyObserved.clear();
    }
  }
  noteEarly(e, n) {
    if (!isStorageV5Enabled()) return;
    let r = resolve(e);
    if (dirname(r) !== globalPlansDirectory()) return;
    this.earlyGeneration++;
    if (n === undefined) this.earlyObserved.delete(basename(r));
    else this.earlyObserved.set(basename(r), n);
  }
  watchSlug(e, n) {
    this.releaseStaleWatches();
    this.watchPlanFile(e, `${e}.md`, n);
    this.lastUnwatched.clear();
  }
  releaseStaleWatches() {
    if (this.planFileWatches.size === 0) return;
    let e = new Set(getPlanSlugCache().values());
    for (let [n, r] of this.planFileWatches) if (!e.has(r.slug)) this.stopWatch(n, r);
  }
  watchPlanFile(slug, n, r) {
    let planFileBackend = this.planFileBackend;
    if (
      planFileBackend === null ||
      this.planFileCache === null ||
      this.planFileWatches.has(n) ||
      !isUsingGlobalPlansDir() ||
      validateStorageKey(planStorageSpace(stripMdExtension(n))) !== undefined
    )
      return;
    let h = {
      slug,
      generation: 0,
      seededAbsent: false,
      subscription: undefined,
      refreshing: undefined,
      refreshAgain: false,
      resubscribed: false,
      stopped: false,
    };
    this.planFileWatches.set(n, h);
    let y = this.earlyObserved.has(n) ? this.earlyObserved.get(n) : this.lastUnwatched.get(n);
    this.earlyObserved.delete(n);
    this.lastUnwatched.delete(n);
    if (y !== undefined) this.planFileCache.set(n, y);
    else if (r && !this.planFileCache.has(n)) {
      this.planFileCache.set(n, null);
      h.seededAbsent = true;
    }
    this.subscribePlanFile(planFileBackend, n, h);
  }
  observePlanFile(e) {
    let n = this.planFileWatches.get(e);
    return {
      watch: n,
      generation: n?.generation ?? this.earlyGeneration,
    };
  }
  notePlanFileObserved(e, n, r) {
    let s = this.planFileWatches.get(e);
    if (s !== undefined) {
      if (r.watch === s && s.generation === r.generation) this.installPlanFile(e, s, n);
      else this.refreshPlanFile(e, s);
    } else if (
      this.planFileBackend === null &&
      isStorageV5Enabled() &&
      r.watch === undefined &&
      this.earlyGeneration === r.generation
    )
      this.earlyObserved.set(e, n);
  }
  watchAgentPlanFile(e, n) {
    if (this.planFileBackend === null) return;
    let r = this.planFileWatches.get(n);
    if (r !== undefined) {
      this.planFileWatches.delete(n);
      this.planFileWatches.set(n, r);
      return;
    }
    let filtered = [...this.planFileWatches].filter(([h, y]) => y.slug === e && h !== `${e}.md`);
    for (let [h, y] of filtered.slice(0, Math.max(0, filtered.length - MAX_PLAN_WATCHES_PER_SLUG + 1))) {
      let w = this.planFileCache?.get(h);
      this.stopWatch(h, y);
      if (typeof w === "string") this.planFileCache?.set(h, w);
    }
    this.watchPlanFile(e, n, false);
  }
  async subscribePlanFile(e, n, r) {
    let generation = r.generation;
    let h;
    try {
      let y = await e.subscribe(
        {
          target: "key",
          key: planStorageSpace(stripMdExtension(n)),
        },
        (w) => this.onPlanFileEvent(n, r, generation, w),
        {
          maxObservationLagMs: PLAN_LISTING_WAIT_CAP_MS,
        },
      );
      if (y.ok) {
        if (r.stopped) y.value.unsubscribe();
        else {
          r.subscription = y.value;
          logForDebugging(
            `plans: watching ${n} through the storage interface (changes trail by at most ${y.value.observationLagMs} ms)`,
          );
        }
        return;
      }
      h = formatStorageError(y.error);
    } catch (error) {
      h = String(error);
    }
    if (r.stopped) return;
    logForDebugging(
      `plans: watching ${n} through the storage interface failed (${h}); serving its last read and in-process writes`,
    );
    if (this.planFileCache?.has(n) !== true) this.refreshPlanFile(n, r);
  }
  onPlanFileEvent(e, n, r, s) {
    if (n.stopped) return;
    if (!s.ok) {
      if (s.error.code === "Unavailable") {
        queueMicrotask(() => void this.refreshPlanFile(e, n));
        return;
      }
      n.subscription = undefined;
      if (isCleanupStarted()) return;
      logForDebugging(`plans: the watch on ${e} ended: ${formatStorageError(s.error)}`);
      let planFileBackend = this.planFileBackend;
      if (planFileBackend !== null && !n.resubscribed) {
        n.resubscribed = true;
        this.subscribePlanFile(planFileBackend, e, n);
      } else this.stopWatch(e, n);
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
    n.generation++;
    this.planFileCache?.set(e, r);
  }
  refreshPlanFile(e, n) {
    if (n.refreshing !== undefined) {
      n.refreshAgain = true;
      return n.refreshing;
    }
    let planFileBackend = this.planFileBackend;
    if (planFileBackend === null) return Promise.resolve();
    let s = async () => {
      await Promise.resolve();
      try {
        do {
          n.refreshAgain = false;
          let generation = n.generation;
          let planFileForWatch = await this.readPlanFileForWatch(planFileBackend, e);
          if (n.stopped) return;
          if (planFileForWatch === undefined) {
            if (n.generation === generation) {
              n.generation++;
              this.planFileCache?.delete(e);
            }
            continue;
          }
          if (n.generation === generation) this.installPlanFile(e, n, planFileForWatch);
          else n.refreshAgain = true;
        } while (n.refreshAgain && !n.stopped);
      } finally {
        n.refreshing = undefined;
      }
    };
    n.refreshing = s();
    return n.refreshing;
  }
  async readPlanFileForWatch(e, n) {
    try {
      let r = await e.read([planStorageSpace(stripMdExtension(n))]);
      if (r.ok) {
        let s = r.value.items[0];
        return s?.found ? Buffer.from(s.value).toString("utf-8") : null;
      }
      logForDebugging(`plans: v5 read of ${n} failed: ${r.error.code}`);
    } catch (error) {
      logForDebugging(`plans: v5 read of ${n} threw: ${error}`);
    }
    return;
  }
  async settlePlanFile(e) {
    let n = this.planFileWatches.get(e);
    if (n === undefined) return;
    let r = n.refreshing ?? (this.planFileCache?.has(e) !== true ? this.refreshPlanFile(e, n) : undefined);
    if (r !== undefined && !(await raceWithTimeout(r, this.waitCapMs))) this.giveUpWaiting(e, n);
  }
  dropToUnknown(e, n) {
    if (n.stopped) return;
    n.generation++;
    this.planFileCache?.delete(e);
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
      if (r !== undefined) this.lastUnwatched.set(e, r);
      this.stopWatch(e, n);
    }
  }
  stopWatch(e, n) {
    n.stopped = true;
    n.subscription?.unsubscribe();
    n.subscription = undefined;
    this.planFileWatches.delete(e);
    this.planFileCache?.delete(e);
  }
  commitPlanListing(e, n) {
    let r = new Set(n);
    this.primedListing = {
      dir: e,
      listing: r,
    };
    let planSlugCache = getPlanSlugCache();
    let filtered = [...this.slugMeta].filter(([, w]) => w.validatedDir !== e);
    let y = new Set(filtered.map(([w]) => w));
    for (let [w, S] of planSlugCache) if (!y.has(w)) r.add(`${S}.md`);
    for (let [w, S] of filtered) {
      let R = planSlugCache.get(w);
      if (R === undefined) {
        this.slugMeta.delete(w);
        continue;
      }
      if (r.has(`${R}.md`)) {
        if (S.consumed) {
          logForDebugging(
            `Plan slug collision for '${R}' in ${e} detected after the plan path was already in use \u2014 keeping the slug (the pre-existing plan file may be overwritten).`,
            {
              level: "warn",
            },
          );
          S.validatedDir = e;
          continue;
        }
        planSlugCache.delete(w);
        this.slugMeta.delete(w);
        if (![...planSlugCache.values()].includes(R)) this.unwatchSlug(R);
        this.getPlanSlug(w, S.seed);
      } else {
        r.add(`${R}.md`);
        S.validatedDir = e;
      }
    }
  }
  getPlanSlug(e, n) {
    let planSlugCache = getPlanSlugCache();
    let s = planSlugCache.get(e);
    if (!s) {
      let h = n ? slugifyPromptWords(n) : "";
      let y = true;
      for (let j = 0; j < MAX_PLAN_SLUG_ATTEMPTS; j++) {
        s = h ? `${h}-${randomWordSlug()}` : generateWordSlug();
        y = this.primedListing?.listing.has(`${s}.md`) === true;
        if (!y) break;
      }
      let w = !getIsNonInteractiveSession() && !getSessionTrustAccepted();
      this.slugMeta.set(e, {
        validatedDir: w || this.primedListing === null ? null : this.primedListing.dir,
        consumed: false,
        seed: n,
      });
      let S = !y && this.primedListing !== null && this.primedListing.dir === globalPlansDirectory();
      this.primedListing?.listing.add(`${s}.md`);
      planSlugCache.set(e, s);
      this.lastUnwatched.clear();
      this.watchSlug(s, S);
    }
    return s;
  }
  markPlanPathServed(e) {
    let n = this.slugMeta.get(e);
    if (n) n.consumed = true;
  }
  exemptSlugFromRevalidation(e, n) {
    this.slugMeta.delete(e);
    this.primedListing?.listing.add(`${n}.md`);
    this.watchSlug(n, false);
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
var plansStoreSlot = new HostScoped(() => new PlansStore());
//@ chunk-82kqcve8.js:186959-186989 layout
function rootSessionHost() {
  return getRootSession().host;
}
//@ chunk-82kqcve8.js:186989-187022 facade-exports
function planFiles() {
  return plansStoreSlot.of(rootSessionHost());
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
//@ chunk-82kqcve8.js:187165-187684 sole-consumer
/**
 * 分页列出 v5 存储中 plan 命名空间下的所有键，转成 "<名称>.md" 列表；列表出错、超过页数上限或抛异常时记日志并返回 null。
 */
async function listPlanSlugsFromStore(e) {
  let planFiles = [];
  try {
    let pageResult = await readAllPages(
      (cursor) =>
        e.listEntries(
          {
            namespace: "plan",
          },
          {
            cursor,
            skipKeyStats: true,
          },
        ),
      (s) => {
        for (let h of s)
          if (h.kind === "key" && h.key.namespace === "plan") planFiles.push(`${h.key.name}.md`);
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
async function primePlanSlugCollisions_2(e, n) {
  let r = await listPlanSlugsFromStore(e);
  if (n !== plansDirectoryForSession()) return;
  if (r !== null) {
    planFiles().activatePlanFileCache(e);
    planFiles().commitPlanListing(n, r);
  }
}
//@ chunk-82kqcve8.js:187944-188040 facade-exports
async function settlePlanFileCachePrime() {
  let e = planFiles();
  if (e.primeInFlight !== null) await raceWithTimeout(e.primeInFlight, e.waitCapMs);
}
//@ chunk-82kqcve8.js:188040-188399 facade-exports
async function primePlanSlugCollisions(e) {
  let n = plansDirectoryForSession();
  if (e && n === globalPlansDirectory()) {
    let r = planFiles();
    let s = primePlanSlugCollisions_2(e, n);
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
    let r = await readdir(n);
    if (n !== plansDirectoryForSession()) return;
    planFiles().commitPlanListing(n, r);
  } catch (error) {
    if (!isENOENT(error) && !isFsInaccessible(error)) logError(error);
    if (n !== plansDirectoryForSession()) return;
    if (isENOENT(error)) planFiles().commitPlanListing(n, []);
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
function planStorageSpace(e) {
  return STORAGE_SPACES.plan(e);
}
//@ chunk-82kqcve8.js:188525-188581 layout = isSessionPlanFile (1)
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
//@ chunk-82kqcve8.js:188618-188742 layout = isSessionPlanFile (1)
/**
 * lstat 计划目录下 <name>.md，返回 {publishDiscipline:"inPlace", mode}（低 9 位权限）；文件不存在或远程模式返回默认状态。
 */
async function getPlanFileState(planName) {
  if (isDiskless()) return DEFAULT_PLAN_FILE_STATE;
  try {
    let n = await lstat(join(getPlansDirectory(), `${planName}.md`));
    return {
      ...DEFAULT_PLAN_FILE_STATE,
      mode: n.mode & 511,
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
function getPlanSlug(sessionId, n) {
  return planFiles().getPlanSlug(sessionId ?? getSessionId(), n);
}
//@ chunk-82kqcve8.js:188827-188868 facade-exports
function peekPlanSlug(e) {
  return getPlanSlugCache().get(e ?? getSessionId());
}
//@ chunk-82kqcve8.js:188868-188950 layout
function isValidPlanFileName(e) {
  return (
    typeof e === "string" &&
    e.length <= MAX_PLAN_SLUG_LENGTH &&
    PLAN_SLUG_PATTERN.test(e) &&
    !WINDOWS_RESERVED_NAME_RE.test(e)
  );
}
//@ chunk-82kqcve8.js:188950-189119 layout
function logInvalidPlanSlug(e, n) {
  let r =
    typeof n === "string"
      ? jsonStringify(truncateWithCount(n.replace(CONTROL_CHARS_EXCEPT_WS_RE, ""), 80))
      : `<non-string slug of type ${typeof n}>`;
  logForDebugging(`${e}: refusing invalid plan slug ${r}`, {
    level: "error",
  });
}
//@ chunk-82kqcve8.js:189119-189227 facade-exports
function setPlanSlug(e, n) {
  if (!isValidPlanFileName(n)) {
    logInvalidPlanSlug("setPlanSlug", n);
    return;
  }
  getPlanSlugCache().set(e, n);
  planFiles().exemptSlugFromRevalidation(e, n);
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
      let s = resolve(cwd, plansDirectory);
      if (isPathWithinProjectRoot(s, cwd)) return s;
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
//@ chunk-82kqcve8.js:189579-189704 facade-exports = reset (0.777)
var PLANS_DIRECTORY_PER_HOST = new HostScoped(() => new PlansDirectoryResolver());
var getPlansDirectory = Object.assign(
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
//@ chunk-82kqcve8.js:189704-189951 layout
/**
 * 判断路径位于项目根之内：前缀匹配、不含危险形式、不经过 UNC 连接点，并逐级向上找到真实路径确认仍在根的真实路径之下。
 */
function isPathWithinProjectRoot(e, cwd) {
  if (e !== cwd && !e.startsWith(cwd + sep)) return false;
  if (hasBackslash(e)) return false;
  if (findIntermediateUncJunction(getFsImplementation(), e) !== undefined) return false;
  let rootReal = nativeRealpathLong(cwd);
  if (rootReal === null) return false;
  let current = e;
  for (;;) {
    let currentReal = nativeRealpathLong(current);
    if (currentReal !== null) return currentReal === rootReal || currentReal.startsWith(rootReal + sep);
    let parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}
//@ chunk-82kqcve8.js:189951-190106 layout
async function ensurePlansDirectory(e) {
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
async function saveRejectedUltraplan(e, n) {
  if (n && isUsingGlobalPlansDir()) {
    let s = `${generateWordSlug()}-ultraplan`;
    let h = join(await ensurePlansDirectory(n), `${s}.md`);
    let y = await n.write(planStorageSpace(s), e, DEFAULT_PLAN_FILE_STATE);
    if (!y.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `saveRejectedUltraplan: v5 write failed: ${y.error.code}`,
        "saveRejectedUltraplan: v5 write failed",
      );
    return h;
  }
  if (isDiskless()) {
    warnDisklessSettingsWrite("rejected_ultraplan", getPlansDirectory());
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Cannot save the plan: this session does not write to disk",
    );
  }
  let r = join(await ensurePlansDirectory(), `${generateWordSlug()}-ultraplan.md`);
  await getFileReader().write(r, e);
  return r;
}
//@ chunk-82kqcve8.js:190541-190888 facade-exports
async function persistPlanEdit(filePath, inputPlan, storageV5) {
  try {
    await ensurePlansDirectory(storageV5);
    let s = basename(filePath, ".md");
    let h =
      storageV5 !== undefined &&
      isUsingGlobalPlansDir() &&
      dirname(filePath) === getPlansDirectory() &&
      validateStorageKey(planStorageSpace(s)) === undefined
        ? planStorageSpace(s)
        : undefined;
    if (storageV5 !== undefined && h !== undefined) {
      let y = await storageV5.write(h, inputPlan, DEFAULT_PLAN_FILE_STATE);
      if (!y.ok) {
        reportPlanPersistFailure(filePath, y.error.code);
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
function reportPlanPersistFailure(e, n) {
  notePlanFileForgotten(e);
  logForDebugging(`Failed to persist plan to ${e}: ${n}`, {
    level: "error",
  });
}
//@ chunk-82kqcve8.js:190969-191099 facade-exports = getPlanFilePath (0.856)
function getPlanFilePath(agentId) {
  let sessionId = getSessionId();
  let planSlug = getPlanSlug(sessionId);
  planFiles().markPlanPathServed(sessionId);
  if (!agentId) return join(getPlansDirectory(), `${planSlug}.md`);
  return join(getPlansDirectory(), `${planSlug}-agent-${agentId}.md`);
}
//@ chunk-82kqcve8.js:191099-191298 layout
async function readPlanViaStorage(e, n, r) {
  let s = await e.read([planStorageSpace(n)]);
  if (!s.ok) {
    logForDebugging(`${r}: v5 read failed: ${s.error.code}`);
    return null;
  }
  let h = s.value.items[0];
  return h.found ? Buffer.from(h.value).toString("utf-8") : null;
}
//@ chunk-82kqcve8.js:191298-191465 facade-exports
function getPlan(e) {
  let planFilePath = getPlanFilePath(e);
  let planFileCache = planFiles().planFileCache;
  if (planFileCache !== null && isUsingGlobalPlansDir()) {
    if (e) planFiles().watchAgentPlanFile(getPlanSlug(getSessionId()), basename(planFilePath));
    let s = planFileCache.get(basename(planFilePath));
    if (s !== undefined) return s;
  }
  return readPlanFileSync(planFilePath);
}
//@ chunk-82kqcve8.js:191465-191649 facade-exports
async function getPlanAsync(e, storageV5) {
  if (storageV5 === undefined || !isUsingGlobalPlansDir()) return getPlan(e);
  let planFileName = getPlanFileName(e);
  await planFiles().settlePlanFile(planFileName);
  let s = planFiles().planFileCache?.get(planFileName);
  if (s !== undefined) return s;
  return readPlanViaStorage(storageV5, stripMdExtension(planFileName), "getPlan");
}
//@ chunk-82kqcve8.js:191649-191758 layout
function getPlanFileName(e) {
  let n = basename(getPlanFilePath(e));
  let r = planFiles();
  if (e && r.planFileCache !== null) r.watchAgentPlanFile(getPlanSlug(getSessionId()), n);
  return n;
}
//@ chunk-82kqcve8.js:191758-191966 facade-exports
async function planExistsAsync(agentId, storageV5) {
  if (storageV5 === undefined || !isUsingGlobalPlansDir()) return getPlan(agentId) !== null;
  let planFileName = getPlanFileName(agentId);
  await planFiles().settlePlanFile(planFileName);
  let s = planFiles().planFileCache?.get(planFileName);
  if (s !== undefined) return s !== null;
  return (await storageV5.statMeta(planStorageSpace(stripMdExtension(planFileName)))).ok;
}
//@ chunk-82kqcve8.js:191966-192261 facade-exports
async function readPlanFileFresh(e) {
  let planFilePath = getPlanFilePath();
  if (isStorageV5Enabled() && e !== undefined && isUsingGlobalPlansDir()) {
    let r = basename(planFilePath);
    let s = planFiles();
    let h = s.planFileWatches.get(r);
    if (h !== undefined) {
      if (!(await raceWithTimeout(s.refreshPlanFile(r, h), s.waitCapMs))) s.giveUpWaiting(r, h);
      let y = s.planFileCache?.get(r);
      if (y !== undefined) return y;
    }
    return readPlanViaStorage(e, stripMdExtension(r), "readPlanFileFresh");
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
  let n;
  let r;
  for (let message of log.messages) {
    let slug = message.slug;
    if (!slug || slug === n) continue;
    if (isValidPlanFileName(slug)) n = slug;
    else r ??= slug;
  }
  if (n === undefined && r !== undefined) logInvalidPlanSlug("getSlugFromLog", r);
  return n;
}
//@ chunk-82kqcve8.js:192620-193494 facade-exports = copyPlanForResume (0.822)
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
//@ chunk-82kqcve8.js:193494-194413 layout = copyPlanForResume (0.785)
async function copyPlanForResume_2(e, log, slug) {
  let s = `${slug}.md`;
  let h = planFiles().observePlanFile(s);
  let y = await e.read([planStorageSpace(slug)]);
  if (!y.ok) {
    logForDebugging(`copyPlanForResume: v5 read failed for ${slug}: ${y.error.code}`);
    return false;
  }
  let w = y.value.items[0];
  planFiles().notePlanFileObserved(s, w?.found ? Buffer.from(w.value).toString("utf-8") : null, h);
  if (w?.found) return true;
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
    let O = join(getPlansDirectory(), s);
    let P = false;
    try {
      await ensurePlansDirectory(e);
      let L = await e.write(planStorageSpace(slug), recovered, DEFAULT_PLAN_FILE_STATE);
      if (!L.ok) {
        logForDebugging(`Plan recovery write failed for ${slug}: ${L.error.code}`);
        return false;
      }
      P = true;
      return true;
    } finally {
      if (P) notePlanFileWritten(O, recovered);
      else notePlanFileForgotten(O);
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
  let y = join(plansDir, `${originalSlug}.md`);
  let planSlug = getPlanSlug(targetSessionId);
  let S = join(plansDir, `${planSlug}.md`);
  planFiles().exemptSlugFromRevalidation(targetSessionId, planSlug);
  if (storageV5 && isUsingGlobalPlansDir())
    return copyPlanForForkViaStorage(storageV5, originalSlug, planSlug).catch((error) => {
      logError(error);
      return false;
    });
  await ensurePlansDirectory();
  try {
    if (isDiskless()) return false;
    await getFileReader().copy(y, S);
    return true;
  } catch (error) {
    if (isENOENT(error)) return false;
    if (isFsInaccessible(error)) {
      logForDebugging(`copyPlanForFork: copy failed for ${y}: ${error}`);
      return false;
    }
    logError(error);
    return false;
  } finally {
    notePlanFileForgotten(S);
  }
}
//@ chunk-82kqcve8.js:194795-195246 layout
async function copyPlanForForkViaStorage(e, planName, planSlug) {
  let s = join(getPlansDirectory(), `${planSlug}.md`);
  let h;
  try {
    await ensurePlansDirectory(e);
    let y = await e.read([planStorageSpace(planName)]);
    if (!y.ok) {
      logForDebugging(`copyPlanForFork: v5 read failed for ${planName}: ${y.error.code}`);
      return false;
    }
    if (!y.value.items[0].found) return false;
    let w = y.value.items[0].value;
    let S = await e.write(planStorageSpace(planSlug), w, await getPlanFileState(planName));
    if (!S.ok) {
      logForDebugging(`copyPlanForFork: v5 write failed for ${planSlug}: ${S.error.code}`);
      return false;
    }
    h = Buffer.from(w).toString("utf-8");
    return true;
  } finally {
    if (h !== undefined) notePlanFileWritten(s, h);
    else notePlanFileForgotten(s);
  }
}
//@ chunk-82kqcve8.js:195246-195811 fingerprint = recoverPlanFromMessages (1)
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
//@ chunk-82kqcve8.js:195811-196201 fingerprint = findFileSnapshotEntry (0.924)
function findFileSnapshotEntry(messages, key) {
  let r = [...messages.messages, ...(messages.fileSnapshots ?? [])];
  for (let i = r.length - 1; i >= 0; i--) {
    let msg = r[i];
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
function isValidPlanContent(e) {
  return typeof e === "string" && e.length > 0 && e.length <= PLAN_SNAPSHOT_MAX_CHARS;
}
//@ chunk-82kqcve8.js:237342-237506 fingerprint = getPlanFilePath (1)
/**
 * 计划文件路径：<计划目录>/<slug>.md，子代理为 <slug>-agent-<id>.md。
 */
function getPlanFilePath_2(agentId) {
  let n = peekPlanSlug();
  if (!n) return false;
  let planSlug = normalize(agentId);
  if (dirname(planSlug) !== normalize(getPlansDirectory())) return false;
  let s = basename(planSlug);
  return s === `${n}.md` || (s.startsWith(`${n}-agent-`) && s.endsWith(".md"));
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
function hostOwnedInputFieldSet(e, n) {
  return isDisklessSession() && !Object.hasOwn(n, "planFilePath")
    ? undefined
    : API_STRIPPED_INPUT_FIELDS.get(e);
}
//@ chunk-e6aww6q8.js:1501827-1502265 fingerprint = persistFileSnapshotIfRemote (0.807)
async function persistFileSnapshotIfRemote(e) {
  if (getEnvironmentKind() === null) return;
  try {
    let snapshotFiles = [];
    let plan = await readPlanFileFresh(e);
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
    await recordTranscript([message], undefined, undefined, undefined, e);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1502265-1502377 affinity
function getPlanWithPath(e) {
  if (isDisklessSession()) return null;
  let planFilePath = getPlanFilePath(e);
  notePlanFileForgotten(planFilePath);
  let plan = getPlan(e);
  return plan !== null
    ? {
        plan,
        planFilePath,
      }
    : null;
}
//@ chunk-e6aww6q8.js:4329866-4330013 fingerprint = getPlan (1)
function getPlan_2() {
  if (isDiskless()) return null;
  let fsImplementation = getFsImplementation();
  let installedPluginsFilePath = getInstalledPluginsFilePath();
  let r;
  try {
    r = fsImplementation.readFileSync(installedPluginsFilePath, {
      encoding: "utf-8",
    });
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
  return parseInstalledPluginsJson(r);
}
//@ chunk-q8cqcff6.js:21468-21656 fingerprint = getPlanSlug (0.574)
function getPlanSlug_2() {
  if (getPlatform() !== "windows") return null;
  for (let e of POWERSHELL_EXE_CANDIDATES) {
    let n = realpathCacheEntry(e);
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
};
