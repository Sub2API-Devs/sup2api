/**
 * @modelcontextprotocol/client/dist/src-D_zzAWoS.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-r1g76qsy.js (156)
 * attribution: esm-fingerprint 114, esm-layout 36, layout 6
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
  _enum,
  intersection,
  preprocess,
  optional,
  unknown,
  discriminatedUnion,
  _Ii,
  A8e,
} from "../../../zod/v4/classic/schemas.js";
import {
  parseToolOutputSchema,
  parseToolInputSchemaLoose,
} from "../../../../src/services/mcp/schemaParse.js";
import {
  PROTOCOL_VERSION_META_KEY,
  CLIENT_INFO_META_KEY,
  CLIENT_CAPABILITIES_META_KEY,
  LOG_LEVEL_META_KEY,
  SERVER_INFO_META_KEY,
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
  CompatibilityCallToolResultSchema,
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
  DiscoverResultSchema,
  ElicitRequestFormParamsSchema,
  ElicitRequestParamsSchema,
  ElicitRequestSchema,
  ElicitRequestURLParamsSchema,
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
  ImplementationSchema,
  InitializeRequestParamsSchema,
  InitializeRequestSchema,
  InitializeResultSchema,
  InitializedNotificationSchema,
  Ta,
  JSONObjectSchema,
  JSONRPCErrorResponseSchema,
  fZe,
  JSONRPCNotificationSchema,
  JSONRPCRequestSchema,
  Ca,
  JSONRPCResultResponseSchema,
  JSONValueSchema,
  LegacyTitledEnumSchemaSchema,
  ListChangedOptionsBaseSchema,
  ListPromptsRequestSchema,
  ListPromptsResultSchema,
  ListResourceTemplatesRequestSchema,
  ListResourceTemplatesResultSchema,
  ListResourcesRequestSchema,
  ListResourcesResultSchema,
  ListRootsRequestSchema,
  ListRootsResultSchema,
  ListTasksRequestSchema,
  ListTasksResultSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
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
  PromptSchema,
  ReadResourceRequestParamsSchema,
  ReadResourceRequestSchema,
  ReadResourceResultSchema,
  RelatedTaskMetadataSchema,
  RequestIdSchema,
  RequestMetaSchema,
  RequestSchema,
  ResourceContentsSchema,
  ResourceLinkSchema,
  ResourceListChangedNotificationSchema,
  ResourceRequestParamsSchema,
  ResourceSchema,
  ResourceTemplateReferenceSchema,
  ResourceTemplateSchema,
  ResourceUpdatedNotificationParamsSchema,
  ResourceUpdatedNotificationSchema,
  ResultMetaObjectSchema,
  ResultSchema,
  RoleSchema,
  RootSchema,
  RootsListChangedNotificationSchema,
  SamplingContentSchema,
  SamplingMessageContentBlockSchema,
  SamplingMessageSchema,
  ServerCapabilitiesSchema,
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
  ToolSchema,
  ToolUseContentSchema,
  UnsubscribeRequestParamsSchema,
  UnsubscribeRequestSchema,
  UntitledMultiSelectEnumSchemaSchema,
  UntitledSingleSelectEnumSchemaSchema,
  IdJagTokenExchangeResponseSchema,
  OAuthClientInformationFullSchema,
  OAuthClientInformationSchema,
  OAuthClientMetadataSchema,
  OAuthClientRegistrationErrorSchema,
  OAuthErrorResponseSchema,
  OAuthMetadataSchema,
  OAuthProtectedResourceMetadataSchema,
  OAuthTokenRevocationRequestSchema,
  OAuthTokensSchema,
  OpenIdProviderDiscoveryMetadataSchema,
  OpenIdProviderMetadataSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "../../core/dist/auth-CUe6YdwF.mjs";
import { yl, IO_MODELCONTEXTPROTOCOL_TASKS } from "../../core/dist/schemas-DscsoNZN.mjs";
import { qn } from "../../core/(bundler runtime of a pre-bundled dist file).js";
import { slo } from "../../../zod/v4/locales/fr.js";
import { toJSONSchema } from "../../../zod/v4/core/json-schema-processors.js";
import { import_content_type } from "../../../content-type/index.js";

//@ chunk-r1g76qsy.js:17821-17862 esm-fingerprint
var BRANDS = Symbol.for("mcp.sdk.errorBrands");
//@ chunk-r1g76qsy.js:17862-18143 esm-fingerprint
function stampErrorBrands(instance, ctor) {
  let brands = new Set();
  let current = ctor;
  while (typeof current === "function") {
    let brand = current.mcpBrand;
    if (Object.prototype.hasOwnProperty.call(current, "mcpBrand") && typeof brand === "string")
      brands.add(brand);
    current = Object.getPrototypeOf(current);
  }
  if (brands.size === 0) return;
  Object.defineProperty(instance, BRANDS, {
    value: brands,
    enumerable: false,
    configurable: true,
  });
}
//@ chunk-r1g76qsy.js:18143-18460 esm-fingerprint
function brandedHasInstance(cls, value) {
  try {
    if (
      typeof value === "object" &&
      value !== null &&
      Object.prototype.hasOwnProperty.call(cls, "mcpBrand") &&
      typeof cls.mcpBrand === "string" &&
      Object.prototype.hasOwnProperty.call(value, BRANDS)
    ) {
      let carried = value[BRANDS];
      if (carried && typeof carried.has === "function" && carried.has(cls.mcpBrand)) return true;
    }
  } catch {}
  return Function.prototype[Symbol.hasInstance].call(cls, value);
}
//@ chunk-r1g76qsy.js:18460-21533 esm-fingerprint
var OAuthErrorCode = (function (OAuthErrorCode$1) {
  OAuthErrorCode$1.InvalidRequest = "invalid_request";
  OAuthErrorCode$1.InvalidClient = "invalid_client";
  OAuthErrorCode$1.InvalidGrant = "invalid_grant";
  OAuthErrorCode$1.UnauthorizedClient = "unauthorized_client";
  OAuthErrorCode$1.UnsupportedGrantType = "unsupported_grant_type";
  OAuthErrorCode$1.InvalidScope = "invalid_scope";
  OAuthErrorCode$1.AccessDenied = "access_denied";
  OAuthErrorCode$1.ServerError = "server_error";
  OAuthErrorCode$1.TemporarilyUnavailable = "temporarily_unavailable";
  OAuthErrorCode$1.UnsupportedResponseType = "unsupported_response_type";
  OAuthErrorCode$1.UnsupportedTokenType = "unsupported_token_type";
  OAuthErrorCode$1.InvalidToken = "invalid_token";
  OAuthErrorCode$1.MethodNotAllowed = "method_not_allowed";
  OAuthErrorCode$1.TooManyRequests = "too_many_requests";
  OAuthErrorCode$1.InvalidClientMetadata = "invalid_client_metadata";
  OAuthErrorCode$1.InvalidRedirectUri = "invalid_redirect_uri";
  OAuthErrorCode$1.InsufficientScope = "insufficient_scope";
  OAuthErrorCode$1.InvalidTarget = "invalid_target";
  return OAuthErrorCode$1;
})({});
var OAuthError = class OAuthError extends Error {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.OAuthError",
    });
  }
  static [Symbol.hasInstance](value) {
    return brandedHasInstance(this, value);
  }
  static isInstance(value) {
    if (typeof this !== "function")
      throw TypeError(
        "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
      );
    return brandedHasInstance(this, value);
  }
  constructor(code, message, errorUri) {
    super(message);
    this.code = code;
    this.errorUri = errorUri;
    this.name = "OAuthError";
    stampErrorBrands(this, new.target);
  }
  toResponseObject() {
    let response = {
      error: this.code,
      error_description: this.message,
    };
    if (this.errorUri) response.error_uri = this.errorUri;
    return response;
  }
  static fromResponse(response) {
    return new OAuthError(response.error, response.error_description ?? response.error, response.error_uri);
  }
};
var SdkErrorCode = (function (SdkErrorCode$1) {
  SdkErrorCode$1.NotConnected = "NOT_CONNECTED";
  SdkErrorCode$1.AlreadyConnected = "ALREADY_CONNECTED";
  SdkErrorCode$1.NotInitialized = "NOT_INITIALIZED";
  SdkErrorCode$1.CapabilityNotSupported = "CAPABILITY_NOT_SUPPORTED";
  SdkErrorCode$1.RequestTimeout = "REQUEST_TIMEOUT";
  SdkErrorCode$1.ConnectionClosed = "CONNECTION_CLOSED";
  SdkErrorCode$1.SendFailed = "SEND_FAILED";
  SdkErrorCode$1.InvalidResult = "INVALID_RESULT";
  SdkErrorCode$1.UnsupportedResultType = "UNSUPPORTED_RESULT_TYPE";
  SdkErrorCode$1.InputRequiredRoundsExceeded = "INPUT_REQUIRED_ROUNDS_EXCEEDED";
  SdkErrorCode$1.ListPaginationExceeded = "LIST_PAGINATION_EXCEEDED";
  SdkErrorCode$1.MethodNotSupportedByProtocolVersion = "METHOD_NOT_SUPPORTED_BY_PROTOCOL_VERSION";
  SdkErrorCode$1.EraNegotiationFailed = "ERA_NEGOTIATION_FAILED";
  SdkErrorCode$1.ClientHttpNotImplemented = "CLIENT_HTTP_NOT_IMPLEMENTED";
  SdkErrorCode$1.ClientHttpAuthentication = "CLIENT_HTTP_AUTHENTICATION";
  SdkErrorCode$1.ClientHttpForbidden = "CLIENT_HTTP_FORBIDDEN";
  SdkErrorCode$1.ClientHttpUnexpectedContent = "CLIENT_HTTP_UNEXPECTED_CONTENT";
  SdkErrorCode$1.ClientHttpFailedToOpenStream = "CLIENT_HTTP_FAILED_TO_OPEN_STREAM";
  SdkErrorCode$1.ClientHttpFailedToTerminateSession = "CLIENT_HTTP_FAILED_TO_TERMINATE_SESSION";
  return SdkErrorCode$1;
})({});
var SdkError = class extends Error {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.SdkError",
    });
  }
  static [Symbol.hasInstance](value) {
    return brandedHasInstance(this, value);
  }
  static isInstance(value) {
    if (typeof this !== "function")
      throw TypeError(
        "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
      );
    return brandedHasInstance(this, value);
  }
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "SdkError";
    stampErrorBrands(this, new.target);
  }
};
var SdkHttpError = class extends SdkError {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.SdkHttpError",
    });
  }
  constructor(code, message, data) {
    super(code, message, data);
    this.name = "SdkHttpError";
  }
  get status() {
    return this.data.status;
  }
  get statusText() {
    return this.data.statusText;
  }
};
//@ chunk-r1g76qsy.js:21533-21620 esm-fingerprint
function resourceUrlFromServerUrl(url) {
  let resourceURL = typeof url === "string" ? new URL(url) : new URL(url.href);
  resourceURL.hash = "";
  return resourceURL;
}
//@ chunk-r1g76qsy.js:21620-21991 esm-fingerprint
function checkResourceAllowed({ requestedResource, configuredResource }) {
  let requested =
    typeof requestedResource === "string" ? new URL(requestedResource) : new URL(requestedResource.href);
  let configured =
    typeof configuredResource === "string" ? new URL(configuredResource) : new URL(configuredResource.href);
  if (requested.origin !== configured.origin) return false;
  if (requested.pathname.length < configured.pathname.length) return false;
  let requestedPath = requested.pathname.endsWith("/") ? requested.pathname : requested.pathname + "/";
  let configuredPath = configured.pathname.endsWith("/") ? configured.pathname : configured.pathname + "/";
  return requestedPath.startsWith(configuredPath);
}
//@ chunk-r1g76qsy.js:21991-22019 esm-fingerprint
var FIRST_MODERN_PROTOCOL_VERSION = "2026-07-28";
var cn = [FIRST_MODERN_PROTOCOL_VERSION];
//@ chunk-r1g76qsy.js:22019-22047 esm-layout
function isModernProtocolVersion(version) {
  return version >= FIRST_MODERN_PROTOCOL_VERSION;
}
//@ chunk-r1g76qsy.js:22047-22091 esm-layout
function legacyProtocolVersions(versions) {
  return versions.filter((version) => !isModernProtocolVersion(version));
}
//@ chunk-r1g76qsy.js:22091-22134 esm-layout
function modernProtocolVersions(versions) {
  return versions.filter((version) => isModernProtocolVersion(version));
}
//@ chunk-r1g76qsy.js:22134-22392 esm-fingerprint
function appendTextFallbackForNonObject(result) {
  let sc = result.structuredContent;
  if (sc === undefined) return result;
  if (!(typeof sc !== "object" || sc === null || Array.isArray(sc))) return result;
  if (result.content?.some((c) => c.type === "text") ?? false) return result;
  return {
    ...result,
    content: [
      ...(result.content ?? []),
      {
        type: "text",
        text: JSON.stringify(sc),
      },
    ],
  };
}
//@ chunk-r1g76qsy.js:22392-22439 esm-fingerprint
var TOOL_RESULT_FOREIGN_FAMILY_KEYS = ["task", "inputRequests", "requestState"];
//@ chunk-r1g76qsy.js:22439-22582 esm-fingerprint
function normalizeContentlessToolResult(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.content !== undefined ||
    TOOL_RESULT_FOREIGN_FAMILY_KEYS.some((key) => key in value)
  )
    return value;
  return {
    ...value,
    content: [],
  };
}
//@ chunk-r1g76qsy.js:22582-37310 esm-fingerprint
function build$1() {
  let JSONValueSchema$1 = lazy(() =>
    union([string(), E(), M(), zg(), record(string(), JSONValueSchema$1), array(JSONValueSchema$1)]),
  );
  let JSONObjectSchema$1 = record(string(), JSONValueSchema$1);
  let ProgressTokenSchema$1 = union([string(), E().int()]);
  let CursorSchema$1 = string();
  let TaskMetadataSchema$1 = u({
    ttl: E().optional(),
  });
  let RelatedTaskMetadataSchema$1 = u({
    taskId: string(),
  });
  let RequestMetaSchema$1 = looseObject({
    progressToken: ProgressTokenSchema$1.optional(),
    "io.modelcontextprotocol/related-task": RelatedTaskMetadataSchema$1.optional(),
  });
  let BaseRequestParamsSchema$1 = u({
    _meta: RequestMetaSchema$1.optional(),
  });
  let TaskAugmentedRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
    task: TaskMetadataSchema$1.optional(),
  });
  let RequestSchema$1 = u({
    method: string(),
    params: BaseRequestParamsSchema$1.loose().optional(),
  });
  let NotificationsParamsSchema$1 = u({
    _meta: RequestMetaSchema$1.optional(),
  });
  let NotificationSchema$1 = u({
    method: string(),
    params: NotificationsParamsSchema$1.loose().optional(),
  });
  let ResultSchema$1 = looseObject({
    _meta: RequestMetaSchema$1.optional(),
  });
  let RequestIdSchema$1 = union([string(), E().int()]);
  let EmptyResultSchema$1 = ResultSchema$1.strict();
  let CancelledNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
    requestId: RequestIdSchema$1.optional(),
    reason: string().optional(),
  });
  let CancelledNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/cancelled"),
    params: CancelledNotificationParamsSchema$1,
  });
  let IconSchema$1 = u({
    src: string(),
    mimeType: string().optional(),
    sizes: array(string()).optional(),
    theme: _enum(["light", "dark"]).optional(),
  });
  let IconsSchema$1 = u({
    icons: array(IconSchema$1).optional(),
  });
  let BaseMetadataSchema$1 = u({
    name: string(),
    title: string().optional(),
  });
  let ImplementationSchema$1 = BaseMetadataSchema$1.extend({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    version: string(),
    websiteUrl: string().optional(),
    description: string().optional(),
  });
  let FormElicitationCapabilitySchema = intersection(
    u({
      applyDefaults: M().optional(),
    }),
    JSONObjectSchema$1,
  );
  let ElicitationCapabilitySchema = preprocess(
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
        url: JSONObjectSchema$1.optional(),
      }),
      JSONObjectSchema$1.optional(),
    ),
  );
  let ClientTasksCapabilitySchema$1 = looseObject({
    list: JSONObjectSchema$1.optional(),
    cancel: JSONObjectSchema$1.optional(),
    requests: looseObject({
      sampling: looseObject({
        createMessage: JSONObjectSchema$1.optional(),
      }).optional(),
      elicitation: looseObject({
        create: JSONObjectSchema$1.optional(),
      }).optional(),
    }).optional(),
  });
  let ServerTasksCapabilitySchema$1 = looseObject({
    list: JSONObjectSchema$1.optional(),
    cancel: JSONObjectSchema$1.optional(),
    requests: looseObject({
      tools: looseObject({
        call: JSONObjectSchema$1.optional(),
      }).optional(),
    }).optional(),
  });
  let ClientCapabilitiesSchema$1 = u({
    experimental: record(string(), JSONObjectSchema$1).optional(),
    sampling: u({
      context: JSONObjectSchema$1.optional(),
      tools: JSONObjectSchema$1.optional(),
    }).optional(),
    elicitation: ElicitationCapabilitySchema.optional(),
    roots: u({
      listChanged: M().optional(),
    }).optional(),
    tasks: ClientTasksCapabilitySchema$1.optional(),
    extensions: record(string(), JSONObjectSchema$1).optional(),
  });
  let InitializeRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
    protocolVersion: string(),
    capabilities: ClientCapabilitiesSchema$1,
    clientInfo: ImplementationSchema$1,
  });
  let InitializeRequestSchema$1 = RequestSchema$1.extend({
    method: literal("initialize"),
    params: InitializeRequestParamsSchema$1,
  });
  let ServerCapabilitiesSchema$1 = u({
    experimental: record(string(), JSONObjectSchema$1).optional(),
    logging: JSONObjectSchema$1.optional(),
    completions: JSONObjectSchema$1.optional(),
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
    tasks: ServerTasksCapabilitySchema$1.optional(),
    extensions: record(string(), JSONObjectSchema$1).optional(),
  });
  let InitializeResultSchema$1 = ResultSchema$1.extend({
    protocolVersion: string(),
    capabilities: ServerCapabilitiesSchema$1,
    serverInfo: ImplementationSchema$1,
    instructions: string().optional(),
  });
  let InitializedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/initialized"),
    params: NotificationsParamsSchema$1.optional(),
  });
  let PingRequestSchema$1 = RequestSchema$1.extend({
    method: literal("ping"),
    params: BaseRequestParamsSchema$1.optional(),
  });
  let ProgressSchema$1 = u({
    progress: E(),
    total: optional(E()),
    message: optional(string()),
  });
  let ProgressNotificationParamsSchema$1 = u({
    ...NotificationsParamsSchema$1.shape,
    ...ProgressSchema$1.shape,
    progressToken: ProgressTokenSchema$1,
  });
  let ProgressNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/progress"),
    params: ProgressNotificationParamsSchema$1,
  });
  let PaginatedRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
    cursor: CursorSchema$1.optional(),
  });
  let PaginatedRequestSchema$1 = RequestSchema$1.extend({
    params: PaginatedRequestParamsSchema$1.optional(),
  });
  let PaginatedResultSchema$1 = ResultSchema$1.extend({
    nextCursor: CursorSchema$1.optional(),
  });
  let ResourceContentsSchema$1 = u({
    uri: string(),
    mimeType: optional(string()),
    _meta: record(string(), unknown()).optional(),
  });
  let TextResourceContentsSchema$1 = ResourceContentsSchema$1.extend({
    text: string(),
  });
  let Base64Schema = string().refine(
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
  let BlobResourceContentsSchema$1 = ResourceContentsSchema$1.extend({
    blob: Base64Schema,
  });
  let RoleSchema$1 = _enum(["user", "assistant"]);
  let AnnotationsSchema$1 = u({
    audience: array(RoleSchema$1).optional(),
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
  let ResourceSchema$1 = u({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    uri: string(),
    description: optional(string()),
    mimeType: optional(string()),
    size: optional(E()),
    annotations: AnnotationsSchema$1.optional(),
    _meta: optional(looseObject({})),
  });
  let ResourceTemplateSchema$1 = u({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    uriTemplate: string(),
    description: optional(string()),
    mimeType: optional(string()),
    annotations: AnnotationsSchema$1.optional(),
    _meta: optional(looseObject({})),
  });
  let ListResourcesRequestSchema$1 = PaginatedRequestSchema$1.extend({
    method: literal("resources/list"),
  });
  let ListResourcesResultSchema$1 = PaginatedResultSchema$1.extend({
    resources: array(ResourceSchema$1),
  });
  let ListResourceTemplatesRequestSchema$1 = PaginatedRequestSchema$1.extend({
    method: literal("resources/templates/list"),
  });
  let ListResourceTemplatesResultSchema$1 = PaginatedResultSchema$1.extend({
    resourceTemplates: array(ResourceTemplateSchema$1),
  });
  let ResourceRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
    uri: string(),
  });
  let ReadResourceRequestParamsSchema$1 = ResourceRequestParamsSchema$1;
  let ReadResourceRequestSchema$1 = RequestSchema$1.extend({
    method: literal("resources/read"),
    params: ReadResourceRequestParamsSchema$1,
  });
  let ReadResourceResultSchema$1 = ResultSchema$1.extend({
    contents: array(union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1])),
  });
  let ResourceListChangedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/resources/list_changed"),
    params: NotificationsParamsSchema$1.optional(),
  });
  let SubscribeRequestParamsSchema$1 = ResourceRequestParamsSchema$1;
  let SubscribeRequestSchema$1 = RequestSchema$1.extend({
    method: literal("resources/subscribe"),
    params: SubscribeRequestParamsSchema$1,
  });
  let UnsubscribeRequestParamsSchema$1 = ResourceRequestParamsSchema$1;
  let UnsubscribeRequestSchema$1 = RequestSchema$1.extend({
    method: literal("resources/unsubscribe"),
    params: UnsubscribeRequestParamsSchema$1,
  });
  let ResourceUpdatedNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
    uri: string(),
  });
  let ResourceUpdatedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/resources/updated"),
    params: ResourceUpdatedNotificationParamsSchema$1,
  });
  let PromptArgumentSchema$1 = u({
    name: string(),
    description: optional(string()),
    required: optional(M()),
  });
  let PromptSchema$1 = u({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    description: optional(string()),
    arguments: optional(array(PromptArgumentSchema$1)),
    _meta: optional(looseObject({})),
  });
  let ListPromptsRequestSchema$1 = PaginatedRequestSchema$1.extend({
    method: literal("prompts/list"),
  });
  let ListPromptsResultSchema$1 = PaginatedResultSchema$1.extend({
    prompts: array(PromptSchema$1),
  });
  let GetPromptRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
    name: string(),
    arguments: record(string(), string()).optional(),
  });
  let GetPromptRequestSchema$1 = RequestSchema$1.extend({
    method: literal("prompts/get"),
    params: GetPromptRequestParamsSchema$1,
  });
  let TextContentSchema$1 = u({
    type: literal("text"),
    text: string(),
    annotations: AnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ImageContentSchema$1 = u({
    type: literal("image"),
    data: Base64Schema,
    mimeType: string(),
    annotations: AnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let AudioContentSchema$1 = u({
    type: literal("audio"),
    data: Base64Schema,
    mimeType: string(),
    annotations: AnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ToolUseContentSchema$1 = u({
    type: literal("tool_use"),
    name: string(),
    id: string(),
    input: record(string(), unknown()),
    _meta: record(string(), unknown()).optional(),
  });
  let EmbeddedResourceSchema$1 = u({
    type: literal("resource"),
    resource: union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1]),
    annotations: AnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ResourceLinkSchema$1 = ResourceSchema$1.extend({
    type: literal("resource_link"),
  });
  let ContentBlockSchema$1 = union([
    TextContentSchema$1,
    ImageContentSchema$1,
    AudioContentSchema$1,
    ResourceLinkSchema$1,
    EmbeddedResourceSchema$1,
  ]);
  let PromptMessageSchema$1 = u({
    role: RoleSchema$1,
    content: ContentBlockSchema$1,
  });
  let GetPromptResultSchema$1 = ResultSchema$1.extend({
    description: string().optional(),
    messages: array(PromptMessageSchema$1),
  });
  let PromptListChangedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/prompts/list_changed"),
    params: NotificationsParamsSchema$1.optional(),
  });
  let ToolAnnotationsSchema$1 = u({
    title: string().optional(),
    readOnlyHint: M().optional(),
    destructiveHint: M().optional(),
    idempotentHint: M().optional(),
    openWorldHint: M().optional(),
  });
  let ToolExecutionSchema$1 = u({
    taskSupport: _enum(["required", "optional", "forbidden"]).optional(),
  });
  let ToolSchema$1 = u({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    description: string().optional(),
    inputSchema: u({
      type: literal("object"),
      properties: record(string(), JSONValueSchema$1).optional(),
      required: array(string()).optional(),
    }).catchall(unknown()),
    outputSchema: u({
      type: literal("object"),
      properties: record(string(), JSONValueSchema$1).optional(),
      required: array(string()).optional(),
    })
      .catchall(unknown())
      .optional(),
    annotations: ToolAnnotationsSchema$1.optional(),
    execution: ToolExecutionSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ListToolsRequestSchema$1 = PaginatedRequestSchema$1.extend({
    method: literal("tools/list"),
  });
  let ListToolsResultSchema$1 = PaginatedResultSchema$1.extend({
    tools: array(ToolSchema$1),
  });
  let CallToolResultSchema$1 = ResultSchema$1.extend({
    content: array(ContentBlockSchema$1),
    structuredContent: record(string(), unknown()).optional(),
    isError: M().optional(),
  });
  let CallToolRequestParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
    name: string(),
    arguments: record(string(), unknown()).optional(),
  });
  let CallToolRequestSchema$1 = RequestSchema$1.extend({
    method: literal("tools/call"),
    params: CallToolRequestParamsSchema$1,
  });
  let ToolListChangedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/tools/list_changed"),
    params: NotificationsParamsSchema$1.optional(),
  });
  let LoggingLevelSchema$1 = _enum([
    "debug",
    "info",
    "notice",
    "warning",
    "error",
    "critical",
    "alert",
    "emergency",
  ]);
  let SetLevelRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
    level: LoggingLevelSchema$1,
  });
  let SetLevelRequestSchema$1 = RequestSchema$1.extend({
    method: literal("logging/setLevel"),
    params: SetLevelRequestParamsSchema$1,
  });
  let LoggingMessageNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
    level: LoggingLevelSchema$1,
    logger: string().optional(),
    data: unknown(),
  });
  let LoggingMessageNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/message"),
    params: LoggingMessageNotificationParamsSchema$1,
  });
  let ModelHintSchema$1 = u({
    name: string().optional(),
  });
  let ModelPreferencesSchema$1 = u({
    hints: array(ModelHintSchema$1).optional(),
    costPriority: E().min(0).max(1).optional(),
    speedPriority: E().min(0).max(1).optional(),
    intelligencePriority: E().min(0).max(1).optional(),
  });
  let ToolChoiceSchema$1 = u({
    mode: _enum(["auto", "required", "none"]).optional(),
  });
  let ToolResultContentSchema$1 = u({
    type: literal("tool_result"),
    toolUseId: string().describe("The unique identifier for the corresponding tool call."),
    content: array(ContentBlockSchema$1),
    structuredContent: u({}).loose().optional(),
    isError: M().optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let SamplingContentSchema$1 = discriminatedUnion("type", [
    TextContentSchema$1,
    ImageContentSchema$1,
    AudioContentSchema$1,
  ]);
  let SamplingMessageContentBlockSchema$1 = discriminatedUnion("type", [
    TextContentSchema$1,
    ImageContentSchema$1,
    AudioContentSchema$1,
    ToolUseContentSchema$1,
    ToolResultContentSchema$1,
  ]);
  let SamplingMessageSchema$1 = u({
    role: RoleSchema$1,
    content: union([SamplingMessageContentBlockSchema$1, array(SamplingMessageContentBlockSchema$1)]),
    _meta: record(string(), unknown()).optional(),
  });
  let CreateMessageRequestParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
    messages: array(SamplingMessageSchema$1),
    modelPreferences: ModelPreferencesSchema$1.optional(),
    systemPrompt: string().optional(),
    includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
    temperature: E().optional(),
    maxTokens: E().int(),
    stopSequences: array(string()).optional(),
    metadata: JSONObjectSchema$1.optional(),
    tools: array(ToolSchema$1).optional(),
    toolChoice: ToolChoiceSchema$1.optional(),
  });
  let CreateMessageRequestSchema$1 = RequestSchema$1.extend({
    method: literal("sampling/createMessage"),
    params: CreateMessageRequestParamsSchema$1,
  });
  let CreateMessageResultSchema$1 = ResultSchema$1.extend({
    model: string(),
    stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string())),
    role: RoleSchema$1,
    content: SamplingContentSchema$1,
  });
  let CreateMessageResultWithToolsSchema$1 = ResultSchema$1.extend({
    model: string(),
    stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string())),
    role: RoleSchema$1,
    content: union([SamplingMessageContentBlockSchema$1, array(SamplingMessageContentBlockSchema$1)]),
  });
  let BooleanSchemaSchema$1 = u({
    type: literal("boolean"),
    title: string().optional(),
    description: string().optional(),
    default: M().optional(),
  });
  let StringSchemaSchema$1 = u({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    minLength: E().optional(),
    maxLength: E().optional(),
    format: _enum(["email", "uri", "date", "date-time"]).optional(),
    default: string().optional(),
  });
  let NumberSchemaSchema$1 = u({
    type: _enum(["number", "integer"]),
    title: string().optional(),
    description: string().optional(),
    minimum: E().optional(),
    maximum: E().optional(),
    default: E().optional(),
  });
  let UntitledSingleSelectEnumSchemaSchema$1 = u({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    enum: array(string()),
    default: string().optional(),
  });
  let TitledSingleSelectEnumSchemaSchema$1 = u({
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
  let LegacyTitledEnumSchemaSchema$1 = u({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    enum: array(string()),
    enumNames: array(string()).optional(),
    default: string().optional(),
  });
  let SingleSelectEnumSchemaSchema$1 = union([
    UntitledSingleSelectEnumSchemaSchema$1,
    TitledSingleSelectEnumSchemaSchema$1,
  ]);
  let UntitledMultiSelectEnumSchemaSchema$1 = u({
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
  let TitledMultiSelectEnumSchemaSchema$1 = u({
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
  let MultiSelectEnumSchemaSchema$1 = union([
    UntitledMultiSelectEnumSchemaSchema$1,
    TitledMultiSelectEnumSchemaSchema$1,
  ]);
  let EnumSchemaSchema$1 = union([
    LegacyTitledEnumSchemaSchema$1,
    SingleSelectEnumSchemaSchema$1,
    MultiSelectEnumSchemaSchema$1,
  ]);
  let PrimitiveSchemaDefinitionSchema$1 = union([
    EnumSchemaSchema$1,
    BooleanSchemaSchema$1,
    StringSchemaSchema$1,
    NumberSchemaSchema$1,
  ]);
  let ElicitRequestFormParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
    mode: literal("form").optional(),
    message: string(),
    requestedSchema: u({
      type: literal("object"),
      properties: record(string(), PrimitiveSchemaDefinitionSchema$1),
      required: array(string()).optional(),
    }).catchall(unknown()),
  });
  let ElicitRequestURLParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
    mode: literal("url"),
    message: string(),
    elicitationId: string(),
    url: string().url(),
  });
  let ElicitRequestParamsSchema$1 = union([ElicitRequestFormParamsSchema$1, ElicitRequestURLParamsSchema$1]);
  let ElicitRequestSchema$1 = RequestSchema$1.extend({
    method: literal("elicitation/create"),
    params: ElicitRequestParamsSchema$1,
  });
  let ElicitationCompleteNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
    elicitationId: string(),
  });
  let ElicitationCompleteNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/elicitation/complete"),
    params: ElicitationCompleteNotificationParamsSchema$1,
  });
  let ElicitResultSchema$1 = ResultSchema$1.extend({
    action: _enum(["accept", "decline", "cancel"]),
    content: preprocess(
      (val) => (val === null ? undefined : val),
      record(string(), union([string(), E(), M(), array(string())])).optional(),
    ),
  });
  let ResourceTemplateReferenceSchema$1 = u({
    type: literal("ref/resource"),
    uri: string(),
  });
  let PromptReferenceSchema$1 = u({
    type: literal("ref/prompt"),
    name: string(),
  });
  let CompleteRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
    ref: union([PromptReferenceSchema$1, ResourceTemplateReferenceSchema$1]),
    argument: u({
      name: string(),
      value: string(),
    }),
    context: u({
      arguments: record(string(), string()).optional(),
    }).optional(),
  });
  let CompleteRequestSchema$1 = RequestSchema$1.extend({
    method: literal("completion/complete"),
    params: CompleteRequestParamsSchema$1,
  });
  let CompleteResultSchema$1 = ResultSchema$1.extend({
    completion: looseObject({
      values: array(string()).max(100),
      total: optional(E().int()),
      hasMore: optional(M()),
    }),
  });
  let RootSchema$1 = u({
    uri: string().startsWith("file://"),
    name: string().optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ListRootsRequestSchema$1 = RequestSchema$1.extend({
    method: literal("roots/list"),
    params: BaseRequestParamsSchema$1.optional(),
  });
  let ListRootsResultSchema$1 = ResultSchema$1.extend({
    roots: array(RootSchema$1),
  });
  let RootsListChangedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/roots/list_changed"),
    params: NotificationsParamsSchema$1.optional(),
  });
  let TaskCreationParamsSchema$1 = looseObject({
    ttl: E().optional(),
    pollInterval: E().optional(),
  });
  let TaskStatusSchema$1 = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
  let TaskSchema$1 = u({
    taskId: string(),
    status: TaskStatusSchema$1,
    ttl: union([E(), zg()]),
    createdAt: string(),
    lastUpdatedAt: string(),
    pollInterval: optional(E()),
    statusMessage: optional(string()),
  });
  let CreateTaskResultSchema$1 = ResultSchema$1.extend({
    task: TaskSchema$1,
  });
  let TaskStatusNotificationParamsSchema$1 = NotificationsParamsSchema$1.merge(TaskSchema$1);
  let TaskStatusNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/tasks/status"),
    params: TaskStatusNotificationParamsSchema$1,
  });
  let GetTaskRequestSchema$1 = RequestSchema$1.extend({
    method: literal("tasks/get"),
    params: BaseRequestParamsSchema$1.extend({
      taskId: string(),
    }),
  });
  let GetTaskResultSchema$1 = ResultSchema$1.merge(TaskSchema$1);
  let GetTaskPayloadRequestSchema$1 = RequestSchema$1.extend({
    method: literal("tasks/result"),
    params: BaseRequestParamsSchema$1.extend({
      taskId: string(),
    }),
  });
  let GetTaskPayloadResultSchema$1 = ResultSchema$1.loose();
  let ListTasksRequestSchema$1 = PaginatedRequestSchema$1.extend({
    method: literal("tasks/list"),
  });
  let ListTasksResultSchema$1 = PaginatedResultSchema$1.extend({
    tasks: array(TaskSchema$1),
  });
  let CancelTaskRequestSchema$1 = RequestSchema$1.extend({
    method: literal("tasks/cancel"),
    params: BaseRequestParamsSchema$1.extend({
      taskId: string(),
    }),
  });
  return {
    JSONValueSchema: JSONValueSchema$1,
    JSONObjectSchema: JSONObjectSchema$1,
    ProgressTokenSchema: ProgressTokenSchema$1,
    CursorSchema: CursorSchema$1,
    TaskMetadataSchema: TaskMetadataSchema$1,
    RelatedTaskMetadataSchema: RelatedTaskMetadataSchema$1,
    RequestMetaSchema: RequestMetaSchema$1,
    BaseRequestParamsSchema: BaseRequestParamsSchema$1,
    TaskAugmentedRequestParamsSchema: TaskAugmentedRequestParamsSchema$1,
    RequestSchema: RequestSchema$1,
    NotificationsParamsSchema: NotificationsParamsSchema$1,
    NotificationSchema: NotificationSchema$1,
    ResultSchema: ResultSchema$1,
    RequestIdSchema: RequestIdSchema$1,
    EmptyResultSchema: EmptyResultSchema$1,
    CancelledNotificationParamsSchema: CancelledNotificationParamsSchema$1,
    CancelledNotificationSchema: CancelledNotificationSchema$1,
    IconSchema: IconSchema$1,
    IconsSchema: IconsSchema$1,
    BaseMetadataSchema: BaseMetadataSchema$1,
    ImplementationSchema: ImplementationSchema$1,
    ClientTasksCapabilitySchema: ClientTasksCapabilitySchema$1,
    ServerTasksCapabilitySchema: ServerTasksCapabilitySchema$1,
    ClientCapabilitiesSchema: ClientCapabilitiesSchema$1,
    InitializeRequestParamsSchema: InitializeRequestParamsSchema$1,
    InitializeRequestSchema: InitializeRequestSchema$1,
    ServerCapabilitiesSchema: ServerCapabilitiesSchema$1,
    InitializeResultSchema: InitializeResultSchema$1,
    InitializedNotificationSchema: InitializedNotificationSchema$1,
    PingRequestSchema: PingRequestSchema$1,
    ProgressSchema: ProgressSchema$1,
    ProgressNotificationParamsSchema: ProgressNotificationParamsSchema$1,
    ProgressNotificationSchema: ProgressNotificationSchema$1,
    PaginatedRequestParamsSchema: PaginatedRequestParamsSchema$1,
    PaginatedRequestSchema: PaginatedRequestSchema$1,
    PaginatedResultSchema: PaginatedResultSchema$1,
    ResourceContentsSchema: ResourceContentsSchema$1,
    TextResourceContentsSchema: TextResourceContentsSchema$1,
    BlobResourceContentsSchema: BlobResourceContentsSchema$1,
    RoleSchema: RoleSchema$1,
    AnnotationsSchema: AnnotationsSchema$1,
    ResourceSchema: ResourceSchema$1,
    ResourceTemplateSchema: ResourceTemplateSchema$1,
    ListResourcesRequestSchema: ListResourcesRequestSchema$1,
    ListResourcesResultSchema: ListResourcesResultSchema$1,
    ListResourceTemplatesRequestSchema: ListResourceTemplatesRequestSchema$1,
    ListResourceTemplatesResultSchema: ListResourceTemplatesResultSchema$1,
    ResourceRequestParamsSchema: ResourceRequestParamsSchema$1,
    ReadResourceRequestParamsSchema: ReadResourceRequestParamsSchema$1,
    ReadResourceRequestSchema: ReadResourceRequestSchema$1,
    ReadResourceResultSchema: ReadResourceResultSchema$1,
    ResourceListChangedNotificationSchema: ResourceListChangedNotificationSchema$1,
    SubscribeRequestParamsSchema: SubscribeRequestParamsSchema$1,
    SubscribeRequestSchema: SubscribeRequestSchema$1,
    UnsubscribeRequestParamsSchema: UnsubscribeRequestParamsSchema$1,
    UnsubscribeRequestSchema: UnsubscribeRequestSchema$1,
    ResourceUpdatedNotificationParamsSchema: ResourceUpdatedNotificationParamsSchema$1,
    ResourceUpdatedNotificationSchema: ResourceUpdatedNotificationSchema$1,
    PromptArgumentSchema: PromptArgumentSchema$1,
    PromptSchema: PromptSchema$1,
    ListPromptsRequestSchema: ListPromptsRequestSchema$1,
    ListPromptsResultSchema: ListPromptsResultSchema$1,
    GetPromptRequestParamsSchema: GetPromptRequestParamsSchema$1,
    GetPromptRequestSchema: GetPromptRequestSchema$1,
    TextContentSchema: TextContentSchema$1,
    ImageContentSchema: ImageContentSchema$1,
    AudioContentSchema: AudioContentSchema$1,
    ToolUseContentSchema: ToolUseContentSchema$1,
    EmbeddedResourceSchema: EmbeddedResourceSchema$1,
    ResourceLinkSchema: ResourceLinkSchema$1,
    ContentBlockSchema: ContentBlockSchema$1,
    PromptMessageSchema: PromptMessageSchema$1,
    GetPromptResultSchema: GetPromptResultSchema$1,
    PromptListChangedNotificationSchema: PromptListChangedNotificationSchema$1,
    ToolAnnotationsSchema: ToolAnnotationsSchema$1,
    ToolExecutionSchema: ToolExecutionSchema$1,
    ToolSchema: ToolSchema$1,
    ListToolsRequestSchema: ListToolsRequestSchema$1,
    ListToolsResultSchema: ListToolsResultSchema$1,
    CallToolResultSchema: CallToolResultSchema$1,
    CallToolRequestParamsSchema: CallToolRequestParamsSchema$1,
    CallToolRequestSchema: CallToolRequestSchema$1,
    ToolListChangedNotificationSchema: ToolListChangedNotificationSchema$1,
    LoggingLevelSchema: LoggingLevelSchema$1,
    SetLevelRequestParamsSchema: SetLevelRequestParamsSchema$1,
    SetLevelRequestSchema: SetLevelRequestSchema$1,
    LoggingMessageNotificationParamsSchema: LoggingMessageNotificationParamsSchema$1,
    LoggingMessageNotificationSchema: LoggingMessageNotificationSchema$1,
    ModelHintSchema: ModelHintSchema$1,
    ModelPreferencesSchema: ModelPreferencesSchema$1,
    ToolChoiceSchema: ToolChoiceSchema$1,
    ToolResultContentSchema: ToolResultContentSchema$1,
    SamplingContentSchema: SamplingContentSchema$1,
    SamplingMessageContentBlockSchema: SamplingMessageContentBlockSchema$1,
    SamplingMessageSchema: SamplingMessageSchema$1,
    CreateMessageRequestParamsSchema: CreateMessageRequestParamsSchema$1,
    CreateMessageRequestSchema: CreateMessageRequestSchema$1,
    CreateMessageResultSchema: CreateMessageResultSchema$1,
    CreateMessageResultWithToolsSchema: CreateMessageResultWithToolsSchema$1,
    BooleanSchemaSchema: BooleanSchemaSchema$1,
    StringSchemaSchema: StringSchemaSchema$1,
    NumberSchemaSchema: NumberSchemaSchema$1,
    UntitledSingleSelectEnumSchemaSchema: UntitledSingleSelectEnumSchemaSchema$1,
    TitledSingleSelectEnumSchemaSchema: TitledSingleSelectEnumSchemaSchema$1,
    LegacyTitledEnumSchemaSchema: LegacyTitledEnumSchemaSchema$1,
    SingleSelectEnumSchemaSchema: SingleSelectEnumSchemaSchema$1,
    UntitledMultiSelectEnumSchemaSchema: UntitledMultiSelectEnumSchemaSchema$1,
    TitledMultiSelectEnumSchemaSchema: TitledMultiSelectEnumSchemaSchema$1,
    MultiSelectEnumSchemaSchema: MultiSelectEnumSchemaSchema$1,
    EnumSchemaSchema: EnumSchemaSchema$1,
    PrimitiveSchemaDefinitionSchema: PrimitiveSchemaDefinitionSchema$1,
    ElicitRequestFormParamsSchema: ElicitRequestFormParamsSchema$1,
    ElicitRequestURLParamsSchema: ElicitRequestURLParamsSchema$1,
    ElicitRequestParamsSchema: ElicitRequestParamsSchema$1,
    ElicitRequestSchema: ElicitRequestSchema$1,
    ElicitationCompleteNotificationParamsSchema: ElicitationCompleteNotificationParamsSchema$1,
    ElicitationCompleteNotificationSchema: ElicitationCompleteNotificationSchema$1,
    ElicitResultSchema: ElicitResultSchema$1,
    ResourceTemplateReferenceSchema: ResourceTemplateReferenceSchema$1,
    PromptReferenceSchema: PromptReferenceSchema$1,
    CompleteRequestParamsSchema: CompleteRequestParamsSchema$1,
    CompleteRequestSchema: CompleteRequestSchema$1,
    CompleteResultSchema: CompleteResultSchema$1,
    RootSchema: RootSchema$1,
    ListRootsRequestSchema: ListRootsRequestSchema$1,
    ListRootsResultSchema: ListRootsResultSchema$1,
    RootsListChangedNotificationSchema: RootsListChangedNotificationSchema$1,
    TaskCreationParamsSchema: TaskCreationParamsSchema$1,
    TaskStatusSchema: TaskStatusSchema$1,
    TaskSchema: TaskSchema$1,
    CreateTaskResultSchema: CreateTaskResultSchema$1,
    TaskStatusNotificationParamsSchema: TaskStatusNotificationParamsSchema$1,
    TaskStatusNotificationSchema: TaskStatusNotificationSchema$1,
    GetTaskRequestSchema: GetTaskRequestSchema$1,
    GetTaskResultSchema: GetTaskResultSchema$1,
    GetTaskPayloadRequestSchema: GetTaskPayloadRequestSchema$1,
    GetTaskPayloadResultSchema: GetTaskPayloadResultSchema$1,
    ListTasksRequestSchema: ListTasksRequestSchema$1,
    ListTasksResultSchema: ListTasksResultSchema$1,
    CancelTaskRequestSchema: CancelTaskRequestSchema$1,
    CancelTaskResultSchema: ResultSchema$1.merge(TaskSchema$1),
    ClientRequestSchema: union([
      PingRequestSchema$1,
      InitializeRequestSchema$1,
      CompleteRequestSchema$1,
      SetLevelRequestSchema$1,
      GetPromptRequestSchema$1,
      ListPromptsRequestSchema$1,
      ListResourcesRequestSchema$1,
      ListResourceTemplatesRequestSchema$1,
      ReadResourceRequestSchema$1,
      SubscribeRequestSchema$1,
      UnsubscribeRequestSchema$1,
      CallToolRequestSchema$1,
      ListToolsRequestSchema$1,
      GetTaskRequestSchema$1,
      GetTaskPayloadRequestSchema$1,
      ListTasksRequestSchema$1,
      CancelTaskRequestSchema$1,
    ]),
    ClientNotificationSchema: union([
      CancelledNotificationSchema$1,
      ProgressNotificationSchema$1,
      InitializedNotificationSchema$1,
      RootsListChangedNotificationSchema$1,
      TaskStatusNotificationSchema$1,
    ]),
    ClientResultSchema: union([
      EmptyResultSchema$1,
      CreateMessageResultSchema$1,
      CreateMessageResultWithToolsSchema$1,
      ElicitResultSchema$1,
      ListRootsResultSchema$1,
      GetTaskResultSchema$1,
      ListTasksResultSchema$1,
      CreateTaskResultSchema$1,
    ]),
    ServerRequestSchema: union([
      PingRequestSchema$1,
      CreateMessageRequestSchema$1,
      ElicitRequestSchema$1,
      ListRootsRequestSchema$1,
      GetTaskRequestSchema$1,
      GetTaskPayloadRequestSchema$1,
      ListTasksRequestSchema$1,
      CancelTaskRequestSchema$1,
    ]),
    ServerNotificationSchema: union([
      CancelledNotificationSchema$1,
      ProgressNotificationSchema$1,
      LoggingMessageNotificationSchema$1,
      ResourceUpdatedNotificationSchema$1,
      ResourceListChangedNotificationSchema$1,
      ToolListChangedNotificationSchema$1,
      PromptListChangedNotificationSchema$1,
      TaskStatusNotificationSchema$1,
      ElicitationCompleteNotificationSchema$1,
    ]),
    ServerResultSchema: union([
      EmptyResultSchema$1,
      InitializeResultSchema$1,
      CompleteResultSchema$1,
      GetPromptResultSchema$1,
      ListPromptsResultSchema$1,
      ListResourcesResultSchema$1,
      ListResourceTemplatesResultSchema$1,
      ReadResourceResultSchema$1,
      CallToolResultSchema$1,
      ListToolsResultSchema$1,
      GetTaskResultSchema$1,
      ListTasksResultSchema$1,
      CreateTaskResultSchema$1,
    ]),
    CallToolResultWireSchema: unknown()
      .superRefine((value, ctx) => {
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value) ||
          value.content !== undefined
        )
          return;
        for (let key of TOOL_RESULT_FOREIGN_FAMILY_KEYS)
          if (key in value) {
            ctx.addIssue({
              code: "custom",
              message: `content is required when the body carries '${key}' \u2014 another result family cannot default into an empty tools/call success`,
            });
            return;
          }
      })
      .transform(normalizeContentlessToolResult)
      .pipe(CallToolResultSchema$1),
  };
}
//@ chunk-r1g76qsy.js:37310-37317 esm-layout
var memo$1;
//@ chunk-r1g76qsy.js:37317-37348 esm-layout
function buildSchemas2025() {
  return (memo$1 ??= build$1());
}
//@ chunk-r1g76qsy.js:37348-37388 esm-layout
function isNonObjectJsonSchemaRoot(json) {
  return json.type !== "object";
}
//@ chunk-r1g76qsy.js:37388-37530 esm-fingerprint
var REF_REWRITE_DATA_POSITION_KEYS = new Set(["const", "enum", "default", "examples"]);
var REF_REWRITE_NAME_MAP_KEYS = new Set([
  "properties",
  "patternProperties",
  "$defs",
  "definitions",
  "dependentSchemas",
]);
//@ chunk-r1g76qsy.js:37530-38232 esm-fingerprint
function wrapOutputSchemaForLegacy(natural) {
  let $schema = typeof natural.$schema === "string" ? natural.$schema : undefined;
  if (natural.$id !== undefined)
    return {
      ...($schema !== undefined && {
        $schema,
      }),
      type: "object",
      properties: {
        result: natural,
      },
      required: ["result"],
    };
  let rewriteRefs = (node, parentIsNameMap) => {
    if (Array.isArray(node)) return node.map((item) => rewriteRefs(item, false));
    if (node === null || typeof node !== "object") return node;
    if (!parentIsNameMap && node.$id !== undefined) return node;
    let out = {};
    for (let [k, v] of Object.entries(node))
      if (parentIsNameMap) out[k] = rewriteRefs(v, false);
      else if ((k === "$ref" || k === "$dynamicRef") && typeof v === "string")
        out[k] =
          v === "#" ? "#/properties/result" : v.startsWith("#/") ? `#/properties/result${v.slice(1)}` : v;
      else if (REF_REWRITE_DATA_POSITION_KEYS.has(k)) out[k] = v;
      else if (REF_REWRITE_NAME_MAP_KEYS.has(k)) out[k] = rewriteRefs(v, true);
      else out[k] = rewriteRefs(v, false);
    return out;
  };
  return {
    ...($schema !== undefined && {
      $schema,
    }),
    type: "object",
    properties: {
      result: rewriteRefs(natural, false),
    },
    required: ["result"],
  };
}
//@ chunk-r1g76qsy.js:38232-39449 esm-fingerprint
var requestMethodKeys$1 = {
  ping: null,
  initialize: null,
  "completion/complete": null,
  "logging/setLevel": null,
  "prompts/get": null,
  "prompts/list": null,
  "resources/list": null,
  "resources/templates/list": null,
  "resources/read": null,
  "resources/subscribe": null,
  "resources/unsubscribe": null,
  "tools/call": null,
  "tools/list": null,
  "tasks/get": null,
  "tasks/result": null,
  "tasks/list": null,
  "tasks/cancel": null,
  "sampling/createMessage": null,
  "elicitation/create": null,
  "roots/list": null,
};
var notificationMethodKeys$1 = {
  "notifications/cancelled": null,
  "notifications/progress": null,
  "notifications/initialized": null,
  "notifications/roots/list_changed": null,
  "notifications/tasks/status": null,
  "notifications/message": null,
  "notifications/resources/updated": null,
  "notifications/resources/list_changed": null,
  "notifications/tools/list_changed": null,
  "notifications/prompts/list_changed": null,
  "notifications/elicitation/complete": null,
};
var resultMethodKeys = {
  ping: null,
  initialize: null,
  "completion/complete": null,
  "logging/setLevel": null,
  "prompts/get": null,
  "prompts/list": null,
  "resources/list": null,
  "resources/templates/list": null,
  "resources/read": null,
  "resources/subscribe": null,
  "resources/unsubscribe": null,
  "tools/call": null,
  "tools/list": null,
  "sampling/createMessage": null,
  "elicitation/create": null,
  "roots/list": null,
};
var maps$1;
//@ chunk-r1g76qsy.js:39449-41827 esm-fingerprint
function registryMaps() {
  if (maps$1) return maps$1;
  let s = buildSchemas2025();
  maps$1 = {
    requestSchemas: {
      ping: s.PingRequestSchema,
      initialize: s.InitializeRequestSchema,
      "completion/complete": s.CompleteRequestSchema,
      "logging/setLevel": s.SetLevelRequestSchema,
      "prompts/get": s.GetPromptRequestSchema,
      "prompts/list": s.ListPromptsRequestSchema,
      "resources/list": s.ListResourcesRequestSchema,
      "resources/templates/list": s.ListResourceTemplatesRequestSchema,
      "resources/read": s.ReadResourceRequestSchema,
      "resources/subscribe": s.SubscribeRequestSchema,
      "resources/unsubscribe": s.UnsubscribeRequestSchema,
      "tools/call": s.CallToolRequestSchema,
      "tools/list": s.ListToolsRequestSchema,
      "tasks/get": s.GetTaskRequestSchema,
      "tasks/result": s.GetTaskPayloadRequestSchema,
      "tasks/list": s.ListTasksRequestSchema,
      "tasks/cancel": s.CancelTaskRequestSchema,
      "sampling/createMessage": s.CreateMessageRequestSchema,
      "elicitation/create": s.ElicitRequestSchema,
      "roots/list": s.ListRootsRequestSchema,
    },
    notificationSchemas: {
      "notifications/cancelled": s.CancelledNotificationSchema,
      "notifications/progress": s.ProgressNotificationSchema,
      "notifications/initialized": s.InitializedNotificationSchema,
      "notifications/roots/list_changed": s.RootsListChangedNotificationSchema,
      "notifications/tasks/status": s.TaskStatusNotificationSchema,
      "notifications/message": s.LoggingMessageNotificationSchema,
      "notifications/resources/updated": s.ResourceUpdatedNotificationSchema,
      "notifications/resources/list_changed": s.ResourceListChangedNotificationSchema,
      "notifications/tools/list_changed": s.ToolListChangedNotificationSchema,
      "notifications/prompts/list_changed": s.PromptListChangedNotificationSchema,
      "notifications/elicitation/complete": s.ElicitationCompleteNotificationSchema,
    },
    resultSchemas: {
      ping: s.EmptyResultSchema,
      initialize: s.InitializeResultSchema,
      "completion/complete": s.CompleteResultSchema,
      "logging/setLevel": s.EmptyResultSchema,
      "prompts/get": s.GetPromptResultSchema,
      "prompts/list": s.ListPromptsResultSchema,
      "resources/list": s.ListResourcesResultSchema,
      "resources/templates/list": s.ListResourceTemplatesResultSchema,
      "resources/read": s.ReadResourceResultSchema,
      "resources/subscribe": s.EmptyResultSchema,
      "resources/unsubscribe": s.EmptyResultSchema,
      "tools/call": s.CallToolResultWireSchema,
      "tools/list": s.ListToolsResultSchema,
      "sampling/createMessage": s.CreateMessageResultWithToolsSchema,
      "elicitation/create": s.ElicitResultSchema,
      "roots/list": s.ListRootsResultSchema,
    },
  };
  return maps$1;
}
//@ chunk-r1g76qsy.js:41827-41892 esm-fingerprint
function hasRequestMethod2025(method) {
  return Object.prototype.hasOwnProperty.call(requestMethodKeys$1, method);
}
//@ chunk-r1g76qsy.js:41892-41957 esm-fingerprint
function hasNotificationMethod2025(method) {
  return Object.prototype.hasOwnProperty.call(notificationMethodKeys$1, method);
}
//@ chunk-r1g76qsy.js:41957-42022 esm-fingerprint
function hasResultMethod(method) {
  return Object.prototype.hasOwnProperty.call(resultMethodKeys, method);
}
//@ chunk-r1g76qsy.js:42022-42079 esm-fingerprint
function getResultSchema(method) {
  return hasResultMethod(method) ? registryMaps().resultSchemas[method] : undefined;
}
//@ chunk-r1g76qsy.js:42079-42137 esm-fingerprint
function getRequestSchema(method) {
  return hasRequestMethod2025(method) ? registryMaps().requestSchemas[method] : undefined;
}
//@ chunk-r1g76qsy.js:42137-42200 esm-fingerprint
function getNotificationSchema(method) {
  return hasNotificationMethod2025(method) ? registryMaps().notificationSchemas[method] : undefined;
}
//@ chunk-r1g76qsy.js:42200-42242 esm-layout
var keys = Object.keys(requestMethodKeys$1);
var keys_2 = Object.keys(notificationMethodKeys$1);
//@ chunk-r1g76qsy.js:42242-42313 esm-fingerprint
function isPlainObject$4(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
//@ chunk-r1g76qsy.js:42313-42486 esm-fingerprint
function triState$1(schema, raw) {
  if (schema === undefined)
    return {
      ok: false,
      reason: "not-in-era",
    };
  let parsed = schema.safeParse(raw);
  return parsed.success
    ? {
        ok: true,
        value: parsed.data,
      }
    : {
        ok: false,
        reason: "invalid",
        message: String(parsed.error),
      };
}
//@ chunk-r1g76qsy.js:42486-42521 esm-fingerprint
var NOT_IN_ERA$1 = {
  ok: false,
  reason: "not-in-era",
};
//@ chunk-r1g76qsy.js:42521-42589 esm-layout
function toolNeedsLegacyWrap(t) {
  return isPlainObject$4(t) && isPlainObject$4(t.outputSchema) && isNonObjectJsonSchemaRoot(t.outputSchema);
}
//@ chunk-r1g76qsy.js:42589-42613 esm-layout
function toNeutralResult(value) {
  return value;
}
//@ chunk-r1g76qsy.js:42613-43703 esm-fingerprint
var rev2025Codec = {
  era: "2025-11-25",
  hasRequestMethod: hasRequestMethod2025,
  hasNotificationMethod: hasNotificationMethod2025,
  validateRequest: (method, raw) => triState$1(getRequestSchema(method), raw),
  validateResult: (method, raw) => triState$1(getResultSchema(method), raw),
  validateNotification: (method, raw) => triState$1(getNotificationSchema(method), raw),
  hasInputRequestMethod: () => false,
  validateInputRequest: () => NOT_IN_ERA$1,
  validateInputResponse: () => NOT_IN_ERA$1,
  samplingResultVariant: (hasTools, raw) => {
    let s = buildSchemas2025();
    return triState$1(hasTools ? s.CreateMessageResultWithToolsSchema : s.CreateMessageResultSchema, raw);
  },
  outboundEnvelope: (_material) => {
    return;
  },
  validateEnvelopeMeta: (_meta) => [],
  projectCallToolResult(result, advertisedOutputSchema) {
    let withText = appendTextFallbackForNonObject(result);
    let sc = withText.structuredContent;
    if (sc === undefined) return withText;
    let valueIsNonObject = typeof sc !== "object" || sc === null || Array.isArray(sc);
    let schemaWrapped =
      advertisedOutputSchema !== undefined && isNonObjectJsonSchemaRoot(advertisedOutputSchema);
    if (!valueIsNonObject && !schemaWrapped) return withText;
    return {
      ...withText,
      structuredContent: {
        result: sc,
      },
    };
  },
  decodeResult(_method, raw) {
    if (isPlainObject$4(raw) && "resultType" in raw) {
      let stripped = {
        ...raw,
      };
      delete stripped.resultType;
      return {
        kind: "complete",
        result: toNeutralResult(stripped),
      };
    }
    return {
      kind: "complete",
      result: toNeutralResult(raw),
    };
  },
  encodeResult(method, result) {
    if (method !== "tools/list") return result;
    let tools = result.tools;
    if (!Array.isArray(tools) || !tools.some((t) => toolNeedsLegacyWrap(t))) return result;
    return {
      ...result,
      tools: tools.map((t) =>
        toolNeedsLegacyWrap(t)
          ? {
              ...t,
              outputSchema: wrapOutputSchemaForLegacy(t.outputSchema),
            }
          : t,
      ),
    };
  },
  encodeErrorCode: (code) => (code === -32002 ? -32602 : code),
  checkInboundEnvelope: (_material) => {
    return;
  },
};
//@ chunk-r1g76qsy.js:43703-59401 esm-fingerprint
function build() {
  let JSONValueSchema$1 = lazy(() =>
    union([string(), E(), M(), zg(), record(string(), JSONValueSchema$1), array(JSONValueSchema$1)]),
  );
  let JSONObjectSchema$1 = record(string(), JSONValueSchema$1);
  let ProgressTokenSchema$1 = union([string(), E().int()]);
  let CursorSchema$1 = string();
  let RequestIdSchema$1 = union([string(), E().int()]);
  let RoleSchema$1 = _enum(["user", "assistant"]);
  let LoggingLevelSchema$1 = _enum([
    "debug",
    "info",
    "notice",
    "warning",
    "error",
    "critical",
    "alert",
    "emergency",
  ]);
  let Base64Schema = string().refine(
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
  let TaskMetadataSchema$1 = u({
    ttl: E().optional(),
  });
  let RelatedTaskMetadataSchema$1 = u({
    taskId: string(),
  });
  let RequestMetaSchema$1 = looseObject({
    progressToken: ProgressTokenSchema$1.optional(),
    "io.modelcontextprotocol/related-task": RelatedTaskMetadataSchema$1.optional(),
  });
  let BaseRequestParamsSchema$1 = u({
    _meta: RequestMetaSchema$1.optional(),
  });
  let TaskAugmentedRequestParamsSchema$1 = BaseRequestParamsSchema$1.extend({
    task: TaskMetadataSchema$1.optional(),
  });
  let NotificationsParamsSchema$1 = u({
    _meta: RequestMetaSchema$1.optional(),
  });
  let NotificationSchema$1 = u({
    method: string(),
    params: NotificationsParamsSchema$1.loose().optional(),
  });
  let IconSchema$1 = u({
    src: string(),
    mimeType: string().optional(),
    sizes: array(string()).optional(),
    theme: _enum(["light", "dark"]).optional(),
  });
  let IconsSchema$1 = u({
    icons: array(IconSchema$1).optional(),
  });
  let BaseMetadataSchema$1 = u({
    name: string(),
    title: string().optional(),
  });
  let ImplementationSchema$1 = BaseMetadataSchema$1.extend({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    version: string(),
    websiteUrl: string().optional(),
    description: string().optional(),
  });
  let FormElicitationCapabilitySchema = intersection(
    u({
      applyDefaults: M().optional(),
    }),
    JSONObjectSchema$1,
  );
  let ElicitationCapabilitySchema = preprocess(
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
        url: JSONObjectSchema$1.optional(),
      }),
      JSONObjectSchema$1.optional(),
    ),
  );
  let ClientTasksCapabilitySchema$1 = looseObject({
    list: JSONObjectSchema$1.optional(),
    cancel: JSONObjectSchema$1.optional(),
    requests: looseObject({
      sampling: looseObject({
        createMessage: JSONObjectSchema$1.optional(),
      }).optional(),
      elicitation: looseObject({
        create: JSONObjectSchema$1.optional(),
      }).optional(),
    }).optional(),
  });
  let ServerTasksCapabilitySchema$1 = looseObject({
    list: JSONObjectSchema$1.optional(),
    cancel: JSONObjectSchema$1.optional(),
    requests: looseObject({
      tools: looseObject({
        call: JSONObjectSchema$1.optional(),
      }).optional(),
    }).optional(),
  });
  let ClientCapabilitiesSchema$1 = u({
    experimental: record(string(), JSONObjectSchema$1).optional(),
    sampling: u({
      context: JSONObjectSchema$1.optional(),
      tools: JSONObjectSchema$1.optional(),
    }).optional(),
    elicitation: ElicitationCapabilitySchema.optional(),
    roots: u({
      listChanged: M().optional(),
    }).optional(),
    tasks: ClientTasksCapabilitySchema$1.optional(),
    extensions: record(string(), JSONObjectSchema$1).optional(),
  });
  let ServerCapabilitiesSchema$1 = u({
    experimental: record(string(), JSONObjectSchema$1).optional(),
    logging: JSONObjectSchema$1.optional(),
    completions: JSONObjectSchema$1.optional(),
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
    tasks: ServerTasksCapabilitySchema$1.optional(),
    extensions: record(string(), JSONObjectSchema$1).optional(),
  });
  let ProgressSchema$1 = u({
    progress: E(),
    total: optional(E()),
    message: optional(string()),
  });
  let ProgressNotificationParamsSchema$1 = u({
    ...NotificationsParamsSchema$1.shape,
    ...ProgressSchema$1.shape,
    progressToken: ProgressTokenSchema$1,
  });
  let ProgressNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/progress"),
    params: ProgressNotificationParamsSchema$1,
  });
  let LoggingMessageNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
    level: LoggingLevelSchema$1,
    logger: string().optional(),
    data: unknown(),
  });
  let LoggingMessageNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/message"),
    params: LoggingMessageNotificationParamsSchema$1,
  });
  let ResourceContentsSchema$1 = u({
    uri: string(),
    mimeType: optional(string()),
    _meta: record(string(), unknown()).optional(),
  });
  let TextResourceContentsSchema$1 = ResourceContentsSchema$1.extend({
    text: string(),
  });
  let BlobResourceContentsSchema$1 = ResourceContentsSchema$1.extend({
    blob: Base64Schema,
  });
  let AnnotationsSchema$1 = u({
    audience: array(RoleSchema$1).optional(),
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
  let ResourceSchema$1 = u({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    uri: string(),
    description: optional(string()),
    mimeType: optional(string()),
    size: optional(E()),
    annotations: AnnotationsSchema$1.optional(),
    _meta: optional(looseObject({})),
  });
  let ResourceTemplateSchema$1 = u({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    uriTemplate: string(),
    description: optional(string()),
    mimeType: optional(string()),
    annotations: AnnotationsSchema$1.optional(),
    _meta: optional(looseObject({})),
  });
  let ResourceListChangedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/resources/list_changed"),
    params: NotificationsParamsSchema$1.optional(),
  });
  let ResourceUpdatedNotificationParamsSchema$1 = NotificationsParamsSchema$1.extend({
    uri: string(),
  });
  let ResourceUpdatedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/resources/updated"),
    params: ResourceUpdatedNotificationParamsSchema$1,
  });
  let PromptArgumentSchema$1 = u({
    name: string(),
    description: optional(string()),
    required: optional(M()),
  });
  let PromptSchema$1 = u({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    description: optional(string()),
    arguments: optional(array(PromptArgumentSchema$1)),
    _meta: optional(looseObject({})),
  });
  let PromptListChangedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/prompts/list_changed"),
    params: NotificationsParamsSchema$1.optional(),
  });
  let TextContentSchema$1 = u({
    type: literal("text"),
    text: string(),
    annotations: AnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ImageContentSchema$1 = u({
    type: literal("image"),
    data: Base64Schema,
    mimeType: string(),
    annotations: AnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let AudioContentSchema$1 = u({
    type: literal("audio"),
    data: Base64Schema,
    mimeType: string(),
    annotations: AnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ToolUseContentSchema$1 = u({
    type: literal("tool_use"),
    name: string(),
    id: string(),
    input: record(string(), unknown()),
    _meta: record(string(), unknown()).optional(),
  });
  let EmbeddedResourceSchema$1 = u({
    type: literal("resource"),
    resource: union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1]),
    annotations: AnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ResourceLinkSchema$1 = ResourceSchema$1.extend({
    type: literal("resource_link"),
  });
  let ContentBlockSchema$1 = union([
    TextContentSchema$1,
    ImageContentSchema$1,
    AudioContentSchema$1,
    ResourceLinkSchema$1,
    EmbeddedResourceSchema$1,
  ]);
  let PromptMessageSchema$1 = u({
    role: RoleSchema$1,
    content: ContentBlockSchema$1,
  });
  let ToolAnnotationsSchema$1 = u({
    title: string().optional(),
    readOnlyHint: M().optional(),
    destructiveHint: M().optional(),
    idempotentHint: M().optional(),
    openWorldHint: M().optional(),
  });
  let ToolListChangedNotificationSchema$1 = NotificationSchema$1.extend({
    method: literal("notifications/tools/list_changed"),
    params: NotificationsParamsSchema$1.optional(),
  });
  let ModelHintSchema$1 = u({
    name: string().optional(),
  });
  let ModelPreferencesSchema$1 = u({
    hints: array(ModelHintSchema$1).optional(),
    costPriority: E().min(0).max(1).optional(),
    speedPriority: E().min(0).max(1).optional(),
    intelligencePriority: E().min(0).max(1).optional(),
  });
  let ToolChoiceSchema$1 = u({
    mode: _enum(["auto", "required", "none"]).optional(),
  });
  let BooleanSchemaSchema$1 = u({
    type: literal("boolean"),
    title: string().optional(),
    description: string().optional(),
    default: M().optional(),
  });
  let StringSchemaSchema$1 = u({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    minLength: E().optional(),
    maxLength: E().optional(),
    format: _enum(["email", "uri", "date", "date-time"]).optional(),
    default: string().optional(),
  });
  let NumberSchemaSchema$1 = u({
    type: _enum(["number", "integer"]),
    title: string().optional(),
    description: string().optional(),
    minimum: E().optional(),
    maximum: E().optional(),
    default: E().optional(),
  });
  let UntitledSingleSelectEnumSchemaSchema$1 = u({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    enum: array(string()),
    default: string().optional(),
  });
  let TitledSingleSelectEnumSchemaSchema$1 = u({
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
  let LegacyTitledEnumSchemaSchema$1 = u({
    type: literal("string"),
    title: string().optional(),
    description: string().optional(),
    enum: array(string()),
    enumNames: array(string()).optional(),
    default: string().optional(),
  });
  let SingleSelectEnumSchemaSchema$1 = union([
    UntitledSingleSelectEnumSchemaSchema$1,
    TitledSingleSelectEnumSchemaSchema$1,
  ]);
  let UntitledMultiSelectEnumSchemaSchema$1 = u({
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
  let TitledMultiSelectEnumSchemaSchema$1 = u({
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
  let MultiSelectEnumSchemaSchema$1 = union([
    UntitledMultiSelectEnumSchemaSchema$1,
    TitledMultiSelectEnumSchemaSchema$1,
  ]);
  let EnumSchemaSchema$1 = union([
    LegacyTitledEnumSchemaSchema$1,
    SingleSelectEnumSchemaSchema$1,
    MultiSelectEnumSchemaSchema$1,
  ]);
  let PrimitiveSchemaDefinitionSchema$1 = union([
    EnumSchemaSchema$1,
    BooleanSchemaSchema$1,
    StringSchemaSchema$1,
    NumberSchemaSchema$1,
  ]);
  let ElicitRequestFormParamsSchema$1 = TaskAugmentedRequestParamsSchema$1.extend({
    mode: literal("form").optional(),
    message: string(),
    requestedSchema: u({
      type: literal("object"),
      properties: record(string(), PrimitiveSchemaDefinitionSchema$1),
      required: array(string()).optional(),
    }).catchall(unknown()),
  });
  let ResourceTemplateReferenceSchema$1 = u({
    type: literal("ref/resource"),
    uri: string(),
  });
  let PromptReferenceSchema$1 = u({
    type: literal("ref/prompt"),
    name: string(),
  });
  let RootSchema$1 = u({
    uri: string().startsWith("file://"),
    name: string().optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let sharedClientCapabilityShape = ClientCapabilitiesSchema$1.shape;
  let ClientCapabilities2026Schema = u({
    experimental: sharedClientCapabilityShape.experimental,
    sampling: sharedClientCapabilityShape.sampling,
    elicitation: sharedClientCapabilityShape.elicitation,
    roots: sharedClientCapabilityShape.roots,
    extensions: sharedClientCapabilityShape.extensions,
  });
  let sharedServerCapabilityShape = ServerCapabilitiesSchema$1.shape;
  let ServerCapabilities2026Schema = u({
    experimental: sharedServerCapabilityShape.experimental,
    logging: sharedServerCapabilityShape.logging,
    completions: sharedServerCapabilityShape.completions,
    prompts: sharedServerCapabilityShape.prompts,
    resources: sharedServerCapabilityShape.resources,
    tools: sharedServerCapabilityShape.tools,
    extensions: sharedServerCapabilityShape.extensions,
  });
  let RequestMetaEnvelopeSchema = looseObject({
    progressToken: ProgressTokenSchema$1.optional(),
    [PROTOCOL_VERSION_META_KEY]: string(),
    [CLIENT_INFO_META_KEY]: ImplementationSchema$1.optional(),
    [CLIENT_CAPABILITIES_META_KEY]: ClientCapabilities2026Schema,
    [LOG_LEVEL_META_KEY]: LoggingLevelSchema$1.optional(),
  });
  let ToolSchema$1 = u({
    ...BaseMetadataSchema$1.shape,
    ...IconsSchema$1.shape,
    description: string().optional(),
    inputSchema: looseObject({
      $schema: string().optional(),
      type: literal("object"),
    }),
    outputSchema: looseObject({
      $schema: string().optional(),
    }).optional(),
    annotations: ToolAnnotationsSchema$1.optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let ToolResultContentSchema$1 = u({
    type: literal("tool_result"),
    toolUseId: string(),
    content: array(ContentBlockSchema$1),
    structuredContent: unknown().optional(),
    isError: M().optional(),
    _meta: record(string(), unknown()).optional(),
  });
  let SamplingMessageContentBlockSchema$1 = union([
    TextContentSchema$1,
    ImageContentSchema$1,
    AudioContentSchema$1,
    ToolUseContentSchema$1,
    ToolResultContentSchema$1,
  ]);
  let SamplingMessageSchema$1 = u({
    role: RoleSchema$1,
    content: union([SamplingMessageContentBlockSchema$1, array(SamplingMessageContentBlockSchema$1)]),
    _meta: record(string(), unknown()).optional(),
  });
  let ResultTypeSchema = string();
  let ResultMetaSchema = looseObject({
    [SERVER_INFO_META_KEY]: ImplementationSchema$1.optional().catch(undefined),
  });
  let wireMeta = ResultMetaSchema.optional();
  function wireResult(shape) {
    return looseObject({
      _meta: wireMeta,
      resultType: ResultTypeSchema.default("complete"),
      ...shape,
    });
  }
  let ResultSchema$1 = wireResult({});
  let PaginatedResultSchema$1 = wireResult({
    nextCursor: CursorSchema$1.optional(),
  });
  let CallToolResultSchema$1 = wireResult({
    content: array(ContentBlockSchema$1),
    structuredContent: unknown().optional(),
    isError: M().optional(),
  });
  let ListToolsResultSchema$1 = wireResult({
    ttlMs: E().int().min(0),
    cacheScope: _enum(["public", "private"]),
    tools: array(ToolSchema$1),
    nextCursor: CursorSchema$1.optional(),
  });
  let ListPromptsResultSchema$1 = wireResult({
    ttlMs: E().int().min(0),
    cacheScope: _enum(["public", "private"]),
    prompts: array(PromptSchema$1),
    nextCursor: CursorSchema$1.optional(),
  });
  let GetPromptResultSchema$1 = wireResult({
    description: string().optional(),
    messages: array(PromptMessageSchema$1),
  });
  let ListResourcesResultSchema$1 = wireResult({
    ttlMs: E().int().min(0),
    cacheScope: _enum(["public", "private"]),
    resources: array(ResourceSchema$1),
    nextCursor: CursorSchema$1.optional(),
  });
  let ListResourceTemplatesResultSchema$1 = wireResult({
    ttlMs: E().int().min(0),
    cacheScope: _enum(["public", "private"]),
    resourceTemplates: array(ResourceTemplateSchema$1),
    nextCursor: CursorSchema$1.optional(),
  });
  let ReadResourceResultSchema$1 = wireResult({
    ttlMs: E().int().min(0),
    cacheScope: _enum(["public", "private"]),
    contents: array(union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1])),
  });
  let CompleteResultSchema$1 = wireResult({
    completion: u({
      values: array(string()).max(100),
      total: E().int().optional(),
      hasMore: M().optional(),
    }).loose(),
  });
  let CacheableResultSchema = wireResult({
    ttlMs: E().int().min(0),
    cacheScope: _enum(["public", "private"]),
  });
  let DiscoverResultSchema$1 = wireResult({
    ttlMs: E().int().min(0).catch(0),
    cacheScope: _enum(["public", "private"]).catch("private"),
    supportedVersions: array(string()),
    capabilities: ServerCapabilities2026Schema,
    instructions: string().optional(),
  });
  let CreateMessageRequestParamsSchema$1 = u({
    messages: array(SamplingMessageSchema$1),
    modelPreferences: ModelPreferencesSchema$1.optional(),
    systemPrompt: string().optional(),
    includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
    temperature: E().optional(),
    maxTokens: E().int(),
    stopSequences: array(string()).optional(),
    metadata: JSONObjectSchema$1.optional(),
    tools: array(ToolSchema$1).optional(),
    toolChoice: ToolChoiceSchema$1.optional(),
  });
  let CreateMessageRequestSchema$1 = u({
    method: literal("sampling/createMessage"),
    params: CreateMessageRequestParamsSchema$1,
  });
  let ListRootsRequestSchema$1 = u({
    method: literal("roots/list"),
    params: u({
      _meta: record(string(), unknown()).optional(),
    }).optional(),
  });
  let CreateMessageResultSchema$1 = u({
    ...SamplingMessageSchema$1.shape,
    model: string(),
    stopReason: string().optional(),
  });
  let ListRootsResultSchema$1 = u({
    roots: array(RootSchema$1),
  });
  let ElicitResultSchema$1 = u({
    action: _enum(["accept", "decline", "cancel"]),
    content: record(string(), union([string(), E(), M(), array(string())])).optional(),
  });
  let ElicitRequestURLParamsSchema$1 = u({
    mode: literal("url"),
    message: string(),
    url: string().url(),
  });
  let ElicitRequestParamsSchema$1 = union([ElicitRequestFormParamsSchema$1, ElicitRequestURLParamsSchema$1]);
  let ElicitRequestSchema$1 = u({
    method: literal("elicitation/create"),
    params: ElicitRequestParamsSchema$1,
  });
  let InputRequestSchema = union([
    CreateMessageRequestSchema$1,
    ListRootsRequestSchema$1,
    ElicitRequestSchema$1,
  ]);
  let InputResponseSchema = union([
    CreateMessageResultSchema$1,
    ListRootsResultSchema$1,
    ElicitResultSchema$1,
  ]);
  let InputRequestsSchema = record(string(), InputRequestSchema);
  let InputResponsesSchema = record(string(), InputResponseSchema);
  let InputRequiredResultSchema = wireResult({
    inputRequests: InputRequestsSchema.optional(),
    requestState: string().optional(),
  });
  let retryParamsShape = {
    inputResponses: InputResponsesSchema.optional(),
    requestState: string().optional(),
  };
  let InputResponseRequestParamsSchema = u({
    _meta: RequestMetaEnvelopeSchema,
    ...retryParamsShape,
  });
  let DispatchRequestMetaSchema = looseObject({
    progressToken: ProgressTokenSchema$1.optional(),
  });
  function wireRequest(method, paramsShape) {
    return u({
      method: literal(method),
      params: u({
        _meta: RequestMetaEnvelopeSchema,
        ...paramsShape,
      }),
    });
  }
  function dispatchRequest(method, paramsShape) {
    return u({
      method: literal(method),
      params: u({
        _meta: DispatchRequestMetaSchema.optional(),
        ...paramsShape,
      }).optional(),
    });
  }
  let callToolParamsShape = {
    name: string(),
    arguments: record(string(), unknown()).optional(),
    ...retryParamsShape,
  };
  let paginatedParamsShape = {
    cursor: CursorSchema$1.optional(),
  };
  let CallToolRequestSchema$1 = wireRequest("tools/call", callToolParamsShape);
  let ListToolsRequestSchema$1 = wireRequest("tools/list", paginatedParamsShape);
  let ListPromptsRequestSchema$1 = wireRequest("prompts/list", paginatedParamsShape);
  let GetPromptRequestSchema$1 = wireRequest("prompts/get", {
    name: string(),
    arguments: record(string(), string()).optional(),
    ...retryParamsShape,
  });
  let ListResourcesRequestSchema$1 = wireRequest("resources/list", paginatedParamsShape);
  let ListResourceTemplatesRequestSchema$1 = wireRequest("resources/templates/list", paginatedParamsShape);
  let ReadResourceRequestSchema$1 = wireRequest("resources/read", {
    uri: string(),
    ...retryParamsShape,
  });
  let completeParamsShape = {
    ref: union([PromptReferenceSchema$1, ResourceTemplateReferenceSchema$1]),
    argument: u({
      name: string(),
      value: string(),
    }),
    context: u({
      arguments: record(string(), string()).optional(),
    }).optional(),
  };
  let CompleteRequestSchema$1 = wireRequest("completion/complete", completeParamsShape);
  let DiscoverRequestSchema$1 = wireRequest("server/discover", {});
  let SubscriptionFilterSchema$1 = u({
    toolsListChanged: M().optional(),
    promptsListChanged: M().optional(),
    resourcesListChanged: M().optional(),
    resourceSubscriptions: array(string()).optional(),
  });
  let subscriptionsListenParamsShape = {
    notifications: SubscriptionFilterSchema$1,
  };
  let SubscriptionsListenRequestSchema$1 = wireRequest(
    "subscriptions/listen",
    subscriptionsListenParamsShape,
  );
  let SubscriptionsListenResultMetaSchema$1 = ResultMetaSchema.extend({
    "io.modelcontextprotocol/subscriptionId": RequestIdSchema$1,
  });
  let SubscriptionsListenResultSchema$1 = looseObject({
    _meta: SubscriptionsListenResultMetaSchema$1,
    resultType: ResultTypeSchema.default("complete"),
  });
  let dispatchRequestSchemas = {
    "tools/call": dispatchRequest("tools/call", callToolParamsShape),
    "tools/list": dispatchRequest("tools/list", paginatedParamsShape),
    "prompts/get": dispatchRequest("prompts/get", {
      name: string(),
      arguments: record(string(), string()).optional(),
    }),
    "prompts/list": dispatchRequest("prompts/list", paginatedParamsShape),
    "resources/list": dispatchRequest("resources/list", paginatedParamsShape),
    "resources/templates/list": dispatchRequest("resources/templates/list", paginatedParamsShape),
    "resources/read": dispatchRequest("resources/read", {
      uri: string(),
    }),
    "completion/complete": dispatchRequest("completion/complete", completeParamsShape),
    "server/discover": dispatchRequest("server/discover", {}),
    "subscriptions/listen": dispatchRequest("subscriptions/listen", subscriptionsListenParamsShape),
  };
  function liftedResult(shape) {
    return looseObject({
      _meta: wireMeta,
      ...shape,
    });
  }
  let dispatchResultSchemas = {
    "tools/call": liftedResult({
      content: array(ContentBlockSchema$1),
      structuredContent: unknown().optional(),
      isError: M().optional(),
    }),
    "tools/list": liftedResult({
      ttlMs: E().int().min(0),
      cacheScope: _enum(["public", "private"]),
      tools: array(ToolSchema$1),
      nextCursor: CursorSchema$1.optional(),
    }),
    "prompts/get": liftedResult({
      description: string().optional(),
      messages: array(PromptMessageSchema$1),
    }),
    "prompts/list": liftedResult({
      ttlMs: E().int().min(0),
      cacheScope: _enum(["public", "private"]),
      prompts: array(PromptSchema$1),
      nextCursor: CursorSchema$1.optional(),
    }),
    "resources/list": liftedResult({
      ttlMs: E().int().min(0),
      cacheScope: _enum(["public", "private"]),
      resources: array(ResourceSchema$1),
      nextCursor: CursorSchema$1.optional(),
    }),
    "resources/templates/list": liftedResult({
      ttlMs: E().int().min(0),
      cacheScope: _enum(["public", "private"]),
      resourceTemplates: array(ResourceTemplateSchema$1),
      nextCursor: CursorSchema$1.optional(),
    }),
    "resources/read": liftedResult({
      ttlMs: E().int().min(0),
      cacheScope: _enum(["public", "private"]),
      contents: array(union([TextResourceContentsSchema$1, BlobResourceContentsSchema$1])),
    }),
    "completion/complete": liftedResult({
      completion: u({
        values: array(string()).max(100),
        total: E().int().optional(),
        hasMore: M().optional(),
      }).loose(),
    }),
    "server/discover": liftedResult({
      ttlMs: E().int().min(0).catch(0),
      cacheScope: _enum(["public", "private"]).catch("private"),
      supportedVersions: array(string()),
      capabilities: ServerCapabilities2026Schema,
      instructions: string().optional(),
    }),
    "subscriptions/listen": liftedResult({}),
  };
  let NotificationMetaSchema = looseObject({
    "io.modelcontextprotocol/subscriptionId": RequestIdSchema$1.optional(),
  });
  let SubscriptionsAcknowledgedNotificationSchema$1 = u({
    method: literal("notifications/subscriptions/acknowledged"),
    params: u({
      _meta: NotificationMetaSchema.optional(),
      notifications: SubscriptionFilterSchema$1,
    }),
  });
  let CancelledNotificationParamsSchema$1 = u({
    _meta: NotificationMetaSchema.optional(),
    requestId: RequestIdSchema$1,
    reason: string().optional(),
  });
  let CancelledNotificationSchema$1 = u({
    method: literal("notifications/cancelled"),
    params: CancelledNotificationParamsSchema$1,
  });
  let notificationSchemas2026 = {
    "notifications/cancelled": CancelledNotificationSchema$1,
    "notifications/progress": ProgressNotificationSchema$1,
    "notifications/message": LoggingMessageNotificationSchema$1,
    "notifications/resources/updated": ResourceUpdatedNotificationSchema$1,
    "notifications/resources/list_changed": ResourceListChangedNotificationSchema$1,
    "notifications/tools/list_changed": ToolListChangedNotificationSchema$1,
    "notifications/prompts/list_changed": PromptListChangedNotificationSchema$1,
    "notifications/subscriptions/acknowledged": SubscriptionsAcknowledgedNotificationSchema$1,
  };
  let wireResultResponse = (result) =>
    u({
      jsonrpc: literal("2.0"),
      id: union([string(), E().int()]),
      result,
    }).strict();
  return {
    JSONValueSchema: JSONValueSchema$1,
    JSONObjectSchema: JSONObjectSchema$1,
    ProgressTokenSchema: ProgressTokenSchema$1,
    CursorSchema: CursorSchema$1,
    RequestIdSchema: RequestIdSchema$1,
    RoleSchema: RoleSchema$1,
    LoggingLevelSchema: LoggingLevelSchema$1,
    TaskMetadataSchema: TaskMetadataSchema$1,
    RelatedTaskMetadataSchema: RelatedTaskMetadataSchema$1,
    RequestMetaSchema: RequestMetaSchema$1,
    BaseRequestParamsSchema: BaseRequestParamsSchema$1,
    TaskAugmentedRequestParamsSchema: TaskAugmentedRequestParamsSchema$1,
    NotificationsParamsSchema: NotificationsParamsSchema$1,
    NotificationSchema: NotificationSchema$1,
    IconSchema: IconSchema$1,
    IconsSchema: IconsSchema$1,
    BaseMetadataSchema: BaseMetadataSchema$1,
    ImplementationSchema: ImplementationSchema$1,
    ClientTasksCapabilitySchema: ClientTasksCapabilitySchema$1,
    ServerTasksCapabilitySchema: ServerTasksCapabilitySchema$1,
    ClientCapabilitiesSchema: ClientCapabilitiesSchema$1,
    ServerCapabilitiesSchema: ServerCapabilitiesSchema$1,
    ProgressSchema: ProgressSchema$1,
    ProgressNotificationParamsSchema: ProgressNotificationParamsSchema$1,
    ProgressNotificationSchema: ProgressNotificationSchema$1,
    LoggingMessageNotificationParamsSchema: LoggingMessageNotificationParamsSchema$1,
    LoggingMessageNotificationSchema: LoggingMessageNotificationSchema$1,
    ResourceContentsSchema: ResourceContentsSchema$1,
    TextResourceContentsSchema: TextResourceContentsSchema$1,
    BlobResourceContentsSchema: BlobResourceContentsSchema$1,
    AnnotationsSchema: AnnotationsSchema$1,
    ResourceSchema: ResourceSchema$1,
    ResourceTemplateSchema: ResourceTemplateSchema$1,
    ResourceListChangedNotificationSchema: ResourceListChangedNotificationSchema$1,
    ResourceUpdatedNotificationParamsSchema: ResourceUpdatedNotificationParamsSchema$1,
    ResourceUpdatedNotificationSchema: ResourceUpdatedNotificationSchema$1,
    PromptArgumentSchema: PromptArgumentSchema$1,
    PromptSchema: PromptSchema$1,
    PromptListChangedNotificationSchema: PromptListChangedNotificationSchema$1,
    TextContentSchema: TextContentSchema$1,
    ImageContentSchema: ImageContentSchema$1,
    AudioContentSchema: AudioContentSchema$1,
    ToolUseContentSchema: ToolUseContentSchema$1,
    EmbeddedResourceSchema: EmbeddedResourceSchema$1,
    ResourceLinkSchema: ResourceLinkSchema$1,
    ContentBlockSchema: ContentBlockSchema$1,
    PromptMessageSchema: PromptMessageSchema$1,
    ToolAnnotationsSchema: ToolAnnotationsSchema$1,
    ToolListChangedNotificationSchema: ToolListChangedNotificationSchema$1,
    ModelHintSchema: ModelHintSchema$1,
    ModelPreferencesSchema: ModelPreferencesSchema$1,
    ToolChoiceSchema: ToolChoiceSchema$1,
    BooleanSchemaSchema: BooleanSchemaSchema$1,
    StringSchemaSchema: StringSchemaSchema$1,
    NumberSchemaSchema: NumberSchemaSchema$1,
    UntitledSingleSelectEnumSchemaSchema: UntitledSingleSelectEnumSchemaSchema$1,
    TitledSingleSelectEnumSchemaSchema: TitledSingleSelectEnumSchemaSchema$1,
    LegacyTitledEnumSchemaSchema: LegacyTitledEnumSchemaSchema$1,
    SingleSelectEnumSchemaSchema: SingleSelectEnumSchemaSchema$1,
    UntitledMultiSelectEnumSchemaSchema: UntitledMultiSelectEnumSchemaSchema$1,
    TitledMultiSelectEnumSchemaSchema: TitledMultiSelectEnumSchemaSchema$1,
    MultiSelectEnumSchemaSchema: MultiSelectEnumSchemaSchema$1,
    EnumSchemaSchema: EnumSchemaSchema$1,
    PrimitiveSchemaDefinitionSchema: PrimitiveSchemaDefinitionSchema$1,
    ElicitRequestFormParamsSchema: ElicitRequestFormParamsSchema$1,
    ResourceTemplateReferenceSchema: ResourceTemplateReferenceSchema$1,
    PromptReferenceSchema: PromptReferenceSchema$1,
    RootSchema: RootSchema$1,
    ClientCapabilities2026Schema,
    ServerCapabilities2026Schema,
    RequestMetaEnvelopeSchema,
    ToolSchema: ToolSchema$1,
    ToolResultContentSchema: ToolResultContentSchema$1,
    SamplingMessageContentBlockSchema: SamplingMessageContentBlockSchema$1,
    SamplingMessageSchema: SamplingMessageSchema$1,
    ResultTypeSchema,
    ResultMetaSchema,
    ResultSchema: ResultSchema$1,
    PaginatedResultSchema: PaginatedResultSchema$1,
    CallToolResultSchema: CallToolResultSchema$1,
    ListToolsResultSchema: ListToolsResultSchema$1,
    ListPromptsResultSchema: ListPromptsResultSchema$1,
    GetPromptResultSchema: GetPromptResultSchema$1,
    ListResourcesResultSchema: ListResourcesResultSchema$1,
    ListResourceTemplatesResultSchema: ListResourceTemplatesResultSchema$1,
    ReadResourceResultSchema: ReadResourceResultSchema$1,
    CompleteResultSchema: CompleteResultSchema$1,
    CacheableResultSchema,
    DiscoverResultSchema: DiscoverResultSchema$1,
    CreateMessageRequestParamsSchema: CreateMessageRequestParamsSchema$1,
    CreateMessageRequestSchema: CreateMessageRequestSchema$1,
    ListRootsRequestSchema: ListRootsRequestSchema$1,
    CreateMessageResultSchema: CreateMessageResultSchema$1,
    ListRootsResultSchema: ListRootsResultSchema$1,
    ElicitResultSchema: ElicitResultSchema$1,
    ElicitRequestURLParamsSchema: ElicitRequestURLParamsSchema$1,
    ElicitRequestParamsSchema: ElicitRequestParamsSchema$1,
    ElicitRequestSchema: ElicitRequestSchema$1,
    InputRequestSchema,
    InputResponseSchema,
    InputRequestsSchema,
    InputResponsesSchema,
    InputRequiredResultSchema,
    InputResponseRequestParamsSchema,
    CallToolRequestSchema: CallToolRequestSchema$1,
    ListToolsRequestSchema: ListToolsRequestSchema$1,
    ListPromptsRequestSchema: ListPromptsRequestSchema$1,
    GetPromptRequestSchema: GetPromptRequestSchema$1,
    ListResourcesRequestSchema: ListResourcesRequestSchema$1,
    ListResourceTemplatesRequestSchema: ListResourceTemplatesRequestSchema$1,
    ReadResourceRequestSchema: ReadResourceRequestSchema$1,
    CompleteRequestSchema: CompleteRequestSchema$1,
    DiscoverRequestSchema: DiscoverRequestSchema$1,
    SubscriptionFilterSchema: SubscriptionFilterSchema$1,
    SubscriptionsListenRequestSchema: SubscriptionsListenRequestSchema$1,
    SubscriptionsListenResultMetaSchema: SubscriptionsListenResultMetaSchema$1,
    SubscriptionsListenResultSchema: SubscriptionsListenResultSchema$1,
    dispatchRequestSchemas,
    dispatchResultSchemas,
    NotificationMetaSchema,
    SubscriptionsAcknowledgedNotificationSchema: SubscriptionsAcknowledgedNotificationSchema$1,
    CancelledNotificationParamsSchema: CancelledNotificationParamsSchema$1,
    CancelledNotificationSchema: CancelledNotificationSchema$1,
    notificationSchemas2026,
    JSONRPCResultResponseSchema: wireResultResponse(ResultSchema$1),
    CallToolResultResponseSchema: wireResultResponse(
      union([CallToolResultSchema$1, InputRequiredResultSchema]),
    ),
    ListToolsResultResponseSchema: wireResultResponse(ListToolsResultSchema$1),
    ListPromptsResultResponseSchema: wireResultResponse(ListPromptsResultSchema$1),
    GetPromptResultResponseSchema: wireResultResponse(
      union([GetPromptResultSchema$1, InputRequiredResultSchema]),
    ),
    ListResourcesResultResponseSchema: wireResultResponse(ListResourcesResultSchema$1),
    ListResourceTemplatesResultResponseSchema: wireResultResponse(ListResourceTemplatesResultSchema$1),
    ReadResourceResultResponseSchema: wireResultResponse(
      union([ReadResourceResultSchema$1, InputRequiredResultSchema]),
    ),
    CompleteResultResponseSchema: wireResultResponse(CompleteResultSchema$1),
    DiscoverResultResponseSchema: wireResultResponse(DiscoverResultSchema$1),
  };
}
//@ chunk-r1g76qsy.js:59401-59408 esm-layout
var memo;
//@ chunk-r1g76qsy.js:59408-59439 esm-layout
function buildSchemas2026() {
  return (memo ??= build());
}
//@ chunk-r1g76qsy.js:59439-59555 esm-fingerprint
var CACHEABLE_RESULT_METHODS = [
  "tools/list",
  "prompts/list",
  "resources/list",
  "resources/templates/list",
  "resources/read",
  "server/discover",
];
//@ chunk-r1g76qsy.js:59555-59592 esm-layout
function isCacheableResultMethod(method) {
  return CACHEABLE_RESULT_METHODS.includes(method);
}
//@ chunk-r1g76qsy.js:59592-59654 esm-fingerprint
var RESULT_CACHE_HINT_FALLBACK = Symbol("modelcontextprotocol.resultCacheHintFallback");
//@ chunk-r1g76qsy.js:59654-59682 esm-layout
function cacheHintFallbackOf(result) {
  return result[RESULT_CACHE_HINT_FALLBACK];
}
//@ chunk-r1g76qsy.js:59682-59755 esm-fingerprint
function isValidCacheTtlMs(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
//@ chunk-r1g76qsy.js:59755-59805 esm-fingerprint
function isValidCacheScope(value) {
  return value === "public" || value === "private";
}
//@ chunk-r1g76qsy.js:59805-62666 esm-fingerprint
var ProtocolErrorCode = (function (ProtocolErrorCode$1) {
  ProtocolErrorCode$1[(ProtocolErrorCode$1.ParseError = -32700)] = "ParseError";
  ProtocolErrorCode$1[(ProtocolErrorCode$1.InvalidRequest = -32600)] = "InvalidRequest";
  ProtocolErrorCode$1[(ProtocolErrorCode$1.MethodNotFound = -32601)] = "MethodNotFound";
  ProtocolErrorCode$1[(ProtocolErrorCode$1.InvalidParams = -32602)] = "InvalidParams";
  ProtocolErrorCode$1[(ProtocolErrorCode$1.InternalError = -32603)] = "InternalError";
  ProtocolErrorCode$1[(ProtocolErrorCode$1.ResourceNotFound = -32002)] = "ResourceNotFound";
  ProtocolErrorCode$1[(ProtocolErrorCode$1.MissingRequiredClientCapability = -32021)] =
    "MissingRequiredClientCapability";
  ProtocolErrorCode$1[(ProtocolErrorCode$1.UnsupportedProtocolVersion = -32022)] =
    "UnsupportedProtocolVersion";
  ProtocolErrorCode$1[(ProtocolErrorCode$1.UrlElicitationRequired = -32042)] = "UrlElicitationRequired";
  return ProtocolErrorCode$1;
})({});
var ProtocolError = class ProtocolError extends Error {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.ProtocolError",
    });
  }
  static [Symbol.hasInstance](value) {
    return brandedHasInstance(this, value);
  }
  static isInstance(value) {
    if (typeof this !== "function")
      throw TypeError(
        "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
      );
    return brandedHasInstance(this, value);
  }
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "ProtocolError";
    stampErrorBrands(this, new.target);
  }
  static fromError(code, message, data) {
    if (code === ProtocolErrorCode.UrlElicitationRequired && data) {
      let errorData = data;
      if (errorData.elicitations) return new UrlElicitationRequiredError(errorData.elicitations, message);
    }
    if (code === ProtocolErrorCode.UnsupportedProtocolVersion && data) {
      let errorData = data;
      if (Array.isArray(errorData.supported) && typeof errorData.requested === "string")
        return new UnsupportedProtocolVersionError(
          {
            supported: errorData.supported,
            requested: errorData.requested,
          },
          message,
        );
    }
    if (code === ProtocolErrorCode.InvalidParams || code === ProtocolErrorCode.ResourceNotFound) {
      let errorData = data;
      if (
        typeof errorData?.uri === "string" &&
        (code === ProtocolErrorCode.ResourceNotFound || Object.keys(errorData).length === 1)
      )
        return new ResourceNotFoundError(errorData.uri, message);
    }
    if (code === ProtocolErrorCode.MissingRequiredClientCapability && data) {
      let errorData = data;
      if (
        errorData.requiredCapabilities !== null &&
        typeof errorData.requiredCapabilities === "object" &&
        !Array.isArray(errorData.requiredCapabilities)
      )
        return new MissingRequiredClientCapabilityError(
          {
            requiredCapabilities: errorData.requiredCapabilities,
          },
          message,
        );
    }
    return new ProtocolError(code, message, data);
  }
};
var ResourceNotFoundError = class extends ProtocolError {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.ResourceNotFoundError",
    });
  }
  constructor(uri, message = `Resource not found: ${uri}`) {
    super(ProtocolErrorCode.InvalidParams, message, {
      uri,
    });
  }
  get uri() {
    return this.data.uri;
  }
};
var UrlElicitationRequiredError = class extends ProtocolError {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.UrlElicitationRequiredError",
    });
  }
  constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
    super(ProtocolErrorCode.UrlElicitationRequired, message, {
      elicitations,
    });
  }
  get elicitations() {
    return this.data?.elicitations ?? [];
  }
};
var UnsupportedProtocolVersionError = class extends ProtocolError {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.UnsupportedProtocolVersionError",
    });
  }
  constructor(data, message = `Unsupported protocol version: ${data.requested}`) {
    super(ProtocolErrorCode.UnsupportedProtocolVersion, message, data);
  }
  get supported() {
    return this.data.supported;
  }
  get requested() {
    return this.data.requested;
  }
};
var MissingRequiredClientCapabilityError = class extends ProtocolError {
  static {
    Object.defineProperty(this, "mcpBrand", {
      value: "mcp.MissingRequiredClientCapabilityError",
    });
  }
  constructor(
    data,
    message = `Missing required client capabilities: ${Object.keys(data.requiredCapabilities).join(", ")}`,
  ) {
    super(ProtocolErrorCode.MissingRequiredClientCapability, message, data);
  }
  get requiredCapabilities() {
    return this.data.requiredCapabilities;
  }
};
var DEFAULT_CACHE_TTL_MS = 0;
var DEFAULT_CACHE_SCOPE = "private";
var EXTENDED_RESULT_TYPE_METHODS = ["tools/call", "prompts/get", "resources/read"];
//@ chunk-r1g76qsy.js:62666-62967 esm-fingerprint
function stampResultType(method, result) {
  let provided = result.resultType;
  if (provided === undefined)
    return {
      ...result,
      resultType: "complete",
    };
  if (provided === "complete") return result;
  if (EXTENDED_RESULT_TYPE_METHODS.includes(method)) return result;
  throw new ProtocolError(
    ProtocolErrorCode.InternalError,
    `Handler for ${method} returned resultType '${String(provided)}', but results of ${method} only support 'complete' on protocol revision 2026-07-28`,
  );
}
//@ chunk-r1g76qsy.js:62967-63185 esm-fingerprint
function fillCacheFields(method, result) {
  let fallback = cacheHintFallbackOf(result);
  if (result.resultType !== "complete" || !isCacheableResultMethod(method))
    return fallback === undefined ? result : stripCacheHintFallback(result);
  let provided = result;
  let ttlMs = isValidCacheTtlMs(provided.ttlMs) ? provided.ttlMs : resolveTtlMs(fallback);
  let cacheScope = isValidCacheScope(provided.cacheScope) ? provided.cacheScope : resolveCacheScope(fallback);
  let filled = {
    ...provided,
    ttlMs,
    cacheScope,
  };
  delete filled[RESULT_CACHE_HINT_FALLBACK];
  return filled;
}
//@ chunk-r1g76qsy.js:63185-63256 esm-fingerprint
function isPlainObject$3(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
//@ chunk-r1g76qsy.js:63256-63431 esm-layout
function stampServerInfoMeta(result, serverInfo) {
  if (serverInfo === undefined) return result;
  let meta = result._meta;
  if (meta === undefined)
    return {
      ...result,
      _meta: {
        [SERVER_INFO_META_KEY]: serverInfo,
      },
    };
  if (!isPlainObject$3(meta)) return result;
  if (meta[SERVER_INFO_META_KEY] !== undefined) return result;
  return {
    ...result,
    _meta: {
      ...meta,
      [SERVER_INFO_META_KEY]: serverInfo,
    },
  };
}
//@ chunk-r1g76qsy.js:63431-63488 esm-fingerprint
function resolveTtlMs(fallback) {
  return fallback !== undefined && isValidCacheTtlMs(fallback.ttlMs) ? fallback.ttlMs : DEFAULT_CACHE_TTL_MS;
}
//@ chunk-r1g76qsy.js:63488-63555 esm-fingerprint
function resolveCacheScope(fallback) {
  return fallback !== undefined && isValidCacheScope(fallback.cacheScope)
    ? fallback.cacheScope
    : DEFAULT_CACHE_SCOPE;
}
//@ chunk-r1g76qsy.js:63555-63605 esm-layout
function stripCacheHintFallback(result) {
  let copy = {
    ...result,
  };
  delete copy[RESULT_CACHE_HINT_FALLBACK];
  return copy;
}
//@ chunk-r1g76qsy.js:63605-63676 esm-fingerprint
var INPUT_REQUEST_METHODS_2026 = ["elicitation/create", "sampling/createMessage", "roots/list"];
var maps;
//@ chunk-r1g76qsy.js:63676-64150 esm-fingerprint
function inputSchemaMaps() {
  if (maps) return maps;
  let s = buildSchemas2026();
  maps = {
    request: {
      "elicitation/create": u({
        method: literal("elicitation/create"),
        params: s.ElicitRequestParamsSchema,
      }),
      "sampling/createMessage": u({
        method: literal("sampling/createMessage"),
        params: s.CreateMessageRequestParamsSchema,
      }),
      "roots/list": u({
        method: literal("roots/list"),
        params: looseObject({}).optional(),
      }),
    },
    response: {
      "elicitation/create": s.ElicitResultSchema,
      "sampling/createMessage": s.CreateMessageResultSchema,
      "roots/list": s.ListRootsResultSchema,
    },
  };
  return maps;
}
//@ chunk-r1g76qsy.js:64150-64187 esm-layout
function isInputRequestMethod2026(method) {
  return INPUT_REQUEST_METHODS_2026.includes(method);
}
//@ chunk-r1g76qsy.js:64187-64238 esm-fingerprint
function getInputRequestSchema2026(method) {
  return isInputRequestMethod2026(method) ? inputSchemaMaps().request[method] : undefined;
}
//@ chunk-r1g76qsy.js:64238-64290 esm-fingerprint
function getInputResponseSchema2026(method) {
  return isInputRequestMethod2026(method) ? inputSchemaMaps().response[method] : undefined;
}
//@ chunk-r1g76qsy.js:64290-64836 esm-fingerprint
var requestMethodKeys = {
  "tools/call": null,
  "tools/list": null,
  "prompts/get": null,
  "prompts/list": null,
  "resources/list": null,
  "resources/templates/list": null,
  "resources/read": null,
  "completion/complete": null,
  "server/discover": null,
  "subscriptions/listen": null,
};
var notificationMethodKeys = {
  "notifications/cancelled": null,
  "notifications/progress": null,
  "notifications/message": null,
  "notifications/resources/updated": null,
  "notifications/resources/list_changed": null,
  "notifications/tools/list_changed": null,
  "notifications/prompts/list_changed": null,
  "notifications/subscriptions/acknowledged": null,
};
//@ chunk-r1g76qsy.js:64836-64901 esm-fingerprint
function hasRequestMethod2026(method) {
  return Object.prototype.hasOwnProperty.call(requestMethodKeys, method);
}
//@ chunk-r1g76qsy.js:64901-64966 esm-fingerprint
function hasNotificationMethod2026(method) {
  return Object.prototype.hasOwnProperty.call(notificationMethodKeys, method);
}
//@ chunk-r1g76qsy.js:64966-65031 esm-fingerprint
function hasResultMethod2026(method) {
  return Object.prototype.hasOwnProperty.call(requestMethodKeys, method);
}
//@ chunk-r1g76qsy.js:65031-65097 esm-fingerprint
function getRequestSchema2026(method) {
  return hasRequestMethod2026(method) ? buildSchemas2026().dispatchRequestSchemas[method] : undefined;
}
//@ chunk-r1g76qsy.js:65097-65162 esm-fingerprint
function getResultSchema2026(method) {
  return hasResultMethod2026(method) ? buildSchemas2026().dispatchResultSchemas[method] : undefined;
}
//@ chunk-r1g76qsy.js:65162-65229 esm-fingerprint
function getNotificationSchema2026(method) {
  return hasNotificationMethod2026(method) ? buildSchemas2026().notificationSchemas2026[method] : undefined;
}
//@ chunk-r1g76qsy.js:65229-65271 esm-layout
var keys_3 = Object.keys(requestMethodKeys);
var keys_4 = Object.keys(notificationMethodKeys);
//@ chunk-r1g76qsy.js:65271-65342 esm-fingerprint
function Zr(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
//@ chunk-r1g76qsy.js:65342-65515 esm-fingerprint
function triState(schema, raw) {
  if (schema === undefined)
    return {
      ok: false,
      reason: "not-in-era",
    };
  let parsed = schema.safeParse(raw);
  return parsed.success
    ? {
        ok: true,
        value: parsed.data,
      }
    : {
        ok: false,
        reason: "invalid",
        message: String(parsed.error),
      };
}
//@ chunk-r1g76qsy.js:65515-65562 esm-fingerprint
var NOT_IN_ERA = {
  ok: false,
  reason: "not-in-era",
};
var REQUIRED_ENVELOPE_KEYS = [PROTOCOL_VERSION_META_KEY, CLIENT_CAPABILITIES_META_KEY];
//@ chunk-r1g76qsy.js:65562-65920 esm-fingerprint
function enforceDeletedFields(method, result) {
  let next = result;
  let copied = false;
  let copy = () => {
    if (!copied) {
      next = {
        ...next,
      };
      copied = true;
    }
    return next;
  };
  let tools = result.tools;
  if (
    method === "tools/list" &&
    Array.isArray(tools) &&
    tools.some((tool) => Zr(tool) && "execution" in tool)
  )
    copy().tools = tools.map((tool) => {
      if (!Zr(tool) || !("execution" in tool)) return tool;
      let rest = {
        ...tool,
      };
      delete rest.execution;
      return rest;
    });
  let capabilities = result.capabilities;
  if (Zr(capabilities) && "tasks" in capabilities) {
    let rest = {
      ...capabilities,
    };
    delete rest.tasks;
    copy().capabilities = rest;
  }
  return next;
}
//@ chunk-r1g76qsy.js:66033-66355 esm-layout
function vl(result) {
  if (result === null || typeof result !== "object" || Array.isArray(result)) return false;
  return (
    typeof result.taskId === "string" &&
    result.taskId.length > 0 &&
    yl.has(result.status) &&
    typeof result.createdAt === "string" &&
    typeof result.lastUpdatedAt === "string" &&
    (result.ttlMs === null || typeof result.ttlMs === "number") &&
    (result.pollIntervalMs === undefined || typeof result.pollIntervalMs === "number")
  );
}
//@ chunk-r1g76qsy.js:66355-69307 esm-fingerprint
var rev2026Codec = {
  era: "2026-07-28",
  hasRequestMethod: hasRequestMethod2026,
  hasNotificationMethod: hasNotificationMethod2026,
  hasInputRequestMethod: (method) => getInputRequestSchema2026(method) !== undefined,
  validateRequest: (method, raw) => triState(getRequestSchema2026(method), raw),
  validateResult: (method, raw) => triState(getResultSchema2026(method), raw),
  validateNotification: (method, raw) => triState(getNotificationSchema2026(method), raw),
  validateInputRequest: (method, raw) => triState(getInputRequestSchema2026(method), raw),
  validateInputResponse: (method, raw) => triState(getInputResponseSchema2026(method), raw),
  samplingResultVariant: () => NOT_IN_ERA,
  outboundEnvelope(material) {
    return {
      [PROTOCOL_VERSION_META_KEY]: material.protocolVersion,
      [CLIENT_INFO_META_KEY]: material.clientInfo,
      [CLIENT_CAPABILITIES_META_KEY]: material.clientCapabilities,
      ...(material.logLevel !== undefined && {
        [LOG_LEVEL_META_KEY]: material.logLevel,
      }),
    };
  },
  validateEnvelopeMeta(meta) {
    let issues = [];
    for (let key of REQUIRED_ENVELOPE_KEYS)
      if (!(key in meta))
        issues.push({
          key,
          problem: "missing",
        });
    let parsed = buildSchemas2026().RequestMetaEnvelopeSchema.safeParse(meta);
    if (!parsed.success)
      for (let issue of parsed.error.issues) {
        let path = issue.path.map(String);
        let key = path.length > 0 ? path.join(".") : "_meta";
        if (
          path.length === 1 &&
          issues.some((existing) => existing.key === key && existing.problem === "missing")
        )
          continue;
        issues.push({
          key,
          problem: issue.message,
        });
      }
    return issues;
  },
  projectCallToolResult: (result) => appendTextFallbackForNonObject(result),
  inputRequestSchema: getInputRequestSchema2026,
  decodeResult(method, raw, r) {
    if (!Zr(raw))
      return {
        kind: "invalid",
        error: new SdkError(SdkErrorCode.InvalidResult, `Invalid result for ${method}: not an object`, {
          method,
        }),
      };
    let rawResultType = raw.resultType;
    if (rawResultType === undefined)
      return {
        kind: "invalid",
        error: new SdkError(
          SdkErrorCode.InvalidResult,
          `Invalid result for ${method}: missing required resultType \u2014 servers implementing protocol revision 2026-07-28 MUST include it (the absent-means-complete bridge applies only to earlier-revision servers)`,
          {
            method,
            violation: "missing-resultType",
          },
        ),
      };
    if (typeof rawResultType !== "string")
      return {
        kind: "invalid",
        error: new SdkError(
          SdkErrorCode.InvalidResult,
          `Invalid result for ${method}: non-string resultType`,
          {
            method,
            resultType: rawResultType,
          },
        ),
      };
    if (rawResultType === "input_required") {
      let rawInputRequests = raw.inputRequests;
      let inputRequests = Zr(rawInputRequests) ? rawInputRequests : {};
      let requestState = raw.requestState;
      if (Object.keys(inputRequests).length === 0 && typeof requestState !== "string")
        return {
          kind: "invalid",
          error: new SdkError(
            SdkErrorCode.InvalidResult,
            `Invalid result for ${method}: input_required carries neither inputRequests nor requestState (every input_required result must include at least one of the two)`,
            {
              method,
              violation: "input-required-missing-both",
            },
          ),
        };
      return {
        kind: "input_required",
        inputRequests,
        ...(typeof requestState === "string" && {
          requestState,
        }),
      };
    }
    if (rawResultType === "task")
      return {
        kind: "task",
        result: raw,
      };
    if (rawResultType !== "complete")
      return {
        kind: "invalid",
        error: new SdkError(
          SdkErrorCode.UnsupportedResultType,
          `Unsupported result type '${rawResultType}' for ${method}`,
          {
            resultType: rawResultType,
            method,
          },
        ),
      };
    let wireResultSchemas = getWireResultSchemas();
    let wireSchema = Object.hasOwn(wireResultSchemas, method) ? wireResultSchemas[method] : undefined;
    if (wireSchema !== undefined && r !== true) {
      let parsed = wireSchema.safeParse(raw);
      if (!parsed.success)
        return {
          kind: "invalid",
          error: new SdkError(SdkErrorCode.InvalidResult, `Invalid result for ${method}: ${parsed.error}`, {
            method,
          }),
        };
    }
    let lifted = {
      ...raw,
    };
    delete lifted.resultType;
    return {
      kind: "complete",
      result: lifted,
    };
  },
  encodeResult(method, result, serverInfo) {
    return stampServerInfoMeta(
      fillCacheFields(method, stampResultType(method, enforceDeletedFields(method, result))),
      serverInfo,
    );
  },
  encodeErrorCode: (code) => (code === -32002 ? -32602 : code),
  checkInboundEnvelope(material) {
    if (material.envelope === undefined)
      return "Request is missing the required _meta envelope for protocol revision 2026-07-28 (io.modelcontextprotocol/protocolVersion, io.modelcontextprotocol/clientCapabilities)";
    let parsed = buildSchemas2026().RequestMetaEnvelopeSchema.safeParse(material.envelope);
    if (!parsed.success)
      return `Invalid _meta envelope for protocol revision 2026-07-28: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`;
  },
};
var wireResultSchemasMemo;
//@ chunk-r1g76qsy.js:69307-69753 esm-fingerprint
function getWireResultSchemas() {
  if (wireResultSchemasMemo) return wireResultSchemasMemo;
  let s = buildSchemas2026();
  wireResultSchemasMemo = {
    "tools/call": s.CallToolResultSchema,
    "tools/list": s.ListToolsResultSchema,
    "prompts/get": s.GetPromptResultSchema,
    "prompts/list": s.ListPromptsResultSchema,
    "resources/list": s.ListResourcesResultSchema,
    "resources/templates/list": s.ListResourceTemplatesResultSchema,
    "resources/read": s.ReadResourceResultSchema,
    "completion/complete": s.CompleteResultSchema,
    "server/discover": s.DiscoverResultSchema,
  };
  return wireResultSchemasMemo;
}
//@ chunk-r1g76qsy.js:69753-69773 esm-fingerprint
var MODERN_WIRE_REVISION = "2026-07-28";
//@ chunk-r1g76qsy.js:69773-69819 esm-layout
function codecForVersion(version) {
  return version !== undefined && isModernProtocolVersion(version) ? rev2026Codec : rev2025Codec;
}
//@ chunk-r1g76qsy.js:69819-69921 esm-fingerprint
function classifiedWireEra(classification) {
  if (classification.revision !== undefined) return codecForVersion(classification.revision).era;
  return classification.era === "modern" ? rev2026Codec.era : rev2025Codec.era;
}
//@ chunk-r1g76qsy.js:69921-69979 esm-fingerprint
function isSpecRequestMethod(method) {
  return ALL_CODECS.some((codec) => codec.hasRequestMethod(method));
}
//@ chunk-r1g76qsy.js:69979-70042 esm-fingerprint
function isSpecNotificationMethod(method) {
  return ALL_CODECS.some((codec) => codec.hasNotificationMethod(method));
}
//@ chunk-r1g76qsy.js:70042-75375 esm-layout
var ALL_CODECS = [rev2025Codec, rev2026Codec];
var schemas_exports = qn({
  AnnotationsSchema: () => AnnotationsSchema,
  AudioContentSchema: () => AudioContentSchema,
  BaseMetadataSchema: () => BaseMetadataSchema,
  BaseRequestParamsSchema: () => BaseRequestParamsSchema,
  BlobResourceContentsSchema: () => BlobResourceContentsSchema,
  BooleanSchemaSchema: () => BooleanSchemaSchema,
  CallToolRequestParamsSchema: () => CallToolRequestParamsSchema,
  CallToolRequestSchema: () => CallToolRequestSchema,
  CallToolResultSchema: () => CallToolResultSchema,
  CancelTaskRequestSchema: () => CancelTaskRequestSchema,
  CancelTaskResultSchema: () => CancelTaskResultSchema,
  CancelledNotificationParamsSchema: () => CancelledNotificationParamsSchema,
  CancelledNotificationSchema: () => CancelledNotificationSchema,
  ClientCapabilitiesSchema: () => ClientCapabilitiesSchema,
  ClientNotificationSchema: () => Ha,
  ClientRequestSchema: () => Fa,
  ClientResultSchema: () => Ja,
  ClientTasksCapabilitySchema: () => ClientTasksCapabilitySchema,
  CompatibilityCallToolResultSchema: () => CompatibilityCallToolResultSchema,
  CompleteRequestParamsSchema: () => CompleteRequestParamsSchema,
  CompleteRequestSchema: () => CompleteRequestSchema,
  CompleteResultSchema: () => CompleteResultSchema,
  ContentBlockSchema: () => ContentBlockSchema,
  CreateMessageRequestParamsSchema: () => CreateMessageRequestParamsSchema,
  CreateMessageRequestSchema: () => CreateMessageRequestSchema,
  CreateMessageResultSchema: () => CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema: () => CreateMessageResultWithToolsSchema,
  CreateTaskResultSchema: () => CreateTaskResultSchema,
  CursorSchema: () => CursorSchema,
  DiscoverRequestSchema: () => DiscoverRequestSchema,
  DiscoverResultSchema: () => DiscoverResultSchema,
  ElicitRequestFormParamsSchema: () => ElicitRequestFormParamsSchema,
  ElicitRequestParamsSchema: () => ElicitRequestParamsSchema,
  ElicitRequestSchema: () => ElicitRequestSchema,
  ElicitRequestURLParamsSchema: () => ElicitRequestURLParamsSchema,
  ElicitResultSchema: () => ElicitResultSchema,
  ElicitationCompleteNotificationParamsSchema: () => ElicitationCompleteNotificationParamsSchema,
  ElicitationCompleteNotificationSchema: () => ElicitationCompleteNotificationSchema,
  EmbeddedResourceSchema: () => EmbeddedResourceSchema,
  EmptyResultSchema: () => EmptyResultSchema,
  EnumSchemaSchema: () => EnumSchemaSchema,
  GetPromptRequestParamsSchema: () => GetPromptRequestParamsSchema,
  GetPromptRequestSchema: () => GetPromptRequestSchema,
  GetPromptResultSchema: () => GetPromptResultSchema,
  GetTaskPayloadRequestSchema: () => GetTaskPayloadRequestSchema,
  GetTaskPayloadResultSchema: () => GetTaskPayloadResultSchema,
  GetTaskRequestSchema: () => GetTaskRequestSchema,
  GetTaskResultSchema: () => GetTaskResultSchema,
  IconSchema: () => IconSchema,
  IconsSchema: () => IconsSchema,
  ImageContentSchema: () => ImageContentSchema,
  ImplementationSchema: () => ImplementationSchema,
  InitializeRequestParamsSchema: () => InitializeRequestParamsSchema,
  InitializeRequestSchema: () => InitializeRequestSchema,
  InitializeResultSchema: () => InitializeResultSchema,
  InitializedNotificationSchema: () => InitializedNotificationSchema,
  JSONArraySchema: () => Ta,
  JSONObjectSchema: () => JSONObjectSchema,
  JSONRPCErrorResponseSchema: () => JSONRPCErrorResponseSchema,
  JSONRPCMessageSchema: () => fZe,
  JSONRPCNotificationSchema: () => JSONRPCNotificationSchema,
  JSONRPCRequestSchema: () => JSONRPCRequestSchema,
  JSONRPCResponseSchema: () => Ca,
  JSONRPCResultResponseSchema: () => JSONRPCResultResponseSchema,
  JSONValueSchema: () => JSONValueSchema,
  LegacyTitledEnumSchemaSchema: () => LegacyTitledEnumSchemaSchema,
  ListChangedOptionsBaseSchema: () => ListChangedOptionsBaseSchema,
  ListPromptsRequestSchema: () => ListPromptsRequestSchema,
  ListPromptsResultSchema: () => ListPromptsResultSchema,
  ListResourceTemplatesRequestSchema: () => ListResourceTemplatesRequestSchema,
  ListResourceTemplatesResultSchema: () => ListResourceTemplatesResultSchema,
  ListResourcesRequestSchema: () => ListResourcesRequestSchema,
  ListResourcesResultSchema: () => ListResourcesResultSchema,
  ListRootsRequestSchema: () => ListRootsRequestSchema,
  ListRootsResultSchema: () => ListRootsResultSchema,
  ListTasksRequestSchema: () => ListTasksRequestSchema,
  ListTasksResultSchema: () => ListTasksResultSchema,
  ListToolsRequestSchema: () => ListToolsRequestSchema,
  ListToolsResultSchema: () => ListToolsResultSchema,
  LoggingLevelSchema: () => LoggingLevelSchema,
  LoggingMessageNotificationParamsSchema: () => LoggingMessageNotificationParamsSchema,
  LoggingMessageNotificationSchema: () => LoggingMessageNotificationSchema,
  ModelHintSchema: () => ModelHintSchema,
  ModelPreferencesSchema: () => ModelPreferencesSchema,
  MultiSelectEnumSchemaSchema: () => MultiSelectEnumSchemaSchema,
  NotificationSchema: () => NotificationSchema,
  NotificationsParamsSchema: () => NotificationsParamsSchema,
  NumberSchemaSchema: () => NumberSchemaSchema,
  PaginatedRequestParamsSchema: () => PaginatedRequestParamsSchema,
  PaginatedRequestSchema: () => PaginatedRequestSchema,
  PaginatedResultSchema: () => PaginatedResultSchema,
  PingRequestSchema: () => PingRequestSchema,
  PrimitiveSchemaDefinitionSchema: () => PrimitiveSchemaDefinitionSchema,
  ProgressNotificationParamsSchema: () => ProgressNotificationParamsSchema,
  ProgressNotificationSchema: () => ProgressNotificationSchema,
  ProgressSchema: () => ProgressSchema,
  ProgressTokenSchema: () => ProgressTokenSchema,
  PromptArgumentSchema: () => PromptArgumentSchema,
  PromptListChangedNotificationSchema: () => PromptListChangedNotificationSchema,
  PromptMessageSchema: () => PromptMessageSchema,
  PromptReferenceSchema: () => PromptReferenceSchema,
  PromptSchema: () => PromptSchema,
  ReadResourceRequestParamsSchema: () => ReadResourceRequestParamsSchema,
  ReadResourceRequestSchema: () => ReadResourceRequestSchema,
  ReadResourceResultSchema: () => ReadResourceResultSchema,
  RelatedTaskMetadataSchema: () => RelatedTaskMetadataSchema,
  RequestIdSchema: () => RequestIdSchema,
  RequestMetaSchema: () => RequestMetaSchema,
  RequestSchema: () => RequestSchema,
  ResourceContentsSchema: () => ResourceContentsSchema,
  ResourceLinkSchema: () => ResourceLinkSchema,
  ResourceListChangedNotificationSchema: () => ResourceListChangedNotificationSchema,
  ResourceRequestParamsSchema: () => ResourceRequestParamsSchema,
  ResourceSchema: () => ResourceSchema,
  ResourceTemplateReferenceSchema: () => ResourceTemplateReferenceSchema,
  ResourceTemplateSchema: () => ResourceTemplateSchema,
  ResourceUpdatedNotificationParamsSchema: () => ResourceUpdatedNotificationParamsSchema,
  ResourceUpdatedNotificationSchema: () => ResourceUpdatedNotificationSchema,
  ResultMetaObjectSchema: () => ResultMetaObjectSchema,
  ResultSchema: () => ResultSchema,
  RoleSchema: () => RoleSchema,
  RootSchema: () => RootSchema,
  RootsListChangedNotificationSchema: () => RootsListChangedNotificationSchema,
  SamplingContentSchema: () => SamplingContentSchema,
  SamplingMessageContentBlockSchema: () => SamplingMessageContentBlockSchema,
  SamplingMessageSchema: () => SamplingMessageSchema,
  ServerCapabilitiesSchema: () => ServerCapabilitiesSchema,
  ServerNotificationSchema: () => Ba,
  ServerRequestSchema: () => Ga,
  ServerResultSchema: () => Wa,
  ServerTasksCapabilitySchema: () => ServerTasksCapabilitySchema,
  SetLevelRequestParamsSchema: () => SetLevelRequestParamsSchema,
  SetLevelRequestSchema: () => SetLevelRequestSchema,
  SingleSelectEnumSchemaSchema: () => SingleSelectEnumSchemaSchema,
  StringSchemaSchema: () => StringSchemaSchema,
  SubscribeRequestParamsSchema: () => SubscribeRequestParamsSchema,
  SubscribeRequestSchema: () => SubscribeRequestSchema,
  SubscriptionFilterSchema: () => SubscriptionFilterSchema,
  SubscriptionsAcknowledgedNotificationParamsSchema: () => SubscriptionsAcknowledgedNotificationParamsSchema,
  SubscriptionsAcknowledgedNotificationSchema: () => SubscriptionsAcknowledgedNotificationSchema,
  SubscriptionsListenRequestParamsSchema: () => SubscriptionsListenRequestParamsSchema,
  SubscriptionsListenRequestSchema: () => SubscriptionsListenRequestSchema,
  SubscriptionsListenResultMetaSchema: () => SubscriptionsListenResultMetaSchema,
  SubscriptionsListenResultSchema: () => SubscriptionsListenResultSchema,
  TaskAugmentedRequestParamsSchema: () => TaskAugmentedRequestParamsSchema,
  TaskCreationParamsSchema: () => TaskCreationParamsSchema,
  TaskMetadataSchema: () => TaskMetadataSchema,
  TaskSchema: () => TaskSchema,
  TaskStatusNotificationParamsSchema: () => TaskStatusNotificationParamsSchema,
  TaskStatusNotificationSchema: () => TaskStatusNotificationSchema,
  TaskStatusSchema: () => TaskStatusSchema,
  TextContentSchema: () => TextContentSchema,
  TextResourceContentsSchema: () => TextResourceContentsSchema,
  TitledMultiSelectEnumSchemaSchema: () => TitledMultiSelectEnumSchemaSchema,
  TitledSingleSelectEnumSchemaSchema: () => TitledSingleSelectEnumSchemaSchema,
  ToolAnnotationsSchema: () => ToolAnnotationsSchema,
  ToolChoiceSchema: () => ToolChoiceSchema,
  ToolExecutionSchema: () => ToolExecutionSchema,
  ToolListChangedNotificationSchema: () => ToolListChangedNotificationSchema,
  ToolResultContentSchema: () => ToolResultContentSchema,
  ToolSchema: () => ToolSchema,
  ToolUseContentSchema: () => ToolUseContentSchema,
  UnsubscribeRequestParamsSchema: () => UnsubscribeRequestParamsSchema,
  UnsubscribeRequestSchema: () => UnsubscribeRequestSchema,
  UntitledMultiSelectEnumSchemaSchema: () => UntitledMultiSelectEnumSchemaSchema,
  UntitledSingleSelectEnumSchemaSchema: () => UntitledSingleSelectEnumSchemaSchema,
});
//@ chunk-r1g76qsy.js:75375-75459 layout
function Rt(e) {
  if (e?.method === undefined && isJSONRPCResultResponse(e)) return JSONRPCResultResponseSchema.parse(e);
  return fZe.parse(e);
}
//@ chunk-r1g76qsy.js:75459-75530 layout
function Me(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-r1g76qsy.js:75530-75597 layout
function ua(id) {
  return typeof id === "string" || Number.isSafeInteger(id);
}
//@ chunk-r1g76qsy.js:75597-75683 layout
function da(e, t, r, s, a) {
  for (let key in e) if (key !== t && key !== r && key !== s && key !== a) return false;
  return true;
}
//@ chunk-r1g76qsy.js:75683-75956 layout
function _i(params) {
  if (params === undefined) return true;
  if (!Me(params)) return false;
  let _meta = params._meta;
  if (_meta === undefined) return true;
  if (!Me(_meta)) return false;
  if (_meta.progressToken !== undefined && !ua(_meta.progressToken)) return false;
  let r = _meta["io.modelcontextprotocol/related-task"];
  return r === undefined || (Me(r) && typeof r.taskId === "string");
}
//@ chunk-r1g76qsy.js:75956-76507 layout
var isJSONRPCRequest = (e) =>
  Me(e) &&
  e.jsonrpc === "2.0" &&
  ua(e.id) &&
  typeof e.method === "string" &&
  _i(e.params) &&
  da(e, "jsonrpc", "id", "method", "params");
var isJSONRPCNotification = (e) =>
  Me(e) &&
  e.jsonrpc === "2.0" &&
  typeof e.method === "string" &&
  _i(e.params) &&
  da(e, "jsonrpc", "method", "params");
var isJSONRPCResultResponse = (e) =>
  Me(e) &&
  e.jsonrpc === "2.0" &&
  ua(e.id) &&
  Me(e.result) &&
  (e.result._meta === undefined || Me(e.result._meta)) &&
  da(e, "jsonrpc", "id", "result");
var isJSONRPCErrorResponse = (e) =>
  Me(e) &&
  e.jsonrpc === "2.0" &&
  (e.id === undefined || ua(e.id)) &&
  Me(e.error) &&
  Number.isSafeInteger(e.error.code) &&
  typeof e.error.message === "string" &&
  da(e, "jsonrpc", "id", "error");
//@ chunk-r1g76qsy.js:76507-76601 esm-fingerprint
var isInputRequiredResult = (value) =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  value.resultType === "input_required";
//@ chunk-r1g76qsy.js:76601-76750 esm-layout
var lYn = (e) => Me(e) && e.method === "initialize" && InitializeRequestSchema.safeParse(e).success;
var qNr = (e) =>
  Me(e) && e.method === "notifications/initialized" && InitializedNotificationSchema.safeParse(e).success;
//@ chunk-r1g76qsy.js:76750-76876 esm-fingerprint
var MCP_PARAM_HEADER_PREFIX = "Mcp-Param-";
var X_MCP_HEADER_KEY = "x-mcp-header";
var RFC9110_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
var PERMITTED_X_MCP_HEADER_TYPES = new Set(["string", "integer", "boolean", "number"]);
//@ chunk-r1g76qsy.js:76876-78243 esm-fingerprint
function scanXMcpHeaderDeclarations(inputSchema) {
  let declarations = [];
  let seenLower = new Map();
  let visit = (node, path, reachable) => {
    if (node === null || typeof node !== "object") return;
    let schema = node;
    if (X_MCP_HEADER_KEY in schema) {
      if (!reachable || path.length === 0)
        return `${pathName(path)}: x-mcp-header is only permitted on properties statically reachable via a chain of 'properties' keys (not under items, additionalProperties, oneOf/anyOf/allOf/not, if/then/else, or $ref)`;
      let raw = schema[X_MCP_HEADER_KEY];
      if (typeof raw !== "string" || raw.length === 0)
        return `${pathName(path)}: x-mcp-header MUST be a non-empty string`;
      if (!RFC9110_TOKEN.test(raw))
        return `${pathName(path)}: x-mcp-header '${raw}' is not a valid RFC 9110 token (no spaces, control characters or HTTP delimiters)`;
      let type = typeof schema.type === "string" ? schema.type : undefined;
      if (type === undefined || !PERMITTED_X_MCP_HEADER_TYPES.has(type))
        return `${pathName(path)}: x-mcp-header is only permitted on primitive-typed properties (string, integer, boolean); got ${type ?? "<none>"}`;
      let lower = raw.toLowerCase();
      let prior = seenLower.get(lower);
      if (prior !== undefined)
        return `x-mcp-header '${raw}' is not case-insensitively unique (also declared as '${prior}')`;
      seenLower.set(lower, raw);
      declarations.push({
        path,
        headerName: raw,
        type,
      });
    }
    let properties = schema.properties;
    if (properties !== null && typeof properties === "object")
      for (let [key, child] of Object.entries(properties)) {
        let fault$1 = visit(child, [...path, key], reachable);
        if (fault$1 !== undefined) return fault$1;
      }
    for (let k of NON_REACHABLE_SUBSCHEMA_KEYWORDS) {
      let sub = schema[k];
      if (sub === undefined) continue;
      let branches = Array.isArray(sub)
        ? sub
        : sub !== null && typeof sub === "object" && OBJECT_VALUED_SUBSCHEMA_KEYWORDS.has(k)
          ? Object.values(sub)
          : [sub];
      for (let branch of branches) {
        let fault$1 = visit(branch, [...path, `<${k}>`], false);
        if (fault$1 !== undefined) return fault$1;
      }
    }
  };
  let fault = visit(inputSchema, [], true);
  return fault === undefined
    ? {
        valid: true,
        declarations,
      }
    : {
        valid: false,
        reason: fault,
      };
}
//@ chunk-r1g76qsy.js:78243-78552 esm-fingerprint
var NON_REACHABLE_SUBSCHEMA_KEYWORDS = [
  "items",
  "prefixItems",
  "contains",
  "additionalProperties",
  "unevaluatedProperties",
  "unevaluatedItems",
  "propertyNames",
  "patternProperties",
  "dependentSchemas",
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "if",
  "then",
  "else",
  "$defs",
  "definitions",
];
var OBJECT_VALUED_SUBSCHEMA_KEYWORDS = new Set([
  "patternProperties",
  "dependentSchemas",
  "$defs",
  "definitions",
]);
//@ chunk-r1g76qsy.js:78552-78608 esm-fingerprint
function pathName(path) {
  return path.length === 0 ? "<root>" : path.join(".");
}
//@ chunk-r1g76qsy.js:78608-78635 esm-fingerprint
var BASE64_SENTINEL_PREFIX = "=?base64?";
var BASE64_SENTINEL_SUFFIX = "?=";
//@ chunk-r1g76qsy.js:78635-78858 esm-fingerprint
function mcpParamPrimitiveToString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return;
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) return;
    return String(value);
  }
}
//@ chunk-r1g76qsy.js:78858-79070 esm-fingerprint
function needsBase64(s) {
  if (s.length === 0) return true;
  if (s.startsWith(BASE64_SENTINEL_PREFIX) && s.endsWith(BASE64_SENTINEL_SUFFIX)) return true;
  if (s !== s.trim()) return true;
  for (let i = 0; i < s.length; i++) {
    let c = s.codePointAt(i);
    if (c === 9 || (c >= 32 && c <= 126)) continue;
    return true;
  }
  return false;
}
//@ chunk-r1g76qsy.js:79070-79181 esm-fingerprint
function utf8ToBase64(s) {
  let bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let b of bytes) bin += String.fromCodePoint(b);
  return btoa(bin);
}
//@ chunk-r1g76qsy.js:79181-79232 esm-layout
function encodeMcpParamValue(value) {
  return needsBase64(value)
    ? `${BASE64_SENTINEL_PREFIX}${utf8ToBase64(value)}${BASE64_SENTINEL_SUFFIX}`
    : value;
}
//@ chunk-r1g76qsy.js:79232-79329 esm-layout
function valueAtPath(root, path) {
  let node = root;
  for (let key of path) {
    if (node === null || typeof node !== "object") return;
    node = node[key];
  }
  return node;
}
//@ chunk-r1g76qsy.js:79329-79499 esm-fingerprint
function buildMcpParamHeaders(declarations, args) {
  let out = {};
  for (let decl of declarations) {
    let raw = valueAtPath(args, decl.path);
    if (raw === undefined || raw === null) continue;
    let stringValue = mcpParamPrimitiveToString(raw);
    if (stringValue === undefined) continue;
    out[`${MCP_PARAM_HEADER_PREFIX}${decl.headerName}`] = encodeMcpParamValue(stringValue);
  }
  return out;
}
//@ chunk-r1g76qsy.js:79499-84495 esm-fingerprint
var HEADER_MISMATCH_ERROR_CODE = -32020;
var INBOUND_VALIDATION_LADDER = [
  {
    rung: "http-method",
    order: 1,
    evaluatedAt: "edge",
    codes: [-32000],
    conformance: [],
    rationale:
      "The modern era is POST-only; GET/DELETE are body-less 2025-era session operations and are method-routed to legacy serving (405 when legacy serving is not configured), before any body is read.",
  },
  {
    rung: "jsonrpc-shape",
    order: 2,
    evaluatedAt: "edge",
    codes: [ProtocolErrorCode.InvalidRequest],
    conformance: ["server-stateless"],
    rationale:
      "The body must be a JSON-RPC request or notification: posted responses and batch arrays containing a modern or invalid element are rejected before classification (element-wise batch rule); all-legacy arrays stay legacy traffic.",
  },
  {
    rung: "era-classification",
    order: 3,
    evaluatedAt: "edge",
    codes: [HEADER_MISMATCH_ERROR_CODE, ProtocolErrorCode.UnsupportedProtocolVersion],
    conformance: ["server-stateless", "http-header-validation", "http-custom-header-server-validation"],
    rationale:
      "Body-primary era classification with the protocol-version header as a cross-check; a header/body disagreement is rejected with -32020 (HeaderMismatch), and an envelope-less request on a modern-only endpoint is answered with the unsupported-protocol-version error naming the supported revisions.",
  },
  {
    rung: "envelope",
    order: 4,
    evaluatedAt: "edge",
    codes: [ProtocolErrorCode.InvalidParams],
    conformance: ["server-stateless"],
    rationale:
      "A present envelope claim with a malformed envelope \u2014 and a missing envelope on a request whose protocol-version header names a modern revision \u2014 is an invalid-params rejection naming the offending or missing key(s); never a silent fall back to legacy handling. This is the only place an invalid-params rejection maps to HTTP 400.",
  },
  {
    rung: "method-registry",
    order: 5,
    evaluatedAt: "dispatch",
    codes: [ProtocolErrorCode.MethodNotFound],
    conformance: ["server-stateless"],
    rationale:
      "Method existence outranks parameter validity: a method absent from the negotiated revision\u2019s registry (or with no handler installed) answers method-not-found before params or capabilities are looked at.",
  },
  {
    rung: "request-params",
    order: 6,
    evaluatedAt: "dispatch",
    codes: [ProtocolErrorCode.InvalidParams],
    conformance: [],
    rationale:
      "Per-method params validation; emitted in-band by the dispatch layer (HTTP 200), never via the ladder status table.",
  },
  {
    rung: "standard-header-validation",
    order: 7,
    evaluatedAt: "pre-dispatch",
    codes: [HEADER_MISMATCH_ERROR_CODE],
    conformance: ["http-header-validation"],
    rationale:
      "SEP-2243 standard `Mcp-Method` / `Mcp-Name` headers \u2014 presence, sentinel decoding, and `Mcp-Name` \u2194 body cross-check \u2014 are validated by the HTTP entry on a modern-classified request after the supported-revision gate and before dispatch. The classifier\u2019s own header-mismatch cells (protocol-version, `Mcp-Method` mismatch) stay on the edge `era-classification` rung; this rung carries the entry-layer presence/`Mcp-Name` half. Evaluated before the capability gate, the factory call, and the `Mcp-Param-*` rung so a request that fails several rungs is answered by the standard-header rung first. The documented order (after method-registry 5 and request-params 6) is NOT the observed precedence: serveModern evaluates this rung immediately after the supported-revision gate, so a request that also fails a dispatch rung is answered here before the dispatch rungs (5\u20136) are consulted.",
  },
  {
    rung: "client-capabilities",
    order: 8,
    evaluatedAt: "pre-dispatch",
    codes: [ProtocolErrorCode.MissingRequiredClientCapability],
    conformance: ["server-stateless"],
    rationale:
      "The capability requirement is checked by the HTTP entry, pre-dispatch, against the validated envelope the classifier produced \u2014 pinning the spec-mandated HTTP 400 independently of how dispatch- and handler-produced errors are mapped. The documented order (after method resolution and params validation) is preserved observably only while the requirement table is empty: once a served method gains a requirement entry, a request that is missing the capability and would also fail a dispatch rung is answered by this gate first, so the entry must consult the method registry before the gate if the documented precedence is to stay observable.",
  },
  {
    rung: "param-header-validation",
    order: 9,
    evaluatedAt: "pre-dispatch",
    codes: [HEADER_MISMATCH_ERROR_CODE],
    conformance: ["http-custom-header-server-validation"],
    rationale:
      "SEP-2243 `Mcp-Param-*` headers are validated against the named tool\u2019s `x-mcp-header` declarations and the body `arguments` after the tool registry is known and before dispatch reaches the handler; a missing/disagreeing/malformed header is rejected 400 / -32020 with the same shape as the standard-header cross-checks. The documented order (after method resolution and params validation) is preserved observably only when the body `arguments` would otherwise validate: the check runs pre-dispatch, so a `tools/call` that fails BOTH this rung and a dispatch-time rung (e.g. order-6 `request-params`, -32602) is answered by this gate first with 400 / -32020, not by the earlier-ordered rung.",
  },
];
var LADDER_ERROR_HTTP_STATUS = {
  [ProtocolErrorCode.ParseError]: 400,
  [ProtocolErrorCode.InvalidRequest]: 400,
  [ProtocolErrorCode.MethodNotFound]: 404,
  [ProtocolErrorCode.UnsupportedProtocolVersion]: 400,
  [ProtocolErrorCode.MissingRequiredClientCapability]: 400,
  [HEADER_MISMATCH_ERROR_CODE]: 400,
};
//@ chunk-r1g76qsy.js:84495-84528 esm-layout
function parseSchema(schema, data) {
  return slo(schema, data);
}
//@ chunk-r1g76qsy.js:84528-84596 esm-fingerprint
function shapeKeys(schemas) {
  return new Set(schemas.flatMap((schema) => Object.keys(schema.shape)));
}
//@ chunk-r1g76qsy.js:84596-84770 esm-fingerprint
function isStandardSchema(schema) {
  if (schema == null) return false;
  let schemaType = typeof schema;
  if (schemaType !== "object" && schemaType !== "function") return false;
  if (!("~standard" in schema)) return false;
  return typeof schema["~standard"]?.validate === "function";
}
//@ chunk-r1g76qsy.js:84770-84799 esm-layout
var warnedZodFallback = false;
var JSON_SCHEMA_CONVERSION_TARGET = "draft-2020-12";
//@ chunk-r1g76qsy.js:84799-85828 esm-fingerprint
function standardSchemaToJsonSchema(schema, io = "input") {
  let std = schema["~standard"];
  let result;
  if (std.jsonSchema)
    result = std.jsonSchema[io]({
      target: JSON_SCHEMA_CONVERSION_TARGET,
    });
  else if (std.vendor === "zod") {
    if (!("_zod" in schema))
      throw Error(
        "Schema appears to be from zod 3, which the SDK cannot convert to JSON Schema. Upgrade to zod >=4.2.0, or wrap your JSON Schema with fromJsonSchema().",
      );
    if (!warnedZodFallback) {
      warnedZodFallback = true;
      console.warn(
        "[mcp-sdk] Your zod version does not implement `~standard.jsonSchema` (added in zod 4.2.0). Falling back to z.toJSONSchema(). Upgrade to zod >=4.2.0 to silence this warning.",
      );
    }
    result = toJSONSchema(schema, {
      target: JSON_SCHEMA_CONVERSION_TARGET,
      io,
    });
  } else
    throw Error(
      `Schema library "${std.vendor}" does not implement StandardJSONSchemaV1 (\`~standard.jsonSchema\`). Upgrade to a version that does, or wrap your JSON Schema with fromJsonSchema().`,
    );
  if (io === "output") {
    if (result.type !== undefined) return result;
    return isProvablyObjectShapedRoot(result)
      ? {
          type: "object",
          ...result,
        }
      : result;
  }
  if (result.type !== undefined && result.type !== "object")
    throw Error(
      `MCP tool and prompt schemas must describe objects (got type: ${JSON.stringify(result.type)}). Wrap your schema in z.object({...}) or equivalent.`,
    );
  return {
    type: "object",
    ...result,
  };
}
//@ chunk-r1g76qsy.js:85828-86111 esm-fingerprint
function isProvablyObjectShapedRoot(schema) {
  if (
    "properties" in schema ||
    "patternProperties" in schema ||
    "additionalProperties" in schema ||
    "required" in schema
  )
    return true;
  for (let key of ["oneOf", "anyOf", "allOf"]) {
    let members = schema[key];
    if (Array.isArray(members) && members.length > 0)
      return members.every(
        (m) => m !== null && typeof m === "object" && (m.type === "object" || isProvablyObjectShapedRoot(m)),
      );
  }
  return false;
}
//@ chunk-r1g76qsy.js:86111-86250 esm-fingerprint
function formatIssue(issue) {
  if (!issue.path?.length) return issue.message;
  return `${issue.path.map((p) => String(typeof p === "object" ? p.key : p)).join(".")}: ${issue.message}`;
}
//@ chunk-r1g76qsy.js:86250-86436 esm-fingerprint
async function validateStandardSchema(schema, data) {
  let result = await schema["~standard"].validate(data);
  if (result.issues && result.issues.length > 0)
    return {
      success: false,
      error: result.issues.map((i) => formatIssue(i)).join(", "),
    };
  return {
    success: true,
    data: result.value,
  };
}
//@ chunk-r1g76qsy.js:86436-86539 esm-fingerprint
function zodEmittedPattern(schema) {
  let jsonSchema = toJSONSchema(schema, {
    target: JSON_SCHEMA_CONVERSION_TARGET,
    io: "input",
  });
  return typeof jsonSchema.pattern === "string" ? jsonSchema.pattern : undefined;
}
//@ chunk-r1g76qsy.js:86539-86565 esm-fingerprint
var DATETIME_FRACTION_DIGITS = /\\\.\\d\{(\d+)\}/;
//@ chunk-r1g76qsy.js:86565-86736 esm-fingerprint
function datetimeReferenceSchemas(pattern) {
  let fractionDigits = DATETIME_FRACTION_DIGITS.exec(pattern);
  let precisions = [undefined, -1, 0];
  if (fractionDigits) precisions.push(Number(fractionDigits[1]));
  return [false, true].flatMap((local) =>
    [false, true].flatMap((offset) =>
      precisions.map((precision) =>
        parseToolOutputSchema({
          local,
          offset,
          precision,
        }),
      ),
    ),
  );
}
//@ chunk-r1g76qsy.js:86736-86938 esm-fingerprint
function referencePatternsForFormat(format, pattern) {
  let referenceSchemas;
  switch (format) {
    case "email":
      referenceSchemas = [_Ii()];
      break;
    case "uri":
      referenceSchemas = [A8e()];
      break;
    case "date":
      referenceSchemas = [parseToolInputSchemaLoose()];
      break;
    case "date-time":
      referenceSchemas = datetimeReferenceSchemas(pattern);
      break;
  }
  return new Set(
    referenceSchemas.map((schema) => zodEmittedPattern(schema)).filter((emitted) => emitted !== undefined),
  );
}
//@ chunk-r1g76qsy.js:86938-87001 esm-fingerprint
function isLibraryFormatPattern(format, pattern, vendor) {
  if (vendor !== "zod") return true;
  return referencePatternsForFormat(format, pattern).has(pattern);
}
//@ chunk-r1g76qsy.js:87001-87072 esm-fingerprint
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-r1g76qsy.js:87072-87289 esm-fingerprint
function convertStandardElicitationSchema(schema) {
  try {
    return standardSchemaToJsonSchema(schema, "input");
  } catch (error) {
    let detail = error instanceof Error ? error.message : String(error);
    throw new ProtocolError(
      ProtocolErrorCode.InvalidParams,
      `Elicitation requestedSchema must describe an object with flat primitive properties: ${detail}`,
    );
  }
}
//@ chunk-r1g76qsy.js:87289-87387 esm-fingerprint
var ANNOTATION_ONLY_JSON_SCHEMA_KEYWORDS = new Set([
  "$comment",
  "deprecated",
  "description",
  "examples",
  "readOnly",
  "title",
  "writeOnly",
]);
//@ chunk-r1g76qsy.js:87387-87439 esm-fingerprint
function isAnnotationOnlyJsonSchemaKeyword(key) {
  return ANNOTATION_ONLY_JSON_SCHEMA_KEYWORDS.has(key) || key.startsWith("x-");
}
//@ chunk-r1g76qsy.js:87439-87657 esm-fingerprint
var ROOT_KEYS = new Set([
  "$schema",
  ...Object.keys(ElicitRequestFormParamsSchema.shape.requestedSchema.shape),
]);
var PROPERTY_KEYS_BY_TYPE = {
  string: shapeKeys([
    StringSchemaSchema,
    UntitledSingleSelectEnumSchemaSchema,
    TitledSingleSelectEnumSchemaSchema,
    LegacyTitledEnumSchemaSchema,
  ]),
  number: shapeKeys([NumberSchemaSchema]),
  integer: shapeKeys([NumberSchemaSchema]),
  boolean: shapeKeys([BooleanSchemaSchema]),
  array: shapeKeys([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]),
};
var SUPPORTED_STRING_FORMATS = new Set(StringSchemaSchema.shape.format.unwrap().options);
//@ chunk-r1g76qsy.js:87657-88062 esm-fingerprint
function walkProperty(node, path, vendor, unsupported) {
  if (!isJsonObject(node)) return node;
  let allowedKeys =
    typeof node.type === "string" && Object.hasOwn(PROPERTY_KEYS_BY_TYPE, node.type)
      ? PROPERTY_KEYS_BY_TYPE[node.type]
      : undefined;
  if (allowedKeys === undefined) return node;
  let pruned = {};
  for (let [key, value] of Object.entries(node))
    if (allowedKeys.has(key) || isAnnotationOnlyJsonSchemaKeyword(key)) pruned[key] = value;
    else if (key === "pattern" && node.type === "string" && typeof node.format === "string") {
      if (!SUPPORTED_STRING_FORMATS.has(node.format)) pruned[key] = value;
      else if (typeof value !== "string" || !isLibraryFormatPattern(node.format, value, vendor))
        unsupported.push(`${path}.${key}`);
    } else unsupported.push(`${path}.${key}`);
  return pruned;
}
//@ chunk-r1g76qsy.js:88062-88473 esm-fingerprint
function walkRequestedSchema(converted, vendor) {
  let pruned = {};
  let unsupported = [];
  for (let [key, value] of Object.entries(converted))
    if (key === "properties" && isJsonObject(value))
      pruned[key] = Object.fromEntries(
        Object.entries(value).map(([name, node]) => [
          name,
          walkProperty(node, `properties.${name}`, vendor, unsupported),
        ]),
      );
    else if (ROOT_KEYS.has(key)) pruned[key] = value;
    else if (!isAnnotationOnlyJsonSchemaKeyword(key)) unsupported.push(key);
  if (unsupported.length > 0)
    throw new ProtocolError(
      ProtocolErrorCode.InvalidParams,
      `Elicitation requestedSchema contains unsupported JSON Schema constraint(s) after Standard Schema conversion: ${unsupported.join(", ")}`,
    );
  return pruned;
}
//@ chunk-r1g76qsy.js:88473-88652 esm-fingerprint
function describeUnsupportedProperties(pruned, fallback) {
  if (!isJsonObject(pruned.properties)) return fallback;
  let offenders = Object.entries(pruned.properties)
    .filter(([, node]) => !parseSchema(PrimitiveSchemaDefinitionSchema, node).success)
    .map(([name]) => `properties.${name}`);
  return offenders.length > 0 ? offenders.join(", ") : fallback;
}
//@ chunk-r1g76qsy.js:88652-88941 esm-fingerprint
function findDroppedConstraintPaths(original, parsed, path = "") {
  if (Array.isArray(original) && Array.isArray(parsed))
    return original.flatMap((item, index) =>
      findDroppedConstraintPaths(item, parsed[index], `${path}[${index}]`),
    );
  if (!isJsonObject(original) || !isJsonObject(parsed)) return [];
  return Object.entries(original).flatMap(([key, value]) => {
    let childPath = path ? `${path}.${key}` : key;
    if (!Object.prototype.hasOwnProperty.call(parsed, key))
      return isAnnotationOnlyJsonSchemaKeyword(key) ? [] : [childPath];
    return findDroppedConstraintPaths(value, parsed[key], childPath);
  });
}
//@ chunk-r1g76qsy.js:88941-89834 esm-fingerprint
function normalizeElicitInputParams(input) {
  if (!isStandardSchema(input.requestedSchema))
    return {
      ...input,
      mode: "form",
      requestedSchema: input.requestedSchema,
    };
  let vendor = input.requestedSchema["~standard"].vendor;
  let pruned = walkRequestedSchema(convertStandardElicitationSchema(input.requestedSchema), vendor);
  let parsed = parseSchema(ElicitRequestFormParamsSchema.shape.requestedSchema, pruned);
  if (!parsed.success)
    throw new ProtocolError(
      ProtocolErrorCode.InvalidParams,
      `Elicitation requestedSchema only supports flat primitive properties (string, number, integer, boolean, and string enums): ${describeUnsupportedProperties(pruned, parsed.error.message)}`,
    );
  let droppedConstraints = findDroppedConstraintPaths(pruned, parsed.data);
  if (droppedConstraints.length > 0)
    throw new ProtocolError(
      ProtocolErrorCode.InvalidParams,
      `Elicitation requestedSchema contains unsupported JSON Schema constraint(s) after Standard Schema conversion: ${droppedConstraints.join(", ")}`,
    );
  let danglingRequired = (parsed.data.required ?? []).filter(
    (key) => !Object.prototype.hasOwnProperty.call(parsed.data.properties, key),
  );
  if (danglingRequired.length > 0)
    throw new ProtocolError(
      ProtocolErrorCode.InvalidParams,
      `Elicitation requestedSchema lists required properties that are not defined in properties: ${danglingRequired.join(", ")}`,
    );
  return {
    ...input,
    mode: "form",
    requestedSchema: parsed.data,
  };
}
//@ chunk-r1g76qsy.js:89834-90306 esm-fingerprint
function buildInputRequired(spec) {
  let hasInputRequests = spec.inputRequests !== undefined && Object.keys(spec.inputRequests).length > 0;
  let hasRequestState = typeof spec.requestState === "string";
  if (!hasInputRequests && !hasRequestState)
    throw TypeError(
      "inputRequired() requires at least one of inputRequests (with at least one entry) or requestState (spec: every InputRequiredResult MUST include at least one of the two)",
    );
  return {
    resultType: "input_required",
    ...(spec.inputRequests !== undefined && {
      inputRequests: spec.inputRequests,
    }),
    ...(spec.requestState !== undefined && {
      requestState: spec.requestState,
    }),
  };
}
//@ chunk-r1g76qsy.js:90306-90645 esm-fingerprint
var inputRequired = Object.assign(buildInputRequired, {
  elicit(params) {
    try {
      return {
        method: "elicitation/create",
        params: normalizeElicitInputParams(params),
      };
    } catch (error) {
      throw error instanceof ProtocolError
        ? TypeError(error.message, {
            cause: error,
          })
        : error;
    }
  },
  elicitUrl(params) {
    return {
      method: "elicitation/create",
      params: {
        ...params,
        mode: "url",
      },
    };
  },
  createMessage(params) {
    return {
      method: "sampling/createMessage",
      params,
    };
  },
  listRoots() {
    return {
      method: "roots/list",
    };
  },
});
//@ chunk-r1g76qsy.js:90645-90668 esm-layout
var DEFAULT_INPUT_REQUIRED_AUTO_FULFILL = true;
var DEFAULT_INPUT_REQUIRED_MAX_ROUNDS = 10;
var REQUEST_STATE_ONLY_LEG_PACING_MS = 250;
//@ chunk-r1g76qsy.js:90668-90749 esm-fingerprint
function resolveInputRequiredDriverConfig(options) {
  return {
    autoFulfill: options?.autoFulfill ?? DEFAULT_INPUT_REQUIRED_AUTO_FULFILL,
    maxRounds: options?.maxRounds ?? DEFAULT_INPUT_REQUIRED_MAX_ROUNDS,
  };
}
//@ chunk-r1g76qsy.js:90749-90907 esm-fingerprint
function buildInputRequiredRetryParams(originalParams, responses, requestState) {
  let hasResponses = responses !== undefined && Object.keys(responses).length > 0;
  if (!hasResponses && requestState === undefined) return originalParams;
  return {
    ...originalParams,
    ...(hasResponses && {
      inputResponses: responses,
    }),
    ...(requestState !== undefined && {
      requestState,
    }),
  };
}
//@ chunk-r1g76qsy.js:90907-91029 esm-fingerprint
function inputRequiredRoundsExceededMessage(method, maxRounds) {
  return `Multi-round-trip request '${method}' still required input after ${maxRounds} rounds (inputRequired.maxRounds)`;
}
//@ chunk-r1g76qsy.js:91029-91384 esm-fingerprint
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        signal.reason instanceof SdkError
          ? signal.reason
          : new SdkError(SdkErrorCode.RequestTimeout, String(signal.reason)),
      );
      return;
    }
    let timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    let onAbort = () => {
      clearTimeout(timer);
      reject(
        signal?.reason instanceof SdkError
          ? signal.reason
          : new SdkError(SdkErrorCode.RequestTimeout, String(signal?.reason)),
      );
    };
    signal?.addEventListener("abort", onAbort, {
      once: true,
    });
  });
}
//@ chunk-r1g76qsy.js:91384-91615 esm-fingerprint
function linkedRoundAbort(outer) {
  let controller = new AbortController();
  let onOuterAbort = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", onOuterAbort, {
    once: true,
  });
  if (outer?.aborted) controller.abort(outer.reason);
  return {
    signal: controller.signal,
    abort: (reason) => controller.abort(reason),
    dispose: () => outer?.removeEventListener("abort", onOuterAbort),
  };
}
//@ chunk-r1g76qsy.js:91615-92780 esm-fingerprint
async function runInputRequiredDriver(args) {
  let { config, method, originalParams, requestOptions, hooks, signal } = args;
  let startedAt = args.flowStartedAt ?? Date.now();
  let payload = args.firstPayload;
  let round = 0;
  while (true) {
    round += 1;
    if (round > config.maxRounds)
      throw new SdkError(
        SdkErrorCode.InputRequiredRoundsExceeded,
        inputRequiredRoundsExceededMessage(method, config.maxRounds),
        {
          rounds: config.maxRounds,
          lastResult: {
            inputRequests: payload.inputRequests,
            ...(payload.requestState !== undefined && {
              requestState: payload.requestState,
            }),
          },
        },
      );
    requestOptions.onprogress?.({
      progress: round,
      message: `Fulfilling input required by '${method}' (round ${round})`,
    });
    let entries = Object.entries(payload.inputRequests ?? {});
    let responses;
    if (entries.length > 0) {
      let round$1 = linkedRoundAbort(signal);
      try {
        let fulfilled = await Promise.all(
          entries.map(async ([key, entry]) => {
            try {
              return [key, await hooks.dispatchInputRequest(key, entry, round$1.signal)];
            } catch (error) {
              round$1.abort(error);
              throw error;
            }
          }),
        );
        responses = Object.fromEntries(fulfilled);
      } finally {
        round$1.dispose();
      }
    } else await sleep(REQUEST_STATE_ONLY_LEG_PACING_MS, signal);
    let legOptions = {
      ...(requestOptions.timeout !== undefined && {
        timeout: requestOptions.timeout,
      }),
    };
    if (requestOptions.maxTotalTimeout !== undefined) {
      let totalElapsed = Date.now() - startedAt;
      let remaining = requestOptions.maxTotalTimeout - totalElapsed;
      if (remaining <= 0)
        throw new SdkError(SdkErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
          maxTotalTimeout: requestOptions.maxTotalTimeout,
          totalElapsed,
        });
      legOptions.maxTotalTimeout = remaining;
    }
    let result = await hooks.retry(
      buildInputRequiredRetryParams(originalParams, responses, payload.requestState),
      legOptions,
    );
    if (isInputRequiredResult(result)) {
      payload = {
        inputRequests: result.inputRequests ?? {},
        ...(result.requestState !== undefined && {
          requestState: result.requestState,
        }),
      };
      continue;
    }
    return result;
  }
}
//@ chunk-r1g76qsy.js:92780-97520 esm-fingerprint
var SPEC_SCHEMA_KEYS = [
  "AnnotationsSchema",
  "AudioContentSchema",
  "BaseMetadataSchema",
  "BlobResourceContentsSchema",
  "BooleanSchemaSchema",
  "CallToolRequestSchema",
  "CallToolRequestParamsSchema",
  "CallToolResultSchema",
  "CancelledNotificationSchema",
  "CancelledNotificationParamsSchema",
  "CancelTaskRequestSchema",
  "CancelTaskResultSchema",
  "ClientCapabilitiesSchema",
  "ClientNotificationSchema",
  "ClientRequestSchema",
  "ClientResultSchema",
  "CompatibilityCallToolResultSchema",
  "CompleteRequestSchema",
  "CompleteRequestParamsSchema",
  "CompleteResultSchema",
  "ContentBlockSchema",
  "CreateMessageRequestSchema",
  "CreateMessageRequestParamsSchema",
  "CreateMessageResultSchema",
  "CreateMessageResultWithToolsSchema",
  "CreateTaskResultSchema",
  "CursorSchema",
  "DiscoverRequestSchema",
  "DiscoverResultSchema",
  "ElicitationCompleteNotificationSchema",
  "ElicitationCompleteNotificationParamsSchema",
  "ElicitRequestSchema",
  "ElicitRequestFormParamsSchema",
  "ElicitRequestParamsSchema",
  "ElicitRequestURLParamsSchema",
  "ElicitResultSchema",
  "EmbeddedResourceSchema",
  "EmptyResultSchema",
  "EnumSchemaSchema",
  "GetPromptRequestSchema",
  "GetPromptRequestParamsSchema",
  "GetPromptResultSchema",
  "GetTaskPayloadRequestSchema",
  "GetTaskPayloadResultSchema",
  "GetTaskRequestSchema",
  "GetTaskResultSchema",
  "IconSchema",
  "IconsSchema",
  "ImageContentSchema",
  "ImplementationSchema",
  "InitializedNotificationSchema",
  "InitializeRequestSchema",
  "InitializeRequestParamsSchema",
  "InitializeResultSchema",
  "JSONArraySchema",
  "JSONObjectSchema",
  "JSONRPCErrorResponseSchema",
  "JSONRPCMessageSchema",
  "JSONRPCNotificationSchema",
  "JSONRPCRequestSchema",
  "JSONRPCResponseSchema",
  "JSONRPCResultResponseSchema",
  "JSONValueSchema",
  "LegacyTitledEnumSchemaSchema",
  "ListPromptsRequestSchema",
  "ListPromptsResultSchema",
  "ListResourcesRequestSchema",
  "ListResourcesResultSchema",
  "ListResourceTemplatesRequestSchema",
  "ListResourceTemplatesResultSchema",
  "ListRootsRequestSchema",
  "ListRootsResultSchema",
  "ListTasksRequestSchema",
  "ListTasksResultSchema",
  "ListToolsRequestSchema",
  "ListToolsResultSchema",
  "LoggingLevelSchema",
  "LoggingMessageNotificationSchema",
  "LoggingMessageNotificationParamsSchema",
  "ModelHintSchema",
  "ModelPreferencesSchema",
  "MultiSelectEnumSchemaSchema",
  "NotificationSchema",
  "NumberSchemaSchema",
  "PaginatedRequestSchema",
  "PaginatedRequestParamsSchema",
  "PaginatedResultSchema",
  "PingRequestSchema",
  "PrimitiveSchemaDefinitionSchema",
  "ProgressSchema",
  "ProgressNotificationSchema",
  "ProgressNotificationParamsSchema",
  "ProgressTokenSchema",
  "PromptSchema",
  "PromptArgumentSchema",
  "PromptListChangedNotificationSchema",
  "PromptMessageSchema",
  "PromptReferenceSchema",
  "ReadResourceRequestSchema",
  "ReadResourceRequestParamsSchema",
  "ReadResourceResultSchema",
  "RelatedTaskMetadataSchema",
  "RequestSchema",
  "RequestIdSchema",
  "RequestMetaSchema",
  "ResourceSchema",
  "ResourceContentsSchema",
  "ResourceLinkSchema",
  "ResourceListChangedNotificationSchema",
  "ResourceRequestParamsSchema",
  "ResourceTemplateSchema",
  "ResourceTemplateReferenceSchema",
  "ResourceUpdatedNotificationSchema",
  "ResourceUpdatedNotificationParamsSchema",
  "ResultMetaObjectSchema",
  "ResultSchema",
  "RoleSchema",
  "RootSchema",
  "RootsListChangedNotificationSchema",
  "SamplingContentSchema",
  "SamplingMessageSchema",
  "SamplingMessageContentBlockSchema",
  "ServerCapabilitiesSchema",
  "ServerNotificationSchema",
  "ServerRequestSchema",
  "ServerResultSchema",
  "SetLevelRequestSchema",
  "SetLevelRequestParamsSchema",
  "SingleSelectEnumSchemaSchema",
  "StringSchemaSchema",
  "SubscribeRequestSchema",
  "SubscribeRequestParamsSchema",
  "SubscriptionFilterSchema",
  "SubscriptionsAcknowledgedNotificationSchema",
  "SubscriptionsAcknowledgedNotificationParamsSchema",
  "SubscriptionsListenRequestSchema",
  "SubscriptionsListenRequestParamsSchema",
  "SubscriptionsListenResultSchema",
  "SubscriptionsListenResultMetaSchema",
  "TaskAugmentedRequestParamsSchema",
  "TaskCreationParamsSchema",
  "TaskMetadataSchema",
  "TaskSchema",
  "TaskStatusSchema",
  "TaskStatusNotificationSchema",
  "TaskStatusNotificationParamsSchema",
  "TextContentSchema",
  "TextResourceContentsSchema",
  "TitledMultiSelectEnumSchemaSchema",
  "TitledSingleSelectEnumSchemaSchema",
  "ToolSchema",
  "ToolAnnotationsSchema",
  "ToolChoiceSchema",
  "ToolExecutionSchema",
  "ToolListChangedNotificationSchema",
  "ToolResultContentSchema",
  "ToolUseContentSchema",
  "UnsubscribeRequestSchema",
  "UnsubscribeRequestParamsSchema",
  "UntitledMultiSelectEnumSchemaSchema",
  "UntitledSingleSelectEnumSchemaSchema",
];
var authSchemas = {
  IdJagTokenExchangeResponseSchema,
  OAuthClientInformationFullSchema,
  OAuthClientInformationSchema,
  OAuthClientMetadataSchema,
  OAuthClientRegistrationErrorSchema,
  OAuthErrorResponseSchema,
  OAuthMetadataSchema,
  OAuthProtectedResourceMetadataSchema,
  OAuthTokenRevocationRequestSchema,
  OAuthTokensSchema,
  OpenIdProviderDiscoveryMetadataSchema,
  OpenIdProviderMetadataSchema,
};
var _specTypeSchemas = {};
var _isSpecType = {};
//@ chunk-r1g76qsy.js:97520-97599 esm-fingerprint
function register(key, schema) {
  let name = key.slice(0, -6);
  _specTypeSchemas[name] = schema;
  _isSpecType[name] = (v) => schema.safeParse(v).success;
}
//@ chunk-r1g76qsy.js:97599-97627 esm-layout
for (let key of SPEC_SCHEMA_KEYS) register(key, schemas_exports[key]);
//@ chunk-r1g76qsy.js:97627-97669 esm-layout
for (let [key, schema] of Object.entries(authSchemas)) register(key, schema);
//@ chunk-r1g76qsy.js:97669-97715 esm-layout
var specTypeSchemas = Object.freeze(_specTypeSchemas);
var isSpecType = Object.freeze(_isSpecType);
//@ chunk-r1g76qsy.js:97715-97859 esm-fingerprint
function bootstrapOutboundCodec(method) {
  switch (method) {
    case "initialize":
    case "notifications/initialized":
      return codecForVersion(undefined);
    case "server/discover":
      return codecForVersion(MODERN_WIRE_REVISION);
    default:
      return;
  }
}
//@ chunk-r1g76qsy.js:97859-97927 esm-fingerprint
var DEFAULT_REQUEST_TIMEOUT_MSEC = 60000;
var RESERVED_ENVELOPE_META_KEYS = [
  PROTOCOL_VERSION_META_KEY,
  CLIENT_INFO_META_KEY,
  CLIENT_CAPABILITIES_META_KEY,
  LOG_LEVEL_META_KEY,
];
var RETRY_PARAMS_KEYS = ["inputResponses", "requestState"];
//@ chunk-r1g76qsy.js:97927-98471 esm-fingerprint
function liftWireOnlyMaterial(message, kind) {
  let params = message.params;
  if (!isPlainObject$1(params))
    return {
      message,
      lifted: {},
    };
  let meta = params._meta;
  let envelopeKeys = isPlainObject$1(meta) ? RESERVED_ENVELOPE_META_KEYS.filter((key) => key in meta) : [];
  let retryKeys = kind === "request" ? RETRY_PARAMS_KEYS.filter((key) => key in params) : [];
  if (envelopeKeys.length === 0 && retryKeys.length === 0)
    return {
      message,
      lifted: {},
    };
  let lifted = {};
  let nextParams = {
    ...params,
  };
  if (envelopeKeys.length > 0 && isPlainObject$1(meta)) {
    let envelope = {};
    let nextMeta = {
      ...meta,
    };
    for (let key of envelopeKeys) {
      envelope[key] = meta[key];
      delete nextMeta[key];
    }
    lifted.envelope = envelope;
    if (Object.keys(nextMeta).length > 0) nextParams._meta = nextMeta;
    else delete nextParams._meta;
  }
  for (let key of retryKeys) {
    if (key === "inputResponses") lifted.inputResponses = nextParams[key];
    if (key === "requestState") lifted.requestState = nextParams[key];
    delete nextParams[key];
  }
  return {
    message: {
      ...message,
      params: nextParams,
    },
    lifted,
  };
}
//@ chunk-r1g76qsy.js:98471-98766 esm-fingerprint
function codecResultValidator(codec, method) {
  let probe = codec.validateResult(method, undefined);
  if (!probe.ok && probe.reason === "not-in-era") return;
  return {
    "~standard": {
      version: 1,
      vendor: "mcp-wire-codec",
      validate(value) {
        let outcome = codec.validateResult(method, value);
        if (outcome.ok)
          return {
            value: outcome.value,
          };
        return {
          issues: [
            {
              message: outcome.reason === "invalid" ? outcome.message : `not-in-era: ${method}`,
            },
          ],
        };
      },
    },
  };
}
//@ chunk-r1g76qsy.js:98766-98793 esm-layout
function requestStateAccessor(value) {
  return () => value;
}
//@ chunk-r1g76qsy.js:98793-112999 esm-layout
var NO_REQUEST_STATE = requestStateAccessor(undefined);
var writeNegotiatedProtocolVersion;
var Protocol = class {
  _transport;
  _requestMessageId = 0;
  _requestHandlers = new Map();
  _requestHandlerAbortControllers = new Map();
  _notificationHandlers = new Map();
  _responseHandlers = new Map();
  _progressHandlers = new Map();
  _timeoutInfo = new Map();
  _pendingDebouncedNotifications = new Set();
  _negotiatedProtocolVersion;
  static {
    writeNegotiatedProtocolVersion = (instance, version) => {
      instance._negotiatedProtocolVersion = version;
    };
  }
  _supportedProtocolVersions;
  onclose;
  onerror;
  fallbackRequestHandler;
  fallbackNotificationHandler;
  constructor(_options) {
    this._options = _options;
    this._supportedProtocolVersions = _options?.supportedProtocolVersions ?? SUPPORTED_PROTOCOL_VERSIONS;
    this.setNotificationHandler("notifications/cancelled", (notification) => {
      this._oncancel(notification);
    });
    this.setNotificationHandler("notifications/progress", (notification) => {
      this._onprogress(notification);
    });
    this.setRequestHandler("ping", (_request) => ({}));
  }
  _shouldDropInbound(_message) {}
  _outboundMetaEnvelope() {}
  _envelopeOutbound(message) {
    let envelope = this._outboundMetaEnvelope();
    if (envelope === undefined) return message;
    let params = message.params ?? {};
    return {
      ...message,
      params: {
        ...params,
        _meta: {
          ...envelope,
          ...params._meta,
        },
      },
    };
  }
  _resolveNonCompleteResult(decoded, flow) {
    return Promise.reject(
      new SdkError(
        SdkErrorCode.UnsupportedResultType,
        `Unsupported result type '${decoded.kind}' for ${flow.request.method}`,
        {
          resultType: decoded.kind,
          method: flow.request.method,
        },
      ),
    );
  }
  _getRequestHandler(method) {
    return this._requestHandlers.get(method);
  }
  async _oncancel(notification) {
    if (!notification.params.requestId) return;
    this._requestHandlerAbortControllers
      .get(notification.params.requestId)
      ?.abort(notification.params.reason);
  }
  _setupTimeout(messageId, timeout, maxTotalTimeout, onTimeout, resetTimeoutOnProgress = false) {
    this._timeoutInfo.set(messageId, {
      timeoutId: setTimeout(onTimeout, timeout),
      startTime: Date.now(),
      timeout,
      maxTotalTimeout,
      resetTimeoutOnProgress,
      onTimeout,
    });
  }
  _resetTimeout(messageId) {
    let info = this._timeoutInfo.get(messageId);
    if (!info) return false;
    let totalElapsed = Date.now() - info.startTime;
    if (info.maxTotalTimeout && totalElapsed >= info.maxTotalTimeout) {
      this._timeoutInfo.delete(messageId);
      throw new SdkError(SdkErrorCode.RequestTimeout, "Maximum total timeout exceeded", {
        maxTotalTimeout: info.maxTotalTimeout,
        totalElapsed,
      });
    }
    clearTimeout(info.timeoutId);
    info.timeoutId = setTimeout(info.onTimeout, info.timeout);
    return true;
  }
  _cleanupTimeout(messageId) {
    let info = this._timeoutInfo.get(messageId);
    if (info) {
      clearTimeout(info.timeoutId);
      this._timeoutInfo.delete(messageId);
    }
  }
  async connect(transport) {
    this._transport = transport;
    let _onclose = this.transport?.onclose;
    this._transport.onclose = () => {
      try {
        _onclose?.();
      } finally {
        this._onclose();
      }
    };
    let _onerror = this.transport?.onerror;
    this._transport.onerror = (error) => {
      _onerror?.(error);
      this._onerror(error);
    };
    let _onmessage = this._transport?.onmessage;
    this._transport.onmessage = (message, extra) => {
      _onmessage?.(message, extra);
      if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) this._onresponse(message);
      else if (isJSONRPCRequest(message)) this._onrequest(message, extra);
      else if (isJSONRPCNotification(message)) this._onnotification(message, extra);
      else this._onerror(Error(`Unknown message type: ${JSON.stringify(message)}`));
    };
    transport.setSupportedProtocolVersions?.(this._supportedProtocolVersions);
    await this._transport.start();
  }
  _onclose() {
    let responseHandlers = this._responseHandlers;
    this._responseHandlers = new Map();
    this._progressHandlers.clear();
    this._pendingDebouncedNotifications.clear();
    for (let info of this._timeoutInfo.values()) clearTimeout(info.timeoutId);
    this._timeoutInfo.clear();
    let requestHandlerAbortControllers = this._requestHandlerAbortControllers;
    this._requestHandlerAbortControllers = new Map();
    let error = new SdkError(SdkErrorCode.ConnectionClosed, "Connection closed");
    this._transport = undefined;
    try {
      this.onclose?.();
    } finally {
      for (let handler of responseHandlers.values()) handler(error);
      for (let controller of requestHandlerAbortControllers.values()) controller.abort(error);
    }
  }
  _onerror(error) {
    this.onerror?.(error);
  }
  _onnotification(rawNotification, extra) {
    let { message: notification } = liftWireOnlyMaterial(rawNotification, "notification");
    let codec = this._negotiatedWireCodec();
    if (extra?.classification === undefined && this._shouldDropInbound(rawNotification) === "drop") return;
    if (extra?.classification !== undefined) {
      let classified = classifiedWireEra(extra.classification);
      if (classified !== codec.era) {
        this._onerror(
          Error(
            `Era mismatch on inbound notification '${notification.method}': classified as ${classified} but this instance serves ${codec.era}`,
          ),
        );
        return;
      }
    }
    if (isSpecNotificationMethod(notification.method) && !codec.hasNotificationMethod(notification.method))
      return;
    let handler = this._notificationHandlers.get(notification.method);
    let fallback = this.fallbackNotificationHandler;
    if (handler === undefined && fallback === undefined) return;
    Promise.resolve()
      .then(() => (handler === undefined ? fallback(notification) : handler(notification, codec)))
      .catch((error) => this._onerror(Error(`Uncaught error in notification handler: ${error}`)));
  }
  _onrequest(rawRequest, extra) {
    let { message: request, lifted } = liftWireOnlyMaterial(rawRequest, "request");
    let codec = this._negotiatedWireCodec();
    if (extra?.classification === undefined && this._shouldDropInbound(rawRequest) === "drop") {
      this._onerror(
        Error(
          `Dropped inbound request '${rawRequest.method}': not servable on this connection's protocol era`,
        ),
      );
      return;
    }
    let capturedTransport = this._transport;
    let sendErrorResponse = (code, message, data) => {
      let errorResponse = {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code,
          message,
          ...(data !== undefined && {
            data,
          }),
        },
      };
      capturedTransport
        ?.send(errorResponse)
        .catch((error) => this._onerror(Error(`Failed to send an error response: ${error}`)));
    };
    if (extra?.classification !== undefined) {
      let classified = classifiedWireEra(extra.classification);
      if (classified !== codec.era) {
        this._onerror(
          Error(
            `Era mismatch on inbound request '${request.method}': classified as ${classified} but this instance serves ${codec.era}`,
          ),
        );
        let requested = extra.classification.revision ?? classified;
        sendErrorResponse(
          ProtocolErrorCode.UnsupportedProtocolVersion,
          `Unsupported protocol version: ${requested}`,
          {
            supported: this._supportedProtocolVersions,
            requested,
          },
        );
        return;
      }
    }
    if (isSpecRequestMethod(request.method) && !codec.hasRequestMethod(request.method)) {
      sendErrorResponse(ProtocolErrorCode.MethodNotFound, "Method not found");
      return;
    }
    let handler = this._requestHandlers.get(request.method) ?? this.fallbackRequestHandler;
    if (handler === undefined) {
      sendErrorResponse(ProtocolErrorCode.MethodNotFound, "Method not found");
      return;
    }
    let envelopeError = codec.checkInboundEnvelope(lifted);
    if (envelopeError !== undefined) {
      sendErrorResponse(ProtocolErrorCode.InvalidParams, envelopeError);
      return;
    }
    let sendNotification = (notification, options) =>
      this._notificationViaCodec(this._resolveOutboundCodec(notification.method), notification, {
        ...options,
        relatedRequestId: request.id,
      });
    let sendRequest = (r, resultSchema, options) =>
      this._requestWithSchemaViaCodec(this._resolveOutboundCodec(r.method), r, resultSchema, {
        ...options,
        relatedRequestId: request.id,
      });
    let abortController = new AbortController();
    this._requestHandlerAbortControllers.set(request.id, abortController);
    let partitionedInputResponses =
      lifted.inputResponses === undefined ? undefined : partitionInputResponses(lifted.inputResponses);
    let baseCtx = {
      sessionId: capturedTransport?.sessionId,
      mcpReq: {
        id: request.id,
        method: request.method,
        _meta: request.params?._meta,
        ...(lifted.envelope !== undefined && {
          envelope: lifted.envelope,
        }),
        ...(partitionedInputResponses !== undefined && {
          inputResponses: partitionedInputResponses.accepted,
        }),
        ...(partitionedInputResponses !== undefined &&
          partitionedInputResponses.droppedKeys.length > 0 && {
            droppedInputResponseKeys: partitionedInputResponses.droppedKeys,
          }),
        requestState:
          lifted.requestState === undefined ? NO_REQUEST_STATE : requestStateAccessor(lifted.requestState),
        signal: abortController.signal,
        send: (r, schemaOrOptions, maybeOptions) => {
          let sendCodec = this._resolveOutboundCodec(r.method);
          this._assertOutboundRequestInEra(sendCodec, r.method);
          if (isStandardSchema(schemaOrOptions)) return sendRequest(r, schemaOrOptions, maybeOptions);
          let validate = codecResultValidator(sendCodec, r.method);
          if (validate === undefined)
            throw TypeError(
              `'${r.method}' is not a spec method; pass a result schema as the second argument to ctx.mcpReq.send().`,
            );
          return sendRequest(r, validate, schemaOrOptions);
        },
        notify: sendNotification,
      },
      http: extra?.authInfo
        ? {
            authInfo: extra.authInfo,
          }
        : undefined,
    };
    let ctx = this.buildContext(baseCtx, extra);
    Promise.resolve()
      .then(() => handler(request, ctx))
      .then(
        async (result) => {
          if (abortController.signal.aborted) return;
          let encoded;
          try {
            encoded = codec.encodeResult(request.method, result, this._outboundServerInfo());
          } catch (error) {
            this._onerror(Error(`Failed to encode result for ${request.method}: ${error}`));
            sendErrorResponse(ProtocolErrorCode.InternalError, "Internal error");
            return;
          }
          let response = {
            result: encoded,
            jsonrpc: "2.0",
            id: request.id,
          };
          await capturedTransport?.send(response);
        },
        async (error) => {
          if (abortController.signal.aborted) return;
          let thrownCode = Number.isSafeInteger(error.code) ? error.code : ProtocolErrorCode.InternalError;
          let errorResponse = {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: codec.encodeErrorCode(thrownCode),
              message: error.message ?? "Internal error",
              ...(error.data !== undefined && {
                data: error.data,
              }),
            },
          };
          await capturedTransport?.send(errorResponse);
        },
      )
      .catch((error) => this._onerror(Error(`Failed to send response: ${error}`)))
      .finally(() => {
        if (this._requestHandlerAbortControllers.get(request.id) === abortController)
          this._requestHandlerAbortControllers.delete(request.id);
      });
  }
  _onprogress(notification) {
    let { progressToken, ...params } = notification.params;
    let messageId = Number(progressToken);
    let handler = this._progressHandlers.get(messageId);
    if (!handler) {
      this._onerror(
        Error(`Received a progress notification for an unknown token: ${JSON.stringify(notification)}`),
      );
      return;
    }
    let responseHandler = this._responseHandlers.get(messageId);
    let timeoutInfo = this._timeoutInfo.get(messageId);
    if (timeoutInfo && responseHandler && timeoutInfo.resetTimeoutOnProgress)
      try {
        this._resetTimeout(messageId);
      } catch (error) {
        this._responseHandlers.delete(messageId);
        this._progressHandlers.delete(messageId);
        this._cleanupTimeout(messageId);
        responseHandler(error);
        return;
      }
    handler(params);
  }
  _onresponse(response) {
    let messageId = Number(response.id);
    let handler = this._responseHandlers.get(messageId);
    if (handler === undefined) {
      this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify(response)}`));
      return;
    }
    this._responseHandlers.delete(messageId);
    this._cleanupTimeout(messageId);
    this._progressHandlers.delete(messageId);
    if (isJSONRPCResultResponse(response)) handler(response);
    else handler(ProtocolError.fromError(response.error.code, response.error.message, response.error.data));
  }
  get transport() {
    return this._transport;
  }
  async close() {
    await this._transport?.close();
  }
  request(request, schemaOrOptions, maybeOptions) {
    let codec = this._resolveOutboundCodec(request.method);
    this._assertOutboundRequestInEra(codec, request.method);
    if (isStandardSchema(schemaOrOptions))
      return this._requestWithSchemaViaCodec(codec, request, schemaOrOptions, maybeOptions);
    let validate = codecResultValidator(codec, request.method);
    if (validate === undefined)
      throw TypeError(
        `'${request.method}' is not a spec method; pass a result schema as the second argument to request().`,
      );
    return this._requestWithSchemaViaCodec(codec, request, validate, schemaOrOptions);
  }
  _negotiatedWireCodec() {
    return codecForVersion(this._negotiatedProtocolVersion);
  }
  _wireCodec() {
    return this._negotiatedWireCodec();
  }
  _resolveOutboundCodec(method) {
    if (this._negotiatedProtocolVersion === undefined) {
      let pinned = bootstrapOutboundCodec(method);
      if (pinned) return pinned;
    }
    return this._negotiatedWireCodec();
  }
  _assertOutboundRequestInEra(codec, method) {
    if (method.startsWith("tasks/")) return;
    if (isSpecRequestMethod(method) && !codec.hasRequestMethod(method))
      throw new SdkError(
        SdkErrorCode.MethodNotSupportedByProtocolVersion,
        `Method '${method}' is not supported by the negotiated protocol version (wire era ${codec.era})`,
        {
          method,
          era: codec.era,
        },
      );
  }
  _requestWithSchema(request, resultSchema, options) {
    let codec = this._resolveOutboundCodec(request.method);
    this._assertOutboundRequestInEra(codec, request.method);
    return this._requestWithSchemaViaCodec(codec, request, resultSchema, options);
  }
  _requestWithSchemaViaCodec(codec, request, resultSchema, options) {
    let { relatedRequestId, resumptionToken, onresumptiontoken, headers } = options ?? {};
    let flowStartedAt = Date.now();
    let onAbort;
    let cleanupMessageId;
    return new Promise((resolve, reject) => {
      let earlyReject = (error) => {
        reject(error);
      };
      if (!this._transport) {
        earlyReject(Error("Not connected"));
        return;
      }
      if (this._options?.enforceStrictCapabilities === true)
        try {
          this.assertCapabilityForMethod(request.method);
        } catch (error) {
          earlyReject(error);
          return;
        }
      if (options?.signal?.aborted) {
        let reason = options.signal.reason;
        throw reason instanceof SdkError ? reason : new SdkError(SdkErrorCode.RequestTimeout, String(reason));
      }
      let requestAbort =
        codec.era === MODERN_WIRE_REVISION && this._transport.hasPerRequestStream === true
          ? new AbortController()
          : undefined;
      let messageId = this._requestMessageId++;
      cleanupMessageId = messageId;
      let jsonrpcRequest = {
        ...request,
        jsonrpc: "2.0",
        id: messageId,
      };
      if (options?.onprogress) {
        this._progressHandlers.set(messageId, options.onprogress);
        jsonrpcRequest.params = {
          ...request.params,
          _meta: {
            ...request.params?._meta,
            progressToken: messageId,
          },
        };
      }
      let outbound = this._envelopeOutbound(jsonrpcRequest);
      let responseReceived = false;
      let cancel = (reason) => {
        if (responseReceived) return;
        this._progressHandlers.delete(messageId);
        if (requestAbort === undefined)
          this._transport
            ?.send(
              this._envelopeOutbound({
                jsonrpc: "2.0",
                method: "notifications/cancelled",
                params: {
                  requestId: messageId,
                  reason: String(reason),
                },
              }),
              {
                relatedRequestId,
                resumptionToken,
                onresumptiontoken,
              },
            )
            .catch((error) => this._onerror(Error(`Failed to send cancellation: ${error}`)));
        else requestAbort.abort();
        reject(
          reason instanceof SdkError ? reason : new SdkError(SdkErrorCode.RequestTimeout, String(reason)),
        );
      };
      this._responseHandlers.set(messageId, (response) => {
        if (options?.signal?.aborted) return;
        responseReceived = true;
        if (response instanceof Error) return reject(response);
        let g = resultSchema?.["~standard"]?.vendor === "mcp-wire-codec";
        let decoded;
        try {
          decoded = codec.decodeResult(request.method, response.result, g);
        } catch (error) {
          return reject(error instanceof Error ? error : Error(String(error)));
        }
        if (decoded.kind === "invalid") return reject(decoded.error);
        if (decoded.kind === "task") {
          if (
            options?.allowTask === true &&
            this._capabilities?.extensions?.[IO_MODELCONTEXTPROTOCOL_TASKS] !== undefined &&
            vl(decoded.result)
          )
            return resolve(decoded.result);
          return reject(
            new SdkError(
              SdkErrorCode.UnsupportedResultType,
              `Unsupported result type 'task' for ${request.method}`,
              {
                method: request.method,
              },
            ),
          );
        }
        if (decoded.kind === "input_required") {
          if (options?.allowInputRequired === true) return resolve(manualInputRequiredValue(decoded));
          let flow = {
            codec,
            request,
            resultSchema,
            options,
            flowStartedAt,
            retry: (params, legOptions) =>
              this._requestWithSchemaViaCodec(
                codec,
                params === undefined
                  ? {
                      method: request.method,
                    }
                  : {
                      method: request.method,
                      params,
                    },
                resultSchema,
                legOptions,
              ),
          };
          return resolve(this._resolveNonCompleteResult(decoded, flow));
        }
        let result = decoded.result;
        validateStandardSchema(resultSchema, result).then((parseResult) => {
          if (parseResult.success) return resolve(parseResult.data);
          let N;
          try {
            N = g ? codec.decodeResult(request.method, response.result) : undefined;
          } catch (error) {
            return reject(error instanceof Error ? error : Error(String(error)));
          }
          reject(
            N?.kind === "invalid"
              ? N.error
              : new SdkError(
                  SdkErrorCode.InvalidResult,
                  `Invalid result for ${request.method}: ${parseResult.error}`,
                ),
          );
        }, reject);
      });
      onAbort = () => cancel(options?.signal?.reason);
      options?.signal?.addEventListener("abort", onAbort, {
        once: true,
      });
      let timeout = options?.timeout ?? DEFAULT_REQUEST_TIMEOUT_MSEC;
      let timeoutHandler = () =>
        cancel(
          new SdkError(SdkErrorCode.RequestTimeout, "Request timed out", {
            timeout,
          }),
        );
      this._setupTimeout(
        messageId,
        timeout,
        options?.maxTotalTimeout,
        timeoutHandler,
        options?.resetTimeoutOnProgress ?? false,
      );
      this._transport
        .send(outbound, {
          relatedRequestId,
          resumptionToken,
          onresumptiontoken,
          headers,
          requestSignal: requestAbort?.signal,
        })
        .catch((error) => {
          this._progressHandlers.delete(messageId);
          reject(error);
        });
    }).finally(() => {
      if (onAbort) options?.signal?.removeEventListener("abort", onAbort);
      if (cleanupMessageId !== undefined) {
        this._responseHandlers.delete(cleanupMessageId);
        this._cleanupTimeout(cleanupMessageId);
      }
    });
  }
  async notification(notification, options) {
    return this._notificationViaCodec(this._resolveOutboundCodec(notification.method), notification, options);
  }
  async _notificationViaCodec(codec, notification, options) {
    if (!this._transport) throw new SdkError(SdkErrorCode.NotConnected, "Not connected");
    if (isSpecNotificationMethod(notification.method) && !codec.hasNotificationMethod(notification.method))
      throw new SdkError(
        SdkErrorCode.MethodNotSupportedByProtocolVersion,
        `Notification '${notification.method}' is not supported by the negotiated protocol version (wire era ${codec.era})`,
        {
          method: notification.method,
          era: codec.era,
        },
      );
    this.assertNotificationCapability(notification.method);
    let jsonrpcNotification = this._envelopeOutbound({
      jsonrpc: "2.0",
      ...notification,
    });
    if (
      (this._options?.debouncedNotificationMethods ?? []).includes(notification.method) &&
      !notification.params &&
      !options?.relatedRequestId
    ) {
      if (this._pendingDebouncedNotifications.has(notification.method)) return;
      this._pendingDebouncedNotifications.add(notification.method);
      Promise.resolve().then(() => {
        this._pendingDebouncedNotifications.delete(notification.method);
        if (!this._transport) return;
        this._transport?.send(jsonrpcNotification, options).catch((error) => this._onerror(error));
      });
      return;
    }
    await this._transport.send(jsonrpcNotification, options);
  }
  setRequestHandler(method, schemasOrHandler, maybeHandler) {
    this.assertRequestHandlerCapability(method);
    let stored;
    if (typeof schemasOrHandler === "function") {
      if (!isSpecRequestMethod(method))
        throw TypeError(
          `'${method}' is not a spec request method; pass schemas as the second argument to setRequestHandler().`,
        );
      stored = (request, ctx) => {
        let dispatchCodec = this._negotiatedWireCodec();
        let outcome = dispatchCodec.validateRequest(method, request);
        if (!outcome.ok && outcome.reason === "not-in-era")
          outcome = dispatchCodec.validateInputRequest(method, request);
        if (!outcome.ok) {
          if (outcome.reason === "not-in-era")
            throw new ProtocolError(
              ProtocolErrorCode.InternalError,
              `No wire schema for ${method} in the resolved era`,
            );
          throw Error(outcome.message);
        }
        return Promise.resolve(schemasOrHandler(outcome.value, ctx));
      };
    } else if (maybeHandler)
      stored = async (request, ctx) => {
        let parsed = await validateStandardSchema(schemasOrHandler.params, {
          ...request.params,
        });
        if (!parsed.success)
          throw new ProtocolError(
            ProtocolErrorCode.InvalidParams,
            `Invalid params for ${method}: ${parsed.error}`,
          );
        return maybeHandler(parsed.data, ctx);
      };
    else throw TypeError("setRequestHandler: handler is required");
    this._requestHandlers.set(method, this._wrapHandler(method, stored));
  }
  _wrapHandler(_method, handler) {
    return handler;
  }
  _outboundServerInfo() {}
  removeRequestHandler(method) {
    this._requestHandlers.delete(method);
  }
  assertCanSetRequestHandler(method) {
    if (this._requestHandlers.has(method))
      throw Error(`A request handler for ${method} already exists, which would be overridden`);
  }
  setNotificationHandler(method, schemasOrHandler, maybeHandler) {
    if (typeof schemasOrHandler === "function") {
      if (!isSpecNotificationMethod(method))
        throw TypeError(
          `'${method}' is not a spec notification method; pass schemas as the second argument to setNotificationHandler().`,
        );
      this._notificationHandlers.set(method, (notification, codec) => {
        let outcome = codec.validateNotification(method, notification);
        if (!outcome.ok) {
          if (outcome.reason === "not-in-era")
            throw new ProtocolError(
              ProtocolErrorCode.InternalError,
              `No wire schema for ${method} in the resolved era`,
            );
          throw Error(outcome.message);
        }
        return Promise.resolve(schemasOrHandler(outcome.value));
      });
      return;
    }
    if (!maybeHandler) throw TypeError("setNotificationHandler: handler is required");
    this._notificationHandlers.set(method, async (notification) => {
      let parsed = await validateStandardSchema(schemasOrHandler.params, {
        ...notification.params,
      });
      if (!parsed.success)
        throw new ProtocolError(
          ProtocolErrorCode.InvalidParams,
          `Invalid params for notification ${method}: ${parsed.error}`,
        );
      await maybeHandler(parsed.data, notification);
    });
  }
  removeNotificationHandler(method) {
    this._notificationHandlers.delete(method);
  }
};
//@ chunk-r1g76qsy.js:112999-113070 esm-fingerprint
function isPlainObject$1(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
//@ chunk-r1g76qsy.js:113070-113206 esm-layout
function qi(base, additional) {
  let result = {
    ...base,
  };
  for (let key in additional) {
    let k = key;
    let addValue = additional[k];
    if (addValue === undefined) continue;
    let baseValue = result[k];
    result[k] =
      isPlainObject$1(baseValue) && isPlainObject$1(addValue)
        ? {
            ...baseValue,
            ...addValue,
          }
        : addValue;
  }
  return result;
}
//@ chunk-r1g76qsy.js:113206-113277 esm-fingerprint
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-r1g76qsy.js:113277-113481 esm-fingerprint
function partitionInputResponses(inputResponses) {
  let accepted = {};
  let droppedKeys = [];
  if (!isPlainObject(inputResponses))
    return {
      accepted,
      droppedKeys,
    };
  for (let [key, entry] of Object.entries(inputResponses)) {
    if (!isPlainObject(entry) || "method" in entry || "result" in entry) {
      droppedKeys.push(key);
      continue;
    }
    accepted[key] = entry;
  }
  return {
    accepted,
    droppedKeys,
  };
}
//@ chunk-r1g76qsy.js:113481-113668 esm-fingerprint
function relatedMessagingUnavailable(member) {
  throw new SdkError(
    SdkErrorCode.SendFailed,
    `ctx.mcpReq.${member} is not available while fulfilling an embedded input request: the request is fulfilled locally and has no related peer request`,
  );
}
//@ chunk-r1g76qsy.js:113668-113826 esm-fingerprint
function synthesizeInputRequestContext(key, method, params, signal, sessionId) {
  return {
    sessionId,
    mcpReq: {
      id: key,
      method,
      _meta: params?._meta,
      requestState: requestStateAccessor(undefined),
      signal,
      send: () => relatedMessagingUnavailable("send"),
      notify: () => relatedMessagingUnavailable("notify"),
    },
  };
}
//@ chunk-r1g76qsy.js:113826-114738 esm-fingerprint
async function dispatchInputRequest(host, codec, key, entry, signal) {
  if (!isPlainObject(entry) || typeof entry.method !== "string")
    throw new SdkError(
      SdkErrorCode.InvalidResult,
      `Invalid input request '${key}': each inputRequests entry must be an embedded request object with a method`,
      {
        key,
      },
    );
  let method = entry.method;
  if (!codec.hasInputRequestMethod(method))
    throw new SdkError(
      SdkErrorCode.InvalidResult,
      `Invalid input request '${key}': '${method}' is not an embedded request the ${codec.era} revision defines (expected elicitation/create, sampling/createMessage, or roots/list)`,
      {
        key,
        method,
      },
    );
  let handler = host.getRequestHandler(method);
  if (handler === undefined)
    throw new SdkError(
      SdkErrorCode.CapabilityNotSupported,
      `Cannot fulfil input request '${key}': no handler is registered for '${method}' on this client. Declare the corresponding capability and register a handler, or handle input_required results manually.`,
      {
        key,
        method,
      },
    );
  let params = isPlainObject(entry.params) ? entry.params : undefined;
  return await handler(
    {
      jsonrpc: "2.0",
      id: key,
      method,
      ...(params !== undefined && {
        params,
      }),
    },
    host.buildContext(synthesizeInputRequestContext(key, method, params, signal, host.sessionId)),
  );
}
//@ chunk-r1g76qsy.js:114738-115159 esm-fingerprint
function buildRetryLegRequestOptions(options, legOptions) {
  return {
    ...(options?.signal !== undefined && {
      signal: options.signal,
    }),
    ...(options?.onprogress !== undefined && {
      onprogress: options.onprogress,
    }),
    ...(options?.resetTimeoutOnProgress !== undefined && {
      resetTimeoutOnProgress: options.resetTimeoutOnProgress,
    }),
    ...(options?.headers !== undefined && {
      headers: options.headers,
    }),
    ...(legOptions.timeout !== undefined && {
      timeout: legOptions.timeout,
    }),
    ...(legOptions.maxTotalTimeout !== undefined && {
      maxTotalTimeout: legOptions.maxTotalTimeout,
    }),
    ...(options?.allowTask === true && {
      allowTask: true,
    }),
    allowInputRequired: true,
  };
}
//@ chunk-r1g76qsy.js:115159-115703 esm-fingerprint
function runInputRequiredFlow(host, config, decoded, flow) {
  let { codec, request, options, flowStartedAt } = flow;
  let firstPayload = {
    inputRequests: decoded.inputRequests,
    ...(decoded.requestState !== undefined && {
      requestState: decoded.requestState,
    }),
  };
  let hooks = {
    dispatchInputRequest: (key, entry, signal) => dispatchInputRequest(host, codec, key, entry, signal),
    retry: (params, legOptions) => flow.retry(params, buildRetryLegRequestOptions(options, legOptions)),
  };
  return runInputRequiredDriver({
    config,
    method: request.method,
    originalParams: request.params,
    firstPayload,
    flowStartedAt,
    signal: options?.signal,
    requestOptions: {
      ...(options?.timeout !== undefined && {
        timeout: options.timeout,
      }),
      ...(options?.maxTotalTimeout !== undefined && {
        maxTotalTimeout: options.maxTotalTimeout,
      }),
      ...(options?.onprogress !== undefined && {
        onprogress: options.onprogress,
      }),
    },
    hooks,
  });
}
//@ chunk-r1g76qsy.js:115703-115842 esm-fingerprint
function manualInputRequiredValue(decoded) {
  return {
    resultType: "input_required",
    inputRequests: decoded.inputRequests,
    ...(decoded.requestState !== undefined && {
      requestState: decoded.requestState,
    }),
  };
}
//@ chunk-r1g76qsy.js:117199-117372 esm-fingerprint
function Oi(contentType) {
  if (!contentType) return;
  try {
    return import_content_type.parse(contentType).type;
  } catch {
    let essence = (contentType.split(";", 1)[0] ?? "").trim().toLowerCase();
    if (essence === "" || contentType.slice(essence.length).includes(",")) return;
    return essence;
  }
}
//@ chunk-r1g76qsy.js:117372-117999 esm-layout
var STDIO_DEFAULT_MAX_BUFFER_SIZE = 10485760;
var ReadBuffer = class {
  _buffer;
  _maxBufferSize;
  constructor(options) {
    this._maxBufferSize = options?.maxBufferSize ?? STDIO_DEFAULT_MAX_BUFFER_SIZE;
  }
  append(chunk) {
    if ((this._buffer?.length ?? 0) + chunk.length > this._maxBufferSize) {
      this.clear();
      throw Error(`ReadBuffer exceeded maximum size of ${this._maxBufferSize} bytes`);
    }
    this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
  }
  readMessage() {
    while (this._buffer) {
      let index = this._buffer.indexOf(`
`);
      if (index === -1) return null;
      let line = this._buffer.toString("utf8", 0, index).replace(/\r$/, "");
      this._buffer = this._buffer.subarray(index + 1);
      try {
        return deserializeMessage(line);
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
    return null;
  }
  clear() {
    this._buffer = undefined;
  }
};
//@ chunk-r1g76qsy.js:117999-118040 esm-layout
function deserializeMessage(line) {
  return Rt(JSON.parse(line));
}
//@ chunk-r1g76qsy.js:118040-118085 esm-layout
function serializeMessage(message) {
  return (
    JSON.stringify(message) +
    `
`
  );
}
//@ chunk-r1g76qsy.js:118085-118240 esm-fingerprint
function normalizeHeaders(headers) {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return {
    ...headers,
  };
}
//@ chunk-r1g76qsy.js:118240-118380 esm-layout
function createFetchWithInit(baseFetch = fetch, baseInit) {
  if (!baseInit) return baseFetch;
  return async (url, init) =>
    baseFetch(url, {
      ...baseInit,
      ...init,
      headers: init?.headers
        ? {
            ...normalizeHeaders(baseInit.headers),
            ...normalizeHeaders(init.headers),
          }
        : baseInit.headers,
    });
}
export {
  SdkHttpError,
  SdkErrorCode,
  ProtocolError,
  SdkError,
  ProtocolErrorCode,
  isJSONRPCRequest,
  isJSONRPCErrorResponse,
  lYn,
  qNr,
  createFetchWithInit,
  isJSONRPCResultResponse,
  OAuthError,
  brandedHasInstance,
  stampErrorBrands,
  OAuthErrorCode,
  resourceUrlFromServerUrl,
  checkResourceAllowed,
  codecForVersion,
  MODERN_WIRE_REVISION,
  UnsupportedProtocolVersionError,
  modernProtocolVersions,
  isModernProtocolVersion,
  cn,
  legacyProtocolVersions,
  isSpecType,
  Protocol,
  resolveInputRequiredDriverConfig,
  runInputRequiredFlow,
  qi,
  DEFAULT_REQUEST_TIMEOUT_MSEC,
  scanXMcpHeaderDeclarations,
  buildMcpParamHeaders,
  HEADER_MISMATCH_ERROR_CODE,
  parseSchema,
  normalizeHeaders,
  Rt,
  encodeMcpParamValue,
  Oi,
  ReadBuffer,
  serializeMessage,
  deserializeMessage,
  isJSONRPCNotification,
};
