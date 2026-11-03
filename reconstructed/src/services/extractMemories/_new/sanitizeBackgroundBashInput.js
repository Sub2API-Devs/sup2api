/**
 * services/extractMemories/_new/sanitizeBackgroundBashInput.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6exk38gf.js (1)
 * attribution: sole-consumer-new 1
 */
import { booleanishSchema } from "../../../utils/spellcheck.js";

/**
 * 检查后台记忆代理等受限调用方的 Bash 输入：要求关闭沙箱或后台运行时拒绝并给出说明，否则返回把两项强制为 false 的输入。
 */
//@ chunk-6exk38gf.js:227-848 sole-consumer-new
function sanitizeBackgroundBashInput(callerName, input) {
  let safeParse = booleanishSchema().safeParse(input.dangerouslyDisableSandbox);
  if (safeParse.success && safeParse.data)
    return {
      deniedFlag: "dangerouslyDisableSandbox",
      message: `unsandboxed execution (dangerouslyDisableSandbox) is not available to ${callerName}. If the command failed with a sandbox violation, the operation cannot be performed in this context \u2014 do not retry it.`,
    };
  let safeParse_2 = booleanishSchema().safeParse(input.run_in_background);
  if (safeParse_2.success && safeParse_2.data)
    return {
      deniedFlag: "run_in_background",
      message: `run_in_background is not available to ${callerName} \u2014 run the command in the foreground.`,
    };
  return { sanitizedInput: { ...input, dangerouslyDisableSandbox: !1, run_in_background: !1 } };
}

export { sanitizeBackgroundBashInput };
