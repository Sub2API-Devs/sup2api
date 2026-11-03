/**
 * @modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-k26nnqnx.js (1)
 * attribution: esm-fingerprint 1
 */
import { WebStandardStreamableHTTPServerTransport } from "./webStandardStreamableHttp.js";
import { G } from "../../../../../@hono/node-server/dist/index.mjs";

//@ chunk-k26nnqnx.js:24883-26047 esm-fingerprint
class M {
  constructor(e = {}) {
    ((this._requestContext = new WeakMap()),
      (this._webStandardTransport = new WebStandardStreamableHTTPServerTransport(e)),
      (this._requestListener = G(
        async (r) => {
          let n = this._requestContext.get(r);
          return this._webStandardTransport.handleRequest(r, {
            authInfo: n?.authInfo,
            parsedBody: n?.parsedBody,
          });
        },
        { overrideGlobalObjects: !1 },
      )));
  }
  get sessionId() {
    return this._webStandardTransport.sessionId;
  }
  set onclose(e) {
    this._webStandardTransport.onclose = e;
  }
  get onclose() {
    return this._webStandardTransport.onclose;
  }
  set onerror(e) {
    this._webStandardTransport.onerror = e;
  }
  get onerror() {
    return this._webStandardTransport.onerror;
  }
  set onmessage(e) {
    this._webStandardTransport.onmessage = e;
  }
  get onmessage() {
    return this._webStandardTransport.onmessage;
  }
  async start() {
    return this._webStandardTransport.start();
  }
  async close() {
    return this._webStandardTransport.close();
  }
  async send(e, r) {
    return this._webStandardTransport.send(e, r);
  }
  async handleRequest(e, r, n) {
    let auth = e.auth;
    await G(async (a) => this._webStandardTransport.handleRequest(a, { authInfo: auth, parsedBody: n }), {
      overrideGlobalObjects: !1,
    })(e, r);
  }
  closeSSEStream(e) {
    this._webStandardTransport.closeSSEStream(e);
  }
  closeStandaloneSSEStream() {
    this._webStandardTransport.closeStandaloneSSEStream();
  }
}

export { M };
