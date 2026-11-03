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
import { randomUUID } from "crypto";
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { EXIT_COMMAND_WORDS, handlePromptSubmit } from "../../utils/handlePromptSubmit.js";
import { RESUME_COMPACT_DIALOG } from "./resumeCompactOffer.js";
import {
  COLD_RESUME_QUOTA,
  NEWER_MODEL_OFFER as NEWER_MODEL_OFFER_2,
  AUTOCOMPACT_OFFER,
} from "../../components/nudges/nudgeIds.js";
import { endDrawnOffer } from "../../utils/newerModelOffer.js";
import { isFrozenMarker } from "../../utils/frozenMarkers.js";
import { prependModeCharacterToInput as prependModeCharacterToInput_3 } from "../../components/PromptInput/inputModes.js";
import { addHistoryEntryNoUndo, addPastedEntry, parsePastedRefs, addHistoryEntry } from "../../history.js";
import { runsBesideTurns } from "../../utils/promptSubmissionOrigin.js";
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
import { bumpClawdPoseRun, releaseKeptPoseIfStale } from "../../components/VirtualMessageList.js";
import { runLocalCommandFromRepl } from "./runLocalCommand.js";
import { createAbortController } from "../../utils/abortController.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { prependToShellHistoryCache } from "../../utils/suggestions/shellHistoryCompletion.js";
import { recordSubmitTime, mainAgentId } from "../../bootstrap/state.js";
import { remoteSessionAwaits } from "../../utils/remoteSessionCommands.js";
import { env } from "../../utils/env.js";
import { shouldUseResponsiveMode } from "../../plugins/bundled/responsiveMode.js";
import { scanQueueBeforeTurn } from "./ComposerChrome.js";
import { switchSerializerSlot } from "../../utils/model/modelSwitchHooks.js";
import { getMainLoopModelFromState } from "../../hooks/useMainLoopModel.js";
import { restorePromptAfterCancel } from "./SessionController.js";
import { getQuerySourceForREPL } from "../../utils/promptCategory.js";
import { isPromptHookObserved } from "../../utils/telemetry/sessionTracing.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
} from "../../utils/plugins/functionHooks/hookRegistration.js";
import { boldDirectMemberMessage } from "../../utils/directMemberMessage.js";
import {
  createCommandInputMessage,
  formatCommandInputTags,
  createUserMessage,
} from "../../utils/messages.js";
import { LOCAL_COMMAND_STDOUT } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { dispatchCommandRunHooks, commandRunEvent } from "../../plugins/functionHooks/commandRunDispatch.js";
import { getTipAttribution } from "../../services/tips/tipIds.js";
import { hasSingleCommandRunHook } from "../../utils/processUserInput/surfaceCommandNotices.js";
import { sendQueuedNow, handleSendNowKey } from "./sendNow.js";
import { logError } from "../../utils/log.js";
import { isQueuedSendNowEnabled, isSendNowKeyEnabled } from "../../components/PromptInput/promptFlags.js";
import { hasRemoteControlChannel } from "../../remote/remoteMode.js";
import { requestDialogWrapper } from "../../components/dialogs/dialogKinds.js";
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
import { isRefillableInput } from "../../utils/messageQueueManager.js";
import { shouldEscapeNdjsonForBridge } from "../../cli/ndjsonSafeStringify.js";
import { areHooksEnabled } from "../../utils/hooks.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1628953-1629068 placement
/**
 * 等待前置任务后，在仍需要时先等扫描或回合，再等回合结束。
 */
async function awaitScanThenTurn(activeMessageQueue, x, D) {
  await D?.catch(() => {
    return;
  });
  if (!x()) return;
  await Promise.race([activeMessageQueue, loadingScansRead()]);
  if (x()) await activeMessageQueue;
}
//@ chunk-18hwfzwa.js:1629068-1629379 placement
/**
 * 解析斜杠命令（支持 “命令:子命令” 与子命令映射），返回启用的命令。
 */
