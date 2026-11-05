/**
 * tools/REPLTool/asyncSettle.ts
 *
 * 异步 settle 的收尾：hook 扣留、结果分段、预算截断与消息排队投递（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (10)
 * attribution: placement 10
 */
import { isReplTypedEventsOn } from "../../utils/codeMode/typedEvents.js";
import { escapedEventJsonBody, collectFieldStrings } from "../../utils/pollEvents/declarations.js";
import {
  escapeXmlText,
  validatePollEvent,
  EVAL_SETTLE_EVENT_KIND,
  isWakingPollCommand,
} from "../../utils/pollEvents.js";
import { SETTLE_TEXT_BYTE_BUDGET, fitSettleParts, truncateToBytes } from "./outputBudget.js";
import {
  persistToolResult,
  isPersistError,
  buildPersistedOutputMessage,
} from "../../utils/toolResultStorage.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { isHostError } from "../../utils/errors/hostError.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { isStoppedContinuation } from "../../utils/hooks/replHookFeedback.js";
import {
  executeUserPromptSubmitHooksForSession,
  getUserPromptSubmitHookBlockingMessage,
} from "../../utils/hooks.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { clientsDrawScriptCalls } from "../../utils/codeMode/vscodeExtensionStream.js";
import { replErrorMessages } from "../../utils/codeMode/scriptErrorMessages.js";
import { enqueuePollEvent } from "../../utils/messageQueueManager.js";
import { REPL_TIMER_LATE_MS, REPL_TIMER_GRACE_MS } from "../../utils/codeMode.js";

//@ chunk-n51jggtb.js:22171-23012 placement
/**
 * 把 settle 结果里的文本与 base64 图片/PDF 拆开；超过预算时把正文写入工具结果文件并改回文件引用。
 */
async function settleOutputOf(result, options) {
  let texts = [];
  let media = [];
  for (let block of typeof result.content === "string"
    ? [
        {
          type: "text",
          text: result.content,
        },
      ]
    : (result.content ?? []))
    switch (block.type) {
      case "text":
        texts.push(block.text);
        break;
      case "image":
        if (block.source.type === "base64")
          media.push({
            type: "image",
            source: {
              type: "base64",
              media_type: block.source.media_type,
              data: block.source.data,
            },
          });
        break;
      case "document":
        if (block.source.type === "base64")
          media.push({
            type: "document",
            source: {
              type: "base64",
              media_type: block.source.media_type,
              data: block.source.data,
            },
          });
        break;
      default:
        break;
    }
  let joined = texts.join(`
`);
  let escaper = isReplTypedEventsOn() ? escapedEventJsonBody : escapeXmlText;
  if (Buffer.byteLength(escaper(joined), "utf8") <= SETTLE_TEXT_BYTE_BUDGET)
    return {
      text: joined,
      media,
    };
  try {
    let persisted = await persistToolResult(
      joined,
      result.tool_use_id,
      options.toolResultsDir,
      options.storageV5,
    );
    if (isPersistError(persisted))
      return {
        text: joined,
        media,
      };
    return {
      text: buildPersistedOutputMessage(persisted),
      media,
    };
  } catch (error) {
    logForDebugging(
      `async REPL settle text was not written to a file: ${isHostError(error) ? error.message : "(non-Error rejection)"}`,
      {
        level: "warn",
      },
    );
    return {
      text: joined,
      media,
    };
  }
}
//@ chunk-n51jggtb.js:23012-23231 placement
/**
 * 把 hook 扣留的输出压成一行摘要（最多 1000 字符再压到 200）。
 */
function withheldOutputMessage(text) {
  let firstLine = text.trim().split(/\r\n|[\n\r\u0085\u2028\u2029]/, 1)[0] ?? "";
  let trimmed = stripControlChars(truncateToLength(firstLine, 1000)).trim();
  let shortened = truncateToLength(trimmed, 200);
  return trimmed === ""
    ? "Output withheld by a hook"
    : `Output withheld by a hook: ${shortened.length < trimmed.length ? `${shortened}\u2026` : shortened}`;
}
//@ chunk-n51jggtb.js:23231-23280 placement
/**
 * "its reason was withheld with the output" 常量，用于 hook 扣留时补的说明。
 */
var WITHHELD_REASON_TEXT = "its reason was withheld with the output";
//@ chunk-n51jggtb.js:23280-23501 placement
/**
 * 为 hook_stopped_continuation 附件补上“原因随输出一起被扣留”的说明。
 */
