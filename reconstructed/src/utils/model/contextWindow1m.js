/**
 * utils/model/contextWindow1m.ts
 *
 * 2.1.316 新增：是否为不支持 1M 的旧模型；模型是否支持 1M beta等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (17)
 * attribution: placement 17
 */
import { env } from "../env.js";
import { unlessHipaa, yv, vo } from "../betas.js";
import { Lt, CLAUDE_MYTHOS_PREVIEW, Bn, f_r } from "./modelIds.js";
import { getCanonicalName, isRecognizedCanonical } from "./canonicalModelName.js";
import { getCatalogEntry } from "./modelCatalog.js";
import { jat, CATALOG_CAPABILITY_NAMES, anyModelDescribed } from "./modelCatalog/catalogCapabilities.js";
import { getAPIProvider, hasFirstPartyCapabilities, getProviderForModel } from "./providers.js";
import { matchesCatalogList, bi } from "./modelCatalog/servedCatalog.js";
import { isEnvTruthy } from "../envUtils.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";

//@ chunk-aepeg2w5.js:470799-470853 placement = is1mContextDisabled (1)
function is1mContextDisabled() {
  return env.CLAUDE_CODE_DISABLE_1M_CONTEXT;
}
//@ chunk-aepeg2w5.js:470853-470868 placement
var Qxt = 200000;
/**
 * 模型名是否带 [1m]（未禁用时）。
 */
//@ chunk-aepeg2w5.js:470868-470914 placement
function has1mSuffix(e) {
  if (is1mContextDisabled()) return !1;
  return olt(e);
}
//@ chunk-aepeg2w5.js:470914-470954 placement
function olt(e) {
  return /\[1m\]/i.test(e);
}
//@ chunk-aepeg2w5.js:470954-471036 placement
function kmr(e, n) {
  return (has1mSuffix(e) || (unlessHipaa(n)?.includes(yv.header) === !0 && supports1mBeta(e))) && !vo(e);
}
//@ chunk-aepeg2w5.js:471036-471179 placement
function findLegacyNo1mCanonicalName(e, n) {
  let r = { identity: n, deterministic: n },
    s = Lt(e),
    h = getCanonicalName(s, r);
  if (Zw(h)) return h;
  if (s === e) return;
  let y = getCanonicalName(e, r);
  if (Zw(y)) return y;
  return;
}
//@ chunk-aepeg2w5.js:471179-471212 placement
var YG = { window: 1e6, native_1m: !0 };
//@ chunk-aepeg2w5.js:471212-471272 placement
function Fr(e) {
  let n = Lt(e);
  return n === CLAUDE_MYTHOS_PREVIEW ? YG : getCatalogEntry(n)?.context;
}
//@ chunk-aepeg2w5.js:471272-471332 placement
function Zw(e) {
  return Fr(e)?.native_1m === !0 || nA(e) !== void 0;
}
//@ chunk-aepeg2w5.js:471332-471411 placement
function nA(e) {
  let n = Lt(e);
  return jat(getAPIProvider()) &&
    matchesCatalogList(CATALOG_CAPABILITY_NAMES, n) === !0 &&
    anyModelDescribed(n)
    ? bi(n)
    : void 0;
}
//@ chunk-aepeg2w5.js:471411-471484 placement
function Tmr(e) {
  if (isEnvTruthy(process.env.DISABLE_COMPACT)) return !0;
  return isUnknownCustomModelSpelling(e);
}
/**
 * 解析后不是已知模型、且规范化与原拼写不一致或非 claude- 前缀（自定义拼写）。
 */
//@ chunk-aepeg2w5.js:471484-471628 placement = modelMatchesVersionPrefix (1)
function isUnknownCustomModelSpelling(e) {
  let n = parseUserSpecifiedModel(e),
    r = Bn(n),
    s = getCanonicalName(r);
  if (isRecognizedCanonical(s) || (r !== n && isRecognizedCanonical(getCanonicalName(n)))) return !1;
  let h = f_r(r.toLowerCase());
  return !h.startsWith("claude-") || h !== s;
}
//@ chunk-aepeg2w5.js:471628-471690 placement
function modelHasNative1MContext(e, { byItsOwnName: n = !1 } = {}) {
  return um(e, n) !== void 0;
}
//@ chunk-aepeg2w5.js:471690-471788 placement
function um(e, n = !1) {
  if (is1mContextDisabled()) return;
  let r = findLegacyNo1mCanonicalName(e, n);
  if (r === void 0) return;
  return Fr(r)?.window ?? nA(r);
}
/**
 * 是否为不支持 1M 的旧模型。
 */
//@ chunk-aepeg2w5.js:471788-471928 placement
function isLegacyNo1mModel(e) {
  return (
    e.includes("claude-3-") ||
    e === "claude-opus-4-0" ||
    e === "claude-opus-4-1" ||
    e === "claude-opus-4-5" ||
    e === "claude-haiku-4-5"
  );
}
/**
 * 模型是否支持 1M beta。
 */
//@ chunk-aepeg2w5.js:471928-472061 placement
function supports1mBeta(e, n = getCanonicalName(e)) {
  if (is1mContextDisabled()) return !1;
  if (isLegacyNo1mModel(n)) return !1;
  if (Fr(n)?.supports_1m_beta) return !0;
  if (anyModelDescribed(e, n)) return !1;
  return hasFirstPartyCapabilities(getProviderForModel(e));
}
/**
 * 判断模型的 1M 上下文支持：never、native 或 optIn。
 */
//@ chunk-aepeg2w5.js:472061-472270 placement
function get1mContextSupport(e) {
  if (is1mContextDisabled()) return "never";
  let n = getCanonicalName(e),
    r = bi(e, n);
  if (r !== void 0 && r < 1e6) return "never";
  if (modelHasNative1MContext(e)) return "native";
  let s = getCanonicalName(e, { identity: !0 }) !== n;
  if (r !== void 0 && s) return "optIn";
  return supports1mBeta(e) ? "optIn" : "never";
}

export {
  has1mSuffix,
  supports1mBeta,
  modelHasNative1MContext,
  olt,
  is1mContextDisabled,
  isLegacyNo1mModel,
  kmr,
  Qxt,
  get1mContextSupport,
  Fr,
  um,
  isUnknownCustomModelSpelling,
  Tmr,
};
