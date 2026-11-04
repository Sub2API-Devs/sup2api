/**
 * ajv/dist/ajv.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_core_2 } from "./core.js";
import { require_draft7_2 } from "./vocabularies/draft7.js";
import { require_discriminator } from "./vocabularies/discriminator/index.js";
import { require_json_schema_draft_07 } from "./refs/json-schema-draft-07.json.js";
import { require_validate_2 } from "./compile/validate/index.js";
import { require_codegen_2 } from "./compile/codegen/index.js";
import { require_validation_error_2 } from "./runtime/validation_error.js";
import { require_ref_error_2 } from "./compile/ref_error.js";

//@ chunk-s82q9s4x.js:113905-115579 cjs-fingerprint
var require_ajv = __commonJS(function (cjsExports, cjsModule) {
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
    cjsExports.Ajv =
      undefined;
  var core_1 = require_core_2();
  var draft7_1 = require_draft7_2();
  var discriminator_1 = require_discriminator();
  var draft7MetaSchema = require_json_schema_draft_07();
  var META_SUPPORT_DATA = ["/properties"];
  var META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
  class Ajv extends core_1.default {
    _addVocabularies() {
      super._addVocabularies();
      draft7_1.default.forEach((v) => this.addVocabulary(v));
      if (this.opts.discriminator) this.addKeyword(discriminator_1.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      if (!this.opts.meta) return;
      let metaSchema = this.opts.$data
        ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA)
        : draft7MetaSchema;
      this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
      this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
    }
    defaultMeta() {
      return (this.opts.defaultMeta =
        super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : undefined));
    }
  }
  cjsExports.Ajv = Ajv;
  cjsModule.exports = cjsExports = Ajv;
  cjsModule.exports.Ajv = Ajv;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.default = Ajv;
  var validate_1 = require_validate_2();
  Object.defineProperty(cjsExports, "KeywordCxt", {
    enumerable: true,
    get: function () {
      return validate_1.KeywordCxt;
    },
  });
  var codegen_1 = require_codegen_2();
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
  var validation_error_1 = require_validation_error_2();
  Object.defineProperty(cjsExports, "ValidationError", {
    enumerable: true,
    get: function () {
      return validation_error_1.default;
    },
  });
  var ref_error_1 = require_ref_error_2();
  Object.defineProperty(cjsExports, "MissingRefError", {
    enumerable: true,
    get: function () {
      return ref_error_1.default;
    },
  });
});
export { require_ajv };
