/**
 * @modelcontextprotocol/sdk/dist/esm/types.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-x4hefdgz.js (12)
 * attribution: esm-fingerprint 10, esm-layout 2
 */
import {
  hu,
  union,
  string,
  E,
  looseObject,
  u,
  literal,
  unknown,
  array,
  _enum,
  intersection,
  M,
  record,
  preprocess,
  optional,
  zg,
  discriminatedUnion,
} from "../../../../zod/v4/classic/schemas.js";
import { parseToolOutputSchema } from "../../../../../src/services/mcp/schemaParse.js";

//@ chunk-x4hefdgz.js:305-1188 esm-fingerprint
var LATEST_PROTOCOL_VERSION = "2025-11-25";
var DEFAULT_NEGOTIATED_PROTOCOL_VERSION = "2025-03-26";
var SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
];
var RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
var JSONRPC_VERSION = "2.0";
var AssertObjectSchema = hu((v) => v !== null && (typeof v === "object" || typeof v === "function"));
var ProgressTokenSchema = union([string(), E().int()]);
var CursorSchema = string();
var TaskCreationParamsSchema = looseObject({
  ttl: E().optional(),
  pollInterval: E().optional(),
});
var TaskMetadataSchema = u({
  ttl: E().optional(),
});
var RelatedTaskMetadataSchema = u({
  taskId: string(),
});
var RequestMetaSchema = looseObject({
  progressToken: ProgressTokenSchema.optional(),
  [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional(),
});
var BaseRequestParamsSchema = u({
  _meta: RequestMetaSchema.optional(),
});
var TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
  task: TaskMetadataSchema.optional(),
});
var isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
var RequestSchema = u({
  method: string(),
  params: BaseRequestParamsSchema.loose().optional(),
});
var NotificationsParamsSchema = u({
  _meta: RequestMetaSchema.optional(),
});
var NotificationSchema = u({
  method: string(),
  params: NotificationsParamsSchema.loose().optional(),
});
var ResultSchema = looseObject({
  _meta: RequestMetaSchema.optional(),
});
var RequestIdSchema = union([string(), E().int()]);
var JSONRPCRequestSchema = u({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape,
}).strict();
var isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
var JSONRPCNotificationSchema = u({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape,
}).strict();
var isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
var JSONRPCResultResponseSchema = u({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema,
}).strict();
var isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
//@ chunk-x4hefdgz.js:1188-1195 esm-layout
var ErrorCode;
//@ chunk-x4hefdgz.js:1195-1583 esm-fingerprint
(function (ErrorCode) {
  ErrorCode[(ErrorCode.ConnectionClosed = -32000)] = "ConnectionClosed";
  ErrorCode[(ErrorCode.RequestTimeout = -32001)] = "RequestTimeout";
  ErrorCode[(ErrorCode.ParseError = -32700)] = "ParseError";
  ErrorCode[(ErrorCode.InvalidRequest = -32600)] = "InvalidRequest";
  ErrorCode[(ErrorCode.MethodNotFound = -32601)] = "MethodNotFound";
  ErrorCode[(ErrorCode.InvalidParams = -32602)] = "InvalidParams";
  ErrorCode[(ErrorCode.InternalError = -32603)] = "InternalError";
  ErrorCode[(ErrorCode.UrlElicitationRequired = -32042)] = "UrlElicitationRequired";
})(ErrorCode || (ErrorCode = {}));
//@ chunk-x4hefdgz.js:1583-1691 esm-fingerprint
var JSONRPCErrorResponseSchema = u({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: u({
    code: E().int(),
    message: string(),
    data: unknown().optional(),
  }),
}).strict();
//@ chunk-x4hefdgz.js:1691-1727 esm-fingerprint
var isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
//@ chunk-x4hefdgz.js:1727-11145 esm-layout
var JSONRPCMessageSchema = union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema,
]);
var ne = union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
  requestId: RequestIdSchema.optional(),
  reason: string().optional(),
});
var CancelledNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/cancelled"),
  params: CancelledNotificationParamsSchema,
});
var IconSchema = u({
  src: string(),
  mimeType: string().optional(),
  sizes: array(string()).optional(),
  theme: _enum(["light", "dark"]).optional(),
});
var IconsSchema = u({
  icons: array(IconSchema).optional(),
});
var BaseMetadataSchema = u({
  name: string(),
  title: string().optional(),
});
var ImplementationSchema = BaseMetadataSchema.extend({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  version: string(),
  websiteUrl: string().optional(),
  description: string().optional(),
});
var FormElicitationCapabilitySchema = intersection(
  u({
    applyDefaults: M().optional(),
  }),
  record(string(), unknown()),
);
var ElicitationCapabilitySchema = preprocess(
  (value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (Object.keys(value).length === 0)
        return {
          form: {},
        };
    }
    return value;
  },
  intersection(
    u({
      form: FormElicitationCapabilitySchema.optional(),
      url: AssertObjectSchema.optional(),
    }),
    record(string(), unknown()).optional(),
  ),
);
var ClientTasksCapabilitySchema = looseObject({
  list: AssertObjectSchema.optional(),
  cancel: AssertObjectSchema.optional(),
  requests: looseObject({
    sampling: looseObject({
      createMessage: AssertObjectSchema.optional(),
    }).optional(),
    elicitation: looseObject({
      create: AssertObjectSchema.optional(),
    }).optional(),
  }).optional(),
});
var ServerTasksCapabilitySchema = looseObject({
  list: AssertObjectSchema.optional(),
  cancel: AssertObjectSchema.optional(),
  requests: looseObject({
    tools: looseObject({
      call: AssertObjectSchema.optional(),
    }).optional(),
  }).optional(),
});
var ClientCapabilitiesSchema = u({
  experimental: record(string(), AssertObjectSchema).optional(),
  sampling: u({
    context: AssertObjectSchema.optional(),
    tools: AssertObjectSchema.optional(),
  }).optional(),
  elicitation: ElicitationCapabilitySchema.optional(),
  roots: u({
    listChanged: M().optional(),
  }).optional(),
  tasks: ClientTasksCapabilitySchema.optional(),
  extensions: record(string(), AssertObjectSchema).optional(),
});
var InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
  protocolVersion: string(),
  capabilities: ClientCapabilitiesSchema,
  clientInfo: ImplementationSchema,
});
var InitializeRequestSchema = RequestSchema.extend({
  method: literal("initialize"),
  params: InitializeRequestParamsSchema,
});
var isInitializeRequest = (value) => InitializeRequestSchema.safeParse(value).success;
var ServerCapabilitiesSchema = u({
  experimental: record(string(), AssertObjectSchema).optional(),
  logging: AssertObjectSchema.optional(),
  completions: AssertObjectSchema.optional(),
  prompts: u({
    listChanged: M().optional(),
  }).optional(),
  resources: u({
    subscribe: M().optional(),
    listChanged: M().optional(),
  }).optional(),
  tools: u({
    listChanged: M().optional(),
  }).optional(),
  tasks: ServerTasksCapabilitySchema.optional(),
  extensions: record(string(), AssertObjectSchema).optional(),
});
var InitializeResultSchema = ResultSchema.extend({
  protocolVersion: string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  instructions: string().optional(),
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/initialized"),
  params: NotificationsParamsSchema.optional(),
});
var isInitializedNotification = (value) => InitializedNotificationSchema.safeParse(value).success;
var PingRequestSchema = RequestSchema.extend({
  method: literal("ping"),
  params: BaseRequestParamsSchema.optional(),
});
var ProgressSchema = u({
  progress: E(),
  total: optional(E()),
  message: optional(string()),
});
var ProgressNotificationParamsSchema = u({
  ...NotificationsParamsSchema.shape,
  ...ProgressSchema.shape,
  progressToken: ProgressTokenSchema,
});
var ProgressNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/progress"),
  params: ProgressNotificationParamsSchema,
});
var PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
  cursor: CursorSchema.optional(),
});
var PaginatedRequestSchema = RequestSchema.extend({
  params: PaginatedRequestParamsSchema.optional(),
});
var PaginatedResultSchema = ResultSchema.extend({
  nextCursor: CursorSchema.optional(),
});
var TaskStatusSchema = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
var TaskSchema = u({
  taskId: string(),
  status: TaskStatusSchema,
  ttl: union([E(), zg()]),
  createdAt: string(),
  lastUpdatedAt: string(),
  pollInterval: optional(E()),
  statusMessage: optional(string()),
});
var CreateTaskResultSchema = ResultSchema.extend({
  task: TaskSchema,
});
var TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
var TaskStatusNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tasks/status"),
  params: TaskStatusNotificationParamsSchema,
});
var GetTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/get"),
  params: BaseRequestParamsSchema.extend({
    taskId: string(),
  }),
});
var GetTaskResultSchema = ResultSchema.merge(TaskSchema);
var GetTaskPayloadRequestSchema = RequestSchema.extend({
  method: literal("tasks/result"),
  params: BaseRequestParamsSchema.extend({
    taskId: string(),
  }),
});
var GetTaskPayloadResultSchema = ResultSchema.loose();
var ListTasksRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tasks/list"),
});
var ListTasksResultSchema = PaginatedResultSchema.extend({
  tasks: array(TaskSchema),
});
var CancelTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/cancel"),
  params: BaseRequestParamsSchema.extend({
    taskId: string(),
  }),
});
var CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
var ResourceContentsSchema = u({
  uri: string(),
  mimeType: optional(string()),
  _meta: record(string(), unknown()).optional(),
});
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  text: string(),
});
var Base64Schema = string().refine(
  (val) => {
    try {
      atob(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    message: "Invalid Base64 string",
  },
);
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  blob: Base64Schema,
});
var RoleSchema = _enum(["user", "assistant"]);
var AnnotationsSchema = u({
  audience: array(RoleSchema).optional(),
  priority: E().min(0).max(1).optional(),
  lastModified: union([
    parseToolOutputSchema({
      offset: true,
    }),
    parseToolOutputSchema({
      offset: true,
      precision: -1,
    }),
  ]).optional(),
});
var ResourceSchema = u({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  uri: string(),
  description: optional(string()),
  mimeType: optional(string()),
  size: optional(E()),
  annotations: AnnotationsSchema.optional(),
  _meta: optional(looseObject({})),
});
var ResourceTemplateSchema = u({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  uriTemplate: string(),
  description: optional(string()),
  mimeType: optional(string()),
  annotations: AnnotationsSchema.optional(),
  _meta: optional(looseObject({})),
});
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/list"),
});
var ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: array(ResourceSchema),
});
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/templates/list"),
});
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: array(ResourceTemplateSchema),
});
var ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
  uri: string(),
});
var ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
var ReadResourceRequestSchema = RequestSchema.extend({
  method: literal("resources/read"),
  params: ReadResourceRequestParamsSchema,
});
var ReadResourceResultSchema = ResultSchema.extend({
  contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema])),
});
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/list_changed"),
  params: NotificationsParamsSchema.optional(),
});
var SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var SubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/subscribe"),
  params: SubscribeRequestParamsSchema,
});
var UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/unsubscribe"),
  params: UnsubscribeRequestParamsSchema,
});
var ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
  uri: string(),
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema,
});
var ut = u({
  name: string(),
  description: optional(string()),
  required: optional(M()),
});
var PromptSchema = u({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  description: optional(string()),
  arguments: optional(array(ut)),
  _meta: optional(looseObject({})),
});
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("prompts/list"),
});
var ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: array(PromptSchema),
});
var GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
  name: string(),
  arguments: record(string(), string()).optional(),
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: literal("prompts/get"),
  params: GetPromptRequestParamsSchema,
});
var TextContentSchema = u({
  type: literal("text"),
  text: string(),
  annotations: AnnotationsSchema.optional(),
  _meta: record(string(), unknown()).optional(),
});
var ImageContentSchema = u({
  type: literal("image"),
  data: Base64Schema,
  mimeType: string(),
  annotations: AnnotationsSchema.optional(),
  _meta: record(string(), unknown()).optional(),
});
var AudioContentSchema = u({
  type: literal("audio"),
  data: Base64Schema,
  mimeType: string(),
  annotations: AnnotationsSchema.optional(),
  _meta: record(string(), unknown()).optional(),
});
var xt = u({
  type: literal("tool_use"),
  name: string(),
  id: string(),
  input: record(string(), unknown()),
  _meta: record(string(), unknown()).optional(),
});
var EmbeddedResourceSchema = u({
  type: literal("resource"),
  resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  annotations: AnnotationsSchema.optional(),
  _meta: record(string(), unknown()).optional(),
});
var ResourceLinkSchema = ResourceSchema.extend({
  type: literal("resource_link"),
});
var ContentBlockSchema = union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema,
]);
var PromptMessageSchema = u({
  role: RoleSchema,
  content: ContentBlockSchema,
});
var GetPromptResultSchema = ResultSchema.extend({
  description: string().optional(),
  messages: array(PromptMessageSchema),
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/prompts/list_changed"),
  params: NotificationsParamsSchema.optional(),
});
var ToolAnnotationsSchema = u({
  title: string().optional(),
  readOnlyHint: M().optional(),
  destructiveHint: M().optional(),
  idempotentHint: M().optional(),
  openWorldHint: M().optional(),
});
var ToolExecutionSchema = u({
  taskSupport: _enum(["required", "optional", "forbidden"]).optional(),
});
var ToolSchema = u({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  description: string().optional(),
  inputSchema: u({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional(),
  }).catchall(unknown()),
  outputSchema: u({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional(),
  })
    .catchall(unknown())
    .optional(),
  annotations: ToolAnnotationsSchema.optional(),
  execution: ToolExecutionSchema.optional(),
  _meta: record(string(), unknown()).optional(),
});
var ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tools/list"),
});
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: array(ToolSchema),
});
var CallToolResultSchema = ResultSchema.extend({
  content: array(ContentBlockSchema).default([]),
  structuredContent: record(string(), unknown()).optional(),
  isError: M().optional(),
});
var CompatibilityCallToolResultSchema = CallToolResultSchema.or(
  ResultSchema.extend({
    toolResult: unknown(),
  }),
);
var CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  name: string(),
  arguments: record(string(), unknown()).optional(),
});
var CallToolRequestSchema = RequestSchema.extend({
  method: literal("tools/call"),
  params: CallToolRequestParamsSchema,
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tools/list_changed"),
  params: NotificationsParamsSchema.optional(),
});
var ListChangedOptionsBaseSchema = u({
  autoRefresh: M().default(true),
  debounceMs: E().int().nonnegative().default(300),
});
var LoggingLevelSchema = _enum([
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency",
]);
var SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
  level: LoggingLevelSchema,
});
var SetLevelRequestSchema = RequestSchema.extend({
  method: literal("logging/setLevel"),
  params: SetLevelRequestParamsSchema,
});
var LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
  level: LoggingLevelSchema,
  logger: string().optional(),
  data: unknown(),
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/message"),
  params: LoggingMessageNotificationParamsSchema,
});
var ModelHintSchema = u({
  name: string().optional(),
});
var ModelPreferencesSchema = u({
  hints: array(ModelHintSchema).optional(),
  costPriority: E().min(0).max(1).optional(),
  speedPriority: E().min(0).max(1).optional(),
  intelligencePriority: E().min(0).max(1).optional(),
});
var ToolChoiceSchema = u({
  mode: _enum(["auto", "required", "none"]).optional(),
});
var ToolResultContentSchema = u({
  type: literal("tool_result"),
  toolUseId: string().describe("The unique identifier for the corresponding tool call."),
  content: array(ContentBlockSchema).default([]),
  structuredContent: u({}).loose().optional(),
  isError: M().optional(),
  _meta: record(string(), unknown()).optional(),
});
var SamplingContentSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
]);
var SamplingMessageContentBlockSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  xt,
  ToolResultContentSchema,
]);
var SamplingMessageSchema = u({
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  _meta: record(string(), unknown()).optional(),
});
var CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  messages: array(SamplingMessageSchema),
  modelPreferences: ModelPreferencesSchema.optional(),
  systemPrompt: string().optional(),
  includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
  temperature: E().optional(),
  maxTokens: E().int(),
  stopSequences: array(string()).optional(),
  metadata: AssertObjectSchema.optional(),
  tools: array(ToolSchema).optional(),
  toolChoice: ToolChoiceSchema.optional(),
});
var CreateMessageRequestSchema = RequestSchema.extend({
  method: literal("sampling/createMessage"),
  params: CreateMessageRequestParamsSchema,
});
var CreateMessageResultSchema = ResultSchema.extend({
  model: string(),
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string())),
  role: RoleSchema,
  content: SamplingContentSchema,
});
var CreateMessageResultWithToolsSchema = ResultSchema.extend({
  model: string(),
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string())),
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
});
var BooleanSchemaSchema = u({
  type: literal("boolean"),
  title: string().optional(),
  description: string().optional(),
  default: M().optional(),
});
var StringSchemaSchema = u({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  minLength: E().optional(),
  maxLength: E().optional(),
  format: _enum(["email", "uri", "date", "date-time"]).optional(),
  default: string().optional(),
});
var NumberSchemaSchema = u({
  type: _enum(["number", "integer"]),
  title: string().optional(),
  description: string().optional(),
  minimum: E().optional(),
  maximum: E().optional(),
  default: E().optional(),
});
var UntitledSingleSelectEnumSchemaSchema = u({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  default: string().optional(),
});
var TitledSingleSelectEnumSchemaSchema = u({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  oneOf: array(
    u({
      const: string(),
      title: string(),
    }),
  ),
  default: string().optional(),
});
var LegacyTitledEnumSchemaSchema = u({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  enumNames: array(string()).optional(),
  default: string().optional(),
});
var SingleSelectEnumSchemaSchema = union([
  UntitledSingleSelectEnumSchemaSchema,
  TitledSingleSelectEnumSchemaSchema,
]);
var UntitledMultiSelectEnumSchemaSchema = u({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: E().optional(),
  maxItems: E().optional(),
  items: u({
    type: literal("string"),
    enum: array(string()),
  }),
  default: array(string()).optional(),
});
var TitledMultiSelectEnumSchemaSchema = u({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: E().optional(),
  maxItems: E().optional(),
  items: u({
    anyOf: array(
      u({
        const: string(),
        title: string(),
      }),
    ),
  }),
  default: array(string()).optional(),
});
var MultiSelectEnumSchemaSchema = union([
  UntitledMultiSelectEnumSchemaSchema,
  TitledMultiSelectEnumSchemaSchema,
]);
var EnumSchemaSchema = union([
  LegacyTitledEnumSchemaSchema,
  SingleSelectEnumSchemaSchema,
  MultiSelectEnumSchemaSchema,
]);
var PrimitiveSchemaDefinitionSchema = union([
  EnumSchemaSchema,
  BooleanSchemaSchema,
  StringSchemaSchema,
  NumberSchemaSchema,
]);
var ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  mode: literal("form").optional(),
  message: string(),
  requestedSchema: u({
    type: literal("object"),
    properties: record(string(), PrimitiveSchemaDefinitionSchema),
    required: array(string()).optional(),
  }),
});
var ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  mode: literal("url"),
  message: string(),
  elicitationId: string(),
  url: string().url(),
});
var ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
var ElicitRequestSchema = RequestSchema.extend({
  method: literal("elicitation/create"),
  params: ElicitRequestParamsSchema,
});
var ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
  elicitationId: string(),
});
var ElicitationCompleteNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/elicitation/complete"),
  params: ElicitationCompleteNotificationParamsSchema,
});
var ElicitResultSchema = ResultSchema.extend({
  action: _enum(["accept", "decline", "cancel"]),
  content: preprocess(
    (val) => (val === null ? undefined : val),
    record(string(), union([string(), E(), M(), array(string())])).optional(),
  ),
});
var ResourceTemplateReferenceSchema = u({
  type: literal("ref/resource"),
  uri: string(),
});
//@ chunk-x4hefdgz.js:11145-11366 esm-fingerprint
var PromptReferenceSchema = u({
  type: literal("ref/prompt"),
  name: string(),
});
var CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
  ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
  argument: u({
    name: string(),
    value: string(),
  }),
  context: u({
    arguments: record(string(), string()).optional(),
  }).optional(),
});
var CompleteRequestSchema = RequestSchema.extend({
  method: literal("completion/complete"),
  params: CompleteRequestParamsSchema,
});
//@ chunk-x4hefdgz.js:11366-11498 esm-fingerprint
function assertCompleteRequestPrompt(request) {
  if (request.params.ref.type !== "ref/prompt")
    throw TypeError(`Expected CompleteRequestPrompt, but got ${request.params.ref.type}`);
}
//@ chunk-x4hefdgz.js:11498-11642 esm-fingerprint
function assertCompleteRequestResourceTemplate(request) {
  if (request.params.ref.type !== "ref/resource")
    throw TypeError(`Expected CompleteRequestResourceTemplate, but got ${request.params.ref.type}`);
}
//@ chunk-x4hefdgz.js:11642-12281 esm-fingerprint
var CompleteResultSchema = ResultSchema.extend({
  completion: looseObject({
    values: array(string()).max(100),
    total: optional(E().int()),
    hasMore: optional(M()),
  }),
});
var RootSchema = u({
  uri: string().startsWith("file://"),
  name: string().optional(),
  _meta: record(string(), unknown()).optional(),
});
var ListRootsRequestSchema = RequestSchema.extend({
  method: literal("roots/list"),
  params: BaseRequestParamsSchema.optional(),
});
var ListRootsResultSchema = ResultSchema.extend({
  roots: array(RootSchema),
});
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/roots/list_changed"),
  params: NotificationsParamsSchema.optional(),
});
var se = union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema,
]);
var ie = union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  TaskStatusNotificationSchema,
]);
var re = union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema,
]);
var ce = union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema,
]);
var le = union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  TaskStatusNotificationSchema,
  ElicitationCompleteNotificationSchema,
]);
var me = union([
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
  constructor(code, message, data) {
    super(`MCP error ${code}: ${message}`);
    this.code = code;
    this.data = data;
    this.name = "McpError";
  }
  static fromError(code, message, data) {
    if (code === ErrorCode.UrlElicitationRequired && data) {
      let errorData = data;
      if (errorData.elicitations) return new UrlElicitationRequiredError(errorData.elicitations, message);
    }
    return new McpError(code, message, data);
  }
}
//@ chunk-x4hefdgz.js:12538-12728 esm-fingerprint
class UrlElicitationRequiredError extends McpError {
  constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
    super(ErrorCode.UrlElicitationRequired, message, {
      elicitations,
    });
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
