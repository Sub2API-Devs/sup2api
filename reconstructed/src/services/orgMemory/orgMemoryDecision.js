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
import { u, string, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
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
var grantedStoreSchema = DoctorLazy(() =>
  u({
    path: string().min(1),
    mode: _enum(["rw", "ro"]),
    kind: string().optional(),
    grouping_id: string().optional(),
    visibility: string().max(64).optional().catch(undefined),
    prompt_index: string().max(512).optional().catch(undefined),
  }),
);
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
  record(e, n, r) {
    this.mirrorPresent = Array.isArray(e);
    let s = Array.isArray(e) ? e : [];
    let h = 0;
    let flattened = s.flatMap((L) => {
      let j = grantedStoreSchema().safeParse(L);
      if (!j.success) {
        h += 1;
        return [];
      }
      return [j.data];
    });
    let w = hasPrivateGrouping(flattened);
    let S = r?.privateCandidate === true;
    this.rootLiftable = !r?.clampRo && !S && isLiftableRootOnly(s.length, flattened, h);
    this.rootLiftReason = getMirrorVerdict(flattened, h, s.length, w, S);
    let R = hasDuplicateStorePaths(flattened);
    let mapped = flattened.map((L) =>
      r?.clampRo || w || R || (!this.rootLiftable && isGroupingRootStore(L))
        ? {
            ...L,
            mode: "ro",
          }
        : L,
    );
    this.grantedStores = mapped;
    this.grantedModes = new Map(mapped.map((L) => [stripTrailingSlashes(L.path), L.mode]));
    let P = count([...this.grantedModes.values()], (L) => L === "rw");
    this.lastAskDowngraded =
      n &&
      P === 0 &&
      !w &&
      !R &&
      this.rootLiftReason !== "verdict_failed" &&
      this.rootLiftReason !== "private_candidate";
    if (n)
      if (R) logFeatureSad("org_memory_writes", "conflicted_mirror");
      else if (w) logFeatureSad("org_memory_writes", "private_selection_ro");
      else if (this.rootLiftReason === "private_candidate")
        logFeatureSad("org_memory_writes", "private_candidate_veto");
      else if (this.rootLiftReason === "verdict_failed") logFeatureSad("org_memory_writes", "verdict_failed");
      else if (P > 0)
        logFeatureOk("org_memory_writes", {
          granted_rw: P,
        });
      else logFeatureSad("org_memory_writes", "downgraded");
  }
}
//@ chunk-82kqcve8.js:13847-13872 placement
/**
 * 按宿主保存的组织记忆写入判定。
 */
var orgMemoryWriteVerdict = new HostScoped(() => new OrgMemoryWriteVerdict());
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
function installPrivateProbe(e) {
  getOrgMemoryWriteVerdict().installPickedSelectionPrivateProbe(e);
}
//@ chunk-82kqcve8.js:14265-14340 placement
/**
 * 判断所选存储是否被判定为私有。
 */
