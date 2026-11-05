/**
 * services/orgMemory/discovery.ts
 *
 * 组织记忆库发现（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (36)
 * attribution: placement 36
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join as join_2 } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  booleanSchema,
  array,
  unknown,
  stringSchema,
  _enum,
  numberSchema,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  isGroupingId,
  isPublicProjects,
  isSiloId,
  selectionAccountKey,
  classifySelectionKind,
  getEffectiveSelection,
  isOrgMemoryDiscoveryEnabled,
} from "./selection.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
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
import { countWhere } from "../../utils/collections.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:48137-48577 placement
/**
 * 单个发现到的记忆库的 schema。
 */
var ORG_MEMORY_MOUNTS_PATH; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ORG_MEMORY_DISCOVERY_JSON;
var DISCOVERY_TTL_MS;
var discoveryResponseSchema;
var discoveredStoreSchema;
deferInit("chunk-a2q0x549.js:48137", () => {
  ORG_MEMORY_MOUNTS_PATH = "/v1/code/local/memory/mounts";
  ORG_MEMORY_DISCOVERY_JSON = "org-memory-discovery.json";
  DISCOVERY_TTL_MS = 86400000;
  discoveryResponseSchema = DoctorLazy(() =>
    objectSchema({
      enabled: booleanSchema(),
      stores: array(unknown()).default([]),
      write_opt_in_available: unknown().optional(),
      candidates: unknown().optional(),
    }),
  );
  discoveredStoreSchema = DoctorLazy(() =>
    objectSchema({
      kind: stringSchema().min(1).max(64),
      id: stringSchema()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9_-]+$/),
      name: stringSchema()
        .min(1)
        .max(256)
        .regex(/^[^\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]+$/),
      visibility: _enum(["public", "private"]),
      default: booleanSchema().optional(),
    }),
  );
});
//@ chunk-a2q0x549.js:48577-48998 placement
/**
 * 解析发现接口返回的候选记忆库：只保留合法的 workspace_silo（cagt_ 前缀）与 project，按 ID 去重。
 */
function parseStoreCandidates(candidates) {
  if (!Array.isArray(candidates)) return [];
  let stores = [];
  let seenIds = new Set();
  for (let candidate of candidates) {
    let parsed = discoveredStoreSchema().safeParse(candidate);
    if (!parsed.success) continue;
    let { kind, id, name, visibility } = parsed.data;
    if (kind === "workspace_silo" && !id.startsWith("cagt_")) continue;
    if (kind === "project" && !isGroupingId(id)) continue;
    if (kind !== "workspace_silo" && kind !== "project") continue;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    stores.push({
      kind,
      id,
      name,
      visibility,
      isDefault: parsed.data.default === true,
    });
  }
  return stores;
}
//@ chunk-a2q0x549.js:48998-49168 placement
var discoveryCacheEntrySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var discoveryCacheFileSchema;
deferInit("chunk-a2q0x549.js:48998", () => {
  discoveryCacheEntrySchema = DoctorLazy(() =>
    objectSchema({
      fetchedAt: numberSchema(),
      account: stringSchema(),
      stores: array(unknown()).nullable(),
      candidates: unknown().optional(),
      writeOptInAvailable: unknown().optional(),
    }),
  );
  discoveryCacheFileSchema = DoctorLazy(() =>
    objectSchema({
      entries: record(stringSchema(), unknown()),
    }),
  );
});
//@ chunk-a2q0x549.js:49168-49209 placement (2.1.88 match: getCacheDir, 1)
/**
 * ~/.claude/cache/org-memory-discovery.json。旧版名 getCacheDir_2 为错配（记忆发现模块）。
 */
