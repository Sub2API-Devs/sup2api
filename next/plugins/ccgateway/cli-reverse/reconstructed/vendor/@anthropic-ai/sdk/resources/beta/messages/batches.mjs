/**
 * @anthropic-ai/sdk/resources/beta/messages/batches.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { Page } from "../../../core/pagination.mjs";
import { AnthropicError } from "../../../core/error.mjs";
import { JSONLDecoder } from "../../../internal/decoders/jsonl.mjs";

//@ chunk-hwmsct5x.js:88799-90744 esm-fingerprint
class Batches extends APIResource {
  create(params, options) {
    let { betas, user_profile_id, workspace_id, ...body } = params;
    return this._client.post("/v1/messages/batches?beta=true", {
      body,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
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
    let { betas, workspace_id } = params ?? {};
    return this._client.get(parseUrl_2`/v1/messages/batches/${messageBatchID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
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
    let { betas, workspace_id, ...query } = params ?? {};
    return this._client.getAPIList("/v1/messages/batches?beta=true", Page, {
      query,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
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
    let { betas, workspace_id } = params ?? {};
    return this._client.delete(parseUrl_2`/v1/messages/batches/${messageBatchID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
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
    let { betas, workspace_id } = params ?? {};
    return this._client.post(parseUrl_2`/v1/messages/batches/${messageBatchID}/cancel?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
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
    let { betas, workspace_id } = params ?? {};
    return this._client
      .get(batch.results_url, {
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "message-batches-2024-09-24"].toString(),
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
export { Batches };
