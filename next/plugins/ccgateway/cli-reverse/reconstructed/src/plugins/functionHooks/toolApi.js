/**
 * plugins/functionHooks/toolApi.ts
 *
 * 2.1.316 新增：插件 $.tool.call/register 接口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
 * attribution: placement 18
 */
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { getCancelMessage, runToolUse } from "../../services/tools/toolExecution.js";
import { createCancelledToolResultBlock } from "../../services/PromptSuggestion/speculation.js";
import { withMemoryCorrectionHint, createUserMessage, createAssistantMessage } from "../../utils/messages.js";
import {
  markRecordGenuine as markRecordGenuine_2,
  noteToolText,
  markRecordDropped,
} from "../../utils/telemetry/thirdPartyEventRecords.js";
import { getRootSession } from "../../bootstrap/state.js";
import { collectMemoryTextFields } from "../../utils/messages/accountMemory.js";
import { endToolBlockedOnUserSpan } from "../../utils/telemetry/sessionTracing.js";
import { awaitSpawnedAgentAnswer } from "./agentApi.js";
import { toolInputOf, toolInputText } from "./sites/toolSites.js";
import { HooksError } from "./hooksErrors.js";
import { requireBoundSession } from "./sessionApi.js";
import { isMultiEntryAliasTool } from "../../services/tools/permissionCheckGuard.js";
import { findTool } from "../../services/api/deferredToolsState.js";
import { logForDebugging } from "../../utils/debug.js";
import { forwardAbort } from "./dispatch/chain.js";
import {
  pluginToolContext,
  pluginToolUse,
  unwrapUserMessage,
  isWithheldResult,
  rethrowHooksError,
  launchedAgentId,
  subagentCaller,
  errorToolResult,
  toolDescriptionCache,
  TOOL_DESCRIBE_SETTLE_MS,
} from "./toolCallHooks.js";
import { jsonCloneValue } from "./api/settingsRead.js";
import { resolvedModelOf } from "./api/agentToolOps.js";
import { isBuiltinMcpServerName } from "../../services/mcp/builtinServerNames.js";
import { moduleStore } from "../../services/mcp/mcpClientCapabilities.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { createToolCheckCore, toolCheckApprover } from "./toolCheckHooks.js";
import { checkDeclarativePermission } from "../../utils/permissions/permissions.js";
import { eventCallersFor2 } from "./eventCatalog.js";
import { mcpPermissionCeiling } from "../../utils/hooks/matcherGrammar.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { isBareMode } from "../../utils/envUtils.js";
import { isBuiltinSuffixed } from "./eventPatterns.js";
import { pluginStorageIdOf } from "./commandHooks.js";
import { currentToolCall, registeredMcpToolName, buildRawMcpToolName } from "./mcpServerHooks.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sleep } from "../../utils/sleep.js";
import { isToolDroppedByDenyRules } from "../../utils/permissions/filterToolsByDenyRules.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";

//@ chunk-5xgkngpb.js:52574-52725 placement (2.1.88 match: _temp, 0.649)
/**
 * 校验工具输入并调用工具的 isReadOnly，是只读时返回 {isReadOnly: true}；出错记录日志并返回空对象。
 */
function checkToolReadOnly(tool, input, toolContext) {
  try {
    let parsed = tool.inputSchema.safeParse(input);
    return parsed.success && tool.isReadOnly(parsed.data, toolContext)
      ? {
          isReadOnly: true,
        }
      : {};
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {};
  }
}
//@ chunk-5xgkngpb.js:4070977-4071142 placement
/**
 * 生成被取消的工具结果消息（带记忆纠正提示）。
 */
function createCancelledToolResult(toolUseId, assistantMessage, signal, now) {
  let cancelMessage = getCancelMessage(signal);
  let cancelledToolResultBlock = createCancelledToolResultBlock(toolUseId);
  cancelledToolResultBlock.content = withMemoryCorrectionHint(cancelMessage);
  return createUserMessage({
    content: [cancelledToolResultBlock],
    toolUseResult: cancelMessage,
    toolDenialKind: "cancelled",
    sourceToolAssistantUUID: assistantMessage.uuid,
    now,
  });
}
//@ chunk-5xgkngpb.js:4071142-4071171 placement
/**
 * 标记记录可信
 */
