/**
 * commands/logout/index.ts
 *
 * /logout 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/logout/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";

//@ chunk-5xgkngpb.js:1807274-1807503 fingerprint (2.1.88 match: default, 0.732)
/**
 * /logout 命令对象（local-jsx）；描述：Sign out from your Anthropic account；isEnabled: ()=>!i.DISABLE_LOGOUT_COMMAND；实现 chunk-tndsj50r.js 的 u。
 */
var logoutCommand = {
  type: "local-jsx",
  name: "logout",
  description: "Sign out from your Anthropic account",
  isEnabled: () => !env.DISABLE_LOGOUT_COMMAND,
  fleetHostCall: async (call) => {
    let { fleetHostLogout } = await import("../../cli/handlers/LOGOUT_NOT_SAVED_MESSAGE.lazy.js");
    return fleetHostLogout(call);
  },
};
export { logoutCommand };
