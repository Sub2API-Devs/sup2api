/**
 * commands/fast/fastArgs.ts
 *
 * 2.1.316 新增：/fast [on|off] 参数处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vr5qyyg8.js (1)
 * attribution: placement 1
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

//@ chunk-vr5qyyg8.js:12230-13030 placement
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
  let t;
  if (lower === "on") t = true;
  else if (lower === "off") t = false;
  else if (lower === "") t = !context.options.fastMode || isMainModelFastRejected(getMainLoopModel());
  else
    return {
      type: "text",
      value: `Unknown argument "${lower}". Use: /fast [on|off]`,
    };
  let i =
    !context.options.isNonInteractiveSession ||
    (isVsCodeTopSession() && !isBridgeOrVerifiedSlackTurn(context));
  return {
    type: "text",
    value: await toggleFastMode(
      context.session,
      t,
      context.getAppState,
      context.setAppState,
      "bridge",
      i,
      context.storageV5,
      () => prefetchFastModeStatus(context.storageV5, context.credentials),
      undefined,
      undefined,
      (r, a) =>
        context.rowCommit.savedFastModeToggle(
          r,
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
          a,
          () => isBridgeOrTransport(context.session),
        ),
      context.onQueryEvent,
    ),
  };
}
