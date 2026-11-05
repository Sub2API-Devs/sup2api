/**
 * @anthropic-ai/sdk/core/api-promise.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { defaultParseResponse, addResponseIDs } from "../internal/parse.mjs";
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../internal/tslib.mjs";

//@ chunk-vn3g7zt8.js:36819-37671 esm-layout
var _APIPromise_client;
var APIPromise = (() => {
  class APIPromise extends Promise {
    constructor(client, responsePromise, parseResponse = defaultParseResponse) {
      super((resolve) => {
        resolve(null);
      });
      this.responsePromise = responsePromise;
      this.parseResponse = parseResponse;
      _APIPromise_client.set(this, undefined);
      __classPrivateFieldSet(this, _APIPromise_client, client, "f");
    }
    _thenUnwrap(transform) {
      return new APIPromise(
        __classPrivateFieldGet(this, _APIPromise_client, "f"),
        this.responsePromise,
        async (client, props) =>
          addResponseIDs(transform(await this.parseResponse(client, props), props), props.response),
      );
    }
    asResponse() {
      return this.responsePromise.then((p) => p.response);
    }
    async withResponse() {
      let [data, response] = await Promise.all([this.parse(), this.asResponse()]);
      return {
        data,
        response,
        request_id: response.headers.get("request-id"),
        workspace_id: response.headers.get("anthropic-workspace-id"),
      };
    }
    parse() {
      if (!this.parsedPromise)
        this.parsedPromise = this.responsePromise.then((data) =>
          this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data),
        );
      return this.parsedPromise;
    }
    then(onfulfilled, onrejected) {
      return this.parse().then(onfulfilled, onrejected);
    }
    catch(onrejected) {
      return this.parse().catch(onrejected);
    }
    finally(onfinally) {
      return this.parse().finally(onfinally);
    }
  }
  _APIPromise_client = new WeakMap();
  return APIPromise;
})();
export { APIPromise };
