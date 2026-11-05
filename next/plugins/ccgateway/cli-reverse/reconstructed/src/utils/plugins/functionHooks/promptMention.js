/**
 * utils/plugins/functionHooks/promptMention.ts
 *
 * 2.1.316 新增。提示中的插件提及。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mbz3p8vk.js (5)
 * attribution: placement 5
 */
import { randomUUID } from "crypto";
import { __export } from "../../../../runtime/bun-runtime.js";
import { PDF_REFERENCE_KINDS } from "../../../plugins/functionHooks/sites/siteRules.js";
import { runPromptMention } from "../../../plugins/functionHooks/promptMentionRunner.js";
import { logForDebugging } from "../../debug.js";
import { errorMessage } from "../../errors.js";
import { capAdditionalContext } from "../../../services/tools/toolHooks.js";

//@ chunk-mbz3p8vk.js:3880-3889 placement
var promptMentionNamespace = {};
//@ chunk-mbz3p8vk.js:3889-3983 placement
__export(promptMentionNamespace, {
  attachedNameOf: () => attachedNameOf,
  contextAttachmentOf: () => contextAttachmentOf,
  default: () => promptMentionNamespace,
  readThroughMention: () => readThroughMention,
});
//@ chunk-mbz3p8vk.js:3983-4027 placement
var attachedNameOf = (block) => PDF_REFERENCE_KINDS.find((kind) => kind === block?.type) ?? null;
//@ chunk-mbz3p8vk.js:4063-4198 placement
var contextAttachmentOf = (content) => ({
  type: "hook_additional_context",
  content,
  hookName: "prompt.mention",
  toolUseID: `hook-${randomUUID()}`,
  hookEvent: "UserPromptSubmit",
});
//@ chunk-mbz3p8vk.js:4198-5064 placement
async function readThroughMention(mentionContext) {
  if (mentionContext.isIsolated)
    return {
      attachment: await mentionContext.read(mentionContext.raised, "unhooked"),
      context: undefined,
    };
  let reads = [];
  let result = await runPromptMention({
    raised: mentionContext.raised,
    signalOf: mentionContext.signalOf,
    ...(mentionContext.skipping !== undefined && {
      skipping: mentionContext.skipping,
    }),
    read: async (arrival, mode) => {
      let refusal = mentionContext.refusal(arrival);
      if (refusal !== undefined)
        return {
          deny: refusal,
        };
      let made = mentionContext.read(arrival, mode);
      reads.push({
        arrived: arrival,
        made,
      });
      return {
        type: attachedNameOf(await made),
      };
    },
  }).catch(async (error) => {
    await Promise.allSettled(reads.map((readEntry) => readEntry.made));
    reads.forEach((readEntry) => mentionContext.forget(readEntry.arrived));
    logForDebugging(
      `prompt.mention of ${mentionContext.raised.path}: the hooks' chain failed (${errorMessage(error)}); nothing attached`,
    );
    throw error;
  });
  let attachment =
    (await Promise.allSettled(reads.map((readEntry) => readEntry.made)))
      .flatMap((settled) => (settled.status === "fulfilled" ? [settled.value] : []))
      .find((value) => value !== null) ?? null;
  if (result.isDenied || (attachment !== null && !result.isKept))
    reads.forEach((readEntry) => mentionContext.forget(readEntry.arrived));
  let content = await capAdditionalContext(result.context, "prompt.mention", mentionContext.storageV5);
  return {
    attachment: result.isKept ? attachment : null,
    context: content.length > 0 ? contextAttachmentOf(content) : undefined,
  };
}
export { attachedNameOf, contextAttachmentOf, promptMentionNamespace, readThroughMention };
