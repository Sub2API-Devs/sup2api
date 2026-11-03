/**
 * utils/model/bedrock.ts
 *
 * AWS Bedrock：创建 Bedrock/BedrockRuntime 客户端、列出系统推理配置文件、解析推理配置文件背后的模型、区域前缀（us/eu/apac/jp/au/us-gov/global）处理；另混入环境变量注册表的一段（chunk-jhrww53q）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/bedrock.ts
 * pieces: chunk-aepeg2w5.js (19), chunk-jhrww53q.js (1)
 * attribution: fingerprint 8, layout 1, file-local 1, placement 10
 */
import { logForDebugging } from "../debug.js";
import { resolveAwsRegion } from "../awsRegion.js";
import { env } from "../env.js";
import { getAWSClientProxyConfig } from "../proxy.js";
import { xc } from "../../services/analytics/telemetryCredentialGuard.js";
import {
  isHostManagedProviderAuth,
  hostManagedAwsSdkCredentials,
  refreshAndGetAwsCredentials,
  getDefaultAwsProviderChain,
} from "../auth.js";
import { getAPIProvider } from "./providers.js";
import { Bn } from "./modelIds.js";
import { getProviderState, clearModelBetas } from "./providerCaches.js";
import {
  getInferenceProfileBackingModelCached,
  setInferenceProfileBackingModel,
} from "../../bootstrap/state.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { Re } from "../../../runtime/bun-runtime.js";

/**
 * 分页列出 SYSTEM_DEFINED 推理配置文件（ListInferenceProfilesCommand，8 秒超时）。
 */
//@ chunk-aepeg2w5.js:130738-131314 fingerprint = getBedrockInferenceProfiles (0.734)
async function getBedrockInferenceProfiles_2() {
  let [e, { ListInferenceProfilesCommand: n }] = await Promise.all([
      createBedrockClient(),
      import("./chunk-0dmzgg46.js"),
    ]),
    allProfiles = [],
    nextToken;
  try {
    do {
      let command = new n({ ...(nextToken && { nextToken: nextToken }), typeEquals: "SYSTEM_DEFINED" }),
        send = await e.send(command, { abortSignal: AbortSignal.timeout(8000) });
      if (send.inferenceProfileSummaries) allProfiles.push(...send.inferenceProfileSummaries);
      nextToken = send.nextToken;
    } while (nextToken);
    return allProfiles
      .filter((profile) => profile.inferenceProfileId?.includes("anthropic"))
      .map((profile) => profile.inferenceProfileId)
      .filter(Boolean);
  } catch (error) {
    throw (
      logForDebugging(
        `Bedrock ListInferenceProfiles failed: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      error
    );
  }
}
/**
 * profile id 中含模型 id，且其后不是继续的版本数字（避免 4-5 匹配 4-50）。
 */
//@ chunk-aepeg2w5.js:131314-131458 layout
function containsModelIdAtBoundary(e, n) {
  let r = 0;
  for (;;) {
    let index = e.indexOf(n, r);
    if (index === -1) return !1;
    if (!/^(?:\d|-\d{1,2}(?!\d))/.test(e.slice(index + n.length))) return !0;
    r = index + 1;
  }
}
/**
 * 在 profile 列表里找包含模型 id 的项，优先指定区域前缀。
 */
//@ chunk-aepeg2w5.js:131458-131582 file-local
function findFirstMatch(e, n, r) {
  if (r) {
    let found = e.find((h) => h.startsWith(`${r}.`) && containsModelIdAtBoundary(h, n));
    if (found) return found;
  }
  return e.find((s) => containsModelIdAtBoundary(s, n)) ?? null;
}
/**
 * 创建 Bedrock 控制面客户端（区域、ANTHROPIC_BEDROCK_BASE_URL 端点、代理配置；CLAUDE_CODE_SKIP_BEDROCK_AUTH 时跳过签名）。
 */
//@ chunk-aepeg2w5.js:131582-132484 fingerprint = createBedrockClient (0.612)
async function createBedrockClient() {
  let { BedrockClient: BedrockClient } = await import("./chunk-0dmzgg46.js"),
    n = await resolveAwsRegion(),
    CLAUDE_CODE_SKIP_BEDROCK_AUTH = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH,
    s = await getAWSClientProxyConfig({
      url: env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock.${n}.amazonaws.com`,
      region: n,
    }),
    clientConfig = {
      region: n,
      ...(env.ANTHROPIC_BEDROCK_BASE_URL && { endpoint: env.ANTHROPIC_BEDROCK_BASE_URL }),
      ...s,
      ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH && {
        ...(!("requestHandler" in s) && { requestHandler: new xc.NodeHttpHandler() }),
        httpAuthSchemes: [
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: () => async () => ({}),
            signer: new (await loadNoAuthSigner())(),
          },
        ],
        httpAuthSchemeProvider: () => [{ schemeId: "smithy.api#noAuth" }],
      }),
    };
  if (!CLAUDE_CODE_SKIP_BEDROCK_AUTH && !env.AWS_BEARER_TOKEN_BEDROCK)
    if (((clientConfig.authSchemePreference = ["sigv4"]), isHostManagedProviderAuth()))
      clientConfig.credentials = hostManagedAwsSdkCredentials("Bedrock").credentials;
    else {
      let cachedCredentials = await refreshAndGetAwsCredentials();
      if (cachedCredentials)
        clientConfig.credentials = {
          accessKeyId: cachedCredentials.accessKeyId,
          secretAccessKey: cachedCredentials.secretAccessKey,
          sessionToken: cachedCredentials.sessionToken,
        };
      else if (!env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE)
        clientConfig.credentials = async (S) => (await getDefaultAwsProviderChain(n))(S);
    }
  return new BedrockClient(clientConfig);
}
/**
 * 创建 Bedrock Runtime 客户端（同上，bedrock-runtime 端点）。
 */
