/**
 * entrypoints/sdk/controlSchemas.ts
 *
 * 并入已有模块：SDK 控制协议 schema（initialize、interrupt、can_use_tool、钩子回调、mcp 消息、cancel_async 等）与控制请求注册表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/sdk/controlSchemas.ts
 * pieces: chunk-0h9p4sxp.js (2), chunk-0tcpyvr1.js (1), chunk-0yw3taqg.js (2), chunk-1kk50rk6.js (1), chunk-5dqwe9kx.js (1), chunk-5xgkngpb.js (1), chunk-7kayq7nc.js (4), chunk-asf5gh8x.js (2), chunk-ck4jrdtf.js (1), chunk-czq1j3j2.js (4), chunk-h29vk4wn.js (1), chunk-hjswk319.js (1)
 * attribution: affinity 2, fingerprint 14, placement 4, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  unknown,
  objectSchema,
  stringSchema,
  array,
  numberSchema,
  literal,
  record,
  _enum,
  booleanSchema,
  discriminatedUnion,
  union,
  looseObject,
  lazy,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { hookFailureModeSchema } from "../../schemas/hooks.js";
import {
  HookEventNameSchema,
  SDKSdkMessageSchema,
  SubagentDefinitionSchema,
  SDKLocalMessageSchema,
  SkillCommandSchema,
  AgentDefinitionSchema,
  ModelOptionSchema,
  AccountInfoSchema,
  PermissionModeSchema,
  FastModeStateSchema,
  FastModeBlockedReasonSchema,
  FooterIndicatorSchema,
  McpToolSourceSchema,
  McpAddRulesServerConfigSchema,
  THINKING_DISPLAY_MODES,
  McpServerStatusSchema,
  ModelUsageSchema,
  CONTEXT_CATEGORY_ORDER,
  CONTEXT_CATEGORY_KINDS,
  SKIPPED_LINKS_DESCRIPTION,
  HookInputUnionSchema,
  SDKUserMessageBaseSchema,
  SDKAssistantMessageSchema_2,
  McpServerConfigSchema,
  PLUGIN_VERSION_DESCRIPTION,
  SettingsValidationErrorSchema,
  CanUseToolResultSchema,
  HookOutputSchema,
  PanesSchema,
  SDK_ERROR_CODES,
  SDKMessageSchema,
  SDKSystemPostTurnSummaryMessageSchema,
  SDKSystemTaskSummaryMessageSchema,
  SDKSystemSessionMetadataMessageSchema,
  SDKTranscriptMirrorMessageSchema,
  SDKActiveGoalMessageSchema,
  SDKAutocompactStateMessageSchema,
  SDKBashCommandMessageSchema,
} from "./coreSchemas.js";
import {
  PERMISSION_DECISION_REASON_TYPES,
  DECISION_REASON_CODES,
  PERMISSION_REQUEST_TOOL_KINDS,
  MCP_ASK_FOR_TOOLS_NAME,
  MCP_ASK_FOR_TOOLS_MAX,
} from "../../types/permissions.js";
import { parseToolOutputSchema } from "../../services/mcp/schemaParse.js";
import { tryRenderShutdownMessage } from "../../components/messages/ShutdownMessage.js";
import {
  SDKMessageRatedMessageRatedMessageSchema,
  MessageRatedResponseSchema,
  SDKOauthTokenRefreshOauthTokenRefreshMessageSchema,
  OAuthTokenRefreshResponseSchema,
  SDKHostAuthTokenRefreshHostAuthTokenRefreshMessageSchema,
  HostAuthTokenRefreshResponseSchema,
  SDKUiAttachUiAttachMessageSchema,
  UiAttachResponseSchema,
  SDKUiDetachUiDetachMessageSchema,
  UiDetachResponseSchema,
  SDKUiRenderUiRenderMessageSchema,
  UiRenderResponseSchema,
  SDKUiPressUiPressMessageSchema,
  UiPressResponseSchema,
  SDKUiClientModuleUiClientModuleMessageSchema,
  UiClientModuleResponseSchema,
  SDKUiClientPressUiClientPressMessageSchema,
  UiClientPressResponseSchema,
  SDKUiMessageUiMessageMessageSchema,
  UiMessageResponseSchema,
  SDKUiClientFaultUiClientFaultMessageSchema,
  UiClientFaultResponseSchema,
  SDKUiInputUiInputMessageSchema,
  UiInputResponseSchema,
  SDKUiSelectUiSelectMessageSchema,
  UiSelectResponseSchema,
  SDKUiPanesUiPanesMessageSchema,
  SDKUiPaneShowUiPaneShowMessageSchema,
  UiPaneShowResponseSchema,
  SDKUiPaneFocusUiPaneFocusMessageSchema,
  UiPaneFocusResponseSchema,
  SDKUiCloseUiCloseMessageSchema,
  UiCloseResponseSchema,
  SDKUiScrollUiScrollMessageSchema,
  UiScrollResponseSchema,
  SDKUiFocusUiFocusMessageSchema,
  UiFocusResponseSchema,
  SDKUiPromptEditUiPromptEditMessageSchema,
  UiPromptEditResponseSchema,
  SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema,
  UiPromptAutocompleteResponseSchema,
  SDKUiCopyUiCopyMessageSchema,
  UiCopyResponseSchema,
  SDKUiPromptReadUiPromptReadMessageSchema,
  UiPromptReadResponseSchema,
  SDKUiPromptFillUiPromptFillMessageSchema,
  UiPromptFillResponseSchema,
  SDKUiPromptPaintUiPromptPaintMessageSchema,
  UiPromptPaintResponseSchema,
  SDKUiPromptSuggestUiPromptSuggestMessageSchema,
  UiPromptSuggestResponseSchema,
  SDKUiReadSelectionUiReadSelectionMessageSchema,
  UiReadSelectionResponseSchema,
  SDKControlRequestInnerSchema,
} from "./uiControlSchemas.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { redactsOrPersists } from "../../cli/transportState.js";
import { getRemoteCaps, isRemoteControlChannelAvailable } from "../../remote/remoteMode.js";
import { logError } from "../../utils/log.js";
import { getControlRequestSubtype as getControlRequestSubtype_2 } from "../../bridge/controlRequests.js";
import { turnDispatchContinuationSchema, MAX_BATCHED_PROMPT_ID_CHARS } from "../../cli/print/turnDispatch.js";
import { CONTROL_REQUEST_SCHEMAS } from "../../remote/RemoteSessionManager.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { looseStringSchema } from "../../components/pluginUi/toastStack.js";
import { getContextCategoryKind } from "../../utils/analyzeContext.js";
import { wrapControlHandler } from "../../cli/print/dispatchControlRequest.js";
import { handleSetMaxThinkingTokens } from "../../cli/print/setMaxThinkingTokens.js";
import { READ_ONLY_CONTROL_COMMAND_NAMES } from "../../bridge/replBridgeControl.js";
import { createPermissionRequestMessage } from "../../utils/permissions/permissions.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:542616-646655 placement
/**
 * SDK 控制协议 schema 大段（一个 var 语句里约 70 个 lazy schema）：initialize、interrupt、can_use_tool、set_model、mcp_status、get_usage、cloud session、记忆/技能/Chrome/沙箱对话框、context usage、mcp_call、rewind_files 等请求与响应。首个绑定是 MCP JSON-RPC 消息占位 schema。
 */
