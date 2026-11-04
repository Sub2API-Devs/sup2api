/**
 * @grpc/grpc-js/build/src/filter-stack.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:192412-193423 cjs-fingerprint
var require_filter_stack = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.FilterStackFactory = cjsExports.FilterStack = undefined;
  class FilterStack {
    constructor(filters) {
      this.filters = filters;
    }
    sendMetadata(metadata) {
      let result = metadata;
      for (let i = 0; i < this.filters.length; i++) result = this.filters[i].sendMetadata(result);
      return result;
    }
    receiveMetadata(metadata) {
      let result = metadata;
      for (let i = this.filters.length - 1; i >= 0; i--) result = this.filters[i].receiveMetadata(result);
      return result;
    }
    sendMessage(message) {
      let result = message;
      for (let i = 0; i < this.filters.length; i++) result = this.filters[i].sendMessage(result);
      return result;
    }
    receiveMessage(message) {
      let result = message;
      for (let i = this.filters.length - 1; i >= 0; i--) result = this.filters[i].receiveMessage(result);
      return result;
    }
    receiveTrailers(status) {
      let result = status;
      for (let i = this.filters.length - 1; i >= 0; i--) result = this.filters[i].receiveTrailers(result);
      return result;
    }
    push(filters) {
      this.filters.unshift(...filters);
    }
    getFilters() {
      return this.filters;
    }
  }
  cjsExports.FilterStack = FilterStack;
  class FilterStackFactory {
    constructor(factories) {
      this.factories = factories;
    }
    push(filterFactories) {
      this.factories.unshift(...filterFactories);
    }
    clone() {
      return new FilterStackFactory([...this.factories]);
    }
    createFilter() {
      return new FilterStack(this.factories.map((factory) => factory.createFilter()));
    }
  }
  cjsExports.FilterStackFactory = FilterStackFactory;
});
export { require_filter_stack };
