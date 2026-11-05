/**
 * plugins/functionHooks/sessionApi.ts
 *
 * 2.1.316 新增：插件 $.session.* 接口（读取、追加、发送、授权等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (90)
 * attribution: placement 76, sole-consumer 2, layout 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { isDeepStrictEqual } from "util";
import { CLONE_DEPTH_THRESHOLD } from "../../utils/structuredCloneLimits.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { HooksError } from "./hooksErrors.js";
import {
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  isOAuthBearerSource,
  getAnthropicApiKeyWithSourceSafe,
  getRequestCredentials,
  getAuthTokenSource,
  getAuthenticatedAccountInfo,
  getOauthAccountInfo,
} from "../../utils/auth.js";
import { getResolvedWIFBaseUrlSnapshot, getWIFCredentials } from "../../services/oauth/wifCredentials.js";
import { pluginInputHoldSlot, clearHeldInputAndReason, pluginInputHoldReason } from "./inputHold.js";
import { isPersonInitiated } from "./uiHooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { normalizeGitRemoteUrl, findCanonicalGitRoot } from "../../utils/git.js";
import { isAllowedGitRemote } from "../../utils/git/builderGit/gitEnv.js";
import { isInternalModelRepo } from "../../utils/commitAttribution.js";
import { projectRootFor } from "./panes.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import {
  COM_ANTHROPIC_PLUGIN_META_CUT,
  EDIT_SOURCE_KINDS,
  ANTHROPIC_SOURCES,
  COM_ANTHROPIC_SOURCES_RELAY,
  RANDOM_PLUGIN_META_ID,
  CLAUDE_OMITTED,
  utf8Length,
  MAX_REQUEST_META_BYTES,
  checkRequestMeta,
  toolInputText,
} from "./sites/toolSites.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logError } from "../../utils/log.js";
import { jsonCloneValue } from "./api/settingsRead.js";
import { truncateUiLog, reportPluginProblem } from "./hooksWorkerClient.js";
import { TEXT_PASSTHROUGH_CORES } from "./coreHandlers.js";
import { usableLauncherHostLoginToken } from "../../utils/auth/launcherHostLogin.js";
import { guardTelemetryCredentials } from "../../services/analytics/telemetryCredentialGuard.js";
import { getAuthHeadersAsync } from "../../utils/http.js";
import { compactNonInteractiveCommand } from "../../commands/compact/index.js";
import { currentTurn } from "./personHold.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { getMachineAdminPolicyTier, getVouchedAdminPolicyTier } from "../../utils/settings/settings.js";
import {
  isDiskless,
  getSessionId,
  getOriginalCwd,
  getSdkBetas,
  getSessionStartTime,
  getTotalCostUSD,
} from "../../bootstrap/state.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getEmail } from "../../utils/user.js";
import { getCwd } from "../../utils/cwd.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { EMPTY_MESSAGES } from "../../state/inProgressToolUses.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { noUncachedRoot } from "../../utils/settings/settingsStorage.js";
import { getRemoteUrlForDir } from "../../utils/git/gitFilesystem.js";
import { udsAddressFromPath, bridgeAddressFromToken } from "../../utils/peerMessageHeaders.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { runIgnoringAbort } from "./dispatch/dispatchScope.js";
import { countWhere } from "../../utils/collections.js";
import { buildContextWindowStatus, getLastApiUsage } from "../../utils/tokens.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { getContextWindow } from "../../utils/model/configs.js";
import { utilizationPercent, planWindowPercent } from "../../utils/format.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS_2 } from "./dispatch/slowHookReports.js";
import { getRawUtilization } from "../../services/claudeAiLimits.js";
import { pluginContextData } from "./contextDataApi.js";
import {
  sessionStartCallsSlot,
  sessionLoadRecord,
  RECORDS_SESSION_START,
  isAbortedCallResult,
  removeCall,
} from "./promptApi.js";
import { checkPaneId } from "./sites/siteRules.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isUiElementTypeName } from "./ui/renderSites.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:776711-776798 placement
/**
 * 字符串转文本块，数组浅拷贝
 */
function normalizeContentBlocks_2(content) {
  return typeof content === "string"
    ? [
        {
          type: "text",
          text: content,
        },
      ]
    : content.map((block) => ({
        ...block,
      }));
}
//@ chunk-5xgkngpb.js:776798-776876 placement
/**
 * 插件可见的消息形状
 */
function messageForPlugin(message) {
  let { role, content } = message.message;
  return {
    role,
    content: normalizeContentBlocks_2(content),
  };
}
//@ chunk-5xgkngpb.js:776876-777002 placement
function isHumanUserMessage(message) {
  let { role, content } = message.message;
  let hasToolResult = Array.isArray(content) && content.some((block) => block.type === "tool_result");
  return role === "user" && !hasToolResult;
}
//@ chunk-5xgkngpb.js:777002-777117 placement
function tailApiMessages(messages) {
  let isLong = messages.length > CLONE_DEPTH_THRESHOLD;
  let tail = isLong ? messages.slice(-CLONE_DEPTH_THRESHOLD) : messages;
  let startIndex = isLong ? Math.max(tail.findIndex(isHumanUserMessage), 0) : 0;
  return tail.slice(startIndex).map(messageForPlugin);
}
//@ chunk-5xgkngpb.js:777117-777337 placement
/**
 * 取当前绑定的会话，没有（REPL 未挂载且无无头会话）时抛 HooksError 说明该接口在此模式不可用。
 */
function requireBoundSession(pluginName, apiLabel) {
  let binding = currentSurfaceBinding();
  if (!binding)
    throw new HooksError(
      `${pluginName}: ${apiLabel} is not available in this mode: no session is bound in this process (the REPL has not mounted and no headless session is built); catch it and carry on`,
    );
  return binding;
}
//@ chunk-5xgkngpb.js:777337-777434 placement
/**
 * bearer 或 api-key
 */
function authKindOf(headers) {
  let hasAuthorization = "Authorization" in headers;
  let hasApiKey = "x-api-key" in headers;
  return hasAuthorization ? "bearer" : hasApiKey ? "api-key" : undefined;
}
//@ chunk-5xgkngpb.js:777434-777470 placement
var HTTPS_API_ANTHROPIC_COM = "https://api.anthropic.com";
//@ chunk-5xgkngpb.js:777470-777510 placement
/**
 * 无 API key 且用 WIF
 */
function isWifWithoutApiKey() {
  return getAnthropicApiKeySafe() === null && shouldUseWIFAuth();
}
//@ chunk-5xgkngpb.js:777510-777640 placement
function workloadIdentityHost(endpointUrl) {
  let resolvedWIFBaseUrlSnapshot = getResolvedWIFBaseUrlSnapshot();
  if (resolvedWIFBaseUrlSnapshot === undefined) return;
  if (resolvedWIFBaseUrlSnapshot === null) return new URL(endpointUrl).host;
  return URL.canParse(resolvedWIFBaseUrlSnapshot) ? new URL(resolvedWIFBaseUrlSnapshot).host : undefined;
}
//@ chunk-5xgkngpb.js:777640-777683 placement
/**
 * 以 / 开头
 */
