/**
 * services/analytics/growthbookClient.ts
 *
 * 2.1.316 新增：GrowthBook 客户端持有者：创建/重建客户端、处理鉴权变化、日志去重、退出处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (10)
 * attribution: placement 10
 */
import {
  getPolyfills,
  helpers,
  GrowthBook,
} from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { RETRY_FLAG_NAMES, TENGU_FLAG_SET } from "../api/withRetry.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { En, wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../../utils/errors.js";
import {
  emptyAccountIdentity,
  PRE_INIT_FALLBACK_TIMEOUT_MS,
  PRE_INIT_OAUTH_REASON,
  envBearerFallbackMarker,
  getGrowthBookClient_2,
  PRE_INIT_KEY_HELPER_TIMEOUT_MS,
  PRE_INIT_OAUTH_TIMEOUT_MS,
  PLUGIN_HOOKS_MODULES_GATE,
} from "./growthbook.js";
import { withTimeout } from "../../utils/sleep.js";
import { getGrowthBookClientKey } from "../../constants/keys.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { require_resources } from "../../../vendor/@opentelemetry/resources/build/src/index.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";

//@ chunk-aepeg2w5.js:630358-630526 placement
/**
 * 向 GrowthBook /api/eval/<clientKey> POST 评估请求。
 */
