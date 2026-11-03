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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { CLONE_DEPTH_THRESHOLD } from "../../utils/structuredCloneLimits.js";
import { lp } from "./surfaceBinding.js";
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
import { RZ, CBr, pluginInputHoldReason } from "./inputHold.js";
import { isPersonInitiated } from "./uiHooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { isOfficialRepo } from "../../utils/plugins/fetchTelemetry.js";
import { isAllowedGitRemote } from "../../utils/git/builderGit/gitEnv.js";
import { isInternalModelRepo } from "../../utils/commitAttribution.js";
import { EFi } from "./panes.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import {
  COM_ANTHROPIC_PLUGIN_META_CUT,
  beo,
  ANTHROPIC_SOURCES,
  COM_ANTHROPIC_SOURCES_RELAY,
  Ffr,
  CLAUDE_OMITTED,
  jrs,
  oxt,
  checkRequestMeta,
  Brs,
} from "./sites/toolSites.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logError } from "../../utils/log.js";
import { Nyn } from "./api/settingsRead.js";
import { truncateUiLog, reportPluginProblem } from "./hooksWorkerClient.js";
import { nSt } from "./coreHandlers.js";
import { usableLauncherHostLoginToken } from "../../utils/auth/launcherHostLogin.js";
import { guardTelemetryCredentials } from "../../services/analytics/telemetryCredentialGuard.js";
import { getAuthHeadersAsync } from "../../utils/http.js";
import { compactCommand } from "../../commands/compact/index.js";
import { vbe } from "./personHold.js";
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
import { ge } from "../../utils/identity.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { dnt } from "../../state/inProgressToolUses.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { dY } from "../../utils/settings/settingsStorage.js";
import { findCanonicalGitRoot } from "../../utils/git.js";
import { getRemoteUrlForDir } from "../../utils/git/gitFilesystem.js";
import { u8, DBe } from "../../utils/peerMessageHeaders.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { Km } from "./dispatch/dispatchScope.js";
import { count } from "../../utils/collections.js";
import { buildContextWindowStatus, getLastApiUsage } from "../../utils/tokens.js";
import { Us } from "../../services/projects/threadRows.js";
import { getContextWindow } from "../../utils/model/configs.js";
import { utilizationPercent, planWindowPercent } from "../../utils/format.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS } from "./dispatch/slowHookReports.js";
import { getRawUtilization } from "../../services/claudeAiLimits.js";
import { D0t } from "./contextDataApi.js";
import { Aj, P0n, A0n, isAbortedCallResult, hat } from "./promptApi.js";
import { W5e } from "./ui/renderSites.js";

//@ chunk-e6aww6q8.js:766112-766199 placement
function vBr(e) {
  return typeof e === "string" ? [{ type: "text", text: e }] : e.map((r) => ({ ...r }));
}
//@ chunk-e6aww6q8.js:766199-766277 placement
function $$t(e) {
  let { role: role, content: content } = e.message;
  return { role: role, content: vBr(content) };
}
//@ chunk-e6aww6q8.js:766277-766403 placement
function isHumanUserMessage(e) {
  let { role: role, content: content } = e.message,
    s = Array.isArray(content) && content.some((h) => h.type === "tool_result");
  return role === "user" && !s;
}
//@ chunk-e6aww6q8.js:766403-766518 placement
function tailApiMessages(e) {
  let n = e.length > CLONE_DEPTH_THRESHOLD,
    r = n ? e.slice(-CLONE_DEPTH_THRESHOLD) : e,
    s = n ? Math.max(r.findIndex(isHumanUserMessage), 0) : 0;
  return r.slice(s).map($$t);
}
/**
 * 取当前绑定的会话，没有（REPL 未挂载且无无头会话）时抛 HooksError 说明该接口在此模式不可用。
 */
//@ chunk-e6aww6q8.js:766518-766738 placement
function requireBoundSession(e, n) {
  let r = lp();
  if (!r)
    throw new HooksError(
      `${e}: ${n} is not available in this mode: no session is bound in this process (the REPL has not mounted and no headless session is built); catch it and carry on`,
    );
  return r;
}
//@ chunk-e6aww6q8.js:766738-766835 placement
function zwo(e) {
  let n = "Authorization" in e,
    r = "x-api-key" in e;
  return n ? "bearer" : r ? "api-key" : void 0;
}
//@ chunk-e6aww6q8.js:766835-766871 placement
var HTTPS_API_ANTHROPIC_COM = "https://api.anthropic.com";
//@ chunk-e6aww6q8.js:766871-766911 placement
function U$t() {
  return getAnthropicApiKeySafe() === null && shouldUseWIFAuth();
}
//@ chunk-e6aww6q8.js:766911-767041 placement
function workloadIdentityHost(e) {
  let n = getResolvedWIFBaseUrlSnapshot();
  if (n === void 0) return;
  if (n === null) return new URL(e).host;
  return URL.canParse(n) ? new URL(n).host : void 0;
}
//@ chunk-e6aww6q8.js:767041-767084 placement
var mWe = (e) => e.trimStart().startsWith("/");
//@ chunk-e6aww6q8.js:767084-767096 placement
var Hme = 200;
//@ chunk-e6aww6q8.js:767096-767112 placement
var LATER = "later";
/**
 * 插件提交前检查输入暂扣：符合条件的按键可解除暂扣，否则返回拒绝原因并记录。
 */
