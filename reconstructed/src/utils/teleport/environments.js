/**
 * utils/teleport/environments.ts
 *
 * 云环境 API：列出 /v1/environment_providers、创建默认云环境。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teleport/environments.ts
 * pieces: chunk-f25sswmp.js (7)
 * attribution: placement 3, fingerprint 2, layout 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, hu, M, o } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../debug.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { logError } from "../log.js";

//@ chunk-f25sswmp.js:15653-15750 placement
function environmentSelector(e) {
  return e.startsWith("ccpool_") ? { self_hosted_runner_pool_id: e } : { environment_id: e };
}
//@ chunk-f25sswmp.js:15750-15942 placement
var environmentsPageSchema = DoctorLazy(() =>
    u({
      environments: A(hu((e) => typeof e === "object" && e !== null && !Array.isArray(e))),
      has_more: M()
        .optional()
        .catch(void 0),
      last_id: o()
        .nullable()
        .optional()
        .catch(void 0),
    }),
  ),
  ENVIRONMENTS_PAGE_LIMIT = 100,
  MAX_ENVIRONMENT_PAGES = 10;
//@ chunk-f25sswmp.js:15942-16728 placement
function parseEnvironmentsResponse(e) {
  if (typeof e === "string" && e.trim().length === 0)
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "The cloud environments service returned an empty response (HTTP 200 with no body). This is usually temporary \u2014 try again in a moment.",
      "fetchEnvironments: HTTP 200 with an empty body",
    );
  if (typeof e === "string")
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "The cloud environments service returned a response in an unexpected format (HTTP 200 with a non-JSON body). This is usually temporary \u2014 try again in a moment.",
      "fetchEnvironments: HTTP 200 with a non-JSON body",
    );
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    "The cloud environments service returned a response in an unexpected format (HTTP 200 without a usable environments list). This is usually temporary \u2014 try again in a moment.",
    "fetchEnvironments: HTTP 200 JSON body without a valid environments array",
  );
}
/**
 * GET /v1/environment_providers 列出可用的云端环境（仅第一方）。
 */
//@ chunk-f25sswmp.js:16728-18042 fingerprint = fetchEnvironments (0.379)
async function fetchEnvironments(e, n, r) {
  return withFeatureTelemetry(
    "teleport_environments_list",
    async () => {
      if (getAPIProvider() !== "firstParty")
        throw Error("Remote environments are only available on the first-party Anthropic API provider.");
      let i = isConsoleProfileSessionsCredential(),
        y = e ?? (await sessionsApiAccessToken(i));
      if (!y)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          cloudSessionsSignInRefusal(),
          "cloud sessions need a sign-in",
        );
      let h = await sessionsApiOrganizationUUID(i);
      if (!h) throw Error("Unable to get organization UUID");
      let url = `${getOauthConfig().BASE_API_URL}/v1/environment_providers`;
      try {
        let I = [],
          w;
        for (let T = 0; T < MAX_ENVIRONMENT_PAGES; T++) {
          let S = await withSessionsApiBearer401Retry(
            (x) =>
              Dt.get(url, {
                headers: { ...getOAuthRequestHeaders(x), "x-organization-uuid": h },
                params: { limit: ENVIRONMENTS_PAGE_LIMIT, ...(w !== void 0 && { after_id: w }) },
                timeout: 15000,
              }),
            { profile: i, fallbackToken: y, credentials: r },
          );
          if (S.status !== 200) throw Error(`Failed to fetch environments: HTTP ${S.status}`);
          let safeParse = environmentsPageSchema().safeParse(S.data);
          if (!safeParse.success) throw parseEnvironmentsResponse(S.data);
          I.push(...safeParse.data.environments);
          let last_id = safeParse.data.last_id;
          if (
            safeParse.data.has_more !== !0 ||
            safeParse.data.environments.length === 0 ||
            typeof last_id !== "string"
          )
            break;
          if (T === MAX_ENVIRONMENT_PAGES - 1)
            logForDebugging(
              `fetchEnvironments: stopped after ${MAX_ENVIRONMENT_PAGES} pages (${I.length} environments) although the server reports more; the rest are not listed`,
              { level: "warn" },
            );
          w = last_id;
        }
        let R = I.length > 0;
        if (getGlobalConfig().hasRemoteEnvironment !== R)
          await saveGlobalConfig(
            (T) => (T.hasRemoteEnvironment === R ? T : { ...T, hasRemoteEnvironment: R }),
            n,
          );
        return I;
      } catch (error) {
        let err = toError(error);
        if (isExpectedApiError(error, isCloudSessionAccessError))
          logForDebugging(`fetchEnvironments failed: ${err.message}`, { level: "error" });
        else logError(err);
        throw err;
      }
    },
    classifyEnvironmentError,
  );
}
//@ chunk-f25sswmp.js:18042-18080 layout
function isCloudSessionAccessError(e) {
  return e instanceof CloudSessionAccessError;
}
//@ chunk-f25sswmp.js:18080-18146 layout
function classifyEnvironmentError(e) {
  return e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    ? "malformed_response"
    : "error";
}
/**
 * POST /v1/environment_providers/cloud/create 创建默认云环境。
 */
//@ chunk-f25sswmp.js:18146-19007 fingerprint = createDefaultCloudEnvironment (0.867)
async function createDefaultCloudEnvironment(e = "Default", n, r) {
  return withFeatureTelemetry("teleport_default_environment_create", async () => {
    if (getAPIProvider() !== "firstParty")
      throw Error("Remote environments are only available on the first-party Anthropic API provider.");
    let s = isConsoleProfileSessionsCredential(),
      i = r ?? (await sessionsApiAccessToken(s));
    if (!i) throw Error("No access token available");
    let y = await sessionsApiOrganizationUUID(s);
    if (!y) throw Error("Unable to get organization UUID");
    let url = `${getOauthConfig().BASE_API_URL}/v1/environment_providers/cloud/create`;
    return (
      await Dt.post(
        url,
        {
          name: e,
          kind: "anthropic_cloud",
          description: "Default - trusted network access",
          config: {
            environment_type: "anthropic",
            cwd: "/home/user",
            init_script: null,
            environment: {},
            languages: [
              { name: "python", version: "3.11" },
              { name: "node", version: "20" },
            ],
            network_config: { allowed_hosts: [], allow_default_hosts: !0 },
          },
        },
        {
          headers: {
            ...getOAuthRequestHeaders(i),
            "anthropic-beta": "ccr-byoc-2025-07-29",
            "x-organization-uuid": y,
          },
          timeout: 15000,
          signal: n,
        },
      )
    ).data;
  });
}

export { fetchEnvironments, environmentSelector, createDefaultCloudEnvironment, isCloudSessionAccessError };
