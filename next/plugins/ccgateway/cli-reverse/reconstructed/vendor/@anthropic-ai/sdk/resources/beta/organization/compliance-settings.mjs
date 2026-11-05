/**
 * @anthropic-ai/sdk/resources/beta/organization/compliance-settings.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { APIResource } from "../../../core/resource.mjs";

//@ chunk-vn3g7zt8.js:119842-120053 esm-fingerprint
class ComplianceSettings extends APIResource {
  retrieve(options) {
    return this._client.get("/v1/organizations/compliance_settings?beta=true", options);
  }
  update(body, options) {
    return this._client.post("/v1/organizations/compliance_settings?beta=true", {
      body,
      ...options,
    });
  }
}
export { ComplianceSettings };
