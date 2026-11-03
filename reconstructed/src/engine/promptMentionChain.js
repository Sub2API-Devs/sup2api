/**
 * engine/promptMentionChain.ts
 *
 * 2.1.316 新增：查询引擎的提示提及链。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a53esm6j.js (6)
 * attribution: placement 6
 */
import { Ar } from "../../runtime/bun-runtime.js";
import { pluginsMatchingEvent } from "../plugins/functionHooks/hookDispatch.js";
import { TAo } from "../plugins/functionHooks/promptMentionRunner.js";
import { createEventCallersRef } from "../plugins/functionHooks/eventCatalog.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-a53esm6j.js:11880-11889 placement
/**
 * 导出值：mentionChainCache（空对象缓存）。
 */
var mentionChainCache = {};
//@ chunk-a53esm6j.js:11889-11966 placement
Ar(mentionChainCache, {
  CONTEXT_DROPPED_NOTE: () => CONTEXT_DROPPED_NOTE,
  default: () => mentionChainCache,
  runPromptMentionChain: () => runPromptMentionChain,
});
//@ chunk-a53esm6j.js:11966-12015 placement
var CONTEXT_DROPPED_NOTE = "; the context beside the deny is dropped";
//@ chunk-a53esm6j.js:12015-12107 placement
function coreMentionHook(read) {
  let n;
  return {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: (r) => {
      n ??= read(r, "hooked");
      return n;
    },
  };
}
//@ chunk-a53esm6j.js:12107-12226 placement
var mentionVerdict = (o) => ({
  isKept: o.deny === undefined && o.type !== null,
  isDenied: o.deny !== undefined,
  context: o.deny === undefined ? (o.context ?? []) : [],
});
//@ chunk-a53esm6j.js:12226-12652 placement
async function runPromptMentionChain(o) {
  let { raised, signalOf, skipping, read } = o;
  let s = pluginsMatchingEvent("prompt.mention", raised, skipping);
  if (s.length === 0) {
    await read(raised, "unhooked");
    return TAo;
  }
  let e = await createEventCallersRef({
    signal: signalOf(),
    ...(skipping !== undefined && {
      origin: skipping,
    }),
    core: {
      "prompt.mention": coreMentionHook(read),
    },
  }).prompt.mention(raised);
  if (e.deny !== undefined) {
    let d = Object.hasOwn(e, "context") ? CONTEXT_DROPPED_NOTE : "";
    logForDebugging(
      `prompt.mention of ${raised.path}: refused by a hook (${e.deny}); hooked by ${s.join("+")}; nothing attached${d}`,
    );
  }
  return mentionVerdict(e);
}
