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
import { threadRuleMode, Us } from "../projects/threadRows.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, M, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { p$e } from "../../utils/cronTasks.js";
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
import { $bn } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";

//@ chunk-e6aww6q8.js:2225644-2225674 placement
var Bin = { classifierSide: null };
//@ chunk-e6aww6q8.js:2225674-2225711 placement
function Uin(e) {
  Bin.classifierSide = e;
}
//@ chunk-e6aww6q8.js:2225711-2225725 placement
var plr = 65536;
/**
 * 压缩时把仍在等待回复的项目线程询问带过边界（分类器已加载、保留的消息是尾部、询问未被回答/编辑、长度合适），返回 projects_thread_ask 附件。
 */
//@ chunk-e6aww6q8.js:2225725-2226699 placement
function carryProjectsThreadAsk(e, n, r) {
  let { classifierSide: classifierSide } = Bin;
  if (classifierSide === null)
    return (logFeatureSad("auto_mode_projects_thread_ask_carry", "classifier_not_loaded"), null);
  if (!classifierSide.creditsOwnerRows(r) || threadRuleMode() !== "compact-held") return null;
  let h = new Set(n.map((Z) => Z.uuid)),
    index = e.findIndex((Z) => h.has(Z.uuid)),
    S = index === -1 ? e.length : index,
    sliced = e.slice(S);
  if (!sliced.every((Z) => Z.type === "progress" || h.has(Z.uuid)))
    return (logFeatureSad("auto_mode_projects_thread_ask_carry", "kept_not_the_tail"), null);
  let standingAsk = classifierSide.standingAsk(
      [
        ...e.slice(0, S),
        ...sliced.filter((Z) => Z.type === "attachment" && Z.attachment.type === "projects_thread_ask"),
      ],
      r,
    ),
    G = e.at(-1)?.uuid;
  if (standingAsk === void 0 || G === void 0) return null;
  if (standingAsk.answered !== void 0 || standingAsk.edited === !0)
    return (logFeatureSad("auto_mode_projects_thread_ask_carry", "followed_by_words"), null);
  let q = {
    type: "projects_thread_ask",
    call: standingAsk.call,
    after: G,
    deliveredAt: standingAsk.at,
    ...(standingAsk.messageId !== void 0 && { messageId: standingAsk.messageId }),
  };
  if (jsonStringify(q).length > plr)
    return (logFeatureSad("auto_mode_projects_thread_ask_carry", "reply_too_long"), null);
  return (logFeatureOk("auto_mode_projects_thread_ask_carry"), q);
}
/**
 * 跨压缩携带的会话定时任务与唤醒记录 schema。
 */
//@ chunk-e6aww6q8.js:2226699-2226908 placement
var CARRIED_CRON_SCHEMA = DoctorLazy(() =>
    u({
      id: o().min(1),
      cron: o(),
      prompt: o(),
      createdAt: E(),
      recurring: M(),
      plugin: o().refine(p$e).optional(),
    }),
  ),
  CARRIED_WAKEUP_SCHEMA = DoctorLazy(() =>
    u({ prompt: o(), scheduledFor: E(), reason: o().optional(), keepalive: T(!0).optional() }),
  );
//@ chunk-e6aww6q8.js:2226908-2227681 placement
function carryLoopCronAcrossCompact(e, n) {
  let r = scanCronHistory(e),
    s = !hWr() && !r.recordsHandoff;
  if (r.made.size === 0 && r.noted.size === 0 && s) return null;
  let h = new Set(n.map((ke) => ke.uuid)),
    y = (ke) => r.made.has(ke.id) || r.noted.has(ke.id),
    S = scanCronHistory(n),
    w = buildCronCarryAttachment(y, S, scanCronHistory(e.filter((ke) => !h.has(ke.uuid)))),
    L = getSessionCronTasks(),
    mapped = L.filter((ke) => isCarriableCron(ke) && ke.kind === void 0)
      .filter((ke) => !y(ke))
      .map((ke) => ({
        id: ke.id,
        cron: ke.cron,
        prompt: ke.prompt,
        createdAt: ke.createdAt,
        recurring: ke.recurring === !0,
      })),
    found = L.find((ke) => isCarriableCron(ke) && ke.kind === "loop"),
    Z =
      found?.scheduledFor === void 0
        ? void 0
        : {
            prompt: found.prompt,
            scheduledFor: found.scheduledFor,
            ...(found.reason !== void 0 && { reason: found.reason }),
            ...(found.keepalive === !0 && { keepalive: !0 }),
          };
  return mapped.length > 0 || Z !== void 0 || S.recordsHandoff
    ? {
        ...(w ?? { type: "session_cron_carry", tasks: [] }),
        ...(mapped.length > 0 && { otherArmed: mapped }),
        ...(Z !== void 0 && { wakeup: Z }),
      }
    : w;
}
//@ chunk-e6aww6q8.js:2227681-2227752 placement
function Z5s(e) {
  let n = scanCronHistory(e);
  return n.lastNote !== null || n.deleted.size > 0;
}
/**
 * 在压缩失败后的重试中确定仍需携带的定时任务。
 */
