/**
 * screens/repl/ReplSessionScope.ts
 *
 * 2.1.316 新增。REPL 会话作用域（控制器生命周期）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (11)
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
import { runningTurnRegistry, restoreRemoteFileState } from "../../utils/queryHelpers.js";
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
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:191316-191403 placement
function activeToolNames(tools, allowed) {
  if (allowed === null) return tools;
  return tools.filter((tool) => allowed.has(tool.name) || REMOTE_SAFE_COMMANDS.has(tool));
}
//@ chunk-czq1j3j2.js:191403-191539 placement
var SESSION_SCOPE_DEFAULTS = [
  "commands",
  "dynamicMcpConfig",
  "tools",
  "renderingTools",
  "allowedAgentTypes",
  "mainThreadAgentDefinition",
  "combinedInitialTools",
];
//@ chunk-czq1j3j2.js:191539-191605 placement (2.1.88 match: useMainLoopModel, 1)
function selectMainLoopModels(state) {
  return [state.mainLoopModel, state.mainLoopModelForSession];
}
//@ chunk-czq1j3j2.js:191605-206121 placement
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
  namesOf = memoizeLast((names) => new Set(names));
  applyCommandFilter = memoizeLast((commands, filter) => commands.filter(filter));
  addDisplayOnlyTools = memoizeLast(withExtraExportTools);
  buildCombinedInitialTools = memoizeLast(
    (
      toolPermissionContext,
      agentState,
      isBriefOnly,
      userMsgOptIn,
      slackTagConnected,
      mainLoopModel,
      todoTools,
      workspaceRestricted,
      policyRebuildKey,
      alwaysFalseFlag,
    ) => [
      ...getTools(toolPermissionContext, {
        activeAgents: agentState.activeAgents,
      }),
      ...this.initialTools,
    ],
  );
  constructor(init) {
    this.store = init.store;
    this.storageV5 = init.storageV5;
    this.credentials = init.credentials;
    this.session = init.session;
    this.initialMcpClients = init.initialMcpClients;
    this.initialTools = init.initialTools;
    this.disableSlashCommands = init.disableSlashCommands;
    this.filterCommands = init.filterCommands;
    this.isThinClient = init.isThinClient;
    this.onCommandsChange = init.onCommandsChange;
    this.localCommands = init.initialCommands;
    this.lastModelInputs = selectMainLoopModels(init.store.getState());
    this.dynamicMcp = init.initialDynamicMcpConfig;
    this.mainThreadAgent = init.mainThreadAgentDefinition;
    this.readFileState = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
    this.isolationLatch = createIsolationLatch(null, (latch) => saveIsolationLatch(latch, this.storageV5));
    this.contentReplacementState = provisionContentReplacementState(
      init.initialMessages,
      init.initialContentReplacements,
    );
    this.sessionBinding = {
      surface: "terminal",
      model: () => this.requireHost().mainLoopModel,
      messages: () => this.requireHost().getMessages(),
      conversation: (agentId) =>
        agentId === undefined ? this.requireHost().conversation : runningTurnRegistry.of(agentId),
      tools: () => this.computeTools(),
      commands: () => this.snapshot.commands,
      mcpServers: () => this.computeMcpClients().map((client) => client.name),
      toolContext: (permissionContext) => {
        let host = this.requireHost();
        return host.buildToolUseContext(host.getMessages(), [], permissionContext, host.mainLoopModel);
      },
      savedAgentMessages: (agentId) => waitForAgentTranscriptFlush(agentId, this.storageV5),
      requestMessages: (messages) => normalizeAgentMessagesForApi(messages, this.computeTools()),
      canUseTool: (...args) => this.requireHost().canUseTool(...args),
      toast: (plugin, text, timeoutMs) => {
        if (this.requireHost().stacksToasts) {
          stackToast({
            plugin,
            text: singleLineFieldText(text),
            timeoutMs: timeoutMs ?? TOAST_DEFAULT_MS,
          });
          return;
        }
        let state = this.store.getState();
        let toastState = toastQueueState(
          {
            ...state.notifications,
            isHeld: holdsToasts_2(state),
          },
          plugin,
        );
        let key = toastKeyFor(plugin, randomUUID());
        logToastGaveWay({
          key: toastState.givesWay,
          plugin,
          isCutShort: wasToastShown(readBarToasts(), toastState.givesWay, toastState.isCutShort),
        });
        this.requireHost().addNotification({
          key,
          kind: "event",
          text: formatSourceLine(plugin, text),
          priority: IMMEDIATE,
          waitsItsTurn: toastState.isWaiting,
          invalidates: toastState.givesWay === undefined ? [] : [toastState.givesWay],
          timeoutMs: timeoutMs ?? TOAST_DEFAULT_MS,
        });
        enqueueBarToast({
          key,
          plugin,
          text: formatSourceLine(plugin, text),
          ms: timeoutMs ?? TOAST_DEFAULT_MS,
        });
        let { current: currentToast, queue } = this.store.getState().notifications;
        logForDebugging(`$.ui.toast: shown as ${currentToast?.key ?? "nothing"} (${queue.length} queued)`);
      },
      notify: (notification, hookOrigin) =>
        sendNotification(notification, this.requireHost().terminal, {
          storageV5: this.storageV5,
          credentials: this.credentials,
          hookOrigin,
        }),
      status: (plugin, text) => {
        let host = this.requireHost();
        let notificationKey = `plugin-status-${plugin}`;
        host.removeNotification(notificationKey);
        if (text !== undefined)
          host.addNotification({
            key: notificationKey,
            kind: "event",
            text: formatSourceLine(plugin, text),
            priority: "low",
            pinned: true,
          });
      },
      addMcpServer: async (serverName, config) => {
        let token = Symbol(serverName);
        this.pendingMcpServerAdds.set(serverName, token);
        await awaitPolicyColdStartWaiter();
        if (this.pendingMcpServerAdds.get(serverName) !== token) return;
        this.pendingMcpServerAdds.delete(serverName);
        this.updateDynamicMcpConfig((dynamicMcp) => ({
          ...(dynamicMcp ?? {}),
          [serverName]: config,
        }));
      },
      resolveMcpServer: (server) =>
        explainPluginServer({
          ...server,
          storageV5: this.storageV5,
          credentials: this.credentials,
          dynamicServers: this.dynamicMcp ?? {},
        }),
      settledMcpServer: (server) =>
        awaitMcpServerConnected(
          {
            rows: () => this.store.getState().mcp.clients,
            subscribe: (listener) => this.store.subscribe(listener),
          },
          server,
        ),
      connectMcpServer: async (serverName, config) => {
        let token = Symbol(serverName);
        this.pendingMcpServerAdds.set(serverName, token);
        await awaitPolicyColdStartWaiter();
        if (this.pendingMcpServerAdds.get(serverName) !== token)
          return mcpConnectRefusal(
            "failed",
            `The MCP server "${serverName}" left the session before it connected.`,
          );
        this.pendingMcpServerAdds.delete(serverName);
        return connectMcpServerForPlugin(
          {
            rows: () => this.store.getState().mcp.clients,
            subscribe: (listener) => this.store.subscribe(listener),
            add: (name, entry) =>
              this.updateDynamicMcpConfig((dynamicMcp) => ({
                ...(dynamicMcp ?? {}),
                [name]: entry,
              })),
            drop: (name) =>
              this.updateDynamicMcpConfig((dynamicMcp) =>
                import_reject(dynamicMcp ?? {}, (entry, entryName) => entryName === name),
              ),
            holds: (name) => Object.hasOwn(this.dynamicMcp ?? {}, name),
            forget: (serverName, serverId) => clearMcpAuthCaches(serverName, serverId, this.storageV5),
          },
          serverName,
          config,
        );
      },
      removeMcpServer: async (serverName) => {
        this.pendingMcpServerAdds.delete(serverName);
        this.updateDynamicMcpConfig((dynamicMcp) =>
          import_reject(dynamicMcp ?? {}, (key, entryName) => entryName === serverName),
        );
      },
      refreshCommands: () => void this.rereadCommands(),
      refreshAgents: () => this.rereadAgents(),
      refreshContext: init.refreshContext,
      compact: (options) => this.requireHost().compact(options),
      contextData: async (request) => {
        let controlChannel = getRemoteCaps();
        if (controlChannel) {
          if (!hasRemoteCap("controlChannel"))
            throw Error("the context breakdown isn't available over this remote connection");
          let data = await requestContextUsage(controlChannel, {
            detail: request.detail,
          });
          if (!data) throw Error("the remote sent a context breakdown this version can't read");
          return data;
        }
        let host = this.requireHost();
        let toolUseContext = host.buildToolUseContext(
          host.getMessages(),
          [],
          new AbortController(),
          host.mainLoopModel,
        );
        return collectContextData({
          session: toolUseContext.session,
          messages: toolUseContext.messages,
          getAppState: () => this.store.getState(),
          getMcp: toolUseContext.getMcp,
          storageV5: this.storageV5,
          credentials: this.credentials,
          options: toolUseContext.options,
          detail: request.detail,
          terminalWidth: request.terminalWidth,
        });
      },
      composer: {
        read: () => this.requireHost().readDraft(),
        write: (text, options, meta) => this.requireHost().fillDraft(text, options, meta),
        paint: (text, options, meta) => this.requireHost().paintDraft(text, options, meta),
        forget: (paintId) => this.host?.forgetPaint(paintId),
        attribute: (text, source) => this.requireHost().attributeDraft(text, source),
        propose: (text, source) => this.requireHost().suggestDraft(text, source),
      },
      transcript: {
        reveal: (messageUuid, options) => this.requireHost().revealInTranscript(messageUuid, options),
      },
      selection: {
        read: () => selectionPayloadForAltScreen(this.selectionWatch()),
      },
      view: {
        show: (taskId) => showAgentTaskView(this.store, taskId),
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
      rowHolding: (row) => this.host?.rowHoldingSelection(row),
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
  subscribe = (listener) => this.changed.subscribe(listener);
  getSnapshot = () => this.snapshot;
  get commands() {
    return this.snapshot.commands;
  }
  get mainThreadAgentDefinition() {
    return this.mainThreadAgent;
  }
  get combinedInitialTools() {
    let tools = this.combinedInitialToolsFor(this.store.getState(), todoToolsEnabled());
    if (tools !== this.snapshot.combinedInitialTools) this.refresh();
    return tools;
  }
  setMainThreadAgentDefinition(agentDefinition) {
    if (agentDefinition === this.mainThreadAgent) return;
    this.mainThreadAgent = agentDefinition;
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
    let inputs = [
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
    if (arraysEqual(this.lastStoreInputs, inputs)) return;
    this.lastStoreInputs = inputs;
    this.refresh();
  };
  refresh = () => {
    if (this.disposed) return;
    let nextSnapshot;
    try {
      nextSnapshot = this.derive();
    } catch (error) {
      logError(error);
      return;
    }
    let snapshot = this.snapshot;
    if (SESSION_SCOPE_DEFAULTS.every((key) => snapshot[key] === nextSnapshot[key])) return;
    this.snapshot = nextSnapshot;
    try {
      if (nextSnapshot.commands !== snapshot.commands) this.onCommandsChange?.(nextSnapshot.commands);
      this.changed.emit();
    } catch (error) {
      logError(error);
    }
  };
  derive() {
    let state = this.store.getState();
    let todoTools = todoToolsEnabled();
    let memorySkillNames = memorySkillNamesSnapshot();
    let workerNarrowed = this.narrowToWorker(this.localCommands, this.workerCommands.getState());
    let withPlugins = this.mergePluginCommands(workerNarrowed, state.plugins.commands, memorySkillNames);
    let withMcp = this.mergeMcpCommands(withPlugins, state.mcp.commands, memorySkillNames);
    let commands = state.workerInventory?.commands;
    let commands_2 = this.isThinClient
      ? this.addWorkerOnly(
          this.filterForThinClient(withMcp),
          commands === undefined ? null : this.namesOf(commands),
        )
      : withMcp;
    let commands_3 = this.disableSlashCommands
      ? this.noCommands
      : this.filterCommands
        ? this.applyCommandFilter(commands_2, this.filterCommands)
        : commands_2;
    let initialTools = this.combinedInitialToolsFor(state, todoTools);
    let { tools, allowedAgentTypes } = this.computeToolPool(state, initialTools, todoTools);
    return {
      commands: commands_3,
      dynamicMcpConfig: this.dynamicMcp,
      tools,
      renderingTools: this.addDisplayOnlyTools(tools, this.isThinClient && alwaysFalseSessionScope(state)),
      allowedAgentTypes,
      mainThreadAgentDefinition: this.mainThreadAgent,
      combinedInitialTools: initialTools,
    };
  }
  combinedInitialToolsFor(state, todoTools) {
    return this.buildCombinedInitialTools(
      state.toolPermissionContext,
      state.agentDefinitions,
      state.isBriefOnly,
      getUserMsgOptIn(),
      state.slackTagConnected,
      state.mainLoopModel,
      todoTools,
      isWorkspaceRestricted(),
      policyVerdictRebuildKey(),
      isCodeModeEnabled(),
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
      let hold = managedFolderCondition();
      return hold === "held:"
        ? {
            hold,
            under,
          }
        : {
            hold,
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
  shedHeldManagedAgents(hold) {
    let agentDefinitions = this.store.getState().agentDefinitions;
    if (hold === undefined && agentDefinitions === this.shedSeat) return;
    this.shedSeat = agentDefinitions;
    let { under } = hold ?? this.readHold();
    let filtered = agentDefinitions.allAgents.filter(
      (agent) =>
        under === undefined || agent.source !== "policySettings" || !agent.baseDir?.startsWith(under),
    );
    if (filtered.length !== agentDefinitions.allAgents.length)
      this.store.setState((state) => ({
        ...state,
        agentDefinitions: rebuildAgentDefinitions(state.agentDefinitions, filtered),
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
      this.store.setState((state) => {
        let filtered = state.agentDefinitions.allAgents.filter((agent) => agent.source === "flagSettings");
        return {
          ...state,
          agentDefinitions: rebuildAgentDefinitions(
            agentDefinitionsWithOverrides,
            withLiveRegisteredAgents([...agentDefinitionsWithOverrides.allAgents, ...filtered]),
          ),
        };
      });
    } catch (error) {
      if (error instanceof Error) logError(error);
      if (this.disposed) return;
      this.store.setState((state) => ({
        ...state,
        agentDefinitions: rebuildAgentDefinitions(
          state.agentDefinitions,
          withLiveRegisteredAgents(state.agentDefinitions.allAgents),
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
  replaceLocalCommands(localCommands, hold = this.disposed ? {} : this.readHold()) {
    let { under } = hold;
    let filtered = localCommands.filter(
      (command) =>
        under === undefined ||
        command.type !== "prompt" ||
        command.source !== "policySettings" ||
        !(command.skillRoot ?? command.skillFile?.path)?.startsWith(under),
    );
    let filteredCommands = filtered.length === localCommands.length ? localCommands : filtered;
    if (this.disposed || filteredCommands === this.localCommands) return;
    this.localCommands = filteredCommands;
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
    retarget: (dir) => PluginsStateStore.over(this.store).retarget(dir),
  };
  get dynamicMcpConfig() {
    return this.snapshot.dynamicMcpConfig;
  }
  updateDynamicMcpConfig = (updater) => {
    let dynamicMcp = this.dynamicMcp;
    let nextConfig = typeof updater === "function" ? updater(dynamicMcp) : updater;
    if (nextConfig === dynamicMcp) return;
    this.dynamicMcp = nextConfig;
    this.snapshot = {
      ...this.snapshot,
      dynamicMcpConfig: nextConfig,
    };
    this.changed.emit();
  };
  addAutoConnectedIde = (ide) => {
    this.updateDynamicMcpConfig((dynamicMcp) =>
      dynamicMcp?.ide
        ? dynamicMcp
        : {
            ...dynamicMcp,
            ide,
          },
    );
  };
  computeTools = () => this.computeToolPoolFresh().tools;
  computeToolPoolFresh = () => {
    let state = this.store.getState();
    let todoTools = todoToolsEnabled();
    let toolPool = this.computeToolPool(state, this.combinedInitialToolsFor(state, todoTools), todoTools);
    if (toolPool.tools !== this.snapshot.tools) this.refresh();
    return toolPool;
  };
  computeToolPool(state, initialTools, todoTools) {
    let poolInputs = {
      toolPermissionContext: state.toolPermissionContext,
      mcpTools: state.mcp.tools,
      mcpClients: state.mcp.clients,
      combinedInitialTools: initialTools,
      mainThreadAgentDefinition: this.mainThreadAgent,
      replBridgeEnabled: state.replBridgeEnabled,
      replBridgeOutboundOnly: state.replBridgeOutboundOnly,
      agentDefinitions: state.agentDefinitions,
      todoTools,
      slackTagConnected: state.slackTagConnected,
      githubRepo: isCachedGitHubRepo(),
      workspaceRestricted: isWorkspaceRestricted(),
      waitForMcpServersDeclared: isDeclared(),
    };
    let toolPoolCache = this.toolPoolCache;
    if (toolPoolCache !== null && assembleSessionTools(toolPoolCache.key, poolInputs))
      return toolPoolCache.result;
    setReplBridgeActive(state.replBridgeEnabled && !state.replBridgeOutboundOnly);
    let found = state.mcp.clients.find(isCommsRoledServer);
    if (found)
      this.commsRoledServerSeen = {
        name: found.name,
        type: "disabled",
        config: found.config,
      };
    let assembled = assembleToolPool(state.toolPermissionContext, state.mcp.tools, {
      activeAgents: state.agentDefinitions.activeAgents,
    });
    let mergedTools = mergeAndFilterTools(
      initialTools,
      assembled,
      state.toolPermissionContext.mode,
      [...initialTools, ...state.mcp.tools],
      createAccountMemoryToolGate(() =>
        this.commsRoledServerSeen ? [...state.mcp.clients, this.commsRoledServerSeen] : state.mcp.clients,
      ),
    );
    let mainThreadAgent = this.mainThreadAgent;
    let agentTools = mainThreadAgent
      ? resolveAgentTools(
          mainThreadAgent,
          withWebFetchToolForAgent(mainThreadAgent, mergedTools, state.toolPermissionContext, {
            activeAgents: state.agentDefinitions.activeAgents,
          }),
          false,
          true,
        )
      : undefined;
    let toolList = stripSoleNonDeniableTool(
      agentTools ? agentTools.resolvedTools : mergedTools,
      state.toolPermissionContext,
    );
    let allowedAgentTypes = agentTools?.allowedAgentTypes;
    let agentToolNames = mainThreadAgent ? resolveAgentToolNames(mainThreadAgent) : undefined;
    let sameTools = toolPoolCache !== null && arraysEqual(toolPoolCache.result.tools, toolList);
    let sameAgentTypes =
      toolPoolCache !== null && arraysEqual(toolPoolCache.result.allowedAgentTypes, allowedAgentTypes);
    let sameGrant =
      toolPoolCache !== null && hasAnyOf(toolPoolCache.result.primitiveToolGrant, agentToolNames);
    let pool =
      sameTools && sameAgentTypes && sameGrant
        ? toolPoolCache.result
        : {
            tools: sameTools ? toolPoolCache.result.tools : toolList,
            allowedAgentTypes: sameAgentTypes ? toolPoolCache.result.allowedAgentTypes : allowedAgentTypes,
            primitiveToolGrant: sameGrant ? toolPoolCache.result.primitiveToolGrant : agentToolNames,
          };
    this.toolPoolCache = {
      key: poolInputs,
      result: pool,
    };
    return pool;
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
  mergeReadFileStateFrom(from, into) {
    this.readFileState = mergeFileStateCaches(
      this.readFileState,
      restoreRemoteFileState(from, into, READ_FILE_STATE_CACHE_SIZE),
    );
  }
  reseatIsolationLatch(latch) {
    this.isolationLatch.onLatch = undefined;
    this.isolationLatch = createIsolationLatch(latch, (latch) => saveIsolationLatch(latch, this.storageV5));
  }
  reconstructContentReplacementState(messages, records) {
    if (!this.contentReplacementState) return;
    this.contentReplacementState = reconstructContentReplacementState(messages, records);
  }
  evictRewoundFileTracking(rewound) {
    for (let readFilePath of rewound.readFilePaths) this.readFileState.delete(readFilePath);
    for (let nestedMemoryPath of rewound.nestedMemoryPaths) this.readFileState.delete(nestedMemoryPath);
  }
  seedMemoryFile(path, fileState) {
    this.readFileState.set(path, {
      ...fileState,
      startupMemorySeed: true,
    });
  }
}
//@ chunk-czq1j3j2.js:206121-206255 placement
function hasAnyOf(primitiveToolGrant, other) {
  if (primitiveToolGrant === other) return true;
  if (primitiveToolGrant === undefined || other === undefined || primitiveToolGrant.size !== other.size)
    return false;
  for (let item of primitiveToolGrant) if (!other.has(item)) return false;
  return true;
}
//@ chunk-czq1j3j2.js:206255-206834 placement
function assembleSessionTools(key, other) {
  return (
    key.toolPermissionContext === other.toolPermissionContext &&
    key.mcpTools === other.mcpTools &&
    key.mcpClients === other.mcpClients &&
    key.combinedInitialTools === other.combinedInitialTools &&
    key.mainThreadAgentDefinition === other.mainThreadAgentDefinition &&
    key.replBridgeEnabled === other.replBridgeEnabled &&
    key.replBridgeOutboundOnly === other.replBridgeOutboundOnly &&
    key.agentDefinitions === other.agentDefinitions &&
    key.todoTools === other.todoTools &&
    key.slackTagConnected === other.slackTagConnected &&
    key.githubRepo === other.githubRepo &&
    key.workspaceRestricted === other.workspaceRestricted &&
    key.waitForMcpServersDeclared === other.waitForMcpServersDeclared
  );
}
//@ chunk-czq1j3j2.js:206834-206859 placement
function alwaysFalseSessionScope(state) {
  return false;
}
//@ chunk-czq1j3j2.js:206859-207039 placement
/**
 * 记住上一次参数与结果，参数逐个相同时直接返回缓存结果。
 */
function memoizeLast(fn) {
  let last = null;
  return (...inputs) => {
    if (
      last !== null &&
      last.inputs.length === inputs.length &&
      last.inputs.every((input, index) => input === inputs[index])
    )
      return last.result;
    let result = fn(...inputs);
    last = {
      inputs,
      result,
    };
    return result;
  };
}
//@ chunk-czq1j3j2.js:207039-207406 placement
function runWithQueryParams({ store, scope, readPendingQueryParams }) {
  return createQueryEngine({
    run: query,
    queryParams: async (params) => readPendingQueryParams(),
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
//@ chunk-czq1j3j2.js:207406-207410 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:207406", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:207410-207445 placement
var REMOUNT_SETTLE_MS = 5000;
var BRIDGE_RETRY_DELAYS_MS = [2000, 8000, 30000];
export { REMOUNT_SETTLE_MS, BRIDGE_RETRY_DELAYS_MS, ReplSessionScope, runWithQueryParams };
