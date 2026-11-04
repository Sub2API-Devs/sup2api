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
import {
  literal,
  zodStrictObject,
  stringSchema,
  array,
  record,
  unknown,
  objectSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASK_UPDATE_TOOL_NAME } from "./constants.js";
import { TASK_UPDATE_DESCRIPTION, TASK_UPDATE_PROMPT } from "./prompt.js";
import { normalizeTaskInputAliases } from "./inputAliases.js";
import {
  areTaskToolsEnabled,
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
import { swarmHostState } from "../../utils/swarm/hostState.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kxyd0g16.js:146123-150001 fingerprint = TaskUpdateTool (0.765)
/**
 * TaskUpdate 工具（并发安全、shouldDefer）：更新 subject/description/activeForm/owner/metadata（null 删除键）、status（deleted 即删除），completed 前跑 TaskCompleted 钩子；agent swarms 下 in_progress 自动认领 owner、设置 owner 时给其邮箱发 task_assignment；addBlocks/addBlockedBy 建立双向依赖。
 */
var taskUpdateInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskUpdateOutputSchema;
var TaskUpdateTool;
deferInit("chunk-kxyd0g16.js:146123", () => {
  taskUpdateInputSchema = DoctorLazy(() => {
    let TaskUpdateStatusSchema = TaskStatusSchema().or(literal("deleted"));
    return zodStrictObject({
      taskId: stringSchema().describe("The ID of the task to update"),
      subject: stringSchema().optional().describe("New subject for the task"),
      description: stringSchema().optional().describe("New description for the task"),
      activeForm: stringSchema()
        .optional()
        .describe('Present continuous form shown in spinner when in_progress (e.g., "Running tests")'),
      status: TaskUpdateStatusSchema.optional().describe("New status for the task"),
      addBlocks: array(stringSchema()).optional().describe("Task IDs that this task blocks"),
      addBlockedBy: array(stringSchema()).optional().describe("Task IDs that block this task"),
      owner: stringSchema().optional().describe("New owner for the task"),
      metadata: record(stringSchema(), unknown())
        .optional()
        .describe("Metadata keys to merge into the task. Set a key to null to delete it."),
    });
  });
  taskUpdateOutputSchema = DoctorLazy(() =>
    objectSchema({
      success: booleanSchema(),
      taskId: stringSchema(),
      updatedFields: array(stringSchema()),
      error: stringSchema().optional(),
      statusChange: objectSchema({
        from: stringSchema(),
        to: stringSchema(),
      }).optional(),
    }),
  );
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
    shouldDefer: true,
    isEnabled() {
      return areTaskToolsEnabled();
    },
    isConcurrencySafe() {
      return true;
    },
    toAutoClassifierInput(rawInput) {
      let input = normalizeTaskInputAliases(rawInput)?.input ?? rawInput;
      let parts = [input.taskId];
      if (input.status) parts.push(input.status);
      if (input.subject) parts.push(input.subject);
      return parts.join(" ");
    },
    renderToolUseMessage() {
      return null;
    },
    create(toolContext) {
      return {
        async call(
          { taskId, subject, description, activeForm, status, owner, addBlocks, addBlockedBy, metadata },
          { signal, onProgress },
        ) {
          let taskListId = getTaskListId();
          onProgress?.({
            type: "set_expanded_view",
            expandedView: "tasks",
          });
          let storageV5 = toolContext.storageV5;
          let existingTask = await getTask(taskListId, taskId, storageV5);
          if (!existingTask)
            return {
              data: {
                success: false,
                taskId,
                updatedFields: [],
                error: "Task not found",
              },
            };
          let updatedFields = [];
          let updates = {};
          if (subject !== undefined && subject !== existingTask.subject) {
            updates.subject = subject;
            updatedFields.push("subject");
          }
          if (description !== undefined && description !== existingTask.description) {
            updates.description = description;
            updatedFields.push("description");
          }
          if (activeForm !== undefined && activeForm !== existingTask.activeForm) {
            updates.activeForm = activeForm;
            updatedFields.push("activeForm");
          }
          if (owner !== undefined && owner !== existingTask.owner) {
            updates.owner = owner;
            updatedFields.push("owner");
          }
          if (
            isAgentSwarmsEnabled() &&
            status === "in_progress" &&
            owner === undefined &&
            !existingTask.owner
          ) {
            let agentName = getAgentName();
            if (agentName) {
              updates.owner = agentName;
              updatedFields.push("owner");
            }
          }
          if (metadata !== undefined) {
            updates.metadata = mergeTaskMetadata(existingTask.metadata, metadata);
            updatedFields.push("metadata");
          }
          if (status !== undefined) {
            if (status === "deleted") {
              let deleted = await deleteTask(taskListId, taskId, storageV5);
              return {
                data: {
                  success: deleted,
                  taskId,
                  updatedFields: deleted ? ["deleted"] : [],
                  error: deleted ? undefined : "Failed to delete task",
                  statusChange: deleted
                    ? {
                        from: existingTask.status,
                        to: "deleted",
                      }
                    : undefined,
                },
              };
            }
            if (status !== existingTask.status) {
              if (status === "completed") {
                let blockingErrors = [];
                let generator = toolContext.runTaskHooks(
                  executeTaskCompletedHooks,
                  taskId,
                  existingTask.subject,
                  existingTask.description,
                  getAgentName(),
                  getTeamName(),
                  undefined,
                  signal,
                );
                try {
                  for await (let result of generator)
                    if (result.blockingError)
                      blockingErrors.push(getTaskCompletedHookMessage(result.blockingError));
                } catch (error) {
                  if (!(error instanceof StreamClosedAbortError)) throw error;
                  logForDebugging("TaskCompleted hooks cancelled (control stream closed)");
                }
                if (blockingErrors.length > 0)
                  return {
                    data: {
                      success: false,
                      taskId,
                      updatedFields: [],
                      error: blockingErrors.join(`
`),
                    },
                  };
              }
              updates.status = status;
              updatedFields.push("status");
            }
          }
          if (Object.keys(updates).length > 0) await updateTask(taskListId, taskId, updates, storageV5);
          if (updates.owner && isAgentSwarmsEnabled()) {
            let senderName = getAgentName() || "team-lead";
            let senderColor = getTeammateColor();
            let assignmentMessage = jsonStringify({
              type: "task_assignment",
              taskId,
              subject: existingTask.subject,
              description: existingTask.description,
              assignedBy: senderName,
              timestamp: new Date().toISOString(),
            });
            await writeToMailbox(
              updates.owner,
              {
                from: senderName,
                text: assignmentMessage,
                timestamp: new Date().toISOString(),
                color: senderColor,
              },
              getTeamName() ?? swarmHostState().taskList.leaderTeamName ?? taskListId,
              storageV5,
            );
          }
          if (addBlocks && addBlocks.length > 0) {
            let newBlocks = addBlocks.filter((id) => !existingTask.blocks.includes(id));
            for (let blockId of newBlocks) await blockTask(taskListId, taskId, blockId, storageV5);
            if (newBlocks.length > 0) updatedFields.push("blocks");
          }
          if (addBlockedBy && addBlockedBy.length > 0) {
            let newBlockedBy = addBlockedBy.filter((id) => !existingTask.blockedBy.includes(id));
            for (let blockerId of newBlockedBy) await blockTask(taskListId, blockerId, taskId, storageV5);
            if (newBlockedBy.length > 0) updatedFields.push("blockedBy");
          }
          return {
            data: {
              success: true,
              taskId,
              updatedFields,
              statusChange:
                updates.status !== undefined
                  ? {
                      from: existingTask.status,
                      to: updates.status,
                    }
                  : undefined,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(content, toolUseID) {
      let { success, taskId, updatedFields, error, statusChange } = content;
      if (!success)
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: error || `Task #${taskId} not found`,
        };
      let resultContent = `Updated task #${taskId} ${updatedFields.join(", ")}`;
      if (statusChange?.to === "completed" && getAgentId() && isAgentSwarmsEnabled())
        resultContent += `

Task completed. Call TaskList now to find your next available task or see if your work unblocked others.`;
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: resultContent,
      };
    },
  });
});
export { TaskUpdateTool };
