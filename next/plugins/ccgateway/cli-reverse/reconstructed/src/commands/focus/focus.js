/**
 * commands/focus/focus.ts
 *
 * 2.1.316 新增：/focus 命令：切换 focus 视图（只显示提示、摘要和回复），受托管 viewMode 限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fv21ck8e.js (1)
 * attribution: placement 1
 */
import { isLocalStdinSubmission } from "../../utils/promptSubmissionOrigin.js";
import { isFocusModeFlag, setViewMode } from "../../utils/focusMode.js";

//@ chunk-fv21ck8e.js:3405-3974 placement
/**
 * /focus 命令：切换 focus 视图（只显示提示、摘要和回复），受托管 viewMode 限制。
 */
async function call(args, context) {
  if (isLocalStdinSubmission(context))
    return {
      type: "text",
      value: "/focus isn't available here yet",
    };
  let lower = args.trim().toLowerCase();
  let commandArgs;
  if (lower === "on") commandArgs = true;
  else if (lower === "off") commandArgs = false;
  else if (lower === "") commandArgs = !isFocusModeFlag();
  else
    return {
      type: "text",
      value: `Unknown argument "${lower}". Use: /focus [on|off]`,
    };
  setViewMode(commandArgs ? "focus" : "default");
  context.onQueryEvent?.({
    type: "apply_flag_settings",
    settings: {
      briefTranscript: commandArgs,
    },
  });
  let isFocusMode = isFocusModeFlag();
  if (isFocusMode !== commandArgs)
    return {
      type: "text",
      value: `Focus view is set by a managed "viewMode" setting \u2014 it stays ${isFocusMode ? "on" : "off"}`,
    };
  return {
    type: "text",
    value: commandArgs ? "Focus view enabled" : "Focus view disabled",
  };
}
export { call };
