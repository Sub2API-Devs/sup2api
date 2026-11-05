/**
 * @anthropic-ai/sdk/lib/helper-client.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { AnthropicError } from "../core/error.mjs";
import { buildHeaders } from "../internal/headers.mjs";
import { X_STAINLESS_HELPER } from "../internal/stainless-helper-header.mjs";

//@ chunk-vn3g7zt8.js:56294-56759 esm-fingerprint
function copyClientForHelper(client, { authToken, helper }) {
  if (!authToken)
    throw new AnthropicError(
      `copyClientForHelper: expected a non-empty authToken but received ${JSON.stringify(authToken)}`,
    );
  let internal = client;
  let parentDefaults = internal._options.defaultHeaders;
  let parentAuthExtraHeaders = internal._authState?.extraHeaders;
  let inheritedAuthExtraHeaders = parentAuthExtraHeaders
    ? Object.fromEntries(
        Object.entries(parentAuthExtraHeaders).filter(([name]) => {
          let lower = name.toLowerCase();
          return lower !== "authorization" && lower !== "x-api-key";
        }),
      )
    : undefined;
  let defaultHeaders = buildHeaders([
    inheritedAuthExtraHeaders,
    parentDefaults,
    {
      [X_STAINLESS_HELPER]: helper,
    },
  ]);
  return client.withOptions({
    apiKey: null,
    authToken,
    baseURL: client.baseURL,
    credentials: undefined,
    defaultHeaders,
  });
}
export { copyClientForHelper };