function markRecordGenuine() {
  markRecordGenuine_2(getRootSession().host);
}
//@ chunk-5xgkngpb.js:4071171-4071385 placement
/**
 * 把工具输入与结果中的文本记入会话宿主的记录（失败时标记记录丢失）。
 */
function noteToolTexts(observableInput, content) {
  try {
    let host = getRootSession().host;
    for (let text of collectMemoryTextFields(observableInput)) noteToolText(host, text);
    if (typeof content === "string") noteToolText(host, content);
    else if (Array.isArray(content)) {
      for (let block of content) if (block.type === "text") noteToolText(host, block.text);
    }
  } catch (error) {
    logError(error);
    try {
      markRecordDropped(getRootSession().host);
    } catch {}
  }
}
//@ chunk-5xgkngpb.js:4071385-4071457 placement
/**
 * 记录决定
 */
function setDecided(decisionOut, mode, decision) {
  endToolBlockedOnUserSpan(decision.decision, decision.source);
  decisionOut.decided = {
    record: decision,
    mode,
  };
}
//@ chunk-5xgkngpb.js:4071457-4071554 placement
/**
 * 给结果消息附权限决定
 */
function attachPermissionDecision(messages, toolUseId, record) {
  if (record === undefined) return messages;
  for (let message of findToolResultMessages(messages, toolUseId)) message.permissionDecision = record;
  return messages;
}
//@ chunk-5xgkngpb.js:4071554-4071785 placement
/**
 * 找出只包含指定 tool_use_id 结果的用户消息。
 */
function findToolResultMessages(rows, toolUseId) {
  let matches = [];
  for (let { message } of rows) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    let filtered = message.message.content.filter((block) => block.type === "tool_result");
    if (filtered.length === 1 && filtered[0].tool_use_id === toolUseId) matches.push(message);
  }
  return matches;
}
//@ chunk-5xgkngpb.js:4071785-4071894 placement
function awaitSpawnedAnswerForever(options) {
  return awaitSpawnedAgentAnswer({
    ...options,
    signal: new AbortController().signal,
    settleWaitMs: Number.POSITIVE_INFINITY,
  });
}
//@ chunk-5xgkngpb.js:4071894-4074224 placement
/**
 * 插件 $.tool.call：按名字调用会话中的工具，可附带用户同意字符串。
 */
