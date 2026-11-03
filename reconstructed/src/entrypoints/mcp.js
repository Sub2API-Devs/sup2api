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
import {
  createEmptyArtifactSessionStores,
  NO_OP_COLOR_ASSIGNER,
  Jce,
} from "../services/artifacts/artifactReadConsent.js";
import { NOOP_AGENT_NAME_REGISTRY } from "../utils/agentNameRegistry.js";
import { combineWithCallerGoneSignal } from "../services/mcp/xaa.js";
import { findToolByName, safeParseToolInput, getEmptyToolPermissionContext } from "../Tool.js";
import { findTool } from "../services/api/deferredToolsState.js";
import {
  hasPermissionsToUseTool,
  applyPermissionRulesToPermissionContext,
  collectRulesFromSettings,
} from "../utils/permissions/permissions.js";
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
import { array, string, zodStrictObject } from "../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { toolServerEnvAccessor } from "../utils/subprocessEnvLoader.js";
import { safeParseJSON } from "../utils/json.js";
import { hasProtoKeys } from "../utils/objectSafety.js";
import { uniq, count } from "../utils/collections.js";
import { antBuiltinDenyRules } from "../utils/permissions/permissionSetup.js";
import { classifyRuleParens } from "../utils/permissions/permissionRuleParser.js";
import { PATH_RULE_CARVE_OUT_RE } from "../utils/settings/permissionRuleCarveOut.js";
import { splitRuleList } from "../utils/permissions/disallowedToolsFlag.js";

//@ chunk-hjesqqfw.js:3042-3211 placement = createComputerUseMcpServerForCli (0.323)
/**
 * （误归 computerUse/mcpServer）包装 MCP 请求处理器：请求 _meta 带 repo hooks stamp 标记时，在结果 _meta 中附加 stamp。
 */