//@ chunk-e6aww6q8.js:2227752-2228045 placement
function carryCronsAfterRefusal(e, n) {
  let r = scanCronHistory(n),
    s = scanCronHistory(e),
    h = (S) => s.made.has(S) || s.noted.has(S);
  if (r.lastNote === null && ![...r.deleted].some(h)) return null;
  if (missingRecurringCrons(s, [s, r]).length > 0) return null;
  let parse = Date.parse(n[0]?.timestamp ?? "");
  return buildCronCarryAttachment(
    (S) => !r.made.has(S.id) && (h(S.id) || (r.noted.has(S.id) && S.createdAt <= parse)),
    s,
    r,
  );
}
/**
 * 生成 session_cron_carry 附件：当前会话的普通定时任务与已结束的任务 id。
 */
//@ chunk-e6aww6q8.js:2228045-2228502 placement
function buildCronCarryAttachment(e, n, r) {
  let s = getSessionCronTasks(),
    mapped = s
      .filter((S) => e(S) && S.agentId === void 0 && S.kind === void 0)
      .map((S) => ({
        id: S.id,
        cron: S.cron,
        prompt: S.prompt,
        createdAt: S.createdAt,
        recurring: S.recurring === !0,
        ...(S.plugin !== void 0 && { plugin: S.plugin }),
      })),
    filtered = uniq([...n.made, ...n.noted]).filter(
      (S) => (r.deleted.has(S) || n.ended.has(S) || r.ended.has(S)) && !s.some((w) => w.id === S),
    );
  return mapped.length > 0 || filtered.length > 0 || n.noted.size > 0
    ? { type: "session_cron_carry", tasks: mapped, ...(filtered.length > 0 && { ended: filtered }) }
    : null;
}
/**
 * 把上次携带记录中仍未恢复的循环任务补进附件。
 */
//@ chunk-e6aww6q8.js:2228502-2228697 placement
function addMissingRecurringCrons(e, n) {
  let r = scanCronHistory(e),
    s = missingRecurringCrons(r, [r]),
    h = new Set(n?.tasks.map((S) => S.id)),
    filtered = s.filter((S) => !h.has(S.id));
  return filtered.length === 0
    ? n
    : { ...(n ?? { type: "session_cron_carry" }), tasks: [...(n?.tasks ?? []), ...filtered] };
}
//@ chunk-e6aww6q8.js:2228697-2228734 placement
function hWr() {
  return getSessionCronTasks().some(isCarriableCron);
}
/**
 * 上次记录中的循环任务里，当前不存在且未被删除/结束的那些。
 */
//@ chunk-e6aww6q8.js:2228734-2228890 placement
function missingRecurringCrons(e, n) {
  let r = getSessionCronTasks();
  return (e.lastNote ?? []).filter(
    ({ id: id, recurring: recurring }) =>
      recurring && !r.some((y) => y.id === id) && !n.some((y) => y.deleted.has(id) || y.ended.has(id)),
  );
}
/**
 * 主线程的普通定时任务或已排期的 loop 任务。
 */
//@ chunk-e6aww6q8.js:2228890-2228993 placement
function isCarriableCron(e) {
  return e.agentId === void 0 && (e.kind === void 0 || (e.kind === "loop" && e.scheduledFor !== void 0));
}
/**
 * 读取携带附件中的其他已装配任务与唤醒信息。
 */
