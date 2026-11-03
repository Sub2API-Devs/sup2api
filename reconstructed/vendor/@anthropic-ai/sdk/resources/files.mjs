/**
 * @anthropic-ai/sdk/resources/files.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../core/resource.mjs";
import { ee } from "../core/pagination.mjs";
import { T } from "../internal/headers.mjs";
import { I } from "../internal/utils/path.mjs";
import { ut } from "../internal/uploads.mjs";
import { is } from "../internal/stainless-helper-header.mjs";

//@ chunk-hwmsct5x.js:145854-146814 esm-fingerprint
class qn extends Y {
  list(e = {}, n) {
    let { workspace_id: workspace_id, ...s } = e ?? {};
    return this._client.getAPIList("/v1/files", ee, {
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
    return this._client.delete(I`/v1/files/${e}`, {
      ...r,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        r?.headers,
      ]),
    });
  }
  download(e, n = {}, r) {
    let { workspace_id: workspace_id } = n ?? {};
    return this._client.get(I`/v1/files/${e}/content`, {
      ...r,
      headers: T([
        {
          Accept: "application/binary",
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
      __binaryResponse: !0,
    });
  }
  retrieveMetadata(e, n = {}, r) {
    let { workspace_id: workspace_id } = n ?? {};
    return this._client.get(I`/v1/files/${e}`, {
      ...r,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        r?.headers,
      ]),
    });
  }
  upload(e, n) {
    let { workspace_id: workspace_id, ...s } = e;
    return this._client.post(
      "/v1/files",
      ut(
        {
          body: s,
          ...n,
          headers: T([
            { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
            is(s.file),
            n?.headers,
          ]),
        },
        this._client,
      ),
    );
  }
}

export { qn };
