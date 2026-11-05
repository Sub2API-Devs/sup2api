/**
 * tasks/localScriptTask.ts
 *
 * local_script 后台任务的注册、状态更新与 kill（abortController 中断）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-knvz4wf1.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { displayableScriptDescription } from "../utils/codeMode/displayableScriptDescription.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { generateTaskId, createTaskStateBase } from "../Task.js";

//@ chunk-knvz4wf1.js:302-336 placement
/**
 * 脚本任务描述上限与默认描述（started by Claude）。
 */
var MAX_DESCRIPTION_CHARS = 200;
var UNNAMED_SCRIPT = "started by Claude";
//@ chunk-knvz4wf1.js:336-603 placement
/**
 * 注册一个 local_script 后台任务并返回任务 id（截断描述、带 abortController）。
 */
function registerScriptTask(registry, { description, toolUseId, abortController }) {
  let rawDescription = displayableScriptDescription(description, MAX_DESCRIPTION_CHARS) || UNNAMED_SCRIPT;
  let shortDescription = truncateToLength(rawDescription, MAX_DESCRIPTION_CHARS);
  let taskId = generateTaskId("local_script");
  let task = {
    ...createTaskStateBase(
      taskId,
      "local_script",
      shortDescription.length < rawDescription.length ? `${shortDescription}\u2026` : rawDescription,
      toolUseId,
    ),
    type: "local_script",
    status: "running",
    outputFile: "",
    abortController,
  };
  registry.register(task);
  return taskId;
}
//@ chunk-knvz4wf1.js:603-784 placement (2.1.88 match: failDreamTask, 0.652)
/**
 * 把仍在运行的脚本任务置为指定终态并清除 abortController。
 */
function endScriptTask(taskId, registry, status) {
  if (registry.get(taskId)?.status !== "running") return false;
  registry.update(taskId, (task) =>
    task.status !== "running"
      ? task
      : {
          ...task,
          status,
          endTime: Date.now(),
          notified: true,
          abortController: undefined,
        },
  );
  return true;
}
//@ chunk-knvz4wf1.js:784-953 placement
/**
 * local_script 任务类型的定义与 kill（中断 abortController）。
 */
var ScriptTask = {
  name: "ScriptTask",
  type: "local_script",
  async kill(taskId, registry, options, reason) {
    let task = registry.get(taskId);
    if (task?.type !== "local_script" || task.status !== "running") return;
    task.abortController?.abort(reason);
  },
};
export { registerScriptTask, endScriptTask, ScriptTask, UNNAMED_SCRIPT };
