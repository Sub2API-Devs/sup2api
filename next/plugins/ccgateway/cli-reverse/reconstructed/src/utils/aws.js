/**
 * utils/aws.ts
 *
 * AWS 辅助：STS 凭证形状校验、GetCallerIdentity 检查凭证、清 ini 凭证缓存、CredentialsProviderError 判断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/aws.ts
 * pieces: chunk-7kayq7nc.js (10), chunk-te3thhf2.js (3)
 * attribution: fingerprint 4, placement 2, layout 5, sole-consumer 2
 */
import { findInCauseChain, errorMessage } from "./errors.js";
import { env } from "./env.js";
import { __toESM } from "../../runtime/bun-runtime.js";
import { resolveAwsRegion } from "./awsRegion.js";
import {
  getAWSClientProxyConfig,
  resolveStsEndpointForProxyUrl,
  getAWSProxyRequestHandler,
} from "./proxy.js";
import { withTimeout } from "./sleep.js";
import { logForDebugging } from "./debug.js";
import { require_sts } from "../../vendor/@aws-sdk/nested-clients/dist-cjs/submodules/sts/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:155318-155397 fingerprint (2.1.88 match: isAwsCredentialsProviderError, 1)
function isAwsCredentialsProviderError(err) {
  return findInCauseChain(err, (cause) => cause.name === "CredentialsProviderError") !== undefined;
}
//@ chunk-7kayq7nc.js:155397-155671 placement
var AWS_AUTH_ERROR_PATTERN =
  /ExpiredToken|InvalidSignature|SignatureDoesNotMatch|UnrecognizedClient|InvalidClientTokenId|security token.*(invalid|expired)|signature we calculated does not match|Bearer Token has expired|Authentication failed.*API Key|Missing required parameters in the API Key/i;
//@ chunk-7kayq7nc.js:156611-156665 placement
function isAwsCredentialError(name, message) {
  return AWS_AUTH_ERROR_PATTERN.test(`${name ?? ""} ${message ?? ""}`);
}
//@ chunk-7kayq7nc.js:156950-157196 fingerprint (2.1.88 match: isValidAwsStsOutput, 0.85)
/**
 * 校验对象是否为 STS 凭证形状（AccessKeyId/SecretAccessKey/SessionToken 字符串）。
 */
function isValidAwsStsOutput(obj) {
  if (!obj || typeof obj !== "object") return false;
  let credentials = obj;
  return (
    typeof credentials.AccessKeyId === "string" &&
    typeof credentials.SecretAccessKey === "string" &&
    typeof credentials.SessionToken === "string" &&
    credentials.AccessKeyId.length > 0 &&
    credentials.SecretAccessKey.length > 0 &&
    credentials.SessionToken.length > 0
  );
}
//@ chunk-7kayq7nc.js:157196-157331 layout
function extractStsCredentials(value) {
  if (!value || typeof value !== "object") return null;
  let record = value;
  if (isValidAwsStsOutput(record.Credentials)) return record.Credentials;
  if (isValidAwsStsOutput(record)) return record;
  return null;
}
//@ chunk-7kayq7nc.js:157331-157344 layout
var AWS_STS_TIMEOUT_MS = 30000;
//@ chunk-7kayq7nc.js:157344-157416 layout
function getAwsChainResolveTimeoutMs() {
  return env.CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS ?? 60000;
}
//@ chunk-7kayq7nc.js:157416-157799 layout
/**
 * 用 STS GetCallerIdentity 检查当前 AWS 凭证是否有效（先强制重读共享配置）。
 */
