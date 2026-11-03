/**
 * services/claudeGateway/upstreams/forward.ts
 *
 * 2.1.316 新增：网关上游转发（Bedrock/Vertex/Google）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: placement 1
 */
import { OAUTH_BETA_HEADER } from "../../../constants/oauth.js";
import { ssrfSafeFetch } from "../ssrfGuard.js";
import { getProxyFetchOptions, getAWSProxyRequestHandler } from "../../../utils/proxy.js";
import { gatewayLog } from "../../gateway/gatewayBanner.js";
import { errorMessage } from "../../../utils/errors.js";
import { ERROR_RETRY_AFTER_MS } from "../upstreamErrors.js";
import {
  hasCustomApiKeyHeader,
  clearAuthorizationHeaders,
  CLOUD_AUTH_SLOT,
} from "../../api/customHeaders.js";
import { createAwsCredentialProvider } from "./aws.js";
import {
  defaultAwsProviderChainResolver,
  getDefaultAwsProviderChain,
  invalidateDefaultAwsProviderChainDebounced,
} from "../../../utils/auth.js";
import { getNativeCaBlocks, createCaTransporterOptions } from "../network.js";
import { escapeRegExpModule } from "../bedrockGuardrails.js";
import { getMTLSAgent } from "../../../utils/mtls.js";
import { env } from "../../../utils/env.js";
import { bedrockModelFromArnOrName, UPSTREAM_TIMEOUT_MS } from "../proxyRequest.js";
import { getBetaByName, FIRST_PARTY_ONLY_BETAS, THINKING_CONTEXT_BETAS } from "../../../utils/betas.js";
import { withTimeout } from "../../../utils/sleep.js";
import { countTokensWithBedrock } from "../../tokenEstimation.js";
import { truncateToLength, getFirstLine } from "../../../utils/stringUtils.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { vertexResidualCredentialPins, suppressVertexAuthRejection } from "../../api/vertexAuth.js";
import { assertCannedUpstreams } from "../loadTestMode.js";

//@ chunk-1ny7cxrt.js:1351851-1363283 placement
/**
 * 按上游配置（anthropic/bedrock/vertex/google）构造转发器，剥离客户端认证头并注入上游凭据。
 */
