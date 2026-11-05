/**
 * commands/rate-limit-options/index.ts
 *
 * 已有模块；g2 补充命令定义声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rate-limit-options/index.ts
 * pieces: chunk-2qmwp9k3.js (3), chunk-5xgkngpb.js (1)
 * attribution: placement 3, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  booleanSchema,
  nullSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2099087-2099243 fingerprint (2.1.88 match: rateLimitOptions, 0.602)
/**
 * /rate-limit-options 命令对象（local-jsx）；描述：Manage usage limits and upgrade options；isEnabled: ()=>vt()||!1；实现 chunk-dg94x42s.js 的 Ha。
 */
var rateLimitOptionsCommandDefinition = {
  type: "local-jsx",
  name: "rate-limit-options",
  description: "Manage usage limits and upgrade options",
  isEnabled: () => isClaudeAISubscriber() || false,
  requires: {
    ink: true,
  },
};
var rateLimitOptionsCommand = rateLimitOptionsCommandDefinition;
//@ chunk-2qmwp9k3.js:304-537 placement
/**
 * local_jsx 对话框定义与 holdsQueue 载荷。
 */
var LOCAL_JSX_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var HoldsQueueSchema;
deferInit("chunk-2qmwp9k3.js:304", () => {
  LOCAL_JSX_DIALOG = withHideWhile({
    kind: "local_jsx",
    payload: DoctorLazy(() =>
      objectSchema({
        nodeId: stringSchema(),
        commandName: stringSchema(),
        immediate: booleanSchema(),
        hidesPrompt: booleanSchema(),
        holdsQueue: booleanSchema().optional(),
      }),
    ),
    result: DoctorLazy(() => nullSchema()),
    default: null,
    userInvoked: true,
    hideWhile: [],
  });
  HoldsQueueSchema = DoctorLazy(() =>
    objectSchema({
      holdsQueue: booleanSchema().optional(),
    }),
  );
});
//@ chunk-2qmwp9k3.js:537-643 placement
/**
 * 打开的 local_jsx 对话框是否占住队列。
 */
function isLocalJsxHoldingQueue(state) {
  return state.open.some(
    (entry) =>
      entry.kind === LOCAL_JSX_DIALOG.kind &&
      HoldsQueueSchema().safeParse(entry.payload).data?.holdsQueue !== false,
  );
}
//@ chunk-2qmwp9k3.js:643-703 placement
/**
 * rate-limit-options 命令的别名集合（rate-limit-options、pro-trial-expired）。
 */
var RATE_LIMIT_OPTIONS_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2qmwp9k3.js:643", () => {
  RATE_LIMIT_OPTIONS_COMMANDS = new Set(["rate-limit-options", "pro-trial-expired"]);
});
export { rateLimitOptionsCommand, LOCAL_JSX_DIALOG, isLocalJsxHoldingQueue, RATE_LIMIT_OPTIONS_COMMANDS };
