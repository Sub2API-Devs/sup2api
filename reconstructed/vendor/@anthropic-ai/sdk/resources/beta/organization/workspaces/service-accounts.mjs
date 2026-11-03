/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/service-accounts.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../core/resource.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { buildHeaders } from "../../../../internal/headers.mjs";
import { TokenPage } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:127113-128319 esm-fingerprint
class ServiceAccounts_2 extends APIResource {
  retrieve(serviceAccountID, params, options) {
    let { workspace_id, betas } = params;
    return this._client.get(
      I`/v1/organizations/workspaces/${workspace_id}/service_accounts/${serviceAccountID}?beta=true`,
      {
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
  update(serviceAccountID, params, options) {
    let { workspace_id, betas, ...body } = params;
    return this._client.post(
      I`/v1/organizations/workspaces/${workspace_id}/service_accounts/${serviceAccountID}?beta=true`,
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
          },
          options?.headers,
        ]),
      },
    );
  }
  list(workspaceID, params = {}, options) {
    let { betas, ...query } = params ?? {};
    return this._client.getAPIList(
      I`/v1/organizations/workspaces/${workspaceID}/service_accounts?beta=true`,
      TokenPage,
      {
        query,
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
  add(workspaceID, params, options) {
    let { betas, ...body } = params;
    return this._client.post(I`/v1/organizations/workspaces/${workspaceID}/service_accounts?beta=true`, {
      body,
      ...options,
      headers: buildHeaders([
        {
          ...(betas?.toString() != null
            ? {
                "anthropic-beta": betas?.toString(),
              }
            : undefined),
        },
        options?.headers,
      ]),
    });
  }
  remove(serviceAccountID, params, options) {
    let { workspace_id, betas } = params;
    return this._client.delete(
      I`/v1/organizations/workspaces/${workspace_id}/service_accounts/${serviceAccountID}?beta=true`,
      {
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
}
export { ServiceAccounts_2 };