//@ chunk-e6aww6q8.js:2228993-2229243 placement
function readCronHandoff(e) {
  if (e.type !== "attachment" || e.attachment?.type !== "session_cron_carry") return null;
  let otherArmed = e.attachment.otherArmed,
    safeParse = CARRIED_WAKEUP_SCHEMA().safeParse(e.attachment.wakeup);
  return {
    otherArmed: Array.isArray(otherArmed) ? otherArmed.flatMap(parseCarriedCron) : [],
    wakeup: safeParse.success ? safeParse.data : void 0,
  };
}
/**
 * 读取携带附件中的任务列表。
 */
//@ chunk-e6aww6q8.js:2229243-2229406 placement
function readCarriedCrons(e) {
  if (e.type !== "attachment" || e.attachment?.type !== "session_cron_carry") return null;
  let tasks = e.attachment.tasks;
  return Array.isArray(tasks) ? tasks.flatMap(parseCarriedCron) : [];
}
/**
 * 读取携带附件中已结束的任务 id。
 */
//@ chunk-e6aww6q8.js:2229406-2229586 placement
function readEndedCronIds(e) {
  if (e.type !== "attachment" || e.attachment?.type !== "session_cron_carry") return [];
  let ended = e.attachment.ended;
  return Array.isArray(ended) ? ended.filter((r) => typeof r === "string") : [];
}
/**
 * 扫描消息：创建、删除、携带记录中的定时任务 id 与最后一次携带记录。
 */
//@ chunk-e6aww6q8.js:2229586-2230494 placement
function scanCronHistory(e) {
  let n = new Set(),
    r = {
      made: new Set(),
      noted: new Set(),
      deleted: new Set(),
      ended: new Set(),
      lastNote: null,
      recordsHandoff: !1,
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
      let content = s.message.content,
        toolUseResult = s.toolUseResult;
      if (
        Array.isArray(content) &&
        typeof toolUseResult === "object" &&
        toolUseResult !== null &&
        "id" in toolUseResult &&
        typeof toolUseResult.id === "string" &&
        !("durable" in toolUseResult && toolUseResult.durable === !0) &&
        content.some((S) => S?.type === "tool_result" && !S.is_error && n.has(S.tool_use_id))
      )
        r.made.add(toolUseResult.id);
    } else {
      let h = readCarriedCrons(s);
      if (h === null) continue;
      r.lastNote = h;
      for (let S of h) r.noted.add(S.id);
      for (let S of readEndedCronIds(s)) r.ended.add(S);
      let y = readCronHandoff(s);
      if (y !== null && (y.otherArmed.length > 0 || y.wakeup !== void 0)) r.recordsHandoff = !0;
    }
  return r;
}
/**
 * 校验一条携带的定时任务（格式错误时丢弃并记录）。
 */
//@ chunk-e6aww6q8.js:2230494-2230637 placement
function parseCarriedCron(e) {
  let safeParse = CARRIED_CRON_SCHEMA().safeParse(e);
  if (!safeParse.success) logForDebugging("resume: a carried session cron is left out: malformed");
  return safeParse.success ? [safeParse.data] : [];
}
//@ chunk-e6aww6q8.js:2230637-2230725 placement
function HM(e) {
  if (isDiskless()) return !1;
  return e.some(
    (n) =>
      toolMatchesName(n, FILE_READ_TOOL_NAME) ||
      (toolMatchesName(n, BASH_TOOL_NAME) && !$bn()) ||
      toolMatchesName(n, REPL_TOOL_NAME),
  );
}
/**
 * Kairos 定时任务开启时，为保留的定时任务生成随压缩/回退携带的附件消息。
 */
//@ chunk-0sfjpx19.js:139745-139858 placement
function cronCarryAttachment(e, n) {
  if (e.length === 0 || !Z5s(n) || !isKairosCronEnabled()) return null;
  let r = carryCronsAfterRefusal(Us([...e]), n);
  return r === null ? null : createAttachmentMessage(r);
}

export {
  HM,
  readCarriedCrons,
  readEndedCronIds,
  cronCarryAttachment,
  addMissingRecurringCrons,
  carryLoopCronAcrossCompact,
  hWr,
  Uin,
  carryProjectsThreadAsk,
};