async function toolCallForPlugin(request, caller) {
  let { tool, consent } = request;
  let input = toolInputOf(request);
  let { plugin, signal } = caller;
  let pluginName = plugin;
  if (consent !== undefined && typeof consent !== "string")
    throw new HooksError(`${pluginName}: $.tool.call: consent, when given, is a string`);
  let origin = caller.origin ?? [pluginName];
  let session = requireBoundSession(pluginName, "$.tool.call");
  let filtered = session.tools().filter((entry) => !isMultiEntryAliasTool(entry));
  let tool_2 = findTool(filtered, tool);
  if (!tool_2) {
    logForDebugging(
      `$.tool.call (${pluginName}): no tool named "${tool}"; the session has ${filtered.map((entry) => entry.name).join(", ")}`,
    );
    throw new HooksError(`${pluginName}: $.tool.call: no tool named "${tool}" in this session`);
  }
  let abortController = new AbortController();
  let releaseAbort = forwardAbort(signal, abortController);
  let toolContext = pluginToolContext(session, abortController, {
    plugin: pluginName,
    origin,
    ...(caller.servesModel && {
      servesModel: true,
    }),
  });
  if (consent !== undefined)
    toolContext.messages = [
      ...toolContext.messages,
      createUserMessage({
        content: consent,
        origin: {
          kind: "human",
        },
      }),
    ];
  let toolUse = pluginToolUse(tool_2.name, input);
  let assistantMessage = createAssistantMessage({
    content: [toolUse],
    isVirtual: true,
  });
  let now = Date.now();
  logForDebugging(
    `$.tool.call (${pluginName}): ${tool_2.name} (${Object.keys(input).join(", ") || "no input"})`,
  );
  let text = "";
  let result;
  let isError = false;
  let isDenied = false;
  let isWithheld = false;
  let hasResult = false;
  try {
    for await (let update of runToolUse(toolUse, assistantMessage, session.canUseTool, toolContext, () =>
      new Date().toISOString(),
    )) {
      let userMessage = unwrapUserMessage(update);
      if (!userMessage) continue;
      let content = userMessage.message.content;
      if (typeof content === "string") continue;
      for (let block of content)
        if (block.type === "tool_result" && block.tool_use_id === toolUse.id) {
          hasResult = true;
          text = toolInputText(block.content);
          isError = block.is_error === true;
          isWithheld = isWithheldResult(userMessage);
          isDenied = isWithheld || userMessage.toolDenialKind !== undefined;
        }
      if (userMessage.toolUseResult !== undefined && result === undefined)
        try {
          result = jsonCloneValue(userMessage.toolUseResult);
        } catch {
          result = undefined;
        }
    }
  } catch (error) {
    rethrowHooksError(pluginName, error, `$.tool.call(${tool_2.name})`);
  } finally {
    releaseAbort();
  }
  if (!hasResult)
    throw new HooksError(
      `${pluginName}: $.tool.call(${tool_2.name}) produced no result${abortController.signal.aborted ? " (aborted)" : ""}`,
    );
  logForDebugging(
    `$.tool.call (${pluginName}): ${tool_2.name} answered in ${Date.now() - now}ms, ${text.length} chars${isDenied ? ", denied" : isError ? ", isError" : ""}`,
  );
  if (isWithheld)
    return {
      deny: text,
    };
  if (isDenied)
    return {
      deny: text.replace(/^<tool_use_error>|<\/tool_use_error>$/g, ""),
    };
  let agentId = launchedAgentId(tool_2.name, result);
  if (agentId !== undefined && caller.isLaunchOnly) {
    let settled = awaitSpawnedAnswerForever({
      registry: toolContext.taskRegistry,
      agentId,
      pluginName,
    });
    caller.leftRunning?.(
      settled.then(
        () => {
          return;
        },
        (error) =>
          logForDebugging(
            `$.agent.spawn (${pluginName}): waiting on Agent ${agentId} failed: ${String(error)}`,
            {
              level: "error",
            },
          ),
      ),
    );
    logForDebugging(`$.agent.spawn (${pluginName}): Agent ${agentId} started`);
    return {
      result: subagentCaller(agentId, resolvedModelOf(result)),
      text: "",
    };
  }
  if (agentId !== undefined) {
    let answer = await awaitSpawnedAgentAnswer({
      registry: toolContext.taskRegistry,
      agentId,
      pluginName,
      signal: signal ?? abortController.signal,
    });
    if (answer.isError) {
      if (answer.settled) caller.leftRunning?.(answer.settled);
      return errorToolResult(undefined, answer.text);
    }
    logForDebugging(
      `$.tool.call (${pluginName}): Agent ${agentId} settled in ${Date.now() - now}ms, ${answer.text.length} chars`,
    );
    return {
      result: subagentCaller(agentId, resolvedModelOf(result)),
      text: answer.text,
    };
  }
  return isError
    ? errorToolResult(result, text)
    : {
        result,
        text,
      };
}
//@ chunk-5xgkngpb.js:4075803-4075905 placement
function checkServerNameReserved(name) {
  if (isBuiltinMcpServerName(name))
    throw new HooksError(`${name}: $.tool.register: "${name}" is a reserved MCP server name`);
}
//@ chunk-5xgkngpb.js:4075905-4076179 placement
function checkServerNameTaken(session, pluginName, key) {
  if (moduleStore.serverKey(pluginName) !== undefined || moduleStore.minted(key)) return;
  let found = session
    .mcpServers()
    .find((name) => CLAUDEAI_SERVER_PREFIX(name) === CLAUDEAI_SERVER_PREFIX(key));
  if (found === undefined) return;
  throw new HooksError(
    `${pluginName}: $.tool.register: the session already has an MCP server named "${found}" in its MCP config; registering would replace it`,
  );
}
//@ chunk-5xgkngpb.js:4076179-4076191 placement
/**
 * 100
 */
