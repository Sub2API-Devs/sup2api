/**
 * commands/low-priority/index.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { LOW_PRIORITY, iAt } from "../../services/lowPriority/headers.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { dD } from "../../services/lowPriority/lowPriorityMode.js";

/**
 * /low-priority 命令对象（local）；描述：Continue now at lower priority after reaching your 5-hour limit; run again to stop；isEnabled: ()=>vt()&&(dD()||iAt())；isHidden: true；实现 chunk-khcb6nvd.js 的 r。
 */
//@ chunk-e6aww6q8.js:2043113-2043361 placement = thinkbackPlay (0.64)
var lowPriorityCommandDefinition = {
    type: "local",
    name: LOW_PRIORITY,
    description: "Continue now at lower priority after reaching your 5-hour limit; run again to stop",
    supportsNonInteractive: !1,
    isEnabled: () => isClaudeAISubscriber() && (dD() || iAt()),
    isHidden: !0,
    load: () => import("./chunk-khcb6nvd.js"),
  },
  lowPriorityCommand = lowPriorityCommandDefinition;

export { lowPriorityCommand };
