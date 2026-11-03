/**
 * services/orgMemory/discovery.ts
 *
 * 组织记忆库发现（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (36)
 * attribution: placement 36
 */
import {
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
} from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, M, A, oe, o, U, E, pe } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  kr,
  yPe,
  Ct,
  Jpe,
  classifySelectionKind,
  getEffectiveSelection,
  isOrgMemoryDiscoveryEnabled,
} from "./selection.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import {
  Yie,
  validateMemoryStores,
  isValidRelativeSegments,
  getOrgMemoryPolicyState,
  _r,
} from "./memoryStores.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFileReader } from "../../utils/fileStore.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { hasMemoryApiOverride, memoryApiTarget } from "../../utils/teleport/api.js";
import {
  getOrgMemoryAccountKey,
  vr,
  rv,
  getOrgMemoryDecision,
  kAt,
  N2,
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
} from "./orgMemoryDecision.js";
import { apiClient } from "../routines/routinesApi.js";
import { sleep } from "../../utils/sleep.js";
import { count } from "../../utils/collections.js";
import { memoizeWithTTL } from "../../utils/memoize.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  wasLastMintSelectionDegraded,
  negotiateOrgMemoryCredential,
  clearOrgMemoryCredential,
} from "./credential.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { getCwd } from "../../utils/cwd.js";
import { F4t } from "../../utils/focusMode.js";
import { getCurrentProjectConfig, checkHasTrustDialogAccepted } from "../../utils/config.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-82kqcve8.js:46971-47411 placement
var ORG_MEMORY_MOUNTS_PATH = "/v1/code/local/memory/mounts",
  ORG_MEMORY_DISCOVERY_JSON = "org-memory-discovery.json",
  Ju = 86400000,
  em = DoctorLazy(() =>
    u({
      enabled: M(),
      stores: A(oe()).default([]),
      write_opt_in_available: oe().optional(),
      candidates: oe().optional(),
    }),
  ),
  tm = DoctorLazy(() =>
    u({
      kind: o().min(1).max(64),
      id: o()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9_-]+$/),
      name: o()
        .min(1)
        .max(256)
        .regex(/^[^\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]+$/),
      visibility: U(["public", "private"]),
      default: M().optional(),
    }),
  );
/**
 * 解析发现接口返回的候选记忆库：只保留合法的 workspace_silo（cagt_ 前缀）与 project，按 ID 去重。
 */
//@ chunk-82kqcve8.js:47411-47832 placement
function parseStoreCandidates(e) {
  if (!Array.isArray(e)) return [];
  let n = [],
    r = new Set();
  for (let s of e) {
    let safeParse = tm().safeParse(s);
    if (!safeParse.success) continue;
    let { kind: kind, id: id, name: S, visibility: visibility } = safeParse.data;
    if (kind === "workspace_silo" && !id.startsWith("cagt_")) continue;
    if (kind === "project" && !kr(id)) continue;
    if (kind !== "workspace_silo" && kind !== "project") continue;
    if (r.has(id)) continue;
    (r.add(id),
      n.push({
        kind: kind,
        id: id,
        name: S,
        visibility: visibility,
        isDefault: safeParse.data.default === !0,
      }));
  }
  return n;
}
//@ chunk-82kqcve8.js:47832-48002 placement
var discoveryCacheEntrySchema = DoctorLazy(() =>
    u({
      fetchedAt: E(),
      account: o(),
      stores: A(oe()).nullable(),
      candidates: oe().optional(),
      writeOptInAvailable: oe().optional(),
    }),
  ),
  discoveryCacheFileSchema = DoctorLazy(() => u({ entries: pe(o(), oe()) }));
/**
 * ~/.claude/cache/org-memory-discovery.json。旧版名 getCacheDir_2 为错配（记忆发现模块）。
 */
