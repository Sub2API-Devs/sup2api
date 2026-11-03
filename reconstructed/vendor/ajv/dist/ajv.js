/**
 * ajv/dist/ajv.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { HQo } from "./core.js";
import { na } from "./vocabularies/draft7.js";
import { jQo } from "./vocabularies/discriminator/index.js";
import { da } from "./refs/json-schema-draft-07.json.js";
import { Bvn } from "./compile/validate/index.js";
import { uh } from "./compile/codegen/index.js";
import { elr } from "./runtime/validation_error.js";
import { jvn } from "./compile/ref_error.js";

//@ chunk-s82q9s4x.js:113905-115579 cjs-fingerprint
var nlr = x(function (W, Cr) {
  Object.defineProperty(W, "__esModule", { value: !0 });
  W.MissingRefError =
    W.ValidationError =
    W.CodeGen =
    W.Name =
    W.nil =
    W.stringify =
    W.str =
    W._ =
    W.KeywordCxt =
    W.Ajv =
      void 0;
  var Sh = HQo(),
    Ph = na(),
    Nh = jQo(),
    fa = da(),
    kh = ["/properties"],
    Qt = "http://json-schema.org/draft-07/schema";
  class pt extends Sh.default {
    _addVocabularies() {
      if (
        (super._addVocabularies(), Ph.default.forEach((e) => this.addVocabulary(e)), this.opts.discriminator)
      )
        this.addKeyword(Nh.default);
    }
    _addDefaultMetaSchema() {
      if ((super._addDefaultMetaSchema(), !this.opts.meta)) return;
      let e = this.opts.$data ? this.$dataMetaSchema(fa, kh) : fa;
      (this.addMetaSchema(e, Qt, !1), (this.refs["http://json-schema.org/schema"] = Qt));
    }
    defaultMeta() {
      return (this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(Qt) ? Qt : void 0));
    }
  }
  W.Ajv = pt;
  Cr.exports = W = pt;
  Cr.exports.Ajv = pt;
  Object.defineProperty(W, "__esModule", { value: !0 });
  W.default = pt;
  var qh = Bvn();
  Object.defineProperty(W, "KeywordCxt", {
    enumerable: !0,
    get: function () {
      return qh.KeywordCxt;
    },
  });
  var st = uh();
  Object.defineProperty(W, "_", {
    enumerable: !0,
    get: function () {
      return st._;
    },
  });
  Object.defineProperty(W, "str", {
    enumerable: !0,
    get: function () {
      return st.str;
    },
  });
  Object.defineProperty(W, "stringify", {
    enumerable: !0,
    get: function () {
      return st.stringify;
    },
  });
  Object.defineProperty(W, "nil", {
    enumerable: !0,
    get: function () {
      return st.nil;
    },
  });
  Object.defineProperty(W, "Name", {
    enumerable: !0,
    get: function () {
      return st.Name;
    },
  });
  Object.defineProperty(W, "CodeGen", {
    enumerable: !0,
    get: function () {
      return st.CodeGen;
    },
  });
  var Oh = elr();
  Object.defineProperty(W, "ValidationError", {
    enumerable: !0,
    get: function () {
      return Oh.default;
    },
  });
  var jh = jvn();
  Object.defineProperty(W, "MissingRefError", {
    enumerable: !0,
    get: function () {
      return jh.default;
    },
  });
});

export { nlr };
