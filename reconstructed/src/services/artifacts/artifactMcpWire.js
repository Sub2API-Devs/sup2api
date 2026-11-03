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
  T4e,
  CREATE_CONFIRMED_QUERY,
  classifyArtifactSocketError,
  ANTHROPIC_FRAMECREATECONFIRMED,
} from "./frameApi.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, pe, o, A, oe, kt, T } from "../../../vendor/zod/v4/classic/schemas.js";
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
var ANTHROPIC_COM_ARTIFACT_ROUTE = "anthropic.com/artifact-route",
  Ae = 300000,
  ne = 5000,
  ue = 1000,
  se = 5000,
  Te = 1048576,
  FRAME_CLIENT_HEADERS = [
    "X-Frame-Surface",
    "X-Frame-Platform",
    "X-Frame-Client-Version",
    "X-Frame-Session-Id",
  ];
//@ chunk-5nrcp6t7.js:4315-4485 placement
function toMcpWireRequestOptions(e) {
  let { recoverOAuth401: recoverOAuth401, headers: headers, ...n } = e;
  return {
    ...n,
    headers: {
      ...wS(headers, FRAME_CLIENT_HEADERS),
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
  };
}
/**
 * Artifact 操作对应的 MCP 行工具名与参数映射。
 */
//@ chunk-5nrcp6t7.js:4485-6258 placement
var MCP_ROW_TOOL_NAMES = [
    "pin_artifact",
    "unpin_artifact",
    "publish_version",
    "list_artifacts",
    "list_types",
  ],
  Me = {
    pin_artifact: "artifact_mcp_wire_pin",
    unpin_artifact: "artifact_mcp_wire_pin",
    publish_version: "artifact_mcp_wire_publish",
    list_artifacts: "artifact_mcp_wire_listing",
    list_types: "artifact_mcp_wire_listing",
  },
  ie = /^\/api\/frame\/favorite\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/,
  ae = ([, e]) => ({ arguments: { slug: e }, mark: {} }),
  le = 1048576,
  ke = new Map([
    ["slug", "slug"],
    ["baseVersion", "base_version"],
    ["title", "title"],
    ["favicon", "favicon"],
    ["icon", "icon"],
    ["label", "label"],
    ["contract", "contract"],
    ["deadline", "deadline"],
    ["content", "content"],
  ]),
  fe = ["manifest", "mode"],
  xe = new Set([
    "expectUnpublished",
    "description",
    "note",
    "entrypoint",
    "session_id",
    "request_id",
    "publish_context",
    "template",
    "origin_metadata",
    ...fe,
  ]),
  Oe = new Map([
    ["force", "force"],
    ["capabilities", "capabilities"],
    ["thumbnail", "thumbnail"],
    ["thumbnail_dark", "thumbnail"],
    ["auto_edit_attribution", "attribution"],
  ]),
  Fe = ([, e], r) => {
    if (!isPlainObject(r)) return "body";
    if (
      T4e(isPlainObject(r.manifest) ? Object.values(r.manifest) : [r], (h) =>
        isPlainObject(h) && typeof h.content === "string" ? h.content.length : 0,
      ) > le
    )
      return "size";
    let n = {},
      a = { description: "" };
    for (let [h, k] of Object.entries(r)) {
      let F = ke.get(h);
      if (k === void 0) continue;
      if (F !== void 0) n[F] = k;
      else if (xe.has(h)) a[h] = k;
      else return Oe.get(h) ?? "key";
    }
    let y = !1;
    for (let [h, k] of new URLSearchParams(e ?? ""))
      if (h === "attempt_id") a.attempt_id = k;
      else if (h === "resend" && k === "1") a.resend = !0;
      else if (`${h}=${k}` === CREATE_CONFIRMED_QUERY) y = !0;
      else return "query";
    let d = typeof n.slug === "string" ? getLiveState().shareStatus.bySlug.get(n.slug) : void 0,
      S = d?.probeFailed ? void 0 : d?.mode;
    if (S === "users" || S === "org") n.shared_live = S;
    let w = { arguments: n, mark: a, createConfirmed: y };
    if (!fe.some((h) => h in a)) return w;
    return "content" in n ? "page_and_manifest" : { ...w, needs: "manifest" };
  };
/**
 * 把 URL 查询参数按映射表填进 MCP 调用的 arguments/mark；遇到未知参数、重复参数或非法 limit 返回 "query"（表示不能走 MCP 线路）。
 */
//@ chunk-5nrcp6t7.js:6258-6510 placement
function parseQueryIntoArgs(e, r, s) {
  for (let [n, a] of new URLSearchParams(e ?? "")) {
    let [y, d] = Object.hasOwn(r, n) ? r[n] : [];
    if (y === void 0 || d === void 0 || Object.hasOwn(s[y], d)) return "query";
    if (d === "limit" && !/^\d{1,9}$/.test(a)) return "query";
    s[y][d] = d === "limit" ? Number(a) : a;
  }
  return s;
}
//@ chunk-5nrcp6t7.js:6510-6629 placement
function getStructuredContentWith(e, r) {
  let s = isPlainObject(e) ? e.result : void 0,
    n = isPlainObject(s) ? s.structuredContent : void 0;
  return isPlainObject(n) && Object.hasOwn(n, r) ? n : void 0;
}
/**
 * 可经 MCP 线路发送的 Artifact HTTP 路由表（pin/unpin、直接发布、列出 artifact/类型/类型实例），每项给出对应 MCP 工具名与参数转换；以及 MCP 响应中 _meta 路由状态、错误与 tools/list 广告的 schema。
 */
//@ chunk-5nrcp6t7.js:6629-8004 placement
var MCP_WIRE_ROUTES = [
    { method: "POST", route: ie, tool: "pin_artifact", call: ae },
    { method: "DELETE", route: ie, tool: "unpin_artifact", call: ae },
    {
      method: "POST",
      route: /^\/api\/frame\/deploy\/direct(?:\?(.*))?$/,
      tool: "publish_version",
      call: Fe,
      textIsBody: !0,
      narrower: (e, r) =>
        e === 404 ||
        (e === 403 && r === "not_owner") ||
        (e === 422 && r === "audience_conflict") ||
        (e === 400 && r === void 0),
    },
    {
      method: "GET",
      route: /^\/api\/frame\/frames\?(.*)$/,
      tool: "list_artifacts",
      call: ([, e]) => parseQueryIntoArgs(e, { limit: ["arguments", "limit"] }, { arguments: {}, mark: {} }),
      reads: "frames",
    },
    {
      method: "GET",
      route: /^\/api\/frame\/types(?:\?(.*))?$/,
      tool: "list_types",
      call: ([, e]) =>
        parseQueryIntoArgs(
          e,
          { q: ["arguments", "query"], scopes: ["mark", "scopes"] },
          { arguments: {}, mark: {} },
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
          { limit: ["arguments", "limit"], rel: ["mark", "rel"] },
          { arguments: { type: e }, mark: {}, needs: "type" },
        ),
      reads: "instances",
    },
  ],
  MCP_ROUTE_META_SCHEMA = DoctorLazy(() =>
    u({
      [ANTHROPIC_COM_ARTIFACT_ROUTE]: u({
        status: E().int().min(200).max(599),
        headers: pe(o(), o())
          .optional()
          .catch(void 0),
      }),
    }),
  ),
  MCP_CALL_RESPONSE_SCHEMA = DoctorLazy(() =>
    u({
      error: u({ code: E() }).optional(),
      result: u({
        _meta: MCP_ROUTE_META_SCHEMA(),
        content: A(u({ text: o().optional() })).optional(),
        structuredContent: u({ error: u({ message: o().optional(), details: oe().optional() }) })
          .optional()
          .catch(void 0),
      }).optional(),
    }),
  ),
  MCP_TOOLS_LIST_SCHEMA = DoctorLazy(() =>
    u({
      result: u({
        tools: A(
          u({
            name: o(),
            _meta: u({ [ANTHROPIC_COM_ARTIFACT_ROUTE]: kt({ v: T(1) }) })
              .optional()
              .catch(void 0),
          }),
        ),
      }),
    }),
  );
//@ chunk-5nrcp6t7.js:8004-8161 placement
class McpDoubtfulAnswerError extends Error {
  status;
  constructor(e) {
    super("the MCP answer does not say whether the publish ran");
    this.status = e;
    this.name = "McpDoubtfulAnswerError";
  }
}
//@ chunk-5nrcp6t7.js:8161-8207 placement
var ze = new Set([-32700, -32600, -32601, -32602]);
//@ chunk-5nrcp6t7.js:8207-8399 placement
function mcpRowFor(e, r) {
  if (env.CLAUDE_CODE_REMOTE || env.CLAUDE_CODE_REMOTE_SESSION_ID) return null;
  let found = MCP_WIRE_ROUTES.find((n) => n.method === e && n.route.test(r));
  if (found === void 0) return null;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VALIANT_LANTERN, !1) === !0 ? found : null;
}
//@ chunk-5nrcp6t7.js:8399-8466 placement
function X(e, r) {
  return ((r.mcpAdvert = { tools: e, until: Date.now() + Ae }), e);
}
//@ chunk-5nrcp6t7.js:8466-8491 placement
var I = new Set(),
  me = new Set();
