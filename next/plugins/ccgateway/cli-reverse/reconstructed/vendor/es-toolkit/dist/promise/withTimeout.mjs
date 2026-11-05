/**
 * es-toolkit/dist/promise/withTimeout.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: es-toolkit@1.53.1
 * pieces: chunk-nvm0wye1.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createAbortController } from "../../../../src/utils/abortController.js";
import { sleep } from "../../../../src/utils/sleep.js";
import { RESULT_NOTE_MAX_CHARS } from "../../../../src/remote/tools/serve/resultShaping.js";

//@ chunk-nvm0wye1.js:29778-30071 esm-fingerprint
async function withTimeout(signal, signal_2) {
  let abortController = createAbortController();
  let promise = new Promise((resolve) => {
    let onAbort = () => {
      sleep(RESULT_NOTE_MAX_CHARS, abortController.signal).then(() => resolve(undefined));
    };
    if (signal_2.aborted) onAbort();
    else {
      signal_2.addEventListener("abort", onAbort, {
        once: true,
      });
      abortController.signal.addEventListener("abort", () => signal_2.removeEventListener("abort", onAbort));
    }
  });
  try {
    return await Promise.race([signal, promise]);
  } finally {
    abortController.abort();
  }
}
export { withTimeout };
