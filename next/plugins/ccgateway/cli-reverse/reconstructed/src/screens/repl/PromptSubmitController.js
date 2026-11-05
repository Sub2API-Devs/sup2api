/**
 * screens/repl/PromptSubmitController.ts
 *
 * 2.1.316 新增。REPL 控制器：提交提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 7, layout 1
 */
import { randomUUID } from "crypto";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { EXIT_COMMAND_WORDS, handlePromptSubmit } from "../../utils/handlePromptSubmit.js";
import { RESUME_COMPACT_DIALOG } from "./resumeCompactOffer.js";
import {
  COLD_RESUME_QUOTA,
  NEWER_MODEL_OFFER as NEWER_MODEL_OFFER_2,
  AUTOCOMPACT_OFFER,
} from "../../components/nudges/nudgeIds.js";
import { endDrawnOffer } from "../../utils/newerModelOffer.js";
import { noBridgeControlContext } from "../../bridge/replBridgeControl.js";
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
import { prependToShellHistoryCache } from "../../utils/suggestions/shellHistoryCompletion.js";
import { recordSubmitTime, mainAgentId } from "../../bootstrap/state.js";
import { remoteSessionAwaits } from "../../utils/remoteSessionCommands.js";
import { env } from "../../utils/env.js";
import { shouldUseResponsiveMode } from "../../plugins/bundled/responsiveMode.js";
import { logError } from "../../utils/log.js";
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
import { isQueuedCommandEditable } from "../../utils/messageQueueManager.js";
import { shouldEscapeNdjsonForBridge } from "../../cli/ndjsonSafeStringify.js";
import { areHooksEnabled } from "../../utils/hooks.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1667531-1667535 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1667531", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1673119-1673234 placement
/**
 * 等待前置任务后，在仍需要时先等扫描或回合，再等回合结束。
 */
async function awaitScanThenTurn(activeMessageQueue, isBusy, scan) {
  await scan?.catch(() => {
    return;
  });
  if (!isBusy()) return;
  await Promise.race([activeMessageQueue, loadingScansRead()]);
  if (isBusy()) await activeMessageQueue;
}
//@ chunk-czq1j3j2.js:1673234-1673545 placement
/**
 * 解析斜杠命令（支持 “命令:子命令” 与子命令映射），返回启用的命令。
 */
function resolveSlashCommand({ commandName, args, isMcp }, commands) {
  let command = findCommand(commandName, commands);
  let isEnabled = command !== undefined && isCommandEnabled(command);
  let [firstArg = "", ...restArgs] = args.split(/\s+/);
  let subcommand =
    !isEnabled && !isMcp && firstArg !== "" ? findCommand(`${commandName}:${firstArg}`, commands) : undefined;
  let resolved = isEnabled ? command : subcommand;
  if (resolved === undefined) return;
  let subcommandMatch = matchSubcommand(resolved, subcommand === undefined ? args : restArgs.join(" "));
  let targetCommand =
    subcommandMatch === undefined ? undefined : findCommand(subcommandMatch.targetName, commands);
  return targetCommand !== undefined && isCommandEnabled(targetCommand) ? targetCommand : resolved;
}
//@ chunk-czq1j3j2.js:1673545-1673854 placement
/**
 * 输入是否会发送给模型（普通提示、prompt 类命令或可被钩子处理的命令）。
 */
function mayReachModel({ value, mode, skipSlashCommands }, commands) {
  if (mode === "bash" || mode === "poll-event") return false;
  let text = typeof value === "string" ? value : "";
  let slashCommand =
    mode === "prompt" && skipSlashCommands !== true && text.startsWith("/") ? parseSlashCommand(text) : null;
  if (slashCommand === null) return true;
  let slashCommand_2 = resolveSlashCommand(slashCommand, commands);
  if (slashCommand_2 === undefined)
    return !looksLikeCommand(slashCommand.commandName) || mayRegisterCommands();
  return slashCommand_2.type === "prompt" || mayHookCommand(getCommandName(slashCommand_2));
}
//@ chunk-czq1j3j2.js:1673854-1673932 layout
function scriptAskHolds() {
  return codeModeAccepted() ? require("../../utils/codeMode/scriptAskDeclined.js").scriptAskHolds : null;
}
//@ chunk-czq1j3j2.js:1673932-1673974 placement
function isCompactCommand(command) {
  return command.name === "compact";
}
//@ chunk-czq1j3j2.js:1673974-1688955 placement
/**
 * 提交控制器：处理 Enter 提交——斜杠命令（local/local-jsx/prompt）、bash 模式、/exit、建议接受、队列与发送到代理，记录 onSubmit 遥测。
 */
