/**
 * eventsource-parser/dist/stream.esm.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: eventsource-parser@3.0.8
 * pieces: chunk-j4cx2j3j.js (1)
 * attribution: esm-fingerprint 1
 */
import { wTt } from "./index.js";

//@ chunk-j4cx2j3j.js:228-487 esm-fingerprint
class gcn extends TransformStream {
  constructor({ onError: t, onRetry: a, onComment: o } = {}) {
    let s;
    super({
      start(e) {
        s = wTt({
          onEvent: (r) => {
            e.enqueue(r);
          },
          onError(r) {
            t === "terminate" ? e.error(r) : typeof t == "function" && t(r);
          },
          onRetry: a,
          onComment: o,
        });
      },
      transform(e) {
        s.feed(e);
      },
    });
  }
}

export { gcn };