function stampRepoHooksMeta(server, S, o, a) {
  server.setRequestHandler(S, async (p, P) => {
    let v = await a(p, P);
    if (!o || p.params._meta?.[CLAUDECODE_REPOHOOKSSTAMP] !== "1") return v;
    return {
      ...v,
      _meta: {
        ...v._meta,
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
async function startMCPServer(s, debug, verbose, a, p, P) {
  setCwd(s);
  let mcpServer = createMCPServer(debug, verbose, getRootSession(), "stdio", a, p, P);
  let R = new BufferedStdioServerTransport();
  await mcpServer.connect(R);
  registerCleanup(() => mcpServer.close());
}
//@ chunk-hjesqqfw.js:3392-3478 placement
class ReadonlyMapView extends InstanceRegistry {
  #e;
  constructor(s) {
    super();
    this.#e = s;
  }
  get(s) {
    return this.#e.get(s);
  }
}
//@ chunk-hjesqqfw.js:3478-13829 placement = startMCPServer (0.2)
/**
 * claude mcp serve：把 Claude Code 自身的工具作为 MCP 服务器暴露（stdio 或 http），禁用后台代理等不适用功能。
 */
function createMCPServer(
  debug,
  verbose,
  o,
  a,
  p,
  P = "raw",
  v = {
    kind: "absent",
  },
  workspaceRoot,
) {
  let context = v.kind === "parsed" ? v.context : undefined;
  let readFileStateCache = credentialsStoreFor(p);
  let c = a === "http";
  setMcpServeSession(o.host, EMPTY_SESSION_NAME);
  let hostAgentPolicy = getHostAgentPolicy();
  hostAgentPolicy.disableBackgroundAgentLaunch();
  hostAgentPolicy.disableRemoteAgentIsolation();
  hostAgentPolicy.disableBackgroundDeadline();
  hostAgentPolicy.disableForkSubagent();
  if (c) restrictHostAgentPolicy(getHostAgentPolicy());
  else hostAgentPolicy.disableBackgroundCompletionNotice();
  setDynamicSkillState(createDynamicSkillState());
  refreshSkillsSyncVeto();
  if (getSkillsSyncVetoed()) pruneSkillsSyncRoot(p).catch(logError);
  refreshSyncVeto();
  if (getPluginsSyncVetoed()) pruneSyncedPluginsForClosedGate().catch(logError);
  let readFileState = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE, undefined, c);
  let ke = new InstanceRegistry();
  let agentDefinitions = {
    activeAgents: [],
    allAgents: [],
  };
  let pe = c
    ? Promise.resolve()
    : getAgentDefinitionsWithOverrides(getCwd(), p)
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
  let U = () => serveModeTools(c);
  if (c) {
    let { toolOutputServerCapabilities } = require("./chunk-qz0jvaqd.js");
    let T = toolOutputServerCapabilities(U, context);
    if (T !== undefined) {
      server.registerCapabilities(T);
      if (!isBackgroundTasksDisabled()) {
        let { backgroundCommands, keepsBackgroundCommandsCapability } = require("./chunk-7x01fnct.js");
        server.registerCapabilities(keepsBackgroundCommandsCapability(backgroundCommands.of(o.host).life));
      }
    }
    if (context !== undefined) {
      let { holdsSafetyAsksCapability } = require("./chunk-cm8zvdsh.js");
      server.registerCapabilities(holdsSafetyAsksCapability());
      let { rendersUnderSessionRulesCapability } = require("./chunk-2xdjj3my.js");
      server.registerCapabilities(rendersUnderSessionRulesCapability());
    }
    let { interfaceVersionCapability } = require("./chunk-z4xxgvts.js");
    server.registerCapabilities(interfaceVersionCapability());
  }
  let F = null;
  let we = () => {
    if (F === null) return;
    let joined = U().map((i) => i.name).join(`
`);
    if (joined === F) return;
    let T = F;
    F = joined;
    server.sendToolListChanged().catch((error) => {
      if (F === joined) F = T;
      logForDebugging(`mcp serve: tools/list_changed not sent: ${errorMessage(error)}`);
    });
  };
  let ue = false;
  let tools = onPolicyVerdictChanged(() => {
    queueMicrotask(() => {
      if (ue) return;
      try {
        we();
      } catch (error) {
        logForDebugging(`mcp serve: tool re-list on policy verdict failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    });
  });
  let tell = () => server.sendToolListChanged();
  server.oninitialized = () => {
    setHeartbeatProgress(o.host, tell);
  };
  server.onclose = () => {
    clearHeartbeatProgress(o.host, tell);
    ue = true;
    tools();
    toolPermissionContext.abort(userAbortReason("shutdown"));
  };
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    await pe;
    let serveModeToolset = await buildServeModeToolset(a, {
      agentDefinitions,
    });
    F = serveModeToolset.map((tool) => tool.name).join(`
`);
    return {
      tools: serveModeToolset,
    };
  });
  let Ae = {
    session: o,
    run: (e) => e(),
    bind: (e) => e,
    [Symbol.dispose]: () => {},
  };
  function X(signal, tools, session) {
    let childAbortController = createChildAbortController(toolPermissionContext);
    let M = () => childAbortController.abort(userAbortReason("remote-cancel"));
    if (signal.aborted) M();
    else
      signal.addEventListener("abort", M, {
        once: true,
      });
    let toolState = new ReadonlyMapView(ke);
    let K;
    let O = () => {
      K ??= {
        ...serveModeDefaultAppState(),
        ...(v.kind === "parsed" && {
          toolPermissionContext: v.context,
        }),
      };
      if (!c) return K;
      return {
        ...K,
        toolPermissionContext: addSessionWorkingDirectories(K.toolPermissionContext),
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
        getAppState: O,
        setAppState: () => {},
        markPrResolvedThisSession: () => {},
        isUltrareviewOverageConfirmed: () => false,
        markUltrareviewOverageConfirmed: () => {},
        getAdvisorSetting: () => O().advisorModel,
        getMcp: () => O().mcp,
        getProactivityLevel: () => O().proactivityLevel,
        getWebBrowser: () => O().webBrowser,
        setToolPermissionContext: () => {},
        setSessionToolPermissionContext: () => {},
        taskRegistry: UNLIMITED_RATE_LIMITER,
        queuedNotificationsRegistry: NOOP_NOTIFICATION_DRAIN,
        sessionHooksRegistry: NOOP_FUNCTION_HOOK_REGISTRY,
        setWebBrowserSlice: () => {},
        setArtifactReadVersion: () => {},
        getArtifactReadObservation: artifactReadObservationIn(O),
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
        permissionRelays: Jce,
        getFileHistoryState: () => {
          return;
        },
        applyFileHistoryOp: () => {},
        applyAttributionOp: () => {},
        storageV5: p,
        credentials: readFileStateCache,
      },
      toolState,
    };
  }
  stampRepoHooksMeta(
    server,
    CallToolRequestSchema,
    c,
    async ({ params: { name, arguments: T, _meta } }, { signal, sendNotification, authInfo, requestId }) => {
      let { transport } = server;
      using Oe = c ? require("./chunk-hf6cwsbj.js").servingCall(o.host) : undefined;
      let Z = (n) => (c ? require("./chunk-hf6cwsbj.js").withCpuReport(n, o.host, _meta) : n);
      let ne = c && transport !== undefined && setMcpServeSession(o.host, _meta?.[ANTHROPIC_SESSION]);
      let me = () => {
        if (transport !== undefined && hasCloseSseStream(transport)) transport.closeSSEStream(requestId);
      };
      if (signal.aborted) me();
      else
        signal.addEventListener("abort", me, {
          once: true,
        });
      await pe;
      if (c) {
        let { refuseCallerInterface } = require("./chunk-z4xxgvts.js");
        let { bringsToolHostPermissionRequest } = require("./chunk-qz0jvaqd.js");
        let u = bringsToolHostPermissionRequest(_meta) ? undefined : refuseCallerInterface(name, _meta);
        if (u !== undefined) return u;
      }
      if (v.kind === "unreadable") {
        let n = `${name} was not run: this server could not read its launch settings (CLAUDE_CODE_MCP_SERVE_SETTINGS), so it runs nothing.`;
        logForDebugging(`MCP server: ${n}`, {
          level: "error",
        });
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: n,
            },
          ],
        };
      }
      if (c && transport !== undefined) {
        let { takeSessionEndHooks } = require("./chunk-877zq7yv.js");
        takeSessionEndHooks(_meta?.[ANTHROPIC_SESSIONENDHOOKS], {
          session: o,
          storageV5: p,
          credentials: readFileStateCache,
        });
      }
      if (c && name !== (await import("./chunk-cn4ncm7w.js")).RUN_MONITOR_COMMAND_CALL) {
        let { bringsToolHostPermissionRequest, refusedResult } = require("./chunk-qz0jvaqd.js");
        if (bringsToolHostPermissionRequest(_meta)) {
          let { handleToolHostPermissionRequest } = await import("./chunk-dz36xfxg.js");
          let H = await handleToolHostPermissionRequest({
            name,
            args: T,
            meta: _meta,
            servedTools: U,
            launchPermissionContext: context,
            newCall: () => {
              let A = X(
                SERVE_MODE_KEYS.has(name) ? combineWithCallerGoneSignal(signal, authInfo) : signal,
                U(),
                o,
              );
              return {
                toolUseContext: A.toolUseContext,
                release: () => noop(A.toolState),
              };
            },
            startHeartbeat: () => startProgressHeartbeat(_meta?.progressToken, sendNotification),
            callerLogsSharedEvents: ne,
          });
          return Z(
            H ??
              refusedResult({
                code: "unsupported_protocol",
                message: `${name} was not run: this server gave no answer to the permission request sent with it. Retrying won't help.`,
              }),
          );
        }
      }
      let denyRules = T?.deny_rules;
      using x =
        context === undefined && !(Array.isArray(denyRules) && denyRules.length > 0)
          ? Ae
          : (await import("./chunk-1mqwyc6a.js")).ownCallDirectory(o, signal);
      if (c) {
        let { countedUnlessRepeated, SERVED_FILE_CALLS } = await import("./chunk-wy9dbk5f.js");
        let u = SERVED_FILE_CALLS.get(name);
        if (u) {
          using progressHeartbeat = startProgressHeartbeat(_meta?.progressToken, sendNotification);
          let A;
          let h = authInfo?.extra?.[CALLER_GONE_SIGNAL];
          try {
            let { summary, output } = await countedUnlessRepeated(
              name,
              x.bind(() =>
                u(T, signal, {
                  tellToolListChanged: tell,
                  toolUseContext: () => (A ??= X(signal, U(), x.session)).toolUseContext,
                  session: x.session,
                  launchPermissionContext: context,
                  workspaceRoot,
                  ...(ne && {
                    callerLogsSharedEvents: true,
                  }),
                  reportProgress: progressHeartbeat.report,
                  callerGone: h instanceof AbortSignal ? h : undefined,
                  meta: _meta,
                  checkAsServedTool: async (V, r, I) => {
                    let toolByName = findToolByName(U(), V);
                    if (!toolByName?.isEnabled())
                      return {
                        rejection: `${name} was not run: this server does not serve ${V}.`,
                      };
                    let tool = safeParseToolInput(toolByName, r);
                    if (!tool.success)
                      return {
                        rejection: `${name} was not run: its input is not valid for ${V}: ${tool.error.message}`,
                      };
                    let { toolUseContext } = (A ??= X(signal, U(), x.session));
                    let validationResult = await toolByName.validateInput?.(tool.data, toolUseContext);
                    if (validationResult && !validationResult.result)
                      return {
                        rejection: `${name} was not run: ${V} refused its input: ${validationResult.message}`,
                      };
                    let Ce = context && addSessionWorkingDirectories(context);
                    let ve =
                      I.length === 0
                        ? Ce
                        : (await import("./chunk-87nrc1a5.js")).withDenyRulesOfOneCall(Ce, I);
                    if (I.length > 0 && ve === undefined)
                      return {
                        rejection: `${name} was not run: one of the deny rules sent with it could not be read. Retrying won't help.`,
                      };
                    let { checkPlainCall } = await import("./chunk-qz0jvaqd.js");
                    return checkPlainCall(toolByName, tool.data, toolUseContext, ve, _meta);
                  },
                }),
              ),
            );
            let { encodeServedOutput } = await import("./chunk-p0m1s550.js");
            return Z(x.run(() => encodeServedOutput(summary, output)));
          } catch (error) {
            let { ServedCallError } = await import("./chunk-eg665tkd.js");
            return Z({
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
            if (A) noop(A.toolState);
          }
        }
      }
      let ee = U();
      let te = c && SERVE_MODE_KEYS.has(name);
      let ge = ne;
      if (c && !te) {
        let { answerToolOutputRequest } = await import("./chunk-qz0jvaqd.js");
        let L = await x.run(() =>
          answerToolOutputRequest({
            name,
            args: T,
            meta: _meta,
            tools: ee,
            launchPermissionContext: context,
            newCall: () => {
              let u = X(signal, ee, x.session);
              return {
                toolUseContext: u.toolUseContext,
                release: () => noop(u.toolState),
              };
            },
            startHeartbeat: () => startProgressHeartbeat(_meta?.progressToken, sendNotification),
          }),
        );
        if (L !== undefined) return L;
      }
      let y = te ? findTool(getAllBaseTools(), name) : findTool(ee, name);
      if (!y) throw Error(`Tool ${name} not found`);
      let { toolUseContext, toolState } = X(
        te ? combineWithCallerGoneSignal(signal, authInfo) : signal,
        ee,
        x.session,
      );
      try {
        if (!y.isEnabled()) {
          let r = `Tool ${name} is not enabled`;
          logForDebugging(`MCP server: ${r}`, {
            level: "error",
          });
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: r,
              },
            ],
          };
        }
        let n = {
          ...(T ?? {}),
        };
        let L = c ? SERVE_MODE_VALUE.filter((r) => r in n) : [];
        let u = c ? parseServeModeInput(y, n) : safeParseToolInput(y, n);
        if (!u.success) {
          let r = `Tool ${name} arguments failed schema validation: ${u.error.message}`;
          logForDebugging(`MCP server: ${r}`, {
            level: "error",
          });
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: r,
              },
            ],
          };
        }
        let H = await x.run(() => y.validateInput?.(u.data, toolUseContext));
        if (H && !H.result) {
          let r = `Tool ${name} input is invalid: ${H.message}`;
          logForDebugging(`MCP server: ${r}`, {
            level: "error",
          });
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: r,
              },
            ],
          };
        }
        let A = false;
        if (c && P === "rendered") {
          let { asksForEditResult } = await import("./chunk-ww9sdeb2.js");
          A = asksForEditResult(y.name, _meta);
        }
        let h = await x.run(async () =>
          (await import("./chunk-qz0jvaqd.js")).checkPlainCall(
            y,
            u.data,
            toolUseContext,
            c && context !== undefined ? addSessionWorkingDirectories(context) : context,
            _meta,
          ),
        );
        if ("rejection" in h) {
          logForDebugging(`MCP server: ${h.rejection}`, {
            level: "error",
          });
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: h.rejection,
              },
            ],
            ...(h.meta !== undefined && {
              _meta: h.meta,
            }),
          };
        }
        using progressHeartbeat = startProgressHeartbeat(_meta?.progressToken, sendNotification);
        let D = await x.run(() =>
          y.call(
            u.data,
            {
              ...h.toolUseContext,
              permissionPhase: h.toolUseContext.permissionPhase ?? {},
            },
            hasPermissionsToUseTool,
            createAssistantMessage({
              content: [],
            }),
            undefined,
            P === "raw"
              ? {
                  gitDiffRead: true,
                }
              : A
                ? {
                    smallResultAsked: true,
                  }
                : undefined,
          ),
        );
        let j;
        let V = false;
        if (te) {
          let { encodeUnlistedToolResult } = await import("./chunk-p0m1s550.js");
          j = x.run(() => encodeUnlistedToolResult(y, D));
        } else if (P === "rendered") {
          let { renderToolResultForMCP, withinAnswerLimit } = await import("./chunk-nyz8dmpm.js");
          let { answer, tooLarge } = withinAnswerLimit(
            y,
            await x.run(() => renderToolResultForMCP(y, D, toolUseContext)),
          );
          j = A ? await (await import("./chunk-ww9sdeb2.js")).withEditResult(answer, D) : answer;
          V = tooLarge;
        }
        if (j === undefined) {
          let r = D.data;
          let I =
            typeof r === "object" &&
            r !== null &&
            "backgroundTaskId" in r &&
            typeof r.backgroundTaskId === "string"
              ? {
                  ...r,
                  backgroundOutputPath: getTaskOutputPath(r.backgroundTaskId),
                }
              : r;
          j = {
            content: [
              {
                type: "text",
                text: jsonStringify(I),
              },
            ],
          };
        }
        if (L.length > 0) {
          let r = strippedPrivilegeFieldsNote(L);
          let last = j.content.at(-1);
          if (last?.type === "text")
            last.text += `
${r}`;
          else
            j.content.push({
              type: "text",
              text: r,
            });
        }
        if (!ge)
          if (V) logFeatureSad(toolFeatureName(y.name), "result_too_large");
          else logFeatureOk(toolFeatureName(y.name));
        return Z(j);
      } catch (error) {
        let u =
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
            logForDebugging(`MCP server tool call '${name}' failed: ${u}`, {
              level: "error",
            });
            if (!ge) logFeatureSad(toolFeatureName(y.name), code);
          } else {
            let error_2 = toError(error);
            logError(
              "telemetryMessage" in error_2
                ? error_2
                : withTelemetryMessage(error_2, `mcp server tool '${y.name}' threw`),
            );
            logFeatureBad(toolFeatureName(y.name), code);
          }
        }
        return Z({
          isError: true,
          content: [
            {
              type: "text",
              text: u,
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
//@ chunk-87nrc1a5.js:11934-12043 placement
/**
 * mcp serve 设置的 schema：permissions.allow/deny 字符串列表。
 */
var stringListSchema = () => array(string()).default([]);
var MCP_SERVE_SETTINGS_SCHEMA = DoctorLazy(() =>
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
  let t = safeParseJSON(CLAUDE_CODE_MCP_SERVE_SETTINGS, false);
  let n = MCP_SERVE_SETTINGS_SCHEMA().safeParse(t).data;
  return n === undefined || hasProtoKeys(t)
    ? {
        kind: "unreadable",
      }
    : {
        kind: "parsed",
        ...buildServeDenyContext(n.permissions),
      };
}
//@ chunk-87nrc1a5.js:12296-12411 placement
/**
 * 规则全部合法时把 deny 规则应用到权限上下文（无上下文时附加内置 deny 规则）。
 */
function buildDenyRulesContext(e, t) {
  return t.every(isWellFormedDenyRule)
    ? applyPermissionRulesToPermissionContext(
        e ?? getEmptyToolPermissionContext(),
        collectRulesFromSettings(
          {
            cliArg: e ? [...t] : uniq([...antBuiltinDenyRules(), ...t]),
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
function isWellFormedDenyRule(e) {
  let t = classifyRuleParens(e);
  return !(
    e.startsWith("-") ||
    e.startsWith("(") ||
    PATH_RULE_CARVE_OUT_RE.test(e) ||
    /\p{Cc}/u.test(e) ||
    t.kind === "malformed" ||
    !/^[\w*-]+$/.test(t.kind === "call" ? t.toolName : e) ||
    (t.kind === "call" && !hasBalancedParens(t.rawContent)) ||
    splitRuleList([e])[0] !== e
  );
}
//@ chunk-87nrc1a5.js:12636-12769 placement
/**
 * 括号是否配平（跳过反斜杠转义）。
 */
function hasBalancedParens(rawContent) {
  let t = 0;
  for (let j = 0; j < rawContent.length && t >= 0; j++)
    if (rawContent[j] === "\\") j++;
    else if (rawContent[j] === "(") t++;
    else if (rawContent[j] === ")") t--;
  return t === 0;
}
//@ chunk-87nrc1a5.js:12769-12953 placement
/**
 * 由 deny 规则（加内置规则）生成权限上下文，并统计格式错误的规则数。
 */
function buildServeDenyContext(permissions) {
  let t = uniq([...splitRuleList(permissions.deny), ...antBuiltinDenyRules()]);
  return {
    context: applyPermissionRulesToPermissionContext(
      getEmptyToolPermissionContext(),
      collectRulesFromSettings(
        {
          cliArg: t,
        },
        "deny",
      ),
    ),
    malformedRules: count(
      [...t, ...splitRuleList(permissions.allow)],
      (n) => n.startsWith("-") || classifyRuleParens(n).kind === "malformed",
    ),
  };
}
export { CALLER_GONE_SIGNAL, createMCPServer };