var JSONRPCMessagePlaceholder; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SDKHookCallbackMatcherSchema;
var SDKInitializeInitializeMessageSchema;
var SDKFeedbackSurveyConfigSchema;
var SDKFeedbackTranscriptPolicySchema;
var SDKFeedbackSubmitModeSchema;
var SDKControlInitializeResponseSchema;
var SDKInterruptInterruptMessageSchema;
var SDKControlInterruptResponseSchema;
var SDKCanUseToolCanUseToolMessageSchema;
var SDKSetPermissionModeSetPermissionModeMessageSchema;
var SDKControlSetPermissionModeResponseSchema;
var SDKSetModelSetModelMessageSchema;
var SDKControlSetModelResponseSchema;
var SDKSetMaxThinkingTokensSetMaxThinkingTokensMessageSchema;
var SDKRenameSessionRenameSessionMessageSchema;
var SDKSetColorSetColorMessageSchema;
var SDKMcpStatusMcpStatusMessageSchema;
var SDKControlMcpStatusResponseSchema;
var SDKFileSuggestionsFileSuggestionsMessageSchema;
var SDKControlFileSuggestionsResponseSchema;
var SDKGetContextUsageGetContextUsageMessageSchema;
var SDKGetSessionCostGetSessionCostMessageSchema;
var SDKControlGetSessionCostResponseSchema;
var SDKListModelsListModelsMessageSchema;
var SDKControlListModelsResponseSchema;
var SDKGetUsageGetUsageMessageSchema;
var SDKUsageWindowSchema;
var SDKUsageAttributionItemSchema;
var SDKLocalWindowUsageSchema;
var SDKControlGetUsageResponseSchema;
var SDKGetStatusGetStatusMessageSchema;
var SDKStatusRowSchema;
var SDKControlGetStatusResponseSchema;
var SDKExportConversationExportConversationMessageSchema;
var SDKControlExportConversationResponseSchema;
var SDKCloudSessionUnavailableSchema;
var SDKListCloudSessionsListCloudSessionsMessageSchema;
var SDKControlListCloudSessionsResponseSchema;
var SDKGetCloudSessionGetCloudSessionMessageSchema;
var SDKControlGetCloudSessionResponseSchema;
var SDKGetCloudSessionTranscriptGetCloudSessionTranscriptMessageSchema;
var SDKControlGetCloudSessionTranscriptResponseSchema;
var SDKGetMemoryDialogGetMemoryDialogMessageSchema;
var SDKMemoryDialogFileSchema;
var SDKMemoryDialogFolderSchema;
var SDKMemoryEntrySchema;
var SDKControlGetMemoryDialogResponseSchema;
var SDKGetSkillsDialogGetSkillsDialogMessageSchema;
var SDKSkillsDialogRowSchema;
var SDKControlGetSkillsDialogResponseSchema;
var SDKGetChromeDialogGetChromeDialogMessageSchema;
var SDKControlGetChromeDialogResponseSchema;
var SDKGetChromeBrowsersGetChromeBrowsersMessageSchema;
var SDKControlGetChromeBrowsersResponseSchema;
var SDKSelectChromeBrowserSelectChromeBrowserMessageSchema;
var SDKControlSelectChromeBrowserResponseSchema;
var SDKGetSandboxDialogGetSandboxDialogMessageSchema;
var SDKControlGetSandboxDialogResponseSchema;
var SDKGetBinaryVersionGetBinaryVersionMessageSchema;
var SDKControlGetBinaryVersionResponseSchema;
var SDKContextUsageCategorySchema;
var SDKContextUsageGridSquareSchema;
var SDKControlGetContextUsageStrictResponseSchema;
var SDKMcpCallMcpCallMessageSchema;
deferInit("chunk-7kayq7nc.js:542616", () => {
  JSONRPCMessagePlaceholder = DoctorLazy(() =>
    unknown().describe(
      "A JSON-RPC 2.0 message as defined by the Model Context Protocol (request, notification, or response object).",
    ),
  );
  SDKHookCallbackMatcherSchema = DoctorLazy(() =>
    objectSchema({
      matcher: stringSchema().optional(),
      hookCallbackIds: array(stringSchema()).describe(
        "Opaque ids chosen by the client, one per hook function it registered for this matcher. When the hook fires the CLI sends a hook_callback control request carrying one of these ids as callback_id; the client maps it back to its function.",
      ),
      timeout: numberSchema().optional(),
      onFailure: hookFailureModeSchema().describe(
        "What a failure of these callbacks does: the client answered the hook_callback request with an error, or with an answer that fails validation. 'continue' (default): the failure is reported and the action goes ahead. 'block': the failure counts as a block, as it does for a command hook, so the action the event guards (a tool call, a permission request, a prompt) is blocked. Ignored on Stop, SubagentStop, TaskCompleted and TeammateIdle.",
      ),
    }).describe("Configuration for matching and routing hook callbacks."),
  );
  SDKInitializeInitializeMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("initialize"),
      hooks: record(HookEventNameSchema(), array(SDKHookCallbackMatcherSchema())).optional(),
      sdkMcpServers: array(stringSchema()).optional(),
      sdkMcpServerConfigs: record(
        stringSchema(),
        SDKSdkMessageSchema().omit({
          type: true,
          name: true,
        }),
      )
        .optional()
        .describe(
          "Settings for the SDK-hosted MCP servers named in sdkMcpServers, keyed by server name. Sent as a separate field so a CLI that predates it ignores it; entries whose name is not in sdkMcpServers, and values that do not match this shape, are ignored rather than rejected. timeout, disableAutoBackground and connectorId apply when the server is first registered; tools (the per-tool permission policy) adds its ask and deny rules on every initialize that names the server. An initialize never removes a rule; mcp_set_servers replaces them.",
        ),
      sdkMcpServerManifests: record(
        stringSchema(),
        objectSchema({
          initializeResult: record(stringSchema(), unknown()).describe(
            "The server's verbatim JSON-RPC `initialize` result object (protocolVersion, capabilities, serverInfo, instructions, ...), exactly as the in-process server produced it when the host initialized it with no client capabilities \u2014 not re-serialized or schema-parsed by the host.",
          ),
          toolsListResult: record(stringSchema(), unknown())
            .optional()
            .describe(
              "The server's verbatim JSON-RPC `tools/list` result object. Omit when the initialize result does not advertise the tools capability, when the listing is paginated (nextCursor present), or when it could not be captured \u2014 the CLI then lists over the control channel as before.",
            ),
        }),
      )
        .optional()
        .describe(
          "Optional, keyed by sdk server name (each key should also appear in sdkMcpServers; other keys are ignored). Unlike sdkMcpServerConfigs \u2014 host-declared settings the CLI keeps for the server's lifetime, same shape inline on mcp_set_servers \u2014 this is a one-shot cache of the servers' own handshake output: sent on initialize only, consumed by the connect that follows it, never retained. MCP handshake results the host already obtained from its in-process servers by delivering initialize + notifications/initialized (+ tools/list) to them itself before writing this request. For each such server the CLI answers its own MCP client's initialize and first tools/list from these results and skips the notifications/initialized round trip, so registering N in-process servers costs no mcp_message control round trips before the first turn; tools/call and everything after the handshake still flow as mcp_message exactly as before. The host MUST keep answering mcp_message for every server as if this field were absent: a CLI that predates the field ignores it and performs the full per-server handshake over the control channel, and a newer CLI does the same for any server whose entry is missing or malformed, whose initializeResult.protocolVersion differs from the MCP protocol version the CLI's client requests, or that the CLI had already connected. Entries apply only to the connect that follows this initialize; they are never retained for later reconnects. Over a remote session transport the CLI uses the field only when sdkMcpServerManifestsOrigin is set (see that field); a host on the CLI's own stream-json stdio transport needs no marker. sdk_mcp_manifests_parked in the response reports what became of each entry. Absent (older hosts, the Python SDK, browser clients): unchanged behaviour.",
        ),
      sdkMcpServerManifestsOrigin: _enum(["host_per_send"])
        .optional()
        .describe(
          "The host's statement that it composed this request's sdkMcpServerManifests for this very send, from its servers' current state. Needed only by a host that reaches the CLI over a remote session transport, where an unmarked sdkMcpServerManifests is not used (a recorded registration could be handed to a later worker). The CLI also refuses a marked manifest whose session-stream frame is more than five minutes old, so capture the manifests when writing the request, not earlier; and it may still decline them when remote manifests are switched off in that CLI, or on any session where the session service has not told the CLI in the last five minutes that only the account owning the session can send events to it. sdk_mcp_manifests_parked in the response says what became of each entry. A value this CLI does not know counts as no marker. A host on the CLI's own stream-json stdio transport may omit this field; a host writing to the stdin of a remote-session worker cannot use manifests at all.",
        ),
      jsonSchema: record(stringSchema(), unknown()).optional(),
      systemPrompt: array(stringSchema()).optional(),
      appendSystemPrompt: stringSchema().optional(),
      systemPromptSnapshot: booleanSchema()
        .optional()
        .describe(
          "Record the conversation's system prompt once and reuse it verbatim on every later request and resume. Omitted or true (the default): the prompt is rendered on the first request, systemPrompt or appendSystemPrompt included, and the record is sent as-is afterwards \u2014 even when a later launch passes different text \u2014 until compaction. false: never record; the prompt is rendered fresh every request. No effect where system-prompt recording is not yet enabled.",
        ),
      planModeInstructions: stringSchema()
        .optional()
        .describe(
          "Custom workflow body for the plan-mode system reminder. Replaces the default code-implementation phases; the CLI still wraps it with the read-only enforcement preamble and the ExitPlanMode protocol footer.",
        ),
      appendSubagentSystemPrompt: stringSchema()
        .optional()
        .describe(
          "@internal Additional system prompt appended to every Task-tool subagent (and propagated to nested subagents). Gated by CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT.",
        ),
      toolAliases: record(stringSchema(), stringSchema())
        .optional()
        .describe(
          "Map of tool-name aliases applied before name resolution. When the model emits a tool_use whose name is a key in this map, the tool execution path resolves the mapped name instead. Single-hop (no chains). See Options.toolAliases.",
        ),
      codeRunningMcpTools: record(stringSchema(), array(stringSchema()))
        .optional()
        .describe(
          "@internal MCP tools that run code the model writes, keyed by server name as registered, each with its tool names. In auto mode no allow rule, skill, hook or plugin approves a call to one on its own: the classifier judges it, unless set_mcp_permission_mode_override pins its server to default. Declaring any also stops every PermissionRequest hook allow from changing the permission mode (its setMode update is dropped). Give names without the mcp__ prefix: a server or tool name that starts with mcp__ is skipped as malformed. Read from the first initialize only; its response lists what was declared in code_running_mcp_tools_applied. See Options.codeRunningMcpTools.",
        ),
      excludeDynamicSections: booleanSchema()
        .optional()
        .describe(
          "When true, omit per-user dynamic sections (working directory, auto-memory path) from the cached system prompt and re-inject them as the first user message. Lets cross-user prompt caching hit on a static system prompt prefix. Tradeoff: the model sees this context slightly later in the prompt, so steering on the working directory and memory location is marginally less authoritative. Has no effect when a custom (non-preset) system prompt is in use.",
        ),
      agents: record(stringSchema(), SubagentDefinitionSchema()).optional(),
      title: stringSchema()
        .optional()
        .describe(
          "Custom session title. When provided, the session uses this title and skips automatic title generation. Has no effect on the persisted title when resuming an existing session.",
        ),
      skills: array(stringSchema())
        .optional()
        .describe(
          'When provided, only skills whose names match an entry are loaded into the main session system prompt, matching the exact canonical name (e.g. "my-plugin:my-skill") or a ":name" suffix of it. Display names and aliases do not match. Omit to load every discovered skill. Applies to the main session only; subagents use AgentDefinition.skills, which additionally resolves display names and aliases.',
        ),
      webSearchIsolationExemptMcpServers: array(stringSchema())
        .optional()
        .describe(
          "@internal Additional MCP server names exempt from the web search / connector isolation latch. Unioned with the built-in infra-server list.",
        ),
      promptSuggestions: booleanSchema().optional(),
      agentProgressSummaries: booleanSchema().optional(),
      forwardSubagentText: booleanSchema().optional(),
      supportedDialogKinds: array(stringSchema())
        .optional()
        .describe(
          "Dialog kinds (request_user_dialog `dialog_kind` values) this consumer's onUserDialog can actually render. The CLI treats ABSENCE as 'cannot display' and fails closed: without the kind declared here, a dialog-gated flow degrades to its no-dialog behavior (for 'refusal_fallback_prompt', the classic refusal error) instead of parking a dialog the consumer may mishandle. First-attached-client-wins on multi-client sessions; later initializes do not change it.",
        ),
      rendersChromeSetupOffer: booleanSchema()
        .optional()
        .describe(
          "@internal A client capability: this consumer renders the OfferChromeSetup tool's permission request as a Claude in Chrome setup card and answers it with updatedInput.outcome 'connected' or 'not_now'. It lets that tool join the tool list once a Claude in Chrome tool call has reported the browser extension is not connected and the session's experiment flag is on. On, never off: a later initialize may be another client's; absence leaves it as it was. Kept across worker restarts.",
        ),
      perTaskStopAffordance: booleanSchema()
        .optional()
        .describe(
          "Declares that this consumer renders a per-task stop control wired to the `stop_task` control request, so the user can stop an individual background task. When declared, an interrupt on an open-input (interactive stream-json) session spares running background agents/workflows (Stop only aborts the turn). Closed-input exception: a one-shot run (string prompt / -p closes stdin) still kills hold-back tasks at the held-result release regardless of the declaration \u2014 with stdin closed, a stop_task control could never be delivered, so the fail-closed kill stands. ABSENCE also fails closed: the interrupt kills background tasks, since the user would otherwise have no way to stop a runaway one. First-attached-client-wins on multi-client sessions; later initializes do not change it.",
        ),
      forwardNestedSubagentToolCalls: booleanSchema()
        .optional()
        .describe(
          "@internal Asks Claude Code to also send the tool_use and tool_result messages of sub-agents that other sub-agents start, and of skills a sub-agent forks, each with `parent_tool_use_id` set to the call that started it. That call is itself a tool_use in the messages of the parent sub-agent, so a consumer can place every sub-agent under the one that started it and list its tool calls. Their text and thinking stay unsent unless `forwardSubagentText` is set, which already sends all of it. ABSENCE sends none of them, as before. First-attached-client-wins on multi-client sessions; later initializes do not change it.",
        ),
      rapidFollowupPreempt: booleanSchema()
        .optional()
        .describe(
          "@internal Declares that this consumer renders the `system/turn_preempted` frame and expects Claude Code to stop a turn on its own: when a person's follow-up message arrives while the running turn has shown nothing yet, the turn is stopped as an interrupt would stop it (its messages get `command_lifecycle` 'cancelled' and its result is an aborted one) and the follow-up runs next, announced by `turn_preempted`. Honored only while the rollout flag is on. ABSENCE fails closed: the follow-up waits its turn exactly as before, because a consumer that does not know the frame would see a message it never withdrew reported cancelled. Messages arriving over the Remote Control bridge never stop a turn, whatever was declared here. First-attached-client-wins on multi-client sessions; later initializes do not change it.",
        ),
      plugins: array(SDKLocalMessageSchema())
        .optional()
        .describe(
          "Plugins to load for the session, in the same shape as the SDK `plugins` option: the stdin form of one --plugin-dir flag per entry (--plugin-dir-no-mcp when skipMcpDiscovery is set), so the launch command line does not grow with the plugin count. Loaded only by a CLI launched with --await-initialize, which reads this request during startup before any plugin work. Without that flag, on a repeated initialize, or over a remote session transport the field loads nothing; plugins_applied in the response reports whether the listed plugins are in fact loaded.",
        ),
      workspaceTrust: objectSchema({
        accepted: booleanSchema().describe(
          "Only send true after showing the user a trust dialog for `directory` \u2014 the same attestation set_cwd carries as trust_accepted.",
        ),
        directory: stringSchema().describe(
          "Absolute path of the directory the user accepted, as it exists on the machine the CLI runs on. Honored only when it resolves to the trust key of the session working directory (the canonical git root when inside a repository, so a repository root and its linked worktrees agree); a network or obfuscated spelling, a path that is not a directory here, or one that resolves elsewhere records nothing. The grant covers that whole repository, exactly as the terminal trust dialog and set_cwd do, so a host whose folder sits inside a repository should name the repository root in its dialog.",
        ),
      })
        .optional()
        .describe(
          "@internal Host attestation that the user explicitly accepted a trust dialog for the session's working directory before launching it \u2014 the launch-time twin of set_cwd's trust_accepted/trusted_directory, for hosts whose dialog runs before the CLI is spawned and possibly on another machine than the ~/.claude.json this process reads (Claude Desktop's Code tab over SSH or WSL). Honored once, on the session's first initialize from the process that owns the CLI's stdin: the CLI records the working directory as trusted in the same store the interactive trust dialog writes (the home directory is trusted for the session only and never persisted), so the persisted-trust gates read the same answer they do in a checkout the user trusted at a terminal \u2014 project permission rules and hooks re-derive in the running process, the open-change announcement that follows this initialize already sees it, and readers evaluated at launch (project .mcp.json approval, project plugins, agent-frontmatter hooks and MCP servers) see it from the next launch on. A re-sent initialize, one arriving over a remote session transport, or one sent to a parked spare (--await-claim; send workspace_trust with claim_session instead) records nothing. workspace_trust_recorded in the response reports the outcome.",
        ),
      attachServeRequest: objectSchema({
        workId: stringSchema(),
        environmentId: stringSchema(),
      })
        .optional()
        .describe(
          "@internal Claude Desktop's serve-only helper launch (`--attach-serve`) only: the tool-use work item the helper was started for and the served folder's environment id, exactly as the host polled them. Read from the opening `initialize` on the helper's own stdin and nowhere else; the helper signs its link to the session over both. Every other launch ignores it.",
        ),
    }).describe("Initializes the SDK session with hooks, MCP servers, and agent configuration."),
  );
  SDKFeedbackSurveyConfigSchema = DoctorLazy(() =>
    objectSchema({
      minTimeBeforeFeedbackMs: numberSchema(),
      minTimeBetweenFeedbackMs: numberSchema(),
      minTimeBetweenGlobalFeedbackMs: numberSchema(),
      minUserTurnsBeforeFeedback: numberSchema(),
      minUserTurnsBetweenFeedback: numberSchema(),
      hideThanksAfterMs: numberSchema(),
      onForModels: array(stringSchema()),
      probability: numberSchema(),
      lastSurveyShownTime: numberSchema().nullable(),
    }).describe(
      "@internal Session feedback-survey configuration for host UIs (VS Code webview, Claude Desktop) that run the survey trigger logic themselves: the same GrowthBook-driven pacing/probability values the terminal survey uses, plus the cross-surface last-shown time the host can't read. Survey responses are proxied back as tengu_feedback_survey_event log_event notifications.",
    ),
  );
  SDKFeedbackTranscriptPolicySchema = DoctorLazy(() =>
    objectSchema({
      transcript_allowed: booleanSchema().describe(
        "Whether the box may send this sign-in's session transcript, and so may open: true for Pro and Max only. Read at session start.",
      ),
      logs_followup: booleanSchema()
        .optional()
        .describe(
          "Whether this CLI logs the followup_* survey events a host sends it. Absent means no: it would log them with no event type, so the host must not send them.",
        ),
      every_rating: booleanSchema().describe(
        "Whether VS Code opens this box in place of its own, which follows Bad only and is sent with submit_feedback. Never true unless transcript_allowed is, nor for a desktop session. VS Code keeps its own box where reports are saved on the user's computer rather than sent.",
      ),
    }).describe(
      "@internal For the session survey's follow-up box that opens after every rating: an optional note, sent with the session transcript by submit_survey_feedback. Its presence also says the CLI answers that request.",
    ),
  );
  SDKFeedbackSubmitModeSchema = DoctorLazy(() =>
    objectSchema({
      kind: _enum(["post", "bundle", "share", "disabled"]).describe(
        "How a submit_feedback report from this session is handled: 'post' sends it to Anthropic; 'bundle' writes it, redacted, to a zip on this machine for the user to pass on (a third-party provider or gateway, or no Anthropic credentials) and the response carries its path; 'share' is the internal-build upload; 'disabled' refuses it for a static cause (an environment variable or the nonessential-traffic setting). An org-policy refusal is not reported here: it is read late and can flip, and the per-turn system/init product_feedback_disabled carries it.",
      ),
    }).describe(
      "@internal The resolved feedback mode (getFeedbackMode) for host UIs that offer a feedback dialog, so they can say up front that a report is refused or saved on this machine, instead of learning either only after the user has written and sent it.",
    ),
  );
  SDKControlInitializeResponseSchema = DoctorLazy(() =>
    objectSchema({
      commands: array(SkillCommandSchema()),
      agents: array(AgentDefinitionSchema()),
      output_style: stringSchema(),
      available_output_styles: array(stringSchema()),
      user_output_styles_dir: stringSchema()
        .optional()
        .describe(
          "@internal Absolute path of the user-level output-styles directory this CLI lists styles from: the output-styles folder of the config home as the CLI resolves it after the settings env blocks are applied, so a CLAUDE_CONFIG_DIR set in user or managed settings is honored. A host that writes a user-level style file writes it here; absent on older CLIs, where the host falls back to its own reading of CLAUDE_CONFIG_DIR.",
        ),
      models: array(ModelOptionSchema()),
      unavailable_models: array(ModelOptionSchema())
        .optional()
        .describe(
          "@internal Models the account can see but not select (disabled: true, reason folded into description \u2014 e.g. a model the org's Zero Data Retention setting excludes). Disjoint from `models`, which stays selectable-only so consumers without disabled rendering are unaffected. Populated only for allowlisted 1P hosts that render these rows (currently the VS Code extension \u2014 UNAVAILABLE_MODELS_HOST_ENTRYPOINTS); empty for every other consumer. Omitted when empty.",
        ),
      account: AccountInfoSchema(),
      current_model: stringSchema()
        .optional()
        .describe(
          "@internal The CLI's active model at connect time. Remote Control clients (web/mobile) sync their model dropdown TO this value on connect instead of sending set_model with their own default \u2014 without it, connecting from a phone silently switches the terminal's model (CC-2659).",
        ),
      current_permission_mode: PermissionModeSchema()
        .optional()
        .describe(
          "@internal The CLI's active permission mode at connect time, for the same connect-time sync as current_model.",
        ),
      inbound_read_receipts: booleanSchema()
        .optional()
        .describe(
          "@internal Remote Control hosts only: true when this host reports a client message read when it leaves the command queue for a turn \u2014 the message's `processing` delivery status \u2014 and finished when the turn ends (`processed`). Absent (an older CLI, or a host that acks at receipt): a delivery status means the host received the message, not that it read it. Read per initialize; the kill switch can turn it off for a session already answered.",
        ),
      session_state: _enum(["idle", "running", "requires_action"])
        .optional()
        .describe(
          "@internal Session state at connect time (same values as the session_state_changed message). Lets a host that attaches to an already-running CLI tell whether a turn is in progress without having seen the transition. Absent (older CLI) \u2192 unknown.",
        ),
      hooks_applied: booleanSchema()
        .optional()
        .describe(
          "Whether the `hooks` this initialize carried were registered: true on a session's first initialize, and on a repeated initialize from the process that owns the CLI's stdin (its set replaces the one registered earlier); false when a repeated initialize's hooks were ignored (a client joining a remote session another client configured). Absent when the request carried no hooks, and on CLIs that predate the field \u2014 those ignored `hooks` on every repeated initialize.",
        ),
      hook_on_failure_supported: booleanSchema()
        .optional()
        .describe(
          'True on every initialize reply from a CLI that honors `onFailure` on hook matchers. Absent on CLIs that predate the option, which ignore it (a failed callback set to "block" lets the action run), and from responders that do not run the host\'s hooks. A host that sets "block" must not go on without it; the TypeScript SDK refuses the session. It says nothing of this request\'s hooks: `hooks_applied` does, and the TypeScript SDK also refuses a first initialize that reads `hooks_applied: false` when a matcher sets "block".',
        ),
      code_running_mcp_tools_applied: record(stringSchema(), array(stringSchema()))
        .optional()
        .describe(
          "@internal The MCP tools the first initialize's codeRunningMcpTools declared, keyed by server name with tool names as sent, each once. Names are not checked against the registered servers, so a misspelled one is listed but covers nothing. Malformed entries, and servers left with no tool, are omitted. Absent when that initialize carried no codeRunningMcpTools, on a repeated initialize, and on older CLIs: treat a tool as declared only when it is listed here.",
        ),
      plugins_applied: booleanSchema()
        .optional()
        .describe(
          "Whether every plugin this initialize listed is loaded: true when each one is among the plugins the process loaded at launch (from `plugins` under --await-initialize, or from --plugin-dir), so a re-sent initialize naming the launch set also reads true; false otherwise. The `plugins` field never loads anything after launch. Absent when the request listed no plugins, and on CLIs that predate the field (those never read `plugins`).",
        ),
      host_worded_asks: booleanSchema()
        .optional()
        .describe(
          "@internal Desktop host only: true when this session reads permissionDisplay on a PreToolUse hook's ask (coreSchemas.ts HookPermissionDisplaySchema) and sends its asks to the host as can_use_tool requests. Absent otherwise. Send permissionDisplay only when this is true, and check each can_use_tool request for the words: the CLI may send an ask without them.",
        ),
      workspace_trust_recorded: booleanSchema()
        .optional()
        .describe(
          "@internal Outcome of this initialize's `workspaceTrust` attestation: true when the attested directory resolved to the session working directory's trust key and that key is now persisted as trusted (or already was); false when nothing durable was recorded \u2014 the directory was a network or obfuscated spelling, is not a directory on this machine, resolved to another key, the grant could not be written durably, or the working directory is the home directory (trusted for this session only); false too, whatever is already persisted, when the directory, the working directory or that key carries an invisible or format character (refused as set_cwd refuses such a spelling). Absent when the request carried no accepted attestation, on a repeated or remote-transport initialize, on a parked spare's initialize (--await-claim), and on CLIs that predate the field.",
        ),
      sdk_mcp_manifests_parked: record(
        stringSchema(),
        _enum(["parked", "already_connected", "protocol_version_mismatch", "malformed", "not_honoured"]),
      )
        .optional()
        .describe(
          "What became of each entry of this initialize's sdkMcpServerManifests, keyed by sdk server name, for the entries whose name is in sdkMcpServers. 'parked': kept for the connect that follows this reply, which answers the server's MCP initialize and first tools/list from it (a later failure to replay shows up as live mcp_message frames, as when no entry was sent). 'already_connected': this CLI already had a live client for the server. 'protocol_version_mismatch': initializeResult.protocolVersion is not the version this CLI's client requests. 'malformed': the entry is not of the documented shape, reported whether or not manifests were honoured (every name in sdkMcpServers gets this when the field itself is not an object); or an honoured entry is past the limits this CLI sets on a live answer. 'not_honoured': the CLI did not use the entry: manifests or remote manifests are switched off in this CLI, the session service has not told this remote-session worker in the last five minutes that only the account owning the session can send events to it, or the request reached such a worker other than over its session stream (nothing for the host to change in any of these cases); or this CLI had read as many tool lists as it allows in a minute (send it again later); or it came over the session stream without sdkMcpServerManifestsOrigin or on a frame too old to trust (the host's to fix). Absent when the request carried no sdkMcpServerManifests or named no sdkMcpServers, and on CLIs that predate the field.",
        ),
      permission_mode_from_default_fallback: booleanSchema()
        .optional()
        .describe(
          '@internal True when current_permission_mode is auto because no settings source configured a mode and the gated auto default applied. IDE hosts only; drives the one-time "auto mode is now the default" disclosure.',
        ),
      auto_default_nudge: PermissionModeSchema()
        .optional()
        .describe(
          "@internal The user-settings defaultMode the one-shot auto-default nudge should offer to replace with auto. IDE hosts only; absent when the user isn't eligible.",
        ),
      pid: numberSchema().optional().describe("@internal CLI process PID for tmux socket isolation"),
      claude_code_version: stringSchema()
        .optional()
        .describe(
          "Claude Code version of the process that runs this session's turns (the same value its system/init carries). Absent on CLIs that predate the field, and when the responder is not that process and does not know its version.",
        ),
      fast_mode_state: FastModeStateSchema().optional(),
      fast_mode_disabled_reason: FastModeBlockedReasonSchema().optional(),
      footer_indicator: FooterIndicatorSchema()
        .optional()
        .describe(
          `@internal The terminal's configured "\u25C6 <text>" footer pill at connect time \u2014 see SDKFooterIndicator. Absent when nothing is configured.`,
        ),
      feedback_survey_config: SDKFeedbackSurveyConfigSchema()
        .optional()
        .describe(
          "@internal Present only when the feedback-survey surface is enabled for this host (GrowthBook gate, privacy level, and org policy all allow it). Absent means the host must not show the survey.",
        ),
      survey_followup_box: SDKFeedbackTranscriptPolicySchema()
        .optional()
        .describe(
          "@internal Sent to each session a VS Code or desktop host starts itself (not a nested child session), even when feedback_survey_config is absent. Absent on CLIs without submit_survey_feedback.",
        ),
      feedback_mode: SDKFeedbackSubmitModeSchema()
        .optional()
        .describe(
          "@internal How this session handles a submit_feedback report (see SDKFeedbackMode), read once at init like the other host gates here; the org-policy half of 'disabled' stays on the per-turn system/init product_feedback_disabled boolean. Absent on an older CLI, and when the only refusal is the org policy \u2192 the host behaves as it does without the field.",
        ),
      analytics_disabled: booleanSchema()
        .optional()
        .describe(
          "@internal True when the CLI has analytics/telemetry disabled for this session (privacy level, DISABLE_TELEMETRY / DO_NOT_TRACK from any settings tier, third-party provider, gateway) \u2014 the same verdict the system/init message carries. IDE hosts fold it into the gate for their own direct telemetry. Absent (older CLI) \u2192 unknown.",
        ),
      remote_control_auto_enable: booleanSchema()
        .optional()
        .describe(
          "@internal Whether the CLI resolver says Remote Control should auto-enable at session start (explicit setting \u2192 policy default \u2192 GB rollout), so IDE hosts can mirror TUI behavior. Absent (older CLI) \u2192 treat as false.",
        ),
      remote_control_auto_on_by_default: booleanSchema()
        .optional()
        .describe(
          "@internal True when remote_control_auto_enable is true because of the org/GB default rather than an explicit remoteControlAtStartup setting \u2014 mirrors replBridgeAutoOnByDefault so IDE hosts can render the same disclosure notice.",
        ),
      remote_control_auto_connect_default: booleanSchema()
        .optional()
        .describe(
          '@internal The org/GB auto-connect default alone (getCcrAutoConnectDefault, under the same remote-environment guard as remote_control_auto_enable), with every explicit copy of remoteControlAtStartup left out. IDE hosts show it for their toggle only once they have seen the settings key cleared while the session runs (/config "default" clears the legacy ~/.claude.json copy in the same step); at rest they show remote_control_auto_enable. Absent (older CLI) \u2192 hosts keep their previous display behavior.',
        ),
      claude_in_chrome_at_startup: booleanSchema()
        .optional()
        .describe(
          `@internal Whether an IDE host that connects Claude in Chrome itself should connect it when the session starts. True when the "Enabled by default" setting (claudeInChromeDefaultEnabled) is on, this session did not connect the server itself, and the gates the terminal applies to the setting at startup pass (claudeInChromeDefaultForHost). Sent only to a host that owns the session's startup (isVscodeHostOwnedStartupSession). Absent (older CLI, other hosts) \u2192 treat as false.`,
        ),
      claude_in_chrome_prompt_disabled: literal(true)
        .optional()
        .describe(
          "@internal Present, and true, when CLAUDE_CODE_DISABLE_CFC_PROMPT is set to a true value for this process: Claude Code leaves its own Claude in Chrome guidance out (the system-prompt section and the bundled skill), and a host that adds that guidance to messages itself (the VS Code extension's browser instructions) leaves it out too. The browser tools are unaffected. Absent (variable unset or false, older CLI): treat as false \u2014 the host adds its guidance.",
        ),
      remote_control_available: booleanSchema()
        .optional()
        .describe(
          "@internal Whether Remote Control can be offered at all in this deployment (isRemoteControlDeploymentAvailable: not hard-disabled by managed settings, not nested in a remote environment, first-party provider). Only host-lifetime-stable conditions; transient ones (auth state, the GrowthBook rollout gate, the async org-compliance verdict) are deliberately excluded since hosts latch this from one initialize response \u2014 see the helper docstring. Lets IDE hosts hide their Remote Control affordance where it can never work. Absent (older CLI) \u2192 treat as available.",
        ),
      ide_rc_auto_enable_gate: booleanSchema()
        .optional()
        .describe(
          "@internal IDE-side rollout kill-switch for RC auto-enable (tengu_ide_rc_auto_enable), independent of remote_control_auto_enable. Carried on the init response (not experimentGates) because the host reads it at init time, before the first-prompt-triggered gate refresh. Absent (older CLI) \u2192 treat as false.",
        ),
      capabilities: array(stringSchema())
        .optional()
        .describe(
          "@internal Members of system/init.capabilities that are already settled at connect time, said here so a host need not wait for the first turn to read them. The same literals under the same conditions; a subset, so a member missing here may still arrive on init. Absent when there is none to say, and on older CLIs.",
        ),
    }).describe("Response from session initialization with available commands, models, and account info."),
  );
  SDKInterruptInterruptMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("interrupt"),
      reason: stringSchema()
        .optional()
        .describe(
          "@internal Why the turn was interrupted, forwarded to the turn's AbortSignal.reason. Tool implementations branch on it to distinguish a user-driven cancel (which suppresses error output) from other aborts. Known values: `interrupt` (user Esc/Ctrl+C), `user-cancel`, `remote-cancel`, `consumer-error`, `workflow-abort`, `stalled`, `recovery-timeout`. Open set \u2014 consumers must treat unknown values as a generic abort.",
        ),
      cancel_queued: booleanSchema()
        .optional()
        .describe(
          "When true, the interrupt also cancels every uuid-stamped main-thread command still in the queue or already dequeued for the imminent turn but not yet reachable by the abort (the first-command prewait window) \u2014 the same set the response would otherwise list under `still_queued`. Each is closed with a terminal 'cancelled' lifecycle and listed on the response's `cancelled` field. `still_queued` is then empty, except that a client driving a hosted session lists there what it can no longer recall (a send already in flight to that session, or the first prompt the session was created with) and, when the session's own sweep then cancels one of those or a send it had already delivered, follows up with a command_lifecycle 'cancelled' frame for it. (The isFoldInFlight guard cancel_async_message uses does not apply here: this request also aborts the running turn, so a fold-in-flight uuid is never delivered and is swept with the rest. A fold-in-flight uuid's queued_command attachment may already appear in the aborted turn's transcript if the abort landed after the fold's attachment yield \u2014 pre-existing leave-queued semantics; it never runs as its own turn.) Uuid-less commands (task notifications) still in the queue are also dequeued but cannot be listed; a uuid-less command already in the prewait window is unreachable by either cancel leg \u2014 the first-command prewait latch covers it (this request latches exactly like a plain interrupt; see still_queued): its turn starts aborted. When false or absent, queued commands survive the interrupt and are listed under `still_queued` \u2014 the interrupt_receipt_v1 contract is unchanged. A Stop-means-stop-everything client (a remote UI's Stop button) sets this true so one round-trip halts the session; a wrapper that wants per-uuid control leaves it false and follows up with cancel_async_message. Advertised by the `interrupt_cancel_queued_v1` capability on system/init; older CLIs ignore the field and behave as if false.",
        ),
      send_now: booleanSchema()
        .optional()
        .describe(
          "@internal True when the request is a client's Send now on a message that is waiting, not its Stop: it asks that the waiting messages reach the model now, as the terminal's send-now key does. It is not a Stop: it makes no later turn start aborted, cancels nothing that is queued, and ends no background task, subscription or other thing outside the running turn that a Stop ends. What it does depends on what the CLI holds when it reads the request, and the response's send_now says which. Without message_uuid every waiting user message counts, which may be another than the one pressed. With no user message waiting at the CLI it does nothing: a message the running turn has already taken in, or was started for, is being answered. With one waiting that is not in the queue yet (received and still being admitted, or already taken for the next turn), that the running turn is taking in at that moment, or with no turn under way, it also does nothing: the message runs when its place comes. With a person's message in the queue behind a turn under way, the CLI chooses how that turn makes way: it moves what the turn waits on to the background so that the turn takes the message in (and, if that fails, stops the turn later as a priority 'now' message does, without a marker); over a turn that is compacting the conversation by itself, it first lets the compaction end, so that the summary is kept, and then moves what the turn waits on, or stops the turn at its next model request as a priority 'now' message does, without a marker; or it aborts that turn at once as a plain interrupt does (running tools are ended, the interruption marker is written, the result is an error_during_execution); what was queued ahead of the message still runs before it. Either way a sender learns that the turn has ended from the turn's result, not from this response. The message must already be at the CLI, or the request finds nothing waiting: a sender that still holds it delivers it first, or sends it with priority 'now', or sends a plain interrupt instead. Only the boolean true counts, and with cancel_queued:true the request is a Stop. Advertised by interrupt_send_now_v1 on system/init; a CLI without it handles the request as a plain interrupt.",
        ),
      message_uuid: stringSchema()
        .optional()
        .describe(
          "@internal Read only beside send_now:true: the uuid of the user message that Send now was pressed on, in the very form in which that message reached the CLI (a session service may deliver it in lower case): it is compared as an exact string, as cancel_async_message compares. With it only that message counts as waiting. If the running turn has already taken it in or was started for it, or the CLI does not know it or does not count it as a person's, the request does nothing and answers 'nothing_waiting', whatever else waits. Once the request acts, it acts as without the name: everything queued decides between the move to the background and the abort, and goes along with the named message. An empty string is read as no name, and so is a null, which this schema does not admit but an encoder may write; any other value that is no string names nothing.",
        ),
      for_user_message_uuids: array(stringSchema())
        .optional()
        .describe(
          "@internal One to eight uuids (case ignored) of user messages whose turn this Stop is for; any other value is read as absent. The current turn is the latest one dequeued for a client's message (it may be over, or not yet started), with every turn started and message taken in since. A Stop that names one of its messages is handled as a plain interrupt (if latched, see still_queued, only for pending work that it names or that answers no client's message), and so is any Stop while the CLI knows of no current turn. Other Stops do nothing and get turn: 'spared', except a few that name work that is queued or, on claude -p, read and not yet queued (sparesCurrentTurn). Always include the message that opened the turn (user_message_uuid on its first frames, before any re-run): after a restart the CLI knows no other. A turn handed over by turn_handoff has no name: any Stop may stop it, so send a plain one. The uuids are only compared: never stored, logged, sent back or shown to the model. Not read beside cancel_queued:true or send_now:true, nor by older CLIs, which answer without turn.",
        ),
      worker_epoch: numberSchema()
        .int()
        .min(1)
        .optional()
        .describe(
          "@internal The worker life (system/init's worker_epoch) that this interrupt is for, as a JSON number. Written only on an interrupt that a service sends by itself and that must not outlive the worker it was meant for. Never written on a person's Stop, not even as a null or a 0 for 'unset': a Stop must hold across a restart. Read by a claude-code-server tenant alone, before every other member and whatever they say. A worker of another life takes none of an interrupt's steps (it still counts as a person's presence, as every interrupt does), marks the request processed, so that no later worker is served it, and answers with a stale_worker_epoch error; take the new number from the next system/init, not from the error's text. Any other value that is present (a null, a 0, a fraction, a string such as '7') is refused the same way with an invalid_worker_epoch error, never read as absent. Both errors carry the token as error_code and list no still_queued: they are no receipt. The worker of the stated life, every other host that handles an interrupt, and an older tenant handle the request as if the member were absent, and no capability says which a worker is; a client that relays its host's Stop to a hosted session drops the member.",
        ),
    }).describe("Interrupts the currently running conversation turn."),
  );
  SDKControlInterruptResponseSchema = DoctorLazy(() =>
    objectSchema({
      still_queued: array(stringSchema()).describe(
        'Uuids of async user messages that survive this interrupt: commands still in the queue, plus any batch already dequeued for the imminent turn but not yet reachable by the abort, plus any user message this process has read but not yet queued, from its own input stream (held, for instance, while a model change is still being checked or behind start-up work; a message a Remote Control client sent that is still being ingested is not listed). An interrupt \u2014 plain or cancel_queued:true \u2014 that lands during the FIRST-command prewait window (before the first turn of the session has armed a controller) is additionally LATCHED, scoped to the user-intent work pending at that instant \u2014 the batch already dequeued and parked for the imminent turn, plus the user-intent main-thread commands then in the queue or held ahead of it (the work this list enumerates): the first turn to arm that carries any of that doomed work starts already aborted, exactly once, so the listed prewait batch is delivered into an immediately-aborted turn, its frames and result flowing through the normal abort path, instead of running to completion. A turn carrying none of it arms live and leaves the latch waiting: a system delivery turn (for example a replayed host event), or a prompt enqueued after the interrupt \u2014 post-interrupt work is never coalesced with the doomed work and never dies to the latch, so the Stop kills exactly what this receipt listed. The latch is released when the doomed work is retired without arming: if a parked prewait batch is entirely cancelled, the latch is released even when other queued commands remain (those arm and run normally); with nothing parked, it is released once none of the doomed commands remains queued or held \u2014 work enqueued after the interrupt neither holds it up nor is aborted by it. Survivors that ride any later turn run normally. These WILL run (subject to that latch) unless cancelled first (or unless the request set cancel_queued:true, in which case every uuid-stamped survivor this process holds is removed, emitted a terminal `cancelled` synchronously, and listed under `cancelled` instead \u2014 leaving here only what a client driving a hosted session can no longer recall: a send already in flight to that session, or the first prompt the session was created with; a send that client still holds on its own machine behind a send gate (it waits there until that session is ready to take it) has not gone out, so it is withdrawn and listed under `cancelled` like a queued one, and cancel_async_message can withdraw it too, while a plain interrupt leaves it held and lists it here). Cancellation granularity: uuids still in the queue are individually cancellable via cancel_async_message (the re-run of an interrupted turn that also answers for other client messages only if this interrupt was for it; see the response to that request); a listed uuid whose message the process running the session (never a client driving a hosted session) still keeps out of its queue, behind a model change or start-up work, is not yet cancellable that way: cancel_async_message answers cancelled:false for it and plants a cancel-pending mark, which the drain honours once the message is queued and the mid-turn fold of a running turn does not; once a batch is dequeued and coalesced into one turn, cancelling a NON-representative member uuid is a no-op (its content still runs), while cancelling the batch-representative uuid drops the WHOLE coalesced batch \u2014 in both cases the cancel response reports cancelled:false because the message was no longer in the queue. Coverage caveats: only uuid-STAMPED messages appear (a message enqueued without a uuid still runs but is never listed, so [] does not mean "nothing will run"); only main-thread messages are listed (subagent-addressed messages are out of scope); and the list may include internally-enqueued uuids the client never sent (cron triggers, auto-resume continuations) \u2014 ignore unknown uuids rather than treating them as an error. Ordering: on a clean interrupt this receipt is written before the interrupted turn result; a turn that crashes during interrupt handling emits its error result on a direct-write path that may precede the receipt. Snapshot is taken synchronously with abort processing \u2014 probing the queue after the interrupted result instead always loses the race against the drain loop, which starts the next queued turn immediately.',
      ),
      put_back: array(stringSchema())
        .optional()
        .describe(
          "@internal Present only when not empty, and only from a CLI that advertises interrupt_requeue_taken_v1: those uuids under still_queued that an interrupt, this one or an earlier one, put back in the queue after a turn had taken them in (SDKUserMessage.requeue_if_interrupted_within_ms) and that are still in the queue. One already taken off the queue for its turn is listed under still_queued only. One interrupt puts back at most one. Each runs in a turn of its own, ahead of the other uuids listed unless one of those has a higher priority.",
        ),
      send_now: _enum(["stopped", "delivering", "nothing_waiting"])
        .optional()
        .describe(
          "@internal Present only when a CLI that advertises interrupt_send_now_v1 itself answers a send_now (a client that relays to a hosted session answers without it). 'nothing_waiting': no user message waited (with message_uuid, the named one did not), and nothing was done. 'delivering': one waits and this request stopped no turn, for one of these reasons: no turn is under way and the message runs when its place comes; the message is not in the queue yet, or the running turn is just taking it in; the CLI is moving what the turn waits on to the background, and may still stop the turn later if that fails; the turn is compacting the conversation by itself, and once that ends the CLI moves what the turn waits on or stops the turn at its next model request, while a turn with no further request ends by itself; the turn is already being stopped; or the process is on its way out, and the message will not run in it. 'stopped': the running turn was aborted for what waits, and its result follows.",
        ),
      turn: _enum(["stopped", "idle", "spared"])
        .optional()
        .describe(
          "@internal Present only when the answering CLI read the request's for_user_message_uuids. 'stopped': handled; the turn under way was aborted, or the interrupt was latched for pending work. 'idle': handled; no turn was under way and it latched for nothing. 'spared': it named no message of the current turn, so nothing was done. A named message listed in still_queued still waits, whatever the value.",
        ),
      cancelled: array(stringSchema())
        .optional()
        .describe(
          "Present only when the request set cancel_queued:true \u2014 uuids of main-thread commands cancelled by this interrupt: every survivor that would otherwise have appeared under `still_queued`, including any uuid that was mid-fold at the interrupt instant (this request also aborts, so the fold never delivers it). Each listed uuid has been removed (queue-resident), dropped before it was queued (a message this process had read and was still holding), or marked cancel-pending (the first-command prewait window, closed by the drain loop's backstop) and emits a terminal 'cancelled' lifecycle synchronously at the first such interrupt (a repeat interrupt over the same parked batch re-lists the uuid idempotently without re-emitting); none will run. Where one of them is the re-run of an interrupted turn that also answered for other client messages whose re-sent copies had been set aside for it, those messages' uuids are listed behind the commands' too: they were in no queue and never under `still_queued`, each has its terminal 'cancelled' lifecycle, and a repeat interrupt does not list them again. Same coverage caveats as `still_queued` (uuid-stamped main-thread only; internally-enqueued uuids may appear). Advertised by the `interrupt_cancel_queued_v1` capability.",
        ),
    }).describe(
      "Result of an interrupt operation. Advertised by the interrupt_receipt_v1 capability on system/init; older CLIs send an empty success response with no still_queued field.",
    ),
  );
  SDKCanUseToolCanUseToolMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("can_use_tool"),
      tool_name: stringSchema(),
      mcp_server: McpToolSourceSchema().optional(),
      input: record(stringSchema(), unknown()),
      permission_suggestions: array(McpAddRulesServerConfigSchema()).optional(),
      blocked_path: stringSchema().optional(),
      decision_reason: stringSchema()
        .optional()
        .describe(
          `Human-readable reason the ask escalated, for the consent line of the host's dialog. For decision_reason_type "subcommandResults" (compound bash), this is the NESTED safety check's warning text \u2014 the wrapper itself has no text \u2014 preferring a check that requires manual approval (classifier_approvable false); treat it with the same display/policy care as a "safetyCheck" reason. May carry ANSI escapes; sanitize before rendering.`,
        ),
      decision_reason_type: _enum(PERMISSION_DECISION_REASON_TYPES)
        .optional()
        .describe(
          `Structured discriminator for why auto-mode escalated. Lets SDK hosts make policy (e.g. auto-deny safetyCheck) without parsing decision_reason text. For compound bash commands this is "subcommandResults" even when a safetyCheck is nested inside \u2014 check classifier_approvable for that case, and see decision_reason: for this variant it carries the nested safety check's warning text.`,
        ),
      decision_reason_code: _enum([...DECISION_REASON_CODES, "org_ask_ceiling"])
        .optional()
        .describe(
          "@internal A closed-set code for a reason a host can act on, beside decision_reason_type (whose values are unchanged, so type-keyed host policy decides as before): 'outside_reads_blocked', 'memory_paused', 'classifier_transcript_too_long', 'org_ask_ceiling' (the MCP tool's ceiling, toolPermissions, is 'ask', and an ask rule or the ceiling itself raised the ask: type 'rule' or 'other'). Absent for every other reason; new values are additive.",
        ),
      decision_reason_rule_source: stringSchema()
        .optional()
        .describe(
          "@internal With decision_reason_type 'rule': the source of the rule in the decision reason (a PermissionRuleSource word). It names the first rule that matched, not the strongest, and says nothing of what that rule hides. For the host's logs: a host should not decide by it.",
        ),
      decision_reason_hook_event: _enum(["PreToolUse", "tool.check"])
        .optional()
        .describe(
          "@internal With decision_reason_type 'hook': the event of the hook that asked. 'PreToolUse': the terminal's dialog names the hook 'PreToolUse:' followed by tool_name. 'tool.check': it names it 'tool.check'. A host can write the same, as plain text. Absent for any other hook. For display only: never answer or hide a prompt because of it.",
        ),
      decision_reason_hook_source: stringSchema()
        .optional()
        .describe(
          "@internal With decision_reason_type 'hook': where the hook that asked comes from: 'plugin:<name>', 'plugin', 'skill:<name>', 'skill', or 'settings' for any other hook, such as one the SDK host registered. This CLI sends and passes on no other shape. It is absent when the CLI does not know it, when several plugins' check hooks asked together, or when the name is not 1 to 64 ASCII letters, digits, '.', '_' and '-' that start with a letter or digit. When several hooks ask on one call it is absent, or names the one whose reason decision_reason carries. The name is chosen by the plugin's or skill's author: joined words can spell a message, and it can look like a domain. Set it apart as a name, in quotation marks or in brackets as the terminal's label does. Show it in plain text, not through Markdown or an autolinker, and never as your own words. Untrusted, for display only: check and escape it, never put it in a URL, and never answer or hide a prompt because of it.",
        ),
      decision_reason_hook_plugin_id: stringSchema()
        .optional()
        .describe(
          "@internal With decision_reason_type 'hook', for one plugin's hook: the plugin's id: its name, an at sign, then its marketplace, each a name as in decision_reason_hook_source. It can look like an e-mail address. The marketplace is a real one or a reserved word for how the plugin was loaded, such as 'synced' (delivered from claude.ai: on for the person's account, or attached to the session by its configuration), 'inline' (--plugin-dir), 'skills-dir' (.claude/skills/) or 'builtin'. Same care as decision_reason_hook_source; either may be sent without the other.",
        ),
      server_policy_ask_only: booleanSchema()
        .optional()
        .describe(
          "@internal Sent with decision_reason_type 'rule', and for an MCP tool's ask that has none. true = when the frame was built, nothing asked for a person on this call but the default prompt for a tool that no rule allows and, at most, a tool policy that the host itself pushed (permission_policy 'always_ask'): no other ask rule that the permission check applies to the call, no hook's or plugin's ask, no PermissionRequest hook, no organization ceiling, no plan-mode floor, no safety check, no ask or veto on a standing grant of the tool's own, no auto-mode classifier active for the call. false = something else did, or may have. It says nothing of WHY the host pushed that policy, which only the host knows; nothing of whose server the tool is (see mcp_server), so a host answers only for a tool that it holds a person's grant for; and nothing of what changes after the frame is sent. Absent on other reason types, on another tool's ask without a reason type, wherever a request is listed, mirrored or passed on again (pending_permission_requests), and from older versions.",
        ),
      classifier_approvable: booleanSchema()
        .optional()
        .describe(
          "Set when a safetyCheck is present anywhere in the decision reason (including nested inside subcommandResults for compound bash). false = at least one safety check requires manual approval (e.g. Windows path bypass, dangerous rm); true = all safety checks MAY be classifier-approved (e.g. sensitive-file paths). Absent when no safetyCheck is involved.",
        ),
      suppress_always_allow_rule: booleanSchema()
        .optional()
        .describe(
          `True when the dialog must not offer the persistent "don't ask again" row for this ask: accepting it would write a whole-tool allow rule broader than the ask's own verb (PermissionAskDecision.suppressAlwaysAllowRule), or the ask comes from a run a plugin started, where Claude Code saves no rule from the answer, not even for the session. Hosts rendering approve options should omit any persistent-rule affordance when set.`,
        ),
      default_to_no: booleanSchema()
        .optional()
        .describe(
          "True when the ask must not be approvable by a single stray keystroke (PermissionAskDecision.defaultToNo): a terminal-style prompt opens on its decline option and takes no digit shortcut. Hosts rendering approve options should not pre-select approve when set.",
        ),
      matched_ask_rule: objectSchema({
        source: stringSchema(),
        tool_name: stringSchema(),
        rule_content: stringSchema().optional(),
      })
        .optional()
        .describe(
          "Set when a user-configured ask RULE (permissions.ask) forced this prompt but the ask carries the tool's own decision_reason \u2014 the ask-rule substitution keeps the richer tool-minted ask, so the rule rides here instead of decision_reason_type 'rule'. Hosts making policy on decision_reason_type (e.g. auto-deny safetyCheck) or running host-side auto-approval should treat asks carrying this field as rule-forced: the user's stated intent is a human prompt. Values are producer-authored but render-unsafe like decision_reason; sanitize before display.",
        ),
      title: stringSchema().optional(),
      display_name: stringSchema().optional(),
      tool_use_id: stringSchema(),
      agent_id: stringSchema().optional(),
      plugin: stringSchema()
        .optional()
        .describe(
          "@internal The plugin whose `$` call (`$.ui.ask`, `$.tool.call`, `$.agent.spawn`) started the run this ask belongs to, by the name it is loaded under: who the terminal's dialog says the ask is from. The engine's word, which no plugin sets. Empty on a run resumed from an agent a plugin steered, whose name was not kept (the terminal says `from a plugin`). Absent for the model's own calls. Untrusted text; escape before display.",
        ),
      description: stringSchema().optional(),
      requires_user_interaction: booleanSchema()
        .optional()
        .describe(
          "True when one-tap Approve/Deny must not be offered: the tool's approval card IS the user-interaction surface (Tool.requiresUserInteraction(): the user responds on the card itself), OR the pending ask is localDisplayOnly (its consent disclosure cannot ride this wire and only the local dialog renders it), OR the auto-mode classifier blocked the call and it was handed to a person (decision_reason_type 'classifier' on a person-only ask), which no stored grant or automatic approval may answer, OR a grant keyed on the tool name must not answer it: the MCP server's name spells a claude.ai connector's key and the server came from neither claude.ai nor whoever launched the session, or, while Claude Code enforces grants, two tools of the server get that name, OR the SDK host worded the ask (title and description are its consent copy, which a push cannot carry whole), OR the ask is the one made before the first upload by file reference to a connector, which no stored grant or automatic approval may answer. In each case the user has to open the session to answer.",
        ),
      server_prompt: stringSchema()
        .optional()
        .describe(
          "@internal A marker the session service puts on an ask it worded itself, naming which of its prompts this is (an open set). Nothing on this frame proves who wrote it: the marker is the service's word only on a stream served by the service, which removes the key from anything a session's own container wrote; anywhere else it is a claim. A host keeps showing the tool name and input whatever it says.",
        ),
      computer_folder: objectSchema({
        path: stringSchema(),
        computer_name: stringSchema(),
      })
        .optional()
        .describe(
          "@internal Beside server_prompt, and as trustworthy as it is: a folder on one of the person's computers and that computer's name. Untrusted text; escape before display.",
        ),
      provenance_prompt_line: _enum(["one_at_a_time", "all_at_once"])
        .optional()
        .describe(
          "@internal Only on the URL prompt that WebFetch raises mid-call, when the session's web-fetch proxy refuses an address. Says whether the session's line of such prompts was on for this call. 'one_at_a_time' = on: the call took a turn in the line, so no other prompt of that line was up when this one was raised. 'all_at_once' = off: the call joined no line, and its prompt was raised without waiting. For the host's logs: nothing in the CLI decides by it, and a host should not either.",
        ),
      tool_kind: _enum(PERMISSION_REQUEST_TOOL_KINDS)
        .optional()
        .describe(
          "@internal Structured tool category so SDK hosts can route to a specialized permission UI without name-matching tool_name. 'browser' = a Claude-in-Chrome MCP tool under any of its registered server names: the mcp__claude-in-chrome__* extension server, the mcp__Claude_in_Chrome__* Cowork desktop server, the Claude Desktop pane under mcp__Claude_Preview__* / mcp__Claude_Browser__* (both pane names are live during its rename rollout), or the mcp__remote-devices__* spellings bridged through Claude Code Remote (the bridged forms of the current names; the retiring Claude_Preview name has no bridged form). Open for future kinds.",
        ),
    }).describe("Requests permission to use a tool with the given input."),
  );
  SDKSetPermissionModeSetPermissionModeMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("set_permission_mode"),
      mode: PermissionModeSchema(),
      ultraplan: booleanSchema().optional().describe("@internal CCR ultraplan session marker."),
      from_settings: booleanSchema()
        .optional()
        .describe(
          "@internal The mode is the default of the creating person's settings, not a choice of the launch.",
        ),
    }).describe("Sets the permission mode for tool execution handling."),
  );
  SDKControlSetPermissionModeResponseSchema = DoctorLazy(() =>
    objectSchema({
      mode: PermissionModeSchema()
        .optional()
        .describe(
          "The permission mode now in effect. Headless CLIs echo it; other hosts may acknowledge with an empty object.",
        ),
    }).describe("Success payload answering set_permission_mode."),
  );
  SDKSetModelSetModelMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("set_model"),
      model: stringSchema()
        .nullable()
        .optional()
        .describe("Model to switch to. Omitted, null, or 'default' resets to the session default model."),
      system_prompt: stringSchema()
        .min(1)
        .optional()
        .describe(
          "@internal Replaces the custom system prompt (the --system-prompt / initialize systemPrompt slot). The session keeps sending the system prompt it has recorded, so the new text is first sent after the next compaction; under systemPromptSnapshot: false it is sent from the next turn on. The tool definitions already sent do not change. Applied only when the model request is accepted; must be non-empty (there is no revert-to-built-in form); re-send the current model for a prompt-only update; sending the text already in effect changes nothing. The CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE per-turn read, where configured, still wins. Transports that do not implement it, and older builds, ack success without applying it.",
        ),
      only_if_model_is_current: booleanSchema()
        .optional()
        .describe(
          "@internal When true, the request does not change the model. `model` must name a model: if it is absent, null, empty or 'default', the request fails with error_code 'invalid_request'. `system_prompt` is required: without it the request fails the same way. If `model` names the session's model, the request succeeds, and `system_prompt` replaces the custom system prompt as that member describes. The request makes no server check of the model, runs no PreModelSwitch hook, and sends no model report to the host. For a model id that this build knows, two names are one model if they resolve to one model id: an alias resolves to the id that it stands for, every dated id of a version resolves to the undated id, and a [1m] tag is ignored. An id that a behaves_as mapping points at another model is a different model. If the session's model is another model, the request fails with error_code 'model_not_current' and changes nothing. The request also fails that way while the session's records of its model disagree. A fallback that changes the session's model can cause that state until its turn ends, or longer. A session whose model setting is 'opusplan', 'opusplan[1m]' or 'haiku' runs a different model in plan mode. For such a session the request always fails with 'model_not_current'. A value that is not a boolean fails with 'invalid_request'. `claude -p` and a claude-code-server worker implement this member. Remote Control refuses every value but false. A build without this member ignores it and applies the request as a plain set_model.",
        ),
    }).describe("Sets the model to use for subsequent conversation turns."),
  );
  SDKControlSetModelResponseSchema = DoctorLazy(() =>
    objectSchema({
      model: stringSchema()
        .optional()
        .describe(
          "@internal The model the session's next turn runs as of this answer, spelled as system/init's `model`: an alias becomes the id it stands for, where external_metadata.model keeps an alias as sent. A family alias can also step down to an older version. Under opusplan or haiku in plan mode it names the model the setting runs outside plan mode, not the model a plan-mode turn sends to the API. A refusal fallback in a running turn, before or after this answer, can move the next turn to another model. `claude -p` writes it on its stream-json control channel, a Remote Control server-mode child's included, and so does a claude-code-server tenant. claude -p's Remote Control bridge lane and interactive Remote Control leave it out.",
        ),
    }).describe(
      "Success payload answering set_model. Hosts other than `claude -p` acknowledge with no payload.",
    ),
  );
  SDKSetMaxThinkingTokensSetMaxThinkingTokensMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("set_max_thinking_tokens"),
      max_thinking_tokens: numberSchema().int().nullable().optional(),
      thinking_display: _enum(THINKING_DISPLAY_MODES).nullable().optional(),
    }).describe(
      "Sets the maximum number of thinking tokens for extended thinking. When max_thinking_tokens is null, thinking resets to the session default: any mid-session budget override is cleared (back to the spawn-time budget, if one was set), and thinking stays off for sessions that have it disabled. When max_thinking_tokens is omitted, the budget is left as it is, so a request that only changes thinking_display can leave the field out. thinking_display optionally sets the thinking display mode for the rest of the session: a value replaces the session display mode, null clears that override so Claude Code's default display handling applies again, and when omitted the display mode from session start (--thinking-display) is kept. 'highlights' returns one short title per stretch of thinking instead of a prose summary. The API accepts it only from Claude Code sessions that Anthropic hosts; if the API rejects it, the session sends 'omitted' (no thinking text) in its place from then on. A request for 'highlights' gets an error reply after such a rejection, when experimental betas are off (CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS or organization policy), on a Claude 3 model (except on Microsoft Foundry), or on Amazon Bedrock (Mantle included), Google Vertex AI or a Claude apps gateway (API provider \"gateway\") with a model released before Claude Opus 4.7. The error names which of these it was; the display stays as it was, and max_thinking_tokens still applies when the request has it.",
    ),
  );
  SDKRenameSessionRenameSessionMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("rename_session"),
      title: stringSchema(),
      source: _enum(["remote", "host"])
        .optional()
        .describe(
          "Who chose the title: 'remote' (the default) for a rename made on claude.ai and relayed to this process, 'host' for one the user made in the hosting application (an IDE), which the CLI counts as a user rename.",
        ),
      session_id: stringSchema()
        .optional()
        .describe(
          "The session the title is for. When given and this process has since moved to another session (/clear, an in-session resume), the request is refused instead of naming the new session.",
        ),
    }).describe("Sets the user-facing title for the current session."),
  );
  SDKSetColorSetColorMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("set_color"),
      color: stringSchema(),
    }).describe('Sets the session accent color. Accepts an agent color name or "default" to reset.'),
  );
  SDKMcpStatusMcpStatusMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("mcp_status"),
      liveReply: booleanSchema()
        .optional()
        .describe(
          "When true and the CLI writes to the session through CCR (a cloud session's worker, or a Remote Control worker), the success reply is published only to the clients attached at that moment, as a control_response marked live_only: true on the session's unsequenced event stream, and is not stored with the session's events; a cloud session's worker that does not advertise `mcp_status_no_config_v1` embeds each server's configuration (URLs, headers, OAuth settings) in its rows. Set it only if your client reads control_response frames from that stream; a reply sent while its stream is down is lost and the request must be sent again; a reply too large to send in full leaves out each server's `tools`, `serverInfo` and `capabilities` and sends only how many tools it has, and one still over the live size limit comes back as a live error instead. Error replies other than that size-limit error, and every reply from hosts that do not send live replies (stdio hosts, and CLIs older than this field), are ordinary stored replies, so a client that sets it must accept either.",
        ),
    }).describe("Requests the current status of all MCP server connections."),
  );
  SDKControlMcpStatusResponseSchema = DoctorLazy(() =>
    objectSchema({
      mcpServers: array(McpServerStatusSchema()),
    }).describe("Response containing the current status of all MCP server connections."),
  );
  SDKFileSuggestionsFileSuggestionsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("file_suggestions"),
      query: stringSchema(),
    }).describe(
      "Requests at-mention file autocomplete suggestions for a partial path prefix. Returns the same fuzzy-matched results the TUI shows.",
    ),
  );
  SDKControlFileSuggestionsResponseSchema = DoctorLazy(() =>
    objectSchema({
      suggestions: array(
        objectSchema({
          path: stringSchema().describe(
            "Relative to `cwd`, or absolute (e.g. files under the Claude config directory). A directory ends with a path separator.",
          ),
          score: numberSchema().optional(),
        }),
      ),
      cwd: stringSchema()
        .optional()
        .describe(
          "Absolute directory the relative suggestion paths are relative to: the working directory the file index was built for, which can lag the current one briefly after a directory change. Omitted by older CLIs and on transports that withhold local paths; resolve against the system/init cwd then.",
        ),
    }).describe(
      "Response containing fuzzy-ranked file path suggestions (capped at the same limit as the TUI typeahead).",
    ),
  );
  SDKGetContextUsageGetContextUsageMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_context_usage"),
      detail: _enum(["summary", "full"])
        .optional()
        .describe(
          "'full' counts each category with the token-count API; 'summary' answers from the last response's usage and local estimates without the per-category token-count calls. Defaults to 'full'.",
        ),
    }).describe("Requests a breakdown of current context window usage by category."),
  );
  SDKGetSessionCostGetSessionCostMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_session_cost"),
    }).describe(
      "Requests the formatted session cost summary (the same text /usage prints in non-interactive mode). Used by the thin-client /usage dialog to show the remote container cost instead of the local $0.00.",
    ),
  );
  SDKControlGetSessionCostResponseSchema = DoctorLazy(() =>
    objectSchema({
      text: stringSchema(),
    }).describe("Formatted session cost text, ANSI-stripped."),
  );
  SDKListModelsListModelsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("list_models"),
    }).describe(
      "Requests the worker's selectable model catalog. Fulfills the caps.modelCatalog capability: in a remote thin-client session the worker's provider, settings cascade, and enforcement policy decide which models the session can run, so the thin client must ask rather than read its own getModelOptions().",
    ),
  );
  SDKControlListModelsResponseSchema = DoctorLazy(() =>
    objectSchema({
      models: array(ModelOptionSchema()),
    }).describe(
      "The worker's model options serialized via toModelInfos() \u2014 the same ModelInfo shape the initialize response carries. Includes disabled rows (visible but not selectable) so the thin-client picker renders them greyed-out like the local one.",
    ),
  );
  SDKGetUsageGetUsageMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_usage"),
      skip_behaviors: booleanSchema()
        .optional()
        .describe(
          "Skip the scan of local transcripts that produces the response's behaviors section (it is null in the answer). For callers that need only the plan rate limits, such as a usage meter; the scan reads every transcript touched in the last seven days.",
        ),
    }).describe(
      "Requests the structured /usage data: session cost/usage totals plus claude.ai plan rate-limit utilization when available. Experimental \u2014 the response shape may change.",
    ),
  );
  SDKUsageWindowSchema = DoctorLazy(() =>
    objectSchema({
      utilization: numberSchema().nullable().describe("Percentage of the window used, 0-100."),
      resets_at: stringSchema().nullable().describe("ISO 8601 timestamp when the window resets."),
    }),
  );
  SDKUsageAttributionItemSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema(),
      pct: numberSchema().describe("Share of the weighted local usage attributed to this item, 0-100."),
    }),
  );
  SDKLocalWindowUsageSchema = DoctorLazy(() =>
    objectSchema({
      request_count: numberSchema().describe("API requests found in local transcripts for this window."),
      session_count: numberSchema().describe("Distinct sessions observed in this window."),
      behaviors: array(
        objectSchema({
          key: _enum([
            "cache_miss",
            "long_context",
            "subagent_heavy",
            "high_parallel",
            "cron",
            "max_effort",
            "workflow",
            "always_on_context",
            "large_tool_results",
          ]),
          pct: numberSchema().describe(
            "Share of the weighted local usage attributed to this behavior, 0-100.",
          ),
          count: numberSchema().describe("Requests in this window exhibiting the behavior."),
        }),
      ).describe(
        "Behavioral characteristics of local usage. Categories overlap \u2014 this is not a partition, so percentages do not sum to 100.",
      ),
      recommendations: array(
        objectSchema({
          key: stringSchema().describe(
            "The behavior key, or 'agent', 'skill', 'plugin' or 'mcp_server' for a named source.",
          ),
          pct: numberSchema().describe("Share of the weighted local usage this touches, 0-100."),
          title: stringSchema().describe("What to do, verb first."),
          detail: stringSchema()
            .optional()
            .describe("A few words: what the scan saw, or the command to run."),
        }),
      )
        .optional()
        .describe(
          "One recommended change per notable behavior or source, largest share first, worded for display.",
        ),
      fix: objectSchema({
        keys: array(stringSchema()).describe("The recommendations it covers."),
        messages: array(stringSchema()).describe(
          "User messages to send for the person, one each and in order, at priority 'later' so a running turn cannot reorder them: any /effort commands first, then one prompt for the rest, which goes with client_composed set.",
        ),
      })
        .optional()
        .describe(
          'What one "fix" action does. Absent when nothing can be fixed in the session that answered.',
        ),
      agents: array(SDKUsageAttributionItemSchema()),
      skills: array(SDKUsageAttributionItemSchema()),
      plugins: array(SDKUsageAttributionItemSchema()),
      mcp_servers: array(SDKUsageAttributionItemSchema()),
    }),
  );
  SDKControlGetUsageResponseSchema = DoctorLazy(() =>
    objectSchema({
      session: objectSchema({
        total_cost_usd: numberSchema(),
        total_api_duration_ms: numberSchema().int(),
        total_duration_ms: numberSchema().int(),
        total_lines_added: numberSchema().int(),
        total_lines_removed: numberSchema().int(),
        model_usage: record(stringSchema(), ModelUsageSchema()),
      }).describe("Cost and usage accumulated by the current session."),
      subscription_type: stringSchema()
        .nullable()
        .describe(
          "Claude.ai subscription type ('pro', 'max', 'team', 'enterprise') or null for API key / 3P provider sessions.",
        ),
      rate_limits_available: booleanSchema().describe(
        "False when plan rate limits do not apply (API key, Bedrock, Vertex, or missing profile scope) \u2014 rate_limits will be null.",
      ),
      rate_limits: objectSchema({
        five_hour: SDKUsageWindowSchema().nullable().optional(),
        seven_day: SDKUsageWindowSchema().nullable().optional(),
        seven_day_oauth_apps: SDKUsageWindowSchema().nullable().optional(),
        seven_day_opus: SDKUsageWindowSchema().nullable().optional(),
        seven_day_sonnet: SDKUsageWindowSchema().nullable().optional(),
        model_scoped: array(
          objectSchema({
            display_name: stringSchema().describe(
              "Server-supplied label for the model bucket (e.g. 'Fable').",
            ),
            utilization: numberSchema().nullable(),
            resets_at: stringSchema().nullable(),
          }),
        )
          .optional()
          .describe(
            "Per-model weekly windows from the server limits[] array, filtered by the overage-included-models allowlist. Additive: absent when nothing is known about them (an answer served from cached data, or rows the allowlist hides); an empty array means the endpoint itself answered and listed no per-model weekly window at all for this account, before the allowlist was applied.",
          ),
        extra_usage: objectSchema({
          is_enabled: booleanSchema(),
          monthly_limit: numberSchema().nullable(),
          used_credits: numberSchema().nullable(),
          utilization: numberSchema().nullable(),
          currency: stringSchema().nullable().optional(),
        })
          .nullable()
          .optional(),
      })
        .nullable()
        .describe(
          "Plan rate-limit utilization windows from the claude.ai usage endpoint, or null when unavailable.",
        ),
      behaviors: objectSchema({
        day: SDKLocalWindowUsageSchema().describe("Last 24 hours."),
        week: SDKLocalWindowUsageSchema().describe("Last 7 days."),
      })
        .nullable()
        .describe(
          "What's contributing to limits usage, from a scan of local transcripts on this machine (the same data the /usage dialog renders): behavioral characteristics plus per-skill/agent/plugin/MCP-server attribution. Approximate, excludes other devices and claude.ai. Null for non-claude.ai-subscriber sessions (mirrors the dialog) or when the scan fails.",
        ),
    }).describe(
      "Structured /usage data: session cost/usage totals plus claude.ai plan rate-limit utilization. Experimental \u2014 the shape may change.",
    ),
  );
  SDKGetStatusGetStatusMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_status"),
    }).describe(
      "@internal Requests the rows of the terminal's /status screen (version, session, account, provider, model, servers, settings), every value already rendered as text, for a host that shows them with its own widgets.",
    ),
  );
  SDKStatusRowSchema = DoctorLazy(() =>
    objectSchema({
      label: stringSchema()
        .optional()
        .describe("The row's name; absent for a row that is a sentence on its own."),
      value: stringSchema().describe("The row's value as the terminal shows it."),
    }),
  );
  SDKControlGetStatusResponseSchema = DoctorLazy(() =>
    objectSchema({
      sections: array(
        objectSchema({
          title: stringSchema(),
          rows: array(SDKStatusRowSchema()),
        }),
      ).describe("The /status screen's sections in its order, each with the rows it shows."),
    }).describe("@internal The terminal's /status rows as text."),
  );
  SDKExportConversationExportConversationMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("export_conversation"),
    }).describe(
      "@internal Requests the conversation as the plain text the terminal's /export writes, with the file name that command would offer, for a host that copies or saves it with its own widgets.",
    ),
  );
  SDKControlExportConversationResponseSchema = DoctorLazy(() =>
    objectSchema({
      text: stringSchema().describe("The whole conversation as plain text, as /export renders it."),
      default_filename: stringSchema().describe(
        "The file name /export would offer: the time and the first prompt, ending in .txt.",
      ),
    }).describe("@internal The conversation text /export would write."),
  );
  SDKCloudSessionUnavailableSchema = DoctorLazy(() =>
    objectSchema({
      status: literal("unavailable"),
      reason: _enum([
        "started_by_session",
        "provider",
        "evaluation_run",
        "nonessential_traffic",
        "policy",
        "policy_unverified",
        "not_signed_in",
        "sign_in_expired",
        "not_found",
        "forbidden",
        "temporarily_unavailable",
        "failed",
      ])
        .optional()
        .catch(undefined)
        .describe(
          "Why nothing was read, so that a host can choose its own wording. temporarily_unavailable means that asking again may work. Unknown codes degrade to undefined at parse time, so codes can be added without a version bump; a host reads undefined as failed.",
        ),
      message: stringSchema().describe(
        "A fixed sentence of the CLI's own for a person. Never the text of an error or of a response.",
      ),
    }).describe("@internal A cloud-session read that returned nothing, and why."),
  );
  SDKListCloudSessionsListCloudSessionsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("list_cloud_sessions"),
      user_initiated: booleanSchema()
        .optional()
        .describe("True when a person asked for the list now. Absent or false for a background reload."),
    }).describe(
      "@internal Requests the signed-in account's cloud sessions, read by the CLI with its own sign-in. Answered only for the program that started the CLI on the same machine, over its stdin; refused on any other connection.",
    ),
  );
  SDKControlListCloudSessionsResponseSchema = DoctorLazy(() =>
    discriminatedUnion("status", [
      objectSchema({
        status: literal("ok"),
        sessions: array(
          objectSchema({
            id: stringSchema().describe("The session id, starting with `session_`."),
            title: stringSchema().describe("Empty when the session has no title. Text from the service."),
            updated_at: stringSchema().describe("Time of the last change, as the service wrote it."),
            status: _enum(["running", "idle", "requires_action", "archived", "pending", "failed"])
              .optional()
              .catch(undefined)
              .describe("Unknown values degrade to undefined at parse time; a host reads undefined as idle."),
            environment_kind: _enum(["bridge", "anthropic_cloud", "byoc", "snap"])
              .optional()
              .catch(undefined)
              .describe("Where the session runs. bridge is a Remote Control session."),
            repository: objectSchema({
              owner: stringSchema(),
              name: stringSchema(),
            })
              .optional()
              .describe("The GitHub repository of the session's first git source."),
            branch: stringSchema()
              .optional()
              .describe(
                "The branch the session works on. Text from the service: check it before it goes to git.",
              ),
          }),
        ),
        truncated: booleanSchema().describe("True when the service has more sessions than this page."),
      }),
      SDKCloudSessionUnavailableSchema(),
    ]).describe("@internal The account's cloud sessions, or why they were not read."),
  );
  SDKGetCloudSessionGetCloudSessionMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_cloud_session"),
      session_id: stringSchema().describe("A session id from list_cloud_sessions."),
    }).describe(
      "@internal Requests the title, branch and environment kind of one cloud session that the service serves to the signed-in account. Refused where list_cloud_sessions is.",
    ),
  );
  SDKControlGetCloudSessionResponseSchema = DoctorLazy(() =>
    discriminatedUnion("status", [
      objectSchema({
        status: literal("ok"),
        title: stringSchema()
          .optional()
          .describe("Absent when the session has no title. Text from the service."),
        branch: stringSchema()
          .optional()
          .describe(
            "The branch the session works on. Text from the service: check it before it goes to git.",
          ),
        environment_kind: _enum(["bridge", "anthropic_cloud", "byoc", "snap"])
          .optional()
          .catch(undefined)
          .describe("Where the session runs. bridge is a Remote Control session."),
      }),
      SDKCloudSessionUnavailableSchema(),
    ]).describe("@internal One cloud session, or why it was not read."),
  );
  SDKGetCloudSessionTranscriptGetCloudSessionTranscriptMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_cloud_session_transcript"),
      session_id: stringSchema().describe("A session id from list_cloud_sessions."),
      cursor: stringSchema()
        .optional()
        .describe("The next_cursor of the page before. Absent for the first page."),
    }).describe(
      "@internal Requests one page of the stored transcript of a cloud session that the signed-in account owns. Not always the whole transcript: for a compacted session the service serves the rows its last compaction kept, then its compact_boundary entry and what followed, so the messages that compaction summarized can be on no page. Refused where list_cloud_sessions is.",
    ),
  );
  SDKControlGetCloudSessionTranscriptResponseSchema = DoctorLazy(() =>
    discriminatedUnion("status", [
      objectSchema({
        status: literal("ok"),
        entries: array(record(stringSchema(), unknown())).describe(
          "Transcript entries as the service stored them, oldest first. Session content: the CLI does not check it.",
        ),
        next_cursor: stringSchema()
          .optional()
          .describe("Present when a later page exists: send it as cursor to get that page."),
      }),
      SDKCloudSessionUnavailableSchema(),
    ]).describe("@internal One page of a cloud session's transcript, or why it was not read."),
  );
  SDKGetMemoryDialogGetMemoryDialogMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_memory_dialog"),
    }).describe(
      "@internal Requests the rows and toggle states of the session's /memory dialog, for a host that draws the dialog with its own widgets and opens the files and folders itself. Clears the session's memory-file cache first, as the terminal /memory does.",
    ),
  );
  SDKMemoryDialogFileSchema = DoctorLazy(() =>
    objectSchema({
      kind: _enum(["user", "project", "project-alt", "local", "other"]).describe(
        "The user instructions file, the project instructions file (./CLAUDE.md), the alternate project file (./.claude/CLAUDE.md), the local file (./CLAUDE.local.md), or any other loaded instruction file. Only the user and project rows are listed while missing (exists false), so a host may create exactly those two.",
      ),
      path: stringSchema().describe("Absolute path on the session filesystem."),
      label: stringSchema().describe("The row label as the terminal dialog shows it."),
      description: stringSchema().describe("The row's secondary text; may be empty."),
      exists: booleanSchema(),
    }),
  );
  SDKMemoryDialogFolderSchema = DoctorLazy(() =>
    objectSchema({
      kind: _enum(["auto", "team", "agent"]).describe(
        "The auto-memory folder, the team memory folder, or one agent's memory folder.",
      ),
      path: stringSchema().describe("Absolute directory path on the session filesystem; may not exist yet."),
      label: stringSchema(),
      description: stringSchema(),
    }),
  );
  SDKMemoryEntrySchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().describe(
        "The memory's path relative to the auto-memory folder ('MEMORY.md' for the index), as the CLI's memory scan names it.",
      ),
      path: stringSchema().describe(
        "Absolute path on the session filesystem, inside the auto-memory folder reported in folders.",
      ),
      description: stringSchema()
        .nullable()
        .describe("The memory's frontmatter description; null when it has none."),
      type: _enum(["user", "feedback", "project", "reference"])
        .nullable()
        .describe("The memory's frontmatter type; null when absent or not one of the CLI's types."),
      modified_ms: numberSchema().describe(
        "When the memory was last modified, in epoch milliseconds: the frontmatter 'modified' stamp when it parses, else the file's mtime.",
      ),
    }),
  );
  SDKControlGetMemoryDialogResponseSchema = DoctorLazy(() =>
    objectSchema({
      files: array(SDKMemoryDialogFileSchema()),
      folders: array(SDKMemoryDialogFolderSchema()).describe(
        "Empty when the terminal dialog would show no folder rows.",
      ),
      memories: array(SDKMemoryEntrySchema())
        .optional()
        .describe(
          "The saved memories in the auto-memory folder, as the CLI's own memory scan lists them (the same listing the memory recall uses, so it follows the CLI's storage and visibility rules): the MEMORY.md index first when it exists on disk, then the memories ordered by file modification time, newest first (modified_ms may carry a frontmatter stamp instead), capped at the scan's limit of 200. Present exactly when folders is non-empty; absent while auto-memory is off, and absent from a CLI that predates this field.",
        ),
      auto_memory: objectSchema({
        enabled: booleanSchema().describe(
          "Whether auto-memory is on for every session: on in settings and not turned off by an environment variable, a launch flag, safe mode or the per-model switch.",
        ),
        toggleable: booleanSchema().describe(
          "False where the terminal dialog ignores the toggle (safe mode, or the per-model kill switch).",
        ),
        status: stringSchema().describe("The state text beside 'Auto-memory:' in the terminal dialog."),
      }),
      auto_dream: objectSchema({
        shown: booleanSchema().describe("Whether the terminal dialog shows the Auto-dream row."),
        enabled: booleanSchema(),
        toggleable: booleanSchema().describe(
          "False while auto-memory is off for every session or held off for this session, or, when off, in a session a tool call or a background runner started.",
        ),
        status: stringSchema().describe("The state text beside 'Auto-dream:'."),
        detail: stringSchema().describe(
          "The dimmed detail ('running', 'never', 'last ran \u2026'), or empty.",
        ),
      }),
    }).describe(
      "@internal The session's /memory dialog: file rows, folder rows, and the two toggle rows, in dialog order. Org (synced project memory) rows are not included.",
    ),
  );
  SDKGetSkillsDialogGetSkillsDialogMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_skills_dialog"),
    }).describe(
      "@internal Requests the rows of the terminal's /skills menu, for a host that draws the menu with its own widgets: each skill with its source, its token estimate, its effective state, and what locks it. Read-only; a host writes a state through the CLI's edit-skill-overrides subcommand.",
    ),
  );
  SDKSkillsDialogRowSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().describe(
        "The skill's full name (the settings key; 'server:skill' for an MCP skill).",
      ),
      display_name: stringSchema().describe("The name the menu shows, as the slash-command list names it."),
      description: stringSchema(),
      source: stringSchema().describe(
        "The source label the menu shows ('user', 'project', 'plugin', 'built-in', \u2026).",
      ),
      tokens: numberSchema().describe(
        "The menu's token estimate for the skill's listing in the system prompt, for the active model.",
      ),
      state: _enum(["on", "name-only", "user-invocable-only", "off"]).describe(
        "The effective state (the locked value, else the local setting, else the project or user setting, else 'on').",
      ),
      locked_by: _enum(["author", "plugin", "policy", "flag", "reserved-name"])
        .optional()
        .describe(
          "Present when a local setting cannot change the state: the skill disables model invocation itself, it comes from a plugin, a managed or flag setting names it, or settings cannot store an entry under its name (reserved-name: a skill named __proto__; rename it to configure it). When one of several skills sharing a name is locked, every row of that name carries the lock, as the menu treats the name.",
        ),
      advertised: booleanSchema().describe(
        "Whether the session lists the skill as a slash command (a skill that is off, or not user-invocable, is not): a host joins a row to its command only when true.",
      ),
      handles: objectSchema({
        unqualified_name: stringSchema().optional(),
        aliases: array(stringSchema()).optional(),
        bare_name_reserved: booleanSchema().optional(),
      }).describe(
        "The other names the settings files may hold the skill's state under (its unqualified name, its aliases), as the menu resolves them; a host sends these back with an edit of a skill only the session loaded, so the edit reads the same entries.",
      ),
    }),
  );
  SDKControlGetSkillsDialogResponseSchema = DoctorLazy(() =>
    objectSchema({
      skills: array(SDKSkillsDialogRowSchema()).describe(
        "The menu's rows, in its default order (by source, then name).",
      ),
    }).describe("@internal The terminal's /skills menu as rows."),
  );
  SDKGetChromeDialogGetChromeDialogMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_chrome_dialog"),
    }).describe(
      "@internal Requests the state the terminal's /chrome dialog shows (Claude in Chrome: whether it is allowed, the extension's install and connection state, the enabled-by-default setting, and the pages its rows open), for a host that draws the dialog with its own widgets. Read-only; a host writes the setting through the CLI's edit-chrome-settings subcommand.",
    ),
  );
  SDKControlGetChromeDialogResponseSchema = DoctorLazy(() =>
    objectSchema({
      allowed: booleanSchema().describe(
        "Whether Claude in Chrome may be used at all (the organization policy allows the browser extension).",
      ),
      subscriber: booleanSchema().describe(
        "Whether the account is a claude.ai subscription, which Claude in Chrome requires.",
      ),
      wsl: booleanSchema().describe(
        "Whether the session runs under WSL, where Claude in Chrome is not supported.",
      ),
      installed: booleanSchema().describe("Whether the Chrome extension was detected on this machine."),
      connected: booleanSchema().describe("Whether the session's Claude in Chrome server is connected."),
      paired_browser: stringSchema()
        .optional()
        .describe("The paired browser's name, when connected and paired."),
      enabled_by_default: booleanSchema().describe(
        'The "Enabled by default" setting (claudeInChromeDefaultEnabled in the global config).',
      ),
      at_startup: booleanSchema()
        .optional()
        .describe(
          '@internal The same answer as claude_in_chrome_at_startup, computed when asked. Any host can read it; a host uses it to decide whether to connect open sessions when "Enabled by default" is turned on. Absent (older CLI) \u2192 treat as false.',
        ),
      urls: objectSchema({
        install: stringSchema().describe("The page that installs the extension."),
        reconnect: stringSchema().describe("The page that reconnects the extension."),
        permissions: stringSchema().describe("The extension's site permissions page."),
      }).describe("The pages the terminal dialog's rows open, so a host holds no copy of them."),
    }).describe("@internal The terminal's /chrome dialog state."),
  );
  SDKGetChromeBrowsersGetChromeBrowsersMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_chrome_browsers"),
    }).describe(
      "@internal Requests the browsers connected to the session's Claude in Chrome server, as the terminal's /chrome browser picker lists them. Fails when the server is not connected.",
    ),
  );
  SDKControlGetChromeBrowsersResponseSchema = DoctorLazy(() =>
    objectSchema({
      browsers: array(
        objectSchema({
          device_id: stringSchema(),
          name: stringSchema(),
          os_platform: stringSchema().optional(),
          current: booleanSchema().describe("Whether this is the browser Chrome actions use now."),
        }),
      ),
    }).describe("@internal The connected browsers."),
  );
  SDKSelectChromeBrowserSelectChromeBrowserMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("select_chrome_browser"),
      device_id: stringSchema().describe("The browser to use for Chrome actions, from get_chrome_browsers."),
    }).describe(
      "@internal Switches the session's Claude in Chrome server to the given browser, as the terminal's picker does. Fails when the server is not connected.",
    ),
  );
  SDKControlSelectChromeBrowserResponseSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().optional().describe("The chosen browser's name, when known."),
    }).describe("@internal The browser is now in use."),
  );
  SDKGetSandboxDialogGetSandboxDialogMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_sandbox_dialog"),
    }).describe(
      "@internal Requests the state the terminal's /sandbox dialog shows, for a host that draws the dialog with its own widgets: platform support, the policy lock, the mode and its choices, the unsandboxed-fallback override, the dependency check, the excluded commands and the configured restrictions. Read-only; a host writes through the CLI's edit-sandbox-settings subcommand.",
    ),
  );
  SDKControlGetSandboxDialogResponseSchema = DoctorLazy(() =>
    objectSchema({
      supported: booleanSchema().describe(
        "Whether sandboxing can be configured on this platform (macOS, Linux, WSL2, or Windows where enabled) and the enterprise enabledPlatforms setting includes it.",
      ),
      unsupported_reason: _enum(["wsl1", "platform", "excluded_platform"])
        .optional()
        .describe(
          "Why not, when supported is false: WSL1; another unsupported platform; or a platform the enabledPlatforms setting leaves out.",
        ),
      locked: booleanSchema().describe(
        "Whether a higher-priority settings source sets the sandbox settings, so the mode cannot be changed locally.",
      ),
      overrides_locked: booleanSchema().describe(
        "Whether the unsandboxed-fallback override cannot be changed from the project: set by policy (locked, or unsandboxed commands forbidden), or held closed (allowUnsandboxedCommands: false) by a --settings file or user settings.",
      ),
      policy_origins: array(stringSchema())
        .optional()
        .describe(
          "The managed (policy) settings sources at this read, as codes; empty when there are none. Absent from a Claude Code older than this field: treat that as another source. First the sources, highest precedence first. 'helper': a policy helper armed on this machine (one armed by server-managed settings counts as 'remote'); the codes after it are the sources beneath it, which may take no part. 'remote': server-managed settings. 'plist' or 'hklm': MDM. 'file': the managed settings file or its drop-ins. 'parent': --managed-settings or the SDK's managedSettings, where they take part; it stands for all the host passed: where that includes a hybrid organization's settings, the policy is not the host's alone. 'hkcu': the user's registry block, unless empty: listed where it serves and where 'parent', 'helper' or 'remote' displaces it; beneath 'hklm' or 'file' it is not read at all. Then two that say a source is missing. 'remote_unknown': this session counts as due server-managed settings and has none (the fetch failed, or is under way with no cached copy that holds settings); under any other verdict of the process on whether it is due them, or none, there is no code for what is missing, though its organization may have set some (desktop-host-contract.md D19a). 'unreadable': a document of the machine's administrator that exists and did not load (unreadable, or not valid JSON). Every administrator source that holds a setting is listed, even where a higher source leaves it unapplied; a source holding only the managedSourcesBehavior or wslInheritsWindowsSettings knob is not, nor one of whose policy this client reads nothing where another is listed, and one passed over for authoring nothing always has a listed one beneath it. New sources get new codes: treat an unknown code as another source.",
        ),
      enabled: booleanSchema().describe(
        "Whether sandboxing is running in this session: on in the settings, and the sandbox started.",
      ),
      enabled_in_settings: booleanSchema().describe("Whether the settings files turn sandboxing on."),
      unavailable_reason: stringSchema()
        .optional()
        .describe(
          "Why the sandbox cannot run although the settings turn it on (a missing dependency, an unsupported platform), when that is so; absent when it runs, or when it is off in the settings. When absent while enabled is false and enabled_in_settings true, the sandbox failed to start in this session.",
        ),
      mode: _enum(["auto-allow", "regular", "disabled"]).describe(
        "The terminal picker's current row, from the settings: sandboxed commands auto-allowed, sandboxed with regular permissions, or no sandbox.",
      ),
      auto_allow_available: booleanSchema().describe(
        "Whether the auto-allow mode is offered on this platform.",
      ),
      no_sandbox_allowed: booleanSchema().describe(
        'False when sandboxing is forced on, so the "No sandbox" choice is not offered.',
      ),
      unsandboxed_fallback: booleanSchema().describe(
        "Whether a command that fails under the sandbox may be retried outside it.",
      ),
      dependencies: objectSchema({
        errors: array(stringSchema()).describe(
          "Missing required dependencies; the sandbox cannot run with any.",
        ),
        warnings: array(stringSchema()).describe(
          "Missing optional dependencies; the sandbox runs with less isolation.",
        ),
      }).describe("The sandbox runtime's dependency check, as the terminal's Dependencies tab lists it."),
      excluded_commands: array(stringSchema()).describe(
        "Command patterns excluded from the sandbox (the excludedCommands setting).",
      ),
      restrictions: objectSchema({
        fs_deny_read: array(stringSchema()),
        fs_allow_read: array(stringSchema()).describe(
          "Paths re-allowed for reading (filesystem.allowRead), as enforced: while managed settings mandate the sandbox, or managed or --settings deny reads, project settings contribute none; under filesystem.allowManagedReadPathsOnly, managed settings only.",
        ),
        fs_allow_write: array(stringSchema()).describe(
          "Extra writable paths (filesystem.allowWrite), as enforced: while managed settings mandate the sandbox, project settings contribute none.",
        ),
        fs_deny_write: array(stringSchema()),
        network_allowed_domains: array(stringSchema()),
        network_denied_domains: array(stringSchema()),
        network_managed: booleanSchema().describe("Whether the network allow list is managed by policy."),
        unix_sockets: array(stringSchema()).describe(
          "Unix socket paths allowed (allowUnixSockets), as enforced: while managed settings mandate the sandbox, from managed, --settings and user settings only.",
        ),
        allow_all_unix_sockets: booleanSchema().describe(
          "Whether every Unix socket is allowed (allowAllUnixSockets, as enforced), so socket blocking is off and a missing socket-filter dependency costs nothing; the terminal shows its socket warning only when this is false.",
        ),
        ignored_glob_patterns: array(stringSchema()).describe(
          "Patterns the Linux sandbox ignores (globs it does not support).",
        ),
      }).describe(
        "The restrictions configured in the sandbox settings (the settings' filesystem, network and socket lists, not the runtime's built-in defaults), as the settings files merge them; the grant fields (fs_allow_read, fs_allow_write, unix_sockets, allow_all_unix_sockets) as enforced.",
      ),
    }).describe(
      "@internal The session's /sandbox dialog state, for a host on the same machine (the sandbox governs the commands Claude runs there).",
    ),
  );
  SDKGetBinaryVersionGetBinaryVersionMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_binary_version"),
    }).describe(
      "Requests the responder's CLI binary version. Used by /version in --remote mode so the thin client can show both its own and the remote container's version.",
    ),
  );
  SDKControlGetBinaryVersionResponseSchema = DoctorLazy(() =>
    objectSchema({
      version: stringSchema(),
      buildTime: stringSchema().optional(),
    }),
  );
  SDKContextUsageCategorySchema = DoctorLazy(() =>
    objectSchema({
      id: _enum(CONTEXT_CATEGORY_ORDER)
        .optional()
        .describe(
          "Which row this is. Stable where the English name is not: match a particular row on this. Absent from a CLI that predates it. A later CLI may add values: treat an unknown value as absent.",
        ),
      name: stringSchema(),
      tokens: numberSchema().int(),
      color: stringSchema(),
      isDeferred: booleanSchema().optional(),
      kind: _enum(CONTEXT_CATEGORY_KINDS).describe(
        "What the row is, the same classification the /context result's context_usage rows carry: 'used' content occupies the window; 'free' is the remaining window; 'buffer' is the compaction reserve; 'deferred' rows are out-of-window tool schemas. Classify on this, never on the English name.",
      ),
    }),
  );
  SDKContextUsageGridSquareSchema = DoctorLazy(() =>
    objectSchema({
      color: stringSchema(),
      isFilled: booleanSchema(),
      categoryName: stringSchema(),
      tokens: numberSchema().int(),
      percentage: numberSchema(),
      squareFullness: numberSchema(),
    }),
  );
  SDKControlGetContextUsageStrictResponseSchema = DoctorLazy(() =>
    objectSchema({
      categories: array(SDKContextUsageCategorySchema()),
      totalTokens: numberSchema().int(),
      maxTokens: numberSchema().int(),
      rawMaxTokens: numberSchema().int(),
      percentage: numberSchema(),
      gridRows: array(array(SDKContextUsageGridSquareSchema())),
      model: stringSchema(),
      memoryFiles: array(
        objectSchema({
          path: stringSchema(),
          type: stringSchema(),
          tokens: numberSchema().int(),
        }),
      ),
      mcpTools: array(
        objectSchema({
          name: stringSchema(),
          serverName: stringSchema(),
          tokens: numberSchema().int(),
          isLoaded: booleanSchema().optional(),
        }),
      ),
      mcpInstructions: array(
        objectSchema({
          serverName: stringSchema().describe(
            "Server name, as mcp_status reports it and mcp_toggle takes it (not normalized, unlike mcpTools[].serverName).",
          ),
          tokens: numberSchema().int(),
        }),
      )
        .optional()
        .describe(
          "The 'mcp_instructions' row by server. Only the row's total is counted: each server's share of it is estimated from the length of its text. Present only where the CLI answers on its own stdio and no server stores or forwards the reply.",
        ),
      deferredBuiltinTools: array(
        objectSchema({
          name: stringSchema(),
          tokens: numberSchema().int(),
          isLoaded: booleanSchema(),
        }),
      ).optional(),
      systemTools: array(
        objectSchema({
          name: stringSchema(),
          tokens: numberSchema().int(),
        }),
      ).optional(),
      systemPromptSections: array(
        objectSchema({
          name: stringSchema(),
          tokens: numberSchema().int(),
        }),
      ).optional(),
      agents: array(
        objectSchema({
          agentType: stringSchema(),
          source: stringSchema(),
          pluginId: stringSchema()
            .optional()
            .describe(
              "Id of the providing plugin (its name and marketplace), when there is one. Present only where the CLI answers on its own stdio and no server stores or forwards the reply.",
            ),
          path: stringSchema()
            .optional()
            .describe(
              "Absolute path of the agent's file on the machine the CLI runs on, which over SSH or WSL is not the host's. Present only where the CLI answers on its own stdio and no server stores or forwards the reply: absent on cloud, self-hosted runner and Remote Control connections, and for an agent with no file.",
            ),
          tokens: numberSchema().int(),
        }),
      ),
      slashCommands: objectSchema({
        totalCommands: numberSchema().int(),
        includedCommands: numberSchema().int(),
        tokens: numberSchema().int(),
      }).optional(),
      skills: objectSchema({
        totalSkills: numberSchema().int(),
        includedSkills: numberSchema().int(),
        tokens: numberSchema().int(),
        skillFrontmatter: array(
          objectSchema({
            name: stringSchema(),
            source: stringSchema(),
            pluginName: stringSchema()
              .optional()
              .describe(
                "Name of the providing plugin, when there is one. Not unique across marketplaces: pluginId is.",
              ),
            pluginId: stringSchema()
              .optional()
              .describe(
                "Id of the providing plugin (its name and marketplace), when there is one. Present only where the CLI answers on its own stdio and no server stores or forwards the reply.",
              ),
            path: stringSchema()
              .optional()
              .describe(
                "Absolute path of the skill's file on the machine the CLI runs on, which over SSH or WSL is not the host's. Present only where the CLI answers on its own stdio and no server stores or forwards the reply: absent on cloud, self-hosted runner and Remote Control connections, and for a skill with no file.",
              ),
            tokens: numberSchema().int(),
          }),
        ),
      }).optional(),
      autoCompactThreshold: numberSchema().int().optional(),
      isAutoCompactEnabled: booleanSchema(),
      messageBreakdown: objectSchema({
        toolCallTokens: numberSchema().int(),
        toolResultTokens: numberSchema().int(),
        attachmentTokens: numberSchema().int(),
        assistantMessageTokens: numberSchema().int(),
        userMessageTokens: numberSchema().int(),
        redirectedContextTokens: numberSchema().int(),
        unattributedTokens: numberSchema().int(),
        toolCallsByType: array(
          objectSchema({
            name: stringSchema(),
            callTokens: numberSchema().int(),
            resultTokens: numberSchema().int(),
          }),
        ),
        attachmentsByType: array(
          objectSchema({
            name: stringSchema(),
            tokens: numberSchema().int(),
          }),
        ),
      }).optional(),
      apiUsage: objectSchema({
        input_tokens: numberSchema().int(),
        output_tokens: numberSchema().int(),
        cache_creation_input_tokens: numberSchema().int(),
        cache_read_input_tokens: numberSchema().int(),
      }).nullable(),
    }).describe(
      "Breakdown of current context window usage by category (system prompt, tools, messages, etc.).",
    ),
  );
  SDKMcpCallMcpCallMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("mcp_call"),
      tool: stringSchema().describe(
        "Fully-qualified MCP tool name, e.g. mcp__server__tool_name. Plugin-hosted servers are ordinary MCP servers here \u2014 e.g. mcp__plugin_documents_docs__doc_export (server names are normalized: non-[a-zA-Z0-9_-] becomes _).",
      ),
      arguments: record(stringSchema(), unknown())
        .optional()
        .describe(
          `Tool arguments. When input_files/output_files are declared, any string VALUE that exactly equals "{{in:NAME}}" or "{{out:NAME}}" (whole string, not a substring) is replaced with the worker-chosen absolute path of that named staged file before the call; a token naming no declared file fails the request with staging error_code=tool_error, and every declared output's "{{out:NAME}}" token must appear in arguments (the substituted path is the only way the tool learns where to write, so an unreferenced output fails the request before the tool runs). With no files declared \u2014 including expires_at/timeout_ms-only staged calls \u2014 passed through unchanged.`,
        ),
      expires_at: stringSchema()
        .optional()
        .describe(
          "RFC3339 deadline, REQUIRED when output_files are declared (a stale buffered drain must not overwrite rows written since). Sending expires_at routes the call through the staging engine, same as timeout_ms \u2014 the response gains a staging result. UNDELIVERED requests buffer durably and drain after reattach; a drain past this instant is dropped with staging error_code=expired instead of executing stale. Once delivered to a live worker the request is acked immediately and never redelivered \u2014 a worker killed mid-run surfaces as a missing response (apply your own deadline), not a later drain. An unparseable value is treated as already expired (fail closed).",
        ),
      timeout_ms: numberSchema()
        .optional()
        .describe(
          "Tool-execution timeout (staging and collection have their own transport timeouts). Clamped to [1000, 600000]; default 120000. Sending timeout_ms routes the call through the staging engine \u2014 so it is always enforced when present and the response carries a staging result; omit it for a plain call. Staged calls are POSIX-worker-only: on a Windows worker any staged-field call fails with a typed staging refusal.",
        ),
      result_not_for_model: booleanSchema()
        .optional()
        .describe(
          "The caller hands the result to a program (a host that renders it, a script), not to a model, and bounds it itself. content is then the server's own content blocks as MCP defines them (the MCP SDK drops members it does not define), not what a model turn would be handed: no image is resized or put in the Messages API's shape, nothing is saved under tool-results, no embedded resource is flattened, and text blocks beside structuredContent stay. They are untrusted third-party data: any mimeType, images neither re-encoded nor bounded in pixels, each block's annotations and _meta unfiltered. The size check that protects a model's context is skipped too: no count_tokens request (which uploads the result), no truncation, no note in place of the content. Instead a result over 10485760 characters (content with its base64, structuredContent and _meta together) fails though the tool ran: a plain call answers the error subtype, a staged call staging.error_code tool_error with the text in detail, before its outputs are collected. A legacy toolResult still comes back as a string. Does not route the call through the staging engine. Absent or false: as before. Honoured only for a host on this process's own pipes, not over a remote transport nor on a lane that redacts what it persists. Feature-detected as `mcp_call_result_not_for_model_v1` in system/init.capabilities and in the initialize response's capabilities; where it is not said, and by a CLI without it, the member is ignored.",
        ),
      input_files: array(
        objectSchema({
          name: stringSchema()
            .regex(/^[A-Za-z0-9_-]{1,64}$/)
            .describe('Handle referenced from arguments as "{{in:NAME}}". Unique within the request.'),
          lane_path: stringSchema().describe(
            "Synced-file lane row to stage, e.g. /working/.cowork/originals/a.docx. A missing row fails with staging error_code=input_missing; the etag actually staged is echoed back in staging.inputs_used.",
          ),
        }),
      )
        .max(64)
        .optional()
        .describe(
          "Declaring input_files or output_files makes this a STAGED call: rows are fetched from the synced-file lane into a private per-request temp dir the WORKER chooses (random, per-UID \u2014 the caller never sees or computes paths; it references files via tokens in arguments), the tool runs, and declared outputs are written back as lane rows (durable-at-ack PUT). The response then carries a `staging` result the caller switches on.",
        ),
      output_files: array(
        objectSchema({
          name: stringSchema()
            .regex(/^[A-Za-z0-9_-]{1,64}$/)
            .describe(
              'Handle referenced from arguments as "{{out:NAME}}" \u2014 the tool is told (via the substituted path) where to write; the worker collects from exactly that path. Unique within the request.',
            ),
          lane_path: stringSchema().describe(
            "Synced-file lane row to write, e.g. /working/report.cd. Unique within the request (two outputs on one row would self-conflict under CAS). Outputs over the 25 MiB lane cap fail with staging error_code=output_too_large.",
          ),
          if_match: stringSchema()
            .min(1)
            .optional()
            .describe(
              "Opaque lane etag the output row must still carry for the write to land (CAS). Omitted = unconditional last-writer-wins (an empty string is rejected, not treated as unconditional). A row that moved since fails that output with staging error_code=output_conflict and the requested bytes are not written. Redelivery of a completed CAS write re-runs and conflicts with its own prior write \u2014 treat output_conflict on a retry as possible-prior-success and reconcile by etag.",
            ),
        }),
      )
        .max(64)
        .optional(),
    }).describe(
      "Invokes an MCP tool via the subprocess MCP client without a model turn. No permission check (control channel is trusted, same as other " +
        'subtypes). SDK-type MCP servers (config.type === "sdk") are rejected \u2014 ' +
        "they are caller-provided, so the caller can invoke them directly without the subprocess round-trip. Result content passes through the same processing as model-turn MCP calls, unless result_not_for_model is set. Session expiry is not retried automatically; callers can mcp_reconnect and retry. UrlElicitationRequired (-32042) tries Elicitation hooks; if no hook " +
        "resolves, the call errors with the URL in the message \u2014 open it " +
        "out-of-band, then retry mcp_call. " +
        'STAGED calls (input_files/output_files declared) additionally stage lane rows in/out around the call \u2014 see the input_files describe. Staged failures come back as a success-subtype response whose staging field carries a typed error_code; subtype:error is emitted only when the call could not be attempted at all (server not connected, kill switch, dispatch failure) and means nothing ran. A target server that is not yet connected is brought up on demand: dispatch runs the deferred plugin/MCP startup resolution (the work a first model turn would have done) and waits up to 30s \u2014 shortened by expires_at when that is sooner \u2014 for the server to connect before answering "MCP server not connected", so a dispatch that races plugin startup (e.g. after an idle-wake reattach) succeeds instead of failing until a turn runs. Standard RPC semantics: a redelivered request_id supersedes the in-flight run (it is aborted and its response suppressed \u2014 exactly one response per request_id); conversion is idempotent, so re-running is safe. Cancellable via control_cancel_request.',
    ),
  );
});
//@ chunk-7kayq7nc.js:646655-745337 placement
/**
 * SDK 控制协议 schema 第二部分：cancel_async_message、rewind、cloud session、插件/技能对话框等控制请求与响应。
 */
var SDKControlMcpCallResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SDKRewindFilesRewindFilesMessageSchema;
var SDKControlRewindFilesResponseSchema;
var SDKCancelAsyncMessageCancelAsyncMessageMessageSchema;
var CancelAsyncMessageResponseSchema;
var PathAnchorSchema;
var SDKReadFileReadFileMessageSchema;
var ReadFileResponseSchema;
var SDKListDirectoryListDirectoryMessageSchema;
var ListDirectoryResponseSchema;
var DiffHunkSchema;
var SDKGetWorkspaceDiffGetWorkspaceDiffMessageSchema;
var WorkspaceDiffResponseSchema;
var SDKGetPlanGetPlanMessageSchema;
var PlanResponseSchema;
var SDKSeedReadStateSeedReadStateMessageSchema;
var SDKHookCallbackHookCallbackMessageSchema;
var INSTANCE_ID_PATTERN;
var EVENT_NAME_PATTERN;
var regExp;
var regExp_2;
var regExp_3;
var SHA256_HEX_RE;
var BASE64_BODY_RE;
var VISIBLE_TEXT_RE;
var MAX_PATH_CHARS;
var DeviceHookEntrySchema;
var DeviceHookTemplateSchema;
var DeviceHookSkipsSchema;
var SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema;
var DeviceHookTemplateOutcomeSchema;
var SAFE_RELATIVE_SEGMENT_PATTERN;
var regExp_4;
var DeviceHookLocationSchema;
var RegisterDeviceHooksResponseSchema;
var SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema;
var UploadDeviceHookTemplateResponseSchema;
var SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema;
var RemoteToolsAnnounceResponseSchema;
var CallToolResultSchema;
var SDKRemoteToolCallRemoteToolCallMessageSchema;
var RemoteToolCallResponseSchema;
var SDKRemotePlumbingCallRemotePlumbingCallMessageSchema;
var RemotePlumbingCallResponseSchema;
var SDKRemoteToolsProbeRemoteToolsProbeMessageSchema;
var RemoteToolsProbeResponseSchema;
var SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema;
var SDKTurnHandoffTurnHandoffMessageSchema;
var TurnHandoffResponseSchema;
var SDKMcpMessageMcpMessageMessageSchema;
var McpMessageResponseSchema;
var SDKMcpSetServersMcpSetServersMessageSchema;
var SetMcpServersResponseSchema;
var SDKReloadPluginsReloadPluginsMessageSchema;
var ReloadPluginsResponseSchema;
var SDKReloadSkillsReloadSkillsMessageSchema;
var ReloadSkillsResponseSchema;
var SDKReloadOutputStylesReloadOutputStylesMessageSchema;
var ReloadOutputStylesResponseSchema;
var SDKRegisterRepoRootRegisterRepoRootMessageSchema;
var RegisterRepoRootResponseSchema;
var SDKSetCwdSetCwdMessageSchema;
var SetCwdResponseSchema;
var SDKClaimSessionClaimSessionMessageSchema;
var ClaimSessionResponseSchema;
var SDKMcpReconnectMcpReconnectMessageSchema;
var SDKMcpToggleMcpToggleMessageSchema;
var SDKMcpReadResourceMcpReadResourceMessageSchema;
var McpReadResourceResponseSchema;
var SDKSetMcpPermissionModeOverrideSetMcpPermissionModeOverrideMessageSchema;
var deviceIdSchema;
var SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema;
var SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema;
var SDKStopTaskStopTaskMessageSchema;
var SDKBackgroundTasksBackgroundTasksMessageSchema;
var BackgroundTasksResponseSchema;
var SDKGetTaskOutputGetTaskOutputMessageSchema;
var GetTaskOutputResponseSchema;
var SDKStartShellTaskStartShellTaskMessageSchema;
var StartShellTaskResponseSchema;
var SDKApplyFlagSettingsApplyFlagSettingsMessageSchema;
var SDKGetSettingsGetSettingsMessageSchema;
var SDKUpdateSettingsUpdateSettingsMessageSchema;
var GetSettingsResponseSchema;
var SDKGetHooksListingGetHooksListingMessageSchema;
var GetHooksListingResponseSchema;
var SDKListPermissionRulesListPermissionRulesMessageSchema;
var RuleReadingSchema;
var PermissionRuleSchema;
var WorkspaceDirectorySchema;
var PermissionRulesStateSchema;
var ListPermissionRulesResponseSchema;
var SDKElicitationElicitationMessageSchema;
var ElicitationResponseSchema;
var SDKRequestUserDialogRequestUserDialogMessageSchema;
var UserDialogResponseSchema;
var SDKSubmitFeedbackSubmitFeedbackMessageSchema;
var SubmitFeedbackResponseSchema;
var SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema;
var SDKRemoteControlWorkSecretRemoteControlWorkSecretMessageSchema;
var RemoteControlWorkSecretResponseSchema;
deferInit("chunk-7kayq7nc.js:646655", () => {
  SDKControlMcpCallResponseSchema = DoctorLazy(() =>
    objectSchema({
      content: unknown(),
      structuredContent: record(stringSchema(), unknown()).optional(),
      _meta: record(stringSchema(), unknown())
        .optional()
        .describe(
          "The result's own `_meta`, minus the server's keys under the CLI-reserved `com.anthropic/` prefix. Absent when nothing is left. The `_meta` of a block inside `content` is not filtered.",
        ),
      staging: union([
        objectSchema({
          ok: literal(true),
          outputs: array(
            objectSchema({
              lane_path: stringSchema(),
              etag: stringSchema().describe("Opaque lane etag returned by the durable-at-ack PUT."),
              bytes: numberSchema().int(),
            }),
          ),
          inputs_used: array(
            objectSchema({
              lane_path: stringSchema(),
              etag: stringSchema(),
            }),
          ).describe("Lane etag each staged input actually carried."),
        }),
        objectSchema({
          ok: literal(false),
          error_code: _enum([
            "expired",
            "input_missing",
            "output_too_large",
            "output_conflict",
            "timeout",
            "tool_error",
          ]),
          detail: stringSchema().describe(
            "Plain-text detail for the requesting client. May carry user-document content (tool output, lane paths) \u2014 surface it to the user where helpful, but do not log it verbatim or feed it to analytics.",
          ),
          retryable: booleanSchema()
            .optional()
            .describe(
              "Present when the failure class is known (lane transport verdict, CAS rejection): true = safe to re-drive with the same request_id, false = deterministic. Absent = unknown; treat as non-retryable and switch on error_code.",
            ),
        }),
      ])
        .optional()
        .describe(
          "Present exactly when the request used any staged-call field (input_files, output_files, expires_at, timeout_ms) \u2014 such calls run through the staging engine even with no files, so expires_at is always honored. The error_code set is a stable cross-repo contract \u2014 extend it, never rename or repurpose members. A failure makes no guarantee about partial effects: earlier outputs may already have landed; retry with the same request_id is safe for outputs without if_match (unconditional PUTs re-land the same bytes), while if_match outputs surface output_conflict against their own prior write \u2014 reconcile by etag. On staged failures the tool may never have run, so content/structuredContent may be absent.",
        ),
    }).describe(
      "MCP tool result \u2014 the content array, structuredContent, and _meta " +
        "from CallToolResult. Unless the request set result_not_for_model, content passes through the same processing as model-turn MCP calls (large results may be truncated or redirected to a file). Caller interprets. Staged calls additionally carry a `staging` result.",
    ),
  );
  SDKRewindFilesRewindFilesMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("rewind_files"),
      user_message_id: stringSchema(),
      dry_run: booleanSchema().optional(),
    }).describe("Rewinds file changes made since a specific user message."),
  );
  SDKControlRewindFilesResponseSchema = DoctorLazy(() =>
    objectSchema({
      canRewind: booleanSchema(),
      error: stringSchema().optional(),
      filesChanged: array(stringSchema()).optional(),
      insertions: numberSchema().int().optional(),
      deletions: numberSchema().int().optional(),
      skippedLinks: numberSchema().optional().describe(SKIPPED_LINKS_DESCRIPTION),
    }).describe("Result of a rewindFiles operation."),
  );
  SDKCancelAsyncMessageCancelAsyncMessageMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("cancel_async_message"),
      message_uuid: stringSchema(),
    }).describe(
      "Drops a pending async user message from the command queue by uuid. No-op if already dequeued for execution. Also a no-op, on a worker that recognises held messages, for the queued re-run of an interrupted turn while that re-run also answers for other client messages, which cancelling it would close though nobody withdrew them; see the response.",
    ),
  );
  CancelAsyncMessageResponseSchema = DoctorLazy(() =>
    objectSchema({
      cancelled: booleanSchema(),
    }).describe(
      "Result of a cancel_async_message operation. cancelled=false means the message was not in the queue (already dequeued or never enqueued), or that the request was declined: the uuid is that of the re-run of an interrupted turn which has still to end and also answers for other client messages. The re-run then goes on, and its result names the message. It is not declined once an interrupt that was for that re-run (one without for_user_message_uuids, or one that names a message that the re-run carries; not a send_now, and not the interrupt that a session service sends by itself when a computer is linked) has listed the uuid under still_queued: the re-run is then cancelled, and those other messages with it, each with a terminal cancelled lifecycle.",
    ),
  );
  PathAnchorSchema = DoctorLazy(() =>
    discriminatedUnion("kind", [
      objectSchema({
        kind: literal("workspace_root"),
      }),
      objectSchema({
        kind: literal("diff_root"),
      }),
      objectSchema({
        kind: literal("repo"),
        repo: stringSchema().describe("A repository, as owner/name."),
      }),
      objectSchema({
        kind: literal("as_written").describe(
          'For a path copied from one of Claude\'s replies, which may be relative to the cwd of an earlier moment or to the root of the repository, or may lack its leading directories. Send it only to a session whose newest system/init lists the capability read_file_as_written_v1, and send the text without a line suffix (`:12`, `#L12`) or URL scheme. The session tries the text against the live cwd, the git root above that and its working directories. If no file is there, it looks below them for a file whose path ends in the text, among the paths its file state has held: those the file tools of the main conversation have read or written since the process started, or in the transcript it started from, and what a host has seeded or staged. A file that only a sub-agent touched is not among them, nor one that only a shell command touched, unless the command did nothing but print single files plainly (`cat f`, `head f`, `sed -n 1,9p f` and the like, or a lone `grep` that matches), with no pipe or redirect. If none of those paths ends in the text, some sessions on Linux then search the files below their working directories for one whose path ends in it, skipping `.git` and `node_modules` and following no symbolic link. It reads a file only when exactly one fits or, of several that fit a directory, exactly one is among those paths. The response\'s `absPath` names the file read. Show that path: the file can be a namesake of the one meant. A text that is `~` or starts with `~/`, a text that fits no file or several, a file found in none of the folders of `within`, and a look-up that could not be finished are refused. From such a session a refusal is final for the `within` it was asked with: asking again with a directory of the client\'s own choosing would turn "two files fit" into "the first one wins". A CLI that has `anchor` but predates this kind refuses it.',
        ),
        within: array(stringSchema()).describe(
          "The folders the client will show a file from: 1 to 512 absolute, normalized paths of at most 4,096 characters, such as the `cwd` that system/init gave. Required: without it, or with one entry that is unfit, the request is refused. The look-up is the same whatever they are. The one file it settles on is read and named only if its path is one of them or lies below one, by its spelling alone (no symbolic link followed, no case folded; `/` holds nothing); else the request is refused as any other. So they can only narrow what is answered.",
        ),
      }),
    ]).describe(
      "@internal How read_file finds the file a relative path names: a directory to resolve it against, or a look-up of the one file the text can mean (as_written).",
    ),
  );
  SDKReadFileReadFileMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("read_file"),
      path: stringSchema(),
      max_bytes: numberSchema().optional(),
      encoding: _enum(["utf-8", "base64"])
        .optional()
        .describe(
          "How to encode the bytes in `contents`. Defaults to utf-8 (lossy for binary); pass 'base64' to read images.",
        ),
      anchor: PathAnchorSchema()
        .optional()
        .describe(
          "@internal How to find the file `path` names, instead of resolving it against the live cwd, which a `cd` in the shell moves. workspace_root, diff_root and repo each name a directory the session looks up on each request; as_written names none, and has its contract in its own description. workspace_root is the root list_directory lists from. diff_root is the repository get_workspace_diff diffs, so a path taken from that diff opens the file the diff shows. It is refused in a session whose diff follows the shell's cwd between several repositories; a client that knows the repository should send `repo`. repo is the checkout the session declares for that repository or, failing that, diff_root when its origin remote ends in that owner/name. With those three, `path` must stay inside that directory as spelled (the check follows no symlink). Whatever the anchor, the read is gated as any other read_file is. A path that is `~`, starts with `~/` or leaves that directory, or an anchor the session cannot resolve or does not serve, is refused with the error `read denied: <path>`. Leave the field out when there is no anchor: null is refused. A CLI that predates this field ignores it and reads against the live cwd; the response's `anchor` tells the two apart.",
        ),
    }).describe(
      "Read a file from the session filesystem for the remote sidebar viewer. Path is resolved against cwd by default and gated by the same read-permission rules as the Read tool.",
    ),
  );
  ReadFileResponseSchema = DoctorLazy(() =>
    objectSchema({
      contents: stringSchema(),
      absPath: stringSchema(),
      truncated: booleanSchema().optional(),
      encoding: literal("base64")
        .optional()
        .describe(
          "Set when the request asked for base64. Absent means utf-8 \u2014 including when an older CLI ignored the request's encoding field.",
        ),
      lossy: booleanSchema()
        .optional()
        .describe(
          "Present on every utf-8 answer. True when the bytes read were not all valid UTF-8, so `contents` has U+FFFD where bytes were replaced and is not the file's own text: a binary file, text in another encoding, or a read cut inside a character when `truncated` is set. False when `contents` is exactly the bytes read, decoded, even if the file itself contains U+FFFD. Absent on a base64 answer, which is exact, and from an older CLI or tool container: a client that sees neither this nor `encoding: 'base64'` cannot tell whether `contents` is exact.",
        ),
      anchor: _enum(["workspace_root", "diff_root", "repo", "as_written"])
        .optional()
        .describe(
          "@internal The kind of the request's `anchor`, set when the file was found by it. Absent when the request sent no anchor, or when an older CLI ignored it and read against the live cwd.",
        ),
    }).describe("File contents for the remote sidebar viewer."),
  );
  SDKListDirectoryListDirectoryMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("list_directory"),
      path: stringSchema().describe(
        'Directory to list, relative to the workspace root: the project root of the session, which is the directory the session was started in or, for a worker started ahead of its session, claimed for. A `cd` in the shell, entering a worktree, or a set_cwd after the first turn does not move it. "" or "." lists the root itself. "/" is the only separator and 1024 UTF-16 code units the most. Absolute, drive, UNC and ".." paths are refused as invalid_path, and so is a path with a backslash: a name that contains one cannot be listed. Some other names are refused as unsupported_name, for example one that ends in a dot or a space.',
      ),
    }).describe(
      '@internal List the direct children (names and kinds) of one directory below the workspace root of a remote session on Linux (every cloud session; a self-hosted runner on Linux). One level per request, no file contents. No symlink is followed: a path through or to a symlink is refused. A directory that a Read deny rule or a Read ask rule covers is refused, and such children are left out: the request cannot ask anyone. A directory whose every child is left out answers an empty listing, as an empty directory does. A refusal is the control error `list denied: <code>`, with code one of invalid_path, unsupported_name, symlink_in_path (a symlink at the workspace root or below it), path_not_canonical (a symlink above it, or a directory of the path was moved or removed while it was read; after either of these two codes the same request can succeed when it is sent again, if the tree changed), read_rule, not_found, not_a_directory, os_permission_denied, workspace_moved (the session works in a worktree or another directory now; this can last until the worker is restarted), unexpected_error. A rule for the whole Read tool refuses every listing as read_rule. Any other error text means the request was not served at all: the unsupported-subtype error below, `not_claimed` from a worker that is started but not yet claimed for a session, or the refusal of a client in between that does not know the request. Any other session, and a remote session on macOS, on Windows or under WSL, refuses the request as an unsupported subtype, as an older CLI does (the wording differs between a headless session and the Remote Control bridge). A remote session on Linux answers the same way while the request is switched off remotely; the switch is read for each request, so that answer can change within a session. To open a listed entry, send read_file the listed path, "/" and the entry name (the name alone when the listed path is ""), with `anchor` workspace_root. A response without `anchor` comes from a CLI that predates it, which read that relative path against the live cwd (a `cd` in the shell moves it), so it may be another file; for such a CLI, send an absolute path: the `cwd` of the first system/init message of the session, then the listed path, then the entry name. When the `absPath` of the listing starts with "/", that `absPath`, then "/", then the entry name is such a path too. Every later system/init carries the live cwd, not the root. A session whose system/init carries an empty `cwd` names no root to build that path from.',
    ),
  );
  ListDirectoryResponseSchema = DoctorLazy(() =>
    objectSchema({
      absPath: stringSchema().describe(
        'The directory that was listed, as an absolute path: the workspace root, then the request path, so "" gives the root itself. A `cd` in the shell does not move it. Exception: a lane that redacts what it persists (a Remote Control bridge worker, a tenant worker) gets the request path as it was sent, which is never absolute. An older CLI that answers list_directory leaves the field out: the path is then built as the request text says, from the `cwd` of the first system/init message and the request path.',
      ),
      entries: array(
        objectSchema({
          name: stringSchema(),
          isDirectory: booleanSchema().describe(
            "False for a symlink, whatever it points to: a symlink is a leaf of the tree and cannot be listed. False for a special entry too.",
          ),
          isSymlink: booleanSchema()
            .optional()
            .describe("Present and true only for a symlink. The target is never read or returned."),
          isSpecial: booleanSchema()
            .optional()
            .describe(
              "Present and true only for an entry that is not a file, a directory or a symlink: a FIFO, a socket or a device. read_file does not open it. The kind is the one the directory records: for a name that something is mounted over, that is the kind of what lies underneath.",
            ),
        }),
      ),
      truncated: booleanSchema().describe(
        "True when entries were left out for their number. The listing is cut at the cap of 5000 entries for one response, after the sort by name, so the ones kept are the first in that order. In a directory with more than 50000 children the rest is dropped before the sort and before the Read rules hide any, so fewer than 5000 entries can come with it. False when no entry is returned, whatever the number of children: a listing of nothing but hidden children is the listing of an empty directory.",
      ),
    }).describe(
      "@internal The direct children of the requested directory, sorted by name with plain string comparison (uppercase before lowercase), not by locale.",
    ),
  );
  DiffHunkSchema = DoctorLazy(() =>
    objectSchema({
      oldStart: numberSchema().int(),
      oldLines: numberSchema().int(),
      newStart: numberSchema().int(),
      newLines: numberSchema().int(),
      lines: array(stringSchema()),
    }).describe("@internal One unified-diff hunk of the get_workspace_diff response."),
  );
  SDKGetWorkspaceDiffGetWorkspaceDiffMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_workspace_diff"),
    }).describe(
      "@internal Requests the workspace diff for the thin-client /diff dialog. The worker resolves one base ref for both stats and hunks (the merge-base with the base branch the session names, else the default branch, when HEAD is on another branch with commits beyond it, so committed and uncommitted changes show together, uncommitted rows first; otherwise working tree vs HEAD) and applies the standard caps (5s git timeout, 50 files, 1MB/file).",
    ),
  );
  WorkspaceDiffResponseSchema = DoctorLazy(() =>
    objectSchema({
      diff: objectSchema({
        stats: objectSchema({
          filesCount: numberSchema().int(),
          linesAdded: numberSchema().int(),
          linesRemoved: numberSchema().int(),
        }),
        perFileStats: array(
          objectSchema({
            path: stringSchema(),
            added: numberSchema().int(),
            removed: numberSchema().int(),
            isBinary: booleanSchema(),
            isUntracked: booleanSchema(),
            status: _enum(["added", "modified", "removed", "renamed", "copied"])
              .optional()
              .describe(
                "How the file changed, in the same comparison as this row's added and removed counts: added, removed, renamed, copied, or modified (anything else, mode changes included). A move git's rename detection misses, such as one to a file not yet added to git, arrives as removed plus added. Absent from Claude Code versions that predate it, and on the rare reply whose git status lines don't line up with its counts; treat an unknown or absent value as modified.",
              ),
            previousPath: stringSchema()
              .optional()
              .describe(
                "Renamed and copied rows: the old path as plain text, for display only. Absent, with newPath, when either name holds a character the CLI's path display refuses (controls, bidi and format characters, default-ignorables, non-ASCII spaces, U+FFFD) or could be read as another path (a backslash, a drive prefix or leading slash, a '..' part, ' => ').",
              ),
            newPath: stringSchema()
              .optional()
              .describe(
                "The path as plain text where it differs from path: the new path of a renamed or copied row (whose path is git's rename form), or the name of a row git quoted (a name with non-ASCII or special characters); for display only, never to join to a directory. Absent otherwise, and for the names previousPath lists.",
              ),
          }),
        ),
        hunks: array(
          objectSchema({
            path: stringSchema(),
            hunks: array(DiffHunkSchema()),
          }),
        ).describe(
          "Diff text by path. A perFileStats row can have no entry here and be in neither skippedLarge nor restricted; it keeps its stats. Such rows include: a binary or untracked file; a symlink in the base commit; a submodule; a file under a git filter or working-tree-encoding; an index entry marked skip-worktree or assume-unchanged whose file on disk is not what the entry holds; and a file whose path on disk cannot be proven to be the one git listed, which is one reached through a link or junction, or, on a volume blind to letter case or Unicode form (macOS and Windows by default), one whose name or folder is spelled otherwise on disk than in git's index.",
        ),
        skippedLarge: array(stringSchema()).describe(
          "Paths whose diff text exceeded the per-file or aggregate size cap, so they have stats but no hunks.",
        ),
        restricted: array(stringSchema()).describe(
          "Paths whose hunk content was withheld by the diff surface's content-provenance gate: read-permission rules (same gate as read_file) plus this surface's stricter file-identity checks (symlink and hardlinked worktree files are refused here even where read_file serves them; so is a path that git diff lists as changed but that git holds in neither the diff's base commit nor the index). Stats remain visible.",
        ),
        source: union([
          objectSchema({
            kind: literal("working-tree"),
          }),
          objectSchema({
            kind: literal("branch"),
            baseBranch: stringSchema(),
            baseRef: stringSchema(),
          }),
        ]),
      }).nullable(),
      noDiffReason: _enum([
        "no-repository",
        "repository-refused",
        "repository-busy",
        "diff-failed",
        "root-moved",
      ])
        .optional()
        .describe(
          "Why diff is null. Sent with every null diff, never with a diff. no-repository: no repository that could be used was found for the session's folder (today only git repositories are looked for), or an earlier check this session ruled the folder out. repository-refused: the repository chosen in a subfolder failed Claude Code's safety checks (in git: on its .git folder and on the copy Claude Code makes of its config and refs), or that copy could not be made. repository-busy: the repository is part-way through bringing in other changes (in git: a merge, rebase, cherry-pick or revert). diff-failed: a version-control command failed or timed out, or, for a repository chosen in a subfolder on a self-hosted runner, the comparison Claude Code makes itself in place of git diff could not read the repository or ran out of time. root-moved: the repository root changed, or could not be read again, during the request. Every value can change on a later request, so ask again; after no-repository, asking when a turn ends and on a new connection is enough. A Claude Code version that predates the field omits it: treat an absent or unknown value as 'ask again'.",
        ),
    }).describe(
      "@internal Workspace diff for the thin-client /diff dialog. diff is null when no diff could be made; noDiffReason says why. Paths in skippedLarge carry no hunks entry at all \u2014 membership alone marks them as too large. An entirely empty hunks array with non-empty perFileStats is not by itself a failure signal: it is the normal shape when all changes are untracked (stats only: untracked files never carry hunks) or every file was withheld, and can also occur when the hunks fetch transiently failed and only stats are available.",
    ),
  );
  SDKGetPlanGetPlanMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_plan"),
    }).describe(
      "@internal Read the session's current plan-mode plan. Unlike read_file, the caller does not need to know the plan file's path \u2014 the worker resolves its own plan slug. Never creates a plan slug or file.",
    ),
  );
  PlanResponseSchema = DoctorLazy(() =>
    objectSchema({
      exists: booleanSchema(),
      content: stringSchema().optional().describe("Plan markdown. Present iff exists is true."),
      path: stringSchema()
        .optional()
        .describe(
          "Absolute plan-file path on the session filesystem. Present when exists is true, except on connections that persist frames server-side (the local bridge-worker lane omits it; the plan content still ships).",
        ),
    }).describe("@internal The current plan, or exists:false when none has been written."),
  );
  SDKSeedReadStateSeedReadStateMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("seed_read_state"),
      path: stringSchema(),
      mtime: numberSchema(),
    }).describe(
      "Seeds the readFileState cache with a path+mtime entry. Use when a prior Read was removed from context so Edit validation would fail despite the client having observed the Read. The mtime lets the CLI detect if the file changed since the seeded Read \u2014 same staleness check as the normal path.",
    ),
  );
  SDKHookCallbackHookCallbackMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("hook_callback"),
      callback_id: stringSchema(),
      input: HookInputUnionSchema(),
      tool_use_id: stringSchema().optional(),
      issued_at: numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "@internal Epoch milliseconds on the sender's clock when this request was issued \u2014 informational only: a device client judges staleness by how long the delivery waited on the session service's clock (the age its stream stamps on the event) against deadline_ms, never by this value against its own clock, and answers a stale delivery fail-safe (a guard answers 'retry') rather than leaving it unanswered. Optional and additive on the public hook_callback wire; hosts that do not know it ignore it.",
        ),
      deadline_ms: numberSchema()
        .int()
        .positive()
        .optional()
        .describe(
          "@internal How long after issued_at, in milliseconds, the sender waits before proceeding without an answer. Lets a device client skip or stop work whose answer can no longer be heard. Absent = no deadline known. Optional and additive on the public hook_callback wire.",
        ),
    }).describe("Delivers a hook callback with its input data."),
  );
  INSTANCE_ID_PATTERN = "[A-Za-z0-9][A-Za-z0-9._-]{0,63}";
  EVENT_NAME_PATTERN = "[A-Za-z]{1,64}";
  regExp = new RegExp(`^${INSTANCE_ID_PATTERN}$`);
  regExp_2 = new RegExp(`^${EVENT_NAME_PATTERN}$`);
  regExp_3 = new RegExp(`^${INSTANCE_ID_PATTERN}/${EVENT_NAME_PATTERN}/\\d{1,4}$`);
  SHA256_HEX_RE = /^[0-9a-f]{64}$/;
  BASE64_BODY_RE = /^[A-Za-z0-9+/]*={0,2}$/;
  VISIBLE_TEXT_RE = /^[^\p{Cc}\p{Cf}\u2028\u2029]+$/u;
  MAX_PATH_CHARS = 4096;
  DeviceHookEntrySchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema()
        .regex(regExp_3)
        .describe(
          `@internal "<instance_id>/<event>/<index>", index being the entry's position within that event's forwarded list at capture. The schema checks the shape only; matching the instance_id prefix to the request is the receiver's job. Echoed back verbatim as hook_callback.callback_id; never reused for a different hook within one instance.`,
        ),
      event: stringSchema()
        .regex(regExp_2)
        .describe(
          "@internal Hook event name. A plain string rather than the HookEvent enum so an older worker tolerates an event it does not know: it ignores that entry instead of rejecting the whole registration.",
        ),
      matcher: stringSchema()
        .max(512)
        .optional()
        .describe(
          "@internal The settings matcher, verbatim, compiled by the worker exactly like a settings matcher; absent = all.",
        ),
      kind: _enum(["command", "http"]).describe(
        "@internal Hook kind on the device. prompt, agent and mcp_tool hooks are never forwarded; a new kind is a deliberate schema change.",
      ),
      timeout_s: numberSchema()
        .positive()
        .max(600)
        .optional()
        .describe(
          "@internal The hook's own timeout in seconds, when configured; the worker derives its deadline from it.",
        ),
      source: _enum(["user", "local", "flag"]).describe(
        "@internal Settings source on the device: user settings, the checkout's settings.local.json, or a --settings file.",
      ),
      has_condition: booleanSchema()
        .optional()
        .describe(
          "@internal The entry carries an if-condition, evaluated on the device; the condition text never leaves it.",
        ),
      target_pinned: booleanSchema()
        .optional()
        .describe(
          "@internal The device digested the hook's script at start-up and re-verifies those bytes before each run; the digest itself is not sent.",
        ),
      author_opt_in: booleanSchema()
        .optional()
        .describe(
          "@internal Runs at the hook author's explicit request (cloud: 'device' in its settings entry): it starts in the project folder, and its command may not be pinned to a script the session cannot change.",
        ),
    }).describe(
      "@internal One forwarded device hook: identity and routing data only \u2014 never a command line, URL, path, header or condition text.",
    ),
  );
  DeviceHookTemplateSchema = DoctorLazy(() =>
    objectSchema({
      template: stringSchema()
        .regex(regExp)
        .describe("@internal Built-in template id, looked up in the worker's own table."),
      digest: stringSchema()
        .regex(SHA256_HEX_RE)
        .describe(
          "@internal Lowercase hex sha256 of the template script version enabled on the device; the worker installs the template only when this equals its table's digest.",
        ),
      event: stringSchema().regex(regExp_2).describe("@internal Hook event name, as for inventory entries."),
      matcher: stringSchema()
        .max(512)
        .optional()
        .describe(
          "@internal The settings matcher, verbatim, compiled by the worker exactly like a settings matcher; absent = all.",
        ),
      timeout_s: numberSchema()
        .positive()
        .max(600)
        .optional()
        .describe("@internal Timeout in seconds, when configured."),
    }).describe(
      "@internal A vetted template the device has enabled, to run IN the container. Carries nothing executable: the worker derives the file and the command line from its own table.",
    ),
  );
  DeviceHookSkipsSchema = DoctorLazy(() =>
    objectSchema({
      after_edit: numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "@internal PostToolUse / PostToolUseFailure hooks whose matcher can only match file-writing tools. The worker never forwards after-edit events for those tools (the device copy of the file is stale or absent), so such a hook could never fire and is not sent.",
        ),
      kind_unsupported: numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe("@internal Hooks of a kind that is never forwarded: prompt, agent, mcp_tool."),
      plugin: numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe("@internal Hooks contributed by plugins, which this version does not forward."),
      managed: numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe("@internal Hooks from managed (policy) settings, which this version does not forward."),
      other: numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "@internal Every other hook not sent: on an event that is not forwarded, a duplicate of one already listed, or beyond a cap.",
        ),
    }).describe(
      "@internal Counts of this device's hooks that were not forwarded, for the session line. Each such hook is counted in exactly one field, the first that applies in this order: plugin or managed (by its source); other, when its event is not forwarded at all; kind_unsupported; after_edit; other again for anything else, such as a duplicate or an entry beyond a cap. Absent fields mean zero.",
    ),
  );
  SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("register_device_hooks"),
      instance_id: stringSchema()
        .regex(regExp)
        .describe(
          "@internal Minted once per device client process and stable across its reconnects and re-registrations; the owner key in the worker's store and the first segment of every hook id.",
        ),
      display_name: stringSchema()
        .min(1)
        .max(64)
        .regex(VISIBLE_TEXT_RE)
        .optional()
        .describe(
          "@internal What the session line calls the device: no control, format or line-separator characters (receivers still sanitize before display); the worker falls back to instance_id when absent.",
        ),
      lease_s: numberSchema()
        .int()
        .min(60)
        .max(3600)
        .optional()
        .describe(
          "@internal Requested lease in seconds (default 600); the worker caps it and returns the effective expiry. Re-send the request to renew; a repeat from the same instance replaces its entries.",
        ),
      worker_epoch: numberSchema()
        .int()
        .min(1)
        .optional()
        .describe(
          "@internal The worker life the device believes it addresses; a mismatch is answered with a stale_worker_epoch error.",
        ),
      hooks: array(DeviceHookEntrySchema())
        .max(128)
        .describe(
          "@internal The forwarded inventory. An empty array together with an empty templates array unregisters this instance; both keys are required so an omission is a parse error, not an unregister.",
        ),
      templates: array(DeviceHookTemplateSchema())
        .max(8)
        .describe("@internal Vetted templates enabled on the device, to run in the container."),
      held: DeviceHookSkipsSchema()
        .optional()
        .describe(
          "@internal How many of its hooks the device did not forward and why; informational, absent = none reported.",
        ),
    }).describe(
      "@internal Registers this device's hooks with the worker \u2014 unrelated to device registration or bind. Sent by a claude --cloud device client after it attaches to a cloud session (never as an initial event of the create): names, by opaque id, which of the user's own hooks the worker should ask this device to run over hook_callback, and which vetted templates to run in the container. The worker rejects requests over 64 KiB with invalid_registration. Error replies use the standard error response with a message that starts with a code token and a colon: hook_forwarding_disabled (off for this session; not retryable, nothing stored), hook_forwarding_not_ready (retry after a short backoff), invalid_registration, or stale_worker_epoch (re-read the worker epoch and re-send). A worker that predates the request answers with the usual unsupported-subtype error.",
    ),
  );
  DeviceHookTemplateOutcomeSchema = DoctorLazy(() =>
    objectSchema({
      template: stringSchema().regex(regExp),
      status: _enum([
        "installed",
        "awaiting_upload",
        "interpreter_unavailable",
        "install_failed",
        "unknown_template",
        "version_mismatch",
        "event_not_allowed",
        "disabled",
      ]),
    }).describe("@internal Outcome for one requested template."),
  );
  SAFE_RELATIVE_SEGMENT_PATTERN = String.raw`(?!\.\.?(?:\/|$))[^/\\\p{Cc}\p{Cf}\u2028\u2029]+`;
  regExp_4 = new RegExp(
    `^\\/(?:${SAFE_RELATIVE_SEGMENT_PATTERN}(?:\\/${SAFE_RELATIVE_SEGMENT_PATTERN})*\\/?)?$`,
    "u",
  );
  DeviceHookLocationSchema = DoctorLazy(() => ({
    project_dir: stringSchema()
      .max(MAX_PATH_CHARS)
      .regex(regExp_4)
      .describe(
        "@internal The container's project root, for path translation on the device: absolute, no '.' or '..' segments, no backslash, no control or format characters. Untrusted by the device all the same, which must containment-check every translated path.",
      ),
    cwd: stringSchema()
      .max(MAX_PATH_CHARS)
      .regex(regExp_4)
      .describe(
        "@internal The container's working directory at registration time, same shape as project_dir; may differ from it.",
      ),
    worker_epoch: numberSchema().int().min(1).describe("@internal The worker life that answered."),
  }));
  RegisterDeviceHooksResponseSchema = DoctorLazy(() =>
    discriminatedUnion("status", [
      objectSchema({
        status: literal("registered"),
        ...DeviceHookLocationSchema(),
        lease_s: numberSchema()
          .int()
          .min(1)
          .max(3600)
          .describe("@internal Effective lease in seconds after capping."),
        lease_expires_at: parseToolOutputSchema().describe(
          "@internal ISO 8601 UTC instant the lease expires (no offset), as Date.prototype.toISOString renders it.",
        ),
        accepted: numberSchema()
          .int()
          .nonnegative()
          .describe("@internal Forwarded entries installed as callbacks."),
        ignored: numberSchema()
          .int()
          .nonnegative()
          .describe(
            "@internal Entries not installed: event not forwarded by this worker, unknown kind, malformed, or duplicate id.",
          ),
        ignored_ids: array(stringSchema().regex(regExp_3))
          .max(128)
          .optional()
          .describe("@internal Ids of the ignored entries."),
        templates: array(DeviceHookTemplateOutcomeSchema())
          .max(8)
          .describe("@internal One row per requested template."),
        replaced_owner: stringSchema()
          .regex(regExp)
          .optional()
          .describe(
            "@internal instance_id of a different device client this registration displaced, if any.",
          ),
        away_since: parseToolOutputSchema()
          .optional()
          .describe(
            "@internal Present when THIS instance was being skipped as away (two forwarded runs went unanswered in a row) until this registration cleared it: the ISO 8601 UTC instant the worker stopped asking it. Absent for a first registration, a device that was never away, and a registration that displaces a different device.",
          ),
      }),
      objectSchema({
        status: literal("unregistered"),
        ...DeviceHookLocationSchema(),
        ignored_ids: array(stringSchema().regex(regExp_3))
          .max(128)
          .optional()
          .describe("@internal Ids of the ignored entries."),
        templates: array(DeviceHookTemplateOutcomeSchema())
          .max(8)
          .optional()
          .describe("@internal One row per requested template."),
      }),
    ]).describe(
      "@internal Success payload answering register_device_hooks: 'registered' while this instance holds entries and a lease; 'unregistered' when an empty inventory removed them, or when nothing it sent could be held (every entry ignored, no template stored or installed) \u2014 then ignored_ids and templates say why.",
    ),
  );
  SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("upload_device_hook_template"),
      template: stringSchema().regex(regExp).describe("@internal Built-in template id."),
      digest: stringSchema()
        .regex(SHA256_HEX_RE)
        .describe(
          "@internal Lowercase hex sha256 of the decoded content; must be one of the worker's own table digests for this template.",
        ),
      content_base64: stringSchema()
        .max(360000)
        .regex(BASE64_BODY_RE)
        .describe(
          "@internal The template script bytes, base64; decoded size must not exceed the template's cap (at most 256 KiB).",
        ),
      worker_epoch: numberSchema()
        .int()
        .min(1)
        .optional()
        .describe(
          "@internal The worker epoch the sender believes it is talking to; a mismatch is refused so the device starts over against the new worker.",
        ),
    }).describe(
      "@internal Sent by a claude --cloud device client BEFORE register_device_hooks for each vetted template it wants run in the container; a register that arrives first reports awaiting_upload and the device registers again after uploading. The worker keeps the bytes for its own life only after hashing them against its own table; nothing executable is taken from the wire. Idempotent. Errors: hook_forwarding_disabled | hook_forwarding_not_ready (retryable) | stale_worker_epoch | invalid_upload | template_refused: unknown_template, version_mismatch, too_large or digest_mismatch.",
    ),
  );
  UploadDeviceHookTemplateResponseSchema = DoctorLazy(() =>
    objectSchema({
      template: stringSchema().regex(regExp),
      digest: stringSchema().regex(SHA256_HEX_RE),
      status: _enum(["stored", "already_stored"]),
    }).describe("@internal Success payload answering upload_device_hook_template."),
  );
  SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("remote_tools_announce"),
      instance_id: stringSchema()
        .regex(regExp)
        .describe(
          "@internal Minted once per client process, stable across reconnects and re-announces: the owner key on the worker, which addresses its remote_tool_call requests to it. Same alphabet as register_device_hooks.instance_id.",
        ),
      worker_epoch: numberSchema()
        .int()
        .min(1)
        .optional()
        .describe(
          "@internal The worker life the client believes it addresses; a mismatch is answered with a stale_worker_epoch error.",
        ),
      host: record(stringSchema(), unknown()).describe(
        "@internal The machine's description in the remote-tool protocol's HostDescription shape (name, kind, platform, working_dir, project_sync, limits, claude_code_version, epoch \u2014 epoch is required on this channel); parsed by that protocol, not here.",
      ),
      tools: array(record(stringSchema(), unknown()))
        .max(16)
        .describe(
          "@internal The native tools the machine serves, one entry each: {name (Bash, Read, Write, Edit), refused_input_fields, protocol_versions, description?, input_schema?} in the remote-tool protocol's AnnouncedTool shape. Entries are validated one by one by that protocol (a bad one is reported back in ignored_tools, the rest stand), so they are not typed here.",
        ),
      passthrough: array(record(stringSchema(), unknown()))
        .max(1024)
        .describe(
          "@internal The machine's own MCP tools ('<server>__<tool>'), one entry each: {name, local_name, description?, input_schema, annotations?, hints?} in the protocol's AnnouncedPassthrough shape, validated one by one like tools (an entry the worker cannot present as announced, or one beyond the most it keeps, is reported back in ignored_tools; a list longer than 1024 entries is an invalid announce); a worker that adopts them presents them to the model and forwards their calls to the machine over this channel.",
        ),
      plumbing: array(stringSchema().min(1).max(64))
        .max(8)
        .describe(
          "@internal Plumbing tools the machine answers over remote_plumbing_call for the session's own machinery; never model-facing.",
        ),
    }).describe(
      "@internal Sent by a claude --cloud client that serves tools for this session: which machine it is and which tools it serves, replacing the device-bridge tools/list announcement. Re-sent on reconnect, on worker init and when what it serves changes; all three lists empty withdraws the machine (the keys are required so an omission is a parse error, not a withdrawal) \u2014 and from an instance the worker has not heard of, says the machine serves nothing. A first-party cloud worker acts on it only when the session service stamped the event as coming from a verified device of the account (device_attestation_status VERIFIED_BY_GATE or better); an announce below that floor is dropped unanswered. Errors (message starts with the code and a colon): remote_tools_disabled, remote_tools_not_ready (retryable), stale_worker_epoch, invalid_announce.",
    ),
  );
  RemoteToolsAnnounceResponseSchema = DoctorLazy(() =>
    objectSchema({
      status: _enum(["announced", "withdrawn"]),
      worker_epoch: numberSchema().int().min(1).optional(),
      protocol_version: numberSchema()
        .int()
        .positive()
        .nullable()
        .describe(
          "@internal The wire version the worker will speak with this machine, or null when they have none in common: the machine stays listed and nothing is forwarded to it.",
        ),
      tool_host_interface: objectSchema({
        version: numberSchema().int().min(1),
        min_version: numberSchema().int().min(1),
      })
        .optional()
        .describe(
          "@internal The versions of the ToolHost interface that the session speaks, from min_version up to version, on an 'announced' answer to an offer of tools. Absent from an older worker.",
        ),
      passthrough_adopted: numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "@internal Present on acknowledgements from a worker that adopts the machine's MCP tools over this channel: how many it kept from this announce (0 when it kept none \u2014 none carried, or none it could present; those are named in ignored_tools). Absent from a worker that does not adopt them (an older one, or one with adoption switched off) and while the worker cannot read the organisation's policy yet (passthrough_declined 'pending'); then the worker has taken none of these tools, and a machine connected to the device bridge keeps serving its MCP tools over it. Also absent from the reply to an announce marked 'still_here', and to one marked 'sleeping' when the worker reads that mark (any other worker answers it as an ordinary announce); such an announce changes nothing the worker took before.",
        ),
      passthrough_declined: _enum(["policy", "pending", "unavailable"])
        .optional()
        .describe(
          "@internal Why the worker adopted none of the machine's MCP tools this announce carried. 'policy': the organisation's MCP server policy blocks the device bridge's server (or, in a session without one, an address it could have), the session is in safe mode, or the session has no such server and the worker cannot work out the address that server would have (for example, outside a CCR session); passthrough_adopted is 0, and the machine need not re-announce those tools. 'pending': the organisation's managed settings are still loading, so the tools wait for the machine's next announce; passthrough_adopted is absent, and a machine connected to the device bridge keeps serving its MCP tools over it meanwhile. 'unavailable': sent only by older workers, which adopted none when the session had no server for the device bridge; passthrough_adopted is 0, and the machine need not re-announce those tools. Absent otherwise.",
        ),
      ignored_tools: array(stringSchema())
        .optional()
        .describe(
          "@internal Announced entries the worker did not adopt, at most 32 named: an unknown native name, a malformed or duplicate entry, or an MCP tool beyond the most it keeps, whose name it could not present as announced, whose name the session service keeps for itself, or whose input schema the API cannot take.",
        ),
      worker_capabilities: array(stringSchema())
        .max(32)
        .optional()
        .describe(
          "@internal Optional protocol features this worker reads, named only to a machine whose announce lists the matching host capability: 'still_here' \u2014 an announce marked 'still_here' is noted and nothing is taken from it. Absent from a worker that reads none of what the machine listed; the machine then sends none.",
        ),
    }).describe("@internal Success payload answering remote_tools_announce."),
  );
  CallToolResultSchema = DoctorLazy(() =>
    looseObject({
      content: array(unknown()),
      isError: booleanSchema().optional(),
      structuredContent: record(stringSchema(), unknown()).optional(),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  SDKRemoteToolCallRemoteToolCallMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("remote_tool_call"),
      instance_id: stringSchema()
        .regex(regExp)
        .describe(
          "@internal The announcement this call is addressed to (remote_tools_announce.instance_id). A client that did not announce under this id stays silent: another attached client may own it.",
        ),
      host: stringSchema()
        .max(64)
        .describe("@internal The machine's announced name; informational twin of instance_id."),
      name: stringSchema().min(1).max(256).describe("@internal The announced tool to run."),
      input: record(stringSchema(), unknown()).describe(
        "@internal The tool's own input, without the machine argument and without the envelope; {} for an outcome query.",
      ),
      envelope: record(stringSchema(), unknown()).describe(
        "@internal The remote-tool protocol's request envelope, exactly what rides under the reserved arguments key on the device bridge: a call (call id = tool_use id, the session's permission mode, expiry, and on a second leg the session's answer to the machine's question) or an outcome query by its op. call_id is the serving side's run-at-most-once key across legs, redeliveries and queries; request_id is per leg. Parsed strictly by that protocol on the client.",
      ),
      tool_use_id: stringSchema(),
      issued_at: numberSchema()
        .int()
        .nonnegative()
        .describe(
          "@internal Epoch milliseconds on the sender's clock \u2014 kept on the wire but informational only: the serving client judges lateness by how long the delivery waited on the session service's clock (the age its stream stamps on the event) against deadline_ms, never by issued_at on its own clock, and answers a late or undatable leg refused 'stale' \u2014 nothing runs \u2014 instead of leaving it unanswered. A durable catch-up into a fresh client still never runs an old call; the age check refuses it.",
        ),
      deadline_ms: numberSchema()
        .int()
        .positive()
        .describe(
          "@internal How long after issued_at the worker waits for the answer before proceeding without it.",
        ),
    }).describe(
      "@internal One leg of a tool call this session forwards to the attached machine that announced it serves the tool: the first leg, the approval leg (envelope.approval), a detached decline, or an outcome query (envelope.op = 'outcome_of'). Answered with a control_response whose success payload is the served CallToolResult; cancelled with control_cancel_request. An error-shaped control_response is not an answer (an older attached client error-replies subtypes it does not know); the worker keeps waiting.",
    ),
  );
  RemoteToolCallResponseSchema = DoctorLazy(() =>
    objectSchema({
      result: CallToolResultSchema().describe(
        "@internal The served CallToolResult for this leg, verbatim as the machine's serving code produced it; structuredContent['anthropic/remoteToolExecution'] is the remote-tool protocol's ResultEnvelope (completed, refused, failed, needs_approval, acknowledged, in_progress), parsed by the worker with that protocol.",
      ),
    }).describe(
      "@internal Success payload answering remote_tool_call: the result under one fixed key, never spread at the top level.",
    ),
  );
  SDKRemotePlumbingCallRemotePlumbingCallMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("remote_plumbing_call"),
      instance_id: stringSchema()
        .regex(regExp)
        .describe(
          "@internal The announcement this call is addressed to; a client that did not announce under this id stays silent.",
        ),
      host: stringSchema().max(64).describe("@internal The machine's announced name; informational."),
      name: stringSchema().min(1).max(64).describe("@internal An announced plumbing tool."),
      args: record(stringSchema(), unknown()).describe(
        "@internal The plumbing tool's arguments; no envelope rides with them.",
      ),
      issued_at: numberSchema().int().nonnegative(),
      deadline_ms: numberSchema().int().positive(),
    }).describe(
      "@internal One call of a plumbing tool on the attached machine, made by this session's own machinery rather than the model: no envelope and no tool_use id. Answered with a control_response whose success payload carries that tool's CallToolResult; cancelled with control_cancel_request.",
    ),
  );
  RemotePlumbingCallResponseSchema = DoctorLazy(() =>
    objectSchema({
      result: CallToolResultSchema().describe("@internal The plumbing tool's CallToolResult, verbatim."),
    }).describe("@internal Success payload answering remote_plumbing_call."),
  );
  SDKRemoteToolsProbeRemoteToolsProbeMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("remote_tools_probe"),
      instance_id: stringSchema()
        .regex(regExp)
        .describe("@internal The announcement being probed; other clients stay silent."),
      issued_at: numberSchema().int().nonnegative(),
      deadline_ms: numberSchema().int().positive(),
    }).describe(
      "@internal The worker's liveness check for an announced machine, sent only inside a live turn after minutes without hearing from it; a miss within deadline_ms marks the machine offline until it announces again or answers anything.",
    ),
  );
  RemoteToolsProbeResponseSchema = DoctorLazy(() =>
    objectSchema({
      result: objectSchema({
        epoch: stringSchema().describe(
          "@internal The machine's current serving epoch (its announced host.epoch).",
        ),
      }),
    }).describe("@internal Success payload answering remote_tools_probe."),
  );
  SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("remote_tools_reannounce"),
      worker_epoch: numberSchema()
        .int()
        .min(1)
        .describe(
          "@internal The asking worker's life, as the worker states it. A client ignores an ask below the newest worker epoch it has heard and never addresses its announce by this value: the announce goes to the epoch last heard, and the worker's stale_worker_epoch answer teaches the client the current one.",
        ),
      deadline_ms: numberSchema()
        .int()
        .positive()
        .describe(
          "@internal How long the worker waits for an announcement; a client that receives the request later than this after the session service stored it does nothing.",
        ),
    }).describe(
      "@internal A replacement worker asks the attached client that serves this session's tools to announce it, when a call names a machine its roster lacks. Not addressed to an instance: the worker knows none. A client that serves the machine announces, overriding once what it believes the worker already holds; it honours one ask per epoch, another only when the announce that one made failed or went unanswered, and at most one per ten seconds, and does nothing for an ask it cannot date or read, or whose sender it would refuse a tool call from. Any other client, and a client that predates the request, does nothing or error-replies, and the worker reads no reply: it withdraws the request with control_cancel_request when its wait ends.",
    ),
  );
  SDKTurnHandoffTurnHandoffMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("turn_handoff"),
      messages: array(union([SDKUserMessageBaseSchema(), SDKAssistantMessageSchema_2()]))
        .min(1)
        .max(200)
        .describe(
          "@internal The turn so far, in conversation order: the user's message, any [assistant, tool_result] rounds already answered elsewhere, and last an assistant message (thinking blocks with their signatures, text, and the tool_use blocks to run). Every message carries a uuid, kept as the transcript line's; none of the messages, and none of the tool_use ids they hold, may already be in the conversation \u2014 the turn is appended once, whole, never merged with lines already there (except as tool_use_ids describes for a turn that runs nothing). No two assistant messages share a message id, among these or with the conversation, with one exception, for a worker whose turn_handoff entry has shared_message_id: an assistant message that holds tool_use blocks only may repeat the id of the assistant message before it where every message between them, at least one, holds only tool_result blocks for that earlier message's calls. The two are then sent to the model as one message, its calls followed by their results, so a client does this only for calls of one Messages API response that it ran one after another. A request that names calls to run is refused (invalid_handoff) unless its first message is a user message, not empty and not a tool_result.",
        ),
      tool_use_ids: array(stringSchema())
        .max(16)
        .describe(
          "@internal The tool_use blocks of the last message to run, each of a tool named in the turn_handoff entry of the worker external_metadata; all run in one batch, then the model continues once. May be empty, and then nothing runs and no model turn follows: with every call the turn carries answered within it (the last message holding none), the worker appends the turn as history and, once the lines are stored, echoes the last assistant message that holds a call; with stopped, the user stopped the turn before its calls ran. In both cases, when a leading part of the turn is already in the conversation from an earlier delivery, only the rest is appended; where its first assistant message repeats the id of the last one already there, as messages allows, the two are sent to the model as one message.",
        ),
      stopped: literal(true)
        .optional()
        .describe(
          "@internal Only true, and only with an empty tool_use_ids: the user stopped this turn while its last message, an assistant message holding calls that have not run, was being handed over. The worker appends the turn, closes those calls and marks the turn exactly as when a turn of its own is stopped before a call runs, and ends it with the result a stopped turn ends with; when an earlier delivery already appended the turn, the calls are closed in place.",
        ),
      requires_rewind_request_id: stringSchema()
        .optional()
        .describe(
          "@internal The request_id of a rewind_conversation control request that the client sent ahead of this one, when the turn is meant only for the conversation as that rewind leaves it. A worker that advertises requires_rewind_request_id: true in turn_handoff_available reads it; a worker without that key ignores it and appends the turn whether or not the rewind was made, and the request may start a new worker whose build the client cannot know, so a client sends the member only once every worker that could read it has the key. A worker that reads it appends the turn only if that rewind is the last one it carried out (answered rewound: true), the last user or assistant message is still the one that rewind left at the end, and nothing it holds waits to be appended ahead of the turn (a turn in progress, or a message it received since). Otherwise it appends nothing and runs no call, and answers an error that starts \"invalid_handoff: required_rewind_\" and then one word: unknown, this worker has carried out no rewind (it replaced the worker that answered that request, or the request was refused or not read yet); other, its last rewind is a different request (the named one was refused here, not read yet, or followed by another); moved_on, it made that cut and the conversation has changed since; lines_waiting, it made that cut and something waits to be appended first. After unknown or other, go by the rewind's own answer where one was given, bearing in mind that a rewound: false of persist_failed or state_changed can still leave the cut for the next worker, and that the same rewind delivered again after its cut was stored answers target_not_found. A client that saw rewound: true and is then answered unknown may send the turn again without the member: the cut stands, though the new worker may have appended lines since, so the turn lands at the conversation's end, not necessarily right after the cut. After other, moved_on or lines_waiting do not send the turn again without the member: the conversation is not, or may no longer be, as that rewind left it. The check is skipped once any of the turn's messages is in the conversation or queued from an earlier delivery: a request sent again after that is answered as without the member. A value that is not a string is refused (invalid_handoff).",
        ),
      relay_marker: objectSchema({
        type: literal("system"),
        subtype: literal("upgrade_relay_marker"),
        uuid: stringSchema(),
        content: stringSchema(),
      })
        .optional()
        .describe(
          "@internal The system line that starts the prompt-cache relay for this conversation: uuid is the line's uuid, and content is the marker, a JSON string whose anchor_line_uuid is the uuid of the first of messages; other fields of the line are ignored. Only a worker that advertises relay_marker: true in turn_handoff_available uses it, on a request that names calls to run, or on a history request (no calls named, not stopped) if the session holds none of its messages yet. It is never a reason to refuse the turn: when the member is not such a line, or the worker does not use the marker, the request is answered as without it.",
        ),
      memory_context: objectSchema({
        uuid: stringSchema(),
        version: stringSchema().nullable(),
        content: stringSchema().nullable(),
      })
        .optional()
        .describe(
          "@internal The snapshot of the user's claude.ai memory that the client showed its model with the turn's user message. Used on a request that names calls to run, or on a history request (no calls named, not stopped) if the session holds none of its messages yet: the worker writes it ahead of the first of messages, with uuid as the line's uuid, as a cowork_memory_context attachment line like those it writes for snapshots it fetches itself, and then adds no copy of that version. version and content are both strings for a snapshot, both null to withdraw an earlier one. The member is never a reason to refuse the request: one that is malformed, that has a version without content or the reverse, or whose uuid is also that of one of messages, of relay_marker or of a line the session's transcript holds, is ignored, and the turn goes on without the line.",
        ),
      message_client_platform: stringSchema()
        .optional()
        .describe(
          "@internal The `anthropic-client-platform` value of the app a person sent the first of messages from. Left out when no person sent that message, as in a scheduled run. When it names one of the Remote Control apps (isRemoteControlAppPlatform) and that message is not one from another session, the worker marks the message as sent by a person, as it marks a user message that arrives with that value, so the turn counts as started by a person for the calls it runs and for those the model makes afterwards, and the turn the worker runs carries that value as its client platform, as a turn for such a user message does (per-turn telemetry, and tools that read which app the person is on). The member is never a reason to refuse the request: without it, or with any other value, the message is appended unmarked and the turn carries no platform.",
        ),
      file_names: array(
        objectSchema({
          file_uuid: stringSchema(),
          name: stringSchema(),
        }),
      )
        .max(16)
        .optional()
        .describe(
          "@internal Files a person attached to the conversation, each with the name the client showed its model for it, the most wanted first; at most 16. file_uuid is that of a file_attachments entry on a user message sent to this worker before the request. Only a worker that advertises file_names: true in turn_handoff_available uses the member, only on a request that names calls to run, and only when those calls run in the session's home directory: before they run, it copies each listed file it has downloaded into that directory, under that name, until a limit on time or on total size is reached, taking first the names that occur in the calls' own input. It replaces nothing then, skips a name it refuses or that the list holds twice, and, within one request, skips the further names of a file once it has found or placed one of them. If a person later sends another file under a name it placed, it puts that file's bytes in the copy's place, or removes the copy if it cannot, and only while the copy is still the file it placed, unchanged. The member is never a reason to refuse the request: a malformed one (a longer list included) is ignored whole, and the calls run whatever became of the copies.",
        ),
    }).describe(
      '@internal Sent by the session client to a worker that advertises turn_handoff in its external_metadata: hand over a turn whose final assistant message holds tool calls that have not run. The worker answers at once \u2014 success {status: "accepted"} (validated and queued; the messages are appended at the start of the turn that runs the calls, the last one echoed back as an assistant event before any call runs; a request that runs nothing (see tool_use_ids) for the same turn as one still queued to run replaces it), success {status: "duplicate"} (every named call is already taken by an earlier delivery or answered; nothing runs \u2014 taken, not necessarily ran; or, for a turn that runs nothing, its calls are already answered by other lines, or the same turn is already pending in that shape or running), or an error whose message starts with its code and a colon: turn_handoff_disabled, invalid_handoff, unsupported_tool, unknown_tool, recovered_by_restart (this worker restarted after the turn was appended and its recovery set the turn\'s unrun calls aside; this request will not run or close them), expired (the request names calls to run and the session service has held it for over 30 minutes, by the created_at of the frame that delivered it: the service hands a request that no worker answered to every later worker of the session; nothing is appended or taken, and a request that runs nothing is never refused for its age). Accepted calls get the permission evaluation of the worker (rules, the permission mode, can_use_tool to the client); their tool_result messages and the model continuation follow on the event stream as in any turn.',
    ),
  );
  TurnHandoffResponseSchema = DoctorLazy(() =>
    objectSchema({
      status: _enum(["accepted", "duplicate"]),
      tool_use_ids: array(stringSchema())
        .optional()
        .describe("@internal The calls queued to run (status accepted)."),
    }).describe("@internal Success payload answering turn_handoff."),
  );
  SDKMcpMessageMcpMessageMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("mcp_message"),
      server_name: stringSchema(),
      message: JSONRPCMessagePlaceholder(),
    }).describe(
      "Carries one MCP JSON-RPC message for an SDK-hosted MCP server (one named in initialize.sdkMcpServers or added later with mcp_set_servers). Flows in both directions: the CLI sends it to the client to reach the in-process server, and the client sends it to the CLI to deliver that server's own messages. When the client answers, the success response carries the server's JSON-RPC reply under mcp_response; the CLI acknowledges a client-sent one with an empty success.",
    ),
  );
  McpMessageResponseSchema = DoctorLazy(() =>
    objectSchema({
      mcp_response: JSONRPCMessagePlaceholder()
        .optional()
        .describe(
          "The JSON-RPC response the SDK-hosted server produced for the delivered message (for a JSON-RPC notification, a response with an empty result). Present when the client answers a CLI-sent mcp_message; absent when the CLI acknowledges a client-sent one.",
        ),
    }).describe("Success payload answering an mcp_message request."),
  );
  SDKMcpSetServersMcpSetServersMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("mcp_set_servers"),
      servers: record(stringSchema(), McpServerConfigSchema()),
    }).describe("Replaces the set of dynamically managed MCP servers."),
  );
  SetMcpServersResponseSchema = DoctorLazy(() =>
    objectSchema({
      added: array(stringSchema()),
      removed: array(stringSchema()),
      errors: record(stringSchema(), stringSchema()),
    }).describe("Result of replacing the set of dynamically managed MCP servers."),
  );
  SDKReloadPluginsReloadPluginsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("reload_plugins"),
      hold_on_cache_impact: booleanSchema()
        .optional()
        .describe(
          "When true, the reload is not applied if applying it would change the session's tool list while the conversation's prompt cache depends on that list (the same check the interactive /reload-plugins makes before it asks for --force): the response then carries held: true and cache_impact, and the session keeps its current plugins. Default false: apply unconditionally.",
        ),
      add_plugins: array(SDKLocalMessageSchema())
        .optional()
        .describe(
          "Plugins for the reload to load as well, in the same shape as the SDK `plugins` option: each entry joins the session as one more --plugin-dir would (--plugin-dir-no-mcp when skipMcpDiscovery is set). Plugins already loaded stay; nothing is removed. A held or failed reload adds none of them. Refused for a malformed list or a path that is not absolute, when managed settings set disableSideloadFlags, on a connection whose frames persist server-side (any Remote Control or cloud worker), in a cloud-hosted session, and when a running sandbox cannot keep shell commands out of the folders (always on Windows).",
        ),
    }).describe("Reloads plugins from disk and returns the refreshed session components."),
  );
  ReloadPluginsResponseSchema = DoctorLazy(() =>
    objectSchema({
      commands: array(SkillCommandSchema()),
      agents: array(AgentDefinitionSchema()),
      plugins: array(
        objectSchema({
          name: stringSchema(),
          path: stringSchema(),
          source: stringSchema().optional(),
          version: stringSchema().optional().describe(PLUGIN_VERSION_DESCRIPTION),
        }),
      ),
      mcpServers: array(McpServerStatusSchema()),
      error_count: numberSchema().int(),
      held: booleanSchema()
        .optional()
        .describe(
          "Present only when the request asked to hold on cache impact and this CLI ran the check. True: the reload was not applied, the lists above describe the session as it still is, and cache_impact says what applying would change. False: the check found no impact and the reload was applied. Absent: the request did not ask, or the CLI predates the option and applied the reload unchecked.",
        ),
      cache_impact: objectSchema({
        mcp_servers_added: array(stringSchema()),
        mcp_servers_removed: array(stringSchema()),
        lsp_tool_change: _enum(["adds", "may-add", "removes", "may-remove"]).nullable(),
      })
        .optional()
        .describe(
          "What applying the held reload would change in the session's tool list: plugin MCP servers it would register or drop (scoped plugin:<plugin>:<server> names, plugin-authored \u2014 validate before showing) and whether it would add or remove the LSP tool (the may- forms mean the preview could not fully see the pending plugin set). Present only with held: true.",
        ),
    }).describe("Refreshed commands, agents, plugins, and MCP server status after reload."),
  );
  SDKReloadSkillsReloadSkillsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("reload_skills"),
    }).describe("Reloads skills from disk and returns the refreshed skill list."),
  );
  ReloadSkillsResponseSchema = DoctorLazy(() =>
    objectSchema({
      skills: array(SkillCommandSchema()),
    }).describe("Refreshed skill commands after reload."),
  );
  SDKReloadOutputStylesReloadOutputStylesMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("reload_output_styles"),
    }).describe(
      "Re-reads the output-style directories from disk (a style file written mid-session is otherwise invisible until the next session) and returns the refreshed style names. Also drops the shared markdown-file scan cache, so agents, skills and routines re-read their directories on their next use.",
    ),
  );
  ReloadOutputStylesResponseSchema = DoctorLazy(() =>
    objectSchema({
      available_output_styles: array(stringSchema()),
    }).describe(
      "Refreshed output style names after reload, built-in and custom, in the order the initialize response lists them.",
    ),
  );
  SDKRegisterRepoRootRegisterRepoRootMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("register_repo_root"),
      directory: stringSchema(),
      reload_claude_md: booleanSchema().optional(),
      reload_plugins: booleanSchema().optional(),
      reload_skills: booleanSchema().optional(),
    }).describe(
      "Add a directory as a working-directory root and optionally reload CLAUDE.md, skills, and plugins. The directory must resolve to a strict subdirectory of cwd, or of a directory passed at launch via --add-dir / the SDK additionalDirectories option. A directory that is already a registered working directory (including a duplicate of an earlier request) is denied with an error; the registration pipeline and DirectoryAdded hooks do not re-run.",
    ),
  );
  RegisterRepoRootResponseSchema = DoctorLazy(() =>
    objectSchema({
      directory: stringSchema().describe(
        "The registered root. A resolved absolute path \u2014 except on connections that persist frames server-side (the local bridge-worker lane echoes the request directory verbatim; the registration is still keyed on the resolved path locally).",
      ),
    }).describe("Success payload answering register_repo_root."),
  );
  SDKSetCwdSetCwdMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("set_cwd"),
      path: stringSchema().describe(
        "Target directory. Tilde-expanded and realpath-canonicalized by the CLI, exactly like an interactive /cd argument.",
      ),
      trust_accepted: booleanSchema()
        .optional()
        .describe(
          "Host attestation that the user explicitly accepted a trust dialog for this directory. Only send true after showing one \u2014 the CLI records the directory as trusted (the same latch /cd's own prompt writes) before relocating. Requires trusted_directory.",
        ),
      trusted_directory: stringSchema()
        .optional()
        .describe(
          "Required whenever trust_accepted is true: the exact directory string from the needs_trust response being answered. This pins the attestation to the canonical path the user was shown \u2014 if the raw path canonicalizes differently by the time the re-send arrives (e.g. a symlink component changed during the dialog), nothing is latched and a fresh needs_trust carries the new canonical directory.",
        ),
    }).describe(
      "@internal Moves the session to a new working directory \u2014 the headless twin of /cd, for SDK hosts like Claude Desktop. Runs the same validation, Cd(...) permission rules, and relocation path as the interactive command, with the trust prompt delegated to the host via the needs_trust response arm. Before the first turn the move re-anchors start-of-session state (the first request is built as for a start in the new directory, no move notice); after a turn the prefix is preserved and the move arrives as an appended notice. SessionStart hooks are never re-run by set_cwd (those of the launch directory already ran and their output stays in the session); a host that starts the process before its directory is known should use --await-claim and claim_session, which run them in the bound directory instead. Rejected while a turn is in flight.",
    ),
  );
  SetCwdResponseSchema = DoctorLazy(() =>
    discriminatedUnion("status", [
      objectSchema({
        status: literal("ok"),
        cwd: stringSchema().describe("Canonical (realpath) working directory the session now runs in."),
        changed: booleanSchema().describe(
          "False when the target already was the working directory \u2014 a successful no-op with no side effects.",
        ),
        transcript_relocated: booleanSchema().describe(
          "True when the transcript lives in the project slot derived from cwd (the normal case, and the no-op case). False only on the documented edge where the move completed but the transcript move failed AND the rollback chdir failed \u2014 a cwd-derived resume lookup will then miss the session.",
        ),
      }),
      objectSchema({
        status: literal("needs_trust"),
        trust_root: stringSchema()
          .optional()
          .describe(
            "Present when `directory` sits inside a git repository whose canonical root differs from it (a subdirectory or a linked worktree). Accepting trust grants that whole repository \u2014 every subdirectory and linked worktree of the root \u2014 so the trust dialog should name this root alongside `directory`. Informational only: the attestation echo still pins `trusted_directory` to `directory`. Vetted by the same visible-glyph rule as `directory`; a canonical root that fails it is omitted rather than carried.",
          ),
        directory: stringSchema().describe(
          "Canonical target directory. Nothing changed; show a trust dialog for exactly this string and, on accept, re-send with trust_accepted: true and trusted_directory echoing it verbatim. Safe to render verbatim in the dialog, by construction: every character is a visible, space-distinguishable glyph. Targets whose canonical path contains control (Cc), format (Cf), default-ignorable, line/paragraph-separator (Zl/Zp), non-ASCII-space Zs, or braille-blank code points are rejected (reason: unsafe_path) before this arm can carry them.",
        ),
      }),
      objectSchema({
        status: literal("rejected"),
        reason: _enum(["not_found", "not_a_directory", "blocked_by_rule", "busy", "unsafe_path"]).describe(
          "unsafe_path: the target's canonical path contains characters that do not render as visible, space-distinguishable glyphs \u2014 control (Cc), format (Cf), default-ignorable, line/paragraph-separator (Zl/Zp), non-ASCII-space Zs, or braille-blank code points; rejected fail-closed before the trust round-trip, and the offending path is never echoed back.",
        ),
        message: stringSchema().describe("Human-readable, ANSI-free explanation."),
      }),
    ]).describe(
      "@internal Result of a set_cwd request. Every non-ok outcome leaves the working directory unchanged \u2014 but trust may already have been durably recorded when the request carried a valid attestation (a busy rejection or relocation failure after the latch does not unlatch it; the consent was for the directory, not the attempt). Internal failures (e.g. the transcript move failed and was rolled back) arrive as a control_response error instead.",
    ),
  );
  SDKClaimSessionClaimSessionMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("claim_session"),
      cwd: stringSchema().describe(
        "The session's working directory. Tilde-expanded and realpath-canonicalized; treated exactly like the cwd a process is spawned in (no trust prompt, no Cd(...) rule check) \u2014 the host chose it, as it chooses a spawn cwd.",
      ),
      env: record(stringSchema(), stringSchema())
        .optional()
        .describe(
          "Per-session environment additions. Only keys on the claim allow-list are accepted (keys the process has already consumed \u2014 config dir, base URL, proxy/TLS, provider, telemetry, entrypoint \u2014 must be part of the spare's spawn env); any other key rejects the claim and leaves the spare parked.",
        ),
      additional_directories: array(stringSchema())
        .optional()
        .describe("Extra directories the session may access, as --add-dir."),
      permission_mode: stringSchema()
        .optional()
        .describe(
          "Session permission mode, as --permission-mode. Part of the claim (not a follow-up set_permission_mode) so that a mode the process cannot take \u2014 bypassPermissions on a spare spawned without --allow-dangerously-skip-permissions, a mode this build does not know, one the claimed directory's settings disable \u2014 refuses or fails the claim instead of letting the first turn run under the spare's mode.",
        ),
      system_prompt: array(stringSchema()).optional().describe("As initialize.systemPrompt."),
      append_system_prompt: stringSchema().optional().describe("As initialize.appendSystemPrompt."),
      agents: record(stringSchema(), unknown()).optional().describe("As initialize.agents."),
      title: stringSchema().optional().describe("As initialize.title."),
      sdk_mcp_servers: array(stringSchema())
        .optional()
        .describe(
          "The session's final set of in-process SDK MCP server names. Diffed against the set registered while parked: new names are connected, missing ones disconnected. Omitted: the parked set stays.",
        ),
      include_initialize: booleanSchema()
        .optional()
        .describe(
          "When true the ok response also carries the payload an initialize response would (commands, agents, models, account \u2026) computed for the claimed directory, for hosts that render them.",
        ),
      workspace_trust: objectSchema({
        accepted: booleanSchema(),
        directory: stringSchema(),
      })
        .optional()
        .describe(
          "As initialize.workspaceTrust, for a claimed spare: the host's attestation that the user accepted a trust dialog for the session's folder, judged against the claimed cwd once the spare has moved there, by the same rule (honored only from the process that owns the CLI's stdin, and only when `directory` resolves to that folder's trust key). A spare's own initialize arrives in its parking directory and records nothing, so a host that attests sends it here. workspace_trust_recorded in the response (and in the returned initialize payload) reports the outcome.",
        ),
    }).describe(
      "@internal Binds a parked spare (a process started with --await-claim in a neutral directory with the host-level options) to its session: relocates it to cwd as if it had been spawned there, applies the per-session prompt options and in-process MCP server set, starts the SessionStart hooks, and registers the session. Model, thinking budget and flag-settings overlays are not claim fields: send an apply_flag_settings that decides what the claim starts (its MCP and plugin keys) ahead of the claim, where a refusal also refuses the claim, and set_model / set_max_thinking_tokens / the other keys of an overlay right behind it; the control loop applies them in order before it reads the first message. A set_model that arrives before the first message is applied the way --model is at start-up: it writes no /model entries to the transcript and makes no extra API call to confirm a model id the local checks accept. Accepted once, only on a parked spare, only before any turn. A request that fails validation is refused before anything is touched and leaves the spare parked; a failure after that point leaves the spare unusable (discard it).",
    ),
  );
  ClaimSessionResponseSchema = DoctorLazy(() =>
    objectSchema({
      status: literal("ok"),
      cwd: stringSchema()
        .optional()
        .describe(
          "Canonical working directory the session now runs in (omitted when the canonical path carries invisible or non-printing characters, which are never echoed).",
        ),
      session_id: stringSchema(),
      parked_ms: numberSchema().optional().describe("How long the spare was parked before this claim."),
      sdk_mcp_settled: booleanSchema().describe(
        "Whether the in-process SDK MCP handshakes registered while parked had completed when the claim arrived (false: the first turn still waits for them).",
      ),
      initialize: record(stringSchema(), unknown())
        .optional()
        .describe(
          "Present when include_initialize was true: the initialize-shaped payload for the claimed session.",
        ),
      workspace_trust_recorded: booleanSchema()
        .optional()
        .describe(
          "As initialize's workspace_trust_recorded: present when the claim came from the process that owns the CLI's stdin and carried workspace_trust with accepted true and an absolute directory; true when the claimed folder is now recorded as trusted (or already was), false when the attestation was not honored.",
        ),
    }).describe(
      "@internal Result of a successful claim_session. Failures arrive as a control_response error whose message starts with a reason token (not_a_spare, already_claimed, busy, turn_started, env_key_not_claimable:<KEY>, cwd_not_found, cwd_not_a_directory, \u2026); the spare stays parked after any of them.",
    ),
  );
  SDKMcpReconnectMcpReconnectMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("mcp_reconnect"),
      serverName: stringSchema(),
    }).describe("Reconnects a disconnected or failed MCP server."),
  );
  SDKMcpToggleMcpToggleMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("mcp_toggle"),
      serverName: stringSchema(),
      enabled: booleanSchema(),
    }).describe("Enables or disables an MCP server."),
  );
  SDKMcpReadResourceMcpReadResourceMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("mcp_read_resource"),
      serverName: stringSchema().describe("Server name, as mcp_status reports it (not normalized)."),
      uri: stringSchema().describe(
        "The resource to read. Must use the ui:// scheme; any other URI is refused.",
      ),
    }).describe(
      'Reads one MCP Apps (SEP-1865) UI resource \u2014 a `ui://` URI, typically the `_meta.ui.resourceUri` a tool declares \u2014 from a connected MCP server the CLI itself dialed, with `resources/read`, for a host that renders it. Read-only and no model turn. The reply is untrusted third-party content (HTML): render it sandboxed. SDK-type MCP servers (config.type === "sdk") are rejected \u2014 they are caller-provided, so the caller can read them directly. Errors name the cause: a non-ui:// URI, an unknown server, a server that managed policy blocks, that is disabled or that the project has not approved (the refusals mcp_reconnect gives), a server that is not connected (failed, pending or needs-auth: send mcp_reconnect; a connected server, or one still listed from the discovery cache, is read through the same connect path a tool call takes), a response over the size limit, or the server\'s own resources/read error (over a transport that stores frames, one fixed sentence in its place). Refused on a lane that redacts what it persists (a Remote Control bridge worker, a tenant worker) and by the client of a cloud-hosted session. Advertised as `mcp_read_resource_v1` in system/init.capabilities.',
    ),
  );
  McpReadResourceResponseSchema = DoctorLazy(() =>
    objectSchema({
      contents: array(
        objectSchema({
          uri: stringSchema(),
          mimeType: stringSchema().optional(),
          text: stringSchema().optional(),
          blob: stringSchema().optional().describe("Base64, for a binary item."),
          _meta: record(stringSchema(), unknown())
            .optional()
            .describe(
              "The content item's own `_meta` as the server sent it (MCP Apps puts the resource's `ui.csp` and `ui.permissions` here), minus keys under the CLI-reserved `com.anthropic/` prefix.",
            ),
        }),
      ),
    }).describe("The server's resources/read result for an mcp_read_resource request."),
  );
  SDKSetMcpPermissionModeOverrideSetMcpPermissionModeOverrideMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("set_mcp_permission_mode_override"),
      serverName: stringSchema(),
      mode: PermissionModeSchema().nullable(),
      askForTools: array(
        objectSchema({
          name: stringSchema().regex(MCP_ASK_FOR_TOOLS_NAME),
        }),
      )
        .max(MCP_ASK_FOR_TOOLS_MAX)
        .nullish()
        .describe(
          "@internal With mode 'default': tools of this server, named without the mcp__<server>__ prefix (a name sent with it is stored without it; the 64-character limit applies to the name as sent), that must ask even where the tool would otherwise allow itself (today only Claude in Chrome's safe permissionless tools, e.g. tabs_context_mcp). Held beside the pin: a clear, an 'auto' pin, or a pin sent without this member (or with null or an empty list) removes the list, silently. A list of the wrong shape is refused and changes nothing.",
        ),
    }).describe(
      "@internal Pin (or clear, with mode:null) an MCP server's per-tool permission-mode override. Tighten-only over this channel: only 'default', 'auto', or null are accepted (clampControlChannelOverride); any other mode is rejected without changing state. The override substitutes for the session mode at every per-tool engine decision (effectiveModeForTool) \u2014 and only when the session mode would already auto-allow \u2014 so e.g. a server can be held at 'default' or routed through the auto-mode classifier under global bypassPermissions.",
    ),
  );
  deviceIdSchema = () => stringSchema().regex(/^[A-Za-z0-9-]{1,64}$/);
  SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("set_chrome_browser_hints"),
      preferredDeviceId: deviceIdSchema().nullable().optional(),
      localDeviceIds: array(deviceIdSchema()).max(32),
      hostPlatform: _enum(["darwin", "win32", "linux"]).optional(),
    }).describe(
      "@internal The host's view of which Claude in Chrome browser this session should use when several are connected to the account: `preferredDeviceId` is the browser its user picked last on that computer, `localDeviceIds` the relay device ids it knows to be running on that computer right now, `hostPlatform` that computer's OS (for the weaker same-OS label). Session memory only, never persisted; the built-in claude-in-chrome server reads them as its persisted pick and its on-this-computer set, so it defaults to that browser instead of asking. Hints only: nothing is selected unless it is in the live relay roster, and an empty list clears them.",
    ),
  );
  SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("set_prompt_suggestions_paused"),
      paused: booleanSchema(),
    }).describe(
      "@internal Pauses (true) or un-pauses (false) the session's prompt suggestions at runtime, for a host whose composer is not on screen: while paused, no turn end starts a suggestion, and the first turn end after paused is set back to false does. The state is one boolean in this CLI process, on top of the initialize request's promptSuggestions option and the user's own setting, neither of which it changes: a respawned or resumed session starts unpaused, so the host must send it again, and with two clients attached one client's pause applies to both. Acknowledged with an empty success; a CLI build where this is not yet enabled acknowledges and keeps generating, and an older CLI answers an unknown-subtype error.",
    ),
  );
  SDKStopTaskStopTaskMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("stop_task"),
      task_id: stringSchema(),
    }).describe("Stops a running task."),
  );
  SDKBackgroundTasksBackgroundTasksMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("background_tasks"),
      tool_use_id: stringSchema()
        .optional()
        .describe(
          "When set, backgrounds only the task whose originating tool_use block has this id. When omitted, backgrounds all foreground tasks (Ctrl+B semantics).",
        ),
    }).describe(
      'Backgrounds in-flight foreground tasks (Bash commands and subagents). With tool_use_id, targets the single task started by that tool_use block; without it, backgrounds all foreground tasks \u2014 the control-request equivalent of pressing Ctrl+B in the terminal. Each blocking tool call returns immediately with a "running in the background" tool_result and the turn continues; the task keeps running and emits a task_notification when it settles.',
    ),
  );
  BackgroundTasksResponseSchema = DoctorLazy(() =>
    objectSchema({
      backgrounded: booleanSchema()
        .optional()
        .describe(
          "Present only when the request named a tool_use_id: whether a matching foreground task was found and backgrounded. Empty object when all foreground tasks were backgrounded.",
        ),
    }).describe("Success payload answering background_tasks."),
  );
  SDKGetTaskOutputGetTaskOutputMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_task_output"),
      task_id: stringSchema().describe(
        "A shell or Monitor task of this session, running or ended: the task_id from task_started or background_tasks_changed.",
      ),
    }).describe(
      "Reads the end of one background shell or Monitor task's output: at most the last 8 KiB the command wrote, the same tail the terminal's /tasks detail view reads. Read-only and no model turn; a host polls it while the task runs, and can read it once more after the task ends. The output is whatever the command printed, escape sequences included: render it as plain text. Refused for a task_id that is neither a shell or Monitor task of this session nor shaped like one (an ended task's id whose file is gone reads as empty), and on a lane that redacts what it persists (a Remote Control bridge worker, a tenant worker).",
    ),
  );
  GetTaskOutputResponseSchema = DoctorLazy(() =>
    objectSchema({
      output: stringSchema().describe(
        "The end of the output, decoded as UTF-8; empty when the command has written nothing yet.",
      ),
      total_bytes: numberSchema().describe("The size of the whole output in bytes."),
      truncated: booleanSchema().describe(
        "Whether output holds only the end of a longer output (the last 8 KiB).",
      ),
    }).describe("Success payload answering get_task_output."),
  );
  SDKStartShellTaskStartShellTaskMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("start_shell_task"),
      command: stringSchema().describe("The program to run: one word of the shell command."),
      args: array(stringSchema())
        .optional()
        .describe(
          "Its arguments. Each reaches the program as one argument, and the shell expands nothing in it.",
        ),
      cwd: stringSchema()
        .optional()
        .describe("The directory to run it in. The default is the session's current directory."),
      env: record(stringSchema(), stringSchema())
        .optional()
        .describe("Environment variables for this command alone."),
      timeout_ms: numberSchema()
        .optional()
        .describe("How long the task may run, as the Bash tool's `timeout`."),
      description: stringSchema().optional().describe("What the task is, as the Bash tool's `description`."),
    }).describe(
      "@internal Starts a long-running command, such as a dev server, as a background shell task of a cloud session. It is one call of the session's Bash tool, decided as the same call by Claude would be. The answer can wait on a person; `control_cancel_request` gives it up. A request_id seen before starts nothing and gets the first answer. A request stored before this worker joined or held over 90 seconds is refused. Only a cloud worker on Linux with Bash answers, and says `start_shell_task_v1` in its capabilities.",
    ),
  );
  StartShellTaskResponseSchema = DoctorLazy(() =>
    discriminatedUnion("status", [
      objectSchema({
        status: literal("started"),
        task_id: stringSchema().describe(
          "The background shell task, as stop_task and get_task_output name it.",
        ),
      }),
      objectSchema({
        status: literal("denied"),
        message: stringSchema().describe(
          "What Claude would have read as the result of the denied Bash call.",
        ),
      }),
    ]).describe("@internal Success payload answering start_shell_task."),
  );
  SDKApplyFlagSettingsApplyFlagSettingsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("apply_flag_settings"),
      settings: record(stringSchema(), unknown()),
    }).describe(
      "Merges the provided settings into the flag settings layer, updating the active configuration.",
    ),
  );
  SDKGetSettingsGetSettingsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_settings"),
    }).describe("Returns the effective merged settings and the raw per-source settings."),
  );
  SDKUpdateSettingsUpdateSettingsMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("update_settings"),
      source: _enum(["localSettings", "userSettings"]).describe(
        "Which settings file to write: the project's local settings file, where /config's writes land, or the user's settings file, which takes effortLevel only.",
      ),
      settings: record(stringSchema(), unknown()),
    }).describe(
      "Writes settings through the CLI's own writer. For localSettings, merges the given keys into the project's local settings file (canonical store root, gitignore upkeep, hardened write) and live-applies them \u2014 the same path /config uses; allowlist: outputStyle. For userSettings, takes effortLevel only and saves it as the default for the session's current model, under modelSettings as /effort saves it ('max' is session-only and is not written; the running session's level is not set here \u2014 send apply_flag_settings for that). Unlike apply_flag_settings, which only touches the session-scoped flag layer. Each file feeds hook and permission-rule loading, so each allowed key is a security decision. String values only (key deletion is not supported); refused on remote transports and in sessions whose --setting-sources exclude the target source.",
    ),
  );
  GetSettingsResponseSchema = DoctorLazy(() =>
    objectSchema({
      effective: record(stringSchema(), unknown()),
      sources: array(
        objectSchema({
          source: _enum([
            "userSettings",
            "projectSettings",
            "localSettings",
            "flagSettings",
            "policySettings",
          ]),
          settings: record(stringSchema(), unknown()),
        }),
      ).describe("Ordered low-to-high priority \u2014 later entries override earlier ones."),
      applied: objectSchema({
        model: stringSchema(),
        effort: _enum(["low", "medium", "high", "xhigh", "max"]).nullable(),
        advisor: stringSchema()
          .nullable()
          .optional()
          .describe(
            "Advisor model that will be attached to API requests, after enablement, allowlist, and pairing validation. Null when none will be attached; absent on workers that predate the field.",
          ),
        ultracode: booleanSchema()
          .optional()
          .describe(
            "Whether ultracode (standing dynamic-workflow orchestration, at any effort level) is active for the session. Set per session via the `ultracode` settings key (--settings or apply_flag_settings).",
          ),
        ultracodeRequested: booleanSchema()
          .optional()
          .describe(
            "Whether ultracode is requested for the session (the `ultracode` settings key or /effort ultracode), whether or not it can take effect (see `ultracodeAvailable`). `ultracode` reports whether it is in effect.",
          ),
        ultracodeAvailable: booleanSchema()
          .optional()
          .describe(
            "Whether ultracode can be turned on for the session: dynamic workflows are enabled and the model supports it. Hosts should offer an Ultracode control only while this is true.",
          ),
        ultrathinkAvailable: booleanSchema()
          .optional()
          .describe(
            "True when typing `ultrathink` runs the turn at xhigh effort, and when the session is already at xhigh or max, where the turn stays as it is. The terminal colors the word by this rule, and hosts should color it only while this is true. Absent means a Claude Code too old to report it, which does not raise the turn in a host's chat box.",
          ),
      })
        .optional()
        .describe(
          "Runtime-resolved values after env overrides, session state, and model-specific defaults are applied. Unlike `effective` (disk merge), these reflect what the next message will use.",
        ),
      errors: array(SettingsValidationErrorSchema())
        .optional()
        .describe(
          "Settings parse and validation errors. When non-empty, the listed files were skipped during the merge above \u2014 their settings are not reflected in `effective` or `sources`.",
        ),
      remote_control_policy_lock_reason: stringSchema()
        .optional()
        .describe(
          "@internal Why org policy or managed settings lock `remoteControlAtStartup`; absent when allowed. Fails closed while the policy is unverified.",
        ),
    }).describe("Effective merged settings plus raw per-source settings in merge order."),
  );
  SDKGetHooksListingGetHooksListingMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("get_hooks_listing"),
    }).describe(
      "Returns the hooks listing the CLI's read-only /hooks menu renders: settings-file, session, and plugin hooks grouped by event and matcher, with display-ready strings (control characters revealed) and the policy and safe-mode state the menu banners on. A snapshot at request time; hosts re-request when their surface opens.",
    ),
  );
  GetHooksListingResponseSchema = DoctorLazy(() =>
    objectSchema({
      events: array(
        objectSchema({
          name: stringSchema().describe("Hook event name."),
          summary: stringSchema().describe("One-line summary, as the /hooks event list shows."),
          supportsMatcher: booleanSchema().describe("Whether hooks on this event can carry a matcher."),
          hookCount: numberSchema().describe("Number of listed hooks."),
        }),
      ).describe("Events that have at least one listed hook, in the /hooks menu\u2019s lifecycle order."),
      hooks: array(
        objectSchema({
          event: stringSchema(),
          matcher: stringSchema().describe(
            "Matcher with control characters revealed; '' when the entry has none.",
          ),
          source: stringSchema().describe("Raw source name (userSettings, sessionHook, pluginHook, \u2026)."),
          sourceLabel: stringSchema().describe("User-facing source description."),
          pluginName: stringSchema().optional(),
          type: stringSchema().describe("Hook type (command, prompt, agent, http, mcp_tool, \u2026)."),
          displayText: stringSchema().describe(
            "List-row label: statusMessage when set, else the identity text; one line, control characters revealed.",
          ),
          commandText: stringSchema().describe(
            "Identity text \u2014 the literal command/prompt/URL that runs, control characters revealed.",
          ),
          contentLabel: stringSchema().describe("Label for commandText (Command, Prompt, URL, \u2026)."),
          condition: stringSchema().optional().describe("If-condition, revealed, when set."),
          timeout: numberSchema().optional().describe("Timeout in seconds."),
          statusMessage: stringSchema().optional(),
          runsOnce: booleanSchema().optional(),
          runsInBackground: booleanSchema().optional(),
          disabled: literal(true)
            .optional()
            .describe(
              "True when the session's mode or policy keeps this hook from running (the policy block and safeMode/bareMode say why); absent on rows that run.",
            ),
          editable: objectSchema({
            matcher: stringSchema(),
            config: record(stringSchema(), unknown()),
            headersRedacted: literal(true).optional(),
          })
            .optional()
            .describe(
              "The entry as stored (raw matcher, '' when none, and raw hook object; no display escaping) for a host's edit form and as the target it names to `claude edit-hook`. Only on rows from a settings file this session reads and may write. HTTP header values are blanked (headersRedacted); a replace that sends no headers keeps the stored ones.",
            ),
        }),
      ).describe(
        "One row per listed hook: events in lifecycle order, matchers in the menu\u2019s priority order.",
      ),
      eventCatalog: array(
        objectSchema({
          name: stringSchema(),
          summary: stringSchema(),
          supportsMatcher: booleanSchema(),
        }),
      ).describe(
        "Every hook event in lifecycle order (name, the /hooks summary, whether its hooks take a matcher), for an add-hook form.",
      ),
      policy: objectSchema({
        disabledByPolicy: booleanSchema().describe("Managed disableAllHooks \u2014 nothing runs at all."),
        managedOnly: booleanSchema().describe(
          "Managed allowManagedHooksOnly \u2014 non-managed hooks are blocked and managed hooks are intentionally not listed.",
        ),
        pluginOnly: booleanSchema().describe(
          "Managed strictPluginOnlyCustomization locks the hooks surface.",
        ),
        allDisabled: booleanSchema().describe("Effective disableAllHooks, whatever source set it."),
        policyHookCount: numberSchema().describe(
          "Hooks configured in managed settings (they run even under a non-managed disableAllHooks).",
        ),
        policyUnreadable: literal(true)
          .optional()
          .describe(
            "Present when a managed settings source exists but could not be read: what the organization configured is unknown, so edit_hook refuses every edit (fail-closed) and a host locks its editing controls, as it does under the three locks above.",
          ),
      }),
      safeMode: objectSchema({
        managedHooksStillApply: booleanSchema(),
        exitHint: stringSchema().describe("How to leave safe mode, per its activation source."),
      })
        .optional()
        .describe("Present only when the session runs under --safe-mode."),
      bareMode: objectSchema({
        exitHint: stringSchema().describe("How to leave bare mode, per its activation source."),
      })
        .optional()
        .describe(
          "Present only under --bare / CLAUDE_CODE_SIMPLE with the hooks surface gated off: settings-file, flag, policy, and plugin hooks never fire there; session hooks still run.",
        ),
      errors: array(SettingsValidationErrorSchema())
        .optional()
        .describe("Settings files skipped by the merge \u2014 their hooks are neither listed nor running."),
    }).describe("The hooks listing the CLI's /hooks menu renders, with display-ready strings."),
  );
  SDKListPermissionRulesListPermissionRulesMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("list_permission_rules"),
    }).describe(
      "Requests the session's live permission rules and workspace directories \u2014 the same data /permissions lists in the terminal: rules from settings files plus session-only approvals, slash-command grants, and --allowedTools flag rules, each with its source.",
    ),
  );
  RuleReadingSchema = DoctorLazy(() =>
    objectSchema({
      prefix: stringSchema(),
      emphasis: stringSchema().optional(),
      suffix: stringSchema().optional(),
    }).describe(
      `The CLI's plain-language reading of a rule (e.g. "Any Bash command starting with npm run"), split into parts so hosts can render the rule-derived fragment the way the terminal does (bold). prefix and suffix are fixed words; emphasis is rule content \u2014 apply display hygiene (invisible-character escaping) before rendering it.`,
    ),
  );
  PermissionRuleSchema = DoctorLazy(() =>
    objectSchema({
      behavior: _enum(["allow", "deny", "ask"]),
      source: _enum([
        "userSettings",
        "projectSettings",
        "localSettings",
        "flagSettings",
        "policySettings",
        "cliArg",
        "command",
        "session",
        "mcpMount",
        "toolsNarrowing",
        "mcpServerPolicy",
        "hostCredential",
      ]).describe(
        "Where the rule comes from. Mirrors PermissionRuleSource (permissionRuleLookup.ts PERMISSION_RULE_SOURCES); the parity test in test/cli/headlessControl/listPermissionRules.test.ts keeps the two aligned.",
      ),
      rule: stringSchema().describe(
        "The stored rule string VERBATIM, exactly as the session holds it. Two stored spellings that parse identically each get their own entry. Can carry invisible or control characters by design \u2014 escape at display.",
      ),
      description: RuleReadingSchema()
        .optional()
        .describe("Plain-language reading of the rule; absent where the terminal shows no subtitle either."),
      editability: _enum(["persistent", "session", "readonly"]).describe(
        "Where the rule lives: 'persistent' (userSettings/projectSettings/localSettings \u2014 saved in a settings file), 'session' (cliArg/session \u2014 in memory only, for the rest of this session), or 'readonly' (policySettings/flagSettings/command and every other source \u2014 the set the terminal's /permissions treats as read-only). Informational for hosts; this request never changes rules.",
      ),
      notInEffect: booleanSchema()
        .optional()
        .describe(
          "Present (true) when enterprise managed settings pin allowManagedPermissionRulesOnly and this rule, read from a non-policy settings file, is ignored by the session. Such rows are readonly.",
        ),
    }).describe("One permission rule with its provenance and where it lives."),
  );
  WorkspaceDirectorySchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      source: stringSchema().describe(
        "Where the directory grant came from: a settings source (e.g. 'localSettings'), 'cliArg' (--add-dir), or 'session' (/add-dir, IDE workspace folders).",
      ),
    }).describe("One additional working directory in the permission scope."),
  );
  PermissionRulesStateSchema = DoctorLazy(() =>
    objectSchema({
      rules: array(PermissionRuleSchema()),
      workspaceDirectories: array(WorkspaceDirectorySchema()),
      originalCwd: stringSchema().describe("The session's original working directory."),
      managedOnly: booleanSchema().describe(
        "True when enterprise managed settings pin allowManagedPermissionRulesOnly: the session applies policy rules only, and rules from other settings files appear with notInEffect set.",
      ),
      errors: array(SettingsValidationErrorSchema())
        .optional()
        .describe(
          "Settings parse and validation errors, as get_settings reports them. When non-empty, the listed files were skipped \u2014 their rules are not in the session and not listed above.",
        ),
    }).describe("The session's live permission rules state, as list_permission_rules reports it."),
  );
  ListPermissionRulesResponseSchema = DoctorLazy(() =>
    objectSchema({
      state: PermissionRulesStateSchema(),
    }).describe("Success payload of list_permission_rules."),
  );
  SDKElicitationElicitationMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("elicitation"),
      mcp_server_name: stringSchema(),
      message: stringSchema(),
      mode: _enum(["form", "url"]).optional(),
      url: stringSchema().optional(),
      elicitation_id: stringSchema().optional(),
      requested_schema: record(stringSchema(), unknown()).optional(),
      property_order: array(stringSchema())
        .optional()
        .describe(
          `requested_schema.properties' top-level keys in the order the MCP server listed them; absent for URL mode and when the schema has no properties object. For a host whose transport keeps no JSON object key order (a protobuf Struct, say). Names that look like array indices ("0", "1", \u2026) come first, in JavaScript's object key order.`,
        ),
      title: stringSchema()
        .optional()
        .describe(
          "Permission-display title from the MCP server's _meta['anthropic/permissionDisplay']. Mirrors can_use_tool.title so SDK consumers can render elicitation-driven permission prompts with structured headers instead of parsing `message`.",
        ),
      display_name: stringSchema()
        .optional()
        .describe(
          "Short tool/server label from _meta['anthropic/permissionDisplay'].displayName. Mirrors can_use_tool.display_name.",
        ),
      description: stringSchema()
        .optional()
        .describe(
          "Permission-display subtitle from _meta['anthropic/permissionDisplay'].description. Mirrors can_use_tool.description.",
        ),
    }).describe("Requests the SDK consumer to handle an MCP elicitation (user input request)."),
  );
  ElicitationResponseSchema = DoctorLazy(() =>
    objectSchema({
      action: _enum(["accept", "decline", "cancel"]),
      content: record(stringSchema(), unknown()).optional(),
    }).describe("Response from the SDK consumer for an elicitation request."),
  );
  SDKRequestUserDialogRequestUserDialogMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("request_user_dialog"),
      dialog_kind: stringSchema().describe(
        'Identifier for the dialog the host should render. Open string union \u2014 new kinds may be added without bumping the protocol. A kind is only sent in sessions where some attached client declared it in initialize.supportedDialogKinds (declare exactly the kinds you can render); on multi-client transports the request still reaches every attached client. A host that receives a kind it did not declare must not answer it (an error-subtype response is discarded and the dialog stays pending) \u2014 never with {behavior: "cancelled"}, which is a real settlement treated as the user dismissing the dialog. An unanswered dialog is cancelled by the CLI after its dialog deadline; the CLI may send one that has no deadline, which stays up until it is answered or the CLI withdraws it with a control_cancel_request.',
      ),
      payload: record(stringSchema(), unknown()).describe(
        "Dialog-specific data passed to the host renderer. Shape is defined per dialog_kind; the protocol transports it opaquely.",
      ),
      tool_use_id: stringSchema().optional(),
    }).describe(
      "Requests the SDK consumer to render a tool-driven blocking dialog and return the user choice. Used by tools that previously rendered Ink JSX via setToolJSX with an onDone callback.",
    ),
  );
  UserDialogResponseSchema = DoctorLazy(() =>
    objectSchema({
      behavior: _enum(["completed", "cancelled"]),
      result: unknown()
        .optional()
        .describe(
          "Dialog-specific result payload. Opaque to the protocol; the caller and dialog renderer agree on the shape per dialog_kind.",
        ),
    }).describe("Response from the SDK consumer for a request_user_dialog request."),
  );
  SDKSubmitFeedbackSubmitFeedbackMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("submit_feedback"),
      description: stringSchema(),
      surface: _enum(["cli", "ccd", "ccr", "ide", "sdk", "cowork"])
        .optional()
        .describe(
          "Where the feedback flow was initiated. Stamped into the POST body and tengu_bug_report_* analytics so the triage pipeline can distinguish CCD/CCR/IDE/Cowork reports from terminal reports landing in the same claude_cli_feedback table. Defaults to 'sdk'.",
        ),
      draft_id: stringSchema()
        .optional()
        .describe(
          "UUID of a local SendFeedback draft under ~/.claude/feedback/drafts/. When set, the handler reads the stored draft, rebuilds the description via buildDraftDescription() (so the upload matches the consent form the user reviewed; the cwd is neither uploaded nor named on the form's consent line \u2014 it never uploads as metadata, though a transcript attachment, separately consented, still carries real paths), bundles the draft's own transcript per attach_transcript, and deletes the draft file on success. The caller's description/type/title/area override the stored draft when provided (user edits on the review form).",
        ),
      type: _enum(["bug", "idea", "missing_capability"]).optional(),
      title: stringSchema().optional(),
      area: stringSchema().optional(),
      attach_transcript: booleanSchema()
        .optional()
        .describe(
          "Whether to bundle the draft's source-session transcript with the upload. Only meaningful alongside draft_id \u2014 the non-draft path always bundles the current session (unchanged). Defaults to true.",
        ),
      save_locally: booleanSchema()
        .optional()
        .describe(
          "The host told the user this report is saved on this machine and nothing is sent (feedback_mode 'bundle' when it read the mode). Honored even if the mode has since become 'post' or 'share' (a mid-session sign-in): the report is bundled, never sent; a mode of 'disabled' still refuses it. Ignored with draft_id.",
        ),
    }).describe(
      "@internal Submits a /feedback report (description + current session transcript + sanitized error log) to api.anthropic.com/api/claude_cli_feedback using the CLI's auth and redaction. Runs the same getFeedbackUnavailableReason() policy checks as the terminal /feedback command \u2014 when feedback is disabled (org policy, env kill-switch) or cannot be sent (3P provider, no Anthropic credentials) the response carries unavailable_reason instead of an error. When the server refuses the submission for the organization or the report's content, the response carries both unavailable_reason and failure_reason. A request carrying save_locally gets the terminal's local save instead: the report is written to a redacted zip on this machine and the response carries bundle_path, nothing sent \u2014 except where feedback is disabled, which still refuses.",
    ),
  );
  SubmitFeedbackResponseSchema = DoctorLazy(() =>
    objectSchema({
      feedback_id: stringSchema().nullable(),
      unavailable_reason: stringSchema()
        .optional()
        .describe(
          "Human-readable reason feedback cannot be sent. Set when /feedback is unavailable in this session (no submission was attempted), or when the server refused the submission for the organization or the report's content (failure_reason is also set).",
        ),
      is_zdr_org: booleanSchema().optional(),
      failure_reason: stringSchema().optional(),
      status_code: numberSchema().int().optional(),
      ccshare_url: stringSchema()
        .optional()
        .describe(
          "Internal share URL for the conversation. Only set in internal builds, when the upload succeeded or was handed to the host machine to finish (the page then appears once the person confirms the upload there); absent otherwise.",
        ),
      bundle_path: stringSchema()
        .optional()
        .describe(
          "In 'bundle' feedback mode (SDKFeedbackMode): the absolute path of the redacted zip the report was written to on this machine, instead of being sent; feedback_id is then the bundle id. Absent in every other mode.",
        ),
    }).describe(
      "@internal Result of a submit_feedback request. feedback_id is set on success (a sent report, or a bundle written to bundle_path); otherwise unavailable_reason, failure_reason or both explain why.",
    ),
  );
  SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("submit_survey_feedback"),
      description: stringSchema().describe(
        "The note the person typed in the follow-up box after rating the session. May be empty: the person pressed Send without typing.",
      ),
      appearance_id: stringSchema().describe(
        "The survey appearance's id, the appearance_id of its tengu_feedback_survey_event rows, so the report joins back to the rating.",
      ),
      survey_response: _enum(["bad", "fine", "good"]),
      survey_type: _enum(["session", "post_compact", "memory", "long_context"]).describe(
        "The survey's type; the session survey is 'session'.",
      ),
      surface: _enum(["cli", "ccd", "ccr", "ide", "sdk", "cowork"])
        .optional()
        .describe("Where the survey was shown. Defaults to 'sdk'."),
    }).describe(
      "@internal Sends the session survey's follow-up box: the report submit_feedback sends (note, session transcript, error log), joined to the survey appearance. Answered like submit_feedback, after its availability checks and the CLI's own plan check: a sign-in that survey_followup_box.transcript_allowed would be false for gets unavailable_reason and nothing is sent. An older CLI answers that the subtype is unsupported.",
    ),
  );
  SDKRemoteControlWorkSecretRemoteControlWorkSecretMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("remote_control_work_secret"),
      session_id: stringSchema().describe(
        "The attached claude.ai session whose worker token needs renewing.",
      ),
    }).describe(
      "@internal Request from the CLI subprocess to the SDK host for the session's re-dispatched work secret, sent when a bridge attached with `remote_control {work_secret}` needs a fresh worker token (before expiry, or during auth recovery). The host re-queues the session on its bridge environment and answers with the secret its next work poll delivers, or null when it has none yet \u2014 the CLI asks again on its own retry cadence.",
    ),
  );
  RemoteControlWorkSecretResponseSchema = DoctorLazy(() =>
    objectSchema({
      work_secret: stringSchema().nullable(),
    }).describe(
      "@internal The re-dispatched base64url work secret for the requested session, or null when the host has none available yet.",
    ),
  );
});
//@ chunk-7kayq7nc.js:808789-823253 placement
/**
 * 控制请求登记表：每项 g(请求 schema, 发起方 client/agent, 响应 schema)，用于校验与方向判定。
 */
