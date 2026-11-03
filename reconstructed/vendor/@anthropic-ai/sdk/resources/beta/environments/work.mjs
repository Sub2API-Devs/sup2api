/**
 * @anthropic-ai/sdk/resources/beta/environments/work.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { T } from "../../../internal/headers.mjs";
import { ee } from "../../../core/pagination.mjs";
import { Fr } from "../../../lib/environments/poller.mjs";
import { pa } from "../../../lib/environments/worker.mjs";

//@ chunk-hwmsct5x.js:79802-82182 esm-fingerprint
var Ts = (() => {
  class e extends Y {
    retrieve(n, r, s) {
      let { environment_id: environment_id, betas: betas, workspace_id: workspace_id } = r;
      return this._client.get(I`/v1/environments/${environment_id}/work/${n}?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    update(n, r, s) {
      let { environment_id: environment_id, betas: betas, workspace_id: workspace_id, ...S } = r;
      return this._client.post(I`/v1/environments/${environment_id}/work/${n}?beta=true`, {
        body: S,
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    list(n, r = {}, s) {
      let { betas: betas, ...y } = r ?? {};
      return this._client.getAPIList(I`/v1/environments/${n}/work?beta=true`, ee, {
        query: y,
        ...s,
        headers: T([
          { "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString() },
          s?.headers,
        ]),
      });
    }
    ack(n, r, s) {
      let { environment_id: environment_id, betas: betas } = r;
      return this._client.post(I`/v1/environments/${environment_id}/work/${n}/ack?beta=true`, {
        ...s,
        headers: T([
          { "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString() },
          s?.headers,
        ]),
      });
    }
    heartbeat(n, r, s) {
      let {
        environment_id: environment_id,
        desired_ttl_seconds: desired_ttl_seconds,
        expected_last_heartbeat: expected_last_heartbeat,
        betas: betas,
      } = r;
      return this._client.post(I`/v1/environments/${environment_id}/work/${n}/heartbeat?beta=true`, {
        query: { desired_ttl_seconds: desired_ttl_seconds, expected_last_heartbeat: expected_last_heartbeat },
        ...s,
        headers: T([
          { "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString() },
          s?.headers,
        ]),
      });
    }
    poll(n, r = {}, s) {
      let { betas: betas, "Anthropic-Worker-ID": y, ...w } = r ?? {};
      return this._client.get(I`/v1/environments/${n}/work/poll?beta=true`, {
        query: w,
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(y != null ? { "Anthropic-Worker-ID": y } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    stats(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.get(I`/v1/environments/${n}/work/stats?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    stop(n, r, s) {
      let { environment_id: environment_id, betas: betas, workspace_id: workspace_id, ...S } = r;
      return this._client.post(I`/v1/environments/${environment_id}/work/${n}/stop?beta=true`, {
        body: S,
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    poller(n) {
      return new Fr({ ...n, client: this._client });
    }
    worker(n) {
      return new pa({ ...n, client: this._client });
    }
  }
  return ((e.WorkPoller = Fr), (e.EnvironmentWorker = pa), e);
})();

export { Ts };
