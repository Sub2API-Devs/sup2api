/**
 * @anthropic-ai/sdk/resources/beta/sessions/sessions.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { Events } from "./events.mjs";
import { Resources } from "./resources.mjs";
import { Threads } from "./threads/threads.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { BidirectionalPageCursor } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:133758-135536 esm-fingerprint
var Sessions = (() => {
  class Sessions extends APIResource {
    constructor() {
      super(...arguments);
      this.events = new Events(this._client);
      this.resources = new Resources(this._client);
      this.threads = new Threads(this._client);
    }
    create(params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post("/v1/sessions?beta=true", {
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
    retrieve(sessionID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.get(parseUrl_2`/v1/sessions/${sessionID}?beta=true`, {
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
    update(sessionID, params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post(parseUrl_2`/v1/sessions/${sessionID}?beta=true`, {
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
    list(params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.getAPIList("/v1/sessions?beta=true", BidirectionalPageCursor, {
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
    delete(sessionID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.delete(parseUrl_2`/v1/sessions/${sessionID}?beta=true`, {
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
    archive(sessionID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.post(parseUrl_2`/v1/sessions/${sessionID}/archive?beta=true`, {
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
  Sessions.Events = Events;
  Sessions.Resources = Resources;
  Sessions.Threads = Threads;
  return Sessions;
})();
export { Sessions };