//@ chunk-e6aww6q8.js:767150-767357 placement
function submitHoldRefusal(e, n) {
  let r = RZ.get(),
    s = r?.session.deref();
  if (s !== void 0 && s === lp() && (e.vouchedPressAt ?? -1) >= (r?.stoppedAt ?? 0) && isPersonInitiated(e))
    CBr();
  let S = pluginInputHoldReason();
  if (S !== void 0) logForDebugging(`${n} (${e.plugin}): refused: ${S}`);
  return S;
}
//@ chunk-e6aww6q8.js:770635-770725 sole-consumer
function _We(e) {
  let n = `https://github.com/${e}`;
  return e !== null && isOfficialRepo(n) === e && isAllowedGitRemote(n) ? e : null;
}
//@ chunk-e6aww6q8.js:770725-770795 placement
var TTo = (e) => typeof e !== "string" && e.some((n) => n.type === "tool_result");
//@ chunk-e6aww6q8.js:770795-770820 placement
var vTo = (e) => isInternalModelRepo(EFi(e));
//@ chunk-e6aww6q8.js:770820-770850 placement
var SWe = (e) => e !== null && isAllowedGitRemote(e);
//@ chunk-e6aww6q8.js:770850-770879 placement
async function V$t(e) {
  return;
}
//@ chunk-e6aww6q8.js:770879-770979 placement = isOfficialRepo (1)
async function isOfficialRepo_2(e, n) {
  let r = e !== null ? `anthropics/${await V$t(e)}` : SWe(n) ? isOfficialRepo(n) : null;
  return _We(r);
}
//@ chunk-e6aww6q8.js:770979-771029 placement
var xTo = (e, n, r) => (r ? isOfficialRepo_2(e, n) : Promise.resolve(null));
//@ chunk-e6aww6q8.js:771029-771077 placement
function Vme() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_snappy_plum", !1);
}
/**
 * 从 MCP 结果 _meta 中挑出给插件的字段（大小受限，被裁剪的记入 omitted）。
 */
//@ chunk-e6aww6q8.js:771077-771392 placement
function pluginMetaForPlugins(e) {
  if (!Vme() || !isPlainObject_4(e)) return;
  let n = {},
    r = [],
    s = e[COM_ANTHROPIC_PLUGIN_META_CUT];
  for (let h of beo) {
    let y = Array.isArray(s) && s.includes(h);
    if (!y && (!Object.hasOwn(e, h) || e[h] === void 0)) continue;
    if (h === ANTHROPIC_SOURCES && e[COM_ANTHROPIC_SOURCES_RELAY] !== Ffr) continue;
    if (!y && isMetaFieldSmall(h, e[h])) n[h] = e[h];
    else r.push(h);
  }
  if (r.length > 0) n[CLAUDE_OMITTED] = r;
  return Object.keys(n).length === 0 ? void 0 : n;
}
//@ chunk-e6aww6q8.js:771392-771630 placement
function isMetaFieldSmall(e, n) {
  try {
    let r = jrs(jsonStringify(n));
    if (r > oxt)
      logForDebugging(`What a server addressed to plugins under ${e} is ${r} bytes, over ${oxt}: left out`, {
        level: "warn",
      });
    return r <= oxt;
  } catch (error) {
    return (logMetaError("measuring what a server addressed to plugins", error), !1);
  }
}
/**
 * 把请求 meta 中的字符串字段挑出（启用且无问题时）。
 */
//@ chunk-e6aww6q8.js:771630-771795 placement
function stringRequestMeta(e) {
  if (!Vme() || !isPlainObject_4(e) || Object.keys(e).length === 0 || checkRequestMeta(e) !== void 0) return;
  let n = {};
  for (let [r, s] of Object.entries(e)) if (typeof s === "string") n[r] = s;
  return n;
}
//@ chunk-e6aww6q8.js:771795-771895 placement
function logMetaError(e, n) {
  if (n instanceof TypeError) {
    logForDebugging(`Failed ${e}: ${n.name}`, { level: "warn" });
    return;
  }
  logError(n);
}
//@ chunk-e6aww6q8.js:771895-771976 placement
var kWe = (e, n) => ({ role: "user", text: e, toolUses: [], ...(n.length > 0 && { toolResults: n }) });
/**
 * 把会话消息转换为插件可见形状：助手消息给文本与 tool_use，用户消息给文本与 tool_result（含结果与 meta），跳过 meta/虚拟消息。
 */
