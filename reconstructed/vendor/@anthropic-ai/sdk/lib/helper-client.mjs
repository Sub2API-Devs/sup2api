/**
 * @anthropic-ai/sdk/lib/helper-client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { pr } from "../core/error.mjs";
import { T } from "../internal/headers.mjs";
import { X_STAINLESS_HELPER } from "../internal/stainless-helper-header.mjs";

//@ chunk-hwmsct5x.js:55923-56388 esm-fingerprint
function ps(e, { authToken: authToken, helper: helper }) {
  if (!authToken)
    throw new pr(
      `copyClientForHelper: expected a non-empty authToken but received ${JSON.stringify(authToken)}`,
    );
  let s = e,
    defaultHeaders = s._options.defaultHeaders,
    y = s._authState?.extraHeaders,
    w = y
      ? Object.fromEntries(
          Object.entries(y).filter(([E]) => {
            let lower = E.toLowerCase();
            return lower !== "authorization" && lower !== "x-api-key";
          }),
        )
      : void 0,
    S = T([w, defaultHeaders, { [X_STAINLESS_HELPER]: helper }]);
  return e.withOptions({
    apiKey: null,
    authToken: authToken,
    baseURL: e.baseURL,
    credentials: void 0,
    defaultHeaders: S,
  });
}

export { ps };
