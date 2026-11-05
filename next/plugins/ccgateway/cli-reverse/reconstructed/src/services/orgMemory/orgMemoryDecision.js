/**
 * services/orgMemory/orgMemoryDecision.ts
 *
 * 组织记忆读写决定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (58)
 * attribution: placement 58
 */
import { env } from "../../utils/env.js";
import { getTeammateAgentId, getRootSession } from "../../bootstrap/state.js";
import { isOnClaudeCodeSessionSurface } from "../../utils/teammate.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { countWhere } from "../../utils/collections.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isOrgMemoryPolicyOpen } from "./memoryStores.js";
import { getCurrentProjectConfig, saveCurrentProjectConfig } from "../../utils/config.js";
import { hasMemoryApiOverride } from "../../utils/teleport/api.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { logEvent } from "../analytics/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { createSignal } from "../../utils/signal.js";
import { sleep } from "../../utils/sleep.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:12111-12193 placement
/**
 * 当前会话是否可以做组织记忆决定（无队友/特定会话类型）。
 */
function isEligibleDecisionSurface() {
  return (
    !(env.CLAUDE_CODE_SESSION_KIND !== undefined || getTeammateAgentId() !== undefined) &&
    !isOnClaudeCodeSessionSurface()
  );
}
//@ chunk-a2q0x549.js:12193-12394 placement
var grantedStoreSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:12193", () => {
  grantedStoreSchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema().min(1),
      mode: _enum(["rw", "ro"]),
      kind: stringSchema().optional(),
      grouping_id: stringSchema().optional(),
      visibility: stringSchema().max(64).optional().catch(undefined),
      prompt_index: stringSchema().max(512).optional().catch(undefined),
    }),
  );
});
//@ chunk-a2q0x549.js:12394-13922 placement
class OrgMemoryWriteVerdict {
  grantedStores = null;
  grantedModes = null;
  mirrorPresent = false;
  lastAskDowngraded = false;
  rootLiftable = false;
  rootLiftReason = "no_root";
  monorepoBlockLogged = false;
  pickedSelectionPrivateProbe = null;
  clearGrant() {
    this.grantedStores = null;
    this.grantedModes = null;
    this.mirrorPresent = false;
    this.lastAskDowngraded = false;
    this.rootLiftable = false;
    this.rootLiftReason = "no_root";
  }
  reset() {
    this.clearGrant();
    this.monorepoBlockLogged = false;
  }
  installPickedSelectionPrivateProbe(pickedSelectionPrivateProbe) {
    this.pickedSelectionPrivateProbe = pickedSelectionPrivateProbe;
  }
  logMonorepoWriteBlockOnce() {}
  record(stores, askedWrite, options) {
    this.mirrorPresent = Array.isArray(stores);
    let rawStores = Array.isArray(stores) ? stores : [];
    let droppedCount = 0;
    let stores_2 = rawStores.flatMap((entry) => {
      let parsed = grantedStoreSchema().safeParse(entry);
      if (!parsed.success) {
        droppedCount += 1;
        return [];
      }
      return [parsed.data];
    });
    let hasPrivate = hasPrivateGrouping(stores_2);
    let privateCandidate = options?.privateCandidate === true;
    this.rootLiftable =
      !options?.clampRo && !privateCandidate && isLiftableRootOnly(rawStores.length, stores_2, droppedCount);
    this.rootLiftReason = getMirrorVerdict(
      stores_2,
      droppedCount,
      rawStores.length,
      hasPrivate,
      privateCandidate,
    );
    let duplicated = hasDuplicateStorePaths(stores_2);
    let mapped = stores_2.map((store) =>
      options?.clampRo || hasPrivate || duplicated || (!this.rootLiftable && isGroupingRootStore(store))
        ? {
            ...store,
            mode: "ro",
          }
        : store,
    );
    this.grantedStores = mapped;
    this.grantedModes = new Map(mapped.map((store) => [stripTrailingSlashes(store.path), store.mode]));
    let writableCount = countWhere([...this.grantedModes.values()], (mode) => mode === "rw");
    this.lastAskDowngraded =
      askedWrite &&
      writableCount === 0 &&
      !hasPrivate &&
      !duplicated &&
      this.rootLiftReason !== "verdict_failed" &&
      this.rootLiftReason !== "private_candidate";
    if (askedWrite)
      if (duplicated) logFeatureSad("org_memory_writes", "conflicted_mirror");
      else if (hasPrivate) logFeatureSad("org_memory_writes", "private_selection_ro");
      else if (this.rootLiftReason === "private_candidate")
        logFeatureSad("org_memory_writes", "private_candidate_veto");
      else if (this.rootLiftReason === "verdict_failed") logFeatureSad("org_memory_writes", "verdict_failed");
      else if (writableCount > 0)
        logFeatureOk("org_memory_writes", {
          granted_rw: writableCount,
        });
      else logFeatureSad("org_memory_writes", "downgraded");
  }
}
//@ chunk-a2q0x549.js:13922-13947 placement
/**
 * 按宿主保存的组织记忆写入判定。
 */
