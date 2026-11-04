/**
 * tools/AgentTool/constants.ts
 *
 * Agent 工具名常量；另一条为误归的键位冲突检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/constants.ts
 * pieces: chunk-4121qate.js (1), chunk-ymw5z3js.js (2)
 * attribution: fingerprint 1, placement 2
 */
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ymw5z3js.js:227-253 placement
var SUBAGENTHANDBACK = "SubagentHandback";
//@ chunk-ymw5z3js.js:253-1232 placement
/**
 * Agent 工具的描述文案：工具说明、各字段说明、可选模型、名字长度等常量。
 */
var AGENT; // deferred: uses SENDMESSAGE (../SendMessageTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var AGENT_TOOL_DESCRIPTION;
var AGENT_TASK_FIELD_DESCRIPTION;
var AGENT_DESCRIPTION_FIELD_DESCRIPTION;
var AGENT_MODEL_CHOICES;
var AGENT_NAME_FIELD_DESCRIPTION;
var AGENT_NAME_FIELD_DESCRIPTION_WITH_SENDMESSAGE;
var FORK;
var FORK_AGENT_BUILTIN_ID;
var MAX_AGENT_NAME_CHARS;
var MAX_AGENT_FORK_DEPTH;
var TASK;
var MAX_AGENT_OUTPUT_TOKENS;
var FAST_BUILTIN_AGENTS;
var AGENT_STOPPED_NOTE;
var CONTINUE_VIA_TASK_ID_HINT;
var CONTINUE_VIA_MESSAGE_HINT;
var NO_HANDBACK_REPORT_TEXT;
var ASK_FOR_REPORT_HINT;
var RESUME_AFTER_ACCEPTED_HINT;
var SUBAGENT_TYPE_REQUIRED;
deferInit("chunk-ymw5z3js.js:253", () => {
  AGENT = "Agent";
  AGENT_TOOL_DESCRIPTION = "Launch a new agent to handle complex, multi-step tasks";
  AGENT_TASK_FIELD_DESCRIPTION = "The task for the agent to perform";
  AGENT_DESCRIPTION_FIELD_DESCRIPTION = "A short (3-5 word) description of the task";
  AGENT_MODEL_CHOICES = ["sonnet", "opus", "haiku", "fable"];
  AGENT_NAME_FIELD_DESCRIPTION = "Name for the spawned agent.";
  AGENT_NAME_FIELD_DESCRIPTION_WITH_SENDMESSAGE = `${AGENT_NAME_FIELD_DESCRIPTION} Makes it addressable via ${SENDMESSAGE}({to: name}) while running.`;
  FORK = "fork";
  FORK_AGENT_BUILTIN_ID = `agent:builtin:${FORK}`;
  MAX_AGENT_NAME_CHARS = 200;
  MAX_AGENT_FORK_DEPTH = 5;
  TASK = "Task";
  MAX_AGENT_OUTPUT_TOKENS = 1e5;
  FAST_BUILTIN_AGENTS = new Set(["Explore", "Plan"]);
  AGENT_STOPPED_NOTE = "NOTE: this agent stopped at its ";
  CONTINUE_VIA_TASK_ID_HINT = `; ${SENDMESSAGE} to task-id to continue`;
  CONTINUE_VIA_MESSAGE_HINT = ` Send the agent a message (${SENDMESSAGE}) to let it continue from where it stopped.`;
  NO_HANDBACK_REPORT_TEXT = `The subagent ended without delivering a report through ${SUBAGENTHANDBACK}, so no report was delivered.`;
  ASK_FOR_REPORT_HINT = ` Send the agent a message (${SENDMESSAGE}) to ask it to deliver its report.`;
  RESUME_AFTER_ACCEPTED_HINT = ` Once its requests are accepted again, send the agent a message (${SENDMESSAGE}) to let it continue from where it stopped instead of starting a new agent.`;
  SUBAGENT_TYPE_REQUIRED =
    "subagent_type is required: the general-purpose agent is not available in this session";
});
//@ chunk-4121qate.js:289509-289524 fingerprint = AGENT_TOOL_NAME (1)
/**
 * "Agent"：Agent 工具名常量（同块为其他模块代码）。
 */
var AGENT_TOOL_NAME = "Agent";
export {
  AGENT,
  TASK,
  FORK,
  FAST_BUILTIN_AGENTS,
  CONTINUE_VIA_MESSAGE_HINT,
  AGENT_STOPPED_NOTE,
  MAX_AGENT_OUTPUT_TOKENS,
  SUBAGENTHANDBACK,
  AGENT_DESCRIPTION_FIELD_DESCRIPTION,
  AGENT_TASK_FIELD_DESCRIPTION,
  AGENT_MODEL_CHOICES,
  AGENT_NAME_FIELD_DESCRIPTION_WITH_SENDMESSAGE,
  SUBAGENT_TYPE_REQUIRED,
  CONTINUE_VIA_TASK_ID_HINT,
  RESUME_AFTER_ACCEPTED_HINT,
  NO_HANDBACK_REPORT_TEXT,
  ASK_FOR_REPORT_HINT,
  AGENT_TOOL_NAME,
  FORK_AGENT_BUILTIN_ID,
  MAX_AGENT_NAME_CHARS,
  AGENT_NAME_FIELD_DESCRIPTION,
  AGENT_TOOL_DESCRIPTION,
  MAX_AGENT_FORK_DEPTH,
};
