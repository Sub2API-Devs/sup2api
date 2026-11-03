/**
 * screens/repl/PromptSubmitController.ts
 *
 * 2.1.316 新增。REPL 控制器：提交提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
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
import {
  loadingScansRead,
  mayRegisterCommands,
  mayHookCommand,
} from "../../plugins/functionHooks/hooksModuleLoader.js";
import {
  findCommand,
  isCommandEnabled,
  getCommandName,
  splitSlashCommandInput,
  isImmediateCommand,
  shippedCommandNameForAnalytics,
  buildCommandRunInfo,
} from "../../commands.js";
import { matchSubcommand, parseSlashCommand } from "../../utils/slashCommandParsing.js";
import {
  looksLikeCommand,
  isSlashCommandBlockedByEndedByModel,
} from "../../utils/processUserInput/processSlashCommand.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { cX, handlePromptSubmit } from "../../utils/handlePromptSubmit.js";
import { RESUME_COMPACT_DIALOG } from "./resumeCompactOffer.js";
import {
  COLD_RESUME_QUOTA,
  NEWER_MODEL_OFFER as NEWER_MODEL_OFFER_2,
  AUTOCOMPACT_OFFER,
} from "../../components/nudges/nudgeIds.js";
import { Sv } from "../../utils/newerModelOffer.js";
import { isFrozenMarker } from "../../utils/frozenMarkers.js";
import { prependModeCharacterToInput as prependModeCharacterToInput_3 } from "../../components/PromptInput/inputModes.js";
import { Dvt, rpe, parsePastedRefs, ySe } from "../../history.js";
import { M7s } from "../../utils/promptSubmissionOrigin.js";
import { withTaskSuffix } from "../../tasks/endedByModel.js";
import { resolveCommandDialog } from "../../commands/dialogs.js";
import {
  logFeatureBad,
  cmdFeature,
  logFeatureSad,
  logFeatureOk,
} from "../../services/analytics/featureTelemetry.js";
import { commandUnavailableMessage } from "./idleReturn.js";
import { createPromptHistoryWriter } from "./lastPromptTracker.js";
import { logEvent } from "../../services/analytics/index.js";
import { Ypt, Xpt } from "../../components/VirtualMessageList.js";
import { runLocalCommandFromRepl } from "./runLocalCommand.js";
import { createAbortController } from "../../utils/abortController.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { prependToShellHistoryCache } from "../../utils/suggestions/shellHistoryCompletion.js";
import { recordSubmitTime, mainAgentId } from "../../bootstrap/state.js";
import { htt } from "../../utils/remoteSessionCommands.js";
import { env } from "../../utils/env.js";
import { shouldUseResponsiveMode } from "../../plugins/bundled/responsiveMode.js";
import { Avt } from "./ComposerChrome.js";
import { sN } from "../../utils/model/modelSwitchHooks.js";
import { getMainLoopModelFromState } from "../../hooks/useMainLoopModel.js";
import { restorePromptAfterCancel } from "./SessionController.js";
import { getQuerySourceForREPL } from "../../utils/promptCategory.js";
import { isPromptHookObserved } from "../../utils/telemetry/sessionTracing.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
} from "../../utils/plugins/functionHooks/hookRegistration.js";
import { hA } from "../../utils/directMemberMessage.js";
import {
  createCommandInputMessage,
  formatCommandInputTags,
  createUserMessage,
} from "../../utils/messages.js";
import { LOCAL_COMMAND_STDOUT } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { dispatchCommandRunHooks, iUo } from "../../plugins/functionHooks/commandRunDispatch.js";
import { getTipAttribution } from "../../services/tips/tipIds.js";
import { hasSingleCommandRunHook } from "../../utils/processUserInput/surfaceCommandNotices.js";
import { sendQueuedNow, handleSendNowKey } from "./sendNow.js";
import { logError } from "../../utils/log.js";
import { Gfn, h8n } from "../../components/PromptInput/promptFlags.js";
import { r_s } from "../../remote/remoteMode.js";
import { rW } from "../../components/dialogs/dialogKinds.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { markChatEngaged, queueAgentMessage } from "../../tasks/LocalAgentTask/childWork.js";
import {
  appendAgentTranscriptMessage,
  sendMessageToAgent,
} from "../../tasks/LocalAgentTask/pendingMessages.js";
import {
  resumeAgentBackground,
  isResumeDenied,
  AgentResumeInProgressError,
  AgentStillStoppingError,
} from "../../tools/AgentTool/resumeAgent.js";
import { createQueueBusyCheck } from "../../utils/messageQueueIdle.js";
import { errorMessage } from "../../utils/errors.js";
import { injectUserMessageToTeammate } from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { NOOP_HELPERS } from "../../hooks/useCommandKeybindings.js";
import { Cursor } from "../../utils/Cursor.js";
import {
  normalizeInputDecorations,
  mapRangesToNfcOffsets,
} from "../../components/PromptInput/inputDecorations.js";
import { offsetDecorations } from "../../plugins/functionHooks/prompt/decorationSpans.js";
import { mergeTurnTags } from "../../utils/userTurnTags.js";
import { Up } from "../../utils/messageQueueManager.js";
import { shouldEscapeNdjsonForBridge } from "../../cli/ndjsonSafeStringify.js";
import { oae } from "../../utils/hooks.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

/**
 * 等待前置任务后，在仍需要时先等扫描或回合，再等回合结束。
 */
