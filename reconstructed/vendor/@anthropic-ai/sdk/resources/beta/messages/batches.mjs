/**
 * @anthropic-ai/sdk/resources/beta/messages/batches.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { T } from "../../../internal/headers.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { Be } from "../../../core/pagination.mjs";
import { pr } from "../../../core/error.mjs";
import { Ps } from "../../../internal/decoders/jsonl.mjs";

//@ chunk-hwmsct5x.js:88799-90744 esm-fingerprint
class zr extends Y {
  create(e, n) {
    let { betas: betas, user_profile_id: user_profile_id, workspace_id: workspace_id, ...y } = e;
    return this._client.post("/v1/messages/batches?beta=true", {
      body: y,
      ...n,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
          ...(user_profile_id != null ? { "anthropic-user-profile-id": user_profile_id } : void 0),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        n?.headers,
      ]),
    });
  }
  retrieve(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.get(I`/v1/messages/batches/${e}?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  list(e = {}, n) {
    let { betas: betas, workspace_id: workspace_id, ...h } = e ?? {};
    return this._client.getAPIList("/v1/messages/batches?beta=true", Be, {
      query: h,
      ...n,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        n?.headers,
      ]),
    });
  }
  delete(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.delete(I`/v1/messages/batches/${e}?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  cancel(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.post(I`/v1/messages/batches/${e}/cancel?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
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
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client
      .get(retrieve.results_url, {
        ...r,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
            Accept: "application/binary",
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          r?.headers,
        ]),
        stream: !0,
        __binaryResponse: !0,
      })
      ._thenUnwrap((w, S) => Ps.fromResponse(S.response, S.controller));
  }
}

export { zr };
