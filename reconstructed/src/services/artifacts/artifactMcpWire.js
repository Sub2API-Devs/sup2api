/**
 * services/artifacts/artifactMcpWire.ts
 *
 * 2.1.316 新增：Artifact 操作经 MCP 线路发送（pin/unpin/publish/list），回答不确定时报 McpDoubtfulAnswerError
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5nrcp6t7.js (16)
 * attribution: placement 16
 */
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import {
  sumByAliasField,
  CREATE_CONFIRMED_QUERY,
  classifyArtifactSocketError,
  ANTHROPIC_FRAMECREATECONFIRMED,
} from "./frameApi.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  E,
  record,
  string,
  array,
  unknown,
  looseObject,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { TENGU_VALIANT_LANTERN } from "../api/withRetry.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { withDeadline } from "../../utils/sleep.js";
import { apiClient } from "../routines/routinesApi.js";
import { ARTIFACTS_MCP_PATH } from "../mcp/firstPartyServerIds.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { safeParseJSON } from "../../utils/json.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-5nrcp6t7.js:4144-4315 placement
/**
 * artifact MCP 线路常量：广告 TTL 5 分钟、tools/list 超时 5 s/1 s、调用超时 5 s、响应体上限 1 MB 与帧客户端请求头名单。
 */