//@ chunk-82kqcve8.js:48002-48043 placement = getCacheDir (1)
function getOrgMemoryDiscoveryCachePath() {
  return join_4(getClaudeConfigDir(), "cache", ORG_MEMORY_DISCOVERY_JSON);
}
//@ chunk-82kqcve8.js:48043-48086 placement
var cache = STORAGE_SPACES.cache("org-memory-discovery", ORG_MEMORY_DISCOVERY_JSON);
//@ chunk-82kqcve8.js:48086-48518 placement
async function readDiscoveryCache(e) {
  if (Yie(e)) return {};
  try {
    let n;
    if (!isStorageV5Enabled() || e === void 0)
      n = await getFileReader().read(getOrgMemoryDiscoveryCachePath());
    else {
      let read = await e.read([cache]);
      if (!read.ok)
        return (
          logForDebugging(`org-memory-discovery: cache read failed: ${formatStorageError(read.error)}`),
          {}
        );
      let h = read.value.items[0];
      if (!h.found) return {};
      n = Buffer.from(h.value).toString("utf8");
    }
    let safeParse = discoveryCacheFileSchema().safeParse(jsonParse(n));
    if (safeParse.success) return safeParse.data.entries;
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`org-memory-discovery: cache read failed: ${errorMessage(error)}`);
  }
  return {};
}
//@ chunk-82kqcve8.js:48518-48650 placement
async function readDiscoveryCacheEntries(e) {
  let n = {};
  for (let [r, s] of Object.entries(await readDiscoveryCache(e))) {
    let safeParse = discoveryCacheEntrySchema().safeParse(s);
    if (safeParse.success) n[r] = safeParse.data;
  }
  return n;
}
//@ chunk-82kqcve8.js:48650-48711 placement
function im(e) {
  if (e === void 0) return !1;
  return da(e.fetchedAt);
}
//@ chunk-82kqcve8.js:48711-48763 placement
function da(e) {
  let n = Date.now() - e;
  return n >= 0 && n < Ju;
}
//@ chunk-82kqcve8.js:48763-49244 placement
async function writeDiscoveryCache(e, n, r) {
  try {
    let s = await readDiscoveryCache(r);
    for (let [y, w] of Object.entries(s)) {
      let S = w?.fetchedAt;
      if (typeof S === "number" && !da(S)) delete s[y];
    }
    if (((s[e] = n), isStorageV5Enabled() && r !== void 0)) {
      let write = await r.write(cache, jsonStringify({ entries: s }), { mode: 438 & ~process.umask() });
      if (!write.ok)
        logForDebugging(`org-memory-discovery: cache write failed: ${formatStorageError(write.error)}`);
      return;
    }
    if (Yie(r)) return;
    let h = getFileReader();
    (await h.mkdir(join_4(getClaudeConfigDir(), "cache")),
      await h.atomicWrite(getOrgMemoryDiscoveryCachePath(), jsonStringify({ entries: s })));
  } catch (error) {
    logForDebugging(`org-memory-discovery: cache write failed: ${errorMessage(error)}`);
  }
}
//@ chunk-82kqcve8.js:49244-49454 placement
function isMemoryApiPath(e) {
  try {
    let r = new URL(e, "https://sentinel.invalid");
    return (
      r.origin === "https://sentinel.invalid" &&
      e === r.pathname &&
      !r.pathname.includes("%") &&
      r.pathname.startsWith("/v1/code/memory/")
    );
  } catch {
    return !1;
  }
}
//@ chunk-82kqcve8.js:49454-49491 placement
function Oo() {
  return hasMemoryApiOverride() ? null : getOrgMemoryAccountKey();
}
//@ chunk-82kqcve8.js:49491-50121 placement
async function fetchOrgMemoryDiscovery(e) {
  try {
    let n = await apiClient.get(ORG_MEMORY_MOUNTS_PATH, {
      ...memoryApiTarget(),
      credentials: e,
      timeout: 5000,
      validateStatus: (s) => s === 200 || s === 404,
    });
    if (!n.ok) return (logForDebugging(`org-memory-discovery: skipped (${n.reason})`), { kind: "transient" });
    if (n.status === 404) return { kind: "off" };
    let safeParse = em().safeParse(n.data);
    if (!safeParse.success)
      return (
        logForDebugging(`org-memory-discovery: malformed response: ${safeParse.error.message}`, {
          level: "warn",
        }),
        { kind: "transient" }
      );
    if (!safeParse.data.enabled) return { kind: "off" };
    return {
      kind: "stores",
      stores: safeParse.data.stores,
      candidates: safeParse.data.candidates,
      writeOptIn: safeParse.data.write_opt_in_available,
    };
  } catch (error) {
    return (
      logForDebugging(`org-memory-discovery: fetch failed: ${errorMessage(error)}`),
      { kind: "transient" }
    );
  }
}
//@ chunk-82kqcve8.js:50121-50732 placement
function parseDiscoveryStores(e) {
  let n;
  try {
    n = validateMemoryStores(e, "org memory discovery");
  } catch (error) {
    return (
      logForDebugging(`org-memory-discovery: invalid stores payload: ${errorMessage(error)}`, {
        level: "warn",
      }),
      { kind: "invalid" }
    );
  }
  if (n === null) return { kind: "empty" };
  let filtered = n.filter((h) => h.scope === "team");
  if (filtered.length < n.length)
    logForDebugging(`org-memory-discovery: dropped ${n.length - filtered.length} non-team store(s)`, {
      level: "warn",
    });
  let filtered_2 = filtered.filter((h) => isMemoryApiPath(h.path));
  if (filtered_2.length < filtered.length)
    logForDebugging(
      `org-memory-discovery: dropped ${filtered.length - filtered_2.length} non-code-memory store path(s)`,
      { level: "warn" },
    );
  if (filtered_2.length === 0) return { kind: "empty" };
  return { kind: "configs", configs: filtered_2.map((h) => (h.mode === "ro" ? h : { ...h, mode: "ro" })) };
}
//@ chunk-82kqcve8.js:50732-50772 placement
var MEMORY_MD = "MEMORY.md",
  PUBLIC_PROJECTS_2 = "public_projects";
