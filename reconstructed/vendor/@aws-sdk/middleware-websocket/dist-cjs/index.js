/**
 * @aws-sdk/middleware-websocket/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-websocket@3.936.0
 * pieces: chunk-3cddmtk7.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:10978-10994 esm-layout
var me = Re(Kg());
//@ chunk-3cddmtk7.js:10994-11046 esm-fingerprint
var pe = (e) => e.protocol === "ws:" || e.protocol === "wss:";
//@ chunk-3cddmtk7.js:11046-11394 esm-fingerprint
class Y {
  signer;
  constructor(e) {
    this.signer = e.signer;
  }
  presign(e, t = {}) {
    return this.signer.presign(e, t);
  }
  async sign(e, t) {
    if (me.HttpRequest.isInstance(e) && pe(e))
      return {
        ...(await this.signer.presign(
          { ...e, body: "" },
          {
            ...t,
            expiresIn: 60,
            unsignableHeaders: new Set(Object.keys(e.headers).filter((r) => r !== "host")),
          },
        )),
        body: e.body,
      };
    else return this.signer.sign(e, t);
  }
}
//@ chunk-3cddmtk7.js:11394-11622 esm-fingerprint
var xe = (e) => {
    let { signer: signer } = e;
    return Object.assign(e, {
      signer: async (o) => {
        let r = await signer(o);
        if (wt(r)) return new Y({ signer: r });
        throw Error("Expected WebsocketSignatureV4 signer, please check the client constructor.");
      },
    });
  },
  wt = (e) => !!e;

export { xe };
