/**
 * services/orgMemory/orgMemoryDecision.ts
 *
 * 组织记忆读写决定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (58)
 * attribution: placement 58
 */
import { env } from "../../utils/env.js";
import { getTeammateAgentId, getRootSession } from "../../bootstrap/state.js";
import { isOnClaudeCodeSessionSurface } from "../../utils/teammate.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { count } from "../../utils/collections.js";
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

//@ chunk-82kqcve8.js:12035-12118 placement
/**
 * 当前会话是否可以做组织记忆决定（无队友/特定会话类型）。
 */
function isEligibleDecisionSurface() {
  return (
    !(env.CLAUDE_CODE_SESSION_KIND !== undefined || getTeammateAgentId() !== undefined) &&
    !isOnClaudeCodeSessionSurface()
  );
}
//@ chunk-82kqcve8.js:12118-12319 placement
var grantedStoreSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-82kqcve8.js:12118", () => {
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
//@ chunk-82kqcve8.js:12319-13847 placement
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
    let writableCount = count([...this.grantedModes.values()], (mode) => mode === "rw");
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
//@ chunk-82kqcve8.js:13847-13872 placement
/**
 * 按宿主保存的组织记忆写入判定。
 */
var orgMemoryWriteVerdict; // deferred: uses OrgMemoryWriteVerdict of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-82kqcve8.js:13847", () => {
  orgMemoryWriteVerdict = new HostScoped(() => new OrgMemoryWriteVerdict());
});
//@ chunk-82kqcve8.js:13872-13909 placement
/**
 * 取当前宿主的写入判定状态。
 */
function getOrgMemoryWriteVerdict() {
  return orgMemoryWriteVerdict.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:13909-13952 placement
/**
 * 去掉路径结尾的斜杠。
 */
function stripTrailingSlashes(path) {
  return path.replace(/\/+$/, "");
}
//@ chunk-82kqcve8.js:13952-13976 placement
/**
 * 是否拦截 monorepo 写入（当前恒 false）。
 */
function isMonorepoWriteBlocked() {
  return false;
}
//@ chunk-82kqcve8.js:13976-14079 placement
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
//@ chunk-82kqcve8.js:14079-14207 placement
/**
 * 组织记忆写入是否已由当前账号在项目配置中选择开启。
 */
function isOrgMemoryWriteOptedIn() {
  let currentProjectConfig = getCurrentProjectConfig();
  if (!canWriteOrgMemory() || currentProjectConfig.orgMemoryWrites !== true) return false;
  let orgMemoryWritesAccount = currentProjectConfig.orgMemoryWritesAccount;
  return orgMemoryWritesAccount !== undefined && orgMemoryWritesAccount === orgMemoryAccountKey();
}
//@ chunk-82kqcve8.js:14207-14265 placement
/**
 * 安装“所选存储是否私有”的探测。
 */
function installPrivateProbe(probe) {
  getOrgMemoryWriteVerdict().installPickedSelectionPrivateProbe(probe);
}
//@ chunk-82kqcve8.js:14265-14340 placement
/**
 * 判断所选存储是否被判定为私有。
 */
function isSelectionPrivate(selection) {
  return selection !== null && getOrgMemoryWriteVerdict().pickedSelectionPrivateProbe?.(selection) === true;
}
//@ chunk-82kqcve8.js:14340-14503 placement
function getOrgMemoryAccountKey() {
  if (hasMemoryApiOverride()) return "memory-dev/memory-dev";
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo?.accountUuid || !oauthAccountInfo.organizationUuid) return null;
  return `${oauthAccountInfo.accountUuid}/${oauthAccountInfo.organizationUuid}`;
}
//@ chunk-82kqcve8.js:14503-14529 placement
/**
 * 取组织记忆使用的账号键。
 */
function orgMemoryAccountKey() {
  return getOrgMemoryAccountKey();
}
//@ chunk-82kqcve8.js:14529-14567 placement
/**
 * 记录一次写入判定。
 */
function recordVerdict(stores, store, verdict) {
  getOrgMemoryWriteVerdict().record(stores, store, verdict);
}
//@ chunk-82kqcve8.js:14567-14619 placement
/**
 * 取某路径授权到的模式（rw/ro）。
 */
function grantedModeFor(path) {
  return getOrgMemoryWriteVerdict().grantedModes?.get(stripTrailingSlashes(path));
}
//@ chunk-82kqcve8.js:14619-14660 placement
/**
 * 是否已有镜像。
 */
