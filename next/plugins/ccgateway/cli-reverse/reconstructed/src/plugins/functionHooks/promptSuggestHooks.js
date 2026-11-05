/**
 * plugins/functionHooks/promptSuggestHooks.ts
 *
 * 2.1.316 新增：prompt.suggest/autocomplete 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { surfaceComposer } from "./surfaceBinding.js";
import { makeCoreEvent } from "./coreHandlers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:73220-73295 placement
/**
 * 请求一条建议
 */
async function proposeSuggestion(text, generationRequestId = null) {
  return (
    (await surfaceComposer()?.propose(text, generationRequestId)) ?? {
      isShown: false,
    }
  );
}
//@ chunk-5xgkngpb.js:73295-73341 placement
/**
 * prompt.suggest 事件
 */
var PROMPT_SUGGEST_EVENT; // deferred: uses makeCoreEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:73295", () => {
  PROMPT_SUGGEST_EVENT = makeCoreEvent("prompt.suggest", (request) => proposeSuggestion(request.text));
});
//@ chunk-5xgkngpb.js:73341-73415 placement
/**
 * 建议的核心步骤
 */
var suggestCoreStep = (place) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (request) => place(request.text),
});
//@ chunk-5xgkngpb.js:73415-73700 placement
/**
 * 经 prompt.suggest 钩子链显示一条提示建议（可提供放置函数作为核心），记录是否显示。
 */
async function promptSuggestOp(request) {
  let { text, origin, hookOrigin, signal, place } = request;
  let outcome = await NO_CORE_AT_CHAIN_BOTTOM("prompt.suggest", {
    origin: hookOrigin,
    signal,
    ...(place !== undefined && {
      core: {
        "prompt.suggest": suggestCoreStep(place),
      },
    }),
  })({
    text,
    origin,
  });
  logForDebugging(
    `prompt.suggest (${origin.kind}): ${text.length} chars, ` + (outcome.isShown ? "shown" : "not shown"),
  );
  return outcome;
}
export { PROMPT_SUGGEST_EVENT, promptSuggestOp, proposeSuggestion };
