/**
 * utils/teleport/selfHostedPools.ts
 *
 * 2.1.316 新增：拉取自托管池列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (1)
 * attribution: placement 1
 */
import { getAPIProvider } from "../model/providers.js";
import {
  isConsoleProfileSessionsCredential,
  sessionsApiAccessToken,
  sessionsApiOrganizationUUID,
  withSessionsApiBearer401Retry,
  getOAuthRequestHeaders,
} from "./api.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../debug.js";
import { logFeatureSad, withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { toError, isExpectedApiError } from "../errors.js";
import { isCloudSessionAccessError } from "./environments.js";
import { logError } from "../log.js";

//@ chunk-f25sswmp.js:19007-19944 placement
async function fetchSelfHostedPools(e, n) {
  if (getAPIProvider() !== "firstParty") return [];
  let r = isConsoleProfileSessionsCredential(),
    s = e ?? (await sessionsApiAccessToken(r));
  if (!s) return [];
  let i = await sessionsApiOrganizationUUID(r);
  if (!i) return [];
  let y = `${getOauthConfig().BASE_API_URL}/v1/code/runners/self-hosted/pools`;
  try {
    let h = await withSessionsApiBearer401Retry(
      (E) =>
        Dt.get(y, {
          headers: {
            ...getOAuthRequestHeaders(E),
            "anthropic-beta": "ccr-byoc-2025-07-29",
            "x-organization-uuid": i,
          },
          timeout: 15000,
        }),
      { profile: r, fallbackToken: s, credentials: n },
    );
    if (h.status !== 200)
      return (
        logForDebugging(`fetchSelfHostedPools: ${h.status} ${h.statusText}`, { level: "error" }),
        logFeatureSad("teleport_self_hosted_pool_list", "non_200"),
        []
      );
    return withFeatureTelemetry("teleport_self_hosted_pool_list", async () =>
      (h.data.pools ?? []).map((E) => ({
        kind: "self_hosted_pool",
        pool_id: E.pool_id,
        name: E.name,
        created_at: E.created_at,
        alive_runner_count: E.alive_runner_count ?? 0,
      })),
    );
  } catch (error) {
    let E = toError(error);
    if (isExpectedApiError(error, isCloudSessionAccessError))
      (logForDebugging(`fetchSelfHostedPools failed: ${E.message}`, { level: "error" }),
        logFeatureSad("teleport_self_hosted_pool_list", "api_error"));
    else (logError(E), logFeatureSad("teleport_self_hosted_pool_list", "unexpected"));
    return [];
  }
}

export { fetchSelfHostedPools };
