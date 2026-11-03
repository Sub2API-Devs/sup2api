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
import { env } from "../../utils/env.js";
import {
  hasGrowthBookEnvOverride,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasGrowthBookUsedNonDefaultHost,
} from "./growthbook.js";
import { e_i } from "../../utils/envValidation.js";
import { Oys } from "../../utils/gitSafeExec.js";

//@ chunk-dwdfj3nt.js:339-397 placement
var TENGU_AMBER_QUILLWORT = "tengu_amber_quillwort",
  TENGU_VELVET_HARROW = "tengu_velvet_harrow";
/**
 * 开关开启，或内部覆盖变量允许时读 GrowthBook 值。
 */
//@ chunk-dwdfj3nt.js:397-565 placement
function isFlagOnWithInternalOverride(e) {
  if (readFlagWithOverride(e, { safe: !1 })) return !0;
  let CLAUDE_INTERNAL_FC_OVERRIDES = env.CLAUDE_INTERNAL_FC_OVERRIDES;
  return (
    CLAUDE_INTERNAL_FC_OVERRIDES !== void 0 &&
    hasGrowthBookEnvOverride(e) &&
    !e_i("CLAUDE_INTERNAL_FC_OVERRIDES", CLAUDE_INTERNAL_FC_OVERRIDES) &&
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, !1).value === !0
  );
}
/**
 * 读取特性开关（支持安全默认值与覆盖来源）。
 */
//@ chunk-z7nt3zpj.js:267-396 placement
function readFlagWithOverride(e, { safe: safe }) {
  try {
    let { value: o, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, safe),
      n = !hasGrowthBookUsedNonDefaultHost();
    return Oys({ value: o, source: source, defaultHost: n }, safe);
  } catch {
    return safe;
  }
}
/**
 * 读取枚举型开关：值在候选内且来自正常下发时才采用，否则用安全默认值。
 */
//@ chunk-z7nt3zpj.js:396-545 placement
function readEnumFlag(e, { safe: safe, others: others }) {
  try {
    let { value: r, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, safe),
      found = others.find((c) => c === r);
    return found !== void 0 && source === "payload" && !hasGrowthBookUsedNonDefaultHost() ? found : safe;
  } catch {
    return safe;
  }
}

export {
  readFlagWithOverride,
  isFlagOnWithInternalOverride,
  TENGU_AMBER_QUILLWORT,
  TENGU_VELVET_HARROW,
  readEnumFlag,
};
