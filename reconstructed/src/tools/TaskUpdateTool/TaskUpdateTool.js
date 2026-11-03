/**
 * tools/TaskUpdateTool/TaskUpdateTool.ts
 *
 * TaskUpdate 工具：更新/删除任务、依赖、owner 与 TaskCompleted 钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskUpdateTool/TaskUpdateTool.ts
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { TaskStatusSchema } from "../TaskListTool/TaskListTool.js";
import { T, zodStrictObject, o, A, pe, oe, u, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASK_UPDATE_TOOL_NAME } from "./constants.js";
import { TASK_UPDATE_DESCRIPTION, TASK_UPDATE_PROMPT } from "./prompt.js";
import { normalizeTaskInputAliases } from "./inputAliases.js";
import {
  Wue,
  getTaskListId,
  getTask,
  mergeTaskMetadata,
  deleteTask,
  updateTask,
  blockTask,
} from "../../utils/tasks.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { getAgentName, getTeamName, getTeammateColor, getAgentId } from "../../utils/teammate.js";
import { executeTaskCompletedHooks, getTaskCompletedHookMessage } from "../../utils/hooks.js";
import { StreamClosedAbortError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { writeToMailbox } from "../../utils/teammateMailbox.js";
import { ci } from "../../utils/swarm/hostState.js";

/**
 * TaskUpdate 工具（并发安全、shouldDefer）：更新 subject/description/activeForm/owner/metadata（null 删除键）、status（deleted 即删除），completed 前跑 TaskCompleted 钩子；agent swarms 下 in_progress 自动认领 owner、设置 owner 时给其邮箱发 task_assignment；addBlocks/addBlockedBy 建立双向依赖。
 */
