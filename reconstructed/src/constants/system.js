/**
 * constants/system.ts
 *
 * 系统提示词前缀与请求归属：三条身份行（CLI / Agent SDK 内的 CLI / Agent SDK 代理）及其选择 getCLISyspromptPrefix；计费归属头 x-anthropic-billing-header 文本（cc_version=版本.指纹、cc_entrypoint、cch、cc_prompt_id 等）及其开关；请求入口名（entrypoint）改写。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/system.ts
 * pieces: chunk-3b05zaw0.js (17), chunk-w5ndchqs.js (3)
 * attribution: placement 3, callgraph-witnessed 1, layout 12, fingerprint 3, affinity 1
 */
import {
  isGatewayAuthPinned,
  getEntrypointOnRequests,
  getGatewayAuth,
  setEntrypointOnRequests,
} from "../bootstrap/state.js";
import { isGatewayToken } from "../bridge/jwtUtils.js";
import { env } from "../utils/env.js";
import { ywi } from "../services/gateway/hostCheck.js";
import {
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
  configuredApiProxyHost,
  isActualFirstPartyAnthropicBaseUrl,
} from "../utils/model/providers.js";
import { getWorkload } from "../utils/workloadContext.js";
import { isSubagentContext } from "../utils/agentContext.js";
import { Dpr, hostOf } from "../services/gateway/internalNetworks.js";
import { logForDebugging } from "../utils/debug.js";
import { CLI, isCustomEntrypointName, validEntrypoint, startsWithRemote } from "../utils/entrypointKinds.js";
import { CLAUDE_AI_INFERENCE_SCOPE } from "./oauth.js";
import { isEnvDefinedFalsy } from "../utils/envUtils.js";

/**
 * 网关计费头字段的条件之一：会话固定在网关（未 unpin）、JWT/ANTHROPIC_AUTH_TOKEN 的 aud 指向网关，或网关地址已确认。
 */
//@ chunk-3b05zaw0.js:529-600 placement
function hasGatewayIdentity(e) {
  return isGatewayAuthPinned(e) || isGatewayToken(e?.jwt ?? env.ANTHROPIC_AUTH_TOKEN) || ywi();
}
/**
 * 允许写进 cc_project_src 的项目来源（harness/user/project/local/flag/managed/admin_default）；Mns 为 claude_proj_ 项目 id 正则。
 */
//@ chunk-3b05zaw0.js:600-743 placement
var ATTRIBUTION_PROJECT_SOURCES = ["harness", "user", "project", "local", "flag", "managed", "admin_default"],
  ATTRIBUTION_PROJECT_ID_RE = /^claude_proj_(?:staging_|local_)?01[1-9A-HJ-NP-Za-km-z]{22}$/;
/**
 * 订阅用户且归属头可发（第一方直连、非远程、未关）。
 */
//@ chunk-3b05zaw0.js:743-786 placement
function isSubscriberAttributionEligible(e) {
  return e.isSubscriber && canSendSubscriberAttribution();
}
/**
 * 生成计费归属头文本 "x-anthropic-billing-header: cc_version=<版本>.<3位指纹>; cc_entrypoint=<入口>;"，按条件追加 cch=00000（第一方 OAuth 或 vertex，发送前由原生层替换）、cc_workload、cc_is_subagent、cc_prev_req、cc_prompt_id、cc_turn_origin、cc_prompt_index/cc_turn_index、cc_gateway、cc_project、cc_prev_msg 等字段；CLAUDE_CODE_ATTRIBUTION_HEADER 为假值时返回空串。
 */
