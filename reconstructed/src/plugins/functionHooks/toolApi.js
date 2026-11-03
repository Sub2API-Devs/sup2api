/**
 * plugins/functionHooks/toolApi.ts
 *
 * 2.1.316 新增：插件 $.tool.call/register 接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { getCancelMessage, runToolUse } from "../../services/tools/toolExecution.js";
import {
  createCancelledToolResultBlock,
  withMemoryCorrectionHint,
  createUserMessage,
  createAssistantMessage,
} from "../../utils/messages.js";
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
import { isWebToolRestrictedInRelay } from "../../utils/permissions/permissionRulePayload.js";
import { isComputerUseTool } from "../../utils/permissions/browserToolNames.js";
import { isRemoteBrowserToolUnderModeFloor } from "../../utils/permissions/remoteBrowser.js";
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
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
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
import { uniq } from "../../utils/collections.js";

//@ chunk-e6aww6q8.js:50158-50309 placement = _temp (0.649)
/**
 * 校验工具输入并调用工具的 isReadOnly，是只读时返回 {isReadOnly: true}；出错记录日志并返回空对象。
 */
function checkToolReadOnly(tool, n, r) {
  try {
    let s = tool.inputSchema.safeParse(n);
    return s.success && tool.isReadOnly(s.data, r)
      ? {
          isReadOnly: true,
        }
      : {};
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {};
  }
}
//@ chunk-e6aww6q8.js:3968539-3968704 placement
/**
 * 生成被取消的工具结果消息（带记忆纠正提示）。
 */
function createCancelledToolResult(e, assistantMessage, signal, now) {
  let cancelMessage = getCancelMessage(signal);
  let cancelledToolResultBlock = createCancelledToolResultBlock(e);
  cancelledToolResultBlock.content = withMemoryCorrectionHint(cancelMessage);
  return createUserMessage({
    content: [cancelledToolResultBlock],
    toolUseResult: cancelMessage,
    toolDenialKind: "cancelled",
    sourceToolAssistantUUID: assistantMessage.uuid,
    now,
  });
}
//@ chunk-e6aww6q8.js:3968704-3968733 placement
/**
 * 标记记录可信
 */
function markRecordGenuine() {
  markRecordGenuine_2(getRootSession().host);
}
//@ chunk-e6aww6q8.js:3968733-3968947 placement
/**
 * 把工具输入与结果中的文本记入会话宿主的记录（失败时标记记录丢失）。
 */
function noteToolTexts(observableInput, n) {
  try {
    let host = getRootSession().host;
    for (let s of collectMemoryTextFields(observableInput)) noteToolText(host, s);
    if (typeof n === "string") noteToolText(host, n);
    else if (Array.isArray(n)) {
      for (let s of n) if (s.type === "text") noteToolText(host, s.text);
    }
  } catch (error) {
    logError(error);
    try {
      markRecordDropped(getRootSession().host);
    } catch {}
  }
}
//@ chunk-e6aww6q8.js:3968947-3969019 placement
/**
 * 记录决定
 */
function setDecided(decisionOut, mode, r) {
  endToolBlockedOnUserSpan(r.decision, r.source);
  decisionOut.decided = {
    record: r,
    mode,
  };
}
//@ chunk-e6aww6q8.js:3969019-3969116 placement
/**
 * 给结果消息附权限决定
 */
function attachPermissionDecision(e, toolUseID, record) {
  if (record === undefined) return e;
  for (let s of findToolResultMessages(e, toolUseID)) s.permissionDecision = record;
  return e;
}
//@ chunk-e6aww6q8.js:3969116-3969347 placement
/**
 * 找出只包含指定 tool_use_id 结果的用户消息。
 */
