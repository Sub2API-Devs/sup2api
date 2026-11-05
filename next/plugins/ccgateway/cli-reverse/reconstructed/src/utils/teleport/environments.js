/**
 * utils/teleport/environments.ts
 *
 * 云环境 API：列出 /v1/environment_providers、创建默认云环境。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport/environments.ts
 * pieces: chunk-vr5v4gzz.js (7)
 * attribution: placement 3, fingerprint 2, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  custom,
  booleanSchema,
  stringSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
  isExpectedApiError,
} from "../errors.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { getAPIProvider } from "../model/providers.js";
import {
  isConsoleProfileSessionsCredential,
  sessionsApiAccessToken,
  cloudSessionsSignInRefusal,
  sessionsApiOrganizationUUID,
  withSessionsApiBearer401Retry,
  getOAuthRequestHeaders,
  CloudSessionAccessError,
} from "./api.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../debug.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { logError } from "../log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vr5v4gzz.js:16300-16397 placement
function environmentSelector(environmentId) {
  return environmentId.startsWith("ccpool_")
    ? {
        self_hosted_runner_pool_id: environmentId,
      }
    : {
        environment_id: environmentId,
      };
}
//@ chunk-vr5v4gzz.js:16397-16589 placement
var environmentsPageSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ENVIRONMENTS_PAGE_LIMIT;
var MAX_ENVIRONMENT_PAGES;
deferInit("chunk-vr5v4gzz.js:16397", () => {
  environmentsPageSchema = DoctorLazy(() =>
    objectSchema({
      environments: array(
        custom((entry) => typeof entry === "object" && entry !== null && !Array.isArray(entry)),
      ),
      has_more: booleanSchema().optional().catch(undefined),
      last_id: stringSchema().nullable().optional().catch(undefined),
    }),
  );
  ENVIRONMENTS_PAGE_LIMIT = 100;
  MAX_ENVIRONMENT_PAGES = 10;
});
//@ chunk-vr5v4gzz.js:16589-17375 placement
function parseEnvironmentsResponse(body) {
  if (typeof body === "string" && body.trim().length === 0)
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "The cloud environments service returned an empty response (HTTP 200 with no body). This is usually temporary \u2014 try again in a moment.",
      "fetchEnvironments: HTTP 200 with an empty body",
    );
  if (typeof body === "string")
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "The cloud environments service returned a response in an unexpected format (HTTP 200 with a non-JSON body). This is usually temporary \u2014 try again in a moment.",
      "fetchEnvironments: HTTP 200 with a non-JSON body",
    );
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "The cloud environments service returned a response in an unexpected format (HTTP 200 without a usable environments list). This is usually temporary \u2014 try again in a moment.",
    "fetchEnvironments: HTTP 200 JSON body without a valid environments array",
  );
}
//@ chunk-vr5v4gzz.js:17375-18689 fingerprint (2.1.88 match: fetchEnvironments, 0.379)
/**
 * GET /v1/environment_providers 列出可用的云端环境（仅第一方）。
 */
