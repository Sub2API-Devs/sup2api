/**
 * @modelcontextprotocol/sdk/dist/esm/types.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-x4hefdgz.js (12)
 * attribution: esm-fingerprint 10, esm-layout 2
 */
import {
  hu,
  Ue,
  o,
  E,
  kt,
  u,
  T,
  oe,
  A,
  U,
  Lve,
  M,
  pe,
  Ka,
  La,
  zg,
  Ir,
} from "../../../../zod/v4/classic/schemas.js";
import { t0 } from "../../../../../src/services/mcp/schemaParse.js";

//@ chunk-x4hefdgz.js:305-1188 esm-fingerprint
var LATEST_PROTOCOL_VERSION = "2025-11-25",
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION = "2025-03-26",
  SUPPORTED_PROTOCOL_VERSIONS = [
    LATEST_PROTOCOL_VERSION,
    "2025-06-18",
    "2025-03-26",
    "2024-11-05",
    "2024-10-07",
  ],
  RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task",
  R = "2.0",
  e = hu((t) => t !== null && (typeof t === "object" || typeof t === "function")),
  _ = Ue([o(), E().int()]),
  w = o(),
  ee = kt({ ttl: E().optional(), pollInterval: E().optional() }),
  F = u({ ttl: E().optional() }),
  RelatedTaskMetadataSchema = u({ taskId: o() }),
  y = kt({ progressToken: _.optional(), [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional() }),
  s = u({ _meta: y.optional() }),
  extend = s.extend({ task: F.optional() }),
  isTaskAugmentedRequestParams = (t) => extend.safeParse(t).success,
  n = u({ method: o(), params: s.loose().optional() }),
  i = u({ _meta: y.optional() }),
  r = u({ method: o(), params: i.loose().optional() }),
  a = kt({ _meta: y.optional() }),
  f = Ue([o(), E().int()]),
  strict = u({ jsonrpc: T(R), id: f, ...n.shape }).strict(),
  isJSONRPCRequest = (t) => strict.safeParse(t).success,
  strict_2 = u({ jsonrpc: T(R), ...r.shape }).strict(),
  isJSONRPCNotification = (t) => strict_2.safeParse(t).success,
  strict_3 = u({ jsonrpc: T(R), id: f, result: a }).strict(),
  isJSONRPCResultResponse = (t) => strict_3.safeParse(t).success;
//@ chunk-x4hefdgz.js:1188-1195 esm-layout
var ErrorCode;
//@ chunk-x4hefdgz.js:1195-1583 esm-fingerprint
(function (t) {
  ((t[(t.ConnectionClosed = -32000)] = "ConnectionClosed"),
    (t[(t.RequestTimeout = -32001)] = "RequestTimeout"),
    (t[(t.ParseError = -32700)] = "ParseError"),
    (t[(t.InvalidRequest = -32600)] = "InvalidRequest"),
    (t[(t.MethodNotFound = -32601)] = "MethodNotFound"),
    (t[(t.InvalidParams = -32602)] = "InvalidParams"),
    (t[(t.InternalError = -32603)] = "InternalError"),
    (t[(t.UrlElicitationRequired = -32042)] = "UrlElicitationRequired"));
})(ErrorCode || (ErrorCode = {}));
//@ chunk-x4hefdgz.js:1583-1691 esm-fingerprint
var strict_4 = u({
  jsonrpc: T(R),
  id: f.optional(),
  error: u({ code: E().int(), message: o(), data: oe().optional() }),
}).strict();
//@ chunk-x4hefdgz.js:1691-1727 esm-fingerprint
var isJSONRPCErrorResponse = (t) => strict_4.safeParse(t).success;
//@ chunk-x4hefdgz.js:1727-11145 esm-layout
var JSONRPCMessageSchema = Ue([strict, strict_2, strict_3, strict_4]),
  ne = Ue([strict_3, strict_4]),
  EmptyResultSchema = a.strict(),
  extend_2 = i.extend({ requestId: f.optional(), reason: o().optional() }),
  CancelledNotificationSchema = r.extend({ method: T("notifications/cancelled"), params: extend_2 }),
  W = u({
    src: o(),
    mimeType: o().optional(),
    sizes: A(o()).optional(),
    theme: U(["light", "dark"]).optional(),
  }),
  d = u({ icons: A(W).optional() }),
  l = u({ name: o(), title: o().optional() }),
  ImplementationSchema = l.extend({
    ...l.shape,
    ...d.shape,
    version: o(),
    websiteUrl: o().optional(),
    description: o().optional(),
  }),
  K = Lve(u({ applyDefaults: M().optional() }), pe(o(), oe())),
  Y = Ka(
    (t) => {
      if (t && typeof t === "object" && !Array.isArray(t)) {
        if (Object.keys(t).length === 0) return { form: {} };
      }
      return t;
    },
    Lve(u({ form: K.optional(), url: e.optional() }), pe(o(), oe()).optional()),
  ),
  Q = kt({
    list: e.optional(),
    cancel: e.optional(),
    requests: kt({
      sampling: kt({ createMessage: e.optional() }).optional(),
      elicitation: kt({ create: e.optional() }).optional(),
    }).optional(),
  }),
  X = kt({
    list: e.optional(),
    cancel: e.optional(),
    requests: kt({ tools: kt({ call: e.optional() }).optional() }).optional(),
  }),
  Z = u({
    experimental: pe(o(), e).optional(),
    sampling: u({ context: e.optional(), tools: e.optional() }).optional(),
    elicitation: Y.optional(),
    roots: u({ listChanged: M().optional() }).optional(),
    tasks: Q.optional(),
    extensions: pe(o(), e).optional(),
  }),
  extend_3 = s.extend({ protocolVersion: o(), capabilities: Z, clientInfo: ImplementationSchema }),
  InitializeRequestSchema = n.extend({ method: T("initialize"), params: extend_3 }),
  isInitializeRequest = (t) => InitializeRequestSchema.safeParse(t).success,
  ServerCapabilitiesSchema = u({
    experimental: pe(o(), e).optional(),
    logging: e.optional(),
    completions: e.optional(),
    prompts: u({ listChanged: M().optional() }).optional(),
    resources: u({ subscribe: M().optional(), listChanged: M().optional() }).optional(),
    tools: u({ listChanged: M().optional() }).optional(),
    tasks: X.optional(),
    extensions: pe(o(), e).optional(),
  }),
  InitializeResultSchema = a.extend({
    protocolVersion: o(),
    capabilities: ServerCapabilitiesSchema,
    serverInfo: ImplementationSchema,
    instructions: o().optional(),
  }),
  InitializedNotificationSchema = r.extend({ method: T("notifications/initialized"), params: i.optional() }),
  isInitializedNotification = (t) => InitializedNotificationSchema.safeParse(t).success,
  PingRequestSchema = n.extend({ method: T("ping"), params: s.optional() }),
  et = u({ progress: E(), total: La(E()), message: La(o()) }),
  ot = u({ ...i.shape, ...et.shape, progressToken: _ }),
  ProgressNotificationSchema = r.extend({ method: T("notifications/progress"), params: ot }),
  extend_4 = s.extend({ cursor: w.optional() }),
  extend_5 = n.extend({ params: extend_4.optional() }),
  extend_6 = a.extend({ nextCursor: w.optional() }),
  at = U(["working", "input_required", "completed", "failed", "cancelled"]),
  g = u({
    taskId: o(),
    status: at,
    ttl: Ue([E(), zg()]),
    createdAt: o(),
    lastUpdatedAt: o(),
    pollInterval: La(E()),
    statusMessage: La(o()),
  }),
  CreateTaskResultSchema = a.extend({ task: g }),
  merge = i.merge(g),
  TaskStatusNotificationSchema = r.extend({ method: T("notifications/tasks/status"), params: merge }),
  GetTaskRequestSchema = n.extend({ method: T("tasks/get"), params: s.extend({ taskId: o() }) }),
  GetTaskResultSchema = a.merge(g),
  GetTaskPayloadRequestSchema = n.extend({ method: T("tasks/result"), params: s.extend({ taskId: o() }) }),
  loose = a.loose(),
  ListTasksRequestSchema = extend_5.extend({ method: T("tasks/list") }),
  ListTasksResultSchema = extend_6.extend({ tasks: A(g) }),
  CancelTaskRequestSchema = n.extend({ method: T("tasks/cancel"), params: s.extend({ taskId: o() }) }),
  CancelTaskResultSchema = a.merge(g),
  B = u({ uri: o(), mimeType: La(o()), _meta: pe(o(), oe()).optional() }),
  extend_7 = B.extend({ text: o() }),
  refine = o().refine(
    (t) => {
      try {
        return (atob(t), !0);
      } catch {
        return !1;
      }
    },
    { message: "Invalid Base64 string" },
  ),
  extend_8 = B.extend({ blob: refine }),
  S = U(["user", "assistant"]),
  p = u({
    audience: A(S).optional(),
    priority: E().min(0).max(1).optional(),
    lastModified: Ue([t0({ offset: !0 }), t0({ offset: !0, precision: -1 })]).optional(),
  }),
  ResourceSchema = u({
    ...l.shape,
    ...d.shape,
    uri: o(),
    description: La(o()),
    mimeType: La(o()),
    size: La(E()),
    annotations: p.optional(),
    _meta: La(kt({})),
  }),
  ResourceTemplateSchema = u({
    ...l.shape,
    ...d.shape,
    uriTemplate: o(),
    description: La(o()),
    mimeType: La(o()),
    annotations: p.optional(),
    _meta: La(kt({})),
  }),
  ListResourcesRequestSchema = extend_5.extend({ method: T("resources/list") }),
  ListResourcesResultSchema = extend_6.extend({ resources: A(ResourceSchema) }),
  ListResourceTemplatesRequestSchema = extend_5.extend({ method: T("resources/templates/list") }),
  ListResourceTemplatesResultSchema = extend_6.extend({ resourceTemplates: A(ResourceTemplateSchema) }),
  extend_9 = s.extend({ uri: o() }),
  it = extend_9,
  ReadResourceRequestSchema = n.extend({ method: T("resources/read"), params: it }),
  ReadResourceResultSchema = a.extend({ contents: A(Ue([extend_7, extend_8])) }),
  ResourceListChangedNotificationSchema = r.extend({
    method: T("notifications/resources/list_changed"),
    params: i.optional(),
  }),
  rt = extend_9,
  extend_10 = n.extend({ method: T("resources/subscribe"), params: rt }),
  lt = extend_9,
  extend_11 = n.extend({ method: T("resources/unsubscribe"), params: lt }),
  extend_12 = i.extend({ uri: o() }),
  extend_13 = r.extend({ method: T("notifications/resources/updated"), params: extend_12 }),
  ut = u({ name: o(), description: La(o()), required: La(M()) }),
  PromptSchema = u({ ...l.shape, ...d.shape, description: La(o()), arguments: La(A(ut)), _meta: La(kt({})) }),
  ListPromptsRequestSchema = extend_5.extend({ method: T("prompts/list") }),
  ListPromptsResultSchema = extend_6.extend({ prompts: A(PromptSchema) }),
  extend_14 = s.extend({ name: o(), arguments: pe(o(), o()).optional() }),
  GetPromptRequestSchema = n.extend({ method: T("prompts/get"), params: extend_14 }),
  C = u({ type: T("text"), text: o(), annotations: p.optional(), _meta: pe(o(), oe()).optional() }),
  O = u({
    type: T("image"),
    data: refine,
    mimeType: o(),
    annotations: p.optional(),
    _meta: pe(o(), oe()).optional(),
  }),
  N = u({
    type: T("audio"),
    data: refine,
    mimeType: o(),
    annotations: p.optional(),
    _meta: pe(o(), oe()).optional(),
  }),
  xt = u({ type: T("tool_use"), name: o(), id: o(), input: pe(o(), oe()), _meta: pe(o(), oe()).optional() }),
  ht = u({
    type: T("resource"),
    resource: Ue([extend_7, extend_8]),
    annotations: p.optional(),
    _meta: pe(o(), oe()).optional(),
  }),
  extend_15 = ResourceSchema.extend({ type: T("resource_link") }),
  I = Ue([C, O, N, extend_15, ht]),
  St = u({ role: S, content: I }),
  GetPromptResultSchema = a.extend({ description: o().optional(), messages: A(St) }),
  PromptListChangedNotificationSchema = r.extend({
    method: T("notifications/prompts/list_changed"),
    params: i.optional(),
  }),
  bt = u({
    title: o().optional(),
    readOnlyHint: M().optional(),
    destructiveHint: M().optional(),
    idempotentHint: M().optional(),
    openWorldHint: M().optional(),
  }),
  Rt = u({ taskSupport: U(["required", "optional", "forbidden"]).optional() }),
  ToolSchema = u({
    ...l.shape,
    ...d.shape,
    description: o().optional(),
    inputSchema: u({
      type: T("object"),
      properties: pe(o(), e).optional(),
      required: A(o()).optional(),
    }).catchall(oe()),
    outputSchema: u({ type: T("object"), properties: pe(o(), e).optional(), required: A(o()).optional() })
      .catchall(oe())
      .optional(),
    annotations: bt.optional(),
    execution: Rt.optional(),
    _meta: pe(o(), oe()).optional(),
  }),
  ListToolsRequestSchema = extend_5.extend({ method: T("tools/list") }),
  ListToolsResultSchema = extend_6.extend({ tools: A(ToolSchema) }),
  CallToolResultSchema = a.extend({
    content: A(I).default([]),
    structuredContent: pe(o(), oe()).optional(),
    isError: M().optional(),
  }),
  CompatibilityCallToolResultSchema = CallToolResultSchema.or(a.extend({ toolResult: oe() })),
  extend_16 = extend.extend({ name: o(), arguments: pe(o(), oe()).optional() }),
  CallToolRequestSchema = n.extend({ method: T("tools/call"), params: extend_16 }),
  ToolListChangedNotificationSchema = r.extend({
    method: T("notifications/tools/list_changed"),
    params: i.optional(),
  }),
  ListChangedOptionsBaseSchema = u({
    autoRefresh: M().default(!0),
    debounceMs: E().int().nonnegative().default(300),
  }),
  LoggingLevelSchema = U(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]),
  extend_17 = s.extend({ level: LoggingLevelSchema }),
  SetLevelRequestSchema = n.extend({ method: T("logging/setLevel"), params: extend_17 }),
  extend_18 = i.extend({ level: LoggingLevelSchema, logger: o().optional(), data: oe() }),
  extend_19 = r.extend({ method: T("notifications/message"), params: extend_18 }),
  Tt = u({ name: o().optional() }),
  qt = u({
    hints: A(Tt).optional(),
    costPriority: E().min(0).max(1).optional(),
    speedPriority: E().min(0).max(1).optional(),
    intelligencePriority: E().min(0).max(1).optional(),
  }),
  Ct = u({ mode: U(["auto", "required", "none"]).optional() }),
  Ot = u({
    type: T("tool_result"),
    toolUseId: o().describe("The unique identifier for the corresponding tool call."),
    content: A(I).default([]),
    structuredContent: u({}).loose().optional(),
    isError: M().optional(),
    _meta: pe(o(), oe()).optional(),
  }),
  Nt = Ir("type", [C, O, N]),
  b = Ir("type", [C, O, N, xt, Ot]),
  It = u({ role: S, content: Ue([b, A(b)]), _meta: pe(o(), oe()).optional() }),
  extend_20 = extend.extend({
    messages: A(It),
    modelPreferences: qt.optional(),
    systemPrompt: o().optional(),
    includeContext: U(["none", "thisServer", "allServers"]).optional(),
    temperature: E().optional(),
    maxTokens: E().int(),
    stopSequences: A(o()).optional(),
    metadata: e.optional(),
    tools: A(ToolSchema).optional(),
    toolChoice: Ct.optional(),
  }),
  CreateMessageRequestSchema = n.extend({ method: T("sampling/createMessage"), params: extend_20 }),
  CreateMessageResultSchema = a.extend({
    model: o(),
    stopReason: La(U(["endTurn", "stopSequence", "maxTokens"]).or(o())),
    role: S,
    content: Nt,
  }),
  CreateMessageResultWithToolsSchema = a.extend({
    model: o(),
    stopReason: La(U(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(o())),
    role: S,
    content: Ue([b, A(b)]),
  }),
  Lt = u({ type: T("boolean"), title: o().optional(), description: o().optional(), default: M().optional() }),
  _t = u({
    type: T("string"),
    title: o().optional(),
    description: o().optional(),
    minLength: E().optional(),
    maxLength: E().optional(),
    format: U(["email", "uri", "date", "date-time"]).optional(),
    default: o().optional(),
  }),
  wt = u({
    type: U(["number", "integer"]),
    title: o().optional(),
    description: o().optional(),
    minimum: E().optional(),
    maximum: E().optional(),
    default: E().optional(),
  }),
  Mt = u({
    type: T("string"),
    title: o().optional(),
    description: o().optional(),
    enum: A(o()),
    default: o().optional(),
  }),
  vt = u({
    type: T("string"),
    title: o().optional(),
    description: o().optional(),
    oneOf: A(u({ const: o(), title: o() })),
    default: o().optional(),
  }),
  Ut = u({
    type: T("string"),
    title: o().optional(),
    description: o().optional(),
    enum: A(o()),
    enumNames: A(o()).optional(),
    default: o().optional(),
  }),
  At = Ue([Mt, vt]),
  Jt = u({
    type: T("array"),
    title: o().optional(),
    description: o().optional(),
    minItems: E().optional(),
    maxItems: E().optional(),
    items: u({ type: T("string"), enum: A(o()) }),
    default: A(o()).optional(),
  }),
  Bt = u({
    type: T("array"),
    title: o().optional(),
    description: o().optional(),
    minItems: E().optional(),
    maxItems: E().optional(),
    items: u({ anyOf: A(u({ const: o(), title: o() })) }),
    default: A(o()).optional(),
  }),
  Gt = Ue([Jt, Bt]),
  Dt = Ue([Ut, At, Gt]),
  Vt = Ue([Dt, Lt, _t, wt]),
  extend_21 = extend.extend({
    mode: T("form").optional(),
    message: o(),
    requestedSchema: u({ type: T("object"), properties: pe(o(), Vt), required: A(o()).optional() }),
  }),
  ElicitRequestURLParamsSchema = extend.extend({
    mode: T("url"),
    message: o(),
    elicitationId: o(),
    url: o().url(),
  }),
  Ht = Ue([extend_21, ElicitRequestURLParamsSchema]),
  ElicitRequestSchema = n.extend({ method: T("elicitation/create"), params: Ht }),
  extend_22 = i.extend({ elicitationId: o() }),
  ElicitationCompleteNotificationSchema = r.extend({
    method: T("notifications/elicitation/complete"),
    params: extend_22,
  }),
  ElicitResultSchema = a.extend({
    action: U(["accept", "decline", "cancel"]),
    content: Ka((t) => (t === null ? void 0 : t), pe(o(), Ue([o(), E(), M(), A(o())])).optional()),
  }),
  Wt = u({ type: T("ref/resource"), uri: o() });
//@ chunk-x4hefdgz.js:11145-11366 esm-fingerprint
var Kt = u({ type: T("ref/prompt"), name: o() }),
  extend_23 = s.extend({
    ref: Ue([Kt, Wt]),
    argument: u({ name: o(), value: o() }),
    context: u({ arguments: pe(o(), o()).optional() }).optional(),
  }),
  CompleteRequestSchema = n.extend({ method: T("completion/complete"), params: extend_23 });
//@ chunk-x4hefdgz.js:11366-11498 esm-fingerprint
function assertCompleteRequestPrompt(t) {
  if (t.params.ref.type !== "ref/prompt")
    throw TypeError(`Expected CompleteRequestPrompt, but got ${t.params.ref.type}`);
}
//@ chunk-x4hefdgz.js:11498-11642 esm-fingerprint
function assertCompleteRequestResourceTemplate(t) {
  if (t.params.ref.type !== "ref/resource")
    throw TypeError(`Expected CompleteRequestResourceTemplate, but got ${t.params.ref.type}`);
}
//@ chunk-x4hefdgz.js:11642-12281 esm-fingerprint
var CompleteResultSchema = a.extend({
    completion: kt({ values: A(o()).max(100), total: La(E().int()), hasMore: La(M()) }),
  }),
  Qt = u({ uri: o().startsWith("file://"), name: o().optional(), _meta: pe(o(), oe()).optional() }),
  ListRootsRequestSchema = n.extend({ method: T("roots/list"), params: s.optional() }),
  ListRootsResultSchema = a.extend({ roots: A(Qt) }),
  extend_24 = r.extend({ method: T("notifications/roots/list_changed"), params: i.optional() }),
  se = Ue([
    PingRequestSchema,
    InitializeRequestSchema,
    CompleteRequestSchema,
    SetLevelRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ReadResourceRequestSchema,
    extend_10,
    extend_11,
    CallToolRequestSchema,
    ListToolsRequestSchema,
    GetTaskRequestSchema,
    GetTaskPayloadRequestSchema,
    ListTasksRequestSchema,
    CancelTaskRequestSchema,
  ]),
  ie = Ue([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    extend_24,
    TaskStatusNotificationSchema,
  ]),
  re = Ue([
    EmptyResultSchema,
    CreateMessageResultSchema,
    CreateMessageResultWithToolsSchema,
    ElicitResultSchema,
    ListRootsResultSchema,
    GetTaskResultSchema,
    ListTasksResultSchema,
    CreateTaskResultSchema,
  ]),
  ce = Ue([
    PingRequestSchema,
    CreateMessageRequestSchema,
    ElicitRequestSchema,
    ListRootsRequestSchema,
    GetTaskRequestSchema,
    GetTaskPayloadRequestSchema,
    ListTasksRequestSchema,
    CancelTaskRequestSchema,
  ]),
  le = Ue([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    extend_19,
    extend_13,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
    TaskStatusNotificationSchema,
    ElicitationCompleteNotificationSchema,
  ]),
  me = Ue([
    EmptyResultSchema,
    InitializeResultSchema,
    CompleteResultSchema,
    GetPromptResultSchema,
    ListPromptsResultSchema,
    ListResourcesResultSchema,
    ListResourceTemplatesResultSchema,
    ReadResourceResultSchema,
    CallToolResultSchema,
    ListToolsResultSchema,
    GetTaskResultSchema,
    ListTasksResultSchema,
    CreateTaskResultSchema,
  ]);
//@ chunk-x4hefdgz.js:12281-12538 esm-fingerprint
class McpError extends Error {
  constructor(t, c, m) {
    super(`MCP error ${t}: ${c}`);
    ((this.code = t), (this.data = m), (this.name = "McpError"));
  }
  static fromError(t, c, m) {
    if (t === ErrorCode.UrlElicitationRequired && m) {
      let L = m;
      if (L.elicitations) return new V(L.elicitations, c);
    }
    return new McpError(t, c, m);
  }
}
//@ chunk-x4hefdgz.js:12538-12728 esm-fingerprint
class V extends McpError {
  constructor(t, c = `URL elicitation${t.length > 1 ? "s" : ""} required`) {
    super(ErrorCode.UrlElicitationRequired, c, { elicitations: t });
  }
  get elicitations() {
    return this.data?.elicitations ?? [];
  }
}

export {
  McpError,
  ErrorCode,
  isJSONRPCErrorResponse,
  JSONRPCMessageSchema,
  ListRootsRequestSchema,
  ElicitRequestSchema,
  ElicitRequestURLParamsSchema,
  ImplementationSchema,
  ServerCapabilitiesSchema,
  ToolSchema,
  PromptSchema,
  ResourceSchema,
  ResourceTemplateSchema,
  CompatibilityCallToolResultSchema,
  CallToolResultSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  isInitializeRequest,
  isJSONRPCRequest,
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  isJSONRPCResultResponse,
  LATEST_PROTOCOL_VERSION,
  RelatedTaskMetadataSchema,
  RELATED_TASK_META_KEY,
  ElicitationCompleteNotificationSchema,
  CreateMessageResultSchema,
  ElicitResultSchema,
  LoggingLevelSchema,
  InitializeRequestSchema,
  InitializedNotificationSchema,
  SetLevelRequestSchema,
  CreateTaskResultSchema,
  EmptyResultSchema,
  CreateMessageResultWithToolsSchema,
  ListRootsResultSchema,
  ListResourcesResultSchema,
  isInitializedNotification,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  CreateMessageRequestSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  ListToolsResultSchema,
  ListChangedOptionsBaseSchema,
  isJSONRPCNotification,
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  PingRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema,
  isTaskAugmentedRequestParams,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CancelTaskResultSchema,
  TaskStatusNotificationSchema,
};