var isSlashCommandText = (text) => text.trimStart().startsWith("/");
//@ chunk-5xgkngpb.js:777683-777695 placement
/**
 * 200
 */
var MAX_SESSION_TEXT_CHARS = 200;
//@ chunk-5xgkngpb.js:777695-777711 placement
var LATER = "later";
//@ chunk-5xgkngpb.js:777749-777957 placement
/**
 * 插件提交前检查输入暂扣：符合条件的按键可解除暂扣，否则返回拒绝原因并记录。
 */
function submitHoldRefusal(caller, apiLabel) {
  let hold = pluginInputHoldSlot.get();
  let session = hold?.session.deref();
  if (
    session !== undefined &&
    session === currentSurfaceBinding() &&
    (caller.vouchedPressAt ?? -1) >= (hold?.stoppedAt ?? 0) &&
    isPersonInitiated(caller)
  )
    clearHeldInputAndReason();
  let reason = pluginInputHoldReason();
  if (reason !== undefined) logForDebugging(`${apiLabel} (${caller.plugin}): refused: ${reason}`);
  return reason;
}
//@ chunk-5xgkngpb.js:777957-777993 placement
/**
 * 宿主级一次性槽位：SessionStart 钩子在这里登记「已提前启动」，供后续判决是否允许等待启动。
 */
var sessionStartHostRefusedSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:777957", () => {
  sessionStartHostRefusedSlot = identity_2(createValueSlot(), (sessionStartHostRefusedSlot) =>
    sessionStartHostRefusedSlot.set(undefined),
  );
});
//@ chunk-5xgkngpb.js:777993-778336 placement
/**
 * 拒绝在 classic.SessionStart 钩子里等待会话启动（宿主提前启动时会自锁），返回给用户的原因文本并记日志。
 */
function checkPromptSubmitArgs(hookContext, hookName) {
  if (!(hookContext.rootEvent === "classic.SessionStart" && sessionStartHostRefusedSlot.get()?.() === true))
    return;
  let refusalReason =
    "called from a classic.SessionStart hook in a session that a host started ahead of time, it would wait on the start-up this hook is holding; run it from session.start or a later event (turn.complete)";
  logForDebugging(`${hookName} (${hookContext.plugin}): refused: ${refusalReason}`);
  return refusalReason;
}
//@ chunk-5xgkngpb.js:781490-781733 sole-consumer (2.1.88 match: isOfficialRepo, 1)
function isOfficialRepo(urlOrSpec) {
  let [, ...segments] = (normalizeGitRemoteUrl(urlOrSpec.replace(/\/+$/, "")) ?? "")
    .split("/")
    .filter((segment) => segment !== "");
  if (!segments.every((segment) => /^[a-z0-9_][a-z0-9._-]*$/i.test(segment))) return null;
  let isOwnerRepo = segments.length === 2;
  let isBareRepo = segments.length === 1;
  return isOwnerRepo ? `${segments[0]}/${segments[1]}` : isBareRepo ? `anthropics/${segments[0]}` : null;
}
//@ chunk-5xgkngpb.js:781733-781823 sole-consumer
/**
 * 官方仓库才返回
 */
function officialRepoOrNull(repo) {
  let urlOrSpec = `https://github.com/${repo}`;
  return repo !== null && isOfficialRepo(urlOrSpec) === repo && isAllowedGitRemote(urlOrSpec) ? repo : null;
}
//@ chunk-5xgkngpb.js:781823-781893 placement
/**
 * 含 tool_result 块
 */
var hasToolResultBlock = (content) =>
  typeof content !== "string" && content.some((block) => block.type === "tool_result");
//@ chunk-5xgkngpb.js:781893-781918 placement
/**
 * 是否内部模型仓库
 */
var isInternalRepo = (cwd) => isInternalModelRepo(projectRootFor(cwd));
//@ chunk-5xgkngpb.js:781918-781948 placement
/**
 * 允许的 git 远程
 */
var isAllowedRemote = (urlOrSpec) => urlOrSpec !== null && isAllowedGitRemote(urlOrSpec);
//@ chunk-5xgkngpb.js:781948-781977 placement
/**
 * 空的异步实现
 */
async function noopAsync_2(value) {
  return;
}
//@ chunk-5xgkngpb.js:781977-782077 placement (2.1.88 match: isOfficialRepo, 1)
async function isOfficialRepo_2(cwd, urlOrSpec) {
  let repo =
    cwd !== null
      ? `anthropics/${await noopAsync_2(cwd)}`
      : isAllowedRemote(urlOrSpec)
        ? isOfficialRepo(urlOrSpec)
        : null;
  return officialRepoOrNull(repo);
}
//@ chunk-5xgkngpb.js:782077-782127 placement
/**
 * 开关开启才查
 */
var officialRepoIfEnabled = (cwd, remoteUrlForDir, isEnabled) =>
  isEnabled ? isOfficialRepo_2(cwd, remoteUrlForDir) : Promise.resolve(null);
//@ chunk-5xgkngpb.js:782127-782175 placement
/**
 * tengu_snappy_plum 开关
 */
function isSnappyPlumOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_snappy_plum", false);
}
//@ chunk-5xgkngpb.js:782175-782490 placement
/**
 * 从 MCP 结果 _meta 中挑出给插件的字段（大小受限，被裁剪的记入 omitted）。
 */
function pluginMetaForPlugins(meta) {
  if (!isSnappyPlumOn() || !isPlainObject_6(meta)) return;
  let kept = {};
  let omitted = [];
  let omittedList = meta[COM_ANTHROPIC_PLUGIN_META_CUT];
  for (let field of EDIT_SOURCE_KINDS) {
    let isOmitted = Array.isArray(omittedList) && omittedList.includes(field);
    if (!isOmitted && (!Object.hasOwn(meta, field) || meta[field] === undefined)) continue;
    if (field === ANTHROPIC_SOURCES && meta[COM_ANTHROPIC_SOURCES_RELAY] !== RANDOM_PLUGIN_META_ID) continue;
    if (!isOmitted && isMetaFieldSmall(field, meta[field])) kept[field] = meta[field];
    else omitted.push(field);
  }
  if (omitted.length > 0) kept[CLAUDE_OMITTED] = omitted;
  return Object.keys(kept).length === 0 ? undefined : kept;
}
//@ chunk-5xgkngpb.js:782490-782728 placement
function isMetaFieldSmall(field, value) {
  try {
    let size = utf8Length(jsonStringify(value));
    if (size > MAX_REQUEST_META_BYTES)
      logForDebugging(
        `What a server addressed to plugins under ${field} is ${size} bytes, over ${MAX_REQUEST_META_BYTES}: left out`,
        {
          level: "warn",
        },
      );
    return size <= MAX_REQUEST_META_BYTES;
  } catch (error) {
    logMetaError("measuring what a server addressed to plugins", error);
    return false;
  }
}
//@ chunk-5xgkngpb.js:782728-782893 placement
/**
 * 把请求 meta 中的字符串字段挑出（启用且无问题时）。
 */
