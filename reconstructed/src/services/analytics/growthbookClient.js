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
import { xn, Nt, Js } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { Dr, zE } from "../api/withRetry.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { En, wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../../utils/errors.js";
import { ZC, WW, eR, FRn, getGrowthBookClient_2, $W, GW, PLUGIN_HOOKS_MODULES_GATE } from "./growthbook.js";
import { withTimeout } from "../../utils/sleep.js";
import { getGrowthBookClientKey } from "../../constants/keys.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { Qm } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { ZPt } from "../../../vendor/@opentelemetry/resources/build/src/index.js";
import { Ol } from "../../../vendor/@opentelemetry/api/build/src/index.js";

/**
 * 向 GrowthBook /api/eval/<clientKey> POST 评估请求。
 */
//@ chunk-aepeg2w5.js:630358-630526 placement
var postGrowthBookEval = (e) =>
  xn().fetch(`${e.host}/api/eval/${e.clientKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...e.headers },
    body: jsonStringify(e.payload),
    redirect: "error",
  });
/**
 * GrowthBook 客户端持有者：创建/重建客户端、处理鉴权变化、日志去重、退出处理。
 */
//@ chunk-aepeg2w5.js:630526-648604 placement
class GrowthBookClientHolder {
  deps;
  client = null;
  loggedNonObjectFeatureOnce = !1;
  loggedMalformedExperimentOnce = !1;
  loggedValuelessPayloadOnce = !1;
  currentBeforeExitHandler = null;
  currentExitHandler = null;
  clientCreatedWithAuth = !1;
  clientAuthResolutionTransientlyFailed = !1;
  everCreatedWithAuth = !1;
  clientAuthBearer = void 0;
  authLostMidSession = !1;
  clientAccountUuid = void 0;
  clientOrganizationUuid = void 0;
  clientSlackTagConnected = !1;
  usedNonDefaultHost = !1;
  generation = 0;
  experimentDataByFeature = new Map();
  nonDefaultFeatureKeys = new Set();
  remoteEvalFeatureValues = new Map();
  remoteEvalFetchOkCount = 0;
  senderByPayload = new WeakMap();
  payloadSender = void 0;
  ownSavedFlags = null;
  pendingExposures = new Map();
  loggedExposures = new Set();
  refreshed = createSignal();
  environmentOverrides = null;
  environmentOverridesRaw = void 0;
  stagingOauthAtConstruction = !1;
  clientPromise = null;
  initializePromise = null;
  initializeInFlight = !1;
  refreshLoopController = null;
  refreshLoopBeforeExitListener = null;
  processExitListenerInstalled = !1;
  processExited = !1;
  atisPinRefreshChain = Promise.resolve();
  routeSdkRemoteEvalHere = (e) => this.fetchRemoteEval(e);
  disposed = !1;
  credentials;
  storageV5;
  nextRemoteEvalAnswerer;
  constructor(e) {
    this.deps = e;
  }
  onProcessExit = () => {
    ((this.processExited = !0), this.stopPeriodicRefresh());
  };
  answerNextRemoteEvalWith(e) {
    this.nextRemoteEvalAnswerer = e;
  }
  setCredentials(e) {
    if (this.credentials !== void 0 && this.credentials !== e) {
      logForDebugging("GrowthBook: a credentials store was already handed in; the later one is ignored");
      return;
    }
    this.credentials = e;
  }
  setStorageBackend(e) {
    if (this.storageV5 !== void 0 && this.storageV5 !== e) {
      logForDebugging("GrowthBook: a storage backend was already handed in; the later one is ignored");
      return;
    }
    this.storageV5 = e;
  }
  refreshOAuthToken() {
    if (isStorageV5Enabled())
      logForDebugging(
        `GrowthBook: token-refresh check (credentials store: ${this.credentials === void 0 ? "none" : "handed"})`,
      );
    return this.deps.refreshOAuthTokenIfNeeded(this.credentials, this.storageV5);
  }
  onRefresh(e) {
    let n = !0,
      subscribe = this.refreshed.subscribe(() => tR(e));
    if (this.remoteEvalFeatureValues.size > 0)
      queueMicrotask(() => {
        if (n && this.remoteEvalFeatureValues.size > 0) tR(e);
      });
    return () => {
      ((n = !1), subscribe());
    };
  }
  getEnvironmentOverrides() {
    return null;
  }
  hasEnvironmentOverride(e) {
    let environmentOverrides = this.getEnvironmentOverrides();
    return environmentOverrides !== null && Cl(environmentOverrides, e);
  }
  hasOverride(e) {
    if (this.hasEnvironmentOverride(e)) return !0;
    let configOverrides = this.readConfigOverrides();
    return configOverrides != null && Cl(configOverrides, e);
  }
  isFeatureFromExperiment(e) {
    if (this.experimentDataByFeature.has(e)) return !0;
    if (!this.deps.isEnabled() || Dr.has(e)) return !1;
    return (this.readSavedFlags().cachedExperimentFeatures ?? []).includes(e);
  }
  readConfigOverrides() {
    return;
  }
  getAllFeatures() {
    if (this.remoteEvalFeatureValues.size > 0) return Object.fromEntries(this.remoteEvalFeatureValues);
    return Uo(this.readSavedFlags().cachedGrowthBookFeatures ?? {}, [...Dr]);
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
    return this.payloadSender?.authBearer === e ? this.payloadSender.claims : void 0;
  }
  builtForIdentity() {
    return { accountUuid: this.clientAccountUuid, organizationUuid: this.clientOrganizationUuid };
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
    this.pendingExposures.set(e, { experimentId: r.experimentId, variationId: r.variationId });
  }
  logExposureForFeature(e) {
    if (this.loggedExposures.has(e)) return;
    let n = this.experimentDataByFeature.get(e);
    if (n) {
      if (
        (this.loggedExposures.add(e),
        !this.deps.logExposure({
          experimentId: n.experimentId,
          variationId: n.variationId,
          userAttributes: this.deps.getUserAttributes(),
          experimentMetadata: { feature_id: e },
        }))
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
    if (!payload?.features || Object.keys(payload.features).length === 0) return !1;
    let r = new Map(),
      s = new Set(),
      h = {},
      y = [],
      S = [];
    for (let [F, L] of Object.entries(payload.features)) {
      let G = L;
      if (G === null || typeof G !== "object") {
        y.push(`${F}:${G === null ? "null" : typeof G}`);
        continue;
      }
      if ("value" in G && !("defaultValue" in G)) h[F] = { ...G, defaultValue: G.value };
      else h[F] = G;
      if (G.source === "experiment" && G.experimentResult) {
        let { experimentResult: experimentResult, experiment: experiment } = G;
        if (typeof experiment?.key === "string" && typeof experimentResult.variationId === "number")
          r.set(F, { experimentId: experiment.key, variationId: experimentResult.variationId });
        else S.push(`${F}:key=${typeof experiment?.key},variationId=${typeof experimentResult.variationId}`);
      }
      if (G.source !== void 0 && G.source !== "defaultValue" && G.source !== "unknownFeature") s.add(F);
    }
    if (y.length > 0 && !this.loggedNonObjectFeatureOnce)
      ((this.loggedNonObjectFeatureOnce = !0),
        logError(Error(`processRemoteEvalPayload: skipped non-object features [${y.join(", ")}]`)));
    if (S.length > 0 && !this.loggedMalformedExperimentOnce)
      ((this.loggedMalformedExperimentOnce = !0),
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `processRemoteEvalPayload: skipped malformed experiment entries [${S.join(", ")}]`,
            "processRemoteEvalPayload: skipped malformed experiment entries",
          ),
        ));
    let w = new Map(),
      R = [];
    for (let [F, L] of Object.entries(h)) {
      let G = "value" in L ? L.value : L.defaultValue;
      if (G !== void 0) w.set(F, G);
      else (r.delete(F), s.delete(F), delete h[F], R.push(F));
    }
    if (R.length > 0 && !this.loggedValuelessPayloadOnce)
      ((this.loggedValuelessPayloadOnce = !0),
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `processRemoteEvalPayload: skipped value-less entries [${R.join(", ")}]`,
            "processRemoteEvalPayload: skipped value-less entries",
          ),
        ));
    if (w.size === 0) return !1;
    let x = { ...payload, features: h },
      P = this.senderByPayload.get(payload);
    if ((this.senderByPayload.set(x, P), await e.setPayload(x), this.client !== e)) return !1;
    this.experimentDataByFeature.clear();
    for (let [F, L] of r) this.experimentDataByFeature.set(F, L);
    this.nonDefaultFeatureKeys.clear();
    for (let F of s) this.nonDefaultFeatureKeys.add(F);
    this.remoteEvalFeatureValues.clear();
    for (let [F, L] of w) this.remoteEvalFeatureValues.set(F, L);
    return ((this.payloadSender = P), (this.ownSavedFlags = null), !0);
  }
  syncRemoteEvalToDisk(e) {
    if (this.clientSlackTagConnected) return;
    if (this.everCreatedWithAuth && !this.clientCreatedWithAuth) return;
    if (this.usedNonDefaultHost) return;
    let payloadAsSaved = this.payloadAsSaved();
    if (
      (e || this.deps.skipsSavingUnchangedFetch?.() === !0) &&
      En(wS(this.deps.readGlobalConfig(), Object.keys(payloadAsSaved)), payloadAsSaved)
    )
      return;
    this.deps.saveGlobalConfig(
      (r) => ({ ...r, ...payloadAsSaved, cachedGrowthBookFeaturesAt: Date.now() }),
      this.storageV5,
    );
  }
  payloadAsSaved() {
    let e = Uo(Object.fromEntries(this.remoteEvalFeatureValues), [...Dr]),
      n = {};
    for (let [r, s] of this.experimentDataByFeature) {
      if (Dr.has(r)) continue;
      n[r] = {
        experimentId: s.experimentId,
        variationId: s.variationId,
        value: this.remoteEvalFeatureValues.get(r),
      };
    }
    return {
      cachedGrowthBookFeatures: e,
      cachedExperimentFeatures: Object.keys(n).sort(),
      cachedExperimentData: n,
    };
  }
  async fetchRemoteEval(e) {
    if (this.disposed) return this.deps.fetchRemoteEvalFromSdk(e);
    let { response: response, sender: sender } = await this.requestRemoteEval(e);
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
      sender: { authBearer: e.headers?.Authorization, claims: ZC(e) },
    };
  }
  async requestRemoteEval(e) {
    let { host: host, clientKey: clientKey, payload: payload, headers: headers } = e,
      nextRemoteEvalAnswerer = this.nextRemoteEvalAnswerer;
    if (
      ((this.nextRemoteEvalAnswerer = void 0),
      !this.getFeatureValueWithSource("tengu_gb_eval_authed_enable", !1).value)
    ) {
      if (!nextRemoteEvalAnswerer) return this.sendStock(e);
      let w,
        R = await nextRemoteEvalAnswerer(e, async () => ((w = await this.sendStock(e)), w.response));
      return w !== void 0 && R === w.response ? w : { response: R, sender: void 0 };
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
      let response = await xn().fetch(`${host}/api/eval-authed/${clientKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers, ...S },
        body: JSON.stringify(payload),
        redirect: "error",
      });
      if (!response.ok)
        return (
          logError(Error("GrowthBook eval-authed returned non-ok; falling back to /api/eval")),
          this.sendStock(e)
        );
      return {
        response: response,
        sender: { authBearer: S.Authorization ?? headers?.Authorization, claims: ZC(e) },
      };
    } catch {
      return (
        logError(Error("GrowthBook eval-authed fetch threw; falling back to /api/eval")),
        this.sendStock(e)
      );
    }
  }
  getClient() {
    if (this.clientPromise === null) this.clientPromise = this.createClient();
    return this.clientPromise;
  }
  async createClient() {
    if (this.disposed || !this.deps.isEnabled()) return null;
    if (!this.processExitListenerInstalled)
      ((this.processExitListenerInstalled = !0), process.once("exit", this.onProcessExit));
    let generation = this.generation,
      n = { headers: {}, error: "trust not established" },
      r = !1;
    if (this.deps.hasWorkspaceTrust()) {
      try {
        await withTimeout(this.refreshOAuthToken(), WW, eR);
      } catch (error) {
        let P = toError(error),
          F = P.message === eR ? "timeout" : P.name;
        logForDebugging(`GrowthBook: pre-init OAuth refresh failed (${F})`);
      }
      try {
        n = await this.deps.getAuthHeaders();
      } catch (error) {
        (logForDebugging(
          `GrowthBook: auth header resolution failed (${toError(error).name}), continuing without auth`,
        ),
          (n = { headers: {}, error: "auth resolution failed" }),
          (r = !0));
      }
    }
    if (this.disposed || generation !== this.generation) return null;
    let s = {
        ...this.deps.getUserAttributes(),
        ...(this.deps.sdkCachePartition !== void 0 && { sdkCachePartition: this.deps.sdkCachePartition }),
      },
      h = getGrowthBookClientKey(),
      y = FRn(this.deps.profileFlagHost?.());
    this.usedNonDefaultHost ||= y !== getGrowthBookClient_2;
    let S = !n.error;
    if (((this.clientCreatedWithAuth = S), (this.everCreatedWithAuth ||= S), S)) this.authLostMidSession = !1;
    ((this.clientAuthResolutionTransientlyFailed =
      !S && (r || n.reasonCode === "wif_error" || this.authLostMidSession)),
      (this.clientAuthBearer = S ? n.headers.Authorization : void 0),
      (this.clientAccountUuid = s.accountUUID),
      (this.clientOrganizationUuid = s.organizationUUID),
      (this.clientSlackTagConnected = s.slackTagConnected === !0),
      (Nt.fetchRemoteEvalCall = this.routeSdkRemoteEvalHere));
    let w = new Js({
      apiHost: y,
      clientKey: h,
      attributes: s,
      remoteEval: !0,
      cacheKeyAttributes: [
        "id",
        "organizationUUID",
        "slackTagConnected",
        "atisPin",
        "ccrDerivedSurface",
        "sdkCachePartition",
      ],
      apiHostRequestHeaders: { "User-Agent": claudeCodeUserAgent(), ...(S && n.headers) },
      ...!1,
    });
    if (((this.client = w), !S)) return { client: w, initialized: Promise.resolve() };
    let R = w
      .init({
        timeout: this.deps.sdkInitTimeoutMs ?? 5000,
        ...(this.deps.sdkCachePartition !== void 0 && { skipCache: !0 }),
      })
      .then(async (x) => {
        if (this.client !== w) return;
        let processRemoteEvalPayload = await this.processRemoteEvalPayload(w);
        if (this.client !== w) return;
        if (processRemoteEvalPayload)
          (this.drainPendingExposures(),
            this.syncRemoteEvalToDisk(x.source === "cache"),
            this.refreshed.emit());
      })
      .catch((x) => {});
    return (
      (this.currentBeforeExitHandler = () => this.client?.destroy()),
      (this.currentExitHandler = () => this.client?.destroy()),
      process.on("beforeExit", this.currentBeforeExitHandler),
      process.on("exit", this.currentExitHandler),
      { client: w, initialized: R }
    );
  }
  initialize() {
    let e = this.initializePromise === null && this.deps.isFetchHeld();
    if (this.disposed || e) return Promise.resolve(null);
    if (this.initializePromise === null) {
      let initializeClient = this.initializeClient();
      ((this.initializePromise = initializeClient), (this.initializeInFlight = !0));
      let r = () => {
        if (this.initializePromise === initializeClient) {
          if (
            ((this.initializeInFlight = !1),
            this.ownSavedFlags !== null &&
              (!this.clientCreatedWithAuth ||
                this.clientAccountUuid !== this.ownSavedFlags.accountUuid ||
                this.clientOrganizationUuid !== this.ownSavedFlags.organizationUuid))
          )
            ((this.ownSavedFlags = null), this.refreshed.emit());
        }
      };
      initializeClient.then(r, r);
    }
    return this.initializePromise;
  }
  async initializeClient() {
    let client = await this.getClient();
    if (!client) return null;
    if ((await client.initialized, this.disposed)) return null;
    return (this.startPeriodicRefresh(), client.client);
  }
  async getFeatureValueBlocking(e, n) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && e in environmentOverrides) return environmentOverrides[e];
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && e in configOverrides) return configOverrides[e];
    if (!this.deps.isEnabled()) return n;
    let initialize = await this.initialize();
    if (!initialize) return n;
    let y,
      S = this.remoteEvalFeatureValues.get(e);
    if (S !== void 0) y = Ym(S, n);
    else y = initialize.getFeatureValue(e, n);
    return (this.logExposureForFeature(e), y);
  }
  getFeatureValueWithSource(e, n) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && Cl(environmentOverrides, e))
      return { value: environmentOverrides[e], source: "override" };
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && Cl(configOverrides, e)) return { value: configOverrides[e], source: "override" };
    if (!this.deps.isEnabled() && !this.deps.isDiskCacheReadableWhileDisabled())
      return { value: n, source: "disabled" };
    if (this.experimentDataByFeature.has(e)) this.logExposureForFeature(e);
    let h = this.remoteEvalFeatureValues.get(e);
    if (h !== void 0) return { value: Ym(h, n), source: "payload" };
    if (this.remoteEvalFeatureValues.size > 0) return { value: n, source: "fallback" };
    if (Dr.has(e)) return { value: n, source: "fallback" };
    try {
      let savedFlags = this.readSavedFlags(),
        S = savedFlags.cachedGrowthBookFeatures?.[e];
      if (S !== void 0)
        return (this.recordDeferredExposure(e, savedFlags), { value: Ym(S, n), source: "disk" });
    } catch {}
    return { value: n, source: "fallback" };
  }
  async checkGateCachedOrBlocking(e) {
    let environmentOverrides = this.getEnvironmentOverrides();
    if (environmentOverrides && e in environmentOverrides) return Boolean(environmentOverrides[e]);
    let configOverrides = this.readConfigOverrides();
    if (configOverrides && e in configOverrides) return Boolean(configOverrides[e]);
    if (!this.deps.isEnabled()) return !1;
    if (this.remoteEvalFeatureValues.get(e) === !0) return (this.logExposureForFeature(e), !0);
    if (!Dr.has(e)) {
      let s =
        this.ownSavedFlags?.flags.cachedGrowthBookFeatures?.[e] === !0
          ? this.ownSavedFlags.flags
          : this.deps.readGlobalConfig();
      if (s.cachedGrowthBookFeatures?.[e] === !0) return (this.recordDeferredExposure(e, s), !0);
    }
    return this.getFeatureValueBlocking(e, !1);
  }
  refreshAfterAuthChange(e) {
    if (this.disposed || !this.deps.isEnabled()) return;
    try {
      let n = null;
      if (e?.keepsOwnSavedFlags === !0 && !this.deps.isFetchHeld())
        n =
          this.remoteEvalFeatureValues.size > 0
            ? {
                flags: this.payloadAsSaved(),
                accountUuid: this.clientAccountUuid,
                organizationUuid: this.clientOrganizationUuid,
              }
            : this.ownSavedFlags;
      (this.reset({ preservePendingExposures: !0, preserveLoggedExposures: e?.preserveLoggedExposures }),
        (this.ownSavedFlags = n),
        this.refreshed.emit(),
        this.initialize().catch((r) => {
          logError(toError(r));
        }));
    } catch (error) {
      logError(toError(error));
    }
  }
  reset(e) {
    if ((this.stopPeriodicRefresh(), this.currentBeforeExitHandler))
      (process.off("beforeExit", this.currentBeforeExitHandler), (this.currentBeforeExitHandler = null));
    if (this.currentExitHandler)
      (process.off("exit", this.currentExitHandler), (this.currentExitHandler = null));
    if (
      (this.client?.destroy(),
      (this.client = null),
      this.generation++,
      (this.nextRemoteEvalAnswerer = void 0),
      (this.clientCreatedWithAuth = !1),
      (this.clientAuthResolutionTransientlyFailed = !1),
      (this.clientAuthBearer = void 0),
      (this.clientAccountUuid = void 0),
      (this.clientOrganizationUuid = void 0),
      (this.clientSlackTagConnected = !1),
      !e?.preserveLoggedExposures)
    )
      ((this.loggedNonObjectFeatureOnce = !1),
        (this.loggedMalformedExperimentOnce = !1),
        (this.loggedValuelessPayloadOnce = !1));
    if (
      (this.experimentDataByFeature.clear(), this.nonDefaultFeatureKeys.clear(), !e?.preservePendingExposures)
    )
      this.pendingExposures.clear();
    if (!e?.preserveLoggedExposures) this.loggedExposures.clear();
    (this.remoteEvalFeatureValues.clear(),
      (this.payloadSender = void 0),
      (this.ownSavedFlags = null),
      (this.senderByPayload = new WeakMap()),
      (this.clientPromise = null),
      (this.initializePromise = null),
      (this.initializeInFlight = !1),
      (this.environmentOverrides = null),
      (this.environmentOverridesRaw = void 0));
  }
  dispose() {
    if (
      ((this.disposed = !0),
      (this.authLostMidSession = !1),
      process.removeListener("exit", this.onProcessExit),
      this.reset(),
      Nt.fetchRemoteEvalCall === this.routeSdkRemoteEvalHere)
    )
      Nt.fetchRemoteEvalCall = this.deps.fetchRemoteEvalFromSdk;
  }
  reclaimRemoteEvalHook() {
    if (this.disposed || this.client === null) return !1;
    return ((Nt.fetchRemoteEvalCall = this.routeSdkRemoteEvalHere), !0);
  }
  async refreshFeatures() {
    if (this.disposed || !this.deps.isEnabled()) return;
    try {
      if (this.clientCreatedWithAuth) {
        await this.refreshOAuthToken().catch((S) => {});
        let authHeaders = await this.deps.getAuthHeaders();
        if (this.disposed) return;
        if (authHeaders.error) {
          ((this.authLostMidSession = !0), this.refreshAfterAuthChange());
          return;
        }
        let Authorization = authHeaders.headers.Authorization;
        if (
          this.clientCreatedWithAuth &&
          Authorization !== void 0 &&
          Authorization !== this.clientAuthBearer
        ) {
          let rereadUserAttributes = this.deps.rereadUserAttributes(),
            w =
              rereadUserAttributes.accountUUID === this.clientAccountUuid &&
              rereadUserAttributes.organizationUUID === this.clientOrganizationUuid;
          this.refreshAfterAuthChange({
            preserveLoggedExposures: w,
            keepsOwnSavedFlags: w && rereadUserAttributes.accountUUID !== void 0,
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
      let initialize = await this.initialize();
      if (!initialize) return;
      let atisPin = this.deps.getUserAttributes().atisPin,
        r = !1;
      if (atisPin !== initialize.getAttributes().atisPin) {
        let remoteEvalFetchOkCount = this.remoteEvalFetchOkCount;
        (await initialize.updateAttributes({ atisPin: atisPin }),
          (r = this.remoteEvalFetchOkCount !== remoteEvalFetchOkCount));
      }
      if (!r) await initialize.refreshFeatures({ skipCache: !0 });
      if (initialize !== this.client) return;
      let processRemoteEvalPayload = await this.processRemoteEvalPayload(initialize);
      if (initialize !== this.client) return;
      if (processRemoteEvalPayload)
        (this.drainPendingExposures(), this.syncRemoteEvalToDisk(!1), this.refreshed.emit());
    } catch (error) {
      logError(toError(error));
    }
  }
  refreshAtisPin() {
    return (
      (this.atisPinRefreshChain = this.atisPinRefreshChain
        .then(() => {
          if (
            this.client !== null &&
            this.deps.getUserAttributes().atisPin !== this.client.getAttributes().atisPin
          )
            return this.refreshFeatures();
        })
        .catch((e) => logError(toError(e)))),
      this.atisPinRefreshChain
    );
  }
  startPeriodicRefresh() {
    if (this.disposed || this.processExited || !this.deps.isEnabled()) return;
    this.stopPeriodicRefresh();
    let abortController = new AbortController();
    ((this.refreshLoopController = abortController),
      this.periodicRefreshLoop(abortController.signal),
      (this.refreshLoopBeforeExitListener = () => {
        this.stopPeriodicRefresh();
      }),
      process.once("beforeExit", this.refreshLoopBeforeExitListener));
  }
  async periodicRefreshLoop(e) {
    while (!e.aborted && !this.disposed)
      try {
        let { intervalMs: intervalMs, flagged: flagged } = this.deps.getRefreshCadence();
        if ((await this.deps.sleep(intervalMs, e, { unref: !0 }), e.aborted)) return;
        let remoteEvalFetchOkCount = this.remoteEvalFetchOkCount;
        if (
          (await this.refreshFeatures(),
          flagged && this.remoteEvalFetchOkCount === remoteEvalFetchOkCount && !e.aborted)
        ) {
          if ((await this.deps.sleep(Math.round(Math.random() * $W), e, { unref: !0 }), e.aborted)) return;
          await this.refreshFeatures();
        }
      } catch (error) {
        (logError(toError(error)), await this.deps.sleep(GW, e, { unref: !0 }));
      }
  }
  stopPeriodicRefresh() {
    if (this.refreshLoopController) (this.refreshLoopController.abort(), (this.refreshLoopController = null));
    if (this.refreshLoopBeforeExitListener)
      (process.removeListener("beforeExit", this.refreshLoopBeforeExitListener),
        (this.refreshLoopBeforeExitListener = null));
  }
}
//@ chunk-aepeg2w5.js:648604-648641 placement
function Ym(e, n) {
  return e === null ? n : e;
}
//@ chunk-aepeg2w5.js:648641-648715 placement
function tR(e) {
  try {
    Promise.resolve(e()).catch((n) => {
      logError(n);
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:648715-648776 placement
function Cl(e, n) {
  let r = n === PLUGIN_HOOKS_MODULES_GATE;
  return n in e && (!r || e[n] === !0);
}
//@ chunk-aepeg2w5.js:648776-648865 placement
function nR(e) {
  let filtered = Object.keys(e).filter((r) => zE.has(r));
  return filtered.length === 0 ? e : Uo(e, filtered);
}
//@ chunk-aepeg2w5.js:648865-648898 placement
var Vr = Re(Qm(), 1),
  vP = Re(ZPt(), 1);
//@ chunk-aepeg2w5.js:648898-648914 placement
var ts = Re(Ol());
//@ chunk-aepeg2w5.js:648914-648933 placement
class NoopEmitter {
  emit(e) {}
}
//@ chunk-aepeg2w5.js:648933-648947 placement
var noopEmitter = new NoopEmitter();

export { postGrowthBookEval, GrowthBookClientHolder, NoopEmitter, noopEmitter, ts, Vr, vP };
