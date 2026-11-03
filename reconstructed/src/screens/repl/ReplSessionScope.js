/**
 * screens/repl/ReplSessionScope.ts
 *
 * 2.1.316 新增。REPL 会话作用域（控制器生命周期）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (11)
 * attribution: placement 11
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
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
} from "path";
import {
  REMOTE_SAFE_COMMANDS,
  filterCommandsForRemoteMode,
  withWorkerOnlyCommands,
  clearCommandsCache,
  getCommands,
  clearCommandMemoizationCaches,
  toSlashCommands,
} from "../../commands.js";
import { InstanceRegistry } from "../../utils/instanceRegistry.js";
import { efe } from "../../memdir/findRelevantMemories.js";
import { requestLocalJsxDialog, LocalJsxHost, clearMcpAuthCaches } from "./LocalJsxHost.js";
import { fAi } from "../../components/dialogs/dialogRequests.js";
import { ApiKeyVerification } from "../../hooks/useApiKeyVerification.js";
import { createStore } from "../../state/store.js";
import { createSignal } from "../../utils/signal.js";
import { InboxVerdictCache } from "../../utils/inboxClassification.js";
import { commandNamesForBridge } from "../../cli/print/lowLatencySubmit.js";
import { withExtraExportTools } from "../../utils/exportRenderer.js";
import { getTools, assembleToolPool } from "../../tools.js";
import { nv, ZC } from "../../utils/remoteFileState.js";
import { _tt } from "../../services/tools/webToolIsolation.js";
import { saveIsolationLatch } from "../../utils/sessionStorage.js";
import {
  provisionContentReplacementState,
  reconstructContentReplacementState,
} from "../../utils/toolResultStorage.js";
import { Mwt, extractReadFilesFromMessages } from "../../utils/queryHelpers.js";
import { waitForAgentTranscriptFlush, B0n } from "../../tasks/LocalAgentTask/transcriptFlush.js";
import { stackToast } from "../../components/pluginUi/toastStack.js";
import { Vtt, qtt } from "../../utils/messages/nonUserMessages.js";
import {
  gfn,
  toastQueueState,
  NNi,
  logToastGaveWay,
  wasToastShown,
  readBarToasts,
  IMMEDIATE,
  enqueueBarToast,
} from "../../plugins/functionHooks/uiToast.js";
import { Kj } from "../../context/notifications.js";
import { logForDebugging } from "../../utils/debug.js";
import { sendNotification } from "../../services/notifier.js";
import { kA } from "../../services/policyLimits/coldStartWaiter.js";
import { explainPluginServer } from "../../services/mcp/mcpConnectionRefusals.js";
import {
  awaitMcpServerConnected,
  _fe,
  connectMcpServerForPlugin,
} from "../../plugins/functionHooks/mcpApi.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Jn, _C } from "../../remote/remoteMode.js";
import { requestContextUsage } from "../../entrypoints/sdk/controlSchemas.js";
import { collectContextData } from "../../commands/context/context-noninteractive.js";
import { tHi, subscribeToSelectionEvents } from "../../components/VirtualMessageList.js";
import { showAgentTaskView } from "../../components/CoordinatorAgentStatus.js";
import { di } from "../../ink/terminal.js";
import { K$o, release as release_2 } from "../../plugins/functionHooks/surfaceBinding.js";
import { Yue } from "../../plugins/functionHooks/pluginLifecycle.js";
import { installDevModsPlaceholderExpander } from "../../services/plugins/devMods/devModsWatcher.js";
import { kWo } from "../../plugins/functionHooks/modelApi.js";
import { xBn } from "../../utils/hooks/postSamplingHooks.js";
import { uqr, U7s } from "../../services/memorySync/memorySkills.js";
import { onPolicyVerdictChanged, policyVerdictRebuildKey } from "../../services/policyLimits/policyState.js";
import { I6s, ftt } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { fue } from "../../utils/skills/skillChangeDetector.js";
import { onGrowthBookRefresh } from "../../services/analytics/growthbook.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { isCommandSetHooked } from "../../plugins/functionHooks/commandHooks.js";
import { IGt } from "../../utils/forkedAgent.js";
import { todoToolsEnabled } from "../../utils/sessionKind.js";
import { arraysEqual } from "../../utils/collections.js";
import { logError } from "../../utils/log.js";
import { getUserMsgOptIn, isWorkspaceRestricted, setReplBridgeActive } from "../../bootstrap/state.js";
import { k1 } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { getManagedFilePath } from "../../utils/settings/managedPath.js";
import { W1 } from "../../plugins/functionHooks/sites/promptContextSites.js";
import { managedSettingsAskState } from "../../cli/headlessCloud/attachServe.js";
import {
  rebuildAgentDefinitions,
  getAgentDefinitionsWithOverrides,
  withLiveRegisteredAgents,
  toAgentInfos,
} from "../../tools/AgentTool/loadAgentsDir.js";
import { logPluginDirReload, addPluginDirAndRebuildSandbox } from "../../cli/print/pluginDirReload.js";
import { PluginsStateStore } from "../../utils/plugins/pluginLoadStatus.js";
import { isCachedGitHubRepo } from "../../utils/detectRepository.js";
import { isCommsRoledServer } from "../../coordinator/coordinatorMcpServers.js";
import { mergeAndFilterTools, stripSoleNonDeniableTool } from "../../utils/toolPool.js";
import { createAccountMemoryToolGate } from "../../services/accountMemory/accountMemoryServer.js";
import {
  resolveAgentTools,
  withWebFetchToolForAgent,
  resolveAgentToolNames,
} from "../../tools/AgentTool/agentToolUtils.js";
import { mergeClients } from "../../hooks/useMergedClients.js";
import { mergeFileStateCaches } from "../../utils/fileStateCache.js";
import { createQueryEngine } from "../../engine/queryEngine.js";
import { query } from "../../query.js";
import { toSdkModelInfos } from "../../entrypoints/sdk/coreSchemas.js";
import { getEnabledModelOptions, getUnavailableModelOptions } from "../../utils/model/modelOptions.js";
import { toAccountInfo } from "../../utils/auth.js";
import { hasCustomOutputStyle } from "../../constants/outputStyles.js";
import { mcpServerStatusSnapshots } from "../../services/mcp/config.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:186519-186606 placement
function activeToolNames(h, x) {
  if (x === null) return h;
  return h.filter((D) => x.has(D.name) || REMOTE_SAFE_COMMANDS.has(D));
}
//@ chunk-18hwfzwa.js:186606-186742 placement
var SESSION_SCOPE_DEFAULTS = [
  "commands",
  "dynamicMcpConfig",
  "tools",
  "renderingTools",
  "allowedAgentTypes",
  "mainThreadAgentDefinition",
  "combinedInitialTools",
];
//@ chunk-18hwfzwa.js:186742-186808 placement = useMainLoopModel (1)
function selectMainLoopModels(h) {
  return [h.mainLoopModel, h.mainLoopModelForSession];
}
/**
 * REPL 会话作用域：持有 readFileState、会话环境变量、工具状态、MCP 初始客户端、对话框传输、API key 校验、插件状态 toast 等会话级单例。
 */
