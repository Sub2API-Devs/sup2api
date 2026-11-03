/**
 * @anthropic-ai/sdk/resources/completions.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../core/resource.mjs";
import { buildHeaders } from "../internal/headers.mjs";

//@ chunk-hwmsct5x.js:145529-145854 esm-fingerprint
class Completions extends APIResource {
  create(params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post("/v1/complete", {
      body,
      timeout: this._client._options.timeout ?? 600000,
      ...options,
      headers: buildHeaders([
        {
          ...(betas?.toString() != null
            ? {
                "anthropic-beta": betas?.toString(),
              }
            : undefined),
          ...(workspace_id != null
            ? {
                "anthropic-workspace-id": workspace_id,
              }
            : undefined),
        },
        options?.headers,
      ]),
      stream: params.stream ?? false,
    });
  }
}
export { Completions };