var MAX_TOOL_DESCRIBE_CHARS = 100;
//@ chunk-5xgkngpb.js:4076191-4076204 placement
/**
 * 8000
 */
var TOOL_DESCRIBE_CACHE_MS = 8000;
//@ chunk-5xgkngpb.js:4076204-4076776 placement
async function toolCheckForPlugin(args, caller) {
  let { plugin, signal } = caller;
  let { tool, input } = args;
  if (!isPlainObject_6(input))
    throw new HooksError(`${plugin}: $.tool.check: input is the tool's arguments, an object`);
  let origin = caller.origin ?? [plugin];
  let session = requireBoundSession(plugin, "$.tool.check");
  let tool_2 = findTool(
    session.tools().filter((entry) => !isMultiEntryAliasTool(entry)),
    tool,
  );
  if (!tool_2) throw new HooksError(`${plugin}: $.tool.check: no tool named "${tool}" in this session`);
  let abortController = new AbortController();
  let toolContext = pluginToolContext(session, abortController, {
    plugin,
    origin,
  });
  let releaseAbort = forwardAbort(signal, abortController);
  let toolCheckCore = createToolCheckCore(
    () => checkDeclarativePermission(tool_2, input, toolContext),
    tool_2,
    toolContext,
  );
  try {
    return await eventCallersFor2({
      signal: abortController.signal,
      origin,
      core: {
        "tool.check": toolCheckCore.core,
      },
    }).tool.check({
      tool: tool_2.name,
      input,
      ...mcpPermissionCeiling(tool_2),
      ...toolCheckApprover(tool_2, toolContext),
      ...checkToolReadOnly(tool_2, input, toolContext),
    });
  } finally {
    releaseAbort();
  }
}
//@ chunk-5xgkngpb.js:4076776-4077083 placement
/**
 * $.tool.list：列出会话工具（名字、截断后的描述、是否 MCP），描述按工具缓存。
 */
async function toolListOp(plugin) {
  let session = requireBoundSession(plugin, "$.tool.list");
  let filtered = session.tools().filter((entry) => !isMultiEntryAliasTool(entry));
  let toolPermissionContext = getToolPermissionContext(session.toolContext(new AbortController()));
  return Promise.all(
    filtered.map(async (entry) => ({
      name: entry.name,
      description: await toolDescriptionCache.of(entry, async () =>
        truncateToLength(
          await entry.prompt({
            getToolPermissionContext: async () => toolPermissionContext,
            tools: filtered,
            agents: [],
          }),
          TOOL_DESCRIBE_SETTLE_MS,
        ),
      ),
      mcp: entry.isMcp === true,
    })),
  );
}
//@ chunk-5xgkngpb.js:4077083-4078858 placement
/**
 * 插件 $.tool.register：注册插件工具；--tools 为空或 --bare 会话中拒绝。
 */
