/**
 * services/mcp/mcpSdkGeneration.ts
 *
 * 2.1.316 新增：MCP SDK 代际。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5br6r47d.js (3)
 * attribution: placement 3
 */
import { identity } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";

//@ chunk-5br6r47d.js:403-479 placement
/**
 * 锁存 MCP SDK 代际（v1/v2）的容器。
 */
class SdkGenerationLatch {
  latched = undefined;
  latch(latched) {
    this.latched = latched;
  }
  reset() {
    this.latched = undefined;
  }
}
//@ chunk-5br6r47d.js:479-510 placement
/**
 * 全局的 SDK 代际锁存器（可重置）。
 */
var sdkGenerationLatch = identity(new SdkGenerationLatch(), (e) => e.reset());
//@ chunk-5br6r47d.js:510-1048 placement
/**
 * 决定并锁存使用的 MCP SDK 代（v1 或 v2）：环境变量 MCP_SDK_GENERATION 优先，否则看特性开关，记录来源与遥测。
 */
function mcpSdkGeneration() {
  {
    if (sdkGenerationLatch.latched !== undefined) return sdkGenerationLatch.latched;
    let MCP_SDK_GENERATION = env.MCP_SDK_GENERATION;
    let o = MCP_SDK_GENERATION === "v1" || MCP_SDK_GENERATION === "v2" ? MCP_SDK_GENERATION : undefined;
    if (MCP_SDK_GENERATION !== undefined && o === undefined)
      logForDebugging(
        `MCP_SDK_GENERATION=${MCP_SDK_GENERATION} is invalid; expected 'v1' or 'v2' \u2014 ignoring`,
        {
          level: "warn",
        },
      );
    let n =
      o === undefined
        ? getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_brindle_causeway", true)
        : undefined;
    let r = o ?? (n?.value === false ? "v1" : "v2");
    let u =
      n === undefined ? "env" : n.source === "disabled" || n.source === "fallback" ? "default" : "growthbook";
    sdkGenerationLatch.latch(r);
    logForDebugging(`mcp runtime arm: ${r} (source: ${u})`);
    logEvent("tengu_mcp_sdk_generation", {
      generation: fromEnum(r),
      source: fromEnum(u),
    });
    return r;
  }
  return "v1";
}
export { mcpSdkGeneration };