//@ chunk-aepeg2w5.js:132484-133402 fingerprint = createBedrockRuntimeClient (0.614)
async function createBedrockRuntimeClient() {
  let { BedrockRuntimeClient: BedrockRuntimeClient } = await import("./chunk-nbmkwhd6.js"),
    n = await resolveAwsRegion(),
    CLAUDE_CODE_SKIP_BEDROCK_AUTH = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH,
    s = await getAWSClientProxyConfig({
      url: env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock-runtime.${n}.amazonaws.com`,
      region: n,
    }),
    clientConfig = {
      region: n,
      ...(env.ANTHROPIC_BEDROCK_BASE_URL && { endpoint: env.ANTHROPIC_BEDROCK_BASE_URL }),
      ...s,
      ...(CLAUDE_CODE_SKIP_BEDROCK_AUTH && {
        ...(!("requestHandler" in s) && { requestHandler: new xc.NodeHttpHandler() }),
        httpAuthSchemes: [
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: () => async () => ({}),
            signer: new (await loadNoAuthSigner())(),
          },
        ],
        httpAuthSchemeProvider: () => [{ schemeId: "smithy.api#noAuth" }],
      }),
    };
  if (!CLAUDE_CODE_SKIP_BEDROCK_AUTH && !env.AWS_BEARER_TOKEN_BEDROCK)
    if (((clientConfig.authSchemePreference = ["sigv4"]), isHostManagedProviderAuth()))
      clientConfig.credentials = hostManagedAwsSdkCredentials("Bedrock").credentials;
    else {
      let cachedCredentials = await refreshAndGetAwsCredentials();
      if (cachedCredentials)
        clientConfig.credentials = {
          accessKeyId: cachedCredentials.accessKeyId,
          secretAccessKey: cachedCredentials.secretAccessKey,
          sessionToken: cachedCredentials.sessionToken,
        };
      else if (!env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE)
        clientConfig.credentials = async (S) => (await getDefaultAwsProviderChain(n))(S);
    }
  return new BedrockRuntimeClient(clientConfig);
}
/**
 * 取 Bedrock 推理配置的底层模型（缓存）。
 */
//@ chunk-aepeg2w5.js:133642-133823 placement
function getInferenceProfileBackingModel(e) {
  if (getAPIProvider() !== "bedrock") return Promise.resolve(null);
  let n = Bn(e),
    inferenceProfileBackingModels = getProviderState().providerCache.inferenceProfileBackingModels,
    s = inferenceProfileBackingModels.get(n);
  if (s === void 0) ((s = getInferenceProfileBackingModel_2(n)), inferenceProfileBackingModels.set(n, s));
  return s;
}
//@ chunk-aepeg2w5.js:133823-133890 placement
function Oos(e) {
  return e.includes("application-inference-profile");
}
/**
 * 是否为未解析的推理配置 ARN。
 */
//@ chunk-aepeg2w5.js:133890-133950 placement
function isUnresolvedInferenceProfile(e) {
  return Oos(e) && typeof getInferenceProfileBackingModelCached(Bn(e)) !== "string";
}
/**
 * 查询推理配置文件背后的模型 id（GetInferenceProfileCommand，取第一个 modelArn 的最后一段）。
 */
//@ chunk-aepeg2w5.js:133950-134434 fingerprint = getInferenceProfileBackingModel (0.641)
async function getInferenceProfileBackingModel_2(profileId) {
  let n = null;
  try {
    let [r, { GetInferenceProfileCommand: s }] = await Promise.all([
        createBedrockClient(),
        import("./chunk-0dmzgg46.js"),
      ]),
      y = (
        await r.send(new s({ inferenceProfileIdentifier: profileId }), {
          abortSignal: AbortSignal.timeout(8000),
        })
      ).models?.[0]?.modelArn;
    if (y) {
      let lastSlashIndex = y.lastIndexOf("/");
      n = lastSlashIndex >= 0 ? y.substring(lastSlashIndex + 1) : y;
    }
  } catch (error) {
    logForDebugging(
      `Failed to resolve Bedrock inference profile backing model for ${profileId}: ${error instanceof Error ? error.message : String(error)}`,
      { level: "error" },
    );
  }
  return (setInferenceProfileBackingModel(profileId, n), clearModelBetas((r) => Bn(r) === profileId), n);
}
/**
 * 模型 id 是否 Bedrock 基础模型（anthropic. 开头）。
 */
//@ chunk-aepeg2w5.js:134434-134484 fingerprint = isFoundationModel (1)
function isFoundationModel(modelId) {
  return modelId.startsWith("anthropic.");
}
/**
 * ARN 取最后一段为模型 id，非 ARN 原样返回。
 */
//@ chunk-aepeg2w5.js:134484-134602 fingerprint = extractModelIdFromArn (1)
function extractModelIdFromArn(modelId) {
  if (!modelId.startsWith("arn:")) return modelId;
  let lastSlashIndex = modelId.lastIndexOf("/");
  if (lastSlashIndex === -1) return modelId;
  return modelId.substring(lastSlashIndex + 1);
}
/**
 * 模型 id 的 Bedrock 区域前缀（us/eu/… 中匹配 "<前缀>.anthropic." 的那个）。
 */
//@ chunk-aepeg2w5.js:134602-134698 fingerprint = getBedrockRegionPrefix (1)
function getBedrockRegionPrefix_2(modelId) {
  let effectiveModelId = extractModelIdFromArn(modelId);
  for (let prefix of BEDROCK_REGION_PREFIXES)
    if (effectiveModelId.startsWith(`${prefix}.anthropic.`)) return prefix;
  return;
}
/**
 * 替换/添加 Bedrock 区域前缀。
 */
//@ chunk-aepeg2w5.js:134698-134805 placement
function withBedrockRegionPrefix(modelId, prefix) {
  let existingPrefix = getBedrockRegionPrefix_2(modelId);
  if (existingPrefix) return modelId.replace(`${existingPrefix}.`, `${prefix}.`);
  if (isFoundationModel(modelId)) return `${prefix}.${modelId}`;
  return modelId;
}
/**
 * AWS 区域对应的 Bedrock 区域组。
 */
//@ chunk-aepeg2w5.js:134805-134994 placement
function bedrockRegionGroup(e) {
  let n = e ?? "";
  if (n.startsWith("us-gov-")) return "us-gov";
  if (n.startsWith("us-")) return "us";
  if (n.startsWith("eu-")) return "eu";
  if (n.startsWith("ap-")) return "apac";
  return "global";
}
/**
 * 返回 Bedrock 区域前缀：us-gov 区域固定，其他取环境变量或区域组。
 */
//@ chunk-aepeg2w5.js:134994-135102 placement
function getBedrockRegionPrefix(e) {
  if (e?.startsWith("us-gov-")) return "us-gov";
  return env.ANTHROPIC_BEDROCK_REGION_PREFIX ?? bedrockRegionGroup(e);
}
//@ chunk-aepeg2w5.js:135102-135238 placement
async function loadNoAuthSigner() {
  let e = await import("./chunk-ayrvc8dg.js").then((m) => Re(m.default, 1));
  return e.NoAuthSigner ?? e.default?.NoAuthSigner;
}
//@ chunk-aepeg2w5.js:135238-135262 placement
function nI(e) {
  return e;
}
//@ chunk-aepeg2w5.js:135262-135324 placement
var regExp_2 = new RegExp(`^(?:${BEDROCK_REGION_PREFIXES.join("|")})\\.(anthropic\\..+)$`);
//@ chunk-aepeg2w5.js:135324-135402 placement
function bD(e) {
  let n = regExp_2.exec(e)?.[1] ?? e;
  return [n, ...BEDROCK_REGION_PREFIXES.map((r) => `${r}.${n}`)];
}
/**
 * ANTHROPIC_BEDROCK_REGION_PREFIX 的可选值。
 */
//@ chunk-jhrww53q.js:73703-73797 fingerprint = BEDROCK_REGION_PREFIXES (0.782)
var BEDROCK_REGION_PREFIXES = ["us", "eu", "apac", "jp", "au", "us-gov", "global"],
  BEDROCK_REGION_PREFIX_ENV_VALUES = ["us", "eu", "apac", "jp", "au", "global"];

export {
  nI,
  getInferenceProfileBackingModel,
  BEDROCK_REGION_PREFIXES,
  extractModelIdFromArn,
  getBedrockRegionPrefix_2,
  isFoundationModel,
  bedrockRegionGroup,
  isUnresolvedInferenceProfile,
  withBedrockRegionPrefix,
  getBedrockInferenceProfiles_2,
  createBedrockRuntimeClient,
  Oos,
  bD,
  getBedrockRegionPrefix,
  findFirstMatch,
  BEDROCK_REGION_PREFIX_ENV_VALUES,
};
