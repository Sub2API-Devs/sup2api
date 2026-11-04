/**
 * utils/awsRegion.ts
 *
 * 2.1.316 新增：每宿主一份的 AWS 区域解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (7)
 * attribution: placement 7
 */
import { env } from "./env.js";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { __toESM } from "../../runtime/bun-runtime.js";
import { nonEmptyOrUndefined, getAWSRegion, getDefaultAwsRegion } from "./envUtils.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bwbq4xvm.js:151409-151514 placement
function awsSharedConfigCacheKey() {
  return `${env.AWS_CONFIG_FILE ?? ""}|${env.AWS_SHARED_CREDENTIALS_FILE ?? ""}|${env.AWS_PROFILE ?? ""}`;
}
//@ chunk-bwbq4xvm.js:151514-152077 placement
/**
 * 每个宿主一份：按 AWS_CONFIG_FILE/AWS_SHARED_CREDENTIALS_FILE/AWS_PROFILE 组合键缓存从共享配置读出的区域（懒加载 AWS SDK 配置解析器）。
 */
class AwsRegionResolver {
  resolvedSharedConfigRegions = new Map();
  readAwsSharedConfigRegion = memoizeAlias(async () => {
    let cacheKey = awsSharedConfigCacheKey();
    let region;
    try {
      let [configModule, constantsModule] = await Promise.all([
        import("../../vendor/@smithy/node-config-provider/default.js").then((configSdkModule) =>
          __toESM(configSdkModule.default, 1),
        ),
        import("../../vendor/@smithy/core/configNative.js").then((constantsSdkModule) =>
          __toESM(constantsSdkModule.default, 1),
        ),
      ]);
      let loadConfig = configModule.loadConfig ?? configModule.default?.loadConfig;
      let NODE_REGION_CONFIG_FILE_OPTIONS =
        constantsModule.NODE_REGION_CONFIG_FILE_OPTIONS ??
        constantsModule.default?.NODE_REGION_CONFIG_FILE_OPTIONS;
      let region_2 = await loadConfig(
        {
          environmentVariableSelector: () => {
            return;
          },
          configFileSelector: (profile) => profile.region,
          default: () => {
            return;
          },
        },
        NODE_REGION_CONFIG_FILE_OPTIONS,
      )();
      region = nonEmptyOrUndefined(region_2?.trim());
    } catch {
      region = undefined;
    }
    this.resolvedSharedConfigRegions.set(cacheKey, region);
    return region;
  }, awsSharedConfigCacheKey);
}
//@ chunk-bwbq4xvm.js:152077-152102 placement
var awsRegionResolvers; // deferred: uses AwsRegionResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bwbq4xvm.js:152077", () => {
  awsRegionResolvers = new HostScoped(() => new AwsRegionResolver());
});
//@ chunk-bwbq4xvm.js:152102-152139 placement
function getAwsRegionResolver() {
  return awsRegionResolvers.of(getRootSession().host);
}
//@ chunk-bwbq4xvm.js:152139-152237 placement
/**
 * 异步解析 AWS 区域：环境变量 → ~/.aws 共享配置（缓存）→ 默认 us-east-1。
 */
async function resolveAwsRegion() {
  let awsRegion = getAWSRegion();
  if (awsRegion) return awsRegion;
  return (await getAwsRegionResolver().readAwsSharedConfigRegion()) || getDefaultAwsRegion();
}
//@ chunk-bwbq4xvm.js:152237-152272 placement
function getAwsRegionSync() {
  return describeAwsRegion().region;
}
//@ chunk-bwbq4xvm.js:152272-152526 placement
/**
 * 同步返回 {region, source}：source 为 env / shared-config / env-invalid / default，供 /status 展示。
 */
function describeAwsRegion() {
  let awsRegion = getAWSRegion();
  if (awsRegion)
    return {
      region: awsRegion,
      source: "env",
    };
  let sharedRegion = getAwsRegionResolver().resolvedSharedConfigRegions.get(awsSharedConfigCacheKey());
  if (sharedRegion)
    return {
      region: sharedRegion,
      source: "shared-config",
    };
  let hasEnvRegion = !!(env.AWS_REGION || env.AWS_DEFAULT_REGION);
  return {
    region: getDefaultAwsRegion(),
    source: hasEnvRegion ? "env-invalid" : "default",
  };
}
export { describeAwsRegion, resolveAwsRegion, getAwsRegionSync };
