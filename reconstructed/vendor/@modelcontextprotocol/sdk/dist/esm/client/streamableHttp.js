/**
 * @modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-pjt9hgpa.js (3)
 * attribution: esm-fingerprint 3
 */
import { createFetchWithDefaults, headersToObject } from "../../../../../../src/utils/fetchWithDefaults.js";
import { AM, Aue, NHe } from "./auth.js";
import { gcn } from "../../../../../eventsource-parser/dist/stream.esm.js";
import {
  JSONRPCMessageSchema,
  isJSONRPCResultResponse,
  isJSONRPCRequest,
  isInitializedNotification,
} from "../types.js";

//@ chunk-pjt9hgpa.js:634-744 esm-fingerprint
var m = {
  initialReconnectionDelay: 1000,
  maxReconnectionDelay: 30000,
  reconnectionDelayGrowFactor: 1.5,
  maxRetries: 2,
};
//@ chunk-pjt9hgpa.js:744-835 esm-fingerprint
class Tue extends Error {
  constructor(e, t) {
    super(`Streamable HTTP error: ${t}`);
    this.code = e;
  }
}
//@ chunk-pjt9hgpa.js:835-7749 esm-fingerprint
class zYn {
  constructor(e, t) {
    ((this._hasCompletedAuthFlow = !1),
      (this._url = e),
      (this._resourceMetadataUrl = void 0),
      (this._scope = void 0),
      (this._requestInit = t?.requestInit),
      (this._authProvider = t?.authProvider),
      (this._fetch = t?.fetch),
      (this._fetchWithInit = createFetchWithDefaults(t?.fetch, t?.requestInit)),
      (this._sessionId = t?.sessionId),
      (this._reconnectionOptions = t?.reconnectionOptions ?? m));
  }
  async _authThenStart() {
    if (!this._authProvider) throw new AM("No auth provider");
    let e;
    try {
      e = await Aue(this._authProvider, {
        serverUrl: this._url,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit,
      });
    } catch (error) {
      throw (this.onerror?.(error), error);
    }
    if (e !== "AUTHORIZED") throw new AM();
    return await this._startOrAuthSse({ resumptionToken: void 0 });
  }
  async _commonHeaders() {
    let e = {};
    if (this._authProvider) {
      let tokens = await this._authProvider.tokens();
      if (tokens) e.Authorization = `Bearer ${tokens.access_token}`;
    }
    if (this._sessionId) e["mcp-session-id"] = this._sessionId;
    if (this._protocolVersion) e["mcp-protocol-version"] = this._protocolVersion;
    let t = headersToObject(this._requestInit?.headers);
    return new Headers({ ...e, ...t });
  }
  async _startOrAuthSse(e) {
    let { resumptionToken: resumptionToken } = e;
    try {
      let _commonHeaders = await this._commonHeaders();
      if ((_commonHeaders.set("Accept", "text/event-stream"), resumptionToken))
        _commonHeaders.set("last-event-id", resumptionToken);
      let s = await (this._fetch ?? fetch)(this._url, {
        method: "GET",
        headers: _commonHeaders,
        signal: this._abortController?.signal,
      });
      if (!s.ok) {
        if ((await s.body?.cancel(), s.status === 401 && this._authProvider))
          return await this._authThenStart();
        if (s.status === 405) return;
        throw new Tue(s.status, `Failed to open SSE stream: ${s.statusText}`);
      }
      this._handleSseStream(s.body, e, !0);
    } catch (error) {
      throw (this.onerror?.(error), error);
    }
  }
  _getNextReconnectionDelay(e) {
    if (this._serverRetryMs !== void 0) return this._serverRetryMs;
    let initialReconnectionDelay = this._reconnectionOptions.initialReconnectionDelay,
      reconnectionDelayGrowFactor = this._reconnectionOptions.reconnectionDelayGrowFactor,
      maxReconnectionDelay = this._reconnectionOptions.maxReconnectionDelay;
    return Math.min(
      initialReconnectionDelay * Math.pow(reconnectionDelayGrowFactor, e),
      maxReconnectionDelay,
    );
  }
  _scheduleReconnection(e, t = 0) {
    let maxRetries = this._reconnectionOptions.maxRetries;
    if (t >= maxRetries) {
      this.onerror?.(Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`));
      return;
    }
    let _getNextReconnectionDelay = this._getNextReconnectionDelay(t);
    this._reconnectionTimeout = setTimeout(() => {
      this._startOrAuthSse(e).catch((a) => {
        (this.onerror?.(
          Error(`Failed to reconnect SSE stream: ${a instanceof Error ? a.message : String(a)}`),
        ),
          this._scheduleReconnection(e, t + 1));
      });
    }, _getNextReconnectionDelay);
  }
  _handleSseStream(e, t, r) {
    if (!e) return;
    let { onresumptiontoken: onresumptiontoken, replayMessageId: replayMessageId } = t,
      d,
      n = !1,
      u = !1;
    (async () => {
      try {
        let reader = e
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(
            new gcn({
              onRetry: (o) => {
                this._serverRetryMs = o;
              },
            }),
          )
          .getReader();
        while (!0) {
          let { value: o, done: c } = await reader.read();
          if (c) break;
          if (o.id) ((d = o.id), (n = !0), onresumptiontoken?.(o.id));
          if (!o.data) continue;
          if (!o.event || o.event === "message")
            try {
              let parse = JSONRPCMessageSchema.parse(JSON.parse(o.data));
              if (isJSONRPCResultResponse(parse)) {
                if (((u = !0), replayMessageId !== void 0)) parse.id = replayMessageId;
              }
              this.onmessage?.(parse);
            } catch (error) {
              this.onerror?.(error);
            }
        }
        if ((r || n) && !u && this._abortController && !this._abortController.signal.aborted)
          this._scheduleReconnection(
            { resumptionToken: d, onresumptiontoken: onresumptiontoken, replayMessageId: replayMessageId },
            0,
          );
      } catch (error) {
        if (
          (this.onerror?.(Error(`SSE stream disconnected: ${error}`)),
          (r || n) && !u && this._abortController && !this._abortController.signal.aborted)
        )
          try {
            this._scheduleReconnection(
              { resumptionToken: d, onresumptiontoken: onresumptiontoken, replayMessageId: replayMessageId },
              0,
            );
          } catch (error) {
            this.onerror?.(
              Error(`Failed to reconnect: ${error instanceof Error ? error.message : String(error)}`),
            );
          }
      }
    })();
  }
  async start() {
    if (this._abortController)
      throw Error(
        "StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    this._abortController = new AbortController();
  }
  async finishAuth(e) {
    if (!this._authProvider) throw new AM("No auth provider");
    if (
      (await Aue(this._authProvider, {
        serverUrl: this._url,
        authorizationCode: e,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit,
      })) !== "AUTHORIZED"
    )
      throw new AM("Failed to authorize");
  }
  async close() {
    if (this._reconnectionTimeout)
      (clearTimeout(this._reconnectionTimeout), (this._reconnectionTimeout = void 0));
    (this._abortController?.abort(), this.onclose?.());
  }
  async send(e, t) {
    try {
      let { resumptionToken: resumptionToken, onresumptiontoken: onresumptiontoken } = t || {};
      if (resumptionToken) {
        this._startOrAuthSse({
          resumptionToken: resumptionToken,
          replayMessageId: isJSONRPCRequest(e) ? e.id : void 0,
        }).catch((i) => this.onerror?.(i));
        return;
      }
      let _commonHeaders = await this._commonHeaders();
      (_commonHeaders.set("content-type", "application/json"),
        _commonHeaders.set("accept", "application/json, text/event-stream"));
      let d = {
          ...this._requestInit,
          method: "POST",
          headers: _commonHeaders,
          body: JSON.stringify(e),
          signal: this._abortController?.signal,
        },
        n = await (this._fetch ?? fetch)(this._url, d),
        u = n.headers.get("mcp-session-id");
      if (u) this._sessionId = u;
      if (!n.ok) {
        let i = await n.text().catch(() => null);
        if (n.status === 401 && this._authProvider) {
          if (this._hasCompletedAuthFlow)
            throw new Tue(401, "Server returned 401 after successful authentication");
          let { resourceMetadataUrl: resourceMetadataUrl, scope: scope } = NHe(n);
          if (
            ((this._resourceMetadataUrl = resourceMetadataUrl),
            (this._scope = scope),
            (await Aue(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              scope: this._scope,
              fetchFn: this._fetchWithInit,
            })) !== "AUTHORIZED")
          )
            throw new AM();
          return ((this._hasCompletedAuthFlow = !0), this.send(e));
        }
        if (n.status === 403 && this._authProvider) {
          let { resourceMetadataUrl: resourceMetadataUrl, scope: scope, error: error } = NHe(n);
          if (error === "insufficient_scope") {
            let f = n.headers.get("WWW-Authenticate");
            if (this._lastUpscopingHeader === f)
              throw new Tue(403, "Server returned 403 after trying upscoping");
            if (scope) this._scope = scope;
            if (resourceMetadataUrl) this._resourceMetadataUrl = resourceMetadataUrl;
            if (
              ((this._lastUpscopingHeader = f ?? void 0),
              (await Aue(this._authProvider, {
                serverUrl: this._url,
                resourceMetadataUrl: this._resourceMetadataUrl,
                scope: this._scope,
                fetchFn: this._fetch,
              })) !== "AUTHORIZED")
            )
              throw new AM();
            return this.send(e);
          }
        }
        throw new Tue(n.status, `Error POSTing to endpoint: ${i}`);
      }
      if (((this._hasCompletedAuthFlow = !1), (this._lastUpscopingHeader = void 0), n.status === 202)) {
        if ((await n.body?.cancel(), isInitializedNotification(e)))
          this._startOrAuthSse({ resumptionToken: void 0 }).catch((i) => this.onerror?.(i));
        return;
      }
      let l =
          (Array.isArray(e) ? e : [e]).filter((i) => "method" in i && "id" in i && i.id !== void 0).length >
          0,
        _ = n.headers.get("content-type");
      if (l)
        if (_?.includes("text/event-stream"))
          this._handleSseStream(n.body, { onresumptiontoken: onresumptiontoken }, !1);
        else if (_?.includes("application/json")) {
          let body = await n.json(),
            o = Array.isArray(body)
              ? body.map((c) => JSONRPCMessageSchema.parse(c))
              : [JSONRPCMessageSchema.parse(body)];
          for (let c of o) this.onmessage?.(c);
        } else throw (await n.body?.cancel(), new Tue(-1, `Unexpected content type: ${_}`));
      else await n.body?.cancel();
    } catch (error) {
      throw (this.onerror?.(error), error);
    }
  }
  get sessionId() {
    return this._sessionId;
  }
  async terminateSession() {
    if (!this._sessionId) return;
    try {
      let _commonHeaders = await this._commonHeaders(),
        t = {
          ...this._requestInit,
          method: "DELETE",
          headers: _commonHeaders,
          signal: this._abortController?.signal,
        },
        r = await (this._fetch ?? fetch)(this._url, t);
      if ((await r.body?.cancel(), !r.ok && r.status !== 405))
        throw new Tue(r.status, `Failed to terminate session: ${r.statusText}`);
      this._sessionId = void 0;
    } catch (error) {
      throw (this.onerror?.(error), error);
    }
  }
  setProtocolVersion(e) {
    this._protocolVersion = e;
  }
  get protocolVersion() {
    return this._protocolVersion;
  }
  async resumeStream(e, t) {
    await this._startOrAuthSse({ resumptionToken: e, onresumptiontoken: t?.onresumptiontoken });
  }
}

export { Tue, zYn };
