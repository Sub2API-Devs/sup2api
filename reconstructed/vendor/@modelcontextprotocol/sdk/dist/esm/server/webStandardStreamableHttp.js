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
  constructor(e = {}) {
    ((this._started = !1),
      (this._hasHandledRequest = !1),
      (this._streamMapping = new Map()),
      (this._requestToStreamMapping = new Map()),
      (this._requestResponseMap = new Map()),
      (this._initialized = !1),
      (this._enableJsonResponse = !1),
      (this._standaloneSseStreamId = "_GET_stream"),
      (this.sessionIdGenerator = e.sessionIdGenerator),
      (this._enableJsonResponse = e.enableJsonResponse ?? !1),
      (this._eventStore = e.eventStore),
      (this._onsessioninitialized = e.onsessioninitialized),
      (this._onsessionclosed = e.onsessionclosed),
      (this._allowedHosts = e.allowedHosts),
      (this._allowedOrigins = e.allowedOrigins),
      (this._enableDnsRebindingProtection = e.enableDnsRebindingProtection ?? !1),
      (this._retryInterval = e.retryInterval));
  }
  async start() {
    if (this._started) throw Error("Transport already started");
    this._started = !0;
  }
  createJsonErrorResponse(e, t, s, i) {
    let r = { code: t, message: s };
    if (i?.data !== void 0) r.data = i.data;
    return new Response(JSON.stringify({ jsonrpc: "2.0", error: r, id: null }), {
      status: e,
      headers: { "Content-Type": "application/json", ...i?.headers },
    });
  }
  validateRequestHeaders(e) {
    if (!this._enableDnsRebindingProtection) return;
    if (this._allowedHosts && this._allowedHosts.length > 0) {
      let t = e.headers.get("host");
      if (!t || !this._allowedHosts.includes(t)) {
        let s = `Invalid Host header: ${t}`;
        return (this.onerror?.(Error(s)), this.createJsonErrorResponse(403, -32000, s));
      }
    }
    if (this._allowedOrigins && this._allowedOrigins.length > 0) {
      let t = e.headers.get("origin");
      if (t && !this._allowedOrigins.includes(t)) {
        let s = `Invalid Origin header: ${t}`;
        return (this.onerror?.(Error(s)), this.createJsonErrorResponse(403, -32000, s));
      }
    }
    return;
  }
  async handleRequest(e, t) {
    if (!this.sessionIdGenerator && this._hasHandledRequest)
      throw Error(
        "Stateless transport cannot be reused across requests. Create a new transport per request.",
      );
    this._hasHandledRequest = !0;
    let validateRequestHeaders = this.validateRequestHeaders(e);
    if (validateRequestHeaders) return validateRequestHeaders;
    switch (e.method) {
      case "POST":
        return this.handlePostRequest(e, t);
      case "GET":
        return this.handleGetRequest(e);
      case "DELETE":
        return this.handleDeleteRequest(e);
      default:
        return this.handleUnsupportedRequest();
    }
  }
  async writePrimingEvent(e, t, s, i) {
    if (!this._eventStore) return;
    if (i < "2025-11-25") return;
    let storeEvent = await this._eventStore.storeEvent(s, {}),
      n = `id: ${storeEvent}
data: 

`;
    if (this._retryInterval !== void 0)
      n = `id: ${storeEvent}
retry: ${this._retryInterval}
data: 

`;
    e.enqueue(t.encode(n));
  }
  async handleGetRequest(e) {
    if (!e.headers.get("accept")?.includes("text/event-stream"))
      return (
        this.onerror?.(Error("Not Acceptable: Client must accept text/event-stream")),
        this.createJsonErrorResponse(406, -32000, "Not Acceptable: Client must accept text/event-stream")
      );
    let validateSession = this.validateSession(e);
    if (validateSession) return validateSession;
    let validateProtocolVersion = this.validateProtocolVersion(e);
    if (validateProtocolVersion) return validateProtocolVersion;
    if (this._eventStore) {
      let l = e.headers.get("last-event-id");
      if (l) return this.replayEvents(l);
    }
    if (this._streamMapping.get(this._standaloneSseStreamId) !== void 0)
      return (
        this.onerror?.(Error("Conflict: Only one SSE stream is allowed per session")),
        this.createJsonErrorResponse(409, -32000, "Conflict: Only one SSE stream is allowed per session")
      );
    let textEncoder = new TextEncoder(),
      n,
      readableStream = new ReadableStream({
        start: (l) => {
          n = l;
        },
        cancel: () => {
          this._streamMapping.delete(this._standaloneSseStreamId);
        },
      }),
      a = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      };
    if (this.sessionId !== void 0) a["mcp-session-id"] = this.sessionId;
    return (
      this._streamMapping.set(this._standaloneSseStreamId, {
        controller: n,
        encoder: textEncoder,
        cleanup: () => {
          this._streamMapping.delete(this._standaloneSseStreamId);
          try {
            n.close();
          } catch {}
        },
      }),
      new Response(readableStream, { headers: a })
    );
  }
  async replayEvents(e) {
    if (!this._eventStore)
      return (
        this.onerror?.(Error("Event store not configured")),
        this.createJsonErrorResponse(400, -32000, "Event store not configured")
      );
    try {
      let t;
      if (this._eventStore.getStreamIdForEventId) {
        if (((t = await this._eventStore.getStreamIdForEventId(e)), !t))
          return (
            this.onerror?.(Error("Invalid event ID format")),
            this.createJsonErrorResponse(400, -32000, "Invalid event ID format")
          );
        if (this._streamMapping.get(t) !== void 0)
          return (
            this.onerror?.(Error("Conflict: Stream already has an active connection")),
            this.createJsonErrorResponse(409, -32000, "Conflict: Stream already has an active connection")
          );
      }
      let s = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      };
      if (this.sessionId !== void 0) s["mcp-session-id"] = this.sessionId;
      let textEncoder = new TextEncoder(),
        r,
        readableStream = new ReadableStream({
          start: (a) => {
            r = a;
          },
          cancel: () => {},
        }),
        replayEventsAfter = await this._eventStore.replayEventsAfter(e, {
          send: async (a, l) => {
            if (!this.writeSSEEvent(r, textEncoder, l, a)) {
              this.onerror?.(Error("Failed replay events"));
              try {
                r.close();
              } catch {}
            }
          },
        });
      return (
        this._streamMapping.set(replayEventsAfter, {
          controller: r,
          encoder: textEncoder,
          cleanup: () => {
            this._streamMapping.delete(replayEventsAfter);
            try {
              r.close();
            } catch {}
          },
        }),
        new Response(readableStream, { headers: s })
      );
    } catch (error) {
      return (this.onerror?.(error), this.createJsonErrorResponse(500, -32000, "Error replaying events"));
    }
  }
  writeSSEEvent(e, t, s, i) {
    try {
      let r = `event: message
`;
      if (i)
        r += `id: ${i}
`;
      return (
        (r += `data: ${JSON.stringify(s)}

`),
        e.enqueue(t.encode(r)),
        !0
      );
    } catch (error) {
      return (this.onerror?.(error), !1);
    }
  }
  handleUnsupportedRequest() {
    return (
      this.onerror?.(Error("Method not allowed.")),
      new Response(
        JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }),
        { status: 405, headers: { Allow: "GET, POST, DELETE", "Content-Type": "application/json" } },
      )
    );
  }
  async handlePostRequest(e, t) {
    try {
      let s = e.headers.get("accept");
      if (!s?.includes("application/json") || !s.includes("text/event-stream"))
        return (
          this.onerror?.(
            Error("Not Acceptable: Client must accept both application/json and text/event-stream"),
          ),
          this.createJsonErrorResponse(
            406,
            -32000,
            "Not Acceptable: Client must accept both application/json and text/event-stream",
          )
        );
      let i = e.headers.get("content-type");
      if (!i || !i.includes("application/json"))
        return (
          this.onerror?.(Error("Unsupported Media Type: Content-Type must be application/json")),
          this.createJsonErrorResponse(
            415,
            -32000,
            "Unsupported Media Type: Content-Type must be application/json",
          )
        );
      let r = { headers: Object.fromEntries(e.headers.entries()), url: new URL(e.url) },
        n;
      if (t?.parsedBody !== void 0) n = t.parsedBody;
      else
        try {
          n = await e.json();
        } catch {
          return (
            this.onerror?.(Error("Parse error: Invalid JSON")),
            this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON")
          );
        }
      let o;
      try {
        if (Array.isArray(n)) o = n.map((d) => JSONRPCMessageSchema.parse(d));
        else o = [JSONRPCMessageSchema.parse(n)];
      } catch {
        return (
          this.onerror?.(Error("Parse error: Invalid JSON-RPC message")),
          this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON-RPC message")
        );
      }
      let any = o.some(isInitializeRequest);
      if (any) {
        if (this._initialized && this.sessionId !== void 0)
          return (
            this.onerror?.(Error("Invalid Request: Server already initialized")),
            this.createJsonErrorResponse(400, -32600, "Invalid Request: Server already initialized")
          );
        if (o.length > 1)
          return (
            this.onerror?.(Error("Invalid Request: Only one initialization request is allowed")),
            this.createJsonErrorResponse(
              400,
              -32600,
              "Invalid Request: Only one initialization request is allowed",
            )
          );
        if (
          ((this.sessionId = this.sessionIdGenerator?.()),
          (this._initialized = !0),
          this.sessionId && this._onsessioninitialized)
        )
          await Promise.resolve(this._onsessioninitialized(this.sessionId));
      }
      if (!any) {
        let validateSession = this.validateSession(e);
        if (validateSession) return validateSession;
        let validateProtocolVersion = this.validateProtocolVersion(e);
        if (validateProtocolVersion) return validateProtocolVersion;
      }
      if (!o.some(isJSONRPCRequest)) {
        for (let d of o) this.onmessage?.(d, { authInfo: t?.authInfo, requestInfo: r });
        return new Response(null, { status: 202 });
      }
      let randomUUID = crypto.randomUUID(),
        found = o.find((d) => isInitializeRequest(d)),
        f = found
          ? found.params.protocolVersion
          : (e.headers.get("mcp-protocol-version") ?? DEFAULT_NEGOTIATED_PROTOCOL_VERSION);
      if (this._enableJsonResponse)
        return new Promise((d) => {
          this._streamMapping.set(randomUUID, {
            resolveJson: d,
            cleanup: () => {
              this._streamMapping.delete(randomUUID);
            },
          });
          for (let h of o) if (isJSONRPCRequest(h)) this._requestToStreamMapping.set(h.id, randomUUID);
          for (let h of o) this.onmessage?.(h, { authInfo: t?.authInfo, requestInfo: r });
        });
      let textEncoder = new TextEncoder(),
        p,
        readableStream = new ReadableStream({
          start: (d) => {
            p = d;
          },
          cancel: () => {
            this._streamMapping.delete(randomUUID);
          },
        }),
        m = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" };
      if (this.sessionId !== void 0) m["mcp-session-id"] = this.sessionId;
      for (let d of o)
        if (isJSONRPCRequest(d))
          (this._streamMapping.set(randomUUID, {
            controller: p,
            encoder: textEncoder,
            cleanup: () => {
              this._streamMapping.delete(randomUUID);
              try {
                p.close();
              } catch {}
            },
          }),
            this._requestToStreamMapping.set(d.id, randomUUID));
      await this.writePrimingEvent(p, textEncoder, randomUUID, f);
      for (let d of o) {
        let h, E;
        if (isJSONRPCRequest(d) && this._eventStore && f >= "2025-11-25")
          ((h = () => {
            this.closeSSEStream(d.id);
          }),
            (E = () => {
              this.closeStandaloneSSEStream();
            }));
        this.onmessage?.(d, {
          authInfo: t?.authInfo,
          requestInfo: r,
          closeSSEStream: h,
          closeStandaloneSSEStream: E,
        });
      }
      return new Response(readableStream, { status: 200, headers: m });
    } catch (error) {
      return (
        this.onerror?.(error),
        this.createJsonErrorResponse(400, -32700, "Parse error", { data: String(error) })
      );
    }
  }
  async handleDeleteRequest(e) {
    let validateSession = this.validateSession(e);
    if (validateSession) return validateSession;
    let validateProtocolVersion = this.validateProtocolVersion(e);
    if (validateProtocolVersion) return validateProtocolVersion;
    return (
      await Promise.resolve(this._onsessionclosed?.(this.sessionId)),
      await this.close(),
      new Response(null, { status: 200 })
    );
  }
  validateSession(e) {
    if (this.sessionIdGenerator === void 0) return;
    if (!this._initialized)
      return (
        this.onerror?.(Error("Bad Request: Server not initialized")),
        this.createJsonErrorResponse(400, -32000, "Bad Request: Server not initialized")
      );
    let t = e.headers.get("mcp-session-id");
    if (!t)
      return (
        this.onerror?.(Error("Bad Request: Mcp-Session-Id header is required")),
        this.createJsonErrorResponse(400, -32000, "Bad Request: Mcp-Session-Id header is required")
      );
    if (t !== this.sessionId)
      return (
        this.onerror?.(Error("Session not found")),
        this.createJsonErrorResponse(404, -32001, "Session not found")
      );
    return;
  }
  validateProtocolVersion(e) {
    let t = e.headers.get("mcp-protocol-version");
    if (t !== null && !SUPPORTED_PROTOCOL_VERSIONS.includes(t))
      return (
        this.onerror?.(
          Error(
            `Bad Request: Unsupported protocol version: ${t} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`,
          ),
        ),
        this.createJsonErrorResponse(
          400,
          -32000,
          `Bad Request: Unsupported protocol version: ${t} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`,
        )
      );
    return;
  }
  async close() {
    (this._streamMapping.forEach(({ cleanup: cleanup }) => {
      cleanup();
    }),
      this._streamMapping.clear(),
      this._requestResponseMap.clear(),
      this.onclose?.());
  }
  closeSSEStream(e) {
    let t = this._requestToStreamMapping.get(e);
    if (!t) return;
    let s = this._streamMapping.get(t);
    if (s) s.cleanup();
  }
  closeStandaloneSSEStream() {
    let e = this._streamMapping.get(this._standaloneSseStreamId);
    if (e) e.cleanup();
  }
  async send(e, t) {
    let s = t?.relatedRequestId;
    if (isJSONRPCResultResponse(e) || isJSONRPCErrorResponse(e)) s = e.id;
    if (s === void 0) {
      if (isJSONRPCResultResponse(e) || isJSONRPCErrorResponse(e))
        throw Error(
          "Cannot send a response on a standalone SSE stream unless resuming a previous client request",
        );
      let n;
      if (this._eventStore) n = await this._eventStore.storeEvent(this._standaloneSseStreamId, e);
      let o = this._streamMapping.get(this._standaloneSseStreamId);
      if (o === void 0) return;
      if (o.controller && o.encoder) this.writeSSEEvent(o.controller, o.encoder, e, n);
      return;
    }
    let i = this._requestToStreamMapping.get(s);
    if (!i) throw Error(`No connection established for request ID: ${String(s)}`);
    let r = this._streamMapping.get(i);
    if (!this._enableJsonResponse && r?.controller && r?.encoder) {
      let n;
      if (this._eventStore) n = await this._eventStore.storeEvent(i, e);
      this.writeSSEEvent(r.controller, r.encoder, e, n);
    }
    if (isJSONRPCResultResponse(e) || isJSONRPCErrorResponse(e)) {
      this._requestResponseMap.set(s, e);
      let mapped = Array.from(this._requestToStreamMapping.entries())
        .filter(([a, l]) => l === i)
        .map(([a]) => a);
      if (mapped.every((a) => this._requestResponseMap.has(a))) {
        if (!r) throw Error(`No connection established for request ID: ${String(s)}`);
        if (this._enableJsonResponse && r.resolveJson) {
          let a = { "Content-Type": "application/json" };
          if (this.sessionId !== void 0) a["mcp-session-id"] = this.sessionId;
          let mapped_2 = mapped.map((c) => this._requestResponseMap.get(c));
          if (mapped_2.length === 1)
            r.resolveJson(new Response(JSON.stringify(mapped_2[0]), { status: 200, headers: a }));
          else r.resolveJson(new Response(JSON.stringify(mapped_2), { status: 200, headers: a }));
        } else r.cleanup();
        for (let a of mapped) (this._requestResponseMap.delete(a), this._requestToStreamMapping.delete(a));
      }
    }
  }
}

export { WebStandardStreamableHTTPServerTransport };
