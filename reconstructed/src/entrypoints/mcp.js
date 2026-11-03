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
  Re,
  Ee,
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
  V8t,
  ANTHROPIC_SESSION,
  ANTHROPIC_SESSIONENDHOOKS,
} from "../services/analytics/metadata.js";
import { getHostAgentPolicy } from "../utils/hostAgentPolicy.js";
import {
  restrictHostAgentPolicy,
  serveModeTools,
  buildServeModeToolset,
  serveModeDefaultAppState,
  Jje,
  Zde,
  parseServeModeInput,
  strippedPrivilegeFieldsNote,
} from "./mcpServe/serveModeInput.js";
import { setDynamicSkillState, createDynamicSkillState } from "../skills/loadSkillsDir.js";
import { eN } from "../utils/claudeAiSync/skillsSync.js";
import { pruneSkillsSyncRoot } from "../services/skillsSync/skillsSync.js";
import { logError } from "../utils/log.js";
import { sJ } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { pruneSyncedPluginsForClosedGate } from "../utils/claudeAiSync/pluginsSync.js";
import { nv, ZC } from "../utils/remoteFileState.js";
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
import { mg } from "../utils/messageQueueManager.js";
import { makeSaltedName } from "../utils/agentId.js";
import { TOOL_CATALOG, getAllBaseTools } from "../tools.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { query } from "../query.js";
import { u2 } from "../tasks/taskLoopRegistry.js";
import { NOOP_NOTIFICATION_DRAIN } from "../services/queuedNotifications/queuedNotifications.js";
import { NOOP_FUNCTION_HOOK_REGISTRY } from "../utils/hooks/functionHookNoop.js";
import { artifactReadObservationIn } from "../services/artifacts/readObservation.js";
import { Uht, Bht, freeze_2 } from "../services/artifacts/artifactReadConsent.js";
import { NOOP_AGENT_NAME_REGISTRY } from "../utils/agentNameRegistry.js";
import { combineWithCallerGoneSignal } from "../services/mcp/xaa.js";
import { findToolByName, safeParseToolInput, getEmptyToolPermissionContext } from "../Tool.js";
import { qS } from "../services/api/deferredToolsState.js";
import {
  hasPermissionsToUseTool,
  applyPermissionRulesToPermissionContext,
  collectRulesFromSettings,
} from "../utils/permissions/permissions.js";
import { createAssistantMessage } from "../utils/messages.js";
import { getTaskOutputPath } from "../utils/task/diskOutput.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { fGt, LKe, classifyToolErrorCode } from "../services/tools/toolExecution.js";
import { getErrorParts } from "../utils/toolErrors.js";
import { A, o, zodStrictObject } from "../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { nk } from "../utils/subprocessEnvLoader.js";
import { safeParseJSON } from "../utils/json.js";
import { hasProtoKeys } from "../utils/objectSafety.js";
import { uniq, count } from "../utils/collections.js";
import { antBuiltinDenyRules } from "../utils/permissions/permissionSetup.js";
import { classifyRuleParens } from "../utils/permissions/permissionRuleParser.js";
import { PATH_RULE_CARVE_OUT_RE } from "../utils/settings/permissionRuleCarveOut.js";
import { splitRuleList } from "../utils/permissions/disallowedToolsFlag.js";

/**
 * （误归 computerUse/mcpServer）包装 MCP 请求处理器：请求 _meta 带 repo hooks stamp 标记时，在结果 _meta 中附加 stamp。
 */
