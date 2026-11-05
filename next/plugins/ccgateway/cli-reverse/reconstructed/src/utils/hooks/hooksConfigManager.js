/**
 * utils/hooks/hooksConfigManager.ts
 *
 * /hooks 界面的事件元数据（说明、退出码语义、matcher 字段）与按事件/matcher 分组。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/hooksConfigManager.ts
 * pieces: chunk-g4mtt8nt.js (4)
 * attribution: fingerprint 1, callgraph-witnessed 1, placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { NOTIFICATION_EVENT_KINDS } from "../config.js";
import { isRestrictedLinksEnabled } from "../../services/oauth/oauthErrors.js";
import { SESSION_END_REASONS_2, HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { getAllHooks, sortMatchersByPriority } from "./hooksSettings.js";
import { getRegisteredHooks } from "../../bootstrap/state.js";

//@ chunk-g4mtt8nt.js:382-13007 fingerprint (2.1.88 match: getHookEventMetadata, 0.822)
/**
 * /hooks 界面用的事件元数据：每个事件的摘要、退出码语义说明和 matcher 字段（tool_name、notification_type、source、trigger、agent_type、error、reason、mcp_server_name、load_reason、to_model、command_name 等）及候选值。
 */
function getHookEventMetadata(toolNames) {
  return {
    PreToolUse: {
      summary: "Before tool execution",
      description: `Input to command is JSON of tool call arguments.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and block tool call
Other exit codes - show stderr to user only but continue with tool call`,
      matcherMetadata: {
        values: toolNames,
      },
    },
    PostToolUse: {
      summary: "After tool execution",
      description: `Input to command is JSON with fields "inputs" (tool call arguments) and "response" (tool call response).
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Exit code 2 - show stderr to model immediately
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: toolNames,
      },
    },
    PostToolUseFailure: {
      summary: "After tool execution fails",
      description: `Input to command is JSON with tool_name, tool_input, tool_use_id, error, error_type, is_interrupt, and is_timeout.
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Exit code 2 - show stderr to model immediately
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: toolNames,
      },
    },
    PostToolBatch: {
      summary: "After a batch of tool calls resolves",
      description: `Fires once after every tool call in a batch has resolved, before the next model request. Input includes tool_calls (array of {tool_name, tool_input, tool_use_id, tool_response}).
Return additionalContext via hookSpecificOutput to inject context once for the whole batch.
Exit code 2 - stop the agentic loop (stderr shown to user only)
Other exit codes - show stderr to user only`,
    },
    PermissionDenied: {
      summary: "After auto mode denies a tool call",
      description: `Input to command is JSON with tool_name, tool_input, tool_use_id, and reason.
Return {"hookSpecificOutput":{"hookEventName":"PermissionDenied","retry":true}} to tell the model it may retry.
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: toolNames,
      },
    },
    Notification: {
      summary: "When notifications are sent",
      description: `Input to command is JSON with notification message and type.
Exit code 0 - stdout/stderr not shown
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: [...NOTIFICATION_EVENT_KINDS, "elicitation_complete", "elicitation_response"],
      },
    },
    UserPromptSubmit: {
      summary: "When the user submits a prompt",
      description: `Input to command is JSON with original user prompt text.
Exit code 0 - stdout shown to Claude
Exit code 2 - block processing, erase original prompt, and show stderr to user only
Other exit codes - show stderr to user only`,
    },
    UserPromptExpansion: {
      summary: "When a user-typed slash command expands into a prompt",
      description: `Input to command is JSON with expansion_type, command_name, command_args, command_source, and original prompt.
Exit code 0 - stdout shown to Claude
Exit code 2 - block expansion and show stderr to user only
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: [],
      },
    },
    SessionStart: {
      summary: "When a new session is started",
      description: `Input to command is JSON with session start source.
Exit code 0 - stdout shown to Claude
Exit code 2 - show stderr to user only
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: ["startup", "resume", "clear", "compact", "fork"],
      },
    },
    Stop: {
      summary: "Right before Claude concludes its response",
      description: `Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and continue conversation
Other exit codes - show stderr to user only`,
    },
    StopFailure: {
      summary: "When the turn ends due to an API error",
      description:
        "Fires instead of Stop when an API error (rate limit, auth failure, etc.) ended the turn. Fire-and-forget \u2014 hook output and exit codes are ignored.",
      matcherMetadata: {
        values: [
          "rate_limit",
          "overloaded",
          "authentication_failed",
          "oauth_org_not_allowed",
          ...(isRestrictedLinksEnabled() ? ["account_on_hold"] : []),
          "verification_required",
          "billing_error",
          "invalid_request",
          "model_not_found",
          "server_error",
          "max_output_tokens",
          "cloud_credential_error",
          "unknown",
        ],
      },
    },
    SubagentStart: {
      summary: "When a subagent (Agent tool call) is started",
      description: `Input to command is JSON with agent_id and agent_type.
Exit code 0 - JSON additionalContext shown to subagent
Exit code 2 - show stderr to user only
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: [],
      },
    },
    SubagentStop: {
      summary: "Right before a subagent (Agent tool call) concludes its response",
      description: `Input to command is JSON with agent_id, agent_type, and agent_transcript_path.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to subagent and continue having it run
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: [],
      },
    },
    PreCompact: {
      summary: "Before conversation compaction",
      description: `Input to command is JSON with compaction details.
Exit code 0 - stdout appended as custom compact instructions
Exit code 2 - block compaction
Other exit codes - show stderr to user only but continue with compaction`,
      matcherMetadata: {
        values: ["manual", "auto"],
      },
    },
    PostCompact: {
      summary: "After conversation compaction",
      description: `Input to command is JSON with compaction details and the summary.
Exit code 0 - stdout shown to user
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: ["manual", "auto"],
      },
    },
    PreModelSwitch: {
      summary: "Before a requested model switch (/model, model picker, set_model)",
      description: `Input to command is JSON with from_model, to_model, requested_model, source, context_tokens and the estimated re-cache cost.
Exit code 0 - switch proceeds; JSON permissionDecision allow/deny/ask as for PreToolUse
Exit code 2 - block the switch and show stderr to user
Other exit codes - show stderr to user only and continue`,
      matcherMetadata: {
        values: [],
      },
    },
    PostModelSwitch: {
      summary: "After the session model changes (any cause)",
      description: `Input to command is JSON with from_model, to_model, requested_model, source, context_tokens and the estimated re-cache cost.
Exit code 0 - stdout shown to Claude on the next request
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: [],
      },
    },
    SessionEnd: {
      summary: "When a session is ending",
      description: `Input to command is JSON with session end reason.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: [...SESSION_END_REASONS_2],
      },
    },
    PermissionRequest: {
      summary: "When a permission dialog is displayed",
      description: `Input to command is JSON with tool_name, tool_input, and tool_use_id.
Output JSON with hookSpecificOutput containing decision to allow or deny.
Exit code 0 - use hook decision if provided
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: toolNames,
      },
    },
    Setup: {
      summary: "Repo setup hooks for init and maintenance",
      description: `Input to command is JSON with trigger (init or maintenance).
Exit code 0 - JSON additionalContext shown to Claude
Exit code 2 - show stderr to user only
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: ["init", "maintenance"],
      },
    },
    TeammateIdle: {
      summary: "When a teammate is about to go idle",
      description: `Input to command is JSON with teammate_name and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to teammate and prevent idle (teammate continues working)
Other exit codes - show stderr to user only`,
    },
    TaskCreated: {
      summary: "When a task is being created",
      description: `Input to command is JSON with task_id, task_subject, task_description, teammate_name, and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and prevent task creation
Other exit codes - show stderr to user only`,
    },
    TaskCompleted: {
      summary: "When a task is being marked as completed",
      description: `Input to command is JSON with task_id, task_subject, task_description, teammate_name, and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and prevent task completion
Other exit codes - show stderr to user only`,
    },
    Elicitation: {
      summary: "When an MCP server requests user input (elicitation)",
      description: `Input to command is JSON with mcp_server_name, message, and requested_schema.
Output JSON with hookSpecificOutput containing action (accept/decline/cancel) and optional content.
Exit code 0 - use hook response if provided
Exit code 2 - deny the elicitation
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: [],
      },
    },
    ElicitationResult: {
      summary: "After a user responds to an MCP elicitation",
      description: `Input to command is JSON with mcp_server_name, action, content, mode, and elicitation_id.
Output JSON with hookSpecificOutput containing optional action and content to override the response.
Exit code 0 - use hook response if provided
Exit code 2 - block the response (action becomes decline)
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: [],
      },
    },
    ConfigChange: {
      summary: "When configuration files change during a session",
      description: `Input to command is JSON with source (user_settings, project_settings, local_settings, policy_settings, skills) and file_path.
Exit code 0 - allow the change
Exit code 2 - block the change from being applied to the session
Other exit codes - show stderr to user only`,
      matcherMetadata: {
        values: ["user_settings", "project_settings", "local_settings", "policy_settings", "skills"],
      },
    },
    InstructionsLoaded: {
      summary: "When an instruction file (CLAUDE.md or rule) is loaded",
      description: `Input to command is JSON with file_path, memory_type (User, Project, Local, Managed), load_reason (session_start, nested_traversal, path_glob_match, include, compact), globs (optional \u2014 the paths: frontmatter patterns that matched), trigger_file_path (optional \u2014 the file Claude touched that caused the load), and parent_file_path (optional \u2014 the file that @-included this one).
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only
This hook is observability-only and does not support blocking.`,
      matcherMetadata: {
        values: ["session_start", "nested_traversal", "path_glob_match", "include", "compact"],
      },
    },
    WorktreeCreate: {
      summary: "Create an isolated worktree for VCS-agnostic isolation",
      description: `Input to command is JSON with name (suggested worktree slug).
Stdout should contain the absolute path to the created worktree directory.
Exit code 0 - worktree created successfully
Other exit codes - worktree creation failed`,
    },
    WorktreeRemove: {
      summary: "Remove a previously created worktree",
      description: `Input to command is JSON with worktree_path (absolute path to worktree).
Exit code 0 - worktree removed successfully
Other exit codes - show stderr to user only`,
    },
    CwdChanged: {
      summary: "After the working directory changes",
      description: `Input to command is JSON with old_cwd and new_cwd.
CLAUDE_ENV_FILE is set \u2014 write bash exports there to apply env to subsequent BashTool commands.
Hook output can include hookSpecificOutput.watchPaths (array of absolute paths) to register with the FileChanged watcher.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only`,
    },
    FileChanged: {
      summary: "When a watched file changes",
      description: `Input to command is JSON with file_path and event (change, add, unlink).
CLAUDE_ENV_FILE is set \u2014 write bash exports there to apply env to subsequent BashTool commands.
The matcher field specifies filenames to watch in the current directory (e.g. ".envrc|.env").
Hook output can include hookSpecificOutput.watchPaths (array of absolute paths) to dynamically update the watch list.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only`,
    },
    DirectoryAdded: {
      summary: "After a working directory is added mid-session",
      description: `Fires after /add-dir or the register_repo_root SDK control request registers a new working directory, after the sandbox configuration has been refreshed \u2014 so sandboxed tools and permission state already see the new directory (hook commands themselves run unsandboxed).
Input to command is JSON with directory (absolute path) and source ("slash_command" or "register_repo_root").
Exit code 0 - command completes successfully
Other exit codes - stderr is debug-logged on both paths; for /add-dir, a failure count is summarized to Claude and hook systemMessage output reaches Claude as bounded context; for register_repo_root, everything is debug-logged only`,
      matcherMetadata: {
        values: ["slash_command", "register_repo_root"],
      },
    },
    MessageDisplay: {
      summary: "While assistant message text is displayed",
      description: `Input to command is JSON with turn_id, message_id, index, final, and delta (the newly completed lines).
Output JSON with hookSpecificOutput containing displayContent to replace the delta on screen.
Display-only: the stored message and what the model sees are untouched.
Exit code 0 - use hook response if provided
Other exit codes - display the original delta`,
    },
  };
}
//@ chunk-g4mtt8nt.js:13007-13510 callgraph-witnessed (2.1.88 match: groupHooksByEventAndMatcher, 0.296)
/**
 * 把所有钩子（各 settings、会话、插件注册）按事件和 matcher 分组，供 /hooks 界面展示。
 */
function groupHooksByEventAndMatcher(appState, toolNames) {
  let grouped = Object.create(null);
  for (let event of HOOK_EVENTS) grouped[event] = Object.create(null);
  let metadata = getHookEventMetadata(toolNames);
  getAllHooks(appState).forEach((hook) => {
    let eventGroup = grouped[hook.event];
    if (eventGroup) {
      let matcherKey = metadata[hook.event].matcherMetadata !== undefined ? hook.matcher || "" : "";
      if (!eventGroup[matcherKey]) eventGroup[matcherKey] = [];
      eventGroup[matcherKey].push(hook);
    }
  });
  let registeredHooks = getRegisteredHooks();
  if (registeredHooks)
    for (let [event, matchers] of Object.entries(registeredHooks)) {
      let hookEvent = event;
      let eventGroup = grouped[hookEvent];
      if (!eventGroup) continue;
      for (let matcher of matchers) {
        let matcherKey = matcher.matcher || "";
        if ("pluginRoot" in matcher) {
          eventGroup[matcherKey] ??= [];
          for (let hook of matcher.hooks)
            eventGroup[matcherKey].push({
              event: hookEvent,
              config: hook,
              matcher: matcher.matcher,
              source: "pluginHook",
              pluginName: matcher.pluginId,
            });
        }
      }
    }
  return grouped;
}
//@ chunk-g4mtt8nt.js:13510-13574 placement
function getSortedMatchersForEvent(hooksByEventAndMatcher, event) {
  let matchers = Object.keys(hooksByEventAndMatcher[event] || {});
  return sortMatchersByPriority(matchers, hooksByEventAndMatcher, event);
}
//@ chunk-g4mtt8nt.js:13574-13627 placement
/**
 * 取某来源某事件（可选 matcher）下配置的钩子列表。
 */
function hooksForSourceAndEvent(hooksByEventAndMatcher, selectedEvent, selectedMatcher) {
  let matcherKey = selectedMatcher ?? "";
  return hooksByEventAndMatcher[selectedEvent]?.[matcherKey] ?? [];
}
export {
  getSortedMatchersForEvent,
  getHookEventMetadata,
  groupHooksByEventAndMatcher,
  hooksForSourceAndEvent,
};
