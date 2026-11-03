/**
 * @modelcontextprotocol/sdk/dist/esm/client/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-z1n5m6nf.js (3)
 * attribution: esm-fingerprint 3
 */
import { Wsn } from "../shared/protocol.js";
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
import { Zt } from "../experimental/tasks/client.js";
import { J$t, $Qe, q7 } from "../server/zod-compat.js";
import { kGn, TGn } from "../experimental/tasks/helpers.js";

//@ chunk-z1n5m6nf.js:17770-18235 esm-fingerprint
function $t(e, r) {
  if (!e || r === null || typeof r !== "object") return;
  if (e.type === "object" && e.properties && typeof e.properties === "object") {
    let n = r,
      properties = e.properties;
    for (let h of Object.keys(properties)) {
      let y = properties[h];
      if (n[h] === void 0 && Object.prototype.hasOwnProperty.call(y, "default")) n[h] = y.default;
      if (n[h] !== void 0) $t(y, n[h]);
    }
  }
  if (Array.isArray(e.anyOf)) {
    for (let n of e.anyOf) if (typeof n !== "boolean") $t(n, r);
  }
  if (Array.isArray(e.oneOf)) {
    for (let n of e.oneOf) if (typeof n !== "boolean") $t(n, r);
  }
}
//@ chunk-z1n5m6nf.js:18235-18395 esm-fingerprint
function Nr(e) {
  if (!e) return { supportsFormMode: !1, supportsUrlMode: !1 };
  let r = e.form !== void 0,
    n = e.url !== void 0;
  return { supportsFormMode: r || (!r && !n), supportsUrlMode: n };
}
//@ chunk-z1n5m6nf.js:18395-28313 esm-fingerprint
class Bt extends Wsn {
  constructor(e, r) {
    super(r);
    if (
      ((this._clientInfo = e),
      (this._cachedToolOutputValidators = new Map()),
      (this._cachedKnownTaskTools = new Set()),
      (this._cachedRequiredTaskTools = new Set()),
      (this._listChangedDebounceTimers = new Map()),
      (this._capabilities = r?.capabilities ?? {}),
      (this._jsonSchemaValidator = r?.jsonSchemaValidator ?? new Gsn()),
      r?.listChanged)
    )
      this._pendingListChangedConfig = r.listChanged;
  }
  _setupListChangedHandlers(e) {
    if (e.tools && this._serverCapabilities?.tools?.listChanged)
      this._setupListChangedHandler(
        "tools",
        ToolListChangedNotificationSchema,
        e.tools,
        async () => (await this.listTools()).tools,
      );
    if (e.prompts && this._serverCapabilities?.prompts?.listChanged)
      this._setupListChangedHandler(
        "prompts",
        PromptListChangedNotificationSchema,
        e.prompts,
        async () => (await this.listPrompts()).prompts,
      );
    if (e.resources && this._serverCapabilities?.resources?.listChanged)
      this._setupListChangedHandler(
        "resources",
        ResourceListChangedNotificationSchema,
        e.resources,
        async () => (await this.listResources()).resources,
      );
  }
  get experimental() {
    if (!this._experimental) this._experimental = { tasks: new Zt(this) };
    return this._experimental;
  }
  registerCapabilities(e) {
    if (this.transport) throw Error("Cannot register capabilities after connecting to transport");
    this._capabilities = vGn(this._capabilities, e);
  }
  setRequestHandler(e, r) {
    let s = J$t(e)?.method;
    if (!s) throw Error("Schema is missing a method literal");
    let h;
    if ($Qe(s)) {
      let S = s;
      h = S._zod?.def?.value ?? S.value;
    } else {
      let S = s;
      h = S._def?.value ?? S.value;
    }
    if (typeof h !== "string") throw Error("Schema method literal must be a string");
    let y = h;
    if (y === "elicitation/create") {
      let S = async (T, M) => {
        let w = q7(ElicitRequestSchema, T);
        if (!w.success) {
          let G = w.error instanceof Error ? w.error.message : String(w.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid elicitation request: ${G}`);
        }
        let { params: params } = w.data;
        params.mode = params.mode ?? "form";
        let { supportsFormMode: supportsFormMode, supportsUrlMode: supportsUrlMode } = Nr(
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
        let resolved = await Promise.resolve(r(T, M));
        if (params.task) {
          let G = q7(CreateTaskResultSchema, resolved);
          if (!G.success) {
            let q = G.error instanceof Error ? G.error.message : String(G.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${q}`);
          }
          return G.data;
        }
        let U = q7(ElicitResultSchema, resolved);
        if (!U.success) {
          let G = U.error instanceof Error ? U.error.message : String(U.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid elicitation result: ${G}`);
        }
        let re = U.data,
          he = params.mode === "form" ? params.requestedSchema : void 0;
        if (params.mode === "form" && re.action === "accept" && re.content && he) {
          if (this._capabilities.elicitation?.form?.applyDefaults)
            try {
              $t(he, re.content);
            } catch {}
        }
        return re;
      };
      return super.setRequestHandler(e, S);
    }
    if (y === "sampling/createMessage") {
      let S = async (T, M) => {
        let w = q7(CreateMessageRequestSchema, T);
        if (!w.success) {
          let re = w.error instanceof Error ? w.error.message : String(w.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid sampling request: ${re}`);
        }
        let { params: params } = w.data,
          resolved = await Promise.resolve(r(T, M));
        if (params.task) {
          let re = q7(CreateTaskResultSchema, resolved);
          if (!re.success) {
            let he = re.error instanceof Error ? re.error.message : String(re.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${he}`);
          }
          return re.data;
        }
        let H =
            params.tools || params.toolChoice
              ? CreateMessageResultWithToolsSchema
              : CreateMessageResultSchema,
          U = q7(H, resolved);
        if (!U.success) {
          let re = U.error instanceof Error ? U.error.message : String(U.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid sampling result: ${re}`);
        }
        return U.data;
      };
      return super.setRequestHandler(e, S);
    }
    return super.setRequestHandler(e, r);
  }
  assertCapability(e, r) {
    if (!this._serverCapabilities?.[e]) throw Error(`Server does not support ${e} (required for ${r})`);
  }
  async connect(e, r) {
    if ((await super.connect(e), e.sessionId !== void 0)) return;
    try {
      let request = await this.request(
        {
          method: "initialize",
          params: {
            protocolVersion: LATEST_PROTOCOL_VERSION,
            capabilities: this._capabilities,
            clientInfo: this._clientInfo,
          },
        },
        InitializeResultSchema,
        r,
      );
      if (request === void 0) throw Error(`Server sent invalid initialize result: ${request}`);
      if (!SUPPORTED_PROTOCOL_VERSIONS.includes(request.protocolVersion))
        throw Error(`Server's protocol version is not supported: ${request.protocolVersion}`);
      if (
        ((this._serverCapabilities = request.capabilities),
        (this._serverVersion = request.serverInfo),
        e.setProtocolVersion)
      )
        e.setProtocolVersion(request.protocolVersion);
      if (
        ((this._instructions = request.instructions),
        await this.notification({ method: "notifications/initialized" }),
        this._pendingListChangedConfig)
      )
        (this._setupListChangedHandlers(this._pendingListChangedConfig),
          (this._pendingListChangedConfig = void 0));
    } catch (error) {
      throw (this.close(), error);
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
  assertCapabilityForMethod(e) {
    switch (e) {
      case "logging/setLevel":
        if (!this._serverCapabilities?.logging)
          throw Error(`Server does not support logging (required for ${e})`);
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._serverCapabilities?.prompts)
          throw Error(`Server does not support prompts (required for ${e})`);
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
      case "resources/subscribe":
      case "resources/unsubscribe":
        if (!this._serverCapabilities?.resources)
          throw Error(`Server does not support resources (required for ${e})`);
        if (e === "resources/subscribe" && !this._serverCapabilities.resources.subscribe)
          throw Error(`Server does not support resource subscriptions (required for ${e})`);
        break;
      case "tools/call":
      case "tools/list":
        if (!this._serverCapabilities?.tools)
          throw Error(`Server does not support tools (required for ${e})`);
        break;
      case "completion/complete":
        if (!this._serverCapabilities?.completions)
          throw Error(`Server does not support completions (required for ${e})`);
        break;
      case "initialize":
        break;
      case "ping":
        break;
    }
  }
  assertNotificationCapability(e) {
    switch (e) {
      case "notifications/roots/list_changed":
        if (!this._capabilities.roots?.listChanged)
          throw Error(`Client does not support roots list changed notifications (required for ${e})`);
        break;
      case "notifications/initialized":
        break;
      case "notifications/cancelled":
        break;
      case "notifications/progress":
        break;
    }
  }
  assertRequestHandlerCapability(e) {
    if (!this._capabilities) return;
    switch (e) {
      case "sampling/createMessage":
        if (!this._capabilities.sampling)
          throw Error(`Client does not support sampling capability (required for ${e})`);
        break;
      case "elicitation/create":
        if (!this._capabilities.elicitation)
          throw Error(`Client does not support elicitation capability (required for ${e})`);
        break;
      case "roots/list":
        if (!this._capabilities.roots)
          throw Error(`Client does not support roots capability (required for ${e})`);
        break;
      case "tasks/get":
      case "tasks/list":
      case "tasks/result":
      case "tasks/cancel":
        if (!this._capabilities.tasks)
          throw Error(`Client does not support tasks capability (required for ${e})`);
        break;
      case "ping":
        break;
    }
  }
  assertTaskCapability(e) {
    kGn(this._serverCapabilities?.tasks?.requests, e, "Server");
  }
  assertTaskHandlerCapability(e) {
    if (!this._capabilities) return;
    TGn(this._capabilities.tasks?.requests, e, "Client");
  }
  async ping(e) {
    return this.request({ method: "ping" }, EmptyResultSchema, e);
  }
  async complete(e, r) {
    return this.request({ method: "completion/complete", params: e }, CompleteResultSchema, r);
  }
  async setLoggingLevel(e, r) {
    return this.request({ method: "logging/setLevel", params: { level: e } }, EmptyResultSchema, r);
  }
  async getPrompt(e, r) {
    return this.request({ method: "prompts/get", params: e }, GetPromptResultSchema, r);
  }
  async listPrompts(e, r) {
    return this.request({ method: "prompts/list", params: e }, ListPromptsResultSchema, r);
  }
  async listResources(e, r) {
    return this.request({ method: "resources/list", params: e }, ListResourcesResultSchema, r);
  }
  async listResourceTemplates(e, r) {
    return this.request(
      { method: "resources/templates/list", params: e },
      ListResourceTemplatesResultSchema,
      r,
    );
  }
  async readResource(e, r) {
    return this.request({ method: "resources/read", params: e }, ReadResourceResultSchema, r);
  }
  async subscribeResource(e, r) {
    return this.request({ method: "resources/subscribe", params: e }, EmptyResultSchema, r);
  }
  async unsubscribeResource(e, r) {
    return this.request({ method: "resources/unsubscribe", params: e }, EmptyResultSchema, r);
  }
  async callTool(e, r = CallToolResultSchema, n) {
    if (this.isToolTaskRequired(e.name))
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Tool "${e.name}" requires task-based execution. Use client.experimental.tasks.callToolStream() instead.`,
      );
    let request = await this.request({ method: "tools/call", params: e }, r, n),
      toolOutputValidator = this.getToolOutputValidator(e.name);
    if (toolOutputValidator) {
      if (!request.structuredContent && !request.isError)
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Tool ${e.name} has an output schema but did not return structured content`,
        );
      if (request.structuredContent)
        try {
          let y = toolOutputValidator(request.structuredContent);
          if (!y.valid)
            throw new McpError(
              ErrorCode.InvalidParams,
              `Structured content does not match the tool's output schema: ${y.errorMessage}`,
            );
        } catch (error) {
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InvalidParams,
            `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
    }
    return request;
  }
  isToolTask(e) {
    if (!this._serverCapabilities?.tasks?.requests?.tools?.call) return !1;
    return this._cachedKnownTaskTools.has(e);
  }
  isToolTaskRequired(e) {
    return this._cachedRequiredTaskTools.has(e);
  }
  cacheToolMetadata(e) {
    (this._cachedToolOutputValidators.clear(),
      this._cachedKnownTaskTools.clear(),
      this._cachedRequiredTaskTools.clear());
    for (let r of e) {
      if (r.outputSchema) {
        let validator = this._jsonSchemaValidator.getValidator(r.outputSchema);
        this._cachedToolOutputValidators.set(r.name, validator);
      }
      let n = r.execution?.taskSupport;
      if (n === "required" || n === "optional") this._cachedKnownTaskTools.add(r.name);
      if (n === "required") this._cachedRequiredTaskTools.add(r.name);
    }
  }
  getToolOutputValidator(e) {
    return this._cachedToolOutputValidators.get(e);
  }
  async listTools(e, r) {
    let request = await this.request({ method: "tools/list", params: e }, ListToolsResultSchema, r);
    return (this.cacheToolMetadata(request.tools), request);
  }
  _setupListChangedHandler(e, r, n, s) {
    let safeParse = ListChangedOptionsBaseSchema.safeParse(n);
    if (!safeParse.success) throw Error(`Invalid ${e} listChanged options: ${safeParse.error.message}`);
    if (typeof n.onChanged !== "function")
      throw Error(`Invalid ${e} listChanged options: onChanged must be a function`);
    let { autoRefresh: autoRefresh, debounceMs: debounceMs } = safeParse.data,
      { onChanged: onChanged } = n,
      M = async () => {
        if (!autoRefresh) {
          onChanged(null, null);
          return;
        }
        try {
          let R = await s();
          onChanged(null, R);
        } catch (error) {
          let E = error instanceof Error ? error : Error(String(error));
          onChanged(E, null);
        }
      },
      w = () => {
        if (debounceMs) {
          let R = this._listChangedDebounceTimers.get(e);
          if (R) clearTimeout(R);
          let E = setTimeout(M, debounceMs);
          this._listChangedDebounceTimers.set(e, E);
        } else M();
      };
    this.setNotificationHandler(r, w);
  }
  async sendRootsListChanged() {
    return this.notification({ method: "notifications/roots/list_changed" });
  }
}

export { Bt };
