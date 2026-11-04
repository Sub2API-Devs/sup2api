/**
 * entrypoints/mcp.ts
 *
 * 沿用旧版路径：claude mcp serve 入口。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/mcp.ts
 * pieces: chunk-87nrc1a5.js (6), chunk-hjesqqfw.js (7)
 * attribution: placement 13
 */
import { array, stringSchema, zodStrictObject } from "../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { toolServerEnvAccessor } from "../utils/subprocessEnvLoader.js";
import { safeParseJSON } from "../utils/json.js";
import { hasProtoKeys } from "../utils/objectSafety.js";
import {
  applyPermissionRulesToPermissionContext,
  collectRulesFromSettings,
  hasPermissionsToUseTool,
} from "../utils/permissions/permissions.js";
import { getEmptyToolPermissionContext, findToolByName, safeParseToolInput } from "../Tool.js";
import { uniq, count } from "../utils/collections.js";
import { antBuiltinDenyRules } from "../utils/permissions/permissionSetup.js";
import { classifyRuleParens } from "../utils/permissions/permissionRuleParser.js";
import { PATH_RULE_CARVE_OUT_RE } from "../utils/settings/permissionRuleCarveOut.js";
import { splitRuleList } from "../utils/permissions/disallowedToolsFlag.js";
import {
  CLAUDECODE_REPOHOOKSSTAMP,
  getSettingsFilesStamp,
  setHeartbeatProgress,
  clearHeartbeatProgress,
  startProgressHeartbeat,
} from "./mcp/progressHeartbeat.js";
import { setCwd } from "../utils/Shell.js";
import { getRootSession, getSkillsSyncVetoed, getPluginsSyncVetoed } from "../bootstrap/state.js";
import { BufferedStdioServerTransport } from "../services/mcp/stdioServer.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { InstanceRegistry } from "../utils/instanceRegistry.js";
import { credentialsStoreFor } from "../utils/secureStorage/credentialsFileStore.js";
import {
  setMcpServeSession,
  EMPTY_SESSION_NAME,
  ANTHROPIC_SESSION,
  ANTHROPIC_SESSIONENDHOOKS,
} from "../services/analytics/metadata.js";
import { getHostAgentPolicy } from "../utils/hostAgentPolicy.js";
import {
  restrictHostAgentPolicy,
  serveModeTools,
  buildServeModeToolset,
  serveModeDefaultAppState,
  SERVE_MODE_KEYS,
  SERVE_MODE_VALUE,
  parseServeModeInput,
  strippedPrivilegeFieldsNote,
} from "./mcpServe/serveModeInput.js";
import { setDynamicSkillState, createDynamicSkillState } from "../skills/loadSkillsDir.js";
import { refreshSkillsSyncVeto } from "../utils/claudeAiSync/skillsSync.js";
import { pruneSkillsSyncRoot } from "../services/skillsSync/skillsSync.js";
import { logError } from "../utils/log.js";
import { refreshSyncVeto } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { pruneSyncedPluginsForClosedGate } from "../utils/claudeAiSync/pluginsSync.js";
import { createRemoteFileState, READ_FILE_STATE_CACHE_SIZE } from "../utils/remoteFileState.js";
import {
  getAgentDefinitionsWithOverrides,
  rebuildAgentDefinitions,
} from "../tools/AgentTool/loadAgentsDir.js";
import { getCwd } from "../utils/cwd.js";
import { isAgentDefinitionTrusted, checkAgentOriginTrust } from "../tools/AgentTool/agentTrust.js";
import { Server } from "../../vendor/@modelcontextprotocol/sdk/dist/esm/server/index.js";
import {
  createAbortController,
  userAbortReason,
  createChildAbortController,
} from "../utils/abortController.js";
import { isBackgroundTasksDisabled } from "../tools/AgentTool/AgentTool.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, toError, withTelemetryMessage } from "../utils/errors.js";
import { onPolicyVerdictChanged } from "../services/policyLimits/policyState.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { addSessionWorkingDirectories } from "../utils/permissions/PermissionUpdate.js";
import { commandQueueManager } from "../utils/messageQueueManager.js";
import { makeSaltedName } from "../utils/agentId.js";
import { TOOL_CATALOG, getAllBaseTools } from "../tools.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { query } from "../query.js";
import { UNLIMITED_RATE_LIMITER } from "../tasks/taskLoopRegistry.js";
import { NOOP_NOTIFICATION_DRAIN } from "../services/queuedNotifications/queuedNotifications.js";
import { NOOP_FUNCTION_HOOK_REGISTRY } from "../utils/hooks/functionHookNoop.js";
import { artifactReadObservationIn } from "../services/artifacts/readObservation.js";
import { createEmptyArtifactSessionStores } from "../services/artifacts/artifactReadConsent.js";
import { NOOP_AGENT_NAME_REGISTRY } from "../utils/agentNameRegistry.js";
import { NO_OP_COLOR_ASSIGNER } from "../tools/AgentTool/agentColorManager.js";
import { NO_BRIDGE_CONSENT } from "../screens/repl/bridgeChannelSlot.js";
import { combineWithCallerGoneSignal } from "../services/mcp/xaa.js";
import { findTool } from "../services/api/deferredToolsState.js";
import { createAssistantMessage } from "../utils/messages.js";
import { getTaskOutputPath } from "../utils/task/diskOutput.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import {
  toolFeatureName,
  isAbortOrCancelError,
  classifyToolErrorCode,
} from "../services/tools/toolExecution.js";
import { getErrorParts } from "../utils/toolErrors.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-87nrc1a5.js:11934-12043 placement
/**
 * mcp serve 设置的 schema：permissions.allow/deny 字符串列表。
 */
var stringListSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MCP_SERVE_SETTINGS_SCHEMA;
deferInit("chunk-87nrc1a5.js:11934", () => {
  stringListSchema = () => array(stringSchema()).default([]);
  MCP_SERVE_SETTINGS_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      permissions: zodStrictObject({
        allow: stringListSchema(),
        deny: stringListSchema(),
      }).default({
        allow: [],
        deny: [],
      }),
    }),
  );
});
//@ chunk-87nrc1a5.js:12043-12296 placement
/**
 * 读取并删除 CLAUDE_CODE_MCP_SERVE_SETTINGS，解析为 absent / unreadable / parsed（deny 规则合成权限上下文）。
 */
function readMcpServeSettings() {
  let CLAUDE_CODE_MCP_SERVE_SETTINGS = toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_SETTINGS;
  toolServerEnvAccessor.unset("CLAUDE_CODE_MCP_SERVE_SETTINGS");
  if (CLAUDE_CODE_MCP_SERVE_SETTINGS === undefined)
    return {
      kind: "absent",
    };
  let parsedJson = safeParseJSON(CLAUDE_CODE_MCP_SERVE_SETTINGS, false);
  let settings = MCP_SERVE_SETTINGS_SCHEMA().safeParse(parsedJson).data;
  return settings === undefined || hasProtoKeys(parsedJson)
    ? {
        kind: "unreadable",
      }
    : {
        kind: "parsed",
        ...buildServeDenyContext(settings.permissions),
      };
}
//@ chunk-87nrc1a5.js:12296-12411 placement
/**
 * 规则全部合法时把 deny 规则应用到权限上下文（无上下文时附加内置 deny 规则）。
 */
function buildDenyRulesContext(baseContext, denyRules) {
  return denyRules.every(isWellFormedDenyRule)
    ? applyPermissionRulesToPermissionContext(
        baseContext ?? getEmptyToolPermissionContext(),
        collectRulesFromSettings(
          {
            cliArg: baseContext ? [...denyRules] : uniq([...antBuiltinDenyRules(), ...denyRules]),
          },
          "deny",
        ),
        {
          announce: false,
        },
      )
    : undefined;
}
//@ chunk-87nrc1a5.js:12411-12636 placement
/**
 * 检查 deny 规则格式：不以 -/( 开头、无控制字符、工具名合法、括号配平等。
 */
function isWellFormedDenyRule(rule) {
  let classified = classifyRuleParens(rule);
  return !(
    rule.startsWith("-") ||
    rule.startsWith("(") ||
    PATH_RULE_CARVE_OUT_RE.test(rule) ||
    /\p{Cc}/u.test(rule) ||
    classified.kind === "malformed" ||
    !/^[\w*-]+$/.test(classified.kind === "call" ? classified.toolName : rule) ||
    (classified.kind === "call" && !hasBalancedParens(classified.rawContent)) ||
    splitRuleList([rule])[0] !== rule
  );
}
//@ chunk-87nrc1a5.js:12636-12769 placement
/**
 * 括号是否配平（跳过反斜杠转义）。
 */