function getOrgMemoryDiscoveryCachePath() {
  return join_2(getClaudeConfigDir(), "cache", ORG_MEMORY_DISCOVERY_JSON);
}
//@ chunk-a2q0x549.js:49209-49252 placement
var DISCOVERY_CACHE_FILE; // deferred: uses ORG_MEMORY_MOUNTS_PATH of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:49209", () => {
  DISCOVERY_CACHE_FILE = STORAGE_SPACES.cache("org-memory-discovery", ORG_MEMORY_DISCOVERY_JSON);
});
//@ chunk-a2q0x549.js:49252-49683 placement
async function readDiscoveryCache(storageV5) {
  if (isDisklessWithoutState(storageV5)) return {};
  try {
    let raw;
    if (!isStorageV5Enabled() || storageV5 === undefined)
      raw = await getFileReader().read(getOrgMemoryDiscoveryCachePath());
    else {
      let readResult = await storageV5.read([DISCOVERY_CACHE_FILE]);
      if (!readResult.ok) {
        logForDebugging(`org-memory-discovery: cache read failed: ${formatStorageError(readResult.error)}`);
        return {};
      }
      let item = readResult.value.items[0];
      if (!item.found) return {};
      raw = Buffer.from(item.value).toString("utf8");
    }
    let parsed = discoveryCacheFileSchema().safeParse(jsonParse(raw));
    if (parsed.success) return parsed.data.entries;
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`org-memory-discovery: cache read failed: ${errorMessage(error)}`);
  }
  return {};
}
//@ chunk-a2q0x549.js:49683-49815 placement
async function readDiscoveryCacheEntries(storageV5) {
  let entries = {};
  for (let [key, value] of Object.entries(await readDiscoveryCache(storageV5))) {
    let parsed = discoveryCacheEntrySchema().safeParse(value);
    if (parsed.success) entries[key] = parsed.data;
  }
  return entries;
}
//@ chunk-a2q0x549.js:49815-49876 placement
/**
 * 判断发现条目是否新鲜（含账号匹配）。
 */
function isDiscoveryEntryFresh(entry) {
  if (entry === undefined) return false;
  return isFreshTimestamp(entry.fetchedAt);
}
//@ chunk-a2q0x549.js:49876-49928 placement
/**
 * 判断时间戳是否在有效期内。
 */
