/**
 * commands/compact/index.ts
 *
 * /compact 命令对象（DISABLE_COMPACT 时禁用，参数为自定义摘要指令）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/compact/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */
import { isEnvTruthy } from "../../utils/envUtils.js";

//@ chunk-5xgkngpb.js:790378-790696 fingerprint (2.1.88 match: compact, 0.71)
/**
 * /compact 命令对象（local）；描述：Free up context by summarizing the conversation so far；isEnabled: ()=>!Oe(process.env.DISABLE_COMPACT)；实现 chunk-vrrvwm85.js 的 se。
 */
var compactCommandDefinition = {
  type: "local",
  name: "compact",
  description: "Free up context by summarizing the conversation so far",
  isEnabled: () => !isEnvTruthy(process.env.DISABLE_COMPACT),
  supportsNonInteractive: true,
  argumentHint: "<optional custom summarization instructions>",
  thinClientDispatch: "post-text",
  load: () => import("./call.lazy.js"),
};
var compactNonInteractiveCommand = compactCommandDefinition;
export { compactNonInteractiveCommand };