function withheldFollowing(following) {
  let messages =
    following?.messages.filter(isStoppedContinuation).map((message) =>
      message.attachment.type === "hook_stopped_continuation"
        ? createAttachmentMessage({
            ...message.attachment,
            message: WITHHELD_REASON_TEXT,
          })
        : message,
    ) ?? [];
  return following !== undefined && messages.length > 0
    ? {
        messages,
        contextLayers: [],
        turn: following.turn,
      }
    : undefined;
}
//@ chunk-n51jggtb.js:23501-25382 placement
/**
 * 异步 settle 的投递主流程：先跑 PostToolUse hook，再按扣留/失败/重写组装消息并排队交给会话。
 */
async function deliverSettle(
  evalId,
  settle,
  failed,
  context,
  retired = () => false,
  isPassive = () => false,
  onNotDelivered = () => {},
) {
  let { session, sessionHooks, getAppState, agentId } = context;
  let headerText = failed
    ? `eval #${evalId} FAILED before settling:`
    : settle.late
      ? `eval #${evalId} late output:`
      : `eval #${evalId} settled:`;
  let status = settle.late ? "late" : "settled";
  let baseAttributes = {
    eval: String(evalId),
    ...(settle.ms !== undefined && {
      ms: String(Math.round(settle.ms)),
    }),
  };
  let makeEvent = (content, status) =>
    validatePollEvent({
      kind: EVAL_SETTLE_EVENT_KIND,
      at: new Date().toISOString(),
      content,
      attributes: {
        ...baseAttributes,
        status,
      },
    });
  let at = new Date().toISOString();
  let typedFields = isReplTypedEventsOn() ? typedSettleFields(evalId, settle, failed) : undefined;
  let elementEvent =
    typedFields !== undefined
      ? ""
      : settle.parts !== undefined && !failed
        ? validatePollEvent({
            kind: EVAL_SETTLE_EVENT_KIND,
            at: new Date().toISOString(),
            content: "",
            attributes: {
              ...baseAttributes,
              status,
            },
            children: fitSettleParts(settle.parts, SETTLE_TEXT_BYTE_BUDGET),
          })
        : makeEvent(
            `${headerText}
${truncateToBytes(settle.text, SETTLE_TEXT_BYTE_BUDGET)}`,
            failed ? "failed" : status,
          );
  let { media, rows, following } = settle;
  let hookFailureCode;
  let blockingReason;
  let blockingError = "";
  let keepsRow = settle.keepsRow === true;
  try {
    for await (let hookResult of executeUserPromptSubmitHooksForSession(
      session,
      sessionHooks,
      typedFields === undefined ? elementEvent : collectFieldStrings(typedFields),
      getAppState().toolPermissionContext.mode,
      undefined,
    ))
      if (hookResult.blockingError) {
        blockingReason = getUserPromptSubmitHookBlockingMessage(hookResult.blockingError);
        blockingError = hookResult.blockingError.blockingError;
        break;
      }
  } catch (error) {
    if (isAbortError(error)) logForDebugging("async REPL settle hook pass aborted");
    else logError(error);
    hookFailureCode = "hook_infra_fail_open";
  }
  if (retired()) {
    onNotDelivered();
    return;
  }
  if (blockingReason !== undefined) {
    let withheldText = `eval #${evalId} settled, but its output was withheld \u2014 ${blockingReason}`;
    if (typedFields !== undefined)
      typedFields = {
        ...settleIdentity(evalId, settle),
        status: "withheld",
        text: truncateToBytes(withheldText, SETTLE_TEXT_BYTE_BUDGET, escapedEventJsonBody),
      };
    else elementEvent = makeEvent(truncateToBytes(withheldText, SETTLE_TEXT_BYTE_BUDGET), "withheld");
    media = [];
    let clientsDrawCalls = clientsDrawScriptCalls();
    rows = clientsDrawCalls
      ? replErrorMessages(withheldOutputMessage(blockingError), {
          clientsDrawCalls: true,
          shownOnCall: true,
          ...(settle.late !== true && {
            withheldScriptToolUseId: settle.toolUseId,
          }),
        })
      : undefined;
    keepsRow = !clientsDrawCalls;
    following = withheldFollowing(following);
    hookFailureCode = "hook_blocked";
  }
  let passive = isPassive();
  let delivery = enqueuePollEvent({
    kind: EVAL_SETTLE_EVENT_KIND,
    ...(typedFields !== undefined
      ? {
          typed: {
            at,
            fields: typedFields,
          },
        }
      : {
          element: elementEvent,
        }),
    allowReservedKind: true,
    media,
    ...(passive && {
      passive: true,
    }),
    ...(settle.toolUseId !== undefined && {
      replToolUseId: settle.toolUseId,
    }),
    ...(rows !== undefined &&
      rows.length > 0 && {
        displayRows: rows,
      }),
    ...(following !== undefined && {
      following,
    }),
    ...(keepsRow && {
      keepsRow: true,
    }),
    wake: true,
    ...(settle.startsTurn === false && {
      startsTurn: false,
    }),
    ...(agentId !== undefined && {
      agentId,
    }),
  });
  context.onQueued?.(
    delivery,
    isWakingPollCommand({
      passive,
      wake: true,
      startsTurn: settle.startsTurn,
    }),
  );
  delivery.then(
    () => {},
    (error) => {
      onNotDelivered();
      logForDebugging(
        `async REPL settle for eval #${evalId} was not delivered: ${isHostError(error) ? error.message : "(non-Error rejection)"}`,
        {
          level: "warn",
        },
      );
    },
  );
}
//@ chunk-n51jggtb.js:25382-25511 placement
/**
 * 从 settle 记录里取出 eval 编号与取整后的耗时。
 */
