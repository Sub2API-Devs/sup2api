/**
 * @modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/core@2.0.0
 * pieces: chunk-ft6a2kja.js (1), chunk-ghww1f0b.js (1), chunk-qq5knpkd.js (2)
 * attribution: esm-fingerprint 2, esm-layout 2
 */
import { schemaProxyHandlers } from "../../../@babel/runtime/helpers/esm/importDeferProxy.js";
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
import {
  RELATED_TASK_META_KEY,
  SERVER_INFO_META_KEY,
  JSONRPC_VERSION,
  SUBSCRIPTION_ID_META_KEY,
} from "./schemas-lGLjBX8n.cjs";
import { parseToolOutputSchema } from "../../../../src/services/mcp/schemaParse.js";
import { ZodIssueCode, coerceNumber } from "../../../zod/v4/classic/compat.js";
import { INVALID } from "../../../zod/v4/core/core.js";
import { DoctorLazy } from "../../../../src/cli/handlers/util.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-qq5knpkd.js:2109-2168 esm-layout
function deferSchema(build) {
  return new Proxy(
    {
      build,
      schema: undefined,
    },
    schemaProxyHandlers,
  );
}
//@ chunk-qq5knpkd.js:2168-19636 esm-layout
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
var ResourceRequestParamsSchema_default;
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
deferInit("chunk-qq5knpkd.js:2168", () => {
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
  JSONObjectSchema = deferSchema(() => record(stringSchema(), JSONValueSchema));
  JSONArraySchema = deferSchema(() => array(JSONValueSchema));
  ProgressTokenSchema = deferSchema(() => union([stringSchema(), numberSchema().int()]));
  CursorSchema = deferSchema(() => stringSchema());
  TaskMetadataSchema = deferSchema(() =>
    objectSchema({
      ttl: numberSchema().optional(),
    }),
  );
  RelatedTaskMetadataSchema = deferSchema(() =>
    objectSchema({
      taskId: stringSchema(),
    }),
  );
  RequestMetaSchema = deferSchema(() =>
    looseObject({
      progressToken: ProgressTokenSchema.optional(),
      [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional(),
    }),
  );
  BaseRequestParamsSchema = deferSchema(() =>
    objectSchema({
      _meta: RequestMetaSchema.optional(),
    }),
  );
  TaskAugmentedRequestParamsSchema = deferSchema(() =>
    BaseRequestParamsSchema.extend({
      task: TaskMetadataSchema.optional(),
    }),
  );
  RequestSchema = deferSchema(() =>
    objectSchema({
      method: stringSchema(),
      params: BaseRequestParamsSchema.loose().optional(),
    }),
  );
  NotificationsParamsSchema = deferSchema(() =>
    objectSchema({
      _meta: RequestMetaSchema.optional(),
    }),
  );
  NotificationSchema = deferSchema(() =>
    objectSchema({
      method: stringSchema(),
      params: NotificationsParamsSchema.loose().optional(),
    }),
  );
  ResultMetaObjectSchema = deferSchema(() =>
    looseObject({
      get [SERVER_INFO_META_KEY]() {
        return ImplementationSchema.optional().catch(undefined);
      },
    }),
  );
  ResultSchema = deferSchema(() =>
    looseObject({
      _meta: ResultMetaObjectSchema.optional(),
    }),
  );
  RequestIdSchema = deferSchema(() => union([stringSchema(), numberSchema().int()]));
  JSONRPCRequestSchema = deferSchema(() =>
    objectSchema({
      jsonrpc: literal(JSONRPC_VERSION),
      id: RequestIdSchema,
      ...RequestSchema.shape,
    }).strict(),
  );
  JSONRPCNotificationSchema = deferSchema(() =>
    objectSchema({
      jsonrpc: literal(JSONRPC_VERSION),
      ...NotificationSchema.shape,
    }).strict(),
  );
  JSONRPCResultResponseSchema = deferSchema(() =>
    objectSchema({
      jsonrpc: literal(JSONRPC_VERSION),
      id: RequestIdSchema,
      result: ResultSchema,
    }).strict(),
  );
  JSONRPCErrorResponseSchema = deferSchema(() =>
    objectSchema({
      jsonrpc: literal(JSONRPC_VERSION),
      id: RequestIdSchema.optional(),
      error: objectSchema({
        code: numberSchema().int(),
        message: stringSchema(),
        data: unknown().optional(),
      }),
    }).strict(),
  );
  JSONRPCMessageSchema = deferSchema(() =>
    union([
      JSONRPCRequestSchema,
      JSONRPCNotificationSchema,
      JSONRPCResultResponseSchema,
      JSONRPCErrorResponseSchema,
    ]),
  );
  JSONRPCResponseSchema = deferSchema(() => union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]));
  EmptyResultSchema = deferSchema(() => ResultSchema.strict());
  CancelledNotificationParamsSchema = deferSchema(() =>
    NotificationsParamsSchema.extend({
      requestId: RequestIdSchema.optional(),
      reason: stringSchema().optional(),
    }),
  );
  CancelledNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/cancelled"),
      params: CancelledNotificationParamsSchema,
    }),
  );
  IconSchema = deferSchema(() =>
    objectSchema({
      src: stringSchema(),
      mimeType: stringSchema().optional(),
      sizes: array(stringSchema()).optional(),
      theme: _enum(["light", "dark"]).optional(),
    }),
  );
  IconsSchema = deferSchema(() =>
    objectSchema({
      icons: array(IconSchema).optional(),
    }),
  );
  BaseMetadataSchema = deferSchema(() =>
    objectSchema({
      name: stringSchema(),
      title: stringSchema().optional(),
    }),
  );
  ImplementationSchema = deferSchema(() =>
    BaseMetadataSchema.extend({
      ...BaseMetadataSchema.shape,
      ...IconsSchema.shape,
      version: stringSchema(),
      websiteUrl: stringSchema().optional(),
      description: stringSchema().optional(),
    }),
  );
  FormElicitationCapabilitySchema = deferSchema(() =>
    intersection(
      objectSchema({
        applyDefaults: booleanSchema().optional(),
      }),
      JSONObjectSchema,
    ),
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
  ClientTasksCapabilitySchema = deferSchema(() =>
    looseObject({
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
    }),
  );
  ServerTasksCapabilitySchema = deferSchema(() =>
    looseObject({
      list: JSONObjectSchema.optional(),
      cancel: JSONObjectSchema.optional(),
      requests: looseObject({
        tools: looseObject({
          call: JSONObjectSchema.optional(),
        }).optional(),
      }).optional(),
    }),
  );
  ClientCapabilitiesSchema = deferSchema(() =>
    objectSchema({
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
    }),
  );
  InitializeRequestParamsSchema = deferSchema(() =>
    BaseRequestParamsSchema.extend({
      protocolVersion: stringSchema(),
      capabilities: ClientCapabilitiesSchema,
      clientInfo: ImplementationSchema,
    }),
  );
  InitializeRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("initialize"),
      params: InitializeRequestParamsSchema,
    }),
  );
  ServerCapabilitiesSchema = deferSchema(() =>
    objectSchema({
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
    }),
  );
  InitializeResultSchema = deferSchema(() =>
    ResultSchema.extend({
      protocolVersion: stringSchema(),
      capabilities: ServerCapabilitiesSchema,
      serverInfo: ImplementationSchema,
      instructions: stringSchema().optional(),
    }),
  );
  InitializedNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/initialized"),
      params: NotificationsParamsSchema.optional(),
    }),
  );
  DiscoverRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("server/discover"),
      params: BaseRequestParamsSchema.optional(),
    }),
  );
  DiscoverResultSchema = deferSchema(() =>
    ResultSchema.extend({
      supportedVersions: array(stringSchema()),
      capabilities: ServerCapabilitiesSchema,
      instructions: stringSchema().optional(),
    }),
  );
  PingRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("ping"),
      params: BaseRequestParamsSchema.optional(),
    }),
  );
  ProgressSchema = deferSchema(() =>
    objectSchema({
      progress: numberSchema(),
      total: optional(numberSchema()),
      message: optional(stringSchema()),
    }),
  );
  ProgressNotificationParamsSchema = deferSchema(() =>
    objectSchema({
      ...NotificationsParamsSchema.shape,
      ...ProgressSchema.shape,
      progressToken: ProgressTokenSchema,
    }),
  );
  ProgressNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/progress"),
      params: ProgressNotificationParamsSchema,
    }),
  );
  PaginatedRequestParamsSchema = deferSchema(() =>
    BaseRequestParamsSchema.extend({
      cursor: CursorSchema.optional(),
    }),
  );
  PaginatedRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      params: PaginatedRequestParamsSchema.optional(),
    }),
  );
  PaginatedResultSchema = deferSchema(() =>
    ResultSchema.extend({
      nextCursor: CursorSchema.optional(),
    }),
  );
  ResourceContentsSchema = deferSchema(() =>
    objectSchema({
      uri: stringSchema(),
      mimeType: optional(stringSchema()),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  TextResourceContentsSchema = deferSchema(() =>
    ResourceContentsSchema.extend({
      text: stringSchema(),
    }),
  );
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
  BlobResourceContentsSchema = deferSchema(() =>
    ResourceContentsSchema.extend({
      blob: Base64Schema,
    }),
  );
  RoleSchema = deferSchema(() => _enum(["user", "assistant"]));
  AnnotationsSchema = deferSchema(() =>
    objectSchema({
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
    }),
  );
  ResourceSchema = deferSchema(() =>
    objectSchema({
      ...BaseMetadataSchema.shape,
      ...IconsSchema.shape,
      uri: stringSchema(),
      description: optional(stringSchema()),
      mimeType: optional(stringSchema()),
      size: optional(numberSchema()),
      annotations: AnnotationsSchema.optional(),
      _meta: optional(looseObject({})),
    }),
  );
  ResourceTemplateSchema = deferSchema(() =>
    objectSchema({
      ...BaseMetadataSchema.shape,
      ...IconsSchema.shape,
      uriTemplate: stringSchema(),
      description: optional(stringSchema()),
      mimeType: optional(stringSchema()),
      annotations: AnnotationsSchema.optional(),
      _meta: optional(looseObject({})),
    }),
  );
  ListResourcesRequestSchema = deferSchema(() =>
    PaginatedRequestSchema.extend({
      method: literal("resources/list"),
    }),
  );
  ListResourcesResultSchema = deferSchema(() =>
    PaginatedResultSchema.extend({
      resources: array(ResourceSchema),
    }),
  );
  ListResourceTemplatesRequestSchema = deferSchema(() =>
    PaginatedRequestSchema.extend({
      method: literal("resources/templates/list"),
    }),
  );
  ListResourceTemplatesResultSchema = deferSchema(() =>
    PaginatedResultSchema.extend({
      resourceTemplates: array(ResourceTemplateSchema),
    }),
  );
  ResourceRequestParamsSchema = deferSchema(() =>
    BaseRequestParamsSchema.extend({
      uri: stringSchema(),
    }),
  );
  ResourceRequestParamsSchema_default = ResourceRequestParamsSchema;
  ReadResourceRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("resources/read"),
      params: ResourceRequestParamsSchema_default,
    }),
  );
  ReadResourceResultSchema = deferSchema(() =>
    ResultSchema.extend({
      contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema])),
    }),
  );
  ResourceListChangedNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/resources/list_changed"),
      params: NotificationsParamsSchema.optional(),
    }),
  );
  SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
  SubscribeRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("resources/subscribe"),
      params: SubscribeRequestParamsSchema,
    }),
  );
  UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
  UnsubscribeRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("resources/unsubscribe"),
      params: UnsubscribeRequestParamsSchema,
    }),
  );
  SubscriptionFilterSchema = deferSchema(() =>
    objectSchema({
      toolsListChanged: booleanSchema().optional(),
      promptsListChanged: booleanSchema().optional(),
      resourcesListChanged: booleanSchema().optional(),
      resourceSubscriptions: array(stringSchema()).optional(),
    }),
  );
  SubscriptionsListenRequestParamsSchema = deferSchema(() =>
    BaseRequestParamsSchema.extend({
      notifications: SubscriptionFilterSchema,
    }),
  );
  SubscriptionsListenRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("subscriptions/listen"),
      params: SubscriptionsListenRequestParamsSchema,
    }),
  );
  SubscriptionsAcknowledgedNotificationParamsSchema = deferSchema(() =>
    NotificationsParamsSchema.extend({
      notifications: SubscriptionFilterSchema,
    }),
  );
  SubscriptionsAcknowledgedNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/subscriptions/acknowledged"),
      params: SubscriptionsAcknowledgedNotificationParamsSchema,
    }),
  );
  SubscriptionsListenResultMetaSchema = deferSchema(() =>
    ResultMetaObjectSchema.extend({
      [SUBSCRIPTION_ID_META_KEY]: RequestIdSchema,
    }),
  );
  SubscriptionsListenResultSchema = deferSchema(() =>
    ResultSchema.extend({
      _meta: SubscriptionsListenResultMetaSchema,
    }),
  );
  ResourceUpdatedNotificationParamsSchema = deferSchema(() =>
    NotificationsParamsSchema.extend({
      uri: stringSchema(),
    }),
  );
  ResourceUpdatedNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/resources/updated"),
      params: ResourceUpdatedNotificationParamsSchema,
    }),
  );
  PromptArgumentSchema = deferSchema(() =>
    objectSchema({
      name: stringSchema(),
      description: optional(stringSchema()),
      required: optional(booleanSchema()),
    }),
  );
  PromptSchema = deferSchema(() =>
    objectSchema({
      ...BaseMetadataSchema.shape,
      ...IconsSchema.shape,
      description: optional(stringSchema()),
      arguments: optional(array(PromptArgumentSchema)),
      _meta: optional(looseObject({})),
    }),
  );
  ListPromptsRequestSchema = deferSchema(() =>
    PaginatedRequestSchema.extend({
      method: literal("prompts/list"),
    }),
  );
  ListPromptsResultSchema = deferSchema(() =>
    PaginatedResultSchema.extend({
      prompts: array(PromptSchema),
    }),
  );
  GetPromptRequestParamsSchema = deferSchema(() =>
    BaseRequestParamsSchema.extend({
      name: stringSchema(),
      arguments: record(stringSchema(), stringSchema()).optional(),
    }),
  );
  GetPromptRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("prompts/get"),
      params: GetPromptRequestParamsSchema,
    }),
  );
  TextContentSchema = deferSchema(() =>
    objectSchema({
      type: literal("text"),
      text: stringSchema(),
      annotations: AnnotationsSchema.optional(),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  ImageContentSchema = deferSchema(() =>
    objectSchema({
      type: literal("image"),
      data: Base64Schema,
      mimeType: stringSchema(),
      annotations: AnnotationsSchema.optional(),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  AudioContentSchema = deferSchema(() =>
    objectSchema({
      type: literal("audio"),
      data: Base64Schema,
      mimeType: stringSchema(),
      annotations: AnnotationsSchema.optional(),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  ToolUseContentSchema = deferSchema(() =>
    objectSchema({
      type: literal("tool_use"),
      name: stringSchema(),
      id: stringSchema(),
      input: record(stringSchema(), unknown()),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  EmbeddedResourceSchema = deferSchema(() =>
    objectSchema({
      type: literal("resource"),
      resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
      annotations: AnnotationsSchema.optional(),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  ResourceLinkSchema = deferSchema(() =>
    ResourceSchema.extend({
      type: literal("resource_link"),
    }),
  );
  ContentBlockSchema = deferSchema(() =>
    union([
      TextContentSchema,
      ImageContentSchema,
      AudioContentSchema,
      ResourceLinkSchema,
      EmbeddedResourceSchema,
    ]),
  );
  PromptMessageSchema = deferSchema(() =>
    objectSchema({
      role: RoleSchema,
      content: ContentBlockSchema,
    }),
  );
  GetPromptResultSchema = deferSchema(() =>
    ResultSchema.extend({
      description: stringSchema().optional(),
      messages: array(PromptMessageSchema),
    }),
  );
  PromptListChangedNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/prompts/list_changed"),
      params: NotificationsParamsSchema.optional(),
    }),
  );
  ToolAnnotationsSchema = deferSchema(() =>
    objectSchema({
      title: stringSchema().optional(),
      readOnlyHint: booleanSchema().optional(),
      destructiveHint: booleanSchema().optional(),
      idempotentHint: booleanSchema().optional(),
      openWorldHint: booleanSchema().optional(),
    }),
  );
  ToolExecutionSchema = deferSchema(() =>
    objectSchema({
      taskSupport: _enum(["required", "optional", "forbidden"]).optional(),
    }),
  );
  ToolSchema = deferSchema(() =>
    objectSchema({
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
    }),
  );
  ListToolsRequestSchema = deferSchema(() =>
    PaginatedRequestSchema.extend({
      method: literal("tools/list"),
    }),
  );
  ListToolsResultSchema = deferSchema(() =>
    PaginatedResultSchema.extend({
      tools: array(ToolSchema),
    }),
  );
  CallToolResultSchema = deferSchema(() =>
    ResultSchema.extend({
      content: array(ContentBlockSchema).default([]),
      structuredContent: unknown().optional(),
      isError: booleanSchema().optional(),
    }),
  );
  CompatibilityCallToolResultSchema = deferSchema(() =>
    CallToolResultSchema.or(
      ResultSchema.extend({
        toolResult: unknown(),
      }),
    ),
  );
  CallToolRequestParamsSchema = deferSchema(() =>
    TaskAugmentedRequestParamsSchema.extend({
      name: stringSchema(),
      arguments: record(stringSchema(), unknown()).optional(),
    }),
  );
  CallToolRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("tools/call"),
      params: CallToolRequestParamsSchema,
    }),
  );
  ToolListChangedNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/tools/list_changed"),
      params: NotificationsParamsSchema.optional(),
    }),
  );
  ListChangedOptionsBaseSchema = deferSchema(() =>
    objectSchema({
      autoRefresh: booleanSchema().default(true),
      debounceMs: numberSchema().int().nonnegative().default(300),
    }),
  );
  LoggingLevelSchema = deferSchema(() =>
    _enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]),
  );
  SetLevelRequestParamsSchema = deferSchema(() =>
    BaseRequestParamsSchema.extend({
      level: LoggingLevelSchema,
    }),
  );
  SetLevelRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("logging/setLevel"),
      params: SetLevelRequestParamsSchema,
    }),
  );
  LoggingMessageNotificationParamsSchema = deferSchema(() =>
    NotificationsParamsSchema.extend({
      level: LoggingLevelSchema,
      logger: stringSchema().optional(),
      data: unknown(),
    }),
  );
  LoggingMessageNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/message"),
      params: LoggingMessageNotificationParamsSchema,
    }),
  );
  ModelHintSchema = deferSchema(() =>
    objectSchema({
      name: stringSchema().optional(),
    }),
  );
  ModelPreferencesSchema = deferSchema(() =>
    objectSchema({
      hints: array(ModelHintSchema).optional(),
      costPriority: numberSchema().min(0).max(1).optional(),
      speedPriority: numberSchema().min(0).max(1).optional(),
      intelligencePriority: numberSchema().min(0).max(1).optional(),
    }),
  );
  ToolChoiceSchema = deferSchema(() =>
    objectSchema({
      mode: _enum(["auto", "required", "none"]).optional(),
    }),
  );
  ToolResultContentSchema = deferSchema(() =>
    objectSchema({
      type: literal("tool_result"),
      toolUseId: stringSchema().describe("The unique identifier for the corresponding tool call."),
      content: array(ContentBlockSchema),
      structuredContent: unknown().optional(),
      isError: booleanSchema().optional(),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  SamplingContentSchema = deferSchema(() =>
    discriminatedUnion("type", [TextContentSchema, ImageContentSchema, AudioContentSchema]),
  );
  SamplingMessageContentBlockSchema = deferSchema(() =>
    discriminatedUnion("type", [
      TextContentSchema,
      ImageContentSchema,
      AudioContentSchema,
      ToolUseContentSchema,
      ToolResultContentSchema,
    ]),
  );
  SamplingMessageSchema = deferSchema(() =>
    objectSchema({
      role: RoleSchema,
      content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  CreateMessageRequestParamsSchema = deferSchema(() =>
    TaskAugmentedRequestParamsSchema.extend({
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
    }),
  );
  CreateMessageRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("sampling/createMessage"),
      params: CreateMessageRequestParamsSchema,
    }),
  );
  CreateMessageResultSchema = deferSchema(() =>
    ResultSchema.extend({
      model: stringSchema(),
      stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(stringSchema())),
      role: RoleSchema,
      content: SamplingContentSchema,
    }),
  );
  CreateMessageResultWithToolsSchema = deferSchema(() =>
    ResultSchema.extend({
      model: stringSchema(),
      stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(stringSchema())),
      role: RoleSchema,
      content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
    }),
  );
  BooleanSchemaSchema = deferSchema(() =>
    objectSchema({
      type: literal("boolean"),
      title: stringSchema().optional(),
      description: stringSchema().optional(),
      default: booleanSchema().optional(),
    }),
  );
  StringSchemaSchema = deferSchema(() =>
    objectSchema({
      type: literal("string"),
      title: stringSchema().optional(),
      description: stringSchema().optional(),
      minLength: numberSchema().optional(),
      maxLength: numberSchema().optional(),
      format: _enum(["email", "uri", "date", "date-time"]).optional(),
      default: stringSchema().optional(),
    }),
  );
  NumberSchemaSchema = deferSchema(() =>
    objectSchema({
      type: _enum(["number", "integer"]),
      title: stringSchema().optional(),
      description: stringSchema().optional(),
      minimum: numberSchema().optional(),
      maximum: numberSchema().optional(),
      default: numberSchema().optional(),
    }),
  );
  UntitledSingleSelectEnumSchemaSchema = deferSchema(() =>
    objectSchema({
      type: literal("string"),
      title: stringSchema().optional(),
      description: stringSchema().optional(),
      enum: array(stringSchema()),
      default: stringSchema().optional(),
    }),
  );
  TitledSingleSelectEnumSchemaSchema = deferSchema(() =>
    objectSchema({
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
    }),
  );
  LegacyTitledEnumSchemaSchema = deferSchema(() =>
    objectSchema({
      type: literal("string"),
      title: stringSchema().optional(),
      description: stringSchema().optional(),
      enum: array(stringSchema()),
      enumNames: array(stringSchema()).optional(),
      default: stringSchema().optional(),
    }),
  );
  SingleSelectEnumSchemaSchema = deferSchema(() =>
    union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]),
  );
  UntitledMultiSelectEnumSchemaSchema = deferSchema(() =>
    objectSchema({
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
    }),
  );
  TitledMultiSelectEnumSchemaSchema = deferSchema(() =>
    objectSchema({
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
    }),
  );
  MultiSelectEnumSchemaSchema = deferSchema(() =>
    union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]),
  );
  EnumSchemaSchema = deferSchema(() =>
    union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]),
  );
  PrimitiveSchemaDefinitionSchema = deferSchema(() =>
    union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]),
  );
  ElicitRequestFormParamsSchema = deferSchema(() =>
    TaskAugmentedRequestParamsSchema.extend({
      mode: literal("form").optional(),
      message: stringSchema(),
      requestedSchema: objectSchema({
        type: literal("object"),
        properties: record(stringSchema(), PrimitiveSchemaDefinitionSchema),
        required: array(stringSchema()).optional(),
      }).catchall(unknown()),
    }),
  );
  ElicitRequestURLParamsSchema = deferSchema(() =>
    TaskAugmentedRequestParamsSchema.extend({
      mode: literal("url"),
      message: stringSchema(),
      elicitationId: stringSchema(),
      url: stringSchema().url(),
    }),
  );
  ElicitRequestParamsSchema = deferSchema(() =>
    union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]),
  );
  ElicitRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("elicitation/create"),
      params: ElicitRequestParamsSchema,
    }),
  );
  ElicitationCompleteNotificationParamsSchema = deferSchema(() =>
    NotificationsParamsSchema.extend({
      elicitationId: stringSchema(),
    }),
  );
  ElicitationCompleteNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/elicitation/complete"),
      params: ElicitationCompleteNotificationParamsSchema,
    }),
  );
  ElicitResultSchema = deferSchema(() =>
    ResultSchema.extend({
      action: _enum(["accept", "decline", "cancel"]),
      content: preprocess(
        (val) => (val === null ? undefined : val),
        record(
          stringSchema(),
          union([stringSchema(), numberSchema(), booleanSchema(), array(stringSchema())]),
        ).optional(),
      ),
    }),
  );
  ResourceTemplateReferenceSchema = deferSchema(() =>
    objectSchema({
      type: literal("ref/resource"),
      uri: stringSchema(),
    }),
  );
  PromptReferenceSchema = deferSchema(() =>
    objectSchema({
      type: literal("ref/prompt"),
      name: stringSchema(),
    }),
  );
  CompleteRequestParamsSchema = deferSchema(() =>
    BaseRequestParamsSchema.extend({
      ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
      argument: objectSchema({
        name: stringSchema(),
        value: stringSchema(),
      }),
      context: objectSchema({
        arguments: record(stringSchema(), stringSchema()).optional(),
      }).optional(),
    }),
  );
  CompleteRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("completion/complete"),
      params: CompleteRequestParamsSchema,
    }),
  );
  CompleteResultSchema = deferSchema(() =>
    ResultSchema.extend({
      completion: looseObject({
        values: array(stringSchema()).max(100),
        total: optional(numberSchema().int()),
        hasMore: optional(booleanSchema()),
      }),
    }),
  );
  RootSchema = deferSchema(() =>
    objectSchema({
      uri: stringSchema().startsWith("file://"),
      name: stringSchema().optional(),
      _meta: record(stringSchema(), unknown()).optional(),
    }),
  );
  ListRootsRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("roots/list"),
      params: BaseRequestParamsSchema.optional(),
    }),
  );
  ListRootsResultSchema = deferSchema(() =>
    ResultSchema.extend({
      roots: array(RootSchema),
    }),
  );
  RootsListChangedNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/roots/list_changed"),
      params: NotificationsParamsSchema.optional(),
    }),
  );
  TaskCreationParamsSchema = deferSchema(() =>
    looseObject({
      ttl: numberSchema().optional(),
      pollInterval: numberSchema().optional(),
    }),
  );
  TaskStatusSchema = deferSchema(() =>
    _enum(["working", "input_required", "completed", "failed", "cancelled"]),
  );
  TaskSchema = deferSchema(() =>
    objectSchema({
      taskId: stringSchema(),
      status: TaskStatusSchema,
      ttl: union([numberSchema(), nullSchema()]),
      createdAt: stringSchema(),
      lastUpdatedAt: stringSchema(),
      pollInterval: optional(numberSchema()),
      statusMessage: optional(stringSchema()),
    }),
  );
  CreateTaskResultSchema = deferSchema(() =>
    ResultSchema.extend({
      task: TaskSchema,
    }),
  );
  TaskStatusNotificationParamsSchema = deferSchema(() => NotificationsParamsSchema.merge(TaskSchema));
  TaskStatusNotificationSchema = deferSchema(() =>
    NotificationSchema.extend({
      method: literal("notifications/tasks/status"),
      params: TaskStatusNotificationParamsSchema,
    }),
  );
  GetTaskRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("tasks/get"),
      params: BaseRequestParamsSchema.extend({
        taskId: stringSchema(),
      }),
    }),
  );
  GetTaskResultSchema = deferSchema(() => ResultSchema.merge(TaskSchema));
  GetTaskPayloadRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("tasks/result"),
      params: BaseRequestParamsSchema.extend({
        taskId: stringSchema(),
      }),
    }),
  );
  GetTaskPayloadResultSchema = deferSchema(() => ResultSchema.loose());
  ListTasksRequestSchema = deferSchema(() =>
    PaginatedRequestSchema.extend({
      method: literal("tasks/list"),
    }),
  );
  ListTasksResultSchema = deferSchema(() =>
    PaginatedResultSchema.extend({
      tasks: array(TaskSchema),
    }),
  );
  CancelTaskRequestSchema = deferSchema(() =>
    RequestSchema.extend({
      method: literal("tasks/cancel"),
      params: BaseRequestParamsSchema.extend({
        taskId: stringSchema(),
      }),
    }),
  );
  CancelTaskResultSchema = deferSchema(() => ResultSchema.merge(TaskSchema));
  ClientRequestSchema = deferSchema(() =>
    union([
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
    ]),
  );
  ClientNotificationSchema = deferSchema(() =>
    union([
      CancelledNotificationSchema,
      ProgressNotificationSchema,
      InitializedNotificationSchema,
      RootsListChangedNotificationSchema,
    ]),
  );
  ClientResultSchema = deferSchema(() =>
    union([
      EmptyResultSchema,
      CreateMessageResultSchema,
      CreateMessageResultWithToolsSchema,
      ElicitResultSchema,
      ListRootsResultSchema,
    ]),
  );
  ServerRequestSchema = deferSchema(() =>
    union([PingRequestSchema, CreateMessageRequestSchema, ElicitRequestSchema, ListRootsRequestSchema]),
  );
  ServerNotificationSchema = deferSchema(() =>
    union([
      CancelledNotificationSchema,
      ProgressNotificationSchema,
      LoggingMessageNotificationSchema,
      ResourceUpdatedNotificationSchema,
      ResourceListChangedNotificationSchema,
      ToolListChangedNotificationSchema,
      PromptListChangedNotificationSchema,
      SubscriptionsAcknowledgedNotificationSchema,
      ElicitationCompleteNotificationSchema,
    ]),
  );
  ServerResultSchema = deferSchema(() =>
    union([
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
    ]),
  );
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
  OAuthProtectedResourceMetadataSchema = deferSchema(() =>
    looseObject({
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
    }),
  );
  OAuthMetadataSchema = deferSchema(() =>
    looseObject({
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
    }),
  );
  OpenIdProviderMetadataSchema = deferSchema(() =>
    looseObject({
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
    }),
  );
  OpenIdProviderDiscoveryMetadataSchema = deferSchema(() =>
    objectSchema({
      ...OpenIdProviderMetadataSchema.shape,
      ...OAuthMetadataSchema.pick({
        code_challenge_methods_supported: true,
      }).shape,
    }),
  );
  OAuthTokensSchema = deferSchema(() =>
    objectSchema({
      access_token: stringSchema(),
      id_token: stringSchema().optional(),
      token_type: stringSchema(),
      expires_in: coerceNumber().optional(),
      scope: stringSchema().optional(),
      refresh_token: stringSchema().optional(),
    }).strip(),
  );
  IdJagTokenExchangeResponseSchema = deferSchema(() =>
    objectSchema({
      issued_token_type: literal("urn:ietf:params:oauth:token-type:id-jag"),
      access_token: stringSchema(),
      token_type: stringSchema().optional(),
      expires_in: numberSchema().optional(),
      scope: stringSchema().optional(),
    }).strip(),
  );
  OAuthErrorResponseSchema = deferSchema(() =>
    objectSchema({
      error: stringSchema(),
      error_description: stringSchema().optional(),
      error_uri: stringSchema().optional(),
    }),
  );
  OptionalSafeUrlSchema = deferSchema(() =>
    SafeUrlSchema.optional().or(
      literal("").transform(() => {
        return;
      }),
    ),
  );
  OAuthClientMetadataSchema = deferSchema(() =>
    objectSchema({
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
    }).strip(),
  );
  OAuthClientInformationSchema = deferSchema(() =>
    objectSchema({
      client_id: stringSchema(),
      client_secret: stringSchema().optional(),
      client_id_issued_at: numberSchema().optional(),
      client_secret_expires_at: numberSchema().optional(),
    }).strip(),
  );
  OAuthClientInformationFullSchema = deferSchema(() =>
    OAuthClientMetadataSchema.merge(OAuthClientInformationSchema),
  );
  OAuthClientRegistrationErrorSchema = deferSchema(() =>
    objectSchema({
      error: stringSchema(),
      error_description: stringSchema().optional(),
    }).strip(),
  );
  OAuthTokenRevocationRequestSchema = deferSchema(() =>
    objectSchema({
      token: stringSchema(),
      token_type_hint: stringSchema().optional(),
    }).strip(),
  );
});
//@ chunk-ghww1f0b.js:2682-2961 esm-fingerprint
var TokenExchangeResponseSchema_2; // deferred: uses DoctorLazy (../../../../src/cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var JwtBearerResponseSchema_2;
deferInit("chunk-ghww1f0b.js:2682", () => {
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
//@ chunk-ft6a2kja.js:2635-2914 esm-fingerprint
var TokenExchangeResponseSchema; // deferred: uses DoctorLazy (../../../../src/cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var JwtBearerResponseSchema;
deferInit("chunk-ft6a2kja.js:2635", () => {
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
  JwtBearerResponseSchema,
  JSONRPCMessageSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListPromptsResultSchema,
  ElicitRequestURLParamsSchema,
  ListToolsResultSchema,
  ToolSchema,
  ImplementationSchema,
  ServerCapabilitiesSchema,
  PromptSchema,
  ResourceSchema,
  ResourceTemplateSchema,
  CompatibilityCallToolResultSchema,
  ResultSchema,
  ElicitRequestParamsSchema,
  InitializeResultSchema,
  RelatedTaskMetadataSchema,
  OAuthErrorResponseSchema,
  OAuthProtectedResourceMetadataSchema,
  OAuthMetadataSchema,
  OpenIdProviderDiscoveryMetadataSchema,
  OAuthTokensSchema,
  OAuthClientInformationFullSchema,
  DiscoverResultSchema,
  ListChangedOptionsBaseSchema,
  TokenExchangeResponseSchema_2,
  TokenExchangeResponseSchema,
  JwtBearerResponseSchema_2,
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
  ResourceRequestParamsSchema_default,
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
