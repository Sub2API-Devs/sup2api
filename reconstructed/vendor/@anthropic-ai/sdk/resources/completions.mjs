/**
 * @anthropic-ai/sdk/resources/completions.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../core/resource.mjs";
import { T } from "../internal/headers.mjs";

//@ chunk-hwmsct5x.js:145529-145854 esm-fingerprint
class nAt extends Y {
  create(e, n) {
    let { betas: betas, workspace_id: workspace_id, ...h } = e;
    return this._client.post("/v1/complete", {
      body: h,
      timeout: this._client._options.timeout ?? 600000,
      ...n,
      headers: T([
        {
          ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        n?.headers,
      ]),
      stream: e.stream ?? !1,
    });
  }
}

export { nAt };
