/**
 * @modelcontextprotocol/sdk/dist/esm/client/sse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-z1n5m6nf.js (2)
 * attribution: esm-fingerprint 2
 */
import { createFetchWithDefaults, headersToObject } from "../../../../../../src/utils/fetchWithDefaults.js";
import { AM, Aue, NHe } from "./auth.js";
import { hZe } from "../../../../../eventsource/dist/index.js";
import { JSONRPCMessageSchema } from "../types.js";

//@ chunk-z1n5m6nf.js:28313-28406 esm-fingerprint
class Mt extends Error {
  constructor(e, r, n) {
    super(`SSE error: ${r}`);
    ((this.code = e), (this.event = n));
  }
}
//@ chunk-z1n5m6nf.js:28406-31818 esm-fingerprint
class _t {
  constructor(e, r) {
    ((this._url = e),
      (this._resourceMetadataUrl = void 0),
      (this._scope = void 0),
      (this._eventSourceInit = r?.eventSourceInit),
      (this._requestInit = r?.requestInit),
      (this._authProvider = r?.authProvider),
      (this._fetch = r?.fetch),
      (this._fetchWithInit = createFetchWithDefaults(r?.fetch, r?.requestInit)));
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
    return await this._startOrAuth();
  }
  async _commonHeaders() {
    let e = {};
    if (this._authProvider) {
      let tokens = await this._authProvider.tokens();
      if (tokens) e.Authorization = `Bearer ${tokens.access_token}`;
    }
    if (this._protocolVersion) e["mcp-protocol-version"] = this._protocolVersion;
    let r = headersToObject(this._requestInit?.headers);
    return new Headers({ ...e, ...r });
  }
  _startOrAuth() {
    let e = this?._eventSourceInit?.fetch ?? this._fetch ?? fetch;
    return new Promise((r, n) => {
      ((this._eventSource = new hZe(this._url.href, {
        ...this._eventSourceInit,
        fetch: async (s, h) => {
          let _commonHeaders = await this._commonHeaders();
          _commonHeaders.set("Accept", "text/event-stream");
          let S = await e(s, { ...h, headers: _commonHeaders });
          if (S.status === 401 && S.headers.has("www-authenticate")) {
            let { resourceMetadataUrl: resourceMetadataUrl, scope: scope } = NHe(S);
            ((this._resourceMetadataUrl = resourceMetadataUrl), (this._scope = scope));
          }
          return S;
        },
      })),
        (this._abortController = new AbortController()),
        (this._eventSource.onerror = (s) => {
          if (s.code === 401 && this._authProvider) {
            this._authThenStart().then(r, n);
            return;
          }
          let h = new Mt(s.code, s.message, s);
          (n(h), this.onerror?.(h));
        }),
        (this._eventSource.onopen = () => {}),
        this._eventSource.addEventListener("endpoint", (s) => {
          let h = s;
          try {
            if (((this._endpoint = new URL(h.data, this._url)), this._endpoint.origin !== this._url.origin))
              throw Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`);
          } catch (error) {
            (n(error), this.onerror?.(error), this.close());
            return;
          }
          r();
        }),
        (this._eventSource.onmessage = (s) => {
          let h = s,
            y;
          try {
            y = JSONRPCMessageSchema.parse(JSON.parse(h.data));
          } catch (error) {
            this.onerror?.(error);
            return;
          }
          this.onmessage?.(y);
        }));
    });
  }
  async start() {
    if (this._eventSource)
      throw Error(
        "SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    return await this._startOrAuth();
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
    (this._abortController?.abort(), this._eventSource?.close(), this.onclose?.());
  }
  async send(e) {
    if (!this._endpoint) throw Error("Not connected");
    try {
      let _commonHeaders = await this._commonHeaders();
      _commonHeaders.set("content-type", "application/json");
      let n = {
          ...this._requestInit,
          method: "POST",
          headers: _commonHeaders,
          body: JSON.stringify(e),
          signal: this._abortController?.signal,
        },
        s = await (this._fetch ?? fetch)(this._endpoint, n);
      if (!s.ok) {
        let h = await s.text().catch(() => null);
        if (s.status === 401 && this._authProvider) {
          let { resourceMetadataUrl: resourceMetadataUrl, scope: scope } = NHe(s);
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
          return this.send(e);
        }
        throw Error(`Error POSTing to endpoint (HTTP ${s.status}): ${h}`);
      }
      await s.body?.cancel();
    } catch (error) {
      throw (this.onerror?.(error), error);
    }
  }
  setProtocolVersion(e) {
    this._protocolVersion = e;
  }
}

export { _t, Mt };