var CONTROL_REQUEST_REGISTRY; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SDKControlRequestMessageSchema;
var PendingPermissionRequestsSchema;
var PendingUserDialogRequestsSchema;
var PendingElicitationsSchema;
var SDKSuccessSuccessMessageSchema;
var SDKErrorErrorMessageSchema;
var SDKControlResponseMessageSchema;
var SDKControlCancelRequestMessageSchema;
var SDKKeepAliveMessageSchema;
var SDKUpdateEnvironmentVariablesMessageSchema;
var SDKSessionNoticeMessageSchema;
var SDKQueuedNotificationMessageSchema;
var StdoutNotificationMessageSchema;
var StdoutMessageSchema;
deferInit("chunk-7kayq7nc.js:808789", () => {
  CONTROL_REQUEST_REGISTRY = DoctorLazy(() => [
    tryRenderShutdownMessage(
      SDKInterruptInterruptMessageSchema(),
      "client",
      SDKControlInterruptResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKCanUseToolCanUseToolMessageSchema(), "agent", CanUseToolResultSchema()),
    tryRenderShutdownMessage(
      SDKInitializeInitializeMessageSchema(),
      "client",
      SDKControlInitializeResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKSetPermissionModeSetPermissionModeMessageSchema(),
      "client",
      SDKControlSetPermissionModeResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKSetModelSetModelMessageSchema(),
      "client",
      SDKControlSetModelResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKSetMaxThinkingTokensSetMaxThinkingTokensMessageSchema(), "client", null),
    tryRenderShutdownMessage(SDKRenameSessionRenameSessionMessageSchema(), "client", null),
    tryRenderShutdownMessage(SDKSetColorSetColorMessageSchema(), "client", undefined),
    tryRenderShutdownMessage(
      SDKMcpStatusMcpStatusMessageSchema(),
      "client",
      SDKControlMcpStatusResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetContextUsageGetContextUsageMessageSchema(),
      "client",
      SDKControlGetContextUsageStrictResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetSessionCostGetSessionCostMessageSchema(),
      "client",
      SDKControlGetSessionCostResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKListModelsListModelsMessageSchema(),
      "client",
      SDKControlListModelsResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetUsageGetUsageMessageSchema(),
      "client",
      SDKControlGetUsageResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetMemoryDialogGetMemoryDialogMessageSchema(),
      "client",
      SDKControlGetMemoryDialogResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetSkillsDialogGetSkillsDialogMessageSchema(),
      "client",
      SDKControlGetSkillsDialogResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetChromeDialogGetChromeDialogMessageSchema(),
      "client",
      SDKControlGetChromeDialogResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetChromeBrowsersGetChromeBrowsersMessageSchema(),
      "client",
      SDKControlGetChromeBrowsersResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKSelectChromeBrowserSelectChromeBrowserMessageSchema(),
      "client",
      SDKControlSelectChromeBrowserResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetSandboxDialogGetSandboxDialogMessageSchema(),
      "client",
      SDKControlGetSandboxDialogResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetStatusGetStatusMessageSchema(),
      "client",
      SDKControlGetStatusResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKExportConversationExportConversationMessageSchema(),
      "client",
      SDKControlExportConversationResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKListCloudSessionsListCloudSessionsMessageSchema(),
      "client",
      SDKControlListCloudSessionsResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetCloudSessionGetCloudSessionMessageSchema(),
      "client",
      SDKControlGetCloudSessionResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetCloudSessionTranscriptGetCloudSessionTranscriptMessageSchema(),
      "client",
      SDKControlGetCloudSessionTranscriptResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetBinaryVersionGetBinaryVersionMessageSchema(),
      "client",
      SDKControlGetBinaryVersionResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKMcpCallMcpCallMessageSchema(), "client", SDKControlMcpCallResponseSchema()),
    tryRenderShutdownMessage(
      SDKFileSuggestionsFileSuggestionsMessageSchema(),
      "client",
      SDKControlFileSuggestionsResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKHookCallbackHookCallbackMessageSchema(), "agent", HookOutputSchema()),
    tryRenderShutdownMessage(SDKMcpMessageMcpMessageMessageSchema(), "both", McpMessageResponseSchema()),
    tryRenderShutdownMessage(
      SDKRewindFilesRewindFilesMessageSchema(),
      "client",
      SDKControlRewindFilesResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKCancelAsyncMessageCancelAsyncMessageMessageSchema(),
      "client",
      CancelAsyncMessageResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKReadFileReadFileMessageSchema(), "client", ReadFileResponseSchema()),
    tryRenderShutdownMessage(
      SDKListDirectoryListDirectoryMessageSchema(),
      "client",
      ListDirectoryResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetWorkspaceDiffGetWorkspaceDiffMessageSchema(),
      "client",
      WorkspaceDiffResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKGetPlanGetPlanMessageSchema(), "client", PlanResponseSchema()),
    tryRenderShutdownMessage(SDKSeedReadStateSeedReadStateMessageSchema(), "client", null),
    tryRenderShutdownMessage(
      SDKMcpSetServersMcpSetServersMessageSchema(),
      "client",
      SetMcpServersResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKRegisterRepoRootRegisterRepoRootMessageSchema(),
      "client",
      RegisterRepoRootResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKReloadPluginsReloadPluginsMessageSchema(),
      "client",
      ReloadPluginsResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKReloadSkillsReloadSkillsMessageSchema(),
      "client",
      ReloadSkillsResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKReloadOutputStylesReloadOutputStylesMessageSchema(),
      "client",
      ReloadOutputStylesResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKMcpReconnectMcpReconnectMessageSchema(), "client", null),
    tryRenderShutdownMessage(SDKMcpToggleMcpToggleMessageSchema(), "client", null),
    tryRenderShutdownMessage(
      SDKSetMcpPermissionModeOverrideSetMcpPermissionModeOverrideMessageSchema(),
      "client",
      undefined,
    ),
    tryRenderShutdownMessage(SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema(), "client", null),
    tryRenderShutdownMessage(
      SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema(),
      "client",
      null,
    ),
    tryRenderShutdownMessage(SDKSetCwdSetCwdMessageSchema(), "client", SetCwdResponseSchema()),
    tryRenderShutdownMessage(
      SDKClaimSessionClaimSessionMessageSchema(),
      "client",
      ClaimSessionResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema(),
      "client",
      RegisterDeviceHooksResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema(),
      "client",
      UploadDeviceHookTemplateResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKMessageRatedMessageRatedMessageSchema(),
      "client",
      MessageRatedResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKOauthTokenRefreshOauthTokenRefreshMessageSchema(),
      "agent",
      OAuthTokenRefreshResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKHostAuthTokenRefreshHostAuthTokenRefreshMessageSchema(),
      "agent",
      HostAuthTokenRefreshResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKStopTaskStopTaskMessageSchema(), "client", null),
    tryRenderShutdownMessage(
      SDKStartShellTaskStartShellTaskMessageSchema(),
      "client",
      StartShellTaskResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKBackgroundTasksBackgroundTasksMessageSchema(),
      "client",
      BackgroundTasksResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKGetTaskOutputGetTaskOutputMessageSchema(),
      "client",
      GetTaskOutputResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKApplyFlagSettingsApplyFlagSettingsMessageSchema(), "client", null),
    tryRenderShutdownMessage(SDKGetSettingsGetSettingsMessageSchema(), "client", GetSettingsResponseSchema()),
    tryRenderShutdownMessage(
      SDKGetHooksListingGetHooksListingMessageSchema(),
      "client",
      GetHooksListingResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKUpdateSettingsUpdateSettingsMessageSchema(), "client", null),
    tryRenderShutdownMessage(SDKElicitationElicitationMessageSchema(), "agent", ElicitationResponseSchema()),
    tryRenderShutdownMessage(
      SDKRequestUserDialogRequestUserDialogMessageSchema(),
      "agent",
      UserDialogResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKSubmitFeedbackSubmitFeedbackMessageSchema(),
      "client",
      SubmitFeedbackResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema(),
      "client",
      SubmitFeedbackResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema(),
      "client",
      RemoteToolsAnnounceResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKRemoteToolCallRemoteToolCallMessageSchema(),
      "agent",
      RemoteToolCallResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKRemotePlumbingCallRemotePlumbingCallMessageSchema(),
      "agent",
      RemotePlumbingCallResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKRemoteToolsProbeRemoteToolsProbeMessageSchema(),
      "agent",
      RemoteToolsProbeResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema(), "agent", null),
    tryRenderShutdownMessage(SDKUiAttachUiAttachMessageSchema(), "client", UiAttachResponseSchema()),
    tryRenderShutdownMessage(SDKUiDetachUiDetachMessageSchema(), "client", UiDetachResponseSchema()),
    tryRenderShutdownMessage(SDKUiRenderUiRenderMessageSchema(), "client", UiRenderResponseSchema()),
    tryRenderShutdownMessage(SDKUiPressUiPressMessageSchema(), "client", UiPressResponseSchema()),
    tryRenderShutdownMessage(
      SDKUiClientModuleUiClientModuleMessageSchema(),
      "client",
      UiClientModuleResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKUiClientPressUiClientPressMessageSchema(),
      "client",
      UiClientPressResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKUiMessageUiMessageMessageSchema(), "client", UiMessageResponseSchema()),
    tryRenderShutdownMessage(
      SDKUiClientFaultUiClientFaultMessageSchema(),
      "client",
      UiClientFaultResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKRemoteControlWorkSecretRemoteControlWorkSecretMessageSchema(),
      "agent",
      RemoteControlWorkSecretResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKTurnHandoffTurnHandoffMessageSchema(), "client", TurnHandoffResponseSchema()),
    tryRenderShutdownMessage(
      SDKListPermissionRulesListPermissionRulesMessageSchema(),
      "client",
      ListPermissionRulesResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKMcpReadResourceMcpReadResourceMessageSchema(),
      "client",
      McpReadResourceResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKUiInputUiInputMessageSchema(), "client", UiInputResponseSchema()),
    tryRenderShutdownMessage(SDKUiSelectUiSelectMessageSchema(), "client", UiSelectResponseSchema()),
    tryRenderShutdownMessage(SDKUiPanesUiPanesMessageSchema(), "client", PanesSchema()),
    tryRenderShutdownMessage(SDKUiPaneShowUiPaneShowMessageSchema(), "client", UiPaneShowResponseSchema()),
    tryRenderShutdownMessage(SDKUiPaneFocusUiPaneFocusMessageSchema(), "client", UiPaneFocusResponseSchema()),
    tryRenderShutdownMessage(SDKUiCloseUiCloseMessageSchema(), "client", UiCloseResponseSchema()),
    tryRenderShutdownMessage(SDKUiScrollUiScrollMessageSchema(), "client", UiScrollResponseSchema()),
    tryRenderShutdownMessage(SDKUiFocusUiFocusMessageSchema(), "client", UiFocusResponseSchema()),
    tryRenderShutdownMessage(
      SDKUiPromptEditUiPromptEditMessageSchema(),
      "client",
      UiPromptEditResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema(),
      "client",
      UiPromptAutocompleteResponseSchema(),
    ),
    tryRenderShutdownMessage(SDKUiCopyUiCopyMessageSchema(), "agent", UiCopyResponseSchema()),
    tryRenderShutdownMessage(
      SDKUiPromptReadUiPromptReadMessageSchema(),
      "agent",
      UiPromptReadResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKUiPromptFillUiPromptFillMessageSchema(),
      "agent",
      UiPromptFillResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKUiPromptPaintUiPromptPaintMessageSchema(),
      "agent",
      UiPromptPaintResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKUiPromptSuggestUiPromptSuggestMessageSchema(),
      "agent",
      UiPromptSuggestResponseSchema(),
    ),
    tryRenderShutdownMessage(
      SDKUiReadSelectionUiReadSelectionMessageSchema(),
      "agent",
      UiReadSelectionResponseSchema(),
    ),
  ]);
  SDKControlRequestMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("control_request"),
      request_id: stringSchema().describe(
        "Chosen by the sender, unique among its in-flight requests; the control_response (and any control_cancel_request) for this request echoes it.",
      ),
      request: SDKControlRequestInnerSchema(),
    }).describe(
      "Envelope for a control-protocol request, sent by either side on the same stream as the messages. The receiver normally answers with exactly one control_response carrying the same request_id (a few request types document when no answer is sent), and a requester ignores responses for request_ids it is not waiting on. Each request type's own documentation says which side sends it and what its success response carries.",
    ),
  );
  PendingPermissionRequestsSchema = DoctorLazy(() =>
    array(lazy(() => SDKControlRequestMessageSchema()))
      .optional()
      .describe(
        'can_use_tool requests this CLI process has issued and not yet resolved, so a client joining an already-initialized session learns about in-flight prompts. Always present (possibly empty) on a success `initialize` response from Claude Code v2.1.268 or later; earlier versions could omit it, so treat absence as an older CLI rather than as "nothing pending". A prompt inherited from a previous worker of the same session can remain answerable without appearing here and without a control_cancel_request; session_state "requires_action" on the same reply signals one the CLI is holding, but not every inherited prompt is signalled.',
      ),
  );
  PendingUserDialogRequestsSchema = DoctorLazy(() =>
    array(lazy(() => SDKControlRequestMessageSchema()))
      .optional()
      .describe(
        'request_user_dialog requests this CLI process has issued and not yet resolved (sibling of pending_permission_requests, with the same inherited-prompt caveat), so a client joining an already-initialized session can re-arm in-flight dialogs. Always present (possibly empty) on a success `initialize` response from Claude Code v2.1.268 or later; earlier versions could omit it, so treat absence as an older CLI rather than as "nothing pending". Receivers must tolerate the same request_id also arriving as a live or replayed control_request frame and render it once.',
      ),
  );
  PendingElicitationsSchema = DoctorLazy(() =>
    array(lazy(() => SDKControlRequestMessageSchema()))
      .optional()
      .describe(
        "elicitation requests that this CLI process sent and that are not yet answered or withdrawn (sibling of pending_permission_requests), each as it was sent, so a client that joins after an MCP server asked can still show the question. Present (possibly empty) on a success `initialize` response when this CLI lists them, which not every session does yet; absence says nothing about what is pending. Receivers must tolerate the same request_id also arriving as a live or replayed control_request frame and render it once.",
      ),
  );
  SDKSuccessSuccessMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("success"),
      request_id: stringSchema().describe("The request_id of the control_request this answers."),
      response: record(stringSchema(), unknown())
        .optional()
        .describe(
          "The success payload, shaped as documented for the answered request's subtype; absent or {} for requests that are merely acknowledged.",
        ),
      pending_permission_requests: PendingPermissionRequestsSchema(),
      pending_user_dialog_requests: PendingUserDialogRequestsSchema(),
      pending_elicitation_requests: PendingElicitationsSchema(),
    }).describe("The request was handled."),
  );
  SDKErrorErrorMessageSchema = DoctorLazy(() =>
    objectSchema({
      subtype: literal("error"),
      request_id: stringSchema().describe("The request_id of the control_request this answers."),
      error: stringSchema().describe("Human-readable failure description."),
      error_code: _enum(SDK_ERROR_CODES)
        .optional()
        .catch(undefined)
        .describe(
          "@internal Why the request got an error answer, stamped from the state the handler branched on (never parsed from `error`, though some of that state rests on the error message of another component, for example that of the MCP SDK for mcp_client_registration_unavailable). set_model: invalid_request, catalog_unknown (not shaped like a model id), not_found (the API serves no such model), restricted_by_org, unavailable_for_account, not_offered (this build does not offer it; `error` names the Claude Code version it requires only when its catalog row states one above this build), alias_1m_disabled (CLAUDE_CODE_DISABLE_1M_CONTEXT), alias_1m_unsupported, blocked_by_hook (also when the model kept changing while the hooks ran, which a retry may get past), check_failed (the API settled nothing about the model; a retry may pass), check_rejected (the API answered with an error no retry or sign-in clears), credits_required (a 429 whose body carries that error_code, and nothing clears it by itself), rate_limit (any other 429, even a usage-credits refusal that has no such code or that clears by itself), auth_failed (sign in again), model_not_current, verdict_pending (from older builds only; not a refusal: the outcome follows as a system/informational message), internal_error (the switch may or may not have applied). apply_flag_settings: rarely internal_error, and verdict_pending from older builds. set_permission_mode: invalid_mode, bypass_restricted, bypass_disabled, bypass_not_launched, and for auto auto_mode_settings, auto_mode_circuit_breaker, auto_mode_fast_mode, auto_mode_model or auto_mode_unavailable. remote_control (a failed enable whose cause the bridge reported): remote_control_auth (sign in again), remote_control_terminal, remote_control_ended_elsewhere, remote_control_policy_disabled. get_workspace_diff: workspace_diff_pending (the diff was not ready when the reply was due; ask again shortly, since a diff that finishes in the meantime is returned to the next request that comes within a minute). interrupt (a claude-code-server tenant, by worker_epoch): stale_worker_epoch (it is for another worker life; no turn was stopped), invalid_worker_epoch (it is no whole number of 1 or more; likewise). read_file with the anchor as_written: read_denied (the one refusal, the same for every cause; a plain read_file and the other anchors carry no code). mcp_authenticate (a reply from a `claude -p` session, over stdio or its --sdk-url connection, which includes the sessions that `claude remote-control` spawns; a reply relayed by the Remote Control bridge that a session itself runs carries none, and a claude-code-server tenant does not serve the request): mcp_client_registration_unavailable (the authorization server gives this client no way to register: it offers no registration endpoint, or the endpoint refused; retrying will not help until that changes), mcp_redirect_uri_unusable (the request set redirectUriOnly and named no redirectUri, or the config of the server sets oauth.clientId or oauth.xaa, or the failure is one that gets mcp_client_registration_unavailable without redirectUriOnly). Absent on every other error; new values are additive, so treat an unknown one as absent.",
        ),
      model: stringSchema()
        .optional()
        .describe(
          "@internal set_model only: the model the session's next turn runs as of this answer, spelled as on the success payload's `model`. A refusal leaves the model as it was, and a restarted cloud worker can already run the requested model: it starts on the host's last pick. One refusal moves it: when the server refuses for good the model that a restarted worker started on, before any turn, the session goes back to the model recorded for it. The fixed 'set_model failed' reply can follow an applied switch, so it names the model too. A refusal fallback in a running turn, before or after this answer, can move the next turn to another model. `claude -p` writes it on its stream-json control channel, unless it cannot read the model. A claude-code-server tenant writes it too. claude -p's Remote Control bridge lane and interactive Remote Control leave it out.",
        ),
      pending_permission_requests: PendingPermissionRequestsSchema(),
      pending_user_dialog_requests: PendingUserDialogRequestsSchema(),
      pending_elicitation_requests: PendingElicitationsSchema(),
    }).describe(
      "The request failed or was rejected (unknown subtype, invalid arguments, or an error while handling it).",
    ),
  );
  SDKControlResponseMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("control_response"),
      response: union([SDKSuccessSuccessMessageSchema(), SDKErrorErrorMessageSchema()]),
    }).describe(
      "Envelope for the single reply to a control_request, sent by whichever side received the request.",
    ),
  );
  SDKControlCancelRequestMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("control_cancel_request"),
      request_id: stringSchema().describe("The request_id of the control_request being withdrawn."),
    }).describe(
      "Tells the other side that the sender no longer needs the answer to one of its own in-flight control_requests (for example a pending can_use_tool prompt after the turn was interrupted, or one that another client already answered). Either side may send it for a request it originated. The sender stops waiting at once and ignores any control_response that still arrives for that request_id; a receiver that can abort the work does so and may still reply (typically with an error), otherwise it simply completes the request. There is no reply to the cancel itself.",
    ),
  );
  SDKKeepAliveMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("keep_alive"),
    }).describe(
      "Liveness heartbeat. Either side may send it at any time (the CLI emits it periodically, for example while a long-running control request is in progress); receivers must ignore it. It has no payload. One use is not part of this schema: for startup() and prewarm() of the Agent SDK, which set CLAUDE_CODE_SDK_READS_STARTUP_MARKS, the CLI writes lines of this type with a `startup_mark` field, the name of a start-up checkpoint that it has passed, before the initialize response.",
    ),
  );
  SDKUpdateEnvironmentVariablesMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("update_environment_variables"),
      variables: record(stringSchema(), stringSchema()),
      request_id: stringSchema().optional(),
    }).describe("Updates environment variables at runtime."),
  );
  SDKSessionNoticeMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("session_notice"),
      uuid: stringSchema(),
      notice_class: stringSchema().describe(
        'Server-chosen notice class: "peer_notice" | "helper_lifecycle" | "handoff" (open snake_case set; unknown tokens are carried verbatim).',
      ),
      from_session_id: stringSchema().describe("Server-verified sender session id."),
      content: stringSchema(),
      isSynthetic: literal(true).describe(
        "Server-asserted synthetic stamp \u2014 stripped from inbound copies at CCR ingress and re-stamped only by the notice composer.",
      ),
      inbound_origin: literal("mcp_session_notice").describe(
        "Server-asserted ingest-path marker, same strip-and-restamp discipline as isSynthetic.",
      ),
      session_id: stringSchema().optional(),
    }).describe(
      "@internal Backend\u2192CLI: a server-composed coordination notice for a sealed helper session, delivered to the model over the Poll event channel as a provenance-attributed <event> envelope (never a user turn, never a synthetic message). The CLI acks processed only when the Poll delivery settles into the transcript; undelivered notices redeliver.",
    ),
  );
  SDKQueuedNotificationMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("queued_notification"),
      notification: objectSchema({
        notification_id: stringSchema().describe(
          "Server-assigned stable id \u2014 the dedup key across redeliveries.",
        ),
        origin: stringSchema().describe(
          'Server-attested source token: "github_webhook" | "trigger_fire" | "mcp_send_message" (open set; unknown values render verbatim).',
        ),
        content: stringSchema().describe(
          "Exactly the text that would previously have been injected as a user turn, framing included.",
        ),
        priority: _enum(["now", "next", "later"]),
        queued_at: stringSchema().describe("RFC3339 timestamp of when the backend queued it."),
        fire_reason: stringSchema()
          .optional()
          .describe(
            'Why the backend fired a "trigger_fire" notification: "scheduled" | "retry" | "catch_up" | "manual" | "api", or "webhook" for a GitHub event (open set). Absent where the backend gives no reason, as for a fire through a webhook URL.',
          ),
        own_session_author: booleanSchema()
          .optional()
          .describe(
            "True only on a scheduled fire of a routine that this session's own Claude created for itself, as the backend attests. Left out otherwise.",
          ),
      }),
      uuid: stringSchema().optional(),
      session_id: stringSchema().optional(),
    }).describe(
      "@internal Backend\u2192CLI: a trigger delivery (webhook activity, scheduled trigger, agent message) queued server-side instead of injected as a user turn. The CLI buffers it, nudges the model to call the ReadNotifications tool, and acks the event processed only when drained \u2014 an undrained event redelivers on resume.",
    ),
  );
  StdoutNotificationMessageSchema = DoctorLazy(() =>
    union([
      SDKMessageSchema(),
      SDKSystemPostTurnSummaryMessageSchema(),
      SDKSystemTaskSummaryMessageSchema(),
      SDKSystemSessionMetadataMessageSchema(),
      SDKTranscriptMirrorMessageSchema(),
      SDKActiveGoalMessageSchema(),
      SDKAutocompactStateMessageSchema(),
    ]).describe(
      "Observational messages the agent loop emits \u2014 fire-and-forget, no reply expected. The remaining StdoutMessage members are control-protocol traffic (requests the loop originates and needs a reply to, responses to client-originated requests, keep-alives). This sub-union is the target for QueryEvent convergence so a Transport-shaped REPL can consume events without filtering control noise.",
    ),
  );
  StdoutMessageSchema = DoctorLazy(() =>
    union([
      SDKMessageSchema(),
      SDKSystemPostTurnSummaryMessageSchema(),
      SDKSystemTaskSummaryMessageSchema(),
      SDKSystemSessionMetadataMessageSchema(),
      SDKTranscriptMirrorMessageSchema(),
      SDKActiveGoalMessageSchema(),
      SDKControlResponseMessageSchema(),
      SDKControlRequestMessageSchema(),
      SDKControlCancelRequestMessageSchema(),
      SDKKeepAliveMessageSchema(),
      SDKAutocompactStateMessageSchema(),
    ]).describe(
      "Everything the CLI writes to its output stream (stdout in stream-json mode): exactly one StdoutMessage per line, as a single JSON object. Besides the SDKMessage members this includes the control protocol - control requests the CLI originates, control responses to the client's requests, cancellations and keep-alives.",
    ),
  );
});
//@ chunk-7kayq7nc.js:823253-824228 placement
var StdinMessageSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7kayq7nc.js:823253", () => {
  StdinMessageSchema = DoctorLazy(() =>
    union([
      SDKUserMessageBaseSchema(),
      SDKBashCommandMessageSchema(),
      SDKControlRequestMessageSchema(),
      SDKControlResponseMessageSchema(),
      SDKControlCancelRequestMessageSchema(),
      SDKKeepAliveMessageSchema(),
      SDKUpdateEnvironmentVariablesMessageSchema(),
      SDKQueuedNotificationMessageSchema(),
      SDKSessionNoticeMessageSchema(),
    ]).describe(
      "Everything a client may write to the CLI's input stream (stdin in stream-json input mode): exactly one StdinMessage per line, as a single JSON object - user messages that start turns, control requests the client originates, control responses answering the CLI's requests, cancellations and keep-alives. initialize is optional and normally the first line; the first user message initializes with defaults. An initialize that arrives later (e.g. from a client joining the session) is answered with the current state: the one-time session setup (e.g. system prompt, agents, skills, supportedDialogKinds) is not re-applied, but title, sdkMcpServers and agentProgressSummaries are still processed on every initialize, and hooks sent by the process that owns this stream replace the earlier set (see hooks_applied on the response). Closing the stream tells the CLI to finish the current turn and exit.",
    ),
  );
});
//@ chunk-ck4jrdtf.js:34569-34654 fingerprint (2.1.88 match: SDKUpdateEnvironmentVariablesMessageSchema, 0.312)
/**
 * 允许经桥转发的 SDK 消息类型集合（bash_command、update_environment_variables、assistant、system）。
 */
