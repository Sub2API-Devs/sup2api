/**
 * services/remoteManagedSettings/remoteSettingsCache.ts
 *
 * 2.1.316 新增：远程设置存储监视器（缓存文件与 helper 同意副本）；未验证的远程设置中扣下的环境变量键等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (43)
 * attribution: placement 43
 */
import { join } from "path";
import {
  withHostOwnedEnvGuard,
  isSecDefaultPluginEnabled,
  getEnvCaseInsensitive,
} from "../../utils/plugins/securityDefaultPlugin.js";
import {
  hasManagedOrCoworkSurface,
  extractRestrictionSettings,
  getAtPath,
  setAtPath,
} from "../../utils/settings/managedRestrictionKeys.js";
import { env } from "../../utils/env.js";
import { DESKTOP_ENTRYPOINTS, isProviderManagedByHost } from "../../utils/entrypointKinds.js";
import {
  getRemoteSettingsPathOverride,
  SETTINGS_FILENAME,
  currentRemoteSettingsState_2,
  isManagedSettingsCopyTrustEnforced,
  MAX_BACKEND_SETTINGS_BYTES,
  stripReservedKeys,
  servedBodyOf,
  getHelperConsentPath,
  HELPER_CONSENT_STATE_ID,
  MAX_STORAGE_VIEW_BYTES,
  isSnapshotOnlySession,
} from "./remoteSettingsState.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { import_sortedIndex_2, import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import { isFileTooLargeError, readFileSync, decodeTextBuffer } from "../../utils/fileRead.js";
import { logForDebugging } from "../../utils/debug.js";
import { isSoftVerificationFailure, verifySignedCache } from "../../utils/settings/policyCertificates.js";
import { computeChecksum } from "../policyLimits/index.js";
import { errorMessage } from "../../utils/errors.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import {
  isMergingPolicyHelper,
  policyHelperSlots,
  isPolicyHelperPath,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { PROVIDER_ENV_FLAGS } from "../../utils/model/modelIds.js";
import { isDiskless } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isSameConfigDir, getClaudeConfigDirOrNull } from "../../utils/envUtils.js";
import { STORAGE_SPACES, storageSpaceId } from "../../utils/storage/storageSpaces.js";
import { formatStorageError, storageErrorCode } from "../../utils/storage/storageErrors.js";
import {
  NETWORK_ENV_VARS,
  PROVIDER_SELECTION_ENV_VARS,
  BASE_URL_ENV_VARS,
  HOST_ONLY_ENV_VARS,
  AWS_CREDENTIAL_ENV_VARS,
  GCE_METADATA_ENV_VARS,
  PROVIDER_CREDENTIAL_ENV_VARS,
} from "../../utils/managedEnvConstants.js";
import { platformSettingsChain } from "../../utils/settings/marketplaceSettingsAliases.js";
import { invalidateCommandNames, commandSyncNameState } from "../../utils/settings/commandSyncNames.js";
import { restrictionsOfUnvouchedDocumentUnsafe, CREDENTIAL_LIST_PATHS } from "./unvouchedRestrictions.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:400544-400666 placement
function hostSessionSkipsSharedCache() {
  return withHostOwnedEnvGuard(
    () =>
      hasManagedOrCoworkSurface() ||
      (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
        DESKTOP_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "")) ||
      isProviderManagedByHost(),
  );
}
//@ chunk-z20c443b.js:400666-400706 placement
function holdsNoServedSettings(remoteSettingsEligibility) {
  return (
    remoteSettingsEligibility && !hasManagedOrCoworkSurface() && !getRemoteManagedSettingsSyncFromCache()
  );
}
//@ chunk-z20c443b.js:400706-400746 placement
function getSettingsPath() {
  return getRemoteSettingsPathOverride() ?? join(getClaudeConfigDir(), SETTINGS_FILENAME);
}
//@ chunk-z20c443b.js:400746-400768 placement
function getMockRemoteSettingsValue() {
  return;
}
//@ chunk-z20c443b.js:400768-400862 placement
function getMockRemoteSettingsFixturePath() {
  let mockRemoteSettingsValue = getMockRemoteSettingsValue();
  return mockRemoteSettingsValue !== undefined &&
    mockRemoteSettingsValue.startsWith("@") &&
    mockRemoteSettingsValue.length > 1
    ? mockRemoteSettingsValue.slice(1)
    : undefined;
}
//@ chunk-z20c443b.js:400862-400877 placement
var MAX_REMOTE_SETTINGS_FILE_BYTES = 8388608;
//@ chunk-z20c443b.js:400877-400953 placement
/**
 * 把磁盘上的远程设置副本收窄为限制键集合（仅在开启相关处理时），未收窄则原样返回。
 */
