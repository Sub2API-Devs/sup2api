/**
 * @anthropic-ai/sdk/resources/beta/organization/federation/rules/rules.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../../core/resource.mjs";
import { lo } from "./workspaces.mjs";
import { T } from "../../../../../internal/headers.mjs";
import { I } from "../../../../../internal/utils/path.mjs";
import { ee } from "../../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:123011-124222 esm-fingerprint
var zs = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      this.workspaces = new lo(this._client);
    }
    create(n, r) {
      let { betas: betas, ...h } = n;
      return this._client.post("/v1/organizations/federation_rules?beta=true", {
        body: h,
        ...r,
        headers: T([
          { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
          r?.headers,
        ]),
      });
    }
    retrieve(n, r = {}, s) {
      let { betas: betas } = r ?? {};
      return this._client.get(I`/v1/organizations/federation_rules/${n}?beta=true`, {
        ...s,
        headers: T([
          { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
          s?.headers,
        ]),
      });
    }
    update(n, r, s) {
      let { betas: betas, ...y } = r;
      return this._client.post(I`/v1/organizations/federation_rules/${n}?beta=true`, {
        body: y,
        ...s,
        headers: T([
          { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
          s?.headers,
        ]),
      });
    }
    list(n = {}, r) {
      let { betas: betas, ...h } = n ?? {};
      return this._client.getAPIList("/v1/organizations/federation_rules?beta=true", ee, {
        query: h,
        ...r,
        headers: T([
          { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
          r?.headers,
        ]),
      });
    }
    archive(n, r = {}, s) {
      let { betas: betas } = r ?? {};
      return this._client.post(I`/v1/organizations/federation_rules/${n}/archive?beta=true`, {
        ...s,
        headers: T([
          { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
          s?.headers,
        ]),
      });
    }
  }
  return ((e.Workspaces = lo), e);
})();

export { zs };
