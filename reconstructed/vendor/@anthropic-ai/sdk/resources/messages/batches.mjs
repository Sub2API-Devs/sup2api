/**
 * @anthropic-ai/sdk/resources/messages/batches.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../core/resource.mjs";
import { T } from "../../internal/headers.mjs";
import { I } from "../../internal/utils/path.mjs";
import { Be } from "../../core/pagination.mjs";
import { pr } from "../../core/error.mjs";
import { Ps } from "../../internal/decoders/jsonl.mjs";

//@ chunk-hwmsct5x.js:156923-158362 esm-fingerprint
class Ao extends Y {
  create(e, n) {
    let { user_profile_id: user_profile_id, workspace_id: workspace_id, ...h } = e;
    return this._client.post("/v1/messages/batches", {
      body: h,
      ...n,
      headers: T([
        {
          ...(user_profile_id != null ? { "anthropic-user-profile-id": user_profile_id } : void 0),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        n?.headers,
      ]),
    });
  }
  retrieve(e, n = {}, r) {
    let { workspace_id: workspace_id } = n ?? {};
    return this._client.get(I`/v1/messages/batches/${e}`, {
      ...r,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        r?.headers,
      ]),
    });
  }
  list(e = {}, n) {
    let { workspace_id: workspace_id, ...s } = e ?? {};
    return this._client.getAPIList("/v1/messages/batches", Be, {
      query: s,
      ...n,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        n?.headers,
      ]),
    });
  }
  delete(e, n = {}, r) {
    let { workspace_id: workspace_id } = n ?? {};
    return this._client.delete(I`/v1/messages/batches/${e}`, {
      ...r,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        r?.headers,
      ]),
    });
  }
  cancel(e, n = {}, r) {
    let { workspace_id: workspace_id } = n ?? {};
    return this._client.post(I`/v1/messages/batches/${e}/cancel`, {
      ...r,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        r?.headers,
      ]),
    });
  }
  async results(e, n = {}, r) {
    let retrieve = await this.retrieve(e, n, r);
    if (!retrieve.results_url)
      throw new pr(
        `No batch \`results_url\`; Has it finished processing? ${retrieve.processing_status} - ${retrieve.id}`,
      );
    let { workspace_id: workspace_id } = n ?? {};
    return this._client
      .get(retrieve.results_url, {
        ...r,
        headers: T([
          {
            Accept: "application/binary",
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          r?.headers,
        ]),
        stream: !0,
        __binaryResponse: !0,
      })
      ._thenUnwrap((y, w) => Ps.fromResponse(w.response, w.controller));
  }
}

export { Ao };
