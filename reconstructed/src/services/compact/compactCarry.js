/**
 * services/compact/compactCarry.ts
 *
 * 2.1.316 新增：压缩时需要带过边界的内容
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (1), chunk-e6aww6q8.js (19)
 * attribution: placement 20
 */
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { threadRuleMode, messagesSinceCompactBoundary } from "../projects/threadRows.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  booleanSchema,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isValidPluginName } from "../../utils/cronTasks.js";
import { getSessionCronTasks, isDiskless } from "../../bootstrap/state.js";
import { uniq } from "../../utils/collections.js";
import {
  CRON_CREATE_TOOL_NAME,
  CRON_DELETE_TOOL_NAME,
  isKairosCronEnabled,
} from "../../tools/ScheduleCronTool/prompt.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { toolMatchesName } from "../../Tool.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { isCoordinatorShellVerifiable } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2225644-2225674 placement
/**
 * 压缩携带用的分类器侧状态（所在侧）。
 */
var classifierCarryState = {
  classifierSide: null,
};
//@ chunk-e6aww6q8.js:2225674-2225711 placement
/**
 * 设置分类器侧状态（compaction 携带时使用）。
 */
function setClassifierCarryState(classifierSide) {
  classifierCarryState.classifierSide = classifierSide;
}
//@ chunk-e6aww6q8.js:2225711-2225725 placement
/**
 * 项目线程询问附件允许的最大 JSON 字节数（64 KiB）。
 */
var MAX_CARRY_ASK_BYTES = 65536;
//@ chunk-e6aww6q8.js:2225725-2226699 placement
/**
 * 压缩时把仍在等待回复的项目线程询问带过边界（分类器已加载、保留的消息是尾部、询问未被回答/编辑、长度合适），返回 projects_thread_ask 附件。
 */
function carryProjectsThreadAsk(messages, messagesToKeep, context) {
  let { classifierSide } = classifierCarryState;
  if (classifierSide === null) {
    logFeatureSad("auto_mode_projects_thread_ask_carry", "classifier_not_loaded");
    return null;
  }
  if (!classifierSide.creditsOwnerRows(context) || threadRuleMode() !== "compact-held") return null;
  let keptUuids = new Set(messagesToKeep.map((message) => message.uuid));
  let index = messages.findIndex((message) => keptUuids.has(message.uuid));
  let tailIndex = index === -1 ? messages.length : index;
  let sliced = messages.slice(tailIndex);
  if (!sliced.every((message) => message.type === "progress" || keptUuids.has(message.uuid))) {
    logFeatureSad("auto_mode_projects_thread_ask_carry", "kept_not_the_tail");
    return null;
  }
  let standingAsk = classifierSide.standingAsk(
    [
      ...messages.slice(0, tailIndex),
      ...sliced.filter(
        (message) => message.type === "attachment" && message.attachment.type === "projects_thread_ask",
      ),
    ],
    context,
  );
  let uuid = messages.at(-1)?.uuid;
  if (standingAsk === undefined || uuid === undefined) return null;
  if (standingAsk.answered !== undefined || standingAsk.edited === true) {
    logFeatureSad("auto_mode_projects_thread_ask_carry", "followed_by_words");
    return null;
  }
  let attachment = {
    type: "projects_thread_ask",
    call: standingAsk.call,
    after: uuid,
    deliveredAt: standingAsk.at,
    ...(standingAsk.messageId !== undefined && {
      messageId: standingAsk.messageId,
    }),
  };
  if (jsonStringify(attachment).length > MAX_CARRY_ASK_BYTES) {
    logFeatureSad("auto_mode_projects_thread_ask_carry", "reply_too_long");
    return null;
  }
  logFeatureOk("auto_mode_projects_thread_ask_carry");
  return attachment;
}
//@ chunk-e6aww6q8.js:2226699-2226908 placement
/**
 * 跨压缩携带的会话定时任务与唤醒记录 schema。
 */
