/**
 * services/orgMemory/credential.ts
 *
 * 组织记忆凭据（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (10)
 * attribution: placement 10
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { Ct, yPe, getEffectiveSelection, dropSavedSelection } from "./selection.js";
import { memoryApiTarget, vgr } from "../../utils/teleport/api.js";
import { apiClient } from "../routines/routinesApi.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { MemoryPermanentError, MemoryUnavailableError } from "./storeErrors.js";
import {
  isOrgMemoryWriteOptedIn,
  bo,
  wo,
  parkOrgMemoryDecision,
  getOrgMemoryDecision,
  hasRwGrantedStore,
  As,
} from "./orgMemoryDecision.js";
import { logEvent } from "../analytics/index.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-82kqcve8.js:39889-40044 placement
var CREDENTIAL_ENDPOINT = "/v1/code/local/memory/credential",
  CREDENTIAL_TIMEOUT_MS = 1e4,
  CREDENTIAL_REFRESH_MARGIN_MS = 120000,
  credentialResponseSchema = DoctorLazy(() =>
    u({ access_token: o().min(1), expires_in_seconds: E().positive(), stores: oe().optional() }),
  );
//@ chunk-82kqcve8.js:40044-40204 placement
async function requestCredentialWithRetry(e, n) {
  let r = await requestOrgMemoryCredential(e, n);
  if (r.ok && r.status === 401)
    return (
      logForDebugging("org-memory-credential: 401 \u2014 retrying once", { level: "debug" }),
      requestOrgMemoryCredential(e, n)
    );
  return r;
}
/**
 * 向 /v1/code/local/memory/credential 申请组织记忆凭据：可请求写权限并带上选择（store、silo 或分组），silo 选择附带受信设备头。
 */
//@ chunk-82kqcve8.js:40204-40724 placement
async function requestOrgMemoryCredential(request, credentials) {
  let deviceHeaders =
      request.selection !== null && Ct(request.selection) && memoryApiTarget().auth !== "none"
        ? await (await import("./chunk-6phxatm7.js")).trustedDeviceHeaders()
        : void 0,
    target = memoryApiTarget(),
    authOverride = deviceHeaders !== void 0 &&
      target.auth !== "none" && { headers: { ...target.headers, ...deviceHeaders }, maxRedirects: 0 };
  return apiClient.post(
    CREDENTIAL_ENDPOINT,
    request.ask || request.selection !== null
      ? {
          ...(request.ask && { write_access: !0 }),
          ...(request.selection !== null && {
            selection: yPe(request.selection)
              ? { store: request.selection }
              : Ct(request.selection)
                ? { silo_id: request.selection }
                : { grouping_id: request.selection },
          }),
        }
      : void 0,
    {
      ...target,
      ...authOverride,
      credentials: credentials,
      timeout: CREDENTIAL_TIMEOUT_MS,
      validateStatus: () => !0,
    },
  );
}
/**
 * 组织记忆凭据：向凭据存储与存储后端交付 org memory 令牌
 */