var orgMemoryWriteVerdict; // deferred: uses OrgMemoryWriteVerdict of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:13922", () => {
  orgMemoryWriteVerdict = new HostScoped(() => new OrgMemoryWriteVerdict());
});
//@ chunk-a2q0x549.js:13947-13984 placement
/**
 * 取当前宿主的写入判定状态。
 */
function getOrgMemoryWriteVerdict() {
  return orgMemoryWriteVerdict.of(getRootSession().host);
}
//@ chunk-a2q0x549.js:13984-14027 placement
/**
 * 去掉路径结尾的斜杠。
 */
function stripTrailingSlashes(path) {
  return path.replace(/\/+$/, "");
}
//@ chunk-a2q0x549.js:14027-14051 placement
/**
 * 是否拦截 monorepo 写入（当前恒 false）。
 */
function isMonorepoWriteBlocked() {
  return false;
}
//@ chunk-a2q0x549.js:14051-14154 placement
/**
 * 组织记忆是否可写：monorepo 写入被拦时记一次日志并返回 false，需有当前账号且满足前置条件。
 */
function canWriteOrgMemory() {
  if (isMonorepoWriteBlocked()) {
    getOrgMemoryWriteVerdict().logMonorepoWriteBlockOnce();
    return false;
  }
  if (orgMemoryAccountKey() === null) return false;
  return isOrgMemoryPolicyOpen();
}
//@ chunk-a2q0x549.js:14154-14282 placement
/**
 * 组织记忆写入是否已由当前账号在项目配置中选择开启。
 */
function isOrgMemoryWriteOptedIn() {
  let currentProjectConfig = getCurrentProjectConfig();
  if (!canWriteOrgMemory() || currentProjectConfig.orgMemoryWrites !== true) return false;
  let orgMemoryWritesAccount = currentProjectConfig.orgMemoryWritesAccount;
  return orgMemoryWritesAccount !== undefined && orgMemoryWritesAccount === orgMemoryAccountKey();
}
//@ chunk-a2q0x549.js:14282-14340 placement
/**
 * 安装“所选存储是否私有”的探测。
 */
function installPrivateProbe(probe) {
  getOrgMemoryWriteVerdict().installPickedSelectionPrivateProbe(probe);
}
//@ chunk-a2q0x549.js:14340-14415 placement
/**
 * 判断所选存储是否被判定为私有。
 */
function isSelectionPrivate(selection) {
  return selection !== null && getOrgMemoryWriteVerdict().pickedSelectionPrivateProbe?.(selection) === true;
}
//@ chunk-a2q0x549.js:14415-14578 placement
function getOrgMemoryAccountKey() {
  if (hasMemoryApiOverride()) return "memory-dev/memory-dev";
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo?.accountUuid || !oauthAccountInfo.organizationUuid) return null;
  return `${oauthAccountInfo.accountUuid}/${oauthAccountInfo.organizationUuid}`;
}
//@ chunk-a2q0x549.js:14578-14604 placement
/**
 * 取组织记忆使用的账号键。
 */
function orgMemoryAccountKey() {
  return getOrgMemoryAccountKey();
}
//@ chunk-a2q0x549.js:14604-14642 placement
/**
 * 记录一次写入判定。
 */
