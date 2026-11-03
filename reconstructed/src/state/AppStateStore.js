/**
 * state/AppStateStore.ts
 *
 * AppState 的默认值 getDefaultAppState（设置、任务、权限上下文、MCP/插件、todos、文件历史、UI 开关等字段）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/AppStateStore.ts
 * pieces: chunk-30s1dxp3.js (2), chunk-pyk0acyv.js (1)
 * attribution: placement 2, fingerprint 1
 */
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { getEmptyToolPermissionContext } from "../Tool.js";
import { UNLIMITED } from "./statusLineWidth.js";
import { DEFAULT } from "../utils/proactivityMode.js";
import { createEmptyAttributionState } from "../utils/commitAttribution.js";
import {
  freeze,
  freeze_2,
  freeze_3,
  freeze_7,
  freeze_8,
  freeze_4,
  freeze_5,
  freeze_6,
  freeze_9,
  freeze_10,
  freeze_11,
  freeze_12,
  freeze_13,
  FROZEN_EMPTY_OBJECTS,
} from "./frozenSentinels.js";
import { isBetaHeaderAllowed } from "../utils/betas.js";
import { shouldEnablePromptSuggestion } from "../services/PromptSuggestion/promptSuggestion.js";
import { isAwaySummaryEnabled } from "../services/awaySummary.js";

//@ chunk-30s1dxp3.js:228-290 placement
var EMPTY_PROJECTS_SELF_IDENTITY = { accountKey: null, ownMessageIds: [], wireAccountId: null };
/**
 * AppState 默认值。
 */
//@ chunk-30s1dxp3.js:290-1575 placement
function getDefaultAppState() {
  return {
    ...getDefaultAppState_2(),
    taskDecorations: {},
    prStatus: null,
    prNeedsAuth: !1,
    expandedView: "none",
    replTab: "convo",
    panelFileView: null,
    diffPanelVisible: !1,
    paneHoldsToasts: !1,
    coordinatorTaskIndex: -1,
    workflowFooterIndex: 0,
    viewSelectionMode: "none",
    queueEditIndex: null,
    footerSelection: null,
    footerLinks: [],
    remoteSessionUrl: void 0,
    projectsSelfIdentity: EMPTY_PROJECTS_SELF_IDENTITY,
    remoteConnectionStatus: "connecting",
    remoteModeSessions: {},
    remoteBootstrap: null,
    remoteBackgroundTasks: [],
    remoteWorkflowRuns: [],
    remoteForegroundTask: "none",
    remoteWorkerReportedGone: !1,
    workerInventory: null,
    hasRemoteReplyChannel: !1,
    replBridgeAutoOnByDefault: !1,
    replBridgeConnected: !1,
    replBridgeReconnecting: !1,
    replBridgeConnectUrl: void 0,
    replBridgeSessionUrl: void 0,
    replBridgeEnvironmentId: void 0,
    replBridgeSessionId: void 0,
    replBridgeError: void 0,
    replBridgeErrorKind: void 0,
    replBridgeInitialName: void 0,
    setupIssues: {
      settingsErrorCount: 0,
      lspFailedCount: 0,
      marketplaceIssueCount: 0,
      chromeExtensionIssueCount: 0,
      sandboxIssueCount: 0,
      sandboxDeniesOnAnotherHostCount: 0,
      statuslineIssueCount: 0,
      flaggedPluginCount: 0,
      modelDeprecationWarning: null,
      modelRestrictedWarning: null,
      unknownModelWindowWarning: null,
      securityWarnings: [],
      existingClaudeSubscription: null,
    },
    notifications: { current: null, queue: [], pinned: [] },
    autoUpdaterResult: null,
    activeOverlays: new Set(),
  };
}
/**
 * AppState 默认值：settings、tasks、transcripts、toolPermissionContext（队友需 plan 时初始为 plan）、mcp/plugins、todos、fileHistory、attribution、thinking/fastMode/effort 等 UI 与会话状态，以及大量 artifact 授权字段。
 */
