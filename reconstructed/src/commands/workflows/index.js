/**
 * commands/workflows/index.ts
 *
 * 2.1.316 新增：/workflows 命令定义（浏览运行中与已完成的 workflow）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g8tswn69.js (1)
 * attribution: placement 1
 */
import { isWorkflowsAvailable } from "../../utils/workflows/workflowGates.js";

/**
 * /workflows 命令对象（local-jsx）；描述：Browse running and completed workflows；isEnabled: ()=>Sg()；实现 chunk-wnym76ss.js 的 Rn。
 */
//@ chunk-g8tswn69.js:3475-3654 placement
var workflowsCommandDefinition = {
    type: "local-jsx",
    name: "workflows",
    aliases: [],
    description: "Browse running and completed workflows",
    isEnabled: () => isWorkflowsAvailable(),
    immediate: !0,
    thinClientDispatch: "control-request",
  },
  workflowsCommand = workflowsCommandDefinition;