async function checkStsCallerIdentity() {
  let { loadSharedConfigFiles } = await import("../../vendor/@smithy/shared-ini-file-loader/default.js").then(
    (sdkModule) => __toESM(sdkModule.default, 1),
  );
  await loadSharedConfigFiles({
    ignoreCache: true,
  }).catch(() => {
    return;
  });
  let [{ STSClient, GetCallerIdentityCommand }, region] = await Promise.all([
    import("../../vendor/@aws-sdk/client-sts/dist-cjs/GetCallerIdentityCommand.lazy.js"),
    resolveAwsRegion(),
  ]);
  let client = new STSClient({
    region,
    ...(await getAWSClientProxyConfig({
      url: resolveStsEndpointForProxyUrl(region),
      region,
      requestTimeoutMs: AWS_STS_TIMEOUT_MS,
    })),
  });
  await withTimeout(client.send(new GetCallerIdentityCommand({})), getAwsChainResolveTimeoutMs(), "AWS STS");
}
//@ chunk-7kayq7nc.js:157799-158161 layout
async function getAwsProfileRegionHints() {
  let { loadSharedConfigFiles } = await import("../../vendor/@smithy/shared-ini-file-loader/default.js").then(
    (sdkModule) => __toESM(sdkModule.default, 1),
  );
  let files = await loadSharedConfigFiles().catch(() => {
    return;
  });
  let visited = new Set();
  let AWS_PROFILE = env.AWS_PROFILE || "default";
  while (files !== undefined && !visited.has(AWS_PROFILE)) {
    visited.add(AWS_PROFILE);
    let profile = {
      ...files.configFile[AWS_PROFILE],
      ...files.credentialsFile[AWS_PROFILE],
    };
    if (profile.credential_process) return true;
    if (!profile.source_profile) return false;
    AWS_PROFILE = profile.source_profile;
  }
  return false;
}
//@ chunk-7kayq7nc.js:158161-158612 fingerprint (2.1.88 match: clearAwsIniCache, 0.549)
/**
 * 清 AWS SDK 的 ini 凭证文件缓存，让刷新后的 ~/.aws/credentials 生效。
 */
async function clearAwsIniCache() {
  try {
    logForDebugging("Clearing AWS credential provider cache");
    let [{ fromIni }, region] = await Promise.all([
      import("../../vendor/@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js"),
      resolveAwsRegion(),
    ]);
    let awsProxyRequestHandler = await getAWSProxyRequestHandler({
      url: resolveStsEndpointForProxyUrl(region),
      requestTimeoutMs: AWS_STS_TIMEOUT_MS,
    });
    let iniProvider = fromIni({
      ignoreCache: true,
      ...(awsProxyRequestHandler && {
        clientConfig: {
          requestHandler: awsProxyRequestHandler,
        },
        parentClientConfig: {
          requestHandler: awsProxyRequestHandler,
          region,
        },
      }),
    });
    await withTimeout(iniProvider(), getAwsChainResolveTimeoutMs(), "AWS ini cache refresh");
    logForDebugging("AWS credential provider cache refreshed");
  } catch (error) {
    logForDebugging(`Failed to refresh AWS credential cache: ${errorMessage(error)}`);
  }
}
//@ chunk-te3thhf2.js:544-560 sole-consumer
/**
 * 惰性加载的 AWS SDK（共享配置文件读取）模块。
 */
var awsSdkModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-te3thhf2.js:544", () => {
  awsSdkModule = __toESM(require_sts());
});
//@ chunk-te3thhf2.js:560-586 sole-consumer
var AssumeRoleCommand; // deferred: uses awsSdkModule of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-te3thhf2.js:560", () => {
  AssumeRoleCommand = awsSdkModule.AssumeRoleCommand;
});
//@ chunk-te3thhf2.js:586-604 fingerprint (2.1.88 match: checkStsCallerIdentity, 0.333)
var STSClient; // deferred: uses awsSdkModule of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-te3thhf2.js:586", () => {
  STSClient = awsSdkModule.STSClient;
});
export {
  isAwsCredentialError,
  getAwsChainResolveTimeoutMs,
  checkStsCallerIdentity,
  getAwsProfileRegionHints,
  extractStsCredentials,
  clearAwsIniCache,
  isAwsCredentialsProviderError,
  AssumeRoleCommand,
  STSClient,
};