async function toolRegisterForPlugin(registration, plugin) {
  checkServerNameReserved(plugin);
  let session = requireBoundSession(plugin, "$.tool.register");
  let toolContext = session.toolContext(new AbortController());
  if (getToolPermissionContext(toolContext).builtInToolsDisabled === true)
    throw new HooksError(
      `${plugin}: $.tool.register: "${registration.name}" refused: this session has no built-in tools (--tools ""), so it takes none from plugins`,
    );
  if (isBareMode() && isBuiltinSuffixed(pluginStorageIdOf(plugin)))
    throw new HooksError(
      `${plugin}: $.tool.register: "${registration.name}" refused: this session runs with --bare, which takes tools from the plugins its command line names and from no built-in one`,
    );
  let registrar = currentToolCall();
  if (!registrar) {
    logFeatureBad("plugin_function_hooks_register_tool", "no_registrar");
    throw new HooksError(
      `${plugin}: $.tool.register: this host cannot add tools at run time (no in-process MCP server registrar installed)`,
    );
  }
  let existingName = registeredMcpToolName(session, registration, plugin);
  if (existingName !== undefined) {
    logForDebugging(`$.tool.register (${plugin}): ${existingName} unchanged and listed; not re-registered`);
    return {
      tool: existingName,
    };
  }
  let toolsByName = moduleStore.own(plugin);
  let { key, config } = registrar(plugin, [
    ...new Map(toolsByName).set(registration.name, registration).values(),
  ]);
  checkServerNameTaken(session, plugin, key);
  toolsByName.set(registration.name, registration);
  moduleStore.keyed(plugin, key);
  let rawMcpToolName = buildRawMcpToolName(key, registration.name);
  logForDebugging(
    `$.tool.register (${plugin}): ${rawMcpToolName} (${toolsByName.size} tool(s) on server ${jsonStringify(key)}); connecting`,
  );
  let now = Date.now();
  let abortController = new AbortController();
  try {
    await Promise.race([
      session.addMcpServer(key, config),
      sleep(TOOL_DESCRIBE_CACHE_MS, abortController.signal),
    ]);
  } finally {
    abortController.abort();
  }
  if (
    isToolDroppedByDenyRules(getToolPermissionContext(toolContext), {
      name: rawMcpToolName,
      mcpInfo: {
        serverName: key,
        toolName: registration.name,
      },
    })
  ) {
    logFeatureOk("plugin_function_hooks_register_tool", {
      withheld: true,
    });
    logForDebugging(
      `$.tool.register (${plugin}): ${rawMcpToolName} registered; a deny rule withholds it from this session's tools, so not waiting for it to list`,
    );
    return {
      tool: rawMcpToolName,
    };
  }
  while (Date.now() - now < TOOL_DESCRIBE_CACHE_MS) {
    if (session.tools().some((tool) => tool.name === rawMcpToolName)) {
      logFeatureOk("plugin_function_hooks_register_tool");
      logForDebugging(`$.tool.register (${plugin}): ${rawMcpToolName} visible after ${Date.now() - now}ms`);
      return {
        tool: rawMcpToolName,
      };
    }
    await sleep(MAX_TOOL_DESCRIBE_CHARS);
  }
  logFeatureSad("plugin_function_hooks_register_tool", "not_yet_visible");
  logForDebugging(
    `$.tool.register (${plugin}): ${rawMcpToolName} not yet in the session's tools after ${TOOL_DESCRIBE_CACHE_MS}ms; resolving anyway`,
    {
      level: "warn",
    },
  );
  return {
    tool: rawMcpToolName,
  };
}
//@ chunk-5xgkngpb.js:4078858-4078961 placement (2.1.88 match: getMcpPrefix, 1)
var listServersInToolNames = (serverName) =>
  normalizeCaseForComparison_2(
    serverName
      .filter((toolName) => toolName.startsWith("mcp__"))
      .map((toolName) => toolName.split("__")[1] ?? ""),
  ).join(", ") || "none";
//@ chunk-5xgkngpb.js:4078961-4079025 placement (2.1.88 match: getMcpPrefix, 1)
var mcpToolNameVariants = (server, tool) =>
  new Set([
    buildRawMcpToolName(server, tool),
    `mcp__${server}__${tool}`,
    buildRawMcpToolName(server, CLAUDEAI_SERVER_PREFIX(tool)),
  ]);
export {
  checkToolReadOnly,
  toolCallForPlugin,
  toolCheckForPlugin,
  toolListOp,
  toolRegisterForPlugin,
  createCancelledToolResult,
  attachPermissionDecision,
  findToolResultMessages,
  markRecordGenuine,
  setDecided,
  noteToolTexts,
  mcpToolNameVariants,
  listServersInToolNames,
};
