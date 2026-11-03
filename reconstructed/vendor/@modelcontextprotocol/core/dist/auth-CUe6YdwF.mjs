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
  string,
  E,
  M,
  zg,
  record,
  array,
  u,
  looseObject,
  literal,
  unknown,
  _enum,
  intersection,
  preprocess,
  optional,
  discriminatedUnion,
  A8e,
  qne,
} from "../../../zod/v4/classic/schemas.js";
import { parseToolOutputSchema } from "../../../../src/services/mcp/schemaParse.js";
import { ZodIssueCode, F1e } from "../../../zod/v4/classic/compat.js";
import { bY } from "../../../zod/v4/core/core.js";
import { DoctorLazy } from "../../../../src/cli/handlers/util.js";

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
var JSONValueSchema = lazy(() =>
  union([string(), E(), M(), zg(), record(string(), JSONValueSchema), array(JSONValueSchema)]),
);
var JSONObjectSchema = record(string(), JSONValueSchema);
var Ta = array(JSONValueSchema);
var ProgressTokenSchema = union([string(), E().int()]);
var CursorSchema = string();
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
var ResultMetaObjectSchema = looseObject({
  get [SERVER_INFO_META_KEY]() {
    return ImplementationSchema.optional().catch(undefined);
  },
});
var ResultSchema = looseObject({
  _meta: ResultMetaObjectSchema.optional(),
});
var RequestIdSchema = union([string(), E().int()]);
var JSONRPCRequestSchema = u({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape,
}).strict();
var JSONRPCNotificationSchema = u({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape,
}).strict();
var JSONRPCResultResponseSchema = u({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema,
}).strict();
var JSONRPCErrorResponseSchema = u({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: u({
    code: E().int(),
    message: string(),
    data: unknown().optional(),
  }),
}).strict();
var fZe = union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema,
]);
var Ca = union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
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
  JSONObjectSchema,
);
var ElicitationCapabilitySchema = preprocess(
  (value) => {
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
      return {
        form: {},
      };
    return value;
  },
  intersection(
    u({
      form: FormElicitationCapabilitySchema.optional(),
      url: JSONObjectSchema.optional(),
    }),
    JSONObjectSchema.optional(),
  ),
);
var ClientTasksCapabilitySchema = looseObject({
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
var ServerTasksCapabilitySchema = looseObject({
  list: JSONObjectSchema.optional(),
  cancel: JSONObjectSchema.optional(),
  requests: looseObject({
    tools: looseObject({
      call: JSONObjectSchema.optional(),
    }).optional(),
  }).optional(),
});
var ClientCapabilitiesSchema = u({
  experimental: record(string(), JSONObjectSchema).optional(),
  sampling: u({
    context: JSONObjectSchema.optional(),
    tools: JSONObjectSchema.optional(),
  }).optional(),
  elicitation: ElicitationCapabilitySchema.optional(),
  roots: u({
    listChanged: M().optional(),
  }).optional(),
  tasks: ClientTasksCapabilitySchema.optional(),
  extensions: record(string(), JSONObjectSchema).optional(),
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
var ServerCapabilitiesSchema = u({
  experimental: record(string(), JSONObjectSchema).optional(),
  logging: JSONObjectSchema.optional(),
  completions: JSONObjectSchema.optional(),
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
  extensions: record(string(), JSONObjectSchema).optional(),
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
var DiscoverRequestSchema = RequestSchema.extend({
  method: literal("server/discover"),
  params: BaseRequestParamsSchema.optional(),
});
var DiscoverResultSchema = ResultSchema.extend({
  supportedVersions: array(string()),
  capabilities: ServerCapabilitiesSchema,
  instructions: string().optional(),
});
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
var SubscriptionFilterSchema = u({
  toolsListChanged: M().optional(),
  promptsListChanged: M().optional(),
  resourcesListChanged: M().optional(),
  resourceSubscriptions: array(string()).optional(),
});
var SubscriptionsListenRequestParamsSchema = BaseRequestParamsSchema.extend({
  notifications: SubscriptionFilterSchema,
});
var SubscriptionsListenRequestSchema = RequestSchema.extend({
  method: literal("subscriptions/listen"),
  params: SubscriptionsListenRequestParamsSchema,
});
var SubscriptionsAcknowledgedNotificationParamsSchema = NotificationsParamsSchema.extend({
  notifications: SubscriptionFilterSchema,
});
var SubscriptionsAcknowledgedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/subscriptions/acknowledged"),
  params: SubscriptionsAcknowledgedNotificationParamsSchema,
});
var SubscriptionsListenResultMetaSchema = ResultMetaObjectSchema.extend({
  [SUBSCRIPTION_ID_META_KEY]: RequestIdSchema,
});
var SubscriptionsListenResultSchema = ResultSchema.extend({
  _meta: SubscriptionsListenResultMetaSchema,
});
var ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
  uri: string(),
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema,
});
var PromptArgumentSchema = u({
  name: string(),
  description: optional(string()),
  required: optional(M()),
});
var PromptSchema = u({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  description: optional(string()),
  arguments: optional(array(PromptArgumentSchema)),
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
var ToolUseContentSchema = u({
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
    properties: record(string(), JSONValueSchema).optional(),
    required: array(string()).optional(),
  }).catchall(unknown()),
  outputSchema: looseObject({
    $schema: string().optional(),
  }).optional(),
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
  structuredContent: unknown().optional(),
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
  content: array(ContentBlockSchema),
  structuredContent: unknown().optional(),
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
  ToolUseContentSchema,
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
  metadata: JSONObjectSchema.optional(),
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
  }).catchall(unknown()),
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
var TaskCreationParamsSchema = looseObject({
  ttl: E().optional(),
  pollInterval: E().optional(),
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
var Fa = union([
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
var Ha = union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
]);
var Ja = union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
]);
var Ga = union([PingRequestSchema, CreateMessageRequestSchema, ElicitRequestSchema, ListRootsRequestSchema]);
var Ba = union([
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
var Wa = union([
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
var SafeUrlSchema = A8e()
  .superRefine((val, ctx) => {
    if (!URL.canParse(val)) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: "URL must be parseable",
        fatal: true,
      });
      return bY;
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
var OAuthProtectedResourceMetadataSchema = looseObject({
  resource: string().url(),
  authorization_servers: array(SafeUrlSchema).optional(),
  jwks_uri: string().url().optional(),
  scopes_supported: array(string()).optional(),
  bearer_methods_supported: array(string()).optional(),
  resource_signing_alg_values_supported: array(string()).optional(),
  resource_name: string().optional(),
  resource_documentation: string().optional(),
  resource_policy_uri: string().url().optional(),
  resource_tos_uri: string().url().optional(),
  tls_client_certificate_bound_access_tokens: M().optional(),
  authorization_details_types_supported: array(string()).optional(),
  dpop_signing_alg_values_supported: array(string()).optional(),
  dpop_bound_access_tokens_required: M().optional(),
});
var OAuthMetadataSchema = looseObject({
  issuer: string(),
  authorization_endpoint: SafeUrlSchema,
  token_endpoint: SafeUrlSchema,
  registration_endpoint: SafeUrlSchema.optional(),
  scopes_supported: array(string()).optional(),
  response_types_supported: array(string()),
  response_modes_supported: array(string()).optional(),
  grant_types_supported: array(string()).optional(),
  token_endpoint_auth_methods_supported: array(string()).optional(),
  token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  service_documentation: SafeUrlSchema.optional(),
  revocation_endpoint: SafeUrlSchema.optional(),
  revocation_endpoint_auth_methods_supported: array(string()).optional(),
  revocation_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  introspection_endpoint: string().optional(),
  introspection_endpoint_auth_methods_supported: array(string()).optional(),
  introspection_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  code_challenge_methods_supported: array(string()).optional(),
  client_id_metadata_document_supported: M().optional(),
  authorization_response_iss_parameter_supported: M().optional().catch(undefined),
});
var OpenIdProviderMetadataSchema = looseObject({
  issuer: string(),
  authorization_endpoint: SafeUrlSchema,
  token_endpoint: SafeUrlSchema,
  userinfo_endpoint: SafeUrlSchema.optional(),
  jwks_uri: SafeUrlSchema,
  registration_endpoint: SafeUrlSchema.optional(),
  scopes_supported: array(string()).optional(),
  response_types_supported: array(string()),
  response_modes_supported: array(string()).optional(),
  grant_types_supported: array(string()).optional(),
  acr_values_supported: array(string()).optional(),
  subject_types_supported: array(string()),
  id_token_signing_alg_values_supported: array(string()),
  id_token_encryption_alg_values_supported: array(string()).optional(),
  id_token_encryption_enc_values_supported: array(string()).optional(),
  userinfo_signing_alg_values_supported: array(string()).optional(),
  userinfo_encryption_alg_values_supported: array(string()).optional(),
  userinfo_encryption_enc_values_supported: array(string()).optional(),
  request_object_signing_alg_values_supported: array(string()).optional(),
  request_object_encryption_alg_values_supported: array(string()).optional(),
  request_object_encryption_enc_values_supported: array(string()).optional(),
  token_endpoint_auth_methods_supported: array(string()).optional(),
  token_endpoint_auth_signing_alg_values_supported: array(string()).optional(),
  display_values_supported: array(string()).optional(),
  claim_types_supported: array(string()).optional(),
  claims_supported: array(string()).optional(),
  service_documentation: string().optional(),
  claims_locales_supported: array(string()).optional(),
  ui_locales_supported: array(string()).optional(),
  claims_parameter_supported: M().optional(),
  request_parameter_supported: M().optional(),
  request_uri_parameter_supported: M().optional(),
  require_request_uri_registration: M().optional(),
  op_policy_uri: SafeUrlSchema.optional(),
  op_tos_uri: SafeUrlSchema.optional(),
  client_id_metadata_document_supported: M().optional(),
  authorization_response_iss_parameter_supported: M().optional().catch(undefined),
});
var OpenIdProviderDiscoveryMetadataSchema = u({
  ...OpenIdProviderMetadataSchema.shape,
  ...OAuthMetadataSchema.pick({
    code_challenge_methods_supported: true,
  }).shape,
});
var OAuthTokensSchema = u({
  access_token: string(),
  id_token: string().optional(),
  token_type: string(),
  expires_in: F1e().optional(),
  scope: string().optional(),
  refresh_token: string().optional(),
}).strip();
var IdJagTokenExchangeResponseSchema = u({
  issued_token_type: literal("urn:ietf:params:oauth:token-type:id-jag"),
  access_token: string(),
  token_type: string().optional(),
  expires_in: E().optional(),
  scope: string().optional(),
}).strip();
var OAuthErrorResponseSchema = u({
  error: string(),
  error_description: string().optional(),
  error_uri: string().optional(),
});
var OptionalSafeUrlSchema = SafeUrlSchema.optional().or(
  literal("").transform(() => {
    return;
  }),
);
var OAuthClientMetadataSchema = u({
  redirect_uris: array(SafeUrlSchema),
  token_endpoint_auth_method: string().optional(),
  grant_types: array(string()).optional(),
  response_types: array(string()).optional(),
  application_type: string().optional(),
  client_name: string().optional(),
  client_uri: SafeUrlSchema.optional(),
  logo_uri: OptionalSafeUrlSchema,
  scope: string().optional(),
  contacts: array(string()).optional(),
  tos_uri: OptionalSafeUrlSchema,
  policy_uri: string().optional(),
  jwks_uri: SafeUrlSchema.optional(),
  jwks: qne().optional(),
  software_id: string().optional(),
  software_version: string().optional(),
  software_statement: string().optional(),
}).strip();
var OAuthClientInformationSchema = u({
  client_id: string(),
  client_secret: string().optional(),
  client_id_issued_at: E().optional(),
  client_secret_expires_at: E().optional(),
}).strip();
var OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
var OAuthClientRegistrationErrorSchema = u({
  error: string(),
  error_description: string().optional(),
}).strip();
var OAuthTokenRevocationRequestSchema = u({
  token: string(),
  token_type_hint: string().optional(),
}).strip();
//@ chunk-1kaj6e83.js:2564-2843 esm-fingerprint
var TokenExchangeResponseSchema = DoctorLazy(() =>
  u({
    access_token: string().optional(),
    issued_token_type: string().optional(),
    expires_in: F1e().optional(),
    scope: string().optional(),
  }),
);
var JwtBearerResponseSchema = DoctorLazy(() =>
  u({
    access_token: string().min(1),
    token_type: string().default("Bearer"),
    expires_in: F1e().optional(),
    scope: string().optional(),
    refresh_token: string().optional(),
  }),
);
//@ chunk-n1aavqzh.js:2611-2890 esm-fingerprint
var TokenExchangeResponseSchema_2 = DoctorLazy(() =>
  u({
    access_token: string().optional(),
    issued_token_type: string().optional(),
    expires_in: F1e().optional(),
    scope: string().optional(),
  }),
);
var JwtBearerResponseSchema_2 = DoctorLazy(() =>
  u({
    access_token: string().min(1),
    token_type: string().default("Bearer"),
    expires_in: F1e().optional(),
    scope: string().optional(),
    refresh_token: string().optional(),
  }),
);
export {
  ListToolsResultSchema,
  fZe,
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
  TokenExchangeResponseSchema,
  TokenExchangeResponseSchema_2,
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
  Ha,
  Fa,
  Ja,
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
  Ta,
  JSONObjectSchema,
  JSONRPCErrorResponseSchema,
  JSONRPCNotificationSchema,
  JSONRPCRequestSchema,
  Ca,
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
  Ba,
  Ga,
  Wa,
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
