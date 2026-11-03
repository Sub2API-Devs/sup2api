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
import { createEventCallersRef } from "../plugins/functionHooks/eventCatalog.js";
import { logForDebugging } from "../utils/debug.js";
import { isAbortError, errorMessage } from "../utils/errors.js";
import { canShortcutAppend } from "../plugins/functionHooks/modAdmission.js";
import { answerOf, pendingOf, settle, resolve } from "../plugins/functionHooks/promptAttachmentHooks.js";
import { attachmentText } from "../utils/messages.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";

//@ chunk-6mt8vha1.js:11923-11932 placement
/**
 * 导出值：attachmentAnswerCache（空对象缓存）。
 */
var attachmentAnswerCache = {};
//@ chunk-6mt8vha1.js:11932-12133 placement
Ar(attachmentAnswerCache, {
  answerAuthorOf: () => answerAuthorOf,
  askedAnswer: () => askedAnswer,
  attachmentAnswerOf: () => attachmentAnswerOf,
  attachmentInputOf: () => attachmentInputOf,
  attachmentOriginOf: () => classifyHookAttachmentSource,
  changeDescribed: () => changeDescribed,
  default: () => attachmentAnswerCache,
  envelopeOf: () => envelopeOf,
  resolveAttachments: () => resolveAttachments,
});
//@ chunk-6mt8vha1.js:12133-12224 placement
function answerAuthorOf(p, text) {
  let answeringStep = findAnsweringStep(p, "text", text);
  return answeringStep === undefined ? "a hook" : `${answeringStep.plugin} (${answeringStep.tier})`;
}
//@ chunk-6mt8vha1.js:12224-12344 placement
function attachmentAnswerOf(p, text) {
  let text_2 = p.text;
  if (text_2 === null)
    return {
      kind: "left-out",
    };
  return text_2 === text
    ? {
        kind: "engine",
      }
    : {
        kind: "rewritten",
        text: text_2,
      };
}
//@ chunk-6mt8vha1.js:12344-12411 placement
var envelopeOf = (attachment, text, e) => ({
  text,
  origin: classifyHookAttachmentSource(attachment),
  ...(e !== undefined && {
    agentId: e,
  }),
});
//@ chunk-6mt8vha1.js:12411-13019 placement
function attachmentInputOf(message, text, agentId) {
  let { attachment } = message;
  let m = envelopeOf(attachment, text, agentId);
  let s = {
    type: attachment.type,
    ...m,
  };
  switch (attachment.type) {
    case "plan_mode": {
      let { reminderType, planFilePath, planExists } = attachment;
      return (reminderType === "full" || reminderType === "sparse") &&
        typeof planFilePath === "string" &&
        typeof planExists === "boolean"
        ? {
            type: attachment.type,
            ...m,
            detail: {
              reminder: reminderType,
              planFilePath,
              hasPlan: planExists,
            },
          }
        : s;
    }
    case "plan_mode_reentry": {
      let { planFilePath } = attachment;
      return typeof planFilePath === "string"
        ? {
            type: attachment.type,
            ...m,
            detail: {
              planFilePath,
            },
          }
        : s;
    }
    case "plan_mode_exit": {
      let { planFilePath, planExists } = attachment;
      return typeof planFilePath === "string" && typeof planExists === "boolean"
        ? {
            type: attachment.type,
            ...m,
            detail: {
              planFilePath,
              hasPlan: planExists,
            },
          }
        : s;
    }
    default:
      return {
        type: attachment.type,
        ...m,
      };
  }
}
//@ chunk-6mt8vha1.js:13019-13159 placement
function changeDescribed(p, text) {
  return p.kind === "left-out"
    ? `left it out (${text.length} characters)`
    : `rewrote it (${text.length} -> ${p.text.length} characters)`;
}
//@ chunk-6mt8vha1.js:13159-13623 placement
async function askedAnswer(p) {
  let { message, text, bottom, agentId } = p;
  let s = message.attachment.type;
  let i = [];
  try {
    let r = await createEventCallersRef({
      signal: bottom.signal,
      origin: bottom.origin,
      trace: (c) => {
        i = c;
      },
    }).prompt.attachment(attachmentInputOf(message, text, agentId));
    let a = attachmentAnswerOf(r, text);
    if (a.kind !== "engine")
      logForDebugging(`prompt.attachment ${s}: ${answerAuthorOf(i, r.text)} ` + changeDescribed(a, text));
    return a;
  } catch (error) {
    if (isAbortError(error) || bottom.signal.aborted) throw error;
    logForDebugging(
      `prompt.attachment ${s}: the dispatch failed, the text stands as the engine rendered it: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return {
      kind: "engine",
    };
  }
}
//@ chunk-6mt8vha1.js:13623-14038 placement
async function resolveAttachments(p, bottom, agentId) {
  let o = [];
  let m = canShortcutAppend("prompt.attachment");
  for (let s of p) {
    if (s.type !== "attachment") continue;
    if (answerOf(s.uuid) !== undefined) continue;
    let r = pendingOf(s.uuid);
    if (r !== undefined) {
      o.push(
        r.catch(() => {
          return;
        }),
      );
      continue;
    }
    let a = attachmentText(s);
    if (!(
      a !== null &&
      hasModuleHookingSite(
        "prompt.attachment",
        {
          type: s.attachment.type,
        },
        m,
      )
    )) {
      settle(s.uuid, {
        kind: "engine",
      });
      continue;
    }
    o.push(
      resolve(
        s.uuid,
        askedAnswer({
          message: s,
          text: a,
          bottom,
          agentId,
        }),
      ),
    );
  }
  await Promise.all(o);
}