var ANTHROPIC_COM_ARTIFACT_ROUTE = "anthropic.com/artifact-route";
var MCP_ADVERT_TTL_MS = 300000;
var TOOLS_LIST_TIMEOUT_MS = 5000;
var TOOLS_LIST_SOON_MS = 1000;
var CALL_TIMEOUT_MS = 5000;
var MAX_RESPONSE_BYTES_FRAME = 1048576;
var FRAME_CLIENT_HEADERS = [
  "X-Frame-Surface",
  "X-Frame-Platform",
  "X-Frame-Client-Version",
  "X-Frame-Session-Id",
];
//@ chunk-5nrcp6t7.js:4315-4485 placement
function toMcpWireRequestOptions(e) {
  let { recoverOAuth401, headers, ...n } = e;
  return {
    ...n,
    headers: {
      ...wS(headers, FRAME_CLIENT_HEADERS),
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
  };
}
//@ chunk-5nrcp6t7.js:4485-6258 placement
/**
 * Artifact 操作对应的 MCP 行工具名与参数映射。
 */
var MCP_ROW_TOOL_NAMES = [
  "pin_artifact",
  "unpin_artifact",
  "publish_version",
  "list_artifacts",
  "list_types",
];
var ROW_TOOL_TELEMETRY = {
  pin_artifact: "artifact_mcp_wire_pin",
  unpin_artifact: "artifact_mcp_wire_pin",
  publish_version: "artifact_mcp_wire_publish",
  list_artifacts: "artifact_mcp_wire_listing",
  list_types: "artifact_mcp_wire_listing",
};
var FAVORITE_ROUTE_RE = /^\/api\/frame\/favorite\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/;
var pinCallBody = ([, e]) => ({
  arguments: {
    slug: e,
  },
  mark: {},
});
var MAX_CALL_BODY_BYTES = 1048576;
var SLUG_FIELD_RENAMES = new Map([
  ["slug", "slug"],
  ["baseVersion", "base_version"],
  ["title", "title"],
  ["favicon", "favicon"],
  ["icon", "icon"],
  ["label", "label"],
  ["contract", "contract"],
  ["deadline", "deadline"],
  ["content", "content"],
]);
var PASS_THROUGH_FIELDS = ["manifest", "mode"];
var DROPPED_CALL_FIELDS = new Set([
  "expectUnpublished",
  "description",
  "note",
  "entrypoint",
  "session_id",
  "request_id",
  "publish_context",
  "template",
  "origin_metadata",
  ...PASS_THROUGH_FIELDS,
]);
var PUBLISH_FIELD_RENAMES = new Map([
  ["force", "force"],
  ["capabilities", "capabilities"],
  ["thumbnail", "thumbnail"],
  ["thumbnail_dark", "thumbnail"],
  ["auto_edit_attribution", "attribution"],
]);
var publishArguments = ([, e], r) => {
  if (!isPlainObject(r)) return "body";
  if (
    sumByAliasField(isPlainObject(r.manifest) ? Object.values(r.manifest) : [r], (h) =>
      isPlainObject(h) && typeof h.content === "string" ? h.content.length : 0,
    ) > MAX_CALL_BODY_BYTES
  )
    return "size";
  let n = {};
  let a = {
    description: "",
  };
  for (let [key, value] of Object.entries(r)) {
    let F = SLUG_FIELD_RENAMES.get(key);
    if (value === undefined) continue;
    if (F !== undefined) n[F] = value;
    else if (DROPPED_CALL_FIELDS.has(key)) a[key] = value;
    else return PUBLISH_FIELD_RENAMES.get(key) ?? "key";
  }
  let createConfirmed = false;
  for (let [h, k] of new URLSearchParams(e ?? ""))
    if (h === "attempt_id") a.attempt_id = k;
    else if (h === "resend" && k === "1") a.resend = true;
    else if (`${h}=${k}` === CREATE_CONFIRMED_QUERY) createConfirmed = true;
    else return "query";
  let d = typeof n.slug === "string" ? getLiveState().shareStatus.bySlug.get(n.slug) : undefined;
  let mode = d?.probeFailed ? undefined : d?.mode;
  if (mode === "users" || mode === "org") n.shared_live = mode;
  let w = {
    arguments: n,
    mark: a,
    createConfirmed,
  };
  if (!PASS_THROUGH_FIELDS.some((h) => h in a)) return w;
  return "content" in n
    ? "page_and_manifest"
    : {
        ...w,
        needs: "manifest",
      };
};
//@ chunk-5nrcp6t7.js:6258-6510 placement
/**
 * 把 URL 查询参数按映射表填进 MCP 调用的 arguments/mark；遇到未知参数、重复参数或非法 limit 返回 "query"（表示不能走 MCP 线路）。
 */
function parseQueryIntoArgs(e, r, s) {
  for (let [n, a] of new URLSearchParams(e ?? "")) {
    let [y, d] = Object.hasOwn(r, n) ? r[n] : [];
    if (y === undefined || d === undefined || Object.hasOwn(s[y], d)) return "query";
    if (d === "limit" && !/^\d{1,9}$/.test(a)) return "query";
    s[y][d] = d === "limit" ? Number(a) : a;
  }
  return s;
}
//@ chunk-5nrcp6t7.js:6510-6629 placement
function getStructuredContentWith(e, reads) {
  let s = isPlainObject(e) ? e.result : undefined;
  let structuredContent = isPlainObject(s) ? s.structuredContent : undefined;
  return isPlainObject(structuredContent) && Object.hasOwn(structuredContent, reads)
    ? structuredContent
    : undefined;
}
//@ chunk-5nrcp6t7.js:6629-8004 placement
/**
 * 可经 MCP 线路发送的 Artifact HTTP 路由表（pin/unpin、直接发布、列出 artifact/类型/类型实例），每项给出对应 MCP 工具名与参数转换；以及 MCP 响应中 _meta 路由状态、错误与 tools/list 广告的 schema。
 */
var MCP_WIRE_ROUTES = [
  {
    method: "POST",
    route: FAVORITE_ROUTE_RE,
    tool: "pin_artifact",
    call: pinCallBody,
  },
  {
    method: "DELETE",
    route: FAVORITE_ROUTE_RE,
    tool: "unpin_artifact",
    call: pinCallBody,
  },
  {
    method: "POST",
    route: /^\/api\/frame\/deploy\/direct(?:\?(.*))?$/,
    tool: "publish_version",
    call: publishArguments,
    textIsBody: true,
    narrower: (e, r) =>
      e === 404 ||
      (e === 403 && r === "not_owner") ||
      (e === 422 && r === "audience_conflict") ||
      (e === 400 && r === undefined),
  },
  {
    method: "GET",
    route: /^\/api\/frame\/frames\?(.*)$/,
    tool: "list_artifacts",
    call: ([, e]) =>
      parseQueryIntoArgs(
        e,
        {
          limit: ["arguments", "limit"],
        },
        {
          arguments: {},
          mark: {},
        },
      ),
    reads: "frames",
  },
  {
    method: "GET",
    route: /^\/api\/frame\/types(?:\?(.*))?$/,
    tool: "list_types",
    call: ([, e]) =>
      parseQueryIntoArgs(
        e,
        {
          q: ["arguments", "query"],
          scopes: ["mark", "scopes"],
        },
        {
          arguments: {},
          mark: {},
        },
      ),
    reads: "types",
  },
  {
    method: "GET",
    route: /^\/api\/frame\/types\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/instances\?(.*)$/,
    tool: "list_artifacts",
    call: ([, e, r]) =>
      parseQueryIntoArgs(
        r,
        {
          limit: ["arguments", "limit"],
          rel: ["mark", "rel"],
        },
        {
          arguments: {
            type: e,
          },
          mark: {},
          needs: "type",
        },
      ),
    reads: "instances",
  },
];
var MCP_ROUTE_META_SCHEMA = DoctorLazy(() =>
  u({
    [ANTHROPIC_COM_ARTIFACT_ROUTE]: u({
      status: E().int().min(200).max(599),
      headers: record(string(), string()).optional().catch(undefined),
    }),
  }),
);
var MCP_CALL_RESPONSE_SCHEMA = DoctorLazy(() =>
  u({
    error: u({
      code: E(),
    }).optional(),
    result: u({
      _meta: MCP_ROUTE_META_SCHEMA(),
      content: array(
        u({
          text: string().optional(),
        }),
      ).optional(),
      structuredContent: u({
        error: u({
          message: string().optional(),
          details: unknown().optional(),
        }),
      })
        .optional()
        .catch(undefined),
    }).optional(),
  }),
);
var MCP_TOOLS_LIST_SCHEMA = DoctorLazy(() =>
  u({
    result: u({
      tools: array(
        u({
          name: string(),
          _meta: u({
            [ANTHROPIC_COM_ARTIFACT_ROUTE]: looseObject({
              v: literal(1),
            }),
          })
            .optional()
            .catch(undefined),
        }),
      ),
    }),
  }),
);
//@ chunk-5nrcp6t7.js:8004-8161 placement
class McpDoubtfulAnswerError extends Error {
  status;
  constructor(status) {
    super("the MCP answer does not say whether the publish ran");
    this.status = status;
    this.name = "McpDoubtfulAnswerError";
  }
}
//@ chunk-5nrcp6t7.js:8161-8207 placement
var JSONRPC_PROTOCOL_ERROR_CODES = new Set([-32700, -32600, -32601, -32602]);
//@ chunk-5nrcp6t7.js:8207-8399 placement
function mcpRowFor(method, path) {
  if (env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_REMOTE_SESSION_ID) return null;
  let found = MCP_WIRE_ROUTES.find((n) => n.method === method && n.route.test(path));
  if (found === undefined) return null;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VALIANT_LANTERN, false) === true ? found : null;
}
//@ chunk-5nrcp6t7.js:8399-8466 placement
function cacheAdvert(e, r) {
  r.mcpAdvert = {
    tools: e,
    until: Date.now() + MCP_ADVERT_TTL_MS,
  };
  return e;
}
//@ chunk-5nrcp6t7.js:8466-8491 placement
var EMPTY_TOOL_SET = new Set();
var EMPTY_TOOL_SET_ALT = new Set();
//@ chunk-5nrcp6t7.js:8491-8814 placement
/**
 * 返回 MCP 线路广告的可用工具集合：缓存未过期直接用；否则发起（或复用在途的）tools/list 查询，需要时在短期限内等待结果。
 */
