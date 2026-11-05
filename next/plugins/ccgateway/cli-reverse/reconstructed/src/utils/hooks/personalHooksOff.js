/**
 * utils/hooks/personalHooksOff.ts
 *
 * CLAUDE_CODE_PERSONAL_HOOKS_OFF 的取值归一（none/off/host/retry…）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fwzx45c8.js (1)
 * attribution: placement 1
 */
import { personalConfigRestrictionFlag } from "../personalConfigRestriction.js";
import { env } from "../env.js";

//@ chunk-fwzx45c8.js:624-906 placement
/**
 * CLAUDE_CODE_PERSONAL_HOOKS_OFF 的取值归一（none/off/host/retry/fix/launch）。
 */
function personalHooksOffKind() {
  let restriction = personalConfigRestrictionFlag?.();
  let lower = (
    restriction === undefined
      ? env.CLAUDE_CODE_PERSONAL_HOOKS_OFF
      : restriction.CLAUDE_CODE_PERSONAL_HOOKS_OFF
  )
    ?.trim()
    .toLowerCase();
  switch (lower) {
    case undefined:
    case "":
    case "none":
    case "0":
    case "false":
    case "no":
    case "off":
      return;
    case "retry":
    case "fix":
    case "launch":
      return lower;
    default:
      return "host";
  }
}
export { personalHooksOffKind };
