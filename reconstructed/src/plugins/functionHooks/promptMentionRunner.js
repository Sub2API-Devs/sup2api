/**
 * plugins/functionHooks/promptMentionRunner.ts
 *
 * 2.1.316 新增：提示中提及（@）触发的函数钩子运行器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dbh1yfwe.js (5)
 * attribution: placement 5
 */
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { identity } from "../../utils/identity.js";

//@ chunk-dbh1yfwe.js:263-336 placement
var TAo = Object.freeze({
  isKept: true,
  isDenied: false,
  context: Object.freeze([]),
});
//@ chunk-dbh1yfwe.js:336-491 placement
function createPromptMentionSlot() {
  let o = pu();
  return {
    setPromptMentionRunner: o.set,
    runPromptMention: (r) => {
      let e = o.get();
      return e ? e(r) : r.read(r.raised, "unhooked").then(() => TAo);
    },
  };
}
//@ chunk-dbh1yfwe.js:491-541 placement
/**
 * 提示提及运行器槽
 */
var promptMentionSlot = identity(createPromptMentionSlot(), (o) => o.setPromptMentionRunner(null));
//@ chunk-dbh1yfwe.js:541-568 placement
var runPromptMention = promptMentionSlot.runPromptMention;
//@ chunk-dbh1yfwe.js:568-601 placement
var setPromptMentionRunner = promptMentionSlot.setPromptMentionRunner;
export { setPromptMentionRunner, TAo, runPromptMention };
