/**
 * commands/agents/index.ts
 *
 * 2.1.316 新增：/agents 命令对象：2.1.316 中向导已移除，只提示让 Claude 创建或手工编辑子代理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/agents/index.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";

//@ chunk-e6aww6q8.js:2028628-2028828 placement
/**
 * /fork 命令对象（local-jsx）；描述：Spawn a background agent that inherits the full conversation；isEnabled: ()=>!Ua()；实现 chunk-cc2xzzcg.js 的 m。
 */
var forkSubagentCommand = {
  type: "local-jsx",
  name: "fork",
  description: "Spawn a background agent that inherits the full conversation",
  argumentHint: "<directive>",
  isEnabled: () => !isCoordinatorMode_2(),
  load: () => import("../fork/call_2.lazy.js"),
};
//@ chunk-e6aww6q8.js:2028828-2029000 placement
/**
 * /fork 命令对象（local-jsx）；描述：Copy this conversation into a new background session and keep working here；isEnabled: ()=>!Ua()；实现 chunk-d62reftv.js 的 He。
 */
var forkToBackgroundCommand = {
  type: "local-jsx",
  name: "fork",
  description: "Copy this conversation into a new background session and keep working here",
  argumentHint: "[prompt]",
  isEnabled: () => !isCoordinatorMode_2(),
};
//@ chunk-e6aww6q8.js:2029000-2029208 placement
/**
 * /subtask 命令对象（local-jsx）；描述：Send a subagent off with your full context; its result comes back here；isEnabled: ()=>!Ua()；实现 chunk-3vqj3nc0.js 的 l。
 */
var subtaskCommand = {
  type: "local-jsx",
  name: "subtask",
  description: "Send a subagent off with your full context; its result comes back here",
  argumentHint: "<task>",
  isEnabled: () => !isCoordinatorMode_2(),
  load: () => import("../subtask/call.lazy.js"),
};
//@ chunk-e6aww6q8.js:2029208-2029796 placement
/**
 * callAgentsRemoved：返回 "/agents wizard has been removed" 文案。
 */
var callAgentsRemoved = async () => ({
  type: "text",
  value: `The /agents wizard has been removed.

Ask Claude to create or update subagents for you (e.g. "create a code-reviewer subagent that ..."),
or edit the files directly:
  \u2022 .claude/agents/       (this project)
  \u2022 ~/.claude/agents/     (all projects)

Docs: ${"https://code.claude.com/docs/en/sub-agents"}`,
});
var agentsRemovedCommandDefinition = {
  type: "local",
  name: "agents",
  description: "(removed) Ask Claude to create/manage subagents, or edit .claude/agents/",
  isHidden: true,
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  load: () =>
    Promise.resolve({
      call: callAgentsRemoved,
    }),
};
var agentsRemovedCommand = agentsRemovedCommandDefinition;
export { forkToBackgroundCommand, subtaskCommand, forkSubagentCommand, agentsRemovedCommand };
