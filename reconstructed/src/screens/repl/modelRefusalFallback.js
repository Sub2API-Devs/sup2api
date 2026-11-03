/**
 * screens/repl/modelRefusalFallback.ts
 *
 * 2.1.316 新增。模型拒答后的回退处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { lastTranscriptModel } from "../../utils/sessionRestore.js";

//@ chunk-18hwfzwa.js:344830-344909 placement
function isModelRefusalFallback(h) {
  return h.type === "system" && h.subtype === "model_refusal_fallback";
}
//@ chunk-18hwfzwa.js:344909-344995 placement
function isSameModelByIdentity(currentOverride, fallbackModel) {
  if (currentOverride == null) return false;
  let D = stripAnyVersatileSuffix(currentOverride);
  let L = stripAnyVersatileSuffix(fallbackModel);
  return D === L || getCanonicalName(D) === getCanonicalName(L);
}
//@ chunk-18hwfzwa.js:344995-345665 placement
function decideRefusalFallbackRestore(h) {
  let filtered = h.slicedMessages.filter(isModelRefusalFallback);
  let last = filtered.at(-1);
  if (!last) return;
  let fallbackModel = last.fallbackModel;
  let model = (() => {
    if (!h.firstParty)
      return {
        action: "keep",
        reason: "not_first_party",
      };
    if (!isSameModelByIdentity(h.currentOverride, fallbackModel))
      return {
        action: "keep",
        reason: "writer_mismatch",
      };
    let ke = lastTranscriptModel(h.keptMessages, h.initialModel);
    if (ke != null)
      return {
        action: "restore",
        value: ke,
        restoredFrom: "transcript",
      };
    let Re = h.modelBeforeSwap ?? h.initialModel;
    if (Re != null)
      return {
        action: "restore",
        value: Re,
        restoredFrom: "initial_model",
      };
    return {
      action: "restore",
      value: null,
      restoredFrom: "settings_fallthrough",
    };
  })();
  return {
    bannersSliced: filtered.length,
    clearLatch: h.latchActive && !h.keptMessages.some(isModelRefusalFallback),
    model,
    lastSlicedFallbackModel: fallbackModel,
  };
}
export { decideRefusalFallbackRestore };