function recordVerdict(stores, store, verdict) {
  getOrgMemoryWriteVerdict().record(stores, store, verdict);
}
//@ chunk-a2q0x549.js:14642-14694 placement
/**
 * 取某路径授权到的模式（rw/ro）。
 */
function grantedModeFor(path) {
  return getOrgMemoryWriteVerdict().grantedModes?.get(stripTrailingSlashes(path));
}
//@ chunk-a2q0x549.js:14694-14735 placement
/**
 * 是否已有镜像。
 */
function hasMirror() {
  return getOrgMemoryWriteVerdict().mirrorPresent;
}
//@ chunk-a2q0x549.js:14735-14848 placement
function hasRwGrantedStore() {
  let grantedModes = getOrgMemoryWriteVerdict().grantedModes;
  if (grantedModes === null) return false;
  for (let mode of grantedModes.values()) if (mode === "rw") return true;
  return false;
}
//@ chunk-a2q0x549.js:14848-14940 placement
/**
 * 查找某名字的分组存储。
 */
function findGroupingStore(groupingName) {
  return getOrgMemoryWriteVerdict().grantedStores?.find(
    (grantedStore) =>
      classifyStorePath(grantedStore.path) === "grouping" && isStoreBasename(grantedStore.path, groupingName),
  );
}
//@ chunk-a2q0x549.js:14940-15022 placement
/**
 * 查找分组根存储。
 */
function findGroupingRootStore() {
  return getOrgMemoryWriteVerdict().grantedStores?.find(
    (grantedStore) => classifyStorePath(grantedStore.path) === "grouping_root",
  );
}
//@ chunk-a2q0x549.js:15022-15048 placement
/**
 * 组织记忆库的接口路径前缀。
 */
var MEMORY_STORE_PATH_PREFIX = "/v1/code/memory/";
//@ chunk-a2q0x549.js:15048-15379 placement
/**
 * 按记忆库路径判定类型：grouping、grouping_root、silo（cagt_ 前缀）或 unknown。
 */
function classifyStorePath(path) {
  let normalizedPath = stripTrailingSlashes(path);
  if (!normalizedPath.startsWith(MEMORY_STORE_PATH_PREFIX)) return "unknown";
  let parts = normalizedPath.slice(MEMORY_STORE_PATH_PREFIX.length).split("/");
  let [head, tail] = parts;
  if (head === undefined || head === "") return "unknown";
  if (parts.length === 2 && head === "grouping" && tail !== "") return "grouping";
  if (parts.length === 1 && head === "grouping-root") return "grouping_root";
  if (parts.length === 1 && head.startsWith("cagt_")) return "silo";
  return "unknown";
}
//@ chunk-a2q0x549.js:15379-15488 placement
/**
 * 列表中是否有非公开的分组（按 kind 或路径判断）。
 */
function hasPrivateGrouping(initialGrant) {
  return initialGrant.some(
    (grant) =>
      (grant.kind === "grouping" || classifyStorePath(grant.path) === "grouping") &&
      grant.visibility !== "public",
  );
}
//@ chunk-a2q0x549.js:15488-15578 placement
/**
 * 判断存储是否为 silo 型。
 */
function isSiloStore(grantedStore) {
  return (
    classifyStorePath(grantedStore.path) === "silo" &&
    grantedStore.kind !== "grouping" &&
    grantedStore.kind !== "grouping_root"
  );
}
//@ chunk-a2q0x549.js:15578-15679 placement
function isGrantedSiloStore(path) {
  return (
    classifyStorePath(path) === "silo" &&
    getOrgMemoryWriteVerdict().grantedStores?.some(
      (grantedStore) =>
        stripTrailingSlashes(grantedStore.path) === stripTrailingSlashes(path) && isSiloStore(grantedStore),
    ) === true
  );
}
//@ chunk-a2q0x549.js:15679-15977 placement
function isLiftableRootOnly(storeCount, stores, groupingCount) {
  if (groupingCount > 0 || stores.length !== storeCount) return false;
  if (hasDuplicateStorePaths(stores)) return false;
  let rootStore;
  for (let store of stores) {
    let storeKind = classifyStorePath(store.path);
    if (storeKind === "unknown" || storeKind === "grouping" || store.kind === "grouping") return false;
    if (storeKind === "grouping_root") {
      if (rootStore !== undefined || (store.kind !== undefined && store.kind !== "grouping_root"))
        return false;
      rootStore = store;
    }
  }
  return rootStore !== undefined && rootStore.mode === "rw";
}
//@ chunk-a2q0x549.js:15977-16078 placement
function hasDuplicateStorePaths(stores) {
  let seenPaths = new Set();
  for (let store of stores) {
    let normalizedPath = stripTrailingSlashes(store.path);
    if (seenPaths.has(normalizedPath)) return true;
    seenPaths.add(normalizedPath);
  }
  return false;
}
//@ chunk-a2q0x549.js:16078-16117 placement
/**
 * 根存储能否提升为可写。
 */