//@ chunk-e6aww6q8.js:771976-772710 placement
function toPluginMessage(e) {
  if (e.type === "assistant") {
    let content = e.message.content,
      L = [],
      G = [];
    for (let q of content)
      if (q.type === "text") G.push(q.text);
      else if (q.type === "tool_use") L.push({ tool_use_id: q.id, tool: q.name, input: Nyn(q.input) });
    return { role: "assistant", text: G.join(""), toolUses: L };
  }
  if (e.type !== "user") return;
  if (e.isMeta === !0 || e.isVirtual === !0) return;
  let content = e.message.content;
  if (typeof content === "string") return kWe(content, []);
  let r = [],
    s = [],
    h = e.toolUseResult !== void 0,
    y = pluginMetaForPlugins(e.mcpMeta?._meta),
    S = y === void 0 ? void 0 : Nyn(y);
  for (let w of content)
    if (w.type === "text") r.push(w.text);
    else if (w.type === "tool_result")
      s.push({
        tool_use_id: w.tool_use_id,
        text: Brs(w.content),
        isError: w.is_error === !0,
        ...(h && { result: e.toolUseResult }),
        ...(S && w.is_error !== !0 && { meta: S }),
      });
  return kWe(r.join(""), s);
}
//@ chunk-e6aww6q8.js:772710-772753 placement
var J$t = /^([a-z][a-z0-9+.-]*:\/\/)[^/]*@/i;
//@ chunk-e6aww6q8.js:772753-772923 placement
function runUiNoticeOp({ event: event, pluginName: pluginName, text: text, run: run }) {
  let h = lp(),
    y = truncateUiLog(text);
  if (h === void 0) {
    logForDebugging(`${event} (${pluginName}): no session bound; dropped: ${y}`);
    return;
  }
  (logForDebugging(`${event} (${pluginName}): ${y}`), run(h));
}
//@ chunk-e6aww6q8.js:772923-772988 placement
function LTo(e) {
  return typeof e === "string" ? e.replace(J$t, "$1") : e;
}
/**
 * $.ui.status：设置或清除插件在状态区的文字。
 */
//@ chunk-e6aww6q8.js:777796-777912 placement
var uiStatusOp = (e, n) =>
  runUiNoticeOp({
    event: "$.ui.status",
    pluginName: n,
    text: e ?? "(cleared)",
    run: (r) => r.status(n, e === void 0 ? e : truncateUiLog(e)),
  });
/**
 * $.ui.toast：弹出插件提示（文本截断，可设超时）。
 */
//@ chunk-e6aww6q8.js:777912-778021 placement
var uiToastOp = ({ text: text, timeoutMs: timeoutMs }, r) =>
  runUiNoticeOp({
    event: "$.ui.toast",
    pluginName: r,
    text: text,
    run: (s) => s.toast(r, truncateUiLog(text), timeoutMs),
  });
/**
 * $.session.append：把插件消息追加到会话（没有对话的进程中拒绝）。
 */
//@ chunk-e6aww6q8.js:778021-778206 placement
async function sessionAppendOp(e, n) {
  let r = nSt.get();
  if (r === null)
    throw new HooksError(`${n.plugin}: $.session.append: this process keeps no conversation to append to`);
  return (await r()).pluginAppended(e, n);
}
//@ chunk-e6aww6q8.js:778244-778254 placement
var f0t = 4;
/**
 * 授权句柄登记表：mint 为插件生成 auth_ 句柄（每插件最多保留 4 个），resolve 只认同一插件。
 */
//@ chunk-e6aww6q8.js:778254-778586 placement
function createAuthHandleRegistry() {
  let e = new Map(),
    n = new Map();
  function r(s, h) {
    let y = [...(n.get(s) ?? []), h];
    while (y.length > f0t) {
      let S = y.shift();
      if (S !== void 0) e.delete(S);
    }
    n.set(s, y);
  }
  return {
    mint: (s, h, y) => {
      let S = `auth_${randomUUID_10().replace(/-/g, "")}`;
      return (e.set(S, { plugin: s, headers: h, host: y }), r(s, S), S);
    },
    resolve: (s, h) => {
      let y = e.get(h);
      return y?.plugin === s ? y : void 0;
    },
  };
}
//@ chunk-e6aww6q8.js:778586-778600 placement
var m0t = createAuthHandleRegistry();
/**
 * 插件 $.session.authorize：生成访问第一方服务的授权句柄。
 */
