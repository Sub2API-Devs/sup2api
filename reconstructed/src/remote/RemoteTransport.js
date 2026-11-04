/**
 * remote/RemoteTransport.ts
 *
 * 2.1.316 新增。REPL 远程传输控制器（RemoteTransport）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { randomUUID } from "crypto";
import { BOXED_DIAMOND_GLYPH } from "../constants/figures.js";
import {
  createRemoteModeHandle,
  LOCAL_MODE_HANDLE,
  isRemoteControlChannelAvailable,
  canUseRemoteFeature,
} from "./remoteMode.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../ink/components/Text.js";
import { createSignal } from "../utils/signal.js";
import { createRetractionState, mergeSessionCapabilities } from "./remoteSessionEvents.js";
import {
  createModeSyncState,
  recordOwnSend,
  recordOwnAck,
  noteOwnModeAnswerPending,
  landOutstandingMode,
  nextOwnSendSeq,
  handleUnrecordedAnswer,
  recordModeBroadcast,
  consumeOwnAnswer,
  recordAppliedMode,
  applyRemoteMode,
  useRemotePermissionModeSync,
} from "./remotePermissionModeSync.js";
import { mainAgentId, getCaps, setCaps } from "../bootstrap/state.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { createStore } from "../state/store.js";
import { env } from "../utils/env.js";
import { logEvent } from "../services/analytics/index.js";
import { isDeviceIdentityEnabledCached } from "../services/analytics/violinGates.js";
import { logError } from "../utils/log.js";
import { errorMessage, withTelemetryMessage, toError } from "../utils/errors.js";
import {
  logFeatureOk,
  logFeatureSad,
  logFeatureBad,
  cmdFeature,
} from "../services/analytics/featureTelemetry.js";
import { applyInProgressToolUses } from "../state/inProgressToolUses.js";
import { EXTERNAL_PERMISSION_MODES } from "../types/permissions.js";
import { setPermissionModeWithGuards } from "../utils/permissions/permissionSetup.js";
import { NOT_IN_CLOUD_SESSIONS } from "../components/PromptInput/PromptInputModeHints.js";
import {
  createSystemMessage,
  createUserMessage,
  createCommandInputMessage,
  formatCommandInputTags,
} from "../utils/messages.js";
import {
  remoteSessionAwaits,
  prependModeCharacterToInput_2 as prependModeCharacterToInput_2_2,
  NO_CLOUD_SESSION_MESSAGE,
} from "../utils/remoteSessionCommands.js";
import { isCommandEnabled, getCommandName, shippedCommandNames } from "../commands.js";
import { getThinClientDispatchMode } from "../utils/commandPredicates.js";
import { getLoginAvailability } from "../commands/login/loginAvailability.js";
import { isSelfAddressableSessionId, toCompatSessionId } from "../bridge/sessionIdCompat.js";
import { resolvePastedTextReference } from "../components/PromptInput/inputPaste.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { buildUnavailablePasteError, describeRemovedPastes } from "../history.js";
import { getActiveNotices } from "../utils/statusNoticeDefinitions.js";
import { createAbortController } from "../utils/abortController.js";
import { escapeForkedSkillTag } from "../utils/xmlTagText.js";
import { sanitizeTelemetryString } from "../utils/sanitization.js";
import { isPromptHookObserved } from "../utils/telemetry/sessionTracing.js";
import { shouldEscapeNdjsonForBridge } from "../cli/ndjsonSafeStringify.js";
import { LOCAL_COMMAND_STDERR } from "../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { runLocalCommand } from "../screens/repl/runLocalCommand.js";
import { resolvePromptOrigin } from "../utils/messageOrigin.js";
import { viewportInfo } from "../plugins/functionHooks/surfaceBinding.js";
import { useAppStoreDirect, useSetAppState, useAppState } from "../state/AppState.js";
import { useState, useMemo, useLayoutEffect } from "../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useRemoteSession } from "../hooks/useRemoteSession.js";
import { useDirectConnect } from "../hooks/useDirectConnect.js";
import { useSSHSession } from "../hooks/useSSHSession.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:312946-313440 placement
/**
 * 远程会话里不支持的命令说明表（ide/resume/continue/statusline/workflows/artifacts）及统一提示。
 */