function resolveSlashCommand({ commandName, args, isMcp }, L) {
  let command = findCommand(commandName, L);
  let ke = command !== undefined && isCommandEnabled(command);
  let [Re = "", ...Be] = args.split(/\s+/);
  let We = !ke && !isMcp && Re !== "" ? findCommand(`${commandName}:${Re}`, L) : undefined;
  let ze = ke ? command : We;
  if (ze === undefined) return;
  let Xe = matchSubcommand(ze, We === undefined ? args : Be.join(" "));
  let rt = Xe === undefined ? undefined : findCommand(Xe.targetName, L);
  return rt !== undefined && isCommandEnabled(rt) ? rt : ze;
}
//@ chunk-18hwfzwa.js:1629379-1629688 placement
/**
 * 输入是否会发送给模型（普通提示、prompt 类命令或可被钩子处理的命令）。
 */
function mayReachModel({ value: h, mode, skipSlashCommands }, commands) {
  if (mode === "bash" || mode === "poll-event") return false;
  let ke = typeof h === "string" ? h : "";
  let Be =
    mode === "prompt" && skipSlashCommands !== true && ke.startsWith("/") ? parseSlashCommand(ke) : null;
  if (Be === null) return true;
  let slashCommand = resolveSlashCommand(Be, commands);
  if (slashCommand === undefined) return !looksLikeCommand(Be.commandName) || mayRegisterCommands();
  return slashCommand.type === "prompt" || mayHookCommand(getCommandName(slashCommand));
}
//@ chunk-18hwfzwa.js:1629688-1629730 placement
function isCompactCommand(h) {
  return h.name === "compact";
}
//@ chunk-18hwfzwa.js:1629730-1644033 placement
/**
 * 提交控制器：处理 Enter 提交——斜杠命令（local/local-jsx/prompt）、bash 模式、/exit、建议接受、队列与发送到代理，记录 onSubmit 遥测。
 */
