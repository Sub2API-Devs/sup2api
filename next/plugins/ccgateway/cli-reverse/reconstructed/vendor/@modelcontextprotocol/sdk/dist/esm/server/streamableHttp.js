/**
 * @modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-cacgqezg.js (1)
 * attribution: esm-fingerprint 1
 */
import { WebStandardStreamableHTTPServerTransport } from "./webStandardStreamableHttp.js";
import { getRequestListener } from "../../../../../@hono/node-server/dist/index.mjs";

//@ chunk-cacgqezg.js:26208-27372 esm-fingerprint
class StreamableHTTPServerTransport {
  constructor(options = {}) {
    this._requestContext = new WeakMap();
    this._webStandardTransport = new WebStandardStreamableHTTPServerTransport(options);
    this._requestListener = getRequestListener(
      async (webRequest) => {
        let context = this._requestContext.get(webRequest);
        return this._webStandardTransport.handleRequest(webRequest, {
          authInfo: context?.authInfo,
          parsedBody: context?.parsedBody,
        });
      },
      {
        overrideGlobalObjects: false,
      },
    );
  }
  get sessionId() {
    return this._webStandardTransport.sessionId;
  }
  set onclose(handler) {
    this._webStandardTransport.onclose = handler;
  }
  get onclose() {
    return this._webStandardTransport.onclose;
  }
  set onerror(handler) {
    this._webStandardTransport.onerror = handler;
  }
  get onerror() {
    return this._webStandardTransport.onerror;
  }
  set onmessage(handler) {
    this._webStandardTransport.onmessage = handler;
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
  async send(message, options) {
    return this._webStandardTransport.send(message, options);
  }
  async handleRequest(req, res, parsedBody) {
    let authInfo = req.auth;
    await getRequestListener(
      async (webRequest) =>
        this._webStandardTransport.handleRequest(webRequest, {
          authInfo,
          parsedBody,
        }),
      {
        overrideGlobalObjects: false,
      },
    )(req, res);
  }
  closeSSEStream(requestId) {
    this._webStandardTransport.closeSSEStream(requestId);
  }
  closeStandaloneSSEStream() {
    this._webStandardTransport.closeStandaloneSSEStream();
  }
}
export { StreamableHTTPServerTransport };
