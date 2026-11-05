/**
 * @modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-6gs34xvs.js (3)
 * attribution: esm-fingerprint 3
 */
import { createFetchWithDefaults, headersToObject } from "../../../../../../src/utils/fetchWithDefaults.js";
import { UnauthorizedError, auth, extractWWWAuthenticateParams } from "./auth.js";
import { EventSourceParserStream } from "../../../../../eventsource-parser/dist/stream.esm.js";
import {
  JSONRPCMessageSchema,
  isJSONRPCResultResponse,
  isJSONRPCRequest,
  isInitializedNotification,
} from "../types.js";

//@ chunk-6gs34xvs.js:634-744 esm-fingerprint
var DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS = {
  initialReconnectionDelay: 1000,
  maxReconnectionDelay: 30000,
  reconnectionDelayGrowFactor: 1.5,
  maxRetries: 2,
};
//@ chunk-6gs34xvs.js:744-835 esm-fingerprint
class StreamableHTTPError extends Error {
  constructor(code, message) {
    super(`Streamable HTTP error: ${message}`);
    this.code = code;
  }
}
//@ chunk-6gs34xvs.js:835-7749 esm-fingerprint
class StreamableHTTPClientTransport {
  constructor(url, opts) {
    this._hasCompletedAuthFlow = false;
    this._url = url;
    this._resourceMetadataUrl = undefined;
    this._scope = undefined;
    this._requestInit = opts?.requestInit;
    this._authProvider = opts?.authProvider;
    this._fetch = opts?.fetch;
    this._fetchWithInit = createFetchWithDefaults(opts?.fetch, opts?.requestInit);
    this._sessionId = opts?.sessionId;
    this._reconnectionOptions = opts?.reconnectionOptions ?? DEFAULT_STREAMABLE_HTTP_RECONNECTION_OPTIONS;
  }
  async _authThenStart() {
    if (!this._authProvider) throw new UnauthorizedError("No auth provider");
    let result;
    try {
      result = await auth(this._authProvider, {
        serverUrl: this._url,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit,
      });
    } catch (error) {
      this.onerror?.(error);
      throw error;
    }
    if (result !== "AUTHORIZED") throw new UnauthorizedError();
    return await this._startOrAuthSse({
      resumptionToken: undefined,
    });
  }
  async _commonHeaders() {
    let headers = {};
    if (this._authProvider) {
      let tokens = await this._authProvider.tokens();
      if (tokens) headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    if (this._sessionId) headers["mcp-session-id"] = this._sessionId;
    if (this._protocolVersion) headers["mcp-protocol-version"] = this._protocolVersion;
    let extraHeaders = headersToObject(this._requestInit?.headers);
    return new Headers({
      ...headers,
      ...extraHeaders,
    });
  }
  async _startOrAuthSse(options) {
    let { resumptionToken } = options;
    try {
      let headers = await this._commonHeaders();
      headers.set("Accept", "text/event-stream");
      if (resumptionToken) headers.set("last-event-id", resumptionToken);
      let response = await (this._fetch ?? fetch)(this._url, {
        method: "GET",
        headers,
        signal: this._abortController?.signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401 && this._authProvider) return await this._authThenStart();
        if (response.status === 405) return;
        throw new StreamableHTTPError(response.status, `Failed to open SSE stream: ${response.statusText}`);
      }
      this._handleSseStream(response.body, options, true);
    } catch (error) {
      this.onerror?.(error);
      throw error;
    }
  }
  _getNextReconnectionDelay(attempt) {
    if (this._serverRetryMs !== undefined) return this._serverRetryMs;
    let initialDelay = this._reconnectionOptions.initialReconnectionDelay;
    let growFactor = this._reconnectionOptions.reconnectionDelayGrowFactor;
    let maxDelay = this._reconnectionOptions.maxReconnectionDelay;
    return Math.min(initialDelay * Math.pow(growFactor, attempt), maxDelay);
  }
  _scheduleReconnection(options, attemptCount = 0) {
    let maxRetries = this._reconnectionOptions.maxRetries;
    if (attemptCount >= maxRetries) {
      this.onerror?.(Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`));
      return;
    }
    let delay = this._getNextReconnectionDelay(attemptCount);
    this._reconnectionTimeout = setTimeout(() => {
      this._startOrAuthSse(options).catch((error) => {
        this.onerror?.(
          Error(`Failed to reconnect SSE stream: ${error instanceof Error ? error.message : String(error)}`),
        );
        this._scheduleReconnection(options, attemptCount + 1);
      });
    }, delay);
  }
  _handleSseStream(stream, options, isReconnectable) {
    if (!stream) return;
    let { onresumptiontoken, replayMessageId } = options;
    let lastEventId;
    let hasReceivedReplayEvent = false;
    let hasReplayedMessage = false;
    (async () => {
      try {
        let reader = stream
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(
            new EventSourceParserStream({
              onRetry: (retryMs) => {
                this._serverRetryMs = retryMs;
              },
            }),
          )
          .getReader();
        while (true) {
          let { value: event, done } = await reader.read();
          if (done) break;
          if (event.id) {
            lastEventId = event.id;
            hasReceivedReplayEvent = true;
            onresumptiontoken?.(event.id);
          }
          if (!event.data) continue;
          if (!event.event || event.event === "message")
            try {
              let message = JSONRPCMessageSchema.parse(JSON.parse(event.data));
              if (isJSONRPCResultResponse(message)) {
                hasReplayedMessage = true;
                if (replayMessageId !== undefined) message.id = replayMessageId;
              }
              this.onmessage?.(message);
            } catch (error) {
              this.onerror?.(error);
            }
        }
        if (
          (isReconnectable || hasReceivedReplayEvent) &&
          !hasReplayedMessage &&
          this._abortController &&
          !this._abortController.signal.aborted
        )
          this._scheduleReconnection(
            {
              resumptionToken: lastEventId,
              onresumptiontoken,
              replayMessageId,
            },
            0,
          );
      } catch (error) {
        this.onerror?.(Error(`SSE stream disconnected: ${error}`));
        if (
          (isReconnectable || hasReceivedReplayEvent) &&
          !hasReplayedMessage &&
          this._abortController &&
          !this._abortController.signal.aborted
        )
          try {
            this._scheduleReconnection(
              {
                resumptionToken: lastEventId,
                onresumptiontoken,
                replayMessageId,
              },
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
  async finishAuth(authorizationCode) {
    if (!this._authProvider) throw new UnauthorizedError("No auth provider");
    if (
      (await auth(this._authProvider, {
        serverUrl: this._url,
        authorizationCode,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit,
      })) !== "AUTHORIZED"
    )
      throw new UnauthorizedError("Failed to authorize");
  }
  async close() {
    if (this._reconnectionTimeout) {
      clearTimeout(this._reconnectionTimeout);
      this._reconnectionTimeout = undefined;
    }
    this._abortController?.abort();
    this.onclose?.();
  }
  async send(message, options) {
    try {
      let { resumptionToken, onresumptiontoken } = options || {};
      if (resumptionToken) {
        this._startOrAuthSse({
          resumptionToken,
          replayMessageId: isJSONRPCRequest(message) ? message.id : undefined,
        }).catch((err) => this.onerror?.(err));
        return;
      }
      let headers = await this._commonHeaders();
      headers.set("content-type", "application/json");
      headers.set("accept", "application/json, text/event-stream");
      let init = {
        ...this._requestInit,
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: this._abortController?.signal,
      };
      let response = await (this._fetch ?? fetch)(this._url, init);
      let sessionId = response.headers.get("mcp-session-id");
      if (sessionId) this._sessionId = sessionId;
      if (!response.ok) {
        let text = await response.text().catch(() => null);
        if (response.status === 401 && this._authProvider) {
          if (this._hasCompletedAuthFlow)
            throw new StreamableHTTPError(401, "Server returned 401 after successful authentication");
          let { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
          this._resourceMetadataUrl = resourceMetadataUrl;
          this._scope = scope;
          if (
            (await auth(this._authProvider, {
              serverUrl: this._url,
              resourceMetadataUrl: this._resourceMetadataUrl,
              scope: this._scope,
              fetchFn: this._fetchWithInit,
            })) !== "AUTHORIZED"
          )
            throw new UnauthorizedError();
          this._hasCompletedAuthFlow = true;
          return this.send(message);
        }
        if (response.status === 403 && this._authProvider) {
          let { resourceMetadataUrl, scope, error } = extractWWWAuthenticateParams(response);
          if (error === "insufficient_scope") {
            let wwwAuthHeader = response.headers.get("WWW-Authenticate");
            if (this._lastUpscopingHeader === wwwAuthHeader)
              throw new StreamableHTTPError(403, "Server returned 403 after trying upscoping");
            if (scope) this._scope = scope;
            if (resourceMetadataUrl) this._resourceMetadataUrl = resourceMetadataUrl;
            this._lastUpscopingHeader = wwwAuthHeader ?? undefined;
            if (
              (await auth(this._authProvider, {
                serverUrl: this._url,
                resourceMetadataUrl: this._resourceMetadataUrl,
                scope: this._scope,
                fetchFn: this._fetch,
              })) !== "AUTHORIZED"
            )
              throw new UnauthorizedError();
            return this.send(message);
          }
        }
        throw new StreamableHTTPError(response.status, `Error POSTing to endpoint: ${text}`);
      }
      this._hasCompletedAuthFlow = false;
      this._lastUpscopingHeader = undefined;
      if (response.status === 202) {
        await response.body?.cancel();
        if (isInitializedNotification(message))
          this._startOrAuthSse({
            resumptionToken: undefined,
          }).catch((err) => this.onerror?.(err));
        return;
      }
      let hasRequestMessages =
        (Array.isArray(message) ? message : [message]).filter(
          (msg) => "method" in msg && "id" in msg && msg.id !== undefined,
        ).length > 0;
      let contentType = response.headers.get("content-type");
      if (hasRequestMessages) {
        if (contentType?.includes("text/event-stream"))
          this._handleSseStream(
            response.body,
            {
              onresumptiontoken,
            },
            false,
          );
        else if (contentType?.includes("application/json")) {
          let data = await response.json();
          let responseMessages = Array.isArray(data)
            ? data.map((msg) => JSONRPCMessageSchema.parse(msg))
            : [JSONRPCMessageSchema.parse(data)];
          for (let msg of responseMessages) this.onmessage?.(msg);
        } else {
          await response.body?.cancel();
          throw new StreamableHTTPError(-1, `Unexpected content type: ${contentType}`);
        }
      } else await response.body?.cancel();
    } catch (error) {
      this.onerror?.(error);
      throw error;
    }
  }
  get sessionId() {
    return this._sessionId;
  }
  async terminateSession() {
    if (!this._sessionId) return;
    try {
      let headers = await this._commonHeaders();
      let init = {
        ...this._requestInit,
        method: "DELETE",
        headers,
        signal: this._abortController?.signal,
      };
      let response = await (this._fetch ?? fetch)(this._url, init);
      await response.body?.cancel();
      if (!response.ok && response.status !== 405)
        throw new StreamableHTTPError(response.status, `Failed to terminate session: ${response.statusText}`);
      this._sessionId = undefined;
    } catch (error) {
      this.onerror?.(error);
      throw error;
    }
  }
  setProtocolVersion(version) {
    this._protocolVersion = version;
  }
  get protocolVersion() {
    return this._protocolVersion;
  }
  async resumeStream(lastEventId, options) {
    await this._startOrAuthSse({
      resumptionToken: lastEventId,
      onresumptiontoken: options?.onresumptiontoken,
    });
  }
}
export { StreamableHTTPError, StreamableHTTPClientTransport };
