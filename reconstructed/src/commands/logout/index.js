/**
 * commands/logout/index.ts
 *
 * /logout 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/logout/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { env } from "../../utils/env.js";

/**
 * /logout 命令对象（local-jsx）；描述：Sign out from your Anthropic account；isEnabled: ()=>!i.DISABLE_LOGOUT_COMMAND；实现 chunk-tndsj50r.js 的 u。
 */
//@ chunk-e6aww6q8.js:1731822-1732051 fingerprint = default (0.732)
var logoutCommand = {
  type: "local-jsx",
  name: "logout",
  description: "Sign out from your Anthropic account",
  isEnabled: () => !env.DISABLE_LOGOUT_COMMAND,
  fleetHostCall: async (e) => {
    let { fleetHostLogout: fleetHostLogout } = await import("./chunk-3pe4yaee.js");
    return fleetHostLogout(e);
  },
};

export { logoutCommand };
