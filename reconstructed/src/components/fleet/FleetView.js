/**
 * components/fleet/FleetView.tsx
 *
 * 2.1.316 新增：Agents（fleet）视图主组件：管理会话名单、选择、编辑器、附加与派发；Agents 视图的键盘处理：导航、打开、派发、重命名、分组、删除、搜索、vim 模式等等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (17)
 * attribution: placement 17
 */
import { isDeepStrictEqual } from "util";
import { basename, resolve } from "path";
import { randomUUID } from "crypto";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  SIMPLE_PINNED,
  groupCollapseKey,
  prependModeCharacterToInput,
  parseDraftInput,
  buildFleetRows,
  getJobTitle,
} from "./FleetRow.js";
import {
  jobSortKey_2,
  jobSortKey,
  sortJobs,
  remoteRowIdOf,
  isRemoteRowId,
  ensureFleetRoster,
  ensureFleetSelection,
  ensureFleetLiveStatus,
  canonicalRepoRoot,
  CloudListFailureNotice,
  CLOUD_LIST_ATTEMPTS,
  isOtherLocalDaemonJob,
  jobTempo,
  emitFinishedJobs,
  terminalTitle,
  prepareFatalExit,
  reportFatalAndExit,
  markJobFinished,
  resolveDispatchPermissionMode,
} from "./fleetRows.js";
import {
  clearFleetOfferState,
  useIdeMcpClients,
  buildJobActions,
  openEarlierSession,
  attachToJob,
  openNewSession,
  logFleetJobAction,
  COMMAND_NOT_RESPONDING_TEXT,
  offerJobRestart,
} from "./fleetActions.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  setDispatchWindowValue,
  STILL_STARTING_MESSAGE,
  parseNewSessionPrefix,
  isPasteImageKey,
  pasteImageFromClipboard,
  DISPATCH_FLAG_HINTS,
  ensureFleetEditor,
  shouldListPastSessions,
  listPastSessions,
  modelSuggestions,
  EMPTY_AGENT_SUGGESTIONS,
  EMPTY_SKILL_SUGGESTIONS,
  findMentionedTemplate,
  mergeSuggestionsByName,
  relaunchAgentsView,
  CLAUDE_AGENTS_AUTO_RELAUNCHED_AT,
  RELAUNCH_COOLDOWN_MS,
  RELAUNCH_RECENT_MS,
  buildDispatchSuggestions,
  SUGGESTION_KIND_LABELS,
  replaceTrailingMention,
  pruneReplyDrafts,
  backfillAgentLastUsed,
  SUGGESTION_KIND_LABELS_2,
  mentionRanges,
  newSessionPrefixRanges,
  composePolicyLimitsForFleet,
  safeRespawnBgSession,
} from "./fleetSessions.js";
import {
  RENAME_SAVE_WAIT_MS,
  resolveFleetKeyAction,
  jumpGroupHeader,
  nextFocusableRow,
  resolveExitAction,
  logFleetActionFailure,
  RENAME_BUSY_TEXT,
  shortcutDisplayFor,
  stopOrDeleteJob,
  stopGroup,
  ensureFleetViewStore,
  ensureDeleteConfirmStore,
  PREVIEW_BACK_TIMEOUT_MS,
  DispatchModeLine,
  submitRename,
  submitGroupEdit,
  FleetSearchInput,
  FleetBody,
  FleetFooter,
} from "./FleetViewInput.js";
import { keyEventToKeystroke } from "../../keybindings/match.js";
import { clearAttachBeacon, startAttachBeacon } from "../../daemon/jobs/attachBeacon.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import { editPromptInEditor } from "../../utils/promptEditor.js";
import {
  writeJobPinned,
  UNGROUPED,
  EARLIER,
  IDLE_NEEDS,
  jobMatchesCwd,
  spawnOrigin,
  isReservedGroupName,
  isLoopJob,
  isLocalDaemonAgent,
  terminalOutcome,
  isSelfDriving,
  listJobs,
  isExecLaunch,
} from "../../services/daemon/jobState.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { collapseWhitespace, getFirstLine } from "../../utils/stringUtils.js";
import { submitDispatch, DISPATCH_TIMEOUT_MS, handlePasteIntoDispatch } from "./fleetDispatch.js";
import { logEvent } from "../../services/analytics/index.js";
import { isFleetDispatchEnabled, claimSpareFromPool, discardSpare } from "../../cli/bg/bgSpare.js";
import { isBashModeChar } from "../PromptInput/inputModes.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createSignal } from "../../utils/signal.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { findGitRoot, listUserAgentTemplates, setSpareExtraArgs } from "../../cli/bg/bgSpawnEnv.js";
import { listRepoWorktrees } from "../../utils/worktree.js";
import { getCommands, isSkillOff, getHumanFacingDescription } from "../../commands.js";
import {
  init_react_production,
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useReducer,
  useLayoutEffect,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { truncateWithEllipsis } from "../../services/sessionStatus/sessionStateClassifier.js";
import { useTerminalNotification } from "../../ink/useTerminalNotification.js";
import { useTheme_2, useStdin } from "../design-system/ThemeProvider.js";
import { notifyAsync } from "../../utils/terminalProbe.js";
import { markAgentsNotified, createNotifiedState } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useFleetBindings, useDispatchWindowDefaults, FleetRowList, FleetComposer } from "./FleetList.js";
import { isAgentsSimpleViewEnabled } from "../../utils/fleetGates.js";
import { useTimeout, useTerminalTitle, createRoot } from "../../ink/hooks/useTerminalHooks.js";
import { createFleetViewHost, useAttachFleetOwners } from "./useAttachFleetOwners.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { getCwd } from "../../utils/cwd.js";
import { canonicalizePath } from "../../utils/sessionStoragePortable.js";
import { getRealPathOptions } from "../../utils/sessionStorage.js";
import { uniq, count } from "../../utils/collections.js";
import { useDoublePress } from "../../keybindings/useActionHandlers.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useAppState, useAppState_2 } from "../../state/AppState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import {
  useVoiceAvailable,
  useVoiceIntegration,
  useVoiceKeybindingHandler,
} from "../../hooks/useVoiceIntegration.js";
import { useGetVoiceState } from "../../context/voice.js";
import { useSearchInput } from "../../hooks/useSearchInput.js";
import { formatAtMention } from "../../hooks/useIdeAtMentioned.js";
import { cacheImagePath } from "../../utils/imageStore.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import {
  useInterval,
  useDebouncedCallback,
  useSelection,
  useInputClock,
} from "../../ink/components/Input.js";
import { getLastInteractionTime, getRootSession, resetInteractionBaseline } from "../../bootstrap/state.js";
import { returnFalseAttention } from "./sessionAttention.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useNotifications } from "../../context/notifications.js";
import {
  buildCopiedNotification,
  modalPagerAction,
  useSelectionClearKeybinding,
} from "../ScrollKeybindingHandler.js";
import { useCopyOnSelect, useSelectionBgColor } from "../../hooks/useCopyOnSelect.js";
import { getSecondRootError, enterAltScreenSequence, exitAltScreenSequence } from "../../ink/terminal.js";
import { openClickedLink } from "../../utils/browser.js";
import { getAuthTokenSource } from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { usePasteHandler } from "../../hooks/usePasteHandler.js";
import { PasteEvent } from "../../ink/frame.js";
import { APP_CONTEXT } from "../../../vendor/convert-to-spaces/dist/index.js";
import { PromptInputFooterSuggestions } from "../PromptInput/PromptInputFooterSuggestions.js";
import { getTerminalSize } from "../../ink/ink.js";
import { eraseViewportInPlace, getEraseScreenSequence } from "../../ink/clearTerminal.js";
import { initBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { initBundledSkills } from "../../skills/bundled/index.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  hasTeammateModeSnapshot,
  captureTeammateModeSnapshot,
} from "../../utils/swarm/backends/teammateModeSnapshot.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { openDaemonLease } from "../../services/daemon/controlClient.js";
import { showScreen } from "../../utils/runSteps.js";
import { noRemoteSessionCommands } from "../../utils/remoteSessionCommands.js";
import { neverEmbedded } from "../SearchBox.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import { shouldUseFullscreenByDefault } from "../../utils/fullscreen.js";
import { takeNotificationLatency, checkDispatchDefaultsChanged } from "./dispatchDefaults.js";
import { readJobDraft, sweepJobDrafts } from "../../daemon/jobs/draftSweep.js";
import { parseSwitchTarget } from "../../daemon/attach/attachJob.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { FleetViewScreen } from "../../screens/FleetView/FleetViewScreen.js";
import { AppRoot } from "../AppRoot.js";
import { setJitPolicyAfterStartup } from "../../utils/jitPolicy.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getPlatform } from "../../utils/platform.js";
import { onExit } from "../../../vendor/signal-exit/dist/mjs/index.js";
import { NOTICE_WIDTH_LIMIT } from "../PromptInput/Notifications.js";
import { osc, OSC } from "../../ink/termio/osc.js";
import { attachJob } from "../../daemon/jobs/killJob.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";

//@ chunk-93kwxas0.js:5808-5932 placement
function fleetAttachFields(id, originJobId, visitCount) {
  return {
    attach_kind: !originJobId ? lit("no_origin") : id === originJobId ? lit("origin_return") : lit("other"),
    is_first_attach_of_visit: visitCount === 0,
  };
}
//@ chunk-93kwxas0.js:163196-164309 placement
/**
 * 在同组内上下移动当前会话（固定排序）。
 */
function reorderFocusedJob(context, direction) {
  let { roster, selection, editor } = context.submit;
  let { rows, pendings, byGroup, byState, simpleView } = context;
  let setError = editor.setError;
  if (selection.reorderIssued) return;
  let focusedIdx = selection.getSnapshot().focusedIdx;
  let focusedRow = rows[focusedIdx];
  if (focusedRow?.kind !== "job") return;
  let targetIdx = focusedIdx + direction;
  while (rows[targetIdx]?.kind === "earlier") targetIdx += direction;
  let targetRow = rows[targetIdx];
  if (targetRow?.kind !== "job" || focusedRow.group !== targetRow.group) return;
  let job = focusedRow.job;
  let job_2 = targetRow.job;
  if (pendings.some((pending) => pending.id === job.id || pending.id === job_2.id)) return;
  if (job.state.backend !== "daemon" || job_2.state.backend !== "daemon") return;
  setError(null);
  let isPinnedGroup = focusedRow.group === "pinned" || focusedRow.group === SIMPLE_PINNED;
  if ((byGroup || simpleView) && !isPinnedGroup) return;
  let sortByState = byState && !isPinnedGroup;
  let sortKey = sortByState ? (job) => jobSortKey_2(job, focusedRow.group) : jobSortKey;
  let focusedKey = sortKey(job.state);
  let targetKey = sortKey(job_2.state);
  let orders = new Map();
  if (focusedKey === targetKey) {
    let pendingIds = new Set(pendings.map((pending) => pending.id));
    let nextOrder = 0;
    for (let row of rows)
      if (row.kind === "job" && row.group === focusedRow.group && !pendingIds.has(row.job.id))
        orders.set(row.job.id, nextOrder++);
    let focusedOrder = orders.get(job.id);
    orders.set(job.id, orders.get(job_2.id));
    orders.set(job_2.id, focusedOrder);
  } else {
    orders.set(job.id, targetKey);
    orders.set(job_2.id, focusedKey);
  }
  selection.beginReorder(job.id, targetIdx);
  roster.bumpGen();
  let orderField = sortByState ? "stateSortOrder" : "sortOrder";
  roster.updateJobs((jobs) =>
    jobs
      ? sortJobs(
          jobs.map((job) => {
            let order = orders.get(job.id);
            return order === undefined
              ? job
              : {
                  ...job,
                  state: {
                    ...job.state,
                    [orderField]: order,
                  },
                };
          }),
        )
      : jobs,
  );
  selection.queueOrderWrites(orders, sortByState ? "state" : "directory");
}
//@ chunk-93kwxas0.js:164309-177025 placement
/**
 * Agents 视图的键盘处理：导航、打开、派发、重命名、分组、删除、搜索、vim 模式等。
 */
