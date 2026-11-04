/**
 * commands/teleport/index.ts
 *
 * 2.1.316 新增：/teleport 命令对象：把会话转到云端或从云端取回
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { consoleProfileCanStartCloudSessions } from "../../utils/teleport/api.js";
import { CLOUD_SESSIONS_POLICY } from "../../services/cloudSessions/cloudSessionsPolicy.js";
import { isCommandEnabled } from "../../commands.js";

//@ chunk-e6aww6q8.js:1749817-1750075 placement
/**
 * /teleport 命令对象（local-jsx）；描述：Send this session to the cloud, or resume one from claude.ai；别名 ["tp"]；availability ["claude-ai","console-profile"]；isEnabled: ()=>vt()||B8t()；isHidden: {return!Ud(this)}；实现 chunk-c2tx3syd.js 的 oe。
 */
var teleportCommandDefinition = {
  type: "local-jsx",
  name: "teleport",
  description: "Send this session to the cloud, or resume one from claude.ai",
  aliases: ["tp"],
  availability: ["claude-ai", "console-profile"],
  isEnabled: () => isClaudeAISubscriber() || consoleProfileCanStartCloudSessions(),
  policyGate: CLOUD_SESSIONS_POLICY,
  get isHidden() {
    return !isCommandEnabled(this);
  },
};
var teleportCommand = teleportCommandDefinition;
export { teleportCommand };
