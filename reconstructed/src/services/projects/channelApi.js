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
var de = 15000,
  co = 120000,
  uo = 30000,
  DTo = 50;
//@ chunk-dz3q485w.js:2380-2439 placement
function po(e) {
  return e === "public" || e === "private" ? e : void 0;
}
/**
 * 判断项目是否不能作为发送目标：已暂停/归档、共享项目或可见性未知时返回原因，个人私有项目返回 null。
 */
//@ chunk-dz3q485w.js:2439-2866 placement
function projectNotTargetReason(e) {
  if (e.closed === !0)
    return "that project is paused or archived. Pick one of your personal projects, or create a new one";
  if (e.visibility === "private") return null;
  return typeof e.visibility === "string" && e.visibility !== ""
    ? "that project is shared. Pick one of your personal projects, or create a new one"
    : "the server did not say whether that project is personal. Pick one of your personal projects, or create a new one";
}
//@ chunk-dz3q485w.js:2866-3124 placement
class ChannelApiError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  status;
  telemetryCode;
  detail;
  serverWord;
  constructor(e, n, s, r = "request_failed", a) {
    super(`Could not ${e}: ${s}`, "projects channel request failed");
    ((this.name = "ChannelApiError"),
      (this.status = n),
      (this.telemetryCode = r),
      (this.detail = s),
      (this.serverWord = a));
  }
}
/**
 * 判断 Projects 频道 API 错误是否可重试：非 ChannelApiError，或请求失败且状态为空、5xx、408、429。
 */
//@ chunk-dz3q485w.js:3124-3266 placement
function isRetryableChannelError(e) {
  return (
    !(e instanceof ChannelApiError) ||
    (e.telemetryCode === "request_failed" &&
      (e.status === null || e.status >= 500 || e.status === 408 || e.status === 429))
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
function Ye(e) {
  return e instanceof CloudSessionAccessError || NETWORK_UNREACHABLE_CODES.has(getErrnoCode(e) ?? "");
}
/**
 * 判断发送失败时消息是否确定没有发出：网络不可达、策略关闭、输入无效、目标不对，或 4xx（除 408/429）错误。
 */
//@ chunk-dz3q485w.js:3443-3790 placement
function isDefinitelyNotSent(e) {
  if (Ye(e)) return !0;
  if (!(e instanceof ChannelApiError)) return !1;
  switch (e.telemetryCode) {
    case "policy_disabled":
    case "invalid_input":
    case "not_a_target":
      return !0;
    case "bad_response":
      return !1;
    case "auth_or_access":
    case "request_failed":
      return e.status === null
        ? e.telemetryCode === "auth_or_access"
        : e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429;
  }
}
/**
 * Projects 不可用时的原因文案：数据驻留（非一方提供方）、仅必要流量、未登录 claude.ai。
 */
//@ chunk-dz3q485w.js:3790-4145 placement
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
var Rz = /^chan_[A-Za-z0-9_-]{1,120}$/,
  go = /^[a-z]{2,12}_[A-Za-z0-9_-]{1,120}$/;
//@ chunk-dz3q485w.js:4222-4389 placement
function channelPath(e, n, s) {
  if (!Rz.test(e))
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
  let s = n?.error;
  return typeof s === "object" && s !== null ? s : null;
}
//@ chunk-dz3q485w.js:4519-4604 placement
function kt(e) {
  return typeof e === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(e) ? e : void 0;
}
//@ chunk-dz3q485w.js:4604-4669 placement
function Rt(e) {
  let n = apiErrorBody(e);
  return kt(n?.resource) ?? kt(n?.reason);
}
//@ chunk-dz3q485w.js:4669-4741 placement
async function W(e) {
  return { headers: { ...e, ...(await trustedDeviceHeaders()) }, maxRedirects: 0 };
}
//@ chunk-dz3q485w.js:4741-4937 placement
function clearStaleTrustedDevice(e, n) {
  let s = e === 403 ? Rt(n) : void 0;
  if (s !== "untrusted_device" && s !== "session_stale_relogin") return;
  import("./chunk-3kb57csj.js")
    .then(({ clearTrustedDeviceTokenCache: clearTrustedDeviceTokenCache }) => clearTrustedDeviceTokenCache())
    .catch(() => {});
}
//@ chunk-dz3q485w.js:4937-5060 placement
function channelErrorMessage(e, n, s) {
  let r = apiErrorBody(n)?.message;
  return typeof r === "string" && r !== "" ? printableName(r, s) : `the server responded with status ${e}`;
}
/**
 * 校验 Projects 频道 API 响应：未发出请求抛策略/认证错误，3xx 以上抛带状态码与服务端消息的 ChannelApiError（403 时清理受信设备令牌），否则返回状态与数据。
 */
//@ chunk-dz3q485w.js:5060-5362 placement
function checkChannelResponse(e, n) {
  if (!e.ok)
    throw new ChannelApiError(
      n,
      null,
      policyRefusalText(e),
      e.reason === "no-auth" ? "auth_or_access" : "policy_disabled",
    );
  if (e.status >= 300)
    throw (
      clearStaleTrustedDevice(e.status, e.data),
      new ChannelApiError(
        n,
        e.status,
        channelErrorMessage(e.status, e.data),
        e.status === 401 || e.status === 403 ? "auth_or_access" : "request_failed",
        Rt(e.data),
      )
    );
  return { status: e.status, data: e.data };
}
//@ chunk-dz3q485w.js:5362-5462 placement
function parseTimestampMs(e) {
  if (typeof e !== "string") return null;
  let parse = Date.parse(e);
  return Number.isNaN(parse) ? null : parse;
}
/**
 * 解析频道列表响应：保留有 id 与名称的频道（最后消息时间、协调会话 id、可见性、是否关闭）与下一页游标。
 */
//@ chunk-dz3q485w.js:5462-5880 placement
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
              visibility: po(l.visibility),
              ...((l.archived_at != null || l.disabled_at != null) && { closed: !0 }),
            },
          ]
        : [];
    }),
    nextCursor: typeof n?.next_cursor === "string" && n.next_cursor !== "" ? n.next_cursor : null,
  };
}
/**
 * 获取已加入的 Projects 频道列表的一页（GET /v1/code/channels?scope=joined）。
 */
