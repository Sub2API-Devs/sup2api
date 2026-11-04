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
import { __export } from "../../runtime/bun-runtime.js";
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
__export(attachmentAnswerCache, {
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
function answerAuthorOf(trace, text) {
  let answeringStep = findAnsweringStep(trace, "text", text);
  return answeringStep === undefined ? "a hook" : `${answeringStep.plugin} (${answeringStep.tier})`;
}
//@ chunk-6mt8vha1.js:12224-12344 placement
function attachmentAnswerOf(result, text) {
  let text_2 = result.text;
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
var envelopeOf = (attachment, text, agentId) => ({
  text,
  origin: classifyHookAttachmentSource(attachment),
  ...(agentId !== undefined && {
    agentId,
  }),
});
//@ chunk-6mt8vha1.js:12411-13019 placement
function attachmentInputOf(message, text, agentId) {
  let { attachment } = message;
  let envelope = envelopeOf(attachment, text, agentId);
  let basicInput = {
    type: attachment.type,
    ...envelope,
  };
  switch (attachment.type) {
    case "plan_mode": {
      let { reminderType, planFilePath, planExists } = attachment;
      return (reminderType === "full" || reminderType === "sparse") &&
        typeof planFilePath === "string" &&
        typeof planExists === "boolean"
        ? {
            type: attachment.type,
            ...envelope,
            detail: {
              reminder: reminderType,
              planFilePath,
              hasPlan: planExists,
            },
          }
        : basicInput;
    }
    case "plan_mode_reentry": {
      let { planFilePath } = attachment;
      return typeof planFilePath === "string"
        ? {
            type: attachment.type,
            ...envelope,
            detail: {
              planFilePath,
            },
          }
        : basicInput;
    }
    case "plan_mode_exit": {
      let { planFilePath, planExists } = attachment;
      return typeof planFilePath === "string" && typeof planExists === "boolean"
        ? {
            type: attachment.type,
            ...envelope,
            detail: {
              planFilePath,
              hasPlan: planExists,
            },
          }
        : basicInput;
    }
    default:
      return {
        type: attachment.type,
        ...envelope,
      };
  }
}
//@ chunk-6mt8vha1.js:13019-13159 placement
function changeDescribed(answer, text) {
  return answer.kind === "left-out"
    ? `left it out (${text.length} characters)`
    : `rewrote it (${text.length} -> ${answer.text.length} characters)`;
}
//@ chunk-6mt8vha1.js:13159-13623 placement
async function askedAnswer(input) {
  let { message, text, bottom, agentId } = input;
  let attachmentType = message.attachment.type;
  let trace = [];
  try {
    let answeringText = await createEventCallersRef({
      signal: bottom.signal,
      origin: bottom.origin,
      trace: (steps) => {
        trace = steps;
      },
    }).prompt.attachment(attachmentInputOf(message, text, agentId));
    let answer = attachmentAnswerOf(answeringText, text);
    if (answer.kind !== "engine")
      logForDebugging(
        `prompt.attachment ${attachmentType}: ${answerAuthorOf(trace, answeringText.text)} ` +
          changeDescribed(answer, text),
      );
    return answer;
  } catch (error) {
    if (isAbortError(error) || bottom.signal.aborted) throw error;
    logForDebugging(
      `prompt.attachment ${attachmentType}: the dispatch failed, the text stands as the engine rendered it: ${errorMessage(error)}`,
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
async function resolveAttachments(messages, bottom, agentId) {
  let pendingResolutions = [];
  let shortcut = canShortcutAppend("prompt.attachment");
  for (let message of messages) {
    if (message.type !== "attachment") continue;
    if (answerOf(message.uuid) !== undefined) continue;
    let pending = pendingOf(message.uuid);
    if (pending !== undefined) {
      pendingResolutions.push(
        pending.catch(() => {
          return;
        }),
      );
      continue;
    }
    let text = attachmentText(message);
    if (!(
      text !== null &&
      hasModuleHookingSite(
        "prompt.attachment",
        {
          type: message.attachment.type,
        },
        shortcut,
      )
    )) {
      settle(message.uuid, {
        kind: "engine",
      });
      continue;
    }
    pendingResolutions.push(
      resolve(
        message.uuid,
        askedAnswer({
          message,
          text,
          bottom,
          agentId,
        }),
      ),
    );
  }
  await Promise.all(pendingResolutions);
}
export {
  answerAuthorOf,
  askedAnswer,
  attachmentAnswerOf,
  attachmentInputOf,
  changeDescribed,
  attachmentAnswerCache,
  envelopeOf,
  resolveAttachments,
};
