/**
 * @modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/core@2.0.0
 * pieces: chunk-1kaj6e83.js (1), chunk-n1aavqzh.js (1), chunk-r1g76qsy.js (5)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
import {
  lazy,
  union,
  stringSchema,
  numberSchema,
  booleanSchema,
  nullSchema,
  record,
  array,
  objectSchema,
  looseObject,
  literal,
  unknown,
  _enum,
  intersection,
  preprocess,
  optional,
  discriminatedUnion,
  urlSchema,
  anySchema,
} from "../../../zod/v4/classic/schemas.js";
import { parseToolOutputSchema } from "../../../../src/services/mcp/schemaParse.js";
import { ZodIssueCode, coerceNumber } from "../../../zod/v4/classic/compat.js";
import { INVALID } from "../../../zod/v4/core/core.js";
import { DoctorLazy } from "../../../../src/cli/handlers/util.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-r1g76qsy.js:1173-1193 esm-fingerprint
var LATEST_PROTOCOL_VERSION = "2025-11-25";
//@ chunk-r1g76qsy.js:1193-1557 esm-fingerprint
var SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
];
var RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
var PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";
var CLIENT_INFO_META_KEY = "io.modelcontextprotocol/clientInfo";
var SERVER_INFO_META_KEY = "io.modelcontextprotocol/serverInfo";
var CLIENT_CAPABILITIES_META_KEY = "io.modelcontextprotocol/clientCapabilities";
var SUBSCRIPTION_ID_META_KEY = "io.modelcontextprotocol/subscriptionId";
var LOG_LEVEL_META_KEY = "io.modelcontextprotocol/logLevel";
//@ chunk-r1g76qsy.js:1557-1570 esm-fingerprint
var JSONRPC_VERSION = "2.0";
//@ chunk-r1g76qsy.js:1570-1585 esm-fingerprint
var PARSE_ERROR = -32601;
//@ chunk-r1g76qsy.js:1585-17821 esm-layout
var JSONValueSchema; // deferred: uses lazy (../../../zod/v4/classic/schemas.js) of its import cycle while loading; runs once the cycle is complete
var JSONObjectSchema;
var JSONArraySchema;
var ProgressTokenSchema;
var CursorSchema;
var TaskMetadataSchema;
var RelatedTaskMetadataSchema;
var RequestMetaSchema;
var BaseRequestParamsSchema;
var TaskAugmentedRequestParamsSchema;
var RequestSchema;
var NotificationsParamsSchema;
var NotificationSchema;
var ResultMetaObjectSchema;
var ResultSchema;
var RequestIdSchema;
var JSONRPCRequestSchema;
var JSONRPCNotificationSchema;
var JSONRPCResultResponseSchema;
var JSONRPCErrorResponseSchema;
var JSONRPCMessageSchema;
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
var ServerCapabilitiesSchema;
var InitializeResultSchema;
var InitializedNotificationSchema;
var DiscoverRequestSchema;
var DiscoverResultSchema;
var PingRequestSchema;
var ProgressSchema;
var ProgressNotificationParamsSchema;
var ProgressNotificationSchema;
var PaginatedRequestParamsSchema;
var PaginatedRequestSchema;
var PaginatedResultSchema;
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
var SubscriptionFilterSchema;
var SubscriptionsListenRequestParamsSchema;
var SubscriptionsListenRequestSchema;
var SubscriptionsAcknowledgedNotificationParamsSchema;
var SubscriptionsAcknowledgedNotificationSchema;
var SubscriptionsListenResultMetaSchema;
var SubscriptionsListenResultSchema;
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
var PromptReferenceSchema;
var CompleteRequestParamsSchema;
var CompleteRequestSchema;
var CompleteResultSchema;
var RootSchema;
var ListRootsRequestSchema;
var ListRootsResultSchema;
var RootsListChangedNotificationSchema;
var TaskCreationParamsSchema;
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
var ClientRequestSchema;
var ClientNotificationSchema;
var ClientResultSchema;
var ServerRequestSchema;
var ServerNotificationSchema;
var ServerResultSchema;
var SafeUrlSchema;
var OAuthProtectedResourceMetadataSchema;
var OAuthMetadataSchema;
var OpenIdProviderMetadataSchema;
var OpenIdProviderDiscoveryMetadataSchema;
var OAuthTokensSchema;
var IdJagTokenExchangeResponseSchema;
var OAuthErrorResponseSchema;
var OptionalSafeUrlSchema;
var OAuthClientMetadataSchema;
var OAuthClientInformationSchema;
var OAuthClientInformationFullSchema;
var OAuthClientRegistrationErrorSchema;
var OAuthTokenRevocationRequestSchema;
deferInit("chunk-r1g76qsy.js:1585", () => {
  JSONValueSchema = lazy(() =>
    union([
      stringSchema(),
      numberSchema(),
      booleanSchema(),
      nullSchema(),
      record(stringSchema(), JSONValueSchema),
      array(JSONValueSchema),
    ]),
  );
  JSONObjectSchema = record(stringSchema(), JSONValueSchema);
  JSONArraySchema = array(JSONValueSchema);
  ProgressTokenSchema = union([stringSchema(), numberSchema().int()]);
  CursorSchema = stringSchema();
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
  ResultMetaObjectSchema = looseObject({
    get [SERVER_INFO_META_KEY]() {
      return ImplementationSchema.optional().catch(undefined);
    },
  });
  ResultSchema = looseObject({
    _meta: ResultMetaObjectSchema.optional(),
  });
  RequestIdSchema = union([stringSchema(), numberSchema().int()]);
  JSONRPCRequestSchema = objectSchema({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    ...RequestSchema.shape,
  }).strict();
  JSONRPCNotificationSchema = objectSchema({
    jsonrpc: literal(JSONRPC_VERSION),
    ...NotificationSchema.shape,
  }).strict();
  JSONRPCResultResponseSchema = objectSchema({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema,
    result: ResultSchema,
  }).strict();
  JSONRPCErrorResponseSchema = objectSchema({
    jsonrpc: literal(JSONRPC_VERSION),
    id: RequestIdSchema.optional(),
    error: objectSchema({
      code: numberSchema().int(),
      message: stringSchema(),
      data: unknown().optional(),
    }),
  }).strict();
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
    JSONObjectSchema,
  );
  ElicitationCapabilitySchema = preprocess(
    (value) => {
      if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
        return {
          form: {},
        };
      return value;
    },
    intersection(
      objectSchema({
        form: FormElicitationCapabilitySchema.optional(),
        url: JSONObjectSchema.optional(),
      }),
      JSONObjectSchema.optional(),
    ),
  );
  ClientTasksCapabilitySchema = looseObject({
    list: JSONObjectSchema.optional(),
    cancel: JSONObjectSchema.optional(),
    requests: looseObject({
      sampling: looseObject({
        createMessage: JSONObjectSchema.optional(),
      }).optional(),
      elicitation: looseObject({
        create: JSONObjectSchema.optional(),
      }).optional(),
    }).optional(),
  });
  ServerTasksCapabilitySchema = looseObject({
    list: JSONObjectSchema.optional(),
    cancel: JSONObjectSchema.optional(),
    requests: looseObject({
      tools: looseObject({
        call: JSONObjectSchema.optional(),
      }).optional(),
    }).optional(),
  });
  ClientCapabilitiesSchema = objectSchema({
    experimental: record(stringSchema(), JSONObjectSchema).optional(),
    sampling: objectSchema({
      context: JSONObjectSchema.optional(),
      tools: JSONObjectSchema.optional(),
    }).optional(),
    elicitation: ElicitationCapabilitySchema.optional(),
    roots: objectSchema({
      listChanged: booleanSchema().optional(),
    }).optional(),
    tasks: ClientTasksCapabilitySchema.optional(),
    extensions: record(stringSchema(), JSONObjectSchema).optional(),
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
  ServerCapabilitiesSchema = objectSchema({
    experimental: record(stringSchema(), JSONObjectSchema).optional(),
    logging: JSONObjectSchema.optional(),
    completions: JSONObjectSchema.optional(),
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
    extensions: record(stringSchema(), JSONObjectSchema).optional(),
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
  DiscoverRequestSchema = RequestSchema.extend({
    method: literal("server/discover"),
    params: BaseRequestParamsSchema.optional(),
  });
  DiscoverResultSchema = ResultSchema.extend({
    supportedVersions: array(stringSchema()),
    capabilities: ServerCapabilitiesSchema,
    instructions: stringSchema().optional(),
  });
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
  SubscriptionFilterSchema = objectSchema({
    toolsListChanged: booleanSchema().optional(),
    promptsListChanged: booleanSchema().optional(),
    resourcesListChanged: booleanSchema().optional(),
    resourceSubscriptions: array(stringSchema()).optional(),
  });
  SubscriptionsListenRequestParamsSchema = BaseRequestParamsSchema.extend({
    notifications: SubscriptionFilterSchema,
  });
  SubscriptionsListenRequestSchema = RequestSchema.extend({
    method: literal("subscriptions/listen"),
    params: SubscriptionsListenRequestParamsSchema,
  });
  SubscriptionsAcknowledgedNotificationParamsSchema = NotificationsParamsSchema.extend({
    notifications: SubscriptionFilterSchema,
  });
  SubscriptionsAcknowledgedNotificationSchema = NotificationSchema.extend({
    method: literal("notifications/subscriptions/acknowledged"),
    params: SubscriptionsAcknowledgedNotificationParamsSchema,
  });
  SubscriptionsListenResultMetaSchema = ResultMetaObjectSchema.extend({
    [SUBSCRIPTION_ID_META_KEY]: RequestIdSchema,
  });
  SubscriptionsListenResultSchema = ResultSchema.extend({
    _meta: SubscriptionsListenResultMetaSchema,
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
      properties: record(stringSchema(), JSONValueSchema).optional(),
      required: array(stringSchema()).optional(),
    }).catchall(unknown()),
    outputSchema: looseObject({
      $schema: stringSchema().optional(),
    }).optional(),
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
    structuredContent: unknown().optional(),
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
    content: array(ContentBlockSchema),
    structuredContent: unknown().optional(),
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
    metadata: JSONObjectSchema.optional(),
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
    }).catchall(unknown()),
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
  TaskCreationParamsSchema = looseObject({
    ttl: numberSchema().optional(),
    pollInterval: numberSchema().optional(),
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
  ClientRequestSchema = union([
    PingRequestSchema,
    InitializeRequestSchema,
    DiscoverRequestSchema,
    CompleteRequestSchema,
    SetLevelRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ReadResourceRequestSchema,
    SubscribeRequestSchema,
    UnsubscribeRequestSchema,
    SubscriptionsListenRequestSchema,
    CallToolRequestSchema,
    ListToolsRequestSchema,
  ]);
  ClientNotificationSchema = union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    InitializedNotificationSchema,
    RootsListChangedNotificationSchema,
  ]);
  ClientResultSchema = union([
    EmptyResultSchema,
    CreateMessageResultSchema,
    CreateMessageResultWithToolsSchema,
    ElicitResultSchema,
    ListRootsResultSchema,
  ]);
  ServerRequestSchema = union([
    PingRequestSchema,
    CreateMessageRequestSchema,
    ElicitRequestSchema,
    ListRootsRequestSchema,
  ]);
  ServerNotificationSchema = union([
    CancelledNotificationSchema,
    ProgressNotificationSchema,
    LoggingMessageNotificationSchema,
    ResourceUpdatedNotificationSchema,
    ResourceListChangedNotificationSchema,
    ToolListChangedNotificationSchema,
    PromptListChangedNotificationSchema,
    SubscriptionsAcknowledgedNotificationSchema,
    ElicitationCompleteNotificationSchema,
  ]);
  ServerResultSchema = union([
    EmptyResultSchema,
    InitializeResultSchema,
    DiscoverResultSchema,
    CompleteResultSchema,
    GetPromptResultSchema,
    ListPromptsResultSchema,
    ListResourcesResultSchema,
    ListResourceTemplatesResultSchema,
    ReadResourceResultSchema,
    CallToolResultSchema,
    ListToolsResultSchema,
    SubscriptionsListenResultSchema,
  ]);
  SafeUrlSchema = urlSchema()
    .superRefine((val, ctx) => {
      if (!URL.canParse(val)) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          message: "URL must be parseable",
          fatal: true,
        });
        return INVALID;
      }
    })
    .refine(
      (url) => {
        let u = new URL(url);
        return u.protocol !== "javascript:" && u.protocol !== "data:" && u.protocol !== "vbscript:";
      },
      {
        message: "URL cannot use javascript:, data:, or vbscript: scheme",
      },
    );
  OAuthProtectedResourceMetadataSchema = looseObject({
    resource: stringSchema().url(),
    authorization_servers: array(SafeUrlSchema).optional(),
    jwks_uri: stringSchema().url().optional(),
    scopes_supported: array(stringSchema()).optional(),
    bearer_methods_supported: array(stringSchema()).optional(),
    resource_signing_alg_values_supported: array(stringSchema()).optional(),
    resource_name: stringSchema().optional(),
    resource_documentation: stringSchema().optional(),
    resource_policy_uri: stringSchema().url().optional(),
    resource_tos_uri: stringSchema().url().optional(),
    tls_client_certificate_bound_access_tokens: booleanSchema().optional(),
    authorization_details_types_supported: array(stringSchema()).optional(),
    dpop_signing_alg_values_supported: array(stringSchema()).optional(),
    dpop_bound_access_tokens_required: booleanSchema().optional(),
  });
  OAuthMetadataSchema = looseObject({
    issuer: stringSchema(),
    authorization_endpoint: SafeUrlSchema,
    token_endpoint: SafeUrlSchema,
    registration_endpoint: SafeUrlSchema.optional(),
    scopes_supported: array(stringSchema()).optional(),
    response_types_supported: array(stringSchema()),
    response_modes_supported: array(stringSchema()).optional(),
    grant_types_supported: array(stringSchema()).optional(),
    token_endpoint_auth_methods_supported: array(stringSchema()).optional(),
    token_endpoint_auth_signing_alg_values_supported: array(stringSchema()).optional(),
    service_documentation: SafeUrlSchema.optional(),
    revocation_endpoint: SafeUrlSchema.optional(),
    revocation_endpoint_auth_methods_supported: array(stringSchema()).optional(),
    revocation_endpoint_auth_signing_alg_values_supported: array(stringSchema()).optional(),
    introspection_endpoint: stringSchema().optional(),
    introspection_endpoint_auth_methods_supported: array(stringSchema()).optional(),
    introspection_endpoint_auth_signing_alg_values_supported: array(stringSchema()).optional(),
    code_challenge_methods_supported: array(stringSchema()).optional(),
    client_id_metadata_document_supported: booleanSchema().optional(),
    authorization_response_iss_parameter_supported: booleanSchema().optional().catch(undefined),
  });
  OpenIdProviderMetadataSchema = looseObject({
    issuer: stringSchema(),
    authorization_endpoint: SafeUrlSchema,
    token_endpoint: SafeUrlSchema,
    userinfo_endpoint: SafeUrlSchema.optional(),
    jwks_uri: SafeUrlSchema,
    registration_endpoint: SafeUrlSchema.optional(),
    scopes_supported: array(stringSchema()).optional(),
    response_types_supported: array(stringSchema()),
    response_modes_supported: array(stringSchema()).optional(),
    grant_types_supported: array(stringSchema()).optional(),
    acr_values_supported: array(stringSchema()).optional(),
    subject_types_supported: array(stringSchema()),
    id_token_signing_alg_values_supported: array(stringSchema()),
    id_token_encryption_alg_values_supported: array(stringSchema()).optional(),
    id_token_encryption_enc_values_supported: array(stringSchema()).optional(),
    userinfo_signing_alg_values_supported: array(stringSchema()).optional(),
    userinfo_encryption_alg_values_supported: array(stringSchema()).optional(),
    userinfo_encryption_enc_values_supported: array(stringSchema()).optional(),
    request_object_signing_alg_values_supported: array(stringSchema()).optional(),
    request_object_encryption_alg_values_supported: array(stringSchema()).optional(),
    request_object_encryption_enc_values_supported: array(stringSchema()).optional(),
    token_endpoint_auth_methods_supported: array(stringSchema()).optional(),
    token_endpoint_auth_signing_alg_values_supported: array(stringSchema()).optional(),
    display_values_supported: array(stringSchema()).optional(),
    claim_types_supported: array(stringSchema()).optional(),
    claims_supported: array(stringSchema()).optional(),
    service_documentation: stringSchema().optional(),
    claims_locales_supported: array(stringSchema()).optional(),
    ui_locales_supported: array(stringSchema()).optional(),
    claims_parameter_supported: booleanSchema().optional(),
    request_parameter_supported: booleanSchema().optional(),
    request_uri_parameter_supported: booleanSchema().optional(),
    require_request_uri_registration: booleanSchema().optional(),
    op_policy_uri: SafeUrlSchema.optional(),
    op_tos_uri: SafeUrlSchema.optional(),
    client_id_metadata_document_supported: booleanSchema().optional(),
    authorization_response_iss_parameter_supported: booleanSchema().optional().catch(undefined),
  });
  OpenIdProviderDiscoveryMetadataSchema = objectSchema({
    ...OpenIdProviderMetadataSchema.shape,
    ...OAuthMetadataSchema.pick({
      code_challenge_methods_supported: true,
    }).shape,
  });
  OAuthTokensSchema = objectSchema({
    access_token: stringSchema(),
    id_token: stringSchema().optional(),
    token_type: stringSchema(),
    expires_in: coerceNumber().optional(),
    scope: stringSchema().optional(),
    refresh_token: stringSchema().optional(),
  }).strip();
  IdJagTokenExchangeResponseSchema = objectSchema({
    issued_token_type: literal("urn:ietf:params:oauth:token-type:id-jag"),
    access_token: stringSchema(),
    token_type: stringSchema().optional(),
    expires_in: numberSchema().optional(),
    scope: stringSchema().optional(),
  }).strip();
  OAuthErrorResponseSchema = objectSchema({
    error: stringSchema(),
    error_description: stringSchema().optional(),
    error_uri: stringSchema().optional(),
  });
  OptionalSafeUrlSchema = SafeUrlSchema.optional().or(
    literal("").transform(() => {
      return;
    }),
  );
  OAuthClientMetadataSchema = objectSchema({
    redirect_uris: array(SafeUrlSchema),
    token_endpoint_auth_method: stringSchema().optional(),
    grant_types: array(stringSchema()).optional(),
    response_types: array(stringSchema()).optional(),
    application_type: stringSchema().optional(),
    client_name: stringSchema().optional(),
    client_uri: SafeUrlSchema.optional(),
    logo_uri: OptionalSafeUrlSchema,
    scope: stringSchema().optional(),
    contacts: array(stringSchema()).optional(),
    tos_uri: OptionalSafeUrlSchema,
    policy_uri: stringSchema().optional(),
    jwks_uri: SafeUrlSchema.optional(),
    jwks: anySchema().optional(),
    software_id: stringSchema().optional(),
    software_version: stringSchema().optional(),
    software_statement: stringSchema().optional(),
  }).strip();
  OAuthClientInformationSchema = objectSchema({
    client_id: stringSchema(),
    client_secret: stringSchema().optional(),
    client_id_issued_at: numberSchema().optional(),
    client_secret_expires_at: numberSchema().optional(),
  }).strip();
  OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
  OAuthClientRegistrationErrorSchema = objectSchema({
    error: stringSchema(),
    error_description: stringSchema().optional(),
  }).strip();
  OAuthTokenRevocationRequestSchema = objectSchema({
    token: stringSchema(),
    token_type_hint: stringSchema().optional(),
  }).strip();
});
//@ chunk-n1aavqzh.js:2611-2890 esm-fingerprint
var TokenExchangeResponseSchema_2; // deferred: uses DoctorLazy (../../../../src/cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var JwtBearerResponseSchema_2;
deferInit("chunk-n1aavqzh.js:2611", () => {
  TokenExchangeResponseSchema_2 = DoctorLazy(() =>
    objectSchema({
      access_token: stringSchema().optional(),
      issued_token_type: stringSchema().optional(),
      expires_in: coerceNumber().optional(),
      scope: stringSchema().optional(),
    }),
  );
  JwtBearerResponseSchema_2 = DoctorLazy(() =>
    objectSchema({
      access_token: stringSchema().min(1),
      token_type: stringSchema().default("Bearer"),
      expires_in: coerceNumber().optional(),
      scope: stringSchema().optional(),
      refresh_token: stringSchema().optional(),
    }),
  );
});
//@ chunk-1kaj6e83.js:2564-2843 esm-fingerprint
var TokenExchangeResponseSchema; // deferred: uses DoctorLazy (../../../../src/cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var JwtBearerResponseSchema;
deferInit("chunk-1kaj6e83.js:2564", () => {
  TokenExchangeResponseSchema = DoctorLazy(() =>
    objectSchema({
      access_token: stringSchema().optional(),
      issued_token_type: stringSchema().optional(),
      expires_in: coerceNumber().optional(),
      scope: stringSchema().optional(),
    }),
  );
  JwtBearerResponseSchema = DoctorLazy(() =>
    objectSchema({
      access_token: stringSchema().min(1),
      token_type: stringSchema().default("Bearer"),
      expires_in: coerceNumber().optional(),
      scope: stringSchema().optional(),
      refresh_token: stringSchema().optional(),
    }),
  );
});
export {
  ListToolsResultSchema,
  JSONRPCMessageSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListPromptsResultSchema,
  ElicitRequestURLParamsSchema,
  ImplementationSchema,
  ServerCapabilitiesSchema,
  ToolSchema,
  PromptSchema,
  ResourceSchema,
  ResourceTemplateSchema,
  CompatibilityCallToolResultSchema,
  CLIENT_CAPABILITIES_META_KEY,
  ResultSchema,
  ElicitRequestParamsSchema,
  InitializeResultSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
  JwtBearerResponseSchema,
  OAuthErrorResponseSchema,
  OAuthProtectedResourceMetadataSchema,
  LATEST_PROTOCOL_VERSION,
  OAuthMetadataSchema,
  OpenIdProviderDiscoveryMetadataSchema,
  OAuthTokensSchema,
  OAuthClientInformationFullSchema,
  SERVER_INFO_META_KEY,
  DiscoverResultSchema,
  SUBSCRIPTION_ID_META_KEY,
  ListChangedOptionsBaseSchema,
  PROTOCOL_VERSION_META_KEY,
  TokenExchangeResponseSchema_2,
  TokenExchangeResponseSchema,
  JwtBearerResponseSchema_2,
  PARSE_ERROR,
  RelatedTaskMetadataSchema,
  RELATED_TASK_META_KEY,
  CLIENT_INFO_META_KEY,
  LOG_LEVEL_META_KEY,
  AnnotationsSchema,
  AudioContentSchema,
  BaseMetadataSchema,
  BaseRequestParamsSchema,
  BlobResourceContentsSchema,
  BooleanSchemaSchema,
  CallToolRequestParamsSchema,
  CallToolRequestSchema,
  CallToolResultSchema,
  CancelTaskRequestSchema,
  CancelTaskResultSchema,
  CancelledNotificationParamsSchema,
  CancelledNotificationSchema,
  ClientCapabilitiesSchema,
  ClientNotificationSchema,
  ClientRequestSchema,
  ClientResultSchema,
  ClientTasksCapabilitySchema,
  CompleteRequestParamsSchema,
  CompleteRequestSchema,
  CompleteResultSchema,
  ContentBlockSchema,
  CreateMessageRequestParamsSchema,
  CreateMessageRequestSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  CreateTaskResultSchema,
  CursorSchema,
  DiscoverRequestSchema,
  ElicitRequestFormParamsSchema,
  ElicitRequestSchema,
  ElicitResultSchema,
  ElicitationCompleteNotificationParamsSchema,
  ElicitationCompleteNotificationSchema,
  EmbeddedResourceSchema,
  EmptyResultSchema,
  EnumSchemaSchema,
  GetPromptRequestParamsSchema,
  GetPromptRequestSchema,
  GetPromptResultSchema,
  GetTaskPayloadRequestSchema,
  GetTaskPayloadResultSchema,
  GetTaskRequestSchema,
  GetTaskResultSchema,
  IconSchema,
  IconsSchema,
  ImageContentSchema,
  InitializeRequestParamsSchema,
  InitializeRequestSchema,
  InitializedNotificationSchema,
  JSONArraySchema,
  JSONObjectSchema,
  JSONRPCErrorResponseSchema,
  JSONRPCNotificationSchema,
  JSONRPCRequestSchema,
  JSONRPCResponseSchema,
  JSONRPCResultResponseSchema,
  JSONValueSchema,
  LegacyTitledEnumSchemaSchema,
  ListPromptsRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListRootsRequestSchema,
  ListRootsResultSchema,
  ListTasksRequestSchema,
  ListTasksResultSchema,
  ListToolsRequestSchema,
  LoggingLevelSchema,
  LoggingMessageNotificationParamsSchema,
  LoggingMessageNotificationSchema,
  ModelHintSchema,
  ModelPreferencesSchema,
  MultiSelectEnumSchemaSchema,
  NotificationSchema,
  NotificationsParamsSchema,
  NumberSchemaSchema,
  PaginatedRequestParamsSchema,
  PaginatedRequestSchema,
  PaginatedResultSchema,
  PingRequestSchema,
  PrimitiveSchemaDefinitionSchema,
  ProgressNotificationParamsSchema,
  ProgressNotificationSchema,
  ProgressSchema,
  ProgressTokenSchema,
  PromptArgumentSchema,
  PromptListChangedNotificationSchema,
  PromptMessageSchema,
  PromptReferenceSchema,
  ReadResourceRequestParamsSchema,
  ReadResourceRequestSchema,
  ReadResourceResultSchema,
  RequestIdSchema,
  RequestMetaSchema,
  RequestSchema,
  ResourceContentsSchema,
  ResourceLinkSchema,
  ResourceListChangedNotificationSchema,
  ResourceRequestParamsSchema,
  ResourceTemplateReferenceSchema,
  ResourceUpdatedNotificationParamsSchema,
  ResourceUpdatedNotificationSchema,
  ResultMetaObjectSchema,
  RoleSchema,
  RootSchema,
  RootsListChangedNotificationSchema,
  SamplingContentSchema,
  SamplingMessageContentBlockSchema,
  SamplingMessageSchema,
  ServerNotificationSchema,
  ServerRequestSchema,
  ServerResultSchema,
  ServerTasksCapabilitySchema,
  SetLevelRequestParamsSchema,
  SetLevelRequestSchema,
  SingleSelectEnumSchemaSchema,
  StringSchemaSchema,
  SubscribeRequestParamsSchema,
  SubscribeRequestSchema,
  SubscriptionFilterSchema,
  SubscriptionsAcknowledgedNotificationParamsSchema,
  SubscriptionsAcknowledgedNotificationSchema,
  SubscriptionsListenRequestParamsSchema,
  SubscriptionsListenRequestSchema,
  SubscriptionsListenResultMetaSchema,
  SubscriptionsListenResultSchema,
  TaskAugmentedRequestParamsSchema,
  TaskCreationParamsSchema,
  TaskMetadataSchema,
  TaskSchema,
  TaskStatusNotificationParamsSchema,
  TaskStatusNotificationSchema,
  TaskStatusSchema,
  TextContentSchema,
  TextResourceContentsSchema,
  TitledMultiSelectEnumSchemaSchema,
  TitledSingleSelectEnumSchemaSchema,
  ToolAnnotationsSchema,
  ToolChoiceSchema,
  ToolExecutionSchema,
  ToolListChangedNotificationSchema,
  ToolResultContentSchema,
  ToolUseContentSchema,
  UnsubscribeRequestParamsSchema,
  UnsubscribeRequestSchema,
  UntitledMultiSelectEnumSchemaSchema,
  UntitledSingleSelectEnumSchemaSchema,
  IdJagTokenExchangeResponseSchema,
  OAuthClientInformationSchema,
  OAuthClientMetadataSchema,
  OAuthClientRegistrationErrorSchema,
  OAuthTokenRevocationRequestSchema,
  OpenIdProviderMetadataSchema,
};
