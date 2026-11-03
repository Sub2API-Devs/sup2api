/**
 * plugins/functionHooks/sessionApi.ts
 *
 * 2.1.316 新增：插件 $.session.* 接口（读取、追加、发送、授权等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (75)
 * attribution: placement 74, sole-consumer 1
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
import { isOfficialRepo } from "../../utils/plugins/fetchTelemetry.js";
import { isAllowedGitRemote } from "../../utils/git/builderGit/gitEnv.js";
import { isInternalModelRepo } from "../../utils/commitAttribution.js";
import { projectRootFor } from "./panes.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
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
import { compactCommand } from "../../commands/compact/index.js";
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
import { getCwd } from "../../utils/cwd.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { EMPTY_MESSAGES } from "../../state/inProgressToolUses.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { noUncachedRoot } from "../../utils/settings/settingsStorage.js";
import { findCanonicalGitRoot } from "../../utils/git.js";
import { getRemoteUrlForDir } from "../../utils/git/gitFilesystem.js";
import { udsAddressFromPath, bridgeAddressFromToken } from "../../utils/peerMessageHeaders.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { runIgnoringAbort } from "./dispatch/dispatchScope.js";
import { count } from "../../utils/collections.js";
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
import { isUiElementTypeName } from "./ui/renderSites.js";

//@ chunk-e6aww6q8.js:766112-766199 placement
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
    : content.map((r) => ({
        ...r,
      }));
}
//@ chunk-e6aww6q8.js:766199-766277 placement
/**
 * 插件可见的消息形状
 */
function messageForPlugin(e) {
  let { role, content } = e.message;
  return {
    role,
    content: normalizeContentBlocks_2(content),
  };
}
//@ chunk-e6aww6q8.js:766277-766403 placement
function isHumanUserMessage(e) {
  let { role, content } = e.message;
  let s = Array.isArray(content) && content.some((h) => h.type === "tool_result");
  return role === "user" && !s;
}
//@ chunk-e6aww6q8.js:766403-766518 placement
function tailApiMessages(e) {
  let n = e.length > CLONE_DEPTH_THRESHOLD;
  let r = n ? e.slice(-CLONE_DEPTH_THRESHOLD) : e;
  let s = n ? Math.max(r.findIndex(isHumanUserMessage), 0) : 0;
  return r.slice(s).map(messageForPlugin);
}
//@ chunk-e6aww6q8.js:766518-766738 placement
/**
 * 取当前绑定的会话，没有（REPL 未挂载且无无头会话）时抛 HooksError 说明该接口在此模式不可用。
 */
function requireBoundSession(e, n) {
  let r = currentSurfaceBinding();
  if (!r)
    throw new HooksError(
      `${e}: ${n} is not available in this mode: no session is bound in this process (the REPL has not mounted and no headless session is built); catch it and carry on`,
    );
  return r;
}
//@ chunk-e6aww6q8.js:766738-766835 placement
/**
 * bearer 或 api-key
 */
function authKindOf(headers) {
  let n = "Authorization" in headers;
  let r = "x-api-key" in headers;
  return n ? "bearer" : r ? "api-key" : undefined;
}
//@ chunk-e6aww6q8.js:766835-766871 placement
var HTTPS_API_ANTHROPIC_COM = "https://api.anthropic.com";
//@ chunk-e6aww6q8.js:766871-766911 placement
/**
 * 无 API key 且用 WIF
 */
function isWifWithoutApiKey() {
  return getAnthropicApiKeySafe() === null && shouldUseWIFAuth();
}
//@ chunk-e6aww6q8.js:766911-767041 placement
function workloadIdentityHost(e) {
  let resolvedWIFBaseUrlSnapshot = getResolvedWIFBaseUrlSnapshot();
  if (resolvedWIFBaseUrlSnapshot === undefined) return;
  if (resolvedWIFBaseUrlSnapshot === null) return new URL(e).host;
  return URL.canParse(resolvedWIFBaseUrlSnapshot) ? new URL(resolvedWIFBaseUrlSnapshot).host : undefined;
}
//@ chunk-e6aww6q8.js:767041-767084 placement
/**
 * 以 / 开头
 */
var isSlashCommandText = (text) => text.trimStart().startsWith("/");
//@ chunk-e6aww6q8.js:767084-767096 placement
/**
 * 200
 */
var MAX_SESSION_TEXT = 200;
//@ chunk-e6aww6q8.js:767096-767112 placement
var LATER = "later";
//@ chunk-e6aww6q8.js:767150-767357 placement
/**
 * 插件提交前检查输入暂扣：符合条件的按键可解除暂扣，否则返回拒绝原因并记录。
 */
