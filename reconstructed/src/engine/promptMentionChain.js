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
import { freeze } from "../plugins/functionHooks/promptMentionRunner.js";
import { ASt } from "../plugins/functionHooks/eventCatalog.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-a53esm6j.js:11880-11889 placement
var m = {};
//@ chunk-a53esm6j.js:11889-11966 placement
Ar(m, {
  CONTEXT_DROPPED_NOTE: () => CONTEXT_DROPPED_NOTE,
  default: () => m,
  runPromptMentionChain: () => runPromptMentionChain,
});
//@ chunk-a53esm6j.js:11966-12015 placement
var CONTEXT_DROPPED_NOTE = "; the context beside the deny is dropped";
//@ chunk-a53esm6j.js:12015-12107 placement
function c(o) {
  let n;
  return { name: "core", isCore: !0, budgetMs: 0, run: (r) => ((n ??= o(r, "hooked")), n) };
}
//@ chunk-a53esm6j.js:12107-12226 placement
var mentionVerdict = (o) => ({
  isKept: o.deny === void 0 && o.type !== null,
  isDenied: o.deny !== void 0,
  context: o.deny === void 0 ? (o.context ?? []) : [],
});
//@ chunk-a53esm6j.js:12226-12652 placement
async function runPromptMentionChain(o) {
  let { raised: raised, signalOf: signalOf, skipping: skipping, read: read } = o,
    s = pluginsMatchingEvent("prompt.mention", raised, skipping);
  if (s.length === 0) return (await read(raised, "unhooked"), freeze);
  let mention = await ASt({
    signal: signalOf(),
    ...(skipping !== void 0 && { origin: skipping }),
    core: { "prompt.mention": c(read) },
  }).prompt.mention(raised);
  if (mention.deny !== void 0) {
    let d = Object.hasOwn(mention, "context") ? CONTEXT_DROPPED_NOTE : "";
    logForDebugging(
      `prompt.mention of ${raised.path}: refused by a hook (${mention.deny}); hooked by ${s.join("+")}; nothing attached${d}`,
    );
  }
  return mentionVerdict(mention);
}
