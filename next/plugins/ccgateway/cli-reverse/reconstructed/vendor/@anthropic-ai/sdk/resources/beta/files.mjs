/**
 * @anthropic-ai/sdk/resources/beta/files.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { APIResource } from "../../core/resource.mjs";
import { TokenPage } from "../../core/pagination.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { parseUrl_2 } from "../../internal/utils/path.mjs";
import { withUploadBody } from "../../internal/uploads.mjs";
import { stainlessHelperHeaders } from "../../internal/stainless-helper-header.mjs";

//@ chunk-vn3g7zt8.js:50415-51780 esm-fingerprint
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
    return this._client.delete(parseUrl_2`/v1/files/${fileID}?beta=true`, {
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
    return this._client.get(parseUrl_2`/v1/files/${fileID}/content?beta=true`, {
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
    return this._client.get(parseUrl_2`/v1/files/${fileID}?beta=true`, {
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
      withUploadBody(
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
            stainlessHelperHeaders(body.file),
            options?.headers,
          ]),
        },
        this._client,
      ),
    );
  }
}
export { Files };
