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
import { join, join as join_2, join as join_3, join as join_4 } from "path";
import {
  withHostOwnedEnvGuard,
  isSecDefaultPluginEnabled,
  getEnvCaseInsensitive,
} from "../../utils/plugins/securityDefaultPlugin.js";
import {
  u1e,
  extractRestrictionSettings,
  getAtPath,
  setAtPath,
} from "../../utils/settings/managedRestrictionKeys.js";
import { env } from "../../utils/env.js";
import { DESKTOP_ENTRYPOINTS, isProviderManagedByHost } from "../../utils/entrypointKinds.js";
import {
  getRemoteSettingsPathOverride,
  SETTINGS_FILENAME,
  re,
  isManagedSettingsCopyTrustEnforced,
  Yu,
  stripReservedKeys,
  servedBodyOf,
  getHelperConsentPath,
  HELPER_CONSENT_STATE_ID,
  xo,
  Is,
} from "./remoteSettingsState.js";
import { getClaudeConfigDir, isSameConfigDir, getClaudeConfigDirOrNull } from "../../utils/envUtils.js";
import { En, wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { Wo } from "../../utils/json.js";
import { Cj, readFileSync, decodeTextBuffer } from "../../utils/fileRead.js";
import { logForDebugging } from "../../utils/debug.js";
import { isSoftVerificationFailure, verifySignedCache } from "../../utils/settings/policyCertificates.js";
import { computeChecksum } from "../policyLimits/index.js";
import { errorMessage } from "../../utils/errors.js";
import { Do } from "../../utils/git/gitSafeEnv.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import {
  isMergingPolicyHelper,
  policyHelperSlots,
  Ps,
} from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { PROVIDER_ENV_FLAGS } from "../../utils/model/modelIds.js";
import { isDiskless } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES, FMt } from "../../utils/storage/storageSpaces.js";
import { formatStorageError, storageErrorCode } from "../../utils/storage/storageErrors.js";
import {
  NETWORK_ENV_VARS,
  gj,
  qG,
  lJt,
  AWS_CREDENTIAL_ENV_VARS,
  ebr,
  Gx,
} from "../../utils/managedEnvConstants.js";
import { platformSettingsChain } from "../../utils/settings/marketplaceSettingsAliases.js";
import { or, is } from "../../utils/settings/commandSyncNames.js";
import { restrictionsOfUnvouchedDocumentUnsafe, CREDENTIAL_LIST_PATHS } from "./unvouchedRestrictions.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";

//@ chunk-dcmhvw5a.js:402126-402247 placement
function hostSessionSkipsSharedCache() {
  return withHostOwnedEnvGuard(
    () =>
      u1e() ||
      (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
        DESKTOP_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "")) ||
      isProviderManagedByHost(),
  );
}
//@ chunk-dcmhvw5a.js:402247-402287 placement
function holdsNoServedSettings(e) {
  return e && !u1e() && !getRemoteManagedSettingsSyncFromCache();
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
  let e = getMockRemoteSettingsValue();
  return e !== void 0 && e.startsWith("@") && e.length > 1 ? e.slice(1) : void 0;
}
//@ chunk-dcmhvw5a.js:402443-402458 placement
var Mo = 8388608;
//@ chunk-dcmhvw5a.js:402458-402534 placement
function xC(e) {
  if (e === null || !u1e()) return e;
  let n = extractRestrictionSettings(e);
  return En(n, e) ? e : n;
}
/**
 * 读取磁盘上的远程设置副本（检查信任与大小）。
 */
//@ chunk-dcmhvw5a.js:402534-403040 placement
function loadStoredRemoteSettings() {
  if (hostSessionSkipsSharedCache()) return null;
  let e = re(),
    storedCopyRefusal = e.storedCopyRefusal;
  if (
    storedCopyRefusal !== null &&
    isManagedSettingsCopyTrustEnforced() &&
    Date.now() - storedCopyRefusal.atMs < Yu
  )
    return ((e.storedCopyTrust = { trusted: !1, reason: storedCopyRefusal.reason }), null);
  ((e.storedCopyTrust = "not_asked"), (e.storedCopyRefusal = null), (e.refusedCopyHelperTier = null));
  try {
    let r = readRemoteSettingsFileStable();
    if (r === null) return null;
    let s = jsonParse(Wo(r));
    if (!s || typeof s !== "object" || Array.isArray(s)) return null;
    let a = stripReservedKeys(s);
    return checkStoredCopyTrust(a) ? a : null;
  } catch (error) {
    if (Cj(error))
      logForDebugging(`Remote settings: Disk cache exceeds ${Mo} bytes; ignoring it as if absent`);
    return null;
  }
}
/**
 * 检查远程设置副本的信任（组织固定、签名）。
 */
