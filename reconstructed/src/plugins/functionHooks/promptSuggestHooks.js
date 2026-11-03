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
import { G3 } from "./surfaceBinding.js";
import { gh } from "./coreHandlers.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-e6aww6q8.js:70673-70748 placement
async function nUo(e, n = null) {
  return (await G3()?.propose(e, n)) ?? { isShown: !1 };
}
//@ chunk-e6aww6q8.js:70748-70794 placement
var Vle = gh("prompt.suggest", (e) => nUo(e.text));
//@ chunk-e6aww6q8.js:70794-70868 placement
var n_t = (e) => ({ name: "core", isCore: !0, budgetMs: 0, run: async (n) => e(n.text) });
/**
 * 经 prompt.suggest 钩子链显示一条提示建议（可提供放置函数作为核心），记录是否显示。
 */
//@ chunk-e6aww6q8.js:70868-71153 placement
async function promptSuggestOp(e) {
  let { text: text, origin: origin, hookOrigin: hookOrigin, signal: signal, place: place } = e,
    S = await NO_CORE_AT_CHAIN_BOTTOM("prompt.suggest", {
      origin: hookOrigin,
      signal: signal,
      ...(place !== void 0 && { core: { "prompt.suggest": n_t(place) } }),
    })({ text: text, origin: origin });
  return (
    logForDebugging(
      `prompt.suggest (${origin.kind}): ${text.length} chars, ` + (S.isShown ? "shown" : "not shown"),
    ),
    S
  );
}

export { promptSuggestOp, nUo, Vle };
