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
import { init_react_production, y, Q, R, P, ce } from "../../vendor/react/cjs/react.production.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useSession } from "../context/session.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { isCloudSessionsDeniedByOrg } from "../services/cloudSessions/cloudSessionsPolicy.js";
import {
  useAppState,
  useSetAppState,
  useSessionHooksRegistry,
  useAppStoreDirect,
} from "../state/AppState.js";
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
import { w } from "../../vendor/react/compiler-runtime.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useSelection } from "../ink/components/Input.js";
import { useCopyOnSelect, useSelectionBgColor } from "../hooks/useCopyOnSelect.js";
import {
  useSelectionClearKeybinding,
  shouldClearSelectionOnKey,
} from "../components/ScrollKeybindingHandler.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isMouseTrackingEnabled } from "../utils/fullscreen.js";
import { AlternateScreen } from "../ink/components/AlternateScreen.js";
import { Text, Box } from "../ink/components/Text.js";
import { isSafeIdSegment_2 } from "../utils/agentId.js";
import { shellQuoteArgs } from "../utils/bash/bashPipeCommand.js";
import { useNotifications } from "../context/notifications.js";
import { visibleFrameUrls, openArtifactRow } from "../components/artifacts/artifactFrames.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";

//@ chunk-jde8wnzx.js:27371-27375 sole-consumer
init_react_production();
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
function selectOriginalCwd(Fe) {
  return getSessionProject(Fe).originalCwd;
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
  let id = useSession((t) => t.id);
  let { rows } = useTerminalSize();
  let [io] = y(() => startsInCloudByDefault && !isCloudSessionsDeniedByOrg());
  let footerNote = Q(() => {
    return;
  }, [io]);
  let agentDefinitions = useAppState((t) => t.agentDefinitions);
  let standaloneAgentContext = useAppState((t) => t.standaloneAgentContext);
  let mainLoopModel = useAppState((t) => t.mainLoopModel);
  let xe = useAppState((t) => t.initialMessage !== null);
  let setAppState = useSetAppState();
  let sessionHooksRegistry = useSessionHooksRegistry();
  noopTrialEffect();
  let [logs, setLogs] = y([]);
  let [loading, setLoading] = y(true);
  let [resuming, setResuming] = y(false);
  let Ee = R(false);
  let [He, Be] = y(null);
  let [showAllProjects, setShowAllProjects] = y(false);
  let [x, go] = y(null);
  let [te, Oe] = y(null);
  let [Ge, ho] = y(null);
  let [We, So] = y(null);
  let resultRef = R(null);
  let [Ro, Co] = y(0);
  let he = R(0);
  let Se = R(0);
  let filteredLogs = Q(() => {
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
  let bo = Q(() => env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE, []);
  useTerminalTitle(x || bo ? null : "claude \xB7 resume");
  P(() => {
    loadSameRepoMessageLogsProgressive(worktreePaths, undefined, undefined, storageV5)
      .then((result) => {
        resultRef.current = result;
        he.current = result.logs.length;
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
  let ve = R(false);
  let Ue = ce(
    (count) => {
      if (ve.current) return;
      let ref = resultRef.current;
      if (!ref || ref.nextIndex >= ref.allStatLogs.length) return;
      ve.current = true;
      let E = false;
      enrichLogs(ref.allStatLogs, ref.nextIndex, count, storageV5)
        .then((result) => {
          if (resultRef.current !== ref) return;
          ref.nextIndex = result.nextIndex;
          if (result.logs.length > 0) {
            let offset = he.current;
            sortLogs(result.logs).forEach((log, i) => {
              log.value = offset + i;
            });
            setLogs((prev) => prev.concat(result.logs));
            he.current += result.logs.length;
          } else if (ref.nextIndex < ref.allStatLogs.length) E = true;
        })
        .finally(() => {
          ve.current = false;
          if (E) Ue(count);
        });
    },
    [storageV5],
  );
  let loadLogs = ce(
    (allProjects) => {
      setLoading(true);
      let k = ++Se.current;
      let E = resultRef.current;
      resultRef.current = null;
      Co((L) => L + 1);
      (allProjects
        ? loadAllProjectsMessageLogsProgressive(undefined, undefined, storageV5)
        : loadSameRepoMessageLogsProgressive(worktreePaths, undefined, undefined, storageV5)
      )
        .then((result) => {
          if (Se.current !== k) return;
          resultRef.current = result;
          he.current = result.logs.length;
          setLogs(result.logs);
        })
        .catch((error) => {
          if (Se.current !== k) return;
          if (E !== null) resultRef.current = E;
          setLogs((error_0) => error_0.slice());
          logError(error);
        })
        .finally(() => {
          if (Se.current !== k) return;
          setLoading(false);
        });
    },
    [worktreePaths, storageV5],
  );
  let handleToggleAllProjects = ce(() => {
    let newValue = !showAllProjects;
    setShowAllProjects(newValue);
    loadLogs(newValue);
  }, [showAllProjects, loadLogs]);
  function onCancel() {
    process.exit(1);
  }
  async function onSelect(log_0) {
    if (Ee.current) return;
    Ee.current = true;
    setResuming(true);
    let resumeStart = performance.now();
    try {
      let crossProjectCheck = await checkCrossProjectResume(log_0, showAllProjects, worktreePaths);
      if (crossProjectCheck) {
        let raw = await setClipboard(crossProjectCheck);
        if (raw) process.stdout.write(raw);
        ho(crossProjectCheck);
        return;
      }
      if (!forkSession) {
        let sessionIdFromLog = getSessionIdFromLog(log_0);
        let Re = sessionIdFromLog ? await findBackgroundSessionHolder(sessionIdFromLog, storageV5) : null;
        if (sessionIdFromLog && Re) {
          let ne = xe
            ? undefined
            : liveBackgroundJobId(Re, {
                replacesProcess: true,
              });
          if (ne !== undefined)
            try {
              await attachToBackgroundSession(ne, "picker", storageV5);
              return;
            } catch (error) {
              logFeatureSad("resume_live_background_open", "open_failed", {
                entrypoint: lit("picker"),
              });
              Oe({
                sessionId: sessionIdFromLog,
                log: log_0,
                jobId: ne,
                handoff: {
                  reason: "open_failed",
                  detail: errorMessage(error),
                  promptSent: false,
                },
              });
              return;
            }
          logFeatureSad("resume_live_background_open", xe ? "launch_prompt_pending" : "not_openable", {
            entrypoint: lit("picker"),
          });
          Oe({
            sessionId: sessionIdFromLog,
            log: log_0,
            jobId: Re.jobId,
          });
          return;
        }
      }
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "resume picker: pre-load failed"));
      Be({
        sessionId: getSessionIdFromLog(log_0) ?? undefined,
      });
      return;
    }
    let E = false;
    let B = "load_error";
    let L;
    try {
      let conversationForResume = await loadConversationForResume(log_0, undefined, {
        forkSession: forkSession ?? false,
        storageV5,
        credentials,
        ...precomputeResumeHooks(session.precompute, storageV5, {
          forkSession: !!forkSession,
        }),
        beforeUse: noopModelPinSubscriber("store"),
      });
      if (!conversationForResume) {
        logEvent("tengu_session_resumed", {
          entrypoint: lit("picker"),
          success: false,
          failure_reason: lit("not_found_picker"),
        });
        E = true;
        throw Error("Failed to load conversation");
      }
      L = conversationForResume.sessionStartHooks;
      B = "processing_error";
      let A = noModelPin(
        {
          ...conversationForResume,
          source: "store",
        },
        (u) => conversationForResume.messages.push(createSystemMessage(u, "warning")),
      );
      assertResumeNotRefused(A);
      let ne = require("./chunk-yxywkh50.js").matchSessionMode(conversationForResume.mode);
      if (ne) {
        let agentDefinitions = await reloadAgentDefinitionsForModeSwitch(
          getSessionProject(session).originalCwd,
          [],
          storageV5,
        );
        setAppState((prev) => ({
          ...prev,
          agentDefinitions,
        }));
        conversationForResume.messages.push(createSystemMessage(ne, "warning"));
      }
      resetObserverPairings(session);
      let { adoptedSessionId, effectiveFork } = resolveResumeSessionAdoption(
        conversationForResume.sessionId,
        !!forkSession,
      );
      let $e = adoptedSessionId ? pinSessionId(adoptedSessionId) : pinSessionId(getSessionId());
      if (adoptedSessionId) {
        switchSession(adoptedSessionId, "resume", log_0.fullPath ? dirname(log_0.fullPath) : null);
        await renameRecordingForSession(session, storageV5);
        await resetSessionFilePointer();
        let u = isAgentSwarmsEnabled()
          ? await (await import("./chunk-6cc2zqkz.js")).rekeySessionTeamAtStartup(storageV5)
          : undefined;
        if (u)
          setAppState((V) => ({
            ...V,
            teamContext: u.teamContext,
            teammateColors: u.teammateColors,
          }));
      } else if (effectiveFork) {
        await adoptForkSessionMetadata(conversationForResume, {
          stripWorktreeSession: true,
          stripRelocatedCwd: true,
          destSid: $e,
          storageV5,
        });
        if (conversationForResume.contentReplacements?.length)
          await recordContentReplacement(conversationForResume.contentReplacements, undefined, storageV5);
      }
      setCostStateForRestore(conversationForResume);
      recordResumeSource({
        sourceSessionId: conversationForResume.sessionId,
        transcriptPath: log_0.fullPath,
      });
      let result_3 = await loadAgentDefinitionsForSessionCwd(log_0.projectPath, storageV5);
      let { agentDefinition: resolvedAgentDef } = restoreAgentFromSession(
        conversationForResume.agentSetting,
        mainThreadAgentDefinition,
        agentDefinitions,
        {
          sessionAgentDefinitions: result_3,
          sessionCwd: log_0.projectPath,
          onResolveMiss: (u) => conversationForResume.messages.push(createSystemMessage(u, "warning")),
        },
      );
      if (resolvedAgentDef?.mcpServers?.length) await awaitPolicyColdStartWaiter();
      setAppState((prev) => ({
        ...prev,
        agent: resolvedAgentDef?.agentType,
      }));
      if (effectiveFork) neutralizeForkFallbackBanners(conversationForResume.messages);
      rearmRefusalFallbackHeaderFromTranscript(conversationForResume.messages, effectiveFork);
      let ze = await restoreModelFromSession(
        conversationForResume.messages,
        mainLoopModel,
        (u) => conversationForResume.messages.push(createSystemMessage(u, "warning")),
        {
          storageV5,
          credentials,
        },
      );
      let Ce = ze
        ? installRestoredModel(conversationForResume.messages, ze, effectiveFork, storageV5, credentials)
        : undefined;
      if (Ce)
        setAppState((u) => {
          if (u.mainLoopModel === Ce) return u;
          recordSwitchIfChanged(session, u, Ce, "resume");
          return {
            ...u,
            mainLoopModel: Ce,
          };
        });
      appendSlackTagResumeRecords(conversationForResume.messages, {
        fork: effectiveFork,
        startup: true,
      });
      let freshAgentDefs = await preparePlanModeRestoreOnInteractiveResume({
        storedPermissionMode: conversationForResume.permissionMode,
        messages: conversationForResume.messages,
        forkSession: effectiveFork,
        permissionModeSuppliedOnInvocation,
        lane: "interactive_picker",
      });
      setAppState((prev_0) => {
        let V = freshAgentDefs(prev_0.toolPermissionContext);
        return V
          ? {
              ...prev_0,
              toolPermissionContext: V,
            }
          : prev_0;
      });
      let { isCoordinatorMode } = require("./chunk-yxywkh50.js");
      saveMode(isCoordinatorMode() ? "coordinator" : "normal");
      recordModelPinSwitch(A);
      let standaloneAgentContext_2 = computeStandaloneAgentContext(
        conversationForResume.agentName,
        conversationForResume.agentColor,
      );
      let _e = standaloneAgentContext
        ? {
            ...standaloneAgentContext_2,
            ...standaloneAgentContext,
          }
        : standaloneAgentContext_2;
      if (_e)
        setAppState((prev) => ({
          ...prev,
          standaloneAgentContext: _e,
        }));
      reclaimSessionNameOnResume(_e?.name, storageV5, {
        autoOnly: !conversationForResume.customTitle && !standaloneAgentContext?.name,
      });
      restoreSessionMetadata(
        effectiveFork
          ? buildForkAdoptionMeta(conversationForResume, {
              stripWorktreeSession: true,
              stripRelocatedCwd: true,
            })
          : conversationForResume,
        {
          taintSid: $e,
          storageV5,
        },
      );
      noopModelPinReset(A.declined === true);
      pushRestoredMemoryPauseNotice(conversationForResume.messages);
      applyEndedByModelOnResume(getEndedByModel(conversationForResume), setAppState);
      restoreGoalFromTranscript(conversationForResume.messages, setAppState, sessionHooksRegistry);
      markSessionRestored(session.host);
      if (!effectiveFork && conversationForResume.bridgeSessionId)
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
        let u = restoreWorktreeForResume(
          lastResumeRecordRegistry.of(session.host),
          conversationForResume.worktreeSession,
          undefined,
          {
            storageV5,
          },
        );
        if (u) conversationForResume.messages.push(createSystemMessage(worktreeResumeNotice(u), "warning"));
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
      go({
        messages: conversationForResume.messages,
        fileHistorySnapshots: conversationForResume.fileHistorySnapshots,
        contentReplacements: conversationForResume.contentReplacements,
        agentName: conversationForResume.agentName,
        agentColor:
          conversationForResume.agentColor === "default" ? undefined : conversationForResume.agentColor,
        mainThreadAgentDefinition: resolvedAgentDef,
        pendingHookMessages: conversationForResume.sessionStartHooks,
      });
    } catch (error) {
      if (!E) {
        let A = B;
        logEvent("tengu_session_resumed", {
          entrypoint: lit("picker"),
          success: false,
          failure_reason: fromEnum(A),
          error_name: sanitizedErrorNameForTelemetry(toError(error)),
        });
      }
      if (error instanceof ResumeRefusedError) {
        L?.abort();
        So(error.message);
        return;
      }
      logError(withTelemetryMessage(toError(error), "resume picker: onSelect failed"));
      L?.abort();
      Be({
        sessionId: getSessionIdFromLog(log_0) ?? undefined,
      });
    }
  }
  if (te)
    return jsxProd_default(BackgroundSessionResumeMessage, {
      sessionId: te.sessionId,
      title: getLogDisplayTitle(te.log),
      jobId: te.jobId,
      projectPath: te.log.projectPath,
      handoff: te.handoff,
    });
  if (Ge)
    return jsxProd_default(DifferentDirectoryResumeMessage, {
      command: Ge,
    });
  if (We !== null)
    return jsxProd_default(ResumeExitMessage, {
      message: We,
    });
  if (x)
    return jsxProd_default(REPL, {
      debug,
      commands,
      initialTools,
      initialMessages: x.messages,
      pendingHookMessages: x.pendingHookMessages,
      initialFileHistorySnapshots: x.fileHistorySnapshots,
      initialContentReplacements: x.contentReplacements,
      initialAgentName: x.agentName,
      initialAgentColor: x.agentColor,
      mcpClients,
      dynamicMcpConfig: applyAgentModelOverride(dynamicMcpConfig ?? {}, x.mainThreadAgentDefinition, {
        strictMcpConfig,
      }),
      strictMcpConfig,
      systemPrompt,
      appendSystemPrompt,
      systemPromptSnapshot,
      mainThreadAgentDefinition: x.mainThreadAgentDefinition,
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
  if (He)
    return jsxProd_default(ResumeFailedMessage, {
      sessionId: He.sessionId,
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
      onLoadMore: Ue,
      initialSearchQuery,
      isLoading: loading,
      reloadGeneration: Ro,
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
  let $ = w(8);
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
  let h = w(4);
  let { sessionId } = props;
  let p;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    p = [];
    h[0] = p;
  } else p = h[0];
  useTimeout(shutdownOnTimeout, 100, p);
  let T;
  if (h[1] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default(Text, {
      children: "Failed to resume the conversation.",
    });
    h[1] = T;
  } else T = h[1];
  const children = isSafeIdSegment_2(sessionId)
    ? `Run claude --resume ${sessionId} to retry, or claude to start a new session.`
    : "Run claude to start a new session.";
  let I;
  if (h[2] !== children) {
    I = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        T,
        jsxProd_default(Text, {
          dimColor: true,
          children,
        }),
      ],
    });
    h[2] = children;
    h[3] = I;
  } else I = h[3];
  return I;
}
//@ chunk-jde8wnzx.js:36721-36885 sole-consumer
function ResumeExitMessage(props) {
  let h = w(3);
  let { message } = props;
  let p;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    p = [];
    h[0] = p;
  } else p = h[0];
  useTimeout(shutdownWithoutResumeHint, 100, p);
  let T;
  if (h[1] !== message) {
    T = jsxProd_default(Text, {
      children: message,
    });
    h[1] = message;
    h[2] = T;
  } else T = h[2];
  return T;
}
//@ chunk-jde8wnzx.js:36885-37475 sole-consumer
/**
 * 会话来自其他目录时的提示：显示恢复命令并说明已复制到剪贴板，稍后退出。
 */
function DifferentDirectoryResumeMessage(props) {
  let $ = w(8);
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
  let $ = w(29);
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
//@ chunk-18hwfzwa.js:651055-651381 callgraph-fingerprint = NoConversationsMessage (0.241)
function NoConversationsMessage(props) {
  let $ = w(5);
  let { cloudRowCheck } = props;
  let appStoreDirect = useAppStoreDirect();
  let notifications = useNotifications();
  let ke;
  if ($[0] !== cloudRowCheck || $[1] !== notifications || $[2] !== appStoreDirect) {
    ke = () => {
      let Re = visibleFrameUrls(appStoreDirect.getState().frameUrls);
      if (!Re) {
        return false;
      }
      openArtifactRow(Re, appStoreDirect, notifications, cloudRowCheck);
    };
    $[0] = cloudRowCheck;
    $[1] = notifications;
    $[2] = appStoreDirect;
    $[3] = ke;
  } else ke = $[3];
  let Be;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    Be = {
      context: "Global",
    };
    $[4] = Be;
  } else Be = $[4];
  useKeybinding("app:openArtifact", ke, Be);
  return null;
}
export { NoConversationsMessage };