//@ chunk-82kqcve8.js:50772-50879 placement
function getSelectionLayer(e) {
  if (yPe(e)) return "root";
  if (Ct(e)) return "silo";
  return kr(e) && vr(e) === void 0 ? "root" : "grouping";
}
//@ chunk-82kqcve8.js:50879-51146 placement
function renameSquattingMount(e, n, r) {
  let s = (h) => h.mount === n && rv(h.path) !== rv(r);
  if (!e.some(s)) return e;
  return (
    logForDebugging(
      `org-memory-discovery: discovered config squatting the derived mount name ${n} \u2014 renamed aside`,
      { level: "warn" },
    ),
    e.map((h) => (s(h) ? { ...h, mount: `${h.mount}_discovered` } : h))
  );
}
//@ chunk-82kqcve8.js:51146-51163 placement
var am = 3,
  lm = 1500;
//@ chunk-82kqcve8.js:51163-51190 placement
function na() {
  return sleep(lm);
}
//@ chunk-82kqcve8.js:51190-51393 placement
async function writeDiscoveryCacheEntry(e, n, r, s) {
  await writeDiscoveryCache(
    e,
    {
      fetchedAt: Date.now(),
      account: n,
      stores: r.stores,
      ...(r.candidates !== void 0 && { candidates: r.candidates }),
      ...(r.writeOptIn !== void 0 && { writeOptInAvailable: r.writeOptIn }),
    },
    s,
  );
}
//@ chunk-82kqcve8.js:51393-51592 placement
function getCandidateTelemetry(e) {
  return {
    candidates: e.length,
    candidate_count_public: count(e, (n) => n.kind === "project" && n.visibility === "public"),
    candidate_count_private: count(e, (n) => n.kind === "project" && n.visibility === "private"),
  };
}
//@ chunk-82kqcve8.js:51592-51616 placement
var dm = 3600000,
  um = 15000;
/**
 * 组织记忆库发现：读写缓存、选择器、授权缺失处理
 */