var BRIDGE_FORWARDED_MESSAGE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ck4jrdtf.js:34569", () => {
  BRIDGE_FORWARDED_MESSAGE_TYPES = new Set([
    "bash_command",
    "update_environment_variables",
    "assistant",
    "system",
  ]);
});
//@ chunk-5xgkngpb.js:86618-86677 fingerprint (2.1.88 match: SDKControlInterruptRequestSchema, 0.392)
/**
 * 信号是否被中止且不是因 interrupt 中止（按参数）。
 */
var isAbortedNotByInterrupt = (signal, isInterrupt) =>
  signal.aborted && !(isInterrupt && unwrapAbortReason(signal.reason) === "interrupt");
//@ chunk-0tcpyvr1.js:1299-1399 fingerprint (2.1.88 match: SDKControlReloadPluginsRequestSchema, 0.328)
function SDKControlReloadPluginsRequestSchema(redactsForControlRequest, name) {
  return name.startsWith("mcp_") || name === "reload_plugins"
    ? redactsOrPersists(redactsForControlRequest)
    : redactsForControlRequest.redactsPersistedLane();
}
//@ chunk-hjswk319.js:28377-28509 fingerprint (2.1.88 match: SDKControlInitializeResponseSchema, 0.544)
/**
 * 构造空的 initialize 响应（无命令/代理/模型，带 account 与 pid）。
 */