function narrowToRestrictions(settings) {
  if (settings === null || !hasManagedOrCoworkSurface()) return settings;
  let restrictionSettings = extractRestrictionSettings(settings);
  return import_sortedIndex_2(restrictionSettings, settings) ? settings : restrictionSettings;
}
//@ chunk-z20c443b.js:400953-401460 placement
/**
 * 读取磁盘上的远程设置副本（检查信任与大小）。
 */
function loadStoredRemoteSettings() {
  if (hostSessionSkipsSharedCache()) return null;
  let state = currentRemoteSettingsState_2();
  let storedCopyRefusal = state.storedCopyRefusal;
  if (
    storedCopyRefusal !== null &&
    isManagedSettingsCopyTrustEnforced() &&
    Date.now() - storedCopyRefusal.atMs < MAX_BACKEND_SETTINGS_BYTES
  ) {
    state.storedCopyTrust = {
      trusted: false,
      reason: storedCopyRefusal.reason,
    };
    return null;
  }
  state.storedCopyTrust = "not_asked";
  state.storedCopyRefusal = null;
  state.refusedCopyHelperTier = null;
  try {
    let remoteSettingsFileStable = readRemoteSettingsFileStable();
    if (remoteSettingsFileStable === null) return null;
    let parsed = jsonParse(stripBom(remoteSettingsFileStable));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    let settings = stripReservedKeys(parsed);
    return checkStoredCopyTrust(settings) ? settings : null;
  } catch (error) {
    if (isFileTooLargeError(error))
      logForDebugging(
        `Remote settings: Disk cache exceeds ${MAX_REMOTE_SETTINGS_FILE_BYTES} bytes; ignoring it as if absent`,
      );
    return null;
  }
}
//@ chunk-z20c443b.js:401460-401879 placement
/**
 * 检查远程设置副本的信任（组织固定、签名）。
 */
function checkStoredCopyTrust(settings) {
  let state = currentRemoteSettingsState_2();
  if (
    !isManagedSettingsCopyTrustEnforced() ||
    !state.storedCopyGateCovers ||
    getRemoteSettingsPathOverride() !== undefined ||
    state.evalPolicySnapshotOnly
  ) {
    state.storedCopyTrust = "not_asked";
    return true;
  }
  let storedCopyOrgPin = state.storedCopyOrgPin;
  if (storedCopyOrgPin.kind === "read") {
    let verdict = verifyStoredCopy(settings, storedCopyOrgPin.orgs);
    if (verdict.trusted) {
      state.storedCopyTrust = verdict;
      return true;
    }
    refuseStoredCopy(settings, verdict.reason, isSoftVerificationFailure(verdict.reason));
    return false;
  }
  let softVerdict =
    settings.forceRemoteSettingsRefresh === true ? verifyStoredCopy(settings, undefined) : undefined;
  refuseStoredCopy(
    settings,
    "org_pin_unknown",
    softVerdict !== undefined && (softVerdict.trusted || isSoftVerificationFailure(softVerdict.reason)),
  );
  return false;
}
//@ chunk-z20c443b.js:401879-402188 placement
/**
 * 校验远程设置副本签名。
 */