//@ chunk-pyk0acyv.js:540-3233 fingerprint = getDefaultAppState (0.414)
function getDefaultAppState_2(t = {}) {
  let e = require("./chunk-7tqwkdxc.js"),
    initialMode = e.isTeammate() && e.isPlanModeRequired() ? "plan" : "default";
  return {
    sessionNoticesPoll: { pendingDeliveryUuids: [] },
    settings: getInitialSettings_2(),
    tasks: {},
    transcripts: {},
    runningSubagents: 0,
    agentNameRegistry: new Map(),
    sendMessagePins: {},
    agentTypesInvokedThisSession: new Set(),
    verbose: !1,
    showMessageTimestamps: !1,
    mainLoopModel: null,
    mainLoopModelForSession: null,
    isBriefOnly: !1,
    slackTagConnected: !1,
    briefTranscript: !1,
    replBridgeEnabled: !1,
    replBridgeExplicit: !1,
    replBridgeOutboundOnly: !1,
    replBridgeSessionActive: !1,
    replBridgeSkipNextArchive: !1,
    replBridgeSessionGroupingId: void 0,
    toolPermissionContext: { ...getEmptyToolPermissionContext(), mode: initialMode },
    attentionBudget: UNLIMITED,
    proactivityLevel: DEFAULT,
    agent: void 0,
    agentDefinitions: { activeAgents: [], allAgents: [] },
    fileHistory: { snapshots: [], trackedFiles: new Set(), snapshotSequence: 0 },
    attribution: createEmptyAttributionState(),
    mcp: {
      clientsInitialized: !1,
      clients: [],
      tools: [],
      commands: [],
      resources: {},
      resourceTemplates: {},
      suppressedClaudeAiConnectors: [],
      pluginReconnectKey: 0,
    },
    plugins: {
      enabled: [],
      disabled: [],
      commands: [],
      errors: [],
      warnings: [],
      installationStatus: { marketplaces: [], plugins: [] },
      needsRefresh: !1,
    },
    todos: {},
    queuedRemoteNotifications: {
      pending: [],
      drainedIds: [],
      nudge: null,
      readsThisTurn: [],
      readsDroppedThisTurn: 0,
      unfinishedReads: [],
      nudgeHeldUntil: { request: 0, cut: 0 },
    },
    prResolvedThisSession: !1,
    frameUrls: {},
    frameOpenFailedPath: null,
    frameOpenFailedSeen: !1,
    artifactWatchApproved: !1,
    artifactDbWriteApproved: !1,
    artifactDbWriteHumanApproved: !1,
    artifactDbReadConsentSlugs: freeze,
    artifactDbReadHumanConsentSlugs: freeze_2,
    artifactReadConsentSlugs: freeze_3,
    artifactConsentEpoch: 0,
    artifactAssetUploadConsentSlugs: freeze_7,
    artifactAssetUploadHumanConsentSlugs: freeze_8,
    artifactAssetReadConsentSlugs: freeze_4,
    artifactAssetReadHumanConsentSlugs: freeze_5,
    artifactOutsideOrgConsentSlugs: freeze_6,
    artifactHandlersReadConsentSlugs: freeze_9,
    artifactHandlersReadHumanConsentSlugs: freeze_10,
    artifactHandlersWriteConsentSlugs: freeze_11,
    artifactHandlersWriteHumanConsentSlugs: freeze_12,
    artifactRoomJoinConsentSlugs: freeze_13,
    artifactPlanPublishConsentPaths: FROZEN_EMPTY_OBJECTS,
    ultrareviewOverageConfirmed: !1,
    thinkingEnabled: isBetaHeaderAllowed(),
    promptSuggestionEnabled: t.promptSuggestionEnabled ?? shouldEnablePromptSuggestion(),
    awaySummaryEnabled: isAwaySummaryEnabled(),
    displayedMessageContent: {},
    inbox: { messages: [] },
    pendingMemoryUpdates: [],
    pendingWorkerRequest: null,
    pendingSandboxRequest: null,
    promptSuggestion: { status: "empty" },
    taskSummary: null,
    initialMessage: null,
    sessionEffort: { kind: "inherit" },
    settingsEffortTable: { default: void 0, legacyUserEffort: void 0, byModel: {} },
    ultracode: void 0,
    cacheMissAckedAtOutputTokens: -1,
    fastMode: !1,
    storedImagePaths: new Map(),
    imageDescriptions: new Map(),
    classifierApprovals: { approvals: new Map(), checking: new Set() },
    teammateColors: { assignments: new Map(), index: 0 },
    webBrowser: require("./chunk-dsvzp7sb.js").getDefaultWebBrowserState(),
  };
}

export { EMPTY_PROJECTS_SELF_IDENTITY, getDefaultAppState_2, getDefaultAppState };
