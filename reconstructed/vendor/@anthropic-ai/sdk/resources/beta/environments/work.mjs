/**
 * @anthropic-ai/sdk/resources/beta/environments/work.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { TokenPage } from "../../../core/pagination.mjs";
import { WorkPoller } from "../../../lib/environments/poller.mjs";
import { EnvironmentWorker } from "../../../lib/environments/worker.mjs";

//@ chunk-hwmsct5x.js:79802-82182 esm-fingerprint
var Work = (() => {
  class Work extends APIResource {
    retrieve(workID, params, options) {
      let { environment_id, betas, workspace_id } = params;
      return this._client.get(I`/v1/environments/${environment_id}/work/${workID}?beta=true`, {
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
    update(workID, params, options) {
      let { environment_id, betas, workspace_id, ...body } = params;
      return this._client.post(I`/v1/environments/${environment_id}/work/${workID}?beta=true`, {
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
    list(environmentID, params = {}, options) {
      let { betas, ...query } = params ?? {};
      return this._client.getAPIList(I`/v1/environments/${environmentID}/work?beta=true`, TokenPage, {
        query,
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          },
          options?.headers,
        ]),
      });
    }
    ack(workID, params, options) {
      let { environment_id, betas } = params;
      return this._client.post(I`/v1/environments/${environment_id}/work/${workID}/ack?beta=true`, {
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          },
          options?.headers,
        ]),
      });
    }
    heartbeat(workID, params, options) {
      let { environment_id, desired_ttl_seconds, expected_last_heartbeat, betas } = params;
      return this._client.post(I`/v1/environments/${environment_id}/work/${workID}/heartbeat?beta=true`, {
        query: {
          desired_ttl_seconds,
          expected_last_heartbeat,
        },
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          },
          options?.headers,
        ]),
      });
    }
    poll(environmentID, params = {}, options) {
      let { betas, "Anthropic-Worker-ID": anthropicWorkerID, ...query } = params ?? {};
      return this._client.get(I`/v1/environments/${environmentID}/work/poll?beta=true`, {
        query,
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(anthropicWorkerID != null
              ? {
                  "Anthropic-Worker-ID": anthropicWorkerID,
                }
              : undefined),
          },
          options?.headers,
        ]),
      });
    }
    stats(environmentID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.get(I`/v1/environments/${environmentID}/work/stats?beta=true`, {
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
    stop(workID, params, options) {
      let { environment_id, betas, workspace_id, ...body } = params;
      return this._client.post(I`/v1/environments/${environment_id}/work/${workID}/stop?beta=true`, {
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
    poller(opts) {
      return new WorkPoller({
        ...opts,
        client: this._client,
      });
    }
    worker(opts) {
      return new EnvironmentWorker({
        ...opts,
        client: this._client,
      });
    }
  }
  Work.WorkPoller = WorkPoller;
  Work.EnvironmentWorker = EnvironmentWorker;
  return Work;
})();
export { Work };