var CARRIED_CRON_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CARRIED_WAKEUP_SCHEMA;
deferInit("chunk-e6aww6q8.js:2226699", () => {
  CARRIED_CRON_SCHEMA = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().min(1),
      cron: stringSchema(),
      prompt: stringSchema(),
      createdAt: numberSchema(),
      recurring: booleanSchema(),
      plugin: stringSchema().refine(isValidPluginName).optional(),
    }),
  );
  CARRIED_WAKEUP_SCHEMA = DoctorLazy(() =>
    objectSchema({
      prompt: stringSchema(),
      scheduledFor: numberSchema(),
      reason: stringSchema().optional(),
      keepalive: literal(true).optional(),
    }),
  );
});
//@ chunk-e6aww6q8.js:2226908-2227681 placement
function carryLoopCronAcrossCompact(messages, messagesToKeep) {
  let history = scanCronHistory(messages);
  let nothingCarriable = !hasCarriableCron() && !history.recordsHandoff;
  if (history.made.size === 0 && history.noted.size === 0 && nothingCarriable) return null;
  let keptUuids = new Set(messagesToKeep.map((message) => message.uuid));
  let alreadyCarried = (sessionCronTask) =>
    history.made.has(sessionCronTask.id) || history.noted.has(sessionCronTask.id);
  let keptHistory = scanCronHistory(messagesToKeep);
  let cronCarryAttachment = buildCronCarryAttachment(
    alreadyCarried,
    keptHistory,
    scanCronHistory(messages.filter((message) => !keptUuids.has(message.uuid))),
  );
  let sessionCronTasks = getSessionCronTasks();
  let mapped = sessionCronTasks
    .filter((sessionCronTask) => isCarriableCron(sessionCronTask) && sessionCronTask.kind === undefined)
    .filter((sessionCronTask) => !alreadyCarried(sessionCronTask))
    .map((sessionCronTask) => ({
      id: sessionCronTask.id,
      cron: sessionCronTask.cron,
      prompt: sessionCronTask.prompt,
      createdAt: sessionCronTask.createdAt,
      recurring: sessionCronTask.recurring === true,
    }));
  let found = sessionCronTasks.find(
    (sessionCronTask) => isCarriableCron(sessionCronTask) && sessionCronTask.kind === "loop",
  );
  let wakeup =
    found?.scheduledFor === undefined
      ? undefined
      : {
          prompt: found.prompt,
          scheduledFor: found.scheduledFor,
          ...(found.reason !== undefined && {
            reason: found.reason,
          }),
          ...(found.keepalive === true && {
            keepalive: true,
          }),
        };
  return mapped.length > 0 || wakeup !== undefined || keptHistory.recordsHandoff
    ? {
        ...(cronCarryAttachment ?? {
          type: "session_cron_carry",
          tasks: [],
        }),
        ...(mapped.length > 0 && {
          otherArmed: mapped,
        }),
        ...(wakeup !== undefined && {
          wakeup,
        }),
      }
    : cronCarryAttachment;
}
//@ chunk-e6aww6q8.js:2227681-2227752 placement
/**
 * 定时任务历史里是否有备注或被删除的条目。
 */
function hasCronHistoryChanges(history) {
  let scan = scanCronHistory(history);
  return scan.lastNote !== null || scan.deleted.size > 0;
}
//@ chunk-e6aww6q8.js:2227752-2228045 placement
/**
 * 在压缩失败后的重试中确定仍需携带的定时任务。
 */
function carryCronsAfterRefusal(messages, messagesToKeep) {
  let keptHistory = scanCronHistory(messagesToKeep);
  let history = scanCronHistory(messages);
  let wasCarried = (id) => history.made.has(id) || history.noted.has(id);
  if (keptHistory.lastNote === null && ![...keptHistory.deleted].some(wasCarried)) return null;
  if (missingRecurringCrons(history, [history, keptHistory]).length > 0) return null;
  let timestamp = Date.parse(messagesToKeep[0]?.timestamp ?? "");
  return buildCronCarryAttachment(
    (task) =>
      !keptHistory.made.has(task.id) &&
      (wasCarried(task.id) || (keptHistory.noted.has(task.id) && task.createdAt <= timestamp)),
    history,
    keptHistory,
  );
}
//@ chunk-e6aww6q8.js:2228045-2228502 placement
/**
 * 生成 session_cron_carry 附件：当前会话的普通定时任务与已结束的任务 id。
 */
