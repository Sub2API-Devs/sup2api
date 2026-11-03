/**
 * @modelcontextprotocol/sdk/dist/esm/server/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-exz1ts42.js (1)
 * attribution: esm-fingerprint 1
 */
import { Protocol } from "../shared/protocol.js";
import {
  LoggingLevelSchema,
  InitializeRequestSchema,
  InitializedNotificationSchema,
  SetLevelRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
  CreateTaskResultSchema,
  CallToolResultSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
  LATEST_PROTOCOL_VERSION,
  EmptyResultSchema,
  CreateMessageResultWithToolsSchema,
  CreateMessageResultSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
} from "../types.js";
import { Gsn, vGn } from "../../cjs/validation/ajv-provider.js";
import { ExperimentalServerTasks } from "../experimental/tasks/server.js";
import { J$t, isZ4Schema, objectFromShape } from "./zod-compat.js";
import {
  assertClientRequestTaskCapability,
  assertToolsCallTaskCapability,
} from "../experimental/tasks/helpers.js";

//@ chunk-exz1ts42.js:2221-10329 esm-fingerprint
class Server extends Protocol {
  constructor(_serverInfo, options) {
    super(options);
    this._serverInfo = _serverInfo;
    this._loggingLevels = new Map();
    this.LOG_LEVEL_SEVERITY = new Map(LoggingLevelSchema.options.map((level, index) => [level, index]));
    this.isMessageIgnored = (level, sessionId) => {
      let currentLevel = this._loggingLevels.get(sessionId);
      return currentLevel
        ? this.LOG_LEVEL_SEVERITY.get(level) < this.LOG_LEVEL_SEVERITY.get(currentLevel)
        : false;
    };
    this._capabilities = options?.capabilities ?? {};
    this._instructions = options?.instructions;
    this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new Gsn();
    this.setRequestHandler(InitializeRequestSchema, (request) => this._oninitialize(request));
    this.setNotificationHandler(InitializedNotificationSchema, () => this.oninitialized?.());
    if (this._capabilities.logging)
      this.setRequestHandler(SetLevelRequestSchema, async (request, extra) => {
        let transportSessionId = extra.sessionId || extra.requestInfo?.headers["mcp-session-id"] || undefined;
        let { level } = request.params;
        let parseResult = LoggingLevelSchema.safeParse(level);
        if (parseResult.success) this._loggingLevels.set(transportSessionId, parseResult.data);
        return {};
      });
  }
  get experimental() {
    if (!this._experimental)
      this._experimental = {
        tasks: new ExperimentalServerTasks(this),
      };
    return this._experimental;
  }
  registerCapabilities(capabilities) {
    if (this.transport) throw Error("Cannot register capabilities after connecting to transport");
    this._capabilities = vGn(this._capabilities, capabilities);
  }
  setRequestHandler(requestSchema, handler) {
    let methodSchema = J$t(requestSchema)?.method;
    if (!methodSchema) throw Error("Schema is missing a method literal");
    let o;
    if (isZ4Schema(methodSchema)) {
      let v4Schema = methodSchema;
      o = v4Schema._zod?.def?.value ?? v4Schema.value;
    } else {
      let v3Schema = methodSchema;
      o = v3Schema._def?.value ?? v3Schema.value;
    }
    if (typeof o !== "string") throw Error("Schema method literal must be a string");
    if (o === "tools/call") {
      let wrappedHandler = async (request, extra) => {
        let validatedRequest = objectFromShape(CallToolRequestSchema, request);
        if (!validatedRequest.success) {
          let errorMessage =
            validatedRequest.error instanceof Error
              ? validatedRequest.error.message
              : String(validatedRequest.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call request: ${errorMessage}`);
        }
        let { params } = validatedRequest.data;
        let result = await Promise.resolve(handler(request, extra));
        if (params.task) {
          let taskValidationResult = objectFromShape(CreateTaskResultSchema, result);
          if (!taskValidationResult.success) {
            let errorMessage =
              taskValidationResult.error instanceof Error
                ? taskValidationResult.error.message
                : String(taskValidationResult.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${errorMessage}`);
          }
          return taskValidationResult.data;
        }
        let validationResult = objectFromShape(CallToolResultSchema, result);
        if (!validationResult.success) {
          let errorMessage =
            validationResult.error instanceof Error
              ? validationResult.error.message
              : String(validationResult.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call result: ${errorMessage}`);
        }
        return validationResult.data;
      };
      return super.setRequestHandler(requestSchema, wrappedHandler);
    }
    return super.setRequestHandler(requestSchema, handler);
  }
  assertCapabilityForMethod(method) {
    switch (method) {
      case "sampling/createMessage":
        if (!this._clientCapabilities?.sampling)
          throw Error(`Client does not support sampling (required for ${method})`);
        break;
      case "elicitation/create":
        if (!this._clientCapabilities?.elicitation)
          throw Error(`Client does not support elicitation (required for ${method})`);
        break;
      case "roots/list":
        if (!this._clientCapabilities?.roots)
          throw Error(`Client does not support listing roots (required for ${method})`);
        break;
      case "ping":
        break;
    }
  }
  assertNotificationCapability(method) {
    switch (method) {
      case "notifications/message":
        if (!this._capabilities.logging)
          throw Error(`Server does not support logging (required for ${method})`);
        break;
      case "notifications/resources/updated":
      case "notifications/resources/list_changed":
        if (!this._capabilities.resources)
          throw Error(`Server does not support notifying about resources (required for ${method})`);
        break;
      case "notifications/tools/list_changed":
        if (!this._capabilities.tools)
          throw Error(`Server does not support notifying of tool list changes (required for ${method})`);
        break;
      case "notifications/prompts/list_changed":
        if (!this._capabilities.prompts)
          throw Error(`Server does not support notifying of prompt list changes (required for ${method})`);
        break;
      case "notifications/elicitation/complete":
        if (!this._clientCapabilities?.elicitation?.url)
          throw Error(`Client does not support URL elicitation (required for ${method})`);
        break;
      case "notifications/cancelled":
        break;
      case "notifications/progress":
        break;
    }
  }
  assertRequestHandlerCapability(method) {
    if (!this._capabilities) return;
    switch (method) {
      case "completion/complete":
        if (!this._capabilities.completions)
          throw Error(`Server does not support completions (required for ${method})`);
        break;
      case "logging/setLevel":
        if (!this._capabilities.logging)
          throw Error(`Server does not support logging (required for ${method})`);
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._capabilities.prompts)
          throw Error(`Server does not support prompts (required for ${method})`);
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
        if (!this._capabilities.resources)
          throw Error(`Server does not support resources (required for ${method})`);
        break;
      case "tools/call":
      case "tools/list":
        if (!this._capabilities.tools) throw Error(`Server does not support tools (required for ${method})`);
        break;
      case "tasks/get":
      case "tasks/list":
      case "tasks/result":
      case "tasks/cancel":
        if (!this._capabilities.tasks)
          throw Error(`Server does not support tasks capability (required for ${method})`);
        break;
      case "ping":
      case "initialize":
        break;
    }
  }
  assertTaskCapability(method) {
    assertClientRequestTaskCapability(this._clientCapabilities?.tasks?.requests, method, "Client");
  }
  assertTaskHandlerCapability(method) {
    if (!this._capabilities) return;
    assertToolsCallTaskCapability(this._capabilities.tasks?.requests, method, "Server");
  }
  async _oninitialize(request) {
    let requestedVersion = request.params.protocolVersion;
    this._clientCapabilities = request.params.capabilities;
    this._clientVersion = request.params.clientInfo;
    return {
      protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
        ? requestedVersion
        : LATEST_PROTOCOL_VERSION,
      capabilities: this.getCapabilities(),
      serverInfo: this._serverInfo,
      ...(this._instructions && {
        instructions: this._instructions,
      }),
    };
  }
  getClientCapabilities() {
    return this._clientCapabilities;
  }
  getClientVersion() {
    return this._clientVersion;
  }
  getCapabilities() {
    return this._capabilities;
  }
  async ping() {
    return this.request(
      {
        method: "ping",
      },
      EmptyResultSchema,
    );
  }
  async createMessage(params, options) {
    if (params.tools || params.toolChoice) {
      if (!this._clientCapabilities?.sampling?.tools)
        throw Error("Client does not support sampling tools capability.");
    }
    if (params.messages.length > 0) {
      let lastMessage = params.messages[params.messages.length - 1];
      let lastContent = Array.isArray(lastMessage.content) ? lastMessage.content : [lastMessage.content];
      let hasToolResults = lastContent.some((c) => c.type === "tool_result");
      let previousMessage =
        params.messages.length > 1 ? params.messages[params.messages.length - 2] : undefined;
      let previousContent = previousMessage
        ? Array.isArray(previousMessage.content)
          ? previousMessage.content
          : [previousMessage.content]
        : [];
      let hasPreviousToolUse = previousContent.some((c) => c.type === "tool_use");
      if (hasToolResults) {
        if (lastContent.some((c) => c.type !== "tool_result"))
          throw Error("The last message must contain only tool_result content if any is present");
        if (!hasPreviousToolUse)
          throw Error("tool_result blocks are not matching any tool_use from the previous message");
      }
      if (hasPreviousToolUse) {
        let toolUseIds = new Set(previousContent.filter((c) => c.type === "tool_use").map((c) => c.id));
        let toolResultIds = new Set(
          lastContent.filter((c) => c.type === "tool_result").map((c) => c.toolUseId),
        );
        if (toolUseIds.size !== toolResultIds.size || ![...toolUseIds].every((id) => toolResultIds.has(id)))
          throw Error("ids of tool_result blocks and tool_use blocks from previous message do not match");
      }
    }
    if (params.tools)
      return this.request(
        {
          method: "sampling/createMessage",
          params,
        },
        CreateMessageResultWithToolsSchema,
        options,
      );
    return this.request(
      {
        method: "sampling/createMessage",
        params,
      },
      CreateMessageResultSchema,
      options,
    );
  }
  async elicitInput(params, options) {
    switch (params.mode ?? "form") {
      case "url": {
        if (!this._clientCapabilities?.elicitation?.url)
          throw Error("Client does not support url elicitation.");
        let urlParams = params;
        return this.request(
          {
            method: "elicitation/create",
            params: urlParams,
          },
          ElicitResultSchema,
          options,
        );
      }
      case "form": {
        if (!this._clientCapabilities?.elicitation?.form)
          throw Error("Client does not support form elicitation.");
        let formParams =
          params.mode === "form"
            ? params
            : {
                ...params,
                mode: "form",
              };
        let result = await this.request(
          {
            method: "elicitation/create",
            params: formParams,
          },
          ElicitResultSchema,
          options,
        );
        if (result.action === "accept" && result.content && formParams.requestedSchema)
          try {
            let validationResult = this._jsonSchemaValidator.getValidator(formParams.requestedSchema)(
              result.content,
            );
            if (!validationResult.valid)
              throw new McpError(
                ErrorCode.InvalidParams,
                `Elicitation response content does not match requested schema: ${validationResult.errorMessage}`,
              );
          } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InternalError,
              `Error validating elicitation response: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        return result;
      }
    }
  }
  createElicitationCompletionNotifier(elicitationId, options) {
    if (!this._clientCapabilities?.elicitation?.url)
      throw Error(
        "Client does not support URL elicitation (required for notifications/elicitation/complete)",
      );
    return () =>
      this.notification(
        {
          method: "notifications/elicitation/complete",
          params: {
            elicitationId,
          },
        },
        options,
      );
  }
  async listRoots(params, options) {
    return this.request(
      {
        method: "roots/list",
        params,
      },
      ListRootsResultSchema,
      options,
    );
  }
  async sendLoggingMessage(params, sessionId) {
    if (this._capabilities.logging) {
      if (!this.isMessageIgnored(params.level, sessionId))
        return this.notification({
          method: "notifications/message",
          params,
        });
    }
  }
  async sendResourceUpdated(params) {
    return this.notification({
      method: "notifications/resources/updated",
      params,
    });
  }
  async sendResourceListChanged() {
    return this.notification({
      method: "notifications/resources/list_changed",
    });
  }
  async sendToolListChanged() {
    return this.notification({
      method: "notifications/tools/list_changed",
    });
  }
  async sendPromptListChanged() {
    return this.notification({
      method: "notifications/prompts/list_changed",
    });
  }
}
export { Server };
