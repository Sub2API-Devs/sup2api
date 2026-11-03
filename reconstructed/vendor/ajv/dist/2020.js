/**
 * ajv/dist/2020.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { HQo } from "./core.js";
import { qe } from "./vocabularies/draft7.js";
import { jQo } from "./vocabularies/discriminator/index.js";
import { Ne } from "./refs/json-schema-2020-12/index.js";
import { Bvn } from "./compile/validate/index.js";
import { uh } from "./compile/codegen/index.js";
import { elr } from "./runtime/validation_error.js";
import { jvn } from "./compile/ref_error.js";

//@ chunk-1r4fv9mg.js:13281-14963 cjs-fingerprint
var Ce = x(function (v, D) {
  Object.defineProperty(v, "__esModule", { value: !0 });
  v.MissingRefError =
    v.ValidationError =
    v.CodeGen =
    v.Name =
    v.nil =
    v.stringify =
    v.str =
    v._ =
    v.KeywordCxt =
    v.Ajv2020 =
      void 0;
  var Zt = HQo(),
    Bt = qe(),
    Jt = jQo(),
    Qt = Ne(),
    V = "https://json-schema.org/draft/2020-12/schema";
  class S extends Zt.default {
    constructor(e = {}) {
      super({ ...e, dynamicRef: !0, next: !0, unevaluated: !0 });
    }
    _addVocabularies() {
      if (
        (super._addVocabularies(), Bt.default.forEach((e) => this.addVocabulary(e)), this.opts.discriminator)
      )
        this.addKeyword(Jt.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      let { $data: $data, meta: meta } = this.opts;
      if (!meta) return;
      (Qt.default.call(this, $data), (this.refs["http://json-schema.org/schema"] = V));
    }
    defaultMeta() {
      return (this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(V) ? V : void 0));
    }
  }
  v.Ajv2020 = S;
  D.exports = v = S;
  D.exports.Ajv2020 = S;
  Object.defineProperty(v, "__esModule", { value: !0 });
  v.default = S;
  var er = Bvn();
  Object.defineProperty(v, "KeywordCxt", {
    enumerable: !0,
    get: function () {
      return er.KeywordCxt;
    },
  });
  var R = uh();
  Object.defineProperty(v, "_", {
    enumerable: !0,
    get: function () {
      return R._;
    },
  });
  Object.defineProperty(v, "str", {
    enumerable: !0,
    get: function () {
      return R.str;
    },
  });
  Object.defineProperty(v, "stringify", {
    enumerable: !0,
    get: function () {
      return R.stringify;
    },
  });
  Object.defineProperty(v, "nil", {
    enumerable: !0,
    get: function () {
      return R.nil;
    },
  });
  Object.defineProperty(v, "Name", {
    enumerable: !0,
    get: function () {
      return R.Name;
    },
  });
  Object.defineProperty(v, "CodeGen", {
    enumerable: !0,
    get: function () {
      return R.CodeGen;
    },
  });
  var tr = elr();
  Object.defineProperty(v, "ValidationError", {
    enumerable: !0,
    get: function () {
      return tr.default;
    },
  });
  var rr = jvn();
  Object.defineProperty(v, "MissingRefError", {
    enumerable: !0,
    get: function () {
      return rr.default;
    },
  });
});

export { Ce };
