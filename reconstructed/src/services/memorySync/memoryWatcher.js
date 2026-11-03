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
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
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
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
} from "path";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  rm,
  rm as rm_2,
} from "fs/promises";
import { getAutoMemPath, getAutoMemPathState } from "../../memdir/paths.js";
import {
  normalizeKeySegment,
  isExcludedMemoryKey,
  LJs,
  isMemoryDocumentKey,
} from "../memoryStore/memoryKeys.js";
import {
  isMultiStoreSyncAvailable,
  memorySyncAvailability,
  memorySyncAwaitsVerdict,
  memorySyncClosedByPolicy,
  isOrgMemoryReadEnabled,
} from "./availability.js";
import {
  Nr,
  getMemoryPushDeleteMode,
  detectMassDelete,
  canPushStore,
  isStoreSuppressed,
  PUSH_TIMEOUT_MS,
  MAX_MEMORY_BYTES,
} from "./syncConfig.js";
import { zir } from "../orgMemory/storeErrors.js";
import { eie } from "./syncFiles.js";
import { OrgMemoryMirrorNotices, Ln, MEMORY_SYNC_REJECT_TEXTS } from "./syncNotices.js";
import { loadMemoryStoreSkills, jh } from "./memorySkills.js";
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
import { Ok } from "../../../vendor/chokidar/index.js";
import { isDiskless, getRootSession } from "../../bootstrap/state.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { env } from "../../utils/env.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { discoverOrgMemoryStoresForDecision, isSelectionMounted } from "../orgMemory/discovery.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { createMultiStoreState } from "./syncManifest.js";
import { w9r } from "../orgMemory/storeApi.js";
import { memoryIndexDirPrefix } from "../../memdir/memdir.js";
import { Br, n5e } from "../../utils/startupTiming.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { getMemoryDirNfc, checkPathInTeamMemDir } from "../../memdir/teamMemPaths.js";
import { onPolicyVerdictHeldStart } from "../policyLimits/policyState.js";
import { F4t } from "../../utils/focusMode.js";
import { projectKeyFromMemoryDir } from "../../memdir/teamMemPrompts.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getOrgMemoryDecision, N2, isOrgMemoryWriteOptedIn } from "../orgMemory/orgMemoryDecision.js";
import { formatFileSize } from "../../utils/format.js";
import { withTimeout } from "../../utils/sleep.js";
import { getOrgMemoryAuthorization } from "../orgMemory/credential.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-s61vbvea.js:173260-173312 placement
var VC = 2000,
  qC = 10,
  JC = 1500,
  QC = typeof Bun < "u",
  ZC = 2000;
//@ chunk-s61vbvea.js:173312-173525 placement
function createWatcherState() {
  return {
    debounceTimer: null,
    pushInProgress: !1,
    hasPendingChanges: !1,
    changeSeq: 0,
    currentPushPromise: null,
    lastSyncCompletedAt: null,
    offRetries: 0,
    offRetryJitterMs: za(),
    backoffRetryAtMs: null,
    backoffWakes: 0,
  };
}
//@ chunk-s61vbvea.js:173525-173625 placement
var DEBOUNCE_MS = 1000,
  MAX_OFF_RETRIES = 10,
  BACKOFF_FACTOR = 2,
  MIN_BACKOFF_MINUTES = 1,
  MAX_BACKOFF_MINUTES = 60,
  OFF_RETRY_JITTER_MS = 5000,
  PERMANENT_FAILURE_CODES = { team: new Set(["http_413", "store_full"]), user: new Set() };
//@ chunk-s61vbvea.js:173625-173662 placement
function aA(e, n) {
  return PERMANENT_FAILURE_CODES[e].has(n);
}
//@ chunk-s61vbvea.js:173662-173847 placement = isTeamSubscriber (1)
function isTeamSubscriber(e) {
  let n = getAutoMemPath(),
    replaced = relative(n, e).replaceAll(sep, "/");
  if (replaced === "" || replaced.startsWith("..")) return null;
  let parts = replaced.split("/");
  if (normalizeKeySegment(parts[0]) === "team") return "team";
  if (isExcludedMemoryKey(replaced)) return null;
  return "user";
}
//@ chunk-s61vbvea.js:173847-173874 placement
function Ga() {
  return isMultiStoreSyncAvailable();
}
//@ chunk-s61vbvea.js:173874-173936 placement
function Xu(e) {
  return e.stores.some((store) => Nr(store.basisUnusable));
}
//@ chunk-s61vbvea.js:173936-173980 placement
function za() {
  return Math.random() * BACKOFF_FACTOR * 60000;
}
/**
 * 记忆同步失败代码的合法取值正则（无 OAuth、HTTP 状态、团队记忆限制、挂载目录问题、内容被拒等）。
 */
//@ chunk-s61vbvea.js:173980-174404 placement
var SYNC_FAILURE_CODE_RE =
  /^(no_oauth|server_unavailable|http_\d{3}|team_memory_(too_many_entries|entry_too_large|group_acl_denied|group_acl_unconfigured|feature_unavailable)|mount_dir_(foreign_partition|unmanifested_nonempty|unreadable)|malformed_response|list_page_limit|store_full|content_too_large|content_secret|content_screened|index_too_large|invalid_path|store_archived|auth|forbidden|timeout|network|conflict|parse|aborted|unknown)$/;
