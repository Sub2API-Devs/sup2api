/**
 * screens/ResumeConversation.tsx
 *
 * /resume 屏幕：加载会话列表、按 PR/分支筛选、选中后恢复会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/screens/ResumeConversation.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-jde8wnzx.js (13)
 * attribution: callgraph-fingerprint 1, sole-consumer 8, file-local 3, layout 1, fingerprint 1
 */
import { dirname } from "path";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  useAppStoreDirect,
  useAppState,
  useSetAppState,
  useSessionHooksRegistry,
} from "../state/AppState.js";
import { useNotifications } from "../context/notifications.js";
import { visibleFrameUrls, openArtifactRow } from "../components/artifacts/artifactFrames.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import {
  init_react_production,
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useSession } from "../context/session.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { isCloudSessionsDeniedByOrg } from "../services/cloudSessions/cloudSessionsPolicy.js";
import { noopTrialEffect } from "../components/FullscreenUpsellTrial.js";
import {
  isCustomTitleEnabled,
  loadSameRepoMessageLogsProgressive,
  enrichLogs,
  loadAllProjectsMessageLogsProgressive,
  getSessionIdFromLog,
  pinSessionId,
  resetSessionFilePointer,
  adoptForkSessionMetadata,
  recordContentReplacement,
  saveMode,
  restoreSessionMetadata,
  buildForkAdoptionMeta,
  applyEndedByModelOnResume,
  adoptResumedSessionFileAsync,
  adoptResumedSessionFile,
} from "../utils/sessionStorage.js";
import { env } from "../utils/env.js";
import { useTerminalTitle, useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logError, getLogDisplayTitle } from "../utils/log.js";
import { sortLogs } from "../types/logs.js";
import { checkCrossProjectResume, getShellChainOperator } from "../utils/crossProjectResume.js";
import { setClipboard } from "../ink/termio/osc.js";
import {
  findBackgroundSessionHolder,
  quoteTitleForBackgroundNotice,
  formatHandoffOutcome,
} from "../utils/sessionAttach.js";
import { liveBackgroundJobId, attachToBackgroundSession } from "../commands/resume/openLiveBackground.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import {
  errorMessage,
  withTelemetryMessage,
  toError,
  sanitizedErrorNameForTelemetry,
} from "../utils/errors.js";
import { loadConversationForResume } from "../utils/conversationRecovery.js";
import { precomputeResumeHooks } from "../services/compact/precomputedCompact.js";
import {
  noopModelPinSubscriber,
  noModelPin,
  recordModelPinSwitch,
  noopModelPinReset,
} from "../utils/sessionModelPin.js";
import { logEvent } from "../services/analytics/index.js";
import { createSystemMessage } from "../utils/messages.js";
import { assertResumeNotRefused, ResumeRefusedError } from "../utils/transcript/deserialize.js";
import {
  reloadAgentDefinitionsForModeSwitch,
  recordResumeSource,
  loadAgentDefinitionsForSessionCwd,
  restoreAgentFromSession,
  neutralizeForkFallbackBanners,
  rearmRefusalFallbackHeaderFromTranscript,
  restoreModelFromSession,
  installRestoredModel,
  appendSlackTagResumeRecords,
  preparePlanModeRestoreOnInteractiveResume,
  computeStandaloneAgentContext,
  pushRestoredMemoryPauseNotice,
  markSessionRestored,
  restoreWorktreeForResume,
  worktreeResumeNotice,
} from "../utils/sessionRestore.js";
import { resetObserverPairings } from "../services/agentObserver/agentObserver.js";
import { resolveResumeSessionAdoption } from "../utils/background/adopt.js";
import { getSessionId, switchSession } from "../bootstrap/state.js";
import { renameRecordingForSession } from "../utils/asciicast.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { setCostStateForRestore } from "../cost-tracker.js";
import { awaitPolicyColdStartWaiter } from "../services/policyLimits/coldStartWaiter.js";
import { recordSwitchIfChanged } from "../utils/model/modelSwitchHooks.js";
import { reclaimSessionNameOnResume } from "../utils/sessionNameUniqueness.js";
import { getEndedByModel } from "../tasks/endedByModel.js";
import { restoreGoalFromTranscript } from "../commands/goal/restoreGoal.js";
import { lastResumeRecordRegistry } from "../utils/lastResumeRecord.js";
import { switchToConversationTab } from "../hooks/useWorkspaceDiff.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { REPL } from "./REPL.js";
import { applyAgentModelOverride } from "../utils/model/modelOverrideNotices.js";
import { WorkerBadge } from "../components/permissions/WorkerBadge.js";
import { LogSelector } from "../components/LogSelector.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useSelection } from "../ink/components/Input.js";
import { useCopyOnSelect, useSelectionBgColor } from "../hooks/useCopyOnSelect.js";
import {
  useSelectionClearKeybinding,
  shouldClearSelectionOnKey,
} from "../components/ScrollKeybindingHandler.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { isMouseTrackingEnabled } from "../utils/fullscreen.js";
import { AlternateScreen } from "../ink/components/AlternateScreen.js";
import { Text, Box } from "../ink/components/Text.js";
import { isSafeIdSegment_2 } from "../utils/agentId.js";
import { shellQuoteArgs } from "../utils/bash/bashPipeCommand.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:651055-651381 callgraph-fingerprint = NoConversationsMessage (0.241)
function NoConversationsMessage(props) {
  let $ = useMemoCache(5);
  let { cloudRowCheck } = props;
  let store = useAppStoreDirect();
  let notifications = useNotifications();
  let check;
  if ($[0] !== cloudRowCheck || $[1] !== notifications || $[2] !== store) {
    check = () => {
      let urls = visibleFrameUrls(store.getState().frameUrls);
      if (!urls) {
        return false;
      }
      openArtifactRow(urls, store, notifications, cloudRowCheck);
    };
    $[0] = cloudRowCheck;
    $[1] = notifications;
    $[2] = store;
    $[3] = check;
  } else check = $[3];
  let keybindingOptions;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    keybindingOptions = {
      context: "Global",
    };
    $[4] = keybindingOptions;
  } else keybindingOptions = $[4];
  useKeybinding("app:openArtifact", check, keybindingOptions);
  return null;
}
//@ chunk-jde8wnzx.js:27371-27375 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jde8wnzx.js:27371", () => {
  init_react_production();
});
//@ chunk-jde8wnzx.js:27407-27427 sole-consumer
function shutdownOnTimeout() {
  gracefulShutdown(1);
}
//@ chunk-jde8wnzx.js:27427-27479 sole-consumer
function shutdownWithoutResumeHint() {
  gracefulShutdown(1, "other", {
    suppressResumeHint: true,
  });
}
//@ chunk-jde8wnzx.js:27479-27509 file-local
function exitNow() {
  process.exit(0);
}
//@ chunk-jde8wnzx.js:27509-27539 file-local
function exitNowB() {
  process.exit(0);
}
//@ chunk-jde8wnzx.js:27539-27581 layout
function selectOriginalCwd(session) {
  return getSessionProject(session).originalCwd;
}
//@ chunk-jde8wnzx.js:27581-27790 file-local
function parsePrIdentifier(value) {
  let directNumber = parseInt(value, 10);
  if (!isNaN(directNumber) && directNumber > 0) return directNumber;
  let urlMatch = value.match(
    /(?:https?:\/\/)?[^/\s]+\/[^\s]+?\/(?:pull|pull-requests|-\/merge_requests)\/(\d+)/,
  );
  if (urlMatch?.[1]) return parseInt(urlMatch[1], 10);
  return null;
}
//@ chunk-jde8wnzx.js:27790-35725 fingerprint = ResumeConversation (0.539)
function ResumeConversation({
  commands,
  worktreePaths,
  initialTools,
  mcpClients,
  dynamicMcpConfig,
  debug,
  mainThreadAgentDefinition,
  autoConnectIdeFlag,
  strictMcpConfig = false,
  systemPrompt,
  appendSystemPrompt,
  systemPromptSnapshot,
  initialSearchQuery,
  disableSlashCommands = false,
  forkSession,
  permissionModeSuppliedOnInvocation,
  startsInCloudByDefault,
  filterByPr,
  thinkingConfig,
  thinkingConfigExplicit,
  thinkingDisplayFlag,
  fallbackModel,
  onTurnComplete,
  onCaptureSnapshot,
}) {
  let { storageV5, credentials } = useTheme_2();
  let session = useSession();
  let id = useSession((session) => session.id);
  let { rows } = useTerminalSize();
  let [startsInCloud] = useState(() => startsInCloudByDefault && !isCloudSessionsDeniedByOrg());
  let footerNote = useMemo(() => {
    return;
  }, [startsInCloud]);
  let agentDefinitions = useAppState((state) => state.agentDefinitions);
  let standaloneAgentContext = useAppState((state) => state.standaloneAgentContext);
  let mainLoopModel = useAppState((state) => state.mainLoopModel);
  let hasInitialMessage = useAppState((state) => state.initialMessage !== null);
  let setAppState = useSetAppState();
  let sessionHooksRegistry = useSessionHooksRegistry();
  noopTrialEffect();
  let [logs, setLogs] = useState([]);
  let [loading, setLoading] = useState(true);
  let [resuming, setResuming] = useState(false);
  let resumeInFlight = useRef(false);
  let [crossProjectNotice, setCrossProjectNotice] = useState(null);
  let [showAllProjects, setShowAllProjects] = useState(false);
  let [titleOverride, setTitleOverride] = useState(null);
  let [backgroundNotice, setBackgroundNotice] = useState(null);
  let [reloadNotice, setReloadNotice] = useState(null);
  let [errorNotice, setErrorNotice] = useState(null);
  let resumeResultRef = useRef(null);
  let [reloadGeneration, bumpReloadGeneration] = useState(0);
  let nextLogIndex = useRef(0);
  let loadGeneration = useRef(0);
  let filteredLogs = useMemo(() => {
    let result = logs.filter((log) => !log.isSidechain);
    if (filterByPr !== undefined) {
      if (filterByPr === true) result = result.filter((l_0) => l_0.prNumber !== undefined);
      else if (typeof filterByPr === "number") result = result.filter((l_1) => l_1.prNumber === filterByPr);
      else if (typeof filterByPr === "string") {
        let prNumber = parsePrIdentifier(filterByPr);
        if (prNumber !== null) result = result.filter((l_2) => l_2.prNumber === prNumber);
      }
    }
    return result;
  }, [logs, filterByPr]);
  let isResumeWithRenameEnabled = isCustomTitleEnabled();
  let disableTerminalTitle = useMemo(() => env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE, []);
  useTerminalTitle(titleOverride || disableTerminalTitle ? null : "claude \xB7 resume");
  useEffect(() => {
    loadSameRepoMessageLogsProgressive(worktreePaths, undefined, undefined, storageV5)
      .then((result) => {
        resumeResultRef.current = result;
        nextLogIndex.current = result.logs.length;
        setLogs(result.logs);
        setLoading(false);
        logFeatureOk("screen_resume_conversation");
      })
      .catch((error) => {
        logFeatureBad("screen_resume_conversation", "resume_conversation_load_failed");
        logError(error);
        setLoading(false);
      });
  }, [worktreePaths, storageV5]);
  let enrichInFlight = useRef(false);
  let loadMore = useCallback(
    (count) => {
      if (enrichInFlight.current) return;
      let ref = resumeResultRef.current;
      if (!ref || ref.nextIndex >= ref.allStatLogs.length) return;
      enrichInFlight.current = true;
      let morePending = false;
      enrichLogs(ref.allStatLogs, ref.nextIndex, count, storageV5)
        .then((result) => {
          if (resumeResultRef.current !== ref) return;
          ref.nextIndex = result.nextIndex;
          if (result.logs.length > 0) {
            let offset = nextLogIndex.current;
            sortLogs(result.logs).forEach((log, i) => {
              log.value = offset + i;
            });
            setLogs((prev) => prev.concat(result.logs));
            nextLogIndex.current += result.logs.length;
          } else if (ref.nextIndex < ref.allStatLogs.length) morePending = true;
        })
        .finally(() => {
          enrichInFlight.current = false;
          if (morePending) loadMore(count);
        });
    },
    [storageV5],
  );
  let loadLogs = useCallback(
    (allProjects) => {
      setLoading(true);
      let loadToken = ++loadGeneration.current;
      let previousResult = resumeResultRef.current;
      resumeResultRef.current = null;
      bumpReloadGeneration((generation) => generation + 1);
      (allProjects
        ? loadAllProjectsMessageLogsProgressive(undefined, undefined, storageV5)
        : loadSameRepoMessageLogsProgressive(worktreePaths, undefined, undefined, storageV5)
      )
        .then((result) => {
          if (loadGeneration.current !== loadToken) return;
          resumeResultRef.current = result;
          nextLogIndex.current = result.logs.length;
          setLogs(result.logs);
        })
        .catch((error) => {
          if (loadGeneration.current !== loadToken) return;
          if (previousResult !== null) resumeResultRef.current = previousResult;
          setLogs((error_0) => error_0.slice());
          logError(error);
        })
        .finally(() => {
          if (loadGeneration.current !== loadToken) return;
          setLoading(false);
        });
    },
    [worktreePaths, storageV5],
  );
  let handleToggleAllProjects = useCallback(() => {
    let newValue = !showAllProjects;
    setShowAllProjects(newValue);
    loadLogs(newValue);
  }, [showAllProjects, loadLogs]);
  function onCancel() {
    process.exit(1);
  }
  async function onSelect(log_0) {
    if (resumeInFlight.current) return;
    resumeInFlight.current = true;
    setResuming(true);
    let resumeStart = performance.now();
    try {
      let crossProjectCheck = await checkCrossProjectResume(log_0, showAllProjects, worktreePaths);
      if (crossProjectCheck) {
        let raw = await setClipboard(crossProjectCheck);
        if (raw) process.stdout.write(raw);
        setReloadNotice(crossProjectCheck);
        return;
      }
      if (!forkSession) {
        let sessionIdFromLog = getSessionIdFromLog(log_0);
        let holder = sessionIdFromLog ? await findBackgroundSessionHolder(sessionIdFromLog, storageV5) : null;
        if (sessionIdFromLog && holder) {
          let jobId = hasInitialMessage
            ? undefined
            : liveBackgroundJobId(holder, {
                replacesProcess: true,
              });
          if (jobId !== undefined)
            try {
              await attachToBackgroundSession(jobId, "picker", storageV5);
              return;
            } catch (error) {
              logFeatureSad("resume_live_background_open", "open_failed", {
                entrypoint: lit("picker"),
              });
              setBackgroundNotice({
                sessionId: sessionIdFromLog,
                log: log_0,
                jobId,
                handoff: {
                  reason: "open_failed",
                  detail: errorMessage(error),
                  promptSent: false,
                },
              });
              return;
            }
          logFeatureSad(
            "resume_live_background_open",
            hasInitialMessage ? "launch_prompt_pending" : "not_openable",
            {
              entrypoint: lit("picker"),
            },
          );
          setBackgroundNotice({
            sessionId: sessionIdFromLog,
            log: log_0,
            jobId: holder.jobId,
          });
          return;
        }
      }
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "resume picker: pre-load failed"));
      setCrossProjectNotice({
        sessionId: getSessionIdFromLog(log_0) ?? undefined,
      });
      return;
    }
    let notFound = false;
    let failureReason = "load_error";
    let sessionStartHooks;
    try {
      let meta = await loadConversationForResume(log_0, undefined, {
        forkSession: forkSession ?? false,
        storageV5,
        credentials,
        ...precomputeResumeHooks(session.precompute, storageV5, {
          forkSession: !!forkSession,
        }),
        beforeUse: noopModelPinSubscriber("store"),
      });
      if (!meta) {
        logEvent("tengu_session_resumed", {
          entrypoint: lit("picker"),
          success: false,
          failure_reason: lit("not_found_picker"),
        });
        notFound = true;
        throw Error("Failed to load conversation");
      }
      sessionStartHooks = meta.sessionStartHooks;
      failureReason = "processing_error";
      let resumePlan = noModelPin(
        {
          ...meta,
          source: "store",
        },
        (warning) => meta.messages.push(createSystemMessage(warning, "warning")),
      );
      assertResumeNotRefused(resumePlan);
      let modeWarning = require("../coordinator/coordinatorMode.js").matchSessionMode(meta.mode);
      if (modeWarning) {
        let agentDefinitions = await reloadAgentDefinitionsForModeSwitch(
          getSessionProject(session).originalCwd,
          [],
          storageV5,
        );
        setAppState((prev) => ({
          ...prev,
          agentDefinitions,
        }));
        meta.messages.push(createSystemMessage(modeWarning, "warning"));
      }
      resetObserverPairings(session);
      let { adoptedSessionId, effectiveFork } = resolveResumeSessionAdoption(meta.sessionId, !!forkSession);
      let destSid = adoptedSessionId ? pinSessionId(adoptedSessionId) : pinSessionId(getSessionId());
      if (adoptedSessionId) {
        switchSession(adoptedSessionId, "resume", log_0.fullPath ? dirname(log_0.fullPath) : null);
        await renameRecordingForSession(session, storageV5);
        await resetSessionFilePointer();
        let swarmsEnabled = isAgentSwarmsEnabled()
          ? await (
              await import("../tools/TeamCreateTool/initializeSessionTeam.lazy.js")
            ).rekeySessionTeamAtStartup(storageV5)
          : undefined;
        if (swarmsEnabled)
          setAppState((state) => ({
            ...state,
            teamContext: swarmsEnabled.teamContext,
            teammateColors: swarmsEnabled.teammateColors,
          }));
      } else if (effectiveFork) {
        await adoptForkSessionMetadata(meta, {
          stripWorktreeSession: true,
          stripRelocatedCwd: true,
          destSid,
          storageV5,
        });
        if (meta.contentReplacements?.length)
          await recordContentReplacement(meta.contentReplacements, undefined, storageV5);
      }
      setCostStateForRestore(meta);
      recordResumeSource({
        sourceSessionId: meta.sessionId,
        transcriptPath: log_0.fullPath,
      });
      let result_3 = await loadAgentDefinitionsForSessionCwd(log_0.projectPath, storageV5);
      let { agentDefinition: resolvedAgentDef } = restoreAgentFromSession(
        meta.agentSetting,
        mainThreadAgentDefinition,
        agentDefinitions,
        {
          sessionAgentDefinitions: result_3,
          sessionCwd: log_0.projectPath,
          onResolveMiss: (warning) => meta.messages.push(createSystemMessage(warning, "warning")),
        },
      );
      if (resolvedAgentDef?.mcpServers?.length) await awaitPolicyColdStartWaiter();
      setAppState((prev) => ({
        ...prev,
        agent: resolvedAgentDef?.agentType,
      }));
      if (effectiveFork) neutralizeForkFallbackBanners(meta.messages);
      rearmRefusalFallbackHeaderFromTranscript(meta.messages, effectiveFork);
      let restoredModel = await restoreModelFromSession(
        meta.messages,
        mainLoopModel,
        (warning) => meta.messages.push(createSystemMessage(warning, "warning")),
        {
          storageV5,
          credentials,
        },
      );
      let nextModel = restoredModel
        ? installRestoredModel(meta.messages, restoredModel, effectiveFork, storageV5, credentials)
        : undefined;
      if (nextModel)
        setAppState((state) => {
          if (state.mainLoopModel === nextModel) return state;
          recordSwitchIfChanged(session, state, nextModel, "resume");
          return {
            ...state,
            mainLoopModel: nextModel,
          };
        });
      appendSlackTagResumeRecords(meta.messages, {
        fork: effectiveFork,
        startup: true,
      });
      let freshAgentDefs = await preparePlanModeRestoreOnInteractiveResume({
        storedPermissionMode: meta.permissionMode,
        messages: meta.messages,
        forkSession: effectiveFork,
        permissionModeSuppliedOnInvocation,
        lane: "interactive_picker",
      });
      setAppState((prev_0) => {
        let agentDefs = freshAgentDefs(prev_0.toolPermissionContext);
        return agentDefs
          ? {
              ...prev_0,
              toolPermissionContext: agentDefs,
            }
          : prev_0;
      });
      let { isCoordinatorMode } = require("../coordinator/coordinatorMode.js");
      saveMode(isCoordinatorMode() ? "coordinator" : "normal");
      recordModelPinSwitch(resumePlan);
      let standaloneAgentContext_2 = computeStandaloneAgentContext(meta.agentName, meta.agentColor);
      let standaloneContext = standaloneAgentContext
        ? {
            ...standaloneAgentContext_2,
            ...standaloneAgentContext,
          }
        : standaloneAgentContext_2;
      if (standaloneContext)
        setAppState((prev) => ({
          ...prev,
          standaloneAgentContext: standaloneContext,
        }));
      reclaimSessionNameOnResume(standaloneContext?.name, storageV5, {
        autoOnly: !meta.customTitle && !standaloneAgentContext?.name,
      });
      restoreSessionMetadata(
        effectiveFork
          ? buildForkAdoptionMeta(meta, {
              stripWorktreeSession: true,
              stripRelocatedCwd: true,
            })
          : meta,
        {
          taintSid: destSid,
          storageV5,
        },
      );
      noopModelPinReset(resumePlan.declined === true);
      pushRestoredMemoryPauseNotice(meta.messages);
      applyEndedByModelOnResume(getEndedByModel(meta), setAppState);
      restoreGoalFromTranscript(meta.messages, setAppState, sessionHooksRegistry);
      markSessionRestored(session.host);
      if (!effectiveFork && meta.bridgeSessionId)
        setAppState((prev_2) =>
          prev_2.replBridgeEnabled && !prev_2.replBridgeOutboundOnly
            ? prev_2
            : {
                ...prev_2,
                replBridgeEnabled: true,
                replBridgeOutboundOnly: false,
              },
        );
      if (!effectiveFork) {
        let worktreeResult = restoreWorktreeForResume(
          lastResumeRecordRegistry.of(session.host),
          meta.worktreeSession,
          undefined,
          {
            storageV5,
          },
        );
        if (worktreeResult)
          meta.messages.push(createSystemMessage(worktreeResumeNotice(worktreeResult), "warning"));
        switchToConversationTab(session.host, setAppState);
        if (adoptedSessionId)
          if (isStorageV5Enabled() && storageV5 !== undefined) await adoptResumedSessionFileAsync(storageV5);
          else adoptResumedSessionFile();
      }
      logEvent("tengu_session_resumed", {
        entrypoint: lit("picker"),
        success: true,
        resume_duration_ms: Math.round(performance.now() - resumeStart),
      });
      setLogs([]);
      setTitleOverride({
        messages: meta.messages,
        fileHistorySnapshots: meta.fileHistorySnapshots,
        contentReplacements: meta.contentReplacements,
        agentName: meta.agentName,
        agentColor: meta.agentColor === "default" ? undefined : meta.agentColor,
        mainThreadAgentDefinition: resolvedAgentDef,
        pendingHookMessages: meta.sessionStartHooks,
      });
    } catch (error) {
      if (!notFound) {
        let failureReasonCopy = failureReason;
        logEvent("tengu_session_resumed", {
          entrypoint: lit("picker"),
          success: false,
          failure_reason: fromEnum(failureReasonCopy),
          error_name: sanitizedErrorNameForTelemetry(toError(error)),
        });
      }
      if (error instanceof ResumeRefusedError) {
        sessionStartHooks?.abort();
        setErrorNotice(error.message);
        return;
      }
      logError(withTelemetryMessage(toError(error), "resume picker: onSelect failed"));
      sessionStartHooks?.abort();
      setCrossProjectNotice({
        sessionId: getSessionIdFromLog(log_0) ?? undefined,
      });
    }
  }
  if (backgroundNotice)
    return jsxProd_default(BackgroundSessionResumeMessage, {
      sessionId: backgroundNotice.sessionId,
      title: getLogDisplayTitle(backgroundNotice.log),
      jobId: backgroundNotice.jobId,
      projectPath: backgroundNotice.log.projectPath,
      handoff: backgroundNotice.handoff,
    });
  if (reloadNotice)
    return jsxProd_default(DifferentDirectoryResumeMessage, {
      command: reloadNotice,
    });
  if (errorNotice !== null)
    return jsxProd_default(ResumeExitMessage, {
      message: errorNotice,
    });
  if (titleOverride)
    return jsxProd_default(REPL, {
      debug,
      commands,
      initialTools,
      initialMessages: titleOverride.messages,
      pendingHookMessages: titleOverride.pendingHookMessages,
      initialFileHistorySnapshots: titleOverride.fileHistorySnapshots,
      initialContentReplacements: titleOverride.contentReplacements,
      initialAgentName: titleOverride.agentName,
      initialAgentColor: titleOverride.agentColor,
      mcpClients,
      dynamicMcpConfig: applyAgentModelOverride(
        dynamicMcpConfig ?? {},
        titleOverride.mainThreadAgentDefinition,
        {
          strictMcpConfig,
        },
      ),
      strictMcpConfig,
      systemPrompt,
      appendSystemPrompt,
      systemPromptSnapshot,
      mainThreadAgentDefinition: titleOverride.mainThreadAgentDefinition,
      autoConnectIdeFlag,
      disableSlashCommands,
      thinkingConfig,
      thinkingConfigExplicit,
      thinkingDisplayFlag,
      fallbackModel,
      onTurnComplete,
      onCaptureSnapshot,
    });
  if (loading && (logs.length === 0 || filteredLogs.length === 0))
    return jsxProd_default(FullscreenSelectionScreen, {
      children: jsxProd_default(WorkerBadge, {
        message: "Loading conversations\u2026",
      }),
    });
  if (crossProjectNotice)
    return jsxProd_default(ResumeFailedMessage, {
      sessionId: crossProjectNotice.sessionId,
    });
  if (resuming)
    return jsxProd_default(FullscreenSelectionScreen, {
      children: jsxProd_default(WorkerBadge, {
        message: "Resuming conversation\u2026",
      }),
    });
  return jsxProd_default(FullscreenSelectionScreen, {
    children: jsxProd_default(LogSelector, {
      logs: filteredLogs,
      currentSessionId: id,
      maxHeight: rows,
      onCancel,
      onSelect,
      onLogsChanged: isResumeWithRenameEnabled ? () => loadLogs(showAllProjects) : undefined,
      onLoadMore: loadMore,
      initialSearchQuery,
      isLoading: loading,
      reloadGeneration,
      showAllProjects,
      onToggleAllProjects: handleToggleAllProjects,
      footerNote,
    }),
  });
}
//@ chunk-jde8wnzx.js:35725-36280 sole-consumer
/**
 * 全屏模式下的选择处理外壳：Ctrl/Cmd+C 复制或清除选区，其他按键按需清除选区，并用备用屏幕承载子元素。
 */