function hasMirror() {
  return getOrgMemoryWriteVerdict().mirrorPresent;
}
//@ chunk-82kqcve8.js:14660-14773 placement
function hasRwGrantedStore() {
  let grantedModes = getOrgMemoryWriteVerdict().grantedModes;
  if (grantedModes === null) return false;
  for (let mode of grantedModes.values()) if (mode === "rw") return true;
  return false;
}
//@ chunk-82kqcve8.js:14773-14865 placement
/**
 * 查找某名字的分组存储。
 */
function findGroupingStore(groupingName) {
  return getOrgMemoryWriteVerdict().grantedStores?.find(
    (grantedStore) =>
      classifyStorePath(grantedStore.path) === "grouping" && isStoreBasename(grantedStore.path, groupingName),
  );
}
//@ chunk-82kqcve8.js:14865-14947 placement
/**
 * 查找分组根存储。
 */
function findGroupingRootStore() {
  return getOrgMemoryWriteVerdict().grantedStores?.find(
    (grantedStore) => classifyStorePath(grantedStore.path) === "grouping_root",
  );
}
//@ chunk-82kqcve8.js:14947-14973 placement
/**
 * 组织记忆库的接口路径前缀。
 */
var MEMORY_STORE_PATH_PREFIX = "/v1/code/memory/";
//@ chunk-82kqcve8.js:14973-15304 placement
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
//@ chunk-82kqcve8.js:15304-15413 placement
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
//@ chunk-82kqcve8.js:15413-15503 placement
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
//@ chunk-82kqcve8.js:15503-15604 placement
function isGrantedSiloStore(path) {
  return (
    classifyStorePath(path) === "silo" &&
    getOrgMemoryWriteVerdict().grantedStores?.some(
      (grantedStore) =>
        stripTrailingSlashes(grantedStore.path) === stripTrailingSlashes(path) && isSiloStore(grantedStore),
    ) === true
  );
}
//@ chunk-82kqcve8.js:15604-15902 placement
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
//@ chunk-82kqcve8.js:15902-16003 placement
function hasDuplicateStorePaths(stores) {
  let seenPaths = new Set();
  for (let store of stores) {
    let normalizedPath = stripTrailingSlashes(store.path);
    if (seenPaths.has(normalizedPath)) return true;
    seenPaths.add(normalizedPath);
  }
  return false;
}
//@ chunk-82kqcve8.js:16003-16042 placement
/**
 * 根存储能否提升为可写。
 */
function isRootLiftable() {
  return getOrgMemoryWriteVerdict().rootLiftable;
}
//@ chunk-82kqcve8.js:16042-16321 placement
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
//@ chunk-82kqcve8.js:16321-16362 placement
/**
 * 根不能提升的原因。
 */
function rootLiftReason() {
  return getOrgMemoryWriteVerdict().rootLiftReason;
}
//@ chunk-82kqcve8.js:16362-16440 placement
/**
 * 判断是否为分组根存储。
 */
function isGroupingRootStore(store) {
  return classifyStorePath(store.path) === "grouping_root" || store.kind === "grouping_root";
}
//@ chunk-82kqcve8.js:16440-16504 placement
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
//@ chunk-82kqcve8.js:16504-16574 placement
/**
 * 判断路径的最后一段是否等于给定名字。
 */
function isStoreBasename(path, basename) {
  let normalizedPath = stripTrailingSlashes(path);
  return normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1) === basename;
}
//@ chunk-82kqcve8.js:16574-16692 placement
function findGrantedSilo(siloName) {
  let filtered = getOrgMemoryWriteVerdict().grantedStores?.filter(isSiloStore);
  let found = filtered?.find((store) => isStoreBasename(store.path, siloName));
  if (found !== undefined) return found;
  return filtered?.[0];
}
//@ chunk-82kqcve8.js:16692-16885 placement
function getSingleSiloId() {
  let siloStores = getOrgMemoryWriteVerdict().grantedStores?.filter(isSiloStore) ?? [];
  let store = siloStores.length === 1 ? siloStores[0] : undefined;
  if (store === undefined) return null;
  let normalizedPath = stripTrailingSlashes(store.path);
  let sliced = normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
  return sliced.startsWith("cagt_") ? sliced : null;
}
//@ chunk-82kqcve8.js:16885-16950 placement
/**
 * 复制当前已授权的存储列表。
 */
function grantedStoresCopy() {
  let grantedStores = getOrgMemoryWriteVerdict().grantedStores;
  return grantedStores === null ? [] : [...grantedStores];
}
//@ chunk-82kqcve8.js:16950-16995 placement
/**
 * 上一次询问是否被降级。
 */
