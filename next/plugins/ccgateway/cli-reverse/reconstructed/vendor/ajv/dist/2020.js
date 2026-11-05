/**
 * ajv/dist/2020.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_core_2 } from "./core.js";
import { require_draft7 } from "./vocabularies/draft7.js";
import { require_discriminator } from "./vocabularies/discriminator/index.js";
import { require_json_schema_2020_12 } from "./refs/json-schema-2020-12/index.js";
import { require_validate_2 as require_validate } from "./compile/validate/index.js";
import { require_codegen_2 as require_codegen } from "./compile/codegen/index.js";
import { require_validation_error_2 as require_validation_error } from "./runtime/validation_error.js";
import { require_ref_error_2 as require_ref_error } from "./compile/ref_error.js";

//@ chunk-1jdkttw7.js:13282-14964 cjs-fingerprint
var require_2020 = __commonJS(function (cjsExports, cjsModule) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MissingRefError =
    cjsExports.ValidationError =
    cjsExports.CodeGen =
    cjsExports.Name =
    cjsExports.nil =
    cjsExports.stringify =
    cjsExports.str =
    cjsExports._ =
    cjsExports.KeywordCxt =
    cjsExports.Ajv2020 =
      undefined;
  var core_1 = require_core_2();
  var draft2020_1 = require_draft7();
  var discriminator_1 = require_discriminator();
  var json_schema_2020_12_1 = require_json_schema_2020_12();
  var META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
  class Ajv2020 extends core_1.default {
    constructor(opts = {}) {
      super({
        ...opts,
        dynamicRef: true,
        next: true,
        unevaluated: true,
      });
    }
    _addVocabularies() {
      super._addVocabularies();
      draft2020_1.default.forEach((v) => this.addVocabulary(v));
      if (this.opts.discriminator) this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      let { $data, meta } = this.opts;
      if (!meta) return;
      json_schema_2020_12_1.default.call(this, $data);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return (this.opts.defaultMeta =
        super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : undefined));
    }
  }
  cjsExports.Ajv2020 = Ajv2020;
  cjsModule.exports = cjsExports = Ajv2020;
  cjsModule.exports.Ajv2020 = Ajv2020;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = Ajv2020;
  var validate_1 = require_validate();
  Object.defineProperty(cjsExports, "KeywordCxt", {
    enumerable: true,
    get: function () {
      return validate_1.KeywordCxt;
    },
  });
  var codegen_1 = require_codegen();
  Object.defineProperty(cjsExports, "_", {
    enumerable: true,
    get: function () {
      return codegen_1._;
    },
  });
  Object.defineProperty(cjsExports, "str", {
    enumerable: true,
    get: function () {
      return codegen_1.str;
    },
  });
  Object.defineProperty(cjsExports, "stringify", {
    enumerable: true,
    get: function () {
      return codegen_1.stringify;
    },
  });
  Object.defineProperty(cjsExports, "nil", {
    enumerable: true,
    get: function () {
      return codegen_1.nil;
    },
  });
  Object.defineProperty(cjsExports, "Name", {
    enumerable: true,
    get: function () {
      return codegen_1.Name;
    },
  });
  Object.defineProperty(cjsExports, "CodeGen", {
    enumerable: true,
    get: function () {
      return codegen_1.CodeGen;
    },
  });
  var validation_error_1 = require_validation_error();
  Object.defineProperty(cjsExports, "ValidationError", {
    enumerable: true,
    get: function () {
      return validation_error_1.default;
    },
  });
  var ref_error_1 = require_ref_error();
  Object.defineProperty(cjsExports, "MissingRefError", {
    enumerable: true,
    get: function () {
      return ref_error_1.default;
    },
  });
});
export { require_2020 };