function buildCronCarryAttachment(predicate, reason, histories) {
  let sessionCronTasks = getSessionCronTasks();
  let mapped = sessionCronTasks
    .filter(
      (sessionCronTask) =>
        predicate(sessionCronTask) &&
        sessionCronTask.agentId === undefined &&
        sessionCronTask.kind === undefined,
    )
    .map((sessionCronTask) => ({
      id: sessionCronTask.id,
      cron: sessionCronTask.cron,
      prompt: sessionCronTask.prompt,
      createdAt: sessionCronTask.createdAt,
      recurring: sessionCronTask.recurring === true,
      ...(sessionCronTask.plugin !== undefined && {
        plugin: sessionCronTask.plugin,
      }),
    }));
  let filtered = uniq([...reason.made, ...reason.noted]).filter(
    (taskId) =>
      (histories.deleted.has(taskId) || reason.ended.has(taskId) || histories.ended.has(taskId)) &&
      !sessionCronTasks.some((sessionCronTask) => sessionCronTask.id === taskId),
  );
  return mapped.length > 0 || filtered.length > 0 || reason.noted.size > 0
    ? {
        type: "session_cron_carry",
        tasks: mapped,
        ...(filtered.length > 0 && {
          ended: filtered,
        }),
      }
    : null;
}
//@ chunk-e6aww6q8.js:2228502-2228697 placement
/**
 * 把上次携带记录中仍未恢复的循环任务补进附件。
 */
function addMissingRecurringCrons(messages, attachment) {
  let history = scanCronHistory(messages);
  let missing = missingRecurringCrons(history, [history]);
  let presentIds = new Set(attachment?.tasks.map((task) => task.id));
  let filtered = missing.filter((task) => !presentIds.has(task.id));
  return filtered.length === 0
    ? attachment
    : {
        ...(attachment ?? {
          type: "session_cron_carry",
        }),
        tasks: [...(attachment?.tasks ?? []), ...filtered],
      };
}
//@ chunk-e6aww6q8.js:2228697-2228734 placement
/**
 * 当前会话是否有可携带的定时任务。
 */
function hasCarriableCron() {
  return getSessionCronTasks().some(isCarriableCron);
}
//@ chunk-e6aww6q8.js:2228734-2228890 placement
/**
 * 上次记录中的循环任务里，当前不存在且未被删除/结束的那些。
 */
function missingRecurringCrons(scan, histories) {
  let sessionCronTasks = getSessionCronTasks();
  return (scan.lastNote ?? []).filter(
    ({ id, recurring }) =>
      recurring &&
      !sessionCronTasks.some((sessionCronTask) => sessionCronTask.id === id) &&
      !histories.some((history) => history.deleted.has(id) || history.ended.has(id)),
  );
}
//@ chunk-e6aww6q8.js:2228890-2228993 placement
/**
 * 主线程的普通定时任务或已排期的 loop 任务。
 */
function isCarriableCron(sessionCronTask) {
  return (
    sessionCronTask.agentId === undefined &&
    (sessionCronTask.kind === undefined ||
      (sessionCronTask.kind === "loop" && sessionCronTask.scheduledFor !== undefined))
  );
}
//@ chunk-e6aww6q8.js:2228993-2229243 placement
/**
 * 读取携带附件中的其他已装配任务与唤醒信息。
 */
function readCronHandoff(message) {
  if (message.type !== "attachment" || message.attachment?.type !== "session_cron_carry") return null;
  let otherArmed = message.attachment.otherArmed;
  let parsed = CARRIED_WAKEUP_SCHEMA().safeParse(message.attachment.wakeup);
  return {
    otherArmed: Array.isArray(otherArmed) ? otherArmed.flatMap(parseCarriedCron) : [],
    wakeup: parsed.success ? parsed.data : undefined,
  };
}
//@ chunk-e6aww6q8.js:2229243-2229406 placement
/**
 * 读取携带附件中的任务列表。
 */
function readCarriedCrons(message) {
  if (message.type !== "attachment" || message.attachment?.type !== "session_cron_carry") return null;
  let tasks = message.attachment.tasks;
  return Array.isArray(tasks) ? tasks.flatMap(parseCarriedCron) : [];
}
//@ chunk-e6aww6q8.js:2229406-2229586 placement
/**
 * 读取携带附件中已结束的任务 id。
 */
