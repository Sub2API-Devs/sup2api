/**
 * ajv/dist/vocabularies/draft7.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1), chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 2
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_core } from "./core/index.js";
import { require_validation } from "./validation/index.js";
import {
  require_format_5,
  require_format,
  require_format_2,
  require_format_3,
  require_format_4,
} from "./format/index.js";
import { require_metadata } from "./metadata.js";

//@ chunk-1r4fv9mg.js:5489-5780 cjs-fingerprint
var require_draft7 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var validation_1 = require_core();
  var Pt = require_validation();
  var applicator_1 = require_format_5();
  var core_1 = require_format();
  var Rt = require_format_2();
  var St = require_format_3();
  var format_1 = require_format_4();
  var metadata_1 = require_metadata();
  var draft7Vocabularies = [
    core_1.default,
    validation_1.default,
    Pt.default,
    (0, applicator_1.default)(true),
    format_1.default,
    metadata_1.metadataVocabulary,
    metadata_1.contentVocabulary,
    Rt.default,
    St.default,
  ];
  cjsExports.default = draft7Vocabularies;
});
//@ chunk-s82q9s4x.js:108718-108953 cjs-fingerprint
var require_draft7_2 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var core_1 = require_core();
  var validation_1 = require_validation();
  var applicator_1 = require_format_5();
  var format_1 = require_format_4();
  var metadata_1 = require_metadata();
  var draft7Vocabularies = [
    core_1.default,
    validation_1.default,
    (0, applicator_1.default)(),
    format_1.default,
    metadata_1.metadataVocabulary,
    metadata_1.contentVocabulary,
  ];
  cjsExports.default = draft7Vocabularies;
});
export { require_draft7, require_draft7_2 };
