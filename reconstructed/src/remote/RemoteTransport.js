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
import { hf } from "../utils/permissions/autoModeRulesPrompt.js";
import { createRemoteModeHandle, Rdo, ml, xdo } from "./remoteMode.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { o } from "../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../ink/components/Text.js";
import { createSignal } from "../utils/signal.js";
import { createRetractionState, mergeSessionCapabilities } from "./remoteSessionEvents.js";
import {
  createModeSyncState,
  recordOwnSend,
  recordOwnAck,
  SUe,
  landOutstandingMode,
  wUe,
  handleUnrecordedAnswer,
  recordModeBroadcast,
  consumeOwnAnswer,
  yUe,
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
  htt,
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
import { bP } from "../utils/xmlTagText.js";
import { sanitizeTelemetryString } from "../utils/sanitization.js";
import { isPromptHookObserved } from "../utils/telemetry/sessionTracing.js";
import { shouldEscapeNdjsonForBridge } from "../cli/ndjsonSafeStringify.js";
import { LOCAL_COMMAND_STDERR } from "../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { runLocalCommand } from "../screens/repl/runLocalCommand.js";
import { resolvePromptOrigin } from "../utils/messageOrigin.js";
import { viewportInfo } from "../plugins/functionHooks/surfaceBinding.js";
import { Cr, useSetAppState, useAppState } from "../state/AppState.js";
import { y, Q, zt } from "../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useRemoteSession } from "../hooks/useRemoteSession.js";
import { useDirectConnect } from "../hooks/useDirectConnect.js";
import { useSSHSession } from "../hooks/useSSHSession.js";

//@ chunk-18hwfzwa.js:312946-313440 placement
var REMOTE_UNSUPPORTED_COMMANDS =
    "run /exit, then `claude --cloud <session-id>` to open another one (ids are listed at claude.ai/code)",
  M0t = new Map([
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
      `once this session has an artifact, choose ${hf} under the prompt (arrow keys, then Enter)`,
    ],
  ]);
//@ chunk-18hwfzwa.js:313440-313463 placement
function I0t(h) {
  return;
}
//@ chunk-18hwfzwa.js:313463-313533 placement
function tz(h, x) {
  return h.length === x.length && h.every((D, L) => D === x[L]);
}
//@ chunk-18hwfzwa.js:313533-313741 placement
function remoteTransportKind({
  ssh: ssh,
  direct: direct,
  ccr: ccr,
  ccrViewerOnly: ccrViewerOnly,
  ccrSessionId: ccrSessionId,
  ccrConsoleProfileBearer: ccrConsoleProfileBearer,
}) {
  return ssh.isRemoteMode
    ? createRemoteModeHandle("ssh", ssh, !1)
    : direct.isRemoteMode
      ? createRemoteModeHandle("direct", direct, !1)
      : ccr.isRemoteMode
        ? createRemoteModeHandle("ccr", ccr, ccrViewerOnly, ccrSessionId, ccrConsoleProfileBearer)
        : Rdo;
}
/**
 * 远端传输（ccr-api / ssh / direct）：订阅云会话事件、权限模式广播、等待行、会话记录与能力查询；未绑定屏幕时报 "RemoteTransport: used before…"。
 */
