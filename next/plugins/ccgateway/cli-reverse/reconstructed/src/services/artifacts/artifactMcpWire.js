/**
 * services/artifacts/artifactMcpWire.ts
 *
 * 2.1.316 新增：Artifact 操作经 MCP 线路发送（pin/unpin/publish/list），回答不确定时报 McpDoubtfulAnswerError
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-57tfkp5n.js (16)
 * attribution: placement 16
 */
import { pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
  objectSchema,
  numberSchema,
  record,
  stringSchema,
  array,
  unknown,
  looseObject,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { TENGU_VALIANT_LANTERN } from "../api/withRetry.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { withDeadline } from "../../utils/sleep.js";
import { apiClient } from "../routines/routinesApi.js";
import { ARTIFACTS_MCP_PATH } from "../mcp/firstPartyServerIds.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { safeParseJSON } from "../../utils/json.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-57tfkp5n.js:4146-4317 placement
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
//@ chunk-57tfkp5n.js:4317-4487 placement
function toMcpWireRequestOptions(options) {
  let { recoverOAuth401, headers, ...rest } = options;
  return {
    ...rest,
    headers: {
      ...pickAlias(headers, FRAME_CLIENT_HEADERS),
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
  };
}
//@ chunk-57tfkp5n.js:4487-6260 placement
/**
 * Artifact 操作对应的 MCP 行工具名与参数映射。
 */
var MCP_ROW_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ROW_TOOL_TELEMETRY;
var FAVORITE_ROUTE_RE;
var pinCallBody;
var MAX_CALL_BODY_BYTES;
var SLUG_FIELD_RENAMES;
var PASS_THROUGH_FIELDS;
var DROPPED_CALL_FIELDS;
var PUBLISH_FIELD_RENAMES;
var publishArguments;
deferInit("chunk-57tfkp5n.js:4487", () => {
  MCP_ROW_TOOL_NAMES = ["pin_artifact", "unpin_artifact", "publish_version", "list_artifacts", "list_types"];
  ROW_TOOL_TELEMETRY = {
    pin_artifact: "artifact_mcp_wire_pin",
    unpin_artifact: "artifact_mcp_wire_pin",
    publish_version: "artifact_mcp_wire_publish",
    list_artifacts: "artifact_mcp_wire_listing",
    list_types: "artifact_mcp_wire_listing",
  };
  FAVORITE_ROUTE_RE = /^\/api\/frame\/favorite\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/;
  pinCallBody = ([, slug]) => ({
    arguments: {
      slug,
    },
    mark: {},
  });
  MAX_CALL_BODY_BYTES = 1048576;
  SLUG_FIELD_RENAMES = new Map([
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
  PASS_THROUGH_FIELDS = ["manifest", "mode"];
  DROPPED_CALL_FIELDS = new Set([
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
  PUBLISH_FIELD_RENAMES = new Map([
    ["force", "force"],
    ["capabilities", "capabilities"],
    ["thumbnail", "thumbnail"],
    ["thumbnail_dark", "thumbnail"],
    ["auto_edit_attribution", "attribution"],
  ]);
  publishArguments = ([, query], mark) => {
    if (!isPlainObject(mark)) return "body";
    if (
      sumByAliasField(isPlainObject(mark.manifest) ? Object.values(mark.manifest) : [mark], (field) =>
        isPlainObject(field) && typeof field.content === "string" ? field.content.length : 0,
      ) > MAX_CALL_BODY_BYTES
    )
      return "size";
    let args = {};
    let requestMark = {
      description: "",
    };
    for (let [key, value] of Object.entries(mark)) {
      let renamed = SLUG_FIELD_RENAMES.get(key);
      if (value === undefined) continue;
      if (renamed !== undefined) args[renamed] = value;
      else if (DROPPED_CALL_FIELDS.has(key)) requestMark[key] = value;
      else return PUBLISH_FIELD_RENAMES.get(key) ?? "key";
    }
    let createConfirmed = false;
    for (let [key, value] of new URLSearchParams(query ?? ""))
      if (key === "attempt_id") requestMark.attempt_id = value;
      else if (key === "resend" && value === "1") requestMark.resend = true;
      else if (`${key}=${value}` === CREATE_CONFIRMED_QUERY) createConfirmed = true;
      else return "query";
    let converted =
      typeof args.slug === "string" ? getLiveState().shareStatus.bySlug.get(args.slug) : undefined;
    let mode = converted?.probeFailed ? undefined : converted?.mode;
    if (mode === "users" || mode === "org") args.shared_live = mode;
    let request = {
      arguments: args,
      mark: requestMark,
      createConfirmed,
    };
    if (!PASS_THROUGH_FIELDS.some((field) => field in requestMark)) return request;
    return "content" in args
      ? "page_and_manifest"
      : {
          ...request,
          needs: "manifest",
        };
  };
});
//@ chunk-57tfkp5n.js:6260-6512 placement
/**
 * 把 URL 查询参数按映射表填进 MCP 调用的 arguments/mark；遇到未知参数、重复参数或非法 limit 返回 "query"（表示不能走 MCP 线路）。
 */
function parseQueryIntoArgs(query, args, options) {
  for (let [name, value] of new URLSearchParams(query ?? "")) {
    let [existing, extra] = Object.hasOwn(args, name) ? args[name] : [];
    if (existing === undefined || extra === undefined || Object.hasOwn(options[existing], extra))
      return "query";
    if (extra === "limit" && !/^\d{1,9}$/.test(value)) return "query";
    options[existing][extra] = extra === "limit" ? Number(value) : value;
  }
  return options;
}
//@ chunk-57tfkp5n.js:6512-6631 placement
function getStructuredContentWith(response, reads) {
  let result = isPlainObject(response) ? response.result : undefined;
  let structuredContent = isPlainObject(result) ? result.structuredContent : undefined;
  return isPlainObject(structuredContent) && Object.hasOwn(structuredContent, reads)
    ? structuredContent
    : undefined;
}
//@ chunk-57tfkp5n.js:6631-8006 placement
/**
 * 可经 MCP 线路发送的 Artifact HTTP 路由表（pin/unpin、直接发布、列出 artifact/类型/类型实例），每项给出对应 MCP 工具名与参数转换；以及 MCP 响应中 _meta 路由状态、错误与 tools/list 广告的 schema。
 */
var MCP_WIRE_ROUTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MCP_ROUTE_META_SCHEMA;
var MCP_CALL_RESPONSE_SCHEMA;
var MCP_TOOLS_LIST_SCHEMA;
deferInit("chunk-57tfkp5n.js:6631", () => {
  MCP_WIRE_ROUTES = [
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
      narrower: (narrowed, options) =>
        narrowed === 404 ||
        (narrowed === 403 && options === "not_owner") ||
        (narrowed === 422 && options === "audience_conflict") ||
        (narrowed === 400 && options === undefined),
    },
    {
      method: "GET",
      route: /^\/api\/frame\/frames\?(.*)$/,
      tool: "list_artifacts",
      call: ([, params]) =>
        parseQueryIntoArgs(
          params,
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
      call: ([, params]) =>
        parseQueryIntoArgs(
          params,
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
      call: ([, params, extra]) =>
        parseQueryIntoArgs(
          extra,
          {
            limit: ["arguments", "limit"],
            rel: ["mark", "rel"],
          },
          {
            arguments: {
              type: params,
            },
            mark: {},
            needs: "type",
          },
        ),
      reads: "instances",
    },
  ];
  MCP_ROUTE_META_SCHEMA = DoctorLazy(() =>
    objectSchema({
      [ANTHROPIC_COM_ARTIFACT_ROUTE]: objectSchema({
        status: numberSchema().int().min(200).max(599),
        headers: record(stringSchema(), stringSchema()).optional().catch(undefined),
      }),
    }),
  );
  MCP_CALL_RESPONSE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        code: numberSchema(),
      }).optional(),
      result: objectSchema({
        _meta: MCP_ROUTE_META_SCHEMA(),
        content: array(
          objectSchema({
            text: stringSchema().optional(),
          }),
        ).optional(),
        structuredContent: objectSchema({
          error: objectSchema({
            message: stringSchema().optional(),
            details: unknown().optional(),
          }),
        })
          .optional()
          .catch(undefined),
      }).optional(),
    }),
  );
  MCP_TOOLS_LIST_SCHEMA = DoctorLazy(() =>
    objectSchema({
      result: objectSchema({
        tools: array(
          objectSchema({
            name: stringSchema(),
            _meta: objectSchema({
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
});
//@ chunk-57tfkp5n.js:8006-8163 placement
class McpDoubtfulAnswerError extends Error {
  status;
  constructor(status) {
    super("the MCP answer does not say whether the publish ran");
    this.status = status;
    this.name = "McpDoubtfulAnswerError";
  }
}
//@ chunk-57tfkp5n.js:8163-8209 placement
var JSONRPC_PROTOCOL_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-57tfkp5n.js:8163", () => {
  JSONRPC_PROTOCOL_ERROR_CODES = new Set([-32700, -32600, -32601, -32602]);
});
//@ chunk-57tfkp5n.js:8209-8401 placement
function mcpRowFor(method, path) {
  if (env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_REMOTE_SESSION_ID) return null;
  let found = MCP_WIRE_ROUTES.find((route) => route.method === method && route.route.test(path));
  if (found === undefined) return null;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VALIANT_LANTERN, false) === true ? found : null;
}
//@ chunk-57tfkp5n.js:8401-8468 placement
function cacheAdvert(advert, state) {
  state.mcpAdvert = {
    tools: advert,
    until: Date.now() + MCP_ADVERT_TTL_MS,
  };
  return advert;
}
//@ chunk-57tfkp5n.js:8468-8493 placement
var EMPTY_TOOL_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_TOOL_SET_ALT;
deferInit("chunk-57tfkp5n.js:8468", () => {
  EMPTY_TOOL_SET = new Set();
  EMPTY_TOOL_SET_ALT = new Set();
});
//@ chunk-57tfkp5n.js:8493-8816 placement
/**
 * 返回 MCP 线路广告的可用工具集合：缓存未过期直接用；否则发起（或复用在途的）tools/list 查询，需要时在短期限内等待结果。
 */
async function getMcpAdvertisedTools(requestOptions, cache, waitForAnswer) {
  let mcpAdvert = cache.mcpAdvert;
  if (mcpAdvert !== undefined && mcpAdvert.until > Date.now()) return mcpAdvert.tools;
  let mcpAdvertAsked = cache.mcpAdvertAsked;
  if (mcpAdvertAsked === undefined) {
    let pending = fetchMcpAdvertisedTools(omitAlias(requestOptions, "signal"), cache)
      .catch(() => EMPTY_TOOL_SET)
      .finally(() => {
        cache.mcpAdvertAsked = undefined;
      });
    mcpAdvertAsked = {
      answer: pending,
      soon: withDeadline(pending, TOOLS_LIST_SOON_MS),
    };
    cache.mcpAdvertAsked = mcpAdvertAsked;
  }
  if (!waitForAnswer || mcpAdvert?.tools.size === 0) return mcpAdvert?.tools ?? EMPTY_TOOL_SET;
  return (await mcpAdvertAsked.soon) ?? EMPTY_TOOL_SET_ALT;
}
//@ chunk-57tfkp5n.js:8816-9743 placement
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
      send: (input, options) =>
        apiClient.post(
          ARTIFACTS_MCP_PATH,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          },
          {
            ...omitAlias(toMcpWireRequestOptions(requestOptions), "streamUpload"),
            timeout: options ?? TOOLS_LIST_TIMEOUT_MS,
            maxContentLength: MAX_RESPONSE_BYTES_FRAME,
            ...(input && {
              freshConnection: input,
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
      parsed?.result.tools.flatMap(({ name: tool, _meta }) =>
        _meta === undefined || tool.includes("#")
          ? []
          : [
              tool,
              ...Object.entries(_meta[ANTHROPIC_COM_ARTIFACT_ROUTE])
                .filter(([, value]) => value === true)
                .map(([key]) => `${tool}#${key}`),
            ],
      ),
    ),
    cache,
  );
}
//@ chunk-57tfkp5n.js:9743-9794 placement
function parseJsonObject(text) {
  let parsed = safeParseJSON(text, false);
  return isPlainObject(parsed) ? parsed : undefined;
}
//@ chunk-57tfkp5n.js:9794-9865 placement
function refusalReason(verdict) {
  return isPlainObject(verdict) && typeof verdict.reason === "string" ? verdict.reason : undefined;
}
//@ chunk-57tfkp5n.js:9865-12640 placement
/**
 * 经 MCP 线路发送 Artifact 操作（pin/unpin/publish/list），处理不可承载的请求与模糊回答。
 */
async function sendOverMcp(context, path, body, requestOptions, onEncoding) {
  let featureName = ROW_TOOL_TELEMETRY[context.tool];
  let fail = (reason) => {
    logFeatureSad(featureName, reason, {
      tool: fromEnum(context.tool),
    });
    return null;
  };
  let cannotCarry = (field) => fail(`cannot_carry_${field}`);
  let baseMark = () => {
    let match = context.route.exec(path);
    return match ? context.call(match, body) : "query";
  };
  let mark = baseMark();
  if (typeof mark === "string") return cannotCarry(mark);
  let { slug } = mark.arguments;
  let targetSlug = typeof slug === "string" ? slug : "";
  let frameRelay = getLiveState().frameRelay;
  let { mcpNarrower } = frameRelay;
  let isRead = context.reads !== undefined;
  if (!isRead && mcpNarrower.has(targetSlug)) return fail("narrower_remembered");
  let mcpAdvertisedTools = await getMcpAdvertisedTools(requestOptions, frameRelay, !isRead);
  let readMark = baseMark();
  if (typeof readMark === "string") return cannotCarry(readMark);
  if (
    !mcpAdvertisedTools.has(context.tool) ||
    (readMark.needs !== undefined && !mcpAdvertisedTools.has(`${context.tool}#${readMark.needs}`))
  )
    return fail(mcpAdvertisedTools === EMPTY_TOOL_SET_ALT ? "offer_late" : "no_offer");
  if (!isRead && mcpNarrower.has(targetSlug)) return fail("narrower_remembered");
  let bodyObj = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: context.tool,
      arguments: readMark.arguments,
      _meta: {
        [ANTHROPIC_COM_ARTIFACT_ROUTE]: readMark.mark,
        ...(readMark.createConfirmed === true && {
          [ANTHROPIC_FRAMECREATECONFIRMED]: true,
        }),
      },
    },
  };
  let bodyBytes = Buffer.byteLength(jsonStringify(bodyObj));
  if (bodyBytes > MAX_CALL_BODY_BYTES) return cannotCarry("size");
  let callOptions = {
    tool: fromEnum(context.tool),
    ...(readMark.needs === "manifest" && {
      manifest: true,
    }),
    ...(readMark.needs === "type" && {
      by_type: true,
    }),
  };
  let mapError = (error, status) => {
    cacheAdvert(EMPTY_TOOL_SET, frameRelay);
    logFeatureSad(featureName, error, {
      ...callOptions,
      status,
    });
    return null;
  };
  let mapResult = (result, status) => {
    cacheAdvert(EMPTY_TOOL_SET, frameRelay);
    logFeatureBad(featureName, result, {
      ...callOptions,
      status,
    });
  };
  let response;
  try {
    onEncoding?.({
      json_bytes: bodyBytes,
      wire_bytes: bodyBytes,
      body_gzip: false,
    });
    let timeoutMs = isRead ? Math.min(requestOptions.timeout ?? CALL_TIMEOUT_MS, CALL_TIMEOUT_MS) : undefined;
    response = await classifyArtifactSocketError({
      isRead,
      wire: "mcp",
      signal: requestOptions.signal,
      timeoutMs,
      send: (frame, options) =>
        apiClient.post(ARTIFACTS_MCP_PATH, bodyObj, {
          ...toMcpWireRequestOptions(requestOptions),
          ...(isRead && {
            timeout: options ?? timeoutMs,
          }),
          ...(frame && {
            freshConnection: frame,
          }),
        }),
    });
  } catch (error) {
    if (isCancel(error)) throw error;
    if (isRead) return mapError("request_error", 0);
    mapResult("request_error", 0);
    throw error;
  }
  if (!response.ok) return fail("refused_locally");
  let toResult = (status, data, extra) => ({
    ...response,
    status,
    data,
    response: {
      ...response.response,
      status,
      data,
      headers: {
        ...pickAlias(response.response.headers, "date"),
        ...extra,
      },
    },
  });
  if (response.status >= 300 && response.status < 500 && response.status !== 408 && response.status !== 499)
    return mapError("refused", response.status);
  if (isRead && response.status >= 300) return mapError("http_failed", response.status);
  let bodyAsText = context.textIsBody && targetSlug !== "" && readMark.mark.attempt_id !== undefined;
  let describeStatus = (status) => {
    if (bodyAsText) throw new McpDoubtfulAnswerError(status);
    return {
      ...toResult(200, undefined),
      mcpDoubt: status,
    };
  };
  if (response.status >= 300) {
    mapResult("http_failed", response.status);
    if (!context.textIsBody)
      return {
        ...response,
        data: response.data,
        response: response.response,
      };
    return response.status === 503 && bodyAsText
      ? toResult(503, undefined, pickAlias(response.response.headers, "retry-after"))
      : describeStatus(response.status);
  }
  let mcpResponse =
    response.status === 200 ? MCP_CALL_RESPONSE_SCHEMA().safeParse(response.data).data : undefined;
  if (mcpResponse?.error !== undefined && JSONRPC_PROTOCOL_ERROR_CODES.has(mcpResponse.error.code))
    return mapError("not_dispatched", 0);
  if (mcpResponse?.result === undefined) {
    let failureKind = mcpResponse?.error === undefined ? "unreadable" : "rpc_error";
    if (isRead) return mapError(failureKind, response.status);
    mapResult(failureKind, response.status);
    return context.textIsBody ? describeStatus(response.status) : toResult(502, undefined);
  }
  let { status, headers } = mcpResponse.result._meta[ANTHROPIC_COM_ARTIFACT_ROUTE];
  let error = mcpResponse.result.structuredContent?.error;
  let text =
    context.reads !== undefined && status < 300
      ? getStructuredContentWith(response.data, context.reads)
      : error === undefined && context.textIsBody
        ? parseJsonObject(mcpResponse.result.content?.[0]?.text)
        : (parseJsonObject(error?.message) ??
          (isPlainObject(error?.details) ? error.details : undefined) ??
          (error?.message || undefined));
  if (isRead && text === undefined) return mapError("unreadable", status);
  if (context.narrower?.(status, refusalReason(text))) {
    mcpNarrower.add(targetSlug);
    logFeatureSad(featureName, `narrower_${status}`, {
      ...callOptions,
      status,
      ...(readMark.arguments.shared_live !== undefined && {
        shared_live_sent: true,
      }),
    });
    return null;
  }
  if (context.textIsBody && text === undefined && (status < 300 || status === 409 || status >= 500)) {
    mapResult("unreadable", status);
    return describeStatus(status);
  }
  logFeatureOk(featureName, {
    ...callOptions,
    status,
  });
  return toResult(status, text, headers);
}
export { McpDoubtfulAnswerError, mcpRowFor, sendOverMcp, FRAME_CLIENT_HEADERS, MCP_ROW_TOOL_NAMES };
