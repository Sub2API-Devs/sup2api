/**
 * services/remoteManagedSettings/remoteSettingsCache.ts
 *
 * 2.1.316 新增：远程设置存储监视器（缓存文件与 helper 同意副本）；未验证的远程设置中扣下的环境变量键等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (43)
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
import { getClaudeConfigDir, isSameConfigDir, getClaudeConfigDirOrNull } from "../../utils/envUtils.js";
import { En, wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";

//@ chunk-dcmhvw5a.js:402126-402247 placement
function hostSessionSkipsSharedCache() {
  return withHostOwnedEnvGuard(
    () =>
      hasManagedOrCoworkSurface() ||
      (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
        DESKTOP_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "")) ||
      isProviderManagedByHost(),
  );
}
//@ chunk-dcmhvw5a.js:402247-402287 placement
function holdsNoServedSettings(remoteSettingsEligibility) {
  return (
    remoteSettingsEligibility && !hasManagedOrCoworkSurface() && !getRemoteManagedSettingsSyncFromCache()
  );
}
//@ chunk-dcmhvw5a.js:402287-402327 placement
function getSettingsPath() {
  return getRemoteSettingsPathOverride() ?? join(getClaudeConfigDir(), SETTINGS_FILENAME);
}
//@ chunk-dcmhvw5a.js:402327-402349 placement
function getMockRemoteSettingsValue() {
  return;
}
//@ chunk-dcmhvw5a.js:402349-402443 placement
function getMockRemoteSettingsFixturePath() {
  let mockRemoteSettingsValue = getMockRemoteSettingsValue();
  return mockRemoteSettingsValue !== undefined &&
    mockRemoteSettingsValue.startsWith("@") &&
    mockRemoteSettingsValue.length > 1
    ? mockRemoteSettingsValue.slice(1)
    : undefined;
}
//@ chunk-dcmhvw5a.js:402443-402458 placement
var MAX_REMOTE_SETTINGS_FILE_BYTES = 8388608;
//@ chunk-dcmhvw5a.js:402458-402534 placement
/**
 * 把磁盘上的远程设置副本收窄为限制键集合（仅在开启相关处理时），未收窄则原样返回。
 */
function narrowToRestrictions(e) {
  if (e === null || !hasManagedOrCoworkSurface()) return e;
  let restrictionSettings = extractRestrictionSettings(e);
  return En(restrictionSettings, e) ? e : restrictionSettings;
}
//@ chunk-dcmhvw5a.js:402534-403040 placement
/**
 * 读取磁盘上的远程设置副本（检查信任与大小）。
 */
function loadStoredRemoteSettings() {
  if (hostSessionSkipsSharedCache()) return null;
  let e = currentRemoteSettingsState_2();
  let storedCopyRefusal = e.storedCopyRefusal;
  if (
    storedCopyRefusal !== null &&
    isManagedSettingsCopyTrustEnforced() &&
    Date.now() - storedCopyRefusal.atMs < MAX_BACKEND_SETTINGS_BYTES
  ) {
    e.storedCopyTrust = {
      trusted: false,
      reason: storedCopyRefusal.reason,
    };
    return null;
  }
  e.storedCopyTrust = "not_asked";
  e.storedCopyRefusal = null;
  e.refusedCopyHelperTier = null;
  try {
    let remoteSettingsFileStable = readRemoteSettingsFileStable();
    if (remoteSettingsFileStable === null) return null;
    let s = jsonParse(stripBom(remoteSettingsFileStable));
    if (!s || typeof s !== "object" || Array.isArray(s)) return null;
    let a = stripReservedKeys(s);
    return checkStoredCopyTrust(a) ? a : null;
  } catch (error) {
    if (isFileTooLargeError(error))
      logForDebugging(
        `Remote settings: Disk cache exceeds ${MAX_REMOTE_SETTINGS_FILE_BYTES} bytes; ignoring it as if absent`,
      );
    return null;
  }
}
//@ chunk-dcmhvw5a.js:403040-403459 placement
/**
 * 检查远程设置副本的信任（组织固定、签名）。
 */