function handleFleetKey(ctx, event) {
  let {
    editor,
    roster,
    selection,
    view,
    attach,
    storageV5,
    onAction,
    exit,
    searchKeyDown,
    vimMode,
    dispatchInputActive,
    templates,
    suggestions,
    pickSuggestion,
    applySuggestion,
    jobSessionIds,
    focusedRow,
    focused,
    openEarlier,
    openNewSessionRow,
    openOrRespawn,
  } = ctx.submit;
  let {
    deleteConfirm,
    rows,
    focusedIdx,
    altOpenOrigin,
    byGroup,
    hasComposedDispatch,
    headerJobs,
    groupSuggestions,
    previewOpen,
    helpOpen,
    debugOpen,
    groupEdit,
    renamingJobId,
    attachingJobId,
    showAllAgents,
    jobs,
    pendings,
    keybindings,
    simpleView,
    groupsEnabled,
    hasCredentials,
    termRows,
    canGoBack,
    originJobId,
    originSpawn,
    renameKeyDown,
    groupKeyDown,
    setQuery,
    enterInsertMode,
    setRenameDraft,
    setGroupDraft,
    readGroupDraft,
    pressExitKey,
    switchTab,
    clearRename,
    clearGroupEdit,
    headerArmId,
    ck,
    setShowAllAgents,
    setSelectedSuggestion,
    setHoveredSuggestionId,
    attachPastedImage,
  } = ctx;
  let setEditorMode = (mode) => editor.setMode(mode);
  let { setError, setHint } = editor;
  let clearOfferState = () => clearFleetOfferState(attach, editor);
  if (event.key !== " ") view.cancelPeekTap();
  if (
    simpleView &&
    deleteConfirm.pending !== null &&
    !(event.ctrl && event.key === "x") &&
    event.name !== "escape"
  )
    deleteConfirm.disarm();
  let consumeEvent = () => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  if (renamingJobId !== null || view.getSnapshot().renaming !== null) {
    consumeEvent();
    if (event.ctrl && event.key === "c") {
      clearRename();
      return;
    }
    if (event.name === "up" || event.name === "down") return;
    renameKeyDown(event);
    return;
  }
  if (groupEdit !== null) {
    consumeEvent();
    if (event.ctrl && event.key === "c") {
      clearGroupEdit();
      return;
    }
    if (view.getSnapshot().groupPristine) {
      if (
        event.name === "backspace" ||
        event.name === "delete" ||
        (event.ctrl && (event.key === "u" || event.key === "w" || event.key === "k"))
      ) {
        setGroupDraft("");
        view.setGroupPristine(false);
        return;
      }
      switch (event.name) {
        case "return":
        case "escape":
        case "up":
        case "down":
        case "tab":
          break;
        case "left":
        case "right":
        case "home":
        case "end":
        case "pageup":
        case "pagedown":
        case "insert":
        case "wheelup":
        case "wheeldown":
          view.setGroupPristine(false);
          return;
        default:
          if (event.name.startsWith("f") && /^f\d+$/.test(event.name)) return;
          if (!event.ctrl && !event.meta) {
            setGroupDraft("");
            view.setGroupPristine(false);
            groupKeyDown(event);
            return;
          }
          return;
      }
    }
    if (groupEdit.kind === "rename") {
      if (event.name === "up" || event.name === "down") return;
      groupKeyDown(event);
      return;
    }
    let suggestions = groupSuggestions;
    let trimmed = readGroupDraft().trim();
    let isPristine = trimmed === "" || trimmed === groupEdit.cur;
    let groupPickIdx = view.getSnapshot().groupPickIdx;
    if (event.name === "down") {
      if (suggestions.length > 0 && !isPristine)
        view.setGroupPickIdx(Math.min(groupPickIdx + 1, suggestions.length - 1));
      return;
    }
    if (event.name === "up") {
      view.setGroupPickIdx(Math.max(groupPickIdx - 1, -1));
      return;
    }
    if (event.name === "left" && groupPickIdx >= 0) {
      view.setGroupPickIdx(-1);
      return;
    }
    if (event.name === "tab") {
      if (isPristine) return;
      let suggestion = suggestions[Math.max(groupPickIdx, 0)];
      if (suggestion !== undefined) {
        setGroupDraft(suggestion);
        view.setGroupPickIdx(-1);
      }
      return;
    }
    if (event.name !== "return") view.setGroupPickIdx(-1);
    groupKeyDown(event);
    return;
  }
  let resumePicker = view.getSnapshot().resumePicker;
  if (resumePicker !== null) {
    consumeEvent();
    if ((event.ctrl && event.key === "c") || event.name === "escape" || event.meta) {
      view.closeResumePicker();
      return;
    }
    let entries = resumePicker.entries;
    let entryCount = entries?.length ?? 0;
    let resumePickerIdx = view.getSnapshot().resumePickerIdx;
    if (event.name === "down" || (event.ctrl && event.key === "n")) {
      view.setResumePickerIdx(Math.min(resumePickerIdx + 1, Math.max(0, entryCount - 1)));
      return;
    }
    if (event.name === "up" || (event.ctrl && event.key === "p")) {
      view.setResumePickerIdx(Math.max(resumePickerIdx - 1, 0));
      return;
    }
    if (event.name === "return") {
      let entry = entries?.[resumePickerIdx];
      if (entry !== undefined) {
        let isDeleting =
          roster.isDeleting(entry.sessionId.slice(0, 8)) || roster.isDeletingSession(entry.sessionId);
        if (jobSessionIds.has(entry.sessionId) || isDeleting) {
          logFeatureSad("fleet_view_resume_picker", isDeleting ? "deleting_in_flight" : "already_in_list");
          view.refuseResumePick(Date.now());
          setError(
            isDeleting
              ? "This session is being deleted \u2014 reopen /resume once it finishes"
              : "This session is already in the list \u2014 press enter on its row",
          );
          return;
        }
        view.resumePromoteSessionId = entry.sessionId;
        view.closeResumePicker();
        openEarlier(entry, "resume_picker");
      }
      return;
    }
    return;
  }
  let settingPicker = view.getSnapshot().settingPicker;
  if (settingPicker !== null) {
    consumeEvent();
    if ((event.ctrl && event.key === "c") || event.name === "escape" || event.meta) {
      view.closeSettingPicker();
      return;
    }
    let settingPickerIdx = view.getSnapshot().settingPickerIdx;
    if (event.name === "down" || (event.ctrl && event.key === "n")) {
      view.setSettingPickerIdx(Math.min(settingPickerIdx + 1, settingPicker.options.length - 1));
      return;
    }
    if (event.name === "up" || (event.ctrl && event.key === "p")) {
      view.setSettingPickerIdx(Math.max(settingPickerIdx - 1, 0));
      return;
    }
    if (event.name === "return") {
      let option = settingPicker.options[settingPickerIdx];
      view.closeSettingPicker();
      if (option !== undefined)
        setDispatchWindowValue(
          editor,
          ctx.submit.dispatchDefaults,
          settingPicker.setting,
          option.value,
          view.getSnapshot().activeTab === "remote",
        );
    }
    return;
  }
  if (view.resumePickerRefusedAt !== 0) {
    let sinceRefusalMs = Date.now() - view.resumePickerRefusedAt;
    if (sinceRefusalMs >= 0 && sinceRefusalMs < RENAME_SAVE_WAIT_MS && event.name === "return") {
      consumeEvent();
      return;
    }
    view.clearResumePickerRefusal();
  }
  let resumePromoteSessionId = view.resumePromoteSessionId;
  if (
    resumePromoteSessionId !== null &&
    attachingJobId === null &&
    attach.isPromoting(resumePromoteSessionId)
  ) {
    consumeEvent();
    if ((event.ctrl && event.key === "c") || event.name === "escape") view.resumePromoteSessionId = null;
    return;
  }
  view.resumePromoteSessionId = null;
  if (attach.getSnapshot().newSessionOpening) {
    consumeEvent();
    if ((event.ctrl && event.key === "c") || event.name === "escape") attach.abandonNewSession();
    return;
  }
  let fleetKeyAction = resolveFleetKeyAction(keyEventToKeystroke(event), keybindings);
  if (attachingJobId !== null) {
    consumeEvent();
    if ((event.ctrl && event.key === "c") || event.name === "escape") {
      attach.abandonRespawnAttempt();
      let jobId = attach.disarm();
      if (jobId !== null) clearAttachBeacon(jobId, storageV5).catch(() => {});
      attach.dropWarming(attachingJobId);
      return;
    }
    if (
      !event.shift &&
      (event.name === "up" ||
        event.name === "down" ||
        (event.ctrl && (event.key === "p" || event.key === "n")))
    ) {
      if (
        suggestions.length > 0 ||
        ((event.name === "up" || event.name === "down") &&
          !previewOpen &&
          editor.getSnapshot().query.includes(`
`)) ||
        (jumpGroupHeader(ctx, fleetKeyAction, focusedIdx) ??
          nextFocusableRow(ctx, focusedIdx, event.name === "down" || event.key === "n" ? 1 : -1)) ===
          focusedIdx
      )
        return;
      attach.abandonRespawnAttempt();
      let attachingJobId = attach.disarm();
      if (attachingJobId !== null) clearAttachBeacon(attachingJobId, storageV5).catch(() => {});
    } else return;
  }
  if (event.ctrl && event.key === "c") {
    consumeEvent();
    if (helpOpen || debugOpen) {
      view.setHelpOpen(false);
      view.setDebugOpen(false);
      return;
    }
    if (editor.getSnapshot().query) setQuery("");
    if (editor.getSnapshot().mode === "bash") setEditorMode("prompt");
    pressExitKey("Ctrl-C");
    return;
  }
  if (event.name === "escape") {
    consumeEvent();
    if (previewOpen) view.setPreviewOpen(false);
    else if (helpOpen) view.setHelpOpen(false);
    else if (debugOpen) view.setDebugOpen(false);
    else if (showAllAgents) setShowAllAgents(false);
    else if (
      vimMode !== undefined &&
      dispatchInputActive &&
      (vimMode !== "NORMAL" || editor.getSnapshot().query !== "")
    ) {
      if (deleteConfirm.pending) deleteConfirm.dismiss();
      searchKeyDown(event);
    } else if (editor.getSnapshot().query) setQuery("");
    else if (editor.getSnapshot().mode === "bash") setEditorMode("prompt");
    else if (deleteConfirm.pending) deleteConfirm.dismiss();
    else
      switch (
        resolveExitAction({
          originJobId,
          originRowPresent:
            originJobId !== undefined && (jobs?.some((job) => job.id === originJobId) ?? false),
          originSpawn,
        }).kind
      ) {
        case "attach-origin":
          openOrRespawn(
            jobs?.find((job) => job.id === originJobId),
            "esc",
          );
          break;
        case "wait-starting":
          setError(STILL_STARTING_MESSAGE);
          break;
        case "exit-with-hint":
          if (originSpawn) originSpawn.resumeHintRequested = true;
          exit();
          break;
        case "exit":
          exit();
          break;
      }
    return;
  }
  if (
    helpOpen &&
    event.key !== "?" &&
    event.name !== "up" &&
    event.name !== "down" &&
    !(event.ctrl && (event.key === "p" || event.key === "n"))
  )
    view.setHelpOpen(false);
  if (
    event.shift &&
    (event.name === "up" || event.name === "down") &&
    suggestions.length === 0 &&
    !previewOpen
  ) {
    consumeEvent();
    reorderFocusedJob(ctx, event.name === "up" ? -1 : 1);
    return;
  }
  if (fleetKeyAction === "agents:switchView") {
    consumeEvent();
    if (simpleView) return;
    if (!selection.getSnapshot().draftPick) {
      selection.followId = focused?.id ?? null;
      selection.followOrigin = null;
    }
    deleteConfirm.disarm();
    let modes = groupsEnabled ? ["state", "directory", "group"] : ["state", "directory"];
    let index = modes.indexOf(view.getSnapshot().groupMode);
    let nextMode = modes[(index + 1) % modes.length];
    if (nextMode === "group") logFeatureOk("fleet_view_group_mode");
    view.setGroupMode(nextMode);
    saveGlobalConfig(
      (config) =>
        config.fleetViewGroupMode === nextMode
          ? config
          : {
              ...config,
              fleetViewGroupMode: nextMode,
            },
      storageV5,
    );
    return;
  }
  if (fleetKeyAction === "chat:externalEditor" && !previewOpen && !simpleView) {
    consumeEvent();
    let edited = editPromptInEditor(editor.getSnapshot().query);
    if (edited.content !== null && edited.content !== editor.getSnapshot().query) setQuery(edited.content);
    if (edited.error) setError(edited.error);
    return;
  }
  if (fleetKeyAction === "agents:togglePin") {
    consumeEvent();
    let focusedRow = rows[selection.getSnapshot().focusedIdx];
    let job = focusedRow?.kind === "job" ? focusedRow.job : undefined;
    if (!job || pendings.some((pending) => pending.id === job.id)) return;
    let isRemote = false;
    let remoteRowId = isRemote ? remoteRowIdOf(job) : undefined;
    if (isRemote && remoteRowId === undefined) {
      setError(STILL_STARTING_MESSAGE);
      return;
    }
    if (job.state.backend !== "daemon" && !isRemote) {
      setError("Can't pin a session that's running in another terminal");
      logFeatureOk("fleet_view_pin_toggle");
      return;
    }
    let id = job.id;
    let nextPinned = !(
      (isRemote ? roster.getSnapshot().remoteJobs : roster.jobs)?.find((job) => job.id === id)?.state
        .pinned ?? job.state.pinned
    );
    selection.followId = id;
    if (nextPinned) selection.uncollapse(ck("pinned"));
    if (isRemote && remoteRowId !== undefined) {
      if (editor.getSnapshot().error === STILL_STARTING_MESSAGE) setError(null);
      roster
        .markRemoteRow(remoteRowId, (mark) => ({
          ...mark,
          pinned: nextPinned ? true : undefined,
        }))
        .then((saved) => {
          if (saved) logFeatureOk("fleet_view_pin_toggle");
          else logFleetActionFailure(setError, "fleet_view_pin_toggle");
        });
      return;
    }
    roster.bumpGen();
    roster.updateJobs(
      (jobs) =>
        jobs?.map((job) =>
          job.id === id
            ? {
                ...job,
                state: {
                  ...job.state,
                  pinned: nextPinned,
                },
              }
            : job,
        ) ?? jobs,
    );
    let releaseHold = roster.holdJob(id);
    writeJobPinned(id, nextPinned, storageV5)
      .then(() => {
        logFeatureOk("fleet_view_pin_toggle");
      })
      .catch((error) => {
        logError(error);
        setError(`Couldn't ${nextPinned ? "pin" : "unpin"} \u2014 ${errorMessage(error)}`);
        logFeatureBad("fleet_view_pin_toggle", "pin_write_failed");
        roster.reload();
      })
      .finally(releaseHold);
    return;
  }
  let findQuery =
    fleetKeyAction === "agents:find" && !previewOpen && !simpleView && editor.getSnapshot().mode === "prompt"
      ? parseNewSessionPrefix(editor.getSnapshot().query)
      : null;
  if (findQuery !== null) {
    consumeEvent();
    let { query, cursorOffset } = editor.getSnapshot();
    let trimmedQuery = query.trimStart();
    let max = Math.max(0, cursorOffset - (query.length - trimmedQuery.length));
    editor.setQueryAndCursor(
      findQuery,
      vimMode === undefined ? Math.max(0, max + findQuery.length - trimmedQuery.length) : findQuery.length,
    );
    enterInsertMode();
    if (findQuery.length > trimmedQuery.length && view.firstImpression("find"))
      logFeatureOk("fleet_view_find");
    return;
  }
  let focusedIdx_2 = selection.getSnapshot().focusedIdx;
  let headerIdx = jumpGroupHeader(ctx, fleetKeyAction, focusedIdx_2);
  if (headerIdx !== null) {
    consumeEvent();
    setError(null);
    deleteConfirm.disarm();
    if (headerIdx !== focusedIdx_2) {
      selection.jumpToHeader(headerIdx, rows[headerIdx]);
      if (view.firstImpression("groupJump")) logFeatureOk("fleet_view_group_jump");
    }
    return;
  }
  if (fleetKeyAction === "agents:rename") {
    consumeEvent();
    if (
      byGroup &&
      focusedRow?.kind === "header" &&
      focusedRow.group !== UNGROUPED &&
      focusedRow.group !== "pinned" &&
      focusedRow.group !== EARLIER
    ) {
      setGroupDraft(focusedRow.group);
      clearOfferState();
      view.openGroupEdit(
        {
          kind: "rename",
          from: focusedRow.group,
        },
        true,
      );
      return;
    }
    if (!focused || pendings.some((pending) => pending.id === focused.id)) return;
    let isRemoteRow = false;
    if (isRemoteRow && !isRemoteRowId(focused.id)) {
      setError(STILL_STARTING_MESSAGE);
      return;
    }
    if (isRemoteRow && roster.isRetitling(focused.id)) {
      setError(RENAME_BUSY_TEXT);
      return;
    }
    if (!isRemoteRow && focused.state.backend !== "daemon" && !focused.state.sock) return;
    let currentName = collapseWhitespace(focused.state.name ?? "");
    if (isRemoteRow && editor.getSnapshot().error === STILL_STARTING_MESSAGE) setError(null);
    setRenameDraft(currentName);
    clearOfferState();
    view.startRename(
      focused.id,
      focused.state.backend !== "daemon" ? (focused.state.sock ?? null) : null,
      isRemoteRow
        ? {
            sessionId: focused.state.sessionId,
            prefill: currentName,
          }
        : null,
    );
    return;
  }
  if (
    groupsEnabled &&
    fleetKeyAction === "agents:setGroup" &&
    !previewOpen &&
    editor.getSnapshot().query === ""
  ) {
    let isPending = !!focused && (pendings.some((pending) => pending.id === focused.id) || false);
    if (!focused || isPending || (focused.state.backend !== "daemon" && true)) {
      consumeEvent();
      let renameShortcut = shortcutDisplayFor("agents:rename", keybindings);
      setError(
        !focused
          ? focusedRow?.kind === "header"
            ? `${shortcutDisplayFor("agents:setGroup", keybindings)} groups a session \u2014 focus a session row${renameShortcut && ` (${renameShortcut} renames this group)`}`
            : null
          : isPending
            ? STILL_STARTING_MESSAGE
            : "Can't group a session that's running in another terminal",
      );
      return;
    }
    consumeEvent();
    setGroupDraft(focused.state.group ?? "");
    clearOfferState();
    view.openGroupEdit(
      {
        kind: "assign",
        jobId: focused.id,
        cur: focused.state.group,
      },
      !!focused.state.group,
    );
    return;
  }
  if (event.name === "up" || (event.ctrl && event.key === "p")) {
    consumeEvent();
    if (suggestions.length > 0) {
      setHoveredSuggestionId(null);
      setSelectedSuggestion((selectedIdx) => Math.max(0, selectedIdx - 1));
      return;
    }
    if (
      event.name === "up" &&
      !previewOpen &&
      editor.getSnapshot().query.includes(`
`)
    ) {
      searchKeyDown(event);
      return;
    }
    setError(null);
    let nextIdx = nextFocusableRow(ctx, selection.getSnapshot().focusedIdx, -1);
    selection.navigateTo(nextIdx, rows[nextIdx]);
    return;
  }
  if (
    (event.name === "home" || event.name === "end" || event.name === "pageup" || event.name === "pagedown") &&
    suggestions.length === 0 &&
    !hasComposedDispatch
  ) {
    consumeEvent();
    setError(null);
    let max = Math.max(1, termRows - 6);
    let rowCount = rows.length;
    if (rowCount === 0) {
      selection.setHoverFocusIdx(null);
      selection.focus(0);
      return;
    }
    let focusedIdx = selection.getSnapshot().focusedIdx;
    let targetIdx =
      event.name === "home"
        ? 0
        : event.name === "end"
          ? rowCount - 1
          : event.name === "pageup"
            ? focusedIdx - max
            : focusedIdx + max;
    let max_2 = Math.max(0, Math.min(rowCount - 1, targetIdx));
    selection.navigateTo(max_2, rows[max_2]);
    return;
  }
  if (event.name === "down" || (event.ctrl && event.key === "n")) {
    consumeEvent();
    if (suggestions.length > 0) {
      setHoveredSuggestionId(null);
      setSelectedSuggestion((selectedIdx) => Math.min(suggestions.length - 1, selectedIdx + 1));
      return;
    }
    if (
      event.name === "down" &&
      !previewOpen &&
      editor.getSnapshot().query.includes(`
`)
    ) {
      searchKeyDown(event);
      return;
    }
    setError(null);
    let nextIdx = nextFocusableRow(ctx, selection.getSnapshot().focusedIdx, 1);
    selection.navigateTo(nextIdx, rows[nextIdx]);
    return;
  }
  if (previewOpen && event.ctrl && event.key === "x") {
    consumeEvent();
    if (focused && pendings.some((pending) => pending.id === focused.id)) return;
    let focusedRow = rows[selection.getSnapshot().focusedIdx];
    let job = focusedRow?.kind === "job" ? focusedRow.job : undefined;
    if (deleteConfirm.pending !== null && job !== undefined && deleteConfirm.pending.id !== job.id)
      deleteConfirm.disarm();
    stopOrDeleteJob(ctx, "x", job);
    return;
  }
  if (previewOpen) return;
  if (event.name === "tab") {
    consumeEvent();
    if (simpleView) return;
    if (!editor.getSnapshot().query && editor.getSnapshot().mode === "prompt" && templates.length > 0)
      setShowAllAgents((prev) => !prev);
    else if (suggestions.length > 0) applySuggestion(pickSuggestion());
    return;
  }
  if (
    event.name === "right" &&
    !event.shift &&
    !editor.getSnapshot().query &&
    editor.getSnapshot().mode === "prompt" &&
    !previewOpen
  ) {
    consumeEvent();
    if (focusedRow?.kind === "earlier") openEarlier(focusedRow.entry, "section");
    else if (focusedRow?.kind === "newsession") openNewSessionRow(focusedRow.origin);
    else openOrRespawn(focused);
    return;
  }
  if ((event.meta || event.superKey) && event.key >= "1" && event.key <= "9") {
    consumeEvent();
    let remaining = Number(event.key);
    let found = rows.find((row) => row.kind === "job" && row.origin === altOpenOrigin && --remaining === 0);
    if (found?.kind === "job") openOrRespawn(found.job);
    return;
  }
  if (event.name === "return") {
    submitDispatch(ctx.submit, event);
    return;
  }
  if (event.ctrl && event.key === "x") {
    consumeEvent();
    if (suggestions.length > 0) return;
    if (!hasComposedDispatch && byGroup && focusedRow?.kind === "header") {
      if (focusedRow.group === "pinned" || focusedRow.group === UNGROUPED || focusedRow.group === EARLIER) {
        setError(
          `${focusedRow.group === "pinned" ? "Pinned" : focusedRow.group === UNGROUPED ? "Ungrouped" : "Past"} is reserved \u2014 can't ungroup`,
        );
        return;
      }
      selection.followOrigin = focusedRow.group;
      selection.followId = null;
      if (deleteConfirm.pending?.id !== headerArmId(focusedRow.group)) {
        deleteConfirm.arm(headerArmId(focusedRow.group));
        return;
      }
      deleteConfirm.disarm();
      stopGroup(ctx, focusedRow.group);
      return;
    }
    if (!hasComposedDispatch && focusedRow?.kind === "header" && headerJobs.length > 0) {
      selection.followOrigin = focusedRow.group;
      selection.followId = null;
      if (deleteConfirm.pending?.id !== headerArmId(focusedRow.group)) {
        deleteConfirm.arm(headerArmId(focusedRow.group));
        return;
      }
      deleteConfirm.disarm();
      for (let headerJob of headerJobs) {
        if (pendings.some((pending) => pending.id === headerJob.id)) continue;
        stopOrDeleteJob(ctx, "x", headerJob, true);
      }
      return;
    }
    if (focused && pendings.some((pending) => pending.id === focused.id)) return;
    let row = rows[selection.getSnapshot().focusedIdx];
    let job = row?.kind === "job" ? row.job : undefined;
    if (deleteConfirm.pending !== null && job !== undefined && deleteConfirm.pending.id !== job.id)
      deleteConfirm.disarm();
    stopOrDeleteJob(ctx, "x", job);
    return;
  }
  if (event.ctrl && event.key === "d" && (simpleView || editor.getSnapshot().query === "")) {
    consumeEvent();
    if (helpOpen || view.getSnapshot().debugOpen) {
      view.setDebugOpen(false);
      return;
    }
    let snapshot = editor.getSnapshot();
    if (snapshot.mode === "bash" && snapshot.query === "") setEditorMode("prompt");
    pressExitKey("Ctrl-D");
    return;
  }
  if (event.ctrl) event.key;
  if (event.key === "?" && editor.getSnapshot().query === "" && editor.getSnapshot().mode === "prompt") {
    consumeEvent();
    let helpOpen = view.getSnapshot().helpOpen;
    if (!helpOpen) clearOfferState();
    view.setHelpOpen(!helpOpen);
    logEvent("tengu_bg_agent_action", {
      action: lit("help_toggled"),
    });
    return;
  }
  if (isPasteImageKey(event) && !simpleView) {
    consumeEvent();
    pasteImageFromClipboard(
      (image) =>
        attachPastedImage(image.base64, {
          mediaType: image.mediaType,
          dimensions: image.dimensions,
        }),
      setHint,
    );
    return;
  }
  if (
    isFleetDispatchEnabled() &&
    !simpleView &&
    isBashModeChar(event.key) &&
    !editor.getSnapshot().query &&
    editor.getSnapshot().mode === "prompt"
  ) {
    consumeEvent();
    setEditorMode("bash");
    return;
  }
  if (event.name === "backspace" && !editor.getSnapshot().query && editor.getSnapshot().mode === "bash") {
    consumeEvent();
    setEditorMode("prompt");
    return;
  }
  if (simpleView && !previewOpen && renamingJobId === null) {
    if (event.key === "q" && !event.ctrl && !event.meta) {
      consumeEvent();
      pressExitKey("Ctrl-C");
    }
    if (event.key === "l" && !event.ctrl && !event.meta && !hasCredentials) {
      consumeEvent();
      onAction({
        type: "login",
      });
    }
    return;
  }
  searchKeyDown(event);
}
//@ chunk-93kwxas0.js:177067-177083 placement
var EMPTY_REPO_UPDATES = {};
var EMPTY_CATALOG_STATE = {};
//@ chunk-93kwxas0.js:177083-178405 placement
/**
 * 派发建议数据存储（模板、技能、routine、子仓库、worktree）。
 */
