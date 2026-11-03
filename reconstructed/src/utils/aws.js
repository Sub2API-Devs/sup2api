/**
 * utils/aws.ts
 *
 * AWS 辅助：STS 凭证形状校验、GetCallerIdentity 检查凭证、清 ini 凭证缓存、CredentialsProviderError 判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/aws.ts
 * pieces: chunk-bwbq4xvm.js (10), chunk-nm3tp7ry.js (3)
 * attribution: fingerprint 4, placement 2, layout 5, sole-consumer 2
 */
import { findInCauseChain, errorMessage } from "./errors.js";
import { env } from "./env.js";
import { Re } from "../../runtime/bun-runtime.js";
import { resolveAwsRegion } from "./awsRegion.js";
import {
  getAWSClientProxyConfig,
  resolveStsEndpointForProxyUrl,
  getAWSProxyRequestHandler,
} from "./proxy.js";
import { withTimeout } from "./sleep.js";
import { logForDebugging } from "./debug.js";
import { require_sts } from "../../vendor/@aws-sdk/nested-clients/dist-cjs/submodules/sts/index.js";

//@ chunk-bwbq4xvm.js:156069-156148 fingerprint = isAwsCredentialsProviderError (1)
function isAwsCredentialsProviderError(err) {
  return findInCauseChain(err, (s) => s.name === "CredentialsProviderError") !== undefined;
}
//@ chunk-bwbq4xvm.js:156148-156422 placement
var AWS_AUTH_ERROR_PATTERN =
  /ExpiredToken|InvalidSignature|SignatureDoesNotMatch|UnrecognizedClient|InvalidClientTokenId|security token.*(invalid|expired)|signature we calculated does not match|Bearer Token has expired|Authentication failed.*API Key|Missing required parameters in the API Key/i;
//@ chunk-bwbq4xvm.js:157362-157416 placement
function isAwsCredentialError(e, message) {
  return AWS_AUTH_ERROR_PATTERN.test(`${e ?? ""} ${message ?? ""}`);
}
//@ chunk-bwbq4xvm.js:157701-157947 fingerprint = isValidAwsStsOutput (0.85)
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
//@ chunk-bwbq4xvm.js:157947-158082 layout
function extractStsCredentials(e) {
  if (!e || typeof e !== "object") return null;
  let s = e;
  if (isValidAwsStsOutput(s.Credentials)) return s.Credentials;
  if (isValidAwsStsOutput(s)) return s;
  return null;
}
//@ chunk-bwbq4xvm.js:158082-158095 layout
var AWS_STS_TIMEOUT_MS = 30000;
//@ chunk-bwbq4xvm.js:158095-158167 layout
function getAwsChainResolveTimeoutMs() {
  return env.CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS ?? 60000;
}
//@ chunk-bwbq4xvm.js:158167-158550 layout
/**
 * 用 STS GetCallerIdentity 检查当前 AWS 凭证是否有效（先强制重读共享配置）。
 */
async function checkStsCallerIdentity() {
  let { loadSharedConfigFiles } = await import("./chunk-72ngr4xp.js").then((m) => Re(m.default, 1));
  await loadSharedConfigFiles({
    ignoreCache: true,
  }).catch(() => {
    return;
  });
  let [{ STSClient: s, GetCallerIdentityCommand: n }, awsRegion] = await Promise.all([
    import("./chunk-heg39xxp.js"),
    resolveAwsRegion(),
  ]);
  let a = new s({
    region: awsRegion,
    ...(await getAWSClientProxyConfig({
      url: resolveStsEndpointForProxyUrl(awsRegion),
      region: awsRegion,
      requestTimeoutMs: AWS_STS_TIMEOUT_MS,
    })),
  });
  await withTimeout(a.send(new n({})), getAwsChainResolveTimeoutMs(), "AWS STS");
}
//@ chunk-bwbq4xvm.js:158550-158912 layout
async function getAwsProfileRegionHints() {
  let { loadSharedConfigFiles } = await import("./chunk-72ngr4xp.js").then((m) => Re(m.default, 1));
  let s = await loadSharedConfigFiles().catch(() => {
    return;
  });
  let n = new Set();
  let AWS_PROFILE = env.AWS_PROFILE || "default";
  while (s !== undefined && !n.has(AWS_PROFILE)) {
    n.add(AWS_PROFILE);
    let a = {
      ...s.configFile[AWS_PROFILE],
      ...s.credentialsFile[AWS_PROFILE],
    };
    if (a.credential_process) return true;
    if (!a.source_profile) return false;
    AWS_PROFILE = a.source_profile;
  }
  return false;
}
//@ chunk-bwbq4xvm.js:158912-159363 fingerprint = clearAwsIniCache (0.549)
/**
 * 清 AWS SDK 的 ini 凭证文件缓存，让刷新后的 ~/.aws/credentials 生效。
 */
async function clearAwsIniCache() {
  try {
    logForDebugging("Clearing AWS credential provider cache");
    let [{ fromIni }, awsRegion] = await Promise.all([import("./chunk-thwbpw6e.js"), resolveAwsRegion()]);
    let awsProxyRequestHandler = await getAWSProxyRequestHandler({
      url: resolveStsEndpointForProxyUrl(awsRegion),
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
          region: awsRegion,
        },
      }),
    });
    await withTimeout(iniProvider(), getAwsChainResolveTimeoutMs(), "AWS ini cache refresh");
    logForDebugging("AWS credential provider cache refreshed");
  } catch (error) {
    logForDebugging(`Failed to refresh AWS credential cache: ${errorMessage(error)}`);
  }
}
//@ chunk-nm3tp7ry.js:544-560 sole-consumer
/**
 * 惰性加载的 AWS SDK（共享配置文件读取）模块。
 */
var awsSdkModule = Re(require_sts());
//@ chunk-nm3tp7ry.js:560-586 sole-consumer
var AssumeRoleCommand = awsSdkModule.AssumeRoleCommand;
//@ chunk-nm3tp7ry.js:586-604 fingerprint = checkStsCallerIdentity (0.333)
var STSClient = awsSdkModule.STSClient;
export {
  checkStsCallerIdentity,
  getAwsProfileRegionHints,
  extractStsCredentials,
  clearAwsIniCache,
  isAwsCredentialError,
  isAwsCredentialsProviderError,
  getAwsChainResolveTimeoutMs,
};
