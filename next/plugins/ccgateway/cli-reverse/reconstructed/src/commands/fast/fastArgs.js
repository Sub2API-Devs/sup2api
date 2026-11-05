/**
 * commands/fast/fastArgs.ts
 *
 * 2.1.316 新增：/fast [on|off] 参数处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jq8w4f0j.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isFastModeEnabled,
  getFastModeUnavailableMessage,
  isMainModelFastRejected,
  prefetchFastModeStatus,
} from "../../utils/fastMode.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { isBridgeOrVerifiedSlackTurn } from "../../utils/promptSubmissionOrigin.js";
import { toggleFastMode } from "./fast.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";

//@ chunk-jq8w4f0j.js:13378-14178 placement
/**
 * /fast [on|off]：切换快速模式，不可用时返回原因。
 */
async function runFastCommand(args, context) {
  if (!isFastModeEnabled())
    return {
      type: "text",
      value: getFastModeUnavailableMessage() ?? "Fast mode is not available",
    };
  let lower = args.trim().toLowerCase();
  let body;
  if (lower === "on") body = true;
  else if (lower === "off") body = false;
  else if (lower === "") body = !context.options.fastMode || isMainModelFastRejected(getMainLoopModel());
  else
    return {
      type: "text",
      value: `Unknown argument "${lower}". Use: /fast [on|off]`,
    };
  let ready =
    !context.options.isNonInteractiveSession ||
    (isVsCodeTopSession() && !isBridgeOrVerifiedSlackTurn(context));
  return {
    type: "text",
    value: await toggleFastMode(
      context.session,
      body,
      context.getAppState,
      context.setAppState,
      "bridge",
      ready,
      context.storageV5,
      () => prefetchFastModeStatus(context.storageV5, context.credentials),
      undefined,
      undefined,
      (result, callArgs) =>
        context.rowCommit.savedFastModeToggle(
          result,
          {
            getAppState: context.getAppState,
            setAppState: context.setAppState,
            session: context.session,
            storageV5: context.storageV5,
            dispatchedOverBridge: context.dispatchedOverBridge,
            submissionVerifiedSlackHumanTurn: context.submissionVerifiedSlackHumanTurn,
            options: {
              mcpClients: [],
            },
          },
          callArgs,
          () => isBridgeOrTransport(context.session),
        ),
      context.onQueryEvent,
    ),
  };
}
export { runFastCommand };