class FleetCatalogStore {
  #n = createSignal();
  #e = {
    templates: new Map(),
    skills: new Map(),
    routines: new Map(),
    childRepos: new Map(),
    repoWorktrees: new Map(),
  };
  #l = new Set();
  getSnapshot = () => this.#e;
  subscribe = (listener) => this.#n.subscribe(listener);
  #t(patch) {
    this.#e = {
      ...this.#e,
      ...patch,
    };
    this.#n.emit();
  }
  loadLauncher(cwd) {
    this.#r(cwd, {
      rescanKnown: false,
    });
  }
  refreshLauncher(cwd) {
    this.#r(cwd, {
      rescanKnown: true,
    });
  }
  #r(cwd, { rescanKnown }) {
    if (this.#l.has(cwd)) return;
    let pending = [];
    if (rescanKnown || !this.#e.childRepos.has(cwd))
      pending.push(
        findGitRoot(cwd).then((updates) => {
          let nextChildRepos = updateCatalogEntry(this.#e.childRepos, cwd, updates, EMPTY_REPO_UPDATES);
          if (nextChildRepos)
            this.#t({
              childRepos: nextChildRepos,
            });
        }),
      );
    if (rescanKnown || !this.#e.repoWorktrees.has(cwd))
      pending.push(
        listRepoWorktrees(cwd)
          .then((worktrees) => {
            if (worktrees === null) return;
            let nextWorktrees = updateCatalogEntry(
              this.#e.repoWorktrees,
              cwd,
              worktrees,
              EMPTY_CATALOG_STATE,
            );
            if (nextWorktrees)
              this.#t({
                repoWorktrees: nextWorktrees,
              });
          })
          .catch(() => {}),
      );
    if (pending.length === 0) return;
    this.#l.add(cwd);
    Promise.all(pending).finally(() => {
      this.#l.delete(cwd);
    });
  }
  loadTarget(cwd, storageV5) {
    let cancelled = false;
    if (!this.#e.templates.has(cwd))
      listUserAgentTemplates(cwd, storageV5)
        .catch(() => [])
        .then((templates) => {
          if (!cancelled && !this.#e.templates.has(cwd))
            this.#t({
              templates: new Map(this.#e.templates).set(cwd, templates),
            });
        });
    if (!this.#e.skills.has(cwd))
      getCommands(cwd, storageV5)
        .catch(() => [])
        .then((commands) => {
          if (cancelled || this.#e.skills.has(cwd)) return;
          let mapped = commands
            .filter((command) => !command.isHidden && !isSkillOff(command))
            .map((command) => ({
              kind:
                command.type !== "prompt" ? "command" : command.kind === "workflow" ? "workflow" : "skill",
              name: command.name,
              aliases: command.aliases,
              description:
                (command.type !== "prompt" && DISPATCH_FLAG_HINTS.get(command.name)) ||
                getFirstLine(getHumanFacingDescription(command) ?? ""),
            }));
          this.#t({
            skills: new Map(this.#e.skills).set(cwd, mapped),
          });
        });
    return () => {
      cancelled = true;
    };
  }
}
//@ chunk-93kwxas0.js:178405-178444 placement
function ensureFleetCatalog(visit) {
  return (visit.scope ??= new FleetCatalogStore());
}
//@ chunk-93kwxas0.js:178444-178556 placement
/**
 * 目录项变化时返回新 Map，否则 null。
 */
function updateCatalogEntry(entries, key, updates, emptyState) {
  let next = Object.keys(updates).length > 0 ? updates : emptyState;
  if (isDeepStrictEqual(entries.get(key), next)) return null;
  return new Map(entries).set(key, next);
}
//@ chunk-93kwxas0.js:178556-178560 placement
init_react_production();
//@ chunk-93kwxas0.js:178560-178586 placement
var NEEDS_INPUT_PREVIEW_CHARS = 120;
var IDLE_SEED = "idle-seed";
//@ chunk-93kwxas0.js:178586-179308 placement
/**
 * 比较会话所在分区的变化，生成"需要输入/已完成"通知。
 */
function diffJobBands(previousBands, jobs) {
  let nextBands = new Map();
  let notifications = [];
  let notified = [];
  for (let job of jobs) {
    let previousBand = previousBands.get(job.id);
    let isIdleWaiting = job.band === "blocked" && job.needs === IDLE_NEEDS;
    nextBands.set(job.id, isIdleWaiting ? (previousBand ?? IDLE_SEED) : job.band);
    if (previousBand === undefined || previousBand === job.band || isIdleWaiting) continue;
    switch (job.band) {
      case "blocked":
        notifications.push({
          message: job.needs
            ? `${job.label} needs your input: ${truncateWithEllipsis(job.needs, NEEDS_INPUT_PREVIEW_CHARS)}`
            : `${job.label} needs your input`,
          notificationType: "agent_needs_input",
        });
        notified.push({
          sessionId: job.sessionId,
          kind: "needs_input",
        });
        break;
      case "completed":
        if (
          job.outcome !== "stopped" &&
          !job.selfDriving &&
          !(previousBand === IDLE_SEED && job.outcome === "success")
        ) {
          notifications.push({
            message: `${job.label} ${job.outcome === "failure" ? "failed" : "finished"}`,
            notificationType: "agent_completed",
          });
          notified.push({
            sessionId: job.sessionId,
            kind: "completed",
          });
        }
        break;
      case "active":
        break;
    }
  }
  return {
    next: nextBands,
    notifications,
    notified,
  };
}
//@ chunk-93kwxas0.js:179308-179650 placement
/**
 * 会话分区变化时发通知的 hook。
 */
function useJobBandNotifications(bands, storageV5) {
  let terminalNotification = useTerminalNotification();
  let { storageV5: storageV5_2, credentials } = useTheme_2();
  let previousRef = useRef(new Map());
  useEffect(() => {
    let { next: nextBands, notifications, notified } = diffJobBands(previousRef.current, bands);
    previousRef.current = nextBands;
    for (let notification of notifications)
      notifyAsync(notification, terminalNotification, {
        storageV5: storageV5_2,
        credentials,
      });
    let now = Date.now();
    for (let entry of notified)
      if (markAgentsNotified(storageV5, entry.sessionId, entry.kind, now))
        logEvent("tengu_bg_agent_notification", {
          kind: fromEnum(entry.kind),
          jobSessionId: sanitizeMarkName(entry.sessionId),
        });
  });
}
//@ chunk-93kwxas0.js:179650-179660 placement
var EMPTY_REMOTE_JOBS = [];
//@ chunk-93kwxas0.js:179660-199227 placement
/**
 * Agents（fleet）视图主组件：管理会话名单、选择、编辑器、附加与派发。
 */
function FleetView({
  onAction,
  initialJobId,
  originJobId,
  originSpawn,
  cwdFilter,
  dispatchDefaults,
  typedAgent,
  canGoBack,
  autoOpenJobId,
  entryChannel,
  relaunchTab,
  typedAhead,
  fromLauncher,
  awayLoop,
  host,
  storageV5,
}) {
  let clock = useClock();
  let { stdin, isRawModeSupported } = useStdin();
  let { credentials } = useTheme_2();
  let keybindings = useFleetBindings();
  let isSimpleView = isAgentsSimpleViewEnabled();
  let wantsRemote = !isSimpleView || !!initialJobId?.startsWith("remote-");
  let le = false;
  useTimeout(
    () => {
      if (!isRawModeSupported) return;
      let listenerCount = stdin.listenerCount("readable");
      if (listenerCount > 1)
        logEvent("tengu_fleetview_stdin_contention", {
          listeners: listenerCount,
        });
    },
    1500,
    [],
  );
  let [awayLoopState] = useState(() => awayLoop ?? createNotifiedState());
  let [hostState] = useState(() => host ?? createFleetViewHost());
  let [roster] = useState(() => ensureFleetRoster(hostState, storageV5));
  let {
    jobs,
    adoptedPeers,
    remoteJobs,
    remoteListLoaded,
    remoteListFailure,
    remoteListHasOlder,
    pendings,
    prStatuses,
    loopKicks,
    overlaidLoadLanded,
  } = useStoreSelector(roster);
  let [selection] = useState(() => ensureFleetSelection(hostState, roster, storageV5));
  let { focusedIdx, hoverFocusIdx, collapsed, capExpanded, draftPick, followOrigin } =
    useStoreSelector(selection);
  let groupsEnabled = false;
  let Yt = useRef(false);
  let [view] = useState(() => ensureFleetViewStore(hostState, groupsEnabled, "local"));
  let {
    groupMode,
    activeTab,
    groupEdit,
    resumePicker,
    settingPicker,
    renaming,
    previewOpen,
    helpOpen,
    debugOpen,
  } = useStoreSelector(view);
  let [attach] = useState(() => ensureFleetLiveStatus(hostState));
  let { attachingJobId, autoOpened } = useStoreSelector(attach);
  let [editor] = useState(() => ensureFleetEditor(hostState));
  let { mode, expandHintPasteId } = useStoreSelector(editor);
  let [deleteConfirm] = useState(() =>
    ensureDeleteConfirmStore(hostState, {
      onArm: () => clearFleetOfferState(attach, editor),
    }),
  );
  let { pending } = useStoreSelector(deleteConfirm);
  useTimeout(() => deleteConfirm.disarm(), pending ? 2000 : null, [pending]);
  let [owners] = useState(() => ({
    roster,
    selection,
    view,
    attach,
    editor,
    deleteConfirm,
    earlier: hostState.earlier,
  }));
  let { setError, setHint } = editor;
  let jobId = renaming?.jobId ?? null;
  let remoteJobsForView = wantsRemote ? remoteJobs : EMPTY_REMOTE_JOBS;
  useEffect(() => {
    roster.setRemoteWanted(wantsRemote);
  }, [roster, wantsRemote]);
  useEffect(() => roster.attachView(clock), [roster, clock]);
  let cwd = getCwd();
  let launcherGroup = canonicalRepoRoot({
    cwd,
  });
  let [canonicalCwd, setCanonicalCwd] = useState(cwd);
  useEffect(() => {
    let cancelled = false;
    canonicalizePath(cwd, getRealPathOptions(storageV5)).then((canonicalPath) => {
      if (!cancelled && canonicalPath !== cwd) setCanonicalCwd(canonicalPath);
    });
    return () => {
      cancelled = true;
    };
  }, [cwd, storageV5]);
  let launcherScope =
    cwdFilter &&
    !jobMatchesCwd(
      {
        cwd: canonicalCwd,
      },
      cwdFilter,
    )
      ? cwdFilter
      : canonicalCwd;
  let [dispatchOriginState, setDispatchOrigin] = useState(cwd);
  let effectiveCwd = activeTab === "remote" ? launcherScope : dispatchOriginState;
  let [catalog] = useState(() => ensureFleetCatalog(hostState));
  let { templates, skills, routines, childRepos, repoWorktrees } = useStoreSelector(catalog);
  useEffect(() => {
    catalog.loadLauncher(cwd);
  }, [catalog, cwd]);
  let repoUpdates = childRepos.get(cwd) ?? EMPTY_REPO_UPDATES;
  let worktreeState = repoWorktrees.get(cwd) ?? EMPTY_CATALOG_STATE;
  let joined = uniq([...(jobs ?? []), ...adoptedPeers].map((job) => spawnOrigin(job.state)))
    .sort()
    .join("\x00");
  let { allRepos, worktreeBranches } = useMemo(() => {
    let repoMap = {
      ...repoUpdates,
    };
    for (let origin of joined ? joined.split("\x00") : []) {
      let repoName = basename(origin);
      if (repoName && !/\s/.test(repoName) && repoMap[repoName] === undefined) repoMap[repoName] = origin;
    }
    let branchMap = {};
    for (let [key, value] of Object.entries(worktreeState)) {
      if (repoMap[key] === undefined) repoMap[key] = value.path;
      if (repoMap[key] === value.path) branchMap[key] = value.branch;
    }
    return {
      allRepos: repoMap,
      worktreeBranches: branchMap,
    };
  }, [repoUpdates, joined, worktreeState]);
  let onExit = () =>
    onAction({
      type: "done",
    });
  let exitKeyRef = useRef("Ctrl-C");
  let onExitPress = useDoublePress((isFirstPress) => {
    if (isFirstPress) clearOfferState();
    view.setExitPending(isFirstPress ? exitKeyRef.current : null);
  }, onExit);
  let pressExitKey = (keyLabel) => {
    exitKeyRef.current = keyLabel;
    onExitPress();
  };
  let clearRename = () => {
    view.clearRename();
    setQuery_2("");
  };
  let groupKeyOf = (group, groupMode) => groupCollapseKey(groupMode ?? view.getSnapshot().groupMode, group);
  let headerArmId = (group) => `header:${view.getSnapshot().groupMode}:${group}`;
  let earlierEntries = useStoreSelector(hostState.earlier, (earlierState) => earlierState.entries);
  useEffect(() => {
    if (cwdFilter || !shouldListPastSessions()) {
      if (!cwdFilter) hostState.earlier.clear();
      return;
    }
    let cancelled = false;
    let loadToken = hostState.earlier.beginLoad();
    listPastSessions(new Set(), false, storageV5)
      .finally(() => {
        hostState.earlier.endLoad(loadToken);
      })
      .then((sessions) => {
        if (sessions === null) logFeatureBad("fleet_view_earlier_load", "load_failed");
        else logFeatureOk("fleet_view_earlier_load");
        if (
          !cancelled &&
          (sessions === null || sessions.length === 0) &&
          !initialJobId &&
          selection.restoreAttempts === 1
        )
          selection.restoreAttempts = 2;
        if (sessions === null) return;
        hostState.earlier.setEntries(sessions);
        if (!cancelled && sessions.length > 0)
          logEvent("tengu_fleetview_earlier_loaded", {
            count: sessions.length,
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  let toggleCollapse = (group) =>
    selection.toggleCollapsed(groupKeyOf(group), view.getSnapshot().groupMode === "state" ? group : null);
  let terminalFocus = useTerminalFocus();
  useEffect(() => {
    if (terminalFocus) roster.resetPrFetchGate();
  }, [roster, terminalFocus]);
  let autoUpdated = useAppState((appState) => appState.autoUpdaterResult?.status === "success");
  let { columns, rows } = useTerminalSize();
  let { pathOwnRow } = useDispatchWindowDefaults(editor, dispatchDefaults);
  let [mountAt] = useState(() => Date.now());
  let scrollRef = useRef(null);
  let containerRef = useRef(null);
  useFocusOnMount(containerRef, jobs !== null && !previewOpen);
  let voiceAvailable = useVoiceAvailable();
  let voiceMode = useAppState((appState) => appState.settings.voice?.mode ?? "hold");
  let getVoiceState = useGetVoiceState();
  let togglePreview = () => {
    let focusedRow = selection.focusedRow();
    let job = focusedRow?.kind === "job" ? focusedRow.job : undefined;
    if (!job) return;
    setShowAllAgents(false);
    let previewOpen = view.getSnapshot().previewOpen;
    if (!previewOpen) {
      selection.followId = job.id;
      clearOfferState();
    }
    view.setPreviewOpen(!previewOpen);
  };
  let dispatchInputActive =
    !isSimpleView &&
    !previewOpen &&
    jobId === null &&
    groupEdit === null &&
    attachingJobId === null &&
    resumePicker === null &&
    settingPicker === null;
  let {
    query,
    queryRef,
    setQuery,
    willInsertNewline,
    setCursorOffset,
    handleKeyDown,
    handlePaste,
    vimMode,
    enterInsertMode,
  } = useSearchInput({
    buffer: editor,
    isActive: dispatchInputActive,
    multiline: true,
    honorEditorMode: true,
    onExit: () => {},
    onCancel: jobs === null ? () => pressExitKey("Ctrl-C") : undefined,
    onSpaceOnEmpty: () => {
      if (editor.getSnapshot().mode === "bash") return;
      if (voiceAvailable && voiceMode !== "tap")
        view.schedulePeekTap(
          (callback) => clock.setTimeout(callback, PREVIEW_BACK_TIMEOUT_MS),
          () => {
            let voiceState = getVoiceState();
            if (voiceState.voiceState !== "idle" || voiceState.voiceWarmingUp) return;
            if (queryRef.current.trim() !== "") return;
            togglePreview();
          },
        );
      else togglePreview();
    },
  });
  useIdeMcpClients((client) => {
    let { query, cursorOffset } = editor.getSnapshot();
    editor.insertText(formatAtMention(client, query[cursorOffset - 1]));
  });
  let attachPastedImage = cacheImagePath(() => editor.pastes, handlePaste, {
    onMinted: editor.noteMintedPaste,
  });
  useEffect(() => {
    editor.pruneOrphanedPastes();
  }, [editor, query]);
  useTimeout(() => editor.setExpandHintPasteId(null), expandHintPasteId === null ? null : 8000, [
    expandHintPasteId,
  ]);
  let [composer] = useState(() => ({
    get value() {
      return editor.getSnapshot().query;
    },
    get cursorOffset() {
      return editor.getSnapshot().cursorOffset;
    },
    setValueWithCursor: (value, cursorOffset) => editor.setQueryAndCursor(value, cursorOffset),
  }));
  let voiceIntegration = useVoiceIntegration({
    composer,
    isActive: dispatchInputActive,
  });
  let voiceState = useAppState_2((appState) => appState.voiceState);
  useEffect(() => {
    if (voiceState !== "idle") view.cancelPeekTap();
  }, [view, voiceState]);
  let { handleKeyDown: handleKeyDown_2 } = useVoiceKeybindingHandler({
    voiceHandleKeyEvent: voiceIntegration.handleKeyEvent,
    voiceCancelRecording: voiceIntegration.cancelRecording,
    stripTrailing: voiceIntegration.stripTrailing,
    resetAnchor: voiceIntegration.resetAnchor,
    isActive: (voiceMode !== "tap" || query.trim().length > 0) && mode !== "bash" && dispatchInputActive,
    composer,
  });
  let reducedMotion = useAppState((appState) => isReducedMotion(appState.settings.prefersReducedMotion));
  let showCursor = voiceState === "recording" && !reducedMotion;
  DispatchModeLine({
    editor,
    selection,
    query,
    dispatchMode: mode,
    collapsed,
    canonicalLauncherCwd: canonicalCwd,
    storageV5,
  });
  useAttachFleetOwners(owners, {
    clock,
    groupsEnabled,
  });
  let clearOfferState = () => clearFleetOfferState(attach, editor);
  let modelSuggestionList = useMemo(modelSuggestions, []);
  let {
    query: query_2,
    queryRef: queryRef_2,
    setQuery: setQuery_2,
    cursorOffset,
    handleKeyDown: handleKeyDown_3,
    handlePaste: handlePaste_2,
  } = useSearchInput({
    isActive: jobId !== null,
    honorEditorMode: true,
    backspaceExitsOnEmpty: false,
    onExit: () => submitRename(buildKeyContext()),
    onCancel: clearRename,
  });
  let cancelGroupEdit = () => {
    view.closeGroupEdit();
    setQuery_3("");
  };
  let {
    query: query_3,
    queryRef: queryRef_3,
    setQuery: setQuery_3,
    cursorOffset: cursorOffset_2,
    handleKeyDown: handleKeyDown_4,
    handlePaste: handlePaste_3,
  } = useSearchInput({
    isActive: groupEdit !== null,
    backspaceExitsOnEmpty: false,
    onExit: () => submitGroupEdit(buildKeyContext()),
    onCancel: cancelGroupEdit,
  });
  let knownGroups = useMemo(() => {
    let groups = new Set();
    for (let job of jobs ?? []) if (job.state.group) groups.add(job.state.group);
    for (let remoteJob of remoteJobs) if (remoteJob.state.group) groups.add(remoteJob.state.group);
    return groups;
  }, [jobs, remoteJobs]);
  let groupSuggestions = useMemo(() => {
    if (!groupEdit) return [];
    let excluded = new Set();
    if (groupEdit.kind === "assign") {
      let group = (
        jobs?.find((job) => job.id === groupEdit.jobId) ??
        remoteJobs.find((remoteJob) => remoteRowIdOf(remoteJob) === groupEdit.jobId)
      )?.state.group;
      if (group) excluded.add(group);
    } else excluded.add(groupEdit.from);
    let trimmed = query_3.trim();
    let lower = trimmed.toLowerCase();
    return [...knownGroups]
      .filter((group) => !excluded.has(group) && group.toLowerCase().startsWith(lower))
      .sort((groupA, groupB) => {
        let aStartsWith = groupA.startsWith(trimmed);
        let bStartsWith = groupB.startsWith(trimmed);
        return aStartsWith !== bStartsWith ? (aStartsWith ? -1 : 1) : groupA.localeCompare(groupB);
      });
  }, [groupEdit, knownGroups, jobs, remoteJobs, query_3]);
  let name = query_3.trim();
  let isReserved = name !== "" && isReservedGroupName(name);
  let isNew =
    groupEdit !== null &&
    name !== "" &&
    !isReserved &&
    !knownGroups.has(name) &&
    !(groupEdit.kind === "rename" && groupEdit.from === name);
  let matchesExisting = groupSuggestions.includes(name);
  let joined_2 = groupSuggestions.join(`
`);
  useEffect(() => {
    view.setGroupPickIdx(
      groupEdit?.kind === "assign" && name !== "" && name !== groupEdit.cur && groupSuggestions.length > 0
        ? 0
        : -1,
    );
  }, [joined_2, name]);
  let panelOpen =
    groupEdit?.kind === "assign" && name !== "" && name !== groupEdit.cur && groupSuggestions.length > 0;
  let launcherTemplates = templates.get(cwd) ?? EMPTY_AGENT_SUGGESTIONS;
  let launcherRoutines = routines.get(cwd) ?? EMPTY_SKILL_SUGGESTIONS;
  let mentionedTemplate = findMentionedTemplate(query, allRepos, launcherTemplates, launcherRoutines);
  let targetCwd = mentionedTemplate ?? effectiveCwd;
  let targetTemplates = templates.get(targetCwd) ?? EMPTY_AGENT_SUGGESTIONS;
  let templatesForTarget = useMemo(
    () => mergeSuggestionsByName(targetTemplates, launcherTemplates),
    [targetTemplates, launcherTemplates],
  );
  let skillsForTarget = skills.get(targetCwd) ?? skills.get(cwd) ?? EMPTY_SKILL_SUGGESTIONS;
  let routinesForTarget = routines.get(targetCwd) ?? routines.get(cwd) ?? EMPTY_SKILL_SUGGESTIONS;
  let linkMatchId = prependModeCharacterToInput(query, mode, jobs, cwdFilter);
  let dispatch = useMemo(
    () =>
      parseDraftInput(query, mode, linkMatchId, {
        templates: templatesForTarget,
        allRepos,
        routines: routinesForTarget,
      }),
    [mode, linkMatchId, query, templatesForTarget, allRepos, routinesForTarget],
  );
  let relaunch = useCallback(
    (reason) =>
      relaunchAgentsView(reason, {
        cwdFilter,
        dispatchDefaults,
        typedAgent,
        activeTab,
        onError: setError,
      }),
    [cwdFilter, dispatchDefaults, typedAgent, activeTab],
  );
  useInterval(
    () => {
      let relaunchedAt = Number(process.env[CLAUDE_AGENTS_AUTO_RELAUNCHED_AT]) || 0;
      if (Date.now() - relaunchedAt < RELAUNCH_COOLDOWN_MS) return;
      if (Date.now() - getLastInteractionTime() < RELAUNCH_RECENT_MS) return;
      relaunch("auto");
    },
    autoUpdated && !terminalFocus ? RELAUNCH_RECENT_MS : null,
  );
  let [showAllAgents, setShowAllAgents] = useState(false);
  let [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  let [hoveredSuggestionId, setHoveredSuggestionId] = useState(null);
  useEffect(() => {
    if (query && showAllAgents) setShowAllAgents(false);
  }, [query, showAllAgents]);
  useEffect(() => {
    if (selectedSuggestionIdx !== 0) setSelectedSuggestionIdx(0);
  }, [query, showAllAgents, targetCwd]);
  let [suggestionsGen, bumpSuggGen] = useReducer((gen) => gen + 1, 0);
  let dispatchSuggestions = useMemo(
    () =>
      buildDispatchSuggestions(query, {
        templates: templatesForTarget,
        routines: routinesForTarget,
        repos: allRepos,
        worktreeBranches,
        skills: skillsForTarget,
        models: modelSuggestionList,
        dispatch,
        showAllAgents,
      }),
    [
      query,
      templatesForTarget,
      routinesForTarget,
      allRepos,
      worktreeBranches,
      skillsForTarget,
      modelSuggestionList,
      dispatch,
      showAllAgents,
      suggestionsGen,
    ],
  );
  let { firstWord, isSlashQuery, atMatch, slashMatch, modelArgMatch, templateNames, repoNames, suggestions } =
    dispatchSuggestions;
  useEffect(() => {
    if (atMatch) catalog.refreshLauncher(cwd);
  }, [atMatch, catalog, cwd]);
  let applySuggestion = (suggestion) => {
    setHoveredSuggestionId(null);
    if (suggestion.kind === "model" && modelArgMatch) {
      setQuery(`/model ${suggestion.name}`);
      return;
    }
    let kindLabel = SUGGESTION_KIND_LABELS[suggestion.kind];
    setQuery(
      atMatch || slashMatch
        ? replaceTrailingMention(query, kindLabel, suggestion.name)
        : `${kindLabel}${suggestion.name} `,
    );
  };
  let pickSuggestion = () =>
    (hoveredSuggestionId
      ? suggestions.find((suggestion) => `${suggestion.kind}:${suggestion.name}` === hoveredSuggestionId)
      : undefined) ?? suggestions[Math.min(selectedSuggestionIdx, suggestions.length - 1)];
  let jobActions = useMemo(
    () =>
      buildJobActions(
        roster.reload,
        (followId) => {
          selection.followId = followId;
        },
        roster.optimistic,
        roster.noteDeleteRefusal,
        roster.deleteRefusalOf,
        storageV5,
      ),
    [roster, selection, storageV5],
  );
  let onStop = useCallback(
    async (job) => {
      let found = jobActions.find((action) => action.label === "stop");
      if (!found) throw Error("the stop action is missing");
      await found.run(job, {
        bulk: false,
      });
    },
    [jobActions],
  );
  useEffect(() => {
    logForDebugging("[PERF:bg-remount-end]");
    logFeatureOk("screen_fleet_view");
  }, []);
  let pruneReplyDraftsNow = useCallback(
    () =>
      pruneReplyDrafts(editor, roster, {
        jobs,
        pendings,
        adoptedPeers,
        remoteJobs: remoteJobsForView,
        remoteListLoaded,
      }),
    [editor, roster, jobs, pendings, adoptedPeers, remoteJobsForView, remoteListLoaded],
  );
  useEffect(() => {
    pruneReplyDraftsNow();
  }, [pruneReplyDraftsNow]);
  useInterval(() => {
    if (editor.hasReplyDrafts()) pruneReplyDraftsNow();
  }, 15000);
  let pendingPersistRef = useRef(null);
  let flushPending = useCallback(() => {
    let pendingValue = pendingPersistRef.current;
    pendingPersistRef.current = null;
  }, [storageV5]);
  let debouncedCallback = useDebouncedCallback(flushPending, 300);
  useEffect(() => flushPending, [flushPending]);
  let switchTab = (tab) => {
    if (tab === view.getSnapshot().activeTab) return;
    if (tab === "remote" && !returnFalseAttention()) return;
    view.setActiveTab(tab);
    setHint(null);
    setError(null);
    selection.followOrigin = null;
    deleteConfirm.disarm();
    if (tab === "remote") roster.loadRemote();
  };
  let liveStatus = (job) => roster.liveStatus(job);
  let peersEnabled =
    isCrossSessionMessagingEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_peers", false);
  let [ageNowTick, setAgeNowTick] = useState(() => Date.now());
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let ageNow = isScreenReaderEnabled ? ageNowTick : undefined;
  let now = Date.now();
  let loopJobIds = useMemo(
    () => new Set((jobs ?? []).filter((job) => isLoopJob(job.state)).map((job) => job.id)),
    [jobs],
  );
  let any = (jobs ?? []).some((job) => {
    if (!loopJobIds.has(job.id)) return false;
    let nextAt = loopKicks.get(job.state.sessionId)?.nextAt;
    return nextAt != null && nextAt > now && nextAt - now < 60000;
  });
  useInterval(
    () => setAgeNowTick(Date.now()),
    isScreenReaderEnabled
      ? DISPATCH_TIMEOUT_MS
      : any
        ? 1000
        : jobs?.length || remoteJobsForView.length
          ? 30000
          : null,
  );
  useEffect(() => {
    claimSpareFromPool(launcherScope, true, dispatchDefaults, templates.get(launcherScope), storageV5);
  }, [launcherScope, dispatchDefaults, templates, storageV5]);
  useEffect(() => {
    if (hostState.agentLastUsedMigrationDone) return;
    hostState.agentLastUsedMigrationDone = true;
    backfillAgentLastUsed(storageV5).then((changed) => {
      if (changed) bumpSuggGen();
    });
  }, [hostState, storageV5]);
  useEffect(() => catalog.loadTarget(targetCwd, storageV5), [catalog, targetCwd, storageV5]);
  let { addNotification } = useNotifications();
  let selection_2 = useSelection();
  let onCopied = (text) => {
    addNotification(buildCopiedNotification(text));
  };
  let copyOnSelect = useCopyOnSelect(selection_2, true, onCopied);
  useSelectionBgColor(selection_2);
  let handleModalPager = modalPagerAction(selection_2, copyOnSelect, onCopied);
  useSelectionClearKeybinding(selection_2);
  useLayoutEffect(() => {
    let rootError = getSecondRootError().get(process.stdout);
    if (!rootError) return;
    rootError.onHyperlinkClick = (url) => {
      let et = false;
      let { activeTab, previewOpen } = view.getSnapshot();
      let { error } = editor.getSnapshot();
      openClickedLink(url);
    };
    return () => {
      rootError.onHyperlinkClick = undefined;
    };
  }, [view, editor, false]);
  let showRemoteTabs = false;
  let hasCredentials = useMemo(() => getAuthTokenSource().hasToken, []);
  let cloudListNotice = CloudListFailureNotice({
    onCloudTab: activeTab === "remote" && !isSimpleView && !previewOpen,
    remoteJobs: remoteJobsForView,
    remoteListLoaded,
    remoteListFailure,
  });
  let endsWithOlderSessionsLine = false;
  let fleetRows = buildFleetRows({
    jobs,
    adoptedPeers,
    remoteJobs: remoteJobsForView,
    pendings,
    prStatuses,
    liveStatus,
    heldInTerminal: (job) => roster.terminalHolderOf(job) !== undefined,
    loopJobIds,
    loopKicks,
    focusedIdx,
    hoverFocusIdx,
    followOrigin,
    collapsed,
    capExpanded,
    groupMode,
    activeTab,
    query,
    mode,
    dispatch,
    linkMatchId,
    dispatchRepoCwd: mentionedTemplate,
    pendingDelete: pending,
    earlierEntries,
    cwdFilter,
    initialJobId,
    simpleView: isSimpleView,
    simpleWantsRemote: wantsRemote,
    peersEnabled,
    showRemoteTabs,
    launcherCwd: cwd,
    launcherGroup,
    scopedFallbackOrigin: launcherScope,
    termRows:
      rows -
      (cloudListNotice !== null && remoteJobsForView.length > 0 ? CLOUD_LIST_ATTEMPTS : 0) -
      (pathOwnRow ? 1 : 0) -
      (endsWithOlderSessionsLine ? 1 : 0),
    columns,
    now,
    ageNow,
  });
  let {
    byState,
    byGroup,
    hasComposedDispatch,
    scopedLocalJobs,
    scopedJobs,
    filtered,
    groupOf,
    jobSessionIds,
    doneCap,
    simpleBuilt,
    built,
    rows: rows_2,
    homeIdx,
    onlyOrigin,
    isOnboarding,
    focusedRow,
    focused,
    altOpenOrigin,
    dispatchOrigin,
    focusIsFromHover,
    headerJobs,
    isBashDispatch,
    queryIsFilter,
    hasNameFilter,
  } = fleetRows;
  let findRowIndex = (jobId) => rows_2.findIndex((row) => row.kind === "job" && row.job.id === jobId);
  attach.releasePromoted(jobSessionIds);
  if (isSimpleView && view.firstImpression("simple")) logFeatureOk("fleet_view_simple");
  if (hasNameFilter && view.firstImpression("nameFilter")) logFeatureOk("fleet_view_name_filter");
  if (built.doneFoldHidden > 0 && view.firstImpression("fold"))
    logEvent("tengu_fleetview_fold_shown", {
      done_count: built.doneCount,
      hidden_count: built.doneFoldHidden,
      k: simpleBuilt?.doneCap ?? doneCap,
      terminal_rows: rows,
    });
  useEffect(() => {
    if (jobs === null || !overlaidLoadLanded) return;
    let isCandidate = (job) => isOtherLocalDaemonJob(job, originJobId) && !roster.isHolding(job.id);
    let isCompleted = (job) => jobTempo(job.state) === "completed";
    emitFinishedJobs(hostState.resultSeen, {
      visibleFinished: rows_2
        .filter((row) => row.kind === "job")
        .map((row) => row.job)
        .filter((job) => isCandidate(job) && isCompleted(job)),
      allFinished: jobs.filter((job) => isCandidate(job) && isCompleted(job)),
      allCandidates: jobs.filter(isCandidate),
    });
  }, [hostState, roster, rows_2, jobs, originJobId, overlaidLoadLanded]);
  let disableTitle = useMemo(() => env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE, []);
  useTerminalTitle(
    disableTitle
      ? null
      : terminalTitle(count(scopedJobs, (job) => jobTempo(job.state, liveStatus(job)) === "blocked")),
  );
  useJobBandNotifications(
    scopedLocalJobs
      .filter((scopedLocalJob) => isLocalDaemonAgent(scopedLocalJob.state))
      .map((scopedLocalJob) => ({
        id: scopedLocalJob.id,
        sessionId: scopedLocalJob.state.sessionId,
        band: jobTempo(scopedLocalJob.state),
        label: getJobTitle(scopedLocalJob.state, scopedLocalJob.id === initialJobId),
        needs: scopedLocalJob.state.needs,
        outcome: terminalOutcome(scopedLocalJob.state.state),
        selfDriving: isSelfDriving(scopedLocalJob.state),
      })),
    awayLoopState,
  );
  let followKey = selection.followId ?? focused?.id ?? focusedRow?.group;
  useEffect(() => {
    if (deleteConfirm.pending !== null && deleteConfirm.pending.id === selection.followId) return;
    deleteConfirm.disarm();
  }, [followKey]);
  useLayoutEffect(() => {
    selection.syncRows(rows_2);
    if (!selection.getSnapshot().draftPick) return;
    if (!queryIsFilter) selection.releasePick(rows_2, homeIdx, !hasComposedDispatch && !byGroup);
    else if (hasNameFilter && !selection.followId) selection.followPick(homeIdx, rows_2[homeIdx]);
  });
  useEffect(() => {
    if (pendings.length === 0 || !jobs) return;
    let filtered = pendings.filter((pending) => jobs.some((job) => job.id === pending.id));
    if (filtered.length === 0) return;
    roster.settleLandedPendings(filtered);
    let followId = selection.followId;
    if (followId && filtered.some((pending) => pending.id === followId)) {
      let index = findRowIndex(followId);
      if (index >= 0) selection.focus(index);
    }
  }, [roster, selection, pendings, jobs]);
  useEffect(() => {
    if (selection.isFirstQueryOfLook()) return;
    if (editor.takeProgrammaticChange()) return;
    setError(null);
    setHint(null);
    if (!queryIsFilter) return;
    if (linkMatchId) {
      let index = findRowIndex(linkMatchId);
      if (index >= 0) selection.followPick(index, rows_2[index]);
      else selection.clearFollow();
      return;
    }
    if (hasNameFilter) {
      selection.followPick(homeIdx, rows_2[homeIdx]);
      return;
    }
    selection.clearFollow();
    selection.focus(homeIdx);
  }, [query]);
  useEffect(() => {
    if (focusIsFromHover || (!byState && (draftPick || selection.getSnapshot().draftPick))) return;
    if (dispatchOriginState !== dispatchOrigin) setDispatchOrigin(dispatchOrigin);
  }, [dispatchOrigin, focusIsFromHover, draftPick, byState, dispatchOriginState]);
  useEffect(() => {
    selection.clampFocus(rows_2.length);
  }, [selection, rows_2.length]);
  useEffect(() => {
    if (linkMatchId) {
      selection.savedFocusJobId = null;
      return;
    }
    if (!hasComposedDispatch) {
      let savedFocusJobId = selection.savedFocusJobId;
      selection.savedFocusJobId = null;
      if (savedFocusJobId && hasNameFilter) selection.returnPickTo(savedFocusJobId);
      else if (savedFocusJobId) {
        selection.followOrigin = null;
        selection.followId = savedFocusJobId;
        let index = findRowIndex(savedFocusJobId);
        if (index >= 0) selection.focus(index);
      }
      return;
    }
    let focusedIdx = selection.getSnapshot().focusedIdx;
    let row = rows_2[focusedIdx];
    if (row?.kind === "job" && selection.savedFocusJobId === null) selection.savedFocusJobId = row.job.id;
    let findHeaderIndex = (matches) => rows_2.findIndex((row) => row.kind === "header" && matches(row));
    let headerIdx = -1;
    let group = null;
    if (byState) group = "working";
    else if (mentionedTemplate) {
      headerIdx = findHeaderIndex((row) => row.origin === mentionedTemplate && row.group !== "pinned");
      if (headerIdx >= 0) group = rows_2[headerIdx].group;
    } else if (row?.kind === "job") {
      if (row.group === "pinned")
        group =
          rows_2.find(
            (candidateRow) =>
              candidateRow.kind === "header" &&
              candidateRow.origin === row.origin &&
              candidateRow.group !== "pinned",
          )?.group ?? null;
      else group = row.group;
    } else if (row?.kind === "header") {
      if (row.group !== "pinned") {
        group = row.group;
        headerIdx = focusedIdx;
      }
    }
    if (headerIdx < 0) return;
    selection.followId = null;
    selection.followOrigin = group;
    if (headerIdx !== focusedIdx) selection.focus(headerIdx);
  }, [hasComposedDispatch, byState, mentionedTemplate]);
  let shouldClosePreview =
    previewOpen &&
    (filtered.length === 0 ||
      (focusedRow !== undefined && focusedRow.kind !== "job") ||
      (focusedRow === undefined && (selection.followId === null || findRowIndex(selection.followId) < 0)));
  useEffect(() => {
    if (shouldClosePreview) view.setPreviewOpen(false);
  }, [shouldClosePreview]);
  let sawRemoteRowsRef = useRef(false);
  useEffect(() => {
    if (selection.restoreAttempts >= 2 || jobs === null) return;
    let isRemoteJob = !!initialJobId?.startsWith("remote-");
    let remoteRowExists = isRemoteJob && remoteJobsForView.some((job) => job.id === initialJobId);
    if (isRemoteJob && !remoteListLoaded && !remoteRowExists) return;
    if (!initialJobId && activeTab === "remote" && !rows_2.some((row) => row.kind === "job")) {
      sawRemoteRowsRef.current = remoteJobsForView.length > 0;
      return;
    }
    if (
      !initialJobId &&
      activeTab === "remote" &&
      sawRemoteRowsRef.current &&
      selection.followOrigin !== null
    ) {
      selection.restoreAttempts = 2;
      return;
    }
    if (!isSimpleView && isRemoteJob && activeTab !== "remote" && remoteRowExists) {
      view.setActiveTab("remote");
      return;
    }
    if (!isRemoteJob && initialJobId && jobs === selection.restoreCountedJobs) return;
    selection.restoreCountedJobs = jobs;
    selection.restoreAttempts++;
    let restoreFocus = () => {
      let row = rows_2[homeIdx];
      if (hasNameFilter) {
        selection.followPick(homeIdx, row);
        return;
      }
      selection.focus(homeIdx);
      if (row?.kind === "job") {
        selection.followId = row.job.id;
        selection.followOrigin = null;
      } else if (row?.kind === "earlier") {
        selection.followId = null;
        selection.followOrigin = null;
      } else if (row?.kind === "header") {
        selection.followId = null;
        selection.followOrigin = row.group;
      }
    };
    if (!initialJobId) {
      selection.restoreAttempts =
        rows_2.some((row) => row.kind === "job" || row.kind === "earlier") || !hostState.earlier.pending
          ? 2
          : 1;
      restoreFocus();
      return;
    }
    let index = findRowIndex(initialJobId);
    if (index >= 0) {
      selection.restoreAttempts = 2;
      selection.focus(index);
      selection.followId = initialJobId;
    } else if (selection.restoreAttempts >= 2) restoreFocus();
  }, [jobs, remoteJobsForView, remoteListLoaded, activeTab, initialJobId, homeIdx]);
  let handlers = {
    editor,
    roster,
    selection,
    view,
    attach,
    deleteConfirm,
    storageV5,
    onAction,
    pendings,
    mountAt,
    canonicalLauncherCwd: canonicalCwd,
    cwdFilter,
    parseScope: {
      templates: templatesForTarget,
      allRepos,
      routines: routinesForTarget,
    },
  };
  let openEarlier = (entry, channel) => openEarlierSession(handlers, entry, channel);
  let openOrRespawn = (job, channel) => {
    let group = queryIsFilter && job ? groupOf.get(job.id) : undefined;
    if (group !== undefined) selection.uncollapse(groupKeyOf(group));
    attachToJob(handlers, job, channel);
  };
  let openNewSessionRow = (origin) => openNewSession(handlers, origin);
  let isAutoOpening = autoOpenJobId !== undefined && (!autoOpened || attachingJobId !== null);
  useEffect(() => {
    if (attach.getSnapshot().autoOpened || !autoOpenJobId || jobs === null) return;
    attach.markAutoOpened();
    openOrRespawn(jobs.find((job) => job.id === autoOpenJobId));
  }, [autoOpenJobId, jobs]);
  let showEmptyState =
    jobs !== null && !isAutoOpening && onlyOrigin && activeTab !== "remote" && !query && !isSimpleView;
  let any_2 = filtered.some((job) => job.id === initialJobId);
  useEffect(() => {
    if (!showEmptyState || !view.firstImpression("empty")) return;
    logEvent("tengu_fleetview_empty_state_shown", {
      skeleton: isOnboarding,
      has_origin: any_2,
    });
  }, [showEmptyState, isOnboarding, any_2]);
  let buildKeyContext = () => ({
    submit: {
      editor,
      roster,
      selection,
      view,
      attach,
      storageV5,
      credentials,
      onAction,
      exit: onExit,
      relaunchForUpdate: relaunch,
      searchKeyDown: handleKeyDown,
      willInsertNewline,
      vimMode,
      dispatchInputActive,
      canonicalLauncherCwd: canonicalCwd,
      launcherCwd: cwd,
      effectiveCwd,
      scopedFallbackOrigin: launcherScope,
      cwdFilter,
      dispatchDefaults,
      query,
      dispatch,
      templates: templatesForTarget,
      allRepos,
      routines: routinesForTarget,
      templateCache: templates,
      suggestions,
      skills: skillsForTarget,
      modelArgMatch,
      modelSuggestions: modelSuggestionList,
      pickSuggestion,
      applySuggestion,
      closeAgentBrowse: () => setShowAllAgents(false),
      jobSessionIds,
      builtRows: built.rows,
      bumpSuggGen,
      mountAt,
      focusedRow,
      focused,
      isOnboarding,
      toggleCollapse,
      openEarlier,
      openNewSessionRow,
      openOrRespawn,
    },
    deleteConfirm,
    actions: jobActions,
    rows: rows_2,
    focusedIdx,
    altOpenOrigin,
    byGroup,
    byState,
    hasComposedDispatch,
    dispatchRepoCwd: mentionedTemplate,
    headerJobs,
    groupOf,
    groupSuggestions,
    previewOpen,
    helpOpen,
    debugOpen,
    groupEdit,
    renamingJobId: jobId,
    attachingJobId,
    showAllAgents,
    jobs,
    pendings,
    keybindings,
    simpleView: isSimpleView,
    groupsEnabled,
    hasCredentials,
    termRows: rows,
    canGoBack,
    originJobId,
    originSpawn,
    renameKeyDown: handleKeyDown_3,
    groupKeyDown: handleKeyDown_4,
    setQuery,
    enterInsertMode,
    setRenameDraft: setQuery_2,
    setGroupDraft: setQuery_3,
    readRenameDraft: () => queryRef_2.current,
    readGroupDraft: () => queryRef_3.current,
    pressExitKey,
    switchTab,
    clearRename,
    clearGroupEdit: cancelGroupEdit,
    headerArmId,
    ck: groupKeyOf,
    setShowAllAgents,
    setSelectedSuggestion: setSelectedSuggestionIdx,
    setHoveredSuggestionId,
    attachPastedImage,
  });
  let handleKeyDown_5 = (event) => handleFleetKey(buildKeyContext(), event);
  let { handleKeyDown: handleKeyDown_6, handlePaste: handlePaste_4 } = usePasteHandler({
    handleKeyDown: handleKeyDown_5,
    onPaste: (paste) =>
      handlePasteIntoDispatch(
        {
          editor,
          dispatchInputActive,
          insertAtCursor: (text) => handlePaste(new PasteEvent(text)),
        },
        paste,
      ),
    onImagePaste: attachPastedImage,
  });
  let onPaste = (paste) => {
    let snapshot = view.getSnapshot();
    if (snapshot.resumePicker !== null || snapshot.settingPicker !== null) return;
    if (jobId !== null || snapshot.renaming !== null) {
      handlePaste_2(paste);
      return;
    }
    if (groupEdit !== null) {
      view.setGroupPickIdx(-1);
      if (snapshot.groupPristine) {
        setQuery_3("");
        view.setGroupPristine(false);
      }
      handlePaste_3(paste);
      return;
    }
    if (helpOpen) view.setHelpOpen(false);
    handlePaste_4(paste);
  };
  let isReady = jobs !== null && !isAutoOpening;
  let jE = useRef(null);
  let inputClock = useInputClock();
  let { subscribeFrames } = useContext(APP_CONTEXT);
  useLayoutEffect(() => {
    return;
  }, [isReady, subscribeFrames]);
  let ignoreKey = (event) => false;
  if (jobs === null || isAutoOpening)
    return jsxProd_default(Box, {
      tabIndex: 0,
      autoFocus: true,
      onKeyDownCapture: handleModalPager,
      onKeyDown: (event) => {
        if (
          event.ctrl &&
          event.key === "d" &&
          (isSimpleView || (jobs === null && editor.getSnapshot().query === ""))
        ) {
          event.stopImmediatePropagation();
          pressExitKey("Ctrl-D");
          return;
        }
        if (isSimpleView && (event.name === "escape" || (event.ctrl && event.key === "c"))) {
          event.stopImmediatePropagation();
          pressExitKey("Ctrl-C");
          return;
        }
        handleKeyDown(event);
      },
      onPaste,
    });
  let suggestionList =
    suggestions.length > 0
      ? jsxProd_default(Box, {
          paddingLeft: 2,
          marginBottom: 1,
          children: jsxProd_default(PromptInputFooterSuggestions, {
            suggestions: suggestions.map((suggestion) => ({
              id: `${suggestion.kind}:${suggestion.name}`,
              displayText: modelArgMatch
                ? suggestion.name
                : `${SUGGESTION_KIND_LABELS[suggestion.kind]}${suggestion.name}`,
              description: `${SUGGESTION_KIND_LABELS_2[suggestion.kind]} \xB7 ${suggestion.description}`,
            })),
            selectedSuggestion: Math.min(selectedSuggestionIdx, suggestions.length - 1),
            maxColumnWidth: 35,
            noPad: true,
            hoveredId: hoveredSuggestionId,
            onHoverChange: setHoveredSuggestionId,
            onSelect: (index) => {
              let suggestion = suggestions[index];
              if (suggestion) {
                applySuggestion(suggestion);
                setShowAllAgents(false);
              }
            },
          }),
        })
      : null;
  let mentionNames = new Set([
    ...templateNames,
    ...routinesForTarget.map((routine) => routine.name.toLowerCase()),
    ...repoNames.map((repoName) => repoName.toLowerCase()),
  ]);
  let mentionRangesList = isBashDispatch ? [] : mentionRanges(query, mentionNames);
  let highlights = isBashDispatch
    ? []
    : dispatch?.matched && firstWord === dispatch.template.name.toLowerCase()
      ? [[0, firstWord.length], ...mentionRangesList]
      : isSlashQuery
        ? [[0, firstWord.length], ...mentionRangesList]
        : [...newSessionPrefixRanges(query), ...mentionRangesList];
  return jsxProd_default_2(Box, {
    ref: containerRef,
    flexDirection: "column",
    flexGrow: 1,
    tabIndex: 0,
    autoFocus: true,
    onKeyDownCapture: (event) => {
      if (ignoreKey(event)) return;
      handleModalPager(event);
      handleKeyDown_2(event);
    },
    onKeyDown: handleKeyDown_6,
    onPaste,
    onWheel: (event) => {
      if (previewOpen) return;
      event.preventDefault();
      scrollRef.current?.scrollBy(event.deltaY > 0 ? 3 : -3);
    },
    children: [
      jsxProd_default(FleetRowList, {
        owners,
        layout: fleetRows,
        scrollRef,
        header: jsxProd_default(FleetComposer, {
          editor,
          layout: fleetRows,
          simpleView: isSimpleView,
          dispatchDefaults,
          targetCwd,
          launcherCwd: cwd,
          canonicalLauncherCwd: canonicalCwd,
          originJobId,
        }),
        renameInput: {
          draft: query_2,
          cursor: cursorOffset,
        },
        groupInput: {
          draft: query_3,
          cursor: cursorOffset_2,
          suggestions: groupSuggestions,
          reserved: isReserved,
          isNew,
          matchesExisting,
          panelOpen,
        },
        initialJobId,
        cwdFilter,
        simpleView: isSimpleView,
        endsWithOlderSessionsLine,
        hasCredentials,
        mountAt,
        actions: {
          toggleCollapse,
          openOrRespawn,
          openEarlier,
          openNewSessionRow,
        },
      }),
      jsxProd_default(FleetSearchInput, {
        owners,
        layout: fleetRows,
        onCursorOffsetChange: setCursorOffset,
        highlights,
        voice: {
          interimRange: voiceIntegration.interimRange,
          showCursor,
        },
        isTerminalFocused: terminalFocus,
        simpleView: isSimpleView,
        showRemoteTabs,
        switchTab,
        remoteJobs: remoteJobsForView,
        hasGroups: (jobs ?? []).some((job) => !!job.state.group),
        suggestionList,
        cloudListNotice,
      }),
      jsxProd_default(FleetBody, {
        owners,
        layout: fleetRows,
        footer: jsxProd_default(FleetFooter, {
          owners,
          layout: fleetRows,
          simpleView: isSimpleView,
          canGoBack,
          dispatchDefaults,
          launcherCwd: cwd,
          storageV5,
          groupInput: {
            draft: query_3,
            suggestions: groupSuggestions,
          },
          suggestionsOpen: suggestions.length > 0,
        }),
        simpleView: isSimpleView,
        groupsEnabled,
        showRemoteTabs,
        canGoBack,
        canMention: templatesForTarget.length + routinesForTarget.length + Object.keys(allRepos).length > 0,
        isTerminalFocused: terminalFocus,
        awayLoop: awayLoopState,
        storageV5,
        onOpen: openOrRespawn,
        onStop,
      }),
    ],
  });
}
//@ chunk-93kwxas0.js:199227-199239 placement
var awayLoopApi = null;
//@ chunk-93kwxas0.js:199239-199279 placement
function seedHostJobs(visit, jobs, storageV5) {
  ensureFleetRoster(visit, storageV5).seedJobs(jobs);
}
//@ chunk-93kwxas0.js:199279-199412 placement
function remountClearSeq(inAltScreen, lastFrameFillsCurrentViewport, frameClean) {
  if (inAltScreen) return enterAltScreenSequence();
  let rows = getTerminalSize(process.stdout, null).rows;
  if (rows !== process.stdout.rows) return "";
  return lastFrameFillsCurrentViewport && !frameClean ? eraseViewportInPlace(rows) : "";
}
//@ chunk-93kwxas0.js:199412-209165 placement
async function mountFleetView(renderer, options) {
  let resized = false;
  function onResize() {
    resized = true;
  }
  process.stdout.on("resize", onResize);
  using resizeCleanup = {
    [Symbol.dispose]: () => {
      process.stdout.removeListener("resize", onResize);
    },
  };
  let presentation = "inline";
  let fatalExit = prepareFatalExit();
  if (!fatalExit.ok) {
    await reportFatalAndExit(fatalExit.error);
    return;
  }
  (await import("../../services/remoteTools/registerToolHosts.js")).registerToolHosts();
  initBuiltinPlugins();
  initBundledSkills();
  if (isAgentSwarmsEnabled() && !hasTeammateModeSnapshot()) captureTeammateModeSnapshot();
  setSpareExtraArgs(options?.dispatchExtraArgs ?? []);
  logEvent("tengu_bg_agent_action", {
    action: lit("list_open"),
    mode: fromEnum(getGlobalConfig().fleetViewGroupMode ?? "state"),
  });
  let fleetHost = options?.host ?? createFleetViewHost();
  let rootSession = getRootSession();
  let host = rootSession.host;
  let project = getSessionProject(rootSession);
  markJobFinished(fleetHost.resultSeen, options?.entryChannel);
  if (!getGlobalConfig().hasOpenedAgentsView)
    await saveGlobalConfig(
      (config) => ({
        ...config,
        hasOpenedAgentsView: true,
      }),
      options?.storageV5,
    );
  let pendingInput = [];
  function readStdin() {
    let chunk;
    while ((chunk = process.stdin.read()) !== null) {
      if ((typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk).includes(3)) {
        process.emit("SIGINT");
        return;
      }
      pendingInput.push(chunk);
    }
  }
  process.stdin.on("readable", readStdin);
  await composePolicyLimitsForFleet({
    storageV5: options?.storageV5,
    credentials: options?.credentials,
  });
  let cwdFilter = options?.cwdFilter
    ? await canonicalizePath(resolve(options.cwdFilter), getRealPathOptions(options?.storageV5))
    : undefined;
  let launch = resolveDispatchPermissionMode(options?.dispatchDefaults);
  let storageV5 = isStorageV5Enabled() ? options?.storageV5 : undefined;
  registerCleanup(storageV5 ? () => discardSpare(storageV5) : discardSpare);
  registerCleanup(openDaemonLease("claude agents"));
  let root = renderer;
  let screen = options?.screen;
  let showFrame = (element) => {
    if (screen) screen.update(element);
    else screen = showScreen(root, element);
  };
  let CLAUDE_AGENTS_SELECT = env.CLAUDE_AGENTS_SELECT;
  let cloudCommand = noRemoteSessionCommands();
  let autoOpenJobId = options?.autoOpenJobId ?? cloudCommand?.short;
  let left = cloudCommand?.left;
  let canGoBackNow = autoOpenJobId !== undefined && options?.canGoBack && cloudCommand === undefined;
  let visitedJobIds = [];
  let endedJobIds = new Set();
  let skippedJobId;
  let resumedTab = false;
  let firstLoop = false;
  let takenJobIds = new Set();
  let shouldStayInLoop = () =>
    awayLoopApi !== null &&
    !firstLoop &&
    neverEmbedded({
      presentation,
      rows: getTerminalSize(process.stdout, null).rows,
      embedded: false,
    });
  let leaveView = (errorMessageText, restoreTerminal) => {
    root.unmount();
    if (restoreTerminal && process.stdin.isTTY) setRawModeSafe(process.stdin, false);
    if (restoreTerminal && shouldUseFullscreenByDefault()) process.stdout.write(exitAltScreenSequence());
    if (errorMessageText !== undefined)
      process.stderr.write(`${errorMessageText}
`);
  };
  let booting = false;
  let cliSelectJobId = CLAUDE_AGENTS_SELECT;
  let tracker = createNotifiedState();
  let attachVisitCount = 0;
  let attachFieldsFor = (job) => {
    let fields = {
      ...fleetAttachFields(job.id, cliSelectJobId, attachVisitCount),
      ...takeNotificationLatency(tracker, job.state.sessionId, Date.now()),
    };
    attachVisitCount++;
    return fields;
  };
  let originJobId = options?.originJobId;
  let originSpawn = options?.originSpawn;
  delete process.env.CLAUDE_AGENTS_SELECT;
  let relaunchTab;
  let jobDraft = await readJobDraft(
    await canonicalizePath(getCwd(), getRealPathOptions(options?.storageV5)),
    options?.storageV5,
  );
  let roster = ensureFleetRoster(fleetHost, options?.storageV5);
  ensureFleetSelection(fleetHost, roster, options?.storageV5, jobDraft?.collapsed);
  let fleetEditor = ensureFleetEditor(fleetHost, {
    query: jobDraft?.q || undefined,
  });
  let fleetLiveStatus = ensureFleetLiveStatus(fleetHost);
  sweepJobDrafts();
  let appState;
  process.stdin.off("readable", readStdin);
  let typedAhead = false;
  while (pendingInput.length) process.stdin.unshift(pendingInput.pop());
  let pendingAction;
  if (autoOpenJobId !== undefined) {
    if (roster.jobs === null) roster.seedJobs(await listJobs(undefined, options?.storageV5));
    let found = roster.jobs?.find((job) => job.id === autoOpenJobId);
    if (found) {
      let gestureT0 = performance.now();
      let gestureId = randomUUID();
      startAttachBeacon(gestureId, "fleet", options?.storageV5).catch(() => {});
      let respawnResult = await safeRespawnBgSession(
        found.id,
        {
          knownState: found.state,
        },
        options?.storageV5,
      );
      if (awayLoopApi && cloudCommand !== undefined) {
        if (!respawnResult.ok && !respawnResult.alive) {
          await awayLoopApi.backToCloudSession(cloudCommand.left, false, options?.storageV5);
          left = undefined;
        }
        if (shouldUseFullscreenByDefault()) process.stdout.write(enterAltScreenSequence());
      }
      pendingAction = {
        type: "open",
        job: found,
        respawnResult,
        gestureT0,
        gestureId,
      };
    } else if (awayLoopApi && cloudCommand !== undefined)
      await awayLoopApi.backToCloudSession(cloudCommand.left, false, options?.storageV5);
    else if (
      awayLoopApi &&
      originJobId !== undefined &&
      (shouldStayInLoop() || parseSwitchTarget(autoOpenJobId).kind === "cloud")
    ) {
      let tabResult = await awayLoopApi.sessionTabsNext({
        ending: {
          kind: "asked",
          intent: parseSwitchTarget(autoOpenJobId),
        },
        leftJobId: originJobId,
        visited: [],
        ended: endedJobIds,
        landed: undefined,
        storageV5: options?.storageV5,
      });
      let tabAction =
        tabResult.kind === "cloud"
          ? await awayLoopApi.stayAfterCloudTab(
              tabResult,
              options?.dispatchExtraArgs ?? [],
              false,
              () => originSpawn?.settled === true && !originSpawn.ok,
              options?.storageV5,
            )
          : tabResult;
      if (tabAction.kind === "open") {
        if (tabAction.jobs) roster.seedJobs(tabAction.jobs);
        let jobToOpen = await awayLoopApi.jobToOpen(tabAction.jobId, roster.jobs, options?.storageV5);
        if (jobToOpen) {
          pendingAction = {
            type: "open",
            job: jobToOpen,
          };
          resumedTab = !tabAction.asked;
          booting = tabAction.booting;
        }
      }
      if (pendingAction === undefined) {
        if (originSpawn) originSpawn.resumeHintRequested = true;
        leaveView(awayLoopApi.NO_SESSION_QUIT_LINE, false);
        return;
      }
    }
  }
  let commandNamesDirty = false;
  let defaultsSnapshot;
  let shouldOfferBack = pendingAction !== undefined && originJobId !== undefined;
  for (;;) {
    if (pendingAction === undefined && shouldOfferBack && shouldStayInLoop()) {
      leaveView(awayLoopApi?.NO_SESSION_QUIT_LINE, true);
      break;
    }
    firstLoop ||= pendingAction === undefined;
    if (commandNamesDirty) invalidateCommandNames();
    defaultsSnapshot = checkDispatchDefaultsChanged(defaultsSnapshot, launch, options?.storageV5);
    commandNamesDirty = true;
    let action =
      pendingAction ??
      (await new Promise((resolve) => {
        showFrame(
          jsxProd_default(FleetViewScreen, {
            killRing: fleetHost.killRing,
            children: jsxProd_default(
              AppRoot,
              {
                host,
                project,
                storageV5: options?.storageV5,
                initialState: appState && {
                  ...appState,
                  notifications: {
                    current: null,
                    queue: [],
                    pinned: [],
                  },
                },
                onChangeAppState: ({ newState }) => {
                  appState = newState;
                },
                children: jsxProd_default(FleetView, {
                  onAction: resolve,
                  host: fleetHost,
                  initialJobId: CLAUDE_AGENTS_SELECT,
                  awayLoop: tracker,
                  originJobId,
                  originSpawn,
                  cwdFilter,
                  dispatchDefaults: launch,
                  typedAgent: options?.dispatchDefaults?.agent,
                  canGoBack: options?.canGoBack,
                  autoOpenJobId,
                  entryChannel: options?.entryChannel,
                  relaunchTab,
                  typedAhead,
                  fromLauncher: options?.fromLauncher,
                  storageV5: options?.storageV5,
                }),
              },
              "agents-list",
            ),
          }),
        );
        setJitPolicyAfterStartup();
      }));
    pendingAction = undefined;
    let asked = resumedTab;
    resumedTab = false;
    let booting_2 = booting;
    booting = false;
    let fullscreen = shouldUseFullscreenByDefault();
    if (action.type === "back") {
      root.unmount();
      break;
    }
    if (action.type === "open" && action.job.id !== autoOpenJobId) canGoBackNow = false;
    autoOpenJobId = undefined;
    if (action.type === "login") {
      let { getLoginStartingMessage, Login } = await import("../../services/oauth/postLoginHooks.js");
      let orgReloaded = false;
      let winner = await Promise.race([
        new Promise((resolve) => {
          screen = undefined;
          showScreen(
            root,
            jsxProd_default(AppRoot, {
              storageV5: options?.storageV5,
              initialState: appState && {
                ...appState,
                notifications: {
                  current: null,
                  queue: [],
                  pinned: [],
                },
              },
              onChangeAppState: ({ newState }) => {
                appState = newState;
              },
              children: jsxProd_default(Login, {
                onDone: resolve,
                onOrgDocumentsReload: (reloadOutcome) => {
                  if (reloadOutcome === "previous") orgReloaded = true;
                },
                startingMessage: getLoginStartingMessage(),
              }),
            }),
          );
        }),
        root.waitUntilExit().then(() => "exited"),
      ]);
      if (winner === "exited") break;
      showScreen(root, null);
      if (process.stdout.isTTY) process.stdout.write(getEraseScreenSequence());
      if (winner) {
        let { runOrgMemoryAuthBoundary } = await import("../../services/oauth/postLoginHooks.js");
        runOrgMemoryAuthBoundary();
        await discardSpare(options?.storageV5);
        if (getAPIProvider() === "gateway") {
          root.unmount();
          break;
        }
        fleetEditor.setHint("Login successful");
      }
      if (winner || orgReloaded) {
        let [
          { refreshRemoteManagedSettings: refreshRemoteSettings },
          { refreshPolicyLimits: refreshPolicy },
          { declareNoConsentSurface: declareNoConsent },
          {
            HoldForSettingsReload: holdForSettingsReload,
            enforceOrgConfigGateAfterStepSignIn: enforceOrgGate,
          },
        ] = await Promise.all([
          import("../../services/remoteManagedSettings/loader.js"),
          import("../../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js"),
          import("../../services/remoteManagedSettings/securityCheck.js"),
          import("../TeleportError.js"),
        ]);
        declareNoConsent();
        let reload = Promise.all([
          refreshRemoteSettings(undefined, options?.storageV5, options?.credentials),
          refreshPolicy().catch(() => {}),
        ]);
        await new Promise((resolve) => {
          showScreen(
            root,
            jsxProd_default(AppRoot, {
              storageV5: options?.storageV5,
              children: jsxProd_default(holdForSettingsReload, {
                reload,
                onDone: resolve,
              }),
            }),
          );
        });
        showScreen(root, null);
        await enforceOrgGate(root);
      }
      continue;
    }
    let termErrors = getSecondRootError().get(process.stdout);
    if (fullscreen && action.type === "open") termErrors?.handoffAltScreen();
    if (getPlatform() === "windows" && action.type === "open") termErrors?.handoffRawMode();
    let lastFrameFillsCurrentViewport = termErrors?.lastFrameFillsCurrentViewport ?? false;
    if (!fullscreen) showFrame(null);
    root.unmount();
    if (action.type === "done") break;
    if (getPlatform() === "windows" && process.stdin.isTTY) {
      setRawModeSafe(process.stdin, true);
      process.stdin.ref();
    }
    let exitNotice = "";
    let cleanupExitHook = fullscreen
      ? onExit(() => void process.stdout.write(exitAltScreenSequence() + exitNotice))
      : () => {};
    if (
      CLAUDE_AGENTS_SELECT !== undefined &&
      CLAUDE_AGENTS_SELECT !== action.job.id &&
      CLAUDE_AGENTS_SELECT !== skippedJobId
    ) {
      let selectedJobId = CLAUDE_AGENTS_SELECT;
      visitedJobIds.splice(
        0,
        visitedJobIds.length,
        selectedJobId,
        ...visitedJobIds.filter((visitedId) => visitedId !== selectedJobId),
      );
    }
    CLAUDE_AGENTS_SELECT = action.job.id;
    skippedJobId = undefined;
    if (!action.keepQuery) fleetEditor.dropDraft();
    fleetHost.agentLastUsedMigrationDone = true;
    let now = Date.now();
    let gestureId_2;
    if (action.respawnResult === undefined && action.gestureId === undefined) {
      gestureId_2 = randomUUID();
      startAttachBeacon(gestureId_2, "fleet", options?.storageV5).catch(() => {});
    }
    let sessionTabsEnabled =
      awayLoopApi !== null &&
      neverEmbedded({
        presentation,
        rows: NOTICE_WIDTH_LIMIT,
        embedded: false,
      }) &&
      !firstLoop &&
      !(canGoBackNow && options?.screen !== undefined) &&
      !isExecLaunch(action.job.state);
    if (sessionTabsEnabled) canGoBackNow = false;
    let attachEnding = {
      kind: "failed",
    };
    let respawn =
      action.respawnResult ??
      (await safeRespawnBgSession(
        action.job.id,
        action.freshDispatch
          ? undefined
          : {
              knownState: action.job.state,
            },
        options?.storageV5,
      ));
    logForDebugging(
      `[FV-attach] respawnJob ${action.job.id}: ok=${respawn.ok} alive=${!respawn.ok && respawn.alive} err=${respawn.ok ? "" : respawn.error}`,
    );
    if (respawn.ok || respawn.alive) {
      logFleetJobAction("attach", action.job.state, {
        jobId: sanitizeMarkName(action.job.id),
        attachShort: sanitizeMarkName(respawn.short ?? action.job.id),
        ...attachFieldsFor(action.job),
      });
      process.stdout.write(osc(OSC.SET_TITLE_AND_ICON, getJobTitle(action.job.state, true)));
      let now_2 = Date.now();
      let gesture = {
        gestureId: action.gestureId ?? gestureId_2 ?? randomUUID(),
        attempt: 0,
        t0: action.gestureT0,
        surface: "fleet",
        interactive: {},
      };
      if (action.gestureId === undefined && gestureId_2 === undefined)
        startAttachBeacon(gesture.gestureId, "fleet", options?.storageV5).catch(() => {});
      let runAttach = (shortJobId, gateStdinUntilFirstFrame) =>
        attachJob(shortJobId, {
          alreadyInAlt: fullscreen,
          onExitNotice: (notice) => {
            exitNotice = notice;
          },
          gateStdinUntilFirstFrame,
          gesture,
          sessionTabs: sessionTabsEnabled,
          cloudTabs: awayLoopApi?.hostRestartsForCloudTabs(options?.dispatchExtraArgs ?? []) ?? false,
          tabsLanding: action.landing,
          storageV5: options?.storageV5,
        }).catch((error) => {
          logError(error);
          logFeatureBad("job_attach", "threw");
          return {
            kind: "error",
            msg: `Couldn't attach \u2014 ${errorMessage(error)}`,
          };
        });
      let attachResult = await runAttach(
        respawn.short ?? action.job.id,
        respawn.ok || action.afterNoResponse === true || asked || booting_2,
      );
      let recovered = false;
      if (
        attachResult.kind === "error" &&
        attachResult.orphaned &&
        !isExecLaunch(action.job.state) &&
        !isTerminalShutdown()
      ) {
        let retryRespawn = await safeRespawnBgSession(
          action.job.id,
          {
            force: true,
            knownState: action.job.state,
          },
          options?.storageV5,
        );
        if (retryRespawn.ok || retryRespawn.alive) {
          recovered = true;
          attachResult = await runAttach(retryRespawn.short ?? action.job.id, retryRespawn.ok);
        } else
          attachResult = {
            kind: "error",
            msg: retryRespawn.error,
          };
      }
      clearAttachBeacon(gesture.gestureId, options?.storageV5).catch(() => {});
      if (isTerminalShutdown()) return heldUntilExit();
      if (awayLoopApi) attachEnding = awayLoopApi.attachEndingOf(attachResult, !asked);
      if (attachResult.kind === "error" && !attachResult.ended) {
        if (attachResult.notResponding) {
          if (isExecLaunch(action.job.state)) fleetEditor.setError(COMMAND_NOT_RESPONDING_TEXT);
          else offerJobRestart(fleetLiveStatus, fleetEditor, action.job.id);
        } else fleetEditor.setError(attachResult.msg);
        if (recovered && attachResult.orphaned) logFeatureSad("fleet_view_open", "recovered_then_crashed");
        else logFeatureBad("fleet_view_open", recovered ? "orphan_recovery_failed" : "attach_failed");
      } else {
        if (attachResult.msg) fleetEditor.setError(attachResult.msg);
        logFeatureOk("fleet_view_open");
      }
      logFleetJobAction("detach", action.job.state, {
        attachDurationMs: Date.now() - now_2,
      });
      logForDebugging(`[FV-attach] attachJob returned after ${Date.now() - now}ms \u2014 remounting list`);
    } else {
      fleetEditor.setError(respawn.error);
      let gestureId = action.gestureId ?? gestureId_2;
      if (gestureId !== undefined) clearAttachBeacon(gestureId, options?.storageV5).catch(() => {});
      if (respawn.errorCode === "fork_transcript_never_materialized")
        logFeatureSad("fleet_view_open", "fork_transcript_never_materialized");
      else logFeatureBad("fleet_view_open", "respawn_failed");
    }
    resetInteractionBaseline();
    let recreatedRoot = false;
    if (awayLoopApi && !canGoBackNow && shouldStayInLoop()) {
      root = await createRoot(getBaseRenderOptions(false));
      screen = undefined;
      recreatedRoot = true;
      if (fullscreen && (attachEnding.kind === "ended" || attachEnding.kind === "failed"))
        process.stdout.write(enterAltScreenSequence());
      if (attachEnding.kind === "failed" || (attachEnding.kind === "back" && attachEnding.why === "taken"))
        takenJobIds.add(action.job.id);
      else {
        takenJobIds.delete(action.job.id);
        left = undefined;
      }
      let rawModeChanged = process.stdin.isTTY === true && process.stdin.isRaw !== true;
      if (rawModeChanged) setRawModeSafe(process.stdin, true);
      if (
        attachEnding.kind === "ended" ||
        (attachEnding.kind === "asked" &&
          attachEnding.intent.kind === "leave" &&
          !attachEnding.intent.running)
      )
        endedJobIds.add(action.job.id);
      else endedJobIds.delete(action.job.id);
      let { stayAfterCloudTab } = awayLoopApi;
      let nextTab = await awayLoopApi
        .sessionTabsNext({
          ending: attachEnding,
          leftJobId: action.job.id,
          visited: visitedJobIds.filter((visitedId) => !takenJobIds.has(visitedId)),
          ended: endedJobIds,
          landed: respawn.ok || respawn.alive ? undefined : action.landing,
          storageV5: options?.storageV5,
        })
        .then((tabDecision) =>
          tabDecision.kind === "cloud"
            ? stayAfterCloudTab(
                tabDecision,
                options?.dispatchExtraArgs ?? [],
                true,
                () => false,
                options?.storageV5,
              )
            : tabDecision,
        )
        .finally(() => {
          if (rawModeChanged) setRawModeSafe(process.stdin, false);
        });
      if (nextTab.kind === "quit") {
        await awayLoopApi.backToCloudSession(left, true, options?.storageV5);
        leaveView(nextTab.say, true);
        cleanupExitHook();
        break;
      }
      if (nextTab.kind === "open") {
        if (nextTab.jobs) roster.seedJobs(nextTab.jobs);
        let jobToOpen = await awayLoopApi.jobToOpen(nextTab.jobId, roster.jobs, options?.storageV5);
        if (!jobToOpen) {
          await awayLoopApi.backToCloudSession(left, true, options?.storageV5);
          leaveView(awayLoopApi.NO_SESSION_QUIT_LINE, true);
          cleanupExitHook();
          break;
        }
        pendingAction = {
          type: "open",
          job: jobToOpen,
          ...(nextTab.landing && {
            landing: nextTab.landing,
          }),
        };
        if (attachEnding.kind === "asked" && attachEnding.intent.kind === "quit") {
          let id = action.job.id;
          skippedJobId = id;
          visitedJobIds.splice(
            0,
            visitedJobIds.length,
            ...visitedJobIds.filter((visitedId) => visitedId !== id),
          );
        }
        resumedTab = !nextTab.asked;
        booting = nextTab.booting;
        canGoBackNow = false;
        fleetEditor.setError(null);
        cleanupExitHook();
        continue;
      }
    }
    if (!recreatedRoot) {
      root = await createRoot(getBaseRenderOptions(false));
      screen = undefined;
    }
    if (canGoBackNow) {
      if (!fullscreen)
        process.stdout.write(remountClearSeq(fullscreen, lastFrameFillsCurrentViewport, resized));
      canGoBackNow = false;
      cleanupExitHook();
      screen ??= showScreen(root, null);
      return {
        back: true,
        root,
        screen,
      };
    }
    process.stdout.write(remountClearSeq(fullscreen, lastFrameFillsCurrentViewport, resized));
    logForDebugging("[PERF:bg-remount-start]");
    cleanupExitHook();
  }
}
export { mountFleetView, remountClearSeq, seedHostJobs };
