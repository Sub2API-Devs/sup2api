/**
 * commands/subtask/subtask.ts
 *
 * 2.1.316 新增：/subtask 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3vqj3nc0.js (2)
 * attribution: placement 2
 */
import { spawnForkFromDirective } from "../../tools/AgentTool/forkDirective.js";
import { evaluateAskingNoHost } from "../../utils/permissions/permissions.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { YO } from "../../utils/permissions/autoModeRulesPrompt.js";

/**
 * /subtask 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-3vqj3nc0.js:12628-12720 placement
var l = async (onDone, context, args) => (
  onDone((await startSubtask(args, context)) ?? "Usage: /subtask \\<task\\>", { display: "system" }),
  null
);
/**
 * 启动一个子任务：参数为空返回 null，协调者会话中不可用时返回提示文字。
 */
//@ chunk-3vqj3nc0.js:12720-13022 placement
async function startSubtask(a, t) {
  let trimmed = a.trim();
  if (!trimmed) return null;
  let r = await spawnForkFromDirective(trimmed, t, t.canUseTool ?? evaluateAskingNoHost);
  if (!r)
    return isCoordinatorMode_2()
      ? "Subtasks are not available in coordinator sessions. Use /branch instead."
      : "Cannot start a subtask before the first conversation turn";
  return `${YO} forked ${r.name} (${r.agentId.slice(-4)})`;
}
