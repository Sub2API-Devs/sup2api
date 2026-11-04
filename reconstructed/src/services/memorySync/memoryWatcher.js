/**
 * services/memorySync/memoryWatcher.ts
 *
 * 记忆目录监听与同步触发（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (13)
 * attribution: placement 13
 */
import { relative, sep, join, isAbsolute } from "path";
import { mkdir, stat, rm } from "fs/promises";
import { getAutoMemPath, getAutoMemPathState } from "../../memdir/paths.js";
import {
  normalizeKeySegment,
  isExcludedMemoryKey,
  isMemoryDocumentKey,
  isMemoryDocumentKey_2,
} from "../memoryStore/memoryKeys.js";
import {
  isMultiStoreSyncAvailable,
  memorySyncAvailability,
  memorySyncAwaitsVerdict,
  memorySyncClosedByPolicy,
  isOrgMemoryReadEnabled,
} from "./availability.js";
import {
  isUsableSuppressedReason,
  getMemoryPushDeleteMode,
  detectMassDelete,
  canPushStore,
  isStoreSuppressed,
  PUSH_TIMEOUT_MS,
  MAX_MEMORY_BYTES,
} from "./syncConfig.js";
import { MEMORY_SYNC_DIR } from "../orgMemory/storeErrors.js";
import { isHashTempFile } from "./syncFiles.js";
import { OrgMemoryMirrorNotices, quoteStoreName, MEMORY_SYNC_REJECT_TEXTS } from "./syncNotices.js";
import { loadMemoryStoreSkills, enqueueMemorySkillLoad } from "./memorySkills.js";
import {
  syncTeamMemoryOnce,
  getMemoryStoreResyncIntervalMs,
  runSyncCycleWithReport,
} from "./multiStoreSync.js";
import { logEvent } from "../analytics/index.js";
import { sanitizedMachineReasonForTelemetry, errorMessage, getErrnoCode } from "../../utils/errors.js";
import { getStoreKindTelemetry, parseMemoryStoresEnv } from "../orgMemory/memoryStores.js";
import { logForDebugging } from "../../utils/debug.js";
import { noteStorePulls, settleFirstStorePull } from "../orgMemory/storePulls.js";
import { escapeForTag } from "../../utils/sanitization.js";
import { chokidar_default } from "../../../vendor/chokidar/index.js";
import { isDiskless, getRootSession } from "../../bootstrap/state.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { env } from "../../utils/env.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { discoverOrgMemoryStoresForDecision, isSelectionMounted } from "../orgMemory/discovery.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { createMultiStoreState } from "./syncManifest.js";
import { createStoreClients } from "../orgMemory/storeApi.js";
import { memoryIndexDirPrefix } from "../../memdir/memdir.js";
import { recordPhase, getRecordedPhase } from "../../utils/startupTiming.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { getMemoryDirNfc, checkPathInTeamMemDir } from "../../memdir/teamMemPaths.js";
import { onPolicyVerdictHeldStart } from "../policyLimits/policyState.js";
import { invalidateMemorySections } from "../../utils/focusMode.js";
import { projectKeyFromMemoryDir } from "../../memdir/teamMemPrompts.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import {
  getOrgMemoryDecision,
  grantedModeFor,
  isOrgMemoryWriteOptedIn,
} from "../orgMemory/orgMemoryDecision.js";
import { formatFileSize } from "../../utils/format.js";
import { withTimeout } from "../../utils/sleep.js";
import { getOrgMemoryAuthorization } from "../orgMemory/credential.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:173260-173312 placement
/**
 * 轮询间隔（2000 毫秒）。
 */
var DEBOUNCE_MS = 2000;
var MAX_RECORDS_IN_LIST = 10;
var FS_EVENT_DEBOUNCE_MS = 1500;
var IS_BUN_RUNTIME = typeof Bun !== "undefined";
var POLL_INTERVAL_MS = 2000;
//@ chunk-s61vbvea.js:173312-173525 placement
function createWatcherState() {
  return {
    debounceTimer: null,
    pushInProgress: false,
    hasPendingChanges: false,
    changeSeq: 0,
    currentPushPromise: null,
    lastSyncCompletedAt: null,
    offRetries: 0,
    offRetryJitterMs: backoffJitterMs(),
    backoffRetryAtMs: null,
    backoffWakes: 0,
  };
}
//@ chunk-s61vbvea.js:173525-173625 placement
var DEBOUNCE_MS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_OFF_RETRIES;
var BACKOFF_FACTOR;
var MIN_BACKOFF_MINUTES;
var MAX_BACKOFF_MINUTES;
var OFF_RETRY_JITTER_MS;
var PERMANENT_FAILURE_CODES;
deferInit("chunk-s61vbvea.js:173525", () => {
  DEBOUNCE_MS_2 = 1000;
  MAX_OFF_RETRIES = 10;
  BACKOFF_FACTOR = 2;
  MIN_BACKOFF_MINUTES = 1;
  MAX_BACKOFF_MINUTES = 60;
  OFF_RETRY_JITTER_MS = 5000;
  PERMANENT_FAILURE_CODES = {
    team: new Set(["http_413", "store_full"]),
    user: new Set(),
  };
});
//@ chunk-s61vbvea.js:173625-173662 placement
/**
 * 判断某类失败码是否为永久失败。
 */
function isPermanentFailureCode(scope, suppressedReason) {
  return PERMANENT_FAILURE_CODES[scope].has(suppressedReason);
}
//@ chunk-s61vbvea.js:173662-173847 placement = isTeamSubscriber (1)
function isTeamSubscriber(path) {
  let autoMemPath = getAutoMemPath();
  let replaced = relative(autoMemPath, path).replaceAll(sep, "/");
  if (replaced === "" || replaced.startsWith("..")) return null;
  let parts = replaced.split("/");
  if (normalizeKeySegment(parts[0]) === "team") return "team";
  if (isExcludedMemoryKey(replaced)) return null;
  return "user";
}
//@ chunk-s61vbvea.js:173847-173874 placement
/**
 * 多存储同步是否可用。
 */
function isMultiStoreSyncOn() {
  return isMultiStoreSyncAvailable();
}
//@ chunk-s61vbvea.js:173874-173936 placement
/**
 * 是否有存储因依据不可用而失效。
 */