//@ chunk-dcmhvw5a.js:403040-403459 placement
function checkStoredCopyTrust(e) {
  let n = re();
  if (
    !isManagedSettingsCopyTrustEnforced() ||
    !n.storedCopyGateCovers ||
    getRemoteSettingsPathOverride() !== void 0 ||
    n.evalPolicySnapshotOnly
  )
    return ((n.storedCopyTrust = "not_asked"), !0);
  let storedCopyOrgPin = n.storedCopyOrgPin;
  if (storedCopyOrgPin.kind === "read") {
    let a = verifyStoredCopy(e, storedCopyOrgPin.orgs);
    if (a.trusted) return ((n.storedCopyTrust = a), !0);
    return (refuseStoredCopy(e, a.reason, isSoftVerificationFailure(a.reason)), !1);
  }
  let s = e.forceRemoteSettingsRefresh === !0 ? verifyStoredCopy(e, void 0) : void 0;
  return (
    refuseStoredCopy(
      e,
      "org_pin_unknown",
      s !== void 0 && (s.trusted || isSoftVerificationFailure(s.reason)),
    ),
    !1
  );
}
/**
 * 校验远程设置副本签名。
 */
//@ chunk-dcmhvw5a.js:403459-403768 placement
function verifyStoredCopy(e, n) {
  try {
    return verifySignedCache({
      kind: "managed-settings",
      cachePath: getSettingsPath(),
      body: servedBodyOf(e),
      bodySha: computeChecksum(servedBodyOf(e)),
      account: re().storedAccountReader?.(),
      pinnedOrgs: n,
      nowMs: Date.now(),
      roots: isSecDefaultPluginEnabled(),
    });
  } catch (error) {
    return (
      logForDebugging(`Remote settings: the gate on a stored copy failed: ${errorMessage(error)}`, {
        level: "error",
      }),
      { trusted: !1, reason: "error" }
    );
  }
}
/**
 * 拒绝不可信的远程设置副本。
 */
