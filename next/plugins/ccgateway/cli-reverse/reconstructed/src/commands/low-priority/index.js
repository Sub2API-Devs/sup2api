/**
 * commands/low-priority/index.ts
 *
 * 2.1.316 新增：/low-priority 命令定义（本地命令、仅订阅用户可用、默认隐藏，实现按需加载）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { LOW_PRIORITY, isLowPriorityEnabled } from "../../services/lowPriority/headers.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isLowPriorityActive } from "../../services/lowPriority/lowPriorityMode.js";

//@ chunk-e6aww6q8.js:2043113-2043361 placement (2.1.88 match: thinkbackPlay, 0.64)
/**
 * /low-priority 命令对象（local）；描述：Continue now at lower priority after reaching your 5-hour limit; run again to stop；isEnabled: ()=>vt()&&(dD()||iAt())；isHidden: true；实现 chunk-khcb6nvd.js 的 r。
 */
var lowPriorityCommandDefinition = {
  type: "local",
  name: LOW_PRIORITY,
  description: "Continue now at lower priority after reaching your 5-hour limit; run again to stop",
  supportsNonInteractive: false,
  isEnabled: () => isClaudeAISubscriber() && (isLowPriorityActive() || isLowPriorityEnabled()),
  isHidden: true,
  load: () => import("../statusline/call.lazy.js"),
};
var lowPriorityCommand = lowPriorityCommandDefinition;
export { lowPriorityCommand };