function createEmptyInitializeResponse(account) {
  return {
    commands: [],
    agents: [],
    output_style: "default",
    available_output_styles: [],
    models: [],
    account,
    pid: process.pid,
  };
}
//@ chunk-asf5gh8x.js:24845-24970 affinity
class HostConfigCancelledError extends Error {
  constructor() {
    super("host config copy cancelled after timeout");
    this.name = "HostConfigCancelledError";
  }
}
//@ chunk-asf5gh8x.js:24970-25013 fingerprint (2.1.88 match: SDKControlCancelAsyncMessageResponseSchema, 0.416)
function throwIfHostConfigCancelled(cancel) {
  if (cancel.cancelled) throw new HostConfigCancelledError();
}
//@ chunk-5dqwe9kx.js:1538-1781 fingerprint (2.1.88 match: SDKControlApplyFlagSettingsRequestSchema, 0.305)
/**
 * 远程传输下把 apply_flag_settings 转发给远端会话；不能转发时返回"仅本地生效"的提示。
 */
function forwardApplyFlagSettings(settings) {
  if (!getRemoteCaps()) return null;
  if (!isRemoteControlChannelAvailable())
    return " (applied locally \u2014 this remote transport can\u2019t change the remote session\u2019s settings)";
  getRemoteCaps()
    ?.sendControlRequest({
      subtype: "apply_flag_settings",
      settings,
    })
    .catch(logError);
  return null;
}
//@ chunk-1kk50rk6.js:34243-34361 fingerprint (2.1.88 match: SDKControlResponseSchema, 0.635)
/**
 * 从 control_response 消息里取出并解析 response 部分。
 */