/**
 * 返回 MCP 线路广告的可用工具集合：缓存未过期直接用；否则发起（或复用在途的）tools/list 查询，需要时在短期限内等待结果。
 */
//@ chunk-5nrcp6t7.js:8491-8814 placement
async function getMcpAdvertisedTools(requestOptions, cache, waitForAnswer) {
  let mcpAdvert = cache.mcpAdvert;
  if (mcpAdvert !== void 0 && mcpAdvert.until > Date.now()) return mcpAdvert.tools;
  let mcpAdvertAsked = cache.mcpAdvertAsked;
  if (mcpAdvertAsked === void 0) {
    let y = fetchMcpAdvertisedTools(Uo(requestOptions, "signal"), cache)
      .catch(() => I)
      .finally(() => {
        cache.mcpAdvertAsked = void 0;
      });
    ((mcpAdvertAsked = { answer: y, soon: withDeadline(y, ue) }), (cache.mcpAdvertAsked = mcpAdvertAsked));
  }
  if (!waitForAnswer || mcpAdvert?.tools.size === 0) return mcpAdvert?.tools ?? I;
  return (await mcpAdvertAsked.soon) ?? me;
}
/**
 * 向 Artifact MCP 端点发 tools/list，解析出广告了路由 _meta 的工具名（以及 名字#路由 变体），打点成功/失败/过慢并写回缓存。
 */
