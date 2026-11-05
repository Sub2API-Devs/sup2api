/**
 * remote/RemoteTransport.ts
 *
 * 2.1.316 新增。REPL 远程传输控制器（RemoteTransport）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (11)
 * attribution: placement 9, sole-consumer 2
 */
import { randomUUID } from "crypto";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { stringSchema, objectSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../ink/components/Text.js";
import { logEvent } from "../services/analytics/index.js";
import { env } from "../utils/env.js";
import { DETACHED_SHELL_POLL_MS, AUTO_RESTORE_CANCEL } from "../tasks/LocalShellTask/DetachedShellProcess.js";
import { logError } from "../utils/log.js";
import {
  logFeatureBad,
  logFeatureSad,
  logFeatureOk,
  cmdFeature,
} from "../services/analytics/featureTelemetry.js";
import { BOXED_DIAMOND_GLYPH } from "../constants/figures.js";
import {
  createRemoteModeHandle,
  LOCAL_MODE_HANDLE,
  isRemoteControlChannelAvailable,
  canUseRemoteFeature,
} from "./remoteMode.js";
import { createSignal } from "../utils/signal.js";
import {
  createRetractionState,
  retractedUserMessageUuids,
  mergeSessionCapabilities,
} from "./remoteSessionEvents.js";
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
import { createStore } from "../state/store.js";
import { errorMessage, withTelemetryMessage, toError } from "../utils/errors.js";
import { isDeviceIdentityEnabledCached } from "../services/analytics/violinGates.js";
import { DoctorLazy } from "../cli/handlers/util.js";
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
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { buildUnavailablePasteError, describeRemovedPastes, getHistoryGeneration } from "../history.js";
import { buildNotices } from "../utils/statusNoticeDefinitions.js";
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

//@ chunk-czq1j3j2.js:337506-337520 placement
var DETACHED_DEFAULT_GRACE_MS = 45000;
//@ chunk-czq1j3j2.js:337713-338281 sole-consumer
class EscTakeBack {
  #e;
  #t;
  #o = new Map();
  #n = 0;
  #r;
  #s;
  #l;
  #i;
  constructor(
    transcript,
    waitingLines,
    firstPromptUuid,
    graceMs = DETACHED_DEFAULT_GRACE_MS,
    pollMs = DETACHED_SHELL_POLL_MS,
  ) {
    this.#e = transcript;
    this.#t = waitingLines;
    this.#s = graceMs;
    this.#l = pollMs;
    this.#r = transcript
      .getSnapshot()
      .find((entry) => entry.type === "user" && entry.uuid === firstPromptUuid);
  }
  noteSent(sent) {
    this.#n++;
    this.#o.set(sent.message.uuid, sent);
  }
  noteStoppedTurnEnded(uuids) {
    this.#i?.(uuids);
  }
  noteTurnEnded() {
    for (let [uuid, sent] of this.#o)
      if (sent.overRunningTurn) sent.overRunningTurn = false;
      else this.#o.delete(uuid);
  }
  forgetSends() {
    this.#o.clear();
    this.#n++;
  }
  beforeInterrupt(error, context) {
    let pending = this.#o;
    this.#o = new Map();
    try {
    } catch (error) {
      logTakeBackError(error);
    }
    return;
  }
  async #a(signal, { sends, rowsAtEsc, lastSeenUuid, sendCount, screen }) {}
}
//@ chunk-czq1j3j2.js:338281-338367 sole-consumer
function logTakeBackError(error) {
  logFeatureBad("repl_rewind_conversation", "esc_take_back_threw", {
    source: AUTO_RESTORE_CANCEL,
  });
  logError(error);
}
//@ chunk-czq1j3j2.js:338367-338861 placement
/**
 * 远程会话里不支持的命令说明表（ide/resume/continue/statusline/workflows/artifacts）及统一提示。
 */
var REMOTE_UNSUPPORTED_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REMOTE_UNSUPPORTED_COMMAND_NOTICES;
deferInit("chunk-czq1j3j2.js:338367", () => {
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
//@ chunk-czq1j3j2.js:338861-338884 placement
function remoteCommandNoticeStub(args) {
  return;
}
//@ chunk-czq1j3j2.js:338884-338954 placement
function isSameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
//@ chunk-czq1j3j2.js:338954-339162 placement
function remoteTransportKind({ ssh, direct, ccr, ccrViewerOnly, ccrSessionId, ccrConsoleProfileBearer }) {
  return ssh.isRemoteMode
    ? createRemoteModeHandle("ssh", ssh, false)
    : direct.isRemoteMode
      ? createRemoteModeHandle("direct", direct, false)
      : ccr.isRemoteMode
        ? createRemoteModeHandle("ccr", ccr, ccrViewerOnly, ccrSessionId, ccrConsoleProfileBearer)
        : LOCAL_MODE_HANDLE;
}
//@ chunk-czq1j3j2.js:339162-349406 placement
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
  #r = createSignal();
  retraction = createRetractionState();
  modeWire = createModeSyncState();
  #s = mainAgentId();
  #l = createStore([]);
  waitingLines = this.#l;
  #i = new Set();
  #a = new Set();
  #c = new Set();
  escTakeBack;
  constructor(services) {
    this.#e = services;
    this.escTakeBack = new EscTakeBack(services.transcript, this.waitingLines, services.firstPromptUuid);
  }
  subscribe = this.#r.subscribe;
  getSnapshot = () => this.#n;
  get activeRemote() {
    return this.#n.activeRemote;
  }
  get hasLineToSendNow() {
    return this.#a.size > 0;
  }
  takeLinesToSendNow = () => {
    let held = [...this.#a];
    for (let uuid of held) this.#c.add(uuid);
    this.#a.clear();
    if (held.length > 0) this.#r.emit();
    return held;
  };
  sendNowMovedNothing = (uuids) => {
    let filtered = uuids.filter((uuid) => this.#c.delete(uuid));
    for (let uuid of filtered) this.#a.add(uuid);
    if (filtered.length > 0) this.#r.emit();
  };
  #d() {
    let activeRemote = this.#n.activeRemote;
    return isDeviceIdentityEnabledCached() && activeRemote.isRemoteMode && activeRemote.caps.sessionRecord;
  }
  bindHost(host) {
    this.#t = host;
  }
  #u() {
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
    this.#r.emit();
  }
  setMessages = (updater) => {
    this.#e.transcript.replace(updater);
  };
  setIsLoading = (loading, reason) => {
    if (!loading) {
      if (reason === undefined) {
        this.#a.clear();
        this.#c.clear();
      }
      this.landWaitingLines();
    }
    this.#e.turn.setExternalLoading(loading);
  };
  holdLine = (line, isRefused = false) => {
    (isRefused ? this.#c : this.#a).add(line.uuid.toLowerCase());
    this.#l.setState((waitingLines) =>
      waitingLines.some((waiting) => waiting.uuid === line.uuid) ? waitingLines : [...waitingLines, line],
    );
  };
  forgetLine = (uuid) => {
    let lower = uuid.toLowerCase();
    this.#c.delete(lower);
    if (this.#a.delete(lower)) this.#r.emit();
  };
  lineTaken = (uuid) => {
    this.forgetLine(uuid);
    let lower = uuid.toLowerCase();
    let takenCount = this.#p((waiting) => waiting.uuid.toLowerCase() === lower);
    for (let idx = 0; idx < takenCount; idx++) logFeatureOk("cloud_waiting_line");
  };
  landWaitingLines = () => {
    let landedCount = this.#p(() => true);
    for (let idx = 0; idx < landedCount; idx++) logFeatureSad("cloud_waiting_line", "landed_without_report");
  };
  rowsDrawn = (drawnRows) => {
    if (this.#i.size === 0) return;
    let drawnUuids = new Set(drawnRows.map((row) => row.uuid));
    let transcriptUuids = new Set(this.#e.transcript.getSnapshot().map((row) => row.uuid));
    let filtered = [...this.#i].filter((uuid) => drawnUuids.has(uuid) || !transcriptUuids.has(uuid));
    for (let uuid of filtered) this.#i.delete(uuid);
    if (filtered.length > 0)
      this.#l.setState((waitingLines) => waitingLines.filter((line) => !filtered.includes(line.uuid)));
  };
  #p(predicate) {
    let filtered = this.#l.getState().filter((line) => predicate(line) && !this.#i.has(line.uuid));
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
      let nextTranscripts = applyInProgressToolUses(appState.transcripts, this.#s, toolUseIds);
      return nextTranscripts === appState.transcripts
        ? appState
        : {
            ...appState,
            transcripts: nextTranscripts,
          };
    });
  };
  onTurnComplete = (completion) => {
    this.escTakeBack.noteTurnEnded();
    this.escTakeBack.noteStoppedTurnEnded(retractedUserMessageUuids(completion));
    this.#e.turn.markRemoteTurnComplete(completion);
  };
  onKilledTurnEnded = (frame) => {
    this.escTakeBack.noteStoppedTurnEnded(retractedUserMessageUuids(frame));
  };
  onTurnStopped = () => {
    this.escTakeBack.noteTurnEnded();
    this.#e.turn.markRemoteTurnStopped();
  };
  onOtherTurnComplete = (otherCompletion) => {
    this.escTakeBack.noteTurnEnded();
    this.#e.idleNudge.onOtherTurnComplete(otherCompletion);
  };
  onConversationReset = (reset) => {
    this.#e.applyConversationReset(reset);
  };
  onInit = (initFrame) => {
    this.#r.emit();
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
    let personOriginated = this.#d();
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
    if (!this.#d()) return;
    noteOwnModeAnswerPending(this.modeWire, answer);
    let activeRemote = this.#n.activeRemote;
    if (activeRemote.isRemoteMode && activeRemote.sessionId !== undefined) {
      let { setAppState } = this.#e;
      landOutstandingMode(setAppState, activeRemote.sessionId, answer);
    }
  };
  noteOwnUnrecordedModeAnswer = () => {
    if (this.#d()) {
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
      if (this.#d()) recordModeBroadcast(this.modeWire, null);
      return;
    }
    let autoModeBroadcast = this.modeWire.lastBroadcast?.mode === "auto";
    recordModeBroadcast(this.modeWire, mode);
    let personAnswer = origin === "worker" && consumeOwnAnswer(this.modeWire, mode);
    let { store, setAppState } = this.#e;
    if (store.getState().toolPermissionContext.mode === mode) return;
    let applyResult = setPermissionModeWithGuards(mode, store.getState().toolPermissionContext, (guard) => {
      recordAppliedMode(this.modeWire, mode, personAnswer);
      let activeRemote = this.#n.activeRemote;
      if (this.#d() && activeRemote.isRemoteMode && activeRemote.sessionId !== undefined)
        applyRemoteMode(setAppState, activeRemote.sessionId, mode, personAnswer ? "person" : "wire");
      setAppState((prevState) => {
        let nextContext = guard(prevState.toolPermissionContext);
        let restoredContext =
          activeRemote.isRemoteMode &&
          (activeRemote.caps.sessionRecord || !activeRemote.caps.setPermissionMode) &&
          nextContext.mode === "plan" &&
          nextContext.prePlanMode === "auto" &&
          !autoModeBroadcast &&
          this.modeWire.ownAck?.mode !== "auto";
        return {
          ...prevState,
          toolPermissionContext: restoredContext
            ? {
                ...nextContext,
                prePlanMode: "default",
              }
            : nextContext,
        };
      });
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
    let { addNotification } = this.#u();
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
  submit(text, { inputMode, pastedContents, fromKeybinding, sentByPerson, sentNow, recordHistory }) {
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
    let { addNotification } = this.#u();
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
    return this.#f(activeRemote, pastedTextReference, {
      clearsConversation: cmd?.name === "clear",
      sentNow: sentNow ?? false,
      recordHistory,
    });
  }
  async #f(activeRemote, splice, { clearsConversation, sentNow, recordHistory }) {
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
      this.#u().addNotification({
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
    let isExternalLoading = this.#e.turn.isExternalLoading && !activeRemote.holdsSends();
    if (activeRemote.caps.deliveryReports && isExternalLoading && !clearsConversation)
      this.holdLine(userMessage, sentNow);
    else {
      this.landWaitingLines();
      this.#e.transcript.replace((rows) => [...rows, userMessage]);
      if (activeRemote.holdsSends() && !clearsConversation) this.#a.add(userMessage.uuid.toLowerCase());
    }
    this.#e.turn.stream.clearApiMetrics();
    let historyGeneration = getHistoryGeneration();
    recordHistory({
      startsTurn: true,
    });
    let historyGeneration_2 = getHistoryGeneration();
    let sendResult = activeRemote.sendMessage(postedText, {
      uuid: userMessage.uuid,
      ...(splice.inlinePastes.length > 0 && {
        inlinePastes: splice.inlinePastes,
      }),
      ...(clearsConversation && {
        clearsConversation: true,
      }),
    });
    if (!clearsConversation)
      this.escTakeBack.noteSent({
        message: userMessage,
        sending: sendResult,
        overRunningTurn: isExternalLoading,
        postedText: splice.postedText,
        historyGeneration: historyGeneration_2 === historyGeneration ? undefined : historyGeneration_2,
      });
    let sendResult_2 = await sendResult;
    if (!sendResult_2) this.landWaitingLines();
    if (sendResult_2 && clearsConversation) {
      this.landWaitingLines();
      this.#e.transcript.replace(() => []);
      this.#e.applyLocalConversationReset(randomUUID());
    }
    return sendResult_2 && !activeRemote.holdsSends()
      ? {
          sent: true,
          uuid: userMessage.uuid,
        }
      : undefined;
  }
  runBridgeImmediateCommand = (command, args, displayName, submissionOrigin, relayAuthored = false) => {
    if (command.type !== "local") return;
    let { turn, transcript } = this.#e;
    (async () => {
      let activeNotices;
      try {
        let { mainLoopModel } = this.#u();
        activeNotices = buildNotices(
          turn.buildToolUseContext(transcript.getSnapshot(), [], createAbortController(), mainLoopModel),
          turn.guard,
          relayAuthored,
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
//@ chunk-czq1j3j2.js:349406-349449 placement
function selectIsExternalLoading_2(state) {
  return state.isExternalLoading;
}
//@ chunk-czq1j3j2.js:349449-349495 placement
function selectCombinedInitialTools(state) {
  return state.combinedInitialTools;
}
//@ chunk-czq1j3j2.js:349495-350646 placement
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
        firstPromptUuid: remoteSessionConfig?.initialPromptUuid,
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