//@ chunk-18hwfzwa.js:313741-322610 placement
class RemoteTransport {
  #e;
  #t = null;
  #o = void 0;
  #n = { activeRemote: Rdo };
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
    let x = h.isRemoteMode ? h : null,
      D = h.isRemoteMode && h.caps.catchupReplay ? "ccr-api" : "local-jsonl",
      L = getCaps();
    if (L.remote !== x || L.transcriptSource !== D) setCaps({ ...L, remote: x, transcriptSource: D });
    if (h === this.#n.activeRemote) return;
    if (((this.#n = { activeRemote: h }), !h.isRemoteMode)) this.#e.workerCommands.setState(() => null);
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
    let lower = h.toLowerCase(),
      D = this.#d((L) => L.uuid.toLowerCase() === lower);
    for (let L = 0; L < D; L++) logFeatureOk("cloud_waiting_line");
  };
  landWaitingLines = () => {
    let h = this.#d(() => !0);
    for (let x = 0; x < h; x++) logFeatureSad("cloud_waiting_line", "landed_without_report");
  };
  rowsDrawn = (h) => {
    if (this.#i.size === 0) return;
    let x = new Set(h.map((ee) => ee.uuid)),
      D = new Set(this.#e.transcript.getSnapshot().map((ee) => ee.uuid)),
      filtered = [...this.#i].filter((ee) => x.has(ee) || !D.has(ee));
    for (let ee of filtered) this.#i.delete(ee);
    if (filtered.length > 0) this.#c.setState((ee) => ee.filter((ke) => !filtered.includes(ke.uuid)));
  };
  #d(h) {
    let filtered = this.#c.getState().filter((D) => h(D) && !this.#i.has(D.uuid));
    if (filtered.length === 0) return 0;
    for (let D of filtered) this.#i.add(D.uuid);
    return (
      this.#e.transcript.replace((D) => [
        ...D,
        ...filtered.filter((L) => !D.some((ee) => ee.uuid === L.uuid)),
      ]),
      filtered.length
    );
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
      return D === x.transcripts ? x : { ...x, transcripts: D };
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
    let { workerCommands: workerCommands, setAppState: setAppState } = this.#e;
    if (h.slash_commands !== void 0) {
      let ee = new Set(h.slash_commands);
      workerCommands.setState(() => ee);
    }
    setAppState((ee) => {
      let ke = ee.workerInventory ?? void 0,
        Re = mergeSessionCapabilities(ke, { ...h, slashCommands: h.slash_commands });
      if (Re === void 0 || Re === ke) return ee;
      return ke !== void 0 &&
        tz(ke.skills, Re.skills) &&
        tz(ke.plugins, Re.plugins) &&
        tz(ke.tools ?? [], Re.tools ?? []) &&
        tz(ke.commands ?? [], Re.commands ?? [])
        ? ee
        : { ...ee, workerInventory: Re };
    });
    let model = h.model;
    if (model !== void 0)
      setAppState((ee) => (ee.mainLoopModel === model ? ee : { ...ee, mainLoopModel: model }));
  };
  noteOwnPermissionModePush = (h) => {
    let x = this.#a(),
      D = recordOwnSend(this.modeWire, h, x ? "person" : "wire");
    return x
      ? () => {
          recordOwnAck(this.modeWire, { mode: h, origin: "person", sent: D });
        }
      : () => {};
  };
  noteOwnPermissionModeAnswer = (h) => {
    if (!this.#a()) return;
    SUe(this.modeWire, h);
    let activeRemote = this.#n.activeRemote;
    if (activeRemote.isRemoteMode && activeRemote.sessionId !== void 0) {
      let { setAppState: setAppState } = this.#e;
      landOutstandingMode(setAppState, activeRemote.sessionId, h);
    }
  };
  noteOwnUnrecordedModeAnswer = () => {
    if (this.#a()) {
      wUe(this.modeWire);
      let activeRemote = this.#n.activeRemote;
      if (activeRemote.isRemoteMode && activeRemote.sessionId !== void 0) {
        let { store: store, setAppState: setAppState } = this.#e;
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
    let D = x === "worker" && consumeOwnAnswer(this.modeWire, h),
      { store: store, setAppState: setAppState } = this.#e;
    if (store.getState().toolPermissionContext.mode === h) return;
    let ke = setPermissionModeWithGuards(h, store.getState().toolPermissionContext, (Re) => {
      yUe(this.modeWire, h, D);
      let activeRemote = this.#n.activeRemote;
      if (this.#a() && activeRemote.isRemoteMode && activeRemote.sessionId !== void 0)
        applyRemoteMode(setAppState, activeRemote.sessionId, h, D ? "person" : "wire");
      setAppState((He) => ({ ...He, toolPermissionContext: Re(He.toolPermissionContext) }));
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
    if (!activeRemote.isRemoteMode) return !1;
    if (!h.trim()) return !0;
    if (x === "bash")
      return this.#m(activeRemote, h, D?.sentByPerson ?? !1, D?.pastedContents ?? {}) === void 0;
    return !1;
  }
  #m(h, x, D, L) {
    this.#o = void 0;
    let ee,
      { addNotification: addNotification } = this.#l();
    if (
      (addNotification({
        key: "remote-bash-mode-unavailable",
        kind: "feedback",
        text:
          ee ??
          (h.caps.bashExec
            ? "'!' commands aren't available in cloud sessions yet"
            : "'!' commands aren't available in a session on another machine"),
        ...(ee === void 0 && h.caps.bashExec && { row1Hint: NOT_IN_CLOUD_SESSIONS }),
        priority: ee === void 0 ? "medium" : "immediate",
      }),
      ee !== void 0)
    )
      this.#e.transcript.replace((Re) => [...Re, createSystemMessage(ee, "warning")]);
    return;
  }
  submit(h, { inputMode: x, pastedContents: D, fromKeybinding: L, sentByPerson: ee, recordHistory: ke }) {
    if (htt() && !prependModeCharacterToInput_2_2(h, x, this.#e.scope.commands))
      return (
        this.#e.transcript.replace((Et) => [...Et, createSystemMessage(NO_CLOUD_SESSION_MESSAGE, "notice")]),
        ke({ startsTurn: !1 }),
        Promise.resolve(void 0)
      );
    let activeRemote = this.activeRemote;
    if (!activeRemote.isRemoteMode) return null;
    let { addNotification: addNotification } = this.#l();
    if (x === "bash") {
      let Et = this.#o;
      this.#o = void 0;
      let Dt =
        Et !== void 0 && Et.input === h && Et.sessionId === activeRemote.sessionId && ee === !0
          ? Et
          : this.#m(activeRemote, h, ee ?? !1, D);
      return Promise.resolve(void 0);
    }
    let { commands: commands } = this.#e.scope,
      ze = h.trim().startsWith("/") ? h.trim().slice(1).split(/\s/)[0] : void 0,
      Xe = ze
        ? commands.find(
            (Et) =>
              isCommandEnabled(Et) &&
              (Et.name === ze || Et.aliases?.includes(ze) || getCommandName(Et) === ze),
          )
        : void 0,
      rt = Xe ? getThinClientDispatchMode(Xe, ml()) : "post-text",
      kt = Xe?.name === "login" ? getLoginAvailability(activeRemote) : void 0,
      At = kt?.kind === "refused" ? kt : void 0,
      It =
        (rt === "unavailable" || At !== void 0) && Xe
          ? Xe.name
          : ze && !Xe && shippedCommandNames().has(ze)
            ? ze
            : void 0;
    if (It) {
      logFeatureBad(
        cmdFeature(shippedCommandNames().has(It) ? It : "custom"),
        At?.cause ?? "remote_unavailable",
      );
      let Et =
          (It === "teleport" || It === "tp") &&
          activeRemote.sessionId !== void 0 &&
          isSelfAddressableSessionId(activeRemote.sessionId)
            ? `/${It} isn't available in cloud sessions. To continue this session locally, run this in a shell on your machine:
claude --teleport ${toCompatSessionId(activeRemote.sessionId)}`
            : void 0,
        Dt =
          At?.notice ??
          (activeRemote.sessionId !== void 0 && !activeRemote.viewerOnly ? (I0t(It) ?? Et) : Et);
      if (Dt !== void 0) this.#e.transcript.replace((Lt) => [...Lt, createSystemMessage(Dt, "notice")]);
      else {
        let Lt = activeRemote.sessionId === void 0 ? void 0 : M0t.get(It);
        addNotification({
          key: `remote-slash-command-unavailable-${It}`,
          kind: "feedback",
          text:
            Lt !== void 0
              ? `/${It} isn't available in cloud sessions \u2014 ${Lt}`
              : activeRemote.viewerOnly
                ? `/${It} isn't available while viewing read-only`
                : `/${It} isn't available in cloud sessions yet`,
          ...(Lt === void 0 && !activeRemote.viewerOnly && { row1Hint: NOT_IN_CLOUD_SESSIONS }),
          priority: "medium",
        });
      }
      return (ke({ startsTurn: !1 }), Promise.resolve(void 0));
    }
    if (rt !== "post-text") return null;
    let Ot = resolvePastedTextReference(h, L ? {} : D);
    return this.#p(activeRemote, Ot, { clearsConversation: Xe?.name === "clear", recordHistory: ke });
  }
  async #p(h, x, { clearsConversation: D, recordHistory: L }) {
    if (x.kind === "cancel") {
      logFeatureBad("remote_paste_splice", x.reason);
      let ze =
        x.reason === "paste_gone"
          ? buildUnavailablePasteError(x.removed)
          : "Not sent: the pasted text is blank.";
      return (
        this.#e.transcript.replace((Xe) => [...Xe, createSystemMessage(ze, "notice")]),
        { handBack: !0 }
      );
    }
    if (x.removed.length === 0 && x.inlinePastes.length > 0) logFeatureOk("remote_paste_splice");
    if (x.removed.length > 0)
      (logFeatureSad("remote_paste_splice", "paste_gone"),
        this.#l().addNotification({
          key: "pasted-text-unavailable",
          kind: "feedback",
          text: describeRemovedPastes(x.removed),
          priority: "immediate",
        }));
    let images = x.images,
      ke = images.length > 0 ? images.map((ze) => ze.id) : void 0,
      { text: text, postedText: postedText } = x;
    if (images.length > 0) {
      let ze = [],
        Xe = [];
      if (x.text) (ze.push({ type: "text", text: x.text }), Xe.push({ type: "text", text: x.postedText }));
      for (let rt of images) {
        let kt = { type: "base64", media_type: rt.mediaType ?? "image/png", data: rt.content };
        (ze.push({ type: "image", source: kt }), Xe.push({ type: "image", source: kt }));
      }
      ((text = ze), (postedText = Xe));
    }
    let He = createUserMessage({ content: text, imagePasteIds: ke, origin: { kind: "human" } });
    if (h.caps.deliveryReports && this.#e.turn.isExternalLoading && !D && !h.holdsSends()) this.holdLine(He);
    else (this.landWaitingLines(), this.#e.transcript.replace((ze) => [...ze, He]));
    (this.#e.turn.stream.clearApiMetrics(), L({ startsTurn: !0 }));
    let sendMessage = await h.sendMessage(postedText, {
      uuid: He.uuid,
      ...(x.inlinePastes.length > 0 && { inlinePastes: x.inlinePastes }),
      ...(D && { clearsConversation: !0 }),
    });
    if (!sendMessage) this.landWaitingLines();
    if (sendMessage && D)
      (this.landWaitingLines(),
        this.#e.transcript.replace(() => []),
        this.#e.applyLocalConversationReset(randomUUID_7()));
    return sendMessage && !h.holdsSends() ? { sent: !0, uuid: He.uuid } : void 0;
  }
  runBridgeImmediateCommand = (h, x, D, L) => {
    if (h.type !== "local") return;
    let { turn: turn, transcript: transcript } = this.#e;
    (async () => {
      let Re;
      try {
        let { mainLoopModel: mainLoopModel } = this.#l();
        Re = getActiveNotices(
          turn.buildToolUseContext(transcript.getSnapshot(), [], createAbortController(), mainLoopModel),
          turn.guard,
        );
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "bridge immediate command context failed"));
        let He = `${bP(sanitizeTelemetryString(h.name))} failed (detail withheld on this connection)`;
        turn.appendAfterTurn([
          createCommandInputMessage(
            formatCommandInputTags(D, isPromptHookObserved() || shouldEscapeNdjsonForBridge() ? "" : x),
          ),
          createCommandInputMessage(`<${LOCAL_COMMAND_STDERR}>${escapeXml(He)}</${LOCAL_COMMAND_STDERR}>`, {
            commandOutcome: { kind: "failed" },
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
            submissionOrigin: L,
            dispatchedOverBridge: !0,
            promptSource: void 0,
          }),
          presentation: viewportInfo(Re.presentation),
        },
        displayName: D,
        invokedAs: void 0,
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
  remoteSessionConfig: remoteSessionConfig,
  directConnectConfig: directConnectConfig,
  sshSession: sshSession,
  adoptRateLimits: adoptRateLimits,
  transcript: transcript,
  turn: turn,
  idleNudge: idleNudge,
  scope: scope,
  spinner: spinner,
  applyConversationReset: applyConversationReset,
  applyLocalConversationReset: applyLocalConversationReset,
}) {
  let Xe = Cr(),
    rt = useSetAppState(),
    [kt] = y(
      () =>
        new RemoteTransport({
          store: Xe,
          setAppState: rt,
          transcript: transcript,
          turn: turn,
          idleNudge: idleNudge,
          scope: scope,
          spinner: spinner,
          applyConversationReset: applyConversationReset,
          applyLocalConversationReset: applyLocalConversationReset,
          workerCommands: scope.workerCommands,
        }),
    ),
    At = useAppState((Xt) => Xt.toolPermissionContext),
    It = useStoreSelector(scope, selectCombinedInitialTools),
    Ot = useStoreSelector(turn, selectIsExternalLoading_2),
    Et = useRemoteSession({
      config: remoteSessionConfig,
      adoptRateLimits: adoptRateLimits,
      sink: kt,
      requestDialog: scope.requestDialog,
      toolPermissionContext: At,
      tools: It,
    }),
    Dt = useDirectConnect({
      config: directConnectConfig,
      sink: kt,
      requestDialog: scope.requestDialog,
      toolPermissionContext: At,
      tools: It,
    }),
    Lt = useSSHSession({
      session: sshSession,
      sink: kt,
      requestDialog: scope.requestDialog,
      toolPermissionContext: At,
      tools: It,
    }),
    oo = Q(
      () =>
        remoteTransportKind({
          ssh: Lt,
          direct: Dt,
          ccr: Et,
          ccrViewerOnly: remoteSessionConfig?.viewerOnly ?? !1,
          ccrSessionId: remoteSessionConfig?.sessionId,
          ccrConsoleProfileBearer: remoteSessionConfig?.consoleProfileBearer === !0,
        }),
      [
        Lt,
        Dt,
        Et,
        remoteSessionConfig?.viewerOnly,
        remoteSessionConfig?.sessionId,
        remoteSessionConfig?.consoleProfileBearer,
      ],
    );
  return (
    zt(() => {
      kt.setActiveRemote(oo);
    }, [kt, oo]),
    useRemotePermissionModeSync(kt),
    { transport: kt, activeRemote: oo, cancellableExternalLoading: xdo(oo, Ot) }
  );
}

export { useRemoteTransport };
