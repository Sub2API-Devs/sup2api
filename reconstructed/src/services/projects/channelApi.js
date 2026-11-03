/**
 * services/projects/channelApi.ts
 *
 * 2.1.316 新增：Projects channels API
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (35)
 * attribution: placement 35
 */
import { randomUUID } from "crypto";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { CloudSessionAccessError, trustedDeviceHeaders } from "../../utils/teleport/api.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { printableName, stripAnsiAndControls } from "../../utils/printableName.js";
import { apiClient } from "../routines/routinesApi.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-dz3q485w.js:2341-2380 placement
/**
 * 项目频道 API 的各步超时与分页大小。
 */
var CHANNEL_REQUEST_TIMEOUT_MS = 15000;
var CHANNEL_WAIT_FOR_SESSION_TIMEOUT_MS = 120000;
var CHANNEL_RPC_TIMEOUT_MS = 30000;
var CHANNEL_LIST_PAGE_SIZE = 50;
//@ chunk-dz3q485w.js:2380-2439 placement
function parseVisibility(visibility) {
  return visibility === "public" || visibility === "private" ? visibility : undefined;
}
//@ chunk-dz3q485w.js:2439-2866 placement
/**
 * 判断项目是否不能作为发送目标：已暂停/归档、共享项目或可见性未知时返回原因，个人私有项目返回 null。
 */
function projectNotTargetReason(channel) {
  if (channel.closed === true)
    return "that project is paused or archived. Pick one of your personal projects, or create a new one";
  if (channel.visibility === "private") return null;
  return typeof channel.visibility === "string" && channel.visibility !== ""
    ? "that project is shared. Pick one of your personal projects, or create a new one"
    : "the server did not say whether that project is personal. Pick one of your personal projects, or create a new one";
}
//@ chunk-dz3q485w.js:2866-3124 placement
class ChannelApiError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  status;
  telemetryCode;
  detail;
  serverWord;
  constructor(e, status, s, telemetryCode = "request_failed", serverWord) {
    super(`Could not ${e}: ${s}`, "projects channel request failed");
    this.name = "ChannelApiError";
    this.status = status;
    this.telemetryCode = telemetryCode;
    this.detail = s;
    this.serverWord = serverWord;
  }
}
//@ chunk-dz3q485w.js:3124-3266 placement
/**
 * 判断 Projects 频道 API 错误是否可重试：非 ChannelApiError，或请求失败且状态为空、5xx、408、429。
 */
function isRetryableChannelError(error) {
  return (
    !(error instanceof ChannelApiError) ||
    (error.telemetryCode === "request_failed" &&
      (error.status === null || error.status >= 500 || error.status === 408 || error.status === 429))
  );
}
//@ chunk-dz3q485w.js:3266-3387 placement
var NETWORK_UNREACHABLE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EADDRNOTAVAIL",
  "ERR_PROXY_TUNNEL",
]);
//@ chunk-dz3q485w.js:3387-3443 placement
function isNetworkOrAccessError(e) {
  return e instanceof CloudSessionAccessError || NETWORK_UNREACHABLE_CODES.has(getErrnoCode(e) ?? "");
}
//@ chunk-dz3q485w.js:3443-3790 placement
/**
 * 判断发送失败时消息是否确定没有发出：网络不可达、策略关闭、输入无效、目标不对，或 4xx（除 408/429）错误。
 */
function isDefinitelyNotSent(error) {
  if (isNetworkOrAccessError(error)) return true;
  if (!(error instanceof ChannelApiError)) return false;
  switch (error.telemetryCode) {
    case "policy_disabled":
    case "invalid_input":
    case "not_a_target":
      return true;
    case "bad_response":
      return false;
    case "auth_or_access":
    case "request_failed":
      return error.status === null
        ? error.telemetryCode === "auth_or_access"
        : error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;
  }
}
//@ chunk-dz3q485w.js:3790-4145 placement
/**
 * Projects 不可用时的原因文案：数据驻留（非一方提供方）、仅必要流量、未登录 claude.ai。
 */
