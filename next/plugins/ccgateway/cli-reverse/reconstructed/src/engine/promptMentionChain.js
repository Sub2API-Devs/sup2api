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
import { __export } from "../../runtime/bun-runtime.js";
import { pluginsMatchingEvent } from "../plugins/functionHooks/hookDispatch.js";
import { UNHOOKED_MENTION_RESULT } from "../plugins/functionHooks/promptMentionRunner.js";
import { createEventCallersRef } from "../plugins/functionHooks/eventCatalog.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-a53esm6j.js:11880-11889 placement
/**
 * 导出值：mentionChainCache（空对象缓存）。
 */
var mentionChainCache = {};
//@ chunk-a53esm6j.js:11889-11966 placement
__export(mentionChainCache, {
  CONTEXT_DROPPED_NOTE: () => CONTEXT_DROPPED_NOTE,
  default: () => mentionChainCache,
  runPromptMentionChain: () => runPromptMentionChain,
});
//@ chunk-a53esm6j.js:11966-12015 placement
var CONTEXT_DROPPED_NOTE = "; the context beside the deny is dropped";
//@ chunk-a53esm6j.js:12015-12107 placement
function coreMentionHook(read) {
  let cached;
  return {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: (raised) => {
      cached ??= read(raised, "hooked");
      return cached;
    },
  };
}
//@ chunk-a53esm6j.js:12107-12226 placement
var mentionVerdict = (result) => ({
  isKept: result.deny === undefined && result.type !== null,
  isDenied: result.deny !== undefined,
  context: result.deny === undefined ? (result.context ?? []) : [],
});
//@ chunk-a53esm6j.js:12226-12652 placement
async function runPromptMentionChain(context) {
  let { raised, signalOf, skipping, read } = context;
  let hookedBy = pluginsMatchingEvent("prompt.mention", raised, skipping);
  if (hookedBy.length === 0) {
    await read(raised, "unhooked");
    return UNHOOKED_MENTION_RESULT;
  }
  let verdict = await createEventCallersRef({
    signal: signalOf(),
    ...(skipping !== undefined && {
      origin: skipping,
    }),
    core: {
      "prompt.mention": coreMentionHook(read),
    },
  }).prompt.mention(raised);
  if (verdict.deny !== undefined) {
    let contextNote = Object.hasOwn(verdict, "context") ? CONTEXT_DROPPED_NOTE : "";
    logForDebugging(
      `prompt.mention of ${raised.path}: refused by a hook (${verdict.deny}); hooked by ${hookedBy.join("+")}; nothing attached${contextNote}`,
    );
  }
  return mentionVerdict(verdict);
}
export { CONTEXT_DROPPED_NOTE, mentionChainCache, runPromptMentionChain };