//@ chunk-dcmhvw5a.js:403768-404093 placement
function refuseStoredCopy(e, n, r) {
  let s = re();
  ((s.storedCopyTrust = { trusted: !1, reason: n }),
    (s.storedCopyRefusal = {
      atMs: Date.now(),
      reason: n,
      forcesRefresh: r && e.forceRemoteSettingsRefresh === !0,
    }),
    (s.refusedCopyHelperTier = isSoftVerificationFailure(n) ? helperTierFor(e) : null),
    s.seedConsentBaseline(e),
    logForDebugging(`Remote settings: the stored copy is not trusted at rest (${n}); treating it as absent`));
}
//@ chunk-dcmhvw5a.js:404093-404268 placement = hasApiKeyHelper (1)
function helperTierOf(settings) {
  if (settings === null) return null;
  let { apiKeyHelper: apiKeyHelper, env: env } = settings;
  return typeof apiKeyHelper === "string" && apiKeyHelper.trim() !== ""
    ? { apiKeyHelper: apiKeyHelper, env: Do(isPlainObject_2(env) ? env : {}, (s) => typeof s === "string") }
    : null;
}
//@ chunk-dcmhvw5a.js:404268-404403 placement
function helperTierFor(e) {
  let [n] = orderedPlatformLayers(e);
  if (e === null || n === void 0) return helperTierOf(e);
  let [r, s] = n;
  return helperTierOf(isMergingPolicyHelper(e, r) ? { ...e, ...s, env: { ...e.env, ...s.env } } : s);
}
//@ chunk-dcmhvw5a.js:404403-404499 placement
function tp(e) {
  return e.sessionCache === e.verifiedPayload ? helperTierOf(e.sessionCache) : helperTierFor(e.sessionCache);
}
//@ chunk-dcmhvw5a.js:404499-404856 placement
function getRemoteHelperTier() {
  let e = re(),
    helperTierReadAtMs = e.helperTierReadAtMs;
  if (e.sessionCache === null && (helperTierReadAtMs === null || Date.now() - helperTierReadAtMs >= Yu))
    ((e.helperTierReadAtMs = Date.now()), getRemoteManagedSettingsRawCache());
  let {
      sessionCache: sessionCache,
      refusedCopyHelperTier: refusedCopyHelperTier,
      droppedHelperTier: droppedHelperTier,
    } = e,
    c = tp(e);
  if (c !== null) return c;
  if (sessionCache === null && refusedCopyHelperTier !== null) return refusedCopyHelperTier;
  if (droppedHelperTier === null) return null;
  let g = inheritedProviderEnv(droppedHelperTier, sessionCache);
  return Object.keys(g).length === 0 ? null : { ...droppedHelperTier, env: g };
}
//@ chunk-dcmhvw5a.js:404856-405073 placement
function inheritedProviderEnv(e, n) {
  let r = e.env ?? {},
    s = isPlainObject_2(n?.env) ? n.env : {},
    a = {};
  for (let c of ["ANTHROPIC_BASE_URL", "CLAUDE_CODE_API_BASE_URL", ...PROVIDER_ENV_FLAGS]) {
    let g = getEnvCaseInsensitive(r, c)?.trim();
    if (g && g === process.env[c]?.trim() && getEnvCaseInsensitive(s, c) === void 0) a[c] = g;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:405073-405159 placement
function isConfirmedHelperHeld() {
  let { sessionCache: sessionCache, verifiedPayload: verifiedPayload } = re();
  return sessionCache === verifiedPayload && helperTierOf(sessionCache) !== null;
}
//@ chunk-dcmhvw5a.js:405159-405407 placement
function getRemoteHelperGap() {
  let e = re();
  if (tp(e) !== null) return e.sessionCache === e.verifiedPayload ? null : "settings_unloaded";
  if (e.sessionCache === null && e.refusedCopyHelperTier !== null) return "settings_unloaded";
  return e.droppedHelperTier === null ? null : "restart_needed";
}
//@ chunk-dcmhvw5a.js:405407-405419 placement
var UC = 4096;
//@ chunk-dcmhvw5a.js:405419-405546 placement
function readHelperConsentAttestation() {
  let e = getBackendView();
  if (e !== void 0) return e.attestation;
  if (isDiskless()) return;
  try {
    return readFileSync(getHelperConsentPath(), UC).trim() || void 0;
  } catch {
    return;
  }
}
//@ chunk-dcmhvw5a.js:405546-405555 placement
var zC = 4;
//@ chunk-dcmhvw5a.js:405555-405757 placement
function readRemoteSettingsFileStable() {
  let e = getBackendView();
  if (e !== void 0) return e.content;
  if (isDiskless() && getRemoteSettingsPathOverride() === void 0) return null;
  {
    let n = readFileSync(getSettingsPath(), Mo);
    for (let r = 0; r < zC; r++) {
      let s = readFileSync(getSettingsPath(), Mo);
      if (s === n) return n;
      n = s;
    }
    return null;
  }
  return readFileSync(getSettingsPath(), Mo);
}
//@ chunk-dcmhvw5a.js:405757-405933 placement
function getBackendView() {
  let backendView = re().backendView;
  if (
    !isStorageV5Enabled() ||
    backendView === void 0 ||
    !backendView.ready ||
    backendView.stoodDown ||
    getRemoteSettingsPathOverride() !== void 0
  )
    return;
  if (!isSameConfigDir(backendView.configHome)) {
    backendView.standDown("config home changed");
    return;
  }
  return backendView;
}
//@ chunk-dcmhvw5a.js:405933-405993 placement
var state = STORAGE_SPACES.state("remote-settings"),
  state_2 = STORAGE_SPACES.state(HELPER_CONSENT_STATE_ID),
  FC = 2000;
//@ chunk-dcmhvw5a.js:405993-406058 placement
function remoteSettingsFileWritten(e, n) {
  re().backendView?.written(e === "cache" ? state : state_2, n);
}
//@ chunk-dcmhvw5a.js:406058-406388 placement
async function primeRemoteManagedSettingsCache(e) {
  if (!isStorageV5Enabled() || e === void 0) return;
  let n = re();
  if (n.backendView !== void 0) return n.backendView.priming;
  if (getRemoteSettingsPathOverride() !== void 0) {
    logForDebugging(
      "Remote settings: storage prime skipped (CLAUDE_CODE_REMOTE_SETTINGS_PATH override); disk probe stays",
    );
    return;
  }
  if (hostSessionSkipsSharedCache()) return;
  let r = new RemoteSettingsStorageWatcher(e);
  return ((n.backendView = r), (r.priming = watchRemoteSettingsStorage(r, e, n)), r.priming);
}
/**
 * 订阅存储中的远程设置变化。
 */
//@ chunk-dcmhvw5a.js:406388-406999 placement
async function watchRemoteSettingsStorage(e, n, r) {
  try {
    for (let s of [state_2, state]) {
      let subscribe = await n.subscribe({ target: "key", key: s }, (c) => e.onEvent(c), {
        maxObservationLagMs: FC,
      });
      if (!subscribe.ok) {
        e.standDown(`watch refused: ${formatStorageError(subscribe.error)}`, "warn");
        return;
      }
      if (e.stoodDown) {
        unsubscribeSafe(subscribe.value);
        return;
      }
      e.subscriptions.push(subscribe.value);
    }
    if (!(await e.settled()) || !(await e.readUnobserved())) return;
    if (e.stoodDown) return;
    ((e.ready = !0),
      logForDebugging(
        `Remote settings: primed from storage (${rp(e.content)}; helper consent ${e.attestation === void 0 ? "not attested" : "attested"}${r.sessionCache !== null ? "; cache already loaded, serving later loads" : ""})`,
      ));
  } catch (error) {
    e.standDown(`prime failed: ${errorMessage(error)}`);
  }
}
/**
 * 远程设置存储监视器（缓存文件与 helper 同意副本）。
 */
//@ chunk-dcmhvw5a.js:406999-410132 placement
class RemoteSettingsStorageWatcher {
  storageV5;
  content = null;
  attestation = void 0;
  ready = !1;
  priming = Promise.resolve();
  stoodDown = !1;
  configHome = getClaudeConfigDirOrNull();
  subscriptions = [];
  cache = makeWatchEntry(state, "cache file");
  sidecar = makeWatchEntry(state_2, "helper consent sidecar");
  work = Promise.resolve(!0);
  steps = 0;
  lastCacheStep = 0;
  constructor(e) {
    this.storageV5 = e;
  }
  onEvent(e) {
    if (this.stoodDown) return;
    if (!e.ok) {
      this.standDown(`watch ended: ${formatStorageError(e.error)}`);
      return;
    }
    let heldOf = this.heldOf(e.value.key);
    if (heldOf === void 0) return;
    if (e.value.kind === "snapshot" && heldOf.begun) return;
    this.take(heldOf, eventValue(e.value));
  }
  settled() {
    return this.work.then((e) => e && !this.stoodDown);
  }
  readUnobserved() {
    for (let e of [this.cache, this.sidecar]) if (!e.observed) this.take(e);
    return this.settled();
  }
  written(e, n) {
    let r = this.stoodDown ? void 0 : this.heldOf(e);
    if (r === void 0) return;
    if (((r.begun = !0), r.generation++, r === this.cache)) this.sidecar.generation++;
    if ((this.advance(r), n !== null && Buffer.byteLength(n, "utf8") > xo)) {
      this.standDown(`oversize ${r.label}`);
      return;
    }
    (this.install(r, n), this.follow(r, n === null));
  }
  heldOf(e) {
    let n = FMt(e);
    return n === this.cache.id ? this.cache : n === this.sidecar.id ? this.sidecar : void 0;
  }
  take(e, n) {
    if (((e.begun = !0), n !== void 0)) {
      e.pendingRead = void 0;
      let generation = e.generation;
      this.queue(e, () => (e.generation === generation ? this.fill(e, n) : !this.stoodDown));
    }
    return this.follow(e, n === void 0);
  }
  follow(e, n) {
    if (n && e.pendingRead === void 0) {
      let queue = this.queue(e, () => {
        if (e.pendingRead === queue) e.pendingRead = void 0;
        return this.read(e);
      });
      e.pendingRead = queue;
    }
    if (e === this.cache && (this.sidecar.pendingRead ?? 0) < this.lastCacheStep)
      return ((this.sidecar.pendingRead = void 0), this.take(this.sidecar));
    return this.work;
  }
  queue(e, n) {
    let advance = this.advance(e);
    return (
      (this.work = this.work
        .then(n)
        .catch((s) => (this.standDown(`refresh failed: ${errorMessage(s)}`), !1))),
      advance
    );
  }
  advance(e) {
    let n = ++this.steps;
    if (e === this.cache) this.lastCacheStep = n;
    return n;
  }
  async read(e) {
    if (this.stoodDown) return !1;
    let generation = e.generation;
    try {
      let read = await this.storageV5.read([{ key: e.key, offset: 0, length: xo + 1 }]);
      if (e.generation !== generation) {
        if (!read.ok)
          logForDebugging(
            `Remote settings: a superseded read of the ${e.label} failed (${formatStorageError(read.error)}); ignored`,
          );
        return !this.stoodDown;
      }
      if (!read.ok) {
        if (storageErrorCode(read.error) === "ELOOP")
          return (
            logForDebugging(
              `Remote settings: the ${e.label} is a symlink; not read with the storage flag on (strict rule for files only Claude Code writes)`,
              { level: "warn" },
            ),
            this.fill(e, null)
          );
        return (this.standDown(`read failed: ${formatStorageError(read.error)}`), !1);
      }
      let s = read.value.items[0];
      if (s.found && s.totalBytes > xo) return (this.standDown(`oversize ${e.label}`), !1);
      return this.fill(e, s.found ? s.value : null);
    } catch (error) {
      return (this.standDown(`read failed: ${errorMessage(error)}`), !1);
    }
  }
  fill(e, n) {
    if (this.stoodDown) return !1;
    if (n !== null && n.byteLength > xo) return (this.standDown(`oversize ${e.label}`), !1);
    return (this.install(e, n === null ? null : decodeTextBuffer(n)), !0);
  }
  install(e, n) {
    if (e === this.cache) {
      if (e.observed && this.ready) logForDebugging(`Remote settings: storage view refreshed (${rp(n)})`);
      ((this.content = n), (this.attestation = void 0));
    } else this.attestation = n?.trim() || void 0;
    e.observed = !0;
  }
  standDown(e, n = "debug") {
    let r = re();
    if (r.backendView === this) r.backendView = void 0;
    if (this.stoodDown) return;
    ((this.stoodDown = !0), (this.content = null), (this.attestation = void 0));
    for (let s of this.subscriptions.splice(0)) unsubscribeSafe(s);
    logForDebugging(`Remote settings: storage view stood down (${e}); disk probe serves`, { level: n });
  }
}
//@ chunk-dcmhvw5a.js:410132-410234 placement
function makeWatchEntry(e, n) {
  return { key: e, id: FMt(e), label: n, observed: !1, begun: !1, pendingRead: void 0, generation: 0 };
}
//@ chunk-dcmhvw5a.js:410234-410352 placement
function unsubscribeSafe(e) {
  try {
    e.unsubscribe();
  } catch (error) {
    logForDebugging(`Remote settings: storage unsubscribe failed: ${errorMessage(error)}`, { level: "warn" });
  }
}
//@ chunk-dcmhvw5a.js:410352-410476 placement
function eventValue(e) {
  switch (e.kind) {
    case "snapshot":
      return "absent" in e ? void 0 : e.value;
    case "updated":
      return e.value;
    default:
      return;
  }
}
//@ chunk-dcmhvw5a.js:410476-410536 placement
function rp(e) {
  return e === null ? "absent" : `${e.length} chars`;
}
/**
 * 未验证的远程设置中扣下的环境变量键。
 */
//@ chunk-dcmhvw5a.js:410536-412299 placement
var UNVERIFIED_WITHHELD_ENV_KEYS = new Set(
  [
    ...NETWORK_ENV_VARS,
    "CLAUDE_CODE_PROXY_RESOLVES_HOSTS",
    "CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER",
    "CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS",
    "API_FORCE_IDLE_TIMEOUT",
    "ANTHROPIC_UNIX_SOCKET",
    "NODE_OPTIONS",
    ...gj,
    ...qG,
    "AWS_ENDPOINT_URL_STS",
    "AWS_ENDPOINT_URL",
    "AWS_ENDPOINT_URL_SSO",
    "AWS_ENDPOINT_URL_SSO_OIDC",
    "AWS_ENDPOINT_URL_BEDROCK",
    "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
    ...lJt,
    ...AWS_CREDENTIAL_ENV_VARS,
    ...ebr,
    "CLOUDSDK_CONFIG",
    "GOOGLE_EXTERNAL_ACCOUNT_ALLOW_EXECUTABLES",
    "GCLOUD_PROJECT",
    "CLAUDE_CODE_CUSTOM_OAUTH_URL",
    ...Gx,
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
  let { managedMcpServers: managedMcpServers, ...r } = e;
  return e.env ? { ...r, env: wi(e.env, (s, a) => UNVERIFIED_WITHHELD_ENV_KEYS.has(a.toUpperCase())) } : r;
}
//@ chunk-dcmhvw5a.js:412464-412585 placement
function withholdUnverifiedCacheKeys(e) {
  return "managedMcpServers" in e ||
    (!!e.env && Object.keys(e.env).some((r) => UNVERIFIED_WITHHELD_ENV_KEYS.has(r.toUpperCase())))
    ? (withholdUnverifiedEnv(e) ?? e)
    : e;
}
//@ chunk-dcmhvw5a.js:412585-412702 placement
function unverifiedRemoteCacheWithholdsProvisions() {
  let e = getRemoteManagedSettingsRawCache();
  if (e === null || Is() || lp(re(), e)) return !1;
  if (Wu(e)) return !0;
  return orderedPlatformLayers(e).some(([, n]) => Wu(n));
}
//@ chunk-dcmhvw5a.js:412702-412825 placement
function orderedPlatformLayers(e) {
  let n = policyHelperSlots(e);
  if (n.length === 0) return [];
  return [...platformSettingsChain().chain, void 0].flatMap((r) => n.filter(([s]) => Ps(s) === r));
}
//@ chunk-dcmhvw5a.js:412825-412903 placement
function Wu(e) {
  let managedMcpServers = e.managedMcpServers;
  return isPlainObject_2(managedMcpServers) && Object.keys(managedMcpServers).length > 0;
}
//@ chunk-dcmhvw5a.js:412903-412964 placement
function lp(e, n) {
  return n === e.verifiedPayload || Boolean(getRemoteSettingsPathOverride());
}
//@ chunk-dcmhvw5a.js:412964-413359 placement
function getRemoteManagedSettingsRawCache() {
  let e = re();
  if (!getRemoteSettingsPathOverride() && e.eligible !== !0) return e.heldSoFar(null);
  if (e.sessionCache) {
    if (e.sessionCache !== e.seededUnjudged || !isManagedSettingsCopyTrustEnforced()) return e.sessionCache;
    ((e.sessionCache = null), (e.seededUnjudged = null), or());
  }
  let n = getBackendView() !== void 0,
    r = loadStoredRemoteSettings();
  if (r) {
    if (
      (e.seedFromDisk(r),
      (e.seededUnjudged = isManagedSettingsCopyTrustEnforced() ? null : e.sessionCache),
      n)
    )
      is().invalidatePolicyLayer();
    else or();
    return e.sessionCache;
  }
  return e.heldSoFar(null);
}
//@ chunk-dcmhvw5a.js:413359-413774 placement
function getRemoteManagedSettingsSyncFromCache(e) {
  let n = getRemoteManagedSettingsRawCache(),
    r = re(),
    s = lp(r, n) ? n : unverifiedViewOf(r, n);
  if (s === null || !Is()) return s;
  if (r.projectedView?.raw !== s)
    r.projectedView = { raw: s, view: restrictionsOfUnvouchedDocumentUnsafe(s) };
  let view = r.projectedView.view;
  if (!e) return view;
  if (r.projectedParse?.raw !== s) {
    let c = { ...view };
    if ((deepMergeInto(c, restrictionsOfUnvouchedDocumentUnsafe(e(s)) ?? {}), isDiskless()))
      for (let { path: path, names: names } of CREDENTIAL_LIST_PATHS) {
        let flattened = [view, c].flatMap((h) => getAtPath(h, path) ?? []);
        if (flattened.length > 0) setAtPath(c, path, Ji(flattened, names));
      }
    r.projectedParse = { raw: s, view: c };
  }
  return r.projectedParse.view;
}
//@ chunk-dcmhvw5a.js:413774-413899 placement
function deepMergeInto(e, n) {
  for (let [r, s] of Object.entries(n)) {
    let a = e[r];
    if (a !== s && isPlainObject_2(a) && isPlainObject_2(s)) {
      let c = { ...a };
      (deepMergeInto(c, s), (e[r] = c));
    } else e[r] = s;
  }
}
//@ chunk-dcmhvw5a.js:413899-414034 placement
function unverifiedViewOf(e, n) {
  if (n === null) return null;
  if (e.unverifiedView?.raw !== n) e.unverifiedView = { raw: n, view: withholdUnverifiedEnv(n) };
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
  xC,
  readHelperConsentAttestation,
  helperTierOf,
  isConfirmedHelperHeld,
  getRemoteHelperTier,
  getRemoteHelperGap,
  withholdUnverifiedCacheKeys,
};
