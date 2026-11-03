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
import { Ja } from "../upstreamErrors.js";
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
import { js, $u } from "../network.js";
import { fE } from "../bedrockGuardrails.js";
import { getMTLSAgent } from "../../../utils/mtls.js";
import { env } from "../../../utils/env.js";
import { hE, UPSTREAM_TIMEOUT_MS } from "../proxyRequest.js";
import { getBetaByName, u9t, THINKING_CONTEXT_BETAS } from "../../../utils/betas.js";
import { withTimeout } from "../../../utils/sleep.js";
import { countTokensWithBedrock } from "../../tokenEstimation.js";
import { truncateToLength, getFirstLine } from "../../../utils/stringUtils.js";
import { Re } from "../../../../runtime/bun-runtime.js";
import { vertexResidualCredentialPins, suppressVertexAuthRejection } from "../../api/vertexAuth.js";
import { assertCannedUpstreams } from "../loadTestMode.js";

/**
 * 按上游配置（anthropic/bedrock/vertex/google）构造转发器，剥离客户端认证头并注入上游凭据。
 */
//@ chunk-1ny7cxrt.js:1351851-1363283 placement
async function createUpstreamForwarders(e, t) {
  let n = (r) => {
      (r.delete("authorization"), r.delete("x-api-key"));
    },
    results = await Promise.all(
      e.map(async (r) => {
        switch (r.provider) {
          case "anthropic": {
            if ("api_key" in r.auth) {
              let api_key = r.auth.api_key;
              return {
                kind: "raw",
                name: r.name,
                provider: "anthropic",
                baseUrl: r.base_url,
                ...(t && { fetch: t }),
                applyAuth: async (f) => {
                  (n(f), f.set("x-api-key", api_key));
                },
                forwardUserIdentity: r.forward_user_identity === !0,
                headers: r.headers,
              };
            }
            if ("oauth_token" in r.auth) {
              let oauth_token = r.auth.oauth_token;
              return {
                kind: "raw",
                name: r.name,
                provider: "anthropic",
                baseUrl: r.base_url,
                ...(t && { fetch: t }),
                applyAuth: async (f) => {
                  (n(f),
                    f.set("Authorization", `Bearer ${oauth_token}`),
                    f.append("anthropic-beta", OAUTH_BETA_HEADER));
                },
                forwardUserIdentity: r.forward_user_identity === !0,
                headers: r.headers,
              };
            }
            let { resolveCredentialsFromConfig: resolveCredentialsFromConfig, TokenCache: TokenCache } =
                await import("./chunk-7k61ne1e.js"),
              l = resolveCredentialsFromConfig(
                {
                  organization_id: r.auth.organization_id,
                  workspace_id: r.auth.workspace_id,
                  base_url: r.base_url,
                  authentication: {
                    type: "oidc_federation",
                    federation_rule_id: r.auth.federation_rule_id,
                    service_account_id: r.auth.service_account_id,
                    identity_token: { source: "file", path: r.auth.identity_token_file },
                  },
                },
                {
                  baseURL: r.base_url,
                  fetch: (u, f) =>
                    ssrfSafeFetch(String(u), {
                      ...f,
                      ...getProxyFetchOptions({ url: String(u) }),
                      signal: AbortSignal.timeout(1e4),
                    }),
                },
              ),
              c = new TokenCache(l.provider, (u) =>
                gatewayLog("warn", `WIF advisory refresh (${r.name}): ${errorMessage(u)}`),
              );
            return {
              kind: "raw",
              name: r.name,
              provider: "anthropic",
              baseUrl: r.base_url,
              ...(t && { fetch: t }),
              applyAuth: async (u) => {
                (n(u), u.set("Authorization", `Bearer ${await c.getToken()}`));
                for (let [f, h] of Object.entries(l.extraHeaders)) u.set(f, h);
                u.append("anthropic-beta", OAUTH_BETA_HEADER);
              },
              invalidateAuth: () => c.invalidate(),
              forwardUserIdentity: r.forward_user_identity === !0,
              headers: r.headers,
            };
          }
          case "bedrock": {
            let { AnthropicBedrock: AnthropicBedrock } = await import("./chunk-h87x8cg3.js"),
              a = {
                ...(r.guardrail && {
                  "X-Amzn-Bedrock-GuardrailIdentifier": r.guardrail.id,
                  "X-Amzn-Bedrock-GuardrailVersion": r.guardrail.version,
                }),
                ...(r.guardrail_trace && { "X-Amzn-Bedrock-Trace": "ENABLED" }),
              },
              l = {
                awsRegion: r.region,
                ...(r.base_url && { baseURL: r.base_url }),
                timeout: Ja,
                fetchOptions: { ...getProxyFetchOptions({ url: void 0 }), timeout: !1 },
                maxRetries: 0,
                ...(t && { fetch: t }),
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
            let c = !r.auth.aws_bearer_token && !(r.auth.aws_access_key_id && r.auth.aws_secret_access_key),
              u = hasCustomApiKeyHeader(),
              f = {
                authToken: null,
                defaultHeaders: {
                  ...r.headers,
                  ...clearAuthorizationHeaders(),
                  Authorization: null,
                  ...(!u && { "X-Api-Key": null }),
                  ...a,
                },
                ...CLOUD_AUTH_SLOT,
              },
              h =
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
                      : void 0,
                  buildClient: (N) =>
                    new AnthropicBedrock({ ...l, ...f, providerChainResolver: async () => N }),
                })),
              m = h
                ? h.sharedClient
                : r.auth.aws_bearer_token
                  ? new AnthropicBedrock({
                      ...l,
                      apiKey: r.auth.aws_bearer_token,
                      defaultHeaders: {
                        ...r.headers,
                        ...clearAuthorizationHeaders(),
                        Authorization: `Bearer ${r.auth.aws_bearer_token}`,
                        ...(!u && { "X-Api-Key": null }),
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
                        providerChainResolver: defaultAwsProviderChainResolver(r.region, js),
                      }),
              y,
              b,
              w = new Map(),
              S = new Set(),
              j = new Map(),
              M = () =>
                (y ??= (async () => {
                  let { BedrockRuntimeClient: BedrockRuntimeClient } = await import("./chunk-nbmkwhd6.js");
                  if (!r.base_url && !/^[a-z0-9-]+$/.test(r.region))
                    throw Error("region is not a plain AWS region name");
                  let Z = r.base_url || `https://bedrock-runtime.${r.region}.amazonaws.com`;
                  b ??=
                    (await getAWSProxyRequestHandler({ url: Z })) ??
                    new fE.NodeHttpHandler({ httpsAgent: getMTLSAgent() });
                  let F = r.auth.aws_bearer_token
                    ? { authSchemePreference: ["httpBearerAuth"], token: { token: r.auth.aws_bearer_token } }
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
                    requestHandler: b,
                    maxAttempts: 1,
                    ...F,
                    ...(h && { credentials: h.countTokensCredentials() }),
                  });
                })());
            return {
              kind: "sdk",
              name: r.name,
              provider: "bedrock",
              region: r.region,
              client: m,
              ...(r.guardrail && { guardrail: !0 }),
              ...(r.guardrail?.input_tagging && { inputTagging: r.guardrail.input_tagging }),
              ...(h && { assumeRole: h }),
              ...(r.guardrail_trace && { guardrailTrace: !0 }),
              ...(c && {
                invalidateAuth: () => {
                  let N = invalidateDefaultAwsProviderChainDebounced(r.region);
                  if (N) y = void 0;
                  return N;
                },
              }),
              countTokens: async (N, Z) => {
                let F = hE(N);
                if (!F || t) return null;
                if (Date.now() < (w.get(F) ?? 0)) return null;
                let X = S.has(F) ? void 0 : j.get(F);
                if (X && (await X) === null) return null;
                let { tools: tools, anthropic_beta: anthropic_beta, ...ce } = Z,
                  filtered = (Array.isArray(anthropic_beta) ? anthropic_beta : []).filter((Ue) => {
                    let kt = getBetaByName(String(Ue));
                    return kt && u9t.has(kt) && !THINKING_CONTEXT_BETAS.has(kt);
                  }),
                  be = {
                    ...ce,
                    ...(Array.isArray(tools) && tools.length > 0 && { tools: tools }),
                    ...(filtered.length > 0 && { anthropic_beta: filtered }),
                  },
                  ve = (async () => {
                    let abortController = new AbortController();
                    try {
                      let kt = await withTimeout(
                        M().then((je) =>
                          countTokensWithBedrock(je, F, be, { abortSignal: abortController.signal }),
                        ),
                        1e4,
                        "no answer in 10 s",
                      );
                      if (kt === null) throw Error("the answer had no inputTokens");
                      if (Date.now() >= (w.get(F) ?? 0)) {
                        if ((S.add(F), w.delete(F)))
                          gatewayLog("info", `upstream ${r.name}: AWS CountTokens works again for ${F}`);
                      }
                      return kt;
                    } catch (error) {
                      let je = error.$metadata?.httpStatusCode,
                        Ur = error instanceof Error ? error.name : "",
                        An =
                          Ur === "SyntaxError" || Ur === "Unknown"
                            ? "the answer was not from AWS"
                            : truncateToLength(getFirstLine(errorMessage(error)).replace(/\.$/, ""), 1000),
                        xe = je ? `HTTP ${je}: ${An}` : An;
                      if (
                        S.has(F) &&
                        ((je === 400 && Ur === "ValidationException") || je === 413 || je === 429)
                      )
                        return (
                          gatewayLog(
                            "debug",
                            `upstream ${r.name}: AWS CountTokens failed for ${F} for one request (${xe})`,
                          ),
                          null
                        );
                      return (
                        gatewayLog(
                          w.has(F) ? "debug" : "warn",
                          `upstream ${r.name}: AWS CountTokens failed for ${F} (${xe}). Model requests are not affected. Until a retry works (one every ${UPSTREAM_TIMEOUT_MS / 60000} minutes), token counts for ${F} come from the next upstream or a billed one-token request. Check that the identity that signs this upstream's Bedrock calls has bedrock:CountTokens.${r.base_url ? " Check too that the proxy at base_url passes /model/{id}/count-tokens." : ""}`,
                        ),
                        w.set(F, Date.now() + UPSTREAM_TIMEOUT_MS),
                        S.delete(F),
                        (y = void 0),
                        null
                      );
                    } finally {
                      abortController.abort();
                    }
                  })();
                if (!X && !S.has(F)) (j.set(F, ve), ve.then(() => j.delete(F)));
                return ve;
              },
            };
          }
          case "mantle": {
            let { AnthropicBedrockMantle: AnthropicBedrockMantle } = await import("./chunk-h87x8cg3.js");
            if (
              !r.auth.aws_access_key_id !== !r.auth.aws_secret_access_key ||
              (r.auth.aws_session_token && !r.auth.aws_access_key_id)
            )
              throw Error(
                "mantle upstream: aws_access_key_id and aws_secret_access_key must be set together (and are required with aws_session_token)",
              );
            let a = hasCustomApiKeyHeader(),
              l = {
                awsRegion: r.region,
                baseURL: r.base_url ?? `https://bedrock-mantle.${r.region}.api.aws/anthropic`,
                timeout: Ja,
                fetchOptions: { ...getProxyFetchOptions({ url: void 0 }), timeout: !1 },
                maxRetries: 0,
                ...(t && { fetch: t }),
              },
              c = {
                authToken: null,
                defaultHeaders: {
                  ...r.headers,
                  ...clearAuthorizationHeaders(),
                  Authorization: null,
                  ...(!a && { "X-Api-Key": null }),
                },
                ...CLOUD_AUTH_SLOT,
              },
              u = !r.auth.aws_bearer_token && !r.auth.aws_access_key_id,
              f;
            if (r.auth.aws_bearer_token)
              f = new AnthropicBedrockMantle({
                ...l,
                apiKey: r.auth.aws_bearer_token,
                defaultHeaders: {
                  ...r.headers,
                  ...clearAuthorizationHeaders(),
                  Authorization: `Bearer ${r.auth.aws_bearer_token}`,
                  ...(!a && { "X-Api-Key": null }),
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
                  providerChainResolver: defaultAwsProviderChainResolver(r.region, js),
                });
              } finally {
                if (AWS_BEARER_TOKEN_BEDROCK !== void 0)
                  env.set("AWS_BEARER_TOKEN_BEDROCK", AWS_BEARER_TOKEN_BEDROCK);
              }
            }
            return {
              kind: "sdk",
              name: r.name,
              provider: "mantle",
              client: f,
              ...(u && { invalidateAuth: () => invalidateDefaultAwsProviderChainDebounced(r.region) }),
            };
          }
          case "anthropicAws": {
            let { AnthropicAws: AnthropicAws } = await import("./chunk-qhhcfyds.js"),
              a = {
                awsRegion: r.region,
                workspaceId: r.workspace_id,
                baseURL: r.base_url ?? `https://aws-external-anthropic.${r.region}.api.aws`,
                authToken: null,
                defaultHeaders: { ...r.headers, ...clearAuthorizationHeaders(), Authorization: null },
                ...CLOUD_AUTH_SLOT,
                timeout: Ja,
                fetchOptions: { ...getProxyFetchOptions({ url: void 0 }), timeout: !1 },
                maxRetries: 0,
                ...(t && { fetch: t }),
              },
              l;
            if (r.auth.api_key) l = new AnthropicAws({ ...a, apiKey: r.auth.api_key });
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
                  providerChainResolver: defaultAwsProviderChainResolver(r.region, js),
                });
              } finally {
                if (envAnthropicAwsApiKey !== void 0)
                  process.env.ANTHROPIC_AWS_API_KEY = envAnthropicAwsApiKey;
              }
            }
            let c = !r.auth.api_key && !r.auth.aws_access_key_id && !r.auth.aws_secret_access_key;
            return {
              kind: "sdk",
              name: r.name,
              provider: "anthropicAws",
              client: l,
              ...(c && { invalidateAuth: () => invalidateDefaultAwsProviderChainDebounced(r.region) }),
            };
          }
          case "anthropicGoogleCloud": {
            let { AnthropicGoogleCloud: AnthropicGoogleCloud } = await import("./chunk-e7naa6k8.js"),
              access_token = r.auth.access_token,
              l = {};
            for (let [u, f] of Object.entries(r.headers ?? {}))
              if (u.toLowerCase() !== "authorization") l[u] = f;
            let c = {
              project: r.project_id,
              location: r.location,
              workspaceId: r.workspace_id,
              baseURL:
                r.base_url ??
                `https://claude.googleapis.com/v1/projects/${r.project_id}/locations/${r.location}/workspaces/${r.workspace_id}/invoke`,
              defaultHeaders: { ...l, ...clearAuthorizationHeaders() },
              timeout: Ja,
              fetchOptions: { ...getProxyFetchOptions({ url: void 0 }), timeout: !1 },
              maxRetries: 0,
              ...(t && { fetch: t }),
            };
            if (access_token) c.bearerTokenProvider = async () => access_token;
            else {
              let { GoogleAuth: GoogleAuth } = await import("./chunk-ndb2dret.js").then((m) =>
                Re(m.default, 1),
              );
              c.googleAuth = new GoogleAuth({
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
                projectId: r.project_id,
                ...(r.auth.service_account_json && { keyFilename: r.auth.service_account_json }),
                clientOptions: $u(),
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
            let { AnthropicVertex: AnthropicVertex } = await import("./chunk-xa96axyz.js"),
              a = {
                region: r.region,
                projectId: r.project_id,
                ...(r.base_url && { baseURL: r.base_url }),
                defaultHeaders: { ...r.headers, ...vertexResidualCredentialPins() },
                ...CLOUD_AUTH_SLOT,
                timeout: Ja,
                fetchOptions: { ...getProxyFetchOptions({ url: void 0 }), timeout: !1 },
                maxRetries: 0,
                ...(t && { fetch: t }),
              };
            if (r.auth.access_token) {
              let access_token = r.auth.access_token;
              a.authClient = {
                projectId: r.project_id,
                getRequestHeaders: async () => ({ Authorization: `Bearer ${access_token}` }),
              };
            } else {
              let { GoogleAuth: GoogleAuth } = await import("./chunk-ndb2dret.js").then((m) =>
                Re(m.default, 1),
              );
              a.googleAuth = new GoogleAuth({
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
                projectId: r.project_id,
                ...(r.auth.service_account_json && { keyFilename: r.auth.service_account_json }),
                clientOptions: $u(),
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
            let { AnthropicFoundry: AnthropicFoundry } = await import("./chunk-q01xm7xp.js"),
              a = {
                ...(r.base_url ? { baseURL: r.base_url } : { resource: r.resource }),
                defaultHeaders:
                  "api_key" in r.auth
                    ? { ...r.headers, ...clearAuthorizationHeaders(), Authorization: null }
                    : { ...r.headers, ...clearAuthorizationHeaders() },
                ...CLOUD_AUTH_SLOT,
                timeout: Ja,
                fetchOptions: { ...getProxyFetchOptions({ url: void 0 }), timeout: !1 },
                maxRetries: 0,
                ...(t && { fetch: t }),
              };
            if ("api_key" in r.auth) a.apiKey = r.auth.api_key;
            else {
              a.apiKey = null;
              let { DefaultAzureCredential: DefaultAzureCredential } = await import("./chunk-mrx6y2r5.js"),
                c = new DefaultAzureCredential();
              a.azureADTokenProvider = async () => {
                let token = await c.getToken("https://cognitiveservices.azure.com/.default");
                if (!token) throw Error("Azure AD token unavailable");
                return token.token;
              };
            }
            return { kind: "sdk", name: r.name, provider: "foundry", client: new AnthropicFoundry(a) };
          }
        }
      }),
    );
  if (
    (e.forEach((r, s) => {
      if (r.models) results[s].models = r.models;
    }),
    t)
  )
    assertCannedUpstreams(results, t);
  return results;
}

export { createUpstreamForwarders };
