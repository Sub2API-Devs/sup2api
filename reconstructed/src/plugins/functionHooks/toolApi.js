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
  markRecordGenuine,
  noteToolText,
  markRecordDropped,
} from "../../utils/telemetry/thirdPartyEventRecords.js";
import { getRootSession } from "../../bootstrap/state.js";
import { collectMemoryTextFields } from "../../utils/messages/accountMemory.js";
import { endToolBlockedOnUserSpan } from "../../utils/telemetry/sessionTracing.js";
import { awaitSpawnedAgentAnswer } from "./agentApi.js";
import { toolInputOf, Brs } from "./sites/toolSites.js";
import { HooksError } from "./hooksErrors.js";
import { requireBoundSession } from "./sessionApi.js";
import { isMultiEntryAliasTool } from "../../services/tools/permissionCheckGuard.js";
import { qS } from "../../services/api/deferredToolsState.js";
import { logForDebugging } from "../../utils/debug.js";
import { isWebToolRestrictedInRelay } from "../../utils/permissions/permissionRulePayload.js";
import { isComputerUseTool } from "../../utils/permissions/browserToolNames.js";
import { isRemoteBrowserToolUnderModeFloor } from "../../utils/permissions/remoteBrowser.js";
import { forwardAbort } from "./dispatch/chain.js";
import {
  pluginToolContext,
  sUr,
  unwrapUserMessage,
  pUr,
  jLn,
  launchedAgentId,
  NLn,
  $Ln,
  OLn,
  JHr,
} from "./toolCallHooks.js";
import { Nyn } from "./api/settingsRead.js";
import { Peo } from "./api/agentToolOps.js";
import { isBuiltinMcpServerName } from "../../services/mcp/builtinServerNames.js";
import { EN } from "../../services/mcp/mcpClientCapabilities.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { createToolCheckCore, toolCheckApprover } from "./toolCheckHooks.js";
import { checkDeclarativePermission } from "../../utils/permissions/permissions.js";
import { W$n } from "./eventCatalog.js";
import { lqt } from "../../utils/hooks/matcherGrammar.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { isBareMode } from "../../utils/envUtils.js";
import { isBuiltinSuffixed } from "./eventPatterns.js";
import { JC } from "./commandHooks.js";
import { Iyt, registeredMcpToolName, buildRawMcpToolName } from "./mcpServerHooks.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { sleep } from "../../utils/sleep.js";
import { isToolDroppedByDenyRules } from "../../utils/permissions/filterToolsByDenyRules.js";
import { uniq } from "../../utils/collections.js";

/**
 * 校验工具输入并调用工具的 isReadOnly，是只读时返回 {isReadOnly: true}；出错记录日志并返回空对象。
 */
//@ chunk-e6aww6q8.js:50158-50309 placement = _temp (0.649)
function checkToolReadOnly(e, n, r) {
  try {
    let safeParse = e.inputSchema.safeParse(n);
    return safeParse.success && e.isReadOnly(safeParse.data, r) ? { isReadOnly: !0 } : {};
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {};
  }
}
/**
 * 生成被取消的工具结果消息（带记忆纠正提示）。
 */
//@ chunk-e6aww6q8.js:3968539-3968704 placement
function createCancelledToolResult(e, n, r, s) {
  let h = getCancelMessage(r),
    y = createCancelledToolResultBlock(e);
  return (
    (y.content = withMemoryCorrectionHint(h)),
    createUserMessage({
      content: [y],
      toolUseResult: h,
      toolDenialKind: "cancelled",
      sourceToolAssistantUUID: n.uuid,
      now: s,
    })
  );
}
//@ chunk-e6aww6q8.js:3968704-3968733 placement
function T3r() {
  markRecordGenuine(getRootSession().host);
}
/**
 * 把工具输入与结果中的文本记入会话宿主的记录（失败时标记记录丢失）。
 */
