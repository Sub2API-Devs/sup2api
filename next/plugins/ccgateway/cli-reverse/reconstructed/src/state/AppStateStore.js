/**
 * state/AppStateStore.ts
 *
 * AppState 的默认值 getDefaultAppState（设置、任务、权限上下文、MCP/插件、todos、文件历史、UI 开关等字段）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/AppStateStore.ts
 * pieces: chunk-aq66mwq1.js (2), chunk-n75cktq8.js (1)
 * attribution: placement 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getInitialSettings } from "../utils/settings/settings.js";
import { getEmptyToolPermissionContext } from "../Tool.js";
import { UNLIMITED } from "./statusLineWidth.js";
import { DEFAULT } from "../utils/proactivityMode.js";
import { createEmptyAttributionState } from "../utils/commitAttribution.js";
import {
  EMPTY_ARTIFACT_DB_READ_CONSENT,
  EMPTY_ARTIFACT_DB_READ_HUMAN_CONSENT,
  EMPTY_ARTIFACT_READ_CONSENT,
  EMPTY_ARTIFACT_ASSET_UPLOAD_CONSENT,
  EMPTY_ARTIFACT_ASSET_UPLOAD_HUMAN_CONSENT,
  EMPTY_ARTIFACT_ASSET_READ_CONSENT,
  EMPTY_ARTIFACT_ASSET_READ_HUMAN_CONSENT,
  EMPTY_ARTIFACT_OUTSIDE_ORG_CONSENT,
  EMPTY_ARTIFACT_HANDLERS_READ_CONSENT,
  EMPTY_ARTIFACT_HANDLERS_READ_HUMAN_CONSENT,
  EMPTY_ARTIFACT_HANDLERS_WRITE_CONSENT,
  EMPTY_ARTIFACT_HANDLERS_WRITE_HUMAN_CONSENT,
  EMPTY_ARTIFACT_ROOM_JOIN_CONSENT,
  FROZEN_EMPTY_OBJECTS,
} from "./frozenSentinels.js";
import { isBetaHeaderAllowed } from "../utils/betas.js";
import { shouldEnablePromptSuggestion } from "../services/PromptSuggestion/promptSuggestion.js";
import { isAwaySummaryEnabled } from "../services/awaySummary.js";

//@ chunk-n75cktq8.js:540-3312 fingerprint (2.1.88 match: getDefaultAppState, 0.429)
/**
 * AppState 默认值：settings、tasks、transcripts、toolPermissionContext（队友需 plan 时初始为 plan）、mcp/plugins、todos、fileHistory、attribution、thinking/fastMode/effort 等 UI 与会话状态，以及大量 artifact 授权字段。
 */