function findToolResultMessages(e, n) {
  let r = [];
  for (let { message } of e) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    let filtered = message.message.content.filter((y) => y.type === "tool_result");
    if (filtered.length === 1 && filtered[0].tool_use_id === n) r.push(message);
  }
  return r;
}
//@ chunk-e6aww6q8.js:3969347-3969456 placement
function awaitSpawnedAnswerForever(e) {
  return awaitSpawnedAgentAnswer({
    ...e,
    signal: new AbortController().signal,
    settleWaitMs: Number.POSITIVE_INFINITY,
  });
}
//@ chunk-e6aww6q8.js:3969456-3971994 placement
/**
 * 插件 $.tool.call：按名字调用会话中的工具，可附带用户同意字符串。
 */
async function toolCallForPlugin(e, n) {
  let { tool, consent } = e;
  let h = toolInputOf(e);
  let { plugin, signal } = n;
  let w = plugin;
  if (consent !== undefined && typeof consent !== "string")
    throw new HooksError(`${w}: $.tool.call: consent, when given, is a string`);
  let origin = n.origin ?? [w];
  let G = requireBoundSession(w, "$.tool.call");
  let filtered = G.tools().filter((yt) => !isMultiEntryAliasTool(yt));
  let tool_2 = findTool(filtered, tool);
  if (!tool_2) {
    logForDebugging(
      `$.tool.call (${w}): no tool named "${tool}"; the session has ${filtered.map((yt) => yt.name).join(", ")}`,
    );
    throw new HooksError(`${w}: $.tool.call: no tool named "${tool}" in this session`);
  }
  if (
    consent !== undefined &&
    (isWebToolRestrictedInRelay(tool_2.name) ||
      isComputerUseTool(tool_2.mcpInfo) ||
      isRemoteBrowserToolUnderModeFloor(tool_2))
  )
    throw new HooksError(
      `${w}: $.tool.call: ${tool_2.name} does not accept \`consent\` in this session. Call it without \`consent\`, and the normal permission check will decide.`,
    );
  let abortController = new AbortController();
  let we = forwardAbort(signal, abortController);
  let Ee = pluginToolContext(G, abortController, {
    plugin: w,
    origin,
    ...(n.servesModel && {
      servesModel: true,
    }),
  });
  if (consent !== undefined)
    Ee.messages = [
      ...Ee.messages,
      createUserMessage({
        content: consent,
        origin: {
          kind: "human",
        },
      }),
    ];
  let Ae = pluginToolUse(tool_2.name, h);
  let assistantMessage = createAssistantMessage({
    content: [Ae],
    isVirtual: true,
  });
  let now = Date.now();
  logForDebugging(`$.tool.call (${w}): ${tool_2.name} (${Object.keys(h).join(", ") || "no input"})`);
  let text = "";
  let result;
  let lt = false;
  let Je = false;
  let nt = false;
  let pt = false;
  try {
    for await (let yt of runToolUse(Ae, assistantMessage, G.canUseTool, Ee, () => new Date().toISOString())) {
      let gt = unwrapUserMessage(yt);
      if (!gt) continue;
      let content = gt.message.content;
      if (typeof content === "string") continue;
      for (let It of content)
        if (It.type === "tool_result" && It.tool_use_id === Ae.id) {
          pt = true;
          text = toolInputText(It.content);
          lt = It.is_error === true;
          nt = isWithheldResult(gt);
          Je = nt || gt.toolDenialKind !== undefined;
        }
      if (gt.toolUseResult !== undefined && result === undefined)
        try {
          result = jsonCloneValue(gt.toolUseResult);
        } catch {
          result = undefined;
        }
    }
  } catch (error) {
    rethrowHooksError(w, error, `$.tool.call(${tool_2.name})`);
  } finally {
    we();
  }
  if (!pt)
    throw new HooksError(
      `${w}: $.tool.call(${tool_2.name}) produced no result${abortController.signal.aborted ? " (aborted)" : ""}`,
    );
  logForDebugging(
    `$.tool.call (${w}): ${tool_2.name} answered in ${Date.now() - now}ms, ${text.length} chars${Je ? ", denied" : lt ? ", isError" : ""}`,
  );
  if (nt)
    return {
      deny: text,
    };
  if (Je)
    return {
      deny: text.replace(/^<tool_use_error>|<\/tool_use_error>$/g, ""),
    };
  let agentId = launchedAgentId(tool_2.name, result);
  if (agentId !== undefined && n.isLaunchOnly) {
    let yt = awaitSpawnedAnswerForever({
      registry: Ee.taskRegistry,
      agentId,
      pluginName: w,
    });
    n.leftRunning?.(
      yt.then(
        () => {
          return;
        },
        (error) =>
          logForDebugging(`$.agent.spawn (${w}): waiting on Agent ${agentId} failed: ${String(error)}`, {
            level: "error",
          }),
      ),
    );
    logForDebugging(`$.agent.spawn (${w}): Agent ${agentId} started`);
    return {
      result: subagentCaller(agentId, resolvedModelOf(result)),
      text: "",
    };
  }
  if (agentId !== undefined) {
    let yt = await awaitSpawnedAgentAnswer({
      registry: Ee.taskRegistry,
      agentId,
      pluginName: w,
      signal: signal ?? abortController.signal,
    });
    if (yt.isError) {
      if (yt.settled) n.leftRunning?.(yt.settled);
      return errorToolResult(undefined, yt.text);
    }
    logForDebugging(
      `$.tool.call (${w}): Agent ${agentId} settled in ${Date.now() - now}ms, ${yt.text.length} chars`,
    );
    return {
      result: subagentCaller(agentId, resolvedModelOf(result)),
      text: yt.text,
    };
  }
  return lt
    ? errorToolResult(result, text)
    : {
        result,
        text,
      };
}
//@ chunk-e6aww6q8.js:3973570-3973672 placement
function checkServerNameReserved(e) {
  if (isBuiltinMcpServerName(e))
    throw new HooksError(`${e}: $.tool.register: "${e}" is a reserved MCP server name`);
}
//@ chunk-e6aww6q8.js:3973672-3973946 placement
function checkServerNameTaken(e, n, key) {
  if (moduleStore.serverKey(n) !== undefined || moduleStore.minted(key)) return;
  let found = e.mcpServers().find((y) => normalizeNameForMCP(y) === normalizeNameForMCP(key));
  if (found === undefined) return;
  throw new HooksError(
    `${n}: $.tool.register: the session already has an MCP server named "${found}" in its MCP config; registering would replace it`,
  );
}
//@ chunk-e6aww6q8.js:3973946-3973958 placement
/**
 * 100
 */