async function getMcpAdvertisedTools(requestOptions, cache, waitForAnswer) {
  let mcpAdvert = cache.mcpAdvert;
  if (mcpAdvert !== undefined && mcpAdvert.until > Date.now()) return mcpAdvert.tools;
  let mcpAdvertAsked = cache.mcpAdvertAsked;
  if (mcpAdvertAsked === undefined) {
    let y = fetchMcpAdvertisedTools(Uo(requestOptions, "signal"), cache)
      .catch(() => EMPTY_TOOL_SET)
      .finally(() => {
        cache.mcpAdvertAsked = undefined;
      });
    mcpAdvertAsked = {
      answer: y,
      soon: withDeadline(y, TOOLS_LIST_SOON_MS),
    };
    cache.mcpAdvertAsked = mcpAdvertAsked;
  }
  if (!waitForAnswer || mcpAdvert?.tools.size === 0) return mcpAdvert?.tools ?? EMPTY_TOOL_SET;
  return (await mcpAdvertAsked.soon) ?? EMPTY_TOOL_SET_ALT;
}
//@ chunk-5nrcp6t7.js:8814-9741 placement
/**
 * 向 Artifact MCP 端点发 tools/list，解析出广告了路由 _meta 的工具名（以及 名字#路由 变体），打点成功/失败/过慢并写回缓存。
 */
