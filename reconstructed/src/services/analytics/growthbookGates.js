/**
 * services/analytics/growthbookGates.ts
 *
 * 2.1.316 新增：调用已注册的开关判定器（异常视为 false）；未过期时返回值等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (27)
 * attribution: placement 27
 */
import { refreshLockEnvReader } from "../../utils/auth/cloudAuthRefreshLock.js";
import { env } from "../../utils/env.js";
import { REVALIDATE_IN_FULL_AFTER_MS } from "../policyLimits/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:340580-340594 placement
var gateReaderSlot; // deferred: uses refreshLockEnvReader (../../utils/auth/cloudAuthRefreshLock.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:340580", () => {
  gateReaderSlot = new refreshLockEnvReader();
});
//@ chunk-aepeg2w5.js:340594-340631 placement
function registerMainGateReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return gateReaderSlot.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-aepeg2w5.js:340631-340678 placement
/**
 * 开关读取函数组（tengu_foamy_spring 等，带默认值）。
 */
function isFoamySpringEnabled() {
  return readGateTrueByDefault("tengu_foamy_spring");
}
//@ chunk-aepeg2w5.js:340678-340764 placement
function readGateFalseByDefault(key) {
  let reader = gateReaderSlot.reader;
  if (!reader) return false;
  try {
    return reader(key, false) === true;
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:340764-340851 placement
/**
 * 导出函数 `readGateTrueByDefault`：参数 e，返回 !0; try { return reader(e, !0) !== !1; } catch { return !0; }。
 */
function readGateTrueByDefault(key) {
  let reader = gateReaderSlot.reader;
  if (!reader) return true;
  try {
    return reader(key, true) !== false;
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:340851-340879 placement
var TENGU_BRISK_MEADOW = "tengu_brisk_meadow";
//@ chunk-aepeg2w5.js:340879-340985 placement
/**
 * 内联工具的前提：开关开启、非 CCR 会话配置、未被环境变量关闭。
 */
function isInlineToolsAllowed() {
  if (!isFoamySpringEnabled()) return false;
  if (env.CCR_SESSION_PROFILE) return false;
  return env.CLAUDE_CODE_INLINE_TOOLS !== false;
}
//@ chunk-aepeg2w5.js:340985-341106 placement
/**
 * 内联工具是否开启（环境变量优先，否则读 GrowthBook）。
 */
function isInlineToolsEnabled() {
  if (!isInlineToolsAllowed()) return false;
  if (env.CLAUDE_CODE_INLINE_TOOLS !== undefined) return env.CLAUDE_CODE_INLINE_TOOLS;
  return readGateFalseByDefault(TENGU_BRISK_MEADOW);
}
//@ chunk-aepeg2w5.js:341106-341133 placement
/**
 * 导出函数 `isFoamySpringGateOn`：返回 isFoamySpringEnabled()。
 */
function isFoamySpringGateOn() {
  return isFoamySpringEnabled();
}
//@ chunk-aepeg2w5.js:341133-341145 placement
var cachedGateValue = null;
//@ chunk-aepeg2w5.js:341145-341166 placement
/**
 * 导出函数 `setCachedGateValue`：参数 e。
 */
function setCachedGateValue(usesPerTurnEffort) {
  cachedGateValue = usesPerTurnEffort;
}
//@ chunk-aepeg2w5.js:627052-627116 placement
/**
 * 未过期时返回值。
 */
function keepIfFresh(value, ageMs) {
  return value !== undefined && ageMs !== undefined && ageMs < REVALIDATE_IN_FULL_AFTER_MS
    ? value
    : undefined;
}
//@ chunk-aepeg2w5.js:627116-627142 placement
var TENGU_WARM_MOCHI = "tengu_warm_mochi";
//@ chunk-aepeg2w5.js:627142-627217 placement
class GateReaderSlot {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-aepeg2w5.js:627217-627231 placement
var gateReaderA; // deferred: uses GateReaderSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:627217", () => {
  gateReaderA = new GateReaderSlot();
});
//@ chunk-aepeg2w5.js:627231-627268 placement
function registerWarmMochiGateReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return gateReaderA.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-aepeg2w5.js:627268-627373 placement
/**
 * 读 tengu_warm_mochi 开关（读取失败默认开启）。
 */
function isSideMessagesEnabled() {
  if (!isFoamySpringEnabled()) return false;
  let reader = gateReaderA.reader;
  if (!reader) return true;
  try {
    return reader(TENGU_WARM_MOCHI, true) !== false;
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:627373-627448 placement
class GateReaderSlotB {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-aepeg2w5.js:627448-627462 placement
var gateReaderB; // deferred: uses GateReaderSlotB of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:627448", () => {
  gateReaderB = new GateReaderSlotB();
});
//@ chunk-aepeg2w5.js:627462-627499 placement
function registerRosyElephantGateReader(reader) {
  return gateReaderB.register(reader);
}
//@ chunk-aepeg2w5.js:627499-627659 placement
/**
 * tengu_dapper_dusk 开关（只认正常下发的值）。
 */
function isConnectTimeMcpBlockEnabled() {
  let reader = gateReaderB.reader;
  if (!reader) return false;
  try {
    let { value: flagValue, source, defaultHost } = reader("tengu_dapper_dusk", false);
    return flagValue === true && source === "payload" && defaultHost;
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:627659-627688 placement
var TENGU_ROSY_ELEPHANT = "tengu_rosy_elephant";
//@ chunk-aepeg2w5.js:627688-627759 placement
function isRosyElephantEnabled() {
  try {
    return gateReaderB.reader?.(TENGU_ROSY_ELEPHANT, false).value === true;
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:627759-627779 placement
class VerdictHolder {
  judge = null;
}
//@ chunk-aepeg2w5.js:627779-627793 placement
var verdictHolder; // deferred: uses VerdictHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:627779", () => {
  verdictHolder = new VerdictHolder();
});
//@ chunk-aepeg2w5.js:627793-627820 placement
/**
 * 导出函数 `setVerdictJudge`：参数 e。
 */
function setVerdictJudge(judge) {
  verdictHolder.judge = judge;
}
//@ chunk-aepeg2w5.js:627820-627885 placement
/**
 * 调用已注册的开关判定器（异常视为 false）。
 */
function judgeGate(key, config) {
  try {
    return verdictHolder.judge?.(key, config) ?? false;
  } catch {
    return false;
  }
}
export {
  isFoamySpringEnabled,
  isConnectTimeMcpBlockEnabled,
  setVerdictJudge,
  isSideMessagesEnabled,
  readGateTrueByDefault,
  judgeGate,
  isRosyElephantEnabled,
  keepIfFresh,
  isFoamySpringGateOn,
  isInlineToolsEnabled,
  cachedGateValue,
  registerMainGateReader,
  registerWarmMochiGateReader,
  registerRosyElephantGateReader,
  isInlineToolsAllowed,
  setCachedGateValue,
};
