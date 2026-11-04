/**
 * services/claudeGateway/upstreams/aws.ts
 *
 * 2.1.316 新增：网关 AWS（Bedrock/mantle）上游签名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (5)
 * attribution: placement 5
 */
import { createHash } from "crypto";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_node_http_handler } from "../../../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { require_property_provider } from "../../../../vendor/@smithy/property-provider/dist-cjs/index.js";
import { env } from "../../../utils/env.js";
import { getAWSProxyRequestHandler } from "../../../utils/proxy.js";
import { getMTLSAgent } from "../../../utils/mtls.js";
import {
  getDefaultAwsProviderChain,
  invalidateDefaultAwsProviderChainDebounced,
} from "../../../utils/auth.js";
import { isAwsCredentialError } from "../../../utils/aws.js";
import { errorMessage } from "../../../utils/errors.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-1ny7cxrt.js:1342433-1342465 placement
/**
 * 懒加载的 lodash-style memoize 模块。
 */
var nodeHttpHandlerModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var memoizeModule;
deferInit("chunk-1ny7cxrt.js:1342433", () => {
  nodeHttpHandlerModule = __toESM(require_node_http_handler(), 1);
  memoizeModule = __toESM(require_property_provider(), 1);
});
//@ chunk-1ny7cxrt.js:1342502-1342564 placement
/**
 * AWS 上游请求超时（10 秒）。
 */
var CLAUDE_APPS_GATEWAY = "claude-apps-gateway";
var CREDENTIAL_REFRESH_SKEW_MS = 300000;
var CLIENT_RECREATE_MS = 30000;
var DEFAULT_MAX_USERS = 1e4;
var AWS_REQUEST_TIMEOUT_MS = 1e4;
//@ chunk-1ny7cxrt.js:1342564-1342890 placement
/**
 * 把用户标识编码为 AWS 角色会话名（非法字符 =HH 编码，超长截断加哈希）。
 */
function toAwsSessionName(name) {
  if (/\p{Surrogate}/u.test(name)) return null;
  let encoded = "";
  for (let char of name)
    encoded += /^[\w+,.@-]$/.test(char)
      ? char
      : Array.from(
          new TextEncoder().encode(char),
          (byte) => `=${byte.toString(16).toUpperCase().padStart(2, "0")}`,
        ).join("");
  if (encoded.length > 64)
    encoded = `${encoded.slice(0, 42)}=-${createHash("sha256").update(name).digest("hex").slice(0, 20)}`;
  return encoded.length >= 2 ? encoded : null;
}
//@ chunk-1ny7cxrt.js:1342890-1342974 placement
/**
 * 把 assumed-role ARN 里的会话名脱敏成 <session>。
 */
