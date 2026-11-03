/**
 * es-toolkit/dist/promise/withTimeout.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: es-toolkit@1.53.1
 * pieces: chunk-ad2e1aj6.js (1)
 * attribution: esm-fingerprint 1
 */
import { createAbortController } from "../../../../src/utils/abortController.js";
import { sleep } from "../../../../src/utils/sleep.js";
import { RESULT_NOTE_MAX_CHARS } from "../../../../src/remote/tools/serve/resultShaping.js";

//@ chunk-ad2e1aj6.js:29436-29729 esm-fingerprint
async function so(e, signal) {
  let abortController = createAbortController();
  let promise = new Promise((resolve) => {
    let i = () => {
      sleep(RESULT_NOTE_MAX_CHARS, abortController.signal).then(() => resolve(undefined));
    };
    if (signal.aborted) i();
    else {
      signal.addEventListener("abort", i, {
        once: true,
      });
      abortController.signal.addEventListener("abort", () => signal.removeEventListener("abort", i));
    }
  });
  try {
    return await Promise.race([e, promise]);
  } finally {
    abortController.abort();
  }
}
export { so };
