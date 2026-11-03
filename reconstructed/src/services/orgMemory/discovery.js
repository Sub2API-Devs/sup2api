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
import { join } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, M, array, unknown, string, _enum, E, record } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isGroupingId,
  isPublicProjects,
  isSiloId,
  selectionAccountKey,
  classifySelectionKind,
  getEffectiveSelection,
  isOrgMemoryDiscoveryEnabled,
} from "./selection.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import {
  isDisklessWithoutState,
  validateMemoryStores,
  isValidRelativeSegments,
  getOrgMemoryPolicyState,
  isOrgMemoryEligible,
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
  findGroupingStore,
  stripTrailingSlashes,
  getOrgMemoryDecision,
  hasMirror,
  grantedModeFor,
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
import { invalidateMemorySections } from "../../utils/focusMode.js";
import { getCurrentProjectConfig, checkHasTrustDialogAccepted } from "../../utils/config.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-82kqcve8.js:46971-47411 placement
/**
 * 单个发现到的记忆库的 schema。
 */
var ORG_MEMORY_MOUNTS_PATH = "/v1/code/local/memory/mounts";
var ORG_MEMORY_DISCOVERY_JSON = "org-memory-discovery.json";
var DISCOVERY_TTL_MS = 86400000;
var discoveryResponseSchema = DoctorLazy(() =>
  u({
    enabled: M(),
    stores: array(unknown()).default([]),
    write_opt_in_available: unknown().optional(),
    candidates: unknown().optional(),
  }),
);
var discoveredStoreSchema = DoctorLazy(() =>
  u({
    kind: string().min(1).max(64),
    id: string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    name: string()
      .min(1)
      .max(256)
      .regex(/^[^\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]+$/),
    visibility: _enum(["public", "private"]),
    default: M().optional(),
  }),
);
//@ chunk-82kqcve8.js:47411-47832 placement
/**
 * 解析发现接口返回的候选记忆库：只保留合法的 workspace_silo（cagt_ 前缀）与 project，按 ID 去重。
 */
function parseStoreCandidates(candidates) {
  if (!Array.isArray(candidates)) return [];
  let n = [];
  let r = new Set();
  for (let s of candidates) {
    let h = discoveredStoreSchema().safeParse(s);
    if (!h.success) continue;
    let { kind, id, name: S, visibility } = h.data;
    if (kind === "workspace_silo" && !id.startsWith("cagt_")) continue;
    if (kind === "project" && !isGroupingId(id)) continue;
    if (kind !== "workspace_silo" && kind !== "project") continue;
    if (r.has(id)) continue;
    r.add(id);
    n.push({
      kind,
      id,
      name: S,
      visibility,
      isDefault: h.data.default === true,
    });
  }
  return n;
}
//@ chunk-82kqcve8.js:47832-48002 placement
var discoveryCacheEntrySchema = DoctorLazy(() =>
  u({
    fetchedAt: E(),
    account: string(),
    stores: array(unknown()).nullable(),
    candidates: unknown().optional(),
    writeOptInAvailable: unknown().optional(),
  }),
);
var discoveryCacheFileSchema = DoctorLazy(() =>
  u({
    entries: record(string(), unknown()),
  }),
);
//@ chunk-82kqcve8.js:48002-48043 placement = getCacheDir (1)
/**
 * ~/.claude/cache/org-memory-discovery.json。旧版名 getCacheDir_2 为错配（记忆发现模块）。
 */
function getOrgMemoryDiscoveryCachePath() {
  return join(getClaudeConfigDir(), "cache", ORG_MEMORY_DISCOVERY_JSON);
}
//@ chunk-82kqcve8.js:48043-48086 placement
var la = STORAGE_SPACES.cache("org-memory-discovery", ORG_MEMORY_DISCOVERY_JSON);
//@ chunk-82kqcve8.js:48086-48518 placement
async function readDiscoveryCache(e) {
  if (isDisklessWithoutState(e)) return {};
  try {
    let n;
    if (!isStorageV5Enabled() || e === undefined)
      n = await getFileReader().read(getOrgMemoryDiscoveryCachePath());
    else {
      let s = await e.read([la]);
      if (!s.ok) {
        logForDebugging(`org-memory-discovery: cache read failed: ${formatStorageError(s.error)}`);
        return {};
      }
      let h = s.value.items[0];
      if (!h.found) return {};
      n = Buffer.from(h.value).toString("utf8");
    }
    let r = discoveryCacheFileSchema().safeParse(jsonParse(n));
    if (r.success) return r.data.entries;
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`org-memory-discovery: cache read failed: ${errorMessage(error)}`);
  }
  return {};
}
//@ chunk-82kqcve8.js:48518-48650 placement
async function readDiscoveryCacheEntries(storageV5) {
  let n = {};
  for (let [key, value] of Object.entries(await readDiscoveryCache(storageV5))) {
    let h = discoveryCacheEntrySchema().safeParse(value);
    if (h.success) n[key] = h.data;
  }
  return n;
}
//@ chunk-82kqcve8.js:48650-48711 placement
/**
 * 判断发现条目是否新鲜（含账号匹配）。
 */
