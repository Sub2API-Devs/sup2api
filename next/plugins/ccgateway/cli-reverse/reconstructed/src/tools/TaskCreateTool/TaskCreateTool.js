/**
 * tools/TaskCreateTool/TaskCreateTool.ts
 *
 * TaskCreate 工具：创建任务列表条目（含输入纠错与 TaskCreated 钩子）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskCreateTool/TaskCreateTool.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-kxyd0g16.js (1)
 * attribution: fingerprint 2
 */
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import {
  isTodoListInput,
  isSubagentTaskInput,
  isNonEmptyString,
  coerceTaskCreateInput,
} from "./inputAliases.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  record,
  unknown,
  objectSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { TASK_CREATE_TOOL_NAME } from "./constants.js";
import { DESCRIPTION, getPrompt_2 } from "./prompt.js";
import { areTaskToolsEnabled, createTask, getTaskListId, deleteTask } from "../../utils/tasks.js";
import { executeTaskCreatedHooks, getTaskCreatedHookMessage } from "../../utils/hooks.js";
import { getAgentName, getTeamName } from "../../utils/teammate.js";
import { StreamClosedAbortError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1778329-1778957 fingerprint = outputSchema (0.334)
/**
 * TaskCreate 校验失败时的纠正提示：一次只建一个任务；误用 Agent 参数（prompt/subagent_type）时提示改用 Agent。
 */
function getTaskCreateValidationSteer(rawInput) {
  if (!isPlainObject_5(rawInput)) return null;
  let task = isPlainObject_5(rawInput.task) ? rawInput.task : null;
  if (isTodoListInput(rawInput) || (task !== null && isTodoListInput(task)))
    return "TaskCreate creates ONE task per call and has no `tasks` or `todos` parameter. Call TaskCreate once per task, passing `subject` (a brief title) and `description` (what needs to be done) as top-level string parameters.";
  if (
    (isSubagentTaskInput(rawInput) || (task !== null && isSubagentTaskInput(task))) &&
    !(isNonEmptyString(rawInput.subject) && isNonEmptyString(rawInput.description))
  )
    return "This call used Agent-tool parameters (`prompt`/`subagent_type`). TaskCreate adds an item to the task list and takes `subject` and `description` string parameters. To delegate work to a subagent, use the Agent tool instead.";
  return null;
}
//@ chunk-kxyd0g16.js:140086-141693 fingerprint = TaskCreateTool (0.715)
/**
 * TaskCreate 工具（shouldDefer，isEnabled=任务工具启用且 todo 类工具可用）：在当前任务列表创建一条 pending 任务，运行 TaskCreated 钩子，钩子阻塞时删除刚建任务并报错；结果 "Task #id created successfully: subject"。isConcurrencySafe=false。
 */
var taskCreateInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskCreateOutputSchema;
var TaskCreateTool;
deferInit("chunk-kxyd0g16.js:140086", () => {
  taskCreateInputSchema = DoctorLazy(() =>
    zodStrictObject({
      subject: stringSchema().describe("A brief title for the task"),
      description: stringSchema().describe("What needs to be done"),
      activeForm: stringSchema()
        .optional()
        .describe('Present continuous form shown in spinner when in_progress (e.g., "Running tests")'),
      metadata: record(stringSchema(), unknown())
        .optional()
        .describe("Arbitrary metadata to attach to the task"),
    }),
  );
  taskCreateOutputSchema = DoctorLazy(() =>
    objectSchema({
      task: objectSchema({
        id: stringSchema(),
        subject: stringSchema(),
      }),
    }),
  );
  TaskCreateTool = buildTool({
    name: TASK_CREATE_TOOL_NAME,
    searchHint: "create a task in the task list",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return DESCRIPTION;
    },
    async prompt() {
      return getPrompt_2();
    },
    get inputSchema() {
      return taskCreateInputSchema();
    },
    get outputSchema() {
      return taskCreateOutputSchema();
    },
    userFacingName() {
      return "TaskCreate";
    },
    shouldDefer: true,
    coerceInput: coerceTaskCreateInput,
    validationErrorSteer: getTaskCreateValidationSteer,
    isEnabled() {
      return areTaskToolsEnabled();
    },
    isConcurrencySafe() {
      return false;
    },
    toAutoClassifierInput(input) {
      return input.subject;
    },
    renderToolUseMessage() {
      return null;
    },
    create(toolContext) {
      return {
        async call({ subject, description, activeForm, metadata }, { signal, onProgress }) {
          let taskId = await createTask(
            getTaskListId(),
            {
              subject,
              description,
              activeForm,
              status: "pending",
              owner: undefined,
              blocks: [],
              blockedBy: [],
              metadata,
            },
            toolContext.storageV5,
          );
          let blockingErrors = [];
          let generator = toolContext.runTaskHooks(
            executeTaskCreatedHooks,
            taskId,
            subject,
            description,
            getAgentName(),
            getTeamName(),
            undefined,
            signal,
          );
          try {
            for await (let result of generator)
              if (result.blockingError) blockingErrors.push(getTaskCreatedHookMessage(result.blockingError));
          } catch (error) {
            if (!(error instanceof StreamClosedAbortError)) throw error;
            logForDebugging("TaskCreated hooks cancelled (control stream closed)");
          }
          if (blockingErrors.length > 0) {
            await deleteTask(getTaskListId(), taskId, toolContext.storageV5);
            throw Error(
              blockingErrors.join(`
`),
            );
          }
          onProgress?.({
            type: "set_expanded_view",
            expandedView: "tasks",
          });
          return {
            data: {
              task: {
                id: taskId,
                subject,
              },
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(content, toolUseID) {
      let { task } = content;
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: `Task #${task.id} created successfully: ${task.subject}`,
      };
    },
  });
});
export { TaskCreateTool };
