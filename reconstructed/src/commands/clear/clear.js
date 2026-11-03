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

/**
 * /clear 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-4mtxrwhe.js:12386-12797 placement
var call = async (args, context) => {
  let a = args.trim() || void 0,
    t = getSessionId();
  context.dialogStore?.dismissKind(LOCAL_JSX_DIALOG.kind);
  for await (let o of clearConversation({
    ...context,
    clearedSessionTitle: a,
    resetTrigger: "clear",
    resetUserMessageUuid: context.commandMessageUuid,
  }))
    context.onQueryEvent?.(o);
  let r = isHumanOrigin(context.submissionOrigin) && !hasAgentTaskSurvivingClear(context.taskRegistry.all());
  return (
    import("./chunk-9a6n2431.js")
      .then((o) => o.closeSessionTabGroup({ sessionId: t, onlyIfEmpty: !r }))
      .catch(logError),
    { type: "text", value: "" }
  );
};
