/**
 * @anthropic-ai/sdk/core/pagination.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../internal/tslib.mjs";
import { AnthropicError } from "./error.mjs";
import { APIPromise } from "./api-promise.mjs";
import { defaultParseResponse } from "../internal/parse.mjs";
import { maybeObj } from "../internal/utils/values.mjs";

//@ chunk-vn3g7zt8.js:37671-38564 esm-layout
var _AbstractPage_client;
var AbstractPage = (() => {
  class AbstractPage {
    constructor(client, response, body, options) {
      _AbstractPage_client.set(this, undefined);
      __classPrivateFieldSet(this, _AbstractPage_client, client, "f");
      this.options = options;
      this.response = response;
      this.body = body;
    }
    hasNextPage() {
      if (!this.getPaginatedItems().length) return false;
      return this.nextPageRequestOptions() != null;
    }
    async getNextPage() {
      let nextOptions = this.nextPageRequestOptions();
      if (!nextOptions)
        throw new AnthropicError(
          "No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.",
        );
      return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(
        this.constructor,
        nextOptions,
      );
    }
    async *iterPages() {
      let page = this;
      yield page;
      while (page.hasNextPage()) {
        page = await page.getNextPage();
        yield page;
      }
    }
    async *[((_AbstractPage_client = new WeakMap()), Symbol.asyncIterator)]() {
      for await (let page of this.iterPages()) for (let item of page.getPaginatedItems()) yield item;
    }
  }
  return AbstractPage;
})();
var PagePromise = (() => {
  class PagePromise extends APIPromise {
    constructor(client, request, Page) {
      super(
        client,
        request,
        async (client, props) =>
          new Page(client, props.response, await defaultParseResponse(client, props), props.options),
      );
    }
    async *[Symbol.asyncIterator]() {
      let page = await this;
      for await (let item of page) yield item;
    }
  }
  return PagePromise;
})();
//@ chunk-vn3g7zt8.js:38564-39117 esm-fingerprint
class Page extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.first_id = body.first_id || null;
    this.last_id = body.last_id || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) return false;
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    if (this.options.query?.before_id) {
      let first_id = this.first_id;
      if (!first_id) return null;
      return {
        ...this.options,
        query: {
          ...maybeObj(this.options.query),
          before_id: first_id,
        },
      };
    }
    let cursor = this.last_id;
    if (!cursor) return null;
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after_id: cursor,
      },
    };
  }
}
//@ chunk-vn3g7zt8.js:39117-39398 esm-fingerprint
class TokenPage extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.next_page = body.next_page || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageRequestOptions() {
    let cursor = this.next_page;
    if (!cursor) return null;
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        page: cursor,
      },
    };
  }
}
//@ chunk-vn3g7zt8.js:39398-39712 esm-fingerprint
class BidirectionalPageCursor extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.next_page = body.next_page || null;
    this.prev_page = body.prev_page || null;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageRequestOptions() {
    let cursor = this.next_page;
    if (!cursor) return null;
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        page: cursor,
      },
    };
  }
}
export { TokenPage, Page, BidirectionalPageCursor, PagePromise };