function redactAwsSessionName(text) {
  return text.replace(/(assumed-role\/[^/\s]+\/)[^\s"']+/g, "$1<session>");
}
//@ chunk-1ny7cxrt.js:1342974-1345635 placement
/**
 * 为 AWS 上游（Bedrock/mantle）创建按用户的 assume-role 凭据提供者。
 */
async function createAwsCredentialProvider(config) {
  let { upstreamName, region, roleArn } = config;
  let maxUsers = config.maxUsers ?? DEFAULT_MAX_USERS;
  if (!/^[a-z0-9-]+$/.test(region)) throw Error("region is not a plain AWS region name");
  let useFips = env.AWS_USE_FIPS_ENDPOINT === "true" && !config.stsEndpoint;
  let stsHost = useFips && !region.startsWith("us-gov-") ? "sts-fips" : "sts";
  let stsUrl = config.stsEndpoint ?? `https://${stsHost}.${region}.amazonaws.com`;
  let clientConfig = {
    region,
    ...(useFips
      ? {
          useFipsEndpoint: true,
        }
      : {
          endpoint: stsUrl,
        }),
    requestHandler:
      (await getAWSProxyRequestHandler({
        url: stsUrl,
        requestTimeoutMs: AWS_REQUEST_TIMEOUT_MS,
      })) ??
      new nodeHttpHandlerModule.NodeHttpHandler({
        httpsAgent: getMTLSAgent(),
        requestTimeout: AWS_REQUEST_TIMEOUT_MS,
        throwOnRequestTimeout: true,
      }),
    maxAttempts: 2,
  };
  let masterCredentials =
    config.sourceCredentials ??
    (env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE
      ? undefined
      : async (request) => (await getDefaultAwsProviderChain(region))(request));
  let { fromTemporaryCredentials } =
    await import("../../../../vendor/@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js");
  function credentialsForSession(RoleSessionName) {
    return memoizeModule.memoize(
      fromTemporaryCredentials({
        ...(masterCredentials && {
          masterCredentials,
        }),
        params: {
          RoleArn: roleArn,
          RoleSessionName,
          ...(config.externalId && {
            ExternalId: config.externalId,
          }),
        },
        clientConfig,
      }),
      (provider) => (provider.expiration?.getTime() ?? 0) - Date.now() < CREDENTIAL_REFRESH_SKEW_MS,
    );
  }
  let sharedEntry;
  let resolveSharedCredentials = (request) => sharedEntry.credentials(request);
  let client = config.buildClient(resolveSharedCredentials);
  let buildSharedEntry = () => ({
    client,
    credentials: credentialsForSession(CLAUDE_APPS_GATEWAY),
    createdAt: Date.now(),
  });
  sharedEntry = buildSharedEntry();
  let userEntries = new Map();
  function entryForSession(sessionName) {
    let credentials = credentialsForSession(sessionName);
    let entry = {
      client: config.buildClient(credentials),
      credentials,
      createdAt: Date.now(),
    };
    if (userEntries.size >= maxUsers) userEntries.delete(userEntries.keys().next().value);
    userEntries.set(sessionName, entry);
    return entry;
  }
  function invalidateEntry(entry, sessionName) {
    if (entry === sharedEntry) {
      sharedEntry = buildSharedEntry();
      return true;
    }
    return userEntries.get(sessionName) === entry && userEntries.delete(sessionName);
  }
  return {
    sharedClient: client,
    countTokensCredentials: () => credentialsForSession(CLAUDE_APPS_GATEWAY),
    async clientFor(principal) {
      let sessionEntry = sharedEntry;
      let sessionName = CLAUDE_APPS_GATEWAY;
      let sessionLabel = "the shared session";
      if (config.sessionNameClaim && principal) {
        let claimValue = config.sessionNameClaim === "sub" ? principal.sub : principal.email;
        let claimSessionName = claimValue ? toAwsSessionName(claimValue) : null;
        if (!claimSessionName || claimSessionName === CLAUDE_APPS_GATEWAY)
          throw Error(
            `upstream ${upstreamName}: sub=${principal.sub} has no usable ${config.sessionNameClaim} claim for assume_role.session_name (set session_name: sub, or oidc.email_claim); request not sent`,
          );
        sessionEntry = userEntries.get(claimSessionName) ?? entryForSession(claimSessionName);
        sessionName = claimSessionName;
        sessionLabel = `sub=${principal.sub}`;
      }
      let isPerUser = sessionEntry !== sharedEntry;
      try {
        await sessionEntry.credentials();
      } catch (error) {
        if (
          !config.sourceCredentials &&
          isAwsCredentialError(error instanceof Error ? error.name : undefined, errorMessage(error))
        ) {
          invalidateDefaultAwsProviderChainDebounced(region);
          invalidateEntry(sessionEntry, sessionName);
        }
        let reason = isPerUser
          ? errorMessage(error).replaceAll(sessionName, "<session>")
          : errorMessage(error);
        let errorName = error instanceof Error ? error.name : "Error";
        let hint =
          errorName === "EndpointError"
            ? "for FIPS endpoints set AWS_USE_FIPS_ENDPOINT=true in the gateway's environment (not use_fips_endpoint in an AWS config file) and unset AWS_ENDPOINT_URL and AWS_ENDPOINT_URL_STS. Dual-stack endpoints are not supported here: unset AWS_USE_DUALSTACK_ENDPOINT"
            : `the gateway's AWS identity has sts:AssumeRole on that role, the role's trust policy trusts that identity, with the same external ID as external_id if it requires one, and ${useFips ? `the regional STS FIPS endpoint for ${region}` : stsUrl} is reachable`;
        throw Error(
          `upstream ${upstreamName}: sts:AssumeRole on ${roleArn} for ${sessionLabel} failed (${errorName}: ${reason}); request not sent; the gateway's own credentials were not used instead. Check: ${hint}.`,
        );
      }
      return {
        client: sessionEntry.client,
        invalidate: () =>
          Date.now() - sessionEntry.createdAt >= CLIENT_RECREATE_MS &&
          invalidateEntry(sessionEntry, sessionName),
      };
    },
  };
}
export { createAwsCredentialProvider, redactAwsSessionName };
