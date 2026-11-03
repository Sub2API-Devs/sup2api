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
import { randomUUID } from "crypto";
import { join, sep } from "path";
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
import { emptyPickerState } from "../../memdir/findRelevantMemories.js";
import { requestLocalJsxDialog, LocalJsxHost, clearMcpAuthCaches } from "./LocalJsxHost.js";
import { requestDialogOnce } from "../../components/dialogs/dialogRequests.js";
import { ApiKeyVerification } from "../../hooks/useApiKeyVerification.js";
import { createStore } from "../../state/store.js";
import { createSignal } from "../../utils/signal.js";
import { InboxVerdictCache } from "../../utils/inboxClassification.js";
import { commandNamesForBridge } from "../../cli/print/lowLatencySubmit.js";
import { withExtraExportTools } from "../../utils/exportRenderer.js";
import { getTools, assembleToolPool } from "../../tools.js";
import { createRemoteFileState, READ_FILE_STATE_CACHE_SIZE } from "../../utils/remoteFileState.js";
import { createIsolationLatch } from "../../services/tools/webToolIsolation.js";
import { saveIsolationLatch } from "../../utils/sessionStorage.js";
import {
  provisionContentReplacementState,
  reconstructContentReplacementState,
} from "../../utils/toolResultStorage.js";
import { runningTurnRegistry, extractReadFilesFromMessages } from "../../utils/queryHelpers.js";
import {
  waitForAgentTranscriptFlush,
  normalizeAgentMessagesForApi,
} from "../../tasks/LocalAgentTask/transcriptFlush.js";
import { stackToast } from "../../components/pluginUi/toastStack.js";
import { singleLineFieldText, formatSourceLine } from "../../utils/messages/nonUserMessages.js";
import {
  TOAST_DEFAULT_MS,
  toastQueueState,
  toastKeyFor,
  logToastGaveWay,
  wasToastShown,
  readBarToasts,
  IMMEDIATE,
  enqueueBarToast,
} from "../../plugins/functionHooks/uiToast.js";
import { holdsToasts as holdsToasts_2 } from "../../context/notifications.js";
import { logForDebugging } from "../../utils/debug.js";
import { sendNotification } from "../../services/notifier.js";
import { awaitPolicyColdStartWaiter } from "../../services/policyLimits/coldStartWaiter.js";
import { explainPluginServer } from "../../services/mcp/mcpConnectionRefusals.js";
import {
  awaitMcpServerConnected,
  mcpConnectRefusal,
  connectMcpServerForPlugin,
} from "../../plugins/functionHooks/mcpApi.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getRemoteCaps, hasRemoteCap } from "../../remote/remoteMode.js";
import { requestContextUsage } from "../../entrypoints/sdk/controlSchemas.js";
import { collectContextData } from "../../commands/context/context-noninteractive.js";
import {
  selectionPayloadForAltScreen,
  subscribeToSelectionEvents,
} from "../../components/VirtualMessageList.js";
import { showAgentTaskView } from "../../components/CoordinatorAgentStatus.js";
import { getSecondRootError } from "../../ink/terminal.js";
import { bindSurface, release as release_2 } from "../../plugins/functionHooks/surfaceBinding.js";
import { pendingReloadSlot } from "../../plugins/functionHooks/pluginLifecycle.js";
import { installDevModsPlaceholderExpander } from "../../services/plugins/devMods/devModsWatcher.js";
import { registerTurnParamsHook } from "../../plugins/functionHooks/modelApi.js";
import { registerPostSamplingHook } from "../../utils/hooks/postSamplingHooks.js";
import { onMemorySkillsChanged, memorySkillNamesSnapshot } from "../../services/memorySync/memorySkills.js";
import { onPolicyVerdictChanged, policyVerdictRebuildKey } from "../../services/policyLimits/policyState.js";
import { onDeclaredChange, isDeclared } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { sharedSkillChangeDetector } from "../../utils/skills/skillChangeDetector.js";
import { onGrowthBookRefresh } from "../../services/analytics/growthbook.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { isCommandSetHooked } from "../../plugins/functionHooks/commandHooks.js";
import { clearForkCacheSafeParams } from "../../utils/forkedAgent.js";
import { todoToolsEnabled } from "../../utils/sessionKind.js";
import { arraysEqual } from "../../utils/collections.js";
import { logError } from "../../utils/log.js";
import { getUserMsgOptIn, isWorkspaceRestricted, setReplBridgeActive } from "../../bootstrap/state.js";
import { alwaysFalseFlag } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { getManagedFilePath } from "../../utils/settings/managedPath.js";
import { managedFolderCondition } from "../../plugins/functionHooks/sites/promptContextSites.js";
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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

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
//@ chunk-18hwfzwa.js:186808-201323 placement
/**
 * REPL 会话作用域：持有 readFileState、会话环境变量、工具状态、MCP 初始客户端、对话框传输、API key 校验、插件状态 toast 等会话级单例。
 */