async function fetchMcpAdvertisedTools(requestOptions, cache) {
  let mcpAdvert = cache.mcpAdvert;
  let now = Date.now();
  let response;
  try {
    response = await classifyArtifactSocketError({
      isRead: true,
      wire: "mcp",
      timeoutMs: TOOLS_LIST_TIMEOUT_MS,
      send: (d, S) =>
        apiClient.post(
          ARTIFACTS_MCP_PATH,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          },
          {
            ...Uo(toMcpWireRequestOptions(requestOptions), "streamUpload"),
            timeout: S ?? TOOLS_LIST_TIMEOUT_MS,
            maxContentLength: MAX_RESPONSE_BYTES_FRAME,
            ...(d && {
              freshConnection: d,
            }),
          },
        ),
    });
  } catch {
    logFeatureSad("artifact_mcp_wire_tools_list", "advert_request_error");
    return cacheAdvert(EMPTY_TOOL_SET, cache);
  }
  if (!response.ok) {
    logFeatureSad("artifact_mcp_wire_tools_list", "advert_refused_locally");
    return EMPTY_TOOL_SET;
  }
  let parsed = response.status === 200 ? MCP_TOOLS_LIST_SCHEMA().safeParse(response.data).data : undefined;
  if (parsed === undefined)
    logFeatureSad(
      "artifact_mcp_wire_tools_list",
      response.status === 200 ? "advert_unreadable" : "advert_not_served",
      {
        status: response.status,
      },
    );
  else if (Date.now() - now > TOOLS_LIST_SOON_MS)
    logFeatureSad("artifact_mcp_wire_tools_list", "advert_slow");
  else logFeatureOk("artifact_mcp_wire_tools_list");
  if (cache.mcpAdvert !== mcpAdvert) return cache.mcpAdvert?.tools ?? EMPTY_TOOL_SET;
  return cacheAdvert(
    new Set(
      parsed?.result.tools.flatMap(({ name: d, _meta }) =>
        _meta === undefined || d.includes("#")
          ? []
          : [
              d,
              ...Object.entries(_meta[ANTHROPIC_COM_ARTIFACT_ROUTE])
                .filter(([, value]) => value === true)
                .map(([key]) => `${d}#${key}`),
            ],
      ),
    ),
    cache,
  );
}
//@ chunk-5nrcp6t7.js:9741-9792 placement
function parseJsonObject(e) {
  let r = safeParseJSON(e, false);
  return isPlainObject(r) ? r : undefined;
}
//@ chunk-5nrcp6t7.js:9792-9863 placement
function refusalReason(e) {
  return isPlainObject(e) && typeof e.reason === "string" ? e.reason : undefined;
}
//@ chunk-5nrcp6t7.js:9863-12638 placement
/**
 * 经 MCP 线路发送 Artifact 操作（pin/unpin/publish/list），处理不可承载的请求与模糊回答。
 */
