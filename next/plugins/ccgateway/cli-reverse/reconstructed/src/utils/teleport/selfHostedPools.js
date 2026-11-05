/**
 * utils/teleport/selfHostedPools.ts
 *
 * 2.1.316 新增：拉取自托管池列表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vr5v4gzz.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../debug.js";
import { logFeatureSad, withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { toError, isExpectedApiError } from "../errors.js";
import { isCloudSessionAccessError } from "./environments.js";
import { logError } from "../log.js";

//@ chunk-vr5v4gzz.js:19654-20591 placement
async function fetchSelfHostedPools(options, credentials) {
  if (getAPIProvider() !== "firstParty") return [];
  let isConsoleProfile = isConsoleProfileSessionsCredential();
  let token = options ?? (await sessionsApiAccessToken(isConsoleProfile));
  if (!token) return [];
  let orgUUID = await sessionsApiOrganizationUUID(isConsoleProfile);
  if (!orgUUID) return [];
  let poolsUrl = `${getOauthConfig().BASE_API_URL}/v1/code/runners/self-hosted/pools`;
  try {
    let poolsResponse = await withSessionsApiBearer401Retry(
      (bearerToken) =>
        axios_default.get(poolsUrl, {
          headers: {
            ...getOAuthRequestHeaders(bearerToken),
            "anthropic-beta": "ccr-byoc-2025-07-29",
            "x-organization-uuid": orgUUID,
          },
          timeout: 15000,
        }),
      {
        profile: isConsoleProfile,
        fallbackToken: token,
        credentials,
      },
    );
    if (poolsResponse.status !== 200) {
      logForDebugging(`fetchSelfHostedPools: ${poolsResponse.status} ${poolsResponse.statusText}`, {
        level: "error",
      });
      logFeatureSad("teleport_self_hosted_pool_list", "non_200");
      return [];
    }
    return withFeatureTelemetry("teleport_self_hosted_pool_list", async () =>
      (poolsResponse.data.pools ?? []).map((pool) => ({
        kind: "self_hosted_pool",
        pool_id: pool.pool_id,
        name: pool.name,
        created_at: pool.created_at,
        alive_runner_count: pool.alive_runner_count ?? 0,
      })),
    );
  } catch (error) {
    let error_2 = toError(error);
    if (isExpectedApiError(error, isCloudSessionAccessError)) {
      logForDebugging(`fetchSelfHostedPools failed: ${error_2.message}`, {
        level: "error",
      });
      logFeatureSad("teleport_self_hosted_pool_list", "api_error");
    } else {
      logError(error_2);
      logFeatureSad("teleport_self_hosted_pool_list", "unexpected");
    }
    return [];
  }
}
export { fetchSelfHostedPools };