//@ chunk-3b05zaw0.js:786-2921 callgraph-witnessed = getAttributionHeader (0.295)
function getAttributionHeader(e, r, c, p, d, T, o) {
  let n = getAPIProvider();
  if (!(o?.ignoreEnvOptOut === !0 && isFirstPartyDirectApi()) && isAttributionHeaderDisabled()) return "";
  let version = `${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}.${e}`,
    h = getEntrypointOnRequests() ?? process.env.CLAUDE_CODE_ENTRYPOINT ?? "unknown",
    U = (n === "firstParty" && isFirstPartyAnthropicBaseUrl()) || n === "vertex" ? " cch=00000;" : "",
    workload = getWorkload(),
    x = workload ? ` cc_workload=${workload};` : "",
    D = isSubagentContext(r) && !r.isMainSession ? " cc_is_subagent=true;" : "",
    w =
      c !== void 0 &&
      /^req_[A-Za-z0-9_-]{1,36}$/.test(c) &&
      n === "firstParty" &&
      isFirstPartyAnthropicBaseUrl()
        ? ` cc_prev_req=${c};`
        : "",
    v =
      p !== void 0 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p) &&
      n === "firstParty" &&
      isFirstPartyAnthropicBaseUrl()
        ? ` cc_prompt_id=${p};`
        : "",
    k =
      typeof d === "string" &&
      /^[a-z][a-z_]{0,31}$/.test(d) &&
      n === "firstParty" &&
      isFirstPartyAnthropicBaseUrl()
        ? ` cc_turn_origin=${d};`
        : "",
    P = T?.promptIndex,
    m = T?.turnIndex,
    j =
      isIntInRange(P, 0) && isIntInRange(m, 1) && n === "firstParty" && isFirstPartyAnthropicBaseUrl()
        ? ` cc_prompt_index=${P}; cc_turn_index=${m};`
        : "",
    a = n === "gateway" ? getGatewayAuth() : null,
    A = (n === "gateway" || configuredApiProxyHost() !== void 0) && hasGatewayIdentity(a),
    _ = a?.url ?? env.ANTHROPIC_BASE_URL,
    L =
      (_ !== void 0 && (!URL.canParse(_) || Dpr(hostOf(new URL(_))))) ||
      (a?.hostVerdict !== void 0 && "vouched" in a.hostVerdict),
    H = (n === "gateway" || A) && !L ? ` cc_gateway=${A ? "1" : "env"};` : "",
    s = o?.attributionProject,
    q =
      s !== void 0 &&
      ATTRIBUTION_PROJECT_ID_RE.test(s.taggedId) &&
      ATTRIBUTION_PROJECT_SOURCE_SET.has(s.source) &&
      canSendSubscriberAttribution()
        ? ` cc_project=${s.taggedId}; cc_project_src=${s.source};`
        : "",
    E = o?.responseBeforeCompaction?.messageId,
    O = o?.responseBeforeCompaction?.turnPosition?.promptIndex,
    g = o?.responseBeforeCompaction?.turnPosition?.turnIndex,
    R = n === "firstParty" && isFirstPartyAnthropicBaseUrl(),
    Y = E !== void 0 && /^msg_[A-Za-z0-9_]{1,64}$/.test(E) && R ? ` cc_prev_msg=${E};` : "",
    B =
      isIntInRange(O, 0) && isIntInRange(g, 1) && R
        ? ` cc_prev_prompt_index=${O}; cc_prev_turn_index=${g};`
        : "",
    header = `x-anthropic-billing-header: cc_version=${version}; cc_entrypoint=${h};${U}${x}${D}${w}${v}${k}${j}${H}${q}${Y}${B}`;
  return (logForDebugging(`attribution header ${header}`), header);
}
/**
 * "local_projects" 请求入口名。
 */
//@ chunk-3b05zaw0.js:2921-2944 layout
var LOCAL_PROJECTS_ENTRYPOINT = "local_projects";
/**
 * 未设请求入口时把请求入口改成 local_projects。
 */
//@ chunk-3b05zaw0.js:2944-3002 layout
function useLocalProjectsEntrypoint() {
  if (getEntrypointOnRequests() !== void 0) return !1;
  return (setEntrypointOnRequests(LOCAL_PROJECTS_ENTRYPOINT), !0);
}
/**
 * 撤销 local_projects 请求入口。
 */
