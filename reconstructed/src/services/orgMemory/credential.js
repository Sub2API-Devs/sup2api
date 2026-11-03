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
import { u, string, E, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { isSiloId, isPublicProjects, getEffectiveSelection, dropSavedSelection } from "./selection.js";
import { memoryApiTarget, memoryApiOverride } from "../../utils/teleport/api.js";
import { apiClient } from "../routines/routinesApi.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { MemoryPermanentError, MemoryUnavailableError } from "./storeErrors.js";
import {
  isOrgMemoryWriteOptedIn,
  recordVerdict,
  isSelectionPrivate,
  parkOrgMemoryDecision,
  getOrgMemoryDecision,
  hasRwGrantedStore,
  clearGrant,
} from "./orgMemoryDecision.js";
import { logEvent } from "../analytics/index.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-82kqcve8.js:39889-40044 placement
var CREDENTIAL_ENDPOINT = "/v1/code/local/memory/credential";
var CREDENTIAL_TIMEOUT_MS = 1e4;
var CREDENTIAL_REFRESH_MARGIN_MS = 120000;
var credentialResponseSchema = DoctorLazy(() =>
  u({
    access_token: string().min(1),
    expires_in_seconds: E().positive(),
    stores: unknown().optional(),
  }),
);
//@ chunk-82kqcve8.js:40044-40204 placement
async function requestCredentialWithRetry(request, credentials) {
  let r = await requestOrgMemoryCredential(request, credentials);
  if (r.ok && r.status === 401) {
    logForDebugging("org-memory-credential: 401 \u2014 retrying once", {
      level: "debug",
    });
    return requestOrgMemoryCredential(request, credentials);
  }
  return r;
}
//@ chunk-82kqcve8.js:40204-40724 placement
/**
 * 向 /v1/code/local/memory/credential 申请组织记忆凭据：可请求写权限并带上选择（store、silo 或分组），silo 选择附带受信设备头。
 */
async function requestOrgMemoryCredential(request, credentials) {
  let deviceHeaders =
    request.selection !== null && isSiloId(request.selection) && memoryApiTarget().auth !== "none"
      ? await (await import("./chunk-6phxatm7.js")).trustedDeviceHeaders()
      : undefined;
  let target = memoryApiTarget();
  let authOverride = deviceHeaders !== undefined &&
    target.auth !== "none" && {
      headers: {
        ...target.headers,
        ...deviceHeaders,
      },
      maxRedirects: 0,
    };
  return apiClient.post(
    CREDENTIAL_ENDPOINT,
    request.ask || request.selection !== null
      ? {
          ...(request.ask && {
            write_access: true,
          }),
          ...(request.selection !== null && {
            selection: isPublicProjects(request.selection)
              ? {
                  store: request.selection,
                }
              : isSiloId(request.selection)
                ? {
                    silo_id: request.selection,
                  }
                : {
                    grouping_id: request.selection,
                  },
          }),
        }
      : undefined,
    {
      ...target,
      ...authOverride,
      credentials,
      timeout: CREDENTIAL_TIMEOUT_MS,
      validateStatus: () => true,
    },
  );
}
//@ chunk-82kqcve8.js:40724-46610 placement
/**
 * 组织记忆凭据：向凭据存储与存储后端交付 org memory 令牌
 */
class OrgMemoryCredential {
  cached = null;
  inflightMint = null;
  lastMintSelectionDegraded = false;
  generation = 0;
  lastMintResult = null;
  mintEndpoint = undefined;
  credentials = undefined;
  storageV5 = undefined;
  adoptCredentials(e) {
    if (e === undefined) return;
    if (this.credentials !== undefined && this.credentials !== e) {
      logForDebugging(
        "org-memory-credential: a credentials store was already handed in; the later one is ignored",
      );
      return;
    }
    this.credentials = e;
  }
  adoptStorageV5(e) {
    if (e === undefined) return;
    if (this.storageV5 !== undefined && this.storageV5 !== e) {
      logForDebugging(
        "org-memory-credential: a storage backend was already handed in; the later one is ignored",
      );
      return;
    }
    this.storageV5 = e;
  }
  discardOnEndpointChange() {
    let e = memoryApiOverride() ?? null;
    if (this.mintEndpoint !== undefined && this.mintEndpoint !== e) this.discard();
    this.mintEndpoint = e;
  }
  parseAndCache(e, n, r) {
    let s = credentialResponseSchema().safeParse(e);
    if (!s.success) {
      logFeatureBad("org_memory_credential", r.malformed);
      throw new MemoryPermanentError(
        r.malformed,
        `org memory credential: malformed response: ${s.error.message}`,
      );
    }
    let h = s.data.expires_in_seconds * 1000;
    if (h <= CREDENTIAL_REFRESH_MARGIN_MS)
      logForDebugging(
        `org-memory-credential: short token lifetime (${s.data.expires_in_seconds}s) \u2014 clamping the refresh margin`,
        {
          level: "warn",
        },
      );
    let y = {
      authorization: `Bearer ${s.data.access_token}`,
      expiresAtMs: Date.now() + h,
      marginMs: Math.min(CREDENTIAL_REFRESH_MARGIN_MS, Math.floor(h / 2)),
    };
    if (n === this.generation) this.cached = y;
    return {
      authorization: y.authorization,
      stores: s.data.stores,
    };
  }
  async negotiate(e) {
    let generation = this.generation;
    let r = "org memory credential";
    let s = e?.skipSelection ? null : getEffectiveSelection();
    let h = !e?.skipAsk && s !== null && isOrgMemoryWriteOptedIn();
    if (h) logEvent("tengu_org_memory_write_opt_in_requested", {});
    let y = false;
    let w = s;
    let S = false;
    let R = await requestCredentialWithRetry(
      {
        ask: h,
        selection: s,
      },
      this.credentials,
    );
    if (h && R.ok && R.status >= 400 && R.status < 500 && R.status !== 429 && R.status !== 401) {
      logFeatureSad("org_memory_writes", "ask_rejected");
      S = true;
      R = await requestCredentialWithRetry(
        {
          ask: false,
          selection: s,
        },
        this.credentials,
      );
    }
    if (R.ok && R.status === 400 && s !== null && generation === this.generation) {
      logFeatureSad("org_memory_picker", isSiloId(s) ? "silo_selection_degraded" : "selection_degraded");
      w = null;
      y = true;
      R = await requestCredentialWithRetry(
        {
          ask: false,
          selection: null,
        },
        this.credentials,
      );
      S = S || h;
    }
    if (!R.ok) {
      if (R.reason === "no-auth") {
        if (generation !== this.generation) return this.renegotiate(e);
        logFeatureBad("org_memory_credential", "no_oauth");
        throw new MemoryPermanentError("no_oauth", `org memory credential: ${R.detail}`);
      }
      logFeatureSad("org_memory_credential", "gate_skip");
      throw new MemoryUnavailableError(`org memory credential: ${R.reason}`);
    }
    if (R.status === 429 || R.status >= 500) {
      logFeatureSad("org_memory_credential", `http_${R.status}`);
      throw new MemoryUnavailableError(`org memory credential: HTTP ${R.status}`);
    }
    if (R.status === 404 && w !== null && generation === this.generation) {
      let L = await this.negotiate({
        skipAsk: (e?.skipAsk ?? false) || S || h,
        skipSelection: true,
      });
      if (generation !== this.generation) return this.renegotiate(e);
      dropSavedSelection(w, this.storageV5);
      let j = {
        ...L,
        degraded: true,
      };
      this.lastMintResult = j;
      return j;
    }
    if (R.status >= 400) {
      if (generation !== this.generation) return this.renegotiate(e);
      logFeatureBad("org_memory_credential", `http_${R.status}`);
      throw new MemoryPermanentError(`http_${R.status}`, `org memory credential: HTTP ${R.status}`);
    }
    let O = this.parseAndCache(R.data, generation, {
      malformed: "malformed_response",
    });
    if (generation !== this.generation) return this.renegotiate(e);
    let P = {
      authorization: O.authorization,
      request: {
        writeAccess: h && !S,
        selection: w,
      },
      degraded: y || S,
    };
    if (generation === this.generation) {
      this.lastMintSelectionDegraded = y;
      this.lastMintResult = P;
      recordVerdict(O.stores, h, {
        clampRo: !h || S,
        privateCandidate: isSelectionPrivate(w),
      });
    }
    logFeatureOk("org_memory_credential");
    return P;
  }
  async renew(e) {
    let generation = this.generation;
    let r = "org memory credential renewal";
    let s = e.writeAccess && isOrgMemoryWriteOptedIn();
    let h = await requestCredentialWithRetry(
      {
        ask: s,
        selection: e.selection,
      },
      this.credentials,
    );
    if (!h.ok) {
      if (h.reason === "no-auth") {
        if (generation !== this.generation) {
          logFeatureSad("org_memory_credential", "renewal_superseded");
          throw new MemoryUnavailableError("org memory credential renewal: superseded by a credential clear");
        }
        logFeatureBad("org_memory_credential", "renewal_no_oauth");
        throw new MemoryPermanentError("renewal_no_oauth", `org memory credential renewal: ${h.detail}`);
      }
      logFeatureSad("org_memory_credential", "renewal_gate_skip");
      throw new MemoryUnavailableError(`org memory credential renewal: ${h.reason}`);
    }
    if (h.status === 401 || h.status === 429 || h.status >= 500) {
      logFeatureSad("org_memory_credential", `renewal_http_${h.status}`);
      throw new MemoryUnavailableError(`org memory credential renewal: HTTP ${h.status}`);
    }
    if (h.status >= 400) {
      if (generation !== this.generation) {
        logFeatureSad("org_memory_credential", "renewal_superseded");
        throw new MemoryUnavailableError("org memory credential renewal: superseded by a credential clear");
      }
      if (generation === this.generation) parkOrgMemoryDecision("renewal_refused");
      logFeatureSad("org_memory_credential", "renewal_refused");
      throw new MemoryPermanentError("renewal_refused", `org memory credential renewal: HTTP ${h.status}`);
    }
    let y = this.parseAndCache(h.data, generation, {
      malformed: "renewal_malformed_response",
    });
    let w = {
      authorization: y.authorization,
      request: e,
      degraded: false,
    };
    if (generation === this.generation) {
      this.lastMintResult = w;
      recordVerdict(y.stores, s, {
        clampRo: !s,
        privateCandidate: isSelectionPrivate(e.selection),
      });
    }
    logFeatureOk("org_memory_credential");
    return w;
  }
  renegotiate(e) {
    return getOrgMemoryDecision().state === "undecided" ? this.negotiate(e) : this.routedMint();
  }
  routedMint() {
    let orgMemoryDecision = getOrgMemoryDecision();
    switch (orgMemoryDecision.state) {
      case "undecided":
        return this.negotiate();
      case "on":
        return this.renew(orgMemoryDecision.request);
      case "off":
      case "parked":
      case "ended":
        return Promise.reject(
          new MemoryPermanentError(
            `decision_${orgMemoryDecision.state}`,
            `org memory credential: no mint under a ${orgMemoryDecision.state} decision`,
          ),
        );
    }
  }
  mintSingleFlight() {
    if (this.inflightMint) return this.inflightMint;
    let e = this.routedMint().finally(() => {
      if (this.inflightMint === e) this.inflightMint = null;
    });
    this.inflightMint = e;
    return e;
  }
  negotiateSingleFlight() {
    let cached = this.cached;
    if (this.lastMintResult !== null && cached !== null && Date.now() < cached.expiresAtMs - cached.marginMs)
      return Promise.resolve(this.lastMintResult);
    return this.mintSingleFlight();
  }
  async getAuthorization(e) {
    if (e?.forceRefresh) {
      if (e.failedAuthorization === undefined || this.cached?.authorization === e.failedAuthorization)
        this.cached = null;
    }
    let cached = this.cached;
    if (cached !== null && Date.now() < cached.expiresAtMs - cached.marginMs) return cached.authorization;
    if (cached !== null && Date.now() < cached.expiresAtMs) {
      let generation = this.generation;
      return this.mintSingleFlight().then(
        (s) => s.authorization,
        (error) => {
          if (generation === this.generation) return cached.authorization;
          throw error;
        },
      );
    }
    return (await this.mintSingleFlight()).authorization;
  }
  discard() {
    if (this.cached !== null && hasRwGrantedStore()) logEvent("tengu_org_memory_token_discarded", {});
    this.generation++;
    this.cached = null;
    this.inflightMint = null;
    this.lastMintSelectionDegraded = false;
    this.lastMintResult = null;
    clearGrant();
  }
}
//@ chunk-82kqcve8.js:46610-46635 placement
/**
 * 按宿主保存的组织记忆凭据状态。
 */
var orgMemoryCredentialState = new HostScoped(() => new OrgMemoryCredential());
//@ chunk-82kqcve8.js:46635-46672 placement
/**
 * 取当前宿主的组织记忆凭据状态。
 */
function getOrgMemoryCredentialState() {
  return orgMemoryCredentialState.of(getRootSession().host);
}
//@ chunk-82kqcve8.js:46672-46725 placement
function wasLastMintSelectionDegraded() {
  return getOrgMemoryCredentialState().lastMintSelectionDegraded;
}
//@ chunk-82kqcve8.js:46725-46857 placement
function negotiateOrgMemoryCredential(credentials, storageV5) {
  let orgMemoryCredentialState = getOrgMemoryCredentialState();
  orgMemoryCredentialState.adoptCredentials(credentials);
  orgMemoryCredentialState.adoptStorageV5(storageV5);
  orgMemoryCredentialState.discardOnEndpointChange();
  return orgMemoryCredentialState.negotiateSingleFlight();
}
//@ chunk-82kqcve8.js:46857-46941 placement
function getOrgMemoryAuthorization(e) {
  let orgMemoryCredentialState = getOrgMemoryCredentialState();
  orgMemoryCredentialState.discardOnEndpointChange();
  return orgMemoryCredentialState.getAuthorization(e);
}
//@ chunk-82kqcve8.js:46941-46971 placement
function clearOrgMemoryCredential() {
  getOrgMemoryCredentialState().discard();
}
export {
  clearOrgMemoryCredential,
  wasLastMintSelectionDegraded,
  negotiateOrgMemoryCredential,
  getOrgMemoryAuthorization,
};
