/**
 * @aws-sdk/middleware-websocket/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/middleware-websocket@3.936.0
 * pieces: chunk-ayc8mk37.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_protocol_http } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-ayc8mk37.js:10978-10994 esm-layout
var import_protocol_http = __toESM(require_protocol_http());
//@ chunk-ayc8mk37.js:10994-11046 esm-fingerprint
var isWebSocketRequest = (toSign) => toSign.protocol === "ws:" || toSign.protocol === "wss:";
//@ chunk-ayc8mk37.js:11046-11394 esm-fingerprint
class WebsocketSignatureV4 {
  signer;
  constructor(options) {
    this.signer = options.signer;
  }
  presign(originalRequest, options = {}) {
    return this.signer.presign(originalRequest, options);
  }
  async sign(toSign, options) {
    if (import_protocol_http.HttpRequest.isInstance(toSign) && isWebSocketRequest(toSign))
      return {
        ...(await this.signer.presign(
          {
            ...toSign,
            body: "",
          },
          {
            ...options,
            expiresIn: 60,
            unsignableHeaders: new Set(Object.keys(toSign.headers).filter((header) => header !== "host")),
          },
        )),
        body: toSign.body,
      };
    else return this.signer.sign(toSign, options);
  }
}
//@ chunk-ayc8mk37.js:11394-11622 esm-fingerprint
var resolveWebSocketConfig = (input) => {
  let { signer } = input;
  return Object.assign(input, {
    signer: async (authScheme) => {
      let signerObj = await signer(authScheme);
      if (isFunction(signerObj))
        return new WebsocketSignatureV4({
          signer: signerObj,
        });
      throw Error("Expected WebsocketSignatureV4 signer, please check the client constructor.");
    },
  });
};
var isFunction = (signerObj) => !!signerObj;
export { resolveWebSocketConfig };