//@ chunk-3b05zaw0.js:3002-3041 layout
function clearLocalProjectsEntrypoint() {
  if (getEntrypointOnRequests() === LOCAL_PROJECTS_ENTRYPOINT) setEntrypointOnRequests(void 0);
}
/**
 * CLAUDE_CODE_ENTRYPOINT=sdk-cli 且未设请求入口时改用另一入口名（ywr）。
 */
//@ chunk-3b05zaw0.js:3041-3139 layout
function applySdkCliEntrypointOverride() {
  if (getEntrypointOnRequests() !== void 0 || env.CLAUDE_CODE_ENTRYPOINT !== "sdk-cli") return !1;
  return (setEntrypointOnRequests(CLI), !0);
}
/**
 * "claude-desktop-3p"。
 */
//@ chunk-3b05zaw0.js:3139-3165 layout
var CLAUDE_DESKTOP_3P_ENTRYPOINT = "claude-desktop-3p";
/**
 * 读 CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS（仅当入口为 claude-desktop-3p，名字合法且非保留）作为请求上报的入口名，读后清除该变量。
 */
//@ chunk-3b05zaw0.js:3165-3952 layout
function applyEntrypointOnRequestsEnv() {
  let CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS = env.CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS;
  if ((env.unset("CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS"), CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS === void 0))
    return;
  let r = getEntrypointOnRequests();
  if (r !== void 0) {
    logForDebugging(
      `CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS ignored: requests already go out under the name "${r}"`,
    );
    return;
  }
  if (env.CLAUDE_CODE_ENTRYPOINT !== CLAUDE_DESKTOP_3P_ENTRYPOINT) {
    logForDebugging(
      `CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS ignored: it is read only when CLAUDE_CODE_ENTRYPOINT is ${CLAUDE_DESKTOP_3P_ENTRYPOINT}, not "${env.CLAUDE_CODE_ENTRYPOINT ?? ""}"`,
    );
    return;
  }
  if (!isCustomEntrypointName(CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS)) {
    logForDebugging(
      `CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS ignored: "${CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS}" must be 1 to 32 characters of a-z, 0-9, _ and -, start with a letter and not start with sdk`,
    );
    return;
  }
  if (
    validEntrypoint(CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS) !== void 0 ||
    startsWithRemote(CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS) ||
    CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS === LOCAL_PROJECTS_ENTRYPOINT
  ) {
    logForDebugging(
      `CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS ignored: "${CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS}" is reserved (an entrypoint name, a name beginning with remote, or local_projects)`,
    );
    return;
  }
  setEntrypointOnRequests(CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS);
}
/**
 * Anthropic 认证开启且 OAuth scope 含 user:inference。
 */
//@ chunk-3b05zaw0.js:3952-4036 layout
function hasInferenceScope(e) {
  return e.anthropicAuthEnabled && Boolean(e.oauthScopes?.includes(CLAUDE_AI_INFERENCE_SCOPE));
}
/**
 * 订阅用户用 OAuth access token（authToken），否则用 apiKey。
 */
//@ chunk-3b05zaw0.js:4036-4164 layout
function getAuthCredentialsForClient(e) {
  if (e.isSubscriber) return { apiKey: null, authToken: e.oauthAccessToken ?? null };
  return { apiKey: e.apiKey, authToken: null };
}
/**
 * 整数且在 [min, 1e7] 内（用于 prompt/turn 序号校验）。
 */
//@ chunk-3b05zaw0.js:4164-4242 layout
function isIntInRange(e, r) {
  return typeof e === "number" && Number.isInteger(e) && e >= r && e <= 1e7;
}
/**
 * 第一方、默认 base URL、未设 ANTHROPIC_UNIX_SOCKET。
 */
