/**
 * commands/clear/clear.ts
 *
 * /clear：清空会话并重置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/clear/clear.ts
 * pieces: chunk-4mtxrwhe.js (1)
 * attribution: placement 1
 */
import { getSessionId } from "../../bootstrap/state.js";
import { LOCAL_JSX_DIALOG } from "../rate-limit-options/index.js";
import { clearConversation, hasAgentTaskSurvivingClear } from "./conversation.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { logError } from "../../utils/log.js";

//@ chunk-4mtxrwhe.js:12386-12797 placement
/**
 * /clear 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (args, context) => {
  let clearedSessionTitle = args.trim() || undefined;
  let sessionId = getSessionId();
  context.dialogStore?.dismissKind(LOCAL_JSX_DIALOG.kind);
  for await (let session of clearConversation({
    ...context,
    clearedSessionTitle,
    resetTrigger: "clear",
    resetUserMessageUuid: context.commandMessageUuid,
  }))
    context.onQueryEvent?.(session);
  let keepTabGroup =
    isHumanOrigin(context.submissionOrigin) && !hasAgentTaskSurvivingClear(context.taskRegistry.all());
  import("../../utils/claudeInChrome/closeSessionTabGroup.lazy.js")
    .then((tabs) =>
      tabs.closeSessionTabGroup({
        sessionId,
        onlyIfEmpty: !keepTabGroup,
      }),
    )
    .catch(logError);
  return {
    type: "text",
    value: "",
  };
};
export { call };