function isDiscoveryEntryFresh(e) {
  if (e === undefined) return false;
  return isFreshTimestamp(e.fetchedAt);
}
//@ chunk-82kqcve8.js:48711-48763 placement
/**
 * 判断时间戳是否在有效期内。
 */
function isFreshTimestamp(fetchedAt) {
  let n = Date.now() - fetchedAt;
  return n >= 0 && n < DISCOVERY_TTL_MS;
}
//@ chunk-82kqcve8.js:48763-49244 placement
async function writeDiscoveryCache(e, n, r) {
  try {
    let discoveryCache = await readDiscoveryCache(r);
    for (let [key, value] of Object.entries(discoveryCache)) {
      let fetchedAt = value?.fetchedAt;
      if (typeof fetchedAt === "number" && !isFreshTimestamp(fetchedAt)) delete discoveryCache[key];
    }
    discoveryCache[e] = n;
    if (isStorageV5Enabled() && r !== undefined) {
      let y = await r.write(
        la,
        jsonStringify({
          entries: discoveryCache,
        }),
        {
          mode: 438 & ~process.umask(),
        },
      );
      if (!y.ok) logForDebugging(`org-memory-discovery: cache write failed: ${formatStorageError(y.error)}`);
      return;
    }
    if (isDisklessWithoutState(r)) return;
    let fileReader = getFileReader();
    await fileReader.mkdir(join(getClaudeConfigDir(), "cache"));
    await fileReader.atomicWrite(
      getOrgMemoryDiscoveryCachePath(),
      jsonStringify({
        entries: discoveryCache,
      }),
    );
  } catch (error) {
    logForDebugging(`org-memory-discovery: cache write failed: ${errorMessage(error)}`);
  }
}
//@ chunk-82kqcve8.js:49244-49454 placement
function isMemoryApiPath(path) {
  try {
    let r = new URL(path, "https://sentinel.invalid");
    return (
      r.origin === "https://sentinel.invalid" &&
      path === r.pathname &&
      !r.pathname.includes("%") &&
      r.pathname.startsWith("/v1/code/memory/")
    );
  } catch {
    return false;
  }
}
//@ chunk-82kqcve8.js:49454-49491 placement
/**
 * 计算发现缓存使用的账号键（有 API 覆盖时为 null）。
 */
function accountKeyForDiscovery() {
  return hasMemoryApiOverride() ? null : getOrgMemoryAccountKey();
}
//@ chunk-82kqcve8.js:49491-50121 placement
async function fetchOrgMemoryDiscovery(credentials) {
  try {
    let n = await apiClient.get(ORG_MEMORY_MOUNTS_PATH, {
      ...memoryApiTarget(),
      credentials,
      timeout: 5000,
      validateStatus: (s) => s === 200 || s === 404,
    });
    if (!n.ok) {
      logForDebugging(`org-memory-discovery: skipped (${n.reason})`);
      return {
        kind: "transient",
      };
    }
    if (n.status === 404)
      return {
        kind: "off",
      };
    let r = discoveryResponseSchema().safeParse(n.data);
    if (!r.success) {
      logForDebugging(`org-memory-discovery: malformed response: ${r.error.message}`, {
        level: "warn",
      });
      return {
        kind: "transient",
      };
    }
    if (!r.data.enabled)
      return {
        kind: "off",
      };
    return {
      kind: "stores",
      stores: r.data.stores,
      candidates: r.data.candidates,
      writeOptIn: r.data.write_opt_in_available,
    };
  } catch (error) {
    logForDebugging(`org-memory-discovery: fetch failed: ${errorMessage(error)}`);
    return {
      kind: "transient",
    };
  }
}
//@ chunk-82kqcve8.js:50121-50732 placement
function parseDiscoveryStores(stores) {
  let n;
  try {
    n = validateMemoryStores(stores, "org memory discovery");
  } catch (error) {
    logForDebugging(`org-memory-discovery: invalid stores payload: ${errorMessage(error)}`, {
      level: "warn",
    });
    return {
      kind: "invalid",
    };
  }
  if (n === null)
    return {
      kind: "empty",
    };
  let filtered = n.filter((h) => h.scope === "team");
  if (filtered.length < n.length)
    logForDebugging(`org-memory-discovery: dropped ${n.length - filtered.length} non-team store(s)`, {
      level: "warn",
    });
  let filtered_2 = filtered.filter((h) => isMemoryApiPath(h.path));
  if (filtered_2.length < filtered.length)
    logForDebugging(
      `org-memory-discovery: dropped ${filtered.length - filtered_2.length} non-code-memory store path(s)`,
      {
        level: "warn",
      },
    );
  if (filtered_2.length === 0)
    return {
      kind: "empty",
    };
  return {
    kind: "configs",
    configs: filtered_2.map((h) =>
      h.mode === "ro"
        ? h
        : {
            ...h,
            mode: "ro",
          },
    ),
  };
}
//@ chunk-82kqcve8.js:50732-50772 placement
var MEMORY_MD = "MEMORY.md";
var PUBLIC_PROJECTS_2 = "public_projects";
//@ chunk-82kqcve8.js:50772-50879 placement
function getSelectionLayer(selection) {
  if (isPublicProjects(selection)) return "root";
  if (isSiloId(selection)) return "silo";
  return isGroupingId(selection) && findGroupingStore(selection) === undefined ? "root" : "grouping";
}
//@ chunk-82kqcve8.js:50879-51146 placement
function renameSquattingMount(e, n, r) {
  let s = (h) => h.mount === n && stripTrailingSlashes(h.path) !== stripTrailingSlashes(r);
  if (!e.some(s)) return e;
  logForDebugging(
    `org-memory-discovery: discovered config squatting the derived mount name ${n} \u2014 renamed aside`,
    {
      level: "warn",
    },
  );
  return e.map((h) =>
    s(h)
      ? {
          ...h,
          mount: `${h.mount}_discovered`,
        }
      : h,
  );
}
//@ chunk-82kqcve8.js:51146-51163 placement
/**
 * 每轮等待时间（1500 毫秒）。
 */
