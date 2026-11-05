/**
 * utils/model/bedrock.ts
 *
 * AWS Bedrock：创建 Bedrock/BedrockRuntime 客户端、列出系统推理配置文件、解析推理配置文件背后的模型、区域前缀（us/eu/apac/jp/au/us-gov/global）处理；另混入环境变量注册表的一段（chunk-jhrww53q）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/bedrock.ts
 * pieces: chunk-exfmq47h.js (19), chunk-xjnnz630.js (1)
 * attribution: fingerprint 7, layout 2, file-local 1, placement 10
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
import { __toESM } from "../../../runtime/bun-runtime.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xjnnz630.js:75708-75802 fingerprint (2.1.88 match: BEDROCK_REGION_PREFIXES, 0.782)
/**
 * ANTHROPIC_BEDROCK_REGION_PREFIX 的可选值。
 */
var BEDROCK_REGION_PREFIXES = ["us", "eu", "apac", "jp", "au", "us-gov", "global"];
var BEDROCK_REGION_PREFIX_ENV_VALUES = ["us", "eu", "apac", "jp", "au", "global"];
//@ chunk-exfmq47h.js:140247-140823 fingerprint (2.1.88 match: getBedrockInferenceProfiles, 0.734)
/**
 * 分页列出 SYSTEM_DEFINED 推理配置文件（ListInferenceProfilesCommand，8 秒超时）。
 */
async function getBedrockInferenceProfiles_2() {
  let [client, { ListInferenceProfilesCommand }] = await Promise.all([
    createBedrockClient(),
    import("../../../vendor/@aws-sdk/client-bedrock/dist-cjs/index.js"),
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
//@ chunk-exfmq47h.js:140823-140967 layout
/**
 * profile id 中含模型 id，且其后不是继续的版本数字（避免 4-5 匹配 4-50）。
 */
function containsModelIdAtBoundary(text, modelId) {
  let fromIndex = 0;
  for (;;) {
    let index = text.indexOf(modelId, fromIndex);
    if (index === -1) return false;
    if (!/^(?:\d|-\d{1,2}(?!\d))/.test(text.slice(index + modelId.length))) return true;
    fromIndex = index + 1;
  }
}
//@ chunk-exfmq47h.js:140967-141091 file-local
/**
 * 在 profile 列表里找包含模型 id 的项，优先指定区域前缀。
 */
function findFirstMatch(profiles, modelId, regionPrefix) {
  if (regionPrefix) {
    let found = profiles.find(
      (profile) => profile.startsWith(`${regionPrefix}.`) && containsModelIdAtBoundary(profile, modelId),
    );
    if (found) return found;
  }
  return profiles.find((profile) => containsModelIdAtBoundary(profile, modelId)) ?? null;
}
//@ chunk-exfmq47h.js:141091-141993 fingerprint (2.1.88 match: createBedrockClient, 0.613)
/**
 * 创建 Bedrock 控制面客户端（区域、ANTHROPIC_BEDROCK_BASE_URL 端点、代理配置；CLAUDE_CODE_SKIP_BEDROCK_AUTH 时跳过签名）。
 */
async function createBedrockClient() {
  let { BedrockClient } = await import("../../../vendor/@aws-sdk/client-bedrock/dist-cjs/index.js");
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
        clientConfig.credentials = async (options) => (await getDefaultAwsProviderChain(awsRegion))(options);
    }
  }
  return new BedrockClient(clientConfig);
}
//@ chunk-exfmq47h.js:141993-142911 fingerprint (2.1.88 match: createBedrockRuntimeClient, 0.614)
/**
 * 创建 Bedrock Runtime 客户端（同上，bedrock-runtime 端点）。
 */
async function createBedrockRuntimeClient() {
  let { BedrockRuntimeClient } =
    await import("../../../vendor/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js");
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
        clientConfig.credentials = async (options) => (await getDefaultAwsProviderChain(awsRegion))(options);
    }
  }
  return new BedrockRuntimeClient(clientConfig);
}
//@ chunk-exfmq47h.js:143151-143332 placement
/**
 * 取 Bedrock 推理配置的底层模型（缓存）。
 */
function getInferenceProfileBackingModel(modelId) {
  if (getAPIProvider() !== "bedrock") return Promise.resolve(null);
  let profileId = stripAnyVersatileSuffix(modelId);
  let inferenceProfileBackingModels = getProviderState().providerCache.inferenceProfileBackingModels;
  let pending = inferenceProfileBackingModels.get(profileId);
  if (pending === undefined) {
    pending = getInferenceProfileBackingModel_2(profileId);
    inferenceProfileBackingModels.set(profileId, pending);
  }
  return pending;
}
//@ chunk-exfmq47h.js:143332-143399 placement
/**
 * 判断字符串是否包含 application-inference-profile（未解析的推理配置）。
 */
function isInferenceProfileArn(arn) {
  return arn.includes("application-inference-profile");
}
//@ chunk-exfmq47h.js:143399-143459 placement
/**
 * 是否为未解析的推理配置 ARN。
 */
function isUnresolvedInferenceProfile(modelId) {
  return (
    isInferenceProfileArn(modelId) &&
    typeof getInferenceProfileBackingModelCached(stripAnyVersatileSuffix(modelId)) !== "string"
  );
}
//@ chunk-exfmq47h.js:143459-143943 fingerprint (2.1.88 match: getInferenceProfileBackingModel, 0.641)
/**
 * 查询推理配置文件背后的模型 id（GetInferenceProfileCommand，取第一个 modelArn 的最后一段）。
 */
