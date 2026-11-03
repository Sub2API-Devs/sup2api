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

//@ chunk-18hwfzwa.js:1475438-1483880 fingerprint = handlePromptSubmit (0.391)
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
  let so = false;
  let input = params.input ?? "";
  let mode = params.mode ?? "prompt";
  let pastedContents = params.pastedContents ?? {};
  let bo = uuid ?? randomUUID();
  let referencedIds = new Set(parsePastedRefs(input).map((on) => on.id));
  let Bo = pickByHelper(pastedContents, (on) => on.type !== "image" || referencedIds.has(on.id));
  let hasImages = Object.values(Bo).some(isNonEmptyImageAttachment);
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
  let { stripped, expanded, removed } = stripPlaceholdersWithOptions(input, Bo);
  if (removed.length > 0) {
    params.addNotification?.({
      key: "pasted-text-unavailable",
      kind: "feedback",
      text: describeRemovedPastes(removed),
      priority: "immediate",
    });
    if (stripped.trim() === "" || mode === "bash" || input.trimStart().startsWith("/")) {
      if (!guard.isActive && !isExternalLoading && !so) {
        if ((params.getCurrentInput?.() ?? "").trim() === "") {
          onInputChange(input);
          setCursorOffset(input.length);
          setPastedContents(pastedContents);
          params.onPromptHandedBack(bo, undefined);
          params.onSubmitCancelRewind?.();
        }
        turn.stream.setUserInputOnProcessing(undefined);
      }
      return;
    }
  }
  recordStylePoolAtlas();
  let mn = !input.trimStart().startsWith("/") && expanded.trimStart().startsWith("/");
  let Cn = skipSlashCommands || mn;
  let pastedTextRefs = parsePastedRefs(input).filter(
    (on) => Bo[on.id]?.type === "text" && !Bo[on.id]?.unavailable,
  );
  let pastedTextCount = pastedTextRefs.length;
  let pastedTextBytes = pastedTextRefs.reduce(
    (sum, pastedTextRef) => sum + (Bo[pastedTextRef.id]?.content.length ?? 0),
    0,
  );
  logEvent("tengu_paste_text", {
    pastedTextCount,
    pastedTextBytes,
  });
  if (!Cn && expanded.trim().startsWith("/")) {
    let trimmedInput = expanded.trim();
    let { name: _o, args } = splitSlashCommandInput(trimmedInput);
    let command = findCommand(_o, commands);
    let wn = command && isCommandEnabled(command) ? command : undefined;
    let mr = wn && isImmediateCommand(wn, args, presentation) ? wn : undefined;
    if (
      mr &&
      (mr.type === "local-jsx" || mr.type === "local") &&
      (guard.isActive || isExternalLoading || so)
    ) {
      if (isSlashCommandBlockedByEndedByModel(mr, getAppState().endedByModel)) {
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
      if (mr.type === "local") {
        params.onSubmitProceed?.();
        let ranAs = createPromptHistoryWriter({
          entry: params.historyEntry,
          name: _o,
          typed: args,
          write: (ts) => addHistoryEntryNoUndo(ts, params.storageV5, mode),
        });
        logEvent("tengu_immediate_command_executed", {
          commandName: shippedCommandNameForAnalytics(mr.name),
        });
        onInputChange("");
        setCursorOffset(0);
        setPastedContents({});
        clearBuffer();
        let Pr = bumpClawdPoseRun();
        try {
          await runLocalCommandFromRepl({
            command: mr,
            commandName: _o,
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
          releaseKeptPoseIfStale(Pr);
        }
        return;
      }
      let commandDialog = resolveCommandDialog(mr);
      if (!commandDialog) {
        logFeatureBad(cmdFeature(mr.name), "cmd_local_jsx_no_dialog_resolution");
        params.addNotification?.({
          key: `immediate-${mr.name}`,
          kind: "feedback",
          text: commandUnavailableMessage(mr),
          priority: "immediate",
        });
        return;
      }
      params.onSubmitProceed?.();
      let promptHistoryWriter = createPromptHistoryWriter({
        entry: params.historyEntry,
        name: _o,
        typed: args,
        write: (cmd) => addHistoryEntryNoUndo(cmd, params.storageV5, mode),
      });
      logEvent("tengu_immediate_command_executed", {
        commandName: shippedCommandNameForAnalytics(mr.name),
      });
      onInputChange("");
      setCursorOffset(0);
      setPastedContents({});
      clearBuffer();
      let toolUseContext = turn.buildToolUseContext(messages, [], createAbortController(), mainLoopModel);
      let localJsx = toolUseContext.localJsx;
      if (!localJsx) {
        logFeatureBad(cmdFeature(mr.name), "cmd_local_jsx_no_panel_host");
        params.addNotification?.({
          key: `immediate-${mr.name}`,
          kind: "feedback",
          text: commandUnavailableMessage(mr),
          priority: "immediate",
        });
        return;
      }
      let Un = false;
      let dr;
      let onDone = (result, options) => {
        Un = true;
        dr?.close();
        if (result && options?.display !== "skip" && params.addNotification)
          params.addNotification({
            key: `immediate-${mr.name}`,
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
      let pr = bumpClawdPoseRun();
      let Qn = await dispatchCommandRunHooks({
        input: commandRunEvent(mr, args, presentation),
        engine: {
          run: async (Ir) => {
            promptHistoryWriter(Ir);
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
              Ir,
              _o,
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
      }).finally(() => releaseKeptPoseIfStale(pr));
      logFeatureOk(cmdFeature(mr.name), getTipAttribution(mr.name));
      if (Qn.kind === "answered") {
        if (hasSingleCommandRunHook(getCommandName(mr))) promptHistoryWriter(args);
        onDone(
          Qn.text,
          Qn.context === undefined
            ? undefined
            : {
                metaMessages: [...Qn.context],
              },
        );
        return;
      }
      let ran = Qn.ran;
      if (ran && !Un)
        dr = localJsx.show(ran, {
          commandName: getCommandName(mr),
          immediate: true,
          hidesPrompt: false,
          retireAtTurnBoundary: true,
        });
      return;
    }
  }
  let kn =
    Cn &&
    params.inputSource !== "suggestion_accepted" &&
    parsePastedRefs(input).some((on) => Bo[on.id] !== undefined);
  let Fn = mode === "prompt" && !(!Cn && expanded.trim().startsWith("/"));
  let bn = params.inputSource === "suggestion_accepted";
  let Go =
    Fn && !(isUltraplanEnabled() && flushPromptHistory(input, Bo)) && isVirtualPancakeEnabled()
      ? bn
        ? escapePastedContentTag(input)
        : stripPlaceholdersWithOptions(input, Bo, wrapUserTurnContent, escapePastedContentTag).expanded
      : expanded;
  let hn = !bn && Go !== expanded;
  let Mn = {
    agentId: mainAgentId(),
    value: Go,
    submittedAtMs: params.submittedAtMs ?? performance.now(),
    preExpansionValue: params.inputSource === "suggestion_accepted" ? undefined : input,
    mode,
    pastedContents: hasImages || kn || hn || getInlinePasteTexts(Bo, true).length > 0 ? Bo : undefined,
    ...(hn && {
      pasteTagged: true,
    }),
    skipSlashCommands: Cn,
    suppressWorkflowKeyword: params.suppressWorkflowKeyword,
    inputSource: params.inputSource,
    uuid: bo,
    origin: {
      kind: "human",
    },
    composerEnter: params.composerEnter,
    historyEntry: params.historyEntry,
    ...(params.wait === true && {
      wait: true,
    }),
  };
  let Xo = mode === "prompt" && shouldRecordPrompt(input, commands);
  let Sn = () => {
    try {
    } catch (error) {
      logError(error);
    }
  };
  let $n = () => params.resumesStaleQuotaWait === true && !shouldOfferAutoResumePrompt();
  if (guard.isActive || isExternalLoading || so) {
    if (mode !== "prompt" && mode !== "bash") {
      logFeatureBad("prompt_queued", "mode_not_queueable");
      return;
    }
    if ($n()) return;
    params.onSubmitProceed?.();
    Sn();
    if (params.composerClearedAtEnter !== true) {
      onInputChange("");
      setCursorOffset(0);
      setPastedContents({});
      clearBuffer();
    }
    resetHistory();
    let turnId = currentTurn()?.turnId;
    let _o = Fn && isUltraplanEnabled() && flushPromptHistory(Mn.preExpansionValue ?? expanded.trim(), Bo);
    let cn = Fn && !_o && guard.isRunning && turnId !== undefined;
    let Dn = Fn && !cn && hasPromptSubmitHooks(turn, messages, mainLoopModel);
    if (Xo) noteHumanTakeover(bo);
    let wn = params.takeIdeSelectionForQueue?.();
    queue.enqueue({
      ...Mn,
      value: Go.trim(),
      preExpansionValue: Mn.preExpansionValue?.trim(),
      ...(wn && {
        ideSelection: wn,
      }),
      ...(cn && {
        screeningPending: true,
      }),
      ...((_o || Dn) && {
        drainOnly: true,
      }),
      ...(Dn && {
        screeningOwed: true,
      }),
    });
    if (!cn) {
      logFeatureOk("prompt_queued");
      return;
    }
    let mr = {
      messages: [],
      shouldQuery: true,
    };
    let Kn;
    let Wn;
    let Fr = false;
    let Zn = (Un) => {
      let dr = Un?.wasCancelled === true;
      queue.settleScreening(bo, {
        promptSubmitted:
          Un === undefined || Kn === undefined || dr
            ? undefined
            : Un.ended !== undefined
              ? {
                  text: Un.text ?? Go.trim(),
                  ...(Un.context !== undefined && {
                    context: Un.context,
                  }),
                  messages: mr.messages,
                  under: Kn,
                  stopped: Un.stopped,
                }
              : {
                  text: Un.proceeds.text,
                  ...(Un.proceeds.context !== undefined && {
                    context: Un.proceeds.context,
                  }),
                  messages: mr.messages,
                  under: Kn,
                  ...(Un.proceeds.sessionTitle !== undefined && {
                    sessionTitle: Un.proceeds.sessionTitle,
                  }),
                },
        drainOnly: Un === undefined || dr || Un.ended !== undefined ? true : undefined,
      });
    };
    try {
      let toolUseContext = turn.buildToolUseContext(
        messages,
        [],
        turn.abortController ?? createAbortController(),
        mainLoopModel,
      );
      Kn = hooksSnapshotKey(toolUseContext);
      Wn = await submitPromptWithHooks({
        submission: {
          text: Go.trim(),
          input: Go.trim(),
          pastedContents: Mn.pastedContents,
        },
        origin: Mn.origin,
        bridgeOrigin: Mn.bridgeOrigin,
        mode: Mn.mode,
        turnId,
        shouldWait: params.wait === true,
        context: toolUseContext,
        result: mr,
        isStartInput: false,
        promptSource: resolvePromptSource({
          isNonInteractive: toolUseContext.options.isNonInteractiveSession,
          callerSource: params.inputSource ?? "queued",
        }),
        wakeupSource: undefined,
        enter: async (dr) => {
          Fr = true;
          Zn(dr);
        },
      });
    } catch (error) {
      if (!isAbortError(error))
        logForDebugging(`prompt.submit at Enter failed, leaving it to the drain: ${errorMessage(error)}`, {
          level: "error",
        });
    }
    if (Fr) {
      logFeatureOk("prompt_queued");
      return;
    }
    if (Wn?.ended !== undefined && Wn.stopped === undefined) {
      if (
        !queue.settleScreening(bo, {
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
      setPastedContents((Un) => mergeTurnTags(Un, Object.values(pastedContents)));
      if (isQueueFreeOfPrompts(queue, wn)) params.onPromptHandedBack(bo, wn);
      params.addNotification?.({
        key: "prompt-submit-dropped",
        kind: "feedback",
        text: Wn.ended.resultText ?? "Prompt dropped by a hook",
        priority: "immediate",
        requeueOnPreempt: true,
      });
      return;
    }
    Zn(Wn);
    logFeatureOk("prompt_queued");
    return;
  }
  if ($n()) {
    turn.stream.setUserInputOnProcessing(undefined);
    return;
  }
  params.onSubmitProceed?.();
  Sn();
  startQueryProfile();
  logFeatureOk("prompt_submit");
  if (Xo)
    noteHumanTakeover(bo, {
      dispatching: true,
    });
  await executeUserInput({
    inputSource: params.inputSource ?? "typed",
    queuedCommands: [Mn],
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
//@ chunk-18hwfzwa.js:1483880-1492425 fingerprint = executeUserInput (0.357)
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
  let Et = inputSource === "queued";
  function Dt(No, vo) {
    turn.stream.setUserInputOnProcessing(No, vo, Et);
  }
  function Lt(nextInput, { uuid, ideSelection }) {
    if (params.restoreHandedBackPrompt) params.restoreHandedBackPrompt(nextInput);
    else {
      params.onInputChange(appendLine(params.getCurrentInput?.() ?? "", nextInput));
      params.onPromptCameBack?.();
    }
    if (uuid && isQueueFreeOfPrompts(queue, ideSelection)) params.onPromptHandedBack(uuid, ideSelection);
  }
  let oo = {
    land: Lt,
    setPastedContents: params.setPastedContents,
  };
  let abortController = createAbortController();
  turn.setAbortController(abortController);
  let io = null;
  let flattened = (queuedCommands ?? []).flatMap((No) => (No.uuid === undefined ? [] : [No.uuid]));
  let po = (queuedCommands ?? []).some(isRefillableCommand) ? bumpClawdPoseRun() : undefined;
  let startTime = performance.now();
  let reduced = (queuedCommands ?? []).reduce(
    (acc, vo) =>
      vo.submittedAtMs === undefined || vo.mode !== "prompt"
        ? acc
        : Math.min(acc ?? vo.submittedAtMs, vo.submittedAtMs),
    undefined,
  );
  let bo =
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
  let Bo = [];
  let Ro = false;
  using promptEntryTracker = createPromptEntryTracker();
  let Io;
  let generation = guard.generation;
  let mn = {
    turn,
    reservedGeneration: generation,
    signal: abortController.signal,
    queue,
    storageV5,
    handBack: Lt,
    composer: oo,
    makeContext,
  };
  let Cn = new Set();
  try {
    guard.reserve();
    queryCheckpoint("query_process_user_input_start");
    let No = [];
    let vo = false;
    let Yo = false;
    let kn;
    let Fn;
    let bn;
    let Go;
    let hn;
    let Mn;
    let Xo = dropStaleContinuation(queuedCommands ?? []);
    let workload = Xo[0]?.workload;
    let on = {
      workload: workload !== undefined && Xo.every((Un) => Un.workload === workload) ? workload : undefined,
      scheduledByPlugin: firstSchedulingPlugin(Xo),
    };
    let index = Xo.findIndex(isRefillableCommand);
    let max = Math.max(0, index);
    let Dn = index >= 0;
    let firstWorkload = Xo[max]?.value;
    let mr =
      typeof firstWorkload === "string"
        ? firstWorkload
        : firstWorkload
          ? extractTextContent_2(
              firstWorkload,
              `
`,
            )
          : "";
    let Wn = Xo.some((Un) => {
      if (Un.mode !== "prompt") return false;
      if (typeof Un.value !== "string" || Un.skipSlashCommands || !Un.value.trim().startsWith("/"))
        return true;
      let command = findCommand(splitSlashCommandInput(Un.value.trim()).name, params.commands);
      return command === undefined || command.type === "prompt";
    })
      ? turn.awaitSessionStartHooks(abortController.signal)
      : undefined;
    if (Wn) {
      let Un = Dn ? Xo[max] : undefined;
      if (Un?.mode === "prompt" && typeof Un.value === "string")
        Dt(Un.value, normalizeTaskNotificationOrigin(Un.origin));
      try {
        await Wn;
      } catch (error) {
        if (!isAbortError(error)) logError(error);
      }
      if (abortController.signal.aborted) {
        resurrectCutCommands({
          ...mn,
          cut: Xo.map((command) => ({
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
    let Fr = isPromptHookObserved();
    let Zn = new Set(
      (queuedCommands ?? []).filter((Un) => {
        let or =
          (Un.skipSlashCommands !== true && typeof Un.value === "string" && Un.value.startsWith("/")
            ? findCommand(parseSlashCommand(Un.value)?.commandName ?? "", params.commands)
            : undefined) === undefined || Fr;
        return Un.mode === "prompt" && or;
      }),
    );
    Cn = Zn;
    recordSubmittedPrompts(
      (queuedCommands ?? []).filter((Un) => !Zn.has(Un)),
      storageV5,
      {
        placed: withExpandedPastes,
      },
    );
    await withWorkloadStorage(on, () =>
      withInteractionSpan(mr, async () => {
        let context = makeContext();
        let localJsx = context.localJsx;
        if (localJsx)
          context.localJsx = {
            show: (Gn, Ur) => {
              let Zr = localJsx.show(Gn, Ur);
              if (Ur.retireAtTurnBoundary) Bo.push(Zr);
              return Zr;
            },
          };
        let or = new Set();
        if (context.makeFileHistorySnapshot)
          context.makeFileHistorySnapshot = snapshotBatchSiblings({
            baseMakeFileHistorySnapshot: context.makeFileHistorySnapshot,
            batchMessages: No,
            preSnapshottedSiblings: or,
            getAppState,
            setAppState,
            storageV5,
          });
        let pr = [...Xo];
        let Qn = new Set();
        let ur = new Set();
        let Ir = new Map();
        using Pr = disposeDropsWaiting(pr);
        let ts = new Set();
        context.applyMessageOp = createBatchedMessageOp({
          baseApplyMessageOp: context.applyMessageOp,
          batchMessages: No,
          isBatchHandedOff: () => Ro,
          buffered: ts,
        });
        Io = () => {
          let filtered = No.filter((Ur) => ts.has(Ur.uuid));
          if (filtered.length > 0)
            context.applyMessageOp({
              type: "append",
              messages: filtered,
            });
        };
        for (let idx = 0; idx < Xo.length; idx++) {
          let Ur = Xo[idx];
          let Zr = idx === max;
          let taskNotificationOrigin = resolveTaskNotificationOrigin(Ur.origin, Ur.mode, Ur.runId);
          let promptSource =
            Ur.isMeta || !isHumanOrUnset(taskNotificationOrigin) ? "system" : (Ur.inputSource ?? inputSource);
          let turnId = ensureTurnId(Ur.uuid, Ur.verifiedSlackHumanTurn);
          let fr = await processUserInput({
            input: Ur.value,
            preExpansionInput: Ur.preExpansionValue,
            promptSource,
            suppressWorkflowKeyword: Ur.suppressWorkflowKeyword,
            mode: Ur.mode,
            context,
            pastedContents: Ur.pastedContents,
            messages,
            setUserInputOnProcessing: Zr ? Dt : undefined,
            onQueryCommitted: () => {
              if (!abortController.signal.aborted) guard.markDispatchForModel(generation);
            },
            isAlreadyProcessing: !Zr,
            querySource,
            canUseTool,
            uuid: turnId,
            ideSelection: Zr ? (Ur.ideSelection ?? ideSelection) : undefined,
            skipSlashCommands: Ur.skipSlashCommands,
            bridgeOrigin: Ur.bridgeOrigin,
            modelScheduledOrigin: Ur.modelScheduledOrigin,
            wakeupSource: Ur.wakeupSource,
            artifactCommentTurn: Ur.artifactCommentTurn,
            foreignWord: Ur.foreignWord,
            scheduledTaskId: Ur.scheduledTaskId,
            scheduledFireId: Ur.scheduledFireId,
            toolsUsed: Ur.toolsUsed,
            isMeta: Ur.isMeta,
            skipAttachments: !Zr || !Dn || isPassiveOrAttachedCommand(Ur) ? "all" : undefined,
            origin: taskNotificationOrigin,
            skipSubmissionHooks: Ur.skipSubmissionHooks,
            shouldQuery: Ur.shouldQuery,
            skipSkillPermissionReset: Ur.pollEmptyDispatch === true,
            verifiedSlackHumanTurn: Ur.verifiedSlackHumanTurn,
            textNotTyped: Ur.textNotTyped,
            ownFilePaths: Ur.ownFilePaths,
            noPersonArrived: Ur.noPersonArrived,
            composerEnter: Ur.composerEnter,
            inlinedImagePaths: Ur.inlinedImagePaths,
            promptSubmitted: Ur.promptSubmitted,
            onScreened: (screened) =>
              writeHeldHistory({
                cmd: Ur,
                screened,
                held: Cn,
                storageV5,
                composer: oo,
              }),
            wait: Ur.wait === true,
            entries: promptEntryTracker,
            interactionPrompt: Zr ? currentPromptHandle() : undefined,
          }).catch((error) => {
            try {
              for (let idx_2 = Xo.length - 1; idx_2 >= 0; idx_2--) {
                let Er = Xo[idx_2];
                if (
                  Er !== undefined &&
                  idx_2 !== idx &&
                  !Qn.has(Er) &&
                  Er.origin?.kind !== "plugin" &&
                  !isReplayableHistoryEntry(Er)
                ) {
                  if (idx_2 === max && idx_2 < idx)
                    isNullRenderingAttachment_2(
                      No.filter((Vr) => !ur.has(Vr)),
                      context,
                    );
                  queue.enqueueReportingAdmission(
                    {
                      ...Er,
                      ...(Er.priority === "now" && {
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
          if (fr.noVerdict) {
            let $r = Cn.delete(Ur);
            if ($r && fr.engineDeferredSlash !== undefined)
              fr.engineDeferredSlash = {
                ...fr.engineDeferredSlash,
                lineScreened: deferredHistoryWrite(Ur, storageV5),
              };
            else if ($r && fr.wasUnscreenedAtDispatch === true && !isPromptHookObserved())
              recordSubmittedPrompts([Ur], storageV5, {
                placed: withExpandedPastes,
                screened: new Map([[Ur, {}]]),
              });
          } else if (!fr.interrupted) {
            let screened = fr.screened ?? {};
            Ir.set(Ur, screened);
            writeHeldHistory({
              cmd: Ur,
              screened,
              held: Cn,
              storageV5,
              composer: oo,
            });
          }
          if (taskNotificationOrigin) stampMissingOrigin(fr.messages, taskNotificationOrigin);
          if (Ur.priority === "later") {
            for (let message of fr.messages) if (message.type === "user") message.queuePriority = "later";
          }
          if (
            Ur.origin?.kind === "task-notification" &&
            (Ur.origin.source !== undefined || Ur.origin.slug !== undefined)
          ) {
            for (let message of fr.messages) if (message.type === "user") message.queueOrigin = Ur.origin;
          }
          if (Ur.origin?.kind === "task-notification" && Ur.mode === "prompt") {
            for (let message of fr.messages) if (message.type === "user") message.queueMode = "prompt";
          }
          if (Ur.skipAttachments === true || Ur.mode === "poll-event") markSkipAttachments(fr.messages);
          if (Ur.textNotTyped === true) markTextNotTyped(fr.messages);
          if (
            isFrozenMarker(Ur.composerEnter) &&
            Ur.inputSource !== "suggestion_accepted" &&
            getAutoModeConfigOrDefault().typedMarks === true
          ) {
            for (let message of fr.messages)
              if (message.type === "user" && message.uuid === turnId) {
                message[MESSAGE_MARK_SYMBOLS] = {
                  as: "prompt",
                  texts: getTextBlocks(message.message.content),
                };
                logFeatureOk("typed_marks");
              }
          }
          if (Ur.shouldQuery === false && Ur.queryHeldForNextTurn !== true) markTranscriptOnly(fr.messages);
          if (Ur.taskDelivery) attachTaskDelivery(fr.messages, Ur.taskDelivery, turnId);
          if (Ur.verifiedSlackHumanTurn && turnId) markVerifiedHumanTurn(fr.messages, turnId);
          if (fr.interrupted || fr.endedUnderAbort) {
            let filtered = No.filter((message) => !ur.has(message));
            isNullRenderingAttachment_2(filtered, context);
            pr.splice(idx + 1);
            let cut = Xo.flatMap((Er, Vr) =>
              Vr > idx || (Er.origin?.kind !== "plugin" && (Vr < idx ? !Qn.has(Er) : !fr.endedUnderAbort))
                ? [
                    {
                      command: {
                        ...Er,
                        screeningOwed: true,
                      },
                      isWritten: !Cn.has(Er),
                      screened: Ir.get(Er),
                    },
                  ]
                : [],
            );
            Cn.clear();
            resurrectCutCommands({
              ...mn,
              cut,
              stays: [
                ...No.filter((updater) => ur.has(updater) || isNullRenderingAttachment(updater)),
                ...(fr.endedUnderAbort ? fr.messages : fr.messages.filter(isNullRenderingAttachment)),
              ],
            });
            return;
          }
          No.push(...fr.messages);
          if (prependModeCharacterToInput(Ur) || !fr.shouldQuery) {
            Qn.add(Ur);
            for (let message of fr.messages) ur.add(message);
          }
          if (fr.engineDeferredSlash) {
            let $r = Zr ? currentPromptHandle() : undefined;
            Mn =
              $r === undefined
                ? fr.engineDeferredSlash
                : {
                    ...fr.engineDeferredSlash,
                    interactionPrompt: $r,
                  };
          }
          if (Zr) {
            vo = fr.shouldQuery;
            kn = fr.allowedTools;
            Fn = fr.model;
          }
          bn ??= fr.effort;
          if (Ur.promptSubmitted !== undefined && !fr.shouldQuery) Yo = true;
          if (fr.nextInput !== undefined)
            if (fr.submitNextInput) {
              if (Go === undefined) {
                Go = fr.nextInput;
                hn = true;
              }
            } else Lt(fr.nextInput, Ur);
        }
        if (Yo) vo = false;
        queryCheckpoint("query_process_user_input_end");
        if (fileHistoryEnabled()) {
          queryCheckpoint("query_file_history_snapshot_start");
          No.filter(isUserTextPrompt).forEach((prev) => {
            if (or.has(prev.uuid)) return;
            makeFileHistorySnapshot({
              getAppState,
              setAppState,
              messageUuid: prev.uuid,
              storageV5,
            });
          });
          queryCheckpoint("query_file_history_snapshot_end");
        }
        if (No.length) {
          resetHistory();
          for (let $r of Bo) $r.close();
          let Gn = Xo[max];
          let mode = Gn?.mode ?? "prompt";
          let Zr = Gn && typeof Gn.value === "string" ? Gn.value : undefined;
          let wr = mode === "prompt" || (mode === "bash" && vo);
          let zr = Xo.some(($r) => $r.stopHookActive) ? true : undefined;
          let clientPlatform = Gn?.clientPlatform;
          let fr = turnAttributionKeyOf(Xo);
          io = claimTurn({
            turnUuids: flattened,
            isHumanTakeover:
              vo && (mode === "prompt" || mode === "bash") && Gn !== undefined && isRefillableCommand(Gn),
            humanCommandUuids: Xo.filter(isRefillableCommand).map(($r) => $r.uuid),
            willQuery: vo,
          });
          Ro = true;
          promptEntryTracker.handedOff();
          await run(
            No,
            abortController,
            vo,
            kn ?? [],
            Fn &&
              isSkillModelOverrideAllowedInMode({
                skillModel: Fn,
                mode: getAppState().toolPermissionContext.mode,
                fastMode: getAppState().fastMode ?? false,
              })
              ? resolveSkillModelOverride(Fn, mainLoopModel)
              : mainLoopModel,
            wr ? onBeforeQuery : undefined,
            Zr,
            bn,
            zr,
            clientPlatform,
            context.options?.activeSkill,
            Mn,
            fr,
            bo,
            Et,
          );
        } else {
          guard.cancelReservation();
          for (let Gn of Bo) Gn.close();
          resetHistory();
          turn.setAbortController(null);
          endInteractionSpan();
        }
        if (Go && hn)
          queue.enqueue({
            agentId: mainAgentId(),
            value: Go,
            mode: "prompt",
            origin: {
              kind: "auto-continuation",
            },
          });
      }),
    );
  } finally {
    let No = Ro;
    Ro = true;
    for (let vo of Cn) restoreDroppedInput(vo, oo);
    if (!No) Io?.();
    releaseTurnClaim(io, flattened);
    turn.afterTurnEvents(() => releaseKeptPoseIfStale(po));
    if (guard.generation === generation) {
      guard.cancelReservation();
      turn.stream.setUserInputOnProcessing(undefined);
    }
    endInteractionSpan();
    for (let vo of Bo) vo.close();
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
  for (let It of cut) {
    let command = It.command;
    if (userCancelled && isRefillableInput(command) && typeof command.value === "string") {
      handBack(inputDisplayText(command), command);
      let retainedPastedContents = getRetainedPastedContents(command);
      if (retainedPastedContents.length > 0)
        composer.setPastedContents((Dt) => mergeTurnTags(Dt, retainedPastedContents));
    } else if (turnReplaced && command.mode === "prompt" && isRefillableInput(command))
      interruptedPrompts.push(It);
    else requeued.push(It);
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
    let It = new Set(
      interruptedPrompts.filter(
        ({ command, isWritten }) =>
          !isWritten && isScreeningPendingEntry(command) && isReplayableHistoryEntry(command),
      ),
    );
    let Ot = new Map();
    recordSubmittedPrompts(
      interruptedPrompts
        .filter(
          (interruptedPrompt) =>
            !It.has(interruptedPrompt) &&
            (!interruptedPrompt.isWritten || !interruptedPrompt.command.historyEntry),
        )
        .map(({ command, screened }) => {
          let display = inputDisplayText(command);
          if (command.historyEntry) return command;
          let oo = {
            ...(command.pastedContents ?? {}),
          };
          for (let io of extractImagesFromValue(command.value, Date.now())) oo[io.id] = io;
          let Xt = {
            ...command,
            historyEntry: {
              display,
              pastedContents: oo,
            },
          };
          if (screened) Ot.set(Xt, screened);
          return Xt;
        }),
      storageV5,
      {
        armUndo: false,
        placed: withExpandedPastes,
        unanswered,
        screened: Ot,
      },
    );
    for (let { command } of It) restoreDroppedInput(command, composer);
  }
  if (!turnReplaced) turn.setAbortController(null);
}
//@ chunk-18hwfzwa.js:1493685-1493732 placement = prependModeCharacterToInput (1)
function prependModeCharacterToInput(h) {
  return h.mode === "bash" || isSlashCommand_2(h);
}
//@ chunk-e6aww6q8.js:67200-67247 placement
/**
 * 提交框里被视为"退出"的输入（exit、quit、:q 等）。
 */
var EXIT_COMMAND_WORDS = ["exit", "quit", ":q", ":q!", ":wq", ":wq!"];
export { EXIT_COMMAND_WORDS, handlePromptSubmit };
