/**
 * services/mcp/_new/discoverAuthorizationServer.ts
 *
 * XAA（跨应用访问）用的受保护资源元数据（PRM）与授权服务器元数据发现，带 resource/issuer 一致性校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n1aavqzh.js (2)
 * attribution: sole-consumer-new 2
 */
import { JNr, LBt } from "../../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import { defaultXaaFetch_2, normalizeUrl_2 } from "../xaa.js";
import {
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../../utils/errors.js";
import { redactUrlSecrets } from "../../../utils/urlRedaction.js";

/**
 * discoverProtectedResource（v2 副本）。
 */
//@ chunk-n1aavqzh.js:2890-3504 sole-consumer-new = discoverProtectedResource (0.828)
async function discoverProtectedResource(serverUrl, opts) {
  let prm;
  try {
    prm = await JNr(serverUrl, void 0, opts?.fetchFn ?? defaultXaaFetch_2);
  } catch (error) {
    if (isAbortError(error)) throw error;
    let s = error instanceof Error ? /^HTTP (\d{3}) /.exec(error.message)?.[1] : void 0;
    throw Error(
      `XAA: PRM discovery failed for ${redactUrlSecrets(serverUrl)} (${s ? `HTTP ${s}` : error instanceof Error ? error.name : typeof error})`,
    );
  }
  if (!prm.resource || !prm.authorization_servers?.[0])
    throw Error("XAA: PRM discovery failed: PRM missing resource or authorization_servers");
  if (normalizeUrl_2(prm.resource) !== normalizeUrl_2(serverUrl))
    throw Error(
      `XAA: PRM discovery failed: PRM resource mismatch: expected ${redactUrlSecrets(serverUrl)}, got ${redactUrlSecrets(prm.resource)}`,
    );
  return { resource: prm.resource, authorization_servers: prm.authorization_servers };
}
/**
 * discoverAuthorizationServer（v2 副本，元数据发现跳过 issuer 内建校验后自行比对）。
 */
//@ chunk-n1aavqzh.js:3504-4420 sole-consumer-new = discoverAuthorizationServer (0.794)
async function discoverAuthorizationServer(asUrl, opts) {
  let n;
  try {
    n = await LBt(asUrl, { fetchFn: opts?.fetchFn ?? defaultXaaFetch_2, skipIssuerValidation: !0 });
  } catch (error) {
    if (isAbortError(error)) throw error;
    let s = error instanceof Error ? /^HTTP (\d{3}) /.exec(error.message)?.[1] : void 0;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: AS metadata discovery failed (${s ? `HTTP ${s}` : error instanceof Error ? error.name : typeof error})`,
      "XAA: AS metadata discovery failed",
    );
  }
  if (!n?.issuer || !n.token_endpoint)
    throw Error(`XAA: AS metadata discovery failed: no valid metadata at ${redactUrlSecrets(asUrl)}`);
  if (normalizeUrl_2(n.issuer) !== normalizeUrl_2(asUrl))
    throw Error(
      `XAA: AS metadata discovery failed: issuer mismatch: expected ${redactUrlSecrets(asUrl)}, got ${redactUrlSecrets(n.issuer)}`,
    );
  if (!URL.canParse(n.token_endpoint) || new URL(n.token_endpoint).protocol !== "https:")
    throw Error(`XAA: refusing non-HTTPS token endpoint: ${redactUrlSecrets(n.token_endpoint)}`);
  return {
    issuer: n.issuer,
    token_endpoint: n.token_endpoint,
    grant_types_supported: n.grant_types_supported,
    token_endpoint_auth_methods_supported: n.token_endpoint_auth_methods_supported,
  };
}

export { discoverProtectedResource, discoverAuthorizationServer };
