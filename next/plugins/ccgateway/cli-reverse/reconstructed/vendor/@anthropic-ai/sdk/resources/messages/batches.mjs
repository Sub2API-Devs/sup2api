/**
 * @anthropic-ai/sdk/resources/messages/batches.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../core/resource.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { parseUrl_2 } from "../../internal/utils/path.mjs";
import { Page } from "../../core/pagination.mjs";
import { AnthropicError } from "../../core/error.mjs";
import { JSONLDecoder } from "../../internal/decoders/jsonl.mjs";

//@ chunk-vn3g7zt8.js:157303-158742 esm-fingerprint
class Batches_2 extends APIResource {
  create(params, options) {
    let { user_profile_id, workspace_id, ...body } = params;
    return this._client.post("/v1/messages/batches", {
      body,
      ...options,
      headers: buildHeaders([
        {
          ...(user_profile_id != null
            ? {
                "anthropic-user-profile-id": user_profile_id,
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
  retrieve(messageBatchID, params = {}, options) {
    let { workspace_id } = params ?? {};
    return this._client.get(parseUrl_2`/v1/messages/batches/${messageBatchID}`, {
      ...options,
      headers: buildHeaders([
        {
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
  list(params = {}, options) {
    let { workspace_id, ...query } = params ?? {};
    return this._client.getAPIList("/v1/messages/batches", Page, {
      query,
      ...options,
      headers: buildHeaders([
        {
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
  delete(messageBatchID, params = {}, options) {
    let { workspace_id } = params ?? {};
    return this._client.delete(parseUrl_2`/v1/messages/batches/${messageBatchID}`, {
      ...options,
      headers: buildHeaders([
        {
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
  cancel(messageBatchID, params = {}, options) {
    let { workspace_id } = params ?? {};
    return this._client.post(parseUrl_2`/v1/messages/batches/${messageBatchID}/cancel`, {
      ...options,
      headers: buildHeaders([
        {
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
  async results(messageBatchID, params = {}, options) {
    let batch = await this.retrieve(messageBatchID, params, options);
    if (!batch.results_url)
      throw new AnthropicError(
        `No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`,
      );
    let { workspace_id } = params ?? {};
    return this._client
      .get(batch.results_url, {
        ...options,
        headers: buildHeaders([
          {
            Accept: "application/binary",
            ...(workspace_id != null
              ? {
                  "anthropic-workspace-id": workspace_id,
                }
              : undefined),
          },
          options?.headers,
        ]),
        stream: true,
        __binaryResponse: true,
      })
      ._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
  }
}
export { Batches_2 };
