/**
 * commands/clear/clearCommand.ts
 *
 * `/clear` 的实现：重置会话、关闭空标签页，并在沙箱已固定时提示需重启（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yjtttm4r.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSessionId } from "../../bootstrap/state.js";
import { LOCAL_JSX_DIALOG } from "../rate-limit-options/index.js";
import { clearConversation, hasAgentTaskSurvivingClear } from "./conversation.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { logError } from "../../utils/log.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { isCodeModeHeldOffBySandbox } from "../../utils/codeMode.js";
import { CODE_MODE_EXPERIMENTAL_LABEL, CODE_MODE_LABEL } from "../../constants/codeMode.js";

//@ chunk-yjtttm4r.js:13562-14176 placement
/**
 * `/clear` 的实现：重置会话流、关闭空标签页，沙箱已固定时提示需重启。
 */
var runClear = async (title, ctx) => {
  let clearedSessionTitle = title.trim() || undefined;
  let sessionId = getSessionId();
  ctx.dialogStore?.dismissKind(LOCAL_JSX_DIALOG.kind);
  for await (let event of clearConversation({
    ...ctx,
    clearedSessionTitle,
    resetTrigger: "clear",
    resetUserMessageUuid: ctx.commandMessageUuid,
  }))
    ctx.onQueryEvent?.(event);
  let closeOnlyIfEmpty =
    isHumanOrigin(ctx.submissionOrigin) && !hasAgentTaskSurvivingClear(ctx.taskRegistry.all());
  import("../../utils/claudeInChrome/closeSessionTabGroup.lazy.js")
    .then((moduleNamespace) =>
      moduleNamespace.closeSessionTabGroup({
        sessionId,
        onlyIfEmpty: !closeOnlyIfEmpty,
      }),
    )
    .catch(logError);
  return {
    type: "text",
    value:
      codeModeAccepted() && isCodeModeHeldOffBySandbox()
        ? `${CODE_MODE_EXPERIMENTAL_LABEL} stays off until you quit Claude Code: the sandbox has already set up the ordinary tools' network access in a way that ${CODE_MODE_LABEL} can't use. To use ${CODE_MODE_LABEL}, quit and start Claude Code again.`
        : "",
  };
};
export { runClear };
