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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import { startQueryProfile, queryCheckpoint } from "./queryProfiler.js";
import {
  parsePastedRefs,
  Ter,
  describeRemovedPastes,
  Dvt,
  flushPromptHistory,
  getInlinePasteTexts,
  recordSubmittedPrompts,
} from "../history.js";
import { Do } from "./git/gitSafeEnv.js";
import { isNonEmptyImageAttachment, Qvt } from "./messages/messagePredicates.js";
import { Bqo, createPromptHistoryWriter, shouldRecordPrompt } from "../screens/repl/lastPromptTracker.js";
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
import { Ypt, Xpt } from "../components/VirtualMessageList.js";
import { runLocalCommandFromRepl } from "../screens/repl/runLocalCommand.js";
import { createAbortController, unwrapAbortReason } from "./abortController.js";
import { resolveCommandDialog } from "../commands/dialogs.js";
import { logFeatureBad, cmdFeature, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { commandUnavailableMessage } from "../screens/repl/idleReturn.js";
import { hA } from "./directMemberMessage.js";
import {
  createUserMessage,
  extractTextContent_2,
  isUserTextPrompt,
  createUserInterruptionMessage,
} from "./messages.js";
import { mainAgentId } from "../bootstrap/state.js";
import { dispatchCommandRunHooks, iUo } from "../plugins/functionHooks/commandRunDispatch.js";
import { isFrozenMarker } from "./frozenMarkers.js";
import { getTipAttribution } from "../services/tips/tipIds.js";
import { hasSingleCommandRunHook } from "./processUserInput/surfaceCommandNotices.js";
import { isUltraplanEnabled } from "../commands/ultraplan.js";
import { isVirtualPancakeEnabled, getAutoModeConfigOrDefault } from "./permissions/permissionSetup.js";
import { ofe, cbe, mergeTurnTags } from "./userTurnTags.js";
import { logError } from "./log.js";
import {
  ZIo,
  noteHumanTakeover,
  dropStaleContinuation,
  claimTurn,
  releaseTurnClaim,
} from "../services/quotaAutoResume/quotaAutoResume.js";
import { vbe } from "../plugins/functionHooks/personHold.js";
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
import { b7e, submitPromptWithHooks } from "./processUserInput/userPromptSubmitHooks.js";
import { resolvePromptSource } from "./promptSource.js";
import { isAbortError, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { oO } from "../screens/repl/SessionController.js";
import {
  jse,
  Y3n,
  e7n,
  Up,
  REt,
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
  xbn,
  endInteractionSpan,
} from "./telemetry/sessionTracing.js";
import { parseSlashCommand } from "./slashCommandParsing.js";
import { withExpandedPastes } from "./hooks/postSamplingHooks.js";
import { DRn } from "./http.js";
import { kNi } from "../plugins/functionHooks/promptSubmit.js";
import { isHumanOrUnset } from "./messageProvenance.js";
import { r9n, getTextBlocks, markVerifiedHumanTurn } from "./messages/apiNormalization.js";
import {
  processUserInput,
  isNullRenderingAttachment_2,
  isNullRenderingAttachment,
} from "./processUserInput/processUserInput.js";
import { stampMissingOrigin, XQn, JQn, QQn, attachTaskDelivery } from "./messages/nonUserMessages.js";
import { gge } from "./messageKinds.js";
import { fileHistoryEnabled } from "./fileHistory.js";
import { turnAttributionKeyOf } from "./turnAttributionKey.js";
import { isSkillModelOverrideAllowedInMode } from "./betas.js";
import { resolveSkillModelOverride } from "./model/model.js";
import { Znt } from "./historyFile.js";

/**
 * 处理输入框提交：斜杠命令、bash 模式、图片/粘贴、排队（正在运行时入队），最终调用 executeUserInput。
 */
//@ chunk-18hwfzwa.js:1475438-1483880 fingerprint = handlePromptSubmit (0.391)
async function handlePromptSubmit(params) {
  let {
      helpers: helpers,
      turn: turn,
      commands: commands,
      presentation: presentation,
      onInputChange: onInputChange,
      setPastedContents: setPastedContents,
      messages: messages,
      mainLoopModel: mainLoopModel,
      ideSelection: ideSelection,
      getAppState: getAppState,
      setAppState: setAppState,
      onBeforeQuery: onBeforeQuery,
      canUseTool: canUseTool,
      queuedCommands: queuedCommands,
      uuid: uuid,
      skipSlashCommands: skipSlashCommands,
      queue: queue,
    } = params,
    { setCursorOffset: setCursorOffset, clearBuffer: clearBuffer, resetHistory: resetHistory } = helpers;
  if (queuedCommands?.length) {
    (startQueryProfile(),
      await executeUserInput({
        inputSource: "queued",
        queuedCommands: queuedCommands,
        messages: messages,
        mainLoopModel: mainLoopModel,
        ideSelection: ideSelection,
        querySource: params.querySource,
        commands: commands,
        turn: turn,
        queue: queue,
        getAppState: getAppState,
        setAppState: setAppState,
        onBeforeQuery: onBeforeQuery,
        resetHistory: resetHistory,
        canUseTool: canUseTool,
        onInputChange: onInputChange,
        getCurrentInput: params.getCurrentInput,
        restoreHandedBackPrompt: params.restoreHandedBackPrompt,
        onPromptCameBack: params.onPromptCameBack,
        onPromptHandedBack: params.onPromptHandedBack,
        setPastedContents: setPastedContents,
        deferSlashToEngine: params.deferSlashToEngine,
        storageV5: params.storageV5,
      }));
    return;
  }
  let { guard: guard, isExternalLoading: isExternalLoading } = turn,
    so = !1,
    po = params.input ?? "",
    ao = params.mode ?? "prompt",
    co = params.pastedContents ?? {},
    bo = uuid ?? randomUUID_13(),
    referencedIds = new Set(parsePastedRefs(po).map((on) => on.id)),
    Bo = Do(co, (on) => on.type !== "image" || referencedIds.has(on.id)),
    hasImages = Object.values(Bo).some(isNonEmptyImageAttachment);
  if (po.trim() === "") return;
  if (ao !== "bash" && !skipSlashCommands && cX.includes(po.trim())) {
    if (commands.find((cmd) => cmd.name === "exit")) handlePromptSubmit({ ...params, input: "/exit" });
    else Bqo();
    return;
  }
  let { stripped: stripped, expanded: expanded, removed: removed } = Ter(po, Bo);
  if (removed.length > 0) {
    if (
      (params.addNotification?.({
        key: "pasted-text-unavailable",
        kind: "feedback",
        text: describeRemovedPastes(removed),
        priority: "immediate",
      }),
      stripped.trim() === "" || ao === "bash" || po.trimStart().startsWith("/"))
    ) {
      if (!guard.isActive && !isExternalLoading && !so) {
        if ((params.getCurrentInput?.() ?? "").trim() === "")
          (onInputChange(po),
            setCursorOffset(po.length),
            setPastedContents(co),
            params.onPromptHandedBack(bo, void 0),
            params.onSubmitCancelRewind?.());
        turn.stream.setUserInputOnProcessing(void 0);
      }
      return;
    }
  }
  recordStylePoolAtlas();
  let mn = !po.trimStart().startsWith("/") && expanded.trimStart().startsWith("/"),
    Cn = skipSlashCommands || mn,
    pastedTextRefs = parsePastedRefs(po).filter(
      (on) => Bo[on.id]?.type === "text" && !Bo[on.id]?.unavailable,
    ),
    pastedTextCount = pastedTextRefs.length,
    pastedTextBytes = pastedTextRefs.reduce((sum, _o) => sum + (Bo[_o.id]?.content.length ?? 0), 0);
  if (
    (logEvent("tengu_paste_text", { pastedTextCount: pastedTextCount, pastedTextBytes: pastedTextBytes }),
    !Cn && expanded.trim().startsWith("/"))
  ) {
    let trimmedInput = expanded.trim(),
      { name: _o, args: args } = splitSlashCommandInput(trimmedInput),
      Dn = findCommand(_o, commands),
      wn = Dn && isCommandEnabled(Dn) ? Dn : void 0,
      mr = wn && isImmediateCommand(wn, args, presentation) ? wn : void 0;
    if (
      mr &&
      (mr.type === "local-jsx" || mr.type === "local") &&
      (guard.isActive || isExternalLoading || so)
    ) {
      if (isSlashCommandBlockedByEndedByModel(mr, getAppState().endedByModel)) {
        (onInputChange(""),
          setCursorOffset(0),
          params.addNotification?.({
            key: "immediate-ended-by-model",
            kind: "feedback",
            text: withTaskSuffix(
              "Claude ended this conversation. Start a new session (or /clear) to continue.",
            ),
            priority: "immediate",
          }));
        return;
      }
      if (mr.type === "local") {
        params.onSubmitProceed?.();
        let Ir = createPromptHistoryWriter({
          entry: params.historyEntry,
          name: _o,
          typed: args,
          write: (ts) => Dvt(ts, params.storageV5, ao),
        });
        (logEvent("tengu_immediate_command_executed", {
          commandName: shippedCommandNameForAnalytics(mr.name),
        }),
          onInputChange(""),
          setCursorOffset(0),
          setPastedContents({}),
          clearBuffer());
        let Pr = Ypt();
        try {
          await runLocalCommandFromRepl({
            command: mr,
            commandName: _o,
            args: args,
            context: {
              ...turn.buildToolUseContext(messages, [], createAbortController(), mainLoopModel),
              isMidTurn: !0,
              dispatchedAsImmediate: !0,
            },
            printRows: turn.appendAfterTurn,
            ranAs: Ir,
          });
        } finally {
          Xpt(Pr);
        }
        return;
      }
      let Kn = resolveCommandDialog(mr);
      if (!Kn) {
        (logFeatureBad(cmdFeature(mr.name), "cmd_local_jsx_no_dialog_resolution"),
          params.addNotification?.({
            key: `immediate-${mr.name}`,
            kind: "feedback",
            text: commandUnavailableMessage(mr),
            priority: "immediate",
          }));
        return;
      }
      params.onSubmitProceed?.();
      let Wn = createPromptHistoryWriter({
        entry: params.historyEntry,
        name: _o,
        typed: args,
        write: (cmd) => Dvt(cmd, params.storageV5, ao),
      });
      (logEvent("tengu_immediate_command_executed", { commandName: shippedCommandNameForAnalytics(mr.name) }),
        onInputChange(""),
        setCursorOffset(0),
        setPastedContents({}),
        clearBuffer());
      let toolUseContext = turn.buildToolUseContext(messages, [], createAbortController(), mainLoopModel),
        localJsx = toolUseContext.localJsx;
      if (!localJsx) {
        (logFeatureBad(cmdFeature(mr.name), "cmd_local_jsx_no_panel_host"),
          params.addNotification?.({
            key: `immediate-${mr.name}`,
            kind: "feedback",
            text: commandUnavailableMessage(mr),
            priority: "immediate",
          }));
        return;
      }
      let Un = !1,
        dr,
        onDone = (result, options) => {
          if (((Un = !0), dr?.close(), result && options?.display !== "skip" && params.addNotification))
            params.addNotification({
              key: `immediate-${mr.name}`,
              kind: "feedback",
              text: hA(result),
              priority: "immediate",
            });
          let ts = options?.metaMessages ?? [];
          if (
            (turn.appendAfterTurn(
              ts.map((Gn) =>
                createUserMessage({ content: Gn, isMeta: !0, origin: options?.metaMessagesOrigin }),
              ),
            ),
            options?.nextInput)
          )
            if (options.submitNextInput)
              queue.enqueue({
                agentId: mainAgentId(),
                value: options.nextInput,
                mode: "prompt",
                origin: { kind: "auto-continuation" },
              });
            else if (params.replaceDraftWithNextInput) params.replaceDraftWithNextInput(options.nextInput);
            else onInputChange(options.nextInput);
        },
        pr = Ypt(),
        Qn = await dispatchCommandRunHooks({
          input: iUo(mr, args, presentation),
          engine: {
            run: async (Ir) => (
              Wn(Ir),
              (await Kn()).call(
                onDone,
                {
                  ...toolUseContext,
                  isMidTurn: !0,
                  dispatchedAsImmediate: !0,
                  appendAfterTurn: turn.appendAfterTurn,
                  ...(isFrozenMarker(params.composerEnter) && { submissionOrigin: { kind: "human" } }),
                },
                Ir,
                _o,
              )
            ),
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
          queued: void 0,
        }).finally(() => Xpt(pr));
      if ((logFeatureOk(cmdFeature(mr.name), getTipAttribution(mr.name)), Qn.kind === "answered")) {
        if (hasSingleCommandRunHook(getCommandName(mr))) Wn(args);
        onDone(Qn.text, Qn.context === void 0 ? void 0 : { metaMessages: [...Qn.context] });
        return;
      }
      let ran = Qn.ran;
      if (ran && !Un)
        dr = localJsx.show(ran, {
          commandName: getCommandName(mr),
          immediate: !0,
          hidesPrompt: !1,
          retireAtTurnBoundary: !0,
        });
      return;
    }
  }
  let kn =
      Cn &&
      params.inputSource !== "suggestion_accepted" &&
      parsePastedRefs(po).some((on) => Bo[on.id] !== void 0),
    Fn = ao === "prompt" && !(!Cn && expanded.trim().startsWith("/")),
    bn = params.inputSource === "suggestion_accepted",
    Go =
      Fn && !(isUltraplanEnabled() && flushPromptHistory(po, Bo)) && isVirtualPancakeEnabled()
        ? bn
          ? ofe(po)
          : Ter(po, Bo, cbe, ofe).expanded
        : expanded,
    hn = !bn && Go !== expanded,
    Mn = {
      agentId: mainAgentId(),
      value: Go,
      submittedAtMs: params.submittedAtMs ?? performance.now(),
      preExpansionValue: params.inputSource === "suggestion_accepted" ? void 0 : po,
      mode: ao,
      pastedContents: hasImages || kn || hn || getInlinePasteTexts(Bo, !0).length > 0 ? Bo : void 0,
      ...(hn && { pasteTagged: !0 }),
      skipSlashCommands: Cn,
      suppressWorkflowKeyword: params.suppressWorkflowKeyword,
      inputSource: params.inputSource,
      uuid: bo,
      origin: { kind: "human" },
      composerEnter: params.composerEnter,
      historyEntry: params.historyEntry,
      ...(params.wait === !0 && { wait: !0 }),
    },
    Xo = ao === "prompt" && shouldRecordPrompt(po, commands),
    Sn = () => {
      try {
      } catch (error) {
        logError(error);
      }
    },
    $n = () => params.resumesStaleQuotaWait === !0 && !ZIo();
  if (guard.isActive || isExternalLoading || so) {
    if (ao !== "prompt" && ao !== "bash") {
      logFeatureBad("prompt_queued", "mode_not_queueable");
      return;
    }
    if ($n()) return;
    if ((params.onSubmitProceed?.(), Sn(), params.composerClearedAtEnter !== !0))
      (onInputChange(""), setCursorOffset(0), setPastedContents({}), clearBuffer());
    resetHistory();
    let on = vbe()?.turnId,
      _o = Fn && isUltraplanEnabled() && flushPromptHistory(Mn.preExpansionValue ?? expanded.trim(), Bo),
      cn = Fn && !_o && guard.isRunning && on !== void 0,
      Dn = Fn && !cn && hasPromptSubmitHooks(turn, messages, mainLoopModel);
    if (Xo) noteHumanTakeover(bo);
    let wn = params.takeIdeSelectionForQueue?.();
    if (
      (queue.enqueue({
        ...Mn,
        value: Go.trim(),
        preExpansionValue: Mn.preExpansionValue?.trim(),
        ...(wn && { ideSelection: wn }),
        ...(cn && { screeningPending: !0 }),
        ...((_o || Dn) && { drainOnly: !0 }),
        ...(Dn && { screeningOwed: !0 }),
      }),
      !cn)
    ) {
      logFeatureOk("prompt_queued");
      return;
    }
    let mr = { messages: [], shouldQuery: !0 },
      Kn,
      Wn,
      Fr = !1,
      Zn = (Un) => {
        let dr = Un?.wasCancelled === !0;
        queue.settleScreening(bo, {
          promptSubmitted:
            Un === void 0 || Kn === void 0 || dr
              ? void 0
              : Un.ended !== void 0
                ? {
                    text: Un.text ?? Go.trim(),
                    ...(Un.context !== void 0 && { context: Un.context }),
                    messages: mr.messages,
                    under: Kn,
                    stopped: Un.stopped,
                  }
                : {
                    text: Un.proceeds.text,
                    ...(Un.proceeds.context !== void 0 && { context: Un.proceeds.context }),
                    messages: mr.messages,
                    under: Kn,
                    ...(Un.proceeds.sessionTitle !== void 0 && { sessionTitle: Un.proceeds.sessionTitle }),
                  },
          drainOnly: Un === void 0 || dr || Un.ended !== void 0 ? !0 : void 0,
        });
      };
    try {
      let toolUseContext = turn.buildToolUseContext(
        messages,
        [],
        turn.abortController ?? createAbortController(),
        mainLoopModel,
      );
      ((Kn = b7e(toolUseContext)),
        (Wn = await submitPromptWithHooks({
          submission: { text: Go.trim(), input: Go.trim(), pastedContents: Mn.pastedContents },
          origin: Mn.origin,
          bridgeOrigin: Mn.bridgeOrigin,
          mode: Mn.mode,
          turnId: on,
          shouldWait: params.wait === !0,
          context: toolUseContext,
          result: mr,
          isStartInput: !1,
          promptSource: resolvePromptSource({
            isNonInteractive: toolUseContext.options.isNonInteractiveSession,
            callerSource: params.inputSource ?? "queued",
          }),
          wakeupSource: void 0,
          enter: async (dr) => {
            ((Fr = !0), Zn(dr));
          },
        })));
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
    if (Wn?.ended !== void 0 && Wn.stopped === void 0) {
      if (!queue.settleScreening(bo, { dropped: !0 })) {
        (logForDebugging("prompt.submit at Enter dropped a prompt that had left the queue"),
          logFeatureOk("prompt_queued"));
        return;
      }
      if ((logFeatureBad("prompt_queued", "dropped_by_hook"), params.restoreHandedBackPrompt))
        params.restoreHandedBackPrompt(po);
      else (onInputChange(oO(params.getCurrentInput?.() ?? "", po)), params.onPromptCameBack?.());
      if ((setPastedContents((Un) => mergeTurnTags(Un, Object.values(co))), isQueueFreeOfPrompts(queue, wn)))
        params.onPromptHandedBack(bo, wn);
      params.addNotification?.({
        key: "prompt-submit-dropped",
        kind: "feedback",
        text: Wn.ended.resultText ?? "Prompt dropped by a hook",
        priority: "immediate",
        requeueOnPreempt: !0,
      });
      return;
    }
    (Zn(Wn), logFeatureOk("prompt_queued"));
    return;
  }
  if ($n()) {
    turn.stream.setUserInputOnProcessing(void 0);
    return;
  }
  if ((params.onSubmitProceed?.(), Sn(), startQueryProfile(), logFeatureOk("prompt_submit"), Xo))
    noteHumanTakeover(bo, { dispatching: !0 });
  await executeUserInput({
    inputSource: params.inputSource ?? "typed",
    queuedCommands: [Mn],
    messages: messages,
    mainLoopModel: mainLoopModel,
    ideSelection: ideSelection,
    querySource: params.querySource,
    commands: commands,
    turn: turn,
    queue: queue,
    getAppState: getAppState,
    setAppState: setAppState,
    onBeforeQuery: onBeforeQuery,
    resetHistory: resetHistory,
    canUseTool: canUseTool,
    onInputChange: onInputChange,
    getCurrentInput: params.getCurrentInput,
    restoreHandedBackPrompt: params.restoreHandedBackPrompt,
    onPromptCameBack: params.onPromptCameBack,
    onPromptHandedBack: params.onPromptHandedBack,
    setPastedContents: setPastedContents,
    deferSlashToEngine: params.deferSlashToEngine,
    storageV5: params.storageV5,
  });
}
/**
 * 执行一次用户输入：处理成消息、写入历史与转录，启动查询循环。
 */
//@ chunk-18hwfzwa.js:1483880-1492425 fingerprint = executeUserInput (0.357)
async function executeUserInput(params) {
  let {
      messages: messages,
      ideSelection: ideSelection,
      querySource: querySource,
      turn: turn,
      getAppState: getAppState,
      setAppState: setAppState,
      onBeforeQuery: onBeforeQuery,
      resetHistory: resetHistory,
      canUseTool: canUseTool,
      queuedCommands: queuedCommands,
      inputSource: inputSource,
      storageV5: storageV5,
      queue: queue,
    } = params,
    mainLoopModel = params.mainLoopModel,
    { guard: guard, run: run } = turn,
    Et = inputSource === "queued";
  function Dt(No, vo) {
    turn.stream.setUserInputOnProcessing(No, vo, Et);
  }
  function Lt(No, { uuid: uuid, ideSelection: ideSelection }) {
    if (params.restoreHandedBackPrompt) params.restoreHandedBackPrompt(No);
    else (params.onInputChange(oO(params.getCurrentInput?.() ?? "", No)), params.onPromptCameBack?.());
    if (uuid && isQueueFreeOfPrompts(queue, ideSelection)) params.onPromptHandedBack(uuid, ideSelection);
  }
  let oo = { land: Lt, setPastedContents: params.setPastedContents },
    abortController = createAbortController();
  turn.setAbortController(abortController);
  let io = null,
    flattened = (queuedCommands ?? []).flatMap((No) => (No.uuid === void 0 ? [] : [No.uuid])),
    po = (queuedCommands ?? []).some(jse) ? Ypt() : void 0,
    startTime = performance.now(),
    reduced = (queuedCommands ?? []).reduce(
      (No, vo) =>
        vo.submittedAtMs === void 0 || vo.mode !== "prompt"
          ? No
          : Math.min(No ?? vo.submittedAtMs, vo.submittedAtMs),
      void 0,
    ),
    bo =
      reduced === void 0
        ? void 0
        : { submittedAtMs: reduced, dequeuedAtMs: inputSource === "queued" ? startTime : reduced };
  function makeContext() {
    return {
      ...turn.buildToolUseContext(messages, [], abortController, mainLoopModel),
      deferSlashToEngine: params.deferSlashToEngine,
    };
  }
  let Bo = [],
    Ro = !1;
  using Ho = createPromptEntryTracker();
  let Io,
    generation = guard.generation,
    mn = {
      turn: turn,
      reservedGeneration: generation,
      signal: abortController.signal,
      queue: queue,
      storageV5: storageV5,
      handBack: Lt,
      composer: oo,
      makeContext: makeContext,
    },
    Cn = new Set();
  try {
    (guard.reserve(), queryCheckpoint("query_process_user_input_start"));
    let No = [],
      vo = !1,
      Yo = !1,
      kn,
      Fn,
      bn,
      Go,
      hn,
      Mn,
      Xo = dropStaleContinuation(queuedCommands ?? []),
      Sn = Xo[0]?.workload,
      on = {
        workload: Sn !== void 0 && Xo.every((Un) => Un.workload === Sn) ? Sn : void 0,
        scheduledByPlugin: Y3n(Xo),
      },
      index = Xo.findIndex(jse),
      max = Math.max(0, index),
      Dn = index >= 0,
      firstWorkload = Xo[max]?.value,
      mr =
        typeof firstWorkload === "string"
          ? firstWorkload
          : firstWorkload
            ? extractTextContent_2(
                firstWorkload,
                `
`,
              )
            : "",
      Wn = Xo.some((Un) => {
        if (Un.mode !== "prompt") return !1;
        if (typeof Un.value !== "string" || Un.skipSlashCommands || !Un.value.trim().startsWith("/"))
          return !0;
        let dr = findCommand(splitSlashCommandInput(Un.value.trim()).name, params.commands);
        return dr === void 0 || dr.type === "prompt";
      })
        ? turn.awaitSessionStartHooks(abortController.signal)
        : void 0;
    if (Wn) {
      let Un = Dn ? Xo[max] : void 0;
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
          cut: Xo.map((dr) => ({ command: dr, isWritten: !1 })),
          stays: [],
          unanswered: "typed",
        });
        return;
      }
      mainLoopModel = getMainLoopModelFromState(getAppState());
    }
    let Fr = isPromptHookObserved(),
      Zn = new Set(
        (queuedCommands ?? []).filter((Un) => {
          let or =
            (Un.skipSlashCommands !== !0 && typeof Un.value === "string" && Un.value.startsWith("/")
              ? findCommand(parseSlashCommand(Un.value)?.commandName ?? "", params.commands)
              : void 0) === void 0 || Fr;
          return Un.mode === "prompt" && or;
        }),
      );
    ((Cn = Zn),
      recordSubmittedPrompts(
        (queuedCommands ?? []).filter((Un) => !Zn.has(Un)),
        storageV5,
        { placed: withExpandedPastes },
      ),
      await DRn(on, () =>
        withInteractionSpan(mr, async () => {
          let Un = makeContext(),
            localJsx = Un.localJsx;
          if (localJsx)
            Un.localJsx = {
              show: (Gn, Ur) => {
                let show = localJsx.show(Gn, Ur);
                if (Ur.retireAtTurnBoundary) Bo.push(show);
                return show;
              },
            };
          let or = new Set();
          if (Un.makeFileHistorySnapshot)
            Un.makeFileHistorySnapshot = snapshotBatchSiblings({
              baseMakeFileHistorySnapshot: Un.makeFileHistorySnapshot,
              batchMessages: No,
              preSnapshottedSiblings: or,
              getAppState: getAppState,
              setAppState: setAppState,
              storageV5: storageV5,
            });
          let pr = [...Xo],
            Qn = new Set(),
            ur = new Set(),
            Ir = new Map();
          using Pr = kNi(pr);
          let ts = new Set();
          ((Un.applyMessageOp = createBatchedMessageOp({
            baseApplyMessageOp: Un.applyMessageOp,
            batchMessages: No,
            isBatchHandedOff: () => Ro,
            buffered: ts,
          })),
            (Io = () => {
              let filtered = No.filter((Ur) => ts.has(Ur.uuid));
              if (filtered.length > 0) Un.applyMessageOp({ type: "append", messages: filtered });
            }));
          for (let Gn = 0; Gn < Xo.length; Gn++) {
            let Ur = Xo[Gn],
              Zr = Gn === max,
              wr = resolveTaskNotificationOrigin(Ur.origin, Ur.mode, Ur.runId),
              zr = Ur.isMeta || !isHumanOrUnset(wr) ? "system" : (Ur.inputSource ?? inputSource),
              _r = r9n(Ur.uuid, Ur.verifiedSlackHumanTurn),
              fr = await processUserInput({
                input: Ur.value,
                preExpansionInput: Ur.preExpansionValue,
                promptSource: zr,
                suppressWorkflowKeyword: Ur.suppressWorkflowKeyword,
                mode: Ur.mode,
                context: Un,
                pastedContents: Ur.pastedContents,
                messages: messages,
                setUserInputOnProcessing: Zr ? Dt : void 0,
                onQueryCommitted: () => {
                  if (!abortController.signal.aborted) guard.markDispatchForModel(generation);
                },
                isAlreadyProcessing: !Zr,
                querySource: querySource,
                canUseTool: canUseTool,
                uuid: _r,
                ideSelection: Zr ? (Ur.ideSelection ?? ideSelection) : void 0,
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
                skipAttachments: !Zr || !Dn || Qvt(Ur) ? "all" : void 0,
                origin: wr,
                skipSubmissionHooks: Ur.skipSubmissionHooks,
                shouldQuery: Ur.shouldQuery,
                skipSkillPermissionReset: Ur.pollEmptyDispatch === !0,
                verifiedSlackHumanTurn: Ur.verifiedSlackHumanTurn,
                textNotTyped: Ur.textNotTyped,
                ownFilePaths: Ur.ownFilePaths,
                noPersonArrived: Ur.noPersonArrived,
                composerEnter: Ur.composerEnter,
                inlinedImagePaths: Ur.inlinedImagePaths,
                promptSubmitted: Ur.promptSubmitted,
                onScreened: ($r) =>
                  writeHeldHistory({ cmd: Ur, screened: $r, held: Cn, storageV5: storageV5, composer: oo }),
                wait: Ur.wait === !0,
                entries: Ho,
                interactionPrompt: Zr ? xbn() : void 0,
              }).catch(($r) => {
                try {
                  for (let Yr = Xo.length - 1; Yr >= 0; Yr--) {
                    let Er = Xo[Yr];
                    if (
                      Er !== void 0 &&
                      Yr !== Gn &&
                      !Qn.has(Er) &&
                      Er.origin?.kind !== "plugin" &&
                      !e7n(Er)
                    ) {
                      if (Yr === max && Yr < Gn)
                        isNullRenderingAttachment_2(
                          No.filter((Vr) => !ur.has(Vr)),
                          Un,
                        );
                      queue.enqueueReportingAdmission(
                        {
                          ...Er,
                          ...(Er.priority === "now" && { priority: "next" }),
                          admissionExempt: "resurrected",
                          screeningOwed: !0,
                        },
                        { ahead: !0 },
                      );
                    }
                  }
                } catch (error) {
                  if (isAbortError(error))
                    logForDebugging(`queueing again after a throw: ${errorMessage(error)}`);
                  else logError(error);
                }
                throw $r;
              });
            if (fr.noVerdict) {
              let $r = Cn.delete(Ur);
              if ($r && fr.engineDeferredSlash !== void 0)
                fr.engineDeferredSlash = {
                  ...fr.engineDeferredSlash,
                  lineScreened: deferredHistoryWrite(Ur, storageV5),
                };
              else if ($r && fr.wasUnscreenedAtDispatch === !0 && !isPromptHookObserved())
                recordSubmittedPrompts([Ur], storageV5, {
                  placed: withExpandedPastes,
                  screened: new Map([[Ur, {}]]),
                });
            } else if (!fr.interrupted) {
              let $r = fr.screened ?? {};
              (Ir.set(Ur, $r),
                writeHeldHistory({ cmd: Ur, screened: $r, held: Cn, storageV5: storageV5, composer: oo }));
            }
            if (wr) stampMissingOrigin(fr.messages, wr);
            if (Ur.priority === "later") {
              for (let message of fr.messages) if (message.type === "user") message.queuePriority = "later";
            }
            if (
              Ur.origin?.kind === "task-notification" &&
              (Ur.origin.source !== void 0 || Ur.origin.slug !== void 0)
            ) {
              for (let message of fr.messages) if (message.type === "user") message.queueOrigin = Ur.origin;
            }
            if (Ur.origin?.kind === "task-notification" && Ur.mode === "prompt") {
              for (let message of fr.messages) if (message.type === "user") message.queueMode = "prompt";
            }
            if (Ur.skipAttachments === !0 || Ur.mode === "poll-event") XQn(fr.messages);
            if (Ur.textNotTyped === !0) JQn(fr.messages);
            if (
              isFrozenMarker(Ur.composerEnter) &&
              Ur.inputSource !== "suggestion_accepted" &&
              getAutoModeConfigOrDefault().typedMarks === !0
            ) {
              for (let message of fr.messages)
                if (message.type === "user" && message.uuid === _r)
                  ((message[gge] = { as: "prompt", texts: getTextBlocks(message.message.content) }),
                    logFeatureOk("typed_marks"));
            }
            if (Ur.shouldQuery === !1 && Ur.queryHeldForNextTurn !== !0) QQn(fr.messages);
            if (Ur.taskDelivery) attachTaskDelivery(fr.messages, Ur.taskDelivery, _r);
            if (Ur.verifiedSlackHumanTurn && _r) markVerifiedHumanTurn(fr.messages, _r);
            if (fr.interrupted || fr.endedUnderAbort) {
              let filtered = No.filter((message) => !ur.has(message));
              (isNullRenderingAttachment_2(filtered, Un), pr.splice(Gn + 1));
              let flattened = Xo.flatMap((Er, Vr) =>
                Vr > Gn || (Er.origin?.kind !== "plugin" && (Vr < Gn ? !Qn.has(Er) : !fr.endedUnderAbort))
                  ? [{ command: { ...Er, screeningOwed: !0 }, isWritten: !Cn.has(Er), screened: Ir.get(Er) }]
                  : [],
              );
              (Cn.clear(),
                resurrectCutCommands({
                  ...mn,
                  cut: flattened,
                  stays: [
                    ...No.filter((updater) => ur.has(updater) || isNullRenderingAttachment(updater)),
                    ...(fr.endedUnderAbort ? fr.messages : fr.messages.filter(isNullRenderingAttachment)),
                  ],
                }));
              return;
            }
            if ((No.push(...fr.messages), prependModeCharacterToInput(Ur) || !fr.shouldQuery)) {
              Qn.add(Ur);
              for (let message of fr.messages) ur.add(message);
            }
            if (fr.engineDeferredSlash) {
              let $r = Zr ? xbn() : void 0;
              Mn =
                $r === void 0 ? fr.engineDeferredSlash : { ...fr.engineDeferredSlash, interactionPrompt: $r };
            }
            if (Zr) ((vo = fr.shouldQuery), (kn = fr.allowedTools), (Fn = fr.model));
            if (((bn ??= fr.effort), Ur.promptSubmitted !== void 0 && !fr.shouldQuery)) Yo = !0;
            if (fr.nextInput !== void 0)
              if (fr.submitNextInput) {
                if (Go === void 0) ((Go = fr.nextInput), (hn = !0));
              } else Lt(fr.nextInput, Ur);
          }
          if (Yo) vo = !1;
          if ((queryCheckpoint("query_process_user_input_end"), fileHistoryEnabled()))
            (queryCheckpoint("query_file_history_snapshot_start"),
              No.filter(isUserTextPrompt).forEach((prev) => {
                if (or.has(prev.uuid)) return;
                makeFileHistorySnapshot({
                  getAppState: getAppState,
                  setAppState: setAppState,
                  messageUuid: prev.uuid,
                  storageV5: storageV5,
                });
              }),
              queryCheckpoint("query_file_history_snapshot_end"));
          if (No.length) {
            resetHistory();
            for (let $r of Bo) $r.close();
            let Gn = Xo[max],
              Ur = Gn?.mode ?? "prompt",
              Zr = Gn && typeof Gn.value === "string" ? Gn.value : void 0,
              wr = Ur === "prompt" || (Ur === "bash" && vo),
              zr = Xo.some(($r) => $r.stopHookActive) ? !0 : void 0,
              _r = Gn?.clientPlatform,
              fr = turnAttributionKeyOf(Xo);
            ((io = claimTurn({
              turnUuids: flattened,
              isHumanTakeover: vo && (Ur === "prompt" || Ur === "bash") && Gn !== void 0 && jse(Gn),
              humanCommandUuids: Xo.filter(jse).map(($r) => $r.uuid),
              willQuery: vo,
            })),
              (Ro = !0),
              Ho.handedOff(),
              await run(
                No,
                abortController,
                vo,
                kn ?? [],
                Fn &&
                  isSkillModelOverrideAllowedInMode({
                    skillModel: Fn,
                    mode: getAppState().toolPermissionContext.mode,
                    fastMode: getAppState().fastMode ?? !1,
                  })
                  ? resolveSkillModelOverride(Fn, mainLoopModel)
                  : mainLoopModel,
                wr ? onBeforeQuery : void 0,
                Zr,
                bn,
                zr,
                _r,
                Un.options?.activeSkill,
                Mn,
                fr,
                bo,
                Et,
              ));
          } else {
            guard.cancelReservation();
            for (let Gn of Bo) Gn.close();
            (resetHistory(), turn.setAbortController(null), endInteractionSpan());
          }
          if (Go && hn)
            queue.enqueue({
              agentId: mainAgentId(),
              value: Go,
              mode: "prompt",
              origin: { kind: "auto-continuation" },
            });
        }),
      ));
  } finally {
    let No = Ro;
    Ro = !0;
    for (let vo of Cn) restoreDroppedInput(vo, oo);
    if (!No) Io?.();
    if (
      (releaseTurnClaim(io, flattened), turn.afterTurnEvents(() => Xpt(po)), guard.generation === generation)
    )
      (guard.cancelReservation(), turn.stream.setUserInputOnProcessing(void 0));
    endInteractionSpan();
    for (let vo of Bo) vo.close();
  }
}
/**
 * 处理被中断回合里截下的排队命令：保留部分追加回会话；若是用户取消，把纯文本提示交还输入框（含粘贴内容）；回合被替换时未写入的提示改为中断消息加历史记录，其余命令重新排在队首。
 */
//@ chunk-18hwfzwa.js:1492425-1493685 layout
function resurrectCutCommands({
  cut: cut,
  stays: stays,
  unanswered: unanswered,
  turn: turn,
  reservedGeneration: reservedGeneration,
  signal: signal,
  queue: queue,
  storageV5: storageV5,
  handBack: handBack,
  composer: composer,
  makeContext: makeContext,
}) {
  let turnReplaced = turn.guard.generation !== reservedGeneration,
    userCancelled = turnReplaced && unwrapAbortReason(signal.reason) === "user-cancel";
  if (stays.length > 0) makeContext().applyMessageOp({ type: "append", messages: [...stays] });
  let interruptedPrompts = [],
    requeued = [];
  for (let It of cut) {
    let command = It.command;
    if (userCancelled && Up(command) && typeof command.value === "string") {
      handBack(REt(command), command);
      let Et = getRetainedPastedContents(command);
      if (Et.length > 0) composer.setPastedContents((Dt) => mergeTurnTags(Dt, Et));
    } else if (turnReplaced && command.mode === "prompt" && Up(command)) interruptedPrompts.push(It);
    else requeued.push(It);
  }
  for (let It = requeued.length - 1; It >= 0; It--)
    queue.enqueueReportingAdmission(
      { ...requeued[It].command, admissionExempt: "resurrected" },
      { ahead: !0 },
    );
  if (interruptedPrompts.length > 0) {
    makeContext().applyMessageOp({ type: "append", messages: [createUserInterruptionMessage({})] });
    let It = new Set(
        interruptedPrompts.filter(
          ({ command: command, isWritten: isWritten }) => !isWritten && Znt(command) && e7n(command),
        ),
      ),
      Ot = new Map();
    recordSubmittedPrompts(
      interruptedPrompts
        .filter((Et) => !It.has(Et) && (!Et.isWritten || !Et.command.historyEntry))
        .map(({ command: command, screened: screened }) => {
          let Lt = REt(command);
          if (command.historyEntry) return command;
          let oo = { ...(command.pastedContents ?? {}) };
          for (let io of extractImagesFromValue(command.value, Date.now())) oo[io.id] = io;
          let Xt = { ...command, historyEntry: { display: Lt, pastedContents: oo } };
          if (screened) Ot.set(Xt, screened);
          return Xt;
        }),
      storageV5,
      { armUndo: !1, placed: withExpandedPastes, unanswered: unanswered, screened: Ot },
    );
    for (let { command: command } of It) restoreDroppedInput(command, composer);
  }
  if (!turnReplaced) turn.setAbortController(null);
}
//@ chunk-18hwfzwa.js:1493685-1493732 placement = prependModeCharacterToInput (1)
function prependModeCharacterToInput(h) {
  return h.mode === "bash" || isSlashCommand_2(h);
}
//@ chunk-e6aww6q8.js:67200-67247 placement
var cX = ["exit", "quit", ":q", ":q!", ":wq", ":wq!"];

export { cX, handlePromptSubmit };
