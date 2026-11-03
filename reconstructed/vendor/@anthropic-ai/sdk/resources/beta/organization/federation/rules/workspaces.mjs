/**
 * @anthropic-ai/sdk/resources/beta/organization/federation/rules/workspaces.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../../core/resource.mjs";
import { I } from "../../../../../internal/utils/path.mjs";
import { TokenPage } from "../../../../../core/pagination.mjs";
import { buildHeaders } from "../../../../../internal/headers.mjs";

//@ chunk-hwmsct5x.js:122282-123011 esm-fingerprint
class Workspaces extends APIResource {
  list(federationRuleID, params = {}, options) {
    let { betas, ...query } = params ?? {};
    return this._client.getAPIList(
      I`/v1/organizations/federation_rules/${federationRuleID}/workspaces?beta=true`,
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
  add(federationRuleID, params, options) {
    let { betas, ...body } = params;
    return this._client.post(I`/v1/organizations/federation_rules/${federationRuleID}/workspaces?beta=true`, {
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
  remove(workspaceID, params, options) {
    let { federation_rule_id, betas } = params;
    return this._client.delete(
      I`/v1/organizations/federation_rules/${federation_rule_id}/workspaces/${workspaceID}?beta=true`,
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
export { Workspaces };
