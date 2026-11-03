/**
 * components/messages/nullRenderingAttachments.ts
 *
 * 不渲染的附件类型集合与判定；本模块混入大量消息转发/归属判定代码（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/nullRenderingAttachments.ts
 * pieces: chunk-ag5x7vhf.js (2)
 * attribution: fingerprint 1, placement 1
 */

/**
 * 不在界面渲染的附件类型清单（钩子上下文、各类提醒、delta、环境/模型/语言、提示快照等），XT 为其 Set。
 */
//@ chunk-ag5x7vhf.js:22436-24025 fingerprint = NULL_RENDERING_TYPES (0.472)
var NULL_RENDERING_ATTACHMENT_TYPES = [
    "hook_success",
    "hook_additional_context",
    "inlined_image_paths",
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
    ...[],
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
  ],
  NULL_RENDERING_ATTACHMENT_TYPE_SET = new Set(NULL_RENDERING_ATTACHMENT_TYPES);
/**
 * 不渲染的附件消息判定
 */
//@ chunk-ag5x7vhf.js:24025-24486 placement
function isHiddenAttachmentMessage(m) {
  if (m.type !== "attachment") return !1;
  if (m.attachment.type === "hook_cancelled")
    return !(m.attachment.hookEvent === "UserPromptSubmit" && m.attachment.timedOut);
  if (m.attachment.type === "tool_host_result_lines")
    return (
      !(
        m.attachment.unverified === !0 &&
        typeof m.attachment.label === "string" &&
        m.attachment.label.trim() !== ""
      ) &&
      !(Array.isArray(m.attachment.lines) ? m.attachment.lines : []).some(
        (x) => typeof x === "string" && x.trim() !== "",
      )
    );
  return NULL_RENDERING_ATTACHMENT_TYPE_SET.has(m.attachment.type);
}

export { isHiddenAttachmentMessage };