class PromptSubmitController {
  #e;
  #t = null;
  #o = undefined;
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
    let submittedAtMs = performance.now();
    let {
      store,
      setAppState,
      setSessionState,
      session,
      storageV5,
      dialogStore,
      spinnerStore,
      transcript,
      turn,
      draft,
      messageQueue,
      chrome,
      scope,
      idleNudge,
      transport,
      scrollPin,
      addNotification,
    } = this.#e;
    let { mainLoopModel, canUseTool, onBeforeQuery } = this.#n();
    let po = D?.inputModeOverride ?? draft.mode;
    let ao = po !== "bash" && EXIT_COMMAND_WORDS.includes(h.trim());
    let co = ao && transport.activeRemote.isRemoteMode ? "/exit" : h;
    let bo = D?.pastedContentsOverride ?? draft.pastedContents;
    let isLoading = turn.getSnapshot().isLoading;
    let Bo = false;
    let commands = scope.commands;
    let { ideSelection, onDetachToCaller } = chrome.getSnapshot();
    let Wo =
      po !== "bash" && co.trim().startsWith("/")
        ? findCommand(splitSlashCommandInput(co.trim()).name, commands)
        : undefined;
    let mn =
      Wo?.type === "local-jsx" && Wo.keepsScrollPosition === true && co.startsWith("/") ? Wo : undefined;
    if (!mn) scrollPin.repin(false, "onSubmit");
    dialogStore.dismissKind(RESUME_COMPACT_DIALOG.kind);
    dialogStore.dismissKind(COLD_RESUME_QUOTA);
    dialogStore.dismissKind(NEWER_MODEL_OFFER_2);
    endDrawnOffer();
    dialogStore.dismissKind(AUTOCOMPACT_OFFER);
    let Cn = isFrozenMarker(D?.composerEnter) && D?.inputSource !== "suggestion_accepted";
    let No = false;
    let vo =
      D?.fromKeybinding || No
        ? undefined
        : {
            display: prependModeCharacterToInput_3(h, po),
            pastedContents: bo,
          };
    if (onDetachToCaller !== undefined && (ao || (Wo?.name === "exit" && Wo.type !== "prompt"))) {
      if (vo) {
        draft.clear();
        x.clearBuffer();
        addHistoryEntryNoUndo(vo, storageV5, po);
      }
      onDetachToCaller();
      return;
    }
    if (co.trim().startsWith("/")) {
      let trimmed = addPastedEntry(co, bo).trim();
      let { name: Wn, args } = splitSlashCommandInput(trimmed);
      let command = findCommand(Wn, commands);
      let Un = command && isCommandEnabled(command) ? command : undefined;
      if (Un?.name === "clear") idleNudge.onClearSubmitted();
      let dr = isImmediateCommand(Un, args, this.#e.presentation);
      let isActive = turn.guard.isActive || false;
      let pr = runsBesideTurns(Un) && (po !== "bash" || D?.fromKeybinding === true);
      let Qn = (isActive && (dr || D?.fromKeybinding)) || pr;
      let ur = Un?.type === "local" && isActive && dr;
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
        let commandDialog = resolveCommandDialog(Un);
        if (Un.type === "local-jsx" && !commandDialog) {
          logFeatureBad(cmdFeature(Un.name), "cmd_local_jsx_no_dialog_resolution");
          addNotification({
            key: `immediate-${Un.name}`,
            kind: "feedback",
            text: commandUnavailableMessage(Un),
            priority: "immediate",
          });
          return;
        }
        if (h.trim() === draft.value.trim()) {
          draft.clear();
          x.clearBuffer();
        }
        let ranAs = createPromptHistoryWriter({
          entry: vo,
          name: Wn,
          typed: args,
          write: (Zr) => addHistoryEntryNoUndo(Zr, storageV5, po),
        });
        let filtered = parsePastedRefs(co).filter(
          (Zr) => bo[Zr.id]?.type === "text" && !bo[Zr.id]?.unavailable,
        );
        let pastedTextCount = filtered.length;
        let pastedTextBytes = filtered.reduce((acc, wr) => acc + (bo[wr.id]?.content.length ?? 0), 0);
        logEvent("tengu_paste_text", {
          pastedTextCount,
          pastedTextBytes,
        });
        logEvent("tengu_immediate_command_executed", {
          commandName: shippedCommandNameForAnalytics(Un.name),
          fromKeybinding: D?.fromKeybinding ?? false,
        });
        if (Un.type === "local") {
          let Zr = bumpClawdPoseRun();
          runLocalCommandFromRepl({
            command: Un,
            commandName: Wn,
            args,
            context: {
              ...turn.buildToolUseContext(
                transcript.getSnapshot(),
                [],
                createAbortController(),
                mainLoopModel,
              ),
              isMidTurn: true,
              dispatchedAsImmediate: dr,
            },
            printRows: turn.appendAfterTurn,
            ranAs,
          }).finally(() => releaseKeptPoseIfStale(Zr));
          this.#s({
            toast: true,
          });
        } else if (commandDialog) {
          let Zr = bumpClawdPoseRun();
          this.#c({
            command: Un,
            commandName: Wn,
            commandArgs: args,
            dispatchedAsImmediate: dr,
            isMidTurn: isActive,
            besideTurns: pr,
            loadDialog: commandDialog,
            mainLoopModel,
            composerEnter: D?.composerEnter,
            ranAs,
          }).finally(() => releaseKeptPoseIfStale(Zr));
        }
        return;
      }
    }
    if (
      transport.refuseSubmit(co, po, {
        sentByPerson: Cn,
        pastedContents: bo,
      })
    )
      return;
    let isRemoteMode = transport.activeRemote.isRemoteMode;
    let kn = (!isLoading && true) || isRemoteMode;
    if (
      !D?.fromKeybinding &&
      po === "bash" &&
      !parsePastedRefs(co).some((Kn) => !Kn.match.startsWith("[Image"))
    )
      prependToShellHistoryCache(session, co.trim());
    let Fn = co.trim().startsWith("/");
    let bn = randomUUID();
    let Go = D?.inputModeOverride !== undefined && (D.fromKeybinding === true || D.keepsComposer === true);
    let hn = D?.leavesIdeSelection !== true && (ideSelection?.source !== "diff" || (!Fn && po !== "bash"));
    let cameBack = draft.getSnapshot().cameBack;
    if (kn && !Go) draft.setMode("prompt");
    if (kn) {
      if (hn) chrome.consumeIdeSelection(bn);
    }
    if (draft.stashedPrompt !== undefined && !Fn && kn) {
      draft.popStash("outside");
      addNotification({
        key: "stash-restored",
        kind: "feedback",
        text: "Draft restored",
        priority: "high",
        timeoutMs: 5000,
      });
    } else if (kn) {
      if (!D?.fromKeybinding && !D?.keepsComposer) draft.clear();
    }
    if (!Fn && po === "prompt") recordSubmitTime();
    if (kn) {
      turn.markSubmit();
      x.clearBuffer();
      if (!Fn && po === "prompt" && !isRemoteMode && !remoteSessionAwaits()) {
        turn.stream.setUserInputOnProcessing(co, {
          kind: "human",
        });
        turn.resetTiming();
      }
    }
    let Xo = po === "prompt" && !Fn ? this.#i() : undefined;
    let Sn =
      Xo === undefined
        ? undefined
        : D?.sendNow === true
          ? "input_send_now_key"
          : shouldUseResponsiveMode({
                text: co,
                pastedContents: bo,
                isSentByPerson: Cn,
                wait: D?.wait === true,
              })
            ? "input_send_now_responsive_enter"
            : undefined;
    let $n = transport.submit(co, {
      inputMode: po,
      pastedContents: bo,
      fromKeybinding: D?.fromKeybinding ?? false,
      sentByPerson: Cn,
      recordHistory: ({ startsTurn }) => {
        if (!vo || shouldHoldPluginStorage()) return;
        if (startsTurn)
          addHistoryEntry(vo, storageV5, {
            submitMode: po,
          });
        else addHistoryEntryNoUndo(vo, storageV5, po);
      },
    });
    if ($n) {
      let Kn = bumpClawdPoseRun();
      let Wn = undefined;
      try {
        Wn = await $n;
      } finally {
        releaseKeptPoseIfStale(Kn);
      }
      if (Wn?.handBack) {
        chrome.restoreIdeSelectionConsumedBy(bn);
        if (draft.value.trim() === "") {
          draft.replaceValue(co);
          draft.setPastedContents(bo);
        } else if (vo && !shouldHoldPluginStorage()) addHistoryEntryNoUndo(vo, storageV5, po);
      } else if (Xo !== undefined && Sn !== undefined && Wn?.sent && this.#i() === Xo)
        if (Sn === "input_send_now_responsive_enter" && Xo.workerSendsNow() === undefined)
          logFeatureSad(Sn, "remote_version_unknown");
        else this.#a(Xo, Sn, Wn.uuid);
      return;
    }
    let any = parsePastedRefs(co).some((Kn) => bo[Kn.id]?.type === "text");
    using _o = messageQueue.trackSubmission({
      agentId: mainAgentId(),
      mode: po,
      value: co,
      uuid: bn,
    });
    let cn = kn
      ? scanQueueBeforeTurn(
          () =>
            any ||
            mayReachModel(
              {
                value: co,
                mode: po,
              },
              commands,
            ),
          this.#o,
        )
      : undefined;
    if (cn) {
      this.#o = cn;
      try {
        await cn;
      } finally {
        if (this.#o === cn) this.#o = undefined;
      }
    }
    let Dn = switchSerializerSlot.of(session);
    if (Dn.pending > 0) await Dn.tail;
    let mainLoopModel_2 = getMainLoopModelFromState(store.getState());
    let mr = transcript.getSnapshot().length;
    await handlePromptSubmit({
      presentation: this.#e.presentation,
      input: co,
      uuid: bn,
      submittedAtMs,
      helpers: x,
      turn,
      queue: messageQueue,
      mode: po,
      commands,
      onInputChange: Go
        ? (Kn) => {
            draft.replaceValue(Kn);
            if (Kn === "") draft.setMode("prompt");
          }
        : draft.replaceValue,
      onPromptCameBack: draft.markCameBack,
      getCurrentInput: () => draft.value,
      composerClearedAtEnter: (kn && !D?.fromKeybinding) || D?.keepsComposer,
      ...false,
      restoreHandedBackPrompt: (Kn) => {
        turn.consumeRateLimitAutoContinuePrefill();
        restorePromptAfterCancel(draft, Kn);
      },
      onPromptHandedBack: chrome.restoreIdeSelectionConsumedBy,
      setPastedContents: draft.setPastedContents,
      messages: transcript.getSnapshot(),
      mainLoopModel: mainLoopModel_2,
      suppressWorkflowKeyword: D?.suppressWorkflowKeyword,
      resumesStaleQuotaWait: D?.resumesStaleQuotaWait,
      wait: D?.wait,
      inputSource: D?.inputSource,
      pastedContents: bo,
      keyboard: D?.keyboard,
      composerEnter: D?.composerEnter,
      session,
      historyEntry: vo,
      onSubmitProceed: kn || D?.keepsComposer ? undefined : () => draft.setMode("prompt"),
      onSubmitCancelRewind: kn
        ? () => {
            if (!Go) draft.setMode(po);
            if (cameBack) draft.markCameBack();
          }
        : undefined,
      replaceDraftWithNextInput: (Kn) => this.#r(Kn),
      ideSelection,
      takeIdeSelectionForQueue:
        hn && po !== "bash" && (ideSelection?.text || ideSelection?.filePath)
          ? () => {
              if (!kn) chrome.consumeIdeSelection(bn);
              return ideSelection;
            }
          : undefined,
      getAppState: () => store.getState(),
      setAppState: setSessionState,
      querySource: getQuerySourceForREPL(),
      onBeforeQuery,
      canUseTool,
      addNotification,
      streamMode: spinnerStore.get().mode,
      deferSlashToEngine: isCompactCommand,
      storageV5,
    });
    if (
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
        )
    )
      scrollPin.repin(false, "commandOutput");
    if (Fn || isLoading)
      this.#s({
        toast: true,
      });
  };
  #s({ toast }) {
    let { draft, addNotification } = this.#e;
    if (draft.stashedPrompt === undefined || draft.value.trim() !== "") return;
    draft.popStash("outside");
    if (toast)
      addNotification({
        key: "stash-restored",
        kind: "feedback",
        text: "Draft restored",
        priority: "high",
        timeoutMs: 5000,
      });
  }
  #r(h) {
    let { draft } = this.#e;
    draft.setMode("prompt");
    draft.replaceValue(h);
  }
  async #c({
    command,
    commandName,
    commandArgs,
    dispatchedAsImmediate,
    isMidTurn,
    besideTurns,
    loadDialog,
    mainLoopModel,
    composerEnter,
    ranAs,
  }) {
    let { transcript, turn, messageQueue, scope, addNotification } = this.#e;
    let localJsx = scope.localJsx;
    let Ot = false;
    let Et = isPromptHookObserved() ? "" : commandArgs;
    let Dt = snapshotHookRegistration();
    let Lt;
    let oo = (text, ao) => {
      Ot = true;
      Lt?.close();
      let co = [];
      if (text && ao?.shouldQuery)
        messageQueue.enqueue({
          agentId: mainAgentId(),
          value: text,
          mode: "prompt",
          origin: {
            kind: "auto-continuation",
          },
        });
      else if (text && ao?.display !== "skip") {
        addNotification({
          key: `immediate-${command.name}`,
          kind: "feedback",
          text: boldDirectMemberMessage(text),
          priority: "immediate",
        });
        if (this.#e.presentation !== "fullscreen")
          co.push(
            createCommandInputMessage(formatCommandInputTags(getCommandName(command), Et)),
            createCommandInputMessage(
              `<${LOCAL_COMMAND_STDOUT}>${escapeXml(text)}</${LOCAL_COMMAND_STDOUT}>`,
              {
                commandRun: buildCommandRunInfo(command, Et),
              },
            ),
          );
      }
      if (ao?.metaMessages?.length)
        co.push(
          ...ao.metaMessages.map((content) =>
            createUserMessage({
              content,
              isMeta: true,
              origin: ao.metaMessagesOrigin,
            }),
          ),
        );
      turn.appendAfterTurn(co);
      this.#s({
        toast: !ao?.nextInput,
      });
      if (ao?.nextInput)
        if (ao.submitNextInput)
          messageQueue.enqueue({
            agentId: mainAgentId(),
            value: ao.nextInput,
            mode: "prompt",
            origin: {
              kind: "auto-continuation",
            },
          });
        else this.#r(ao.nextInput);
    };
    let toolUseContext = turn.buildToolUseContext(
      transcript.getSnapshot(),
      [],
      createAbortController(),
      mainLoopModel,
    );
    let io = await dispatchCommandRunHooks({
      input: commandRunEvent(command, commandArgs, this.#e.presentation),
      engine: {
        run: async (po) => {
          if (!hasHookRegistrationChanged(Dt)) Et = po;
          ranAs(po);
          return (await loadDialog()).call(
            oo,
            {
              ...toolUseContext,
              isMidTurn,
              dispatchedAsImmediate,
              appendAfterTurn: turn.appendAfterTurn,
              runsBesideTurns: besideTurns,
              ...(isFrozenMarker(composerEnter) && {
                submissionOrigin: {
                  kind: "human",
                },
              }),
            },
            po,
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
    });
    logFeatureOk(cmdFeature(command.name), getTipAttribution(command.name));
    if (io.kind === "answered") {
      if (hasSingleCommandRunHook(getCommandName(command))) {
        if (!hasHookRegistrationChanged(Dt)) Et = commandArgs;
        ranAs(commandArgs);
      }
      oo(
        io.text,
        io.context === undefined
          ? undefined
          : {
              metaMessages: [...io.context],
            },
      );
      return;
    }
    let ran = io.ran;
    if (ran && !Ot)
      Lt = localJsx.show(ran, {
        commandName: getCommandName(command),
        immediate: true,
        hidesPrompt: false,
        retireAtTurnBoundary: true,
        holdsQueue: !besideTurns,
      });
  }
  remoteSendsNow = {
    subscribe: (h) => {
      let x = this.#e.turn.subscribe(h);
      let D = this.#e.transport.subscribe(h);
      let L = this.#e.draft.subscribe(h);
      let ee = this.#e.transcript.subscribe(h);
      return () => {
        x();
        D();
        L();
        ee();
      };
    },
    getSnapshot: () => this.#e.draft.mode === "prompt" && this.#i()?.workerSendsNow() === true,
  };
  submitEmpty = () => {
    let mode = this.#e.draft.mode;
    if (sendQueuedNow(this.#l(mode))) return true;
    let x = this.#i();
    return (
      x !== undefined &&
      isQueuedSendNowEnabled() &&
      mode === "prompt" &&
      this.#a(x, "input_send_queued_now", undefined)
    );
  };
  sendQueuedNow = (h, x) => {
    let D = () => this.#e.lowLatency.sendQueuedNow(x);
    if (x === undefined) {
      if (
        handleSendNowKey({
          ...this.#l(h),
          deliverWithoutCancel: D,
        })
      )
        return true;
      let L = this.#i();
      return L !== undefined && h === "prompt" && this.#a(L, "input_send_now_key", undefined);
    }
    return h === "prompt" && isSendNowKeyEnabled() && D();
  };
  #i() {
    let activeRemote = this.#e.transport.activeRemote;
    return activeRemote.isRemoteMode &&
      hasRemoteControlChannel(activeRemote) &&
      activeRemote.caps.sendNow &&
      this.#e.turn.isExternalLoading &&
      !activeRemote.holdsSends()
      ? activeRemote
      : undefined;
  }
  #a(h, x, D) {
    if (h.workerSendsNow() === false) {
      logFeatureSad(x, "remote_not_supported");
      this.#e.addNotification({
        key: "remote-send-now-unavailable",
        kind: "feedback",
        text: "Send now isn't available here \xB7 esc to interrupt and send",
        priority: "immediate",
      });
      return true;
    }
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
    });
    return true;
  }
  #l(mode) {
    let { store, spinnerStore, turn, messageQueue } = this.#e;
    let { mainLoopModel } = this.#n();
    return {
      mode,
      turn,
      queue: messageQueue,
      interruptRunningTurn: turn.interruptForSubmit,
      streamMode: spinnerStore.get().mode,
      mainLoopModel,
      getAppState: () => store.getState(),
    };
  }
  submitToAgent = async (h, x, D, L) => {
    let { taskRegistry, transcript, turn, draft, messageQueue, addNotification } = this.#e;
    let { mainLoopModel, canUseTool } = this.#n();
    let text = requestDialogWrapper(h, L ?? draft.pastedContents);
    if (isLocalAgent(x)) {
      markChatEngaged(x.id, taskRegistry);
      let userMessage = createUserMessage({
        content: text,
        origin: {
          kind: "human",
        },
      });
      appendAgentTranscriptMessage(x.id, userMessage, taskRegistry);
      if (x.status === "running")
        queueAgentMessage(x.id, text, taskRegistry, {
          isMeta: true,
          origin: {
            kind: "human",
          },
          shownAs: userMessage.uuid,
        });
      else
        resumeAgentBackground({
          agentId: x.id,
          prompt: text,
          promptIsMeta: true,
          promptOrigin: {
            kind: "human",
          },
          toolUseContext: turn.buildToolUseContext(
            transcript.getSnapshot(),
            [],
            new AbortController(),
            mainLoopModel,
          ),
          liveTranscript: createQueueBusyCheck(messageQueue, () => transcript.getSnapshot()),
          canUseTool,
          userInitiated: true,
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
          .catch((error) => {
            if (error instanceof AgentResumeInProgressError || error instanceof AgentStillStoppingError) {
              if (
                sendMessageToAgent(x.id, text, taskRegistry, {
                  isMeta: true,
                  origin: {
                    kind: "human",
                  },
                  userInitiated: true,
                  shownAs: userMessage.uuid,
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
            logForDebugging(`resumeAgentBackground failed: ${errorMessage(error)}`);
            addNotification({
              key: `resume-agent-failed-${x.id}`,
              kind: "warning",
              text: `Failed to resume agent: ${errorMessage(error)}`,
              color: "error",
              priority: "low",
            });
          });
    } else
      injectUserMessageToTeammate(x.id, text, taskRegistry, {
        kind: "human",
      });
    draft.clear();
    D.clearBuffer();
  };
  submitSurveyFollowUp = (h) => {
    this.submit(h, NOOP_HELPERS, {
      inputModeOverride: "prompt",
    }).catch((error) => {
      logForDebugging(
        `Survey feedback request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  };
  readDraft = () => {
    let { draft } = this.#e;
    return {
      text: draft.value,
      cursor: draft.cursorOffset,
    };
  };
  fillDraft = (h, x, D) => {
    let { draft, dialogStore } = this.#e;
    let { decorations, cursor } = D ?? {};
    if (dialogStore.getState().open.length > 0)
      return {
        isFilled: false,
        refusal: "dialog",
      };
    let Be = decorations !== undefined && h !== "";
    let He = Be && x === "insert" ? draft.value.normalize("NFC") : "";
    let We = x === "replace" ? 0 : draft.value.length;
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
    if (cursor !== undefined) {
      let rt = Cursor.fromText(draft.value, 80, cursor);
      draft.setCursorOffset(
        cursor >= draft.value.length
          ? draft.value.length
          : rt.measuredText.snapToGraphemeBoundary(rt.snapOutOfPlaceholder(cursor, "start")),
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
    return {
      isFilled: true,
    };
  };
  suggestDraft = (h, generationRequestId) => {
    let { draft, turn, setAppState } = this.#e;
    if (!(h.trim() !== "" && draft.value === "" && !turn.getSnapshot().isLoading))
      return {
        isShown: false,
      };
    setAppState((Re) => ({
      ...Re,
      promptSuggestion: {
        status: "generated",
        text: h,
        generationRequestId,
      },
    }));
    return {
      isShown: true,
    };
  };
  popQueuedIntoDraft = () => {
    let { draft, setAppState, messageQueue, chrome } = this.#e;
    let ee = messageQueue.popAllEditable(draft.value, 0, draft.pastedContents);
    if (!ee) return;
    draft.replaceValue(ee.text);
    if (ee.unpassed) draft.markCameBack();
    draft.setMode(ee.mode);
    chrome.returnIdeSelection(ee.ideSelection);
    setAppState((ke) =>
      ke.queueEditIndex === null
        ? ke
        : {
            ...ke,
            queueEditIndex: null,
          },
    );
    if (ee.images.length > 0) draft.setPastedContents((ke) => mergeTurnTags(ke, ee.images));
  };
  cancelAndDrainPending = () => {
    let { turn, messageQueue } = this.#e;
    let { userInputOnProcessing, followingPromptsOnProcessing } = turn.stream.getSnapshot();
    let ee =
      turn.stream.placeholderTracker.pending && userInputOnProcessing
        ? [userInputOnProcessing, ...followingPromptsOnProcessing.map((He) => He.text)].join(`
`)
        : undefined;
    let ke = [];
    for (;;) {
      let pastedContents = messageQueue.getCommandQueue().find(isRefillableInput)?.pastedContents ?? {};
      let We = messageQueue.popEditableAt(0, "", 0);
      if (!We) break;
      let ze = new Set(
        We.images
          .filter((image) => image.type === "image" && !(image.id in pastedContents))
          .map((image) => image.id),
      );
      let Xe = parsePastedRefs(We.text)
        .filter((rt) => rt.match.startsWith("[Image") && ze.has(rt.id))
        .reduceRight(
          (rt, kt) => rt.slice(0, kt.index) + rt.slice(kt.index + kt.match.length).replace(/^ /, ""),
          We.text,
        );
      if (Xe) {
        let rt = addPastedEntry(Xe, Object.fromEntries(We.images.map((image) => [image.id, image])));
        ke.push(rt.trimStart().startsWith("/") && !We.text.trimStart().startsWith("/") ? We.text : rt);
      }
    }
    let Re =
      ke.join(`
`) || undefined;
    turn.cancel("local");
    return (
      [ee, Re].filter(Boolean).join(`

`) || undefined
    );
  };
}
//@ chunk-18hwfzwa.js:1644033-1644107 placement
function shouldHoldPluginStorage() {
  return (
    shouldEscapeNdjsonForBridge() ||
    (areHooksEnabled() && getPluginRegistry().unlatchedAbsentManagedIds.size > 0)
  );
}
//@ chunk-18hwfzwa.js:1644107-1644111 placement
init_react_production();
export { PromptSubmitController, isCompactCommand, awaitScanThenTurn, resolveSlashCommand, mayReachModel };