function settleIdentity(evalId, settle) {
  let ms = settle.ms === undefined ? undefined : Math.round(settle.ms);
  return {
    eval: evalId,
    ...(ms !== undefined &&
      Number.isSafeInteger(ms) &&
      ms >= 0 && {
        ms,
      }),
  };
}
//@ chunk-n51jggtb.js:25511-25895 placement
/**
 * 把 settle 记录整理成 typed 消息（status/text 或 log/result/error 分段）并做预算截断。
 */
function typedSettleFields(evalId, settle, failed) {
  let status = failed ? "failed" : settle.late ? "late" : "settled";
  if (settle.parts === undefined || failed)
    return {
      ...settleIdentity(evalId, settle),
      status,
      text: truncateToBytes(settle.text, SETTLE_TEXT_BYTE_BUDGET, escapedEventJsonBody),
    };
  let parts = fitSettleParts(settle.parts, SETTLE_TEXT_BYTE_BUDGET, escapedEventJsonBody);
  let mapped = parts.filter((part) => part.tag === "log").map((part) => part.text);
  let resultText = parts.find((part) => part.tag === "result")?.text;
  let errorText = parts.find((part) => part.tag === "error")?.text;
  return {
    ...settleIdentity(evalId, settle),
    status,
    ...(mapped.length > 0 && {
      log: mapped,
    }),
    ...(resultText !== undefined && {
      result: resultText,
    }),
    ...(errorText !== undefined && {
      error: errorText,
    }),
  };
}
//@ chunk-n51jggtb.js:26410-26522 placement
/**
 * 生成“late output from eval #N”提示行，放在迟到输出之前。
 */
function lateOutputMarker(evalId) {
  return {
    tag: "log",
    text: `[late output from eval #${evalId} (settled earlier) \u2014 delivered below.]`,
  };
}
//@ chunk-n51jggtb.js:26522-26853 placement
/**
 * 带超时的 settle 闸门：open/taken/closed 三态，超时后以 undefined 放行。
 */
function createSlot(timeoutMs) {
  let state = "open";
  let resolveSettled = () => {};
  let settled = new Promise((resolve) => {
    resolveSettled = resolve;
  });
  function close() {
    if (state !== "open") return;
    state = "closed";
    resolveSettled(undefined);
  }
  let timeout = timeoutMs > 0 ? setTimeout(close, timeoutMs) : undefined;
  if (timeout === undefined) close();
  return {
    settled,
    take(value) {
      if (state !== "open") return false;
      state = "taken";
      clearTimeout(timeout);
      resolveSettled(value);
      return true;
    },
    taken: () => state === "taken",
    open: () => state === "open",
    close() {
      clearTimeout(timeout);
      close();
    },
  };
}
//@ chunk-n51jggtb.js:26853-27000 placement
/**
 * 定时器包装：按单调时钟重算间隔，首次触发误差过大时改用下一轮常量重排。
 */
function armLatenessAwareTimer(clock, onDue, delayMs) {
  let dueAt = clock.now() + delayMs;
  let timeout = clock.setTimeout(
    () => {
      if (clock.now() - dueAt <= REPL_TIMER_LATE_MS) {
        onDue();
        return;
      }
      timeout = clock.setTimeout(onDue, REPL_TIMER_GRACE_MS, {
        unref: true,
      });
    },
    delayMs,
    {
      unref: true,
    },
  );
  return () => timeout();
}
export {
  withheldFollowing,
  deliverSettle,
  lateOutputMarker,
  createSlot,
  armLatenessAwareTimer,
  settleOutputOf,
};