function readEndedCronIds(message) {
  if (message.type !== "attachment" || message.attachment?.type !== "session_cron_carry") return [];
  let ended = message.attachment.ended;
  return Array.isArray(ended) ? ended.filter((id) => typeof id === "string") : [];
}
//@ chunk-e6aww6q8.js:2229586-2230494 placement
/**
 * 扫描消息：创建、删除、携带记录中的定时任务 id 与最后一次携带记录。
 */
function scanCronHistory(messages) {
  let createdToolUses = new Set();
  let history = {
    made: new Set(),
    noted: new Set(),
    deleted: new Set(),
    ended: new Set(),
    lastNote: null,
    recordsHandoff: false,
  };
  for (let message of messages)
    if (message.type === "assistant") {
      let content = message.message.content;
      if (!Array.isArray(content)) continue;
      for (let block of content) {
        if (block?.type !== "tool_use") continue;
        let input = block.input;
        if (block.name === CRON_CREATE_TOOL_NAME) createdToolUses.add(block.id);
        else if (
          block.name === CRON_DELETE_TOOL_NAME &&
          typeof input === "object" &&
          input !== null &&
          "id" in input &&
          typeof input.id === "string"
        )
          history.deleted.add(input.id);
      }
    } else if (message.type === "user") {
      let content = message.message.content;
      let toolUseResult = message.toolUseResult;
      if (
        Array.isArray(content) &&
        typeof toolUseResult === "object" &&
        toolUseResult !== null &&
        "id" in toolUseResult &&
        typeof toolUseResult.id === "string" &&
        !("durable" in toolUseResult && toolUseResult.durable === true) &&
        content.some(
          (block) =>
            block?.type === "tool_result" && !block.is_error && createdToolUses.has(block.tool_use_id),
        )
      )
        history.made.add(toolUseResult.id);
    } else {
      let carriedCrons = readCarriedCrons(message);
      if (carriedCrons === null) continue;
      history.lastNote = carriedCrons;
      for (let carriedCron of carriedCrons) history.noted.add(carriedCron.id);
      for (let cronId of readEndedCronIds(message)) history.ended.add(cronId);
      let cronHandoff = readCronHandoff(message);
      if (cronHandoff !== null && (cronHandoff.otherArmed.length > 0 || cronHandoff.wakeup !== undefined))
        history.recordsHandoff = true;
    }
  return history;
}
//@ chunk-e6aww6q8.js:2230494-2230637 placement
/**
 * 校验一条携带的定时任务（格式错误时丢弃并记录）。
 */
function parseCarriedCron(entry) {
  let parsed = CARRIED_CRON_SCHEMA().safeParse(entry);
  if (!parsed.success) logForDebugging("resume: a carried session cron is left out: malformed");
  return parsed.success ? [parsed.data] : [];
}
//@ chunk-e6aww6q8.js:2230637-2230725 placement
/**
 * 保留的工具里是否有会因压缩丢失会话状态读取的工具（读文件、Bash、REPL）；无盘会话恒为否。
 */
function willToolsLoseSessionState(tools) {
  if (isDiskless()) return false;
  return tools.some(
    (tool) =>
      toolMatchesName(tool, FILE_READ_TOOL_NAME) ||
      (toolMatchesName(tool, BASH_TOOL_NAME) && !isCoordinatorShellVerifiable()) ||
      toolMatchesName(tool, REPL_TOOL_NAME),
  );
}
//@ chunk-0sfjpx19.js:139745-139858 placement
/**
 * Kairos 定时任务开启时，为保留的定时任务生成随压缩/回退携带的附件消息。
 */
function cronCarryAttachment(messages, history) {
  if (messages.length === 0 || !hasCronHistoryChanges(history) || !isKairosCronEnabled()) return null;
  let carried = carryCronsAfterRefusal(messagesSinceCompactBoundary([...messages]), history);
  return carried === null ? null : createAttachmentMessage(carried);
}
export {
  willToolsLoseSessionState,
  readCarriedCrons,
  readEndedCronIds,
  cronCarryAttachment,
  addMissingRecurringCrons,
  carryLoopCronAcrossCompact,
  hasCarriableCron,
  setClassifierCarryState,
  carryProjectsThreadAsk,
};