function isRootLiftable() {
  return getOrgMemoryWriteVerdict().rootLiftable;
}
//@ chunk-a2q0x549.js:16117-16396 placement
/**
 * 判定组织记忆镜像能否升级：无根、重复镜像、私有分组、根只读、校验失败、私有候选或可升级。
 */
function getMirrorVerdict(stores, groupingCount, storeCount, privateCandidate, liftable) {
  let found = stores.find((store) => classifyStorePath(store.path) === "grouping_root");
  if (found === undefined) return "no_root";
  if (hasDuplicateStorePaths(stores)) return "conflicted_mirror";
  if (privateCandidate) return "private_grouping";
  if (found.mode !== "rw") return "mirror_ro";
  if (!isLiftableRootOnly(storeCount, stores, groupingCount)) return "verdict_failed";
  return liftable ? "private_candidate" : "liftable";
}
//@ chunk-a2q0x549.js:16396-16437 placement
/**
 * 根不能提升的原因。
 */
function rootLiftReason() {
  return getOrgMemoryWriteVerdict().rootLiftReason;
}
//@ chunk-a2q0x549.js:16437-16515 placement
/**
 * 判断是否为分组根存储。
 */
function isGroupingRootStore(store) {
  return classifyStorePath(store.path) === "grouping_root" || store.kind === "grouping_root";
}
//@ chunk-a2q0x549.js:16515-16579 placement
/**
 * 某路径是否就是根存储。
 */
function isRootStorePath(path) {
  let groupingRootStore = findGroupingRootStore();
  return (
    groupingRootStore !== undefined &&
    stripTrailingSlashes(groupingRootStore.path) === stripTrailingSlashes(path)
  );
}
//@ chunk-a2q0x549.js:16579-16649 placement
/**
 * 判断路径的最后一段是否等于给定名字。
 */
function isStoreBasename(path, basename) {
  let normalizedPath = stripTrailingSlashes(path);
  return normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1) === basename;
}
//@ chunk-a2q0x549.js:16649-16767 placement
function findGrantedSilo(siloName) {
  let filtered = getOrgMemoryWriteVerdict().grantedStores?.filter(isSiloStore);
  let found = filtered?.find((store) => isStoreBasename(store.path, siloName));
  if (found !== undefined) return found;
  return filtered?.[0];
}
//@ chunk-a2q0x549.js:16767-16960 placement
function getSingleSiloId() {
  let siloStores = getOrgMemoryWriteVerdict().grantedStores?.filter(isSiloStore) ?? [];
  let store = siloStores.length === 1 ? siloStores[0] : undefined;
  if (store === undefined) return null;
  let normalizedPath = stripTrailingSlashes(store.path);
  let sliced = normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
  return sliced.startsWith("cagt_") ? sliced : null;
}
//@ chunk-a2q0x549.js:16960-17025 placement
/**
 * 复制当前已授权的存储列表。
 */
function grantedStoresCopy() {
  let grantedStores = getOrgMemoryWriteVerdict().grantedStores;
  return grantedStores === null ? [] : [...grantedStores];
}
//@ chunk-a2q0x549.js:17025-17070 placement
/**
 * 上一次询问是否被降级。
 */
function isLastAskDowngraded() {
  return getOrgMemoryWriteVerdict().lastAskDowngraded;
}
//@ chunk-a2q0x549.js:17070-17194 placement
/**
 * 项目配置中组织记忆写入是否开启且属于当前账号。
 */
