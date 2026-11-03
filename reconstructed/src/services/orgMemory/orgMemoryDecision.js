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
import { u, o, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { count } from "../../utils/collections.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { Dn } from "./memoryStores.js";
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
function J4e() {
  return (
    !(env.CLAUDE_CODE_SESSION_KIND !== void 0 || getTeammateAgentId() !== void 0) &&
    !isOnClaudeCodeSessionSurface()
  );
}
//@ chunk-82kqcve8.js:12118-12319 placement
var grantedStoreSchema = DoctorLazy(() =>
  u({
    path: o().min(1),
    mode: U(["rw", "ro"]),
    kind: o().optional(),
    grouping_id: o().optional(),
    visibility: o()
      .max(64)
      .optional()
      .catch(void 0),
    prompt_index: o()
      .max(512)
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-82kqcve8.js:12319-13847 placement
class OrgMemoryWriteVerdict {
  grantedStores = null;
  grantedModes = null;
  mirrorPresent = !1;
  lastAskDowngraded = !1;
  rootLiftable = !1;
  rootLiftReason = "no_root";
  monorepoBlockLogged = !1;
  pickedSelectionPrivateProbe = null;
  clearGrant() {
    ((this.grantedStores = null),
      (this.grantedModes = null),
      (this.mirrorPresent = !1),
      (this.lastAskDowngraded = !1),
      (this.rootLiftable = !1),
      (this.rootLiftReason = "no_root"));
  }
  reset() {
    (this.clearGrant(), (this.monorepoBlockLogged = !1));
  }
  installPickedSelectionPrivateProbe(e) {
    this.pickedSelectionPrivateProbe = e;
  }
  logMonorepoWriteBlockOnce() {}
  record(e, n, r) {
    this.mirrorPresent = Array.isArray(e);
    let s = Array.isArray(e) ? e : [],
      h = 0,
      flattened = s.flatMap((L) => {
        let safeParse = grantedStoreSchema().safeParse(L);
        if (!safeParse.success) return ((h += 1), []);
        return [safeParse.data];
      }),
      w = hasPrivateGrouping(flattened),
      S = r?.privateCandidate === !0;
    ((this.rootLiftable = !r?.clampRo && !S && isLiftableRootOnly(s.length, flattened, h)),
      (this.rootLiftReason = getMirrorVerdict(flattened, h, s.length, w, S)));
    let R = hasDuplicateStorePaths(flattened),
      mapped = flattened.map((L) =>
        r?.clampRo || w || R || (!this.rootLiftable && uu(L)) ? { ...L, mode: "ro" } : L,
      );
    ((this.grantedStores = mapped), (this.grantedModes = new Map(mapped.map((L) => [rv(L.path), L.mode]))));
    let P = count([...this.grantedModes.values()], (L) => L === "rw");
    if (
      ((this.lastAskDowngraded =
        n &&
        P === 0 &&
        !w &&
        !R &&
        this.rootLiftReason !== "verdict_failed" &&
        this.rootLiftReason !== "private_candidate"),
      n)
    )
      if (R) logFeatureSad("org_memory_writes", "conflicted_mirror");
      else if (w) logFeatureSad("org_memory_writes", "private_selection_ro");
      else if (this.rootLiftReason === "private_candidate")
        logFeatureSad("org_memory_writes", "private_candidate_veto");
      else if (this.rootLiftReason === "verdict_failed") logFeatureSad("org_memory_writes", "verdict_failed");
      else if (P > 0) logFeatureOk("org_memory_writes", { granted_rw: P });
      else logFeatureSad("org_memory_writes", "downgraded");
  }
}
//@ chunk-82kqcve8.js:13847-13872 placement
var cu = new HostScoped(() => new OrgMemoryWriteVerdict());
//@ chunk-82kqcve8.js:13872-13909 placement
function Ie() {
  return cu.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:13909-13952 placement
function rv(e) {
  return e.replace(/\/+$/, "");
}
//@ chunk-82kqcve8.js:13952-13976 placement
function GEn() {
  return !1;
}
/**
 * 组织记忆是否可写：monorepo 写入被拦时记一次日志并返回 false，需有当前账号且满足前置条件。
 */
//@ chunk-82kqcve8.js:13976-14079 placement
function canWriteOrgMemory() {
  if (GEn()) return (Ie().logMonorepoWriteBlockOnce(), !1);
  if (Tn() === null) return !1;
  return Dn();
}
/**
 * 组织记忆写入是否已由当前账号在项目配置中选择开启。
 */
//@ chunk-82kqcve8.js:14079-14207 placement
function isOrgMemoryWriteOptedIn() {
  let e = getCurrentProjectConfig();
  if (!canWriteOrgMemory() || e.orgMemoryWrites !== !0) return !1;
  let orgMemoryWritesAccount = e.orgMemoryWritesAccount;
  return orgMemoryWritesAccount !== void 0 && orgMemoryWritesAccount === Tn();
}
//@ chunk-82kqcve8.js:14207-14265 placement
function vs(e) {
  Ie().installPickedSelectionPrivateProbe(e);
}
//@ chunk-82kqcve8.js:14265-14340 placement
function wo(e) {
  return e !== null && Ie().pickedSelectionPrivateProbe?.(e) === !0;
}
//@ chunk-82kqcve8.js:14340-14503 placement
function getOrgMemoryAccountKey() {
  if (hasMemoryApiOverride()) return "memory-dev/memory-dev";
  let e = getOauthAccountInfo();
  if (!e?.accountUuid || !e.organizationUuid) return null;
  return `${e.accountUuid}/${e.organizationUuid}`;
}
//@ chunk-82kqcve8.js:14503-14529 placement
function Tn() {
  return getOrgMemoryAccountKey();
}
//@ chunk-82kqcve8.js:14529-14567 placement
function bo(e, n, r) {
  Ie().record(e, n, r);
}
//@ chunk-82kqcve8.js:14567-14619 placement
function N2(e) {
  return Ie().grantedModes?.get(rv(e));
}
//@ chunk-82kqcve8.js:14619-14660 placement
function kAt() {
  return Ie().mirrorPresent;
}
//@ chunk-82kqcve8.js:14660-14773 placement
function hasRwGrantedStore() {
  let grantedModes = Ie().grantedModes;
  if (grantedModes === null) return !1;
  for (let n of grantedModes.values()) if (n === "rw") return !0;
  return !1;
}
//@ chunk-82kqcve8.js:14773-14865 placement
function vr(e) {
  return Ie().grantedStores?.find((n) => classifyStorePath(n.path) === "grouping" && Nn(n.path, e));
}
//@ chunk-82kqcve8.js:14865-14947 placement
function $n() {
  return Ie().grantedStores?.find((e) => classifyStorePath(e.path) === "grouping_root");
}
//@ chunk-82kqcve8.js:14947-14973 placement
var Ss = "/v1/code/memory/";
/**
 * 按记忆库路径判定类型：grouping、grouping_root、silo（cagt_ 前缀）或 unknown。
 */
//@ chunk-82kqcve8.js:14973-15304 placement
function classifyStorePath(e) {
  let n = rv(e);
  if (!n.startsWith(Ss)) return "unknown";
  let parts = n.slice(Ss.length).split("/"),
    [s, h] = parts;
  if (s === void 0 || s === "") return "unknown";
  if (parts.length === 2 && s === "grouping" && h !== "") return "grouping";
  if (parts.length === 1 && s === "grouping-root") return "grouping_root";
  if (parts.length === 1 && s.startsWith("cagt_")) return "silo";
  return "unknown";
}
/**
 * 列表中是否有非公开的分组（按 kind 或路径判断）。
 */
//@ chunk-82kqcve8.js:15304-15413 placement
function hasPrivateGrouping(e) {
  return e.some(
    (n) => (n.kind === "grouping" || classifyStorePath(n.path) === "grouping") && n.visibility !== "public",
  );
}
//@ chunk-82kqcve8.js:15413-15503 placement
function Ln(e) {
  return classifyStorePath(e.path) === "silo" && e.kind !== "grouping" && e.kind !== "grouping_root";
}
//@ chunk-82kqcve8.js:15503-15604 placement
function isGrantedSiloStore(e) {
  return (
    classifyStorePath(e) === "silo" && Ie().grantedStores?.some((n) => rv(n.path) === rv(e) && Ln(n)) === !0
  );
}
//@ chunk-82kqcve8.js:15604-15902 placement
function isLiftableRootOnly(e, n, r) {
  if (r > 0 || n.length !== e) return !1;
  if (hasDuplicateStorePaths(n)) return !1;
  let s;
  for (let h of n) {
    let y = classifyStorePath(h.path);
    if (y === "unknown" || y === "grouping" || h.kind === "grouping") return !1;
    if (y === "grouping_root") {
      if (s !== void 0 || (h.kind !== void 0 && h.kind !== "grouping_root")) return !1;
      s = h;
    }
  }
  return s !== void 0 && s.mode === "rw";
}
//@ chunk-82kqcve8.js:15902-16003 placement
function hasDuplicateStorePaths(e) {
  let n = new Set();
  for (let r of e) {
    let s = rv(r.path);
    if (n.has(s)) return !0;
    n.add(s);
  }
  return !1;
}
//@ chunk-82kqcve8.js:16003-16042 placement
function _o() {
  return Ie().rootLiftable;
}
/**
 * 判定组织记忆镜像能否升级：无根、重复镜像、私有分组、根只读、校验失败、私有候选或可升级。
 */
//@ chunk-82kqcve8.js:16042-16321 placement
function getMirrorVerdict(e, n, r, s, h) {
  let found = e.find((w) => classifyStorePath(w.path) === "grouping_root");
  if (found === void 0) return "no_root";
  if (hasDuplicateStorePaths(e)) return "conflicted_mirror";
  if (s) return "private_grouping";
  if (found.mode !== "rw") return "mirror_ro";
  if (!isLiftableRootOnly(r, e, n)) return "verdict_failed";
  return h ? "private_candidate" : "liftable";
}
//@ chunk-82kqcve8.js:16321-16362 placement
function Ps() {
  return Ie().rootLiftReason;
}
//@ chunk-82kqcve8.js:16362-16440 placement
function uu(e) {
  return classifyStorePath(e.path) === "grouping_root" || e.kind === "grouping_root";
}
//@ chunk-82kqcve8.js:16440-16504 placement
function Ms(e) {
  let n = $n();
  return n !== void 0 && rv(n.path) === rv(e);
}
//@ chunk-82kqcve8.js:16504-16574 placement
function Nn(e, n) {
  let r = rv(e);
  return r.slice(r.lastIndexOf("/") + 1) === n;
}
//@ chunk-82kqcve8.js:16574-16692 placement
function findGrantedSilo(e) {
  let n = Ie().grantedStores?.filter(Ln),
    r = n?.find((s) => Nn(s.path, e));
  if (r !== void 0) return r;
  return n?.[0];
}
//@ chunk-82kqcve8.js:16692-16885 placement
function getSingleSiloId() {
  let e = Ie().grantedStores?.filter(Ln) ?? [],
    n = e.length === 1 ? e[0] : void 0;
  if (n === void 0) return null;
  let r = rv(n.path),
    sliced = r.slice(r.lastIndexOf("/") + 1);
  return sliced.startsWith("cagt_") ? sliced : null;
}
//@ chunk-82kqcve8.js:16885-16950 placement
function ko() {
  let grantedStores = Ie().grantedStores;
  return grantedStores === null ? [] : [...grantedStores];
}
//@ chunk-82kqcve8.js:16950-16995 placement
function Zci() {
  return Ie().lastAskDowngraded;
}
/**
 * 项目配置中组织记忆写入是否开启且属于当前账号。
 */
//@ chunk-82kqcve8.js:16995-17119 placement
function isOrgMemoryWritesEnabledForAccount() {
  let e = getCurrentProjectConfig();
  return e.orgMemoryWrites === !0 && e.orgMemoryWritesAccount !== void 0 && e.orgMemoryWritesAccount === Tn();
}
//@ chunk-82kqcve8.js:17119-17710 placement
function applyOrgMemoryDecision(e, n) {
  if (e ? isOrgMemoryWritesEnabledForAccount() : (getCurrentProjectConfig().orgMemoryWrites ?? !1) === !1)
    return "noop";
  if (e && !J4e()) return "refused_session_kind";
  if (e && Tn() === null) return "refused_identity";
  if (e && !canWriteOrgMemory()) return "refused_gates";
  if (e && getCurrentProjectConfig().orgMemoryRead === !1) return "refused_read_off";
  let r = Tn();
  if (
    (saveCurrentProjectConfig(
      (s) =>
        (s.orgMemoryWrites ?? !1) === e &&
        (s.orgMemoryWritesAccount ?? void 0) === (e ? (r ?? void 0) : void 0)
          ? s
          : { ...s, orgMemoryWrites: e, orgMemoryWritesAccount: e ? (r ?? void 0) : void 0 },
      n,
    ),
    !e)
  )
    import("./chunk-7czxkfmk.js").then((s) => s.clearOrgMemoryCredential());
  return (logEvent("tengu_org_memory_writes_setting_changed", { enabled: e }), e ? "granted" : "withdrawn");
}
//@ chunk-82kqcve8.js:17710-17762 placement
function eui() {
  return getCurrentProjectConfig().orgMemoryRead === !1 || Dn();
}
/**
 * 设置项目的组织记忆读取开关；关闭时同时清除写入设置与凭据并记写入关闭事件；记读取设置变化事件。
 */
//@ chunk-82kqcve8.js:17762-18237 placement
function setOrgMemoryRead(e, n) {
  if ((getCurrentProjectConfig().orgMemoryRead ?? !0) === e) return !1;
  let r = getCurrentProjectConfig().orgMemoryWrites === !0;
  if (
    (saveCurrentProjectConfig(
      (s) =>
        (s.orgMemoryRead ?? !0) === e && (e || s.orgMemoryWrites === void 0)
          ? s
          : e
            ? { ...s, orgMemoryRead: void 0 }
            : { ...s, orgMemoryRead: !1, orgMemoryWrites: void 0, orgMemoryWritesAccount: void 0 },
      n,
    ),
    !e)
  ) {
    if ((import("./chunk-7czxkfmk.js").then((s) => s.clearOrgMemoryCredential()), r))
      logEvent("tengu_org_memory_writes_setting_changed", { enabled: !1 });
  }
  return (logEvent("tengu_org_memory_read_setting_changed", { enabled: e }), !0);
}
//@ chunk-82kqcve8.js:18237-18269 placement
function As() {
  Ie().clearGrant();
}
//@ chunk-82kqcve8.js:18269-18380 placement
function emitDecisionSignal(e, n) {
  try {
    e.emit();
  } catch (error) {
    logForDebugging(`org-memory decision ${n}: listener threw: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-82kqcve8.js:18380-21077 placement
class OrgMemoryDecision {
  decision = { state: "undecided" };
  servedIdentity = null;
  settleDeadlineConsumed = !1;
  settled = createSignal();
  shrunk = createSignal();
  reset() {
    ((this.decision = { state: "undecided" }),
      (this.servedIdentity = null),
      (this.settleDeadlineConsumed = !1));
  }
  async waitForSettled(e, n, r) {
    if (this.decision.state !== "undecided") return;
    let s = () => {},
      promise = new Promise((y) => {
        s = this.settled.subscribe(y);
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
    if ((await this.waitForSettled(e, n), this.decision.state === "undecided" && n?.aborted !== !0))
      this.settleDeadlineConsumed = !0;
  }
  getStores() {
    return this.decision.state === "on" ? this.decision.stores : [];
  }
  settleOn(e) {
    if (this.decision.state !== "undecided") return !1;
    if (this.servedIdentity !== null && this.servedIdentity !== e.identity)
      return (this.settleOff("superseded"), !1);
    return (
      (this.servedIdentity ??= e.identity),
      (this.decision = {
        state: "on",
        identity: e.identity,
        stores: Object.freeze([...e.stores]),
        request: e.request,
        selectionSource: e.selectionSource,
        initialGrant: Object.freeze([...e.initialGrant]),
        degraded: e.degraded,
      }),
      emitDecisionSignal(this.settled, "settle"),
      logEvent("tengu_org_memory_decision", {
        outcome: lit("on"),
        store_count: e.stores.length,
        asked_write: e.request.writeAccess,
        selection_source: fromEnum(e.selectionSource),
        selection_kind: fromEnum(e.selectionKind),
        private_selection: hasPrivateGrouping(e.initialGrant),
        degraded: e.degraded,
      }),
      !0
    );
  }
  settleOff(e) {
    if (this.decision.state !== "undecided") return !1;
    return (
      (this.decision = { state: "off", cause: e }),
      emitDecisionSignal(this.settled, "settle"),
      logEvent("tengu_org_memory_decision", { outcome: lit("off"), cause: fromEnum(e) }),
      !0
    );
  }
  park(e) {
    if (this.decision.state !== "on") return;
    ((this.decision = { state: "parked", identity: this.decision.identity, cause: e }),
      emitDecisionSignal(this.shrunk, "shrink"),
      logEvent("tengu_org_memory_decision_parked", { cause: fromEnum(e) }));
  }
  shrinkWriteAsk() {
    if (this.decision.state !== "on" || !this.decision.request.writeAccess) return !1;
    return (
      (this.decision = {
        ...this.decision,
        request: { ...this.decision.request, writeAccess: !1 },
        stores: Object.freeze(
          this.decision.stores.map((store) =>
            store.scope === "team" && store.mode === "rw" ? { ...store, mode: "ro" } : store,
          ),
        ),
      }),
      emitDecisionSignal(this.shrunk, "shrink"),
      logEvent("tengu_org_memory_decision_write_shrunk", {}),
      !0
    );
  }
  onAuthCompletion(e) {
    if (this.decision.state !== "on" && this.decision.state !== "parked") return;
    if (e === this.decision.identity) return;
    let n = e === null ? "logout" : "account_switch";
    ((this.decision = { state: "ended", cause: n }),
      emitDecisionSignal(this.shrunk, "shrink"),
      logEvent("tengu_org_memory_decision_ended", { cause: fromEnum(n) }));
  }
  reopen() {
    let decision = this.decision;
    if (
      decision.state === "undecided" ||
      decision.state === "ended" ||
      (decision.state === "off" && decision.cause === "superseded")
    )
      return null;
    return (
      (this.decision = { state: "undecided" }),
      (this.settleDeadlineConsumed = !1),
      logEvent("tengu_org_memory_decision_reopened", {
        from_state: fromEnum(decision.state),
        ...(decision.state !== "on" && { from_cause: fromEnum(decision.cause) }),
      }),
      decision
    );
  }
}
//@ chunk-82kqcve8.js:21077-21102 placement
var mu = new HostScoped(() => new OrgMemoryDecision());
//@ chunk-82kqcve8.js:21102-21139 placement
function Ge() {
  return mu.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:21139-21187 placement
function onOrgMemoryDecisionShrink(e) {
  return Ge().shrunk.subscribe(e);
}
//@ chunk-82kqcve8.js:21187-21236 placement
function onOrgMemoryDecisionSettled(e) {
  return Ge().settled.subscribe(e);
}
//@ chunk-82kqcve8.js:21236-21290 placement
function waitForOrgMemoryDecisionSettled(e, n, r) {
  return Ge().waitForSettled(e, n, r);
}
//@ chunk-82kqcve8.js:21290-21344 placement
function waitForOrgMemoryDecisionSettledOnce(e, n) {
  return Ge().waitForSettledOnce(e, n);
}
//@ chunk-82kqcve8.js:21344-21379 placement
function getOrgMemoryDecision() {
  return Ge().decision;
}
//@ chunk-82kqcve8.js:21379-21418 placement
function getDecisionStores() {
  return Ge().getStores();
}
//@ chunk-82kqcve8.js:21418-21460 placement
function getOrgMemoryServedIdentity() {
  return Ge().servedIdentity;
}
//@ chunk-82kqcve8.js:21460-21500 placement
function settleOrgMemoryDecisionOn(e) {
  return Ge().settleOn(e);
}
//@ chunk-82kqcve8.js:21500-21540 placement
function settleOrgMemoryDecisionOff(e) {
  return Ge().settleOff(e);
}
//@ chunk-82kqcve8.js:21540-21569 placement
function parkOrgMemoryDecision(e) {
  Ge().park(e);
}
//@ chunk-82kqcve8.js:21569-21613 placement
function shrinkOrgMemoryDecisionWriteAsk() {
  return Ge().shrinkWriteAsk();
}
//@ chunk-82kqcve8.js:21613-21654 placement
function onOrgMemoryAuthCompletion(e) {
  Ge().onAuthCompletion(e);
}
//@ chunk-82kqcve8.js:21654-21690 placement
function reopenOrgMemoryDecision() {
  return Ge().reopen();
}

export {
  Zci,
  getOrgMemoryDecision,
  classifyStorePath,
  hasPrivateGrouping,
  rv,
  N2,
  isOrgMemoryWriteOptedIn,
  canWriteOrgMemory,
  isOrgMemoryWritesEnabledForAccount,
  GEn,
  applyOrgMemoryDecision,
  shrinkOrgMemoryDecisionWriteAsk,
  getOrgMemoryAccountKey,
  J4e,
  bo,
  wo,
  parkOrgMemoryDecision,
  hasRwGrantedStore,
  As,
  vr,
  kAt,
  ko,
  Ln,
  $n,
  _o,
  Ps,
  settleOrgMemoryDecisionOff,
  isGrantedSiloStore,
  Ms,
  getSingleSiloId,
  settleOrgMemoryDecisionOn,
  findGrantedSilo,
  Nn,
  vs,
  onOrgMemoryDecisionShrink,
  onOrgMemoryDecisionSettled,
  getDecisionStores,
  getOrgMemoryServedIdentity,
  reopenOrgMemoryDecision,
  waitForOrgMemoryDecisionSettled,
  waitForOrgMemoryDecisionSettledOnce,
  eui,
  setOrgMemoryRead,
  onOrgMemoryAuthCompletion,
};