//@ chunk-e6aww6q8.js:778600-779274 placement
async function sessionAuthorizeForPlugin(e) {
  if (usableLauncherHostLoginToken() !== null)
    return (
      logForDebugging(
        `$.session.authorize (${e}): no first-party credential (the desktop app's sign-in is not lent to plugins)`,
      ),
      null
    );
  let n = U$t();
  if (n) await getWIFCredentials().catch(() => null);
  let host = new URL(HTTPS_API_ANTHROPIC_COM).host,
    s = n ? workloadIdentityHost(HTTPS_API_ANTHROPIC_COM) : host,
    y =
      s === host
        ? guardTelemetryCredentials(await getAuthHeadersAsync(), HTTPS_API_ANTHROPIC_COM)
        : { headers: {}, error: "the workload-identity token is minted for a different host" },
    S = zwo(y.headers),
    w = U$t(),
    L = w ? workloadIdentityHost(HTTPS_API_ANTHROPIC_COM) : host,
    G = w !== n || L !== s,
    q = y.error ?? (G ? "the auth mode or workload-identity resolution moved while authorizing" : void 0);
  if (q !== void 0 || S === void 0)
    return (
      logForDebugging(
        `$.session.authorize (${e}): no first-party credential (${q ?? "no bearer or api key"})`,
      ),
      null
    );
  return { handle: m0t.mint(e, y.headers, host), kind: S };
}
/**
 * 插件 $.session.compact：在回合之间压缩对话，压缩关闭或回合进行中时拒绝。
 */
