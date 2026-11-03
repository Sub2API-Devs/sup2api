/**
 * @modelcontextprotocol/sdk/dist/esm/client/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-z1n5m6nf.js (3)
 * attribution: esm-fingerprint 3
 */
import { Protocol } from "../shared/protocol.js";
import { Gsn, vGn } from "../../cjs/validation/ajv-provider.js";
import {
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ElicitRequestSchema,
  McpError,
  ErrorCode,
  CreateTaskResultSchema,
  ElicitResultSchema,
  CreateMessageRequestSchema,
  CreateMessageResultWithToolsSchema,
  CreateMessageResultSchema,
  LATEST_PROTOCOL_VERSION,
  InitializeResultSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
  EmptyResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema,
  ListChangedOptionsBaseSchema,
} from "../types.js";
import { ExperimentalClientTasks } from "../experimental/tasks/client.js";
import { J$t, isZ4Schema, objectFromShape } from "../server/zod-compat.js";
import {
  assertToolsCallTaskCapability,
  assertClientRequestTaskCapability,
} from "../experimental/tasks/helpers.js";

//@ chunk-z1n5m6nf.js:17770-18235 esm-fingerprint
function applyElicitationDefaults(schema, data) {
  if (!schema || data === null || typeof data !== "object") return;
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    let obj = data;
    let props = schema.properties;
    for (let key of Object.keys(props)) {
      let propSchema = props[key];
      if (obj[key] === undefined && Object.prototype.hasOwnProperty.call(propSchema, "default"))
        obj[key] = propSchema.default;
      if (obj[key] !== undefined) applyElicitationDefaults(propSchema, obj[key]);
    }
  }
  if (Array.isArray(schema.anyOf)) {
    for (let sub of schema.anyOf) if (typeof sub !== "boolean") applyElicitationDefaults(sub, data);
  }
  if (Array.isArray(schema.oneOf)) {
    for (let sub of schema.oneOf) if (typeof sub !== "boolean") applyElicitationDefaults(sub, data);
  }
}
//@ chunk-z1n5m6nf.js:18235-18395 esm-fingerprint
function getSupportedElicitationModes(capabilities) {
  if (!capabilities)
    return {
      supportsFormMode: false,
      supportsUrlMode: false,
    };
  let hasFormCapability = capabilities.form !== undefined;
  let n = capabilities.url !== undefined;
  return {
    supportsFormMode: hasFormCapability || (!hasFormCapability && !n),
    supportsUrlMode: n,
  };
}
//@ chunk-z1n5m6nf.js:18395-28313 esm-fingerprint
class Client extends Protocol {
  constructor(_clientInfo, options) {
    super(options);
    this._clientInfo = _clientInfo;
    this._cachedToolOutputValidators = new Map();
    this._cachedKnownTaskTools = new Set();
    this._cachedRequiredTaskTools = new Set();
    this._listChangedDebounceTimers = new Map();
    this._capabilities = options?.capabilities ?? {};
    this._jsonSchemaValidator = options?.jsonSchemaValidator ?? new Gsn();
    if (options?.listChanged) this._pendingListChangedConfig = options.listChanged;
  }
  _setupListChangedHandlers(config) {
    if (config.tools && this._serverCapabilities?.tools?.listChanged)
      this._setupListChangedHandler(
        "tools",
        ToolListChangedNotificationSchema,
        config.tools,
        async () => (await this.listTools()).tools,
      );
    if (config.prompts && this._serverCapabilities?.prompts?.listChanged)
      this._setupListChangedHandler(
        "prompts",
        PromptListChangedNotificationSchema,
        config.prompts,
        async () => (await this.listPrompts()).prompts,
      );
    if (config.resources && this._serverCapabilities?.resources?.listChanged)
      this._setupListChangedHandler(
        "resources",
        ResourceListChangedNotificationSchema,
        config.resources,
        async () => (await this.listResources()).resources,
      );
  }
  get experimental() {
    if (!this._experimental)
      this._experimental = {
        tasks: new ExperimentalClientTasks(this),
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
    let methodValue;
    if (isZ4Schema(methodSchema)) {
      let v4Schema = methodSchema;
      methodValue = v4Schema._zod?.def?.value ?? v4Schema.value;
    } else {
      let v3Schema = methodSchema;
      methodValue = v3Schema._def?.value ?? v3Schema.value;
    }
    if (typeof methodValue !== "string") throw Error("Schema method literal must be a string");
    let method = methodValue;
    if (method === "elicitation/create") {
      let wrappedHandler = async (request, extra) => {
        let validatedRequest = objectFromShape(ElicitRequestSchema, request);
        if (!validatedRequest.success) {
          let errorMessage =
            validatedRequest.error instanceof Error
              ? validatedRequest.error.message
              : String(validatedRequest.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid elicitation request: ${errorMessage}`);
        }
        let { params } = validatedRequest.data;
        params.mode = params.mode ?? "form";
        let { supportsFormMode, supportsUrlMode } = getSupportedElicitationModes(
          this._capabilities.elicitation,
        );
        if (params.mode === "form" && !supportsFormMode)
          throw new McpError(
            ErrorCode.InvalidParams,
            "Client does not support form-mode elicitation requests",
          );
        if (params.mode === "url" && !supportsUrlMode)
          throw new McpError(
            ErrorCode.InvalidParams,
            "Client does not support URL-mode elicitation requests",
          );
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
        let validationResult = objectFromShape(ElicitResultSchema, result);
        if (!validationResult.success) {
          let errorMessage =
            validationResult.error instanceof Error
              ? validationResult.error.message
              : String(validationResult.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid elicitation result: ${errorMessage}`);
        }
        let validatedResult = validationResult.data;
        let requestedSchema = params.mode === "form" ? params.requestedSchema : undefined;
        if (
          params.mode === "form" &&
          validatedResult.action === "accept" &&
          validatedResult.content &&
          requestedSchema
        ) {
          if (this._capabilities.elicitation?.form?.applyDefaults)
            try {
              applyElicitationDefaults(requestedSchema, validatedResult.content);
            } catch {}
        }
        return validatedResult;
      };
      return super.setRequestHandler(requestSchema, wrappedHandler);
    }
    if (method === "sampling/createMessage") {
      let wrappedHandler = async (request, extra) => {
        let validatedRequest = objectFromShape(CreateMessageRequestSchema, request);
        if (!validatedRequest.success) {
          let errorMessage =
            validatedRequest.error instanceof Error
              ? validatedRequest.error.message
              : String(validatedRequest.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid sampling request: ${errorMessage}`);
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
        let H =
          params.tools || params.toolChoice ? CreateMessageResultWithToolsSchema : CreateMessageResultSchema;
        let validationResult = objectFromShape(H, result);
        if (!validationResult.success) {
          let errorMessage =
            validationResult.error instanceof Error
              ? validationResult.error.message
              : String(validationResult.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid sampling result: ${errorMessage}`);
        }
        return validationResult.data;
      };
      return super.setRequestHandler(requestSchema, wrappedHandler);
    }
    return super.setRequestHandler(requestSchema, handler);
  }
  assertCapability(capability, method) {
    if (!this._serverCapabilities?.[capability])
      throw Error(`Server does not support ${capability} (required for ${method})`);
  }
  async connect(transport, options) {
    await super.connect(transport);
    if (transport.sessionId !== undefined) return;
    try {
      let result = await this.request(
        {
          method: "initialize",
          params: {
            protocolVersion: LATEST_PROTOCOL_VERSION,
            capabilities: this._capabilities,
            clientInfo: this._clientInfo,
          },
        },
        InitializeResultSchema,
        options,
      );
      if (result === undefined) throw Error(`Server sent invalid initialize result: ${result}`);
      if (!SUPPORTED_PROTOCOL_VERSIONS.includes(result.protocolVersion))
        throw Error(`Server's protocol version is not supported: ${result.protocolVersion}`);
      this._serverCapabilities = result.capabilities;
      this._serverVersion = result.serverInfo;
      if (transport.setProtocolVersion) transport.setProtocolVersion(result.protocolVersion);
      this._instructions = result.instructions;
      await this.notification({
        method: "notifications/initialized",
      });
      if (this._pendingListChangedConfig) {
        this._setupListChangedHandlers(this._pendingListChangedConfig);
        this._pendingListChangedConfig = undefined;
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }
  getServerCapabilities() {
    return this._serverCapabilities;
  }
  getServerVersion() {
    return this._serverVersion;
  }
  getInstructions() {
    return this._instructions;
  }
  assertCapabilityForMethod(method) {
    switch (method) {
      case "logging/setLevel":
        if (!this._serverCapabilities?.logging)
          throw Error(`Server does not support logging (required for ${method})`);
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._serverCapabilities?.prompts)
          throw Error(`Server does not support prompts (required for ${method})`);
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
      case "resources/subscribe":
      case "resources/unsubscribe":
        if (!this._serverCapabilities?.resources)
          throw Error(`Server does not support resources (required for ${method})`);
        if (method === "resources/subscribe" && !this._serverCapabilities.resources.subscribe)
          throw Error(`Server does not support resource subscriptions (required for ${method})`);
        break;
      case "tools/call":
      case "tools/list":
        if (!this._serverCapabilities?.tools)
          throw Error(`Server does not support tools (required for ${method})`);
        break;
      case "completion/complete":
        if (!this._serverCapabilities?.completions)
          throw Error(`Server does not support completions (required for ${method})`);
        break;
      case "initialize":
        break;
      case "ping":
        break;
    }
  }
  assertNotificationCapability(method) {
    switch (method) {
      case "notifications/roots/list_changed":
        if (!this._capabilities.roots?.listChanged)
          throw Error(`Client does not support roots list changed notifications (required for ${method})`);
        break;
      case "notifications/initialized":
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
      case "sampling/createMessage":
        if (!this._capabilities.sampling)
          throw Error(`Client does not support sampling capability (required for ${method})`);
        break;
      case "elicitation/create":
        if (!this._capabilities.elicitation)
          throw Error(`Client does not support elicitation capability (required for ${method})`);
        break;
      case "roots/list":
        if (!this._capabilities.roots)
          throw Error(`Client does not support roots capability (required for ${method})`);
        break;
      case "tasks/get":
      case "tasks/list":
      case "tasks/result":
      case "tasks/cancel":
        if (!this._capabilities.tasks)
          throw Error(`Client does not support tasks capability (required for ${method})`);
        break;
      case "ping":
        break;
    }
  }
  assertTaskCapability(method) {
    assertToolsCallTaskCapability(this._serverCapabilities?.tasks?.requests, method, "Server");
  }
  assertTaskHandlerCapability(method) {
    if (!this._capabilities) return;
    assertClientRequestTaskCapability(this._capabilities.tasks?.requests, method, "Client");
  }
  async ping(options) {
    return this.request(
      {
        method: "ping",
      },
      EmptyResultSchema,
      options,
    );
  }
  async complete(params, options) {
    return this.request(
      {
        method: "completion/complete",
        params,
      },
      CompleteResultSchema,
      options,
    );
  }
  async setLoggingLevel(level, options) {
    return this.request(
      {
        method: "logging/setLevel",
        params: {
          level,
        },
      },
      EmptyResultSchema,
      options,
    );
  }
  async getPrompt(params, options) {
    return this.request(
      {
        method: "prompts/get",
        params,
      },
      GetPromptResultSchema,
      options,
    );
  }
  async listPrompts(params, options) {
    return this.request(
      {
        method: "prompts/list",
        params,
      },
      ListPromptsResultSchema,
      options,
    );
  }
  async listResources(params, options) {
    return this.request(
      {
        method: "resources/list",
        params,
      },
      ListResourcesResultSchema,
      options,
    );
  }
  async listResourceTemplates(params, options) {
    return this.request(
      {
        method: "resources/templates/list",
        params,
      },
      ListResourceTemplatesResultSchema,
      options,
    );
  }
  async readResource(params, options) {
    return this.request(
      {
        method: "resources/read",
        params,
      },
      ReadResourceResultSchema,
      options,
    );
  }
  async subscribeResource(params, options) {
    return this.request(
      {
        method: "resources/subscribe",
        params,
      },
      EmptyResultSchema,
      options,
    );
  }
  async unsubscribeResource(params, options) {
    return this.request(
      {
        method: "resources/unsubscribe",
        params,
      },
      EmptyResultSchema,
      options,
    );
  }
  async callTool(params, resultSchema = CallToolResultSchema, options) {
    if (this.isToolTaskRequired(params.name))
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Tool "${params.name}" requires task-based execution. Use client.experimental.tasks.callToolStream() instead.`,
      );
    let result = await this.request(
      {
        method: "tools/call",
        params,
      },
      resultSchema,
      options,
    );
    let validator = this.getToolOutputValidator(params.name);
    if (validator) {
      if (!result.structuredContent && !result.isError)
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Tool ${params.name} has an output schema but did not return structured content`,
        );
      if (result.structuredContent)
        try {
          let validationResult = validator(result.structuredContent);
          if (!validationResult.valid)
            throw new McpError(
              ErrorCode.InvalidParams,
              `Structured content does not match the tool's output schema: ${validationResult.errorMessage}`,
            );
        } catch (error) {
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InvalidParams,
            `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
    }
    return result;
  }
  isToolTask(toolName) {
    if (!this._serverCapabilities?.tasks?.requests?.tools?.call) return false;
    return this._cachedKnownTaskTools.has(toolName);
  }
  isToolTaskRequired(toolName) {
    return this._cachedRequiredTaskTools.has(toolName);
  }
  cacheToolMetadata(tools) {
    this._cachedToolOutputValidators.clear();
    this._cachedKnownTaskTools.clear();
    this._cachedRequiredTaskTools.clear();
    for (let tool of tools) {
      if (tool.outputSchema) {
        let toolValidator = this._jsonSchemaValidator.getValidator(tool.outputSchema);
        this._cachedToolOutputValidators.set(tool.name, toolValidator);
      }
      let taskSupport = tool.execution?.taskSupport;
      if (taskSupport === "required" || taskSupport === "optional") this._cachedKnownTaskTools.add(tool.name);
      if (taskSupport === "required") this._cachedRequiredTaskTools.add(tool.name);
    }
  }
  getToolOutputValidator(toolName) {
    return this._cachedToolOutputValidators.get(toolName);
  }
  async listTools(params, options) {
    let result = await this.request(
      {
        method: "tools/list",
        params,
      },
      ListToolsResultSchema,
      options,
    );
    this.cacheToolMetadata(result.tools);
    return result;
  }
  _setupListChangedHandler(listType, notificationSchema, options, fetcher) {
    let parseResult = ListChangedOptionsBaseSchema.safeParse(options);
    if (!parseResult.success)
      throw Error(`Invalid ${listType} listChanged options: ${parseResult.error.message}`);
    if (typeof options.onChanged !== "function")
      throw Error(`Invalid ${listType} listChanged options: onChanged must be a function`);
    let { autoRefresh, debounceMs } = parseResult.data;
    let { onChanged } = options;
    let refresh = async () => {
      if (!autoRefresh) {
        onChanged(null, null);
        return;
      }
      try {
        let items = await fetcher();
        onChanged(null, items);
      } catch (e) {
        let error = e instanceof Error ? e : Error(String(e));
        onChanged(error, null);
      }
    };
    let handler = () => {
      if (debounceMs) {
        let existingTimer = this._listChangedDebounceTimers.get(listType);
        if (existingTimer) clearTimeout(existingTimer);
        let timer = setTimeout(refresh, debounceMs);
        this._listChangedDebounceTimers.set(listType, timer);
      } else refresh();
    };
    this.setNotificationHandler(notificationSchema, handler);
  }
  async sendRootsListChanged() {
    return this.notification({
      method: "notifications/roots/list_changed",
    });
  }
}
export { Client };
