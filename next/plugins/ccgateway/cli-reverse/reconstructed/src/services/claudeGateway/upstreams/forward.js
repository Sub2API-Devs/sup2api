/**
 * services/claudeGateway/upstreams/forward.ts
 *
 * 2.1.316 新增：网关上游转发（Bedrock/Vertex/Google）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (2)
 * attribution: sole-consumer 1, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createAwsCredentialProvider } from "./aws.js";
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
import {
  defaultAwsProviderChainResolver,
  getDefaultAwsProviderChain,
  invalidateDefaultAwsProviderChainDebounced,
} from "../../../utils/auth.js";
import { getNativeCaBlocks, createCaTransporterOptions, warnShortLivedGoogleTokens } from "../network.js";
import { escapeRegExpModule } from "../bedrockGuardrails.js";
import { getMTLSAgent } from "../../../utils/mtls.js";
import { env } from "../../../utils/env.js";
import { bedrockModelFromArnOrName, UPSTREAM_TIMEOUT_MS } from "../proxyRequest.js";
import { getBetaByName, FIRST_PARTY_ONLY_BETAS, THINKING_CONTEXT_BETAS } from "../../../utils/betas.js";
import { withTimeout } from "../../../utils/sleep.js";
import { countTokensWithBedrock } from "../../tokenEstimation.js";
import { truncateToLength, getFirstLine } from "../../../utils/stringUtils.js";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { vertexResidualCredentialPins, suppressVertexAuthRejection } from "../../api/vertexAuth.js";
import { assertCannedUpstreams } from "../loadTestMode.js";

//@ chunk-1hnjmk23.js:1352813-1353407 sole-consumer
async function eitherSigv4OrBearerRequired(upstream, buildClient) {
  if (!upstream.assume_role) return;
  if (upstream.auth.aws_bearer_token)
    throw Error(
      "assume_role needs SigV4 source credentials (access keys or the ambient AWS chain); aws_bearer_token cannot call sts:AssumeRole",
    );
  return createAwsCredentialProvider({
    upstreamName: upstream.name,
    region: upstream.region,
    roleArn: upstream.assume_role.role_arn,
    externalId: upstream.assume_role.external_id,
    sessionNameClaim: upstream.assume_role.session_name,
    sourceCredentials:
      upstream.auth.aws_access_key_id && upstream.auth.aws_secret_access_key
        ? {
            accessKeyId: upstream.auth.aws_access_key_id,
            secretAccessKey: upstream.auth.aws_secret_access_key,
            sessionToken: upstream.auth.aws_session_token,
          }
        : undefined,
    buildClient,
  });
}
//@ chunk-1hnjmk23.js:1353407-1365008 placement
/**
 * 按上游配置（anthropic/bedrock/vertex/google）构造转发器，剥离客户端认证头并注入上游凭据。
 */
