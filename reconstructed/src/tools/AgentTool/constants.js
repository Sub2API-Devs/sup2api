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

//@ chunk-ymw5z3js.js:227-253 placement
var SUBAGENTHANDBACK = "SubagentHandback";
//@ chunk-ymw5z3js.js:253-1232 placement
var AGENT = "Agent",
  Xdr = "Launch a new agent to handle complex, multi-step tasks",
  nhi = "The task for the agent to perform",
  rhi = "A short (3-5 word) description of the task",
  ohi = ["sonnet", "opus", "haiku", "fable"],
  FZo = "Name for the spawned agent.",
  shi = `${FZo} Makes it addressable via ${SENDMESSAGE}({to: name}) while running.`,
  FORK = "fork",
  ihi = `agent:builtin:${FORK}`,
  UZo = 200,
  ahi = 5,
  TASK = "Task",
  GCt = 1e5,
  x5t = new Set(["Explore", "Plan"]),
  zFe = "NOTE: this agent stopped at its ",
  nQr = `; ${SENDMESSAGE} to task-id to continue`,
  Jdr = ` Send the agent a message (${SENDMESSAGE}) to let it continue from where it stopped.`,
  Qdr = `The subagent ended without delivering a report through ${SUBAGENTHANDBACK}, so no report was delivered.`,
  Zdr = ` Send the agent a message (${SENDMESSAGE}) to ask it to deliver its report.`,
  BZo = ` Once its requests are accepted again, send the agent a message (${SENDMESSAGE}) to let it continue from where it stopped instead of starting a new agent.`,
  ecr = "subagent_type is required: the general-purpose agent is not available in this session";
/**
 * "Agent"：Agent 工具名常量（同块为其他模块代码）。
 */
//@ chunk-4121qate.js:289509-289524 fingerprint = AGENT_TOOL_NAME (1)
var AGENT_TOOL_NAME = "Agent";

export {
  AGENT,
  TASK,
  FORK,
  x5t,
  Jdr,
  zFe,
  GCt,
  SUBAGENTHANDBACK,
  rhi,
  nhi,
  ohi,
  shi,
  ecr,
  nQr,
  BZo,
  Qdr,
  Zdr,
  AGENT_TOOL_NAME,
  ihi,
  UZo,
  FZo,
  Xdr,
  ahi,
};