//@ chunk-5nrcp6t7.js:8814-9741 placement
async function fetchMcpAdvertisedTools(requestOptions, cache) {
  let mcpAdvert = cache.mcpAdvert,
    now = Date.now(),
    response;
  try {
    response = await classifyArtifactSocketError({
      isRead: !0,
      wire: "mcp",
      timeoutMs: ne,
      send: (d, S) =>
        apiClient.post(
          ARTIFACTS_MCP_PATH,
          { jsonrpc: "2.0", id: 1, method: "tools/list" },
          {
            ...Uo(toMcpWireRequestOptions(requestOptions), "streamUpload"),
            timeout: S ?? ne,
            maxContentLength: Te,
            ...(d && { freshConnection: d }),
          },
        ),
    });
  } catch {
    return (logFeatureSad("artifact_mcp_wire_tools_list", "advert_request_error"), X(I, cache));
  }
  if (!response.ok) return (logFeatureSad("artifact_mcp_wire_tools_list", "advert_refused_locally"), I);
  let parsed = response.status === 200 ? MCP_TOOLS_LIST_SCHEMA().safeParse(response.data).data : void 0;
  if (parsed === void 0)
    logFeatureSad(
      "artifact_mcp_wire_tools_list",
      response.status === 200 ? "advert_unreadable" : "advert_not_served",
      { status: response.status },
    );
  else if (Date.now() - now > ue) logFeatureSad("artifact_mcp_wire_tools_list", "advert_slow");
  else logFeatureOk("artifact_mcp_wire_tools_list");
  if (cache.mcpAdvert !== mcpAdvert) return cache.mcpAdvert?.tools ?? I;
  return X(
    new Set(
      parsed?.result.tools.flatMap(({ name: d, _meta: _meta }) =>
        _meta === void 0 || d.includes("#")
          ? []
          : [
              d,
              ...Object.entries(_meta[ANTHROPIC_COM_ARTIFACT_ROUTE])
                .filter(([, w]) => w === !0)
                .map(([w]) => `${d}#${w}`),
            ],
      ),
    ),
    cache,
  );
}
//@ chunk-5nrcp6t7.js:9741-9792 placement
function ce(e) {
  let r = safeParseJSON(e, !1);
  return isPlainObject(r) ? r : void 0;
}
//@ chunk-5nrcp6t7.js:9792-9863 placement
function Ue(e) {
  return isPlainObject(e) && typeof e.reason === "string" ? e.reason : void 0;
}
/**
 * 经 MCP 线路发送 Artifact 操作（pin/unpin/publish/list），处理不可承载的请求与模糊回答。
 */
