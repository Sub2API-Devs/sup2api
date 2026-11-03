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
import { ge } from "../../utils/identity.js";
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";

//@ chunk-5br6r47d.js:403-479 placement
class f {
  latched = void 0;
  latch(e) {
    this.latched = e;
  }
  reset() {
    this.latched = void 0;
  }
}
//@ chunk-5br6r47d.js:479-510 placement
var d = ge(new f(), (e) => e.reset());
/**
 * 决定并锁存使用的 MCP SDK 代（v1 或 v2）：环境变量 MCP_SDK_GENERATION 优先，否则看特性开关，记录来源与遥测。
 */
//@ chunk-5br6r47d.js:510-1048 placement
function mcpSdkGeneration() {
  {
    if (d.latched !== void 0) return d.latched;
    let MCP_SDK_GENERATION = env.MCP_SDK_GENERATION,
      o = MCP_SDK_GENERATION === "v1" || MCP_SDK_GENERATION === "v2" ? MCP_SDK_GENERATION : void 0;
    if (MCP_SDK_GENERATION !== void 0 && o === void 0)
      logForDebugging(
        `MCP_SDK_GENERATION=${MCP_SDK_GENERATION} is invalid; expected 'v1' or 'v2' \u2014 ignoring`,
        { level: "warn" },
      );
    let n =
        o === void 0 ? getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_brindle_causeway", !0) : void 0,
      r = o ?? (n?.value === !1 ? "v1" : "v2"),
      u =
        n === void 0 ? "env" : n.source === "disabled" || n.source === "fallback" ? "default" : "growthbook";
    return (
      d.latch(r),
      logForDebugging(`mcp runtime arm: ${r} (source: ${u})`),
      logEvent("tengu_mcp_sdk_generation", { generation: fromEnum(r), source: fromEnum(u) }),
      r
    );
  }
  return "v1";
}

export { mcpSdkGeneration };
