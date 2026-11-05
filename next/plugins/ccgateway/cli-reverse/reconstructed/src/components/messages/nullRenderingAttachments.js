/**
 * components/messages/nullRenderingAttachments.ts
 *
 * 不渲染的附件类型集合与判定；本模块混入大量消息转发/归属判定代码（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/nullRenderingAttachments.ts
 * pieces: chunk-0wbdaeqh.js (2), chunk-hnxhr3bs.js (2)
 * attribution: placement 2, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-hnxhr3bs.js:21283-22930 fingerprint (2.1.88 match: NULL_RENDERING_TYPES, 0.459)
/**
 * 不在界面渲染的附件类型清单（钩子上下文、各类提醒、delta、环境/模型/语言、提示快照等），XT 为其 Set。
 */
var NULL_RENDERING_ATTACHMENT_TYPES = [
  "hook_success",
  "hook_additional_context",
  "inlined_image_paths",
  "widget_context_hint",
  "command_permissions",
  "agent_mention",
  "peer_mention",
  "skill_mention",
  "budget_usd",
  "critical_system_reminder",
  "edited_image_file",
  "edited_text_file",
  "opened_file_in_ide",
  "output_style",
  "plan_mode",
  "plan_mode_exit",
  "plan_mode_reentry",
  "read_truncation_notice",
  "bash_output_audience_note",
  "unknown_command_fallback",
  "dir_sync_notice",
  "goals",
  "cowork_memory_context",
  "structured_output",
  "team_context",
  "todo_reminder",
  "context_efficiency",
  "deferred_tools_delta",
  "mcp_instructions_delta",
  "mcp_dropped_tools_delta",
  "memory_update",
  "token_usage",
  "total_tokens_reminder",
  "output_limit_note",
  "silent_turn_reminder",
  "elapsed_time_reminder",
  "batching_reminder",
  "batching_reminder_sent",
  "secondary_reminder",
  "secondary_reminder_sent",
  "ultrathink_effort",
  "repl_mcp_needs_auth",
  "max_turns_reached",
  "poll_events",
  "task_reminder",
  "tool_search_usage_reminder",
  "attention_budget",
  "proactivity",
  "auto_mode",
  "auto_mode_exit",
  "output_token_usage",
  "date_change",
  "thread_state",
  "prefix_delta",
  "sandbox_instructions",
  "artifact_opening_prefetch",
  "thinking_stripped",
  "advisor_stripped",
  "thinking_drop",
  "credential_org",
  "environment",
  "model",
  "output_style_instructions",
  "language",
  "session_context",
  "coordinator_context",
  "context_sections",
  "project_doc_reads",
  "message_pdf_reads",
  "date",
  "instructions",
  "prompt_snapshot",
  "prompt_render_point",
  "deferred_tools_record",
  "session_cron_carry",
  "projects_thread_ask",
  "fork_briefing",
  "workflow_keyword_request",
  "ultra_effort_enter",
  "ultra_effort_exit",
  "workflow_size_guideline_change",
  "remote_session_change",
  "advisor_tool",
];
var NULL_RENDERING_ATTACHMENT_TYPE_SET = new Set(NULL_RENDERING_ATTACHMENT_TYPES);
//@ chunk-hnxhr3bs.js:22930-23518 placement
/**
 * 不渲染的附件消息判定
 */
function isHiddenAttachmentMessage(message) {
  if (message.type !== "attachment") return false;
  if (message.attachment.type === "hook_cancelled")
    return !(message.attachment.hookEvent === "UserPromptSubmit" && message.attachment.timedOut);
  if (message.attachment.type === "tool_host_result_lines")
    return (
      !(
        message.attachment.unverified === true &&
        typeof message.attachment.label === "string" &&
        message.attachment.label.trim() !== ""
      ) &&
      !(Array.isArray(message.attachment.lines) ? message.attachment.lines : []).some(
        (line) => typeof line === "string" && line.trim() !== "",
      )
    );
  if (message.attachment.type === "invoked_skills") {
    let skills = message.attachment.skills;
    return !Array.isArray(skills) || skills.length === 0 || skills.some((skill) => skill == null);
  }
  return NULL_RENDERING_ATTACHMENT_TYPE_SET.has(message.attachment.type);
}
//@ chunk-0wbdaeqh.js:227-342 placement
/**
 * 不在界面渲染的四个 hook 附件类型集合；components/messages/nullRenderingAttachments 用它判定附件是否渲染。
 */
var HOOK_CONTEXT_ATTACHMENT_TYPES = new Set([
  "hook_blocking_error",
  "hook_additional_context",
  "hook_stopped_continuation",
  "hook_system_message",
]);
//@ chunk-0wbdaeqh.js:399-470 fingerprint (2.1.88 match: isNullRenderingAttachment, 1)
function isNullRenderingAttachment(msg) {
  return msg.type === "attachment" && HOOK_CONTEXT_ATTACHMENT_TYPES.has(msg.attachment.type);
}
export { isHiddenAttachmentMessage, isNullRenderingAttachment };
