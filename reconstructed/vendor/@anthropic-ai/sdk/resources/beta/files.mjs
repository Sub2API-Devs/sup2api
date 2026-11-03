/**
 * @anthropic-ai/sdk/resources/beta/files.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../core/resource.mjs";
import { TokenPage } from "../../core/pagination.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { I } from "../../internal/utils/path.mjs";
import { ut } from "../../internal/uploads.mjs";
import { is } from "../../internal/stainless-helper-header.mjs";

//@ chunk-hwmsct5x.js:50044-51409 esm-fingerprint
class Files extends APIResource {
  list(params = {}, options) {
    let { betas, workspace_id, ...query } = params ?? {};
    return this._client.getAPIList("/v1/files?beta=true", TokenPage, {
      query,
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
    });
  }
  delete(fileID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.delete(I`/v1/files/${fileID}?beta=true`, {
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
    });
  }
  download(fileID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.get(I`/v1/files/${fileID}/content?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          Accept: "application/binary",
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
      __binaryResponse: true,
    });
  }
  retrieveMetadata(fileID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.get(I`/v1/files/${fileID}?beta=true`, {
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
    });
  }
  upload(params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post(
      "/v1/files?beta=true",
      ut(
        {
          body,
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
            is(body.file),
            options?.headers,
          ]),
        },
        this._client,
      ),
    );
  }
}
export { Files };
