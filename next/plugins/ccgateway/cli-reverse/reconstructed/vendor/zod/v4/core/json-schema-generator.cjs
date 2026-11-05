/**
 * zod/v4/core/json-schema-generator.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_json_schema_processors } from "./json-schema-processors.cjs";
import { require_to_json_schema } from "./to-json-schema.cjs";

//@ chunk-1hnjmk23.js:584418-585939 cjs-fingerprint
var require_json_schema_generator = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.JSONSchemaGenerator = undefined;
  var json_schema_processors_js_1 = require_json_schema_processors();
  var to_json_schema_js_1 = require_to_json_schema();
  class JSONSchemaGenerator {
    get metadataRegistry() {
      return this.ctx.metadataRegistry;
    }
    get target() {
      return this.ctx.target;
    }
    get unrepresentable() {
      return this.ctx.unrepresentable;
    }
    get override() {
      return this.ctx.override;
    }
    get io() {
      return this.ctx.io;
    }
    get counter() {
      return this.ctx.counter;
    }
    set counter(value) {
      this.ctx.counter = value;
    }
    get seen() {
      return this.ctx.seen;
    }
    constructor(params) {
      let normalizedTarget = params?.target ?? "draft-2020-12";
      if (normalizedTarget === "draft-4") normalizedTarget = "draft-04";
      if (normalizedTarget === "draft-7") normalizedTarget = "draft-07";
      this.ctx = to_json_schema_js_1.initializeContext({
        processors: json_schema_processors_js_1.allProcessors,
        target: normalizedTarget,
        ...(params?.metadata && {
          metadata: params.metadata,
        }),
        ...(params?.unrepresentable && {
          unrepresentable: params.unrepresentable,
        }),
        ...(params?.override && {
          override: params.override,
        }),
        ...(params?.io && {
          io: params.io,
        }),
      });
    }
    process(
      schema,
      _params = {
        path: [],
        schemaPath: [],
      },
    ) {
      return to_json_schema_js_1.processSchema(schema, this.ctx, _params);
    }
    emit(schema, _params) {
      if (_params) {
        if (_params.cycles) this.ctx.cycles = _params.cycles;
        if (_params.reused) this.ctx.reused = _params.reused;
        if (_params.external) this.ctx.external = _params.external;
      }
      this.ctx.sharedDefsExtractedFor = undefined;
      this.ctx.sharedEmitDoneFor = undefined;
      to_json_schema_js_1.extractDefs(this.ctx, schema);
      let result = to_json_schema_js_1.finalize(this.ctx, schema);
      let { "~standard": _, ...plainResult } = result;
      return plainResult;
    }
  }
  cjsExports.JSONSchemaGenerator = JSONSchemaGenerator;
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_json_schema_generator };
