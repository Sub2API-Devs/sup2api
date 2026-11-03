/**
 * engine/attachmentAnswers.ts
 *
 * 2.1.316 新增：查询引擎的附件应答。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6mt8vha1.js (9)
 * attribution: placement 9
 */
import { Ar } from "../../runtime/bun-runtime.js";
import { classifyHookAttachmentSource } from "../utils/hooks/hookAttachmentTypes.js";
import { findAnsweringStep } from "../plugins/functionHooks/pluginRegister.js";
import { ASt } from "../plugins/functionHooks/eventCatalog.js";
import { logForDebugging } from "../utils/debug.js";
import { isAbortError, errorMessage } from "../utils/errors.js";
import { canShortcutAppend } from "../plugins/functionHooks/modAdmission.js";
import { answerOf, pendingOf, settle, resolve } from "../plugins/functionHooks/promptAttachmentHooks.js";
import { attachmentText } from "../utils/messages.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";

//@ chunk-6mt8vha1.js:11923-11932 placement
var A = {};
//@ chunk-6mt8vha1.js:11932-12133 placement
Ar(A, {
  answerAuthorOf: () => answerAuthorOf,
  askedAnswer: () => askedAnswer,
  attachmentAnswerOf: () => attachmentAnswerOf,
  attachmentInputOf: () => attachmentInputOf,
  attachmentOriginOf: () => classifyHookAttachmentSource,
  changeDescribed: () => changeDescribed,
  default: () => A,
  envelopeOf: () => envelopeOf,
  resolveAttachments: () => resolveAttachments,
});
//@ chunk-6mt8vha1.js:12133-12224 placement
function answerAuthorOf(p, n) {
  let e = findAnsweringStep(p, "text", n);
  return e === void 0 ? "a hook" : `${e.plugin} (${e.tier})`;
}
//@ chunk-6mt8vha1.js:12224-12344 placement
function attachmentAnswerOf(p, n) {
  let text = p.text;
  if (text === null) return { kind: "left-out" };
  return text === n ? { kind: "engine" } : { kind: "rewritten", text: text };
}
//@ chunk-6mt8vha1.js:12344-12411 placement
var envelopeOf = (p, n, e) => ({
  text: n,
  origin: classifyHookAttachmentSource(p),
  ...(e !== void 0 && { agentId: e }),
});
//@ chunk-6mt8vha1.js:12411-13019 placement
function attachmentInputOf(p, n, e) {
  let { attachment: attachment } = p,
    m = envelopeOf(attachment, n, e),
    s = { type: attachment.type, ...m };
  switch (attachment.type) {
    case "plan_mode": {
      let { reminderType: reminderType, planFilePath: planFilePath, planExists: planExists } = attachment;
      return (reminderType === "full" || reminderType === "sparse") &&
        typeof planFilePath === "string" &&
        typeof planExists === "boolean"
        ? {
            type: attachment.type,
            ...m,
            detail: { reminder: reminderType, planFilePath: planFilePath, hasPlan: planExists },
          }
        : s;
    }
    case "plan_mode_reentry": {
      let { planFilePath: planFilePath } = attachment;
      return typeof planFilePath === "string"
        ? { type: attachment.type, ...m, detail: { planFilePath: planFilePath } }
        : s;
    }
    case "plan_mode_exit": {
      let { planFilePath: planFilePath, planExists: planExists } = attachment;
      return typeof planFilePath === "string" && typeof planExists === "boolean"
        ? { type: attachment.type, ...m, detail: { planFilePath: planFilePath, hasPlan: planExists } }
        : s;
    }
    default:
      return { type: attachment.type, ...m };
  }
}
//@ chunk-6mt8vha1.js:13019-13159 placement
function changeDescribed(p, n) {
  return p.kind === "left-out"
    ? `left it out (${n.length} characters)`
    : `rewrote it (${n.length} -> ${p.text.length} characters)`;
}
//@ chunk-6mt8vha1.js:13159-13623 placement
async function askedAnswer(p) {
  let { message: message, text: text, bottom: bottom, agentId: agentId } = p,
    s = message.attachment.type,
    i = [];
  try {
    let attachment = await ASt({
        signal: bottom.signal,
        origin: bottom.origin,
        trace: (c) => {
          i = c;
        },
      }).prompt.attachment(attachmentInputOf(message, text, agentId)),
      a = attachmentAnswerOf(attachment, text);
    if (a.kind !== "engine")
      logForDebugging(
        `prompt.attachment ${s}: ${answerAuthorOf(i, attachment.text)} ` + changeDescribed(a, text),
      );
    return a;
  } catch (error) {
    if (isAbortError(error) || bottom.signal.aborted) throw error;
    return (
      logForDebugging(
        `prompt.attachment ${s}: the dispatch failed, the text stands as the engine rendered it: ${errorMessage(error)}`,
        { level: "error" },
      ),
      { kind: "engine" }
    );
  }
}
//@ chunk-6mt8vha1.js:13623-14038 placement
async function resolveAttachments(p, n, e) {
  let o = [],
    m = canShortcutAppend("prompt.attachment");
  for (let s of p) {
    if (s.type !== "attachment") continue;
    if (answerOf(s.uuid) !== void 0) continue;
    let r = pendingOf(s.uuid);
    if (r !== void 0) {
      o.push(
        r.catch(() => {
          return;
        }),
      );
      continue;
    }
    let a = attachmentText(s);
    if (!(a !== null && hasModuleHookingSite("prompt.attachment", { type: s.attachment.type }, m))) {
      settle(s.uuid, { kind: "engine" });
      continue;
    }
    o.push(resolve(s.uuid, askedAnswer({ message: s, text: a, bottom: n, agentId: e })));
  }
  await Promise.all(o);
}
