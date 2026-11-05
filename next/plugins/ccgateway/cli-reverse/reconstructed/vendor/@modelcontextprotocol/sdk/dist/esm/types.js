/**
 * @modelcontextprotocol/sdk/dist/esm/types.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-c8yxp647.js (12)
 * attribution: esm-fingerprint 10, esm-layout 2
 */
import {
  custom,
  union,
  stringSchema,
  numberSchema,
  looseObject,
  objectSchema,
  literal,
  unknown,
  array,
  _enum,
  intersection,
  booleanSchema,
  record,
  preprocess,
  optional,
  nullSchema,
  discriminatedUnion,
} from "../../../../zod/v4/classic/schemas.js";
import { parseToolOutputSchema } from "../../../../../src/services/mcp/schemaParse.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-c8yxp647.js:305-1188 esm-fingerprint
var LATEST_PROTOCOL_VERSION; // deferred: uses custom (../../../../zod/v4/classic/schemas.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_NEGOTIATED_PROTOCOL_VERSION;
var SUPPORTED_PROTOCOL_VERSIONS;
var RELATED_TASK_META_KEY;
var JSONRPC_VERSION;
var AssertObjectSchema;
var ProgressTokenSchema;
var CursorSchema;
var TaskCreationParamsSchema;
var TaskMetadataSchema;
var RelatedTaskMetadataSchema;
var RequestMetaSchema;
var BaseRequestParamsSchema;
var TaskAugmentedRequestParamsSchema;
var isTaskAugmentedRequestParams;
var RequestSchema;
var NotificationsParamsSchema;
var NotificationSchema;
var ResultSchema;
var RequestIdSchema;
var JSONRPCRequestSchema;
var isJSONRPCRequest;
var JSONRPCNotificationSchema;
var isJSONRPCNotification;
var JSONRPCResultResponseSchema;
var isJSONRPCResultResponse;
deferInit("chunk-c8yxp647.js:305", () => {
  LATEST_PROTOCOL_VERSION = "2025-11-25";
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION = "2025-03-26";
  SUPPORTED_PROTOCOL_VERSIONS = [
    LATEST_PROTOCOL_VERSION,
    "2025-06-18",
    "2025-03-26",
    "2024-11-05",
    "2024-10-07",
  ];
  RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
  JSONRPC_VERSION = "2.0";
  AssertObjectSchema = custom((v) => v !== null && (typeof v === "object" || typeof v === "function"));
  ProgressTokenSchema = union([stringSchema(), numberSchema().int()]);
  CursorSchema = stringSchema();
  TaskCreationParamsSchema = looseObject({
    ttl: numberSchema().optional(),
    pollInterval: numberSchema().optional(),
  });
  TaskMetadataSchema = objectSchema({
    ttl: numberSchema().optional(),
  });
  RelatedTaskMetadataSchema = objectSchema({
    taskId: stringSchema(),
  });
  RequestMetaSchema = looseObject({
    progressToken: ProgressTokenSchema.optional(),
    [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional(),
  });
  BaseRequestParamsSchema = objectSchema({
    _meta: RequestMetaSchema.optional(),
  });
  TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
    task: TaskMetadataSchema.optional(),
  });
  isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
  RequestSchema = objectSchema({
    method: stringSchema(),
    params: BaseRequestParamsSchema.loose().optional(),
  });
  NotificationsParamsSchema = objectSchema({
    _meta: RequestMetaSchema.optional(),
  });
  NotificationSchema = objectSchema({
    method: stringSchema(),
    params: NotificationsParamsSchema.loose().optional(),
  });
  ResultSchema = looseObject({
    _meta: RequestMetaSchema.optional(),
  });
  RequestIdSchema = union([stringSchema(), numberSchema().int()]);
  JSONRPCRequestSchema = objectSchema({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    ...RequestSchema.shape,
  }).strict();
  isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
  JSONRPCNotificationSchema = objectSchema({
    jsonrpc: literal(JSONRPC_VERSION),
    ...NotificationSchema.shape,
  }).strict();
  isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
  JSONRPCResultResponseSchema = objectSchema({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    result: ResultSchema,
  }).strict();
  isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
});
//@ chunk-c8yxp647.js:1188-1195 esm-layout
var ErrorCode;
//@ chunk-c8yxp647.js:1195-1583 esm-fingerprint
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c8yxp647.js:1195", () => {
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
});
//@ chunk-c8yxp647.js:1583-1691 esm-fingerprint
var JSONRPCErrorResponseSchema; // deferred: uses objectSchema (../../../../zod/v4/classic/schemas.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c8yxp647.js:1583", () => {
  JSONRPCErrorResponseSchema = objectSchema({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema.optional(),
    error: objectSchema({
      code: numberSchema().int(),
      message: stringSchema(),
      data: unknown().optional(),
    }),
  }).strict();
});
//@ chunk-c8yxp647.js:1691-1727 esm-fingerprint
var isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
//@ chunk-c8yxp647.js:1727-11146 esm-layout
var JSONRPCMessageSchema; // deferred: uses union (../../../../zod/v4/classic/schemas.js) of its import cycle while loading; runs once the cycle is complete
var JSONRPCResponseSchema;
var EmptyResultSchema;
var CancelledNotificationParamsSchema;
var CancelledNotificationSchema;
var IconSchema;
var IconsSchema;
var BaseMetadataSchema;
var ImplementationSchema;
var FormElicitationCapabilitySchema;
var ElicitationCapabilitySchema;
var ClientTasksCapabilitySchema;
var ServerTasksCapabilitySchema;
var ClientCapabilitiesSchema;
var InitializeRequestParamsSchema;
var InitializeRequestSchema;
var isInitializeRequest;
var ServerCapabilitiesSchema;
var InitializeResultSchema;
var InitializedNotificationSchema;
var isInitializedNotification;
var PingRequestSchema;
var ProgressSchema;
var ProgressNotificationParamsSchema;
var ProgressNotificationSchema;
var PaginatedRequestParamsSchema;
var PaginatedRequestSchema;
var PaginatedResultSchema;
var TaskStatusSchema;
var TaskSchema;
var CreateTaskResultSchema;
var TaskStatusNotificationParamsSchema;
var TaskStatusNotificationSchema;
var GetTaskRequestSchema;
var GetTaskResultSchema;
var GetTaskPayloadRequestSchema;
var GetTaskPayloadResultSchema;
var ListTasksRequestSchema;
var ListTasksResultSchema;
var CancelTaskRequestSchema;
var CancelTaskResultSchema;
var ResourceContentsSchema;
var TextResourceContentsSchema;
var Base64Schema;
var BlobResourceContentsSchema;
var RoleSchema;
var AnnotationsSchema;
var ResourceSchema;
var ResourceTemplateSchema;
var ListResourcesRequestSchema;
var ListResourcesResultSchema;
var ListResourceTemplatesRequestSchema;
var ListResourceTemplatesResultSchema;
var ResourceRequestParamsSchema;
var ReadResourceRequestParamsSchema;
var ReadResourceRequestSchema;
var ReadResourceResultSchema;
var ResourceListChangedNotificationSchema;
var SubscribeRequestParamsSchema;
var SubscribeRequestSchema;
var UnsubscribeRequestParamsSchema;
var UnsubscribeRequestSchema;
var ResourceUpdatedNotificationParamsSchema;
var ResourceUpdatedNotificationSchema;
var PromptArgumentSchema;
var PromptSchema;
var ListPromptsRequestSchema;
var ListPromptsResultSchema;
var GetPromptRequestParamsSchema;
var GetPromptRequestSchema;
var TextContentSchema;
var ImageContentSchema;
var AudioContentSchema;
var ToolUseContentSchema;
var EmbeddedResourceSchema;
var ResourceLinkSchema;
var ContentBlockSchema;
var PromptMessageSchema;
var GetPromptResultSchema;
var PromptListChangedNotificationSchema;
var ToolAnnotationsSchema;
var ToolExecutionSchema;
var ToolSchema;
var ListToolsRequestSchema;
var ListToolsResultSchema;
var CallToolResultSchema;
var CompatibilityCallToolResultSchema;
var CallToolRequestParamsSchema;
var CallToolRequestSchema;
var ToolListChangedNotificationSchema;
var ListChangedOptionsBaseSchema;
var LoggingLevelSchema;
var SetLevelRequestParamsSchema;
var SetLevelRequestSchema;
var LoggingMessageNotificationParamsSchema;
var LoggingMessageNotificationSchema;
var ModelHintSchema;
var ModelPreferencesSchema;
var ToolChoiceSchema;
var ToolResultContentSchema;
var SamplingContentSchema;
var SamplingMessageContentBlockSchema;
var SamplingMessageSchema;
var CreateMessageRequestParamsSchema;
var CreateMessageRequestSchema;
var CreateMessageResultSchema;
var CreateMessageResultWithToolsSchema;
var BooleanSchemaSchema;
var StringSchemaSchema;
var NumberSchemaSchema;
var UntitledSingleSelectEnumSchemaSchema;
var TitledSingleSelectEnumSchemaSchema;
var LegacyTitledEnumSchemaSchema;
var SingleSelectEnumSchemaSchema;
var UntitledMultiSelectEnumSchemaSchema;
var TitledMultiSelectEnumSchemaSchema;
var MultiSelectEnumSchemaSchema;
var EnumSchemaSchema;
var PrimitiveSchemaDefinitionSchema;
var ElicitRequestFormParamsSchema;
var ElicitRequestURLParamsSchema;
var ElicitRequestParamsSchema;
var ElicitRequestSchema;
var ElicitationCompleteNotificationParamsSchema;
var ElicitationCompleteNotificationSchema;
var ElicitResultSchema;
var ResourceTemplateReferenceSchema;
deferInit("chunk-c8yxp647.js:1727", () => {
  JSONRPCMessageSchema = union([
    JSONRPCRequestSchema,
    JSONRPCNotificationSchema,
    JSONRPCResultResponseSchema,
    JSONRPCErrorResponseSchema,
  ]);
  JSONRPCResponseSchema = union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
  EmptyResultSchema = ResultSchema.strict();
  CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
    requestId: RequestIdSchema.optional(),
    reason: stringSchema().optional(),
  });
  CancelledNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/cancelled"),
    params: CancelledNotificationParamsSchema,
  });
  IconSchema = objectSchema({
    src: stringSchema(),
    mimeType: stringSchema().optional(),
    sizes: array(stringSchema()).optional(),
    theme: _enum(["light", "dark"]).optional(),
  });
  IconsSchema = objectSchema({
    icons: array(IconSchema).optional(),
  });
  BaseMetadataSchema = objectSchema({
    name: stringSchema(),
    title: stringSchema().optional(),
  });
  ImplementationSchema = BaseMetadataSchema.extend({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    version: stringSchema(),
    websiteUrl: stringSchema().optional(),
    description: stringSchema().optional(),
  });
  FormElicitationCapabilitySchema = intersection(
    objectSchema({
      applyDefaults: booleanSchema().optional(),
    }),
    record(stringSchema(), unknown()),
  );
  ElicitationCapabilitySchema = preprocess(
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
      objectSchema({
        form: FormElicitationCapabilitySchema.optional(),
        url: AssertObjectSchema.optional(),
      }),
      record(stringSchema(), unknown()).optional(),
    ),
  );
  ClientTasksCapabilitySchema = looseObject({
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
  ServerTasksCapabilitySchema = looseObject({
    list: AssertObjectSchema.optional(),
    cancel: AssertObjectSchema.optional(),
    requests: looseObject({
      tools: looseObject({
        call: AssertObjectSchema.optional(),
      }).optional(),
    }).optional(),
  });
  ClientCapabilitiesSchema = objectSchema({
    experimental: record(stringSchema(), AssertObjectSchema).optional(),
    sampling: objectSchema({
      context: AssertObjectSchema.optional(),
      tools: AssertObjectSchema.optional(),
    }).optional(),
    elicitation: ElicitationCapabilitySchema.optional(),
    roots: objectSchema({
      listChanged: booleanSchema().optional(),
    }).optional(),
    tasks: ClientTasksCapabilitySchema.optional(),
    extensions: record(stringSchema(), AssertObjectSchema).optional(),
  });
  InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
    protocolVersion: stringSchema(),
    capabilities: ClientCapabilitiesSchema,
    clientInfo: ImplementationSchema,
  });
  InitializeRequestSchema = RequestSchema.extend({
    method: literal("initialize"),
    params: InitializeRequestParamsSchema,
  });
  isInitializeRequest = (value) => InitializeRequestSchema.safeParse(value).success;
  ServerCapabilitiesSchema = objectSchema({
    experimental: record(stringSchema(), AssertObjectSchema).optional(),
    logging: AssertObjectSchema.optional(),
    completions: AssertObjectSchema.optional(),
    prompts: objectSchema({
      listChanged: booleanSchema().optional(),
    }).optional(),
    resources: objectSchema({
      subscribe: booleanSchema().optional(),
      listChanged: booleanSchema().optional(),
    }).optional(),
    tools: objectSchema({
      listChanged: booleanSchema().optional(),
    }).optional(),
    tasks: ServerTasksCapabilitySchema.optional(),
    extensions: record(stringSchema(), AssertObjectSchema).optional(),
  });
  InitializeResultSchema = ResultSchema.extend({
    protocolVersion: stringSchema(),
    capabilities: ServerCapabilitiesSchema,
    serverInfo: ImplementationSchema,
    instructions: stringSchema().optional(),
  });
  InitializedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/initialized"),
    params: NotificationsParamsSchema.optional(),
  });
  isInitializedNotification = (value) => InitializedNotificationSchema.safeParse(value).success;
  PingRequestSchema = RequestSchema.extend({
    method: literal("ping"),
    params: BaseRequestParamsSchema.optional(),
  });
  ProgressSchema = objectSchema({
    progress: numberSchema(),
    total: optional(numberSchema()),
    message: optional(stringSchema()),
  });
  ProgressNotificationParamsSchema = objectSchema({
    ...NotificationsParamsSchema.shape,
    ...ProgressSchema.shape,
    progressToken: ProgressTokenSchema,
  });
  ProgressNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/progress"),
    params: ProgressNotificationParamsSchema,
  });
  PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
    cursor: CursorSchema.optional(),
  });
  PaginatedRequestSchema = RequestSchema.extend({
    params: PaginatedRequestParamsSchema.optional(),
  });
  PaginatedResultSchema = ResultSchema.extend({
    nextCursor: CursorSchema.optional(),
  });
  TaskStatusSchema = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
  TaskSchema = objectSchema({
    taskId: stringSchema(),
    status: TaskStatusSchema,
    ttl: union([numberSchema(), nullSchema()]),
    createdAt: stringSchema(),
    lastUpdatedAt: stringSchema(),
    pollInterval: optional(numberSchema()),
    statusMessage: optional(stringSchema()),
  });
  CreateTaskResultSchema = ResultSchema.extend({
    task: TaskSchema,
  });
  TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
  TaskStatusNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/tasks/status"),
    params: TaskStatusNotificationParamsSchema,
  });
  GetTaskRequestSchema = RequestSchema.extend({
    method: literal("tasks/get"),
    params: BaseRequestParamsSchema.extend({
      taskId: stringSchema(),
    }),
  });
  GetTaskResultSchema = ResultSchema.merge(TaskSchema);
  GetTaskPayloadRequestSchema = RequestSchema.extend({
    method: literal("tasks/result"),
    params: BaseRequestParamsSchema.extend({
      taskId: stringSchema(),
    }),
  });
  GetTaskPayloadResultSchema = ResultSchema.loose();
  ListTasksRequestSchema = PaginatedRequestSchema.extend({
    method: literal("tasks/list"),
  });
  ListTasksResultSchema = PaginatedResultSchema.extend({
    tasks: array(TaskSchema),
  });
  CancelTaskRequestSchema = RequestSchema.extend({
    method: literal("tasks/cancel"),
    params: BaseRequestParamsSchema.extend({
      taskId: stringSchema(),
    }),
  });
  CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
  ResourceContentsSchema = objectSchema({
    uri: stringSchema(),
    mimeType: optional(stringSchema()),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  TextResourceContentsSchema = ResourceContentsSchema.extend({
    text: stringSchema(),
  });
  Base64Schema = stringSchema().refine(
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
  BlobResourceContentsSchema = ResourceContentsSchema.extend({
    blob: Base64Schema,
  });
  RoleSchema = _enum(["user", "assistant"]);
  AnnotationsSchema = objectSchema({
    audience: array(RoleSchema).optional(),
    priority: numberSchema().min(0).max(1).optional(),
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
  ResourceSchema = objectSchema({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    uri: stringSchema(),
    description: optional(stringSchema()),
    mimeType: optional(stringSchema()),
    size: optional(numberSchema()),
    annotations: AnnotationsSchema.optional(),
    _meta: optional(looseObject({})),
  });
  ResourceTemplateSchema = objectSchema({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    uriTemplate: stringSchema(),
    description: optional(stringSchema()),
    mimeType: optional(stringSchema()),
    annotations: AnnotationsSchema.optional(),
    _meta: optional(looseObject({})),
  });
  ListResourcesRequestSchema = PaginatedRequestSchema.extend({
    method: literal("resources/list"),
  });
  ListResourcesResultSchema = PaginatedResultSchema.extend({
    resources: array(ResourceSchema),
  });
  ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
    method: literal("resources/templates/list"),
  });
  ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
    resourceTemplates: array(ResourceTemplateSchema),
  });
  ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
    uri: stringSchema(),
  });
  ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
  ReadResourceRequestSchema = RequestSchema.extend({
    method: literal("resources/read"),
    params: ReadResourceRequestParamsSchema,
  });
  ReadResourceResultSchema = ResultSchema.extend({
    contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema])),
  });
  ResourceListChangedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/resources/list_changed"),
    params: NotificationsParamsSchema.optional(),
  });
  SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
  SubscribeRequestSchema = RequestSchema.extend({
    method: literal("resources/subscribe"),
    params: SubscribeRequestParamsSchema,
  });
  UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
  UnsubscribeRequestSchema = RequestSchema.extend({
    method: literal("resources/unsubscribe"),
    params: UnsubscribeRequestParamsSchema,
  });
  ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
    uri: stringSchema(),
  });
  ResourceUpdatedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/resources/updated"),
    params: ResourceUpdatedNotificationParamsSchema,
  });
  PromptArgumentSchema = objectSchema({
    name: stringSchema(),
    description: optional(stringSchema()),
    required: optional(booleanSchema()),
  });
  PromptSchema = objectSchema({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    description: optional(stringSchema()),
    arguments: optional(array(PromptArgumentSchema)),
    _meta: optional(looseObject({})),
  });
  ListPromptsRequestSchema = PaginatedRequestSchema.extend({
    method: literal("prompts/list"),
  });
  ListPromptsResultSchema = PaginatedResultSchema.extend({
    prompts: array(PromptSchema),
  });
  GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
    name: stringSchema(),
    arguments: record(stringSchema(), stringSchema()).optional(),
  });
  GetPromptRequestSchema = RequestSchema.extend({
    method: literal("prompts/get"),
    params: GetPromptRequestParamsSchema,
  });
  TextContentSchema = objectSchema({
    type: literal("text"),
    text: stringSchema(),
    annotations: AnnotationsSchema.optional(),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  ImageContentSchema = objectSchema({
    type: literal("image"),
    data: Base64Schema,
    mimeType: stringSchema(),
    annotations: AnnotationsSchema.optional(),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  AudioContentSchema = objectSchema({
    type: literal("audio"),
    data: Base64Schema,
    mimeType: stringSchema(),
    annotations: AnnotationsSchema.optional(),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  ToolUseContentSchema = objectSchema({
    type: literal("tool_use"),
    name: stringSchema(),
    id: stringSchema(),
    input: record(stringSchema(), unknown()),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  EmbeddedResourceSchema = objectSchema({
    type: literal("resource"),
    resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
    annotations: AnnotationsSchema.optional(),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  ResourceLinkSchema = ResourceSchema.extend({
    type: literal("resource_link"),
  });
  ContentBlockSchema = union([
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
    ResourceLinkSchema,
    EmbeddedResourceSchema,
  ]);
  PromptMessageSchema = objectSchema({
    role: RoleSchema,
    content: ContentBlockSchema,
  });
  GetPromptResultSchema = ResultSchema.extend({
    description: stringSchema().optional(),
    messages: array(PromptMessageSchema),
  });
  PromptListChangedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/prompts/list_changed"),
    params: NotificationsParamsSchema.optional(),
  });
  ToolAnnotationsSchema = objectSchema({
    title: stringSchema().optional(),
    readOnlyHint: booleanSchema().optional(),
    destructiveHint: booleanSchema().optional(),
    idempotentHint: booleanSchema().optional(),
    openWorldHint: booleanSchema().optional(),
  });
  ToolExecutionSchema = objectSchema({
    taskSupport: _enum(["required", "optional", "forbidden"]).optional(),
  });
  ToolSchema = objectSchema({
    ...BaseMetadataSchema.shape,
    ...IconsSchema.shape,
    description: stringSchema().optional(),
    inputSchema: objectSchema({
      type: literal("object"),
      properties: record(stringSchema(), AssertObjectSchema).optional(),
      required: array(stringSchema()).optional(),
    }).catchall(unknown()),
    outputSchema: objectSchema({
      type: literal("object"),
      properties: record(stringSchema(), AssertObjectSchema).optional(),
      required: array(stringSchema()).optional(),
    })
      .catchall(unknown())
      .optional(),
    annotations: ToolAnnotationsSchema.optional(),
    execution: ToolExecutionSchema.optional(),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  ListToolsRequestSchema = PaginatedRequestSchema.extend({
    method: literal("tools/list"),
  });
  ListToolsResultSchema = PaginatedResultSchema.extend({
    tools: array(ToolSchema),
  });
  CallToolResultSchema = ResultSchema.extend({
    content: array(ContentBlockSchema).default([]),
    structuredContent: record(stringSchema(), unknown()).optional(),
    isError: booleanSchema().optional(),
  });
  CompatibilityCallToolResultSchema = CallToolResultSchema.or(
    ResultSchema.extend({
      toolResult: unknown(),
    }),
  );
  CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
    name: stringSchema(),
    arguments: record(stringSchema(), unknown()).optional(),
  });
  CallToolRequestSchema = RequestSchema.extend({
    method: literal("tools/call"),
    params: CallToolRequestParamsSchema,
  });
  ToolListChangedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/tools/list_changed"),
    params: NotificationsParamsSchema.optional(),
  });
  ListChangedOptionsBaseSchema = objectSchema({
    autoRefresh: booleanSchema().default(true),
    debounceMs: numberSchema().int().nonnegative().default(300),
  });
  LoggingLevelSchema = _enum([
    "debug",
    "info",
    "notice",
    "warning",
    "error",
    "critical",
    "alert",
    "emergency",
  ]);
  SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
    level: LoggingLevelSchema,
  });
  SetLevelRequestSchema = RequestSchema.extend({
    method: literal("logging/setLevel"),
    params: SetLevelRequestParamsSchema,
  });
  LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
    level: LoggingLevelSchema,
    logger: stringSchema().optional(),
    data: unknown(),
  });
  LoggingMessageNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/message"),
    params: LoggingMessageNotificationParamsSchema,
  });
  ModelHintSchema = objectSchema({
    name: stringSchema().optional(),
  });
  ModelPreferencesSchema = objectSchema({
    hints: array(ModelHintSchema).optional(),
    costPriority: numberSchema().min(0).max(1).optional(),
    speedPriority: numberSchema().min(0).max(1).optional(),
    intelligencePriority: numberSchema().min(0).max(1).optional(),
  });
  ToolChoiceSchema = objectSchema({
    mode: _enum(["auto", "required", "none"]).optional(),
  });
  ToolResultContentSchema = objectSchema({
    type: literal("tool_result"),
    toolUseId: stringSchema().describe("The unique identifier for the corresponding tool call."),
    content: array(ContentBlockSchema).default([]),
    structuredContent: objectSchema({}).loose().optional(),
    isError: booleanSchema().optional(),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  SamplingContentSchema = discriminatedUnion("type", [
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
  ]);
  SamplingMessageContentBlockSchema = discriminatedUnion("type", [
    TextContentSchema,
    ImageContentSchema,
    AudioContentSchema,
    ToolUseContentSchema,
    ToolResultContentSchema,
  ]);
  SamplingMessageSchema = objectSchema({
    role: RoleSchema,
    content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
    messages: array(SamplingMessageSchema),
    modelPreferences: ModelPreferencesSchema.optional(),
    systemPrompt: stringSchema().optional(),
    includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
    temperature: numberSchema().optional(),
    maxTokens: numberSchema().int(),
    stopSequences: array(stringSchema()).optional(),
    metadata: AssertObjectSchema.optional(),
    tools: array(ToolSchema).optional(),
    toolChoice: ToolChoiceSchema.optional(),
  });
  CreateMessageRequestSchema = RequestSchema.extend({
    method: literal("sampling/createMessage"),
    params: CreateMessageRequestParamsSchema,
  });
  CreateMessageResultSchema = ResultSchema.extend({
    model: stringSchema(),
    stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(stringSchema())),
    role: RoleSchema,
    content: SamplingContentSchema,
  });
  CreateMessageResultWithToolsSchema = ResultSchema.extend({
    model: stringSchema(),
    stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(stringSchema())),
    role: RoleSchema,
    content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  });
  BooleanSchemaSchema = objectSchema({
    type: literal("boolean"),
    title: stringSchema().optional(),
    description: stringSchema().optional(),
    default: booleanSchema().optional(),
  });
  StringSchemaSchema = objectSchema({
    type: literal("string"),
    title: stringSchema().optional(),
    description: stringSchema().optional(),
    minLength: numberSchema().optional(),
    maxLength: numberSchema().optional(),
    format: _enum(["email", "uri", "date", "date-time"]).optional(),
    default: stringSchema().optional(),
  });
  NumberSchemaSchema = objectSchema({
    type: _enum(["number", "integer"]),
    title: stringSchema().optional(),
    description: stringSchema().optional(),
    minimum: numberSchema().optional(),
    maximum: numberSchema().optional(),
    default: numberSchema().optional(),
  });
  UntitledSingleSelectEnumSchemaSchema = objectSchema({
    type: literal("string"),
    title: stringSchema().optional(),
    description: stringSchema().optional(),
    enum: array(stringSchema()),
    default: stringSchema().optional(),
  });
  TitledSingleSelectEnumSchemaSchema = objectSchema({
    type: literal("string"),
    title: stringSchema().optional(),
    description: stringSchema().optional(),
    oneOf: array(
      objectSchema({
        const: stringSchema(),
        title: stringSchema(),
      }),
    ),
    default: stringSchema().optional(),
  });
  LegacyTitledEnumSchemaSchema = objectSchema({
    type: literal("string"),
    title: stringSchema().optional(),
    description: stringSchema().optional(),
    enum: array(stringSchema()),
    enumNames: array(stringSchema()).optional(),
    default: stringSchema().optional(),
  });
  SingleSelectEnumSchemaSchema = union([
    UntitledSingleSelectEnumSchemaSchema,
    TitledSingleSelectEnumSchemaSchema,
  ]);
  UntitledMultiSelectEnumSchemaSchema = objectSchema({
    type: literal("array"),
    title: stringSchema().optional(),
    description: stringSchema().optional(),
    minItems: numberSchema().optional(),
    maxItems: numberSchema().optional(),
    items: objectSchema({
      type: literal("string"),
      enum: array(stringSchema()),
    }),
    default: array(stringSchema()).optional(),
  });
  TitledMultiSelectEnumSchemaSchema = objectSchema({
    type: literal("array"),
    title: stringSchema().optional(),
    description: stringSchema().optional(),
    minItems: numberSchema().optional(),
    maxItems: numberSchema().optional(),
    items: objectSchema({
      anyOf: array(
        objectSchema({
          const: stringSchema(),
          title: stringSchema(),
        }),
      ),
    }),
    default: array(stringSchema()).optional(),
  });
  MultiSelectEnumSchemaSchema = union([
    UntitledMultiSelectEnumSchemaSchema,
    TitledMultiSelectEnumSchemaSchema,
  ]);
  EnumSchemaSchema = union([
    LegacyTitledEnumSchemaSchema,
    SingleSelectEnumSchemaSchema,
    MultiSelectEnumSchemaSchema,
  ]);
  PrimitiveSchemaDefinitionSchema = union([
    EnumSchemaSchema,
    BooleanSchemaSchema,
    StringSchemaSchema,
    NumberSchemaSchema,
  ]);
  ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
    mode: literal("form").optional(),
    message: stringSchema(),
    requestedSchema: objectSchema({
      type: literal("object"),
      properties: record(stringSchema(), PrimitiveSchemaDefinitionSchema),
      required: array(stringSchema()).optional(),
    }),
  });
  ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
    mode: literal("url"),
    message: stringSchema(),
    elicitationId: stringSchema(),
    url: stringSchema().url(),
  });
  ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
  ElicitRequestSchema = RequestSchema.extend({
    method: literal("elicitation/create"),
    params: ElicitRequestParamsSchema,
  });
  ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
    elicitationId: stringSchema(),
  });
  ElicitationCompleteNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/elicitation/complete"),
    params: ElicitationCompleteNotificationParamsSchema,
  });
  ElicitResultSchema = ResultSchema.extend({
    action: _enum(["accept", "decline", "cancel"]),
    content: preprocess(
      (val) => (val === null ? undefined : val),
      record(
        stringSchema(),
        union([stringSchema(), numberSchema(), booleanSchema(), array(stringSchema())]),
      ).optional(),
    ),
  });
  ResourceTemplateReferenceSchema = objectSchema({
    type: literal("ref/resource"),
    uri: stringSchema(),
  });
});
//@ chunk-c8yxp647.js:11146-11367 esm-fingerprint
var PromptReferenceSchema; // deferred: uses objectSchema (../../../../zod/v4/classic/schemas.js) of its import cycle while loading; runs once the cycle is complete
var CompleteRequestParamsSchema;
var CompleteRequestSchema;
deferInit("chunk-c8yxp647.js:11146", () => {
  PromptReferenceSchema = objectSchema({
    type: literal("ref/prompt"),
    name: stringSchema(),
  });
  CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
    ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
    argument: objectSchema({
      name: stringSchema(),
      value: stringSchema(),
    }),
    context: objectSchema({
      arguments: record(stringSchema(), stringSchema()).optional(),
    }).optional(),
  });
  CompleteRequestSchema = RequestSchema.extend({
    method: literal("completion/complete"),
    params: CompleteRequestParamsSchema,
  });
});
//@ chunk-c8yxp647.js:11367-11499 esm-fingerprint
function assertCompleteRequestPrompt(request) {
  if (request.params.ref.type !== "ref/prompt")
    throw TypeError(`Expected CompleteRequestPrompt, but got ${request.params.ref.type}`);
}
//@ chunk-c8yxp647.js:11499-11643 esm-fingerprint
function assertCompleteRequestResourceTemplate(request) {
  if (request.params.ref.type !== "ref/resource")
    throw TypeError(`Expected CompleteRequestResourceTemplate, but got ${request.params.ref.type}`);
}
//@ chunk-c8yxp647.js:11643-12283 esm-fingerprint
var CompleteResultSchema; // deferred: uses LATEST_PROTOCOL_VERSION of its import cycle while loading; runs once the cycle is complete
var RootSchema;
var ListRootsRequestSchema;
var ListRootsResultSchema;
var RootsListChangedNotificationSchema;
var ClientRequestSchema;
var ClientNotificationSchema;
var ClientResultSchema;
var ServerRequestSchema;
var ServerNotificationSchema;
var ServerResultSchema;
deferInit("chunk-c8yxp647.js:11643", () => {
  CompleteResultSchema = ResultSchema.extend({
    completion: looseObject({
      values: array(stringSchema()).max(100),
      total: optional(numberSchema().int()),
      hasMore: optional(booleanSchema()),
    }),
  });
  RootSchema = objectSchema({
    uri: stringSchema().startsWith("file://"),
    name: stringSchema().optional(),
    _meta: record(stringSchema(), unknown()).optional(),
  });
  ListRootsRequestSchema = RequestSchema.extend({
    method: literal("roots/list"),
    params: BaseRequestParamsSchema.optional(),
  });
  ListRootsResultSchema = ResultSchema.extend({
    roots: array(RootSchema),
  });
  RootsListChangedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/roots/list_changed"),
    params: NotificationsParamsSchema.optional(),
  });
  ClientRequestSchema = union([
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
  ClientNotificationSchema = union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
    TaskStatusNotificationSchema,
  ]);
  ClientResultSchema = union([
    EmptyResultSchema,
    CreateMessageResultSchema,
    CreateMessageResultWithToolsSchema,
    ElicitResultSchema,
    ListRootsResultSchema,
    GetTaskResultSchema,
    ListTasksResultSchema,
    CreateTaskResultSchema,
  ]);
  ServerRequestSchema = union([
    PingRequestSchema,
    CreateMessageRequestSchema,
    ElicitRequestSchema,
    ListRootsRequestSchema,
    GetTaskRequestSchema,
    GetTaskPayloadRequestSchema,
    ListTasksRequestSchema,
    CancelTaskRequestSchema,
  ]);
  ServerNotificationSchema = union([
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
  ServerResultSchema = union([
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
});
//@ chunk-c8yxp647.js:12283-12540 esm-fingerprint
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
//@ chunk-c8yxp647.js:12540-12730 esm-fingerprint
let UrlElicitationRequiredError; // deferred: uses McpError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c8yxp647.js:12540", () => {
  UrlElicitationRequiredError = class UrlElicitationRequiredError extends McpError {
    constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
      super(ErrorCode.UrlElicitationRequired, message, {
        elicitations,
      });
    }
    get elicitations() {
      return this.data?.elicitations ?? [];
    }
  };
});
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
  RelatedTaskMetadataSchema,
  RELATED_TASK_META_KEY,
  ElicitationCompleteNotificationSchema,
  isInitializeRequest,
  isJSONRPCRequest,
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  isJSONRPCResultResponse,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesResultSchema,
  LATEST_PROTOCOL_VERSION,
  isInitializedNotification,
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
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  PingRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema,
  isJSONRPCNotification,
  isTaskAugmentedRequestParams,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CancelTaskResultSchema,
  TaskStatusNotificationSchema,
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
  CompleteRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  assertCompleteRequestPrompt,
  assertCompleteRequestResourceTemplate,
};