function extractControlResponse(message) {
  let response = message.type === "control_response" ? message.response : undefined;
  return typeof response === "object" && response !== null ? getControlRequestSubtype_2(response) : undefined;
}
//@ chunk-0yw3taqg.js:131888-131944 fingerprint (2.1.88 match: SDKKeepAliveMessageSchema, 0.554)
/**
 * 生成一个往出站队列推 keep_alive 消息的函数。
 */
function createKeepAliveSender(outbound) {
  return () =>
    outbound.enqueue({
      type: "keep_alive",
    });
}
//@ chunk-0yw3taqg.js:295671-295932 fingerprint (2.1.88 match: JSONRPCMessagePlaceholder, 0.346)
function parseHintFrames(restartStarts) {
  if (restartStarts === undefined || restartStarts === null)
    return {
      starts: [],
      new_frames: [],
      unknown: {},
    };
  let parsed = turnDispatchContinuationSchema().safeParse(restartStarts);
  if (!parsed.success) return "malformed";
  let { starts = [], new_frames: newFrames = [], ...unknown } = parsed.data;
  return {
    starts,
    new_frames: newFrames.slice(0, MAX_BATCHED_PROMPT_ID_CHARS).map((newFrame) => newFrame.toLowerCase()),
    unknown,
  };
}
//@ chunk-h29vk4wn.js:37263-37417 fingerprint (2.1.88 match: SDKControlRequestSchema, 0.712)
/**
 * 用指定的 schema 校验一条 control_request，返回 {type, request_id, request} 或 null。
 */
