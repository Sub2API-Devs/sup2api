/**
 * @anthropic-ai/sdk/resources/beta/organization/compliance-settings.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";

//@ chunk-hwmsct5x.js:119462-119673 esm-fingerprint
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