function policyRefusalText(e) {
  switch (e.reason) {
    case "data-residency":
      return "Projects are only available on the first-party Anthropic API provider.";
    case "essential-traffic-only":
      return "Projects are disabled when only essential traffic is allowed (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).";
    case "no-auth":
      return `${e.detail}. Projects require a Claude.ai login (/login).`;
  }
}
//@ chunk-dz3q485w.js:4145-4222 placement
/**
 * 频道 id 与会话 id 的格式正则。
 */
var CHANNEL_ID_REGEX = /^chan_[A-Za-z0-9_-]{1,120}$/;
var SESSION_ID_REGEX = /^[a-z]{2,12}_[A-Za-z0-9_-]{1,120}$/;
//@ chunk-dz3q485w.js:4222-4389 placement
function channelPath(e, n, s) {
  if (!CHANNEL_ID_REGEX.test(e))
    throw new ChannelApiError(s, null, "the project id has an unexpected shape", "invalid_input");
  return `/v1/code/channels/${encodeURIComponent(e)}${n}`;
}
//@ chunk-dz3q485w.js:4389-4519 placement
function apiErrorBody(e) {
  let n = e;
  if (typeof n === "string")
    try {
      n = jsonParse(n);
    } catch {
      n = null;
    }
  let error = n?.error;
  return typeof error === "object" && error !== null ? error : null;
}
//@ chunk-dz3q485w.js:4519-4604 placement
function normalizeApiCode(e) {
  return typeof e === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(e) ? e : undefined;
}
//@ chunk-dz3q485w.js:4604-4669 placement
function apiErrorResourceOrReason(e) {
  let n = apiErrorBody(e);
  return normalizeApiCode(n?.resource) ?? normalizeApiCode(n?.reason);
}
//@ chunk-dz3q485w.js:4669-4741 placement
async function withTrustedDeviceHeaders(e) {
  return {
    headers: {
      ...e,
      ...(await trustedDeviceHeaders()),
    },
    maxRedirects: 0,
  };
}
//@ chunk-dz3q485w.js:4741-4937 placement
function clearStaleTrustedDevice(status, n) {
  let s = status === 403 ? apiErrorResourceOrReason(n) : undefined;
  if (s !== "untrusted_device" && s !== "session_stale_relogin") return;
  import("./chunk-3kb57csj.js")
    .then(({ clearTrustedDeviceTokenCache }) => clearTrustedDeviceTokenCache())
    .catch(() => {});
}
//@ chunk-dz3q485w.js:4937-5060 placement
function channelErrorMessage(status, n, s) {
  let message = apiErrorBody(n)?.message;
  return typeof message === "string" && message !== ""
    ? printableName(message, s)
    : `the server responded with status ${status}`;
}
//@ chunk-dz3q485w.js:5060-5362 placement
/**
 * 校验 Projects 频道 API 响应：未发出请求抛策略/认证错误，3xx 以上抛带状态码与服务端消息的 ChannelApiError（403 时清理受信设备令牌），否则返回状态与数据。
 */
function checkChannelResponse(e, n) {
  if (!e.ok)
    throw new ChannelApiError(
      n,
      null,
      policyRefusalText(e),
      e.reason === "no-auth" ? "auth_or_access" : "policy_disabled",
    );
  if (e.status >= 300) {
    clearStaleTrustedDevice(e.status, e.data);
    throw new ChannelApiError(
      n,
      e.status,
      channelErrorMessage(e.status, e.data),
      e.status === 401 || e.status === 403 ? "auth_or_access" : "request_failed",
      apiErrorResourceOrReason(e.data),
    );
  }
  return {
    status: e.status,
    data: e.data,
  };
}
//@ chunk-dz3q485w.js:5362-5462 placement
function parseTimestampMs(lastMessageAt) {
  if (typeof lastMessageAt !== "string") return null;
  let timestamp = Date.parse(lastMessageAt);
  return Number.isNaN(timestamp) ? null : timestamp;
}
//@ chunk-dz3q485w.js:5462-5880 placement
/**
 * 解析频道列表响应：保留有 id 与名称的频道（最后消息时间、协调会话 id、可见性、是否关闭）与下一页游标。
 */
