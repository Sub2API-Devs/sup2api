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
import { u, string, E, M, literal } from "../../../vendor/zod/v4/classic/schemas.js";
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
function carryProjectsThreadAsk(e, n, r) {
  let { classifierSide } = classifierCarryState;
  if (classifierSide === null) {
    logFeatureSad("auto_mode_projects_thread_ask_carry", "classifier_not_loaded");
    return null;
  }
  if (!classifierSide.creditsOwnerRows(r) || threadRuleMode() !== "compact-held") return null;
  let h = new Set(n.map((Z) => Z.uuid));
  let index = e.findIndex((Z) => h.has(Z.uuid));
  let S = index === -1 ? e.length : index;
  let sliced = e.slice(S);
  if (!sliced.every((Z) => Z.type === "progress" || h.has(Z.uuid))) {
    logFeatureSad("auto_mode_projects_thread_ask_carry", "kept_not_the_tail");
    return null;
  }
  let L = classifierSide.standingAsk(
    [
      ...e.slice(0, S),
      ...sliced.filter((Z) => Z.type === "attachment" && Z.attachment.type === "projects_thread_ask"),
    ],
    r,
  );
  let uuid = e.at(-1)?.uuid;
  if (L === undefined || uuid === undefined) return null;
  if (L.answered !== undefined || L.edited === true) {
    logFeatureSad("auto_mode_projects_thread_ask_carry", "followed_by_words");
    return null;
  }
  let q = {
    type: "projects_thread_ask",
    call: L.call,
    after: uuid,
    deliveredAt: L.at,
    ...(L.messageId !== undefined && {
      messageId: L.messageId,
    }),
  };
  if (jsonStringify(q).length > MAX_CARRY_ASK_BYTES) {
    logFeatureSad("auto_mode_projects_thread_ask_carry", "reply_too_long");
    return null;
  }
  logFeatureOk("auto_mode_projects_thread_ask_carry");
  return q;
}
//@ chunk-e6aww6q8.js:2226699-2226908 placement
/**
 * 跨压缩携带的会话定时任务与唤醒记录 schema。
 */
var CARRIED_CRON_SCHEMA = DoctorLazy(() =>
  u({
    id: string().min(1),
    cron: string(),
    prompt: string(),
    createdAt: E(),
    recurring: M(),
    plugin: string().refine(isValidPluginName).optional(),
  }),
);
var CARRIED_WAKEUP_SCHEMA = DoctorLazy(() =>
  u({
    prompt: string(),
    scheduledFor: E(),
    reason: string().optional(),
    keepalive: literal(true).optional(),
  }),
);
//@ chunk-e6aww6q8.js:2226908-2227681 placement
function carryLoopCronAcrossCompact(e, n) {
  let r = scanCronHistory(e);
  let s = !hasCarriableCron() && !r.recordsHandoff;
  if (r.made.size === 0 && r.noted.size === 0 && s) return null;
  let h = new Set(n.map((ke) => ke.uuid));
  let y = (sessionCronTask) => r.made.has(sessionCronTask.id) || r.noted.has(sessionCronTask.id);
  let S = scanCronHistory(n);
  let cronCarryAttachment = buildCronCarryAttachment(
    y,
    S,
    scanCronHistory(e.filter((ke) => !h.has(ke.uuid))),
  );
  let sessionCronTasks = getSessionCronTasks();
  let mapped = sessionCronTasks
    .filter((sessionCronTask) => isCarriableCron(sessionCronTask) && sessionCronTask.kind === undefined)
    .filter((sessionCronTask) => !y(sessionCronTask))
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
  let Z =
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
  return mapped.length > 0 || Z !== undefined || S.recordsHandoff
    ? {
        ...(cronCarryAttachment ?? {
          type: "session_cron_carry",
          tasks: [],
        }),
        ...(mapped.length > 0 && {
          otherArmed: mapped,
        }),
        ...(Z !== undefined && {
          wakeup: Z,
        }),
      }
    : cronCarryAttachment;
}
//@ chunk-e6aww6q8.js:2227681-2227752 placement
/**
 * 定时任务历史里是否有备注或被删除的条目。
 */
function hasCronHistoryChanges(e) {
  let n = scanCronHistory(e);
  return n.lastNote !== null || n.deleted.size > 0;
}
//@ chunk-e6aww6q8.js:2227752-2228045 placement
/**
 * 在压缩失败后的重试中确定仍需携带的定时任务。
 */
function carryCronsAfterRefusal(e, n) {
  let r = scanCronHistory(n);
  let s = scanCronHistory(e);
  let h = (id) => s.made.has(id) || s.noted.has(id);
  if (r.lastNote === null && ![...r.deleted].some(h)) return null;
  if (missingRecurringCrons(s, [s, r]).length > 0) return null;
  let timestamp = Date.parse(n[0]?.timestamp ?? "");
  return buildCronCarryAttachment(
    (S) => !r.made.has(S.id) && (h(S.id) || (r.noted.has(S.id) && S.createdAt <= timestamp)),
    s,
    r,
  );
}
//@ chunk-e6aww6q8.js:2228045-2228502 placement
/**
 * 生成 session_cron_carry 附件：当前会话的普通定时任务与已结束的任务 id。
 */