//@ chunk-82kqcve8.js:40724-46610 placement
class OrgMemoryCredential {
  cached = null;
  inflightMint = null;
  lastMintSelectionDegraded = !1;
  generation = 0;
  lastMintResult = null;
  mintEndpoint = void 0;
  credentials = void 0;
  storageV5 = void 0;
  adoptCredentials(e) {
    if (e === void 0) return;
    if (this.credentials !== void 0 && this.credentials !== e) {
      logForDebugging(
        "org-memory-credential: a credentials store was already handed in; the later one is ignored",
      );
      return;
    }
    this.credentials = e;
  }
  adoptStorageV5(e) {
    if (e === void 0) return;
    if (this.storageV5 !== void 0 && this.storageV5 !== e) {
      logForDebugging(
        "org-memory-credential: a storage backend was already handed in; the later one is ignored",
      );
      return;
    }
    this.storageV5 = e;
  }
  discardOnEndpointChange() {
    let e = vgr() ?? null;
    if (this.mintEndpoint !== void 0 && this.mintEndpoint !== e) this.discard();
    this.mintEndpoint = e;
  }
  parseAndCache(e, n, r) {
    let safeParse = credentialResponseSchema().safeParse(e);
    if (!safeParse.success)
      throw (
        logFeatureBad("org_memory_credential", r.malformed),
        new MemoryPermanentError(
          r.malformed,
          `org memory credential: malformed response: ${safeParse.error.message}`,
        )
      );
    let h = safeParse.data.expires_in_seconds * 1000;
    if (h <= CREDENTIAL_REFRESH_MARGIN_MS)
      logForDebugging(
        `org-memory-credential: short token lifetime (${safeParse.data.expires_in_seconds}s) \u2014 clamping the refresh margin`,
        { level: "warn" },
      );
    let y = {
      authorization: `Bearer ${safeParse.data.access_token}`,
      expiresAtMs: Date.now() + h,
      marginMs: Math.min(CREDENTIAL_REFRESH_MARGIN_MS, Math.floor(h / 2)),
    };
    if (n === this.generation) this.cached = y;
    return { authorization: y.authorization, stores: safeParse.data.stores };
  }
  async negotiate(e) {
    let generation = this.generation,
      r = "org memory credential",
      s = e?.skipSelection ? null : getEffectiveSelection(),
      h = !e?.skipAsk && s !== null && isOrgMemoryWriteOptedIn();
    if (h) logEvent("tengu_org_memory_write_opt_in_requested", {});
    let y = !1,
      w = s,
      S = !1,
      R = await requestCredentialWithRetry({ ask: h, selection: s }, this.credentials);
    if (h && R.ok && R.status >= 400 && R.status < 500 && R.status !== 429 && R.status !== 401)
      (logFeatureSad("org_memory_writes", "ask_rejected"),
        (S = !0),
        (R = await requestCredentialWithRetry({ ask: !1, selection: s }, this.credentials)));
    if (R.ok && R.status === 400 && s !== null && generation === this.generation)
      (logFeatureSad("org_memory_picker", Ct(s) ? "silo_selection_degraded" : "selection_degraded"),
        (w = null),
        (y = !0),
        (R = await requestCredentialWithRetry({ ask: !1, selection: null }, this.credentials)),
        (S = S || h));
    if (!R.ok) {
      if (R.reason === "no-auth") {
        if (generation !== this.generation) return this.renegotiate(e);
        throw (
          logFeatureBad("org_memory_credential", "no_oauth"),
          new MemoryPermanentError("no_oauth", `org memory credential: ${R.detail}`)
        );
      }
      throw (
        logFeatureSad("org_memory_credential", "gate_skip"),
        new MemoryUnavailableError(`org memory credential: ${R.reason}`)
      );
    }
    if (R.status === 429 || R.status >= 500)
      throw (
        logFeatureSad("org_memory_credential", `http_${R.status}`),
        new MemoryUnavailableError(`org memory credential: HTTP ${R.status}`)
      );
    if (R.status === 404 && w !== null && generation === this.generation) {
      let negotiate = await this.negotiate({ skipAsk: (e?.skipAsk ?? !1) || S || h, skipSelection: !0 });
      if (generation !== this.generation) return this.renegotiate(e);
      dropSavedSelection(w, this.storageV5);
      let j = { ...negotiate, degraded: !0 };
      return ((this.lastMintResult = j), j);
    }
    if (R.status >= 400) {
      if (generation !== this.generation) return this.renegotiate(e);
      throw (
        logFeatureBad("org_memory_credential", `http_${R.status}`),
        new MemoryPermanentError(`http_${R.status}`, `org memory credential: HTTP ${R.status}`)
      );
    }
    let andCache = this.parseAndCache(R.data, generation, { malformed: "malformed_response" });
    if (generation !== this.generation) return this.renegotiate(e);
    let P = {
      authorization: andCache.authorization,
      request: { writeAccess: h && !S, selection: w },
      degraded: y || S,
    };
    if (generation === this.generation)
      ((this.lastMintSelectionDegraded = y),
        (this.lastMintResult = P),
        bo(andCache.stores, h, { clampRo: !h || S, privateCandidate: wo(w) }));
    return (logFeatureOk("org_memory_credential"), P);
  }
  async renew(e) {
    let generation = this.generation,
      r = "org memory credential renewal",
      s = e.writeAccess && isOrgMemoryWriteOptedIn(),
      h = await requestCredentialWithRetry({ ask: s, selection: e.selection }, this.credentials);
    if (!h.ok) {
      if (h.reason === "no-auth") {
        if (generation !== this.generation)
          throw (
            logFeatureSad("org_memory_credential", "renewal_superseded"),
            new MemoryUnavailableError("org memory credential renewal: superseded by a credential clear")
          );
        throw (
          logFeatureBad("org_memory_credential", "renewal_no_oauth"),
          new MemoryPermanentError("renewal_no_oauth", `org memory credential renewal: ${h.detail}`)
        );
      }
      throw (
        logFeatureSad("org_memory_credential", "renewal_gate_skip"),
        new MemoryUnavailableError(`org memory credential renewal: ${h.reason}`)
      );
    }
    if (h.status === 401 || h.status === 429 || h.status >= 500)
      throw (
        logFeatureSad("org_memory_credential", `renewal_http_${h.status}`),
        new MemoryUnavailableError(`org memory credential renewal: HTTP ${h.status}`)
      );
    if (h.status >= 400) {
      if (generation !== this.generation)
        throw (
          logFeatureSad("org_memory_credential", "renewal_superseded"),
          new MemoryUnavailableError("org memory credential renewal: superseded by a credential clear")
        );
      if (generation === this.generation) parkOrgMemoryDecision("renewal_refused");
      throw (
        logFeatureSad("org_memory_credential", "renewal_refused"),
        new MemoryPermanentError("renewal_refused", `org memory credential renewal: HTTP ${h.status}`)
      );
    }
    let andCache = this.parseAndCache(h.data, generation, { malformed: "renewal_malformed_response" }),
      w = { authorization: andCache.authorization, request: e, degraded: !1 };
    if (generation === this.generation)
      ((this.lastMintResult = w), bo(andCache.stores, s, { clampRo: !s, privateCandidate: wo(e.selection) }));
    return (logFeatureOk("org_memory_credential"), w);
  }
  renegotiate(e) {
    return getOrgMemoryDecision().state === "undecided" ? this.negotiate(e) : this.routedMint();
  }
  routedMint() {
    let e = getOrgMemoryDecision();
    switch (e.state) {
      case "undecided":
        return this.negotiate();
      case "on":
        return this.renew(e.request);
      case "off":
      case "parked":
      case "ended":
        return Promise.reject(
          new MemoryPermanentError(
            `decision_${e.state}`,
            `org memory credential: no mint under a ${e.state} decision`,
          ),
        );
    }
  }
  mintSingleFlight() {
    if (this.inflightMint) return this.inflightMint;
    let e = this.routedMint().finally(() => {
      if (this.inflightMint === e) this.inflightMint = null;
    });
    return ((this.inflightMint = e), e);
  }
  negotiateSingleFlight() {
    let cached = this.cached;
    if (this.lastMintResult !== null && cached !== null && Date.now() < cached.expiresAtMs - cached.marginMs)
      return Promise.resolve(this.lastMintResult);
    return this.mintSingleFlight();
  }
  async getAuthorization(e) {
    if (e?.forceRefresh) {
      if (e.failedAuthorization === void 0 || this.cached?.authorization === e.failedAuthorization)
        this.cached = null;
    }
    let cached = this.cached;
    if (cached !== null && Date.now() < cached.expiresAtMs - cached.marginMs) return cached.authorization;
    if (cached !== null && Date.now() < cached.expiresAtMs) {
      let generation = this.generation;
      return this.mintSingleFlight().then(
        (s) => s.authorization,
        (s) => {
          if (generation === this.generation) return cached.authorization;
          throw s;
        },
      );
    }
    return (await this.mintSingleFlight()).authorization;
  }
  discard() {
    if (this.cached !== null && hasRwGrantedStore()) logEvent("tengu_org_memory_token_discarded", {});
    (this.generation++,
      (this.cached = null),
      (this.inflightMint = null),
      (this.lastMintSelectionDegraded = !1),
      (this.lastMintResult = null),
      As());
  }
}
//@ chunk-82kqcve8.js:46610-46635 placement
var qu = new HostScoped(() => new OrgMemoryCredential());
//@ chunk-82kqcve8.js:46635-46672 placement
function Pr() {
  return qu.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:46672-46725 placement
function wasLastMintSelectionDegraded() {
  return Pr().lastMintSelectionDegraded;
}
//@ chunk-82kqcve8.js:46725-46857 placement
function negotiateOrgMemoryCredential(e, n) {
  let r = Pr();
  return (r.adoptCredentials(e), r.adoptStorageV5(n), r.discardOnEndpointChange(), r.negotiateSingleFlight());
}
//@ chunk-82kqcve8.js:46857-46941 placement
function getOrgMemoryAuthorization(e) {
  let n = Pr();
  return (n.discardOnEndpointChange(), n.getAuthorization(e));
}
//@ chunk-82kqcve8.js:46941-46971 placement
function clearOrgMemoryCredential() {
  Pr().discard();
}

export {
  clearOrgMemoryCredential,
  wasLastMintSelectionDegraded,
  negotiateOrgMemoryCredential,
  getOrgMemoryAuthorization,
};