//@ chunk-18hwfzwa.js:1628953-1629068 placement
async function awaitScanThenTurn(h, x, D) {
  if (
    (await D?.catch(() => {
      return;
    }),
    !x())
  )
    return;
  if ((await Promise.race([h, loadingScansRead()]), x())) await h;
}
/**
 * 解析斜杠命令（支持 “命令:子命令” 与子命令映射），返回启用的命令。
 */
//@ chunk-18hwfzwa.js:1629068-1629379 placement
function resolveSlashCommand({ commandName: commandName, args: args, isMcp: isMcp }, L) {
  let ee = findCommand(commandName, L),
    ke = ee !== void 0 && isCommandEnabled(ee),
    [Re = "", ...Be] = args.split(/\s+/),
    We = !ke && !isMcp && Re !== "" ? findCommand(`${commandName}:${Re}`, L) : void 0,
    ze = ke ? ee : We;
  if (ze === void 0) return;
  let Xe = matchSubcommand(ze, We === void 0 ? args : Be.join(" ")),
    rt = Xe === void 0 ? void 0 : findCommand(Xe.targetName, L);
  return rt !== void 0 && isCommandEnabled(rt) ? rt : ze;
}
/**
 * 输入是否会发送给模型（普通提示、prompt 类命令或可被钩子处理的命令）。
 */
//@ chunk-18hwfzwa.js:1629379-1629688 placement
function mayReachModel({ value: h, mode: mode, skipSlashCommands: skipSlashCommands }, L) {
  if (mode === "bash" || mode === "poll-event") return !1;
  let ke = typeof h === "string" ? h : "",
    Be = mode === "prompt" && skipSlashCommands !== !0 && ke.startsWith("/") ? parseSlashCommand(ke) : null;
  if (Be === null) return !0;
  let He = resolveSlashCommand(Be, L);
  if (He === void 0) return !looksLikeCommand(Be.commandName) || mayRegisterCommands();
  return He.type === "prompt" || mayHookCommand(getCommandName(He));
}
//@ chunk-18hwfzwa.js:1629688-1629730 placement
function hte(h) {
  return h.name === "compact";
}
/**
 * 提交控制器：处理 Enter 提交——斜杠命令（local/local-jsx/prompt）、bash 模式、/exit、建议接受、队列与发送到代理，记录 onSubmit 遥测。
 */
