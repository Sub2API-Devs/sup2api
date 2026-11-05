/**
 * engine/promptMentionChain.ts
 *
 * 2.1.316 新增：查询引擎的提示提及链。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2wd29ps2.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../runtime/bun-runtime.js";
import { pluginsMatchingEvent } from "../plugins/functionHooks/hookDispatch.js";
import { UNHOOKED_MENTION_RESULT } from "../plugins/functionHooks/promptMentionRunner.js";
import { createEventCallersRef } from "../plugins/functionHooks/eventCatalog.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-2wd29ps2.js:13028-13037 placement
/**
 * 导出值：mentionChainCache（空对象缓存）。
 */
var mentionChainCache = {};
//@ chunk-2wd29ps2.js:13037-13114 placement
__export(mentionChainCache, {
  CONTEXT_DROPPED_NOTE: () => CONTEXT_DROPPED_NOTE,
  default: () => mentionChainCache,
  runPromptMentionChain: () => runPromptMentionChain,
});
//@ chunk-2wd29ps2.js:13114-13163 placement
var CONTEXT_DROPPED_NOTE = "; the context beside the deny is dropped";
//@ chunk-2wd29ps2.js:13163-13255 placement
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
//@ chunk-2wd29ps2.js:13255-13374 placement
var mentionVerdict = (result) => ({
  isKept: result.deny === undefined && result.type !== null,
  isDenied: result.deny !== undefined,
  context: result.deny === undefined ? (result.context ?? []) : [],
});
//@ chunk-2wd29ps2.js:13374-13800 placement
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