function hasUnusableStore(storeState) {
  return storeState.stores.some((store) => isUsableSuppressedReason(store.basisUnusable));
}
//@ chunk-s61vbvea.js:173936-173980 placement
/**
 * 计算退避抖动毫秒数。
 */
function backoffJitterMs() {
  return Math.random() * BACKOFF_FACTOR * 60000;
}
//@ chunk-s61vbvea.js:173980-174404 placement
/**
 * 记忆同步失败代码的合法取值正则（无 OAuth、HTTP 状态、团队记忆限制、挂载目录问题、内容被拒等）。
 */
var SYNC_FAILURE_CODE_RE =
  /^(no_oauth|server_unavailable|http_\d{3}|team_memory_(too_many_entries|entry_too_large|group_acl_denied|group_acl_unconfigured|feature_unavailable)|mount_dir_(foreign_partition|unmanifested_nonempty|unreadable)|malformed_response|list_page_limit|store_full|content_too_large|content_secret|content_screened|index_too_large|invalid_path|store_archived|auth|forbidden|timeout|network|conflict|parse|aborted|unknown)$/;
//@ chunk-s61vbvea.js:174404-174663 placement
/**
 * 判断记忆目录中的路径是否应被同步忽略：临时/暂存文件、team 下的特定前缀，及其他被排除的键。
 */
function isIgnoredMemoryPath(filePath, options = {}) {
  let replaced = relative(getAutoMemPath(), filePath).replaceAll(sep, "/");
  if (replaced === "" || replaced.startsWith("..")) return false;
  let parts = replaced.split("/");
  let fileName = parts.at(-1);
  if (options.stats?.isFile() === true && isMemoryDocumentKey(fileName)) return true;
  if (normalizeKeySegment(parts[0]) === "team")
    return (
      fileName.startsWith(MEMORY_SYNC_DIR) || (options.backendStaging === true && isHashTempFile(fileName))
    );
  return isExcludedMemoryKey(replaced);
}
//@ chunk-s61vbvea.js:174663-198608 placement
/**
 * 记忆目录监听器：触发团队/多库同步、推送抑制、失败后暂停
 */