function stringRequestMeta(requestMeta) {
  if (
    !isSnappyPlumOn() ||
    !isPlainObject_6(requestMeta) ||
    Object.keys(requestMeta).length === 0 ||
    checkRequestMeta(requestMeta) !== undefined
  )
    return;
  let stringFields = {};
  for (let [key, value] of Object.entries(requestMeta))
    if (typeof value === "string") stringFields[key] = value;
  return stringFields;
}
//@ chunk-5xgkngpb.js:782893-782993 placement
function logMetaError(what, error) {
  if (error instanceof TypeError) {
    logForDebugging(`Failed ${what}: ${error.name}`, {
      level: "warn",
    });
    return;
  }
  logError(error);
}
//@ chunk-5xgkngpb.js:782993-783074 placement
/**
 * 构造插件可见用户行
 */
var userRowForPlugin = (text, toolResults) => ({
  role: "user",
  text,
  toolUses: [],
  ...(toolResults.length > 0 && {
    toolResults,
  }),
});
//@ chunk-5xgkngpb.js:783074-783808 placement (2.1.88 match: createUserMessage, 0.418)
/**
 * 把会话消息转换为插件可见形状：助手消息给文本与 tool_use，用户消息给文本与 tool_result（含结果与 meta），跳过 meta/虚拟消息。
 */
function toPluginMessage(message) {
  if (message.type === "assistant") {
    let content = message.message.content;
    let toolUses = [];
    let texts = [];
    for (let block of content)
      if (block.type === "text") texts.push(block.text);
      else if (block.type === "tool_use")
        toolUses.push({
          tool_use_id: block.id,
          tool: block.name,
          input: jsonCloneValue(block.input),
        });
    return {
      role: "assistant",
      text: texts.join(""),
      toolUses,
    };
  }
  if (message.type !== "user") return;
  if (message.isMeta === true || message.isVirtual === true) return;
  let content = message.message.content;
  if (typeof content === "string") return userRowForPlugin(content, []);
  let texts = [];
  let toolResults = [];
  let hasToolUseResult = message.toolUseResult !== undefined;
  let meta = pluginMetaForPlugins(message.mcpMeta?._meta);
  let clonedMeta = meta === undefined ? undefined : jsonCloneValue(meta);
  for (let block of content)
    if (block.type === "text") texts.push(block.text);
    else if (block.type === "tool_result")
      toolResults.push({
        tool_use_id: block.tool_use_id,
        text: toolInputText(block.content),
        isError: block.is_error === true,
        ...(hasToolUseResult && {
          result: message.toolUseResult,
        }),
        ...(clonedMeta &&
          block.is_error !== true && {
            meta: clonedMeta,
          }),
      });
  return userRowForPlugin(texts.join(""), toolResults);
}
//@ chunk-5xgkngpb.js:783808-783851 placement
/**
 * URL 里的用户信息
 */
var URL_USERINFO_RE = /^([a-z][a-z0-9+.-]*:\/\/)[^/]*@/i;
//@ chunk-5xgkngpb.js:783851-784021 placement
function runUiNoticeOp({ event, pluginName, text, run }) {
  let binding = currentSurfaceBinding();
  let shownText = truncateUiLog(text);
  if (binding === undefined) {
    logForDebugging(`${event} (${pluginName}): no session bound; dropped: ${shownText}`);
    return;
  }
  logForDebugging(`${event} (${pluginName}): ${shownText}`);
  run(binding);
}
//@ chunk-5xgkngpb.js:784021-784086 placement
/**
 * 去掉 URL 凭证
 */
function stripUrlUserinfo_2(remoteUrlForDir) {
  return typeof remoteUrlForDir === "string"
    ? remoteUrlForDir.replace(URL_USERINFO_RE, "$1")
    : remoteUrlForDir;
}
//@ chunk-5xgkngpb.js:788900-789016 placement
/**
 * $.ui.status：设置或清除插件在状态区的文字。
 */
var uiStatusOp = (text, pluginName) =>
  runUiNoticeOp({
    event: "$.ui.status",
    pluginName,
    text: text ?? "(cleared)",
    run: (binding) => binding.status(pluginName, text === undefined ? text : truncateUiLog(text)),
  });
//@ chunk-5xgkngpb.js:789016-789125 placement
/**
 * $.ui.toast：弹出插件提示（文本截断，可设超时）。
 */
var uiToastOp = ({ text, timeoutMs }, pluginName) =>
  runUiNoticeOp({
    event: "$.ui.toast",
    pluginName,
    text,
    run: (binding) => binding.toast(pluginName, truncateUiLog(text), timeoutMs),
  });
//@ chunk-5xgkngpb.js:789125-789310 placement
/**
 * $.session.append：把插件消息追加到会话（没有对话的进程中拒绝）。
 */
async function sessionAppendOp(message, caller) {
  let appendCores = TEXT_PASSTHROUGH_CORES.get();
  if (appendCores === null)
    throw new HooksError(
      `${caller.plugin}: $.session.append: this process keeps no conversation to append to`,
    );
  return (await appendCores()).pluginAppended(message, caller);
}
//@ chunk-5xgkngpb.js:789348-789358 placement
/**
 * 4
 */
var MAX_AUTH_HANDLES = 4;
//@ chunk-5xgkngpb.js:789358-789690 placement
/**
 * 授权句柄登记表：mint 为插件生成 auth_ 句柄（每插件最多保留 4 个），resolve 只认同一插件。
 */
function createAuthHandleRegistry() {
  let handles = new Map();
  let byPlugin = new Map();
  function noteHandle(plugin, handle) {
    let pluginHandles = [...(byPlugin.get(plugin) ?? []), handle];
    while (pluginHandles.length > MAX_AUTH_HANDLES) {
      let oldest = pluginHandles.shift();
      if (oldest !== undefined) handles.delete(oldest);
    }
    byPlugin.set(plugin, pluginHandles);
  }
  return {
    mint: (plugin, headers, host) => {
      let handle = `auth_${randomUUID().replace(/-/g, "")}`;
      handles.set(handle, {
        plugin,
        headers,
        host,
      });
      noteHandle(plugin, handle);
      return handle;
    },
    resolve: (plugin, handle) => {
      let entry = handles.get(handle);
      return entry?.plugin === plugin ? entry : undefined;
    },
  };
}
//@ chunk-5xgkngpb.js:789690-789704 placement
/**
 * 授权句柄登记表
 */
var authHandleRegistry; // deferred: uses createAuthHandleRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:789690", () => {
  authHandleRegistry = createAuthHandleRegistry();
});
//@ chunk-5xgkngpb.js:789704-790378 placement
/**
 * 插件 $.session.authorize：生成访问第一方服务的授权句柄。
 */
