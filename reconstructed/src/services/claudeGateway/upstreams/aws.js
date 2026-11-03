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
import { Re } from "../../../../runtime/bun-runtime.js";
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

//@ chunk-1ny7cxrt.js:1342433-1342465 placement
/**
 * 懒加载的 lodash-style memoize 模块。
 */
var nodeHttpHandlerModule = Re(require_node_http_handler(), 1);
var memoizeModule = Re(require_property_provider(), 1);
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
function toAwsSessionName(e) {
  if (/\p{Surrogate}/u.test(e)) return null;
  let t = "";
  for (let n of e)
    t += /^[\w+,.@-]$/.test(n)
      ? n
      : Array.from(
          new TextEncoder().encode(n),
          (o) => `=${o.toString(16).toUpperCase().padStart(2, "0")}`,
        ).join("");
  if (t.length > 64) t = `${t.slice(0, 42)}=-${createHash("sha256").update(e).digest("hex").slice(0, 20)}`;
  return t.length >= 2 ? t : null;
}
//@ chunk-1ny7cxrt.js:1342890-1342974 placement
/**
 * 把 assumed-role ARN 里的会话名脱敏成 <session>。
 */
function redactAwsSessionName(e) {
  return e.replace(/(assumed-role\/[^/\s]+\/)[^\s"']+/g, "$1<session>");
}
//@ chunk-1ny7cxrt.js:1342974-1345635 placement
/**
 * 为 AWS 上游（Bedrock/mantle）创建按用户的 assume-role 凭据提供者。
 */
async function createAwsCredentialProvider(e) {
  let { upstreamName, region, roleArn } = e;
  let maxUsers = e.maxUsers ?? DEFAULT_MAX_USERS;
  if (!/^[a-z0-9-]+$/.test(region)) throw Error("region is not a plain AWS region name");
  let s = env.AWS_USE_FIPS_ENDPOINT === "true" && !e.stsEndpoint;
  let a = s && !region.startsWith("us-gov-") ? "sts-fips" : "sts";
  let l = e.stsEndpoint ?? `https://${a}.${region}.amazonaws.com`;
  let clientConfig = {
    region,
    ...(s
      ? {
          useFipsEndpoint: true,
        }
      : {
          endpoint: l,
        }),
    requestHandler:
      (await getAWSProxyRequestHandler({
        url: l,
        requestTimeoutMs: AWS_REQUEST_TIMEOUT_MS,
      })) ??
      new nodeHttpHandlerModule.NodeHttpHandler({
        httpsAgent: getMTLSAgent(),
        requestTimeout: AWS_REQUEST_TIMEOUT_MS,
        throwOnRequestTimeout: true,
      }),
    maxAttempts: 2,
  };
  let u =
    e.sourceCredentials ??
    (env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE
      ? undefined
      : async (N) => (await getDefaultAwsProviderChain(region))(N));
  let { fromTemporaryCredentials } = await import("./chunk-thwbpw6e.js");
  function h(RoleSessionName) {
    return memoizeModule.memoize(
      fromTemporaryCredentials({
        ...(u && {
          masterCredentials: u,
        }),
        params: {
          RoleArn: roleArn,
          RoleSessionName,
          ...(e.externalId && {
            ExternalId: e.externalId,
          }),
        },
        clientConfig,
      }),
      (Z) => (Z.expiration?.getTime() ?? 0) - Date.now() < CREDENTIAL_REFRESH_SKEW_MS,
    );
  }
  let m;
  let y = (N) => m.credentials(N);
  let client = e.buildClient(y);
  let w = () => ({
    client,
    credentials: h(CLAUDE_APPS_GATEWAY),
    createdAt: Date.now(),
  });
  m = w();
  let S = new Map();
  function j(N) {
    let Z = h(N);
    let F = {
      client: e.buildClient(Z),
      credentials: Z,
      createdAt: Date.now(),
    };
    if (S.size >= maxUsers) S.delete(S.keys().next().value);
    S.set(N, F);
    return F;
  }
  function M(N, Z) {
    if (N === m) {
      m = w();
      return true;
    }
    return S.get(Z) === N && S.delete(Z);
  }
  return {
    sharedClient: client,
    countTokensCredentials: () => h(CLAUDE_APPS_GATEWAY),
    async clientFor(N) {
      let Z = m;
      let F = CLAUDE_APPS_GATEWAY;
      let X = "the shared session";
      if (e.sessionNameClaim && N) {
        let Me = e.sessionNameClaim === "sub" ? N.sub : N.email;
        let ce = Me ? toAwsSessionName(Me) : null;
        if (!ce || ce === CLAUDE_APPS_GATEWAY)
          throw Error(
            `upstream ${upstreamName}: sub=${N.sub} has no usable ${e.sessionNameClaim} claim for assume_role.session_name (set session_name: sub, or oidc.email_claim); request not sent`,
          );
        Z = S.get(ce) ?? j(ce);
        F = ce;
        X = `sub=${N.sub}`;
      }
      let he = Z !== m;
      try {
        await Z.credentials();
      } catch (error) {
        if (
          !e.sourceCredentials &&
          isAwsCredentialError(error instanceof Error ? error.name : undefined, errorMessage(error))
        ) {
          invalidateDefaultAwsProviderChainDebounced(region);
          M(Z, F);
        }
        let ce = he ? errorMessage(error).replaceAll(F, "<session>") : errorMessage(error);
        let Ne = error instanceof Error ? error.name : "Error";
        let be =
          Ne === "EndpointError"
            ? "for FIPS endpoints set AWS_USE_FIPS_ENDPOINT=true in the gateway's environment (not use_fips_endpoint in an AWS config file) and unset AWS_ENDPOINT_URL and AWS_ENDPOINT_URL_STS. Dual-stack endpoints are not supported here: unset AWS_USE_DUALSTACK_ENDPOINT"
            : `the gateway's AWS identity has sts:AssumeRole on that role, the role's trust policy trusts that identity, with the same external ID as external_id if it requires one, and ${s ? `the regional STS FIPS endpoint for ${region}` : l} is reachable`;
        throw Error(
          `upstream ${upstreamName}: sts:AssumeRole on ${roleArn} for ${X} failed (${Ne}: ${ce}); request not sent; the gateway's own credentials were not used instead. Check: ${be}.`,
        );
      }
      return {
        client: Z.client,
        invalidate: () => Date.now() - Z.createdAt >= CLIENT_RECREATE_MS && M(Z, F),
      };
    },
  };
}
export { createAwsCredentialProvider, redactAwsSessionName };
