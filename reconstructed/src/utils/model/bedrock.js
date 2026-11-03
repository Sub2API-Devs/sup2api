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
import { apiKeyForHostGuard } from "../../services/analytics/telemetryCredentialGuard.js";
import {
  isHostManagedProviderAuth,
  hostManagedAwsSdkCredentials,
  refreshAndGetAwsCredentials,
  getDefaultAwsProviderChain,
} from "../auth.js";
import { getAPIProvider } from "./providers.js";
import { stripAnyVersatileSuffix } from "./modelIds.js";
import { getProviderState, clearModelBetas } from "./providerCaches.js";
import {
  getInferenceProfileBackingModelCached,
  setInferenceProfileBackingModel,
} from "../../bootstrap/state.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { Re } from "../../../runtime/bun-runtime.js";

//@ chunk-aepeg2w5.js:130738-131314 fingerprint = getBedrockInferenceProfiles (0.734)
/**
 * 分页列出 SYSTEM_DEFINED 推理配置文件（ListInferenceProfilesCommand，8 秒超时）。
 */
async function getBedrockInferenceProfiles_2() {
  let [client, { ListInferenceProfilesCommand }] = await Promise.all([
    createBedrockClient(),
    import("./chunk-0dmzgg46.js"),
  ]);
  let allProfiles = [];
  let nextToken;
  try {
    do {
      let command = new ListInferenceProfilesCommand({
        ...(nextToken && {
          nextToken,
        }),
        typeEquals: "SYSTEM_DEFINED",
      });
      let response = await client.send(command, {
        abortSignal: AbortSignal.timeout(8000),
      });
      if (response.inferenceProfileSummaries) allProfiles.push(...response.inferenceProfileSummaries);
      nextToken = response.nextToken;
    } while (nextToken);
    return allProfiles
      .filter((profile) => profile.inferenceProfileId?.includes("anthropic"))
      .map((profile) => profile.inferenceProfileId)
      .filter(Boolean);
  } catch (error) {
    logForDebugging(
      `Bedrock ListInferenceProfiles failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    throw error;
  }
}
//@ chunk-aepeg2w5.js:131314-131458 layout
/**
 * profile id 中含模型 id，且其后不是继续的版本数字（避免 4-5 匹配 4-50）。
 */
function containsModelIdAtBoundary(e, n) {
  let r = 0;
  for (;;) {
    let index = e.indexOf(n, r);
    if (index === -1) return false;
    if (!/^(?:\d|-\d{1,2}(?!\d))/.test(e.slice(index + n.length))) return true;
    r = index + 1;
  }
}
//@ chunk-aepeg2w5.js:131458-131582 file-local
/**
 * 在 profile 列表里找包含模型 id 的项，优先指定区域前缀。
 */
function findFirstMatch(e, firstParty, bedrockRegionPrefix) {
  if (bedrockRegionPrefix) {
    let found = e.find(
      (h) => h.startsWith(`${bedrockRegionPrefix}.`) && containsModelIdAtBoundary(h, firstParty),
    );
    if (found) return found;
  }
  return e.find((s) => containsModelIdAtBoundary(s, firstParty)) ?? null;
}
//@ chunk-aepeg2w5.js:131582-132484 fingerprint = createBedrockClient (0.612)
/**
 * 创建 Bedrock 控制面客户端（区域、ANTHROPIC_BEDROCK_BASE_URL 端点、代理配置；CLAUDE_CODE_SKIP_BEDROCK_AUTH 时跳过签名）。
 */
async function createBedrockClient() {
  let { BedrockClient } = await import("./chunk-0dmzgg46.js");
  let awsRegion = await resolveAwsRegion();
  let skipAuth = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH;
  let awsClientProxyConfig = await getAWSClientProxyConfig({
    url: env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock.${awsRegion}.amazonaws.com`,
    region: awsRegion,
  });
  let clientConfig = {
    region: awsRegion,
    ...(env.ANTHROPIC_BEDROCK_BASE_URL && {
      endpoint: env.ANTHROPIC_BEDROCK_BASE_URL,
    }),
    ...awsClientProxyConfig,
    ...(skipAuth && {
      ...(!("requestHandler" in awsClientProxyConfig) && {
        requestHandler: new apiKeyForHostGuard.NodeHttpHandler(),
      }),
      httpAuthSchemes: [
        {
          schemeId: "smithy.api#noAuth",
          identityProvider: () => async () => ({}),
          signer: new (await loadNoAuthSigner())(),
        },
      ],
      httpAuthSchemeProvider: () => [
        {
          schemeId: "smithy.api#noAuth",
        },
      ],
    }),
  };
  if (!skipAuth && !env.AWS_BEARER_TOKEN_BEDROCK) {
    clientConfig.authSchemePreference = ["sigv4"];
    if (isHostManagedProviderAuth())
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
        clientConfig.credentials = async (S) => (await getDefaultAwsProviderChain(awsRegion))(S);
    }
  }
  return new BedrockClient(clientConfig);
}
//@ chunk-aepeg2w5.js:132484-133402 fingerprint = createBedrockRuntimeClient (0.614)
/**
 * 创建 Bedrock Runtime 客户端（同上，bedrock-runtime 端点）。
 */