async function sessionAuthorizeForPlugin(plugin) {
  if (usableLauncherHostLoginToken() !== null) {
    logForDebugging(
      `$.session.authorize (${plugin}): no first-party credential (the desktop app's sign-in is not lent to plugins)`,
    );
    return null;
  }
  let isWif = isWifWithoutApiKey();
  if (isWif) await getWIFCredentials().catch(() => null);
  let host = new URL(HTTPS_API_ANTHROPIC_COM).host;
  let wifHost = isWif ? workloadIdentityHost(HTTPS_API_ANTHROPIC_COM) : host;
  let credentials =
    wifHost === host
      ? guardTelemetryCredentials(await getAuthHeadersAsync(), HTTPS_API_ANTHROPIC_COM)
      : {
          headers: {},
          error: "the workload-identity token is minted for a different host",
        };
  let kind = authKindOf(credentials.headers);
  let isWifAfter = isWifWithoutApiKey();
  let wifHostAfter = isWifAfter ? workloadIdentityHost(HTTPS_API_ANTHROPIC_COM) : host;
  let hasMoved = isWifAfter !== isWif || wifHostAfter !== wifHost;
  let problem =
    credentials.error ??
    (hasMoved ? "the auth mode or workload-identity resolution moved while authorizing" : undefined);
  if (problem !== undefined || kind === undefined) {
    logForDebugging(
      `$.session.authorize (${plugin}): no first-party credential (${problem ?? "no bearer or api key"})`,
    );
    return null;
  }
  return {
    handle: authHandleRegistry.mint(plugin, credentials.headers, host),
    kind,
  };
}
//@ chunk-5xgkngpb.js:791513-792143 placement
/**
 * 插件 $.session.compact：在回合之间压缩对话，压缩关闭或回合进行中时拒绝。
 */
async function sessionCompactForPlugin(args, plugin, origin = [plugin]) {
  if (!compactNonInteractiveCommand.isEnabled())
    throw new HooksError(
      `${plugin}: $.session.compact: compaction is switched off in this session (DISABLE_COMPACT), for /compact and plugins alike`,
    );
  let turn = currentTurn();
  if (turn !== undefined)
    throw new HooksError(
      `${plugin}: $.session.compact: a turn is running (${turn.turnId}); the conversation compacts between turns, so call it from turn.complete or later`,
    );
  let session = requireBoundSession(plugin, "$.session.compact");
  logForDebugging(
    `$.session.compact (${plugin}): compacting, ${(args.instructions ?? "").length} chars of instructions`,
  );
  try {
    return await session.compact({
      instructions: args.instructions ?? "",
      origin,
    });
  } catch (error) {
    throw new HooksError(`${plugin}: $.session.compact: ${toError(error).message}`);
  }
}
//@ chunk-5xgkngpb.js:792143-792319 placement
function authKindOf_2(authKind, tokenSource) {
  let isConsole = authKind === "profile" || tokenSource === "/login managed key";
  let isNone = authKind === "none" && tokenSource === "none";
  return authKind === "claude.ai"
    ? "claude.ai"
    : isOAuthBearerSource(authKind)
      ? "oauth-token"
      : isConsole
        ? "console"
        : isNone
          ? "none"
          : "api-key";
}
//@ chunk-5xgkngpb.js:792319-792588 placement
/**
 * $.session.identity 拒绝：只回答被托管设置启用并命名的插件。
 */
function identityRefusal(plugin) {
  logForDebugging(
    `$.session.identity (${plugin}): refused; not a plugin managed settings enable and name the source of`,
  );
  return {
    deny: `$.session.identity answers only a mod that managed settings enable and that is loaded in place from a source they name; ${plugin} is not one`,
  };
}
//@ chunk-5xgkngpb.js:792588-792730 placement
function isForcedOrg(organizationUuid) {
  let forceLoginOrgUUID =
    getMachineAdminPolicyTier()?.forceLoginOrgUUID ?? getVouchedAdminPolicyTier()?.forceLoginOrgUUID;
  return (
    organizationUuid !== undefined &&
    (typeof forceLoginOrgUUID === "string" ? [forceLoginOrgUUID] : (forceLoginOrgUUID ?? [])).includes(
      organizationUuid,
    ) &&
    !isDiskless()
  );
}
//@ chunk-5xgkngpb.js:792730-792792 placement
var SKIP_API_KEY_HELPER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:792730", () => {
  SKIP_API_KEY_HELPER = Object.freeze({
    skipRetrievingKeyFromApiKeyHelper: true,
  });
});
//@ chunk-5xgkngpb.js:792792-792889 placement
/**
 * 请求凭证与来源
 */
function credentialSources() {
  let source = getAnthropicApiKeyWithSourceSafe(SKIP_API_KEY_HELPER).source;
  let requestCredentials = getRequestCredentials(getAuthTokenSource().source, source);
  return [requestCredentials.tokenSource, requestCredentials.apiKey ? source : "none"];
}
//@ chunk-5xgkngpb.js:793009-793481 placement
/**
 * $.session.identity：返回认证类型；第一方且组织被托管策略强制登录时给出组织 id、类型与邮箱。
 */
function sessionIdentity() {
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty")
    return {
      kind: apiProvider,
      isVerified: false,
    };
  let [credentialSource, credentialDetail] = credentialSources();
  let kind = authKindOf_2(credentialSource, credentialDetail);
  let authenticatedAccountInfo = getAuthenticatedAccountInfo();
  let oauthAccountInfo =
    credentialSource === "claude.ai" || credentialDetail === "/login managed key"
      ? getOauthAccountInfo()
      : undefined;
  let hasOrganization = authenticatedAccountInfo?.organizationUuid !== undefined;
  let accountInfo = hasOrganization ? authenticatedAccountInfo : oauthAccountInfo;
  let organizationUuid = accountInfo?.organizationUuid;
  if (organizationUuid === undefined || !isForcedOrg(organizationUuid))
    return {
      kind,
      isVerified: false,
    };
  let organizationType =
    oauthAccountInfo?.organizationUuid === organizationUuid
      ? (oauthAccountInfo?.organizationType ?? undefined)
      : undefined;
  let emailAddress = accountInfo?.emailAddress;
  return {
    kind,
    organizationId: organizationUuid,
    ...(organizationType !== undefined && {
      organizationType,
    }),
    ...(emailAddress !== undefined && {
      email: emailAddress,
    }),
    isVerified: hasOrganization,
  };
}
//@ chunk-5xgkngpb.js:793481-793568 layout
function sessionIdentityWithEmail() {
  let identity = sessionIdentity();
  let email = getEmail();
  return identity.deny === undefined && email !== undefined
    ? {
        ...identity,
        email,
      }
    : identity;
}
//@ chunk-5xgkngpb.js:793568-793770 placement
/**
 * $.session：返回会话 id、cwd、项目根与当前模型（无会话时取进程值）。
 */
