/**
 * cli/transports/_new/pendingActionSchema.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fp6aqx1j.js (3)
 * attribution: sole-consumer-new 3
 */
import { DoctorLazy } from "../../handlers/util.js";
import { u, o, kt, pe, oe, M, A, T } from "../../../../vendor/zod/v4/classic/schemas.js";
import { requestIdOf } from "../../../utils/sessionState.js";
import { buildRequiresActionDetails } from "../../structuredIO.js";

/**
 * 云会话 worker pending_action 及事件列表的 zod schema（事件、分页、agent_metadata、批量写入结果）。
 */
//@ chunk-fp6aqx1j.js:19042-19658 sole-consumer-new
var pendingActionSchema = DoctorLazy(() =>
    u({
      tool_name: o().refine((e) => !e.startsWith("dialog:")),
      display_tool_name: o().nullish(),
      action_description: o(),
      raw_command: o().nullish(),
      request_id: o(),
      tool_use_id: o().min(1),
      suppressed_request_id: o().nullish(),
    }),
  ),
  sessionEventSchema = DoctorLazy(() =>
    kt({
      event_id: o(),
      event_type: o(),
      payload: pe(o(), oe()),
      event_metadata: pe(o(), oe()).nullish(),
      is_compaction: M(),
      created_at: o(),
      session_agent_id: o().optional(),
    }),
  ),
  sessionEventsPageSchema = DoctorLazy(() =>
    u({ data: A(sessionEventSchema()), next_cursor: o().optional() }),
  ),
  agentMetadataEventsSchema = DoctorLazy(() =>
    u({
      data: A(
        sessionEventSchema().extend({ payload: kt({ type: T("agent_metadata") }), session_agent_id: o() }),
      ).optional(),
    }),
  ),
  eventBatchResultSchema = DoctorLazy(() => u({ results: A(u({ event_id: o(), duplicate: M() })) }));
/**
 * 用 schema 解析待处理动作（工具调用审批请求），取得 requestId 后返回规范化的动作对象；不合法时返回 undefined。
 */
//@ chunk-fp6aqx1j.js:19658-19986 sole-consumer-new
function parsePendingAction(e) {
  let safeParse = pendingActionSchema().safeParse(e);
  if (!safeParse.success) return;
  let s = safeParse.data,
    r = requestIdOf(s);
  if (r === void 0) return;
  return {
    requestId: r,
    details: buildRequiresActionDetails({
      tool_name: s.tool_name,
      display_tool_name: s.display_tool_name ?? void 0,
      action_description: s.action_description,
      raw_command: s.raw_command ?? void 0,
      request_id: s.request_id,
      tool_use_id: s.tool_use_id,
    }),
  };
}
/**
 * 根据 worker 外部状态里的 pending_action 判断会话是否处于 requires_action：读取中/失败/无待办/无法上报时返回 idle 与原因，否则带 requestId 与详情返回 requires_action。
 */
//@ chunk-fp6aqx1j.js:19986-20341 sole-consumer-new
function resolveWorkerRequiresActionState(e) {
  if (e === "pending") return { status: "idle", reason: "get_pending" };
  if (e.readFailed) return { status: "idle", reason: "get_failed" };
  let n = e.external?.pending_action;
  if (n === void 0 || n === null) return { status: "idle", reason: "no_pending_action" };
  let s = parsePendingAction(n);
  if (!s) return { status: "idle", reason: "not_reportable" };
  return { status: "requires_action", reason: "park", ...s };
}

export {
  resolveWorkerRequiresActionState,
  eventBatchResultSchema,
  sessionEventsPageSchema,
  agentMetadataEventsSchema,
};