//@ chunk-e6aww6q8.js:780409-781039 placement
async function sessionCompactForPlugin(e, n, r = [n]) {
  if (!compactCommand.isEnabled())
    throw new HooksError(
      `${n}: $.session.compact: compaction is switched off in this session (DISABLE_COMPACT), for /compact and plugins alike`,
    );
  let s = vbe();
  if (s !== void 0)
    throw new HooksError(
      `${n}: $.session.compact: a turn is running (${s.turnId}); the conversation compacts between turns, so call it from turn.complete or later`,
    );
  let h = requireBoundSession(n, "$.session.compact");
  logForDebugging(
    `$.session.compact (${n}): compacting, ${(e.instructions ?? "").length} chars of instructions`,
  );
  try {
    return await h.compact({ instructions: e.instructions ?? "", origin: r });
  } catch (error) {
    throw new HooksError(`${n}: $.session.compact: ${toError(error).message}`);
  }
}
//@ chunk-e6aww6q8.js:781039-781215 placement
function authKindOf(e, n) {
  let r = e === "profile" || n === "/login managed key",
    s = e === "none" && n === "none";
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
/**
 * $.session.identity 拒绝：只回答被托管设置启用并命名的插件。
 */
//@ chunk-e6aww6q8.js:781215-781484 placement
function identityRefusal(e) {
  return (
    logForDebugging(
      `$.session.identity (${e}): refused; not a plugin managed settings enable and name the source of`,
    ),
    {
      deny: `$.session.identity answers only a mod that managed settings enable and that is loaded in place from a source they name; ${e} is not one`,
    }
  );
}
//@ chunk-e6aww6q8.js:781484-781625 placement
function isForcedOrg(e) {
  let n = getMachineAdminPolicyTier()?.forceLoginOrgUUID ?? getVouchedAdminPolicyTier()?.forceLoginOrgUUID;
  return e !== void 0 && (typeof n === "string" ? [n] : (n ?? [])).includes(e) && !isDiskless();
}
//@ chunk-e6aww6q8.js:781625-781687 placement
var freeze_5 = Object.freeze({ skipRetrievingKeyFromApiKeyHelper: !0 });
//@ chunk-e6aww6q8.js:781687-781784 placement
function b0t() {
  let source = getAnthropicApiKeyWithSourceSafe(freeze_5).source,
    n = getRequestCredentials(getAuthTokenSource().source, source);
  return [n.tokenSource, n.apiKey ? source : "none"];
}
/**
 * $.session.identity：返回认证类型；第一方且组织被托管策略强制登录时给出组织 id、类型与邮箱。
 */
//@ chunk-e6aww6q8.js:781784-782253 placement
function sessionIdentity() {
  let e = getAPIProvider();
  if (e !== "firstParty") return { kind: e, isVerified: !1 };
  let [n, r] = b0t(),
    s = authKindOf(n, r),
    h = getAuthenticatedAccountInfo(),
    S = n === "claude.ai" || r === "/login managed key" ? getOauthAccountInfo() : void 0,
    w = h?.organizationUuid !== void 0,
    L = w ? h : S,
    G = L?.organizationUuid;
  if (G === void 0 || !isForcedOrg(G)) return { kind: s, isVerified: !1 };
  let Z = S?.organizationUuid === G ? (S?.organizationType ?? void 0) : void 0,
    Se = L?.emailAddress;
  return {
    kind: s,
    organizationId: G,
    ...(Z !== void 0 && { organizationType: Z }),
    ...(Se !== void 0 && { email: Se }),
    isVerified: w,
  };
}
/**
 * $.session：返回会话 id、cwd、项目根与当前模型（无会话时取进程值）。
 */
//@ chunk-e6aww6q8.js:782253-782455 placement
async function sessionInfoOp(e, n) {
  let r = lp();
  if (r === void 0)
    logForDebugging(`$.session (${e}): no session bound; id, cwd and model answered from the process`);
  return {
    id: String(getSessionId()),
    cwd: n ?? getCwd(),
    root: getOriginalCwd(),
    model: r?.model() ?? getMainLoopModel(),
  };
}
//@ chunk-e6aww6q8.js:782455-782654 placement
function createHeldConversations() {
  let e = new Map();
  return {
    hold: (n, r) => {
      let s = Symbol(n);
      return (
        e.set(n, { token: s, messages: r }),
        () => {
          if (e.get(n)?.token === s) e.delete(n);
        }
      );
    },
    current: (n) => e.get(n)?.messages,
    clear: () => {
      e.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:782654-782689 placement
var nge = ge(createHeldConversations(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:782689-782967 placement
async function readSavedAgentMessages(e, n) {
  try {
    let savedAgentMessages = await e.savedAgentMessages(n);
    if (!savedAgentMessages) return;
    let s = new Set(e.messages().map((h) => h.uuid));
    return savedAgentMessages.filter((h) => !s.has(h.uuid));
  } catch (error) {
    logForDebugging(
      `$.session.messages: the saved transcript of agent ${n} could not be read: ${errorMessage(error)}`,
      { level: "warn" },
    );
    return;
  }
}
/**
 * 把本地代理或进程内队友任务描述为统一形状：id、队友 id、描述、类型、父 id、名字。
 */
//@ chunk-e6aww6q8.js:782967-783423 placement
function describeAgentTask(e) {
  switch (e.type) {
    case "local_agent":
      return {
        id: e.agentId,
        teammateId: void 0,
        description: e.description,
        type: e.agentType,
        parentId: e.parentAgentId,
        name: void 0,
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
/**
 * 按代理 id 找任务（优先未结束的，否则最后一个）。
 */
//@ chunk-e6aww6q8.js:783423-783536 placement
function findAgentTask(e, n) {
  let filtered = Object.values(e).filter((s) => describeAgentTask(s)?.id === n);
  return filtered.find((s) => !isTerminalTaskStatus(s.status)) ?? filtered.at(-1);
}
/**
 * 取代理任务的转录消息（不可恢复的队友或 fork worker 返回 undefined）。
 */
//@ chunk-e6aww6q8.js:783536-783758 placement
function agentTranscriptMessages(e, n) {
  let r = findAgentTask(e.all(), n);
  if (r === void 0) return;
  return (
    r.type === "in_process_teammate"
      ? r.identity.resumableAgentId === void 0
      : r.type === "local_agent" && r.forkWorker === !0
  )
    ? void 0
    : (e.getTranscript(r.id)?.messages ?? dnt);
}
//@ chunk-e6aww6q8.js:783758-783979 placement
async function agentConversation(e, n) {
  let r = await readSavedAgentMessages(e, n),
    s = agentTranscriptMessages(e.toolContext(new AbortController()).taskRegistry, n) ?? nge.current(n);
  if (!r) return s;
  let h = s ?? [],
    y = new Set(h.map((S) => S.uuid));
  return [...r.filter((S) => !y.has(S.uuid)), ...h];
}
/**
 * turn.complete 期间暂存某代理的对话，返回释放函数。
 */
//@ chunk-e6aww6q8.js:783979-784186 placement
function holdAgentConversation(e) {
  try {
    let n = lp(),
      r = n && agentTranscriptMessages(n.toolContext(new AbortController()).taskRegistry, e);
    return r ? nge.hold(e, r) : () => {};
  } catch (error) {
    return (
      logForDebugging(`turn.complete (agent ${e}): conversation not held: ` + errorMessage(error)),
      () => {}
    );
  }
}
//@ chunk-e6aww6q8.js:784186-784338 placement
function agentResultSummary(e) {
  if (!isPlainObject_4(e)) return {};
  let { agentId: agentId, totalDurationMs: totalDurationMs } = e;
  return {
    ...(typeof agentId === "string" && { agentId: agentId }),
    ...(typeof totalDurationMs === "number" && { durationMs: totalDurationMs }),
  };
}
/**
 * 生成映射函数：给 tool_use 附上对应结果文本、错误、meta，以及（Agent/Task 工具）子代理 id 与耗时。
 */
//@ chunk-e6aww6q8.js:784338-784653 placement
var attachToolResults = (e, n) => (r) => {
  let s = r.tool === AGENT || r.tool === TASK,
    h = e.get(r.tool_use_id),
    y = s ? n?.(r.tool_use_id) : void 0,
    S = h !== void 0 && "result" in h;
  return {
    ...r,
    ...(S && { result: h.result }),
    ...(h !== void 0 && { text: h.text }),
    ...(h?.isError === !0 && { isError: !0 }),
    ...(h?.meta !== void 0 && { meta: h.meta }),
    ...(y !== void 0 && { agentId: y }),
    ...(s && agentResultSummary(h?.result)),
  };
};
//@ chunk-e6aww6q8.js:784653-784896 placement
function toPluginTranscript(e, n) {
  let r = [],
    s = new Map(),
    h = attachToolResults(s, n);
  for (let y of e.toReversed()) {
    if (r.length === CLONE_DEPTH_THRESHOLD) break;
    let S = toPluginMessage(y);
    if (!S) continue;
    for (let w of S.toolResults ?? []) s.set(w.tool_use_id, w);
    r.push({ ...S, toolUses: S.toolUses.map(h) });
  }
  return r.reverse();
}
//@ chunk-e6aww6q8.js:784896-785056 placement
function toolUseAgentMap(e) {
  let n = new Map();
  for (let r of Object.values(e.all())) {
    let s = describeAgentTask(r);
    if (s !== void 0 && r.toolUseId !== void 0) n.set(r.toolUseId, s.id);
  }
  return (r) => n.get(r);
}
/**
 * $.session.messages：返回主线程或指定代理的对话（as: "api" 时为请求消息尾部）；代理不存在时拒绝。
 */
//@ chunk-e6aww6q8.js:785056-785458 placement
async function sessionMessagesOp(e, n) {
  let r = requireBoundSession(n, "$.session.messages"),
    { agentId: agentId } = e,
    h = e.as === "api",
    y = agentId === void 0 ? r.messages() : await agentConversation(r, agentId);
  if (!y)
    return {
      deny: `no conversation of agent ${agentId} in this session: not one of its agents, running in another process, or finished with no saved transcript this session reads back`,
    };
  return h
    ? tailApiMessages(r.requestMessages(y))
    : toPluginTranscript(y, toolUseAgentMap(r.toolContext(new AbortController()).taskRegistry));
}
/**
 * $.session.repo：返回 git 根、远程地址、是否内部仓库与名字。
 */
//@ chunk-e6aww6q8.js:785458-785643 placement
async function sessionRepoOp(e) {
  let n = e ?? getCwd(),
    r = dY(n),
    s = r ?? findCanonicalGitRoot(n);
  if (s === null) return null;
  let [h, y] = await Promise.all([getRemoteUrlForDir(n), vTo(e)]);
  return { root: s, remote: LTo(h), internal: y, name: await xTo(r, h, y) };
}
/**
 * 解析会话地址：活跃会话用其 socket，否则 session_/cse_ 前缀视为远程会话。
 */
//@ chunk-e6aww6q8.js:785643-785955 placement
async function resolveSessionAddress(e, n) {
  let r = await n(e);
  if (r !== null) return { to: u8(r.sock) };
  return e.startsWith("session_") || e.startsWith("cse_")
    ? { to: DBe(e) }
    : {
        reason: `no live session on this machine has id ${e} (a session that exited, or another machine's; a Remote Control or cloud session is addressed by its session_... id)`,
      };
}
//@ chunk-e6aww6q8.js:785955-786098 placement
function resolveSendTarget(e, n) {
  if (typeof e === "string") return Promise.resolve({ to: e });
  return "agentId" in e ? Promise.resolve({ to: e.agentId }) : resolveSessionAddress(e.sessionId, n);
}
//@ chunk-e6aww6q8.js:786098-786148 placement
var P0t = "the SendMessage tool did not deliver it";
//@ chunk-e6aww6q8.js:786148-786401 placement
function sendResultOf(e) {
  if (e.deny !== void 0) return { isDelivered: !1, reason: e.deny };
  let n = isPlainObject_4(e.result) ? e.result : void 0;
  if (e.isError !== !0 && n?.success === !0) return { isDelivered: !0 };
  let s = n?.message;
  return { isDelivered: !1, reason: typeof s === "string" && s !== "" ? s : e.text || P0t };
}
/**
 * 求队友的投递地址（按 agentId 找正在运行的进程内队友）。
 */
//@ chunk-e6aww6q8.js:786401-786767 placement
function teammateAddressFor(e, n) {
  let r = typeof e === "object" && "agentId" in e ? e.agentId : void 0,
    [s] = n.flatMap((S) =>
      r !== void 0 &&
      S.type === "in_process_teammate" &&
      !isTerminalTaskStatus(S.status) &&
      (S.identity.agentId === r || S.identity.resumableAgentId === r)
        ? [S.identity.agentName]
        : [],
    ),
    h = s !== void 0,
    y = r?.includes("@") === !0;
  return h ? { to: s } : y ? { reason: `no live teammate of this session has the address ${r}` } : void 0;
}
/**
 * 插件 $.session.send：经 SendMessage 向其他会话发消息。
 */
//@ chunk-e6aww6q8.js:786767-787645 placement
async function sessionSendForPlugin(e, n, r) {
  let { plugin: plugin, signal: signal, origin: origin } = n,
    S = requireBoundSession(plugin, "$.session.send");
  if (!S.tools().some((ke) => ke.name === SENDMESSAGE))
    return {
      isDelivered: !1,
      reason: "this session has no SendMessage tool (messaging between sessions and agents is not on here)",
    };
  let { taskRegistry: taskRegistry } = S.toolContext(new AbortController()),
    G =
      teammateAddressFor(e.to, Object.values(taskRegistry.all())) ??
      (await resolveSendTarget(e.to, r.findLive));
  if (G.reason !== void 0)
    return (
      logForDebugging(`$.session.send (${plugin}): not sent: ${G.reason}`),
      { isDelivered: !1, reason: G.reason }
    );
  logForDebugging(`$.session.send (${plugin}): to ${G.to}: ` + jsonStringify(truncateToLength(e.text, Hme)));
  let q = { isRead: !1 };
  if (
    (Km(() => {
      (submitHoldRefusal(n, "$.session.send"), (q.isRead = !0));
    }),
    !q.isRead)
  )
    return { isDelivered: !1, reason: "the hold on plugins' input could not be read" };
  let run = await r.run(
      { tool: SENDMESSAGE, to: G.to, message: e.text },
      { plugin: plugin, signal: signal, origin: origin },
    ),
    Se = sendResultOf(run);
  return (
    logForDebugging(
      `$.session.send (${plugin}): ` + (Se.isDelivered ? "delivered" : `not delivered: ${Se.reason}`),
    ),
    Se
  );
}
/**
 * $.session.turns：统计人类发起的用户消息数（不含 meta、虚拟与工具结果）。
 */
//@ chunk-e6aww6q8.js:787645-787844 placement
async function sessionTurnsOp(e) {
  let n = lp();
  if (!n) return (logForDebugging(`$.session.turns (${e}): no session bound; 0`), 0);
  return count(
    n.messages(),
    (r) => r.type === "user" && r.isMeta !== !0 && r.isVirtual !== !0 && !TTo(r.message.content),
  );
}
//@ chunk-e6aww6q8.js:3693330-3693379 placement
var ZMn = (e, n, r) => ({ tokens: e, window: n, percent: r });
//@ chunk-e6aww6q8.js:3693379-3693591 placement
function contextUsageOf(e, n) {
  let r = buildContextWindowStatus(getLastApiUsage(Us([...e])), getContextWindow(n, getSdkBetas())),
    s = r.total_input_tokens === 0 ? null : r.used_percentage;
  if (s === null) return { window: r.context_window_size };
  return ZMn(r.total_input_tokens, r.context_window_size, s);
}
//@ chunk-e6aww6q8.js:3693591-3693733 placement
var rateLimitWindow = (e, n) => ({
  kind: e,
  percentUsed: e === "spend_limit" ? utilizationPercent(n.utilization) : planWindowPercent(n.utilization),
  resetsAt: new Date(n.resets_at * SLOW_HOOK_REPORT_INTERVAL_MS).toISOString(),
});
//@ chunk-e6aww6q8.js:3693733-3693925 placement
function rateLimitWindows(e, n) {
  let r = n === "gateway" ? e.overage : void 0;
  return [
    ...(e.five_hour ? [rateLimitWindow("five_hour", e.five_hour)] : []),
    ...(e.seven_day ? [rateLimitWindow("seven_day", e.seven_day)] : []),
    ...(r ? [rateLimitWindow("spend_limit", r)] : []),
  ];
}
//@ chunk-e6aww6q8.js:3693925-3694105 placement
var buildSessionUsage = ({ breakdown: breakdown, ...n }) => ({
  startedAt: n.startedAt,
  context: { ...contextUsageOf(n.messages, n.model), ...(breakdown !== void 0 && { breakdown: breakdown }) },
  rateLimits: rateLimitWindows(n.windows, n.provider),
  cost: { usd: n.costUsd },
});
/**
 * $.session.usage：返回会话开始时间、上下文用量（可含分类明细）、限额窗口与费用。
 */
//@ chunk-e6aww6q8.js:3694105-3694450 placement
async function sessionUsageOp(e, n) {
  let r = lp(),
    { breakdown: breakdown } = e,
    h = r !== void 0 && breakdown !== void 0;
  if (r === void 0)
    logForDebugging(`$.session.usage (${n}): no session bound; the context window is answered empty`);
  return buildSessionUsage({
    startedAt: getSessionStartTime(),
    model: r?.model() ?? getMainLoopModel(),
    messages: r?.messages() ?? [],
    windows: getRawUtilization(),
    provider: getAPIProvider(),
    costUsd: getTotalCostUSD(),
    breakdown: h ? await D0t(r, { ...e, breakdown: breakdown }) : void 0,
  });
}
/**
 * session.start 在新副本中重跑时，复用之前已做过的 $.prompt.submit/command.run/agent.spawn 调用结果，避免重复执行。
 */
//@ chunk-e6aww6q8.js:3992260-3992999 placement
function dedupeSessionStartCalls(e, n) {
  let r = (s, h) => {
    let { plugin: plugin, environmentId: environmentId } = h,
      L = h.ownRoot === "session.start" ? Aj.get()?.get(plugin) : void 0,
      G = environmentId !== void 0 && L?.copies.has(environmentId);
    if (L === void 0 || environmentId === void 0 || !G) return n(s, h);
    let found = L.calls[e].find((ke) => isDeepStrictEqual_13(ke.args, s));
    if (found === void 0) {
      let ke = { ...P0n(environmentId, s, n(s, h)), endsWith: A0n[e] ? h.signal : void 0 };
      return (
        (L.calls = { ...L.calls, [e]: L.calls[e].concat(ke) }),
        ke.result.then(
          (we) => isAbortedCallResult(ke, we) && hat(L, e, ke),
          () => hat(L, e, ke),
        ),
        ke.result
      );
    }
    let Z = found.starts.has(environmentId),
      Se = !found.isRepeated && !Z;
    if (((found.isRepeated = found.isRepeated || Z), !Se)) return n(s, h);
    return (
      found.starts.add(environmentId),
      found.result.then((ke) => {
        let we = isAbortedCallResult(found, ke);
        if (!we)
          reportPluginProblem(
            plugin,
            `its session.start ran again in a fresh copy; the $.${e} call it had already made was not made again`,
          );
        return we ? r(s, h) : ke;
      })
    );
  };
  return r;
}
/**
 * $.turn.abort：只能中止当前运行的回合（id 必须匹配且未在结束中）。
 */
//@ chunk-e6aww6q8.js:3992999-3993493 placement
function turnAbortOp(e, n) {
  let r = vbe();
  if (!r)
    return Promise.reject(new HooksError(`${n}: $.turn.abort: no turn is running (asked for ${e.turnId})`));
  if (r.turnId !== e.turnId)
    return Promise.reject(
      new HooksError(
        `${n}: $.turn.abort: ${e.turnId} is not the running turn (${r.turnId}); a hook ends the turn turn.start told it about`,
      ),
    );
  if (r.cancelled())
    return Promise.reject(new HooksError(`${n}: $.turn.abort: ${e.turnId} is already ending`));
  return (logForDebugging(`$.turn.abort (${n}): cancelled turn ${e.turnId}`), r.cancel(), Promise.resolve());
}
/**
 * 校验 $.ui.notify 参数：text 为字符串，surface 合法。
 */
//@ chunk-e6aww6q8.js:3993493-3993711 placement
function checkNotifyArgs(e) {
  if (typeof e?.text !== "string") return "takes { text, surface? } (a string text)";
  let surface = e.surface;
  return surface === void 0 || W5e(surface)
    ? void 0
    : "surface is not the name of a surface (terminal, desktop, mobile, vscode)";
}

export {
  describeAgentTask,
  holdAgentConversation,
  sessionUsageOp,
  findAgentTask,
  vBr,
  Vme,
  requireBoundSession,
  mWe,
  submitHoldRefusal,
  Hme,
  LATER,
  attachToolResults,
  toPluginMessage,
  sessionAuthorizeForPlugin,
  sessionIdentity,
  identityRefusal,
  m0t,
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
