/**
 * @anthropic-ai/sdk/core/pagination.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Kn, ke } from "../internal/tslib.mjs";
import { pr } from "./error.mjs";
import { Jo } from "./api-promise.mjs";
import { Xo } from "../internal/parse.mjs";
import { nr } from "../internal/utils/values.mjs";

//@ chunk-hwmsct5x.js:37300-38193 esm-layout
var Qo,
  Ji = (() => {
    class e {
      constructor(n, r, s, h) {
        (Qo.set(this, void 0),
          Kn(this, Qo, n, "f"),
          (this.options = h),
          (this.response = r),
          (this.body = s));
      }
      hasNextPage() {
        if (!this.getPaginatedItems().length) return !1;
        return this.nextPageRequestOptions() != null;
      }
      async getNextPage() {
        let nextPageRequestOptions = this.nextPageRequestOptions();
        if (!nextPageRequestOptions)
          throw new pr(
            "No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.",
          );
        return await ke(this, Qo, "f").requestAPIList(this.constructor, nextPageRequestOptions);
      }
      async *iterPages() {
        let n = this;
        yield n;
        while (n.hasNextPage()) ((n = await n.getNextPage()), yield n);
      }
      async *[((Qo = new WeakMap()), Symbol.asyncIterator)]() {
        for await (let n of this.iterPages()) for (let r of n.getPaginatedItems()) yield r;
      }
    }
    return e;
  })(),
  yu = (() => {
    class e extends Jo {
      constructor(n, r, s) {
        super(n, r, async (h, y) => new s(h, y.response, await Xo(h, y), y.options));
      }
      async *[Symbol.asyncIterator]() {
        let n = await this;
        for await (let r of n) yield r;
      }
    }
    return e;
  })();
//@ chunk-hwmsct5x.js:38193-38746 esm-fingerprint
class Be extends Ji {
  constructor(e, n, r, s) {
    super(e, n, r, s);
    ((this.data = r.data || []),
      (this.has_more = r.has_more || !1),
      (this.first_id = r.first_id || null),
      (this.last_id = r.last_id || null));
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === !1) return !1;
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    if (this.options.query?.before_id) {
      let first_id = this.first_id;
      if (!first_id) return null;
      return { ...this.options, query: { ...nr(this.options.query), before_id: first_id } };
    }
    let last_id = this.last_id;
    if (!last_id) return null;
    return { ...this.options, query: { ...nr(this.options.query), after_id: last_id } };
  }
}
//@ chunk-hwmsct5x.js:38746-39027 esm-fingerprint
class ee extends Ji {
  constructor(e, n, r, s) {
    super(e, n, r, s);
    ((this.data = r.data || []), (this.next_page = r.next_page || null));
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageRequestOptions() {
    let next_page = this.next_page;
    if (!next_page) return null;
    return { ...this.options, query: { ...nr(this.options.query), page: next_page } };
  }
}
//@ chunk-hwmsct5x.js:39027-39341 esm-fingerprint
class Qi extends Ji {
  constructor(e, n, r, s) {
    super(e, n, r, s);
    ((this.data = r.data || []),
      (this.next_page = r.next_page || null),
      (this.prev_page = r.prev_page || null));
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageRequestOptions() {
    let next_page = this.next_page;
    if (!next_page) return null;
    return { ...this.options, query: { ...nr(this.options.query), page: next_page } };
  }
}

export { ee, Be, Qi, yu };