//@ chunk-82kqcve8.js:51616-62965 placement
class OrgMemoryDiscovery {
  lastPickerData = null;
  discoveryGeneration = 0;
  grantMissingEmitted = !1;
  selectionNotGrantedEmitted = !1;
  promptIndexFallbackEmitted = !1;
  identityWaitSpentGen = -1;
  identityWaitDelay;
  decidingRun = !1;
  decisionRunEverStarted = !1;
  shrinkSubscribed = !1;
  disarmLateSettleRebuild = null;
  reconnectChain = Promise.resolve();
  storageV5 = void 0;
  credentials = void 0;
  discoverMemoized = memoizeWithTTL(
    () => this.runDiscovery(),
    dm,
    () => !(this.decidingRun && getOrgMemoryDecision().state === "undecided"),
  );
  constructor(e = na) {
    this.identityWaitDelay = e;
  }
  setIdentityWaitDelay(e) {
    this.identityWaitDelay = e ?? na;
  }
  clearCaches() {
    ((this.lastPickerData = null), this.discoverMemoized.cache.clear());
  }
  clearAccountState() {
    (this.discoveryGeneration++,
      (this.grantMissingEmitted = !1),
      (this.selectionNotGrantedEmitted = !1),
      (this.promptIndexFallbackEmitted = !1),
      this.clearCaches());
  }
  reset() {
    (this.disarmLateSettleRebuild?.(),
      (this.disarmLateSettleRebuild = null),
      (this.discoveryGeneration = 0),
      (this.grantMissingEmitted = !1),
      (this.selectionNotGrantedEmitted = !1),
      (this.promptIndexFallbackEmitted = !1),
      (this.identityWaitSpentGen = -1),
      (this.decidingRun = !1),
      (this.decisionRunEverStarted = !1),
      (this.reconnectChain = Promise.resolve()),
      (this.storageV5 = void 0),
      (this.credentials = void 0),
      this.clearCaches());
  }
  adoptHandIns(e, n) {
    if (e !== void 0) this.storageV5 = e;
    if (n === void 0) return;
    if (this.credentials !== void 0 && this.credentials !== n) {
      logForDebugging(
        "org-memory-discovery: a credentials store was already handed in; the later one is ignored",
      );
      return;
    }
    this.credentials = n;
  }
  emitGrantMissingOnce() {
    if (!this.grantMissingEmitted)
      ((this.grantMissingEmitted = !0), logFeatureSad("org_memory_picker", "grant_missing"));
  }
  pickedCandidateIsPrivate(e) {
    return this.lastPickerData?.candidates.some((n) => n.id === e && n.visibility === "private") === !0;
  }
  rootPromptIndexFocus(e) {
    let prompt_index = e.prompt_index;
    if (prompt_index !== void 0 && isValidRelativeSegments(prompt_index))
      return { index: prompt_index, source: "mirror" };
    if (!this.promptIndexFallbackEmitted && !wasLastMintSelectionDegraded())
      ((this.promptIndexFallbackEmitted = !0), logFeatureSad("org_memory_picker", "prompt_index_absent"));
    return { index: MEMORY_MD, source: "fallback" };
  }
  withSelectedGroupingMounts(e, n, r) {
    let s = kAt() ? e.filter((P) => N2(P.path) !== void 0) : e,
      h = vr(n);
    if (h === void 0) {
      if (!wasLastMintSelectionDegraded()) this.emitGrantMissingOnce();
      return s;
    }
    if (!isMemoryApiPath(h.path))
      return (
        logForDebugging(
          "org-memory-discovery: granted grouping path failed the partition pin \u2014 not mounting",
          { level: "warn" },
        ),
        this.emitGrantMissingOnce(),
        s
      );
    let y = [...s],
      w = (P) => y.some((L) => rv(L.path) === rv(P)),
      S = (P, L) => {
        if (w(L)) return !0;
        return ((y = renameSquattingMount(y, P, L)), !1);
      };
    for (let P of ko().filter(Ln)) {
      let L = rv(P.path),
        sliced = L.slice(L.lastIndexOf("/") + 1);
      if (!sliced.startsWith("cagt_") || !isMemoryApiPath(P.path)) {
        logForDebugging(
          "org-memory-discovery: granted silo entry failed the tag or partition pin \u2014 not mounting",
          { level: "warn" },
        );
        continue;
      }
      let G = `silo_${sliced.replace(/[^A-Za-z0-9_-]/g, "-")}`;
      if (S(G, P.path)) continue;
      y.push({
        path: P.path,
        mount: G,
        scope: "team",
        mode: r && P.mode === "rw" ? "rw" : "ro",
        promptIndex: "MEMORY.md",
      });
    }
    let R = `project_${n.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    if (!S(R, h.path))
      y.push({
        path: h.path,
        mount: R,
        scope: "team",
        mode: "ro",
        promptIndex: "MEMORY.md",
        ...(h.visibility === "private" && { owned: !0 }),
      });
    else if (h.visibility === "private")
      y.forEach((P, L) => {
        if (rv(P.path) === rv(h.path)) y[L] = { ...P, owned: !0 };
      });
    let O = $n();
    if (O !== void 0 && isMemoryApiPath(O.path) && !S(PUBLIC_PROJECTS_2, O.path))
      y.push({ path: O.path, mount: PUBLIC_PROJECTS_2, scope: "team", mode: "ro", promptIndex: MEMORY_MD });
    return y;
  }
  withSelectedGroupingRootMount(e, n, r) {
    let s = kAt() ? e.filter((j) => N2(j.path) !== void 0) : e,
      h = $n();
    if (h === void 0) {
      if (!wasLastMintSelectionDegraded()) this.emitGrantMissingOnce();
      return s;
    }
    if (!isMemoryApiPath(h.path))
      return (
        logForDebugging(
          "org-memory-discovery: granted grouping-root path failed the partition pin \u2014 not mounting",
          { level: "warn" },
        ),
        this.emitGrantMissingOnce(),
        s
      );
    let y = yPe(n) ? void 0 : this.rootPromptIndexFocus(h),
      w = yPe(n),
      S = r && !w && _o() ? "rw" : "ro";
    if (r) {
      let j = Ps();
      logEvent("tengu_org_memory_root_write_outcome", {
        outcome: fromEnum(
          S === "rw"
            ? "rw_granted"
            : w
              ? "legacy_selection"
              : j === "private_candidate"
                ? "private_candidate_veto"
                : j === "conflicted_mirror"
                  ? "conflicted_mirror"
                  : j === "private_grouping"
                    ? "private_grouping"
                    : j === "mirror_ro"
                      ? "mirror_ro"
                      : "verdict_failed",
        ),
      });
    }
    let any = s.some((j) => rv(j.path) === rv(h.path)),
      O = any ? s : renameSquattingMount(s, PUBLIC_PROJECTS_2, h.path),
      P = any
        ? y === void 0
          ? O
          : O.map((j) => (rv(j.path) === rv(h.path) ? { ...j, promptIndex: y.index } : j))
        : [
            ...O,
            {
              path: h.path,
              mount: PUBLIC_PROJECTS_2,
              scope: "team",
              mode: S,
              promptIndex: y?.index ?? MEMORY_MD,
            },
          ],
      found = P.find((j) => rv(j.path) === rv(h.path));
    return (
      logEvent("tengu_org_memory_root_mount_derived", {
        mount_name: found?.mount === PUBLIC_PROJECTS_2 ? lit(PUBLIC_PROJECTS_2) : lit("discovered"),
        mode: fromEnum(found?.mode ?? "ro"),
        prompt_index_source: fromEnum(y?.source ?? "none"),
      }),
      P
    );
  }
  async awaitSelectionIdentity() {
    let e = Jpe();
    if (e !== null) return e;
    if (this.identityWaitSpentGen === this.discoveryGeneration) return null;
    this.identityWaitSpentGen = this.discoveryGeneration;
    for (let n = 0; e === null && n < am; n++) (await this.identityWaitDelay(), (e = Jpe()));
    return e;
  }
  async applyGrantAdjustments(e, n, r) {
    let s = getOrgMemoryDecision();
    if (s.state !== "undecided") return s.state === "on" ? [...s.stores] : null;
    if (!this.decidingRun) return null;
    let awaitSelectionIdentity = await this.awaitSelectionIdentity(),
      y = () => {
        if (this.discoveryGeneration !== e) return !0;
        let j = n ?? awaitSelectionIdentity;
        if (j === null) return !1;
        let G = Jpe();
        return G !== null && G !== j;
      };
    if (y()) return (settleOrgMemoryDecisionOff("superseded"), null);
    if (awaitSelectionIdentity === null)
      return (
        settleOrgMemoryDecisionOff("identity_unresolved"),
        logForDebugging(
          "org-memory-discovery: identity unresolved at decision time \u2014 org memory off for this session",
        ),
        null
      );
    let w;
    try {
      w = await negotiateOrgMemoryCredential(this.credentials, this.storageV5);
    } catch (error) {
      return (
        logForDebugging(`org-memory-discovery: decision-time negotiation failed: ${errorMessage(error)}`),
        settleOrgMemoryDecisionOff(this.discoveryGeneration === e ? "negotiation_failed" : "superseded"),
        null
      );
    }
    let request = w.request,
      R = request.selection !== null && kr(request.selection) && _o(),
      O = request.writeAccess
        ? r.map((j) => {
            if (N2(j.path) !== "rw") return j;
            if (isGrantedSiloStore(j.path)) return { ...j, mode: "rw" };
            if (R && Ms(j.path)) return { ...j, mode: "rw" };
            return j;
          })
        : r;
    if (request.selection !== null) {
      let j = getSelectionLayer(request.selection);
      O =
        j === "root"
          ? this.withSelectedGroupingRootMount(O, request.selection, request.writeAccess)
          : j === "silo"
            ? this.withSelectedSiloMount(O, request.selection, request.writeAccess)
            : this.withSelectedGroupingMounts(O, request.selection, request.writeAccess);
    } else if (kAt()) O = O.filter((j) => N2(j.path) !== void 0);
    if (y()) return (settleOrgMemoryDecisionOff("superseded"), null);
    if (O.length === 0) return (settleOrgMemoryDecisionOff("no_stores"), null);
    let P = request.selection === null && !w.degraded ? getSingleSiloId() : null;
    if (
      !settleOrgMemoryDecisionOn({
        identity: awaitSelectionIdentity,
        stores: O,
        request: { writeAccess: request.writeAccess, selection: request.selection ?? P },
        selectionKind: classifySelectionKind(request.selection ?? P),
        selectionSource: request.selection !== null ? "preference" : P !== null ? "pinned_default" : "none",
        initialGrant: ko(),
        degraded: w.degraded,
      })
    )
      return null;
    return O;
  }
  withSelectedSiloMount(e, n, r) {
    if (!kAt()) return e;
    let filtered = e.filter((w) => N2(w.path) !== void 0),
      h = findGrantedSilo(n);
    if (h === void 0) return (this.emitGrantMissingOnce(), filtered);
    if (!isMemoryApiPath(h.path))
      return (
        logForDebugging(
          "org-memory-discovery: granted silo path failed the partition pin \u2014 not mounting",
          { level: "warn" },
        ),
        this.emitGrantMissingOnce(),
        filtered
      );
    if (!Nn(h.path, n)) {
      if (!this.selectionNotGrantedEmitted && !wasLastMintSelectionDegraded())
        ((this.selectionNotGrantedEmitted = !0), logFeatureSad("org_memory_picker", "selection_not_granted"));
      return filtered;
    }
    if (filtered.some((w) => rv(w.path) === rv(h.path))) return filtered;
    let y = `silo_${n.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    if (filtered.some((w) => w.mount === y)) return filtered;
    return [
      ...filtered,
      {
        path: h.path,
        mount: y,
        scope: "team",
        mode: r && h.mode === "rw" ? "rw" : "ro",
        promptIndex: "MEMORY.md",
      },
    ];
  }
  async runDiscovery() {
    let discoveryGeneration = this.discoveryGeneration;
    vs((O) => this.pickedCandidateIsPrivate(O));
    let n = (O) => {
      if (discoveryGeneration === this.discoveryGeneration) this.lastPickerData = O;
    };
    switch (getOrgMemoryPolicyState()) {
      case "held":
        return null;
      case "closed":
        if (_r()) return null;
        return (settleOrgMemoryDecisionOff("gates_closed"), null);
      case "open":
        break;
    }
    let r = getCwd(),
      s = Oo(),
      h = () => s !== null && discoveryGeneration === this.discoveryGeneration && Oo() === s,
      y = s === null ? void 0 : (await readDiscoveryCacheEntries(this.storageV5))[r];
    if (s !== null && im(y) && y.account === s) {
      if (y.stores === null)
        return (
          settleOrgMemoryDecisionOff("server_off"),
          n(null),
          logFeatureOk("org_memory_discovery", { off: !0, cached: !0 }),
          null
        );
      let O = parseDiscoveryStores(y.stores);
      if (O.kind === "configs") {
        let P = parseStoreCandidates(y.candidates);
        return (
          n({ candidates: P, writeOptInAvailable: y.writeOptInAvailable === !0 }),
          logFeatureOk("org_memory_discovery", {
            stores: O.configs.length,
            cached: !0,
            ...getCandidateTelemetry(P),
          }),
          this.applyGrantAdjustments(discoveryGeneration, s, O.configs)
        );
      }
      if (O.kind === "empty") {
        let P = parseStoreCandidates(y.candidates);
        if (P.length > 0) {
          if (
            (n({ candidates: P, writeOptInAvailable: y.writeOptInAvailable === !0 }),
            logFeatureOk("org_memory_discovery", { stores: 0, cached: !0, ...getCandidateTelemetry(P) }),
            getOrgMemoryDecision().state !== "undecided" ||
              (await this.awaitSelectionIdentity()) === null ||
              getEffectiveSelection() !== null)
          )
            return this.applyGrantAdjustments(discoveryGeneration, s, []);
          return (settleOrgMemoryDecisionOff("no_selection"), null);
        }
        n(null);
      }
      logForDebugging("org-memory-discovery: cached stores payload failed validation \u2014 refetching", {
        level: "warn",
      });
    }
    let w = await fetchOrgMemoryDiscovery(this.credentials);
    if (w.kind === "transient")
      return (
        settleOrgMemoryDecisionOff("transient"),
        logFeatureSad("org_memory_discovery", "transient"),
        null
      );
    let S =
      w.kind === "stores"
        ? { candidates: parseStoreCandidates(w.candidates), writeOptInAvailable: w.writeOptIn === !0 }
        : null;
    if (w.kind === "off") {
      if ((n(null), s !== null && discoveryGeneration === this.discoveryGeneration && Oo() === s))
        await writeDiscoveryCache(r, { fetchedAt: Date.now(), account: s, stores: null }, this.storageV5);
      return (
        logFeatureOk("org_memory_discovery", { off: !0, cached: !1 }),
        settleOrgMemoryDecisionOff("server_off"),
        null
      );
    }
    let R = parseDiscoveryStores(w.stores);
    if (R.kind === "invalid")
      return (
        settleOrgMemoryDecisionOff("invalid"),
        n(null),
        logFeatureBad("org_memory_discovery", "invalid_stores"),
        null
      );
    if (R.kind === "configs" && s !== null && h()) await writeDiscoveryCacheEntry(r, s, w, this.storageV5);
    if (R.kind === "empty") {
      if (S !== null && S.candidates.length > 0) {
        if (w.stores.length === 0 && s !== null && h())
          await writeDiscoveryCacheEntry(r, s, w, this.storageV5);
        if ((n(S), w.stores.length === 0))
          logFeatureOk("org_memory_discovery", {
            stores: 0,
            cached: !1,
            ...getCandidateTelemetry(S.candidates),
          });
        else logFeatureSad("org_memory_discovery", "all_stores_dropped");
        if (
          getOrgMemoryDecision().state !== "undecided" ||
          (await this.awaitSelectionIdentity()) === null ||
          getEffectiveSelection() !== null
        )
          return this.applyGrantAdjustments(discoveryGeneration, s, []);
        return (settleOrgMemoryDecisionOff("no_selection"), null);
      }
      if (Array.isArray(w.candidates) && w.candidates.length === 0 && w.stores.length === 0 && S !== null) {
        if (
          (n(S),
          logFeatureOk("org_memory_discovery", { stores: 0, cached: !1 }),
          getOrgMemoryDecision().state !== "undecided")
        )
          return this.applyGrantAdjustments(discoveryGeneration, s, []);
        return (settleOrgMemoryDecisionOff("empty"), null);
      }
      if (w.candidates === void 0 && w.stores.length === 0)
        return (
          settleOrgMemoryDecisionOff("empty"),
          n(null),
          logFeatureOk("org_memory_discovery", { stores: 0, cached: !1 }),
          null
        );
      return (
        settleOrgMemoryDecisionOff("empty"),
        n(null),
        logFeatureSad("org_memory_discovery", "all_stores_dropped"),
        null
      );
    }
    return (
      n(S),
      logFeatureOk("org_memory_discovery", {
        stores: R.configs.length,
        cached: !1,
        ...getCandidateTelemetry(S?.candidates ?? []),
      }),
      this.applyGrantAdjustments(discoveryGeneration, s, R.configs)
    );
  }
  ensureShrinkSubscription() {
    if (this.shrinkSubscribed) return;
    ((this.shrinkSubscribed = !0),
      onOrgMemoryDecisionShrink(() => {
        (this.discoverMemoized.cache.clear(), F4t());
      }));
  }
  rebuildMemoryPromptOnLateSettle() {
    (this.disarmLateSettleRebuild?.(),
      (this.disarmLateSettleRebuild = onOrgMemoryDecisionSettled(() => {
        if (
          (this.disarmLateSettleRebuild?.(),
          (this.disarmLateSettleRebuild = null),
          getDecisionStores().length > 0)
        )
          F4t();
      })));
  }
  async discoverForDecision(e, n) {
    (this.adoptHandIns(e, n),
      this.ensureShrinkSubscription(),
      (this.decidingRun = !0),
      (this.decisionRunEverStarted = !0));
    try {
      return await this.discover();
    } catch (error) {
      throw (settleOrgMemoryDecisionOff("transient"), error);
    } finally {
      this.decidingRun = !1;
    }
  }
  async discover(e, n) {
    if (
      (this.adoptHandIns(e, n),
      this.ensureShrinkSubscription(),
      getCurrentProjectConfig().orgMemoryRead === !1)
    )
      return (settleOrgMemoryDecisionOff("read_disabled"), null);
    return this.discoverMemoized();
  }
  reconnect(e) {
    let n = () => (e?.(), this.runReconnect()),
      r = this.reconnectChain.then(n, n);
    return ((this.reconnectChain = r), r);
  }
  async runReconnect() {
    if (!checkHasTrustDialogAccepted()) return { kind: "refused", reason: "untrusted_workspace" };
    let e = getOrgMemoryDecision(),
      n = getOrgMemoryServedIdentity();
    if ((n !== null && Jpe() !== n) || (e.state !== "undecided" && reopenOrgMemoryDecision() === null))
      return (clearOrgMemoryCredential(), { kind: "refused", reason: "account_boundary" });
    if ((clearOrgMemoryCredential(), this.decidingRun))
      return (
        await waitForOrgMemoryDecisionSettled(um),
        { kind: "redecided", previous: e, current: getOrgMemoryDecision() }
      );
    this.discoverMemoized.cache.clear();
    try {
      await this.discoverForDecision();
    } catch (error) {
      logForDebugging(`org-memory-discovery: reconnect run failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
    return { kind: "redecided", previous: e, current: getOrgMemoryDecision() };
  }
  disconnect(e) {
    let n = () => (e?.(), this.runDisconnect()),
      r = this.reconnectChain.then(n, n);
    return ((this.reconnectChain = r), r);
  }
  runDisconnect() {
    let e = getOrgMemoryDecision();
    if (
      (clearOrgMemoryCredential(),
      this.discoverMemoized.cache.clear(),
      e.state === "on" || e.state === "parked")
    )
      reopenOrgMemoryDecision();
    return (
      settleOrgMemoryDecisionOff("no_selection"),
      { kind: "redecided", previous: e, current: getOrgMemoryDecision() }
    );
  }
}
//@ chunk-82kqcve8.js:62965-62990 placement
var mm = new HostScoped(() => new OrgMemoryDiscovery());
//@ chunk-82kqcve8.js:62990-63027 placement
function dt() {
  return mm.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:63027-63061 placement
function clearOrgMemoryDiscoveryCaches() {
  dt().clearCaches();
}
//@ chunk-82kqcve8.js:63061-63101 placement
function clearOrgMemoryDiscoveryAccountState() {
  dt().clearAccountState();
}
//@ chunk-82kqcve8.js:63101-63153 placement
function getOrgMemoryPickerData() {
  return isOrgMemoryDiscoveryEnabled() ? dt().lastPickerData : null;
}
//@ chunk-82kqcve8.js:63153-63203 placement
function hasOrgMemoryDecisionRunStarted() {
  return dt().decisionRunEverStarted;
}
//@ chunk-82kqcve8.js:63203-63257 placement
function rebuildMemoryPromptOnLateSettle() {
  dt().rebuildMemoryPromptOnLateSettle();
}
//@ chunk-82kqcve8.js:63257-63312 placement
function discoverOrgMemoryStoresForDecision(e, n) {
  return dt().discoverForDecision(e, n);
}
/**
 * 发现组织级记忆存储（切分可疑）。
 */
//@ chunk-82kqcve8.js:63312-63356 placement = _pendingAssistantChat (1)
function discoverOrgMemoryStores(e, n) {
  return dt().discover(e, n);
}
//@ chunk-82kqcve8.js:63356-63397 placement
function reconnectOrgMemory(e) {
  return dt().reconnect(e);
}
//@ chunk-82kqcve8.js:63397-63439 placement
function disconnectOrgMemory(e) {
  return dt().disconnect(e);
}
//@ chunk-82kqcve8.js:63439-63690 placement
function getPreferredStore() {
  let e = getOrgMemoryDecision();
  if (e.state !== "on" || e.selectionSource !== "preference") return;
  let selection = e.request.selection;
  if (selection === null || !kAt()) return;
  let r = getSelectionLayer(selection),
    s = r === "root" ? $n() : r === "silo" ? findGrantedSilo(selection) : vr(selection);
  if (s === void 0) return;
  if (Ct(selection) && !Nn(s.path, selection)) return;
  return s;
}
//@ chunk-82kqcve8.js:63690-63773 placement
function isSelectionMounted(e) {
  let n = getPreferredStore();
  return n !== void 0 && e.some((r) => rv(r.path) === rv(n.path));
}

export {
  discoverOrgMemoryStores,
  getOrgMemoryPickerData,
  hasOrgMemoryDecisionRunStarted,
  rebuildMemoryPromptOnLateSettle,
  disconnectOrgMemory,
  reconnectOrgMemory,
  discoverOrgMemoryStoresForDecision,
  isSelectionMounted,
  clearOrgMemoryDiscoveryCaches,
  clearOrgMemoryDiscoveryAccountState,
};