var REMOTE_UNSUPPORTED_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REMOTE_UNSUPPORTED_COMMAND_NOTICES;
deferInit("chunk-18hwfzwa.js:312946", () => {
  REMOTE_UNSUPPORTED_COMMANDS =
    "run /exit, then `claude --cloud <session-id>` to open another one (ids are listed at claude.ai/code)";
  REMOTE_UNSUPPORTED_COMMAND_NOTICES = new Map([
    ["ide", "the session runs in a cloud container that can't reach your IDE"],
    ["resume", REMOTE_UNSUPPORTED_COMMANDS],
    ["continue", REMOTE_UNSUPPORTED_COMMANDS],
    [
      "statusline",
      "run it in a local `claude` session; the status line it sets up shows in cloud terminals too",
    ],
    ["workflows", "/tasks lists running workflows"],
    [
      "artifacts",
      `once this session has an artifact, choose ${BOXED_DIAMOND_GLYPH} under the prompt (arrow keys, then Enter)`,
    ],
  ]);
});
//@ chunk-18hwfzwa.js:313440-313463 placement
function remoteCommandNoticeStub(args) {
  return;
}
//@ chunk-18hwfzwa.js:313463-313533 placement
function isSameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
//@ chunk-18hwfzwa.js:313533-313741 placement
function remoteTransportKind({ ssh, direct, ccr, ccrViewerOnly, ccrSessionId, ccrConsoleProfileBearer }) {
  return ssh.isRemoteMode
    ? createRemoteModeHandle("ssh", ssh, false)
    : direct.isRemoteMode
      ? createRemoteModeHandle("direct", direct, false)
      : ccr.isRemoteMode
        ? createRemoteModeHandle("ccr", ccr, ccrViewerOnly, ccrSessionId, ccrConsoleProfileBearer)
        : LOCAL_MODE_HANDLE;
}
//@ chunk-18hwfzwa.js:313741-322610 placement
/**
 * 远端传输（ccr-api / ssh / direct）：订阅云会话事件、权限模式广播、等待行、会话记录与能力查询；未绑定屏幕时报 "RemoteTransport: used before…"。
 */