var MAX_TOOL_DESCRIBE_CHARS = 100;
//@ chunk-e6aww6q8.js:3973958-3973971 placement
/**
 * 8000
 */
var TOOL_DESCRIBE_CACHE_MS = 8000;
//@ chunk-e6aww6q8.js:3973971-3974541 placement
async function toolCheckForPlugin(e, n) {
  let { plugin, signal } = n;
  let { tool, input } = e;
  if (!isPlainObject_5(input))
    throw new HooksError(`${plugin}: $.tool.check: input is the tool's arguments, an object`);
  let origin = n.origin ?? [plugin];
  let w = requireBoundSession(plugin, "$.tool.check");
  let tool_2 = findTool(
    w.tools().filter((ke) => !isMultiEntryAliasTool(ke)),
    tool,
  );
  if (!tool_2) throw new HooksError(`${plugin}: $.tool.check: no tool named "${tool}" in this session`);
  let abortController = new AbortController();
  let q = pluginToolContext(w, abortController, {
    plugin,
    origin,
  });
  let Z = forwardAbort(signal, abortController);
  let toolCheckCore = createToolCheckCore(() => checkDeclarativePermission(tool_2, input, q), tool_2, q);
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
      ...toolCheckApprover(tool_2, q),
      ...checkToolReadOnly(tool_2, input, q),
    });
  } finally {
    Z();
  }
}
//@ chunk-e6aww6q8.js:3974541-3974849 placement
/**
 * $.tool.list：列出会话工具（名字、截断后的描述、是否 MCP），描述按工具缓存。
 */
