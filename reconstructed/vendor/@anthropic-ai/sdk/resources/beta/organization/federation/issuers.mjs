/**
 * @anthropic-ai/sdk/resources/beta/organization/federation/issuers.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { T } from "../../../../internal/headers.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { ee } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:121173-122282 esm-fingerprint
class ao extends Y {
  create(e, n) {
    let { betas: betas, ...s } = e;
    return this._client.post("/v1/organizations/federation_issuers?beta=true", {
      body: s,
      ...n,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        n?.headers,
      ]),
    });
  }
  retrieve(e, n = {}, r) {
    let { betas: betas } = n ?? {};
    return this._client.get(I`/v1/organizations/federation_issuers/${e}?beta=true`, {
      ...r,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        r?.headers,
      ]),
    });
  }
  update(e, n, r) {
    let { betas: betas, ...h } = n;
    return this._client.post(I`/v1/organizations/federation_issuers/${e}?beta=true`, {
      body: h,
      ...r,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        r?.headers,
      ]),
    });
  }
  list(e = {}, n) {
    let { betas: betas, ...s } = e ?? {};
    return this._client.getAPIList("/v1/organizations/federation_issuers?beta=true", ee, {
      query: s,
      ...n,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        n?.headers,
      ]),
    });
  }
  archive(e, n = {}, r) {
    let { betas: betas } = n ?? {};
    return this._client.post(I`/v1/organizations/federation_issuers/${e}/archive?beta=true`, {
      ...r,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        r?.headers,
      ]),
    });
  }
}

export { ao };