//@ chunk-18hwfzwa.js:186808-201323 placement
class ReplSessionScope {
  readFileState;
  sessionEnvVars = new Map();
  toolState = new InstanceRegistry();
  memorySelector = efe();
  isolationLatch;
  contentReplacementState;
  dialogTransport = requestLocalJsxDialog();
  requestDialog = fAi(this.dialogTransport);
  apiKeyVerification = new ApiKeyVerification();
  initialMcpClients;
  localJsx = new LocalJsxHost(this.requestDialog);
  workerCommands = createStore(null);
  sessionBinding;
  store;
  storageV5;
  credentials;
  session;
  initialTools;
  disableSlashCommands;
  filterCommands;
  isThinClient;
  onCommandsChange;
  localCommands;
  noCommands = [];
  dynamicMcp;
  pendingMcpServerAdds = new Map();
  mainThreadAgent;
  snapshot;
  host = null;
  changed = createSignal();
  toolPoolCache = null;
  commsRoledServerSeen;
  verdicts = new InboxVerdictCache();
  verdictsPermissionContext;
  stops = [];
  connected = !1;
  disposed = !1;
  seatedHold;
  shedSeat;
  narrowToWorker = memoizeLast(activeToolNames);
  mergePluginCommands = memoizeLast(commandNamesForBridge);
  mergeMcpCommands = memoizeLast(commandNamesForBridge);
  filterForThinClient = memoizeLast(filterCommandsForRemoteMode);
  addWorkerOnly = memoizeLast(withWorkerOnlyCommands);
  namesOf = memoizeLast((h) => new Set(h));
  applyCommandFilter = memoizeLast((h, x) => h.filter(x));
  addDisplayOnlyTools = memoizeLast(withExtraExportTools);
  buildCombinedInitialTools = memoizeLast((h, x, D, L, ee, ke, Re, Be, He, We) => [
    ...getTools(h, { activeAgents: x.activeAgents }),
    ...this.initialTools,
  ]);
  constructor(h) {
    ((this.store = h.store),
      (this.storageV5 = h.storageV5),
      (this.credentials = h.credentials),
      (this.session = h.session),
      (this.initialMcpClients = h.initialMcpClients),
      (this.initialTools = h.initialTools),
      (this.disableSlashCommands = h.disableSlashCommands),
      (this.filterCommands = h.filterCommands),
      (this.isThinClient = h.isThinClient),
      (this.onCommandsChange = h.onCommandsChange),
      (this.localCommands = h.initialCommands),
      (this.lastModelInputs = selectMainLoopModels(h.store.getState())),
      (this.dynamicMcp = h.initialDynamicMcpConfig),
      (this.mainThreadAgent = h.mainThreadAgentDefinition),
      (this.readFileState = nv(ZC)),
      (this.isolationLatch = _tt(null, (x) => saveIsolationLatch(x, this.storageV5))),
      (this.contentReplacementState = provisionContentReplacementState(
        h.initialMessages,
        h.initialContentReplacements,
      )),
      (this.sessionBinding = {
        surface: "terminal",
        model: () => this.requireHost().mainLoopModel,
        messages: () => this.requireHost().getMessages(),
        conversation: (x) => (x === void 0 ? this.requireHost().conversation : Mwt.of(x)),
        tools: () => this.computeTools(),
        commands: () => this.snapshot.commands,
        mcpServers: () => this.computeMcpClients().map((x) => x.name),
        toolContext: (x) => {
          let requireHost = this.requireHost();
          return requireHost.buildToolUseContext(requireHost.getMessages(), [], x, requireHost.mainLoopModel);
        },
        savedAgentMessages: (x) => waitForAgentTranscriptFlush(x, this.storageV5),
        requestMessages: (x) => B0n(x, this.computeTools()),
        canUseTool: (...x) => this.requireHost().canUseTool(...x),
        toast: (x, D, L) => {
          if (this.requireHost().stacksToasts) {
            stackToast({ plugin: x, text: Vtt(D), timeoutMs: L ?? gfn });
            return;
          }
          let state = this.store.getState(),
            ke = toastQueueState({ ...state.notifications, isHeld: Kj(state) }, x),
            Re = NNi(x, randomUUID_4());
          (logToastGaveWay({
            key: ke.givesWay,
            plugin: x,
            isCutShort: wasToastShown(readBarToasts(), ke.givesWay, ke.isCutShort),
          }),
            this.requireHost().addNotification({
              key: Re,
              kind: "event",
              text: qtt(x, D),
              priority: IMMEDIATE,
              waitsItsTurn: ke.isWaiting,
              invalidates: ke.givesWay === void 0 ? [] : [ke.givesWay],
              timeoutMs: L ?? gfn,
            }),
            enqueueBarToast({ key: Re, plugin: x, text: qtt(x, D), ms: L ?? gfn }));
          let { current: Be, queue: queue } = this.store.getState().notifications;
          logForDebugging(`$.ui.toast: shown as ${Be?.key ?? "nothing"} (${queue.length} queued)`);
        },
        notify: (x, D) =>
          sendNotification(x, this.requireHost().terminal, {
            storageV5: this.storageV5,
            credentials: this.credentials,
            hookOrigin: D,
          }),
        status: (x, D) => {
          let requireHost = this.requireHost(),
            ee = `plugin-status-${x}`;
          if ((requireHost.removeNotification(ee), D !== void 0))
            requireHost.addNotification({
              key: ee,
              kind: "event",
              text: qtt(x, D),
              priority: "low",
              pinned: !0,
            });
        },
        addMcpServer: async (x, D) => {
          let L = Symbol(x);
          if ((this.pendingMcpServerAdds.set(x, L), await kA(), this.pendingMcpServerAdds.get(x) !== L))
            return;
          (this.pendingMcpServerAdds.delete(x),
            this.updateDynamicMcpConfig((ee) => ({ ...(ee ?? {}), [x]: D })));
        },
        resolveMcpServer: (x) =>
          explainPluginServer({
            ...x,
            storageV5: this.storageV5,
            credentials: this.credentials,
            dynamicServers: this.dynamicMcp ?? {},
          }),
        settledMcpServer: (x) =>
          awaitMcpServerConnected(
            { rows: () => this.store.getState().mcp.clients, subscribe: (D) => this.store.subscribe(D) },
            x,
          ),
        connectMcpServer: async (x, D) => {
          let L = Symbol(x);
          if ((this.pendingMcpServerAdds.set(x, L), await kA(), this.pendingMcpServerAdds.get(x) !== L))
            return _fe("failed", `The MCP server "${x}" left the session before it connected.`);
          return (
            this.pendingMcpServerAdds.delete(x),
            connectMcpServerForPlugin(
              {
                rows: () => this.store.getState().mcp.clients,
                subscribe: (ee) => this.store.subscribe(ee),
                add: (ee, ke) => this.updateDynamicMcpConfig((Re) => ({ ...(Re ?? {}), [ee]: ke })),
                drop: (ee) => this.updateDynamicMcpConfig((ke) => wi(ke ?? {}, (Re, Be) => Be === ee)),
                holds: (ee) => Object.hasOwn(this.dynamicMcp ?? {}, ee),
                forget: (ee, ke) => clearMcpAuthCaches(ee, ke, this.storageV5),
              },
              x,
              D,
            )
          );
        },
        removeMcpServer: async (x) => {
          (this.pendingMcpServerAdds.delete(x),
            this.updateDynamicMcpConfig((D) => wi(D ?? {}, (L, ee) => ee === x)));
        },
        refreshCommands: () => void this.rereadCommands(),
        refreshAgents: () => this.rereadAgents(),
        refreshContext: h.refreshContext,
        compact: (x) => this.requireHost().compact(x),
        contextData: async (x) => {
          let D = Jn();
          if (D) {
            if (!_C("controlChannel"))
              throw Error("the context breakdown isn't available over this remote connection");
            let ke = await requestContextUsage(D, { detail: x.detail });
            if (!ke) throw Error("the remote sent a context breakdown this version can't read");
            return ke;
          }
          let requireHost = this.requireHost(),
            toolUseContext = requireHost.buildToolUseContext(
              requireHost.getMessages(),
              [],
              new AbortController(),
              requireHost.mainLoopModel,
            );
          return collectContextData({
            session: toolUseContext.session,
            messages: toolUseContext.messages,
            getAppState: () => this.store.getState(),
            getMcp: toolUseContext.getMcp,
            storageV5: this.storageV5,
            credentials: this.credentials,
            options: toolUseContext.options,
            detail: x.detail,
            terminalWidth: x.terminalWidth,
          });
        },
        composer: {
          read: () => this.requireHost().readDraft(),
          write: (x, D, L) => this.requireHost().fillDraft(x, D, L),
          paint: (x, D, L) => this.requireHost().paintDraft(x, D, L),
          forget: (x) => this.host?.forgetPaint(x),
          attribute: (x, D) => this.requireHost().attributeDraft(x, D),
          propose: (x, D) => this.requireHost().suggestDraft(x, D),
        },
        transcript: { reveal: (x, D) => this.requireHost().revealInTranscript(x, D) },
        selection: { read: () => tHi(this.selectionWatch()) },
        view: { show: (x) => showAgentTaskView(this.store, x) },
      }),
      (this.snapshot = this.derive()),
      this.onCommandsChange?.(this.snapshot.commands));
  }
  bindHost(h) {
    this.host = h;
  }
  selectionWatch() {
    return { source: di().get(process.stdout), rowHolding: (h) => this.host?.rowHoldingSelection(h) };
  }
  requireHost() {
    if (this.host === null) throw Error("ReplSessionScope: used before its screen bound a host");
    return this.host;
  }
  connect() {
    if (this.connected || this.disposed) return;
    if (
      ((this.connected = !0),
      K$o(this.sessionBinding),
      Yue.set(this.sessionPlugins),
      installDevModsPlaceholderExpander(),
      kWo(xBn),
      this.stops.push(
        subscribeToSelectionEvents(this.selectionWatch()),
        this.store.subscribe(this.refreshOnStoreInputs),
        this.workerCommands.subscribe(this.refresh),
        uqr(this.refresh),
        onPolicyVerdictChanged(this.refreshOnNextMicrotask),
        I6s(this.refreshOnNextMicrotask),
      ),
      !this.isThinClient)
    ) {
      if (
        (this.stops.push(
          fue.subscribe(this.reloadCommandsAndAgents),
          onGrowthBookRefresh(this.refilterCommands),
          settingsChangeDetector.subscribe(this.refilterCommands),
          settingsChangeDetector.subscribe(() => {
            if (this.noteHoldMove()) this.rereadAgents();
          }),
          this.store.subscribe(() => this.shedHeldManagedAgents()),
          onPolicyVerdictChanged(this.refilterCommandsOnPolicyVerdict),
        ),
        this.noteHoldMove() && this.seatedHold === "asks:")
      )
        this.rereadAgents();
      if (isCommandSetHooked()) this.rereadCommands();
    }
    this.refresh();
  }
  dispose() {
    if (this.disposed) return;
    if (
      ((this.disposed = !0),
      (this.connected = !1),
      release_2(this.sessionBinding),
      Yue.get() === this.sessionPlugins)
    )
      Yue.set(void 0);
    IGt();
    for (let h of this.stops.splice(0)) h();
  }
  subscribe = (h) => this.changed.subscribe(h);
  getSnapshot = () => this.snapshot;
  get commands() {
    return this.snapshot.commands;
  }
  get mainThreadAgentDefinition() {
    return this.mainThreadAgent;
  }
  get combinedInitialTools() {
    let combinedInitialToolsFor = this.combinedInitialToolsFor(this.store.getState(), todoToolsEnabled());
    if (combinedInitialToolsFor !== this.snapshot.combinedInitialTools) this.refresh();
    return combinedInitialToolsFor;
  }
  setMainThreadAgentDefinition(h) {
    if (h === this.mainThreadAgent) return;
    ((this.mainThreadAgent = h), this.refresh());
  }
  lastStoreInputs = [];
  lastModelInputs;
  refreshOnStoreInputs = () => {
    let state = this.store.getState(),
      x = selectMainLoopModels(state);
    if (!arraysEqual(this.lastModelInputs, x)) {
      if (((this.lastModelInputs = x), !this.isThinClient)) this.rereadCommands();
    }
    let D = [
      state.plugins.commands,
      state.mcp,
      state.toolPermissionContext,
      state.agentDefinitions,
      state.isBriefOnly,
      state.slackTagConnected,
      state.mainLoopModel,
      state.replBridgeEnabled,
      state.replBridgeOutboundOnly,
      this.isThinClient && NHe(state),
      this.isThinClient && state.workerInventory,
      state.settings,
    ];
    if (arraysEqual(this.lastStoreInputs, D)) return;
    ((this.lastStoreInputs = D), this.refresh());
  };
  refresh = () => {
    if (this.disposed) return;
    let h;
    try {
      h = this.derive();
    } catch (error) {
      logError(error);
      return;
    }
    let snapshot = this.snapshot;
    if (SESSION_SCOPE_DEFAULTS.every((D) => snapshot[D] === h[D])) return;
    this.snapshot = h;
    try {
      if (h.commands !== snapshot.commands) this.onCommandsChange?.(h.commands);
      this.changed.emit();
    } catch (error) {
      logError(error);
    }
  };
  derive() {
    let state = this.store.getState(),
      x = todoToolsEnabled(),
      D = U7s(),
      narrowToWorker = this.narrowToWorker(this.localCommands, this.workerCommands.getState()),
      mergePluginCommands = this.mergePluginCommands(narrowToWorker, state.plugins.commands, D),
      mergeMcpCommands = this.mergeMcpCommands(mergePluginCommands, state.mcp.commands, D),
      Re = state.workerInventory?.commands,
      Be = this.isThinClient
        ? this.addWorkerOnly(
            this.filterForThinClient(mergeMcpCommands),
            Re === void 0 ? null : this.namesOf(Re),
          )
        : mergeMcpCommands,
      He = this.disableSlashCommands
        ? this.noCommands
        : this.filterCommands
          ? this.applyCommandFilter(Be, this.filterCommands)
          : Be,
      combinedInitialToolsFor = this.combinedInitialToolsFor(state, x),
      { tools: tools, allowedAgentTypes: allowedAgentTypes } = this.computeToolPool(
        state,
        combinedInitialToolsFor,
        x,
      );
    return {
      commands: He,
      dynamicMcpConfig: this.dynamicMcp,
      tools: tools,
      renderingTools: this.addDisplayOnlyTools(tools, this.isThinClient && NHe(state)),
      allowedAgentTypes: allowedAgentTypes,
      mainThreadAgentDefinition: this.mainThreadAgent,
      combinedInitialTools: combinedInitialToolsFor,
    };
  }
  combinedInitialToolsFor(h, x) {
    return this.buildCombinedInitialTools(
      h.toolPermissionContext,
      h.agentDefinitions,
      h.isBriefOnly,
      getUserMsgOptIn(),
      h.slackTagConnected,
      h.mainLoopModel,
      x,
      isWorkspaceRestricted(),
      policyVerdictRebuildKey(),
      k1(),
    );
  }
  refreshOnNextMicrotask = () => {
    queueMicrotask(() => {
      if (!this.disposed) this.refresh();
    });
  };
  refilterCommandsOnPolicyVerdict = () => {
    queueMicrotask(() => {
      if (!this.disposed) this.refilterCommands();
    });
  };
  reloadCommandsAndAgents = async () => {
    let projectRoot = xo(this.session).projectRoot;
    try {
      clearCommandsCache();
      let x = await getCommands(projectRoot, this.storageV5);
      (this.replaceLocalCommands(x), await this.rereadAgents());
    } catch (error) {
      if (error instanceof Error) logError(error);
    }
  };
  readHold() {
    let h = "";
    try {
      h = join_4(getManagedFilePath(), ".claude") + sep;
      let x = W1();
      return x === "held:" ? { hold: x, under: h } : { hold: x };
    } catch (error) {
      if (error instanceof Error) logError(error);
      return ((this.seatedHold = void 0), managedSettingsAskState.readAs === !1 ? {} : { under: h });
    }
  }
  shedHeldManagedAgents(h) {
    let agentDefinitions = this.store.getState().agentDefinitions;
    if (h === void 0 && agentDefinitions === this.shedSeat) return;
    this.shedSeat = agentDefinitions;
    let { under: under } = h ?? this.readHold(),
      filtered = agentDefinitions.allAgents.filter(
        (allAgent) =>
          under === void 0 || allAgent.source !== "policySettings" || !allAgent.baseDir?.startsWith(under),
      );
    if (filtered.length !== agentDefinitions.allAgents.length)
      this.store.setState((ee) => ({
        ...ee,
        agentDefinitions: rebuildAgentDefinitions(ee.agentDefinitions, filtered),
      }));
  }
  noteHoldMove() {
    let hold = this.readHold();
    if (hold.hold !== void 0 && hold.hold === this.seatedHold) return !1;
    return (
      (this.seatedHold = hold.hold),
      this.shedHeldManagedAgents(hold),
      this.replaceLocalCommands(this.localCommands, hold),
      !0
    );
  }
  rereadAgents = async () => {
    try {
      let h = await getAgentDefinitionsWithOverrides(xo(this.session).projectRoot, this.storageV5);
      if (this.disposed) return;
      this.store.setState((x) => {
        let filtered = x.agentDefinitions.allAgents.filter((allAgent) => allAgent.source === "flagSettings");
        return {
          ...x,
          agentDefinitions: rebuildAgentDefinitions(
            h,
            withLiveRegisteredAgents([...h.allAgents, ...filtered]),
          ),
        };
      });
    } catch (error) {
      if (error instanceof Error) logError(error);
      if (this.disposed) return;
      this.store.setState((x) => ({
        ...x,
        agentDefinitions: rebuildAgentDefinitions(
          x.agentDefinitions,
          withLiveRegisteredAgents(x.agentDefinitions.allAgents),
        ),
      }));
    }
  };
  refilterCommands = async () => {
    try {
      (clearCommandMemoizationCaches(),
        this.replaceLocalCommands(await getCommands(xo(this.session).projectRoot, this.storageV5)));
    } catch (error) {
      if (error instanceof Error) logError(error);
    }
  };
  rereadCommands = async () => {
    try {
      this.replaceLocalCommands(await getCommands(xo(this.session).projectRoot, this.storageV5));
    } catch (error) {
      if (error instanceof Error) logError(error);
    }
  };
  replaceLocalCommands(h, x = this.disposed ? {} : this.readHold()) {
    let { under: under } = x,
      filtered = h.filter(
        (ke) =>
          under === void 0 ||
          ke.type !== "prompt" ||
          ke.source !== "policySettings" ||
          !(ke.skillRoot ?? ke.skillFile?.path)?.startsWith(under),
      ),
      ee = filtered.length === h.length ? h : filtered;
    if (this.disposed || ee === this.localCommands) return;
    ((this.localCommands = ee), this.refresh());
  }
  sessionPlugins = {
    reload: () =>
      logPluginDirReload(PluginsStateStore.over(this.store), {
        model: this.requireHost().mainLoopModel,
        mcpClients: this.store.getState().mcp.clients,
        dynamicMcpConfig: this.dynamicMcp,
        storageV5: this.storageV5,
        credentials: this.credentials,
      }),
    joinPluginDir: addPluginDirAndRebuildSandbox,
    retarget: (h) => PluginsStateStore.over(this.store).retarget(h),
  };
  get dynamicMcpConfig() {
    return this.snapshot.dynamicMcpConfig;
  }
  updateDynamicMcpConfig = (h) => {
    let dynamicMcp = this.dynamicMcp,
      D = typeof h === "function" ? h(dynamicMcp) : h;
    if (D === dynamicMcp) return;
    ((this.dynamicMcp = D), (this.snapshot = { ...this.snapshot, dynamicMcpConfig: D }), this.changed.emit());
  };
  addAutoConnectedIde = (h) => {
    this.updateDynamicMcpConfig((x) => (x?.ide ? x : { ...x, ide: h }));
  };
  computeTools = () => this.computeToolPoolFresh().tools;
  computeToolPoolFresh = () => {
    let state = this.store.getState(),
      x = todoToolsEnabled(),
      toolPool = this.computeToolPool(state, this.combinedInitialToolsFor(state, x), x);
    if (toolPool.tools !== this.snapshot.tools) this.refresh();
    return toolPool;
  };
  computeToolPool(h, x, D) {
    let L = {
        toolPermissionContext: h.toolPermissionContext,
        mcpTools: h.mcp.tools,
        mcpClients: h.mcp.clients,
        combinedInitialTools: x,
        mainThreadAgentDefinition: this.mainThreadAgent,
        replBridgeEnabled: h.replBridgeEnabled,
        replBridgeOutboundOnly: h.replBridgeOutboundOnly,
        agentDefinitions: h.agentDefinitions,
        todoTools: D,
        slackTagConnected: h.slackTagConnected,
        githubRepo: isCachedGitHubRepo(),
        workspaceRestricted: isWorkspaceRestricted(),
        waitForMcpServersDeclared: ftt(),
      },
      toolPoolCache = this.toolPoolCache;
    if (toolPoolCache !== null && assembleSessionTools(toolPoolCache.key, L)) return toolPoolCache.result;
    setReplBridgeActive(h.replBridgeEnabled && !h.replBridgeOutboundOnly);
    let found = h.mcp.clients.find(isCommsRoledServer);
    if (found) this.commsRoledServerSeen = { name: found.name, type: "disabled", config: found.config };
    let Re = assembleToolPool(h.toolPermissionContext, h.mcp.tools, {
        activeAgents: h.agentDefinitions.activeAgents,
      }),
      Be = mergeAndFilterTools(
        x,
        Re,
        h.toolPermissionContext.mode,
        [...x, ...h.mcp.tools],
        createAccountMemoryToolGate(() =>
          this.commsRoledServerSeen ? [...h.mcp.clients, this.commsRoledServerSeen] : h.mcp.clients,
        ),
      ),
      mainThreadAgent = this.mainThreadAgent,
      We = mainThreadAgent
        ? resolveAgentTools(
            mainThreadAgent,
            withWebFetchToolForAgent(mainThreadAgent, Be, h.toolPermissionContext, {
              activeAgents: h.agentDefinitions.activeAgents,
            }),
            !1,
            !0,
          )
        : void 0,
      ze = stripSoleNonDeniableTool(We ? We.resolvedTools : Be, h.toolPermissionContext),
      Xe = We?.allowedAgentTypes,
      rt = mainThreadAgent ? resolveAgentToolNames(mainThreadAgent) : void 0,
      kt = toolPoolCache !== null && arraysEqual(toolPoolCache.result.tools, ze),
      At = toolPoolCache !== null && arraysEqual(toolPoolCache.result.allowedAgentTypes, Xe),
      It = toolPoolCache !== null && hasAnyOf(toolPoolCache.result.primitiveToolGrant, rt),
      Ot =
        kt && At && It
          ? toolPoolCache.result
          : {
              tools: kt ? toolPoolCache.result.tools : ze,
              allowedAgentTypes: At ? toolPoolCache.result.allowedAgentTypes : Xe,
              primitiveToolGrant: It ? toolPoolCache.result.primitiveToolGrant : rt,
            };
    return ((this.toolPoolCache = { key: L, result: Ot }), Ot);
  }
  computeMcpClients = () => mergeClients(this.initialMcpClients, this.store.getState().mcp.clients);
  sandboxClassifierVerdicts() {
    let toolPermissionContext = this.store.getState().toolPermissionContext;
    if (toolPermissionContext !== this.verdictsPermissionContext)
      ((this.verdictsPermissionContext = toolPermissionContext), this.verdicts.clear());
    return this.verdicts;
  }
  mergeReadFileStateFrom(h, x) {
    this.readFileState = mergeFileStateCaches(this.readFileState, extractReadFilesFromMessages(h, x, ZC));
  }
  reseatIsolationLatch(h) {
    ((this.isolationLatch.onLatch = void 0),
      (this.isolationLatch = _tt(h, (x) => saveIsolationLatch(x, this.storageV5))));
  }
  reconstructContentReplacementState(h, x) {
    if (!this.contentReplacementState) return;
    this.contentReplacementState = reconstructContentReplacementState(h, x);
  }
  evictRewoundFileTracking(h) {
    for (let readFilePath of h.readFilePaths) this.readFileState.delete(readFilePath);
    for (let nestedMemoryPath of h.nestedMemoryPaths) this.readFileState.delete(nestedMemoryPath);
  }
  seedMemoryFile(h, x) {
    this.readFileState.set(h, { ...x, startupMemorySeed: !0 });
  }
}
//@ chunk-18hwfzwa.js:201323-201457 placement
function hasAnyOf(h, x) {
  if (h === x) return !0;
  if (h === void 0 || x === void 0 || h.size !== x.size) return !1;
  for (let D of h) if (!x.has(D)) return !1;
  return !0;
}
//@ chunk-18hwfzwa.js:201457-202036 placement
function assembleSessionTools(h, x) {
  return (
    h.toolPermissionContext === x.toolPermissionContext &&
    h.mcpTools === x.mcpTools &&
    h.mcpClients === x.mcpClients &&
    h.combinedInitialTools === x.combinedInitialTools &&
    h.mainThreadAgentDefinition === x.mainThreadAgentDefinition &&
    h.replBridgeEnabled === x.replBridgeEnabled &&
    h.replBridgeOutboundOnly === x.replBridgeOutboundOnly &&
    h.agentDefinitions === x.agentDefinitions &&
    h.todoTools === x.todoTools &&
    h.slackTagConnected === x.slackTagConnected &&
    h.githubRepo === x.githubRepo &&
    h.workspaceRestricted === x.workspaceRestricted &&
    h.waitForMcpServersDeclared === x.waitForMcpServersDeclared
  );
}
//@ chunk-18hwfzwa.js:202036-202061 placement
function NHe(h) {
  return !1;
}
/**
 * 记住上一次参数与结果，参数逐个相同时直接返回缓存结果。
 */
