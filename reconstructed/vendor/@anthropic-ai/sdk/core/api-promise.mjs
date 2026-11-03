/**
 * @anthropic-ai/sdk/core/api-promise.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-layout 1
 */
import { Xo, ar } from "../internal/parse.mjs";
import { Kn, ke } from "../internal/tslib.mjs";

//@ chunk-hwmsct5x.js:36448-37300 esm-layout
var lr,
  Jo = (() => {
    class e extends Promise {
      constructor(n, r, s = Xo) {
        super((h) => {
          h(null);
        });
        ((this.responsePromise = r), (this.parseResponse = s), lr.set(this, void 0), Kn(this, lr, n, "f"));
      }
      _thenUnwrap(n) {
        return new e(ke(this, lr, "f"), this.responsePromise, async (r, s) =>
          ar(n(await this.parseResponse(r, s), s), s.response),
        );
      }
      asResponse() {
        return this.responsePromise.then((n) => n.response);
      }
      async withResponse() {
        let [n, r] = await Promise.all([this.parse(), this.asResponse()]);
        return {
          data: n,
          response: r,
          request_id: r.headers.get("request-id"),
          workspace_id: r.headers.get("anthropic-workspace-id"),
        };
      }
      parse() {
        if (!this.parsedPromise)
          this.parsedPromise = this.responsePromise.then((n) => this.parseResponse(ke(this, lr, "f"), n));
        return this.parsedPromise;
      }
      then(n, r) {
        return this.parse().then(n, r);
      }
      catch(n) {
        return this.parse().catch(n);
      }
      finally(n) {
        return this.parse().finally(n);
      }
    }
    return ((lr = new WeakMap()), e);
  })();

export { Jo };
