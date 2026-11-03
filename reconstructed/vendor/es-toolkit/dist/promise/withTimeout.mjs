/**
 * es-toolkit/dist/promise/withTimeout.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: es-toolkit@1.53.1
 * pieces: chunk-ad2e1aj6.js (1)
 * attribution: esm-fingerprint 1
 */
import { createAbortController } from "../../../../src/utils/abortController.js";
import { sleep } from "../../../../src/utils/sleep.js";
import { Mr } from "../../../../src/remote/tools/serve/resultShaping.js";

//@ chunk-ad2e1aj6.js:29436-29729 esm-fingerprint
async function so(e, n) {
  let s = createAbortController(),
    promise = new Promise((r) => {
      let i = () => {
        sleep(Mr, s.signal).then(() => r(void 0));
      };
      if (n.aborted) i();
      else
        (n.addEventListener("abort", i, { once: !0 }),
          s.signal.addEventListener("abort", () => n.removeEventListener("abort", i)));
    });
  try {
    return await Promise.race([e, promise]);
  } finally {
    s.abort();
  }
}

export { so };