function FullscreenSelectionScreen(props) {
  let $ = useMemoCache(8);
  let { children } = props;
  let isFullscreen = useIsFullscreen();
  let selection = useSelection();
  let copyOnSelect = useCopyOnSelect(selection, isFullscreen);
  useSelectionBgColor(selection);
  useSelectionClearKeybinding(selection, isFullscreen);
  let onKey;
  if ($[0] !== copyOnSelect || $[1] !== selection) {
    onKey = (input, key) => {
      if (!selection.hasSelection()) {
        return;
      }
      if (input === "c" && !key.meta && (key.ctrl || key.super)) {
        if (copyOnSelect.peek() !== null) selection.clearSelection();
        else selection.copySelection();
        return true;
      }
      if (shouldClearSelectionOnKey(key)) selection.clearSelection();
    };
    $[0] = copyOnSelect;
    $[1] = selection;
    $[2] = onKey;
  } else onKey = $[2];
  let keyOptions;
  if ($[3] !== isFullscreen) {
    keyOptions = {
      isActive: isFullscreen,
    };
    $[3] = isFullscreen;
    $[4] = keyOptions;
  } else keyOptions = $[4];
  usePreDispatchKeyHandler(onKey, keyOptions);
  if (!isFullscreen) {
    return children;
  }
  let mouseTracking;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    mouseTracking = isMouseTrackingEnabled();
    $[5] = mouseTracking;
  } else mouseTracking = $[5];
  let screen;
  if ($[6] !== children) {
    screen = jsxProd_default(AlternateScreen, {
      mouseTracking,
      children,
    });
    $[6] = children;
    $[7] = screen;
  } else screen = $[7];
  return screen;
}
//@ chunk-jde8wnzx.js:36280-36721 sole-consumer
/**
 * 恢复会话失败的提示：给出重试或新建会话的命令，稍后退出。
 */