function parseChannelList(e) {
  let n = e;
  return {
    channels: (Array.isArray(n?.data) ? n.data : []).flatMap((a) => {
      let l = a;
      return typeof l?.id === "string" && typeof l.name === "string"
        ? [
            {
              id: l.id,
              name: l.name,
              lastMessageAtMs: parseTimestampMs(l.last_message_at),
              coordinatorSessionId: coordinatorSessionIdOf(l),
              visibility: parseVisibility(l.visibility),
              ...((l.archived_at != null || l.disabled_at != null) && {
                closed: true,
              }),
            },
          ]
        : [];
    }),
    nextCursor: typeof n?.next_cursor === "string" && n.next_cursor !== "" ? n.next_cursor : null,
  };
}
//@ chunk-dz3q485w.js:5880-6166 placement
/**
 * 获取已加入的 Projects 频道列表的一页（GET /v1/code/channels?scope=joined）。
 */
async function listChannelsPage(e, signal, credentials) {
  let uRLSearchParams = new URLSearchParams({
    scope: "joined",
    limit: String(CHANNEL_LIST_PAGE_SIZE),
    ...(e !== null && {
      cursor: e,
    }),
  });
  let a = await apiClient.get(`/v1/code/channels?${uRLSearchParams}`, {
    auth: "teleport-org",
    ...(await withTrustedDeviceHeaders()),
    validateStatus: () => true,
    timeout: CHANNEL_REQUEST_TIMEOUT_MS,
    signal,
    credentials,
  });
  return parseChannelList(checkChannelResponse(a, "list your Projects").data);
}
//@ chunk-dz3q485w.js:6166-6305 placement
/**
 * 规范化项目名用于匹配：去除默认忽略字符与控制字符、NFKC、压缩空格并转小写。
 */
function normalizeProjectName(e) {
  return stripAnsiAndControls(e.replace(/\p{Default_Ignorable_Code_Point}/gu, "").normalize("NFKC"))
    .replace(/ {2,}/g, " ")
    .trim()
    .toLowerCase();
}
//@ chunk-dz3q485w.js:6305-7069 placement
/**
 * 向项目频道发送一条消息（POST /v1/code/channels/:id/messages，带客户端消息 id 与可选回复对象），返回消息 id 与线程根 id，并记录特性状态。
 */
