/**
 * eventsource-parser/dist/stream.esm.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: eventsource-parser@3.0.8
 * pieces: chunk-j4cx2j3j.js (1)
 * attribution: esm-fingerprint 1
 */
import { createParser } from "./index.js";

//@ chunk-j4cx2j3j.js:228-487 esm-fingerprint
class EventSourceParserStream extends TransformStream {
  constructor({ onError, onRetry, onComment } = {}) {
    let parser;
    super({
      start(controller) {
        parser = createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error) {
            if (onError === "terminate") controller.error(error);
            else if (typeof onError == "function") onError(error);
          },
          onRetry,
          onComment,
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      },
    });
  }
}
export { EventSourceParserStream };