function ResumeFailedMessage(props) {
  let $ = useMemoCache(4);
  let { sessionId } = props;
  let deps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    deps = [];
    $[0] = deps;
  } else deps = $[0];
  useTimeout(shutdownOnTimeout, 100, deps);
  let text;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    text = jsxProd_default(Text, {
      children: "Failed to resume the conversation.",
    });
    $[1] = text;
  } else text = $[1];
  const children = isSafeIdSegment_2(sessionId)
    ? `Run claude --resume ${sessionId} to retry, or claude to start a new session.`
    : "Run claude to start a new session.";
  let noticeBox;
  if ($[2] !== children) {
    noticeBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        text,
        jsxProd_default(Text, {
          dimColor: true,
          children,
        }),
      ],
    });
    $[2] = children;
    $[3] = noticeBox;
  } else noticeBox = $[3];
  return noticeBox;
}
//@ chunk-jde8wnzx.js:36721-36885 sole-consumer
function ResumeExitMessage(props) {
  let $ = useMemoCache(3);
  let { message } = props;
  let deps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    deps = [];
    $[0] = deps;
  } else deps = $[0];
  useTimeout(shutdownWithoutResumeHint, 100, deps);
  let text;
  if ($[1] !== message) {
    text = jsxProd_default(Text, {
      children: message,
    });
    $[1] = message;
    $[2] = text;
  } else text = $[2];
  return text;
}
//@ chunk-jde8wnzx.js:36885-37475 sole-consumer
/**
 * 会话来自其他目录时的提示：显示恢复命令并说明已复制到剪贴板，稍后退出。
 */
