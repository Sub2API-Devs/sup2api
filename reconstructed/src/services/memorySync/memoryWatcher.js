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
var DEBOUNCE_MS_2 = 1000;
var MAX_OFF_RETRIES = 10;
var BACKOFF_FACTOR = 2;
var MIN_BACKOFF_MINUTES = 1;
var MAX_BACKOFF_MINUTES = 60;
var OFF_RETRY_JITTER_MS = 5000;
var PERMANENT_FAILURE_CODES = {
  team: new Set(["http_413", "store_full"]),
  user: new Set(),
};
//@ chunk-s61vbvea.js:173625-173662 placement
/**
 * 判断某类失败码是否为永久失败。
 */
function isPermanentFailureCode(e, suppressedReason) {
  return PERMANENT_FAILURE_CODES[e].has(suppressedReason);
}
//@ chunk-s61vbvea.js:173662-173847 placement = isTeamSubscriber (1)
function isTeamSubscriber(e) {
  let autoMemPath = getAutoMemPath();
  let replaced = relative(autoMemPath, e).replaceAll(sep, "/");
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
function hasUnusableStore(e) {
  return e.stores.some((store) => isUsableSuppressedReason(store.basisUnusable));
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
function isIgnoredMemoryPath(e, n = {}) {
  let replaced = relative(getAutoMemPath(), e).replaceAll(sep, "/");
  if (replaced === "" || replaced.startsWith("..")) return false;
  let parts = replaced.split("/");
  let last = parts.at(-1);
  if (n.stats?.isFile() === true && isMemoryDocumentKey(last)) return true;
  if (normalizeKeySegment(parts[0]) === "team")
    return last.startsWith(MEMORY_SYNC_DIR) || (n.backendStaging === true && isHashTempFile(last));
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
  reset(e) {
    this.watcher = null;
    this.storeSkillConfigs = e?.storeSkillConfigs ?? null;
    this.storageV5 = e?.storageV5;
    this.credentials = e?.credentials;
    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
    this.orgWriteNoticeShown.clear();
    this.clearDeleteConfirmTimers();
    this.clearPolicyVerdictWait();
    this.firstStartAtMs = null;
    this.startHeldByPolicy = false;
    this.started = e?.skipWatcher ?? false;
    this.multiStoreState = e?.multiStoreState ?? null;
    this.userMultiStoreState = e?.userMultiStoreState ?? null;
    this.scopeStates.team = createWatcherState();
    this.scopeStates.team.lastSyncCompletedAt = e?.teamLastSyncCompletedAt ?? null;
    this.scopeStates.user = createWatcherState();
    this.scopeStates.user.lastSyncCompletedAt = e?.userLastSyncCompletedAt ?? null;
  }
  refreshStoreSkills() {
    if (this.storeSkillConfigs === null) return;
    loadMemoryStoreSkills(
      this.storeSkillConfigs,
      [...(this.multiStoreState?.stores ?? []), ...(this.userMultiStoreState?.stores ?? [])],
      this.storageV5,
    );
  }
  async executePush(e, n = "watch") {
    let r = this.scopeStates[e];
    let s = e === "team" ? this.multiStoreState : this.userMultiStoreState;
    if (!s) return;
    r.pushInProgress = true;
    r.backoffRetryAtMs = null;
    let changeSeq = r.changeSeq;
    try {
      let stores = s.stores;
      let S = new Set(
        stores.filter((store) => store.suppressedReason !== null).map((store) => store.mountName),
      );
      let w = await syncTeamMemoryOnce(s, n, this.storageV5, r.offRetries);
      this.refreshStoreSkills();
      this.enqueueUnsavedReadOnlyNotices(s, w);
      let values = Object.values(w.pushes);
      let any = values.some((G) => !G.success);
      let any_2 = stores.some((store) => store.suppressedReason !== null);
      let any_3 = stores.some((store) => w.pushes[store.mountName]?.backedOff === true);
      if (!any && !any_2 && !any_3 && r.changeSeq === changeSeq) r.hasPendingChanges = false;
      this.noteBackoffWake(r, stores, w);
      if (e === "team") {
        for (let store of stores)
          if (store.suppressedReason !== null && !S.has(store.mountName))
            logEvent("tengu_team_mem_push_suppressed", {
              reason: sanitizedMachineReasonForTelemetry(store.suppressedReason),
              multistore: true,
              mount: getStoreKindTelemetry(store.mountName),
              consecutive_failures: store.consecutivePermanentFailures,
              expiring: (store.suppressedUntilMs ?? null) !== null,
            });
      }
      if (getMemoryPushDeleteMode() === "corroborate" && values.some((G) => (G.deletesDeferred ?? 0) > 0))
        this.armDeleteConfirmTimer(e);
    } catch (error) {
      logForDebugging(`memory-watcher[${e}]: multi-store sync error: ${errorMessage(error)}`, {
        level: "warn",
      });
    } finally {
      noteStorePulls(s.stores);
      r.lastSyncCompletedAt = Date.now();
      r.pushInProgress = false;
      r.currentPushPromise = null;
      this.armResyncTimer();
    }
  }
  massDeleteHoldExposure(e) {
    return detectMassDelete(
      [...(this.multiStoreState?.stores ?? []), ...(this.userMultiStoreState?.stores ?? [])],
      e,
      this.storageV5,
    );
  }
  enqueueUnsavedReadOnlyNotices(e, n) {
    for (let store of e.stores) {
      let unsavedReadOnlyPaths = n.pushes[store.mountName]?.unsavedReadOnlyPaths ?? [];
      if (unsavedReadOnlyPaths.length === 0) continue;
      let sliced = unsavedReadOnlyPaths.slice(0, MAX_RECORDS_IN_LIST);
      let y = unsavedReadOnlyPaths.length - sliced.length;
      let S = this.writableDirsRemedy(store);
      enqueueMemorySkillLoad(
        `${unsavedReadOnlyPaths.length} file(s) under ${escapeForTag(store.mountDir)} were NOT saved to shared memory: that store is read-only in this session, so they exist only in this machine's local copy, are not visible to other sessions or people, and are discarded when a hosted session ends: ${sliced.map(quoteStoreName).join(", ")}${y > 0 ? ` (+${y} more)` : ""}. ` +
          (S !== null
            ? `To keep content you wrote, ${S}. If you told the user this was saved or remembered, tell them plainly that it was not shared and where you re-saved it (describe the memory location in plain terms, not as a filesystem path).`
            : "There is no writable memory store in this session. If you told the user this was saved or remembered, tell them plainly that it was not."),
      );
    }
  }
  writableDirsRemedy(e) {
    let mapped = [this.multiStoreState, this.userMultiStoreState]
      .flatMap((h) => h?.stores ?? [])
      .filter((h) => (e.scope === "team" || h.scope === "user") && canPushStore(h) && !isStoreSuppressed(h))
      .sort((h, y) => +(y.scope === e.scope) - +(h.scope === e.scope))
      .map((h) => escapeForTag(join(h.mountDir, h.writeDir ?? "")));
    if (mapped.length === 0) return null;
    let r = escapeForTag(e.mountDir);
    let any = mapped.some((h) => {
      let y = relative(h, r);
      return y === "" || (!y.startsWith("..") && !isAbsolute(y));
    });
    return `save it under ${mapped.join(" or ")} instead${any ? ` (anywhere except under ${r})` : ""}`;
  }
  schedulePush(e) {
    let n = this.scopeStates[e];
    n.hasPendingChanges = true;
    n.changeSeq++;
    if (n.debounceTimer) clearTimeout(n.debounceTimer);
    n.debounceTimer = setTimeout((r) => this.firePush(r), DEBOUNCE_MS, e);
  }
  armDeleteConfirmTimer(e) {
    if (this.deleteConfirmTimers[e]) return;
    let timer = setTimeout(
      (r) => {
        this.deleteConfirmTimers[r] = null;
        this.schedulePush(r);
      },
      PUSH_TIMEOUT_MS + OFF_RETRY_JITTER_MS,
      e,
    );
    timer.unref?.();
    this.deleteConfirmTimers[e] = timer;
  }
  clearDeleteConfirmTimers() {
    for (let e of ["team", "user"]) {
      let n = this.deleteConfirmTimers[e];
      if (n) {
        clearTimeout(n);
        this.deleteConfirmTimers[e] = null;
      }
    }
  }
  firePush(e) {
    let n = this.scopeStates[e];
    if (!isMultiStoreSyncOn()) {
      if (n.debounceTimer) {
        clearTimeout(n.debounceTimer);
        n.debounceTimer = null;
      }
      logForDebugging(`memory-watcher[${e}]: sync disabled mid-session \u2014 pausing (reversible)`, {
        level: "info",
      });
      return;
    }
    if (n.pushInProgress) {
      this.schedulePush(e);
      return;
    }
    if (!n.hasPendingChanges) return;
    n.currentPushPromise = this.executePush(e);
  }
  maybeResyncStaleStores() {
    try {
      if (!this.started) return;
      let memoryStoreResyncIntervalMs = getMemoryStoreResyncIntervalMs();
      let now = Date.now();
      for (let r of ["team", "user"]) {
        let s = r === "team" ? this.multiStoreState : this.userMultiStoreState;
        if (!s) continue;
        let h = this.scopeStates[r];
        if (h.pushInProgress || h.lastSyncCompletedAt === null) continue;
        let y =
          memoryStoreResyncIntervalMs > 0 &&
          now - h.lastSyncCompletedAt > this.resyncIntervalFor(h, s, memoryStoreResyncIntervalMs);
        let S = h.backoffRetryAtMs !== null && now >= h.backoffRetryAtMs;
        if (!y && !S) continue;
        if (!isMultiStoreSyncOn()) continue;
        let w;
        if (y && hasUnusableStore(s)) {
          h.offRetries++;
          h.offRetryJitterMs = backoffJitterMs();
          w = "off_retry";
        } else if (y) w = "periodic";
        else {
          h.backoffWakes++;
          w = "backoff_retry";
        }
        h.currentPushPromise = this.executePush(r, w);
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
    for (let y of ["team", "user"]) {
      let S = y === "team" ? this.multiStoreState : this.userMultiStoreState;
      if (S && !hasUnusableStore(S)) {
        let w = this.scopeStates[y];
        w.offRetries = 0;
        w.offRetryJitterMs = backoffJitterMs();
      }
    }
    let memoryStoreResyncIntervalMs = getMemoryStoreResyncIntervalMs();
    let now = Date.now();
    let r = null;
    for (let y of ["team", "user"]) {
      let S = y === "team" ? this.multiStoreState : this.userMultiStoreState;
      if (!S) continue;
      let w = this.scopeStates[y];
      if (w.pushInProgress || w.lastSyncCompletedAt === null) continue;
      let R = isMultiStoreSyncOn();
      if (memoryStoreResyncIntervalMs > 0) {
        let x = R
          ? w.lastSyncCompletedAt + this.resyncIntervalFor(w, S, memoryStoreResyncIntervalMs)
          : now + memoryStoreResyncIntervalMs;
        if (r === null || x < r) r = x;
      }
      if (R && w.backoffRetryAtMs !== null) {
        if (r === null || w.backoffRetryAtMs < r) r = w.backoffRetryAtMs;
      }
    }
    if (r === null) return;
    let max = Math.max(r - now, DEBOUNCE_MS_2);
    let timer = setTimeout(() => {
      this.resyncTimer = null;
      this.maybeResyncStaleStores();
      this.armResyncTimer();
    }, max);
    timer.unref?.();
    this.resyncTimer = timer;
  }
  resyncIntervalFor(e, n, r) {
    if (!hasUnusableStore(n)) return r;
    let s = MAX_OFF_RETRIES * 60000 * 2 ** e.offRetries;
    return Math.min(r, s + e.offRetryJitterMs);
  }
  noteBackoffWake(e, n, r) {
    let now = Date.now();
    let h = null;
    for (let S of n) {
      let w = r.pulls[S.mountName];
      let R = r.pushes[S.mountName];
      if (w?.backedOff !== true && R?.backedOff !== true) continue;
      if (!(
        !S.pulled ||
        (S.downloadsDeferred ?? 0) > 0 ||
        e.hasPendingChanges ||
        (R?.backedOff === true && R.skipped !== true)
      ))
        continue;
      let serverBackoffUntilMs = S.serverBackoffUntilMs ?? now;
      if (h === null || serverBackoffUntilMs < h) h = serverBackoffUntilMs;
    }
    if (h === null) {
      e.backoffRetryAtMs = null;
      e.backoffWakes = 0;
      return;
    }
    let y =
      e.backoffWakes === 0
        ? 0
        : Math.min(MIN_BACKOFF_MINUTES * 2 ** (e.backoffWakes - 1), MAX_BACKOFF_MINUTES) * 60000;
    e.backoffRetryAtMs = Math.max(h, now + y) + backoffJitterMs();
  }
  scopeActive(e) {
    return e === "team" ? this.multiStoreState !== null : this.userMultiStoreState !== null;
  }
  async startFileWatcher(e) {
    if (this.started) return;
    this.started = true;
    await mkdir(e, {
      recursive: true,
    }).catch((error) =>
      logForDebugging(`memory-watcher: mkdir ${e} failed: ${errorMessage(error)}`, {
        level: "warn",
      }),
    );
    let n = (s) => {
      let h = isTeamSubscriber(s);
      if (h === null || !this.scopeActive(h)) return;
      this.schedulePush(h);
    };
    let r = (s) => {
      let h = isTeamSubscriber(s);
      if (h === null || !this.scopeActive(h)) return;
      let y = h === "team" ? this.multiStoreState : this.userMultiStoreState;
      for (let S of y?.stores ?? [])
        if (S.suppressedReason !== null && isPermanentFailureCode(h, S.suppressedReason)) {
          logForDebugging(
            `memory-watcher[${h}]: unlink cleared store suppression for ${S.mountName} (was: ${S.suppressedReason})`,
            {
              level: "info",
            },
          );
          S.recoveryUnconfirmedReason = S.suppressedReason;
          S.suppressedReason = null;
          S.suppressedUntilMs = null;
          S.consecutivePermanentFailures = 0;
        }
      this.schedulePush(h);
    };
    this.watcher = chokidar_default.watch(e, {
      persistent: true,
      ignoreInitial: true,
      usePolling: IS_BUN_RUNTIME,
      interval: POLL_INTERVAL_MS,
      ignorePermissionErrors: true,
      ignored: (s, stats) =>
        isIgnoredMemoryPath(s, {
          backendStaging: this.storageV5 !== undefined,
          stats,
        }),
    });
    this.watcher.on("add", n);
    this.watcher.on("change", n);
    this.watcher.on("unlink", r);
    this.watcher.on("error", (s) => {
      logForDebugging(`memory-watcher: watcher error: ${errorMessage(s)}`, {
        level: "warn",
      });
    });
    logForDebugging(`memory-watcher: watching ${e}`, {
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
      let x = await discoverOrgMemoryStoresForDecision(this.storageV5, this.credentials).catch((error) => {
        logForDebugging(`memory-watcher: org-memory discovery rejected: ${errorMessage(error)}`);
        return null;
      });
      if (x !== null && isSelectionMounted(x))
        logFeatureOk("org_memory_picker", {
          mounted: true,
        });
      return;
    }
    let r = null;
    try {
      r = parseMemoryStoresEnv();
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
    if (r === null) return;
    let filtered = r.filter((x) => x.scope === "team");
    let filtered_2 = r.filter((x) => x.scope === "user");
    if (filtered.length > 0)
      this.multiStoreState = createMultiStoreState(
        createStoreClients(filtered),
        filtered.map((x) => ({
          mount: x.mount,
          scope: x.scope,
          source: "env",
          writeDir: memoryIndexDirPrefix(x.promptIndex),
        })),
        this.notices,
        this.firstStartAtMs,
      );
    if (filtered_2.length > 0)
      this.userMultiStoreState = createMultiStoreState(
        createStoreClients(filtered_2),
        filtered_2.map((x) => ({
          mount: x.mount,
          scope: x.scope,
          source: "env",
        })),
        this.notices,
        this.firstStartAtMs,
      );
    let y = async (x, P) => {
      if (!P) return;
      let j = this.scopeStates[x];
      j.pushInProgress = true;
      let G = syncTeamMemoryOnce(P, "startup", this.storageV5);
      j.currentPushPromise = G.then(() => {
        return;
      }).catch(() => {
        return;
      });
      try {
        let L = await G;
        this.enqueueUnsavedReadOnlyNotices(P, L);
        this.noteBackoffWake(j, P.stores, L);
      } catch (error) {
        logForDebugging(`memory-watcher[${x}]: multi-store initial sync failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      } finally {
        noteStorePulls(P.stores);
        j.lastSyncCompletedAt = Date.now();
        j.pushInProgress = false;
        j.currentPushPromise = null;
        this.armResyncTimer();
      }
    };
    let startTime = performance.now();
    await y("team", this.multiStoreState);
    await y("user", this.userMultiStoreState);
    if (this.multiStoreState || this.userMultiStoreState) {
      let startTime_2 = performance.now();
      recordPhase("memory_store_pull_ms", startTime_2 - startTime, startTime);
      let recordedPhase = getRecordedPhase("input_ready_ms");
      recordPhase(
        "memory_store_pull_boot_spillover_ms",
        recordedPhase === undefined ? 0 : startTime_2 - recordedPhase,
      );
    }
    this.storeSkillConfigs = r;
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
      let e = memorySyncAvailability();
      if (this.stopAwaitingPolicyVerdict === null || e === "held") return;
      if (e === "closed" && memorySyncAwaitsVerdict()) {
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
        `memory-watcher: org policy wait over; sync ${e === "open" ? "starting" : "stays off for the session"}`,
      );
      if (e === "open") invalidateMemorySections("policy_verdict");
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
  memoryKeyForPath(e) {
    let autoMemPath = getAutoMemPath();
    let r = projectKeyFromMemoryDir(autoMemPath);
    if (r === undefined) return;
    let s = relative(autoMemPath, e);
    if (s === "" || s.startsWith("..") || isAbsolute(s)) return;
    let parts = s.split(sep);
    return parts.every(isValidKeySegment) ? STORAGE_SPACES.memory(r, parts) : undefined;
  }
  teamMountScope(e) {
    let n = this.memoryKeyForPath(e);
    return n?.namespace === "memory" && n.relPath.length === 2 && n.relPath[0] === "team"
      ? {
          namespace: "memory",
          projectKey: n.projectKey,
          relPath: n.relPath,
        }
      : undefined;
  }
  async manifestPresent(e) {
    let storageV5 = this.storageV5;
    let r = storageV5 && this.memoryKeyForPath(e);
    if (storageV5 && r) {
      let s = await storageV5.statMeta(r);
      return s.ok || s.error.code !== "NotFound";
    }
    return stat(e).then(
      () => true,
      (error) => getErrnoCode(error) !== "ENOENT",
    );
  }
  async memoryFileSize(e) {
    let storageV5 = this.storageV5;
    let r = storageV5 && this.memoryKeyForPath(e);
    if (storageV5 && r) {
      let s = await storageV5.statMeta(r);
      if (s.ok) return s.value.size;
    }
    return (await stat(e)).size;
  }
  async reapMountDir(e) {
    let storageV5 = this.storageV5;
    let r = storageV5 && this.teamMountScope(e.mountDir);
    if (storageV5 && r) {
      let s = await storageV5.deleteScope(r);
      let h = await checkPathInTeamMemDir(e.mountDir, "team", e.mountName);
      if (h !== "ok") {
        if (h === "escape")
          logForDebugging(
            `memory-watcher: reap ${e.mountName} \u2014 the mount is no longer canonical after the backend sweep (${s.ok ? "ok" : s.error.code}); left in place`,
            {
              level: "warn",
            },
          );
        return;
      }
      if (!s.ok)
        logForDebugging(
          `memory-watcher: reap ${e.mountName} \u2014 backend sweep ${s.error.code}, completing directly`,
          {
            level: "warn",
          },
        );
    }
    await rm(e.mountDir, {
      recursive: true,
      force: true,
    });
  }
  async getPersistenceWarning(e) {
    let n = isTeamSubscriber(e);
    if (n === null) return null;
    if (!this.scopeActive(n)) {
      if (n === "team") {
        let memoryDirNfc = getMemoryDirNfc();
        let R = relative(memoryDirNfc, e);
        if (R !== "" && !R.startsWith("..")) {
          let sliced = R.split(sep).slice(0, -1);
          let P = memoryDirNfc;
          for (let j of sliced) {
            P = join(P, j);
            if (await this.manifestPresent(join(P, MEMORY_SYNC_DIR)))
              return env.CLAUDE_MEMORY_STORES
                ? "This file's directory belongs to a synced project memory store that is not mounted in this session. The write was saved locally but is NOT being synced, and a future session with the store mounted will overwrite it with server content. Move the content out of this directory to keep it."
                : "This file's directory is a leftover local copy of a project memory store that is no longer synced. The write was saved locally only: it is not shared with the project and memory recall does not read this directory. Move the content into your memory directory to keep using it.";
          }
        }
      }
      return null;
    }
    let r = n === "team" ? this.multiStoreState : this.userMultiStoreState;
    let s = null;
    let h = null;
    for (let w of r?.stores ?? []) {
      let R = relative(w.mountDir, e);
      if (R !== "" && !R.startsWith("..")) {
        s = w;
        h = "/" + R.split(sep).join("/");
        break;
      }
    }
    if (s !== null && h !== null && !isMemoryDocumentKey_2(h)) return null;
    if (
      s !== null &&
      h !== null &&
      s.backend.mode === "ro" &&
      (s.suppressedReason === null || (s.suppressedUntilMs ?? null) !== null)
    ) {
      let roUnsavedNoticed = s.notices.roUnsavedNoticed;
      roUnsavedNoticed.set(s.mountDir, (roUnsavedNoticed.get(s.mountDir) ?? new Set()).add(h));
      let R = this.writableDirsRemedy(s);
      return (
        "This file's memory store is mounted read-only: writes are never synced, and the next sync pull will overwrite local edits with server content. This write was saved locally only and is NOT in shared memory." +
        (R !== null ? ` To keep content you wrote, ${R}.` : "")
      );
    }
    if (s !== null && (s.source ?? "env") === "discovery") {
      let orgMemoryDecision = getOrgMemoryDecision();
      if (orgMemoryDecision.state === "parked" || orgMemoryDecision.state === "ended")
        return `Synced project memory is ${orgMemoryDecision.state} for this session, so this store is not syncing. This write was saved locally but is NOT being persisted to shared memory.`;
    }
    let suppressedReason = s?.suppressedReason ?? null;
    if (s !== null && suppressedReason !== null) {
      let w = SYNC_FAILURE_CODE_RE.test(suppressedReason) ? suppressedReason : "sync_error";
      if (w === "mount_dir_foreign_partition")
        return (
          `Memory sync is disabled for this file's directory: it already holds the synced memory of a different memory store (mount_dir_foreign_partition), so writes here are saved locally but are NOT synced to shared/server memory. To resolve it, rename or relocate the conflicting directory team/${s.mountName}/ \u2014 sync re-enables automatically on the next sync cycle once it is out of the way (within the hour at most, sooner on the next write or restart); deleting it instead discards any unsynced files inside it, and writing new files into it first keeps sync disabled \u2014 ` +
          "or save this content to a different memory directory. Tell the user the memory directory has a conflict that needs attention."
        );
      if (w === "mount_dir_unmanifested_nonempty")
        return (
          `Memory sync is disabled for this file's directory: it held content before this memory store was mounted (mount_dir_unmanifested_nonempty), so writes here are saved locally but are NOT synced to shared/server memory. To resolve it, rename or relocate the pre-existing directory team/${s.mountName}/ \u2014 the store mounts automatically on the next sync cycle once the directory is empty or gone (within the hour at most, sooner on the next write or restart); deleting its files instead discards them, and writing new files into it first keeps sync disabled \u2014 ` +
          "or save this content to a different memory directory. Tell the user the memory directory has a conflict that needs attention."
        );
      let R = MEMORY_SYNC_REJECT_TEXTS[w];
      if (R !== undefined)
        return `Memory sync is paused for this file's memory store (${w}): ${R} This write was saved locally but is NOT being persisted to shared memory.`;
      let x = (s.suppressedUntilMs ?? null) !== null;
      return (
        `Memory sync is currently paused after repeated sync failures (${w}). This write was saved locally but is NOT being synced` +
        (x
          ? " yet \u2014 sync retries automatically and will push it if the server recovers while this session is still running."
          : " to shared/server memory.")
      );
    }
    let recoveryUnconfirmedReason = s?.recoveryUnconfirmedReason ?? null;
    if (recoveryUnconfirmedReason !== null)
      return (
        `Memory sync for this file's memory store recently failed (${SYNC_FAILURE_CODE_RE.test(recoveryUnconfirmedReason) ? recoveryUnconfirmedReason : "sync_error"}) and is retrying \u2014 recovery is not yet confirmed. ` +
        "This write was saved locally; treat it as NOT yet persisted to shared memory until sync succeeds."
      );
    if (s !== null && (s.source ?? "env") === "discovery" && s.backend.mode === "rw") {
      let w = grantedModeFor(s.backend.partitionId);
      if (!isOrgMemoryWriteOptedIn() || (w !== undefined && w !== "rw"))
        return (
          "Synced project memory writes are off for this store this session (the write opt-in or the write grant was withdrawn) \u2014 this write was saved locally only, " +
          "and the store is read-only in this session, so it stays local even once sync recovers."
        );
      if (w === undefined)
        return "The synced project memory write grant is being re-established, so this write was saved locally and is NOT yet persisted to shared memory; treat it as not yet persisted until sync succeeds at the next credential renewal.";
    }
    if (s !== null && h !== null)
      try {
        let w = await this.memoryFileSize(e);
        if (w > MAX_MEMORY_BYTES)
          return (
            `This memory file is ${formatFileSize(w)}, over the ${formatFileSize(MAX_MEMORY_BYTES)} sync limit \u2014 ` +
            "it was saved locally but will NOT be synced to shared/server memory. Split it into smaller files under the limit."
          );
      } catch {}
    if (
      s !== null &&
      (s.source ?? "env") === "discovery" &&
      s.backend.mode === "rw" &&
      grantedModeFor(s.backend.partitionId) === "rw" &&
      isOrgMemoryWriteOptedIn() &&
      getOrgMemoryDecision().state === "on" &&
      !this.orgWriteNoticeShown.has(s.mountName)
    ) {
      this.orgWriteNoticeShown.add(s.mountName);
      return 'Note: synced project memory writes are enabled for this directory (the "Synced project memory writes" /config setting), so this file syncs to the shared synced project memory store.';
    }
    return null;
  }
  notifyWrite(e) {
    let n = isTeamSubscriber(e);
    if (n === null || !this.scopeActive(n)) return;
    this.schedulePush(n);
  }
  async stop() {
    this.clearPolicyVerdictWait();
    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
    this.clearDeleteConfirmTimers();
    for (let e of ["team", "user"]) {
      let n = this.scopeStates[e];
      if (n.debounceTimer) {
        clearTimeout(n.debounceTimer);
        n.debounceTimer = null;
      }
    }
    if (this.watcher) {
      await this.watcher.close().catch(() => {});
      this.watcher = null;
    }
    await Promise.all(
      ["team", "user"].map(async (e) => {
        let n = this.scopeStates[e];
        if (n.currentPushPromise)
          try {
            await n.currentPushPromise;
          } catch {}
      }),
    );
    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
    this.clearDeleteConfirmTimers();
    await Promise.all(
      ["team", "user"].map(async (e) => {
        let n = this.scopeStates[e];
        if (!n.hasPendingChanges) return;
        if (!isMultiStoreSyncOn()) {
          n.hasPendingChanges = false;
          logForDebugging(`memory-watcher[${e}]: sync disabled \u2014 skipping shutdown flush`, {
            level: "info",
          });
          return;
        }
        let r = e === "team" ? this.multiStoreState : this.userMultiStoreState;
        if (!r) return;
        try {
          await Promise.all(
            r.stores.map((store) => {
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
  async rebuildStoreSet(e) {
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
    let S = (async () => {
      let w = new Set(
        (multiStoreState?.stores ?? [])
          .filter((Q) => isStoreSuppressed(Q) || !Q.pulled || Q.backend.mode === "ro")
          .map((Q) => Q.mountName),
      );
      if (multiStoreState)
        await Promise.all(
          multiStoreState.stores
            .filter((store) => !w.has(store.mountName))
            .map(async (store) => {
              let Z = await runSyncCycleWithReport(store, undefined, this.storageV5).catch(() => null);
              if (
                Z === null ||
                !Z.success ||
                !store.pulled ||
                Z.secretsSkipped > 0 ||
                (Z.filesRefused ?? 0) > 0 ||
                Z.conflicts > 0 ||
                Z.diskTrusted === false
              )
                w.add(store.mountName);
            }),
        );
      let filtered = (e ?? []).filter((Q) => Q.scope !== "user");
      let x = Boolean(env.CLAUDE_MEMORY_STORES);
      let P = x
        ? undefined
        : {
            getAuthorization: getOrgMemoryAuthorization,
          };
      let j =
        filtered.length > 0
          ? createMultiStoreState(
              createStoreClients(filtered, P),
              filtered.map((Q) => ({
                mount: Q.mount,
                scope: Q.scope,
                source: x ? "env" : "discovery",
                writeDir: memoryIndexDirPrefix(Q.promptIndex),
              })),
              this.notices,
            )
          : null;
      let G = new Set();
      if (j && multiStoreState) {
        let Q = new Map(multiStoreState.stores.map((store) => [store.mountDir, store]));
        j.stores = j.stores.map((store) => {
          let ee = Q.get(store.mountDir);
          if (ee?.backend.partitionId !== store.backend.partitionId) return store;
          G.add(store.mountDir);
          return {
            ...store,
            remoteHashes: ee.remoteHashes,
            pulled: ee.pulled,
            createdAtMs: ee.createdAtMs,
            pullWritten: ee.pullWritten,
            suppressedReason: ee.suppressedReason,
            suppressedUntilMs: ee.suppressedUntilMs,
            recoveryUnconfirmedReason: ee.recoveryUnconfirmedReason,
            consecutivePermanentFailures: ee.consecutivePermanentFailures,
            serverBackoffUntilMs: ee.serverBackoffUntilMs,
            downloadsDeferred: ee.downloadsDeferred,
            refusedWrites: ee.refusedWrites,
            firstWriteEmitted: ee.firstWriteEmitted,
            conflictRefetches: ee.conflictRefetches,
            invalidatedBasis: ee.invalidatedBasis,
            basisUnusable: ee.basisUnusable,
            basisUnusableReport: ee.basisUnusableReport,
            heldLocal: ee.heldLocal,
            rejoinWalkUntrusted: ee.rejoinWalkUntrusted,
            rejoinOff: ee.rejoinOff,
            streamListUnsupported: ee.streamListUnsupported,
            streamListFailureStreak: ee.streamListFailureStreak,
            streamListSuccessStreak: ee.streamListSuccessStreak,
            streamListRetryAfterMs: ee.streamListRetryAfterMs,
          };
        });
      }
      if (team.changeSeq !== changeSeq) for (let Q of multiStoreState?.stores ?? []) w.add(Q.mountName);
      this.multiStoreState = j;
      if (team.changeSeq === changeSeq && w.size === 0) team.hasPendingChanges = false;
      team.lastSyncCompletedAt = null;
      let filtered_2 = (multiStoreState?.stores ?? []).filter(
        (Q) =>
          Q.scope !== "user" &&
          /^[A-Za-z0-9_-]+$/.test(Q.mountName) &&
          !G.has(Q.mountDir) &&
          !w.has(Q.mountName) &&
          (Q.heldLocal?.size ?? 0) === 0,
      );
      let q = [];
      for (let Q of filtered_2)
        if ((await checkPathInTeamMemDir(Q.mountDir, "team", Q.mountName)) === "ok") q.push(Q);
      await Promise.all(
        q.map((Q) =>
          this.reapMountDir(Q).catch((error) =>
            logForDebugging(`memory-watcher: reap ${Q.mountName} failed: ${errorMessage(error)}`, {
              level: "warn",
            }),
          ),
        ),
      );
      logEvent("tengu_team_mem_store_set_rebuilt", {
        old_stores: multiStoreState?.stores.length ?? 0,
        new_stores: j?.stores.length ?? 0,
        dirs_reaped: q.length,
        flush_failed_stores: w.size,
        had_in_flight: hadInFlight,
        had_pending_flush: hasPendingChanges,
      });
      if (j) {
        try {
          let Q = await syncTeamMemoryOnce(j, "rebuild", this.storageV5, this.scopeStates.team.offRetries);
          this.enqueueUnsavedReadOnlyNotices(j, Q);
          this.noteBackoffWake(team, j.stores, Q);
        } catch (error) {
          logForDebugging(`memory-watcher: rebuild initial sync failed: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
        noteStorePulls(j.stores);
        team.lastSyncCompletedAt = Date.now();
      }
    })();
    team.currentPushPromise = S.catch(() => {});
    try {
      await S;
    } finally {
      team.pushInProgress = false;
      team.currentPushPromise = null;
      this.armResyncTimer();
    }
  }
}
//@ chunk-s61vbvea.js:198608-198634 placement
var memoryWatchers = new HostScoped(() => new MemoryWatcher());
//@ chunk-s61vbvea.js:198634-198898 placement
async function startMemoryWatcher(e, n) {
  if (e !== undefined)
    logForDebugging(
      `memory-watcher: started with the storage interface (credentials store: ${n === undefined ? "none" : "handed"})`,
    );
  await getAutoMemPathState().warmCanonicalWcRoot();
  let r = memoryWatchers.of(getRootSession().host);
  try {
    await r.start(e, n);
  } finally {
    if (!r.firstStorePullOwed) settleFirstStorePull();
  }
}
export { memoryWatchers };
