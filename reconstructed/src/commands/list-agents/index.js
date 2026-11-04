/**
 * commands/list-agents/index.ts
 *
 * 2.1.316 新增。列出代理的命令注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yxzqxbzv.js (1)
 * attribution: placement 1
 */
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";

//@ chunk-yxzqxbzv.js:3363-3592 placement
/**
 * /list-agents 命令对象（local）；描述：List subagents, teammates, and other Claude sessions you can message；别名 ["peers"]；isEnabled: ()=>Pa()；实现 chunk-kq21a1r9.js 的 u。
 */
var listAgentsCommandDefinition = {
  type: "local",
  name: "list-agents",
  aliases: ["peers"],
  description: "List subagents, teammates, and other Claude sessions you can message",
  supportsNonInteractive: true,
  isEnabled: () => isCrossSessionMessagingEnabled(),
  load: () => import("./list-agents.js"),
};
var listAgentsCommand = listAgentsCommandDefinition;
export { listAgentsCommand };