function parseControlRequest(message, schemaKey) {
  let parsed = CONTROL_REQUEST_SCHEMAS[schemaKey]().safeParse(message);
  if (!parsed.success) return null;
  return {
    type: "control_request",
    request_id: parsed.data.request_id,
    request: parsed.data.request,
  };
}
//@ chunk-czq1j3j2.js:183102-183282 fingerprint (2.1.88 match: SDKControlGetContextUsageRequestSchema, 0.404)
/**
 * 通过控制通道向对端发 get_context_usage 请求（可带 detail），并用响应 schema 解析结果。
 */
async function requestContextUsage(controlChannel, options = {}) {
  return parseThinClientReply(
    "get_context_usage",
    SDKControlGetContextUsageResponseSchema(),
    await controlChannel.sendControlRequest(
      {
        subtype: "get_context_usage",
        ...(options.detail !== undefined && {
          detail: options.detail,
        }),
      },
      {
        signal: options.signal,
      },
    ),
  );
}
//@ chunk-czq1j3j2.js:183282-185156 fingerprint (2.1.88 match: SDKControlGetContextUsageResponseSchema, 0.805)
/**
 * get_context_usage 响应 schema：categories、totalTokens/maxTokens/rawMaxTokens、gridRows、memoryFiles、mcpTools、deferredBuiltinTools、systemTools、systemPromptSections、agents、slashCommands、skills、messageBreakdown、apiUsage 等，多数字段带 catch 容错。
 */
var SDKControlGetContextUsageResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:183282", () => {
  SDKControlGetContextUsageResponseSchema = DoctorLazy(() => {
    let tokenEntry = objectSchema({
      name: stringSchema(),
      tokens: numberSchema(),
    });
    return objectSchema({
      categories: array(
        objectSchema({
          id: _enum(CONTEXT_CATEGORY_ORDER).optional().catch(undefined),
          name: stringSchema(),
          tokens: numberSchema(),
          color: looseStringSchema().catch("inactive"),
          isDeferred: booleanSchema().optional().catch(undefined),
          kind: _enum(CONTEXT_CATEGORY_KINDS).optional().catch(undefined),
        }),
      ),
      totalTokens: numberSchema(),
      maxTokens: numberSchema(),
      rawMaxTokens: numberSchema().optional().catch(undefined),
      autocompactSource: looseStringSchema().catch("model-default"),
      percentage: numberSchema(),
      gridRows: array(
        array(
          objectSchema({
            color: looseStringSchema(),
            isFilled: booleanSchema(),
            categoryName: stringSchema(),
            tokens: numberSchema(),
            percentage: numberSchema(),
            squareFullness: numberSchema(),
          }),
        ),
      ).catch([]),
      model: stringSchema().catch(""),
      memoryFiles: array(
        objectSchema({
          path: stringSchema(),
          type: stringSchema(),
          tokens: numberSchema(),
        }),
      ).catch([]),
      mcpTools: array(
        objectSchema({
          name: stringSchema(),
          serverName: stringSchema(),
          tokens: numberSchema(),
          isLoaded: booleanSchema().optional().catch(undefined),
        }),
      ).catch([]),
      deferredBuiltinTools: array(
        objectSchema({
          name: stringSchema(),
          tokens: numberSchema(),
          isLoaded: booleanSchema(),
        }),
      )
        .optional()
        .catch(undefined),
      systemTools: array(tokenEntry).optional().catch(undefined),
      systemPromptSections: array(tokenEntry).optional().catch(undefined),
      agents: array(
        objectSchema({
          agentType: stringSchema(),
          source: looseStringSchema(),
          tokens: numberSchema(),
        }),
      ).catch([]),
      slashCommands: objectSchema({
        totalCommands: numberSchema(),
        includedCommands: numberSchema(),
        tokens: numberSchema(),
      })
        .optional()
        .catch(undefined),
      skills: objectSchema({
        totalSkills: numberSchema(),
        includedSkills: numberSchema(),
        tokens: numberSchema(),
        skillFrontmatter: array(
          objectSchema({
            name: stringSchema(),
            source: looseStringSchema(),
            pluginName: stringSchema().optional().catch(undefined),
            tokens: numberSchema(),
          }),
        ).catch([]),
      })
        .optional()
        .catch(undefined),
      autoCompactThreshold: numberSchema().optional().catch(undefined),
      isAutoCompactEnabled: booleanSchema().catch(false),
      messageBreakdown: objectSchema({
        toolCallTokens: numberSchema(),
        toolResultTokens: numberSchema(),
        attachmentTokens: numberSchema(),
        assistantMessageTokens: numberSchema(),
        userMessageTokens: numberSchema(),
        redirectedContextTokens: numberSchema().catch(0),
        unattributedTokens: numberSchema().catch(0),
        toolCallsByType: array(
          objectSchema({
            name: stringSchema(),
            callTokens: numberSchema(),
            resultTokens: numberSchema(),
          }),
        ).catch([]),
        attachmentsByType: array(tokenEntry).catch([]),
      })
        .optional()
        .catch(undefined),
      apiUsage: objectSchema({
        input_tokens: numberSchema(),
        output_tokens: numberSchema(),
        cache_creation_input_tokens: numberSchema(),
        cache_read_input_tokens: numberSchema(),
      })
        .nullable()
        .catch(null),
    }).transform((parsed) => ({
      ...parsed,
      categories: parsed.categories.map((category) => ({
        ...category,
        kind: category.kind ?? getContextCategoryKind(category),
      })),
      rawMaxTokens: parsed.rawMaxTokens ?? parsed.maxTokens,
    }));
  });
});
//@ chunk-czq1j3j2.js:1617962-1618139 fingerprint (2.1.88 match: SDKControlSetMaxThinkingTokensRequestSchema, 0.302)
/**
 * 分派控制请求：set_max_thinking_tokens 本地处理，属于懒加载处理集合的 subtype 交给 dispatchControlRequest。
 */
function dispatchLocalControlRequest(request, context) {
  if (request.subtype === "set_max_thinking_tokens")
    return wrapControlHandler(handleSetMaxThinkingTokens, request, context);
  if (!isLazyDispatchedSubtype(request)) return;
  return import("../../cli/print/dispatchControlRequest.js").then(({ dispatchControlRequest }) =>
    dispatchControlRequest(request, context),
  );
}
//@ chunk-czq1j3j2.js:1618139-1618181 sole-consumer
function isLazyDispatchedSubtype(request) {
  return READ_ONLY_CONTROL_COMMAND_NAMES.has(request.subtype);
}
//@ chunk-0h9p4sxp.js:19621-19708 affinity
var UNATTENDED_CLOUD_SESSION_MESSAGE =
  "this cloud session runs unattended (claude -p --cloud): there is no one to ask";
//@ chunk-0h9p4sxp.js:19708-20130 fingerprint (2.1.88 match: ControlResponseSchema, 0.346)
/**
 * 无人值守云会话（claude -p --cloud）里对控制请求的自动回复：can_use_tool 一律 deny（带原因），其他 subtype 回 error。
 */
function autoRespondUnattended(controlRequest) {
  let { request } = controlRequest;
  if (request.subtype === "can_use_tool" && typeof request.tool_name === "string") {
    let permissionRequestMessage = createPermissionRequestMessage(request.tool_name);
    let decisionReason = typeof request.decision_reason === "string" ? request.decision_reason : "";
    return {
      type: "control_response",
      response: {
        subtype: "success",
        request_id: controlRequest.request_id,
        response: {
          behavior: "deny",
          message:
            decisionReason !== "" && !permissionRequestMessage.includes(decisionReason)
              ? `${permissionRequestMessage} ${decisionReason}`
              : permissionRequestMessage,
        },
      },
    };
  }
  return {
    type: "control_response",
    response: {
      subtype: "error",
      request_id: controlRequest.request_id,
      error: UNATTENDED_CLOUD_SESSION_MESSAGE,
    },
  };
}
export {
  SDKControlResponseMessageSchema,
  SDKControlCancelRequestMessageSchema,
  createKeepAliveSender,
  SDKControlReloadPluginsRequestSchema,
  SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema,
  SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema,
  StdoutMessageSchema,
  ElicitationResponseSchema,
  UserDialogResponseSchema,
  RemoteControlWorkSecretResponseSchema,
  autoRespondUnattended,
  parseHintFrames,
  SDKTurnHandoffTurnHandoffMessageSchema,
  extractControlResponse,
  forwardApplyFlagSettings,
  SDKRemoteToolsAnnounceRemoteToolsAnnounceMessageSchema,
  SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema,
  isAbortedNotByInterrupt,
  RegisterDeviceHooksResponseSchema,
  SDKCanUseToolCanUseToolMessageSchema,
  SDKHookCallbackHookCallbackMessageSchema,
  SDKMcpMessageMcpMessageMessageSchema,
  SDKElicitationElicitationMessageSchema,
  SDKRequestUserDialogRequestUserDialogMessageSchema,
  SDKRemoteToolCallRemoteToolCallMessageSchema,
  SDKRemotePlumbingCallRemotePlumbingCallMessageSchema,
  SDKRemoteToolsProbeRemoteToolsProbeMessageSchema,
  SDKRemoteControlWorkSecretRemoteControlWorkSecretMessageSchema,
  SDKInterruptInterruptMessageSchema,
  SDKInitializeInitializeMessageSchema,
  SDKSetPermissionModeSetPermissionModeMessageSchema,
  SDKSetModelSetModelMessageSchema,
  SDKSetMaxThinkingTokensSetMaxThinkingTokensMessageSchema,
  SDKRenameSessionRenameSessionMessageSchema,
  SDKSetColorSetColorMessageSchema,
  SDKMcpStatusMcpStatusMessageSchema,
  SDKGetContextUsageGetContextUsageMessageSchema,
  SDKGetSessionCostGetSessionCostMessageSchema,
  SDKListModelsListModelsMessageSchema,
  SDKGetUsageGetUsageMessageSchema,
  SDKGetMemoryDialogGetMemoryDialogMessageSchema,
  SDKGetSkillsDialogGetSkillsDialogMessageSchema,
  SDKGetChromeDialogGetChromeDialogMessageSchema,
  SDKGetChromeBrowsersGetChromeBrowsersMessageSchema,
  SDKSelectChromeBrowserSelectChromeBrowserMessageSchema,
  SDKGetSandboxDialogGetSandboxDialogMessageSchema,
  SDKGetStatusGetStatusMessageSchema,
  SDKExportConversationExportConversationMessageSchema,
  SDKListCloudSessionsListCloudSessionsMessageSchema,
  SDKGetCloudSessionGetCloudSessionMessageSchema,
  SDKGetCloudSessionTranscriptGetCloudSessionTranscriptMessageSchema,
  SDKGetBinaryVersionGetBinaryVersionMessageSchema,
  SDKMcpCallMcpCallMessageSchema,
  SDKFileSuggestionsFileSuggestionsMessageSchema,
  SDKRewindFilesRewindFilesMessageSchema,
  SDKCancelAsyncMessageCancelAsyncMessageMessageSchema,
  SDKReadFileReadFileMessageSchema,
  SDKListDirectoryListDirectoryMessageSchema,
  SDKGetWorkspaceDiffGetWorkspaceDiffMessageSchema,
  SDKGetPlanGetPlanMessageSchema,
  SDKSeedReadStateSeedReadStateMessageSchema,
  SDKMcpSetServersMcpSetServersMessageSchema,
  SDKRegisterRepoRootRegisterRepoRootMessageSchema,
  SDKReloadPluginsReloadPluginsMessageSchema,
  SDKReloadSkillsReloadSkillsMessageSchema,
  SDKReloadOutputStylesReloadOutputStylesMessageSchema,
  SDKMcpReconnectMcpReconnectMessageSchema,
  SDKMcpToggleMcpToggleMessageSchema,
  SDKSetMcpPermissionModeOverrideSetMcpPermissionModeOverrideMessageSchema,
  SDKSetCwdSetCwdMessageSchema,
  SDKClaimSessionClaimSessionMessageSchema,
  SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema,
  SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema,
  SDKStopTaskStopTaskMessageSchema,
  SDKStartShellTaskStartShellTaskMessageSchema,
  SDKBackgroundTasksBackgroundTasksMessageSchema,
  SDKGetTaskOutputGetTaskOutputMessageSchema,
  SDKApplyFlagSettingsApplyFlagSettingsMessageSchema,
  SDKGetSettingsGetSettingsMessageSchema,
  SDKGetHooksListingGetHooksListingMessageSchema,
  SDKUpdateSettingsUpdateSettingsMessageSchema,
  SDKSubmitFeedbackSubmitFeedbackMessageSchema,
  SDKSubmitSurveyFeedbackSubmitSurveyFeedbackMessageSchema,
  SDKListPermissionRulesListPermissionRulesMessageSchema,
  SDKMcpReadResourceMcpReadResourceMessageSchema,
  dispatchLocalControlRequest,
  throwIfHostConfigCancelled,
  parseControlRequest,
  BRIDGE_FORWARDED_MESSAGE_TYPES,
  requestContextUsage,
  createEmptyInitializeResponse,
  BASE64_BODY_RE,
  PathAnchorSchema,
};
