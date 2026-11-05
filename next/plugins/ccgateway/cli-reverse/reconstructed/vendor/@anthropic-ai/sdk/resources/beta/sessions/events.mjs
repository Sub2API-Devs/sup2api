/**
 * @anthropic-ai/sdk/resources/beta/sessions/events.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { TokenPage } from "../../../core/pagination.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { SessionToolRunner } from "../../../lib/tools/SessionToolRunner.mjs";

//@ chunk-vn3g7zt8.js:130168-131134 esm-fingerprint
var Events = (() => {
  class Events extends APIResource {
    list(sessionID, params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.getAPIList(parseUrl_2`/v1/sessions/${sessionID}/events?beta=true`, TokenPage, {
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
    send(sessionID, params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post(parseUrl_2`/v1/sessions/${sessionID}/events?beta=true`, {
        body,
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
    stream(sessionID, params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.get(parseUrl_2`/v1/sessions/${sessionID}/events/stream?beta=true`, {
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
    toolRunner(sessionID, opts) {
      return new SessionToolRunner(sessionID, {
        ...opts,
        client: this._client,
      });
    }
  }
  Events.SessionToolRunner = SessionToolRunner;
  return Events;
})();
export { Events };