function verifyStoredCopy(settings, pinnedOrgs) {
  try {
    return verifySignedCache({
      kind: "managed-settings",
      cachePath: getSettingsPath(),
      body: servedBodyOf(settings),
      bodySha: computeChecksum(servedBodyOf(settings)),
      account: currentRemoteSettingsState_2().storedAccountReader?.(),
      pinnedOrgs,
      nowMs: Date.now(),
      roots: isSecDefaultPluginEnabled(),
    });
  } catch (error) {
    logForDebugging(`Remote settings: the gate on a stored copy failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      trusted: false,
      reason: "error",
    };
  }
}
//@ chunk-z20c443b.js:402188-402513 placement
/**
 * 拒绝不可信的远程设置副本。
 */
function refuseStoredCopy(settings, reason, mayForceRefresh) {
  let state = currentRemoteSettingsState_2();
  state.storedCopyTrust = {
    trusted: false,
    reason,
  };
  state.storedCopyRefusal = {
    atMs: Date.now(),
    reason,
    forcesRefresh: mayForceRefresh && settings.forceRemoteSettingsRefresh === true,
  };
  state.refusedCopyHelperTier = isSoftVerificationFailure(reason) ? helperTierFor(settings) : null;
  state.seedConsentBaseline(settings);
  logForDebugging(
    `Remote settings: the stored copy is not trusted at rest (${reason}); treating it as absent`,
  );
}
//@ chunk-z20c443b.js:402513-402688 placement (2.1.88 match: hasApiKeyHelper, 1)
function helperTierOf(settings) {
  if (settings === null) return null;
  let { apiKeyHelper, env } = settings;
  return typeof apiKeyHelper === "string" && apiKeyHelper.trim() !== ""
    ? {
        apiKeyHelper,
        env: pickByHelper(isPlainObject_2(env) ? env : {}, (value) => typeof value === "string"),
      }
    : null;
}
//@ chunk-z20c443b.js:402688-402823 placement
function helperTierFor(settings) {
  let [layer] = orderedPlatformLayers(settings);
  if (settings === null || layer === undefined) return helperTierOf(settings);
  let [layerName, layerSettings] = layer;
  return helperTierOf(
    isMergingPolicyHelper(settings, layerName)
      ? {
          ...settings,
          ...layerSettings,
          env: {
            ...settings.env,
            ...layerSettings.env,
          },
        }
      : layerSettings,
  );
}
//@ chunk-z20c443b.js:402823-402919 placement
/**
 * 会话缓存的 helper 层级：缓存等于已验证载荷时按其自身层级判定，否则按别的规则。
 */
function helperTierOfSessionCache(state) {
  return state.sessionCache === state.verifiedPayload
    ? helperTierOf(state.sessionCache)
    : helperTierFor(state.sessionCache);
}
//@ chunk-z20c443b.js:402919-403276 placement
function getRemoteHelperTier() {
  let state = currentRemoteSettingsState_2();
  let helperTierReadAtMs = state.helperTierReadAtMs;
  if (
    state.sessionCache === null &&
    (helperTierReadAtMs === null || Date.now() - helperTierReadAtMs >= MAX_BACKEND_SETTINGS_BYTES)
  ) {
    state.helperTierReadAtMs = Date.now();
    getRemoteManagedSettingsRawCache();
  }
  let { sessionCache, refusedCopyHelperTier, droppedHelperTier } = state;
  let tier = helperTierOfSessionCache(state);
  if (tier !== null) return tier;
  if (sessionCache === null && refusedCopyHelperTier !== null) return refusedCopyHelperTier;
  if (droppedHelperTier === null) return null;
  let env = inheritedProviderEnv(droppedHelperTier, sessionCache);
  return Object.keys(env).length === 0
    ? null
    : {
        ...droppedHelperTier,
        env,
      };
}
//@ chunk-z20c443b.js:403276-403493 placement
function inheritedProviderEnv(droppedHelperTier, sessionCache) {
  let env = droppedHelperTier.env ?? {};
  let env_2 = isPlainObject_2(sessionCache?.env) ? sessionCache.env : {};
  let inherited = {};
  for (let name of ["ANTHROPIC_BASE_URL", "CLAUDE_CODE_API_BASE_URL", ...PROVIDER_ENV_FLAGS]) {
    let trimmed = getEnvCaseInsensitive(env, name)?.trim();
    if (trimmed && trimmed === process.env[name]?.trim() && getEnvCaseInsensitive(env_2, name) === undefined)
      inherited[name] = trimmed;
  }
  return inherited;
}
//@ chunk-z20c443b.js:403493-403579 placement
function isConfirmedHelperHeld() {
  let { sessionCache, verifiedPayload } = currentRemoteSettingsState_2();
  return sessionCache === verifiedPayload && helperTierOf(sessionCache) !== null;
}
//@ chunk-z20c443b.js:403579-403827 placement
function getRemoteHelperGap() {
  let state = currentRemoteSettingsState_2();
  if (helperTierOfSessionCache(state) !== null)
    return state.sessionCache === state.verifiedPayload ? null : "settings_unloaded";
  if (state.sessionCache === null && state.refusedCopyHelperTier !== null) return "settings_unloaded";
  return state.droppedHelperTier === null ? null : "restart_needed";
}
//@ chunk-z20c443b.js:403827-403839 placement
var MAX_HELPER_CONSENT_BYTES = 4096;
//@ chunk-z20c443b.js:403839-403966 placement
function readHelperConsentAttestation() {
  let backendView = getBackendView();
  if (backendView !== undefined) return backendView.attestation;
  if (isDiskless()) return;
  try {
    return readFileSync(getHelperConsentPath(), MAX_HELPER_CONSENT_BYTES).trim() || undefined;
  } catch {
    return;
  }
}
//@ chunk-z20c443b.js:403966-403975 placement
var READ_STABILITY_ATTEMPTS = 4;
//@ chunk-z20c443b.js:403975-404177 placement
function readRemoteSettingsFileStable() {
  let backendView = getBackendView();
  if (backendView !== undefined) return backendView.content;
  if (isDiskless() && getRemoteSettingsPathOverride() === undefined) return null;
  {
    let file = readFileSync(getSettingsPath(), MAX_REMOTE_SETTINGS_FILE_BYTES);
    for (let j = 0; j < READ_STABILITY_ATTEMPTS; j++) {
      let file_2 = readFileSync(getSettingsPath(), MAX_REMOTE_SETTINGS_FILE_BYTES);
      if (file_2 === file) return file;
      file = file_2;
    }
    return null;
  }
  return readFileSync(getSettingsPath(), MAX_REMOTE_SETTINGS_FILE_BYTES);
}
//@ chunk-z20c443b.js:404177-404353 placement
function getBackendView() {
  let backendView = currentRemoteSettingsState_2().backendView;
  if (
    !isStorageV5Enabled() ||
    backendView === undefined ||
    !backendView.ready ||
    backendView.stoodDown ||
    getRemoteSettingsPathOverride() !== undefined
  )
    return;
  if (!isSameConfigDir(backendView.configHome)) {
    backendView.standDown("config home changed");
    return;
  }
  return backendView;
}
//@ chunk-z20c443b.js:404353-404413 placement
var REMOTE_SETTINGS_STATE_ID; // deferred: uses SETTINGS_FILENAME (./remoteSettingsState.js) of its import cycle while loading; runs once the cycle is complete
var CONSENT_STATE_STORAGE_ID;
var MAX_STORAGE_EVENT_LAG_MS;
deferInit("chunk-z20c443b.js:404353", () => {
  REMOTE_SETTINGS_STATE_ID = STORAGE_SPACES.state("remote-settings");
  CONSENT_STATE_STORAGE_ID = STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID);
  MAX_STORAGE_EVENT_LAG_MS = 2000;
});
//@ chunk-z20c443b.js:404413-404478 placement
function remoteSettingsFileWritten(which, text) {
  currentRemoteSettingsState_2().backendView?.written(
    which === "cache" ? REMOTE_SETTINGS_STATE_ID : CONSENT_STATE_STORAGE_ID,
    text,
  );
}
//@ chunk-z20c443b.js:404478-404809 placement
async function primeRemoteManagedSettingsCache(storageV5) {
  if (!isStorageV5Enabled() || storageV5 === undefined) return;
  let state = currentRemoteSettingsState_2();
  if (state.backendView !== undefined) return state.backendView.priming;
  if (getRemoteSettingsPathOverride() !== undefined) {
    logForDebugging(
      "Remote settings: storage prime skipped (CLAUDE_CODE_REMOTE_SETTINGS_PATH override); disk probe stays",
    );
    return;
  }
  if (hostSessionSkipsSharedCache()) return;
  let watcher = new RemoteSettingsStorageWatcher(storageV5);
  state.backendView = watcher;
  watcher.priming = watchRemoteSettingsStorage(watcher, storageV5, state);
  return watcher.priming;
}
//@ chunk-z20c443b.js:404809-405420 placement
/**
 * 订阅存储中的远程设置变化。
 */
async function watchRemoteSettingsStorage(watcher, storageV5, state) {
  try {
    for (let key of [CONSENT_STATE_STORAGE_ID, REMOTE_SETTINGS_STATE_ID]) {
      let subscription = await storageV5.subscribe(
        {
          target: "key",
          key,
        },
        (event) => watcher.onEvent(event),
        {
          maxObservationLagMs: MAX_STORAGE_EVENT_LAG_MS,
        },
      );
      if (!subscription.ok) {
        watcher.standDown(`watch refused: ${formatStorageError(subscription.error)}`, "warn");
        return;
      }
      if (watcher.stoodDown) {
        unsubscribeSafe(subscription.value);
        return;
      }
      watcher.subscriptions.push(subscription.value);
    }
    if (!(await watcher.settled()) || !(await watcher.readUnobserved())) return;
    if (watcher.stoodDown) return;
    watcher.ready = true;
    logForDebugging(
      `Remote settings: primed from storage (${describeCachedContent(watcher.content)}; helper consent ${watcher.attestation === undefined ? "not attested" : "attested"}${state.sessionCache !== null ? "; cache already loaded, serving later loads" : ""})`,
    );
  } catch (error) {
    watcher.standDown(`prime failed: ${errorMessage(error)}`);
  }
}
//@ chunk-z20c443b.js:405420-408552 placement
/**
 * 远程设置存储监视器（缓存文件与 helper 同意副本）。
 */
class RemoteSettingsStorageWatcher {
  storageV5;
  content = null;
  attestation = undefined;
  ready = false;
  priming = Promise.resolve();
  stoodDown = false;
  configHome = getClaudeConfigDirOrNull();
  subscriptions = [];
  cache = makeWatchEntry(REMOTE_SETTINGS_STATE_ID, "cache file");
  sidecar = makeWatchEntry(CONSENT_STATE_STORAGE_ID, "helper consent sidecar");
  work = Promise.resolve(true);
  steps = 0;
  lastCacheStep = 0;
  constructor(storageV5) {
    this.storageV5 = storageV5;
  }
  onEvent(event) {
    if (this.stoodDown) return;
    if (!event.ok) {
      this.standDown(`watch ended: ${formatStorageError(event.error)}`);
      return;
    }
    let entry = this.heldOf(event.value.key);
    if (entry === undefined) return;
    if (event.value.kind === "snapshot" && entry.begun) return;
    this.take(entry, eventValue(event.value));
  }
  settled() {
    return this.work.then((ok) => ok && !this.stoodDown);
  }
  readUnobserved() {
    for (let entry of [this.cache, this.sidecar]) if (!entry.observed) this.take(entry);
    return this.settled();
  }
  written(space, text) {
    let entry = this.stoodDown ? undefined : this.heldOf(space);
    if (entry === undefined) return;
    entry.begun = true;
    entry.generation++;
    if (entry === this.cache) this.sidecar.generation++;
    this.advance(entry);
    if (text !== null && Buffer.byteLength(text, "utf8") > MAX_STORAGE_VIEW_BYTES) {
      this.standDown(`oversize ${entry.label}`);
      return;
    }
    this.install(entry, text);
    this.follow(entry, text === null);
  }
  heldOf(space) {
    let spaceId = storageSpaceId(space);
    return spaceId === this.cache.id ? this.cache : spaceId === this.sidecar.id ? this.sidecar : undefined;
  }
  take(entry, change) {
    entry.begun = true;
    if (change !== undefined) {
      entry.pendingRead = undefined;
      let generation = entry.generation;
      this.queue(entry, () => (entry.generation === generation ? this.fill(entry, change) : !this.stoodDown));
    }
    return this.follow(entry, change === undefined);
  }
  follow(entry, mayRead) {
    if (mayRead && entry.pendingRead === undefined) {
      let step = this.queue(entry, () => {
        if (entry.pendingRead === step) entry.pendingRead = undefined;
        return this.read(entry);
      });
      entry.pendingRead = step;
    }
    if (entry === this.cache && (this.sidecar.pendingRead ?? 0) < this.lastCacheStep) {
      this.sidecar.pendingRead = undefined;
      return this.take(this.sidecar);
    }
    return this.work;
  }
  queue(entry, step) {
    let step_2 = this.advance(entry);
    this.work = this.work.then(step).catch((error) => {
      this.standDown(`refresh failed: ${errorMessage(error)}`);
      return false;
    });
    return step_2;
  }
  advance(entry) {
    let step = ++this.steps;
    if (entry === this.cache) this.lastCacheStep = step;
    return step;
  }
  async read(entry) {
    if (this.stoodDown) return false;
    let generation = entry.generation;
    try {
      let result = await this.storageV5.read([
        {
          key: entry.key,
          offset: 0,
          length: MAX_STORAGE_VIEW_BYTES + 1,
        },
      ]);
      if (entry.generation !== generation) {
        if (!result.ok)
          logForDebugging(
            `Remote settings: a superseded read of the ${entry.label} failed (${formatStorageError(result.error)}); ignored`,
          );
        return !this.stoodDown;
      }
      if (!result.ok) {
        if (storageErrorCode(result.error) === "ELOOP") {
          logForDebugging(
            `Remote settings: the ${entry.label} is a symlink; not read with the storage flag on (strict rule for files only Claude Code writes)`,
            {
              level: "warn",
            },
          );
          return this.fill(entry, null);
        }
        this.standDown(`read failed: ${formatStorageError(result.error)}`);
        return false;
      }
      let item = result.value.items[0];
      if (item.found && item.totalBytes > MAX_STORAGE_VIEW_BYTES) {
        this.standDown(`oversize ${entry.label}`);
        return false;
      }
      return this.fill(entry, item.found ? item.value : null);
    } catch (error) {
      this.standDown(`read failed: ${errorMessage(error)}`);
      return false;
    }
  }
  fill(entry, bytes) {
    if (this.stoodDown) return false;
    if (bytes !== null && bytes.byteLength > MAX_STORAGE_VIEW_BYTES) {
      this.standDown(`oversize ${entry.label}`);
      return false;
    }
    this.install(entry, bytes === null ? null : decodeTextBuffer(bytes));
    return true;
  }
  install(entry, text) {
    if (entry === this.cache) {
      if (entry.observed && this.ready)
        logForDebugging(`Remote settings: storage view refreshed (${describeCachedContent(text)})`);
      this.content = text;
      this.attestation = undefined;
    } else this.attestation = text?.trim() || undefined;
    entry.observed = true;
  }
  standDown(reason, level = "debug") {
    let state = currentRemoteSettingsState_2();
    if (state.backendView === this) state.backendView = undefined;
    if (this.stoodDown) return;
    this.stoodDown = true;
    this.content = null;
    this.attestation = undefined;
    for (let subscription of this.subscriptions.splice(0)) unsubscribeSafe(subscription);
    logForDebugging(`Remote settings: storage view stood down (${reason}); disk probe serves`, {
      level,
    });
  }
}
//@ chunk-z20c443b.js:408552-408654 placement
function makeWatchEntry(key, label) {
  return {
    key,
    id: storageSpaceId(key),
    label,
    observed: false,
    begun: false,
    pendingRead: undefined,
    generation: 0,
  };
}
//@ chunk-z20c443b.js:408654-408772 placement
function unsubscribeSafe(subscription) {
  try {
    subscription.unsubscribe();
  } catch (error) {
    logForDebugging(`Remote settings: storage unsubscribe failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-z20c443b.js:408772-408896 placement
function eventValue(event) {
  switch (event.kind) {
    case "snapshot":
      return "absent" in event ? undefined : event.value;
    case "updated":
      return event.value;
    default:
      return;
  }
}
//@ chunk-z20c443b.js:408896-408956 placement
/**
 * 日志用描述：缓存内容为空时 "absent"，否则 "N chars"。
 */
function describeCachedContent(text) {
  return text === null ? "absent" : `${text.length} chars`;
}
//@ chunk-z20c443b.js:408956-410761 placement
/**
 * 未验证的远程设置中扣下的环境变量键。
 */
var UNVERIFIED_WITHHELD_ENV_KEYS; // deferred: uses NETWORK_ENV_VARS (../../utils/managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:408956", () => {
  UNVERIFIED_WITHHELD_ENV_KEYS = new Set(
    [
      ...NETWORK_ENV_VARS,
      "CLAUDE_CODE_PROXY_RESOLVES_HOSTS",
      "CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER",
      "CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS",
      "API_FORCE_IDLE_TIMEOUT",
      "ANTHROPIC_UNIX_SOCKET",
      "CLAUDE_CODE_DISABLE_HTTPS_AGENT_KEEPING",
      "NODE_OPTIONS",
      ...PROVIDER_SELECTION_ENV_VARS,
      ...BASE_URL_ENV_VARS,
      "AWS_ENDPOINT_URL_STS",
      "AWS_ENDPOINT_URL",
      "AWS_ENDPOINT_URL_SSO",
      "AWS_ENDPOINT_URL_SSO_OIDC",
      "AWS_ENDPOINT_URL_BEDROCK",
      "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
      ...HOST_ONLY_ENV_VARS,
      ...AWS_CREDENTIAL_ENV_VARS,
      ...GCE_METADATA_ENV_VARS,
      "CLOUDSDK_CONFIG",
      "GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES",
      "GCLOUD_PROJECT",
      "CLAUDE_CODE_CUSTOM_OAUTH_URL",
      ...PROVIDER_CREDENTIAL_ENV_VARS,
      "CLAUDE_CODE_API_BASE_URL",
      "CLAUDE_CODE_OAUTH_REFRESH_TOKEN",
      "CLAUDE_CODE_OAUTH_SCOPES",
      "CLAUDE_CODE_OAUTH_CLIENT_ID",
      "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
      "CLAUDE_SESSION_INGRESS_TOKEN_FILE",
      "CLAUDE_CODE_ENVIRONMENT_KIND",
      "CLAUDE_CODE_REMOTE_SESSION_ID",
      "ANTHROPIC_FEDERATION_RULE_ID",
      "ANTHROPIC_ORGANIZATION_ID",
      "ANTHROPIC_WORKSPACE_ID",
      "ANTHROPIC_SERVICE_ACCOUNT_ID",
      "ANTHROPIC_IDENTITY_TOKEN",
      "ANTHROPIC_IDENTITY_TOKEN_FILE",
      "ANTHROPIC_SCOPE",
      "ANTHROPIC_PROFILE",
      "ANTHROPIC_CONFIG_DIR",
      "CLAUDE_CODE_FEDERATION_CACHE_DIR",
      "HOME",
      "XDG_CONFIG_HOME",
      "APPDATA",
      "USERPROFILE",
      "HOMEDRIVE",
      "HOMEPATH",
      "PROGRAMDATA",
      "ALLUSERSPROFILE",
      "ANTHROPIC_CUSTOM_HEADERS",
      "CLAUDE_CODE_HOST_CREDS_FILE",
      "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",
      "CLAUDE_CODE_HOST_AUTH_ENV_VAR",
      "CLAUDE_CONFIG_DIR",
      "CLAUDE_SECURESTORAGE_CONFIG_DIR",
      "CLAUDE_CODE_REMOTE_SETTINGS_PATH",
      "CLAUDE_CODE_MANAGED_SETTINGS_PATH",
      "CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION",
      "CLAUDE_CODE_MOCK_REMOTE_SETTINGS",
      "USE_LOCAL_OAUTH",
      "USE_STAGING_OAUTH",
      "CLAUDE_LOCAL_OAUTH_API_BASE",
      "CLAUDE_LOCAL_OAUTH_APPS_BASE",
      "CLAUDE_LOCAL_OAUTH_CONSOLE_BASE",
      "CLAUDE_BRIDGE_BASE_URL",
      "CLAUDE_BRIDGE_OAUTH_TOKEN",
      "CLAUDE_BRIDGE_SESSION_INGRESS_URL",
      "CLAUDE_REMOTE_TOOLS_BRIDGE_URL",
      "CLAUDE_CODE_GB_BASE_URL",
    ].map((name) => name.toUpperCase()),
  );
});
//@ chunk-z20c443b.js:410761-410926 placement
function withholdUnverifiedEnv(settings) {
  if (!settings || (!settings.env && !("managedMcpServers" in settings))) return settings;
  let { managedMcpServers, ...rest } = settings;
  return settings.env
    ? {
        ...rest,
        env: import_reject(settings.env, (value, key) => UNVERIFIED_WITHHELD_ENV_KEYS.has(key.toUpperCase())),
      }
    : rest;
}
//@ chunk-z20c443b.js:410926-411047 placement
function withholdUnverifiedCacheKeys(settings) {
  return "managedMcpServers" in settings ||
    (!!settings.env &&
      Object.keys(settings.env).some((key) => UNVERIFIED_WITHHELD_ENV_KEYS.has(key.toUpperCase())))
    ? (withholdUnverifiedEnv(settings) ?? settings)
    : settings;
}
//@ chunk-z20c443b.js:411047-411164 placement
function unverifiedRemoteCacheWithholdsProvisions() {
  let remoteManagedSettingsRawCache = getRemoteManagedSettingsRawCache();
  if (
    remoteManagedSettingsRawCache === null ||
    isSnapshotOnlySession() ||
    isVerifiedOrOverridden(currentRemoteSettingsState_2(), remoteManagedSettingsRawCache)
  )
    return false;
  if (hasManagedMcpServers(remoteManagedSettingsRawCache)) return true;
  return orderedPlatformLayers(remoteManagedSettingsRawCache).some(([, layer]) =>
    hasManagedMcpServers(layer),
  );
}
//@ chunk-z20c443b.js:411164-411287 placement
function orderedPlatformLayers(settings) {
  let entries = policyHelperSlots(settings);
  if (entries.length === 0) return [];
  return [...platformSettingsChain().chain, undefined].flatMap((chainEntry) =>
    entries.filter(([path]) => isPolicyHelperPath(path) === chainEntry),
  );
}
//@ chunk-z20c443b.js:411287-411365 placement
/**
 * 判断一份远程设置里是否声明了托管的 MCP 服务器。
 */
function hasManagedMcpServers(settings) {
  let managedMcpServers = settings.managedMcpServers;
  return isPlainObject_2(managedMcpServers) && Object.keys(managedMcpServers).length > 0;
}
//@ chunk-z20c443b.js:411365-411426 placement
/**
 * 给定载荷是否被视为已验证（等于已验证载荷，或配置了路径覆盖）。
 */
function isVerifiedOrOverridden(state, payload) {
  return payload === state.verifiedPayload || Boolean(getRemoteSettingsPathOverride());
}
//@ chunk-z20c443b.js:411426-411821 placement
function getRemoteManagedSettingsRawCache() {
  let state = currentRemoteSettingsState_2();
  if (!getRemoteSettingsPathOverride() && state.eligible !== true) return state.heldSoFar(null);
  if (state.sessionCache) {
    if (state.sessionCache !== state.seededUnjudged || !isManagedSettingsCopyTrustEnforced())
      return state.sessionCache;
    state.sessionCache = null;
    state.seededUnjudged = null;
    invalidateCommandNames();
  }
  let hasBackendView = getBackendView() !== undefined;
  let storedRemoteSettings = loadStoredRemoteSettings();
  if (storedRemoteSettings) {
    state.seedFromDisk(storedRemoteSettings);
    state.seededUnjudged = isManagedSettingsCopyTrustEnforced() ? null : state.sessionCache;
    if (hasBackendView) commandSyncNameState().invalidatePolicyLayer();
    else invalidateCommandNames();
    return state.sessionCache;
  }
  return state.heldSoFar(null);
}
//@ chunk-z20c443b.js:411821-412236 placement
function getRemoteManagedSettingsSyncFromCache(parseSettings) {
  let payload = getRemoteManagedSettingsRawCache();
  let state = currentRemoteSettingsState_2();
  let baseSettings = isVerifiedOrOverridden(state, payload) ? payload : unverifiedViewOf(state, payload);
  if (baseSettings === null || !isSnapshotOnlySession()) return baseSettings;
  if (state.projectedView?.raw !== baseSettings)
    state.projectedView = {
      raw: baseSettings,
      view: restrictionsOfUnvouchedDocumentUnsafe(baseSettings),
    };
  let view = state.projectedView.view;
  if (!parseSettings) return view;
  if (state.projectedParse?.raw !== baseSettings) {
    let merged = {
      ...view,
    };
    deepMergeInto(merged, restrictionsOfUnvouchedDocumentUnsafe(parseSettings(baseSettings)) ?? {});
    if (isDiskless())
      for (let { path, names } of CREDENTIAL_LIST_PATHS) {
        let flattened = [view, merged].flatMap((settings) => getAtPath(settings, path) ?? []);
        if (flattened.length > 0) setAtPath(merged, path, uniqByExport(flattened, names));
      }
    state.projectedParse = {
      raw: baseSettings,
      view: merged,
    };
  }
  return state.projectedParse.view;
}
//@ chunk-z20c443b.js:412236-412361 placement
function deepMergeInto(target, source) {
  for (let [key, value] of Object.entries(source)) {
    let current = target[key];
    if (current !== value && isPlainObject_2(current) && isPlainObject_2(value)) {
      let merged = {
        ...current,
      };
      deepMergeInto(merged, value);
      target[key] = merged;
    } else target[key] = value;
  }
}
//@ chunk-z20c443b.js:412361-412496 placement
function unverifiedViewOf(state, settings) {
  if (settings === null) return null;
  if (state.unverifiedView?.raw !== settings)
    state.unverifiedView = {
      raw: settings,
      view: withholdUnverifiedEnv(settings),
    };
  return state.unverifiedView.view;
}
export {
  getRemoteManagedSettingsSyncFromCache,
  hostSessionSkipsSharedCache,
  holdsNoServedSettings,
  withholdUnverifiedCacheKeys,
  getMockRemoteSettingsFixturePath,
  getSettingsPath,
  primeRemoteManagedSettingsCache,
  getMockRemoteSettingsValue,
  remoteSettingsFileWritten,
  getRemoteManagedSettingsRawCache,
  unverifiedRemoteCacheWithholdsProvisions,
  helperTierOf,
  isConfirmedHelperHeld,
  getRemoteHelperTier,
  getRemoteHelperGap,
  narrowToRestrictions,
  readHelperConsentAttestation,
};
