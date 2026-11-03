/**
 * @aws-sdk/eventstream-handler-node/dist-es/EventStreamPayloadHandler.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/eventstream-handler-node@3.936.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-fingerprint 1
 */
import { Readable, Readable as Readable_2, PassThrough, pipeline } from "stream";
import { E_2 } from "../../../@smithy/eventstream-codec/dist-es/EventStreamCodec.js";
import { te } from "./EventSigningStream.js";

//@ chunk-3cddmtk7.js:19174-19948 esm-fingerprint
class oe {
  messageSigner;
  eventStreamCodec;
  systemClockOffsetProvider;
  constructor(e) {
    ((this.messageSigner = e.messageSigner),
      (this.eventStreamCodec = new E_2(e.utf8Encoder, e.utf8Decoder)),
      (this.systemClockOffsetProvider = async () => e.systemClockOffset ?? 0));
  }
  async handle(e, t, o = {}) {
    let request = t.request,
      { body: body, query: query } = request;
    if (!(body instanceof Readable)) throw Error("Eventstream payload must be a Readable stream.");
    let a = body;
    request.body = new PassThrough({ objectMode: !0 });
    let c =
        request.headers?.authorization?.match(/Signature=([\w]+)$/)?.[1] ?? query?.["X-Amz-Signature"] ?? "",
      p = new te({
        priorSignature: c,
        eventStreamCodec: this.eventStreamCodec,
        messageSigner: await this.messageSigner(),
        systemClockOffsetProvider: this.systemClockOffsetProvider,
      });
    pipeline(a, p, request.body, (_) => {
      if (_) throw _;
    });
    let u;
    try {
      u = await e(t);
    } catch (error) {
      throw (request.body.end(), error);
    }
    return u;
  }
}

export { oe };