//@ chunk-e6aww6q8.js:3968733-3968947 placement
function noteToolTexts(e, n) {
  try {
    let host = getRootSession().host;
    for (let s of collectMemoryTextFields(e)) noteToolText(host, s);
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
function DY(e, n, r) {
  (endToolBlockedOnUserSpan(r.decision, r.source), (e.decided = { record: r, mode: n }));
}
//@ chunk-e6aww6q8.js:3969019-3969116 placement
function v3r(e, n, r) {
  if (r === void 0) return e;
  for (let s of findToolResultMessages(e, n)) s.permissionDecision = r;
  return e;
}
/**
 * 找出只包含指定 tool_use_id 结果的用户消息。
 */
//@ chunk-e6aww6q8.js:3969116-3969347 placement
function findToolResultMessages(e, n) {
  let r = [];
  for (let { message: message } of e) {
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
/**
 * 插件 $.tool.call：按名字调用会话中的工具，可附带用户同意字符串。
 */
//@ chunk-e6aww6q8.js:3969456-3971994 placement
async function toolCallForPlugin(e, n) {
  let { tool: tool, consent: consent } = e,
    h = toolInputOf(e),
    { plugin: plugin, signal: signal } = n,
    w = plugin;
  if (consent !== void 0 && typeof consent !== "string")
    throw new HooksError(`${w}: $.tool.call: consent, when given, is a string`);
  let L = n.origin ?? [w],
    G = requireBoundSession(w, "$.tool.call"),
    filtered = G.tools().filter((yt) => !isMultiEntryAliasTool(yt)),
    Z = qS(filtered, tool);
  if (!Z)
    throw (
      logForDebugging(
        `$.tool.call (${w}): no tool named "${tool}"; the session has ${filtered.map((yt) => yt.name).join(", ")}`,
      ),
      new HooksError(`${w}: $.tool.call: no tool named "${tool}" in this session`)
    );
  if (
    consent !== void 0 &&
    (isWebToolRestrictedInRelay(Z.name) ||
      isComputerUseTool(Z.mcpInfo) ||
      isRemoteBrowserToolUnderModeFloor(Z))
  )
    throw new HooksError(
      `${w}: $.tool.call: ${Z.name} does not accept \`consent\` in this session. Call it without \`consent\`, and the normal permission check will decide.`,
    );
  let abortController = new AbortController(),
    we = forwardAbort(signal, abortController),
    Ee = pluginToolContext(G, abortController, {
      plugin: w,
      origin: L,
      ...(n.servesModel && { servesModel: !0 }),
    });
  if (consent !== void 0)
    Ee.messages = [...Ee.messages, createUserMessage({ content: consent, origin: { kind: "human" } })];
  let Ae = sUr(Z.name, h),
    Ie = createAssistantMessage({ content: [Ae], isVirtual: !0 }),
    now = Date.now();
  logForDebugging(`$.tool.call (${w}): ${Z.name} (${Object.keys(h).join(", ") || "no input"})`);
  let We = "",
    ze,
    lt = !1,
    Je = !1,
    nt = !1,
    pt = !1;
  try {
    for await (let yt of runToolUse(Ae, Ie, G.canUseTool, Ee, () => new Date().toISOString())) {
      let gt = unwrapUserMessage(yt);
      if (!gt) continue;
      let content = gt.message.content;
      if (typeof content === "string") continue;
      for (let It of content)
        if (It.type === "tool_result" && It.tool_use_id === Ae.id)
          ((pt = !0),
            (We = Brs(It.content)),
            (lt = It.is_error === !0),
            (nt = pUr(gt)),
            (Je = nt || gt.toolDenialKind !== void 0));
      if (gt.toolUseResult !== void 0 && ze === void 0)
        try {
          ze = Nyn(gt.toolUseResult);
        } catch {
          ze = void 0;
        }
    }
  } catch (error) {
    jLn(w, error, `$.tool.call(${Z.name})`);
  } finally {
    we();
  }
  if (!pt)
    throw new HooksError(
      `${w}: $.tool.call(${Z.name}) produced no result${abortController.signal.aborted ? " (aborted)" : ""}`,
    );
  if (
    (logForDebugging(
      `$.tool.call (${w}): ${Z.name} answered in ${Date.now() - now}ms, ${We.length} chars${Je ? ", denied" : lt ? ", isError" : ""}`,
    ),
    nt)
  )
    return { deny: We };
  if (Je) return { deny: We.replace(/^<tool_use_error>|<\/tool_use_error>$/g, "") };
  let Et = launchedAgentId(Z.name, ze);
  if (Et !== void 0 && n.isLaunchOnly) {
    let yt = awaitSpawnedAnswerForever({ registry: Ee.taskRegistry, agentId: Et, pluginName: w });
    return (
      n.leftRunning?.(
        yt.then(
          () => {
            return;
          },
          (gt) =>
            logForDebugging(`$.agent.spawn (${w}): waiting on Agent ${Et} failed: ${String(gt)}`, {
              level: "error",
            }),
        ),
      ),
      logForDebugging(`$.agent.spawn (${w}): Agent ${Et} started`),
      { result: NLn(Et, Peo(ze)), text: "" }
    );
  }
  if (Et !== void 0) {
    let yt = await awaitSpawnedAgentAnswer({
      registry: Ee.taskRegistry,
      agentId: Et,
      pluginName: w,
      signal: signal ?? abortController.signal,
    });
    if (yt.isError) {
      if (yt.settled) n.leftRunning?.(yt.settled);
      return $Ln(void 0, yt.text);
    }
    return (
      logForDebugging(
        `$.tool.call (${w}): Agent ${Et} settled in ${Date.now() - now}ms, ${yt.text.length} chars`,
      ),
      { result: NLn(Et, Peo(ze)), text: yt.text }
    );
  }
  return lt ? $Ln(ze, We) : { result: ze, text: We };
}
//@ chunk-e6aww6q8.js:3973570-3973672 placement
function checkServerNameReserved(e) {
  if (isBuiltinMcpServerName(e))
    throw new HooksError(`${e}: $.tool.register: "${e}" is a reserved MCP server name`);
}
//@ chunk-e6aww6q8.js:3973672-3973946 placement
function checkServerNameTaken(e, n, r) {
  if (EN.serverKey(n) !== void 0 || EN.minted(r)) return;
  let found = e.mcpServers().find((y) => normalizeNameForMCP(y) === normalizeNameForMCP(r));
  if (found === void 0) return;
  throw new HooksError(
    `${n}: $.tool.register: the session already has an MCP server named "${found}" in its MCP config; registering would replace it`,
  );
}
//@ chunk-e6aww6q8.js:3973946-3973958 placement
var F3r = 100;
//@ chunk-e6aww6q8.js:3973958-3973971 placement
var lat = 8000;
//@ chunk-e6aww6q8.js:3973971-3974541 placement
async function toolCheckForPlugin(e, n) {
  let { plugin: plugin, signal: signal } = n,
    { tool: tool, input: input } = e;
  if (!isPlainObject_4(input))
    throw new HooksError(`${plugin}: $.tool.check: input is the tool's arguments, an object`);
  let S = n.origin ?? [plugin],
    w = requireBoundSession(plugin, "$.tool.check"),
    L = qS(
      w.tools().filter((ke) => !isMultiEntryAliasTool(ke)),
      tool,
    );
  if (!L) throw new HooksError(`${plugin}: $.tool.check: no tool named "${tool}" in this session`);
  let abortController = new AbortController(),
    q = pluginToolContext(w, abortController, { plugin: plugin, origin: S }),
    Z = forwardAbort(signal, abortController),
    Se = createToolCheckCore(() => checkDeclarativePermission(L, input, q), L, q);
  try {
    return await W$n({
      signal: abortController.signal,
      origin: S,
      core: { "tool.check": Se.core },
    }).tool.check({
      tool: L.name,
      input: input,
      ...lqt(L),
      ...toolCheckApprover(L, q),
      ...checkToolReadOnly(L, input, q),
    });
  } finally {
    Z();
  }
}
/**
 * $.tool.list：列出会话工具（名字、截断后的描述、是否 MCP），描述按工具缓存。
 */
//@ chunk-e6aww6q8.js:3974541-3974849 placement
async function toolListOp(e) {
  let n = requireBoundSession(e, "$.tool.list"),
    filtered = n.tools().filter((h) => !isMultiEntryAliasTool(h)),
    s = getToolPermissionContext(n.toolContext(new AbortController()));
  return Promise.all(
    filtered.map(async (h) => ({
      name: h.name,
      description: await OLn.of(h, async () =>
        truncateToLength(
          await h.prompt({ getToolPermissionContext: async () => s, tools: filtered, agents: [] }),
          JHr,
        ),
      ),
      mcp: h.isMcp === !0,
    })),
  );
}
/**
 * 插件 $.tool.register：注册插件工具；--tools 为空或 --bare 会话中拒绝。
 */
//@ chunk-e6aww6q8.js:3974849-3976621 placement
async function toolRegisterForPlugin(e, n) {
  checkServerNameReserved(n);
  let r = requireBoundSession(n, "$.tool.register"),
    toolContext = r.toolContext(new AbortController());
  if (getToolPermissionContext(toolContext).builtInToolsDisabled === !0)
    throw new HooksError(
      `${n}: $.tool.register: "${e.name}" refused: this session has no built-in tools (--tools ""), so it takes none from plugins`,
    );
  if (isBareMode() && isBuiltinSuffixed(JC(n)))
    throw new HooksError(
      `${n}: $.tool.register: "${e.name}" refused: this session runs with --bare, which takes tools from the plugins its command line names and from no built-in one`,
    );
  let h = Iyt();
  if (!h)
    throw (
      logFeatureBad("plugin_function_hooks_register_tool", "no_registrar"),
      new HooksError(
        `${n}: $.tool.register: this host cannot add tools at run time (no in-process MCP server registrar installed)`,
      )
    );
  let y = registeredMcpToolName(r, e, n);
  if (y !== void 0)
    return (
      logForDebugging(`$.tool.register (${n}): ${y} unchanged and listed; not re-registered`),
      { tool: y }
    );
  let own = EN.own(n),
    { key: key, config: config } = h(n, [...new Map(own).set(e.name, e).values()]);
  (checkServerNameTaken(r, n, key), own.set(e.name, e), EN.keyed(n, key));
  let G = buildRawMcpToolName(key, e.name);
  logForDebugging(
    `$.tool.register (${n}): ${G} (${own.size} tool(s) on server ${jsonStringify(key)}); connecting`,
  );
  let now = Date.now(),
    abortController = new AbortController();
  try {
    await Promise.race([r.addMcpServer(key, config), sleep(lat, abortController.signal)]);
  } finally {
    abortController.abort();
  }
  if (
    isToolDroppedByDenyRules(getToolPermissionContext(toolContext), {
      name: G,
      mcpInfo: { serverName: key, toolName: e.name },
    })
  )
    return (
      logFeatureOk("plugin_function_hooks_register_tool", { withheld: !0 }),
      logForDebugging(
        `$.tool.register (${n}): ${G} registered; a deny rule withholds it from this session's tools, so not waiting for it to list`,
      ),
      { tool: G }
    );
  while (Date.now() - now < lat) {
    if (r.tools().some((we) => we.name === G))
      return (
        logFeatureOk("plugin_function_hooks_register_tool"),
        logForDebugging(`$.tool.register (${n}): ${G} visible after ${Date.now() - now}ms`),
        { tool: G }
      );
    await sleep(F3r);
  }
  return (
    logFeatureSad("plugin_function_hooks_register_tool", "not_yet_visible"),
    logForDebugging(
      `$.tool.register (${n}): ${G} not yet in the session's tools after ${lat}ms; resolving anyway`,
      { level: "warn" },
    ),
    { tool: G }
  );
}
//@ chunk-e6aww6q8.js:3976621-3976724 placement = getMcpPrefix (1)
var listServersInToolNames = (serverName) =>
  uniq(serverName.filter((n) => n.startsWith("mcp__")).map((n) => n.split("__")[1] ?? "")).join(", ") ||
  "none";
//@ chunk-e6aww6q8.js:3976724-3976788 placement = getMcpPrefix (1)
var mcpToolNameVariants = (e, n) =>
  new Set([buildRawMcpToolName(e, n), `mcp__${e}__${n}`, buildRawMcpToolName(e, normalizeNameForMCP(n))]);

export {
  createCancelledToolResult,
  v3r,
  findToolResultMessages,
  T3r,
  DY,
  noteToolTexts,
  checkToolReadOnly,
  toolCallForPlugin,
  mcpToolNameVariants,
  listServersInToolNames,
  toolCheckForPlugin,
  toolListOp,
  toolRegisterForPlugin,
};
