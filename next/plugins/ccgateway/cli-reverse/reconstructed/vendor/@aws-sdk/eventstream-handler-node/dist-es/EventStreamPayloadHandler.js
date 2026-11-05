/**
 * @aws-sdk/eventstream-handler-node/dist-es/EventStreamPayloadHandler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/eventstream-handler-node@3.936.0
 * pieces: chunk-ayc8mk37.js (1)
 * attribution: esm-fingerprint 1
 */
import { Readable, PassThrough, pipeline } from "stream";
import { EventStreamCodec } from "../../../@smithy/eventstream-codec/dist-es/EventStreamCodec.js";
import { EventSigningStream } from "./EventSigningStream.js";

//@ chunk-ayc8mk37.js:19174-19948 esm-fingerprint
class EventStreamPayloadHandler {
  messageSigner;
  eventStreamCodec;
  systemClockOffsetProvider;
  constructor(options) {
    this.messageSigner = options.messageSigner;
    this.eventStreamCodec = new EventStreamCodec(options.utf8Encoder, options.utf8Decoder);
    this.systemClockOffsetProvider = async () => options.systemClockOffset ?? 0;
  }
  async handle(next, args, context = {}) {
    let request = args.request;
    let { body: payload, query } = request;
    if (!(payload instanceof Readable)) throw Error("Eventstream payload must be a Readable stream.");
    let payloadStream = payload;
    request.body = new PassThrough({
      objectMode: true,
    });
    let priorSignature =
      request.headers?.authorization?.match(/Signature=([\w]+)$/)?.[1] ?? query?.["X-Amz-Signature"] ?? "";
    let signingStream = new EventSigningStream({
      priorSignature,
      eventStreamCodec: this.eventStreamCodec,
      messageSigner: await this.messageSigner(),
      systemClockOffsetProvider: this.systemClockOffsetProvider,
    });
    pipeline(payloadStream, signingStream, request.body, (err) => {
      if (err) throw err;
    });
    let result;
    try {
      result = await next(args);
    } catch (e) {
      request.body.end();
      throw e;
    }
    return result;
  }
}
export { EventStreamPayloadHandler };
