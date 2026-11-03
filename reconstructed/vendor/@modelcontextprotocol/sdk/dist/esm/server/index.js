/**
 * @modelcontextprotocol/sdk/dist/esm/server/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-exz1ts42.js (1)
 * attribution: esm-fingerprint 1
 */
import { Wsn } from "../shared/protocol.js";
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
import { g } from "../experimental/tasks/server.js";
import { J$t, $Qe, q7 } from "./zod-compat.js";
import { TGn, kGn } from "../experimental/tasks/helpers.js";

//@ chunk-exz1ts42.js:2221-10329 esm-fingerprint
class Server extends Wsn {
  constructor(e, t) {
    super(t);
    if (
      ((this._serverInfo = e),
      (this._loggingLevels = new Map()),
      (this.LOG_LEVEL_SEVERITY = new Map(LoggingLevelSchema.options.map((option, s) => [option, s]))),
      (this.isMessageIgnored = (i, s) => {
        let o = this._loggingLevels.get(s);
        return o ? this.LOG_LEVEL_SEVERITY.get(i) < this.LOG_LEVEL_SEVERITY.get(o) : !1;
      }),
      (this._capabilities = t?.capabilities ?? {}),
      (this._instructions = t?.instructions),
      (this._jsonSchemaValidator = t?.jsonSchemaValidator ?? new Gsn()),
      this.setRequestHandler(InitializeRequestSchema, (i) => this._oninitialize(i)),
      this.setNotificationHandler(InitializedNotificationSchema, () => this.oninitialized?.()),
      this._capabilities.logging)
    )
      this.setRequestHandler(SetLevelRequestSchema, async (i, s) => {
        let o = s.sessionId || s.requestInfo?.headers["mcp-session-id"] || void 0,
          { level: level } = i.params,
          safeParse = LoggingLevelSchema.safeParse(level);
        if (safeParse.success) this._loggingLevels.set(o, safeParse.data);
        return {};
      });
  }
  get experimental() {
    if (!this._experimental) this._experimental = { tasks: new g(this) };
    return this._experimental;
  }
  registerCapabilities(e) {
    if (this.transport) throw Error("Cannot register capabilities after connecting to transport");
    this._capabilities = vGn(this._capabilities, e);
  }
  setRequestHandler(e, t) {
    let s = J$t(e)?.method;
    if (!s) throw Error("Schema is missing a method literal");
    let o;
    if ($Qe(s)) {
      let r = s;
      o = r._zod?.def?.value ?? r.value;
    } else {
      let r = s;
      o = r._def?.value ?? r.value;
    }
    if (typeof o !== "string") throw Error("Schema method literal must be a string");
    if (o === "tools/call") {
      let r = async (h, c) => {
        let a = q7(CallToolRequestSchema, h);
        if (!a.success) {
          let p = a.error instanceof Error ? a.error.message : String(a.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call request: ${p}`);
        }
        let { params: params } = a.data,
          resolved = await Promise.resolve(t(h, c));
        if (params.task) {
          let p = q7(CreateTaskResultSchema, resolved);
          if (!p.success) {
            let d = p.error instanceof Error ? p.error.message : String(p.error);
            throw new McpError(ErrorCode.InvalidParams, `Invalid task creation result: ${d}`);
          }
          return p.data;
        }
        let f = q7(CallToolResultSchema, resolved);
        if (!f.success) {
          let p = f.error instanceof Error ? f.error.message : String(f.error);
          throw new McpError(ErrorCode.InvalidParams, `Invalid tools/call result: ${p}`);
        }
        return f.data;
      };
      return super.setRequestHandler(e, r);
    }
    return super.setRequestHandler(e, t);
  }
  assertCapabilityForMethod(e) {
    switch (e) {
      case "sampling/createMessage":
        if (!this._clientCapabilities?.sampling)
          throw Error(`Client does not support sampling (required for ${e})`);
        break;
      case "elicitation/create":
        if (!this._clientCapabilities?.elicitation)
          throw Error(`Client does not support elicitation (required for ${e})`);
        break;
      case "roots/list":
        if (!this._clientCapabilities?.roots)
          throw Error(`Client does not support listing roots (required for ${e})`);
        break;
      case "ping":
        break;
    }
  }
  assertNotificationCapability(e) {
    switch (e) {
      case "notifications/message":
        if (!this._capabilities.logging) throw Error(`Server does not support logging (required for ${e})`);
        break;
      case "notifications/resources/updated":
      case "notifications/resources/list_changed":
        if (!this._capabilities.resources)
          throw Error(`Server does not support notifying about resources (required for ${e})`);
        break;
      case "notifications/tools/list_changed":
        if (!this._capabilities.tools)
          throw Error(`Server does not support notifying of tool list changes (required for ${e})`);
        break;
      case "notifications/prompts/list_changed":
        if (!this._capabilities.prompts)
          throw Error(`Server does not support notifying of prompt list changes (required for ${e})`);
        break;
      case "notifications/elicitation/complete":
        if (!this._clientCapabilities?.elicitation?.url)
          throw Error(`Client does not support URL elicitation (required for ${e})`);
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
      case "completion/complete":
        if (!this._capabilities.completions)
          throw Error(`Server does not support completions (required for ${e})`);
        break;
      case "logging/setLevel":
        if (!this._capabilities.logging) throw Error(`Server does not support logging (required for ${e})`);
        break;
      case "prompts/get":
      case "prompts/list":
        if (!this._capabilities.prompts) throw Error(`Server does not support prompts (required for ${e})`);
        break;
      case "resources/list":
      case "resources/templates/list":
      case "resources/read":
        if (!this._capabilities.resources)
          throw Error(`Server does not support resources (required for ${e})`);
        break;
      case "tools/call":
      case "tools/list":
        if (!this._capabilities.tools) throw Error(`Server does not support tools (required for ${e})`);
        break;
      case "tasks/get":
      case "tasks/list":
      case "tasks/result":
      case "tasks/cancel":
        if (!this._capabilities.tasks)
          throw Error(`Server does not support tasks capability (required for ${e})`);
        break;
      case "ping":
      case "initialize":
        break;
    }
  }
  assertTaskCapability(e) {
    TGn(this._clientCapabilities?.tasks?.requests, e, "Client");
  }
  assertTaskHandlerCapability(e) {
    if (!this._capabilities) return;
    kGn(this._capabilities.tasks?.requests, e, "Server");
  }
  async _oninitialize(e) {
    let protocolVersion = e.params.protocolVersion;
    return (
      (this._clientCapabilities = e.params.capabilities),
      (this._clientVersion = e.params.clientInfo),
      {
        protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)
          ? protocolVersion
          : LATEST_PROTOCOL_VERSION,
        capabilities: this.getCapabilities(),
        serverInfo: this._serverInfo,
        ...(this._instructions && { instructions: this._instructions }),
      }
    );
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
    return this.request({ method: "ping" }, EmptyResultSchema);
  }
  async createMessage(e, t) {
    if (e.tools || e.toolChoice) {
      if (!this._clientCapabilities?.sampling?.tools)
        throw Error("Client does not support sampling tools capability.");
    }
    if (e.messages.length > 0) {
      let i = e.messages[e.messages.length - 1],
        s = Array.isArray(i.content) ? i.content : [i.content],
        any = s.some((c) => c.type === "tool_result"),
        n = e.messages.length > 1 ? e.messages[e.messages.length - 2] : void 0,
        r = n ? (Array.isArray(n.content) ? n.content : [n.content]) : [],
        any_2 = r.some((c) => c.type === "tool_use");
      if (any) {
        if (s.some((c) => c.type !== "tool_result"))
          throw Error("The last message must contain only tool_result content if any is present");
        if (!any_2) throw Error("tool_result blocks are not matching any tool_use from the previous message");
      }
      if (any_2) {
        let c = new Set(r.filter((l) => l.type === "tool_use").map((l) => l.id)),
          a = new Set(s.filter((l) => l.type === "tool_result").map((l) => l.toolUseId));
        if (c.size !== a.size || ![...c].every((l) => a.has(l)))
          throw Error("ids of tool_result blocks and tool_use blocks from previous message do not match");
      }
    }
    if (e.tools)
      return this.request(
        { method: "sampling/createMessage", params: e },
        CreateMessageResultWithToolsSchema,
        t,
      );
    return this.request({ method: "sampling/createMessage", params: e }, CreateMessageResultSchema, t);
  }
  async elicitInput(e, t) {
    switch (e.mode ?? "form") {
      case "url": {
        if (!this._clientCapabilities?.elicitation?.url)
          throw Error("Client does not support url elicitation.");
        let s = e;
        return this.request({ method: "elicitation/create", params: s }, ElicitResultSchema, t);
      }
      case "form": {
        if (!this._clientCapabilities?.elicitation?.form)
          throw Error("Client does not support form elicitation.");
        let s = e.mode === "form" ? e : { ...e, mode: "form" },
          request = await this.request({ method: "elicitation/create", params: s }, ElicitResultSchema, t);
        if (request.action === "accept" && request.content && s.requestedSchema)
          try {
            let r = this._jsonSchemaValidator.getValidator(s.requestedSchema)(request.content);
            if (!r.valid)
              throw new McpError(
                ErrorCode.InvalidParams,
                `Elicitation response content does not match requested schema: ${r.errorMessage}`,
              );
          } catch (error) {
            if (error instanceof McpError) throw error;
            throw new McpError(
              ErrorCode.InternalError,
              `Error validating elicitation response: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        return request;
      }
    }
  }
  createElicitationCompletionNotifier(e, t) {
    if (!this._clientCapabilities?.elicitation?.url)
      throw Error(
        "Client does not support URL elicitation (required for notifications/elicitation/complete)",
      );
    return () =>
      this.notification({ method: "notifications/elicitation/complete", params: { elicitationId: e } }, t);
  }
  async listRoots(e, t) {
    return this.request({ method: "roots/list", params: e }, ListRootsResultSchema, t);
  }
  async sendLoggingMessage(e, t) {
    if (this._capabilities.logging) {
      if (!this.isMessageIgnored(e.level, t))
        return this.notification({ method: "notifications/message", params: e });
    }
  }
  async sendResourceUpdated(e) {
    return this.notification({ method: "notifications/resources/updated", params: e });
  }
  async sendResourceListChanged() {
    return this.notification({ method: "notifications/resources/list_changed" });
  }
  async sendToolListChanged() {
    return this.notification({ method: "notifications/tools/list_changed" });
  }
  async sendPromptListChanged() {
    return this.notification({ method: "notifications/prompts/list_changed" });
  }
}

export { Server };
