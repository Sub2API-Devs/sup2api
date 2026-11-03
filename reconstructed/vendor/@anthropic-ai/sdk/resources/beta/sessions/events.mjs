/**
 * @anthropic-ai/sdk/resources/beta/sessions/events.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { TokenPage } from "../../../core/pagination.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { SessionToolRunner } from "../../../lib/tools/SessionToolRunner.mjs";

//@ chunk-hwmsct5x.js:129788-130754 esm-fingerprint
var Events = (() => {
  class Events extends APIResource {
    list(sessionID, params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.getAPIList(I`/v1/sessions/${sessionID}/events?beta=true`, TokenPage, {
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
      return this._client.post(I`/v1/sessions/${sessionID}/events?beta=true`, {
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
      return this._client.get(I`/v1/sessions/${sessionID}/events/stream?beta=true`, {
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