function submitHoldRefusal(e, n) {
  let r = pluginInputHoldSlot.get();
  let s = r?.session.deref();
  if (
    s !== undefined &&
    s === currentSurfaceBinding() &&
    (e.vouchedPressAt ?? -1) >= (r?.stoppedAt ?? 0) &&
    isPersonInitiated(e)
  )
    clearHeldInputAndReason();
  let S = pluginInputHoldReason();
  if (S !== undefined) logForDebugging(`${n} (${e.plugin}): refused: ${S}`);
  return S;
}
//@ chunk-e6aww6q8.js:770635-770725 sole-consumer
/**
 * 官方仓库才返回
 */
function officialRepoOrNull(e) {
  let urlOrSpec = `https://github.com/${e}`;
  return e !== null && isOfficialRepo(urlOrSpec) === e && isAllowedGitRemote(urlOrSpec) ? e : null;
}
//@ chunk-e6aww6q8.js:770725-770795 placement
/**
 * 含 tool_result 块
 */
var hasToolResultBlock_2 = (content) =>
  typeof content !== "string" && content.some((n) => n.type === "tool_result");
//@ chunk-e6aww6q8.js:770795-770820 placement
/**
 * 是否内部模型仓库
 */
var isInternalRepo = (e) => isInternalModelRepo(projectRootFor(e));
//@ chunk-e6aww6q8.js:770820-770850 placement
/**
 * 允许的 git 远程
 */
var isAllowedRemote = (e) => e !== null && isAllowedGitRemote(e);
//@ chunk-e6aww6q8.js:770850-770879 placement
/**
 * 空的异步实现
 */
async function noopAsync_2(e) {
  return;
}
//@ chunk-e6aww6q8.js:770879-770979 placement = isOfficialRepo (1)
async function isOfficialRepo_2(e, urlOrSpec) {
  let r =
    e !== null
      ? `anthropics/${await noopAsync_2(e)}`
      : isAllowedRemote(urlOrSpec)
        ? isOfficialRepo(urlOrSpec)
        : null;
  return officialRepoOrNull(r);
}
//@ chunk-e6aww6q8.js:770979-771029 placement
/**
 * 开关开启才查
 */
var officialRepoIfEnabled = (e, remoteUrlForDir, r) =>
  r ? isOfficialRepo_2(e, remoteUrlForDir) : Promise.resolve(null);
//@ chunk-e6aww6q8.js:771029-771077 placement
/**
 * tengu_snappy_plum 开关
 */
function isSnappyPlumOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_snappy_plum", false);
}
//@ chunk-e6aww6q8.js:771077-771392 placement
/**
 * 从 MCP 结果 _meta 中挑出给插件的字段（大小受限，被裁剪的记入 omitted）。
 */
