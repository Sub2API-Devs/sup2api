/**
 * utils/handlePromptSubmit.ts
 *
 * 输入框提交处理：命令/bash/粘贴/图片/排队，执行用户输入并启动查询。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/handlePromptSubmit.ts
 * pieces: chunk-18hwfzwa.js (4), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 2, layout 1, placement 2
 */
import { randomUUID } from "crypto";
import { startQueryProfile, queryCheckpoint } from "./queryProfiler.js";
import {
  parsePastedRefs,
  stripPlaceholdersWithOptions,
  describeRemovedPastes,
  addHistoryEntryNoUndo,
  flushPromptHistory,
  getInlinePasteTexts,
  recordSubmittedPrompts,
} from "../history.js";
import { pickByHelper } from "./git/gitSafeEnv.js";
import { isNonEmptyImageAttachment, isPassiveOrAttachedCommand } from "./messages/messagePredicates.js";
import {
  shutdownNow,
  createPromptHistoryWriter,
  shouldRecordPrompt,
} from "../screens/repl/lastPromptTracker.js";
import { recordStylePoolAtlas } from "../ink/renderTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import {
  splitSlashCommandInput,
  findCommand,
  isCommandEnabled,
  isImmediateCommand,
  shippedCommandNameForAnalytics,
  getCommandName,
} from "../commands.js";
import { isSlashCommandBlockedByEndedByModel } from "./processUserInput/processSlashCommand.js";
import { withTaskSuffix } from "../tasks/endedByModel.js";
import { bumpClawdPoseRun, releaseKeptPoseIfStale } from "../components/VirtualMessageList.js";
import { runLocalCommandFromRepl } from "../screens/repl/runLocalCommand.js";
import { createAbortController, unwrapAbortReason } from "./abortController.js";
import { resolveCommandDialog } from "../commands/dialogs.js";
import { logFeatureBad, cmdFeature, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { commandUnavailableMessage } from "../screens/repl/idleReturn.js";
import { boldDirectMemberMessage } from "./directMemberMessage.js";
import {
  createUserMessage,
  extractTextContent_2,
  isUserTextPrompt,
  createUserInterruptionMessage,
} from "./messages.js";
import { mainAgentId } from "../bootstrap/state.js";
import { dispatchCommandRunHooks, commandRunEvent } from "../plugins/functionHooks/commandRunDispatch.js";
import { isFrozenMarker } from "./frozenMarkers.js";
import { getTipAttribution } from "../services/tips/tipIds.js";
import { hasSingleCommandRunHook } from "./processUserInput/surfaceCommandNotices.js";
import { isUltraplanEnabled } from "../commands/ultraplan.js";
import { isVirtualPancakeEnabled, getAutoModeConfigOrDefault } from "./permissions/permissionSetup.js";
import { escapePastedContentTag, wrapUserTurnContent, mergeTurnTags } from "./userTurnTags.js";
import { logError } from "./log.js";
import {
  shouldOfferAutoResumePrompt,
  noteHumanTakeover,
  dropStaleContinuation,
  claimTurn,
  releaseTurnClaim,
} from "../services/quotaAutoResume/quotaAutoResume.js";
import { currentTurn } from "../plugins/functionHooks/personHold.js";
import {
  hasPromptSubmitHooks,
  isQueueFreeOfPrompts,
  snapshotBatchSiblings,
  createBatchedMessageOp,
  writeHeldHistory,
  deferredHistoryWrite,
  makeFileHistorySnapshot,
  restoreDroppedInput,
} from "../screens/repl/messageBatching.js";
import { hooksSnapshotKey, submitPromptWithHooks } from "./processUserInput/userPromptSubmitHooks.js";
import { resolvePromptSource } from "./promptSource.js";
import { isAbortError, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { appendLine } from "../screens/repl/SessionController.js";
import {
  isRefillableCommand,
  firstSchedulingPlugin,
  isReplayableHistoryEntry,
  isRefillableInput,
  inputDisplayText,
  getRetainedPastedContents,
  extractImagesFromValue,
  isSlashCommand_2,
} from "./messageQueueManager.js";
import { createPromptEntryTracker } from "./processUserInput/promptEntryWaiters.js";
import { normalizeTaskNotificationOrigin, resolveTaskNotificationOrigin } from "./backgroundSessionResume.js";
import { getMainLoopModelFromState } from "../hooks/useMainLoopModel.js";
import {
  isPromptHookObserved,
  withInteractionSpan,
  currentPromptHandle,
  endInteractionSpan,
} from "./telemetry/sessionTracing.js";
import { parseSlashCommand } from "./slashCommandParsing.js";
import { withExpandedPastes } from "./hooks/postSamplingHooks.js";
import { withWorkloadStorage } from "./http.js";
import { disposeDropsWaiting } from "../plugins/functionHooks/promptSubmit.js";
import { isHumanOrUnset } from "./messageProvenance.js";
import { ensureTurnId, getTextBlocks, markVerifiedHumanTurn } from "./messages/apiNormalization.js";
import {
  processUserInput,
  isNullRenderingAttachment_2,
  isNullRenderingAttachment,
} from "./processUserInput/processUserInput.js";
import {
  stampMissingOrigin,
  markSkipAttachments,
  markTextNotTyped,
  markTranscriptOnly,
  attachTaskDelivery,
} from "./messages/nonUserMessages.js";
import { MESSAGE_MARK_SYMBOLS } from "./messageKinds.js";
import { fileHistoryEnabled } from "./fileHistory.js";
import { turnAttributionKeyOf } from "./turnAttributionKey.js";
import { isSkillModelOverrideAllowedInMode } from "./betas.js";
import { resolveSkillModelOverride } from "./model/model.js";
import { isScreeningPendingEntry } from "./historyFile.js";

//@ chunk-e6aww6q8.js:67200-67247 placement
/**
 * 提交框里被视为"退出"的输入（exit、quit、:q 等）。
 */
var EXIT_COMMAND_WORDS = ["exit", "quit", ":q", ":q!", ":wq", ":wq!"];
//@ chunk-18hwfzwa.js:1475438-1483880 fingerprint (2.1.88 match: handlePromptSubmit, 0.391)
/**
 * 处理输入框提交：斜杠命令、bash 模式、图片/粘贴、排队（正在运行时入队），最终调用 executeUserInput。
 */
async function handlePromptSubmit(params) {
  let {
    helpers,
    turn,
    commands,
    presentation,
    onInputChange,
    setPastedContents,
    messages,
    mainLoopModel,
    ideSelection,
    getAppState,
    setAppState,
    onBeforeQuery,
    canUseTool,
    queuedCommands,
    uuid,
    skipSlashCommands,
    queue,
  } = params;
  let { setCursorOffset, clearBuffer, resetHistory } = helpers;
  if (queuedCommands?.length) {
    startQueryProfile();
    await executeUserInput({
      inputSource: "queued",
      queuedCommands,
      messages,
      mainLoopModel,
      ideSelection,
      querySource: params.querySource,
      commands,
      turn,
      queue,
      getAppState,
      setAppState,
      onBeforeQuery,
      resetHistory,
      canUseTool,
      onInputChange,
      getCurrentInput: params.getCurrentInput,
      restoreHandedBackPrompt: params.restoreHandedBackPrompt,
      onPromptCameBack: params.onPromptCameBack,
      onPromptHandedBack: params.onPromptHandedBack,
      setPastedContents,
      deferSlashToEngine: params.deferSlashToEngine,
      storageV5: params.storageV5,
    });
    return;
  }
  let { guard, isExternalLoading } = turn;
  let submitBlocked = false;
  let input = params.input ?? "";
  let mode = params.mode ?? "prompt";
  let pastedContents = params.pastedContents ?? {};
  let submissionUuid = uuid ?? randomUUID();
  let referencedIds = new Set(parsePastedRefs(input).map((ref) => ref.id));
  let usablePastes = pickByHelper(
    pastedContents,
    (entry) => entry.type !== "image" || referencedIds.has(entry.id),
  );
  let hasImages = Object.values(usablePastes).some(isNonEmptyImageAttachment);
  if (input.trim() === "") return;
  if (mode !== "bash" && !skipSlashCommands && EXIT_COMMAND_WORDS.includes(input.trim())) {
    if (commands.find((cmd) => cmd.name === "exit"))
      handlePromptSubmit({
        ...params,
        input: "/exit",
      });
    else shutdownNow();
    return;
  }
  let { stripped, expanded, removed } = stripPlaceholdersWithOptions(input, usablePastes);
  if (removed.length > 0) {
    params.addNotification?.({
      key: "pasted-text-unavailable",
      kind: "feedback",
      text: describeRemovedPastes(removed),
      priority: "immediate",
    });
    if (stripped.trim() === "" || mode === "bash" || input.trimStart().startsWith("/")) {
      if (!guard.isActive && !isExternalLoading && !submitBlocked) {
        if ((params.getCurrentInput?.() ?? "").trim() === "") {
          onInputChange(input);
          setCursorOffset(input.length);
          setPastedContents(pastedContents);
          params.onPromptHandedBack(submissionUuid, undefined);
          params.onSubmitCancelRewind?.();
        }
        turn.stream.setUserInputOnProcessing(undefined);
      }
      return;
    }
  }
  recordStylePoolAtlas();
  let losesSlashPrefix = !input.trimStart().startsWith("/") && expanded.trimStart().startsWith("/");
  let shouldSkipSlash = skipSlashCommands || losesSlashPrefix;
  let pastedTextRefs = parsePastedRefs(input).filter(
    (ref) => usablePastes[ref.id]?.type === "text" && !usablePastes[ref.id]?.unavailable,
  );
  let pastedTextCount = pastedTextRefs.length;
  let pastedTextBytes = pastedTextRefs.reduce(
    (sum, pastedTextRef) => sum + (usablePastes[pastedTextRef.id]?.content.length ?? 0),
    0,
  );
  logEvent("tengu_paste_text", {
    pastedTextCount,
    pastedTextBytes,
  });
  if (!shouldSkipSlash && expanded.trim().startsWith("/")) {
    let trimmedInput = expanded.trim();
    let { name: commandName, args } = splitSlashCommandInput(trimmedInput);
    let command = findCommand(commandName, commands);
    let enabledCommand = command && isCommandEnabled(command) ? command : undefined;
    let immediateCommand =
      enabledCommand && isImmediateCommand(enabledCommand, args, presentation) ? enabledCommand : undefined;
    if (
      immediateCommand &&
      (immediateCommand.type === "local-jsx" || immediateCommand.type === "local") &&
      (guard.isActive || isExternalLoading || submitBlocked)
    ) {
      if (isSlashCommandBlockedByEndedByModel(immediateCommand, getAppState().endedByModel)) {
        onInputChange("");
        setCursorOffset(0);
        params.addNotification?.({
          key: "immediate-ended-by-model",
          kind: "feedback",
          text: withTaskSuffix(
            "Claude ended this conversation. Start a new session (or /clear) to continue.",
          ),
          priority: "immediate",
        });
        return;
      }
      if (immediateCommand.type === "local") {
        params.onSubmitProceed?.();
        let ranAs = createPromptHistoryWriter({
          entry: params.historyEntry,
          name: commandName,
          typed: args,
          write: (entry) => addHistoryEntryNoUndo(entry, params.storageV5, mode),
        });
        logEvent("tengu_immediate_command_executed", {
          commandName: shippedCommandNameForAnalytics(immediateCommand.name),
        });
        onInputChange("");
        setCursorOffset(0);
        setPastedContents({});
        clearBuffer();
        let poseRun = bumpClawdPoseRun();
        try {
          await runLocalCommandFromRepl({
            command: immediateCommand,
            commandName,
            args,
            context: {
              ...turn.buildToolUseContext(messages, [], createAbortController(), mainLoopModel),
              isMidTurn: true,
              dispatchedAsImmediate: true,
            },
            printRows: turn.appendAfterTurn,
            ranAs,
          });
        } finally {
          releaseKeptPoseIfStale(poseRun);
        }
        return;
      }
      let commandDialog = resolveCommandDialog(immediateCommand);
      if (!commandDialog) {
        logFeatureBad(cmdFeature(immediateCommand.name), "cmd_local_jsx_no_dialog_resolution");
        params.addNotification?.({
          key: `immediate-${immediateCommand.name}`,
          kind: "feedback",
          text: commandUnavailableMessage(immediateCommand),
          priority: "immediate",
        });
        return;
      }
      params.onSubmitProceed?.();
      let promptHistoryWriter = createPromptHistoryWriter({
        entry: params.historyEntry,
        name: commandName,
        typed: args,
        write: (cmd) => addHistoryEntryNoUndo(cmd, params.storageV5, mode),
      });
      logEvent("tengu_immediate_command_executed", {
        commandName: shippedCommandNameForAnalytics(immediateCommand.name),
      });
      onInputChange("");
      setCursorOffset(0);
      setPastedContents({});
      clearBuffer();
      let toolUseContext = turn.buildToolUseContext(messages, [], createAbortController(), mainLoopModel);
      let localJsx = toolUseContext.localJsx;
      if (!localJsx) {
        logFeatureBad(cmdFeature(immediateCommand.name), "cmd_local_jsx_no_panel_host");
        params.addNotification?.({
          key: `immediate-${immediateCommand.name}`,
          kind: "feedback",
          text: commandUnavailableMessage(immediateCommand),
          priority: "immediate",
        });
        return;
      }
      let panelDone = false;
      let panel;
      let onDone = (result, options) => {
        panelDone = true;
        panel?.close();
        if (result && options?.display !== "skip" && params.addNotification)
          params.addNotification({
            key: `immediate-${immediateCommand.name}`,
            kind: "feedback",
            text: boldDirectMemberMessage(result),
            priority: "immediate",
          });
        let metaMessages = options?.metaMessages ?? [];
        turn.appendAfterTurn(
          metaMessages.map((content) =>
            createUserMessage({
              content,
              isMeta: true,
              origin: options?.metaMessagesOrigin,
            }),
          ),
        );
        if (options?.nextInput)
          if (options.submitNextInput)
            queue.enqueue({
              agentId: mainAgentId(),
              value: options.nextInput,
              mode: "prompt",
              origin: {
                kind: "auto-continuation",
              },
            });
          else if (params.replaceDraftWithNextInput) params.replaceDraftWithNextInput(options.nextInput);
          else onInputChange(options.nextInput);
      };
      let poseRun = bumpClawdPoseRun();
      let hookRun = await dispatchCommandRunHooks({
        input: commandRunEvent(immediateCommand, args, presentation),
        engine: {
          run: async (hookRunInput) => {
            promptHistoryWriter(hookRunInput);
            return (await commandDialog()).call(
              onDone,
              {
                ...toolUseContext,
                isMidTurn: true,
                dispatchedAsImmediate: true,
                appendAfterTurn: turn.appendAfterTurn,
                ...(isFrozenMarker(params.composerEnter) && {
                  submissionOrigin: {
                    kind: "human",
                  },
                }),
              },
              hookRunInput,
              commandName,
            );
          },
          textOf: () => {
            return;
          },
          contextOf: () => {
            return;
          },
          retell: () => {
            return;
          },
        },
        queued: undefined,
      }).finally(() => releaseKeptPoseIfStale(poseRun));
      logFeatureOk(cmdFeature(immediateCommand.name), getTipAttribution(immediateCommand.name));
      if (hookRun.kind === "answered") {
        if (hasSingleCommandRunHook(getCommandName(immediateCommand))) promptHistoryWriter(args);
        onDone(
          hookRun.text,
          hookRun.context === undefined
            ? undefined
            : {
                metaMessages: [...hookRun.context],
              },
        );
        return;
      }
      let ran = hookRun.ran;
      if (ran && !panelDone)
        panel = localJsx.show(ran, {
          commandName: getCommandName(immediateCommand),
          immediate: true,
          hidesPrompt: false,
          retireAtTurnBoundary: true,
        });
      return;
    }
  }
  let hasUnavailablePastes =
    shouldSkipSlash &&
    params.inputSource !== "suggestion_accepted" &&
    parsePastedRefs(input).some((ref) => usablePastes[ref.id] !== undefined);
  let isPromptMode = mode === "prompt" && !(!shouldSkipSlash && expanded.trim().startsWith("/"));
  let fromSuggestion = params.inputSource === "suggestion_accepted";
  let outgoingText =
    isPromptMode &&
    !(isUltraplanEnabled() && flushPromptHistory(input, usablePastes)) &&
    isVirtualPancakeEnabled()
      ? fromSuggestion
        ? escapePastedContentTag(input)
        : stripPlaceholdersWithOptions(input, usablePastes, wrapUserTurnContent, escapePastedContentTag)
            .expanded
      : expanded;
  let textExpanded = !fromSuggestion && outgoingText !== expanded;
  let queuedEntry = {
    agentId: mainAgentId(),
    value: outgoingText,
    submittedAtMs: params.submittedAtMs ?? performance.now(),
    preExpansionValue: params.inputSource === "suggestion_accepted" ? undefined : input,
    mode,
    pastedContents:
      hasImages || hasUnavailablePastes || textExpanded || getInlinePasteTexts(usablePastes, true).length > 0
        ? usablePastes
        : undefined,
    ...(textExpanded && {
      pasteTagged: true,
    }),
    skipSlashCommands: shouldSkipSlash,
    suppressWorkflowKeyword: params.suppressWorkflowKeyword,
    inputSource: params.inputSource,
    uuid: submissionUuid,
    origin: {
      kind: "human",
    },
    composerEnter: params.composerEnter,
    historyEntry: params.historyEntry,
    ...(params.wait === true && {
      wait: true,
    }),
  };
  let shouldRecord = mode === "prompt" && shouldRecordPrompt(input, commands);
  let afterAccept = () => {
    try {
    } catch (error) {
      logError(error);
    }
  };
  let isStaleQuotaResume = () => params.resumesStaleQuotaWait === true && !shouldOfferAutoResumePrompt();
  if (guard.isActive || isExternalLoading || submitBlocked) {
    if (mode !== "prompt" && mode !== "bash") {
      logFeatureBad("prompt_queued", "mode_not_queueable");
      return;
    }
    if (isStaleQuotaResume()) return;
    params.onSubmitProceed?.();
    afterAccept();
    if (params.composerClearedAtEnter !== true) {
      onInputChange("");
      setCursorOffset(0);
      setPastedContents({});
      clearBuffer();
    }
    resetHistory();
    let turnId = currentTurn()?.turnId;
    let drainedByUltraplan =
      isPromptMode &&
      isUltraplanEnabled() &&
      flushPromptHistory(queuedEntry.preExpansionValue ?? expanded.trim(), usablePastes);
    let needsScreening = isPromptMode && !drainedByUltraplan && guard.isRunning && turnId !== undefined;
    let owedScreening =
      isPromptMode && !needsScreening && hasPromptSubmitHooks(turn, messages, mainLoopModel);
    if (shouldRecord) noteHumanTakeover(submissionUuid);
    let ideSelectionForQueue = params.takeIdeSelectionForQueue?.();
    queue.enqueue({
      ...queuedEntry,
      value: outgoingText.trim(),
      preExpansionValue: queuedEntry.preExpansionValue?.trim(),
      ...(ideSelectionForQueue && {
        ideSelection: ideSelectionForQueue,
      }),
      ...(needsScreening && {
        screeningPending: true,
      }),
      ...((drainedByUltraplan || owedScreening) && {
        drainOnly: true,
      }),
      ...(owedScreening && {
        screeningOwed: true,
      }),
    });
    if (!needsScreening) {
      logFeatureOk("prompt_queued");
      return;
    }
    let hookResult = {
      messages: [],
      shouldQuery: true,
    };
    let hooksKey;
    let submitResult;
    let settled = false;
    let settleScreening = (result) => {
      let wasCancelled = result?.wasCancelled === true;
      queue.settleScreening(submissionUuid, {
        promptSubmitted:
          result === undefined || hooksKey === undefined || wasCancelled
            ? undefined
            : result.ended !== undefined
              ? {
                  text: result.text ?? outgoingText.trim(),
                  ...(result.context !== undefined && {
                    context: result.context,
                  }),
                  messages: hookResult.messages,
                  under: hooksKey,
                  stopped: result.stopped,
                }
              : {
                  text: result.proceeds.text,
                  ...(result.proceeds.context !== undefined && {
                    context: result.proceeds.context,
                  }),
                  messages: hookResult.messages,
                  under: hooksKey,
                  ...(result.proceeds.sessionTitle !== undefined && {
                    sessionTitle: result.proceeds.sessionTitle,
                  }),
                },
        drainOnly: result === undefined || wasCancelled || result.ended !== undefined ? true : undefined,
      });
    };
    try {
      let toolUseContext = turn.buildToolUseContext(
        messages,
        [],
        turn.abortController ?? createAbortController(),
        mainLoopModel,
      );
      hooksKey = hooksSnapshotKey(toolUseContext);
      submitResult = await submitPromptWithHooks({
        submission: {
          text: outgoingText.trim(),
          input: outgoingText.trim(),
          pastedContents: queuedEntry.pastedContents,
        },
        origin: queuedEntry.origin,
        bridgeOrigin: queuedEntry.bridgeOrigin,
        mode: queuedEntry.mode,
        turnId,
        shouldWait: params.wait === true,
        context: toolUseContext,
        result: hookResult,
        isStartInput: false,
        promptSource: resolvePromptSource({
          isNonInteractive: toolUseContext.options.isNonInteractiveSession,
          callerSource: params.inputSource ?? "queued",
        }),
        wakeupSource: undefined,
        enter: async (result) => {
          settled = true;
          settleScreening(result);
        },
      });
    } catch (error) {
      if (!isAbortError(error))
        logForDebugging(`prompt.submit at Enter failed, leaving it to the drain: ${errorMessage(error)}`, {
          level: "error",
        });
    }
    if (settled) {
      logFeatureOk("prompt_queued");
      return;
    }
    if (submitResult?.ended !== undefined && submitResult.stopped === undefined) {
      if (
        !queue.settleScreening(submissionUuid, {
          dropped: true,
        })
      ) {
        logForDebugging("prompt.submit at Enter dropped a prompt that had left the queue");
        logFeatureOk("prompt_queued");
        return;
      }
      logFeatureBad("prompt_queued", "dropped_by_hook");
      if (params.restoreHandedBackPrompt) params.restoreHandedBackPrompt(input);
      else {
        onInputChange(appendLine(params.getCurrentInput?.() ?? "", input));
        params.onPromptCameBack?.();
      }
      setPastedContents((currentPastes) => mergeTurnTags(currentPastes, Object.values(pastedContents)));
      if (isQueueFreeOfPrompts(queue, ideSelectionForQueue))
        params.onPromptHandedBack(submissionUuid, ideSelectionForQueue);
      params.addNotification?.({
        key: "prompt-submit-dropped",
        kind: "feedback",
        text: submitResult.ended.resultText ?? "Prompt dropped by a hook",
        priority: "immediate",
        requeueOnPreempt: true,
      });
      return;
    }
    settleScreening(submitResult);
    logFeatureOk("prompt_queued");
    return;
  }
  if (isStaleQuotaResume()) {
    turn.stream.setUserInputOnProcessing(undefined);
    return;
  }
  params.onSubmitProceed?.();
  afterAccept();
  startQueryProfile();
  logFeatureOk("prompt_submit");
  if (shouldRecord)
    noteHumanTakeover(submissionUuid, {
      dispatching: true,
    });
  await executeUserInput({
    inputSource: params.inputSource ?? "typed",
    queuedCommands: [queuedEntry],
    messages,
    mainLoopModel,
    ideSelection,
    querySource: params.querySource,
    commands,
    turn,
    queue,
    getAppState,
    setAppState,
    onBeforeQuery,
    resetHistory,
    canUseTool,
    onInputChange,
    getCurrentInput: params.getCurrentInput,
    restoreHandedBackPrompt: params.restoreHandedBackPrompt,
    onPromptCameBack: params.onPromptCameBack,
    onPromptHandedBack: params.onPromptHandedBack,
    setPastedContents,
    deferSlashToEngine: params.deferSlashToEngine,
    storageV5: params.storageV5,
  });
}
//@ chunk-18hwfzwa.js:1483880-1492425 fingerprint (2.1.88 match: executeUserInput, 0.357)
/**
 * 执行一次用户输入：处理成消息、写入历史与转录，启动查询循环。
 */
async function executeUserInput(params) {
  let {
    messages,
    ideSelection,
    querySource,
    turn,
    getAppState,
    setAppState,
    onBeforeQuery,
    resetHistory,
    canUseTool,
    queuedCommands,
    inputSource,
    storageV5,
    queue,
  } = params;
  let mainLoopModel = params.mainLoopModel;
  let { guard, run } = turn;
  let isQueued = inputSource === "queued";
  function setProcessingInput(value, origin) {
    turn.stream.setUserInputOnProcessing(value, origin, isQueued);
  }
  function handBack(nextInput, { uuid, ideSelection }) {
    if (params.restoreHandedBackPrompt) params.restoreHandedBackPrompt(nextInput);
    else {
      params.onInputChange(appendLine(params.getCurrentInput?.() ?? "", nextInput));
      params.onPromptCameBack?.();
    }
    if (uuid && isQueueFreeOfPrompts(queue, ideSelection)) params.onPromptHandedBack(uuid, ideSelection);
  }
  let composer = {
    land: handBack,
    setPastedContents: params.setPastedContents,
  };
  let abortController = createAbortController();
  turn.setAbortController(abortController);
  let turnClaim = null;
  let turnUuids = (queuedCommands ?? []).flatMap((command) =>
    command.uuid === undefined ? [] : [command.uuid],
  );
  let poseRun = (queuedCommands ?? []).some(isRefillableCommand) ? bumpClawdPoseRun() : undefined;
  let startTime = performance.now();
  let reduced = (queuedCommands ?? []).reduce(
    (acc, command) =>
      command.submittedAtMs === undefined || command.mode !== "prompt"
        ? acc
        : Math.min(acc ?? command.submittedAtMs, command.submittedAtMs),
    undefined,
  );
  let queueTiming =
    reduced === undefined
      ? undefined
      : {
          submittedAtMs: reduced,
          dequeuedAtMs: inputSource === "queued" ? startTime : reduced,
        };
  function makeContext() {
    return {
      ...turn.buildToolUseContext(messages, [], abortController, mainLoopModel),
      deferSlashToEngine: params.deferSlashToEngine,
    };
  }
  let retireables = [];
  let batchHandedOff = false;
  using promptEntryTracker = createPromptEntryTracker();
  let flushHeldMessages;
  let generation = guard.generation;
  let resurrectContext = {
    turn,
    reservedGeneration: generation,
    signal: abortController.signal,
    queue,
    storageV5,
    handBack,
    composer,
    makeContext,
  };
  let heldPrompts = new Set();
  try {
    guard.reserve();
    queryCheckpoint("query_process_user_input_start");
    let batchMessages = [];
    let willQuery = false;
    let promptWasSubmitted = false;
    let allowedTools;
    let skillModel;
    let effort;
    let nextInput;
    let submitNextInput;
    let deferredSlash;
    let workCommands = dropStaleContinuation(queuedCommands ?? []);
    let workload = workCommands[0]?.workload;
    let workloadInfo = {
      workload:
        workload !== undefined && workCommands.every((command) => command.workload === workload)
          ? workload
          : undefined,
      scheduledByPlugin: firstSchedulingPlugin(workCommands),
    };
    let index = workCommands.findIndex(isRefillableCommand);
    let max = Math.max(0, index);
    let hasRefillable = index >= 0;
    let firstWorkload = workCommands[max]?.value;
    let interactionText =
      typeof firstWorkload === "string"
        ? firstWorkload
        : firstWorkload
          ? extractTextContent_2(
              firstWorkload,
              `
`,
            )
          : "";
    let sessionStartHooks = workCommands.some((command) => {
      if (command.mode !== "prompt") return false;
      if (
        typeof command.value !== "string" ||
        command.skipSlashCommands ||
        !command.value.trim().startsWith("/")
      )
        return true;
      let command_2 = findCommand(splitSlashCommandInput(command.value.trim()).name, params.commands);
      return command_2 === undefined || command_2.type === "prompt";
    })
      ? turn.awaitSessionStartHooks(abortController.signal)
      : undefined;
    if (sessionStartHooks) {
      let command = hasRefillable ? workCommands[max] : undefined;
      if (command?.mode === "prompt" && typeof command.value === "string")
        setProcessingInput(command.value, normalizeTaskNotificationOrigin(command.origin));
      try {
        await sessionStartHooks;
      } catch (error) {
        if (!isAbortError(error)) logError(error);
      }
      if (abortController.signal.aborted) {
        resurrectCutCommands({
          ...resurrectContext,
          cut: workCommands.map((command) => ({
            command,
            isWritten: false,
          })),
          stays: [],
          unanswered: "typed",
        });
        return;
      }
      mainLoopModel = getMainLoopModelFromState(getAppState());
    }
    let hooksObserved = isPromptHookObserved();
    let heldSet = new Set(
      (queuedCommands ?? []).filter((command) => {
        let holdPrompt =
          (command.skipSlashCommands !== true &&
          typeof command.value === "string" &&
          command.value.startsWith("/")
            ? findCommand(parseSlashCommand(command.value)?.commandName ?? "", params.commands)
            : undefined) === undefined || hooksObserved;
        return command.mode === "prompt" && holdPrompt;
      }),
    );
    heldPrompts = heldSet;
    recordSubmittedPrompts(
      (queuedCommands ?? []).filter((command) => !heldSet.has(command)),
      storageV5,
      {
        placed: withExpandedPastes,
      },
    );
    await withWorkloadStorage(workloadInfo, () =>
      withInteractionSpan(interactionText, async () => {
        let context = makeContext();
        let localJsx = context.localJsx;
        if (localJsx)
          context.localJsx = {
            show: (jsx, showOptions) => {
              let handle = localJsx.show(jsx, showOptions);
              if (showOptions.retireAtTurnBoundary) retireables.push(handle);
              return handle;
            },
          };
        let snapshottedUuids = new Set();
        if (context.makeFileHistorySnapshot)
          context.makeFileHistorySnapshot = snapshotBatchSiblings({
            baseMakeFileHistorySnapshot: context.makeFileHistorySnapshot,
            batchMessages,
            preSnapshottedSiblings: snapshottedUuids,
            getAppState,
            setAppState,
            storageV5,
          });
        let pendingCommands = [...workCommands];
        let alreadyBatched = new Set();
        let noQueryMessages = new Set();
        let screenedByCommand = new Map();
        using disposePending = disposeDropsWaiting(pendingCommands);
        let bufferedUuids = new Set();
        context.applyMessageOp = createBatchedMessageOp({
          baseApplyMessageOp: context.applyMessageOp,
          batchMessages,
          isBatchHandedOff: () => batchHandedOff,
          buffered: bufferedUuids,
        });
        flushHeldMessages = () => {
          let filtered = batchMessages.filter((message) => bufferedUuids.has(message.uuid));
          if (filtered.length > 0)
            context.applyMessageOp({
              type: "append",
              messages: filtered,
            });
        };
        for (let idx = 0; idx < workCommands.length; idx++) {
          let command = workCommands[idx];
          let isFirst = idx === max;
          let origin = resolveTaskNotificationOrigin(command.origin, command.mode, command.runId);
          let promptSource =
            command.isMeta || !isHumanOrUnset(origin) ? "system" : (command.inputSource ?? inputSource);
          let turnId = ensureTurnId(command.uuid, command.verifiedSlackHumanTurn);
          let processed = await processUserInput({
            input: command.value,
            preExpansionInput: command.preExpansionValue,
            promptSource,
            suppressWorkflowKeyword: command.suppressWorkflowKeyword,
            mode: command.mode,
            context,
            pastedContents: command.pastedContents,
            messages,
            setUserInputOnProcessing: isFirst ? setProcessingInput : undefined,
            onQueryCommitted: () => {
              if (!abortController.signal.aborted) guard.markDispatchForModel(generation);
            },
            isAlreadyProcessing: !isFirst,
            querySource,
            canUseTool,
            uuid: turnId,
            ideSelection: isFirst ? (command.ideSelection ?? ideSelection) : undefined,
            skipSlashCommands: command.skipSlashCommands,
            bridgeOrigin: command.bridgeOrigin,
            modelScheduledOrigin: command.modelScheduledOrigin,
            wakeupSource: command.wakeupSource,
            artifactCommentTurn: command.artifactCommentTurn,
            foreignWord: command.foreignWord,
            scheduledTaskId: command.scheduledTaskId,
            scheduledFireId: command.scheduledFireId,
            toolsUsed: command.toolsUsed,
            isMeta: command.isMeta,
            skipAttachments:
              !isFirst || !hasRefillable || isPassiveOrAttachedCommand(command) ? "all" : undefined,
            origin,
            skipSubmissionHooks: command.skipSubmissionHooks,
            shouldQuery: command.shouldQuery,
            skipSkillPermissionReset: command.pollEmptyDispatch === true,
            verifiedSlackHumanTurn: command.verifiedSlackHumanTurn,
            textNotTyped: command.textNotTyped,
            ownFilePaths: command.ownFilePaths,
            noPersonArrived: command.noPersonArrived,
            composerEnter: command.composerEnter,
            inlinedImagePaths: command.inlinedImagePaths,
            promptSubmitted: command.promptSubmitted,
            onScreened: (screened) =>
              writeHeldHistory({
                cmd: command,
                screened,
                held: heldPrompts,
                storageV5,
                composer,
              }),
            wait: command.wait === true,
            entries: promptEntryTracker,
            interactionPrompt: isFirst ? currentPromptHandle() : undefined,
          }).catch((error) => {
            try {
              for (let idx_2 = workCommands.length - 1; idx_2 >= 0; idx_2--) {
                let command = workCommands[idx_2];
                if (
                  command !== undefined &&
                  idx_2 !== idx &&
                  !alreadyBatched.has(command) &&
                  command.origin?.kind !== "plugin" &&
                  !isReplayableHistoryEntry(command)
                ) {
                  if (idx_2 === max && idx_2 < idx)
                    isNullRenderingAttachment_2(
                      batchMessages.filter((message) => !noQueryMessages.has(message)),
                      context,
                    );
                  queue.enqueueReportingAdmission(
                    {
                      ...command,
                      ...(command.priority === "now" && {
                        priority: "next",
                      }),
                      admissionExempt: "resurrected",
                      screeningOwed: true,
                    },
                    {
                      ahead: true,
                    },
                  );
                }
              }
            } catch (error) {
              if (isAbortError(error))
                logForDebugging(`queueing again after a throw: ${errorMessage(error)}`);
              else logError(error);
            }
            throw error;
          });
          if (processed.noVerdict) {
            let wasHeld = heldPrompts.delete(command);
            if (wasHeld && processed.engineDeferredSlash !== undefined)
              processed.engineDeferredSlash = {
                ...processed.engineDeferredSlash,
                lineScreened: deferredHistoryWrite(command, storageV5),
              };
            else if (wasHeld && processed.wasUnscreenedAtDispatch === true && !isPromptHookObserved())
              recordSubmittedPrompts([command], storageV5, {
                placed: withExpandedPastes,
                screened: new Map([[command, {}]]),
              });
          } else if (!processed.interrupted) {
            let screened = processed.screened ?? {};
            screenedByCommand.set(command, screened);
            writeHeldHistory({
              cmd: command,
              screened,
              held: heldPrompts,
              storageV5,
              composer,
            });
          }
          if (origin) stampMissingOrigin(processed.messages, origin);
          if (command.priority === "later") {
            for (let message of processed.messages)
              if (message.type === "user") message.queuePriority = "later";
          }
          if (
            command.origin?.kind === "task-notification" &&
            (command.origin.source !== undefined || command.origin.slug !== undefined)
          ) {
            for (let message of processed.messages)
              if (message.type === "user") message.queueOrigin = command.origin;
          }
          if (command.origin?.kind === "task-notification" && command.mode === "prompt") {
            for (let message of processed.messages) if (message.type === "user") message.queueMode = "prompt";
          }
          if (command.skipAttachments === true || command.mode === "poll-event")
            markSkipAttachments(processed.messages);
          if (command.textNotTyped === true) markTextNotTyped(processed.messages);
          if (
            isFrozenMarker(command.composerEnter) &&
            command.inputSource !== "suggestion_accepted" &&
            getAutoModeConfigOrDefault().typedMarks === true
          ) {
            for (let message of processed.messages)
              if (message.type === "user" && message.uuid === turnId) {
                message[MESSAGE_MARK_SYMBOLS] = {
                  as: "prompt",
                  texts: getTextBlocks(message.message.content),
                };
                logFeatureOk("typed_marks");
              }
          }
          if (command.shouldQuery === false && command.queryHeldForNextTurn !== true)
            markTranscriptOnly(processed.messages);
          if (command.taskDelivery) attachTaskDelivery(processed.messages, command.taskDelivery, turnId);
          if (command.verifiedSlackHumanTurn && turnId) markVerifiedHumanTurn(processed.messages, turnId);
          if (processed.interrupted || processed.endedUnderAbort) {
            let filtered = batchMessages.filter((message) => !noQueryMessages.has(message));
            isNullRenderingAttachment_2(filtered, context);
            pendingCommands.splice(idx + 1);
            let cut = workCommands.flatMap((command, index) =>
              index > idx ||
              (command.origin?.kind !== "plugin" &&
                (index < idx ? !alreadyBatched.has(command) : !processed.endedUnderAbort))
                ? [
                    {
                      command: {
                        ...command,
                        screeningOwed: true,
                      },
                      isWritten: !heldPrompts.has(command),
                      screened: screenedByCommand.get(command),
                    },
                  ]
                : [],
            );
            heldPrompts.clear();
            resurrectCutCommands({
              ...resurrectContext,
              cut,
              stays: [
                ...batchMessages.filter(
                  (updater) => noQueryMessages.has(updater) || isNullRenderingAttachment(updater),
                ),
                ...(processed.endedUnderAbort
                  ? processed.messages
                  : processed.messages.filter(isNullRenderingAttachment)),
              ],
            });
            return;
          }
          batchMessages.push(...processed.messages);
          if (prependModeCharacterToInput(command) || !processed.shouldQuery) {
            alreadyBatched.add(command);
            for (let message of processed.messages) noQueryMessages.add(message);
          }
          if (processed.engineDeferredSlash) {
            let promptHandle = isFirst ? currentPromptHandle() : undefined;
            deferredSlash =
              promptHandle === undefined
                ? processed.engineDeferredSlash
                : {
                    ...processed.engineDeferredSlash,
                    interactionPrompt: promptHandle,
                  };
          }
          if (isFirst) {
            willQuery = processed.shouldQuery;
            allowedTools = processed.allowedTools;
            skillModel = processed.model;
          }
          effort ??= processed.effort;
          if (command.promptSubmitted !== undefined && !processed.shouldQuery) promptWasSubmitted = true;
          if (processed.nextInput !== undefined)
            if (processed.submitNextInput) {
              if (nextInput === undefined) {
                nextInput = processed.nextInput;
                submitNextInput = true;
              }
            } else handBack(processed.nextInput, command);
        }
        if (promptWasSubmitted) willQuery = false;
        queryCheckpoint("query_process_user_input_end");
        if (fileHistoryEnabled()) {
          queryCheckpoint("query_file_history_snapshot_start");
          batchMessages.filter(isUserTextPrompt).forEach((prev) => {
            if (snapshottedUuids.has(prev.uuid)) return;
            makeFileHistorySnapshot({
              getAppState,
              setAppState,
              messageUuid: prev.uuid,
              storageV5,
            });
          });
          queryCheckpoint("query_file_history_snapshot_end");
        }
        if (batchMessages.length) {
          resetHistory();
          for (let handle of retireables) handle.close();
          let primaryCommand = workCommands[max];
          let mode = primaryCommand?.mode ?? "prompt";
          let primaryValue =
            primaryCommand && typeof primaryCommand.value === "string" ? primaryCommand.value : undefined;
          let recenterPrompt = mode === "prompt" || (mode === "bash" && willQuery);
          let stopHookActive = workCommands.some((command) => command.stopHookActive) ? true : undefined;
          let clientPlatform = primaryCommand?.clientPlatform;
          let attributionKey = turnAttributionKeyOf(workCommands);
          turnClaim = claimTurn({
            turnUuids,
            isHumanTakeover:
              willQuery &&
              (mode === "prompt" || mode === "bash") &&
              primaryCommand !== undefined &&
              isRefillableCommand(primaryCommand),
            humanCommandUuids: workCommands.filter(isRefillableCommand).map((command) => command.uuid),
            willQuery,
          });
          batchHandedOff = true;
          promptEntryTracker.handedOff();
          await run(
            batchMessages,
            abortController,
            willQuery,
            allowedTools ?? [],
            skillModel &&
              isSkillModelOverrideAllowedInMode({
                skillModel,
                mode: getAppState().toolPermissionContext.mode,
                fastMode: getAppState().fastMode ?? false,
              })
              ? resolveSkillModelOverride(skillModel, mainLoopModel)
              : mainLoopModel,
            recenterPrompt ? onBeforeQuery : undefined,
            primaryValue,
            effort,
            stopHookActive,
            clientPlatform,
            context.options?.activeSkill,
            deferredSlash,
            attributionKey,
            queueTiming,
            isQueued,
          );
        } else {
          guard.cancelReservation();
          for (let handle of retireables) handle.close();
          resetHistory();
          turn.setAbortController(null);
          endInteractionSpan();
        }
        if (nextInput && submitNextInput)
          queue.enqueue({
            agentId: mainAgentId(),
            value: nextInput,
            mode: "prompt",
            origin: {
              kind: "auto-continuation",
            },
          });
      }),
    );
  } finally {
    let wasHandedOff = batchHandedOff;
    batchHandedOff = true;
    for (let command of heldPrompts) restoreDroppedInput(command, composer);
    if (!wasHandedOff) flushHeldMessages?.();
    releaseTurnClaim(turnClaim, turnUuids);
    turn.afterTurnEvents(() => releaseKeptPoseIfStale(poseRun));
    if (guard.generation === generation) {
      guard.cancelReservation();
      turn.stream.setUserInputOnProcessing(undefined);
    }
    endInteractionSpan();
    for (let handle of retireables) handle.close();
  }
}
//@ chunk-18hwfzwa.js:1492425-1493685 layout
/**
 * 处理被中断回合里截下的排队命令：保留部分追加回会话；若是用户取消，把纯文本提示交还输入框（含粘贴内容）；回合被替换时未写入的提示改为中断消息加历史记录，其余命令重新排在队首。
 */
function resurrectCutCommands({
  cut,
  stays,
  unanswered,
  turn,
  reservedGeneration,
  signal,
  queue,
  storageV5,
  handBack,
  composer,
  makeContext,
}) {
  let turnReplaced = turn.guard.generation !== reservedGeneration;
  let userCancelled = turnReplaced && unwrapAbortReason(signal.reason) === "user-cancel";
  if (stays.length > 0)
    makeContext().applyMessageOp({
      type: "append",
      messages: [...stays],
    });
  let interruptedPrompts = [];
  let requeued = [];
  for (let cutEntry of cut) {
    let command = cutEntry.command;
    if (userCancelled && isRefillableInput(command) && typeof command.value === "string") {
      handBack(inputDisplayText(command), command);
      let retainedPastedContents = getRetainedPastedContents(command);
      if (retainedPastedContents.length > 0)
        composer.setPastedContents((currentPastes) => mergeTurnTags(currentPastes, retainedPastedContents));
    } else if (turnReplaced && command.mode === "prompt" && isRefillableInput(command))
      interruptedPrompts.push(cutEntry);
    else requeued.push(cutEntry);
  }
  for (let idx = requeued.length - 1; idx >= 0; idx--)
    queue.enqueueReportingAdmission(
      {
        ...requeued[idx].command,
        admissionExempt: "resurrected",
      },
      {
        ahead: true,
      },
    );
  if (interruptedPrompts.length > 0) {
    makeContext().applyMessageOp({
      type: "append",
      messages: [createUserInterruptionMessage({})],
    });
    let pendingScreening = new Set(
      interruptedPrompts.filter(
        ({ command, isWritten }) =>
          !isWritten && isScreeningPendingEntry(command) && isReplayableHistoryEntry(command),
      ),
    );
    let screenedMap = new Map();
    recordSubmittedPrompts(
      interruptedPrompts
        .filter(
          (interruptedPrompt) =>
            !pendingScreening.has(interruptedPrompt) &&
            (!interruptedPrompt.isWritten || !interruptedPrompt.command.historyEntry),
        )
        .map(({ command, screened }) => {
          let display = inputDisplayText(command);
          if (command.historyEntry) return command;
          let pastedContents = {
            ...(command.pastedContents ?? {}),
          };
          for (let image of extractImagesFromValue(command.value, Date.now()))
            pastedContents[image.id] = image;
          let command_2 = {
            ...command,
            historyEntry: {
              display,
              pastedContents,
            },
          };
          if (screened) screenedMap.set(command_2, screened);
          return command_2;
        }),
      storageV5,
      {
        armUndo: false,
        placed: withExpandedPastes,
        unanswered,
        screened: screenedMap,
      },
    );
    for (let { command } of pendingScreening) restoreDroppedInput(command, composer);
  }
  if (!turnReplaced) turn.setAbortController(null);
}
//@ chunk-18hwfzwa.js:1493685-1493732 placement (2.1.88 match: prependModeCharacterToInput, 1)
function prependModeCharacterToInput(command) {
  return command.mode === "bash" || isSlashCommand_2(command);
}
export { EXIT_COMMAND_WORDS, handlePromptSubmit };