//@ chunk-18hwfzwa.js:1629730-1644033 placement
class PromptSubmitController {
  #e;
  #t = null;
  #o = void 0;
  constructor(h) {
    this.#e = h;
  }
  bindHost(h) {
    this.#t = h;
  }
  #n() {
    if (!this.#t) throw Error("PromptSubmitController used before its host was bound");
    return this.#t;
  }
  submit = async (h, x, D) => {
    let startTime = performance.now(),
      {
        store: store,
        setAppState: setAppState,
        setSessionState: setSessionState,
        session: session,
        storageV5: storageV5,
        dialogStore: dialogStore,
        spinnerStore: spinnerStore,
        transcript: transcript,
        turn: turn,
        draft: draft,
        messageQueue: messageQueue,
        chrome: chrome,
        scope: scope,
        idleNudge: idleNudge,
        transport: transport,
        scrollPin: scrollPin,
        addNotification: addNotification,
      } = this.#e,
      { mainLoopModel: mainLoopModel, canUseTool: canUseTool, onBeforeQuery: onBeforeQuery } = this.#n(),
      po = D?.inputModeOverride ?? draft.mode,
      ao = po !== "bash" && cX.includes(h.trim()),
      co = ao && transport.activeRemote.isRemoteMode ? "/exit" : h,
      bo = D?.pastedContentsOverride ?? draft.pastedContents,
      isLoading = turn.getSnapshot().isLoading,
      Bo = !1,
      commands = scope.commands,
      { ideSelection: ideSelection, onDetachToCaller: onDetachToCaller } = chrome.getSnapshot(),
      Wo =
        po !== "bash" && co.trim().startsWith("/")
          ? findCommand(splitSlashCommandInput(co.trim()).name, commands)
          : void 0,
      mn = Wo?.type === "local-jsx" && Wo.keepsScrollPosition === !0 && co.startsWith("/") ? Wo : void 0;
    if (!mn) scrollPin.repin(!1, "onSubmit");
    (dialogStore.dismissKind(RESUME_COMPACT_DIALOG.kind),
      dialogStore.dismissKind(COLD_RESUME_QUOTA),
      dialogStore.dismissKind(NEWER_MODEL_OFFER_2),
      Sv(),
      dialogStore.dismissKind(AUTOCOMPACT_OFFER));
    let Cn = isFrozenMarker(D?.composerEnter) && D?.inputSource !== "suggestion_accepted",
      No = !1,
      vo =
        D?.fromKeybinding || No
          ? void 0
          : { display: prependModeCharacterToInput_3(h, po), pastedContents: bo };
    if (onDetachToCaller !== void 0 && (ao || (Wo?.name === "exit" && Wo.type !== "prompt"))) {
      if (vo) (draft.clear(), x.clearBuffer(), Dvt(vo, storageV5, po));
      onDetachToCaller();
      return;
    }
    if (co.trim().startsWith("/")) {
      let trimmed = rpe(co, bo).trim(),
        { name: Wn, args: args } = splitSlashCommandInput(trimmed),
        Zn = findCommand(Wn, commands),
        Un = Zn && isCommandEnabled(Zn) ? Zn : void 0;
      if (Un?.name === "clear") idleNudge.onClearSubmitted();
      let dr = isImmediateCommand(Un, args, this.#e.presentation),
        or = turn.guard.isActive || !1,
        pr = M7s(Un) && (po !== "bash" || D?.fromKeybinding === !0),
        Qn = (or && (dr || D?.fromKeybinding)) || pr,
        ur = Un?.type === "local" && or && dr;
      if (Un && ((Qn && Un.type === "local-jsx") || ur)) {
        if (isSlashCommandBlockedByEndedByModel(Un, store.getState().endedByModel)) {
          addNotification({
            key: "immediate-ended-by-model",
            kind: "feedback",
            text: withTaskSuffix(
              "Claude ended this conversation. Start a new session (or /clear) to continue.",
            ),
            priority: "immediate",
          });
          return;
        }
        let Ir = resolveCommandDialog(Un);
        if (Un.type === "local-jsx" && !Ir) {
          (logFeatureBad(cmdFeature(Un.name), "cmd_local_jsx_no_dialog_resolution"),
            addNotification({
              key: `immediate-${Un.name}`,
              kind: "feedback",
              text: commandUnavailableMessage(Un),
              priority: "immediate",
            }));
          return;
        }
        if (h.trim() === draft.value.trim()) (draft.clear(), x.clearBuffer());
        let Pr = createPromptHistoryWriter({
            entry: vo,
            name: Wn,
            typed: args,
            write: (Zr) => Dvt(Zr, storageV5, po),
          }),
          filtered = parsePastedRefs(co).filter(
            (Zr) => bo[Zr.id]?.type === "text" && !bo[Zr.id]?.unavailable,
          ),
          Gn = filtered.length,
          reduced = filtered.reduce((Zr, wr) => Zr + (bo[wr.id]?.content.length ?? 0), 0);
        if (
          (logEvent("tengu_paste_text", { pastedTextCount: Gn, pastedTextBytes: reduced }),
          logEvent("tengu_immediate_command_executed", {
            commandName: shippedCommandNameForAnalytics(Un.name),
            fromKeybinding: D?.fromKeybinding ?? !1,
          }),
          Un.type === "local")
        ) {
          let Zr = Ypt();
          (runLocalCommandFromRepl({
            command: Un,
            commandName: Wn,
            args: args,
            context: {
              ...turn.buildToolUseContext(
                transcript.getSnapshot(),
                [],
                createAbortController(),
                mainLoopModel,
              ),
              isMidTurn: !0,
              dispatchedAsImmediate: dr,
            },
            printRows: turn.appendAfterTurn,
            ranAs: Pr,
          }).finally(() => Xpt(Zr)),
            this.#s({ toast: !0 }));
        } else if (Ir) {
          let Zr = Ypt();
          this.#c({
            command: Un,
            commandName: Wn,
            commandArgs: args,
            dispatchedAsImmediate: dr,
            isMidTurn: or,
            besideTurns: pr,
            loadDialog: Ir,
            mainLoopModel: mainLoopModel,
            composerEnter: D?.composerEnter,
            ranAs: Pr,
          }).finally(() => Xpt(Zr));
        }
        return;
      }
    }
    if (transport.refuseSubmit(co, po, { sentByPerson: Cn, pastedContents: bo })) return;
    let isRemoteMode = transport.activeRemote.isRemoteMode,
      kn = (!isLoading && !0) || isRemoteMode;
    if (
      !D?.fromKeybinding &&
      po === "bash" &&
      !parsePastedRefs(co).some((Kn) => !Kn.match.startsWith("[Image"))
    )
      prependToShellHistoryCache(session, co.trim());
    let startsWith = co.trim().startsWith("/"),
      bn = randomUUID_15(),
      Go = D?.inputModeOverride !== void 0 && (D.fromKeybinding === !0 || D.keepsComposer === !0),
      hn =
        D?.leavesIdeSelection !== !0 && (ideSelection?.source !== "diff" || (!startsWith && po !== "bash")),
      cameBack = draft.getSnapshot().cameBack;
    if (kn && !Go) draft.setMode("prompt");
    if (kn) {
      if (hn) chrome.consumeIdeSelection(bn);
    }
    if (draft.stashedPrompt !== void 0 && !startsWith && kn)
      (draft.popStash("outside"),
        addNotification({
          key: "stash-restored",
          kind: "feedback",
          text: "Draft restored",
          priority: "high",
          timeoutMs: 5000,
        }));
    else if (kn) {
      if (!D?.fromKeybinding && !D?.keepsComposer) draft.clear();
    }
    if (!startsWith && po === "prompt") recordSubmitTime();
    if (kn) {
      if ((turn.markSubmit(), x.clearBuffer(), !startsWith && po === "prompt" && !isRemoteMode && !htt()))
        (turn.stream.setUserInputOnProcessing(co, { kind: "human" }), turn.resetTiming());
    }
    let Xo = po === "prompt" && !startsWith ? this.#i() : void 0,
      Sn =
        Xo === void 0
          ? void 0
          : D?.sendNow === !0
            ? "input_send_now_key"
            : shouldUseResponsiveMode({
                  text: co,
                  pastedContents: bo,
                  isSentByPerson: Cn,
                  wait: D?.wait === !0,
                })
              ? "input_send_now_responsive_enter"
              : void 0,
      submit = transport.submit(co, {
        inputMode: po,
        pastedContents: bo,
        fromKeybinding: D?.fromKeybinding ?? !1,
        sentByPerson: Cn,
        recordHistory: ({ startsTurn: startsTurn }) => {
          if (!vo || Evt()) return;
          if (startsTurn) ySe(vo, storageV5, { submitMode: po });
          else Dvt(vo, storageV5, po);
        },
      });
    if (submit) {
      let Kn = Ypt(),
        Wn = void 0;
      try {
        Wn = await submit;
      } finally {
        Xpt(Kn);
      }
      if (Wn?.handBack) {
        if ((chrome.restoreIdeSelectionConsumedBy(bn), draft.value.trim() === ""))
          (draft.replaceValue(co), draft.setPastedContents(bo));
        else if (vo && !Evt()) Dvt(vo, storageV5, po);
      } else if (Xo !== void 0 && Sn !== void 0 && Wn?.sent && this.#i() === Xo)
        if (Sn === "input_send_now_responsive_enter" && Xo.workerSendsNow() === void 0)
          logFeatureSad(Sn, "remote_version_unknown");
        else this.#a(Xo, Sn, Wn.uuid);
      return;
    }
    let any = parsePastedRefs(co).some((Kn) => bo[Kn.id]?.type === "text");
    using trackSubmission = messageQueue.trackSubmission({
      agentId: mainAgentId(),
      mode: po,
      value: co,
      uuid: bn,
    });
    let cn = kn ? Avt(() => any || mayReachModel({ value: co, mode: po }, commands), this.#o) : void 0;
    if (cn) {
      this.#o = cn;
      try {
        await cn;
      } finally {
        if (this.#o === cn) this.#o = void 0;
      }
    }
    let of = sN.of(session);
    if (of.pending > 0) await of.tail;
    let wn = getMainLoopModelFromState(store.getState()),
      mr = transcript.getSnapshot().length;
    if (
      (await handlePromptSubmit({
        presentation: this.#e.presentation,
        input: co,
        uuid: bn,
        submittedAtMs: startTime,
        helpers: x,
        turn: turn,
        queue: messageQueue,
        mode: po,
        commands: commands,
        onInputChange: Go
          ? (Kn) => {
              if ((draft.replaceValue(Kn), Kn === "")) draft.setMode("prompt");
            }
          : draft.replaceValue,
        onPromptCameBack: draft.markCameBack,
        getCurrentInput: () => draft.value,
        composerClearedAtEnter: (kn && !D?.fromKeybinding) || D?.keepsComposer,
        ...!1,
        restoreHandedBackPrompt: (Kn) => {
          (turn.consumeRateLimitAutoContinuePrefill(), restorePromptAfterCancel(draft, Kn));
        },
        onPromptHandedBack: chrome.restoreIdeSelectionConsumedBy,
        setPastedContents: draft.setPastedContents,
        messages: transcript.getSnapshot(),
        mainLoopModel: wn,
        suppressWorkflowKeyword: D?.suppressWorkflowKeyword,
        resumesStaleQuotaWait: D?.resumesStaleQuotaWait,
        wait: D?.wait,
        inputSource: D?.inputSource,
        pastedContents: bo,
        keyboard: D?.keyboard,
        composerEnter: D?.composerEnter,
        session: session,
        historyEntry: vo,
        onSubmitProceed: kn || D?.keepsComposer ? void 0 : () => draft.setMode("prompt"),
        onSubmitCancelRewind: kn
          ? () => {
              if (!Go) draft.setMode(po);
              if (cameBack) draft.markCameBack();
            }
          : void 0,
        replaceDraftWithNextInput: (Kn) => this.#r(Kn),
        ideSelection: ideSelection,
        takeIdeSelectionForQueue:
          hn && po !== "bash" && (ideSelection?.text || ideSelection?.filePath)
            ? () => {
                if (!kn) chrome.consumeIdeSelection(bn);
                return ideSelection;
              }
            : void 0,
        getAppState: () => store.getState(),
        setAppState: setSessionState,
        querySource: getQuerySourceForREPL(),
        onBeforeQuery: onBeforeQuery,
        canUseTool: canUseTool,
        addNotification: addNotification,
        streamMode: spinnerStore.get().mode,
        deferSlashToEngine: hte,
        storageV5: storageV5,
      }),
      mn &&
        transcript
          .getSnapshot()
          .slice(mr)
          .some(
            (Kn) =>
              Kn.uuid === bn ||
              (Kn.type === "system" &&
                Kn.subtype === "local_command" &&
                Kn.commandRun?.command === getCommandName(mn)),
          ))
    )
      scrollPin.repin(!1, "commandOutput");
    if (startsWith || isLoading) this.#s({ toast: !0 });
  };
  #s({ toast: h }) {
    let { draft: draft, addNotification: addNotification } = this.#e;
    if (draft.stashedPrompt === void 0 || draft.value.trim() !== "") return;
    if ((draft.popStash("outside"), h))
      addNotification({
        key: "stash-restored",
        kind: "feedback",
        text: "Draft restored",
        priority: "high",
        timeoutMs: 5000,
      });
  }
  #r(h) {
    let { draft: draft } = this.#e;
    (draft.setMode("prompt"), draft.replaceValue(h));
  }
  async #c({
    command: h,
    commandName: x,
    commandArgs: D,
    dispatchedAsImmediate: L,
    isMidTurn: ee,
    besideTurns: ke,
    loadDialog: Re,
    mainLoopModel: Be,
    composerEnter: He,
    ranAs: We,
  }) {
    let {
        transcript: transcript,
        turn: turn,
        messageQueue: messageQueue,
        scope: scope,
        addNotification: addNotification,
      } = this.#e,
      localJsx = scope.localJsx,
      Ot = !1,
      Et = isPromptHookObserved() ? "" : D,
      Dt = snapshotHookRegistration(),
      Lt,
      oo = (po, ao) => {
        ((Ot = !0), Lt?.close());
        let co = [];
        if (po && ao?.shouldQuery)
          messageQueue.enqueue({
            agentId: mainAgentId(),
            value: po,
            mode: "prompt",
            origin: { kind: "auto-continuation" },
          });
        else if (po && ao?.display !== "skip") {
          if (
            (addNotification({
              key: `immediate-${h.name}`,
              kind: "feedback",
              text: hA(po),
              priority: "immediate",
            }),
            this.#e.presentation !== "fullscreen")
          )
            co.push(
              createCommandInputMessage(formatCommandInputTags(getCommandName(h), Et)),
              createCommandInputMessage(
                `<${LOCAL_COMMAND_STDOUT}>${escapeXml(po)}</${LOCAL_COMMAND_STDOUT}>`,
                { commandRun: buildCommandRunInfo(h, Et) },
              ),
            );
        }
        if (ao?.metaMessages?.length)
          co.push(
            ...ao.metaMessages.map((metaMessage) =>
              createUserMessage({ content: metaMessage, isMeta: !0, origin: ao.metaMessagesOrigin }),
            ),
          );
        if ((turn.appendAfterTurn(co), this.#s({ toast: !ao?.nextInput }), ao?.nextInput))
          if (ao.submitNextInput)
            messageQueue.enqueue({
              agentId: mainAgentId(),
              value: ao.nextInput,
              mode: "prompt",
              origin: { kind: "auto-continuation" },
            });
          else this.#r(ao.nextInput);
      },
      toolUseContext = turn.buildToolUseContext(transcript.getSnapshot(), [], createAbortController(), Be),
      io = await dispatchCommandRunHooks({
        input: iUo(h, D, this.#e.presentation),
        engine: {
          run: async (po) => {
            if (!hasHookRegistrationChanged(Dt)) Et = po;
            return (
              We(po),
              (await Re()).call(
                oo,
                {
                  ...toolUseContext,
                  isMidTurn: ee,
                  dispatchedAsImmediate: L,
                  appendAfterTurn: turn.appendAfterTurn,
                  runsBesideTurns: ke,
                  ...(isFrozenMarker(He) && { submissionOrigin: { kind: "human" } }),
                },
                po,
                x,
              )
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
        queued: void 0,
      });
    if ((logFeatureOk(cmdFeature(h.name), getTipAttribution(h.name)), io.kind === "answered")) {
      if (hasSingleCommandRunHook(getCommandName(h))) {
        if (!hasHookRegistrationChanged(Dt)) Et = D;
        We(D);
      }
      oo(io.text, io.context === void 0 ? void 0 : { metaMessages: [...io.context] });
      return;
    }
    let ran = io.ran;
    if (ran && !Ot)
      Lt = localJsx.show(ran, {
        commandName: getCommandName(h),
        immediate: !0,
        hidesPrompt: !1,
        retireAtTurnBoundary: !0,
        holdsQueue: !ke,
      });
  }
  remoteSendsNow = {
    subscribe: (h) => {
      let subscribe = this.#e.turn.subscribe(h),
        subscribe_2 = this.#e.transport.subscribe(h),
        subscribe_3 = this.#e.draft.subscribe(h),
        subscribe_4 = this.#e.transcript.subscribe(h);
      return () => {
        (subscribe(), subscribe_2(), subscribe_3(), subscribe_4());
      };
    },
    getSnapshot: () => this.#e.draft.mode === "prompt" && this.#i()?.workerSendsNow() === !0,
  };
  submitEmpty = () => {
    let mode = this.#e.draft.mode;
    if (sendQueuedNow(this.#l(mode))) return !0;
    let x = this.#i();
    return x !== void 0 && Gfn() && mode === "prompt" && this.#a(x, "input_send_queued_now", void 0);
  };
  sendQueuedNow = (h, x) => {
    let D = () => this.#e.lowLatency.sendQueuedNow(x);
    if (x === void 0) {
      if (handleSendNowKey({ ...this.#l(h), deliverWithoutCancel: D })) return !0;
      let L = this.#i();
      return L !== void 0 && h === "prompt" && this.#a(L, "input_send_now_key", void 0);
    }
    return h === "prompt" && h8n() && D();
  };
  #i() {
    let activeRemote = this.#e.transport.activeRemote;
    return activeRemote.isRemoteMode &&
      r_s(activeRemote) &&
      activeRemote.caps.sendNow &&
      this.#e.turn.isExternalLoading &&
      !activeRemote.holdsSends()
      ? activeRemote
      : void 0;
  }
  #a(h, x, D) {
    if (h.workerSendsNow() === !1)
      return (
        logFeatureSad(x, "remote_not_supported"),
        this.#e.addNotification({
          key: "remote-send-now-unavailable",
          kind: "feedback",
          text: "Send now isn't available here \xB7 esc to interrupt and send",
          priority: "immediate",
        }),
        !0
      );
    return (
      h.sendQueuedNow(D).then((L) => {
        switch (L) {
          case "delivering":
            logFeatureOk(x);
            return;
          case "stopped":
            logFeatureSad(x, "fell_back_to_cancel");
            return;
          case "nothing_waiting":
            logFeatureSad(x, "remote_nothing_waiting");
            return;
          case "not_asked":
            logFeatureSad(x, "remote_not_asked");
            return;
          case "failed":
            logFeatureBad(x, "remote_request_failed");
            return;
        }
      }),
      !0
    );
  }
  #l(h) {
    let { store: store, spinnerStore: spinnerStore, turn: turn, messageQueue: messageQueue } = this.#e,
      { mainLoopModel: mainLoopModel } = this.#n();
    return {
      mode: h,
      turn: turn,
      queue: messageQueue,
      interruptRunningTurn: turn.interruptForSubmit,
      streamMode: spinnerStore.get().mode,
      mainLoopModel: mainLoopModel,
      getAppState: () => store.getState(),
    };
  }
  submitToAgent = async (h, x, D, L) => {
    let {
        taskRegistry: taskRegistry,
        transcript: transcript,
        turn: turn,
        draft: draft,
        messageQueue: messageQueue,
        addNotification: addNotification,
      } = this.#e,
      { mainLoopModel: mainLoopModel, canUseTool: canUseTool } = this.#n(),
      rt = rW(h, L ?? draft.pastedContents);
    if (isLocalAgent(x)) {
      markChatEngaged(x.id, taskRegistry);
      let kt = createUserMessage({ content: rt, origin: { kind: "human" } });
      if ((appendAgentTranscriptMessage(x.id, kt, taskRegistry), x.status === "running"))
        queueAgentMessage(x.id, rt, taskRegistry, {
          isMeta: !0,
          origin: { kind: "human" },
          shownAs: kt.uuid,
        });
      else
        resumeAgentBackground({
          agentId: x.id,
          prompt: rt,
          promptIsMeta: !0,
          promptOrigin: { kind: "human" },
          toolUseContext: turn.buildToolUseContext(
            transcript.getSnapshot(),
            [],
            new AbortController(),
            mainLoopModel,
          ),
          liveTranscript: createQueueBusyCheck(messageQueue, () => transcript.getSnapshot()),
          canUseTool: canUseTool,
          userInitiated: !0,
        })
          .then((At) => {
            if (isResumeDenied(At))
              addNotification({
                key: `resume-agent-failed-${x.id}`,
                kind: "warning",
                text: `Failed to resume agent: ${At.deniedByPlugin}`,
                color: "error",
                priority: "low",
              });
          })
          .catch((At) => {
            if (At instanceof AgentResumeInProgressError || At instanceof AgentStillStoppingError) {
              if (
                sendMessageToAgent(x.id, rt, taskRegistry, {
                  isMeta: !0,
                  origin: { kind: "human" },
                  userInitiated: !0,
                  shownAs: kt.uuid,
                })
              ) {
                logForDebugging("resumeAgentBackground lost the resume lock; typed message queued");
                return;
              }
              addNotification({
                key: `resume-agent-failed-${x.id}`,
                kind: "warning",
                text: "Failed to resume agent: it is no longer running; message not delivered",
                color: "error",
                priority: "low",
              });
              return;
            }
            (logForDebugging(`resumeAgentBackground failed: ${errorMessage(At)}`),
              addNotification({
                key: `resume-agent-failed-${x.id}`,
                kind: "warning",
                text: `Failed to resume agent: ${errorMessage(At)}`,
                color: "error",
                priority: "low",
              }));
          });
    } else injectUserMessageToTeammate(x.id, rt, taskRegistry, { kind: "human" });
    (draft.clear(), D.clearBuffer());
  };
  submitSurveyFollowUp = (h) => {
    this.submit(h, NOOP_HELPERS, { inputModeOverride: "prompt" }).catch((x) => {
      logForDebugging(`Survey feedback request failed: ${x instanceof Error ? x.message : String(x)}`);
    });
  };
  readDraft = () => {
    let { draft: draft } = this.#e;
    return { text: draft.value, cursor: draft.cursorOffset };
  };
  fillDraft = (h, x, D) => {
    let { draft: draft, dialogStore: dialogStore } = this.#e,
      { decorations: decorations, cursor: cursor } = D ?? {};
    if (dialogStore.getState().open.length > 0) return { isFilled: !1, refusal: "dialog" };
    let Be = decorations !== void 0 && h !== "",
      He = Be && x === "insert" ? draft.value.normalize("NFC") : "",
      We = x === "replace" ? 0 : draft.value.length;
    switch (x) {
      case "replace":
        this.#r(h);
        break;
      case "append":
        draft.replaceValue(draft.value + h);
        break;
      case "insert":
        We = draft.insertText(h, "outside");
        break;
    }
    if (cursor !== void 0) {
      let fromText = Cursor.fromText(draft.value, 80, cursor);
      draft.setCursorOffset(
        cursor >= draft.value.length
          ? draft.value.length
          : fromText.measuredText.snapToGraphemeBoundary(fromText.snapOutOfPlaceholder(cursor, "start")),
      );
    } else if (x !== "insert" && draft.cursorOffset !== draft.value.length)
      draft.setCursorOffset(draft.value.length);
    let sliced = He.slice(0, We);
    if (
      Be &&
      (x === "insert"
        ? draft.value.normalize("NFD").startsWith((sliced + h).normalize("NFD"))
        : draft.value.startsWith(h, We))
    ) {
      let rt = normalizeInputDecorations(decorations, h);
      draft.paint(
        normalizeInputDecorations(
          x === "insert" ? mapRangesToNfcOffsets(rt, h, sliced) : offsetDecorations(rt, We),
          draft.value,
        ),
      );
    }
    return { isFilled: !0 };
  };
  suggestDraft = (h, x) => {
    let { draft: draft, turn: turn, setAppState: setAppState } = this.#e;
    if (!(h.trim() !== "" && draft.value === "" && !turn.getSnapshot().isLoading)) return { isShown: !1 };
    return (
      setAppState((Re) => ({
        ...Re,
        promptSuggestion: { status: "generated", text: h, generationRequestId: x },
      })),
      { isShown: !0 }
    );
  };
  popQueuedIntoDraft = () => {
    let { draft: draft, setAppState: setAppState, messageQueue: messageQueue, chrome: chrome } = this.#e,
      popAllEditable = messageQueue.popAllEditable(draft.value, 0, draft.pastedContents);
    if (!popAllEditable) return;
    if ((draft.replaceValue(popAllEditable.text), popAllEditable.unpassed)) draft.markCameBack();
    if (
      (draft.setMode(popAllEditable.mode),
      chrome.returnIdeSelection(popAllEditable.ideSelection),
      setAppState((ke) => (ke.queueEditIndex === null ? ke : { ...ke, queueEditIndex: null })),
      popAllEditable.images.length > 0)
    )
      draft.setPastedContents((ke) => mergeTurnTags(ke, popAllEditable.images));
  };
  cancelAndDrainPending = () => {
    let { turn: turn, messageQueue: messageQueue } = this.#e,
      {
        userInputOnProcessing: userInputOnProcessing,
        followingPromptsOnProcessing: followingPromptsOnProcessing,
      } = turn.stream.getSnapshot(),
      ee =
        turn.stream.placeholderTracker.pending && userInputOnProcessing
          ? [userInputOnProcessing, ...followingPromptsOnProcessing.map((He) => He.text)].join(`
`)
          : void 0,
      ke = [];
    for (;;) {
      let He = messageQueue.getCommandQueue().find(Up)?.pastedContents ?? {},
        popEditableAt = messageQueue.popEditableAt(0, "", 0);
      if (!popEditableAt) break;
      let ze = new Set(
          popEditableAt.images
            .filter((image) => image.type === "image" && !(image.id in He))
            .map((rt) => rt.id),
        ),
        reduceRight = parsePastedRefs(popEditableAt.text)
          .filter((rt) => rt.match.startsWith("[Image") && ze.has(rt.id))
          .reduceRight(
            (rt, kt) => rt.slice(0, kt.index) + rt.slice(kt.index + kt.match.length).replace(/^ /, ""),
            popEditableAt.text,
          );
      if (reduceRight) {
        let rt = rpe(reduceRight, Object.fromEntries(popEditableAt.images.map((image) => [image.id, image])));
        ke.push(
          rt.trimStart().startsWith("/") && !popEditableAt.text.trimStart().startsWith("/")
            ? popEditableAt.text
            : rt,
        );
      }
    }
    let Re =
      ke.join(`
`) || void 0;
    return (
      turn.cancel("local"),
      [ee, Re].filter(Boolean).join(`

`) || void 0
    );
  };
}
//@ chunk-18hwfzwa.js:1644033-1644107 placement
function Evt() {
  return shouldEscapeNdjsonForBridge() || (oae() && getPluginRegistry().unlatchedAbsentManagedIds.size > 0);
}
//@ chunk-18hwfzwa.js:1644107-1644111 placement
j();

export { PromptSubmitController, hte, awaitScanThenTurn, resolveSlashCommand, mayReachModel };
