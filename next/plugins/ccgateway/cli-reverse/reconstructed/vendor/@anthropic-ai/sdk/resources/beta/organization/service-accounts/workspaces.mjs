/**
 * @anthropic-ai/sdk/resources/beta/organization/service-accounts/workspaces.mjs
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

//@ chunk-vn3g7zt8.js:124771-125500 esm-fingerprint
class Workspaces_2 extends APIResource {
  list(serviceAccountID, params = {}, options) {
    let { betas, ...query } = params ?? {};
    return this._client.getAPIList(
      parseUrl_2`/v1/organizations/service_accounts/${serviceAccountID}/workspaces?beta=true`,
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
  add(serviceAccountID, params, options) {
    let { betas, ...body } = params;
    return this._client.post(
      parseUrl_2`/v1/organizations/service_accounts/${serviceAccountID}/workspaces?beta=true`,
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
  remove(workspaceID, params, options) {
    let { service_account_id, betas } = params;
    return this._client.delete(
      parseUrl_2`/v1/organizations/service_accounts/${service_account_id}/workspaces/${workspaceID}?beta=true`,
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
export { Workspaces_2 };