//@ chunk-18hwfzwa.js:202061-202241 placement
function memoizeLast(h) {
  let x = null;
  return (...D) => {
    if (x !== null && x.inputs.length === D.length && x.inputs.every((input, ke) => input === D[ke]))
      return x.result;
    let L = h(...D);
    return ((x = { inputs: D, result: L }), L);
  };
}
//@ chunk-18hwfzwa.js:202241-202607 placement
function runWithQueryParams({ store: store, scope: scope, readPendingQueryParams: readPendingQueryParams }) {
  return createQueryEngine({
    run: query,
    queryParams: async (L) => readPendingQueryParams(),
    commands: () => toSlashCommands(scope.commands),
    models: () => toSdkModelInfos(getEnabledModelOptions()),
    unavailableModels: () => toSdkModelInfos(getUnavailableModelOptions()),
    agents: () => toAgentInfos(store.getState().agentDefinitions.activeAgents),
    account: toAccountInfo(),
    outputStyle: hasCustomOutputStyle(),
    mcpServers: () => mcpServerStatusSnapshots(store.getState().mcp.clients),
    hostOwnsPermissionMode: !0,
    hostOwnsModel: !0,
  });
}
//@ chunk-18hwfzwa.js:202607-202611 placement
j();
//@ chunk-18hwfzwa.js:202611-202646 placement
var rFt = 5000,
  BHe = [2000, 8000, 30000];

export { ReplSessionScope, runWithQueryParams, rFt, BHe };