function isFreshTimestamp(fetchedAt) {
  let ageMs = Date.now() - fetchedAt;
  return ageMs >= 0 && ageMs < DISCOVERY_TTL_MS;
}
//@ chunk-a2q0x549.js:49928-50408 placement
async function writeDiscoveryCache(key, value, storageV5) {
  try {
    let discoveryCache = await readDiscoveryCache(storageV5);
    for (let [key, value] of Object.entries(discoveryCache)) {
      let fetchedAt = value?.fetchedAt;
      if (typeof fetchedAt === "number" && !isFreshTimestamp(fetchedAt)) delete discoveryCache[key];
    }
    discoveryCache[key] = value;
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      let writeResult = await storageV5.write(
        DISCOVERY_CACHE_FILE,
        jsonStringify({
          entries: discoveryCache,
        }),
        {
          mode: 438 & ~process.umask(),
        },
      );
      if (!writeResult.ok)
        logForDebugging(`org-memory-discovery: cache write failed: ${formatStorageError(writeResult.error)}`);
      return;
    }
    if (isDisklessWithoutState(storageV5)) return;
    let fileReader = getFileReader();
    await fileReader.mkdir(join_2(getClaudeConfigDir(), "cache"));
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
//@ chunk-a2q0x549.js:50408-50618 placement
function isMemoryApiPath(path) {
  try {
    let parsedUrl = new URL(path, "https://sentinel.invalid");
    return (
      parsedUrl.origin === "https://sentinel.invalid" &&
      path === parsedUrl.pathname &&
      !parsedUrl.pathname.includes("%") &&
      parsedUrl.pathname.startsWith("/v1/code/memory/")
    );
  } catch {
    return false;
  }
}
//@ chunk-a2q0x549.js:50618-50655 placement
/**
 * 计算发现缓存使用的账号键（有 API 覆盖时为 null）。
 */
function accountKeyForDiscovery() {
  return hasMemoryApiOverride() ? null : getOrgMemoryAccountKey();
}
//@ chunk-a2q0x549.js:50655-51285 placement
async function fetchOrgMemoryDiscovery(credentials) {
  try {
    let response = await apiClient.get(ORG_MEMORY_MOUNTS_PATH, {
      ...memoryApiTarget(),
      credentials,
      timeout: 5000,
      validateStatus: (status) => status === 200 || status === 404,
    });
    if (!response.ok) {
      logForDebugging(`org-memory-discovery: skipped (${response.reason})`);
      return {
        kind: "transient",
      };
    }
    if (response.status === 404)
      return {
        kind: "off",
      };
    let parsed = discoveryResponseSchema().safeParse(response.data);
    if (!parsed.success) {
      logForDebugging(`org-memory-discovery: malformed response: ${parsed.error.message}`, {
        level: "warn",
      });
      return {
        kind: "transient",
      };
    }
    if (!parsed.data.enabled)
      return {
        kind: "off",
      };
    return {
      kind: "stores",
      stores: parsed.data.stores,
      candidates: parsed.data.candidates,
      writeOptIn: parsed.data.write_opt_in_available,
    };
  } catch (error) {
    logForDebugging(`org-memory-discovery: fetch failed: ${errorMessage(error)}`);
    return {
      kind: "transient",
    };
  }
}
//@ chunk-a2q0x549.js:51285-51896 placement
function parseDiscoveryStores(raw) {
  let validatedStores;
  try {
    validatedStores = validateMemoryStores(raw, "org memory discovery");
  } catch (error) {
    logForDebugging(`org-memory-discovery: invalid stores payload: ${errorMessage(error)}`, {
      level: "warn",
    });
    return {
      kind: "invalid",
    };
  }
  if (validatedStores === null)
    return {
      kind: "empty",
    };
  let filtered = validatedStores.filter((store) => store.scope === "team");
  if (filtered.length < validatedStores.length)
    logForDebugging(
      `org-memory-discovery: dropped ${validatedStores.length - filtered.length} non-team store(s)`,
      {
        level: "warn",
      },
    );
  let filtered_2 = filtered.filter((store) => isMemoryApiPath(store.path));
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
    configs: filtered_2.map((store) =>
      store.mode === "ro"
        ? store
        : {
            ...store,
            mode: "ro",
          },
    ),
  };
}
//@ chunk-a2q0x549.js:51896-51936 placement
var MEMORY_MD = "MEMORY.md";
var PUBLIC_PROJECTS_2 = "public_projects";
//@ chunk-a2q0x549.js:51936-52043 placement
function getSelectionLayer(groupingName) {
  if (isPublicProjects(groupingName)) return "root";
  if (isSiloId(groupingName)) return "silo";
  return isGroupingId(groupingName) && findGroupingStore(groupingName) === undefined ? "root" : "grouping";
}
//@ chunk-a2q0x549.js:52043-52310 placement
function renameSquattingMount(configs, mountName, path) {
  let isSquatting = (config) =>
    config.mount === mountName && stripTrailingSlashes(config.path) !== stripTrailingSlashes(path);
  if (!configs.some(isSquatting)) return configs;
  logForDebugging(
    `org-memory-discovery: discovered config squatting the derived mount name ${mountName} \u2014 renamed aside`,
    {
      level: "warn",
    },
  );
  return configs.map((config) =>
    isSquatting(config)
      ? {
          ...config,
          mount: `${config.mount}_discovered`,
        }
      : config,
  );
}
//@ chunk-a2q0x549.js:52310-52327 placement
/**
 * 每轮等待时间（1500 毫秒）。
 */
var MAX_IDENTITY_WAIT_ROUNDS = 3;
var IDENTITY_WAIT_MS = 1500;
//@ chunk-a2q0x549.js:52327-52354 placement
/**
 * 等待身份就绪。
 */
