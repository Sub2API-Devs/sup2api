/**
 * plugins/functionHooks/promptSuggestHooks.ts
 *
 * 2.1.316 新增：prompt.suggest/autocomplete 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { surfaceComposer } from "./surfaceBinding.js";
import { makeCoreEvent } from "./coreHandlers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:70673-70748 placement
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
//@ chunk-e6aww6q8.js:70748-70794 placement
/**
 * prompt.suggest 事件
 */
var PROMPT_SUGGEST_EVENT; // deferred: uses makeCoreEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:70748", () => {
  PROMPT_SUGGEST_EVENT = makeCoreEvent("prompt.suggest", (request) => proposeSuggestion(request.text));
});
//@ chunk-e6aww6q8.js:70794-70868 placement
/**
 * 建议的核心步骤
 */
var suggestCoreStep = (place) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (request) => place(request.text),
});
//@ chunk-e6aww6q8.js:70868-71153 placement
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
export { promptSuggestOp, proposeSuggestion, PROMPT_SUGGEST_EVENT };
