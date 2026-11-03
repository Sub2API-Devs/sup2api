/**
 * @anthropic-ai/sdk/resources/beta/organization/federation/federation.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { ao } from "./issuers.mjs";
import { zs } from "./rules/rules.mjs";

//@ chunk-hwmsct5x.js:124222-124391 esm-fingerprint
var Gs = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      ((this.issuers = new ao(this._client)), (this.rules = new zs(this._client)));
    }
  }
  return ((e.Issuers = ao), (e.Rules = zs), e);
})();

export { Gs };
