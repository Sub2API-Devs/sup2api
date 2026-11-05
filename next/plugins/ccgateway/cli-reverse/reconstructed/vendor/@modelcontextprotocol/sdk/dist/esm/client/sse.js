/**
 * @modelcontextprotocol/sdk/dist/esm/client/sse.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-h44h5gdv.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createFetchWithDefaults, headersToObject } from "../../../../../../src/utils/fetchWithDefaults.js";
import { UnauthorizedError, auth, extractWWWAuthenticateParams } from "./auth.js";
import { EventSource } from "../../../../../eventsource/dist/index.js";
import { JSONRPCMessageSchema } from "../types.js";

//@ chunk-h44h5gdv.js:29735-29828 esm-fingerprint
class SseError extends Error {
  constructor(code, message, event) {
    super(`SSE error: ${message}`);
    this.code = code;
    this.event = event;
  }
}
//@ chunk-h44h5gdv.js:29828-33240 esm-fingerprint
class SSEClientTransport {
  constructor(url, opts) {
    this._url = url;
    this._resourceMetadataUrl = undefined;
    this._scope = undefined;
    this._eventSourceInit = opts?.eventSourceInit;
    this._requestInit = opts?.requestInit;
    this._authProvider = opts?.authProvider;
    this._fetch = opts?.fetch;
    this._fetchWithInit = createFetchWithDefaults(opts?.fetch, opts?.requestInit);
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
    return await this._startOrAuth();
  }
  async _commonHeaders() {
    let headers = {};
    if (this._authProvider) {
      let tokens = await this._authProvider.tokens();
      if (tokens) headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    if (this._protocolVersion) headers["mcp-protocol-version"] = this._protocolVersion;
    let extraHeaders = headersToObject(this._requestInit?.headers);
    return new Headers({
      ...headers,
      ...extraHeaders,
    });
  }
  _startOrAuth() {
    let fetchImpl = this?._eventSourceInit?.fetch ?? this._fetch ?? fetch;
    return new Promise((resolve, reject) => {
      this._eventSource = new EventSource(this._url.href, {
        ...this._eventSourceInit,
        fetch: async (url, init) => {
          let headers = await this._commonHeaders();
          headers.set("Accept", "text/event-stream");
          let response = await fetchImpl(url, {
            ...init,
            headers,
          });
          if (response.status === 401 && response.headers.has("www-authenticate")) {
            let { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
            this._resourceMetadataUrl = resourceMetadataUrl;
            this._scope = scope;
          }
          return response;
        },
      });
      this._abortController = new AbortController();
      this._eventSource.onerror = (event) => {
        if (event.code === 401 && this._authProvider) {
          this._authThenStart().then(resolve, reject);
          return;
        }
        let error = new SseError(event.code, event.message, event);
        reject(error);
        this.onerror?.(error);
      };
      this._eventSource.onopen = () => {};
      this._eventSource.addEventListener("endpoint", (event) => {
        let messageEvent = event;
        try {
          this._endpoint = new URL(messageEvent.data, this._url);
          if (this._endpoint.origin !== this._url.origin)
            throw Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`);
        } catch (error) {
          reject(error);
          this.onerror?.(error);
          this.close();
          return;
        }
        resolve();
      });
      this._eventSource.onmessage = (event) => {
        let messageEvent = event;
        let message;
        try {
          message = JSONRPCMessageSchema.parse(JSON.parse(messageEvent.data));
        } catch (error) {
          this.onerror?.(error);
          return;
        }
        this.onmessage?.(message);
      };
    });
  }
  async start() {
    if (this._eventSource)
      throw Error(
        "SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    return await this._startOrAuth();
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
    this._abortController?.abort();
    this._eventSource?.close();
    this.onclose?.();
  }
  async send(message) {
    if (!this._endpoint) throw Error("Not connected");
    try {
      let headers = await this._commonHeaders();
      headers.set("content-type", "application/json");
      let init = {
        ...this._requestInit,
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: this._abortController?.signal,
      };
      let response = await (this._fetch ?? fetch)(this._endpoint, init);
      if (!response.ok) {
        let text = await response.text().catch(() => null);
        if (response.status === 401 && this._authProvider) {
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
          return this.send(message);
        }
        throw Error(`Error POSTing to endpoint (HTTP ${response.status}): ${text}`);
      }
      await response.body?.cancel();
    } catch (error) {
      this.onerror?.(error);
      throw error;
    }
  }
  setProtocolVersion(version) {
    this._protocolVersion = version;
  }
}
export { SSEClientTransport, SseError };
