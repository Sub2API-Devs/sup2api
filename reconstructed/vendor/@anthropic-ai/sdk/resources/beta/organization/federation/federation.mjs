/**
 * @anthropic-ai/sdk/resources/beta/organization/federation/federation.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../core/resource.mjs";
import { Issuers } from "./issuers.mjs";
import { Rules } from "./rules/rules.mjs";

//@ chunk-hwmsct5x.js:124222-124391 esm-fingerprint
var Federation = (() => {
  class Federation extends APIResource {
    constructor() {
      super(...arguments);
      this.issuers = new Issuers(this._client);
      this.rules = new Rules(this._client);
    }
  }
  Federation.Issuers = Issuers;
  Federation.Rules = Rules;
  return Federation;
})();
export { Federation };