function getDefaultAppState_2(overrides = {}) {
  let teammateUtils = require("../utils/teammate.js");
  let initialMode = teammateUtils.isTeammate() && teammateUtils.isPlanModeRequired() ? "plan" : "default";
  return {
    sessionNoticesPoll: {
      pendingDeliveryUuids: [],
    },
    settings: getInitialSettings(),
    tasks: {},
    transcripts: {},
    runningSubagents: 0,
    agentNameRegistry: new Map(),
    sendMessagePins: {},
    agentTypesInvokedThisSession: new Set(),
    verbose: false,
    showMessageTimestamps: false,
    mainLoopModel: null,
    mainLoopModelForSession: null,
    isBriefOnly: false,
    slackTagConnected: false,
    briefTranscript: false,
    replBridgeEnabled: false,
    replBridgeExplicit: false,
    replBridgeOutboundOnly: false,
    replBridgeSessionActive: false,
    replBridgeSkipNextArchive: false,
    replBridgeSessionGroupingId: undefined,
    replBridgeInitialName: undefined,
    replBridgeError: undefined,
    replBridgeErrorKind: undefined,
    toolPermissionContext: {
      ...getEmptyToolPermissionContext(),
      mode: initialMode,
    },
    attentionBudget: UNLIMITED,
    proactivityLevel: DEFAULT,
    agent: undefined,
    agentDefinitions: {
      activeAgents: [],
      allAgents: [],
    },
    fileHistory: {
      snapshots: [],
      trackedFiles: new Set(),
      snapshotSequence: 0,
    },
    attribution: createEmptyAttributionState(),
    mcp: {
      clientsInitialized: false,
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
      installationStatus: {
        marketplaces: [],
        plugins: [],
      },
      needsRefresh: false,
    },
    todos: {},
    queuedRemoteNotifications: {
      pending: [],
      drainedIds: [],
      nudge: null,
      readsThisTurn: [],
      readsDroppedThisTurn: 0,
      unfinishedReads: [],
      nudgeHeldUntil: {
        request: 0,
        cut: 0,
      },
    },
    prResolvedThisSession: false,
    frameUrls: {},
    frameOpenFailedPath: null,
    frameOpenFailedSeen: false,
    artifactWatchApproved: false,
    artifactDbWriteApproved: false,
    artifactDbWriteHumanApproved: false,
    artifactDbReadConsentSlugs: EMPTY_ARTIFACT_DB_READ_CONSENT,
    artifactDbReadHumanConsentSlugs: EMPTY_ARTIFACT_DB_READ_HUMAN_CONSENT,
    artifactReadConsentSlugs: EMPTY_ARTIFACT_READ_CONSENT,
    artifactConsentEpoch: 0,
    artifactAssetUploadConsentSlugs: EMPTY_ARTIFACT_ASSET_UPLOAD_CONSENT,
    artifactAssetUploadHumanConsentSlugs: EMPTY_ARTIFACT_ASSET_UPLOAD_HUMAN_CONSENT,
    artifactAssetReadConsentSlugs: EMPTY_ARTIFACT_ASSET_READ_CONSENT,
    artifactAssetReadHumanConsentSlugs: EMPTY_ARTIFACT_ASSET_READ_HUMAN_CONSENT,
    artifactOutsideOrgConsentSlugs: EMPTY_ARTIFACT_OUTSIDE_ORG_CONSENT,
    artifactHandlersReadConsentSlugs: EMPTY_ARTIFACT_HANDLERS_READ_CONSENT,
    artifactHandlersReadHumanConsentSlugs: EMPTY_ARTIFACT_HANDLERS_READ_HUMAN_CONSENT,
    artifactHandlersWriteConsentSlugs: EMPTY_ARTIFACT_HANDLERS_WRITE_CONSENT,
    artifactHandlersWriteHumanConsentSlugs: EMPTY_ARTIFACT_HANDLERS_WRITE_HUMAN_CONSENT,
    artifactRoomJoinConsentSlugs: EMPTY_ARTIFACT_ROOM_JOIN_CONSENT,
    artifactPlanPublishConsentPaths: FROZEN_EMPTY_OBJECTS,
    ultrareviewOverageConfirmed: false,
    thinkingEnabled: isBetaHeaderAllowed(),
    promptSuggestionEnabled: overrides.promptSuggestionEnabled ?? shouldEnablePromptSuggestion(),
    awaySummaryEnabled: isAwaySummaryEnabled(),
    displayedMessageContent: {},
    inbox: {
      messages: [],
    },
    pendingMemoryUpdates: [],
    pendingWorkerRequest: null,
    pendingSandboxRequest: null,
    promptSuggestion: {
      status: "empty",
    },
    taskSummary: null,
    initialMessage: null,
    sessionEffort: {
      kind: "inherit",
    },
    settingsEffortTable: {
      default: undefined,
      legacyUserEffort: undefined,
      byModel: {},
    },
    ultracode: undefined,
    cacheMissAckedAtOutputTokens: -1,
    fastMode: false,
    storedImagePaths: new Map(),
    imageDescriptions: new Map(),
    classifierApprovals: {
      approvals: new Map(),
      checking: new Set(),
    },
    teammateColors: {
      assignments: new Map(),
      index: 0,
    },
    webBrowser: require("./webBrowserSlice.js").getDefaultWebBrowserState(),
  };
}
//@ chunk-aq66mwq1.js:228-290 placement
var EMPTY_PROJECTS_SELF_IDENTITY = {
  accountKey: null,
  ownMessageIds: [],
  wireAccountId: null,
};
//@ chunk-aq66mwq1.js:290-1496 placement
/**
 * AppState 默认值。
 */
function getDefaultAppState() {
  return {
    ...getDefaultAppState_2(),
    taskDecorations: {},
    prStatus: null,
    prNeedsAuth: false,
    expandedView: "none",
    replTab: "convo",
    panelFileView: null,
    diffPanelVisible: false,
    paneHoldsToasts: false,
    coordinatorTaskIndex: -1,
    workflowFooterIndex: 0,
    viewSelectionMode: "none",
    queueEditIndex: null,
    footerSelection: null,
    footerLinks: [],
    remoteSessionUrl: undefined,
    projectsSelfIdentity: EMPTY_PROJECTS_SELF_IDENTITY,
    remoteConnectionStatus: "connecting",
    remoteModeSessions: {},
    remoteBootstrap: null,
    remoteBackgroundTasks: [],
    remoteWorkflowRuns: [],
    remoteForegroundTask: "none",
    remoteWorkerReportedGone: false,
    workerInventory: null,
    hasRemoteReplyChannel: false,
    replBridgeAutoOnByDefault: false,
    replBridgeConnected: false,
    replBridgeReconnecting: false,
    replBridgeConnectUrl: undefined,
    replBridgeSessionUrl: undefined,
    replBridgeEnvironmentId: undefined,
    replBridgeSessionId: undefined,
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
    notifications: {
      current: null,
      queue: [],
      pinned: [],
    },
    autoUpdaterResult: null,
    activeOverlays: new Set(),
  };
}
export { getDefaultAppState_2, EMPTY_PROJECTS_SELF_IDENTITY, getDefaultAppState };
