/**
 * commands/remote-env/index.ts
 *
 * /remote-env 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/remote-env/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { consoleProfileCanStartCloudSessions } from "../../utils/teleport/api.js";
import { CLOUD_SESSIONS_POLICY } from "../../services/cloudSessions/cloudSessionsPolicy.js";
import { isCommandEnabled } from "../../commands.js";

//@ chunk-e6aww6q8.js:2041085-2041309 fingerprint = default (0.485)
/**
 * /remote-env 命令对象（local-jsx）；描述：Choose the default environment for cloud agents；availability ["claude-ai","console-profile"]；isEnabled: ()=>vt()||B8t()；isHidden: {return!Ud(this)}；实现 chunk-zj31az9x.js 的 Vt。
 */
var remoteEnvCommand = {
  type: "local-jsx",
  name: "remote-env",
  description: "Choose the default environment for cloud agents",
  availability: ["claude-ai", "console-profile"],
  isEnabled: () => isClaudeAISubscriber() || consoleProfileCanStartCloudSessions(),
  policyGate: CLOUD_SESSIONS_POLICY,
  get isHidden() {
    return !isCommandEnabled(this);
  },
};
export { remoteEnvCommand };