class ReplSessionScope {
  readFileState;
  sessionEnvVars = new Map();
  toolState = new InstanceRegistry();
  memorySelector = emptyPickerState();
  isolationLatch;
  contentReplacementState;
  dialogTransport = requestLocalJsxDialog();
  requestDialog = requestDialogOnce(this.dialogTransport);
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
  connected = false;
  disposed = false;
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
    ...getTools(h, {
      activeAgents: x.activeAgents,
    }),
    ...this.initialTools,
  ]);
  constructor(h) {
    this.store = h.store;
    this.storageV5 = h.storageV5;
    this.credentials = h.credentials;
    this.session = h.session;
    this.initialMcpClients = h.initialMcpClients;
    this.initialTools = h.initialTools;
    this.disableSlashCommands = h.disableSlashCommands;
    this.filterCommands = h.filterCommands;
    this.isThinClient = h.isThinClient;
    this.onCommandsChange = h.onCommandsChange;
    this.localCommands = h.initialCommands;
    this.lastModelInputs = selectMainLoopModels(h.store.getState());
    this.dynamicMcp = h.initialDynamicMcpConfig;
    this.mainThreadAgent = h.mainThreadAgentDefinition;
    this.readFileState = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
    this.isolationLatch = createIsolationLatch(null, (x) => saveIsolationLatch(x, this.storageV5));
    this.contentReplacementState = provisionContentReplacementState(
      h.initialMessages,
      h.initialContentReplacements,
    );
    this.sessionBinding = {
      surface: "terminal",
      model: () => this.requireHost().mainLoopModel,
      messages: () => this.requireHost().getMessages(),
      conversation: (x) => (x === undefined ? this.requireHost().conversation : runningTurnRegistry.of(x)),
      tools: () => this.computeTools(),
      commands: () => this.snapshot.commands,
      mcpServers: () => this.computeMcpClients().map((x) => x.name),
      toolContext: (x) => {
        let D = this.requireHost();
        return D.buildToolUseContext(D.getMessages(), [], x, D.mainLoopModel);
      },
      savedAgentMessages: (x) => waitForAgentTranscriptFlush(x, this.storageV5),
      requestMessages: (x) => normalizeAgentMessagesForApi(x, this.computeTools()),
      canUseTool: (...x) => this.requireHost().canUseTool(...x),
      toast: (x, D, L) => {
        if (this.requireHost().stacksToasts) {
          stackToast({
            plugin: x,
            text: singleLineFieldText(D),
            timeoutMs: L ?? TOAST_DEFAULT_MS,
          });
          return;
        }
        let state = this.store.getState();
        let ke = toastQueueState(
          {
            ...state.notifications,
            isHeld: holdsToasts_2(state),
          },
          x,
        );
        let key = toastKeyFor(x, randomUUID());
        logToastGaveWay({
          key: ke.givesWay,
          plugin: x,
          isCutShort: wasToastShown(readBarToasts(), ke.givesWay, ke.isCutShort),
        });
        this.requireHost().addNotification({
          key,
          kind: "event",
          text: formatSourceLine(x, D),
          priority: IMMEDIATE,
          waitsItsTurn: ke.isWaiting,
          invalidates: ke.givesWay === undefined ? [] : [ke.givesWay],
          timeoutMs: L ?? TOAST_DEFAULT_MS,
        });
        enqueueBarToast({
          key,
          plugin: x,
          text: formatSourceLine(x, D),
          ms: L ?? TOAST_DEFAULT_MS,
        });
        let { current: Be, queue } = this.store.getState().notifications;
        logForDebugging(`$.ui.toast: shown as ${Be?.key ?? "nothing"} (${queue.length} queued)`);
      },
      notify: (notification, hookOrigin) =>
        sendNotification(notification, this.requireHost().terminal, {
          storageV5: this.storageV5,
          credentials: this.credentials,
          hookOrigin,
        }),
      status: (x, D) => {
        let L = this.requireHost();
        let ee = `plugin-status-${x}`;
        L.removeNotification(ee);
        if (D !== undefined)
          L.addNotification({
            key: ee,
            kind: "event",
            text: formatSourceLine(x, D),
            priority: "low",
            pinned: true,
          });
      },
      addMcpServer: async (x, D) => {
        let L = Symbol(x);
        this.pendingMcpServerAdds.set(x, L);
        await awaitPolicyColdStartWaiter();
        if (this.pendingMcpServerAdds.get(x) !== L) return;
        this.pendingMcpServerAdds.delete(x);
        this.updateDynamicMcpConfig((ee) => ({
          ...(ee ?? {}),
          [x]: D,
        }));
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
          {
            rows: () => this.store.getState().mcp.clients,
            subscribe: (D) => this.store.subscribe(D),
          },
          x,
        ),
      connectMcpServer: async (x, D) => {
        let L = Symbol(x);
        this.pendingMcpServerAdds.set(x, L);
        await awaitPolicyColdStartWaiter();
        if (this.pendingMcpServerAdds.get(x) !== L)
          return mcpConnectRefusal("failed", `The MCP server "${x}" left the session before it connected.`);
        this.pendingMcpServerAdds.delete(x);
        return connectMcpServerForPlugin(
          {
            rows: () => this.store.getState().mcp.clients,
            subscribe: (ee) => this.store.subscribe(ee),
            add: (ee, ke) =>
              this.updateDynamicMcpConfig((Re) => ({
                ...(Re ?? {}),
                [ee]: ke,
              })),
            drop: (ee) => this.updateDynamicMcpConfig((ke) => wi(ke ?? {}, (Re, Be) => Be === ee)),
            holds: (ee) => Object.hasOwn(this.dynamicMcp ?? {}, ee),
            forget: (ee, ke) => clearMcpAuthCaches(ee, ke, this.storageV5),
          },
          x,
          D,
        );
      },
      removeMcpServer: async (x) => {
        this.pendingMcpServerAdds.delete(x);
        this.updateDynamicMcpConfig((D) => wi(D ?? {}, (L, ee) => ee === x));
      },
      refreshCommands: () => void this.rereadCommands(),
      refreshAgents: () => this.rereadAgents(),
      refreshContext: h.refreshContext,
      compact: (x) => this.requireHost().compact(x),
      contextData: async (x) => {
        let controlChannel = getRemoteCaps();
        if (controlChannel) {
          if (!hasRemoteCap("controlChannel"))
            throw Error("the context breakdown isn't available over this remote connection");
          let ke = await requestContextUsage(controlChannel, {
            detail: x.detail,
          });
          if (!ke) throw Error("the remote sent a context breakdown this version can't read");
          return ke;
        }
        let L = this.requireHost();
        let toolUseContext = L.buildToolUseContext(
          L.getMessages(),
          [],
          new AbortController(),
          L.mainLoopModel,
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
      transcript: {
        reveal: (x, D) => this.requireHost().revealInTranscript(x, D),
      },
      selection: {
        read: () => selectionPayloadForAltScreen(this.selectionWatch()),
      },
      view: {
        show: (x) => showAgentTaskView(this.store, x),
      },
    };
    this.snapshot = this.derive();
    this.onCommandsChange?.(this.snapshot.commands);
  }
  bindHost(host) {
    this.host = host;
  }
  selectionWatch() {
    return {
      source: getSecondRootError().get(process.stdout),
      rowHolding: (h) => this.host?.rowHoldingSelection(h),
    };
  }
  requireHost() {
    if (this.host === null) throw Error("ReplSessionScope: used before its screen bound a host");
    return this.host;
  }
  connect() {
    if (this.connected || this.disposed) return;
    this.connected = true;
    bindSurface(this.sessionBinding);
    pendingReloadSlot.set(this.sessionPlugins);
    installDevModsPlaceholderExpander();
    registerTurnParamsHook(registerPostSamplingHook);
    this.stops.push(
      subscribeToSelectionEvents(this.selectionWatch()),
      this.store.subscribe(this.refreshOnStoreInputs),
      this.workerCommands.subscribe(this.refresh),
      onMemorySkillsChanged(this.refresh),
      onPolicyVerdictChanged(this.refreshOnNextMicrotask),
      onDeclaredChange(this.refreshOnNextMicrotask),
    );
    if (!this.isThinClient) {
      this.stops.push(
        sharedSkillChangeDetector.subscribe(this.reloadCommandsAndAgents),
        onGrowthBookRefresh(this.refilterCommands),
        settingsChangeDetector.subscribe(this.refilterCommands),
        settingsChangeDetector.subscribe(() => {
          if (this.noteHoldMove()) this.rereadAgents();
        }),
        this.store.subscribe(() => this.shedHeldManagedAgents()),
        onPolicyVerdictChanged(this.refilterCommandsOnPolicyVerdict),
      );
      if (this.noteHoldMove() && this.seatedHold === "asks:") this.rereadAgents();
      if (isCommandSetHooked()) this.rereadCommands();
    }
    this.refresh();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.connected = false;
    release_2(this.sessionBinding);
    if (pendingReloadSlot.get() === this.sessionPlugins) pendingReloadSlot.set(undefined);
    clearForkCacheSafeParams();
    for (let stop of this.stops.splice(0)) stop();
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
    let h = this.combinedInitialToolsFor(this.store.getState(), todoToolsEnabled());
    if (h !== this.snapshot.combinedInitialTools) this.refresh();
    return h;
  }
  setMainThreadAgentDefinition(h) {
    if (h === this.mainThreadAgent) return;
    this.mainThreadAgent = h;
    this.refresh();
  }
  lastStoreInputs = [];
  lastModelInputs;
  refreshOnStoreInputs = () => {
    let state = this.store.getState();
    let mainLoopModels = selectMainLoopModels(state);
    if (!arraysEqual(this.lastModelInputs, mainLoopModels)) {
      this.lastModelInputs = mainLoopModels;
      if (!this.isThinClient) this.rereadCommands();
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
      this.isThinClient && alwaysFalseSessionScope(state),
      this.isThinClient && state.workerInventory,
      state.settings,
    ];
    if (arraysEqual(this.lastStoreInputs, D)) return;
    this.lastStoreInputs = D;
    this.refresh();
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
    let state = this.store.getState();
    let x = todoToolsEnabled();
    let D = memorySkillNamesSnapshot();
    let L = this.narrowToWorker(this.localCommands, this.workerCommands.getState());
    let ee = this.mergePluginCommands(L, state.plugins.commands, D);
    let ke = this.mergeMcpCommands(ee, state.mcp.commands, D);
    let commands = state.workerInventory?.commands;
    let Be = this.isThinClient
      ? this.addWorkerOnly(
          this.filterForThinClient(ke),
          commands === undefined ? null : this.namesOf(commands),
        )
      : ke;
    let commands_2 = this.disableSlashCommands
      ? this.noCommands
      : this.filterCommands
        ? this.applyCommandFilter(Be, this.filterCommands)
        : Be;
    let We = this.combinedInitialToolsFor(state, x);
    let { tools, allowedAgentTypes } = this.computeToolPool(state, We, x);
    return {
      commands: commands_2,
      dynamicMcpConfig: this.dynamicMcp,
      tools,
      renderingTools: this.addDisplayOnlyTools(tools, this.isThinClient && alwaysFalseSessionScope(state)),
      allowedAgentTypes,
      mainThreadAgentDefinition: this.mainThreadAgent,
      combinedInitialTools: We,
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
      alwaysFalseFlag(),
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
    let projectRoot = getSessionProject(this.session).projectRoot;
    try {
      clearCommandsCache();
      let commands = await getCommands(projectRoot, this.storageV5);
      this.replaceLocalCommands(commands);
      await this.rereadAgents();
    } catch (error) {
      if (error instanceof Error) logError(error);
    }
  };
  readHold() {
    let under = "";
    try {
      under = join(getManagedFilePath(), ".claude") + sep;
      let x = managedFolderCondition();
      return x === "held:"
        ? {
            hold: x,
            under,
          }
        : {
            hold: x,
          };
    } catch (error) {
      if (error instanceof Error) logError(error);
      this.seatedHold = undefined;
      return managedSettingsAskState.readAs === false
        ? {}
        : {
            under,
          };
    }
  }
  shedHeldManagedAgents(h) {
    let agentDefinitions = this.store.getState().agentDefinitions;
    if (h === undefined && agentDefinitions === this.shedSeat) return;
    this.shedSeat = agentDefinitions;
    let { under } = h ?? this.readHold();
    let filtered = agentDefinitions.allAgents.filter(
      (agent) =>
        under === undefined || agent.source !== "policySettings" || !agent.baseDir?.startsWith(under),
    );
    if (filtered.length !== agentDefinitions.allAgents.length)
      this.store.setState((ee) => ({
        ...ee,
        agentDefinitions: rebuildAgentDefinitions(ee.agentDefinitions, filtered),
      }));
  }
  noteHoldMove() {
    let hold = this.readHold();
    if (hold.hold !== undefined && hold.hold === this.seatedHold) return false;
    this.seatedHold = hold.hold;
    this.shedHeldManagedAgents(hold);
    this.replaceLocalCommands(this.localCommands, hold);
    return true;
  }
  rereadAgents = async () => {
    try {
      let agentDefinitionsWithOverrides = await getAgentDefinitionsWithOverrides(
        getSessionProject(this.session).projectRoot,
        this.storageV5,
      );
      if (this.disposed) return;
      this.store.setState((x) => {
        let filtered = x.agentDefinitions.allAgents.filter((agent) => agent.source === "flagSettings");
        return {
          ...x,
          agentDefinitions: rebuildAgentDefinitions(
            agentDefinitionsWithOverrides,
            withLiveRegisteredAgents([...agentDefinitionsWithOverrides.allAgents, ...filtered]),
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
      clearCommandMemoizationCaches();
      this.replaceLocalCommands(
        await getCommands(getSessionProject(this.session).projectRoot, this.storageV5),
      );
    } catch (error) {
      if (error instanceof Error) logError(error);
    }
  };
  rereadCommands = async () => {
    try {
      this.replaceLocalCommands(
        await getCommands(getSessionProject(this.session).projectRoot, this.storageV5),
      );
    } catch (error) {
      if (error instanceof Error) logError(error);
    }
  };
  replaceLocalCommands(h, x = this.disposed ? {} : this.readHold()) {
    let { under } = x;
    let filtered = h.filter(
      (ke) =>
        under === undefined ||
        ke.type !== "prompt" ||
        ke.source !== "policySettings" ||
        !(ke.skillRoot ?? ke.skillFile?.path)?.startsWith(under),
    );
    let ee = filtered.length === h.length ? h : filtered;
    if (this.disposed || ee === this.localCommands) return;
    this.localCommands = ee;
    this.refresh();
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
    let dynamicMcp = this.dynamicMcp;
    let D = typeof h === "function" ? h(dynamicMcp) : h;
    if (D === dynamicMcp) return;
    this.dynamicMcp = D;
    this.snapshot = {
      ...this.snapshot,
      dynamicMcpConfig: D,
    };
    this.changed.emit();
  };
  addAutoConnectedIde = (ide) => {
    this.updateDynamicMcpConfig((x) =>
      x?.ide
        ? x
        : {
            ...x,
            ide,
          },
    );
  };
  computeTools = () => this.computeToolPoolFresh().tools;
  computeToolPoolFresh = () => {
    let state = this.store.getState();
    let x = todoToolsEnabled();
    let toolPool = this.computeToolPool(state, this.combinedInitialToolsFor(state, x), x);
    if (toolPool.tools !== this.snapshot.tools) this.refresh();
    return toolPool;
  };
  computeToolPool(h, initialTools, todoTools) {
    let L = {
      toolPermissionContext: h.toolPermissionContext,
      mcpTools: h.mcp.tools,
      mcpClients: h.mcp.clients,
      combinedInitialTools: initialTools,
      mainThreadAgentDefinition: this.mainThreadAgent,
      replBridgeEnabled: h.replBridgeEnabled,
      replBridgeOutboundOnly: h.replBridgeOutboundOnly,
      agentDefinitions: h.agentDefinitions,
      todoTools,
      slackTagConnected: h.slackTagConnected,
      githubRepo: isCachedGitHubRepo(),
      workspaceRestricted: isWorkspaceRestricted(),
      waitForMcpServersDeclared: isDeclared(),
    };
    let toolPoolCache = this.toolPoolCache;
    if (toolPoolCache !== null && assembleSessionTools(toolPoolCache.key, L)) return toolPoolCache.result;
    setReplBridgeActive(h.replBridgeEnabled && !h.replBridgeOutboundOnly);
    let found = h.mcp.clients.find(isCommsRoledServer);
    if (found)
      this.commsRoledServerSeen = {
        name: found.name,
        type: "disabled",
        config: found.config,
      };
    let assembled = assembleToolPool(h.toolPermissionContext, h.mcp.tools, {
      activeAgents: h.agentDefinitions.activeAgents,
    });
    let Be = mergeAndFilterTools(
      initialTools,
      assembled,
      h.toolPermissionContext.mode,
      [...initialTools, ...h.mcp.tools],
      createAccountMemoryToolGate(() =>
        this.commsRoledServerSeen ? [...h.mcp.clients, this.commsRoledServerSeen] : h.mcp.clients,
      ),
    );
    let mainThreadAgent = this.mainThreadAgent;
    let We = mainThreadAgent
      ? resolveAgentTools(
          mainThreadAgent,
          withWebFetchToolForAgent(mainThreadAgent, Be, h.toolPermissionContext, {
            activeAgents: h.agentDefinitions.activeAgents,
          }),
          false,
          true,
        )
      : undefined;
    let ze = stripSoleNonDeniableTool(We ? We.resolvedTools : Be, h.toolPermissionContext);
    let allowedAgentTypes = We?.allowedAgentTypes;
    let rt = mainThreadAgent ? resolveAgentToolNames(mainThreadAgent) : undefined;
    let kt = toolPoolCache !== null && arraysEqual(toolPoolCache.result.tools, ze);
    let At = toolPoolCache !== null && arraysEqual(toolPoolCache.result.allowedAgentTypes, allowedAgentTypes);
    let It = toolPoolCache !== null && hasAnyOf(toolPoolCache.result.primitiveToolGrant, rt);
    let Ot =
      kt && At && It
        ? toolPoolCache.result
        : {
            tools: kt ? toolPoolCache.result.tools : ze,
            allowedAgentTypes: At ? toolPoolCache.result.allowedAgentTypes : allowedAgentTypes,
            primitiveToolGrant: It ? toolPoolCache.result.primitiveToolGrant : rt,
          };
    this.toolPoolCache = {
      key: L,
      result: Ot,
    };
    return Ot;
  }
  computeMcpClients = () => mergeClients(this.initialMcpClients, this.store.getState().mcp.clients);
  sandboxClassifierVerdicts() {
    let toolPermissionContext = this.store.getState().toolPermissionContext;
    if (toolPermissionContext !== this.verdictsPermissionContext) {
      this.verdictsPermissionContext = toolPermissionContext;
      this.verdicts.clear();
    }
    return this.verdicts;
  }
  mergeReadFileStateFrom(messages, cwd) {
    this.readFileState = mergeFileStateCaches(
      this.readFileState,
      extractReadFilesFromMessages(messages, cwd, READ_FILE_STATE_CACHE_SIZE),
    );
  }
  reseatIsolationLatch(h) {
    this.isolationLatch.onLatch = undefined;
    this.isolationLatch = createIsolationLatch(h, (x) => saveIsolationLatch(x, this.storageV5));
  }
  reconstructContentReplacementState(messages, records) {
    if (!this.contentReplacementState) return;
    this.contentReplacementState = reconstructContentReplacementState(messages, records);
  }
  evictRewoundFileTracking(h) {
    for (let readFilePath of h.readFilePaths) this.readFileState.delete(readFilePath);
    for (let nestedMemoryPath of h.nestedMemoryPaths) this.readFileState.delete(nestedMemoryPath);
  }
  seedMemoryFile(h, x) {
    this.readFileState.set(h, {
      ...x,
      startupMemorySeed: true,
    });
  }
}
//@ chunk-18hwfzwa.js:201323-201457 placement
function hasAnyOf(primitiveToolGrant, x) {
  if (primitiveToolGrant === x) return true;
  if (primitiveToolGrant === undefined || x === undefined || primitiveToolGrant.size !== x.size) return false;
  for (let D of primitiveToolGrant) if (!x.has(D)) return false;
  return true;
}
//@ chunk-18hwfzwa.js:201457-202036 placement
function assembleSessionTools(key, x) {
  return (
    key.toolPermissionContext === x.toolPermissionContext &&
    key.mcpTools === x.mcpTools &&
    key.mcpClients === x.mcpClients &&
    key.combinedInitialTools === x.combinedInitialTools &&
    key.mainThreadAgentDefinition === x.mainThreadAgentDefinition &&
    key.replBridgeEnabled === x.replBridgeEnabled &&
    key.replBridgeOutboundOnly === x.replBridgeOutboundOnly &&
    key.agentDefinitions === x.agentDefinitions &&
    key.todoTools === x.todoTools &&
    key.slackTagConnected === x.slackTagConnected &&
    key.githubRepo === x.githubRepo &&
    key.workspaceRestricted === x.workspaceRestricted &&
    key.waitForMcpServersDeclared === x.waitForMcpServersDeclared
  );
}
//@ chunk-18hwfzwa.js:202036-202061 placement
function alwaysFalseSessionScope(h) {
  return false;
}
//@ chunk-18hwfzwa.js:202061-202241 placement
/**
 * 记住上一次参数与结果，参数逐个相同时直接返回缓存结果。
 */
function memoizeLast(h) {
  let x = null;
  return (...D) => {
    if (x !== null && x.inputs.length === D.length && x.inputs.every((input, ke) => input === D[ke]))
      return x.result;
    let L = h(...D);
    x = {
      inputs: D,
      result: L,
    };
    return L;
  };
}
//@ chunk-18hwfzwa.js:202241-202607 placement
function runWithQueryParams({ store, scope, readPendingQueryParams }) {
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
    hostOwnsPermissionMode: true,
    hostOwnsModel: true,
  });
}
//@ chunk-18hwfzwa.js:202607-202611 placement
init_react_production();
//@ chunk-18hwfzwa.js:202611-202646 placement
var REMOUNT_SETTLE_MS = 5000;
var BRIDGE_RETRY_DELAYS_MS = [2000, 8000, 30000];
export { ReplSessionScope, runWithQueryParams, REMOUNT_SETTLE_MS, BRIDGE_RETRY_DELAYS_MS };
