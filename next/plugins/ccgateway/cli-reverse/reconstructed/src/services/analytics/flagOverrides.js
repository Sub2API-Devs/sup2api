/**
 * services/analytics/flagOverrides.ts
 *
 * 2.1.316 新增：读取特性开关（支持安全默认值与覆盖来源）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b2c956ye.js (2), chunk-v4rf2fph.js (2)
 * attribution: placement 4
 */
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasGrowthBookUsedNonDefaultHost,
  hasGrowthBookEnvOverride,
} from "./growthbook.js";
import { resolveEnvRead } from "../../utils/gitSafeExec.js";
import { env } from "../../utils/env.js";
import { envEntryProblem } from "../../utils/envValidation.js";

//@ chunk-b2c956ye.js:267-396 placement
/**
 * 按安全默认值读一个特性开关值并归一（安全模式等），读取失败返回安全值；全树 140 多处用。
 */
function readFlagWithOverride(key, { safe }) {
  try {
    let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, safe);
    let defaultHost = !hasGrowthBookUsedNonDefaultHost();
    return resolveEnvRead(
      {
        value,
        source,
        defaultHost,
      },
      safe,
    );
  } catch {
    return safe;
  }
}
//@ chunk-b2c956ye.js:396-545 placement
/**
 * 读取枚举型开关：值在候选内且来自正常下发时才采用，否则用安全默认值。
 */
function readEnumFlag(key, { safe, others }) {
  try {
    let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, safe);
    let found = others.find((other) => other === value);
    return found !== undefined && source === "payload" && !hasGrowthBookUsedNonDefaultHost() ? found : safe;
  } catch {
    return safe;
  }
}
//@ chunk-v4rf2fph.js:339-397 placement
var TENGU_AMBER_QUILLWORT = "tengu_amber_quillwort";
var TENGU_VELVET_HARROW = "tengu_velvet_harrow";
//@ chunk-v4rf2fph.js:397-565 placement
/**
 * 开关开启，或内部覆盖变量允许时读 GrowthBook 值。
 */
function isFlagOnWithInternalOverride(flag) {
  if (
    readFlagWithOverride(flag, {
      safe: false,
    })
  )
    return true;
  let CLAUDE_INTERNAL_FC_OVERRIDES = env.CLAUDE_INTERNAL_FC_OVERRIDES;
  return (
    CLAUDE_INTERNAL_FC_OVERRIDES !== undefined &&
    hasGrowthBookEnvOverride(flag) &&
    !envEntryProblem("CLAUDE_INTERNAL_FC_OVERRIDES", CLAUDE_INTERNAL_FC_OVERRIDES) &&
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(flag, false).value === true
  );
}
export {
  readFlagWithOverride,
  readEnumFlag,
  isFlagOnWithInternalOverride,
  TENGU_AMBER_QUILLWORT,
  TENGU_VELVET_HARROW,
};
