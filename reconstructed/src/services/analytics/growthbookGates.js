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
import { pE } from "../../utils/auth/cloudAuthRefreshLock.js";
import { env } from "../../utils/env.js";
import { REVALIDATE_IN_FULL_AFTER_MS } from "../policyLimits/index.js";

//@ chunk-aepeg2w5.js:340580-340594 placement
var rp = new pE();
//@ chunk-aepeg2w5.js:340594-340631 placement
function mE(e) {
  return rp.register(e);
}
/**
 * 开关读取函数组（tengu_foamy_spring 等，带默认值）。
 */
//@ chunk-aepeg2w5.js:340631-340678 placement
function isFoamySpringEnabled() {
  return Zos("tengu_foamy_spring");
}
//@ chunk-aepeg2w5.js:340678-340764 placement
function gE(e) {
  let reader = rp.reader;
  if (!reader) return !1;
  try {
    return reader(e, !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:340764-340851 placement
function Zos(e) {
  let reader = rp.reader;
  if (!reader) return !0;
  try {
    return reader(e, !0) !== !1;
  } catch {
    return !0;
  }
}
//@ chunk-aepeg2w5.js:340851-340879 placement
var TENGU_BRISK_MEADOW = "tengu_brisk_meadow";
/**
 * 内联工具的前提：开关开启、非 CCR 会话配置、未被环境变量关闭。
 */
//@ chunk-aepeg2w5.js:340879-340985 placement
function isInlineToolsAllowed() {
  if (!isFoamySpringEnabled()) return !1;
  if (env.CCR_SESSION_PROFILE) return !1;
  return env.CLAUDE_CODE_INLINE_TOOLS !== !1;
}
/**
 * 内联工具是否开启（环境变量优先，否则读 GrowthBook）。
 */
//@ chunk-aepeg2w5.js:340985-341106 placement
function isInlineToolsEnabled() {
  if (!isInlineToolsAllowed()) return !1;
  if (env.CLAUDE_CODE_INLINE_TOOLS !== void 0) return env.CLAUDE_CODE_INLINE_TOOLS;
  return gE(TENGU_BRISK_MEADOW);
}
//@ chunk-aepeg2w5.js:341106-341133 placement
function Kpr() {
  return isFoamySpringEnabled();
}
//@ chunk-aepeg2w5.js:341133-341145 placement
var _E = null;
//@ chunk-aepeg2w5.js:341145-341166 placement
function Uwi(e) {
  _E = e;
}
/**
 * 未过期时返回值。
 */
//@ chunk-aepeg2w5.js:627052-627116 placement
function keepIfFresh(e, n) {
  return e !== void 0 && n !== void 0 && n < REVALIDATE_IN_FULL_AFTER_MS ? e : void 0;
}
//@ chunk-aepeg2w5.js:627116-627142 placement
var TENGU_WARM_MOCHI = "tengu_warm_mochi";
//@ chunk-aepeg2w5.js:627142-627217 placement
class KC {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-aepeg2w5.js:627217-627231 placement
var GC = new KC();
//@ chunk-aepeg2w5.js:627231-627268 placement
function $C(e) {
  return GC.register(e);
}
/**
 * 读 tengu_warm_mochi 开关（读取失败默认开启）。
 */
//@ chunk-aepeg2w5.js:627268-627373 placement
function isSideMessagesEnabled() {
  if (!isFoamySpringEnabled()) return !1;
  let reader = GC.reader;
  if (!reader) return !0;
  try {
    return reader(TENGU_WARM_MOCHI, !0) !== !1;
  } catch {
    return !0;
  }
}
//@ chunk-aepeg2w5.js:627373-627448 placement
class WC {
  reader = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
}
//@ chunk-aepeg2w5.js:627448-627462 placement
var jm = new WC();
//@ chunk-aepeg2w5.js:627462-627499 placement
function zC(e) {
  return jm.register(e);
}
/**
 * tengu_dapper_dusk 开关（只认正常下发的值）。
 */
//@ chunk-aepeg2w5.js:627499-627659 placement
function isConnectTimeMcpBlockEnabled() {
  let reader = jm.reader;
  if (!reader) return !1;
  try {
    let { value: n, source: source, defaultHost: defaultHost } = reader("tengu_dapper_dusk", !1);
    return n === !0 && source === "payload" && defaultHost;
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:627659-627688 placement
var TENGU_ROSY_ELEPHANT = "tengu_rosy_elephant";
//@ chunk-aepeg2w5.js:627688-627759 placement
function Vm() {
  try {
    return jm.reader?.(TENGU_ROSY_ELEPHANT, !1).value === !0;
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:627759-627779 placement
class jC {
  judge = null;
}
//@ chunk-aepeg2w5.js:627779-627793 placement
var VC = new jC();
//@ chunk-aepeg2w5.js:627793-627820 placement
function wki(e) {
  VC.judge = e;
}
/**
 * 调用已注册的开关判定器（异常视为 false）。
 */
//@ chunk-aepeg2w5.js:627820-627885 placement
function judgeGate(e, n) {
  try {
    return VC.judge?.(e, n) ?? !1;
  } catch {
    return !1;
  }
}

export {
  isFoamySpringEnabled,
  isConnectTimeMcpBlockEnabled,
  wki,
  isSideMessagesEnabled,
  Zos,
  judgeGate,
  Vm,
  keepIfFresh,
  Kpr,
  isInlineToolsEnabled,
  _E,
  mE,
  $C,
  zC,
  isInlineToolsAllowed,
  Uwi,
};
