/**
 * commands/login/index.ts
 *
 * /login 命令对象（描述随登录状态变化，云会话可拒绝）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/login/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { hasAnthropicApiKeyAuth } from "../../utils/auth.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { env } from "../../utils/env.js";
import { isCommandEnabled } from "../../commands.js";
import { getLoginAvailability } from "./loginAvailability.js";

//@ chunk-e6aww6q8.js:1731476-1731822 fingerprint = default (0.788)
/**
 * /login 命令对象：描述随是否已用 API key 登录变化，可用 DISABLE_LOGIN_COMMAND 禁用，登录被拒时隐藏。
 */
var loginCommand_2 = () => ({
  type: "local-jsx",
  name: "login",
  get description() {
    return hasAnthropicApiKeyAuth() ? "Switch Anthropic accounts" : "Sign in with your Anthropic account";
  },
  isEnabled: () => {
    let remoteCaps = getRemoteCaps();
    return !env.DISABLE_LOGIN_COMMAND && (remoteCaps === null || remoteCaps.sessionId !== undefined);
  },
  get isHidden() {
    return !isCommandEnabled(this) || getLoginAvailability().kind === "refused";
  },
  requires: {
    ink: true,
  },
  fleetHostCall: async ({ login }) => login(),
});
export { loginCommand_2 };
