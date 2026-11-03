/**
 * cli/print/sessionTitles.ts
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
import { Ne } from "./sessionControlRequests.js";
import { isPromptHookObserved } from "../../utils/telemetry/sessionTracing.js";
import { kEo } from "../sdkMcpManifests.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { isHumanTurn_3 } from "../../utils/messagePredicates.js";

//@ chunk-nkdv7dw8.js:36337-36594 placement
function generateTitleFromPrompt(e, n, o) {
  let { titles: titles } = n;
  if (titles.attempted) return;
  let r = getSessionId(),
    u = pickTitleFallback({
      prose: e,
      isContinuationTurn: !1,
      fallback: titles.fallback?.sessionId === r ? titles.fallback.fallback : void 0,
    });
  if (!u) return;
  if (
    ((titles.attempted = !0),
    (titles.fallback = { sessionId: r, fallback: u }),
    !getCurrentSessionDisplayTitle(r))
  )
    saveGeneratedTitle(u.text, n, o);
}
/**
 * 撤回本会话尚未完成的会话标题生成请求，并清除回退标题。
 */
//@ chunk-nkdv7dw8.js:36594-36750 placement
function retractPendingTitle(e) {
  if (((e.fallback = void 0), e.pending?.sessionId === getSessionId() && !e.pending.call.settled))
    ((e.pending.call.retracted = !0), (e.pending = void 0), (e.attempted = e.latched));
}
/**
 * 收到首条真实用户输入时尝试生成会话标题：跳过非人工/合成/对等来源；prompt hook 观察中等情况下推迟（标记 owed），否则立即生成。疑似放错文件（与 MCP 控制请求无关）。
 */
//@ chunk-nkdv7dw8.js:36750-37111 placement
function maybeTitleFromUserMessage(e, n) {
  if (n.titles.attempted || e.shouldQuery === !1 || e.peerFrom || e.isSynthetic || !isHumanOrUnset(e.origin))
    return;
  let o;
  try {
    o = textForResubmit({
      content: e.content,
      origin: e.queuedOrigin,
      commands: n.dispatchCommands(),
      dispatchesSlashCommands: e.dispatchesSlashCommands,
    });
  } catch (error) {
    Ne(n, error);
    return;
  }
  if (o === null) return;
  if (isPromptHookObserved() || kEo() || hasModuleHookingSite("session.append")) {
    n.titles.owed = !0;
    return;
  }
  generateTitleFromPrompt(o, n);
}
/**
 * 若欠一次会话标题生成，则取最近一条用户输入的文本生成标题；出错交给错误处理。
 */
//@ chunk-nkdv7dw8.js:37111-37344 placement
function settleOwedTitle(e) {
  try {
    if (!e.titles.owed) return;
    let last = e.conversation().findLast((r) => getUserPromptFromMessage(r) !== void 0),
      o = last && getUserPromptFromMessage(last),
      s = o && getResubmitText({ ...o, commands: e.dispatchCommands() });
    if (s) ((e.titles.owed = !1), generateTitleFromPrompt(s, e, new AbortController().signal));
  } catch (error) {
    Ne(e, error);
  }
}
/**
 * 从用户消息或 queued_command 附件中取真实用户输入（内容、来源），用于会话标题。旧版名 getVerifyPlanReminderTurnCount 为错配。
 */
//@ chunk-nkdv7dw8.js:37344-37689 placement = getVerifyPlanReminderTurnCount (0.415)
function getUserPromptFromMessage(messages) {
  if (isHumanTurn_3(messages))
    return isSyntheticMessage(messages)
      ? void 0
      : {
          content: messages.message.content,
          origin: messages.origin,
          queueSkipSlashCommands: messages.queueSkipSlashCommands,
        };
  if (messages.type !== "attachment" || messages.attachment.type !== "queued_command") return;
  let n = parseQueuedCommandAttachment(messages.attachment, messages.uuid);
  return n && !n.isMeta && isHumanOrUnset(n.origin)
    ? { content: n.content, origin: n.origin, queueSkipSlashCommands: void 0 }
    : void 0;
}

export { settleOwedTitle, retractPendingTitle, maybeTitleFromUserMessage };
