/**
 * utils/telemetry/errorClassNames.ts
 *
 * 2.1.316 新增：已知错误类名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */

//@ chunk-e6aww6q8.js:3031957-3033289 placement
/**
 * 已知错误类名清单，用于遥测中区分错误类型。
 */
var KNOWN_ERROR_CLASS_NAMES = new Set([
  "AgentPreconditionError",
  "AgentTypeError",
  "ArtifactInputError",
  "ClaudeAiProxyBearerRejectedError",
  "ConnectorRegistryUnavailableError",
  "CutOffAgentCallError",
  "PluginSkillSearchUnavailableError",
  "DesignSyncPreconditionError",
  "DomainBlockedError",
  "DomainCheckFailedError",
  "EgressBlockedError",
  "RipgrepTargetUnreadableError",
  "RipgrepTimeoutError",
  "RipgrepUsageError",
  "FileStateError",
  "FileTooLargeError",
  "HardLinkWriteRefusedError",
  "ImageResizeError",
  "LinuxSandboxProfileError",
  "McpError",
  "ProtocolError",
  "SdkError",
  "SdkHttpError",
  "McpResponseSchemaError",
  "MonitorMcpPreconditionError",
  "MonitorWsPreconditionError",
  "NativeToolElsewhereError",
  "NotebookReadError",
  "PlanPreconditionError",
  "ProjectsPreconditionError",
  "RemoteAgentPreconditionError",
  "SandboxBridgeUnavailableError",
  "SandboxCommandTooLongError",
  "SandboxInitFailedError",
  "SandboxPolicyRefusalError",
  "SandboxProtectionNotRenewedError",
  "SandboxUnavailableForShellError",
  "ScheduleWakeupInputError",
  "SelectedRangeTooLargeError",
  "SelfHostedRunnerApiError",
  "SendMessagePreconditionError",
  "StagingDirTamperedError",
  "StreamableHTTPError",
  "SwarmPaneError",
  "SymlinkReadRefusedError",
  "SymlinkWriteRefusedError",
  "TooManyRedirectsError",
  "WebFetchTransportError",
  "WorkflowInputError",
  "WorkflowRemotePreconditionError",
  "WorktreeGitTransientError",
  "WorktreeIsolationError",
]);
//@ chunk-e6aww6q8.js:3033289-3033300 placement
var MAX_SEEN_PLUGIN_HINTS = 64;
export { KNOWN_ERROR_CLASS_NAMES, MAX_SEEN_PLUGIN_HINTS };