class PromptSubmitController {
  #e;
  #t = null;
  #o = undefined;
  constructor(options) {
    this.#e = options;
  }
  bindHost(host) {
    this.#t = host;
  }
  #n() {
    if (!this.#t) throw Error("PromptSubmitController used before its host was bound");
    return this.#t;
  }
  submit = async (text, helpers, options) => {
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
    let inputMode = options?.inputModeOverride ?? draft.mode;
    let isExitWord = inputMode !== "bash" && EXIT_COMMAND_WORDS.includes(text.trim());
    let submitText = isExitWord && transport.activeRemote.isRemoteMode ? "/exit" : text;
    let pastedContents = options?.pastedContentsOverride ?? draft.pastedContents;
    let isLoading = turn.getSnapshot().isLoading;
    let shouldKeepComposer = codeModeAccepted() && scriptAskHolds()?.peek(session)?.getSnapshot() === true;
    let commands = scope.commands;
    let { ideSelection, onDetachToCaller } = chrome.getSnapshot();
    let slashCommand =
      inputMode !== "bash" && submitText.trim().startsWith("/")
        ? findCommand(splitSlashCommandInput(submitText.trim()).name, commands)
        : undefined;
    let scrollKeepingCommand =
      slashCommand?.type === "local-jsx" &&
      slashCommand.keepsScrollPosition === true &&
      submitText.startsWith("/")
        ? slashCommand
        : undefined;
    if (!scrollKeepingCommand) scrollPin.repin(false, "onSubmit");
    dialogStore.dismissKind(RESUME_COMPACT_DIALOG.kind);
    dialogStore.dismissKind(COLD_RESUME_QUOTA);
    dialogStore.dismissKind(NEWER_MODEL_OFFER_2);
    endDrawnOffer();
    dialogStore.dismissKind(AUTOCOMPACT_OFFER);
    let bridgeControlKey = noBridgeControlContext();
    if (bridgeControlKey !== null) dialogStore.dismissKind(bridgeControlKey);
    let sentByPerson =
      isFrozenMarker(options?.composerEnter) && options?.inputSource !== "suggestion_accepted";
    let fromQueue = false;
    let historyEntry =
      options?.fromKeybinding || fromQueue
        ? undefined
        : {
            display: prependModeCharacterToInput_3(text, inputMode),
            pastedContents,
          };
    let isExitSelection = isExitWord || (slashCommand?.name === "exit" && slashCommand.type !== "prompt");
    if (onDetachToCaller !== undefined && isExitSelection) {
      if (historyEntry) {
        draft.clear();
        helpers.clearBuffer();
        addHistoryEntryNoUndo(historyEntry, storageV5, inputMode);
      }
      onDetachToCaller();
      return;
    }
    if (submitText.trim().startsWith("/")) {
      let trimmed = addPastedEntry(submitText, pastedContents).trim();
      let { name: commandName, args } = splitSlashCommandInput(trimmed);
      let command = findCommand(commandName, commands);
      let command_2 = command && isCommandEnabled(command) ? command : undefined;
      if (command_2?.name === "clear") idleNudge.onClearSubmitted();
      let runsImmediately = isImmediateCommand(command_2, args, this.#e.presentation);
      let isActive = turn.guard.isActive || shouldKeepComposer;
      let runsBeside =
        runsBesideTurns(command_2) && (inputMode !== "bash" || options?.fromKeybinding === true);
      let dispatchesNow = (isActive && (runsImmediately || options?.fromKeybinding)) || runsBeside;
      let runsLocalWhileBusy = command_2?.type === "local" && isActive && runsImmediately;
      if (command_2 && ((dispatchesNow && command_2.type === "local-jsx") || runsLocalWhileBusy)) {
        if (isSlashCommandBlockedByEndedByModel(command_2, store.getState().endedByModel)) {
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
        let commandDialog = resolveCommandDialog(command_2);
        if (command_2.type === "local-jsx" && !commandDialog) {
          logFeatureBad(cmdFeature(command_2.name), "cmd_local_jsx_no_dialog_resolution");
          addNotification({
            key: `immediate-${command_2.name}`,
            kind: "feedback",
            text: commandUnavailableMessage(command_2),
            priority: "immediate",
          });
          return;
        }
        if (text.trim() === draft.value.trim()) {
          draft.clear();
          helpers.clearBuffer();
        }
        let ranAs = createPromptHistoryWriter({
          entry: historyEntry,
          name: commandName,
          typed: args,
          write: (entry) => addHistoryEntryNoUndo(entry, storageV5, inputMode),
        });
        let filtered = parsePastedRefs(submitText).filter(
          (ref) => pastedContents[ref.id]?.type === "text" && !pastedContents[ref.id]?.unavailable,
        );
        let pastedTextCount = filtered.length;
        let pastedTextBytes = filtered.reduce(
          (acc, ref) => acc + (pastedContents[ref.id]?.content.length ?? 0),
          0,
        );
        logEvent("tengu_paste_text", {
          pastedTextCount,
          pastedTextBytes,
        });
        logEvent("tengu_immediate_command_executed", {
          commandName: shippedCommandNameForAnalytics(command_2.name),
          fromKeybinding: options?.fromKeybinding ?? false,
        });
        if (command_2.type === "local") {
          let poseRun = bumpClawdPoseRun();
          runLocalCommandFromRepl({
            command: command_2,
            commandName,
            args,
            context: {
              ...turn.buildToolUseContext(
                transcript.getSnapshot(),
                [],
                createAbortController(),
                mainLoopModel,
              ),
              isMidTurn: true,
              dispatchedAsImmediate: runsImmediately,
            },
            printRows: turn.appendAfterTurn,
            ranAs,
          }).finally(() => releaseKeptPoseIfStale(poseRun));
          this.#r({
            toast: true,
          });
        } else if (commandDialog) {
          let poseRun = bumpClawdPoseRun();
          this.#l({
            command: command_2,
            commandName,
            commandArgs: args,
            dispatchedAsImmediate: runsImmediately,
            isMidTurn: isActive,
            besideTurns: runsBeside,
            loadDialog: commandDialog,
            mainLoopModel,
            composerEnter: options?.composerEnter,
            ranAs,
          }).finally(() => releaseKeptPoseIfStale(poseRun));
        }
        return;
      }
    }
    if (
      transport.refuseSubmit(submitText, inputMode, {
        sentByPerson,
        pastedContents,
      })
    )
      return;
    let isRemoteMode = transport.activeRemote.isRemoteMode;
    let clearsComposer = (!isLoading && !shouldKeepComposer) || isRemoteMode;
    if (
      !options?.fromKeybinding &&
      inputMode === "bash" &&
      !parsePastedRefs(submitText).some((ref) => !ref.match.startsWith("[Image"))
    )
      prependToShellHistoryCache(session, submitText.trim());
    let isSlash = submitText.trim().startsWith("/");
    let submitUuid = randomUUID();
    let keepsComposer =
      options?.inputModeOverride !== undefined &&
      (options.fromKeybinding === true || options.keepsComposer === true);
    let usesIdeSelection =
      options?.leavesIdeSelection !== true &&
      (ideSelection?.source !== "diff" || (!isSlash && inputMode !== "bash"));
    let cameBack = draft.getSnapshot().cameBack;
    if (clearsComposer && !keepsComposer) draft.setMode("prompt");
    if (clearsComposer) {
      if (usesIdeSelection) chrome.consumeIdeSelection(submitUuid);
    }
    if (draft.stashedPrompt !== undefined && !isSlash && clearsComposer) {
      draft.popStash("outside");
      addNotification({
        key: "stash-restored",
        kind: "feedback",
        text: "Draft restored",
        priority: "high",
        timeoutMs: 5000,
      });
    } else if (clearsComposer) {
      if (!options?.fromKeybinding && !options?.keepsComposer) draft.clear();
    }
    if (!isSlash && inputMode === "prompt") recordSubmitTime();
    if (clearsComposer) {
      turn.markSubmit();
      helpers.clearBuffer();
      if (!isSlash && inputMode === "prompt" && !isRemoteMode && !remoteSessionAwaits()) {
        turn.stream.setUserInputOnProcessing(submitText, {
          kind: "human",
        });
        turn.resetTiming();
      }
    }
    let remoteTarget = inputMode === "prompt" && !isSlash ? this.#i() : undefined;
    let sendNowFeature =
      remoteTarget === undefined
        ? undefined
        : options?.sendNow === true
          ? "input_send_now_key"
          : shouldUseResponsiveMode({
                text: submitText,
                pastedContents,
                isSentByPerson: sentByPerson,
                wait: options?.wait === true,
              })
            ? "input_send_now_responsive_enter"
            : undefined;
    let submitPromise = transport.submit(submitText, {
      inputMode,
      pastedContents,
      fromKeybinding: options?.fromKeybinding ?? false,
      sentByPerson,
      sentNow: sendNowFeature !== undefined && remoteTarget?.workerSendsNow() === true,
      recordHistory: ({ startsTurn }) => {
        if (!historyEntry || shouldHoldPluginStorage()) return;
        if (startsTurn)
          addHistoryEntry(historyEntry, storageV5, {
            submitMode: inputMode,
          });
        else addHistoryEntryNoUndo(historyEntry, storageV5, inputMode);
      },
    });
    if (submitPromise) {
      let poseRun = bumpClawdPoseRun();
      let submitResult = undefined;
      try {
        submitResult = await submitPromise;
      } finally {
        releaseKeptPoseIfStale(poseRun);
      }
      if (submitResult?.handBack) {
        chrome.restoreIdeSelectionConsumedBy(submitUuid);
        if (draft.value.trim() === "") {
          draft.replaceValue(submitText);
          draft.setPastedContents(pastedContents);
        } else if (historyEntry && !shouldHoldPluginStorage())
          addHistoryEntryNoUndo(historyEntry, storageV5, inputMode);
      } else if (
        remoteTarget !== undefined &&
        sendNowFeature !== undefined &&
        submitResult?.sent &&
        this.#i() === remoteTarget
      )
        if (
          sendNowFeature === "input_send_now_responsive_enter" &&
          remoteTarget.workerSendsNow() === undefined
        )
          logFeatureSad(sendNowFeature, "remote_version_unknown");
        else this.#a(remoteTarget, sendNowFeature, submitResult.uuid);
      return;
    }
    let any = parsePastedRefs(submitText).some((ref) => pastedContents[ref.id]?.type === "text");
    using submission = messageQueue.trackSubmission({
      agentId: mainAgentId(),
      mode: inputMode,
      value: submitText,
      uuid: submitUuid,
    });
    let queuedScan = clearsComposer
      ? scanQueueBeforeTurn(
          () =>
            any ||
            mayReachModel(
              {
                value: submitText,
                mode: inputMode,
              },
              commands,
            ),
          this.#o,
        )
      : undefined;
    if (queuedScan) {
      this.#o = queuedScan;
      try {
        await queuedScan;
      } finally {
        if (this.#o === queuedScan) this.#o = undefined;
      }
    }
    let serializer = switchSerializerSlot.of(session);
    if (serializer.pending > 0) await serializer.tail;
    let mainLoopModel_2 = getMainLoopModelFromState(store.getState());
    let messageCount = transcript.getSnapshot().length;
    await handlePromptSubmit({
      presentation: this.#e.presentation,
      input: submitText,
      uuid: submitUuid,
      submittedAtMs,
      helpers,
      turn,
      queue: messageQueue,
      mode: inputMode,
      commands,
      onInputChange: keepsComposer
        ? (nextValue) => {
            draft.replaceValue(nextValue);
            if (nextValue === "") draft.setMode("prompt");
          }
        : draft.replaceValue,
      onPromptCameBack: draft.markCameBack,
      getCurrentInput: () => draft.value,
      composerClearedAtEnter: (clearsComposer && !options?.fromKeybinding) || options?.keepsComposer,
      ...(codeModeAccepted() && {
        askOpenAtIdle: shouldKeepComposer,
      }),
      restoreHandedBackPrompt: (prompt) => {
        turn.consumeRateLimitAutoContinuePrefill();
        restorePromptAfterCancel(draft, prompt);
      },
      onPromptHandedBack: chrome.restoreIdeSelectionConsumedBy,
      setPastedContents: draft.setPastedContents,
      messages: transcript.getSnapshot(),
      mainLoopModel: mainLoopModel_2,
      suppressWorkflowKeyword: options?.suppressWorkflowKeyword,
      resumesStaleQuotaWait: options?.resumesStaleQuotaWait,
      wait: options?.wait,
      inputSource: options?.inputSource,
      pastedContents,
      keyboard: options?.keyboard,
      composerEnter: options?.composerEnter,
      session,
      historyEntry,
      onSubmitProceed: clearsComposer || options?.keepsComposer ? undefined : () => draft.setMode("prompt"),
      onSubmitCancelRewind: clearsComposer
        ? () => {
            if (!keepsComposer) draft.setMode(inputMode);
            if (cameBack) draft.markCameBack();
          }
        : undefined,
      replaceDraftWithNextInput: (nextInput) => this.#s(nextInput),
      ideSelection,
      takeIdeSelectionForQueue:
        usesIdeSelection && inputMode !== "bash" && (ideSelection?.text || ideSelection?.filePath)
          ? () => {
              if (!clearsComposer) chrome.consumeIdeSelection(submitUuid);
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
      scrollKeepingCommand &&
      transcript
        .getSnapshot()
        .slice(messageCount)
        .some(
          (message) =>
            message.uuid === submitUuid ||
            (message.type === "system" &&
              message.subtype === "local_command" &&
              message.commandRun?.command === getCommandName(scrollKeepingCommand)),
        )
    )
      scrollPin.repin(false, "commandOutput");
    if (isSlash || isLoading || shouldKeepComposer)
      this.#r({
        toast: true,
      });
  };
  #r({ toast }) {
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
  #s(value) {
    let { draft } = this.#e;
    draft.setMode("prompt");
    draft.replaceValue(value);
  }
  async #l({
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
    let dialogRan = false;
    let effectiveArgs = isPromptHookObserved() ? "" : commandArgs;
    let hookRegistration = snapshotHookRegistration();
    let panel;
    let onDialogDone = (text, result) => {
      dialogRan = true;
      panel?.close();
      let rows = [];
      if (text && result?.shouldQuery)
        messageQueue.enqueue({
          agentId: mainAgentId(),
          value: text,
          mode: "prompt",
          origin: {
            kind: "auto-continuation",
          },
        });
      else if (text && result?.display !== "skip") {
        addNotification({
          key: `immediate-${command.name}`,
          kind: "feedback",
          text: boldDirectMemberMessage(text),
          priority: "immediate",
        });
        if (this.#e.presentation !== "fullscreen")
          rows.push(
            createCommandInputMessage(formatCommandInputTags(getCommandName(command), effectiveArgs)),
            createCommandInputMessage(
              `<${LOCAL_COMMAND_STDOUT}>${escapeXml(text)}</${LOCAL_COMMAND_STDOUT}>`,
              {
                commandRun: buildCommandRunInfo(command, effectiveArgs),
              },
            ),
          );
      }
      if (result?.metaMessages?.length)
        rows.push(
          ...result.metaMessages.map((content) =>
            createUserMessage({
              content,
              isMeta: true,
              origin: result.metaMessagesOrigin,
            }),
          ),
        );
      turn.appendAfterTurn(rows);
      this.#r({
        toast: !result?.nextInput,
      });
      if (result?.nextInput)
        if (result.submitNextInput)
          messageQueue.enqueue({
            agentId: mainAgentId(),
            value: result.nextInput,
            mode: "prompt",
            origin: {
              kind: "auto-continuation",
            },
          });
        else this.#s(result.nextInput);
    };
    let toolUseContext = turn.buildToolUseContext(
      transcript.getSnapshot(),
      [],
      createAbortController(),
      mainLoopModel,
    );
    let hookResult = await dispatchCommandRunHooks({
      input: commandRunEvent(command, commandArgs, this.#e.presentation),
      engine: {
        run: async (hookArgs) => {
          if (!hasHookRegistrationChanged(hookRegistration)) effectiveArgs = hookArgs;
          ranAs(hookArgs);
          return (await loadDialog()).call(
            onDialogDone,
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
            hookArgs,
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
    if (hookResult.kind === "answered") {
      if (hasSingleCommandRunHook(getCommandName(command))) {
        if (!hasHookRegistrationChanged(hookRegistration)) effectiveArgs = commandArgs;
        ranAs(commandArgs);
      }
      onDialogDone(
        hookResult.text,
        hookResult.context === undefined
          ? undefined
          : {
              metaMessages: [...hookResult.context],
            },
      );
      return;
    }
    let ran = hookResult.ran;
    if (ran && !dialogRan)
      panel = localJsx.show(ran, {
        commandName: getCommandName(command),
        immediate: true,
        hidesPrompt: false,
        retireAtTurnBoundary: true,
        holdsQueue: !besideTurns,
      });
  }
  remoteSendsNow = {
    subscribe: (listener) => {
      let unsubTurn = this.#e.turn.subscribe(listener);
      let unsubTransport = this.#e.transport.subscribe(listener);
      let unsubDraft = this.#e.transport.waitingLines.subscribe(listener);
      let unsubTranscript = this.#e.draft.subscribe(listener);
      let unsubTranscript_2 = this.#e.transcript.subscribe(listener);
      return () => {
        unsubTurn();
        unsubTransport();
        unsubDraft();
        unsubTranscript();
        unsubTranscript_2();
      };
    },
    getSnapshot: () =>
      this.#e.draft.mode === "prompt" &&
      this.#e.transport.hasLineToSendNow &&
      this.#i()?.workerSendsNow() === true,
  };
  submitEmpty = () => {
    let mode = this.#e.draft.mode;
    if (sendQueuedNow(this.#c(mode))) return true;
    let remoteTarget = this.#i();
    return (
      remoteTarget !== undefined &&
      isQueuedSendNowEnabled() &&
      mode === "prompt" &&
      this.#a(remoteTarget, "input_send_queued_now", undefined)
    );
  };
  sendQueuedNow = (mode, deliver) => {
    let deliverWithoutCancel = () => this.#e.lowLatency.sendQueuedNow(deliver);
    if (deliver === undefined) {
      if (
        handleSendNowKey({
          ...this.#c(mode),
          deliverWithoutCancel,
        })
      )
        return true;
      let remoteTarget = this.#i();
      return (
        remoteTarget !== undefined &&
        mode === "prompt" &&
        this.#a(remoteTarget, "input_send_now_key", undefined)
      );
    }
    return mode === "prompt" && isSendNowKeyEnabled() && deliverWithoutCancel();
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
  #a(remoteTarget, featureName, deliver) {
    if (remoteTarget.workerSendsNow() === false) {
      logFeatureSad(featureName, "remote_not_supported");
      this.#e.addNotification({
        key: "remote-send-now-unavailable",
        kind: "feedback",
        text: "Send now isn't available here \xB7 esc to interrupt and send",
        priority: "immediate",
      });
      return true;
    }
    let { transport } = this.#e;
    let linesToSendNow = [...transport.takeLinesToSendNow(), ...(deliver === undefined ? [] : [deliver])];
    remoteTarget.sendQueuedNow(deliver).then((outcome) => {
      switch (outcome) {
        case "delivering":
          logFeatureOk(featureName);
          return;
        case "stopped":
        case "interrupted":
          logFeatureSad(featureName, "fell_back_to_cancel");
          return;
        case "nothing_waiting":
          logFeatureSad(featureName, "remote_nothing_waiting");
          transport.sendNowMovedNothing(linesToSendNow);
          return;
        case "not_asked":
          logFeatureSad(featureName, "remote_not_asked");
          transport.sendNowMovedNothing(linesToSendNow);
          return;
        case "failed":
          logFeatureBad(featureName, "remote_request_failed");
          transport.sendNowMovedNothing(linesToSendNow);
          if (this.#e.turn.isExternalLoading)
            this.#e.addNotification({
              key: "remote-send-now-no-answer",
              kind: "feedback",
              text: "Send now got no answer from the session \xB7 esc to interrupt and send",
              priority: "immediate",
            });
          return;
      }
    });
    return true;
  }
  #c(mode) {
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
  submitToAgent = async (requestText, task, helpers, pastedContents) => {
    let { taskRegistry, transcript, turn, draft, messageQueue, addNotification } = this.#e;
    let { mainLoopModel, canUseTool } = this.#n();
    let text = requestDialogWrapper(requestText, pastedContents ?? draft.pastedContents);
    if (isLocalAgent(task)) {
      markChatEngaged(task.id, taskRegistry);
      let userMessage = createUserMessage({
        content: text,
        origin: {
          kind: "human",
        },
      });
      appendAgentTranscriptMessage(task.id, userMessage, taskRegistry);
      if (task.status === "running")
        queueAgentMessage(task.id, text, taskRegistry, {
          isMeta: true,
          origin: {
            kind: "human",
          },
          shownAs: userMessage.uuid,
        });
      else
        resumeAgentBackground({
          agentId: task.id,
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
          .then((resumeResult) => {
            if (isResumeDenied(resumeResult))
              addNotification({
                key: `resume-agent-failed-${task.id}`,
                kind: "warning",
                text: `Failed to resume agent: ${resumeResult.deniedByPlugin}`,
                color: "error",
                priority: "low",
              });
          })
          .catch((error) => {
            if (error instanceof AgentResumeInProgressError || error instanceof AgentStillStoppingError) {
              if (
                sendMessageToAgent(task.id, text, taskRegistry, {
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
                key: `resume-agent-failed-${task.id}`,
                kind: "warning",
                text: "Failed to resume agent: it is no longer running; message not delivered",
                color: "error",
                priority: "low",
              });
              return;
            }
            logForDebugging(`resumeAgentBackground failed: ${errorMessage(error)}`);
            addNotification({
              key: `resume-agent-failed-${task.id}`,
              kind: "warning",
              text: `Failed to resume agent: ${errorMessage(error)}`,
              color: "error",
              priority: "low",
            });
          });
    } else
      injectUserMessageToTeammate(task.id, text, taskRegistry, {
        kind: "human",
      });
    draft.clear();
    helpers.clearBuffer();
  };
  submitSurveyFollowUp = (feedback) => {
    this.submit(feedback, NOOP_HELPERS, {
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
  fillDraft = (text, position, options) => {
    let { draft, dialogStore } = this.#e;
    let { decorations, cursor } = options ?? {};
    if (dialogStore.getState().open.length > 0)
      return {
        isFilled: false,
        refusal: "dialog",
      };
    let hasDecorations = decorations !== undefined && text !== "";
    let nfcPrefix = hasDecorations && position === "insert" ? draft.value.normalize("NFC") : "";
    let insertOffset = position === "replace" ? 0 : draft.value.length;
    switch (position) {
      case "replace":
        this.#s(text);
        break;
      case "append":
        draft.replaceValue(draft.value + text);
        break;
      case "insert":
        insertOffset = draft.insertText(text, "outside");
        break;
    }
    if (cursor !== undefined) {
      let cursorState = Cursor.fromText(draft.value, 80, cursor);
      draft.setCursorOffset(
        cursor >= draft.value.length
          ? draft.value.length
          : cursorState.measuredText.snapToGraphemeBoundary(
              cursorState.snapOutOfPlaceholder(cursor, "start"),
            ),
      );
    } else if (position !== "insert" && draft.cursorOffset !== draft.value.length)
      draft.setCursorOffset(draft.value.length);
    let mode = nfcPrefix.slice(0, insertOffset);
    if (
      hasDecorations &&
      (position === "insert"
        ? draft.value.normalize("NFD").startsWith((mode + text).normalize("NFD"))
        : draft.value.startsWith(text, insertOffset))
    ) {
      let normalizedDecorations = normalizeInputDecorations(decorations, text);
      draft.paint(
        normalizeInputDecorations(
          position === "insert"
            ? mapRangesToNfcOffsets(normalizedDecorations, text, mode)
            : offsetDecorations(normalizedDecorations, insertOffset),
          draft.value,
        ),
      );
    }
    return {
      isFilled: true,
    };
  };
  suggestDraft = (suggestion, generationRequestId) => {
    let { draft, turn, setAppState } = this.#e;
    if (!(suggestion.trim() !== "" && draft.value === "" && !turn.getSnapshot().isLoading))
      return {
        isShown: false,
      };
    setAppState((state) => ({
      ...state,
      promptSuggestion: {
        status: "generated",
        text: suggestion,
        generationRequestId,
      },
    }));
    return {
      isShown: true,
    };
  };
  popQueuedIntoDraft = () => {
    let { draft, setAppState, messageQueue, chrome } = this.#e;
    let popped = messageQueue.popAllEditable(draft.value, 0, draft.pastedContents);
    if (!popped) return;
    draft.replaceValue(popped.text);
    if (popped.unpassed) draft.markCameBack();
    draft.setMode(popped.mode);
    chrome.returnIdeSelection(popped.ideSelection);
    setAppState((state) =>
      state.queueEditIndex === null
        ? state
        : {
            ...state,
            queueEditIndex: null,
          },
    );
    if (popped.images.length > 0)
      draft.setPastedContents((contents) => mergeTurnTags(contents, popped.images));
  };
  cancelAndDrainPending = () => {
    let { turn, messageQueue, transport } = this.#e;
    let { userInputOnProcessing, followingPromptsOnProcessing } = turn.stream.getSnapshot();
    let processingText =
      turn.stream.placeholderTracker.pending && userInputOnProcessing
        ? [userInputOnProcessing, ...followingPromptsOnProcessing.map((prompt) => prompt.text)].join(`
`)
        : undefined;
    let drained = [];
    for (;;) {
      let pastedContents = messageQueue.getCommandQueue().find(isQueuedCommandEditable)?.pastedContents ?? {};
      let queued = messageQueue.popEditableAt(0, "", 0);
      if (!queued) break;
      let fixedImageIds = new Set(
        queued.images
          .filter((image) => image.type === "image" && !(image.id in pastedContents))
          .map((image) => image.id),
      );
      let textWithoutImages = parsePastedRefs(queued.text)
        .filter((ref) => ref.match.startsWith("[Image") && fixedImageIds.has(ref.id))
        .reduceRight(
          (acc, ref) => acc.slice(0, ref.index) + acc.slice(ref.index + ref.match.length).replace(/^ /, ""),
          queued.text,
        );
      if (textWithoutImages) {
        let restored = addPastedEntry(
          textWithoutImages,
          Object.fromEntries(queued.images.map((image) => [image.id, image])),
        );
        drained.push(
          restored.trimStart().startsWith("/") && !queued.text.trimStart().startsWith("/")
            ? queued.text
            : restored,
        );
      }
    }
    let drainedText =
      drained.join(`
`) || undefined;
    transport.escTakeBack.forgetSends();
    turn.cancel("local");
    return (
      [processingText, drainedText].filter(Boolean).join(`

`) || undefined
    );
  };
}
//@ chunk-czq1j3j2.js:1688955-1689029 placement
function shouldHoldPluginStorage() {
  return (
    shouldEscapeNdjsonForBridge() ||
    (areHooksEnabled() && getPluginRegistry().unlatchedAbsentManagedIds.size > 0)
  );
}
export { PromptSubmitController, isCompactCommand, awaitScanThenTurn, resolveSlashCommand, mayReachModel };