async function getInferenceProfileBackingModel_2(profileId) {
  let backingModel = null;
  try {
    let [bedrockClient, { GetInferenceProfileCommand }] = await Promise.all([
      createBedrockClient(),
      import("../../../vendor/@aws-sdk/client-bedrock/dist-cjs/index.js"),
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
      backingModel = lastSlashIndex >= 0 ? modelArn.substring(lastSlashIndex + 1) : modelArn;
    }
  } catch (error) {
    logForDebugging(
      `Failed to resolve Bedrock inference profile backing model for ${profileId}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
  }
  setInferenceProfileBackingModel(profileId, backingModel);
  clearModelBetas((modelId) => stripAnyVersatileSuffix(modelId) === profileId);
  return backingModel;
}
//@ chunk-exfmq47h.js:143943-143993 layout (2.1.88 match: isFoundationModel, 1)
/**
 * 模型 id 是否 Bedrock 基础模型（anthropic. 开头）。
 */
function isFoundationModel(modelId) {
  return modelId.startsWith("anthropic.");
}
//@ chunk-exfmq47h.js:143993-144111 fingerprint (2.1.88 match: extractModelIdFromArn, 1)
/**
 * ARN 取最后一段为模型 id，非 ARN 原样返回。
 */
function extractModelIdFromArn(modelId) {
  if (!modelId.startsWith("arn:")) return modelId;
  let lastSlashIndex = modelId.lastIndexOf("/");
  if (lastSlashIndex === -1) return modelId;
  return modelId.substring(lastSlashIndex + 1);
}
//@ chunk-exfmq47h.js:144111-144207 fingerprint (2.1.88 match: getBedrockRegionPrefix, 1)
/**
 * 模型 id 的 Bedrock 区域前缀（us/eu/… 中匹配 "<前缀>.anthropic." 的那个）。
 */
function getBedrockRegionPrefix_2(modelId) {
  let effectiveModelId = extractModelIdFromArn(modelId);
  for (let prefix of BEDROCK_REGION_PREFIXES)
    if (effectiveModelId.startsWith(`${prefix}.anthropic.`)) return prefix;
  return;
}
//@ chunk-exfmq47h.js:144207-144314 placement
/**
 * 替换/添加 Bedrock 区域前缀。
 */
function withBedrockRegionPrefix(modelId, prefix) {
  let existingPrefix = getBedrockRegionPrefix_2(modelId);
  if (existingPrefix) return modelId.replace(`${existingPrefix}.`, `${prefix}.`);
  if (isFoundationModel(modelId)) return `${prefix}.${modelId}`;
  return modelId;
}
//@ chunk-exfmq47h.js:144314-144503 placement
/**
 * AWS 区域对应的 Bedrock 区域组。
 */
function bedrockRegionGroup(region) {
  let name = region ?? "";
  if (name.startsWith("us-gov-")) return "us-gov";
  if (name.startsWith("us-")) return "us";
  if (name.startsWith("eu-")) return "eu";
  if (name.startsWith("ap-")) return "apac";
  return "global";
}
//@ chunk-exfmq47h.js:144503-144611 placement
/**
 * 返回 Bedrock 区域前缀：us-gov 区域固定，其他取环境变量或区域组。
 */
function getBedrockRegionPrefix(awsRegion) {
  if (awsRegion?.startsWith("us-gov-")) return "us-gov";
  return env.ANTHROPIC_BEDROCK_REGION_PREFIX ?? bedrockRegionGroup(awsRegion);
}
//@ chunk-exfmq47h.js:144611-144747 placement
async function loadNoAuthSigner() {
  let signerModule = await import("../../../vendor/@smithy/core/index.js").then((loaded) =>
    __toESM(loaded.default, 1),
  );
  return signerModule.NoAuthSigner ?? signerModule.default?.NoAuthSigner;
}
//@ chunk-exfmq47h.js:144747-144771 placement
/**
 * 模型 id 的恒等转换（此构建不做归一）。
 */
function identityModelId(modelId) {
  return modelId;
}
//@ chunk-exfmq47h.js:144771-144833 placement
var regExp_2; // deferred: uses BEDROCK_REGION_PREFIXES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:144771", () => {
  regExp_2 = new RegExp(`^(?:${BEDROCK_REGION_PREFIXES.join("|")})\\.(anthropic\\..+)$`);
});
//@ chunk-exfmq47h.js:144833-144911 placement
/**
 * 生成模型 id 的 Bedrock 区域变体列表。
 */
function bedrockRegionVariants(region) {
  let normalizedRegion = regExp_2.exec(region)?.[1] ?? region;
  return [normalizedRegion, ...BEDROCK_REGION_PREFIXES.map((prefix) => `${prefix}.${normalizedRegion}`)];
}
export {
  isUnresolvedInferenceProfile,
  getInferenceProfileBackingModel,
  extractModelIdFromArn,
  getBedrockRegionPrefix_2,
  isFoundationModel,
  bedrockRegionGroup,
  createBedrockRuntimeClient,
  isInferenceProfileArn,
  withBedrockRegionPrefix,
  findFirstMatch,
  identityModelId,
  BEDROCK_REGION_PREFIXES,
  getBedrockInferenceProfiles_2,
  bedrockRegionVariants,
  getBedrockRegionPrefix,
  BEDROCK_REGION_PREFIX_ENV_VALUES,
};
