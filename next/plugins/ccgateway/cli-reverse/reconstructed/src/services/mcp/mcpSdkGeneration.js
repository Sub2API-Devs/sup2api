/**
 * services/mcp/mcpSdkGeneration.ts
 *
 * 2.1.316 新增：MCP SDK 代际。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4x7ersf7.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-4x7ersf7.js:403-479 placement
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
//@ chunk-4x7ersf7.js:479-510 placement
/**
 * 全局的 SDK 代际锁存器（可重置）。
 */
var sdkGenerationLatch; // deferred: uses SdkGenerationLatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4x7ersf7.js:479", () => {
  sdkGenerationLatch = identity(new SdkGenerationLatch(), (latch) => latch.reset());
});
//@ chunk-4x7ersf7.js:510-1048 placement
/**
 * 决定并锁存使用的 MCP SDK 代（v1 或 v2）：环境变量 MCP_SDK_GENERATION 优先，否则看特性开关，记录来源与遥测。
 */
function mcpSdkGeneration() {
  {
    if (sdkGenerationLatch.latched !== undefined) return sdkGenerationLatch.latched;
    let MCP_SDK_GENERATION = env.MCP_SDK_GENERATION;
    let requested =
      MCP_SDK_GENERATION === "v1" || MCP_SDK_GENERATION === "v2" ? MCP_SDK_GENERATION : undefined;
    if (MCP_SDK_GENERATION !== undefined && requested === undefined)
      logForDebugging(
        `MCP_SDK_GENERATION=${MCP_SDK_GENERATION} is invalid; expected 'v1' or 'v2' \u2014 ignoring`,
        {
          level: "warn",
        },
      );
    let featureState =
      requested === undefined
        ? getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_brindle_causeway", true)
        : undefined;
    let generation = requested ?? (featureState?.value === false ? "v1" : "v2");
    let source =
      featureState === undefined
        ? "env"
        : featureState.source === "disabled" || featureState.source === "fallback"
          ? "default"
          : "growthbook";
    sdkGenerationLatch.latch(generation);
    logForDebugging(`mcp runtime arm: ${generation} (source: ${source})`);
    logEvent("tengu_mcp_sdk_generation", {
      generation: fromEnum(generation),
      source: fromEnum(source),
    });
    return generation;
  }
  return "v1";
}
export { mcpSdkGeneration };