async function fetchEnvironments(options, storageV5, credentials) {
  return withFeatureTelemetry(
    "teleport_environments_list",
    async () => {
      if (getAPIProvider() !== "firstParty")
        throw Error("Remote environments are only available on the first-party Anthropic API provider.");
      let withScope = isConsoleProfileSessionsCredential();
      let accessToken = options ?? (await sessionsApiAccessToken(withScope));
      if (!accessToken)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          cloudSessionsSignInRefusal(),
          "cloud sessions need a sign-in",
        );
      let orgUUID = await sessionsApiOrganizationUUID(withScope);
      if (!orgUUID) throw Error("Unable to get organization UUID");
      let url = `${getOauthConfig().BASE_API_URL}/v1/environment_providers`;
      try {
        let environments = [];
        let afterId;
        for (let j = 0; j < MAX_ENVIRONMENT_PAGES; j++) {
          let response = await withSessionsApiBearer401Retry(
            (bearerToken) =>
              axios_default.get(url, {
                headers: {
                  ...getOAuthRequestHeaders(bearerToken),
                  "x-organization-uuid": orgUUID,
                },
                params: {
                  limit: ENVIRONMENTS_PAGE_LIMIT,
                  ...(afterId !== undefined && {
                    after_id: afterId,
                  }),
                },
                timeout: 15000,
              }),
            {
              profile: withScope,
              fallbackToken: accessToken,
              credentials,
            },
          );
          if (response.status !== 200) throw Error(`Failed to fetch environments: HTTP ${response.status}`);
          let page = environmentsPageSchema().safeParse(response.data);
          if (!page.success) throw parseEnvironmentsResponse(response.data);
          environments.push(...page.data.environments);
          let lastId = page.data.last_id;
          if (
            page.data.has_more !== true ||
            page.data.environments.length === 0 ||
            typeof lastId !== "string"
          )
            break;
          if (j === MAX_ENVIRONMENT_PAGES - 1)
            logForDebugging(
              `fetchEnvironments: stopped after ${MAX_ENVIRONMENT_PAGES} pages (${environments.length} environments) although the server reports more; the rest are not listed`,
              {
                level: "warn",
              },
            );
          afterId = lastId;
        }
        let hasEnvironments = environments.length > 0;
        if (getGlobalConfig().hasRemoteEnvironment !== hasEnvironments)
          await saveGlobalConfig(
            (config) =>
              config.hasRemoteEnvironment === hasEnvironments
                ? config
                : {
                    ...config,
                    hasRemoteEnvironment: hasEnvironments,
                  },
            storageV5,
          );
        return environments;
      } catch (error) {
        let err = toError(error);
        if (isExpectedApiError(error, isCloudSessionAccessError))
          logForDebugging(`fetchEnvironments failed: ${err.message}`, {
            level: "error",
          });
        else logError(err);
        throw err;
      }
    },
    classifyEnvironmentError,
  );
}
//@ chunk-vr5v4gzz.js:18689-18727 layout
function isCloudSessionAccessError(value) {
  return value instanceof CloudSessionAccessError;
}
//@ chunk-vr5v4gzz.js:18727-18793 layout
function classifyEnvironmentError(value) {
  return value instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    ? "malformed_response"
    : "error";
}
//@ chunk-vr5v4gzz.js:18793-19654 fingerprint (2.1.88 match: createDefaultCloudEnvironment, 0.867)
/**
 * POST /v1/environment_providers/cloud/create 创建默认云环境。
 */
async function createDefaultCloudEnvironment(name = "Default", signal, accessToken) {
  return withFeatureTelemetry("teleport_default_environment_create", async () => {
    if (getAPIProvider() !== "firstParty")
      throw Error("Remote environments are only available on the first-party Anthropic API provider.");
    let withScope = isConsoleProfileSessionsCredential();
    let token = accessToken ?? (await sessionsApiAccessToken(withScope));
    if (!token) throw Error("No access token available");
    let orgUUID = await sessionsApiOrganizationUUID(withScope);
    if (!orgUUID) throw Error("Unable to get organization UUID");
    let url = `${getOauthConfig().BASE_API_URL}/v1/environment_providers/cloud/create`;
    return (
      await axios_default.post(
        url,
        {
          name,
          kind: "anthropic_cloud",
          description: "Default - trusted network access",
          config: {
            environment_type: "anthropic",
            cwd: "/home/user",
            init_script: null,
            environment: {},
            languages: [
              {
                name: "python",
                version: "3.11",
              },
              {
                name: "node",
                version: "20",
              },
            ],
            network_config: {
              allowed_hosts: [],
              allow_default_hosts: true,
            },
          },
        },
        {
          headers: {
            ...getOAuthRequestHeaders(token),
            "anthropic-beta": "ccr-byoc-2025-07-29",
            "x-organization-uuid": orgUUID,
          },
          timeout: 15000,
          signal,
        },
      )
    ).data;
  });
}
export { fetchEnvironments, createDefaultCloudEnvironment, environmentSelector, isCloudSessionAccessError };