function isOrgMemoryWritesEnabledForAccount() {
  let currentProjectConfig = getCurrentProjectConfig();
  return (
    currentProjectConfig.orgMemoryWrites === true &&
    currentProjectConfig.orgMemoryWritesAccount !== undefined &&
    currentProjectConfig.orgMemoryWritesAccount === orgMemoryAccountKey()
  );
}
//@ chunk-a2q0x549.js:17194-17785 placement
function applyOrgMemoryDecision(enabled, storageV5) {
  if (
    enabled
      ? isOrgMemoryWritesEnabledForAccount()
      : (getCurrentProjectConfig().orgMemoryWrites ?? false) === false
  )
    return "noop";
  if (enabled && !isEligibleDecisionSurface()) return "refused_session_kind";
  if (enabled && orgMemoryAccountKey() === null) return "refused_identity";
  if (enabled && !canWriteOrgMemory()) return "refused_gates";
  if (enabled && getCurrentProjectConfig().orgMemoryRead === false) return "refused_read_off";
  let accountKey = orgMemoryAccountKey();
  saveCurrentProjectConfig(
    (config) =>
      (config.orgMemoryWrites ?? false) === enabled &&
      (config.orgMemoryWritesAccount ?? undefined) === (enabled ? (accountKey ?? undefined) : undefined)
        ? config
        : {
            ...config,
            orgMemoryWrites: enabled,
            orgMemoryWritesAccount: enabled ? (accountKey ?? undefined) : undefined,
          },
    storageV5,
  );
  if (!enabled)
    import("./credential.js").then((credentialModule) => credentialModule.clearOrgMemoryCredential());
  logEvent("tengu_org_memory_writes_setting_changed", {
    enabled,
  });
  return enabled ? "granted" : "withdrawn";
}
//@ chunk-a2q0x549.js:17785-17837 placement
/**
 * 项目配置里组织记忆读取是否被关闭。
 */
function isProjectReadDisabled() {
  return getCurrentProjectConfig().orgMemoryRead === false || isOrgMemoryPolicyOpen();
}
//@ chunk-a2q0x549.js:17837-18312 placement
/**
 * 设置项目的组织记忆读取开关；关闭时同时清除写入设置与凭据并记写入关闭事件；记读取设置变化事件。
 */
function setOrgMemoryRead(enabled, storageV5) {
  if ((getCurrentProjectConfig().orgMemoryRead ?? true) === enabled) return false;
  let writesWereOn = getCurrentProjectConfig().orgMemoryWrites === true;
  saveCurrentProjectConfig(
    (config) =>
      (config.orgMemoryRead ?? true) === enabled && (enabled || config.orgMemoryWrites === undefined)
        ? config
        : enabled
          ? {
              ...config,
              orgMemoryRead: undefined,
            }
          : {
              ...config,
              orgMemoryRead: false,
              orgMemoryWrites: undefined,
              orgMemoryWritesAccount: undefined,
            },
    storageV5,
  );
  if (!enabled) {
    import("./credential.js").then((credentialModule) => credentialModule.clearOrgMemoryCredential());
    if (writesWereOn)
      logEvent("tengu_org_memory_writes_setting_changed", {
        enabled: false,
      });
  }
  logEvent("tengu_org_memory_read_setting_changed", {
    enabled,
  });
  return true;
}
//@ chunk-a2q0x549.js:18312-18344 placement
/**
 * 清除授权记录。
 */