async function createUpstreamForwarders(upstreams, testFetch) {
  let clearAuthHeaders = (headers) => {
    headers.delete("authorization");
    headers.delete("x-api-key");
  };
  let results = await Promise.all(
    upstreams.map(async (upstream) => {
      switch (upstream.provider) {
        case "anthropic": {
          if ("api_key" in upstream.auth) {
            let apiKey = upstream.auth.api_key;
            return {
              kind: "raw",
              name: upstream.name,
              provider: "anthropic",
              baseUrl: upstream.base_url,
              ...(testFetch && {
                fetch: testFetch,
              }),
              applyAuth: async (headers) => {
                clearAuthHeaders(headers);
                headers.set("x-api-key", apiKey);
              },
              forwardUserIdentity: upstream.forward_user_identity === true,
              headers: upstream.headers,
            };
          }
          if ("oauth_token" in upstream.auth) {
            let oauthToken = upstream.auth.oauth_token;
            return {
              kind: "raw",
              name: upstream.name,
              provider: "anthropic",
              baseUrl: upstream.base_url,
              ...(testFetch && {
                fetch: testFetch,
              }),
              applyAuth: async (headers) => {
                clearAuthHeaders(headers);
                headers.set("Authorization", `Bearer ${oauthToken}`);
                headers.append("anthropic-beta", OAUTH_BETA_HEADER);
              },
              forwardUserIdentity: upstream.forward_user_identity === true,
              headers: upstream.headers,
            };
          }
          let { resolveCredentialsFromConfig, TokenCache } =
            await import("../../../../vendor/@anthropic-ai/sdk/lib/credentials/TokenCache.lazy.js");
          let credentialsFromConfig = resolveCredentialsFromConfig(
            {
              organization_id: upstream.auth.organization_id,
              workspace_id: upstream.auth.workspace_id,
              base_url: upstream.base_url,
              authentication: {
                type: "oidc_federation",
                federation_rule_id: upstream.auth.federation_rule_id,
                service_account_id: upstream.auth.service_account_id,
                identity_token: {
                  source: "file",
                  path: upstream.auth.identity_token_file,
                },
              },
            },
            {
              baseURL: upstream.base_url,
              fetch: (requestUrl, init) =>
                ssrfSafeFetch(String(requestUrl), {
                  ...init,
                  ...getProxyFetchOptions({
                    url: String(requestUrl),
                  }),
                  signal: AbortSignal.timeout(1e4),
                }),
            },
          );
          let tokenCache = new TokenCache(credentialsFromConfig.provider, (error) =>
            gatewayLog("warn", `WIF advisory refresh (${upstream.name}): ${errorMessage(error)}`),
          );
          return {
            kind: "raw",
            name: upstream.name,
            provider: "anthropic",
            baseUrl: upstream.base_url,
            ...(testFetch && {
              fetch: testFetch,
            }),
            applyAuth: async (headers) => {
              clearAuthHeaders(headers);
              headers.set("Authorization", `Bearer ${await tokenCache.getToken()}`);
              for (let [key, value] of Object.entries(credentialsFromConfig.extraHeaders))
                headers.set(key, value);
              headers.append("anthropic-beta", OAUTH_BETA_HEADER);
            },
            invalidateAuth: () => tokenCache.invalidate(),
            forwardUserIdentity: upstream.forward_user_identity === true,
            headers: upstream.headers,
          };
        }
        case "bedrock": {
          let { AnthropicBedrock } =
            await import("../../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicBedrock.lazy.js");
          let guardrailHeaders = {
            ...(upstream.guardrail && {
              "X-Amzn-Bedrock-GuardrailIdentifier": upstream.guardrail.id,
              "X-Amzn-Bedrock-GuardrailVersion": upstream.guardrail.version,
            }),
            ...(upstream.guardrail_trace && {
              "X-Amzn-Bedrock-Trace": "ENABLED",
            }),
          };
          let baseClientOptions = {
            awsRegion: upstream.region,
            ...(upstream.base_url && {
              baseURL: upstream.base_url,
            }),
            timeout: ERROR_RETRY_AFTER_MS,
            fetchOptions: {
              ...getProxyFetchOptions({
                url: undefined,
              }),
              timeout: false,
            },
            maxRetries: 0,
            ...(testFetch && {
              fetch: testFetch,
            }),
          };
          if (
            !upstream.auth.aws_access_key_id !== !upstream.auth.aws_secret_access_key ||
            (upstream.auth.aws_session_token && !upstream.auth.aws_access_key_id)
          )
            throw Error(
              "bedrock upstream: aws_access_key_id and aws_secret_access_key must be set together (and are required with aws_session_token)",
            );
          let usesAmbientChain =
            !upstream.auth.aws_bearer_token &&
            !(upstream.auth.aws_access_key_id && upstream.auth.aws_secret_access_key);
          let customApiKeyHeader = hasCustomApiKeyHeader();
          let sigv4ClientDefaults = {
            authToken: null,
            defaultHeaders: {
              ...upstream.headers,
              ...clearAuthorizationHeaders(),
              Authorization: null,
              ...(!customApiKeyHeader && {
                "X-Api-Key": null,
              }),
              ...guardrailHeaders,
            },
            ...CLOUD_AUTH_SLOT,
          };
          let assumeRoleProvider = await eitherSigv4OrBearerRequired(
            upstream,
            (provider) =>
              new AnthropicBedrock({
                ...baseClientOptions,
                ...sigv4ClientDefaults,
                providerChainResolver: async () => provider,
              }),
          );
          let client = assumeRoleProvider
            ? assumeRoleProvider.sharedClient
            : upstream.auth.aws_bearer_token
              ? new AnthropicBedrock({
                  ...baseClientOptions,
                  apiKey: upstream.auth.aws_bearer_token,
                  defaultHeaders: {
                    ...upstream.headers,
                    ...clearAuthorizationHeaders(),
                    Authorization: `Bearer ${upstream.auth.aws_bearer_token}`,
                    ...(!customApiKeyHeader && {
                      "X-Api-Key": null,
                    }),
                    ...guardrailHeaders,
                  },
                })
              : upstream.auth.aws_access_key_id && upstream.auth.aws_secret_access_key
                ? new AnthropicBedrock({
                    ...baseClientOptions,
                    ...sigv4ClientDefaults,
                    awsAccessKey: upstream.auth.aws_access_key_id,
                    awsSecretKey: upstream.auth.aws_secret_access_key,
                    awsSessionToken: upstream.auth.aws_session_token,
                  })
                : new AnthropicBedrock({
                    ...baseClientOptions,
                    ...sigv4ClientDefaults,
                    providerChainResolver: defaultAwsProviderChainResolver(
                      upstream.region,
                      getNativeCaBlocks,
                    ),
                  });
          let runtimeClientPromise;
          let requestHandler;
          let countTokensRetryAt = new Map();
          let countTokensWorking = new Set();
          let countTokensInflight = new Map();
          let getRuntimeClient = () =>
            (runtimeClientPromise ??= (async () => {
              let { BedrockRuntimeClient } =
                await import("../../../../vendor/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js");
              if (!upstream.base_url && !/^[a-z0-9-]+$/.test(upstream.region))
                throw Error("region is not a plain AWS region name");
              let endpoint = upstream.base_url || `https://bedrock-runtime.${upstream.region}.amazonaws.com`;
              requestHandler ??=
                (await getAWSProxyRequestHandler({
                  url: endpoint,
                })) ??
                new escapeRegExpModule.NodeHttpHandler({
                  httpsAgent: getMTLSAgent(),
                });
              let authConfig = upstream.auth.aws_bearer_token
                ? {
                    authSchemePreference: ["httpBearerAuth"],
                    token: {
                      token: upstream.auth.aws_bearer_token,
                    },
                  }
                : upstream.auth.aws_access_key_id && upstream.auth.aws_secret_access_key
                  ? {
                      authSchemePreference: ["sigv4"],
                      credentials: {
                        accessKeyId: upstream.auth.aws_access_key_id,
                        secretAccessKey: upstream.auth.aws_secret_access_key,
                        sessionToken: upstream.auth.aws_session_token,
                      },
                    }
                  : {
                      authSchemePreference: ["sigv4"],
                      ...(!env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE && {
                        credentials: async (request) =>
                          (await getDefaultAwsProviderChain(upstream.region))(request),
                      }),
                    };
              return new BedrockRuntimeClient({
                region: upstream.region,
                endpoint,
                requestHandler,
                maxAttempts: 1,
                ...authConfig,
                ...(assumeRoleProvider && {
                  credentials: assumeRoleProvider.countTokensCredentials(),
                }),
              });
            })());
          return {
            kind: "sdk",
            name: upstream.name,
            provider: "bedrock",
            region: upstream.region,
            client,
            ...(upstream.guardrail && {
              guardrail: true,
            }),
            ...(upstream.guardrail?.input_tagging && {
              inputTagging: upstream.guardrail.input_tagging,
            }),
            ...(assumeRoleProvider && {
              assumeRole: assumeRoleProvider,
            }),
            ...(upstream.guardrail_trace && {
              guardrailTrace: true,
            }),
            ...(usesAmbientChain && {
              invalidateAuth: () => {
                let invalidated = invalidateDefaultAwsProviderChainDebounced(upstream.region);
                if (invalidated) runtimeClientPromise = undefined;
                return invalidated;
              },
            }),
            countTokens: async (modelArnOrName, body) => {
              let modelId = bedrockModelFromArnOrName(modelArnOrName);
              if (!modelId || testFetch) return null;
              if (Date.now() < (countTokensRetryAt.get(modelId) ?? 0)) return null;
              let pending = countTokensWorking.has(modelId) ? undefined : countTokensInflight.get(modelId);
              if (pending && (await pending) === null) return null;
              let { tools, anthropic_beta: anthropicBeta, ...restBody } = body;
              let filtered = (Array.isArray(anthropicBeta) ? anthropicBeta : []).filter((betaValue) => {
                let betaByName = getBetaByName(String(betaValue));
                return (
                  betaByName &&
                  FIRST_PARTY_ONLY_BETAS.has(betaByName) &&
                  !THINKING_CONTEXT_BETAS.has(betaByName)
                );
              });
              let countBody = {
                ...restBody,
                ...(Array.isArray(tools) &&
                  tools.length > 0 && {
                    tools,
                  }),
                ...(filtered.length > 0 && {
                  anthropic_beta: filtered,
                }),
              };
              let countPromise = (async () => {
                let abortController = new AbortController();
                try {
                  let count = await withTimeout(
                    getRuntimeClient().then((runtimeClient) =>
                      countTokensWithBedrock(runtimeClient, modelId, countBody, {
                        abortSignal: abortController.signal,
                      }),
                    ),
                    1e4,
                    "no answer in 10 s",
                  );
                  if (count === null) throw Error("the answer had no inputTokens");
                  if (Date.now() >= (countTokensRetryAt.get(modelId) ?? 0)) {
                    countTokensWorking.add(modelId);
                    if (countTokensRetryAt.delete(modelId))
                      gatewayLog(
                        "info",
                        `upstream ${upstream.name}: AWS CountTokens works again for ${modelId}`,
                      );
                  }
                  return count;
                } catch (error) {
                  let httpStatusCode = error.$metadata?.httpStatusCode;
                  let errorName = error instanceof Error ? error.name : "";
                  let detail =
                    errorName === "SyntaxError" || errorName === "Unknown"
                      ? "the answer was not from AWS"
                      : truncateToLength(getFirstLine(errorMessage(error)).replace(/\.$/, ""), 1000);
                  let message = httpStatusCode ? `HTTP ${httpStatusCode}: ${detail}` : detail;
                  if (
                    countTokensWorking.has(modelId) &&
                    ((httpStatusCode === 400 && errorName === "ValidationException") ||
                      httpStatusCode === 413 ||
                      httpStatusCode === 429)
                  ) {
                    gatewayLog(
                      "debug",
                      `upstream ${upstream.name}: AWS CountTokens failed for ${modelId} for one request (${message})`,
                    );
                    return null;
                  }
                  let credentialHint =
                    errorName === "AccessDeniedException"
                      ? " Check that the identity that signs this upstream's Bedrock calls has bedrock:CountTokens."
                      : errorName === "ValidationException" &&
                          /^The provided model doesn['\u2019]?t support counting tokens/i.test(detail)
                        ? " AWS does not count this model on bedrock-runtime (it counts some newer Claude models only on bedrock-mantle). This is not a missing permission, and it holds until AWS counts this model on bedrock-runtime."
                        : errorName === "ValidationException"
                          ? " AWS refused the model or the request body, so this is not a missing permission."
                          : upstream.base_url
                            ? " Check that the proxy at base_url passes /model/{id}/count-tokens."
                            : "";
                  gatewayLog(
                    countTokensRetryAt.has(modelId) ? "debug" : "warn",
                    `upstream ${upstream.name}: AWS CountTokens failed for ${modelId} (${message}). Model requests are not affected. For the next ${UPSTREAM_TIMEOUT_MS / 60000} minutes, count_tokens for this model goes to the next upstream. If there is none, the client gets a 501, and Claude Code counts with a billed model request or estimates locally. After ${UPSTREAM_TIMEOUT_MS / 60000} minutes, the gateway asks AWS again on the next count.${credentialHint}`,
                  );
                  countTokensRetryAt.set(modelId, Date.now() + UPSTREAM_TIMEOUT_MS);
                  countTokensWorking.delete(modelId);
                  runtimeClientPromise = undefined;
                  return null;
                } finally {
                  abortController.abort();
                }
              })();
              if (!pending && !countTokensWorking.has(modelId)) {
                countTokensInflight.set(modelId, countPromise);
                countPromise.then(() => countTokensInflight.delete(modelId));
              }
              return countPromise;
            },
          };
        }
        case "mantle": {
          let { AnthropicBedrockMantle } =
            await import("../../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicBedrock.lazy.js");
          if (
            !upstream.auth.aws_access_key_id !== !upstream.auth.aws_secret_access_key ||
            (upstream.auth.aws_session_token && !upstream.auth.aws_access_key_id)
          )
            throw Error(
              "mantle upstream: aws_access_key_id and aws_secret_access_key must be set together (and are required with aws_session_token)",
            );
          let customApiKeyHeader = hasCustomApiKeyHeader();
          let baseClientOptions = {
            awsRegion: upstream.region,
            baseURL: upstream.base_url ?? `https://bedrock-mantle.${upstream.region}.api.aws/anthropic`,
            timeout: ERROR_RETRY_AFTER_MS,
            fetchOptions: {
              ...getProxyFetchOptions({
                url: undefined,
              }),
              timeout: false,
            },
            maxRetries: 0,
            ...(testFetch && {
              fetch: testFetch,
            }),
          };
          let sigv4ClientDefaults = {
            authToken: null,
            defaultHeaders: {
              ...upstream.headers,
              ...clearAuthorizationHeaders(),
              Authorization: null,
              ...(!customApiKeyHeader && {
                "X-Api-Key": null,
              }),
            },
            ...CLOUD_AUTH_SLOT,
          };
          let withoutSigv4Keys = !upstream.auth.aws_bearer_token && !upstream.auth.aws_access_key_id;
          let withBearerEnv = (providerChainResolver) => {
            let AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
            env.unset("AWS_BEARER_TOKEN_BEDROCK");
            try {
              return new AnthropicBedrockMantle({
                ...baseClientOptions,
                ...sigv4ClientDefaults,
                providerChainResolver,
              });
            } finally {
              if (AWS_BEARER_TOKEN_BEDROCK !== undefined)
                env.set("AWS_BEARER_TOKEN_BEDROCK", AWS_BEARER_TOKEN_BEDROCK);
            }
          };
          let shared = await eitherSigv4OrBearerRequired(upstream, (builder) =>
            withBearerEnv(async () => builder),
          );
          let client;
          if (shared) client = shared.sharedClient;
          else if (upstream.auth.aws_bearer_token)
            client = new AnthropicBedrockMantle({
              ...baseClientOptions,
              apiKey: upstream.auth.aws_bearer_token,
              defaultHeaders: {
                ...upstream.headers,
                ...clearAuthorizationHeaders(),
                Authorization: `Bearer ${upstream.auth.aws_bearer_token}`,
                ...(!customApiKeyHeader && {
                  "X-Api-Key": null,
                }),
              },
            });
          else if (upstream.auth.aws_access_key_id)
            client = new AnthropicBedrockMantle({
              ...baseClientOptions,
              ...sigv4ClientDefaults,
              awsAccessKey: upstream.auth.aws_access_key_id,
              awsSecretAccessKey: upstream.auth.aws_secret_access_key,
              awsSessionToken: upstream.auth.aws_session_token,
            });
          else client = withBearerEnv(defaultAwsProviderChainResolver(upstream.region, getNativeCaBlocks));
          return {
            kind: "sdk",
            name: upstream.name,
            provider: "mantle",
            client,
            ...(shared && {
              assumeRole: shared,
            }),
            ...(withoutSigv4Keys && {
              invalidateAuth: () => invalidateDefaultAwsProviderChainDebounced(upstream.region),
            }),
          };
        }
        case "anthropicAws": {
          let { AnthropicAws } =
            await import("../../../../vendor/@anthropic-ai/bedrock-sdk/AnthropicAws.lazy.js");
          let clientOptions = {
            awsRegion: upstream.region,
            workspaceId: upstream.workspace_id,
            baseURL: upstream.base_url ?? `https://aws-external-anthropic.${upstream.region}.api.aws`,
            authToken: null,
            defaultHeaders: {
              ...upstream.headers,
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
            ...(testFetch && {
              fetch: testFetch,
            }),
          };
          let client;
          if (upstream.auth.api_key)
            client = new AnthropicAws({
              ...clientOptions,
              apiKey: upstream.auth.api_key,
            });
          else if (upstream.auth.aws_access_key_id || upstream.auth.aws_secret_access_key)
            client = new AnthropicAws({
              ...clientOptions,
              awsAccessKey: upstream.auth.aws_access_key_id,
              awsSecretAccessKey: upstream.auth.aws_secret_access_key,
              awsSessionToken: upstream.auth.aws_session_token,
            });
          else {
            let envAnthropicAwsApiKey = process.env.ANTHROPIC_AWS_API_KEY;
            delete process.env.ANTHROPIC_AWS_API_KEY;
            try {
              client = new AnthropicAws({
                ...clientOptions,
                providerChainResolver: defaultAwsProviderChainResolver(upstream.region, getNativeCaBlocks),
              });
            } finally {
              if (envAnthropicAwsApiKey !== undefined)
                process.env.ANTHROPIC_AWS_API_KEY = envAnthropicAwsApiKey;
            }
          }
          let usesAmbientChain =
            !upstream.auth.api_key &&
            !upstream.auth.aws_access_key_id &&
            !upstream.auth.aws_secret_access_key;
          return {
            kind: "sdk",
            name: upstream.name,
            provider: "anthropicAws",
            client,
            ...(usesAmbientChain && {
              invalidateAuth: () => invalidateDefaultAwsProviderChainDebounced(upstream.region),
            }),
          };
        }
        case "anthropicGoogleCloud": {
          let { AnthropicGoogleCloud } =
            await import("../../../../vendor/_unknown/anthropic-google-cloud-client.js");
          let accessToken = upstream.auth.access_token;
          let filteredHeaders = {};
          for (let [key, value] of Object.entries(upstream.headers ?? {}))
            if (key.toLowerCase() !== "authorization") filteredHeaders[key] = value;
          let clientOptions = {
            project: upstream.project_id,
            location: upstream.location,
            workspaceId: upstream.workspace_id,
            baseURL:
              upstream.base_url ??
              `https://claude.googleapis.com/v1/projects/${upstream.project_id}/locations/${upstream.location}/workspaces/${upstream.workspace_id}/invoke`,
            defaultHeaders: {
              ...filteredHeaders,
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
            ...(testFetch && {
              fetch: testFetch,
            }),
          };
          if (accessToken) clientOptions.bearerTokenProvider = async () => accessToken;
          else {
            let { GoogleAuth } = await import("../../../utils/lazyDefaultExport.js").then((mod) =>
              __toESM(mod.default, 1),
            );
            clientOptions.googleAuth = new GoogleAuth({
              scopes: ["https://www.googleapis.com/auth/cloud-platform"],
              projectId: upstream.project_id,
              ...(upstream.auth.service_account_json && {
                keyFilename: upstream.auth.service_account_json,
              }),
              clientOptions: createCaTransporterOptions(),
            });
            warnShortLivedGoogleTokens(clientOptions.googleAuth, upstream.name);
          }
          return {
            kind: "sdk",
            name: upstream.name,
            provider: "anthropicGoogleCloud",
            client: new AnthropicGoogleCloud(clientOptions),
          };
        }
        case "vertex": {
          let { AnthropicVertex } = await import("../../../../vendor/@anthropic-ai/vertex-sdk/client.js");
          let clientOptions = {
            region: upstream.region,
            projectId: upstream.project_id,
            ...(upstream.base_url && {
              baseURL: upstream.base_url,
            }),
            defaultHeaders: {
              ...upstream.headers,
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
            ...(testFetch && {
              fetch: testFetch,
            }),
          };
          if (upstream.auth.access_token) {
            let accessToken = upstream.auth.access_token;
            clientOptions.authClient = {
              projectId: upstream.project_id,
              getRequestHeaders: async () => ({
                Authorization: `Bearer ${accessToken}`,
              }),
            };
          } else {
            let { GoogleAuth } = await import("../../../utils/lazyDefaultExport.js").then((mod) =>
              __toESM(mod.default, 1),
            );
            clientOptions.googleAuth = new GoogleAuth({
              scopes: ["https://www.googleapis.com/auth/cloud-platform"],
              projectId: upstream.project_id,
              ...(upstream.auth.service_account_json && {
                keyFilename: upstream.auth.service_account_json,
              }),
              clientOptions: createCaTransporterOptions(),
            });
            warnShortLivedGoogleTokens(clientOptions.googleAuth, upstream.name);
          }
          return {
            kind: "sdk",
            name: upstream.name,
            provider: "vertex",
            client: suppressVertexAuthRejection(new AnthropicVertex(clientOptions)),
          };
        }
        case "foundry": {
          let { AnthropicFoundry } = await import("../../../../vendor/@anthropic-ai/foundry-sdk/client.mjs");
          let clientOptions = {
            ...(upstream.base_url
              ? {
                  baseURL: upstream.base_url,
                }
              : {
                  resource: upstream.resource,
                }),
            defaultHeaders:
              "api_key" in upstream.auth
                ? {
                    ...upstream.headers,
                    ...clearAuthorizationHeaders(),
                    Authorization: null,
                  }
                : {
                    ...upstream.headers,
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
            ...(testFetch && {
              fetch: testFetch,
            }),
          };
          if ("api_key" in upstream.auth) clientOptions.apiKey = upstream.auth.api_key;
          else {
            clientOptions.apiKey = null;
            let { DefaultAzureCredential } =
              await import("../../../../vendor/@azure/identity/dist/esm/credentials/DefaultAzureCredential.lazy.js");
            let credential = new DefaultAzureCredential();
            clientOptions.azureADTokenProvider = async () => {
              let token = await credential.getToken("https://cognitiveservices.azure.com/.default");
              if (!token) throw Error("Azure AD token unavailable");
              return token.token;
            };
          }
          return {
            kind: "sdk",
            name: upstream.name,
            provider: "foundry",
            client: new AnthropicFoundry(clientOptions),
          };
        }
      }
    }),
  );
  upstreams.forEach((upstream, index) => {
    if (upstream.models) results[index].models = upstream.models;
  });
  if (testFetch) assertCannedUpstreams(results, testFetch);
  return results;
}
export { createUpstreamForwarders };