function DifferentDirectoryResumeMessage(props) {
  let $ = useMemoCache(8);
  let { command } = props;
  let deps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    deps = [];
    $[0] = deps;
  } else deps = $[0];
  useTimeout(exitNow, 100, deps);
  let heading;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    heading = jsxProd_default(Text, {
      children: "This conversation is from a different directory.",
    });
    $[1] = heading;
  } else heading = $[1];
  let hint;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    hint = jsxProd_default(Text, {
      children: "To resume, run:",
    });
    $[2] = hint;
  } else hint = $[2];
  let commandBox;
  if ($[3] !== command) {
    commandBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        hint,
        jsxProd_default_2(Text, {
          children: [" ", command],
        }),
      ],
    });
    $[3] = command;
    $[4] = commandBox;
  } else commandBox = $[4];
  let copiedNote;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    copiedNote = jsxProd_default(Text, {
      dimColor: true,
      children: "(Command copied to clipboard)",
    });
    $[5] = copiedNote;
  } else copiedNote = $[5];
  let content;
  if ($[6] !== commandBox) {
    content = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [heading, commandBox, copiedNote],
    });
    $[6] = commandBox;
    $[7] = content;
  } else content = $[7];
  return content;
}
//@ chunk-jde8wnzx.js:37475-39038 sole-consumer
/**
 * 会话正在后台运行时的提示：给出 attach/stop 命令或用 claude agents 查找，并给出 --fork-session 分叉命令。
 */