async function sessionInfoOp(plugin, cwd) {
  let binding = currentSurfaceBinding();
  if (binding === undefined)
    logForDebugging(`$.session (${plugin}): no session bound; id, cwd and model answered from the process`);
  return {
    id: String(getSessionId()),
    cwd: cwd ?? getCwd(),
    root: getOriginalCwd(),
    model: binding?.model() ?? getMainLoopModel(),
  };
}
//@ chunk-5xgkngpb.js:793770-793969 placement
function createHeldConversations() {
  let heldByAgentId = new Map();
  return {
    hold: (agentId, messages) => {
      let token = Symbol(agentId);
      heldByAgentId.set(agentId, {
        token,
        messages,
      });
      return () => {
        if (heldByAgentId.get(agentId)?.token === token) heldByAgentId.delete(agentId);
      };
    },
    current: (agentId) => heldByAgentId.get(agentId)?.messages,
    clear: () => {
      heldByAgentId.clear();
    },
  };
}
//@ chunk-5xgkngpb.js:793969-794004 placement
/**
 * 已持有会话表
 */
var heldConversations; // deferred: uses createHeldConversations of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:793969", () => {
  heldConversations = identity_2(createHeldConversations(), (store) => {
    store.clear();
  });
});
//@ chunk-5xgkngpb.js:794004-794282 placement
async function readSavedAgentMessages(session, agentId) {
  try {
    let savedMessages = await session.savedAgentMessages(agentId);
    if (!savedMessages) return;
    let knownUuids = new Set(session.messages().map((message) => message.uuid));
    return savedMessages.filter((savedMessage) => !knownUuids.has(savedMessage.uuid));
  } catch (error) {
    logForDebugging(
      `$.session.messages: the saved transcript of agent ${agentId} could not be read: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
}
//@ chunk-5xgkngpb.js:794282-794738 placement
/**
 * 把本地代理或进程内队友任务描述为统一形状：id、队友 id、描述、类型、父 id、名字。
 */
function describeAgentTask(task) {
  switch (task.type) {
    case "local_agent":
      return {
        id: task.agentId,
        teammateId: undefined,
        description: task.description,
        type: task.agentType,
        parentId: task.parentAgentId,
        name: undefined,
      };
    case "in_process_teammate":
      return {
        id: task.identity.resumableAgentId ?? task.identity.agentId,
        teammateId: task.identity.agentId,
        description: task.spawnedWith.description ?? task.description,
        type: task.spawnedWith.agentType || "teammate",
        parentId: task.spawnedWith.parentAgentId,
        name: task.identity.agentName,
      };
    default:
      return;
  }
}
//@ chunk-5xgkngpb.js:794738-794851 placement
/**
 * 按代理 id 找任务（优先未结束的，否则最后一个）。
 */
function findAgentTask(tasks, agentId) {
  let filtered = Object.values(tasks).filter((task) => describeAgentTask(task)?.id === agentId);
  return filtered.find((task) => !isTerminalTaskStatus(task.status)) ?? filtered.at(-1);
}
//@ chunk-5xgkngpb.js:794851-795073 placement
/**
 * 取代理任务的转录消息（不可恢复的队友或 fork worker 返回 undefined）。
 */
function agentTranscriptMessages(taskRegistry, agentId) {
  let agentTask = findAgentTask(taskRegistry.all(), agentId);
  if (agentTask === undefined) return;
  return (
    agentTask.type === "in_process_teammate"
      ? agentTask.identity.resumableAgentId === undefined
      : agentTask.type === "local_agent" && agentTask.forkWorker === true
  )
    ? undefined
    : (taskRegistry.getTranscript(agentTask.id)?.messages ?? EMPTY_MESSAGES);
}
//@ chunk-5xgkngpb.js:795073-795294 placement
async function agentConversation(session, agentId) {
  let savedAgentMessages = await readSavedAgentMessages(session, agentId);
  let transcript =
    agentTranscriptMessages(session.toolContext(new AbortController()).taskRegistry, agentId) ??
    heldConversations.current(agentId);
  if (!savedAgentMessages) return transcript;
  let heldMessages = transcript ?? [];
  let knownUuids = new Set(heldMessages.map((message) => message.uuid));
  return [
    ...savedAgentMessages.filter((savedAgentMessage) => !knownUuids.has(savedAgentMessage.uuid)),
    ...heldMessages,
  ];
}
//@ chunk-5xgkngpb.js:795294-795501 placement
/**
 * turn.complete 期间暂存某代理的对话，返回释放函数。
 */
function holdAgentConversation(agentId) {
  try {
    let binding = currentSurfaceBinding();
    let transcript =
      binding && agentTranscriptMessages(binding.toolContext(new AbortController()).taskRegistry, agentId);
    return transcript ? heldConversations.hold(agentId, transcript) : () => {};
  } catch (error) {
    logForDebugging(`turn.complete (agent ${agentId}): conversation not held: ` + errorMessage(error));
    return () => {};
  }
}
//@ chunk-5xgkngpb.js:795501-795653 placement (2.1.88 match: _temp, 0.598)
function agentResultSummary(result) {
  if (!isPlainObject_6(result)) return {};
  let { agentId, totalDurationMs } = result;
  return {
    ...(typeof agentId === "string" && {
      agentId,
    }),
    ...(typeof totalDurationMs === "number" && {
      durationMs: totalDurationMs,
    }),
  };
}
//@ chunk-5xgkngpb.js:795653-795968 placement
/**
 * 生成映射函数：给 tool_use 附上对应结果文本、错误、meta，以及（Agent/Task 工具）子代理 id 与耗时。
 */
var attachToolResults = (resultsById, agentIdFor) => (toolUse) => {
  let isAgentTool = toolUse.tool === AGENT || toolUse.tool === TASK;
  let result = resultsById.get(toolUse.tool_use_id);
  let agentId = isAgentTool ? agentIdFor?.(toolUse.tool_use_id) : undefined;
  let hasResult = result !== undefined && "result" in result;
  return {
    ...toolUse,
    ...(hasResult && {
      result: result.result,
    }),
    ...(result !== undefined && {
      text: result.text,
    }),
    ...(result?.isError === true && {
      isError: true,
    }),
    ...(result?.meta !== undefined && {
      meta: result.meta,
    }),
    ...(agentId !== undefined && {
      agentId,
    }),
    ...(isAgentTool && agentResultSummary(result?.result)),
  };
};
//@ chunk-5xgkngpb.js:795968-796211 placement
function toPluginTranscript(messages, agentIdFor) {
  let rows = [];
  let resultsById = new Map();
  let attachResults = attachToolResults(resultsById, agentIdFor);
  for (let message of messages.toReversed()) {
    if (rows.length === CLONE_DEPTH_THRESHOLD) break;
    let pluginMessage = toPluginMessage(message);
    if (!pluginMessage) continue;
    for (let toolResult of pluginMessage.toolResults ?? [])
      resultsById.set(toolResult.tool_use_id, toolResult);
    rows.push({
      ...pluginMessage,
      toolUses: pluginMessage.toolUses.map(attachResults),
    });
  }
  return rows.reverse();
}
//@ chunk-5xgkngpb.js:796211-796371 placement
function toolUseAgentMap(taskRegistry) {
  let byToolUseId = new Map();
  for (let task of Object.values(taskRegistry.all())) {
    let agent = describeAgentTask(task);
    if (agent !== undefined && task.toolUseId !== undefined) byToolUseId.set(task.toolUseId, agent.id);
  }
  return (toolUseId) => byToolUseId.get(toolUseId);
}
//@ chunk-5xgkngpb.js:796371-796773 placement
/**
 * $.session.messages：返回主线程或指定代理的对话（as: "api" 时为请求消息尾部）；代理不存在时拒绝。
 */
async function sessionMessagesOp(args, plugin) {
  let session = requireBoundSession(plugin, "$.session.messages");
  let { agentId } = args;
  let isApi = args.as === "api";
  let messages = agentId === undefined ? session.messages() : await agentConversation(session, agentId);
  if (!messages)
    return {
      deny: `no conversation of agent ${agentId} in this session: not one of its agents, running in another process, or finished with no saved transcript this session reads back`,
    };
  return isApi
    ? tailApiMessages(session.requestMessages(messages))
    : toPluginTranscript(messages, toolUseAgentMap(session.toolContext(new AbortController()).taskRegistry));
}
//@ chunk-5xgkngpb.js:796773-796958 placement
/**
 * $.session.repo：返回 git 根、远程地址、是否内部仓库与名字。
 */
async function sessionRepoOp(cwd) {
  let startCwd = cwd ?? getCwd();
  let uncachedRoot = noUncachedRoot(startCwd);
  let root = uncachedRoot ?? findCanonicalGitRoot(startCwd);
  if (root === null) return null;
  let [remoteUrlForDir, isInternal] = await Promise.all([getRemoteUrlForDir(startCwd), isInternalRepo(cwd)]);
  return {
    root,
    remote: stripUrlUserinfo_2(remoteUrlForDir),
    internal: isInternal,
    name: await officialRepoIfEnabled(uncachedRoot, remoteUrlForDir, isInternal),
  };
}
//@ chunk-5xgkngpb.js:796958-797270 placement
/**
 * 解析会话地址：活跃会话用其 socket，否则 session_/cse_ 前缀视为远程会话。
 */
async function resolveSessionAddress(sessionId, findLive) {
  let liveSession = await findLive(sessionId);
  if (liveSession !== null)
    return {
      to: udsAddressFromPath(liveSession.sock),
    };
  return sessionId.startsWith("session_") || sessionId.startsWith("cse_")
    ? {
        to: bridgeAddressFromToken(sessionId),
      }
    : {
        reason: `no live session on this machine has id ${sessionId} (a session that exited, or another machine's; a Remote Control or cloud session is addressed by its session_... id)`,
      };
}
//@ chunk-5xgkngpb.js:797270-797413 placement
function resolveSendTarget(target, findLive) {
  if (typeof target === "string")
    return Promise.resolve({
      to: target,
    });
  return "agentId" in target
    ? Promise.resolve({
        to: target.agentId,
      })
    : resolveSessionAddress(target.sessionId, findLive);
}
//@ chunk-5xgkngpb.js:797413-797463 placement
/**
 * SendMessage 未投递
 */
var SEND_MESSAGE_NOT_DELIVERED = "the SendMessage tool did not deliver it";
//@ chunk-5xgkngpb.js:797463-797716 placement
function sendResultOf(outcome) {
  if (outcome.deny !== undefined)
    return {
      isDelivered: false,
      reason: outcome.deny,
    };
  let result = isPlainObject_6(outcome.result) ? outcome.result : undefined;
  if (outcome.isError !== true && result?.success === true)
    return {
      isDelivered: true,
    };
  let message = result?.message;
  return {
    isDelivered: false,
    reason:
      typeof message === "string" && message !== "" ? message : outcome.text || SEND_MESSAGE_NOT_DELIVERED,
  };
}
//@ chunk-5xgkngpb.js:797716-798082 placement
/**
 * 求队友的投递地址（按 agentId 找正在运行的进程内队友）。
 */
function teammateAddressFor(target, tasks) {
  let agentId = typeof target === "object" && "agentId" in target ? target.agentId : undefined;
  let [teammateName] = tasks.flatMap((task) =>
    agentId !== undefined &&
    task.type === "in_process_teammate" &&
    !isTerminalTaskStatus(task.status) &&
    (task.identity.agentId === agentId || task.identity.resumableAgentId === agentId)
      ? [task.identity.agentName]
      : [],
  );
  let hasTeammate = teammateName !== undefined;
  let looksLikeAddress = agentId?.includes("@") === true;
  return hasTeammate
    ? {
        to: teammateName,
      }
    : looksLikeAddress
      ? {
          reason: `no live teammate of this session has the address ${agentId}`,
        }
      : undefined;
}
//@ chunk-5xgkngpb.js:798082-798961 placement
/**
 * 插件 $.session.send：经 SendMessage 向其他会话发消息。
 */
async function sessionSendForPlugin(args, caller, deps) {
  let { plugin, signal, origin } = caller;
  let session = requireBoundSession(plugin, "$.session.send");
  if (!session.tools().some((tool) => tool.name === SENDMESSAGE))
    return {
      isDelivered: false,
      reason: "this session has no SendMessage tool (messaging between sessions and agents is not on here)",
    };
  let { taskRegistry } = session.toolContext(new AbortController());
  let address =
    teammateAddressFor(args.to, Object.values(taskRegistry.all())) ??
    (await resolveSendTarget(args.to, deps.findLive));
  if (address.reason !== undefined) {
    logForDebugging(`$.session.send (${plugin}): not sent: ${address.reason}`);
    return {
      isDelivered: false,
      reason: address.reason,
    };
  }
  logForDebugging(
    `$.session.send (${plugin}): to ${address.to}: ` +
      jsonStringify(truncateToLength(args.text, MAX_SESSION_TEXT_CHARS)),
  );
  let readState = {
    isRead: false,
  };
  runIgnoringAbort(() => {
    submitHoldRefusal(caller, "$.session.send");
    readState.isRead = true;
  });
  if (!readState.isRead)
    return {
      isDelivered: false,
      reason: "the hold on plugins' input could not be read",
    };
  let outcome = await deps.run(
    {
      tool: SENDMESSAGE,
      to: address.to,
      message: args.text,
    },
    {
      plugin,
      signal,
      origin,
    },
  );
  let result = sendResultOf(outcome);
  logForDebugging(
    `$.session.send (${plugin}): ` + (result.isDelivered ? "delivered" : `not delivered: ${result.reason}`),
  );
  return result;
}
//@ chunk-5xgkngpb.js:798961-799160 placement
/**
 * $.session.turns：统计人类发起的用户消息数（不含 meta、虚拟与工具结果）。
 */
async function sessionTurnsOp(plugin) {
  let binding = currentSurfaceBinding();
  if (!binding) {
    logForDebugging(`$.session.turns (${plugin}): no session bound; 0`);
    return 0;
  }
  return countWhere(
    binding.messages(),
    (message) =>
      message.type === "user" &&
      message.isMeta !== true &&
      message.isVirtual !== true &&
      !hasToolResultBlock(message.message.content),
  );
}
//@ chunk-5xgkngpb.js:3788755-3788804 placement
/**
 * 用量窗口对象
 */
var usageWindow = (tokens, windowKind, percent) => ({
  tokens,
  window: windowKind,
  percent,
});
//@ chunk-5xgkngpb.js:3788804-3789016 placement
function contextUsageOf(messages, model) {
  let contextWindowStatus = buildContextWindowStatus(
    getLastApiUsage(messagesSinceCompactBoundary([...messages])),
    getContextWindow(model, getSdkBetas()),
  );
  let usedPercentage =
    contextWindowStatus.total_input_tokens === 0 ? null : contextWindowStatus.used_percentage;
  if (usedPercentage === null)
    return {
      window: contextWindowStatus.context_window_size,
    };
  return usageWindow(
    contextWindowStatus.total_input_tokens,
    contextWindowStatus.context_window_size,
    usedPercentage,
  );
}
//@ chunk-5xgkngpb.js:3789016-3789158 placement
var rateLimitWindow = (kind, rawWindow) => ({
  kind,
  percentUsed:
    kind === "spend_limit"
      ? utilizationPercent(rawWindow.utilization)
      : planWindowPercent(rawWindow.utilization),
  resetsAt: new Date(rawWindow.resets_at * SLOW_HOOK_REPORT_INTERVAL_MS_2).toISOString(),
});
//@ chunk-5xgkngpb.js:3789158-3789350 placement
function rateLimitWindows(windows, provider) {
  let overage = provider === "gateway" ? windows.overage : undefined;
  return [
    ...(windows.five_hour ? [rateLimitWindow("five_hour", windows.five_hour)] : []),
    ...(windows.seven_day ? [rateLimitWindow("seven_day", windows.seven_day)] : []),
    ...(overage ? [rateLimitWindow("spend_limit", overage)] : []),
  ];
}
//@ chunk-5xgkngpb.js:3789350-3789530 placement
var buildSessionUsage = ({ breakdown, ...usage }) => ({
  startedAt: usage.startedAt,
  context: {
    ...contextUsageOf(usage.messages, usage.model),
    ...(breakdown !== undefined && {
      breakdown,
    }),
  },
  rateLimits: rateLimitWindows(usage.windows, usage.provider),
  cost: {
    usd: usage.costUsd,
  },
});
//@ chunk-5xgkngpb.js:3789530-3789875 placement
/**
 * $.session.usage：返回会话开始时间、上下文用量（可含分类明细）、限额窗口与费用。
 */
async function sessionUsageOp(args, plugin) {
  let binding = currentSurfaceBinding();
  let { breakdown } = args;
  let wantsBreakdown = binding !== undefined && breakdown !== undefined;
  if (binding === undefined)
    logForDebugging(`$.session.usage (${plugin}): no session bound; the context window is answered empty`);
  return buildSessionUsage({
    startedAt: getSessionStartTime(),
    model: binding?.model() ?? getMainLoopModel(),
    messages: binding?.messages() ?? [],
    windows: getRawUtilization(),
    provider: getAPIProvider(),
    costUsd: getTotalCostUSD(),
    breakdown: wantsBreakdown
      ? await pluginContextData(binding, {
          ...args,
          breakdown,
        })
      : undefined,
  });
}
//@ chunk-5xgkngpb.js:4095150-4095892 placement
/**
 * session.start 在新副本中重跑时，复用之前已做过的 $.prompt.submit/command.run/agent.spawn 调用结果，避免重复执行。
 */
function dedupeSessionStartCalls(event, call) {
  let dedupeOne = (args, caller) => {
    let { plugin, environmentId } = caller;
    let sessionStart =
      caller.ownRoot === "session.start" ? sessionStartCallsSlot.get()?.get(plugin) : undefined;
    let isCopy = environmentId !== undefined && sessionStart?.copies.has(environmentId);
    if (sessionStart === undefined || environmentId === undefined || !isCopy) return call(args, caller);
    let result = sessionStart.calls[event].find((call) => isDeepStrictEqual(call.args, args));
    if (result === undefined) {
      let record = {
        ...sessionLoadRecord(environmentId, args, call(args, caller)),
        endsWith: RECORDS_SESSION_START[event] ? caller.signal : undefined,
      };
      sessionStart.calls = {
        ...sessionStart.calls,
        [event]: sessionStart.calls[event].concat(record),
      };
      record.result.then(
        (answer) => isAbortedCallResult(record, answer) && removeCall(sessionStart, event, record),
        () => removeCall(sessionStart, event, record),
      );
      return record.result;
    }
    let isFirstRepeat = result.starts.has(environmentId);
    let allowsRetry = !result.isRepeated && !isFirstRepeat;
    result.isRepeated = result.isRepeated || isFirstRepeat;
    if (!allowsRetry) return call(args, caller);
    result.starts.add(environmentId);
    return result.result.then((answer) => {
      let isAborted = isAbortedCallResult(result, answer);
      if (!isAborted)
        reportPluginProblem(
          plugin,
          `its session.start ran again in a fresh copy; the $.${event} call it had already made was not made again`,
        );
      return isAborted ? dedupeOne(args, caller) : answer;
    });
  };
  return dedupeOne;
}
//@ chunk-5xgkngpb.js:4095892-4096386 placement
/**
 * $.turn.abort：只能中止当前运行的回合（id 必须匹配且未在结束中）。
 */
function turnAbortOp(args, plugin) {
  let turn = currentTurn();
  if (!turn)
    return Promise.reject(
      new HooksError(`${plugin}: $.turn.abort: no turn is running (asked for ${args.turnId})`),
    );
  if (turn.turnId !== args.turnId)
    return Promise.reject(
      new HooksError(
        `${plugin}: $.turn.abort: ${args.turnId} is not the running turn (${turn.turnId}); a hook ends the turn turn.start told it about`,
      ),
    );
  if (turn.cancelled())
    return Promise.reject(new HooksError(`${plugin}: $.turn.abort: ${args.turnId} is already ending`));
  logForDebugging(`$.turn.abort (${plugin}): cancelled turn ${args.turnId}`);
  turn.cancel();
  return Promise.resolve();
}
//@ chunk-5xgkngpb.js:4096386-4096634 layout
var MAX_BLUR_PX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_TINT_LENGTH;
var NUMBER_SOURCE;
var SEPARATOR_SOURCE;
var regExp_19;
deferInit("chunk-5xgkngpb.js:4096386", () => {
  MAX_BLUR_PX = 64;
  MAX_TINT_LENGTH = 64;
  NUMBER_SOURCE = String.raw`(\d+(\.\d+)?|\.\d+)%?`;
  SEPARATOR_SOURCE = String.raw`( *, *| +)`;
  regExp_19 = new RegExp(
    String.raw`^(#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})|(rgb|hsl)a?\( *` +
      `${NUMBER_SOURCE}${SEPARATOR_SOURCE}${NUMBER_SOURCE}${SEPARATOR_SOURCE}${NUMBER_SOURCE}` +
      String.raw`( *[,/] *${NUMBER_SOURCE})? *\))$`,
  );
});
//@ chunk-5xgkngpb.js:4096634-4097564 layout
function checkBackdrop(backdrop) {
  if (backdrop === undefined) return;
  if (typeof backdrop !== "object" || backdrop === null)
    return "the argument is { id, glass?, colorScheme? } or undefined";
  let idProblem = checkPaneId("id" in backdrop ? backdrop.id : undefined);
  let glass = "glass" in backdrop ? backdrop.glass : undefined;
  let colorScheme = "colorScheme" in backdrop ? backdrop.colorScheme : undefined;
  if (idProblem !== undefined) return idProblem;
  if (colorScheme !== undefined && colorScheme !== "light" && colorScheme !== "dark")
    return "colorScheme is light or dark";
  if (glass === undefined || glass === false) return;
  if (typeof glass !== "object" || glass === null) return "glass is { blur?, tint?, opacity? } or false";
  let blur = "blur" in glass ? glass.blur : undefined;
  let opacity = "opacity" in glass ? glass.opacity : undefined;
  let tint = "tint" in glass ? glass.tint : undefined;
  if (blur !== undefined && !(typeof blur === "number" && blur >= 0 && blur <= MAX_BLUR_PX))
    return `glass.blur is a number of CSS pixels, 0 to ${MAX_BLUR_PX}`;
  if (opacity !== undefined && !(typeof opacity === "number" && opacity >= 0 && opacity <= 1))
    return "glass.opacity is a number, 0 to 1";
  if (
    tint !== undefined &&
    !(typeof tint === "string" && tint.length <= MAX_TINT_LENGTH && regExp_19.test(tint))
  )
    return `glass.tint is a raw color, #hex or rgb(), rgba(), hsl() or hsla() of numbers, at most ${MAX_TINT_LENGTH} characters`;
  return;
}
//@ chunk-5xgkngpb.js:4097564-4097826 layout
function checkBackdropArgs(event) {
  if (typeof event !== "object" || event === null) return "the event is { backdrop }";
  return !("backdrop" in event) && Object.keys(event).length > 0
    ? "the event is { backdrop: { id, glass?, colorScheme? } }: pass the argument under backdrop"
    : checkBackdrop("backdrop" in event ? event.backdrop : undefined);
}
//@ chunk-5xgkngpb.js:4097869-4097888 layout
var BACKDROP = "backdrop";
//@ chunk-5xgkngpb.js:4097888-4097956 layout
function clearBackdropFor(plugin) {
  getPluginRegistry().backdrop.setState((current) => (current?.plugin === plugin ? undefined : current));
}
//@ chunk-5xgkngpb.js:4097956-4097986 layout
var DEFAULT_GLASS = {
  blur: 16,
  opacity: 0.6,
};
//@ chunk-5xgkngpb.js:4097986-4098119 layout
function normalizeGlass(glass) {
  if (glass === false) return false;
  return {
    blur: glass?.blur ?? DEFAULT_GLASS.blur,
    opacity: glass?.opacity ?? DEFAULT_GLASS.opacity,
    ...(glass?.tint !== undefined && {
      tint: glass.tint,
    }),
  };
}
//@ chunk-5xgkngpb.js:4098119-4098166 layout
function getBackdropState() {
  return getPluginRegistry().backdrop.getState();
}
//@ chunk-5xgkngpb.js:4098166-4098738 layout
function runBackdrop(backdrop, ctx, reason) {
  if (backdrop === undefined) {
    let samePlugin = getBackdropState()?.plugin === ctx.plugin;
    clearBackdropFor(ctx.plugin);
    if (samePlugin) logFeatureOk("plugin_function_hooks_backdrop");
    return {
      isDrawn: false,
      reason: samePlugin
        ? "the backdrop is cleared"
        : "this plugin holds no backdrop, so nothing was cleared",
    };
  }
  let requestId = BACKDROP;
  let nextState = {
    plugin: ctx.plugin,
    id: backdrop.id,
    glass: normalizeGlass(backdrop.glass),
    ...(backdrop.colorScheme !== undefined && {
      colorScheme: backdrop.colorScheme,
    }),
  };
  let changed = !isDeepStrictEqual(getBackdropState(), nextState);
  if (changed) getPluginRegistry().backdrop.setState(() => nextState);
  if (reason === undefined) {
    if (changed) logFeatureOk("plugin_function_hooks_backdrop");
    return {
      isDrawn: true,
      requestId,
    };
  }
  if (changed) logFeatureSad("plugin_function_hooks_backdrop", "undrawn");
  return {
    isDrawn: false,
    requestId,
    reason,
  };
}
//@ chunk-5xgkngpb.js:4098738-4098895 layout
function backdropInstanceOf(instanceId) {
  let state = getBackdropState();
  return state !== undefined && instanceId === BACKDROP
    ? {
        id: state.id,
        plugin: state.plugin,
        glass: state.glass,
        ...(state.colorScheme !== undefined && {
          colorScheme: state.colorScheme,
        }),
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:4098895-4098945 layout
function subscribeBackdrop(listener) {
  return getPluginRegistry().backdrop.subscribe(listener);
}
//@ chunk-5xgkngpb.js:4098945-4099163 placement
/**
 * 校验 $.ui.notify 参数：text 为字符串，surface 合法。
 */
function checkNotifyArgs(args) {
  if (typeof args?.text !== "string") return "takes { text, surface? } (a string text)";
  let surface = args.surface;
  return surface === undefined || isUiElementTypeName(surface)
    ? undefined
    : "surface is not the name of a surface (terminal, desktop, mobile, vscode)";
}
export {
  sessionStartHostRefusedSlot,
  subscribeBackdrop,
  getBackdropState,
  BACKDROP,
  backdropInstanceOf,
  requireBoundSession,
  clearBackdropFor,
  isSlashCommandText,
  checkPromptSubmitArgs,
  submitHoldRefusal,
  MAX_SESSION_TEXT_CHARS,
  LATER,
  attachToolResults,
  toPluginMessage,
  sessionInfoOp,
  sessionTurnsOp,
  sessionMessagesOp,
  sessionRepoOp,
  sessionUsageOp,
  sessionCompactForPlugin,
  sessionSendForPlugin,
  sessionAppendOp,
  turnAbortOp,
  dedupeSessionStartCalls,
  uiToastOp,
  uiStatusOp,
  checkBackdropArgs,
  runBackdrop,
  checkNotifyArgs,
  sessionAuthorizeForPlugin,
  sessionIdentityWithEmail,
  sessionIdentity,
  identityRefusal,
  describeAgentTask,
  authHandleRegistry,
  isSnappyPlumOn,
  stringRequestMeta,
  findAgentTask,
  normalizeContentBlocks_2,
  holdAgentConversation,
};
