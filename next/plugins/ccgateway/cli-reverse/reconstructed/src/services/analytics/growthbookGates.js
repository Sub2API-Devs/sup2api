/**
 * services/analytics/growthbookGates.ts
 *
 * 2.1.316 新增：调用已注册的开关判定器（异常视为 false）；未过期时返回值等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (27)
 * attribution: placement 27
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { refreshLockEnvReader } from "../../utils/auth/cloudAuthRefreshLock.js";
import { env } from "../../utils/env.js";
import { REVALIDATE_IN_FULL_AFTER_MS } from "../policyLimits/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:351065-351079 placement
var gateReaderSlot; // deferred: uses refreshLockEnvReader (../../utils/auth/cloudAuthRefreshLock.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:351065", () => {
  gateReaderSlot = new refreshLockEnvReader();
});
//@ chunk-exfmq47h.js:351079-351116 placement
function registerMainGateReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return gateReaderSlot.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-exfmq47h.js:351116-351163 placement
/**
 * 开关读取函数组（tengu_foamy_spring 等，带默认值）。
 */
function isFoamySpringEnabled() {
  return readGateTrueByDefault("tengu_foamy_spring");
}
//@ chunk-exfmq47h.js:351163-351250 placement
function readGateFalseByDefault(key) {
  let reader = gateReaderSlot.reader;
  if (!reader) return false;
  try {
    return reader(key, false) === true;
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:351250-351337 placement
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
//@ chunk-exfmq47h.js:351337-351365 placement
var TENGU_BRISK_MEADOW = "tengu_brisk_meadow";
//@ chunk-exfmq47h.js:351365-351471 placement
/**
 * 内联工具的前提：开关开启、非 CCR 会话配置、未被环境变量关闭。
 */
function isInlineToolsAllowed() {
  if (!isFoamySpringEnabled()) return false;
  if (env.CCR_SESSION_PROFILE) return false;
  return env.CLAUDE_CODE_INLINE_TOOLS !== false;
}
//@ chunk-exfmq47h.js:351471-351593 placement
/**
 * 内联工具是否开启（环境变量优先，否则读 GrowthBook）。
 */
function isInlineToolsEnabled() {
  if (!isInlineToolsAllowed()) return false;
  if (env.CLAUDE_CODE_INLINE_TOOLS !== undefined) return env.CLAUDE_CODE_INLINE_TOOLS;
  return readGateFalseByDefault(TENGU_BRISK_MEADOW);
}
//@ chunk-exfmq47h.js:351593-351620 placement
/**
 * 导出函数 `isFoamySpringGateOn`：返回 isFoamySpringEnabled()。
 */
function isFoamySpringGateOn() {
  return isFoamySpringEnabled();
}
//@ chunk-exfmq47h.js:351620-351632 placement
var cachedGateValue = null;
//@ chunk-exfmq47h.js:351632-351653 placement
/**
 * 导出函数 `setCachedGateValue`：参数 e。
 */
function setCachedGateValue(usesPerTurnEffort) {
  cachedGateValue = usesPerTurnEffort;
}
//@ chunk-exfmq47h.js:639580-639644 placement
/**
 * 未过期时返回值。
 */
function keepIfFresh(value, ageMs) {
  return value !== undefined && ageMs !== undefined && ageMs < REVALIDATE_IN_FULL_AFTER_MS
    ? value
    : undefined;
}
//@ chunk-exfmq47h.js:639644-639670 placement
var TENGU_WARM_MOCHI = "tengu_warm_mochi";
//@ chunk-exfmq47h.js:639670-639745 placement
class GateReaderSlot {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-exfmq47h.js:639745-639759 placement
var gateReaderA; // deferred: uses GateReaderSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:639745", () => {
  gateReaderA = new GateReaderSlot();
});
//@ chunk-exfmq47h.js:639759-639796 placement
function registerWarmMochiGateReader(getFeatureValue_CACHED_MAY_BE_STALE) {
  return gateReaderA.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-exfmq47h.js:639796-639901 placement
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
//@ chunk-exfmq47h.js:639901-639976 placement
class GateReaderSlotB {
  reader = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
}
//@ chunk-exfmq47h.js:639976-639990 placement
var gateReaderB; // deferred: uses GateReaderSlotB of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:639976", () => {
  gateReaderB = new GateReaderSlotB();
});
//@ chunk-exfmq47h.js:639990-640027 placement
function registerRosyElephantGateReader(reader) {
  return gateReaderB.register(reader);
}
//@ chunk-exfmq47h.js:640027-640187 placement
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
//@ chunk-exfmq47h.js:640187-640216 placement
var TENGU_ROSY_ELEPHANT = "tengu_rosy_elephant";
//@ chunk-exfmq47h.js:640216-640287 placement
function isRosyElephantEnabled() {
  try {
    return gateReaderB.reader?.(TENGU_ROSY_ELEPHANT, false).value === true;
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:640287-640307 placement
class VerdictHolder {
  judge = null;
}
//@ chunk-exfmq47h.js:640307-640321 placement
var verdictHolder; // deferred: uses VerdictHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:640307", () => {
  verdictHolder = new VerdictHolder();
});
//@ chunk-exfmq47h.js:640321-640348 placement
/**
 * 导出函数 `setVerdictJudge`：参数 e。
 */
function setVerdictJudge(judge) {
  verdictHolder.judge = judge;
}
//@ chunk-exfmq47h.js:640348-640413 placement
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
  isRosyElephantEnabled,
  isFoamySpringEnabled,
  isFoamySpringGateOn,
  isInlineToolsEnabled,
  isSideMessagesEnabled,
  readGateTrueByDefault,
  readGateFalseByDefault,
  judgeGate,
  isInlineToolsAllowed,
  isConnectTimeMcpBlockEnabled,
  setVerdictJudge,
  cachedGateValue,
  keepIfFresh,
  registerMainGateReader,
  registerWarmMochiGateReader,
  registerRosyElephantGateReader,
  setCachedGateValue,
};