function checkStoredCopyTrust(e) {
  let n = currentRemoteSettingsState_2();
  if (
    !isManagedSettingsCopyTrustEnforced() ||
    !n.storedCopyGateCovers ||
    getRemoteSettingsPathOverride() !== undefined ||
    n.evalPolicySnapshotOnly
  ) {
    n.storedCopyTrust = "not_asked";
    return true;
  }
  let storedCopyOrgPin = n.storedCopyOrgPin;
  if (storedCopyOrgPin.kind === "read") {
    let a = verifyStoredCopy(e, storedCopyOrgPin.orgs);
    if (a.trusted) {
      n.storedCopyTrust = a;
      return true;
    }
    refuseStoredCopy(e, a.reason, isSoftVerificationFailure(a.reason));
    return false;
  }
  let s = e.forceRemoteSettingsRefresh === true ? verifyStoredCopy(e, undefined) : undefined;
  refuseStoredCopy(
    e,
    "org_pin_unknown",
    s !== undefined && (s.trusted || isSoftVerificationFailure(s.reason)),
  );
  return false;
}
//@ chunk-dcmhvw5a.js:403459-403768 placement
/**
 * 校验远程设置副本签名。
 */
function verifyStoredCopy(e, pinnedOrgs) {
  try {
    return verifySignedCache({
      kind: "managed-settings",
      cachePath: getSettingsPath(),
      body: servedBodyOf(e),
      bodySha: computeChecksum(servedBodyOf(e)),
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
//@ chunk-dcmhvw5a.js:403768-404093 placement
/**
 * 拒绝不可信的远程设置副本。
 */
function refuseStoredCopy(e, n, r) {
  let s = currentRemoteSettingsState_2();
  s.storedCopyTrust = {
    trusted: false,
    reason: n,
  };
  s.storedCopyRefusal = {
    atMs: Date.now(),
    reason: n,
    forcesRefresh: r && e.forceRemoteSettingsRefresh === true,
  };
  s.refusedCopyHelperTier = isSoftVerificationFailure(n) ? helperTierFor(e) : null;
  s.seedConsentBaseline(e);
  logForDebugging(`Remote settings: the stored copy is not trusted at rest (${n}); treating it as absent`);
}
//@ chunk-dcmhvw5a.js:404093-404268 placement = hasApiKeyHelper (1)
function helperTierOf(settings) {
  if (settings === null) return null;
  let { apiKeyHelper, env } = settings;
  return typeof apiKeyHelper === "string" && apiKeyHelper.trim() !== ""
    ? {
        apiKeyHelper,
        env: pickByHelper(isPlainObject_2(env) ? env : {}, (s) => typeof s === "string"),
      }
    : null;
}
//@ chunk-dcmhvw5a.js:404268-404403 placement
function helperTierFor(e) {
  let [n] = orderedPlatformLayers(e);
  if (e === null || n === undefined) return helperTierOf(e);
  let [r, s] = n;
  return helperTierOf(
    isMergingPolicyHelper(e, r)
      ? {
          ...e,
          ...s,
          env: {
            ...e.env,
            ...s.env,
          },
        }
      : s,
  );
}
//@ chunk-dcmhvw5a.js:404403-404499 placement
/**
 * 会话缓存的 helper 层级：缓存等于已验证载荷时按其自身层级判定，否则按别的规则。
 */
function helperTierOfSessionCache(e) {
  return e.sessionCache === e.verifiedPayload ? helperTierOf(e.sessionCache) : helperTierFor(e.sessionCache);
}
//@ chunk-dcmhvw5a.js:404499-404856 placement
function getRemoteHelperTier() {
  let e = currentRemoteSettingsState_2();
  let helperTierReadAtMs = e.helperTierReadAtMs;
  if (
    e.sessionCache === null &&
    (helperTierReadAtMs === null || Date.now() - helperTierReadAtMs >= MAX_BACKEND_SETTINGS_BYTES)
  ) {
    e.helperTierReadAtMs = Date.now();
    getRemoteManagedSettingsRawCache();
  }
  let { sessionCache, refusedCopyHelperTier, droppedHelperTier } = e;
  let c = helperTierOfSessionCache(e);
  if (c !== null) return c;
  if (sessionCache === null && refusedCopyHelperTier !== null) return refusedCopyHelperTier;
  if (droppedHelperTier === null) return null;
  let g = inheritedProviderEnv(droppedHelperTier, sessionCache);
  return Object.keys(g).length === 0
    ? null
    : {
        ...droppedHelperTier,
        env: g,
      };
}
//@ chunk-dcmhvw5a.js:404856-405073 placement
function inheritedProviderEnv(droppedHelperTier, sessionCache) {
  let env = droppedHelperTier.env ?? {};
  let env_2 = isPlainObject_2(sessionCache?.env) ? sessionCache.env : {};
  let a = {};
  for (let c of ["ANTHROPIC_BASE_URL", "CLAUDE_CODE_API_BASE_URL", ...PROVIDER_ENV_FLAGS]) {
    let trimmed = getEnvCaseInsensitive(env, c)?.trim();
    if (trimmed && trimmed === process.env[c]?.trim() && getEnvCaseInsensitive(env_2, c) === undefined)
      a[c] = trimmed;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:405073-405159 placement
function isConfirmedHelperHeld() {
  let { sessionCache, verifiedPayload } = currentRemoteSettingsState_2();
  return sessionCache === verifiedPayload && helperTierOf(sessionCache) !== null;
}
//@ chunk-dcmhvw5a.js:405159-405407 placement
function getRemoteHelperGap() {
  let e = currentRemoteSettingsState_2();
  if (helperTierOfSessionCache(e) !== null)
    return e.sessionCache === e.verifiedPayload ? null : "settings_unloaded";
  if (e.sessionCache === null && e.refusedCopyHelperTier !== null) return "settings_unloaded";
  return e.droppedHelperTier === null ? null : "restart_needed";
}
//@ chunk-dcmhvw5a.js:405407-405419 placement
var MAX_HELPER_CONSENT_BYTES = 4096;
//@ chunk-dcmhvw5a.js:405419-405546 placement
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
//@ chunk-dcmhvw5a.js:405546-405555 placement
var READ_STABILITY_ATTEMPTS = 4;
//@ chunk-dcmhvw5a.js:405555-405757 placement
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
//@ chunk-dcmhvw5a.js:405757-405933 placement
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
//@ chunk-dcmhvw5a.js:405933-405993 placement
var Ls = STORAGE_SPACES.state("remote-settings");
var Ns = STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID);
var MAX_STORAGE_EVENT_LAG_MS = 2000;
//@ chunk-dcmhvw5a.js:405993-406058 placement
function remoteSettingsFileWritten(e, n) {
  currentRemoteSettingsState_2().backendView?.written(e === "cache" ? Ls : Ns, n);
}
//@ chunk-dcmhvw5a.js:406058-406388 placement
async function primeRemoteManagedSettingsCache(storageV5) {
  if (!isStorageV5Enabled() || storageV5 === undefined) return;
  let n = currentRemoteSettingsState_2();
  if (n.backendView !== undefined) return n.backendView.priming;
  if (getRemoteSettingsPathOverride() !== undefined) {
    logForDebugging(
      "Remote settings: storage prime skipped (CLAUDE_CODE_REMOTE_SETTINGS_PATH override); disk probe stays",
    );
    return;
  }
  if (hostSessionSkipsSharedCache()) return;
  let r = new RemoteSettingsStorageWatcher(storageV5);
  n.backendView = r;
  r.priming = watchRemoteSettingsStorage(r, storageV5, n);
  return r.priming;
}
//@ chunk-dcmhvw5a.js:406388-406999 placement
/**
 * 订阅存储中的远程设置变化。
 */
async function watchRemoteSettingsStorage(e, n, r) {
  try {
    for (let key of [Ns, Ls]) {
      let a = await n.subscribe(
        {
          target: "key",
          key,
        },
        (c) => e.onEvent(c),
        {
          maxObservationLagMs: MAX_STORAGE_EVENT_LAG_MS,
        },
      );
      if (!a.ok) {
        e.standDown(`watch refused: ${formatStorageError(a.error)}`, "warn");
        return;
      }
      if (e.stoodDown) {
        unsubscribeSafe(a.value);
        return;
      }
      e.subscriptions.push(a.value);
    }
    if (!(await e.settled()) || !(await e.readUnobserved())) return;
    if (e.stoodDown) return;
    e.ready = true;
    logForDebugging(
      `Remote settings: primed from storage (${describeCachedContent(e.content)}; helper consent ${e.attestation === undefined ? "not attested" : "attested"}${r.sessionCache !== null ? "; cache already loaded, serving later loads" : ""})`,
    );
  } catch (error) {
    e.standDown(`prime failed: ${errorMessage(error)}`);
  }
}
//@ chunk-dcmhvw5a.js:406999-410132 placement
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
  cache = makeWatchEntry(Ls, "cache file");
  sidecar = makeWatchEntry(Ns, "helper consent sidecar");
  work = Promise.resolve(true);
  steps = 0;
  lastCacheStep = 0;
  constructor(storageV5) {
    this.storageV5 = storageV5;
  }
  onEvent(e) {
    if (this.stoodDown) return;
    if (!e.ok) {
      this.standDown(`watch ended: ${formatStorageError(e.error)}`);
      return;
    }
    let n = this.heldOf(e.value.key);
    if (n === undefined) return;
    if (e.value.kind === "snapshot" && n.begun) return;
    this.take(n, eventValue(e.value));
  }
  settled() {
    return this.work.then((e) => e && !this.stoodDown);
  }
  readUnobserved() {
    for (let e of [this.cache, this.sidecar]) if (!e.observed) this.take(e);
    return this.settled();
  }
  written(e, n) {
    let r = this.stoodDown ? undefined : this.heldOf(e);
    if (r === undefined) return;
    r.begun = true;
    r.generation++;
    if (r === this.cache) this.sidecar.generation++;
    this.advance(r);
    if (n !== null && Buffer.byteLength(n, "utf8") > MAX_STORAGE_VIEW_BYTES) {
      this.standDown(`oversize ${r.label}`);
      return;
    }
    this.install(r, n);
    this.follow(r, n === null);
  }
  heldOf(e) {
    let n = storageSpaceId(e);
    return n === this.cache.id ? this.cache : n === this.sidecar.id ? this.sidecar : undefined;
  }
  take(e, n) {
    e.begun = true;
    if (n !== undefined) {
      e.pendingRead = undefined;
      let generation = e.generation;
      this.queue(e, () => (e.generation === generation ? this.fill(e, n) : !this.stoodDown));
    }
    return this.follow(e, n === undefined);
  }
  follow(e, n) {
    if (n && e.pendingRead === undefined) {
      let r = this.queue(e, () => {
        if (e.pendingRead === r) e.pendingRead = undefined;
        return this.read(e);
      });
      e.pendingRead = r;
    }
    if (e === this.cache && (this.sidecar.pendingRead ?? 0) < this.lastCacheStep) {
      this.sidecar.pendingRead = undefined;
      return this.take(this.sidecar);
    }
    return this.work;
  }
  queue(e, n) {
    let r = this.advance(e);
    this.work = this.work.then(n).catch((error) => {
      this.standDown(`refresh failed: ${errorMessage(error)}`);
      return false;
    });
    return r;
  }
  advance(e) {
    let n = ++this.steps;
    if (e === this.cache) this.lastCacheStep = n;
    return n;
  }
  async read(e) {
    if (this.stoodDown) return false;
    let generation = e.generation;
    try {
      let r = await this.storageV5.read([
        {
          key: e.key,
          offset: 0,
          length: MAX_STORAGE_VIEW_BYTES + 1,
        },
      ]);
      if (e.generation !== generation) {
        if (!r.ok)
          logForDebugging(
            `Remote settings: a superseded read of the ${e.label} failed (${formatStorageError(r.error)}); ignored`,
          );
        return !this.stoodDown;
      }
      if (!r.ok) {
        if (storageErrorCode(r.error) === "ELOOP") {
          logForDebugging(
            `Remote settings: the ${e.label} is a symlink; not read with the storage flag on (strict rule for files only Claude Code writes)`,
            {
              level: "warn",
            },
          );
          return this.fill(e, null);
        }
        this.standDown(`read failed: ${formatStorageError(r.error)}`);
        return false;
      }
      let s = r.value.items[0];
      if (s.found && s.totalBytes > MAX_STORAGE_VIEW_BYTES) {
        this.standDown(`oversize ${e.label}`);
        return false;
      }
      return this.fill(e, s.found ? s.value : null);
    } catch (error) {
      this.standDown(`read failed: ${errorMessage(error)}`);
      return false;
    }
  }
  fill(e, n) {
    if (this.stoodDown) return false;
    if (n !== null && n.byteLength > MAX_STORAGE_VIEW_BYTES) {
      this.standDown(`oversize ${e.label}`);
      return false;
    }
    this.install(e, n === null ? null : decodeTextBuffer(n));
    return true;
  }
  install(e, n) {
    if (e === this.cache) {
      if (e.observed && this.ready)
        logForDebugging(`Remote settings: storage view refreshed (${describeCachedContent(n)})`);
      this.content = n;
      this.attestation = undefined;
    } else this.attestation = n?.trim() || undefined;
    e.observed = true;
  }
  standDown(e, level = "debug") {
    let r = currentRemoteSettingsState_2();
    if (r.backendView === this) r.backendView = undefined;
    if (this.stoodDown) return;
    this.stoodDown = true;
    this.content = null;
    this.attestation = undefined;
    for (let subscription of this.subscriptions.splice(0)) unsubscribeSafe(subscription);
    logForDebugging(`Remote settings: storage view stood down (${e}); disk probe serves`, {
      level,
    });
  }
}
//@ chunk-dcmhvw5a.js:410132-410234 placement
function makeWatchEntry(e, label) {
  return {
    key: e,
    id: storageSpaceId(e),
    label,
    observed: false,
    begun: false,
    pendingRead: undefined,
    generation: 0,
  };
}
//@ chunk-dcmhvw5a.js:410234-410352 placement
function unsubscribeSafe(e) {
  try {
    e.unsubscribe();
  } catch (error) {
    logForDebugging(`Remote settings: storage unsubscribe failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-dcmhvw5a.js:410352-410476 placement
function eventValue(e) {
  switch (e.kind) {
    case "snapshot":
      return "absent" in e ? undefined : e.value;
    case "updated":
      return e.value;
    default:
      return;
  }
}
//@ chunk-dcmhvw5a.js:410476-410536 placement
/**
 * 日志用描述：缓存内容为空时 "absent"，否则 "N chars"。
 */
function describeCachedContent(e) {
  return e === null ? "absent" : `${e.length} chars`;
}
//@ chunk-dcmhvw5a.js:410536-412299 placement
/**
 * 未验证的远程设置中扣下的环境变量键。
 */
var UNVERIFIED_WITHHELD_ENV_KEYS = new Set(
  [
    ...NETWORK_ENV_VARS,
    "CLAUDE_CODE_PROXY_RESOLVES_HOSTS",
    "CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER",
    "CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS",
    "API_FORCE_IDLE_TIMEOUT",
    "ANTHROPIC_UNIX_SOCKET",
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
  ].map((e) => e.toUpperCase()),
);
//@ chunk-dcmhvw5a.js:412299-412464 placement
function withholdUnverifiedEnv(e) {
  if (!e || (!e.env && !("managedMcpServers" in e))) return e;
  let { managedMcpServers, ...r } = e;
  return e.env
    ? {
        ...r,
        env: wi(e.env, (s, a) => UNVERIFIED_WITHHELD_ENV_KEYS.has(a.toUpperCase())),
      }
    : r;
}
//@ chunk-dcmhvw5a.js:412464-412585 placement
function withholdUnverifiedCacheKeys(e) {
  return "managedMcpServers" in e ||
    (!!e.env && Object.keys(e.env).some((key) => UNVERIFIED_WITHHELD_ENV_KEYS.has(key.toUpperCase())))
    ? (withholdUnverifiedEnv(e) ?? e)
    : e;
}
//@ chunk-dcmhvw5a.js:412585-412702 placement
function unverifiedRemoteCacheWithholdsProvisions() {
  let remoteManagedSettingsRawCache = getRemoteManagedSettingsRawCache();
  if (
    remoteManagedSettingsRawCache === null ||
    isSnapshotOnlySession() ||
    isVerifiedOrOverridden(currentRemoteSettingsState_2(), remoteManagedSettingsRawCache)
  )
    return false;
  if (hasManagedMcpServers(remoteManagedSettingsRawCache)) return true;
  return orderedPlatformLayers(remoteManagedSettingsRawCache).some(([, n]) => hasManagedMcpServers(n));
}
//@ chunk-dcmhvw5a.js:412702-412825 placement
function orderedPlatformLayers(e) {
  let n = policyHelperSlots(e);
  if (n.length === 0) return [];
  return [...platformSettingsChain().chain, undefined].flatMap((r) =>
    n.filter(([s]) => isPolicyHelperPath(s) === r),
  );
}
//@ chunk-dcmhvw5a.js:412825-412903 placement
/**
 * 判断一份远程设置里是否声明了托管的 MCP 服务器。
 */
function hasManagedMcpServers(e) {
  let managedMcpServers = e.managedMcpServers;
  return isPlainObject_2(managedMcpServers) && Object.keys(managedMcpServers).length > 0;
}
//@ chunk-dcmhvw5a.js:412903-412964 placement
/**
 * 给定载荷是否被视为已验证（等于已验证载荷，或配置了路径覆盖）。
 */
function isVerifiedOrOverridden(e, remoteManagedSettingsRawCache) {
  return remoteManagedSettingsRawCache === e.verifiedPayload || Boolean(getRemoteSettingsPathOverride());
}
//@ chunk-dcmhvw5a.js:412964-413359 placement
function getRemoteManagedSettingsRawCache() {
  let e = currentRemoteSettingsState_2();
  if (!getRemoteSettingsPathOverride() && e.eligible !== true) return e.heldSoFar(null);
  if (e.sessionCache) {
    if (e.sessionCache !== e.seededUnjudged || !isManagedSettingsCopyTrustEnforced()) return e.sessionCache;
    e.sessionCache = null;
    e.seededUnjudged = null;
    invalidateCommandNames();
  }
  let n = getBackendView() !== undefined;
  let storedRemoteSettings = loadStoredRemoteSettings();
  if (storedRemoteSettings) {
    e.seedFromDisk(storedRemoteSettings);
    e.seededUnjudged = isManagedSettingsCopyTrustEnforced() ? null : e.sessionCache;
    if (n) commandSyncNameState().invalidatePolicyLayer();
    else invalidateCommandNames();
    return e.sessionCache;
  }
  return e.heldSoFar(null);
}
//@ chunk-dcmhvw5a.js:413359-413774 placement
function getRemoteManagedSettingsSyncFromCache(e) {
  let remoteManagedSettingsRawCache = getRemoteManagedSettingsRawCache();
  let r = currentRemoteSettingsState_2();
  let s = isVerifiedOrOverridden(r, remoteManagedSettingsRawCache)
    ? remoteManagedSettingsRawCache
    : unverifiedViewOf(r, remoteManagedSettingsRawCache);
  if (s === null || !isSnapshotOnlySession()) return s;
  if (r.projectedView?.raw !== s)
    r.projectedView = {
      raw: s,
      view: restrictionsOfUnvouchedDocumentUnsafe(s),
    };
  let view = r.projectedView.view;
  if (!e) return view;
  if (r.projectedParse?.raw !== s) {
    let c = {
      ...view,
    };
    deepMergeInto(c, restrictionsOfUnvouchedDocumentUnsafe(e(s)) ?? {});
    if (isDiskless())
      for (let { path, names } of CREDENTIAL_LIST_PATHS) {
        let flattened = [view, c].flatMap((h) => getAtPath(h, path) ?? []);
        if (flattened.length > 0) setAtPath(c, path, Ji(flattened, names));
      }
    r.projectedParse = {
      raw: s,
      view: c,
    };
  }
  return r.projectedParse.view;
}
//@ chunk-dcmhvw5a.js:413774-413899 placement
function deepMergeInto(e, n) {
  for (let [key, value] of Object.entries(n)) {
    let a = e[key];
    if (a !== value && isPlainObject_2(a) && isPlainObject_2(value)) {
      let c = {
        ...a,
      };
      deepMergeInto(c, value);
      e[key] = c;
    } else e[key] = value;
  }
}
//@ chunk-dcmhvw5a.js:413899-414034 placement
function unverifiedViewOf(e, remoteManagedSettingsRawCache) {
  if (remoteManagedSettingsRawCache === null) return null;
  if (e.unverifiedView?.raw !== remoteManagedSettingsRawCache)
    e.unverifiedView = {
      raw: remoteManagedSettingsRawCache,
      view: withholdUnverifiedEnv(remoteManagedSettingsRawCache),
    };
  return e.unverifiedView.view;
}
export {
  hostSessionSkipsSharedCache,
  holdsNoServedSettings,
  getRemoteManagedSettingsSyncFromCache,
  getMockRemoteSettingsValue,
  getMockRemoteSettingsFixturePath,
  remoteSettingsFileWritten,
  getSettingsPath,
  getRemoteManagedSettingsRawCache,
  unverifiedRemoteCacheWithholdsProvisions,
  primeRemoteManagedSettingsCache,
  narrowToRestrictions,
  readHelperConsentAttestation,
  helperTierOf,
  isConfirmedHelperHeld,
  getRemoteHelperTier,
  getRemoteHelperGap,
  withholdUnverifiedCacheKeys,
};