async function createBedrockRuntimeClient() {
  let { BedrockRuntimeClient } = await import("./chunk-nbmkwhd6.js");
  let awsRegion = await resolveAwsRegion();
  let skipAuth = env.CLAUDE_CODE_SKIP_BEDROCK_AUTH;
  let awsClientProxyConfig = await getAWSClientProxyConfig({
    url: env.ANTHROPIC_BEDROCK_BASE_URL || `https://bedrock-runtime.${awsRegion}.amazonaws.com`,
    region: awsRegion,
  });
  let clientConfig = {
    region: awsRegion,
    ...(env.ANTHROPIC_BEDROCK_BASE_URL && {
      endpoint: env.ANTHROPIC_BEDROCK_BASE_URL,
    }),
    ...awsClientProxyConfig,
    ...(skipAuth && {
      ...(!("requestHandler" in awsClientProxyConfig) && {
        requestHandler: new apiKeyForHostGuard.NodeHttpHandler(),
      }),
      httpAuthSchemes: [
        {
          schemeId: "smithy.api#noAuth",
          identityProvider: () => async () => ({}),
          signer: new (await loadNoAuthSigner())(),
        },
      ],
      httpAuthSchemeProvider: () => [
        {
          schemeId: "smithy.api#noAuth",
        },
      ],
    }),
  };
  if (!skipAuth && !env.AWS_BEARER_TOKEN_BEDROCK) {
    clientConfig.authSchemePreference = ["sigv4"];
    if (isHostManagedProviderAuth())
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
        clientConfig.credentials = async (S) => (await getDefaultAwsProviderChain(awsRegion))(S);
    }
  }
  return new BedrockRuntimeClient(clientConfig);
}
//@ chunk-aepeg2w5.js:133642-133823 placement
/**
 * 取 Bedrock 推理配置的底层模型（缓存）。
 */
function getInferenceProfileBackingModel(e) {
  if (getAPIProvider() !== "bedrock") return Promise.resolve(null);
  let profileId = stripAnyVersatileSuffix(e);
  let inferenceProfileBackingModels = getProviderState().providerCache.inferenceProfileBackingModels;
  let s = inferenceProfileBackingModels.get(profileId);
  if (s === undefined) {
    s = getInferenceProfileBackingModel_2(profileId);
    inferenceProfileBackingModels.set(profileId, s);
  }
  return s;
}
//@ chunk-aepeg2w5.js:133823-133890 placement
/**
 * 判断字符串是否包含 application-inference-profile（未解析的推理配置）。
 */
function isInferenceProfileArn(e) {
  return e.includes("application-inference-profile");
}
//@ chunk-aepeg2w5.js:133890-133950 placement
/**
 * 是否为未解析的推理配置 ARN。
 */
function isUnresolvedInferenceProfile(e) {
  return (
    isInferenceProfileArn(e) &&
    typeof getInferenceProfileBackingModelCached(stripAnyVersatileSuffix(e)) !== "string"
  );
}
//@ chunk-aepeg2w5.js:133950-134434 fingerprint = getInferenceProfileBackingModel (0.641)
/**
 * 查询推理配置文件背后的模型 id（GetInferenceProfileCommand，取第一个 modelArn 的最后一段）。
 */