//@ chunk-5nrcp6t7.js:9863-12638 placement
async function sendOverMcp(e, r, s, n, a) {
  let y = Me[e.tool],
    d = (R) => (logFeatureSad(y, R, { tool: fromEnum(e.tool) }), null),
    S = (R) => d(`cannot_carry_${R}`),
    w = () => {
      let match = e.route.exec(r);
      return match ? e.call(match, s) : "query";
    },
    h = w();
  if (typeof h === "string") return S(h);
  let { slug: slug } = h.arguments,
    F = typeof slug === "string" ? slug : "",
    frameRelay = getLiveState().frameRelay,
    { mcpNarrower: mcpNarrower } = frameRelay,
    x = e.reads !== void 0;
  if (!x && mcpNarrower.has(F)) return d("narrower_remembered");
  let H = await getMcpAdvertisedTools(n, frameRelay, !x),
    M = w();
  if (typeof M === "string") return S(M);
  if (!H.has(e.tool) || (M.needs !== void 0 && !H.has(`${e.tool}#${M.needs}`)))
    return d(H === me ? "offer_late" : "no_offer");
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
          ...(M.createConfirmed === !0 && { [ANTHROPIC_FRAMECREATECONFIRMED]: !0 }),
        },
      },
    },
    byteLength = Buffer.byteLength(jsonStringify(J));
  if (byteLength > le) return S("size");
  let U = {
      tool: fromEnum(e.tool),
      ...(M.needs === "manifest" && { manifest: !0 }),
      ...(M.needs === "type" && { by_type: !0 }),
    },
    j = (R, O) => (X(I, frameRelay), logFeatureSad(y, R, { ...U, status: O }), null),
    B = (R, O) => {
      (X(I, frameRelay), logFeatureBad(y, R, { ...U, status: O }));
    },
    b;
  try {
    a?.({ json_bytes: byteLength, wire_bytes: byteLength, body_gzip: !1 });
    let R = x ? Math.min(n.timeout ?? se, se) : void 0;
    b = await classifyArtifactSocketError({
      isRead: x,
      wire: "mcp",
      signal: n.signal,
      timeoutMs: R,
      send: (O, Q) =>
        apiClient.post(ARTIFACTS_MCP_PATH, J, {
          ...toMcpWireRequestOptions(n),
          ...(x && { timeout: Q ?? R }),
          ...(O && { freshConnection: O }),
        }),
    });
  } catch (error) {
    if (isCancel(error)) throw error;
    if (x) return j("request_error", 0);
    throw (B("request_error", 0), error);
  }
  if (!b.ok) return d("refused_locally");
  let q = (R, O, Q) => ({
    ...b,
    status: R,
    data: O,
    response: { ...b.response, status: R, data: O, headers: { ...wS(b.response.headers, "date"), ...Q } },
  });
  if (b.status >= 300 && b.status < 500 && b.status !== 408 && b.status !== 499)
    return j("refused", b.status);
  if (x && b.status >= 300) return j("http_failed", b.status);
  let te = e.textIsBody && F !== "" && M.mark.attempt_id !== void 0,
    G = (R) => {
      if (te) throw new McpDoubtfulAnswerError(R);
      return { ...q(200, void 0), mcpDoubt: R };
    };
  if (b.status >= 300) {
    if ((B("http_failed", b.status), !e.textIsBody)) return { ...b, data: b.data, response: b.response };
    return b.status === 503 && te ? q(503, void 0, wS(b.response.headers, "retry-after")) : G(b.status);
  }
  let P = b.status === 200 ? MCP_CALL_RESPONSE_SCHEMA().safeParse(b.data).data : void 0;
  if (P?.error !== void 0 && ze.has(P.error.code)) return j("not_dispatched", 0);
  if (P?.result === void 0) {
    let R = P?.error === void 0 ? "unreadable" : "rpc_error";
    if (x) return j(R, b.status);
    return (B(R, b.status), e.textIsBody ? G(b.status) : q(502, void 0));
  }
  let { status: status, headers: headers } = P.result._meta[ANTHROPIC_COM_ARTIFACT_ROUTE],
    z = P.result.structuredContent?.error,
    Y =
      e.reads !== void 0 && status < 300
        ? getStructuredContentWith(b.data, e.reads)
        : z === void 0 && e.textIsBody
          ? ce(P.result.content?.[0]?.text)
          : (ce(z?.message) ?? (isPlainObject(z?.details) ? z.details : void 0) ?? (z?.message || void 0));
  if (x && Y === void 0) return j("unreadable", status);
  if (e.narrower?.(status, Ue(Y)))
    return (
      mcpNarrower.add(F),
      logFeatureSad(y, `narrower_${status}`, {
        ...U,
        status: status,
        ...(M.arguments.shared_live !== void 0 && { shared_live_sent: !0 }),
      }),
      null
    );
  if (e.textIsBody && Y === void 0 && (status < 300 || status === 409 || status >= 500))
    return (B("unreadable", status), G(status));
  return (logFeatureOk(y, { ...U, status: status }), q(status, Y, headers));
}

export { McpDoubtfulAnswerError, FRAME_CLIENT_HEADERS, mcpRowFor, sendOverMcp };