function hasBalancedParens(rawContent) {
  let depth = 0;
  for (let j = 0; j < rawContent.length && depth >= 0; j++)
    if (rawContent[j] === "\\") j++;
    else if (rawContent[j] === "(") depth++;
    else if (rawContent[j] === ")") depth--;
  return depth === 0;
}
//@ chunk-87nrc1a5.js:12769-12953 placement
/**
 * 由 deny 规则（加内置规则）生成权限上下文，并统计格式错误的规则数。
 */
function buildServeDenyContext(permissions) {
  let denyRules = uniq([...splitRuleList(permissions.deny), ...antBuiltinDenyRules()]);
  return {
    context: applyPermissionRulesToPermissionContext(
      getEmptyToolPermissionContext(),
      collectRulesFromSettings(
        {
          cliArg: denyRules,
        },
        "deny",
      ),
    ),
    malformedRules: count(
      [...denyRules, ...splitRuleList(permissions.allow)],
      (rule) => rule.startsWith("-") || classifyRuleParens(rule).kind === "malformed",
    ),
  };
}
//@ chunk-hjesqqfw.js:3042-3211 placement = createComputerUseMcpServerForCli (0.323)
/**
 * （误归 computerUse/mcpServer）包装 MCP 请求处理器：请求 _meta 带 repo hooks stamp 标记时，在结果 _meta 中附加 stamp。
 */
function stampRepoHooksMeta(server, method, session, handler) {
  server.setRequestHandler(method, async (request, extra) => {
    let result = await handler(request, extra);
    if (!session || request.params._meta?.[CLAUDECODE_REPOHOOKSSTAMP] !== "1") return result;
    return {
      ...result,
      _meta: {
        ...result._meta,
        [CLAUDECODE_REPOHOOKSSTAMP]: await getSettingsFilesStamp(),
      },
    };
  });
}
//@ chunk-hjesqqfw.js:3211-3253 placement
function hasCloseSseStream(transport) {
  return "closeSSEStream" in transport;
}
//@ chunk-hjesqqfw.js:3253-3274 placement
var CALLER_GONE_SIGNAL = "callerGone";
//@ chunk-hjesqqfw.js:3274-3392 placement = getServerCommandArray (0.769)
async function startMCPServer(serverName, debug, verbose, host, context, options) {
  setCwd(serverName);
  let mcpServer = createMCPServer(debug, verbose, getRootSession(), "stdio", host, context, options);
  let transport = new BufferedStdioServerTransport();
  await mcpServer.connect(transport);
  registerCleanup(() => mcpServer.close());
}
//@ chunk-hjesqqfw.js:3392-3478 placement
let ReadonlyMapView; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hjesqqfw.js:3392", () => {
  ReadonlyMapView = class ReadonlyMapView extends InstanceRegistry {
    #e;
    constructor(options) {
      super();
      this.#e = options;
    }
    get(key) {
      return this.#e.get(key);
    }
  };
});
//@ chunk-hjesqqfw.js:3478-13829 placement = startMCPServer (0.2)
/**
 * claude mcp serve：把 Claude Code 自身的工具作为 MCP 服务器暴露（stdio 或 http），禁用后台代理等不适用功能。
 */