function clearGrant() {
  getOrgMemoryWriteVerdict().clearGrant();
}
//@ chunk-a2q0x549.js:18344-18455 placement
function emitDecisionSignal(emitter, eventName) {
  try {
    emitter.emit();
  } catch (error) {
    logForDebugging(`org-memory decision ${eventName}: listener threw: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-a2q0x549.js:18455-21152 placement
class OrgMemoryDecision {
  decision = {
    state: "undecided",
  };
  servedIdentity = null;
  settleDeadlineConsumed = false;
  settled = createSignal();
  shrunk = createSignal();
  reset() {
    this.decision = {
      state: "undecided",
    };
    this.servedIdentity = null;
    this.settleDeadlineConsumed = false;
  }
  async waitForSettled(timeoutMs, signal, options) {
    if (this.decision.state !== "undecided") return;
    let unsubscribe = () => {};
    let promise = new Promise((resolve) => {
      unsubscribe = this.settled.subscribe(resolve);
    });
    try {
      if (this.decision.state !== "undecided") return;
      await Promise.race([promise, sleep(timeoutMs, signal, options)]);
    } finally {
      unsubscribe();
    }
  }
  async waitForSettledOnce(timeoutMs, signal) {
    if (this.settleDeadlineConsumed) return;
    await this.waitForSettled(timeoutMs, signal);
    if (this.decision.state === "undecided" && signal?.aborted !== true) this.settleDeadlineConsumed = true;
  }
  getStores() {
    return this.decision.state === "on" ? this.decision.stores : [];
  }
  settleOn(decision) {
    if (this.decision.state !== "undecided") return false;
    if (this.servedIdentity !== null && this.servedIdentity !== decision.identity) {
      this.settleOff("superseded");
      return false;
    }
    this.servedIdentity ??= decision.identity;
    this.decision = {
      state: "on",
      identity: decision.identity,
      stores: Object.freeze([...decision.stores]),
      request: decision.request,
      selectionSource: decision.selectionSource,
      initialGrant: Object.freeze([...decision.initialGrant]),
      degraded: decision.degraded,
    };
    emitDecisionSignal(this.settled, "settle");
    logEvent("tengu_org_memory_decision", {
      outcome: lit("on"),
      store_count: decision.stores.length,
      asked_write: decision.request.writeAccess,
      selection_source: fromEnum(decision.selectionSource),
      selection_kind: fromEnum(decision.selectionKind),
      private_selection: hasPrivateGrouping(decision.initialGrant),
      degraded: decision.degraded,
    });
    return true;
  }
  settleOff(cause) {
    if (this.decision.state !== "undecided") return false;
    this.decision = {
      state: "off",
      cause,
    };
    emitDecisionSignal(this.settled, "settle");
    logEvent("tengu_org_memory_decision", {
      outcome: lit("off"),
      cause: fromEnum(cause),
    });
    return true;
  }
  park(cause) {
    if (this.decision.state !== "on") return;
    this.decision = {
      state: "parked",
      identity: this.decision.identity,
      cause,
    };
    emitDecisionSignal(this.shrunk, "shrink");
    logEvent("tengu_org_memory_decision_parked", {
      cause: fromEnum(cause),
    });
  }
  shrinkWriteAsk() {
    if (this.decision.state !== "on" || !this.decision.request.writeAccess) return false;
    this.decision = {
      ...this.decision,
      request: {
        ...this.decision.request,
        writeAccess: false,
      },
      stores: Object.freeze(
        this.decision.stores.map((store) =>
          store.scope === "team" && store.mode === "rw"
            ? {
                ...store,
                mode: "ro",
              }
            : store,
        ),
      ),
    };
    emitDecisionSignal(this.shrunk, "shrink");
    logEvent("tengu_org_memory_decision_write_shrunk", {});
    return true;
  }
  onAuthCompletion(identity) {
    if (this.decision.state !== "on" && this.decision.state !== "parked") return;
    if (identity === this.decision.identity) return;
    let cause = identity === null ? "logout" : "account_switch";
    this.decision = {
      state: "ended",
      cause,
    };
    emitDecisionSignal(this.shrunk, "shrink");
    logEvent("tengu_org_memory_decision_ended", {
      cause: fromEnum(cause),
    });
  }
  reopen() {
    let decision = this.decision;
    if (
      decision.state === "undecided" ||
      decision.state === "ended" ||
      (decision.state === "off" && decision.cause === "superseded")
    )
      return null;
    this.decision = {
      state: "undecided",
    };
    this.settleDeadlineConsumed = false;
    logEvent("tengu_org_memory_decision_reopened", {
      from_state: fromEnum(decision.state),
      ...(decision.state !== "on" && {
        from_cause: fromEnum(decision.cause),
      }),
    });
    return decision;
  }
}
//@ chunk-a2q0x549.js:21152-21177 placement
/**
 * 按宿主保存的组织记忆决定状态。
 */
var orgMemoryDecisionState; // deferred: uses OrgMemoryDecision of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:21152", () => {
  orgMemoryDecisionState = new HostScoped(() => new OrgMemoryDecision());
});
//@ chunk-a2q0x549.js:21177-21214 placement
/**
 * 取当前宿主的决定状态。
 */
function getOrgMemoryDecisionState() {
  return orgMemoryDecisionState.of(getRootSession().host);
}
//@ chunk-a2q0x549.js:21214-21262 placement
function onOrgMemoryDecisionShrink(listener) {
  return getOrgMemoryDecisionState().shrunk.subscribe(listener);
}
//@ chunk-a2q0x549.js:21262-21311 placement
function onOrgMemoryDecisionSettled(listener) {
  return getOrgMemoryDecisionState().settled.subscribe(listener);
}
//@ chunk-a2q0x549.js:21311-21365 placement
function waitForOrgMemoryDecisionSettled(timeoutMs, signal, predicate) {
  return getOrgMemoryDecisionState().waitForSettled(timeoutMs, signal, predicate);
}
//@ chunk-a2q0x549.js:21365-21419 placement
function waitForOrgMemoryDecisionSettledOnce(predicate, options) {
  return getOrgMemoryDecisionState().waitForSettledOnce(predicate, options);
}
//@ chunk-a2q0x549.js:21419-21454 placement
function getOrgMemoryDecision() {
  return getOrgMemoryDecisionState().decision;
}
//@ chunk-a2q0x549.js:21454-21493 placement
function getDecisionStores() {
  return getOrgMemoryDecisionState().getStores();
}
//@ chunk-a2q0x549.js:21493-21535 placement
function getOrgMemoryServedIdentity() {
  return getOrgMemoryDecisionState().servedIdentity;
}
//@ chunk-a2q0x549.js:21535-21575 placement
function settleOrgMemoryDecisionOn(decision) {
  return getOrgMemoryDecisionState().settleOn(decision);
}
//@ chunk-a2q0x549.js:21575-21615 placement
function settleOrgMemoryDecisionOff(reason) {
  return getOrgMemoryDecisionState().settleOff(reason);
}
//@ chunk-a2q0x549.js:21615-21644 placement
function parkOrgMemoryDecision(reason) {
  getOrgMemoryDecisionState().park(reason);
}
//@ chunk-a2q0x549.js:21644-21688 placement
function shrinkOrgMemoryDecisionWriteAsk() {
  return getOrgMemoryDecisionState().shrinkWriteAsk();
}
//@ chunk-a2q0x549.js:21688-21729 placement
function onOrgMemoryAuthCompletion(result) {
  getOrgMemoryDecisionState().onAuthCompletion(result);
}
//@ chunk-a2q0x549.js:21729-21765 placement
function reopenOrgMemoryDecision() {
  return getOrgMemoryDecisionState().reopen();
}
export {
  getOrgMemoryDecision,
  isLastAskDowngraded,
  classifyStorePath,
  hasPrivateGrouping,
  stripTrailingSlashes,
  grantedModeFor,
  isOrgMemoryWriteOptedIn,
  canWriteOrgMemory,
  isOrgMemoryWritesEnabledForAccount,
  isMonorepoWriteBlocked,
  applyOrgMemoryDecision,
  shrinkOrgMemoryDecisionWriteAsk,
  waitForOrgMemoryDecisionSettledOnce,
  waitForOrgMemoryDecisionSettled,
  hasMirror,
  getDecisionStores,
  getOrgMemoryAccountKey,
  isEligibleDecisionSurface,
  recordVerdict,
  isSelectionPrivate,
  parkOrgMemoryDecision,
  hasRwGrantedStore,
  clearGrant,
  findGroupingStore,
  grantedStoresCopy,
  isSiloStore,
  findGroupingRootStore,
  isRootLiftable,
  rootLiftReason,
  settleOrgMemoryDecisionOff,
  isGrantedSiloStore,
  isRootStorePath,
  getSingleSiloId,
  settleOrgMemoryDecisionOn,
  findGrantedSilo,
  isStoreBasename,
  installPrivateProbe,
  onOrgMemoryDecisionShrink,
  onOrgMemoryDecisionSettled,
  getOrgMemoryServedIdentity,
  reopenOrgMemoryDecision,
  onOrgMemoryAuthCompletion,
  isProjectReadDisabled,
  setOrgMemoryRead,
};
