/**
 * utils/telemetry/errorClassNames.ts
 *
 * 2.1.316 新增：已知错误类名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */

//@ chunk-5xgkngpb.js:3108244-3109576 placement
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
//@ chunk-5xgkngpb.js:3109576-3109587 placement
var MAX_SEEN_PLUGIN_HINTS = 64;
export { MAX_SEEN_PLUGIN_HINTS, KNOWN_ERROR_CLASS_NAMES };
