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
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { import_sortedIndex_2, pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../../utils/errors.js";
import {
  emptyAccountIdentity,
  PRE_INIT_FALLBACK_TIMEOUT_MS,
  PRE_INIT_OAUTH_REASON,
  envBearerFallbackMarker,
  DEFAULT_GROWTHBOOK_HOST,
  PRE_INIT_KEY_HELPER_TIMEOUT_MS,
  PRE_INIT_OAUTH_TIMEOUT_MS,
  PLUGIN_HOOKS_MODULES_GATE,
} from "./growthbook.js";
import { withTimeout } from "../../utils/sleep.js";
import { getGrowthBookClientKey } from "../../constants/keys.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { require_resources } from "../../../vendor/@opentelemetry/resources/build/src/index.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:630358-630526 placement
/**
 * 向 GrowthBook /api/eval/<clientKey> POST 评估请求。
 */
var postGrowthBookEval = (request) =>
  getPolyfills().fetch(`${request.host}/api/eval/${request.clientKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...request.headers,
    },
    body: jsonStringify(request.payload),
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
  routeSdkRemoteEvalHere = (request) => this.fetchRemoteEval(request);
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
  setCredentials(credentials) {
    if (this.credentials !== undefined && this.credentials !== credentials) {
      logForDebugging("GrowthBook: a credentials store was already handed in; the later one is ignored");
      return;
    }
    this.credentials = credentials;
  }
  setStorageBackend(storageV5) {
    if (this.storageV5 !== undefined && this.storageV5 !== storageV5) {
      logForDebugging("GrowthBook: a storage backend was already handed in; the later one is ignored");
      return;
    }
    this.storageV5 = storageV5;
  }
  refreshOAuthToken() {
    if (isStorageV5Enabled())
      logForDebugging(
        `GrowthBook: token-refresh check (credentials store: ${this.credentials === undefined ? "none" : "handed"})`,
      );
    return this.deps.refreshOAuthTokenIfNeeded(this.credentials, this.storageV5);
  }
  onRefresh(listener) {
    let live = true;
    let unsubscribe = this.refreshed.subscribe(() => swallowAsync(listener));
    if (this.remoteEvalFeatureValues.size > 0)
      queueMicrotask(() => {
        if (live && this.remoteEvalFeatureValues.size > 0) swallowAsync(listener);
      });
    return () => {
      live = false;
      unsubscribe();
    };
  }
  getEnvironmentOverrides() {
    return null;
  }
  hasEnvironmentOverride(key) {
    let environmentOverrides = this.getEnvironmentOverrides();
    return environmentOverrides !== null && readGateOverride(environmentOverrides, key);
  }
  hasOverride(key) {
    if (this.hasEnvironmentOverride(key)) return true;
    let configOverrides = this.readConfigOverrides();
    return configOverrides != null && readGateOverride(configOverrides, key);
  }
  isFeatureFromExperiment(featureKey) {
    if (this.experimentDataByFeature.has(featureKey)) return true;
    if (!this.deps.isEnabled() || RETRY_FLAG_NAMES.has(featureKey)) return false;
    return (this.readSavedFlags().cachedExperimentFeatures ?? []).includes(featureKey);
  }
  readConfigOverrides() {
    return;
  }
  getAllFeatures() {
    if (this.remoteEvalFeatureValues.size > 0) return Object.fromEntries(this.remoteEvalFeatureValues);
    return omitAlias(this.readSavedFlags().cachedGrowthBookFeatures ?? {}, [...RETRY_FLAG_NAMES]);
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
  claimsOfPayloadFetchedWith(authBearer) {
    return this.payloadSender?.authBearer === authBearer ? this.payloadSender.claims : undefined;
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
  setConfigOverride(key, value) {
    return;
  }
  clearConfigOverrides() {
    return;
  }
  recordDeferredExposure(featureKey, flags) {
    let experimentData = flags.cachedExperimentData?.[featureKey];
    if (
      typeof experimentData !== "object" ||
      experimentData === null ||
      typeof experimentData.experimentId !== "string" ||
      typeof experimentData.variationId !== "number" ||
      !import_sortedIndex_2(experimentData.value, flags.cachedGrowthBookFeatures?.[featureKey])
    )
      return;
    this.pendingExposures.set(featureKey, {
      experimentId: experimentData.experimentId,
      variationId: experimentData.variationId,
    });
  }
  logExposureForFeature(featureKey) {
    if (this.loggedExposures.has(featureKey)) return;
    let data = this.experimentDataByFeature.get(featureKey);
    if (data) {
      this.loggedExposures.add(featureKey);
      if (
        !this.deps.logExposure({
          experimentId: data.experimentId,
          variationId: data.variationId,
          userAttributes: this.deps.getUserAttributes(),
          experimentMetadata: {
            feature_id: featureKey,
          },
        })
      )
        this.loggedExposures.delete(featureKey);
    }
  }
  drainPendingExposures() {
    for (let [key, pending] of this.pendingExposures) {
      let current = this.experimentDataByFeature.get(key);
      if (
        current &&
        current.experimentId === pending.experimentId &&
        current.variationId === pending.variationId
      )
        this.logExposureForFeature(key);
    }
    this.pendingExposures.clear();
  }
  async processRemoteEvalPayload(client) {
    let payload = client.getPayload();
    if (!payload?.features || Object.keys(payload.features).length === 0) return false;
    let experiments = new Map();
    let nonDefaultKeys = new Set();
    let features = {};
    let nonObject = [];
    let malformed = [];
    for (let [key, value] of Object.entries(payload.features)) {
      let entry = value;
      if (entry === null || typeof entry !== "object") {
        nonObject.push(`${key}:${entry === null ? "null" : typeof entry}`);
        continue;
      }
      if ("value" in entry && !("defaultValue" in entry))
        features[key] = {
          ...entry,
          defaultValue: entry.value,
        };
      else features[key] = entry;
      if (entry.source === "experiment" && entry.experimentResult) {
        let { experimentResult, experiment } = entry;
        if (typeof experiment?.key === "string" && typeof experimentResult.variationId === "number")
          experiments.set(key, {
            experimentId: experiment.key,
            variationId: experimentResult.variationId,
          });
        else
          malformed.push(
            `${key}:key=${typeof experiment?.key},variationId=${typeof experimentResult.variationId}`,
          );
      }
      if (entry.source !== undefined && entry.source !== "defaultValue" && entry.source !== "unknownFeature")
        nonDefaultKeys.add(key);
    }
    if (nonObject.length > 0 && !this.loggedNonObjectFeatureOnce) {
      this.loggedNonObjectFeatureOnce = true;
      logError(Error(`processRemoteEvalPayload: skipped non-object features [${nonObject.join(", ")}]`));
    }
    if (malformed.length > 0 && !this.loggedMalformedExperimentOnce) {
      this.loggedMalformedExperimentOnce = true;
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `processRemoteEvalPayload: skipped malformed experiment entries [${malformed.join(", ")}]`,
          "processRemoteEvalPayload: skipped malformed experiment entries",
        ),
      );
    }
    let values = new Map();
    let valueless = [];
    for (let [key, value] of Object.entries(features)) {
      let value_2 = "value" in value ? value.value : value.defaultValue;
      if (value_2 !== undefined) values.set(key, value_2);
      else {
        experiments.delete(key);
        nonDefaultKeys.delete(key);
        delete features[key];
        valueless.push(key);
      }
    }
    if (valueless.length > 0 && !this.loggedValuelessPayloadOnce) {
      this.loggedValuelessPayloadOnce = true;
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `processRemoteEvalPayload: skipped value-less entries [${valueless.join(", ")}]`,
          "processRemoteEvalPayload: skipped value-less entries",
        ),
      );
    }
    if (values.size === 0) return false;
    let nextPayload = {
      ...payload,
      features,
    };
    let sender = this.senderByPayload.get(payload);
    this.senderByPayload.set(nextPayload, sender);
    await client.setPayload(nextPayload);
    if (this.client !== client) return false;
    this.experimentDataByFeature.clear();
    for (let [key, data] of experiments) this.experimentDataByFeature.set(key, data);
    this.nonDefaultFeatureKeys.clear();
    for (let key of nonDefaultKeys) this.nonDefaultFeatureKeys.add(key);
    this.remoteEvalFeatureValues.clear();
    for (let [key, value] of values) this.remoteEvalFeatureValues.set(key, value);
    this.payloadSender = sender;
    this.ownSavedFlags = null;
    return true;
  }
  syncRemoteEvalToDisk(force) {
    if (this.clientSlackTagConnected) return;
    if (this.everCreatedWithAuth && !this.clientCreatedWithAuth) return;
    if (this.usedNonDefaultHost) return;
    let payload = this.payloadAsSaved();
    if (
      (force || this.deps.skipsSavingUnchangedFetch?.() === true) &&
      import_sortedIndex_2(pickAlias(this.deps.readGlobalConfig(), Object.keys(payload)), payload)
    )
      return;
    this.deps.saveGlobalConfig(
      (config) => ({
        ...config,
        ...payload,
        cachedGrowthBookFeaturesAt: Date.now(),
      }),
      this.storageV5,
    );
  }
  payloadAsSaved() {
    let cachedGrowthBookFeatures = omitAlias(Object.fromEntries(this.remoteEvalFeatureValues), [
      ...RETRY_FLAG_NAMES,
    ]);
    let experimentData = {};
    for (let [key, data] of this.experimentDataByFeature) {
      if (RETRY_FLAG_NAMES.has(key)) continue;
      experimentData[key] = {
        experimentId: data.experimentId,
        variationId: data.variationId,
        value: this.remoteEvalFeatureValues.get(key),
      };
    }
    return {
      cachedGrowthBookFeatures,
      cachedExperimentFeatures: Object.keys(experimentData).sort(),
      cachedExperimentData: experimentData,
    };
  }
  async fetchRemoteEval(request) {
    if (this.disposed) return this.deps.fetchRemoteEvalFromSdk(request);
    let { response, sender } = await this.requestRemoteEval(request);
    if (response?.ok) {
      this.remoteEvalFetchOkCount++;
      let body = response.json();
      response.json = () => body;
      let body_2 = await body.catch(() => {
        return;
      });
      if (typeof body_2 === "object" && body_2 !== null) this.senderByPayload.set(body_2, sender);
    }
    return response;
  }
  async sendStock(request) {
    return {
      response: await this.deps.fetchRemoteEvalFromSdk(request),
      sender: {
        authBearer: request.headers?.Authorization,
        claims: emptyAccountIdentity(request),
      },
    };
  }
  async requestRemoteEval(options) {
    let { host, clientKey, payload, headers } = options;
    let nextRemoteEvalAnswerer = this.nextRemoteEvalAnswerer;
    this.nextRemoteEvalAnswerer = undefined;
    if (!this.getFeatureValueWithSource("tengu_gb_eval_authed_enable", false).value) {
      if (!nextRemoteEvalAnswerer) return this.sendStock(options);
      let response;
      let answerer = await nextRemoteEvalAnswerer(options, async () => {
        response = await this.sendStock(options);
        return response.response;
      });
      return response !== undefined && answerer === response.response
        ? response
        : {
            response: answerer,
            sender: undefined,
          };
    }
    let headers_2 = {};
    if (this.deps.hasWorkspaceTrust()) {
      try {
        await this.refreshOAuthToken();
      } catch {}
      try {
        let authHeaders = await this.deps.getAuthHeaders();
        if (!authHeaders.error) headers_2 = authHeaders.headers;
      } catch {}
    }
    try {
      let response = await getPolyfills().fetch(`${host}/api/eval-authed/${clientKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
          ...headers_2,
        },
        body: JSON.stringify(payload),
        redirect: "error",
      });
      if (!response.ok) {
        logError(Error("GrowthBook eval-authed returned non-ok; falling back to /api/eval"));
        return this.sendStock(options);
      }
      return {
        response,
        sender: {
          authBearer: headers_2.Authorization ?? headers?.Authorization,
          claims: emptyAccountIdentity(options),
        },
      };
    } catch {
      logError(Error("GrowthBook eval-authed fetch threw; falling back to /api/eval"));
      return this.sendStock(options);
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
    let result = {
      headers: {},
      error: "trust not established",
    };
    let authLost = false;
    if (this.deps.hasWorkspaceTrust()) {
      try {
        await withTimeout(this.refreshOAuthToken(), PRE_INIT_FALLBACK_TIMEOUT_MS, PRE_INIT_OAUTH_REASON);
      } catch (error) {
        let error_2 = toError(error);
        let errorKind = error_2.message === PRE_INIT_OAUTH_REASON ? "timeout" : error_2.name;
        logForDebugging(`GrowthBook: pre-init OAuth refresh failed (${errorKind})`);
      }
      try {
        result = await this.deps.getAuthHeaders();
      } catch (error) {
        logForDebugging(
          `GrowthBook: auth header resolution failed (${toError(error).name}), continuing without auth`,
        );
        result = {
          headers: {},
          error: "auth resolution failed",
        };
        authLost = true;
      }
    }
    if (this.disposed || generation !== this.generation) return null;
    let identity = {
      ...this.deps.getUserAttributes(),
      ...(this.deps.sdkCachePartition !== undefined && {
        sdkCachePartition: this.deps.sdkCachePartition,
      }),
    };
    let clientKey = getGrowthBookClientKey();
    let bearerMarker = envBearerFallbackMarker(this.deps.profileFlagHost?.());
    this.usedNonDefaultHost ||= bearerMarker !== DEFAULT_GROWTHBOOK_HOST;
    let hasIdentity = !result.error;
    this.clientCreatedWithAuth = hasIdentity;
    this.everCreatedWithAuth ||= hasIdentity;
    if (hasIdentity) this.authLostMidSession = false;
    this.clientAuthResolutionTransientlyFailed =
      !hasIdentity && (authLost || result.reasonCode === "wif_error" || this.authLostMidSession);
    this.clientAuthBearer = hasIdentity ? result.headers.Authorization : undefined;
    this.clientAccountUuid = identity.accountUUID;
    this.clientOrganizationUuid = identity.organizationUUID;
    this.clientSlackTagConnected = identity.slackTagConnected === true;
    helpers.fetchRemoteEvalCall = this.routeSdkRemoteEvalHere;
    let client = new GrowthBook({
      apiHost: bearerMarker,
      clientKey,
      attributes: identity,
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
        ...(hasIdentity && result.headers),
      },
      ...false,
    });
    this.client = client;
    if (!hasIdentity)
      return {
        client,
        initialized: Promise.resolve(),
      };
    let initialized = client
      .init({
        timeout: this.deps.sdkInitTimeoutMs ?? 5000,
        ...(this.deps.sdkCachePartition !== undefined && {
          skipCache: true,
        }),
      })
      .then(async (created) => {
        if (this.client !== client) return;
        let applied = await this.processRemoteEvalPayload(client);
        if (this.client !== client) return;
        if (applied) {
          this.drainPendingExposures();
          this.syncRemoteEvalToDisk(created.source === "cache");
          this.refreshed.emit();
        }
      })
      .catch((error) => {});
    this.currentBeforeExitHandler = () => this.client?.destroy();
    this.currentExitHandler = () => this.client?.destroy();
    process.on("beforeExit", this.currentBeforeExitHandler);
    process.on("exit", this.currentExitHandler);
    return {
      client,
      initialized,
    };
  }
  initialize() {
    let heldWhileFetchHeld = this.initializePromise === null && this.deps.isFetchHeld();
    if (this.disposed || heldWhileFetchHeld) return Promise.resolve(null);
    if (this.initializePromise === null) {
      let promise = this.initializeClient();
      this.initializePromise = promise;
      this.initializeInFlight = true;
      let settle = () => {
        if (this.initializePromise === promise) {
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
      promise.then(settle, settle);
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
  async getFeatureValueBlocking(featureKey, fallback) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && featureKey in environmentOverrides) return environmentOverrides[featureKey];
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && featureKey in configOverrides) return configOverrides[featureKey];
    if (!this.deps.isEnabled()) return fallback;
    let client = await this.initialize();
    if (!client) return fallback;
    let value;
    let remoteValue = this.remoteEvalFeatureValues.get(featureKey);
    if (remoteValue !== undefined) value = valueOrFallback(remoteValue, fallback);
    else value = client.getFeatureValue(featureKey, fallback);
    this.logExposureForFeature(featureKey);
    return value;
  }
  getFeatureValueWithSource(featureKey, fallback) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && readGateOverride(environmentOverrides, featureKey))
      return {
        value: environmentOverrides[featureKey],
        source: "override",
      };
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && readGateOverride(configOverrides, featureKey))
      return {
        value: configOverrides[featureKey],
        source: "override",
      };
    if (!this.deps.isEnabled() && !this.deps.isDiskCacheReadableWhileDisabled())
      return {
        value: fallback,
        source: "disabled",
      };
    if (this.experimentDataByFeature.has(featureKey)) this.logExposureForFeature(featureKey);
    let payloadValue = this.remoteEvalFeatureValues.get(featureKey);
    if (payloadValue !== undefined)
      return {
        value: valueOrFallback(payloadValue, fallback),
        source: "payload",
      };
    if (this.remoteEvalFeatureValues.size > 0)
      return {
        value: fallback,
        source: "fallback",
      };
    if (RETRY_FLAG_NAMES.has(featureKey))
      return {
        value: fallback,
        source: "fallback",
      };
    try {
      let savedFlags = this.readSavedFlags();
      let diskValue = savedFlags.cachedGrowthBookFeatures?.[featureKey];
      if (diskValue !== undefined) {
        this.recordDeferredExposure(featureKey, savedFlags);
        return {
          value: valueOrFallback(diskValue, fallback),
          source: "disk",
        };
      }
    } catch {}
    return {
      value: fallback,
      source: "fallback",
    };
  }
  async checkGateCachedOrBlocking(featureKey) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && featureKey in environmentOverrides)
      return Boolean(environmentOverrides[featureKey]);
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && featureKey in configOverrides) return Boolean(configOverrides[featureKey]);
    if (!this.deps.isEnabled()) return false;
    if (this.remoteEvalFeatureValues.get(featureKey) === true) {
      this.logExposureForFeature(featureKey);
      return true;
    }
    if (!RETRY_FLAG_NAMES.has(featureKey)) {
      let flags =
        this.ownSavedFlags?.flags.cachedGrowthBookFeatures?.[featureKey] === true
          ? this.ownSavedFlags.flags
          : this.deps.readGlobalConfig();
      if (flags.cachedGrowthBookFeatures?.[featureKey] === true) {
        this.recordDeferredExposure(featureKey, flags);
        return true;
      }
    }
    return this.getFeatureValueBlocking(featureKey, false);
  }
  refreshAfterAuthChange(options) {
    if (this.disposed || !this.deps.isEnabled()) return;
    try {
      let ownSavedFlags = null;
      if (options?.keepsOwnSavedFlags === true && !this.deps.isFetchHeld())
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
        preserveLoggedExposures: options?.preserveLoggedExposures,
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
  reset(options) {
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
    if (!options?.preserveLoggedExposures) {
      this.loggedNonObjectFeatureOnce = false;
      this.loggedMalformedExperimentOnce = false;
      this.loggedValuelessPayloadOnce = false;
    }
    this.experimentDataByFeature.clear();
    this.nonDefaultFeatureKeys.clear();
    if (!options?.preservePendingExposures) this.pendingExposures.clear();
    if (!options?.preserveLoggedExposures) this.loggedExposures.clear();
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
          let attributes = this.deps.rereadUserAttributes();
          let sameIdentity =
            attributes.accountUUID === this.clientAccountUuid &&
            attributes.organizationUUID === this.clientOrganizationUuid;
          this.refreshAfterAuthChange({
            preserveLoggedExposures: sameIdentity,
            keepsOwnSavedFlags: sameIdentity && attributes.accountUUID !== undefined,
          });
          return;
        }
      } else if (this.clientAuthResolutionTransientlyFailed) {
        let headers = await this.deps.getAuthHeaders().catch(() => null);
        if (
          headers &&
          !headers.error &&
          (headers.headers.Authorization ||
            (this.authLostMidSession && Object.keys(headers.headers).length > 0))
        ) {
          this.refreshAfterAuthChange();
          return;
        }
      }
      let client = await this.initialize();
      if (!client) return;
      let atisPin = this.deps.getUserAttributes().atisPin;
      let pinChanged = false;
      if (atisPin !== client.getAttributes().atisPin) {
        let remoteEvalFetchOkCount = this.remoteEvalFetchOkCount;
        await client.updateAttributes({
          atisPin,
        });
        pinChanged = this.remoteEvalFetchOkCount !== remoteEvalFetchOkCount;
      }
      if (!pinChanged)
        await client.refreshFeatures({
          skipCache: true,
        });
      if (client !== this.client) return;
      let applied = await this.processRemoteEvalPayload(client);
      if (client !== this.client) return;
      if (applied) {
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
  async periodicRefreshLoop(signal) {
    while (!signal.aborted && !this.disposed)
      try {
        let { intervalMs, flagged } = this.deps.getRefreshCadence();
        await this.deps.sleep(intervalMs, signal, {
          unref: true,
        });
        if (signal.aborted) return;
        let remoteEvalFetchOkCount = this.remoteEvalFetchOkCount;
        await this.refreshFeatures();
        if (flagged && this.remoteEvalFetchOkCount === remoteEvalFetchOkCount && !signal.aborted) {
          await this.deps.sleep(Math.round(Math.random() * PRE_INIT_KEY_HELPER_TIMEOUT_MS), signal, {
            unref: true,
          });
          if (signal.aborted) return;
          await this.refreshFeatures();
        }
      } catch (error) {
        logError(toError(error));
        await this.deps.sleep(PRE_INIT_OAUTH_TIMEOUT_MS, signal, {
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
function valueOrFallback(value, fallback) {
  return value === null ? fallback : value;
}
//@ chunk-aepeg2w5.js:648641-648715 placement
function swallowAsync(promise) {
  try {
    Promise.resolve(promise()).catch((error) => {
      logError(error);
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:648715-648776 placement
function readGateOverride(overrides, key) {
  let isHooksGate = key === PLUGIN_HOOKS_MODULES_GATE;
  return key in overrides && (!isHooksGate || overrides[key] === true);
}
//@ chunk-aepeg2w5.js:648776-648865 placement
function stripCredentialFields(payload) {
  let filtered = Object.keys(payload).filter((key) => TENGU_FLAG_SET.has(key));
  return filtered.length === 0 ? payload : omitAlias(payload, filtered);
}
//@ chunk-aepeg2w5.js:648865-648898 placement
var nodeModuleA; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var nodeModuleB;
deferInit("chunk-aepeg2w5.js:648865", () => {
  nodeModuleA = __toESM(require_core(), 1);
  nodeModuleB = __toESM(require_resources(), 1);
});
//@ chunk-aepeg2w5.js:648898-648914 placement
var growthbookSdkModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:648898", () => {
  growthbookSdkModule = __toESM(require_api());
});
//@ chunk-aepeg2w5.js:648914-648933 placement
class NoopEmitter {
  emit(event) {}
}
//@ chunk-aepeg2w5.js:648933-648947 placement
var noopEmitter; // deferred: uses NoopEmitter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:648933", () => {
  noopEmitter = new NoopEmitter();
});
export {
  postGrowthBookEval,
  GrowthBookClientHolder,
  NoopEmitter,
  noopEmitter,
  growthbookSdkModule,
  nodeModuleA,
  nodeModuleB,
};