function buildCronCarryAttachment(e, n, r) {
  let sessionCronTasks = getSessionCronTasks();
  let mapped = sessionCronTasks
    .filter(
      (sessionCronTask) =>
        e(sessionCronTask) && sessionCronTask.agentId === undefined && sessionCronTask.kind === undefined,
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
  let filtered = uniq([...n.made, ...n.noted]).filter(
    (S) =>
      (r.deleted.has(S) || n.ended.has(S) || r.ended.has(S)) &&
      !sessionCronTasks.some((sessionCronTask) => sessionCronTask.id === S),
  );
  return mapped.length > 0 || filtered.length > 0 || n.noted.size > 0
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
function addMissingRecurringCrons(e, n) {
  let r = scanCronHistory(e);
  let s = missingRecurringCrons(r, [r]);
  let h = new Set(n?.tasks.map((task) => task.id));
  let filtered = s.filter((S) => !h.has(S.id));
  return filtered.length === 0
    ? n
    : {
        ...(n ?? {
          type: "session_cron_carry",
        }),
        tasks: [...(n?.tasks ?? []), ...filtered],
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
function missingRecurringCrons(e, n) {
  let sessionCronTasks = getSessionCronTasks();
  return (e.lastNote ?? []).filter(
    ({ id, recurring }) =>
      recurring &&
      !sessionCronTasks.some((sessionCronTask) => sessionCronTask.id === id) &&
      !n.some((y) => y.deleted.has(id) || y.ended.has(id)),
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
function readCronHandoff(e) {
  if (e.type !== "attachment" || e.attachment?.type !== "session_cron_carry") return null;
  let otherArmed = e.attachment.otherArmed;
  let r = CARRIED_WAKEUP_SCHEMA().safeParse(e.attachment.wakeup);
  return {
    otherArmed: Array.isArray(otherArmed) ? otherArmed.flatMap(parseCarriedCron) : [],
    wakeup: r.success ? r.data : undefined,
  };
}
//@ chunk-e6aww6q8.js:2229243-2229406 placement
/**
 * 读取携带附件中的任务列表。
 */
function readCarriedCrons(e) {
  if (e.type !== "attachment" || e.attachment?.type !== "session_cron_carry") return null;
  let tasks = e.attachment.tasks;
  return Array.isArray(tasks) ? tasks.flatMap(parseCarriedCron) : [];
}
//@ chunk-e6aww6q8.js:2229406-2229586 placement
/**
 * 读取携带附件中已结束的任务 id。
 */
function readEndedCronIds(e) {
  if (e.type !== "attachment" || e.attachment?.type !== "session_cron_carry") return [];
  let ended = e.attachment.ended;
  return Array.isArray(ended) ? ended.filter((r) => typeof r === "string") : [];
}
//@ chunk-e6aww6q8.js:2229586-2230494 placement
/**
 * 扫描消息：创建、删除、携带记录中的定时任务 id 与最后一次携带记录。
 */
function scanCronHistory(e) {
  let n = new Set();
  let r = {
    made: new Set(),
    noted: new Set(),
    deleted: new Set(),
    ended: new Set(),
    lastNote: null,
    recordsHandoff: false,
  };
  for (let s of e)
    if (s.type === "assistant") {
      let content = s.message.content;
      if (!Array.isArray(content)) continue;
      for (let y of content) {
        if (y?.type !== "tool_use") continue;
        let input = y.input;
        if (y.name === CRON_CREATE_TOOL_NAME) n.add(y.id);
        else if (
          y.name === CRON_DELETE_TOOL_NAME &&
          typeof input === "object" &&
          input !== null &&
          "id" in input &&
          typeof input.id === "string"
        )
          r.deleted.add(input.id);
      }
    } else if (s.type === "user") {
      let content = s.message.content;
      let toolUseResult = s.toolUseResult;
      if (
        Array.isArray(content) &&
        typeof toolUseResult === "object" &&
        toolUseResult !== null &&
        "id" in toolUseResult &&
        typeof toolUseResult.id === "string" &&
        !("durable" in toolUseResult && toolUseResult.durable === true) &&
        content.some((S) => S?.type === "tool_result" && !S.is_error && n.has(S.tool_use_id))
      )
        r.made.add(toolUseResult.id);
    } else {
      let carriedCrons = readCarriedCrons(s);
      if (carriedCrons === null) continue;
      r.lastNote = carriedCrons;
      for (let carriedCron of carriedCrons) r.noted.add(carriedCron.id);
      for (let S of readEndedCronIds(s)) r.ended.add(S);
      let cronHandoff = readCronHandoff(s);
      if (cronHandoff !== null && (cronHandoff.otherArmed.length > 0 || cronHandoff.wakeup !== undefined))
        r.recordsHandoff = true;
    }
  return r;
}
//@ chunk-e6aww6q8.js:2230494-2230637 placement
/**
 * 校验一条携带的定时任务（格式错误时丢弃并记录）。
 */
function parseCarriedCron(e) {
  let n = CARRIED_CRON_SCHEMA().safeParse(e);
  if (!n.success) logForDebugging("resume: a carried session cron is left out: malformed");
  return n.success ? [n.data] : [];
}
//@ chunk-e6aww6q8.js:2230637-2230725 placement
/**
 * 保留的工具里是否有会因压缩丢失会话状态读取的工具（读文件、Bash、REPL）；无盘会话恒为否。
 */
function willToolsLoseSessionState(tools) {
  if (isDiskless()) return false;
  return tools.some(
    (n) =>
      toolMatchesName(n, FILE_READ_TOOL_NAME) ||
      (toolMatchesName(n, BASH_TOOL_NAME) && !isCoordinatorShellVerifiable()) ||
      toolMatchesName(n, REPL_TOOL_NAME),
  );
}
//@ chunk-0sfjpx19.js:139745-139858 placement
/**
 * Kairos 定时任务开启时，为保留的定时任务生成随压缩/回退携带的附件消息。
 */
function cronCarryAttachment(e, n) {
  if (e.length === 0 || !hasCronHistoryChanges(n) || !isKairosCronEnabled()) return null;
  let r = carryCronsAfterRefusal(messagesSinceCompactBoundary([...e]), n);
  return r === null ? null : createAttachmentMessage(r);
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