var postGrowthBookEval = (e) =>
  getPolyfills().fetch(`${e.host}/api/eval/${e.clientKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...e.headers,
    },
    body: jsonStringify(e.payload),
    redirect: "error",
  });
//@ chunk-aepeg2w5.js:630526-648604 placement
/**
 * GrowthBook 客户端持有者：创建/重建客户端、处理鉴权变化、日志去重、退出处理。
 */
class GrowthBookClientHolder {
  deps;
  client = null;
  loggedNonObjectFeatureOnce = false;
  loggedMalformedExperimentOnce = false;
  loggedValuelessPayloadOnce = false;
  currentBeforeExitHandler = null;
  currentExitHandler = null;
  clientCreatedWithAuth = false;
  clientAuthResolutionTransientlyFailed = false;
  everCreatedWithAuth = false;
  clientAuthBearer = undefined;
  authLostMidSession = false;
  clientAccountUuid = undefined;
  clientOrganizationUuid = undefined;
  clientSlackTagConnected = false;
  usedNonDefaultHost = false;
  generation = 0;
  experimentDataByFeature = new Map();
  nonDefaultFeatureKeys = new Set();
  remoteEvalFeatureValues = new Map();
  remoteEvalFetchOkCount = 0;
  senderByPayload = new WeakMap();
  payloadSender = undefined;
  ownSavedFlags = null;
  pendingExposures = new Map();
  loggedExposures = new Set();
  refreshed = createSignal();
  environmentOverrides = null;
  environmentOverridesRaw = undefined;
  stagingOauthAtConstruction = false;
  clientPromise = null;
  initializePromise = null;
  initializeInFlight = false;
  refreshLoopController = null;
  refreshLoopBeforeExitListener = null;
  processExitListenerInstalled = false;
  processExited = false;
  atisPinRefreshChain = Promise.resolve();
  routeSdkRemoteEvalHere = (e) => this.fetchRemoteEval(e);
  disposed = false;
  credentials;
  storageV5;
  nextRemoteEvalAnswerer;
  constructor(deps) {
    this.deps = deps;
  }
  onProcessExit = () => {
    this.processExited = true;
    this.stopPeriodicRefresh();
  };
  answerNextRemoteEvalWith(nextRemoteEvalAnswerer) {
    this.nextRemoteEvalAnswerer = nextRemoteEvalAnswerer;
  }
  setCredentials(e) {
    if (this.credentials !== undefined && this.credentials !== e) {
      logForDebugging("GrowthBook: a credentials store was already handed in; the later one is ignored");
      return;
    }
    this.credentials = e;
  }
  setStorageBackend(e) {
    if (this.storageV5 !== undefined && this.storageV5 !== e) {
      logForDebugging("GrowthBook: a storage backend was already handed in; the later one is ignored");
      return;
    }
    this.storageV5 = e;
  }
  refreshOAuthToken() {
    if (isStorageV5Enabled())
      logForDebugging(
        `GrowthBook: token-refresh check (credentials store: ${this.credentials === undefined ? "none" : "handed"})`,
      );
    return this.deps.refreshOAuthTokenIfNeeded(this.credentials, this.storageV5);
  }
  onRefresh(e) {
    let n = true;
    let r = this.refreshed.subscribe(() => swallowAsync(e));
    if (this.remoteEvalFeatureValues.size > 0)
      queueMicrotask(() => {
        if (n && this.remoteEvalFeatureValues.size > 0) swallowAsync(e);
      });
    return () => {
      n = false;
      r();
    };
  }
  getEnvironmentOverrides() {
    return null;
  }
  hasEnvironmentOverride(e) {
    let environmentOverrides = this.getEnvironmentOverrides();
    return environmentOverrides !== null && readGateOverride(environmentOverrides, e);
  }
  hasOverride(e) {
    if (this.hasEnvironmentOverride(e)) return true;
    let configOverrides = this.readConfigOverrides();
    return configOverrides != null && readGateOverride(configOverrides, e);
  }
  isFeatureFromExperiment(e) {
    if (this.experimentDataByFeature.has(e)) return true;
    if (!this.deps.isEnabled() || RETRY_FLAG_NAMES.has(e)) return false;
    return (this.readSavedFlags().cachedExperimentFeatures ?? []).includes(e);
  }
  readConfigOverrides() {
    return;
  }
  getAllFeatures() {
    if (this.remoteEvalFeatureValues.size > 0) return Object.fromEntries(this.remoteEvalFeatureValues);
    return Uo(this.readSavedFlags().cachedGrowthBookFeatures ?? {}, [...RETRY_FLAG_NAMES]);
  }
  readSavedFlags() {
    return this.ownSavedFlags?.flags ?? this.deps.readGlobalConfig();
  }
  hasFreshFeatures() {
    return this.remoteEvalFeatureValues.size > 0;
  }
  okFetchCount() {
    return this.remoteEvalFetchOkCount;
  }
  claimsOfPayloadFetchedWith(e) {
    return this.payloadSender?.authBearer === e ? this.payloadSender.claims : undefined;
  }
  builtForIdentity() {
    return {
      accountUuid: this.clientAccountUuid,
      organizationUuid: this.clientOrganizationUuid,
    };
  }
  hasUsedNonDefaultHost() {
    return this.usedNonDefaultHost;
  }
  isInitializeInFlight() {
    return this.initializeInFlight;
  }
  hasHeldCredential() {
    return this.everCreatedWithAuth;
  }
  hasInitializeStarted() {
    return this.initializePromise !== null;
  }
  getNonDefaultFeatureKeys() {
    return this.nonDefaultFeatureKeys;
  }
  getConfigOverrides() {
    return this.readConfigOverrides() ?? {};
  }
  setConfigOverride(e, n) {
    return;
  }
  clearConfigOverrides() {
    return;
  }
  recordDeferredExposure(e, n) {
    let r = n.cachedExperimentData?.[e];
    if (
      typeof r !== "object" ||
      r === null ||
      typeof r.experimentId !== "string" ||
      typeof r.variationId !== "number" ||
      !En(r.value, n.cachedGrowthBookFeatures?.[e])
    )
      return;
    this.pendingExposures.set(e, {
      experimentId: r.experimentId,
      variationId: r.variationId,
    });
  }
  logExposureForFeature(e) {
    if (this.loggedExposures.has(e)) return;
    let n = this.experimentDataByFeature.get(e);
    if (n) {
      this.loggedExposures.add(e);
      if (
        !this.deps.logExposure({
          experimentId: n.experimentId,
          variationId: n.variationId,
          userAttributes: this.deps.getUserAttributes(),
          experimentMetadata: {
            feature_id: e,
          },
        })
      )
        this.loggedExposures.delete(e);
    }
  }
  drainPendingExposures() {
    for (let [e, n] of this.pendingExposures) {
      let r = this.experimentDataByFeature.get(e);
      if (r && r.experimentId === n.experimentId && r.variationId === n.variationId)
        this.logExposureForFeature(e);
    }
    this.pendingExposures.clear();
  }
  async processRemoteEvalPayload(e) {
    let payload = e.getPayload();
    if (!payload?.features || Object.keys(payload.features).length === 0) return false;
    let r = new Map();
    let s = new Set();
    let h = {};
    let y = [];
    let S = [];
    for (let [key, value] of Object.entries(payload.features)) {
      let G = value;
      if (G === null || typeof G !== "object") {
        y.push(`${key}:${G === null ? "null" : typeof G}`);
        continue;
      }
      if ("value" in G && !("defaultValue" in G))
        h[key] = {
          ...G,
          defaultValue: G.value,
        };
      else h[key] = G;
      if (G.source === "experiment" && G.experimentResult) {
        let { experimentResult, experiment } = G;
        if (typeof experiment?.key === "string" && typeof experimentResult.variationId === "number")
          r.set(key, {
            experimentId: experiment.key,
            variationId: experimentResult.variationId,
          });
        else
          S.push(`${key}:key=${typeof experiment?.key},variationId=${typeof experimentResult.variationId}`);
      }
      if (G.source !== undefined && G.source !== "defaultValue" && G.source !== "unknownFeature") s.add(key);
    }
    if (y.length > 0 && !this.loggedNonObjectFeatureOnce) {
      this.loggedNonObjectFeatureOnce = true;
      logError(Error(`processRemoteEvalPayload: skipped non-object features [${y.join(", ")}]`));
    }
    if (S.length > 0 && !this.loggedMalformedExperimentOnce) {
      this.loggedMalformedExperimentOnce = true;
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `processRemoteEvalPayload: skipped malformed experiment entries [${S.join(", ")}]`,
          "processRemoteEvalPayload: skipped malformed experiment entries",
        ),
      );
    }
    let w = new Map();
    let R = [];
    for (let [key, value] of Object.entries(h)) {
      let G = "value" in value ? value.value : value.defaultValue;
      if (G !== undefined) w.set(key, G);
      else {
        r.delete(key);
        s.delete(key);
        delete h[key];
        R.push(key);
      }
    }
    if (R.length > 0 && !this.loggedValuelessPayloadOnce) {
      this.loggedValuelessPayloadOnce = true;
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `processRemoteEvalPayload: skipped value-less entries [${R.join(", ")}]`,
          "processRemoteEvalPayload: skipped value-less entries",
        ),
      );
    }
    if (w.size === 0) return false;
    let x = {
      ...payload,
      features: h,
    };
    let P = this.senderByPayload.get(payload);
    this.senderByPayload.set(x, P);
    await e.setPayload(x);
    if (this.client !== e) return false;
    this.experimentDataByFeature.clear();
    for (let [F, L] of r) this.experimentDataByFeature.set(F, L);
    this.nonDefaultFeatureKeys.clear();
    for (let F of s) this.nonDefaultFeatureKeys.add(F);
    this.remoteEvalFeatureValues.clear();
    for (let [F, L] of w) this.remoteEvalFeatureValues.set(F, L);
    this.payloadSender = P;
    this.ownSavedFlags = null;
    return true;
  }
  syncRemoteEvalToDisk(e) {
    if (this.clientSlackTagConnected) return;
    if (this.everCreatedWithAuth && !this.clientCreatedWithAuth) return;
    if (this.usedNonDefaultHost) return;
    let n = this.payloadAsSaved();
    if (
      (e || this.deps.skipsSavingUnchangedFetch?.() === true) &&
      En(wS(this.deps.readGlobalConfig(), Object.keys(n)), n)
    )
      return;
    this.deps.saveGlobalConfig(
      (r) => ({
        ...r,
        ...n,
        cachedGrowthBookFeaturesAt: Date.now(),
      }),
      this.storageV5,
    );
  }
  payloadAsSaved() {
    let cachedGrowthBookFeatures = Uo(Object.fromEntries(this.remoteEvalFeatureValues), [
      ...RETRY_FLAG_NAMES,
    ]);
    let n = {};
    for (let [r, s] of this.experimentDataByFeature) {
      if (RETRY_FLAG_NAMES.has(r)) continue;
      n[r] = {
        experimentId: s.experimentId,
        variationId: s.variationId,
        value: this.remoteEvalFeatureValues.get(r),
      };
    }
    return {
      cachedGrowthBookFeatures,
      cachedExperimentFeatures: Object.keys(n).sort(),
      cachedExperimentData: n,
    };
  }
  async fetchRemoteEval(e) {
    if (this.disposed) return this.deps.fetchRemoteEvalFromSdk(e);
    let { response, sender } = await this.requestRemoteEval(e);
    if (response?.ok) {
      this.remoteEvalFetchOkCount++;
      let body = response.json();
      response.json = () => body;
      let h = await body.catch(() => {
        return;
      });
      if (typeof h === "object" && h !== null) this.senderByPayload.set(h, sender);
    }
    return response;
  }
  async sendStock(e) {
    return {
      response: await this.deps.fetchRemoteEvalFromSdk(e),
      sender: {
        authBearer: e.headers?.Authorization,
        claims: emptyAccountIdentity(e),
      },
    };
  }
  async requestRemoteEval(e) {
    let { host, clientKey, payload, headers } = e;
    let nextRemoteEvalAnswerer = this.nextRemoteEvalAnswerer;
    this.nextRemoteEvalAnswerer = undefined;
    if (!this.getFeatureValueWithSource("tengu_gb_eval_authed_enable", false).value) {
      if (!nextRemoteEvalAnswerer) return this.sendStock(e);
      let w;
      let R = await nextRemoteEvalAnswerer(e, async () => {
        w = await this.sendStock(e);
        return w.response;
      });
      return w !== undefined && R === w.response
        ? w
        : {
            response: R,
            sender: undefined,
          };
    }
    let S = {};
    if (this.deps.hasWorkspaceTrust()) {
      try {
        await this.refreshOAuthToken();
      } catch {}
      try {
        let authHeaders = await this.deps.getAuthHeaders();
        if (!authHeaders.error) S = authHeaders.headers;
      } catch {}
    }
    try {
      let response = await getPolyfills().fetch(`${host}/api/eval-authed/${clientKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
          ...S,
        },
        body: JSON.stringify(payload),
        redirect: "error",
      });
      if (!response.ok) {
        logError(Error("GrowthBook eval-authed returned non-ok; falling back to /api/eval"));
        return this.sendStock(e);
      }
      return {
        response,
        sender: {
          authBearer: S.Authorization ?? headers?.Authorization,
          claims: emptyAccountIdentity(e),
        },
      };
    } catch {
      logError(Error("GrowthBook eval-authed fetch threw; falling back to /api/eval"));
      return this.sendStock(e);
    }
  }
  getClient() {
    if (this.clientPromise === null) this.clientPromise = this.createClient();
    return this.clientPromise;
  }
  async createClient() {
    if (this.disposed || !this.deps.isEnabled()) return null;
    if (!this.processExitListenerInstalled) {
      this.processExitListenerInstalled = true;
      process.once("exit", this.onProcessExit);
    }
    let generation = this.generation;
    let n = {
      headers: {},
      error: "trust not established",
    };
    let r = false;
    if (this.deps.hasWorkspaceTrust()) {
      try {
        await withTimeout(this.refreshOAuthToken(), PRE_INIT_FALLBACK_TIMEOUT_MS, PRE_INIT_OAUTH_REASON);
      } catch (error) {
        let error_2 = toError(error);
        let F = error_2.message === PRE_INIT_OAUTH_REASON ? "timeout" : error_2.name;
        logForDebugging(`GrowthBook: pre-init OAuth refresh failed (${F})`);
      }
      try {
        n = await this.deps.getAuthHeaders();
      } catch (error) {
        logForDebugging(
          `GrowthBook: auth header resolution failed (${toError(error).name}), continuing without auth`,
        );
        n = {
          headers: {},
          error: "auth resolution failed",
        };
        r = true;
      }
    }
    if (this.disposed || generation !== this.generation) return null;
    let s = {
      ...this.deps.getUserAttributes(),
      ...(this.deps.sdkCachePartition !== undefined && {
        sdkCachePartition: this.deps.sdkCachePartition,
      }),
    };
    let clientKey = getGrowthBookClientKey();
    let y = envBearerFallbackMarker(this.deps.profileFlagHost?.());
    this.usedNonDefaultHost ||= y !== getGrowthBookClient_2;
    let S = !n.error;
    this.clientCreatedWithAuth = S;
    this.everCreatedWithAuth ||= S;
    if (S) this.authLostMidSession = false;
    this.clientAuthResolutionTransientlyFailed =
      !S && (r || n.reasonCode === "wif_error" || this.authLostMidSession);
    this.clientAuthBearer = S ? n.headers.Authorization : undefined;
    this.clientAccountUuid = s.accountUUID;
    this.clientOrganizationUuid = s.organizationUUID;
    this.clientSlackTagConnected = s.slackTagConnected === true;
    helpers.fetchRemoteEvalCall = this.routeSdkRemoteEvalHere;
    let w = new GrowthBook({
      apiHost: y,
      clientKey,
      attributes: s,
      remoteEval: true,
      cacheKeyAttributes: [
        "id",
        "organizationUUID",
        "slackTagConnected",
        "atisPin",
        "ccrDerivedSurface",
        "sdkCachePartition",
      ],
      apiHostRequestHeaders: {
        "User-Agent": claudeCodeUserAgent(),
        ...(S && n.headers),
      },
      ...false,
    });
    this.client = w;
    if (!S)
      return {
        client: w,
        initialized: Promise.resolve(),
      };
    let initialized = w
      .init({
        timeout: this.deps.sdkInitTimeoutMs ?? 5000,
        ...(this.deps.sdkCachePartition !== undefined && {
          skipCache: true,
        }),
      })
      .then(async (x) => {
        if (this.client !== w) return;
        let P = await this.processRemoteEvalPayload(w);
        if (this.client !== w) return;
        if (P) {
          this.drainPendingExposures();
          this.syncRemoteEvalToDisk(x.source === "cache");
          this.refreshed.emit();
        }
      })
      .catch((error) => {});
    this.currentBeforeExitHandler = () => this.client?.destroy();
    this.currentExitHandler = () => this.client?.destroy();
    process.on("beforeExit", this.currentBeforeExitHandler);
    process.on("exit", this.currentExitHandler);
    return {
      client: w,
      initialized,
    };
  }
  initialize() {
    let e = this.initializePromise === null && this.deps.isFetchHeld();
    if (this.disposed || e) return Promise.resolve(null);
    if (this.initializePromise === null) {
      let n = this.initializeClient();
      this.initializePromise = n;
      this.initializeInFlight = true;
      let r = () => {
        if (this.initializePromise === n) {
          this.initializeInFlight = false;
          if (
            this.ownSavedFlags !== null &&
            (!this.clientCreatedWithAuth ||
              this.clientAccountUuid !== this.ownSavedFlags.accountUuid ||
              this.clientOrganizationUuid !== this.ownSavedFlags.organizationUuid)
          ) {
            this.ownSavedFlags = null;
            this.refreshed.emit();
          }
        }
      };
      n.then(r, r);
    }
    return this.initializePromise;
  }
  async initializeClient() {
    let client = await this.getClient();
    if (!client) return null;
    await client.initialized;
    if (this.disposed) return null;
    this.startPeriodicRefresh();
    return client.client;
  }
  async getFeatureValueBlocking(e, n) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && e in environmentOverrides) return environmentOverrides[e];
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && e in configOverrides) return configOverrides[e];
    if (!this.deps.isEnabled()) return n;
    let h = await this.initialize();
    if (!h) return n;
    let y;
    let S = this.remoteEvalFeatureValues.get(e);
    if (S !== undefined) y = valueOrFallback(S, n);
    else y = h.getFeatureValue(e, n);
    this.logExposureForFeature(e);
    return y;
  }
  getFeatureValueWithSource(e, n) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && readGateOverride(environmentOverrides, e))
      return {
        value: environmentOverrides[e],
        source: "override",
      };
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && readGateOverride(configOverrides, e))
      return {
        value: configOverrides[e],
        source: "override",
      };
    if (!this.deps.isEnabled() && !this.deps.isDiskCacheReadableWhileDisabled())
      return {
        value: n,
        source: "disabled",
      };
    if (this.experimentDataByFeature.has(e)) this.logExposureForFeature(e);
    let h = this.remoteEvalFeatureValues.get(e);
    if (h !== undefined)
      return {
        value: valueOrFallback(h, n),
        source: "payload",
      };
    if (this.remoteEvalFeatureValues.size > 0)
      return {
        value: n,
        source: "fallback",
      };
    if (RETRY_FLAG_NAMES.has(e))
      return {
        value: n,
        source: "fallback",
      };
    try {
      let savedFlags = this.readSavedFlags();
      let S = savedFlags.cachedGrowthBookFeatures?.[e];
      if (S !== undefined) {
        this.recordDeferredExposure(e, savedFlags);
        return {
          value: valueOrFallback(S, n),
          source: "disk",
        };
      }
    } catch {}
    return {
      value: n,
      source: "fallback",
    };
  }
  async checkGateCachedOrBlocking(e) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && e in environmentOverrides) return Boolean(environmentOverrides[e]);
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && e in configOverrides) return Boolean(configOverrides[e]);
    if (!this.deps.isEnabled()) return false;
    if (this.remoteEvalFeatureValues.get(e) === true) {
      this.logExposureForFeature(e);
      return true;
    }
    if (!RETRY_FLAG_NAMES.has(e)) {
      let s =
        this.ownSavedFlags?.flags.cachedGrowthBookFeatures?.[e] === true
          ? this.ownSavedFlags.flags
          : this.deps.readGlobalConfig();
      if (s.cachedGrowthBookFeatures?.[e] === true) {
        this.recordDeferredExposure(e, s);
        return true;
      }
    }
    return this.getFeatureValueBlocking(e, false);
  }
  refreshAfterAuthChange(e) {
    if (this.disposed || !this.deps.isEnabled()) return;
    try {
      let ownSavedFlags = null;
      if (e?.keepsOwnSavedFlags === true && !this.deps.isFetchHeld())
        ownSavedFlags =
          this.remoteEvalFeatureValues.size > 0
            ? {
                flags: this.payloadAsSaved(),
                accountUuid: this.clientAccountUuid,
                organizationUuid: this.clientOrganizationUuid,
              }
            : this.ownSavedFlags;
      this.reset({
        preservePendingExposures: true,
        preserveLoggedExposures: e?.preserveLoggedExposures,
      });
      this.ownSavedFlags = ownSavedFlags;
      this.refreshed.emit();
      this.initialize().catch((error) => {
        logError(toError(error));
      });
    } catch (error) {
      logError(toError(error));
    }
  }
  reset(e) {
    this.stopPeriodicRefresh();
    if (this.currentBeforeExitHandler) {
      process.off("beforeExit", this.currentBeforeExitHandler);
      this.currentBeforeExitHandler = null;
    }
    if (this.currentExitHandler) {
      process.off("exit", this.currentExitHandler);
      this.currentExitHandler = null;
    }
    this.client?.destroy();
    this.client = null;
    this.generation++;
    this.nextRemoteEvalAnswerer = undefined;
    this.clientCreatedWithAuth = false;
    this.clientAuthResolutionTransientlyFailed = false;
    this.clientAuthBearer = undefined;
    this.clientAccountUuid = undefined;
    this.clientOrganizationUuid = undefined;
    this.clientSlackTagConnected = false;
    if (!e?.preserveLoggedExposures) {
      this.loggedNonObjectFeatureOnce = false;
      this.loggedMalformedExperimentOnce = false;
      this.loggedValuelessPayloadOnce = false;
    }
    this.experimentDataByFeature.clear();
    this.nonDefaultFeatureKeys.clear();
    if (!e?.preservePendingExposures) this.pendingExposures.clear();
    if (!e?.preserveLoggedExposures) this.loggedExposures.clear();
    this.remoteEvalFeatureValues.clear();
    this.payloadSender = undefined;
    this.ownSavedFlags = null;
    this.senderByPayload = new WeakMap();
    this.clientPromise = null;
    this.initializePromise = null;
    this.initializeInFlight = false;
    this.environmentOverrides = null;
    this.environmentOverridesRaw = undefined;
  }
  dispose() {
    this.disposed = true;
    this.authLostMidSession = false;
    process.removeListener("exit", this.onProcessExit);
    this.reset();
    if (helpers.fetchRemoteEvalCall === this.routeSdkRemoteEvalHere)
      helpers.fetchRemoteEvalCall = this.deps.fetchRemoteEvalFromSdk;
  }
  reclaimRemoteEvalHook() {
    if (this.disposed || this.client === null) return false;
    helpers.fetchRemoteEvalCall = this.routeSdkRemoteEvalHere;
    return true;
  }
  async refreshFeatures() {
    if (this.disposed || !this.deps.isEnabled()) return;
    try {
      if (this.clientCreatedWithAuth) {
        await this.refreshOAuthToken().catch((error) => {});
        let authHeaders = await this.deps.getAuthHeaders();
        if (this.disposed) return;
        if (authHeaders.error) {
          this.authLostMidSession = true;
          this.refreshAfterAuthChange();
          return;
        }
        let Authorization = authHeaders.headers.Authorization;
        if (
          this.clientCreatedWithAuth &&
          Authorization !== undefined &&
          Authorization !== this.clientAuthBearer
        ) {
          let S = this.deps.rereadUserAttributes();
          let w =
            S.accountUUID === this.clientAccountUuid && S.organizationUUID === this.clientOrganizationUuid;
          this.refreshAfterAuthChange({
            preserveLoggedExposures: w,
            keepsOwnSavedFlags: w && S.accountUUID !== undefined,
          });
          return;
        }
      } else if (this.clientAuthResolutionTransientlyFailed) {
        let h = await this.deps.getAuthHeaders().catch(() => null);
        if (
          h &&
          !h.error &&
          (h.headers.Authorization || (this.authLostMidSession && Object.keys(h.headers).length > 0))
        ) {
          this.refreshAfterAuthChange();
          return;
        }
      }
      let e = await this.initialize();
      if (!e) return;
      let atisPin = this.deps.getUserAttributes().atisPin;
      let r = false;
      if (atisPin !== e.getAttributes().atisPin) {
        let remoteEvalFetchOkCount = this.remoteEvalFetchOkCount;
        await e.updateAttributes({
          atisPin,
        });
        r = this.remoteEvalFetchOkCount !== remoteEvalFetchOkCount;
      }
      if (!r)
        await e.refreshFeatures({
          skipCache: true,
        });
      if (e !== this.client) return;
      let s = await this.processRemoteEvalPayload(e);
      if (e !== this.client) return;
      if (s) {
        this.drainPendingExposures();
        this.syncRemoteEvalToDisk(false);
        this.refreshed.emit();
      }
    } catch (error) {
      logError(toError(error));
    }
  }
  refreshAtisPin() {
    this.atisPinRefreshChain = this.atisPinRefreshChain
      .then(() => {
        if (
          this.client !== null &&
          this.deps.getUserAttributes().atisPin !== this.client.getAttributes().atisPin
        )
          return this.refreshFeatures();
      })
      .catch((error) => logError(toError(error)));
    return this.atisPinRefreshChain;
  }
  startPeriodicRefresh() {
    if (this.disposed || this.processExited || !this.deps.isEnabled()) return;
    this.stopPeriodicRefresh();
    let abortController = new AbortController();
    this.refreshLoopController = abortController;
    this.periodicRefreshLoop(abortController.signal);
    this.refreshLoopBeforeExitListener = () => {
      this.stopPeriodicRefresh();
    };
    process.once("beforeExit", this.refreshLoopBeforeExitListener);
  }
  async periodicRefreshLoop(e) {
    while (!e.aborted && !this.disposed)
      try {
        let { intervalMs, flagged } = this.deps.getRefreshCadence();
        await this.deps.sleep(intervalMs, e, {
          unref: true,
        });
        if (e.aborted) return;
        let remoteEvalFetchOkCount = this.remoteEvalFetchOkCount;
        await this.refreshFeatures();
        if (flagged && this.remoteEvalFetchOkCount === remoteEvalFetchOkCount && !e.aborted) {
          await this.deps.sleep(Math.round(Math.random() * PRE_INIT_KEY_HELPER_TIMEOUT_MS), e, {
            unref: true,
          });
          if (e.aborted) return;
          await this.refreshFeatures();
        }
      } catch (error) {
        logError(toError(error));
        await this.deps.sleep(PRE_INIT_OAUTH_TIMEOUT_MS, e, {
          unref: true,
        });
      }
  }
  stopPeriodicRefresh() {
    if (this.refreshLoopController) {
      this.refreshLoopController.abort();
      this.refreshLoopController = null;
    }
    if (this.refreshLoopBeforeExitListener) {
      process.removeListener("beforeExit", this.refreshLoopBeforeExitListener);
      this.refreshLoopBeforeExitListener = null;
    }
  }
}
//@ chunk-aepeg2w5.js:648604-648641 placement
function valueOrFallback(e, n) {
  return e === null ? n : e;
}
//@ chunk-aepeg2w5.js:648641-648715 placement
function swallowAsync(e) {
  try {
    Promise.resolve(e()).catch((error) => {
      logError(error);
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:648715-648776 placement
function readGateOverride(e, n) {
  let r = n === PLUGIN_HOOKS_MODULES_GATE;
  return n in e && (!r || e[n] === true);
}
//@ chunk-aepeg2w5.js:648776-648865 placement
function stripCredentialFields(e) {
  let filtered = Object.keys(e).filter((key) => TENGU_FLAG_SET.has(key));
  return filtered.length === 0 ? e : Uo(e, filtered);
}
//@ chunk-aepeg2w5.js:648865-648898 placement
var nodeModuleA = Re(require_core(), 1);
var nodeModuleB = Re(require_resources(), 1);
//@ chunk-aepeg2w5.js:648898-648914 placement
var growthbookSdkModule = Re(require_api());
//@ chunk-aepeg2w5.js:648914-648933 placement
class NoopEmitter {
  emit(e) {}
}
//@ chunk-aepeg2w5.js:648933-648947 placement
var noopEmitter = new NoopEmitter();
export {
  postGrowthBookEval,
  GrowthBookClientHolder,
  NoopEmitter,
  noopEmitter,
  growthbookSdkModule,
  nodeModuleA,
  nodeModuleB,
};