function isSelectionPrivate(e) {
  return e !== null && getOrgMemoryWriteVerdict().pickedSelectionPrivateProbe?.(e) === true;
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
function recordVerdict(stores, n, r) {
  getOrgMemoryWriteVerdict().record(stores, n, r);
}
//@ chunk-82kqcve8.js:14567-14619 placement
/**
 * 取某路径授权到的模式（rw/ro）。
 */
function grantedModeFor(e) {
  return getOrgMemoryWriteVerdict().grantedModes?.get(stripTrailingSlashes(e));
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
  for (let n of grantedModes.values()) if (n === "rw") return true;
  return false;
}
//@ chunk-82kqcve8.js:14773-14865 placement
/**
 * 查找某名字的分组存储。
 */
function findGroupingStore(e) {
  return getOrgMemoryWriteVerdict().grantedStores?.find(
    (grantedStore) =>
      classifyStorePath(grantedStore.path) === "grouping" && isStoreBasename(grantedStore.path, e),
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
  let n = stripTrailingSlashes(path);
  if (!n.startsWith(MEMORY_STORE_PATH_PREFIX)) return "unknown";
  let parts = n.slice(MEMORY_STORE_PATH_PREFIX.length).split("/");
  let [s, h] = parts;
  if (s === undefined || s === "") return "unknown";
  if (parts.length === 2 && s === "grouping" && h !== "") return "grouping";
  if (parts.length === 1 && s === "grouping-root") return "grouping_root";
  if (parts.length === 1 && s.startsWith("cagt_")) return "silo";
  return "unknown";
}
//@ chunk-82kqcve8.js:15304-15413 placement
/**
 * 列表中是否有非公开的分组（按 kind 或路径判断）。
 */
function hasPrivateGrouping(initialGrant) {
  return initialGrant.some(
    (n) => (n.kind === "grouping" || classifyStorePath(n.path) === "grouping") && n.visibility !== "public",
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
function isLiftableRootOnly(e, n, r) {
  if (r > 0 || n.length !== e) return false;
  if (hasDuplicateStorePaths(n)) return false;
  let s;
  for (let h of n) {
    let y = classifyStorePath(h.path);
    if (y === "unknown" || y === "grouping" || h.kind === "grouping") return false;
    if (y === "grouping_root") {
      if (s !== undefined || (h.kind !== undefined && h.kind !== "grouping_root")) return false;
      s = h;
    }
  }
  return s !== undefined && s.mode === "rw";
}
//@ chunk-82kqcve8.js:15902-16003 placement
function hasDuplicateStorePaths(e) {
  let n = new Set();
  for (let r of e) {
    let s = stripTrailingSlashes(r.path);
    if (n.has(s)) return true;
    n.add(s);
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
function getMirrorVerdict(e, n, r, s, h) {
  let found = e.find((w) => classifyStorePath(w.path) === "grouping_root");
  if (found === undefined) return "no_root";
  if (hasDuplicateStorePaths(e)) return "conflicted_mirror";
  if (s) return "private_grouping";
  if (found.mode !== "rw") return "mirror_ro";
  if (!isLiftableRootOnly(r, e, n)) return "verdict_failed";
  return h ? "private_candidate" : "liftable";
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
function isGroupingRootStore(e) {
  return classifyStorePath(e.path) === "grouping_root" || e.kind === "grouping_root";
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
function isStoreBasename(path, n) {
  let r = stripTrailingSlashes(path);
  return r.slice(r.lastIndexOf("/") + 1) === n;
}
//@ chunk-82kqcve8.js:16574-16692 placement
function findGrantedSilo(e) {
  let filtered = getOrgMemoryWriteVerdict().grantedStores?.filter(isSiloStore);
  let found = filtered?.find((s) => isStoreBasename(s.path, e));
  if (found !== undefined) return found;
  return filtered?.[0];
}
//@ chunk-82kqcve8.js:16692-16885 placement
function getSingleSiloId() {
  let e = getOrgMemoryWriteVerdict().grantedStores?.filter(isSiloStore) ?? [];
  let n = e.length === 1 ? e[0] : undefined;
  if (n === undefined) return null;
  let r = stripTrailingSlashes(n.path);
  let sliced = r.slice(r.lastIndexOf("/") + 1);
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
function applyOrgMemoryDecision(e, storageV5) {
  if (
    e ? isOrgMemoryWritesEnabledForAccount() : (getCurrentProjectConfig().orgMemoryWrites ?? false) === false
  )
    return "noop";
  if (e && !isEligibleDecisionSurface()) return "refused_session_kind";
  if (e && orgMemoryAccountKey() === null) return "refused_identity";
  if (e && !canWriteOrgMemory()) return "refused_gates";
  if (e && getCurrentProjectConfig().orgMemoryRead === false) return "refused_read_off";
  let r = orgMemoryAccountKey();
  saveCurrentProjectConfig(
    (s) =>
      (s.orgMemoryWrites ?? false) === e &&
      (s.orgMemoryWritesAccount ?? undefined) === (e ? (r ?? undefined) : undefined)
        ? s
        : {
            ...s,
            orgMemoryWrites: e,
            orgMemoryWritesAccount: e ? (r ?? undefined) : undefined,
          },
    storageV5,
  );
  if (!e) import("./chunk-7czxkfmk.js").then((s) => s.clearOrgMemoryCredential());
  logEvent("tengu_org_memory_writes_setting_changed", {
    enabled: e,
  });
  return e ? "granted" : "withdrawn";
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
function setOrgMemoryRead(e, storageV5) {
  if ((getCurrentProjectConfig().orgMemoryRead ?? true) === e) return false;
  let r = getCurrentProjectConfig().orgMemoryWrites === true;
  saveCurrentProjectConfig(
    (s) =>
      (s.orgMemoryRead ?? true) === e && (e || s.orgMemoryWrites === undefined)
        ? s
        : e
          ? {
              ...s,
              orgMemoryRead: undefined,
            }
          : {
              ...s,
              orgMemoryRead: false,
              orgMemoryWrites: undefined,
              orgMemoryWritesAccount: undefined,
            },
    storageV5,
  );
  if (!e) {
    import("./chunk-7czxkfmk.js").then((s) => s.clearOrgMemoryCredential());
    if (r)
      logEvent("tengu_org_memory_writes_setting_changed", {
        enabled: false,
      });
  }
  logEvent("tengu_org_memory_read_setting_changed", {
    enabled: e,
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
function emitDecisionSignal(e, n) {
  try {
    e.emit();
  } catch (error) {
    logForDebugging(`org-memory decision ${n}: listener threw: ${errorMessage(error)}`, {
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
  async waitForSettled(e, n, r) {
    if (this.decision.state !== "undecided") return;
    let s = () => {};
    let promise = new Promise((resolve) => {
      s = this.settled.subscribe(resolve);
    });
    try {
      if (this.decision.state !== "undecided") return;
      await Promise.race([promise, sleep(e, n, r)]);
    } finally {
      s();
    }
  }
  async waitForSettledOnce(e, n) {
    if (this.settleDeadlineConsumed) return;
    await this.waitForSettled(e, n);
    if (this.decision.state === "undecided" && n?.aborted !== true) this.settleDeadlineConsumed = true;
  }
  getStores() {
    return this.decision.state === "on" ? this.decision.stores : [];
  }
  settleOn(e) {
    if (this.decision.state !== "undecided") return false;
    if (this.servedIdentity !== null && this.servedIdentity !== e.identity) {
      this.settleOff("superseded");
      return false;
    }
    this.servedIdentity ??= e.identity;
    this.decision = {
      state: "on",
      identity: e.identity,
      stores: Object.freeze([...e.stores]),
      request: e.request,
      selectionSource: e.selectionSource,
      initialGrant: Object.freeze([...e.initialGrant]),
      degraded: e.degraded,
    };
    emitDecisionSignal(this.settled, "settle");
    logEvent("tengu_org_memory_decision", {
      outcome: lit("on"),
      store_count: e.stores.length,
      asked_write: e.request.writeAccess,
      selection_source: fromEnum(e.selectionSource),
      selection_kind: fromEnum(e.selectionKind),
      private_selection: hasPrivateGrouping(e.initialGrant),
      degraded: e.degraded,
    });
    return true;
  }
  settleOff(e) {
    if (this.decision.state !== "undecided") return false;
    this.decision = {
      state: "off",
      cause: e,
    };
    emitDecisionSignal(this.settled, "settle");
    logEvent("tengu_org_memory_decision", {
      outcome: lit("off"),
      cause: fromEnum(e),
    });
    return true;
  }
  park(e) {
    if (this.decision.state !== "on") return;
    this.decision = {
      state: "parked",
      identity: this.decision.identity,
      cause: e,
    };
    emitDecisionSignal(this.shrunk, "shrink");
    logEvent("tengu_org_memory_decision_parked", {
      cause: fromEnum(e),
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
  onAuthCompletion(e) {
    if (this.decision.state !== "on" && this.decision.state !== "parked") return;
    if (e === this.decision.identity) return;
    let n = e === null ? "logout" : "account_switch";
    this.decision = {
      state: "ended",
      cause: n,
    };
    emitDecisionSignal(this.shrunk, "shrink");
    logEvent("tengu_org_memory_decision_ended", {
      cause: fromEnum(n),
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
var orgMemoryDecisionState = new HostScoped(() => new OrgMemoryDecision());
//@ chunk-82kqcve8.js:21102-21139 placement
/**
 * 取当前宿主的决定状态。
 */
function getOrgMemoryDecisionState() {
  return orgMemoryDecisionState.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:21139-21187 placement
function onOrgMemoryDecisionShrink(e) {
  return getOrgMemoryDecisionState().shrunk.subscribe(e);
}
//@ chunk-82kqcve8.js:21187-21236 placement
function onOrgMemoryDecisionSettled(e) {
  return getOrgMemoryDecisionState().settled.subscribe(e);
}
//@ chunk-82kqcve8.js:21236-21290 placement
function waitForOrgMemoryDecisionSettled(e, n, r) {
  return getOrgMemoryDecisionState().waitForSettled(e, n, r);
}
//@ chunk-82kqcve8.js:21290-21344 placement
function waitForOrgMemoryDecisionSettledOnce(e, n) {
  return getOrgMemoryDecisionState().waitForSettledOnce(e, n);
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
function settleOrgMemoryDecisionOn(e) {
  return getOrgMemoryDecisionState().settleOn(e);
}
//@ chunk-82kqcve8.js:21500-21540 placement
function settleOrgMemoryDecisionOff(e) {
  return getOrgMemoryDecisionState().settleOff(e);
}
//@ chunk-82kqcve8.js:21540-21569 placement
function parkOrgMemoryDecision(e) {
  getOrgMemoryDecisionState().park(e);
}
//@ chunk-82kqcve8.js:21569-21613 placement
function shrinkOrgMemoryDecisionWriteAsk() {
  return getOrgMemoryDecisionState().shrinkWriteAsk();
}
//@ chunk-82kqcve8.js:21613-21654 placement
function onOrgMemoryAuthCompletion(e) {
  getOrgMemoryDecisionState().onAuthCompletion(e);
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
