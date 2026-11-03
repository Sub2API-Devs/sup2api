/**
 * utils/model/modelFallback.ts
 *
 * 2.1.316 新增：按 Bedrock 模型 id（含区域前缀）查找模型信息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (14)
 * attribution: placement 14
 */
import {
  envDefaultModel,
  resolveAvailableModels,
  familyDefaultFor,
  isModelAllowedUnderActiveEnforcement,
} from "./defaultModel.js";
import { parseUserSpecifiedModel, isUsageCreditsOnlyModel } from "./modelDisplay.js";
import { getDefaultMainLoopModelSetting, getDefaultHaikuModel } from "./planModeModel.js";
import { env } from "../env.js";
import { pve, Lt, f_r, parseModelId, wR } from "./modelIds.js";
import { nw, ow, isModelFallbackDisabled, ew, tno, isFormerHeadRefused } from "./modelUnavailability.js";
import { ladderRungsToSend, getUserSpecifiedModelSetting } from "./smallFastModel.js";
import { getMainLoopModel, getDefaultOpusModel, getDefaultSonnetModel } from "./model.js";
import { getProviderForModel } from "./providers.js";
import { isModelAllowed } from "./modelAllowlist.js";
import { getCatalogState, catalogIdForProviderModelId } from "./modelCatalog.js";
import { BEDROCK_REGION_PREFIXES } from "./bedrock.js";
import { isPDFExtension } from "../pdfUtils.js";

//@ chunk-aepeg2w5.js:454751-454869 placement
function isDefaultModelEnforced() {
  let e = envDefaultModel();
  if (resolveAvailableModels(e.setting, e.envFamily, e.concreteBaseline) !== null) return !0;
  return familyDefaultFor(e.setting) !== null;
}
//@ chunk-aepeg2w5.js:454869-454899 placement
function getDefaultMainLoopModel() {
  return parseUserSpecifiedModel(getDefaultMainLoopModelSetting());
}
//@ chunk-aepeg2w5.js:454899-454957 placement
function isNoModelFallbackEnabled() {
  return env.CLAUDE_CODE_NO_MODEL_FALLBACK === !0;
}
//@ chunk-aepeg2w5.js:454957-455318 placement
function noModelFallbackTripwire() {
  throw Error(
    "CLAUDE_CODE_NO_MODEL_FALLBACK tripwire: a model-fallback pivot was attempted " +
      "while the no-fallback guarantee is active. This branch should be unreachable \u2014 " +
      "the availability chain must be built via buildAvailabilityFallbackChain() so it collapses to [primary] under the env var. The stack trace identifies the call site.",
  );
}
//@ chunk-aepeg2w5.js:455318-455567 placement
function isSubagentModelPinned(e) {
  let n = env.CLAUDE_CODE_SUBAGENT_MODEL?.trim().toLowerCase();
  if (!n || n === "inherit" || n === "default" || pve(n)) return !1;
  let r = Lt(parseUserSpecifiedModel(env.CLAUDE_CODE_SUBAGENT_MODEL)),
    s = Lt(e),
    h = /^[a-z-]+\.(?=anthropic\.)/;
  return h.test(r) ? r === s : r === s.replace(h, "");
}
//@ chunk-aepeg2w5.js:455567-455706 placement
function buildAvailabilityFallbackChain(e, n) {
  if (isNoModelFallbackEnabled()) return [e];
  let r = configuredAvailabilityFallbacks(e, n);
  if ((nw(r), r.length === 0 && mayStepDownOnRefusal(e))) {
    let s = ladderRungsToSend(e);
    if (s.length > 0) return [e, ...s];
  }
  return [e, ...r];
}
//@ chunk-aepeg2w5.js:455706-455772 placement
function sessionHasOwnFallback() {
  let e = ow();
  return e.length > 0 && configuredAvailabilityFallbacks(getMainLoopModel(), e).length > 0;
}
//@ chunk-aepeg2w5.js:455772-455833 placement
function mayStepDownOnRefusal(e) {
  return !isModelFallbackDisabled() && ew(e) && tno(e) === getProviderForModel(e) && !isExactModelPick(e);
}
//@ chunk-aepeg2w5.js:455833-455988 placement
function isExactModelPick(e) {
  if (isSubagentModelPinned(e)) return !0;
  let n = getUserSpecifiedModelSetting();
  if (n == null || n.trim().toLowerCase() === "default" || pve(n.trim().toLowerCase())) return !1;
  return Lt(parseUserSpecifiedModel(n)) === Lt(e);
}
//@ chunk-aepeg2w5.js:455988-456084 placement
function configuredAvailabilityFallbacks(e, n) {
  return [n]
    .flat()
    .filter((r) => r !== void 0)
    .filter((r) => r !== "" && r !== e && !isFormerHeadRefused(r, e));
}
//@ chunk-aepeg2w5.js:456084-456236 placement
function getUsageCreditsOnlyModelConsentDeclineFallback() {
  if (isNoModelFallbackEnabled()) return null;
  let e = getDefaultMainLoopModel();
  if (!isUsageCreditsOnlyModel(e)) return e;
  for (let n of [getDefaultOpusModel(), getDefaultSonnetModel(), getDefaultHaikuModel()]) {
    if (isUsageCreditsOnlyModel(n)) continue;
    if (isModelAllowedUnderActiveEnforcement(n) ?? isModelAllowed(n)) return n;
  }
  return null;
}
//@ chunk-aepeg2w5.js:456236-456412 placement
function firstPartyNameToCanonical(e) {
  e = f_r(e.toLowerCase());
  let canonicalNameMemo = getCatalogState().canonicalNameMemo,
    r = canonicalNameMemo.get(e);
  if (r !== void 0) return r;
  let s = bedrockModelInfo(e);
  if (e.length <= 256) {
    if (canonicalNameMemo.size >= 256) canonicalNameMemo.clear();
    canonicalNameMemo.set(e, s);
  }
  return s;
}
/**
 * 按 Bedrock 模型 id（含区域前缀）查找模型信息。
 */