//@ chunk-3b05zaw0.js:4242-4314 layout
function isFirstPartyDirectApi() {
  return (
    getAPIProvider() === "firstParty" && isActualFirstPartyAnthropicBaseUrl() && !env.ANTHROPIC_UNIX_SOCKET
  );
}
/**
 * 第一方直连、非远程、归属头未关闭。
 */
//@ chunk-3b05zaw0.js:4314-4367 layout
function canSendSubscriberAttribution() {
  return isFirstPartyDirectApi() && !env.CLAUDE_CODE_REMOTE && !isAttributionHeaderDisabled();
}
/**
 * CLAUDE_CODE_ATTRIBUTION_HEADER 为假值（0/false/no/off）。旧版名 isAttributionHeaderEnabled 语义相反。
 */
//@ chunk-3b05zaw0.js:4367-4434 fingerprint = isAttributionHeaderEnabled (1)
function isAttributionHeaderDisabled() {
  return isEnvDefinedFalsy(process.env.CLAUDE_CODE_ATTRIBUTION_HEADER);
}
/**
 * 归属项目来源白名单的 Set。
 */
//@ chunk-3b05zaw0.js:4434-4451 affinity
var ATTRIBUTION_PROJECT_SOURCE_SET = new Set(ATTRIBUTION_PROJECT_SOURCES);
/**
 * 身份行（system 第 2 块）："You are Claude Code, Anthropic's official CLI for Claude."；Ue 为 Agent SDK 内运行的 CLI 版本，Ie 为 "You are a Claude agent, built on Anthropic's Claude Agent SDK."；J 为三者集合。
 */
//@ chunk-w5ndchqs.js:2709-2972 fingerprint = DEFAULT_PREFIX (0.5)
var DEFAULT_PREFIX = "You are Claude Code, Anthropic's official CLI for Claude.",
  AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX =
    "You are Claude Code, Anthropic's official CLI for Claude, running within the Claude Agent SDK.",
  AGENT_SDK_PREFIX = "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
  CLI_SYSPROMPT_PREFIXES = [DEFAULT_PREFIX, AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX, AGENT_SDK_PREFIX],
  CLI_SYSPROMPT_PREFIX_SET = new Set(CLI_SYSPROMPT_PREFIXES);
/**
 * 文本是否为三条身份行之一。
 */
//@ chunk-w5ndchqs.js:2972-3004 layout
function isCliSyspromptPrefix(e) {
  return CLI_SYSPROMPT_PREFIX_SET.has(e);
}
/**
 * 选择身份行：vertex 恒为 CLI 行；有录制值用录制值；非交互（-p/SDK）时有 --append-system-prompt 用 "running within the Claude Agent SDK" 行，否则用 "Claude agent, built on … Agent SDK" 行；交互用 CLI 行。
 */
//@ chunk-w5ndchqs.js:3004-3172 fingerprint = getCLISyspromptPrefix (0.887)
function getCLISyspromptPrefix(options) {
  if (getAPIProvider() === "vertex") return DEFAULT_PREFIX;
  if (options?.recorded !== void 0) return options.recorded;
  if (options?.isNonInteractive) {
    if (options.hasAppendSystemPrompt) return AGENT_SDK_CLAUDE_CODE_PRESET_PREFIX;
    return AGENT_SDK_PREFIX;
  }
  return DEFAULT_PREFIX;
}

export {
  useLocalProjectsEntrypoint,
  applyEntrypointOnRequestsEnv,
  getCLISyspromptPrefix,
  getAttributionHeader,
  isCliSyspromptPrefix,
  hasInferenceScope,
  getAuthCredentialsForClient,
  CLI_SYSPROMPT_PREFIX_SET,
  clearLocalProjectsEntrypoint,
  isSubscriberAttributionEligible,
  ATTRIBUTION_PROJECT_ID_RE,
  applySdkCliEntrypointOverride,
};
