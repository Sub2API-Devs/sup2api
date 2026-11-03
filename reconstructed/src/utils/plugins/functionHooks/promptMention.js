/**
 * utils/plugins/functionHooks/promptMention.ts
 *
 * 2.1.316 新增。提示中的插件提及。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hg7yd2v7.js (5)
 * attribution: placement 5
 */
import { randomUUID } from "crypto";
import { Ar } from "../../../../runtime/bun-runtime.js";
import { LAn } from "../../../plugins/functionHooks/sites/siteRules.js";
import { runPromptMention } from "../../../plugins/functionHooks/promptMentionRunner.js";
import { logForDebugging } from "../../debug.js";
import { errorMessage } from "../../errors.js";
import { capAdditionalContext } from "../../../services/tools/toolHooks.js";

//@ chunk-hg7yd2v7.js:3544-3553 placement
var promptMentionNamespace = {};
//@ chunk-hg7yd2v7.js:3553-3647 placement
Ar(promptMentionNamespace, {
  attachedNameOf: () => attachedNameOf,
  contextAttachmentOf: () => contextAttachmentOf,
  default: () => promptMentionNamespace,
  readThroughMention: () => readThroughMention,
});
//@ chunk-hg7yd2v7.js:3647-3691 placement
var attachedNameOf = (e) => LAn.find((r) => r === e?.type) ?? null;
//@ chunk-hg7yd2v7.js:3727-3862 placement
var contextAttachmentOf = (e) => ({
  type: "hook_additional_context",
  content: e,
  hookName: "prompt.mention",
  toolUseID: `hook-${randomUUID()}`,
  hookEvent: "UserPromptSubmit",
});
//@ chunk-hg7yd2v7.js:3862-4728 placement
async function readThroughMention(e) {
  if (e.isIsolated) return { attachment: await e.read(e.raised, "unhooked"), context: void 0 };
  let r = [],
    p = await runPromptMention({
      raised: e.raised,
      signalOf: e.signalOf,
      ...(e.skipping !== void 0 && { skipping: e.skipping }),
      read: async (o, n) => {
        let refusal = e.refusal(o);
        if (refusal !== void 0) return { deny: refusal };
        let read = e.read(o, n);
        return (r.push({ arrived: o, made: read }), { type: attachedNameOf(await read) });
      },
    }).catch(async (o) => {
      throw (
        await Promise.allSettled(r.map((n) => n.made)),
        r.forEach((n) => e.forget(n.arrived)),
        logForDebugging(
          `prompt.mention of ${e.raised.path}: the hooks' chain failed (${errorMessage(o)}); nothing attached`,
        ),
        o
      );
    }),
    s =
      (await Promise.allSettled(r.map((o) => o.made)))
        .flatMap((o) => (o.status === "fulfilled" ? [o.value] : []))
        .find((o) => o !== null) ?? null;
  if (p.isDenied || (s !== null && !p.isKept)) r.forEach((o) => e.forget(o.arrived));
  let f = await capAdditionalContext(p.context, "prompt.mention", e.storageV5);
  return { attachment: p.isKept ? s : null, context: f.length > 0 ? contextAttachmentOf(f) : void 0 };
}
