/**
 * @anthropic-ai/sdk/resources/beta/sessions/threads/threads.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { APIResource } from "../../../../core/resource.mjs";
import { Events_2 } from "./events.mjs";
import { parseUrl_2 } from "../../../../internal/utils/path.mjs";
import { buildHeaders } from "../../../../internal/headers.mjs";
import { TokenPage } from "../../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:133173-134138 esm-fingerprint
var Threads = (() => {
  class Threads extends APIResource {
    constructor() {
      super(...arguments);
      this.events = new Events_2(this._client);
    }
    retrieve(threadID, params, options) {
      let { session_id, betas, workspace_id } = params;
      return this._client.get(parseUrl_2`/v1/sessions/${session_id}/threads/${threadID}?beta=true`, {
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
      });
    }
    list(sessionID, params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.getAPIList(parseUrl_2`/v1/sessions/${sessionID}/threads?beta=true`, TokenPage, {
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
      });
    }
    archive(threadID, params, options) {
      let { session_id, betas, workspace_id } = params;
      return this._client.post(parseUrl_2`/v1/sessions/${session_id}/threads/${threadID}/archive?beta=true`, {
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
      });
    }
  }
  Threads.Events = Events_2;
  return Threads;
})();
export { Threads };