/**
 * 判断记忆目录中的路径是否应被同步忽略：临时/暂存文件、team 下的特定前缀，及其他被排除的键。
 */
//@ chunk-s61vbvea.js:174404-174663 placement
function isIgnoredMemoryPath(e, n = {}) {
  let replaced = relative(getAutoMemPath(), e).replaceAll(sep, "/");
  if (replaced === "" || replaced.startsWith("..")) return !1;
  let parts = replaced.split("/"),
    at = parts.at(-1);
  if (n.stats?.isFile() === !0 && LJs(at)) return !0;
  if (normalizeKeySegment(parts[0]) === "team")
    return at.startsWith(zir) || (n.backendStaging === !0 && eie(at));
  return isExcludedMemoryKey(replaced);
}
/**
 * 记忆目录监听器：触发团队/多库同步、推送抑制、失败后暂停
 */
//@ chunk-s61vbvea.js:174663-198608 placement
class MemoryWatcher {
  watcher = null;
  started = !1;
  notices = new OrgMemoryMirrorNotices();
  resyncTimer = null;
  deleteConfirmTimers = { team: null, user: null };
  scopeStates = { team: createWatcherState(), user: createWatcherState() };
  multiStoreState = null;
  userMultiStoreState = null;
  storeSkillConfigs = null;
  orgWriteNoticeShown = new Set();
  storageV5 = void 0;
  credentials = void 0;
  stopAwaitingPolicyVerdict = null;
  firstStorePullOwed = !1;
  firstStartAtMs = null;
  startHeldByPolicy = !1;
  reset(e) {
    if (
      ((this.watcher = null),
      (this.storeSkillConfigs = e?.storeSkillConfigs ?? null),
      (this.storageV5 = e?.storageV5),
      (this.credentials = e?.credentials),
      this.resyncTimer)
    )
      (clearTimeout(this.resyncTimer), (this.resyncTimer = null));
    (this.orgWriteNoticeShown.clear(),
      this.clearDeleteConfirmTimers(),
      this.clearPolicyVerdictWait(),
      (this.firstStartAtMs = null),
      (this.startHeldByPolicy = !1),
      (this.started = e?.skipWatcher ?? !1),
      (this.multiStoreState = e?.multiStoreState ?? null),
      (this.userMultiStoreState = e?.userMultiStoreState ?? null),
      (this.scopeStates.team = createWatcherState()),
      (this.scopeStates.team.lastSyncCompletedAt = e?.teamLastSyncCompletedAt ?? null),
      (this.scopeStates.user = createWatcherState()),
      (this.scopeStates.user.lastSyncCompletedAt = e?.userLastSyncCompletedAt ?? null));
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
    let r = this.scopeStates[e],
      s = e === "team" ? this.multiStoreState : this.userMultiStoreState;
    if (!s) return;
    ((r.pushInProgress = !0), (r.backoffRetryAtMs = null));
    let changeSeq = r.changeSeq;
    try {
      let stores = s.stores,
        S = new Set(stores.filter((G) => G.suppressedReason !== null).map((G) => G.mountName)),
        w = await syncTeamMemoryOnce(s, n, this.storageV5, r.offRetries);
      (this.refreshStoreSkills(), this.enqueueUnsavedReadOnlyNotices(s, w));
      let values = Object.values(w.pushes),
        any = values.some((G) => !G.success),
        any_2 = stores.some((G) => G.suppressedReason !== null),
        any_3 = stores.some((G) => w.pushes[G.mountName]?.backedOff === !0);
      if (!any && !any_2 && !any_3 && r.changeSeq === changeSeq) r.hasPendingChanges = !1;
      if ((this.noteBackoffWake(r, stores, w), e === "team")) {
        for (let G of stores)
          if (G.suppressedReason !== null && !S.has(G.mountName))
            logEvent("tengu_team_mem_push_suppressed", {
              reason: sanitizedMachineReasonForTelemetry(G.suppressedReason),
              multistore: !0,
              mount: getStoreKindTelemetry(G.mountName),
              consecutive_failures: G.consecutivePermanentFailures,
              expiring: (G.suppressedUntilMs ?? null) !== null,
            });
      }
      if (getMemoryPushDeleteMode() === "corroborate" && values.some((G) => (G.deletesDeferred ?? 0) > 0))
        this.armDeleteConfirmTimer(e);
    } catch (error) {
      logForDebugging(`memory-watcher[${e}]: multi-store sync error: ${errorMessage(error)}`, {
        level: "warn",
      });
    } finally {
      (noteStorePulls(s.stores),
        (r.lastSyncCompletedAt = Date.now()),
        (r.pushInProgress = !1),
        (r.currentPushPromise = null),
        this.armResyncTimer());
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
      let s = n.pushes[store.mountName]?.unsavedReadOnlyPaths ?? [];
      if (s.length === 0) continue;
      let sliced = s.slice(0, qC),
        y = s.length - sliced.length,
        writableDirsRemedy = this.writableDirsRemedy(store);
      jh(
        `${s.length} file(s) under ${escapeForTag(store.mountDir)} were NOT saved to shared memory: that store is read-only in this session, so they exist only in this machine's local copy, are not visible to other sessions or people, and are discarded when a hosted session ends: ${sliced.map(Ln).join(", ")}${y > 0 ? ` (+${y} more)` : ""}. ` +
          (writableDirsRemedy !== null
            ? `To keep content you wrote, ${writableDirsRemedy}. If you told the user this was saved or remembered, tell them plainly that it was not shared and where you re-saved it (describe the memory location in plain terms, not as a filesystem path).`
            : "There is no writable memory store in this session. If you told the user this was saved or remembered, tell them plainly that it was not."),
      );
    }
  }
  writableDirsRemedy(e) {
    let mapped = [this.multiStoreState, this.userMultiStoreState]
      .flatMap((h) => h?.stores ?? [])
      .filter((h) => (e.scope === "team" || h.scope === "user") && canPushStore(h) && !isStoreSuppressed(h))
      .sort((h, y) => +(y.scope === e.scope) - +(h.scope === e.scope))
      .map((h) => escapeForTag(join_3(h.mountDir, h.writeDir ?? "")));
    if (mapped.length === 0) return null;
    let r = escapeForTag(e.mountDir),
      any = mapped.some((h) => {
        let y = relative(h, r);
        return y === "" || (!y.startsWith("..") && !isAbsolute_2(y));
      });
    return `save it under ${mapped.join(" or ")} instead${any ? ` (anywhere except under ${r})` : ""}`;
  }
  schedulePush(e) {
    let n = this.scopeStates[e];
    if (((n.hasPendingChanges = !0), n.changeSeq++, n.debounceTimer)) clearTimeout(n.debounceTimer);
    n.debounceTimer = setTimeout((r) => this.firePush(r), VC, e);
  }
  armDeleteConfirmTimer(e) {
    if (this.deleteConfirmTimers[e]) return;
    let n = setTimeout(
      (r) => {
        ((this.deleteConfirmTimers[r] = null), this.schedulePush(r));
      },
      PUSH_TIMEOUT_MS + OFF_RETRY_JITTER_MS,
      e,
    );
    (n.unref?.(), (this.deleteConfirmTimers[e] = n));
  }
  clearDeleteConfirmTimers() {
    for (let e of ["team", "user"]) {
      let n = this.deleteConfirmTimers[e];
      if (n) (clearTimeout(n), (this.deleteConfirmTimers[e] = null));
    }
  }
  firePush(e) {
    let n = this.scopeStates[e];
    if (!Ga()) {
      if (n.debounceTimer) (clearTimeout(n.debounceTimer), (n.debounceTimer = null));
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
      let e = getMemoryStoreResyncIntervalMs(),
        now = Date.now();
      for (let r of ["team", "user"]) {
        let s = r === "team" ? this.multiStoreState : this.userMultiStoreState;
        if (!s) continue;
        let h = this.scopeStates[r];
        if (h.pushInProgress || h.lastSyncCompletedAt === null) continue;
        let y = e > 0 && now - h.lastSyncCompletedAt > this.resyncIntervalFor(h, s, e),
          S = h.backoffRetryAtMs !== null && now >= h.backoffRetryAtMs;
        if (!y && !S) continue;
        if (!Ga()) continue;
        let w;
        if (y && Xu(s)) (h.offRetries++, (h.offRetryJitterMs = za()), (w = "off_retry"));
        else if (y) w = "periodic";
        else (h.backoffWakes++, (w = "backoff_retry"));
        h.currentPushPromise = this.executePush(r, w);
      }
    } catch (error) {
      logForDebugging(`memory-watcher: stale-store check failed: ${errorMessage(error)}`, { level: "warn" });
    }
  }
  armResyncTimer() {
    if (this.resyncTimer) (clearTimeout(this.resyncTimer), (this.resyncTimer = null));
    if (!this.started) return;
    for (let y of ["team", "user"]) {
      let S = y === "team" ? this.multiStoreState : this.userMultiStoreState;
      if (S && !Xu(S)) {
        let w = this.scopeStates[y];
        ((w.offRetries = 0), (w.offRetryJitterMs = za()));
      }
    }
    let e = getMemoryStoreResyncIntervalMs(),
      now = Date.now(),
      r = null;
    for (let y of ["team", "user"]) {
      let S = y === "team" ? this.multiStoreState : this.userMultiStoreState;
      if (!S) continue;
      let w = this.scopeStates[y];
      if (w.pushInProgress || w.lastSyncCompletedAt === null) continue;
      let R = Ga();
      if (e > 0) {
        let x = R ? w.lastSyncCompletedAt + this.resyncIntervalFor(w, S, e) : now + e;
        if (r === null || x < r) r = x;
      }
      if (R && w.backoffRetryAtMs !== null) {
        if (r === null || w.backoffRetryAtMs < r) r = w.backoffRetryAtMs;
      }
    }
    if (r === null) return;
    let max = Math.max(r - now, DEBOUNCE_MS),
      h = setTimeout(() => {
        ((this.resyncTimer = null), this.maybeResyncStaleStores(), this.armResyncTimer());
      }, max);
    (h.unref?.(), (this.resyncTimer = h));
  }
  resyncIntervalFor(e, n, r) {
    if (!Xu(n)) return r;
    let s = MAX_OFF_RETRIES * 60000 * 2 ** e.offRetries;
    return Math.min(r, s + e.offRetryJitterMs);
  }
  noteBackoffWake(e, n, r) {
    let now = Date.now(),
      h = null;
    for (let S of n) {
      let w = r.pulls[S.mountName],
        R = r.pushes[S.mountName];
      if (w?.backedOff !== !0 && R?.backedOff !== !0) continue;
      if (!(
        !S.pulled ||
        (S.downloadsDeferred ?? 0) > 0 ||
        e.hasPendingChanges ||
        (R?.backedOff === !0 && R.skipped !== !0)
      ))
        continue;
      let P = S.serverBackoffUntilMs ?? now;
      if (h === null || P < h) h = P;
    }
    if (h === null) {
      ((e.backoffRetryAtMs = null), (e.backoffWakes = 0));
      return;
    }
    let y =
      e.backoffWakes === 0
        ? 0
        : Math.min(MIN_BACKOFF_MINUTES * 2 ** (e.backoffWakes - 1), MAX_BACKOFF_MINUTES) * 60000;
    e.backoffRetryAtMs = Math.max(h, now + y) + za();
  }
  scopeActive(e) {
    return e === "team" ? this.multiStoreState !== null : this.userMultiStoreState !== null;
  }
  async startFileWatcher(e) {
    if (this.started) return;
    ((this.started = !0),
      await mkdir(e, { recursive: !0 }).catch((s) =>
        logForDebugging(`memory-watcher: mkdir ${e} failed: ${errorMessage(s)}`, { level: "warn" }),
      ));
    let n = (s) => {
        let h = isTeamSubscriber(s);
        if (h === null || !this.scopeActive(h)) return;
        this.schedulePush(h);
      },
      r = (s) => {
        let h = isTeamSubscriber(s);
        if (h === null || !this.scopeActive(h)) return;
        let y = h === "team" ? this.multiStoreState : this.userMultiStoreState;
        for (let S of y?.stores ?? [])
          if (S.suppressedReason !== null && aA(h, S.suppressedReason))
            (logForDebugging(
              `memory-watcher[${h}]: unlink cleared store suppression for ${S.mountName} (was: ${S.suppressedReason})`,
              { level: "info" },
            ),
              (S.recoveryUnconfirmedReason = S.suppressedReason),
              (S.suppressedReason = null),
              (S.suppressedUntilMs = null),
              (S.consecutivePermanentFailures = 0));
        this.schedulePush(h);
      };
    ((this.watcher = Ok.watch(e, {
      persistent: !0,
      ignoreInitial: !0,
      usePolling: QC,
      interval: ZC,
      ignorePermissionErrors: !0,
      ignored: (s, h) => isIgnoredMemoryPath(s, { backendStaging: this.storageV5 !== void 0, stats: h }),
    })),
      this.watcher.on("add", n),
      this.watcher.on("change", n),
      this.watcher.on("unlink", r),
      this.watcher.on("error", (s) => {
        logForDebugging(`memory-watcher: watcher error: ${errorMessage(s)}`, { level: "warn" });
      }),
      logForDebugging(`memory-watcher: watching ${e}`, { level: "debug" }),
      this.armResyncTimer());
  }
  async start(e, n) {
    if (((this.storageV5 = e), (this.credentials = n), isDiskless())) return;
    if (!checkHasTrustDialogAccepted()) return;
    switch (((this.firstStartAtMs ??= Date.now()), memorySyncAvailability())) {
      case "closed":
        if (memorySyncAwaitsVerdict()) ((this.startHeldByPolicy = !0), this.awaitPolicyVerdictThenStart());
        if (env.CLAUDE_MEMORY_STORES && memorySyncClosedByPolicy())
          logFeatureSad(
            "team_memory_sync_watcher_start",
            memorySyncAwaitsVerdict() ? "policy_closed_without_verdict" : "policy_denied",
          );
        return;
      case "held":
        ((this.firstStorePullOwed = !0), (this.startHeldByPolicy = !0), this.awaitPolicyVerdictThenStart());
        return;
      case "open":
        break;
    }
    if (!env.CLAUDE_MEMORY_STORES) {
      logEvent("tengu_org_memory_connected_mode", { active: isOrgMemoryReadEnabled() });
      let x = await discoverOrgMemoryStoresForDecision(this.storageV5, this.credentials).catch(
        (P) => (logForDebugging(`memory-watcher: org-memory discovery rejected: ${errorMessage(P)}`), null),
      );
      if (x !== null && isSelectionMounted(x)) logFeatureOk("org_memory_picker", { mounted: !0 });
      return;
    }
    let r = null;
    try {
      r = parseMemoryStoresEnv();
    } catch (error) {
      (logForDebugging(
        `memory-watcher: CLAUDE_MEMORY_STORES invalid, disabling sync: ${errorMessage(error)}`,
        { level: "error" },
      ),
        logEvent("tengu_team_mem_multistore_config_invalid", { ...errorTelemetryFields(error) }),
        logFeatureBad("team_memory_sync_watcher_start", "config_invalid"));
      return;
    }
    if ((registerCleanup(async () => this.stop()), r === null)) return;
    let filtered = r.filter((x) => x.scope === "team"),
      filtered_2 = r.filter((x) => x.scope === "user");
    if (filtered.length > 0)
      this.multiStoreState = createMultiStoreState(
        w9r(filtered),
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
        w9r(filtered_2),
        filtered_2.map((x) => ({ mount: x.mount, scope: x.scope, source: "env" })),
        this.notices,
        this.firstStartAtMs,
      );
    let y = async (x, P) => {
        if (!P) return;
        let j = this.scopeStates[x];
        j.pushInProgress = !0;
        let G = syncTeamMemoryOnce(P, "startup", this.storageV5);
        j.currentPushPromise = G.then(() => {
          return;
        }).catch(() => {
          return;
        });
        try {
          let L = await G;
          (this.enqueueUnsavedReadOnlyNotices(P, L), this.noteBackoffWake(j, P.stores, L));
        } catch (error) {
          logForDebugging(`memory-watcher[${x}]: multi-store initial sync failed: ${errorMessage(error)}`, {
            level: "warn",
          });
        } finally {
          (noteStorePulls(P.stores),
            (j.lastSyncCompletedAt = Date.now()),
            (j.pushInProgress = !1),
            (j.currentPushPromise = null),
            this.armResyncTimer());
        }
      },
      startTime = performance.now();
    if (
      (await y("team", this.multiStoreState),
      await y("user", this.userMultiStoreState),
      this.multiStoreState || this.userMultiStoreState)
    ) {
      let startTime_2 = performance.now();
      Br("memory_store_pull_ms", startTime_2 - startTime, startTime);
      let P = n5e("input_ready_ms");
      Br("memory_store_pull_boot_spillover_ms", P === void 0 ? 0 : startTime_2 - P);
    }
    ((this.storeSkillConfigs = r), this.refreshStoreSkills());
    let startHeldByPolicy = this.startHeldByPolicy,
      R = startHeldByPolicy && this.firstStartAtMs !== null ? Date.now() - this.firstStartAtMs : 0;
    if (this.multiStoreState)
      (logFeatureOk("team_memory_sync_watcher_start"),
        logEvent("tengu_team_mem_sync_started", {
          multistore: !0,
          stores: this.multiStoreState.stores.length,
          watcher_started: !0,
          config_source: fromEnum("env"),
          policy_held: startHeldByPolicy,
          held_ms: R,
        }));
    if (this.userMultiStoreState)
      (logFeatureOk("personal_memory_sync_watcher_start"),
        logEvent("tengu_personal_mem_sync_started", {
          multistore: !0,
          watcher_started: !0,
          policy_held: startHeldByPolicy,
          held_ms: R,
        }));
    await this.startFileWatcher(this.userMultiStoreState ? getAutoMemPath() : getMemoryDirNfc());
  }
  awaitPolicyVerdictThenStart() {
    if (this.stopAwaitingPolicyVerdict) return;
    (logForDebugging(
      memorySyncAvailability() === "held"
        ? "memory-watcher: org policy verdict not loaded yet; sync start held until it settles"
        : "memory-watcher: no org policy verdict obtainable and sync stays off without one (HIPAA evidence on this machine, or a taint); waiting for a verdict",
    ),
      (this.stopAwaitingPolicyVerdict = onPolicyVerdictHeldStart(() => {
        let e = memorySyncAvailability();
        if (this.stopAwaitingPolicyVerdict === null || e === "held") return;
        if (e === "closed" && memorySyncAwaitsVerdict()) {
          if (this.firstStorePullOwed) {
            if (
              (logForDebugging(
                "memory-watcher: org policy route gave no verdict (unreachable); sync stays off on this machine \u2014 HIPAA evidence or a taint \u2014 and will start if a later verdict allows it",
              ),
              this.releaseOwedFirstStorePull(),
              env.CLAUDE_MEMORY_STORES)
            )
              logFeatureSad("team_memory_sync_watcher_start", "policy_closed_without_verdict");
          }
          return;
        }
        if (
          (this.stopAwaitingPolicyVerdict(),
          (this.stopAwaitingPolicyVerdict = null),
          logForDebugging(
            `memory-watcher: org policy wait over; sync ${e === "open" ? "starting" : "stays off for the session"}`,
          ),
          e === "open")
        )
          F4t("policy_verdict");
        queueMicrotask(() => {
          this.start(this.storageV5, this.credentials)
            .catch((n) =>
              logForDebugging(`memory-watcher: start after policy verdict failed: ${errorMessage(n)}`, {
                level: "warn",
              }),
            )
            .finally(() => {
              if (this.stopAwaitingPolicyVerdict === null || memorySyncAvailability() !== "held")
                this.releaseOwedFirstStorePull();
            });
        });
      })));
  }
  clearPolicyVerdictWait() {
    (this.stopAwaitingPolicyVerdict?.(),
      (this.stopAwaitingPolicyVerdict = null),
      this.releaseOwedFirstStorePull());
  }
  releaseOwedFirstStorePull() {
    if (!this.firstStorePullOwed) return;
    ((this.firstStorePullOwed = !1), settleFirstStorePull());
  }
  memoryKeyForPath(e) {
    let n = getAutoMemPath(),
      r = projectKeyFromMemoryDir(n);
    if (r === void 0) return;
    let s = relative(n, e);
    if (s === "" || s.startsWith("..") || isAbsolute_2(s)) return;
    let parts = s.split(sep);
    return parts.every(isValidKeySegment) ? STORAGE_SPACES.memory(r, parts) : void 0;
  }
  teamMountScope(e) {
    let memoryKeyForPath = this.memoryKeyForPath(e);
    return memoryKeyForPath?.namespace === "memory" &&
      memoryKeyForPath.relPath.length === 2 &&
      memoryKeyForPath.relPath[0] === "team"
      ? { namespace: "memory", projectKey: memoryKeyForPath.projectKey, relPath: memoryKeyForPath.relPath }
      : void 0;
  }
  async manifestPresent(e) {
    let storageV5 = this.storageV5,
      r = storageV5 && this.memoryKeyForPath(e);
    if (storageV5 && r) {
      let statMeta = await storageV5.statMeta(r);
      return statMeta.ok || statMeta.error.code !== "NotFound";
    }
    return stat_2(e).then(
      () => !0,
      (s) => getErrnoCode(s) !== "ENOENT",
    );
  }
  async memoryFileSize(e) {
    let storageV5 = this.storageV5,
      r = storageV5 && this.memoryKeyForPath(e);
    if (storageV5 && r) {
      let statMeta = await storageV5.statMeta(r);
      if (statMeta.ok) return statMeta.value.size;
    }
    return (await stat_2(e)).size;
  }
  async reapMountDir(e) {
    let storageV5 = this.storageV5,
      r = storageV5 && this.teamMountScope(e.mountDir);
    if (storageV5 && r) {
      let deleteScope = await storageV5.deleteScope(r),
        h = await checkPathInTeamMemDir(e.mountDir, "team", e.mountName);
      if (h !== "ok") {
        if (h === "escape")
          logForDebugging(
            `memory-watcher: reap ${e.mountName} \u2014 the mount is no longer canonical after the backend sweep (${deleteScope.ok ? "ok" : deleteScope.error.code}); left in place`,
            { level: "warn" },
          );
        return;
      }
      if (!deleteScope.ok)
        logForDebugging(
          `memory-watcher: reap ${e.mountName} \u2014 backend sweep ${deleteScope.error.code}, completing directly`,
          { level: "warn" },
        );
    }
    await rm(e.mountDir, { recursive: !0, force: !0 });
  }
  async getPersistenceWarning(e) {
    let n = isTeamSubscriber(e);
    if (n === null) return null;
    if (!this.scopeActive(n)) {
      if (n === "team") {
        let w = getMemoryDirNfc(),
          R = relative(w, e);
        if (R !== "" && !R.startsWith("..")) {
          let sliced = R.split(sep).slice(0, -1),
            P = w;
          for (let j of sliced)
            if (((P = join_3(P, j)), await this.manifestPresent(join_3(P, zir))))
              return env.CLAUDE_MEMORY_STORES
                ? "This file's directory belongs to a synced project memory store that is not mounted in this session. The write was saved locally but is NOT being synced, and a future session with the store mounted will overwrite it with server content. Move the content out of this directory to keep it."
                : "This file's directory is a leftover local copy of a project memory store that is no longer synced. The write was saved locally only: it is not shared with the project and memory recall does not read this directory. Move the content into your memory directory to keep using it.";
        }
      }
      return null;
    }
    let r = n === "team" ? this.multiStoreState : this.userMultiStoreState,
      s = null,
      h = null;
    for (let w of r?.stores ?? []) {
      let R = relative(w.mountDir, e);
      if (R !== "" && !R.startsWith("..")) {
        ((s = w), (h = "/" + R.split(sep).join("/")));
        break;
      }
    }
    if (s !== null && h !== null && !isMemoryDocumentKey(h)) return null;
    if (
      s !== null &&
      h !== null &&
      s.backend.mode === "ro" &&
      (s.suppressedReason === null || (s.suppressedUntilMs ?? null) !== null)
    ) {
      let roUnsavedNoticed = s.notices.roUnsavedNoticed;
      roUnsavedNoticed.set(s.mountDir, (roUnsavedNoticed.get(s.mountDir) ?? new Set()).add(h));
      let writableDirsRemedy = this.writableDirsRemedy(s);
      return (
        "This file's memory store is mounted read-only: writes are never synced, and the next sync pull will overwrite local edits with server content. This write was saved locally only and is NOT in shared memory." +
        (writableDirsRemedy !== null ? ` To keep content you wrote, ${writableDirsRemedy}.` : "")
      );
    }
    if (s !== null && (s.source ?? "env") === "discovery") {
      let w = getOrgMemoryDecision();
      if (w.state === "parked" || w.state === "ended")
        return `Synced project memory is ${w.state} for this session, so this store is not syncing. This write was saved locally but is NOT being persisted to shared memory.`;
    }
    let y = s?.suppressedReason ?? null;
    if (s !== null && y !== null) {
      let w = SYNC_FAILURE_CODE_RE.test(y) ? y : "sync_error";
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
      if (R !== void 0)
        return `Memory sync is paused for this file's memory store (${w}): ${R} This write was saved locally but is NOT being persisted to shared memory.`;
      let x = (s.suppressedUntilMs ?? null) !== null;
      return (
        `Memory sync is currently paused after repeated sync failures (${w}). This write was saved locally but is NOT being synced` +
        (x
          ? " yet \u2014 sync retries automatically and will push it if the server recovers while this session is still running."
          : " to shared/server memory.")
      );
    }
    let S = s?.recoveryUnconfirmedReason ?? null;
    if (S !== null)
      return (
        `Memory sync for this file's memory store recently failed (${SYNC_FAILURE_CODE_RE.test(S) ? S : "sync_error"}) and is retrying \u2014 recovery is not yet confirmed. ` +
        "This write was saved locally; treat it as NOT yet persisted to shared memory until sync succeeds."
      );
    if (s !== null && (s.source ?? "env") === "discovery" && s.backend.mode === "rw") {
      let w = N2(s.backend.partitionId);
      if (!isOrgMemoryWriteOptedIn() || (w !== void 0 && w !== "rw"))
        return (
          "Synced project memory writes are off for this store this session (the write opt-in or the write grant was withdrawn) \u2014 this write was saved locally only, " +
          "and the store is read-only in this session, so it stays local even once sync recovers."
        );
      if (w === void 0)
        return "The synced project memory write grant is being re-established, so this write was saved locally and is NOT yet persisted to shared memory; treat it as not yet persisted until sync succeeds at the next credential renewal.";
    }
    if (s !== null && h !== null)
      try {
        let memoryFileSize = await this.memoryFileSize(e);
        if (memoryFileSize > MAX_MEMORY_BYTES)
          return (
            `This memory file is ${formatFileSize(memoryFileSize)}, over the ${formatFileSize(MAX_MEMORY_BYTES)} sync limit \u2014 ` +
            "it was saved locally but will NOT be synced to shared/server memory. Split it into smaller files under the limit."
          );
      } catch {}
    if (
      s !== null &&
      (s.source ?? "env") === "discovery" &&
      s.backend.mode === "rw" &&
      N2(s.backend.partitionId) === "rw" &&
      isOrgMemoryWriteOptedIn() &&
      getOrgMemoryDecision().state === "on" &&
      !this.orgWriteNoticeShown.has(s.mountName)
    )
      return (
        this.orgWriteNoticeShown.add(s.mountName),
        'Note: synced project memory writes are enabled for this directory (the "Synced project memory writes" /config setting), so this file syncs to the shared synced project memory store.'
      );
    return null;
  }
  notifyWrite(e) {
    let n = isTeamSubscriber(e);
    if (n === null || !this.scopeActive(n)) return;
    this.schedulePush(n);
  }
  async stop() {
    if ((this.clearPolicyVerdictWait(), this.resyncTimer))
      (clearTimeout(this.resyncTimer), (this.resyncTimer = null));
    this.clearDeleteConfirmTimers();
    for (let e of ["team", "user"]) {
      let n = this.scopeStates[e];
      if (n.debounceTimer) (clearTimeout(n.debounceTimer), (n.debounceTimer = null));
    }
    if (this.watcher) (await this.watcher.close().catch(() => {}), (this.watcher = null));
    if (
      (await Promise.all(
        ["team", "user"].map(async (e) => {
          let n = this.scopeStates[e];
          if (n.currentPushPromise)
            try {
              await n.currentPushPromise;
            } catch {}
        }),
      ),
      this.resyncTimer)
    )
      (clearTimeout(this.resyncTimer), (this.resyncTimer = null));
    (this.clearDeleteConfirmTimers(),
      await Promise.all(
        ["team", "user"].map(async (e) => {
          let n = this.scopeStates[e];
          if (!n.hasPendingChanges) return;
          if (!Ga()) {
            ((n.hasPendingChanges = !1),
              logForDebugging(`memory-watcher[${e}]: sync disabled \u2014 skipping shutdown flush`, {
                level: "info",
              }));
            return;
          }
          let r = e === "team" ? this.multiStoreState : this.userMultiStoreState;
          if (!r) return;
          try {
            await Promise.all(
              r.stores.map((store) => {
                if (!isStoreSuppressed(store))
                  return runSyncCycleWithReport(store, { allowDeletes: !1 }, this.storageV5);
                if ((store.suppressedUntilMs ?? null) === null) return Promise.resolve();
                return withTimeout(
                  runSyncCycleWithReport(store, { allowDeletes: !1 }, this.storageV5),
                  JC,
                  `suppressed-store shutdown flush for ${store.mountName}`,
                ).catch(() => {});
              }),
            );
          } catch {}
        }),
      ));
  }
  async rebuildStoreSet(e) {
    if (!this.started) return;
    if (!isMultiStoreSyncAvailable()) return;
    let team = this.scopeStates.team,
      r = !1;
    while (team.currentPushPromise) {
      r = !0;
      let currentPushPromise = team.currentPushPromise;
      if ((await currentPushPromise.catch(() => {}), team.currentPushPromise === currentPushPromise))
        team.currentPushPromise = null;
    }
    if (team.pushInProgress) return;
    if (((team.pushInProgress = !0), (team.backoffRetryAtMs = null), team.debounceTimer))
      (clearTimeout(team.debounceTimer), (team.debounceTimer = null));
    let multiStoreState = this.multiStoreState,
      { hasPendingChanges: hasPendingChanges, changeSeq: changeSeq } = team,
      S = (async () => {
        let w = new Set(
          (multiStoreState?.stores ?? [])
            .filter((Q) => isStoreSuppressed(Q) || !Q.pulled || Q.backend.mode === "ro")
            .map((Q) => Q.mountName),
        );
        if (multiStoreState)
          await Promise.all(
            multiStoreState.stores
              .filter((store) => !w.has(store.mountName))
              .map(async (Q) => {
                let Z = await runSyncCycleWithReport(Q, void 0, this.storageV5).catch(() => null);
                if (
                  Z === null ||
                  !Z.success ||
                  !Q.pulled ||
                  Z.secretsSkipped > 0 ||
                  (Z.filesRefused ?? 0) > 0 ||
                  Z.conflicts > 0 ||
                  Z.diskTrusted === !1
                )
                  w.add(Q.mountName);
              }),
          );
        let filtered = (e ?? []).filter((Q) => Q.scope !== "user"),
          x = Boolean(env.CLAUDE_MEMORY_STORES),
          P = x ? void 0 : { getAuthorization: getOrgMemoryAuthorization },
          j =
            filtered.length > 0
              ? createMultiStoreState(
                  w9r(filtered, P),
                  filtered.map((Q) => ({
                    mount: Q.mount,
                    scope: Q.scope,
                    source: x ? "env" : "discovery",
                    writeDir: memoryIndexDirPrefix(Q.promptIndex),
                  })),
                  this.notices,
                )
              : null,
          G = new Set();
        if (j && multiStoreState) {
          let Q = new Map(multiStoreState.stores.map((store) => [store.mountDir, store]));
          j.stores = j.stores.map((store) => {
            let ee = Q.get(store.mountDir);
            if (ee?.backend.partitionId !== store.backend.partitionId) return store;
            return (
              G.add(store.mountDir),
              {
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
              }
            );
          });
        }
        if (team.changeSeq !== changeSeq) for (let Q of multiStoreState?.stores ?? []) w.add(Q.mountName);
        if (((this.multiStoreState = j), team.changeSeq === changeSeq && w.size === 0))
          team.hasPendingChanges = !1;
        team.lastSyncCompletedAt = null;
        let filtered_2 = (multiStoreState?.stores ?? []).filter(
            (Q) =>
              Q.scope !== "user" &&
              /^[A-Za-z0-9_-]+$/.test(Q.mountName) &&
              !G.has(Q.mountDir) &&
              !w.has(Q.mountName) &&
              (Q.heldLocal?.size ?? 0) === 0,
          ),
          q = [];
        for (let Q of filtered_2)
          if ((await checkPathInTeamMemDir(Q.mountDir, "team", Q.mountName)) === "ok") q.push(Q);
        if (
          (await Promise.all(
            q.map((Q) =>
              this.reapMountDir(Q).catch((Z) =>
                logForDebugging(`memory-watcher: reap ${Q.mountName} failed: ${errorMessage(Z)}`, {
                  level: "warn",
                }),
              ),
            ),
          ),
          logEvent("tengu_team_mem_store_set_rebuilt", {
            old_stores: multiStoreState?.stores.length ?? 0,
            new_stores: j?.stores.length ?? 0,
            dirs_reaped: q.length,
            flush_failed_stores: w.size,
            had_in_flight: r,
            had_pending_flush: hasPendingChanges,
          }),
          j)
        ) {
          try {
            let Q = await syncTeamMemoryOnce(j, "rebuild", this.storageV5, this.scopeStates.team.offRetries);
            (this.enqueueUnsavedReadOnlyNotices(j, Q), this.noteBackoffWake(team, j.stores, Q));
          } catch (error) {
            logForDebugging(`memory-watcher: rebuild initial sync failed: ${errorMessage(error)}`, {
              level: "warn",
            });
          }
          (noteStorePulls(j.stores), (team.lastSyncCompletedAt = Date.now()));
        }
      })();
    team.currentPushPromise = S.catch(() => {});
    try {
      await S;
    } finally {
      ((team.pushInProgress = !1), (team.currentPushPromise = null), this.armResyncTimer());
    }
  }
}
//@ chunk-s61vbvea.js:198608-198634 placement
var memoryWatchers = new HostScoped(() => new MemoryWatcher());
//@ chunk-s61vbvea.js:198634-198898 placement
async function startMemoryWatcher(e, n) {
  if (e !== void 0)
    logForDebugging(
      `memory-watcher: started with the storage interface (credentials store: ${n === void 0 ? "none" : "handed"})`,
    );
  await getAutoMemPathState().warmCanonicalWcRoot();
  let of = memoryWatchers.of(getRootSession().host);
  try {
    await of.start(e, n);
  } finally {
    if (!of.firstStorePullOwed) settleFirstStorePull();
  }
}

export { memoryWatchers };