//@ chunk-hjesqqfw.js:3042-3211 placement = createComputerUseMcpServerForCli (0.323)
function stampRepoHooksMeta(s, S, o, a) {
  s.setRequestHandler(S, async (p, P) => {
    let v = await a(p, P);
    if (!o || p.params._meta?.[CLAUDECODE_REPOHOOKSSTAMP] !== "1") return v;
    return { ...v, _meta: { ...v._meta, [CLAUDECODE_REPOHOOKSSTAMP]: await getSettingsFilesStamp() } };
  });
}
//@ chunk-hjesqqfw.js:3211-3253 placement
function je(s) {
  return "closeSSEStream" in s;
}
//@ chunk-hjesqqfw.js:3253-3274 placement
var CALLER_GONE_SIGNAL = "callerGone";
//@ chunk-hjesqqfw.js:3274-3392 placement = getServerCommandArray (0.769)
async function startMCPServer(s, S, o, a, p, P) {
  setCwd(s);
  let v = createMCPServer(S, o, getRootSession(), "stdio", a, p, P),
    R = new BufferedStdioServerTransport();
  (await v.connect(R), registerCleanup(() => v.close()));
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
/**
 * claude mcp serve：把 Claude Code 自身的工具作为 MCP 服务器暴露（stdio 或 http），禁用后台代理等不适用功能。
 */
//@ chunk-hjesqqfw.js:3478-13829 placement = startMCPServer (0.2)
function createMCPServer(s, S, o, a, p, P = "raw", v = { kind: "absent" }, R) {
  let E = v.kind === "parsed" ? v.context : void 0,
    readFileStateCache = credentialsStoreFor(p),
    c = a === "http";
  setMcpServeSession(o.host, V8t);
  let Q = getHostAgentPolicy();
  if (
    (Q.disableBackgroundAgentLaunch(),
    Q.disableRemoteAgentIsolation(),
    Q.disableBackgroundDeadline(),
    Q.disableForkSubagent(),
    c)
  )
    restrictHostAgentPolicy(getHostAgentPolicy());
  else Q.disableBackgroundCompletionNotice();
  if ((setDynamicSkillState(createDynamicSkillState()), eN(), getSkillsSyncVetoed()))
    pruneSkillsSyncRoot(p).catch(logError);
  if ((sJ(), getPluginsSyncVetoed())) pruneSyncedPluginsForClosedGate().catch(logError);
  let be = nv(ZC, void 0, c),
    ke = new InstanceRegistry(),
    re = { activeAgents: [], allAgents: [] },
    pe = c
      ? Promise.resolve()
      : getAgentDefinitionsWithOverrides(getCwd(), p)
          .then((e) => {
            re = rebuildAgentDefinitions(
              e,
              e.allAgents.filter((allAgent) => {
                if (isAgentDefinitionTrusted(allAgent)) return !0;
                return (checkAgentOriginTrust(allAgent, "subagent", "definition"), !1);
              }),
            );
          })
          .catch((e) => {
            logError(e);
          }),
    server = new Server(
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
      { capabilities: { tools: { listChanged: !0 } } },
    ),
    toolPermissionContext = createAbortController(),
    U = () => serveModeTools(c);
  if (c) {
    let { toolOutputServerCapabilities: toolOutputServerCapabilities } = require("./chunk-qz0jvaqd.js"),
      T = toolOutputServerCapabilities(U, E);
    if (T !== void 0) {
      if ((server.registerCapabilities(T), !isBackgroundTasksDisabled())) {
        let {
          backgroundCommands: backgroundCommands,
          keepsBackgroundCommandsCapability: keepsBackgroundCommandsCapability,
        } = require("./chunk-7x01fnct.js");
        server.registerCapabilities(keepsBackgroundCommandsCapability(backgroundCommands.of(o.host).life));
      }
    }
    if (E !== void 0) {
      let { holdsSafetyAsksCapability: holdsSafetyAsksCapability } = require("./chunk-cm8zvdsh.js");
      server.registerCapabilities(holdsSafetyAsksCapability());
      let {
        rendersUnderSessionRulesCapability: rendersUnderSessionRulesCapability,
      } = require("./chunk-2xdjj3my.js");
      server.registerCapabilities(rendersUnderSessionRulesCapability());
    }
    let { interfaceVersionCapability: interfaceVersionCapability } = require("./chunk-z4xxgvts.js");
    server.registerCapabilities(interfaceVersionCapability());
  }
  let F = null,
    we = () => {
      if (F === null) return;
      let joined = U().map((i) => i.name).join(`
`);
      if (joined === F) return;
      let T = F;
      ((F = joined),
        server.sendToolListChanged().catch((i) => {
          if (F === joined) F = T;
          logForDebugging(`mcp serve: tools/list_changed not sent: ${errorMessage(i)}`);
        }));
    },
    ue = !1,
    tools = onPolicyVerdictChanged(() => {
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
    }),
    se = () => server.sendToolListChanged();
  ((server.oninitialized = () => {
    Re(o.host, se);
  }),
    (server.onclose = () => {
      (Ee(o.host, se), (ue = !0), tools(), toolPermissionContext.abort(userAbortReason("shutdown")));
    }),
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      await pe;
      let e = await buildServeModeToolset(a, { agentDefinitions: re });
      return (
        (F = e.map((tool) => tool.name).join(`
`)),
        { tools: e }
      );
    }));
  let Ae = { session: o, run: (e) => e(), bind: (e) => e, [Symbol.dispose]: () => {} };
  function X(e, T, i) {
    let C = createChildAbortController(toolPermissionContext),
      M = () => C.abort(userAbortReason("remote-cancel"));
    if (e.aborted) M();
    else e.addEventListener("abort", M, { once: !0 });
    let Y = new ReadonlyMapView(ke),
      K,
      O = () => {
        if (
          ((K ??= {
            ...serveModeDefaultAppState(),
            ...(v.kind === "parsed" && { toolPermissionContext: v.context }),
          }),
          !c)
        )
          return K;
        return { ...K, toolPermissionContext: addSessionWorkingDirectories(K.toolPermissionContext) };
      };
    return {
      toolUseContext: {
        abortController: C,
        messageQueue: mg(),
        session: i,
        agentContext: { agentType: "main", agentId: makeSaltedName() },
        options: {
          commands: [],
          tools: T,
          toolCatalog: TOOL_CATALOG,
          mainLoopModel: getMainLoopModel(),
          thinkingConfig: { type: "disabled", mechanical: !0 },
          mcpClients: [],
          mcpResources: {},
          isNonInteractiveSession: !0,
          runQuery: query,
          debug: s,
          verbose: S,
          agentDefinitions: re,
        },
        getAppState: O,
        setAppState: () => {},
        markPrResolvedThisSession: () => {},
        isUltrareviewOverageConfirmed: () => !1,
        markUltrareviewOverageConfirmed: () => {},
        getAdvisorSetting: () => O().advisorModel,
        getMcp: () => O().mcp,
        getProactivityLevel: () => O().proactivityLevel,
        getWebBrowser: () => O().webBrowser,
        setToolPermissionContext: () => {},
        setSessionToolPermissionContext: () => {},
        taskRegistry: u2,
        queuedNotificationsRegistry: NOOP_NOTIFICATION_DRAIN,
        sessionHooksRegistry: NOOP_FUNCTION_HOOK_REGISTRY,
        setWebBrowserSlice: () => {},
        setArtifactReadVersion: () => {},
        getArtifactReadObservation: artifactReadObservationIn(O),
        artifactRegistries: Uht(),
        setArtifactContractTarget: () => {},
        getArtifactContractTarget: () => ({ targetSlug: void 0, pins: {} }),
        enqueuePendingMemoryUpdate: () => {},
        agentLifecycle: NOOP_AGENT_NAME_REGISTRY,
        teammateColors: Bht,
        rootToolSurface: { tools: T, mainLoopModel: getMainLoopModel() },
        messages: [],
        turnStartIndex: 0,
        readFileState: be,
        dedupUnchangedReads: !1,
        toolState: Y,
        toolDecisions: new Map(),
        permissionRelays: freeze_2,
        getFileHistoryState: () => {
          return;
        },
        applyFileHistoryOp: () => {},
        applyAttributionOp: () => {},
        storageV5: p,
        credentials: readFileStateCache,
      },
      toolState: Y,
    };
  }
  return (
    stampRepoHooksMeta(
      server,
      CallToolRequestSchema,
      c,
      async (
        { params: { name: name, arguments: T, _meta: _meta } },
        { signal: signal, sendNotification: sendNotification, authInfo: authInfo, requestId: requestId },
      ) => {
        let { transport: transport } = server;
        using Oe = c ? require("./chunk-hf6cwsbj.js").servingCall(o.host) : void 0;
        let Z = (n) => (c ? require("./chunk-hf6cwsbj.js").withCpuReport(n, o.host, _meta) : n),
          ne = c && transport !== void 0 && setMcpServeSession(o.host, _meta?.[ANTHROPIC_SESSION]),
          me = () => {
            if (transport !== void 0 && je(transport)) transport.closeSSEStream(requestId);
          };
        if (signal.aborted) me();
        else signal.addEventListener("abort", me, { once: !0 });
        if ((await pe, c)) {
          let { refuseCallerInterface: refuseCallerInterface } = require("./chunk-z4xxgvts.js"),
            {
              bringsToolHostPermissionRequest: bringsToolHostPermissionRequest,
            } = require("./chunk-qz0jvaqd.js"),
            u = bringsToolHostPermissionRequest(_meta) ? void 0 : refuseCallerInterface(name, _meta);
          if (u !== void 0) return u;
        }
        if (v.kind === "unreadable") {
          let n = `${name} was not run: this server could not read its launch settings (CLAUDE_CODE_MCP_SERVE_SETTINGS), so it runs nothing.`;
          return (
            logForDebugging(`MCP server: ${n}`, { level: "error" }),
            { isError: !0, content: [{ type: "text", text: n }] }
          );
        }
        if (c && transport !== void 0) {
          let { takeSessionEndHooks: takeSessionEndHooks } = require("./chunk-877zq7yv.js");
          takeSessionEndHooks(_meta?.[ANTHROPIC_SESSIONENDHOOKS], {
            session: o,
            storageV5: p,
            credentials: readFileStateCache,
          });
        }
        if (c && name !== (await import("./chunk-cn4ncm7w.js")).RUN_MONITOR_COMMAND_CALL) {
          let {
            bringsToolHostPermissionRequest: bringsToolHostPermissionRequest,
            refusedResult: refusedResult,
          } = require("./chunk-qz0jvaqd.js");
          if (bringsToolHostPermissionRequest(_meta)) {
            let { handleToolHostPermissionRequest: handleToolHostPermissionRequest } =
                await import("./chunk-dz36xfxg.js"),
              H = await handleToolHostPermissionRequest({
                name: name,
                args: T,
                meta: _meta,
                servedTools: U,
                launchPermissionContext: E,
                newCall: () => {
                  let A = X(Jje.has(name) ? combineWithCallerGoneSignal(signal, authInfo) : signal, U(), o);
                  return { toolUseContext: A.toolUseContext, release: () => noop(A.toolState) };
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
        let Se = T?.deny_rules;
        using x =
          E === void 0 && !(Array.isArray(Se) && Se.length > 0)
            ? Ae
            : (await import("./chunk-1mqwyc6a.js")).ownCallDirectory(o, signal);
        if (c) {
          let { countedUnlessRepeated: countedUnlessRepeated, SERVED_FILE_CALLS: SERVED_FILE_CALLS } =
              await import("./chunk-wy9dbk5f.js"),
            u = SERVED_FILE_CALLS.get(name);
          if (u) {
            using H = startProgressHeartbeat(_meta?.progressToken, sendNotification);
            let A,
              h = authInfo?.extra?.[CALLER_GONE_SIGNAL];
            try {
              let { summary: summary, output: output } = await countedUnlessRepeated(
                  name,
                  x.bind(() =>
                    u(T, signal, {
                      tellToolListChanged: se,
                      toolUseContext: () => (A ??= X(signal, U(), x.session)).toolUseContext,
                      session: x.session,
                      launchPermissionContext: E,
                      workspaceRoot: R,
                      ...(ne && { callerLogsSharedEvents: !0 }),
                      reportProgress: H.report,
                      callerGone: h instanceof AbortSignal ? h : void 0,
                      meta: _meta,
                      checkAsServedTool: async (V, r, I) => {
                        let G = findToolByName(U(), V);
                        if (!G?.isEnabled())
                          return { rejection: `${name} was not run: this server does not serve ${V}.` };
                        let tool = safeParseToolInput(G, r);
                        if (!tool.success)
                          return {
                            rejection: `${name} was not run: its input is not valid for ${V}: ${tool.error.message}`,
                          };
                        let { toolUseContext: toolUseContext } = (A ??= X(signal, U(), x.session)),
                          validationResult = await G.validateInput?.(tool.data, toolUseContext);
                        if (validationResult && !validationResult.result)
                          return {
                            rejection: `${name} was not run: ${V} refused its input: ${validationResult.message}`,
                          };
                        let Ce = E && addSessionWorkingDirectories(E),
                          ve =
                            I.length === 0
                              ? Ce
                              : (await import("./chunk-87nrc1a5.js")).withDenyRulesOfOneCall(Ce, I);
                        if (I.length > 0 && ve === void 0)
                          return {
                            rejection: `${name} was not run: one of the deny rules sent with it could not be read. Retrying won't help.`,
                          };
                        let { checkPlainCall: checkPlainCall } = await import("./chunk-qz0jvaqd.js");
                        return checkPlainCall(G, tool.data, toolUseContext, ve, _meta);
                      },
                    }),
                  ),
                ),
                { encodeServedOutput: encodeServedOutput } = await import("./chunk-p0m1s550.js");
              return Z(x.run(() => encodeServedOutput(summary, output)));
            } catch (error) {
              let { ServedCallError: ServedCallError } = await import("./chunk-eg665tkd.js");
              return Z({
                isError: !0,
                content: [{ type: "text", text: errorMessage(error) }],
                ...(error instanceof ServedCallError && error.meta !== void 0 && { _meta: error.meta }),
              });
            } finally {
              if (A) noop(A.toolState);
            }
          }
        }
        let ee = U(),
          te = c && Jje.has(name),
          ge = ne;
        if (c && !te) {
          let { answerToolOutputRequest: answerToolOutputRequest } = await import("./chunk-qz0jvaqd.js"),
            run = await x.run(() =>
              answerToolOutputRequest({
                name: name,
                args: T,
                meta: _meta,
                tools: ee,
                launchPermissionContext: E,
                newCall: () => {
                  let u = X(signal, ee, x.session);
                  return { toolUseContext: u.toolUseContext, release: () => noop(u.toolState) };
                },
                startHeartbeat: () => startProgressHeartbeat(_meta?.progressToken, sendNotification),
              }),
            );
          if (run !== void 0) return run;
        }
        let y = te ? qS(getAllBaseTools(), name) : qS(ee, name);
        if (!y) throw Error(`Tool ${name} not found`);
        let { toolUseContext: toolUseContext, toolState: toolState } = X(
          te ? combineWithCallerGoneSignal(signal, authInfo) : signal,
          ee,
          x.session,
        );
        try {
          if (!y.isEnabled()) {
            let r = `Tool ${name} is not enabled`;
            return (
              logForDebugging(`MCP server: ${r}`, { level: "error" }),
              { isError: !0, content: [{ type: "text", text: r }] }
            );
          }
          let n = { ...(T ?? {}) },
            L = c ? Zde.filter((r) => r in n) : [],
            u = c ? parseServeModeInput(y, n) : safeParseToolInput(y, n);
          if (!u.success) {
            let r = `Tool ${name} arguments failed schema validation: ${u.error.message}`;
            return (
              logForDebugging(`MCP server: ${r}`, { level: "error" }),
              { isError: !0, content: [{ type: "text", text: r }] }
            );
          }
          let run = await x.run(() => y.validateInput?.(u.data, toolUseContext));
          if (run && !run.result) {
            let r = `Tool ${name} input is invalid: ${run.message}`;
            return (
              logForDebugging(`MCP server: ${r}`, { level: "error" }),
              { isError: !0, content: [{ type: "text", text: r }] }
            );
          }
          let A = !1;
          if (c && P === "rendered") {
            let { asksForEditResult: asksForEditResult } = await import("./chunk-ww9sdeb2.js");
            A = asksForEditResult(y.name, _meta);
          }
          let run_2 = await x.run(async () =>
            (await import("./chunk-qz0jvaqd.js")).checkPlainCall(
              y,
              u.data,
              toolUseContext,
              c && E !== void 0 ? addSessionWorkingDirectories(E) : E,
              _meta,
            ),
          );
          if ("rejection" in run_2)
            return (
              logForDebugging(`MCP server: ${run_2.rejection}`, { level: "error" }),
              {
                isError: !0,
                content: [{ type: "text", text: run_2.rejection }],
                ...(run_2.meta !== void 0 && { _meta: run_2.meta }),
              }
            );
          using q = startProgressHeartbeat(_meta?.progressToken, sendNotification);
          let run_3 = await x.run(() =>
              y.call(
                u.data,
                { ...run_2.toolUseContext, permissionPhase: run_2.toolUseContext.permissionPhase ?? {} },
                hasPermissionsToUseTool,
                createAssistantMessage({ content: [] }),
                void 0,
                P === "raw" ? { gitDiffRead: !0 } : A ? { smallResultAsked: !0 } : void 0,
              ),
            ),
            j,
            V = !1;
          if (te) {
            let { encodeUnlistedToolResult: encodeUnlistedToolResult } = await import("./chunk-p0m1s550.js");
            j = x.run(() => encodeUnlistedToolResult(y, run_3));
          } else if (P === "rendered") {
            let { renderToolResultForMCP: renderToolResultForMCP, withinAnswerLimit: withinAnswerLimit } =
                await import("./chunk-nyz8dmpm.js"),
              { answer: answer, tooLarge: tooLarge } = withinAnswerLimit(
                y,
                await x.run(() => renderToolResultForMCP(y, run_3, toolUseContext)),
              );
            ((j = A ? await (await import("./chunk-ww9sdeb2.js")).withEditResult(answer, run_3) : answer),
              (V = tooLarge));
          }
          if (j === void 0) {
            let r = run_3.data,
              I =
                typeof r === "object" &&
                r !== null &&
                "backgroundTaskId" in r &&
                typeof r.backgroundTaskId === "string"
                  ? { ...r, backgroundOutputPath: getTaskOutputPath(r.backgroundTaskId) }
                  : r;
            j = { content: [{ type: "text", text: jsonStringify(I) }] };
          }
          if (L.length > 0) {
            let r = strippedPrivilegeFieldsNote(L),
              at = j.content.at(-1);
            if (at?.type === "text")
              at.text += `
${r}`;
            else j.content.push({ type: "text", text: r });
          }
          if (!ge)
            if (V) logFeatureSad(fGt(y.name), "result_too_large");
            else logFeatureOk(fGt(y.name));
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
          if (LKe(error)) logForDebugging(`MCP server tool call '${name}' aborted`);
          else {
            let { code: code, isSad: isSad } = classifyToolErrorCode(error);
            if (isSad) {
              if ((logForDebugging(`MCP server tool call '${name}' failed: ${u}`, { level: "error" }), !ge))
                logFeatureSad(fGt(y.name), code);
            } else {
              let h = toError(error);
              (logError(
                "telemetryMessage" in h ? h : withTelemetryMessage(h, `mcp server tool '${y.name}' threw`),
              ),
                logFeatureBad(fGt(y.name), code));
            }
          }
          return Z({ isError: !0, content: [{ type: "text", text: u }] });
        } finally {
          noop(toolState);
        }
      },
    ),
    server
  );
}
//@ chunk-hjesqqfw.js:13829-13845 placement
function noop(s) {}
/**
 * mcp serve 设置的 schema：permissions.allow/deny 字符串列表。
 */
//@ chunk-87nrc1a5.js:11934-12043 placement
var stringListSchema = () => A(o()).default([]),
  MCP_SERVE_SETTINGS_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      permissions: zodStrictObject({ allow: stringListSchema(), deny: stringListSchema() }).default({
        allow: [],
        deny: [],
      }),
    }),
  );
/**
 * 读取并删除 CLAUDE_CODE_MCP_SERVE_SETTINGS，解析为 absent / unreadable / parsed（deny 规则合成权限上下文）。
 */
//@ chunk-87nrc1a5.js:12043-12296 placement
function readMcpServeSettings() {
  let CLAUDE_CODE_MCP_SERVE_SETTINGS = nk.CLAUDE_CODE_MCP_SERVE_SETTINGS;
  if ((nk.unset("CLAUDE_CODE_MCP_SERVE_SETTINGS"), CLAUDE_CODE_MCP_SERVE_SETTINGS === void 0))
    return { kind: "absent" };
  let t = safeParseJSON(CLAUDE_CODE_MCP_SERVE_SETTINGS, !1),
    n = MCP_SERVE_SETTINGS_SCHEMA().safeParse(t).data;
  return n === void 0 || hasProtoKeys(t)
    ? { kind: "unreadable" }
    : { kind: "parsed", ...buildServeDenyContext(n.permissions) };
}
/**
 * 规则全部合法时把 deny 规则应用到权限上下文（无上下文时附加内置 deny 规则）。
 */
//@ chunk-87nrc1a5.js:12296-12411 placement
function buildDenyRulesContext(e, t) {
  return t.every(isWellFormedDenyRule)
    ? applyPermissionRulesToPermissionContext(
        e ?? getEmptyToolPermissionContext(),
        collectRulesFromSettings({ cliArg: e ? [...t] : uniq([...antBuiltinDenyRules(), ...t]) }, "deny"),
        { announce: !1 },
      )
    : void 0;
}
/**
 * 检查 deny 规则格式：不以 -/( 开头、无控制字符、工具名合法、括号配平等。
 */
//@ chunk-87nrc1a5.js:12411-12636 placement
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
/**
 * 括号是否配平（跳过反斜杠转义）。
 */
//@ chunk-87nrc1a5.js:12636-12769 placement
function hasBalancedParens(e) {
  let t = 0;
  for (let n = 0; n < e.length && t >= 0; n++)
    if (e[n] === "\\") n++;
    else if (e[n] === "(") t++;
    else if (e[n] === ")") t--;
  return t === 0;
}
/**
 * 由 deny 规则（加内置规则）生成权限上下文，并统计格式错误的规则数。
 */
//@ chunk-87nrc1a5.js:12769-12953 placement
function buildServeDenyContext(e) {
  let t = uniq([...splitRuleList(e.deny), ...antBuiltinDenyRules()]);
  return {
    context: applyPermissionRulesToPermissionContext(
      getEmptyToolPermissionContext(),
      collectRulesFromSettings({ cliArg: t }, "deny"),
    ),
    malformedRules: count(
      [...t, ...splitRuleList(e.allow)],
      (n) => n.startsWith("-") || classifyRuleParens(n).kind === "malformed",
    ),
  };
}

export { CALLER_GONE_SIGNAL, createMCPServer };
