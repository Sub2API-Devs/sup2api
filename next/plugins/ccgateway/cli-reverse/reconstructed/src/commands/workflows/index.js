/**
 * commands/workflows/index.ts
 *
 * 2.1.316 新增：/workflows 命令定义（浏览运行中与已完成的 workflow）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j98wm54z.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isWorkflowsAvailable } from "../../utils/workflows/workflowGates.js";

//@ chunk-j98wm54z.js:3783-3962 placement
/**
 * /workflows 命令对象（local-jsx）；描述：Browse running and completed workflows；isEnabled: ()=>Sg()；实现 chunk-wnym76ss.js 的 Rn。
 */
var workflowsCommandDefinition = {
  type: "local-jsx",
  name: "workflows",
  aliases: [],
  description: "Browse running and completed workflows",
  isEnabled: () => isWorkflowsAvailable(),
  immediate: true,
  thinClientDispatch: "control-request",
};
var workflowsCommand = workflowsCommandDefinition;
export { workflowsCommand };