//@ chunk-kxyd0g16.js:146123-150001 fingerprint = TaskUpdateTool (0.765)
var taskUpdateInputSchema = DoctorLazy(() => {
    let or = TaskStatusSchema().or(T("deleted"));
    return zodStrictObject({
      taskId: o().describe("The ID of the task to update"),
      subject: o().optional().describe("New subject for the task"),
      description: o().optional().describe("New description for the task"),
      activeForm: o()
        .optional()
        .describe('Present continuous form shown in spinner when in_progress (e.g., "Running tests")'),
      status: or.optional().describe("New status for the task"),
      addBlocks: A(o()).optional().describe("Task IDs that this task blocks"),
      addBlockedBy: A(o()).optional().describe("Task IDs that block this task"),
      owner: o().optional().describe("New owner for the task"),
      metadata: pe(o(), oe())
        .optional()
        .describe("Metadata keys to merge into the task. Set a key to null to delete it."),
    });
  }),
  taskUpdateOutputSchema = DoctorLazy(() =>
    u({
      success: M(),
      taskId: o(),
      updatedFields: A(o()),
      error: o().optional(),
      statusChange: u({ from: o(), to: o() }).optional(),
    }),
  ),
  TaskUpdateTool = buildTool({
    name: TASK_UPDATE_TOOL_NAME,
    searchHint: "update a task",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return TASK_UPDATE_DESCRIPTION;
    },
    async prompt() {
      return TASK_UPDATE_PROMPT;
    },
    get inputSchema() {
      return taskUpdateInputSchema();
    },
    get outputSchema() {
      return taskUpdateOutputSchema();
    },
    userFacingName() {
      return "TaskUpdate";
    },
    coerceInput: normalizeTaskInputAliases,
    shouldDefer: !0,
    isEnabled() {
      return Wue();
    },
    isConcurrencySafe() {
      return !0;
    },
    toAutoClassifierInput(e) {
      let r = normalizeTaskInputAliases(e)?.input ?? e,
        n = [r.taskId];
      if (r.status) n.push(r.status);
      if (r.subject) n.push(r.subject);
      return n.join(" ");
    },
    renderToolUseMessage() {
      return null;
    },
    create(e) {
      return {
        async call(
          {
            taskId: r,
            subject: n,
            description: s,
            activeForm: f,
            status: h,
            owner: y,
            addBlocks: k,
            addBlockedBy: w,
            metadata: S,
          },
          { signal: R, onProgress: I },
        ) {
          let j = getTaskListId();
          I?.({ type: "set_expanded_view", expandedView: "tasks" });
          let storageV5 = e.storageV5,
            B = await getTask(j, r, storageV5);
          if (!B) return { data: { success: !1, taskId: r, updatedFields: [], error: "Task not found" } };
          let V = [],
            q = {};
          if (n !== void 0 && n !== B.subject) ((q.subject = n), V.push("subject"));
          if (s !== void 0 && s !== B.description) ((q.description = s), V.push("description"));
          if (f !== void 0 && f !== B.activeForm) ((q.activeForm = f), V.push("activeForm"));
          if (y !== void 0 && y !== B.owner) ((q.owner = y), V.push("owner"));
          if (isAgentSwarmsEnabled() && h === "in_progress" && y === void 0 && !B.owner) {
            let P = getAgentName();
            if (P) ((q.owner = P), V.push("owner"));
          }
          if (S !== void 0) ((q.metadata = mergeTaskMetadata(B.metadata, S)), V.push("metadata"));
          if (h !== void 0) {
            if (h === "deleted") {
              let P = await deleteTask(j, r, storageV5);
              return {
                data: {
                  success: P,
                  taskId: r,
                  updatedFields: P ? ["deleted"] : [],
                  error: P ? void 0 : "Failed to delete task",
                  statusChange: P ? { from: B.status, to: "deleted" } : void 0,
                },
              };
            }
            if (h !== B.status) {
              if (h === "completed") {
                let P = [],
                  runTaskHooks = e.runTaskHooks(
                    executeTaskCompletedHooks,
                    r,
                    B.subject,
                    B.description,
                    getAgentName(),
                    getTeamName(),
                    void 0,
                    R,
                  );
                try {
                  for await (let W of runTaskHooks)
                    if (W.blockingError) P.push(getTaskCompletedHookMessage(W.blockingError));
                } catch (error) {
                  if (!(error instanceof StreamClosedAbortError)) throw error;
                  logForDebugging("TaskCompleted hooks cancelled (control stream closed)");
                }
                if (P.length > 0)
                  return {
                    data: {
                      success: !1,
                      taskId: r,
                      updatedFields: [],
                      error: P.join(`
`),
                    },
                  };
              }
              ((q.status = h), V.push("status"));
            }
          }
          if (Object.keys(q).length > 0) await updateTask(j, r, q, storageV5);
          if (q.owner && isAgentSwarmsEnabled()) {
            let P = getAgentName() || "team-lead",
              L = getTeammateColor(),
              W = jsonStringify({
                type: "task_assignment",
                taskId: r,
                subject: B.subject,
                description: B.description,
                assignedBy: P,
                timestamp: new Date().toISOString(),
              });
            await writeToMailbox(
              q.owner,
              { from: P, text: W, timestamp: new Date().toISOString(), color: L },
              getTeamName() ?? ci().taskList.leaderTeamName ?? j,
              storageV5,
            );
          }
          if (k && k.length > 0) {
            let filtered = k.filter((L) => !B.blocks.includes(L));
            for (let L of filtered) await blockTask(j, r, L, storageV5);
            if (filtered.length > 0) V.push("blocks");
          }
          if (w && w.length > 0) {
            let filtered = w.filter((L) => !B.blockedBy.includes(L));
            for (let L of filtered) await blockTask(j, L, r, storageV5);
            if (filtered.length > 0) V.push("blockedBy");
          }
          return {
            data: {
              success: !0,
              taskId: r,
              updatedFields: V,
              statusChange: q.status !== void 0 ? { from: B.status, to: q.status } : void 0,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, r) {
      let {
        success: success,
        taskId: taskId,
        updatedFields: updatedFields,
        error: error,
        statusChange: statusChange,
      } = e;
      if (!success)
        return { tool_use_id: r, type: "tool_result", content: error || `Task #${taskId} not found` };
      let k = `Updated task #${taskId} ${updatedFields.join(", ")}`;
      if (statusChange?.to === "completed" && getAgentId() && isAgentSwarmsEnabled())
        k += `

Task completed. Call TaskList now to find your next available task or see if your work unblocked others.`;
      return { tool_use_id: r, type: "tool_result", content: k };
    },
  });

export { TaskUpdateTool };
