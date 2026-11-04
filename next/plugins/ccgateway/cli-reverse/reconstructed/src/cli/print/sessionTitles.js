/**
 * cli/print/sessionTitles.ts
 *
 * 2.1.316 新增：会话标题的生成与撤回：从用户首条消息推导标题、写入前撤回旧标题、结算欠下的标题，供 print 模式使用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nkdv7dw8.js (5)
 * attribution: placement 5
 */
import { getSessionId } from "../../bootstrap/state.js";
import { pickTitleFallback } from "../../utils/sessionTitle.js";
import { getCurrentSessionDisplayTitle } from "../../utils/sessionStorage.js";
import { saveGeneratedTitle } from "./mcpControlRequests.js";
import { isHumanOrUnset } from "../../utils/messageProvenance.js";
import {
  textForResubmit,
  getResubmitText,
  isSyntheticMessage,
  parseQueuedCommandAttachment,
} from "../../utils/messages.js";
import { logTitleChangeError } from "./sessionControlRequests.js";
import { isPromptHookObserved } from "../../utils/telemetry/sessionTracing.js";
import { needsPromptsScreened } from "../sdkMcpManifests.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { isHumanTurn_3 } from "../../utils/messagePredicates.js";

//@ chunk-nkdv7dw8.js:36337-36594 placement
function generateTitleFromPrompt(prose, context, signal) {
  let { titles } = context;
  if (titles.attempted) return;
  let sessionId = getSessionId();
  let fallback = pickTitleFallback({
    prose,
    isContinuationTurn: false,
    fallback: titles.fallback?.sessionId === sessionId ? titles.fallback.fallback : undefined,
  });
  if (!fallback) return;
  titles.attempted = true;
  titles.fallback = {
    sessionId,
    fallback,
  };
  if (!getCurrentSessionDisplayTitle(sessionId)) saveGeneratedTitle(fallback.text, context, signal);
}
//@ chunk-nkdv7dw8.js:36594-36750 placement
/**
 * 撤回本会话尚未完成的会话标题生成请求，并清除回退标题。
 */
function retractPendingTitle(titles) {
  titles.fallback = undefined;
  if (titles.pending?.sessionId === getSessionId() && !titles.pending.call.settled) {
    titles.pending.call.retracted = true;
    titles.pending = undefined;
    titles.attempted = titles.latched;
  }
}
//@ chunk-nkdv7dw8.js:36750-37111 placement
/**
 * 收到首条真实用户输入时尝试生成会话标题：跳过非人工/合成/对等来源；prompt hook 观察中等情况下推迟（标记 owed），否则立即生成。疑似放错文件（与 MCP 控制请求无关）。
 */
function maybeTitleFromUserMessage(message, context) {
  if (
    context.titles.attempted ||
    message.shouldQuery === false ||
    message.peerFrom ||
    message.isSynthetic ||
    !isHumanOrUnset(message.origin)
  )
    return;
  let prose;
  try {
    prose = textForResubmit({
      content: message.content,
      origin: message.queuedOrigin,
      commands: context.dispatchCommands(),
      dispatchesSlashCommands: message.dispatchesSlashCommands,
    });
  } catch (error) {
    logTitleChangeError(context, error);
    return;
  }
  if (prose === null) return;
  if (isPromptHookObserved() || needsPromptsScreened() || hasModuleHookingSite("session.append")) {
    context.titles.owed = true;
    return;
  }
  generateTitleFromPrompt(prose, context);
}
//@ chunk-nkdv7dw8.js:37111-37344 placement
/**
 * 若欠一次会话标题生成，则取最近一条用户输入的文本生成标题；出错交给错误处理。
 */
function settleOwedTitle(context) {
  try {
    if (!context.titles.owed) return;
    let messages = context
      .conversation()
      .findLast((message) => getUserPromptFromMessage(message) !== undefined);
    let prompt = messages && getUserPromptFromMessage(messages);
    let prose =
      prompt &&
      getResubmitText({
        ...prompt,
        commands: context.dispatchCommands(),
      });
    if (prose) {
      context.titles.owed = false;
      generateTitleFromPrompt(prose, context, new AbortController().signal);
    }
  } catch (error) {
    logTitleChangeError(context, error);
  }
}
//@ chunk-nkdv7dw8.js:37344-37689 placement (2.1.88 match: getVerifyPlanReminderTurnCount, 0.415)
/**
 * 从用户消息或 queued_command 附件中取真实用户输入（内容、来源），用于会话标题。旧版名 getVerifyPlanReminderTurnCount 为错配。
 */
function getUserPromptFromMessage(messages) {
  if (isHumanTurn_3(messages))
    return isSyntheticMessage(messages)
      ? undefined
      : {
          content: messages.message.content,
          origin: messages.origin,
          queueSkipSlashCommands: messages.queueSkipSlashCommands,
        };
  if (messages.type !== "attachment" || messages.attachment.type !== "queued_command") return;
  let queuedCommandAttachment = parseQueuedCommandAttachment(messages.attachment, messages.uuid);
  return queuedCommandAttachment &&
    !queuedCommandAttachment.isMeta &&
    isHumanOrUnset(queuedCommandAttachment.origin)
    ? {
        content: queuedCommandAttachment.content,
        origin: queuedCommandAttachment.origin,
        queueSkipSlashCommands: undefined,
      }
    : undefined;
}
export { settleOwedTitle, retractPendingTitle, maybeTitleFromUserMessage };
