/**
 * services/analytics/flagOverrides.ts
 *
 * 2.1.316 新增：读取特性开关（支持安全默认值与覆盖来源）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dwdfj3nt.js (2), chunk-z7nt3zpj.js (2)
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

//@ chunk-z7nt3zpj.js:267-396 placement
/**
 * 读取特性开关（支持安全默认值与覆盖来源）。
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
//@ chunk-z7nt3zpj.js:396-545 placement
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
//@ chunk-dwdfj3nt.js:339-397 placement
var TENGU_AMBER_QUILLWORT = "tengu_amber_quillwort";
var TENGU_VELVET_HARROW = "tengu_velvet_harrow";
//@ chunk-dwdfj3nt.js:397-565 placement
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
  isFlagOnWithInternalOverride,
  TENGU_AMBER_QUILLWORT,
  TENGU_VELVET_HARROW,
  readEnumFlag,
};
