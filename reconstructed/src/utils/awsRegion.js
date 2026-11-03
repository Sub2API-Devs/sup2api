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
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { Re } from "../../runtime/bun-runtime.js";
import { nonEmptyOrUndefined, getAWSRegion, getDefaultAwsRegion } from "./envUtils.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-bwbq4xvm.js:151409-151514 placement
function awsSharedConfigCacheKey() {
  return `${env.AWS_CONFIG_FILE ?? ""}|${env.AWS_SHARED_CREDENTIALS_FILE ?? ""}|${env.AWS_PROFILE ?? ""}`;
}
/**
 * 每个宿主一份：按 AWS_CONFIG_FILE/AWS_SHARED_CREDENTIALS_FILE/AWS_PROFILE 组合键缓存从共享配置读出的区域（懒加载 AWS SDK 配置解析器）。
 */
//@ chunk-bwbq4xvm.js:151514-152077 placement
class AwsRegionResolver {
  resolvedSharedConfigRegions = new Map();
  readAwsSharedConfigRegion = io(async () => {
    let e = awsSharedConfigCacheKey(),
      s;
    try {
      let [n, r] = await Promise.all([
          import("./chunk-m61cyfw5.js").then((m) => Re(m.default, 1)),
          import("./chunk-7bc3fmtk.js").then((m) => Re(m.default, 1)),
        ]),
        a = n.loadConfig ?? n.default?.loadConfig,
        l = r.NODE_REGION_CONFIG_FILE_OPTIONS ?? r.default?.NODE_REGION_CONFIG_FILE_OPTIONS,
        c = await a(
          {
            environmentVariableSelector: () => {
              return;
            },
            configFileSelector: (h) => h.region,
            default: () => {
              return;
            },
          },
          l,
        )();
      s = nonEmptyOrUndefined(c?.trim());
    } catch {
      s = void 0;
    }
    return (this.resolvedSharedConfigRegions.set(e, s), s);
  }, awsSharedConfigCacheKey);
}
//@ chunk-bwbq4xvm.js:152077-152102 placement
var awsRegionResolvers = new HostScoped(() => new AwsRegionResolver());
//@ chunk-bwbq4xvm.js:152102-152139 placement
function getAwsRegionResolver() {
  return awsRegionResolvers.of(getRootSession().host);
}
/**
 * 异步解析 AWS 区域：环境变量 → ~/.aws 共享配置（缓存）→ 默认 us-east-1。
 */
//@ chunk-bwbq4xvm.js:152139-152237 placement
async function resolveAwsRegion() {
  let e = getAWSRegion();
  if (e) return e;
  return (await getAwsRegionResolver().readAwsSharedConfigRegion()) || getDefaultAwsRegion();
}
//@ chunk-bwbq4xvm.js:152237-152272 placement
function getAwsRegionSync() {
  return describeAwsRegion().region;
}
/**
 * 同步返回 {region, source}：source 为 env / shared-config / env-invalid / default，供 /status 展示。
 */
//@ chunk-bwbq4xvm.js:152272-152526 placement
function describeAwsRegion() {
  let e = getAWSRegion();
  if (e) return { region: e, source: "env" };
  let s = getAwsRegionResolver().resolvedSharedConfigRegions.get(awsSharedConfigCacheKey());
  if (s) return { region: s, source: "shared-config" };
  let n = !!(env.AWS_REGION || env.AWS_DEFAULT_REGION);
  return { region: getDefaultAwsRegion(), source: n ? "env-invalid" : "default" };
}

export { describeAwsRegion, resolveAwsRegion, getAwsRegionSync };
