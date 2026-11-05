/**
 * screens/repl/modelRefusalFallback.ts
 *
 * 2.1.316 新增。模型拒答后的回退处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { lastTranscriptModel } from "../../utils/sessionRestore.js";

//@ chunk-czq1j3j2.js:382551-382630 placement
function isModelRefusalFallback(message) {
  return message.type === "system" && message.subtype === "model_refusal_fallback";
}
//@ chunk-czq1j3j2.js:382630-382716 placement
function isSameModelByIdentity(currentOverride, fallbackModel) {
  if (currentOverride == null) return false;
  let overrideBase = stripAnyVersatileSuffix(currentOverride);
  let fallbackBase = stripAnyVersatileSuffix(fallbackModel);
  return overrideBase === fallbackBase || getCanonicalName(overrideBase) === getCanonicalName(fallbackBase);
}
//@ chunk-czq1j3j2.js:382716-383386 placement
function decideRefusalFallbackRestore(input) {
  let filtered = input.slicedMessages.filter(isModelRefusalFallback);
  let last = filtered.at(-1);
  if (!last) return;
  let fallbackModel = last.fallbackModel;
  let model = (() => {
    if (!input.firstParty)
      return {
        action: "keep",
        reason: "not_first_party",
      };
    if (!isSameModelByIdentity(input.currentOverride, fallbackModel))
      return {
        action: "keep",
        reason: "writer_mismatch",
      };
    let transcriptModel = lastTranscriptModel(input.keptMessages, input.initialModel);
    if (transcriptModel != null)
      return {
        action: "restore",
        value: transcriptModel,
        restoredFrom: "transcript",
      };
    let initialModel = input.modelBeforeSwap ?? input.initialModel;
    if (initialModel != null)
      return {
        action: "restore",
        value: initialModel,
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
    clearLatch: input.latchActive && !input.keptMessages.some(isModelRefusalFallback),
    model,
    lastSlicedFallbackModel: fallbackModel,
  };
}
export { decideRefusalFallbackRestore };