function pluginMetaForPlugins(e) {
  if (!isSnappyPlumOn() || !isPlainObject_5(e)) return;
  let n = {};
  let r = [];
  let s = e[COM_ANTHROPIC_PLUGIN_META_CUT];
  for (let h of EDIT_SOURCE_KINDS) {
    let y = Array.isArray(s) && s.includes(h);
    if (!y && (!Object.hasOwn(e, h) || e[h] === undefined)) continue;
    if (h === ANTHROPIC_SOURCES && e[COM_ANTHROPIC_SOURCES_RELAY] !== RANDOM_PLUGIN_META_ID) continue;
    if (!y && isMetaFieldSmall(h, e[h])) n[h] = e[h];
    else r.push(h);
  }
  if (r.length > 0) n[CLAUDE_OMITTED] = r;
  return Object.keys(n).length === 0 ? undefined : n;
}
//@ chunk-e6aww6q8.js:771392-771630 placement
function isMetaFieldSmall(e, n) {
  try {
    let r = utf8Length(jsonStringify(n));
    if (r > MAX_REQUEST_META_BYTES)
      logForDebugging(
        `What a server addressed to plugins under ${e} is ${r} bytes, over ${MAX_REQUEST_META_BYTES}: left out`,
        {
          level: "warn",
        },
      );
    return r <= MAX_REQUEST_META_BYTES;
  } catch (error) {
    logMetaError("measuring what a server addressed to plugins", error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:771630-771795 placement
/**
 * 把请求 meta 中的字符串字段挑出（启用且无问题时）。
 */
function stringRequestMeta(requestMeta) {
  if (
    !isSnappyPlumOn() ||
    !isPlainObject_5(requestMeta) ||
    Object.keys(requestMeta).length === 0 ||
    checkRequestMeta(requestMeta) !== undefined
  )
    return;
  let n = {};
  for (let [key, value] of Object.entries(requestMeta)) if (typeof value === "string") n[key] = value;
  return n;
}
//@ chunk-e6aww6q8.js:771795-771895 placement
function logMetaError(e, error) {
  if (error instanceof TypeError) {
    logForDebugging(`Failed ${e}: ${error.name}`, {
      level: "warn",
    });
    return;
  }
  logError(error);
}
//@ chunk-e6aww6q8.js:771895-771976 placement
/**
 * 构造插件可见用户行
 */
var userRowForPlugin = (text, n) => ({
  role: "user",
  text,
  toolUses: [],
  ...(n.length > 0 && {
    toolResults: n,
  }),
});
//@ chunk-e6aww6q8.js:771976-772710 placement
/**
 * 把会话消息转换为插件可见形状：助手消息给文本与 tool_use，用户消息给文本与 tool_result（含结果与 meta），跳过 meta/虚拟消息。
 */
function toPluginMessage(e) {
  if (e.type === "assistant") {
    let content = e.message.content;
    let L = [];
    let G = [];
    for (let q of content)
      if (q.type === "text") G.push(q.text);
      else if (q.type === "tool_use")
        L.push({
          tool_use_id: q.id,
          tool: q.name,
          input: jsonCloneValue(q.input),
        });
    return {
      role: "assistant",
      text: G.join(""),
      toolUses: L,
    };
  }
  if (e.type !== "user") return;
  if (e.isMeta === true || e.isVirtual === true) return;
  let content = e.message.content;
  if (typeof content === "string") return userRowForPlugin(content, []);
  let r = [];
  let s = [];
  let h = e.toolUseResult !== undefined;
  let y = pluginMetaForPlugins(e.mcpMeta?._meta);
  let S = y === undefined ? undefined : jsonCloneValue(y);
  for (let w of content)
    if (w.type === "text") r.push(w.text);
    else if (w.type === "tool_result")
      s.push({
        tool_use_id: w.tool_use_id,
        text: toolInputText(w.content),
        isError: w.is_error === true,
        ...(h && {
          result: e.toolUseResult,
        }),
        ...(S &&
          w.is_error !== true && {
            meta: S,
          }),
      });
  return userRowForPlugin(r.join(""), s);
}
//@ chunk-e6aww6q8.js:772710-772753 placement
/**
 * URL 里的用户信息
 */
var URL_USERINFO_RE = /^([a-z][a-z0-9+.-]*:\/\/)[^/]*@/i;
//@ chunk-e6aww6q8.js:772753-772923 placement
function runUiNoticeOp({ event, pluginName, text, run }) {
  let h = currentSurfaceBinding();
  let y = truncateUiLog(text);
  if (h === undefined) {
    logForDebugging(`${event} (${pluginName}): no session bound; dropped: ${y}`);
    return;
  }
  logForDebugging(`${event} (${pluginName}): ${y}`);
  run(h);
}
//@ chunk-e6aww6q8.js:772923-772988 placement
/**
 * 去掉 URL 凭证
 */
function stripUrlUserinfo_2(remoteUrlForDir) {
  return typeof remoteUrlForDir === "string"
    ? remoteUrlForDir.replace(URL_USERINFO_RE, "$1")
    : remoteUrlForDir;
}
//@ chunk-e6aww6q8.js:777796-777912 placement
/**
 * $.ui.status：设置或清除插件在状态区的文字。
 */
var uiStatusOp = (e, n) =>
  runUiNoticeOp({
    event: "$.ui.status",
    pluginName: n,
    text: e ?? "(cleared)",
    run: (r) => r.status(n, e === undefined ? e : truncateUiLog(e)),
  });
//@ chunk-e6aww6q8.js:777912-778021 placement
/**
 * $.ui.toast：弹出插件提示（文本截断，可设超时）。
 */
var uiToastOp = ({ text, timeoutMs }, r) =>
  runUiNoticeOp({
    event: "$.ui.toast",
    pluginName: r,
    text,
    run: (s) => s.toast(r, truncateUiLog(text), timeoutMs),
  });
//@ chunk-e6aww6q8.js:778021-778206 placement
/**
 * $.session.append：把插件消息追加到会话（没有对话的进程中拒绝）。
 */
async function sessionAppendOp(e, n) {
  let r = TEXT_PASSTHROUGH_CORES.get();
  if (r === null)
    throw new HooksError(`${n.plugin}: $.session.append: this process keeps no conversation to append to`);
  return (await r()).pluginAppended(e, n);
}
//@ chunk-e6aww6q8.js:778244-778254 placement
/**
 * 4
 */
var MAX_AUTH_HANDLES = 4;
//@ chunk-e6aww6q8.js:778254-778586 placement
/**
 * 授权句柄登记表：mint 为插件生成 auth_ 句柄（每插件最多保留 4 个），resolve 只认同一插件。
 */
function createAuthHandleRegistry() {
  let e = new Map();
  let n = new Map();
  function r(s, h) {
    let y = [...(n.get(s) ?? []), h];
    while (y.length > MAX_AUTH_HANDLES) {
      let S = y.shift();
      if (S !== undefined) e.delete(S);
    }
    n.set(s, y);
  }
  return {
    mint: (s, headers, host) => {
      let S = `auth_${randomUUID().replace(/-/g, "")}`;
      e.set(S, {
        plugin: s,
        headers,
        host,
      });
      r(s, S);
      return S;
    },
    resolve: (s, h) => {
      let y = e.get(h);
      return y?.plugin === s ? y : undefined;
    },
  };
}
//@ chunk-e6aww6q8.js:778586-778600 placement
/**
 * 授权句柄登记表
 */
var authHandleRegistry = createAuthHandleRegistry();
//@ chunk-e6aww6q8.js:778600-779274 placement
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
  let n = isWifWithoutApiKey();
  if (n) await getWIFCredentials().catch(() => null);
  let host = new URL(HTTPS_API_ANTHROPIC_COM).host;
  let s = n ? workloadIdentityHost(HTTPS_API_ANTHROPIC_COM) : host;
  let y =
    s === host
      ? guardTelemetryCredentials(await getAuthHeadersAsync(), HTTPS_API_ANTHROPIC_COM)
      : {
          headers: {},
          error: "the workload-identity token is minted for a different host",
        };
  let S = authKindOf(y.headers);
  let w = isWifWithoutApiKey();
  let L = w ? workloadIdentityHost(HTTPS_API_ANTHROPIC_COM) : host;
  let G = w !== n || L !== s;
  let q =
    y.error ?? (G ? "the auth mode or workload-identity resolution moved while authorizing" : undefined);
  if (q !== undefined || S === undefined) {
    logForDebugging(
      `$.session.authorize (${plugin}): no first-party credential (${q ?? "no bearer or api key"})`,
    );
    return null;
  }
  return {
    handle: authHandleRegistry.mint(plugin, y.headers, host),
    kind: S,
  };
}
//@ chunk-e6aww6q8.js:780409-781039 placement
/**
 * 插件 $.session.compact：在回合之间压缩对话，压缩关闭或回合进行中时拒绝。
 */
async function sessionCompactForPlugin(e, plugin, origin = [plugin]) {
  if (!compactCommand.isEnabled())
    throw new HooksError(
      `${plugin}: $.session.compact: compaction is switched off in this session (DISABLE_COMPACT), for /compact and plugins alike`,
    );
  let s = currentTurn();
  if (s !== undefined)
    throw new HooksError(
      `${plugin}: $.session.compact: a turn is running (${s.turnId}); the conversation compacts between turns, so call it from turn.complete or later`,
    );
  let h = requireBoundSession(plugin, "$.session.compact");
  logForDebugging(
    `$.session.compact (${plugin}): compacting, ${(e.instructions ?? "").length} chars of instructions`,
  );
  try {
    return await h.compact({
      instructions: e.instructions ?? "",
      origin,
    });
  } catch (error) {
    throw new HooksError(`${plugin}: $.session.compact: ${toError(error).message}`);
  }
}
//@ chunk-e6aww6q8.js:781039-781215 placement
function authKindOf_2(e, n) {
  let r = e === "profile" || n === "/login managed key";
  let s = e === "none" && n === "none";
  return e === "claude.ai"
    ? "claude.ai"
    : isOAuthBearerSource(e)
      ? "oauth-token"
      : r
        ? "console"
        : s
          ? "none"
          : "api-key";
}
//@ chunk-e6aww6q8.js:781215-781484 placement
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
//@ chunk-e6aww6q8.js:781484-781625 placement
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
//@ chunk-e6aww6q8.js:781625-781687 placement
var k0t = Object.freeze({
  skipRetrievingKeyFromApiKeyHelper: true,
});
//@ chunk-e6aww6q8.js:781687-781784 placement
/**
 * 请求凭证与来源
 */
function credentialSources() {
  let source = getAnthropicApiKeyWithSourceSafe(k0t).source;
  let requestCredentials = getRequestCredentials(getAuthTokenSource().source, source);
  return [requestCredentials.tokenSource, requestCredentials.apiKey ? source : "none"];
}
//@ chunk-e6aww6q8.js:781784-782253 placement
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
  let [n, r] = credentialSources();
  let kind = authKindOf_2(n, r);
  let authenticatedAccountInfo = getAuthenticatedAccountInfo();
  let S = n === "claude.ai" || r === "/login managed key" ? getOauthAccountInfo() : undefined;
  let w = authenticatedAccountInfo?.organizationUuid !== undefined;
  let L = w ? authenticatedAccountInfo : S;
  let organizationUuid = L?.organizationUuid;
  if (organizationUuid === undefined || !isForcedOrg(organizationUuid))
    return {
      kind,
      isVerified: false,
    };
  let Z = S?.organizationUuid === organizationUuid ? (S?.organizationType ?? undefined) : undefined;
  let emailAddress = L?.emailAddress;
  return {
    kind,
    organizationId: organizationUuid,
    ...(Z !== undefined && {
      organizationType: Z,
    }),
    ...(emailAddress !== undefined && {
      email: emailAddress,
    }),
    isVerified: w,
  };
}
//@ chunk-e6aww6q8.js:782253-782455 placement
/**
 * $.session：返回会话 id、cwd、项目根与当前模型（无会话时取进程值）。
 */
async function sessionInfoOp(plugin, cwd) {
  let r = currentSurfaceBinding();
  if (r === undefined)
    logForDebugging(`$.session (${plugin}): no session bound; id, cwd and model answered from the process`);
  return {
    id: String(getSessionId()),
    cwd: cwd ?? getCwd(),
    root: getOriginalCwd(),
    model: r?.model() ?? getMainLoopModel(),
  };
}
//@ chunk-e6aww6q8.js:782455-782654 placement
function createHeldConversations() {
  let e = new Map();
  return {
    hold: (n, messages) => {
      let s = Symbol(n);
      e.set(n, {
        token: s,
        messages,
      });
      return () => {
        if (e.get(n)?.token === s) e.delete(n);
      };
    },
    current: (n) => e.get(n)?.messages,
    clear: () => {
      e.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:782654-782689 placement
/**
 * 已持有会话表
 */
var heldConversations = identity_2(createHeldConversations(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:782689-782967 placement
async function readSavedAgentMessages(e, n) {
  try {
    let r = await e.savedAgentMessages(n);
    if (!r) return;
    let s = new Set(e.messages().map((h) => h.uuid));
    return r.filter((h) => !s.has(h.uuid));
  } catch (error) {
    logForDebugging(
      `$.session.messages: the saved transcript of agent ${n} could not be read: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:782967-783423 placement
/**
 * 把本地代理或进程内队友任务描述为统一形状：id、队友 id、描述、类型、父 id、名字。
 */
function describeAgentTask(e) {
  switch (e.type) {
    case "local_agent":
      return {
        id: e.agentId,
        teammateId: undefined,
        description: e.description,
        type: e.agentType,
        parentId: e.parentAgentId,
        name: undefined,
      };
    case "in_process_teammate":
      return {
        id: e.identity.resumableAgentId ?? e.identity.agentId,
        teammateId: e.identity.agentId,
        description: e.spawnedWith.description ?? e.description,
        type: e.spawnedWith.agentType || "teammate",
        parentId: e.spawnedWith.parentAgentId,
        name: e.identity.agentName,
      };
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:783423-783536 placement
/**
 * 按代理 id 找任务（优先未结束的，否则最后一个）。
 */
function findAgentTask(e, n) {
  let filtered = Object.values(e).filter((s) => describeAgentTask(s)?.id === n);
  return filtered.find((s) => !isTerminalTaskStatus(s.status)) ?? filtered.at(-1);
}
//@ chunk-e6aww6q8.js:783536-783758 placement
/**
 * 取代理任务的转录消息（不可恢复的队友或 fork worker 返回 undefined）。
 */
function agentTranscriptMessages(taskRegistry, n) {
  let agentTask = findAgentTask(taskRegistry.all(), n);
  if (agentTask === undefined) return;
  return (
    agentTask.type === "in_process_teammate"
      ? agentTask.identity.resumableAgentId === undefined
      : agentTask.type === "local_agent" && agentTask.forkWorker === true
  )
    ? undefined
    : (taskRegistry.getTranscript(agentTask.id)?.messages ?? EMPTY_MESSAGES);
}
//@ chunk-e6aww6q8.js:783758-783979 placement
async function agentConversation(e, agentId) {
  let savedAgentMessages = await readSavedAgentMessages(e, agentId);
  let s =
    agentTranscriptMessages(e.toolContext(new AbortController()).taskRegistry, agentId) ??
    heldConversations.current(agentId);
  if (!savedAgentMessages) return s;
  let h = s ?? [];
  let y = new Set(h.map((S) => S.uuid));
  return [...savedAgentMessages.filter((savedAgentMessage) => !y.has(savedAgentMessage.uuid)), ...h];
}
//@ chunk-e6aww6q8.js:783979-784186 placement
/**
 * turn.complete 期间暂存某代理的对话，返回释放函数。
 */
function holdAgentConversation(agentId) {
  try {
    let n = currentSurfaceBinding();
    let r = n && agentTranscriptMessages(n.toolContext(new AbortController()).taskRegistry, agentId);
    return r ? heldConversations.hold(agentId, r) : () => {};
  } catch (error) {
    logForDebugging(`turn.complete (agent ${agentId}): conversation not held: ` + errorMessage(error));
    return () => {};
  }
}
//@ chunk-e6aww6q8.js:784186-784338 placement
function agentResultSummary(result) {
  if (!isPlainObject_5(result)) return {};
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
//@ chunk-e6aww6q8.js:784338-784653 placement
/**
 * 生成映射函数：给 tool_use 附上对应结果文本、错误、meta，以及（Agent/Task 工具）子代理 id 与耗时。
 */
var attachToolResults = (e, n) => (r) => {
  let s = r.tool === AGENT || r.tool === TASK;
  let h = e.get(r.tool_use_id);
  let y = s ? n?.(r.tool_use_id) : undefined;
  let S = h !== undefined && "result" in h;
  return {
    ...r,
    ...(S && {
      result: h.result,
    }),
    ...(h !== undefined && {
      text: h.text,
    }),
    ...(h?.isError === true && {
      isError: true,
    }),
    ...(h?.meta !== undefined && {
      meta: h.meta,
    }),
    ...(y !== undefined && {
      agentId: y,
    }),
    ...(s && agentResultSummary(h?.result)),
  };
};
//@ chunk-e6aww6q8.js:784653-784896 placement
function toPluginTranscript(e, n) {
  let r = [];
  let s = new Map();
  let h = attachToolResults(s, n);
  for (let y of e.toReversed()) {
    if (r.length === CLONE_DEPTH_THRESHOLD) break;
    let pluginMessage = toPluginMessage(y);
    if (!pluginMessage) continue;
    for (let w of pluginMessage.toolResults ?? []) s.set(w.tool_use_id, w);
    r.push({
      ...pluginMessage,
      toolUses: pluginMessage.toolUses.map(h),
    });
  }
  return r.reverse();
}
//@ chunk-e6aww6q8.js:784896-785056 placement
function toolUseAgentMap(taskRegistry) {
  let n = new Map();
  for (let r of Object.values(taskRegistry.all())) {
    let s = describeAgentTask(r);
    if (s !== undefined && r.toolUseId !== undefined) n.set(r.toolUseId, s.id);
  }
  return (r) => n.get(r);
}
//@ chunk-e6aww6q8.js:785056-785458 placement
/**
 * $.session.messages：返回主线程或指定代理的对话（as: "api" 时为请求消息尾部）；代理不存在时拒绝。
 */
async function sessionMessagesOp(e, plugin) {
  let r = requireBoundSession(plugin, "$.session.messages");
  let { agentId } = e;
  let h = e.as === "api";
  let y = agentId === undefined ? r.messages() : await agentConversation(r, agentId);
  if (!y)
    return {
      deny: `no conversation of agent ${agentId} in this session: not one of its agents, running in another process, or finished with no saved transcript this session reads back`,
    };
  return h
    ? tailApiMessages(r.requestMessages(y))
    : toPluginTranscript(y, toolUseAgentMap(r.toolContext(new AbortController()).taskRegistry));
}
//@ chunk-e6aww6q8.js:785458-785643 placement
/**
 * $.session.repo：返回 git 根、远程地址、是否内部仓库与名字。
 */
async function sessionRepoOp(cwd) {
  let n = cwd ?? getCwd();
  let r = noUncachedRoot(n);
  let s = r ?? findCanonicalGitRoot(n);
  if (s === null) return null;
  let [remoteUrlForDir, y] = await Promise.all([getRemoteUrlForDir(n), isInternalRepo(cwd)]);
  return {
    root: s,
    remote: stripUrlUserinfo_2(remoteUrlForDir),
    internal: y,
    name: await officialRepoIfEnabled(r, remoteUrlForDir, y),
  };
}
//@ chunk-e6aww6q8.js:785643-785955 placement
/**
 * 解析会话地址：活跃会话用其 socket，否则 session_/cse_ 前缀视为远程会话。
 */
async function resolveSessionAddress(sessionId, n) {
  let r = await n(sessionId);
  if (r !== null)
    return {
      to: udsAddressFromPath(r.sock),
    };
  return sessionId.startsWith("session_") || sessionId.startsWith("cse_")
    ? {
        to: bridgeAddressFromToken(sessionId),
      }
    : {
        reason: `no live session on this machine has id ${sessionId} (a session that exited, or another machine's; a Remote Control or cloud session is addressed by its session_... id)`,
      };
}
//@ chunk-e6aww6q8.js:785955-786098 placement
function resolveSendTarget(e, findLive) {
  if (typeof e === "string")
    return Promise.resolve({
      to: e,
    });
  return "agentId" in e
    ? Promise.resolve({
        to: e.agentId,
      })
    : resolveSessionAddress(e.sessionId, findLive);
}
//@ chunk-e6aww6q8.js:786098-786148 placement
/**
 * SendMessage 未投递
 */
var SEND_MESSAGE_NOT_DELIVERED = "the SendMessage tool did not deliver it";
//@ chunk-e6aww6q8.js:786148-786401 placement
function sendResultOf(e) {
  if (e.deny !== undefined)
    return {
      isDelivered: false,
      reason: e.deny,
    };
  let n = isPlainObject_5(e.result) ? e.result : undefined;
  if (e.isError !== true && n?.success === true)
    return {
      isDelivered: true,
    };
  let message = n?.message;
  return {
    isDelivered: false,
    reason: typeof message === "string" && message !== "" ? message : e.text || SEND_MESSAGE_NOT_DELIVERED,
  };
}
//@ chunk-e6aww6q8.js:786401-786767 placement
/**
 * 求队友的投递地址（按 agentId 找正在运行的进程内队友）。
 */
function teammateAddressFor(e, n) {
  let agentId = typeof e === "object" && "agentId" in e ? e.agentId : undefined;
  let [s] = n.flatMap((S) =>
    agentId !== undefined &&
    S.type === "in_process_teammate" &&
    !isTerminalTaskStatus(S.status) &&
    (S.identity.agentId === agentId || S.identity.resumableAgentId === agentId)
      ? [S.identity.agentName]
      : [],
  );
  let h = s !== undefined;
  let y = agentId?.includes("@") === true;
  return h
    ? {
        to: s,
      }
    : y
      ? {
          reason: `no live teammate of this session has the address ${agentId}`,
        }
      : undefined;
}
//@ chunk-e6aww6q8.js:786767-787645 placement
/**
 * 插件 $.session.send：经 SendMessage 向其他会话发消息。
 */
async function sessionSendForPlugin(e, n, r) {
  let { plugin, signal, origin } = n;
  let S = requireBoundSession(plugin, "$.session.send");
  if (!S.tools().some((ke) => ke.name === SENDMESSAGE))
    return {
      isDelivered: false,
      reason: "this session has no SendMessage tool (messaging between sessions and agents is not on here)",
    };
  let { taskRegistry } = S.toolContext(new AbortController());
  let G =
    teammateAddressFor(e.to, Object.values(taskRegistry.all())) ??
    (await resolveSendTarget(e.to, r.findLive));
  if (G.reason !== undefined) {
    logForDebugging(`$.session.send (${plugin}): not sent: ${G.reason}`);
    return {
      isDelivered: false,
      reason: G.reason,
    };
  }
  logForDebugging(
    `$.session.send (${plugin}): to ${G.to}: ` + jsonStringify(truncateToLength(e.text, MAX_SESSION_TEXT)),
  );
  let q = {
    isRead: false,
  };
  runIgnoringAbort(() => {
    submitHoldRefusal(n, "$.session.send");
    q.isRead = true;
  });
  if (!q.isRead)
    return {
      isDelivered: false,
      reason: "the hold on plugins' input could not be read",
    };
  let Z = await r.run(
    {
      tool: SENDMESSAGE,
      to: G.to,
      message: e.text,
    },
    {
      plugin,
      signal,
      origin,
    },
  );
  let Se = sendResultOf(Z);
  logForDebugging(
    `$.session.send (${plugin}): ` + (Se.isDelivered ? "delivered" : `not delivered: ${Se.reason}`),
  );
  return Se;
}
//@ chunk-e6aww6q8.js:787645-787844 placement
/**
 * $.session.turns：统计人类发起的用户消息数（不含 meta、虚拟与工具结果）。
 */
async function sessionTurnsOp(plugin) {
  let n = currentSurfaceBinding();
  if (!n) {
    logForDebugging(`$.session.turns (${plugin}): no session bound; 0`);
    return 0;
  }
  return count(
    n.messages(),
    (r) =>
      r.type === "user" &&
      r.isMeta !== true &&
      r.isVirtual !== true &&
      !hasToolResultBlock_2(r.message.content),
  );
}
//@ chunk-e6aww6q8.js:3693330-3693379 placement
/**
 * 用量窗口对象
 */
var usageWindow = (tokens, n, percent) => ({
  tokens,
  window: n,
  percent,
});
//@ chunk-e6aww6q8.js:3693379-3693591 placement
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
//@ chunk-e6aww6q8.js:3693591-3693733 placement
var rateLimitWindow = (e, n) => ({
  kind: e,
  percentUsed: e === "spend_limit" ? utilizationPercent(n.utilization) : planWindowPercent(n.utilization),
  resetsAt: new Date(n.resets_at * SLOW_HOOK_REPORT_INTERVAL_MS_2).toISOString(),
});
//@ chunk-e6aww6q8.js:3693733-3693925 placement
function rateLimitWindows(windows, provider) {
  let overage = provider === "gateway" ? windows.overage : undefined;
  return [
    ...(windows.five_hour ? [rateLimitWindow("five_hour", windows.five_hour)] : []),
    ...(windows.seven_day ? [rateLimitWindow("seven_day", windows.seven_day)] : []),
    ...(overage ? [rateLimitWindow("spend_limit", overage)] : []),
  ];
}
//@ chunk-e6aww6q8.js:3693925-3694105 placement
var buildSessionUsage = ({ breakdown, ...n }) => ({
  startedAt: n.startedAt,
  context: {
    ...contextUsageOf(n.messages, n.model),
    ...(breakdown !== undefined && {
      breakdown,
    }),
  },
  rateLimits: rateLimitWindows(n.windows, n.provider),
  cost: {
    usd: n.costUsd,
  },
});
//@ chunk-e6aww6q8.js:3694105-3694450 placement
/**
 * $.session.usage：返回会话开始时间、上下文用量（可含分类明细）、限额窗口与费用。
 */
async function sessionUsageOp(e, n) {
  let r = currentSurfaceBinding();
  let { breakdown } = e;
  let h = r !== undefined && breakdown !== undefined;
  if (r === undefined)
    logForDebugging(`$.session.usage (${n}): no session bound; the context window is answered empty`);
  return buildSessionUsage({
    startedAt: getSessionStartTime(),
    model: r?.model() ?? getMainLoopModel(),
    messages: r?.messages() ?? [],
    windows: getRawUtilization(),
    provider: getAPIProvider(),
    costUsd: getTotalCostUSD(),
    breakdown: h
      ? await pluginContextData(r, {
          ...e,
          breakdown,
        })
      : undefined,
  });
}
//@ chunk-e6aww6q8.js:3992260-3992999 placement
/**
 * session.start 在新副本中重跑时，复用之前已做过的 $.prompt.submit/command.run/agent.spawn 调用结果，避免重复执行。
 */
function dedupeSessionStartCalls(e, n) {
  let r = (s, h) => {
    let { plugin, environmentId } = h;
    let L = h.ownRoot === "session.start" ? sessionStartCallsSlot.get()?.get(plugin) : undefined;
    let G = environmentId !== undefined && L?.copies.has(environmentId);
    if (L === undefined || environmentId === undefined || !G) return n(s, h);
    let found = L.calls[e].find((ke) => isDeepStrictEqual(ke.args, s));
    if (found === undefined) {
      let ke = {
        ...sessionLoadRecord(environmentId, s, n(s, h)),
        endsWith: RECORDS_SESSION_START[e] ? h.signal : undefined,
      };
      L.calls = {
        ...L.calls,
        [e]: L.calls[e].concat(ke),
      };
      ke.result.then(
        (we) => isAbortedCallResult(ke, we) && removeCall(L, e, ke),
        () => removeCall(L, e, ke),
      );
      return ke.result;
    }
    let Z = found.starts.has(environmentId);
    let Se = !found.isRepeated && !Z;
    found.isRepeated = found.isRepeated || Z;
    if (!Se) return n(s, h);
    found.starts.add(environmentId);
    return found.result.then((ke) => {
      let we = isAbortedCallResult(found, ke);
      if (!we)
        reportPluginProblem(
          plugin,
          `its session.start ran again in a fresh copy; the $.${e} call it had already made was not made again`,
        );
      return we ? r(s, h) : ke;
    });
  };
  return r;
}
//@ chunk-e6aww6q8.js:3992999-3993493 placement
/**
 * $.turn.abort：只能中止当前运行的回合（id 必须匹配且未在结束中）。
 */
function turnAbortOp(e, plugin) {
  let r = currentTurn();
  if (!r)
    return Promise.reject(
      new HooksError(`${plugin}: $.turn.abort: no turn is running (asked for ${e.turnId})`),
    );
  if (r.turnId !== e.turnId)
    return Promise.reject(
      new HooksError(
        `${plugin}: $.turn.abort: ${e.turnId} is not the running turn (${r.turnId}); a hook ends the turn turn.start told it about`,
      ),
    );
  if (r.cancelled())
    return Promise.reject(new HooksError(`${plugin}: $.turn.abort: ${e.turnId} is already ending`));
  logForDebugging(`$.turn.abort (${plugin}): cancelled turn ${e.turnId}`);
  r.cancel();
  return Promise.resolve();
}
//@ chunk-e6aww6q8.js:3993493-3993711 placement
/**
 * 校验 $.ui.notify 参数：text 为字符串，surface 合法。
 */
function checkNotifyArgs(e) {
  if (typeof e?.text !== "string") return "takes { text, surface? } (a string text)";
  let surface = e.surface;
  return surface === undefined || isUiElementTypeName(surface)
    ? undefined
    : "surface is not the name of a surface (terminal, desktop, mobile, vscode)";
}
export {
  describeAgentTask,
  holdAgentConversation,
  sessionUsageOp,
  findAgentTask,
  normalizeContentBlocks_2,
  isSnappyPlumOn,
  requireBoundSession,
  isSlashCommandText,
  submitHoldRefusal,
  MAX_SESSION_TEXT,
  LATER,
  attachToolResults,
  toPluginMessage,
  sessionAuthorizeForPlugin,
  sessionIdentity,
  identityRefusal,
  authHandleRegistry,
  stringRequestMeta,
  sessionInfoOp,
  sessionTurnsOp,
  sessionMessagesOp,
  sessionRepoOp,
  sessionCompactForPlugin,
  sessionSendForPlugin,
  sessionAppendOp,
  turnAbortOp,
  dedupeSessionStartCalls,
  uiToastOp,
  uiStatusOp,
  checkNotifyArgs,
};