function createMCPServer(
  debug,
  verbose,
  host,
  transportKind,
  context,
  mode = "raw",
  toolHostState = {
    kind: "absent",
  },
  workspaceRoot,
) {
  let context_2 = toolHostState.kind === "parsed" ? toolHostState.context : undefined;
  let readFileStateCache = credentialsStoreFor(context);
  let isHttp = transportKind === "http";
  setMcpServeSession(host.host, EMPTY_SESSION_NAME);
  let hostAgentPolicy = getHostAgentPolicy();
  hostAgentPolicy.disableBackgroundAgentLaunch();
  hostAgentPolicy.disableRemoteAgentIsolation();
  hostAgentPolicy.disableBackgroundDeadline();
  hostAgentPolicy.disableForkSubagent();
  if (isHttp) restrictHostAgentPolicy(getHostAgentPolicy());
  else hostAgentPolicy.disableBackgroundCompletionNotice();
  setDynamicSkillState(createDynamicSkillState());
  refreshSkillsSyncVeto();
  if (getSkillsSyncVetoed()) pruneSkillsSyncRoot(context).catch(logError);
  refreshSyncVeto();
  if (getPluginsSyncVetoed()) pruneSyncedPluginsForClosedGate().catch(logError);
  let readFileState = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE, undefined, isHttp);
  let registry = new InstanceRegistry();
  let agentDefinitions = {
    activeAgents: [],
    allAgents: [],
  };
  let serveToolsProvider = isHttp
    ? Promise.resolve()
    : getAgentDefinitionsWithOverrides(getCwd(), context)
        .then((agentDefinitionsWithOverrides) => {
          agentDefinitions = rebuildAgentDefinitions(
            agentDefinitionsWithOverrides,
            agentDefinitionsWithOverrides.allAgents.filter((agent) => {
              if (isAgentDefinitionTrusted(agent)) return true;
              checkAgentOriginTrust(agent, "subagent", "definition");
              return false;
            }),
          );
        })
        .catch((error) => {
          logError(error);
        });
  let server = new Server(
    {
      name: "claude/tengu",
      version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
    },
  );
  let toolPermissionContext = createAbortController();
  let getTools = () => serveModeTools(isHttp);
  if (isHttp) {
    let { toolOutputServerCapabilities } = require("./mcpServe/toolOutputRequest.js");
    let capabilities = toolOutputServerCapabilities(getTools, context_2);
    if (capabilities !== undefined) {
      server.registerCapabilities(capabilities);
      if (!isBackgroundTasksDisabled()) {
        let {
          backgroundCommands,
          keepsBackgroundCommandsCapability,
        } = require("../services/mcpServe/readCalls.js");
        server.registerCapabilities(keepsBackgroundCommandsCapability(backgroundCommands.of(host.host).life));
      }
    }
    if (context_2 !== undefined) {
      let { holdsSafetyAsksCapability } = require("./mcpServe/plainCallAsk.js");
      server.registerCapabilities(holdsSafetyAsksCapability());
      let {
        rendersUnderSessionRulesCapability,
      } = require("../services/remoteTools/sessionRulesRendering.js");
      server.registerCapabilities(rendersUnderSessionRulesCapability());
    }
    let { interfaceVersionCapability } = require("./mcp/toolHostInterface.js");
    server.registerCapabilities(interfaceVersionCapability());
  }
  let currentSession = null;
  let describeTools = () => {
    if (currentSession === null) return;
    let joined = getTools().map((tool) => tool.name).join(`
`);
    if (joined === currentSession) return;
    let sessionSnapshot = currentSession;
    currentSession = joined;
    server.sendToolListChanged().catch((error) => {
      if (currentSession === joined) currentSession = sessionSnapshot;
      logForDebugging(`mcp serve: tools/list_changed not sent: ${errorMessage(error)}`);
    });
  };
  let shuttingDown = false;
  let tools = onPolicyVerdictChanged(() => {
    queueMicrotask(() => {
      if (shuttingDown) return;
      try {
        describeTools();
      } catch (error) {
        logForDebugging(`mcp serve: tool re-list on policy verdict failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    });
  });
  let tell = () => server.sendToolListChanged();
  server.oninitialized = () => {
    setHeartbeatProgress(host.host, tell);
  };
  server.onclose = () => {
    clearHeartbeatProgress(host.host, tell);
    shuttingDown = true;
    tools();
    toolPermissionContext.abort(userAbortReason("shutdown"));
  };
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    await serveToolsProvider;
    let serveModeToolset = await buildServeModeToolset(transportKind, {
      agentDefinitions,
    });
    currentSession = serveModeToolset.map((tool) => tool.name).join(`
`);
    return {
      tools: serveModeToolset,
    };
  });
  let cpuCallHooks = {
    session: host,
    run: (fn) => fn(),
    bind: (value) => value,
    [Symbol.dispose]: () => {},
  };
  function makeContext(signal, tools, session) {
    let childAbortController = createChildAbortController(toolPermissionContext);
    let abortChild = () => childAbortController.abort(userAbortReason("remote-cancel"));
    if (signal.aborted) abortChild();
    else
      signal.addEventListener("abort", abortChild, {
        once: true,
      });
    let toolState = new ReadonlyMapView(registry);
    let server;
    let startServing = () => {
      server ??= {
        ...serveModeDefaultAppState(),
        ...(toolHostState.kind === "parsed" && {
          toolPermissionContext: toolHostState.context,
        }),
      };
      if (!isHttp) return server;
      return {
        ...server,
        toolPermissionContext: addSessionWorkingDirectories(server.toolPermissionContext),
      };
    };
    return {
      toolUseContext: {
        abortController: childAbortController,
        messageQueue: commandQueueManager(),
        session,
        agentContext: {
          agentType: "main",
          agentId: makeSaltedName(),
        },
        options: {
          commands: [],
          tools,
          toolCatalog: TOOL_CATALOG,
          mainLoopModel: getMainLoopModel(),
          thinkingConfig: {
            type: "disabled",
            mechanical: true,
          },
          mcpClients: [],
          mcpResources: {},
          isNonInteractiveSession: true,
          runQuery: query,
          debug,
          verbose,
          agentDefinitions,
        },
        getAppState: startServing,
        setAppState: () => {},
        markPrResolvedThisSession: () => {},
        isUltrareviewOverageConfirmed: () => false,
        markUltrareviewOverageConfirmed: () => {},
        getAdvisorSetting: () => startServing().advisorModel,
        getMcp: () => startServing().mcp,
        getProactivityLevel: () => startServing().proactivityLevel,
        getWebBrowser: () => startServing().webBrowser,
        setToolPermissionContext: () => {},
        setSessionToolPermissionContext: () => {},
        taskRegistry: UNLIMITED_RATE_LIMITER,
        queuedNotificationsRegistry: NOOP_NOTIFICATION_DRAIN,
        sessionHooksRegistry: NOOP_FUNCTION_HOOK_REGISTRY,
        setWebBrowserSlice: () => {},
        setArtifactReadVersion: () => {},
        getArtifactReadObservation: artifactReadObservationIn(startServing),
        artifactRegistries: createEmptyArtifactSessionStores(),
        setArtifactContractTarget: () => {},
        getArtifactContractTarget: () => ({
          targetSlug: undefined,
          pins: {},
        }),
        enqueuePendingMemoryUpdate: () => {},
        agentLifecycle: NOOP_AGENT_NAME_REGISTRY,
        teammateColors: NO_OP_COLOR_ASSIGNER,
        rootToolSurface: {
          tools,
          mainLoopModel: getMainLoopModel(),
        },
        messages: [],
        turnStartIndex: 0,
        readFileState,
        dedupUnchangedReads: false,
        toolState,
        toolDecisions: new Map(),
        permissionRelays: NO_BRIDGE_CONSENT,
        getFileHistoryState: () => {
          return;
        },
        applyFileHistoryOp: () => {},
        applyAttributionOp: () => {},
        storageV5: context,
        credentials: readFileStateCache,
      },
      toolState,
    };
  }
  stampRepoHooksMeta(
    server,
    CallToolRequestSchema,
    isHttp,
    async (
      { params: { name, arguments: args, _meta } },
      { signal, sendNotification, authInfo, requestId },
    ) => {
      let { transport } = server;
      using servingCallScope = isHttp ? require("./mcpServe/cpuReport.js").servingCall(host.host) : undefined;
      let needsPermission = (withPermissionReport) =>
        isHttp
          ? require("./mcpServe/cpuReport.js").withCpuReport(withPermissionReport, host.host, _meta)
          : withPermissionReport;
      let sessionHandle =
        isHttp && transport !== undefined && setMcpServeSession(host.host, _meta?.[ANTHROPIC_SESSION]);
      let getCurrentSession = () => {
        if (transport !== undefined && hasCloseSseStream(transport)) transport.closeSSEStream(requestId);
      };
      if (signal.aborted) getCurrentSession();
      else
        signal.addEventListener("abort", getCurrentSession, {
          once: true,
        });
      await serveToolsProvider;
      if (isHttp) {
        let { refuseCallerInterface } = require("./mcp/toolHostInterface.js");
        let { bringsToolHostPermissionRequest } = require("./mcpServe/toolOutputRequest.js");
        let interfaceRefusal = bringsToolHostPermissionRequest(_meta)
          ? undefined
          : refuseCallerInterface(name, _meta);
        if (interfaceRefusal !== undefined) return interfaceRefusal;
      }
      if (toolHostState.kind === "unreadable") {
        let unreadableSettingsMessage = `${name} was not run: this server could not read its launch settings (CLAUDE_CODE_MCP_SERVE_SETTINGS), so it runs nothing.`;
        logForDebugging(`MCP server: ${unreadableSettingsMessage}`, {
          level: "error",
        });
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: unreadableSettingsMessage,
            },
          ],
        };
      }
      if (isHttp && transport !== undefined) {
        let { takeSessionEndHooks } = require("./mcp/takeSessionEndHooks.lazy.js");
        takeSessionEndHooks(_meta?.[ANTHROPIC_SESSIONENDHOOKS], {
          session: host,
          storageV5: context,
          credentials: readFileStateCache,
        });
      }
      if (
        isHttp &&
        name !== (await import("../services/mcpServe/runMonitorCommand.js")).RUN_MONITOR_COMMAND_CALL
      ) {
        let { bringsToolHostPermissionRequest, refusedResult } = require("./mcpServe/toolOutputRequest.js");
        if (bringsToolHostPermissionRequest(_meta)) {
          let { handleToolHostPermissionRequest } = await import("./mcpServe/checkMonitorRun.lazy.js");
          let permissionReply = await handleToolHostPermissionRequest({
            name,
            args,
            meta: _meta,
            servedTools: getTools,
            launchPermissionContext: context_2,
            newCall: () => {
              let toolUseContext = makeContext(
                SERVE_MODE_KEYS.has(name) ? combineWithCallerGoneSignal(signal, authInfo) : signal,
                getTools(),
                host,
              );
              return {
                toolUseContext: toolUseContext.toolUseContext,
                release: () => noop(toolUseContext.toolState),
              };
            },
            startHeartbeat: () => startProgressHeartbeat(_meta?.progressToken, sendNotification),
            callerLogsSharedEvents: sessionHandle,
          });
          return needsPermission(
            permissionReply ??
              refusedResult({
                code: "unsupported_protocol",
                message: `${name} was not run: this server gave no answer to the permission request sent with it. Retrying won't help.`,
              }),
          );
        }
      }
      let denyRules = args?.deny_rules;
      using callsScope =
        context_2 === undefined && !(Array.isArray(denyRules) && denyRules.length > 0)
          ? cpuCallHooks
          : (await import("../services/mcpServe/ownCallDirectory.lazy.js")).ownCallDirectory(host, signal);
      if (isHttp) {
        let { countedUnlessRepeated, SERVED_FILE_CALLS } =
          await import("../services/mcpServe/SERVED_FILE_CALLS.lazy.js");
        let fileCall = SERVED_FILE_CALLS.get(name);
        if (fileCall) {
          using progressHeartbeat = startProgressHeartbeat(_meta?.progressToken, sendNotification);
          let handled;
          let callerGoneSignal = authInfo?.extra?.[CALLER_GONE_SIGNAL];
          try {
            let { summary, output } = await countedUnlessRepeated(
              name,
              callsScope.bind(() =>
                fileCall(args, signal, {
                  tellToolListChanged: tell,
                  toolUseContext: () =>
                    (handled ??= makeContext(signal, getTools(), callsScope.session)).toolUseContext,
                  session: callsScope.session,
                  launchPermissionContext: context_2,
                  workspaceRoot,
                  ...(sessionHandle && {
                    callerLogsSharedEvents: true,
                  }),
                  reportProgress: progressHeartbeat.report,
                  callerGone: callerGoneSignal instanceof AbortSignal ? callerGoneSignal : undefined,
                  meta: _meta,
                  checkAsServedTool: async (toolName, input, extra) => {
                    let toolByName = findToolByName(getTools(), toolName);
                    if (!toolByName?.isEnabled())
                      return {
                        rejection: `${name} was not run: this server does not serve ${toolName}.`,
                      };
                    let tool = safeParseToolInput(toolByName, input);
                    if (!tool.success)
                      return {
                        rejection: `${name} was not run: its input is not valid for ${toolName}: ${tool.error.message}`,
                      };
                    let { toolUseContext } = (handled ??= makeContext(
                      signal,
                      getTools(),
                      callsScope.session,
                    ));
                    let validationResult = await toolByName.validateInput?.(tool.data, toolUseContext);
                    if (validationResult && !validationResult.result)
                      return {
                        rejection: `${name} was not run: ${toolName} refused its input: ${validationResult.message}`,
                      };
                    let toolContext = context_2 && addSessionWorkingDirectories(context_2);
                    let toolContextWithDenyRules =
                      extra.length === 0
                        ? toolContext
                        : (await import("./takeLaunchSettings.lazy.js")).withDenyRulesOfOneCall(
                            toolContext,
                            extra,
                          );
                    if (extra.length > 0 && toolContextWithDenyRules === undefined)
                      return {
                        rejection: `${name} was not run: one of the deny rules sent with it could not be read. Retrying won't help.`,
                      };
                    let { checkPlainCall } = await import("./mcpServe/toolOutputRequest.js");
                    return checkPlainCall(
                      toolByName,
                      tool.data,
                      toolUseContext,
                      toolContextWithDenyRules,
                      _meta,
                    );
                  },
                }),
              ),
            );
            let { encodeServedOutput } = await import("../remote/tools/serve/servedOutput.js");
            return needsPermission(callsScope.run(() => encodeServedOutput(summary, output)));
          } catch (error) {
            let { ServedCallError } = await import("../services/mcpServe/servedCallError.js");
            return needsPermission({
              isError: true,
              content: [
                {
                  type: "text",
                  text: errorMessage(error),
                },
              ],
              ...(error instanceof ServedCallError &&
                error.meta !== undefined && {
                  _meta: error.meta,
                }),
            });
          } finally {
            if (handled) noop(handled.toolState);
          }
        }
      }
      let servedTools = getTools();
      let usesServeModeKeys = isHttp && SERVE_MODE_KEYS.has(name);
      let callerLogsSharedEvents = sessionHandle;
      if (isHttp && !usesServeModeKeys) {
        let { answerToolOutputRequest } = await import("./mcpServe/toolOutputRequest.js");
        let outputRequestAnswer = await callsScope.run(() =>
          answerToolOutputRequest({
            name,
            args,
            meta: _meta,
            tools: servedTools,
            launchPermissionContext: context_2,
            newCall: () => {
              let callContext = makeContext(signal, servedTools, callsScope.session);
              return {
                toolUseContext: callContext.toolUseContext,
                release: () => noop(callContext.toolState),
              };
            },
            startHeartbeat: () => startProgressHeartbeat(_meta?.progressToken, sendNotification),
          }),
        );
        if (outputRequestAnswer !== undefined) return outputRequestAnswer;
      }
      let tool = usesServeModeKeys ? findTool(getAllBaseTools(), name) : findTool(servedTools, name);
      if (!tool) throw Error(`Tool ${name} not found`);
      let { toolUseContext, toolState } = makeContext(
        usesServeModeKeys ? combineWithCallerGoneSignal(signal, authInfo) : signal,
        servedTools,
        callsScope.session,
      );
      try {
        if (!tool.isEnabled()) {
          let notEnabledMessage = `Tool ${name} is not enabled`;
          logForDebugging(`MCP server: ${notEnabledMessage}`, {
            level: "error",
          });
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: notEnabledMessage,
              },
            ],
          };
        }
        let toolArgs = {
          ...(args ?? {}),
        };
        let strippedValueKeys = isHttp ? SERVE_MODE_VALUE.filter((key) => key in toolArgs) : [];
        let parsedInput = isHttp ? parseServeModeInput(tool, toolArgs) : safeParseToolInput(tool, toolArgs);
        if (!parsedInput.success) {
          let invalidArgsMessage = `Tool ${name} arguments failed schema validation: ${parsedInput.error.message}`;
          logForDebugging(`MCP server: ${invalidArgsMessage}`, {
            level: "error",
          });
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: invalidArgsMessage,
              },
            ],
          };
        }
        let validation = await callsScope.run(() => tool.validateInput?.(parsedInput.data, toolUseContext));
        if (validation && !validation.result) {
          let invalidInputMessage = `Tool ${name} input is invalid: ${validation.message}`;
          logForDebugging(`MCP server: ${invalidInputMessage}`, {
            level: "error",
          });
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: invalidInputMessage,
              },
            ],
          };
        }
        let asksForEditResult = false;
        if (isHttp && mode === "rendered") {
          let { asksForEditResult: asksForEditResult_2 } = await import("./mcpServe/editResult.js");
          asksForEditResult = asksForEditResult_2(tool.name, _meta);
        }
        let plainCallCheck = await callsScope.run(async () =>
          (await import("./mcpServe/toolOutputRequest.js")).checkPlainCall(
            tool,
            parsedInput.data,
            toolUseContext,
            isHttp && context_2 !== undefined ? addSessionWorkingDirectories(context_2) : context_2,
            _meta,
          ),
        );
        if ("rejection" in plainCallCheck) {
          logForDebugging(`MCP server: ${plainCallCheck.rejection}`, {
            level: "error",
          });
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: plainCallCheck.rejection,
              },
            ],
            ...(plainCallCheck.meta !== undefined && {
              _meta: plainCallCheck.meta,
            }),
          };
        }
        using progressHeartbeat = startProgressHeartbeat(_meta?.progressToken, sendNotification);
        let callResult = await callsScope.run(() =>
          tool.call(
            parsedInput.data,
            {
              ...plainCallCheck.toolUseContext,
              permissionPhase: plainCallCheck.toolUseContext.permissionPhase ?? {},
            },
            hasPermissionsToUseTool,
            createAssistantMessage({
              content: [],
            }),
            undefined,
            mode === "raw"
              ? {
                  gitDiffRead: true,
                }
              : asksForEditResult
                ? {
                    smallResultAsked: true,
                  }
                : undefined,
          ),
        );
        let toolResult;
        let resultTooLarge = false;
        if (usesServeModeKeys) {
          let { encodeUnlistedToolResult } = await import("../remote/tools/serve/servedOutput.js");
          toolResult = callsScope.run(() => encodeUnlistedToolResult(tool, callResult));
        } else if (mode === "rendered") {
          let { renderToolResultForMCP, withinAnswerLimit } =
            await import("../services/mcpServe/renderToolResult.js");
          let { answer, tooLarge } = withinAnswerLimit(
            tool,
            await callsScope.run(() => renderToolResultForMCP(tool, callResult, toolUseContext)),
          );
          toolResult = asksForEditResult
            ? await (await import("./mcpServe/editResult.js")).withEditResult(answer, callResult)
            : answer;
          resultTooLarge = tooLarge;
        }
        if (toolResult === undefined) {
          let resultData = callResult.data;
          let annotatedResultData =
            typeof resultData === "object" &&
            resultData !== null &&
            "backgroundTaskId" in resultData &&
            typeof resultData.backgroundTaskId === "string"
              ? {
                  ...resultData,
                  backgroundOutputPath: getTaskOutputPath(resultData.backgroundTaskId),
                }
              : resultData;
          toolResult = {
            content: [
              {
                type: "text",
                text: jsonStringify(annotatedResultData),
              },
            ],
          };
        }
        if (strippedValueKeys.length > 0) {
          let strippedFieldsNote = strippedPrivilegeFieldsNote(strippedValueKeys);
          let last = toolResult.content.at(-1);
          if (last?.type === "text")
            last.text += `
${strippedFieldsNote}`;
          else
            toolResult.content.push({
              type: "text",
              text: strippedFieldsNote,
            });
        }
        if (!callerLogsSharedEvents)
          if (resultTooLarge) logFeatureSad(toolFeatureName(tool.name), "result_too_large");
          else logFeatureOk(toolFeatureName(tool.name));
        return needsPermission(toolResult);
      } catch (error) {
        let errorText =
          (error instanceof Error ? getErrorParts(error) : [String(error)])
            .filter(Boolean)
            .join(
              `
`,
            )
            .trim() || "Error";
        if (isAbortOrCancelError(error)) logForDebugging(`MCP server tool call '${name}' aborted`);
        else {
          let { code, isSad } = classifyToolErrorCode(error);
          if (isSad) {
            logForDebugging(`MCP server tool call '${name}' failed: ${errorText}`, {
              level: "error",
            });
            if (!callerLogsSharedEvents) logFeatureSad(toolFeatureName(tool.name), code);
          } else {
            let error_2 = toError(error);
            logError(
              "telemetryMessage" in error_2
                ? error_2
                : withTelemetryMessage(error_2, `mcp server tool '${tool.name}' threw`),
            );
            logFeatureBad(toolFeatureName(tool.name), code);
          }
        }
        return needsPermission({
          isError: true,
          content: [
            {
              type: "text",
              text: errorText,
            },
          ],
        });
      } finally {
        noop(toolState);
      }
    },
  );
  return server;
}
//@ chunk-hjesqqfw.js:13829-13845 placement
function noop(toolState) {}
export { CALLER_GONE_SIGNAL, createMCPServer, readMcpServeSettings, buildDenyRulesContext, startMCPServer };
