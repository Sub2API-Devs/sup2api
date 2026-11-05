/**
 * commands/teleport/index.ts
 *
 * 2.1.316 新增：/teleport 命令对象：把会话转到云端或从云端取回
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { consoleProfileCanStartCloudSessions } from "../../utils/teleport/api.js";
import { CLOUD_SESSIONS_POLICY } from "../../services/cloudSessions/cloudSessionsPolicy.js";
import { isCommandEnabled } from "../../commands.js";

//@ chunk-5xgkngpb.js:1826506-1826764 placement
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