async function toolListOp(plugin) {
  let n = requireBoundSession(plugin, "$.tool.list");
  let filtered = n.tools().filter((h) => !isMultiEntryAliasTool(h));
  let toolPermissionContext = getToolPermissionContext(n.toolContext(new AbortController()));
  return Promise.all(
    filtered.map(async (h) => ({
      name: h.name,
      description: await toolDescriptionCache.of(h, async () =>
        truncateToLength(
          await h.prompt({
            getToolPermissionContext: async () => toolPermissionContext,
            tools: filtered,
            agents: [],
          }),
          TOOL_DESCRIBE_SETTLE_MS,
        ),
      ),
      mcp: h.isMcp === true,
    })),
  );
}
//@ chunk-e6aww6q8.js:3974849-3976621 placement
/**
 * 插件 $.tool.register：注册插件工具；--tools 为空或 --bare 会话中拒绝。
 */
async function toolRegisterForPlugin(e, plugin) {
  checkServerNameReserved(plugin);
  let r = requireBoundSession(plugin, "$.tool.register");
  let s = r.toolContext(new AbortController());
  if (getToolPermissionContext(s).builtInToolsDisabled === true)
    throw new HooksError(
      `${plugin}: $.tool.register: "${e.name}" refused: this session has no built-in tools (--tools ""), so it takes none from plugins`,
    );
  if (isBareMode() && isBuiltinSuffixed(pluginStorageIdOf(plugin)))
    throw new HooksError(
      `${plugin}: $.tool.register: "${e.name}" refused: this session runs with --bare, which takes tools from the plugins its command line names and from no built-in one`,
    );
  let h = currentToolCall();
  if (!h) {
    logFeatureBad("plugin_function_hooks_register_tool", "no_registrar");
    throw new HooksError(
      `${plugin}: $.tool.register: this host cannot add tools at run time (no in-process MCP server registrar installed)`,
    );
  }
  let y = registeredMcpToolName(r, e, plugin);
  if (y !== undefined) {
    logForDebugging(`$.tool.register (${plugin}): ${y} unchanged and listed; not re-registered`);
    return {
      tool: y,
    };
  }
  let S = moduleStore.own(plugin);
  let { key, config } = h(plugin, [...new Map(S).set(e.name, e).values()]);
  checkServerNameTaken(r, plugin, key);
  S.set(e.name, e);
  moduleStore.keyed(plugin, key);
  let rawMcpToolName = buildRawMcpToolName(key, e.name);
  logForDebugging(
    `$.tool.register (${plugin}): ${rawMcpToolName} (${S.size} tool(s) on server ${jsonStringify(key)}); connecting`,
  );
  let now = Date.now();
  let abortController = new AbortController();
  try {
    await Promise.race([r.addMcpServer(key, config), sleep(TOOL_DESCRIBE_CACHE_MS, abortController.signal)]);
  } finally {
    abortController.abort();
  }
  if (
    isToolDroppedByDenyRules(getToolPermissionContext(s), {
      name: rawMcpToolName,
      mcpInfo: {
        serverName: key,
        toolName: e.name,
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
    if (r.tools().some((we) => we.name === rawMcpToolName)) {
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
//@ chunk-e6aww6q8.js:3976621-3976724 placement = getMcpPrefix (1)
var listServersInToolNames = (serverName) =>
  uniq(serverName.filter((n) => n.startsWith("mcp__")).map((n) => n.split("__")[1] ?? "")).join(", ") ||
  "none";
//@ chunk-e6aww6q8.js:3976724-3976788 placement = getMcpPrefix (1)
var mcpToolNameVariants = (server, tool) =>
  new Set([
    buildRawMcpToolName(server, tool),
    `mcp__${server}__${tool}`,
    buildRawMcpToolName(server, normalizeNameForMCP(tool)),
  ]);
export {
  createCancelledToolResult,
  attachPermissionDecision,
  findToolResultMessages,
  markRecordGenuine,
  setDecided,
  noteToolTexts,
  checkToolReadOnly,
  toolCallForPlugin,
  mcpToolNameVariants,
  listServersInToolNames,
  toolCheckForPlugin,
  toolListOp,
  toolRegisterForPlugin,
};