//@ chunk-aepeg2w5.js:456412-458110 placement
function bedrockModelInfo(e) {
  let n = catalogIdForProviderModelId(e);
  if (n !== void 0) return n;
  for (let s of BEDROCK_REGION_PREFIXES)
    if (s !== "us" && e.startsWith(`${s}.anthropic.`)) {
      let h = catalogIdForProviderModelId(`us${e.slice(s.length)}`);
      if (h !== void 0) return h;
      break;
    }
  let r = parseModelId(e);
  if (wR(r)) return isPDFExtension(r) ?? ww(r.base);
  if (e.includes("claude-fable-5-1")) return "claude-fable-5-1";
  if (e.includes("claude-fable-5")) return "claude-fable-5";
  if (e.includes("claude-mythos-5-1")) return "claude-mythos-5-1";
  if (e.includes("claude-mythos-5")) return "claude-mythos-5";
  if (e.includes("claude-opus-5-5")) return "claude-opus-5-5";
  if (e.includes("claude-opus-5")) return "claude-opus-5";
  if (e.includes("claude-opus-4-8")) return "claude-opus-4-8";
  if (e.includes("claude-opus-4-7")) return "claude-opus-4-7";
  if (e.includes("claude-opus-4-6")) return "claude-opus-4-6";
  if (e.includes("claude-opus-4-5")) return "claude-opus-4-5";
  if (e.includes("claude-opus-4-1")) return "claude-opus-4-1";
  if (/claude-opus-4(?!-\d(?!\d))/.test(e)) return "claude-opus-4-0";
  if (e.includes("claude-sonnet-5-5")) return "claude-sonnet-5-5";
  if (e.includes("claude-sonnet-5")) return "claude-sonnet-5";
  if (e.includes("claude-sonnet-4-6")) return "claude-sonnet-4-6";
  if (e.includes("claude-sonnet-4-5")) return "claude-sonnet-4-5";
  if (/claude-sonnet-4(?!-\d(?!\d))/.test(e)) return "claude-sonnet-4-0";
  if (e.includes("claude-haiku-5-5")) return "claude-haiku-5-5";
  if (e.includes("claude-haiku-4-5")) return "claude-haiku-4-5";
  if (e.includes("claude-3-7-sonnet")) return "claude-3-7-sonnet";
  if (e.includes("claude-3-5-sonnet")) return "claude-3-5-sonnet";
  if (e.includes("claude-3-5-haiku")) return "claude-3-5-haiku";
  if (e.includes("claude-3-opus")) return "claude-3-opus";
  if (e.includes("claude-3-sonnet")) return "claude-3-sonnet";
  if (e.includes("claude-3-haiku")) return "claude-3-haiku";
  return ww(e);
}
//@ chunk-aepeg2w5.js:458110-458156 placement
function ww(e) {
  return e.replace(/-\d{8}$/, "");
}

export {
  getDefaultMainLoopModel,
  buildAvailabilityFallbackChain,
  firstPartyNameToCanonical,
  getUsageCreditsOnlyModelConsentDeclineFallback,
  sessionHasOwnFallback,
  isNoModelFallbackEnabled,
  noModelFallbackTripwire,
  isDefaultModelEnforced,
  configuredAvailabilityFallbacks,
  isExactModelPick,
  mayStepDownOnRefusal,
};
