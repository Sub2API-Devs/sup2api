/**
 * eventsource-parser/dist/stream.esm.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: eventsource-parser@3.0.8
 * pieces: chunk-dqgw68pw.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createParser } from "./index.js";

//@ chunk-dqgw68pw.js:228-487 esm-fingerprint
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