async function sendOverMcp(e, path, body, requestOptions, onEncoding) {
  let y = ROW_TOOL_TELEMETRY[e.tool];
  let d = (R) => {
    logFeatureSad(y, R, {
      tool: fromEnum(e.tool),
    });
    return null;
  };
  let S = (R) => d(`cannot_carry_${R}`);
  let w = () => {
    let match = e.route.exec(path);
    return match ? e.call(match, body) : "query";
  };
  let h = w();
  if (typeof h === "string") return S(h);
  let { slug } = h.arguments;
  let F = typeof slug === "string" ? slug : "";
  let frameRelay = getLiveState().frameRelay;
  let { mcpNarrower } = frameRelay;
  let x = e.reads !== undefined;
  if (!x && mcpNarrower.has(F)) return d("narrower_remembered");
  let mcpAdvertisedTools = await getMcpAdvertisedTools(requestOptions, frameRelay, !x);
  let M = w();
  if (typeof M === "string") return S(M);
  if (
    !mcpAdvertisedTools.has(e.tool) ||
    (M.needs !== undefined && !mcpAdvertisedTools.has(`${e.tool}#${M.needs}`))
  )
    return d(mcpAdvertisedTools === EMPTY_TOOL_SET_ALT ? "offer_late" : "no_offer");
  if (!x && mcpNarrower.has(F)) return d("narrower_remembered");
  let J = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: e.tool,
      arguments: M.arguments,
      _meta: {
        [ANTHROPIC_COM_ARTIFACT_ROUTE]: M.mark,
        ...(M.createConfirmed === true && {
          [ANTHROPIC_FRAMECREATECONFIRMED]: true,
        }),
      },
    },
  };
  let W = Buffer.byteLength(jsonStringify(J));
  if (W > MAX_CALL_BODY_BYTES) return S("size");
  let U = {
    tool: fromEnum(e.tool),
    ...(M.needs === "manifest" && {
      manifest: true,
    }),
    ...(M.needs === "type" && {
      by_type: true,
    }),
  };
  let j = (R, status) => {
    cacheAdvert(EMPTY_TOOL_SET, frameRelay);
    logFeatureSad(y, R, {
      ...U,
      status,
    });
    return null;
  };
  let B = (R, status) => {
    cacheAdvert(EMPTY_TOOL_SET, frameRelay);
    logFeatureBad(y, R, {
      ...U,
      status,
    });
  };
  let b;
  try {
    onEncoding?.({
      json_bytes: W,
      wire_bytes: W,
      body_gzip: false,
    });
    let R = x ? Math.min(requestOptions.timeout ?? CALL_TIMEOUT_MS, CALL_TIMEOUT_MS) : undefined;
    b = await classifyArtifactSocketError({
      isRead: x,
      wire: "mcp",
      signal: requestOptions.signal,
      timeoutMs: R,
      send: (O, Q) =>
        apiClient.post(ARTIFACTS_MCP_PATH, J, {
          ...toMcpWireRequestOptions(requestOptions),
          ...(x && {
            timeout: Q ?? R,
          }),
          ...(O && {
            freshConnection: O,
          }),
        }),
    });
  } catch (error) {
    if (isCancel(error)) throw error;
    if (x) return j("request_error", 0);
    B("request_error", 0);
    throw error;
  }
  if (!b.ok) return d("refused_locally");
  let q = (status, data, Q) => ({
    ...b,
    status,
    data,
    response: {
      ...b.response,
      status,
      data,
      headers: {
        ...wS(b.response.headers, "date"),
        ...Q,
      },
    },
  });
  if (b.status >= 300 && b.status < 500 && b.status !== 408 && b.status !== 499)
    return j("refused", b.status);
  if (x && b.status >= 300) return j("http_failed", b.status);
  let te = e.textIsBody && F !== "" && M.mark.attempt_id !== undefined;
  let G = (status) => {
    if (te) throw new McpDoubtfulAnswerError(status);
    return {
      ...q(200, undefined),
      mcpDoubt: status,
    };
  };
  if (b.status >= 300) {
    B("http_failed", b.status);
    if (!e.textIsBody)
      return {
        ...b,
        data: b.data,
        response: b.response,
      };
    return b.status === 503 && te ? q(503, undefined, wS(b.response.headers, "retry-after")) : G(b.status);
  }
  let P = b.status === 200 ? MCP_CALL_RESPONSE_SCHEMA().safeParse(b.data).data : undefined;
  if (P?.error !== undefined && JSONRPC_PROTOCOL_ERROR_CODES.has(P.error.code)) return j("not_dispatched", 0);
  if (P?.result === undefined) {
    let R = P?.error === undefined ? "unreadable" : "rpc_error";
    if (x) return j(R, b.status);
    B(R, b.status);
    return e.textIsBody ? G(b.status) : q(502, undefined);
  }
  let { status, headers } = P.result._meta[ANTHROPIC_COM_ARTIFACT_ROUTE];
  let error = P.result.structuredContent?.error;
  let Y =
    e.reads !== undefined && status < 300
      ? getStructuredContentWith(b.data, e.reads)
      : error === undefined && e.textIsBody
        ? parseJsonObject(P.result.content?.[0]?.text)
        : (parseJsonObject(error?.message) ??
          (isPlainObject(error?.details) ? error.details : undefined) ??
          (error?.message || undefined));
  if (x && Y === undefined) return j("unreadable", status);
  if (e.narrower?.(status, refusalReason(Y))) {
    mcpNarrower.add(F);
    logFeatureSad(y, `narrower_${status}`, {
      ...U,
      status,
      ...(M.arguments.shared_live !== undefined && {
        shared_live_sent: true,
      }),
    });
    return null;
  }
  if (e.textIsBody && Y === undefined && (status < 300 || status === 409 || status >= 500)) {
    B("unreadable", status);
    return G(status);
  }
  logFeatureOk(y, {
    ...U,
    status,
  });
  return q(status, Y, headers);
}
export { McpDoubtfulAnswerError, FRAME_CLIENT_HEADERS, mcpRowFor, sendOverMcp };