class RemoteTransport {
  #e;
  #t = null;
  #o = undefined;
  #n = {
    activeRemote: LOCAL_MODE_HANDLE,
  };
  #s = createSignal();
  retraction = createRetractionState();
  modeWire = createModeSyncState();
  #r = mainAgentId();
  #c = createStore([]);
  waitingLines = this.#c;
  #i = new Set();
  constructor(services) {
    this.#e = services;
  }
  subscribe = this.#s.subscribe;
  getSnapshot = () => this.#n;
  get activeRemote() {
    return this.#n.activeRemote;
  }
  #a() {
    let activeRemote = this.#n.activeRemote;
    return isDeviceIdentityEnabledCached() && activeRemote.isRemoteMode && activeRemote.caps.sessionRecord;
  }
  bindHost(host) {
    this.#t = host;
  }
  #l() {
    if (this.#t === null) throw Error("RemoteTransport: used before its screen bound a host");
    return this.#t;
  }
  setActiveRemote(activeRemote) {
    let remoteCaps = activeRemote.isRemoteMode ? activeRemote : null;
    let transcriptSource =
      activeRemote.isRemoteMode && activeRemote.caps.catchupReplay ? "ccr-api" : "local-jsonl";
    let caps = getCaps();
    if (caps.remote !== remoteCaps || caps.transcriptSource !== transcriptSource)
      setCaps({
        ...caps,
        remote: remoteCaps,
        transcriptSource,
      });
    if (activeRemote === this.#n.activeRemote) return;
    this.#n = {
      activeRemote,
    };
    if (!activeRemote.isRemoteMode) this.#e.workerCommands.setState(() => null);
    this.#s.emit();
  }
  setMessages = (updater) => {
    this.#e.transcript.replace(updater);
  };
  setIsLoading = (loading) => {
    if (!loading) this.landWaitingLines();
    this.#e.turn.setExternalLoading(loading);
  };
  holdLine = (line) => {
    this.#c.setState((waitingLines) =>
      waitingLines.some((waiting) => waiting.uuid === line.uuid) ? waitingLines : [...waitingLines, line],
    );
  };
  lineTaken = (uuid) => {
    let lower = uuid.toLowerCase();
    let takenCount = this.#d((waiting) => waiting.uuid.toLowerCase() === lower);
    for (let idx = 0; idx < takenCount; idx++) logFeatureOk("cloud_waiting_line");
  };
  landWaitingLines = () => {
    let landedCount = this.#d(() => true);
    for (let idx = 0; idx < landedCount; idx++) logFeatureSad("cloud_waiting_line", "landed_without_report");
  };
  rowsDrawn = (drawnRows) => {
    if (this.#i.size === 0) return;
    let drawnUuids = new Set(drawnRows.map((row) => row.uuid));
    let transcriptUuids = new Set(this.#e.transcript.getSnapshot().map((row) => row.uuid));
    let filtered = [...this.#i].filter((uuid) => drawnUuids.has(uuid) || !transcriptUuids.has(uuid));
    for (let uuid of filtered) this.#i.delete(uuid);
    if (filtered.length > 0)
      this.#c.setState((waitingLines) => waitingLines.filter((line) => !filtered.includes(line.uuid)));
  };
  #d(predicate) {
    let filtered = this.#c.getState().filter((line) => predicate(line) && !this.#i.has(line.uuid));
    if (filtered.length === 0) return 0;
    for (let line of filtered) this.#i.add(line.uuid);
    this.#e.transcript.replace((rows) => [
      ...rows,
      ...filtered.filter((line) => !rows.some((row) => row.uuid === line.uuid)),
    ]);
    return filtered.length;
  }
  getIsLoading = () => this.#e.turn.isExternalLoading;
  get streaming() {
    return this.#e.turn.stream;
  }
  setStreamMode = (mode) => {
    this.#e.spinner.setMode(mode);
  };
  setInProgressToolUseIDs = (toolUseIds) => {
    this.#e.store.setState((appState) => {
      let nextTranscripts = applyInProgressToolUses(appState.transcripts, this.#r, toolUseIds);
      return nextTranscripts === appState.transcripts
        ? appState
        : {
            ...appState,
            transcripts: nextTranscripts,
          };
    });
  };
  onTurnComplete = (completion) => {
    this.#e.turn.markRemoteTurnComplete(completion);
  };
  onTurnStopped = () => {
    this.#e.turn.markRemoteTurnStopped();
  };
  onOtherTurnComplete = (otherCompletion) => {
    this.#e.idleNudge.onOtherTurnComplete(otherCompletion);
  };
  onConversationReset = (reset) => {
    this.#e.applyConversationReset(reset);
  };
  onInit = (initFrame) => {
    this.#s.emit();
    let { workerCommands, setAppState } = this.#e;
    if (initFrame.slash_commands !== undefined) {
      let commandNames = new Set(initFrame.slash_commands);
      workerCommands.setState(() => commandNames);
    }
    setAppState((prevState) => {
      let workerInventory = prevState.workerInventory ?? undefined;
      let inventory = mergeSessionCapabilities(workerInventory, {
        ...initFrame,
        slashCommands: initFrame.slash_commands,
      });
      if (inventory === undefined || inventory === workerInventory) return prevState;
      return workerInventory !== undefined &&
        isSameStringArray(workerInventory.skills, inventory.skills) &&
        isSameStringArray(workerInventory.plugins, inventory.plugins) &&
        isSameStringArray(workerInventory.tools ?? [], inventory.tools ?? []) &&
        isSameStringArray(workerInventory.commands ?? [], inventory.commands ?? [])
        ? prevState
        : {
            ...prevState,
            workerInventory: inventory,
          };
    });
    let model = initFrame.model;
    if (model !== undefined)
      setAppState((prevState) =>
        prevState.mainLoopModel === model
          ? prevState
          : {
              ...prevState,
              mainLoopModel: model,
            },
      );
  };
  noteOwnPermissionModePush = (mode) => {
    let personOriginated = this.#a();
    let sent = recordOwnSend(this.modeWire, mode, personOriginated ? "person" : "wire");
    return personOriginated
      ? () => {
          recordOwnAck(this.modeWire, {
            mode,
            origin: "person",
            sent,
          });
        }
      : () => {};
  };
  noteOwnPermissionModeAnswer = (answer) => {
    if (!this.#a()) return;
    noteOwnModeAnswerPending(this.modeWire, answer);
    let activeRemote = this.#n.activeRemote;
    if (activeRemote.isRemoteMode && activeRemote.sessionId !== undefined) {
      let { setAppState } = this.#e;
      landOutstandingMode(setAppState, activeRemote.sessionId, answer);
    }
  };
  noteOwnUnrecordedModeAnswer = () => {
    if (this.#a()) {
      nextOwnSendSeq(this.modeWire);
      let activeRemote = this.#n.activeRemote;
      if (activeRemote.isRemoteMode && activeRemote.sessionId !== undefined) {
        let { store, setAppState } = this.#e;
        handleUnrecordedAnswer(this.modeWire, store, setAppState, activeRemote.sessionId);
      }
    }
  };
  onPermissionModeChange = (mode, origin = "worker") => {
    if (!EXTERNAL_PERMISSION_MODES.includes(mode)) {
      if (this.#a()) recordModeBroadcast(this.modeWire, null);
      return;
    }
    recordModeBroadcast(this.modeWire, mode);
    let personAnswer = origin === "worker" && consumeOwnAnswer(this.modeWire, mode);
    let { store, setAppState } = this.#e;
    if (store.getState().toolPermissionContext.mode === mode) return;
    let applyResult = setPermissionModeWithGuards(mode, store.getState().toolPermissionContext, (guard) => {
      recordAppliedMode(this.modeWire, mode, personAnswer);
      let activeRemote = this.#n.activeRemote;
      if (this.#a() && activeRemote.isRemoteMode && activeRemote.sessionId !== undefined)
        applyRemoteMode(setAppState, activeRemote.sessionId, mode, personAnswer ? "person" : "wire");
      setAppState((prevState) => ({
        ...prevState,
        toolPermissionContext: guard(prevState.toolPermissionContext),
      }));
    });
    if (!applyResult.ok) {
      logForDebugging(`[remote] Permission-mode broadcast '${mode}' rejected locally: ${applyResult.error}`, {
        level: "warn",
      });
      return;
    }
    logForDebugging(`[remote] Applied permission-mode broadcast: ${mode}`);
  };
  refuseSubmit(text, inputMode, submission) {
    let activeRemote = this.activeRemote;
    if (!activeRemote.isRemoteMode) return false;
    if (!text.trim()) return true;
    if (inputMode === "bash")
      return (
        this.#m(activeRemote, text, submission?.sentByPerson ?? false, submission?.pastedContents ?? {}) ===
        undefined
      );
    return false;
  }
  #m(activeRemote, text, sentByPerson, pastedContents) {
    this.#o = undefined;
    let noticeText;
    let { addNotification } = this.#l();
    addNotification({
      key: "remote-bash-mode-unavailable",
      kind: "feedback",
      text:
        noticeText ??
        (activeRemote.caps.bashExec
          ? "'!' commands aren't available in cloud sessions yet"
          : "'!' commands aren't available in a session on another machine"),
      ...(noticeText === undefined &&
        activeRemote.caps.bashExec && {
          row1Hint: NOT_IN_CLOUD_SESSIONS,
        }),
      priority: noticeText === undefined ? "medium" : "immediate",
    });
    if (noticeText !== undefined)
      this.#e.transcript.replace((rows) => [...rows, createSystemMessage(noticeText, "warning")]);
    return;
  }
  submit(text, { inputMode, pastedContents, fromKeybinding, sentByPerson, recordHistory }) {
    if (remoteSessionAwaits() && !prependModeCharacterToInput_2_2(text, inputMode, this.#e.scope.commands)) {
      this.#e.transcript.replace((rows) => [
        ...rows,
        createSystemMessage(NO_CLOUD_SESSION_MESSAGE, "notice"),
      ]);
      recordHistory({
        startsTurn: false,
      });
      return Promise.resolve(undefined);
    }
    let activeRemote = this.activeRemote;
    if (!activeRemote.isRemoteMode) return null;
    let { addNotification } = this.#l();
    if (inputMode === "bash") {
      let heldBash = this.#o;
      this.#o = undefined;
      let submission =
        heldBash !== undefined &&
        heldBash.input === text &&
        heldBash.sessionId === activeRemote.sessionId &&
        sentByPerson === true
          ? heldBash
          : this.#m(activeRemote, text, sentByPerson ?? false, pastedContents);
      return Promise.resolve(undefined);
    }
    let { commands } = this.#e.scope;
    let commandName = text.trim().startsWith("/") ? text.trim().slice(1).split(/\s/)[0] : undefined;
    let cmd = commandName
      ? commands.find(
          (command) =>
            isCommandEnabled(command) &&
            (command.name === commandName ||
              command.aliases?.includes(commandName) ||
              getCommandName(command) === commandName),
        )
      : undefined;
    let dispatchMode = cmd ? getThinClientDispatchMode(cmd, isRemoteControlChannelAvailable()) : "post-text";
    let loginAvailability = cmd?.name === "login" ? getLoginAvailability(activeRemote) : undefined;
    let loginRefusal = loginAvailability?.kind === "refused" ? loginAvailability : undefined;
    let blockedCommand =
      (dispatchMode === "unavailable" || loginRefusal !== undefined) && cmd
        ? cmd.name
        : commandName && !cmd && shippedCommandNames().has(commandName)
          ? commandName
          : undefined;
    if (blockedCommand) {
      logFeatureBad(
        cmdFeature(shippedCommandNames().has(blockedCommand) ? blockedCommand : "custom"),
        loginRefusal?.cause ?? "remote_unavailable",
      );
      let teleportHint =
        (blockedCommand === "teleport" || blockedCommand === "tp") &&
        activeRemote.sessionId !== undefined &&
        isSelfAddressableSessionId(activeRemote.sessionId)
          ? `/${blockedCommand} isn't available in cloud sessions. To continue this session locally, run this in a shell on your machine:
claude --teleport ${toCompatSessionId(activeRemote.sessionId)}`
          : undefined;
      let noticeText =
        loginRefusal?.notice ??
        (activeRemote.sessionId !== undefined && !activeRemote.viewerOnly
          ? (remoteCommandNoticeStub(blockedCommand) ?? teleportHint)
          : teleportHint);
      if (noticeText !== undefined)
        this.#e.transcript.replace((rows) => [...rows, createSystemMessage(noticeText, "notice")]);
      else {
        let commandHint =
          activeRemote.sessionId === undefined
            ? undefined
            : REMOTE_UNSUPPORTED_COMMAND_NOTICES.get(blockedCommand);
        addNotification({
          key: `remote-slash-command-unavailable-${blockedCommand}`,
          kind: "feedback",
          text:
            commandHint !== undefined
              ? `/${blockedCommand} isn't available in cloud sessions \u2014 ${commandHint}`
              : activeRemote.viewerOnly
                ? `/${blockedCommand} isn't available while viewing read-only`
                : `/${blockedCommand} isn't available in cloud sessions yet`,
          ...(commandHint === undefined &&
            !activeRemote.viewerOnly && {
              row1Hint: NOT_IN_CLOUD_SESSIONS,
            }),
          priority: "medium",
        });
      }
      recordHistory({
        startsTurn: false,
      });
      return Promise.resolve(undefined);
    }
    if (dispatchMode !== "post-text") return null;
    let pastedTextReference = resolvePastedTextReference(text, fromKeybinding ? {} : pastedContents);
    return this.#p(activeRemote, pastedTextReference, {
      clearsConversation: cmd?.name === "clear",
      recordHistory,
    });
  }
  async #p(activeRemote, splice, { clearsConversation, recordHistory }) {
    if (splice.kind === "cancel") {
      logFeatureBad("remote_paste_splice", splice.reason);
      let errorText =
        splice.reason === "paste_gone"
          ? buildUnavailablePasteError(splice.removed)
          : "Not sent: the pasted text is blank.";
      this.#e.transcript.replace((rows) => [...rows, createSystemMessage(errorText, "notice")]);
      return {
        handBack: true,
      };
    }
    if (splice.removed.length === 0 && splice.inlinePastes.length > 0) logFeatureOk("remote_paste_splice");
    if (splice.removed.length > 0) {
      logFeatureSad("remote_paste_splice", "paste_gone");
      this.#l().addNotification({
        key: "pasted-text-unavailable",
        kind: "feedback",
        text: describeRemovedPastes(splice.removed),
        priority: "immediate",
      });
    }
    let images = splice.images;
    let imagePasteIds = images.length > 0 ? images.map((image) => image.id) : undefined;
    let { text, postedText } = splice;
    if (images.length > 0) {
      let content = [];
      let postedContent = [];
      if (splice.text) {
        content.push({
          type: "text",
          text: splice.text,
        });
        postedContent.push({
          type: "text",
          text: splice.postedText,
        });
      }
      for (let image of images) {
        let source = {
          type: "base64",
          media_type: image.mediaType ?? "image/png",
          data: image.content,
        };
        content.push({
          type: "image",
          source,
        });
        postedContent.push({
          type: "image",
          source,
        });
      }
      text = content;
      postedText = postedContent;
    }
    let userMessage = createUserMessage({
      content: text,
      imagePasteIds,
      origin: {
        kind: "human",
      },
    });
    if (
      activeRemote.caps.deliveryReports &&
      this.#e.turn.isExternalLoading &&
      !clearsConversation &&
      !activeRemote.holdsSends()
    )
      this.holdLine(userMessage);
    else {
      this.landWaitingLines();
      this.#e.transcript.replace((rows) => [...rows, userMessage]);
    }
    this.#e.turn.stream.clearApiMetrics();
    recordHistory({
      startsTurn: true,
    });
    let sendResult = await activeRemote.sendMessage(postedText, {
      uuid: userMessage.uuid,
      ...(splice.inlinePastes.length > 0 && {
        inlinePastes: splice.inlinePastes,
      }),
      ...(clearsConversation && {
        clearsConversation: true,
      }),
    });
    if (!sendResult) this.landWaitingLines();
    if (sendResult && clearsConversation) {
      this.landWaitingLines();
      this.#e.transcript.replace(() => []);
      this.#e.applyLocalConversationReset(randomUUID());
    }
    return sendResult && !activeRemote.holdsSends()
      ? {
          sent: true,
          uuid: userMessage.uuid,
        }
      : undefined;
  }
  runBridgeImmediateCommand = (command, args, displayName, submissionOrigin) => {
    if (command.type !== "local") return;
    let { turn, transcript } = this.#e;
    (async () => {
      let activeNotices;
      try {
        let { mainLoopModel } = this.#l();
        activeNotices = getActiveNotices(
          turn.buildToolUseContext(transcript.getSnapshot(), [], createAbortController(), mainLoopModel),
          turn.guard,
        );
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "bridge immediate command context failed"));
        let failureText = `${escapeForkedSkillTag(sanitizeTelemetryString(command.name))} failed (detail withheld on this connection)`;
        turn.appendAfterTurn([
          createCommandInputMessage(
            formatCommandInputTags(
              displayName,
              isPromptHookObserved() || shouldEscapeNdjsonForBridge() ? "" : args,
            ),
          ),
          createCommandInputMessage(
            `<${LOCAL_COMMAND_STDERR}>${escapeXml(failureText)}</${LOCAL_COMMAND_STDERR}>`,
            {
              commandOutcome: {
                kind: "failed",
              },
            },
          ),
        ]);
        return;
      }
      await runLocalCommand({
        command,
        input: {
          command: getCommandName(command),
          args,
          origin: resolvePromptOrigin({
            submissionOrigin,
            dispatchedOverBridge: true,
            promptSource: undefined,
          }),
          presentation: viewportInfo(activeNotices.presentation),
        },
        displayName,
        invokedAs: undefined,
        context: activeNotices,
        printRows: turn.appendAfterTurn,
      });
    })();
  };
}
//@ chunk-18hwfzwa.js:322610-322653 placement
function selectIsExternalLoading_2(state) {
  return state.isExternalLoading;
}
//@ chunk-18hwfzwa.js:322653-322699 placement
function selectCombinedInitialTools(state) {
  return state.combinedInitialTools;
}
//@ chunk-18hwfzwa.js:322699-323813 placement
function useRemoteTransport({
  remoteSessionConfig,
  directConnectConfig,
  sshSession,
  adoptRateLimits,
  transcript,
  turn,
  idleNudge,
  scope,
  spinner,
  applyConversationReset,
  applyLocalConversationReset,
}) {
  let store = useAppStoreDirect();
  let setAppState = useSetAppState();
  let [transport] = useState(
    () =>
      new RemoteTransport({
        store,
        setAppState,
        transcript,
        turn,
        idleNudge,
        scope,
        spinner,
        applyConversationReset,
        applyLocalConversationReset,
        workerCommands: scope.workerCommands,
      }),
  );
  let toolPermissionContext = useAppState((appState) => appState.toolPermissionContext);
  let tools = useStoreSelector(scope, selectCombinedInitialTools);
  let enabled = useStoreSelector(turn, selectIsExternalLoading_2);
  let remoteSession = useRemoteSession({
    config: remoteSessionConfig,
    adoptRateLimits,
    sink: transport,
    requestDialog: scope.requestDialog,
    toolPermissionContext,
    tools,
  });
  let directConnect = useDirectConnect({
    config: directConnectConfig,
    sink: transport,
    requestDialog: scope.requestDialog,
    toolPermissionContext,
    tools,
  });
  let sshSession_2 = useSSHSession({
    session: sshSession,
    sink: transport,
    requestDialog: scope.requestDialog,
    toolPermissionContext,
    tools,
  });
  let activeRemote = useMemo(
    () =>
      remoteTransportKind({
        ssh: sshSession_2,
        direct: directConnect,
        ccr: remoteSession,
        ccrViewerOnly: remoteSessionConfig?.viewerOnly ?? false,
        ccrSessionId: remoteSessionConfig?.sessionId,
        ccrConsoleProfileBearer: remoteSessionConfig?.consoleProfileBearer === true,
      }),
    [
      sshSession_2,
      directConnect,
      remoteSession,
      remoteSessionConfig?.viewerOnly,
      remoteSessionConfig?.sessionId,
      remoteSessionConfig?.consoleProfileBearer,
    ],
  );
  useLayoutEffect(() => {
    transport.setActiveRemote(activeRemote);
  }, [transport, activeRemote]);
  useRemotePermissionModeSync(transport);
  return {
    transport,
    activeRemote,
    cancellableExternalLoading: canUseRemoteFeature(activeRemote, enabled),
  };
}
export { useRemoteTransport };