async function createUpstreamForwarders(upstreams, t) {
  let n = (r) => {
    r.delete("authorization");
    r.delete("x-api-key");
  };
  let results = await Promise.all(
    upstreams.map(async (r) => {
      switch (r.provider) {
        case "anthropic": {
          if ("api_key" in r.auth) {
            let apiKey = r.auth.api_key;
            return {
              kind: "raw",
              name: r.name,
              provider: "anthropic",
              baseUrl: r.base_url,
              ...(t && {
                fetch: t,
              }),
              applyAuth: async (f) => {
                n(f);
                f.set("x-api-key", apiKey);
              },
              forwardUserIdentity: r.forward_user_identity === true,
              headers: r.headers,
            };
          }
          if ("oauth_token" in r.auth) {
            let oauthToken = r.auth.oauth_token;
            return {
              kind: "raw",
              name: r.name,
              provider: "anthropic",
              baseUrl: r.base_url,
              ...(t && {
                fetch: t,
              }),
              applyAuth: async (f) => {
                n(f);
                f.set("Authorization", `Bearer ${oauthToken}`);
                f.append("anthropic-beta", OAUTH_BETA_HEADER);
              },
              forwardUserIdentity: r.forward_user_identity === true,
              headers: r.headers,
            };
          }
          let { resolveCredentialsFromConfig, TokenCache } = await import("./chunk-7k61ne1e.js");
          let credentialsFromConfig = resolveCredentialsFromConfig(
            {
              organization_id: r.auth.organization_id,
              workspace_id: r.auth.workspace_id,
              base_url: r.base_url,
              authentication: {
                type: "oidc_federation",
                federation_rule_id: r.auth.federation_rule_id,
                service_account_id: r.auth.service_account_id,
                identity_token: {
                  source: "file",
                  path: r.auth.identity_token_file,
                },
              },
            },
            {
              baseURL: r.base_url,
              fetch: (u, f) =>
                ssrfSafeFetch(String(u), {
                  ...f,
                  ...getProxyFetchOptions({
                    url: String(u),
                  }),
                  signal: AbortSignal.timeout(1e4),
                }),
            },
          );
          let c = new TokenCache(credentialsFromConfig.provider, (u) =>
            gatewayLog("warn", `WIF advisory refresh (${r.name}): ${errorMessage(u)}`),
          );
          return {
            kind: "raw",
            name: r.name,
            provider: "anthropic",
            baseUrl: r.base_url,
            ...(t && {
              fetch: t,
            }),
            applyAuth: async (u) => {
              n(u);
              u.set("Authorization", `Bearer ${await c.getToken()}`);
              for (let [key, value] of Object.entries(credentialsFromConfig.extraHeaders)) u.set(key, value);
              u.append("anthropic-beta", OAUTH_BETA_HEADER);
            },
            invalidateAuth: () => c.invalidate(),
            forwardUserIdentity: r.forward_user_identity === true,
            headers: r.headers,
          };
        }
        case "bedrock": {
          let { AnthropicBedrock } = await import("./chunk-h87x8cg3.js");
          let a = {
            ...(r.guardrail && {
              "X-Amzn-Bedrock-GuardrailIdentifier": r.guardrail.id,
              "X-Amzn-Bedrock-GuardrailVersion": r.guardrail.version,
            }),
            ...(r.guardrail_trace && {
              "X-Amzn-Bedrock-Trace": "ENABLED",
            }),
          };
          let l = {
            awsRegion: r.region,
            ...(r.base_url && {
              baseURL: r.base_url,
            }),
            timeout: ERROR_RETRY_AFTER_MS,
            fetchOptions: {
              ...getProxyFetchOptions({
                url: undefined,
              }),
              timeout: false,
            },
            maxRetries: 0,
            ...(t && {
              fetch: t,
            }),
          };
          if (
            !r.auth.aws_access_key_id !== !r.auth.aws_secret_access_key ||
            (r.auth.aws_session_token && !r.auth.aws_access_key_id)
          )
            throw Error(
              "bedrock upstream: aws_access_key_id and aws_secret_access_key must be set together (and are required with aws_session_token)",
            );
          if (r.assume_role && r.auth.aws_bearer_token)
            throw Error(
              "bedrock upstream: assume_role needs SigV4 source credentials (access keys or the ambient AWS chain); aws_bearer_token cannot call sts:AssumeRole",
            );
          let c = !r.auth.aws_bearer_token && !(r.auth.aws_access_key_id && r.auth.aws_secret_access_key);
          let u = hasCustomApiKeyHeader();
          let f = {
            authToken: null,
            defaultHeaders: {
              ...r.headers,
              ...clearAuthorizationHeaders(),
              Authorization: null,
              ...(!u && {
                "X-Api-Key": null,
              }),
              ...a,
            },
            ...CLOUD_AUTH_SLOT,
          };
          let h =
            r.assume_role &&
            (await createAwsCredentialProvider({
              upstreamName: r.name,
              region: r.region,
              roleArn: r.assume_role.role_arn,
              externalId: r.assume_role.external_id,
              sessionNameClaim: r.assume_role.session_name,
              sourceCredentials:
                r.auth.aws_access_key_id && r.auth.aws_secret_access_key
                  ? {
                      accessKeyId: r.auth.aws_access_key_id,
                      secretAccessKey: r.auth.aws_secret_access_key,
                      sessionToken: r.auth.aws_session_token,
                    }
                  : undefined,
              buildClient: (N) =>
                new AnthropicBedrock({
                  ...l,
                  ...f,
                  providerChainResolver: async () => N,
                }),
            }));
          let client = h
            ? h.sharedClient
            : r.auth.aws_bearer_token
              ? new AnthropicBedrock({
                  ...l,
                  apiKey: r.auth.aws_bearer_token,
                  defaultHeaders: {
                    ...r.headers,
                    ...clearAuthorizationHeaders(),
                    Authorization: `Bearer ${r.auth.aws_bearer_token}`,
                    ...(!u && {
                      "X-Api-Key": null,
                    }),
                    ...a,
                  },
                })
              : r.auth.aws_access_key_id && r.auth.aws_secret_access_key
                ? new AnthropicBedrock({
                    ...l,
                    ...f,
                    awsAccessKey: r.auth.aws_access_key_id,
                    awsSecretKey: r.auth.aws_secret_access_key,
                    awsSessionToken: r.auth.aws_session_token,
                  })
                : new AnthropicBedrock({
                    ...l,
                    ...f,
                    providerChainResolver: defaultAwsProviderChainResolver(r.region, getNativeCaBlocks),
                  });
          let y;
          let requestHandler;
          let w = new Map();
          let S = new Set();
          let j = new Map();
          let M = () =>
            (y ??= (async () => {
              let { BedrockRuntimeClient } = await import("./chunk-nbmkwhd6.js");
              if (!r.base_url && !/^[a-z0-9-]+$/.test(r.region))
                throw Error("region is not a plain AWS region name");
              let Z = r.base_url || `https://bedrock-runtime.${r.region}.amazonaws.com`;
              requestHandler ??=
                (await getAWSProxyRequestHandler({
                  url: Z,
                })) ??
                new escapeRegExpModule.NodeHttpHandler({
                  httpsAgent: getMTLSAgent(),
                });
              let F = r.auth.aws_bearer_token
                ? {
                    authSchemePreference: ["httpBearerAuth"],
                    token: {
                      token: r.auth.aws_bearer_token,
                    },
                  }
                : r.auth.aws_access_key_id && r.auth.aws_secret_access_key
                  ? {
                      authSchemePreference: ["sigv4"],
                      credentials: {
                        accessKeyId: r.auth.aws_access_key_id,
                        secretAccessKey: r.auth.aws_secret_access_key,
                        sessionToken: r.auth.aws_session_token,
                      },
                    }
                  : {
                      authSchemePreference: ["sigv4"],
                      ...(!env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE && {
                        credentials: async (X) => (await getDefaultAwsProviderChain(r.region))(X),
                      }),
                    };
              return new BedrockRuntimeClient({
                region: r.region,
                endpoint: Z,
                requestHandler,
                maxAttempts: 1,
                ...F,
                ...(h && {
                  credentials: h.countTokensCredentials(),
                }),
              });
            })());
          return {
            kind: "sdk",
            name: r.name,
            provider: "bedrock",
            region: r.region,
            client,
            ...(r.guardrail && {
              guardrail: true,
            }),
            ...(r.guardrail?.input_tagging && {
              inputTagging: r.guardrail.input_tagging,
            }),
            ...(h && {
              assumeRole: h,
            }),
            ...(r.guardrail_trace && {
              guardrailTrace: true,
            }),
            ...(c && {
              invalidateAuth: () => {
                let N = invalidateDefaultAwsProviderChainDebounced(r.region);
                if (N) y = undefined;
                return N;
              },
            }),
            countTokens: async (N, Z) => {
              let modelId = bedrockModelFromArnOrName(N);
              if (!modelId || t) return null;
              if (Date.now() < (w.get(modelId) ?? 0)) return null;
              let X = S.has(modelId) ? undefined : j.get(modelId);
              if (X && (await X) === null) return null;
              let { tools, anthropic_beta: anthropicBeta, ...ce } = Z;
              let filtered = (Array.isArray(anthropicBeta) ? anthropicBeta : []).filter((Ue) => {
                let betaByName = getBetaByName(String(Ue));
                return (
                  betaByName &&
                  FIRST_PARTY_ONLY_BETAS.has(betaByName) &&
                  !THINKING_CONTEXT_BETAS.has(betaByName)
                );
              });
              let be = {
                ...ce,
                ...(Array.isArray(tools) &&
                  tools.length > 0 && {
                    tools,
                  }),
                ...(filtered.length > 0 && {
                  anthropic_beta: filtered,
                }),
              };
              let ve = (async () => {
                let abortController = new AbortController();
                try {
                  let kt = await withTimeout(
                    M().then((je) =>
                      countTokensWithBedrock(je, modelId, be, {
                        abortSignal: abortController.signal,
                      }),
                    ),
                    1e4,
                    "no answer in 10 s",
                  );
                  if (kt === null) throw Error("the answer had no inputTokens");
                  if (Date.now() >= (w.get(modelId) ?? 0)) {
                    S.add(modelId);
                    if (w.delete(modelId))
                      gatewayLog("info", `upstream ${r.name}: AWS CountTokens works again for ${modelId}`);
                  }
                  return kt;
                } catch (error) {
                  let httpStatusCode = error.$metadata?.httpStatusCode;
                  let Ur = error instanceof Error ? error.name : "";
                  let An =
                    Ur === "SyntaxError" || Ur === "Unknown"
                      ? "the answer was not from AWS"
                      : truncateToLength(getFirstLine(errorMessage(error)).replace(/\.$/, ""), 1000);
                  let xe = httpStatusCode ? `HTTP ${httpStatusCode}: ${An}` : An;
                  if (
                    S.has(modelId) &&
                    ((httpStatusCode === 400 && Ur === "ValidationException") ||
                      httpStatusCode === 413 ||
                      httpStatusCode === 429)
                  ) {
                    gatewayLog(
                      "debug",
                      `upstream ${r.name}: AWS CountTokens failed for ${modelId} for one request (${xe})`,
                    );
                    return null;
                  }
                  gatewayLog(
                    w.has(modelId) ? "debug" : "warn",
                    `upstream ${r.name}: AWS CountTokens failed for ${modelId} (${xe}). Model requests are not affected. Until a retry works (one every ${UPSTREAM_TIMEOUT_MS / 60000} minutes), token counts for ${modelId} come from the next upstream or a billed one-token request. Check that the identity that signs this upstream's Bedrock calls has bedrock:CountTokens.${r.base_url ? " Check too that the proxy at base_url passes /model/{id}/count-tokens." : ""}`,
                  );
                  w.set(modelId, Date.now() + UPSTREAM_TIMEOUT_MS);
                  S.delete(modelId);
                  y = undefined;
                  return null;
                } finally {
                  abortController.abort();
                }
              })();
              if (!X && !S.has(modelId)) {
                j.set(modelId, ve);
                ve.then(() => j.delete(modelId));
              }
              return ve;
            },
          };
        }
        case "mantle": {
          let { AnthropicBedrockMantle } = await import("./chunk-h87x8cg3.js");
          if (
            !r.auth.aws_access_key_id !== !r.auth.aws_secret_access_key ||
            (r.auth.aws_session_token && !r.auth.aws_access_key_id)
          )
            throw Error(
              "mantle upstream: aws_access_key_id and aws_secret_access_key must be set together (and are required with aws_session_token)",
            );
          let a = hasCustomApiKeyHeader();
          let l = {
            awsRegion: r.region,
            baseURL: r.base_url ?? `https://bedrock-mantle.${r.region}.api.aws/anthropic`,
            timeout: ERROR_RETRY_AFTER_MS,
            fetchOptions: {
              ...getProxyFetchOptions({
                url: undefined,
              }),
              timeout: false,
            },
            maxRetries: 0,
            ...(t && {
              fetch: t,
            }),
          };
          let c = {
            authToken: null,
            defaultHeaders: {
              ...r.headers,
              ...clearAuthorizationHeaders(),
              Authorization: null,
              ...(!a && {
                "X-Api-Key": null,
              }),
            },
            ...CLOUD_AUTH_SLOT,
          };
          let u = !r.auth.aws_bearer_token && !r.auth.aws_access_key_id;
          let f;
          if (r.auth.aws_bearer_token)
            f = new AnthropicBedrockMantle({
              ...l,
              apiKey: r.auth.aws_bearer_token,
              defaultHeaders: {
                ...r.headers,
                ...clearAuthorizationHeaders(),
                Authorization: `Bearer ${r.auth.aws_bearer_token}`,
                ...(!a && {
                  "X-Api-Key": null,
                }),
              },
            });
          else if (r.auth.aws_access_key_id)
            f = new AnthropicBedrockMantle({
              ...l,
              ...c,
              awsAccessKey: r.auth.aws_access_key_id,
              awsSecretAccessKey: r.auth.aws_secret_access_key,
              awsSessionToken: r.auth.aws_session_token,
            });
          else {
            let AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
            env.unset("AWS_BEARER_TOKEN_BEDROCK");
            try {
              f = new AnthropicBedrockMantle({
                ...l,
                ...c,
                providerChainResolver: defaultAwsProviderChainResolver(r.region, getNativeCaBlocks),
              });
            } finally {
              if (AWS_BEARER_TOKEN_BEDROCK !== undefined)
                env.set("AWS_BEARER_TOKEN_BEDROCK", AWS_BEARER_TOKEN_BEDROCK);
            }
          }
          return {
            kind: "sdk",
            name: r.name,
            provider: "mantle",
            client: f,
            ...(u && {
              invalidateAuth: () => invalidateDefaultAwsProviderChainDebounced(r.region),
            }),
          };
        }
        case "anthropicAws": {
          let { AnthropicAws } = await import("./chunk-qhhcfyds.js");
          let a = {
            awsRegion: r.region,
            workspaceId: r.workspace_id,
            baseURL: r.base_url ?? `https://aws-external-anthropic.${r.region}.api.aws`,
            authToken: null,
            defaultHeaders: {
              ...r.headers,
              ...clearAuthorizationHeaders(),
              Authorization: null,
            },
            ...CLOUD_AUTH_SLOT,
            timeout: ERROR_RETRY_AFTER_MS,
            fetchOptions: {
              ...getProxyFetchOptions({
                url: undefined,
              }),
              timeout: false,
            },
            maxRetries: 0,
            ...(t && {
              fetch: t,
            }),
          };
          let l;
          if (r.auth.api_key)
            l = new AnthropicAws({
              ...a,
              apiKey: r.auth.api_key,
            });
          else if (r.auth.aws_access_key_id || r.auth.aws_secret_access_key)
            l = new AnthropicAws({
              ...a,
              awsAccessKey: r.auth.aws_access_key_id,
              awsSecretAccessKey: r.auth.aws_secret_access_key,
              awsSessionToken: r.auth.aws_session_token,
            });
          else {
            let envAnthropicAwsApiKey = process.env.ANTHROPIC_AWS_API_KEY;
            delete process.env.ANTHROPIC_AWS_API_KEY;
            try {
              l = new AnthropicAws({
                ...a,
                providerChainResolver: defaultAwsProviderChainResolver(r.region, getNativeCaBlocks),
              });
            } finally {
              if (envAnthropicAwsApiKey !== undefined)
                process.env.ANTHROPIC_AWS_API_KEY = envAnthropicAwsApiKey;
            }
          }
          let c = !r.auth.api_key && !r.auth.aws_access_key_id && !r.auth.aws_secret_access_key;
          return {
            kind: "sdk",
            name: r.name,
            provider: "anthropicAws",
            client: l,
            ...(c && {
              invalidateAuth: () => invalidateDefaultAwsProviderChainDebounced(r.region),
            }),
          };
        }
        case "anthropicGoogleCloud": {
          let { AnthropicGoogleCloud } = await import("./chunk-e7naa6k8.js");
          let accessToken = r.auth.access_token;
          let l = {};
          for (let [key, value] of Object.entries(r.headers ?? {}))
            if (key.toLowerCase() !== "authorization") l[key] = value;
          let c = {
            project: r.project_id,
            location: r.location,
            workspaceId: r.workspace_id,
            baseURL:
              r.base_url ??
              `https://claude.googleapis.com/v1/projects/${r.project_id}/locations/${r.location}/workspaces/${r.workspace_id}/invoke`,
            defaultHeaders: {
              ...l,
              ...clearAuthorizationHeaders(),
            },
            timeout: ERROR_RETRY_AFTER_MS,
            fetchOptions: {
              ...getProxyFetchOptions({
                url: undefined,
              }),
              timeout: false,
            },
            maxRetries: 0,
            ...(t && {
              fetch: t,
            }),
          };
          if (accessToken) c.bearerTokenProvider = async () => accessToken;
          else {
            let { GoogleAuth } = await import("./chunk-ndb2dret.js").then((m) => Re(m.default, 1));
            c.googleAuth = new GoogleAuth({
              scopes: ["https://www.googleapis.com/auth/cloud-platform"],
              projectId: r.project_id,
              ...(r.auth.service_account_json && {
                keyFilename: r.auth.service_account_json,
              }),
              clientOptions: createCaTransporterOptions(),
            });
          }
          return {
            kind: "sdk",
            name: r.name,
            provider: "anthropicGoogleCloud",
            client: new AnthropicGoogleCloud(c),
          };
        }
        case "vertex": {
          let { AnthropicVertex } = await import("./chunk-xa96axyz.js");
          let a = {
            region: r.region,
            projectId: r.project_id,
            ...(r.base_url && {
              baseURL: r.base_url,
            }),
            defaultHeaders: {
              ...r.headers,
              ...vertexResidualCredentialPins(),
            },
            ...CLOUD_AUTH_SLOT,
            timeout: ERROR_RETRY_AFTER_MS,
            fetchOptions: {
              ...getProxyFetchOptions({
                url: undefined,
              }),
              timeout: false,
            },
            maxRetries: 0,
            ...(t && {
              fetch: t,
            }),
          };
          if (r.auth.access_token) {
            let accessToken = r.auth.access_token;
            a.authClient = {
              projectId: r.project_id,
              getRequestHeaders: async () => ({
                Authorization: `Bearer ${accessToken}`,
              }),
            };
          } else {
            let { GoogleAuth } = await import("./chunk-ndb2dret.js").then((m) => Re(m.default, 1));
            a.googleAuth = new GoogleAuth({
              scopes: ["https://www.googleapis.com/auth/cloud-platform"],
              projectId: r.project_id,
              ...(r.auth.service_account_json && {
                keyFilename: r.auth.service_account_json,
              }),
              clientOptions: createCaTransporterOptions(),
            });
          }
          return {
            kind: "sdk",
            name: r.name,
            provider: "vertex",
            client: suppressVertexAuthRejection(new AnthropicVertex(a)),
          };
        }
        case "foundry": {
          let { AnthropicFoundry } = await import("./chunk-q01xm7xp.js");
          let a = {
            ...(r.base_url
              ? {
                  baseURL: r.base_url,
                }
              : {
                  resource: r.resource,
                }),
            defaultHeaders:
              "api_key" in r.auth
                ? {
                    ...r.headers,
                    ...clearAuthorizationHeaders(),
                    Authorization: null,
                  }
                : {
                    ...r.headers,
                    ...clearAuthorizationHeaders(),
                  },
            ...CLOUD_AUTH_SLOT,
            timeout: ERROR_RETRY_AFTER_MS,
            fetchOptions: {
              ...getProxyFetchOptions({
                url: undefined,
              }),
              timeout: false,
            },
            maxRetries: 0,
            ...(t && {
              fetch: t,
            }),
          };
          if ("api_key" in r.auth) a.apiKey = r.auth.api_key;
          else {
            a.apiKey = null;
            let { DefaultAzureCredential } = await import("./chunk-mrx6y2r5.js");
            let c = new DefaultAzureCredential();
            a.azureADTokenProvider = async () => {
              let token = await c.getToken("https://cognitiveservices.azure.com/.default");
              if (!token) throw Error("Azure AD token unavailable");
              return token.token;
            };
          }
          return {
            kind: "sdk",
            name: r.name,
            provider: "foundry",
            client: new AnthropicFoundry(a),
          };
        }
      }
    }),
  );
  upstreams.forEach((r, s) => {
    if (r.models) results[s].models = r.models;
  });
  if (t) assertCannedUpstreams(results, t);
  return results;
}
export { createUpstreamForwarders };
