/**
 * @anthropic-ai/sdk/resources/beta/sessions/threads/events.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { APIResource } from "../../../../core/resource.mjs";
import { parseUrl_2 } from "../../../../internal/utils/path.mjs";
import { TokenPage } from "../../../../core/pagination.mjs";
import { buildHeaders } from "../../../../internal/headers.mjs";

//@ chunk-vn3g7zt8.js:132549-133173 esm-fingerprint
class Events_2 extends APIResource {
  list(threadID, params, options) {
    let { session_id, betas, workspace_id, ...query } = params;
    return this._client.getAPIList(
      parseUrl_2`/v1/sessions/${session_id}/threads/${threadID}/events?beta=true`,
      TokenPage,
      {
        query,
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null
              ? {
                  "anthropic-workspace-id": workspace_id,
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
  stream(threadID, params, options) {
    let { session_id, betas, workspace_id, ...query } = params;
    return this._client.get(parseUrl_2`/v1/sessions/${session_id}/threads/${threadID}/stream?beta=true`, {
      query,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null
            ? {
                "anthropic-workspace-id": workspace_id,
              }
            : undefined),
        },
        options?.headers,
      ]),
      stream: true,
    });
  }
}
export { Events_2 };
