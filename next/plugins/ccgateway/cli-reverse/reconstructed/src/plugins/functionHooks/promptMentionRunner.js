/**
 * plugins/functionHooks/promptMentionRunner.ts
 *
 * 2.1.316 新增：提示中提及（@）触发的函数钩子运行器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ryfngqw4.js (5)
 * attribution: placement 5
 */
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { identity } from "../../utils/identity.js";

//@ chunk-ryfngqw4.js:263-336 placement
var UNHOOKED_MENTION_RESULT = Object.freeze({
  isKept: true,
  isDenied: false,
  context: Object.freeze([]),
});
//@ chunk-ryfngqw4.js:336-491 placement
function createPromptMentionSlot() {
  let runnerSlot = subscribe();
  return {
    setPromptMentionRunner: runnerSlot.set,
    runPromptMention: (request) => {
      let runner = runnerSlot.get();
      return runner
        ? runner(request)
        : request.read(request.raised, "unhooked").then(() => UNHOOKED_MENTION_RESULT);
    },
  };
}
//@ chunk-ryfngqw4.js:491-541 placement
/**
 * 提示提及运行器槽
 */
var promptMentionSlot = identity(createPromptMentionSlot(), (slot) => slot.setPromptMentionRunner(null));
//@ chunk-ryfngqw4.js:541-568 placement
var runPromptMention = promptMentionSlot.runPromptMention;
//@ chunk-ryfngqw4.js:568-601 placement
var setPromptMentionRunner = promptMentionSlot.setPromptMentionRunner;
export { UNHOOKED_MENTION_RESULT, runPromptMention, setPromptMentionRunner };