async function getInferenceProfileBackingModel_2(profileId) {
  let n = null;
  try {
    let [bedrockClient, { GetInferenceProfileCommand }] = await Promise.all([
      createBedrockClient(),
      import("./chunk-0dmzgg46.js"),
    ]);
    let modelArn = (
      await bedrockClient.send(
        new GetInferenceProfileCommand({
          inferenceProfileIdentifier: profileId,
        }),
        {
          abortSignal: AbortSignal.timeout(8000),
        },
      )
    ).models?.[0]?.modelArn;
    if (modelArn) {
      let lastSlashIndex = modelArn.lastIndexOf("/");
      n = lastSlashIndex >= 0 ? modelArn.substring(lastSlashIndex + 1) : modelArn;
    }
  } catch (error) {
    logForDebugging(
      `Failed to resolve Bedrock inference profile backing model for ${profileId}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
  }
  setInferenceProfileBackingModel(profileId, n);
  clearModelBetas((r) => stripAnyVersatileSuffix(r) === profileId);
  return n;
}
//@ chunk-aepeg2w5.js:134434-134484 fingerprint = isFoundationModel (1)
/**
 * 模型 id 是否 Bedrock 基础模型（anthropic. 开头）。
 */
function isFoundationModel(modelId) {
  return modelId.startsWith("anthropic.");
}
//@ chunk-aepeg2w5.js:134484-134602 fingerprint = extractModelIdFromArn (1)
/**
 * ARN 取最后一段为模型 id，非 ARN 原样返回。
 */
function extractModelIdFromArn(modelId) {
  if (!modelId.startsWith("arn:")) return modelId;
  let lastSlashIndex = modelId.lastIndexOf("/");
  if (lastSlashIndex === -1) return modelId;
  return modelId.substring(lastSlashIndex + 1);
}
//@ chunk-aepeg2w5.js:134602-134698 fingerprint = getBedrockRegionPrefix (1)
/**
 * 模型 id 的 Bedrock 区域前缀（us/eu/… 中匹配 "<前缀>.anthropic." 的那个）。
 */
function getBedrockRegionPrefix_2(modelId) {
  let effectiveModelId = extractModelIdFromArn(modelId);
  for (let prefix of BEDROCK_REGION_PREFIXES)
    if (effectiveModelId.startsWith(`${prefix}.anthropic.`)) return prefix;
  return;
}
//@ chunk-aepeg2w5.js:134698-134805 placement
/**
 * 替换/添加 Bedrock 区域前缀。
 */
function withBedrockRegionPrefix(modelId, prefix) {
  let existingPrefix = getBedrockRegionPrefix_2(modelId);
  if (existingPrefix) return modelId.replace(`${existingPrefix}.`, `${prefix}.`);
  if (isFoundationModel(modelId)) return `${prefix}.${modelId}`;
  return modelId;
}
//@ chunk-aepeg2w5.js:134805-134994 placement
/**
 * AWS 区域对应的 Bedrock 区域组。
 */
function bedrockRegionGroup(e) {
  let n = e ?? "";
  if (n.startsWith("us-gov-")) return "us-gov";
  if (n.startsWith("us-")) return "us";
  if (n.startsWith("eu-")) return "eu";
  if (n.startsWith("ap-")) return "apac";
  return "global";
}
//@ chunk-aepeg2w5.js:134994-135102 placement
/**
 * 返回 Bedrock 区域前缀：us-gov 区域固定，其他取环境变量或区域组。
 */
function getBedrockRegionPrefix(awsRegion) {
  if (awsRegion?.startsWith("us-gov-")) return "us-gov";
  return env.ANTHROPIC_BEDROCK_REGION_PREFIX ?? bedrockRegionGroup(awsRegion);
}
//@ chunk-aepeg2w5.js:135102-135238 placement
async function loadNoAuthSigner() {
  let e = await import("./chunk-ayrvc8dg.js").then((m) => Re(m.default, 1));
  return e.NoAuthSigner ?? e.default?.NoAuthSigner;
}
//@ chunk-aepeg2w5.js:135238-135262 placement
/**
 * 模型 id 的恒等转换（此构建不做归一）。
 */
function identityModelId(e) {
  return e;
}
//@ chunk-aepeg2w5.js:135262-135324 placement
var regExp_2 = new RegExp(`^(?:${BEDROCK_REGION_PREFIXES.join("|")})\\.(anthropic\\..+)$`);
//@ chunk-aepeg2w5.js:135324-135402 placement
/**
 * 生成模型 id 的 Bedrock 区域变体列表。
 */
function bedrockRegionVariants(e) {
  let n = regExp_2.exec(e)?.[1] ?? e;
  return [n, ...BEDROCK_REGION_PREFIXES.map((r) => `${r}.${n}`)];
}
//@ chunk-jhrww53q.js:73703-73797 fingerprint = BEDROCK_REGION_PREFIXES (0.782)
/**
 * ANTHROPIC_BEDROCK_REGION_PREFIX 的可选值。
 */
var BEDROCK_REGION_PREFIXES = ["us", "eu", "apac", "jp", "au", "us-gov", "global"];
var BEDROCK_REGION_PREFIX_ENV_VALUES = ["us", "eu", "apac", "jp", "au", "global"];
export {
  identityModelId,
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
  isInferenceProfileArn,
  bedrockRegionVariants,
  getBedrockRegionPrefix,
  findFirstMatch,
  BEDROCK_REGION_PREFIX_ENV_VALUES,
};