class MemoryWatcher {
  watcher = null;
  started = false;
  notices = new OrgMemoryMirrorNotices();
  resyncTimer = null;
  deleteConfirmTimers = {
    team: null,
    user: null,
  };
  scopeStates = {
    team: createWatcherState(),
    user: createWatcherState(),
  };
  multiStoreState = null;
  userMultiStoreState = null;
  storeSkillConfigs = null;
  orgWriteNoticeShown = new Set();
  storageV5 = undefined;
  credentials = undefined;
  stopAwaitingPolicyVerdict = null;
  firstStorePullOwed = false;
  firstStartAtMs = null;
  startHeldByPolicy = false;
  reset(options) {
    this.watcher = null;
    this.storeSkillConfigs = options?.storeSkillConfigs ?? null;
    this.storageV5 = options?.storageV5;
    this.credentials = options?.credentials;
    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
    this.orgWriteNoticeShown.clear();
    this.clearDeleteConfirmTimers();
    this.clearPolicyVerdictWait();
    this.firstStartAtMs = null;
    this.startHeldByPolicy = false;
    this.started = options?.skipWatcher ?? false;
    this.multiStoreState = options?.multiStoreState ?? null;
    this.userMultiStoreState = options?.userMultiStoreState ?? null;
    this.scopeStates.team = createWatcherState();
    this.scopeStates.team.lastSyncCompletedAt = options?.teamLastSyncCompletedAt ?? null;
    this.scopeStates.user = createWatcherState();
    this.scopeStates.user.lastSyncCompletedAt = options?.userLastSyncCompletedAt ?? null;
  }
  refreshStoreSkills() {
    if (this.storeSkillConfigs === null) return;
    loadMemoryStoreSkills(
      this.storeSkillConfigs,
      [...(this.multiStoreState?.stores ?? []), ...(this.userMultiStoreState?.stores ?? [])],
      this.storageV5,
    );
  }
  async executePush(scope, trigger = "watch") {
    let scopeState = this.scopeStates[scope];
    let storeState = scope === "team" ? this.multiStoreState : this.userMultiStoreState;
    if (!storeState) return;
    scopeState.pushInProgress = true;
    scopeState.backoffRetryAtMs = null;
    let changeSeq = scopeState.changeSeq;
    try {
      let stores = storeState.stores;
      let suppressedMounts = new Set(
        stores.filter((store) => store.suppressedReason !== null).map((store) => store.mountName),
      );
      let syncResult = await syncTeamMemoryOnce(storeState, trigger, this.storageV5, scopeState.offRetries);
      this.refreshStoreSkills();
      this.enqueueUnsavedReadOnlyNotices(storeState, syncResult);
      let values = Object.values(syncResult.pushes);
      let any = values.some((push) => !push.success);
      let any_2 = stores.some((store) => store.suppressedReason !== null);
      let any_3 = stores.some((store) => syncResult.pushes[store.mountName]?.backedOff === true);
      if (!any && !any_2 && !any_3 && scopeState.changeSeq === changeSeq)
        scopeState.hasPendingChanges = false;
      this.noteBackoffWake(scopeState, stores, syncResult);
      if (scope === "team") {
        for (let store of stores)
          if (store.suppressedReason !== null && !suppressedMounts.has(store.mountName))
            logEvent("tengu_team_mem_push_suppressed", {
              reason: sanitizedMachineReasonForTelemetry(store.suppressedReason),
              multistore: true,
              mount: getStoreKindTelemetry(store.mountName),
              consecutive_failures: store.consecutivePermanentFailures,
              expiring: (store.suppressedUntilMs ?? null) !== null,
            });
      }
      if (
        getMemoryPushDeleteMode() === "corroborate" &&
        values.some((push) => (push.deletesDeferred ?? 0) > 0)
      )
        this.armDeleteConfirmTimer(scope);
    } catch (error) {
      logForDebugging(`memory-watcher[${scope}]: multi-store sync error: ${errorMessage(error)}`, {
        level: "warn",
      });
    } finally {
      noteStorePulls(storeState.stores);
      scopeState.lastSyncCompletedAt = Date.now();
      scopeState.pushInProgress = false;
      scopeState.currentPushPromise = null;
      this.armResyncTimer();
    }
  }
  massDeleteHoldExposure(scope) {
    return detectMassDelete(
      [...(this.multiStoreState?.stores ?? []), ...(this.userMultiStoreState?.stores ?? [])],
      scope,
      this.storageV5,
    );
  }
  enqueueUnsavedReadOnlyNotices(storeState, syncResult) {
    for (let store of storeState.stores) {
      let unsavedReadOnlyPaths = syncResult.pushes[store.mountName]?.unsavedReadOnlyPaths ?? [];
      if (unsavedReadOnlyPaths.length === 0) continue;
      let sliced = unsavedReadOnlyPaths.slice(0, MAX_RECORDS_IN_LIST);
      let leftOutCount = unsavedReadOnlyPaths.length - sliced.length;
      let remedy = this.writableDirsRemedy(store);
      enqueueMemorySkillLoad(
        `${unsavedReadOnlyPaths.length} file(s) under ${escapeForTag(store.mountDir)} were NOT saved to shared memory: that store is read-only in this session, so they exist only in this machine's local copy, are not visible to other sessions or people, and are discarded when a hosted session ends: ${sliced.map(quoteStoreName).join(", ")}${leftOutCount > 0 ? ` (+${leftOutCount} more)` : ""}. ` +
          (remedy !== null
            ? `To keep content you wrote, ${remedy}. If you told the user this was saved or remembered, tell them plainly that it was not shared and where you re-saved it (describe the memory location in plain terms, not as a filesystem path).`
            : "There is no writable memory store in this session. If you told the user this was saved or remembered, tell them plainly that it was not."),
      );
    }
  }
  writableDirsRemedy(store) {
    let mapped = [this.multiStoreState, this.userMultiStoreState]
      .flatMap((state) => state?.stores ?? [])
      .filter(
        (candidateStore) =>
          (store.scope === "team" || candidateStore.scope === "user") &&
          canPushStore(candidateStore) &&
          !isStoreSuppressed(candidateStore),
      )
      .sort((left, right) => +(right.scope === store.scope) - +(left.scope === store.scope))
      .map((store) => escapeForTag(join(store.mountDir, store.writeDir ?? "")));
    if (mapped.length === 0) return null;
    let ownDir = escapeForTag(store.mountDir);
    let any = mapped.some((dir) => {
      let relPath = relative(dir, ownDir);
      return relPath === "" || (!relPath.startsWith("..") && !isAbsolute(relPath));
    });
    return `save it under ${mapped.join(" or ")} instead${any ? ` (anywhere except under ${ownDir})` : ""}`;
  }
  schedulePush(scope) {
    let scopeState = this.scopeStates[scope];
    scopeState.hasPendingChanges = true;
    scopeState.changeSeq++;
    if (scopeState.debounceTimer) clearTimeout(scopeState.debounceTimer);
    scopeState.debounceTimer = setTimeout((scope) => this.firePush(scope), DEBOUNCE_MS, scope);
  }
  armDeleteConfirmTimer(scope) {
    if (this.deleteConfirmTimers[scope]) return;
    let timer = setTimeout(
      (scope) => {
        this.deleteConfirmTimers[scope] = null;
        this.schedulePush(scope);
      },
      PUSH_TIMEOUT_MS + OFF_RETRY_JITTER_MS,
      scope,
    );
    timer.unref?.();
    this.deleteConfirmTimers[scope] = timer;
  }
  clearDeleteConfirmTimers() {
    for (let scope of ["team", "user"]) {
      let timer = this.deleteConfirmTimers[scope];
      if (timer) {
        clearTimeout(timer);
        this.deleteConfirmTimers[scope] = null;
      }
    }
  }
  firePush(scope) {
    let scopeState = this.scopeStates[scope];
    if (!isMultiStoreSyncOn()) {
      if (scopeState.debounceTimer) {
        clearTimeout(scopeState.debounceTimer);
        scopeState.debounceTimer = null;
      }
      logForDebugging(`memory-watcher[${scope}]: sync disabled mid-session \u2014 pausing (reversible)`, {
        level: "info",
      });
      return;
    }
    if (scopeState.pushInProgress) {
      this.schedulePush(scope);
      return;
    }
    if (!scopeState.hasPendingChanges) return;
    scopeState.currentPushPromise = this.executePush(scope);
  }
  maybeResyncStaleStores() {
    try {
      if (!this.started) return;
      let memoryStoreResyncIntervalMs = getMemoryStoreResyncIntervalMs();
      let now = Date.now();
      for (let scope of ["team", "user"]) {
        let storeState = scope === "team" ? this.multiStoreState : this.userMultiStoreState;
        if (!storeState) continue;
        let scopeState = this.scopeStates[scope];
        if (scopeState.pushInProgress || scopeState.lastSyncCompletedAt === null) continue;
        let stale =
          memoryStoreResyncIntervalMs > 0 &&
          now - scopeState.lastSyncCompletedAt >
            this.resyncIntervalFor(scopeState, storeState, memoryStoreResyncIntervalMs);
        let backoffDue = scopeState.backoffRetryAtMs !== null && now >= scopeState.backoffRetryAtMs;
        if (!stale && !backoffDue) continue;
        if (!isMultiStoreSyncOn()) continue;
        let trigger;
        if (stale && hasUnusableStore(storeState)) {
          scopeState.offRetries++;
          scopeState.offRetryJitterMs = backoffJitterMs();
          trigger = "off_retry";
        } else if (stale) trigger = "periodic";
        else {
          scopeState.backoffWakes++;
          trigger = "backoff_retry";
        }
        scopeState.currentPushPromise = this.executePush(scope, trigger);
      }
    } catch (error) {
      logForDebugging(`memory-watcher: stale-store check failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  }
  armResyncTimer() {
    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
    if (!this.started) return;
    for (let scope of ["team", "user"]) {
      let storeState = scope === "team" ? this.multiStoreState : this.userMultiStoreState;
      if (storeState && !hasUnusableStore(storeState)) {
        let scopeState = this.scopeStates[scope];
        scopeState.offRetries = 0;
        scopeState.offRetryJitterMs = backoffJitterMs();
      }
    }
    let memoryStoreResyncIntervalMs = getMemoryStoreResyncIntervalMs();
    let now = Date.now();
    let nextAt = null;
    for (let scope of ["team", "user"]) {
      let storeState = scope === "team" ? this.multiStoreState : this.userMultiStoreState;
      if (!storeState) continue;
      let scopeState = this.scopeStates[scope];
      if (scopeState.pushInProgress || scopeState.lastSyncCompletedAt === null) continue;
      let syncOn = isMultiStoreSyncOn();
      if (memoryStoreResyncIntervalMs > 0) {
        let resyncAt = syncOn
          ? scopeState.lastSyncCompletedAt +
            this.resyncIntervalFor(scopeState, storeState, memoryStoreResyncIntervalMs)
          : now + memoryStoreResyncIntervalMs;
        if (nextAt === null || resyncAt < nextAt) nextAt = resyncAt;
      }
      if (syncOn && scopeState.backoffRetryAtMs !== null) {
        if (nextAt === null || scopeState.backoffRetryAtMs < nextAt) nextAt = scopeState.backoffRetryAtMs;
      }
    }
    if (nextAt === null) return;
    let max = Math.max(nextAt - now, DEBOUNCE_MS_2);
    let timer = setTimeout(() => {
      this.resyncTimer = null;
      this.maybeResyncStaleStores();
      this.armResyncTimer();
    }, max);
    timer.unref?.();
    this.resyncTimer = timer;
  }
  resyncIntervalFor(scopeState, storeState, baseIntervalMs) {
    if (!hasUnusableStore(storeState)) return baseIntervalMs;
    let backoffMs = MAX_OFF_RETRIES * 60000 * 2 ** scopeState.offRetries;
    return Math.min(baseIntervalMs, backoffMs + scopeState.offRetryJitterMs);
  }
  noteBackoffWake(scopeState, stores, syncResult) {
    let now = Date.now();
    let retryAt = null;
    for (let store of stores) {
      let pull = syncResult.pulls[store.mountName];
      let push = syncResult.pushes[store.mountName];
      if (pull?.backedOff !== true && push?.backedOff !== true) continue;
      if (!(
        !store.pulled ||
        (store.downloadsDeferred ?? 0) > 0 ||
        scopeState.hasPendingChanges ||
        (push?.backedOff === true && push.skipped !== true)
      ))
        continue;
      let serverBackoffUntilMs = store.serverBackoffUntilMs ?? now;
      if (retryAt === null || serverBackoffUntilMs < retryAt) retryAt = serverBackoffUntilMs;
    }
    if (retryAt === null) {
      scopeState.backoffRetryAtMs = null;
      scopeState.backoffWakes = 0;
      return;
    }
    let extraDelayMs =
      scopeState.backoffWakes === 0
        ? 0
        : Math.min(MIN_BACKOFF_MINUTES * 2 ** (scopeState.backoffWakes - 1), MAX_BACKOFF_MINUTES) * 60000;
    scopeState.backoffRetryAtMs = Math.max(retryAt, now + extraDelayMs) + backoffJitterMs();
  }
  scopeActive(scope) {
    return scope === "team" ? this.multiStoreState !== null : this.userMultiStoreState !== null;
  }
  async startFileWatcher(dir) {
    if (this.started) return;
    this.started = true;
    await mkdir(dir, {
      recursive: true,
    }).catch((error) =>
      logForDebugging(`memory-watcher: mkdir ${dir} failed: ${errorMessage(error)}`, {
        level: "warn",
      }),
    );
    let onShownChange = (changedPath) => {
      let scope = isTeamSubscriber(changedPath);
      if (scope === null || !this.scopeActive(scope)) return;
      this.schedulePush(scope);
    };
    let onRemoved = (removedPath) => {
      let scope = isTeamSubscriber(removedPath);
      if (scope === null || !this.scopeActive(scope)) return;
      let storeState = scope === "team" ? this.multiStoreState : this.userMultiStoreState;
      for (let store of storeState?.stores ?? [])
        if (store.suppressedReason !== null && isPermanentFailureCode(scope, store.suppressedReason)) {
          logForDebugging(
            `memory-watcher[${scope}]: unlink cleared store suppression for ${store.mountName} (was: ${store.suppressedReason})`,
            {
              level: "info",
            },
          );
          store.recoveryUnconfirmedReason = store.suppressedReason;
          store.suppressedReason = null;
          store.suppressedUntilMs = null;
          store.consecutivePermanentFailures = 0;
        }
      this.schedulePush(scope);
    };
    this.watcher = chokidar_default.watch(dir, {
      persistent: true,
      ignoreInitial: true,
      usePolling: IS_BUN_RUNTIME,
      interval: POLL_INTERVAL_MS,
      ignorePermissionErrors: true,
      ignored: (watchedPath, stats) =>
        isIgnoredMemoryPath(watchedPath, {
          backendStaging: this.storageV5 !== undefined,
          stats,
        }),
    });
    this.watcher.on("add", onShownChange);
    this.watcher.on("change", onShownChange);
    this.watcher.on("unlink", onRemoved);
    this.watcher.on("error", (error) => {
      logForDebugging(`memory-watcher: watcher error: ${errorMessage(error)}`, {
        level: "warn",
      });
    });
    logForDebugging(`memory-watcher: watching ${dir}`, {
      level: "debug",
    });
    this.armResyncTimer();
  }
  async start(storageV5, credentials) {
    this.storageV5 = storageV5;
    this.credentials = credentials;
    if (isDiskless()) return;
    if (!checkHasTrustDialogAccepted()) return;
    switch (((this.firstStartAtMs ??= Date.now()), memorySyncAvailability())) {
      case "closed":
        if (memorySyncAwaitsVerdict()) {
          this.startHeldByPolicy = true;
          this.awaitPolicyVerdictThenStart();
        }
        if (env.CLAUDE_MEMORY_STORES && memorySyncClosedByPolicy())
          logFeatureSad(
            "team_memory_sync_watcher_start",
            memorySyncAwaitsVerdict() ? "policy_closed_without_verdict" : "policy_denied",
          );
        return;
      case "held":
        this.firstStorePullOwed = true;
        this.startHeldByPolicy = true;
        this.awaitPolicyVerdictThenStart();
        return;
      case "open":
        break;
    }
    if (!env.CLAUDE_MEMORY_STORES) {
      logEvent("tengu_org_memory_connected_mode", {
        active: isOrgMemoryReadEnabled(),
      });
      let discovered = await discoverOrgMemoryStoresForDecision(this.storageV5, this.credentials).catch(
        (error) => {
          logForDebugging(`memory-watcher: org-memory discovery rejected: ${errorMessage(error)}`);
          return null;
        },
      );
      if (discovered !== null && isSelectionMounted(discovered))
        logFeatureOk("org_memory_picker", {
          mounted: true,
        });
      return;
    }
    let mountEntries = null;
    try {
      mountEntries = parseMemoryStoresEnv();
    } catch (error) {
      logForDebugging(
        `memory-watcher: CLAUDE_MEMORY_STORES invalid, disabling sync: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      logEvent("tengu_team_mem_multistore_config_invalid", {
        ...errorTelemetryFields(error),
      });
      logFeatureBad("team_memory_sync_watcher_start", "config_invalid");
      return;
    }
    registerCleanup(async () => this.stop());
    if (mountEntries === null) return;
    let stores = mountEntries.filter((entry) => entry.scope === "team");
    let stores_2 = mountEntries.filter((entry) => entry.scope === "user");
    if (stores.length > 0)
      this.multiStoreState = createMultiStoreState(
        createStoreClients(stores),
        stores.map((entry) => ({
          mount: entry.mount,
          scope: entry.scope,
          source: "env",
          writeDir: memoryIndexDirPrefix(entry.promptIndex),
        })),
        this.notices,
        this.firstStartAtMs,
      );
    if (stores_2.length > 0)
      this.userMultiStoreState = createMultiStoreState(
        createStoreClients(stores_2),
        stores_2.map((entry) => ({
          mount: entry.mount,
          scope: entry.scope,
          source: "env",
        })),
        this.notices,
        this.firstStartAtMs,
      );
    let startScope = async (scope, storeState) => {
      if (!storeState) return;
      let scopeState = this.scopeStates[scope];
      scopeState.pushInProgress = true;
      let syncPromise = syncTeamMemoryOnce(storeState, "startup", this.storageV5);
      scopeState.currentPushPromise = syncPromise
        .then(() => {
          return;
        })
        .catch(() => {
          return;
        });
      try {
        let syncResult = await syncPromise;
        this.enqueueUnsavedReadOnlyNotices(storeState, syncResult);
        this.noteBackoffWake(scopeState, storeState.stores, syncResult);
      } catch (error) {
        logForDebugging(`memory-watcher[${scope}]: multi-store initial sync failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      } finally {
        noteStorePulls(storeState.stores);
        scopeState.lastSyncCompletedAt = Date.now();
        scopeState.pushInProgress = false;
        scopeState.currentPushPromise = null;
        this.armResyncTimer();
      }
    };
    let startTime = performance.now();
    await startScope("team", this.multiStoreState);
    await startScope("user", this.userMultiStoreState);
    if (this.multiStoreState || this.userMultiStoreState) {
      let startTime_2 = performance.now();
      recordPhase("memory_store_pull_ms", startTime_2 - startTime, startTime);
      let recordedPhase = getRecordedPhase("input_ready_ms");
      recordPhase(
        "memory_store_pull_boot_spillover_ms",
        recordedPhase === undefined ? 0 : startTime_2 - recordedPhase,
      );
    }
    this.storeSkillConfigs = mountEntries;
    this.refreshStoreSkills();
    let startHeldByPolicy = this.startHeldByPolicy;
    let heldMs = startHeldByPolicy && this.firstStartAtMs !== null ? Date.now() - this.firstStartAtMs : 0;
    if (this.multiStoreState) {
      logFeatureOk("team_memory_sync_watcher_start");
      logEvent("tengu_team_mem_sync_started", {
        multistore: true,
        stores: this.multiStoreState.stores.length,
        watcher_started: true,
        config_source: fromEnum("env"),
        policy_held: startHeldByPolicy,
        held_ms: heldMs,
      });
    }
    if (this.userMultiStoreState) {
      logFeatureOk("personal_memory_sync_watcher_start");
      logEvent("tengu_personal_mem_sync_started", {
        multistore: true,
        watcher_started: true,
        policy_held: startHeldByPolicy,
        held_ms: heldMs,
      });
    }
    await this.startFileWatcher(this.userMultiStoreState ? getAutoMemPath() : getMemoryDirNfc());
  }
  awaitPolicyVerdictThenStart() {
    if (this.stopAwaitingPolicyVerdict) return;
    logForDebugging(
      memorySyncAvailability() === "held"
        ? "memory-watcher: org policy verdict not loaded yet; sync start held until it settles"
        : "memory-watcher: no org policy verdict obtainable and sync stays off without one (HIPAA evidence on this machine, or a taint); waiting for a verdict",
    );
    this.stopAwaitingPolicyVerdict = onPolicyVerdictHeldStart(() => {
      let availability = memorySyncAvailability();
      if (this.stopAwaitingPolicyVerdict === null || availability === "held") return;
      if (availability === "closed" && memorySyncAwaitsVerdict()) {
        if (this.firstStorePullOwed) {
          logForDebugging(
            "memory-watcher: org policy route gave no verdict (unreachable); sync stays off on this machine \u2014 HIPAA evidence or a taint \u2014 and will start if a later verdict allows it",
          );
          this.releaseOwedFirstStorePull();
          if (env.CLAUDE_MEMORY_STORES)
            logFeatureSad("team_memory_sync_watcher_start", "policy_closed_without_verdict");
        }
        return;
      }
      this.stopAwaitingPolicyVerdict();
      this.stopAwaitingPolicyVerdict = null;
      logForDebugging(
        `memory-watcher: org policy wait over; sync ${availability === "open" ? "starting" : "stays off for the session"}`,
      );
      if (availability === "open") invalidateMemorySections("policy_verdict");
      queueMicrotask(() => {
        this.start(this.storageV5, this.credentials)
          .catch((error) =>
            logForDebugging(`memory-watcher: start after policy verdict failed: ${errorMessage(error)}`, {
              level: "warn",
            }),
          )
          .finally(() => {
            if (this.stopAwaitingPolicyVerdict === null || memorySyncAvailability() !== "held")
              this.releaseOwedFirstStorePull();
          });
      });
    });
  }
  clearPolicyVerdictWait() {
    this.stopAwaitingPolicyVerdict?.();
    this.stopAwaitingPolicyVerdict = null;
    this.releaseOwedFirstStorePull();
  }
  releaseOwedFirstStorePull() {
    if (!this.firstStorePullOwed) return;
    this.firstStorePullOwed = false;
    settleFirstStorePull();
  }
  memoryKeyForPath(path) {
    let autoMemPath = getAutoMemPath();
    let projectKey = projectKeyFromMemoryDir(autoMemPath);
    if (projectKey === undefined) return;
    let relPath = relative(autoMemPath, path);
    if (relPath === "" || relPath.startsWith("..") || isAbsolute(relPath)) return;
    let parts = relPath.split(sep);
    return parts.every(isValidKeySegment) ? STORAGE_SPACES.memory(projectKey, parts) : undefined;
  }
  teamMountScope(path) {
    let space = this.memoryKeyForPath(path);
    return space?.namespace === "memory" && space.relPath.length === 2 && space.relPath[0] === "team"
      ? {
          namespace: "memory",
          projectKey: space.projectKey,
          relPath: space.relPath,
        }
      : undefined;
  }
  async manifestPresent(filePath) {
    let storageV5 = this.storageV5;
    let storageKey = storageV5 && this.memoryKeyForPath(filePath);
    if (storageV5 && storageKey) {
      let meta = await storageV5.statMeta(storageKey);
      return meta.ok || meta.error.code !== "NotFound";
    }
    return stat(filePath).then(
      () => true,
      (error) => getErrnoCode(error) !== "ENOENT",
    );
  }
  async memoryFileSize(filePath) {
    let storageV5 = this.storageV5;
    let storageKey = storageV5 && this.memoryKeyForPath(filePath);
    if (storageV5 && storageKey) {
      let meta = await storageV5.statMeta(storageKey);
      if (meta.ok) return meta.value.size;
    }
    return (await stat(filePath)).size;
  }
  async reapMountDir(store) {
    let storageV5 = this.storageV5;
    let scope = storageV5 && this.teamMountScope(store.mountDir);
    if (storageV5 && scope) {
      let deleteResult = await storageV5.deleteScope(scope);
      let dirCheck = await checkPathInTeamMemDir(store.mountDir, "team", store.mountName);
      if (dirCheck !== "ok") {
        if (dirCheck === "escape")
          logForDebugging(
            `memory-watcher: reap ${store.mountName} \u2014 the mount is no longer canonical after the backend sweep (${deleteResult.ok ? "ok" : deleteResult.error.code}); left in place`,
            {
              level: "warn",
            },
          );
        return;
      }
      if (!deleteResult.ok)
        logForDebugging(
          `memory-watcher: reap ${store.mountName} \u2014 backend sweep ${deleteResult.error.code}, completing directly`,
          {
            level: "warn",
          },
        );
    }
    await rm(store.mountDir, {
      recursive: true,
      force: true,
    });
  }
  async getPersistenceWarning(filePath) {
    let scope = isTeamSubscriber(filePath);
    if (scope === null) return null;
    if (!this.scopeActive(scope)) {
      if (scope === "team") {
        let memoryDirNfc = getMemoryDirNfc();
        let relPath = relative(memoryDirNfc, filePath);
        if (relPath !== "" && !relPath.startsWith("..")) {
          let sliced = relPath.split(sep).slice(0, -1);
          let dir = memoryDirNfc;
          for (let segment of sliced) {
            dir = join(dir, segment);
            if (await this.manifestPresent(join(dir, MEMORY_SYNC_DIR)))
              return env.CLAUDE_MEMORY_STORES
                ? "This file's directory belongs to a synced project memory store that is not mounted in this session. The write was saved locally but is NOT being synced, and a future session with the store mounted will overwrite it with server content. Move the content out of this directory to keep it."
                : "This file's directory is a leftover local copy of a project memory store that is no longer synced. The write was saved locally only: it is not shared with the project and memory recall does not read this directory. Move the content into your memory directory to keep using it.";
          }
        }
      }
      return null;
    }
    let storeState = scope === "team" ? this.multiStoreState : this.userMultiStoreState;
    let store = null;
    let key = null;
    for (let matchedStore of storeState?.stores ?? []) {
      let relPath = relative(matchedStore.mountDir, filePath);
      if (relPath !== "" && !relPath.startsWith("..")) {
        store = matchedStore;
        key = "/" + relPath.split(sep).join("/");
        break;
      }
    }
    if (store !== null && key !== null && !isMemoryDocumentKey_2(key)) return null;
    if (
      store !== null &&
      key !== null &&
      store.backend.mode === "ro" &&
      (store.suppressedReason === null || (store.suppressedUntilMs ?? null) !== null)
    ) {
      let roUnsavedNoticed = store.notices.roUnsavedNoticed;
      roUnsavedNoticed.set(store.mountDir, (roUnsavedNoticed.get(store.mountDir) ?? new Set()).add(key));
      let remedy = this.writableDirsRemedy(store);
      return (
        "This file's memory store is mounted read-only: writes are never synced, and the next sync pull will overwrite local edits with server content. This write was saved locally only and is NOT in shared memory." +
        (remedy !== null ? ` To keep content you wrote, ${remedy}.` : "")
      );
    }
    if (store !== null && (store.source ?? "env") === "discovery") {
      let orgMemoryDecision = getOrgMemoryDecision();
      if (orgMemoryDecision.state === "parked" || orgMemoryDecision.state === "ended")
        return `Synced project memory is ${orgMemoryDecision.state} for this session, so this store is not syncing. This write was saved locally but is NOT being persisted to shared memory.`;
    }
    let suppressedReason = store?.suppressedReason ?? null;
    if (store !== null && suppressedReason !== null) {
      let failureCode = SYNC_FAILURE_CODE_RE.test(suppressedReason) ? suppressedReason : "sync_error";
      if (failureCode === "mount_dir_foreign_partition")
        return (
          `Memory sync is disabled for this file's directory: it already holds the synced memory of a different memory store (mount_dir_foreign_partition), so writes here are saved locally but are NOT synced to shared/server memory. To resolve it, rename or relocate the conflicting directory team/${store.mountName}/ \u2014 sync re-enables automatically on the next sync cycle once it is out of the way (within the hour at most, sooner on the next write or restart); deleting it instead discards any unsynced files inside it, and writing new files into it first keeps sync disabled \u2014 ` +
          "or save this content to a different memory directory. Tell the user the memory directory has a conflict that needs attention."
        );
      if (failureCode === "mount_dir_unmanifested_nonempty")
        return (
          `Memory sync is disabled for this file's directory: it held content before this memory store was mounted (mount_dir_unmanifested_nonempty), so writes here are saved locally but are NOT synced to shared/server memory. To resolve it, rename or relocate the pre-existing directory team/${store.mountName}/ \u2014 the store mounts automatically on the next sync cycle once the directory is empty or gone (within the hour at most, sooner on the next write or restart); deleting its files instead discards them, and writing new files into it first keeps sync disabled \u2014 ` +
          "or save this content to a different memory directory. Tell the user the memory directory has a conflict that needs attention."
        );
      let reasonText = MEMORY_SYNC_REJECT_TEXTS[failureCode];
      if (reasonText !== undefined)
        return `Memory sync is paused for this file's memory store (${failureCode}): ${reasonText} This write was saved locally but is NOT being persisted to shared memory.`;
      let retrying = (store.suppressedUntilMs ?? null) !== null;
      return (
        `Memory sync is currently paused after repeated sync failures (${failureCode}). This write was saved locally but is NOT being synced` +
        (retrying
          ? " yet \u2014 sync retries automatically and will push it if the server recovers while this session is still running."
          : " to shared/server memory.")
      );
    }
    let recoveryUnconfirmedReason = store?.recoveryUnconfirmedReason ?? null;
    if (recoveryUnconfirmedReason !== null)
      return (
        `Memory sync for this file's memory store recently failed (${SYNC_FAILURE_CODE_RE.test(recoveryUnconfirmedReason) ? recoveryUnconfirmedReason : "sync_error"}) and is retrying \u2014 recovery is not yet confirmed. ` +
        "This write was saved locally; treat it as NOT yet persisted to shared memory until sync succeeds."
      );
    if (store !== null && (store.source ?? "env") === "discovery" && store.backend.mode === "rw") {
      let grantedMode = grantedModeFor(store.backend.partitionId);
      if (!isOrgMemoryWriteOptedIn() || (grantedMode !== undefined && grantedMode !== "rw"))
        return (
          "Synced project memory writes are off for this store this session (the write opt-in or the write grant was withdrawn) \u2014 this write was saved locally only, " +
          "and the store is read-only in this session, so it stays local even once sync recovers."
        );
      if (grantedMode === undefined)
        return "The synced project memory write grant is being re-established, so this write was saved locally and is NOT yet persisted to shared memory; treat it as not yet persisted until sync succeeds at the next credential renewal.";
    }
    if (store !== null && key !== null)
      try {
        let size = await this.memoryFileSize(filePath);
        if (size > MAX_MEMORY_BYTES)
          return (
            `This memory file is ${formatFileSize(size)}, over the ${formatFileSize(MAX_MEMORY_BYTES)} sync limit \u2014 ` +
            "it was saved locally but will NOT be synced to shared/server memory. Split it into smaller files under the limit."
          );
      } catch {}
    if (
      store !== null &&
      (store.source ?? "env") === "discovery" &&
      store.backend.mode === "rw" &&
      grantedModeFor(store.backend.partitionId) === "rw" &&
      isOrgMemoryWriteOptedIn() &&
      getOrgMemoryDecision().state === "on" &&
      !this.orgWriteNoticeShown.has(store.mountName)
    ) {
      this.orgWriteNoticeShown.add(store.mountName);
      return 'Note: synced project memory writes are enabled for this directory (the "Synced project memory writes" /config setting), so this file syncs to the shared synced project memory store.';
    }
    return null;
  }
  notifyWrite(filePath) {
    let scope = isTeamSubscriber(filePath);
    if (scope === null || !this.scopeActive(scope)) return;
    this.schedulePush(scope);
  }
  async stop() {
    this.clearPolicyVerdictWait();
    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
    this.clearDeleteConfirmTimers();
    for (let scope of ["team", "user"]) {
      let scopeState = this.scopeStates[scope];
      if (scopeState.debounceTimer) {
        clearTimeout(scopeState.debounceTimer);
        scopeState.debounceTimer = null;
      }
    }
    if (this.watcher) {
      await this.watcher.close().catch(() => {});
      this.watcher = null;
    }
    await Promise.all(
      ["team", "user"].map(async (scope) => {
        let scopeState = this.scopeStates[scope];
        if (scopeState.currentPushPromise)
          try {
            await scopeState.currentPushPromise;
          } catch {}
      }),
    );
    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
    this.clearDeleteConfirmTimers();
    await Promise.all(
      ["team", "user"].map(async (scope) => {
        let scopeState = this.scopeStates[scope];
        if (!scopeState.hasPendingChanges) return;
        if (!isMultiStoreSyncOn()) {
          scopeState.hasPendingChanges = false;
          logForDebugging(`memory-watcher[${scope}]: sync disabled \u2014 skipping shutdown flush`, {
            level: "info",
          });
          return;
        }
        let storeState = scope === "team" ? this.multiStoreState : this.userMultiStoreState;
        if (!storeState) return;
        try {
          await Promise.all(
            storeState.stores.map((store) => {
              if (!isStoreSuppressed(store))
                return runSyncCycleWithReport(
                  store,
                  {
                    allowDeletes: false,
                  },
                  this.storageV5,
                );
              if ((store.suppressedUntilMs ?? null) === null) return Promise.resolve();
              return withTimeout(
                runSyncCycleWithReport(
                  store,
                  {
                    allowDeletes: false,
                  },
                  this.storageV5,
                ),
                FS_EVENT_DEBOUNCE_MS,
                `suppressed-store shutdown flush for ${store.mountName}`,
              ).catch(() => {});
            }),
          );
        } catch {}
      }),
    );
  }
  async rebuildStoreSet(mountEntries) {
    if (!this.started) return;
    if (!isMultiStoreSyncAvailable()) return;
    let team = this.scopeStates.team;
    let hadInFlight = false;
    while (team.currentPushPromise) {
      hadInFlight = true;
      let currentPushPromise = team.currentPushPromise;
      await currentPushPromise.catch(() => {});
      if (team.currentPushPromise === currentPushPromise) team.currentPushPromise = null;
    }
    if (team.pushInProgress) return;
    team.pushInProgress = true;
    team.backoffRetryAtMs = null;
    if (team.debounceTimer) {
      clearTimeout(team.debounceTimer);
      team.debounceTimer = null;
    }
    let multiStoreState = this.multiStoreState;
    let { hasPendingChanges, changeSeq } = team;
    let rebuild = (async () => {
      let flushFailed = new Set(
        (multiStoreState?.stores ?? [])
          .filter((store) => isStoreSuppressed(store) || !store.pulled || store.backend.mode === "ro")
          .map((store) => store.mountName),
      );
      if (multiStoreState)
        await Promise.all(
          multiStoreState.stores
            .filter((store) => !flushFailed.has(store.mountName))
            .map(async (store) => {
              let result = await runSyncCycleWithReport(store, undefined, this.storageV5).catch(() => null);
              if (
                result === null ||
                !result.success ||
                !store.pulled ||
                result.secretsSkipped > 0 ||
                (result.filesRefused ?? 0) > 0 ||
                result.conflicts > 0 ||
                result.diskTrusted === false
              )
                flushFailed.add(store.mountName);
            }),
        );
      let stores = (mountEntries ?? []).filter((entry) => entry.scope !== "user");
      let fromEnv = Boolean(env.CLAUDE_MEMORY_STORES);
      let credentialSource = fromEnv
        ? undefined
        : {
            getAuthorization: getOrgMemoryAuthorization,
          };
      let nextState =
        stores.length > 0
          ? createMultiStoreState(
              createStoreClients(stores, credentialSource),
              stores.map((entry) => ({
                mount: entry.mount,
                scope: entry.scope,
                source: fromEnv ? "env" : "discovery",
                writeDir: memoryIndexDirPrefix(entry.promptIndex),
              })),
              this.notices,
            )
          : null;
      let carriedDirs = new Set();
      if (nextState && multiStoreState) {
        let previousByDir = new Map(multiStoreState.stores.map((store) => [store.mountDir, store]));
        nextState.stores = nextState.stores.map((store) => {
          let previous = previousByDir.get(store.mountDir);
          if (previous?.backend.partitionId !== store.backend.partitionId) return store;
          carriedDirs.add(store.mountDir);
          return {
            ...store,
            remoteHashes: previous.remoteHashes,
            pulled: previous.pulled,
            createdAtMs: previous.createdAtMs,
            pullWritten: previous.pullWritten,
            suppressedReason: previous.suppressedReason,
            suppressedUntilMs: previous.suppressedUntilMs,
            recoveryUnconfirmedReason: previous.recoveryUnconfirmedReason,
            consecutivePermanentFailures: previous.consecutivePermanentFailures,
            serverBackoffUntilMs: previous.serverBackoffUntilMs,
            downloadsDeferred: previous.downloadsDeferred,
            refusedWrites: previous.refusedWrites,
            firstWriteEmitted: previous.firstWriteEmitted,
            conflictRefetches: previous.conflictRefetches,
            invalidatedBasis: previous.invalidatedBasis,
            basisUnusable: previous.basisUnusable,
            basisUnusableReport: previous.basisUnusableReport,
            heldLocal: previous.heldLocal,
            rejoinWalkUntrusted: previous.rejoinWalkUntrusted,
            rejoinOff: previous.rejoinOff,
            streamListUnsupported: previous.streamListUnsupported,
            streamListFailureStreak: previous.streamListFailureStreak,
            streamListSuccessStreak: previous.streamListSuccessStreak,
            streamListRetryAfterMs: previous.streamListRetryAfterMs,
          };
        });
      }
      if (team.changeSeq !== changeSeq)
        for (let store of multiStoreState?.stores ?? []) flushFailed.add(store.mountName);
      this.multiStoreState = nextState;
      if (team.changeSeq === changeSeq && flushFailed.size === 0) team.hasPendingChanges = false;
      team.lastSyncCompletedAt = null;
      let filtered = (multiStoreState?.stores ?? []).filter(
        (store) =>
          store.scope !== "user" &&
          /^[A-Za-z0-9_-]+$/.test(store.mountName) &&
          !carriedDirs.has(store.mountDir) &&
          !flushFailed.has(store.mountName) &&
          (store.heldLocal?.size ?? 0) === 0,
      );
      let reapable = [];
      for (let store of filtered)
        if ((await checkPathInTeamMemDir(store.mountDir, "team", store.mountName)) === "ok")
          reapable.push(store);
      await Promise.all(
        reapable.map((store) =>
          this.reapMountDir(store).catch((error) =>
            logForDebugging(`memory-watcher: reap ${store.mountName} failed: ${errorMessage(error)}`, {
              level: "warn",
            }),
          ),
        ),
      );
      logEvent("tengu_team_mem_store_set_rebuilt", {
        old_stores: multiStoreState?.stores.length ?? 0,
        new_stores: nextState?.stores.length ?? 0,
        dirs_reaped: reapable.length,
        flush_failed_stores: flushFailed.size,
        had_in_flight: hadInFlight,
        had_pending_flush: hasPendingChanges,
      });
      if (nextState) {
        try {
          let syncResult = await syncTeamMemoryOnce(
            nextState,
            "rebuild",
            this.storageV5,
            this.scopeStates.team.offRetries,
          );
          this.enqueueUnsavedReadOnlyNotices(nextState, syncResult);
          this.noteBackoffWake(team, nextState.stores, syncResult);
        } catch (error) {
          logForDebugging(`memory-watcher: rebuild initial sync failed: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
        noteStorePulls(nextState.stores);
        team.lastSyncCompletedAt = Date.now();
      }
    })();
    team.currentPushPromise = rebuild.catch(() => {});
    try {
      await rebuild;
    } finally {
      team.pushInProgress = false;
      team.currentPushPromise = null;
      this.armResyncTimer();
    }
  }
}
//@ chunk-s61vbvea.js:198608-198634 placement
var memoryWatchers; // deferred: uses MemoryWatcher of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:198608", () => {
  memoryWatchers = new HostScoped(() => new MemoryWatcher());
});
//@ chunk-s61vbvea.js:198634-198898 placement
async function startMemoryWatcher(storageV5, credentials) {
  if (storageV5 !== undefined)
    logForDebugging(
      `memory-watcher: started with the storage interface (credentials store: ${credentials === undefined ? "none" : "handed"})`,
    );
  await getAutoMemPathState().warmCanonicalWcRoot();
  let watcher = memoryWatchers.of(getRootSession().host);
  try {
    await watcher.start(storageV5, credentials);
  } finally {
    if (!watcher.firstStorePullOwed) settleFirstStorePull();
  }
}
export { memoryWatchers, startMemoryWatcher };