async function postChannelMessage(channelId, message, signal, credentials) {
  try {
    let a = await apiClient.post(
      `/v1/code/channels/${encodeURIComponent(channelId)}/messages`,
      {
        body: message.body,
        client_message_id: message.clientMessageId,
        ...(message.replyToMessageId !== undefined && {
          reply_to_message_id: message.replyToMessageId,
        }),
      },
      {
        auth: "teleport-org",
        ...(await withTrustedDeviceHeaders()),
        validateStatus: () => true,
        timeout: CHANNEL_REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
        signal,
        credentials,
      },
    );
    let { data: l } = checkChannelResponse(a, "send the message");
    let c = l;
    if (typeof c?.message_id !== "string" || typeof c.thread_root_id !== "string")
      throw new ChannelApiError(
        "send the message",
        null,
        "the server response was missing the message id",
        "bad_response",
      );
    logFeatureOk("projects_send");
    return {
      messageId: c.message_id,
      threadRootId: c.thread_root_id,
      deduplicated: c.deduplicated === true,
    };
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_send",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:7069-7253 placement
function parseChannelSummary(e) {
  let n = e;
  let channel = n?.channel ?? n;
  if (typeof channel?.id !== "string" || !CHANNEL_ID_REGEX.test(channel.id)) return null;
  return {
    id: channel.id,
    name: typeof channel.name === "string" ? printableName(channel.name, 80) : "",
    coordinatorSessionId: coordinatorSessionIdOf(channel),
  };
}
//@ chunk-dz3q485w.js:7253-7375 placement
function coordinatorSessionIdOf(e) {
  let n = (s) => (typeof s === "string" && SESSION_ID_REGEX.test(s) ? s : null);
  return n(e.channel_session_id) ?? n(e.overview_session_id);
}
//@ chunk-dz3q485w.js:7375-8251 placement
/**
 * 创建私有 Projects 频道（名称、图标、颜色、主题、说明、默认环境），返回频道摘要并记录特性状态。
 */
async function createProjectChannel(spec, signal, credentials) {
  try {
    let r = await apiClient.post(
      "/v1/code/channels",
      {
        visibility: "private",
        name: spec.name,
        icon: spec.icon ?? "Code",
        ...(spec.color !== undefined &&
          spec.color !== "" && {
            color: spec.color,
          }),
        ...(spec.topic !== undefined &&
          spec.topic !== "" && {
            topic: spec.topic,
          }),
        ...(spec.instructions !== undefined &&
          spec.instructions !== "" && {
            system_prompt_addendum: spec.instructions,
          }),
        ...(spec.defaultEnvironmentId !== undefined &&
          spec.defaultEnvironmentId !== "" && {
            default_environment_id: spec.defaultEnvironmentId,
          }),
      },
      {
        auth: "teleport-org",
        ...(await withTrustedDeviceHeaders()),
        validateStatus: () => true,
        timeout: spec.waitsForSession ? CHANNEL_WAIT_FOR_SESSION_TIMEOUT_MS : CHANNEL_REQUEST_TIMEOUT_MS,
        ...(spec.waitsForSession && {
          maxRedirects: 0,
        }),
        signal,
        credentials,
      },
    );
    let { data: a } = checkChannelResponse(r, "create the project");
    let channelSummary = parseChannelSummary(a);
    if (channelSummary === null)
      throw new ChannelApiError(
        "create the project",
        null,
        "the server response was missing the project id",
        "bad_response",
      );
    logFeatureOk("projects_create");
    return channelSummary;
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_create",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:8251-8317 placement
/**
 * 取某个所有者对应的项目频道。
 */
async function getOwnerProjectChannel(channelId, signal, credentials) {
  return (await getProjectChannel(channelId, "owner", signal, credentials)).channel;
}
//@ chunk-dz3q485w.js:8317-8416 placement
var PROJECT_NOT_FOUND_MESSAGE =
  "that project was not found, or this login is not a member of it: join it on the web first";
//@ chunk-dz3q485w.js:8416-10120 placement
/**
 * 获取 Projects 频道信息并校验调用者关系：要求 owner 时检查拥有者、私有且未关闭，要求 member 时检查成员、未归档、未被套餐禁用，失败抛 ChannelApiError，并记录特性状态。
 */
async function getProjectChannel(channelId, requiredRole, signal, credentials, includeMembers = false) {
  let path = channelPath(channelId, includeMembers ? "?include_members=true" : "", "look up the project");
  try {
    let h = await apiClient.get(path, {
      auth: "teleport-org",
      ...(await withTrustedDeviceHeaders()),
      validateStatus: () => true,
      timeout: CHANNEL_REQUEST_TIMEOUT_MS,
      signal,
      credentials,
    });
    if (requiredRole === "member" && h.ok && h.status === 404)
      throw new ChannelApiError("look up the project", 404, PROJECT_NOT_FOUND_MESSAGE, "auth_or_access");
    let b = checkChannelResponse(h, "look up the project").data;
    let channelSummary = parseChannelSummary(b);
    if (channelSummary === null)
      throw new ChannelApiError(
        "look up the project",
        null,
        "the server returned an unexpected shape",
        "bad_response",
      );
    let channel = b?.channel ?? b;
    let j = (R) => (typeof R === "string" ? R.toLowerCase() : "");
    let callerRelations = Array.isArray(channel?.caller_relations) ? channel.caller_relations : [];
    let P =
      callerRelations.some((callerRelation) => j(callerRelation) === "owner") ||
      j(channel?.membership?.role) === "owner";
    if (requiredRole === "owner" && !P)
      throw new ChannelApiError(
        "look up the project",
        null,
        "your Claude account does not own that project",
        "auth_or_access",
      );
    if (
      requiredRole === "member" &&
      !callerRelations.some((callerRelation) => j(callerRelation) === "member")
    )
      throw new ChannelApiError("look up the project", null, PROJECT_NOT_FOUND_MESSAGE, "auth_or_access");
    let L =
      requiredRole === "owner"
        ? projectNotTargetReason({
            visibility: channel?.visibility,
            closed: channel?.archived_at != null || channel?.disabled_at != null,
          })
        : null;
    if (L !== null) throw new ChannelApiError("look up the project", null, L, "not_a_target");
    if (requiredRole === "member" && channel?.archived_at != null)
      throw new ChannelApiError(
        "look up the project",
        null,
        "that project is archived",
        "auth_or_access",
        "channel_archived",
      );
    if (requiredRole === "member" && channel?.disabled_by_plan === true)
      throw new ChannelApiError(
        "look up the project",
        null,
        "that project's organization is on a plan under which Claude does no work in Projects",
        "auth_or_access",
        "channel_disabled_by_plan",
      );
    logFeatureOk("projects_channel_get");
    return {
      channel: channelSummary,
      disabledAt: channel?.disabled_at,
      agentId: channel?.agent_id,
      visibility: channel?.visibility,
      members: channel?.members,
      membersTruncated: channel?.members_truncated,
    };
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_channel_get",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:10120-10410 placement
function parseChannelConfig(e) {
  let n = e;
  let config = n?.config ?? n;
  return {
    defaultModel:
      typeof config?.default_model === "string" && config.default_model !== ""
        ? printableName(config.default_model, 80)
        : null,
    defaultSourceUrls: Array.isArray(config?.default_source_urls)
      ? config.default_source_urls
          .filter((defaultSourceUrl) => typeof defaultSourceUrl === "string")
          .slice(0, 50)
          .map((defaultSourceUrl) => printableName(defaultSourceUrl, 300))
      : [],
  };
}
//@ chunk-dz3q485w.js:10410-10884 placement
/**
 * 更新项目频道配置（默认来源 URL 列表），返回解析后的默认模型与来源 URL。
 */
async function updateChannelConfig(id, n, signal, credentials) {
  let a = channelPath(id, "/config", "update the project settings");
  try {
    let l = await apiClient.patch(
      a,
      {
        ...(n.defaultSourceUrls !== undefined && {
          default_source_urls: n.defaultSourceUrls,
        }),
      },
      {
        auth: "teleport-org",
        ...(await withTrustedDeviceHeaders()),
        validateStatus: () => true,
        timeout: CHANNEL_REQUEST_TIMEOUT_MS,
        signal,
        credentials,
      },
    );
    let { data: c } = checkChannelResponse(l, "update the project settings");
    logFeatureOk("projects_config_update");
    return parseChannelConfig(c);
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_config_update",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:10884-10893 placement
var JSON_RPC_REQUEST_ID = 1;
//@ chunk-dz3q485w.js:10893-11996 placement
/**
 * 解析 /v1/code/mcp/meta 的回复（JSON 或 SSE 文本）：找到与请求 id 对应的 JSON-RPC 响应，RPC 错误或工具 isError 时抛错，否则返回拼接后的文本内容。
 */
function parseRpcToolText(body, action) {
  let trimmed = (typeof body === "string" ? body : jsonStringify(body)).trim();
  if (trimmed === "") throw new ChannelApiError(action, null, "the server reply was empty", "bad_response");
  let payloads =
    trimmed.startsWith("{") || trimmed.startsWith("[")
      ? [trimmed]
      : trimmed
          .split(/\r?\n\r?\n/)
          .map((line) =>
            line
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).replace(/^ /, "")).join(`
`),
          )
          .filter((w) => w.trim() !== "");
  let sawNonJson = false;
  let response = null;
  for (let payload of payloads) {
    let y;
    try {
      y = jsonParse(payload);
    } catch {
      sawNonJson = true;
      continue;
    }
    let j = Array.isArray(y) ? y : [y];
    for (let S of j) {
      let P = S;
      if (
        P !== null &&
        typeof P === "object" &&
        P.id === JSON_RPC_REQUEST_ID &&
        (P.result !== undefined || P.error !== undefined)
      )
        response = P;
    }
  }
  if (response === null)
    throw new ChannelApiError(
      action,
      null,
      sawNonJson ? "the server reply was not JSON" : "the server reply carried no response to the call",
      "bad_response",
    );
  if (response.error !== undefined) {
    let message = response.error?.message;
    throw new ChannelApiError(
      action,
      null,
      typeof message === "string" && message !== ""
        ? printableName(message)
        : "the server returned an RPC error",
      "bad_response",
    );
  }
  let text = (Array.isArray(response.result?.content) ? response.result.content : [])
    .map((w) => {
      let y = w;
      return y?.type === "text" && typeof y.text === "string" ? y.text : "";
    })
    .join(
      `
`,
    )
    .trim();
  if (response.result?.isError === true)
    throw new ChannelApiError(
      action,
      null,
      text !== "" ? printableName(text) : "the tool call did not succeed",
      "bad_response",
    );
  return text;
}
//@ chunk-dz3q485w.js:11996-12564 placement
/**
 * 通过 /v1/code/mcp/meta 调用 send_message 工具，把交接摘要立即发给项目协调会话，并解析 JSON-RPC 回复。
 */
async function handOffToCoordinator(sessionId, message, signal, credentials) {
  try {
    let l = await apiClient.post(
      "/v1/code/mcp/meta",
      {
        jsonrpc: "2.0",
        id: JSON_RPC_REQUEST_ID,
        method: "tools/call",
        params: {
          name: "send_message",
          arguments: {
            session_id: sessionId,
            message,
            priority: "now",
          },
        },
      },
      {
        auth: "teleport-org",
        validateStatus: () => true,
        timeout: CHANNEL_RPC_TIMEOUT_MS,
        signal,
        credentials,
        ...(await withTrustedDeviceHeaders({
          Accept: "application/json, text/event-stream",
        })),
        responseType: "text",
      },
    );
    let { data: body } = checkChannelResponse(l, "hand the summary to the project");
    parseRpcToolText(body, "hand the summary to the project");
    logFeatureOk("projects_handoff");
  } catch (error) {
    if (signal?.aborted !== true)
      logFeatureBad(
        "projects_handoff",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:12564-12590 placement
function newRequestId() {
  return randomUUID();
}
export {
  CHANNEL_ID_REGEX,
  normalizeProjectName,
  CHANNEL_LIST_PAGE_SIZE,
  listChannelsPage,
  projectNotTargetReason,
  getOwnerProjectChannel,
  ChannelApiError,
  isRetryableChannelError,
  withTrustedDeviceHeaders,
  checkChannelResponse,
  channelPath,
  apiErrorBody,
  CHANNEL_REQUEST_TIMEOUT_MS,
  newRequestId,
  postChannelMessage,
  isDefinitelyNotSent,
  isNetworkOrAccessError,
  createProjectChannel,
  updateChannelConfig,
  handOffToCoordinator,
};