function waitForIdentity() {
  return sleep(IDENTITY_WAIT_MS);
}
//@ chunk-a2q0x549.js:52354-52557 placement
async function writeDiscoveryCacheEntry(key, account, orgMemoryDiscovery, storageV5) {
  await writeDiscoveryCache(
    key,
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
//@ chunk-a2q0x549.js:52557-52756 placement
function getCandidateTelemetry(candidates) {
  return {
    candidates: candidates.length,
    candidate_count_public: countWhere(
      candidates,
      (candidate) => candidate.kind === "project" && candidate.visibility === "public",
    ),
    candidate_count_private: countWhere(
      candidates,
      (candidate) => candidate.kind === "project" && candidate.visibility === "private",
    ),
  };
}
//@ chunk-a2q0x549.js:52756-52780 placement
/**
 * 等待组织记忆决定完成的超时（15 秒）。
 */
var DISCOVERY_CACHE_TTL_MS = 3600000;
var DECISION_SETTLE_TIMEOUT_MS = 15000;
//@ chunk-a2q0x549.js:52780-64129 placement
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
  setIdentityWaitDelay(delay) {
    this.identityWaitDelay = delay ?? waitForIdentity;
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
  adoptHandIns(storageV5, credentials) {
    if (storageV5 !== undefined) this.storageV5 = storageV5;
    if (credentials === undefined) return;
    if (this.credentials !== undefined && this.credentials !== credentials) {
      logForDebugging(
        "org-memory-discovery: a credentials store was already handed in; the later one is ignored",
      );
      return;
    }
    this.credentials = credentials;
  }
  emitGrantMissingOnce() {
    if (!this.grantMissingEmitted) {
      this.grantMissingEmitted = true;
      logFeatureSad("org_memory_picker", "grant_missing");
    }
  }
  pickedCandidateIsPrivate(candidateId) {
    return (
      this.lastPickerData?.candidates.some(
        (candidate) => candidate.id === candidateId && candidate.visibility === "private",
      ) === true
    );
  }
  rootPromptIndexFocus(rootStore) {
    let promptIndex = rootStore.prompt_index;
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
  withSelectedGroupingMounts(stores, groupingId, writeGranted) {
    let selected = hasMirror() ? stores.filter((store) => grantedModeFor(store.path) !== undefined) : stores;
    let groupingStore = findGroupingStore(groupingId);
    if (groupingStore === undefined) {
      if (!wasLastMintSelectionDegraded()) this.emitGrantMissingOnce();
      return selected;
    }
    if (!isMemoryApiPath(groupingStore.path)) {
      logForDebugging(
        "org-memory-discovery: granted grouping path failed the partition pin \u2014 not mounting",
        {
          level: "warn",
        },
      );
      this.emitGrantMissingOnce();
      return selected;
    }
    let mounts = [...selected];
    let alreadyMounted = (path) =>
      mounts.some((mount) => stripTrailingSlashes(mount.path) === stripTrailingSlashes(path));
    let claimMount = (mountName, path) => {
      if (alreadyMounted(path)) return true;
      mounts = renameSquattingMount(mounts, mountName, path);
      return false;
    };
    for (let store of grantedStoresCopy().filter(isSiloStore)) {
      let normalizedPath = stripTrailingSlashes(store.path);
      let sliced = normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
      if (!sliced.startsWith("cagt_") || !isMemoryApiPath(store.path)) {
        logForDebugging(
          "org-memory-discovery: granted silo entry failed the tag or partition pin \u2014 not mounting",
          {
            level: "warn",
          },
        );
        continue;
      }
      let siloMount = `silo_${sliced.replace(/[^A-Za-z0-9_-]/g, "-")}`;
      if (claimMount(siloMount, store.path)) continue;
      mounts.push({
        path: store.path,
        mount: siloMount,
        scope: "team",
        mode: writeGranted && store.mode === "rw" ? "rw" : "ro",
        promptIndex: "MEMORY.md",
      });
    }
    let groupingMount = `project_${groupingId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    if (!claimMount(groupingMount, groupingStore.path))
      mounts.push({
        path: groupingStore.path,
        mount: groupingMount,
        scope: "team",
        mode: "ro",
        promptIndex: "MEMORY.md",
        ...(groupingStore.visibility === "private" && {
          owned: true,
        }),
      });
    else if (groupingStore.visibility === "private")
      mounts.forEach((mount, mountIndex) => {
        if (stripTrailingSlashes(mount.path) === stripTrailingSlashes(groupingStore.path))
          mounts[mountIndex] = {
            ...mount,
            owned: true,
          };
      });
    let groupingRootStore = findGroupingRootStore();
    if (
      groupingRootStore !== undefined &&
      isMemoryApiPath(groupingRootStore.path) &&
      !claimMount(PUBLIC_PROJECTS_2, groupingRootStore.path)
    )
      mounts.push({
        path: groupingRootStore.path,
        mount: PUBLIC_PROJECTS_2,
        scope: "team",
        mode: "ro",
        promptIndex: MEMORY_MD,
      });
    return mounts;
  }
  withSelectedGroupingRootMount(stores, groupingId, writeGranted) {
    let selected = hasMirror() ? stores.filter((store) => grantedModeFor(store.path) !== undefined) : stores;
    let groupingRootStore = findGroupingRootStore();
    if (groupingRootStore === undefined) {
      if (!wasLastMintSelectionDegraded()) this.emitGrantMissingOnce();
      return selected;
    }
    if (!isMemoryApiPath(groupingRootStore.path)) {
      logForDebugging(
        "org-memory-discovery: granted grouping-root path failed the partition pin \u2014 not mounting",
        {
          level: "warn",
        },
      );
      this.emitGrantMissingOnce();
      return selected;
    }
    let promptIndex = isPublicProjects(groupingId) ? undefined : this.rootPromptIndexFocus(groupingRootStore);
    let isPublic = isPublicProjects(groupingId);
    let mode = writeGranted && !isPublic && isRootLiftable() ? "rw" : "ro";
    if (writeGranted) {
      let liftReason = rootLiftReason();
      logEvent("tengu_org_memory_root_write_outcome", {
        outcome: fromEnum(
          mode === "rw"
            ? "rw_granted"
            : isPublic
              ? "legacy_selection"
              : liftReason === "private_candidate"
                ? "private_candidate_veto"
                : liftReason === "conflicted_mirror"
                  ? "conflicted_mirror"
                  : liftReason === "private_grouping"
                    ? "private_grouping"
                    : liftReason === "mirror_ro"
                      ? "mirror_ro"
                      : "verdict_failed",
        ),
      });
    }
    let any = selected.some(
      (mount) => stripTrailingSlashes(mount.path) === stripTrailingSlashes(groupingRootStore.path),
    );
    let mounted = any ? selected : renameSquattingMount(selected, PUBLIC_PROJECTS_2, groupingRootStore.path);
    let result = any
      ? promptIndex === undefined
        ? mounted
        : mounted.map((mount) =>
            stripTrailingSlashes(mount.path) === stripTrailingSlashes(groupingRootStore.path)
              ? {
                  ...mount,
                  promptIndex: promptIndex.index,
                }
              : mount,
          )
      : [
          ...mounted,
          {
            path: groupingRootStore.path,
            mount: PUBLIC_PROJECTS_2,
            scope: "team",
            mode,
            promptIndex: promptIndex?.index ?? MEMORY_MD,
          },
        ];
    let found = result.find(
      (mount) => stripTrailingSlashes(mount.path) === stripTrailingSlashes(groupingRootStore.path),
    );
    logEvent("tengu_org_memory_root_mount_derived", {
      mount_name: found?.mount === PUBLIC_PROJECTS_2 ? lit(PUBLIC_PROJECTS_2) : lit("discovered"),
      mode: fromEnum(found?.mode ?? "ro"),
      prompt_index_source: fromEnum(promptIndex?.source ?? "none"),
    });
    return result;
  }
  async awaitSelectionIdentity() {
    let accountKey = selectionAccountKey();
    if (accountKey !== null) return accountKey;
    if (this.identityWaitSpentGen === this.discoveryGeneration) return null;
    this.identityWaitSpentGen = this.discoveryGeneration;
    for (let j = 0; accountKey === null && j < MAX_IDENTITY_WAIT_ROUNDS; j++) {
      await this.identityWaitDelay();
      accountKey = selectionAccountKey();
    }
    return accountKey;
  }
  async applyGrantAdjustments(generation, accountKey, stores) {
    let orgMemoryDecision = getOrgMemoryDecision();
    if (orgMemoryDecision.state !== "undecided")
      return orgMemoryDecision.state === "on" ? [...orgMemoryDecision.stores] : null;
    if (!this.decidingRun) return null;
    let identity = await this.awaitSelectionIdentity();
    let isSuperseded = () => {
      if (this.discoveryGeneration !== generation) return true;
      let expectedIdentity = accountKey ?? identity;
      if (expectedIdentity === null) return false;
      let currentIdentity = selectionAccountKey();
      return currentIdentity !== null && currentIdentity !== expectedIdentity;
    };
    if (isSuperseded()) {
      settleOrgMemoryDecisionOff("superseded");
      return null;
    }
    if (identity === null) {
      settleOrgMemoryDecisionOff("identity_unresolved");
      logForDebugging(
        "org-memory-discovery: identity unresolved at decision time \u2014 org memory off for this session",
      );
      return null;
    }
    let mint;
    try {
      mint = await negotiateOrgMemoryCredential(this.credentials, this.storageV5);
    } catch (error) {
      logForDebugging(`org-memory-discovery: decision-time negotiation failed: ${errorMessage(error)}`);
      settleOrgMemoryDecisionOff(
        this.discoveryGeneration === generation ? "negotiation_failed" : "superseded",
      );
      return null;
    }
    let request = mint.request;
    let selectionIsGrouping =
      request.selection !== null && isGroupingId(request.selection) && isRootLiftable();
    let adjusted = request.writeAccess
      ? stores.map((store) => {
          if (grantedModeFor(store.path) !== "rw") return store;
          if (isGrantedSiloStore(store.path))
            return {
              ...store,
              mode: "rw",
            };
          if (selectionIsGrouping && isRootStorePath(store.path))
            return {
              ...store,
              mode: "rw",
            };
          return store;
        })
      : stores;
    if (request.selection !== null) {
      let selectionLayer = getSelectionLayer(request.selection);
      adjusted =
        selectionLayer === "root"
          ? this.withSelectedGroupingRootMount(adjusted, request.selection, request.writeAccess)
          : selectionLayer === "silo"
            ? this.withSelectedSiloMount(adjusted, request.selection, request.writeAccess)
            : this.withSelectedGroupingMounts(adjusted, request.selection, request.writeAccess);
    } else if (hasMirror()) adjusted = adjusted.filter((store) => grantedModeFor(store.path) !== undefined);
    if (isSuperseded()) {
      settleOrgMemoryDecisionOff("superseded");
      return null;
    }
    if (adjusted.length === 0) {
      settleOrgMemoryDecisionOff("no_stores");
      return null;
    }
    let pinnedDefault = request.selection === null && !mint.degraded ? getSingleSiloId() : null;
    if (
      !settleOrgMemoryDecisionOn({
        identity,
        stores: adjusted,
        request: {
          writeAccess: request.writeAccess,
          selection: request.selection ?? pinnedDefault,
        },
        selectionKind: classifySelectionKind(request.selection ?? pinnedDefault),
        selectionSource:
          request.selection !== null ? "preference" : pinnedDefault !== null ? "pinned_default" : "none",
        initialGrant: grantedStoresCopy(),
        degraded: mint.degraded,
      })
    )
      return null;
    return adjusted;
  }
  withSelectedSiloMount(stores, selection, writeGranted) {
    if (!hasMirror()) return stores;
    let filtered = stores.filter((store) => grantedModeFor(store.path) !== undefined);
    let grantedSilo = findGrantedSilo(selection);
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
    if (!isStoreBasename(grantedSilo.path, selection)) {
      if (!this.selectionNotGrantedEmitted && !wasLastMintSelectionDegraded()) {
        this.selectionNotGrantedEmitted = true;
        logFeatureSad("org_memory_picker", "selection_not_granted");
      }
      return filtered;
    }
    if (filtered.some((mount) => stripTrailingSlashes(mount.path) === stripTrailingSlashes(grantedSilo.path)))
      return filtered;
    let mountName = `silo_${selection.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    if (filtered.some((mount) => mount.mount === mountName)) return filtered;
    return [
      ...filtered,
      {
        path: grantedSilo.path,
        mount: mountName,
        scope: "team",
        mode: writeGranted && grantedSilo.mode === "rw" ? "rw" : "ro",
        promptIndex: "MEMORY.md",
      },
    ];
  }
  async runDiscovery() {
    let discoveryGeneration = this.discoveryGeneration;
    installPrivateProbe((candidateId) => this.pickedCandidateIsPrivate(candidateId));
    let setPickerData = (lastPickerData) => {
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
    let key = getCwd();
    let account = accountKeyForDiscovery();
    let identityUnchanged = () =>
      account !== null &&
      discoveryGeneration === this.discoveryGeneration &&
      accountKeyForDiscovery() === account;
    let cachedEntry = account === null ? undefined : (await readDiscoveryCacheEntries(this.storageV5))[key];
    if (account !== null && isDiscoveryEntryFresh(cachedEntry) && cachedEntry.account === account) {
      if (cachedEntry.stores === null) {
        settleOrgMemoryDecisionOff("server_off");
        setPickerData(null);
        logFeatureOk("org_memory_discovery", {
          off: true,
          cached: true,
        });
        return null;
      }
      let discoveryStores = parseDiscoveryStores(cachedEntry.stores);
      if (discoveryStores.kind === "configs") {
        let candidates = parseStoreCandidates(cachedEntry.candidates);
        setPickerData({
          candidates,
          writeOptInAvailable: cachedEntry.writeOptInAvailable === true,
        });
        logFeatureOk("org_memory_discovery", {
          stores: discoveryStores.configs.length,
          cached: true,
          ...getCandidateTelemetry(candidates),
        });
        return this.applyGrantAdjustments(discoveryGeneration, account, discoveryStores.configs);
      }
      if (discoveryStores.kind === "empty") {
        let candidates = parseStoreCandidates(cachedEntry.candidates);
        if (candidates.length > 0) {
          setPickerData({
            candidates,
            writeOptInAvailable: cachedEntry.writeOptInAvailable === true,
          });
          logFeatureOk("org_memory_discovery", {
            stores: 0,
            cached: true,
            ...getCandidateTelemetry(candidates),
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
        setPickerData(null);
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
      setPickerData(null);
      if (
        account !== null &&
        discoveryGeneration === this.discoveryGeneration &&
        accountKeyForDiscovery() === account
      )
        await writeDiscoveryCache(
          key,
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
      setPickerData(null);
      logFeatureBad("org_memory_discovery", "invalid_stores");
      return null;
    }
    if (discoveryStores.kind === "configs" && account !== null && identityUnchanged())
      await writeDiscoveryCacheEntry(key, account, orgMemoryDiscovery, this.storageV5);
    if (discoveryStores.kind === "empty") {
      if (lastPickerData !== null && lastPickerData.candidates.length > 0) {
        if (orgMemoryDiscovery.stores.length === 0 && account !== null && identityUnchanged())
          await writeDiscoveryCacheEntry(key, account, orgMemoryDiscovery, this.storageV5);
        setPickerData(lastPickerData);
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
        setPickerData(lastPickerData);
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
        setPickerData(null);
        logFeatureOk("org_memory_discovery", {
          stores: 0,
          cached: false,
        });
        return null;
      }
      settleOrgMemoryDecisionOff("empty");
      setPickerData(null);
      logFeatureSad("org_memory_discovery", "all_stores_dropped");
      return null;
    }
    setPickerData(lastPickerData);
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
  async discoverForDecision(storageV5, credentials) {
    this.adoptHandIns(storageV5, credentials);
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
  async discover(storageV5, credentials) {
    this.adoptHandIns(storageV5, credentials);
    this.ensureShrinkSubscription();
    if (getCurrentProjectConfig().orgMemoryRead === false) {
      settleOrgMemoryDecisionOff("read_disabled");
      return null;
    }
    return this.discoverMemoized();
  }
  reconnect(beforeReconnect) {
    let run = () => {
      beforeReconnect?.();
      return this.runReconnect();
    };
    let next = this.reconnectChain.then(run, run);
    this.reconnectChain = next;
    return next;
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
  disconnect(beforeDisconnect) {
    let run = () => {
      beforeDisconnect?.();
      return this.runDisconnect();
    };
    let next = this.reconnectChain.then(run, run);
    this.reconnectChain = next;
    return next;
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
//@ chunk-a2q0x549.js:64129-64154 placement
/**
 * 按宿主保存的发现状态。
 */
var orgMemoryDiscoveryState; // deferred: uses OrgMemoryDiscovery of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:64129", () => {
  orgMemoryDiscoveryState = new HostScoped(() => new OrgMemoryDiscovery());
});
//@ chunk-a2q0x549.js:64154-64191 placement
/**
 * 取当前宿主的发现状态。
 */
function getOrgMemoryDiscovery() {
  return orgMemoryDiscoveryState.of(getRootSession().host);
}
//@ chunk-a2q0x549.js:64191-64225 placement
function clearOrgMemoryDiscoveryCaches() {
  getOrgMemoryDiscovery().clearCaches();
}
//@ chunk-a2q0x549.js:64225-64265 placement
function clearOrgMemoryDiscoveryAccountState() {
  getOrgMemoryDiscovery().clearAccountState();
}
//@ chunk-a2q0x549.js:64265-64317 placement
function getOrgMemoryPickerData() {
  return isOrgMemoryDiscoveryEnabled() ? getOrgMemoryDiscovery().lastPickerData : null;
}
//@ chunk-a2q0x549.js:64317-64367 placement
function hasOrgMemoryDecisionRunStarted() {
  return getOrgMemoryDiscovery().decisionRunEverStarted;
}
//@ chunk-a2q0x549.js:64367-64421 placement
function rebuildMemoryPromptOnLateSettle() {
  getOrgMemoryDiscovery().rebuildMemoryPromptOnLateSettle();
}
//@ chunk-a2q0x549.js:64421-64476 placement
function discoverOrgMemoryStoresForDecision(storageV5, credentials) {
  return getOrgMemoryDiscovery().discoverForDecision(storageV5, credentials);
}
//@ chunk-a2q0x549.js:64476-64520 placement (2.1.88 match: _pendingAssistantChat, 1)
/**
 * 发现组织级记忆存储（切分可疑）。
 */
function discoverOrgMemoryStores(storageV5, signal) {
  return getOrgMemoryDiscovery().discover(storageV5, signal);
}
//@ chunk-a2q0x549.js:64520-64561 placement
function reconnectOrgMemory(beforeReconnect) {
  return getOrgMemoryDiscovery().reconnect(beforeReconnect);
}
//@ chunk-a2q0x549.js:64561-64603 placement
function disconnectOrgMemory(beforeDisconnect) {
  return getOrgMemoryDiscovery().disconnect(beforeDisconnect);
}
//@ chunk-a2q0x549.js:64603-64854 placement
function getPreferredStore() {
  let orgMemoryDecision = getOrgMemoryDecision();
  if (orgMemoryDecision.state !== "on" || orgMemoryDecision.selectionSource !== "preference") return;
  let selection = orgMemoryDecision.request.selection;
  if (selection === null || !hasMirror()) return;
  let selectionLayer = getSelectionLayer(selection);
  let store =
    selectionLayer === "root"
      ? findGroupingRootStore()
      : selectionLayer === "silo"
        ? findGrantedSilo(selection)
        : findGroupingStore(selection);
  if (store === undefined) return;
  if (isSiloId(selection) && !isStoreBasename(store.path, selection)) return;
  return store;
}
//@ chunk-a2q0x549.js:64854-64937 placement
function isSelectionMounted(selection) {
  let preferredStore = getPreferredStore();
  return (
    preferredStore !== undefined &&
    selection.some((store) => stripTrailingSlashes(store.path) === stripTrailingSlashes(preferredStore.path))
  );
}
export {
  discoverOrgMemoryStores,
  getOrgMemoryPickerData,
  hasOrgMemoryDecisionRunStarted,
  rebuildMemoryPromptOnLateSettle,
  discoverOrgMemoryStoresForDecision,
  isSelectionMounted,
  disconnectOrgMemory,
  reconnectOrgMemory,
  clearOrgMemoryDiscoveryCaches,
  clearOrgMemoryDiscoveryAccountState,
};