var MAX_IDENTITY_WAIT_ROUNDS = 3;
var IDENTITY_WAIT_MS = 1500;
//@ chunk-82kqcve8.js:51163-51190 placement
/**
 * 等待身份就绪。
 */
function waitForIdentity() {
  return sleep(IDENTITY_WAIT_MS);
}
//@ chunk-82kqcve8.js:51190-51393 placement
async function writeDiscoveryCacheEntry(cwd, account, orgMemoryDiscovery, storageV5) {
  await writeDiscoveryCache(
    cwd,
    {
      fetchedAt: Date.now(),
      account,
      stores: orgMemoryDiscovery.stores,
      ...(orgMemoryDiscovery.candidates !== undefined && {
        candidates: orgMemoryDiscovery.candidates,
      }),
      ...(orgMemoryDiscovery.writeOptIn !== undefined && {
        writeOptInAvailable: orgMemoryDiscovery.writeOptIn,
      }),
    },
    storageV5,
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
/**
 * 等待组织记忆决定完成的超时（15 秒）。
 */
var DISCOVERY_CACHE_TTL_MS = 3600000;
var DECISION_SETTLE_TIMEOUT_MS = 15000;
//@ chunk-82kqcve8.js:51616-62965 placement
/**
 * 组织记忆库发现：读写缓存、选择器、授权缺失处理
 */
class OrgMemoryDiscovery {
  lastPickerData = null;
  discoveryGeneration = 0;
  grantMissingEmitted = false;
  selectionNotGrantedEmitted = false;
  promptIndexFallbackEmitted = false;
  identityWaitSpentGen = -1;
  identityWaitDelay;
  decidingRun = false;
  decisionRunEverStarted = false;
  shrinkSubscribed = false;
  disarmLateSettleRebuild = null;
  reconnectChain = Promise.resolve();
  storageV5 = undefined;
  credentials = undefined;
  discoverMemoized = memoizeWithTTL(
    () => this.runDiscovery(),
    DISCOVERY_CACHE_TTL_MS,
    () => !(this.decidingRun && getOrgMemoryDecision().state === "undecided"),
  );
  constructor(identityWaitDelay = waitForIdentity) {
    this.identityWaitDelay = identityWaitDelay;
  }
  setIdentityWaitDelay(e) {
    this.identityWaitDelay = e ?? waitForIdentity;
  }
  clearCaches() {
    this.lastPickerData = null;
    this.discoverMemoized.cache.clear();
  }
  clearAccountState() {
    this.discoveryGeneration++;
    this.grantMissingEmitted = false;
    this.selectionNotGrantedEmitted = false;
    this.promptIndexFallbackEmitted = false;
    this.clearCaches();
  }
  reset() {
    this.disarmLateSettleRebuild?.();
    this.disarmLateSettleRebuild = null;
    this.discoveryGeneration = 0;
    this.grantMissingEmitted = false;
    this.selectionNotGrantedEmitted = false;
    this.promptIndexFallbackEmitted = false;
    this.identityWaitSpentGen = -1;
    this.decidingRun = false;
    this.decisionRunEverStarted = false;
    this.reconnectChain = Promise.resolve();
    this.storageV5 = undefined;
    this.credentials = undefined;
    this.clearCaches();
  }
  adoptHandIns(e, n) {
    if (e !== undefined) this.storageV5 = e;
    if (n === undefined) return;
    if (this.credentials !== undefined && this.credentials !== n) {
      logForDebugging(
        "org-memory-discovery: a credentials store was already handed in; the later one is ignored",
      );
      return;
    }
    this.credentials = n;
  }
  emitGrantMissingOnce() {
    if (!this.grantMissingEmitted) {
      this.grantMissingEmitted = true;
      logFeatureSad("org_memory_picker", "grant_missing");
    }
  }
  pickedCandidateIsPrivate(e) {
    return (
      this.lastPickerData?.candidates.some(
        (candidate) => candidate.id === e && candidate.visibility === "private",
      ) === true
    );
  }
  rootPromptIndexFocus(e) {
    let promptIndex = e.prompt_index;
    if (promptIndex !== undefined && isValidRelativeSegments(promptIndex))
      return {
        index: promptIndex,
        source: "mirror",
      };
    if (!this.promptIndexFallbackEmitted && !wasLastMintSelectionDegraded()) {
      this.promptIndexFallbackEmitted = true;
      logFeatureSad("org_memory_picker", "prompt_index_absent");
    }
    return {
      index: MEMORY_MD,
      source: "fallback",
    };
  }
  withSelectedGroupingMounts(e, n, r) {
    let s = hasMirror() ? e.filter((P) => grantedModeFor(P.path) !== undefined) : e;
    let groupingStore = findGroupingStore(n);
    if (groupingStore === undefined) {
      if (!wasLastMintSelectionDegraded()) this.emitGrantMissingOnce();
      return s;
    }
    if (!isMemoryApiPath(groupingStore.path)) {
      logForDebugging(
        "org-memory-discovery: granted grouping path failed the partition pin \u2014 not mounting",
        {
          level: "warn",
        },
      );
      this.emitGrantMissingOnce();
      return s;
    }
    let y = [...s];
    let w = (P) => y.some((L) => stripTrailingSlashes(L.path) === stripTrailingSlashes(P));
    let S = (P, path) => {
      if (w(path)) return true;
      y = renameSquattingMount(y, P, path);
      return false;
    };
    for (let P of grantedStoresCopy().filter(isSiloStore)) {
      let L = stripTrailingSlashes(P.path);
      let sliced = L.slice(L.lastIndexOf("/") + 1);
      if (!sliced.startsWith("cagt_") || !isMemoryApiPath(P.path)) {
        logForDebugging(
          "org-memory-discovery: granted silo entry failed the tag or partition pin \u2014 not mounting",
          {
            level: "warn",
          },
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
    if (!S(R, groupingStore.path))
      y.push({
        path: groupingStore.path,
        mount: R,
        scope: "team",
        mode: "ro",
        promptIndex: "MEMORY.md",
        ...(groupingStore.visibility === "private" && {
          owned: true,
        }),
      });
    else if (groupingStore.visibility === "private")
      y.forEach((P, L) => {
        if (stripTrailingSlashes(P.path) === stripTrailingSlashes(groupingStore.path))
          y[L] = {
            ...P,
            owned: true,
          };
      });
    let groupingRootStore = findGroupingRootStore();
    if (
      groupingRootStore !== undefined &&
      isMemoryApiPath(groupingRootStore.path) &&
      !S(PUBLIC_PROJECTS_2, groupingRootStore.path)
    )
      y.push({
        path: groupingRootStore.path,
        mount: PUBLIC_PROJECTS_2,
        scope: "team",
        mode: "ro",
        promptIndex: MEMORY_MD,
      });
    return y;
  }
  withSelectedGroupingRootMount(e, n, r) {
    let s = hasMirror() ? e.filter((j) => grantedModeFor(j.path) !== undefined) : e;
    let groupingRootStore = findGroupingRootStore();
    if (groupingRootStore === undefined) {
      if (!wasLastMintSelectionDegraded()) this.emitGrantMissingOnce();
      return s;
    }
    if (!isMemoryApiPath(groupingRootStore.path)) {
      logForDebugging(
        "org-memory-discovery: granted grouping-root path failed the partition pin \u2014 not mounting",
        {
          level: "warn",
        },
      );
      this.emitGrantMissingOnce();
      return s;
    }
    let y = isPublicProjects(n) ? undefined : this.rootPromptIndexFocus(groupingRootStore);
    let w = isPublicProjects(n);
    let S = r && !w && isRootLiftable() ? "rw" : "ro";
    if (r) {
      let j = rootLiftReason();
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
    let any = s.some((j) => stripTrailingSlashes(j.path) === stripTrailingSlashes(groupingRootStore.path));
    let O = any ? s : renameSquattingMount(s, PUBLIC_PROJECTS_2, groupingRootStore.path);
    let P = any
      ? y === undefined
        ? O
        : O.map((j) =>
            stripTrailingSlashes(j.path) === stripTrailingSlashes(groupingRootStore.path)
              ? {
                  ...j,
                  promptIndex: y.index,
                }
              : j,
          )
      : [
          ...O,
          {
            path: groupingRootStore.path,
            mount: PUBLIC_PROJECTS_2,
            scope: "team",
            mode: S,
            promptIndex: y?.index ?? MEMORY_MD,
          },
        ];
    let found = P.find((j) => stripTrailingSlashes(j.path) === stripTrailingSlashes(groupingRootStore.path));
    logEvent("tengu_org_memory_root_mount_derived", {
      mount_name: found?.mount === PUBLIC_PROJECTS_2 ? lit(PUBLIC_PROJECTS_2) : lit("discovered"),
      mode: fromEnum(found?.mode ?? "ro"),
      prompt_index_source: fromEnum(y?.source ?? "none"),
    });
    return P;
  }
  async awaitSelectionIdentity() {
    let e = selectionAccountKey();
    if (e !== null) return e;
    if (this.identityWaitSpentGen === this.discoveryGeneration) return null;
    this.identityWaitSpentGen = this.discoveryGeneration;
    for (let j = 0; e === null && j < MAX_IDENTITY_WAIT_ROUNDS; j++) {
      await this.identityWaitDelay();
      e = selectionAccountKey();
    }
    return e;
  }
  async applyGrantAdjustments(e, n, r) {
    let orgMemoryDecision = getOrgMemoryDecision();
    if (orgMemoryDecision.state !== "undecided")
      return orgMemoryDecision.state === "on" ? [...orgMemoryDecision.stores] : null;
    if (!this.decidingRun) return null;
    let h = await this.awaitSelectionIdentity();
    let y = () => {
      if (this.discoveryGeneration !== e) return true;
      let j = n ?? h;
      if (j === null) return false;
      let G = selectionAccountKey();
      return G !== null && G !== j;
    };
    if (y()) {
      settleOrgMemoryDecisionOff("superseded");
      return null;
    }
    if (h === null) {
      settleOrgMemoryDecisionOff("identity_unresolved");
      logForDebugging(
        "org-memory-discovery: identity unresolved at decision time \u2014 org memory off for this session",
      );
      return null;
    }
    let w;
    try {
      w = await negotiateOrgMemoryCredential(this.credentials, this.storageV5);
    } catch (error) {
      logForDebugging(`org-memory-discovery: decision-time negotiation failed: ${errorMessage(error)}`);
      settleOrgMemoryDecisionOff(this.discoveryGeneration === e ? "negotiation_failed" : "superseded");
      return null;
    }
    let request = w.request;
    let R = request.selection !== null && isGroupingId(request.selection) && isRootLiftable();
    let O = request.writeAccess
      ? r.map((j) => {
          if (grantedModeFor(j.path) !== "rw") return j;
          if (isGrantedSiloStore(j.path))
            return {
              ...j,
              mode: "rw",
            };
          if (R && isRootStorePath(j.path))
            return {
              ...j,
              mode: "rw",
            };
          return j;
        })
      : r;
    if (request.selection !== null) {
      let selectionLayer = getSelectionLayer(request.selection);
      O =
        selectionLayer === "root"
          ? this.withSelectedGroupingRootMount(O, request.selection, request.writeAccess)
          : selectionLayer === "silo"
            ? this.withSelectedSiloMount(O, request.selection, request.writeAccess)
            : this.withSelectedGroupingMounts(O, request.selection, request.writeAccess);
    } else if (hasMirror()) O = O.filter((j) => grantedModeFor(j.path) !== undefined);
    if (y()) {
      settleOrgMemoryDecisionOff("superseded");
      return null;
    }
    if (O.length === 0) {
      settleOrgMemoryDecisionOff("no_stores");
      return null;
    }
    let P = request.selection === null && !w.degraded ? getSingleSiloId() : null;
    if (
      !settleOrgMemoryDecisionOn({
        identity: h,
        stores: O,
        request: {
          writeAccess: request.writeAccess,
          selection: request.selection ?? P,
        },
        selectionKind: classifySelectionKind(request.selection ?? P),
        selectionSource: request.selection !== null ? "preference" : P !== null ? "pinned_default" : "none",
        initialGrant: grantedStoresCopy(),
        degraded: w.degraded,
      })
    )
      return null;
    return O;
  }
  withSelectedSiloMount(e, n, r) {
    if (!hasMirror()) return e;
    let filtered = e.filter((w) => grantedModeFor(w.path) !== undefined);
    let grantedSilo = findGrantedSilo(n);
    if (grantedSilo === undefined) {
      this.emitGrantMissingOnce();
      return filtered;
    }
    if (!isMemoryApiPath(grantedSilo.path)) {
      logForDebugging(
        "org-memory-discovery: granted silo path failed the partition pin \u2014 not mounting",
        {
          level: "warn",
        },
      );
      this.emitGrantMissingOnce();
      return filtered;
    }
    if (!isStoreBasename(grantedSilo.path, n)) {
      if (!this.selectionNotGrantedEmitted && !wasLastMintSelectionDegraded()) {
        this.selectionNotGrantedEmitted = true;
        logFeatureSad("org_memory_picker", "selection_not_granted");
      }
      return filtered;
    }
    if (filtered.some((w) => stripTrailingSlashes(w.path) === stripTrailingSlashes(grantedSilo.path)))
      return filtered;
    let y = `silo_${n.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    if (filtered.some((w) => w.mount === y)) return filtered;
    return [
      ...filtered,
      {
        path: grantedSilo.path,
        mount: y,
        scope: "team",
        mode: r && grantedSilo.mode === "rw" ? "rw" : "ro",
        promptIndex: "MEMORY.md",
      },
    ];
  }
  async runDiscovery() {
    let discoveryGeneration = this.discoveryGeneration;
    installPrivateProbe((O) => this.pickedCandidateIsPrivate(O));
    let n = (lastPickerData) => {
      if (discoveryGeneration === this.discoveryGeneration) this.lastPickerData = lastPickerData;
    };
    switch (getOrgMemoryPolicyState()) {
      case "held":
        return null;
      case "closed":
        if (isOrgMemoryEligible()) return null;
        settleOrgMemoryDecisionOff("gates_closed");
        return null;
      case "open":
        break;
    }
    let cwd = getCwd();
    let account = accountKeyForDiscovery();
    let h = () =>
      account !== null &&
      discoveryGeneration === this.discoveryGeneration &&
      accountKeyForDiscovery() === account;
    let y = account === null ? undefined : (await readDiscoveryCacheEntries(this.storageV5))[cwd];
    if (account !== null && isDiscoveryEntryFresh(y) && y.account === account) {
      if (y.stores === null) {
        settleOrgMemoryDecisionOff("server_off");
        n(null);
        logFeatureOk("org_memory_discovery", {
          off: true,
          cached: true,
        });
        return null;
      }
      let discoveryStores = parseDiscoveryStores(y.stores);
      if (discoveryStores.kind === "configs") {
        let storeCandidates = parseStoreCandidates(y.candidates);
        n({
          candidates: storeCandidates,
          writeOptInAvailable: y.writeOptInAvailable === true,
        });
        logFeatureOk("org_memory_discovery", {
          stores: discoveryStores.configs.length,
          cached: true,
          ...getCandidateTelemetry(storeCandidates),
        });
        return this.applyGrantAdjustments(discoveryGeneration, account, discoveryStores.configs);
      }
      if (discoveryStores.kind === "empty") {
        let storeCandidates = parseStoreCandidates(y.candidates);
        if (storeCandidates.length > 0) {
          n({
            candidates: storeCandidates,
            writeOptInAvailable: y.writeOptInAvailable === true,
          });
          logFeatureOk("org_memory_discovery", {
            stores: 0,
            cached: true,
            ...getCandidateTelemetry(storeCandidates),
          });
          if (
            getOrgMemoryDecision().state !== "undecided" ||
            (await this.awaitSelectionIdentity()) === null ||
            getEffectiveSelection() !== null
          )
            return this.applyGrantAdjustments(discoveryGeneration, account, []);
          settleOrgMemoryDecisionOff("no_selection");
          return null;
        }
        n(null);
      }
      logForDebugging("org-memory-discovery: cached stores payload failed validation \u2014 refetching", {
        level: "warn",
      });
    }
    let orgMemoryDiscovery = await fetchOrgMemoryDiscovery(this.credentials);
    if (orgMemoryDiscovery.kind === "transient") {
      settleOrgMemoryDecisionOff("transient");
      logFeatureSad("org_memory_discovery", "transient");
      return null;
    }
    let lastPickerData =
      orgMemoryDiscovery.kind === "stores"
        ? {
            candidates: parseStoreCandidates(orgMemoryDiscovery.candidates),
            writeOptInAvailable: orgMemoryDiscovery.writeOptIn === true,
          }
        : null;
    if (orgMemoryDiscovery.kind === "off") {
      n(null);
      if (
        account !== null &&
        discoveryGeneration === this.discoveryGeneration &&
        accountKeyForDiscovery() === account
      )
        await writeDiscoveryCache(
          cwd,
          {
            fetchedAt: Date.now(),
            account,
            stores: null,
          },
          this.storageV5,
        );
      logFeatureOk("org_memory_discovery", {
        off: true,
        cached: false,
      });
      settleOrgMemoryDecisionOff("server_off");
      return null;
    }
    let discoveryStores = parseDiscoveryStores(orgMemoryDiscovery.stores);
    if (discoveryStores.kind === "invalid") {
      settleOrgMemoryDecisionOff("invalid");
      n(null);
      logFeatureBad("org_memory_discovery", "invalid_stores");
      return null;
    }
    if (discoveryStores.kind === "configs" && account !== null && h())
      await writeDiscoveryCacheEntry(cwd, account, orgMemoryDiscovery, this.storageV5);
    if (discoveryStores.kind === "empty") {
      if (lastPickerData !== null && lastPickerData.candidates.length > 0) {
        if (orgMemoryDiscovery.stores.length === 0 && account !== null && h())
          await writeDiscoveryCacheEntry(cwd, account, orgMemoryDiscovery, this.storageV5);
        n(lastPickerData);
        if (orgMemoryDiscovery.stores.length === 0)
          logFeatureOk("org_memory_discovery", {
            stores: 0,
            cached: false,
            ...getCandidateTelemetry(lastPickerData.candidates),
          });
        else logFeatureSad("org_memory_discovery", "all_stores_dropped");
        if (
          getOrgMemoryDecision().state !== "undecided" ||
          (await this.awaitSelectionIdentity()) === null ||
          getEffectiveSelection() !== null
        )
          return this.applyGrantAdjustments(discoveryGeneration, account, []);
        settleOrgMemoryDecisionOff("no_selection");
        return null;
      }
      if (
        Array.isArray(orgMemoryDiscovery.candidates) &&
        orgMemoryDiscovery.candidates.length === 0 &&
        orgMemoryDiscovery.stores.length === 0 &&
        lastPickerData !== null
      ) {
        n(lastPickerData);
        logFeatureOk("org_memory_discovery", {
          stores: 0,
          cached: false,
        });
        if (getOrgMemoryDecision().state !== "undecided")
          return this.applyGrantAdjustments(discoveryGeneration, account, []);
        settleOrgMemoryDecisionOff("empty");
        return null;
      }
      if (orgMemoryDiscovery.candidates === undefined && orgMemoryDiscovery.stores.length === 0) {
        settleOrgMemoryDecisionOff("empty");
        n(null);
        logFeatureOk("org_memory_discovery", {
          stores: 0,
          cached: false,
        });
        return null;
      }
      settleOrgMemoryDecisionOff("empty");
      n(null);
      logFeatureSad("org_memory_discovery", "all_stores_dropped");
      return null;
    }
    n(lastPickerData);
    logFeatureOk("org_memory_discovery", {
      stores: discoveryStores.configs.length,
      cached: false,
      ...getCandidateTelemetry(lastPickerData?.candidates ?? []),
    });
    return this.applyGrantAdjustments(discoveryGeneration, account, discoveryStores.configs);
  }
  ensureShrinkSubscription() {
    if (this.shrinkSubscribed) return;
    this.shrinkSubscribed = true;
    onOrgMemoryDecisionShrink(() => {
      this.discoverMemoized.cache.clear();
      invalidateMemorySections();
    });
  }
  rebuildMemoryPromptOnLateSettle() {
    this.disarmLateSettleRebuild?.();
    this.disarmLateSettleRebuild = onOrgMemoryDecisionSettled(() => {
      this.disarmLateSettleRebuild?.();
      this.disarmLateSettleRebuild = null;
      if (getDecisionStores().length > 0) invalidateMemorySections();
    });
  }
  async discoverForDecision(e, n) {
    this.adoptHandIns(e, n);
    this.ensureShrinkSubscription();
    this.decidingRun = true;
    this.decisionRunEverStarted = true;
    try {
      return await this.discover();
    } catch (error) {
      settleOrgMemoryDecisionOff("transient");
      throw error;
    } finally {
      this.decidingRun = false;
    }
  }
  async discover(e, n) {
    this.adoptHandIns(e, n);
    this.ensureShrinkSubscription();
    if (getCurrentProjectConfig().orgMemoryRead === false) {
      settleOrgMemoryDecisionOff("read_disabled");
      return null;
    }
    return this.discoverMemoized();
  }
  reconnect(e) {
    let n = () => {
      e?.();
      return this.runReconnect();
    };
    let r = this.reconnectChain.then(n, n);
    this.reconnectChain = r;
    return r;
  }
  async runReconnect() {
    if (!checkHasTrustDialogAccepted())
      return {
        kind: "refused",
        reason: "untrusted_workspace",
      };
    let orgMemoryDecision = getOrgMemoryDecision();
    let orgMemoryServedIdentity = getOrgMemoryServedIdentity();
    if (
      (orgMemoryServedIdentity !== null && selectionAccountKey() !== orgMemoryServedIdentity) ||
      (orgMemoryDecision.state !== "undecided" && reopenOrgMemoryDecision() === null)
    ) {
      clearOrgMemoryCredential();
      return {
        kind: "refused",
        reason: "account_boundary",
      };
    }
    clearOrgMemoryCredential();
    if (this.decidingRun) {
      await waitForOrgMemoryDecisionSettled(DECISION_SETTLE_TIMEOUT_MS);
      return {
        kind: "redecided",
        previous: orgMemoryDecision,
        current: getOrgMemoryDecision(),
      };
    }
    this.discoverMemoized.cache.clear();
    try {
      await this.discoverForDecision();
    } catch (error) {
      logForDebugging(`org-memory-discovery: reconnect run failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
    return {
      kind: "redecided",
      previous: orgMemoryDecision,
      current: getOrgMemoryDecision(),
    };
  }
  disconnect(e) {
    let n = () => {
      e?.();
      return this.runDisconnect();
    };
    let r = this.reconnectChain.then(n, n);
    this.reconnectChain = r;
    return r;
  }
  runDisconnect() {
    let orgMemoryDecision = getOrgMemoryDecision();
    clearOrgMemoryCredential();
    this.discoverMemoized.cache.clear();
    if (orgMemoryDecision.state === "on" || orgMemoryDecision.state === "parked") reopenOrgMemoryDecision();
    settleOrgMemoryDecisionOff("no_selection");
    return {
      kind: "redecided",
      previous: orgMemoryDecision,
      current: getOrgMemoryDecision(),
    };
  }
}
//@ chunk-82kqcve8.js:62965-62990 placement
/**
 * 按宿主保存的发现状态。
 */
var orgMemoryDiscoveryState = new HostScoped(() => new OrgMemoryDiscovery());
//@ chunk-82kqcve8.js:62990-63027 placement
/**
 * 取当前宿主的发现状态。
 */
function getOrgMemoryDiscovery() {
  return orgMemoryDiscoveryState.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:63027-63061 placement
function clearOrgMemoryDiscoveryCaches() {
  getOrgMemoryDiscovery().clearCaches();
}
//@ chunk-82kqcve8.js:63061-63101 placement
function clearOrgMemoryDiscoveryAccountState() {
  getOrgMemoryDiscovery().clearAccountState();
}
//@ chunk-82kqcve8.js:63101-63153 placement
function getOrgMemoryPickerData() {
  return isOrgMemoryDiscoveryEnabled() ? getOrgMemoryDiscovery().lastPickerData : null;
}
//@ chunk-82kqcve8.js:63153-63203 placement
function hasOrgMemoryDecisionRunStarted() {
  return getOrgMemoryDiscovery().decisionRunEverStarted;
}
//@ chunk-82kqcve8.js:63203-63257 placement
function rebuildMemoryPromptOnLateSettle() {
  getOrgMemoryDiscovery().rebuildMemoryPromptOnLateSettle();
}
//@ chunk-82kqcve8.js:63257-63312 placement
function discoverOrgMemoryStoresForDecision(storageV5, credentials) {
  return getOrgMemoryDiscovery().discoverForDecision(storageV5, credentials);
}
//@ chunk-82kqcve8.js:63312-63356 placement = _pendingAssistantChat (1)
/**
 * 发现组织级记忆存储（切分可疑）。
 */
function discoverOrgMemoryStores(storageV5, signal) {
  return getOrgMemoryDiscovery().discover(storageV5, signal);
}
//@ chunk-82kqcve8.js:63356-63397 placement
function reconnectOrgMemory(e) {
  return getOrgMemoryDiscovery().reconnect(e);
}
//@ chunk-82kqcve8.js:63397-63439 placement
function disconnectOrgMemory(e) {
  return getOrgMemoryDiscovery().disconnect(e);
}
//@ chunk-82kqcve8.js:63439-63690 placement
function getPreferredStore() {
  let orgMemoryDecision = getOrgMemoryDecision();
  if (orgMemoryDecision.state !== "on" || orgMemoryDecision.selectionSource !== "preference") return;
  let selection = orgMemoryDecision.request.selection;
  if (selection === null || !hasMirror()) return;
  let selectionLayer = getSelectionLayer(selection);
  let s =
    selectionLayer === "root"
      ? findGroupingRootStore()
      : selectionLayer === "silo"
        ? findGrantedSilo(selection)
        : findGroupingStore(selection);
  if (s === undefined) return;
  if (isSiloId(selection) && !isStoreBasename(s.path, selection)) return;
  return s;
}
//@ chunk-82kqcve8.js:63690-63773 placement
function isSelectionMounted(e) {
  let preferredStore = getPreferredStore();
  return (
    preferredStore !== undefined &&
    e.some((r) => stripTrailingSlashes(r.path) === stripTrailingSlashes(preferredStore.path))
  );
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
