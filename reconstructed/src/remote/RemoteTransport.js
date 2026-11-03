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
import { BOXED_DIAMOND_GLYPH } from "../utils/permissions/autoModeRulesPrompt.js";
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
import { string } from "../../vendor/zod/v4/classic/schemas.js";
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
import { y, Q, zt } from "../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useRemoteSession } from "../hooks/useRemoteSession.js";
import { useDirectConnect } from "../hooks/useDirectConnect.js";
import { useSSHSession } from "../hooks/useSSHSession.js";

//@ chunk-18hwfzwa.js:312946-313440 placement
/**
 * 远程会话里不支持的命令说明表（ide/resume/continue/statusline/workflows/artifacts）及统一提示。
 */
var REMOTE_UNSUPPORTED_COMMANDS =
  "run /exit, then `claude --cloud <session-id>` to open another one (ids are listed at claude.ai/code)";
var REMOTE_UNSUPPORTED_COMMAND_NOTICES = new Map([
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
//@ chunk-18hwfzwa.js:313440-313463 placement
function remoteCommandNoticeStub(h) {
  return;
}
//@ chunk-18hwfzwa.js:313463-313533 placement
function isSameStringArray(h, x) {
  return h.length === x.length && h.every((D, L) => D === x[L]);
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
  constructor(h) {
    this.#e = h;
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
  bindHost(h) {
    this.#t = h;
  }
  #l() {
    if (this.#t === null) throw Error("RemoteTransport: used before its screen bound a host");
    return this.#t;
  }
  setActiveRemote(h) {
    let x = h.isRemoteMode ? h : null;
    let D = h.isRemoteMode && h.caps.catchupReplay ? "ccr-api" : "local-jsonl";
    let caps = getCaps();
    if (caps.remote !== x || caps.transcriptSource !== D)
      setCaps({
        ...caps,
        remote: x,
        transcriptSource: D,
      });
    if (h === this.#n.activeRemote) return;
    this.#n = {
      activeRemote: h,
    };
    if (!h.isRemoteMode) this.#e.workerCommands.setState(() => null);
    this.#s.emit();
  }
  setMessages = (h) => {
    this.#e.transcript.replace(h);
  };
  setIsLoading = (h) => {
    if (!h) this.landWaitingLines();
    this.#e.turn.setExternalLoading(h);
  };
  holdLine = (h) => {
    this.#c.setState((x) => (x.some((D) => D.uuid === h.uuid) ? x : [...x, h]));
  };
  lineTaken = (h) => {
    let lower = h.toLowerCase();
    let D = this.#d((L) => L.uuid.toLowerCase() === lower);
    for (let idx = 0; idx < D; idx++) logFeatureOk("cloud_waiting_line");
  };
  landWaitingLines = () => {
    let h = this.#d(() => true);
    for (let idx = 0; idx < h; idx++) logFeatureSad("cloud_waiting_line", "landed_without_report");
  };
  rowsDrawn = (h) => {
    if (this.#i.size === 0) return;
    let x = new Set(h.map((ee) => ee.uuid));
    let D = new Set(this.#e.transcript.getSnapshot().map((ee) => ee.uuid));
    let filtered = [...this.#i].filter((ee) => x.has(ee) || !D.has(ee));
    for (let ee of filtered) this.#i.delete(ee);
    if (filtered.length > 0) this.#c.setState((ee) => ee.filter((ke) => !filtered.includes(ke.uuid)));
  };
  #d(h) {
    let filtered = this.#c.getState().filter((D) => h(D) && !this.#i.has(D.uuid));
    if (filtered.length === 0) return 0;
    for (let D of filtered) this.#i.add(D.uuid);
    this.#e.transcript.replace((D) => [...D, ...filtered.filter((L) => !D.some((ee) => ee.uuid === L.uuid))]);
    return filtered.length;
  }
  getIsLoading = () => this.#e.turn.isExternalLoading;
  get streaming() {
    return this.#e.turn.stream;
  }
  setStreamMode = (h) => {
    this.#e.spinner.setMode(h);
  };
  setInProgressToolUseIDs = (h) => {
    this.#e.store.setState((x) => {
      let D = applyInProgressToolUses(x.transcripts, this.#r, h);
      return D === x.transcripts
        ? x
        : {
            ...x,
            transcripts: D,
          };
    });
  };
  onTurnComplete = (h) => {
    this.#e.turn.markRemoteTurnComplete(h);
  };
  onTurnStopped = () => {
    this.#e.turn.markRemoteTurnStopped();
  };
  onOtherTurnComplete = (h) => {
    this.#e.idleNudge.onOtherTurnComplete(h);
  };
  onConversationReset = (h) => {
    this.#e.applyConversationReset(h);
  };
  onInit = (h) => {
    this.#s.emit();
    let { workerCommands, setAppState } = this.#e;
    if (h.slash_commands !== undefined) {
      let ee = new Set(h.slash_commands);
      workerCommands.setState(() => ee);
    }
    setAppState((ee) => {
      let workerInventory = ee.workerInventory ?? undefined;
      let Re = mergeSessionCapabilities(workerInventory, {
        ...h,
        slashCommands: h.slash_commands,
      });
      if (Re === undefined || Re === workerInventory) return ee;
      return workerInventory !== undefined &&
        isSameStringArray(workerInventory.skills, Re.skills) &&
        isSameStringArray(workerInventory.plugins, Re.plugins) &&
        isSameStringArray(workerInventory.tools ?? [], Re.tools ?? []) &&
        isSameStringArray(workerInventory.commands ?? [], Re.commands ?? [])
        ? ee
        : {
            ...ee,
            workerInventory: Re,
          };
    });
    let model = h.model;
    if (model !== undefined)
      setAppState((ee) =>
        ee.mainLoopModel === model
          ? ee
          : {
              ...ee,
              mainLoopModel: model,
            },
      );
  };
  noteOwnPermissionModePush = (mode) => {
    let x = this.#a();
    let sent = recordOwnSend(this.modeWire, mode, x ? "person" : "wire");
    return x
      ? () => {
          recordOwnAck(this.modeWire, {
            mode,
            origin: "person",
            sent,
          });
        }
      : () => {};
  };
  noteOwnPermissionModeAnswer = (h) => {
    if (!this.#a()) return;
    noteOwnModeAnswerPending(this.modeWire, h);
    let activeRemote = this.#n.activeRemote;
    if (activeRemote.isRemoteMode && activeRemote.sessionId !== undefined) {
      let { setAppState } = this.#e;
      landOutstandingMode(setAppState, activeRemote.sessionId, h);
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
  onPermissionModeChange = (h, x = "worker") => {
    if (!EXTERNAL_PERMISSION_MODES.includes(h)) {
      if (this.#a()) recordModeBroadcast(this.modeWire, null);
      return;
    }
    recordModeBroadcast(this.modeWire, h);
    let D = x === "worker" && consumeOwnAnswer(this.modeWire, h);
    let { store, setAppState } = this.#e;
    if (store.getState().toolPermissionContext.mode === h) return;
    let ke = setPermissionModeWithGuards(h, store.getState().toolPermissionContext, (Re) => {
      recordAppliedMode(this.modeWire, h, D);
      let activeRemote = this.#n.activeRemote;
      if (this.#a() && activeRemote.isRemoteMode && activeRemote.sessionId !== undefined)
        applyRemoteMode(setAppState, activeRemote.sessionId, h, D ? "person" : "wire");
      setAppState((He) => ({
        ...He,
        toolPermissionContext: Re(He.toolPermissionContext),
      }));
    });
    if (!ke.ok) {
      logForDebugging(`[remote] Permission-mode broadcast '${h}' rejected locally: ${ke.error}`, {
        level: "warn",
      });
      return;
    }
    logForDebugging(`[remote] Applied permission-mode broadcast: ${h}`);
  };
  refuseSubmit(h, x, D) {
    let activeRemote = this.activeRemote;
    if (!activeRemote.isRemoteMode) return false;
    if (!h.trim()) return true;
    if (x === "bash")
      return this.#m(activeRemote, h, D?.sentByPerson ?? false, D?.pastedContents ?? {}) === undefined;
    return false;
  }
  #m(h, x, D, L) {
    this.#o = undefined;
    let ee;
    let { addNotification } = this.#l();
    addNotification({
      key: "remote-bash-mode-unavailable",
      kind: "feedback",
      text:
        ee ??
        (h.caps.bashExec
          ? "'!' commands aren't available in cloud sessions yet"
          : "'!' commands aren't available in a session on another machine"),
      ...(ee === undefined &&
        h.caps.bashExec && {
          row1Hint: NOT_IN_CLOUD_SESSIONS,
        }),
      priority: ee === undefined ? "medium" : "immediate",
    });
    if (ee !== undefined) this.#e.transcript.replace((Re) => [...Re, createSystemMessage(ee, "warning")]);
    return;
  }
  submit(text, { inputMode, pastedContents, fromKeybinding, sentByPerson, recordHistory }) {
    if (remoteSessionAwaits() && !prependModeCharacterToInput_2_2(text, inputMode, this.#e.scope.commands)) {
      this.#e.transcript.replace((Et) => [...Et, createSystemMessage(NO_CLOUD_SESSION_MESSAGE, "notice")]);
      recordHistory({
        startsTurn: false,
      });
      return Promise.resolve(undefined);
    }
    let activeRemote = this.activeRemote;
    if (!activeRemote.isRemoteMode) return null;
    let { addNotification } = this.#l();
    if (inputMode === "bash") {
      let Et = this.#o;
      this.#o = undefined;
      let Dt =
        Et !== undefined &&
        Et.input === text &&
        Et.sessionId === activeRemote.sessionId &&
        sentByPerson === true
          ? Et
          : this.#m(activeRemote, text, sentByPerson ?? false, pastedContents);
      return Promise.resolve(undefined);
    }
    let { commands } = this.#e.scope;
    let ze = text.trim().startsWith("/") ? text.trim().slice(1).split(/\s/)[0] : undefined;
    let cmd = ze
      ? commands.find(
          (command) =>
            isCommandEnabled(command) &&
            (command.name === ze || command.aliases?.includes(ze) || getCommandName(command) === ze),
        )
      : undefined;
    let rt = cmd ? getThinClientDispatchMode(cmd, isRemoteControlChannelAvailable()) : "post-text";
    let kt = cmd?.name === "login" ? getLoginAvailability(activeRemote) : undefined;
    let At = kt?.kind === "refused" ? kt : undefined;
    let It =
      (rt === "unavailable" || At !== undefined) && cmd
        ? cmd.name
        : ze && !cmd && shippedCommandNames().has(ze)
          ? ze
          : undefined;
    if (It) {
      logFeatureBad(
        cmdFeature(shippedCommandNames().has(It) ? It : "custom"),
        At?.cause ?? "remote_unavailable",
      );
      let Et =
        (It === "teleport" || It === "tp") &&
        activeRemote.sessionId !== undefined &&
        isSelfAddressableSessionId(activeRemote.sessionId)
          ? `/${It} isn't available in cloud sessions. To continue this session locally, run this in a shell on your machine:
claude --teleport ${toCompatSessionId(activeRemote.sessionId)}`
          : undefined;
      let Dt =
        At?.notice ??
        (activeRemote.sessionId !== undefined && !activeRemote.viewerOnly
          ? (remoteCommandNoticeStub(It) ?? Et)
          : Et);
      if (Dt !== undefined) this.#e.transcript.replace((Lt) => [...Lt, createSystemMessage(Dt, "notice")]);
      else {
        let Lt =
          activeRemote.sessionId === undefined ? undefined : REMOTE_UNSUPPORTED_COMMAND_NOTICES.get(It);
        addNotification({
          key: `remote-slash-command-unavailable-${It}`,
          kind: "feedback",
          text:
            Lt !== undefined
              ? `/${It} isn't available in cloud sessions \u2014 ${Lt}`
              : activeRemote.viewerOnly
                ? `/${It} isn't available while viewing read-only`
                : `/${It} isn't available in cloud sessions yet`,
          ...(Lt === undefined &&
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
    if (rt !== "post-text") return null;
    let pastedTextReference = resolvePastedTextReference(text, fromKeybinding ? {} : pastedContents);
    return this.#p(activeRemote, pastedTextReference, {
      clearsConversation: cmd?.name === "clear",
      recordHistory,
    });
  }
  async #p(h, x, { clearsConversation, recordHistory }) {
    if (x.kind === "cancel") {
      logFeatureBad("remote_paste_splice", x.reason);
      let ze =
        x.reason === "paste_gone"
          ? buildUnavailablePasteError(x.removed)
          : "Not sent: the pasted text is blank.";
      this.#e.transcript.replace((Xe) => [...Xe, createSystemMessage(ze, "notice")]);
      return {
        handBack: true,
      };
    }
    if (x.removed.length === 0 && x.inlinePastes.length > 0) logFeatureOk("remote_paste_splice");
    if (x.removed.length > 0) {
      logFeatureSad("remote_paste_splice", "paste_gone");
      this.#l().addNotification({
        key: "pasted-text-unavailable",
        kind: "feedback",
        text: describeRemovedPastes(x.removed),
        priority: "immediate",
      });
    }
    let images = x.images;
    let imagePasteIds = images.length > 0 ? images.map((image) => image.id) : undefined;
    let { text, postedText } = x;
    if (images.length > 0) {
      let ze = [];
      let Xe = [];
      if (x.text) {
        ze.push({
          type: "text",
          text: x.text,
        });
        Xe.push({
          type: "text",
          text: x.postedText,
        });
      }
      for (let image of images) {
        let source = {
          type: "base64",
          media_type: image.mediaType ?? "image/png",
          data: image.content,
        };
        ze.push({
          type: "image",
          source,
        });
        Xe.push({
          type: "image",
          source,
        });
      }
      text = ze;
      postedText = Xe;
    }
    let userMessage = createUserMessage({
      content: text,
      imagePasteIds,
      origin: {
        kind: "human",
      },
    });
    if (h.caps.deliveryReports && this.#e.turn.isExternalLoading && !clearsConversation && !h.holdsSends())
      this.holdLine(userMessage);
    else {
      this.landWaitingLines();
      this.#e.transcript.replace((ze) => [...ze, userMessage]);
    }
    this.#e.turn.stream.clearApiMetrics();
    recordHistory({
      startsTurn: true,
    });
    let We = await h.sendMessage(postedText, {
      uuid: userMessage.uuid,
      ...(x.inlinePastes.length > 0 && {
        inlinePastes: x.inlinePastes,
      }),
      ...(clearsConversation && {
        clearsConversation: true,
      }),
    });
    if (!We) this.landWaitingLines();
    if (We && clearsConversation) {
      this.landWaitingLines();
      this.#e.transcript.replace(() => []);
      this.#e.applyLocalConversationReset(randomUUID());
    }
    return We && !h.holdsSends()
      ? {
          sent: true,
          uuid: userMessage.uuid,
        }
      : undefined;
  }
  runBridgeImmediateCommand = (h, x, D, submissionOrigin) => {
    if (h.type !== "local") return;
    let { turn, transcript } = this.#e;
    (async () => {
      let Re;
      try {
        let { mainLoopModel } = this.#l();
        Re = getActiveNotices(
          turn.buildToolUseContext(transcript.getSnapshot(), [], createAbortController(), mainLoopModel),
          turn.guard,
        );
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "bridge immediate command context failed"));
        let He = `${escapeForkedSkillTag(sanitizeTelemetryString(h.name))} failed (detail withheld on this connection)`;
        turn.appendAfterTurn([
          createCommandInputMessage(
            formatCommandInputTags(D, isPromptHookObserved() || shouldEscapeNdjsonForBridge() ? "" : x),
          ),
          createCommandInputMessage(`<${LOCAL_COMMAND_STDERR}>${escapeXml(He)}</${LOCAL_COMMAND_STDERR}>`, {
            commandOutcome: {
              kind: "failed",
            },
          }),
        ]);
        return;
      }
      await runLocalCommand({
        command: h,
        input: {
          command: getCommandName(h),
          args: x,
          origin: resolvePromptOrigin({
            submissionOrigin,
            dispatchedOverBridge: true,
            promptSource: undefined,
          }),
          presentation: viewportInfo(Re.presentation),
        },
        displayName: D,
        invokedAs: undefined,
        context: Re,
        printRows: turn.appendAfterTurn,
      });
    })();
  };
}
//@ chunk-18hwfzwa.js:322610-322653 placement
function selectIsExternalLoading_2(h) {
  return h.isExternalLoading;
}
//@ chunk-18hwfzwa.js:322653-322699 placement
function selectCombinedInitialTools(h) {
  return h.combinedInitialTools;
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
  let [kt] = y(
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
  let toolPermissionContext = useAppState((Xt) => Xt.toolPermissionContext);
  let tools = useStoreSelector(scope, selectCombinedInitialTools);
  let storeSelector = useStoreSelector(turn, selectIsExternalLoading_2);
  let remoteSession = useRemoteSession({
    config: remoteSessionConfig,
    adoptRateLimits,
    sink: kt,
    requestDialog: scope.requestDialog,
    toolPermissionContext,
    tools,
  });
  let directConnect = useDirectConnect({
    config: directConnectConfig,
    sink: kt,
    requestDialog: scope.requestDialog,
    toolPermissionContext,
    tools,
  });
  let sshSession_2 = useSSHSession({
    session: sshSession,
    sink: kt,
    requestDialog: scope.requestDialog,
    toolPermissionContext,
    tools,
  });
  let oo = Q(
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
  zt(() => {
    kt.setActiveRemote(oo);
  }, [kt, oo]);
  useRemotePermissionModeSync(kt);
  return {
    transport: kt,
    activeRemote: oo,
    cancellableExternalLoading: canUseRemoteFeature(oo, storeSelector),
  };
}
export { useRemoteTransport };
