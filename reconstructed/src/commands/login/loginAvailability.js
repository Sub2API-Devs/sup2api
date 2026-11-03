/**
 * commands/login/loginAvailability.ts
 *
 * 2.1.316 新增：判断当前环境是否允许 /login
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { Jn } from "../../remote/remoteMode.js";
import { htt, exitHint } from "../../utils/remoteSessionCommands.js";
import { validateForceLoginMethod } from "../../utils/auth.js";

/**
 * getLoginAvailability：any-method / refused / claudeai-only（云会话内登录限制）。
 */
//@ chunk-e6aww6q8.js:1730772-1731476 placement
function getLoginAvailability(e = Jn()) {
  if (e?.sessionId === void 0 && !htt()) return { kind: "any-method" };
  if (e?.consoleProfileBearer)
    return {
      kind: "refused",
      cause: "console_profile_session",
      notice: `Signing in isn't available here: this cloud session was started with your Console sign-in, and a claude.ai sign-in can't be used for it. To renew the Console sign-in, ${exitHint(!1)}, then attach to the session again.`,
    };
  if (!validateForceLoginMethod(!0).valid)
    return {
      kind: "refused",
      cause: "login_method_pin",
      notice:
        "Signing in isn't available here: a cloud session needs a claude.ai sign-in, and the forceLoginMethod setting on this machine requires a different sign-in method. To sign in here, that setting has to allow claude.ai.",
    };
  return { kind: "claudeai-only" };
}

export { getLoginAvailability };