function isLastAskDowngraded() {
  return getOrgMemoryWriteVerdict().lastAskDowngraded;
}
//@ chunk-82kqcve8.js:16995-17119 placement
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
//@ chunk-82kqcve8.js:17119-17710 placement
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
//@ chunk-82kqcve8.js:17710-17762 placement
/**
 * 项目配置里组织记忆读取是否被关闭。
 */
function isProjectReadDisabled() {
  return getCurrentProjectConfig().orgMemoryRead === false || isOrgMemoryPolicyOpen();
}
//@ chunk-82kqcve8.js:17762-18237 placement
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
//@ chunk-82kqcve8.js:18237-18269 placement
/**
 * 清除授权记录。
 */
function clearGrant() {
  getOrgMemoryWriteVerdict().clearGrant();
}
//@ chunk-82kqcve8.js:18269-18380 placement
function emitDecisionSignal(emitter, eventName) {
  try {
    emitter.emit();
  } catch (error) {
    logForDebugging(`org-memory decision ${eventName}: listener threw: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-82kqcve8.js:18380-21077 placement
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
//@ chunk-82kqcve8.js:21077-21102 placement
/**
 * 按宿主保存的组织记忆决定状态。
 */
var orgMemoryDecisionState; // deferred: uses OrgMemoryDecision of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-82kqcve8.js:21077", () => {
  orgMemoryDecisionState = new HostScoped(() => new OrgMemoryDecision());
});
//@ chunk-82kqcve8.js:21102-21139 placement
/**
 * 取当前宿主的决定状态。
 */
function getOrgMemoryDecisionState() {
  return orgMemoryDecisionState.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:21139-21187 placement
function onOrgMemoryDecisionShrink(listener) {
  return getOrgMemoryDecisionState().shrunk.subscribe(listener);
}
//@ chunk-82kqcve8.js:21187-21236 placement
function onOrgMemoryDecisionSettled(listener) {
  return getOrgMemoryDecisionState().settled.subscribe(listener);
}
//@ chunk-82kqcve8.js:21236-21290 placement
function waitForOrgMemoryDecisionSettled(timeoutMs, signal, predicate) {
  return getOrgMemoryDecisionState().waitForSettled(timeoutMs, signal, predicate);
}
//@ chunk-82kqcve8.js:21290-21344 placement
function waitForOrgMemoryDecisionSettledOnce(predicate, options) {
  return getOrgMemoryDecisionState().waitForSettledOnce(predicate, options);
}
//@ chunk-82kqcve8.js:21344-21379 placement
function getOrgMemoryDecision() {
  return getOrgMemoryDecisionState().decision;
}
//@ chunk-82kqcve8.js:21379-21418 placement
function getDecisionStores() {
  return getOrgMemoryDecisionState().getStores();
}
//@ chunk-82kqcve8.js:21418-21460 placement
function getOrgMemoryServedIdentity() {
  return getOrgMemoryDecisionState().servedIdentity;
}
//@ chunk-82kqcve8.js:21460-21500 placement
function settleOrgMemoryDecisionOn(decision) {
  return getOrgMemoryDecisionState().settleOn(decision);
}
//@ chunk-82kqcve8.js:21500-21540 placement
function settleOrgMemoryDecisionOff(reason) {
  return getOrgMemoryDecisionState().settleOff(reason);
}
//@ chunk-82kqcve8.js:21540-21569 placement
function parkOrgMemoryDecision(reason) {
  getOrgMemoryDecisionState().park(reason);
}
//@ chunk-82kqcve8.js:21569-21613 placement
function shrinkOrgMemoryDecisionWriteAsk() {
  return getOrgMemoryDecisionState().shrinkWriteAsk();
}
//@ chunk-82kqcve8.js:21613-21654 placement
function onOrgMemoryAuthCompletion(result) {
  getOrgMemoryDecisionState().onAuthCompletion(result);
}
//@ chunk-82kqcve8.js:21654-21690 placement
function reopenOrgMemoryDecision() {
  return getOrgMemoryDecisionState().reopen();
}
export {
  isLastAskDowngraded,
  getOrgMemoryDecision,
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
  getOrgMemoryAccountKey,
  isEligibleDecisionSurface,
  recordVerdict,
  isSelectionPrivate,
  parkOrgMemoryDecision,
  hasRwGrantedStore,
  clearGrant,
  findGroupingStore,
  hasMirror,
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
  getDecisionStores,
  getOrgMemoryServedIdentity,
  reopenOrgMemoryDecision,
  waitForOrgMemoryDecisionSettled,
  waitForOrgMemoryDecisionSettledOnce,
  isProjectReadDisabled,
  setOrgMemoryRead,
  onOrgMemoryAuthCompletion,
};
