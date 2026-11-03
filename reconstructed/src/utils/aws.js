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
import { Wns } from "../../vendor/@aws-sdk/nested-clients/dist-cjs/submodules/sts/index.js";

//@ chunk-bwbq4xvm.js:156069-156148 fingerprint = isAwsCredentialsProviderError (1)
function isAwsCredentialsProviderError(err) {
  return findInCauseChain(err, (s) => s.name === "CredentialsProviderError") !== void 0;
}
//@ chunk-bwbq4xvm.js:156148-156422 placement
var AWS_AUTH_ERROR_PATTERN =
  /ExpiredToken|InvalidSignature|SignatureDoesNotMatch|UnrecognizedClient|InvalidClientTokenId|security token.*(invalid|expired)|signature we calculated does not match|Bearer Token has expired|Authentication failed.*API Key|Missing required parameters in the API Key/i;
//@ chunk-bwbq4xvm.js:157362-157416 placement
function isAwsCredentialError(e, s) {
  return AWS_AUTH_ERROR_PATTERN.test(`${e ?? ""} ${s ?? ""}`);
}
/**
 * 校验对象是否为 STS 凭证形状（AccessKeyId/SecretAccessKey/SessionToken 字符串）。
 */
//@ chunk-bwbq4xvm.js:157701-157947 fingerprint = isValidAwsStsOutput (0.85)
function isValidAwsStsOutput(obj) {
  if (!obj || typeof obj !== "object") return !1;
  let output = obj;
  return (
    typeof output.AccessKeyId === "string" &&
    typeof output.SecretAccessKey === "string" &&
    typeof output.SessionToken === "string" &&
    output.AccessKeyId.length > 0 &&
    output.SecretAccessKey.length > 0 &&
    output.SessionToken.length > 0
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
/**
 * 用 STS GetCallerIdentity 检查当前 AWS 凭证是否有效（先强制重读共享配置）。
 */
//@ chunk-bwbq4xvm.js:158167-158550 layout
async function checkStsCallerIdentity() {
  let { loadSharedConfigFiles: loadSharedConfigFiles } = await import("./chunk-72ngr4xp.js").then((m) =>
    Re(m.default, 1),
  );
  await loadSharedConfigFiles({ ignoreCache: !0 }).catch(() => {
    return;
  });
  let [{ STSClient: s, GetCallerIdentityCommand: n }, r] = await Promise.all([
      import("./chunk-heg39xxp.js"),
      resolveAwsRegion(),
    ]),
    a = new s({
      region: r,
      ...(await getAWSClientProxyConfig({
        url: resolveStsEndpointForProxyUrl(r),
        region: r,
        requestTimeoutMs: AWS_STS_TIMEOUT_MS,
      })),
    });
  await withTimeout(a.send(new n({})), getAwsChainResolveTimeoutMs(), "AWS STS");
}
//@ chunk-bwbq4xvm.js:158550-158912 layout
async function getAwsProfileRegionHints() {
  let { loadSharedConfigFiles: loadSharedConfigFiles } = await import("./chunk-72ngr4xp.js").then((m) =>
      Re(m.default, 1),
    ),
    s = await loadSharedConfigFiles().catch(() => {
      return;
    }),
    n = new Set(),
    r = env.AWS_PROFILE || "default";
  while (s !== void 0 && !n.has(r)) {
    n.add(r);
    let a = { ...s.configFile[r], ...s.credentialsFile[r] };
    if (a.credential_process) return !0;
    if (!a.source_profile) return !1;
    r = a.source_profile;
  }
  return !1;
}
/**
 * 清 AWS SDK 的 ini 凭证文件缓存，让刷新后的 ~/.aws/credentials 生效。
 */
//@ chunk-bwbq4xvm.js:158912-159363 fingerprint = clearAwsIniCache (0.549)
async function clearAwsIniCache() {
  try {
    logForDebugging("Clearing AWS credential provider cache");
    let [{ fromIni: e }, s] = await Promise.all([import("./chunk-thwbpw6e.js"), resolveAwsRegion()]),
      n = await getAWSProxyRequestHandler({
        url: resolveStsEndpointForProxyUrl(s),
        requestTimeoutMs: AWS_STS_TIMEOUT_MS,
      }),
      iniProvider = e({
        ignoreCache: !0,
        ...(n && {
          clientConfig: { requestHandler: n },
          parentClientConfig: { requestHandler: n, region: s },
        }),
      });
    (await withTimeout(iniProvider(), getAwsChainResolveTimeoutMs(), "AWS ini cache refresh"),
      logForDebugging("AWS credential provider cache refreshed"));
  } catch (error) {
    logForDebugging(`Failed to refresh AWS credential cache: ${errorMessage(error)}`);
  }
}
//@ chunk-nm3tp7ry.js:544-560 sole-consumer
var m = Re(Wns());
//@ chunk-nm3tp7ry.js:560-586 sole-consumer
var AssumeRoleCommand = m.AssumeRoleCommand;
//@ chunk-nm3tp7ry.js:586-604 fingerprint = checkStsCallerIdentity (0.333)
var STSClient = m.STSClient;

export {
  checkStsCallerIdentity,
  getAwsProfileRegionHints,
  extractStsCredentials,
  clearAwsIniCache,
  isAwsCredentialError,
  isAwsCredentialsProviderError,
  getAwsChainResolveTimeoutMs,
};