//@ chunk-dz3q485w.js:5880-6166 placement
async function listChannelsPage(e, n, s) {
  let uRLSearchParams = new URLSearchParams({
      scope: "joined",
      limit: String(DTo),
      ...(e !== null && { cursor: e }),
    }),
    a = await apiClient.get(`/v1/code/channels?${uRLSearchParams}`, {
      auth: "teleport-org",
      ...(await W()),
      validateStatus: () => !0,
      timeout: de,
      signal: n,
      credentials: s,
    });
  return parseChannelList(checkChannelResponse(a, "list your Projects").data);
}
/**
 * 规范化项目名用于匹配：去除默认忽略字符与控制字符、NFKC、压缩空格并转小写。
 */
//@ chunk-dz3q485w.js:6166-6305 placement
function normalizeProjectName(e) {
  return stripAnsiAndControls(e.replace(/\p{Default_Ignorable_Code_Point}/gu, "").normalize("NFKC"))
    .replace(/ {2,}/g, " ")
    .trim()
    .toLowerCase();
}
/**
 * 向项目频道发送一条消息（POST /v1/code/channels/:id/messages，带客户端消息 id 与可选回复对象），返回消息 id 与线程根 id，并记录特性状态。
 */
//@ chunk-dz3q485w.js:6305-7069 placement
async function postChannelMessage(channelId, message, signal, credentials) {
  try {
    let post = await apiClient.post(
        `/v1/code/channels/${encodeURIComponent(channelId)}/messages`,
        {
          body: message.body,
          client_message_id: message.clientMessageId,
          ...(message.replyToMessageId !== void 0 && { reply_to_message_id: message.replyToMessageId }),
        },
        {
          auth: "teleport-org",
          ...(await W()),
          validateStatus: () => !0,
          timeout: de,
          maxRedirects: 0,
          signal: signal,
          credentials: credentials,
        },
      ),
      { data: l } = checkChannelResponse(post, "send the message"),
      c = l;
    if (typeof c?.message_id !== "string" || typeof c.thread_root_id !== "string")
      throw new ChannelApiError(
        "send the message",
        null,
        "the server response was missing the message id",
        "bad_response",
      );
    return (
      logFeatureOk("projects_send"),
      { messageId: c.message_id, threadRootId: c.thread_root_id, deduplicated: c.deduplicated === !0 }
    );
  } catch (error) {
    if (signal?.aborted !== !0)
      logFeatureBad(
        "projects_send",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:7069-7253 placement
function parseChannelSummary(e) {
  let n = e,
    s = n?.channel ?? n;
  if (typeof s?.id !== "string" || !Rz.test(s.id)) return null;
  return {
    id: s.id,
    name: typeof s.name === "string" ? printableName(s.name, 80) : "",
    coordinatorSessionId: coordinatorSessionIdOf(s),
  };
}
//@ chunk-dz3q485w.js:7253-7375 placement
function coordinatorSessionIdOf(e) {
  let n = (s) => (typeof s === "string" && go.test(s) ? s : null);
  return n(e.channel_session_id) ?? n(e.overview_session_id);
}
/**
 * 创建私有 Projects 频道（名称、图标、颜色、主题、说明、默认环境），返回频道摘要并记录特性状态。
 */
//@ chunk-dz3q485w.js:7375-8251 placement
async function createProjectChannel(spec, signal, credentials) {
  try {
    let post = await apiClient.post(
        "/v1/code/channels",
        {
          visibility: "private",
          name: spec.name,
          icon: spec.icon ?? "Code",
          ...(spec.color !== void 0 && spec.color !== "" && { color: spec.color }),
          ...(spec.topic !== void 0 && spec.topic !== "" && { topic: spec.topic }),
          ...(spec.instructions !== void 0 &&
            spec.instructions !== "" && { system_prompt_addendum: spec.instructions }),
          ...(spec.defaultEnvironmentId !== void 0 &&
            spec.defaultEnvironmentId !== "" && { default_environment_id: spec.defaultEnvironmentId }),
        },
        {
          auth: "teleport-org",
          ...(await W()),
          validateStatus: () => !0,
          timeout: spec.waitsForSession ? co : de,
          ...(spec.waitsForSession && { maxRedirects: 0 }),
          signal: signal,
          credentials: credentials,
        },
      ),
      { data: a } = checkChannelResponse(post, "create the project"),
      l = parseChannelSummary(a);
    if (l === null)
      throw new ChannelApiError(
        "create the project",
        null,
        "the server response was missing the project id",
        "bad_response",
      );
    return (logFeatureOk("projects_create"), l);
  } catch (error) {
    if (signal?.aborted !== !0)
      logFeatureBad(
        "projects_create",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:8251-8317 placement
async function L$t(e, n, s) {
  return (await getProjectChannel(e, "owner", n, s)).channel;
}
//@ chunk-dz3q485w.js:8317-8416 placement
var Pt = "that project was not found, or this login is not a member of it: join it on the web first";
/**
 * 获取 Projects 频道信息并校验调用者关系：要求 owner 时检查拥有者、私有且未关闭，要求 member 时检查成员、未归档、未被套餐禁用，失败抛 ChannelApiError，并记录特性状态。
 */
//@ chunk-dz3q485w.js:8416-10120 placement
async function getProjectChannel(channelId, requiredRole, signal, credentials, includeMembers = !1) {
  let path = channelPath(channelId, includeMembers ? "?include_members=true" : "", "look up the project");
  try {
    let h = await apiClient.get(path, {
      auth: "teleport-org",
      ...(await W()),
      validateStatus: () => !0,
      timeout: de,
      signal: signal,
      credentials: credentials,
    });
    if (requiredRole === "member" && h.ok && h.status === 404)
      throw new ChannelApiError("look up the project", 404, Pt, "auth_or_access");
    let b = checkChannelResponse(h, "look up the project").data,
      w = parseChannelSummary(b);
    if (w === null)
      throw new ChannelApiError(
        "look up the project",
        null,
        "the server returned an unexpected shape",
        "bad_response",
      );
    let y = b?.channel ?? b,
      j = (R) => (typeof R === "string" ? R.toLowerCase() : ""),
      S = Array.isArray(y?.caller_relations) ? y.caller_relations : [],
      P = S.some((R) => j(R) === "owner") || j(y?.membership?.role) === "owner";
    if (requiredRole === "owner" && !P)
      throw new ChannelApiError(
        "look up the project",
        null,
        "your Claude account does not own that project",
        "auth_or_access",
      );
    if (requiredRole === "member" && !S.some((R) => j(R) === "member"))
      throw new ChannelApiError("look up the project", null, Pt, "auth_or_access");
    let L =
      requiredRole === "owner"
        ? projectNotTargetReason({
            visibility: y?.visibility,
            closed: y?.archived_at != null || y?.disabled_at != null,
          })
        : null;
    if (L !== null) throw new ChannelApiError("look up the project", null, L, "not_a_target");
    if (requiredRole === "member" && y?.archived_at != null)
      throw new ChannelApiError(
        "look up the project",
        null,
        "that project is archived",
        "auth_or_access",
        "channel_archived",
      );
    if (requiredRole === "member" && y?.disabled_by_plan === !0)
      throw new ChannelApiError(
        "look up the project",
        null,
        "that project's organization is on a plan under which Claude does no work in Projects",
        "auth_or_access",
        "channel_disabled_by_plan",
      );
    return (
      logFeatureOk("projects_channel_get"),
      {
        channel: w,
        disabledAt: y?.disabled_at,
        agentId: y?.agent_id,
        visibility: y?.visibility,
        members: y?.members,
        membersTruncated: y?.members_truncated,
      }
    );
  } catch (error) {
    if (signal?.aborted !== !0)
      logFeatureBad(
        "projects_channel_get",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:10120-10410 placement
function parseChannelConfig(e) {
  let n = e,
    s = n?.config ?? n;
  return {
    defaultModel:
      typeof s?.default_model === "string" && s.default_model !== ""
        ? printableName(s.default_model, 80)
        : null,
    defaultSourceUrls: Array.isArray(s?.default_source_urls)
      ? s.default_source_urls
          .filter((default_source_url) => typeof default_source_url === "string")
          .slice(0, 50)
          .map((r) => printableName(r, 300))
      : [],
  };
}
/**
 * 更新项目频道配置（默认来源 URL 列表），返回解析后的默认模型与来源 URL。
 */
//@ chunk-dz3q485w.js:10410-10884 placement
async function updateChannelConfig(e, n, s, r) {
  let a = channelPath(e, "/config", "update the project settings");
  try {
    let patch = await apiClient.patch(
        a,
        { ...(n.defaultSourceUrls !== void 0 && { default_source_urls: n.defaultSourceUrls }) },
        {
          auth: "teleport-org",
          ...(await W()),
          validateStatus: () => !0,
          timeout: de,
          signal: s,
          credentials: r,
        },
      ),
      { data: c } = checkChannelResponse(patch, "update the project settings");
    return (logFeatureOk("projects_config_update"), parseChannelConfig(c));
  } catch (error) {
    if (s?.aborted !== !0)
      logFeatureBad(
        "projects_config_update",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:10884-10893 placement
var Lt = 1;
/**
 * 解析 /v1/code/mcp/meta 的回复（JSON 或 SSE 文本）：找到与请求 id 对应的 JSON-RPC 响应，RPC 错误或工具 isError 时抛错，否则返回拼接后的文本内容。
 */
//@ chunk-dz3q485w.js:10893-11996 placement
function parseRpcToolText(body, action) {
  let trimmed = (typeof body === "string" ? body : jsonStringify(body)).trim();
  if (trimmed === "") throw new ChannelApiError(action, null, "the server reply was empty", "bad_response");
  let payloads =
      trimmed.startsWith("{") || trimmed.startsWith("[")
        ? [trimmed]
        : trimmed
            .split(/\r?\n\r?\n/)
            .map((w) =>
              w
                .split(/\r?\n/)
                .filter((y) => y.startsWith("data:"))
                .map((y) => y.slice(5).replace(/^ /, "")).join(`
`),
            )
            .filter((w) => w.trim() !== ""),
    sawNonJson = !1,
    response = null;
  for (let w of payloads) {
    let y;
    try {
      y = jsonParse(w);
    } catch {
      sawNonJson = !0;
      continue;
    }
    let j = Array.isArray(y) ? y : [y];
    for (let S of j) {
      let P = S;
      if (P !== null && typeof P === "object" && P.id === Lt && (P.result !== void 0 || P.error !== void 0))
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
  if (response.error !== void 0) {
    let w = response.error?.message;
    throw new ChannelApiError(
      action,
      null,
      typeof w === "string" && w !== "" ? printableName(w) : "the server returned an RPC error",
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
  if (response.result?.isError === !0)
    throw new ChannelApiError(
      action,
      null,
      text !== "" ? printableName(text) : "the tool call did not succeed",
      "bad_response",
    );
  return text;
}
/**
 * 通过 /v1/code/mcp/meta 调用 send_message 工具，把交接摘要立即发给项目协调会话，并解析 JSON-RPC 回复。
 */
//@ chunk-dz3q485w.js:11996-12564 placement
async function handOffToCoordinator(sessionId, message, signal, credentials) {
  try {
    let post = await apiClient.post(
        "/v1/code/mcp/meta",
        {
          jsonrpc: "2.0",
          id: Lt,
          method: "tools/call",
          params: {
            name: "send_message",
            arguments: { session_id: sessionId, message: message, priority: "now" },
          },
        },
        {
          auth: "teleport-org",
          validateStatus: () => !0,
          timeout: uo,
          signal: signal,
          credentials: credentials,
          ...(await W({ Accept: "application/json, text/event-stream" })),
          responseType: "text",
        },
      ),
      { data: c } = checkChannelResponse(post, "hand the summary to the project");
    (parseRpcToolText(c, "hand the summary to the project"), logFeatureOk("projects_handoff"));
  } catch (error) {
    if (signal?.aborted !== !0)
      logFeatureBad(
        "projects_handoff",
        error instanceof ChannelApiError ? error.telemetryCode : "request_failed",
      );
    throw error;
  }
}
//@ chunk-dz3q485w.js:12564-12590 placement
function ge() {
  return randomUUID();
}

export {
  Rz,
  normalizeProjectName,
  DTo,
  listChannelsPage,
  projectNotTargetReason,
  L$t,
  ChannelApiError,
  isRetryableChannelError,
  W,
  checkChannelResponse,
  channelPath,
  apiErrorBody,
  de,
  ge,
  postChannelMessage,
  isDefinitelyNotSent,
  Ye,
  createProjectChannel,
  updateChannelConfig,
  handOffToCoordinator,
};
