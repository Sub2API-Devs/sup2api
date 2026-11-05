/**
 * Task.ts
 *
 * 任务公共定义：任务类型集合、ID 前缀表与生成、任务状态基础对象、终态判断和"是否有活动任务"的查询
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/Task.ts
 * pieces: chunk-j8qkeqz1.js (4), chunk-wjygkcr4.js (1)
 * attribution: fingerprint 2, placement 2, callgraph-witnessed 1
 */
import { randomBytes } from "crypto";
import { currentProgramUseCaseId } from "./services/mcp/ccrTurnId.js";
import { isDiskless } from "./bootstrap/state.js";
import { getTaskOutputPath } from "./utils/task/diskOutput.js";

//@ chunk-j8qkeqz1.js:1077-1335 fingerprint (2.1.88 match: TASK_ID_PREFIXES, 0.673)
/**
 * 任务类型 → ID 前缀字母（b/a/r/t/w/m/s/k/d/e/n/p），以及 ID 随机部分用的 36 进制字母表。
 */
var TASK_ID_PREFIXES = {
  local_bash: "b",
  local_agent: "a",
  remote_agent: "r",
  in_process_teammate: "t",
  local_workflow: "w",
  monitor_mcp: "m",
  monitor_ws: "s",
  mcp_task: "k",
  dream: "d",
  auto_mode_scan: "e",
  local_memory_import: "n",
  post_turn_memory: "p",
};
var TASK_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
//@ chunk-j8qkeqz1.js:1335-1467 placement
function isTaskIdOfType(taskType, taskId) {
  let prefix = TASK_ID_PREFIXES[taskType];
  return (
    prefix !== undefined &&
    taskId.length === 9 &&
    taskId.startsWith(prefix) &&
    taskId
      .slice(prefix.length)
      .split("")
      .every((char) => TASK_ID_ALPHABET.includes(char))
  );
}
//@ chunk-j8qkeqz1.js:1620-1711 callgraph-witnessed (2.1.88 match: generateTaskId, 0)
/**
 * 生成任务 ID：类型前缀（未知类型用 x）+ 8 个随机 36 进制字符（crypto.randomBytes）。
 */
function generateTaskId(type) {
  let id = TASK_ID_PREFIXES[type] ?? "x";
  let bytes = randomBytes(8);
  let id_2 = id;
  for (let i = 0; i < 8; i++) id_2 += TASK_ID_ALPHABET[bytes[i] % TASK_ID_ALPHABET.length];
  return id_2;
}
//@ chunk-j8qkeqz1.js:1711-1922 fingerprint (2.1.88 match: createTaskStateBase, 0.897)
/**
 * 构造所有任务共有的基础状态：status=pending、startTime、outputFile（非远程模式才有，指向任务输出文件）、outputOffset=0、notified=false。
 */
function createTaskStateBase(id, type, description, toolUseId) {
  let task = currentProgramUseCaseId();
  return {
    id,
    type,
    status: "pending",
    description,
    toolUseId,
    startTime: Date.now(),
    ...(!isDiskless() && {
      outputFile: getTaskOutputPath(id),
    }),
    outputOffset: 0,
    notified: false,
    ...(task !== undefined && {
      startedUnderUseCase: task,
    }),
  };
}
//@ chunk-wjygkcr4.js:11819-11885 placement (2.1.88 match: isTerminalTaskStatus, 1)
/**
 * 任务状态是否为终态（completed / failed / killed）。
 */
function isTerminalTaskStatus(status) {
  return status === "completed" || status === "failed" || status === "killed";
}
export { createTaskStateBase, isTaskIdOfType, generateTaskId, isTerminalTaskStatus };