function BackgroundSessionResumeMessage(props) {
  let $ = useMemoCache(29);
  let { sessionId, title, jobId, projectPath, handoff } = props;
  let deps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    deps = [];
    $[0] = deps;
  } else deps = $[0];
  useTimeout(exitNowB, 100, deps);
  let cwd = useSession(selectOriginalCwd);
  let cdPrefixMemo;
  if ($[1] !== cwd || $[2] !== projectPath) {
    cdPrefixMemo =
      projectPath && projectPath !== cwd
        ? `cd ${shellQuoteArgs([projectPath])} ${getShellChainOperator()} `
        : "";
    $[1] = cwd;
    $[2] = projectPath;
    $[3] = cdPrefixMemo;
  } else cdPrefixMemo = $[3];
  let cdPrefix = cdPrefixMemo;
  let sessionArg = isSafeIdSegment_2(sessionId) ? ` ${sessionId}` : "";
  let titleText;
  if ($[4] !== title) {
    titleText = quoteTitleForBackgroundNotice(title);
    $[4] = title;
    $[5] = titleText;
  } else titleText = $[5];
  const jobSuffix = jobId ? ` (${jobId})` : "";
  let handoffNote;
  if ($[6] !== handoff) {
    handoffNote = formatHandoffOutcome(handoff);
    $[6] = handoff;
    $[7] = handoffNote;
  } else handoffNote = $[7];
  let runningLine;
  if ($[8] !== titleText || $[9] !== jobSuffix || $[10] !== handoffNote) {
    runningLine = jsxProd_default_2(Text, {
      children: [titleText, " is running in the background", jobSuffix, ".", handoffNote],
    });
    $[8] = titleText;
    $[9] = jobSuffix;
    $[10] = handoffNote;
    $[11] = runningLine;
  } else runningLine = $[11];
  let attachHint;
  if ($[12] !== jobId) {
    attachHint = jobId
      ? jsxProd_default_2(Text, {
          children: [
            "Run ",
            jsxProd_default_2(Text, {
              bold: true,
              children: ["claude attach ", jobId],
            }),
            " to open it, or",
            " ",
            jsxProd_default_2(Text, {
              bold: true,
              children: ["claude stop ", jobId],
            }),
            " first to resume it here.",
          ],
        })
      : null;
    $[12] = jobId;
    $[13] = attachHint;
  } else attachHint = $[13];
  let forkIntro;
  if ($[14] !== jobId) {
    forkIntro = jobId
      ? jsxProd_default(Text, {
          children: "To branch off a copy instead, run:",
        })
      : jsxProd_default_2(Text, {
          children: [
            "Run ",
            jsxProd_default(Text, {
              bold: true,
              children: "claude agents",
            }),
            " to find its id and attach to it, or run:",
          ],
        });
    $[14] = jobId;
    $[15] = forkIntro;
  } else forkIntro = $[15];
  let forkCommand;
  if ($[16] !== cdPrefix || $[17] !== sessionArg) {
    forkCommand = jsxProd_default_2(Text, {
      children: [" ", cdPrefix, "claude --resume", sessionArg, " --fork-session"],
    });
    $[16] = cdPrefix;
    $[17] = sessionArg;
    $[18] = forkCommand;
  } else forkCommand = $[18];
  let forkBox;
  if ($[19] !== forkIntro || $[20] !== forkCommand) {
    forkBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [forkIntro, forkCommand],
    });
    $[19] = forkIntro;
    $[20] = forkCommand;
    $[21] = forkBox;
  } else forkBox = $[21];
  let forkNote;
  if ($[22] !== jobId) {
    forkNote = jobId
      ? null
      : jsxProd_default(Text, {
          dimColor: true,
          children: "to branch off a copy.",
        });
    $[22] = jobId;
    $[23] = forkNote;
  } else forkNote = $[23];
  let content;
  if ($[24] !== forkBox || $[25] !== forkNote || $[26] !== runningLine || $[27] !== attachHint) {
    content = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [runningLine, attachHint, forkBox, forkNote],
    });
    $[24] = forkBox;
    $[25] = forkNote;
    $[26] = runningLine;
    $[27] = attachHint;
    $[28] = content;
  } else content = $[28];
  return content;
}
export { NoConversationsMessage, ResumeConversation };
