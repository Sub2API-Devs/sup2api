/**
 * commands/rate-limit-options/index.ts
 *
 * 已有模块；g2 补充命令定义声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rate-limit-options/index.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-ntgvwzh2.js (3)
 * attribution: fingerprint 1, placement 3
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, M, zg } from "../../../vendor/zod/v4/classic/schemas.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";

/**
 * local_jsx 对话框定义与 holdsQueue 载荷。
 */
//@ chunk-ntgvwzh2.js:304-537 placement
var LOCAL_JSX_DIALOG = withHideWhile({
    kind: "local_jsx",
    payload: DoctorLazy(() =>
      u({ nodeId: o(), commandName: o(), immediate: M(), hidesPrompt: M(), holdsQueue: M().optional() }),
    ),
    result: DoctorLazy(() => zg()),
    default: null,
    userInvoked: !0,
    hideWhile: [],
  }),
  HoldsQueueSchema = DoctorLazy(() => u({ holdsQueue: M().optional() }));
/**
 * 打开的 local_jsx 对话框是否占住队列。
 */
//@ chunk-ntgvwzh2.js:537-643 placement
function isLocalJsxHoldingQueue(a) {
  return a.open.some(
    (e) =>
      e.kind === LOCAL_JSX_DIALOG.kind && HoldsQueueSchema().safeParse(e.payload).data?.holdsQueue !== !1,
  );
}
//@ chunk-ntgvwzh2.js:643-703 placement
var uOo = new Set(["rate-limit-options", "pro-trial-expired"]);
/**
 * /rate-limit-options 命令对象（local-jsx）；描述：Manage usage limits and upgrade options；isEnabled: ()=>vt()||!1；实现 chunk-dg94x42s.js 的 Ha。
 */
//@ chunk-e6aww6q8.js:2042957-2043113 fingerprint = rateLimitOptions (0.602)
var rateLimitOptionsCommandDefinition = {
    type: "local-jsx",
    name: "rate-limit-options",
    description: "Manage usage limits and upgrade options",
    isEnabled: () => isClaudeAISubscriber() || !1,
    requires: { ink: !0 },
  },
  rateLimitOptionsCommand = rateLimitOptionsCommandDefinition;

export { LOCAL_JSX_DIALOG, isLocalJsxHoldingQueue, uOo, rateLimitOptionsCommand };
