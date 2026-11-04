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
import { objectSchema, stringSchema, numberSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-82kqcve8.js:39889-40044 placement
var CREDENTIAL_ENDPOINT; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CREDENTIAL_TIMEOUT_MS;
var CREDENTIAL_REFRESH_MARGIN_MS;
var credentialResponseSchema;
deferInit("chunk-82kqcve8.js:39889", () => {
  CREDENTIAL_ENDPOINT = "/v1/code/local/memory/credential";
  CREDENTIAL_TIMEOUT_MS = 1e4;
  CREDENTIAL_REFRESH_MARGIN_MS = 120000;
  credentialResponseSchema = DoctorLazy(() =>
    objectSchema({
      access_token: stringSchema().min(1),
      expires_in_seconds: numberSchema().positive(),
      stores: unknown().optional(),
    }),
  );
});
//@ chunk-82kqcve8.js:40044-40204 placement
async function requestCredentialWithRetry(request, credentials) {
  let result = await requestOrgMemoryCredential(request, credentials);
  if (result.ok && result.status === 401) {
    logForDebugging("org-memory-credential: 401 \u2014 retrying once", {
      level: "debug",
    });
    return requestOrgMemoryCredential(request, credentials);
  }
  return result;
}
//@ chunk-82kqcve8.js:40204-40724 placement
/**
 * 向 /v1/code/local/memory/credential 申请组织记忆凭据：可请求写权限并带上选择（store、silo 或分组），silo 选择附带受信设备头。
 */
async function requestOrgMemoryCredential(request, credentials) {
  let deviceHeaders =
    request.selection !== null && isSiloId(request.selection) && memoryApiTarget().auth !== "none"
      ? await (await import("../../utils/teleport/api.js")).trustedDeviceHeaders()
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
  adoptCredentials(credentials) {
    if (credentials === undefined) return;
    if (this.credentials !== undefined && this.credentials !== credentials) {
      logForDebugging(
        "org-memory-credential: a credentials store was already handed in; the later one is ignored",
      );
      return;
    }
    this.credentials = credentials;
  }
  adoptStorageV5(storageV5) {
    if (storageV5 === undefined) return;
    if (this.storageV5 !== undefined && this.storageV5 !== storageV5) {
      logForDebugging(
        "org-memory-credential: a storage backend was already handed in; the later one is ignored",
      );
      return;
    }
    this.storageV5 = storageV5;
  }
  discardOnEndpointChange() {
    let endpoint = memoryApiOverride() ?? null;
    if (this.mintEndpoint !== undefined && this.mintEndpoint !== endpoint) this.discard();
    this.mintEndpoint = endpoint;
  }
  parseAndCache(body, generation, labels) {
    let parsed = credentialResponseSchema().safeParse(body);
    if (!parsed.success) {
      logFeatureBad("org_memory_credential", labels.malformed);
      throw new MemoryPermanentError(
        labels.malformed,
        `org memory credential: malformed response: ${parsed.error.message}`,
      );
    }
    let lifetimeMs = parsed.data.expires_in_seconds * 1000;
    if (lifetimeMs <= CREDENTIAL_REFRESH_MARGIN_MS)
      logForDebugging(
        `org-memory-credential: short token lifetime (${parsed.data.expires_in_seconds}s) \u2014 clamping the refresh margin`,
        {
          level: "warn",
        },
      );
    let cached = {
      authorization: `Bearer ${parsed.data.access_token}`,
      expiresAtMs: Date.now() + lifetimeMs,
      marginMs: Math.min(CREDENTIAL_REFRESH_MARGIN_MS, Math.floor(lifetimeMs / 2)),
    };
    if (generation === this.generation) this.cached = cached;
    return {
      authorization: cached.authorization,
      stores: parsed.data.stores,
    };
  }
  async negotiate(options) {
    let generation = this.generation;
    let scopeLabel = "org memory credential";
    let selection = options?.skipSelection ? null : getEffectiveSelection();
    let askForWrite = !options?.skipAsk && selection !== null && isOrgMemoryWriteOptedIn();
    if (askForWrite) logEvent("tengu_org_memory_write_opt_in_requested", {});
    let selectionDegraded = false;
    let usedSelection = selection;
    let askRejected = false;
    let response = await requestCredentialWithRetry(
      {
        ask: askForWrite,
        selection,
      },
      this.credentials,
    );
    if (
      askForWrite &&
      response.ok &&
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 429 &&
      response.status !== 401
    ) {
      logFeatureSad("org_memory_writes", "ask_rejected");
      askRejected = true;
      response = await requestCredentialWithRetry(
        {
          ask: false,
          selection,
        },
        this.credentials,
      );
    }
    if (response.ok && response.status === 400 && selection !== null && generation === this.generation) {
      logFeatureSad(
        "org_memory_picker",
        isSiloId(selection) ? "silo_selection_degraded" : "selection_degraded",
      );
      usedSelection = null;
      selectionDegraded = true;
      response = await requestCredentialWithRetry(
        {
          ask: false,
          selection: null,
        },
        this.credentials,
      );
      askRejected = askRejected || askForWrite;
    }
    if (!response.ok) {
      if (response.reason === "no-auth") {
        if (generation !== this.generation) return this.renegotiate(options);
        logFeatureBad("org_memory_credential", "no_oauth");
        throw new MemoryPermanentError("no_oauth", `org memory credential: ${response.detail}`);
      }
      logFeatureSad("org_memory_credential", "gate_skip");
      throw new MemoryUnavailableError(`org memory credential: ${response.reason}`);
    }
    if (response.status === 429 || response.status >= 500) {
      logFeatureSad("org_memory_credential", `http_${response.status}`);
      throw new MemoryUnavailableError(`org memory credential: HTTP ${response.status}`);
    }
    if (response.status === 404 && usedSelection !== null && generation === this.generation) {
      let result = await this.negotiate({
        skipAsk: (options?.skipAsk ?? false) || askRejected || askForWrite,
        skipSelection: true,
      });
      if (generation !== this.generation) return this.renegotiate(options);
      dropSavedSelection(usedSelection, this.storageV5);
      let degradedResult = {
        ...result,
        degraded: true,
      };
      this.lastMintResult = degradedResult;
      return degradedResult;
    }
    if (response.status >= 400) {
      if (generation !== this.generation) return this.renegotiate(options);
      logFeatureBad("org_memory_credential", `http_${response.status}`);
      throw new MemoryPermanentError(
        `http_${response.status}`,
        `org memory credential: HTTP ${response.status}`,
      );
    }
    let parsed = this.parseAndCache(response.data, generation, {
      malformed: "malformed_response",
    });
    if (generation !== this.generation) return this.renegotiate(options);
    let result = {
      authorization: parsed.authorization,
      request: {
        writeAccess: askForWrite && !askRejected,
        selection: usedSelection,
      },
      degraded: selectionDegraded || askRejected,
    };
    if (generation === this.generation) {
      this.lastMintSelectionDegraded = selectionDegraded;
      this.lastMintResult = result;
      recordVerdict(parsed.stores, askForWrite, {
        clampRo: !askForWrite || askRejected,
        privateCandidate: isSelectionPrivate(usedSelection),
      });
    }
    logFeatureOk("org_memory_credential");
    return result;
  }
  async renew(request) {
    let generation = this.generation;
    let scopeLabel = "org memory credential renewal";
    let writeAccess = request.writeAccess && isOrgMemoryWriteOptedIn();
    let response = await requestCredentialWithRetry(
      {
        ask: writeAccess,
        selection: request.selection,
      },
      this.credentials,
    );
    if (!response.ok) {
      if (response.reason === "no-auth") {
        if (generation !== this.generation) {
          logFeatureSad("org_memory_credential", "renewal_superseded");
          throw new MemoryUnavailableError("org memory credential renewal: superseded by a credential clear");
        }
        logFeatureBad("org_memory_credential", "renewal_no_oauth");
        throw new MemoryPermanentError(
          "renewal_no_oauth",
          `org memory credential renewal: ${response.detail}`,
        );
      }
      logFeatureSad("org_memory_credential", "renewal_gate_skip");
      throw new MemoryUnavailableError(`org memory credential renewal: ${response.reason}`);
    }
    if (response.status === 401 || response.status === 429 || response.status >= 500) {
      logFeatureSad("org_memory_credential", `renewal_http_${response.status}`);
      throw new MemoryUnavailableError(`org memory credential renewal: HTTP ${response.status}`);
    }
    if (response.status >= 400) {
      if (generation !== this.generation) {
        logFeatureSad("org_memory_credential", "renewal_superseded");
        throw new MemoryUnavailableError("org memory credential renewal: superseded by a credential clear");
      }
      if (generation === this.generation) parkOrgMemoryDecision("renewal_refused");
      logFeatureSad("org_memory_credential", "renewal_refused");
      throw new MemoryPermanentError(
        "renewal_refused",
        `org memory credential renewal: HTTP ${response.status}`,
      );
    }
    let parsed = this.parseAndCache(response.data, generation, {
      malformed: "renewal_malformed_response",
    });
    let result = {
      authorization: parsed.authorization,
      request,
      degraded: false,
    };
    if (generation === this.generation) {
      this.lastMintResult = result;
      recordVerdict(parsed.stores, writeAccess, {
        clampRo: !writeAccess,
        privateCandidate: isSelectionPrivate(request.selection),
      });
    }
    logFeatureOk("org_memory_credential");
    return result;
  }
  renegotiate(options) {
    return getOrgMemoryDecision().state === "undecided" ? this.negotiate(options) : this.routedMint();
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
    let mint = this.routedMint().finally(() => {
      if (this.inflightMint === mint) this.inflightMint = null;
    });
    this.inflightMint = mint;
    return mint;
  }
  negotiateSingleFlight() {
    let cached = this.cached;
    if (this.lastMintResult !== null && cached !== null && Date.now() < cached.expiresAtMs - cached.marginMs)
      return Promise.resolve(this.lastMintResult);
    return this.mintSingleFlight();
  }
  async getAuthorization(options) {
    if (options?.forceRefresh) {
      if (
        options.failedAuthorization === undefined ||
        this.cached?.authorization === options.failedAuthorization
      )
        this.cached = null;
    }
    let cached = this.cached;
    if (cached !== null && Date.now() < cached.expiresAtMs - cached.marginMs) return cached.authorization;
    if (cached !== null && Date.now() < cached.expiresAtMs) {
      let generation = this.generation;
      return this.mintSingleFlight().then(
        (result) => result.authorization,
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
var orgMemoryCredentialState; // deferred: uses OrgMemoryCredential of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-82kqcve8.js:46610", () => {
  orgMemoryCredentialState = new HostScoped(() => new OrgMemoryCredential());
});
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
function getOrgMemoryAuthorization(options) {
  let orgMemoryCredentialState = getOrgMemoryCredentialState();
  orgMemoryCredentialState.discardOnEndpointChange();
  return orgMemoryCredentialState.getAuthorization(options);
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
