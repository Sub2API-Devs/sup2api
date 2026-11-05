/**
 * utils/hooks/hookAttachmentTypes.ts
 *
 * 2.1.316 新增：钩子附件类型
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kcyerx4c.js (1)
 * attribution: placement 1
 */

//@ chunk-kcyerx4c.js:191-749 placement
/**
 * 判断 hook 附件来自插件还是普通 hook，并给出对应事件名。
 */
function classifyHookAttachmentSource(attachment) {
  switch (attachment.type) {
    case "hook_additional_context":
      return attachment.hookName === "prompt.submit" ||
        attachment.hookName === "prompt.mention" ||
        attachment.hookName === "tool.call"
        ? {
            kind: "plugin",
            event: attachment.hookName,
          }
        : {
            kind: "hook",
            event: attachment.hookEvent,
          };
    case "hook_blocking_error":
    case "hook_stopped_continuation":
    case "hook_success":
    case "hook_non_blocking_error":
    case "hook_error_during_execution":
    case "hook_system_message":
    case "hook_cancelled":
    case "hook_permission_decision":
    case "hook_deferred_tool":
    case "async_hook_response":
      return {
        kind: "hook",
        event: attachment.hookEvent,
      };
    default:
      return {
        kind: "engine",
      };
  }
}
export { classifyHookAttachmentSource };
