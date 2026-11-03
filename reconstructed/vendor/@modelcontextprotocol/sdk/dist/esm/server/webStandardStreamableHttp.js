/**
 * @modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-3kpg9vdk.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  JSONRPCMessageSchema,
  isInitializeRequest,
  isJSONRPCRequest,
  DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  isJSONRPCResultResponse,
  isJSONRPCErrorResponse,
} from "../types.js";

//@ chunk-3kpg9vdk.js:250-11789 esm-fingerprint
class WebStandardStreamableHTTPServerTransport {
  constructor(options = {}) {
    this._started = false;
    this._hasHandledRequest = false;
    this._streamMapping = new Map();
    this._requestToStreamMapping = new Map();
    this._requestResponseMap = new Map();
    this._initialized = false;
    this._enableJsonResponse = false;
    this._standaloneSseStreamId = "_GET_stream";
    this.sessionIdGenerator = options.sessionIdGenerator;
    this._enableJsonResponse = options.enableJsonResponse ?? false;
    this._eventStore = options.eventStore;
    this._onsessioninitialized = options.onsessioninitialized;
    this._onsessionclosed = options.onsessionclosed;
    this._allowedHosts = options.allowedHosts;
    this._allowedOrigins = options.allowedOrigins;
    this._enableDnsRebindingProtection = options.enableDnsRebindingProtection ?? false;
    this._retryInterval = options.retryInterval;
  }
  async start() {
    if (this._started) throw Error("Transport already started");
    this._started = true;
  }
  createJsonErrorResponse(status, code, message, options) {
    let error = {
      code,
      message,
    };
    if (options?.data !== undefined) error.data = options.data;
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error,
        id: null,
      }),
      {
        status,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      },
    );
  }
  validateRequestHeaders(req) {
    if (!this._enableDnsRebindingProtection) return;
    if (this._allowedHosts && this._allowedHosts.length > 0) {
      let hostHeader = req.headers.get("host");
      if (!hostHeader || !this._allowedHosts.includes(hostHeader)) {
        let error = `Invalid Host header: ${hostHeader}`;
        this.onerror?.(Error(error));
        return this.createJsonErrorResponse(403, -32000, error);
      }
    }
    if (this._allowedOrigins && this._allowedOrigins.length > 0) {
      let originHeader = req.headers.get("origin");
      if (originHeader && !this._allowedOrigins.includes(originHeader)) {
        let error = `Invalid Origin header: ${originHeader}`;
        this.onerror?.(Error(error));
        return this.createJsonErrorResponse(403, -32000, error);
      }
    }
    return;
  }
  async handleRequest(req, options) {
    if (!this.sessionIdGenerator && this._hasHandledRequest)
      throw Error(
        "Stateless transport cannot be reused across requests. Create a new transport per request.",
      );
    this._hasHandledRequest = true;
    let validationError = this.validateRequestHeaders(req);
    if (validationError) return validationError;
    switch (req.method) {
      case "POST":
        return this.handlePostRequest(req, options);
      case "GET":
        return this.handleGetRequest(req);
      case "DELETE":
        return this.handleDeleteRequest(req);
      default:
        return this.handleUnsupportedRequest();
    }
  }
  async writePrimingEvent(controller, encoder, streamId, protocolVersion) {
    if (!this._eventStore) return;
    if (protocolVersion < "2025-11-25") return;
    let primingEventId = await this._eventStore.storeEvent(streamId, {});
    let primingEvent = `id: ${primingEventId}
data: 

`;
    if (this._retryInterval !== undefined)
      primingEvent = `id: ${primingEventId}
retry: ${this._retryInterval}
data: 

`;
    controller.enqueue(encoder.encode(primingEvent));
  }
  async handleGetRequest(req) {
    if (!req.headers.get("accept")?.includes("text/event-stream")) {
      this.onerror?.(Error("Not Acceptable: Client must accept text/event-stream"));
      return this.createJsonErrorResponse(
        406,
        -32000,
        "Not Acceptable: Client must accept text/event-stream",
      );
    }
    let sessionError = this.validateSession(req);
    if (sessionError) return sessionError;
    let protocolError = this.validateProtocolVersion(req);
    if (protocolError) return protocolError;
    if (this._eventStore) {
      let lastEventId = req.headers.get("last-event-id");
      if (lastEventId) return this.replayEvents(lastEventId);
    }
    if (this._streamMapping.get(this._standaloneSseStreamId) !== undefined) {
      this.onerror?.(Error("Conflict: Only one SSE stream is allowed per session"));
      return this.createJsonErrorResponse(
        409,
        -32000,
        "Conflict: Only one SSE stream is allowed per session",
      );
    }
    let encoder = new TextEncoder();
    let streamController;
    let readable = new ReadableStream({
      start: (controller) => {
        streamController = controller;
      },
      cancel: () => {
        this._streamMapping.delete(this._standaloneSseStreamId);
      },
    });
    let headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    };
    if (this.sessionId !== undefined) headers["mcp-session-id"] = this.sessionId;
    this._streamMapping.set(this._standaloneSseStreamId, {
      controller: streamController,
      encoder,
      cleanup: () => {
        this._streamMapping.delete(this._standaloneSseStreamId);
        try {
          streamController.close();
        } catch {}
      },
    });
    return new Response(readable, {
      headers,
    });
  }
  async replayEvents(lastEventId) {
    if (!this._eventStore) {
      this.onerror?.(Error("Event store not configured"));
      return this.createJsonErrorResponse(400, -32000, "Event store not configured");
    }
    try {
      let streamId;
      if (this._eventStore.getStreamIdForEventId) {
        streamId = await this._eventStore.getStreamIdForEventId(lastEventId);
        if (!streamId) {
          this.onerror?.(Error("Invalid event ID format"));
          return this.createJsonErrorResponse(400, -32000, "Invalid event ID format");
        }
        if (this._streamMapping.get(streamId) !== undefined) {
          this.onerror?.(Error("Conflict: Stream already has an active connection"));
          return this.createJsonErrorResponse(
            409,
            -32000,
            "Conflict: Stream already has an active connection",
          );
        }
      }
      let headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      };
      if (this.sessionId !== undefined) headers["mcp-session-id"] = this.sessionId;
      let encoder = new TextEncoder();
      let streamController;
      let readable = new ReadableStream({
        start: (controller) => {
          streamController = controller;
        },
        cancel: () => {},
      });
      let replayedStreamId = await this._eventStore.replayEventsAfter(lastEventId, {
        send: async (a, message) => {
          if (!this.writeSSEEvent(streamController, encoder, message, a)) {
            this.onerror?.(Error("Failed replay events"));
            try {
              streamController.close();
            } catch {}
          }
        },
      });
      this._streamMapping.set(replayedStreamId, {
        controller: streamController,
        encoder,
        cleanup: () => {
          this._streamMapping.delete(replayedStreamId);
          try {
            streamController.close();
          } catch {}
        },
      });
      return new Response(readable, {
        headers,
      });
    } catch (error) {
      this.onerror?.(error);
      return this.createJsonErrorResponse(500, -32000, "Error replaying events");
    }
  }
  writeSSEEvent(controller, encoder, message, eventId) {
    try {
      let eventData = `event: message
`;
      if (eventId)
        eventData += `id: ${eventId}
`;
      eventData += `data: ${JSON.stringify(message)}

`;
      controller.enqueue(encoder.encode(eventData));
      return true;
    } catch (error) {
      this.onerror?.(error);
      return false;
    }
  }
  handleUnsupportedRequest() {
    this.onerror?.(Error("Method not allowed."));
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      }),
      {
        status: 405,
        headers: {
          Allow: "GET, POST, DELETE",
          "Content-Type": "application/json",
        },
      },
    );
  }
  async handlePostRequest(req, options) {
    try {
      let acceptHeader = req.headers.get("accept");
      if (!acceptHeader?.includes("application/json") || !acceptHeader.includes("text/event-stream")) {
        this.onerror?.(
          Error("Not Acceptable: Client must accept both application/json and text/event-stream"),
        );
        return this.createJsonErrorResponse(
          406,
          -32000,
          "Not Acceptable: Client must accept both application/json and text/event-stream",
        );
      }
      let ct = req.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) {
        this.onerror?.(Error("Unsupported Media Type: Content-Type must be application/json"));
        return this.createJsonErrorResponse(
          415,
          -32000,
          "Unsupported Media Type: Content-Type must be application/json",
        );
      }
      let requestInfo = {
        headers: Object.fromEntries(req.headers.entries()),
        url: new URL(req.url),
      };
      let rawMessage;
      if (options?.parsedBody !== undefined) rawMessage = options.parsedBody;
      else
        try {
          rawMessage = await req.json();
        } catch {
          this.onerror?.(Error("Parse error: Invalid JSON"));
          return this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON");
        }
      let messages;
      try {
        if (Array.isArray(rawMessage)) messages = rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg));
        else messages = [JSONRPCMessageSchema.parse(rawMessage)];
      } catch {
        this.onerror?.(Error("Parse error: Invalid JSON-RPC message"));
        return this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON-RPC message");
      }
      let isInitializationRequest = messages.some(isInitializeRequest);
      if (isInitializationRequest) {
        if (this._initialized && this.sessionId !== undefined) {
          this.onerror?.(Error("Invalid Request: Server already initialized"));
          return this.createJsonErrorResponse(400, -32600, "Invalid Request: Server already initialized");
        }
        if (messages.length > 1) {
          this.onerror?.(Error("Invalid Request: Only one initialization request is allowed"));
          return this.createJsonErrorResponse(
            400,
            -32600,
            "Invalid Request: Only one initialization request is allowed",
          );
        }
        this.sessionId = this.sessionIdGenerator?.();
        this._initialized = true;
        if (this.sessionId && this._onsessioninitialized)
          await Promise.resolve(this._onsessioninitialized(this.sessionId));
      }
      if (!isInitializationRequest) {
        let sessionError = this.validateSession(req);
        if (sessionError) return sessionError;
        let protocolError = this.validateProtocolVersion(req);
        if (protocolError) return protocolError;
      }
      if (!messages.some(isJSONRPCRequest)) {
        for (let message of messages)
          this.onmessage?.(message, {
            authInfo: options?.authInfo,
            requestInfo,
          });
        return new Response(null, {
          status: 202,
        });
      }
      let streamId = crypto.randomUUID();
      let initRequest = messages.find((m) => isInitializeRequest(m));
      let clientProtocolVersion = initRequest
        ? initRequest.params.protocolVersion
        : (req.headers.get("mcp-protocol-version") ?? DEFAULT_NEGOTIATED_PROTOCOL_VERSION);
      if (this._enableJsonResponse)
        return new Promise((resolve) => {
          this._streamMapping.set(streamId, {
            resolveJson: resolve,
            cleanup: () => {
              this._streamMapping.delete(streamId);
            },
          });
          for (let message of messages)
            if (isJSONRPCRequest(message)) this._requestToStreamMapping.set(message.id, streamId);
          for (let message of messages)
            this.onmessage?.(message, {
              authInfo: options?.authInfo,
              requestInfo,
            });
        });
      let encoder = new TextEncoder();
      let streamController;
      let readable = new ReadableStream({
        start: (controller) => {
          streamController = controller;
        },
        cancel: () => {
          this._streamMapping.delete(streamId);
        },
      });
      let headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      };
      if (this.sessionId !== undefined) headers["mcp-session-id"] = this.sessionId;
      for (let message of messages)
        if (isJSONRPCRequest(message)) {
          this._streamMapping.set(streamId, {
            controller: streamController,
            encoder,
            cleanup: () => {
              this._streamMapping.delete(streamId);
              try {
                streamController.close();
              } catch {}
            },
          });
          this._requestToStreamMapping.set(message.id, streamId);
        }
      await this.writePrimingEvent(streamController, encoder, streamId, clientProtocolVersion);
      for (let message of messages) {
        let closeSSEStream;
        let closeStandaloneSSEStream;
        if (isJSONRPCRequest(message) && this._eventStore && clientProtocolVersion >= "2025-11-25") {
          closeSSEStream = () => {
            this.closeSSEStream(message.id);
          };
          closeStandaloneSSEStream = () => {
            this.closeStandaloneSSEStream();
          };
        }
        this.onmessage?.(message, {
          authInfo: options?.authInfo,
          requestInfo,
          closeSSEStream,
          closeStandaloneSSEStream,
        });
      }
      return new Response(readable, {
        status: 200,
        headers,
      });
    } catch (error) {
      this.onerror?.(error);
      return this.createJsonErrorResponse(400, -32700, "Parse error", {
        data: String(error),
      });
    }
  }
  async handleDeleteRequest(req) {
    let sessionError = this.validateSession(req);
    if (sessionError) return sessionError;
    let protocolError = this.validateProtocolVersion(req);
    if (protocolError) return protocolError;
    await Promise.resolve(this._onsessionclosed?.(this.sessionId));
    await this.close();
    return new Response(null, {
      status: 200,
    });
  }
  validateSession(req) {
    if (this.sessionIdGenerator === undefined) return;
    if (!this._initialized) {
      this.onerror?.(Error("Bad Request: Server not initialized"));
      return this.createJsonErrorResponse(400, -32000, "Bad Request: Server not initialized");
    }
    let sessionId = req.headers.get("mcp-session-id");
    if (!sessionId) {
      this.onerror?.(Error("Bad Request: Mcp-Session-Id header is required"));
      return this.createJsonErrorResponse(400, -32000, "Bad Request: Mcp-Session-Id header is required");
    }
    if (sessionId !== this.sessionId) {
      this.onerror?.(Error("Session not found"));
      return this.createJsonErrorResponse(404, -32001, "Session not found");
    }
    return;
  }
  validateProtocolVersion(req) {
    let protocolVersion = req.headers.get("mcp-protocol-version");
    if (protocolVersion !== null && !SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)) {
      this.onerror?.(
        Error(
          `Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`,
        ),
      );
      return this.createJsonErrorResponse(
        400,
        -32000,
        `Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`,
      );
    }
    return;
  }
  async close() {
    this._streamMapping.forEach(({ cleanup }) => {
      cleanup();
    });
    this._streamMapping.clear();
    this._requestResponseMap.clear();
    this.onclose?.();
  }
  closeSSEStream(requestId) {
    let streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId) return;
    let stream = this._streamMapping.get(streamId);
    if (stream) stream.cleanup();
  }
  closeStandaloneSSEStream() {
    let stream = this._streamMapping.get(this._standaloneSseStreamId);
    if (stream) stream.cleanup();
  }
  async send(message, options) {
    let requestId = options?.relatedRequestId;
    if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) requestId = message.id;
    if (requestId === undefined) {
      if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message))
        throw Error(
          "Cannot send a response on a standalone SSE stream unless resuming a previous client request",
        );
      let eventId;
      if (this._eventStore) eventId = await this._eventStore.storeEvent(this._standaloneSseStreamId, message);
      let standaloneSse = this._streamMapping.get(this._standaloneSseStreamId);
      if (standaloneSse === undefined) return;
      if (standaloneSse.controller && standaloneSse.encoder)
        this.writeSSEEvent(standaloneSse.controller, standaloneSse.encoder, message, eventId);
      return;
    }
    let streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId) throw Error(`No connection established for request ID: ${String(requestId)}`);
    let stream = this._streamMapping.get(streamId);
    if (!this._enableJsonResponse && stream?.controller && stream?.encoder) {
      let eventId;
      if (this._eventStore) eventId = await this._eventStore.storeEvent(streamId, message);
      this.writeSSEEvent(stream.controller, stream.encoder, message, eventId);
    }
    if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
      this._requestResponseMap.set(requestId, message);
      let relatedIds = Array.from(this._requestToStreamMapping.entries())
        .filter(([_, sid]) => sid === streamId)
        .map(([a]) => a);
      if (relatedIds.every((relatedId) => this._requestResponseMap.has(relatedId))) {
        if (!stream) throw Error(`No connection established for request ID: ${String(requestId)}`);
        if (this._enableJsonResponse && stream.resolveJson) {
          let headers = {
            "Content-Type": "application/json",
          };
          if (this.sessionId !== undefined) headers["mcp-session-id"] = this.sessionId;
          let responses = relatedIds.map((id) => this._requestResponseMap.get(id));
          if (responses.length === 1)
            stream.resolveJson(
              new Response(JSON.stringify(responses[0]), {
                status: 200,
                headers,
              }),
            );
          else
            stream.resolveJson(
              new Response(JSON.stringify(responses), {
                status: 200,
                headers,
              }),
            );
        } else stream.cleanup();
        for (let id of relatedIds) {
          this._requestResponseMap.delete(id);
          this._requestToStreamMapping.delete(id);
        }
      }
    }
  }
}
export { WebStandardStreamableHTTPServerTransport };
